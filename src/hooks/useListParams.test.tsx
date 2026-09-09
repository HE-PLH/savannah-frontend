import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter, useLocation } from "react-router-dom";
import { App } from "../App";
import { ApiError, api } from "../api";
import { NetworkStatus } from "../components/AppShell";
import { StockPage } from "../pages/StockPage";
import type { Product, User } from "../types";
import { useListParams } from "./useListParams";

vi.mock("../pages/ItemPage", () => ({
  ItemPage: () => <h1>Preserved item</h1>,
}));

const signedInUser: User = {
  id: 1,
  username: "ward.user",
  firstName: "Ward",
  lastName: "User",
  email: "ward.user@example.com",
};

function product(id: number): Product {
  return {
    id,
    title: `Item ${id}`,
    description: `Description ${id}`,
    category: "supplies",
    price: id,
    rating: 4,
    stock: 10,
    thumbnail: `/item-${id}.png`,
  };
}

afterEach(() => vi.restoreAllMocks());

function Probe() {
  const { params, update } = useListParams();
  const location = useLocation();
  return (
    <>
      <output>{location.search}</output>
      <button type="button" onClick={() => update({ category: "beauty" })}>
        Category
      </button>
      <button type="button" onClick={() => update({ sortBy: "stock" })}>
        Sort
      </button>
      <span>{params.q}</span>
    </>
  );
}

test("parses a copied URL and resets page when the result set changes", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      initialEntries={[
        "/?q=phone&category=groceries&sort=price&order=desc&page=9",
      ]}
    >
      <Probe />
    </MemoryRouter>,
  );

  expect(screen.getByText("phone")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Category" }));
  expect(screen.getByText(/category=beauty/)).toBeInTheDocument();
  expect(screen.getByText(/q=phone/)).toBeInTheDocument();
  expect(screen.getByText(/sort=price/)).toBeInTheDocument();
  expect(screen.getByText(/order=desc/)).toBeInTheDocument();
  expect(screen.getByText(/category=beauty/)).not.toHaveTextContent("page=9");

  await user.click(screen.getByRole("button", { name: "Sort" }));
  expect(screen.getByText(/sort=stock/)).toBeInTheDocument();
});

test("shows sign-in on expiry and restores the current route", async () => {
  window.history.replaceState({}, "", "/items/42?from=stock");
  const me = vi
    .spyOn(api, "me")
    .mockResolvedValueOnce(signedInUser)
    .mockRejectedValueOnce(
      new ApiError("Your session has ended", 401, "session_expired"),
    )
    .mockResolvedValueOnce(signedInUser);
  vi.spyOn(api, "csrf").mockResolvedValue({ csrfToken: "test" });
  vi.spyOn(api, "login").mockResolvedValue(signedInUser);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>,
  );

  expect(
    await screen.findByRole("heading", { name: "Preserved item" }),
  ).toBeVisible();
  window.dispatchEvent(new Event("clinic-auth-expired"));
  expect(
    await screen.findByRole("heading", { name: "Sign in to clinic stock" }),
  ).toBeVisible();
  expect(window.location.pathname).toBe("/items/42");
  expect(window.location.search).toBe("?from=stock");

  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Email or username/), "ward.user");
  await user.type(screen.getByLabelText(/^Password/), "physical-count-pass");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => expect(me).toHaveBeenCalledTimes(3));
  expect(
    await screen.findByRole("heading", { name: "Preserved item" }),
  ).toBeVisible();
  expect(window.location.pathname).toBe("/items/42");
  expect(window.location.search).toBe("?from=stock");
});

test("recovers from the upstream /http/500 path and then shows empty results", async () => {
  let rejectProducts!: (reason: ApiError) => void;
  const failedProducts = new Promise<never>((_resolve, reject) => {
    rejectProducts = reject;
  });
  vi.spyOn(api, "categories").mockResolvedValue([]);
  const products = vi
    .spyOn(api, "products")
    .mockReturnValueOnce(failedProducts)
    .mockResolvedValueOnce({ products: [], total: 0, skip: 0, limit: 20 });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("Loading stock");
  act(() => {
    rejectProducts(
      new ApiError("Internal Server Error", 502, "upstream_error"),
    );
  });
  expect(
    await screen.findByRole("heading", { name: "Unable to load this data" }),
  ).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Internal Server Error");

  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Try again" }));

  expect(
    await screen.findByRole("heading", { name: "No stock items found" }),
  ).toBeVisible();
  expect(products).toHaveBeenCalledTimes(2);
});

test("announces offline and reconnected states", () => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
  render(<NetworkStatus />);

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
  expect(screen.getByRole("status")).toHaveTextContent("You’re offline");
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
  expect(screen.getByRole("status")).toHaveTextContent("Back online");
});

test("loads the full catalogue but renders only the virtual window", async () => {
  const catalogue = Array.from({ length: 194 }, (_, index) =>
    product(index + 1),
  );
  vi.spyOn(api, "categories").mockResolvedValue([]);
  const products = vi.spyOn(api, "products").mockResolvedValue({
    products: catalogue,
    total: catalogue.length,
    skip: 0,
    limit: 200,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  expect(await screen.findByText("194 items")).toBeVisible();
  expect(products).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, limit: 200 }),
    expect.any(AbortSignal),
  );
  expect(screen.getAllByRole("listitem").length).toBeLessThan(194);
});

test("submits several selected stock corrections together", async () => {
  const catalogue = [product(1), product(2), product(3)];
  vi.spyOn(api, "categories").mockResolvedValue([]);
  vi.spyOn(api, "products").mockResolvedValue({
    products: catalogue,
    total: catalogue.length,
    skip: 0,
    limit: 200,
  });
  const bulkCorrections = vi.spyOn(api, "bulkCorrections").mockResolvedValue({
    results: [
      { productId: 1, stock: 15, status: "success", error: null },
      { productId: 2, stock: 25, status: "success", error: null },
    ],
    summary: { total: 2, succeeded: 2, failed: 0 },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const user = userEvent.setup();

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  await user.click(
    await screen.findByRole("button", { name: "Bulk correct stock" }),
  );
  await user.click(screen.getByLabelText("Select Item 1"));
  await user.click(screen.getByLabelText("Select Item 2"));
  const firstStock = screen.getByLabelText("Item 1");
  const secondStock = screen.getByLabelText("Item 2");
  await user.clear(firstStock);
  await user.type(firstStock, "15");
  await user.clear(secondStock);
  await user.type(secondStock, "25");
  await user.click(screen.getByRole("button", { name: "Save 2 corrections" }));

  await waitFor(() =>
    expect(bulkCorrections).toHaveBeenCalledWith([
      { productId: 1, stock: 15 },
      { productId: 2, stock: 25 },
    ]),
  );
  expect(await screen.findByText("Saved 2 of 2 corrections.")).toBeVisible();
});
