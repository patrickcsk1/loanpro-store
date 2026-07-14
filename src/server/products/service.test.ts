import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createProduct,
  deleteProduct,
  getProduct,
  searchProducts,
  SkuTakenError,
  updateProduct,
} from "@/server/products/service";
import { checkout } from "@/server/orders/service";
import type { ProductInput } from "@/lib/validation";

function token(): string {
  return `PS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Service Widget",
    sku: `${token()}-SKU`,
    description: "",
    category: "Tools",
    priceCents: 1000,
    stock: 5,
    weightKg: 1,
    ...overrides,
  };
}

async function track<T extends { id: string }>(p: Promise<T>): Promise<T> {
  const product = await p;
  createdProductIds.push(product.id);
  return product;
}

afterEach(async () => {
  if (createdOrderIds.length) {
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds.splice(0) } } });
  }
  if (createdProductIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds.splice(0) } } });
  }
});

describe("createProduct / getProduct", () => {
  it("creates a product and retrieves it by id", async () => {
    const created = await track(createProduct(input({ name: "Fetch Me" })));
    const fetched = await getProduct(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe("Fetch Me");
  });

  it("throws SkuTakenError on duplicate SKU", async () => {
    const sku = `${token()}-DUP`;
    await track(createProduct(input({ sku })));
    await expect(createProduct(input({ sku }))).rejects.toBeInstanceOf(SkuTakenError);
  });
});

describe("searchProducts", () => {
  it("matches q against name, sku, and description case-insensitively", async () => {
    const tag = token();
    const a = await track(createProduct(input({ name: `Alpha ${tag}`, category: tag })));
    const b = await track(createProduct(input({ sku: `${tag}-SKUMATCH`, category: tag })));
    const c = await track(
      createProduct(input({ description: `contains ${tag} inside`, category: tag })),
    );

    const byName = await searchProducts({
      q: `alpha ${tag}`.toUpperCase(),
      page: 1,
      pageSize: 12,
      sort: "createdAt",
      order: "desc",
    });
    expect(byName.items.map((i) => i.id)).toContain(a.id);

    const bySku = await searchProducts({
      q: `${tag}-skumatch`,
      page: 1,
      pageSize: 12,
      sort: "createdAt",
      order: "desc",
    });
    expect(bySku.items.map((i) => i.id)).toContain(b.id);

    const byDesc = await searchProducts({
      q: `${tag} INSIDE`,
      page: 1,
      pageSize: 12,
      sort: "createdAt",
      order: "desc",
    });
    expect(byDesc.items.map((i) => i.id)).toContain(c.id);
  });

  it("filters by category", async () => {
    const cat = token();
    const inCat = await track(createProduct(input({ category: cat })));
    await track(createProduct(input({ category: `${cat}-OTHER` })));

    const result = await searchProducts({
      category: cat,
      page: 1,
      pageSize: 12,
      sort: "createdAt",
      order: "desc",
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(inCat.id);
  });

  it("paginates with a correct total across pages", async () => {
    const cat = token();
    for (let i = 0; i < 5; i++) {
      await track(createProduct(input({ category: cat, name: `Item ${i}` })));
    }

    const page1 = await searchProducts({
      category: cat,
      page: 1,
      pageSize: 2,
      sort: "createdAt",
      order: "desc",
    });
    const page2 = await searchProducts({
      category: cat,
      page: 2,
      pageSize: 2,
      sort: "createdAt",
      order: "desc",
    });
    const page3 = await searchProducts({
      category: cat,
      page: 3,
      pageSize: 2,
      sort: "createdAt",
      order: "desc",
    });

    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page3.items).toHaveLength(1);

    const ids = new Set([...page1.items, ...page2.items, ...page3.items].map((i) => i.id));
    expect(ids.size).toBe(5);
  });

  it("respects sort order", async () => {
    const cat = token();
    await track(createProduct(input({ category: cat, priceCents: 300 })));
    await track(createProduct(input({ category: cat, priceCents: 100 })));
    await track(createProduct(input({ category: cat, priceCents: 200 })));

    const asc = await searchProducts({
      category: cat,
      page: 1,
      pageSize: 12,
      sort: "priceCents",
      order: "asc",
    });
    const prices = asc.items.map((i) => i.priceCents);
    expect(prices).toEqual([100, 200, 300]);
  });
});

describe("updateProduct", () => {
  it("changes fields", async () => {
    const created = await track(createProduct(input({ name: "Old", priceCents: 100 })));
    const updated = await updateProduct(created.id, { name: "New", priceCents: 555 });
    expect(updated.name).toBe("New");
    expect(updated.priceCents).toBe(555);
  });
});

describe("deleteProduct with existing order (regression)", () => {
  it("deletes the product while preserving the OrderItem snapshot with null productId", async () => {
    const created = await track(createProduct(input({ name: "Ordered", stock: 5, priceCents: 1200 })));

    const order = await checkout({ items: [{ productId: created.id, quantity: 2 }] });
    createdOrderIds.push(order.orderId);

    await deleteProduct(created.id);

    const gone = await getProduct(created.id);
    expect(gone).toBeNull();

    const items = await prisma.orderItem.findMany({ where: { orderId: order.orderId } });
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBeNull();
    expect(items[0].skuSnapshot).not.toBe("");
    expect(items[0].skuSnapshot).not.toBeNull();
    expect(items[0].nameSnapshot).toBe("Ordered");
    expect(items[0].unitPriceCents).toBe(1200);
  });
});
