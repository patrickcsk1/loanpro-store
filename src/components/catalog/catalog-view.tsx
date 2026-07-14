"use client";

import * as React from "react";
import { AlertCircle, ChevronLeft, ChevronRight, PackageSearch, Plus, Search } from "lucide-react";
import { useCategories, useProducts } from "@/components/store/queries";
import type { ProductSort, SortOrder } from "@/components/store/types";
import { ProductCard } from "@/components/products/product-card";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 12;
const ALL_CATEGORIES = "__all__";

const SORT_OPTIONS: Array<{ value: string; label: string; sort: ProductSort; order: SortOrder }> = [
  { value: "createdAt:desc", label: "Newest first", sort: "createdAt", order: "desc" },
  { value: "createdAt:asc", label: "Oldest first", sort: "createdAt", order: "asc" },
  { value: "name:asc", label: "Name A–Z", sort: "name", order: "asc" },
  { value: "name:desc", label: "Name Z–A", sort: "name", order: "desc" },
  { value: "priceCents:asc", label: "Price: low to high", sort: "priceCents", order: "asc" },
  { value: "priceCents:desc", label: "Price: high to low", sort: "priceCents", order: "desc" },
  { value: "stock:desc", label: "Stock: high to low", sort: "stock", order: "desc" },
];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CatalogView() {
  const [searchInput, setSearchInput] = React.useState("");
  const [category, setCategory] = React.useState(ALL_CATEGORIES);
  const [sortValue, setSortValue] = React.useState(SORT_OPTIONS[0].value);
  const [page, setPage] = React.useState(1);

  const q = useDebounced(searchInput, 300);
  const selectedSort = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];

  React.useEffect(() => {
    setPage(1);
  }, [q, category, sortValue]);

  const categoriesQuery = useCategories();
  const productsQuery = useProducts({
    q: q || undefined,
    category: category === ALL_CATEGORIES ? undefined : category,
    page,
    pageSize: PAGE_SIZE,
    sort: selectedSort.sort,
    order: selectedSort.order,
  });

  const data = productsQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Product catalog</h1>
          <p className="text-muted-foreground">Browse, manage, and add products to your cart.</p>
        </div>
        <ProductFormDialog
          trigger={
            <Button size="lg">
              <Plus className="size-4" />
              New product
            </Button>
          }
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, SKU, or description"
            className="pl-11"
            aria-label="Search products"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {(categoriesQuery.data ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortValue} onValueChange={setSortValue}>
          <SelectTrigger className="sm:w-52" aria-label="Sort products">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8">
        {productsQuery.isPending ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-11 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : productsQuery.isError ? (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-7" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-bold">Couldn&apos;t load products</h2>
                <p className="text-sm text-muted-foreground">
                  {(productsQuery.error as Error)?.message ?? "Something went wrong."}
                </p>
              </div>
              <Button variant="outline" onClick={() => productsQuery.refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : data && data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <PackageSearch className="size-7" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-bold">No products found</h2>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters, or add a new product.
                </p>
              </div>
              <ProductFormDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    New product
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {data && data.items.length > 0 ? (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {totalPages} · {data.total} product{data.total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={data.page <= 1 || productsQuery.isFetching}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={data.page >= totalPages || productsQuery.isFetching}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
