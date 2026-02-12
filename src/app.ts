import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRouter from "./routes/auth";
import stockRouter from "./routes/stock";
import stockDispatchRouter from "./routes/stockDispatch";
import barbenderRouter from "./routes/barbender";
import mappingRouter from "./routes/mapping";
import productRouter from "./routes/product";

const app = express();

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));

// JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/v1/auth", authRouter);
app.use("/v1/stock", stockRouter);
app.use("/v1/stock-dispatch", stockDispatchRouter);
app.use("/v1/barbender", barbenderRouter);
app.use("/v1/mapping", mappingRouter);
app.use("/v1/product", productRouter);

// Test endpoint
app.get("/test", (_req, res) => {
  res.json({
    status: "success",
    message: "Steel API is running",
    timestamp: new Date().toISOString()
  });
});

// DEBUG: List all users (no auth)
app.get("/debug-users", async (_req, res) => {
  try {
    const User = require("./models/User").default;
    const asos = await User.find({ role: "ASO" }).select("name phoneNo role status");
    const dealers = await User.find({ role: "DLR" }).select("name phoneNo role status");
    const barbenders = await User.find({ role: "BBR" }).select("name phoneNo role status");
    res.json({ asos, dealers, barbenders });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Debug endpoint to check request
app.post("/debug", (req, res) => {
  console.log("Debug received:", JSON.stringify(req.body, null, 2));
  res.json({ received: req.body });
});

// DEBUG: Get dealer balance
app.get("/debug/dealer-balance", async (req, res) => {
  try {
    const { dealerId } = req.query;
    const User = require("./models/User").default;
    const dealer = await User.findById(dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });
    res.json({ name: dealer.name, totalQuantityAvailable: dealer.totalQuantityAvailable });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: Test delete mapping
app.delete("/debug/delete-mapping", async (req, res) => {
  try {
    const { adminId, dealerId } = req.query;
    const User = require("./models/User").default;
    
    const dealer = await User.findById(dealerId);
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    dealer.assignedASO = undefined;
    await dealer.save();

    res.json({ success: true, message: "Mapping removed (debug)" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Connect to MongoDB and start server
const PORT = Number(process.env.PORT) || 3001;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/steel";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Steel API running on port ${PORT}`);
      console.log(`📱 Allowed Users:`);
      console.log(`   SA (Super Admin): 9999999999`);
      console.log(`   ASO: 8888888888`);
      console.log(`   DLR (Dealer): 7777777777`);
      console.log(`   BBR (Barbender): 6666666666`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

export default app;
