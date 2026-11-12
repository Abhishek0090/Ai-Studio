"use client";

import { ArrowUp, Check, Code2, Copy, Download, Eye, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Textarea } from "@/components/ui/primitives";
import { cn, goTo } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Part = { type: "text"; text: string } | { type: "code"; lang: string; code: string; open: boolean };

const STARTERS = [
  "A landing page for a chai cafe with a menu and contact form",
  "A Python script that renames photos by the date they were taken",
  "A React hook for debouncing a search input",
  "A to-do app in one HTML file with local storage",
];

/** Splits markdown into prose and fenced code blocks (handles unfinished fences while streaming). */
function parse(md: string): Part[] {
  const parts: Part[] = [];
  const re = /```([\w+-]*)\n([\s\S]*?)(```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    if (m.index > last) parts.push({ type: "text", text: md.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "text", code: m[2], open: m[3] !== "```" });
    last = m.index + m[0].length;
    if (m[3] === "") break;
  }
  if (last < md.length) parts.push({ type: "text", text: md.slice(last) });
  return parts;
}

/** Tiny inline formatter: **bold**, `code`, and line breaks. Escapes everything else. */
function Prose({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {tokens.map((t, i) =>
        t.startsWith("**") && t.endsWith("**") ? (
          <strong key={i}>{t.slice(2, -2)}</strong>
        ) : t.startsWith("`") && t.endsWith("`") ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {t.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{t.replace(/^> /gm, "")}</span>
        ),
      )}
    </p>
  );
}

const EXT: Record<string, string> = { html: "html", javascript: "js", js: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx", python: "py", py: "py", css: "css", json: "json", bash: "sh", sh: "sh", sql: "sql", java: "java", go: "go", rust: "rs" };

function CodeBlock({ lang, code, open }: { lang: string; code: string; open: boolean }) {
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);
  const previewable = lang === "html" && !open;
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-[#0d1117] text-[#e6edf3]">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <span className="px-2 font-mono text-xs text-white/60">{lang}</span>
        <div className="flex-1" />
        {previewable && (
          <div className="mr-1 flex rounded-lg bg-white/5 p-0.5 text-xs">
            {(["code", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 capitalize", tab === t ? "bg-white/15 text-white" : "text-white/60 hover:text-white")}
              >
                {t === "code" ? <Code2 className="size-3" /> : <Eye className="size-3" />}
                {t}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-label="Download code"
          className="grid size-8 cursor-pointer place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => {
            const blob = new Blob([code], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `ai-studio.${EXT[lang] ?? "txt"}`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Download className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Copy code"
          className="grid size-8 cursor-pointer place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      {tab === "code" ? (
        <pre className="max-h-[480px] overflow-auto p-4 font-mono text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      ) : (
        // Sandboxed: scripts run, but with no access to this app's origin, cookies or storage.
        <iframe title="Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={code} className="h-[480px] w-full bg-white" />
      )}
    </div>
  );
}

export function CodeChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/generate/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessages(next.slice(0, -1));
        setInput(content);
        if (res.status === 402) {
          toast.error("Not enough coins", { action: { label: "Buy coins", onClick: () => goTo("/dashboard/billing") } });
        } else toast.error(data.error ?? "Something went wrong");
        return;
      }
      // Balance changed by 1 coin; refresh the badge.
      fetch("/api/coins")
        .then((r) => r.json())
        .then((d) => window.dispatchEvent(new CustomEvent("coins:changed", { detail: d.balance })))
        .catch(() => {});
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Connection lost");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <Card className="flex h-[calc(100dvh-13rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="bg-brand-glow mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 rounded-2xl text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand text-white">
              <Code2 className="size-7" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">What should we build?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ask for a page, script, component or fix. Web pages get a live preview.</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
                    <Sparkles className="size-3.5 text-brand-start" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.content === "" ? (
                      <Loader2 className="mt-1.5 size-4 animate-spin text-muted-foreground" />
                    ) : (
                      parse(m.content).map((p, j) =>
                        p.type === "text" ? <Prose key={j} text={p.text} /> : <CodeBlock key={j} lang={p.lang} code={p.code} open={p.open} />,
                      )
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border bg-card p-3 sm:p-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          {messages.length > 0 && !streaming && (
            <Button type="button" variant="ghost" size="icon" aria-label="New chat" title="New chat" onClick={() => setMessages([])}>
              <RotateCcw />
            </Button>
          )}
          <label htmlFor="code-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="code-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Describe what to build. Shift+Enter for a new line."
            className="max-h-40 min-h-11 flex-1 py-2.5"
          />
          {streaming ? (
            <Button type="button" variant="outline" size="icon" aria-label="Stop" onClick={() => abortRef.current?.abort()}>
              <span className="size-3 rounded-sm bg-foreground" />
            </Button>
          ) : (
            <Button type="submit" variant="brand" size="icon" aria-label="Send" disabled={!input.trim()}>
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
