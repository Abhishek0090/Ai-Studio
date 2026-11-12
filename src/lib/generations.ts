import "server-only";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { generation, type Tool } from "@/db/schema";
import { refund } from "./coins";
import { renderOutput } from "./ai/video";

export type Generation = typeof generation.$inferSelect;

export type GenerationDTO = {
  id: string;
  tool: Tool;
  prompt: string;
  status: Generation["status"];
  cost: number;
  provider: string;
  url: string | null;
  text: string | null;
  error: string | null;
  isPublic: boolean;
  meta: Record<string, unknown> | null;
  createdAt: number;
};

export function toDTO(g: Generation): GenerationDTO {
  const isFile = g.tool === "image" && g.output;
  return {
    id: g.id,
    tool: g.tool,
    prompt: g.prompt,
    status: g.status,
    cost: g.cost,
    provider: g.provider,
    url: isFile ? `/api/files/${g.id}` : g.output,
    text: g.outputText,
    error: g.error,
    isPublic: g.isPublic,
    meta: g.meta ?? null,
    createdAt: g.createdAt.getTime(),
  };
}

const TOOL_LABEL: Record<Tool, string> = { image: "Image", video: "Video", shorts: "Short", code: "Code" };

export async function failGeneration(g: Pick<Generation, "id" | "userId" | "cost" | "tool">, error: string) {
  await db
    .update(generation)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(generation.id, g.id));
  await refund({
    userId: g.userId,
    amount: g.cost,
    jobId: g.id,
    description: `Refund: ${TOOL_LABEL[g.tool].toLowerCase()} failed`,
  });
}

/**
 * Completes simulated renders whose time has come. Called lazily when a user
 * polls or opens their library, so it works on serverless with no worker.
 */
export async function finalizeDue(userId: string) {
  const due = await db.query.generation.findMany({
    where: and(eq(generation.userId, userId), eq(generation.status, "processing"), lte(generation.readyAt, new Date())),
  });
  for (const g of due) {
    if (g.meta?.willFail) {
      await failGeneration(g, "The renderer failed. Your coins were refunded.");
    } else {
      await db
        .update(generation)
        .set({ status: "succeeded", output: renderOutput(), updatedAt: new Date() })
        .where(eq(generation.id, g.id));
    }
  }
}

export async function getOwnGeneration(userId: string, id: string) {
  await finalizeDue(userId);
  return db.query.generation.findFirst({
    where: and(eq(generation.id, id), eq(generation.userId, userId)),
  });
}

export async function listGenerations(userId: string, opts: { tool?: Tool; limit?: number } = {}) {
  await finalizeDue(userId);
  return db.query.generation.findMany({
    where: opts.tool
      ? and(eq(generation.userId, userId), eq(generation.tool, opts.tool))
      : eq(generation.userId, userId),
    orderBy: [desc(generation.createdAt)],
    limit: opts.limit ?? 60,
  });
}

export function getPublicGeneration(id: string) {
  return db.query.generation.findFirst({
    where: and(eq(generation.id, id), eq(generation.isPublic, true), eq(generation.status, "succeeded")),
  });
}
