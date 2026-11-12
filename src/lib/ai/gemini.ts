import "server-only";

/**
 * Google Gemini over plain REST (no SDK, so model or SDK churn can't break
 * the build). Text models are on Gemini's free tier; get a key at
 * https://aistudio.google.com/apikey. Without a key, a mock answers instead.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const model = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export type ChatMessage = { role: "user" | "assistant"; content: string };

function body(system: string, messages: ChatMessage[], json = false) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: json ? { responseMimeType: "application/json" } : undefined,
  });
}

async function call(path: string, payload: string) {
  const res = await fetch(`${API}/${model()}:${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: payload,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const reason = res.status === 429 ? "Gemini free-tier limit reached, try again in a minute" : `Gemini error ${res.status}`;
    throw new Error(`${reason}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return res;
}

/** Streams answer text chunk by chunk. */
export async function* streamChat(system: string, messages: ChatMessage[]): AsyncGenerator<string> {
  if (!isGeminiConfigured()) {
    yield* mockStream(messages.at(-1)?.content ?? "");
    return;
  }
  const res = await call("streamGenerateContent?alt=sse", body(system, messages));
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5));
        const parts: { text?: string }[] = json.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) if (p.text) yield p.text;
      } catch {
        // partial or keep-alive line; ignore
      }
    }
  }
}

/** One-shot JSON answer, parsed. */
export async function generateJson<T>(system: string, prompt: string, mock: () => T): Promise<T> {
  if (!isGeminiConfigured()) {
    await new Promise((r) => setTimeout(r, 900));
    return mock();
  }
  const res = await call("generateContent", body(system, [{ role: "user", content: prompt }], true));
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return JSON.parse(text) as T;
}

async function* mockStream(prompt: string) {
  const answer = `> Demo mode: add \`GEMINI_API_KEY\` to \`.env.local\` for real answers (Gemini's free tier).

Here is a small, self-contained example for: **${prompt.slice(0, 80)}**

\`\`\`html
<!doctype html>
<html>
  <body style="font-family: system-ui; display: grid; place-items: center; height: 100vh; margin: 0;
               background: linear-gradient(135deg, #dc2626, #ea580c); color: white;">
    <div style="text-align: center">
      <h1>Hello from AI Studio</h1>
      <button onclick="this.textContent = 'Clicked ' + (++window.n || (window.n = 1)) + 'x'"
              style="font-size: 18px; padding: 12px 20px; border-radius: 12px; border: 0;">
        Click me
      </button>
    </div>
  </body>
</html>
\`\`\`

Open the **Preview** tab to run it.`;
  for (const word of answer.split(/(\s+)/)) {
    await new Promise((r) => setTimeout(r, 12));
    yield word;
  }
}
