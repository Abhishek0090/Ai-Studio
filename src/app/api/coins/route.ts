import { NextResponse } from "next/server";
import { claimDailyCoins, getBalance, hasClaimedToday } from "@/lib/coins";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const [balance, claimed] = await Promise.all([getBalance(user.id), hasClaimedToday(user.id)]);
  return NextResponse.json({ balance, dailyClaimed: claimed });
}

/** Claim the free daily coins (once per UTC day). */
export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const credited = await claimDailyCoins(user.id);
  if (!credited) return jsonError(409, "Already claimed today. Come back tomorrow.");
  return NextResponse.json({ balance: await getBalance(user.id), dailyClaimed: true });
}
