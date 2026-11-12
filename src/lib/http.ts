import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { InsufficientCoinsError } from "./coins";
import { checkRateLimit } from "./rate-limit";
import { getApiUser } from "./session";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type User = NonNullable<Awaited<ReturnType<typeof getApiUser>>>;

/**
 * Shared guard for generation endpoints: auth, rate limit, body validation,
 * and a consistent error shape (402 when coins run out).
 */
export async function withGenerationGuard<T>(
  request: Request,
  schema: ZodType<T>,
  handler: (user: User, input: T) => Promise<Response>,
) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");

  const limit = checkRateLimit(user.id);
  if (!limit.ok) return jsonError(429, `Too many requests. Try again in ${limit.retryAfter}s.`);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    return await handler(user, parsed.data);
  } catch (err) {
    if (err instanceof InsufficientCoinsError) {
      return jsonError(402, "Not enough coins", { needed: err.needed, balance: err.balance });
    }
    console.error(err);
    return jsonError(500, err instanceof Error ? err.message : "Something went wrong");
  }
}
