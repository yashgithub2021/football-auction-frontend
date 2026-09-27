import { useSyncExternalStore } from "react";
import { applyAction } from "@domain/engine";
import type { ActionResult, EngineDeps, Game, GameAction } from "@domain/types";

export type EngineDepsFactory = () => EngineDeps;

/** Real time and randomness, supplied at dispatch time so the domain stays pure. */
export const systemEngineDeps: EngineDepsFactory = () => ({ now: Date.now(), random: Math.random });

export interface GameStore {
  getSnapshot: () => Game;
  subscribe: (listener: () => void) => () => void;
  /** Runs an action through the domain and returns its result (including rejections). */
  dispatch: (action: GameAction) => ActionResult;
}

/**
 * SINGLE-DEVICE TEST HARNESS. Not used by any app route: multiplayer state
 * comes from the server through RoomClient (src/state/room). Kept so the
 * original single-device components and their tests keep working.
 *
 * The single owner of the live Game. It holds nothing but the latest domain
 * state: every change goes through applyAction(), and rejected actions leave
 * the snapshot untouched. Actions are applied synchronously in call order, so
 * near-simultaneous bids are resolved by the domain exactly as they arrive.
 *
 * A future network-backed store (V2) can implement the same interface.
 */
export function createGameStore(initialGame: Game, deps: EngineDepsFactory = systemEngineDeps): GameStore {
  let game = initialGame;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => game,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action) => {
      const result = applyAction(game, action, deps());
      if (result.game !== game) {
        game = result.game;
        listeners.forEach((listener) => listener());
      }
      return result;
    },
  };
}

/** Subscribes a component to the store's current Game. */
export function useGame(store: GameStore): Game {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
