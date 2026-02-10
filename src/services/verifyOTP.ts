import { OtpModel } from "../models/Otp";
import User, { UserRole } from "../models/User";
import { generateToken } from "./authService";
import { MAX_OTP_ATTEMPTS, createPhoneKey, getUserRoleByPhone } from "./sendOTP";

interface VerifyOTPResult {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: Date;
  userId?: string;
  isNewUser?: boolean;
  user?: {
    _id: any;
    countryCode: string;
    phoneNo: number;
    role: string;
    name: string;
  };
  remainingAttempts?: number;
}

// Verify OTP and Login
export const verifyOtpAndLogin = async (
  countryCode: string,
  rawPhoneNo: string,
  otp: string
): Promise<VerifyOTPResult> => {
  // Validation
  if (!countryCode || !rawPhoneNo || !otp) {
    throw new Error("Country code, phone number, and OTP are required");
  }

  const phoneNo = rawPhoneNo.trim();
  const cleanCountryCode = countryCode.trim();
  const cleanOtp = otp.trim();

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

  // Fetch OTP
  const otpData = await OtpModel.findOne({ phoneKey });

  if (!otpData) {
    throw new Error("OTP not found or expired. Please request a new OTP.");
  }

  // Check expiry
  if (Date.now() > otpData.expiresAt.getTime()) {
    await OtpModel.deleteOne({ phoneKey });
    throw new Error("OTP expired. Please request a new OTP.");
  }

  // Check attempt limit
  if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
    await OtpModel.deleteOne({ phoneKey });
    throw new Error("Too many failed attempts. Please request a new OTP.");
  }

  // Verify OTP
  if (otpData.otp !== cleanOtp) {
    otpData.attempts += 1;
    await otpData.save();

    return {
      success: false,
      message: "Invalid OTP",
      remainingAttempts: Math.max(MAX_OTP_ATTEMPTS - otpData.attempts, 0),
    };
  }

  // OTP Success - Delete OTP
  await OtpModel.deleteOne({ phoneKey });

  const now = new Date();

  // Find or Create User
  let user = await User.findOne({
    phoneNo: phoneNumber,
    countryCode: cleanCountryCode,
    isDeleted: { $ne: true },
  });

  let isNewUser = false;

  if (!user) {
    // Create new user with assigned role
    user = await new User({
      countryCode: cleanCountryCode,
      phoneNo: phoneNumber,
      role: roleInfo.role as UserRole,
      name: roleInfo.name || "User",
      lastOTPValidated: now,
      createdAt: now,
      updatedAt: now,
    }).save();
    isNewUser = true;
  } else {
    // Update last OTP validation
    user.lastOTPValidated = now;
    user.updatedAt = now;
    await user.save();
  }

  // Generate JWT Token
  const tokenData = generateToken(user);

  // Response
  return {
    success: true,
    message: isNewUser
      ? "User registered and logged in successfully"
      : "Logged in successfully",
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
    userId: user._id.toString(),
    isNewUser,
    user: {
      _id: user._id,
      countryCode: user.countryCode,
      phoneNo: user.phoneNo,
      role: user.role,
      name: user.name,
    },
  };
};

// Get welcome message based on role
export const getWelcomeMessage = (role: string): string => {
  const messages: Record<string, string> = {
    SA: "Welcome, Super Admin!",
    ASO: "Welcome, ASO!",
    DLR: "Welcome, Dealer!",
    BBR: "Welcome, Barbender!",
  };
  return messages[role] || "Welcome!";
};
