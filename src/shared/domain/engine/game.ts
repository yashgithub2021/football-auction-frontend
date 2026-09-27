// GENERATED from backend/src/domain/engine/game.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import { MAX_TICK_ITERATIONS } from "../constants";
import type { Game, GameStatus, RandomFn } from "../types";
import { finalizeAuction, startAuction } from "./auction";
import { isManagerActive } from "./bidding";

const TERMINAL_STATUSES: ReadonlySet<GameStatus> = new Set(["GAME_COMPLETE", "ENDED_EARLY"]);
const ENDABLE_STATUSES: ReadonlySet<GameStatus> = new Set(["AUCTION_ACTIVE", "PAUSED", "PLAYER_SOLD"]);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function areAllSquadsFull(game: Game): boolean {
  return game.managers.every((manager) => !isManagerActive(manager, game.settings));
}

/** No player is left to put up for auction. */
export function isPoolExhausted(game: Game): boolean {
  return game.availablePlayerIds.length === 0;
}

/**
 * The auction has nothing left to do: every squad is full, or every player
 * has been auctioned. Squads may be incomplete in the second case; players
 * are only ever acquired by winning a bid.
 */
export function isAuctionFinished(game: Game): boolean {
  return areAllSquadsFull(game) || isPoolExhausted(game);
}

export function isGameOver(game: Game): boolean {
  return TERMINAL_STATUSES.has(game.status);
}

export function canEndGame(game: Game): boolean {
  return ENDABLE_STATUSES.has(game.status);
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Marks the game complete. Throws unless every squad is full or the pool is
 * exhausted (squads may then be incomplete).
 */
export function completeGame(game: Game): Game {
  if (!isAuctionFinished(game)) {
    throw new Error("Cannot complete the game while squads have open slots and players remain.");
  }
  return { ...game, status: "GAME_COMPLETE", currentAuction: null };
}

/**
 * Moves to the next stage after a reveal (or at game start):
 *   every squad full, or no player left → GAME_COMPLETE
 *   otherwise                           → start the next random auction
 * Even with a single manager left with open slots, the next player goes up
 * for a normal auction: nobody ever receives a player without winning a bid.
 */
export function advanceGame(game: Game, now: number, random: RandomFn): Game {
  if (isAuctionFinished(game)) {
    return completeGame(game);
  }
  return startAuction(game, now, random);
}

/** READY → first lot. Returns the game unchanged from any other status. */
export function startGame(game: Game, now: number, random: RandomFn): Game {
  if (game.status !== "READY") {
    return game;
  }
  return advanceGame(game, now, random);
}

/**
 * Advances time-driven transitions up to `now`. Safe to call every frame and
 * after a reload: it catches up across multiple elapsed stages in one call.
 *
 * - An expired auction is finalized at its own endsAt so the reveal timeline
 *   reflects when bidding actually closed.
 * - A finished reveal advances at `now`, so a newly drawn lot always gets a
 *   full timer (nobody loses a lot they never saw after a reload).
 * - PAUSED and terminal games are never moved forward.
 */
export function tick(game: Game, now: number, random: RandomFn): Game {
  let current = game;
  for (let iteration = 0; iteration < MAX_TICK_ITERATIONS; iteration += 1) {
    const auction = current.currentAuction;
    if (current.status === "AUCTION_ACTIVE" && auction !== null && now >= auction.endsAt) {
      current = finalizeAuction(current, auction.endsAt);
      continue;
    }
    if (
      current.status === "PLAYER_SOLD" &&
      auction !== null &&
      auction.revealEndsAt !== null &&
      now >= auction.revealEndsAt
    ) {
      current = advanceGame(current, now, random);
      continue;
    }
    return current;
  }
  return current;
}

/**
 * Host ends the game early → ENDED_EARLY (distinct from GAME_COMPLETE).
 * A lot still under the hammer (live or paused) is discarded without being
 * awarded, even if it had bids: the auction never closed. It is kept, bids
 * included, as `interruptedLot` so the record shows what was on the block.
 * A lot already in its reveal has been finalized and keeps its result.
 */
export function endGame(game: Game): Game {
  if (!canEndGame(game)) {
    return game;
  }
  const auction = game.currentAuction;
  const lotStillOpen = auction !== null && (game.status === "AUCTION_ACTIVE" || game.status === "PAUSED");
  return {
    ...game,
    status: "ENDED_EARLY",
    currentAuction: null,
    discardedPlayerIds: lotStillOpen
      ? [...game.discardedPlayerIds, auction.playerId]
      : game.discardedPlayerIds,
    interruptedLot: lotStillOpen ? auction : null,
  };
}
