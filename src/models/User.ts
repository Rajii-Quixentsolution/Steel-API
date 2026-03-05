import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SA",
  ASO = "ASO",
  DEALER = "DLR",
  BARBENDER = "BBR",
  COMPANY_ADMIN = "COMPANY_ADMIN",
}

export enum UserStatus {
  PENDING = "pending",
  ACTIVE = "active",
  BLOCKED = "blocked",
  DELETED = "deleted",
}

export interface IUser extends Document {
  name: string;
  email?: string;
  countryCode: string;
  phoneNo: number;
  role: UserRole;
  status: UserStatus;
  profilePhoto?: string;
  qrCode?: string;
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
  updatedBy?: mongoose.Types.ObjectId;
  
  // Company relationships
  companyId?: mongoose.Types.ObjectId; // For ASO (single company - strict rule)
  companyIds?: mongoose.Types.ObjectId[]; // For BBR & Dealer (multiple companies)
  isCompanyAdmin: boolean; // Flag for company admin users
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true },
    phoneNo: { type: Number, required: true, unique: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    role: { type: String, enum: Object.values(UserRole), required: true },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
    },
    profilePhoto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "fs.files",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastOTPValidated: { type: Date },
    deviceToken: { type: String },
    fcmToken: { type: String },

    assignedASO: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mappedDealers: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    
    // Company relationships
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    companyIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    }],
    isCompanyAdmin: {
      type: Boolean,
      default: false,
    },
    
    qrCode: { type: String },
    isDeleted: { type: Boolean, default: false },
    totalQuantityAvailable: { type: Number, default: 0 },
    totalRewardEligible: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", userSchema);