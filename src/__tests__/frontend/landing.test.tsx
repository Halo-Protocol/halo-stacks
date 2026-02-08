import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../../components/landing/hero";
import { HowItWorks } from "../../components/landing/how-it-works";
import { CTASection } from "../../components/landing/cta-section";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Hero", () => {
  it("renders headline text", () => {
    render(<Hero />);
    expect(screen.getByText("Build Credit")).toBeInTheDocument();
    expect(screen.getByText("Through Community")).toBeInTheDocument();
  });

  it("renders Get Started button linking to /signin", () => {
    render(<Hero />);
    const link = screen.getByText("Get Started");
    expect(link.closest("a")).toHaveAttribute("href", "/signin");
  });

  it("renders Learn More button linking to #how-it-works", () => {
    render(<Hero />);
    const link = screen.getByText("Learn More");
    expect(link.closest("a")).toHaveAttribute("href", "#how-it-works");
  });

  it("mentions Stacks testnet", () => {
    render(<Hero />);
    expect(screen.getByText(/Stacks Testnet/i)).toBeInTheDocument();
  });

  it("displays credit score range and stats", () => {
    render(<Hero />);
    expect(screen.getByText("300-850")).toBeInTheDocument();
    expect(screen.getByText("3-10")).toBeInTheDocument();
    expect(screen.getByText("10-500")).toBeInTheDocument();
  });
});

describe("HowItWorks", () => {
  it("renders section title", () => {
    render(<HowItWorks />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders all four steps", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Sign Up & Verify")).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    expect(screen.getByText("Join or Create a Circle")).toBeInTheDocument();
    expect(screen.getByText("Contribute & Build Credit")).toBeInTheDocument();
  });

  it("renders step numbers", () => {
    render(<HowItWorks />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });

  it("renders Start Building Credit CTA", () => {
    render(<HowItWorks />);
    const link = screen.getByText("Start Building Credit");
    expect(link.closest("a")).toHaveAttribute("href", "/signin");
  });
});

describe("CTASection", () => {
  it("renders CTA with link to sign in", () => {
    render(<CTASection />);
    const link = screen.getByText(/Get Started Free/i);
    expect(link.closest("a")).toHaveAttribute("href", "/signin");
  });
});
