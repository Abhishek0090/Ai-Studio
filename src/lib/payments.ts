import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentOrder } from "@/db/schema";
import { credit } from "./coins";
import type { CoinPack } from "./pricing";

/**
 * Razorpay in test mode when keys are set (free, no KYC for test keys).
 * Without keys, outside production, a mock checkout credits coins directly
 * so the purchase flow can be demoed end to end.
 */

export const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const isMockPaymentsAllowed = () =>
  !isRazorpayConfigured() && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true");

function client() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createOrder(userId: string, pack: CoinPack) {
  if (isRazorpayConfigured()) {
    const order = await client().orders.create({
      amount: pack.pricePaise,
      currency: "INR",
      receipt: `coins_${Date.now()}`,
      notes: { userId, packId: pack.id },
    });
    await db.insert(paymentOrder).values({
      id: order.id,
      userId,
      packId: pack.id,
      amountPaise: pack.pricePaise,
      coins: pack.coins,
      provider: "razorpay",
    });
    return { provider: "razorpay" as const, orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID! };
  }
  if (!isMockPaymentsAllowed()) throw new Error("Payments are not configured");
  const id = `mock_${crypto.randomUUID()}`;
  await db.insert(paymentOrder).values({
    id,
    userId,
    packId: pack.id,
    amountPaise: pack.pricePaise,
    coins: pack.coins,
    provider: "mock",
  });
  return { provider: "mock" as const, orderId: id };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Credits a paid order exactly once, keyed by payment id. Both the checkout
 * callback and the webhook call this; whichever lands second is a no-op.
 */
export async function fulfillOrder(orderId: string, paymentId: string) {
  const order = await db.query.paymentOrder.findFirst({ where: eq(paymentOrder.id, orderId) });
  if (!order) return { ok: false as const, reason: "Unknown order" };
  const credited = await credit({
    userId: order.userId,
    amount: order.coins,
    type: "purchase",
    description: `Bought ${order.packId} pack`,
    refId: `payment:${paymentId}`,
  });
  if (order.status !== "paid") {
    await db.update(paymentOrder).set({ status: "paid" }).where(eq(paymentOrder.id, orderId));
  }
  return { ok: true as const, credited, userId: order.userId, coins: order.coins };
}
