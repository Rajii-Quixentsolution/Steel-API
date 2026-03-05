import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { OtpModel } from "../models/Otp";
import { OtpRateLimitModel } from "../models/OtpRateLimit";
import User, { UserRole, UserStatus } from "../models/User";
import Company from "../models/Company";
import { generateToken, verifyAuthToken, refreshAuthToken } from "../services/authService";
import { sendVerificationCode, generateOtp, createPhoneKey, OTP_EXPIRY_MS, OTP_RATE_LIMIT_MS, MAX_DAILY_OTP_REQUESTS } from "../services/sendOTP";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "steel-secret";
const jwt = require("jsonwebtoken");

const getWelcomeMessage = (role: string): string => {
  const messages: Record<string, string> = {
    SA: "Welcome, Super Admin!",
    ASO: "Welcome, Area Sales Officer!",
    DLR: "Welcome, Dealer!",
    BBR: "Welcome, Barbender!"
  };
  return messages[role] || "Welcome!";
};

router.post("/send-verification-code", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo } = req.body;
    if (!countryCode || !phoneNo) return res.status(400).json({ error: "Country code and phone number required" });
    const phoneNumber = parseInt(phoneNo);
    if (isNaN(phoneNumber)) return res.status(400).json({ error: "Invalid phone number" });
    const user = await User.findOne({ phoneNo: phoneNumber });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === UserStatus.BLOCKED) return res.status(403).json({ error: "Account blocked. Contact administrator." });
    if (user.status === UserStatus.DELETED) return res.status(403).json({ error: "Account deleted." });
    const phoneKey = createPhoneKey(countryCode, phoneNo);
    const rateLimitData = await OtpRateLimitModel.findOne({ phoneKey });
    if (rateLimitData) {
      const timeSince = Date.now() - rateLimitData.lastRequestAt.getTime();
      if (timeSince < OTP_RATE_LIMIT_MS) { const wait = Math.ceil((OTP_RATE_LIMIT_MS - timeSince) / 1000); return res.status(429).json({ error: `Wait ${wait} seconds` }); }
      if (rateLimitData.dailyRequestCount >= MAX_DAILY_OTP_REQUESTS) return res.status(429).json({ error: "Daily limit reached" });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const now = new Date();
    await OtpModel.findOneAndUpdate({ phoneKey }, { phoneKey, countryCode, phoneNo, otp, attempts: 0, expiresAt, createdAt: now }, { upsert: true });
    await OtpRateLimitModel.findOneAndUpdate({ phoneKey }, { $set: { phoneKey, countryCode, phoneNo, lastRequestAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, $inc: { dailyRequestCount: 1 }, $setOnInsert: { createdAt: now } }, { upsert: true });
    console.log(`OTP for ${phoneNo}: ${otp}`);
    res.json({ message: "OTP sent successfully", expiresIn: OTP_EXPIRY_MS / 1000, role: user.role, roleName: user.name, smsStatus: "sent" });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/verify-code", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, otp } = req.body;
    if (!countryCode || !phoneNo || !otp) return res.status(400).json({ error: "All fields required" });
    const phoneNumber = parseInt(phoneNo);
    const phoneKey = createPhoneKey(countryCode, phoneNo);
    const otpData = await OtpModel.findOne({ phoneKey });
    if (!otpData) return res.status(400).json({ error: "OTP not found or expired" });
    if (Date.now() > otpData.expiresAt.getTime()) { await OtpModel.deleteOne({ phoneKey }); return res.status(400).json({ error: "OTP expired" }); }
    if (otpData.otp !== otp.trim()) { otpData.attempts += 1; await otpData.save(); return res.status(400).json({ error: "Invalid OTP" }); }
    await OtpModel.deleteOne({ phoneKey });
    const user = await User.findOne({ phoneNo: phoneNumber });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === UserStatus.BLOCKED) return res.status(403).json({ error: "Account blocked. Contact administrator." });
    if (user.status === UserStatus.DELETED) return res.status(403).json({ error: "Account deleted." });
    if (user.status === UserStatus.PENDING) user.status = UserStatus.ACTIVE;
    user.lastOTPValidated = new Date();
    await user.save();

    // Fetch company name for dashboard display
    let companyName: string | null = null;
    if (user.companyId) {
      const company = await Company.findById(user.companyId).select("name");
      companyName = company?.name || null;
    }

    const tokenData = generateToken(user);
    res.json({
      success: true, message: "Login successful", token: tokenData.token, expiresAt: tokenData.expiresAt,
      user: {
        _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role,
        status: user.status, profilePhoto: user.profilePhoto, totalQuantityAvailable: user.totalQuantityAvailable,
        totalRewardEligible: user.totalRewardEligible, companyId: user.companyId,
        companyIds: user.companyIds || [], isCompanyAdmin: user.isCompanyAdmin || false,
        companyName: companyName,
      },
      welcomeMessage: getWelcomeMessage(user.role)
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/register-barbender", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, companyIds } = req.body;
    if (!countryCode || !phoneNo || !name) return res.status(400).json({ error: "Country code, phone number, and name are required" });
    const phoneNumber = parseInt(phoneNo);
    if (isNaN(phoneNumber)) return res.status(400).json({ error: "Invalid phone number" });
    const existing = await User.findOne({ phoneNo: phoneNumber });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });
    let validatedCompanyIds: mongoose.Types.ObjectId[] = [];
    if (companyIds && Array.isArray(companyIds) && companyIds.length > 0) {
      const companies = await Company.find({ _id: { $in: companyIds }, status: "active" });
      if (companies.length !== companyIds.length) return res.status(400).json({ error: "One or more companies are invalid or inactive" });
      validatedCompanyIds = companies.map(c => c._id);
    }
    const now = new Date();
    const user = await new User({ countryCode: countryCode || "91", phoneNo: phoneNumber, name, email, role: UserRole.BARBENDER, status: UserStatus.PENDING, totalQuantityAvailable: 0, totalRewardEligible: 0, isDeleted: false, companyIds: validatedCompanyIds, createdAt: now, updatedAt: now }).save();
    res.json({ success: true, message: "Registration successful! Please verify your phone number with OTP.", user: { id: user._id, name: user.name, phoneNo: user.phoneNo, role: user.role, status: user.status, companyIds: user.companyIds } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/register-dealer", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, companyIds } = req.body;
    if (!countryCode || !phoneNo || !name) return res.status(400).json({ error: "Country code, phone number, and name are required" });
    const phoneNumber = parseInt(phoneNo);
    if (isNaN(phoneNumber)) return res.status(400).json({ error: "Invalid phone number" });
    const existing = await User.findOne({ phoneNo: phoneNumber });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });
    let validatedCompanyIds: mongoose.Types.ObjectId[] = [];
    if (companyIds && Array.isArray(companyIds) && companyIds.length > 0) {
      const companies = await Company.find({ _id: { $in: companyIds }, status: "active" });
      if (companies.length !== companyIds.length) return res.status(400).json({ error: "One or more companies are invalid or inactive" });
      validatedCompanyIds = companies.map(c => c._id);
    }
    const now = new Date();
    const user = await new User({ countryCode: countryCode || "91", phoneNo: phoneNumber, name, email, role: UserRole.DEALER, status: UserStatus.PENDING, totalQuantityAvailable: 0, totalRewardEligible: 0, isDeleted: false, companyIds: validatedCompanyIds, createdAt: now, updatedAt: now }).save();
    res.json({ success: true, message: "Registration successful! Please verify your phone number with OTP.", user: { id: user._id, name: user.name, phoneNo: user.phoneNo, role: user.role, status: user.status, companyIds: user.companyIds } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/company-admin-login", async (req: Request, res: Response) => {
  try {
    const { companyAdminPhone } = req.body;
    if (!companyAdminPhone) return res.status(400).json({ error: "Company admin phone number required" });
    const company = await Company.findOne({ companyAdminPhone: companyAdminPhone.trim(), status: "active" });
    if (!company) return res.status(404).json({ error: "Company not found or inactive" });
    let user = await User.findOne({ phoneNo: parseInt(companyAdminPhone), isCompanyAdmin: true });
    if (!user) {
      const now = new Date();
      user = await new User({ name: `Admin - ${company.name}`, countryCode: "91", phoneNo: parseInt(companyAdminPhone), email: company.email, role: UserRole.COMPANY_ADMIN, status: UserStatus.ACTIVE, isCompanyAdmin: true, companyId: company._id, totalQuantityAvailable: 0, totalRewardEligible: 0, isDeleted: false, createdAt: now, updatedAt: now }).save();
    }
    const phoneNumber = parseInt(companyAdminPhone);
    const phoneKey = createPhoneKey("91", companyAdminPhone);
    const rateLimitData = await OtpRateLimitModel.findOne({ phoneKey });
    if (rateLimitData) {
      const timeSince = Date.now() - rateLimitData.lastRequestAt.getTime();
      if (timeSince < OTP_RATE_LIMIT_MS) { const wait = Math.ceil((OTP_RATE_LIMIT_MS - timeSince) / 1000); return res.status(429).json({ error: `Wait ${wait} seconds` }); }
      if (rateLimitData.dailyRequestCount >= MAX_DAILY_OTP_REQUESTS) return res.status(429).json({ error: "Daily limit reached" });
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const now = new Date();
    await OtpModel.findOneAndUpdate({ phoneKey }, { phoneKey, countryCode: "91", phoneNo: phoneNumber, otp, attempts: 0, expiresAt, createdAt: now }, { upsert: true });
    await OtpRateLimitModel.findOneAndUpdate({ phoneKey }, { $set: { phoneKey, countryCode: "91", phoneNo: phoneNumber, lastRequestAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, $inc: { dailyRequestCount: 1 }, $setOnInsert: { createdAt: now } }, { upsert: true });
    console.log(`OTP for company admin ${companyAdminPhone}: ${otp}`);
    res.json({ success: true, message: "OTP sent to company admin phone", expiresIn: OTP_EXPIRY_MS / 1000, companyAdminPhone, companyName: company.name, role: "Company Admin", roleName: `Admin - ${company.name}`, smsStatus: "sent" });
  } catch (error: any) { console.error("Company admin login error:", error); res.status(500).json({ error: error.message }); }
});

router.post("/company-admin-verify-otp", async (req: Request, res: Response) => {
  try {
    const { companyAdminPhone, otp } = req.body;
    if (!companyAdminPhone || !otp) return res.status(400).json({ error: "Company admin phone and OTP required" });
    const company = await Company.findOne({ companyAdminPhone: companyAdminPhone.trim(), status: "active" });
    if (!company) return res.status(404).json({ error: "Company not found or inactive" });
    const phoneNumber = parseInt(companyAdminPhone);
    const phoneKey = createPhoneKey("91", companyAdminPhone);
    const otpData = await OtpModel.findOne({ phoneKey });
    if (!otpData) return res.status(400).json({ error: "OTP not found or expired" });
    if (Date.now() > otpData.expiresAt.getTime()) { await OtpModel.deleteOne({ phoneKey }); return res.status(400).json({ error: "OTP expired" }); }
    if (otpData.otp !== otp.trim()) { otpData.attempts += 1; await otpData.save(); return res.status(400).json({ error: "Invalid OTP" }); }
    await OtpModel.deleteOne({ phoneKey });
    let user = await User.findOne({ phoneNo: phoneNumber, isCompanyAdmin: true });
    if (!user) {
      const now = new Date();
      user = await new User({ name: `Admin - ${company.name}`, countryCode: "91", phoneNo: phoneNumber, email: company.email, role: UserRole.COMPANY_ADMIN, status: UserStatus.ACTIVE, isCompanyAdmin: true, companyId: company._id, totalQuantityAvailable: 0, totalRewardEligible: 0, isDeleted: false, createdAt: now, updatedAt: now }).save();
    } else {
      if (!user.companyId) user.companyId = company._id;
      if (user.status === UserStatus.PENDING) user.status = UserStatus.ACTIVE;
      user.updatedAt = new Date();
      await user.save();
    }
    const tokenData = generateToken(user);
    res.json({
      success: true, message: "Company admin login successful", token: tokenData.token, expiresAt: tokenData.expiresAt,
      user: { _id: user._id.toString(), name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, isCompanyAdmin: true, companyId: company._id.toString(), companyIds: [], companyName: company.name },
      company: { _id: company._id, name: company.name, email: company.email, gstNumber: company.gstNumber, logo: company.logo },
      welcomeMessage: `Welcome, ${company.name} Admin!`, autoNavigate: true
    });
  } catch (error: any) { console.error("Company admin OTP verification error:", error); res.status(500).json({ error: error.message }); }
});

router.post("/create-user", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, role, createdById } = req.body;
    const validRoles = ["ASO", "DLR", "BBR"];
    if (!role || !validRoles.includes(role)) return res.status(400).json({ error: "Invalid role. Must be ASO, DLR, or BBR" });
    if (!createdById) return res.status(401).json({ error: "Authentication required" });
    const admin = await User.findById(createdById);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (admin.role !== "SA") return res.status(403).json({ error: "Only Super Admin can create users" });
    const existing = await User.findOne({ phoneNo: parseInt(phoneNo) });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });
    const now = new Date();
    const user = await new User({ countryCode: countryCode || "91", phoneNo: parseInt(phoneNo), name, email, role, status: UserStatus.PENDING, totalQuantityAvailable: 0, totalRewardEligible: 0, createdBy: new mongoose.Types.ObjectId(createdById), createdAt: now, updatedAt: now, isDeleted: false }).save();
    res.json({ success: true, message: `${role} created. User must verify via OTP.`, user: { id: user._id, name: user.name, phoneNo: user.phoneNo, role: user.role, status: user.status } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get("/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.replace("Bearer ", "");
    const result = await verifyAuthToken(token);
    if (!result.success) return res.status(401).json({ error: result.message });
    const user = result.user;
    res.json({ user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, countryCode: user.countryCode, role: user.role, status: user.status, profilePhoto: user.profilePhoto, totalQuantityAvailable: user.totalQuantityAvailable, totalRewardEligible: user.totalRewardEligible, createdAt: user.createdAt, welcomeMessage: getWelcomeMessage(user.role) } });
  } catch (error: any) { res.status(401).json({ error: "Invalid token" }); }
});

router.put("/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.replace("Bearer ", "");
    const result = await verifyAuthToken(token);
    if (!result.success) return res.status(401).json({ error: result.message });
    const user = result.user;
    const { name, email, profilePhoto, companyIds } = req.body;
    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if ((user.role === UserRole.BARBENDER || user.role === UserRole.DEALER) && companyIds && Array.isArray(companyIds)) {
      const companies = await Company.find({ _id: { $in: companyIds }, status: "active" });
      if (companies.length !== companyIds.length) return res.status(400).json({ error: "One or more companies are invalid or inactive" });
      user.companyIds = companyIds;
    }
    user.updatedAt = new Date();
    await user.save();
    res.json({ success: true, message: "Profile updated", user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, profilePhoto: user.profilePhoto, totalQuantityAvailable: user.totalQuantityAvailable, totalRewardEligible: user.totalRewardEligible, companyIds: user.companyIds, companyId: user.companyId } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post("/select-company", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.replace("Bearer ", "");
    const result = await verifyAuthToken(token);
    if (!result.success) return res.status(401).json({ error: result.message });
    const user = result.user;
    const { companyId, companyIds: companyIdsRaw } = req.body;
    let requestedIds: string[] = [];
    if (Array.isArray(companyIdsRaw) && companyIdsRaw.length > 0) requestedIds = companyIdsRaw;
    else if (companyId) requestedIds = [companyId];
    if (requestedIds.length === 0) return res.status(400).json({ error: "Company ID(s) required" });
    if (requestedIds.some(id => !mongoose.Types.ObjectId.isValid(id))) return res.status(400).json({ error: "One or more invalid company IDs" });
    const companies = await Company.find({ _id: { $in: requestedIds }, status: "active" });
    if (companies.length !== requestedIds.length) return res.status(404).json({ error: "One or more companies not found or inactive" });
    if (user.isCompanyAdmin === true) {
      const allowed = companies.every(c => c.companyAdminPhone === user.phoneNo.toString());
      if (!allowed) return res.status(403).json({ error: "You don't have access to one or more companies" });
    }
    if (user.role === UserRole.ASO) {
      user.companyId = new mongoose.Types.ObjectId(requestedIds[0]);
      user.companyIds = [];
    } else if (user.role === UserRole.BARBENDER || user.role === UserRole.DEALER) {
      const uniqueObjectIds = [...new Map(requestedIds.map(id => [id.toString(), new mongoose.Types.ObjectId(id)])).values()];
      user.companyIds = uniqueObjectIds;
      user.companyId = uniqueObjectIds[0];
    } else {
      user.companyId = new mongoose.Types.ObjectId(requestedIds[0]);
    }
    user.updatedAt = new Date();
    await user.save();
    const tokenData = generateToken(user);
    const primaryCompany = companies.find(c => c._id.equals(user.companyId!)) || companies[0];
    res.json({ success: true, message: "Company selected successfully", token: tokenData.token, expiresAt: tokenData.expiresAt, user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, isCompanyAdmin: user.isCompanyAdmin || false, companyId: user.companyId, companyIds: user.companyIds, companyName: primaryCompany.name }, company: { _id: primaryCompany._id, name: primaryCompany.name, email: primaryCompany.email, gstNumber: primaryCompany.gstNumber, logo: primaryCompany.logo }, welcomeMessage: companies.length > 1 ? `Linked to ${companies.length} companies!` : `Welcome to ${primaryCompany.name}!` });
  } catch (error: any) { console.error("Company selection error:", error); res.status(500).json({ error: error.message }); }
});

router.post("/set-active-company", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const result = await verifyAuthToken(authHeader.replace("Bearer ", ""));
    if (!result.success) return res.status(401).json({ error: result.message });
    const user = result.user;
    const { companyId } = req.body;
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) return res.status(400).json({ error: "Valid company ID required" });
    if (user.role === UserRole.BARBENDER || user.role === UserRole.DEALER) {
      const registered = (user.companyIds ?? []).map((id: any) => id.toString());
      if (!registered.includes(companyId.toString())) return res.status(403).json({ error: "Company not in your registered list" });
    }
    const company = await Company.findOne({ _id: companyId, status: "active" });
    if (!company) return res.status(404).json({ error: "Company not found or inactive" });
    user.companyId = new mongoose.Types.ObjectId(companyId);
    user.updatedAt = new Date();
    await user.save();
    const tokenData = generateToken(user);
    res.json({ success: true, message: "Active company updated", token: tokenData.token, expiresAt: tokenData.expiresAt, user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, companyId: user.companyId, companyIds: user.companyIds, companyName: company.name }, company: { _id: company._id, name: company.name, email: company.email, gstNumber: company.gstNumber, logo: company.logo } });
  } catch (error: any) { console.error("set-active-company error:", error); res.status(500).json({ error: error.message }); }
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const { role, adminId, companyId } = req.query;
    if (!adminId || typeof adminId !== "string") return res.status(400).json({ error: "Admin ID is required" });
    const admin = await User.findById(adminId);
    if (!admin) return res.status(403).json({ error: "Admin not found" });
    if (admin.role === UserRole.SUPER_ADMIN) {
      // ok
    } else if (admin.role === UserRole.COMPANY_ADMIN) {
      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId as string)) return res.status(400).json({ error: "Company ID required for company admin" });
    } else {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    const query: any = { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };
    if (role) query.role = role;
    if (admin.role === UserRole.COMPANY_ADMIN && companyId) {
      const cid = new mongoose.Types.ObjectId(companyId as string);
      delete query.$or;
      const users = await User.find({ $and: [{ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }, { $or: [{ role: { $in: [UserRole.ASO, UserRole.DEALER] }, companyId: cid }, { role: UserRole.SUPER_ADMIN, companyId: cid }] }] }).select("-createdBy -createdAt -updatedAt");
      return res.json({ users });
    }
    const users = await User.find(query).select("-createdBy -createdAt -updatedAt");
    res.json({ users });
  } catch (error: any) { console.error("Error in /users:", error); res.status(500).json({ error: error.message }); }
});

router.put("/users/:id/status", async (req: Request, res: Response) => {
  try {
    const { status, adminId } = req.body;
    const { id } = req.params;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) return res.status(403).json({ error: "Only Super Admin" });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (status === "blocked") user.status = UserStatus.BLOCKED;
    else if (status === "deleted") { user.status = UserStatus.DELETED; user.isDeleted = true; }
    user.updatedAt = new Date();
    await user.save();
    res.json({ success: true, message: `User ${status}` });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;