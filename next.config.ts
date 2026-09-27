import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * This app builds on its own: the backend code it shares (domain types and
 * data, the wire protocol, results types) is a generated copy in src/shared
 * (see scripts/sync-shared.mjs), so nothing outside this folder is compiled.
 * The root is pinned to this folder so Next.js doesn't guess from lockfiles
 * in parent folders.
 */
const appRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: appRoot,
  },
  outputFileTracingRoot: appRoot,
};

export default nextConfig;
