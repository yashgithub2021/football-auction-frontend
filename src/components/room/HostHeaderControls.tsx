"use client";

import { useState } from "react";
import type { Game } from "@domain/types";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { errorText } from "./errorText";

/** Decorative icons; each button carries its own accessible name. */
function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none";

interface HostHeaderControlsProps {
  game: Game;
  /** Connected and attached; the controls look unavailable otherwise. */
  live: boolean;
}

/**
 * The host's auction controls as icons in the room header, beside the
 * connection indicator: pause/resume and end game. Which icon shows follows
 * the server's game status. During the reveal the pause icon stays
 * available to press and the server explains why it can't pause. Ending the
 * game still asks for confirmation, since it ends the auction for everyone.
 */
export function HostHeaderControls({ game, live }: HostHeaderControlsProps) {
  const client = useRoomClient();
  const pause = useRequest(client.pause);
  const resume = useRequest(client.resumeAuction);
  const end = useRequest(client.endGame);
  const skip = useRequest(client.skipPlayer);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const error = [pause, resume, end, skip].find((request) => request.error !== null)?.error ?? null;

  const paused = game.status === "PAUSED";
  const canPause = live && game.status === "AUCTION_ACTIVE";
  const canSkip = live && game.status === "AUCTION_ACTIVE";

  return (
    <section aria-label="Host controls" className="flex flex-wrap items-center gap-2">
      {paused ? (
        <button
          type="button"
          aria-label="Resume"
          title="Resume auction"
          aria-disabled={!live}
          aria-busy={resume.pending}
          onClick={() => live && void resume.run()}
          className={`${ICON_BUTTON} ${live ? "border-amber-300 bg-amber-300 text-amber-950 hover:bg-amber-200" : "border-white/10 text-white/30"}`}
        >
          <PlayIcon />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Pause"
          title={canPause ? "Pause auction" : "You can pause while a player is up for auction"}
          aria-disabled={!canPause}
          aria-busy={pause.pending}
          onClick={() => live && void pause.run()}
          className={`${ICON_BUTTON} ${canPause ? "border-white/40 text-white hover:border-white hover:bg-white/10" : "border-white/10 text-white/30"}`}
        >
          <PauseIcon />
        </button>
      )}

      <button
        type="button"
        aria-label="Skip player"
        title={canSkip ? "Skip this player" : "Skip is available while bidding"}
        aria-disabled={!canSkip}
        aria-busy={skip.pending}
        onClick={() => canSkip && void skip.run()}
        className={`${ICON_BUTTON} ${canSkip ? "border-amber-300/70 text-amber-200 hover:bg-amber-300/20" : "border-white/10 text-white/30"}`}
      >
        <span aria-hidden="true" className="text-xs font-black uppercase">Skip</span>
      </button>

      {confirmingEnd ? (
        <span role="group" aria-label="Confirm end game" className="flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/10 py-1 pr-1 pl-3">
          <span className="text-sm font-semibold text-rose-100">End for everyone?</span>
          <button
            type="button"
            aria-busy={end.pending}
            onClick={() => void end.run()}
            className="min-h-11 rounded-full bg-rose-500 px-3 text-sm font-black text-white hover:bg-rose-400 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
          >
            Confirm end game
          </button>
          <button
            type="button"
            onClick={() => setConfirmingEnd(false)}
            className="min-h-11 rounded-full px-3 text-sm font-bold text-white hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none"
          >
            Keep playing
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-label="End game"
          title="End game for everyone"
          aria-disabled={!live}
          onClick={() => live && setConfirmingEnd(true)}
          className={`${ICON_BUTTON} ${live ? "border-rose-400/70 text-rose-200 hover:bg-rose-500/20" : "border-white/10 text-white/30"}`}
        >
          <StopIcon />
        </button>
      )}

      {error !== null && (
        <p role="alert" className="basis-full rounded-xl bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-100">
          {errorText(error)}
        </p>
      )}
    </section>
  );
}
