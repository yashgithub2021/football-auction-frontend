/** Entry points at each viewport: the home page and a room link opened without a session. */
import { expect, test } from "@playwright/test";
import { closeAll, expectNoHorizontalOverflow, expectOnScreen, MIN_TOUCH_TARGET, openDevice, VIEWPORTS, type ViewportName } from "./helpers";

for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
  test(`home page is usable at ${viewport} (${VIEWPORTS[viewport].width}×${VIEWPORTS[viewport].height})`, async ({ browser }) => {
    const device = await openDevice(browser, viewport);
    try {
      await device.page.goto("/");
      await expect(device.page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(device.page.getByTestId("connection-indicator").or(device.page.getByRole("region", { name: "Host a room" }))).toBeVisible();
      await expectNoHorizontalOverflow(device.page);
      const create = device.page.getByRole("button", { name: "Create room" });
      await create.scrollIntoViewIfNeeded();
      await expectOnScreen(device.page, create, MIN_TOUCH_TARGET);
      const join = device.page.getByRole("button", { name: "Join room" });
      await join.scrollIntoViewIfNeeded();
      await expectOnScreen(device.page, join, MIN_TOUCH_TARGET);
    } finally {
      await closeAll([device]);
    }
  });
}

test("a room link without a session shows the join form; a bad link explains itself", async ({ browser }) => {
  const device = await openDevice(browser, "mobile");
  try {
    await device.page.goto("/room/zzzzzzzzzz");
    await expect(device.page.getByRole("region", { name: "Join room zzzzzzzzzz" })).toBeVisible();
    await expectNoHorizontalOverflow(device.page);

    // Joining a room that doesn't exist: the server says so.
    const form = device.page.getByRole("region", { name: "Join room zzzzzzzzzz" });
    await form.getByLabel("Your name").fill("Nobody");
    await form.getByRole("button", { name: "Join" }).click();
    await expect(form.getByRole("alert")).toHaveText(/doesn't exist/);

    await device.page.goto("/room/NOT-A-ROOM");
    await expect(device.page.getByText("invite link isn't valid")).toBeVisible();
  } finally {
    await closeAll([device]);
  }
});

test("keyboard: the home forms work without a mouse and focus is visible", async ({ browser }) => {
  const device = await openDevice(browser, "desktop");
  try {
    await device.page.goto("/");
    const nameInput = device.page.getByRole("region", { name: "Host a room" }).getByLabel("Your name");
    await nameInput.focus();
    await device.page.keyboard.type("Keyboard Host");
    await device.page.keyboard.press("Tab"); // "I'm playing too"
    await device.page.keyboard.press("Tab"); // Create room
    const create = device.page.getByRole("button", { name: "Create room" });
    await expect(create).toBeFocused();
    const outline = await create.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(outline, "visible focus ring").not.toBe("none");
    await device.page.keyboard.press("Enter");
    await device.page.waitForURL(/\/room\/[a-z0-9]{10}$/);
    await expect(device.page.getByRole("region", { name: /In the room/ })).toContainText("Keyboard Host");
  } finally {
    await closeAll([device]);
  }
});
