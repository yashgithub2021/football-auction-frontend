// GENERATED from backend/src/domain/engine/selection.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import type { GameSettings, Manager, RandomFn } from "../types";
import { getOpenSlots, isManagerActive } from "./bidding";
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

/**
 * Deterministically chooses the manager most in need of a player:
 *   1. most open slots
 *   2. then lowest remaining budget
 *   3. then a random pick (injected RNG) among those still tied
 * Only managers with open slots are considered. Returns null if none.
 */
export function pickNeediestManager(
  managers: readonly Manager[],
  settings: GameSettings,
  random: RandomFn,
): Manager | null {
  const candidates = managers.filter((manager) => isManagerActive(manager, settings));
  if (candidates.length === 0) {
    return null;
  }

  const mostOpenSlots = Math.max(...candidates.map((m) => getOpenSlots(m, settings)));
  const bySlots = candidates.filter((m) => getOpenSlots(m, settings) === mostOpenSlots);

  const lowestBudget = Math.min(...bySlots.map((m) => m.budgetRemaining));
  const tied = bySlots.filter((m) => m.budgetRemaining === lowestBudget);

  if (tied.length === 1) {
    return tied[0] ?? null;
  }
  return tied[randomIndex(tied.length, random)] ?? null;
}
