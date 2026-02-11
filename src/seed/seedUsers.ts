import mongoose from "mongoose";
import dotenv from "dotenv";
import User, { UserRole, UserStatus } from "../models/User";
import Product, { ProductCategory } from "../models/Product";

dotenv.config();

const SAMPLE_PRODUCTS = [
  { productCode: "TMT-6MM", productName: "TMT Bar 6mm", category: ProductCategory.TMT_BAR, thicknessInch: 6, grade: "Fe 500", length: 12, weightPerUnit: 2.66, unit: "kg", pricePerUnit: 65 },
  { productCode: "TMT-8MM", productName: "TMT Bar 8mm", category: ProductCategory.TMT_BAR, thicknessInch: 8, grade: "Fe 500", length: 12, weightPerUnit: 4.74, unit: "kg", pricePerUnit: 115 },
  { productCode: "TMT-10MM", productName: "TMT Bar 10mm", category: ProductCategory.TMT_BAR, thicknessInch: 10, grade: "Fe 500", length: 12, weightPerUnit: 7.4, unit: "kg", pricePerUnit: 180 },
  { productCode: "TMT-12MM", productName: "TMT Bar 12mm", category: ProductCategory.TMT_BAR, thicknessInch: 12, grade: "Fe 500", length: 12, weightPerUnit: 10.66, unit: "kg", pricePerUnit: 260 },
  { productCode: "TMT-16MM", productName: "TMT Bar 16mm", category: ProductCategory.TMT_BAR, thicknessInch: 16, grade: "Fe 500", length: 12, weightPerUnit: 18.96, unit: "kg", pricePerUnit: 465 },
  { productCode: "TMT-20MM", productName: "TMT Bar 20mm", category: ProductCategory.TMT_BAR, thicknessInch: 20, grade: "Fe 500", length: 12, weightPerUnit: 29.64, unit: "kg", pricePerUnit: 725 },
  { productCode: "TMT-25MM", productName: "TMT Bar 25mm", category: ProductCategory.TMT_BAR, thicknessInch: 25, grade: "Fe 500", length: 12, weightPerUnit: 46.3, unit: "kg", pricePerUnit: 1135 },
  { productCode: "TMT-32MM", productName: "TMT Bar 32mm", category: ProductCategory.TMT_BAR, thicknessInch: 32, grade: "Fe 500", length: 12, weightPerUnit: 75.84, unit: "kg", pricePerUnit: 1860 },
  { productCode: "ROD-6MM", productName: "Steel Rod 6mm", category: ProductCategory.STEEL_ROD, thicknessInch: 6, grade: "Fe 415", length: 12, weightPerUnit: 2.66, unit: "kg", pricePerUnit: 58 },
  { productCode: "ROD-8MM", productName: "Steel Rod 8mm", category: ProductCategory.STEEL_ROD, thicknessInch: 8, grade: "Fe 415", length: 12, weightPerUnit: 4.74, unit: "kg", pricePerUnit: 105 },
];

const seedAll = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/steel";
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    // Clear all
    await User.deleteMany({});
    await Product.deleteMany({});

    const now = new Date();

    // ONLY SEED SUPER ADMIN
    const saUser = await new User({
      countryCode: "91",
      phoneNo: 9999999999,
      role: UserRole.SUPER_ADMIN,
      name: "Super Admin",
      status: UserStatus.ACTIVE, // SA is already active
      totalQuantityAvailable: 0,
      lastOTPValidated: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    }).save();

    console.log("Seeded Super Admin: 9999999999 (ACTIVE)");

    // Seed products
    const productsToInsert = SAMPLE_PRODUCTS.map((p: any) => ({
      productCode: p.productCode,
      productName: p.productName,
      category: p.category,
      thicknessInch: p.thicknessInch,
      grade: p.grade,
      length: p.length,
      weightPerUnit: p.weightPerUnit,
      unit: p.unit,
      pricePerUnit: p.pricePerUnit,
      description: `${p.productName} - ${p.grade}`,
      isActive: true,
      createdBy: saUser._id,
      createdAt: now,
      updatedAt: now
    }));
    await Product.insertMany(productsToInsert);

    console.log("\nSeeded products:");
    SAMPLE_PRODUCTS.forEach((p: any) => console.log(`  - ${p.productCode}: ${p.productName}`));

    console.log("\n✅ Seed completed!");
    console.log("\n📱 Login with Super Admin: 9999999999");
    console.log("   Then create ASO/Dealer users via API");
    process.exit(0);
  } catch (error: any) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};

seedAll();
