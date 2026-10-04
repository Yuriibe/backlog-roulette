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
