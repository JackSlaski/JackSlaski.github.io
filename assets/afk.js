// AFK takeover, like Feudal Living's idle AI: leave the home page alone for 45 seconds and an AI
// "visitor" takes the mouse, wanders round the site thinking out loud, and loops until you're back.
// Any input hands control back and unlocks Autopilot.
(() => {
  const IDLE = new URLSearchParams(location.search).has('afk') ? 5000 : 45000;   // ?afk shortens it for testing

  // What the AI thinks. Edit freely: lines are picked at random, and none repeats until its whole list has been used.
  // PROJECT keys are the page names the cards link to (gerbertgames.html -> gerbertgames).
  const THOUGHTS = {
    hero: ['Who’s this then?', 'Jack Slaski, gameplay and systems designer. Let’s have a look around.', 'This website looks pretty good so far.'],
    stats: ['An MSc with Distinction? He’s clearly qualified.', 'Four years of experience in UE5 is pretty decent.', 'A First and a Distinction, he must have worked hard.', 'Thirteen games and tools? He’s been busy.'],
    profile: ['Those grades are actually really good.', 'He looks pretty professional in that graduation photo.', 'Seems like a nice guy to be fair.'],
    log: ['He was running his own game servers at sixteen? That’s impressive.', 'A quest log instead of a timeline is a nice touch.', 'His next quest is getting a job. Maybe I can help with that.'],
    contact: ['Seems pretty good, I should email him.', 'I think I’m going to hire him.', 'He’d be a good fit for the team to be fair.'],
    project: [
      'That’s decent.',
      'This one looks pretty good.',
      'I’d actually play this.',
      'That looks like a lot of work.',
      'This looks really polished.',
      'I like the look of this one.',
      'How did he find the time for all of these?',
      'Okay, this one’s really cool.',
    ],
  };
  const PROJECT = {
    recoilworks: ['Building your own gun from parts sounds really fun.', 'Every part changes how the gun fires? That’s clever.'],
    flgame: ['An AI that takes over when you go AFK? Hang on a minute…', 'He made this on his own in eight weeks and came second at GradEx? Impressive.'],
    gerbertgames: ['What on earth is a Gerbert?', 'Four players fighting over tiles above a black hole sounds chaotic.'],
    lggame: ['Pirate ships fighting a sea monster? I’m sold.', 'Keeping 29 people’s work together on one game can’t have been easy.'],
    wmgame: ['A wizard against a whole world of slimes is a classic.', 'He made all the UI and effects for this one, and they look great.'],
    armsandassets: ['Procedural guns and a grid inventory remind me of Garry’s Mod.', 'Slotting gems into weapons is a cool idea.'],
    dykbgame: ['Football trivia where you shoot penalties at the right answer is a great idea.', 'I’d probably score more own goals than right answers.'],
    formandflask: ['A potion factory sounds like a brewery for wizards.', 'Automating a whole potion factory looks really satisfying.'],
    cavegen: ['He can write C++ as well? Now he’s just showing off.', 'I definitely know what cellular automata means. Definitely.'],
    survivorslike: ['Bouncing bullets and big explosions are my kind of game.', 'There’s a lot of screen shake in this one, and it feels great.'],
    uishow: ['Someone really likes making menus.', 'A shop, an inventory, and a minimap all in one UI? He’s been busy.'],
    uidiss: ['A whole dissertation on minimalist UI, so less really is more.', 'Research into immersion sounds pretty interesting.'],
    lootbox: ['Loot box research? Is there a case I can open? Oh, there is.', 'Researching loot box ethics is pretty responsible of him.'],
  };
  const ENDING = ['Honestly, I should just email him.', 'Still here? I’ll have another look around.'];

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  // no line repeats until every line in its list has had a turn
  const used = new Set();
  const any = (list) => {
    let fresh = list.filter((l) => !used.has(l));
    if (!fresh.length) { list.forEach((l) => used.delete(l)); fresh = list; }
    const line = fresh[Math.floor(Math.random() * fresh.length)];
    used.add(line);
    return line;
  };
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
        await wait(15000, my);
        say(ENDING[0]);
        await wait(10000, my);
        say(ENDING[1]);
        await wait(3000, my);
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
