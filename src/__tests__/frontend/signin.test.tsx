import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SignInPage from "../../app/signin/page";

// Mock next-auth/react
const mockSignIn = vi.fn();
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => mockUseSession(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockPush.mockReset();
  });

  it("renders sign-in card when unauthenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    expect(screen.getByText("Welcome to Halo")).toBeInTheDocument();
  });

  it("renders Google sign-in button", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("renders GitHub sign-in button", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
  });

  it("calls signIn with google when Google button is clicked", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    fireEvent.click(screen.getByText("Continue with Google"));
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/signin" });
  });

  it("calls signIn with github when GitHub button is clicked", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    fireEvent.click(screen.getByText("Continue with GitHub"));
    expect(mockSignIn).toHaveBeenCalledWith("github", { callbackUrl: "/signin" });
  });

  it("shows loading state when session is loading", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    render(<SignInPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows redirecting when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { status: "active" } },
      status: "authenticated",
    });
    render(<SignInPage />);
    expect(screen.getByText("Redirecting...")).toBeInTheDocument();
  });

  it("mentions credit score in description", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<SignInPage />);
    expect(screen.getByText(/on-chain credit score/)).toBeInTheDocument();
  });
});
