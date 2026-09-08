import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { ProductCard } from "../components/ProductCard";
import { useListParams } from "../hooks/useListParams";
import type { Order, SortField } from "../types";

export function StockPage() {
  const { params, update } = useListParams();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api.categories({ signal }),
    staleTime: 5 * 60_000,
  });
  const products = useQuery({
    queryKey: ["products", params],
    queryFn: ({ signal }) => api.products(params, signal),
    staleTime: 30_000,
  });
  const pages = products.data
    ? Math.max(1, Math.ceil(products.data.total / params.limit))
    : 1;

  return (
    <section aria-labelledby="stock-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 id="stock-title" tabIndex={-1}>
            Stock
          </h1>
        </div>
        {products.data && (
          <p className="result-count">{products.data.total} items</p>
        )}
      </div>

      <form
        className="toolbar"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field field--search">
          <label htmlFor="stock-search">Search stock</label>
          <input
            id="stock-search"
            type="search"
            value={params.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="Search by item name"
          />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={params.category}
            onChange={(event) => update({ category: event.target.value })}
            disabled={categories.isPending}
          >
            <option value="">All categories</option>
            {categories.data?.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={params.sortBy}
            onChange={(event) =>
              update({ sortBy: event.target.value as SortField })
            }
          >
            <option value="title">Name</option>
            <option value="stock">Stock count</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="order">Order</label>
          <select
            id="order"
            value={params.order}
            onChange={(event) => update({ order: event.target.value as Order })}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </form>

      {categories.isError && (
        <ErrorState
          message="Categories could not be loaded."
          onRetry={() => void categories.refetch()}
        />
      )}
      {!categories.isError && products.isPending && <LoadingState />}
      {!categories.isError && products.isError && (
        <ErrorState
          message={products.error.message}
          onRetry={() => void products.refetch()}
        />
      )}
      {products.data && products.data.products.length === 0 && (
        <EmptyState>
          Change or clear the search and category filters.
        </EmptyState>
      )}
      {products.data && products.data.products.length > 0 && (
        <>
          <ul className="product-grid" aria-label="Stock items">
            {products.data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
          <nav className="pagination" aria-label="Stock pages">
            <button
              className="button button--secondary"
              type="button"
              disabled={params.page <= 1}
              onClick={() => update({ page: params.page - 1 }, false)}
            >
              Previous
            </button>
            <p aria-live="polite">
              Page {params.page} of {pages}
            </p>
            <button
              className="button button--secondary"
              type="button"
              disabled={params.page >= pages}
              onClick={() => update({ page: params.page + 1 }, false)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
