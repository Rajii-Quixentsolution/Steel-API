import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import StockDispatch, { DispatchStatus } from "../models/StockDispatch";
import User, { UserRole, UserStatus } from "../models/User";
import Product from "../models/Product";

const router = Router();

// ASO: Get Mapped Dealers
router.get("/mapped-dealers", async (req: Request, res: Response) => {
  try {
    const { asoId } = req.query;
    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) return res.status(403).json({ error: "Invalid ASO" });

    const dealers = await User.find({
      role: UserRole.DEALER,
      status: UserStatus.ACTIVE,
      isDeleted: false,
      assignedASO: aso._id
    }).select("name phoneNo totalQuantityAvailable");

    res.json({ dealers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ASO: Get Products
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ productName: 1 });
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ASO: Dispatch Stock to Dealer
router.post("/dispatch", async (req: Request, res: Response) => {
  try {
    const { asoId, dealerId, productId, quantityKg } = req.body;
    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) return res.status(403).json({ error: "Invalid ASO" });

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(404).json({ error: "Dealer not found" });
    if (dealer.assignedASO?.toString() !== asoId) return res.status(403).json({ error: "Dealer is not mapped to you" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sequentialDay = Math.floor((Date.now() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const dispatch = await new StockDispatch({
      asoId: new mongoose.Types.ObjectId(asoId),
      dealerId: new mongoose.Types.ObjectId(dealerId),
      productId: new mongoose.Types.ObjectId(productId),
      quantityKg: parseFloat(quantityKg),
      dispatchDateTime: now,
      sequentialDay,
      status: DispatchStatus.PENDING
    }).save();

    res.json({ 
      success: true, 
      message: `Stock dispatched`, 
      dispatch: { 
        _id: dispatch._id, 
        quantityKg: dispatch.quantityKg, 
        sequentialDay: dispatch.sequentialDay 
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dealer: Get Pending Stock
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dispatches = await StockDispatch.find({
      dealerId,
      status: DispatchStatus.PENDING
    })
      .populate("productId", "productName productCode")
      .populate("asoId", "name phoneNo")
      .sort({ dispatchDateTime: -1 });
    res.json({ dispatches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dealer: Get Received Stock
router.get("/received", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query;
    const dispatches = await StockDispatch.find({ dealerId, status: DispatchStatus.RECEIVED })
      .populate("productId", "productName productCode")
      .populate("asoId", "name phoneNo")
      .sort({ receivedDateTime: -1 });
    res.json({ dispatches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dealer: Receive Stock
router.post("/receive", async (req: Request, res: Response) => {
  try {
    const { dispatchId, dealerId } = req.body;
    const dispatch = await StockDispatch.findById(dispatchId);
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });
    if (dispatch.dealerId.toString() !== dealerId) return res.status(403).json({ error: "Not your dispatch" });
    if (dispatch.status === DispatchStatus.RECEIVED) return res.status(400).json({ error: "Already received" });

    dispatch.status = DispatchStatus.RECEIVED;
    dispatch.receivedDateTime = new Date();
    await dispatch.save();

    const dealer = await User.findById(dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });
    
    dealer.totalQuantityAvailable = (dealer.totalQuantityAvailable || 0) + dispatch.quantityKg;
    await dealer.save();

    res.json({ 
      success: true, 
      message: `Received ${dispatch.quantityKg}kg successfully`, 
      newBalance: dealer.totalQuantityAvailable 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Day-wise Summary
router.get("/summary/:dealerId", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.params;
    const summary = await StockDispatch.aggregate([
      { $match: { dealerId: new mongoose.Types.ObjectId(dealerId), status: DispatchStatus.RECEIVED } },
      { $group: { _id: "$sequentialDay", totalKg: { $sum: "$quantityKg" }, count: { $sum: 1 }, date: { $first: "$dispatchDateTime" } } },
      { $sort: { _id: 1 } }
    ]);
    const totalReceived = await StockDispatch.aggregate([
      { $match: { dealerId: new mongoose.Types.ObjectId(dealerId), status: DispatchStatus.RECEIVED } },
      { $group: { _id: null, total: { $sum: "$quantityKg" } } }
    ]);
    res.json({ dayWise: summary, totalReceived: totalReceived[0]?.total || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
