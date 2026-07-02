import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { FolderOpen, RotateCcw } from "lucide-react";

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
  toggleStructureNode,
  syncStructureSelection,
} from "./lib/types";

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
  const [structureSameAsFiles, setStructureSameAsFiles] = useState(false);

  const applyNextRoot = useCallback((nextRoot: FileNode) => {
    setRoot(structureSameAsFiles ? syncStructureSelection(nextRoot) : nextRoot);
  }, [structureSameAsFiles]);

  const handlePathDropped = useCallback(async (path: string) => {
    setIsScanning(true);
    setLastError(null);
    setRoot(null);
    setTokenEstimate(null);
    try {
      const tree = await invoke<FileNode>("scan_directory", { path });
      applyNextRoot(tree);
    } catch (err) {
      setLastError(String(err));
    } finally {
      setIsScanning(false);
    }
  }, [applyNextRoot]);

  useEffect(() => {
    if (!root) { setTokenEstimate(null); return; }
    const paths = collectCheckedPaths(root);
    if (paths.length === 0) { setTokenEstimate(null); return; }
    const timer = setTimeout(async () => {
      try {
        const est = await invoke<TokenEstimate>("estimate_tokens", { filePaths: paths });
        setTokenEstimate(est);
      } catch { /* non-fatal */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [root]);

  const handleTogglesChange = useCallback((next: GlobalToggles) => {
    let updatedRoot = root;
    if (updatedRoot) {
      if (next.includeTokenHeavy !== toggles.includeTokenHeavy)
        updatedRoot = applyTierToggle(updatedRoot, "TokenHeavy", next.includeTokenHeavy);
      if (next.includeDangerZone !== toggles.includeDangerZone)
        updatedRoot = applyTierToggle(updatedRoot, "DangerZone", next.includeDangerZone);
    }
    setToggles(next);
    if (updatedRoot) applyNextRoot(updatedRoot);
  }, [root, toggles, applyNextRoot]);

  const handleNodeToggle = useCallback((id: string, checked: boolean) => {
    if (!root) return;
    applyNextRoot(toggleNode(root, id, checked));
  }, [root, applyNextRoot]);

  const handleSelectAll = useCallback(() => {
    if (!root) return;
    applyNextRoot(toggleNode(root, root.id, true));
  }, [root, applyNextRoot]);

  const handleDeselectAll = useCallback(() => {
    if (!root) return;
    applyNextRoot(toggleNode(root, root.id, false));
  }, [root, applyNextRoot]);

  const handleStructureNodeToggle = useCallback((id: string, checked: boolean) => {
    if (!root) return;
    if (structureSameAsFiles) return;
    setRoot(toggleStructureNode(root, id, checked));
  }, [root, structureSameAsFiles]);

  const handleStructureSelectAll = useCallback(() => {
    if (!root) return;
    if (structureSameAsFiles) return;
    setRoot(toggleStructureNode(root, root.id, true));
  }, [root, structureSameAsFiles]);

  const handleStructureDeselectAll = useCallback(() => {
    if (!root) return;
    if (structureSameAsFiles) return;
    setRoot(toggleStructureNode(root, root.id, false));
  }, [root, structureSameAsFiles]);

  const handleStructureSameAsFilesChange = useCallback((checked: boolean) => {
    setStructureSameAsFiles(checked);
    if (checked && root) {
      setRoot(syncStructureSelection(root));
    }
  }, [root]);

  const handleTitleBarMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    getCurrentWindow().startDragging().catch(() => {});
  }, []);

  const handleTitleBarDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    getCurrentWindow().toggleMaximize().catch(() => {});
  }, []);

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
        request: { filePaths, rootName: root.name, tree: root },
      });
      if (result.failedPaths.length > 0)
        setLastError(`${result.failedPaths.length} file(s) could not be read — see ⚠️ blocks in output.`);
      return result.markdown;
    } catch (err) {
      setLastError(String(err));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = useCallback(async () => {
    const markdown = await buildMarkdown();
    if (!markdown) return;
    await writeText(markdown);
  }, [root]); // eslint-disable-line

  const handleSave = useCallback(async () => {
    const markdown = await buildMarkdown();
    if (!markdown || !root) return;
    const savePath = await save({
      defaultPath: `${root.name}-dump.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!savePath) return;
    try {
      await invoke("save_markdown", { path: savePath, content: markdown });
    } catch (err) {
      setLastError(String(err));
    }
  }, [root]); // eslint-disable-line

  const selectedCount = root ? countChecked(root) : 0;
  const hasProject = root !== null || isScanning;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-zinc-100 overflow-hidden">
      {/* ── Title bar ── */}
      <div
        data-tauri-drag-region
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={handleTitleBarDoubleClick}
        className="flex items-center justify-between h-10 px-4 flex-shrink-0 border-b border-white/[0.06] cursor-default"
      >
        <div className="w-44 flex-shrink-0" />
        <div className="flex items-center gap-2.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#7c3aed" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="#7c3aed" opacity="0.5" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="#7c3aed" opacity="0.5" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="#7c3aed" opacity="0.25" />
          </svg>
          <span className="text-[13px] font-semibold tracking-tight text-zinc-300">
            RepoDump
          </span>
          {root && (
            <>
              <span className="text-zinc-700 text-xs">/</span>
              <span className="text-[12px] text-zinc-500 font-mono">{root.name}</span>
            </>
          )}
        </div>

        {/* Reset button — only shown when a project is loaded */}
        {hasProject && (
          <button
            onClick={() => { setRoot(null); setTokenEstimate(null); setLastError(null); }}
            className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            <RotateCcw size={10} />
            New scan
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!hasProject ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <DropZone onPathDropped={handlePathDropped} isScanning={isScanning} />
            </div>
          </div>
        ) : (
          <TwoColumnLayout
            root={root}
            toggles={toggles}
            isScanning={isScanning}
            structureSameAsFiles={structureSameAsFiles}
            onPathDropped={handlePathDropped}
            onTogglesChange={handleTogglesChange}
            onNodeToggle={handleNodeToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onStructureNodeToggle={handleStructureNodeToggle}
            onStructureSelectAll={handleStructureSelectAll}
            onStructureDeselectAll={handleStructureDeselectAll}
            onStructureSameAsFilesChange={handleStructureSameAsFilesChange}
          />
        )}
      </div>

      {/* ── Action bar ── */}
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

// ── Two-column layout ─────────────────────────────────────────────────────

interface TwoColumnProps {
  root: FileNode | null;
  toggles: GlobalToggles;
  isScanning: boolean;
  structureSameAsFiles: boolean;
  onPathDropped: (path: string) => void;
  onTogglesChange: (t: GlobalToggles) => void;
  onNodeToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onStructureNodeToggle: (id: string, checked: boolean) => void;
  onStructureSelectAll: () => void;
  onStructureDeselectAll: () => void;
  onStructureSameAsFilesChange: (checked: boolean) => void;
}

function TwoColumnLayout({
  root, toggles, isScanning, structureSameAsFiles, onPathDropped,
  onTogglesChange, onNodeToggle, onSelectAll, onDeselectAll,
  onStructureNodeToggle, onStructureSelectAll, onStructureDeselectAll,
  onStructureSameAsFilesChange,
}: TwoColumnProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0a0a0b]">

        {/* Compact drop target */}
        <div className="p-3 border-b border-white/[0.06]">
          <DropZone onPathDropped={onPathDropped} isScanning={isScanning} compact />
        </div>

        {/* Tier toggles */}
        <Toggles toggles={toggles} onChange={onTogglesChange} />

        {/* Tier legend */}
        <div className="mt-auto px-3 py-4 border-t border-white/[0.04]">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-700 mb-2.5">
            Tier Legend
          </p>
          <div className="flex flex-col gap-2">
            <LegendRow dot="bg-emerald-500" label="Core Text" desc="Source code, configs" />
            <LegendRow dot="bg-amber-500" label="Token Heavy" desc="Manifests, lock files" />
            <LegendRow dot="bg-red-500" label="Danger Zone" desc=".env, .log, .csv" />
            <LegendRow dot="bg-zinc-700" label="Blacklisted" desc="Binaries, media, .git" />
          </div>
        </div>
      </div>

      {/* Tree panels */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#0c0c0d] relative">
        {root ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 border-b border-white/[0.06]">
              <FileTree
                root={root}
                toggles={toggles}
                onToggle={onNodeToggle}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
                mode="content"
                title="Files to export"
              />
            </div>
            <div className="flex-1 min-h-0">
              <FileTree
                root={root}
                toggles={toggles}
                onToggle={onStructureNodeToggle}
                onSelectAll={onStructureSelectAll}
                onDeselectAll={onStructureDeselectAll}
                mode="structure"
                title="Structure outline"
                sameAsFilesSelected={structureSameAsFiles}
                onSameAsFilesSelectedChange={onStructureSameAsFilesChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 text-zinc-700">
            <FolderOpen size={16} />
            <span className="text-sm">Scanning…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({ dot, label, desc }: { dot: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-[11px] text-zinc-400">{label}</span>
      <span className="text-[10px] text-zinc-700 truncate">{desc}</span>
    </div>
  );
}
