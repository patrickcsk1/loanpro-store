"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProduct } from "@/components/store/queries";
import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isPending, isError, error, refetch } = useProduct(id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to catalog
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit product</CardTitle>
          <CardDescription>Update the product details below.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message ?? "Couldn't load this product."}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <ProductForm
              product={product}
              onSuccess={() => router.push("/")}
              onCancel={() => router.push("/")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
