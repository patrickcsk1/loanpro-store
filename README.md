# LoanPro Store

An enterprise-style e-commerce demo built as a single Next.js 15 application: a product catalog with full CRUD, a messy-CSV importer with a per-row report, search with pagination, and a cart plus fake checkout that decrements stock atomically. It runs end-to-end from one command against a local Postgres, with real migrations and idempotent seeding of the sample dataset.

---

## Quick start (Docker — primary path)

```bash
docker compose up --build
```

Then open **http://localhost:3005**.

That is the whole setup. On boot the app container:

1. Waits for Postgres to become healthy, then applies all Prisma migrations (`prisma migrate deploy`).
2. Seeds the bundled sample CSV (`data/products.csv`) — **96 data rows normalize to 89 products** — with the rest tallied as skipped/invalid in the import report.

Seeding is **idempotent**: it no-ops if products already exist, and the importer upserts on SKU, so restarting the stack never duplicates data.

| Service  | Host port | Container port | Notes                          |
| -------- | --------- | -------------- | ------------------------------ |
| App      | **3005**  | 3000           | Next.js standalone server      |
| Postgres | **5434**  | 5432           | `postgres:16-alpine`, `db_data` volume |

DB credentials in the compose file are `loanpro / loanpro / loanpro` (user / password / database).

---

## Local development (without Docker)

**Prerequisites:** Node 20, npm, and a reachable Postgres.

Spin up a database quickly if you don't have one (this maps to the `.env.example` port `5433`):

```bash
docker run --name loanpro-db -e POSTGRES_USER=loanpro -e POSTGRES_PASSWORD=loanpro \
  -e POSTGRES_DB=loanpro -p 5433:5432 -d postgres:16-alpine
```

Then:

```bash
cp .env.example .env          # DATABASE_URL points at localhost:5433
npm install
npx prisma migrate dev        # create schema + generate client
npm run db:seed               # import data/products.csv (96 rows -> 89 products)
npm run dev                   # Next.js dev server
```

`next dev` listens on **3000** by default. To match the Docker URL, start it with `PORT=3005 npm run dev` and open http://localhost:3005.

Other useful scripts:

```bash
npm test          # vitest run
npm run build     # production build
npm run typecheck # tsc --noEmit
npm run lint      # next lint
```

---

## Tech stack & why

| Choice                         | Why                                                                   |
| ------------------------------ | --------------------------------------------------------------------- |
| **Next.js 15 (App Router)**    | One deployable serving both the API (`route.ts`) and the UI — no separate backend to run for an MVP. |
| **TypeScript (strict)**        | Correctness at the seams; money and validation types are load-bearing. |
| **PostgreSQL + Prisma**        | Enterprise-realistic relational store; Prisma keeps the schema and the DB swappable. |
| **Zod**                        | One schema layer shared by API routes and forms (`productInputSchema`, `checkoutSchema`, …). |
| **Tailwind + shadcn-style UI** | Fast, consistent, themeable components; brand tokens in `globals.css`. |
| **TanStack Query**             | Client-side data fetching, caching, and mutation/invalidation for CRUD + search. |
| **Vitest**                     | Fast unit tests colocated with the pure logic they cover.             |
| **Docker Compose**             | The required "runs as a container" path — app + DB, one command.      |

---

## Sample data & the CSV importer

The sample dataset was **downloaded on 2026-07-12** from the challenge's Google Sheet and committed to the repo at `data/products.csv` (96 data rows). It is deliberately messy, and normalizing it cleanly is the heart of the exercise.

Parsing is split into two pure seams — `parsePriceToCents` / `formatCents` (`src/lib/money.ts`) and `normalizeRow` / `ImportReport` (`src/lib/csv.ts`) — driven by the batch service in `src/server/products/import.ts`.

### How messy input is handled

| Situation                             | Behavior                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `"$29.99"`, `"1,234.50"`, `"12"`      | Cleaned and parsed to integer cents (`2999`, `123450`, `1200`).          |
| `"free"` / `"FREE"`                   | Parsed to `0` cents.                                                      |
| `"12.999"`, `"abc"`, `"-5"`, `""`     | Unparseable price → **row rejected** with a reason.                      |
| Fully blank row                       | **Skipped** (`"Empty row"`).                                             |
| Missing `name` or `sku`               | **Rejected** (`"Missing name"` / `"Missing SKU"`).                       |
| Invalid or negative `stock`           | **Rejected** (must be a non-negative integer).                          |
| Invalid or negative `weight_kg`       | **Rejected** (must be a non-negative number).                           |
| Duplicate SKU **within the file**     | **Last row wins**; earlier ones reported as `"Superseded by later row with same SKU"`. |
| SKU already in the DB                 | **Upsert** — update in place, reported as `updated` rather than `imported`. |

Because every row is upserted on its SKU and the whole batch runs inside one transaction, **re-importing the same file is idempotent** — the second run reports the same products as `updated`, not duplicated. One bad row never aborts the batch: the importer always returns a full `ImportReport` with totals (`imported`, `updated`, `skipped`, `invalid`) and a per-row `details` list.

### Where you see it

The **/import** page accepts a CSV upload (`POST /api/products/import`, multipart field `file`) and renders the returned `ImportReport` — totals plus a per-row table of statuses and rejection reasons — so nothing fails silently.

Observed result on the sample file: **96 rows → 89 products imported**, with the remainder split across skipped (blank/superseded) and invalid (bad price/stock/weight or missing name/SKU) rows.

---

## Key design decisions & alternatives considered

**Money is integer cents — everywhere.** In the DB, the API, and all business logic, prices are `Int` cents (`priceCents`), converted to display strings only at the UI edge via `formatCents`. Floats are unsafe for money (`0.1 + 0.2 !== 0.3`), and a JS `number` can silently accumulate rounding error. I preferred integer minor units over Prisma's `Decimal` because minor units are impossible to accidentally coerce into a float mid-calculation, they map directly to how payment processors model amounts (Stripe uses integer cents), and arithmetic stays in plain integers. `weightKg` intentionally stays a `Float` — it's a physical measurement, not money.

**Upsert-on-SKU import with a per-row report**, rather than blind `insert` (which duplicates on re-run and dies on the first constraint violation) or all-or-nothing (one bad row discards 95 good ones). SKU is the natural business key, so upsert gives idempotent re-imports for free, and the per-row report turns "partial success" into something the user can actually read and act on.

**Transactional checkout with atomic stock decrement.** Checkout runs inside a single Prisma `$transaction`: re-read stock, reject with `INSUFFICIENT_STOCK` if short, decrement, then create the `Order` and `OrderItem`s and compute the total in cents. This closes the oversell race where two concurrent buyers both read the last unit — the atomic decrement makes the second one fail instead of driving stock negative.

**Product deletion preserves order history.** Orders snapshot `nameSnapshot`, `skuSnapshot`, and `unitPriceCents` onto each `OrderItem`, and the `Product` relation uses `onDelete: SetNull`. Deleting a product nulls the reference but leaves historical orders intact and accurate — you can still read exactly what was sold, at what price, after the catalog entry is gone.

**Postgres + Prisma over SQLite.** SQLite would be lighter to run, but Postgres reflects a realistic enterprise deployment (concurrent transactions, a real server). Prisma abstracts the datasource, so the choice stays swappable if requirements change.

**A single Next.js app over a separate backend + SPA.** For an MVP, one deployable is dramatically simpler to run and reason about. Boundaries are still respected internally: routes stay thin (parse → delegate), all business logic lives in `src/server/**` services, and only services touch Prisma — so extracting a standalone API later is mechanical, not a rewrite.

**Fake payment**, as the challenge requires — checkout records a `PAID` order without contacting any real provider.

---

## Architecture

Thin route → service → Prisma, with pure helpers isolated as testable seams.

```
src/
  app/                 # App Router: UI pages + API routes
    page.tsx           #   catalog / search
    products/…         #   create + edit forms
    import/            #   CSV upload + import report UI
    cart/              #   cart + fake checkout
    api/
      products/route.ts          # GET (search), POST (create)
      products/[id]/route.ts     # GET, PATCH, DELETE
      products/import/route.ts   # POST multipart CSV -> ImportReport
      checkout/route.ts          # POST -> { orderId, totalCents }
  server/              # business logic (only layer that touches Prisma)
    products/          #   service.ts, import.ts
    orders/            #   service.ts (transactional checkout)
  lib/                 # pure seams: db, money, csv, validation, api, utils
prisma/                # schema.prisma, migrations, seed.ts
data/products.csv      # sample dataset (downloaded 2026-07-12)
docker/entrypoint.sh   # migrate -> seed -> start
```

Routes parse input with Zod, call a service, and return through the shared helpers in `src/lib/api.ts`. Every response uses one consistent error envelope:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "fields": { } } }
```

### API endpoints

| Method              | Path                        | Purpose                                             |
| ------------------- | --------------------------- | --------------------------------------------------- |
| `GET`               | `/api/products`             | Search + paginate → `{ items, total, page, pageSize }` |
| `POST`              | `/api/products`             | Create a product                                    |
| `GET` `PATCH` `DELETE` | `/api/products/:id`      | Read / update / delete a product                    |
| `POST`              | `/api/products/import`      | Import CSV (multipart `file`) → `ImportReport`       |
| `POST`              | `/api/checkout`             | Fake checkout → `{ orderId, totalCents }`            |

---

## Testing

```bash
npm test    # vitest run
```

**54 tests across 5 files**, colocated with the units they cover. Pure-logic tests run in isolation; service tests run against the Postgres in `DATABASE_URL`, using unique per-run SKUs and cleaning up after themselves so the suite is repeatable and leaves seed data intact.

- **Money seam** (`src/lib/money.test.ts`) — the highest-risk logic: `$`/comma/whitespace cleaning, `free` → `0`, integer-to-cents padding, and rejection of three-decimal, negative, empty, and malformed-grouping (`12,,3`) prices, plus `formatCents` output.
- **CSV normalization** (`src/lib/csv.test.ts`) — every `normalizeRow` outcome: blank rows skipped, missing name/SKU rejected, invalid price/stock/weight rejected, defaults applied, whitespace trimmed.
- **Import** (`src/server/products/import.test.ts`) — new-vs-updated tallying, idempotent re-import (no duplicates), within-file duplicate SKU (last row wins + "Superseded" report), and mixed batches where one bad row never aborts the run.
- **Checkout & concurrency** (`src/server/orders/service.test.ts`) — multi-item integer totals + stock decrement, `InsufficientStockError`/`ProductNotFoundError`, and **two oversell tests**: two concurrent buys of a stock-of-1 product (exactly one succeeds), and 20 concurrent buys against stock-of-5 (exactly 5 succeed, stock never goes negative). This proves the atomic conditional decrement, not just timing.
- **Products & delete regression** (`src/server/products/service.test.ts`) — create/get, duplicate-SKU rejection, case-insensitive search, category filter, pagination, sort, update, and delete-with-existing-order (product removed, `OrderItem` snapshot preserved with `productId` nulled).

---

## Assumptions & scope cuts (intentional MVP boundaries)

These were deliberately excluded to keep the MVP focused; each has an obvious production follow-up.

- **No auth / roles.** Admin CRUD and storefront share one surface. *Production:* authentication + an admin/customer boundary.
- **USD assumed**, inferred from the `$` amounts in the sample CSV. *Production:* a currency field and locale-aware formatting.
- **No real payment provider** — checkout is a fake `PAID` order, as required. *Production:* a Stripe (or similar) integration behind the existing checkout service.
- **No end-to-end / browser tests.** Coverage targets pure logic and services. *Production:* Playwright smoke tests over the core flows.
- **`category` is free-text.** *Production:* a normalized category table with referential integrity.

## A note on AI usage & comments

Per the challenge guidance, AI tooling was used to accelerate delivery. Code comments were intentionally kept out in favor of self-documenting names and small, single-purpose functions — the important "why" lives here in this README, not scattered through the source.
