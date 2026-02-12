import mongoose, { Schema, Document } from "mongoose";

export interface IASODMapping extends Document {
  asoId: mongoose.Types.ObjectId;
  dealerId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  deactivatedBy?: mongoose.Types.ObjectId;
  deactivatedAt?: Date;
}

const asoDMappingSchema = new Schema<IASODMapping>({
  asoId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  deactivatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  deactivatedAt: { type: Date }
}, { timestamps: true });

// One dealer can only be mapped to one ASO at a time (active mappings)
asoDMappingSchema.index(
  { dealerId: 1, isActive: 1 }, 
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Prevent duplicate ASO-Dealer pair mappings
asoDMappingSchema.index({ asoId: 1, dealerId: 1 }, { unique: true });

// Query optimization: Find all dealers for an ASO
asoDMappingSchema.index({ asoId: 1, isActive: 1 });

// Query optimization: Find ASO for a dealer
asoDMappingSchema.index({ dealerId: 1 });

export const ASODMapping = mongoose.model<IASODMapping>("ASODMapping", asoDMappingSchema);
export default ASODMapping;