// GENERATED from backend/src/results/types.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Final results of a finished game: what happened lot by lot, who bought
 * whom for how much, and descriptive statistics.
 *
 * Everything here is derived by `buildGameResults` from the authoritative
 * domain Game. It is plain, serializable data sent to clients as part of the
 * room snapshot; clients render it and never recompute it.
 *
 * There is deliberately no ranking or "winner": squads are described, not
 * judged. Rating averages are the dataset's editable 1–5 game ratings, not
 * objective real-world assessments.
 */

import type { Position, PositionGroup } from "../domain/players/positions";
import type { AuctionOutcome, GameSettings, PlayerRatings } from "../domain/types";

/** COMPLETED: every squad filled. ENDED_EARLY: the host ended the auction first. */
export type EndReason = "COMPLETED" | "ENDED_EARLY";

/** A player in a finished squad, with what they cost. */
export interface SquadPlayer {
  playerId: string;
  name: string;
  primaryPosition: Position;
  positionGroup: PositionGroup;
  nationality: string;
  /** The winning bid: players only ever join a squad by being bought. */
  price: number;
  lotNumber: number;
}

/** Average of each 1–5 game rating across a squad, rounded to one decimal. */
export type RatingAverages = { readonly [K in keyof PlayerRatings]: number };

export interface ManagerResult {
  managerId: string;
  name: string;
  startingBudget: number;
  spent: number;
  budgetRemaining: number;
  squadSize: number;
  teamSize: number;
  openSlots: number;
  /** True when the squad has every slot filled. */
  complete: boolean;
  /** In purchase order. */
  players: readonly SquadPlayer[];
  /** How many players of each broad group (by primary position). */
  positionCounts: { readonly [G in PositionGroup]: number };
  /** null when the squad is empty. */
  averageRatings: RatingAverages | null;
}

export interface LotBid {
  managerId: string;
  managerName: string;
  amount: number;
  placedAt: number;
}

/**
 * INTERRUPTED: the lot was still under the hammer when the host ended the
 * game. It was never awarded; its bids are kept for the record.
 */
export type LotOutcome = AuctionOutcome | "INTERRUPTED";

export interface LotHistoryEntry {
  lotNumber: number;
  playerId: string;
  playerName: string;
  primaryPosition: Position;
  outcome: LotOutcome;
  /** Who got the player. null for UNSOLD and INTERRUPTED. */
  managerId: string | null;
  managerName: string | null;
  /** Price paid. 0 for UNSOLD and INTERRUPTED. */
  amount: number;
  /** Accepted bids in the order placed. */
  bids: readonly LotBid[];
  /** When the lot closed. null for INTERRUPTED (it never closed). */
  completedAt: number | null;
}

export interface HighestSale {
  lotNumber: number;
  playerName: string;
  managerName: string;
  amount: number;
}

export interface AuctionStatistics {
  /** Lots that reached a result (sold or unsold). */
  lotsCompleted: number;
  playersSold: number;
  playersUnsold: number;
  /** 1 when the host ended the game with a lot on the block, else 0. */
  lotsInterrupted: number;
  /** Accepted bids across every lot, including an interrupted one. */
  totalBids: number;
  /** Money spent by all managers together. */
  totalSpent: number;
  /** totalSpent ÷ players sold, one decimal. null if none. */
  averagePrice: number | null;
  /** Most expensive acquisition; the earliest lot wins a tie. null if none. */
  highestSale: HighestSale | null;
}

export interface GameResults {
  endReason: EndReason;
  settings: GameSettings;
  statistics: AuctionStatistics;
  /** In domain manager order (the room's join order). */
  managers: readonly ManagerResult[];
  /** Every lot in lot order, including an interrupted final lot. */
  lots: readonly LotHistoryEntry[];
}
