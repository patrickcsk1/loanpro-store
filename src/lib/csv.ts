import { parsePriceToCents } from "@/lib/money";
import type { ProductInput } from "@/lib/validation";

export type RawCsvRow = Record<string, string | undefined>;

export type RowOutcome =
  | { status: "valid"; row: number; sku: string; data: ProductInput }
  | { status: "skipped"; row: number; reason: string }
  | { status: "invalid"; row: number; sku: string; reason: string };

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function isBlankRow(raw: RawCsvRow): boolean {
  return Object.values(raw).every((v) => clean(v) === "");
}

export function normalizeRow(raw: RawCsvRow, rowNumber: number): RowOutcome {
  if (isBlankRow(raw)) {
    return { status: "skipped", row: rowNumber, reason: "Empty row" };
  }

  const name = clean(raw.name);
  const sku = clean(raw.sku);
  const priceRaw = clean(raw.price);

  if (!name) return { status: "invalid", row: rowNumber, sku, reason: "Missing name" };
  if (!sku) return { status: "invalid", row: rowNumber, sku, reason: "Missing SKU" };

  const priceCents = parsePriceToCents(priceRaw);
  if (priceCents === null) {
    return { status: "invalid", row: rowNumber, sku, reason: `Invalid price "${priceRaw}"` };
  }

  const stockRaw = clean(raw.stock);
  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    return { status: "invalid", row: rowNumber, sku, reason: `Invalid stock "${stockRaw}"` };
  }

  const weightRaw = clean(raw.weight_kg);
  const weightKg = weightRaw === "" ? 0 : Number(weightRaw);
  if (Number.isNaN(weightKg) || weightKg < 0) {
    return { status: "invalid", row: rowNumber, sku, reason: `Invalid weight "${weightRaw}"` };
  }

  return {
    status: "valid",
    row: rowNumber,
    sku,
    data: {
      name,
      sku,
      description: clean(raw.description),
      category: clean(raw.category) || "Uncategorized",
      priceCents,
      stock,
      weightKg,
    },
  };
}

export type ImportReport = {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  invalid: number;
  details: Array<{ row: number; sku: string; status: string; reason?: string }>;
};
