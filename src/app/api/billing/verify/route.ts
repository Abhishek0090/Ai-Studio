import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentOrder } from "@/db/schema";
import { getBalance } from "@/lib/coins";
import { jsonError } from "@/lib/http";
import { fulfillOrder, isMockPaymentsAllowed, verifyCheckoutSignature } from "@/lib/payments";
import { getApiUser } from "@/lib/session";

const Razorpay = z.object({
  provider: z.literal("razorpay"),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});
const Mock = z.object({ provider: z.literal("mock"), orderId: z.string() });
const Input = z.discriminatedUnion("provider", [Razorpay, Mock]);

/**
 * Called by the browser after checkout so coins show up instantly. The
 * webhook credits the same payment too; the ledger's refId makes it count once.
 */
export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid payment payload");
  const input = parsed.data;

  if (input.provider === "razorpay") {
    if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
      return jsonError(400, "Payment signature did not match");
    }
    const result = await fulfillOrder(input.razorpay_order_id, input.razorpay_payment_id);
    if (!result.ok) return jsonError(404, result.reason);
    return NextResponse.json({ balance: await getBalance(user.id), coins: result.coins });
  }

  if (!isMockPaymentsAllowed()) return jsonError(403, "Mock payments are disabled");
  const order = await db.query.paymentOrder.findFirst({ where: eq(paymentOrder.id, input.orderId) });
  if (!order || order.userId !== user.id || order.provider !== "mock") return jsonError(404, "Unknown order");
  const result = await fulfillOrder(order.id, order.id);
  if (!result.ok) return jsonError(404, result.reason);
  return NextResponse.json({ balance: await getBalance(user.id), coins: result.coins });
}
