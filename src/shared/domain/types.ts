// GENERATED from backend/src/domain/types.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Core domain types for the football auction.
 *
 * Everything here is plain, serializable data so it can be persisted to
 * localStorage (Phase 7) or sent over a network (V2) without transformation.
 */

import type { Position } from "./players/positions";

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/** Integer rating on a 1–5 scale. Editable game metadata, not objective truth. */
export type Rating = 1 | 2 | 3 | 4 | 5;

export interface PlayerRatings {
  attacking: Rating;
  creativity: Rating;
  defending: Rating;
  physical: Rating;
  technical: Rating;
  sixAsideFit: Rating;
  goalkeeping: Rating;
}

export type RatingCategory = keyof PlayerRatings;

export interface Player {
  id: string;
  name: string;
  primaryPosition: Position;
  secondaryPositions: readonly Position[];
  nationality: string;
  era?: string;
  image?: string;
  ratings: PlayerRatings;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface GameSettings {
  startingBudget: number;
  teamSize: number;
  minimumBid: number;
  bidIncrement: number;
  auctionTimerMs: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type GameStatus =
  | "SETUP"
  | "READY"
  | "AUCTION_ACTIVE"
  | "PAUSED"
  | "PLAYER_SOLD"
  | "GAME_COMPLETE"
  | "ENDED_EARLY";

export interface Manager {
  id: string;
  name: string;
  budgetRemaining: number;
  /** Player ids in purchase order. */
  playerIds: readonly string[];
}

export interface Bid {
  managerId: string;
  amount: number;
  placedAt: number;
}

export interface Auction {
  lotNumber: number;
  playerId: string;
  /** 0 means no bids yet. */
  currentBid: number;
  highestBidderId: string | null;
  /** Absolute epoch ms at which bidding closes. */
  endsAt: number;
  /** Set only while PAUSED: time left on the clock when paused. */
  pausedRemainingMs: number | null;
  /** Set only after finalization: absolute epoch ms at which the reveal ends. */
  revealEndsAt: number | null;
  bids: readonly Bid[];
}

/** SOLD: won by the highest bid. UNSOLD: no bids; nobody gets the player. */
export type AuctionOutcome = "SOLD" | "UNSOLD";

export interface AuctionResult {
  lotNumber: number;
  playerId: string;
  /** null only when outcome is UNSOLD. */
  managerId: string | null;
  /** 0 when UNSOLD. */
  amount: number;
  outcome: AuctionOutcome;
  completedAt: number;
  /**
   * Every accepted bid on this lot, in the order placed. Empty for unsold
   * lots (nobody bid).
   */
  bids: readonly Bid[];
}

export interface Game {
  id: string;
  schemaVersion: number;
  status: GameStatus;
  settings: GameSettings;
  managers: readonly Manager[];
  /** Players that have never entered an auction. */
  availablePlayerIds: readonly string[];
  /** Players that went unsold and were permanently removed. */
  discardedPlayerIds: readonly string[];
  /**
   * The lot currently on the block. During PLAYER_SOLD this is the lot just
   * finalized and carries revealEndsAt.
   */
  currentAuction: Auction | null;
  /** Result of the most recent lot; drives the sold reveal. */
  lastResult: AuctionResult | null;
  /** Append-only record of every finalized lot, in lot order. */
  history: readonly AuctionResult[];
  /**
   * The lot that was still under the hammer (live or paused) when the host
   * ended the game early, kept with its bids for the record. It was never
   * awarded. null otherwise.
   */
  interruptedLot: Auction | null;
  createdAt: number;
  /** Number of lots drawn so far (also the last used lot number). */
  lotCounter: number;
}

// ---------------------------------------------------------------------------
// Actions (plain serializable objects: future WebSocket messages)
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: "START_GAME" }
  | { type: "PLACE_BID"; managerId: string; amount: number }
  | { type: "TICK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "END_GAME" };

export type GameActionType = GameAction["type"];

/** Random number generator returning a float in [0, 1). */
export type RandomFn = () => number;

export interface EngineDeps {
  now: number;
  random: RandomFn;
}

// ---------------------------------------------------------------------------
// Validation results
// ---------------------------------------------------------------------------

export type BidRejectionReason =
  | "AUCTION_NOT_ACTIVE"
  | "AUCTION_EXPIRED"
  | "MANAGER_NOT_FOUND"
  | "SQUAD_FULL"
  | "ALREADY_HIGHEST_BIDDER"
  | "INVALID_AMOUNT"
  | "BELOW_MINIMUM_BID"
  | "BELOW_INCREMENT"
  | "EXCEEDS_SAFE_BID";

export type BidValidation =
  | { ok: true }
  | { ok: false; reason: BidRejectionReason; message: string };

export interface QuickBidOption {
  step: number;
  amount: number;
  enabled: boolean;
  reason?: BidRejectionReason;
  message?: string;
}

export type SetupErrorCode =
  | "TOO_FEW_MANAGERS"
  | "BLANK_MANAGER_NAME"
  | "DUPLICATE_MANAGER_NAME"
  | "INVALID_SETTING"
  | "BUDGET_TOO_LOW"
  | "PLAYER_POOL_TOO_SMALL"
  | "UNKNOWN_PLAYER";

export interface SetupError {
  code: SetupErrorCode;
  message: string;
  field?: string;
}

export type CreateGameResult =
  | { ok: true; game: Game }
  | { ok: false; errors: SetupError[] };

export type ActionErrorCode = "INVALID_ACTION_FOR_STATUS" | "BID_REJECTED";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
}

export interface ActionResult {
  game: Game;
  /** Present when the action was rejected; game is then unchanged. */
  error?: ActionError;
  /** Present for PLACE_BID actions. */
  bidValidation?: BidValidation;
}
