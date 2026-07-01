import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { DropZone } from "./components/DropZone";
import { FileTree } from "./components/FileTree";
import { Toggles } from "./components/Toggles";
import { ActionBar } from "./components/ActionBar";

import type {
  FileNode,
  GlobalToggles,
  GenerateResponse,
  TokenEstimate,
} from "./lib/types";

import {
  collectCheckedPaths,
  countChecked,
  applyTierToggle,
  toggleNode,
} from "./lib/types";

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

export default function App() {
  const [root, setRoot] = useState<FileNode | null>(null);
  const [toggles, setToggles] = useState<GlobalToggles>({
    includeTokenHeavy: false,
    includeDangerZone: false,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<TokenEstimate | null>(null);

  // ---------------------------------------------------------------------------
  // Directory scan
  // ---------------------------------------------------------------------------

  const handlePathDropped = useCallback(async (path: string) => {
    setIsScanning(true);
    setLastError(null);
    setRoot(null);
    setTokenEstimate(null);

    try {
      const tree = await invoke<FileNode>("scan_directory", { path });
      setRoot(tree);
    } catch (err) {
      setLastError(String(err));
    } finally {
      setIsScanning(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Re-estimate tokens whenever selection changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!root) {
      setTokenEstimate(null);
      return;
    }

    const paths = collectCheckedPaths(root);
    if (paths.length === 0) {
      setTokenEstimate(null);
      return;
    }

    // Debounced estimate — don't spam the backend on every click
    const timer = setTimeout(async () => {
      try {
        const est = await invoke<TokenEstimate>("estimate_tokens", {
          filePaths: paths,
        });
        setTokenEstimate(est);
      } catch {
        // Non-fatal — silently skip
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [root]);

  // ---------------------------------------------------------------------------
  // Toggle handlers
  // ---------------------------------------------------------------------------

  const handleTogglesChange = useCallback(
    (next: GlobalToggles) => {
      if (!root) {
        setToggles(next);
        return;
      }

      let updatedRoot = root;

      // If TokenHeavy was just enabled, check all TokenHeavy files
      if (next.includeTokenHeavy !== toggles.includeTokenHeavy) {
        updatedRoot = applyTierToggle(
          updatedRoot,
          "TokenHeavy",
          next.includeTokenHeavy
        );
      }

      // If DangerZone was just enabled, check all DangerZone files
      if (next.includeDangerZone !== toggles.includeDangerZone) {
        updatedRoot = applyTierToggle(
          updatedRoot,
          "DangerZone",
          next.includeDangerZone
        );
      }

      setToggles(next);
      setRoot(updatedRoot);
    },
    [root, toggles]
  );

  const handleNodeToggle = useCallback(
    (id: string, checked: boolean) => {
      if (!root) return;
      setRoot(toggleNode(root, id, checked));
    },
    [root]
  );

  const handleSelectAll = useCallback(() => {
    if (!root) return;
    setRoot(toggleNode(root, root.id, true));
  }, [root]);

  const handleDeselectAll = useCallback(() => {
    if (!root) return;
    setRoot(toggleNode(root, root.id, false));
  }, [root]);

  // ---------------------------------------------------------------------------
  // Generate Markdown helpers
  // ---------------------------------------------------------------------------

  const buildMarkdown = async (): Promise<string | null> => {
    if (!root) return null;

    const filePaths = collectCheckedPaths(root);
    if (filePaths.length === 0) {
      setLastError("No files selected. Check at least one file.");
      return null;
    }

    setIsGenerating(true);
    setLastError(null);

    try {
      const result = await invoke<GenerateResponse>("generate_markdown", {
        request: {
          filePaths,
          rootName: root.name,
        },
      });

      if (result.failedPaths.length > 0) {
        setLastError(
          `${result.failedPaths.length} file(s) could not be read — see ⚠️ blocks in output.`
        );
      }

      return result.markdown;
    } catch (err) {
      setLastError(String(err));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Copy to clipboard
  // ---------------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    const markdown = await buildMarkdown();
    if (!markdown) return;
    await writeText(markdown);
  }, [root]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Save as .md
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    const markdown = await buildMarkdown();
    if (!markdown || !root) return;

    const savePath = await save({
      defaultPath: `${root.name}-dump.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (!savePath) return; // User cancelled

    try {
      await invoke("save_markdown", { path: savePath, content: markdown });
    } catch (err) {
      setLastError(String(err));
    }
  }, [root]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const selectedCount = root ? countChecked(root) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Title bar spacer for macOS traffic lights */}
      <div
        data-tauri-drag-region
        className="flex items-center h-11 px-4 flex-shrink-0 border-b border-zinc-900"
      >
        <div className="flex items-center gap-2 ml-16">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400">
            RepoDump
          </span>
          {root && (
            <span className="text-xs text-zinc-700 font-mono">
              — {root.name}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!root && !isScanning ? (
          // ── Drop Zone (full-panel when no project is open) ──
          <div className="flex-1 p-6">
            <DropZone
              onPathDropped={handlePathDropped}
              isScanning={isScanning}
            />
          </div>
        ) : (
          // ── Two-column layout once a project is scanned ──
          <TwoColumnLayout
            root={root}
            toggles={toggles}
            isScanning={isScanning}
            onPathDropped={handlePathDropped}
            onTogglesChange={handleTogglesChange}
            onNodeToggle={handleNodeToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}
      </div>

      {/* Action bar — always at the bottom */}
      <ActionBar
        selectedCount={selectedCount}
        tokenEstimate={tokenEstimate}
        isGenerating={isGenerating}
        lastError={lastError}
        onCopy={handleCopy}
        onSave={handleSave}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Two-column layout (left: drop zone + controls, right: file tree)
// ---------------------------------------------------------------------------

interface TwoColumnProps {
  root: FileNode | null;
  toggles: GlobalToggles;
  isScanning: boolean;
  onPathDropped: (path: string) => void;
  onTogglesChange: (t: GlobalToggles) => void;
  onNodeToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function TwoColumnLayout({
  root,
  toggles,
  isScanning,
  onPathDropped,
  onTogglesChange,
  onNodeToggle,
  onSelectAll,
  onDeselectAll,
}: TwoColumnProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Left panel: mini drop zone + tier toggles ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Mini drop zone */}
        <div className="p-3 border-b border-zinc-800 flex-shrink-0">
          <DropZone
            onPathDropped={onPathDropped}
            isScanning={isScanning}
          />
        </div>

        {/* Tier toggles */}
        <Toggles toggles={toggles} onChange={onTogglesChange} />

        {/* Legend */}
        <div className="mt-auto px-3 py-3 border-t border-zinc-900">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-2">
            Tier Legend
          </p>
          <div className="flex flex-col gap-1.5">
            <LegendRow color="bg-emerald-400" label="Core Text" desc="Always on — source & config" />
            <LegendRow color="bg-amber-400" label="Token Heavy" desc="Manifests, lock files" />
            <LegendRow color="bg-red-400" label="Danger Zone" desc=".env, .log, .csv" />
            <LegendRow color="bg-zinc-700" label="Blacklisted" desc="Binaries, media, .git" />
          </div>
        </div>
      </div>

      {/* ── Right panel: file tree ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-zinc-950 relative">
        {root ? (
          <FileTree
            root={root}
            toggles={toggles}
            onToggle={onNodeToggle}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-700">Scanning…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  desc,
}: {
  color: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
      <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
      <span className="text-[10px] text-zinc-700 truncate">{desc}</span>
    </div>
  );
}
