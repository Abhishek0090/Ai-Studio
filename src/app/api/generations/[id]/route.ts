import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { getBalance } from "@/lib/coins";
import { getOwnGeneration, toDTO } from "@/lib/generations";
import { jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";

/** Poll a job. Finalizes simulated renders whose time has come. */
export async function GET(request: Request, ctx: RouteContext<"/api/generations/[id]">) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const { id } = await ctx.params;
  const row = await getOwnGeneration(user.id, id);
  if (!row) return jsonError(404, "Not found");
  return NextResponse.json({ generation: toDTO(row), balance: await getBalance(user.id) });
}

const Patch = z.object({ isPublic: z.boolean() });

/** Turn the public share link on or off. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/generations/[id]">) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid input");
  const [row] = await db
    .update(generation)
    .set({ isPublic: parsed.data.isPublic, updatedAt: new Date() })
    .where(and(eq(generation.id, id), eq(generation.userId, user.id), eq(generation.status, "succeeded")))
    .returning();
  if (!row) return jsonError(404, "Not found");
  return NextResponse.json({ generation: toDTO(row) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/generations/[id]">) {
  const user = await getApiUser(request);
  if (!user) return jsonError(401, "Please sign in");
  const { id } = await ctx.params;
  const deleted = await db
    .delete(generation)
    .where(and(eq(generation.id, id), eq(generation.userId, user.id)))
    .returning({ id: generation.id });
  if (!deleted.length) return jsonError(404, "Not found");
  return NextResponse.json({ ok: true });
}
