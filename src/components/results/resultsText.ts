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

const TEXT_TITLE: Record<EndReason, string> = {
  COMPLETED: "auction complete",
  ENDED_EARLY: "auction ended early",
};

export const OUTCOME_LABEL: Record<LotOutcome, string> = {
  SOLD: "Sold",
  AUTO_AWARDED: "Auto-awarded",
  UNSOLD: "Unsold",
  INTERRUPTED: "Interrupted",
};

/** One line describing what happened to a lot, e.g. "Sold to Viraj for $3". */
export function describeLot(lot: LotHistoryEntry): string {
  switch (lot.outcome) {
    case "SOLD":
      return `Sold to ${lot.managerName ?? "a manager"} for ${formatMoney(lot.amount)}`;
    case "AUTO_AWARDED":
      return `Auto-awarded to ${lot.managerName ?? "a manager"} for ${formatMoney(lot.amount)}`;
    case "UNSOLD":
      return "No bids, went unsold";
    case "INTERRUPTED":
      return "On the block when the host ended the auction. Not awarded";
  }
}

/**
 * Plain-text summary for pasting into a group chat. Names, players and
 * money only: no internal ids, no markup.
 *
 *   Football Auction: auction complete
 *
 *   Team Yash
 *   - Player A — $5
 *
 *   Remaining Budget:
 *   Yash — $10
 */
export function formatResultsText(results: GameResults): string {
  const lines: string[] = [`Football Auction: ${TEXT_TITLE[results.endReason]}`, ""];
  for (const manager of results.managers) {
    lines.push(`Team ${manager.name}`);
    if (manager.players.length === 0) {
      lines.push("- No players");
    }
    for (const player of manager.players) {
      lines.push(`- ${player.name} — ${formatMoney(player.price)}`);
    }
    lines.push("");
  }
  lines.push("Remaining Budget:");
  for (const manager of results.managers) {
    lines.push(`${manager.name} — ${formatMoney(manager.budgetRemaining)}`);
  }
  return lines.join("\n");
}
