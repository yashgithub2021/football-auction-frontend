// @vitest-environment jsdom
/**
 * Proves the multiplayer path never runs the game engine in the browser:
 * every engine function that changes game state is replaced with a spy that
 * throws, and a full lobby → countdown → auction session is driven through
 * the real components. Display selectors (safe bid, quick-bid options) stay real.
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as engine from "@domain/engine";
import { CLIENT_EVENTS } from "@protocol";
import { createMemoryTokenStore } from "@/lib/session/tokenStore";
import { RoomClient } from "@/state/room/roomClient";
import { RoomClientProvider } from "@/state/room/RoomClientProvider";
import { FakeTransport, ok } from "@/test/fakeTransport";
import { IDS, ROOM_ID, T0, TOKEN, gameSnapshot, lobbySnapshot, resumedData, sessionFor } from "@/test/roomFixtures";
import { RoomScreen } from "./RoomScreen";

const MUTATORS = [
  "applyAction",
  "createGame",
  "startGame",
  "startAuction",
  "placeBid",
  "finalizeAuction",
  "pauseAuction",
  "resumeAuction",
  "advanceGame",
  "tick",
  "completeGame",
  "endGame",
] as const;

vi.mock("@domain/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@domain/engine")>();
  const forbidden = (name: string) =>
    vi.fn(() => {
      throw new Error(`${name} must not run in the browser in multiplayer mode`);
    });
  return {
    ...actual,
    applyAction: forbidden("applyAction"),
    createGame: forbidden("createGame"),
    startGame: forbidden("startGame"),
    startAuction: forbidden("startAuction"),
    placeBid: forbidden("placeBid"),
    finalizeAuction: forbidden("finalizeAuction"),
    pauseAuction: forbidden("pauseAuction"),
    resumeAuction: forbidden("resumeAuction"),
    advanceGame: forbidden("advanceGame"),
    tick: forbidden("tick"),
    completeGame: forbidden("completeGame"),
    endGame: forbidden("endGame"),
  };
});

afterEach(() => cleanup());

describe("multiplayer authority", () => {
  it("drives lobby, countdown and auction purely from server snapshots", async () => {
    const transport = new FakeTransport();
    const tokens = createMemoryTokenStore();
    tokens.set(ROOM_ID, TOKEN);
    let localNow = T0;
    const client = new RoomClient({ transport, tokens, now: () => localNow, clockPingIntervalMs: 0 });
    transport.handler = (event, payload) =>
      event === "room:resume" ? ok(payload, resumedData(lobbySnapshot({ ready: false }), IDS.host)) : ok(payload, { version: 2 });

    const user = userEvent.setup();
    render(
      <RoomClientProvider client={client}>
        <RoomScreen roomId={ROOM_ID} />
      </RoomClientProvider>,
    );

    // Lobby → host starts.
    await user.click(await screen.findByRole("button", { name: "Start auction" }));
    transport.pushSnapshot(lobbySnapshot({ version: 3, overrides: { status: "COUNTDOWN", countdown: { startedAt: T0, goAt: T0 + 3000, endsAt: T0 + 3600 } } }));
    expect(await screen.findByRole("status", { name: /Starting/ })).toBeTruthy();

    // The countdown ends on the client's clock, but nothing happens until the server says so.
    localNow = T0 + 10_000;
    await waitFor(() => expect(screen.getByRole("status", { name: /Starting/ }).textContent).toBe("GO"));
    expect(screen.queryByRole("article")).toBeNull();

    // Then the client bids and pauses, and the timer runs out on the local clock.
    // Server starts the game and tells this connection its manager id.
    const live = gameSnapshot({ version: 4, now: T0 + 3600 });
    transport.pushSnapshot(live);
    transport.pushSession({ session: sessionFor(live, IDS.host) });
    const dock = await screen.findByRole("region", { name: "Your bid controls" });
    localNow = T0 + 3600;
    await user.click(within(dock).getByRole("button", { name: "Open bidding at $1" }));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    localNow = T0 + 60_000; // long past endsAt: the client must not close the lot itself
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(within(screen.getByRole("region", { name: "Bidding" })).getByText("No bids")).toBeTruthy();

    for (const name of MUTATORS) {
      expect(vi.mocked(engine[name]), name).not.toHaveBeenCalled();
    }
    const sent = transport.eventsSent();
    expect(sent).toEqual(["room:resume", "lobby:start", "game:bid", "game:pause"]);
    for (const event of sent) expect(CLIENT_EVENTS).toContain(event);
  });
});
