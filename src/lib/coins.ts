import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { coinTransaction, type CoinTxType } from "@/db/schema";
import { FREE_TIER } from "./pricing";

export class InsufficientCoinsError extends Error {
  constructor(
    public needed: number,
    public balance: number,
  ) {
    super(`Not enough coins: need ${needed}, have ${balance}`);
  }
}

type Executor = Pick<typeof db, "select" | "insert">;

async function balanceWith(exec: Executor, userId: string) {
  const [row] = await exec
    .select({ total: sql<number>`coalesce(sum(${coinTransaction.amount}), 0)` })
    .from(coinTransaction)
    .where(eq(coinTransaction.userId, userId));
  return Number(row?.total ?? 0);
}

export function getBalance(userId: string) {
  return balanceWith(db, userId);
}

/**
 * Adds coins once per `refId`. Returns false when that refId was already
 * recorded (retried webhook, double click), so callers can stay idempotent.
 */
export async function credit(opts: {
  userId: string;
  amount: number;
  type: Extract<CoinTxType, "purchase" | "refund" | "bonus" | "daily">;
  description: string;
  refId: string;
}) {
  const inserted = await db
    .insert(coinTransaction)
    .values({ id: crypto.randomUUID(), ...opts })
    .onConflictDoNothing({ target: coinTransaction.refId })
    .returning({ id: coinTransaction.id });
  return inserted.length > 0;
}

/** Debits coins for a job, failing if the balance is too low. */
export async function spend(opts: { userId: string; amount: number; jobId: string; description: string }) {
  await db.transaction(async (tx) => {
    const balance = await balanceWith(tx, opts.userId);
    if (balance < opts.amount) throw new InsufficientCoinsError(opts.amount, balance);
    await tx.insert(coinTransaction).values({
      id: crypto.randomUUID(),
      userId: opts.userId,
      amount: -opts.amount,
      type: "spend",
      description: opts.description,
      refId: `spend:${opts.jobId}`,
    });
  });
}

/** Returns the coins spent on a failed job. Safe to call more than once. */
export function refund(opts: { userId: string; amount: number; jobId: string; description: string }) {
  return credit({
    userId: opts.userId,
    amount: opts.amount,
    type: "refund",
    description: opts.description,
    refId: `refund:${opts.jobId}`,
  });
}

export function grantSignupBonus(userId: string) {
  return credit({
    userId,
    amount: FREE_TIER.signupBonus,
    type: "bonus",
    description: "Welcome bonus",
    refId: `signup:${userId}`,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function claimDailyCoins(userId: string) {
  return credit({
    userId,
    amount: FREE_TIER.dailyCoins,
    type: "daily",
    description: "Daily free coins",
    refId: `daily:${userId}:${todayKey()}`,
  });
}

export async function hasClaimedToday(userId: string) {
  const row = await db.query.coinTransaction.findFirst({
    where: (t, { eq }) => eq(t.refId, `daily:${userId}:${todayKey()}`),
    columns: { id: true },
  });
  return Boolean(row);
}

export function listTransactions(userId: string, limit = 50) {
  return db.query.coinTransaction.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
    orderBy: [desc(coinTransaction.createdAt)],
    limit,
  });
}

export async function spentThisMonth(userId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${coinTransaction.amount}), 0)` })
    .from(coinTransaction)
    .where(
      sql`${coinTransaction.userId} = ${userId} and ${coinTransaction.type} in ('spend','refund') and ${coinTransaction.createdAt} >= ${start.getTime()}`,
    );
  return Math.max(0, -Number(row?.total ?? 0));
}
