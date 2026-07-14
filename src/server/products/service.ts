import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ProductInput, ProductUpdate, SearchQuery } from "@/lib/validation";

export class SkuTakenError extends Error {
  constructor(sku: string) {
    super(`A product with SKU "${sku}" already exists`);
    this.name = "SkuTakenError";
  }
}

export async function searchProducts(query: SearchQuery) {
  const filters: Prisma.ProductWhereInput[] = [];

  if (query.q) {
    filters.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { sku: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }

  if (query.category) {
    filters.push({ category: query.category });
  }

  const where: Prisma.ProductWhereInput = filters.length ? { AND: filters } : {};

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function createProduct(input: ProductInput) {
  try {
    return await prisma.product.create({ data: input });
  } catch (error) {
    if (isUniqueViolation(error)) throw new SkuTakenError(input.sku);
    throw error;
  }
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function updateProduct(id: string, input: ProductUpdate) {
  try {
    return await prisma.product.update({ where: { id }, data: input });
  } catch (error) {
    if (isUniqueViolation(error) && input.sku) throw new SkuTakenError(input.sku);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
