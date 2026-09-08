import { useSearchParams } from "react-router-dom";
import type { ListParams, Order, SortField } from "../types";

const sortFields = new Set<SortField>(["title", "price", "rating", "stock"]);

export function parseListParams(search: URLSearchParams): ListParams {
  const requestedSort = search.get("sort") as SortField | null;
  const requestedOrder = search.get("order") as Order | null;
  const parsedPage = Number(search.get("page") ?? "1");
  return {
    q: search.get("q") ?? "",
    category: search.get("category") ?? "",
    sortBy:
      requestedSort && sortFields.has(requestedSort) ? requestedSort : "title",
    order: requestedOrder === "desc" ? "desc" : "asc",
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit: 12,
  };
}

export function useListParams() {
  const [search, setSearch] = useSearchParams();
  const params = parseListParams(search);

  const update = (changes: Partial<ListParams>, resetPage = true) => {
    const next = new URLSearchParams(search);
    const mapped: Record<string, string | number | undefined> = {
      q: changes.q,
      category: changes.category,
      sort: changes.sortBy,
      order: changes.order,
      page: changes.page,
    };
    Object.entries(mapped).forEach(([key, value]) => {
      if (value === undefined) return;
      if (value === "" || (key === "page" && value === 1)) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage && changes.page === undefined) next.delete("page");
    setSearch(next, { replace: true });
  };

  return { params, update };
}
