"use client";

import { useId, useState, type ReactNode } from "react";
import { getOpenSlots } from "@domain/engine";
import { getPlayerById } from "@domain/players/players";
import type { Game, Manager } from "@domain/types";
import type { PublicRoomSnapshot, SessionSnapshot } from "@protocol";
import { BidStatus } from "@/components/auction/BidStatus";
import { HostControls } from "@/components/auction/HostControls";
import { ManagerBidPanel } from "@/components/auction/ManagerBidPanel";
import { PlayerCard } from "@/components/auction/PlayerCard";
import { RevealOverlay } from "@/components/auction/RevealOverlay";
import { announcement, formatMoney, formatSeconds, remainingBidMs } from "@/components/auction/auctionView";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { managerPresence, usesManagerView, viewerKind } from "@/state/room/viewer";
import { BidDock } from "./BidDock";
import { errorText } from "./errorText";
import { LotStatus } from "./LotStatus";
import { RecentActivity } from "./RecentActivity";
import { ActionButton, ErrorMessage } from "./ui";

interface AuctionRoomProps {
  snapshot: PublicRoomSnapshot;
  session: SessionSnapshot;
  serverNow: number;
  /** Connected and attached. When false, everything shown is the last known server state. */
  live: boolean;
}

/**
 * Host auction controls, set apart from game actions (amber panel, own
 * heading) so they never sit on top of the bid buttons. Ending the game asks
 * for confirmation; pause/resume follow the server's game status.
 */
function HostPanel({ game, live }: { game: Game; live: boolean }) {
  const client = useRoomClient();
  const headingId = useId();
  const pause = useRequest(client.pause);
  const resume = useRequest(client.resumeAuction);
  const end = useRequest(client.endGame);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const error = [pause, resume, end].find((request) => request.error !== null)?.error ?? null;

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border-2 border-amber-300/50 bg-amber-300/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-sm font-black tracking-widest text-amber-200 uppercase">
          Host controls
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <HostControls status={live ? game.status : "PLAYER_SOLD"} onPause={() => void pause.run()} onResume={() => void resume.run()} />
          {confirmingEnd ? (
            <>
              <ActionButton tone="danger" pending={end.pending} onClick={() => void end.run()}>
                Confirm end game
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => setConfirmingEnd(false)}>
                Keep playing
              </ActionButton>
            </>
          ) : (
            <ActionButton tone="danger" unavailable={!live} onClick={() => live && setConfirmingEnd(true)}>
              End game
            </ActionButton>
          )}
        </div>
      </div>
      {confirmingEnd && <p className="mt-2 text-sm text-amber-100">This ends the auction for everyone. Squads stay as they are.</p>}
      <div className="mt-2">
        <ErrorMessage>{error !== null && errorText(error)}</ErrorMessage>
      </div>
    </section>
  );
}

function PausedOverlay({ game, serverNow }: { game: Game; serverNow: number }) {
  if (game.status !== "PAUSED") return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-emerald-950/90 p-4 text-center backdrop-blur-sm">
      <p className="text-5xl font-black tracking-widest text-amber-300 uppercase sm:text-7xl">Paused</p>
      <p className="text-base text-emerald-100 sm:text-lg">Bidding is frozen with {formatSeconds(remainingBidMs(game, serverNow) ?? 0)}s left.</p>
    </div>
  );
}

/** Marks everything below as the last known state while the connection is down. */
function OfflineVeil({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <div className="relative" aria-busy={!live}>
      {!live && (
        <p className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1 text-xs font-black tracking-widest whitespace-nowrap text-white uppercase shadow-lg">
          Offline · last known state
        </p>
      )}
      <div className={live ? "" : "opacity-60 grayscale-[40%]"}>{children}</div>
    </div>
  );
}

function MySquad({ manager, teamSize }: { manager: Manager; teamSize: number }) {
  const headingId = useId();
  const open = teamSize - manager.playerIds.length;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 id={headingId} className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
        Your squad · {manager.playerIds.length}/{teamSize}
      </h2>
      {manager.playerIds.length === 0 ? (
        <p className="mt-2 text-emerald-100/70">No players yet. Every manager needs {teamSize}.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {manager.playerIds.map((id) => {
            const player = getPlayerById(id);
            return (
              <li key={id} className="rounded-xl bg-emerald-950/70 px-3 py-1.5 text-sm font-bold">
                <span className="mr-1.5 rounded bg-lime-300 px-1.5 text-xs font-black text-emerald-950">{player?.primaryPosition ?? "?"}</span>
                {player?.name ?? id}
              </li>
            );
          })}
        </ul>
      )}
      {open > 0 && manager.playerIds.length > 0 && <p className="mt-2 text-sm text-emerald-100/70">{open} to go.</p>}
    </section>
  );
}

/** Compact standings of everyone else, for the phone view. Status is spelled out, not just coloured. */
function OtherManagers({ game, excludeManagerId, presence }: { game: Game; excludeManagerId: string; presence: ReadonlyMap<string, boolean> }) {
  const headingId = useId();
  const leader = game.currentAuction?.highestBidderId ?? null;
  return (
    <section aria-labelledby={headingId} data-testid="other-managers">
      <h2 id={headingId} className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
        Other managers
      </h2>
      <ul className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
        {game.managers
          .filter((manager) => manager.id !== excludeManagerId)
          .map((manager) => {
            const tags = [
              leader === manager.id ? "Leading" : null,
              getOpenSlots(manager, game.settings) === 0 ? "Full" : null,
              presence.get(manager.id) === false ? "Offline" : null,
            ].filter((tag): tag is string => tag !== null);
            return (
              <li key={manager.id} aria-label={manager.name} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate font-bold">
                  {manager.name}
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`ml-2 rounded-full px-2 py-0.5 text-[0.7rem] font-black uppercase ${
                        tag === "Leading" ? "bg-lime-300 text-emerald-950" : tag === "Offline" ? "border border-rose-300/60 text-rose-100" : "bg-white/10"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
                <span className="shrink-0 text-sm text-emerald-100/90 tabular-nums">
                  {formatMoney(manager.budgetRemaining)} · {manager.playerIds.length}/{game.settings.teamSize}
                </span>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

/**
 * Role-based auction view, chosen from the server's session snapshot:
 * - playing viewers (manager, host who plays): phone-first. Player, bid and
 *   timer on top; own squad and others below; bid dock pinned to the bottom
 *   (a sticky side column from `lg` up). A playing host also gets the host panel.
 * - host who doesn't play: the auctioneer board with every manager and host controls.
 * - spectators: the same board, without any controls at all.
 * Layout is CSS-only (breakpoints), no viewport detection in JavaScript.
 */
export function AuctionRoom({ snapshot, session, serverNow, live }: AuctionRoomProps) {
  const client = useRoomClient();
  const bid = useRequest(client.bid);
  const game = snapshot.game;
  if (game === null) return null;

  const auction = game.currentAuction;
  const player = auction === null ? undefined : getPlayerById(auction.playerId);
  const presence = managerPresence(snapshot);
  const hostPanel = session.isHost ? <HostPanel game={game} live={live} /> : null;
  const announcer = (
    <p role="status" aria-live="polite" className="sr-only">
      {live ? announcement(game) : "Connection lost. Showing the last known state."}
    </p>
  );

  if (usesManagerView(session)) {
    const me = game.managers.find((manager) => manager.id === session.managerId);
    return (
      // Phone: one column, dock fixed at the bottom. From `lg`: the dock and the
      // other managers form a right-hand column beside the stage (grid placement only).
      <div
        data-view="manager"
        className="space-y-4 pb-72 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6 lg:space-y-0 lg:pb-0 xl:grid-cols-[minmax(0,1fr)_28rem]"
      >
        {announcer}
        <div className="min-w-0 space-y-4 lg:row-span-2">
          {hostPanel}
          <OfflineVeil live={live}>
            <div className="relative space-y-3">
              {auction !== null && player !== undefined && <PlayerCard player={player} lotNumber={auction.lotNumber} />}
              <LotStatus game={game} now={serverNow} live={live} viewerManagerId={session.managerId} />
              <PausedOverlay game={game} serverNow={serverNow} />
              <RevealOverlay game={game} now={serverNow} />
            </div>
          </OfflineVeil>
          {me !== undefined && <MySquad manager={me} teamSize={game.settings.teamSize} />}
        </div>
        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-2">
          <OtherManagers game={game} excludeManagerId={session.managerId ?? ""} presence={presence} />
          <RecentActivity game={game} />
        </div>
        {me !== undefined && (
          <div
            data-testid="bid-dock"
            className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-emerald-950/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:col-start-2 lg:row-start-1 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          >
            <div className="mx-auto max-w-xl">
              <BidDock
                game={game}
                manager={me}
                now={serverNow}
                live={live}
                pending={bid.pending}
                error={bid.error !== null ? errorText(bid.error) : null}
                onBid={(amount) => void bid.run(amount)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const spectator = viewerKind(session) === "SPECTATOR";
  return (
    <div data-view="board" className="space-y-5">
      {announcer}
      {hostPanel}
      {spectator && (
        <p className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center font-semibold">
          You&apos;re watching. Bidding is for the managers in this game.
        </p>
      )}
      <OfflineVeil live={live}>
        {auction !== null && player !== undefined && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="relative">
              <PlayerCard player={player} lotNumber={auction.lotNumber} />
              <PausedOverlay game={game} serverNow={serverNow} />
              <RevealOverlay game={game} now={serverNow} />
            </div>
            {live ? <BidStatus game={game} now={serverNow} /> : <LotStatus game={game} now={serverNow} live={false} />}
          </div>
        )}
      </OfflineVeil>
      <section aria-labelledby="board-managers-heading">
        <h2 id="board-managers-heading" className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
          Managers
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {game.managers.map((manager) => (
            <ManagerBidPanel
              key={manager.id}
              game={game}
              manager={manager}
              now={serverNow}
              feedback={null}
              interactive={false}
              connected={presence.get(manager.id)}
              onBid={() => undefined}
            />
          ))}
        </div>
      </section>
      <RecentActivity game={game} />
    </div>
  );
}
