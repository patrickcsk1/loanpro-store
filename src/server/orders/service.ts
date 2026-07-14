import { prisma } from "@/lib/db";
import type { CheckoutInput } from "@/lib/validation";

export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly available: number,
    public readonly requested: number,
  ) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = "InsufficientStockError";
  }
}

export class ProductNotFoundError extends Error {
  constructor(public readonly productId: string) {
    super(`Product ${productId} not found`);
    this.name = "ProductNotFoundError";
  }
}

export async function checkout(input: CheckoutInput): Promise<{ orderId: string; totalCents: number }> {
  return prisma.$transaction(async (tx) => {
    let totalCents = 0;
    const lines: Array<{
      productId: string;
      nameSnapshot: string;
      skuSnapshot: string;
      unitPriceCents: number;
      quantity: number;
    }> = [];

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new ProductNotFoundError(item.productId);

      totalCents += product.priceCents * item.quantity;
      lines.push({
        productId: product.id,
        nameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
      });
    }

    for (const line of lines) {
      const decremented = await tx.product.updateMany({
        where: { id: line.productId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (decremented.count === 0) {
        const current = await tx.product.findUnique({ where: { id: line.productId } });
        throw new InsufficientStockError(line.productId, current?.stock ?? 0, line.quantity);
      }
    }

    const order = await tx.order.create({
      data: {
        totalCents,
        status: "PAID",
        items: { create: lines },
      },
    });

    return { orderId: order.id, totalCents };
  });
}
