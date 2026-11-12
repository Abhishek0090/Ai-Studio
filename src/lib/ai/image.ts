import "server-only";

/**
 * Image generation. Uses Cloudflare Workers AI (FLUX.1 schnell) when keys are
 * set: its free allowance is 10,000 Neurons a day. Without keys, a mock
 * renders a labelled placeholder so the whole flow still works.
 */

export const ASPECTS = {
  "1:1": [1024, 1024],
  "16:9": [1280, 720],
  "9:16": [720, 1280],
  "4:5": [1024, 1280],
} as const;
export type Aspect = keyof typeof ASPECTS;

export const STYLES = {
  none: "",
  photo: "photorealistic, natural light, 35mm photo, high detail",
  anime: "anime illustration, clean line art, vibrant colors",
  "3d": "3D render, soft studio lighting, octane render",
  art: "digital painting, painterly brush strokes, concept art",
  logo: "minimal flat vector logo, simple shapes, white background",
} as const;
export type Style = keyof typeof STYLES;

export const isCloudflareConfigured = () =>
  Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

export type ImageResult = { data: Buffer | string; ext: "jpg" | "svg"; provider: string };

export async function generateImage(opts: { prompt: string; aspect: Aspect; style: Style; seed: number }): Promise<ImageResult> {
  const fullPrompt = [opts.prompt, STYLES[opts.style]].filter(Boolean).join(", ");

  if (!isCloudflareConfigured()) {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1200));
    return { data: mockSvg(opts.prompt, opts.aspect, opts.seed), ext: "svg", provider: "mock" };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt: fullPrompt, steps: 4, seed: opts.seed }),
  });
  if (!res.ok) {
    const reason = res.status === 429 ? "Free daily image limit reached" : `Image provider error ${res.status}`;
    throw new Error(reason);
  }
  const json = (await res.json()) as { result?: { image?: string } };
  const b64 = json.result?.image;
  if (!b64) throw new Error("Image provider returned no image");
  return { data: Buffer.from(b64, "base64"), ext: "jpg", provider: "cloudflare-flux-schnell" };
}

const PALETTES = [
  ["#991b1b", "#ea580c"],
  ["#dc2626", "#f97316"],
  ["#b91c1c", "#f59e0b"],
  ["#c2410c", "#ef4444"],
];

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function mockSvg(prompt: string, aspect: Aspect, seed: number) {
  const [w, h] = ASPECTS[aspect];
  const [a, b] = PALETTES[seed % PALETTES.length];
  const words = prompt.split(/\s+/).slice(0, 24);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length > 28) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  const size = Math.round(w / 22);
  const text = lines
    .slice(0, 6)
    .map((l, i) => `<tspan x="50%" dy="${i === 0 ? 0 : size * 1.3}">${escapeXml(l)}</tspan>`)
    .join("");
  const cx = 20 + (seed % 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<radialGradient id="r" cx="${cx}%" cy="30%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>
<text x="50%" y="${h / 2 - (lines.length * size * 0.6)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size}" font-weight="600" fill="#fff">${text}</text>
<text x="50%" y="${h - size}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(size * 0.55)}" fill="#fff" fill-opacity=".8">Demo image. Add Cloudflare keys for real AI images.</text>
</svg>`;
}
