export type GameStatus = "backlog" | "active" | "completed" | "abandoned";
export type PlaytimeBucket = "short" | "medium" | "long";

export interface Game {
  id: string;
  title: string;
  coverUrl?: string;
  genre?: string;
  playtime?: PlaytimeBucket;
  /** Estimated hours to BEAT the game (from HowLongToBeat or manual entry) — not hours already played. */
  estimatedHours?: number;
  /** Hours actually played so far, e.g. from Steam. Distinct from estimatedHours on purpose. */
  playedHours?: number;
  status: GameStatus;
  previouslyPlayed: boolean;
  notes?: string;
  tags?: string[];
  isSample?: boolean;
  source?: "manual" | "import";
  createdAt: string;
}

export type ChallengeStyle = "creative" | "exploration" | "wildcard";

export interface Challenge {
  id: string;
  style: ChallengeStyle;
  name: string;
  description: string;
  primaryObjective: string;
  bonusObjectives: string[];
  whyFun: string;
  effortEstimate?: string;
}

export interface RunObjective {
  id: string;
  text: string;
  isBonus: boolean;
  completed: boolean;
}

export type RunStatus = "active" | "paused" | "completed" | "abandoned";

export interface RunCompletion {
  timeSpentHours?: number;
  rating?: number;
  reflection?: string;
  favoriteMoments?: string;
}

export interface Run {
  id: string;
  gameId: string;
  challenge: Challenge;
  objectives: RunObjective[];
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  notes: string;
  abandonReason?: string;
  completion?: RunCompletion;
}

export type ChallengeFocus = "variety" | "longform";

export interface Settings {
  maxRerolls: number;
  steamApiKey?: string;
  steamId?: string;
  challengeFocus: ChallengeFocus;
}

export interface RouletteFilters {
  playtime: PlaytimeBucket | "any";
  genre: string | "any";
  played: "any" | "never" | "previously";
  tag: string | "any";
}

export const DEFAULT_FILTERS: RouletteFilters = {
  playtime: "any",
  genre: "any",
  played: "any",
  tag: "any",
};

export const DEFAULT_SETTINGS: Settings = {
  maxRerolls: 3,
  challengeFocus: "longform",
};
