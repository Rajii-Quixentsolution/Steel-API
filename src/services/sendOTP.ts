import axios from "axios";
import { OtpModel } from "../models/Otp";
import { OtpRateLimitModel } from "../models/OtpRateLimit";
import User, { UserRole } from "../models/User";

// OTP Configuration
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_RATE_LIMIT_MS = 60 * 1000; // 60 seconds
const RATE_LIMIT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_OTP_REQUESTS = 10;

// Generate 6-digit OTP
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create phone key for OTP lookup
export const createPhoneKey = (countryCode: string, phoneNo: string): string => {
  return `${countryCode}-${phoneNo}`;
};

// Validate phone number format
export const validatePhoneNumber = (phoneNo: string): boolean => {
  return /^\d{10,15}$/.test(phoneNo);
};

// Get role by phone number from MongoDB
export const getUserRoleByPhone = async (phoneNo: number): Promise<{ role?: string; name?: string }> => {
  const user = await User.findOne({ phoneNo, isDeleted: { $ne: true } });
  return user ? { role: user.role, name: user.name } : {};
};

// Check if phone number is allowed (exists in MongoDB)
export const isPhoneAllowed = async (phoneNo: number): Promise<boolean> => {
  const user = await User.findOne({ phoneNo, isDeleted: { $ne: true } });
  return !!user;
};

// Send OTP via SMS (Fast2SMS)
export const sendOtpViaSms = async (
  countryCode: string,
  phoneNo: string,
  otp: string
): Promise<boolean> => {
  const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
  const FAST2SMS_URL = process.env.FAST2SMS_URL;

  if (!FAST2SMS_API_KEY || !FAST2SMS_URL || FAST2SMS_API_KEY === "test_api_key") {
    console.log("📱 OTP (test mode):", otp);
    return true; // Return true in test mode
  }

  try {
    const formattedPhone = phoneNo.replace(/^\+?91/, "").trim();

    const payload = {
      route: "dlt",
      sender_id: "STEEL",
      message: "208865", // OTP Template ID
      variables_values: otp,
      flash: 0,
      numbers: formattedPhone,
    };

    const response = await axios.post(FAST2SMS_URL, payload, {
      headers: {
        authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (response.data && response.data.return === true) {
      console.log("✅ OTP sent successfully");
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("❌ OTP SMS error:", error.response?.data || error.message);
    return false;
  }
};

// Send Verification Code (OTP)
export const sendVerificationCode = async (
  countryCode: string,
  rawPhoneNo: string
) => {
  // Validation
  if (!countryCode || !rawPhoneNo) {
    throw new Error("Country code and phone number are required");
  }

  const phoneNo = rawPhoneNo.trim();
  const cleanCountryCode = countryCode.trim();

  if (!validatePhoneNumber(phoneNo)) {
    throw new Error("Invalid phone number format. Must be 10-15 digits.");
  }

  const phoneNumber = parseInt(phoneNo, 10);
  if (isNaN(phoneNumber)) {
    throw new Error("Invalid phone number format");
  }

  // Check if phone is allowed
  const roleInfo = await getUserRoleByPhone(phoneNumber);
  if (!roleInfo.role) {
    throw new Error("Phone number not authorized. Please contact administrator.");
  }

  const phoneKey = createPhoneKey(cleanCountryCode, phoneNo);

  // Check rate limit using separate model
  const rateLimitData = await OtpRateLimitModel.findOne({ phoneKey });
  if (rateLimitData) {
    const timeSinceLastRequest = Date.now() - rateLimitData.lastRequestAt.getTime();
    if (timeSinceLastRequest < OTP_RATE_LIMIT_MS) {
      const waitTime = Math.ceil((OTP_RATE_LIMIT_MS - timeSinceLastRequest) / 1000);
      throw new Error(`Please wait ${waitTime} seconds before requesting another OTP`);
    }
    if (rateLimitData.dailyRequestCount >= MAX_DAILY_OTP_REQUESTS) {
      throw new Error(`Daily OTP limit reached (${MAX_DAILY_OTP_REQUESTS} requests). Try again tomorrow.`);
    }
  }

  // Generate OTP
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const now = new Date();

  // Store OTP in OtpModel
  await OtpModel.findOneAndUpdate(
    { phoneKey },
    {
      phoneKey,
      countryCode: cleanCountryCode,
      phoneNo,
      otp,
      attempts: 0,
      expiresAt: otpExpiresAt,
      createdAt: now,
    },
    { upsert: true, new: true }
  );

  // Update rate limit in separate OtpRateLimitModel
  const rateLimitExpiresAt = new Date(Date.now() + RATE_LIMIT_EXPIRY_MS);
  await OtpRateLimitModel.findOneAndUpdate(
    { phoneKey },
    {
      $set: {
        phoneKey,
        countryCode: cleanCountryCode,
        phoneNo,
        lastRequestAt: now,
        expiresAt: rateLimitExpiresAt,
      },
      $inc: { dailyRequestCount: 1 },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true }
  );

  // Send SMS
  const smsSent = await sendOtpViaSms(cleanCountryCode, phoneNo, otp);

  return {
    message: smsSent ? "OTP sent successfully" : "OTP generated (SMS delivery pending)",
    expiresIn: OTP_EXPIRY_MS / 1000,
    role: roleInfo.role,
    roleName: roleInfo.name,
    smsStatus: smsSent ? "sent" : "pending"
  };
};

export { OTP_EXPIRY_MS, MAX_OTP_ATTEMPTS };
