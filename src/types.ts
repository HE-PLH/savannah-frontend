export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
};

export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
  thumbnail: string;
  brand?: string;
  sku?: string;
};

export type Category = { slug: string; name: string; url: string };
export type ProductPage = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};
export type StockCorrection = { productId: number; stock: number };
export type BulkCorrectionResult = StockCorrection & {
  status: "success" | "failure";
  error: { code: string; message: string } | null;
};
export type BulkCorrectionResponse = {
  results: BulkCorrectionResult[];
  summary: { total: number; succeeded: number; failed: number };
};
export type Order = "asc" | "desc";
export type SortField = "title" | "price" | "rating" | "stock";

export type ListParams = {
  q: string;
  category: string;
  sortBy: SortField;
  order: Order;
  page: number;
  limit: number;
};
