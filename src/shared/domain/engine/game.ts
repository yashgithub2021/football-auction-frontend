// GENERATED from backend/src/domain/engine/game.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import { MAX_TICK_ITERATIONS } from "../constants";
import type { Auction, AuctionResult, Game, GameStatus, RandomFn } from "../types";
import { awardPlayer, drawPlayer, enterReveal, finalizeAuction, startAuction } from "./auction";
import { getActiveManagers, isManagerActive } from "./bidding";

const TERMINAL_STATUSES: ReadonlySet<GameStatus> = new Set(["GAME_COMPLETE", "ENDED_EARLY"]);
const ENDABLE_STATUSES: ReadonlySet<GameStatus> = new Set(["AUCTION_ACTIVE", "PAUSED", "PLAYER_SOLD"]);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function areAllSquadsFull(game: Game): boolean {
  return game.managers.every((manager) => !isManagerActive(manager, game.settings));
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

/** Marks the game complete. Throws if any squad still has open slots. */
export function completeGame(game: Game): Game {
  if (!areAllSquadsFull(game)) {
    throw new Error("Cannot complete the game while squads still have open slots.");
  }
  return { ...game, status: "GAME_COMPLETE", currentAuction: null };
}

/**
 * Last-active-manager rule: draws a random player and awards them straight to
 * the given manager at the minimum bid, then shows the usual reveal.
 */
function autoAwardToManager(game: Game, managerId: string, now: number, random: RandomFn): Game {
  const { playerId, availablePlayerIds, lotNumber } = drawPlayer(game, random);
  const amount = game.settings.minimumBid;
  const lot: Auction = {
    lotNumber,
    playerId,
    currentBid: amount,
    highestBidderId: managerId,
    endsAt: now,
    pausedRemainingMs: null,
    revealEndsAt: null,
    bids: [],
  };
  const result: AuctionResult = {
    lotNumber,
    playerId,
    managerId,
    amount,
    outcome: "AUTO_AWARDED",
    completedAt: now,
    bids: [],
  };
  const next: Game = {
    ...game,
    availablePlayerIds,
    lotCounter: lotNumber,
    managers: awardPlayer(game.managers, managerId, playerId, amount),
  };
  return enterReveal(next, lot, result, now);
}

/**
 * Moves to the next stage after a reveal (or at game start):
 *   all squads full   → GAME_COMPLETE
 *   one active manager → auto-award a random player to them
 *   otherwise          → start the next random auction
 */
export function advanceGame(game: Game, now: number, random: RandomFn): Game {
  if (areAllSquadsFull(game)) {
    return completeGame(game);
  }
  const active = getActiveManagers(game.managers, game.settings);
  const onlyManager = active.length === 1 ? active[0] : undefined;
  if (onlyManager !== undefined) {
    return autoAwardToManager(game, onlyManager.id, now, random);
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
      current = finalizeAuction(current, auction.endsAt, random);
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
