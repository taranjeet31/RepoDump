import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Upload, FolderSearch, Plus } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

interface DropZoneProps {
  onPathDropped: (path: string) => void;
  isScanning: boolean;
  compact?: boolean;
}

export function DropZone({ onPathDropped, isScanning, compact = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      const win = getCurrentWindow();
      unlisten = await win.onDragDropEvent((event) => {
        if (event.payload.type === "over") { setIsDragging(true); setDragError(null); return; }
        if (event.payload.type === "leave") { setIsDragging(false); return; }
        if (event.payload.type === "drop") {
          setIsDragging(false);
          const paths: string[] = event.payload.paths ?? [];
          if (paths.length === 0) { setDragError("No path received. Use 'Open Folder' instead."); return; }
          onPathDropped(paths[0]);
        }
      });
    };
    setup().catch(console.error);
    return () => { unlisten?.(); };
  }, [onPathDropped]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: "Select a project folder" });
      if (typeof selected === "string" && selected.length > 0) onPathDropped(selected);
    } catch (err) { setDragError(String(err)); }
  }, [onPathDropped]);

  // ── Compact sidebar variant ───────────────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={handleOpenFolder}
        disabled={isScanning}
        className={[
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left",
          "border border-dashed transition-all duration-150",
          isDragging
            ? "border-violet-500/60 bg-violet-500/8 text-violet-300"
            : "border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-400 hover:bg-white/[0.03]",
          isScanning ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <Plus size={13} className={isDragging ? "text-violet-400" : "text-zinc-600"} />
        <span className="text-[12px] font-medium">
          {isScanning ? "Scanning…" : isDragging ? "Release to scan" : "Open another folder"}
        </span>
      </button>
    );
  }

  // ── Full drop zone (empty state) ─────────────────────────────────────────
  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center",
        "w-full min-h-[260px] rounded-2xl",
        "border-2 border-dashed transition-all duration-200 select-none",
        isDragging
          ? "border-violet-500/70 bg-violet-500/5"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700",
        isScanning ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
    >
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl ring-1 ring-violet-500/20 pointer-events-none" />
      )}

      {isScanning ? (
        <ScanningState />
      ) : (
        <IdleState isDragging={isDragging} dragError={dragError} onOpenFolder={handleOpenFolder} />
      )}
    </div>
  );
}

function IdleState({ isDragging, dragError, onOpenFolder }: {
  isDragging: boolean; dragError: string | null; onOpenFolder: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 p-8 text-center">
      <div className={[
        "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 pointer-events-none",
        isDragging ? "bg-violet-500/15 text-violet-400" : "bg-zinc-900 text-zinc-600",
      ].join(" ")}>
        {isDragging ? <FolderOpen size={26} /> : <Upload size={24} />}
      </div>

      <div className="flex flex-col gap-1.5 pointer-events-none">
        <p className={["text-[15px] font-semibold transition-colors", isDragging ? "text-violet-300" : "text-zinc-300"].join(" ")}>
          {isDragging ? "Release to scan" : "Drop a folder"}
        </p>
        <p className="text-[13px] text-zinc-600 leading-snug">
          {isDragging ? "Building filtered file tree…" : "Drag any project directory here"}
        </p>
      </div>

      {!isDragging && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onOpenFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 hover:bg-zinc-800/80 transition-all duration-150"
          >
            <FolderSearch size={13} />
            Browse for folder
          </button>
          <div className="flex items-center gap-1.5">
            {["Rust", "TS", "Python", "Go", "C++"].map((lang) => (
              <span key={lang} className="text-[10px] text-zinc-700 bg-zinc-900/80 border border-zinc-800/80 px-1.5 py-0.5 rounded font-mono">
                {lang}
              </span>
            ))}
            <span className="text-[10px] text-zinc-700">+40 more</span>
          </div>
        </div>
      )}

      {dragError && (
        <p className="text-[11px] text-red-400 bg-red-400/8 border border-red-400/15 px-3 py-1.5 rounded-lg pointer-events-none">
          {dragError}
        </p>
      )}
    </div>
  );
}

function ScanningState() {
  return (
    <div className="flex flex-col items-center gap-4 pointer-events-none">
      <div className="relative flex items-center justify-center w-14 h-14">
        <div className="absolute inset-0 rounded-full border border-zinc-800" />
        <div className="absolute inset-0 rounded-full border border-transparent border-t-violet-500 animate-spin" />
        <FolderOpen size={20} className="text-violet-400" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[13px] font-medium text-zinc-300">Scanning…</p>
        <p className="text-[11px] text-zinc-600">Filtering by tier</p>
      </div>
    </div>
  );
}
