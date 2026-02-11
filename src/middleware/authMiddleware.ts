import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "steel-project-secret-key-2024";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    phoneNo: number;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    
    const decoded = jwt.verify(token, JWT_SECRET) as {
      _id: string;
      role: string;
      phoneNo: number;
    };

    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const verifyToken = (token: string): { _id: string; role: string; phoneNo: number } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { _id: string; role: string; phoneNo: number };
  } catch {
    return null;
  }
};

export const generateToken = (user: { _id: string; role: string; phoneNo: number }): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
};

export default authMiddleware;
