import mongoose, { Schema, Document } from "mongoose";
import { ProductUnit } from "./Product";

export interface IBarbenderSale extends Document {
  dealerId: mongoose.Types.ObjectId;
  dealerName: string;
  barbenderId: mongoose.Types.ObjectId;
  barbenderUserId: string;
  barbenderName: string;
  qrCodeId?: string;
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;
  quantityKg: number;
  saleDateTime: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const barbenderSaleSchema = new Schema<IBarbenderSale>(
  {
    dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dealerName: { type: String, required: true },
    barbenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    barbenderUserId: { type: String, required: true },
    barbenderName: { type: String, required: true },
    qrCodeId: { type: String },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    productCode: { type: String, required: true },
    quantityKg: { type: Number, required: true },
    saleDateTime: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const BarbenderSale = mongoose.model<IBarbenderSale>("BarbenderSale", barbenderSaleSchema);
export default BarbenderSale;
