import { Router } from "express";
import * as sendOtpService from "../services/sendOTP";
import * as verifyOtpService from "../services/verifyOTP";
import * as authService from "../services/authService";
import User from "../models/User";
import { getWelcomeMessage } from "../services/verifyOTP";

const r = Router();

// 1. Send OTP
r.post("/send-verification-code", async (req, res) => {
  try {
    const { countryCode, phoneNo } = req.body;
    const result = await sendOtpService.sendVerificationCode(countryCode, phoneNo);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message.includes("wait") || error.message.includes("limit") || error.message.includes("authorized")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes("wait")) {
      return res.status(429).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// 2. Verify OTP and Login
r.post("/verify-code", async (req, res) => {
  try {
    const { countryCode, phoneNo, otp } = req.body;
    const result = await verifyOtpService.verifyOtpAndLogin(countryCode, phoneNo, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Add welcome message
    const welcomeMessage = getWelcomeMessage(result.user?.role || "");

    res.status(200).json({
      ...result,
      welcomeMessage
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Verify Token (Check if user is authenticated)
r.post("/verify-token", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        valid: false,
        message: "No token provided",
      });
    }

    const verificationResult = await authService.verifyAuthToken(token);

    if (!verificationResult.success) {
      return res.status(401).json({
        valid: false,
        message: verificationResult.message,
      });
    }

    const user = verificationResult.user;
    const welcomeMessage = getWelcomeMessage(user.role);

    return res.status(200).json({
      valid: true,
      userId: user._id.toString(),
      user: {
        _id: user._id,
        countryCode: user.countryCode,
        phoneNo: user.phoneNo,
        role: user.role,
        name: user.name,
      },
      welcomeMessage
    });
  } catch (error: any) {
    res.status(500).json({
      valid: false,
      message: "Server error during token verification",
    });
  }
});

// 4. Refresh Token
r.post("/refresh-token", async (req, res) => {
  try {
    const oldToken = req.header("Authorization")?.replace("Bearer ", "");

    if (!oldToken) {
      return res.status(400).json({ message: "Token is required" });
    }

    const refreshResult = await authService.refreshAuthToken(oldToken);

    if (!refreshResult.success) {
      return res.status(401).json({ message: refreshResult.message });
    }

    return res.status(200).json({
      message: "Token refreshed successfully",
      token: refreshResult.token,
      userId: refreshResult.userId,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server error during token refresh" });
  }
});

// 5. Logout
r.post("/logout", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(200).json({ success: true, message: "Already logged out" });
    }

    // Optionally: Add token to blacklist in production
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    res.status(200).json({ success: true, message: "Logged out successfully" });
  }
});

// 6. Get User Profile
r.get("/profile", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const verificationResult = await authService.verifyAuthToken(token);

    if (!verificationResult.success) {
      return res.status(401).json({ message: verificationResult.message });
    }

    const user = verificationResult.user;
    const welcomeMessage = getWelcomeMessage(user.role);

    res.status(200).json({
      user: {
        _id: user._id,
        countryCode: user.countryCode,
        phoneNo: user.phoneNo,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt,
      },
      welcomeMessage
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server error" });
  }
});

export default r;
