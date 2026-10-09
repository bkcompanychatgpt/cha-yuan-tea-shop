/* ==========================================================================
   Cha Yuan — shared browser utilities
   ========================================================================== */
(function () {
  'use strict';

  const CY = (window.CY = window.CY || {});

  /* -------------------------------------------------------------- config */
  CY.runtime = {
    currencySymbol: '$',
    csrfToken: '',
    isMock: true,
    kountEnabled: false,
    kountClientId: '',
    kountEnvironment: 'TEST',
    freeShippingThreshold: 7900,
    taxRate: 0.13,
    taxLabel: 'HST (13%)',
  };

  /* ------------------------------------------------------------ utilities */
  CY.money = function money(cents) {
    const value = (Number(cents) || 0) / 100;
    return `${CY.runtime.currencySymbol}${value.toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  CY.escape = function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  CY.debounce = function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  CY.qs = (sel, root) => (root || document).querySelector(sel);
  CY.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* --------------------------------------------------------------- toast */
  function toastStack() {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  CY.toast = function toast(message, { type = 'info', timeout = 4200 } = {}) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<div class="grow">${CY.escape(message)}</div>`;
    toastStack().appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    }, timeout);
    return el;
  };

  /* ----------------------------------------------------------------- api */
  CY.api = async function api(path, { method = 'GET', body = null, headers = {} } = {}) {
    const options = {
      method,
      headers: { Accept: 'application/json', ...headers },
      credentials: 'same-origin',
    };
    if (body !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = CY.runtime.csrfToken;
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return { ok: response.ok, status: response.status, data: payload };
  };

  /* ----------------------------------------------------------------- boot */
  CY.ready = function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  CY.bootRuntime = async function bootRuntime() {
    try {
      const { ok, data } = await CY.api('/api/config');
      if (ok && data) {
        Object.assign(CY.runtime, {
          currencySymbol: data.store.currencySymbol,
          freeShippingThreshold: data.store.freeShippingThreshold,
          taxRate: data.store.taxRate,
          taxLabel: data.store.taxLabel,
          isMock: data.payment.isMock,
          paymentMode: data.payment.mode,
          kountEnabled: data.payment.kountEnabled,
          kountClientId: data.payment.kountClientId,
          kountEnvironment: data.payment.kountEnvironment,
          csrfToken: data.csrfToken,
        });
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) meta.setAttribute('content', data.csrfToken);
      }
    } catch {
      /* Offline or blocked — the page still renders. */
    }
    document.dispatchEvent(new CustomEvent('cy:runtime'));
  };

  /* ------------------------------------------------------- header / chrome */
  CY.initChrome = function initChrome() {
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const mobileNav = document.getElementById('mobile-nav');
    const scrim = document.getElementById('drawer-scrim');

    function openMobileNav(open) {
      if (!mobileNav) return;
      mobileNav.classList.toggle('is-open', open);
      mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (scrim) scrim.classList.toggle('is-open', open || document.getElementById('cart-drawer')?.classList.contains('is-open'));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    CY.qsa('[data-open-nav]').forEach((btn) => btn.addEventListener('click', () => openMobileNav(true)));
    CY.qsa('[data-close-nav]').forEach((btn) => btn.addEventListener('click', () => openMobileNav(false)));

    /* Accordions */
    CY.qsa('.acc-head').forEach((head) => {
      head.addEventListener('click', () => {
        const item = head.closest('.acc-item');
        const open = item.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    /* Product tab thumbnails */
    CY.qsa('[data-pdp-thumb]').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const main = document.querySelector('[data-pdp-main] img');
        if (!main) return;
        main.src = thumb.dataset.src;
        main.alt = thumb.dataset.alt || main.alt;
        CY.qsa('[data-pdp-thumb]').forEach((t) => t.classList.toggle('is-active', t === thumb));
      });
    });

    /* Quantity steppers not bound by the cart module */
    CY.qsa('[data-qty]').forEach((wrap) => {
      const input = wrap.querySelector('input');
      if (!input) return;
      wrap.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const step = Number(btn.dataset.step || 1);
          const min = Number(input.min || 1);
          const max = Number(input.max || 99);
          const next = Math.min(max, Math.max(min, (Number(input.value) || min) + step));
          input.value = next;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });

    if (scrim) {
      scrim.addEventListener('click', () => {
        openMobileNav(false);
        if (CY.cart) CY.cart.closeDrawer();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      openMobileNav(false);
      if (CY.cart) CY.cart.closeDrawer();
      if (CY.search) CY.search.close();
    });
  };

  /* -------------------------------------------------------- search overlay */
  CY.initSearch = function initSearch() {
    const panel = document.getElementById('search-panel');
    if (!panel) return;

    const form = panel.querySelector('form');
    const input = panel.querySelector('input[type="search"]');
    const results = panel.querySelector('.search-results');
    let index = null;

    function open(openState) {
      panel.classList.toggle('is-open', openState);
      panel.setAttribute('aria-hidden', openState ? 'false' : 'true');
      document.body.style.overflow = openState ? 'hidden' : '';
      if (openState && input) setTimeout(() => input.focus(), 40);
    }

    CY.search = { open: () => open(true), close: () => open(false) };

    CY.qsa('[data-open-search]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        open(true);
      }),
    );
    CY.qsa('[data-close-search]').forEach((btn) => btn.addEventListener('click', () => open(false)));

    async function ensureIndex() {
      if (index) return index;
      const { ok, data } = await CY.api('/api/search-index');
      index = ok ? data : { products: [], guides: [], categories: [] };
      return index;
    }

    const run = CY.debounce(async (raw) => {
      const term = String(raw || '').trim().toLowerCase();
      if (!results) return;
      if (term.length < 2) {
        results.innerHTML = '';
        return;
      }
      const data = await ensureIndex();
      const products = data.products
        .filter((p) => `${p.name} ${p.subtitle || ''} ${p.tea_family || ''}`.toLowerCase().includes(term))
        .slice(0, 6);
      const guides = (data.guides || [])
        .filter((g) => `${g.title} ${g.summary || ''}`.toLowerCase().includes(term))
        .slice(0, 3);

      if (!products.length && !guides.length) {
        results.innerHTML = `<p class="muted small" style="padding:14px 12px">No tea matches “${CY.escape(raw)}”. Try “oolong”, “pu-erh” or “jasmine”.</p>`;
        return;
      }

      results.innerHTML =
        products
          .map(
            (p) => `<a class="search-result" href="/tea/${encodeURIComponent(p.slug)}">
              <img src="${CY.escape(p.hero_image)}" alt="" />
              <div class="grow">
                <h5>${CY.escape(p.name)}</h5>
                <div class="tiny faint">${CY.escape(p.tea_family || '')}</div>
              </div>
              <div class="price small">from ${CY.money(p.price_from)}</div>
            </a>`,
          )
          .join('') +
        guides
          .map(
            (g) => `<a class="search-result" href="/guides/${encodeURIComponent(g.slug)}">
              <div style="display:grid;place-items:center;aspect-ratio:1;border:1px solid var(--line-soft);font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-300)">Guide</div>
              <div class="grow"><h5>${CY.escape(g.title)}</h5><div class="tiny faint">Guide</div></div>
            </a>`,
          )
          .join('');
    }, 140);

    if (input) input.addEventListener('input', (e) => run(e.target.value));
    if (form) form.addEventListener('submit', (e) => e.preventDefault());
  };

  /* ---------------------------------------------------- KOUNT device data */
  /**
   * OTT Pay activates KOUNT for every account. The web client SDK collects a
   * device fingerprint and we send the resulting session ID as `sessionId` on
   * the payment request. When KOUNT_CLIENT_ID is unset we fall back to a locally
   * generated session ID, which is what the gateway needs at minimum.
   */
  CY.deviceData = {
    sessionId: '',

    generate() {
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      return `cy-${Date.now()}-${rand}`.slice(0, 32);
    },

    async collect() {
      if (this.sessionId) return this.sessionId;
      this.sessionId = this.generate();

      if (!CY.runtime.kountEnabled || !CY.runtime.kountClientId) return this.sessionId;

      const clientId = CY.runtime.kountClientId.trim();
      const environment = CY.runtime.kountEnvironment || 'TEST';
      try {
        // The SDK is published as an ES module with a UMD fallback.
        const mod = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/@kount/kount-web-client-sdk@latest/dist/kount-web-client-sdk.min.js');
        const sdk = mod.default || mod;
        if (typeof sdk === 'function') {
          sdk({ clientID: clientId, environment, isSinglePageApp: false }, this.sessionId);
        }
      } catch {
        // SDK unavailable — a locally generated session ID is still valid.
      }
      return this.sessionId;
    },
  };

  /* ------------------------------------------------------ browser details */
  CY.browserFingerprint = function browserFingerprint() {
    const nav = window.navigator || {};
    const screen_ = window.screen || {};
    return {
      userAgent: nav.userAgent || '',
      acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      language: nav.language || 'en-CA',
      javaScriptEnabled: true,
      screenHeight: screen_.height || '',
      screenWidth: screen_.width || '',
      timezoneOffset: -new Date().getTimezoneOffset() / 60,
      colorDepth: screen_.colorDepth || 24,
    };
  };
})();
