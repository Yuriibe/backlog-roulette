import type { Game, PlaytimeBucket, Run, Settings } from "../types";

export interface ParsedImportGame {
  title: string;
  genre?: string;
  estimatedHours?: number;
  playtime?: PlaytimeBucket;
  previouslyPlayed: boolean;
  playedHours?: number;
  coverUrl?: string;
  tags?: string[];
}

function bucketFromHours(hours: number | undefined): PlaytimeBucket | undefined {
  if (hours === undefined || Number.isNaN(hours)) return undefined;
  if (hours <= 6) return "short";
  if (hours <= 20) return "medium";
  return "long";
}

/** Parses a Steam-style JSON export: either a raw array, or `{ response: { games: [...] } }`. */
function parseJson(text: string): ParsedImportGame[] {
  const data = JSON.parse(text);
  const rawGames: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.response?.games)
    ? data.response.games
    : Array.isArray(data?.games)
    ? data.games
    : [];

  return rawGames
    .map((g): ParsedImportGame | null => {
      const title = g.title ?? g.name ?? g.Name ?? "";
      if (!title) return null;

      // Hours ALREADY PLAYED (e.g. a Steam export's playtime_forever, in minutes)
      // and an ESTIMATE of how long the game takes to beat are different things —
      // a 2-hour demo of a 70-hour game isn't a 2-hour game. Keep them separate.
      const minutes = g.playtime_forever ?? g.playtimeMinutes ?? undefined;
      const playedHours = typeof minutes === "number" ? Math.round(minutes / 60) || undefined : undefined;
      const estimatedHours =
        typeof g.estimatedHours === "number" ? g.estimatedHours : typeof g.hours === "number" ? g.hours : undefined;

      const coverUrl =
        g.coverUrl ??
        (typeof g.appid === "number"
          ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`
          : undefined);
      return {
        title: String(title).trim(),
        genre: g.genre ?? g.Genre ?? undefined,
        estimatedHours,
        playtime: bucketFromHours(estimatedHours),
        previouslyPlayed: Boolean(playedHours && playedHours > 0),
        playedHours,
        coverUrl,
        tags: Array.isArray(g.tags) ? g.tags.filter((t: unknown) => typeof t === "string") : undefined,
      };
    })
    .filter((g): g is ParsedImportGame => g !== null);
}

/** Parses a CSV with a header row. Recognizes common column name variants (case-insensitive). */
function parseCsv(text: string): ParsedImportGame[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const idxOf = (...names: string[]) => header.findIndex((h) => names.includes(h));

  const titleIdx = idxOf("title", "name", "game");
  const genreIdx = idxOf("genre");
  const hoursIdx = idxOf("estimatedhours", "hours", "playtime (hours)", "playtime_hours");
  const minutesIdx = idxOf("playtime (minutes)", "playtime_forever", "playtime_minutes", "minutes");
  const tagsIdx = idxOf("tags", "tag");

  if (titleIdx === -1) return [];

  const rows: ParsedImportGame[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const title = cells[titleIdx]?.trim();
    if (!title) continue;
    const hoursRaw = hoursIdx !== -1 ? Number(cells[hoursIdx]) : undefined;
    const estimatedHours = hoursRaw !== undefined && !Number.isNaN(hoursRaw) ? hoursRaw : undefined;

    const minutesRaw = minutesIdx !== -1 ? Number(cells[minutesIdx]) : undefined;
    const playedHours =
      minutesRaw !== undefined && !Number.isNaN(minutesRaw) ? Math.round(minutesRaw / 60) : undefined;

    const tags =
      tagsIdx !== -1 && cells[tagsIdx]
        ? cells[tagsIdx].split(/[;,]/).map((t) => t.trim()).filter(Boolean)
        : undefined;

    rows.push({
      title,
      genre: genreIdx !== -1 ? cells[genreIdx] || undefined : undefined,
      estimatedHours,
      playtime: bucketFromHours(estimatedHours),
      previouslyPlayed: Boolean(playedHours && playedHours > 0),
      playedHours,
      tags,
    });
  }
  return rows;
}

export function parseImportFile(fileName: string, text: string): ParsedImportGame[] {
  const isJson = fileName.toLowerCase().endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[");
  if (isJson) {
    try {
      return parseJson(text);
    } catch {
      return [];
    }
  }
  return parseCsv(text);
}

export function toGamePayload(p: ParsedImportGame): Omit<Game, "id" | "createdAt"> {
  return {
    title: p.title,
    genre: p.genre,
    estimatedHours: p.estimatedHours,
    playtime: p.playtime,
    previouslyPlayed: p.previouslyPlayed,
    playedHours: p.playedHours,
    coverUrl: p.coverUrl,
    tags: p.tags,
    status: "backlog",
    source: "import",
  };
}

export interface FullExport {
  version: 1;
  exportedAt: string;
  games: Game[];
  runs: Run[];
  settings: Settings;
}

export function buildFullExport(games: Game[], runs: Run[], settings: Settings): FullExport {
  return { version: 1, exportedAt: new Date().toISOString(), games, runs, settings };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
