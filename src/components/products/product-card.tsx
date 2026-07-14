"use client";

import * as React from "react";
import { Check, Minus, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import type { Product } from "@/components/store/types";
import { useCart } from "@/components/store/cart-context";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ProductFormDialog } from "./product-form-dialog";
import { DeleteProductDialog } from "./delete-product-dialog";

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 5) return <Badge variant="warning">Low stock · {stock}</Badge>;
  return <Badge variant="success">In stock · {stock}</Badge>;
}

function QuantityStepper({
  value,
  min,
  max,
  onChange,
  label,
  maxTitle,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  maxTitle?: string;
}) {
  return (
    <div className="flex items-center rounded-full border border-border bg-background" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
        title={value >= max ? maxTitle : undefined}
        className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, setQuantity, reconcileItem } = useCart();
  const { toast } = useToast();
  const outOfStock = product.stock <= 0;
  const inCart = items.find((entry) => entry.productId === product.id);
  const isInCart = Boolean(inCart);
  const [pendingQty, setPendingQty] = React.useState(1);

  React.useEffect(() => {
    if (!isInCart) return;
    reconcileItem(product.id, {
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      stock: product.stock,
    });
  }, [isInCart, product.id, product.name, product.sku, product.priceCents, product.stock, reconcileItem]);

  const handleAdd = () => {
    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        priceCents: product.priceCents,
        maxStock: product.stock,
      },
      pendingQty,
    );
    toast({
      title: "Added to cart",
      description: `${pendingQty} × ${product.name} added.`,
    });
    setPendingQty(1);
  };

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden transition-shadow hover:shadow-md",
        inCart && "ring-2 ring-primary/40",
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {product.sku}
            </Badge>
            <Badge variant="outline">{product.category}</Badge>
            {inCart ? (
              <Badge variant="success" className="gap-1">
                <Check className="size-3" />
                In cart · {inCart.quantity}
              </Badge>
            ) : null}
          </div>
          <StockBadge stock={product.stock} />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight">{product.name}</h3>
          {product.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="text-2xl font-extrabold tracking-tight text-foreground">
            {formatCents(product.priceCents)}
          </p>
          <p className="text-sm text-muted-foreground">{product.weightKg} kg</p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-border bg-muted/40 p-4">
        {outOfStock ? (
          <Button className="w-full" disabled>
            Out of stock
          </Button>
        ) : inCart ? (
          <div className="flex h-11 w-full items-center justify-between gap-2 rounded-full bg-primary/10 px-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Check className="size-4" />
              In cart
            </span>
            <QuantityStepper
              value={inCart.quantity}
              min={0}
              max={product.stock}
              onChange={(next) => setQuantity(product.id, next)}
              label={`Quantity of ${product.name} in cart`}
              maxTitle={`Only ${product.stock} in stock`}
            />
          </div>
        ) : (
          <div className="flex w-full items-center gap-2">
            <QuantityStepper
              value={pendingQty}
              min={1}
              max={product.stock}
              onChange={setPendingQty}
              label={`Quantity to add for ${product.name}`}
              maxTitle={`Only ${product.stock} in stock`}
            />
            <Button className="flex-1" onClick={handleAdd}>
              <ShoppingCart className="size-4" />
              Add to cart
            </Button>
          </div>
        )}
        <div className="flex w-full gap-2">
          <ProductFormDialog
            product={product}
            trigger={
              <Button variant="outline" size="sm" className="flex-1">
                <Pencil className="size-4" />
                Edit
              </Button>
            }
          />
          <DeleteProductDialog
            product={product}
            trigger={
              <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" />
                Delete
              </Button>
            }
          />
        </div>
      </CardFooter>
    </Card>
  );
}

export function AddProductCard() {
  return (
    <ProductFormDialog
      trigger={
        <button
          type="button"
          className="flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-muted/30 p-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="size-6" />
          </span>
          <span className="text-sm font-semibold">New product</span>
        </button>
      }
    />
  );
}
