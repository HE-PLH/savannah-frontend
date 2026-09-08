# Clinic stock frontend

React and TypeScript client for the clinic stock console. It consumes the separately deployed Django API configured by `VITE_API_URL`.

## Design

### Screen and component model

`AppShell` provides the skip link, masthead, signed-in identity, sign-out action, and main landmark. `SignInPage` owns authentication input. `StockPage` combines `StockToolbar`, `ProductGrid`, reusable asynchronous states, and `Pagination`. Each `ProductCard` links to the dedicated `/items/:id` route. `ItemPage` presents the product detail and `StockCorrectionForm`.

At 360px the interface is a single column. Wider layouts progressively turn the toolbar and cards into grids and item detail into two columns. Controls remain in document flow rather than moving into a hidden drawer.

### State ownership

- TanStack Query owns server data: current user, categories, product pages, and product detail.
- The URL owns `q`, `category`, `sort`, `order`, and `page`, so reloads and copied links reproduce the view. Search, category, or sorting changes reset `page` to 1.
- Components own transient UI state such as credentials, the stock draft, field errors, and submission announcements.
- The client never stores credentials or tokens. Django manages a server-side session identified by an HTTP-only cookie; the current user remains query data.

### Fetching, caching, and invalidation

The client calls only Django. Query keys include the complete URL state. Every fetch receives TanStack Query's `AbortSignal`, so replacing a search aborts the superseded request and an old response cannot become the current query's data. Product pages remain fresh for 30 seconds and categories for five minutes.

A correction disables its submit action while pending. Success updates the detail cache, invalidates all product lists, and announces completion. Failure preserves the entered count, restores the action, and displays a recoverable error. A single-flight session check prevents concurrent 401 handling. An expired session displays sign-in without replacing the route, allowing the user to resume in place.

### Visual system

Custom CSS properties define color, spacing, radii, shadows, and focus rings. The palette uses a dark blue masthead, neutral surfaces, and teal actions with strong contrast. The system font stack avoids a download over patchy Wi-Fi. Spacing follows a 4/8/12/16/24/32px scale, content is capped at 1180px, and touch targets are at least 44px.

### Accessibility

The application uses semantic landmarks, headings, lists, labels, descriptions, links, and buttons. It includes a visible-on-focus skip link and strong `:focus-visible` treatment. Errors are associated with their controls, status changes use live regions, and failures use alerts. Images are decorative where adjacent product text supplies the same information. The UI is keyboard operable(USE TAB for navigation), honors reduced motion, and does not require horizontal scrolling at 360px.

## Decision log

### URL as the list-state database

**Decision:** store every list control and page in search parameters. **Rejected:** component state persisted to local storage. **Why:** local storage restores one tablet but cannot reproduce a view from a chat link on another device, while URL state satisfies both reload and sharing requirements.

### Immediate search with cancellation

**Decision:** update `q` on every input and cancel the superseded request. **Rejected:** continuing to show old results during a debounce interval. **Why:** a delayed connection can label old results as if they matched newly typed text. Cancellation plus complete query keys prevents stale publication.

### Pessimistic stock correction

**Decision:** keep the draft visible and show pending state until the API confirms persistence. **Rejected:** optimistic stock updates. **Why:** a false successful count is operationally worse than a short wait, especially when ward Wi-Fi drops during a write.

### Django as the browser boundary

**Decision:** call only the Django API with credentialed cookies. **Rejected:** calling DummyJSON directly and storing bearer tokens in local storage. **Why:** the boundary reduces token exposure, centralizes refresh behavior, and ensures product reads include persisted MongoDB overrides.

## Setup

Requirements: Node.js 22+, npm 10+, and the clinic stock backend running on `http://localhost:8000`.

1. Copy `.env.example` to `.env` and change `VITE_API_URL` if needed.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173` and sign in with a seeded user's email or username and DummyJSON password, such as `emilys` / `emilyspass`.

## Quality commands

- `npm run format` and `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ci`
- `npm run build`

The tests cover shareable URL parsing and page reset behavior, plus cancellation of obsolete delayed searches. Conventional Commits are enforced by commitlint through the committed Husky `commit-msg` hook.

## Backend contract

The client expects:

- `GET /api/auth/csrf`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/categories`
- `GET /api/products?q=&category=&sortBy=&order=&page=&limit=`
- `GET /api/products/:id`
- `PUT /api/products/:id` with `{ "stock": number }`

Errors use `{ "error": { "code": string, "message": string } }`.
