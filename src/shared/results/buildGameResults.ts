// GENERATED from backend/src/results/buildGameResults.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Pure builder: authoritative domain Game → GameResults.
 *
 * Reads only what the domain recorded (managers, history, interruptedLot and
 * the player dataset). It never re-runs or second-guesses auction rules: a
 * price is the amount in the lot's result, an owner is the result's manager.
 * Same Game in, same GameResults out.
 */

import { getAmountSpent, getOpenSlots } from "../domain/engine/bidding";
import { isGameOver } from "../domain/engine/game";
import { PLAYERS_BY_ID } from "../domain/players/players";
import { POSITION_GROUPS, getPositionGroup, type PositionGroup } from "../domain/players/positions";
import type { Auction, AuctionResult, Bid, Game, Manager, Player, RatingCategory } from "../domain/types";
import type {
  AuctionStatistics,
  GameResults,
  HighestSale,
  LotBid,
  LotHistoryEntry,
  ManagerResult,
  RatingAverages,
  SquadPlayer,
} from "./types";

/** Display order for rating averages. */
export const RATING_CATEGORIES: readonly RatingCategory[] = [
  "attacking",
  "creativity",
  "defending",
  "physical",
  "technical",
  "sixAsideFit",
  "goalkeeping",
];

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function requirePlayer(playerId: string): Player {
  const player = PLAYERS_BY_ID.get(playerId);
  if (player === undefined) {
    // Unreachable: createGame rejects pools with unknown player ids.
    throw new Error(`Invariant violated: unknown player "${playerId}" in game.`);
  }
  return player;
}

function managerNameOf(managers: readonly Manager[], managerId: string): string {
  const manager = managers.find((m) => m.id === managerId);
  if (manager === undefined) {
    throw new Error(`Invariant violated: unknown manager "${managerId}" in game.`);
  }
  return manager.name;
}

function toLotBids(bids: readonly Bid[], managers: readonly Manager[]): LotBid[] {
  return bids.map((bid) => ({
    managerId: bid.managerId,
    managerName: managerNameOf(managers, bid.managerId),
    amount: bid.amount,
    placedAt: bid.placedAt,
  }));
}

function toLotEntry(result: AuctionResult, managers: readonly Manager[]): LotHistoryEntry {
  const player = requirePlayer(result.playerId);
  return {
    lotNumber: result.lotNumber,
    playerId: result.playerId,
    playerName: player.name,
    primaryPosition: player.primaryPosition,
    outcome: result.outcome,
    managerId: result.managerId,
    managerName: result.managerId === null ? null : managerNameOf(managers, result.managerId),
    amount: result.amount,
    bids: toLotBids(result.bids, managers),
    completedAt: result.completedAt,
  };
}

function toInterruptedEntry(lot: Auction, managers: readonly Manager[]): LotHistoryEntry {
  const player = requirePlayer(lot.playerId);
  return {
    lotNumber: lot.lotNumber,
    playerId: lot.playerId,
    playerName: player.name,
    primaryPosition: player.primaryPosition,
    outcome: "INTERRUPTED",
    managerId: null,
    managerName: null,
    amount: 0,
    bids: toLotBids(lot.bids, managers),
    completedAt: null,
  };
}

function emptyPositionCounts(): Record<PositionGroup, number> {
  return Object.fromEntries(POSITION_GROUPS.map((group) => [group, 0])) as Record<PositionGroup, number>;
}

function averageRatings(players: readonly Player[]): RatingAverages | null {
  if (players.length === 0) return null;
  const averages = {} as Record<RatingCategory, number>;
  for (const category of RATING_CATEGORIES) {
    const total = players.reduce((sum, player) => sum + player.ratings[category], 0);
    averages[category] = roundToOneDecimal(total / players.length);
  }
  return averages;
}

function toManagerResult(game: Game, manager: Manager, acquisitions: ReadonlyMap<string, AuctionResult>): ManagerResult {
  const { settings } = game;
  const positionCounts = emptyPositionCounts();
  const squad: Player[] = [];
  const players: SquadPlayer[] = manager.playerIds.map((playerId) => {
    const result = acquisitions.get(playerId);
    if (result === undefined || result.managerId !== manager.id || result.outcome === "UNSOLD") {
      throw new Error(`Invariant violated: no acquisition recorded for "${playerId}".`);
    }
    const player = requirePlayer(playerId);
    const positionGroup = getPositionGroup(player.primaryPosition);
    positionCounts[positionGroup] += 1;
    squad.push(player);
    return {
      playerId,
      name: player.name,
      primaryPosition: player.primaryPosition,
      positionGroup,
      nationality: player.nationality,
      price: result.amount,
      acquiredBy: result.outcome,
      lotNumber: result.lotNumber,
    };
  });
  const openSlots = getOpenSlots(manager, settings);
  return {
    managerId: manager.id,
    name: manager.name,
    startingBudget: settings.startingBudget,
    spent: getAmountSpent(manager, settings),
    budgetRemaining: manager.budgetRemaining,
    squadSize: manager.playerIds.length,
    teamSize: settings.teamSize,
    openSlots,
    complete: openSlots === 0,
    players,
    positionCounts,
    averageRatings: averageRatings(squad),
  };
}

function buildStatistics(game: Game, lots: readonly LotHistoryEntry[]): AuctionStatistics {
  let playersSold = 0;
  let playersAutoAwarded = 0;
  let playersUnsold = 0;
  let totalSpent = 0;
  let highestSale: HighestSale | null = null;

  for (const result of game.history) {
    if (result.outcome === "UNSOLD" || result.managerId === null) {
      playersUnsold += 1;
      continue;
    }
    if (result.outcome === "SOLD") playersSold += 1;
    else playersAutoAwarded += 1;
    totalSpent += result.amount;
    // Strictly greater: on a tie the earliest lot keeps the record.
    if (highestSale === null || result.amount > highestSale.amount) {
      highestSale = {
        lotNumber: result.lotNumber,
        playerName: requirePlayer(result.playerId).name,
        managerName: managerNameOf(game.managers, result.managerId),
        amount: result.amount,
      };
    }
  }

  const acquired = playersSold + playersAutoAwarded;
  return {
    lotsCompleted: game.history.length,
    playersSold,
    playersAutoAwarded,
    playersUnsold,
    lotsInterrupted: game.interruptedLot === null ? 0 : 1,
    totalBids: lots.reduce((sum, lot) => sum + lot.bids.length, 0),
    totalSpent,
    averagePrice: acquired === 0 ? null : roundToOneDecimal(totalSpent / acquired),
    highestSale,
  };
}

/**
 * Final results for a finished game (GAME_COMPLETE or ENDED_EARLY), or null
 * while the game is still in progress. Throws only if the Game breaks a
 * domain invariant (e.g. an owned player with no recorded acquisition).
 */
export function buildGameResults(game: Game): GameResults | null {
  if (!isGameOver(game)) return null;

  const acquisitions = new Map<string, AuctionResult>();
  for (const result of game.history) {
    if (result.managerId !== null) acquisitions.set(result.playerId, result);
  }

  const lots: LotHistoryEntry[] = game.history.map((result) => toLotEntry(result, game.managers));
  if (game.interruptedLot !== null) {
    lots.push(toInterruptedEntry(game.interruptedLot, game.managers));
  }

  return {
    endReason: game.status === "GAME_COMPLETE" ? "COMPLETED" : "ENDED_EARLY",
    settings: game.settings,
    statistics: buildStatistics(game, lots),
    managers: game.managers.map((manager) => toManagerResult(game, manager, acquisitions)),
    lots,
  };
}
