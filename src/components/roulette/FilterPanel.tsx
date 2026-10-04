import type { RouletteFilters } from "../../types";

interface FilterPanelProps {
  filters: RouletteFilters;
  genres: string[];
  tags: string[];
  onChange: (filters: RouletteFilters) => void;
  disabled?: boolean;
}

export function FilterPanel({ filters, genres, tags, onChange, disabled }: FilterPanelProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {tags.length > 0 && (
        <select
          className="input w-auto"
          value={filters.tag}
          disabled={disabled}
          onChange={(e) => onChange({ ...filters, tag: e.target.value })}
        >
          <option value="any">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      <select
        className="input w-auto"
        value={filters.playtime}
        disabled={disabled}
        onChange={(e) => onChange({ ...filters, playtime: e.target.value as RouletteFilters["playtime"] })}
      >
        <option value="any">Any playtime</option>
        <option value="short">Short</option>
        <option value="medium">Medium</option>
        <option value="long">Long</option>
      </select>

      <select
        className="input w-auto"
        value={filters.genre}
        disabled={disabled}
        onChange={(e) => onChange({ ...filters, genre: e.target.value })}
      >
        <option value="any">Any genre</option>
        {genres.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        value={filters.played}
        disabled={disabled}
        onChange={(e) => onChange({ ...filters, played: e.target.value as RouletteFilters["played"] })}
      >
        <option value="any">Played or not</option>
        <option value="never">Never played</option>
        <option value="previously">Previously played</option>
      </select>
    </div>
  );
}
