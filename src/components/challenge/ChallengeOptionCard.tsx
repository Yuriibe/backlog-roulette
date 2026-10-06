import { Compass, Gamepad2, Pencil, Shuffle, Sparkles } from "lucide-react";
import type { Challenge, ChallengeStyle } from "../../types";

const STYLE_META: Record<ChallengeStyle, { label: string; icon: typeof Sparkles; color: string }> = {
  creative: { label: "Creative", icon: Sparkles, color: "text-amber-300 bg-amber-500/15" },
  exploration: { label: "Exploration", icon: Compass, color: "text-emerald-300 bg-emerald-500/15" },
  wildcard: { label: "Wildcard", icon: Shuffle, color: "text-fuchsia-300 bg-fuchsia-500/15" },
  freeplay: { label: "Free play", icon: Gamepad2, color: "text-slate-300 bg-slate-500/15" },
};

interface ChallengeOptionCardProps {
  challenge: Challenge;
  onChoose: () => void;
  onEdit: () => void;
}

export function ChallengeOptionCard({ challenge, onChoose, onEdit }: ChallengeOptionCardProps) {
  const meta = STYLE_META[challenge.style];
  const Icon = meta.icon;

  return (
    <div className="card p-5 flex flex-col animate-fade-in">
      <span className={`self-start text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1.5 mb-3 ${meta.color}`}>
        <Icon size={13} />
        {meta.label}
      </span>
      <h3 className="font-semibold text-slate-100 mb-1.5">{challenge.name}</h3>
      <p className="text-sm text-slate-400 mb-3">{challenge.description}</p>

      <div className="mb-3">
        <p className="label mb-1">Primary objective</p>
        <p className="text-sm text-slate-200">{challenge.primaryObjective}</p>
      </div>

      {challenge.bonusObjectives.length > 0 && (
        <div className="mb-3">
          <p className="label mb-1">Bonus objectives</p>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-0.5">
            {challenge.bonusObjectives.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500 italic mb-1">{challenge.whyFun}</p>
      {challenge.effortEstimate && (
        <p className="text-xs text-slate-500 mb-4">Extra effort: {challenge.effortEstimate}</p>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        <button className="btn-ghost text-xs flex-1" onClick={onEdit}>
          <Pencil size={14} /> Edit
        </button>
        <button className="btn-primary text-xs flex-1" onClick={onChoose}>
          Use this
        </button>
      </div>
    </div>
  );
}
