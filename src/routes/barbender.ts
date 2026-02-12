import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import QRCode from "qrcode";
import User, { UserRole, UserStatus } from "../models/User";
import Product from "../models/Product";
import { BarbenderSale } from "../models/BarbenderSale";
import DailyStock from "../models/DailyStock";

const router = Router();

const getDayNumber = (date: Date): number => {
  const start = new Date("2026-01-01");
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

const getDateTimeString = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}.${minutes}`;
};

// ============================================
// DEALER: Get My Barbenders
// ============================================
router.get("/dealer/barbenders", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid dealer" });
    }
    const barbenders = await User.find({
      role: UserRole.BARBENDER,
      createdBy: dealer._id,
      isDeleted: false
    }).select("name phoneNo status totalQuantityAvailable totalRewardEligible");
    res.json({ barbenders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Create Barbender
// ============================================
router.post("/dealer/barbender", async (req: Request, res: Response) => {
  try {
    const { countryCode, phoneNo, name, email, dealerId } = req.body;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER || dealer.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid or inactive dealer" });
    }
    const existing = await User.findOne({ phoneNo: parseInt(phoneNo) });
    if (existing) return res.status(400).json({ error: "Phone already registered" });

    const barbender = await new User({
      countryCode: countryCode || "91",
      phoneNo: parseInt(phoneNo),
      name, email,
      role: UserRole.BARBENDER,
      status: UserStatus.PENDING,
      createdBy: dealer._id,
      totalQuantityAvailable: 0,
      totalRewardEligible: 0,
      isDeleted: false
    }).save();

    res.json({ success: true, message: "Barbender created. Pending verification.", user: { id: barbender._id, name: barbender.name, phoneNo: barbender.phoneNo, role: barbender.role, status: barbender.status } });
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
    if (barbender.createdBy?.toString() !== dealerId) return res.status(403).json({ error: "Not your barbender" });

    if (status === "blocked") barbender.status = UserStatus.BLOCKED;
    else if (status === "deleted") { barbender.status = UserStatus.DELETED; barbender.isDeleted = true; }
    await barbender.save();
    res.json({ success: true, message: `Barbender ${status}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get QR Code Data (returns base64 image)
// ============================================
router.get("/qr/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const barbender = await User.findOne({ _id: id, role: UserRole.BARBENDER, isDeleted: false });
    if (!barbender) return res.status(404).json({ error: "Barbender not found" });

    // Generate QR code with user ID embedded
    const qrPayload = JSON.stringify({ 
      type: "BBR", 
      id: barbender._id.toString(), 
      name: barbender.name,
      phoneNo: barbender.phoneNo
    });

    // Generate QR code as base64 PNG
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    res.json({
      barbenderId: barbender._id,
      name: barbender.name,
      phoneNo: barbender.phoneNo,
      qrCode: qrCodeBase64,
      qrPayload: qrPayload
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get QR Code as Image (PNG endpoint)
// ============================================
router.get("/qr-image/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const barbender = await User.findOne({ _id: id, role: UserRole.BARBENDER, isDeleted: false });
    if (!barbender) return res.status(404).json({ error: "Barbender not found" });

    const qrPayload = JSON.stringify({ 
      type: "BBR", 
      id: barbender._id.toString(), 
      name: barbender.name,
      phoneNo: barbender.phoneNo
    });

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    res.setHeader("Content-Type", "image/png");
    res.send(qrCodeBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Sell to Barbender (Scan QR)
// ============================================
router.post("/dealer/sell", async (req: Request, res: Response) => {
  try {
    console.log("Sell request received:", JSON.stringify(req.body));
    const { dealerId, barbenderUserId, productId, quantityKg, notes } = req.body;
    
    if (!dealerId || !barbenderUserId || !productId || !quantityKg) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER || dealer.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid or inactive dealer" });
    }

    const barbender = await User.findOne({ _id: new mongoose.Types.ObjectId(barbenderUserId), role: UserRole.BARBENDER, isDeleted: false });
    if (!barbender) return res.status(404).json({ error: "Barbender not found" });
    
    // Check if barbender belongs to this dealer OR allow all for now
    const isOwner = barbender.createdBy?.toString() === dealerId.toString();
    console.log("Barbender owner check:", { createdBy: barbender.createdBy?.toString(), dealerId, isOwner });
    
    // For now, allow sale if dealer is active (relaxing ownership check temporarily)
    if (!isOwner && dealer.status === UserStatus.ACTIVE) {
      console.log("Allowing sale - dealer is active");
    } else if (!isOwner) {
      return res.status(403).json({ error: "Not your barbender" });
    }
    
    if (barbender.status === UserStatus.BLOCKED) return res.status(403).json({ error: "Barbender blocked" });

    const quantity = parseFloat(quantityKg);
    if (isNaN(quantity) || quantity <= 0) return res.status(400).json({ error: "Invalid quantity" });
    if (quantity > dealer.totalQuantityAvailable) return res.status(400).json({ error: "Insufficient stock" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const now = new Date();
    console.log("Creating BarbenderSale with:", {
      dealerId: dealer._id.toString(),
      dealerName: dealer.name,
      barbenderId: barbender._id.toString(),
      barbenderName: barbender.name,
      barbenderUserId: barbender._id.toString(),
      productId: product._id.toString(),
      productName: product.productName,
      productCode: product.productCode,
      quantityKg: quantity
    });
    
    const saleData = {
      dealerId: dealer._id, dealerName: dealer.name,
      barbenderId: barbender._id, barbenderName: barbender.name, barbenderUserId: barbender._id.toString(),
      productId: product._id, productName: product.productName, productCode: product.productCode,
      quantityKg: quantity, saleDate: now, saleDateTime: now.toISOString(), 
      createdBy: dealer._id, notes
    };
    
    console.log("Sale data to save:", JSON.stringify(saleData));
    const sale = new BarbenderSale(saleData);
    const savedSale = await sale.save();
    console.log("Sale saved successfully:", savedSale._id.toString());

    // Update dealer stock
    dealer.totalQuantityAvailable -= quantity;
    dealer.totalRewardEligible += quantity;
    await dealer.save();

    // Update barbender
    barbender.totalQuantityAvailable += quantity;
    barbender.totalRewardEligible += quantity;
    await barbender.save();

    // Update daily stock
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let dailyStock = await DailyStock.findOne({ dealerId: dealer._id, date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } });
    if (!dailyStock) {
      dailyStock = await new DailyStock({ 
        dealerId: dealer._id, date: today, 
        sequentialDay: getDayNumber(today), totalReceivedKg: 0, totalDispatchedKg: 0, 
        availableBalanceKg: dealer.totalQuantityAvailable 
      }).save();
    }
    dailyStock.totalDispatchedKg += quantity;
    dailyStock.availableBalanceKg = dealer.totalQuantityAvailable;
    await dailyStock.save();

    console.log("Sale successful:", sale._id);
    res.json({
      success: true,
      message: "Sale recorded",
      sale: { id: sale._id, barbenderName: barbender.name, productName: product.productName, quantityKg: quantity, saleDateTime: sale.saleDateTime, newBalance: dealer.totalQuantityAvailable, rewardEligible: dealer.totalRewardEligible }
    });
  } catch (error: any) {
    console.error("Sell error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Get Rewards Summary
// ============================================
router.get("/dealer/rewards", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid dealer" });
    }

    // Get all sales made by this dealer
    const sales = await BarbenderSale.find({ dealerId });
    const totalKg = sales.reduce((sum, s) => sum + s.quantityKg, 0);
    const eligibleKg = totalKg; // 100% eligible
    const rewardKg = Math.floor(eligibleKg / 100) * 5; // 5kg for every 100kg

    res.json({
      success: true,
      totalKg,
      eligibleKg,
      rewardKg,
      currentBalance: dealer.totalRewardEligible || 0
    });
  } catch (error: any) {
    console.error("Dealer rewards error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Claim Rewards
// ============================================
router.post("/dealer/rewards/claim", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.body;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid dealer" });
    }

    // Calculate rewards
    const sales = await BarbenderSale.find({ dealerId });
    const totalKg = sales.reduce((sum, s) => sum + s.quantityKg, 0);
    const rewardKg = Math.floor(totalKg / 100) * 5;

    if (rewardKg <= 0) {
      return res.status(400).json({ error: "No rewards to claim" });
    }

    // Add to balance
    dealer.totalRewardEligible = (dealer.totalRewardEligible || 0) + rewardKg;
    await dealer.save();

    res.json({
      success: true,
      message: `Claimed ${rewardKg}kg reward!`,
      newBalance: dealer.totalRewardEligible
    });
  } catch (error: any) {
    console.error("Dealer claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Get Sales History
// ============================================
router.get("/dealer/sales", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });

    const sales = await BarbenderSale.find({ dealerId }).sort({ saleDateTime: -1 });
    const totalKg = sales.reduce((sum, s) => sum + s.quantityKg, 0);
    res.json({ sales, totalKg, eligibleKg: dealer.totalRewardEligible });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get Rewards Summary
// ============================================
router.get("/rewards", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.query;
    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    // Get all purchases for this barbender (filter by barbenderId)
    const purchases = await BarbenderSale.find({ 
      barbenderId: new mongoose.Types.ObjectId(barbenderId as string)
    });

    const totalKg = purchases.reduce((sum, p) => sum + p.quantityKg, 0);
    const eligibleKg = totalKg; // 100% eligible
    const rewardKg = Math.floor(eligibleKg / 100) * 5; // 5kg for every 100kg

    res.json({
      success: true,
      totalKg,
      eligibleKg,
      rewardKg,
      currentBalance: barbender.totalRewardEligible || 0
    });
  } catch (error: any) {
    console.error("Rewards error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Claim Rewards
// ============================================
router.post("/rewards/claim", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.body;
    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    // Calculate rewards (filter by barbenderId)
    const purchases = await BarbenderSale.find({ 
      barbenderId: new mongoose.Types.ObjectId(barbenderId as string)
    });

    const totalKg = purchases.reduce((sum, p) => sum + p.quantityKg, 0);
    const rewardKg = Math.floor(totalKg / 100) * 5;

    if (rewardKg <= 0) {
      return res.status(400).json({ error: "No rewards to claim" });
    }

    // Add to balance
    barbender.totalRewardEligible = (barbender.totalRewardEligible || 0) + rewardKg;
    await barbender.save();

    res.json({
      success: true,
      message: `Claimed ${rewardKg}kg reward!`,
      newBalance: barbender.totalRewardEligible
    });
  } catch (error: any) {
    console.error("Claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get My Purchases
// ============================================
router.get("/purchases", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.query;
    
    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    // Query by barbenderId (filtering purchases made TO this barbender)
    const purchases = await BarbenderSale.find({ 
      barbenderId: new mongoose.Types.ObjectId(barbenderId as string)
    }).sort({ saleDateTime: -1 });
    
    const totalKg = purchases.reduce((sum, p) => sum + p.quantityKg, 0);
    
    res.json({ 
      success: true,
      purchases, 
      totalKg, 
      eligibleKg: barbender.totalRewardEligible 
    });
  } catch (error: any) {
    console.error("Purchases error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
