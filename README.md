# QuickKart

[![CI](https://github.com/itsjxi/quickkart/actions/workflows/ci.yml/badge.svg)](https://github.com/itsjxi/quickkart/actions/workflows/ci.yml)

A quick-commerce grocery storefront in the style of 10-minute delivery apps, built in **vanilla JavaScript with an MVC architecture**: no framework, no UI library. Products, prices, stock, ratings and reviews come live from the free [DummyJSON products API](https://dummyjson.com/docs/products).

---

## Features

- **Live catalog.** About 75 products from six DummyJSON categories are loaded in parallel and grouped into store aisles (Fruits & Vegetables, Dairy & Eggs, Beverages, Kitchen, Beauty…) using each product's category and tags.
- **Instant search** across names, brands and tags. It's case- and accent-insensitive, every word must match, and name matches rank first. Press `/` to focus it.
- **Sorting and filters:** price, biggest discount, top rated, and in stock only.
- **Cart that behaves like a real one.** Quantities are capped at live stock. The cart survives reloads and re-syncs with the catalog on load, so it never shows stale prices or vanished items.
- **Bill details:** MRP vs selling price, savings, delivery fee with a free-delivery progress bar, handling fee and grand total. Money is rounded to cents, with no floating-point drift.
- **Product sheet** with an image gallery, rating, reviews and return policy. On mobile it's a bottom sheet.
- **Checkout flow** with an order-confirmation state (demo only: no payment is taken).
- **UI details:** skeleton loading, error state with retry, empty states, dark mode (follows the OS setting, remembered after that), a sticky mobile cart bar, and reduced-motion support.

## Architecture

```
src/
├── config.js              Categories, aisles, pricing rules
├── api/productsApi.js     fetch + timeout, per-category fault tolerance, normalizeProduct()
├── model/
│   ├── catalog.js         Pure: aisles, search ranking, sorting, filtering
│   ├── cart.js            Cart store (stock caps, persistence) + summarizeCart()
│   └── createStore.js     ~20-line observable store
├── views/                 Render functions: header, aisles, grid/cards, product modal, cart drawer
├── controller/
│   └── appController.js   Wires state → views; one delegated listener handles every data-action
└── utils/dom.js           html`` tagged template (auto-escaping), price formatting, focus preservation
```

**Design decisions**

| Decision | Why |
|---|---|
| Pure model functions | Search, sorting, aisles and bill maths are plain functions over data, tested without a DOM. |
| `html` tagged template that escapes by default | Every API value is untrusted. Escaping is opt-out (nested templates only), never opt-in. |
| Event delegation via `data-action` | One listener instead of one per card; works for content rendered at any time. |
| Patch quantity controls instead of re-rendering the grid | Adding to cart updates only the affected buttons, and keyboard focus stays where it was. |
| `Promise.allSettled` per category | One failing category doesn't take down the store. |
| Price = selling price; MRP derived from `discountPercentage` | Matches how DummyJSON models discounts. |

## Testing

```bash
npm test     # Vitest + jsdom (37 tests)
npm run lint
```

The tests use real DummyJSON responses captured as fixtures (`tests/fixtures`). They cover:
- product normalisation and fault-tolerant loading
- aisle mapping
- search ranking and sorting
- cart stock caps, persistence and bill maths
- HTML escaping
- full-app flows: loading → add → stepper → filters → product modal → cart → checkout, error and retry, a restored cart, and a script-injection attempt

CI runs lint, tests and a production build on every push.

## Getting started

```bash
npm install
npm run dev
```

No API key needed.

## Notes

- Prices are in USD, as returned by the API.
- DummyJSON's `minimumOrderQuantity` (for example, 43 beef steaks) doesn't fit a grocery app, so it's ignored.
