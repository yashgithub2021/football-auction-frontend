/**
 * Display helpers for the auction screen. These only read domain state and
 * turn it into text or numbers for rendering; no auction rule lives here.
 */

import { MS_PER_SECOND, REVEAL_DURATION_MS } from "@domain/constants";
import { getManagerById, getMinimumNextBid, hasBids } from "@domain/engine";
import { getPlayerById } from "@domain/players/players";
import type { ActionResult, AuctionResult, Game, GameAction } from "@domain/types";

const TENTHS_PER_SECOND = 10;
const MS_PER_TENTH = MS_PER_SECOND / TENTHS_PER_SECOND;

/** Below this share of the full timer the countdown switches to its urgent style. */
export const TIMER_URGENT_FRACTION = 1 / 3;

/** How long a rejected-action message stays visible. */
export const FEEDBACK_VISIBLE_MS = 2500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Time left to bid, or null when no lot is under the hammer. */
export function remainingBidMs(game: Game, now: number): number | null {
  const auction = game.currentAuction;
  if (auction === null) return null;
  if (game.status === "PAUSED") return auction.pausedRemainingMs ?? 0;
  if (game.status === "AUCTION_ACTIVE") return clamp(auction.endsAt - now, 0, game.settings.auctionTimerMs);
  return null;
}

/** Time left in the sold/unsold reveal, or null outside the reveal. */
export function remainingRevealMs(game: Game, now: number): number | null {
  const revealEndsAt = game.currentAuction?.revealEndsAt ?? null;
  if (game.status !== "PLAYER_SOLD" || revealEndsAt === null) return null;
  return clamp(revealEndsAt - now, 0, REVEAL_DURATION_MS);
}

/** Seconds with one decimal, rounded up so "0.0" only shows once time is really up. */
export function formatSeconds(ms: number): string {
  return (Math.ceil(ms / MS_PER_TENTH) / TENTHS_PER_SECOND).toFixed(1);
}

export function formatMoney(amount: number): string {
  return `$${amount}`;
}

export function managerName(game: Game, managerId: string | null): string | null {
  if (managerId === null) return null;
  return getManagerById(game, managerId)?.name ?? null;
}

export function playerName(playerId: string): string {
  return getPlayerById(playerId)?.name ?? "Unknown player";
}

export type ResultTone = "sold" | "unsold";

export interface ResultDescription {
  tone: ResultTone;
  headline: string;
  winner: string | null;
  amount: number | null;
  detail: string;
}

export function describeResult(game: Game, result: AuctionResult): ResultDescription {
  const winner = managerName(game, result.managerId);
  switch (result.outcome) {
    case "SOLD":
      return { tone: "sold", headline: "Sold", winner, amount: result.amount, detail: "Highest bid wins." };
    case "UNSOLD":
      return {
        tone: "unsold",
        headline: "Unsold",
        winner: null,
        amount: null,
        detail: "No bids. This player is out of the auction.",
      };
  }
}

/**
 * One short sentence for screen readers, changing only when something
 * happens (new lot, new leader, pause, result). The countdown is never
 * announced, so the live region stays quiet while the clock runs.
 */
export function announcement(game: Game): string {
  const auction = game.currentAuction;
  switch (game.status) {
    case "AUCTION_ACTIVE": {
      if (auction === null) return "";
      const player = playerName(auction.playerId);
      if (!hasBids(auction)) {
        return `Now bidding: ${player}. Opening bid ${formatMoney(getMinimumNextBid(auction, game.settings))}.`;
      }
      return `${managerName(game, auction.highestBidderId) ?? "A manager"} leads for ${player} with ${formatMoney(auction.currentBid)}.`;
    }
    case "PAUSED":
      return "Auction paused.";
    case "PLAYER_SOLD": {
      const result = game.lastResult;
      if (result === null) return "";
      const described = describeResult(game, result);
      const player = playerName(result.playerId);
      return described.winner === null
        ? `${player} is unsold.`
        : `${player}: ${described.headline.toLowerCase()} to ${described.winner} for ${formatMoney(described.amount ?? 0)}.`;
    }
    case "GAME_COMPLETE":
      return "Auction complete.";
    default:
      return "";
  }
}

const STATUS_ACTION_HINTS: Partial<Record<GameAction["type"], string>> = {
  PAUSE: "You can only pause while a player is up for auction.",
  RESUME: "The auction isn't paused.",
  START_GAME: "The auction has already started.",
};

/** User-facing text for a rejected action, or null if it succeeded. */
export function rejectionMessage(action: GameAction, result: ActionResult): string | null {
  if (result.error === undefined) return null;
  if (result.bidValidation !== undefined && !result.bidValidation.ok) return result.bidValidation.message;
  if (result.error.code === "INVALID_ACTION_FOR_STATUS") {
    return STATUS_ACTION_HINTS[action.type] ?? result.error.message;
  }
  return result.error.message;
}
