import { describe, it, expect } from "vitest";
import App from "./App";
import { render } from "../vitest-browser-solid/pure";

describe("App", () => {
  it("renders dual-pane layout", async () => {
    const screen = render(() => <App />);

    await expect.element(screen.getByText("Left Pane")).toBeVisible();
    await expect.element(screen.getByText("Right Pane")).toBeVisible();
  });

  it("has correct layout structure", async () => {
    const screen = render(() => <App />);

    const leftPane = screen.getByText("Left Pane");
    const rightPane = screen.getByText("Right Pane");

    await expect.element(leftPane).toBeVisible();
    await expect.element(rightPane).toBeVisible();
  });
});
