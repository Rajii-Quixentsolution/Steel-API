import mongoose, { Schema, Document } from "mongoose";

export interface IDailyStock extends Document {
  dealerId: mongoose.Types.ObjectId;
  date: Date;
  sequentialDay: number;
  totalReceivedKg: number;
  totalDispatchedKg: number;
  availableBalanceKg: number;
}

const dailyStockSchema = new Schema<IDailyStock>({
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  sequentialDay: { type: Number, required: true, default: 0 },
  totalReceivedKg: { type: Number, default: 0 },
  totalDispatchedKg: { type: Number, default: 0 },
  availableBalanceKg: { type: Number, default: 0 }
}, { timestamps: true });

dailyStockSchema.index({ dealerId: 1, date: 1 }, { unique: true });

export default mongoose.model<IDailyStock>("DailyStock", dailyStockSchema);
