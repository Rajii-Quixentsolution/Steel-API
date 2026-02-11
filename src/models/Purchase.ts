import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
  barbenderId: mongoose.Types.ObjectId;
  barbenderName: string;
  sourceName: string;
  productId?: mongoose.Types.ObjectId;
  productName?: string;
  quantityKg: number;
  purchaseDate: Date;
  purchaseDateTime: string;
  notes?: string;
  createdAt: Date;
}

const purchaseSchema = new Schema<IPurchase>({
  barbenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  barbenderName: { type: String, required: true },
  sourceName: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String },
  quantityKg: { type: Number, required: true },
  purchaseDate: { type: Date, required: true },
  purchaseDateTime: { type: String, required: true },
  notes: { type: String }
}, { timestamps: true });

purchaseSchema.index({ barbenderId: 1, purchaseDate: -1 });

export const Purchase = mongoose.model<IPurchase>("Purchase", purchaseSchema);
export default Purchase;
