// import { useCallback, useState } from "react";
// import { FolderOpen, Upload } from "lucide-react";

// interface DropZoneProps {
//   onPathDropped: (path: string) => void;
//   isScanning: boolean;
// }

// export function DropZone({ onPathDropped, isScanning }: DropZoneProps) {
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragError, setDragError] = useState<string | null>(null);

//   const handleDragOver = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(true);
//     setDragError(null);
//   }, []);

//   const handleDragLeave = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(false);
//   }, []);

//   const handleDrop = useCallback(
//     (e: React.DragEvent) => {
//       e.preventDefault();
//       e.stopPropagation();
//       setIsDragging(false);
//       setDragError(null);

//       const items = Array.from(e.dataTransfer.items);
//       const fileEntry = items.find(
//         (item) => item.kind === "file"
//       );

//       if (!fileEntry) {
//         setDragError("No file or folder detected. Try again.");
//         return;
//       }

//       // Use the webkitGetAsEntry API to detect directories
//       const entry = fileEntry.webkitGetAsEntry?.();
//       if (entry && !entry.isDirectory) {
//         setDragError("Drop a folder, not a file.");
//         return;
//       }

//       // Tauri exposes the real FS path via dataTransfer.files
//       const file = e.dataTransfer.files[0];
//       if (!file) {
//         setDragError("Could not read the dropped item.");
//         return;
//       }

//       // On macOS with Tauri, file.path contains the absolute path
//       const path = (file as any).path as string | undefined;
//       if (!path) {
//         setDragError(
//           "Could not retrieve the path. Make sure you dropped a folder."
//         );
//         return;
//       }

//       onPathDropped(path);
//     },
//     [onPathDropped]
//   );

//   return (
//     <div
//       onDragOver={handleDragOver}
//       onDragLeave={handleDragLeave}
//       onDrop={handleDrop}
//       className={[
//         "relative flex flex-col items-center justify-center",
//         "w-full h-full min-h-[320px] rounded-2xl",
//         "border-2 border-dashed transition-all duration-200 cursor-default select-none",
//         isDragging
//           ? "border-violet-500 bg-violet-500/5 scale-[1.01]"
//           : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900",
//         isScanning ? "pointer-events-none opacity-60" : "",
//       ].join(" ")}
//     >
//       {/* Glow ring when dragging */}
//       {isDragging && (
//         <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500/30 pointer-events-none" />
//       )}

//       {isScanning ? (
//         <ScanningState />
//       ) : (
//         <IdleState isDragging={isDragging} dragError={dragError} />
//       )}
//     </div>
//   );
// }

// function IdleState({
//   isDragging,
//   dragError,
// }: {
//   isDragging: boolean;
//   dragError: string | null;
// }) {
//   return (
//     <div className="flex flex-col items-center gap-4 p-8 text-center pointer-events-none">
//       <div
//         className={[
//           "flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200",
//           isDragging
//             ? "bg-violet-500/20 text-violet-400"
//             : "bg-zinc-800 text-zinc-500",
//         ].join(" ")}
//       >
//         {isDragging ? (
//           <FolderOpen size={28} />
//         ) : (
//           <Upload size={28} />
//         )}
//       </div>

//       <div className="flex flex-col gap-1">
//         <p
//           className={[
//             "text-base font-medium transition-colors duration-200",
//             isDragging ? "text-violet-300" : "text-zinc-300",
//           ].join(" ")}
//         >
//           {isDragging ? "Release to scan" : "Drop a folder here"}
//         </p>
//         <p className="text-sm text-zinc-600">
//           {isDragging
//             ? "We'll filter and categorise every file"
//             : "Drag any project directory to get started"}
//         </p>
//       </div>

//       {dragError && (
//         <p className="text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg">
//           {dragError}
//         </p>
//       )}

//       <div className="flex gap-2 mt-1">
//         {["Rust", "TypeScript", "Python", "Go"].map((lang) => (
//           <span
//             key={lang}
//             className="text-[11px] text-zinc-600 bg-zinc-800/80 px-2 py-0.5 rounded-md font-mono"
//           >
//             {lang}
//           </span>
//         ))}
//         <span className="text-[11px] text-zinc-600 px-1">+ more</span>
//       </div>
//     </div>
//   );
// }

// function ScanningState() {
//   return (
//     <div className="flex flex-col items-center gap-4 pointer-events-none">
//       <div className="relative flex items-center justify-center w-16 h-16">
//         {/* Spinning ring */}
//         <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
//         <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
//         <FolderOpen size={22} className="text-violet-400" />
//       </div>
//       <div className="flex flex-col items-center gap-1">
//         <p className="text-sm font-medium text-zinc-300">Scanning directory…</p>
//         <p className="text-xs text-zinc-600">
//           Applying tier filters, building tree
//         </p>
//       </div>
//     </div>
//   );
// }

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Upload, FolderSearch } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

interface DropZoneProps {
  onPathDropped: (path: string) => void;
  isScanning: boolean;
}

export function DropZone({ onPathDropped, isScanning }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  // ── Tauri native drag-and-drop listener ──────────────────────────────────
  // The browser dataTransfer API does NOT expose real FS paths inside
  // Tauri's WKWebView on macOS. We must use Tauri's own window event instead.
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const win = getCurrentWindow();

      unlisten = await win.onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setIsDragging(true);
          setDragError(null);
          return;
        }

        if (event.payload.type === "leave") {
          setIsDragging(false);
          return;
        }

        if (event.payload.type === "drop") {
          setIsDragging(false);

          const paths: string[] = event.payload.paths ?? [];

          if (paths.length === 0) {
            setDragError("No path received. Try the 'Open Folder' button instead.");
            return;
          }

          // Take the first dropped path — we only support one root at a time
          const droppedPath = paths[0];
          onPathDropped(droppedPath);
        }
      });
    };

    setup().catch(console.error);

    return () => {
      unlisten?.();
    };
  }, [onPathDropped]);

  // ── Native folder picker (fallback) ──────────────────────────────────────
  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select a project folder",
      });

      if (typeof selected === "string" && selected.length > 0) {
        onPathDropped(selected);
      }
    } catch (err) {
      setDragError(String(err));
    }
  }, [onPathDropped]);

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center",
        "w-full h-full min-h-[320px] rounded-2xl",
        "border-2 border-dashed transition-all duration-200 cursor-default select-none",
        isDragging
          ? "border-violet-500 bg-violet-500/5 scale-[1.01]"
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900",
        isScanning ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      {/* Glow ring when dragging */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500/30 pointer-events-none" />
      )}

      {isScanning ? (
        <ScanningState />
      ) : (
        <IdleState
          isDragging={isDragging}
          dragError={dragError}
          onOpenFolder={handleOpenFolder}
        />
      )}
    </div>
  );
}

// ── Idle state UI ─────────────────────────────────────────────────────────

function IdleState({
  isDragging,
  dragError,
  onOpenFolder,
}: {
  isDragging: boolean;
  dragError: string | null;
  onOpenFolder: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div
        className={[
          "flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200 pointer-events-none",
          isDragging
            ? "bg-violet-500/20 text-violet-400"
            : "bg-zinc-800 text-zinc-500",
        ].join(" ")}
      >
        {isDragging ? <FolderOpen size={28} /> : <Upload size={28} />}
      </div>

      <div className="flex flex-col gap-1 pointer-events-none">
        <p
          className={[
            "text-base font-medium transition-colors duration-200",
            isDragging ? "text-violet-300" : "text-zinc-300",
          ].join(" ")}
        >
          {isDragging ? "Release to scan" : "Drop a folder here"}
        </p>
        <p className="text-sm text-zinc-600">
          {isDragging
            ? "We'll filter and categorise every file"
            : "Drag any project directory to get started"}
        </p>
      </div>

      {/* Open folder button */}
      {!isDragging && (
        <button
          onClick={onOpenFolder}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium",
            "text-zinc-400 bg-zinc-800 border border-zinc-700",
            "hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600",
            "transition-all duration-150 focus:outline-none focus-visible:ring-2",
            "focus-visible:ring-violet-500",
          ].join(" ")}
        >
          <FolderSearch size={13} />
          Open Folder
        </button>
      )}

      {dragError && (
        <p className="text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg pointer-events-none">
          {dragError}
        </p>
      )}

      <div className="flex gap-2 mt-1 pointer-events-none">
        {["Rust", "TypeScript", "Python", "Go"].map((lang) => (
          <span
            key={lang}
            className="text-[11px] text-zinc-600 bg-zinc-800/80 px-2 py-0.5 rounded-md font-mono"
          >
            {lang}
          </span>
        ))}
        <span className="text-[11px] text-zinc-600 px-1">+ more</span>
      </div>
    </div>
  );
}

// ── Scanning spinner ──────────────────────────────────────────────────────

function ScanningState() {
  return (
    <div className="flex flex-col items-center gap-4 pointer-events-none">
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
        <FolderOpen size={22} className="text-violet-400" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-zinc-300">Scanning directory…</p>
        <p className="text-xs text-zinc-600">Applying tier filters, building tree</p>
      </div>
    </div>
  );
}
