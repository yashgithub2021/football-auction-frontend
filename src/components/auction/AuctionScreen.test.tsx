// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVEAL_DURATION_MS } from "@domain/constants";
import {
  applyAction,
  calculateMaximumSafeBid,
  createGame,
  createSeededRandom,
  getOpenSlots,
  getQuickBidOptions,
  validateBid,
} from "@domain/engine";
import { ALL_PLAYER_IDS, getPlayerById } from "@domain/players/players";
import { POSITION_LABEL } from "@domain/players/positions";
import type { Game, GameSettings } from "@domain/types";
import { createGameStore } from "@/state/gameStore";
import { AuctionScreen } from "./AuctionScreen";

const T0 = 1_700_000_000_000;
const SEED = 7;
const YASH = "manager-1";
const VIRAJ = "manager-2";

interface GameOptions {
  names?: readonly string[];
  settings?: Partial<GameSettings>;
  poolSize?: number;
}

function readyGame({ names = ["Yash", "Viraj", "Vineet"], settings, poolSize }: GameOptions = {}): Game {
  const result = createGame({
    id: "auction-test",
    managerNames: names,
    settings,
    playerPoolIds: poolSize === undefined ? undefined : ALL_PLAYER_IDS.slice(0, poolSize),
    now: Date.now(),
  });
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("; "));
  return result.game;
}

/** Renders the screen over a store whose clock is the (fake) system clock. */
function renderAuction(game: Game, { start = true } = {}) {
  const random = createSeededRandom(SEED);
  const store = createGameStore(game, () => ({ now: Date.now(), random }));
  if (start) store.dispatch({ type: "START_GAME" });
  const dispatch = vi.spyOn(store, "dispatch");
  const onEditSetup = vi.fn();
  render(<AuctionScreen store={store} onEditSetup={onEditSetup} clock={() => Date.now()} />);
  return { store, dispatch, onEditSetup };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const panel = (name: string) => screen.getByRole("region", { name });
const bidding = () => screen.getByRole("region", { name: "Bidding" });
const timerText = () => screen.getByRole("timer").textContent ?? "";

/** The value shown next to a stat label inside a manager panel. */
function stat(container: HTMLElement, label: string): string {
  return within(container).getByText(label).nextElementSibling?.textContent ?? "";
}

function currentPlayer(game: Game) {
  const playerId = game.currentAuction?.playerId;
  const player = playerId === undefined ? undefined : getPlayerById(playerId);
  if (player === undefined) throw new Error("no player on the block");
  return player;
}

beforeEach(() => {
  // The screen refreshes with setInterval. setTimeout stays real because
  // Testing Library's async wrapper (used by user-event) waits on it.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(T0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AuctionScreen", () => {
  it("starts from READY through START_GAME and renders the drawn player", () => {
    const { store, dispatch } = renderAuction(readyGame(), { start: false });
    expect(screen.getByRole("heading", { level: 1, name: "Ready for kick-off" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start auction" }));

    expect(dispatch).toHaveBeenCalledWith({ type: "START_GAME" });
    const game = store.getSnapshot();
    expect(game.status).toBe("AUCTION_ACTIVE");
    const player = currentPlayer(game);
    const card = screen.getByRole("article", { name: player.name });
    expect(within(card).getByText(player.nationality)).toBeTruthy();
    expect(within(card).getByText(POSITION_LABEL[player.primaryPosition])).toBeTruthy();
    expect(within(card).getByText("Lot 1")).toBeTruthy();
    expect(within(bidding()).getByText("No bids")).toBeTruthy();
    expect(timerText()).toContain("3.0");
  });

  it("renders every manager with budget, squad, open slots and max bid taken from the domain", () => {
    // Build a mid-game state purely with domain actions: Yash buys lot 1 for $5.
    const random = createSeededRandom(SEED);
    let game = applyAction(readyGame(), { type: "START_GAME" }, { now: T0, random }).game;
    const firstPlayer = currentPlayer(game);
    game = applyAction(game, { type: "PLACE_BID", managerId: YASH, amount: 5 }, { now: T0, random }).game;
    const endsAt = game.currentAuction?.endsAt ?? 0;
    game = applyAction(game, { type: "TICK" }, { now: endsAt + REVEAL_DURATION_MS, random }).game;
    expect(game.status).toBe("AUCTION_ACTIVE");
    vi.setSystemTime(endsAt + REVEAL_DURATION_MS);

    const { store } = renderAuction(game, { start: false });
    const snapshot = store.getSnapshot();

    expect(snapshot.managers).toHaveLength(3);
    for (const manager of snapshot.managers) {
      const region = panel(manager.name);
      expect(stat(region, "Budget")).toBe(`$${manager.budgetRemaining}`);
      expect(stat(region, "Squad")).toBe(`${manager.playerIds.length}/${snapshot.settings.teamSize}`);
      expect(stat(region, "Open slots")).toBe(String(getOpenSlots(manager, snapshot.settings)));
      expect(stat(region, "Max bid")).toBe(`$${calculateMaximumSafeBid(manager, snapshot.settings)}`);
    }
    expect(stat(panel("Yash"), "Budget")).toBe("$15");
    expect(within(panel("Yash")).getByText(firstPlayer.name)).toBeTruthy();
  });

  it("dispatches PLACE_BID for a valid bid and renders the resulting domain state", () => {
    const { store, dispatch } = renderAuction(readyGame());

    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $2" }));

    expect(dispatch).toHaveBeenCalledWith({ type: "PLACE_BID", managerId: YASH, amount: 2 });
    const auction = store.getSnapshot().currentAuction;
    expect(auction).toMatchObject({ currentBid: 2, highestBidderId: YASH, endsAt: T0 + 3000 });
    expect(within(bidding()).getByText("$2")).toBeTruthy();
    expect(within(bidding()).getByText("Yash")).toBeTruthy();
    expect(within(panel("Yash")).getByText("Leading")).toBeTruthy();
    expect(within(panel("Viraj")).getByRole("button", { name: "Viraj: bid $3 (+$1)" }).getAttribute("aria-disabled")).toBe("false");
    // Budgets move only when the lot closes.
    expect(stat(panel("Yash"), "Budget")).toBe("$20");
  });

  it("supports keyboard bidding with Enter and Space", async () => {
    const user = userEvent.setup();
    const { store } = renderAuction(readyGame());

    const open = within(panel("Viraj")).getByRole("button", { name: "Viraj: open at $1" });
    open.focus();
    await user.keyboard("{Enter}");
    expect(store.getSnapshot().currentAuction?.highestBidderId).toBe(VIRAJ);
    // aria-disabled (not disabled) keeps focus on the pressed button.
    expect(document.activeElement).toBe(open);

    within(panel("Yash")).getByRole("button", { name: "Yash: bid $2 (+$1)" }).focus();
    await user.keyboard(" ");
    expect(store.getSnapshot().currentAuction).toMatchObject({ highestBidderId: YASH, currentBid: 2 });
  });

  it("does not let the leader bid again and leaves the game untouched", () => {
    const { store } = renderAuction(readyGame());
    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $2" }));
    const before = store.getSnapshot();

    const yashButtons = within(panel("Yash")).getAllByRole("button");
    expect(yashButtons.every((button) => button.getAttribute("aria-disabled") === "true")).toBe(true);

    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: bid $3 (+$1)" }));

    expect(store.getSnapshot()).toBe(before);
    const expected = validateBid(before, YASH, 3, Date.now());
    expect(expected.ok).toBe(false);
    expect(within(panel("Yash")).getByRole("alert").textContent).toBe(expected.ok ? "" : expected.message);
  });

  it("rejects a bid that arrives after expiry without mutating the game", () => {
    const { store } = renderAuction(readyGame());
    const before = store.getSnapshot();
    const endsAt = before.currentAuction?.endsAt ?? 0;

    // The clock passes endsAt before the next refresh, so the button still looks live.
    vi.setSystemTime(endsAt);
    fireEvent.click(within(panel("Viraj")).getByRole("button", { name: "Viraj: open at $1" }));

    expect(store.getSnapshot()).toBe(before);
    const expected = validateBid(before, VIRAJ, 1, endsAt);
    expect(expected).toMatchObject({ ok: false, reason: "AUCTION_EXPIRED" });
    expect(within(panel("Viraj")).getByRole("alert").textContent).toBe(expected.ok ? "" : expected.message);
  });

  it("counts down from endsAt, dispatches TICK at expiry and shows the sold reveal", () => {
    const { store, dispatch } = renderAuction(readyGame());
    const firstLot = currentPlayer(store.getSnapshot());
    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $2" }));

    advance(1000);
    expect(timerText()).toContain("2.0");
    expect(store.getSnapshot().status).toBe("AUCTION_ACTIVE");

    advance(2000);
    expect(dispatch).toHaveBeenCalledWith({ type: "TICK" });
    const sold = store.getSnapshot();
    expect(sold.status).toBe("PLAYER_SOLD");
    expect(sold.lastResult).toMatchObject({ managerId: YASH, amount: 2, outcome: "SOLD" });

    const reveal = screen.getByRole("group", { name: "Sold" });
    expect(within(reveal).getByText("Yash")).toBeTruthy();
    expect(within(reveal).getByText("$2")).toBeTruthy();
    expect(within(bidding()).getByText("Final bid")).toBeTruthy();
    expect(stat(panel("Yash"), "Budget")).toBe("$18");
    expect(within(panel("Yash")).getByText(firstLot.name)).toBeTruthy();

    advance(REVEAL_DURATION_MS);
    const next = store.getSnapshot();
    expect(next.status).toBe("AUCTION_ACTIVE");
    expect(screen.queryByRole("group", { name: "Sold" })).toBeNull();
    expect(screen.getByRole("article", { name: currentPlayer(next).name })).toBeTruthy();
    expect(screen.getByText("Lot 2")).toBeTruthy();
  });

  it("shows an unsold lot when nobody bids", () => {
    const { store } = renderAuction(readyGame());
    advance(3000);
    expect(store.getSnapshot().lastResult?.outcome).toBe("UNSOLD");
    const reveal = screen.getByRole("group", { name: "Unsold" });
    expect(within(reveal).getByText(/No bids/)).toBeTruthy();
  });

  it("pauses and resumes through the domain and reflects its state", () => {
    const { store, dispatch } = renderAuction(readyGame());
    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $1" }));
    advance(1000);

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "PAUSE" });
    const paused = store.getSnapshot();
    expect(paused.status).toBe("PAUSED");
    expect(paused.currentAuction?.pausedRemainingMs).toBe(2000);
    expect(screen.getByText(/Bidding is frozen with 2.0s left/)).toBeTruthy();
    expect(timerText()).toContain("2.0");
    const vineetButtons = within(panel("Vineet")).getAllByRole("button");
    expect(vineetButtons.every((button) => button.getAttribute("aria-disabled") === "true")).toBe(true);

    advance(60_000);
    expect(store.getSnapshot()).toBe(paused);
    expect(timerText()).toContain("2.0");

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "RESUME" });
    expect(store.getSnapshot().status).toBe("AUCTION_ACTIVE");
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.queryByText(/Bidding is frozen/)).toBeNull();

    advance(2000);
    expect(store.getSnapshot().lastResult).toMatchObject({ managerId: YASH, amount: 1, outcome: "SOLD" });
  });

  it("explains, via the domain, why pause is unavailable during the reveal", () => {
    const { store } = renderAuction(readyGame());
    advance(3000);
    const revealing = store.getSnapshot();
    expect(revealing.status).toBe("PLAYER_SOLD");

    const pause = screen.getByRole("button", { name: "Pause" });
    expect(pause.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(pause);
    expect(store.getSnapshot()).toBe(revealing);
    expect(screen.getByRole("alert").textContent).toMatch(/only pause while a player is up for auction/);
  });

  it("renders the domain's last-manager auto-award, then the completion placeholder", () => {
    const { store } = renderAuction(readyGame({ names: ["Yash", "Viraj"], settings: { teamSize: 1 } }));
    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $1" }));
    advance(3000); // Yash's squad is now full
    advance(REVEAL_DURATION_MS); // the domain auto-awards the next player to Viraj

    const awarded = store.getSnapshot();
    expect(awarded.lastResult).toMatchObject({ managerId: VIRAJ, amount: 1, outcome: "AUTO_AWARDED" });
    const reveal = screen.getByRole("group", { name: "Auto-awarded" });
    expect(within(reveal).getByText("Viraj")).toBeTruthy();
    expect(within(reveal).getByText("$1")).toBeTruthy();
    expect(within(panel("Viraj")).getByText("Squad complete")).toBeTruthy();
    expect(within(panel("Viraj")).queryAllByRole("button")).toHaveLength(0);

    advance(REVEAL_DURATION_MS);
    expect(store.getSnapshot().status).toBe("GAME_COMPLETE");
    expect(screen.getByRole("heading", { level: 1, name: "Auction complete" })).toBeTruthy();
    expect(screen.getByText(/All 2 squads are full after 2 lots/)).toBeTruthy();
  });

  it("renders the domain's tight-pool auto-award when a lot gets no bids", () => {
    const { store } = renderAuction(readyGame({ names: ["Yash", "Viraj"], settings: { teamSize: 1 }, poolSize: 2 }));
    advance(3000);

    const result = store.getSnapshot().lastResult;
    expect(result?.outcome).toBe("AUTO_AWARDED");
    const winner = store.getSnapshot().managers.find((m) => m.id === result?.managerId);
    const reveal = screen.getByRole("group", { name: "Auto-awarded" });
    expect(within(reveal).getByText(winner?.name ?? "missing")).toBeTruthy();
  });

  it("holds no copy of game state: changes made outside the UI render immediately", () => {
    const { store } = renderAuction(readyGame());

    act(() => {
      store.dispatch({ type: "PLACE_BID", managerId: VIRAJ, amount: 5 });
    });
    const game = store.getSnapshot();
    expect(within(bidding()).getByText("$5")).toBeTruthy();
    expect(within(panel("Viraj")).getByText("Leading")).toBeTruthy();

    // Yash's buttons mirror getQuickBidOptions exactly (amounts and enabled state).
    const expected = getQuickBidOptions(game, YASH, Date.now());
    const buttons = within(panel("Yash")).getAllByRole("button");
    expect(buttons.map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-disabled")])).toEqual(
      expected.map((o) => [`Yash: bid $${o.amount} (+$${o.step})`, String(!o.enabled)]),
    );

    act(() => {
      store.dispatch({ type: "PAUSE" });
    });
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
    expect(screen.getByText(/Bidding is frozen/)).toBeTruthy();
  });

  it("keeps the countdown out of screen-reader announcements", () => {
    renderAuction(readyGame());
    const timer = screen.getByRole("timer");
    expect(timer.getAttribute("aria-live")).toBeNull(); // role=timer is implicitly aria-live="off"

    const status = screen.getByRole("status");
    const initial = status.textContent;
    expect(initial).toMatch(/^Now bidding: /);
    advance(1500);
    expect(timerText()).toContain("1.5");
    expect(status.textContent).toBe(initial);

    fireEvent.click(within(panel("Yash")).getByRole("button", { name: "Yash: open at $1" }));
    expect(status.textContent).toMatch(/^Yash leads for .+ with \$1\.$/);
  });
});
