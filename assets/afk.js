// AFK takeover, like Feudal Living's idle AI: leave the home page alone on the hero and an AI
// "visitor" takes the mouse, wanders round the site thinking out loud, and loops until you're back.
// Any input hands control back and unlocks Autopilot. It only starts from the hero, so nobody
// reading further down gets interrupted, and only once per visit.
(() => {
  const IDLE = new URLSearchParams(location.search).has('afk') ? 5000 : 45000;   // ?afk shortens it for testing

  // What the AI thinks. Edit freely: one line is picked at random each time.
  // PROJECT keys are the page names the cards link to (gerbertgames.html -> gerbertgames).
  const THOUGHTS = {
    hero: ['Right, who’s this then?', 'Jack Slaski. Gameplay and systems designer. Go on then.', 'Nice site. Very orange.'],
    stats: ['Four years in Unreal Engine 5. That’s a lot of Blueprints.', 'A Distinction and a First? Bit of an overachiever.', 'Thirteen games and tools. Busy man.'],
    profile: ['Nice graduation photo. Very professional.', 'Okay, those grades are actually really good.', 'A player profile instead of an About Me. I see what he did there.'],
    log: ['A quest log instead of a boring timeline. Cute.', 'Running Garry’s Mod servers since 2020? Respect.', 'Next quest: get hired. I can help with that.'],
    contact: ['Wow, this guy is good. I should hire him.', 'Right, I’m emailing him. Today.', 'Need a gameplay designer? I think I do, actually.'],
    project: [
      'Ooh, look at this project. This is cool.',
      'Okay, this one looks good.',
      'Bookmarking this one.',
      'How did he make all of these?',
      'I need to play this.',
    ],
  };
  const PROJECT = {
    recoilworks: ['A weapon crafting FPS where every part changes how it fires? Cool.', 'Swap a barrel, change the whole gun. I want this.'],
    flgame: ['A life sim with an AI that takes over when you go idle. Wait a minute…', 'Second at GradEx, built solo in eight weeks. Not bad at all.'],
    gerbertgames: ['A party game about Gerberts. What even is a Gerbert?', 'Four players fighting over tiles above a black hole. Chaos. Love it.'],
    lggame: ['Pirate ships and a leviathan. Say no more.', 'Tech lead on a team of 29? That’s a lot of merge conflicts.'],
    wmgame: ['A wizard versus a world of slimes. Classic.', 'He did all the UI and VFX for this one. Shiny.'],
    armsandassets: ['Procedural guns and a grid inventory. Big Garry’s Mod energy.', 'Gem slots on weapons? Okay, I’m interested.'],
    dykbgame: ['Football trivia where you shoot penalties at the answer. Genius.', 'Do You Know Ball? I do not, actually.'],
    formandflask: ['A potion factory. Automation and potions, my two favourite things.', 'Fuzzy logic judging potion quality. Fancy.'],
    cavegen: ['A cave generator written in C++. He codes too?', 'Cellular automata. I definitely know what that means.'],
    survivorslike: ['Bouncing projectiles and big explosions. Game feel is everything.', 'Look at all that screen shake. Lovely.'],
    uishow: ['A whole RPG interface. Someone likes menus.', 'Inventory, minimap, shop… that’s a lot of UI.'],
    uidiss: ['A dissertation on minimalist UI. Less is more, apparently.', 'Research into immersion. Brains and games.'],
    lootbox: ['Loot box research. Is there a case I can open? Oh wait, there is.', 'Loot box ethics. Very responsible of him.'],
  };
  const ENDING = ['…seriously, someone hire this man.', 'Still here? I’ll go round again.'];

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const session = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch { return null; } };
  const any = (list) => list[Math.floor(Math.random() * list.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const STOP = Symbol('stop');

  let idle = 0, running = false, gen = 0, ui = null, cursor = null, thought = null, pos = [0, 0], frames = new Set(), start = null;

  const eligible = () => !running && !session('afk-done') && !window.secrets?.has('autopilot')
    && document.visibilityState === 'visible' && scrollY < hero.offsetHeight * 0.3 && !document.querySelector('dialog[open]');
  function arm() {
    clearTimeout(idle);
    idle = setTimeout(() => { if (eligible()) takeover(); else arm(); }, IDLE);
  }

  // every wait and animation checks it's still the same takeover, so input can stop it at any point
  const wait = (ms, my) => new Promise((res, rej) => setTimeout(() => (my === gen ? res() : rej(STOP)), ms));
  function animate(dur, my, fn) {
    return new Promise((res, rej) => {
      const t0 = performance.now();
      const frame = (now) => {
        frames.delete(id);
        if (my !== gen) return rej(STOP);
        const t = Math.min(1, (now - t0) / dur);
        fn(ease(t), now);
        if (t < 1) { id = requestAnimationFrame(frame); frames.add(id); } else res();
      };
      let id = requestAnimationFrame(frame);
      frames.add(id);
    });
  }

  // slow scrolling, a lot gentler than the browser's own smooth scroll
  function scrollToY(y, my, dur) {
    const y0 = scrollY, y1 = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    if (reduced || Math.abs(y1 - y0) < 4) return Promise.resolve();
    return animate(dur || Math.min(3200, 1100 + Math.abs(y1 - y0) * 0.9), my, (e) => scrollTo({ top: y0 + (y1 - y0) * e, behavior: 'instant' }));
  }
  const centre = (el, my) => { const r = el.getBoundingClientRect(); return scrollToY(scrollY + r.top + r.height / 2 - innerHeight / 2, my); };

  function place(x, y) {
    pos = [x, y];
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.classList.toggle('is-left', x > innerWidth - 320);
  }
  // a curved, slightly shaky path at a human pace, landing somewhere inside the element, not dead centre
  function moveTo(x, y, my, dur) {
    if (reduced) return Promise.resolve();
    const [x0, y0] = pos, dx = x - x0, dy = y - y0, dist = Math.hypot(dx, dy) || 1, bend = rand(-0.3, 0.3) * dist;
    const cx = x0 + dx / 2 - (dy / dist) * bend, cy = y0 + dy / 2 + (dx / dist) * bend;
    return animate(dur || Math.min(2600, 900 + dist * 1.4), my, (e, now) => {
      const u = 1 - e, shake = Math.sin(now / 70) * 0.8;
      place(u * u * x0 + 2 * u * e * cx + e * e * x + shake, u * u * y0 + 2 * u * e * cy + e * e * y + shake);
    });
  }
  const spot = (el) => {
    const r = el.getBoundingClientRect();
    return [Math.min(innerWidth - 40, r.left + r.width * rand(0.25, 0.7)), Math.min(innerHeight - 60, r.top + Math.min(r.height * rand(0.2, 0.55), 240))];
  };
  // little drifts while it "reads", like a hand resting on a mouse
  async function linger(ms, my) {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      await wait(rand(300, 900), my);
      if (performance.now() >= end) break;
      await moveTo(pos[0] + rand(-28, 28), pos[1] + rand(-16, 16), my, rand(600, 1100));
    }
  }
  function say(text) {
    thought.textContent = text;
    thought.classList.toggle('is-on', !!text);
  }
  const slug = (el) => (el.querySelector('a[href$=".html"]')?.getAttribute('href') || '').replace('.html', '');

  function beats() {
    const cards = [...document.querySelectorAll('.card')].filter((c) => !c.hidden).sort(() => Math.random() - 0.5).slice(0, 4)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    return [
      ['.hero__name', THOUGHTS.hero],
      ['.stats', THOUGHTS.stats],
      ...[...document.querySelectorAll('.feature')].map((f) => [f, PROJECT[slug(f)] || THOUGHTS.project]),
      ...cards.map((c) => [c, Math.random() < 0.7 && PROJECT[slug(c)] ? PROJECT[slug(c)] : THOUGHTS.project]),
      ['.profile', THOUGHTS.profile],
      ['.log', THOUGHTS.log],
    ];
  }

  async function tour(my) {
    place(innerWidth * rand(0.55, 0.7), innerHeight * rand(0.45, 0.6));
    for (;;) {
      for (const [target, lines] of beats()) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) continue;
        say('');
        await centre(el, my);
        await wait(rand(300, 700), my);
        await moveTo(...spot(el), my);
        el.classList.add('is-afk-hover');
        say(any(lines));
        await linger(rand(3600, 5200), my);
        el.classList.remove('is-afk-hover');
      }
      // the ending: parked on "Email me", so you might come back to find it there
      const email = document.querySelector('.contact__actions .btn');
      if (email) {
        say('');
        await centre(email, my);
        await moveTo(...spot(email), my);
        email.classList.add('is-afk-hover');
        say(any(THOUGHTS.contact));
        await linger(9000, my);
        say(ENDING[0]);
        await linger(9000, my);
        say(ENDING[1]);
        await wait(2500, my);
        email.classList.remove('is-afk-hover');
      }
      say('');
      await scrollToY(0, my, 5000);
    }
  }

  function takeover() {
    running = true;
    session('afk-done', '1');
    const my = ++gen;
    ui = document.createElement('div');
    ui.innerHTML = `
      <div class="afk" role="status"><span class="afk__dot" aria-hidden="true"></span><b>AI takeover</b><span>You went idle, so the AI is having a look around. Move to take back control.</span></div>
      <div class="afk-cursor${reduced ? ' is-still' : ''}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 2l15 9-7 1.5 4 8-3 1.5-4-8L4 19z" fill="#fff" stroke="#0a0c11" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="afk-cursor__tag">AI</span><p class="afk-thought"></p></div>`;
    document.body.append(ui);
    cursor = ui.querySelector('.afk-cursor');
    thought = ui.querySelector('.afk-thought');
    tour(my).catch((e) => { if (e !== STOP) throw e; });
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
    gen++;
    frames.forEach(cancelAnimationFrame);
    frames.clear();
    document.querySelectorAll('.is-afk-hover').forEach((el) => el.classList.remove('is-afk-hover'));
    const banner = ui.querySelector('.afk');
    banner.querySelector('b').textContent = 'Welcome back';
    banner.querySelector('span:last-child').textContent = 'You’re in control again.';
    cursor.remove();
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
