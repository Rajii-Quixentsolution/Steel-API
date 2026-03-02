import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import Product from "../models/Product";

const router = Router();

// ============================================
// ASO: Get Mapped Dealers (for stock dispatch)
// ============================================
router.get("/mapped-dealers", async (req: Request, res: Response) => {
  try {
    const { asoId } = req.query as { asoId?: string };

    if (!asoId) {
      return res.status(400).json({ error: "asoId is required" });
    }

    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) {
      return res.status(403).json({ error: "Invalid ASO" });
    }

    // Get dealers assigned to this ASO
    const dealers = await User.find({
      role: UserRole.DEALER,
      assignedASO: new mongoose.Types.ObjectId(asoId),
      isDeleted: false
    }).select("name phoneNo totalQuantityAvailable");

    res.json({ 
      success: true,
      dealers: dealers.map(dealer => ({
        _id: dealer._id,
        name: dealer.name,
        phoneNo: dealer.phoneNo,
        totalQuantityAvailable: dealer.totalQuantityAvailable || 0
      }))
    });
  } catch (error: any) {
    console.error("Mapped dealers error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Get Pending Dispatches
// ============================================
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query as { dealerId?: string };

    if (!dealerId) {
      return res.status(400).json({ error: "dealerId is required" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid Dealer" });
    }

    // For now, return empty array since we don't have a dispatch history model
    // In a full implementation, this would query a Dispatch model
    res.json({ 
      success: true,
      dispatches: []
    });
  } catch (error: any) {
    console.error("Pending dispatches error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Get Received Dispatches
// ============================================
router.get("/received", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.query as { dealerId?: string };

    if (!dealerId) {
      return res.status(400).json({ error: "dealerId is required" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid Dealer" });
    }

    // For now, return empty array since we don't have a dispatch history model
    // In a full implementation, this would query a Dispatch model
    res.json({ 
      success: true,
      dispatches: []
    });
  } catch (error: any) {
    console.error("Received dispatches error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get Available Products
// ============================================
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true })
      .select("productName productCode pricePerUnit")
      .sort({ productName: 1 });

    res.json({ 
      success: true,
      products: products.map(product => ({
        _id: product._id,
        productName: product.productName,
        productCode: product.productCode,
        pricePerUnit: product.pricePerUnit
      }))
    });
  } catch (error: any) {
    console.error("Products error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASO: Dispatch Stock to Dealer
// ============================================
router.post("/dispatch", async (req: Request, res: Response) => {
  try {
    const { asoId, dealerId, productId, quantityKg } = req.body;

    // Validate inputs
    if (!asoId || !dealerId || !productId || !quantityKg) {
      return res.status(400).json({ error: "Missing required fields: asoId, dealerId, productId, quantityKg" });
    }

    const quantity = parseFloat(quantityKg);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    // Validate ASO
    const aso = await User.findById(asoId);
    if (!aso || aso.role !== UserRole.ASO) {
      return res.status(403).json({ error: "Invalid ASO" });
    }

    // Validate Dealer and check if mapped to this ASO
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid Dealer" });
    }

    if (!dealer.assignedASO || dealer.assignedASO.toString() !== asoId) {
      return res.status(403).json({ error: "Dealer not mapped to this ASO" });
    }

    // Validate Product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    // Update dealer's stock balance
    const newBalance = (dealer.totalQuantityAvailable || 0) + quantity;
    dealer.totalQuantityAvailable = newBalance;
    dealer.updatedAt = new Date();
    await dealer.save();

    // For now, we'll just return success without creating a dispatch record
    // In a full implementation, this would create a Dispatch model record
    
    res.json({
      success: true,
      message: `Successfully dispatched ${quantity}kg of ${product.productName} to ${dealer.name}`,
      dispatch: {
        _id: new mongoose.Types.ObjectId(),
        quantityKg: quantity,
        dayNumber: 1, // Simple implementation
        dealerName: dealer.name,
        productName: product.productName
      }
    });
  } catch (error: any) {
    console.error("Dispatch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Dealer: Receive Stock
// ============================================
router.post("/receive", async (req: Request, res: Response) => {
  try {
    const { dispatchId, dealerId } = req.body;

    if (!dispatchId || !dealerId) {
      return res.status(400).json({ error: "Missing required fields: dispatchId, dealerId" });
    }

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid Dealer" });
    }

    // For now, just return the current balance since we don't have dispatch history
    // In a full implementation, this would mark a dispatch as received and update balance
    
    res.json({
      success: true,
      message: "Stock received successfully",
      newBalance: dealer.totalQuantityAvailable || 0
    });
  } catch (error: any) {
    console.error("Receive error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;