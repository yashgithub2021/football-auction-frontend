import { MS_PER_SECOND } from "@domain/constants";
import type { Countdown } from "@protocol";

/**
 * "3, 2, 1, GO" drawn from the server's countdown timestamps and the
 * estimated server time. Purely visual: the game starts when the server
 * says so (the next snapshot), not when this reaches GO.
 */
export function countdownLabel(countdown: Countdown, serverNow: number): string {
  if (serverNow >= countdown.goAt) return "GO";
  return String(Math.max(1, Math.ceil((countdown.goAt - serverNow) / MS_PER_SECOND)));
}

interface CountdownOverlayProps {
  countdown: Countdown;
  serverNow: number;
  /** Host only: cancel the countdown (inside the overlay so it's always reachable). */
  onCancel?: () => void;
  cancelPending?: boolean;
  cancelError?: string | null;
}

export function CountdownOverlay({ countdown, serverNow, onCancel, cancelPending = false, cancelError = null }: CountdownOverlayProps) {
  const label = countdownLabel(countdown, serverNow);
  const go = label === "GO";
  return (
    <div
      aria-labelledby="countdown-heading"
      role="group"
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-emerald-950/95 px-4 backdrop-blur-sm"
    >
      <p id="countdown-heading" className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">
        Get ready
      </p>
      {/* Changes at most once a second, so screen readers hear 3, 2, 1, GO — not a flood. */}
      <p
        role="status"
        aria-label={`Starting: ${label}`}
        className={`text-[9rem] leading-none font-black tabular-nums sm:text-[14rem] ${go ? "text-lime-300" : "text-white"}`}
      >
        {label}
      </p>
      <p className="text-emerald-100/80">{go ? "First player coming up…" : "The auction is about to start."}</p>
      {onCancel !== undefined && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-busy={cancelPending}
            onClick={onCancel}
            className="min-h-12 rounded-2xl border-2 border-rose-300/70 px-6 py-3 text-lg font-black text-rose-50 uppercase transition hover:bg-rose-500/20 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
          >
            Cancel countdown
          </button>
          {cancelError !== null && (
            <p role="alert" className="text-sm font-semibold text-rose-100">
              {cancelError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
