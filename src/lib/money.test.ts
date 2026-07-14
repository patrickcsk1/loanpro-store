import { describe, expect, it } from "vitest";
import { formatCents, parsePriceToCents } from "@/lib/money";

describe("parsePriceToCents", () => {
  it.each([
    ["29.99", 2999],
    ["$29.99", 2999],
    ["free", 0],
    ["FREE", 0],
    ["1,234.50", 123450],
    ["12", 1200],
    ["12.5", 1250],
    ["0", 0],
    ["  10  ", 1000],
  ])("parses %j to %i cents", (input, expected) => {
    expect(parsePriceToCents(input)).toBe(expected);
  });

  it.each([
    ["empty string", ""],
    ["abc", "abc"],
    ["three decimals", "12.999"],
    ["negative", "-5"],
    ["lone dollar sign", "$"],
    ["multiple dots", "1.2.3"],
  ])("returns null for %s", (_label, input) => {
    expect(parsePriceToCents(input)).toBeNull();
  });

  it("rejects malformed comma grouping like '12,,3'", () => {
    expect(parsePriceToCents("12,,3")).toBeNull();
    expect(parsePriceToCents("1,23")).toBeNull();
  });
});

describe("formatCents", () => {
  it.each([
    [2999, "$29.99"],
    [0, "$0.00"],
    [100000, "$1,000.00"],
  ])("formats %i cents as %j", (input, expected) => {
    expect(formatCents(input)).toBe(expected);
  });
});
