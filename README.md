# Cha Yuan 茶源 — premium Chinese tea store with OTT Pay checkout

A complete, runnable e-commerce site for selling Chinese tea, built to the
information architecture of [teasenz.com](https://www.teasenz.com/) and wired to
**OTT Pay local card 3-D Secure 2** payments.

**English storefront · deep ink-green and champagne-gold design · real product
photography · Node + SQLite backend · admin back office · works fully without
gateway credentials in mock mode.**

Deploying? See **[docs/DEPLOY.md](docs/DEPLOY.md)** for GitHub and Render,
including the one setting that will cost you money if you get it wrong.

---

## Quick start

```bash
npm install
npm run fonts      # one-off: self-host Cormorant Garamond + Inter (414 KB)
npm start
```

| | |
|---|---|
| Storefront | <http://127.0.0.1:3080> |
| Admin | <http://127.0.0.1:3080/admin> — `owner@chayuan.test` / `changeme-please` |
| Payment mode | `mock` (simulated acquirer, no credentials needed) |

Copy `.env.example` to `.env` and edit it. Everything is documented inline.

### Verify the whole thing

```bash
npm run demo           # one complete purchase: pricing → 3DS → encrypted callback → paid
npm test               # 74 HTTP checks + contrast + asset integrity + gap audit + language audit
npm run visual         # 77 rendered-layout checks in headless Chrome
npm run shots          # full-page screenshots of every storefront page
```

**Photography coverage: every category and 31 of 32 products.** The one exception
is the bamboo tea tray, which has no suitable openly-licensed photograph and uses
generated artwork composed as a matching set of three views. `npm run gaps` lists
the current state.

The storefront is **English-only**. `npm run lang` fails if any non-English text
or mojibake reaches a template or a rendered page, so that cannot regress by
accident.

---

## What is in the box

**Storefront** — homepage with hero, category tiles, featured lots, editorial
sections, new arrivals and newsletter; shop with category filters, sorting,
search and pagination; product pages with size variants, tasting notes, harvest
and processing metadata and per-tea brewing parameters; guides hub; about,
shipping and terms pages; order lookup; cart page and slide-out cart drawer;
two-step checkout.

**Catalogue** — 32 products and 75 priced variants across 10 categories: green,
white, oolong, Phoenix Dan Cong, Wuyi rock oolong, black, pu-erh, floral and
scented teas, teaware and gift sets. Each tea carries origin, altitude,
cultivar, harvest, oxidation, roast, caffeine, liquor colour, tasting notes and
gaiwan + Western brewing parameters.

**Admin back office** — dashboard with revenue and stock, order list and detail
with the full payment attempt history, stock editing, payment callback log with
decryption results, status transitions, one-click status re-query and partial or
full refunds.

**Payments** — see [`docs/OTTPAY.md`](docs/OTTPAY.md). Card authorisation with
3-D Secure 2, challenge relay, AES-128-ECB callback decryption with de-duplication,
authoritative status queries and refunds.

---

## Architecture

```
server/
  index.mjs          Express app: routes, middleware, security headers, bootstrap
  config.mjs          .env loader and validated config
  db.mjs              node:sqlite schema, migrations, transactions
  catalog-data.mjs    the catalogue: categories, 32 products, editorial copy
  seed.mjs            writes catalog-data.mjs into the database
  catalog.mjs         read-side queries (filters, search, related products)
  orders.mjs          server-authoritative pricing, order lifecycle, refunds
  ottpay.mjs          OTT Pay client: token, 3DS payment, status, refund, AES callback
  mock-ottpay.mjs     in-process acquirer that mirrors OTT Pay's 3DS2 state machine
  payments.mjs        facade that dispatches to OTT Pay or the mock
  imagery.mjs         generative SVG artwork (products, heroes, logo, badges)
  security.mjs        password hashing, signed tokens, CSRF, rate limiting, validation
  scripts/            smoke test, visual probe, contrast audit, font + encoding tools
views/                EJS templates (storefront, checkout, admin, 3DS challenge)
public/
  css/styles.css      the design system
  js/                 cart, checkout, payment result, shared utilities
  fonts/              self-hosted Cormorant Garamond + Inter
data/shop.db          SQLite database (created on first run)
docs/OTTPAY.md        the payment integration, endpoint by endpoint
```

### Why there are photographs *and* generated artwork

Product photography is real, openly-licensed tea photography (Creative Commons
and public domain), sourced and graded by the pipeline documented in
[`docs/PHOTOS.md`](docs/PHOTOS.md). Attribution is published at `/credits`.

The brand artwork — the logo, seal marks, hero banners, payment badges and the two
or three product tiles with no suitable photograph — is **generated as SVG** by
`server/imagery.mjs` and served from `/img/...`, so the site has no binary assets
it does not have the rights to and nothing to licence.

Pages only ever ask the database for `hero_image` and `images`, so swapping in
your own commissioned photography touches no application logic — see
`docs/PHOTOS.md` for the swap procedure.

---

## Switching to the real OTT Pay gateway

The mock and the real gateway share the same code path — only configuration
changes. Put your sandbox credentials in `.env`:

```ini
PAYMENT_MODE=sandbox
OTT_APP_ID=your-app-id
OTT_APP_KEY=your-app-key
OTT_SIGN_KEY=your-sign-key
OTT_MERCHANT_ID=your-merchant-id
PUBLIC_BASE_URL=https://your-tunnel.example.com
```

> The four `OTT_*` values come from your OTT Pay onboarding email. **Do not**
> copy the identifiers out of OTT Pay's public API documentation — those are
> their illustration values for a merchant that is not you, and pasting them here
> will fail authorisation with error `10003`. The `OTT_SIGN_KEY` must be your own
> too: it is what decrypts *your* callbacks, and the wrong one shows up as
> undecryptable webhook rows in the admin rather than as an obvious failure.

`PUBLIC_BASE_URL` **must be reachable from the internet**, because OTT Pay posts
the payment result to `${PUBLIC_BASE_URL}/api/ottpay/callback`. While developing
locally, expose the port with a tunnel (`ngrok http 3080`, `cloudflared tunnel
--url http://localhost:3080`) and put the tunnel URL in `PUBLIC_BASE_URL`.

Then restart and pay with one of OTT Pay's published sandbox cards — the
settings page in the admin lists them all. Full details, including every request
field and the callback decryption, are in [`docs/OTTPAY.md`](docs/OTTPAY.md).

---

## Configuration reference

| Variable | Default | Meaning |
|---|---|---|
| `PAYMENT_MODE` | `mock` | `mock` \| `sandbox` \| `live` |
| `PUBLIC_BASE_URL` | `http://localhost:3080` | Must be internet-reachable for callbacks |
| `STORE_NAME` / `STORE_TAGLINE` | Cha Yuan | Branding used in titles, logo and emails |
| `CURRENCY` / `CURRENCY_SYMBOL` | `CAD` / `$` | Display currency |
| `FREE_SHIPPING_THRESHOLD` | `79` | Dollars; above this shipping is free |
| `FLAT_SHIPPING_FEE` | `9.5` | Dollars; express is charged at 2× |
| `TAX_RATE` / `TAX_LABEL` | `0.13` / `HST (13%)` | Applied to subtotal + shipping |
| `OTT_APP_ID` / `OTT_APP_KEY` | — | Obtain the bearer token |
| `OTT_SIGN_KEY` | — | Decrypt payment callbacks |
| `OTT_MERCHANT_ID` | — | Sent in the callback, used in the KOUNT session id |
| `KOUNT_CLIENT_ID` | — | Enable KOUNT device data collection |
| `KOUNT_ENVIRONMENT` | `TEST` | `TEST` while integrating, `PROD` live |
| `SESSION_SECRET` | — | Signs the admin session cookie |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | owner@chayuan.test | Back-office login — **change these** |
| `TRUST_PROXY` | `0` | Set to `1` behind nginx/Cloudflare/a tunnel |

All internal amounts are integer **cents**. The browser never sends a price: it
sends variant ids and quantities, and the server recalculates subtotal, shipping,
tax and total from the database before an order exists.

---

## Going live checklist

1. Set `NODE_ENV=production` and `PAYMENT_MODE=live` with your production
   `appId` / `appKey` / `signKey` / `merchantId`.
2. Replace `ADMIN_PASSWORD` and generate a real `SESSION_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
3. Put the site behind HTTPS — `PUBLIC_BASE_URL` must be `https://` (the app
   refuses to start in production without it, and sets HSTS).
4. Set `TRUST_PROXY=1` if a reverse proxy terminates TLS, so rate limiting and
   logs see the real client IP.
5. Point `DATABASE_FILE` at a persistent volume and back it up; `data/shop.db`
   plus its `-wal` file are the whole business record.
6. Confirm OTT Pay can reach `https://your-domain/api/ottpay/callback`, then
   place one real low-value order and check the webhook appears under
   *Admin → Payment callbacks* with a `decrypted` status.
7. Change `STORE_NAME`, `STORE_TAGLINE` and the editorial copy in
   `server/catalog-data.mjs` from the placeholder brand.
8. Replace the generated SVG artwork with real product photography.

---

## Security notes

- Card numbers and CVV are forwarded to OTT Pay and then discarded. Only the card
  brand and last four digits are persisted; the gateway's payment id is stored for
  reconciliation and refunds. This keeps the site in PCI-DSS SAQ-A scope.
- `appKey`, `signKey` and `SESSION_SECRET` live in `.env` and never reach the browser.
- The callback endpoint is idempotent: events are keyed by `sha256(md5|reference|order_id)`
  and a replay cannot double-fulfil an order. Failed decryptions are recorded
  rather than silently dropped, and are visible in the admin.
- Checkout is rate-limited per IP (12 attempts/minute), CSRF-protected with a
  double-submit token, and rejects cross-origin requests.
- Admin passwords are compared in constant time; the sign-in form is rate-limited
  to 8 attempts per 5 minutes.
- The Content-Security-Policy is strict (`script-src 'self'`, no inline scripts)
  except on the 3-D Secure challenge page, which must be allowed to post a form to
  the issuer's ACS domain.
- Order lookup reveals the delivery address only when the email matches, or when
  the unguessable order number is supplied.

---

## Development tooling

| Command | Purpose |
|---|---|
| `npm start` | Run the server |
| `npm run dev` | Run with `--watch` |
| `npm run seed` | Seed the catalogue (no-op if it exists) |
| `npm run reseed` | Rebuild the catalogue, keeping historical orders |
| `npm run demo` | Drive one complete purchase and print each step |
| `npm test` | HTTP suite + contrast audit + asset integrity |
| `npm run smoke` | End-to-end HTTP test suite |
| `npm run visual` | Headless-Chrome layout and palette probe |
| `npm run contrast` | WCAG AA contrast audit |
| `npm run assets` | Confirm every referenced asset resolves |
| `npm run gaps` | List any remaining generated artwork and why |
| `npm run lang` | Fail on non-English text or mojibake anywhere |
| `npm run check:render` | Validate `render.yaml` before deploying |
| `npm run audit` | Database inspection and card-data leak check |
| `npm run shots` | Full-page screenshots into `_shots/` |
| `npm run fonts` | Re-download and localise the webfonts |
| `npm run photos` | Rebuild the product photography from the curated selection |

Full-page screenshots are rendered at native resolution, then
`node server/scripts/crop-shots.mjs _shots/home.png --bands 5` slices them into
readable bands — a 5200px-tall capture is useless viewed whole.

`GET /dev/audit?path=/shop` renders any storefront page with the measurement
probe injected — useful in a browser when you want the raw numbers behind the
visual checks.

---

## Known limitations

- **The photography is licensed, not yours.** It is real tea photography and it is
  legally safe to ship, but it is not photography of the exact teas this shop
  sells, and two or three slots still use generated artwork. Commission your own
  shots before launch — `docs/PHOTOS.md` has the swap procedure. **Do not lift
  product images from another tea merchant**; that is infringement.
- **No transactional email is sent.** The order confirmation page and the admin
  contain everything an email would; wire up an SMTP provider (or OTT Pay's
  receipt) before launch. Search `views/payment-result.ejs` for the receipt copy.
- **The testimonials are illustrative copy**, flagged as such on the homepage.
  Replace them with real reviews before taking money.
- **Shipping rates are a flat fee plus one express tier.** The rate table lives in
  `config.store` and is applied in `orders.priceCart`.
- **Payment is local card only.** OTT Pay also offers WeChat, Alipay and UnionPay
  web payments; those endpoints (documented at <https://apidocs.ottpay.com/api/>)
  are not implemented here, but `server/ottpay.mjs` shows the auth and error
  handling pattern they need.
- **Reviews are display-only.** Ratings and counts come from the catalogue data;
  there is no review submission endpoint.
- **No inventory reservation timeout.** Stock is decremented when an order is
  created; cancelling an unpaid order from the admin returns it via
  `restockOrder`.
- **The wishlist is browser-local.** Saving a tea stores its slug in
  `localStorage`; there is no account system behind it.
