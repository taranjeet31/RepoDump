<div align="center">

# 📦 RepoDump

### Turn any codebase into one clean, LLM-ready Markdown file — in one drop.

[![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/repo-dump?style=flat-square)](https://github.com/taranjeet31/RepoDump/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/taranjeet31/RepoDump/release.yml?style=flat-square)](https://github.com/taranjeet31/RepoDump/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-24C8DB?style=flat-square&logo=tauri)](https://tauri.app)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-informational?style=flat-square)](#-installation)

</div>

---

## Why RepoDump?

If you've ever fed a codebase to an LLM, you know the drill: open ten files, copy, paste, re-paste when you miss one, and hope you didn't just blow your context window on `package-lock.json`.

**RepoDump kills that workflow.** Drag a folder in, pick the files that matter, and get back a single, clean Markdown file — complete with a folder tree, a table of contents, and a live token counter — ready to paste straight into Claude, ChatGPT, or any LLM. Direct download link for MacOS : [MacOS](https://github.com/taranjeet31/RepoDump/releases/download/v1.0.0/RepoDump_0.1.0_aarch64.dmg) 

Direct download link for Windows : [Win](https://github.com/taranjeet31/RepoDump/releases/download/v1.0.0/RepoDump_0.1.0_x64-setup.exe)

## ✨ Features

- **Drag-and-drop or folder picker** — point it at any project and it scans instantly
- **Smart 4-tier filtering** so noise never reaches your context window:
  - **Tier 1 — Core Text** (on by default): source code, configs, docs
  - **Tier 2 — Token Heavy** (off by default): lockfiles, `package.json`, `Cargo.lock` — huge and rarely useful to an LLM
  - **Tier 3 — Danger Zone** (off by default, warns before enabling): `.env`, `.csv`, `.log`, `.ipynb` — files that may contain secrets or bulky data
  - **Tier 4 — Blacklist** (always hidden): `node_modules`, `.git`, `dist`, `target`, binaries, media, archives
- **Live token estimation** with a color-coded meter so you know exactly how much of your context window you're spending
- **One-click copy or save** — copy the generated Markdown straight to your clipboard, or save it as a `.md` file
- **Clean, readable output** — a folder tree, a table of contents, and every file fenced with its language and size
- **10 MB per-file cap & binary detection** — large or binary files are skipped automatically so they never corrupt your output
- **Fast, native, and lightweight** — built with Tauri, so it's a tiny binary with a real filesystem, not an Electron app

## 📸 Screenshots
![Screenshot1](<https://ik.imagekit.io/fecjge5sq/ss01.jpg>) ![Screenshot2](<https://ik.imagekit.io/fecjge5sq/ss02.jpg>) ![Screenshot3](<https://ik.imagekit.io/fecjge5sq/ss03.jpg>)

## 📥 Installation

Pre-built binaries are published on the [Releases page](https://github.com/YOUR_USERNAME/repo-dump/releases/latest) for every platform:

| Platform | Download | Notes |
|---|---|---|
| **macOS** (Apple Silicon) | `RepoDump_*_aarch64.dmg` | M1/M2/M3 Macs |
| **macOS** (Intel) | `RepoDump_*_x64.dmg` | Intel Macs |
| **Windows** | `RepoDump_*_x64-setup.exe` or `.msi` | Windows 10/11 |
| **Linux** | `RepoDump_*.AppImage` | Portable, no install needed — `chmod +x` and run |
| **Linux** | `RepoDump_*.deb` | Debian/Ubuntu-based distros |

> **macOS note:** the app isn't notarized with an Apple Developer certificate yet, so Gatekeeper will block the first launch. Right-click → **Open**, or run:
> ```bash
> xattr -cr /Applications/RepoDump.app
> ```

> **Linux note:** the clipboard "copy" feature depends on your system having an X11/XWayland clipboard tool available (`libxdo` is bundled at build time — no extra setup needed at runtime on most distros).

## 🛠️ Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS:

<details>
<summary><strong>macOS</strong></summary>

```bash
xcode-select --install
```
</details>

<details>
<summary><strong>Windows</strong></summary>

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++ workload)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on Windows 11, and most Windows 10 machines)
</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev
```
</details>

### Clone & run

```bash
git clone https://github.com/YOUR_USERNAME/repo-dump.git
cd repo-dump

# install frontend dependencies
npm install

# run in dev mode (hot-reloads the React frontend + Rust backend)
# for Mac
cargo tauri dev

# for Windows
npm run tauri dev
```

### Build a release binary

```bash
# To build on Mac
cargo tauri build

# To build in Windows
npm run tauri build
```

This produces a native installer for whatever OS you run it on:

| You ran it on | You get |
|---|---|
| macOS | `.app` + `.dmg` in `src-tauri/target/release/bundle/` |
| Windows | `.msi` + `.exe` (NSIS) in `src-tauri/target/release/bundle/` |
| Linux | `.AppImage` + `.deb` in `src-tauri/target/release/bundle/` |

> Cross-compiling a Windows/Linux build *from* macOS (or vice versa) isn't officially supported by Tauri — that's what the [CI workflow](.github/workflows/release.yml) is for. Push a tag like `v0.1.0` and GitHub Actions builds all three platforms for you.

### Project structure

```
repo-dump/
├── src/                        # React frontend
│   ├── components/
│   │   ├── ActionBar.tsx       # Export controls + token meter
│   │   ├── DropZone.tsx        # Drag-and-drop + folder picker
│   │   ├── FileTree.tsx        # Tree container + danger modal
│   │   ├── FileTreeNode.tsx    # Recursive tree node
│   │   └── Toggles.tsx         # Tier 2/3 global toggles
│   ├── lib/types.ts            # Shared TS types + tree helpers
│   └── App.tsx                 # Root component + state
│
└── src-tauri/
    └── src/
        ├── commands/
        │   ├── scan.rs         # scan_directory, scan_directory_flat
        │   └── generate.rs     # generate_markdown, estimate_tokens, save_markdown
        ├── filters/tiers.rs    # 4-tier classification, ext → language map
        └── lib.rs              # Tauri builder + invoke_handler
```

## 🚀 Releasing (for maintainers)

Bump the version in `src-tauri/tauri.conf.json`, commit, then:

```bash
git tag v0.1.1
git push origin v0.1.1
```

The [release workflow](.github/workflows/release.yml) picks up the tag, builds macOS (arm64 + x64), Windows, and Linux, and publishes a draft GitHub Release with all installers attached.

## Limitations

- **10 MB per-file cap** — larger files are skipped with a warning block in the output
- **Binary detection** — the first 8 KB of each file is scanned for null bytes; binaries are skipped gracefully
- **Single root** — RepoDump scans one directory at a time; drop a new folder to replace the current scan

## License

MIT
