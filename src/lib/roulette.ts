import type { Game, RouletteFilters } from "../types";

export function getEligibleGames(games: Game[], filters: RouletteFilters): Game[] {
  return games.filter((g) => {
    if (g.status !== "backlog") return false;
    if (filters.playtime !== "any" && g.playtime !== filters.playtime) return false;
    if (filters.genre !== "any" && g.genre !== filters.genre) return false;
    if (filters.played === "never" && g.previouslyPlayed) return false;
    if (filters.played === "previously" && !g.previouslyPlayed) return false;
    if (filters.tag !== "any" && !(g.tags ?? []).includes(filters.tag)) return false;
    return true;
  });
}

export function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
}

export function uniqueGenres(games: Game[]): string[] {
  const set = new Set<string>();
  for (const g of games) {
    if (g.genre) set.add(g.genre);
  }
  return Array.from(set).sort();
}

export function uniqueTags(games: Game[]): string[] {
  const set = new Set<string>();
  for (const g of games) {
    for (const t of g.tags ?? []) set.add(t);
  }
  return Array.from(set).sort();
}

export type BacklogSort =
  | "added-desc"
  | "added-asc"
  | "title-asc"
  | "title-desc"
  | "playedHours-desc"
  | "playedHours-asc"
  | "estimatedHours-desc"
  | "estimatedHours-asc";

export const BACKLOG_SORT_OPTIONS: { value: BacklogSort; label: string }[] = [
  { value: "added-desc", label: "Recently added" },
  { value: "added-asc", label: "Oldest added" },
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
  { value: "playedHours-desc", label: "Most played" },
  { value: "playedHours-asc", label: "Least played" },
  { value: "estimatedHours-desc", label: "Longest to beat" },
  { value: "estimatedHours-asc", label: "Shortest to beat" },
];

/** Numeric fields are nullable (not every game has an estimate/played hours) — games missing the field always sort last, regardless of direction. */
function compareNullableNumbers(a: number | undefined, b: number | undefined, mult: 1 | -1): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return (a - b) * mult;
}

export function sortGames(games: Game[], sort: BacklogSort): Game[] {
  const [key, dir] = sort.split("-") as [string, "asc" | "desc"];
  const mult = dir === "asc" ? 1 : -1;
  return [...games].sort((a, b) => {
    switch (key) {
      case "added":
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mult;
      case "title":
        return a.title.localeCompare(b.title) * mult;
      case "playedHours":
        return compareNullableNumbers(a.playedHours, b.playedHours, mult);
      case "estimatedHours":
        return compareNullableNumbers(a.estimatedHours, b.estimatedHours, mult);
      default:
        return 0;
    }
  });
}
