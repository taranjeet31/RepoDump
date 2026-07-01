import { Package, ShieldAlert } from "lucide-react";
import type { GlobalToggles } from "../lib/types";

interface TogglesProps {
  toggles: GlobalToggles;
  onChange: (next: GlobalToggles) => void;
}

export function Toggles({ toggles, onChange }: TogglesProps) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3 border-b border-zinc-800">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-0.5">
        Global Filters
      </p>

      {/* Tier 2 — Token Heavy */}
      <ToggleRow
        icon={<Package size={13} className="text-amber-400" />}
        label="Dependency Manifests"
        description="package.json, Cargo.toml, yarn.lock, go.mod…"
        badgeLabel="Token Heavy"
        badgeClass="text-amber-400 bg-amber-400/10"
        checked={toggles.includeTokenHeavy}
        onChange={(v) => onChange({ ...toggles, includeTokenHeavy: v })}
      />

      {/* Tier 3 — Danger Zone */}
      <ToggleRow
        icon={<ShieldAlert size={13} className="text-red-400" />}
        label="Danger Zone Files"
        description=".env, .csv, .log, .patch, .ipynb — use with caution"
        badgeLabel="Danger Zone"
        badgeClass="text-red-400 bg-red-400/10"
        checked={toggles.includeDangerZone}
        onChange={(v) => onChange({ ...toggles, includeDangerZone: v })}
        warning={
          toggles.includeDangerZone
            ? "These files may contain secrets or massive payloads"
            : undefined
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single toggle row
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  badgeLabel: string;
  badgeClass: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  warning?: string;
}

function ToggleRow({
  icon,
  label,
  description,
  badgeLabel,
  badgeClass,
  checked,
  onChange,
  warning,
}: ToggleRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between gap-3 cursor-pointer group">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                {label}
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeClass} flex-shrink-0`}
              >
                {badgeLabel}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 truncate">{description}</p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={[
            "flex-shrink-0 relative w-9 h-5 rounded-full transition-colors duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            checked ? "bg-violet-600" : "bg-zinc-700",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm",
              "transition-transform duration-200",
              checked ? "translate-x-4" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </label>

      {warning && (
        <p className="text-[11px] text-red-400/80 bg-red-400/5 border border-red-400/15 rounded px-2 py-1 ml-5">
          ⚠ {warning}
        </p>
      )}
    </div>
  );
}
