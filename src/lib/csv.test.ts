import { describe, expect, it } from "vitest";
import { normalizeRow, type RawCsvRow } from "@/lib/csv";

function row(overrides: RawCsvRow = {}): RawCsvRow {
  return {
    name: "Widget",
    sku: "SKU-1",
    price: "$29.99",
    stock: "5",
    weight_kg: "1.5",
    category: "Tools",
    description: "A widget",
    ...overrides,
  };
}

describe("normalizeRow", () => {
  it("skips a fully blank row", () => {
    const outcome = normalizeRow(
      { name: "", sku: "", price: "", stock: "", weight_kg: "", category: "", description: "" },
      2,
    );
    expect(outcome.status).toBe("skipped");
    if (outcome.status === "skipped") {
      expect(outcome.reason).toBe("Empty row");
    }
  });

  it("skips a row of all-undefined fields", () => {
    const outcome = normalizeRow({ name: undefined, sku: undefined }, 7);
    expect(outcome).toEqual({ status: "skipped", row: 7, reason: "Empty row" });
  });

  it("marks missing name invalid with a reason mentioning name", () => {
    const outcome = normalizeRow(row({ name: "" }), 3);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("name");
    }
  });

  it("marks missing sku invalid with a reason mentioning SKU", () => {
    const outcome = normalizeRow(row({ sku: "" }), 4);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("sku");
    }
  });

  it.each(["$abc", "12.999"])("marks unparseable price %j invalid", (price) => {
    const outcome = normalizeRow(row({ price }), 5);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("price");
    }
  });

  it("accepts a valid row and converts price to cents", () => {
    const outcome = normalizeRow(row({ price: "$29.99" }), 6);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.priceCents).toBe(2999);
    }
  });

  it("treats 'free' price as valid with priceCents 0", () => {
    const outcome = normalizeRow(row({ price: "free" }), 8);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.priceCents).toBe(0);
    }
  });

  it("defaults empty stock to 0", () => {
    const outcome = normalizeRow(row({ stock: "" }), 9);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.stock).toBe(0);
    }
  });

  it("rejects negative stock", () => {
    const outcome = normalizeRow(row({ stock: "-3" }), 10);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("stock");
    }
  });

  it("rejects non-integer stock", () => {
    const outcome = normalizeRow(row({ stock: "2.5" }), 11);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("stock");
    }
  });

  it("defaults empty weight to 0", () => {
    const outcome = normalizeRow(row({ weight_kg: "" }), 12);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.weightKg).toBe(0);
    }
  });

  it("preserves a valid decimal weight", () => {
    const outcome = normalizeRow(row({ weight_kg: "2.75" }), 13);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.weightKg).toBe(2.75);
    }
  });

  it("rejects negative weight", () => {
    const outcome = normalizeRow(row({ weight_kg: "-1" }), 14);
    expect(outcome.status).toBe("invalid");
    if (outcome.status === "invalid") {
      expect(outcome.reason.toLowerCase()).toContain("weight");
    }
  });

  it("defaults empty category to 'Uncategorized'", () => {
    const outcome = normalizeRow(row({ category: "" }), 15);
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.category).toBe("Uncategorized");
    }
  });

  it("trims whitespace on all fields", () => {
    const outcome = normalizeRow(
      {
        name: "  Padded Widget  ",
        sku: "  SKU-2  ",
        price: "  $10.00  ",
        stock: "  4  ",
        weight_kg: "  1.25  ",
        category: "  Gadgets  ",
        description: "  desc  ",
      },
      16,
    );
    expect(outcome.status).toBe("valid");
    if (outcome.status === "valid") {
      expect(outcome.data.name).toBe("Padded Widget");
      expect(outcome.data.sku).toBe("SKU-2");
      expect(outcome.data.priceCents).toBe(1000);
      expect(outcome.data.stock).toBe(4);
      expect(outcome.data.weightKg).toBe(1.25);
      expect(outcome.data.category).toBe("Gadgets");
      expect(outcome.data.description).toBe("desc");
    }
  });

  it("echoes the rowNumber back in the outcome", () => {
    expect(normalizeRow(row(), 42).row).toBe(42);
    expect(normalizeRow(row({ name: "" }), 99).row).toBe(99);
    expect(normalizeRow({ name: "", sku: "" }, 123).row).toBe(123);
  });
});
