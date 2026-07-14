import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "LoanPro Store",
  description: "Enterprise e-commerce demo — product catalog, import, and checkout",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
