import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { checkout, InsufficientStockError, ProductNotFoundError } from "@/server/orders/service";
import type { ProductInput } from "@/lib/validation";

function token(): string {
  return `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function makeProduct(overrides: Partial<ProductInput> = {}) {
  const sku = overrides.sku ?? `${token()}-SKU`;
  const product = await prisma.product.create({
    data: {
      name: "Checkout Widget",
      sku,
      description: "",
      category: "Tools",
      priceCents: 1500,
      stock: 10,
      weightKg: 1,
      ...overrides,
    },
  });
  createdProductIds.push(product.id);
  return product;
}

async function runCheckout(items: Array<{ productId: string; quantity: number }>) {
  const result = await checkout({ items });
  createdOrderIds.push(result.orderId);
  return result;
}

afterEach(async () => {
  if (createdOrderIds.length) {
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds.splice(0) } } });
  }
  if (createdProductIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds.splice(0) } } });
  }
});

describe("checkout", () => {
  it("decrements stock and returns the correct integer total for a multi-item order", async () => {
    const a = await makeProduct({ priceCents: 1500, stock: 10 });
    const b = await makeProduct({ priceCents: 250, stock: 10 });

    const result = await runCheckout([
      { productId: a.id, quantity: 2 },
      { productId: b.id, quantity: 3 },
    ]);

    expect(result.totalCents).toBe(1500 * 2 + 250 * 3);
    expect(Number.isInteger(result.totalCents)).toBe(true);

    const aAfter = await prisma.product.findUnique({ where: { id: a.id } });
    const bAfter = await prisma.product.findUnique({ where: { id: b.id } });
    expect(aAfter?.stock).toBe(8);
    expect(bAfter?.stock).toBe(7);
  });

  it("throws InsufficientStockError and leaves stock unchanged when stock is too low", async () => {
    const product = await makeProduct({ stock: 1 });

    await expect(runCheckout([{ productId: product.id, quantity: 5 }])).rejects.toBeInstanceOf(
      InsufficientStockError,
    );

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stock).toBe(1);
  });

  it("throws ProductNotFoundError for an unknown productId", async () => {
    await expect(
      runCheckout([{ productId: "does-not-exist-id", quantity: 1 }]),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("is atomic under concurrency: never oversells a stock-of-1 product", async () => {
    const product = await makeProduct({ stock: 1 });

    const results = await Promise.allSettled([
      checkout({ items: [{ productId: product.id, quantity: 1 }] }),
      checkout({ items: [{ productId: product.id, quantity: 1 }] }),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled") createdOrderIds.push(r.value.orderId);
    }

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stock).toBe(0);
    expect(after?.stock).toBeGreaterThanOrEqual(0);
  });

  it("is atomic under heavy contention: 20 concurrent buys against stock of 5 sell exactly 5", async () => {
    const product = await makeProduct({ stock: 5 });

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => checkout({ items: [{ productId: product.id, quantity: 1 }] })),
    );

    for (const r of results) {
      if (r.status === "fulfilled") createdOrderIds.push(r.value.orderId);
    }

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(5);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(InsufficientStockError);
    }

    const after = await prisma.product.findUnique({ where: { id: product.id } });
    expect(after?.stock).toBe(0);
    expect(after?.stock).toBeGreaterThanOrEqual(0);
  });
});
