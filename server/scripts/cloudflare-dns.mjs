/**
 * Point a Cloudflare zone at this shop, and set up its mail.
 *
 *   node server/scripts/cloudflare-dns.mjs --zone bridgeportglobalinc.com            # show what it would do
 *   node server/scripts/cloudflare-dns.mjs --zone bridgeportglobalinc.com --apply     # write it
 *
 * Needs a Cloudflare API token with **Zone → DNS → Edit** on the account, and
 * (for the zone lookup) **Zone → Zone → Read**. Export it, do not paste it into a
 * command line where it lands in shell history:
 *
 *   $env:CLOUDFLARE_API_TOKEN = "..."      # PowerShell
 *
 * Why a script rather than a runbook of eight clicks: four of these records fail
 * silently if they are wrong. A proxied apex CNAME produced `error code: 1000`
 * and took the previous domain off the air; a proxied DKIM CNAME breaks signing on
 * outgoing mail, which shows up as spam filtering days later; a second SPF record
 * is a permanent fail rather than an override. All four are one flag in a console,
 * and none of them are visible in the result.
 *
 * The records, and what each one is for:
 *
 *   A     @               216.24.57.1                      the site, DNS only
 *   CNAME www             <the onrender.com hostname>      the site, DNS only
 *   MX    @               us1/us2-smtp.messagingengine.com mail arrives
 *   TXT   @               v=spf1 include:spf...            mail is allowed to leave
 *   CNAME fm1..3._domainkey  fm<n>.<zone>.dkim.fmhosted.com mail is signed
 *   TXT   _dmarc          p=none + rua=mailto:support@...  failures are reported
 *
 * The mail values are copied from the domain this shop previously ran on (they
 * were read back out of DNS, not from memory: the hosts are `us1-smtp`, with a
 * hyphen, and getting that wrong means mail silently queues nowhere).
 *
 * `216.24.57.1` is Render's edge for an apex, not this shop's address: Render puts
 * every service behind Cloudflare, and a CNAME at the apex cannot be used because
 * that is what produced the `1000` error before. Override with RENDER_APEX_IP if
 * Render ever tells you a different one.
 */
import { parseArgs } from 'node:util';

const API = 'https://api.cloudflare.com/client/v4';

const { values: args } = parseArgs({
  options: {
    zone: { type: 'string' },
    apply: { type: 'boolean', default: false },
    host: { type: 'string' },
  },
});

const TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const ZONE_NAME = (args.zone || '').trim().toLowerCase();
const RENDER_HOST = (args.host || process.env.RENDER_HOST || 'cha-yuan-tea-shop.onrender.com').trim();
const RENDER_APEX_IP = (process.env.RENDER_APEX_IP || '216.24.57.1').trim();

if (!ZONE_NAME) {
  console.error('usage: node server/scripts/cloudflare-dns.mjs --zone <domain> [--apply] [--host <onrender host>]');
  process.exit(2);
}
if (!TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN is not set — see the header of this file.');
  process.exit(2);
}

async function cf(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const detail = (body.errors || []).map((e) => `${e.code} ${e.message}`).join('; ') || res.statusText;
    throw new Error(`${init?.method || 'GET'} ${path} — ${detail}`);
  }
  return body.result;
}

/*
 * `@` means the zone itself. Cloudflare stores that as the bare zone name, and
 * returns it that way, so records are compared by the expanded name.
 */
const expand = (name) => (name === '@' ? ZONE_NAME : `${name}.${ZONE_NAME}`);

/**
 * The records. `proxied: false` throughout: Render terminates TLS and its edge is
 * itself behind Cloudflare, so a second proxy hop only hides the client IP from
 * the app's rate limiter. Mail records cannot be proxied at all.
 */
const RECORDS = [
  {
    type: 'A',
    name: '@',
    content: RENDER_APEX_IP,
    proxied: false,
    comment: 'Render apex — DNS only, never a proxied CNAME',
  },
  {
    type: 'CNAME',
    name: 'www',
    content: RENDER_HOST,
    proxied: false,
    comment: 'Render www',
  },
  {
    type: 'MX',
    name: '@',
    content: 'us1-smtp.messagingengine.com',
    priority: 10,
    comment: 'Fastmail',
  },
  {
    type: 'MX',
    name: '@',
    content: 'us2-smtp.messagingengine.com',
    priority: 20,
    comment: 'Fastmail secondary',
  },
  {
    type: 'TXT',
    name: '@',
    content: `v=spf1 include:spf.messagingengine.com ?all`,
    comment: 'SPF — exactly one, ever',
  },
  ...[1, 2, 3].map((n) => ({
    type: 'CNAME',
    name: `fm${n}._domainkey`,
    content: `fm${n}.${ZONE_NAME}.dkim.fmhosted.com`,
    proxied: false,
    comment: `DKIM ${n} — if Fastmail shows a different target, use theirs`,
  })),
  {
    type: 'TXT',
    name: '_dmarc',
    // p=none reports without binning: a misconfiguration should show up in the
    // reports, not as silently discarded order mail.
    content: `v=DMARC1; p=none; rua=mailto:support@${ZONE_NAME}; fo=1`,
    comment: 'DMARC',
  },
];

console.log(`\n  zone   ${ZONE_NAME}`);
console.log(`  site   ${ZONE_NAME} → ${RENDER_APEX_IP}, www → ${RENDER_HOST}`);
console.log(`  mail   Fastmail MX + SPF + 3 DKIM + DMARC\n`);

const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
const zone = zones?.[0];
if (!zone) {
  console.error(`  no zone named ${ZONE_NAME} on this account/token.`);
  process.exit(1);
}

const existing = await cf(`/zones/${zone.id}/dns_records?per_page=200`);
console.log(`  ${existing.length} record(s) present before this run\n`);

let created = 0;
let updated = 0;
let unchanged = 0;
let failed = 0;

for (const record of RECORDS) {
  const body = { ...record, name: expand(record.name), ttl: 1 };
  /*
   * Match on type + name + (for MX) the host, because a zone legitimately holds
   * several MX rows at the same name and matching on name alone would rewrite the
   * primary record with the secondary one.
   */
  const same = existing.filter(
    (r) => r.type === record.type && r.name === body.name && (record.type !== 'MX' || r.content === record.content),
  );

  const current = same[0];
  const wanted = (r) =>
    record.type === 'MX'
      ? r.content === body.content && Number(r.priority) === Number(body.priority)
      : r.content === body.content;

  if (current && wanted(current) && current.proxied === body.proxied) {
    unchanged += 1;
    console.log(`  ok        ${record.type.padEnd(5)} ${record.name}`);
    continue;
  }

  try {
    if (current) {
      if (!args.apply) {
        updated += 1;
        console.log(`  would-fix ${record.type.padEnd(5)} ${record.name}  ${current.content} → ${body.content}`);
        continue;
      }
      await cf(`/zones/${zone.id}/dns_records/${current.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      updated += 1;
      console.log(`  fixed     ${record.type.padEnd(5)} ${record.name}  ${current.content} → ${body.content}`);
    } else {
      if (!args.apply) {
        created += 1;
        console.log(`  would-add ${record.type.padEnd(5)} ${record.name}  → ${body.content}`);
        continue;
      }
      await cf(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify(body) });
      created += 1;
      console.log(`  added     ${record.type.padEnd(5)} ${record.name}  → ${body.content}`);
    }
  } catch (err) {
    failed += 1;
    console.log(`  FAILED    ${record.type.padEnd(5)} ${record.name}  ${err.message}`);
  }
}

/*
 * A second SPF record is a permanent SPF fail, and Cloudflare will happily store
 * one. Catch it here rather than in a bounce a week later.
 */
const spf = existing.filter((r) => r.type === 'TXT' && r.name === ZONE_NAME && r.content.startsWith('v=spf1'));
if (spf.length > 1) {
  console.log(`\n  WARNING: ${spf.length} SPF records on ${ZONE_NAME} — delete all but one.`);
}

console.log(
  `\n  ${created} to add, ${updated} to fix, ${unchanged} already correct, ${failed} failed` +
    `${args.apply ? '' : '  — dry run, nothing written. Re-run with --apply.'}\n`,
);

if (args.apply && (created || updated)) {
  console.log('  Next: Render → Settings → Custom Domains → add the apex and www,');
  console.log(`  then set PUBLIC_BASE_URL=https://${ZONE_NAME} in the environment.\n`);
}
