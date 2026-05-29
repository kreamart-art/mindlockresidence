/* ============================================================
   MINDLOCK RESIDENCE — interactions
   ============================================================ */
(function () {
  'use strict';

  /* ── Intro-animatie → onthul de site ── */
  (function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = () => {
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
    };
    setTimeout(reveal, reduce ? 200 : 2400);
    setTimeout(reveal, 4000); // veiligheidsnet: nooit langer dan 4s blokkeren
  })();

  /* ── Custom cursor (pointer devices only) ── */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
    });
    const hoverSel = 'a, button, .service-card, .work-card, .shop-card, .release-row, input, textarea, select, .skill-tag';
    document.querySelectorAll(hoverSel).forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('hovered'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('hovered'));
    });
  }

  /* ── Sticky nav + scroll progress ── */
  const nav = document.getElementById('nav');
  const progress = document.getElementById('progress');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ── */
  const toggle = document.getElementById('menu-toggle');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('#mobile-menu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ── Reveal on scroll ── */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  /* ── Hero word rotator ── */
  const rotator = document.getElementById('rotator');
  if (rotator) {
    const words = ['muziek', 'film', 'fotografie', 'identiteit', 'verhalen'];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      rotator.style.opacity = '0';
      setTimeout(() => {
        rotator.textContent = words[i];
        rotator.style.opacity = '1';
      }, 300);
    }, 2600);
  }

  /* ── Portfolio filter ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.work-card');
  const emptyMsg = document.querySelector('.werk-empty');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      let shown = 0;
      cards.forEach((card) => {
        const match = f === 'all' || card.dataset.cat === f;
        card.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (emptyMsg) emptyMsg.hidden = shown !== 0;
    });
  });

  /* ── Forms (front-end only — wire to a backend / form service later) ── */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.form-submit');
      if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
      const original = btn.textContent;
      btn.textContent = 'Verzonden! ✓';
      btn.style.background = '#1a6e1a';
      contactForm.reset();
      setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 3200);
    });
  }

  const newsForm = document.getElementById('newsletter-form');
  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = newsForm.querySelector('button');
      if (!newsForm.checkValidity()) { newsForm.reportValidity(); return; }
      const original = btn.textContent;
      btn.textContent = 'Gelukt ✓';
      newsForm.reset();
      setTimeout(() => { btn.textContent = original; }, 3000);
    });
  }
})();
