// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { CLIENT_EVENTS } from "@protocol";
import { createMemoryTokenStore, type TokenStore } from "@/lib/session/tokenStore";
import { FakeTransport, ok, rejected } from "@/test/fakeTransport";
import { IDS, ROOM_ID, T0, TOKEN, enteredData, gameSnapshot, lobbySnapshot, resumedData } from "@/test/roomFixtures";
import { RoomClient } from "./roomClient";

let transport: FakeTransport;
let tokens: TokenStore;
let clock: number;
let client: RoomClient;

beforeEach(() => {
  transport = new FakeTransport();
  tokens = createMemoryTokenStore();
  clock = T0;
  client = new RoomClient({ transport, tokens, now: () => clock, clockPingIntervalMs: 0 });
});

/** Answers create/join/resume like the server would for the given participant. */
function serve(participantId: string, snapshot = lobbySnapshot()) {
  transport.handler = (event, payload) => {
    if (event === "room:create" || event === "room:join") return ok(payload, enteredData(snapshot, participantId));
    if (event === "room:resume") return ok(payload, resumedData(snapshot, participantId));
    return ok(payload, { version: snapshot.version + 1 });
  };
}

async function joined(participantId: string = IDS.viraj, snapshot = lobbySnapshot()) {
  serve(participantId, snapshot);
  client.connect();
  const result = await client.joinRoom({ roomId: ROOM_ID, name: "Viraj" });
  expect(result.ok).toBe(true);
}

describe("connection state", () => {
  it("mirrors the transport's status", () => {
    expect(client.getState().connection).toBe("DISCONNECTED");
    client.connect();
    expect(client.getState().connection).toBe("CONNECTED");
    for (const status of ["RECONNECTING", "ERROR", "CONNECTING", "DISCONNECTED"] as const) {
      transport.setStatus(status);
      expect(client.getState().connection).toBe(status);
    }
  });

  it("measures the server clock whenever it connects", () => {
    client.connect();
    expect(transport.pings).toEqual([{ requestId: expect.any(String), clientSentAt: T0 }]);
    clock = T0 + 100;
    transport.pushPong({ requestId: "x", clientSentAt: T0, serverNow: T0 + 5_050 });
    expect(client.clock.offset).toBe(5_000);
    expect(client.serverNow()).toBe(T0 + 5_100);
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsubscribe = client.subscribe(() => {
      calls += 1;
    });
    client.connect();
    unsubscribe();
    transport.setStatus("RECONNECTING");
    expect(calls).toBe(1);
  });
});

describe("create, join and the session token", () => {
  it("creates a room with only the allowed fields and stores the token under the room's key", async () => {
    serve(IDS.host);
    client.connect();
    const result = await client.createRoom({ name: "Yash", playing: false });

    expect(result).toEqual({ ok: true, data: { roomId: ROOM_ID } });
    expect(transport.lastSent("room:create")?.payload).toEqual({ requestId: expect.stringMatching(/^[A-Za-z0-9_-]+$/), name: "Yash", playing: false });
    expect(tokens.get(ROOM_ID)).toBe(TOKEN);
    const state = client.getState();
    expect(state).toMatchObject({ roomId: ROOM_ID, session: { participantId: IDS.host, isHost: true } });
    expect(state.snapshot?.version).toBe(1);
  });

  it("joins with just the room id and name, and keeps the token out of state", async () => {
    await joined();
    expect(transport.lastSent("room:join")?.payload).toEqual({ requestId: expect.any(String), roomId: ROOM_ID, name: "Viraj" });
    expect(tokens.get(ROOM_ID)).toBe(TOKEN);
    expect(JSON.stringify(client.getState())).not.toContain(TOKEN);
    expect(client.getState().session).toMatchObject({ participantId: IDS.viraj, role: "MANAGER" });
  });

  it("returns server errors unchanged and stores nothing", async () => {
    transport.handler = (_event, payload) => rejected(payload, "ROOM_FULL", "This room already has 12 managers.");
    client.connect();
    const result = await client.joinRoom({ roomId: ROOM_ID, name: "Late" });
    expect(result).toEqual({ ok: false, error: { code: "ROOM_FULL", message: "This room already has 12 managers." } });
    expect(tokens.get(ROOM_ID)).toBeNull();
    expect(client.getState().roomId).toBeNull();
  });
});

describe("resume", () => {
  it("resumes with the stored token when a room page opens", async () => {
    tokens.set(ROOM_ID, TOKEN);
    serve(IDS.viraj);
    client.connect();
    const result = await client.enterRoom(ROOM_ID);
    expect(result.ok).toBe(true);
    expect(transport.eventsSent()).toEqual(["room:resume"]);
    expect(transport.lastSent("room:resume")?.payload).toEqual({ requestId: expect.any(String), roomId: ROOM_ID, token: TOKEN });
    expect(client.getState().session?.participantId).toBe(IDS.viraj);
  });

  it("asks for a join (sends nothing) when there's no saved session", async () => {
    client.connect();
    const result = await client.enterRoom(ROOM_ID);
    expect(!result.ok && result.error.code).toBe("NO_SESSION");
    expect(transport.sent).toEqual([]);
  });

  it("clears a dead token and explains why", async () => {
    tokens.set(ROOM_ID, TOKEN);
    transport.handler = (_event, payload) => rejected(payload, "SESSION_INVALID", "That session isn't valid for this room.");
    client.connect();
    const result = await client.enterRoom(ROOM_ID);
    expect(!result.ok && result.error.code).toBe("SESSION_INVALID");
    expect(tokens.get(ROOM_ID)).toBeNull();
    expect(client.getState()).toMatchObject({ roomId: null, notice: { kind: "SESSION_EXPIRED" } });
  });

  it("keeps the token when the failure is only temporary", async () => {
    tokens.set(ROOM_ID, TOKEN);
    transport.handler = (_event, payload) => rejected(payload, "TIMEOUT", "The server didn't respond.");
    client.connect();
    await client.enterRoom(ROOM_ID);
    expect(tokens.get(ROOM_ID)).toBe(TOKEN);
  });

  it("rejects malformed room ids without contacting the server", async () => {
    const result = await client.enterRoom("../admin");
    expect(!result.ok && result.error.code).toBe("ROOM_NOT_FOUND");
    expect(transport.sent).toEqual([]);
  });
});

describe("reconnect", () => {
  it("re-attaches with room:resume (never room:join) and restores the room", async () => {
    await joined();
    const before = client.getState().snapshot;
    transport.setStatus("RECONNECTING");
    expect(client.getState().connection).toBe("RECONNECTING");
    expect(client.getState().snapshot).toBe(before); // still shown while offline

    const restored = lobbySnapshot({ version: 7 });
    serve(IDS.viraj, restored);
    transport.setStatus("CONNECTED");
    await Promise.resolve();
    await Promise.resolve();

    expect(transport.eventsSent()).toEqual(["room:join", "room:resume"]);
    expect(transport.lastSent("room:resume")?.payload).toMatchObject({ roomId: ROOM_ID, token: TOKEN });
    const state = client.getState();
    expect(state).toMatchObject({ connection: "CONNECTED", resuming: false, session: { participantId: IDS.viraj } });
    expect(state.snapshot?.version).toBe(7);
    expect(state.snapshot?.participants).toHaveLength(3); // no duplicate participant
  });

  it("drops back to the join screen if the room vanished while offline", async () => {
    await joined();
    transport.handler = (_event, payload) => rejected(payload, "ROOM_NOT_FOUND", "That room doesn't exist or has closed.");
    transport.setStatus("RECONNECTING");
    transport.setStatus("CONNECTED");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getState()).toMatchObject({ roomId: null, resuming: false, notice: { kind: "SESSION_EXPIRED" } });
    expect(tokens.get(ROOM_ID)).toBeNull();
  });
});

describe("snapshots and sessions", () => {
  it("replaces state with each newer snapshot and ignores stale or foreign ones", async () => {
    await joined();
    const newer = lobbySnapshot({ version: 5, ready: false });
    transport.pushSnapshot(newer);
    expect(client.getState().snapshot).toBe(newer);

    transport.pushSnapshot(lobbySnapshot({ version: 4 }));
    expect(client.getState().snapshot).toBe(newer);

    transport.pushSnapshot({ ...lobbySnapshot({ version: 99 }), roomId: "zzzzzzzzzz" });
    expect(client.getState().snapshot).toBe(newer);

    const game = gameSnapshot({ version: 6 });
    transport.pushSnapshot(game);
    expect(client.getState().snapshot?.status).toBe("IN_GAME");
  });

  it("uses snapshot server time as a clock fallback", async () => {
    await joined();
    clock = T0 + 1_000;
    transport.pushSnapshot(lobbySnapshot({ version: 2, overrides: { serverNow: T0 + 4_000 } }));
    expect(client.clock.offset).toBe(3_000);
  });

  it("keeps the private session separate and updates it from room:session", async () => {
    await joined();
    const game = gameSnapshot();
    transport.pushSnapshot(game);
    transport.pushSession({ session: { roomId: ROOM_ID, participantId: IDS.viraj, role: "MANAGER", isHost: false, playing: true, managerId: "manager-2" } });
    expect(client.getState().session?.managerId).toBe("manager-2");
    expect(client.getState().snapshot).toBe(game);
  });

  it("forgets the room and its token when the server removes us", async () => {
    await joined();
    transport.pushSession({ session: null, reason: "REMOVED" });
    expect(client.getState()).toMatchObject({ roomId: null, snapshot: null, session: null, notice: { kind: "REMOVED" } });
    expect(tokens.get(ROOM_ID)).toBeNull();
    client.dismissNotice();
    expect(client.getState().notice).toBeNull();
  });
});

describe("commands", () => {
  it("sends only intents; identity, budget and bid state never leave the browser", async () => {
    await joined(IDS.viraj, gameSnapshot());
    await client.setReady(true);
    await client.setPlaying(false);
    await client.updateSettings({ startingBudget: 30, auctionTimerMs: 5000 });
    await client.removeParticipant(IDS.vineet);
    await client.startCountdown();
    await client.cancelCountdown();
    await client.bid(6);
    await client.pause();
    await client.resumeAuction();
    await client.endGame();

    const byEvent = Object.fromEntries(transport.sent.slice(1).map((r) => [r.event, Object.keys(r.payload).sort()]));
    expect(byEvent).toEqual({
      "lobby:setReady": ["ready", "requestId"],
      "lobby:setPlaying": ["playing", "requestId"],
      "lobby:updateSettings": ["requestId", "settings"],
      "lobby:remove": ["participantId", "requestId"],
      "lobby:start": ["requestId"],
      "lobby:cancel": ["requestId"],
      "game:bid": ["amount", "requestId"],
      "game:pause": ["requestId"],
      "game:resume": ["requestId"],
      "game:end": ["requestId"],
    });
    expect(transport.lastSent("game:bid")?.payload.amount).toBe(6);
    const requestIds = transport.sent.map((r) => r.payload.requestId);
    expect(new Set(requestIds).size).toBe(requestIds.length);
  });

  it("only ever sends known client events, never server-only actions", async () => {
    tokens.set(ROOM_ID, TOKEN);
    await joined();
    transport.setStatus("RECONNECTING");
    transport.setStatus("CONNECTED");
    await client.bid(1);
    for (const event of transport.eventsSent()) expect(CLIENT_EVENTS).toContain(event);
    expect(transport.eventsSent()).not.toEqual(expect.arrayContaining(["TICK"]));
    expect(transport.eventsSent().some((e) => /tick|elapsed|close/i.test(e))).toBe(false);
  });

  it("returns the server's rejection unchanged, without touching state", async () => {
    await joined(IDS.viraj, gameSnapshot());
    const before = client.getState();
    transport.handler = (_event, payload) => rejected(payload, "BID_REJECTED", "Viraj can bid at most $15 and still fill their squad.");
    const result = await client.bid(99);
    expect(result).toEqual({ ok: false, error: { code: "BID_REJECTED", message: "Viraj can bid at most $15 and still fill their squad." } });
    expect(client.getState()).toBe(before);
  });

  it("refuses commands before joining a room", async () => {
    client.connect();
    const result = await client.bid(3);
    expect(!result.ok && result.error.code).toBe("NOT_IN_ROOM");
    expect(transport.sent).toEqual([]);
  });
});
