import type {
  BulkCorrectionResponse,
  Category,
  ListParams,
  Product,
  ProductPage,
  StockCorrection,
  User,
} from "./types";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const loginExpiryMinutes = 1;
let refreshRequest: Promise<void> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

function cookie(name: string): string {
  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
}

async function raw<T>(
  path: string,
  init: RequestInit = {},
  canRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const csrf = cookie("csrftoken");
  if (csrf) headers.set("X-CSRFToken", csrf);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && canRefresh && !path.startsWith("/auth/")) {
    refreshRequest ??= raw<{ ok: boolean }>(
      "/auth/refresh",
      { method: "POST" },
      false,
    ).then(() => undefined);
    try {
      await refreshRequest;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        window.dispatchEvent(new Event("clinic-auth-expired"));
      }
      throw reason;
    } finally {
      refreshRequest = null;
    }
    return raw<T>(path, init, false);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      body?.error?.message ?? "The request could not be completed",
      response.status,
      body?.error?.code ?? "request_failed",
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  csrf: () => raw<{ csrfToken: string }>("/auth/csrf"),
  login: (username: string, password: string) =>
    raw<User>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          expiresInMins: loginExpiryMinutes,
        }),
      },
      false,
    ),
  me: ({ signal }: { signal?: AbortSignal } = {}) =>
    raw<User>("/auth/me", { signal }),
  logout: () => raw<void>("/auth/logout", { method: "POST" }, false),
  categories: ({ signal }: { signal?: AbortSignal } = {}) =>
    raw<Category[]>("/categories", { signal }),
  products: (params: ListParams, signal?: AbortSignal) => {
    const query = new URLSearchParams({
      q: params.q,
      category: params.category,
      sortBy: params.sortBy,
      order: params.order,
      page: String(params.page),
      limit: String(params.limit),
    });
    return raw<ProductPage>(`/products?${query}`, { signal });
  },
  product: (id: string, signal?: AbortSignal) =>
    raw<Product>(`/products/${id}`, { signal }),
  updateStock: (id: number, stock: number) =>
    raw<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify({ stock }),
    }),
  bulkCorrections: (corrections: StockCorrection[]) =>
    raw<BulkCorrectionResponse>("/products/bulk-corrections", {
      method: "POST",
      body: JSON.stringify({ corrections }),
    }),
};
