import type { NextFunction, Request, Response } from "express";
import { env } from "../../../config/env.js";
import { passwordService } from "./password.service.js";
import type { ChangePasswordInput } from "./password.validation.js";

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    path: "/",
  };

  res.cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

export class PasswordController {
  change = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await passwordService.change(req.user!.userId, req.body as ChangePasswordInput, {
        ipAddress: req.ip || undefined,
        userAgent: req.get("user-agent") || undefined,
      });
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      res.status(200).json({ success: true, data: { message: "Password changed successfully" } });
    } catch (error) {
      next(error);
    }
  };
}

export const passwordController = new PasswordController();
