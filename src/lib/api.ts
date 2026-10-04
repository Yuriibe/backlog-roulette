import type { Challenge, ChallengeFocus, Game } from "../types";

export interface GenerateChallengesRequest {
  game: Pick<Game, "title" | "genre" | "playtime" | "estimatedHours" | "previouslyPlayed" | "playedHours" | "notes">;
  challengeFocus?: ChallengeFocus;
}

export interface ClaudeStatus {
  available: boolean;
  reason?: string;
}

export async function getClaudeStatus(): Promise<ClaudeStatus> {
  try {
    const res = await fetch("/api/claude/status");
    if (!res.ok) return { available: false, reason: "Backend not reachable" };
    return await res.json();
  } catch {
    return { available: false, reason: "Backend not reachable" };
  }
}

export async function getPromptPreview(req: GenerateChallengesRequest): Promise<string> {
  const res = await fetch("/api/challenges/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  return data.prompt as string;
}

export interface GenerateChallengesResult {
  ok: boolean;
  challenges?: Challenge[];
  error?: string;
}

export async function generateChallenges(req: GenerateChallengesRequest): Promise<GenerateChallengesResult> {
  try {
    const res = await fetch("/api/challenges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Generation failed" };
    return { ok: true, challenges: data.challenges };
  } catch (e) {
    return { ok: false, error: "Could not reach local backend." };
  }
}

/** Client-side validation for challenges pasted back in manually (fallback path). */
export function validateChallenges(raw: unknown): Challenge[] | null {
  if (!Array.isArray(raw)) return null;
  const styles = new Set(["creative", "exploration", "wildcard"]);
  const out: Challenge[] = [];
  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.name !== "string" ||
      typeof item.description !== "string" ||
      typeof item.primaryObjective !== "string" ||
      !Array.isArray(item.bonusObjectives) ||
      typeof item.whyFun !== "string"
    ) {
      return null;
    }
    const style = styles.has(item.style) ? item.style : "creative";
    out.push({
      id: crypto.randomUUID(),
      style,
      name: item.name,
      description: item.description,
      primaryObjective: item.primaryObjective,
      bonusObjectives: item.bonusObjectives.filter((b: unknown) => typeof b === "string"),
      whyFun: item.whyFun,
      effortEstimate: typeof item.effortEstimate === "string" ? item.effortEstimate : undefined,
    });
  }
  // The UI always renders a 3-up grid of Creative/Exploration/Wildcard — accepting
  // a short array here would just produce a broken-looking partial layout.
  return out.length === 3 ? out : null;
}
