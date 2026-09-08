import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import type { Product } from "../types";

export function ItemPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: ({ signal }) => api.product(id, signal),
    enabled: /^\d+$/.test(id),
  });
  const [stock, setStock] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (product.data) setStock(String(product.data.stock));
  }, [product.data]);

  const correction = useMutation({
    mutationFn: (value: number) => api.updateStock(Number(id), value),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Product>(["product", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage("Stock count saved.");
    },
    onError: () => setMessage(""),
  });

  if (!/^\d+$/.test(id))
    return (
      <EmptyState title="Item not found">
        This item link is not valid. <Link to="/">Return to stock.</Link>
      </EmptyState>
    );
  if (product.isPending) return <LoadingState label="Loading item" />;
  if (
    product.isError &&
    product.error instanceof ApiError &&
    product.error.status === 404
  )
    return (
      <EmptyState title="Item not found">
        This item is no longer available. <Link to="/">Return to stock.</Link>
      </EmptyState>
    );
  if (product.isError)
    return (
      <ErrorState
        message={product.error.message}
        onRetry={() => void product.refetch()}
      />
    );

  const item = product.data;
  const numericStock = Number(stock);
  const stockValid =
    Number.isInteger(numericStock) &&
    numericStock >= 0 &&
    numericStock <= 1_000_000;

  return (
    <article className="item-page" aria-labelledby="item-title">
      <Link
        className="back-link"
        to={{ pathname: "/", search: window.location.search }}
      >
        ← Back to stock
      </Link>
      <div className="item-layout">
        <div className="item-image">
          <img src={item.thumbnail} alt="" />
        </div>
        <div className="item-content">
          <p className="eyebrow">{item.category.replaceAll("-", " ")}</p>
          <h1 id="item-title" tabIndex={-1}>
            {item.title}
          </h1>
          <p className="description">{item.description}</p>
          <dl className="detail-facts">
            {item.brand && (
              <div>
                <dt>Brand</dt>
                <dd>{item.brand}</dd>
              </div>
            )}
            {item.sku && (
              <div>
                <dt>SKU</dt>
                <dd>{item.sku}</dd>
              </div>
            )}
            <div>
              <dt>Price</dt>
              <dd>${item.price.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>{item.rating.toFixed(1)} out of 5</dd>
            </div>
          </dl>
          <section className="correction" aria-labelledby="correction-title">
            <h2 id="correction-title">Correct stock count</h2>
            <p id="stock-help">
              Enter the total from the latest physical count.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setMessage("");
                if (stockValid) correction.mutate(numericStock);
              }}
            >
              <label htmlFor="stock">Stock count</label>
              <input
                id="stock"
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="1"
                value={stock}
                aria-describedby="stock-help"
                aria-invalid={!stockValid}
                onChange={(event) => setStock(event.target.value)}
              />
              {!stockValid && (
                <p className="form-error">
                  Enter a whole number from 0 to 1,000,000.
                </p>
              )}
              {correction.isError && (
                <p className="form-error" role="alert">
                  {correction.error instanceof ApiError
                    ? correction.error.message
                    : "Stock could not be saved."}
                </p>
              )}
              <button
                className="button"
                type="submit"
                disabled={!stockValid || correction.isPending}
              >
                {correction.isPending ? "Saving…" : "Save correction"}
              </button>
              <p className="form-status" aria-live="polite">
                {message}
              </p>
            </form>
          </section>
        </div>
      </div>
    </article>
  );
}
