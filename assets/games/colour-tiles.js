// Colour Tiles: a 20-second round of the Gerbert Games mode, against a bot.
// Run over tiles to claim them. Most tiles when time runs out wins.
(() => {
  const root = document.querySelector('[data-game="colour-tiles"]');
  if (!root) return;

  const ROUND = 20, HURRY = 5, YOU = 1, BOT = 2;
  const STEP_YOU = 105, STEP_BOT = 165, DASH = 3, DASH_COOLDOWN = 2500;
  const COL = { 0: '#1a2130', [YOU]: '#ff5a36', [BOT]: '#3fd8e6' };
  const DIRS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };

  root.innerHTML = `
    <div class="score">
      <div class="score__side score__side--you">
        <div class="score__id"><span class="score__name">You</span><span class="score__tag">Leading</span></div>
        <b class="score__num" data-you>0</b>
      </div>
      <div class="score__clock"><b data-time>${ROUND}.0</b><span>Time left</span></div>
      <div class="score__side score__side--bot">
        <div class="score__id"><span class="score__name">Bot</span><span class="score__tag">Leading</span></div>
        <b class="score__num" data-bot>0</b>
      </div>
    </div>
    <div class="score__bar" aria-hidden="true"><span data-share-you></span><span data-share-bot></span></div>
    <div class="arcade__screen">
      <canvas tabindex="0" aria-label="Colour Tiles board. Move with WASD or the arrow keys, dash with Space."></canvas>
      <div class="arcade__overlay" data-overlay>
        <p class="arcade__big" data-headline>Colour Tiles</p>
        <p class="arcade__msg" data-msg aria-live="polite">Claim more tiles than the bot in ${ROUND} seconds.</p>
        <button class="btn" type="button" data-start>Start</button>
      </div>
    </div>
    <div class="arcade__help">
      <span><kbd>WASD</kbd> or arrows to move, or drag on the board</span>
      <button class="arcade__dash" type="button" data-dash><span>Dash</span><kbd>Space</kbd></button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const cv = $('canvas'), cx = cv.getContext('2d'), screen = $('.arcade__screen');
  const overlay = $('[data-overlay]'), headline = $('[data-headline]'), msg = $('[data-msg]'), startBtn = $('[data-start]'), dashBtn = $('[data-dash]');

  let COLS = 25, ROWS = 11;
  let grid, claimedAt, you, bot, dir, facing, target, state = 'idle', endAt = 0, lastYou = 0, lastBot = 0, lastDash = -1e9, raf = 0, w = 0, h = 0;

  // a wide board on desktop, a taller one on phones so the tiles stay big enough to tap
  function shape() {
    const wide = root.clientWidth >= 640;
    COLS = wide ? 25 : 11; ROWS = wide ? 11 : 13;
    screen.style.setProperty('--ar', COLS / ROWS);
  }

  function fit() {
    if (state === 'idle') reset();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  function reset() {
    shape();
    grid = new Uint8Array(COLS * ROWS);
    claimedAt = new Float64Array(COLS * ROWS);
    const mid = Math.floor(ROWS / 2);
    you = { x: 1, y: mid }; bot = { x: COLS - 2, y: mid };
    claim(you, YOU, 0); claim(bot, BOT, 0);
    dir = null; facing = [1, 0]; target = null; lastDash = -1e9;
  }

  function claim(p, who, now) {
    const k = p.y * COLS + p.x;
    if (grid[k] !== who) { grid[k] = who; claimedAt[k] = now; }
  }
  const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  function step(p, dx, dy, who, now) {
    if (!inside(p.x + dx, p.y + dy)) return false;
    p.x += dx; p.y += dy; claim(p, who, now);
    return true;
  }

  // the bot: walk to the nearest tile it doesn't own, a bit clumsily so it can be beaten
  function botMove(now) {
    if (Math.random() < 0.25) {   // tuned by simulation: a decent player wins ~95%, a sloppy one ~70%
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      return step(bot, dx, dy, BOT, now);
    }
    if (grid[bot.y * COLS + bot.x] !== BOT) return claim(bot, BOT, now);
    const seen = new Uint8Array(COLS * ROWS), q = [[bot.x, bot.y, null]];
    seen[bot.y * COLS + bot.x] = 1;
    while (q.length) {
      const [x, y, first] = q.shift();
      if (first && grid[y * COLS + x] !== BOT) return step(bot, first[0], first[1], BOT, now);
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + d[0], ny = y + d[1];
        if (!inside(nx, ny) || seen[ny * COLS + nx]) continue;
        seen[ny * COLS + nx] = 1; q.push([nx, ny, first || d]);
      }
    }
  }

  function youMove(now) {
    let d = dir;
    if (!d && target) {
      const dx = Math.sign(target.x - you.x), dy = Math.sign(target.y - you.y);
      if (!dx && !dy) return;
      d = Math.abs(target.x - you.x) >= Math.abs(target.y - you.y) ? [dx, 0] : [0, dy];
    }
    if (!d) return;
    facing = d;
    step(you, d[0], d[1], YOU, now);
  }

  function dash() {
    const now = performance.now();
    if (state !== 'play' || now - lastDash < DASH_COOLDOWN) return;
    lastDash = now;
    for (let i = 0; i < DASH; i++) if (!step(you, facing[0], facing[1], YOU, now)) break;
    root.classList.remove('is-shake'); void root.offsetWidth; root.classList.add('is-shake');
  }

  const count = (who) => grid.reduce((n, g) => n + (g === who), 0);

  function hud(now) {
    const a = count(YOU), b = count(BOT), total = COLS * ROWS;
    $('[data-you]').textContent = a;
    $('[data-bot]').textContent = b;
    const left = state === 'play' ? Math.max(0, endAt - now) / 1000 : state === 'over' ? 0 : ROUND;
    $('[data-time]').textContent = left.toFixed(1);
    root.classList.toggle('is-hurry', state === 'play' && left <= HURRY);
    root.dataset.lead = a > b ? 'you' : b > a ? 'bot' : '';
    $('[data-share-you]').style.width = `${(a / total) * 100}%`;
    $('[data-share-bot]').style.width = `${(b / total) * 100}%`;
    const cd = Math.min(1, (now - lastDash) / DASH_COOLDOWN);
    dashBtn.style.setProperty('--cd', cd);
    dashBtn.disabled = state !== 'play' || cd < 1;
  }

  function draw(now) {
    if (!grid || !w) return;
    const cell = w / COLS, gap = Math.max(2, cell * 0.08);
    cx.clearRect(0, 0, w, h);
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = (i % COLS) * cell, y = Math.floor(i / COLS) * cell;
      const pop = grid[i] ? Math.min(1, (now - claimedAt[i]) / 180) : 1;
      const s = (cell - gap) * (0.7 + 0.3 * pop), o = (cell - s) / 2;
      cx.fillStyle = COL[grid[i]];
      cx.fillRect(x + o, y + o, s, s);
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.fillRect(x + o, y + o, s, Math.max(2, s * 0.12));
    }
    for (const [p, ring] of [[bot, '#0f6f7a'], [you, '#a3260f']]) {
      const px = p.x * cell + cell / 2, py = p.y * cell + cell / 2, r = cell * 0.32;
      cx.beginPath(); cx.arc(px, py, r + 3, 0, 7); cx.fillStyle = '#fff'; cx.fill();
      cx.beginPath(); cx.arc(px, py, r, 0, 7); cx.fillStyle = ring; cx.fill();
      cx.beginPath(); cx.arc(px - r * 0.25, py - r * 0.2, r * 0.22, 0, 7); cx.arc(px + r * 0.25, py - r * 0.2, r * 0.22, 0, 7); cx.fillStyle = '#fff'; cx.fill();
    }
  }

  function loop(now) {
    if (state === 'play') {
      if (now - lastYou >= STEP_YOU) { lastYou = now; youMove(now); }
      if (now - lastBot >= STEP_BOT) { lastBot = now; botMove(now); }
      if (now >= endAt) finish();
    }
    hud(now); draw(now);
    if (state === 'play' || state === 'countdown') raf = requestAnimationFrame(loop);
  }

  function start() {
    reset();
    state = 'countdown';
    fit();
    startBtn.hidden = true;
    msg.textContent = '';
    cv.focus({ preventScroll: true });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    let n = 3;
    const tick = () => {
      if (n > 0) { headline.textContent = n--; setTimeout(tick, 600); return; }
      headline.textContent = 'Go!';
      state = 'play';
      const now = performance.now();
      endAt = now + ROUND * 1000; lastYou = lastBot = now;
      setTimeout(() => { if (state === 'play') overlay.hidden = true; }, 400);
    };
    tick();
  }

  function finish() {
    state = 'over';
    dir = null; target = null;
    const a = count(YOU), b = count(BOT);
    overlay.hidden = false;
    startBtn.hidden = false; startBtn.textContent = 'Play again';
    if (a > b) {
      headline.textContent = 'You win';
      msg.textContent = `${a} tiles to ${b}. The Gerberts would be proud.`;
      window.secrets?.unlock('tiles');
    } else if (a < b) {
      headline.textContent = 'Bot wins';
      msg.textContent = `${b} tiles to ${a}. Try dashing into its territory.`;
    } else {
      headline.textContent = 'Draw';
      msg.textContent = `${a} tiles each. Rematch?`;
    }
    hud(performance.now());
  }

  // input: keys only while a round is running, so the page still scrolls normally
  addEventListener('keydown', (e) => {
    if (state !== 'play') return;
    const k = e.key.toLowerCase();
    if (DIRS[k]) { e.preventDefault(); dir = DIRS[k]; target = null; }
    else if (k === ' ') { e.preventDefault(); dash(); }
  });
  addEventListener('keyup', (e) => { const d = DIRS[e.key.toLowerCase()]; if (d && dir === d) dir = null; });
  const toCell = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: Math.max(0, Math.min(COLS - 1, Math.floor(((e.clientX - r.left) / r.width) * COLS))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(((e.clientY - r.top) / r.height) * ROWS))) };
  };
  cv.addEventListener('pointerdown', (e) => { if (state !== 'play') return; cv.setPointerCapture(e.pointerId); target = toCell(e); dir = null; });
  cv.addEventListener('pointermove', (e) => { if (state === 'play' && cv.hasPointerCapture(e.pointerId)) target = toCell(e); });
  cv.addEventListener('pointerup', () => { target = null; });
  startBtn.addEventListener('click', start);
  dashBtn.addEventListener('click', dash);
  addEventListener('resize', fit);

  fit();
  hud(performance.now());
})();
