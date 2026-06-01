// =========================================================
// Platizio Global — Shared interactions
// =========================================================

const TRADING_PLATFORM_URL = 'https://trade.clientbridge.in/login?platizioglobal';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@platizioglobal';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initMobileMenu();
  initContactModal();
  initFaqSections();
  initFaqAccordion();
  initScrollReveal();
  initTradingLinks();
  highlightActiveNav();
});

// ---------- Mobile menu ----------
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('is-open');
    const isOpen = links.classList.contains('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close menu when clicking a non-dropdown link
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!a.parentElement.classList.contains('has-dropdown')) {
        links.classList.remove('is-open');
      }
    });
  });
}

// ---------- Active nav highlighting ----------
function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[data-page]').forEach((a) => {
    if (a.dataset.page === path) a.classList.add('active');
  });
}

// ---------- Sticky header shadow ----------
function initNav() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY > 8) header.style.boxShadow = 'var(--shadow-sm)';
    else header.style.boxShadow = 'none';
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------- Contact Us modal ----------
function initContactModal() {
  const overlay = document.getElementById('contactModal');
  const openers = document.querySelectorAll('[data-open-contact]');
  if (!overlay) return;

  const closeBtn = overlay.querySelector('.modal-close');
  const form = overlay.querySelector('#contactForm');
  const success = overlay.querySelector('.success-state');
  const formBody = overlay.querySelector('.form-body');

  const open = (preselectedInterest) => {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (preselectedInterest) {
      const sel = overlay.querySelector('select[name="interest"]');
      if (sel) sel.value = preselectedInterest;
    }
    setTimeout(() => overlay.querySelector('input[name="fullName"]')?.focus(), 200);
  };

  const close = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (form) form.reset();
      if (success) success.style.display = 'none';
      if (formBody) formBody.style.display = '';
    }, 250);
  };

  openers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open(btn.dataset.interest);
    });
  });

  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    // Hook this up to the backend / CRM endpoint. For now we just log.
    console.log('[Platizio Global] Contact lead:', data);

    if (formBody) formBody.style.display = 'none';
    if (success) success.style.display = 'block';
  });
}

// ---------- FAQ section-level accordion ----------
function initFaqSections() {
  document.querySelectorAll('.faq-section-header').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.faq-section');
      if (!section) return;
      const isOpen = section.classList.contains('section-open');
      // Close all other sections
      document.querySelectorAll('.faq-section.section-open').forEach((el) => {
        el.classList.remove('section-open');
        el.querySelector('.faq-section-header')?.setAttribute('aria-expanded', 'false');
        // Close any open question inside it
        el.querySelectorAll('.faq-item.open').forEach((item) => item.classList.remove('open'));
      });
      if (!isOpen) {
        section.classList.add('section-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ---------- FAQ accordion ----------
function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    q?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      // Close siblings within the same section for cleaner UX
      const parent = item.parentElement;
      parent?.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

// ---------- Scroll reveal ----------
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
}

// ---------- Inject trading platform URL ----------
function initTradingLinks() {
  document.querySelectorAll('[data-trading]').forEach((a) => {
    a.setAttribute('href', TRADING_PLATFORM_URL);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  document.querySelectorAll('[data-youtube]').forEach((a) => {
    const v = a.dataset.youtube;
    a.setAttribute('href', v ? v : YOUTUBE_CHANNEL_URL);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}
