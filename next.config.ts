import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * The repository root (one level above frontend/). The UI imports the pure
 * auction domain from ../backend/src/domain via the `@domain/*` alias, and
 * Turbopack only compiles files inside its root, so the root must include
 * both apps. This also pins file tracing to the repo instead of guessing
 * from lockfiles (frontend/ and backend/ each have one).
 */
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: repositoryRoot,
  },
  outputFileTracingRoot: repositoryRoot,
};

export default nextConfig;
