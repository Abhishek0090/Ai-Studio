"use client";

import { toast } from "sonner";
import type { GenerationDTO } from "./generations";
import { announceBalance, goTo } from "./utils";

export type { GenerationDTO };

/**
 * POST JSON and handle the common failure cases with a toast. Returns null on
 * failure, so callers only deal with the happy path.
 */
export async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    toast.error("Network error. Check your connection and try again.");
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (typeof data.balance === "number") announceBalance(data.balance);
  if (res.status === 402) {
    toast.error(`Not enough coins. You need ${data.needed} and have ${data.balance}.`, {
      action: { label: "Buy coins", onClick: () => goTo("/dashboard/billing") },
    });
    return null;
  }
  if (!res.ok && res.status !== 502) {
    toast.error(data.error ?? "Something went wrong");
    return null;
  }
  return data as T;
}

/** Polls a background job until it finishes. */
export async function pollGeneration(id: string, onUpdate: (g: GenerationDTO) => void, signal?: AbortSignal) {
  while (!signal?.aborted) {
    await new Promise((r) => setTimeout(r, 2000));
    if (signal?.aborted) return;
    const res = await fetch(`/api/generations/${id}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) continue;
    const data = (await res.json()) as { generation: GenerationDTO; balance: number };
    announceBalance(data.balance);
    onUpdate(data.generation);
    if (data.generation.status !== "processing") return data.generation;
  }
}
