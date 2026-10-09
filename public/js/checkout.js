/* ==========================================================================
   Cha Yuan — checkout
   Collects the shopper's details and card, then hands the card to OUR SERVER
   which forwards it to OTT Pay. The card is never stored and never touches
   localStorage. Client-side validation here is a convenience only — the server
   validates everything again before an order is created.
   ========================================================================== */
(function () {
  'use strict';

  const CY = window.CY || (window.CY = {});

  /* -------------------------------------------------------- card helpers */

  const BRAND_RULES = [
    { name: 'VISA', test: /^4/, gaps: [4, 8, 12], length: [13, 16, 19], cvv: 3 },
    { name: 'MASTERCARD', test: /^(5[1-5]|2[2-7])/, gaps: [4, 8, 12], length: [16], cvv: 3 },
    { name: 'AMEX', test: /^3[47]/, gaps: [4, 10], length: [15], cvv: 4 },
    { name: 'DISCOVER', test: /^6(?:011|5)/, gaps: [4, 8, 12], length: [16, 19], cvv: 3 },
    { name: 'DINERS', test: /^3(?:0[0-5]|[68])/, gaps: [4, 10], length: [14, 16], cvv: 3 },
    { name: 'JCB', test: /^35/, gaps: [4, 8, 12], length: [16, 19], cvv: 3 },
    { name: 'UNIONPAY', test: /^62/, gaps: [4, 8, 12], length: [16, 19], cvv: 3 },
  ];

  function detectBrand(digits) {
    const rule = BRAND_RULES.find((r) => r.test.test(digits));
    return rule || { name: 'CARD', gaps: [4, 8, 12], length: [12, 13, 14, 15, 16, 17, 18, 19], cvv: 3 };
  }

  function formatCardNumber(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 19);
    const brand = detectBrand(digits);
    const chunks = [];
    let cursor = 0;
    for (const gap of brand.gaps) {
      if (cursor >= digits.length) break;
      chunks.push(digits.slice(cursor, gap));
      cursor = gap;
    }
    if (cursor < digits.length) chunks.push(digits.slice(cursor));
    return chunks.join(' ');
  }

  function formatExpiry(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }

  function luhn(digits) {
    if (digits.length < 12) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let d = digits.charCodeAt(i) - 48;
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  /* ------------------------------------------------------------- live card */

  function initCardPreview() {
    const preview = document.querySelector('[data-card-preview]');
    if (!preview) return;

    const numberInput = document.getElementById('cardNumber');
    const holderInput = document.getElementById('cardHolder');
    const expiryInput = document.getElementById('cardExpiry');
    const brandEl = preview.querySelector('[data-cp-brand]');
    const numberEl = preview.querySelector('[data-cp-number]');
    const holderEl = preview.querySelector('[data-cp-holder]');
    const expiryEl = preview.querySelector('[data-cp-expiry]');

    function refresh() {
      const digits = String(numberInput?.value || '').replace(/\D/g, '');
      const brand = detectBrand(digits);
      if (brandEl) brandEl.textContent = brand.name;
      if (numberEl) {
        const masked = (digits + '••••••••••••••••••').slice(0, Math.max(16, digits.length)).replace(/(.{4})/g, '$1 ').trim();
        numberEl.textContent = masked;
      }
      if (holderEl) holderEl.textContent = (holderInput?.value || 'YOUR NAME').toUpperCase();
      if (expiryEl) expiryEl.textContent = expiryInput?.value || 'MM / YY';

      const cvvInput = document.getElementById('cardCvv');
      if (cvvInput) {
        cvvInput.maxLength = brand.cvv;
        cvvInput.placeholder = '•'.repeat(brand.cvv);
      }
      const brandLabel = document.querySelector('[data-card-brand]');
      if (brandLabel) brandLabel.textContent = digits.length >= 2 ? brand.name : '';
    }

    numberInput?.addEventListener('input', (e) => {
      e.target.value = formatCardNumber(e.target.value);
      refresh();
    });
    expiryInput?.addEventListener('input', (e) => {
      e.target.value = formatExpiry(e.target.value);
      refresh();
    });
    holderInput?.addEventListener('input', refresh);
    const cvvInput = document.getElementById('cardCvv');
    cvvInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });

    refresh();
  }

  /* ----------------------------------------------------------- validation */

  function setError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
    const host = document.querySelector(`[data-error-for="${fieldId}"]`);
    if (host) host.textContent = message || '';
  }

  function clearErrors() {
    document.querySelectorAll('[data-error-for]').forEach((el) => (el.textContent = ''));
    document.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
  }

  function collectAndValidate() {
    clearErrors();
    const form = document.getElementById('checkout-form');
    const get = (name) => {
      const el = form.elements[name];
      return el ? String(el.value || '').trim() : '';
    };

    const payload = {
      email: get('email').toLowerCase(),
      name: get('name'),
      phone: get('phone'),
      shippingName: get('shippingName'),
      address: get('address'),
      address2: get('address2'),
      city: get('city'),
      province: get('province'),
      postalCode: get('postalCode').toUpperCase(),
      country: get('country'),
      shippingMethod: get('shippingMethod') || 'standard',
      note: get('note'),
      cardNumber: get('cardNumber'),
      cardHolder: get('cardHolder'),
      cardExpiry: get('cardExpiry'),
      cardCvv: get('cardCvv'),
      items: CY.cart.state.lines(),
    };

    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(payload.email)) errors.email = 'Enter a valid email — your receipt is sent there.';
    if (payload.name.length < 2) errors.name = 'Enter your full name.';

    if (payload.address.length < 4) errors.address = 'Enter your street address and number.';
    if (!payload.city) errors.city = 'Enter your city.';
    if (!payload.province) errors.province = 'Enter your state or province.';
    if (payload.country === 'CA') {
      if (!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(payload.postalCode)) errors.postalCode = 'Enter a valid Canadian postal code, e.g. M5V 2T6.';
    } else if (payload.country === 'US') {
      if (!/^\d{5}(-\d{4})?$/.test(payload.postalCode)) errors.postalCode = 'Enter a valid US ZIP code.';
    } else if (payload.postalCode.length < 3) {
      errors.postalCode = 'Enter your postal code.';
    }

    const digits = payload.cardNumber.replace(/\D/g, '');
    const brand = detectBrand(digits);
    if (!luhn(digits) || !brand.length.includes(digits.length)) errors.cardNumber = 'That card number is not valid.';
    if (payload.cardHolder.length < 2) errors.cardHolder = 'Enter the name printed on the card.';

    const expiryDigits = payload.cardExpiry.replace(/\D/g, '');
    const month = Number(expiryDigits.slice(0, 2));
    const year = Number(expiryDigits.slice(2, 4));
    if (expiryDigits.length !== 4 || month < 1 || month > 12) {
      errors.cardExpiry = 'Enter the expiry as MM / YY.';
    } else {
      const end = new Date(2000 + year, month, 0, 23, 59, 59);
      if (end < new Date()) errors.cardExpiry = 'That card has expired.';
    }

    if (payload.cardCvv.replace(/\D/g, '').length !== brand.cvv) {
      errors.cardCvv = `Enter the ${brand.cvv}-digit security code.`;
    }

    if (!payload.items.length) errors.cart = 'Your basket is empty.';

    const fieldMap = {
      email: 'email',
      name: 'name',
      phone: 'phone',
      address: 'address',
      city: 'city',
      province: 'province',
      postalCode: 'postalCode',
      cardNumber: 'cardNumber',
      cardHolder: 'cardHolder',
      cardExpiry: 'cardExpiry',
      cardCvv: 'cardCvv',
    };
    Object.entries(errors).forEach(([key, message]) => {
      if (fieldMap[key]) setError(fieldMap[key], message);
    });

    const cartError = document.querySelector('[data-cart-error]');
    if (cartError) {
      cartError.textContent = errors.cart || '';
      cartError.style.display = errors.cart ? '' : 'none';
    }

    return { errors, payload, brand };
  }

  /* ------------------------------------------------------------- submit */

  function initCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    const submitBtn = form.querySelector('[data-submit]');
    const alertHost = document.querySelector('[data-checkout-alert]');

    function showAlert(message, type = 'error') {
      if (!alertHost) return;
      alertHost.innerHTML = `<div class="alert alert-${type}">${CY.escape(message)}</div>`;
      alertHost.style.display = '';
      alertHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearAlert() {
      if (alertHost) alertHost.innerHTML = '';
    }

    // Live re-pricing when the shipping method changes.
    form.querySelectorAll('input[name="shippingMethod"]').forEach((radio) =>
      radio.addEventListener('change', () => {
        CY.cart.state.shippingMethod = radio.value;
        CY.cart.refresh();
      }),
    );
    const checkedShipping = form.querySelector('input[name="shippingMethod"]:checked');
    if (checkedShipping) CY.cart.state.shippingMethod = checkedShipping.value;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAlert();

      const { errors, payload, brand } = collectAndValidate();
      if (Object.keys(errors).length) {
        showAlert('Please correct the highlighted fields below.');
        const firstInvalid = document.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      submitBtn.classList.add('is-busy');
      submitBtn.disabled = true;

      // KOUNT device data collection (required by OTT Pay for 3DS2).
      let kountSessionId = '';
      try {
        kountSessionId = await CY.deviceData.collect();
      } catch {
        kountSessionId = '';
      }

      const [expiryMonth, expiryYear] = payload.cardExpiry.replace(/\s/g, '').split('/');

      const body = {
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        shippingName: payload.shippingName || payload.name,
        address: payload.address,
        address2: payload.address2,
        city: payload.city,
        province: payload.province,
        postalCode: payload.postalCode,
        country: payload.country,
        shippingMethod: payload.shippingMethod,
        note: payload.note,
        cardNumber: payload.cardNumber.replace(/\D/g, ''),
        cardHolder: payload.cardHolder,
        cardExpiryMonth: String(expiryMonth || '').padStart(2, '0'),
        cardExpiryYear: String(expiryYear || '').padStart(2, '0'),
        cardCvv: payload.cardCvv.replace(/\D/g, ''),
        items: payload.items,
        kountSessionId,
        browser: CY.browserFingerprint(),
      };

      const { ok, status, data } = await CY.api('/api/checkout', { method: 'POST', body });

      submitBtn.classList.remove('is-busy');
      submitBtn.disabled = false;

      if (!ok) {
        if (data?.error === 'validation' && data.errors) {
          Object.entries(data.errors).forEach(([field, message]) => {
            if (field === 'cart') return;
            setError(field, message);
          });
          showAlert(data.message || 'Please correct the highlighted fields.');
          return;
        }
        showAlert(
          data?.message ||
            (status === 429 ? 'Too many attempts — please wait a moment.' : 'The payment could not be completed. You have not been charged.'),
        );
        return;
      }

      // Nothing is charged twice: clear the basket only once an order exists.
      CY.cart.state.clear();
      window.location.href = data.nextAction === 'challenge' ? data.challengeUrl : data.redirectUrl;
    });
  }

  /* --------------------------------------------------------------- boot */

  CY.ready(function () {
    initCardPreview();
    initCheckoutForm();

    if (CY.cart && !CY.cart.state.items.length) {
      const empty = document.querySelector('[data-checkout-empty]');
      const content = document.querySelector('[data-checkout-content]');
      if (empty && content) {
        empty.style.display = '';
        content.style.display = 'none';
      }
    }
  });
})();
