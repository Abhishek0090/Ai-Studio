import { z } from "zod";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { streamChat, isGeminiConfigured } from "@/lib/ai/gemini";
import { spend } from "@/lib/coins";
import { failGeneration } from "@/lib/generations";
import { withGenerationGuard } from "@/lib/http";
import { COSTS } from "@/lib/pricing";
import { eq } from "drizzle-orm";

const Input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .min(1)
    .max(30),
});

const SYSTEM = `You are a senior software engineer inside a code generation app.
Answer with working, complete code in fenced code blocks with a language tag.
When the user asks for a web page, UI or demo, return ONE self-contained \`\`\`html block (inline CSS and JS, no external build step) so it can be previewed.
Keep prose short: one or two sentences before the code and a short list of notes after it if needed.`;

export async function POST(request: Request) {
  return withGenerationGuard(request, Input, async (user, input) => {
    const last = input.messages.at(-1)!;
    if (last.role !== "user" || !last.content.trim()) {
      return Response.json({ error: "Send a message first" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(generation)
      .values({
        id,
        userId: user.id,
        tool: "code",
        prompt: last.content.slice(0, 2000),
        status: "processing",
        cost: COSTS.code,
        provider: isGeminiConfigured() ? "gemini" : "mock",
      })
      .returning();
    try {
      await spend({ userId: user.id, amount: COSTS.code, jobId: id, description: "Code gen message" });
    } catch (err) {
      await db.delete(generation).where(eq(generation.id, id));
      throw err;
    }

    const encoder = new TextEncoder();
    let answer = "";
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamChat(SYSTEM, input.messages)) {
            answer += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          await db
            .update(generation)
            .set({ status: "succeeded", outputText: answer, updatedAt: new Date() })
            .where(eq(generation.id, id));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Code generation failed";
          await failGeneration(row, message);
          controller.enqueue(encoder.encode(`\n\n**Error:** ${message}. Your coin was refunded.`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-generation-id": id,
      },
    });
  });
}
