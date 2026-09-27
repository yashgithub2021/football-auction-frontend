// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUCTION_TIMER_SECONDS,
  DEFAULT_SETTINGS,
  MAX_AUCTION_TIMER_SECONDS,
  MIN_MANAGERS,
  MS_PER_SECOND,
} from "@domain/constants";
import { createGame, validateSettings } from "@domain/engine";
import type { Game, GameSettings } from "@domain/types";
import { SetupScreen } from "./SetupScreen";
import { PLAYER_POOL_SIZE, type EditableSetting } from "./setupDraft";

// Wrap the real createGame so tests can observe calls and, once, force a
// domain rejection. Every other call runs the real domain code.
vi.mock("@domain/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@domain/engine")>();
  return { ...actual, createGame: vi.fn(actual.createGame) };
});

const GAME_ID = "game-under-test";
const CREATED_AT = 1_700_000_000_000;

const LABELS: Readonly<Record<EditableSetting, string>> = {
  startingBudget: "Starting budget",
  teamSize: "Team size",
  minimumBid: "Minimum bid",
  bidIncrement: "Bid increment",
  auctionTimerMs: "Auction timer",
};

/** What each input shows for a domain value (the timer is entered in seconds). */
const toInputValue = (field: EditableSetting, value: number) =>
  String(field === "auctionTimerMs" ? value / MS_PER_SECOND : value);

function setup() {
  const onGameCreated = vi.fn<(game: Game) => void>();
  const user = userEvent.setup();
  render(<SetupScreen onGameCreated={onGameCreated} createId={() => GAME_ID} now={() => CREATED_AT} />);
  return { user, onGameCreated };
}

const nameInputs = () => screen.getAllByLabelText(/^Manager \d+$/) as HTMLInputElement[];
const settingInput = (field: EditableSetting) => screen.getByLabelText(LABELS[field]) as HTMLInputElement;
const startButton = () => screen.getByRole("button", { name: "Start game" });
const addButton = () => screen.getByRole("button", { name: "Add manager" });
const errorSummary = () => screen.queryByRole("region", { name: "Fix these to start" });

async function typeNames(user: UserEvent, names: readonly string[]) {
  while (nameInputs().length < names.length) {
    await user.click(addButton());
  }
  for (const [index, name] of names.entries()) {
    const input = nameInputs()[index];
    if (input === undefined) throw new Error(`missing name input ${index}`);
    await user.clear(input);
    await user.type(input, name);
  }
}

async function setSetting(user: UserEvent, field: EditableSetting, value: string) {
  const input = settingInput(field);
  await user.clear(input);
  if (value !== "") await user.type(input, value);
  await user.tab();
}

/** The message the domain itself produces for a configuration. */
function domainMessage(settings: Partial<GameSettings>, names: readonly string[], match: (field?: string) => boolean) {
  const error = validateSettings({ ...DEFAULT_SETTINGS, ...settings }, names, PLAYER_POOL_SIZE).find((e) => match(e.field));
  if (error === undefined) throw new Error("expected the domain to report an error");
  return error.message;
}

beforeEach(() => {
  vi.mocked(createGame).mockClear();
});

afterEach(() => {
  cleanup();
});

describe("SetupScreen", () => {
  it("renders the default setup from the domain constants", () => {
    setup();

    expect(screen.getByRole("heading", { level: 1, name: "Set up your auction" })).toBeTruthy();
    for (const field of Object.keys(LABELS) as EditableSetting[]) {
      expect(settingInput(field).value).toBe(toInputValue(field, DEFAULT_SETTINGS[field]));
    }
    expect(settingInput("auctionTimerMs").value).toBe(String(DEFAULT_AUCTION_TIMER_SECONDS));
    expect(nameInputs()).toHaveLength(MIN_MANAGERS);
    expect(nameInputs().every((input) => input.value === "")).toBe(true);

    const pool = screen.getByRole("region", { name: "Player pool" });
    expect(within(pool).getByText(String(PLAYER_POOL_SIZE))).toBeTruthy();
    expect(within(pool).getByText(String(MIN_MANAGERS * DEFAULT_SETTINGS.teamSize))).toBeTruthy();

    // Blank names make the default invalid, but nothing is shouted at the host yet.
    expect(startButton().getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByText(/needs a name/)).toBeNull();
    expect(errorSummary()).toBeNull();
  });

  it("adds and removes managers with predictable focus", async () => {
    const { user } = setup();

    await user.click(addButton());
    expect(nameInputs()).toHaveLength(MIN_MANAGERS + 1);
    expect(document.activeElement).toBe(nameInputs().at(-1));

    await typeNames(user, ["Yash", "Viraj", "Vineet"]);
    await user.click(screen.getByRole("button", { name: "Remove manager 1 (Yash)" }));

    expect(nameInputs().map((input) => input.value)).toEqual(["Viraj", "Vineet"]);
    expect(screen.getByLabelText("Manager 1")).toBe(nameInputs()[0]);
    expect(document.activeElement).toBe(addButton());
  });

  it("supports keyboard-only setup: add with Enter, fill names, submit with Enter", async () => {
    const { user, onGameCreated } = setup();

    addButton().focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(nameInputs()[2]);
    await user.keyboard("Vineet");

    await user.click(nameInputs()[0] as HTMLInputElement);
    await user.keyboard("Yash");
    await user.tab(); // Remove button
    await user.tab(); // Manager 2
    await user.keyboard("Viraj{Enter}");

    expect(onGameCreated).toHaveBeenCalledTimes(1);
    expect(onGameCreated.mock.calls[0]?.[0].managers.map((m) => m.name)).toEqual(["Yash", "Viraj", "Vineet"]);
  });

  it("blocks starting with too few managers and shows the domain message immediately", async () => {
    const { user, onGameCreated } = setup();

    await user.click(screen.getByRole("button", { name: /^Remove manager 2/ }));
    const expected = domainMessage({}, [""], (field) => field === "managerNames");
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);

    await typeNames(user, ["Yash"]);
    await user.click(startButton());
    expect(onGameCreated).not.toHaveBeenCalled();
    expect(within(errorSummary() as HTMLElement).getByText(expected)).toBeTruthy();
  });

  it("refuses to start an invalid setup and lists every domain error", async () => {
    const { user, onGameCreated } = setup();

    await user.click(startButton());

    expect(onGameCreated).not.toHaveBeenCalled();
    expect(createGame).toHaveBeenCalledTimes(1);
    const summary = errorSummary();
    expect(summary).not.toBeNull();
    expect(document.activeElement).toBe(summary);
    for (const index of [0, 1]) {
      const message = domainMessage({}, ["", ""], (field) => field === `managerNames.${index}`);
      expect(within(summary as HTMLElement).getByRole("link", { name: message }).getAttribute("href")).toBe(
        `#${nameInputs()[index]?.id}`,
      );
      expect(nameInputs()[index]?.getAttribute("aria-invalid")).toBe("true");
    }
  });

  it("does not pull focus back to the error summary on later re-renders", async () => {
    const { user } = setup();
    await user.click(startButton());
    expect(document.activeElement).toBe(errorSummary());

    // Blurring a field re-renders the form (it becomes "touched") while the summary is still shown.
    await user.click(settingInput("teamSize"));
    await user.click(settingInput("minimumBid"));
    expect(errorSummary()).not.toBeNull();
    expect(document.activeElement).toBe(settingInput("minimumBid"));
  });

  it("clears the stale summary when the form changes", async () => {
    const { user } = setup();
    await user.click(startButton());
    expect(errorSummary()).not.toBeNull();
    await user.type(nameInputs()[0] as HTMLInputElement, "Y");
    expect(errorSummary()).toBeNull();
    // Inline errors stay visible after a failed attempt.
    expect(screen.getByText(domainMessage({}, ["Y", ""], (field) => field === "managerNames.1"))).toBeTruthy();
  });

  it("rejects duplicate names using the domain rule (case and spaces ignored)", async () => {
    const { user, onGameCreated } = setup();
    await typeNames(user, ["Yash", " yash "]);
    await user.tab();

    const expected = domainMessage({}, ["Yash", " yash "], (field) => field === "managerNames.1");
    expect(screen.getByText(expected)).toBeTruthy();
    await user.click(startButton());
    expect(onGameCreated).not.toHaveBeenCalled();
  });

  it.each<[string, EditableSetting, string, number]>([
    ["zero budget", "startingBudget", "0", 0],
    ["blank team size", "teamSize", "", Number.NaN],
    ["fractional minimum bid", "minimumBid", "1.5", 1.5],
    ["negative bid increment", "bidIncrement", "-1", -1],
    ["zero-second timer", "auctionTimerMs", "0", 0],
    ["fractional-second timer", "auctionTimerMs", "2.5", 2.5 * MS_PER_SECOND],
    ["timer above the maximum", "auctionTimerMs", String(MAX_AUCTION_TIMER_SECONDS + 1), (MAX_AUCTION_TIMER_SECONDS + 1) * MS_PER_SECOND],
  ])("shows the domain message for a %s and blocks starting", async (_label, field, value, domainValue) => {
    const { user, onGameCreated } = setup();
    await typeNames(user, ["Yash", "Viraj"]);
    await setSetting(user, field, value);

    const input = settingInput(field);
    const expected = domainMessage({ [field]: domainValue }, ["Yash", "Viraj"], (f) => f === field);
    expect(screen.getByText(expected)).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(`${input.id}-error`);
    expect(startButton().getAttribute("aria-disabled")).toBe("true");

    await user.click(startButton());
    expect(onGameCreated).not.toHaveBeenCalled();
  });

  it("blocks a budget that cannot fill a squad at the minimum bid", async () => {
    const { user, onGameCreated } = setup();
    await typeNames(user, ["Yash", "Viraj"]);
    const tooLow = String(DEFAULT_SETTINGS.teamSize * DEFAULT_SETTINGS.minimumBid - 1);
    await setSetting(user, "startingBudget", tooLow);

    const expected = domainMessage({ startingBudget: Number(tooLow) }, ["Yash", "Viraj"], (f) => f === "startingBudget");
    expect(screen.getByText(expected)).toBeTruthy();
    await user.click(startButton());
    expect(onGameCreated).not.toHaveBeenCalled();
  });

  it("blocks starting when the player pool cannot fill every squad", async () => {
    const { user, onGameCreated } = setup();
    const names = ["Yash", "Viraj"];
    const teamSize = Math.floor(PLAYER_POOL_SIZE / names.length) + 1;
    await typeNames(user, names);
    await setSetting(user, "startingBudget", String(teamSize * 10));
    await setSetting(user, "teamSize", String(teamSize));

    const pool = screen.getByRole("region", { name: "Player pool" });
    const expected = domainMessage({ teamSize, startingBudget: teamSize * 10 }, names, (f) => f === undefined);
    expect(within(pool).getByRole("status").textContent).toBe(expected);
    expect(within(pool).getByText(String(names.length * teamSize))).toBeTruthy();
    expect(startButton().getAttribute("aria-disabled")).toBe("true");

    await user.click(startButton());
    expect(onGameCreated).not.toHaveBeenCalled();
    expect(within(errorSummary() as HTMLElement).getByText(expected)).toBeTruthy();
  });

  it("creates the READY game through the domain with exactly the configured values", async () => {
    const { user, onGameCreated } = setup();
    await typeNames(user, [" Yash ", "Viraj", "Vineet"]);
    await setSetting(user, "startingBudget", "25");
    await setSetting(user, "teamSize", "5");
    await setSetting(user, "minimumBid", "2");
    await setSetting(user, "bidIncrement", "3");
    await setSetting(user, "auctionTimerMs", String(MAX_AUCTION_TIMER_SECONDS));

    expect(startButton().getAttribute("aria-disabled")).toBe("false");
    await user.click(startButton());

    const timerMs = MAX_AUCTION_TIMER_SECONDS * MS_PER_SECOND;
    const expectedInput = {
      id: GAME_ID,
      managerNames: [" Yash ", "Viraj", "Vineet"],
      settings: { startingBudget: 25, teamSize: 5, minimumBid: 2, bidIncrement: 3, auctionTimerMs: timerMs },
      now: CREATED_AT,
    };
    expect(createGame).toHaveBeenCalledWith(expectedInput);

    const reference = createGame(expectedInput);
    expect(reference.ok).toBe(true);
    expect(onGameCreated).toHaveBeenCalledTimes(1);
    const game = onGameCreated.mock.calls[0]?.[0];
    expect(game).toEqual(reference.ok ? reference.game : null);
    expect(game).toMatchObject({
      id: GAME_ID,
      status: "READY",
      createdAt: CREATED_AT,
      settings: { startingBudget: 25, teamSize: 5, minimumBid: 2, bidIncrement: 3, auctionTimerMs: timerMs },
    });
    expect(game?.managers.map((m) => [m.name, m.budgetRemaining])).toEqual([
      ["Yash", 25],
      ["Viraj", 25],
      ["Vineet", 25],
    ]);
    expect(game?.availablePlayerIds).toHaveLength(PLAYER_POOL_SIZE);
  });

  it("does not bypass domain validation when the form looks valid", async () => {
    const { user, onGameCreated } = setup();
    await typeNames(user, ["Yash", "Viraj"]);
    expect(startButton().getAttribute("aria-disabled")).toBe("false");

    const domainOnlyMessage = "Rejected by the domain.";
    vi.mocked(createGame).mockReturnValueOnce({
      ok: false,
      errors: [{ code: "UNKNOWN_PLAYER", message: domainOnlyMessage }],
    });
    await user.click(startButton());

    expect(createGame).toHaveBeenCalledTimes(1);
    expect(onGameCreated).not.toHaveBeenCalled();
    expect(within(errorSummary() as HTMLElement).getByText(domainOnlyMessage)).toBeTruthy();
  });
});
