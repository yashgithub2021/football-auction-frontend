"use client";

import { useState } from "react";
import { getPlayerById } from "@domain/players/players";
import type { Game, GameAction } from "@domain/types";
import { useDisplayClock } from "@/hooks/useDisplayClock";
import { useGame, type GameStore } from "@/state/gameStore";
import { ReadyScreen } from "../ready/ReadyScreen";
import { AuctionComplete } from "./AuctionComplete";
import { BidStatus } from "./BidStatus";
import { HostControls } from "./HostControls";
import { ManagerBidPanel } from "./ManagerBidPanel";
import { PlayerCard } from "./PlayerCard";
import { RevealOverlay } from "./RevealOverlay";
import { FEEDBACK_VISIBLE_MS, announcement, formatSeconds, rejectionMessage, remainingBidMs } from "./auctionView";

/** A rejected action, shown briefly. UI-only: it never mirrors game state. */
interface Feedback {
  message: string;
  /** Manager whose action was rejected, or null for host actions. */
  managerId: string | null;
  /** The lot it applies to; hidden once the auction moves on. */
  lotNumber: number;
  at: number;
}

export interface AuctionScreenProps {
  store: GameStore;
  /** Called from the READY screen so the host can change the setup. */
  onEditSetup: (game: Game) => void;
  /** Injected for tests; must be the same clock the store's deps use. */
  clock?: () => number;
}

/**
 * Renders the domain Game held by the store and turns user input into domain
 * actions. It holds no copy of game state: bids, budgets, timers, pause and
 * every automatic transition come from applyAction().
 */
export function AuctionScreen({ store, onEditSetup, clock = Date.now }: AuctionScreenProps) {
  const game = useGame(store);
  const running = game.status === "AUCTION_ACTIVE" || game.status === "PLAYER_SOLD";
  const { now, sync } = useDisplayClock(store, clock, running);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const act = (action: GameAction, managerId: string | null = null) => {
    const result = store.dispatch(action);
    sync();
    const message = rejectionMessage(action, result);
    setFeedback(message === null ? null : { message, managerId, lotNumber: result.game.lotCounter, at: clock() });
  };

  if (game.status === "READY" || game.status === "SETUP") {
    return (
      <ReadyScreen game={game} onStartAuction={() => act({ type: "START_GAME" })} onEditSetup={() => onEditSetup(game)} />
    );
  }

  if (game.status === "GAME_COMPLETE" || game.status === "ENDED_EARLY") {
    return <AuctionComplete game={game} />;
  }

  const auction = game.currentAuction;
  const player = auction === null ? undefined : getPlayerById(auction.playerId);
  const visibleFeedback =
    feedback !== null && feedback.lotNumber === game.lotCounter && now - feedback.at < FEEDBACK_VISIBLE_MS
      ? feedback
      : null;
  const pausedRemaining = game.status === "PAUSED" ? remainingBidMs(game, now) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--color-emerald-800),var(--color-emerald-950)_60%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[110rem]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Football Auction</p>
            <p className="text-sm text-emerald-100/70">
              {game.availablePlayerIds.length} players left in the pool
            </p>
          </div>
          <HostControls
            status={game.status}
            onPause={() => act({ type: "PAUSE" })}
            onResume={() => act({ type: "RESUME" })}
          />
        </header>

        {/* Event announcements only; the countdown itself is never announced. */}
        <p role="status" className="sr-only">
          {announcement(game)}
        </p>

        {visibleFeedback !== null && visibleFeedback.managerId === null && (
          <p role="alert" className="mt-4 rounded-2xl bg-rose-500/20 px-4 py-3 font-semibold text-rose-100">
            {visibleFeedback.message}
          </p>
        )}

        {auction !== null && player !== undefined && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="relative">
              <PlayerCard player={player} lotNumber={auction.lotNumber} />
              {game.status === "PAUSED" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-emerald-950/85 text-center backdrop-blur-sm">
                  <p className="text-6xl font-black tracking-widest text-amber-300 uppercase sm:text-7xl">Paused</p>
                  <p className="text-lg text-emerald-100">
                    Bidding is frozen with {formatSeconds(pausedRemaining ?? 0)}s left.
                  </p>
                </div>
              )}
              <RevealOverlay game={game} now={now} />
            </div>
            <BidStatus game={game} now={now} />
          </div>
        )}

        <section aria-labelledby="managers-heading" className="mt-6">
          <h2 id="managers-heading" className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
            Managers
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {game.managers.map((manager) => (
              <ManagerBidPanel
                key={manager.id}
                game={game}
                manager={manager}
                now={now}
                feedback={visibleFeedback?.managerId === manager.id ? visibleFeedback.message : null}
                onBid={(managerId, amount) => act({ type: "PLACE_BID", managerId, amount }, managerId)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
