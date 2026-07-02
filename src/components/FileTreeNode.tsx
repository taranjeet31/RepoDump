import { useState } from "react";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, AlertTriangle } from "lucide-react";
import type { FileNode, GlobalToggles } from "../lib/types";
import { formatBytes } from "../lib/types";

interface FileTreeNodeProps {
  node: FileNode;
  toggles: GlobalToggles;
  onToggle: (id: string, checked: boolean) => void;
  onDangerConfirm?: (id: string, checked: boolean) => void;
  selectionKey: "checked" | "structureChecked";
  mode: "content" | "structure";
  locked?: boolean;
  depth?: number;
}

export function FileTreeNode({ node, toggles, onToggle, onDangerConfirm, selectionKey, mode, locked = false, depth = 0 }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  const selected = node[selectionKey];
  const isDisabled = locked || (mode === "content" && !node.isDir && (
    (node.tier === "TokenHeavy" && !toggles.includeTokenHeavy) ||
    (node.tier === "DangerZone" && !toggles.includeDangerZone)
  ));

  const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;
    if (mode === "content" && node.tier === "DangerZone" && checked) { onDangerConfirm?.(node.id, checked); return; }
    onToggle(node.id, checked);
  };

  const dirState = (() => {
    if (!node.isDir) return null;
    const c = countDescendants(node, selectionKey);
    if (c.checked === 0) return "none";
    if (c.checked === c.total) return "all";
    return "some";
  })();

  const indent = depth * 16 + 12;

  return (
    <div>
      <div
        className={[
          "group flex items-center gap-1.5 py-[3px] pr-3 rounded select-none",
          "transition-colors duration-75 cursor-default",
          "hover:bg-white/[0.04]",
          isDisabled ? "opacity-35 pointer-events-none" : "",
        ].join(" ")}
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Chevron for dirs */}
        {node.isDir ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 w-3.5 h-3.5 text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            {expanded ? <ChevronDown size={11} strokeWidth={2.5} /> : <ChevronRight size={11} strokeWidth={2.5} />}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={node.isDir ? dirState === "all" : selected}
          indeterminate={dirState === "some"}
          disabled={isDisabled}
          onChange={handleCheckChange}
        />

        {/* Icon */}
        <span className="flex-shrink-0">
          {node.isDir
            ? expanded
              ? <FolderOpen size={13} className="text-violet-500/70" />
              : <Folder size={13} className="text-violet-500/50" />
            : <FileCode size={12} className="text-zinc-700 group-hover:text-zinc-600 transition-colors" />
          }
        </span>

        {/* Name */}
        <span
          onClick={() => node.isDir && setExpanded((v) => !v)}
          className={[
            "flex-1 text-[12.5px] font-mono truncate leading-none",
            node.isDir
              ? "text-zinc-300 font-medium cursor-pointer"
              : selected
                ? "text-zinc-300"
                : "text-zinc-500",
          ].join(" ")}
        >
          {node.name}
        </span>

        {/* Danger badge */}
        {!node.isDir && node.tier === "DangerZone" && (
          <AlertTriangle size={10} className="flex-shrink-0 text-red-500/60" />
        )}

        {/* File size — only on hover for cleanliness */}
        {!node.isDir && node.sizeBytes !== null && (
          <span className="text-[10px] text-zinc-800 font-mono group-hover:text-zinc-600 transition-colors flex-shrink-0 tabular-nums">
            {formatBytes(node.sizeBytes)}
          </span>
        )}
      </div>

      {/* Children */}
      {node.isDir && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              toggles={toggles}
              onToggle={onToggle}
              onDangerConfirm={onDangerConfirm}
              selectionKey={selectionKey}
              mode={mode}
              locked={locked}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {node.isDir && expanded && node.children.length === 0 && (
        <div
          className="text-[10px] text-zinc-800 italic py-0.5"
          style={{ paddingLeft: `${indent + 20}px` }}
        >
          empty
        </div>
      )}
    </div>
  );
}

// ── Custom checkbox ───────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, disabled, onChange }: {
  checked: boolean; indeterminate?: boolean; disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = indeterminate ?? false;
  };
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="flex-shrink-0 w-3 h-3 rounded-[3px] cursor-pointer accent-violet-500"
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function countDescendants(
  node: FileNode,
  selectionKey: "checked" | "structureChecked"
): { checked: number; total: number } {
  if (!node.isDir) return { checked: node[selectionKey] ? 1 : 0, total: 1 };
  return node.children.reduce(
    (acc, child) => {
      const sub = countDescendants(child, selectionKey);
      return { checked: acc.checked + sub.checked, total: acc.total + sub.total };
    },
    { checked: 0, total: 0 }
  );
}
