import request from "supertest";
import { describe, expect, it } from "vitest";
import { signAccessToken } from "../src/common/auth/jwt.utils.js";
import type { UserRole } from "../src/generated/prisma/enums.js";
import { app } from "../src/app.js";

const userId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000002";
const accessToken = signAccessToken({ userId, role: "accountant" as UserRole });

describe("security boundaries", () => {
  it("issues a CSRF token for browser clients", async () => {
    const response = await request(app).get("/api/auth/csrf");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { csrfToken: expect.any(String) },
    });
    expect(response.headers["set-cookie"]?.some((cookie) => cookie.startsWith("csrfToken="))).toBe(true);
  });

  it("blocks cookie-authenticated state changes without CSRF", async () => {
    const response = await request(app)
      .post("/api/documents")
      .set("Cookie", [`accessToken=${accessToken}`])
      .field("owner_type", "expense")
      .field("owner_id", ownerId);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("allows bearer clients through CSRF and validates the document request", async () => {
    const response = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("owner_type", "expense")
      .field("owner_id", ownerId);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST", message: expect.stringContaining("file") },
    });
  });
});
