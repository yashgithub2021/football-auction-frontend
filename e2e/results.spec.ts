/**
 * Final results after a natural finish, against the real server:
 *   Yash  – host who plays, desktop 1440×900 (clipboard allowed)
 *   Viraj – manager on a phone, 390×844
 * Team size 1, so the game ends by itself: Viraj wins lot 1 after a short
 * bidding war, then Yash is the last manager with a slot and the server
 * auto-awards him a player at the minimum bid.
 */
import { expect, test } from "@playwright/test";
import {
  closeAll,
  createRoom,
  expectNoHorizontalOverflow,
  expectOnScreen,
  joinFromLink,
  MIN_TOUCH_TARGET,
  openDevice,
  participantRow,
  saveSettings,
  smallestFontSize,
  statValue,
  teamCard,
  type Device,
} from "./helpers";

test.describe.configure({ mode: "serial" });

let host: Device;
let viraj: Device;
let roomId = "";
/** Name of the player Viraj wins, read off the lot card during the game. */
let lotOnePlayer = "";

const dock = (device: Device) => device.page.getByRole("region", { name: "Your bid controls" });
const completeHeading = (device: Device) => device.page.getByRole("heading", { level: 1, name: "Auction complete", exact: true });

test.beforeAll(async ({ browser }) => {
  host = await openDevice(browser, "desktop", { permissions: ["clipboard-read", "clipboard-write"] });
  viraj = await openDevice(browser, "mobile");
});

test.afterAll(async () => {
  await closeAll([host, viraj]);
});

test("1. a short game plays to its natural end and everyone gets 'Auction complete'", async () => {
  roomId = await createRoom(host.page, "Yash", { playing: true });
  await joinFromLink(viraj.page, roomId, "Viraj");
  await saveSettings(host.page, { "Team size": "1", "Auction timer": "5" });
  await expect(viraj.page.getByRole("region", { name: "Rules" })).toContainText("5s");
  await viraj.page.getByRole("button", { name: "I'm ready" }).click();
  await host.page.getByRole("button", { name: "Start auction" }).click();
  await expect(dock(viraj)).toBeVisible({ timeout: 15_000 });

  lotOnePlayer = (await viraj.page.getByRole("article").getByRole("heading", { level: 2 }).textContent()) ?? "";
  expect(lotOnePlayer).not.toBe("");
  await dock(viraj).getByRole("button", { name: "Open bidding at $1" }).click();
  await dock(host).getByRole("button", { name: /^Bid \$2/ }).click();
  await dock(viraj).getByRole("button", { name: /^Bid \$3/ }).click();
  await expect(host.page.getByRole("region", { name: "Bidding" })).toContainText("$3");
  // The live feed shows the bidding war as it happens.
  await expect(host.page.getByTestId("recent-activity")).toContainText(`Viraj bid $3 for ${lotOnePlayer}`);

  // The server closes the lot, auto-awards Yash's last slot and finishes the game.
  for (const device of [host, viraj]) {
    await expect(completeHeading(device)).toBeVisible({ timeout: 20_000 });
    await expect(device.page.locator("[data-view=results]")).toHaveAttribute("data-end-reason", "COMPLETED");
    await expect(device.page.getByText("Ended early")).toHaveCount(0);
  }
});

test("2. each team shows its players, prices, spending and remaining budget", async () => {
  for (const device of [host, viraj]) {
    const virajCard = teamCard(device.page, "Viraj");
    await expect(statValue(virajCard, "Spent")).toHaveText("$3");
    await expect(statValue(virajCard, "Remaining")).toHaveText("$17");
    await expect(statValue(virajCard, "Squad")).toHaveText("1/1");
    await expect(virajCard.getByRole("list", { name: "Viraj's players" }).getByRole("listitem")).toHaveText([new RegExp(`${lotOnePlayer}.*\\$3$`)]);

    const yashCard = teamCard(device.page, "Yash");
    await expect(statValue(yashCard, "Spent")).toHaveText("$1");
    await expect(statValue(yashCard, "Remaining")).toHaveText("$19");
    await expect(yashCard.getByRole("list", { name: "Yash's players" }).getByRole("listitem")).toHaveCount(1);
    await expect(yashCard).toContainText("Auto-awarded");
    for (const card of [virajCard, yashCard]) {
      await expect(card).toContainText("Squad complete");
      await expect(card.getByRole("heading", { name: "Squad composition" })).toBeVisible();
      await expect(card.getByRole("heading", { name: "Average game ratings (1–5)" })).toBeVisible();
    }
  }
  await expect(teamCard(viraj.page, "Viraj")).toContainText("Your team");
  await expect(teamCard(viraj.page, "Yash")).not.toContainText("Your team");
  await expect(host.page.getByText(/not objective real-world assessments/)).toBeVisible();
});

test("3. statistics and the lot-by-lot history match what happened", async () => {
  const page = host.page;
  const stats = page.getByRole("region", { name: "Auction statistics" });
  await expect(statValue(stats, "Lots completed")).toHaveText("2");
  await expect(statValue(stats, "Sold")).toHaveText("1");
  await expect(statValue(stats, "Auto-awarded")).toHaveText("1");
  await expect(statValue(stats, "Unsold")).toHaveText("0");
  await expect(statValue(stats, "Bids placed")).toHaveText("3");
  await expect(statValue(stats, "Total spent")).toHaveText("$4");
  await expect(statValue(stats, "Average price")).toHaveText("$2");
  await expect(stats).toContainText(`${lotOnePlayer} to Viraj for $3 (lot 1)`);

  const history = page.getByRole("region", { name: "Auction history" });
  await expect(history.getByRole("listitem", { name: /^Lot \d+$/ })).toHaveCount(2);
  const lot1 = history.getByRole("listitem", { name: "Lot 1" });
  await expect(lot1).toContainText(lotOnePlayer);
  await expect(lot1).toContainText("Sold to Viraj for $3");
  await lot1.getByText("3 bids").click();
  await expect(lot1.getByRole("listitem")).toHaveText(["Viraj $1", "Yash $2", "Viraj $3"]);
  await expect(history.getByRole("listitem", { name: "Lot 2" })).toContainText("Auto-awarded to Yash for $1");
});

test("4. Copy results puts a clean plain-text summary on the clipboard and confirms it", async () => {
  const page = host.page;
  const yashPlayer = (await teamCard(page, "Yash").getByRole("listitem").locator("span.truncate").textContent()) ?? "";
  await page.getByRole("button", { name: "Copy results" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Results copied" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    [
      "Football Auction: auction complete",
      "",
      "Team Yash",
      `- ${yashPlayer} — $1`,
      "",
      "Team Viraj",
      `- ${lotOnePlayer} — $3`,
      "",
      "Remaining Budget:",
      "Yash — $19",
      "Viraj — $17",
    ].join("\n"),
  );
  expect(copied).not.toContain(roomId);
  expect(copied).not.toMatch(/manager-\d|[<>]/);
});

test("5. on a phone: own team first, no sideways scrolling, readable, copy button reachable", async () => {
  const page = viraj.page;
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  const own = await teamCard(page, "Viraj").boundingBox();
  const other = await teamCard(page, "Yash").boundingBox();
  expect(own !== null && other !== null && own.y < other.y, "own team above the others").toBe(true);
  expect(own !== null && other !== null && Math.abs(own.x - other.x) < 1, "single column").toBe(true);
  await expectOnScreen(page, page.getByRole("button", { name: "Copy results" }), MIN_TOUCH_TARGET);
  expect(await smallestFontSize(page.locator("main"))).toBeGreaterThanOrEqual(11);
});

test("6. on a desktop the teams sit side by side in join order", async () => {
  const page = host.page;
  await expectNoHorizontalOverflow(page);
  const yash = await teamCard(page, "Yash").boundingBox();
  const virajBox = await teamCard(page, "Viraj").boundingBox();
  expect(yash).not.toBeNull();
  expect(virajBox).not.toBeNull();
  if (yash === null || virajBox === null) return;
  expect(Math.abs(yash.y - virajBox.y), "same row").toBeLessThan(1);
  expect(yash.x).toBeLessThan(virajBox.x);
});

test("7. reloading the results page brings back the same results", async () => {
  await viraj.page.reload();
  await expect(completeHeading(viraj)).toBeVisible();
  await expect(viraj.page.getByRole("region", { name: /Join room/ })).toHaveCount(0);
  await expect(teamCard(viraj.page, "Viraj")).toContainText("Your team");
  await expect(statValue(teamCard(viraj.page, "Viraj"), "Remaining")).toHaveText("$17");
});

test("8. someone opening the invite after the end sees the results as a spectator", async ({ browser }) => {
  const late = await openDevice(browser, "tablet");
  try {
    await late.page.goto(`/room/${roomId}`);
    const form = late.page.getByRole("region", { name: `Join room ${roomId}` });
    await form.getByLabel("Your name").fill("Late");
    await form.getByRole("button", { name: "Join" }).click();
    await expect(completeHeading(late)).toBeVisible();
    await expect(late.page.getByTestId("team-card")).toHaveCount(2);
    await expect(late.page.getByText("Your team")).toHaveCount(0);
    await expect(statValue(teamCard(late.page, "Viraj"), "Spent")).toHaveText("$3");
    await expectNoHorizontalOverflow(late.page);
  } finally {
    await late.context.close();
  }
});

test("9. the host starts a new auction: everyone is back in the lobby and can play again", async () => {
  // Only the host gets the button.
  await expect(viraj.page.getByRole("button", { name: /new auction/i })).toHaveCount(0);
  await expect(viraj.page.getByText(/The host can start a new auction/)).toBeVisible();

  const panel = host.page.getByRole("region", { name: "Play again" });
  await panel.getByRole("button", { name: "Start new auction" }).click();
  await expect(completeHeading(host)).toBeVisible(); // asks first
  await panel.getByRole("button", { name: "Confirm new auction" }).click();

  for (const device of [host, viraj]) {
    await expect(device.page.getByRole("region", { name: /In the room/ })).toBeVisible();
    await expect(completeHeading(device)).toHaveCount(0);
    for (const name of ["Yash", "Viraj", "Late"]) await expect(participantRow(device.page, name)).toBeVisible();
  }
  // Same rules as last time; readiness starts over; the late spectator can now play.
  await expect(viraj.page.getByRole("region", { name: "Rules" })).toContainText("5s");
  await expect(participantRow(host.page, "Viraj")).toContainText("Not ready");
  await expect(participantRow(host.page, "Late")).toContainText("Not ready");
  await expect(participantRow(host.page, "Late")).not.toContainText("Watching");

  // Late has left, so the host removes them; then a fresh game starts with fresh budgets.
  await host.page.getByRole("button", { name: "Remove Late" }).click();
  await expect(participantRow(viraj.page, "Late")).toHaveCount(0);
  await viraj.page.getByRole("button", { name: "I'm ready" }).click();
  await host.page.getByRole("button", { name: "Start auction" }).click();
  await expect(dock(viraj)).toBeVisible({ timeout: 15_000 });
  await expect(viraj.page.getByRole("region", { name: "Your squad · 0/1" })).toBeVisible();
  await expect(host.page.getByTestId("other-managers").getByRole("listitem", { name: "Viraj" })).toContainText("$20 · 0/1");
  await expect(dock(viraj).getByRole("button", { name: "Open bidding at $1" })).toBeVisible();
});
