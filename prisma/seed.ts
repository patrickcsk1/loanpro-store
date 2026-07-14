import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { importProductsFromCsv } from "@/server/products/import";
import type { RawCsvRow } from "@/lib/csv";

async function main() {
  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`Seed skipped: ${count} products already present.`);
    return;
  }

  const csvPath = join(process.cwd(), "data", "products.csv");
  const file = readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<RawCsvRow>(file, { header: true, skipEmptyLines: false });

  const report = await importProductsFromCsv(parsed.data);
  console.log(
    `Seed complete: ${report.imported} imported, ${report.updated} updated, ` +
      `${report.skipped} skipped, ${report.invalid} invalid.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
