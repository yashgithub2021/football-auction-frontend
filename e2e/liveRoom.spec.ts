/**
 * A full room played across real browser contexts:
 *   Yash  – host who also plays, desktop 1440×900
 *   Viraj – manager on a phone, 390×844
 *   Vineet – manager on a tablet, 768×1024
 *   Watcher – joins after the start, spectator, desktop
 * against the real backend and a production frontend build.
 */
import { expect, test } from "@playwright/test";
import {
  closeAll,
  createRoom,
  expectLive,
  expectNoHorizontalOverflow,
  expectNotCoveredByBottomBar,
  expectOnScreen,
  joinFromLink,
  MIN_TOUCH_TARGET,
  openDevice,
  participantRow,
  saveSettings,
  smallestFontSize,
  type Device,
} from "./helpers";

test.describe.configure({ mode: "serial" });

let host: Device;
let viraj: Device;
let vineet: Device;
let watcher: Device | null = null;
let roomId = "";

const bidding = (device: Device) => device.page.getByRole("region", { name: "Bidding" });
const dock = (device: Device) => device.page.getByRole("region", { name: "Your bid controls" });

test.beforeAll(async ({ browser }) => {
  host = await openDevice(browser, "desktop");
  viraj = await openDevice(browser, "mobile");
  vineet = await openDevice(browser, "tablet");
});

test.afterAll(async () => {
  await closeAll([host, viraj, vineet, ...(watcher === null ? [] : [watcher])]);
});

test("1. host creates a room and lands in the lobby", async () => {
  roomId = await createRoom(host.page, "Yash", { playing: true });
  await expectLive(host.page);
  await expect(participantRow(host.page, "Yash")).toContainText("Host");
  await expect(host.page.getByRole("button", { name: "Start auction" })).toBeVisible();
});

test("2. friends join from the invite link and everyone sees the same participants", async () => {
  await joinFromLink(viraj.page, roomId, "Viraj");
  await joinFromLink(vineet.page, roomId, "Vineet");
  for (const device of [host, viraj, vineet]) {
    for (const name of ["Yash", "Viraj", "Vineet"]) {
      await expect(participantRow(device.page, name)).toBeVisible();
    }
    await expect(device.page.getByRole("region", { name: /In the room/ }).getByRole("listitem")).toHaveCount(3);
  }
  // Managers can see the rules but not change them, and can't start.
  await expect(viraj.page.getByRole("button", { name: "Save settings" })).toHaveCount(0);
  await expect(viraj.page.getByRole("button", { name: "Start auction" })).toHaveCount(0);
});

test("3. host settings and readiness flow through server snapshots", async () => {
  // A long timer keeps the bid steps below deterministic.
  await saveSettings(host.page, { "Auction timer": "30" });
  await expect(viraj.page.getByRole("region", { name: "Rules" })).toContainText("30s");
  await expect(vineet.page.getByRole("region", { name: "Rules" })).toContainText("30s");

  await expect(host.page.getByRole("list", { name: "Why you can't start yet" })).toContainText("Waiting for");
  await viraj.page.getByRole("button", { name: "I'm ready" }).click();
  await vineet.page.getByRole("button", { name: "I'm ready" }).click();
  for (const name of ["Viraj", "Vineet"]) {
    await expect(participantRow(host.page, name)).toContainText("Ready");
    await expect(participantRow(host.page, name)).not.toContainText("Not ready");
  }
  await expect(host.page.getByRole("list", { name: "Why you can't start yet" })).toHaveCount(0);
});

test("4. lobby works on a phone: no sideways scrolling, action reachable", async () => {
  await expectNoHorizontalOverflow(viraj.page);
  await expectOnScreen(viraj.page, viraj.page.getByRole("button", { name: "I'm not ready" }), MIN_TOUCH_TARGET);
  await expectNotCoveredByBottomBar(viraj.page, viraj.page.getByRole("region", { name: "Rules" }), viraj.page.getByTestId("lobby-actions"));
  await expectNoHorizontalOverflow(vineet.page);
});

test("5. host starts: the server's countdown shows everywhere, then the game", async () => {
  await host.page.getByRole("button", { name: "Start auction" }).click();
  for (const device of [host, viraj, vineet]) {
    await expect(device.page.getByRole("status", { name: /^Starting: (3|2|1|GO)$/ })).toBeVisible();
  }
  for (const device of [host, viraj, vineet]) {
    await expect(device.page.getByRole("article")).toBeVisible({ timeout: 15_000 });
    await expect(device.page.getByRole("status", { name: /^Starting/ })).toHaveCount(0);
  }
  await expect(host.page.locator("[data-view=manager]")).toBeVisible(); // host plays
  await expect(bidding(viraj)).toContainText("No bids");
});

test("6. a phone bid reaches every other browser", async () => {
  await dock(viraj).getByRole("button", { name: "Open bidding at $2" }).click();
  await expect(bidding(viraj)).toContainText("$2");
  await expect(dock(viraj)).toContainText("You're leading at $2");
  for (const device of [host, vineet]) {
    await expect(bidding(device)).toContainText("$2");
    await expect(bidding(device)).toContainText("Viraj");
    await expect(device.page.getByTestId("recent-activity").getByRole("listitem").first()).toContainText("Viraj bid $2");
  }
});

test("7. an illegal bid is rejected by the server and nothing changes", async () => {
  // Viraj already leads, so his buttons are greyed out (aria-disabled) but still
  // tappable; the server refuses a bid against himself and says why. `force`
  // taps it like a person would (Playwright otherwise waits for "enabled").
  const greyed = dock(viraj).getByRole("button", { name: /^Bid \$3/ });
  await expect(greyed).toHaveAttribute("aria-disabled", "true");
  await greyed.click({ force: true });
  await expect(dock(viraj).getByRole("alert")).toHaveText(/already the highest bidder/);
  for (const device of [host, viraj, vineet]) {
    await expect(bidding(device)).toContainText("$2");
    await expect(bidding(device)).not.toContainText("$3");
  }
  // A legal counter-bid from the tablet still works afterwards.
  await dock(vineet).getByRole("button", { name: /^Bid \$3/ }).click();
  await expect(bidding(viraj)).toContainText("$3");
  await expect(bidding(viraj)).toContainText("Vineet");
});

test("8. only the host has host controls; pause and resume reach everyone", async () => {
  for (const device of [viraj, vineet]) {
    await expect(device.page.getByRole("region", { name: "Host controls" })).toHaveCount(0);
    await expect(device.page.getByRole("button", { name: "Pause" })).toHaveCount(0);
  }
  const controls = host.page.getByRole("region", { name: "Host controls" });
  // They are icons in the header, right beside the host's name and "Live".
  const header = host.page.locator("header");
  await expect(header.getByRole("region", { name: "Host controls" })).toBeVisible();
  await expect(header).toContainText("Yash");
  const live = await header.getByTestId("connection-indicator").boundingBox();
  for (const name of ["Pause", "End game"]) {
    const icon = header.getByRole("button", { name, exact: true });
    await expect(icon).toHaveText("");
    await expectOnScreen(host.page, icon, MIN_TOUCH_TARGET);
    const box = await icon.boundingBox();
    expect(live !== null && box !== null && box.x > live.x && Math.abs(box.y + box.height / 2 - (live.y + live.height / 2)) < 12, `${name} beside Live`).toBe(true);
  }
  await expect(host.page.getByRole("heading", { name: "Host controls" })).toHaveCount(0);
  await expect(host.page.getByRole("region", { name: "Remaining players" })).toHaveCount(0); // only while paused
  await controls.getByRole("button", { name: "Pause" }).click();
  for (const device of [viraj, vineet]) await expect(device.page.getByText("Bidding is frozen")).toBeVisible();
  await expect(dock(viraj)).toContainText("paused");
  await controls.getByRole("button", { name: "Resume" }).click();
  for (const device of [viraj, vineet]) await expect(device.page.getByText("Bidding is frozen")).toHaveCount(0);
});

test("8b. while paused, the host's position filter shows everyone the same remaining players", async () => {
  const pool = (device: Device) => device.page.getByRole("region", { name: "Remaining players" });
  const filterButton = (name: string) => pool(host).getByRole("group", { name: "Show players" }).getByRole("button", { name, exact: true });
  /** Position badges of the listed players. */
  const positions = (device: Device) => pool(device).getByRole("listitem").locator("span:first-child").allTextContents();
  const controls = host.page.getByRole("region", { name: "Host controls" });

  await controls.getByRole("button", { name: "Pause" }).click();
  for (const device of [host, viraj, vineet]) await expect(pool(device)).toBeVisible();
  await expect(filterButton("All")).toHaveAttribute("aria-pressed", "true");
  const allCount = await pool(viraj).getByRole("listitem").count();
  expect(allCount).toBeGreaterThan(20);
  // Managers see the filter but get no controls for it.
  for (const device of [viraj, vineet]) {
    await expect(pool(device).getByRole("button")).toHaveCount(0);
    await expect(pool(device)).toContainText("Chosen by the host");
  }

  await filterButton("GK").click();
  await expect(filterButton("GK")).toHaveAttribute("aria-pressed", "true");
  for (const device of [host, viraj, vineet]) {
    await expect.poll(async () => [...new Set(await positions(device))]).toEqual(["GK"]);
  }
  const goalkeepers = await pool(host).getByRole("listitem").allTextContents();
  expect(await pool(viraj).getByRole("listitem").allTextContents()).toEqual(goalkeepers);
  expect(goalkeepers.length).toBeLessThan(allCount);
  // Nothing about the lot changed.
  for (const device of [host, viraj, vineet]) await expect(bidding(device)).toContainText("$3");

  // The filter survives resume and the next pause; then back to All.
  await controls.getByRole("button", { name: "Resume" }).click();
  for (const device of [host, viraj]) await expect(pool(device)).toHaveCount(0);
  await controls.getByRole("button", { name: "Pause" }).click();
  await expect(filterButton("GK")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => [...new Set(await positions(vineet))]).toEqual(["GK"]);
  await filterButton("All").click();
  await expect.poll(() => pool(viraj).getByRole("listitem").count()).toBe(allCount);
  await controls.getByRole("button", { name: "Resume" }).click();
  for (const device of [viraj, vineet]) await expect(device.page.getByText("Bidding is frozen")).toHaveCount(0);
});

test("9. the phone manager view fits the screen, with bid controls always reachable", async () => {
  const page = viraj.page;
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  for (const button of await dock(viraj).getByRole("button").all()) {
    await expectOnScreen(page, button, MIN_TOUCH_TARGET);
  }
  await expectOnScreen(page, page.getByRole("heading", { level: 2, name: /.+/ }).first());
  await expectOnScreen(page, page.getByRole("timer"));
  await expectOnScreen(page, bidding(viraj).getByText("$3"));
  // Scrolled all the way down, the pinned dock still leaves the last sections readable.
  await expectNotCoveredByBottomBar(page, page.getByTestId("other-managers"), page.getByTestId("bid-dock"));
  await expectNotCoveredByBottomBar(page, page.getByTestId("recent-activity"), page.getByTestId("bid-dock"));
  await expectOnScreen(page, dock(viraj).getByRole("button").first(), MIN_TOUCH_TARGET);
  expect(await smallestFontSize(page.locator("main"))).toBeGreaterThanOrEqual(11);

  for (const device of [vineet, host]) {
    await expectNoHorizontalOverflow(device.page);
    await expectOnScreen(device.page, device.page.getByRole("timer"));
    await expectOnScreen(device.page, dock(device).getByRole("button").first(), MIN_TOUCH_TARGET);
  }
});

test("10. a spectator joining late gets the board and no bidding controls", async ({ browser }) => {
  watcher = await openDevice(browser, "desktop");
  await watcher.page.goto(`/room/${roomId}`);
  const form = watcher.page.getByRole("region", { name: `Join room ${roomId}` });
  await form.getByLabel("Your name").fill("Watcher");
  await form.getByRole("button", { name: "Join" }).click();

  await expect(watcher.page.locator("[data-view=board]")).toBeVisible();
  await expect(watcher.page.getByText("You're watching")).toBeVisible();
  await expect(watcher.page.getByRole("article")).toBeVisible();
  await expect(watcher.page.getByRole("region", { name: "Bidding" })).toContainText("$3");
  await expect(watcher.page.getByRole("region", { name: "Your bid controls" })).toHaveCount(0);
  await expect(watcher.page.getByRole("button", { name: /^(Bid|Open bidding)/ })).toHaveCount(0);
  await expect(watcher.page.getByRole("region", { name: "Host controls" })).toHaveCount(0);
  for (const name of ["Yash", "Viraj", "Vineet"]) await expect(watcher.page.getByRole("region", { name })).toBeVisible();
  await expectNoHorizontalOverflow(watcher.page);
});

test("11. closing and reopening a browser keeps the identity, and the game never pauses", async () => {
  await vineet.page.close();
  // Others see Vineet offline; the auction keeps running.
  await expect(viraj.page.getByTestId("other-managers").getByRole("listitem", { name: "Vineet" })).toContainText("Offline");
  await expect(viraj.page.getByText("Bidding is frozen")).toHaveCount(0);
  await dock(viraj).getByRole("button", { name: /^Bid \$4/ }).click();
  await expect(bidding(host)).toContainText("$4");

  // Reopen the same profile: the stored session resumes; no join form, same person.
  vineet.page = await vineet.context.newPage();
  await vineet.page.goto(`/room/${roomId}`);
  await expect(vineet.page.getByRole("region", { name: "Your bid controls" })).toBeVisible();
  await expect(vineet.page.getByRole("region", { name: /Join room/ })).toHaveCount(0);
  await expect(vineet.page.locator("header")).toContainText("Vineet");
  await expectLive(vineet.page);
  await expect(bidding(vineet)).toContainText("$4");
  await expect(viraj.page.getByTestId("other-managers").getByRole("listitem", { name: "Vineet" })).not.toContainText("Offline");
  // Still exactly three managers on the board: reconnecting didn't create anyone new.
  if (watcher === null) throw new Error("spectator from step 10 is missing");
  await expect(watcher.page.getByRole("region", { name: "Managers" }).getByRole("heading", { level: 3 })).toHaveCount(3);
});

test("12. a page reload also resumes the same participant", async () => {
  await viraj.page.reload();
  await expect(dock(viraj)).toBeVisible();
  await expect(viraj.page.locator("header")).toContainText("Viraj");
  await expect(bidding(viraj)).toContainText("Viraj (you)");
});
