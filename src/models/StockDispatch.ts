import mongoose, { Schema, Document } from "mongoose";

export enum DispatchStatus {
  PENDING = "pending",
  RECEIVED = "received"
}

export interface IStockDispatch extends Document {
  asoId: mongoose.Types.ObjectId;
  dealerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantityKg: number;
  dispatchDateTime: Date;
  sequentialDay: number;  // Day 1, Day 2, Day 3... (sequential counter from project start)
  status: DispatchStatus;
  receivedDateTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stockDispatchSchema = new Schema<IStockDispatch>({
  asoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantityKg: { type: Number, required: true, min: 0.01 },
  dispatchDateTime: { type: Date, required: true },
  sequentialDay: { type: Number, required: true },
  status: { type: String, enum: Object.values(DispatchStatus), default: DispatchStatus.PENDING },
  receivedDateTime: { type: Date }
}, { timestamps: true });

stockDispatchSchema.index({ dealerId: 1, status: 1 });
stockDispatchSchema.index({ asoId: 1 });
stockDispatchSchema.index({ dealerId: 1, sequentialDay: 1 });

export default mongoose.model<IStockDispatch>("StockDispatch", stockDispatchSchema);
