import crypto from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { env } from "../../config/env.js";
import { ForbiddenError } from "../errors/AppError.js";

const COOKIE_NAME = "csrfToken";
const HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const secret = env.CSRF_SECRET ?? env.COOKIE_SECRET;

const sign = (nonce: string) => crypto.createHmac("sha256", secret).update(nonce).digest("base64url");
const createToken = () => {
  const nonce = crypto.randomBytes(32).toString("base64url");
  return `${nonce}.${sign(nonce)}`;
};

const isValidToken = (token: unknown): token is string => {
  if (typeof token !== "string") return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;
  const expected = sign(nonce);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
};

const cookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

export const issueCsrfToken: RequestHandler = (req: Request, res: Response) => {
  const current = req.cookies?.[COOKIE_NAME];
  const token = isValidToken(current) ? current : createToken();
  if (token !== current) res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(200).json({ success: true, data: { csrfToken: token } });
};

/**
 * Protects requests authenticated by cookies using a signed double-submit token.
 * Bearer-token clients are not exposed to browser cookie CSRF and do not need it.
 */
export const csrfProtection: RequestHandler = (req, res, next) => {
  const current = req.cookies?.[COOKIE_NAME];
  if (!isValidToken(current)) res.cookie(COOKIE_NAME, createToken(), cookieOptions);

  if (SAFE_METHODS.has(req.method)) return next();

  const usesCookieAuth = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  if (!usesCookieAuth) return next();

  const headerToken = req.get(HEADER_NAME);
  const currentBuffer = typeof current === "string" ? Buffer.from(current) : Buffer.alloc(0);
  const headerBuffer = headerToken ? Buffer.from(headerToken) : Buffer.alloc(0);
  if (!isValidToken(current) || !headerToken || currentBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(currentBuffer, headerBuffer)) {
    return next(new ForbiddenError("A valid CSRF token is required for cookie-authenticated requests"));
  }

  return next();
};
