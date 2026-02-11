import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import User, { UserRole } from "../models/User";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        return res.status(403).json({ 
          error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
          yourRole: user.role
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };
};

export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
export const requireASO = requireRole(UserRole.ASO);
export const requireDealer = requireRole(UserRole.DEALER);
export const requireBarbender = requireRole(UserRole.BARBENDER);
export const requireAdminOrASO = requireRole(UserRole.SUPER_ADMIN, UserRole.ASO);
export const requireDealerOrBarbender = requireRole(UserRole.DEALER, UserRole.BARBENDER);

export default requireRole;
