/* ============================================================
   Mindlockresidence — gedeelde layout + interacties
   Injecteert nav + footer op elke pagina (één bron van waarheid),
   regelt taalwissel, actieve nav, cursor, menu, reveal, filters,
   formulieren en de intro-animatie (alleen op de home-pagina).
   ============================================================ */
(function () {
  'use strict';

  var page = document.body.getAttribute('data-page') || '';
  var isHome = document.body.classList.contains('home');

  /* ---- ICONS ---- */
  var IG = '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>';
  var YT = '<svg fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>';
  var TT = '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.07 8.07 0 004.74 1.52V6.76a4.85 4.85 0 01-.97-.07z"/></svg>';
  var BC = '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M0 18.75l7.437-13.5H24l-7.437 13.5H0z"/></svg>';
  var arrow = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>';

  /* ---- NAV LINKS ---- */
  var links = [
    { key: 'nav.diensten', href: 'diensten.html', page: 'diensten' },
    { key: 'nav.werk', href: 'werk.html', page: 'werk' },
    { key: 'nav.muziek', href: 'muziek.html', page: 'muziek' },
    { key: 'nav.over', href: 'about.html', page: 'over' },
    { key: 'nav.contact', href: 'contact.html', page: 'contact' }
  ];

  function navList(mobile) {
    return links.map(function (l) {
      var active = l.page === page ? ' class="active"' : '';
      var item = '<a href="' + l.href + '"' + active + ' data-i18n="' + l.key + '">' + l.key + '</a>';
      return mobile ? item : '<li>' + item + '</li>';
    }).join('');
  }

  function langToggle() {
    return '<div class="lang-toggle">' +
      '<button type="button" data-lang-btn="nl">NL</button>' +
      '<button type="button" data-lang-btn="en">EN</button>' +
      '</div>';
  }

  /* ---- HEADER ---- */
  function headerHTML() {
    return '' +
      '<nav id="nav">' +
        '<a href="index.html" class="nav-logo-text" aria-label="Mindlockresidence home">Mindlockresidence</a>' +
        '<ul class="nav-links">' + navList(false) + '</ul>' +
        '<div class="nav-right">' +
          langToggle() +
          '<a href="contact.html" class="nav-cta" data-i18n="nav.boek">Boek nu</a>' +
          '<button id="menu-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '</div>' +
      '</nav>' +
      '<div id="mobile-menu" aria-hidden="true">' +
        navList(true) +
        '<a href="contact.html" class="nav-cta" data-i18n="nav.boek">Boek nu</a>' +
        langToggle() +
      '</div>';
  }

  /* ---- FOOTER ---- */
  function footerHTML() {
    return '' +
      '<footer class="comp-footer">' +
        '<div class="footer-grid">' +
          '<div class="footer-main">' +
            '<div class="footer-brand">' +
              '<div class="footer-logo">Mindlock<br>Residence</div>' +
              '<p data-i18n-html="footer.tagline">Gecre&euml;erd binnen het <strong>MLR</strong> ecosysteem</p>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4 data-i18n="footer.col1.h">Studio</h4>' +
              '<ul>' +
                '<li><a href="diensten.html" data-i18n="footer.col1.1">Diensten</a></li>' +
                '<li><a href="werk.html" data-i18n="footer.col1.2">Werk</a></li>' +
                '<li><a href="about.html" data-i18n="footer.col1.3">Over</a></li>' +
              '</ul>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4 data-i18n="footer.col2.h">Info</h4>' +
              '<ul>' +
                '<li><a href="contact.html" data-i18n="footer.col2.1">Contact</a></li>' +
                '<li><a href="#" data-i18n="footer.col2.2">SSF..</a></li>' +
                '<li><a href="#" data-i18n="footer.col2.3">FAQ</a></li>' +
              '</ul>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4 data-i18n="footer.col3.h">Socials</h4>' +
              '<ul>' +
                '<li><a href="https://instagram.com/mindlockresidence" target="_blank" rel="noopener">@Mindlockresidence</a></li>' +
                '<li><a href="https://mindlockresidence.bandcamp.com" target="_blank" rel="noopener">Bandcamp</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
          '<aside class="footer-cta">' +
            '<span class="cta-diamond" aria-hidden="true"></span>' +
            '<h3 data-i18n="footer.cta.title">Built for Sound</h3>' +
            '<p data-i18n="footer.cta.sub">Bouw jouw visie. Join het team.</p>' +
            '<div class="cta-actions">' +
              '<a href="contact.html" class="btn btn-primary" data-i18n="footer.cta.more">Leer meer</a>' +
              '<a href="contact.html" class="btn btn-ghost" data-i18n="footer.cta.join">Word een MLR creator</a>' +
            '</div>' +
          '</aside>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span data-i18n="footer.bottom">&copy; 2026 Mindlock Residence — Amsterdam.</span>' +
          '<div class="footer-legal">' +
            '<a href="#" data-i18n="footer.privacy">Privacy</a>' +
            '<a href="#" data-i18n="footer.terms">Voorwaarden</a>' +
            '<a href="https://www.artnomad.nl" target="_blank" rel="noopener" class="footer-credit" aria-label="Made by Kream Art — Artnomad"><img src="assets/ka-logo.png" alt="Kream Art" class="footer-credit-logo"></a>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ---- INJECT ---- */
  // favicon (relative paths so it works under the /mindlockresidence/ Pages subpath)
  if (!document.querySelector('link[rel="icon"]')) {
    document.head.insertAdjacentHTML('beforeend',
      '<link rel="icon" href="favicon.ico" sizes="any">' +
      '<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">' +
      '<link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16.png">' +
      '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">');
  }

  // cursor + progress
  var fragHead = document.createElement('div');
  fragHead.innerHTML =
    '<div id="cursor" aria-hidden="true"></div>' +
    '<div id="cursor-ring" aria-hidden="true"></div>' +
    '<div id="progress" aria-hidden="true"></div>';
  while (fragHead.firstChild) document.body.insertBefore(fragHead.firstChild, document.body.firstChild);

  var headerHost = document.getElementById('site-header');
  if (headerHost) headerHost.innerHTML = headerHTML();
  var footerHost = document.getElementById('site-footer');
  if (footerHost) footerHost.innerHTML = footerHTML();

  // fill hero social icons (home only) if present
  var heroSocials = document.querySelector('.hero-socials');
  if (heroSocials && !heroSocials.children.length) {
    heroSocials.innerHTML =
      '<a href="https://instagram.com/mindlockresidence" target="_blank" rel="noopener" aria-label="Instagram">' + IG + '</a>' +
      '<a href="#" aria-label="YouTube">' + YT + '</a>' +
      '<a href="#" aria-label="TikTok">' + TT + '</a>' +
      '<a href="https://mindlockresidence.bandcamp.com" target="_blank" rel="noopener" aria-label="Bandcamp">' + BC + '</a>';
  }

  /* ---- LANGUAGE ---- */
  if (window.MLRI18N) {
    window.MLRI18N.apply(window.MLRI18N.getLang());
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-lang-btn]');
      if (!btn) return;
      window.MLRI18N.apply(btn.getAttribute('data-lang-btn'));
    });
  }

  /* ---- INTERACTIONS ---- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    var cursor = document.getElementById('cursor');
    var ring = document.getElementById('cursor-ring');
    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    });
    var hoverSel = 'a, button, .service-card, .work-card, .shop-card, .release-row, .eco-card, input, textarea, select, .skill-tag';
    document.querySelectorAll(hoverSel).forEach(function (el) {
      el.addEventListener('mouseenter', function () { document.body.classList.add('hovered'); });
      el.addEventListener('mouseleave', function () { document.body.classList.remove('hovered'); });
    });
  }

  var nav = document.getElementById('nav');
  var progress = document.getElementById('progress');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = document.getElementById('menu-toggle');
  function closeMenu() { document.body.classList.remove('menu-open'); if (toggle) toggle.setAttribute('aria-expanded', 'false'); }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  document.querySelectorAll('#mobile-menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  // reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // portfolio filter
  var filterBtns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.work-card');
  var emptyMsg = document.querySelector('.werk-empty');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      var shown = 0;
      cards.forEach(function (card) {
        var match = f === 'all' || card.getAttribute('data-cat') === f;
        card.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (emptyMsg) emptyMsg.hidden = shown !== 0;
    });
  });

  // forms (front-end only)
  function wireForm(form, btnSel) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector(btnSel);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var lang = (window.MLRI18N && window.MLRI18N.getLang()) || 'nl';
      var sent = lang === 'en' ? 'Sent! ✓' : 'Verzonden! ✓';
      var original = btn.textContent;
      btn.textContent = sent; btn.style.background = '#1a6e1a';
      form.reset();
      setTimeout(function () { btn.textContent = original; btn.style.background = ''; }, 3200);
    });
  }
  wireForm(document.getElementById('contact-form'), '.form-submit');

  /* ---- INTRO / ENTRANCE ---- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealSite() { document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
  if (isHome) {
    var introSeen = false;
    try { introSeen = sessionStorage.getItem('mlr-intro-seen') === '1'; } catch (e) {}
    if (introSeen) {
      // Intro al gezien deze sessie → direct naar de site, geen animatie
      var introEl = document.getElementById('intro');
      if (introEl) introEl.style.display = 'none';
      revealSite();
    } else {
      try { sessionStorage.setItem('mlr-intro-seen', '1'); } catch (e) {}
      setTimeout(revealSite, reduce ? 200 : 2400);
      setTimeout(revealSite, 4000); // veiligheidsnet
    }
  } else {
    requestAnimationFrame(revealSite);
  }
})();
