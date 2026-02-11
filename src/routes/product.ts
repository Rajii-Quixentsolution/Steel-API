import { Router, Request, Response } from "express";
import { Product, ProductCategory } from "../models/Product";
import User, { UserRole } from "../models/User";
import mongoose from "mongoose";

const router = Router();

// ============================================
// SUPER ADMIN: Create Product
// ============================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { productCode, productName, category, thicknessInch, grade, length, weightPerUnit, unit, pricePerUnit, adminId } = req.body;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can create products" });
    }

    const existing = await Product.findOne({ productCode });
    if (existing) {
      return res.status(400).json({ error: "Product code already exists" });
    }

    const product = await new Product({
      productCode,
      productName,
      category: category || ProductCategory.STEEL_ROD,
      thicknessInch: parseFloat(thicknessInch),
      grade,
      length: length ? parseFloat(length) : undefined,
      weightPerUnit: weightPerUnit ? parseFloat(weightPerUnit) : undefined,
      unit: unit || "kg",
      pricePerUnit: parseFloat(pricePerUnit),
      createdBy: new mongoose.Types.ObjectId(adminId)
    }).save();

    res.json({ success: true, message: "Product created", product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// List All Products
// ============================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, activeOnly } = req.query;
    const query: any = { isActive: true };
    if (category) query.category = category;
    if (activeOnly === "false") delete query.isActive;

    const products = await Product.find(query).sort({ productName: 1 });
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get Single Product
// ============================================
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Update Product
// ============================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { adminId, ...updateData } = req.body;
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can update products" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ success: true, message: "Product updated", product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUPER ADMIN: Delete/Deactivate Product
// ============================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.body;
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can delete products" });
    }

    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Product deactivated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Seed 10 Sample Products
// ============================================
router.post("/seed-sample", async (req: Request, res: Response) => {
  try {
    const { adminId } = req.body;
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can seed products" });
    }

    const sampleProducts = [
      { productCode: "STL-001", productName: "Steel Rod 6mm", category: ProductCategory.STEEL_ROD, thicknessInch: 0.236, grade: "Fe 415", length: 12, weightPerUnit: 2.2, unit: "kg", pricePerUnit: 65 },
      { productCode: "STL-002", productName: "Steel Rod 8mm", category: ProductCategory.STEEL_ROD, thicknessInch: 0.315, grade: "Fe 415", length: 12, weightPerUnit: 3.9, unit: "kg", pricePerUnit: 115 },
      { productCode: "STL-003", productName: "Steel Rod 10mm", category: ProductCategory.STEEL_ROD, thicknessInch: 0.394, grade: "Fe 415", length: 12, weightPerUnit: 6.1, unit: "kg", pricePerUnit: 180 },
      { productCode: "STL-004", productName: "Steel Rod 12mm", category: ProductCategory.STEEL_ROD, thicknessInch: 0.472, grade: "Fe 415", length: 12, weightPerUnit: 8.9, unit: "kg", pricePerUnit: 262 },
      { productCode: "STL-005", productName: "Steel Rod 16mm", category: ProductCategory.STEEL_ROD, thicknessInch: 0.63, grade: "Fe 415", length: 12, weightPerUnit: 15.8, unit: "kg", pricePerUnit: 465 },
      { productCode: "STL-006", productName: "TMT Bar 8mm", category: ProductCategory.TMT_BAR, thicknessInch: 0.315, grade: "Fe 500", length: 12, weightPerUnit: 3.9, unit: "kg", pricePerUnit: 125 },
      { productCode: "STL-007", productName: "TMT Bar 10mm", category: ProductCategory.TMT_BAR, thicknessInch: 0.394, grade: "Fe 500", length: 12, weightPerUnit: 6.1, unit: "kg", pricePerUnit: 195 },
      { productCode: "STL-008", productName: "TMT Bar 12mm", category: ProductCategory.TMT_BAR, thicknessInch: 0.472, grade: "Fe 500", length: 12, weightPerUnit: 8.9, unit: "kg", pricePerUnit: 285 },
      { productCode: "STL-009", productName: "TMT Bar 16mm", category: ProductCategory.TMT_BAR, thicknessInch: 0.63, grade: "Fe 500", length: 12, weightPerUnit: 15.8, unit: "kg", pricePerUnit: 495 },
      { productCode: "STL-010", productName: "TMT Bar 20mm", category: ProductCategory.TMT_BAR, thicknessInch: 0.787, grade: "Fe 500", length: 12, weightPerUnit: 24.7, unit: "kg", pricePerUnit: 770 },
    ];

    const created = [];
    for (const p of sampleProducts) {
      const exists = await Product.findOne({ productCode: p.productCode });
      if (!exists) {
        const product = await new Product({
          ...p,
          createdBy: new mongoose.Types.ObjectId(adminId)
        }).save();
        created.push(product);
      }
    }

    res.json({ success: true, message: `${created.length} sample products created`, products: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
