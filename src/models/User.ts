import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SA",
  ASO = "ASO",
  DEALER = "DLR",
  BARBENDER = "BBR"
}

export enum UserStatus {
  PENDING = "pending",
  ACTIVE = "active",
  BLOCKED = "blocked",
  DELETED = "deleted"
}

export interface IUser extends Document {
  name: string;
  email?: string;
  countryCode: string;
  phoneNo: number;
  role: UserRole;
  status: UserStatus;
  profilePhoto?: string;
  assignedASO?: mongoose.Types.ObjectId;      // For Dealer: assigned to ONE ASO
  mappedDealers: mongoose.Types.ObjectId[];   // For ASO: has MANY dealers
  assignedDealer?: mongoose.Types.ObjectId;   // For Barbender: assigned to ONE Dealer
  createdByDealer?: mongoose.Types.ObjectId;
  totalQuantityAvailable: number;
  totalRewardEligible: number;
  lastOTPValidated?: Date;
  deviceToken?: string;
  fcmToken?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String },
  countryCode: { type: String, required: true },
  phoneNo: { type: Number, required: true, unique: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING },
  profilePhoto: { type: String },
  assignedASO: { type: Schema.Types.ObjectId, ref: "User" },
  mappedDealers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  assignedDealer: { type: Schema.Types.ObjectId, ref: "User" },
  createdByDealer: { type: Schema.Types.ObjectId, ref: "User" },
  totalQuantityAvailable: { type: Number, default: 0 },
  totalRewardEligible: { type: Number, default: 0 },
  lastOTPValidated: { type: Date },
  deviceToken: { type: String },
  fcmToken: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index({ phoneNo: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ assignedASO: 1 });
userSchema.index({ mappedDealers: 1 });
userSchema.index({ assignedDealer: 1 });
userSchema.index({ createdByDealer: 1 });

export default mongoose.model<IUser>("User", userSchema);
