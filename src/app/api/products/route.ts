import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { productInputSchema, searchQuerySchema } from "@/lib/validation";
import { createProduct, searchProducts, SkuTakenError } from "@/server/products/service";

export async function GET(request: NextRequest) {
  try {
    const query = searchQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await searchProducts(query);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = productInputSchema.parse(await request.json());
    const product = await createProduct(input);
    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof SkuTakenError) return fail("SKU_TAKEN", error.message, 409);
    return handleRouteError(error);
  }
}
