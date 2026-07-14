import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { productUpdateSchema } from "@/lib/validation";
import { deleteProduct, getProduct, updateProduct, SkuTakenError } from "@/server/products/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) return fail("NOT_FOUND", "Product not found", 404);
    return ok(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const input = productUpdateSchema.parse(await request.json());
    const product = await updateProduct(id, input);
    return ok(product);
  } catch (error) {
    if (error instanceof SkuTakenError) return fail("SKU_TAKEN", error.message, 409);
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deleteProduct(id);
    return ok({ id }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
