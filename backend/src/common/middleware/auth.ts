import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError.js";
import { verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.utils.js";
import type { UserRole } from "../../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Authentication Middleware:
 * Extracts access token from HttpOnly cookie or Authorization Bearer header.
 * Verifies JWT signature, expiration, and attaches user payload to req.user.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    // 2. Check Authorization header fallback (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      throw new UnauthorizedError("Authentication token is missing. Please log in.");
    }

    // 3. Verify JWT
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      return next();
    } catch {
      throw new UnauthorizedError("Session expired or invalid token. Please refresh or log in again.");
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Guard:
 * Restricts route access to specified user roles (e.g. founder, accountant).
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Insufficient privileges. Required role(s): ${roles.join(", ")}`
        )
      );
    }

    return next();
  };
};
