# Email and DNS for bridgeportglobalinc.com

The domain is at Cloudflare and the site is on Render. This file is the whole job,
in order, because the two halves — mail and DNS — fail in ways that look like each
other.

Mail for the previous domain (`northstarcart.com`) was already running on this
setup. Nothing about the mail service has to be learned again: the same records go
on the new zone, with the domain name changed. The old zone can stay as it is until
you are sure nothing still writes to it.

## What "bind the email to the website" actually means

Three separate things, and only one of them involves the site:

1. **A mailbox that can receive mail.** That is Fastmail plus five DNS records.
   The website is not involved at all.
2. **The address appearing on the site.** The site already prints it: `support@`
   and `privacy@` come from `COMPANY_EMAIL` and `COMPANY_PRIVACY_EMAIL`, which are
   set to `support@bridgeportglobalinc.com` and `privacy@bridgeportglobalinc.com`
   in `render.yaml` and in `server/config.mjs`. Change the mailbox name and both
   places change.
3. **The site sending mail to you.** It does not, and never has. There is no
   contact form; every "write to us" on the site is a `mailto:` link that opens the
   customer's own mail client. Nothing to configure, nothing to break.

If a contact form ever gets added, that is when SMTP credentials and an app
password come in. Not before.

## Step 1 — Fastmail

1. Fastmail → *Settings* → *Domains* → **Add domain** →
   `bridgeportglobalinc.com`. The **Standard** plan allows your own domain; the
   cheaper plan does not.
2. Fastmail then shows the records it wants. Leave that page open — it is the
   authoritative copy, and the table below is only what it said last time.
3. Create the mailboxes you will actually read. Two is the right number to start:
   - `support@bridgeportglobalinc.com` — everything, including orders
   - `privacy@bridgeportglobalinc.com` — access and deletion requests, so they do
     not get lost in the general inbox
4. Optional but worth it: a **catch-all** so `orders@`, `returns@` and any typo
   still arrive somewhere instead of bouncing.

## Step 2 — Cloudflare DNS

In Cloudflare, pick `bridgeportglobalinc.com` → **DNS** → **Records**. Add exactly
what Fastmail showed you, and nothing else. These are the values in use on the
previous domain:

| Type | Name | Value | Notes |
| --- | --- | --- | --- |
| MX | `@` | `us1-smtp.messagingengine.com` | priority 10 |
| MX | `@` | `us2-smtp.messagingengine.com` | priority 20 |
| TXT | `@` | `v=spf1 include:spf.messagingengine.com ?all` | exactly one SPF record |
| CNAME | `fm1._domainkey` | `fm1.bridgeportglobalinc.com.dkim.fmhosted.com` | |
| CNAME | `fm2._domainkey` | `fm2.bridgeportglobalinc.com.dkim.fmhosted.com` | |
| CNAME | `fm3._domainkey` | `fm3.bridgeportglobalinc.com.dkim.fmhosted.com` | |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:support@bridgeportglobalinc.com; fo=1` | |

These are the values that were actually serving the previous domain — read back
out of DNS, not recalled. Note `us1-smtp` with a hyphen: `us1.smtp` is the format
most guides show and it is not what Fastmail assigned here.

If you would rather not click through the console, `server/scripts/cloudflare-dns.mjs`
writes all of it (site records too) from a `CLOUDFLARE_API_TOKEN`:

```
node server/scripts/cloudflare-dns.mjs --zone bridgeportglobalinc.com          # dry run
node server/scripts/cloudflare-dns.mjs --zone bridgeportglobalinc.com --apply
```

Three things people get wrong here:
- **Cloudflare proxies orange clouds by default.** MX records cannot be proxied and
  Cloudflare handles that, but the `fm*._domainkey` CNAMEs must be **grey cloud
  (DNS only)**. A proxied DKIM record breaks signing, and signed mail failing is
  how a shop ends up in spam.
- **One SPF record only.** If a record starting `v=spf1` already exists, edit it
  rather than adding a second — two SPF records is a permanent fail.
- **Do not delete the A/CNAME records** that point the website at Render. This file
  is about mail; the site's own records are in the next step and are separate.

`p=none` is deliberate for now: it reports without quarantining, so a
misconfiguration shows up in the reports instead of silently binning order mail.
Tighten it to `p=quarantine` once a fortnight of reports is clean.

## Step 3 — Verify

Fastmail has a "Check domain" button that re-reads DNS. Use it, and do not assume
propagation: Cloudflare is usually instant, but give it a minute.

Then, from any machine that is not yours:

```
dig MX bridgeportglobalinc.com +short
dig TXT _dmarc.bridgeportglobalinc.com +short
dig CNAME fm1._domainkey.bridgeportglobalinc.com +short
```

The first should list the two `messagingengine` hosts. Then send a real message to
`support@bridgeportglobalinc.com` from a Gmail or Outlook account and reply to it. A
reply that lands in the sender's inbox is the only proof that SPF and DKIM are both
right — receiving alone proves only the MX records.

## Step 4 — Tell the site (already done)

Nothing to do. The defaults in `server/config.mjs` and the values in `render.yaml`
already name these addresses, and `/contact`, the footer, `/privacy`, `/refund` and
`/terms` all read them from there.

If you ever use a different mailbox name, set both of these on Render:

```
COMPANY_EMAIL=support@bridgeportglobalinc.com
COMPANY_PRIVACY_EMAIL=privacy@bridgeportglobalinc.com
```

`npm test` fails if any page prints an address that is not one of those two, which
is what catches a stray `hello@` left behind by a rename.

## Step 5 — Point the site at the domain

Separate from email, and easy to forget:

1. **Render** → the service → *Settings* → *Custom Domains* → add
   `bridgeportglobalinc.com` and `www.bridgeportglobalinc.com`.
2. Render gives you the records to create. At Cloudflare they are:
   - apex `@` → **A** `216.24.57.1`, **DNS only**. Do *not* use a CNAME at the apex
     even though Cloudflare offers to flatten one — that produced a
     `error code: 1000` on the previous domain and the site was unreachable.
   - `www` → **CNAME** to the `onrender.com` hostname Render shows you, **DNS only**.
3. **Set `PUBLIC_BASE_URL=https://bridgeportglobalinc.com`** on Render. This is not
   cosmetic: it is the address the payment gateway posts its callback to, and while
   it still says `onrender.com` a payment can complete at the gateway while the shop
   never hears about it.
4. Update the callback URL in the gateway's own merchant settings as well. Both
   sides have to agree, so change them in the same sitting.

## What is deliberately not here

- **No catch-all forwarding to a personal Gmail.** Order confirmations, refunds and
  privacy requests would end up in a personal inbox with no retention policy.
- **No mail-sending code in the app.** The site has no SMTP credentials and no
  mail library, which is one less secret to leak and one less thing to misconfigure.
- **No redirect from the old domain.** The old zone is being retired rather than
  parked: a 301 would need both domains attached to the same Render service
  indefinitely, and there is nothing indexed worth preserving.
