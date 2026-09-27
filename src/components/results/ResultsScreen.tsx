"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { RatingCategory } from "@domain/types";
import type { AuctionStatistics, GameResults, LotHistoryEntry, ManagerResult, SessionSnapshot } from "@protocol";
import { formatMoney } from "@/components/auction/auctionView";
import { errorText } from "@/components/room/errorText";
import { ActionButton, ErrorMessage } from "@/components/room/ui";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { copyText } from "./copyText";
import { END_REASON_HEADING, OUTCOME_LABEL, describeLot, formatResultsText } from "./resultsText";

const RATING_LABELS: ReadonlyArray<readonly [RatingCategory, string]> = [
  ["attacking", "Attacking"],
  ["creativity", "Creativity"],
  ["defending", "Defending"],
  ["physical", "Physical"],
  ["technical", "Technical"],
  ["sixAsideFit", "6-a-side fit"],
  ["goalkeeping", "Goalkeeping"],
];

const POSITION_GROUP_LABELS = [
  ["GK", "Goalkeepers"],
  ["DEF", "Defenders"],
  ["MID", "Midfielders"],
  ["ATT", "Attackers"],
] as const;

const OUTCOME_STYLE: Record<LotHistoryEntry["outcome"], string> = {
  SOLD: "bg-lime-300 text-emerald-950",
  UNSOLD: "bg-white/15 text-white",
  INTERRUPTED: "border border-amber-300/70 text-amber-100",
};

type CopyState = { kind: "idle" } | { kind: "copied" } | { kind: "failed" };

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function summaryText({ endReason, statistics, managers }: GameResults): string {
  if (endReason === "COMPLETED" && !managers.every((manager) => manager.complete)) {
    return `Every player has been auctioned after ${plural(statistics.lotsCompleted, "lot")}. Some squads still have open slots.`;
  }
  return endReason === "COMPLETED"
    ? `Every squad is full after ${plural(statistics.lotsCompleted, "lot")}.`
    : `The host ended the auction before every squad was full, after ${plural(statistics.lotsCompleted, "completed lot")}.`;
}

function Statistics({ statistics }: { statistics: AuctionStatistics }) {
  const headingId = useId();
  const items: Array<[string, string]> = [
    ["Lots completed", String(statistics.lotsCompleted)],
    ["Sold", String(statistics.playersSold)],
    ["Unsold", String(statistics.playersUnsold)],
    ...(statistics.lotsInterrupted > 0 ? ([["Interrupted", String(statistics.lotsInterrupted)]] as Array<[string, string]>) : []),
    ["Bids placed", String(statistics.totalBids)],
    ["Total spent", formatMoney(statistics.totalSpent)],
    ["Average price", statistics.averagePrice === null ? "–" : formatMoney(statistics.averagePrice)],
  ];
  const top = statistics.highestSale;
  return (
    <section aria-labelledby={headingId} className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-black tracking-widest text-emerald-200/80 uppercase">
        Auction statistics
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-emerald-950/60 px-3 py-2">
            <dt className="text-xs font-bold tracking-wide text-emerald-200/80 uppercase">{label}</dt>
            <dd className="text-2xl font-black tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-base">
        <span className="font-bold text-emerald-200/80">Highest price: </span>
        {top === null ? "No players were bought." : `${top.playerName} to ${top.managerName} for ${formatMoney(top.amount)} (lot ${top.lotNumber})`}
      </p>
    </section>
  );
}

function TeamCard({ manager, isViewer }: { manager: ManagerResult; isViewer: boolean }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-testid="team-card"
      // Phones: your own team comes first. Wider screens keep join order.
      className={`flex min-w-0 flex-col gap-3 rounded-3xl border p-4 sm:p-5 ${isViewer ? "border-lime-300/60 bg-lime-300/5 max-sm:order-first" : "border-white/10 bg-white/5"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="min-w-0 truncate text-2xl font-black">
          {manager.name}
        </h3>
        {isViewer && <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-black text-emerald-950 uppercase">Your team</span>}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-950/60 px-2 py-2">
          <dt className="text-xs font-bold tracking-wide text-emerald-200/80 uppercase">Spent</dt>
          <dd className="text-xl font-black tabular-nums">{formatMoney(manager.spent)}</dd>
        </div>
        <div className="rounded-2xl bg-emerald-950/60 px-2 py-2">
          <dt className="text-xs font-bold tracking-wide text-emerald-200/80 uppercase">Remaining</dt>
          <dd className="text-xl font-black text-lime-300 tabular-nums">{formatMoney(manager.budgetRemaining)}</dd>
        </div>
        <div className="rounded-2xl bg-emerald-950/60 px-2 py-2">
          <dt className="text-xs font-bold tracking-wide text-emerald-200/80 uppercase">Squad</dt>
          <dd className="text-xl font-black tabular-nums">
            {manager.squadSize}/{manager.teamSize}
          </dd>
        </div>
      </dl>
      <p className={`text-sm font-bold ${manager.complete ? "text-emerald-100" : "text-amber-200"}`}>
        {manager.complete ? "Squad complete" : `Incomplete: ${plural(manager.openSlots, "open slot")}`}
      </p>

      {manager.players.length === 0 ? (
        <p className="text-emerald-100/80">No players bought.</p>
      ) : (
        <ol aria-label={`${manager.name}'s players`} className="divide-y divide-white/10 rounded-2xl border border-white/10">
          {manager.players.map((player) => (
            <li key={player.playerId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-11 shrink-0 rounded bg-lime-300 px-1 text-center text-xs font-black text-emerald-950">{player.primaryPosition}</span>
                <span className="min-w-0 truncate font-bold">{player.name}</span>
              </span>
              <span className="shrink-0 font-black tabular-nums">{formatMoney(player.price)}</span>
            </li>
          ))}
        </ol>
      )}

      <div>
        <h4 className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">Squad composition</h4>
        <dl className="mt-1 grid grid-cols-4 gap-2 text-center">
          {POSITION_GROUP_LABELS.map(([group, label]) => (
            <div key={group} className="rounded-xl bg-emerald-950/60 py-1">
              <dt className="text-xs font-bold text-emerald-200/80">
                <abbr title={label} className="no-underline">
                  {group}
                </abbr>
              </dt>
              <dd className="text-lg font-black tabular-nums">{manager.positionCounts[group]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h4 className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">Average game ratings (1–5)</h4>
        {manager.averageRatings === null ? (
          <p className="mt-1 text-sm text-emerald-100/80">No players, so no ratings.</p>
        ) : (
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
            {RATING_LABELS.map(([category, label]) => (
              <div key={category} className="flex justify-between gap-2">
                <dt className="text-emerald-100/80">{label}</dt>
                <dd className="font-bold tabular-nums">{manager.averageRatings?.[category].toFixed(1)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function LotHistory({ lots }: { lots: readonly LotHistoryEntry[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-black tracking-widest text-emerald-200/80 uppercase">
        Auction history
      </h2>
      {lots.length === 0 ? (
        <p className="mt-2 text-emerald-100/80">No lots were auctioned.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {lots.map((lot) => (
            <li key={lot.lotNumber} aria-label={`Lot ${lot.lotNumber}`} className="rounded-2xl bg-emerald-950/60 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs font-black tracking-widest text-emerald-200/80 uppercase">Lot {lot.lotNumber}</span>
                <span className="font-bold">
                  {lot.playerName} <span className="text-sm text-emerald-100/70">({lot.primaryPosition})</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${OUTCOME_STYLE[lot.outcome]}`}>{OUTCOME_LABEL[lot.outcome]}</span>
              </div>
              <p className="mt-1 text-sm text-emerald-50">{describeLot(lot)}.</p>
              {lot.bids.length > 0 && (
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer font-semibold text-emerald-100/90">{plural(lot.bids.length, "bid")}</summary>
                  <ol className="mt-1 flex flex-wrap gap-2">
                    {lot.bids.map((bid, index) => (
                      <li key={`${bid.placedAt}-${index}`} className="rounded-lg bg-white/10 px-2 py-0.5">
                        {bid.managerName} {formatMoney(bid.amount)}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Host only: go again with the same people. Asks first, because the server
 * drops these results for everyone once the room is back in the lobby.
 */
function NewAuctionPanel({ live }: { live: boolean }) {
  const client = useRoomClient();
  const headingId = useId();
  const start = useRequest(client.newAuction);
  const [confirming, setConfirming] = useState(false);
  return (
    <section aria-labelledby={headingId} className="rounded-3xl border-2 border-amber-300/50 bg-amber-300/5 p-4 sm:p-6">
      <h2 id={headingId} className="text-sm font-black tracking-widest text-amber-200 uppercase">
        Play again
      </h2>
      <p className="mt-1 text-emerald-50">Start a new auction with the same people and rules. Everyone goes back to the lobby with a fresh budget.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {confirming ? (
          <>
            <ActionButton pending={start.pending} unavailable={!live} onClick={() => live && void start.run()}>
              Confirm new auction
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => setConfirming(false)}>
              Keep results
            </ActionButton>
          </>
        ) : (
          <ActionButton unavailable={!live} onClick={() => live && setConfirming(true)}>
            Start new auction
          </ActionButton>
        )}
      </div>
      {confirming && (
        <p className="mt-2 text-sm font-semibold text-amber-100">These results will disappear for everyone. Copy them first if you want to keep them.</p>
      )}
      <div className="mt-2">
        <ErrorMessage>{start.error !== null && errorText(start.error)}</ErrorMessage>
      </div>
    </section>
  );
}

interface ResultsScreenProps {
  session: SessionSnapshot;
  results: GameResults;
  /** Connected and attached; the host's new-auction action is unavailable otherwise. */
  live?: boolean;
}

/**
 * Final results, rendered from the server's `snapshot.results`. Nothing is
 * computed here beyond formatting: squads, prices, budgets, statistics and
 * history all come from the server's results builder.
 */
export function ResultsScreen({ session, results, live = true }: ResultsScreenProps) {
  const teamsHeadingId = useId();
  const [copy, setCopy] = useState<CopyState>({ kind: "idle" });
  const text = useMemo(() => formatResultsText(results), [results]);
  const focusHeading = useCallback((element: HTMLHeadingElement | null) => {
    element?.focus();
  }, []);
  const complete = results.endReason === "COMPLETED";

  const onCopy = async () => {
    setCopy((await copyText(text)) ? { kind: "copied" } : { kind: "failed" });
  };

  return (
    <div data-view="results" data-end-reason={results.endReason} className="space-y-4 sm:space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className={`inline-block rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase ${complete ? "bg-lime-300 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>
            {complete ? "Completed" : "Ended early"}
          </p>
          <h1 ref={focusHeading} tabIndex={-1} className="mt-2 text-4xl font-black tracking-tight outline-none sm:text-6xl">
            {END_REASON_HEADING[results.endReason]}
          </h1>
          <p className="mt-2 text-lg text-emerald-100/90">{summaryText(results)}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <ActionButton onClick={() => void onCopy()}>{copy.kind === "copied" ? "Copied" : "Copy results"}</ActionButton>
          <p role="status" className="min-h-5 text-sm font-semibold">
            {copy.kind === "copied" && "Results copied. Paste them anywhere."}
            {copy.kind === "failed" && "Couldn't copy automatically. Use “Results as text” below."}
          </p>
        </div>
      </section>

      {session.isHost ? (
        <NewAuctionPanel live={live} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-emerald-100/90">
          The host can start a new auction with the same group. You&apos;ll go back to the lobby automatically.
        </p>
      )}

      <Statistics statistics={results.statistics} />

      <section aria-labelledby={teamsHeadingId}>
        <h2 id={teamsHeadingId} className="text-sm font-black tracking-widest text-emerald-200/80 uppercase">
          Teams
        </h2>
        <p className="mt-1 text-sm text-emerald-100/80">
          Ratings are this game&apos;s editable 1–5 player ratings, not objective real-world assessments. Teams are not ranked.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.managers.map((manager) => (
            <TeamCard key={manager.managerId} manager={manager} isViewer={manager.managerId === session.managerId} />
          ))}
        </div>
      </section>

      <LotHistory lots={results.lots} />

      <details className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <summary className="cursor-pointer text-sm font-black tracking-widest text-emerald-200/80 uppercase">Results as text</summary>
        <pre data-testid="results-text" className="mt-3 overflow-x-auto rounded-2xl bg-emerald-950/70 p-3 text-sm whitespace-pre-wrap select-all">
          {text}
        </pre>
      </details>
    </div>
  );
}
