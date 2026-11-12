import { config } from "dotenv";
config({ path: ".env.local" });

import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/app.db";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: url.startsWith("file:") ? "sqlite" : "turso",
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
