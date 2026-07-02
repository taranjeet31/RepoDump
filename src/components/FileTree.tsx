import { useState, useCallback } from "react";
import { CheckSquare, Square, AlertTriangle, X, SlidersHorizontal } from "lucide-react";
import { FileTreeNode } from "./FileTreeNode";
import type { FileNode, GlobalToggles } from "../lib/types";
import { countChecked, countStructureChecked, countTotal } from "../lib/types";

interface FileTreeProps {
  root: FileNode;
  toggles: GlobalToggles;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  mode?: "content" | "structure";
  title?: string;
  sameAsFilesSelected?: boolean;
  onSameAsFilesSelectedChange?: (checked: boolean) => void;
}

export function FileTree({
  root,
  toggles,
  onToggle,
  onSelectAll,
  onDeselectAll,
  mode = "content",
  title,
  sameAsFilesSelected = false,
  onSameAsFilesSelectedChange,
}: FileTreeProps) {
  const [dangerPending, setDangerPending] = useState<{
    id: string; checked: boolean; name: string;
  } | null>(null);

  const checked = mode === "structure" ? countStructureChecked(root) : countChecked(root);
  const total = countTotal(root);

  const handleDangerConfirm = useCallback((id: string, checked: boolean) => {
    const name = findNodeName(root, id) ?? id;
    setDangerPending({ id, checked, name });
  }, [root]);

  const confirmDanger = () => {
    if (dangerPending) { onToggle(dangerPending.id, dangerPending.checked); setDangerPending(null); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tree toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0 bg-[#0c0c0d]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-zinc-600" />
          <span className="text-[12px] font-mono text-zinc-500 truncate max-w-[220px]">
            {title ?? root.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mode === "structure" && (
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsFilesSelected}
                onChange={(e) => onSameAsFilesSelectedChange?.(e.target.checked)}
                className="w-3 h-3 rounded-[3px] cursor-pointer accent-violet-500"
              />
              <span>Same as files selected</span>
            </label>
          )}
          <span className="text-[11px] text-zinc-700 tabular-nums">
            <span className="text-zinc-400 font-medium">{checked}</span>
            <span className="text-zinc-700"> / {total}</span>
          </span>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex items-center gap-0.5">
            <button
              onClick={onSelectAll}
              disabled={mode === "structure" && sameAsFilesSelected}
              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-violet-400 transition-colors px-1.5 py-1 rounded hover:bg-violet-500/8"
            >
              <CheckSquare size={10} /> All
            </button>
            <button
              onClick={onDeselectAll}
              disabled={mode === "structure" && sameAsFilesSelected}
              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors px-1.5 py-1 rounded hover:bg-white/5"
            >
              <Square size={10} /> None
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1 scrollbar-thin">
        <FileTreeNode
          node={root}
          toggles={toggles}
          onToggle={onToggle}
          onDangerConfirm={handleDangerConfirm}
          selectionKey={mode === "structure" && !sameAsFilesSelected ? "structureChecked" : "checked"}
          mode={mode}
          locked={mode === "structure" && sameAsFilesSelected}
          depth={0}
        />
      </div>

      {/* Danger modal */}
      {mode === "content" && dangerPending && (
        <DangerModal
          name={dangerPending.name}
          onConfirm={confirmDanger}
          onCancel={() => setDangerPending(null)}
        />
      )}
    </div>
  );
}

function DangerModal({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111113] border border-red-500/20 rounded-2xl p-5 max-w-[320px] w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center mt-0.5">
            <AlertTriangle size={15} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-zinc-100 mb-1">Danger Zone file</p>
            <p className="text-[11px] text-zinc-600 font-mono break-all leading-relaxed">{name}</p>
          </div>
          <button onClick={onCancel} className="flex-shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors mt-0.5">
            <X size={13} />
          </button>
        </div>
        <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
          This file type may contain <span className="text-red-300">sensitive credentials</span> or produce very large token payloads that degrade LLM context quality.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-[12px] font-medium text-zinc-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800"
          >
            Keep excluded
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-3 py-2 text-[12px] font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded-lg transition-colors"
          >
            Include anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function findNodeName(node: FileNode, targetId: string): string | null {
  if (node.id === targetId) return node.name;
  for (const child of node.children) {
    const found = findNodeName(child, targetId);
    if (found) return found;
  }
  return null;
}
