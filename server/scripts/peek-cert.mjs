/**
 * Print the TLS certificate a host actually serves.
 *
 *   node server/scripts/peek-cert.mjs bridgeportglobalinc.com [127.0.0.1]
 *
 * The optional second argument connects to a fixed IP while keeping the real
 * hostname as SNI, which is how you reach a host your local resolver has not
 * caught up with — and, more usefully here, it separates "DNS is wrong" from
 * "the platform is not serving this hostname yet".
 */
import tls from 'node:tls';

const [host, ip] = process.argv.slice(2);
if (!host) {
  console.error('usage: node server/scripts/peek-cert.mjs <host> [ip]');
  process.exit(2);
}

const socket = tls.connect({
  host: ip || host,
  port: 443,
  servername: host,
  // A certificate that does not validate is still worth reading.
  rejectUnauthorized: false,
  timeout: 20000,
});

socket.on('secureConnect', () => {
  const cert = socket.getPeerCertificate();
  const alt = (cert.subjectaltname || '').split(', ').filter(Boolean);
  console.log(`  host        ${host}${ip ? ` (via ${ip})` : ''}`);
  console.log(`  subject     ${cert.subject?.CN}`);
  console.log(`  issuer      ${cert.issuer?.O} / ${cert.issuer?.CN}`);
  console.log(`  valid        ${cert.valid_from} → ${cert.valid_to}`);
  console.log(`  SAN         ${alt.join(' ') || '(none)'}`);
  console.log(`  covers host ${alt.some((n) => n === `DNS:${host}`) ? 'YES' : 'no — wildcard or mismatch'}`);
  socket.end();
});

socket.on('error', (err) => {
  console.error(`  ${host}: ${err.message}`);
  process.exitCode = 1;
});
