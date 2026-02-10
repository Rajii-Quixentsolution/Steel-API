import mongoose, { Schema, Document } from "mongoose";

// User roles enum
export enum UserRole {
  SUPER_ADMIN = "SA",
  ASO = "ASO",
  DEALER = "DLR",
  BARBENDER = "BBR"
}

// Users are seeded in MongoDB - see src/seed/seedUsers.ts
export interface IUser extends Document {
  countryCode: string;
  phoneNo: number;
  role: UserRole;
  name: string;
  lastOTPValidated: Date;
  deviceToken?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const userSchema = new Schema<IUser>({
  countryCode: { type: String, required: true, default: "91" },
  phoneNo: { type: Number, required: true, unique: true },
  role: { 
    type: String, 
    enum: Object.values(UserRole),
    required: true 
  },
  name: { type: String, required: true },
  lastOTPValidated: { type: Date, required: true },
  deviceToken: { type: String, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ role: 1 });

export default mongoose.model<IUser>("User", userSchema);
