import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole } from "../models/User";
import Product from "../models/Product";
import BarbenderSale from "../models/sales";

const router = Router();

// ============================================
// ASO: Get Mapped Dealers
// ============================================
router.get("/mapped-dealers", async (req: Request, res: Response) => {
  try {
    const { asoId } = req.query as { asoId?: string };
    if (!asoId) return res.status(400).json({ error: "asoId is required" });

    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO)
      return res.status(403).json({ error: "Invalid ASO" });

    const dealers = await User.find({
      role: UserRole.DEALER,
      assignedASO: new mongoose.Types.ObjectId(asoId),
      isDeleted: false,
    }).select("name phoneNo totalQuantityAvailable");

    res.json({
      success: true,
      dealers: dealers.map((d) => ({
        _id: d._id,
        name: d.name,
        phoneNo: d.phoneNo,
        totalQuantityAvailable: d.totalQuantityAvailable || 0,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get Available Products
// ============================================
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true })
      .select("productName productCode pricePerUnit weightPerUnit")  // ✅ add weightPerUnit
      .sort({ productName: 1 });

    res.json({
      success: true,
      products: products.map((p) => ({
        _id: p._id,
        productName: p.productName,
        productCode: p.productCode,
        pricePerUnit: p.pricePerUnit,
        weightPerUnit: p.weightPerUnit || 0,  // ✅ add this
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASO: Dispatch Stock to Dealer
// ✅ Saves as aso_to_dealer PENDING in BarbenderSale
// ============================================
router.post("/dispatch", async (req: Request, res: Response) => {
  try {
    const { asoId, dealerId, productId, quantityKg } = req.body;

    if (!asoId || !dealerId || !productId || !quantityKg)
      return res.status(400).json({ error: "Missing required fields" });

    const quantity = parseFloat(quantityKg);
    if (isNaN(quantity) || quantity <= 0)
      return res.status(400).json({ error: "Invalid quantity" });

    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO)
      return res.status(403).json({ error: "Invalid ASO" });

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER)
      return res.status(403).json({ error: "Invalid Dealer" });

    if (!dealer.assignedASO || dealer.assignedASO.toString() !== asoId)
      return res.status(403).json({ error: "Dealer not mapped to this ASO" });

    const product = await Product.findById(productId);
    if (!product || !product.isActive)
      return res.status(404).json({ error: "Product not found or inactive" });

    // ✅ Save as aso_to_dealer PENDING — balance NOT updated yet
    const dispatch = await BarbenderSale.create({
      transactionType: "aso_to_dealer",
      asoId: aso._id,
      asoName: aso.name,
      dealerId: dealer._id,
      dealerName: dealer.name,
      productId: product._id,
      productName: product.productName,
      productCode: product.productCode,
      quantityKg: quantity,
      status: "pending",
      createdBy: aso._id,
    });

    res.json({
      success: true,
      message: `Dispatched ${quantity}kg to ${dealer.name}. Awaiting dealer confirmation.`,
      dispatch: {
        _id: dispatch._id,
        quantityKg: quantity,
        status: "pending",
        dealerName: dealer.name,
        productName: product.productName,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Get Pending Dispatches
// ============================================
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query as { dealerId?: string };
    if (!dealerId) return res.status(400).json({ error: "dealerId is required" });

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER)
      return res.status(403).json({ error: "Invalid Dealer" });

    const dispatches = await BarbenderSale.find({
      dealerId,
      transactionType: "aso_to_dealer",
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      dispatches: dispatches.map((d) => ({
        _id: d._id,
        quantityKg: d.quantityKg,
        status: d.status,
        dispatchedAt: d.createdAt,
        asoName: d.asoName,
        productName: d.productName,
        productCode: d.productCode,
        productId: d.productId, 
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Get Received Dispatches
// ============================================
router.get("/received", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query as { dealerId?: string };
    if (!dealerId) return res.status(400).json({ error: "dealerId is required" });

    const dispatches = await BarbenderSale.find({
      dealerId,
      transactionType: "aso_to_dealer",
      status: "received",
    }).sort({ receivedAt: -1 });

    // Get dealer info for name
    const dealer = await User.findById(dealerId);
    const dealerName = dealer ? dealer.name : "Unknown";

    res.json({
      success: true,
      dispatches: dispatches.map((d) => ({
        _id: d._id,
        quantityKg: d.quantityKg,
        receivedAt: d.receivedAt,
        asoName: d.asoName,
        dealerName: dealerName, // Add dealer name
        productName: d.productName,
        productCode: d.productCode,  
        productId: d.productId,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Receive Stock
// ✅ ONLY HERE does balance update
// ============================================
router.post("/receive", async (req: Request, res: Response) => {
  try {
    const { dispatchId, dealerId } = req.body;

    if (!dispatchId || !dealerId)
      return res.status(400).json({ error: "Missing dispatchId or dealerId" });

    const dispatch = await BarbenderSale.findById(dispatchId);
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });

    if (dispatch.dealerId.toString() !== dealerId)
      return res.status(403).json({ error: "Not authorized" });

    if (dispatch.status === "received")
      return res.status(400).json({ error: "Already received" });

    // Mark received
    dispatch.status = "received";
    dispatch.receivedAt = new Date();
    await dispatch.save();

    // ✅ NOW update dealer balance
    const dealer = await User.findById(dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    dealer.totalQuantityAvailable =
      (dealer.totalQuantityAvailable || 0) + dispatch.quantityKg;
    dealer.updatedAt = new Date();
    await dealer.save();

    res.json({
      success: true,
      message: `Successfully received ${dispatch.quantityKg}kg`,
      newBalance: dealer.totalQuantityAvailable,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;