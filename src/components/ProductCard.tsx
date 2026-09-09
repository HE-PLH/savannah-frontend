import { Link, useLocation } from "react-router-dom";
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  selection?: { selected: boolean; onToggle: () => void };
};

export function ProductCard({ product, selection }: ProductCardProps) {
  const location = useLocation();

  return (
    <article
      className={`product-card${selection?.selected ? " product-card--selected" : ""}`}
      role="listitem"
    >
      {selection && (
        <label className="product-card__selection">
          <input
            type="checkbox"
            checked={selection.selected}
            onChange={selection.onToggle}
          />
          <span>Select {product.title}</span>
        </label>
      )}
      <Link
        className="product-card__link"
        to={{ pathname: `/items/${product.id}`, search: location.search }}
        aria-label={`View details for ${product.title}`}
      >
        <img
          src={product.thumbnail}
          alt=""
          loading="lazy"
          width="160"
          height="160"
        />
        <div className="product-card__body">
          <p className="eyebrow">{product.category.replaceAll("-", " ")}</p>
          <h2>{product.title}</h2>
          <dl className="facts">
            <div>
              <dt>In stock</dt>
              <dd>{product.stock}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>${product.price.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </article>
  );
}
