import type { GameStatus } from "@domain/types";

interface HostControlsProps {
  status: GameStatus;
  onPause: () => void;
  onResume: () => void;
}

/**
 * Pause/resume, chosen purely from the domain status. During the reveal the
 * Pause button stays visible but aria-disabled; pressing it asks the domain,
 * which explains why it can't pause.
 */
export function HostControls({ status, onPause, onResume }: HostControlsProps) {
  const base =
    "rounded-2xl px-5 py-3 text-lg font-black tracking-wide uppercase transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none";

  if (status === "PAUSED") {
    return (
      <button type="button" onClick={onResume} className={`${base} bg-amber-300 text-amber-950 hover:bg-amber-200`}>
        Resume
      </button>
    );
  }

  const canPause = status === "AUCTION_ACTIVE";
  return (
    <button
      type="button"
      onClick={onPause}
      aria-disabled={!canPause}
      className={`${base} ${canPause ? "border-2 border-white/30 hover:border-white/60 hover:bg-white/10" : "cursor-not-allowed border-2 border-white/10 text-white/30"}`}
    >
      Pause
    </button>
  );
}
