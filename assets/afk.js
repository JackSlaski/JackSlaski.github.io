// AFK takeover, like Feudal Living's idle AI: leave the home page alone for 45 seconds and an AI
// "visitor" takes the mouse, wanders round the site thinking out loud, and loops until you're back.
// Any input hands control back and unlocks Autopilot.
(() => {
  const IDLE = new URLSearchParams(location.search).has('afk') ? 5000 : 45000;   // ?afk shortens it for testing

  // What the AI thinks. Edit freely: one line is picked at random each time.
  // PROJECT keys are the page names the cards link to (gerbertgames.html -> gerbertgames).
  const THOUGHTS = {
    hero: ['Right then, who’s this?', 'Jack Slaski. Gameplay designer. Let’s have a look.', 'Nice website, this.'],
    stats: ['An MSc with Distinction? This lad’s qualified.', 'Four years of Unreal Engine. Fair play.', 'A First and a Distinction. Clever clogs.'],
    profile: ['Proper grades, these. Not bad at all.', 'Graduation photo. Looks the part.', 'Seems like a sound lad.'],
    log: ['Running his own game servers at sixteen? Fair play.', 'A quest log. Very on brand.', 'Next quest: get a job. Someone sort this lad out.'],
    contact: ['Right, I’m hiring him.', 'This lad’s class. Somebody hire him.', 'Need a gameplay designer? Go on then.'],
    project: ['Ooh, this looks decent.', 'Now that’s tidy.', 'Proper bit of work, that.', 'Not bad. Not bad at all.', 'I’d have a go on that.'],
  };
  const PROJECT = {
    recoilworks: ['Build your own gun from parts? Brilliant.', 'Swap the barrel and the whole gun changes. Clever, that.'],
    flgame: ['An AI that takes over when you go AFK? Hang on a minute…', 'Second at GradEx, made on his own in eight weeks. Fair play.'],
    gerbertgames: ['What on earth is a Gerbert?', 'Four mates fighting over tiles above a black hole. Proper party game.'],
    lggame: ['Pirate ships and a sea monster. Sold.', 'Tech lead on a team of 29? Rather him than me.'],
    wmgame: ['A wizard against loads of slimes. Classic.', 'He did all the UI and effects on this one. Tidy.'],
    armsandassets: ['Procedural guns and a grid inventory. Very Garry’s Mod.', 'Gems you slot into your weapons? Go on then.'],
    dykbgame: ['Footy trivia where you take penalties at the answers. Class.', 'Do You Know Ball? I’d get relegated.'],
    formandflask: ['A potion factory. Like a brewery, but for wizards.', 'Fuzzy logic marking your potions. Very clever.'],
    cavegen: ['He writes C++ as well? Showing off now.', 'Cellular automata. Yeah, I definitely know what that means.'],
    survivorslike: ['Bouncy bullets and big explosions. Get in.', 'Look at all that screen shake. Proper game feel.'],
    uishow: ['A whole RPG menu system. Someone likes a menu.', 'Shop, inventory, minimap… he’s been busy.'],
    uidiss: ['A whole dissertation on minimalist UI. Less is more, apparently.', 'Research into immersion. Brainy stuff.'],
    lootbox: ['Loot box research. Is there a case I can open? Oh, there is.', 'Loot box ethics. Very responsible, that.'],
  };
  const ENDING = ['…honestly, just email him.', 'Still here? Go on, I’ll have another look round.'];

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const any = (list) => list[Math.floor(Math.random() * list.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const STOP = Symbol('stop');

  let idle = 0, running = false, gen = 0, ui = null, cursor = null, thought = null, pos = [0, 0], frames = new Set(), start = null;

  const eligible = () => !running && document.visibilityState === 'visible' && !document.querySelector('dialog[open]');
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
  // a gentle curve at a human pace, landing somewhere inside the element, not dead centre
  function moveTo(x, y, my, dur) {
    if (reduced) return Promise.resolve();
    const [x0, y0] = pos, dx = x - x0, dy = y - y0, dist = Math.hypot(dx, dy) || 1, bend = rand(-0.3, 0.3) * dist;
    const cx = x0 + dx / 2 - (dy / dist) * bend, cy = y0 + dy / 2 + (dx / dist) * bend;
    return animate(dur || Math.min(2600, 900 + dist * 1.4), my, (e) => {
      const u = 1 - e;
      place(u * u * x0 + 2 * u * e * cx + e * e * x, u * u * y0 + 2 * u * e * cy + e * e * y);
    });
  }
  const spot = (el) => {
    const r = el.getBoundingClientRect();
    return [Math.min(innerWidth - 40, r.left + r.width * rand(0.25, 0.7)), Math.min(innerHeight - 60, r.top + Math.min(r.height * rand(0.2, 0.55), 240))];
  };
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
        await wait(rand(3600, 5200), my);
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
        await wait(10000, my);
        say(ENDING[0]);
        await wait(8000, my);
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
    arm();   // go idle again and it'll come back
  }

  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(type, wake, { passive: true });
  addEventListener('scroll', () => { if (!running) arm(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!running) arm(); });
  arm();
})();
