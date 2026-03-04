/* ══════════════════════════════════
   GLOBAL JS — Nav + Animations
   ══════════════════════════════════ */

// ── NAVBAR SCROLL ──────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// ── HAMBURGER MENU ─────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}

// ── ACTIVE NAV LINK ─────────────────────────────
(function () {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').split('#')[0];
    link.classList.toggle('active', href === path || (path === '' && href === 'index.html'));
  });
})();

// ── SCROLL-TRIGGERED FADE-UP ────────────────────
(function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = '';
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  // Add CSS for in-view
  const style = document.createElement('style');
  style.textContent = `
    .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .reveal.in-view { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  function revealAll() {
    document.querySelectorAll('.glass-card, .hiw-step, .testimonial-card, .section-header, .service-card').forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 5) * 0.08}s`;
      observer.observe(el);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealAll);
  } else {
    revealAll();
  }
})();

// ── SMOOTH ANCHOR SCROLL ───────────────────────
document.querySelectorAll('a[href*="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const hash = this.getAttribute('href').split('#')[1];
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target && this.pathname === location.pathname) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
