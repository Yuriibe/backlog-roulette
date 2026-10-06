import { Dices, History, Library, PlayCircle, Settings as SettingsIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { View } from "../../App";
import { useAppStore } from "../../store/useAppStore";

interface ShellProps {
  view: View;
  onNavigate: (v: View) => void;
  children: ReactNode;
}

interface NavItemDef {
  view: View;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemDef[] = [
  { view: "roulette", label: "Roulette", icon: Dices },
  { view: "backlog", label: "My Backlog", icon: Library },
  { view: "active-run", label: "Active Run", icon: PlayCircle },
  { view: "history", label: "History", icon: History },
  { view: "settings", label: "Settings", icon: SettingsIcon },
];

export function Shell({ view, onNavigate, children }: ShellProps) {
  const activeRunCount = useAppStore((s) => s.activeOrPausedRuns().length);

  return (
    <div className="flex min-h-screen">
      <aside className="w-20 md:w-56 shrink-0 border-r border-white/5 bg-ink-900/60 flex flex-col py-6 px-2 md:px-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow shrink-0">
            <Dices size={18} className="text-white" />
          </div>
          <span className="hidden md:block font-semibold text-slate-100 tracking-tight">Backlog Roulette</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.view;
            const showBadge = item.view === "active-run" && activeRunCount > 0;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  isActive ? "bg-accent-600/20 text-accent-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="hidden md:block">{item.label}</span>
                {showBadge && (
                  <span className="absolute right-2 top-2 md:static md:ml-auto w-2 h-2 rounded-full bg-accent-400" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto hidden md:block px-2 text-xs text-slate-500">
          Your games, your rules.
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
