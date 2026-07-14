import { prisma } from "@/lib/db";
import { normalizeRow, type ImportReport, type RawCsvRow, type RowOutcome } from "@/lib/csv";
import type { ProductInput } from "@/lib/validation";

const FIRST_DATA_ROW = 2;

type Detail = ImportReport["details"][number];

export async function importProductsFromCsv(rows: RawCsvRow[]): Promise<ImportReport> {
  const outcomes = rows.map((raw, index) => normalizeRow(raw, index + FIRST_DATA_ROW));

  const lastRowForSku = new Map<string, number>();
  for (const outcome of outcomes) {
    if (outcome.status === "valid") lastRowForSku.set(outcome.sku, outcome.row);
  }

  const winners = new Map<string, Extract<RowOutcome, { status: "valid" }>>();
  const details: Detail[] = [];

  for (const outcome of outcomes) {
    if (outcome.status === "skipped") {
      details.push({ row: outcome.row, sku: "", status: "skipped", reason: outcome.reason });
      continue;
    }
    if (outcome.status === "invalid") {
      details.push({ row: outcome.row, sku: outcome.sku, status: "invalid", reason: outcome.reason });
      continue;
    }
    if (lastRowForSku.get(outcome.sku) !== outcome.row) {
      details.push({
        row: outcome.row,
        sku: outcome.sku,
        status: "skipped",
        reason: "Superseded by later row with same SKU",
      });
      continue;
    }
    winners.set(outcome.sku, outcome);
  }

  const winnerSkus = [...winners.keys()];
  const existing = await prisma.product.findMany({
    where: { sku: { in: winnerSkus } },
    select: { sku: true },
  });
  const existingSkus = new Set(existing.map((product) => product.sku));

  await prisma.$transaction(
    [...winners.values()].map((outcome) => upsertProduct(outcome.data)),
  );

  let imported = 0;
  let updated = 0;
  for (const outcome of winners.values()) {
    const wasExisting = existingSkus.has(outcome.sku);
    imported += wasExisting ? 0 : 1;
    updated += wasExisting ? 1 : 0;
    details.push({
      row: outcome.row,
      sku: outcome.sku,
      status: wasExisting ? "updated" : "imported",
    });
  }

  details.sort((a, b) => a.row - b.row);

  return {
    totalRows: rows.length,
    imported,
    updated,
    skipped: details.filter((detail) => detail.status === "skipped").length,
    invalid: details.filter((detail) => detail.status === "invalid").length,
    details,
  };
}

function upsertProduct(data: ProductInput) {
  return prisma.product.upsert({
    where: { sku: data.sku },
    create: data,
    update: data,
  });
}
