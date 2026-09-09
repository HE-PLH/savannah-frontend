import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { ProductCard } from "../components/ProductCard";
import { useListParams } from "../hooks/useListParams";
import type {
  BulkCorrectionResponse,
  Order,
  Product,
  SortField,
  StockCorrection,
} from "../types";

type VirtualizedProductGridProps = {
  products: Product[];
  bulkMode: boolean;
  selected: Set<number>;
  onToggle: (productId: number) => void;
  resetKey: string;
};

function VirtualizedProductGrid({
  products,
  bulkMode,
  selected,
  onToggle,
  resetKey,
}: VirtualizedProductGridProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(() =>
    window.innerWidth >= 1040 ? 4 : window.innerWidth >= 760 ? 3 : 1,
  );
  const rowCount = Math.ceil(products.length / columns);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => viewport.current,
    estimateSize: () => 325,
    overscan: 2,
    initialRect: { width: 1000, height: 680 },
  });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const updateColumns = () => {
      const width = element.clientWidth || window.innerWidth;
      setColumns(width >= 1040 ? 4 : width >= 760 ? 3 : width >= 500 ? 2 : 1);
    };
    updateColumns();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateColumns);
      return () => window.removeEventListener("resize", updateColumns);
    }
    const observer = new ResizeObserver(updateColumns);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [resetKey]);

  const measuredRows = virtualizer.getVirtualItems();
  const renderedRows =
    measuredRows.length > 0
      ? measuredRows
      : [{ key: "initial", index: 0, start: 0 }];

  return (
    <div
      ref={viewport}
      className="virtual-product-grid"
      role="list"
      aria-label="Stock items"
    >
      <div
        className="virtual-product-grid__canvas"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {renderedRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="virtual-product-grid__row"
            role="presentation"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {products
              .slice(
                virtualRow.index * columns,
                (virtualRow.index + 1) * columns,
              )
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selection={
                    bulkMode
                      ? {
                          selected: selected.has(product.id),
                          onToggle: () => onToggle(product.id),
                        }
                      : undefined
                  }
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulkCorrectionPanel({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [result, setResult] = useState<BulkCorrectionResponse | null>(null);
  const correction = useMutation({
    mutationFn: (corrections: StockCorrection[]) =>
      api.bulkCorrections(corrections),
    onSuccess: async (response) => {
      setResult(response);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  useEffect(() => {
    setDrafts((current) =>
      Object.fromEntries(
        products.map((product) => [
          product.id,
          current[product.id] ?? String(product.stock),
        ]),
      ),
    );
    setResult(null);
  }, [products]);

  const values = products.map((product) => Number(drafts[product.id]));
  const valid =
    products.length > 0 &&
    values.every(
      (stock) => Number.isInteger(stock) && stock >= 0 && stock <= 1_000_000,
    );

  return (
    <section className="bulk-panel" aria-labelledby="bulk-title">
      <div className="bulk-panel__heading">
        <div>
          <p className="eyebrow">Batch update</p>
          <h2 id="bulk-title">Bulk stock correction</h2>
          <p>Select items below, then confirm each physical count here.</p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={onClose}
        >
          Close bulk mode
        </button>
      </div>
      {products.length === 0 ? (
        <p className="bulk-panel__empty">No items selected yet.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setResult(null);
            if (!valid) return;
            correction.mutate(
              products.map((product) => ({
                productId: product.id,
                stock: Number(drafts[product.id]),
              })),
            );
          }}
        >
          <div className="bulk-panel__items">
            {products.map((product) => {
              const stock = Number(drafts[product.id]);
              const stockValid =
                Number.isInteger(stock) && stock >= 0 && stock <= 1_000_000;
              const itemResult = result?.results.find(
                (entry) => entry.productId === product.id,
              );
              return (
                <div className="bulk-item" key={product.id}>
                  <label htmlFor={`bulk-stock-${product.id}`}>
                    {product.title}
                  </label>
                  <input
                    id={`bulk-stock-${product.id}`}
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={drafts[product.id] ?? ""}
                    aria-invalid={!stockValid}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
                    }
                  />
                  {itemResult && (
                    <span
                      className={`bulk-item__result bulk-item__result--${itemResult.status}`}
                    >
                      {itemResult.status === "success"
                        ? "Saved"
                        : itemResult.error?.message}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {correction.isError && (
            <p className="form-error" role="alert">
              {correction.error.message} Check your connection and try again.
            </p>
          )}
          {result && (
            <p className="form-status" role="status">
              Saved {result.summary.succeeded} of {result.summary.total}{" "}
              corrections.
              {result.summary.failed > 0 &&
                " Review failed items and try again."}
            </p>
          )}
          <button
            className="button"
            type="submit"
            disabled={!valid || correction.isPending}
          >
            {correction.isPending
              ? `Saving ${products.length} items…`
              : `Save ${products.length} corrections`}
          </button>
        </form>
      )}
    </section>
  );
}

export function StockPage() {
  const { params, update } = useListParams();
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api.categories({ signal }),
    staleTime: 5 * 60_000,
  });
  const products = useQuery({
    queryKey: [
      "products",
      params.q,
      params.category,
      params.sortBy,
      params.order,
    ],
    queryFn: ({ signal }) =>
      api.products({ ...params, page: 1, limit: 200 }, signal),
    staleTime: 30_000,
  });
  const visibleIds = products.data?.products.map((product) => product.id);

  useEffect(() => {
    if (!visibleIds) return;
    const available = new Set(visibleIds);
    setSelected((current) => {
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleIds]);

  const toggleSelected = (productId: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  const selectedProducts =
    products.data?.products.filter((product) => selected.has(product.id)) ?? [];
  const resetKey = `${params.q}|${params.category}|${params.sortBy}|${params.order}`;

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
          <div className="catalogue-actions">
            <p className="result-count">{products.data.total} items</p>
            <button
              className="button button--secondary"
              type="button"
              aria-pressed={bulkMode}
              onClick={() => {
                setBulkMode((active) => !active);
                if (bulkMode) setSelected(new Set());
              }}
            >
              {bulkMode ? "Cancel bulk correction" : "Bulk correct stock"}
            </button>
          </div>
        )}
      </div>

      {bulkMode && (
        <BulkCorrectionPanel
          products={selectedProducts}
          onClose={() => {
            setBulkMode(false);
            setSelected(new Set());
          }}
        />
      )}

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
        <VirtualizedProductGrid
          products={products.data.products}
          bulkMode={bulkMode}
          selected={selected}
          onToggle={toggleSelected}
          resetKey={resetKey}
        />
      )}
    </section>
  );
}
