/* ==========================================================================
   Cha Yuan — payment result page
   After the 3-D Secure challenge the cardholder lands back here. We poll our
   own order status (which is driven by the OTT Pay callback) and offer a manual
   "check with the bank" action that re-queries the gateway directly.
   ========================================================================== */
(function () {
  'use strict';

  const CY = window.CY || (window.CY = {});

  CY.ready(function () {
    const root = document.querySelector('[data-result-page]');
    if (!root) return;

    const orderNumber = root.dataset.orderNumber;
    if (!orderNumber) return;

    const statusEl = root.querySelector('[data-result-status]');
    const detailEl = root.querySelector('[data-result-detail]');
    const stateEl = root.querySelector('[data-result-state]');
    const syncBtn = root.querySelector('[data-sync]');
    const icon = root.querySelector('[data-result-icon]');

    let attempts = 0;
    let settled = false;
    const MAX_ATTEMPTS = 12;

    const LABELS = {
      paid: { text: 'Payment received', detail: 'Your card was charged and the tea is being weighed out now.', cls: 'is-ok' },
      processing: { text: 'Preparing your order', detail: 'Payment received. We are packing your tea.', cls: 'is-ok' },
      shipped: { text: 'On its way', detail: 'Your parcel has left our tea room.', cls: 'is-ok' },
      delivered: { text: 'Delivered', detail: 'Enjoy the tea.', cls: 'is-ok' },
      awaiting_payment: { text: 'Waiting for the bank', detail: 'Your bank has not confirmed the payment yet. This usually takes a few seconds. If it does not resolve, check the basket and try again — you have not been charged twice.', cls: 'is-wait' },
      pending: { text: 'Payment not completed', detail: 'The payment did not go through. No money has left your account.', cls: 'is-bad' },
      cancelled: { text: 'Order cancelled', detail: 'This order was cancelled. Nothing was charged.', cls: 'is-bad' },
      refunded: { text: 'Refunded', detail: 'This order has been refunded.', cls: 'is-ok' },
    };

    function apply(order) {
      const view = LABELS[order.status] || {
        text: 'Order received',
        detail: `Status: ${order.status}`,
        cls: 'is-wait',
      };
      if (statusEl) statusEl.textContent = view.text;
      if (detailEl) detailEl.textContent = view.detail;
      if (stateEl) stateEl.innerHTML = `<span class="status-pill status-${CY.escape(order.status)}">${CY.escape(order.status.replace(/_/g, ' '))}</span>`;
      if (icon) {
        icon.className = `result-icon ${view.cls}`;
        icon.innerHTML =
          view.cls === 'is-ok'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg>'
            : view.cls === 'is-bad'
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12a9 9 0 1 1-6.2-8.6"/><path d="M21 3v6h-6"/></svg>';
      }

      const terminal = ['paid', 'processing', 'shipped', 'delivered', 'pending', 'cancelled', 'refunded'];
      if (terminal.includes(order.status)) {
        settled = true;
        if (syncBtn) syncBtn.hidden = true;
      }
      if (order.paymentId && detailEl && !detailEl.dataset.filled) {
        detailEl.dataset.filled = '1';
      }
    }

    async function poll() {
      if (settled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      try {
        const { ok, data } = await CY.api(`/api/orders/${encodeURIComponent(orderNumber)}/status`);
        if (ok && data) apply(data);
      } catch {
        /* keep polling */
      }
      if (!settled && attempts < MAX_ATTEMPTS) {
        setTimeout(poll, attempts < 4 ? 2000 : 4000);
      }
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.classList.add('is-busy');
        const { ok, data } = await CY.api(`/api/orders/${encodeURIComponent(orderNumber)}/sync`, { method: 'POST', body: {} });
        syncBtn.classList.remove('is-busy');
        if (ok && data) {
          apply({ status: data.status, paymentId: data.gateway?.paymentId });
          CY.toast('Checked with the gateway.', { type: 'success' });
        } else {
          CY.toast(data?.message || 'Could not reach the payment gateway.', { type: 'error' });
        }
      });
    }

    // Only poll while the bank has not answered yet.
    const current = (statusEl?.textContent || '').toLowerCase();
    if (!current.includes('received') && !current.includes('preparing')) poll();

    // A mock-mode shortcut so the whole 3DS flow can be demonstrated.
    const mockNote = root.querySelector('[data-mock-note]');
    if (mockNote && CY.runtime.isMock) mockNote.hidden = false;
  });
})();
