import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import Product from "../models/Product";
import StockDispatch, { DispatchStatus } from "../models/StockDispatch";
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
// ASO: Get Mapped Dealers
// ============================================
router.get("/aso/dealers", async (req: Request, res: Response) => {
  try {
    const { asoId } = req.query;
    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) return res.status(403).json({ error: "Invalid ASO" });

    const dealers = await User.find({
      role: UserRole.DEALER,
      assignedASO: aso._id,
      isDeleted: false
    }).select("name phoneNo status totalQuantityAvailable totalRewardEligible");

    res.json({ dealers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASO: Dispatch Stock to Dealer
// ============================================
router.post("/aso/dispatch", async (req: Request, res: Response) => {
  try {
    const { asoId, dealerId, productId, quantityKg, notes } = req.body;

    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO || aso.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid or inactive ASO" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER || dealer.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid or inactive dealer" });
    }
    if (dealer.assignedASO?.toString() !== asoId) {
      return res.status(403).json({ error: "Dealer not mapped to you" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const now = new Date();
    const dispatch = await new StockDispatch({
      asoId: aso._id,
      dealerId: dealer._id,
      productId: product._id,
      quantityKg: parseFloat(quantityKg),
      dispatchDateTime: now,
      sequentialDay: getDayNumber(now),
      status: DispatchStatus.PENDING,
      notes
    }).save();

    res.json({
      success: true,
      message: "Stock dispatched successfully",
      dispatch: {
        id: dispatch._id,
        quantityKg: dispatch.quantityKg,
        sequentialDay: dispatch.sequentialDay,
        status: dispatch.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Get Dispatch History
// ============================================
router.get("/dealer/dispatches", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });

    const dispatches = await StockDispatch.find({ dealerId }).sort({ dispatchDateTime: -1 });
    const totalReceived = dispatches
      .filter(d => d.status === DispatchStatus.RECEIVED)
      .reduce((sum, d) => sum + d.quantityKg, 0);

    res.json({ dispatches, totalReceived });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Receive Stock
// ============================================
router.put("/dealer/receive/:id", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.body;
    const { id } = req.params;

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });

    const dispatch = await StockDispatch.findById(id);
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
    if (dispatch.dealerId.toString() !== dealerId) return res.status(403).json({ error: "Not your dispatch" });
    if (dispatch.status !== DispatchStatus.PENDING) return res.status(400).json({ error: "Already processed" });

    const now = new Date();
    dispatch.status = DispatchStatus.RECEIVED;
    dispatch.receivedDateTime = now;
    await dispatch.save();

    // Update dealer's total quantity
    dealer.totalQuantityAvailable += dispatch.quantityKg;
    await dealer.save();

    // Update daily stock
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let dailyStock = await DailyStock.findOne({
      dealerId: dealer._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (!dailyStock) {
      dailyStock = await new DailyStock({
        dealerId: dealer._id,
        date: today,
        sequentialDay: getDayNumber(today),
        totalReceivedKg: 0,
        totalDispatchedKg: 0,
        availableBalanceKg: dealer.totalQuantityAvailable
      }).save();
    }

    dailyStock.totalReceivedKg += dispatch.quantityKg;
    dailyStock.availableBalanceKg = dealer.totalQuantityAvailable;
    await dailyStock.save();

    res.json({
      success: true,
      message: "Stock received",
      newBalance: dealer.totalQuantityAvailable
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET PRODUCTS
// ============================================
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Get Daily Stock
// ============================================
router.get("/dealer/daily-stock", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyStocks = await DailyStock.find({
      dealerId: dealer._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    }).sort({ date: -1 });

    res.json({
      dailyStock: dailyStocks[0] || null,
      allStocks: dailyStocks,
      currentBalance: dealer.totalQuantityAvailable
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
