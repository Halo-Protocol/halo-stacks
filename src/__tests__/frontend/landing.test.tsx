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
    expect(screen.getByText(/Build Credit Through/i)).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
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

  it("mentions Stacks blockchain", () => {
    render(<Hero />);
    expect(screen.getByText(/Built on Stacks/i)).toBeInTheDocument();
  });

  it("describes credit score range", () => {
    render(<Hero />);
    expect(screen.getByText(/300-850/)).toBeInTheDocument();
  });
});

describe("HowItWorks", () => {
  it("renders section title", () => {
    render(<HowItWorks />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders all three steps", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Join a Circle")).toBeInTheDocument();
    expect(screen.getByText("Make Payments")).toBeInTheDocument();
    expect(screen.getByText("Build Credit")).toBeInTheDocument();
  });

  it("describes STX contributions", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/contributes a fixed amount of STX/)).toBeInTheDocument();
  });

  it("mentions sBTC staking", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/staking sBTC/)).toBeInTheDocument();
  });
});

describe("CTASection", () => {
  it("renders CTA with link to sign in", () => {
    render(<CTASection />);
    const link = screen.getByText(/Get Started/i);
    expect(link.closest("a")).toHaveAttribute("href", "/signin");
  });
});
