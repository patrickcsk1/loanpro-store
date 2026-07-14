import type {
  CheckoutResult,
  ImportReport,
  Product,
  ProductFormValues,
  ProductPage,
  ProductQueryParams,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let code = "UNKNOWN";
  let message = `Request failed (${response.status})`;
  let fields: Record<string, string[]> | undefined;
  try {
    const body = await response.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      fields = body.error.fields;
    }
  } catch {
    void 0;
  }
  return new ApiError(response.status, code, message, fields);
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

export async function fetchProducts(params: ProductQueryParams): Promise<ProductPage> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  search.set("sort", params.sort);
  search.set("order", params.order);
  return request<ProductPage>(`/api/products?${search.toString()}`);
}

export async function fetchProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  return request<Product>("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  return request<Product>(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
  if (!response.ok) throw await parseError(response);
}

export async function importProducts(file: File): Promise<ImportReport> {
  const form = new FormData();
  form.append("file", file);
  return request<ImportReport>("/api/products/import", { method: "POST", body: form });
}

export async function checkout(items: Array<{ productId: string; quantity: number }>): Promise<CheckoutResult> {
  return request<CheckoutResult>("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}
