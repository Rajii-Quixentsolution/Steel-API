import mongoose, { Schema, Document } from "mongoose";

// Enums
export enum RewardStatus {
  PENDING = "pending",
  CLAIMED = "claimed"
}

export enum RewardUserRole {
  DEALER = "DLR",
  BARBENDER = "BBR"
}

export interface IReward extends Document {
  userId: mongoose.Types.ObjectId;
  userRole: RewardUserRole;
  userName: string;
  periodStart: Date;
  periodEnd: Date;
  totalKg: number;
  eligibleKg: number;
  rewardKg: number;
  status: RewardStatus;
  claimedAt?: Date;
  createdAt: Date;
}

const rewardSchema = new Schema<IReward>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userRole: { 
    type: String, 
    required: true, 
    enum: Object.values(RewardUserRole) 
  },
  userName: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  totalKg: { type: Number, default: 0 },
  eligibleKg: { type: Number, default: 0 },
  rewardKg: { type: Number, default: 0 },
  status: { 
    type: String, 
    default: RewardStatus.PENDING,
    enum: Object.values(RewardStatus) 
  },
  claimedAt: { type: Date }
}, { timestamps: true });

rewardSchema.index({ userId: 1, periodStart: -1 });

export const Reward = mongoose.model<IReward>("Reward", rewardSchema);
export default Reward;
