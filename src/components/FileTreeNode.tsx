import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import type { FileNode, GlobalToggles } from "../lib/types";
import { TIER_META, formatBytes } from "../lib/types";

interface FileTreeNodeProps {
  node: FileNode;
  toggles: GlobalToggles;
  onToggle: (id: string, checked: boolean) => void;
  onDangerConfirm: (id: string, checked: boolean) => void;
  depth?: number;
}

export function FileTreeNode({
  node,
  toggles,
  onToggle,
  onDangerConfirm,
  depth = 0,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2); // auto-expand first two levels

  const isDisabled = (() => {
    if (!node.isDir && node.tier === "TokenHeavy" && !toggles.includeTokenHeavy)
      return true;
    if (!node.isDir && node.tier === "DangerZone" && !toggles.includeDangerZone)
      return true;
    return false;
  })();

  const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const checked = e.target.checked;

    if (node.tier === "DangerZone" && checked) {
      onDangerConfirm(node.id, checked);
      return;
    }

    onToggle(node.id, checked);
  };

  // Determine the indeterminate state for directory checkboxes
  const dirCheckedState = (() => {
    if (!node.isDir) return null;
    const counts = countDescendants(node);
    if (counts.checked === 0) return "none";
    if (counts.checked === counts.total) return "all";
    return "some";
  })();

  return (
    <div>
      <div
        className={[
          "group flex items-center gap-1.5 px-2 py-[3px] rounded-md",
          "cursor-default select-none transition-colors duration-100",
          "hover:bg-zinc-800/60",
          isDisabled ? "opacity-40 pointer-events-none" : "",
        ].join(" ")}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Expand/collapse for directories */}
        {node.isDir ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors w-4 h-4"
          >
            {expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={
            node.isDir
              ? dirCheckedState === "all"
              : node.checked
          }
          indeterminate={dirCheckedState === "some"}
          disabled={isDisabled}
          onChange={handleCheckChange}
        />

        {/* Icon */}
        <span className="flex-shrink-0 text-zinc-500">
          {node.isDir ? (
            expanded ? (
              <FolderOpen size={14} className="text-violet-400/70" />
            ) : (
              <Folder size={14} className="text-violet-400/70" />
            )
          ) : (
            <File size={13} className="text-zinc-600" />
          )}
        </span>

        {/* Name */}
        <span
          onClick={() => node.isDir && setExpanded((v) => !v)}
          className={[
            "flex-1 text-[13px] font-mono truncate",
            node.isDir
              ? "text-zinc-200 font-medium cursor-pointer"
              : "text-zinc-400",
            node.checked && !node.isDir ? "text-zinc-200" : "",
          ].join(" ")}
        >
          {node.name}
        </span>

        {/* Tier badge (files only) */}
        {!node.isDir && node.tier && (
          <TierBadge tier={node.tier} />
        )}

        {/* File size */}
        {!node.isDir && node.sizeBytes !== null && (
          <span className="text-[11px] text-zinc-700 font-mono group-hover:text-zinc-500 transition-colors flex-shrink-0">
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
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Empty dir message */}
      {node.isDir && expanded && node.children.length === 0 && (
        <div
          className="text-[11px] text-zinc-700 italic py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
        >
          Empty or fully filtered
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: NonNullable<FileNode["tier"]> }) {
  const meta = TIER_META[tier];
  if (tier === "CoreText") return null; // Don't clutter core files with a badge

  return (
    <span
      className={[
        "flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded",
        meta.color,
        meta.bg,
        "flex items-center gap-1",
      ].join(" ")}
    >
      {tier === "DangerZone" && <AlertTriangle size={9} />}
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Custom checkbox (supports indeterminate state)
// ---------------------------------------------------------------------------

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Checkbox({ checked, indeterminate, disabled, onChange }: CheckboxProps) {
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
      className={[
        "flex-shrink-0 w-3.5 h-3.5 rounded-sm cursor-pointer",
        "accent-violet-500",
        "border border-zinc-600",
        disabled ? "cursor-not-allowed" : "",
      ].join(" ")}
    />
  );
}

// ---------------------------------------------------------------------------
// Helper: count checked vs total file descendants
// ---------------------------------------------------------------------------

function countDescendants(node: FileNode): { checked: number; total: number } {
  if (!node.isDir) {
    return { checked: node.checked ? 1 : 0, total: 1 };
  }
  return node.children.reduce(
    (acc, child) => {
      const sub = countDescendants(child);
      return {
        checked: acc.checked + sub.checked,
        total: acc.total + sub.total,
      };
    },
    { checked: 0, total: 0 }
  );
}
