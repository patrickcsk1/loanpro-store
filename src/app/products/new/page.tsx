"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProductPage() {
  const router = useRouter();

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
          <CardTitle className="text-2xl">New product</CardTitle>
          <CardDescription>Add a new product to the catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm onSuccess={() => router.push("/")} onCancel={() => router.push("/")} />
        </CardContent>
      </Card>
    </div>
  );
}
