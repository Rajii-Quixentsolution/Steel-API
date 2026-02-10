import jwt, { SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";
import User, { IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "steel-project-super-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

interface UserPayload {
  id: string;
}

// Generate JWT Token
export const generateToken = (user: { _id: Types.ObjectId | string }): { token: string; expiresAt: Date } => {
  const payload: UserPayload = { id: user._id.toString() };

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  const token = jwt.sign(payload, JWT_SECRET, options);
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  const expiresAt = new Date(decoded.exp! * 1000);

  return { token, expiresAt };
};

// Verify JWT Token
export const verifyAuthToken = async (
  token: string
): Promise<
  | { success: true; user: IUser; decoded: UserPayload }
  | { success: false; message: string }
> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    return { success: true, user, decoded };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, message: "Token expired" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, message: "Invalid token" };
    }

    return { success: false, message: "Server error verifying token" };
  }
};

// Refresh JWT Token
export const refreshAuthToken = async (oldToken: string) => {
  try {
    const decoded = jwt.verify(oldToken, JWT_SECRET, {
      ignoreExpiration: true,
    }) as UserPayload;

    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const { token: newToken, expiresAt } = generateToken(user);

    return {
      success: true,
      token: newToken,
      userId: user._id.toString(),
      expiresAt,
    };
  } catch {
    return { success: false, message: "Invalid token" };
  }
};
