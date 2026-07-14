"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ApiError, createProduct, updateProduct } from "@/components/store/api";
import { productKeys } from "@/components/store/queries";
import type { Product, ProductFormValues } from "@/components/store/types";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FieldErrors = Record<string, string[]>;

type ProductFormProps = {
  product?: Product;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
};

type FormState = {
  name: string;
  sku: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  weightKg: string;
};

function initialState(product?: Product): FormState {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    price: product ? (product.priceCents / 100).toFixed(2) : "",
    stock: product ? String(product.stock) : "0",
    weightKg: product ? String(product.weightKg) : "0",
  };
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm font-medium text-destructive">{messages.join(", ")}</p>;
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function OptionalHint() {
  return <span className="text-xs font-normal text-muted-foreground">(optional)</span>;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = Boolean(product);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [state, setState] = React.useState<FormState>(() => initialState(product));
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const nameId = React.useId();

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setState((current) => ({ ...current, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEdit ? updateProduct(product!.id, values) : createProduct(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast({
        variant: "success",
        title: isEdit ? "Product updated" : "Product created",
        description: `${saved.name} was saved successfully.`,
      });
      onSuccess?.(saved);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.fields) setErrors(error.fields);
        toast({ variant: "destructive", title: "Could not save product", description: error.message });
        return;
      }
      toast({ variant: "destructive", title: "Could not save product", description: "Unexpected error." });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const priceCents = dollarsToCents(state.price);
    const stock = Number(state.stock);
    const weightKg = Number(state.weightKg);
    const localErrors: FieldErrors = {};

    if (state.name.trim() === "") localErrors.name = ["Name is required"];
    if (state.sku.trim() === "") localErrors.sku = ["SKU is required"];
    if (priceCents === null) localErrors.priceCents = ["Enter a valid price"];
    if (!Number.isInteger(stock) || stock < 0) localErrors.stock = ["Stock must be a whole number"];
    if (!Number.isFinite(weightKg) || weightKg < 0) localErrors.weightKg = ["Weight must be zero or more"];

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    mutation.mutate({
      name: state.name.trim(),
      sku: state.sku.trim(),
      description: state.description.trim(),
      category: state.category.trim() || "Uncategorized",
      priceCents: priceCents as number,
      stock,
      weightKg,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <p className="text-sm text-muted-foreground">
        Fields marked <RequiredMark /> are required.
      </p>

      <div className="grid gap-2">
        <Label htmlFor={`${nameId}-name`}>
          Name <RequiredMark />
        </Label>
        <Input
          id={`${nameId}-name`}
          value={state.name}
          onChange={set("name")}
          placeholder="Wireless keyboard"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError messages={errors.name} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${nameId}-sku`}>
          SKU <RequiredMark />
        </Label>
        <Input
          id={`${nameId}-sku`}
          value={state.sku}
          onChange={set("sku")}
          placeholder="KB-1001"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.sku)}
        />
        <p className="text-xs text-muted-foreground">Unique identifier. Importing a matching SKU updates that product.</p>
        <FieldError messages={errors.sku} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${nameId}-category`}>
          Category <OptionalHint />
        </Label>
        <Input
          id={`${nameId}-category`}
          value={state.category}
          onChange={set("category")}
          placeholder="Peripherals"
          aria-invalid={Boolean(errors.category)}
        />
        <p className="text-xs text-muted-foreground">Defaults to &ldquo;Uncategorized&rdquo; if left blank.</p>
        <FieldError messages={errors.category} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${nameId}-description`}>
          Description <OptionalHint />
        </Label>
        <Textarea
          id={`${nameId}-description`}
          value={state.description}
          onChange={set("description")}
          placeholder="Short product description"
          aria-invalid={Boolean(errors.description)}
        />
        <FieldError messages={errors.description} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor={`${nameId}-price`}>
            Price (USD) <RequiredMark />
          </Label>
          <Input
            id={`${nameId}-price`}
            value={state.price}
            onChange={set("price")}
            inputMode="decimal"
            placeholder="49.99"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.priceCents)}
          />
          <FieldError messages={errors.priceCents} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${nameId}-stock`}>
            Stock <OptionalHint />
          </Label>
          <Input
            id={`${nameId}-stock`}
            value={state.stock}
            onChange={set("stock")}
            inputMode="numeric"
            placeholder="0"
            aria-invalid={Boolean(errors.stock)}
          />
          <FieldError messages={errors.stock} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${nameId}-weight`}>
            Weight (kg) <OptionalHint />
          </Label>
          <Input
            id={`${nameId}-weight`}
            value={state.weightKg}
            onChange={set("weightKg")}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={Boolean(errors.weightKg)}
          />
          <FieldError messages={errors.weightKg} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
