import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("lets the player change difficulty", () => {
    render(<App />);
    const select = screen.getByLabelText("Difficulty") as HTMLSelectElement;
    expect(select.value).toBe("medium");
    fireEvent.change(select, { target: { value: "hard" } });
    expect(select.value).toBe("hard");
  });
});
