import { useId } from "react";
import type { Game } from "@domain/types";
import { formatMoney, managerName, playerName } from "@/components/auction/auctionView";

/** How many recent events the live feed shows. */
export const RECENT_ACTIVITY_LIMIT = 6;

export interface ActivityItem {
  key: string;
  tone: "bid" | "sold" | "awarded" | "unsold";
  text: string;
}

/**
 * The latest things that happened, newest first, read straight from the
 * server's game: accepted bids on the open lot (`currentAuction.bids`) and
 * results of closed lots (`history`, which carries each lot's bids). During
 * a reveal the lot's bids are already part of its result, so they aren't
 * listed twice.
 */
export function recentActivity(game: Game, limit = RECENT_ACTIVITY_LIMIT): ActivityItem[] {
  const items: ActivityItem[] = [];
  const auction = game.currentAuction;
  if (auction !== null && (game.status === "AUCTION_ACTIVE" || game.status === "PAUSED")) {
    const player = playerName(auction.playerId);
    auction.bids.forEach((bid, index) => {
      items.push({
        key: `bid-${auction.lotNumber}-${index}`,
        tone: "bid",
        text: `${managerName(game, bid.managerId) ?? "A manager"} bid ${formatMoney(bid.amount)} for ${player}`,
      });
    });
    items.reverse();
  }
  for (let index = game.history.length - 1; index >= 0 && items.length < limit; index -= 1) {
    const result = game.history[index];
    if (result === undefined) continue;
    const player = playerName(result.playerId);
    const winner = managerName(game, result.managerId) ?? "a manager";
    const key = `lot-${result.lotNumber}`;
    if (result.outcome === "SOLD") {
      items.push({ key, tone: "sold", text: `Lot ${result.lotNumber}: ${player} sold to ${winner} for ${formatMoney(result.amount)}` });
    } else if (result.outcome === "AUTO_AWARDED") {
      items.push({ key, tone: "awarded", text: `Lot ${result.lotNumber}: ${player} auto-awarded to ${winner} for ${formatMoney(result.amount)}` });
    } else {
      items.push({ key, tone: "unsold", text: `Lot ${result.lotNumber}: ${player} went unsold` });
    }
  }
  return items.slice(0, limit);
}

const TONE_MARK: Record<ActivityItem["tone"], string> = {
  bid: "bg-white/60",
  sold: "bg-lime-300",
  awarded: "bg-sky-300",
  unsold: "bg-white/20",
};

/** Live feed for the auction screens. Not a live region: the screen's announcer already speaks key moments. */
export function RecentActivity({ game }: { game: Game }) {
  const headingId = useId();
  const items = recentActivity(game);
  return (
    <section aria-labelledby={headingId} data-testid="recent-activity">
      <h2 id={headingId} className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
        Recent activity
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-emerald-100/80">Nothing yet. Bids and results show up here.</p>
      ) : (
        <ol className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${TONE_MARK[item.tone]}`} />
              <span className="min-w-0">{item.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
