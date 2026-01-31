import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FaucetCard } from "../../components/dashboard/faucet-card";

vi.mock("../../hooks/use-api", () => ({
  fetchApi: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("FaucetCard", () => {
  it("renders Get Test Tokens button", () => {
    render(<FaucetCard />);
    expect(screen.getByText("Get Test Tokens")).toBeDefined();
  });

  it("shows Test Tokens title", () => {
    render(<FaucetCard />);
    expect(screen.getByText("Test Tokens")).toBeDefined();
  });

  it("shows hUSD and sBTC badge amounts", () => {
    render(<FaucetCard />);
    expect(screen.getByText("1,000 hUSD")).toBeDefined();
    expect(screen.getByText("0.01 sBTC")).toBeDefined();
  });

  it("shows Hiro STX Faucet link", () => {
    render(<FaucetCard />);
    expect(screen.getByText("Hiro STX Faucet")).toBeDefined();
  });

  it("shows description text", () => {
    render(<FaucetCard />);
    expect(
      screen.getByText(/free test tokens for lending circles/),
    ).toBeDefined();
  });
});
