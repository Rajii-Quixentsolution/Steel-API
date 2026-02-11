import mongoose, { Schema, Document } from "mongoose";

export enum DispatchStatus {
  PENDING = "pending",
  RECEIVED = "received",
  CANCELLED = "cancelled"
}

export interface IStockDispatch extends Document {
  asoId: mongoose.Types.ObjectId;
  asoName: string;
  dealerId: mongoose.Types.ObjectId;
  dealerName: string;
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;
  quantityKg: number;
  dispatchDateTime: Date;
  dayNumber: number;
  status: DispatchStatus;
  isReceived: boolean;
  receivedDateTime?: Date;
  notes?: string;
}

const stockDispatchSchema = new Schema<IStockDispatch>({
  asoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  asoName: { type: String, required: true },
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerName: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  productCode: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  dispatchDateTime: { type: Date, required: true },
  dayNumber: { type: Number, required: true },
  status: { type: String, enum: Object.values(DispatchStatus), default: DispatchStatus.PENDING },
  isReceived: { type: Boolean, default: false },
  receivedDateTime: { type: Date },
  notes: { type: String }
}, { timestamps: true });

stockDispatchSchema.index({ asoId: 1, dispatchDateTime: -1 });
stockDispatchSchema.index({ dealerId: 1, dispatchDateTime: -1 });
stockDispatchSchema.index({ isReceived: 1 });

export const StockDispatch = mongoose.model<IStockDispatch>("StockDispatch", stockDispatchSchema);
export default StockDispatch;
