/**
 * The auctioneer setup: a host who doesn't play runs the board on a laptop,
 * two managers bid from a phone and a tablet. Uses the default 3-second
 * timer so the server's own expiry, reveal and next lot are exercised.
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
  statValue,
  teamCard,
  type Device,
} from "./helpers";

test.describe.configure({ mode: "serial" });

let board: Device;
let phone: Device;
let tablet: Device;
let roomId = "";

test.beforeAll(async ({ browser }) => {
  board = await openDevice(browser, "desktop");
  phone = await openDevice(browser, "mobile");
  tablet = await openDevice(browser, "tablet");
});

test.afterAll(async () => {
  await closeAll([board, phone, tablet]);
});

test("a non-playing host gets the board with every manager and host controls", async () => {
  roomId = await createRoom(board.page, "Auctioneer", { playing: false });
  await joinFromLink(phone.page, roomId, "Ajit");
  await joinFromLink(tablet.page, roomId, "Nirbhay");
  await phone.page.getByRole("button", { name: "I'm ready" }).click();
  await tablet.page.getByRole("button", { name: "I'm ready" }).click();
  await expect(board.page.getByRole("list", { name: "Why you can't start yet" })).toHaveCount(0);

  await board.page.getByRole("button", { name: "Start auction" }).click();
  await expect(board.page.getByRole("status", { name: /^Starting: (3|2|1|GO)$/ })).toBeVisible();
  await expect(board.page.locator("[data-view=board]")).toBeVisible({ timeout: 15_000 });

  await expect(board.page.getByRole("article")).toBeVisible();
  await expect(board.page.getByRole("timer")).toBeVisible();
  for (const name of ["Ajit", "Nirbhay"]) {
    const panel = board.page.getByRole("region", { name });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("$20");
    await expect(panel.getByRole("button")).toHaveCount(0); // the board never bids
  }
  await expect(board.page.getByRole("region", { name: "Host controls" }).getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(board.page.getByRole("region", { name: "Your bid controls" })).toHaveCount(0);
  await expectNoHorizontalOverflow(board.page);
});

test("managers bid from their devices while the board follows", async () => {
  await phone.page.getByRole("region", { name: "Your bid controls" }).getByRole("button", { name: "Open bidding at $1" }).click();
  await expect(board.page.getByRole("region", { name: "Ajit" })).toContainText("Leading");
  await expect(tablet.page.getByRole("region", { name: "Bidding" })).toContainText("Ajit");
});

test("the server closes the lot at its deadline and the next player follows", async () => {
  // No more bids: the 3s timer runs out on the server, which sells the lot to Ajit.
  await expect(board.page.getByRole("group", { name: "Sold" })).toBeVisible({ timeout: 10_000 });
  await expect(phone.page.getByRole("group", { name: "Sold" })).toContainText("Ajit");
  await expect(board.page.getByRole("region", { name: "Ajit" })).toContainText("$19");
  // After the reveal the server draws the next player.
  await expect(board.page.getByText("Lot 2")).toBeVisible({ timeout: 10_000 });
  await expect(phone.page.getByRole("region", { name: "Your squad · 1/6" })).toBeVisible();
});

test("tablet and phone layouts hold up mid-auction", async () => {
  for (const device of [phone, tablet]) {
    await expectNoHorizontalOverflow(device.page);
    await expectOnScreen(device.page, device.page.getByRole("timer"));
    await expectOnScreen(device.page, device.page.getByRole("region", { name: "Your bid controls" }).getByRole("button").first(), MIN_TOUCH_TARGET);
  }
});

test("ending the game needs confirmation and ends it for everyone", async () => {
  const controls = board.page.getByRole("region", { name: "Host controls" });
  // Put a lot on hold with a bid on it, so the end interrupts a lot deterministically.
  // Retried because a 3-second lot may close (or be in its reveal) while we try.
  const nirbhay = board.page.getByRole("region", { name: "Nirbhay" });
  const frozen = board.page.getByText("Bidding is frozen");
  await expect(async () => {
    if (await frozen.isVisible()) return;
    const open = tablet.page.getByRole("region", { name: "Your bid controls" }).getByRole("button", { name: "Open bidding at $1" });
    if ((await open.count()) > 0 && (await open.getAttribute("aria-disabled")) !== "true") await open.click({ timeout: 1_000 });
    await expect(nirbhay).toContainText("Leading", { timeout: 1_000 });
    await controls.getByRole("button", { name: "Pause" }).click({ timeout: 1_000 });
    await expect(frozen).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await expect(nirbhay).toContainText("Leading");

  await controls.getByRole("button", { name: "End game" }).click();
  await expect(board.page.locator("[data-view=board]")).toBeVisible(); // not ended yet
  await controls.getByRole("button", { name: "Confirm end game" }).click();
  for (const device of [board, phone, tablet]) {
    await expect(device.page.getByRole("heading", { level: 1, name: "Auction ended early", exact: true })).toBeVisible();
    await expect(device.page.locator("[data-view=results]")).toHaveAttribute("data-end-reason", "ENDED_EARLY");
    await expect(device.page.getByText("Ended early", { exact: true })).toBeVisible();
  }
});

test("early results show what was bought, the open slots and the interrupted lot", async () => {
  const page = board.page;
  const ajit = teamCard(page, "Ajit");
  await expect(statValue(ajit, "Spent")).toHaveText("$1");
  await expect(statValue(ajit, "Remaining")).toHaveText("$19");
  await expect(statValue(ajit, "Squad")).toHaveText("1/6");
  await expect(ajit).toContainText("Incomplete: 5 open slots");
  const nirbhay = teamCard(page, "Nirbhay");
  await expect(statValue(nirbhay, "Spent")).toHaveText("$0");
  await expect(statValue(nirbhay, "Remaining")).toHaveText("$20");
  await expect(nirbhay).toContainText("Incomplete: 6 open slots");
  await expect(nirbhay).toContainText("No players bought.");
  // The auctioneer doesn't play: no team card and no "your team" for them.
  await expect(page.getByTestId("team-card")).toHaveCount(2);
  await expect(page.getByText("Your team")).toHaveCount(0);

  const history = page.getByRole("region", { name: "Auction history" });
  await expect(history.getByRole("listitem", { name: "Lot 1" })).toContainText("Sold to Ajit for $1");
  const last = history.getByRole("listitem", { name: /^Lot \d+$/ }).last();
  await expect(last).toContainText("Interrupted");
  await expect(last).toContainText("Not awarded");
  await last.getByText("1 bid", { exact: true }).click();
  await expect(last.getByRole("listitem")).toHaveText(["Nirbhay $1"]);
  await expect(statValue(page.getByRole("region", { name: "Auction statistics" }), "Interrupted")).toHaveText("1");
});

test("early results fit the tablet (two columns) and the phone (own team first)", async () => {
  await expectNoHorizontalOverflow(tablet.page);
  const left = await teamCard(tablet.page, "Ajit").boundingBox();
  const right = await teamCard(tablet.page, "Nirbhay").boundingBox();
  expect(left !== null && right !== null && Math.abs(left.y - right.y) < 1 && left.x < right.x, "two columns on a tablet").toBe(true);
  await expect(teamCard(tablet.page, "Nirbhay")).toContainText("Your team");

  await expectNoHorizontalOverflow(phone.page);
  await expect(teamCard(phone.page, "Ajit")).toContainText("Your team");
  const own = await teamCard(phone.page, "Ajit").boundingBox();
  const other = await teamCard(phone.page, "Nirbhay").boundingBox();
  expect(own !== null && other !== null && own.y < other.y, "own team first on a phone").toBe(true);
  await expectOnScreen(phone.page, phone.page.getByRole("button", { name: "Copy results" }), MIN_TOUCH_TARGET);
});
