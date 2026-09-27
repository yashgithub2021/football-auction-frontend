import { useId } from "react";
import { calculateMaximumSafeBid, getQuickBidOptions, hasBids, isManagerActive } from "@domain/engine";
import type { Game, Manager, QuickBidOption } from "@domain/types";
import { formatMoney } from "@/components/auction/auctionView";

interface BidDockProps {
  game: Game;
  manager: Manager;
  /** Estimated server time; only used to grey out options that obviously can't work. */
  now: number;
  live: boolean;
  pending: boolean;
  /** The server's reason for the last rejected bid, if any. */
  error: string | null;
  onBid: (amount: number) => void;
}

function buttonLabel(option: QuickBidOption, raising: boolean): string {
  return raising
    ? `Bid ${formatMoney(option.amount)} (+${formatMoney(option.step)})`
    : `Open bidding at ${formatMoney(option.amount)}`;
}

/**
 * The phone's bidding controls: own budget, safe maximum and squad, plus big
 * quick-bid buttons. Pinned to the bottom on small screens by its parent.
 *
 * Not authoritative: options come from read-only display helpers, the button
 * only sends "bid N", and the server decides. While a bid is in flight (or
 * the connection is down) further presses are ignored, so a nervous
 * double-tap can't send two bids.
 */
export function BidDock({ game, manager, now, live, pending, error, onBid }: BidDockProps) {
  const headingId = useId();
  const { settings } = game;
  const auction = game.currentAuction;
  const active = isManagerActive(manager, settings);
  const leading = auction !== null && auction.highestBidderId === manager.id;
  const raising = auction !== null && hasBids(auction);
  const options = active ? getQuickBidOptions(game, manager.id, now) : [];
  const locked = pending || !live;

  const status = !live
    ? "Reconnecting… bidding is paused on this device."
    : pending
      ? "Submitting…"
      : !active
        ? "Your squad is complete."
        : leading && auction !== null
          ? `You're leading at ${formatMoney(auction.currentBid)}`
          : game.status === "PAUSED"
            ? "The host has paused the auction."
            : game.status === "PLAYER_SOLD"
              ? "Next player coming up…"
              : "";

  const send = (amount: number) => {
    if (locked) return;
    onBid(amount);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-3xl border-2 bg-emerald-900/95 p-3 shadow-2xl shadow-black/50 sm:p-4 ${leading ? "border-lime-300" : "border-white/15"}`}
    >
      <h2 id={headingId} className="sr-only">
        Your bid controls
      </h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-950/70 px-1 py-1.5">
          <dt className="text-[0.7rem] font-bold tracking-widest text-emerald-200/80 uppercase">Budget</dt>
          <dd className="text-xl font-black tabular-nums">{formatMoney(manager.budgetRemaining)}</dd>
        </div>
        <div className="rounded-xl bg-emerald-950/70 px-1 py-1.5">
          <dt className="text-[0.7rem] font-bold tracking-widest text-emerald-200/80 uppercase">Max bid</dt>
          <dd className="text-xl font-black text-lime-300 tabular-nums">
            {active ? formatMoney(calculateMaximumSafeBid(manager, settings)) : "–"}
          </dd>
        </div>
        <div className="rounded-xl bg-emerald-950/70 px-1 py-1.5">
          <dt className="text-[0.7rem] font-bold tracking-widest text-emerald-200/80 uppercase">Squad</dt>
          <dd className="text-xl font-black tabular-nums">
            {manager.playerIds.length}/{settings.teamSize}
          </dd>
        </div>
      </dl>

      <p role="status" className={`mt-2 min-h-5 text-center text-sm font-bold ${leading && live && !pending ? "text-lime-200" : "text-emerald-100"}`}>
        {status}
      </p>

      {active && (
        <div aria-busy={pending} className="mt-2 grid grid-cols-3 gap-2">
          {options.map((option) => {
            const unavailable = locked || !option.enabled;
            return (
              <button
                key={option.step}
                type="button"
                aria-disabled={unavailable}
                aria-label={buttonLabel(option, raising)}
                title={option.enabled ? undefined : option.message}
                onClick={() => send(option.amount)}
                // Only the tap-scale animates: availability must change colour instantly, so
                // a greyed-out button never briefly looks tappable.
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 py-2 transition-transform select-none focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none ${
                  unavailable ? "cursor-not-allowed bg-white/10 text-white/45" : "bg-lime-300 text-emerald-950 active:scale-95"
                }`}
              >
                <span className="text-2xl leading-none font-black tabular-nums">{formatMoney(option.amount)}</span>
                <span className="mt-1 text-xs font-bold">{raising ? `+${formatMoney(option.step)}` : "Open"}</span>
              </button>
            );
          })}
        </div>
      )}

      {error !== null && (
        <p role="alert" className="mt-2 rounded-xl bg-rose-500/25 px-3 py-2 text-sm font-semibold text-rose-50">
          {error}
        </p>
      )}
    </section>
  );
}
