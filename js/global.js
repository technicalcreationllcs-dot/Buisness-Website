/* ══════════════════════════════════
   GLOBAL JS — Nav + Scroll Reveal
   ══════════════════════════════════ */

// ── NAVBAR SCROLL ──────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
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

// ── INTERSECTION OBSERVER REVEAL ────────────────
(function () {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  function initReveals() {
    const selectors = [
      '.glass-card',
      '.glass-card-dark',
      '.hiw-step',
      '.testimonial-card',
      '.section-header',
      '.service-card',
      '.timeline-item',
      '.why-card',
      '.case-card',
      '.package-card',
      '.faq-item',
      '.scale-card',
      '.info-card',
      '.contact-form-wrapper',
      '.hero-glass-panel',
      '.svc-block',
      '.filter-bar',
      '.strip-stat'
    ];

    document.querySelectorAll(selectors.join(', ')).forEach((el, i) => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        // stagger children within grids by 80ms
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.matches(selectors.join(', ')));
          const idx = siblings.indexOf(el);
          if (idx >= 0) {
            el.style.transitionDelay = `${idx * 0.08}s`;
          }
        }
        revealObserver.observe(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveals);
  } else {
    initReveals();
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

// ── COUNT-UP ANIMATION ─────────────────────────
function countUp(el, target, duration) {
  const isFloat = String(target).includes('.');
  const hasPlus = el.textContent.includes('+');
  const hasPercent = el.textContent.includes('%');
  const hasX = el.textContent.includes('x');
  const hasDollar = el.textContent.includes('$');
  const hasM = el.textContent.includes('M');
  let startTime = null;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = easeOutQuart(progress);
    let current = eased * target;

    let display = '';
    if (hasDollar) display += '$';
    if (isFloat) {
      display += current.toFixed(1);
    } else {
      display += Math.floor(current);
    }
    if (hasX) display += 'x';
    if (hasM) display += 'M';
    if (hasPlus) display += '+';
    if (hasPercent) display += '%';

    el.textContent = display;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// ── INIT COUNT-UP ON SCROLL ────────────────────
(function() {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const text = el.textContent.trim();
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && !el.dataset.counted) {
          el.dataset.counted = 'true';
          countUp(el, num, 1200);
        }
        countObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  function initCounters() {
    document.querySelectorAll('[data-countup]').forEach(el => {
      countObserver.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounters);
  } else {
    initCounters();
  }
})();

// ── FAQ ACCORDION ──────────────────────────────
(function() {
  function initFaq() {
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        // Close all
        button.closest('.faq-list')?.querySelectorAll('.faq-question').forEach(b => {
          b.setAttribute('aria-expanded', 'false');
          b.classList.remove('active');
          const ans = b.nextElementSibling;
          if (ans) ans.style.maxHeight = '0';
          const icon = b.querySelector('.faq-icon');
          if (icon) icon.style.transform = 'rotate(0deg)';
        });
        // Open clicked if it was closed
        if (!expanded) {
          button.setAttribute('aria-expanded', 'true');
          button.classList.add('active');
          const answer = button.nextElementSibling;
          if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
          const icon = button.querySelector('.faq-icon');
          if (icon) icon.style.transform = 'rotate(45deg)';
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaq);
  } else {
    initFaq();
  }
})();
