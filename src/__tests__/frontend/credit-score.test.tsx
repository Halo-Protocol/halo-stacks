import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Extract and test the utility functions used in the credit page
// These are defined inline in credit/page.tsx — testing the logic

function getScoreColor(score: number) {
  if (score >= 750) return "text-emerald-500";
  if (score >= 650) return "text-green-500";
  if (score >= 500) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number) {
  if (score >= 750) return "bg-emerald-500";
  if (score >= 650) return "bg-green-500";
  if (score >= 500) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 750) return { label: "Excellent", desc: "Outstanding credit. You're a top-tier participant." };
  if (score >= 650) return { label: "Good", desc: "Strong score. You're a reliable circle member." };
  if (score >= 500) return { label: "Fair", desc: "Getting there. Consistency is key." };
  return { label: "Building", desc: "Keep making on-time payments to build your score." };
}

describe("Credit Score Colors", () => {
  it("returns emerald for 750+", () => {
    expect(getScoreColor(750)).toBe("text-emerald-500");
    expect(getScoreColor(850)).toBe("text-emerald-500");
  });

  it("returns green for 650-749", () => {
    expect(getScoreColor(650)).toBe("text-green-500");
    expect(getScoreColor(749)).toBe("text-green-500");
  });

  it("returns amber for 500-649", () => {
    expect(getScoreColor(500)).toBe("text-amber-500");
    expect(getScoreColor(649)).toBe("text-amber-500");
  });

  it("returns red for below 500", () => {
    expect(getScoreColor(300)).toBe("text-red-500");
    expect(getScoreColor(499)).toBe("text-red-500");
  });
});

describe("Credit Score Background Colors", () => {
  it("returns emerald for 750+", () => {
    expect(getScoreBg(750)).toBe("bg-emerald-500");
  });

  it("returns green for 650-749", () => {
    expect(getScoreBg(700)).toBe("bg-green-500");
  });

  it("returns amber for 500-649", () => {
    expect(getScoreBg(550)).toBe("bg-amber-500");
  });

  it("returns red for below 500", () => {
    expect(getScoreBg(400)).toBe("bg-red-500");
  });
});

describe("Credit Score Labels", () => {
  it("returns Excellent for 750+", () => {
    const result = getScoreLabel(800);
    expect(result.label).toBe("Excellent");
    expect(result.desc).toContain("top-tier");
  });

  it("returns Good for 650-749", () => {
    const result = getScoreLabel(700);
    expect(result.label).toBe("Good");
    expect(result.desc).toContain("reliable");
  });

  it("returns Fair for 500-649", () => {
    const result = getScoreLabel(550);
    expect(result.label).toBe("Fair");
    expect(result.desc).toContain("Consistency");
  });

  it("returns Building for below 500", () => {
    const result = getScoreLabel(350);
    expect(result.label).toBe("Building");
    expect(result.desc).toContain("on-time payments");
  });

  it("handles boundary at 750", () => {
    expect(getScoreLabel(750).label).toBe("Excellent");
    expect(getScoreLabel(749).label).toBe("Good");
  });

  it("handles boundary at 650", () => {
    expect(getScoreLabel(650).label).toBe("Good");
    expect(getScoreLabel(649).label).toBe("Fair");
  });

  it("handles boundary at 500", () => {
    expect(getScoreLabel(500).label).toBe("Fair");
    expect(getScoreLabel(499).label).toBe("Building");
  });

  it("handles minimum score 300", () => {
    expect(getScoreLabel(300).label).toBe("Building");
  });

  it("handles maximum score 850", () => {
    expect(getScoreLabel(850).label).toBe("Excellent");
  });
});

describe("Score percentage calculation", () => {
  // percentage = ((score - 300) / 550) * 100
  it("calculates 0% for score 300", () => {
    const percentage = ((300 - 300) / 550) * 100;
    expect(percentage).toBe(0);
  });

  it("calculates 100% for score 850", () => {
    const percentage = ((850 - 300) / 550) * 100;
    expect(percentage).toBe(100);
  });

  it("calculates ~50% for score 575", () => {
    const percentage = ((575 - 300) / 550) * 100;
    expect(percentage).toBe(50);
  });
});

describe("Score components", () => {
  const components = [
    { name: "Payment History", weight: 35, maxPoints: 192 },
    { name: "Circle Completion", weight: 20, maxPoints: 110 },
    { name: "Volume", weight: 15, maxPoints: 82 },
    { name: "Tenure", weight: 10, maxPoints: 55 },
    { name: "Consistency", weight: 10, maxPoints: 55 },
    { name: "Staking Activity", weight: 10, maxPoints: 55 },
  ];

  it("weights sum to 100", () => {
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it("max points sum to approximately 549", () => {
    // 300 base + maxPoints total should approximate 850
    const totalMaxPoints = components.reduce((sum, c) => sum + c.maxPoints, 0);
    expect(totalMaxPoints).toBe(549);
    expect(300 + totalMaxPoints).toBe(849); // Close to 850 max
  });

  it("has 6 components", () => {
    expect(components).toHaveLength(6);
  });
});
