/* Shop-front: producten tonen, winkelwagen (localStorage), afrekenen via Stripe. */
(function () {
  'use strict';
  var CART_KEY = 'mlr-cart';
  var products = [];
  var fmt = function (cents, cur) {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: (cur || 'eur').toUpperCase() }).format(cents / 100);
  };
  var getCart = function () { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } };
  var setCart = function (c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); render(); };
  var t = function (key, fallback) {
    var lang = (window.MLRI18N && window.MLRI18N.getLang && window.MLRI18N.getLang()) || 'nl';
    var map = SHOP_T[lang] || SHOP_T.nl;
    return map[key] || fallback;
  };
  var SHOP_T = {
    nl: { add: 'In winkelwagen', added: 'Toegevoegd', digital: 'Digitaal', physical: 'Merch', out: 'Uitverkocht', empty: 'Je winkelwagen is leeg.', remove: 'Verwijderen' },
    en: { add: 'Add to cart', added: 'Added', digital: 'Digital', physical: 'Merch', out: 'Sold out', empty: 'Your cart is empty.', remove: 'Remove' }
  };

  function loadProducts() {
    fetch('api/shop/products').then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      products = rows || [];
      var grid = document.getElementById('shop-grid');
      var empty = document.getElementById('shop-empty');
      if (!products.length) { grid.innerHTML = ''; if (empty) empty.hidden = false; return; }
      grid.innerHTML = products.map(function (p) {
        var sold = !p.in_stock;
        var badge = p.badge ? '<span class="shop-badge">' + esc(p.badge) + '</span>' : '';
        var typeTag = '<span class="shop-type">' + (p.type === 'digital' ? t('digital', 'Digitaal') : t('physical', 'Merch')) + '</span>';
        var media = p.image
          ? '<div class="shop-image" style="background-image:url(\'' + p.image + '\')">' + badge + '</div>'
          : '<div class="shop-image"><div class="shop-image-inner" data-label=""></div>' + badge + '</div>';
        return '<article class="shop-card">' + media +
          '<div class="shop-info">' + typeTag +
            '<div class="shop-name">' + esc(p.name) + '</div>' +
            '<div class="shop-sub">' + esc(p.subtitle || '') + '</div>' +
            '<div class="shop-price">' + fmt(p.price_cents, p.currency) + '</div>' +
            (sold
              ? '<button class="shop-add" disabled>' + t('out', 'Uitverkocht') + '</button>'
              : '<button class="shop-add" data-add="' + p.id + '">' + t('add', 'In winkelwagen') + '</button>') +
          '</div></article>';
      }).join('');
      grid.querySelectorAll('[data-add]').forEach(function (b) {
        b.addEventListener('click', function () {
          addToCart(parseInt(b.dataset.add, 10));
          b.textContent = t('added', 'Toegevoegd');
          setTimeout(function () { b.textContent = t('add', 'In winkelwagen'); }, 1400);
          openCart();
        });
      });
    });
  }

  function addToCart(id) {
    var cart = getCart();
    var line = cart.find(function (l) { return l.productId === id; });
    if (line) line.quantity = Math.min(10, line.quantity + 1);
    else cart.push({ productId: id, quantity: 1 });
    setCart(cart);
  }
  function setQty(id, q) {
    var cart = getCart().map(function (l) { return l.productId === id ? { productId: id, quantity: q } : l; }).filter(function (l) { return l.quantity > 0; });
    setCart(cart);
  }

  function render() {
    var cart = getCart();
    var count = cart.reduce(function (n, l) { return n + l.quantity; }, 0);
    var cc = document.getElementById('cart-count');
    if (cc) { cc.textContent = count; cc.style.display = count ? 'flex' : 'none'; }
    var box = document.getElementById('cart-items');
    if (!box) return;
    if (!cart.length) { box.innerHTML = '<p class="cart-empty">' + t('empty', 'Je winkelwagen is leeg.') + '</p>'; }
    else {
      box.innerHTML = cart.map(function (l) {
        var p = products.find(function (x) { return x.id === l.productId; });
        if (!p) return '';
        return '<div class="cart-row"><div class="cart-row-info"><div class="cart-row-name">' + esc(p.name) + '</div>' +
          '<div class="cart-row-price">' + fmt(p.price_cents, p.currency) + '</div></div>' +
          '<div class="cart-qty"><button data-dec="' + p.id + '">-</button><span>' + l.quantity + '</span><button data-inc="' + p.id + '">+</button></div></div>';
      }).join('');
      box.querySelectorAll('[data-inc]').forEach(function (b) { b.onclick = function () { var l = getCart().find(function (x) { return x.productId === +b.dataset.inc; }); setQty(+b.dataset.inc, Math.min(10, (l ? l.quantity : 0) + 1)); }; });
      box.querySelectorAll('[data-dec]').forEach(function (b) { b.onclick = function () { var l = getCart().find(function (x) { return x.productId === +b.dataset.dec; }); setQty(+b.dataset.dec, (l ? l.quantity : 0) - 1); }; });
    }
    var total = cart.reduce(function (sum, l) { var p = products.find(function (x) { return x.id === l.productId; }); return sum + (p ? p.price_cents * l.quantity : 0); }, 0);
    var tt = document.getElementById('cart-total'); if (tt) tt.textContent = fmt(total, 'eur');
    var btn = document.getElementById('checkout-btn'); if (btn) btn.disabled = !cart.length;
  }

  function openCart() { document.getElementById('cart-drawer').classList.add('open'); document.body.classList.add('cart-lock'); }
  function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); document.body.classList.remove('cart-lock'); }

  async function checkout() {
    var cart = getCart();
    if (!cart.length) return;
    var btn = document.getElementById('checkout-btn');
    var orig = btn.textContent; btn.disabled = true; btn.textContent = '...';
    try {
      var r = await fetch('api/shop/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) });
      var data = await r.json();
      if (r.ok && data.url) { window.location.href = data.url; return; } // volledige navigatie naar Stripe
      alert(data.error || 'Afrekenen mislukt.');
    } catch (e) { alert('Er ging iets mis.'); }
    btn.disabled = false; btn.textContent = orig;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var globalsBound = false;
  function init() {
    if (!document.getElementById('shop-grid')) return; // niet op shop-pagina
    loadProducts();
    render();
    var fab = document.getElementById('cart-fab'); if (fab) fab.onclick = openCart;
    var cl = document.querySelector('.cart-close'); if (cl) cl.onclick = closeCart;
    var bd = document.querySelector('.cart-backdrop'); if (bd) bd.onclick = closeCart;
    var co = document.getElementById('checkout-btn'); if (co) co.onclick = checkout;
    if (!globalsBound) {
      globalsBound = true;
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
      document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-lang-btn]')) setTimeout(loadProducts, 50); });
    }
  }
  window.MLRShop = { init: init };

  // shop.js wordt na layout.js geladen; init direct (layout roept 'm ook na SPA-swap).
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
