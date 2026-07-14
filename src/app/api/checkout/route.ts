import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { checkoutSchema } from "@/lib/validation";
import { checkout, InsufficientStockError, ProductNotFoundError } from "@/server/orders/service";

export async function POST(request: NextRequest) {
  try {
    const input = checkoutSchema.parse(await request.json());
    const result = await checkout(input);
    return ok(result);
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return fail("INSUFFICIENT_STOCK", error.message, 409, {
        productId: [error.productId],
        available: [String(error.available)],
        requested: [String(error.requested)],
      });
    }
    if (error instanceof ProductNotFoundError) {
      return fail("PRODUCT_NOT_FOUND", error.message, 404, { productId: [error.productId] });
    }
    return handleRouteError(error);
  }
}
