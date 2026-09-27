// GENERATED from backend/src/domain/engine/selection.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import type { RandomFn } from "../types";
import { randomIndex } from "./random";

/** Picks a random player id from the available pool, or null if it is empty. */
export function selectRandomPlayer(
  availablePlayerIds: readonly string[],
  random: RandomFn,
): string | null {
  if (availablePlayerIds.length === 0) {
    return null;
  }
  return availablePlayerIds[randomIndex(availablePlayerIds.length, random)] ?? null;
}
