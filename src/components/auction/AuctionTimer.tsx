import { TIMER_URGENT_FRACTION, formatSeconds } from "./auctionView";

const PERCENT = 100;

interface AuctionTimerProps {
  /** Null when bidding is closed (reveal). */
  remainingMs: number | null;
  totalMs: number;
  paused: boolean;
}

/**
 * Countdown rendered from the domain's timestamps. role="timer" is not a
 * live region, so screen readers are not flooded ten times a second; they
 * can still read it on demand.
 */
export function AuctionTimer({ remainingMs, totalMs, paused }: AuctionTimerProps) {
  const closed = remainingMs === null;
  const fraction = closed ? 0 : Math.min(1, remainingMs / totalMs);
  const urgent = !closed && !paused && fraction <= TIMER_URGENT_FRACTION;

  return (
    <div>
      <p id="timer-label" className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
        {paused ? "Paused" : "Time left"}
      </p>
      <div role="timer" aria-labelledby="timer-label" className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-7xl leading-none font-black tabular-nums sm:text-8xl ${
            closed ? "text-white/30" : urgent ? "text-rose-400 motion-safe:animate-pulse" : paused ? "text-amber-300" : "text-white"
          }`}
        >
          {closed ? "0.0" : formatSeconds(remainingMs)}
        </span>
        <span className="text-2xl font-bold text-emerald-200/60">sec</span>
      </div>
      <div aria-hidden="true" className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            urgent ? "bg-rose-400" : paused ? "bg-amber-300" : "bg-lime-300"
          }`}
          style={{ width: `${fraction * PERCENT}%` }}
        />
      </div>
    </div>
  );
}
