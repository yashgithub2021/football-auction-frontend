#!/usr/bin/env node
/**
 * Copies the backend code the frontend shares (types, player data, display
 * selectors, the wire protocol and the results types) into src/shared, so
 * the frontend repo builds on its own (e.g. on Vercel) without ../backend.
 *
 *   node scripts/sync-shared.mjs          write src/shared from ../backend/src
 *   node scripts/sync-shared.mjs --check  fail if src/shared differs from ../backend/src
 *
 * The backend stays the source of truth: never edit src/shared by hand.
 * Without a ../backend checkout (a standalone clone, CI, Vercel) --check
 * skips with a notice and the committed copy is used as-is.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendSrc = join(frontendRoot, "..", "backend", "src");
const sharedRoot = join(frontendRoot, "src", "shared");

/** Whole folders, and the only two room files the protocol needs (the room reducer stays server-only). */
const SHARED_DIRS = ["domain", "results", "protocol"];
const SHARED_FILES = ["room/types.ts", "room/constants.ts"];

const isShipped = (path) => path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith("testUtils.ts");

function listTs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listTs(path) : isShipped(path) ? [path] : [];
  });
}

function header(relPath) {
  return `// GENERATED from backend/src/${relPath} by scripts/sync-shared.mjs. Do not edit: change the backend, then run \`npm run sync:shared\`.\n`;
}

/** Map of shared path (posix, relative to src/shared) → expected file content. */
function expectedFiles() {
  const files = new Map();
  const add = (absolute) => {
    const rel = relative(backendSrc, absolute).split(sep).join("/");
    files.set(rel, header(rel) + readFileSync(absolute, "utf8"));
  };
  for (const dir of SHARED_DIRS) listTs(join(backendSrc, dir)).forEach(add);
  for (const file of SHARED_FILES) add(join(backendSrc, file));
  return files;
}

function currentFiles() {
  if (!existsSync(sharedRoot)) return new Map();
  return new Map(
    listTs(sharedRoot).map((absolute) => [relative(sharedRoot, absolute).split(sep).join("/"), readFileSync(absolute, "utf8")]),
  );
}

const checkOnly = process.argv.includes("--check");

if (!existsSync(backendSrc)) {
  const message = `sync-shared: no backend at ${relative(frontendRoot, backendSrc)}; using the committed src/shared.`;
  if (checkOnly) {
    console.log(message);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

const expected = expectedFiles();

if (checkOnly) {
  const current = currentFiles();
  const problems = [];
  for (const [path, content] of expected) {
    if (!current.has(path)) problems.push(`missing  ${path}`);
    else if (current.get(path) !== content) problems.push(`differs  ${path}`);
  }
  for (const path of current.keys()) if (!expected.has(path)) problems.push(`extra    ${path}`);
  if (problems.length > 0) {
    console.error(`src/shared is out of date with backend/src:\n  ${problems.join("\n  ")}\nRun: npm run sync:shared --prefix frontend`);
    process.exit(1);
  }
  console.log(`sync-shared: src/shared matches backend/src (${expected.size} files).`);
} else {
  rmSync(sharedRoot, { recursive: true, force: true });
  for (const [path, content] of expected) {
    const target = join(sharedRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  console.log(`sync-shared: wrote ${expected.size} files to src/shared.`);
}
