// GENERATED from backend/src/domain/engine/selection.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import type { GameSettings, RandomFn } from "../types";
import { getPlayerById } from "../players/players";
import { getPositionGroup, type PositionGroup } from "../players/positions";
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

const POSITION_ORDER: readonly PositionGroup[] = ["GK", "DEF", "MID", "ATT"];

export function selectPlayer(
  availablePlayerIds: readonly string[],
  settings: Pick<GameSettings, "auctionOrder">,
  random: RandomFn,
): string | null {
  if (settings.auctionOrder === "RANDOM") return selectRandomPlayer(availablePlayerIds, random);
  for (const group of POSITION_ORDER) {
    const playersInGroup = availablePlayerIds.filter((id) => {
      const player = getPlayerById(id);
      return player !== undefined && getPositionGroup(player.primaryPosition) === group;
    });
    if (playersInGroup.length > 0) {
      return playersInGroup[randomIndex(playersInGroup.length, random)] ?? null;
    }
  }
  return null;
}
