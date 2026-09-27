import { useId } from "react";
import { getMinimumNextBid, hasBids } from "@domain/engine";
import type { Game } from "@domain/types";
import { TIMER_URGENT_FRACTION, formatMoney, formatSeconds, managerName, remainingBidMs } from "@/components/auction/auctionView";

const PERCENT = 100;

interface LotStatusProps {
  game: Game;
  /** Estimated server time (display only). */
  now: number;
  /** False while disconnected: the clock is not shown as if it were live. */
  live: boolean;
  /** The viewer's manager id, to say "you" when they lead. */
  viewerManagerId?: string | null;
}

/**
 * Current bid, leader and a big countdown, sized for phones first. The
 * remaining time is always endsAt − estimated server time; the server alone
 * closes the lot, and each new snapshot corrects the display.
 */
export function LotStatus({ game, now, live, viewerManagerId = null }: LotStatusProps) {
  const headingId = useId();
  const timerLabelId = useId();
  const auction = game.currentAuction;
  if (auction === null) return null;

  const closed = game.status === "PLAYER_SOLD";
  const paused = game.status === "PAUSED";
  const bidding = hasBids(auction);
  const leader = managerName(game, auction.highestBidderId);
  const youLead = viewerManagerId !== null && auction.highestBidderId === viewerManagerId;
  const remaining = remainingBidMs(game, now);
  const fraction = remaining === null ? 0 : Math.min(1, remaining / game.settings.auctionTimerMs);
  const showClock = live && remaining !== null;
  const urgent = showClock && !paused && fraction <= TIMER_URGENT_FRACTION;
  const timerLabel = !live ? "Offline" : paused ? "Paused" : closed ? "Closed" : "Time left";

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-3xl border border-white/10 bg-emerald-950/70 p-4 shadow-xl shadow-black/30 sm:p-6"
    >
      <h2 id={headingId} className="sr-only">
        Bidding
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">{closed ? "Final bid" : "Current bid"}</p>
          {bidding ? (
            <p key={auction.currentBid} className="text-5xl leading-none font-black text-lime-300 tabular-nums motion-safe:animate-pop sm:text-7xl">
              {formatMoney(auction.currentBid)}
            </p>
          ) : (
            <>
              <p className="text-3xl leading-tight font-black text-white/50 sm:text-5xl">No bids</p>
              {!closed && (
                <p className="text-sm font-semibold text-emerald-100">Opening bid {formatMoney(getMinimumNextBid(auction, game.settings))}</p>
              )}
            </>
          )}
          <p className="mt-2 truncate text-base font-bold">
            <span className="text-emerald-200/80">{closed ? "Winner " : "Leader "}</span>
            {leader === null ? "–" : youLead ? `${leader} (you)` : leader}
          </p>
        </div>
        <div className="text-right">
          <p id={timerLabelId} className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">
            {timerLabel}
          </p>
          <p role="timer" aria-labelledby={timerLabelId} className="flex items-baseline justify-end gap-1">
            <span
              className={`text-6xl leading-none font-black tabular-nums sm:text-8xl ${
                !showClock ? "text-white/40" : urgent ? "text-rose-300" : paused ? "text-amber-300" : "text-white"
              }`}
            >
              {showClock ? formatSeconds(remaining) : "–"}
            </span>
            <span className="text-lg font-bold text-emerald-200/70">s</span>
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-4 h-3 overflow-hidden rounded-full bg-white/10 sm:h-4">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-rose-400" : paused ? "bg-amber-300" : "bg-lime-300"}`}
          style={{ width: `${(showClock ? fraction : 0) * PERCENT}%` }}
        />
      </div>
      {urgent && <p className="mt-2 text-sm font-black tracking-widest text-rose-200 uppercase">Last chance</p>}
    </section>
  );
}
