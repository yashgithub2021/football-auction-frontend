/**
 * Display text for the server's final results. Formatting only: every
 * number and name comes from `GameResults` as the server built it.
 */

import type { EndReason, GameResults, LotHistoryEntry, LotOutcome } from "@protocol";
import { formatMoney } from "@/components/auction/auctionView";

export const END_REASON_HEADING: Record<EndReason, string> = {
  COMPLETED: "Auction complete",
  ENDED_EARLY: "Auction ended early",
};

export const OUTCOME_LABEL: Record<LotOutcome, string> = {
  SOLD: "Sold",
  UNSOLD: "Unsold",
  INTERRUPTED: "Interrupted",
};

/** One line describing what happened to a lot, e.g. "Sold to Viraj for $3". */
export function describeLot(lot: LotHistoryEntry): string {
  switch (lot.outcome) {
    case "SOLD":
      return `Sold to ${lot.managerName ?? "a manager"} for ${formatMoney(lot.amount)}`;
    case "UNSOLD":
      return "No bids, went unsold";
    case "INTERRUPTED":
      return "On the block when the host ended the auction. Not awarded";
  }
}

/**
 * The copyable final output, and nothing else: each team's name, then its
 * players one per line in purchase order, with a blank line between teams
 * (in the server's manager order). No prices, positions, budgets,
 * statistics, headings, bullets or markup. A team with no players is just
 * its name line.
 *
 *   Team Yash
 *   Messi
 *   Ronaldo
 *
 *   Team Nirbhay
 *   Pele
 */
export function formatResultsText(results: GameResults): string {
  return results.managers
    .map((manager) => [`Team ${manager.name}`, ...manager.players.map((player) => player.name)].join("\n"))
    .join("\n\n");
}
