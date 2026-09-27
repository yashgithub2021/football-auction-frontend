// GENERATED from backend/src/room/constants.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Room-level rules. Auction rules (budgets, bids, timers, pool checks,
 * minimum number of managers) stay in the domain; these only bound the room.
 */

import { MIN_MANAGERS, MS_PER_SECOND } from "../domain/constants";

/** The domain's own minimum, re-exported for room clients. The domain enforces it. */
export const MIN_PLAYING_MANAGERS = MIN_MANAGERS;

/** Most playing managers (the host counts when playing). */
export const MAX_PLAYING_MANAGERS = 12;

/** Most spectators (people who join after the game has started). */
export const MAX_SPECTATORS = 12;

/** Longest display name, after trimming. */
export const MAX_NAME_LENGTH = 24;

/** The "3, 2, 1" part of the start countdown. */
export const COUNTDOWN_SECONDS = 3;
export const COUNTDOWN_NUMBERS_MS = COUNTDOWN_SECONDS * MS_PER_SECOND;

/** How long "GO" is shown before the first player goes up. */
export const GO_DISPLAY_MS = 600;

export const INITIAL_ROOM_VERSION = 1;
