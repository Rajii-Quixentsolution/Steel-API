import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";
import Purchase from "../models/Purchase";

const router = Router();

const getDateTimeString = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}.${minutes}`;
};

// ============================================
// BARBENDER: Add Purchase
// ============================================
router.post("/barbender/purchase", async (req: Request, res: Response) => {
  try {
    const { barbenderId, quantityKg, vendorName, location, notes } = req.body;

    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER || barbender.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: "Invalid or inactive barbender" });
    }
    if (barbender.isDeleted) return res.status(403).json({ error: "Account deleted" });

    const quantity = parseFloat(quantityKg);
    if (quantity <= 0) return res.status(400).json({ error: "Invalid quantity" });

    const now = new Date();
    const purchase = await new Purchase({
      barbenderId: barbender._id,
      barbenderName: barbender.name,
      sourceName: vendorName || "",
      quantityKg: quantity,
      purchaseDate: now,
      purchaseDateTime: getDateTimeString(now),
      notes: notes || ""
    }).save();

    // Update barbender totals
    barbender.totalQuantityAvailable += quantity;
    barbender.totalRewardEligible += quantity;
    await barbender.save();

    res.json({
      success: true,
      message: "Purchase added",
      purchase: {
        id: purchase._id,
        quantityKg: purchase.quantityKg,
        sourceName: purchase.sourceName,
        purchaseDateTime: purchase.purchaseDateTime,
        newBalance: barbender.totalQuantityAvailable,
        rewardEligible: barbender.totalRewardEligible
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get Purchases
// ============================================
router.get("/barbender/purchases", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.query;

    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    const purchases = await Purchase.find({ barbenderId }).sort({ purchaseDate: -1 });
    const totalKg = purchases.reduce((sum, p) => sum + p.quantityKg, 0);

    res.json({
      purchases,
      totalKg,
      rewardEligible: barbender.totalRewardEligible
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BARBENDER: Get Rewards Summary
// ============================================
router.get("/barbender/rewards", async (req: Request, res: Response) => {
  try {
    const { barbenderId } = req.query;

    const barbender = await User.findById(barbenderId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(403).json({ error: "Invalid barbender" });
    }

    const purchases = await Purchase.find({ barbenderId });
    const totalPurchases = purchases.reduce((sum, p) => sum + p.quantityKg, 0);

    res.json({
      totalPurchases,
      rewardEligible: barbender.totalRewardEligible,
      tier: barbender.totalRewardEligible >= 1000 ? "Gold" : barbender.totalRewardEligible >= 500 ? "Silver" : "Bronze"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEALER: Get Barbender Purchases (Optional - for tracking)
// ============================================
router.get("/dealer/barbender-purchases/:barbenderId", async (req: Request, res: Response) => {
  try {
    const { dealerId, barbenderId } = req.query;
    const { barbenderId: bId } = req.params;

    const dealer = await User.findById(dealerId);
    if (!dealer || dealer.role !== UserRole.DEALER) {
      return res.status(403).json({ error: "Invalid dealer" });
    }

    const barbender = await User.findById(bId);
    if (!barbender || barbender.role !== UserRole.BARBENDER) {
      return res.status(404).json({ error: "Barbender not found" });
    }
    if (barbender.createdByDealer?.toString() !== dealerId) {
      return res.status(403).json({ error: "Not your barbender" });
    }

    const purchases = await Purchase.find({ barbenderId: bId }).sort({ purchaseDate: -1 });
    const totalKg = purchases.reduce((sum, p) => sum + p.quantityKg, 0);

    res.json({
      barbender: { name: barbender.name, phoneNo: barbender.phoneNo },
      purchases,
      totalKg,
      rewardEligible: barbender.totalRewardEligible
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
