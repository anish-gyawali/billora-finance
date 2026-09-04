import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
  },
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected PostgreSQL connection pool error");
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [{ emit: "event", level: "error" }],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseHealthStatus {
  status: "connected" | "disconnected";
  latencyMs?: number;
  timestamp: string;
  error?: string;
}

/**
 * Tests live connection to Supabase database.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1;`;
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      status: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error }, "Database connection health check failed");
    return {
      status: "disconnected",
      timestamp: new Date().toISOString(),
      error: message,
    };
  }
}

/**
 * Closes the Prisma client and PostgreSQL pool cleanly during shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
    logger.info("Database connection pool closed");
  } catch (error) {
    logger.error({ error }, "Error during database pool shutdown");
  }
}

export default prisma;
