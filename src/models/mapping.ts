import mongoose, { Schema, Document } from "mongoose";

export interface IASODMapping extends Document {
  fromId: mongoose.Types.ObjectId;
  toId: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  deactivatedBy?: mongoose.Types.ObjectId;
  deactivatedAt?: Date;
}

const mappingSchema = new Schema<IASODMapping>(
  {
    fromId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toId: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deactivatedAt: { type: Date },
  },
  { timestamps: true },
);

export const ASODMapping = mongoose.model<IASODMapping>(
  "mapping",
  mappingSchema,
);
export default ASODMapping;
