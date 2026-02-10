import mongoose, { Schema, Document } from "mongoose";

export interface IOtpRateLimit extends Document {
  phoneKey: string;
  countryCode: string;
  phoneNo: string;
  lastRequestAt: Date;
  dailyRequestCount: number;
  expiresAt: Date;
  createdAt: Date;
}

const otpRateLimitSchema = new Schema<IOtpRateLimit>({
  phoneKey: { type: String, required: true, unique: true, index: true },
  countryCode: { type: String, required: true },
  phoneNo: { type: String, required: true },
  lastRequestAt: { type: Date, default: Date.now, required: true },
  dailyRequestCount: { type: Number, default: 0, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index - Auto-delete after 24 hours
otpRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRateLimitModel = mongoose.model<IOtpRateLimit>(
  "OtpRateLimit",
  otpRateLimitSchema
);
