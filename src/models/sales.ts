import mongoose, { Schema, Document } from "mongoose";
import { ProductUnit } from "./Product";

export type TransactionType = "aso_to_dealer" | "dealer_to_barbender";
export type DispatchStatus = "pending" | "received";

export interface IBarbenderSale extends Document {
  transactionType: TransactionType;

  // ASO → Dealer fields
  asoId?: mongoose.Types.ObjectId;
  asoName?: string;
  status?: DispatchStatus;
  receivedAt?: Date;

  // Dealer fields (common to both)
  dealerId: mongoose.Types.ObjectId;
  dealerName: string;

  // Barbender fields (only for dealer_to_barbender)
  barbenderId?: mongoose.Types.ObjectId;
  barbenderUserId?: string;
  barbenderName?: string;
  qrCodeId?: string;

  // Product fields (common to both)
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;
  quantityKg: number;
  saleDateTime: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}


const barbenderSaleSchema = new Schema<IBarbenderSale>(
  {
    transactionType: {
      type: String,
      enum: ["aso_to_dealer", "dealer_to_barbender"],
      required: true,
    },

    // ASO → Dealer
    asoId: { type: Schema.Types.ObjectId, ref: "User" },
    asoName: { type: String },
    status: {
      type: String,
      enum: ["pending", "received"],
      default: "pending",
    },
    receivedAt: { type: Date },

    // Dealer (common)
    dealerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dealerName: { type: String, required: true },

    // Barbender (only dealer_to_barbender)
    barbenderId: { type: Schema.Types.ObjectId, ref: "User" },
    barbenderUserId: { type: String },
    barbenderName: { type: String },
    qrCodeId: { type: String },

    // Product (common)
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    productCode: { type: String, required: true },
    quantityKg: { type: Number, required: true },
    saleDateTime: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Indexes for performance
barbenderSaleSchema.index({ transactionType: 1 });
barbenderSaleSchema.index({ dealerId: 1, transactionType: 1 });
barbenderSaleSchema.index({ asoId: 1, transactionType: 1 });
barbenderSaleSchema.index({ status: 1, dealerId: 1 });

export const BarbenderSale = mongoose.model<IBarbenderSale>("BarbenderSale", barbenderSaleSchema);
export default BarbenderSale;