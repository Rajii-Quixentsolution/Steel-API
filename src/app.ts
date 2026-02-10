import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRouter from "./routes/auth";

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

// Test endpoint
app.get("/test", (_req, res) => {
  res.json({
    status: "success",
    message: "Steel API is running",
    timestamp: new Date().toISOString()
  });
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
