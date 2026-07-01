/// Maps a file extension (or exact filename) to its tier category.
/// Returns None if the file should be completely ignored (Tier 4 blacklist).
use std::path::Path;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Tier {
    /// Always included by default — core source/config text files
    CoreText,
    /// Visible but OFF by default — dependency manifests / lock files
    TokenHeavy,
    /// Visible but OFF by default — warn on manual enable
    DangerZone,
    /// Never shown, never parsed
    Blacklisted,
}

/// Directories that are always hard-ignored (Tier 4).
pub const BLACKLISTED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "target",       // Rust build artifacts
    ".cache",
    "coverage",
    ".turbo",
    ".svelte-kit",
];

// ---------------------------------------------------------------------------
// Tier 1 — Core Text (Default ON)
// ---------------------------------------------------------------------------
const TIER1_EXTENSIONS: &[&str] = &[
    "c", "h", "cpp", "hpp", "py", "java", "kt", "kts",
    "js", "ts", "jsx", "tsx", "html", "css", "scss", "php",
    "go", "rs", "swift", "cs", "rb", "dart", "lua", "sh",
    "ps1", "sql", "xml", "json", "yaml", "yml", "toml", "ini",
    "cfg", "md", "txt", "graphql", "gql", "proto", "ino",
    "vue", "svelte", "astro", "env", // .env without content warning handled via DangerZone
    "r", "jl", "ex", "exs", "erl", "hrl", "clj", "cljs",
    "hs", "ml", "mli", "fs", "fsi", "fsx", "elm", "nim",
    "zig", "v", "odin",
];

/// Exact filenames that are Tier 1 regardless of extension
const TIER1_EXACT: &[&str] = &[
    "Dockerfile",
    ".dockerignore",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".nvmrc",
    ".node-version",
    "Makefile",
    "makefile",
    "GNUmakefile",
    "Justfile",
    "justfile",
    "Procfile",
    ".env.example",
    ".env.template",
    ".env.sample",
];

// ---------------------------------------------------------------------------
// Tier 2 — Token Heavy (Default OFF)
// ---------------------------------------------------------------------------
const TIER2_EXTENSIONS: &[&str] = &[
    "gradle", "cmake", "mk", "tf",
];

/// Exact filenames that are Tier 2
const TIER2_EXACT: &[&str] = &[
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.toml",
    "Cargo.lock",
    "go.mod",
    "go.sum",
    "requirements.txt",
    "pyproject.toml",
    "Pipfile",
    "Pipfile.lock",
    "Gemfile",
    "Gemfile.lock",
    "composer.json",
    "composer.lock",
    "poetry.lock",
    "bun.lockb",
    "flake.lock",
];

// ---------------------------------------------------------------------------
// Tier 3 — Danger Zone (Default OFF, warn on enable)
// ---------------------------------------------------------------------------
const TIER3_EXTENSIONS: &[&str] = &[
    "csv", "log", "patch", "diff", "ipynb",
];

/// Exact filenames that are Tier 3
const TIER3_EXACT: &[&str] = &[
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".env.staging",
];

// ---------------------------------------------------------------------------
// Tier 4 — Blacklist (Always ignored, never shown)
// ---------------------------------------------------------------------------
const TIER4_EXTENSIONS: &[&str] = &[
    // Binary / compiled
    "parquet", "sqlite", "db", "bin", "hex", "elf",
    "plist", "apk", "aab", "ipa",
    // Images
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp",
    "tiff", "tif", "raw", "heic", "avif",
    // Audio / Video
    "mp3", "mp4", "wav", "ogg", "flac", "aac", "m4a",
    "mov", "avi", "mkv", "webm", "flv",
    // Archives
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar", "dmg", "iso",
    // Fonts
    "ttf", "otf", "woff", "woff2", "eot",
    // Office/PDF (binary)
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    // Compiled code / objects
    "o", "a", "so", "dll", "exe", "dylib", "lib", "class",
    "pyc", "pyo", "wasm",
    // Data / model files
    "pt", "pth", "onnx", "pkl", "pickle", "npy", "npz", "h5",
    "hdf5", "safetensors",
    // Lock / cache artifacts
    "lock",  // generic .lock not in tier2 exact list
    "DS_Store",
];

/// Exact filenames that are unconditionally blacklisted
const TIER4_EXACT: &[&str] = &[
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".gitkeep",
    ".keep",
];

// ---------------------------------------------------------------------------
// Public classification function
// ---------------------------------------------------------------------------

pub fn classify_file(path: &Path) -> Tier {
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // 1. Check exact filename matches first (most specific)
    if TIER4_EXACT.contains(&file_name) {
        return Tier::Blacklisted;
    }
    if TIER1_EXACT.contains(&file_name) {
        return Tier::CoreText;
    }
    if TIER2_EXACT.contains(&file_name) {
        return Tier::TokenHeavy;
    }
    if TIER3_EXACT.contains(&file_name) {
        return Tier::DangerZone;
    }

    // 2. Extract extension for extension-based matching
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext.is_empty() {
        // Files with no extension that weren't matched above are ignored
        return Tier::Blacklisted;
    }

    // 3. Tier 4 wins first (hard blacklist)
    if TIER4_EXTENSIONS.contains(&ext.as_str()) {
        return Tier::Blacklisted;
    }

    // 4. Check tiers 1–3 in priority order
    if TIER1_EXTENSIONS.contains(&ext.as_str()) {
        return Tier::CoreText;
    }
    if TIER2_EXTENSIONS.contains(&ext.as_str()) {
        return Tier::TokenHeavy;
    }
    if TIER3_EXTENSIONS.contains(&ext.as_str()) {
        return Tier::DangerZone;
    }

    // 5. Unknown — blacklist by default (safe)
    Tier::Blacklisted
}

/// Returns true if this directory name should be completely skipped during walk
pub fn is_blacklisted_dir(name: &str) -> bool {
    BLACKLISTED_DIRS.contains(&name)
}

/// Map a file extension to a Markdown code fence language tag.
pub fn ext_to_language(path: &Path) -> &'static str {
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    // Exact filename matches
    match file_name {
        "Dockerfile" => return "dockerfile",
        "Makefile" | "makefile" | "GNUmakefile" => return "makefile",
        "Justfile" | "justfile" => return "makefile",
        _ => {}
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        // Systems
        "rs" => "rust",
        "c" => "c",
        "h" => "c",
        "cpp" | "cc" | "cxx" => "cpp",
        "hpp" | "hh" | "hxx" => "cpp",
        "go" => "go",
        "zig" => "zig",
        "nim" => "nim",
        "v" => "v",
        "odin" => "odin",

        // JVM
        "java" => "java",
        "kt" | "kts" => "kotlin",
        "scala" | "sc" => "scala",
        "clj" | "cljs" => "clojure",

        // Scripting
        "py" => "python",
        "rb" => "ruby",
        "lua" => "lua",
        "php" => "php",
        "pl" | "pm" => "perl",
        "r" => "r",
        "jl" => "julia",

        // Functional
        "hs" => "haskell",
        "ml" | "mli" => "ocaml",
        "fs" | "fsi" | "fsx" => "fsharp",
        "ex" | "exs" => "elixir",
        "erl" | "hrl" => "erlang",
        "elm" => "elm",

        // Web
        "js" => "javascript",
        "ts" => "typescript",
        "jsx" => "jsx",
        "tsx" => "tsx",
        "html" | "htm" => "html",
        "css" => "css",
        "scss" | "sass" => "scss",
        "vue" => "vue",
        "svelte" => "svelte",
        "astro" => "astro",
        "graphql" | "gql" => "graphql",

        // Systems / Config
        "swift" => "swift",
        "cs" => "csharp",
        "dart" => "dart",
        "sh" | "bash" | "zsh" => "bash",
        "ps1" => "powershell",
        "ino" => "cpp",

        // Data / Config
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "xml" => "xml",
        "ini" | "cfg" => "ini",
        "sql" => "sql",
        "proto" => "protobuf",

        // Docs
        "md" | "mdx" => "markdown",
        "txt" => "text",

        // IaC / Build
        "tf" => "hcl",
        "cmake" => "cmake",
        "gradle" => "groovy",
        "mk" => "makefile",

        // Danger zone (readable)
        "csv" => "csv",
        "log" => "text",
        "patch" | "diff" => "diff",
        "env" => "bash",
        "ipynb" => "json",

        // Dependency files
        "lock" => "text",

        _ => "text",
    }
}
