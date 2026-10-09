# Deploying Cha Yuan

Two targets: **GitHub** for the code, **Render** to run it.

- [Before you push](#before-you-push)
- [GitHub](#github)
- [Render](#render)
- [The persistent disk, and what it costs](#the-persistent-disk-and-what-it-costs)
- [After the first deploy](#after-the-first-deploy)
- [Going live with OTT Pay](#going-live-with-ott-pay)

---

## Before you push

**No secrets are committed.** `.gitignore` excludes `.env`, `.env.local` and
`data/`, so credentials and the local database stay on your machine. What *is*
committed is `.env.example`, which contains placeholder values only — check it
before pushing if you ever add a credential there.

Verify that nothing sensitive is staged:

```bash
git status --short
git ls-files | grep -E '\.env$|shop\.db'   # must print nothing
```

---

## GitHub

```bash
git init -b main
git add .
git commit -m "Cha Yuan: premium Chinese tea storefront with OTT Pay checkout"
gh repo create cha-yuan-tea-shop --public --source=. --remote=origin --push
```

Use `--private` if you would rather the repository not be public. Render can
deploy from either.

The repository is about 28 MB, almost all of it the processed product photography
in `public/img/photos/`. The 430 MB of raw downloaded source images under
`data/photos/` are excluded and regenerated with `npm run photos:survey` when
needed.

---

## Render

There is a [`render.yaml`](../render.yaml) blueprint in the repository root.
Render reads it and creates the service, the disk and the environment variables.
Validate it locally first — `npm run check:render` catches a database path outside
the disk, a missing `HOST=0.0.0.0`, or a secret committed as a literal, all of
which are easy to get wrong and expensive to discover after a deploy.

1. Sign in at <https://dashboard.render.com>.
2. **New → Blueprint**.
3. Connect GitHub and pick this repository.
4. Render shows the resources it will create. It will prompt for the values marked
   `sync: false`:
   - `PUBLIC_BASE_URL` — you can leave this blank for the first deploy and fill it
     in afterwards
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` — **set real values**, they protect `/admin`
   - the four `OTT_*` values — leave blank while `PAYMENT_MODE=mock`
5. **Apply**. The first build takes a few minutes.
6. Note the URL Render assigns, e.g. `https://cha-yuan-tea-shop.onrender.com`.

If the very first deploy fails on the disk with an error about the instance type,
your account is on the Free plan — see the next section. Either upgrade, or switch
the blueprint to the free configuration described there and re-apply.

If you would rather create the service by hand instead of using the blueprint:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm ci --include=dev` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Instance type | Starter or above (see below) |

and add the environment variables listed in `render.yaml`.

---

## The persistent disk, and what it costs

This app stores everything in **SQLite**, which is a file. Render's free plan has
**no persistent disk**, so on the free plan that file is recreated empty on every
deploy, restart and idle spin-down:

- every order is lost
- the catalogue re-seeds itself, which is harmless
- **the admin password and `SESSION_SECRET` reset**, so anything you set is lost

The blueprint therefore requests `plan: starter` (currently about $7/month) plus
a 1 GB disk (`/var/data`, mounted into `DATABASE_FILE=/var/data/shop.db`). That is
the configuration that actually keeps your orders.

**If you want to start on the free plan anyway**, change `plan: starter` to
`plan: free` and delete the `disk:` block. The site will demo correctly and you
can take test payments, but treat every order as disposable until you move to a
paid instance. Do not take real money on it.

A third option, if you outgrow SQLite: Render offers managed PostgreSQL, and
`server/db.mjs` is the only file that talks to the database, so the swap is
contained — but it is a real piece of work, not a config change.

---

## After the first deploy

1. **Set `PUBLIC_BASE_URL`** to the service URL Render gave you, in
   *Dashboard → your service → Environment*. Without this, the 3-D Secure
   `frontURL` and the OTT Pay `callBackURL` point at `localhost` and payments
   cannot complete.
2. **Check the health endpoint:** `https://<your-service>.onrender.com/healthz`
   should return `{"status":"ok",...}`.
3. **Sign in to the back office** at `/admin` with the credentials you set, and
   change the password if you left it at a default.
4. **Confirm the catalogue seeded** — the dashboard shows product and order counts.
5. **Place a test order** end to end. In `mock` mode the built-in acquirer runs
   the whole flow, including the 3-D Secure challenge and the encrypted callback,
   so this proves the deployment before any real money is involved.

### Deploys

`autoDeploy: true` means every push to `main` redeploys. To deploy a change:

```bash
git add .
git commit -m "..."
git push
```

### Backups

The database is one file on the disk. Back it up periodically — Render's disk
snapshots are not a substitute for a copy you control:

```bash
# from a machine with the service's shell open, or via Render's shell tab
sqlite3 /var/data/shop.db ".backup /var/data/backup-$(date +%F).db"
```

---

## Going live with OTT Pay

While `PAYMENT_MODE=mock`, no network calls are made and no money can move. To
take real payments:

1. Put your sandbox credentials in the Render environment:
   `OTT_APP_ID`, `OTT_APP_KEY`, `OTT_SIGN_KEY`, `OTT_MERCHANT_ID`.
2. Set `PAYMENT_MODE=sandbox` and redeploy.
3. Confirm `PUBLIC_BASE_URL` is the public HTTPS URL, then tell OTT Pay that your
   callback endpoint is:

   ```
   https://<your-service>.onrender.com/api/ottpay/callback
   ```

4. Pay with OTT Pay's published test cards. The full list is on
   *Admin → Settings*, and the integration is documented in
   [`OTTPAY.md`](OTTPAY.md).
5. Watch *Admin → Payment callbacks* — every callback is logged with its
   decryption result, so a wrong `signKey` is visible immediately rather than
   showing up as a silently lost payment.
6. Only when sandbox payments reconcile cleanly, switch to `PAYMENT_MODE=live`
   with production credentials.
7. Put a custom domain on the service and update `PUBLIC_BASE_URL` to match — the
   callback URL must stay stable, because it is registered with OTT Pay.

### Custom domain

*Dashboard → your service → Settings → Custom Domains*. Render issues a
certificate automatically. Once it is live, update `PUBLIC_BASE_URL` and redeploy
so the callback and redirect URLs use the new hostname.
