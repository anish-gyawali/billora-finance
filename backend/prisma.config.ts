import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use DIRECT_URL for migrations/CLI tasks as Supabase transaction pooler (port 6543) does not support advisory locks
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL environment variable is required but was not provided."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: migrationUrl,
  },
});


