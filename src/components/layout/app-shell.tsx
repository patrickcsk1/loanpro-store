import type { ReactNode } from "react";
import { CartProvider } from "@/components/store/cart-context";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <Toaster />
    </CartProvider>
  );
}
