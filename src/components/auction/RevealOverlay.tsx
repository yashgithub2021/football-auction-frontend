import type { Game } from "@domain/types";
import { describeResult, formatMoney, formatSeconds, remainingRevealMs } from "./auctionView";

interface RevealOverlayProps {
  game: Game;
  now: number;
}

const TONE_STYLES = {
  sold: "bg-lime-300 text-emerald-950",
  awarded: "bg-sky-300 text-sky-950",
  unsold: "bg-white/90 text-emerald-950",
} as const;

/**
 * Shown during PLAYER_SOLD. Describes the domain's lastResult; the domain's
 * revealEndsAt decides when the next lot starts.
 */
export function RevealOverlay({ game, now }: RevealOverlayProps) {
  const result = game.lastResult;
  const remaining = remainingRevealMs(game, now);
  if (result === null || remaining === null) return null;

  const described = describeResult(game, result);

  return (
    <div
      aria-labelledby="reveal-headline"
      role="group"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-emerald-950/85 p-6 text-center backdrop-blur-sm"
    >
      <p
        id="reveal-headline"
        className={`-rotate-3 rounded-2xl px-6 py-2 text-4xl font-black tracking-widest uppercase shadow-2xl motion-safe:animate-stamp sm:px-8 sm:py-3 sm:text-7xl ${TONE_STYLES[described.tone]}`}
      >
        {described.headline}
      </p>
      {described.winner !== null && (
        <p className="mt-3 text-2xl font-black sm:text-4xl">
          <span className="text-lime-300">{described.winner}</span>
          <span className="text-white/60"> for </span>
          <span className="tabular-nums">{formatMoney(described.amount ?? 0)}</span>
        </p>
      )}
      <p className="text-emerald-100/80">{described.detail}</p>
      <p className="mt-2 text-sm font-bold tracking-widest text-emerald-200/70 uppercase">
        Continuing in {formatSeconds(remaining)}s
      </p>
    </div>
  );
}
