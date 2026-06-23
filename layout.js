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
    { key: 'nav.shop', href: 'shop.html', page: 'shop' },
    { key: 'nav.over', href: 'about.html', page: 'over' },
    { key: 'nav.contact', href: 'contact.html', page: 'contact' }
  ];

  function navList(mobile) {
    return links.map(function (l) {
      var item = '<a href="' + l.href + '" data-nav="' + l.page + '" data-i18n="' + l.key + '">' + l.key + '</a>';
      return mobile ? item : '<li>' + item + '</li>';
    }).join('');
  }

  function setActiveNav() {
    var p = document.body.getAttribute('data-page') || '';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === p);
    });
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
          '<a href="dashboard" class="nav-dash" aria-label="Dashboard" title="Dashboard"><svg fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg></a>' +
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
          '</div>' +
        '</div>' +
        '<div class="footer-credit-bar">' +
          '<a href="https://www.artnomad.nl" target="_blank" rel="noopener" class="footer-credit" aria-label="Made by Kream Art — Artnomad"><span class="footer-credit-by">Made by</span><img src="assets/ka-logo.png" alt="Kream Art" class="footer-credit-logo"></a>' +
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

  /* ---- BEAT-SPELER (achtergrondmuziek, autostart met fallback) ---- */
  (function () {
    var bar = document.createElement('button');
    bar.id = 'beat-player';
    bar.setAttribute('aria-label', 'Speel/pauzeer beat');
    bar.innerHTML =
      '<span class="beat-ic beat-ic-play"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' +
      '<span class="beat-ic beat-ic-pause"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></span>' +
      '<span class="beat-eq"><i></i><i></i><i></i><i></i></span>' +
      '<span class="beat-label">Beat</span>';
    var audio = new Audio('assets/beat-loop.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.55;

    function setPlaying(on) { bar.classList.toggle('playing', on); }
    audio.addEventListener('play', function () { setPlaying(true); });
    audio.addEventListener('pause', function () { setPlaying(false); });

    bar.addEventListener('click', function () {
      if (audio.paused) { audio.play().catch(function(){}); }
      else { audio.pause(); }
    });

    function append() {
      document.body.appendChild(bar);
      // Probeer autostart; browsers blokkeren dit vaak tot de eerste klik/tik.
      audio.play().then(function () {
        setPlaying(true);
      }).catch(function () {
        setPlaying(false);
        var kick = function () {
          audio.play().then(function(){ setPlaying(true); }).catch(function(){});
          window.removeEventListener('pointerdown', kick);
          window.removeEventListener('keydown', kick);
        };
        window.addEventListener('pointerdown', kick, { once: true });
        window.addEventListener('keydown', kick, { once: true });
      });
    }
    if (document.body) append(); else document.addEventListener('DOMContentLoaded', append);
  })();

  /* ---- VIDEO LIGHTBOX (YouTube) ---- */
  (function () {
    var lb = document.createElement('div');
    lb.id = 'video-lightbox';
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
      '<div class="vlb-backdrop"></div>' +
      '<div class="vlb-dialog" role="dialog" aria-modal="true" aria-label="Video">' +
        '<button class="vlb-close" aria-label="Sluiten">&times;</button>' +
        '<div class="vlb-frame"></div>' +
      '</div>';
    document.body.appendChild(lb);
    var frame = lb.querySelector('.vlb-frame');

    function openYouTube(id) {
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="YouTube video" ' +
        'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        'allowfullscreen></iframe>';
      show();
    }
    function openFile(src, portrait) {
      frame.innerHTML = '<video src="' + src + '" controls autoplay playsinline ' +
        'style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000"></video>';
      lb.classList.toggle('vlb-portrait', !!portrait);
      show();
    }
    function show() {
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('vlb-lock');
    }
    function close() {
      lb.classList.remove('open');
      lb.classList.remove('vlb-portrait');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('vlb-lock');
      frame.innerHTML = ''; // stop playback
    }
    function openFrom(card) {
      if (card.getAttribute('data-yt')) { openYouTube(card.getAttribute('data-yt')); return true; }
      if (card.getAttribute('data-video')) { openFile(card.getAttribute('data-video'), card.hasAttribute('data-portrait')); return true; }
      return false;
    }
    lb.querySelector('.vlb-close').addEventListener('click', close);
    lb.querySelector('.vlb-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('[data-yt],[data-video]');
      if (!card) return;
      e.preventDefault();
      openFrom(card);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest && e.target.closest('[data-yt],[data-video]');
      if (!card) return;
      e.preventDefault();
      openFrom(card);
    });
  })();

  /* ---- LANGUAGE (globale toggle, één keer) ---- */
  if (window.MLRI18N) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-lang-btn]');
      if (!btn) return;
      window.MLRI18N.apply(btn.getAttribute('data-lang-btn'));
    });
  }

  /* ---- CURSOR (globaal, één keer) ---- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hoverSel = 'a, button, .service-card, .work-card, .shop-card, .release-row, .eco-card, input, textarea, select, .skill-tag';
  if (fine) {
    var cursor = document.getElementById('cursor');
    var ring = document.getElementById('cursor-ring');
    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
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

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- PER-PAGINA INIT (opnieuw uitvoerbaar na een SPA-swap) ---- */
  function initPage() {
    setActiveNav();

    // hero social-iconen (alleen home)
    var heroSocials = document.querySelector('.hero-socials');
    if (heroSocials && !heroSocials.children.length) {
      heroSocials.innerHTML =
        '<a href="https://instagram.com/mindlockresidence" target="_blank" rel="noopener" aria-label="Instagram">' + IG + '</a>' +
        '<a href="#" aria-label="YouTube">' + YT + '</a>' +
        '<a href="#" aria-label="TikTok">' + TT + '</a>' +
        '<a href="https://mindlockresidence.bandcamp.com" target="_blank" rel="noopener" aria-label="Bandcamp">' + BC + '</a>';
    }

    // reveal on scroll: alles wat al in beeld is meteen tonen, de rest observeren
    var reveals = document.querySelectorAll('.reveal:not(.visible)');
    var vh = window.innerHeight || document.documentElement.clientHeight;
    function inView(el) { var r = el.getBoundingClientRect(); return r.top < vh * 0.92 && r.bottom > 0; }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) {
        if (inView(el)) { el.classList.add('visible'); }
        else { io.observe(el); }
      });
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

    // formulier (front-end only)
    var form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('.form-submit');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var lang = (window.MLRI18N && window.MLRI18N.getLang()) || 'nl';
        var original = btn.textContent;
        btn.textContent = lang === 'en' ? 'Sent! ✓' : 'Verzonden! ✓';
        btn.style.background = '#1a6e1a';
        form.reset();
        setTimeout(function () { btn.textContent = original; btn.style.background = ''; }, 3200);
      });
    }

    // hover-cursor koppelen aan nieuwe elementen
    if (fine) {
      document.querySelectorAll(hoverSel).forEach(function (el) {
        if (el.__mlrHover) return; el.__mlrHover = 1;
        el.addEventListener('mouseenter', function () { document.body.classList.add('hovered'); });
        el.addEventListener('mouseleave', function () { document.body.classList.remove('hovered'); });
      });
    }

    // dynamisch werk uit het dashboard inladen (Werk-pagina)
    loadDynamicWork();

    // shop-init opnieuw draaien na een SPA-swap
    if (window.MLRShop && typeof window.MLRShop.init === 'function') window.MLRShop.init();

    // vertaal de nieuw ingevoegde content
    if (window.MLRI18N) window.MLRI18N.apply(window.MLRI18N.getLang());

    onScroll();
  }

  var CATLABEL = { muziek: 'werk.f.muziek', film: 'werk.f.film', foto: 'werk.f.foto', design: 'werk.f.design', studio: 'werk.f.studio', workshop: 'werk.f.workshop' };
  function loadDynamicWork() {
    var grid = document.querySelector('.werk-grid');
    if (!grid || grid.getAttribute('data-dyn') === '1') return;
    grid.setAttribute('data-dyn', '1');
    fetch('api/works').then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      if (!rows || !rows.length) return;
      var frag = document.createDocumentFragment();
      rows.forEach(function (w) {
        var art = document.createElement('article');
        art.className = 'work-card' + (w.featured ? ' large' : '') + (w.mediaType === 'youtube' || w.mediaType === 'video' ? ' has-video' : '');
        art.setAttribute('data-cat', w.category);
        var bg = '', playBtn = '';
        if (w.mediaType === 'youtube') {
          bg = 'https://i.ytimg.com/vi/' + w.youtubeId + '/hqdefault.jpg';
          art.setAttribute('data-yt', w.youtubeId);
          art.setAttribute('role', 'button'); art.setAttribute('tabindex', '0');
          playBtn = '<span class="work-play"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>';
        } else if (w.mediaType === 'video') {
          art.setAttribute('data-video', w.url); art.setAttribute('data-portrait', '');
          art.setAttribute('role', 'button'); art.setAttribute('tabindex', '0');
          playBtn = '<span class="work-play"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>';
        } else {
          bg = w.url;
        }
        var catKey = CATLABEL[w.category] || '';
        art.innerHTML =
          '<div class="work-media has-photo" data-label=""' + (bg ? ' style="background-image:url(\'' + bg + '\')"' : '') + '>' +
            '<span class="work-cat" data-i18n="' + catKey + '"></span>' + playBtn +
          '</div>' +
          '<div class="work-info"><h3 class="work-title">' + escapeHtml(w.title) + '</h3>' +
          '<p class="work-meta">' + escapeHtml(w.subtitle || '') + '</p></div>';
        frag.appendChild(art);
      });
      grid.insertBefore(frag, grid.firstChild);
      if (window.MLRI18N) window.MLRI18N.apply(window.MLRI18N.getLang());
    }).catch(function () {});
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- INTRO / ENTRANCE ---- */
  function revealSite() { document.body.classList.remove('loading'); document.body.classList.add('loaded'); }
  function runIntro() {
    if (document.body.classList.contains('home')) {
      var introSeen = false;
      try { introSeen = sessionStorage.getItem('mlr-intro-seen') === '1'; } catch (e) {}
      var introEl = document.getElementById('intro');
      if (introSeen) {
        if (introEl) introEl.style.display = 'none';
        revealSite();
      } else {
        try { sessionStorage.setItem('mlr-intro-seen', '1'); } catch (e) {}
        setTimeout(revealSite, reduce ? 200 : 2400);
        setTimeout(revealSite, 4000);
      }
    } else {
      requestAnimationFrame(revealSite);
    }
  }

  /* ---- SPA-ROUTER: wissel alleen <main>, zodat nav/footer/beat blijven leven ---- */
  (function () {
    var localPages = {};
    links.forEach(function (l) { localPages[l.href] = l.page; });
    localPages['index.html'] = 'home';
    localPages[''] = 'home';

    function samePath(href) {
      // alleen interne .html-links binnen dezelfde map
      try {
        var u = new URL(href, location.href);
        if (u.origin !== location.origin) return null;
        var file = u.pathname.split('/').pop() || 'index.html';
        if (file in localPages) return { file: file, hash: u.hash };
        return null;
      } catch (e) { return null; }
    }

    function swap(file, hash, push) {
      var url = file + (hash || '');
      fetch(file, { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main');
        var curMain = document.querySelector('main');
        if (!newMain || !curMain) { location.href = url; return; }

        // body-attributen overnemen (data-page, data-title, class home/inner)
        document.body.setAttribute('data-page', doc.body.getAttribute('data-page') || '');
        document.body.setAttribute('data-title', doc.body.getAttribute('data-title') || '');
        document.body.classList.toggle('home', doc.body.classList.contains('home'));
        document.body.classList.toggle('inner', doc.body.classList.contains('inner'));
        // intro nooit opnieuw tijdens SPA-navigatie
        try { sessionStorage.setItem('mlr-intro-seen', '1'); } catch (e) {}
        var introEl = document.getElementById('intro');
        if (introEl) introEl.style.display = 'none';

        curMain.innerHTML = newMain.innerHTML;

        if (push) history.pushState({ mlr: 1 }, '', url);
        if (hash) { var t = document.querySelector(hash); if (t) t.scrollIntoView(); }
        else window.scrollTo(0, 0);

        document.body.classList.add('loaded');
        document.body.classList.remove('loading');
        initPage();
      }).catch(function () { location.href = url; });
    }

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.getAttribute('href').charAt(0) === '#') return; // pure anchor: laat browser doen
      var m = samePath(a.getAttribute('href'));
      if (!m) return; // externe of niet-pagina link: normaal gedrag
      e.preventDefault();
      closeMenu();
      swap(m.file, m.hash, true);
    });

    window.addEventListener('popstate', function () {
      var m = samePath(location.pathname + location.hash);
      if (m) swap(m.file, m.hash, false);
    });
  })();

  // eerste lading
  initPage();
  runIntro();
})();
