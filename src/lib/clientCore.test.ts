// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { SessionSnapshot } from "@protocol";
import { usesManagerView, viewerKind } from "@/state/room/viewer";
import { ClockSync, MAX_CLOCK_SAMPLES } from "./clock/clockSync";
import { createLocalStorageTokenStore, createMemoryTokenStore, tokenKey } from "./session/tokenStore";

describe("ClockSync", () => {
  it("estimates the offset from a ping/pong, correcting for half the round trip", () => {
    const clock = new ClockSync();
    // Client clock is 10s behind the server; the round trip takes 200ms.
    const sample = clock.addPong(1_000, 11_100, 1_200);
    expect(sample).toEqual({ offset: 10_000, rtt: 200 });
    expect(clock.serverNow(5_000)).toBe(15_000);
  });

  it("trusts the fastest recent sample and keeps a bounded history", () => {
    const clock = new ClockSync();
    clock.addPong(0, 5_400, 800); // slow: offset 5000
    clock.addPong(1_000, 6_060, 1_020); // fast: offset 5050
    expect(clock.offset).toBe(5_050);
    for (let i = 0; i < MAX_CLOCK_SAMPLES; i += 1) clock.addPong(10_000 + i, 15_000 + i + 150, 10_300 + i);
    expect(clock.sampleCount).toBe(MAX_CLOCK_SAMPLES);
    expect(clock.offset).toBe(5_000); // the fast sample aged out
  });

  it("uses snapshot server time only until a ping sample exists", () => {
    const clock = new ClockSync();
    expect(clock.offset).toBe(0);
    clock.observeServerTime(20_000, 18_000);
    expect(clock.offset).toBe(2_000);
    clock.addPong(18_000, 21_050, 18_100);
    clock.observeServerTime(99_999, 18_200);
    expect(clock.offset).toBe(3_000);
  });

  it("ignores samples where the local clock jumped backwards", () => {
    const clock = new ClockSync();
    expect(clock.addPong(5_000, 9_000, 4_000)).toBeNull();
    expect(clock.sampleCount).toBe(0);
  });
});

describe("token store", () => {
  afterEach(() => localStorage.clear());

  it("keeps one token per room under a room-scoped key", () => {
    const store = createLocalStorageTokenStore();
    store.set("aaaaaaaaaa", "token-a");
    store.set("bbbbbbbbbb", "token-b");
    expect(tokenKey("aaaaaaaaaa")).toBe("football-auction:session:aaaaaaaaaa");
    expect(localStorage.getItem("football-auction:session:aaaaaaaaaa")).toBe("token-a");
    expect(store.get("bbbbbbbbbb")).toBe("token-b");
    store.clear("aaaaaaaaaa");
    expect(store.get("aaaaaaaaaa")).toBeNull();
    expect(store.get("bbbbbbbbbb")).toBe("token-b");
    // Nothing but tokens is ever written.
    expect(Object.keys(localStorage)).toEqual(["football-auction:session:bbbbbbbbbb"]);
  });

  it("degrades to 'no session' when storage throws", () => {
    const store = createLocalStorageTokenStore();
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(store.get("aaaaaaaaaa")).toBeNull();
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it("has an in-memory variant with the same behaviour", () => {
    const store = createMemoryTokenStore();
    store.set("r", "t");
    expect(store.get("r")).toBe("t");
    store.clear("r");
    expect(store.get("r")).toBeNull();
  });
});

describe("viewer role", () => {
  const session = (overrides: Partial<SessionSnapshot>): SessionSnapshot => ({
    roomId: "r",
    participantId: "p",
    role: "MANAGER",
    isHost: false,
    playing: true,
    managerId: "manager-1",
    ...overrides,
  });

  it("comes only from the server's session snapshot", () => {
    expect(viewerKind(session({ role: "HOST", isHost: true, playing: true }))).toBe("HOST_PLAYING");
    expect(viewerKind(session({ role: "HOST", isHost: true, playing: false, managerId: null }))).toBe("HOST");
    expect(viewerKind(session({}))).toBe("MANAGER");
    expect(viewerKind(session({ role: "SPECTATOR", playing: false, managerId: null }))).toBe("SPECTATOR");
  });

  it("gives the bidding view only to playing viewers with a manager id", () => {
    expect(usesManagerView(session({}))).toBe(true);
    expect(usesManagerView(session({ role: "HOST", isHost: true }))).toBe(true);
    expect(usesManagerView(session({ role: "HOST", isHost: true, playing: false, managerId: null }))).toBe(false);
    expect(usesManagerView(session({ role: "SPECTATOR", playing: false, managerId: null }))).toBe(false);
    expect(usesManagerView(session({ managerId: null }))).toBe(false);
  });
});
