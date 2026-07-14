const CURRENCY = "USD";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: CURRENCY,
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

export function parsePriceToCents(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  if (value === "free") return 0;

  const cleaned = value.replace(/[$\s]/g, "");
  const plain = /^\d+(\.\d{1,2})?$/;
  const grouped = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$/;
  if (!plain.test(cleaned) && !grouped.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.replace(/,/g, "").split(".");
  const paddedFraction = fraction.padEnd(2, "0");
  const cents = Number(whole) * 100 + Number(paddedFraction);
  return Number.isSafeInteger(cents) ? cents : null;
}
