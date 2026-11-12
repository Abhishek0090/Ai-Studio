#!/usr/bin/env node
/**
 * One-command setup for a fresh clone:
 *   npm run setup
 * Creates .env.local with a random auth secret (if missing), creates the
 * data folder, and creates the database tables.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ENV = ".env.local";

if (!existsSync(ENV)) {
  copyFileSync(".env.example", ENV);
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(ENV, readFileSync(ENV, "utf8").replace("replace-with-a-long-random-string", secret));
  console.log(`Created ${ENV} with a fresh BETTER_AUTH_SECRET`);
} else {
  console.log(`${ENV} already exists, leaving it as is`);
}

mkdirSync("data/files", { recursive: true });

console.log("Creating database tables...");
execSync("npx drizzle-kit push --force", { stdio: "inherit" });

console.log(`
Done. Next:
  npm run dev        then open http://localhost:3000

Optional free-tier keys in ${ENV} switch features from demo to live:
  GEMINI_API_KEY                               code gen, shorts scripts
  CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN image gen
  RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET        real test-mode checkout
`);
