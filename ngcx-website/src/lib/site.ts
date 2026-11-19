/** Seitenweite Interaktionen: Header, Mobilmenü, Hinweisleiste, Sticky-CTA, Scroll-Animation, E-Mail. */

// Header beim Scrollen abdunkeln
const header = document.getElementById('site-header');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobilmenü (ESC schließt, Fokus bleibt im Menü)
const burger = document.getElementById('burger') as HTMLButtonElement | null;
const menu = document.getElementById('mobile-menu');
if (burger && menu && header) {
  const focusables = () =>
    [burger, ...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
  const setOpen = (open: boolean, returnFocus = true) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    menu.hidden = !open;
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (returnFocus) burger.focus();
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false, false);
  });
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Tab') {
      const f = focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.matchMedia('(min-width: 1060px)').addEventListener('change', (m) => { if (m.matches) setOpen(false, false); });
}

// Hinweisleiste schließen (nur für diese Sitzung, sessionStorage – kein Cookie)
const announce = document.getElementById('announce');
if (announce) {
  try { if (sessionStorage.getItem('ngcx-announce') === '0') announce.classList.add('is-hidden'); } catch {}
  announce.querySelector('.announce-close')?.addEventListener('click', () => {
    announce.classList.add('is-hidden');
    try { sessionStorage.setItem('ngcx-announce', '0'); } catch {}
    document.getElementById('inhalt')?.focus({ preventScroll: true });
  });
}

// Sticky-CTA (mobil) erst nach dem Hero zeigen
const sticky = document.getElementById('sticky-cta');
const hero = document.querySelector('[data-hero]');
if (sticky && hero) {
  const stickyLink = sticky.querySelector('a');
  let pastHero = false, nearEnd = false;
  const render = () => {
    const show = pastHero && !nearEnd;
    sticky.classList.toggle('show', show);
    sticky.setAttribute('aria-hidden', String(!show));
    stickyLink?.setAttribute('tabindex', show ? '0' : '-1');
  };
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; render(); }).observe(hero);
  const end = document.querySelector('.site-footer');
  if (end) new IntersectionObserver(([e]) => { nearEnd = e.isIntersecting; render(); }).observe(end);
}

// Dezente Einblend-Animation
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  reveals.forEach((el) => io.observe(el));
} else reveals.forEach((el) => el.classList.add('in'));

// E-Mail-Adresse zusammensetzen
document.querySelectorAll<HTMLAnchorElement>('.js-mail').forEach((a) => {
  const addr = `${a.dataset.u}@${a.dataset.d}`;
  a.href = `mailto:${addr}`;
  a.textContent = addr;
});
