# OTT Pay integration — local card 3-D Secure 2

How this shop talks to OTT Pay, endpoint by endpoint, with the exact mapping from
the official documentation at <https://apidocs.ottpay.com/api/>.

Everything lives in **`server/ottpay.mjs`** (the real client),
**`server/mock-ottpay.mjs`** (an in-process acquirer that mirrors the same state
machine) and **`server/payments.mjs`** (the facade the rest of the app calls).
Switching between them is one environment variable.

---

## 1. Environments and credentials

| | Base URL |
|---|---|
| Sandbox | `https://sandbox-api.ottpay.com` |
| Production | `https://ecom-api.ottpay.com` |

Set `PAYMENT_MODE=sandbox` or `live` to select one; `config.mjs` resolves
`OTT_SANDBOX_BASE_URL` / `OTT_LIVE_BASE_URL` into `config.payment.baseUrl`.

Credentials come from the onboarding email:

| Variable | Purpose |
|---|---|
| `OTT_APP_ID` | with `appKey`, exchanges for the bearer token |
| `OTT_APP_KEY` | ditto |
| `OTT_SIGN_KEY` | derives the AES key that decrypts payment callbacks |
| `OTT_MERCHANT_ID` | `merchant_id` in the callback; also seeds the KOUNT session id |

`validateConfig()` refuses to start in `sandbox` or `live` mode without all four,
and points at exactly which one is missing.

---

## 2. Authentication — `POST /api/v1/auth/token`

The bearer token lives **15 minutes**, so it is cached in memory and refreshed 60
seconds early (`OTT_TOKEN_TTL_SECONDS`, `OTT_TOKEN_REFRESH_SKEW_SECONDS`).

```json
// request
{ "appId": "ON00000185", "appKey": "0e83678f102d188d8875e8e4c781b984" }

// response
{ "status": "SUCCESS",
  "result": { "token": "eyJhbGciOiJIUzUxMiJ9…", "expired": 1677688934293 } }
```

Every later call sends `Authorization: Bearer <token>`.

Implementation: `getToken()` in `server/ottpay.mjs`. Concurrent checkouts share a
single in-flight token request (`tokenInFlight`) so a burst of shoppers cannot
trigger a token stampede. `clearTokenCache()` forces a refresh after a `90000`
Unauthorized response.

---

## 3. Taking a payment — `POST /api/v1/payment/local-card/payment3dsV2`

`pay3ds()` builds the documented payload. Money is an **integer number of cents**
(`2000` = $20.00).

| Field | Source in this shop |
|---|---|
| `amount` | `orders.priceCart()` total, recalculated server-side |
| `accountNumber`, `accountName`, `accountExpire` (`MMYY`), `cvn2` | the checkout form, passed straight through |
| `sslAvsAddress`, `sslAvsCity`, `sslAvsProvince`, `sslAvsCountry`, `sslAvsZip` | the shipping address, trimmed to the documented lengths |
| `callBackURL` | `${PUBLIC_BASE_URL}/api/ottpay/callback` |
| `frontURL` | `${PUBLIC_BASE_URL}/payment/result?order=…` |
| `reference` | `orders.newReference()` — order number + 6 random hex chars |
| `sessionId` | the KOUNT device-data session id |
| `email` | the shopper's email |
| `purchase3DSAddition.*` | browser and device fingerprint from `security.collectBrowserFingerprint()` |
| `purchase3DSAddition.version` | `"2.1.0"` (fixed by the specification) |
| `purchase3DSAddition.sessionID` | an upper-case alphanumeric id derived from the KOUNT session id |

### Where the browser fingerprint comes from

Three-D Secure 2 requires real device data. Two layers are in place:

1. **Client-side** (`public/js/app.js`, `CY.browserFingerprint()`) reads
   `navigator.userAgent`, `navigator.language`, screen size, colour depth and
   timezone offset, and posts them with the checkout form. The server accepts
   only these named fields — `security.collectBrowserFingerprint()` never lets an
   arbitrary client value into the gateway payload.
2. **KOUNT** (device data collection, per OTT Pay's fraud-mitigation guide).
   Set `KOUNT_CLIENT_ID` and the checkout page loads `@kount/kount-web-client-sdk`,
   calls `kountSDK({ clientID, environment, isSinglePageApp: false }, sessionId)`
   and sends the resulting `sessionId`. The session id is
   `MID-timestamp-4digits`, alphanumeric, ≤32 characters, unique per request —
   `orders.newKountSessionId()` generates it, and a locally generated fallback is
   used when KOUNT is not configured so the gateway always receives a valid value.

### Responses

**Frictionless** — the transaction is approved immediately:

```json
{ "status": "SUCCESS",
  "result": { "paymentStatus": "authorised", "paymentId": "1694723098440263",
              "ccType": "VISA", "amount": "2000", "receiptAmount": "2000",
              "totalAmount": "2000", "tradeTime": "2023-09-14 16:25:00 EDT" } }
```

**Challenge** — the issuer wants the cardholder to authenticate. `paymentId` is
null and the response carries a ready-made HTML form:

```json
{ "status": "SUCCESS",
  "result": { "paymentStatus": "THREEDS_AUTH_CHALLENGE",
              "escape3DSChallengeForm": "<html>…<form action=\"https://checkoutshopper-test.adyen.com/…\">…" } }
```

**Error** — `status` is `ERROR`, or an HTTP error status is returned:

```json
{ "status": "ERROR", "result": { "code": 20005, "message": "No permission for the merchant" } }
```

`ottFetch()` turns every failure mode into an `OttPayError` with a code, and
`OTT_ERROR_CODES` maps the documented codes to plain-English explanations.

---

## 4. The 3-D Secure challenge relay

`escape3DSChallengeForm` is dumped on the shopper as-is by most integrations,
which means they see a bare unstyled page. Instead:

- `POST /api/checkout` returns `nextAction: "challenge"` and a
  `challengeUrl` of `/payment/3ds/challenge?ref=<reference>`.
- That route (`views/challenge.ejs`) renders the order, amount and reference in
  the site's own styling, embeds the issuer's form, and auto-submits it.
- The route sends a **relaxed CSP** (`form-action *`, `frame-src *`) because the
  form posts to an arbitrary ACS domain. Every other page keeps the strict
  policy.
- After authentication the issuer returns the shopper to `frontURL`, i.e.
  `/payment/result?order=…`.

In mock mode the same route renders a password prompt (`password` approves,
anything else simulates a refused authentication), and `POST /mock-3ds/challenge`
resolves the transaction before redirecting to the same result page.

---

## 5. The callback — `POST <callBackURL>`

OTT Pay posts the result to `${PUBLIC_BASE_URL}/api/ottpay/callback`:

```json
{ "rsp_code": "SUCCESS", "rsp_msg": "success",
  "merchant_id": "ON00004652",
  "data": "vg8LJmi7ryeVxUTVfPC6N1l5ebL9cgn4…",
  "md5": "5A917182659DE14DCB3022CA6518F34F" }
```

`data` is **AES-128-ECB, Base64**, and the key is derived from the callback's own
`md5` plus `OTT_SIGN_KEY`:

1. concatenate `md5 + signKey`
2. MD5 it, uppercase — the "16 bit MD5" form
3. that 16-character string is the AES key

**Which 16 characters?** OTT Pay's worked example settles it. With
`md5 = 5A917182659DE14DCB3022CA6518F34F` and `signKey = A8B5FE540E38A5A9` the
32-character digest is:

```
38315225 BFE59D83C221F217 27E31BE4
└──────┘ └──────────────┘ └──────┘
         documented AES key
```

so the key is the **middle** 16 hex characters — `digest.slice(8, 24)`.
`deriveCallbackKey()` does exactly that, and `candidateCallbackKeys()` returns the
leading and trailing framings as well; `decryptCallback()` tries all three so a
real callback can never be silently lost to a documentation ambiguity.

Decrypted payload (local card):

```json
{ "reference": "20240108172641374", "order_status": "captured",
  "amount": "9955", "bizpay_order_id": "JKZ2NDF5GC5PPJ65", "tip": "0",
  "merchant_id": "CAMB006711", "order_id": "17047528085325164",
  "finish_time": "2024-01-08 16:29:03 CST", "remarks": "20240108172641374" }
```

### What the handler does

Always answers `HTTP 200 {"rsp_code":"SUCCESS","rsp_msg":"ok"}` so the gateway
does not retry forever; problems are recorded instead of thrown.

1. Records the raw body and the decrypted payload in `webhook_events`.
2. De-duplicates on `sha256(md5 | reference | order_id)` — a replay cannot move an
   order twice or double-fulfil it.
3. Matches the order by `reference`, falling back to `remarks`.
4. Maps `order_status` through `PAID_STATUSES` (`authorised`, `captured`,
   `success`, `settled`) and calls `orders.applyPaymentResult()`.
5. Stores `bizpay_order_id` and marks the event processed.

`applyPaymentResult()` is deliberately **monotonic**: an order that is already
`paid`, `processing`, `shipped`, `delivered` or `refunded` is never downgraded by a
late or out-of-order callback.

A failed decryption is stored with its `error` text and is visible under *Admin →
Payment callbacks*, so a wrong `signKey` shows up immediately rather than as a
silently lost payment.

---

## 6. Status queries — `POST /api/v1/payment/status-query`

```json
// request
{ "paymentId": "17043939011796739" }
```

Returns `paymentStatus`, `stateCode`, `totalAmount`, `receiptAmount`,
`payAmount`, `refundAmount` and `tradeTime`. `PAYMENT_STATES` maps the documented
`P00001`–`P00017` codes to labels.

Used in two places:

- **Shopper**: *Check with the bank* on the payment result page, plus automatic
  polling every 2–4 seconds for the first ~40 seconds after a challenge.
- **Admin**: *Re-query status from OTT Pay* on the order page, which applies the
  result if the gateway now reports the payment as captured.

---

## 7. Refunds — `POST /api/v1/payment/local-card/refund`

```json
// request
{ "oriPaymentId": "1694723098440266", "refundAmount": 5000 }

// response
{ "status": "SUCCESS",
  "result": { "refundId": "REF187814130359", "refundAmount": "5000",
              "refundStatus": "success", "tradeTime": "2003-09-30 12:00:04" } }
```

`oriPaymentId` is the **OTT Pay payment id**, not our reference — which is exactly
why `orders.ott_payment_id` is persisted when the payment succeeds. The admin
order page offers a partial refund (amount in dollars, converted to cents) and a
refund-in-full, both rejected if they exceed `total_cents - refunded_cents`.

Every attempt is written to the `refunds` table with its gateway id and status;
successful refunds update `orders.refunded_cents` and flip the payment status to
`partial_refunded` or `refunded`.

Relevant documented errors: `20014` (refund greater than the amount paid),
`20019` (original payment not found), `20021` (non-captured transaction),
`20041` (already fully refunded).

---

## 8. Test cards

All sandbox card transactions must use OTT Pay's test cards. The full list,
including the Mastercard scenario cards for `transStatus` and error cases, is on
the **Admin → Settings** page and in the official
[test guide](https://apidocs.ottpay.com/api/online-scenario/local-card/3ds-payment-api/test-guide/).

The ones you will use most:

| Brand | Number | Expiry | CVV |
|---|---|---|---|
| Visa credit | `4000 0200 0000 0000` | 03/2030 | 737 |
| Visa debit | `4400 0000 0000 0008` | 03/2030 | 737 |
| Mastercard credit | `2222 4000 1000 0008` | 03/2030 | 737 |
| Mastercard debit | `2222 4000 6000 0007` | 03/2030 | 737 |
| American Express | `3741 0101 2180 018` | 03/2030 | 7373 |
| Discover | `6011 6011 6011 6611` | 03/2030 | 737 |
| JCB | `3569 9900 1009 5841` | 03/2030 | 737 |
| China UnionPay | `6243 0300 0000 0001` | 12/2029 | 737 |
| Diners | `3600 6666 3333 44` | 03/2030 | 737 |

**3-D Secure challenge password: `password`.** Any other value simulates a failed
authentication. In native app integrations the password is `1234`.

### Mock-mode cards

`PAYMENT_MODE=mock` needs no credentials and no network. The mock acquirer is
driven by the card number so you can rehearse every branch:

| Card | Behaviour |
|---|---|
| `5454 5454 5454 5454` | 3DS challenge → password `password` approves |
| `4000 0200 0000 0000` | frictionless approval, captured immediately |
| `5201 2812 6243 5268` | challenge, issuer refuses (`transStatus=N`) |
| `4000 0000 0000 0002` | declined — `20030 Payment failed` |
| `4000 0000 0000 0007` | declined — `20007 Insufficient balance` |
| `4000 0000 0000 0009` | declined — `20008 Unsupported card` |
| `5201 2829 9900 5515` | error — `50002 Timeout` |
| any other Luhn-valid card | frictionless approval |

On approval the mock posts a **genuine signed callback** to this shop's own
`/api/ottpay/callback`, encrypted with the same AES-128-ECB routine the real
gateway uses. That means decryption, de-duplication and reconciliation are
exercised on every mock payment — not stubbed out.

---

## 9. Card data handling

- The PAN and CVV2 are read from the checkout form, used to build the gateway
  request, and then discarded. They are written to no log, no database column and
  no error message.
- `redactForLog()` masks `accountNumber`, `cvn2`, `accountExpire` and `appKey`
  before anything is persisted in `payment_attempts.request_payload`.
- Only these survive: card brand (`ccType`), last four digits, the gateway
  `paymentId`, the gateway status and the raw (sanitised) response.
- `security.luhn()` and `security.expiryValid()` reject mistyped cards before the
  gateway is called, so the shopper gets an instant correction instead of a
  decline.
- Checkout is rate-limited per IP and protected by a CSRF token plus a
  same-origin check.

---

## 10. Verifying the integration

```bash
npm run smoke
```

runs 74 checks over the real HTTP surface, including:

- cart pricing is recalculated server-side and tax is correct;
- a bad CSRF token is rejected;
- an invalid card number and an invalid postal code are rejected;
- a declined card returns 402 and leaves the order **unpaid**;
- a valid card triggers the 3DS challenge, the challenge page renders, a wrong
  password fails, the correct password pays the order;
- the order is `paid` with a gateway `paymentId` after the callback;
- `MD5(md5 + signKey)` equals `BFE59D83C221F217` for the documented example;
- a payload round-trips through `encryptCallbackPayload` → `decryptCallback`;
- a malformed callback is acknowledged without crashing;
- partial and full refunds are accepted and reflected in the order status.

`npm run visual` additionally verifies the rendered result in headless Chrome.

---

## 11. Not implemented

OTT Pay also documents WeChat Pay and Alipay (in-app, H5, PC scan-code and
mini-program), UnionPay web payment and reverse payments. They share the same
token, error-handling and callback machinery, so adding one is a matter of a new
function in `server/ottpay.mjs` following `pay3ds()` as the template, plus a
scenario in `server/mock-ottpay.mjs`. Note that WeChat and Alipay have no sandbox
— OTT Pay provides a production endpoint for integration testing, and all test
transactions are real.
