import type { ParsedImportGame } from "./importExport";

export interface SteamSyncResult {
  ok: boolean;
  games?: ParsedImportGame[];
  error?: string;
}

export async function syncSteamLibrary(apiKey: string, steamId: string): Promise<SteamSyncResult> {
  try {
    const res = await fetch("/api/steam/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, steamId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Steam sync failed." };
    return { ok: true, games: data.games };
  } catch {
    return { ok: false, error: "Could not reach local backend." };
  }
}
