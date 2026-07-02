import { useState } from "react";
import { Clipboard, ClipboardCheck, Download, Loader2, AlertCircle, FileText } from "lucide-react";
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

export function ActionBar({ selectedCount, tokenEstimate, isGenerating, lastError, onCopy, onSave }: ActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const hasFiles = selectedCount > 0;
  const tokens = tokenEstimate?.estimatedTokens ?? 0;
  const level = tokens < 32_000 ? "ok" : tokens < 100_000 ? "warn" : "danger";
  const meterColors = {
    ok: { bar: "bg-emerald-500", text: "text-emerald-400" },
    warn: { bar: "bg-amber-500", text: "text-amber-400" },
    danger: { bar: "bg-red-500", text: "text-red-400" },
  }[level];
  const meterWidth = Math.min((tokens / 200_000) * 100, 100);

  return (
    <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0b] px-4 py-2.5">
      {lastError && (
        <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2 mb-2.5">
          <AlertCircle size={11} className="flex-shrink-0" />
          <span className="truncate">{lastError}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Left: stats */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {hasFiles ? (
            <>
              <div className="flex items-center gap-1.5">
                <FileText size={11} className="text-zinc-600" />
                <span className="text-[12px] text-zinc-500 tabular-nums">
                  <span className="text-zinc-300 font-medium">{selectedCount}</span>
                  {" "}file{selectedCount !== 1 ? "s" : ""}
                </span>
              </div>

              {tokenEstimate && (
                <>
                  <div className="w-px h-3 bg-zinc-800" />
                  {/* Token meter */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meterColors.bar}`}
                        style={{ width: `${meterWidth}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-mono font-medium tabular-nums ${meterColors.text}`}>
                      {formatTokens(tokens)}
                    </span>
                    <span className="text-[11px] text-zinc-700">tokens</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <span className="text-[12px] text-zinc-700">Select files to export</span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={!hasFiles || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 hover:bg-zinc-800/80 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} />
            Save .md
          </button>

          <button
            onClick={handleCopy}
            disabled={!hasFiles || isGenerating}
            className={[
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              copied
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white",
            ].join(" ")}
          >
            {isGenerating
              ? <Loader2 size={12} className="animate-spin" />
              : copied
                ? <ClipboardCheck size={12} />
                : <Clipboard size={12} />
            }
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
