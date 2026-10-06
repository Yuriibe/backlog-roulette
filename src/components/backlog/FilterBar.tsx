import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { GameStatus } from "../../types";
import { BACKLOG_SORT_OPTIONS } from "../../lib/roulette";
import type { BacklogSort } from "../../lib/roulette";

export interface BacklogFilters {
  search: string;
  status: GameStatus | "all";
  genre: string | "all";
  playtime: "any" | "short" | "medium" | "long";
  tag: string | "all";
  played: "any" | "never" | "previously";
  hasEstimate: "any" | "missing" | "set";
  sort: BacklogSort;
}

export const DEFAULT_BACKLOG_FILTERS: BacklogFilters = {
  search: "",
  status: "all",
  genre: "all",
  playtime: "any",
  tag: "all",
  played: "any",
  hasEstimate: "any",
  sort: "added-desc",
};

interface FilterBarProps {
  filters: BacklogFilters;
  genres: string[];
  tags: string[];
  onChange: (f: BacklogFilters) => void;
}

const STATUS_TABS: { value: GameStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "backlog", label: "Backlog" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
];

export function FilterBar({ filters, genres, tags, onChange }: FilterBarProps) {
  const [showMore, setShowMore] = useState(false);

  const moreActive = filters.played !== "any" || filters.hasEstimate !== "any";
  const anyActive =
    filters.genre !== "all" ||
    filters.playtime !== "any" ||
    filters.tag !== "all" ||
    moreActive ||
    filters.search.trim() !== "";

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange({ ...filters, status: tab.value })}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filters.status === tab.value ? "bg-accent-600 text-white" : "bg-ink-700 text-slate-300 hover:bg-ink-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by title..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.genre}
          onChange={(e) => onChange({ ...filters, genre: e.target.value })}
        >
          <option value="all">Any genre</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.playtime}
          onChange={(e) => onChange({ ...filters, playtime: e.target.value as BacklogFilters["playtime"] })}
        >
          <option value="any">Any playtime</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
        {tags.length > 0 && (
          <select
            className="input w-auto"
            value={filters.tag}
            onChange={(e) => onChange({ ...filters, tag: e.target.value })}
          >
            <option value="all">Any tag</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <select
          className="input w-auto"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as BacklogSort })}
        >
          {BACKLOG_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>

        <button
          className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            showMore || moreActive
              ? "bg-accent-600/15 border-accent-600/40 text-accent-300"
              : "border-white/10 text-slate-400 hover:bg-white/5"
          }`}
          onClick={() => setShowMore((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          More filters
          {moreActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />}
        </button>

        {anyActive && (
          <button
            className="text-xs text-slate-500 underline hover:text-slate-300"
            onClick={() => onChange(DEFAULT_BACKLOG_FILTERS)}
          >
            <X size={12} className="inline -mt-0.5" /> Clear all
          </button>
        )}
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-3 animate-fade-in">
          <select
            className="input w-auto"
            value={filters.played}
            onChange={(e) => onChange({ ...filters, played: e.target.value as BacklogFilters["played"] })}
          >
            <option value="any">Played or not</option>
            <option value="never">Never played</option>
            <option value="previously">Previously played</option>
          </select>
          <select
            className="input w-auto"
            value={filters.hasEstimate}
            onChange={(e) => onChange({ ...filters, hasEstimate: e.target.value as BacklogFilters["hasEstimate"] })}
          >
            <option value="any">Length estimate: any</option>
            <option value="missing">Missing length estimate</option>
            <option value="set">Has length estimate</option>
          </select>
        </div>
      )}
    </div>
  );
}
