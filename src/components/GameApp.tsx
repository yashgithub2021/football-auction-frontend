"use client";

import { useState } from "react";
import { createGameStore, type GameStore } from "@/state/gameStore";
import { AuctionScreen } from "./auction/AuctionScreen";
import { SetupScreen } from "./setup/SetupScreen";
import { draftFromGame, type SetupDraft } from "./setup/setupDraft";

/**
 * SINGLE-DEVICE TEST HARNESS. No longer mounted by any route (the app is the
 * multiplayer HomeScreen / RoomScreen); kept for its component tests.
 *
 * Top-level client shell. Once setup creates a Game, a store owns it and the
 * auction screen renders it; there is no separate UI copy of game state.
 * Persistence arrives in Phase 7.
 */
export function GameApp() {
  const [store, setStore] = useState<GameStore | null>(null);
  const [returningDraft, setReturningDraft] = useState<SetupDraft | undefined>(undefined);

  if (store === null) {
    return <SetupScreen initialDraft={returningDraft} onGameCreated={(game) => setStore(createGameStore(game))} />;
  }

  return (
    <AuctionScreen
      store={store}
      onEditSetup={(game) => {
        setReturningDraft(draftFromGame(game));
        setStore(null);
      }}
    />
  );
}
