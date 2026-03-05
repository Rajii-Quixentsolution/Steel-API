import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import Company, { CompanyStatus } from "../models/Company";
import User, { UserRole, UserStatus } from "../models/User";
import { verifyAuthToken } from "../services/authService";
import { uploadCompanyLogo } from "../services/s3Service";

const router = Router();

// ============================================
// CREATE COMPANY (SA only)
// ============================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const tokenResult = await verifyAuthToken(authHeader.replace("Bearer ", ""));
    if (!tokenResult.success) {
      return res.status(401).json({ error: tokenResult.message });
    }
    
    const admin = tokenResult.user;
    if (admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can create companies" });
    }

    const { name, email, gstNumber, companyAdminPhone } = req.body;
    
    // Validate required fields
    if (!name || !email || !gstNumber || !companyAdminPhone) {
      return res.status(400).json({ error: "Name, email, GST number, and company admin phone are required" });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ 
      $or: [
        { name: name.trim() },
        { email: email.trim().toLowerCase() },
        { gstNumber: gstNumber.trim().toUpperCase() },
        { companyAdminPhone: companyAdminPhone.trim() }
      ]
    });
    
    if (existingCompany) {
      return res.status(400).json({ error: "Company with this name, email, GST number, or admin phone already exists" });
    }

    // Create new company
    const company = await new Company({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      gstNumber: gstNumber.trim().toUpperCase(),
      companyAdminPhone: companyAdminPhone.trim(),
      status: CompanyStatus.ACTIVE,
      createdBy: admin._id
    }).save();

    res.json({ 
      success: true, 
      message: "Company created successfully", 
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        gstNumber: company.gstNumber,
        companyAdminPhone: company.companyAdminPhone,
        status: company.status,
        createdAt: company.createdAt
      }
    });
  } catch (error: any) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET ALL COMPANIES
// ============================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const companies = await Company.find({ status: CompanyStatus.ACTIVE })
      .select("-createdBy -createdAt -updatedAt")
      .sort({ name: 1 });
    
    res.json({ companies });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET COMPANY BY ID
// ============================================
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }
    
    const company = await Company.findById(id)
      .select("-createdBy -createdAt -updatedAt");
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    res.json({ company });
  } catch (error: any) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UPDATE COMPANY
// ============================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const tokenResult = await verifyAuthToken(authHeader.replace("Bearer ", ""));
    if (!tokenResult.success) {
      return res.status(401).json({ error: tokenResult.message });
    }
    
    const admin = tokenResult.user;
    if (admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can update companies" });
    }

    const { id } = req.params;
    const { name, email, gstNumber, companyAdminPhone, status } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }
    
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Check for duplicates (excluding current company)
    const existingCompany = await Company.findOne({ 
      _id: { $ne: id },
      $or: [
        { name: name?.trim() },
        { email: email?.trim().toLowerCase() },
        { gstNumber: gstNumber?.trim().toUpperCase() },
        { companyAdminPhone: companyAdminPhone?.trim() }
      ]
    });
    
    if (existingCompany) {
      return res.status(400).json({ error: "Company with this name, email, GST number, or admin phone already exists" });
    }

    // Update company fields
    if (name) company.name = name.trim();
    if (email) company.email = email.trim().toLowerCase();
    if (gstNumber) company.gstNumber = gstNumber.trim().toUpperCase();
    if (companyAdminPhone) company.companyAdminPhone = companyAdminPhone.trim();
    if (status && Object.values(CompanyStatus).includes(status)) {
      company.status = status;
    }
    
    company.updatedAt = new Date();
    await company.save();

    res.json({ 
      success: true, 
      message: "Company updated successfully", 
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        gstNumber: company.gstNumber,
        companyAdminPhone: company.companyAdminPhone,
        status: company.status,
        logo: company.logo,
        updatedAt: company.updatedAt
      }
    });
  } catch (error: any) {
    console.error("Error updating company:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE COMPANY (Soft delete - mark as inactive)
// ============================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const tokenResult = await verifyAuthToken(authHeader.replace("Bearer ", ""));
    if (!tokenResult.success) {
      return res.status(401).json({ error: tokenResult.message });
    }
    
    const admin = tokenResult.user;
    if (admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can delete companies" });
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }
    
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    company.status = CompanyStatus.INACTIVE;
    company.updatedAt = new Date();
    await company.save();

    res.json({ success: true, message: "Company marked as inactive" });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// GET COMPANIES FOR USER (BBR/Dealer)
// ============================================
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let companies = [];
    
    if (user.role === UserRole.ASO) {
      // ASO can see all active companies initially, then gets assigned to selected one
      companies = await Company.find({ status: CompanyStatus.ACTIVE })
        .select("-createdBy -createdAt -updatedAt")
        .sort({ name: 1 });
    } else if (user.role === UserRole.BARBENDER || user.role === UserRole.DEALER) {
      // BBR/Dealer can see all active companies initially, then gets assigned to selected one
      companies = await Company.find({ status: CompanyStatus.ACTIVE })
        .select("-createdBy -createdAt -updatedAt")
        .sort({ name: 1 });
    } else {
      // Other users (SA, Company Admin) can see all active companies
      companies = await Company.find({ status: CompanyStatus.ACTIVE })
        .select("-createdBy -createdAt -updatedAt")
        .sort({ name: 1 });
    }
    
    res.json({ companies });
  } catch (error: any) {
    console.error("Error fetching user companies:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;