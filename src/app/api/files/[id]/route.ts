import { eq } from "drizzle-orm";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { getApiUser } from "@/lib/session";
import { contentTypeFor, readStoredFile } from "@/lib/storage";

/** Serves a generated image to its owner, or to anyone if it is shared. */
export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const row = await db.query.generation.findFirst({ where: eq(generation.id, id) });
  if (!row?.output || row.tool !== "image") return new Response("Not found", { status: 404 });

  if (!row.isPublic) {
    const user = await getApiUser(request);
    if (user?.id !== row.userId) return new Response("Not found", { status: 404 });
  }

  const data = await readStoredFile(row.output);
  if (!data) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const ext = row.output.split(".").pop();
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": contentTypeFor(row.output),
      "cache-control": row.isPublic ? "public, max-age=3600" : "private, max-age=3600",
      "x-content-type-options": "nosniff",
      // SVGs are rendered as images only, never as documents with script.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      ...(download ? { "content-disposition": `attachment; filename="ai-studio-${id.slice(0, 8)}.${ext}"` } : {}),
    },
  });
}
