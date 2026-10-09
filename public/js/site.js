/* ==========================================================================
   Cha Yuan — page-level enhancements
   ========================================================================== */
(function () {
  'use strict';

  const CY = window.CY || (window.CY = {});

  /* ------------------------------------------------------------ newsletter */
  CY.ready(function () {
    const form = document.querySelector('[data-newsletter]');
    if (form) {
      const status = document.querySelector('[data-newsletter-status]');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = form.querySelector('input[name="email"]').value.trim();
        const button = form.querySelector('button');
        button.classList.add('is-busy');
        button.disabled = true;
        const { ok, data } = await CY.api('/api/newsletter', { method: 'POST', body: { email } });
        button.classList.remove('is-busy');
        button.disabled = false;
        if (status) {
          status.textContent = ok ? data.message : data?.message || 'Could not subscribe right now.';
          status.className = ok ? 'tiny gold' : 'tiny';
          status.style.color = ok ? '' : 'var(--danger)';
        }
        if (ok) form.reset();
      });
    }

    /* ------------------------------------------------------- shop filters */
    const sortSelect = document.querySelector('[data-auto-submit]');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => sortSelect.closest('form').submit());
    }

    /* --------------------------------------------------- product variant pick */
    const picker = document.querySelector('[data-variant-picker]');
    if (picker) {
      const priceHost = document.querySelector('[data-pdp-price]');
      const compareHost = document.querySelector('[data-pdp-compare]');
      const addBtn = document.querySelector('[data-pdp-add]');
      const stockHost = document.querySelector('[data-pdp-stock]');
      const qtyInput = document.querySelector('[data-pdp-qty] input');

      function select(button) {
        picker.querySelectorAll('.variant').forEach((b) => {
          b.classList.toggle('is-active', b === button);
          b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
        });
        const price = Number(button.dataset.price);
        const compare = Number(button.dataset.compare || 0);
        const stock = Number(button.dataset.stock || 0);

        if (priceHost) priceHost.textContent = CY.money(price);
        if (compareHost) {
          compareHost.textContent = compare > price ? CY.money(compare) : '';
          compareHost.style.display = compare > price ? '' : 'none';
        }
        if (stockHost) {
          stockHost.innerHTML =
            stock <= 0
              ? '<span style="color:var(--danger)">Out of stock in this size</span>'
              : stock <= 5
                ? `<span style="color:var(--warn)">Only ${stock} left</span>`
                : `<span style="color:var(--success)">In stock — ships within 1 business day</span>`;
        }
        if (addBtn) {
          addBtn.dataset.variantId = button.dataset.variantId;
          addBtn.dataset.variantLabel = button.dataset.label;
          addBtn.dataset.priceCents = String(price);
          addBtn.dataset.stock = String(stock);
          addBtn.disabled = stock <= 0;
          addBtn.textContent = stock <= 0 ? 'Out of stock' : `Add to basket — ${CY.money(price)}`;
        }
        if (qtyInput) {
          qtyInput.max = stock > 0 ? Math.min(stock, 99) : 1;
          if (Number(qtyInput.value) > Number(qtyInput.max)) qtyInput.value = qtyInput.max;
        }
      }

      picker.querySelectorAll('.variant').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.disabled) return;
          select(button);
        });
      });
      const initial = picker.querySelector('.variant.is-active') || picker.querySelector('.variant:not([disabled])');
      if (initial) select(initial);

      // Quantity feeds the add button.
      if (qtyInput && addBtn) {
        qtyInput.addEventListener('change', () => {
          addBtn.dataset.quantity = String(Math.max(1, Number(qtyInput.value) || 1));
        });
      }
    }

    /* ------------------------------------------------------- faq accordion */
    CY.qsa('.faq-q').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const open = item.classList.toggle('is-open');
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    /* ------------------------------------------------------------ wishlist */
    const WISH_KEY = 'cy_wishlist_v1';
    let wishlist = [];
    try {
      wishlist = JSON.parse(window.localStorage.getItem(WISH_KEY) || '[]') || [];
    } catch {
      wishlist = [];
    }

    function paintWishlist() {
      CY.qsa('[data-wishlist]').forEach((button) => {
        const on = wishlist.includes(button.dataset.wishlist);
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-wishlist]');
      if (!button) return;
      event.preventDefault();
      const slug = button.dataset.wishlist;
      const index = wishlist.indexOf(slug);
      if (index === -1) {
        wishlist.push(slug);
        CY.toast('Saved to your list.', { type: 'success' });
      } else {
        wishlist.splice(index, 1);
        CY.toast('Removed from your list.');
      }
      try {
        window.localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
      } catch {
        /* private mode — the list stays in memory for this page */
      }
      paintWishlist();
    });
    paintWishlist();

    /* --------------------------------------------------------- order lookup */
    const orderForm = document.querySelector('[data-order-lookup]');
    if (orderForm) {
      orderForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const number = orderForm.elements.orderNumber.value.trim().toUpperCase();
        const email = orderForm.elements.email ? orderForm.elements.email.value.trim() : '';
        if (!number) return;
        window.location.href = `/order/${encodeURIComponent(number)}${email ? `?email=${encodeURIComponent(email)}` : ''}`;
      });
    }

    /* ----------------------------------------------------- sticky buy bar */
    const stickyAdd = document.querySelector('[data-sticky-add]');
    if (stickyAdd) {
      const bar = document.querySelector('[data-sticky-buy]');
      // The floating bar duplicates the live selection so the price shown
      // matches whichever size is currently chosen.
      function syncSticky(button) {
        if (!bar) return;
        const target = bar.querySelector('[data-sticky-button]');
        if (!target) return;
        Object.assign(target.dataset, {
          variantId: button.dataset.variantId,
          variantLabel: button.dataset.variantLabel,
          priceCents: button.dataset.priceCents,
          stock: button.dataset.stock,
          quantity: button.dataset.quantity || '1',
          slug: button.dataset.slug,
          name: button.dataset.name,
          image: button.dataset.image,
        });
        const label = bar.querySelector('[data-sticky-label]');
        if (label) label.textContent = `${button.dataset.variantLabel} — ${CY.money(Number(button.dataset.priceCents) * Number(button.dataset.quantity || 1))}`;
      }

      const observer = new MutationObserver(() => syncSticky(stickyAdd));
      observer.observe(stickyAdd, { attributes: true, attributeFilter: ['data-variant-id', 'data-price-cents', 'data-quantity'] });

      const onScroll = () => {
        if (bar) bar.classList.toggle('is-visible', window.scrollY > 620);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* ------------------------------------------------ free-shipping nudge */
    CY.qsa('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy);
          CY.toast('Copied.', { type: 'success' });
        } catch {
          CY.toast('Could not copy — select the text manually.', { type: 'error' });
        }
      });
    });
  });
})();
