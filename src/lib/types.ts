// ---------------------------------------------------------------------------
// Mirrors the Rust types from commands/scan.rs and commands/generate.rs
// Keep in sync with the serde output shapes.
// ---------------------------------------------------------------------------

export type Tier = "CoreText" | "TokenHeavy" | "DangerZone";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  tier: Tier | null;
  checked: boolean;
  structureChecked: boolean;
  children: FileNode[];
  sizeBytes: number | null;
  depth: number;
}

export interface GenerateRequest {
  filePaths: string[];
  rootName: string;
  tree: FileNode;
}

export interface GenerateResponse {
  markdown: string;
  filesIncluded: number;
  failedPaths: string[];
  estimatedTokens: number;
}

export interface TokenEstimate {
  totalBytes: number;
  estimatedTokens: number;
  fileCount: number;
}

// ---------------------------------------------------------------------------
// UI-only types (not sent to Rust)
// ---------------------------------------------------------------------------

/** Which global overrides the user has toggled */
export interface GlobalToggles {
  includeTokenHeavy: boolean;
  includeDangerZone: boolean;
}

/** The full application state */
export interface AppState {
  root: FileNode | null;
  toggles: GlobalToggles;
  isScanning: boolean;
  isGenerating: boolean;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all checked file paths from the tree (not dirs) */
export function collectCheckedPaths(node: FileNode): string[] {
  if (!node.isDir) {
    return node.checked ? [node.path] : [];
  }
  return node.children.flatMap(collectCheckedPaths);
}

/** Count checked files */
export function countChecked(node: FileNode): number {
  if (!node.isDir) return node.checked ? 1 : 0;
  return node.children.reduce((acc, c) => acc + countChecked(c), 0);
}

/** Count selected nodes for the structure tree */
export function countStructureChecked(node: FileNode): number {
  if (!node.isDir) return node.structureChecked ? 1 : 0;
  return node.children.reduce((acc, c) => acc + countStructureChecked(c), 0);
}

/** Count total visible files (non-blacklisted) */
export function countTotal(node: FileNode): number {
  if (!node.isDir) return 1;
  return node.children.reduce((acc, c) => acc + countTotal(c), 0);
}

/** Recursively set checked on all file nodes of a given tier */
export function applyTierToggle(
  node: FileNode,
  tier: Tier,
  checked: boolean
): FileNode {
  if (!node.isDir) {
    if (node.tier === tier) return { ...node, checked };
    return node;
  }
  return {
    ...node,
    children: node.children.map((c) => applyTierToggle(c, tier, checked)),
  };
}

/** Toggle a single node (and propagate downward for dirs) */
export function toggleNode(node: FileNode, targetId: string, checked: boolean): FileNode {
  return toggleNodeByKey(node, targetId, checked, "checked");
}

/** Toggle a single node for the structure tree (and propagate downward for dirs) */
export function toggleStructureNode(node: FileNode, targetId: string, checked: boolean): FileNode {
  return toggleNodeByKey(node, targetId, checked, "structureChecked");
}

/** Mirror the export selection into the structure outline selection. */
export function syncStructureSelection(node: FileNode): FileNode {
  return {
    ...node,
    structureChecked: node.checked,
    children: node.children.map(syncStructureSelection),
  };
}

type SelectionKey = "checked" | "structureChecked";

function toggleNodeByKey(node: FileNode, targetId: string, checked: boolean, key: SelectionKey): FileNode {
  if (node.id === targetId) {
    return setAllCheckedByKey(node, checked, key);
  }
  if (!node.isDir) return node;
  return {
    ...node,
    children: node.children.map((c) => toggleNodeByKey(c, targetId, checked, key)),
  };
}

function setAllChecked(node: FileNode, checked: boolean): FileNode {
  return setAllCheckedByKey(node, checked, "checked");
}

function setAllCheckedByKey(node: FileNode, checked: boolean, key: SelectionKey): FileNode {
  return {
    ...node,
    [key]: checked,
    children: node.children.map((c) => setAllCheckedByKey(c, checked, key)),
  };
}

/** Format a byte count for display */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format a token estimate for display */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `~${tokens}`;
  if (tokens < 1_000_000) return `~${(tokens / 1000).toFixed(1)}k`;
  return `~${(tokens / 1_000_000).toFixed(2)}M`;
}

/** Tier metadata for rendering badges */
export const TIER_META: Record<Tier, { label: string; color: string; bg: string }> = {
  CoreText: {
    label: "Core",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  TokenHeavy: {
    label: "Heavy",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  DangerZone: {
    label: "Danger",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
};
