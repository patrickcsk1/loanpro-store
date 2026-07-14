# Build Conventions (locked — do not change without Tech Lead)

## Stack
Next.js 15 App Router · TypeScript strict · Prisma + Postgres · Tailwind + shadcn/ui · TanStack Query · Zod · Vitest.

## Import alias
`@/*` → `src/*`.

## Money (CRITICAL)
- Money is **integer cents** everywhere in DB, API, and business logic. Never a float, never a JS number with decimals.
- Convert to/from display strings ONLY at the UI edge via `formatCents` (src/lib/money.ts).
- Parse raw price text with `parsePriceToCents` — never `parseFloat`.
- `weightKg` is a Float — it is a measurement, not money.

## Locked seams (already written — build on these, don't duplicate)
- `src/lib/db.ts` — `prisma` client singleton.
- `src/lib/money.ts` — `formatCents`, `parsePriceToCents`.
- `src/lib/csv.ts` — `normalizeRow` (per-row parse/validate/normalize), `RowOutcome`, `ImportReport`.
- `src/lib/validation.ts` — Zod: `productInputSchema`, `productUpdateSchema`, `searchQuerySchema`, `checkoutSchema`.
- `src/lib/api.ts` — `ok`, `fail`, `handleRouteError` (consistent error envelope).
- `src/lib/utils.ts` — `cn`.

## API contract
- Routes live in `src/app/api/**/route.ts`, kept thin: parse with Zod → call service in `src/server/**` → return via `ok`/`fail`.
- Error envelope: `{ error: { code, message, fields? } }`. Always use helpers in `src/lib/api.ts`.
- Endpoints:
  - `GET /api/products` — search/paginate (searchQuerySchema) → `{ items, total, page, pageSize }`
  - `POST /api/products` — create (productInputSchema)
  - `GET|PATCH|DELETE /api/products/:id`
  - `POST /api/products/import` — multipart file "file" → `ImportReport`
  - `POST /api/checkout` — checkoutSchema → `{ orderId, totalCents }`

## Import rules (graded core)
- Skip fully-blank rows. Reject rows missing name/sku or with unparseable price/stock/weight (report reason).
- **Within-file duplicate SKU: last row wins**; earlier ones reported as overwritten in the same batch.
- **Upsert on SKU** (create if new, update if exists) → idempotent re-runs. Report imported vs updated.
- Whole import runs so one bad row never aborts the batch; always return an `ImportReport`.

## Checkout rules
- Single Prisma `$transaction`: re-read stock, reject if insufficient (code `INSUFFICIENT_STOCK`), decrement atomically, create Order + OrderItems (snapshot name/sku/price), compute total in cents.

## Brand / design system (match loanpro.io)
- Font: **Manrope** (wired via next/font as `--font-manrope`, Tailwind `font-sans`).
- Primary indigo `#5233ed` (`--primary`), deep navy text `#171768`/near-black, accent blue `#348bff`, coral/destructive `#ff4c4c`, light blue surfaces `#f5f8ff`.
- Aesthetic: modern fintech SaaS — generous whitespace, **very rounded corners** (`--radius: 1rem`, pill-shaped buttons), soft shadows, clean cards. Theme tokens already set in `globals.css`; use `bg-primary`, `text-foreground`, `bg-muted`, etc. — never hardcode hex.
- Dark mode tokens exist; keep components theme-aware.

## Code style
- **No comments explaining what code does.** Self-documenting names. (Challenge requires AI comments removed.)
- Server-only logic in `src/server/**`; React components in `src/components/**`; pages in `src/app/**`.
- Prefer small pure functions; colocate Vitest specs as `*.test.ts` next to the unit.
