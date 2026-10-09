/* ==========================================================================
   Cha Yuan — development probe (not loaded by any storefront page)
   Measures the rendered page and writes a JSON report into <pre id="report">.
   Used by server/scripts/visual-check.mjs and by GET /dev/audit.
   ========================================================================== */
(function () {
  'use strict';

  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function style(el, props) {
    if (!el) return null;
    var cs = window.getComputedStyle(el);
    var out = {};
    props.forEach(function (p) {
      out[p] = cs.getPropertyValue(p);
    });
    return out;
  }

  function run() {
    var d = document;
    var images = Array.prototype.slice.call(d.images).map(function (img) {
      var r = img.getBoundingClientRect();
      return {
        src: img.getAttribute('src'),
        complete: img.complete,
        nw: img.naturalWidth,
        nh: img.naturalHeight,
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
    var broken = images.filter(function (i) {
      return !i.nw || !i.nh;
    });

    var selectors = '.tea-card, .cat-tile, .guide-card, .panel, .summary-card, .btn, .stat, .receipt, .pillar, .variant, .pdp-main, .pdp-thumb';

    /** True when an element is actually rendered (not inside a closed drawer, etc). */
    function isVisible(el) {
      var node = el;
      while (node && node.nodeType === 1 && node !== d.body) {
        var cs = window.getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        if (node.hidden) return false;
        node = node.parentElement;
      }
      // A closed off-canvas drawer is still "displayed", so check the box too.
      return el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0;
    }

    var zeroBox = Array.prototype.slice
      .call(d.querySelectorAll(selectors))
      .filter(isVisible)
      .filter(function (el) {
        var r = el.getBoundingClientRect();
        return r.width < 2 || r.height < 2;
      })
      .map(function (el) {
        return el.className;
      });

    var visibleCounts = {
      panels: Array.prototype.slice.call(d.querySelectorAll('.panel')).filter(isVisible).length,
      cards: Array.prototype.slice.call(d.querySelectorAll('.tea-card')).filter(isVisible).length,
    };

    // Which elements stick out past the viewport, and by how much. A single
    // scrollWidth number says a page overflows; this says what to fix.
    //
    // Two legitimate cases are excluded, because flagging them would bury the
    // real problems in noise: a marquee inside an `overflow: hidden` container
    // is meant to be clipped, and an off-canvas drawer is parked outside the
    // viewport until it opens. An element is only reported when it is actually
    // reachable — that is, when nothing above it clips or contains it.
    function isDeliberatelyOffscreen(el) {
      var node = el.parentElement;
      while (node && node !== d.body) {
        var cs = window.getComputedStyle(node);
        if (cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.overflow === 'hidden') return true;
        node = node.parentElement;
      }
      // Off-canvas panels park themselves outside the viewport with a transform.
      if (/drawer|scrim|mobile-nav|search-panel|skip-link/.test(String(el.className || ''))) return true;
      return false;
    }

    var overflow = [];
    Array.prototype.slice.call(d.querySelectorAll('body *')).forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      if (r.right <= window.innerWidth + 1) return;
      if (isDeliberatelyOffscreen(el)) return;
      overflow.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 60),
        right: Math.round(r.right),
        width: Math.round(r.width),
        over: Math.round(r.right - window.innerWidth),
      });
    });
    overflow.sort(function (a, b) { return b.over - a.over; });

    // Images that have no natural size never render, which is what a broken or
    // blocked image looks like from the DOM's point of view.
    var brokenImages = broken.map(function (b) {
      return { src: String(b.src).slice(0, 120), nw: b.nw, nh: b.nh };
    });

    var doc = d.documentElement;
    var root = window.getComputedStyle(doc);

    var report = {
      path: window.location.pathname + window.location.search,
      title: d.title,
      readyState: d.readyState,
      bodyBg: window.getComputedStyle(d.body).backgroundColor,
      bodyColor: window.getComputedStyle(d.body).color,
      docWidth: doc.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
      docHeight: doc.scrollHeight,
      counts: {
        productCards: d.querySelectorAll('.tea-card').length,
        images: d.images.length,
        brokenImages: broken.length,
        zeroSizedBlocks: zeroBox.length,
        navLinks: d.querySelectorAll('.main-nav .nav-link').length,
        forms: d.forms.length,
        stylesheets: d.styleSheets.length,
        visiblePanels: visibleCounts.panels,
        visibleCards: visibleCounts.cards,
      },
      brokenImageSrcs: broken.map(function (b) {
        return String(b.src).slice(0, 160);
      }).slice(0, 12),
      zeroSizedBlocks: zeroBox.slice(0, 12),
      overflow: overflow.slice(0, 15),
      brokenImageDetail: brokenImages.slice(0, 10),
      // Section offsets, so the page's vertical length can be reasoned about
      // rather than eyeballed: which block sits how far down.
      sections: Array.prototype.slice.call(d.querySelectorAll('main > section, main > .ticker')).map(function (el) {
        var r = el.getBoundingClientRect();
        return {
          cls: String(el.className || el.tagName).slice(0, 40),
          top: Math.round(r.top + window.scrollY),
          height: Math.round(r.height),
        };
      }),
      rects: {
        header: rect(d.querySelector('.site-header')),
        hero: rect(d.querySelector('.hero')),
        firstProductCard: rect(d.querySelector('.tea-card')),
        primaryButton: rect(d.querySelector('.btn-solid')),
        footer: rect(d.querySelector('.site-footer')),
        cartDrawer: rect(d.querySelector('.cart-drawer')),
        summaryCard: rect(d.querySelector('.summary-card')),
        pdpMain: rect(d.querySelector('.pdp-main')),
      },
      styles: {
        heroH1: style(d.querySelector('.hero h1') || d.querySelector('h1'), ['font-family', 'font-size', 'color', 'line-height']),
        primaryButton: style(d.querySelector('.btn-solid'), ['background-image', 'color', 'font-size', 'letter-spacing', 'text-transform']),
        navLink: style(d.querySelector('.main-nav .nav-link'), ['font-size', 'letter-spacing', 'text-transform', 'color']),
        price: style(d.querySelector('.price'), ['font-family', 'font-size', 'color']),
        eyebrow: style(d.querySelector('.eyebrow'), ['font-size', 'letter-spacing', 'text-transform', 'color']),
        teaCard: style(d.querySelector('.tea-card'), ['background-color', 'border-top-width']),
        badge: style(d.querySelector('.badge'), ['background-color', 'color', 'text-transform', 'font-size']),
      },
      accentSwatches: {
        bodyBg: window.getComputedStyle(d.body).backgroundColor,
        gold: root.getPropertyValue('--gold-300').trim(),
        goldLight: root.getPropertyValue('--gold-200').trim(),
        ink: root.getPropertyValue('--ink-900').trim(),
        ink600: root.getPropertyValue('--ink-600').trim(),
      },
      scripts: Array.prototype.slice.call(d.scripts).map(function (s) {
        return s.getAttribute('src') || 'inline';
      }),
    };

    var pre = d.getElementById('report') || d.createElement('pre');
    pre.id = 'report';
    pre.textContent = JSON.stringify(report, null, 2);
    if (!pre.parentNode) d.body.appendChild(pre);
    d.title = 'probe-ready';
  }

  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();
