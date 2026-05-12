/**
 * Prepares Cloudflare Pages assets directory for OpenNext deployment.
 *
 * OpenNext builds to .open-next/ with this structure:
 *   worker.js             ← entry point (becomes _worker.js)
 *   cloudflare/           ← CF-specific runtime modules
 *   middleware/           ← middleware bundle
 *   .build/               ← durable objects, etc.
 *   server-functions/     ← SSR handler
 *   assets/               ← static files served by Pages
 *
 * Cloudflare Pages (advanced mode) expects _worker.js + its relative imports
 * to all live inside the assets output directory.
 */

import fs from "fs";
import path from "path";

const ROOT = ".open-next";
const ASSETS = path.join(ROOT, "assets");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      // Recreate the symlink (don't follow it — avoids EISDIR on linked dirs)
      const target = fs.readlinkSync(srcPath);
      try { fs.symlinkSync(target, destPath); } catch (e) { if (e.code !== "EEXIST") throw e; }
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy entry-point worker as _worker.js
const workerSrc = path.join(ROOT, "worker.js");
const workerDest = path.join(ASSETS, "_worker.js");
fs.copyFileSync(workerSrc, workerDest);
console.log("✓ _worker.js copied to assets");

// 2. Copy all support directories that _worker.js imports from
const supportDirs = ["cloudflare", "middleware", ".build", "server-functions"];
for (const dir of supportDirs) {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(ASSETS, dir));
    console.log(`✓ ${dir}/ copied to assets`);
  }
}

console.log("Done — assets ready for Cloudflare Pages deployment.");
