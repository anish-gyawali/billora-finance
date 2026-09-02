import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { checkDatabaseHealth, disconnectDatabase } from "./lib/prisma.js";

let server: Server | null = null;

async function bootstrap(): Promise<void> {
  try {
    logger.info({ env: env.NODE_ENV, port: env.PORT }, "Initializing Billora Finance Backend");

    // Verify database connectivity
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.status === "connected") {
      logger.info(
        { latencyMs: dbHealth.latencyMs },
        "Database connection established successfully"
      );
    } else {
      logger.warn(
        { error: dbHealth.error },
        "Database health check failed during initialization. Server will start but API endpoints requiring database may fail"
      );
    }

    server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
          healthCheck: `http://localhost:${env.PORT}/api/health`,
        },
        "Server listening for incoming requests"
      );
    });
  } catch (error) {
    logger.fatal({ error }, "Fatal error occurred during server startup");
    process.exit(1);
  }
}

async function handleShutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Graceful shutdown signal received");

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed to new requests");
      await disconnectDatabase();
      logger.info("Graceful shutdown completed");
      process.exit(0);
    });

    // Force exit if graceful shutdown takes longer than 10 seconds
    setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10000).unref();
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
process.on("SIGINT", () => void handleShutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ reason }, "Unhandled Promise Rejection detected");
});

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ error }, "Uncaught Exception detected");
  void handleShutdown("uncaughtException");
});

void bootstrap();
