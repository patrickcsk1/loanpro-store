"use client";

import * as React from "react";
import type { Product } from "@/components/store/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "./product-form";

type ProductFormDialogProps = {
  product?: Product;
  trigger: React.ReactNode;
};

export function ProductFormDialog({ product, trigger }: ProductFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const isEdit = Boolean(product);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the product details below." : "Add a new product to the catalog."}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          product={product}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
