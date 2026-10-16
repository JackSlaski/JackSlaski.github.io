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
  if (slides.length > 1 && dots) {
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
  }

  // project page media viewer: one big stage, a strip of thumbnails (images and YouTube)
  const viewer = $('[data-viewer]');
  if (viewer) {
    const stage = $('.viewer__stage', viewer), thumbs = $$('.viewer__thumb', viewer);
    const render = (t, autoplay) => {
      thumbs.forEach((x) => x.setAttribute('aria-current', String(x === t)));
      stage.replaceChildren();
      if (t.dataset.yt && autoplay) {
        const f = document.createElement('iframe');
        f.src = `https://www.youtube-nocookie.com/embed/${t.dataset.yt}?autoplay=1&rel=0`;
        f.title = t.dataset.label; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
        stage.append(f);
      } else {
        const img = new Image();
        img.src = t.dataset.full; img.alt = t.dataset.label;
        if (t.dataset.yt) img.onerror = () => { img.src = `https://i.ytimg.com/vi/${t.dataset.yt}/hqdefault.jpg`; };
        stage.append(img);
        if (t.dataset.yt) {
          const play = document.createElement('button');
          play.type = 'button'; play.className = 'viewer__play'; play.innerHTML = '<span>Play video</span>';
          play.addEventListener('click', () => render(t, true));
          stage.append(play);
        }
      }
      const cap = $('.viewer__caption', viewer); if (cap) cap.textContent = t.dataset.label;
    };
    thumbs.forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); render(t, false); }));
    if (thumbs[0]) render(thumbs[0], false);
  }

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
