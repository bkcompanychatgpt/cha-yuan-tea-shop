/**
 * Minimal Chrome DevTools Protocol driver.
 *
 * Headless Chrome refuses to open a window narrower than about 500px, so
 * `--window-size=390` silently yields a ~504px viewport — and a "phone" capture
 * that is really a small desktop one. Passing `--force-device-scale-factor` does
 * not help, because it scales pixels rather than changing the CSS viewport.
 *
 * The only reliable way to lay out at a chosen width is `Emulation
 * .setDeviceMetricsOverride` over the DevTools protocol, which is what this
 * module provides. Node ships a global WebSocket, so this needs no dependency.
 *
 *   const browser = await launch({ width: 390, height: 844, dpr: 3 });
 *   const { html } = await browser.capture(`${base}/dev/audit?path=/`);
 *   const png = await browser.screenshot(`${base}/`);
 *   await browser.close();
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findBrowser() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll the DevTools HTTP endpoint until Chrome is listening. */
async function waitForPort(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(120);
  }
  throw new Error(`Chrome DevTools did not become available on port ${port}`);
}

/** A connected CDP session over the browser-level WebSocket. */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.sessionId = null;
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}, useSession = true) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 60_000);
    });
  }
}

/**
 * Launch Chrome with a target attached and device metrics applied.
 *
 * @param {{width:number, height:number, dpr?:number, mobile?:boolean, userAgent?:string}} viewport
 */
export async function launch(viewport = {}) {
  const browser = findBrowser();
  if (!browser) throw new Error('No Chrome or Edge found');

  const width = viewport.width || 1440;
  const height = viewport.height || 900;
  const dpr = viewport.dpr || 1;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-cdp-'));
  const port = 9200 + Math.floor(Math.random() * 600);

  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const info = await waitForPort(port);

  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (e) => reject(new Error(`DevTools socket failed: ${e.message || 'error'}`)), { once: true });
  });

  const session = new Session(ws);

  // Attach to a page target and address subsequent commands to that session.
  const { targetInfos } = await session.send('Target.getTargets', {}, false);
  const page = targetInfos?.find((t) => t.type === 'page') || targetInfos?.[0];
  if (!page) throw new Error('Chrome exposed no page target');
  const attached = await session.send('Target.attachToTarget', { targetId: page.targetId, flatten: true }, false);
  session.sessionId = attached.sessionId;

  await session.send('Page.enable');
  await session.send('Runtime.enable');

  if (viewport.mobile) {
    await session.send('Emulation.setUserAgentOverride', {
      userAgent:
        viewport.userAgent ||
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }

  // This is the part `--window-size` cannot do: an exact CSS viewport.
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: Boolean(viewport.mobile),
  });

  /** Navigate and wait for the load event to settle. */
  async function goto(url, settleMs = 900) {
    const loaded = new Promise((resolve) => {
      const onMessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Page.loadEventFired') {
            session.ws.removeEventListener('message', onMessage);
            resolve();
          }
        } catch {
          /* ignore */
        }
      };
      session.ws.addEventListener('message', onMessage);
      setTimeout(() => {
        session.ws.removeEventListener('message', onMessage);
        resolve();
      }, 20_000);
    });
    await session.send('Page.navigate', { url });
    await loaded;
    // A short settle so lazy images and fonts land before measuring.
    await sleep(settleMs);
  }

  return {
    session,
    viewport: { width, height, dpr, mobile: Boolean(viewport.mobile) },

    goto,

    /** Navigate and return the fully rendered DOM as a string. */
    async capture(url) {
      await goto(url);
      const { result } = await session.send('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML',
        returnByValue: true,
      });
      return { html: result.value || '' };
    },

    /** Navigate and return a PNG buffer of the viewport. */
    async screenshot(url) {
      await goto(url);
      const { data } = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      return Buffer.from(data, 'base64');
    },

    /** Navigate and return a PNG buffer of the whole page. */
    async screenshotFullPage(url) {
      await goto(url);
      const { cssContentSize } = await session.send('Page.getLayoutMetrics');
      const { data } = await session.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: Math.min(cssContentSize.width, 2000),
          height: Math.min(cssContentSize.height, 12_000),
          scale: 1,
        },
      });
      return Buffer.from(data, 'base64');
    },

    /** Evaluate an expression in the page and return its value. */
    async evaluate(expression) {
      const { result } = await session.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return result.value;
    },

    async close() {
      try {
        ws.close();
      } catch {
        /* already closed */
      }
      child.kill();
      await sleep(120);
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    },
  };
}

/**
 * Run a callback against a browser at one viewport, always cleaning up.
 * @template T
 * @param {{width:number,height:number,dpr?:number,mobile?:boolean}} viewport
 * @param {(browser: Awaited<ReturnType<typeof launch>>) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withBrowser(viewport, fn) {
  const browser = await launch(viewport);
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export default { launch, withBrowser, findBrowser };
