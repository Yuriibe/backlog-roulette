import { useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "../common/Modal";
import { GameCover } from "../common/GameCover";
import type { Game } from "../../types";

interface ManualPickModalProps {
  games: Game[];
  onPick: (game: Game) => void;
  onClose: () => void;
}

export function ManualPickModal({ games, onPick, onClose }: ManualPickModalProps) {
  const [search, setSearch] = useState("");

  const filtered = games
    .filter((g) => g.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <Modal title="Choose a game manually" onClose={onClose} wide>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search your backlog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No games match "{search}".</p>
      ) : (
        <div className="max-h-96 overflow-y-auto flex flex-col gap-1">
          {filtered.map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g)}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 text-left transition-colors"
            >
              <div className="w-9 h-12 rounded-md overflow-hidden bg-ink-700 shrink-0">
                <GameCover coverUrl={g.coverUrl} title={g.title} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-100 truncate">{g.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {g.genre && <span>{g.genre}</span>}
                  {g.playtime && <span className="capitalize">· {g.playtime}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
