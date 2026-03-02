import express, { Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserRole, UserStatus } from "../models/User";

const router = express.Router();

// ============================================
// SUPER ADMIN DASHBOARD - Pending Applications
// Shows counts for last 5 days
// ============================================

// Get dashboard summary with 5-day filter
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { adminId, days = 5 } = req.query;

    // Validate admin
    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can access dashboard" });
    }

    // Calculate date filter (current date - days)
    const daysNum = Number(days) || 5;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // 1. Pending Users (created in last X days with pending status)
    const pendingUsers = await User.find({
      status: UserStatus.PENDING,
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate }
    }).select("name phoneNo role status createdAt");

    const pendingASO = pendingUsers.filter(u => u.role === UserRole.ASO);
    const pendingDealer = pendingUsers.filter(u => u.role === UserRole.DEALER);
    const pendingBarbender = pendingUsers.filter(u => u.role === UserRole.BARBENDER);

    // 2. Unmapped Dealers (created in last X days, not assigned to any ASO)
    const unmappedDealers = await User.find({
      role: UserRole.DEALER,
      assignedASO: null,
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate }
    }).select("name phoneNo role status createdAt");

    // 3. Unmapped ASOs (created in last X days, no mapped dealers)
    const allAsos = await User.find({
      role: UserRole.ASO,
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate }
    }).select("name phoneNo role status createdAt mappedDealers");

    const unmappedASOs = allAsos.filter(aso => !aso.mappedDealers ||aso.mappedDealers.length === 0);

    // 4. Blocked Users (last X days)
    const blockedUsers = await User.find({
      status: UserStatus.BLOCKED,
      isDeleted: false,
      updatedAt: { $gte: startDate, $lte: endDate }
    }).select("name phoneNo role status updatedAt");

    // 5. New Users Summary (last X days)
    const newUsersCount = await User.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // 6. Total Active Users
    const activeUsers = await User.countDocuments({
      status: UserStatus.ACTIVE,
      isDeleted: false
    });

    res.json({
      success: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: daysNum
      },
      pending: {
        total: pendingUsers.length,
        ASO: pendingASO,
        Dealer: pendingDealer,
        Barbender: pendingBarbender
      },
      unmapped: {
        dealers: unmappedDealers,
        dealersCount: unmappedDealers.length,
        ASOs: unmappedASOs,
        ASOsCount: unmappedASOs.length
      },
      blocked: {
        users: blockedUsers,
        count: blockedUsers.length
      },
      summary: {
        newUsersCount,
        activeUsers,
        pendingUsersCount: pendingUsers.length,
        unmappedDealersCount: unmappedDealers.length,
        unmappedASOsCount: unmappedASOs.length
      }
    });
  } catch (error: any) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get simple pending counts only (for badges)
// ============================================

router.get("/counts", async (req: Request, res: Response) => {
  try {
    const { adminId, days = 5 } = req.query;

    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can access dashboard" });
    }

    const daysNum = Number(days) || 5;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    // Count pending users
    const pendingUsersCount = await User.countDocuments({
      status: UserStatus.PENDING,
      isDeleted: false,
      createdAt: { $gte: startDate }
    });

    // Count unmapped dealers
    const unmappedDealersCount = await User.countDocuments({
      role: UserRole.DEALER,
      assignedASO: null,
      isDeleted: false,
      createdAt: { $gte: startDate }
    });

    // Count unmapped ASOs
    const asos = await User.find({
      role: UserRole.ASO,
      isDeleted: false,
      createdAt: { $gte: startDate }
    }).select("mappedDealers");

    const unmappedASOsCount = asos.filter(aso => !aso.mappedDealers ||aso.mappedDealers.length === 0).length;

    res.json({
      success: true,
      period: { days: daysNum, startDate: startDate.toISOString() },
      counts: {
        pendingUsers: pendingUsersCount,
        unmappedDealers: unmappedDealersCount,
        unmappedASOs: unmappedASOsCount,
        totalActionRequired: pendingUsersCount + unmappedDealersCount + unmappedASOsCount
      }
    });
  } catch (error: any) {
    console.error("Dashboard counts error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Get detailed list of pending items
// ============================================

router.get("/pending-details", async (req: Request, res: Response) => {
  try {
    const { adminId, days = 5, type = "all" } = req.query;

    if (!adminId) {
      return res.status(400).json({ error: "adminId is required" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only Super Admin can access dashboard" });
    }

    const daysNum = Number(days) || 5;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const query: any = {
      isDeleted: false,
      createdAt: { $gte: startDate }
    };

    // Filter by type if specified
    if (type === "aso") {
      query.role = UserRole.ASO;
    } else if (type === "dealer") {
      query.role = UserRole.DEALER;
    } else if (type === "barbender") {
      query.role = UserRole.BARBENDER;
    }

    const pendingUsers = await User.find(query)
      .select("name phoneNo email role status createdAt")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      period: { days: daysNum, startDate: startDate.toISOString() },
      type: type,
      users: pendingUsers,
      count: pendingUsers.length
    });
  } catch (error: any) {
    console.error("Pending details error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
