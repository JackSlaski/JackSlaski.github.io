// AFK takeover, like Feudal Living's idle AI: leave the home page alone on the hero for a minute
// and the site gives itself a tour. Any input hands control back and unlocks Autopilot.
// It only starts from the hero, so nobody reading further down gets interrupted, and once per visit.
(() => {
  const IDLE = new URLSearchParams(location.search).has('afk') ? 5000 : 60000;   // ?afk shortens it for testing
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const session = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch { return null; } };

  const STOPS = [
    { targets: ['.feature'], text: 'Featured work. Recoil Works is my MSc weapon crafting FPS, and Feudal Living took 2nd place at GradEx.' },
    { targets: ['.feature:nth-of-type(2)'], text: 'Feudal Living has an AI that takes over when you go idle. Sound familiar?' },
    { targets: ['.card:nth-of-type(1)', '.card:nth-of-type(2)', '.card:nth-of-type(3)'], text: 'Past work: eleven more projects, from team games to tools and research.' },
    { targets: ['.profile'], text: 'The player profile. MSc with Distinction, BSc with First Class Honours, and four years in Unreal Engine 5.' },
    { targets: ['.contact__actions .btn'], text: 'That’s the tour. If you need a gameplay designer, this is where to find me.' },
  ];

  let timer = 0, running = false, ui = null, timers = [], start = null;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const eligible = () => !running && !session('afk-done') && !window.secrets?.has('autopilot')
    && document.visibilityState === 'visible' && scrollY < hero.offsetHeight * 0.3 && !document.querySelector('dialog[open]');

  function arm() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (eligible()) takeover(); else arm(); }, IDLE);
  }

  function takeover() {
    running = true;
    session('afk-done', '1');
    ui = document.createElement('div');
    ui.innerHTML = `
      <div class="afk" role="status"><span class="afk__dot" aria-hidden="true"></span><b>AI takeover</b><span>You went idle, so the AI is showing you around. Move to take back control.</span></div>
      <div class="afk-cursor" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2l15 9-7 1.5 4 8-3 1.5-4-8L4 19z" fill="#fff" stroke="#0a0c11" stroke-width="1.5" stroke-linejoin="round"/></svg><span>AI</span></div>
      <p class="afk-caption" aria-live="polite"></p>`;
    document.body.append(ui);
    const cursor = ui.querySelector('.afk-cursor'), caption = ui.querySelector('.afk-caption');
    cursor.style.transform = `translate(${innerWidth * 0.6}px, ${innerHeight * 0.55}px)`;
    if (reduced) cursor.hidden = true;

    let t = 600;
    for (const stop of STOPS) {
      later(() => {
        document.querySelectorAll('.is-afk-hover').forEach((e) => e.classList.remove('is-afk-hover'));
        if (!reduced) document.querySelector(stop.targets[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        caption.textContent = stop.text;
      }, t);
      t += reduced ? 400 : 1400;
      for (const sel of stop.targets) {
        later(() => {
          document.querySelectorAll('.is-afk-hover').forEach((e) => e.classList.remove('is-afk-hover'));
          const el = document.querySelector(sel);
          if (!el || reduced) return;
          const r = el.getBoundingClientRect();
          cursor.style.transform = `translate(${Math.min(r.left + r.width * 0.5, innerWidth - 40)}px, ${Math.min(r.top + Math.min(r.height * 0.4, 160), innerHeight - 60)}px)`;
          later(() => el.classList.add('is-afk-hover'), 850);
        }, t);
        t += stop.targets.length > 1 ? 1500 : 1200;
      }
      t += 2600;
    }
    later(() => { ui.querySelector('.afk span:last-child').textContent = 'Tour over. Move whenever you’re ready.'; }, t);
  }

  // anything the visitor does hands control back. Mouse movement only counts if it really moved,
  // so the browser's own events during the tour's scrolling don't end it early.
  function wake(e) {
    if (e.type === 'pointermove') {
      if (!start) { start = [e.clientX, e.clientY]; if (running) return; }
      if (running && Math.abs(e.clientX - start[0]) + Math.abs(e.clientY - start[1]) < 8) return;
      start = [e.clientX, e.clientY];
    }
    if (running) giveBack();
    else arm();
  }

  function giveBack() {
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
    document.querySelectorAll('.is-afk-hover').forEach((e) => e.classList.remove('is-afk-hover'));
    const banner = ui.querySelector('.afk');
    banner.querySelector('b').textContent = 'Welcome back';
    banner.querySelector('span:last-child').textContent = 'You’re in control again.';
    ui.querySelector('.afk-cursor').remove();
    ui.querySelector('.afk-caption').remove();
    window.secrets?.unlock('autopilot');
    const old = ui;
    setTimeout(() => old.remove(), 2200);
    ui = null;
  }

  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(type, wake, { passive: true });
  addEventListener('scroll', () => { if (!running) arm(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!running) arm(); });
  arm();
})();
