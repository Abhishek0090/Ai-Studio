import { NextResponse } from "next/server";
import { fulfillOrder, verifyWebhookSignature } from "@/lib/payments";

/**
 * Razorpay webhook: the source of truth for payments. Point it at
 * https://<your-domain>/api/billing/webhook with events payment.captured and
 * order.paid, and set RAZORPAY_WEBHOOK_SECRET to the secret you choose there.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment.id) {
      const result = await fulfillOrder(payment.order_id, payment.id);
      if (!result.ok) console.warn("Webhook for unknown order", payment.order_id);
    }
  }
  // Always 200 for valid signatures so Razorpay stops retrying.
  return NextResponse.json({ ok: true });
}
