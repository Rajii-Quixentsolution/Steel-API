import mongoose, { Schema, Document } from "mongoose";

export enum CompanyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ICompany extends Document {
  name: string;
  email: string;
  gstNumber: string;
  logo?: string; // S3 URL
  companyAdminPhone: string; // Separate phone for company admin login
  status: CompanyStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    gstNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      length: 15 // GST number format
    },
    logo: {
      type: String,
      trim: true
    },
    companyAdminPhone: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    status: {
      type: String,
      enum: Object.values(CompanyStatus),
      default: CompanyStatus.ACTIVE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true },
);

export default mongoose.model<ICompany>("Company", companySchema);