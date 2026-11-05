# Email for northstarcart.com

The domain is at Cloudflare and the site is on Render. This file is the whole job,
in order, because the two halves — mail and DNS — fail in ways that look like each
other.

## What "bind the email to the website" actually means

Three separate things, and only one of them involves the site:

1. **A mailbox that can receive mail.** That is Fastmail plus five DNS records.
   The website is not involved at all.
2. **The address appearing on the site.** The site already prints it: `hello@` and
   `privacy@` come from `COMPANY_EMAIL` and `COMPANY_PRIVACY_EMAIL`, which are set
   to `hello@northstarcart.com` and `privacy@northstarcart.com` in `render.yaml`
   and in `server/config.mjs`. Change the mailbox name and both places change.
3. **The site sending mail to you.** It does not, and never has. There is no
   contact form; every "write to us" on the site is a `mailto:` link that opens the
   customer's own mail client. Nothing to configure, nothing to break.

If a contact form ever gets added, that is when SMTP credentials and an app
password come in. Not before.

## Step 1 — Fastmail

1. Sign up at <https://www.fastmail.com>. The **Standard** plan allows your own
   domain; the cheaper plan does not.
2. Fastmail asks for the domain, then shows you a set of DNS records. Leave that
   page open — the values below come from it, and it is the authoritative copy.
3. Create the mailboxes you will actually read. Two is the right number to start:
   - `hello@northstarcart.com` — everything, including orders
   - `privacy@northstarcart.com` — access and deletion requests, so they do not
     get lost in the general inbox
4. Optional but worth it: a **catch-all** so `orders@`, `returns@` and any typo
   still arrive somewhere instead of bouncing.

## Step 2 — Cloudflare DNS

In Cloudflare, pick `northstarcart.com` → **DNS** → **Records**. Add exactly what
Fastmail showed you, and nothing else. It is normally:

| Type | Name | Value | Notes |
| --- | --- | --- | --- |
| MX | `@` | `in1.messagingengine.com` | priority 10 |
| MX | `@` | `in2.messagingengine.com` | priority 20 |
| TXT | `@` | `v=spf1 include:spf.messagingengine.com ?all` | exactly one SPF record |
| CNAME | `fm1._domainkey` | `fm1.<yourdomain>.dkim.fmhosted.com` | |
| CNAME | `fm2._domainkey` | `fm2.<yourdomain>.dkim.fmhosted.com` | |
| CNAME | `fm3._domainkey` | `fm3.<yourdomain>.dkim.fmhosted.com` | |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hello@northstarcart.com` | |

Three things people get wrong here:

- **Cloudflare proxies orange clouds by default.** MX records cannot be proxied and
  Cloudflare handles that, but the `fm*._domainkey` CNAMEs must be **grey cloud
  (DNS only)**. A proxied DKIM record breaks signing, and signed mail failing is
  how a shop ends up in spam.
- **One SPF record only.** If a record starting `v=spf1` already exists, edit it
  rather than adding a second — two SPF records is a permanent fail.
- **Do not delete the existing A/CNAME records** that point the website at Render.
  This file is about mail; the site's own records are separate.

## Step 3 — Verify

Fastmail has a "Check domain" button that re-reads DNS. Use it, and do not assume
propagation: Cloudflare is usually instant, but give it a minute.

Then, from any mailbox that is not yours:

```
dig MX northstarcart.com +short
```

should list the two `messagingengine` hosts. Then send a real message to
`hello@northstarcart.com` from a Gmail or Outlook account and reply to it. A reply
that lands in the sender's inbox is the only proof that SPF and DKIM are both
right — receiving alone proves only the MX records.

## Step 4 — Tell the site (already done)

Nothing to do. The defaults in `server/config.mjs` and the values in `render.yaml`
already name these addresses, and `/contact`, the footer, `/privacy`, `/refund` and
`/terms` all read them from there.

If you ever use a different mailbox name:

```
COMPANY_EMAIL=hello@northstarcart.com
COMPANY_PRIVACY_EMAIL=privacy@northstarcart.com
```

## Step 5 — Point the site at the domain

Separate from email, and easy to forget:

1. **Render** → the service → *Settings* → *Custom Domains* → add
   `northstarcart.com` and `www.northstarcart.com`.
2. Render gives you a CNAME (usually `something.onrender.com`). Add it at Cloudflare.
3. **Set `PUBLIC_BASE_URL=https://northstarcart.com`** on Render. This is not
   cosmetic: it is the address the payment gateway posts its callback to, and while
   it still says `onrender.com` a payment can complete at the gateway while the shop
   never hears about it.
4. Update `PUBLIC_BASE_URL` in the gateway's own merchant settings as well, and in
   the registered callback URL. Both sides have to agree.

## What is deliberately not here

- **No catch-all forwarding to a personal Gmail.** Order confirmations, refunds and
  privacy requests would end up in a personal inbox with no retention policy.
- **No `p=none` DMARC.** With SPF and DKIM working there is no reason to publish a
  policy that tells receivers to ignore failures.
- **No mail-sending code in the app.** The site has no SMTP credentials and no
  mail library, which is one less secret to leak and one less thing to misconfigure.
