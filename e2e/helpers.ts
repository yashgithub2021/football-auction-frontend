import { expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/** Smallest acceptable height for primary touch controls (px). */
export const MIN_TOUCH_TARGET = 44;

export interface Device {
  context: BrowserContext;
  page: Page;
  viewport: ViewportName;
}

/** A separate browser profile (own localStorage), like a separate phone or laptop. */
export async function openDevice(browser: Browser, viewport: ViewportName, { permissions = [] }: { permissions?: string[] } = {}): Promise<Device> {
  const mobile = viewport === "mobile";
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    isMobile: mobile,
    hasTouch: mobile || viewport === "tablet",
    deviceScaleFactor: mobile ? 3 : 1,
    permissions,
  });
  const page = await context.newPage();
  return { context, page, viewport };
}

export async function expectLive(page: Page): Promise<void> {
  await expect(page.getByTestId("connection-indicator")).toHaveText("Live");
}

/** Creates a room from the home page and returns its id (from the URL the app navigates to). */
export async function createRoom(page: Page, name: string, { playing }: { playing: boolean }): Promise<string> {
  await page.goto("/");
  const host = page.getByRole("region", { name: "Host a room" });
  await host.getByLabel("Your name").fill(name);
  const playingBox = host.getByLabel("I'm playing too");
  if ((await playingBox.isChecked()) !== playing) await playingBox.click();
  await host.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/room\/[a-z0-9]{10}$/);
  await expect(page.getByRole("region", { name: /In the room/ })).toBeVisible();
  const roomId = new URL(page.url()).pathname.split("/").pop();
  if (roomId === undefined) throw new Error("no room id in URL");
  return roomId;
}

/** Opens the invite link and joins with a name, as a friend would. */
export async function joinFromLink(page: Page, roomId: string, name: string): Promise<void> {
  await page.goto(`/room/${roomId}`);
  const form = page.getByRole("region", { name: `Join room ${roomId}` });
  await form.getByLabel("Your name").fill(name);
  await form.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("region", { name: /In the room/ })).toBeVisible();
}

export function participantRow(page: Page, name: string): Locator {
  return page.getByRole("region", { name: /In the room/ }).getByRole("listitem", { name });
}

/** Host saves new settings through the lobby form. Values are what the host types. */
export async function saveSettings(page: Page, values: Partial<Record<"Starting budget" | "Team size" | "Auction timer", string>>): Promise<void> {
  for (const [label, value] of Object.entries(values)) {
    const input = page.getByLabel(label, { exact: true });
    await input.fill(value);
  }
  await page.getByRole("button", { name: "Save settings" }).click();
}

/** The page is never wider than the viewport (no sideways scrolling). */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "horizontal overflow").toBeLessThanOrEqual(clientWidth);
}

/** Fully on screen horizontally, inside the viewport vertically, and at least `minHeight` tall. */
export async function expectOnScreen(page: Page, locator: Locator, minHeight = 0): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "has a box").not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) return;
  expect(box.x, "clipped on the left").toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, "clipped on the right").toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y, "above the viewport").toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, "below the viewport").toBeLessThanOrEqual(viewport.height + 0.5);
  expect(box.height, "too small to tap").toBeGreaterThanOrEqual(minHeight);
}

/** Smallest computed font size among visible text in the element (px). */
export async function smallestFontSize(locator: Locator): Promise<number> {
  return locator.evaluate((root) => {
    let smallest = Number.POSITIVE_INFINITY;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const element = node.parentElement;
      if (element === null || node.textContent?.trim() === "") continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || element.closest(".sr-only") !== null) continue;
      smallest = Math.min(smallest, parseFloat(style.fontSize));
    }
    return smallest;
  });
}

/**
 * After scrolling to the very bottom, the last piece of content ends above the
 * fixed bottom bar, so the bar never hides anything permanently.
 */
export async function expectNotCoveredByBottomBar(page: Page, content: Locator, bar: Locator): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const contentBox = await content.boundingBox();
  const barBox = await bar.boundingBox();
  expect(contentBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  if (contentBox === null || barBox === null) return;
  expect(contentBox.y + contentBox.height, "content hidden behind the bottom bar").toBeLessThanOrEqual(barBox.y + 1);
}

export async function closeAll(devices: readonly Device[]): Promise<void> {
  await Promise.all(devices.map((device) => device.context.close()));
}

/** A team card on the results screen, by manager name. */
export function teamCard(page: Page, name: string): Locator {
  return page.getByTestId("team-card").filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });
}

/** The value next to a label in a results definition list (e.g. "Spent" → "$3"). */
export function statValue(scope: Locator, label: string): Locator {
  return scope.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");
}
