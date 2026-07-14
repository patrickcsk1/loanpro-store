"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProduct, fetchProducts } from "./api";
import type { ProductQueryParams } from "./types";

export const productKeys = {
  all: ["products"] as const,
  list: (params: ProductQueryParams) => ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["products", "categories"] as const,
    queryFn: async () => {
      const page = await fetchProducts({ page: 1, pageSize: 100, sort: "name", order: "asc" });
      return Array.from(new Set(page.items.map((item) => item.category))).sort((a, b) =>
        a.localeCompare(b),
      );
    },
    staleTime: 60_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => fetchProduct(id as string),
    enabled: Boolean(id),
  });
}
