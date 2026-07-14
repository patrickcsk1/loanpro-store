"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ApiError, deleteProduct } from "@/components/store/api";
import { productKeys } from "@/components/store/queries";
import type { Product } from "@/components/store/types";
import { useCart } from "@/components/store/cart-context";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteProductDialogProps = {
  product: Product;
  trigger: React.ReactNode;
};

export function DeleteProductDialog({ product, trigger }: DeleteProductDialogProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { removeItem } = useCart();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: () => {
      removeItem(product.id);
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast({ variant: "success", title: "Product deleted", description: `${product.name} was removed.` });
      setOpen(false);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Unexpected error.";
      toast({ variant: "destructive", title: "Could not delete product", description: message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete product</DialogTitle>
          <DialogDescription>
            Delete <span className="font-semibold text-foreground">{product.name}</span>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
