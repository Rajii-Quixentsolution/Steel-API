import mongoose, { Schema, Document } from "mongoose";

export interface IASODMapping extends Document {
  asoId: mongoose.Types.ObjectId;
  asoName: string;
  dealerId: mongoose.Types.ObjectId;
  dealerName: string;
  dealerPhoneNo: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const asoDMappingSchema = new Schema<IASODMapping>({
  asoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  asoName: { type: String, required: true },
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerName: { type: String, required: true },
  dealerPhoneNo: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Prevent duplicate mappings
asoDMappingSchema.index({ asoId: 1, dealerId: 1 }, { unique: true });

// Index for finding ASO's dealers
asoDMappingSchema.index({ asoId: 1, isActive: 1 });

// Index for finding dealer's ASO
asoDMappingSchema.index({ dealerId: 1 });

export const ASODMapping = mongoose.model<IASODMapping>("ASODMapping", asoDMappingSchema);
export default ASODMapping;
