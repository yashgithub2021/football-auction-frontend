import { useCallback } from "react";
import { areAllSquadsFull } from "@domain/engine";
import type { Game } from "@domain/types";

interface AuctionCompleteProps {
  game: Game;
}

/** Minimal end-of-auction placeholder. The full results experience is a later task. */
export function AuctionComplete({ game }: AuctionCompleteProps) {
  const focusHeading = useCallback((element: HTMLHeadingElement | null) => {
    element?.focus();
  }, []);

  const complete = game.status === "GAME_COMPLETE";
  // A completed auction may end with open slots when the pool runs out: nobody is handed players.
  const summary = areAllSquadsFull(game)
    ? `All ${game.managers.length} squads are full after ${game.history.length} lots.`
    : `Every player has been auctioned after ${game.history.length} lots. Some squads still have open slots.`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--color-emerald-800),var(--color-emerald-950)_60%)] px-4 py-10 text-center">
      <div>
        <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Football Auction</p>
        <h1 ref={focusHeading} tabIndex={-1} className="mt-2 text-5xl font-black tracking-tight outline-none sm:text-7xl">
          {complete ? "Auction complete" : "Auction ended"}
        </h1>
        <p className="mt-4 text-lg text-emerald-100/80">
          {complete ? summary : "The host ended the auction early."}{" "}
          Full results and team analysis will appear here.
        </p>
      </div>
    </main>
  );
}
