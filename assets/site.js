// jackslaski.com: reveals, lite videos, the projectile diagram, and the secrets layer.
// Everything here is extra. The pages read fine without it.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  /* ---------- reveal once ---------- */
  const targets = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
    }), 2500));
  } else targets.forEach((el) => el.classList.add('is-in'));

  /* ---------- lite YouTube: thumbnail until pressed ---------- */
  $$('[data-video]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.video}?autoplay=1&rel=0`;
    f.title = a.getAttribute('aria-label') || 'Video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    a.replaceChildren(f);
    a.removeAttribute('href');
  }));

  /* ---------- Recoil Works: projectile behaviour diagrams ---------- */
  const stage = $('[data-behaviours]');
  if (stage) behaviours(stage);

  function behaviours(root) {
    const canvas = $('canvas', root);
    const caption = $('[data-caption]', root);
    const detonate = $('[data-detonate]', root);
    const buttons = $$('[data-behaviour]', root);
    root.classList.add('is-live');
    const ctx = canvas.getContext('2d');
    const W = 800, H = 450, G = 380, WALL = 712;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const sand = () => css.getPropertyValue('--bg').trim() || '#e6dbc7';

    const arc = (x0, y0, x1, y1, h) => (t) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t - h * 4 * t * (1 - t) });
    const paths = {
      lobbed: { dur: 1.5, at: arc(70, 350, 520, G, 230) },
      scuttle: { dur: 2.0, at: (t) => t < 0.4 ? arc(70, 350, 300, G, 120)(t / 0.4) : { x: 300 + 280 * ((t - 0.4) / 0.6), y: G - Math.abs(Math.sin(((t - 0.4) / 0.6) * Math.PI * 7)) * 10 } },
      corkscrew: { dur: 1.6, at: (t) => ({ x: 70 + (WALL - 82) * t, y: 300 - 40 * t + Math.sin(t * Math.PI * 9) * 34 }) },
      bouncing: { dur: 2.2, at: (t) => {
        const hops = [[70, 300, 200], [300, 440, 110], [440, 540, 60], [540, 600, 25]], n = hops.length;
        const i = Math.min(n - 1, Math.floor(t * n)), [a, b, h] = hops[i];
        return arc(a, i ? G : 350, b, G, h)(t * n - i);
      } },
      sticky: { dur: 1.3, hold: 0.7, at: (t) => arc(70, 350, WALL - 12, 230, 90)(t) },
      timed: { dur: 1.1, at: (t) => arc(70, 350, 760, G, 300)(t * 0.52) },
      proximity: { dur: 1.3, wait: true, at: arc(70, 350, 470, G, 170) },
      manual: { dur: 1.3, manual: true, at: arc(70, 350, 470, G, 170) },
    };

    let current = 'lobbed', start = 0, raf = 0, boomAt = 0, armed = false, walker = 780;

    function draw(now) {
      const p = paths[current], ink = sand();
      const t = Math.min(1, (now - start) / (p.dur * 1000));
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ink; ctx.globalAlpha = 0.18;
      ctx.fillRect(0, G + 8, W, 4);                    // ground
      if (current === 'sticky' || current === 'corkscrew') ctx.fillRect(WALL, 120, 10, G - 112);
      ctx.globalAlpha = 1;
      ctx.fillRect(40, 340, 46, 22);                   // launcher
      for (let i = 0; i <= 40; i++) {                  // trail
        const s = (i / 40) * t, q = p.at(s);
        ctx.globalAlpha = 0.12 + 0.5 * (i / 40);
        ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pos = p.at(t);
      let boom = false;
      if (t >= 1) {
        if (p.wait) {                                  // proximity: a target walks in
          walker = Math.max(pos.x + 55, walker - 3.2);
          ctx.fillRect(walker - 9, G - 54, 18, 54);
          boom = walker <= pos.x + 56;
        } else if (p.manual) {
          armed = true; detonate.hidden = false;
          boom = boomAt > 0;
        } else boom = !p.hold || now - start > (p.dur + p.hold) * 1000;
      }
      if (boom) {
        if (!boomAt) boomAt = now;
        const k = Math.min(1, (now - boomAt) / 500);
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 12 + 70 * k, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = ink; ctx.stroke();
        ctx.globalAlpha = 1;
        if (k >= 1 && now - boomAt > 900) { restart(); }
      } else {
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    function restart() {
      start = performance.now(); boomAt = 0; armed = false; walker = 780; detonate.hidden = true;
    }
    function pick(name) {
      current = name;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.behaviour === name)));
      caption.textContent = $(`[data-behaviour="${name}"]`, root).dataset.desc;
      restart();
      if (reduce) staticDraw();
    }
    function staticDraw() {                          // reduced motion: the whole path, no travel
      cancelAnimationFrame(raf);
      const p = paths[current];
      start = performance.now() - p.dur * 1000 - 1; boomAt = 0;
      const once = (n) => { draw(n); cancelAnimationFrame(raf); };
      requestAnimationFrame(once);
    }
    buttons.forEach((b) => b.addEventListener('click', () => pick(b.dataset.behaviour)));
    detonate.addEventListener('click', () => { if (armed) boomAt = performance.now(); if (reduce) staticDraw(); });

    const vis = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting && !reduce) raf = requestAnimationFrame(draw);
    });
    vis.observe(canvas);
    pick('lobbed');
  }

  /* ---------- secrets ---------- */
  const SECRETS = [
    { id: 'cheat', name: 'Cheat code', done: 'You entered the Konami code and switched on the debug build.', hint: 'Old games had cheat codes. So does this site.' },
    { id: 'console', name: 'Under the hood', done: 'You found the developer console.', hint: 'Developers: the console is open.' },
    { id: 'printer', name: 'Money printer', done: 'You printed £13,000, which is what my Garry’s Mod servers really made.', hint: 'Something from my Garry’s Mod days still works.' },
    { id: 'tiles', name: 'Colour tiles', done: 'You beat the bot at a round of Gerbert Games.', hint: 'Type the name of a party game I made.' },
    { id: 'speedrun', name: 'Any%', done: 'You reached the end of the page in under 15 seconds.', hint: 'Some players skip the story.' },
    { id: 'paperwork', name: 'Paperwork', done: 'You opened my CV. Good choice.', hint: 'Every recruiter’s favourite file.' },
  ];
  const KEY = 'jackslaski-secrets';
  const found = (() => { try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch { return new Set(); } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch { /* private mode */ } };

  // HUD counter, the one visible hint that there is something to find
  const hud = document.createElement('button');
  hud.className = 'hud'; hud.type = 'button'; hud.setAttribute('aria-haspopup', 'dialog');
  ($('.pin__name') || document.body).append(hud);

  const toastEl = document.createElement('div');
  toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
  document.body.append(toastEl);
  let toastTimer = 0;
  function toast(title, text) {
    toastEl.innerHTML = '';
    const s = document.createElement('strong'); s.textContent = title;
    const p = document.createElement('span'); p.className = 'small'; p.textContent = text;
    toastEl.append(s, p);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }

  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-labelledby', 'secrets-title');
  sheet.innerHTML = `
    <h2 id="secrets-title">Secrets</h2>
    <p class="small" style="margin-top:.5rem">Six things are hidden on this site. What you find stays found on this device.</p>
    <ul class="ach"></ul>
    <div class="sheet__foot">
      <button class="link small" type="button" data-reset>Reset progress</button>
      <button class="button" type="button" data-close>Close</button>
    </div>`;
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });
  $('[data-reset]', sheet).addEventListener('click', () => { found.clear(); save(); render(); });

  function render() {
    hud.textContent = `${found.size} of ${SECRETS.length} secrets`;
    hud.setAttribute('aria-label', `Secrets: ${found.size} of ${SECRETS.length} found`);
    $$('[data-secret-count]').forEach((el) => { el.textContent = found.size; });
    const list = $('.ach', sheet); list.innerHTML = '';
    for (const s of SECRETS) {
      const li = document.createElement('li'), done = found.has(s.id);
      li.className = done ? 'is-done' : '';
      li.innerHTML = `<span></span><span class="small"></span><span class="small"></span>`;
      li.children[0].textContent = done ? s.name : 'Locked';
      li.children[1].textContent = done ? 'Found' : '';
      li.children[2].textContent = done ? s.done : s.hint;
      list.append(li);
    }
  }
  function openSheet() { render(); sheet.showModal(); }
  hud.addEventListener('click', openSheet);
  $$('[data-open-achievements]').forEach((b) => b.addEventListener('click', openSheet));

  function unlock(id) {
    if (found.has(id)) return;
    const s = SECRETS.find((x) => x.id === id);
    found.add(id); save(); render();
    toast(`Achievement unlocked: ${s.name}`, s.done);
    if (found.size === SECRETS.length) setTimeout(() => toast('Completionist', 'You found every secret. You should probably email me.'), 4600);
    debugLog(`achievement: ${s.name}`);
  }
  render();

  // Paperwork: opening the CV
  $$('[data-cv]').forEach((a) => a.addEventListener('click', () => unlock('paperwork')));

  // Any%: reach the footer within 15 seconds
  const goal = $('[data-speedrun-goal]');
  const born = performance.now();
  if (goal && 'IntersectionObserver' in window) {
    const sr = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      if (performance.now() - born < 15000 && scrollY > innerHeight) unlock('speedrun');
      sr.disconnect();
    });
    sr.observe(goal);
  }

  // Money printer: print what the servers made
  const printer = $('[data-secret="printer"]');
  if (printer) {
    let cash = 0;
    printer.addEventListener('click', () => {
      if (cash >= 13000) return;
      cash += 1000;
      const note = document.createElement('span');
      note.className = 'printer__cash';
      note.textContent = cash >= 13000 ? '£13,000' : '+£1,000';
      printer.append(note);
      setTimeout(() => note.remove(), 950);
      printer.setAttribute('aria-label', `Money printer, £${cash.toLocaleString('en-GB')} printed`);
      if (cash >= 13000) unlock('printer');
    });
  }

  // Cheat code: the Konami code, or five quick taps on my first name
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let seq = [], typed = '';
  addEventListener('keydown', (e) => {
    if (typing(e.target) || gameOpen()) return;
    const k = e.key.toLowerCase();
    seq = [...seq, k].slice(-KONAMI.length);
    if (seq.join() === KONAMI.join()) { seq = []; setDebug(!document.documentElement.classList.contains('debug')); unlock('cheat'); }
    if (/^[a-z]$/.test(k)) {
      typed = (typed + k).slice(-12);
      if (typed.endsWith('gerbert')) { typed = ''; openGame(); }
    }
  });
  const nameWord = $('[data-secret="name"]');
  if (nameWord) {
    let taps = [];
    nameWord.addEventListener('click', () => {
      const now = Date.now();
      taps = [...taps.filter((t) => now - t < 2500), now];
      if (taps.length >= 5) { taps = []; setDebug(!document.documentElement.classList.contains('debug')); unlock('cheat'); }
    });
  }

  // Under the hood: a small API for people who open DevTools
  const say = (...lines) => { lines.forEach((l) => console.log(l)); return '…'; };
  window.jack = {
    help() { unlock('console'); return say('jack.play()      play a round of Colour Tiles', 'jack.debug()     switch the debug build on or off', 'jack.secrets()   list what you have found', 'jack.stats()     a few real numbers', 'jack.hire()      the important one'); },
    play() { unlock('console'); openGame(); return 'Good luck.'; },
    debug() { unlock('console'); setDebug(!document.documentElement.classList.contains('debug')); return 'Toggled.'; },
    secrets() { unlock('console'); return SECRETS.map((s) => `${found.has(s.id) ? '[x]' : '[ ]'} ${found.has(s.id) ? s.name : s.hint}`).join('\n'); },
    stats() { unlock('console'); return say('Garry’s Mod servers: team of 50, 100+ concurrent players, £13,000 revenue', 'Biggest uni team: 29 people, as tech lead', 'MSc Computer Games Design: Distinction'); },
    hire() { unlock('console'); return 'jackslaski04@gmail.com. I reply quickly.'; },
  };
  console.log('%cJack Slaski', 'font: 500 28px "Hanken Grotesk", sans-serif; color:#062b8a; background:#e6dbc7; padding:6px 10px');
  console.log('You opened the console, so you know your way around. Type jack.help() to see what I left in here.');

  /* ---------- debug build ---------- */
  let panel = null, fpsRaf = 0;
  function debugLog(line) {
    const log = panel && $('.debug-panel__log', panel);
    if (!log) return;
    log.textContent += `${line}\n`;
    log.scrollTop = log.scrollHeight;
  }
  function setDebug(on) {
    document.documentElement.classList.toggle('debug', on);
    if (!on) { cancelAnimationFrame(fpsRaf); panel?.remove(); panel = null; return; }
    panel = document.createElement('aside');
    panel.className = 'debug-panel';
    panel.setAttribute('aria-label', 'Debug console');
    panel.innerHTML = `
      <div class="debug-panel__head"><span>DEBUG BUILD</span><button type="button" data-cmd="exit" aria-label="Close debug build">exit</button></div>
      <div class="debug-panel__stats"><span>fps</span><span data-fps>–</span><span>scroll</span><span data-scroll>0%</span><span>viewport</span><span data-vp></span><span>secrets</span><span data-sec></span></div>
      <div class="debug-panel__log" role="log">Debug build loaded. Type help.\n</div>
      <form><label class="sr-only" for="dbg-in">Command</label><input id="dbg-in" autocomplete="off" spellcheck="false" placeholder="help" /><button type="submit">run</button></form>
      <div class="debug-panel__quick"><button type="button" data-cmd="help">help</button><button type="button" data-cmd="play gerbert">play gerbert</button><button type="button" data-cmd="stats">stats</button><button type="button" data-cmd="secrets">secrets</button></div>`;
    document.body.append(panel);
    const input = $('input', panel);
    $('form', panel).addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    panel.addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) run(b.dataset.cmd); });
    let frames = 0, last = performance.now();
    const tick = (now) => {
      frames++;
      if (now - last > 500) {
        $('[data-fps]', panel).textContent = Math.round((frames * 1000) / (now - last));
        frames = 0; last = now;
        const max = document.documentElement.scrollHeight - innerHeight;
        $('[data-scroll]', panel).textContent = `${Math.round((scrollY / Math.max(1, max)) * 100)}%`;
        $('[data-vp]', panel).textContent = `${innerWidth} × ${innerHeight}`;
        $('[data-sec]', panel).textContent = `${found.size} / ${SECRETS.length}`;
      }
      if (panel) fpsRaf = requestAnimationFrame(tick);
    };
    fpsRaf = requestAnimationFrame(tick);
  }
  function run(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    debugLog(`> ${cmd}`);
    unlock('console');
    const out = {
      help: 'help, play gerbert, stats, secrets, hire, clear, exit',
      stats: 'Garry’s Mod: team of 50, £13,000 revenue\nLargest uni team: 29, as tech lead\nMSc: Distinction. BSc: First Class',
      hire: 'jackslaski04@gmail.com',
      god: 'No god mode. Try being good at the game.',
      noclip: 'You can already scroll through walls of text.',
    }[cmd];
    if (out) return debugLog(out);
    if (cmd === 'clear') { $('.debug-panel__log', panel).textContent = ''; return; }
    if (cmd === 'exit') return setDebug(false);
    if (cmd === 'secrets') return openSheet();
    if (cmd === 'play gerbert' || cmd === 'gerbert' || cmd === 'play') return openGame();
    debugLog(`Unknown command: ${cmd}. Type help.`);
  }

  /* ---------- Colour Tiles, a tiny Gerbert Games round ---------- */
  let game = null;
  const gameOpen = () => game?.dialog.open;
  function openGame() {
    if (!game) game = buildGame();
    game.reset();
    game.dialog.showModal();
  }
  function buildGame() {
    const N = 11, ROUND = 20, YOU = 1, BOT = 2;
    const COL = { 0: '#1a2142', [YOU]: '#ff5fae', [BOT]: '#3fd8e6' };
    const d = document.createElement('dialog');
    d.className = 'game';
    d.setAttribute('aria-labelledby', 'game-title');
    d.innerHTML = `
      <h2 id="game-title">Colour Tiles</h2>
      <p class="small" style="margin-top:.35rem">A round from Gerbert Games. Claim more tiles than the bot in ${ROUND} seconds. Arrow keys or WASD, or drag on the board.</p>
      <div class="game__score"><span class="game__you">You <b data-you>0</b></span><span data-time>${ROUND}.0</span><span class="game__bot">Bot <b data-bot>0</b></span></div>
      <canvas width="440" height="440" aria-label="Colour Tiles board"></canvas>
      <p class="game__msg" role="status"></p>
      <div class="game__actions"><button type="button" data-start>Start</button><button type="button" data-quit>Close</button></div>`;
    document.body.append(d);
    const cv = $('canvas', d), cx = cv.getContext('2d'), msg = $('.game__msg', d);
    const dpr = Math.min(devicePixelRatio || 1, 2), S = 440, cell = S / N;
    cv.width = S * dpr; cv.height = S * dpr; cx.scale(dpr, dpr);
    let grid, you, bot, dir, target, running, endAt, timer, botTimer, raf, endTimer;

    function reset() {
      grid = Array.from({ length: N * N }, () => 0);
      you = { x: 1, y: Math.floor(N / 2) }; bot = { x: N - 2, y: Math.floor(N / 2) };
      grid[you.y * N + you.x] = YOU; grid[bot.y * N + bot.x] = BOT;
      dir = null; target = null; running = false;
      msg.textContent = 'Press Start when you’re ready.';
      $('[data-start]', d).textContent = 'Start';
      $('[data-time]', d).textContent = `${ROUND}.0`;
      paint();
    }
    const count = (who) => grid.filter((g) => g === who).length;
    function step(p, dx, dy, who) {
      const x = Math.max(0, Math.min(N - 1, p.x + dx)), y = Math.max(0, Math.min(N - 1, p.y + dy));
      p.x = x; p.y = y; grid[y * N + x] = who;
    }
    function moveYou() {
      if (!running) return;
      if (dir) step(you, dir[0], dir[1], YOU);
      else if (target) {
        const dx = Math.sign(target.x - you.x), dy = Math.sign(target.y - you.y);
        if (dx || dy) Math.abs(target.x - you.x) >= Math.abs(target.y - you.y) ? step(you, dx, 0, YOU) : step(you, 0, dy, YOU);
      }
    }
    function moveBot() {
      if (!running) return;
      if (Math.random() < 0.18) {                       // a bit clumsy, so it can be beaten
        const r = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
        return step(bot, r[0], r[1], BOT);
      }
      const seen = new Set([bot.y * N + bot.x]), q = [[bot.x, bot.y, null]];
      while (q.length) {                                // nearest tile that isn't the bot's
        const [x, y, first] = q.shift();
        if (grid[y * N + x] !== BOT) return first ? step(bot, first[0], first[1], BOT) : step(bot, 0, 0, BOT);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = ny * N + nx;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N || seen.has(k)) continue;
          seen.add(k); q.push([nx, ny, first || [dx, dy]]);
        }
      }
    }
    function paint() {
      cx.clearRect(0, 0, S, S);
      for (let i = 0; i < N * N; i++) {
        cx.fillStyle = COL[grid[i]];
        cx.fillRect((i % N) * cell + 2, Math.floor(i / N) * cell + 2, cell - 4, cell - 4);
      }
      for (const [p, c] of [[you, '#ffe3f1'], [bot, '#dafbff']]) {
        cx.fillStyle = c;
        cx.beginPath(); cx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.3, 0, 7); cx.fill();
      }
      $('[data-you]', d).textContent = count(YOU);
      $('[data-bot]', d).textContent = count(BOT);
    }
    function loop() {
      if (!running) return;
      const left = Math.max(0, endAt - performance.now());
      $('[data-time]', d).textContent = (left / 1000).toFixed(1);
      paint();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      reset();
      running = true; endAt = performance.now() + ROUND * 1000;
      msg.textContent = 'Go!';
      timer = setInterval(() => { moveYou(); paint(); }, 120);
      botTimer = setInterval(() => { moveBot(); paint(); }, 155);
      raf = requestAnimationFrame(loop);
      endTimer = setTimeout(finish, ROUND * 1000);
      $('[data-start]', d).textContent = 'Restart';
    }
    function stop() { running = false; clearInterval(timer); clearInterval(botTimer); clearTimeout(endTimer); cancelAnimationFrame(raf); }
    function finish() {
      if (!running) return;
      stop(); paint();
      $('[data-time]', d).textContent = '0.0';
      const a = count(YOU), b = count(BOT);
      if (a > b) { msg.textContent = `You win, ${a} to ${b}.`; unlock('tiles'); }
      else if (a < b) msg.textContent = `The bot wins, ${b} to ${a}. One more go?`;
      else msg.textContent = `A draw, ${a} each. Rematch?`;
      $('[data-start]', d).textContent = 'Play again';
    }

    const KEYS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
    d.addEventListener('keydown', (e) => {
      const v = KEYS[e.key.toLowerCase()];
      if (v) { e.preventDefault(); dir = v; target = null; }
    });
    d.addEventListener('keyup', (e) => { if (KEYS[e.key.toLowerCase()]) dir = null; });
    const toCell = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: Math.floor(((e.clientX - r.left) / r.width) * N), y: Math.floor(((e.clientY - r.top) / r.height) * N) };
    };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); target = toCell(e); dir = null; });
    cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') target = toCell(e); });
    cv.addEventListener('pointerup', () => { target = null; });
    $('[data-start]', d).addEventListener('click', start);
    $('[data-quit]', d).addEventListener('click', () => d.close());
    d.addEventListener('close', stop);
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    return { dialog: d, reset };
  }
})();
