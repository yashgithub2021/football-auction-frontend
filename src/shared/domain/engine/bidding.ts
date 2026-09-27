// GENERATED from backend/src/domain/engine/bidding.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import { QUICK_BID_STEPS } from "../constants";
import type {
  Auction,
  BidRejectionReason,
  BidValidation,
  Game,
  GameSettings,
  Manager,
  QuickBidOption,
} from "../types";

// ---------------------------------------------------------------------------
// Manager-derived values (computed on demand, never stored)
// ---------------------------------------------------------------------------

export function getOpenSlots(manager: Manager, settings: GameSettings): number {
  return Math.max(0, settings.teamSize - manager.playerIds.length);
}

/** A manager is active while they still have open squad slots. */
export function isManagerActive(manager: Manager, settings: GameSettings): boolean {
  return getOpenSlots(manager, settings) > 0;
}

export function getAmountSpent(manager: Manager, settings: GameSettings): number {
  return settings.startingBudget - manager.budgetRemaining;
}

export function getManagerById(game: Game, managerId: string): Manager | undefined {
  return game.managers.find((manager) => manager.id === managerId);
}

/**
 * The most a manager can bid while still being able to fill every remaining
 * slot at the minimum bid: budgetRemaining − (openSlots − 1) × minimumBid.
 * Returns 0 for a manager whose squad is full.
 */
export function calculateMaximumSafeBid(manager: Manager, settings: GameSettings): number {
  const openSlots = getOpenSlots(manager, settings);
  if (openSlots === 0) {
    return 0;
  }
  const reserved = (openSlots - 1) * settings.minimumBid;
  return Math.max(0, manager.budgetRemaining - reserved);
}

export function hasBids(auction: Auction): boolean {
  return auction.highestBidderId !== null;
}

/** Smallest amount that would currently be accepted from a non-leading manager. */
export function getMinimumNextBid(auction: Auction, settings: GameSettings): number {
  return hasBids(auction) ? auction.currentBid + settings.bidIncrement : settings.minimumBid;
}

// ---------------------------------------------------------------------------
// Bid validation
// ---------------------------------------------------------------------------

function reject(reason: BidRejectionReason, message: string): BidValidation {
  return { ok: false, reason, message };
}

/**
 * Validates a bid. Checks run in a fixed order so the most fundamental
 * problem is reported first.
 */
export function validateBid(
  game: Game,
  managerId: string,
  amount: number,
  now: number,
): BidValidation {
  const auction = game.currentAuction;
  if (game.status !== "AUCTION_ACTIVE" || auction === null) {
    return reject("AUCTION_NOT_ACTIVE", "There is no live auction right now.");
  }
  if (now >= auction.endsAt) {
    return reject("AUCTION_EXPIRED", "Too late: the timer has already run out.");
  }

  const manager = getManagerById(game, managerId);
  if (manager === undefined) {
    return reject("MANAGER_NOT_FOUND", "That manager is not in this game.");
  }

  const { settings } = game;
  if (!isManagerActive(manager, settings)) {
    return reject("SQUAD_FULL", `${manager.name} already has a full squad.`);
  }
  if (auction.highestBidderId === manager.id) {
    return reject("ALREADY_HIGHEST_BIDDER", `${manager.name} is already the highest bidder.`);
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return reject("INVALID_AMOUNT", "Bids must be a whole, positive amount.");
  }
  if (!hasBids(auction) && amount < settings.minimumBid) {
    return reject("BELOW_MINIMUM_BID", `The opening bid must be at least $${settings.minimumBid}.`);
  }
  if (hasBids(auction) && amount < auction.currentBid + settings.bidIncrement) {
    return reject(
      "BELOW_INCREMENT",
      `Bid must be at least $${auction.currentBid + settings.bidIncrement}.`,
    );
  }

  const maxSafeBid = calculateMaximumSafeBid(manager, settings);
  if (amount > maxSafeBid) {
    return reject(
      "EXCEEDS_SAFE_BID",
      `${manager.name} can bid at most $${maxSafeBid} and still fill their squad.`,
    );
  }

  return { ok: true };
}

/**
 * Quick-bid buttons (+$1 / +$2 / +$5) for one manager.
 * - No bids yet: amount = max(minimumBid, step). The increment does not apply
 *   to opening bids, so the minimum opening bid is always offered.
 * - Otherwise: amount = currentBid + max(step, bidIncrement), and `step` is
 *   the effective raise. The smallest legal raise is therefore always offered,
 *   whatever the configured increment.
 * Duplicate amounts are collapsed so the UI never shows two buttons for the
 * same bid.
 */
export function getQuickBidOptions(game: Game, managerId: string, now: number): QuickBidOption[] {
  const auction = game.currentAuction;
  const { settings } = game;
  const options: QuickBidOption[] = [];
  const seenAmounts = new Set<number>();
  const raising = auction !== null && hasBids(auction);

  for (const buttonStep of QUICK_BID_STEPS) {
    const step = raising ? Math.max(buttonStep, settings.bidIncrement) : buttonStep;
    const amount = raising ? auction.currentBid + step : Math.max(settings.minimumBid, step);
    if (seenAmounts.has(amount)) {
      continue;
    }
    seenAmounts.add(amount);

    const validation = validateBid(game, managerId, amount, now);
    options.push(
      validation.ok
        ? { step, amount, enabled: true }
        : { step, amount, enabled: false, reason: validation.reason, message: validation.message },
    );
  }

  return options;
}
