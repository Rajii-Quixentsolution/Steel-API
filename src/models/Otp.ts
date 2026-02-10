import mongoose, { Schema, Document } from "mongoose";

export interface IOtp extends Document {
  phoneKey: string;
  countryCode: string;
  phoneNo: string;
  otp: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
}

const otpSchema = new Schema<IOtp>({
  phoneKey: { type: String, required: true, unique: true, index: true },
  countryCode: { type: String, required: true },
  phoneNo: { type: String, required: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// TTL index - Auto-delete after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = mongoose.model<IOtp>("Otp", otpSchema);
