import type { NextRequest } from "next/server";
import Papa from "papaparse";
import { ok, fail, handleRouteError } from "@/lib/api";
import type { RawCsvRow } from "@/lib/csv";
import { importProductsFromCsv } from "@/server/products/import";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return fail("MISSING_FILE", 'Expected a file field named "file"', 400);
    }

    const text = await file.text();
    const parsed = Papa.parse<RawCsvRow>(text, { header: true, skipEmptyLines: false });

    const report = await importProductsFromCsv(parsed.data);
    return ok(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
