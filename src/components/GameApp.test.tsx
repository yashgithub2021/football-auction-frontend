// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { GameApp } from "./GameApp";

afterEach(() => {
  cleanup();
});

describe("GameApp", () => {
  it("moves from setup to the READY screen and back without losing the configuration", async () => {
    const user = userEvent.setup();
    render(<GameApp />);

    await user.type(screen.getByLabelText("Manager 1"), "Yash");
    await user.type(screen.getByLabelText("Manager 2"), "Viraj");
    await user.clear(screen.getByLabelText("Starting budget"));
    await user.type(screen.getByLabelText("Starting budget"), "30");
    await user.click(screen.getByRole("button", { name: "Start game" }));

    const readyHeading = screen.getByRole("heading", { level: 1, name: "Ready for kick-off" });
    expect(document.activeElement).toBe(readyHeading);
    expect(screen.getByText("Yash")).toBeTruthy();
    expect(screen.getByText("Viraj")).toBeTruthy();
    expect(screen.getByText("$30")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit setup" }));

    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Set up your auction" }));
    expect((screen.getByLabelText("Manager 1") as HTMLInputElement).value).toBe("Yash");
    expect((screen.getByLabelText("Manager 2") as HTMLInputElement).value).toBe("Viraj");
    expect((screen.getByLabelText("Starting budget") as HTMLInputElement).value).toBe("30");

    // Focus moved to the heading once; typing afterwards must keep focus in the field.
    const name = screen.getByLabelText("Manager 1") as HTMLInputElement;
    await user.type(name, "!");
    expect(document.activeElement).toBe(name);
    expect(name.value).toBe("Yash!");
  });
});
