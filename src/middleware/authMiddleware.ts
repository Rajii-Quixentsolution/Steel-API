import { Request, Response, NextFunction } from "express";
import { verifyAuthToken, generateToken } from "../services/authService";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    phoneNo: number;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    const result = await verifyAuthToken(token);
    
    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    req.user = {
      _id: result.user._id.toString(),
      role: result.user.role,
      phoneNo: result.user.phoneNo
    };
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const verifyToken = async (token: string): Promise<{ _id: string; role: string; phoneNo: number } | null> => {
  const result = await verifyAuthToken(token);
  if (!result.success) return null;
  return {
    _id: result.user._id.toString(),
    role: result.user.role,
    phoneNo: result.user.phoneNo
  };
};

export { generateToken };

export default authMiddleware;
