// GENERATED from backend/src/room/playerFilter.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * The host's position filter for the remaining player pool, shown while the
 * auction is paused. It is room state (so every client sees the same filter)
 * but only a VIEW of the domain's pool: it never removes, sells or reorders
 * players, and never influences which player is drawn next.
 */

import { PLAYERS_BY_ID } from "../domain/players/players";
import { POSITION_GROUPS, getPositionGroup } from "../domain/players/positions";
import type { Game } from "../domain/types";

export const PLAYER_FILTERS = ["ALL", ...POSITION_GROUPS] as const;

/** ALL, or one broad position group (by a player's primary position). */
export type PlayerFilter = (typeof PLAYER_FILTERS)[number];

export const DEFAULT_PLAYER_FILTER: PlayerFilter = "ALL";

const FILTER_SET: ReadonlySet<string> = new Set(PLAYER_FILTERS);

export function isPlayerFilter(value: unknown): value is PlayerFilter {
  return typeof value === "string" && FILTER_SET.has(value);
}

/**
 * The ids of the players still waiting to be auctioned (the domain's
 * `availablePlayerIds`) that match the filter, in pool order. Returns a new
 * array; the game is only read.
 */
export function filterAvailablePlayers(game: Game, filter: PlayerFilter): string[] {
  if (filter === "ALL") return [...game.availablePlayerIds];
  return game.availablePlayerIds.filter((playerId) => {
    const player = PLAYERS_BY_ID.get(playerId);
    return player !== undefined && getPositionGroup(player.primaryPosition) === filter;
  });
}
