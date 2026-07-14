"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Info, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCents } from "@/lib/money";
import { ApiError, checkout, fetchProduct } from "@/components/store/api";
import { useCart } from "@/components/store/cart-context";
import { productKeys } from "@/components/store/queries";
import type { CheckoutResult } from "@/components/store/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        aria-label="Decrease quantity"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
      >
        <Minus className="size-4" />
      </Button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

export function CartView() {
  const { items, totalCents, setQuantity, removeItem, reconcileItem, clear } = useCart();
  const queryClient = useQueryClient();
  const [confirmation, setConfirmation] = React.useState<CheckoutResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [notices, setNotices] = React.useState<string[]>([]);
  const reconciled = React.useRef(false);

  React.useEffect(() => {
    if (reconciled.current || items.length === 0) return;
    reconciled.current = true;
    const snapshot = items;

    void Promise.all(
      snapshot.map(async (item) => {
        try {
          const live = await fetchProduct(item.productId);
          const changes: string[] = [];
          if (live.stock <= 0) {
            reconcileItem(item.productId, null);
            return `${item.name} is out of stock and was removed from your cart.`;
          }
          if (live.priceCents !== item.priceCents) {
            changes.push(`price is now ${formatCents(live.priceCents)}`);
          }
          if (live.stock < item.quantity) {
            changes.push(`quantity reduced to ${live.stock} (only ${live.stock} in stock)`);
          }
          reconcileItem(item.productId, {
            name: live.name,
            sku: live.sku,
            priceCents: live.priceCents,
            stock: live.stock,
          });
          return changes.length ? `${live.name}: ${changes.join(", ")}.` : null;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            reconcileItem(item.productId, null);
            return `${item.name} is no longer available and was removed from your cart.`;
          }
          return null;
        }
      }),
    ).then((results) => {
      const messages = results.filter((message): message is string => Boolean(message));
      if (messages.length) setNotices(messages);
    });
  }, [items, reconcileItem]);

  const mutation = useMutation({
    mutationFn: () =>
      checkout(items.map((item) => ({ productId: item.productId, quantity: item.quantity }))),
    onSuccess: (result) => {
      setConfirmation(result);
      setErrorMessage(null);
      setNotices([]);
      clear();
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === "INSUFFICIENT_STOCK") {
          const productId = error.fields?.productId?.[0];
          const available = error.fields?.available?.[0];
          const affected = items.find((item) => item.productId === productId);
          setErrorMessage(
            affected
              ? `Not enough stock for ${affected.name}. Only ${available ?? "0"} left — reduce the quantity and try again.`
              : error.message,
          );
          return;
        }
        if (error.code === "PRODUCT_NOT_FOUND") {
          const productId = error.fields?.productId?.[0];
          const affected = items.find((item) => item.productId === productId);
          if (affected) reconcileItem(affected.productId, null);
          setErrorMessage(
            affected
              ? `${affected.name} is no longer available and was removed. Please review your cart and try again.`
              : error.message,
          );
          return;
        }
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Checkout failed. Please try again.");
    },
  });

  if (confirmation) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">Order confirmed</h1>
              <p className="text-muted-foreground">Thanks for your purchase — payment simulated.</p>
            </div>
            <div className="w-full space-y-3 rounded-2xl bg-muted/50 p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order ID</span>
                <span className="font-mono text-sm font-semibold">{confirmation.orderId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="text-lg font-extrabold">{formatCents(confirmation.totalCents)}</span>
              </div>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link href="/">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <ShoppingBag className="size-8" />
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">Your cart is empty</h1>
              <p className="text-muted-foreground">Add some products to get started.</p>
            </div>
            <Button asChild size="lg">
              <Link href="/">Browse catalog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your cart</h1>

      {notices.length > 0 ? (
        <div className="mt-6 space-y-2 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Info className="size-4" />
            Your cart was updated to match current availability
          </div>
          <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            {notices.map((notice, index) => (
              <li key={index}>{notice}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.productId}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                  <p className="text-sm text-muted-foreground">{formatCents(item.priceCents)} each</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex flex-col items-center gap-1">
                    <QuantityStepper
                      value={item.quantity}
                      max={item.maxStock}
                      onChange={(next) => setQuantity(item.productId, next)}
                    />
                    {item.quantity >= item.maxStock ? (
                      <span className="text-[11px] text-muted-foreground">Max in stock</span>
                    ) : null}
                  </div>
                  <p className="w-24 text-right font-bold tabular-nums">
                    {formatCents(item.priceCents * item.quantity)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item.productId)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="space-y-5 p-6">
            <h2 className="text-lg font-bold">Order summary</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatCents(totalCents)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-extrabold tabular-nums">{formatCents(totalCents)}</span>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {mutation.isPending ? "Processing…" : "Checkout"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Payment is simulated for this demo.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
