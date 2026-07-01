import { useState } from "react";
import {
  Clipboard,
  ClipboardCheck,
  Download,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";
import type { TokenEstimate } from "../lib/types";
import { formatTokens } from "../lib/types";

interface ActionBarProps {
  selectedCount: number;
  tokenEstimate: TokenEstimate | null;
  isGenerating: boolean;
  lastError: string | null;
  onCopy: () => Promise<void>;
  onSave: () => Promise<void>;
}

export function ActionBar({
  selectedCount,
  tokenEstimate,
  isGenerating,
  lastError,
  onCopy,
  onSave,
}: ActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const hasFiles = selectedCount > 0;

  return (
    <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-3">
      {/* Error banner */}
      {lastError && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span className="truncate">{lastError}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Token estimate display */}
        <div className="flex-1 flex items-center gap-3">
          <TokenDisplay
            selectedCount={selectedCount}
            estimate={tokenEstimate}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={onSave}
            disabled={!hasFiles || isGenerating}
            loading={false}
            variant="secondary"
            icon={<Download size={13} />}
            label="Save .md"
          />

          <ActionButton
            onClick={handleCopy}
            disabled={!hasFiles || isGenerating}
            loading={isGenerating}
            variant="primary"
            icon={
              copied ? (
                <ClipboardCheck size={13} />
              ) : (
                <Clipboard size={13} />
              )
            }
            label={copied ? "Copied!" : "Copy to Clipboard"}
            success={copied}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Token display widget
// ---------------------------------------------------------------------------

function TokenDisplay({
  selectedCount,
  estimate,
}: {
  selectedCount: number;
  estimate: TokenEstimate | null;
}) {
  if (selectedCount === 0) {
    return (
      <p className="text-xs text-zinc-700">
        Select files to estimate token usage
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Zap size={12} className="text-violet-400" />
        <span className="text-xs text-zinc-500">
          {selectedCount} file{selectedCount !== 1 ? "s" : ""}
        </span>
      </div>

      {estimate && (
        <>
          <div className="w-px h-3 bg-zinc-800" />
          <TokenMeter tokens={estimate.estimatedTokens} />
        </>
      )}
    </div>
  );
}

function TokenMeter({ tokens }: { tokens: number }) {
  // Thresholds: 0–32k green, 32k–100k amber, 100k+ red
  const level =
    tokens < 32_000 ? "ok" : tokens < 100_000 ? "warn" : "danger";

  const colors = {
    ok: { text: "text-emerald-400", bg: "bg-emerald-400" },
    warn: { text: "text-amber-400", bg: "bg-amber-400" },
    danger: { text: "text-red-400", bg: "bg-red-400" },
  }[level];

  const width = Math.min((tokens / 200_000) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-medium ${colors.text}`}>
        {formatTokens(tokens)} tokens
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic action button
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  variant: "primary" | "secondary";
  icon: React.ReactNode;
  label: string;
}

function ActionButton({
  onClick,
  disabled,
  loading,
  success,
  variant,
  icon,
  label,
}: ActionButtonProps) {
  const base =
    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed";

  const variants = {
    primary: [
      "bg-violet-600 hover:bg-violet-500 text-white",
      "disabled:bg-zinc-800 disabled:text-zinc-600",
      success ? "!bg-emerald-600 hover:!bg-emerald-600" : "",
    ].join(" "),
    secondary: [
      "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
      "disabled:bg-zinc-900 disabled:text-zinc-700",
      "border border-zinc-700 hover:border-zinc-600",
    ].join(" "),
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}
