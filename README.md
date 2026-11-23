# QuickKart

[![CI](https://github.com/itsjxi/quickkart/actions/workflows/ci.yml/badge.svg)](https://github.com/itsjxi/quickkart/actions/workflows/ci.yml)

A quick-commerce grocery storefront in the style of 10-minute delivery apps, built in **vanilla JavaScript with an MVC architecture**: no framework, no UI library. Products, prices, stock, ratings and reviews come live from the free [DummyJSON products API](https://dummyjson.com/docs/products).

---

## Features

QuickKart is deliberately quiet: off-white canvas, black type, one green accent that only ever means "savings" or "progress", and no banners competing with the products. The interesting work is in the small interaction decisions.

**Browsing**
- **Shelves, then grids.** The home page is one shelf per aisle, each with a "See all" that turns into a filterable grid (sort, in-stock only). Search switches to the grid automatically.
- **Live catalog.** About 75 products from six DummyJSON categories are loaded in parallel and mapped into store aisles using each product's category and tags.
- **Search that explains itself.** Case- and accent-insensitive, every word must match, name matches rank first, and the matched text is highlighted. `/` focuses it, `Esc` clears it. No results? You get aisle shortcuts rather than a dead end.

**Adding to cart**
- **The + becomes the stepper in place.** No layout jump, focus stays on the button you pressed, and the card keeps a quiet "in cart" state.
- **Limits are explained, not silent.** At the stock limit the + dims and the card says "Only 3 available" (also announced to screen readers).
- **Removing is undoable.** Dropping an item to zero shows "Removed Milk · Undo" for five seconds.
- **Sold out means "Notify me".** Out-of-stock items offer an alert toggle (remembered between visits) instead of a disabled button.

**Cart**
- **Free-delivery nudge** with a progress bar ("Add $16.51 more for free delivery").
- **"You might also need"**: in-stock picks from the same aisles that you can add without leaving the cart.
- **An honest bill:** MRP vs selling price, savings, delivery, handling and a total that's repeated on the checkout button. Money is rounded to cents, with no floating-point drift.
- The cart survives reloads and re-syncs with the catalog, so it never shows stale prices or vanished items.

**Everything else**
- Product sheet with gallery, rating and reviews (a bottom sheet on mobile), skeleton loading, error state with retry, dark mode, sticky mobile cart bar, live-region announcements and reduced-motion support.

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
- full-app flows: shelves → "See all" grid, add → stepper → stock-limit hint, undo, notify-me, search highlight and empty state, product sheet, free-delivery nudge and suggestions, checkout, error and retry, a restored cart, and a script-injection attempt

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
