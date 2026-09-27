import { useCallback } from "react";
import { MS_PER_SECOND } from "@domain/constants";
import type { Game } from "@domain/types";

interface ReadyScreenProps {
  game: Game;
  onStartAuction: () => void;
  onEditSetup: () => void;
}

/** A READY game: confirms what the domain created and lets the host kick off. */
export function ReadyScreen({ game, onStartAuction, onEditSetup }: ReadyScreenProps) {
  const { settings, managers } = game;

  // Stable, so focus moves here once on arrival and never again on re-render.
  const focusHeading = useCallback((element: HTMLHeadingElement | null) => {
    element?.focus();
  }, []);

  const facts = [
    { label: "Budget", value: `$${settings.startingBudget}` },
    { label: "Team size", value: String(settings.teamSize) },
    { label: "Minimum bid", value: `$${settings.minimumBid}` },
    { label: "Bid increment", value: `$${settings.bidIncrement}` },
    { label: "Timer", value: `${settings.auctionTimerMs / MS_PER_SECOND}s` },
  ];

  return (
    <main className="flex min-h-screen items-center bg-[radial-gradient(ellipse_at_top,var(--color-emerald-800),var(--color-emerald-950)_60%)] px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl text-center">
        <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Football Auction</p>
        <h1 ref={focusHeading} tabIndex={-1} className="mt-2 text-5xl font-black tracking-tight outline-none sm:text-7xl">
          Ready for kick-off
        </h1>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {facts.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
              <dt className="text-xs font-bold tracking-widest text-emerald-200/70 uppercase">{item.label}</dt>
              <dd className="mt-1 text-3xl font-black tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-10 text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
          {managers.length} managers
        </h2>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {managers.map((manager) => (
            <li key={manager.id} className="rounded-full bg-lime-300 px-4 py-2 text-lg font-black text-emerald-950">
              {manager.name}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-emerald-100/70">
          Players are drawn at random. {game.availablePlayerIds.length} players are in the pool.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onStartAuction}
            className="w-full max-w-md rounded-3xl bg-lime-300 px-6 py-6 text-3xl font-black tracking-wide text-emerald-950 uppercase shadow-xl shadow-lime-300/20 transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
          >
            Start auction
          </button>
          <button
            type="button"
            onClick={onEditSetup}
            className="rounded-2xl border-2 border-white/20 px-6 py-3 text-lg font-bold transition hover:border-white/50 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:outline-none"
          >
            Edit setup
          </button>
        </div>
      </div>
    </main>
  );
}
