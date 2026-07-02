import { Package, ShieldAlert } from "lucide-react";
import type { GlobalToggles } from "../lib/types";

interface TogglesProps {
  toggles: GlobalToggles;
  onChange: (next: GlobalToggles) => void;
}

export function Toggles({ toggles, onChange }: TogglesProps) {
  return (
    <div className="px-3 py-3.5 border-b border-white/[0.06]">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-700 mb-3">
        Global Filters
      </p>
      <div className="flex flex-col gap-3">
        <ToggleRow
          icon={<Package size={12} className="text-amber-500" />}
          label="Manifests"
          description="package.json, Cargo.toml, lock files…"
          dotColor="bg-amber-500"
          checked={toggles.includeTokenHeavy}
          onChange={(v) => onChange({ ...toggles, includeTokenHeavy: v })}
        />
        <ToggleRow
          icon={<ShieldAlert size={12} className="text-red-500" />}
          label="Danger Zone"
          description=".env, .csv, .log, .ipynb"
          dotColor="bg-red-500"
          checked={toggles.includeDangerZone}
          onChange={(v) => onChange({ ...toggles, includeDangerZone: v })}
          warning={toggles.includeDangerZone ? "May expose secrets or flood context" : undefined}
        />
      </div>
    </div>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  dotColor: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  warning?: string;
}

function ToggleRow({ icon, label, description, checked, onChange, warning }: ToggleRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 opacity-80">{icon}</span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-zinc-300 leading-none mb-0.5">{label}</p>
            <p className="text-[10px] text-zinc-700 truncate">{description}</p>
          </div>
        </div>
        {/* Toggle pill */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={[
            "flex-shrink-0 relative w-8 h-4 rounded-full transition-colors duration-200",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500",
            checked ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700",
          ].join(" ")}
        >
          <span className={[
            "absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all duration-200",
            checked ? "left-[18px] bg-white" : "left-0.5 bg-zinc-500",
          ].join(" ")} />
        </button>
      </div>
      {warning && (
        <p className="text-[10px] text-red-400/70 bg-red-500/8 border border-red-500/15 rounded px-2 py-1 ml-5 leading-snug">
          ⚠ {warning}
        </p>
      )}
    </div>
  );
}
