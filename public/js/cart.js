/* ==========================================================================
   Cha Yuan — basket
   The browser holds only variant ids and quantities. Every price, every total
   and every tax figure is recalculated by the server before an order exists,
   so a tampered localStorage entry cannot change what is charged.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'cy_cart_v1';
  const CY = window.CY || (window.CY = {});

  /** @type {Array<{variantId:number, slug:string, name:string, variantLabel:string, priceCents:number, quantity:number, image:string, stock:number}>} */
  let items = [];
  /** Server-authoritative pricing snapshot. */
  let totals = null;
  let listeners = [];

  /* ------------------------------------------------------------ persistence */

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      items = Array.isArray(parsed)
        ? parsed
            .filter((i) => i && Number(i.variantId) && Number(i.quantity) > 0)
            .map((i) => ({
              variantId: Number(i.variantId),
              slug: String(i.slug || ''),
              name: String(i.name || ''),
              variantLabel: String(i.variantLabel || ''),
              priceCents: Number(i.priceCents) || 0,
              quantity: Math.min(99, Math.max(1, Number(i.quantity) || 1)),
              image: String(i.image || ''),
              stock: Number(i.stock) || 0,
            }))
        : [];
    } catch {
      items = [];
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode — the basket stays in memory for this page only */
    }
  }

  /* ----------------------------------------------------------------- state */

  const state = {
    get items() {
      return items;
    },
    get count() {
      return items.reduce((n, i) => n + i.quantity, 0);
    },
    get subtotalCents() {
      return totals ? totals.subtotalCents : items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
    },
    get totals() {
      return totals;
    },
    lines() {
      return items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    },
    find(variantId) {
      return items.find((i) => i.variantId === Number(variantId));
    },
    add(item, quantity = 1) {
      const existing = state.find(item.variantId);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + quantity);
      } else {
        items.push({
          variantId: Number(item.variantId),
          slug: item.slug,
          name: item.name,
          variantLabel: item.variantLabel,
          priceCents: Number(item.priceCents) || 0,
          quantity: Math.max(1, quantity),
          image: item.image || '',
          stock: Number(item.stock) || 0,
        });
      }
      commit();
    },
    setQuantity(variantId, quantity) {
      const line = state.find(variantId);
      if (!line) return;
      const qty = Math.max(0, Math.min(99, Math.round(Number(quantity) || 0)));
      if (qty === 0) state.remove(variantId);
      else {
        line.quantity = qty;
        commit();
      }
    },
    remove(variantId) {
      items = items.filter((i) => i.variantId !== Number(variantId));
      commit();
    },
    clear() {
      items = [];
      totals = null;
      save();
      refresh({ price: false });
      emit();
    },
    onChange(fn) {
      listeners.push(fn);
    },
  };

  function emit() {
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        /* a broken listener must not break the basket */
      }
    });
  }

  function commit() {
    save();
    render();
    refresh();
    emit();
  }

  /* ------------------------------------------------------------------ API */

  async function refresh({ price = true } = {}) {
    if (!items.length) {
      totals = null;
      renderTotals();
      render();
      return;
    }
    if (!price) return;
    const { ok, data } = await CY.api('/api/cart/price', {
      method: 'POST',
      body: { items: state.lines(), shippingMethod: state.shippingMethod || 'standard' },
    });
    if (ok && data?.cart) {
      totals = data.cart;
      // Drop lines the server rejected (out of stock / removed).
      const validIds = new Set(totals.items.map((i) => i.variantId));
      if (validIds.size !== items.length) {
        items = items.filter((i) => validIds.has(i.variantId));
        save();
      }
      renderTotals();
      render();
      emit();
      if (totals.problems?.length) {
        totals.problems.forEach((p) => CY.toast(p.message, { type: 'error' }));
      }
    }
  }

  /* --------------------------------------------------------------- render */

  function renderBadge() {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      const n = state.count;
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n === 0;
    });
  }

  function lineTemplate(line) {
    const lineTotal = totals ? (totals.items.find((i) => i.variantId === line.variantId)?.lineTotalCents ?? line.priceCents * line.quantity) : line.priceCents * line.quantity;
    const max = line.stock > 0 ? Math.min(line.stock, 99) : 99;
    return `<div class="drawer-line" data-line="${line.variantId}">
      <a href="/tea/${encodeURIComponent(line.slug)}"><img src="${CY.escape(line.image)}" alt="${CY.escape(line.name)}" loading="lazy" /></a>
      <div class="stack-8">
        <div>
          <h5><a href="/tea/${encodeURIComponent(line.slug)}">${CY.escape(line.name)}</a></h5>
          <div class="tiny faint">${CY.escape(line.variantLabel)}</div>
        </div>
        <div class="row" style="gap:10px">
          <div class="qty" data-qty style="--qty-h:34px">
            <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
            <input type="number" value="${line.quantity}" min="0" max="${max}" data-qty-input aria-label="Quantity" style="height:34px;width:44px" />
            <button type="button" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="cart-line-remove" data-remove>Remove</button>
        </div>
      </div>
      <div class="price small nowrap">${CY.money(lineTotal)}</div>
    </div>`;
  }

  function renderDrawer() {
    const body = document.querySelector('[data-drawer-body]');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = `<div class="drawer-empty">
        <p class="eyebrow">Basket empty</p>
        <p style="margin-top:16px">Your basket is empty.</p>
        <a class="btn btn-sm" href="/shop" style="margin-top:20px">Browse the tea</a>
      </div>`;
      renderTotals();
      return;
    }
    body.innerHTML = items.map(lineTemplate).join('');

    // Bind line controls.
    body.querySelectorAll('[data-line]').forEach((row) => {
      const variantId = Number(row.dataset.line);
      row.querySelectorAll('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const line = state.find(variantId);
          if (!line) return;
          state.setQuantity(variantId, line.quantity + Number(btn.dataset.step));
        });
      });
      const input = row.querySelector('[data-qty-input]');
      if (input) {
        input.addEventListener('change', () => state.setQuantity(variantId, input.value));
      }
      const remove = row.querySelector('[data-remove]');
      if (remove) remove.addEventListener('click', () => state.remove(variantId));
    });

    renderTotals();
  }

  function renderTotals() {
    document.querySelectorAll('[data-cart-subtotal]').forEach((el) => {
      el.textContent = CY.money(state.subtotalCents);
    });
    document.querySelectorAll('[data-cart-count-label]').forEach((el) => {
      el.textContent = state.count === 1 ? '1 item' : `${state.count} items`;
    });

    const threshold = CY.runtime.freeShippingThreshold;
    document.querySelectorAll('[data-ship-meter]').forEach((meter) => {
      const remaining = Math.max(0, threshold - state.subtotalCents);
      const fill = meter.querySelector('[data-ship-fill]');
      const text = meter.querySelector('[data-ship-text]');
      if (fill) fill.style.width = `${Math.min(100, (state.subtotalCents / threshold) * 100)}%`;
      if (text) {
        text.innerHTML = remaining > 0
          ? `Add <strong class="gold">${CY.money(remaining)}</strong> for complimentary shipping`
          : '<strong class="gold">Complimentary shipping unlocked</strong>';
      }
    });

    if (totals) {
      document.querySelectorAll('[data-cart-tax]').forEach((el) => {
        el.textContent = CY.money(totals.taxCents);
      });
      document.querySelectorAll('[data-cart-shipping]').forEach((el) => {
        el.textContent = totals.shippingCents === 0 ? 'Complimentary' : CY.money(totals.shippingCents);
      });
      document.querySelectorAll('[data-cart-total]').forEach((el) => {
        el.textContent = CY.money(totals.totalCents);
      });
    }

    document.querySelectorAll('[data-cart-empty-hide]').forEach((el) => {
      el.style.display = items.length ? '' : 'none';
    });
    document.querySelectorAll('[data-cart-empty-show]').forEach((el) => {
      el.style.display = items.length ? 'none' : '';
    });
  }

  function renderCartPage() {
    const host = document.querySelector('[data-cart-page]');
    if (!host) return;

    if (!items.length) {
      host.innerHTML = `<div class="panel" style="text-align:center;padding:70px 30px">
        <p class="eyebrow">Basket empty</p>
        <h3 style="margin:20px 0 10px">Your basket is empty</h3>
        <p class="muted">Nothing chosen yet. Start with the six teas most people begin with.</p>
        <a class="btn" href="/shop" style="margin-top:24px">Browse all tea</a>
      </div>`;
      return;
    }

    host.innerHTML = items
      .map((line) => {
        const serverLine = totals?.items.find((i) => i.variantId === line.variantId);
        const lineTotal = serverLine ? serverLine.lineTotalCents : line.priceCents * line.quantity;
        const unit = serverLine ? serverLine.unitPriceCents : line.priceCents;
        return `<div class="cart-line" data-line="${line.variantId}">
        <a class="cart-line-media" href="/tea/${encodeURIComponent(line.slug)}">
          <img src="${CY.escape(line.image)}" alt="${CY.escape(line.name)}" />
        </a>
        <div class="stack-12">
          <div>
            <div class="cart-line-title"><a href="/tea/${encodeURIComponent(line.slug)}">${CY.escape(line.name)}</a></div>
            <div class="tiny faint" style="margin-top:4px">${CY.escape(line.variantLabel)} · ${CY.money(unit)} each</div>
          </div>
          <div class="row" style="gap:16px">
            <div class="qty" data-qty>
              <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
              <input type="number" value="${line.quantity}" min="0" max="${line.stock > 0 ? Math.min(line.stock, 99) : 99}" data-qty-input aria-label="Quantity for ${CY.escape(line.name)}" />
              <button type="button" data-step="1" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="cart-line-remove" data-remove>Remove</button>
          </div>
        </div>
        <div class="cart-line-price">${CY.money(lineTotal)}</div>
      </div>`;
      })
      .join('');

    host.querySelectorAll('[data-line]').forEach((row) => {
      const variantId = Number(row.dataset.line);
      row.querySelectorAll('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const line = state.find(variantId);
          if (!line) return;
          state.setQuantity(variantId, line.quantity + Number(btn.dataset.step));
          renderCartPage();
        });
      });
      const input = row.querySelector('[data-qty-input]');
      if (input) input.addEventListener('change', () => state.setQuantity(variantId, input.value));
      const remove = row.querySelector('[data-remove]');
      if (remove) {
        remove.addEventListener('click', () => {
          state.remove(variantId);
          renderCartPage();
          CY.toast('Removed from your basket.');
        });
      }
    });
  }

  function renderCheckoutSummary() {
    const host = document.querySelector('[data-checkout-lines]');
    if (!host) return;
    host.innerHTML = items
      .map((line) => {
        const lineTotal = (line.priceCents || 0) * line.quantity;
        return `<div class="row" style="gap:14px;padding:12px 0;border-bottom:1px solid var(--line-soft)">
        <img src="${CY.escape(line.image)}" alt="" style="width:52px;aspect-ratio:1;object-fit:cover;border:1px solid var(--line-soft)" />
        <div class="grow">
          <div style="font-size:0.9rem">${CY.escape(line.name)}</div>
          <div class="tiny faint">${CY.escape(line.variantLabel)} × ${line.quantity}</div>
        </div>
        <div class="mono small nowrap">${CY.money(lineTotal)}</div>
      </div>`;
      })
      .join('');

    if (totals) {
      document.querySelectorAll('[data-cart-subtotal]').forEach((el) => (el.textContent = CY.money(totals.subtotalCents)));
      document.querySelectorAll('[data-cart-shipping]').forEach((el) => {
        el.textContent = totals.shippingCents === 0 ? 'Complimentary' : CY.money(totals.shippingCents);
      });
      document.querySelectorAll('[data-cart-tax]').forEach((el) => (el.textContent = CY.money(totals.taxCents)));
      document.querySelectorAll('[data-cart-total]').forEach((el) => (el.textContent = CY.money(totals.totalCents)));
    }
  }

  function render() {
    renderBadge();
    renderDrawer();
    renderCartPage();
    renderCheckoutSummary();
  }

  /* --------------------------------------------------------------- drawer */

  function openDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const scrim = document.getElementById('drawer-scrim');
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (scrim) scrim.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const scrim = document.getElementById('drawer-scrim');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (scrim && !document.getElementById('mobile-nav')?.classList.contains('is-open')) {
      scrim.classList.remove('is-open');
    }
    document.body.style.overflow = '';
  }

  /* --------------------------------------------------------------- public */

  const cart = {
    state,
    openDrawer,
    closeDrawer,
    refresh,
    render,
    /** Add from any element carrying data-add-* attributes. */
    async addFromButton(btn) {
      const variantId = Number(btn.dataset.variantId);
      const quantity = Number(btn.dataset.quantity || 1);
      if (!variantId) return;
      const item = {
        variantId,
        slug: btn.dataset.slug,
        name: btn.dataset.name,
        variantLabel: btn.dataset.variantLabel,
        priceCents: Number(btn.dataset.priceCents || 0),
        image: btn.dataset.image,
        stock: Number(btn.dataset.stock || 0),
      };
      if (item.stock === 0) {
        CY.toast('That size is out of stock — try another.', { type: 'error' });
        return;
      }
      state.add(item, quantity);
      openDrawer();
      CY.toast(`${item.name} (${item.variantLabel}) added to your basket.`, { type: 'success' });
    },
  };

  CY.cart = cart;

  /* ----------------------------------------------------------- wiring */

  CY.ready(function () {
    load();
    render();

    CY.qsa('[data-open-cart]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
      }),
    );
    CY.qsa('[data-close-cart]').forEach((btn) => btn.addEventListener('click', closeDrawer));

    // Add-to-cart buttons (event delegation covers dynamically rendered cards).
    document.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-add-to-cart]');
      if (!btn) return;
      event.preventDefault();
      cart.addFromButton(btn);
    });

    CY.qsa('[data-goto-checkout]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!items.length) {
          CY.toast('Your basket is empty.', { type: 'error' });
          return;
        }
        window.location.href = '/checkout';
      }),
    );

    document.addEventListener('cy:runtime', () => refresh());
    refresh();
  });
})();
