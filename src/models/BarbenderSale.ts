import mongoose, { Schema, Document } from "mongoose";

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

const barbenderSaleSchema = new Schema<IBarbenderSale>({
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerName: { type: String, required: true, trim: true },
  barbenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  barbenderUserId: { type: String, required: true }, // String version of barbender ID
  barbenderName: { type: String, required: true, trim: true },
  qrCodeId: { type: String },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true, trim: true },
  productCode: { type: String, required: true, uppercase: true, trim: true },
  quantityKg: { type: Number, required: true, min: 0.01 },
  saleDateTime: { type: Date, required: true },
  notes: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

barbenderSaleSchema.index({ dealerId: 1, saleDateTime: -1 });
barbenderSaleSchema.index({ barbenderId: 1, saleDateTime: -1 });
barbenderSaleSchema.index({ createdBy: 1 });

export const BarbenderSale = mongoose.model<IBarbenderSale>("BarbenderSale", barbenderSaleSchema);
export default BarbenderSale;
