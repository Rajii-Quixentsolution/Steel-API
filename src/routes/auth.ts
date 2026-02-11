import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { OtpModel } from "../models/Otp";
import { OtpRateLimitModel } from "../models/OtpRateLimit";
import User, { UserRole, UserStatus } from "../models/User";
import { generateToken } from "../services/authService";
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

// ============================================
// SEND OTP
// ============================================
router.post("/send-verification-code", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo } = req.body;
    if (!countryCode || !phoneNo) {
      return res.status(400).json({ error: "Country code and phone number required" });
    }
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
      if (timeSince < OTP_RATE_LIMIT_MS) {
        const wait = Math.ceil((OTP_RATE_LIMIT_MS - timeSince) / 1000);
        return res.status(429).json({ error: `Wait ${wait} seconds` });
      }
      if (rateLimitData.dailyRequestCount >= MAX_DAILY_OTP_REQUESTS) {
        return res.status(429).json({ error: "Daily limit reached" });
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const now = new Date();

    await OtpModel.findOneAndUpdate({ phoneKey }, { phoneKey, countryCode, phoneNo, otp, attempts: 0, expiresAt, createdAt: now }, { upsert: true });
    await OtpRateLimitModel.findOneAndUpdate({ phoneKey }, { $set: { phoneKey, countryCode, phoneNo, lastRequestAt: now, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, $inc: { dailyRequestCount: 1 }, $setOnInsert: { createdAt: now } }, { upsert: true });

    console.log(`OTP for ${phoneNo}: ${otp}`);
    res.json({ message: "OTP sent successfully", expiresIn: OTP_EXPIRY_MS / 1000, role: user.role, roleName: user.name, smsStatus: "sent" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VERIFY OTP AND LOGIN
// ============================================
router.post("/verify-code", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, otp } = req.body;
    if (!countryCode || !phoneNo || !otp) return res.status(400).json({ error: "All fields required" });

    const phoneNumber = parseInt(phoneNo);
    const phoneKey = createPhoneKey(countryCode, phoneNo);
    const otpData = await OtpModel.findOne({ phoneKey });
    if (!otpData) return res.status(400).json({ error: "OTP not found or expired" });

    if (Date.now() > otpData.expiresAt.getTime()) {
      await OtpModel.deleteOne({ phoneKey });
      return res.status(400).json({ error: "OTP expired" });
    }

    if (otpData.otp !== otp.trim()) {
      otpData.attempts += 1;
      await otpData.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await OtpModel.deleteOne({ phoneKey });
    const user = await User.findOne({ phoneNo: phoneNumber });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.status === UserStatus.BLOCKED) return res.status(403).json({ error: "Account blocked. Contact administrator." });
    if (user.status === UserStatus.DELETED) return res.status(403).json({ error: "Account deleted." });

    if (user.status === UserStatus.PENDING) user.status = UserStatus.ACTIVE;
    user.lastOTPValidated = new Date();
    await user.save();

    const tokenData = generateToken(user);
    res.json({
      success: true, message: "Login successful", token: tokenData.token, expiresAt: tokenData.expiresAt,
      user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, profilePhoto: user.profilePhoto, totalQuantityAvailable: user.totalQuantityAvailable, totalRewardEligible: user.totalRewardEligible },
      welcomeMessage: getWelcomeMessage(user.role)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Create ASO or Dealer
// ============================================
router.post("/create-user", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, role, createdById } = req.body;
    
    // Validate role
    const validRoles = ["ASO", "DLR", "BBR"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be ASO or DLR" });
    }

    // Validate admin
    if (!createdById) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const admin = await User.findById(createdById);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (admin.role !== "SA") return res.status(403).json({ error: "Only Super Admin can create users" });

    const existing = await User.findOne({ phoneNo: parseInt(phoneNo) });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });

    const now = new Date();
    const user = await new User({
      countryCode: countryCode || "91", phoneNo: parseInt(phoneNo), name, email, role,
      status: UserStatus.PENDING, totalQuantityAvailable: 0, totalRewardEligible: 0,
      createdBy: new mongoose.Types.ObjectId(createdById), createdAt: now, updatedAt: now, isDeleted: false
    }).save();

    res.json({ success: true, message: `${role} created. User must verify via OTP.`, user: { id: user._id, name: user.name, phoneNo: user.phoneNo, role: user.role, status: user.status } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Create Barbender
// ============================================
router.post("/dealer/create-barbender", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, dealerId } = req.body;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER || dealer.status !== UserStatus.ACTIVE) return res.status(403).json({ error: "Invalid or inactive dealer" });
    if (dealer.isDeleted) return res.status(403).json({ error: "Dealer account deleted" });

    const existing = await User.findOne({ phoneNo: parseInt(phoneNo) });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });

    const now = new Date();
    const barbender = await new User({
      countryCode: countryCode || "91", phoneNo: parseInt(phoneNo), name, email, role: UserRole.BARBENDER,
      status: UserStatus.PENDING, createdByDealer: new mongoose.Types.ObjectId(dealerId),
      totalQuantityAvailable: 0, totalRewardEligible: 0, createdBy: new mongoose.Types.ObjectId(dealerId),
      createdAt: now, updatedAt: now, isDeleted: false
    }).save();

    res.json({ success: true, message: "Barbender created. User must verify via OTP.", user: { id: barbender._id, name: barbender.name, phoneNo: barbender.phoneNo, role: barbender.role, status: barbender.status } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET USER PROFILE
// ============================================
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user || user.isDeleted) return res.status(404).json({ error: "User not found" });
    res.json({ 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        phoneNo: user.phoneNo, 
        countryCode: user.countryCode, 
        role: user.role, 
        status: user.status, 
        profilePhoto: user.profilePhoto, 
        totalQuantityAvailable: user.totalQuantityAvailable, 
        totalRewardEligible: user.totalRewardEligible, 
        createdAt: user.createdAt,
        welcomeMessage: getWelcomeMessage(user.role)
      }
    });
  } catch (error: any) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ============================================
// UPDATE PROFILE (Name, Email, Photo)
// ============================================
router.put("/profile", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user || user.isDeleted) return res.status(404).json({ error: "User not found" });

    const { name, email, profilePhoto } = req.body;
    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: "Profile updated", user: { _id: user._id, name: user.name, email: user.email, phoneNo: user.phoneNo, role: user.role, status: user.status, profilePhoto: user.profilePhoto, totalQuantityAvailable: user.totalQuantityAvailable, totalRewardEligible: user.totalRewardEligible } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: List Users
// ============================================
router.get("/users", async (req: Request, res: Response) => {
  try {
    const { role, adminId } = req.query;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) return res.status(403).json({ error: "Only Super Admin" });
    const query: any = { isDeleted: false };
    if (role) query.role = role;
    const users = await User.find(query).select("-createdBy -createdAt -updatedAt");
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Block/Delete User
// ============================================
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: List Barbenders
// ============================================
router.get("/dealer/barbenders", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });
    const barbenders = await User.find({ role: UserRole.BARBENDER, createdByDealer: dealer._id, isDeleted: false }).select("name phoneNo status totalQuantityAvailable totalRewardEligible");
    res.json({ barbenders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Block/Delete Barbender
// ============================================
router.put("/dealer/barbender/:id/status", async (req: Request, res: Response) => {
  try {
    const { dealerId, status } = req.body;
    const { id } = req.params;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });
    const barbender = await User.findById(id);
    if (!barbender || barbender.role !== UserRole.BARBENDER) return res.status(404).json({ error: "Barbender not found" });
    if (barbender.createdByDealer?.toString() !== dealerId) return res.status(403).json({ error: "Not your barbender" });
    if (status === "blocked") barbender.status = UserStatus.BLOCKED;
    else if (status === "deleted") { barbender.status = UserStatus.DELETED; barbender.isDeleted = true; }
    barbender.updatedAt = new Date();
    await barbender.save();
    res.json({ success: true, message: `Barbender ${status}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
