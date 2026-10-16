// jackslaski.com: nav, hero slideshow, project filters, reveal on scroll.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav: solid once you leave the hero, menu toggle on small screens
  const nav = $('#nav'), toggle = $('.nav__toggle', nav);
  const solid = () => nav.classList.toggle('is-solid', scrollY > 40);
  solid(); addEventListener('scroll', solid, { passive: true });
  const setMenu = (open) => { nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // highlight the section you're in
  const links = $$('#nav-links a[href^="#"]');
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  // hero: slow crossfade through project screenshots, like a game's title screen
  const slides = $$('.hero__slides img'), now = $('[data-now]'), dots = $('[data-dots]');
  let i = 0, timer = 0;
  const show = (n) => {
    slides[i].classList.remove('is-on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-on');
    now.textContent = slides[i].dataset.title;
    $$('button', dots).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  };
  slides.forEach((s, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show ${s.dataset.title}`);
    b.setAttribute('aria-current', String(k === 0));
    b.addEventListener('click', () => { show(k); restart(); });
    dots.append(b);
  });
  const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(i + 1), 6000); };
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : restart()));
  restart();

  // project filters
  const cards = $$('.card');
  $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    cards.forEach((c) => { c.hidden = f !== 'all' && !c.dataset.tags.split(' ').includes(f); });
  }));

  // reveal once on scroll; content is visible without JS
  const items = $$('.reveal, .grade');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  items.forEach((el) => io.observe(el));
})();
