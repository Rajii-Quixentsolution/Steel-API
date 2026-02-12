import mongoose, { Schema, Document } from "mongoose";

export enum ProductCategory {
  STEEL_ROD = "steel_rod",
  TMT_BAR = "tmt_bar",
}

export enum ProductUnit {
  KG = "kg",
  TON = "ton",
  PIECE = "piece",
  METER = "meter"
}

export interface IProduct extends Document {
  productCode: string;
  productName: string;
  category: ProductCategory;
  thicknessInch: number;
  grade?: string;
  length?: number;
  weightPerUnit?: number;
  unit: ProductUnit;
  pricePerUnit: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const productSchema = new Schema<IProduct>({
  productCode: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  category: { type: String, enum: Object.values(ProductCategory), required: true },
  thicknessInch: { type: Number, required: true },
  grade: { type: String },
  length: { type: Number ,min: 0 },
  weightPerUnit: { type: Number ,min: 0 },
  unit: { type: String, enum: Object.values(ProductUnit), default: ProductUnit.KG },
  pricePerUnit: { type: Number, required: true , min: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

// Indexes for performance
productSchema.index({ productCode: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isActive: 1 });

export const Product = mongoose.model<IProduct>("Product", productSchema);
export default Product;
