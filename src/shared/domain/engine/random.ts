// GENERATED from backend/src/domain/engine/random.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import type { RandomFn } from "../types";

const UINT32_RANGE = 4294967296; // 2^32
const MULBERRY_INCREMENT = 0x6d2b79f5;

/**
 * Deterministic PRNG (mulberry32). Used by tests and anywhere reproducible
 * randomness is useful. The UI layer passes Math.random in production.
 */
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** Maps a random float in [0, 1) to an index in [0, length). */
export function randomIndex(length: number, random: RandomFn): number {
  if (length <= 0) {
    throw new Error("randomIndex requires a positive length");
  }
  const index = Math.floor(random() * length);
  // Guard against RNGs that return exactly 1 or slightly out-of-range values.
  return Math.min(Math.max(index, 0), length - 1);
}
