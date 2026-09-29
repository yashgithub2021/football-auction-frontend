// GENERATED from backend/src/domain/constants.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Auction rule constants.
 *
 * Documented assumptions (confirmed with the product owner):
 * - A manager is "active" while they have open squad slots.
 * - Maximum safe bid = budgetRemaining − (openSlots − 1) × minimumBid, so a
 *   manager can always complete their squad at the minimum bid.
 * - Quick bids: with no bids yet the amount is max(minimumBid, step); otherwise
 *   currentBid + max(step, bidIncrement). This guarantees the minimum legal
 *   bid is always reachable from the buttons (V1 has no custom amounts).
 * - The current highest bidder cannot outbid themselves.
 * - Bids are processed sequentially; with near-simultaneous bids the first
 *   wins and the second is rejected (BELOW_INCREMENT / ALREADY_HIGHEST_BIDDER).
 * - A bid at or after endsAt is rejected as AUCTION_EXPIRED.
 * - A player joins a squad only through a winning bid. A lot with no bids is
 *   UNSOLD: the player is discarded, nobody gets them and no budget moves.
 *   Open slots or a small remaining pool never allocate a player.
 * - Every lot is a normal auction, even when only one manager has open slots.
 * - The game completes when every squad is full or the pool is exhausted;
 *   squads may finish incomplete.
 * - Timestamps are absolute (endsAt, revealEndsAt) so state survives reloads.
 */

import type { GameSettings } from "./types";

export const DEFAULT_STARTING_BUDGET = 20;
export const DEFAULT_TEAM_SIZE = 6;
export const DEFAULT_MINIMUM_BID = 1;
export const DEFAULT_BID_INCREMENT = 1;
export const MS_PER_SECOND = 1000;

/** The auction timer is configured in whole seconds within this range. */
export const DEFAULT_AUCTION_TIMER_SECONDS = 3;
export const MIN_AUCTION_TIMER_SECONDS = 1;
export const MAX_AUCTION_TIMER_SECONDS = 30;

export const DEFAULT_AUCTION_TIMER_MS = DEFAULT_AUCTION_TIMER_SECONDS * MS_PER_SECOND;
export const MIN_AUCTION_TIMER_MS = MIN_AUCTION_TIMER_SECONDS * MS_PER_SECOND;
export const MAX_AUCTION_TIMER_MS = MAX_AUCTION_TIMER_SECONDS * MS_PER_SECOND;

export const DEFAULT_SETTINGS: Readonly<GameSettings> = Object.freeze({
  startingBudget: DEFAULT_STARTING_BUDGET,
  teamSize: DEFAULT_TEAM_SIZE,
  minimumBid: DEFAULT_MINIMUM_BID,
  bidIncrement: DEFAULT_BID_INCREMENT,
  auctionTimerMs: DEFAULT_AUCTION_TIMER_MS,
  auctionOrder: "RANDOM",
});

/** Quick-bid button steps (+$1 / +$2 / +$5). */
export const QUICK_BID_STEPS = [1, 2, 5] as const;

/** How long the "SOLD" reveal is shown before the next lot. */
export const REVEAL_DURATION_MS = 2500;

export const MIN_MANAGERS = 2;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Bump when the persisted Game shape changes incompatibly. */
export const GAME_SCHEMA_VERSION = 1;

/**
 * Guard for the tick catch-up loop. Each iteration advances at least one
 * stage; a full game needs roughly 2 × totalLots iterations, so this is far
 * above any realistic game while still preventing an infinite loop.
 */
export const MAX_TICK_ITERATIONS = 10_000;

export const MANAGER_ID_PREFIX = "manager-";
