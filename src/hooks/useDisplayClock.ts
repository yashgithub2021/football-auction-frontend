import { useCallback, useEffect, useState } from "react";
import type { GameStore } from "@/state/gameStore";

/** How often the countdown display refreshes and the domain is ticked. */
export const DISPLAY_REFRESH_MS = 100;

export interface DisplayClock {
  /** Wall-clock time used only to render countdowns from the domain's absolute timestamps. */
  now: number;
  /** Refreshes `now` immediately, e.g. right after the host or a manager acts. */
  sync: () => void;
}

/**
 * SINGLE-DEVICE TEST HARNESS only (see state/gameStore.ts). In multiplayer the
 * server's scheduler ticks the game; the client uses useServerNow for display.
 *
 * Drives time-based progress while `running`: every refresh it dispatches a
 * TICK (the domain decides whether anything has expired) and updates the
 * display time. There is no separate UI countdown that could disagree with
 * the Game: remaining time is always derived from endsAt/revealEndsAt.
 */
export function useDisplayClock(store: GameStore, clock: () => number, running: boolean): DisplayClock {
  const [now, setNow] = useState(clock);

  const sync = useCallback(() => setNow(clock()), [clock]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      store.dispatch({ type: "TICK" });
      setNow(clock());
    }, DISPLAY_REFRESH_MS);
    return () => clearInterval(id);
  }, [store, clock, running]);

  return { now, sync };
}
