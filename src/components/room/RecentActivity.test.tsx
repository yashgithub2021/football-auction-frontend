import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getPlayerById } from "@domain/players/players";
import type { Game } from "@domain/types";
import { IDS, T0, gameSnapshot, type GameOptions } from "@/test/roomFixtures";
import { RECENT_ACTIVITY_LIMIT, RecentActivity, recentActivity } from "./RecentActivity";

afterEach(cleanup);

function liveGame(bids: GameOptions["bids"] = []): Game {
  const game = gameSnapshot({ bids }).game;
  if (game === null) throw new Error("fixture");
  return game;
}

const nameOf = (id: string) => getPlayerById(id)?.name ?? "";

describe("recentActivity", () => {
  it("lists the open lot's accepted bids, newest first", () => {
    const game = liveGame([
      { participantId: IDS.viraj, amount: 1, at: T0 + 100 },
      { participantId: IDS.vineet, amount: 2, at: T0 + 200 },
    ]);
    const player = nameOf(game.currentAuction?.playerId ?? "");
    expect(recentActivity(game).map((item) => item.text)).toEqual([`Vineet bid $2 for ${player}`, `Viraj bid $1 for ${player}`]);
  });

  it("adds closed lots from the history, and doesn't repeat a revealed lot's bids", () => {
    const game = liveGame([{ participantId: IDS.viraj, amount: 3 }]);
    const auction = game.currentAuction;
    if (auction === null) throw new Error("fixture");
    const player = nameOf(auction.playerId);
    const revealed: Game = {
      ...game,
      status: "PLAYER_SOLD",
      history: [{ lotNumber: 1, playerId: auction.playerId, managerId: "manager-2", amount: 3, outcome: "SOLD", completedAt: T0 + 3000, bids: auction.bids }],
      currentAuction: { ...auction, revealEndsAt: T0 + 5500 },
    };
    expect(recentActivity(revealed).map((item) => item.text)).toEqual([`Lot 1: ${player} sold to Viraj for $3`]);
  });

  it("describes sold and unsold lots and keeps only the latest few", () => {
    const game = liveGame();
    const ids = game.availablePlayerIds.slice(0, RECENT_ACTIVITY_LIMIT + 2);
    const history = ids.map((playerId, index) =>
      index % 2 === 0
        ? { lotNumber: index + 1, playerId, managerId: null, amount: 0, outcome: "UNSOLD" as const, completedAt: T0 + index, bids: [] }
        : { lotNumber: index + 1, playerId, managerId: "manager-1", amount: 1, outcome: "SOLD" as const, completedAt: T0 + index, bids: [{ managerId: "manager-1", amount: 1, placedAt: T0 }] },
    );
    const items = recentActivity({ ...game, history });
    expect(items).toHaveLength(RECENT_ACTIVITY_LIMIT);
    const last = ids.length;
    expect(items[0]?.text).toBe(`Lot ${last}: ${nameOf(ids[last - 1] ?? "")} sold to Yash for $1`);
    expect(items[1]?.text).toBe(`Lot ${last - 1}: ${nameOf(ids[last - 2] ?? "")} went unsold`);
    expect(items.some((item) => /award/i.test(item.text))).toBe(false);
  });
});

describe("RecentActivity", () => {
  it("shows an empty state, then the feed", () => {
    const { rerender } = render(<RecentActivity game={liveGame()} />);
    const section = screen.getByRole("region", { name: "Recent activity" });
    expect(within(section).getByText(/Nothing yet/)).toBeTruthy();
    rerender(<RecentActivity game={liveGame([{ participantId: IDS.host, amount: 2 }])} />);
    expect(within(section).getByRole("listitem").textContent).toMatch(/^Yash bid \$2 for /);
  });
});
