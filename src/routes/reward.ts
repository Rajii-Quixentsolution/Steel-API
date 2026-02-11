import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import BarbenderSale from "../models/BarbenderSale";
import Reward, { RewardStatus, RewardUserRole } from "../models/Reward";

const router = Router();

// Reward configuration: Every 100kg = 5kg reward (5%)
const REWARD_THRESHOLD_KG = 100;
const REWARD_RATE = 0.05;

// Get current month period
const getCurrentPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { periodStart: start, periodEnd: end };
};

// ============================================
// DEALER: Get Reward Summary
// ============================================
router.get("/dealer/reward-summary", async (req: Request, res: Response) => {
  try {
    const dealerId = req.query.dealerId as string;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid dealer" });
    }

    const { periodStart, periodEnd } = getCurrentPeriod();

    const sales = await BarbenderSale.aggregate([
      { $match: { dealerId: new mongoose.Types.ObjectId(dealerId), saleDateTime: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, totalKg: { $sum: "$quantityKg" } } }
    ]);

    const totalKg = sales[0]?.totalKg || 0;
    const eligibleKg = Math.floor(totalKg / REWARD_THRESHOLD_KG) * REWARD_THRESHOLD_KG;
    const rewardKg = Math.floor(eligibleKg * REWARD_RATE);

    res.json({ success: true, period: { start: periodStart, end: periodEnd }, totalKg, eligibleKg, rewardKg, currentBalance: dealer.totalRewardEligible });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Claim Reward
// ============================================
router.post("/dealer/claim-reward", async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.body;
    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) return res.status(403).json({ error: "Invalid dealer" });

    const { periodStart, periodEnd } = getCurrentPeriod();

    const sales = await BarbenderSale.aggregate([
      { $match: { dealerId: new mongoose.Types.ObjectId(dealerId), saleDateTime: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, totalKg: { $sum: "$quantityKg" } } }
    ]);

    const totalKg = sales[0]?.totalKg || 0;
    const eligibleKg = Math.floor(totalKg / REWARD_THRESHOLD_KG) * REWARD_THRESHOLD_KG;
    const rewardKg = Math.floor(eligibleKg * REWARD_RATE);

    if (rewardKg === 0) return res.status(400).json({ error: "No rewards available" });

    const reward = await new Reward({
      userId: dealer._id, userRole: RewardUserRole.DEALER, userName: dealer.name,
      periodStart, periodEnd, totalKg, eligibleKg, rewardKg,
      status: RewardStatus.CLAIMED, claimedAt: new Date()
    }).save();

    dealer.totalRewardEligible += rewardKg;
    await dealer.save();

    res.json({ success: true, message: `Reward of ${rewardKg}kg claimed!`, rewardKg, newBalance: dealer.totalRewardEligible });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get Reward Summary
// ============================================
router.get("/barbender/reward-summary", async (req: Request, res: Response) => {
  try {
    const barbenderId = req.query.barbenderId as string;
    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    const { periodStart, periodEnd } = getCurrentPeriod();

    const purchases = await BarbenderSale.aggregate([
      { $match: { barbenderId: new mongoose.Types.ObjectId(barbenderId), saleDateTime: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, totalKg: { $sum: "$quantityKg" } } }
    ]);

    const totalKg = purchases[0]?.totalKg || 0;
    const eligibleKg = Math.floor(totalKg / REWARD_THRESHOLD_KG) * REWARD_THRESHOLD_KG;
    const rewardKg = Math.floor(eligibleKg * REWARD_RATE);

    res.json({ success: true, period: { start: periodStart, end: periodEnd }, totalKg, eligibleKg, rewardKg, currentBalance: barbender.totalRewardEligible });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Claim Reward
// ============================================
router.post("/barbender/claim-reward", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.body;
    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) return res.status(403).json({ error: "Invalid barbender" });

    const { periodStart, periodEnd } = getCurrentPeriod();

    const purchases = await BarbenderSale.aggregate([
      { $match: { barbenderId: new mongoose.Types.ObjectId(barbenderId), saleDateTime: { $gte: periodStart, $lte: periodEnd } } },
      { $group: { _id: null, totalKg: { $sum: "$quantityKg" } } }
    ]);

    const totalKg = purchases[0]?.totalKg || 0;
    const eligibleKg = Math.floor(totalKg / REWARD_THRESHOLD_KG) * REWARD_THRESHOLD_KG;
    const rewardKg = Math.floor(eligibleKg * REWARD_RATE);

    if (rewardKg === 0) return res.status(400).json({ error: "No rewards available" });

    const reward = await new Reward({
      userId: barbender._id, userRole: RewardUserRole.BARBENDER, userName: barbender.name,
      periodStart, periodEnd, totalKg, eligibleKg, rewardKg,
      status: RewardStatus.CLAIMED, claimedAt: new Date()
    }).save();

    barbender.totalRewardEligible += rewardKg;
    await barbender.save();

    res.json({ success: true, message: `Reward of ${rewardKg}kg claimed!`, rewardKg, newBalance: barbender.totalRewardEligible });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
