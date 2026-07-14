"use client";

import * as React from "react";

export type CartItem = {
  productId: string;
  name: string;
  sku: string;
  priceCents: number;
  quantity: number;
  maxStock: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "loanpro.cart.v1";

const CartContext = React.createContext<CartContextValue | null>(null);

function clampQuantity(quantity: number, maxStock: number): number {
  const upper = maxStock > 0 ? maxStock : 0;
  return Math.max(0, Math.min(quantity, upper));
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.productId === "string" &&
        typeof item.priceCents === "number" &&
        typeof item.quantity === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = React.useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId);
      if (existing) {
        return current.map((entry) =>
          entry.productId === item.productId
            ? {
                ...entry,
                ...item,
                quantity: clampQuantity(entry.quantity + quantity, item.maxStock),
              }
            : entry,
        );
      }
      const nextQuantity = clampQuantity(quantity, item.maxStock);
      if (nextQuantity < 1) return current;
      return [...current, { ...item, quantity: nextQuantity }];
    });
  }, []);

  const setQuantity = React.useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((entry) =>
          entry.productId === productId
            ? { ...entry, quantity: clampQuantity(quantity, entry.maxStock) }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems((current) => current.filter((entry) => entry.productId !== productId));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCents = items.reduce((sum, entry) => sum + entry.priceCents * entry.quantity, 0);

  const value = React.useMemo<CartContextValue>(
    () => ({ items, itemCount, totalCents, addItem, setQuantity, removeItem, clear }),
    [items, itemCount, totalCents, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
