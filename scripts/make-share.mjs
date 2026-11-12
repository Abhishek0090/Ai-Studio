#!/usr/bin/env node
// AI Studio by Abhishek Pal.
// Builds ai-sass-share/setup-ai-sass.mjs: one self-contained script that creates or updates the
// whole project on another machine (code, config, package-lock.json), plus a sync variant.
// Your secrets (.env.local) and data (data/: database and generated images) are never included.
// Run: npm run share
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const SHARE = "ai-sass-share";
const OUT_DIR = join(ROOT, SHARE);
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git", SHARE, ".sync-backup", ".vercel", "data", ".claude", "drizzle"]);
const SKIP_FILES = [/\.tsbuildinfo$/, /^next-env\.d\.ts$/, /^\.env(?!\.example$)/, /\.log$/, /\.db(-journal|-wal|-shm)?$/];
const BINARY = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2"]);
/** Files from older versions to move aside when updating. Add paths here when you remove or rename a file. */
const OBSOLETE = [];
/** Folders the sync mode makes identical to this version (anything else there is moved to .sync-backup). */
const SYNC_DIRS = ["src", "public", "scripts"];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...walk(full));
    } else if (!SKIP_FILES.some((re) => re.test(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(ROOT)
  .map((full) => relative(ROOT, full).split("\\").join("/"))
  .sort()
  .map((p) => {
    const data = readFileSync(join(ROOT, p));
    const binary = BINARY.has(extname(p).toLowerCase());
    return {
      p,
      e: binary ? "base64" : "utf8",
      c: data.toString(binary ? "base64" : "utf8"),
      h: createHash("sha256").update(data).digest("hex").slice(0, 16),
    };
  });

// Never ship secrets, even if a SKIP rule is edited by mistake.
const leaked = files.filter((f) => /(^|\/)\.env(?!\.example$)/.test(f.p) || f.p.startsWith("data/"));
if (leaked.length) {
  console.error("Refusing to build: these files must not be shared: " + leaked.map((f) => f.p).join(", "));
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const payload = gzipSync(JSON.stringify({ files }), { level: 9 }).toString("base64");
const payloadHash = createHash("sha256").update(payload).digest("hex").slice(0, 16);
const built = new Date().toISOString().slice(0, 16).replace("T", " ");

// The payload sits in comment lines at the end of the script. A paste that gets cut off is still
// valid JavaScript, so the script can report the damage instead of failing with a syntax error.
const payloadLines = payload.match(/.{1,100}/g).map((line) => "//~ " + line);

// Runtime of the generated scripts. Kept as a plain function so it is syntax-checked here too;
// it is serialised with Function.prototype.toString().
//   mode "setup": creates the project (in ./ai-sass) or updates it in place.
//   mode "sync":  only updates an existing project and makes it identical to this version:
//                 files in src, public and scripts that are no longer part of it go to .sync-backup/.
// .env.local and data/ are never touched, so keys, users, coins and creations survive updates.
function run(req, opts, scriptPath) {
  const { PROJECT, TITLE, OBSOLETE, SYNC_DIRS, PAYLOAD_HASH, MODE } = opts;
  const { createHash } = req("node:crypto");
  const { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } = req("node:fs");
  const { dirname, join, relative, resolve } = req("node:path");
  const { gunzipSync } = req("node:zlib");
  const sha = (data) => createHash("sha256").update(data).digest("hex").slice(0, 16);

  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 9)) {
    console.error("Node.js 20.9 or newer is needed (you have " + process.versions.node + "). Install it from https://nodejs.org");
    process.exit(1);
  }

  const damaged = () => {
    console.error("This script is damaged (the paste was probably cut off or changed). Copy it again in full.");
    process.exit(1);
  };
  const lines = readFileSync(scriptPath, "utf8").split(/\r?\n/);
  if (!lines.some((l) => l.trim() === "//~END")) damaged();
  const payload = lines
    .filter((l) => l.startsWith("//~ "))
    .map((l) => l.slice(4).trim())
    .join("");
  if (sha(payload) !== PAYLOAD_HASH) damaged();
  let files = [];
  try {
    files = JSON.parse(gunzipSync(Buffer.from(payload, "base64")).toString("utf8")).files;
  } catch {
    damaged();
  }

  const isProject = (dir) => {
    try {
      return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name === PROJECT;
    } catch {
      return false;
    }
  };
  const base = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const target = isProject(base) ? base : join(base, PROJECT);
  const fresh = !isProject(target);
  if (fresh && MODE === "sync") {
    console.error("Could not find the " + PROJECT + " project in: " + base);
    console.error("Run this inside the project folder (the one with package.json), or pass the path as an argument.");
    console.error("For a new laptop use setup-" + PROJECT + ".mjs instead.");
    process.exit(1);
  }
  if (fresh && existsSync(join(target, "package.json"))) {
    console.error("A different project already exists in " + target + ". Run this somewhere else.");
    process.exit(1);
  }
  console.log(TITLE + " - " + (MODE === "sync" ? "FULL SYNC" : fresh ? "creating project" : "updating project"));
  console.log("Folder: " + target + "\n");
  const hashOf = (p) => (existsSync(join(target, p)) ? sha(readFileSync(join(target, p))) : "none");
  const depsBefore = hashOf("package.json") + hashOf("package-lock.json");
  const schemaBefore = hashOf("src/db/schema.ts");

  // Old files are moved, never deleted, so local work can be recovered.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const stash = (p) => {
    const dest = join(target, ".sync-backup", stamp, p);
    mkdirSync(dirname(dest), { recursive: true });
    renameSync(join(target, p), dest);
    console.log("  moved    " + p + "  ->  .sync-backup/" + stamp + "/");
  };

  let written = 0;
  let unchanged = 0;
  let removed = 0;
  for (const f of files) {
    const dest = join(target, f.p);
    const data = Buffer.from(f.c, f.e);
    if (existsSync(dest) && readFileSync(dest).equals(data)) {
      unchanged++;
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, data);
    written++;
    console.log("  wrote    " + f.p);
  }
  const stale = new Set(OBSOLETE.filter((p) => existsSync(join(target, p))));
  if (MODE === "sync") {
    const keep = new Set(files.map((f) => f.p));
    const walk = (dir) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else {
          const p = relative(target, full).split("\\").join("/");
          if (!keep.has(p)) stale.add(p);
        }
      }
    };
    for (const dir of SYNC_DIRS) walk(join(target, dir));
  }
  for (const p of stale) {
    stash(p);
    removed++;
  }

  const bad = files.filter((f) => {
    const dest = join(target, f.p);
    return !existsSync(dest) || sha(readFileSync(dest)) !== f.h;
  });
  console.log("\nDone: " + written + " written, " + unchanged + " already up to date, " + removed + " old files moved to .sync-backup.");
  if (bad.length) {
    console.error("WARNING: these files are missing or did not verify: " + bad.map((f) => f.p).join(", "));
    process.exit(1);
  }
  console.log("All " + files.length + " files verified. Your .env.local and data/ folder were not touched.\n");

  const depsChanged = depsBefore !== hashOf("package.json") + hashOf("package-lock.json");
  const schemaChanged = !fresh && schemaBefore !== hashOf("src/db/schema.ts");
  const needsSetup = !existsSync(join(target, ".env.local"));
  console.log("Next:");
  if (base !== target) console.log('  cd "' + target + '"');
  if (!existsSync(join(target, "node_modules")) || depsChanged) {
    console.log("  npm install" + (depsChanged && !fresh ? "      (dependencies changed)" : ""));
  }
  if (needsSetup) console.log("  npm run setup    (creates .env.local and the database)");
  else if (schemaChanged) console.log("  npm run db:push  (database schema changed)");
  console.log("  npm run dev      -> http://localhost:3000");
}

const TITLE = "AI Studio (by Abhishek Pal)";
const HEADERS = {
  setup: [
    `// AI Studio by Abhishek Pal - setup / update script (${files.length} files, built ${built} UTC).`,
    "// New machine:  put this file in any folder and run  node setup-ai-sass.mjs",
    '//               it creates an "ai-sass" folder there.',
    "// Update:       run it inside the existing ai-sass folder (the one with package.json).",
    "// Then:         npm install,  npm run setup  (first time only),  npm run dev",
    "// Never contains or changes .env.local (your keys) or data/ (database and generated files).",
  ],
  sync: [
    `// AI Studio by Abhishek Pal - FULL SYNC (${files.length} files, built ${built} UTC).`,
    "// Makes an existing project identical to this version, whatever version it had before.",
    "// Run inside the project folder (the one with package.json):  node sync-ai-sass.mjs",
    "// Files in src, public and scripts that are no longer part of the project are moved to .sync-backup/.",
    "// Never contains or changes .env.local (your keys) or data/ (database and generated files).",
  ],
};

function buildScript(mode) {
  const opts = { PROJECT: pkg.name, TITLE, OBSOLETE, SYNC_DIRS, PAYLOAD_HASH: payloadHash, MODE: mode };
  return [
    "#!/usr/bin/env node",
    ...HEADERS[mode],
    'import { createRequire } from "node:module";',
    'import { fileURLToPath } from "node:url";',
    "",
    run.toString(),
    "",
    `run(createRequire(import.meta.url), ${JSON.stringify(opts)}, fileURLToPath(import.meta.url));`,
    "",
    "// ---- compressed project files (do not edit below this line) ----",
    ...payloadLines,
    "//~END",
    "",
  ].join("\n");
}

mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, "setup-ai-sass.mjs");
writeFileSync(outFile, buildScript("setup"));
writeFileSync(join(OUT_DIR, "sync-ai-sass.mjs"), buildScript("sync"));
const sizeKb = Math.round(statSync(outFile).size / 1024);

writeFileSync(
  join(OUT_DIR, "HOW-TO-SETUP.md"),
  `# AI Studio - set up or update on another laptop

By Abhishek Pal. An AI SaaS app: image gen, video gen, shorts gen and code gen, paid with coins
(Razorpay), with light and dark mode, and installable as an app (PWA).

Built ${built} UTC. Both scripts contain the whole project compressed, including \`package-lock.json\`,
and check every file after writing. They never include or change \`.env.local\` (API keys) or
\`data/\` (the database and generated images), so each laptop keeps its own keys, users and coins.

| Script | Use it for |
| --- | --- |
| \`setup-ai-sass.mjs\` (${sizeKb} KB) | New laptop: creates the \`ai-sass\` folder |
| \`sync-ai-sass.mjs\` (${sizeKb} KB) | Existing copy, any older version: makes it identical to this version |

## New laptop

1. Install Node.js 20.9 or newer (\`node -v\` to check).
2. Put \`setup-ai-sass.mjs\` in any folder (for example Downloads) and open a terminal there.
3. Run:

   \`\`\`bash
   node setup-ai-sass.mjs
   cd ai-sass
   npm install
   npm run setup
   npm run dev
   \`\`\`

4. Open http://localhost:3000, create an account, and you start with 100 free coins.

\`npm run setup\` creates \`.env.local\` with a fresh secret and creates the database. Everything works
without API keys (demo mode). To make the AI real, add free keys to \`.env.local\`; the project
README lists where to get each one.

## Update an existing copy (sync)

1. Copy \`sync-ai-sass.mjs\` into the \`ai-sass\` folder (the one with \`package.json\` and \`src\`).
2. Run \`node sync-ai-sass.mjs\`. It ends with \`All ${files.length} files verified.\`
3. Follow the "Next" lines it prints:
   - \`npm install (dependencies changed)\`: run \`npm install\`.
   - \`npm run db:push (database schema changed)\`: run it to update the database tables.
   - Then \`npm run dev\`.

Files in \`src\`, \`public\` or \`scripts\` that are no longer part of the project are moved to
\`.sync-backup/<date>/\`, not deleted. Delete that folder once you've checked nothing in it is yours.

If it says \`Could not find the ai-sass project\`, you are in the wrong folder: \`cd\` into it,
or pass the path: \`node sync-ai-sass.mjs "C:\\path\\to\\ai-sass"\`.

Afterwards:

\`\`\`bash
git add .
git commit -m "Sync with latest version"
\`\`\`

Delete the sync file from the project folder afterwards.

## Sharing through codeshare or chat

Paste the whole file into a new file named \`setup-ai-sass.mjs\`.
If it says \`This script is damaged\`, the paste was cut off: copy it again in full.

## Test as an installable app (PWA)

The service worker only runs in a production build:

\`\`\`bash
npm run build
npm start          # http://localhost:3000
\`\`\`

Browsers only allow installing over HTTPS or on localhost. On a phone, open the deployed site in
Chrome on Android and tap "Install app", or on iPhone use Share, then "Add to Home Screen".

## Notes

- Not included: \`node_modules\`, \`.next\` (rebuilt by npm), \`.env.local\` and \`data/\` (kept per laptop).
- Rebuild these scripts after changes with \`npm run share\`.
- The demo checkout (coins without paying) works under \`npm run dev\`. Production builds need Razorpay
  test keys, or \`ALLOW_MOCK_PAYMENTS=true\` in \`.env.local\` for a demo.
`,
);
console.log(`Wrote setup-ai-sass.mjs and sync-ai-sass.mjs (${files.length} files, ${sizeKb} KB each) and HOW-TO-SETUP.md in ${relative(ROOT, OUT_DIR)}`);
