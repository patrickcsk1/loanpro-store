"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Store, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { href: "/", label: "Catalog", icon: Store },
  { href: "/import", label: "Import", icon: Upload },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span className="text-lg">
            Loan<span className="text-primary">Pro</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                isActive(href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}

          <Link
            href="/cart"
            aria-label={`Cart with ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              isActive("/cart") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <ShoppingCart className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 ? (
              <Badge className="absolute -right-1 -top-1 min-w-5 justify-center px-1.5 py-0 text-[11px] leading-5">
                {itemCount}
              </Badge>
            ) : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
