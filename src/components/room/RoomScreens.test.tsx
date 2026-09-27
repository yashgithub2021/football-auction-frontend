// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicRoomSnapshot } from "@protocol";
import { createMemoryTokenStore, type TokenStore } from "@/lib/session/tokenStore";
import { RoomClient } from "@/state/room/roomClient";
import { RoomClientProvider } from "@/state/room/RoomClientProvider";
import { FakeTransport, deferred, ok, rejected } from "@/test/fakeTransport";
import { IDS, ROOM_ID, T0, TOKEN, enteredData, gameSnapshot, lobbySnapshot, resumedData, sessionFor } from "@/test/roomFixtures";
import type { TransportAck } from "@/lib/socket/transport";
import { HomeScreen, parseInvite } from "./HomeScreen";
import { RoomScreen } from "./RoomScreen";

let transport: FakeTransport;
let tokens: TokenStore;
let localNow: number;
let client: RoomClient;

beforeEach(() => {
  transport = new FakeTransport();
  tokens = createMemoryTokenStore();
  localNow = T0;
  client = new RoomClient({ transport, tokens, now: () => localNow, clockPingIntervalMs: 0 });
});

afterEach(() => {
  cleanup();
});

function renderWithClient(ui: ReactNode) {
  const user = userEvent.setup();
  render(<RoomClientProvider client={client}>{ui}</RoomClientProvider>);
  return user;
}

/** Plays the server for resume/commands, answering from the given snapshot for one participant. */
function serveAs(participantId: string, snapshot: PublicRoomSnapshot, commands?: (event: string, payload: Record<string, unknown>) => TransportAck | Promise<TransportAck>) {
  tokens.set(ROOM_ID, TOKEN);
  transport.handler = (event, payload) => {
    if (event === "room:resume") return ok(payload, resumedData(snapshot, participantId));
    if (event === "room:join" || event === "room:create") return ok(payload, enteredData(snapshot, participantId));
    return commands?.(event, payload) ?? ok(payload, { version: snapshot.version + 1 });
  };
}

async function openRoomAs(participantId: string, snapshot: PublicRoomSnapshot, commands?: Parameters<typeof serveAs>[2]) {
  serveAs(participantId, snapshot, commands);
  const user = renderWithClient(<RoomScreen roomId={ROOM_ID} />);
  await waitFor(() => expect(client.getState().session?.participantId).toBe(participantId));
  return user;
}

describe("home screen", () => {
  it("creates a room with the name and playing choice, then opens it", async () => {
    transport.handler = (_event, payload) => ok(payload, enteredData(lobbySnapshot(), IDS.host));
    const onEntered = vi.fn();
    const user = renderWithClient(<HomeScreen onEntered={onEntered} />);

    const host = screen.getByRole("region", { name: "Host a room" });
    await user.type(within(host).getByLabelText("Your name"), "Yash");
    await user.click(within(host).getByLabelText("I'm playing too"));
    await user.click(within(host).getByRole("button", { name: "Create room" }));

    await waitFor(() => expect(onEntered).toHaveBeenCalledWith(ROOM_ID));
    expect(transport.lastSent("room:create")?.payload).toMatchObject({ name: "Yash", playing: false });
    expect(tokens.get(ROOM_ID)).toBe(TOKEN);
  });

  it("joins from a pasted invite link, and rejects input without a room code", async () => {
    transport.handler = (_event, payload) => ok(payload, enteredData(lobbySnapshot(), IDS.viraj));
    const onEntered = vi.fn();
    const user = renderWithClient(<HomeScreen onEntered={onEntered} />);
    const join = screen.getByRole("region", { name: "Join a room" });

    await user.type(within(join).getByLabelText("Your name"), "Viraj");
    await user.type(within(join).getByLabelText("Room code or invite link"), "not a room");
    await user.click(within(join).getByRole("button", { name: "Join room" }));
    expect(within(join).getByRole("alert").textContent).toMatch(/room code/);
    expect(transport.sent).toEqual([]);

    await user.clear(within(join).getByLabelText("Room code or invite link"));
    await user.type(within(join).getByLabelText("Room code or invite link"), `https://auction.example/room/${ROOM_ID}?ref=chat`);
    await user.click(within(join).getByRole("button", { name: "Join room" }));
    await waitFor(() => expect(onEntered).toHaveBeenCalledWith(ROOM_ID));
    expect(transport.lastSent("room:join")?.payload).toMatchObject({ roomId: ROOM_ID, name: "Viraj" });
  });

  it("shows the server's error when joining fails", async () => {
    transport.handler = (_event, payload) => rejected(payload, "ROOM_LOCKED", "The game is about to start. You can join if the host cancels the countdown.");
    const user = renderWithClient(<HomeScreen onEntered={() => undefined} />);
    const join = screen.getByRole("region", { name: "Join a room" });
    await user.type(within(join).getByLabelText("Your name"), "Late");
    await user.type(within(join).getByLabelText("Room code or invite link"), ROOM_ID);
    await user.click(within(join).getByRole("button", { name: "Join room" }));
    expect((await within(join).findByRole("alert")).textContent).toMatch(/about to start/);
  });

  it("parses room codes out of links", () => {
    expect(parseInvite(ROOM_ID)).toBe(ROOM_ID);
    expect(parseInvite(`  http://localhost:3000/room/${ROOM_ID}/  `)).toBe(ROOM_ID);
    expect(parseInvite("https://example.com/room/NOPE")).toBeNull();
  });
});

describe("room page entry", () => {
  it("offers the join form when there's no saved session, then shows the lobby", async () => {
    transport.handler = (_event, payload) => ok(payload, enteredData(lobbySnapshot(), IDS.viraj));
    const user = renderWithClient(<RoomScreen roomId={ROOM_ID} />);
    const form = await screen.findByRole("region", { name: `Join room ${ROOM_ID}` });
    expect(transport.sent).toEqual([]);

    await user.type(within(form).getByLabelText("Your name"), "Viraj");
    await user.click(within(form).getByRole("button", { name: "Join" }));
    expect(await screen.findByRole("region", { name: /In the room/ })).toBeTruthy();
    expect(transport.eventsSent()).toEqual(["room:join"]);
  });

  it("resumes a saved session straight into the room", async () => {
    await openRoomAs(IDS.viraj, lobbySnapshot());
    expect(transport.eventsSent()).toEqual(["room:resume"]);
    expect(await screen.findByRole("region", { name: /In the room/ })).toBeTruthy();
    expect(screen.queryByRole("region", { name: /Join room/ })).toBeNull();
  });

  it("clears an invalid session and lets the user join again", async () => {
    tokens.set(ROOM_ID, TOKEN);
    transport.handler = (_event, payload) => rejected(payload, "SESSION_INVALID", "That session isn't valid for this room.");
    renderWithClient(<RoomScreen roomId={ROOM_ID} />);
    expect(await screen.findByRole("region", { name: `Join room ${ROOM_ID}` })).toBeTruthy();
    expect(screen.getByText(/Your session for this room has ended/)).toBeTruthy();
    expect(tokens.get(ROOM_ID)).toBeNull();
  });

  it("treats a temporary failure as temporary: no join form, retry when the connection returns", async () => {
    tokens.set(ROOM_ID, TOKEN);
    let attempts = 0;
    transport.handler = (event, payload) => {
      if (event !== "room:resume") return ok(payload, {});
      attempts += 1;
      return attempts === 1 ? rejected(payload, "TIMEOUT", "The server didn't respond.") : ok(payload, resumedData(lobbySnapshot(), IDS.viraj));
    };
    renderWithClient(<RoomScreen roomId={ROOM_ID} />);
    expect(await screen.findByText(/Can't reach the room yet/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: /Join room/ })).toBeNull();
    expect(tokens.get(ROOM_ID)).toBe(TOKEN);

    act(() => transport.setStatus("RECONNECTING"));
    act(() => transport.setStatus("CONNECTED"));
    await waitFor(() => expect(transport.eventsSent().filter((e) => e === "room:resume")).toHaveLength(2));
    expect(await screen.findByRole("region", { name: /In the room/ })).toBeTruthy();
    expect(transport.eventsSent()).not.toContain("room:join");
  });

  it("rejects malformed room links without contacting the server", async () => {
    renderWithClient(<RoomScreen roomId="NOT-A-ROOM" />);
    expect(screen.getByText(/invite link isn't valid/)).toBeTruthy();
    expect(transport.sent).toEqual([]);
  });

  it("shows connection trouble and never renders the token", async () => {
    await openRoomAs(IDS.viraj, lobbySnapshot());
    transport.setStatus("RECONNECTING");
    expect(await screen.findByText("Connection lost. Reconnecting…")).toBeTruthy();
    expect(screen.getByTestId("connection-indicator").textContent).toBe("Reconnecting");
    // Lobby actions are unavailable while offline.
    expect(screen.getByRole("button", { name: /^I'm (not )?ready$/ }).getAttribute("aria-disabled")).toBe("true");
    expect(document.body.innerHTML).not.toContain(TOKEN);

    transport.setStatus("CONNECTED");
    await waitFor(() => expect(screen.getByTestId("connection-indicator").textContent).toBe("Live"));
    expect(screen.queryByText("Connection lost. Reconnecting…")).toBeNull();
  });
});

describe("lobby", () => {
  it("lets a manager toggle ready, reflecting the server's answer", async () => {
    const user = await openRoomAs(IDS.viraj, lobbySnapshot({ ready: false }));
    await user.click(await screen.findByRole("button", { name: "I'm ready" }));
    expect(transport.lastSent("lobby:setReady")?.payload).toMatchObject({ ready: true });

    transport.pushSnapshot(lobbySnapshot({ version: 2, ready: true }));
    expect(await screen.findByRole("button", { name: "I'm not ready" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start auction" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save settings" })).toBeNull();
  });

  it("gives the host settings, playing status, removal and start, all sent as intents", async () => {
    const user = await openRoomAs(IDS.host, lobbySnapshot({ ready: false }), (event, payload) =>
      event === "lobby:start"
        ? rejected(payload, "START_BLOCKED", "Waiting for Viraj, Vineet to be ready.")
        : event === "lobby:updateSettings"
          ? rejected(payload, "INVALID_SETTINGS", "Starting budget must be at least $6 (6 players × $1).")
          : ok(payload, { version: 2 }),
    );

    // Start blockers come from the snapshot; the button still asks the server, which explains.
    const blockers = await screen.findByRole("list", { name: "Why you can't start yet" });
    expect(within(blockers).getByText(/Waiting for Viraj, Vineet/)).toBeTruthy();
    const start = screen.getByRole("button", { name: "Start auction" });
    expect(start.getAttribute("aria-disabled")).toBe("true");
    await user.click(start);
    expect(transport.lastSent("lobby:start")).toBeDefined();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Waiting for Viraj/);

    await user.click(screen.getByRole("button", { name: "Remove Vineet" }));
    expect(transport.lastSent("lobby:remove")?.payload).toMatchObject({ participantId: IDS.vineet });

    await user.click(screen.getByLabelText("I'm playing too"));
    expect(transport.lastSent("lobby:setPlaying")?.payload).toMatchObject({ playing: false });

    const budget = screen.getByLabelText("Starting budget");
    await user.clear(budget);
    await user.type(budget, "3");
    const timer = screen.getByLabelText("Auction timer");
    await user.clear(timer);
    await user.type(timer, "5");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(transport.lastSent("lobby:updateSettings")?.payload.settings).toEqual({
      startingBudget: 3,
      teamSize: 6,
      minimumBid: 1,
      bidIncrement: 1,
      auctionTimerMs: 5000,
    });
    expect(await screen.findByText(/at least \$6/)).toBeTruthy();
  });

  it("shows presence from the snapshot", async () => {
    const snapshot = lobbySnapshot();
    const offline = { ...snapshot, participants: snapshot.participants.map((p) => (p.name === "Vineet" ? { ...p, connected: false } : p)) };
    await openRoomAs(IDS.viraj, offline);
    const vineet = await screen.findByRole("listitem", { name: "Vineet" });
    expect(within(vineet).getByLabelText("offline")).toBeTruthy();
    expect(within(screen.getByRole("listitem", { name: "Viraj" })).getByLabelText("online")).toBeTruthy();
  });
});

describe("countdown", () => {
  it("renders 3, 2, 1, GO from server timestamps and the estimated server clock", async () => {
    const counting = lobbySnapshot({
      version: 3,
      overrides: { status: "COUNTDOWN", countdown: { startedAt: T0, goAt: T0 + 3000, endsAt: T0 + 3600 } },
    });
    // This device's clock is 10s behind the server.
    localNow = T0 - 10_000;
    const user = await openRoomAs(IDS.host, counting);
    transport.pushPong({ requestId: "p", clientSentAt: localNow, serverNow: T0 });

    await waitFor(() => expect(screen.getByRole("status", { name: /Starting/ }).textContent).toBe("3"));
    localNow = T0 - 10_000 + 2_500;
    await waitFor(() => expect(screen.getByRole("status", { name: /Starting/ }).textContent).toBe("1"));
    localNow = T0 - 10_000 + 3_100;
    await waitFor(() => expect(screen.getByRole("status", { name: /Starting/ }).textContent).toBe("GO"));

    // The game starts only when the server says so.
    expect(screen.queryByRole("article")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancel countdown" }));
    expect(transport.lastSent("lobby:cancel")).toBeDefined();
    transport.pushSnapshot(gameSnapshot({ version: 4 }));
    expect(await screen.findByRole("article")).toBeTruthy();
  });
});

describe("auction: manager view", () => {
  it("bids through the server, shows Submitting… until acknowledged, then renders the new snapshot", async () => {
    const ack = deferred<TransportAck>();
    const live = gameSnapshot();
    const user = await openRoomAs(IDS.viraj, live, (event, payload) => (event === "game:bid" ? ack.promise.then(() => ok(payload, { version: 11 })) : ok(payload, {})));

    await waitFor(() => expect(document.querySelector("[data-view=manager]")).toBeTruthy());
    const dock = screen.getByRole("region", { name: "Your bid controls" });
    expect(within(screen.getByRole("region", { name: "Other managers" })).getByRole("listitem", { name: "Yash" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^(Bid|Open bidding)/ }).every((b) => dock.contains(b))).toBe(true);
    expect(within(dock).getByText("$20")).toBeTruthy(); // own budget
    expect(within(screen.getByRole("region", { name: /Your squad/ })).getByText(/No players yet/)).toBeTruthy();

    await user.click(within(dock).getByRole("button", { name: "Open bidding at $2" }));
    expect(transport.lastSent("game:bid")?.payload).toEqual({ requestId: expect.any(String), amount: 2 });
    expect(await within(dock).findByText("Submitting…")).toBeTruthy();
    // A nervous double-tap while waiting sends nothing more.
    await user.click(within(dock).getByRole("button", { name: "Open bidding at $5" }));
    expect(transport.eventsSent().filter((e) => e === "game:bid")).toHaveLength(1);
    // Nothing optimistic: the bid isn't shown until the server's snapshot says so.
    expect(within(screen.getByRole("region", { name: "Bidding" })).getByText("No bids")).toBeTruthy();

    ack.resolve({ ok: true, requestId: "x", data: { version: 11 } });
    transport.pushSnapshot(gameSnapshot({ version: 11, bids: [{ participantId: IDS.viraj, amount: 2 }] }));
    await waitFor(() => expect(within(dock).queryByText("Submitting…")).toBeNull());
    expect(within(screen.getByRole("region", { name: "Bidding" })).getByText("$2")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Bidding" })).getByText(/Viraj \(you\)/)).toBeTruthy();
    expect(within(dock).getByText("You're leading at $2")).toBeTruthy();
  });

  it("marks stale data as offline and locks bidding until the connection is back", async () => {
    const user = await openRoomAs(IDS.viraj, gameSnapshot());
    const dock = await screen.findByRole("region", { name: "Your bid controls" });
    transport.setStatus("RECONNECTING");
    expect(await screen.findByText("Offline · last known state")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toContain("–");
    await user.click(within(dock).getByRole("button", { name: "Open bidding at $1" }));
    expect(transport.eventsSent()).not.toContain("game:bid");
    expect(within(dock).getByText(/Reconnecting/)).toBeTruthy();
  });

  it("shows the server's reason when a bid is rejected", async () => {
    const user = await openRoomAs(IDS.viraj, gameSnapshot(), (event, payload) =>
      event === "game:bid" ? rejected(payload, "BID_REJECTED", "Too late: the timer has already run out.") : ok(payload, {}),
    );
    const dock = await screen.findByRole("region", { name: "Your bid controls" });
    await user.click(within(dock).getByRole("button", { name: "Open bidding at $1" }));
    expect((await within(dock).findByRole("alert")).textContent).toBe("Too late: the timer has already run out.");
    // The rejection changes nothing locally.
    expect(within(screen.getByRole("region", { name: "Bidding" })).getByText("No bids")).toBeTruthy();
  });

  it("shows the reveal from the server's result, never from the local clock running out", async () => {
    await openRoomAs(IDS.viraj, gameSnapshot());
    localNow = T0 + 10_000; // well past endsAt on this device
    await waitFor(() => expect(screen.getByRole("timer").textContent).toContain("0.0"));
    expect(screen.queryByRole("group", { name: /Sold|Unsold/ })).toBeNull();

    const live = gameSnapshot({ version: 11 });
    const game = live.game;
    if (game === null || game.currentAuction === null) throw new Error("fixture");
    transport.pushSnapshot({
      ...live,
      game: {
        ...game,
        status: "PLAYER_SOLD",
        lastResult: { lotNumber: 1, playerId: game.currentAuction.playerId, managerId: null, amount: 0, outcome: "UNSOLD", completedAt: T0 + 3000, bids: [] },
        currentAuction: { ...game.currentAuction, revealEndsAt: T0 + 20_000 },
      },
    });
    expect(await screen.findByRole("group", { name: "Unsold" })).toBeTruthy();
  });

  it("draws the timer from the server's endsAt and the estimated server clock", async () => {
    // The phone's clock is a minute behind the server; the snapshot says bidding ends at T0 + 3000.
    localNow = T0 - 60_000;
    await openRoomAs(IDS.viraj, gameSnapshot());
    transport.pushPong({ requestId: "p", clientSentAt: localNow, serverNow: T0 });
    await waitFor(() => expect(screen.getByRole("timer").textContent).toContain("3.0"));
    localNow += 1_000;
    await waitFor(() => expect(screen.getByRole("timer").textContent).toContain("2.0"));

    // A later snapshot (the timer was reset by someone's bid) corrects the display.
    transport.pushSnapshot(gameSnapshot({ version: 11, bids: [{ participantId: IDS.vineet, amount: 1, at: T0 + 1_000 }] }));
    await waitFor(() => expect(screen.getByRole("timer").textContent).toContain("3.0"));
  });

  it("gives a playing host both their bid controls and the host controls", async () => {
    const user = await openRoomAs(IDS.host, gameSnapshot());
    expect(document.querySelector("[data-view=manager]")).toBeTruthy();
    const dock = await screen.findByRole("region", { name: "Your bid controls" });
    expect(within(dock).getAllByRole("button").length).toBeGreaterThan(0);
    // Host controls live in their own panel, apart from the bid buttons.
    const hostPanel = screen.getByRole("region", { name: "Host controls" });
    expect(within(hostPanel).queryAllByRole("button", { name: /^(Bid|Open bidding)/ })).toHaveLength(0);
    expect(dock.contains(within(hostPanel).getByRole("button", { name: "Pause" }))).toBe(false);
    await user.click(within(hostPanel).getByRole("button", { name: "Pause" }));
    expect(transport.lastSent("game:pause")).toBeDefined();
  });

  it("gives a plain manager no host controls at all", async () => {
    await openRoomAs(IDS.viraj, gameSnapshot());
    await screen.findByRole("region", { name: "Your bid controls" });
    expect(screen.queryByRole("region", { name: "Host controls" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Pause|End game/ })).toBeNull();
  });
});

describe("auction: board view", () => {
  it("shows every manager without bid buttons for a non-playing host, with pause/resume/end", async () => {
    const live = gameSnapshot({ hostPlaying: false });
    const user = await openRoomAs(IDS.host, live);
    expect(document.querySelector("[data-view=board]")).toBeTruthy();
    for (const name of ["Viraj", "Vineet"]) {
      expect(within(screen.getByRole("region", { name })).queryAllByRole("button")).toHaveLength(0);
    }

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(transport.lastSent("game:pause")).toBeDefined();
    const paused = { ...live, version: 11, game: live.game === null ? null : { ...live.game, status: "PAUSED" as const, currentAuction: live.game.currentAuction === null ? null : { ...live.game.currentAuction, pausedRemainingMs: 2000 } } };
    transport.pushSnapshot(paused);
    await user.click(await screen.findByRole("button", { name: "Resume" }));
    expect(transport.lastSent("game:resume")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "End game" }));
    expect(transport.lastSent("game:end")).toBeUndefined(); // asks first
    await user.click(screen.getByRole("button", { name: "Confirm end game" }));
    expect(transport.lastSent("game:end")).toBeDefined();
  });

  it("gives spectators the board without host controls", async () => {
    await openRoomAs(IDS.watcher, gameSnapshot({ withSpectator: true }));
    expect(document.querySelector("[data-view=board]")).toBeTruthy();
    expect(screen.getByText(/You're watching/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Your bid controls" })).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^(Bid|Open bidding)|: (bid|open at)/ })).toHaveLength(0);
    expect(sessionFor(gameSnapshot({ withSpectator: true }), IDS.watcher).role).toBe("SPECTATOR");
  });

  it("shows the completion placeholder when the server finishes the game", async () => {
    await openRoomAs(IDS.viraj, gameSnapshot());
    const live = gameSnapshot({ version: 20 });
    transport.pushSnapshot({ ...live, status: "FINISHED", game: live.game === null ? null : { ...live.game, status: "GAME_COMPLETE" } });
    expect(await screen.findByRole("heading", { level: 1, name: "Auction complete" })).toBeTruthy();
  });
});

describe("host controls in the header", () => {
  const headerControls = () => {
    const header = document.querySelector("header");
    if (header === null) throw new Error("no header");
    return within(header).getByRole("region", { name: "Host controls" });
  };

  it("sit right after the Live indicator as icon buttons, for both the playing and the auctioneer host", async () => {
    for (const hostPlaying of [true, false]) {
      await openRoomAs(IDS.host, gameSnapshot({ hostPlaying }));
      const controls = headerControls();
      expect(screen.getByTestId("connection-indicator").nextElementSibling).toBe(controls);
      for (const name of ["Pause", "End game"]) {
        const button = within(controls).getByRole("button", { name });
        expect(button.textContent).toBe(""); // icon only; the name is the aria-label
        expect(button.querySelector("svg")).toBeTruthy();
        expect(button.getAttribute("title")).toBeTruthy();
      }
      // No separate controls panel in the page body any more.
      expect(screen.getAllByRole("region", { name: "Host controls" })).toHaveLength(1);
      expect(screen.queryByRole("heading", { name: "Host controls" })).toBeNull();
      cleanup();
      transport = new FakeTransport();
      tokens = createMemoryTokenStore();
      client = new RoomClient({ transport, tokens, now: () => localNow, clockPingIntervalMs: 0 });
    }
  });

  it("pause sends the intent; a paused game shows the resume icon instead", async () => {
    const user = await openRoomAs(IDS.host, gameSnapshot());
    await user.click(within(headerControls()).getByRole("button", { name: "Pause" }));
    expect(transport.lastSent("game:pause")).toBeDefined();
    transport.pushSnapshot(gameSnapshot({ version: 11, paused: true }));
    const resume = await within(headerControls()).findByRole("button", { name: "Resume" });
    expect(within(headerControls()).queryByRole("button", { name: "Pause" })).toBeNull();
    await user.click(resume);
    expect(transport.lastSent("game:resume")).toBeDefined();
  });

  it("the end icon asks first, then ends the game for everyone", async () => {
    const user = await openRoomAs(IDS.host, gameSnapshot());
    await user.click(within(headerControls()).getByRole("button", { name: "End game" }));
    expect(transport.lastSent("game:end")).toBeUndefined();
    const confirm = within(headerControls()).getByRole("group", { name: "Confirm end game" });
    expect(confirm.textContent).toContain("End for everyone?");
    await user.click(within(confirm).getByRole("button", { name: "Keep playing" }));
    expect(within(headerControls()).queryByRole("group", { name: "Confirm end game" })).toBeNull();
    await user.click(within(headerControls()).getByRole("button", { name: "End game" }));
    await user.click(within(headerControls()).getByRole("button", { name: "Confirm end game" }));
    expect(transport.lastSent("game:end")).toBeDefined();
  });

  it("shows the server's reason when a control is refused", async () => {
    const user = await openRoomAs(IDS.host, gameSnapshot(), (event, payload) =>
      event === "game:pause" ? rejected(payload, "GAME_ACTION_REJECTED", "PAUSE is not allowed while the game is PLAYER_SOLD.") : ok(payload, {}),
    );
    await user.click(within(headerControls()).getByRole("button", { name: "Pause" }));
    expect((await within(headerControls()).findByRole("alert")).textContent).toMatch(/not allowed/);
  });

  it("look unavailable and send nothing while offline", async () => {
    const user = await openRoomAs(IDS.host, gameSnapshot());
    act(() => transport.setStatus("RECONNECTING"));
    const pause = within(headerControls()).getByRole("button", { name: "Pause" });
    const end = within(headerControls()).getByRole("button", { name: "End game" });
    expect(pause.getAttribute("aria-disabled")).toBe("true");
    expect(end.getAttribute("aria-disabled")).toBe("true");
    await user.click(pause);
    await user.click(end);
    expect(transport.eventsSent()).not.toContain("game:pause");
    expect(within(headerControls()).queryByRole("group", { name: "Confirm end game" })).toBeNull();
  });

  it("are never shown to managers or spectators, nor outside the game", async () => {
    await openRoomAs(IDS.viraj, gameSnapshot());
    expect(screen.queryByRole("region", { name: "Host controls" })).toBeNull();
    cleanup();
    transport = new FakeTransport();
    tokens = createMemoryTokenStore();
    client = new RoomClient({ transport, tokens, now: () => localNow, clockPingIntervalMs: 0 });
    await openRoomAs(IDS.host, lobbySnapshot());
    expect(screen.queryByRole("region", { name: "Host controls" })).toBeNull();
  });
});
