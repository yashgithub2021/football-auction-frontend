import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAYERS_BY_ID } from "@domain/players/players";
import { POSITION_GROUP } from "@domain/players/positions";
import type { Game } from "@domain/types";
import type { PlayerFilter, PublicRoomSnapshot } from "@protocol";
import { createMemoryTokenStore, type TokenStore } from "@/lib/session/tokenStore";
import type { TransportAck } from "@/lib/socket/transport";
import { RoomClient } from "@/state/room/roomClient";
import { RoomClientProvider } from "@/state/room/RoomClientProvider";
import { FakeTransport, ok, rejected } from "@/test/fakeTransport";
import { IDS, ROOM_ID, T0, TOKEN, enteredData, gameSnapshot, resumedData } from "@/test/roomFixtures";
import { RoomScreen } from "./RoomScreen";
import { emptyPoolMessage } from "./PlayerPoolPanel";

let transport: FakeTransport;
let tokens: TokenStore;
let client: RoomClient;

beforeEach(() => {
  transport = new FakeTransport();
  tokens = createMemoryTokenStore();
  client = new RoomClient({ transport, tokens, now: () => T0, clockPingIntervalMs: 0 });
});

afterEach(cleanup);

async function openRoomAs(participantId: string, snapshot: PublicRoomSnapshot, commands?: (event: string, payload: Record<string, unknown>) => TransportAck) {
  tokens.set(ROOM_ID, TOKEN);
  transport.handler = (event, payload) => {
    if (event === "room:resume") return ok(payload, resumedData(snapshot, participantId));
    if (event === "room:join" || event === "room:create") return ok(payload, enteredData(snapshot, participantId));
    return commands?.(event, payload) ?? ok(payload, { version: snapshot.version + 1 });
  };
  const user = userEvent.setup();
  render(
    <RoomClientProvider client={client}>
      <RoomScreen roomId={ROOM_ID} />
    </RoomClientProvider>,
  );
  await waitFor(() => expect(client.getState().session?.participantId).toBe(participantId));
  return user;
}

const pool = () => screen.getByRole("region", { name: "Remaining players" });
/** Position badges of the listed players. */
const listedPositions = () => within(pool()).queryAllByRole("listitem").map((li) => li.querySelector("span")?.textContent ?? "");
const listedNames = () => within(pool()).queryAllByRole("listitem").map((li) => li.querySelectorAll("span")[1]?.textContent ?? "");

function paused(filter: PlayerFilter = "ALL", version = 11): PublicRoomSnapshot {
  return gameSnapshot({ version, paused: true, playerFilter: filter, bids: [{ participantId: IDS.viraj, amount: 2 }] });
}

function requireGame(snapshot: PublicRoomSnapshot): Game {
  if (snapshot.game === null) throw new Error("fixture: no game");
  return snapshot.game;
}

function namesInGroup(game: Game, filter: PlayerFilter): string[] {
  return game.availablePlayerIds
    .map((id) => PLAYERS_BY_ID.get(id))
    .filter((player) => player !== undefined && (filter === "ALL" || POSITION_GROUP[player.primaryPosition] === filter))
    .map((player) => player?.name ?? "");
}

describe("remaining players while paused", () => {
  it("is not shown while the auction is live", async () => {
    await openRoomAs(IDS.host, gameSnapshot());
    expect(screen.queryByRole("region", { name: "Remaining players" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Show players" })).toBeNull();
  });

  it("defaults to All: every remaining player, never the lot on the block", async () => {
    const snapshot = paused();
    await openRoomAs(IDS.host, snapshot);
    const game = requireGame(snapshot);
    const buttons = within(within(pool()).getByRole("group", { name: "Show players" })).getAllByRole("button");
    expect(buttons.map((b) => [b.textContent, b.getAttribute("aria-pressed")])).toEqual([
      ["All", "true"],
      ["GK", "false"],
      ["DEF", "false"],
      ["MID", "false"],
      ["ATT", "false"],
    ]);
    expect(listedNames()).toEqual(namesInGroup(game, "ALL"));
    expect(listedNames()).not.toContain(PLAYERS_BY_ID.get(game.currentAuction?.playerId ?? "")?.name);
    expect(within(pool()).getByText(`${game.availablePlayerIds.length} of ${game.availablePlayerIds.length} shown`)).toBeTruthy();
  });

  it("sends the host's choice to the server and shows it only once the server's snapshot says so", async () => {
    const snapshot = paused();
    const user = await openRoomAs(IDS.host, snapshot);
    await user.click(within(pool()).getByRole("button", { name: "GK" }));
    expect(transport.lastSent("game:setPlayerFilter")?.payload).toEqual({ requestId: expect.any(String), filter: "GK" });
    // No local filtering: still All until the server confirms.
    expect(within(pool()).getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");

    transport.pushSnapshot(paused("GK", 12));
    await waitFor(() => expect(within(pool()).getByRole("button", { name: "GK" }).getAttribute("aria-pressed")).toBe("true"));
    expect(new Set(listedPositions())).toEqual(new Set(["GK"]));
    expect(listedNames()).toEqual(namesInGroup(requireGame(snapshot), "GK"));
  });

  it.each(["GK", "DEF", "MID", "ATT"] as const)("the %s filter lists only remaining %s players", async (filter) => {
    const snapshot = paused(filter);
    await openRoomAs(IDS.viraj, snapshot);
    const positions = listedPositions();
    expect(positions.length).toBeGreaterThan(0);
    for (const position of positions) expect(POSITION_GROUP[position as keyof typeof POSITION_GROUP]).toBe(filter);
    expect(listedNames()).toEqual(namesInGroup(requireGame(snapshot), filter));
  });

  it("shows managers and spectators the host's filter without letting them change it", async () => {
    for (const participantId of [IDS.viraj, IDS.watcher]) {
      const snapshot = gameSnapshot({ paused: true, playerFilter: "DEF", withSpectator: true, bids: [{ participantId: IDS.vineet, amount: 1 }] });
      await openRoomAs(participantId, snapshot);
      expect(within(pool()).queryByRole("group", { name: "Show players" })).toBeNull();
      expect(within(pool()).queryAllByRole("button")).toHaveLength(0);
      expect(within(pool()).getByText("DEF")).toBeTruthy();
      expect(within(pool()).getByText("Chosen by the host")).toBeTruthy();
      expect(listedNames()).toEqual(namesInGroup(requireGame(snapshot), "DEF"));
      cleanup();
      client = new RoomClient({ transport: (transport = new FakeTransport()), tokens: (tokens = createMemoryTokenStore()), now: () => T0, clockPingIntervalMs: 0 });
    }
  });

  it("says so clearly when no remaining player matches", async () => {
    const base = paused("ATT");
    const game = requireGame(base);
    const goalkeepersOnly = game.availablePlayerIds.filter((id) => {
      const player = PLAYERS_BY_ID.get(id);
      return player !== undefined && POSITION_GROUP[player.primaryPosition] === "GK";
    });
    await openRoomAs(IDS.host, { ...base, game: { ...game, availablePlayerIds: goalkeepersOnly } });
    expect(within(pool()).getByText("No remaining ATT players")).toBeTruthy();
    expect(within(pool()).queryAllByRole("listitem")).toHaveLength(0);
    expect(emptyPoolMessage("ALL")).toBe("No remaining players");
  });

  it("shows the server's reason when it refuses a change", async () => {
    const user = await openRoomAs(IDS.host, paused(), (event, payload) =>
      event === "game:setPlayerFilter" ? rejected(payload, "INVALID_STATUS", "Pause the auction to change the player filter.") : ok(payload, {}),
    );
    await user.click(within(pool()).getByRole("button", { name: "MID" }));
    expect((await within(pool()).findByRole("alert")).textContent).toBe("Pause the auction to change the player filter.");
  });

  it("keeps the filter across resume and the next pause, as the server reports it", async () => {
    await openRoomAs(IDS.host, paused("MID"));
    expect(within(pool()).getByRole("button", { name: "MID" }).getAttribute("aria-pressed")).toBe("true");
    transport.pushSnapshot(gameSnapshot({ version: 12, playerFilter: "MID", bids: [{ participantId: IDS.viraj, amount: 2 }] }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Remaining players" })).toBeNull());
    transport.pushSnapshot(paused("MID", 13));
    await waitFor(() => expect(within(pool()).getByRole("button", { name: "MID" }).getAttribute("aria-pressed")).toBe("true"));
  });

  it("does not touch the game it renders", async () => {
    const snapshot = paused("GK");
    const before = structuredClone(snapshot.game);
    await openRoomAs(IDS.host, snapshot);
    expect(snapshot.game).toEqual(before);
    expect(client.getState().snapshot?.game).toEqual(before);
  });
});
