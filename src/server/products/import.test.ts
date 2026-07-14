import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { importProductsFromCsv } from "@/server/products/import";
import type { RawCsvRow } from "@/lib/csv";

function token(): string {
  return `IMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const prefixes: string[] = [];

function prefix(): string {
  const p = token();
  prefixes.push(p);
  return p;
}

function makeRow(overrides: RawCsvRow = {}): RawCsvRow {
  return {
    name: "Imported Widget",
    sku: "SKU",
    price: "$10.00",
    stock: "3",
    weight_kg: "1",
    category: "Tools",
    description: "desc",
    ...overrides,
  };
}

afterEach(async () => {
  while (prefixes.length) {
    const p = prefixes.pop()!;
    await prisma.product.deleteMany({ where: { sku: { startsWith: p } } });
  }
});

describe("importProductsFromCsv", () => {
  it("imports new rows and stores correct integer cents", async () => {
    const p = prefix();
    const rows = [
      makeRow({ sku: `${p}-A`, price: "$29.99" }),
      makeRow({ sku: `${p}-B`, price: "free" }),
    ];

    const report = await importProductsFromCsv(rows);

    expect(report.imported).toBe(2);
    expect(report.updated).toBe(0);
    expect(report.totalRows).toBe(2);

    const a = await prisma.product.findUnique({ where: { sku: `${p}-A` } });
    const b = await prisma.product.findUnique({ where: { sku: `${p}-B` } });
    expect(a?.priceCents).toBe(2999);
    expect(b?.priceCents).toBe(0);
  });

  it("is idempotent on re-run: updates rather than imports, no duplicates", async () => {
    const p = prefix();
    const rows = [makeRow({ sku: `${p}-A` }), makeRow({ sku: `${p}-B` })];

    const first = await importProductsFromCsv(rows);
    expect(first.imported).toBe(2);

    const second = await importProductsFromCsv(rows);
    expect(second.imported).toBe(0);
    expect(second.updated).toBe(2);

    const count = await prisma.product.count({ where: { sku: { startsWith: p } } });
    expect(count).toBe(2);
  });

  it("applies last-row-wins for within-file duplicate SKUs and reports the earlier as superseded", async () => {
    const p = prefix();
    const sku = `${p}-DUP`;
    const rows = [
      makeRow({ sku, price: "$10.00" }),
      makeRow({ sku, price: "$25.00" }),
    ];

    const report = await importProductsFromCsv(rows);

    expect(report.imported).toBe(1);

    const product = await prisma.product.findUnique({ where: { sku } });
    expect(product?.priceCents).toBe(2500);

    const superseded = report.details.find((d) => d.status === "skipped" && d.sku === sku);
    expect(superseded).toBeDefined();
    expect(superseded?.reason?.toLowerCase()).toContain("supersed");
  });

  it("processes a mixed batch without one bad row aborting the rest", async () => {
    const p = prefix();
    const rows: RawCsvRow[] = [
      makeRow({ sku: `${p}-OK`, price: "$5.00" }),
      { name: "", sku: "", price: "", stock: "", weight_kg: "", category: "", description: "" },
      makeRow({ sku: `${p}-NONAME`, name: "" }),
      makeRow({ sku: `${p}-BADPRICE`, price: "$abc" }),
    ];

    const report = await importProductsFromCsv(rows);

    expect(report.totalRows).toBe(4);
    expect(report.imported).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.invalid).toBe(2);

    const ok = await prisma.product.findUnique({ where: { sku: `${p}-OK` } });
    expect(ok?.priceCents).toBe(500);
    const noname = await prisma.product.findUnique({ where: { sku: `${p}-NONAME` } });
    expect(noname).toBeNull();
  });

  it("updates an existing product's fields on re-import", async () => {
    const p = prefix();
    const sku = `${p}-UPD`;

    await importProductsFromCsv([
      makeRow({ sku, name: "Before", price: "$10.00", stock: "3", category: "Tools" }),
    ]);

    const report = await importProductsFromCsv([
      makeRow({ sku, name: "After", price: "$99.00", stock: "7", category: "Gadgets" }),
    ]);

    expect(report.updated).toBe(1);
    const product = await prisma.product.findUnique({ where: { sku } });
    expect(product?.name).toBe("After");
    expect(product?.priceCents).toBe(9900);
    expect(product?.stock).toBe(7);
    expect(product?.category).toBe("Gadgets");
  });
});
