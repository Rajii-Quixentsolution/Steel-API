import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import { ASODMapping } from "../models/ASODMapping";

const router = Router();

// ============================================
// SUPER ADMIN: Get Unmapped Dealers
// ============================================
router.get("/unmapped-dealers", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.query;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin" });
    }

    const dealers = await User.find({
      role: UserRole.DEALER,
      assignedASO: null,
      isDeleted: false
    }).select("name phoneNo status");

    res.json({ dealers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Get Unmapped ASOs
// ============================================
router.get("/unmapped-asos", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.query;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin" });
    }

    const asos = await User.find({
      role: UserRole.ASO,
      isDeleted: false
    }).select("name phoneNo mappedDealers");

    res.json({ asos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Map ASO to Dealer
// ============================================
router.post("/aso-dealer", async (req: Request, res: Response) => {
  try {
    const { adminId, asoId, dealerId } = req.body;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin" });
    }

    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) {
      return res.status(403).json({ error: "Invalid ASO" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid Dealer" });
    }

    if (dealer.assignedASO) {
      return res.status(400).json({ error: "Dealer already mapped to an ASO" });
    }

    dealer.assignedASO = new mongoose.Types.ObjectId(asoId);
    dealer.updatedAt = new Date();
    await dealer.save();

    // Also add dealer to ASO's mappedDealers array
    await User.findByIdAndUpdate(asoId, {
      $addToSet: { mappedDealers: dealer._id },
      updatedAt: new Date()
    });

    // Save to ASODMapping collection
    const mapping = await new ASODMapping({
      asoId: new mongoose.Types.ObjectId(asoId),
      asoName: aso.name,
      dealerId: new mongoose.Types.ObjectId(dealerId),
      dealerName: dealer.name,
      dealerPhoneNo: dealer.phoneNo,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(adminId)
    }).save();

    res.json({
      success: true,
      message: `Dealer ${dealer.name} mapped to ASO ${aso.name}`,
      mapping: { 
        _id: mapping._id,
        asoId: aso._id, 
        asoName: aso.name, 
        dealerId: dealer._id, 
        dealerName: dealer.name 
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Get All Mappings
// ============================================
router.get("/all", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.query;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin" });
    }

    const mappings = await User.aggregate([
      { $match: { role: UserRole.DEALER, assignedASO: { $ne: null }, isDeleted: false } },
      { $lookup: { from: "users", localField: "assignedASO", foreignField: "_id", as: "aso" } },
      { $unwind: "$aso" },
      {
        $project: {
          dealerId: "$_id", dealerName: "$name", dealerPhone: "$phoneNo",
          asoId: "$aso._id", asoName: "$aso.name", asoPhone: "$aso.phoneNo"
        }
      }
    ]);

    res.json({ mappings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Remove Mapping
// ============================================
router.delete("/aso-dealer", async (req: Request, res: Response) => {
  try {
    const { adminId, dealerId } = req.query as { adminId?: string; dealerId?: string };
    
    if (!adminId || !dealerId) {
      return res.status(400).json({ error: "adminId and dealerId required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const previousASO = dealer.assignedASO;
    dealer.assignedASO = undefined;
    dealer.updatedAt = new Date();
    await dealer.save();

    // Also remove dealer from ASO's mappedDealers array
    if (previousASO) {
      await User.findByIdAndUpdate(previousASO, {
        $pull: { mappedDealers: dealer._id },
        updatedAt: new Date()
      });
      
      // Delete from ASODMapping collection
      await ASODMapping.deleteOne({
        asoId: previousASO,
        dealerId: new mongoose.Types.ObjectId(dealerId)
      });
    }

    res.json({ success: true, message: "Mapping removed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
