import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameResults, PublicRoomSnapshot } from "@protocol";
import { createMemoryTokenStore, type TokenStore } from "@/lib/session/tokenStore";
import { RoomClient } from "@/state/room/roomClient";
import { RoomClientProvider } from "@/state/room/RoomClientProvider";
import type { TransportAck } from "@/lib/socket/transport";
import { FakeTransport, ok, rejected } from "@/test/fakeTransport";
import { IDS, ROOM_ID, T0, TOKEN, enteredData, finishedSnapshot, gameSnapshot, lobbySnapshot, resumedData } from "@/test/roomFixtures";
import { RoomScreen } from "@/components/room/RoomScreen";
import { formatResultsText } from "./resultsText";

let transport: FakeTransport;
let tokens: TokenStore;
let client: RoomClient;

beforeEach(() => {
  transport = new FakeTransport();
  tokens = createMemoryTokenStore();
  client = new RoomClient({ transport, tokens, now: () => T0, clockPingIntervalMs: 0 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openResultsAs(participantId: string, snapshot: PublicRoomSnapshot, commands?: (event: string, payload: Record<string, unknown>) => TransportAck) {
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

function results(snapshot: PublicRoomSnapshot): GameResults {
  if (snapshot.results === null) throw new Error("fixture has no results");
  return snapshot.results;
}

const team = (name: string) => screen.getByRole("region", { name });

/** Hand-written results, so the copied text can be checked exactly. */
const SAMPLE: GameResults = {
  endReason: "COMPLETED",
  settings: { startingBudget: 20, teamSize: 2, minimumBid: 1, bidIncrement: 1, auctionTimerMs: 3000 },
  statistics: { lotsCompleted: 4, playersSold: 3, playersAutoAwarded: 1, playersUnsold: 0, lotsInterrupted: 0, totalBids: 5, totalSpent: 16, averagePrice: 4, highestSale: { lotNumber: 1, playerName: "Player A", managerName: "Yash", amount: 5 } },
  managers: [
    {
      managerId: "manager-1", name: "Yash", startingBudget: 20, spent: 10, budgetRemaining: 10, squadSize: 2, teamSize: 2, openSlots: 0, complete: true,
      players: [
        { playerId: "player-a", name: "Player A", primaryPosition: "ST", positionGroup: "ATT", nationality: "X", price: 5, acquiredBy: "SOLD", lotNumber: 1 },
        { playerId: "player-b", name: "Player B", primaryPosition: "GK", positionGroup: "GK", nationality: "X", price: 5, acquiredBy: "SOLD", lotNumber: 2 },
      ],
      positionCounts: { GK: 1, DEF: 0, MID: 0, ATT: 1 },
      averageRatings: { attacking: 3, creativity: 2.5, defending: 2, physical: 4, technical: 4, sixAsideFit: 4.5, goalkeeping: 3 },
    },
    {
      managerId: "manager-2", name: "Viraj", startingBudget: 20, spent: 6, budgetRemaining: 14, squadSize: 2, teamSize: 2, openSlots: 0, complete: true,
      players: [
        { playerId: "player-c", name: "Player C", primaryPosition: "CM", positionGroup: "MID", nationality: "X", price: 5, acquiredBy: "SOLD", lotNumber: 3 },
        { playerId: "player-d", name: "Player D", primaryPosition: "CB", positionGroup: "DEF", nationality: "X", price: 1, acquiredBy: "AUTO_AWARDED", lotNumber: 4 },
      ],
      positionCounts: { GK: 0, DEF: 1, MID: 1, ATT: 0 },
      averageRatings: { attacking: 3, creativity: 4, defending: 4, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
    },
  ],
  lots: [],
};

describe("formatResultsText", () => {
  it("produces the plain-text summary: teams with prices, then remaining budgets", () => {
    expect(formatResultsText(SAMPLE)).toBe(
      [
        "Football Auction: auction complete",
        "",
        "Team Yash",
        "- Player A — $5",
        "- Player B — $5",
        "",
        "Team Viraj",
        "- Player C — $5",
        "- Player D — $1",
        "",
        "Remaining Budget:",
        "Yash — $10",
        "Viraj — $14",
      ].join("\n"),
    );
  });

  it("says when the auction ended early, lists empty teams, and never includes internal ids", () => {
    const snapshot = finishedSnapshot({ ending: "ENDED_EARLY" });
    const text = formatResultsText(results(snapshot));
    expect(text.split("\n")[0]).toBe("Football Auction: auction ended early");
    expect(text).toContain("Team Yash\n- No players");
    for (const id of [...Object.values(IDS), "manager-1", "manager-2", "manager-3", ROOM_ID, TOKEN]) {
      expect(text).not.toContain(id);
    }
    for (const manager of results(snapshot).managers) {
      for (const player of manager.players) expect(text).not.toContain(player.playerId);
    }
    expect(text).not.toMatch(/[<>*#`]/); // no markup
  });
});

describe("results screen: completed auction", () => {
  const snapshot = finishedSnapshot({ ending: "COMPLETED" });
  const final = results(snapshot);

  it("says the auction completed, from the server's end reason", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    expect(screen.getByRole("heading", { level: 1, name: "Auction complete" })).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Every squad is full after 3 lots.")).toBeTruthy();
    expect(document.querySelector("[data-view=results]")?.getAttribute("data-end-reason")).toBe("COMPLETED");
  });

  it("shows every team with its players, prices, spending and remaining budget", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    const expected = { Yash: ["$1", "$19"], Viraj: ["$3", "$17"], Vineet: ["$2", "$18"] } as const;
    for (const manager of final.managers) {
      const card = team(manager.name);
      const [spent, remaining] = expected[manager.name as keyof typeof expected];
      expect(within(card).getByText("Spent").nextSibling?.textContent).toBe(spent);
      expect(within(card).getByText("Remaining").nextSibling?.textContent).toBe(remaining);
      expect(within(card).getByText("Squad").nextSibling?.textContent).toBe("1/1");
      expect(within(card).getByText("Squad complete")).toBeTruthy();
      const player = manager.players[0];
      if (player === undefined) throw new Error("fixture: empty squad");
      const row = within(within(card).getByRole("list", { name: `${manager.name}'s players` })).getByRole("listitem");
      expect(row.textContent).toContain(player.name);
      expect(row.textContent).toContain(`$${player.price}`);
    }
    expect(within(team("Yash")).getByText("Auto-awarded")).toBeTruthy();
    expect(within(team("Viraj")).queryByText("Auto-awarded")).toBeNull();
  });

  it("shows squad composition and game-rating averages, clearly labelled as game ratings", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    const viraj = final.managers.find((m) => m.name === "Viraj");
    const card = team("Viraj");
    expect(within(card).getByRole("heading", { name: "Squad composition" })).toBeTruthy();
    for (const group of ["GK", "DEF", "MID", "ATT"] as const) {
      expect(within(card).getByTitle(group === "GK" ? "Goalkeepers" : group === "DEF" ? "Defenders" : group === "MID" ? "Midfielders" : "Attackers").closest("div")?.textContent).toBe(
        `${group}${viraj?.positionCounts[group]}`,
      );
    }
    expect(within(card).getByRole("heading", { name: "Average game ratings (1–5)" })).toBeTruthy();
    expect(within(card).getByText("Attacking").nextSibling?.textContent).toBe(viraj?.averageRatings?.attacking.toFixed(1));
    expect(screen.getByText(/not objective real-world assessments/)).toBeTruthy();
    expect(screen.getByText(/Teams are not ranked/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b(winner|rank #|best team|score)\b/i);
  });

  it("shows the auction statistics", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    const stats = screen.getByRole("region", { name: "Auction statistics" });
    const value = (label: string) => within(stats).getByText(label).nextSibling?.textContent;
    expect(value("Lots completed")).toBe("3");
    expect(value("Sold")).toBe("2");
    expect(value("Auto-awarded")).toBe("1");
    expect(value("Unsold")).toBe("0");
    expect(value("Bids placed")).toBe("4");
    expect(value("Total spent")).toBe("$6");
    expect(value("Average price")).toBe("$2");
    expect(within(stats).queryByText("Interrupted")).toBeNull();
    expect(within(stats).getByText(/to Viraj for \$3 \(lot 1\)/)).toBeTruthy();
  });

  it("lists every lot with its outcome and the bids in order", async () => {
    const user = await openResultsAs(IDS.viraj, snapshot);
    const history = screen.getByRole("region", { name: "Auction history" });
    const lots = within(history).getAllByRole("listitem", { name: /^Lot \d+$/ });
    expect(lots.map((lot) => lot.getAttribute("aria-label"))).toEqual(["Lot 1", "Lot 2", "Lot 3"]);
    expect(lots[0]?.textContent).toContain("Sold to Viraj for $3");
    expect(lots[1]?.textContent).toContain("Sold to Vineet for $2");
    expect(lots[2]?.textContent).toContain("Auto-awarded to Yash for $1");
    const first = lots[0];
    if (first === undefined) throw new Error("no lot 1");
    await user.click(within(first).getByText("3 bids"));
    expect(within(first).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Viraj $1", "Vineet $2", "Viraj $3"]);
    expect(within(lots[2] as HTMLElement).queryByText(/bids?$/)).toBeNull();
  });

  it("marks the viewer's own team and puts it first on phones", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    const cards = screen.getAllByTestId("team-card");
    expect(cards.map((card) => within(card).getByRole("heading", { level: 3 }).textContent)).toEqual(["Yash", "Viraj", "Vineet"]);
    expect(within(team("Viraj")).getByText("Your team")).toBeTruthy();
    expect(team("Viraj").className).toContain("max-sm:order-first");
    for (const name of ["Yash", "Vineet"]) {
      expect(within(team(name)).queryByText("Your team")).toBeNull();
      expect(team(name).className).not.toContain("order-first");
    }
  });

  it("gives a spectator the same results with no team marked as theirs", async () => {
    await openResultsAs(IDS.watcher, finishedSnapshot({ ending: "COMPLETED", withSpectator: true }));
    expect(screen.getByRole("heading", { level: 1, name: "Auction complete" })).toBeTruthy();
    expect(screen.getAllByTestId("team-card")).toHaveLength(3);
    expect(screen.queryByText("Your team")).toBeNull();
  });

  it("renders the server's numbers as given instead of recomputing them", async () => {
    const edited: GameResults = {
      ...final,
      managers: final.managers.map((m) => (m.name === "Viraj" ? { ...m, budgetRemaining: 777 } : m)),
    };
    await openResultsAs(IDS.viraj, { ...snapshot, results: edited });
    expect(within(team("Viraj")).getByText("Remaining").nextSibling?.textContent).toBe("$777");
  });
});

describe("results screen: ended early", () => {
  const snapshot = finishedSnapshot({ ending: "ENDED_EARLY" });

  it("says the auction ended early and shows incomplete squads", async () => {
    await openResultsAs(IDS.host, snapshot);
    expect(screen.getByRole("heading", { level: 1, name: "Auction ended early" })).toBeTruthy();
    expect(screen.getByText("Ended early")).toBeTruthy();
    expect(screen.getByText(/The host ended the auction before every squad was full, after 1 completed lot\./)).toBeTruthy();
    expect(within(team("Viraj")).getByText("Incomplete: 5 open slots")).toBeTruthy();
    expect(within(team("Yash")).getByText("Incomplete: 6 open slots")).toBeTruthy();
    expect(within(team("Yash")).getByText("No players bought.")).toBeTruthy();
    expect(within(team("Yash")).getByText("No players, so no ratings.")).toBeTruthy();
  });

  it("shows the interrupted lot as not awarded, with its bids", async () => {
    const user = await openResultsAs(IDS.host, snapshot);
    const history = screen.getByRole("region", { name: "Auction history" });
    const last = within(history).getByRole("listitem", { name: "Lot 2" });
    expect(within(last).getByText("Interrupted")).toBeTruthy();
    expect(last.textContent).toContain("Not awarded");
    await user.click(within(last).getByText("1 bid"));
    expect(within(last).getByText("Vineet $1")).toBeTruthy();
    const stats = screen.getByRole("region", { name: "Auction statistics" });
    expect(within(stats).getByText("Interrupted").nextSibling?.textContent).toBe("1");
  });
});

describe("copy results", () => {
  const snapshot = finishedSnapshot({ ending: "COMPLETED" });

  it("copies the plain-text summary and confirms it", async () => {
    const user = await openResultsAs(IDS.viraj, snapshot);
    await user.click(screen.getByRole("button", { name: "Copy results" }));
    await waitFor(() => expect(screen.getByText("Results copied. Paste them anywhere.")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    expect(await navigator.clipboard.readText()).toBe(formatResultsText(results(snapshot)));
    expect(screen.getByTestId("results-text").textContent).toBe(formatResultsText(results(snapshot)));
  });

  it("says so when copying isn't possible, pointing to the text version", async () => {
    const user = await openResultsAs(IDS.viraj, snapshot);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    await user.click(screen.getByRole("button", { name: "Copy results" }));
    expect(await screen.findByText(/Couldn't copy automatically/)).toBeTruthy();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: "Copy results" })).toBeTruthy();
    Reflect.deleteProperty(document, "execCommand");
  });
});

describe("results arrive with the server's FINISHED snapshot", () => {
  it("switches from the live auction to the results screen", async () => {
    await openResultsAs(IDS.viraj, gameSnapshot());
    expect(screen.getByRole("region", { name: "Your bid controls" })).toBeTruthy();
    transport.pushSnapshot(finishedSnapshot({ ending: "ENDED_EARLY", version: 99 }));
    expect(await screen.findByRole("heading", { level: 1, name: "Auction ended early" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Your bid controls" })).toBeNull();
    // The room header stays, so the connection state is still visible.
    expect(screen.getByTestId("connection-indicator")).toBeTruthy();
  });
});

describe("start a new auction", () => {
  const snapshot = finishedSnapshot({ ending: "COMPLETED" });

  it("lets the host start one after confirming, then follows the server back to the lobby", async () => {
    const user = await openResultsAs(IDS.host, snapshot);
    const panel = screen.getByRole("region", { name: "Play again" });
    await user.click(within(panel).getByRole("button", { name: "Start new auction" }));
    expect(transport.lastSent("game:newAuction")).toBeUndefined(); // asks first
    expect(within(panel).getByText(/These results will disappear for everyone/)).toBeTruthy();

    await user.click(within(panel).getByRole("button", { name: "Keep results" }));
    expect(within(panel).queryByRole("button", { name: "Confirm new auction" })).toBeNull();
    await user.click(within(panel).getByRole("button", { name: "Start new auction" }));
    await user.click(within(panel).getByRole("button", { name: "Confirm new auction" }));
    expect(transport.lastSent("game:newAuction")?.payload).toEqual({ requestId: expect.any(String) });

    // Nothing changes until the server says so; then the lobby replaces the results.
    expect(screen.getByRole("heading", { level: 1, name: "Auction complete" })).toBeTruthy();
    transport.pushSnapshot(lobbySnapshot({ version: snapshot.version + 1, ready: false }));
    expect(await screen.findByRole("region", { name: /In the room/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "Auction complete" })).toBeNull();
  });

  it("shows the server's reason if it refuses", async () => {
    const user = await openResultsAs(IDS.host, snapshot, (event, payload) =>
      event === "game:newAuction" ? rejected(payload, "INVALID_STATUS", "A new auction can only be started once this one has finished.") : ok(payload, {}),
    );
    await user.click(screen.getByRole("button", { name: "Start new auction" }));
    await user.click(screen.getByRole("button", { name: "Confirm new auction" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/can only be started once this one has finished/);
  });

  it("gives managers and spectators no button, just a note", async () => {
    await openResultsAs(IDS.viraj, snapshot);
    expect(screen.queryByRole("button", { name: /new auction/i })).toBeNull();
    expect(screen.queryByRole("region", { name: "Play again" })).toBeNull();
    expect(screen.getByText(/The host can start a new auction with the same group/)).toBeTruthy();
  });
});
