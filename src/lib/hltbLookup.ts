import type { PlaytimeBucket } from "../types";

export interface HltbLookupResult {
  ok: boolean;
  matchedTitle?: string;
  estimatedHours?: number;
  playtime?: PlaytimeBucket;
  error?: string;
}

export async function lookupGameLength(title: string): Promise<HltbLookupResult> {
  try {
    const res = await fetch("/api/hltb/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "HowLongToBeat lookup failed." };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Could not reach local backend." };
  }
}
