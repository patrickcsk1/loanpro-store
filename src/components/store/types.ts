export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  weightKg: number;
  createdAt: string;
};

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductFormValues = {
  name: string;
  sku: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  weightKg: number;
};

export type ImportReportDetail = {
  row: number;
  sku: string;
  status: string;
  reason?: string;
};

export type ImportReport = {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  invalid: number;
  details: ImportReportDetail[];
};

export type CheckoutResult = {
  orderId: string;
  totalCents: number;
};

export type ProductSort = "name" | "priceCents" | "stock" | "createdAt";
export type SortOrder = "asc" | "desc";

export type ProductQueryParams = {
  q?: string;
  category?: string;
  page: number;
  pageSize: number;
  sort: ProductSort;
  order: SortOrder;
};
