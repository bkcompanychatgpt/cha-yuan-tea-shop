/**
 * Validate render.yaml before it costs you a deploy.
 *
 * Parses the blueprint with the `yaml` package and checks the things that are
 * easy to get subtly wrong and expensive to discover late:
 *
 *   - DATABASE_FILE must sit inside the mounted disk, or every deploy silently
 *     starts over with an empty database;
 *   - HOST must be 0.0.0.0, or Render cannot reach the service at all;
 *   - no secret may have a literal value in a committed file;
 *   - a real PAYMENT_MODE must declare the credentials it needs, since the app
 *     refuses to boot without them.
 *
 *   node server/scripts/check-render.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'render.yaml');

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('\nrender.yaml check\n');

if (!fs.existsSync(FILE)) {
  console.error('  render.yaml not found');
  process.exit(1);
}

let doc;
try {
  doc = YAML.parse(fs.readFileSync(FILE, 'utf8'));
} catch (err) {
  console.error(`  \u001b[31mFAIL\u001b[0m  could not parse — ${err.message}`);
  process.exit(1);
}

check(Array.isArray(doc.services) && doc.services.length > 0, 'parses and declares a services list');

const svc = Array.isArray(doc.services) ? doc.services[0] : null;
if (!svc) {
  check(false, 'could not read the first service entry');
} else {
  check(svc.type === 'web', 'service type is web', String(svc.type));
  check(svc.runtime === 'node', 'runtime is node', String(svc.runtime));
  check(typeof svc.buildCommand === 'string' && svc.buildCommand.includes('npm'), 'has a build command', svc.buildCommand);
  check(typeof svc.startCommand === 'string' && svc.startCommand.includes('npm start'), 'has a start command', svc.startCommand);
  check(svc.healthCheckPath === '/healthz', 'health check points at /healthz', String(svc.healthCheckPath));
  check(svc.autoDeploy === true, 'autoDeploy is on');
  check(['free', 'starter', 'standard', 'pro'].includes(svc.plan), 'plan is a recognised instance type', String(svc.plan));

  const disk = svc.disk;
  check(Boolean(disk?.mountPath), 'declares a persistent disk', disk?.mountPath ?? 'none');

  const envVars = Array.isArray(svc.envVars) ? svc.envVars.filter(Boolean) : [];
  const byKey = Object.fromEntries(envVars.filter((e) => e.key).map((e) => [e.key, e]));
  check(envVars.length > 0, 'declares environment variables', `${envVars.length} entries`);

  check(byKey.NODE_ENV?.value === 'production', 'sets NODE_ENV=production', String(byKey.NODE_ENV?.value));
  check(byKey.HOST?.value === '0.0.0.0', 'binds HOST=0.0.0.0 so Render can reach it', String(byKey.HOST?.value));
  check(String(byKey.TRUST_PROXY?.value) === '1', 'trusts the proxy for real client IPs', String(byKey.TRUST_PROXY?.value));
  check(byKey.SESSION_SECRET?.generateValue === true, 'generates SESSION_SECRET');

  check(Boolean(byKey.ADMIN_EMAIL) && Boolean(byKey.ADMIN_PASSWORD), 'asks for back-office credentials rather than defaulting');
  check(byKey.ADMIN_EMAIL?.sync === false && byKey.ADMIN_PASSWORD?.sync === false, 'back-office credentials are operator-supplied (sync: false)');

  // The single most expensive mistake: a database outside the disk.
  const dbFile = String(byKey.DATABASE_FILE?.value ?? '');
  const mount = String(disk?.mountPath ?? '');
  check(
    dbFile !== '' && mount !== '' && dbFile.startsWith(mount),
    'DATABASE_FILE sits on the mounted disk',
    dbFile && mount ? `${dbFile} under ${mount}` : `DATABASE_FILE="${dbFile}", mountPath="${mount}"`,
  );

  const mode = String(byKey.PAYMENT_MODE?.value ?? '(unset)');
  const credentialKeys = ['OTT_APP_ID', 'OTT_APP_KEY', 'OTT_SIGN_KEY', 'OTT_MERCHANT_ID'];
  if (mode !== 'mock') {
    check(
      credentialKeys.every((k) => byKey[k]?.sync === false),
      `payment mode "${mode}" requires all OTT_* keys to be declared for the operator`,
    );
  } else {
    check(
      credentialKeys.every((k) => byKey[k]?.sync === false),
      'starts in mock mode, with gateway credentials optional',
    );
  }

  const expectedKeys = ['PUBLIC_BASE_URL', 'KOUNT_CLIENT_ID', ...credentialKeys];
  const missing = expectedKeys.filter((k) => !byKey[k]);
  check(missing.length === 0, 'every operator-supplied key is declared', missing.length ? `missing ${missing.join(', ')}` : '');

  // A secret committed as a literal is a leak waiting to happen.
  const literalSecrets = envVars.filter(
    (e) => /(SIGN_KEY|APP_KEY|PASSWORD|SECRET|TOKEN|CLIENT_ID)/i.test(e.key) && 'value' in e,
  );
  check(literalSecrets.length === 0, 'no secret has a literal value in the blueprint', literalSecrets.map((e) => e.key).join(', '));

  // Every env key the app reads should be present here, or a deploy silently
  // falls back to a development default.
  //
  // Some keys are fine to omit because config.mjs supplies a production-suitable
  // default: the OTT endpoint hosts, the token timings, and PORT (which Render
  // injects itself). The rest must be explicit, because their development
  // defaults are wrong in production — HOST would bind to localhost,
  // DATABASE_FILE would point outside the disk.
  const OPTIONAL_IN_BLUEPRINT = new Set([
    'PORT',
    'OTT_SANDBOX_BASE_URL',
    'OTT_LIVE_BASE_URL',
    'OTT_TOKEN_TTL_SECONDS',
    'OTT_TOKEN_REFRESH_SKEW_SECONDS',
    'OTT_HTTP_TIMEOUT_MS',
    'KOUNT_ENVIRONMENT',
  ]);

  const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  const declaredInExample = [...envExample.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]);
  const notInBlueprint = declaredInExample.filter((k) => !(k in byKey) && !OPTIONAL_IN_BLUEPRINT.has(k));
  check(
    notInBlueprint.length === 0,
    'every key without a safe default is declared in the blueprint',
    notInBlueprint.length ? `missing ${notInBlueprint.join(', ')}` : '',
  );
}

console.log(`\n${'-'.repeat(58)}`);
console.log(`  ${failures === 0 ? 'PASS' : 'FAIL'}  ${failures} problem(s)\n`);
process.exit(failures ? 1 : 0);
