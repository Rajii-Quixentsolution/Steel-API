import mongoose, { Schema, Document } from "mongoose";

export interface IBarbenderSale extends Document {
  dealerId: mongoose.Types.ObjectId;
  dealerName: string;
  barbenderId: mongoose.Types.ObjectId;
  barbenderName: string;
  barbenderUserId?: string;
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;
  quantityKg: number;
  saleDate: Date;
  saleDateTime: string;
  notes?: string;
  createdAt: Date;
}

const barbenderSaleSchema = new Schema<IBarbenderSale>({
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerName: { type: String, required: true },
  barbenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  barbenderName: { type: String, required: true },
  barbenderUserId: { type: String },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  productCode: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  saleDate: { type: Date, required: true },
  saleDateTime: { type: String, required: true },
  notes: { type: String }
}, { timestamps: true });

barbenderSaleSchema.index({ dealerId: 1, saleDate: -1 });
barbenderSaleSchema.index({ barbenderId: 1, saleDate: -1 });

export const BarbenderSale = mongoose.model<IBarbenderSale>("BarbenderSale", barbenderSaleSchema);
export default BarbenderSale;
