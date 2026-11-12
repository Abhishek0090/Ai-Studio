import { ImageResponse } from "next/og";

/** PWA icons drawn at request time, so there are no binary assets to keep in sync. */
export async function GET(_request: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: param } = await ctx.params;
  const maskable = param === "maskable";
  const size = maskable ? 512 : Number(param);
  if (![180, 192, 512].includes(size)) return new Response("Not found", { status: 404 });

  // Maskable icons keep the mark inside the central 80% safe zone.
  const mark = Math.round(size * (maskable ? 0.42 : 0.56));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #991b1b 0%, #dc2626 35%, #ea580c 75%, #c2410c 100%)",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
