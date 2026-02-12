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
  qrCode?: string; // Base64 QR code for barbenders
  createdBy?: mongoose.Types.ObjectId;
  assignedASO?: mongoose.Types.ObjectId;
  mappedDealers?: mongoose.Types.ObjectId[];
  totalQuantityAvailable: number;
  totalRewardEligible: number;
  lastOTPValidated?: Date;
  deviceToken?: string;
  fcmToken?: string;
  isDeleted: boolean;
  createdAt: Date; 
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    lowercase: true,
    trim: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  },
  countryCode: { type: String, required: true },
  phoneNo: { type: Number, required: true, unique: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING },
  profilePhoto: { type: String },
  qrCode: { type: String }, // Base64 QR code for barbenders
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  assignedASO: { type: Schema.Types.ObjectId, ref: "User" },
  mappedDealers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  totalQuantityAvailable: { type: Number, default: 0, min: 0 },  
  totalRewardEligible: { type: Number, default: 0, min: 0 },     
  lastOTPValidated: { type: Date },
  deviceToken: { type: String },
  fcmToken: { type: String },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.index({ phoneNo: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ assignedASO: 1 });

export default mongoose.model<IUser>("User", userSchema);
