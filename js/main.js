/* ============================================================
   RÉDUIRE SON IMPÔT by mon-assureur.com
   JavaScript principal — Simulateur PER + UX interactions
   ============================================================ */

'use strict';

/* ---- NAVBAR SCROLL ---- */
(function() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();

/* ---- MOBILE MENU ---- */
(function() {
  const toggle = document.querySelector('.navbar-toggle');
  const nav    = document.querySelector('.navbar-nav');
  const cta    = document.querySelector('.navbar-cta');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav && nav.classList.toggle('open');
    if (cta) cta.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (nav && nav.classList.contains('open') && !e.target.closest('.navbar-inner')) {
      nav.classList.remove('open');
      if (cta) cta.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ---- SIMULATEUR PER ---- */
const PERSimulator = (function() {

  // Tranches IRPP 2026
  const TRANCHES = [
    { max: 11_497,  rate: 0    },
    { max: 29_315,  rate: 0.11 },
    { max: 83_823,  rate: 0.30 },
    { max: 180_294, rate: 0.41 },
    { max: Infinity, rate: 0.45 }
  ];

  function getTMI(revenuImposable) {
    const ri = Math.max(0, revenuImposable);
    for (const t of TRANCHES) {
      if (ri <= t.max) return t.rate;
    }
    return 0.45;
  }

  function getPlafond(revenuBrut, statut) {
    if (statut === 'independant') {
      const base   = revenuBrut * 0.10;
      const madelin = Math.min(revenuBrut * 0.154, 43_992 * 0.154);
      return Math.min(Math.round(base + madelin), 85_780);
    }
    const calc = revenuBrut * 0.10;
    const minF = 4_399;
    const maxF = 35_194;
    return Math.min(Math.max(calc, minF), maxF);
  }

  function calcEconomy(revenuBrut, versement, statut) {
    const revenuImposable = statut === 'salarie' ? revenuBrut * 0.9 : revenuBrut;
    const plafond         = getPlafond(revenuBrut, statut);
    const versementRetenu = Math.min(versement, plafond);
    const tmi             = getTMI(revenuImposable);
    const economy         = Math.round(versementRetenu * tmi);
    const effortReel      = Math.round(versement - economy);
    return { versement, versementRetenu, plafond, tmi, economy, effortReel };
  }

  function fmt(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }
  function fmtPct(n) { return Math.round(n * 100) + '%'; }

  function bindSimulator(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('input, select').forEach(el => el.addEventListener('input', () => compute(form)));
    const btn = form.querySelector('.btn-simulate');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); compute(form); });
  }

  function compute(form) {
    const revenu    = parseFloat((form.querySelector('[name="revenu"]') || form.querySelector('[name="revenuAnnuel"]') || {}).value) || 0;
    const versement = parseFloat((form.querySelector('[name="versement"]') || {}).value) || 0;
    const statut    = (form.querySelector('[name="statut"]') || {}).value || 'salarie';
    const result    = form.querySelector('.sim-result');
    const leadCapture = form.querySelector('.sim-lead-capture');

    if (!result) return;

    if (revenu < 1000 || versement < 100) {
      result.classList.remove('visible');
      if (leadCapture) leadCapture.classList.remove('visible');
      return;
    }

    const data = calcEconomy(revenu, versement, statut);

    const set = (sel, val) => { const el = result.querySelector(sel); if (el) el.textContent = val; };
    set('[data-sim="economy"]',  fmt(data.economy));
    set('[data-sim="effort"]',   fmt(data.effortReel));
    set('[data-sim="versement"]', fmt(data.versement));
    set('[data-sim="tmi"]',      fmtPct(data.tmi));
    set('[data-sim="plafond"]',  fmt(data.plafond));

    const msgEl = result.querySelector('.sim-result-msg');
    if (msgEl) {
      const pct = data.versement > 0 ? Math.round((data.economy / data.versement) * 100) : 0;
      msgEl.innerHTML = `🎯 L'État finance <strong>${pct}%</strong> de votre épargne. Votre effort réel est de seulement <strong>${fmt(data.effortReel)}</strong>.`;
    }

    result.classList.add('visible');

    // Afficher la capture de leads après résultat
    if (leadCapture) {
      setTimeout(() => leadCapture.classList.add('visible'), 600);
    }

    if (window.innerWidth < 768) {
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  return { bindSimulator, calcEconomy, getPlafond, fmt };
})();

/* ---- INIT SIMULATEURS ---- */
document.addEventListener('DOMContentLoaded', () => {
  PERSimulator.bindSimulator('sim-hero');
  PERSimulator.bindSimulator('sim-page');
  PERSimulator.bindSimulator('sim-full');
});

/* ---- FAQ ACCORDION — version smooth max-height ---- */
document.addEventListener('DOMContentLoaded', () => {
  const faqs = document.querySelectorAll('.faq-item');
  if (!faqs.length) return;

  faqs.forEach(item => {
    const q      = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!q) return;

    // Accessibilité clavier
    q.setAttribute('role', 'button');
    q.setAttribute('tabindex', '0');

    const toggle = () => {
      const isOpen = item.classList.contains('open');
      // Fermer tous
      faqs.forEach(f => {
        f.classList.remove('open');
        const qa = f.querySelector('.faq-question');
        if (qa) qa.setAttribute('aria-expanded', 'false');
      });
      // Ouvrir si était fermé
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    };

    q.addEventListener('click', toggle);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Ouvrir le premier par défaut
  const first = faqs[0];
  if (first) {
    first.classList.add('open');
    const fq = first.querySelector('.faq-question');
    if (fq) fq.setAttribute('aria-expanded', 'true');
  }
});

/* ---- MINI LEAD FORM SIMULATEUR ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sim-lead-form-el').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const prenom = form.querySelector('[name="sim-prenom"]')?.value?.trim();
      const tel    = form.querySelector('[name="sim-tel"]')?.value?.trim();
      if (!prenom || !tel) {
        form.querySelectorAll('input:invalid, input[required]').forEach(i => {
          if (!i.value.trim()) i.style.borderColor = '#DC2626';
        });
        return;
      }
      const btn = form.querySelector('.sim-lead-submit');
      if (btn) { btn.textContent = 'Envoi…'; btn.disabled = true; }
      setTimeout(() => {
        const parent = form.closest('.sim-lead-capture');
        if (parent) parent.innerHTML = `
          <div style="text-align:center;padding:12px 0;">
            <div style="font-size:1.8rem;margin-bottom:8px;">🎉</div>
            <p style="font-weight:700;color:#111827;margin-bottom:4px;">Merci ${prenom} !</p>
            <p style="font-size:.82rem;color:#6B7280;">Un conseiller vous contacte dans les 24h avec votre étude personnalisée.</p>
          </div>`;
        if (window.dataLayer) window.dataLayer.push({ event: 'sim_lead_submit' });
      }, 800);
    });
  });
});

/* ---- LEAD FORMS PRINCIPAUX ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lead-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#DC2626';
          field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
        }
      });
      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Envoi en cours…'; btn.disabled = true; }

      setTimeout(() => {
        form.style.display = 'none';
        const success = form.closest('.form-card')?.querySelector('.form-success') || form.nextElementSibling;
        if (success) success.classList.add('visible');
        if (window.dataLayer) window.dataLayer.push({ event: 'lead_form_submit', form_id: form.id || 'unknown' });
      }, 900);
    });
  });
});

/* ---- SMOOTH ANCHOR SCROLL ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 88;
      const top    = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
});

/* ---- FADE-IN OBSERVER ---- */
document.addEventListener('DOMContentLoaded', () => {
  const els = document.querySelectorAll('.fade-in, .fade-in-delay-1, .fade-in-delay-2, .fade-in-delay-3');
  if (!els.length || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = 'running';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => { el.style.animationPlayState = 'paused'; obs.observe(el); });
});

/* ---- NUMBER COUNTERS ---- */
document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el       = e.target;
      const target   = parseFloat(el.dataset.count);
      const suffix   = el.dataset.suffix || '';
      const prefix   = el.dataset.prefix || '';
      const duration = 1400;
      const start    = performance.now();
      const animate  = (now) => {
        const pct   = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - pct, 3);
        const val   = target * eased;
        el.textContent = prefix + (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
        if (pct < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
});

/* ---- ACTIVE NAV LINK ---- */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href !== 'index.html' && href !== '/' && path.endsWith(href.replace(/^.*\//, ''))) {
      link.classList.add('active');
    }
    if ((path === '/' || path.endsWith('index.html')) && (href === 'index.html' || href === '/')) {
      link.classList.add('active');
    }
  });
});

/* ---- GTM ---- */
window.dataLayer = window.dataLayer || [];
function trackCTA(label) { window.dataLayer.push({ event: 'cta_click', cta_label: label }); }
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', () => trackCTA(el.dataset.track));
  });
});
