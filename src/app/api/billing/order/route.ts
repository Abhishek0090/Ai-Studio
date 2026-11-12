import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { createOrder } from "@/lib/payments";
import { findPack } from "@/lib/pricing";
import { getApiUser } from "@/lib/session";

const Input = z.object({ packId: z.string() });

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const parsed = Input.safeParse(await request.json().catch(() => null));
  const pack = parsed.success ? findPack(parsed.data.packId) : undefined;
  if (!pack) return jsonError(400, "Unknown coin pack");
  try {
    const order = await createOrder(user.id, pack);
    return NextResponse.json({
      ...order,
      amount: pack.pricePaise,
      currency: "INR",
      pack: { id: pack.id, name: pack.name, coins: pack.coins },
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    return jsonError(500, err instanceof Error ? err.message : "Could not create order");
  }
}
