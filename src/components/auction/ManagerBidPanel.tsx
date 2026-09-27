import {
  calculateMaximumSafeBid,
  getOpenSlots,
  getQuickBidOptions,
  hasBids,
  isManagerActive,
} from "@domain/engine";
import type { Game, Manager, QuickBidOption } from "@domain/types";
import { formatMoney, playerName } from "./auctionView";

interface ManagerBidPanelProps {
  game: Game;
  manager: Manager;
  now: number;
  /** Rejection message for this manager's last action, if still relevant. */
  feedback: string | null;
  onBid: (managerId: string, amount: number) => void;
  /** False for panels the viewer can't bid from (other managers, board view). */
  interactive?: boolean;
  /** A bid from this panel is waiting for the server. */
  pending?: boolean;
  /** Multiplayer presence; undefined when not applicable (single device). */
  connected?: boolean;
}

function bidLabel(managerName: string, option: QuickBidOption, raising: boolean): string {
  return raising
    ? `${managerName}: bid ${formatMoney(option.amount)} (+${formatMoney(option.step)})`
    : `${managerName}: open at ${formatMoney(option.amount)}`;
}

/**
 * One manager's bidding station. Every number and every enabled/disabled
 * state comes from domain selectors; buttons only dispatch PLACE_BID.
 * Invalid buttons use aria-disabled (not `disabled`) so focus is never
 * yanked away mid-auction and a press still explains why via the domain.
 */
export function ManagerBidPanel({
  game,
  manager,
  now,
  feedback,
  onBid,
  interactive = true,
  pending = false,
  connected,
}: ManagerBidPanelProps) {
  const { settings } = game;
  const auction = game.currentAuction;
  const active = isManagerActive(manager, settings);
  const leading = auction !== null && auction.highestBidderId === manager.id;
  const raising = auction !== null && hasBids(auction);
  // Used only to grey out buttons that obviously can't work; the server decides.
  const options = active && interactive ? getQuickBidOptions(game, manager.id, now) : [];
  const headingId = `panel-${manager.id}`;
  const feedbackId = `${headingId}-feedback`;

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col rounded-3xl border-2 p-4 transition sm:p-5 ${
        leading
          ? "border-lime-300 bg-lime-300/10 shadow-lg shadow-lime-300/10"
          : active
            ? "border-white/10 bg-white/5"
            : "border-white/5 bg-white/[0.02] opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="truncate text-2xl font-black tracking-tight">
          {manager.name}
        </h3>
        {leading && (
          <span className="shrink-0 rounded-full bg-lime-300 px-3 py-1 text-xs font-black tracking-widest text-emerald-950 uppercase">
            Leading
          </span>
        )}
        {!active && (
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-black tracking-widest text-emerald-100 uppercase">
            Squad complete
          </span>
        )}
        {connected === false && (
          <span className="shrink-0 rounded-full border border-rose-300/60 px-3 py-1 text-xs font-black tracking-widest text-rose-100 uppercase">
            Offline
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-emerald-950/60 px-1 py-2">
          <dt className="text-[0.65rem] font-bold tracking-widest text-emerald-200/70 uppercase">Budget</dt>
          <dd className="text-xl font-black tabular-nums">{formatMoney(manager.budgetRemaining)}</dd>
        </div>
        <div className="rounded-xl bg-emerald-950/60 px-1 py-2">
          <dt className="text-[0.65rem] font-bold tracking-widest text-emerald-200/70 uppercase">Squad</dt>
          <dd className="text-xl font-black tabular-nums">
            {manager.playerIds.length}/{settings.teamSize}
          </dd>
        </div>
        <div className="rounded-xl bg-emerald-950/60 px-1 py-2">
          <dt className="text-[0.65rem] font-bold tracking-widest text-emerald-200/70 uppercase">Open slots</dt>
          <dd className="text-xl font-black tabular-nums">{getOpenSlots(manager, settings)}</dd>
        </div>
        <div className="rounded-xl bg-emerald-950/60 px-1 py-2">
          <dt className="text-[0.65rem] font-bold tracking-widest text-emerald-200/70 uppercase">Max bid</dt>
          <dd className="text-xl font-black text-lime-300 tabular-nums">
            {active ? formatMoney(calculateMaximumSafeBid(manager, settings)) : "–"}
          </dd>
        </div>
      </dl>

      {active && interactive && pending && (
        <p role="status" className="mt-3 text-sm font-bold text-lime-200">
          Submitting…
        </p>
      )}

      {active && interactive && (
        <div aria-busy={pending} className="mt-4 grid grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.step}
              type="button"
              aria-disabled={!option.enabled}
              aria-describedby={feedback === null ? undefined : feedbackId}
              aria-label={bidLabel(manager.name, option, raising)}
              title={option.enabled ? undefined : option.message}
              onClick={() => onBid(manager.id, option.amount)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 py-2 transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none ${
                option.enabled
                  ? "bg-lime-300 text-emerald-950 hover:bg-lime-200 active:scale-95"
                  : "cursor-not-allowed bg-white/5 text-white/30"
              }`}
            >
              <span className="text-2xl leading-none font-black tabular-nums">{formatMoney(option.amount)}</span>
              <span className="mt-1 text-xs font-bold">{raising ? `+${formatMoney(option.step)}` : "Open"}</span>
            </button>
          ))}
        </div>
      )}

      {feedback !== null && (
        <p id={feedbackId} role="alert" className="mt-2 rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100">
          {feedback}
        </p>
      )}

      <div className="mt-3 border-t border-white/10 pt-3">
        <h4 className="sr-only">{manager.name}&apos;s players</h4>
        {manager.playerIds.length === 0 ? (
          <p className="text-sm text-emerald-200/50">No players yet</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {manager.playerIds.map((id) => (
              <li key={id} className="rounded-lg bg-white/10 px-2 py-1 text-sm font-semibold">
                {playerName(id)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
