import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/* ---------- Better Auth tables ---------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------- App tables ---------- */

export type CoinTxType = "purchase" | "spend" | "refund" | "bonus" | "daily";

/**
 * Append-only coin ledger. Balance = SUM(amount). `refId` is an idempotency
 * key (payment id, `spend:<jobId>`, `refund:<jobId>`, `daily:<user>:<date>`),
 * so retried webhooks or double clicks can never credit or debit twice.
 */
export const coinTransaction = sqliteTable(
  "coin_transaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: text("type").$type<CoinTxType>().notNull(),
    description: text("description").notNull(),
    refId: text("ref_id").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("coin_tx_user_idx").on(t.userId, t.createdAt)],
);

export type Tool = "image" | "video" | "shorts" | "code";
export type GenerationStatus = "processing" | "succeeded" | "failed";

export const generation = sqliteTable(
  "generation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tool: text("tool").$type<Tool>().notNull(),
    prompt: text("prompt").notNull(),
    status: text("status").$type<GenerationStatus>().notNull(),
    cost: integer("cost").notNull(),
    provider: text("provider").notNull(),
    /** Stored file name for images, or a remote URL for videos. */
    output: text("output"),
    /** JSON text: code answer, shorts script, etc. */
    outputText: text("output_text"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
    error: text("error"),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    readyAt: integer("ready_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("generation_user_idx").on(t.userId, t.createdAt)],
);

export const paymentOrder = sqliteTable("payment_order", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  packId: text("pack_id").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  coins: integer("coins").notNull(),
  status: text("status").$type<"created" | "paid">().notNull().default("created"),
  provider: text("provider").$type<"razorpay" | "mock">().notNull(),
  createdAt: createdAt(),
});
