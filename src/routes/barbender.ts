import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import Product from "../models/Product";
import BarbenderSale from "../models/BarbenderSale";
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
      createdByDealer: dealer._id,
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

    const now = new Date();
    const barbender = await new User({
      countryCode: countryCode || "91",
      phoneNo: parseInt(phoneNo),
      name, email,
      role: UserRole.BARBENDER,
      status: UserStatus.PENDING,
      createdByDealer: dealer._id,
      totalQuantityAvailable: 0,
      totalRewardEligible: 0,
      createdBy: dealer._id,
      createdAt: now,
      updatedAt: now,
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

// ============================================
// BARBENDER: Get QR Code Data
// ============================================
router.get("/barbender/qr/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const barbender = await User.findOne({ _id: id, role: UserRole.BARBENDER, isDeleted: false });
    if (!barbender) return res.status(404).json({ error: "Barbender not found" });

    res.json({
      barbenderId: barbender._id,
      name: barbender.name,
      phoneNo: barbender.phoneNo,
      qrData: JSON.stringify({ id: barbender._id.toString(), name: barbender.name })
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Sell to Barbender (Scan QR)
// ============================================
router.post("/dealer/sell", async (req: Request, res: Response) => {
  try {
    const { dealerId, barbenderUserId, productId, quantityKg, notes } = req.body;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER || dealer.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid dealer" });
    }

    const barbender = await User.findOne({ _id: barbenderUserId, role: UserRole.BARBENDER, isDeleted: false });
    if (!barbender) return res.status(404).json({ error: "Barbender not found" });
    if (barbender.createdByDealer?.toString() !== dealerId) return res.status(403).json({ error: "Not your barbender" });
    if (barbender.status === UserStatus.BLOCKED) return res.status(403).json({ error: "Barbender blocked" });

    const quantity = parseFloat(quantityKg);
    if (quantity > dealer.totalQuantityAvailable) return res.status(400).json({ error: "Insufficient stock" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const now = new Date();
    const sale = await new BarbenderSale({
      dealerId: dealer._id, dealerName: dealer.name,
      barbenderId: barbender._id, barbenderName: barbender.name, barbenderUserId,
      productId: product._id, productName: product.productName, productCode: product.productCode,
      quantityKg: quantity, saleDateTime: now, notes
    }).save();

    // Update dealer stock
    dealer.totalQuantityAvailable -= quantity;
    dealer.totalRewardEligible += quantity; // Dealer rewards based on sales
    await dealer.save();

    // Update barbender
    barbender.totalQuantityAvailable += quantity;
    barbender.totalRewardEligible += quantity; // Barbender rewards based on purchases
    await barbender.save();

    // Update daily stock
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let dailyStock = await DailyStock.findOne({ dealerId: dealer._id, date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } });
    if (!dailyStock) {
      dailyStock = await new DailyStock({ dealerId: dealer._id, dealerName: dealer.name, date: today, dayNumber: getDayNumber(today), totalReceivedKg: 0, totalDispatchedKg: 0, availableBalanceKg: dealer.totalQuantityAvailable }).save();
    }
    dailyStock.totalDispatchedKg += quantity;
    dailyStock.availableBalanceKg = dealer.totalQuantityAvailable;
    await dailyStock.save();

    res.json({
      success: true,
      message: "Sale recorded",
      sale: { id: sale._id, barbenderName: barbender.name, productName: product.productName, quantityKg: quantity, saleDateTime: sale.saleDateTime, newBalance: dealer.totalQuantityAvailable, rewardEligible: dealer.totalRewardEligible }
    });
  } catch (error: any) {
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

export default router;
