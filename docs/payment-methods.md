# What we can actually take, and why the logos are these ones

The footer and the checkout show a row of payment marks. This file is the record
of which brands are allowed to appear in that row, and where the list came from,
so nobody has to guess later whether a mark was left out on purpose.

## The source of truth

OTT Pay publishes the complete list of card types its **local card 3-D Secure
payment** endpoint settles:

- <https://apidocs.ottpay.com/api/online-scenario/local-card/supported-cards/>

That endpoint is the one this shop calls — `POST /api/v1/payment/local-card/payment3dsV2`
— so its list is the only list that matters here. As published, it is:

| Brand | Card type |
| --- | --- |
| Visa | Credit |
| Visa | Debit |
| Mastercard | Credit |
| Mastercard | Debit |
| American Express | Credit |
| Discover | Credit |
| JCB | Credit |
| China UnionPay | Credit |
| Diners | Credit |

Seven brands, nine card types. The footer row shows the seven brands; the copy
beside it says "credit and debit" rather than repeating nine rows.

## What is deliberately absent

The reference shopfronts the design was modelled on show a longer row —
kakobuy, for instance, shows PayPal, Wise, Bank Transfer and MIR alongside the
card networks. **None of those can be shown here**, because this shop cannot
take them:

- **PayPal** — not offered by OTT Pay on any API. There is no integration, so a
  PayPal mark would promise a payment route that does not exist.
- **Wise** — a transfer service, not a card scheme. Nothing in the gateway
  handles it, and it would need a manual bank-transfer process behind it.
- **Bank Transfer** — we have no offline payment method. The checkout creates an
  order and calls the gateway; there is no state in which an order waits for a
  bank credit.
- **MIR** — a Russian domestic scheme, not settled by this gateway.
- **Apple Pay / Google Pay** — wallet presentations of a card payment, and OTT
  Pay's local-card API takes raw card fields, not a wallet token. The two mark
  files that were once fetched for these (`paypal.svg`, `applepay.svg`) have been
  deleted, along with their entries in `fetch-brand-marks.mjs`, so they cannot
  creep back onto the page.

Showing a payment mark the shop cannot honour is not a cosmetic mistake. Under
the card scheme rules it is a misleading representation of acceptance, and a
customer who pays by a method the shop does not support has a legitimate
chargeback.

## OTT Pay offers more than we use

The same gateway also exposes WeChat Pay (native, H5, in-app and mini-program),
Alipay (H5, PC scan and in-app) and UnionPay WEB payment. Those are separate API
scenarios with separate merchant onboarding, and this shop has integrated only
the local-card 3-D Secure flow. If any of them is ever enabled, the change is in
`server/ottpay.mjs` first and in this list second — a mark never goes on the page
before the code that settles it exists.

## Adding a brand

1. Add the brand to `BRANDS` in `server/scripts/fetch-brand-marks.mjs` and run
   `npm run badges:fetch`. Wanted marks come from Wikimedia Commons rather than
   from the networks' own press pages, so the licence is recorded and the file is
   served from our own origin instead of hot-linked.
2. Add the slug to `slugs` in `server/scripts/sheet-badges.mjs` and
   `server/scripts/probe-badges.mjs`, run `npm run badges:sheet`, and look at the
   result. Several networks publish white-knockout artwork that disappears on a
   light plate; the sheet shows which is which.
3. Add the slug to the `marks` array in the payment-brand-marks block of
   `server/scripts/smoke.mjs`, which asserts that each one serves real vector
   artwork rather than the generated fallback pill.
4. Add the `<img class="mark">` to `views/partials/footer.ejs`.

Every mark is drawn on its own light plate (`.footer-pay img.mark` and
`.card-logos img.mark` in `public/css/styles.css`). That is not decoration: the
artwork is dark ink on transparency, drawn for a white page, and on the
ink-green ground it would be close to invisible — Discover and Diners in
particular are almost entirely wordmark.
