# Clinic stock frontend

React and TypeScript client for the clinic stock console. It consumes the separately deployed Django API configured by `VITE_API_URL`.

## Design

### Screen and component model

`AppShell` provides the skip link, masthead, signed-in identity, sign-out action, network-status announcements, and main landmark. `SignInPage` owns authentication input. `StockPage` combines catalogue controls, reusable asynchronous states, bulk corrections, and a virtualized grid containing the complete result set. Each `ProductCard` links to the dedicated `/items/:id` route. `ItemPage` presents the product detail and stock correction form.

At 360px the interface is a single column. Wider layouts progressively turn the toolbar and cards into grids and item detail into two columns. Controls remain in document flow rather than moving into a hidden drawer.

### State ownership

- TanStack Query owns server data: current user, categories, the complete product result set, and product detail.
- The URL owns `q`, `category`, `sort`, `order`, and `page`, so reloads and copied links reproduce the view. Search, category, or sorting changes reset `page` to 1.
- Components own transient UI state such as credentials, the stock draft, field errors, and submission announcements.
- The client never stores credentials or tokens. Django manages a server-side session identified by an HTTP-only cookie; the current user remains query data.

### Fetching, caching, and invalidation

The client calls only Django. Query keys include the complete URL filter and sort state. Every fetch receives TanStack Query's `AbortSignal`, so replacing a search aborts the superseded request and an old response cannot become the current query's data. Product results remain fresh for 30 seconds and categories for five minutes. The API returns up to 200 products in one request; `@tanstack/react-virtual` renders only visible rows while all 194 catalogue items remain available by scrolling.

A correction disables its submit action while pending. Success updates the detail cache, invalidates all product lists, and announces completion. Bulk mode allows several visible products to be selected and submitted together, then reports success or failure per item. Failure preserves entered counts so failed items can be retried. A single-flight session check prevents concurrent 401 handling. An expired session displays sign-in without replacing the route, allowing the user to resume in place. Offline and restored connections are announced without replacing normal API error states.

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

## AI Reflection

1. **Use across the four sections**
   - **Frontend:** used AI once as a second-pass review of the search cancellation path and its test; component structure, state ownership, accessibility, and styling were implemented manually.
   - **Backend:** used AI to sanity-check failure cases around the DummyJSON boundary; authentication, persistence ordering, API design, and validation were implemented manually.
   - **Testing and quality:** used AI to suggest one focused stale-response test, then wrote and verified the assertions against the real query behavior. The remaining test cases and lint/type-check setup were manual.
   - **Delivery and documentation:** used AI for a brief README wording review. Deployment configuration and operational decisions were manual.
2. **Tools and workflow:** GitHub Copilot Chat was the only AI tool used. I did not use Superpowers, GSD, Spec Kit, OpenSpec, BMAD, or another agent/spec framework. I split the brief into a task list, implemented each slice, ran its tests and static checks, and used Copilot only for a small targeted review before verifying suggestions myself.
3. **Useful suggestion:** I prompted, “Review this TanStack Query search flow for stale-response races. Suggest one focused test; do not rewrite the hook.” The resulting idea improved coverage by checking that the superseded request is aborted and cannot publish obsolete data.
4. **Bad suggestion:** AI suggested an optimistic stock update. That was subtly wrong because DummyJSON updates are simulated and MongoDB persistence can still fail. I caught it by tracing the write path against the requirement that a reported success must survive reload, and retained the pessimistic update.
5. **Decisions made without AI:** I chose server-side Django sessions instead of browser-stored tokens because immediate revocation and reduced token exposure matter here. I chose a small PyMongo repository and stock overlay instead of an unofficial Django MongoDB ORM because the persistence model needs only keyed reads and upserts.
6. **Hardest part to defend:** [`None`].

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
- `POST /api/products/bulk-corrections` with `{ "corrections": [{ "productId": number, "stock": number }] }`
- `GET /api/products/:id`
- `PUT /api/products/:id` with `{ "stock": number }`

Errors use `{ "error": { "code": string, "message": string } }`.
