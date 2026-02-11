import mongoose, { Schema, Document } from "mongoose";

export enum ProductCategory {
  STEEL_ROD = "steel_rod",
  TMT_BAR = "tmt_bar",
}

export interface IProduct extends Document {
  productCode: string;
  productName: string;
  category: ProductCategory;
  thicknessInch: number;
  grade?: string;
  length?: number;
  weightPerUnit?: number;
  unit: string;
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
  length: { type: Number },
  weightPerUnit: { type: Number },
  unit: { type: String, default: "kg" },
  pricePerUnit: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const Product = mongoose.model<IProduct>("Product", productSchema);
export default Product;
