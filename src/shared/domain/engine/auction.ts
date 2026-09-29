// GENERATED from backend/src/domain/engine/auction.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import { REVEAL_DURATION_MS } from "../constants";
import type {
  Auction,
  AuctionResult,
  BidValidation,
  Game,
  Manager,
  RandomFn,
} from "../types";
import { validateBid } from "./bidding";
import { selectPlayer } from "./selection";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface DrawResult {
  playerId: string;
  availablePlayerIds: string[];
  lotNumber: number;
}

/**
 * Draws a random player and removes them from the pool permanently. Once a
 * player is drawn they can never be drawn again, whatever the outcome.
 */
function drawPlayer(game: Game, random: RandomFn): DrawResult {
  const playerId = selectPlayer(game.availablePlayerIds, game.settings, random);
  if (playerId === null) {
    // Unreachable: advanceGame completes the game once the pool is empty.
    throw new Error("Invariant violated: no player left to draw.");
  }
  return {
    playerId,
    availablePlayerIds: game.availablePlayerIds.filter((id) => id !== playerId),
    lotNumber: game.lotCounter + 1,
  };
}

/** Returns a new managers array with the player added to the winner and the price deducted. */
function awardPlayer(
  managers: readonly Manager[],
  managerId: string,
  playerId: string,
  amount: number,
): Manager[] {
  return managers.map((manager) =>
    manager.id === managerId
      ? {
          ...manager,
          budgetRemaining: manager.budgetRemaining - amount,
          playerIds: [...manager.playerIds, playerId],
        }
      : manager,
  );
}

/** Moves the game into the PLAYER_SOLD reveal for the given lot and result. */
function enterReveal(
  game: Game,
  auction: Auction,
  result: AuctionResult,
  now: number,
): Game {
  return {
    ...game,
    status: "PLAYER_SOLD",
    currentAuction: { ...auction, pausedRemainingMs: null, revealEndsAt: now + REVEAL_DURATION_MS },
    lastResult: result,
    history: [...game.history, result],
  };
}

// ---------------------------------------------------------------------------
// Public auction operations
// ---------------------------------------------------------------------------

/** Draws a random player and opens bidding with a fresh timer. */
export function startAuction(game: Game, now: number, random: RandomFn): Game {
  const { playerId, availablePlayerIds, lotNumber } = drawPlayer(game, random);
  const auction: Auction = {
    lotNumber,
    playerId,
    currentBid: 0,
    highestBidderId: null,
    endsAt: now + game.settings.auctionTimerMs,
    pausedRemainingMs: null,
    revealEndsAt: null,
    bids: [],
  };
  return {
    ...game,
    status: "AUCTION_ACTIVE",
    availablePlayerIds,
    lotCounter: lotNumber,
    currentAuction: auction,
  };
}

/**
 * Applies a bid if valid and resets the timer to a full auctionTimerMs.
 * On rejection the original game object is returned unchanged.
 */
export function placeBid(
  game: Game,
  managerId: string,
  amount: number,
  now: number,
): { game: Game; validation: BidValidation } {
  const validation = validateBid(game, managerId, amount, now);
  const auction = game.currentAuction;
  if (!validation.ok || auction === null) {
    return { game, validation };
  }
  return {
    game: {
      ...game,
      currentAuction: {
        ...auction,
        currentBid: amount,
        highestBidderId: managerId,
        endsAt: now + game.settings.auctionTimerMs,
        bids: [...auction.bids, { managerId, amount, placedAt: now }],
      },
    },
    validation,
  };
}

/**
 * Closes the live auction at `now`:
 * - Highest bidder exists → SOLD to them at the current bid.
 * - No bids → UNSOLD: the player is discarded permanently, nobody gets them,
 *   no budget moves. A player only ever joins a squad through a winning bid;
 *   open slots or a small remaining pool never allocate anyone.
 * Returns the game unchanged if there is no live auction.
 */
export function finalizeAuction(game: Game, now: number): Game {
  const auction = game.currentAuction;
  if (game.status !== "AUCTION_ACTIVE" || auction === null) {
    return game;
  }

  if (auction.highestBidderId !== null) {
    const result: AuctionResult = {
      lotNumber: auction.lotNumber,
      playerId: auction.playerId,
      managerId: auction.highestBidderId,
      amount: auction.currentBid,
      outcome: "SOLD",
      completedAt: now,
      bids: auction.bids,
    };
    const managers = awardPlayer(game.managers, auction.highestBidderId, auction.playerId, auction.currentBid);
    return enterReveal({ ...game, managers }, auction, result, now);
  }

  const result: AuctionResult = {
    lotNumber: auction.lotNumber,
    playerId: auction.playerId,
    managerId: null,
    amount: 0,
    outcome: "UNSOLD",
    completedAt: now,
    bids: auction.bids,
  };
  return enterReveal(
    { ...game, discardedPlayerIds: [...game.discardedPlayerIds, auction.playerId] },
    auction,
    result,
    now,
  );
}

/** Freezes the clock. Only valid while an auction is live. */
export function pauseAuction(game: Game, now: number): Game {
  const auction = game.currentAuction;
  if (game.status !== "AUCTION_ACTIVE" || auction === null) {
    return game;
  }
  return {
    ...game,
    status: "PAUSED",
    currentAuction: { ...auction, pausedRemainingMs: Math.max(0, auction.endsAt - now) },
  };
}

/** Restarts the clock with exactly the time that was left when paused. */
export function resumeAuction(game: Game, now: number): Game {
  const auction = game.currentAuction;
  if (game.status !== "PAUSED" || auction === null || auction.pausedRemainingMs === null) {
    return game;
  }
  return {
    ...game,
    status: "AUCTION_ACTIVE",
    currentAuction: { ...auction, endsAt: now + auction.pausedRemainingMs, pausedRemainingMs: null },
  };
}
