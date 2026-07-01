import { useState, useCallback } from "react";
import {
  FolderTree,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
} from "lucide-react";
import { FileTreeNode } from "./FileTreeNode";
import type { FileNode, GlobalToggles } from "../lib/types";
import { countChecked, countTotal } from "../lib/types";

interface FileTreeProps {
  root: FileNode;
  toggles: GlobalToggles;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function FileTree({
  root,
  toggles,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: FileTreeProps) {
  const [dangerPending, setDangerPending] = useState<{
    id: string;
    checked: boolean;
    name: string;
  } | null>(null);

  const checked = countChecked(root);
  const total = countTotal(root);

  const handleDangerConfirm = useCallback(
    (id: string, checked: boolean) => {
      // Find the node name for the warning dialog
      const name = findNodeName(root, id) ?? id;
      setDangerPending({ id, checked, name });
    },
    [root]
  );

  const confirmDanger = () => {
    if (dangerPending) {
      onToggle(dangerPending.id, dangerPending.checked);
      setDangerPending(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tree header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderTree size={14} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400 font-mono">
            {root.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-600">
            <span className="text-zinc-400 font-medium">{checked}</span> / {total} selected
          </span>

          {/* Quick select/deselect */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSelectAll}
              title="Select all visible files"
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-violet-400 transition-colors px-1.5 py-1 rounded hover:bg-zinc-800"
            >
              <CheckSquare size={11} />
              All
            </button>
            <button
              onClick={onDeselectAll}
              title="Deselect all files"
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors px-1.5 py-1 rounded hover:bg-zinc-800"
            >
              <Square size={11} />
              None
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable tree body */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1 scrollbar-thin">
        <FileTreeNode
          node={root}
          toggles={toggles}
          onToggle={onToggle}
          onDangerConfirm={handleDangerConfirm}
          depth={0}
        />
      </div>

      {/* Danger Zone confirmation modal */}
      {dangerPending && (
        <DangerModal
          name={dangerPending.name}
          onConfirm={confirmDanger}
          onCancel={() => setDangerPending(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone modal
// ---------------------------------------------------------------------------

function DangerModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
      <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-0.5">
              Danger Zone File
            </h3>
            <p className="text-xs text-zinc-500 font-mono break-all">{name}</p>
          </div>
          <button
            onClick={onCancel}
            className="ml-auto flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          This file type can contain{" "}
          <span className="text-red-300 font-medium">
            sensitive data, credentials, or massive token payloads
          </span>{" "}
          that may flood the LLM context window or expose secrets.
        </p>

        <p className="text-xs text-zinc-600 mb-5">
          Files like <code className="text-zinc-400">.env</code>,{" "}
          <code className="text-zinc-400">.csv</code>, and{" "}
          <code className="text-zinc-400">.log</code> should be included only
          when strictly necessary.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Keep Excluded
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-xs font-medium text-red-300 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg transition-colors"
          >
            Include Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function findNodeName(node: FileNode, targetId: string): string | null {
  if (node.id === targetId) return node.name;
  for (const child of node.children) {
    const found = findNodeName(child, targetId);
    if (found) return found;
  }
  return null;
}
