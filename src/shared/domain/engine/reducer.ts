// GENERATED from backend/src/domain/engine/reducer.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Single entry point for every state change.
 *
 * Actions are plain serializable objects, and time/randomness are injected, so
 * this same function can later run on a server and broadcast state over
 * WebSockets without changes.
 *
 * Status flow:
 *   READY ─START_GAME→ AUCTION_ACTIVE ─(bids reset endsAt)→ AUCTION_ACTIVE
 *   AUCTION_ACTIVE ─PAUSE→ PAUSED ─RESUME→ AUCTION_ACTIVE
 *   AUCTION_ACTIVE ─TICK (now ≥ endsAt)→ PLAYER_SOLD (SOLD / UNSOLD / AUTO_AWARDED)
 *   PLAYER_SOLD ─TICK (reveal over)→ AUCTION_ACTIVE | PLAYER_SOLD (last-manager auto-award) | GAME_COMPLETE
 *   AUCTION_ACTIVE | PAUSED | PLAYER_SOLD ─END_GAME→ ENDED_EARLY
 *
 * PAUSE and END_GAME first catch up on elapsed time, so an auction whose timer
 * already ran out is finalized (and its winner honored) instead of being
 * frozen or discarded. PLACE_BID deliberately does not, so a late bid is
 * reported as AUCTION_EXPIRED.
 */

import type { ActionResult, EngineDeps, Game, GameAction } from "../types";
import { pauseAuction, placeBid, resumeAuction } from "./auction";
import { canEndGame, endGame, startGame, tick } from "./game";

function invalid(game: Game, action: GameAction): ActionResult {
  return {
    game,
    error: {
      code: "INVALID_ACTION_FOR_STATUS",
      message: `${action.type} is not allowed while the game is ${game.status}.`,
    },
  };
}

export function applyAction(game: Game, action: GameAction, deps: EngineDeps): ActionResult {
  const { now, random } = deps;

  switch (action.type) {
    case "START_GAME":
      return game.status === "READY" ? { game: startGame(game, now, random) } : invalid(game, action);

    case "PLACE_BID": {
      const { game: next, validation } = placeBid(game, action.managerId, action.amount, now);
      if (!validation.ok) {
        return {
          game,
          bidValidation: validation,
          error: { code: "BID_REJECTED", message: validation.message },
        };
      }
      return { game: next, bidValidation: validation };
    }

    case "TICK":
      return { game: tick(game, now, random) };

    case "PAUSE": {
      const caughtUp = tick(game, now, random);
      return caughtUp.status === "AUCTION_ACTIVE"
        ? { game: pauseAuction(caughtUp, now) }
        : invalid(caughtUp, action);
    }

    case "RESUME":
      return game.status === "PAUSED" ? { game: resumeAuction(game, now) } : invalid(game, action);

    case "END_GAME": {
      const caughtUp = tick(game, now, random);
      return canEndGame(caughtUp) ? { game: endGame(caughtUp) } : invalid(caughtUp, action);
    }

    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
