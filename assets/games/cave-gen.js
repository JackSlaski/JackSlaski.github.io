// Cave generator: my UE5 cellular automata cave tool, rebuilt for the web.
// Same rules and settings as the Details panel in the real tool, and seeds repeat,
// so a seed always gives the same cave. Some caves hide a crystal.
(() => {
  const root = document.querySelector('[data-game="cave-gen"]');
  if (!root) return;

  const ROCK = 1, FLOOR = 0, CRYSTAL_CHANCE = 1 / 10;
  const COL = { floor: '#06080d', room: '#0b1528', rock: '#222a38', wall: '#3d4a63', loot: '#e4ae39' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the settings from the tool's Details panel (the Unreal-only ones, like meshes and materials, are left out)
  const FIELDS = [
    { cat: 'Generation', key: 'seed', label: 'Grid Seed', type: 'number', min: 0, max: 999999, value: 20261 },
    { cat: 'Generation', key: 'lock', label: 'Seed Lock', type: 'check', value: false },
    { cat: 'Generation', key: 'fill', label: 'Fill Probability', type: 'range', min: 30, max: 60, value: 46, unit: '%' },
    { cat: 'Generation', key: 'iter', label: 'Number of Iterations', type: 'range', min: 0, max: 10, value: 5 },
    { cat: 'Corridors', key: 'corridors', label: 'Number of Corridors', type: 'range', min: 0, max: 12, value: 3 },
    { cat: 'Rooms', key: 'rooms', label: 'Allow Room Spawning', type: 'check', value: true },
    { cat: 'Rooms', key: 'roomCount', label: 'Number of Rooms', type: 'range', min: 1, max: 8, value: 3 },
    { cat: 'Rooms', key: 'loot', label: 'Allow Room Loot', type: 'check', value: true },
    { adv: true, key: 'emptyT', label: 'Empty Neighbour Threshold', type: 'range', min: 1, max: 8, value: 4 },
    { adv: true, key: 'fillT', label: 'Fill Neighbour Threshold', type: 'range', min: 1, max: 8, value: 5 },
    { adv: true, key: 'cMin', label: 'Corridor Length Min', type: 'range', min: 3, max: 20, value: 6 },
    { adv: true, key: 'cMax', label: 'Corridor Length Max', type: 'range', min: 4, max: 40, value: 18 },
    { adv: true, key: 'thick', label: 'Corridor Thickness', type: 'range', min: 1, max: 3, value: 1 },
    { adv: true, key: 'straight', label: 'Allow Straight Corridors', type: 'check', value: true },
    { adv: true, key: 'diag', label: 'Allow Diagonal Corridors', type: 'check', value: true },
    { adv: true, key: 'rMin', label: 'Room Size Minimum', type: 'range', min: 3, max: 10, value: 4 },
    { adv: true, key: 'rMax', label: 'Room Size Maximum', type: 'range', min: 4, max: 14, value: 8 },
  ];
  const PRESETS = {
    'Open caverns': { fill: 42, iter: 6, corridors: 2, rooms: false, emptyT: 4, fillT: 5 },
    'Tight tunnels': { fill: 52, iter: 3, corridors: 10, rooms: false, emptyT: 3, fillT: 5, thick: 1, straight: false, diag: true },
    'Dungeon rooms': { fill: 55, iter: 6, corridors: 7, rooms: true, roomCount: 6, loot: true, straight: true, diag: false, thick: 2, rMin: 5, rMax: 9 },
  };

  const control = (f) => f.type === 'check'
    ? `<input type="checkbox" data-key="${f.key}"${f.value ? ' checked' : ''}>`
    : f.type === 'number'
      ? `<input type="number" inputmode="numeric" data-key="${f.key}" min="${f.min}" max="${f.max}" value="${f.value}">`
      : `<input type="range" data-key="${f.key}" min="${f.min}" max="${f.max}" value="${f.value}"><output data-out="${f.key}"></output>`;
  const row = (f) => `<label class="ue__row"><span>${f.label}</span><span class="ue__ctl">${control(f)}</span></label>`;
  const cats = [...new Set(FIELDS.filter((f) => !f.adv).map((f) => f.cat))];

  root.innerHTML = `
    <div class="cave">
      <div class="cave__view">
        <div class="cave__presets"><span class="cave__label">Presets</span>${Object.keys(PRESETS).map((p) => `<button class="cave__chip" type="button" data-preset="${p}">${p}</button>`).join('')}</div>
        <div class="cave__screen" data-screen>
          <canvas aria-label="A generated cave map. Rock is grey, open floor is dark, and gold squares are loot."></canvas>
          <p class="cave__pass" data-pass></p>
        </div>
        <div class="cave__bar">
          <p class="cave__info" data-info aria-live="polite"></p>
          <div class="cave__tools">
            <span class="cave__label">Paint</span>
            <div class="cave__seg"><button type="button" data-tool="rock" aria-pressed="true">Rock</button><button type="button" data-tool="floor" aria-pressed="false">Floor</button></div>
            <button class="cave__chip" type="button" data-smooth>Smooth</button>
            <button class="cave__chip" type="button" data-copy>Copy seed</button>
          </div>
        </div>
      </div>
      <aside class="ue" aria-label="Cave settings">
        <p class="ue__tab">Details</p>
        <div class="ue__body">
          ${cats.map((c) => `<p class="ue__cat">${c}</p>${FIELDS.filter((f) => f.cat === c).map(row).join('')}`).join('')}
          <details class="ue__adv"><summary>Advanced</summary>${FIELDS.filter((f) => f.adv).map(row).join('')}</details>
        </div>
        <div class="ue__actions"><button class="btn" type="button" data-generate>Generate</button><p class="ue__count">Caves generated: <b data-made>0</b></p></div>
      </aside>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const cv = $('canvas'), cx = cv.getContext('2d'), screen = $('[data-screen]'), passEl = $('[data-pass]'), info = $('[data-info]');
  let W, H, grid, roomMask, loot = [], rooms = 0, seed = 0, run = 0, tool = 'rock', made = 0;

  // mulberry32: a tiny seeded random number generator, so a seed always rebuilds the same cave
  function rng(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  function settings() {
    const s = {};
    root.querySelectorAll('[data-key]').forEach((el) => { s[el.dataset.key] = el.type === 'checkbox' ? el.checked : Number(el.value); });
    return s;
  }
  function showValues() {
    for (const f of FIELDS) if (f.type === 'range') $(`[data-out="${f.key}"]`).textContent = $(`[data-key="${f.key}"]`).value + (f.unit || '');
  }

  // one cellular automata pass: rock with too few rock neighbours opens up, floor with enough fills in
  function pass(g, emptyT, fillT) {
    const n = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        c += xx < 0 || yy < 0 || xx >= W || yy >= H ? 1 : g[yy * W + xx];   // the edge counts as rock
      }
      const i = y * W + x;
      n[i] = g[i] ? (c < emptyT ? FLOOR : ROCK) : (c >= fillT ? ROCK : FLOOR);
    }
    return n;
  }

  const carve = (g, x, y, t) => {
    const lo = -Math.floor((t - 1) / 2), hi = lo + t - 1;
    for (let dy = lo; dy <= hi; dy++) for (let dx = lo; dx <= hi; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx > 0 && yy > 0 && xx < W - 1 && yy < H - 1) g[yy * W + xx] = FLOOR;
    }
  };

  // builds the cave as a list of frames, so it can be played back one pass at a time
  function build(s) {
    const wide = root.clientWidth >= 640;
    W = wide ? 72 : 44; H = wide ? 42 : 44;
    const r = rng(seed), frames = [];
    let g = new Uint8Array(W * H);
    for (let i = 0; i < g.length; i++) g[i] = r() < s.fill / 100 ? ROCK : FLOOR;
    frames.push(['Random fill', g.slice()]);
    for (let i = 0; i < s.iter; i++) { g = pass(g, s.emptyT, s.fillT); frames.push([`Pass ${i + 1} of ${s.iter}`, g.slice()]); }
    const dirs = [...(s.straight ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : []), ...(s.diag ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [])];
    if (dirs.length && s.corridors) {
      const lo = Math.min(s.cMin, s.cMax), hi = Math.max(s.cMin, s.cMax);
      for (let c = 0; c < s.corridors; c++) {
        let x = int(r, 2, W - 3), y = int(r, 2, H - 3);
        const [dx, dy] = dirs[Math.floor(r() * dirs.length)], len = int(r, lo, hi), t = s.thick + (dx && dy ? 1 : 0);   // diagonals get one extra, like the tool
        for (let k = 0; k < len; k++) { carve(g, x, y, t); x += dx; y += dy; }
      }
      frames.push(['Corridors', g.slice()]);
    }
    const mask = new Uint8Array(W * H), chests = [];
    if (s.rooms) {
      const lo = Math.min(s.rMin, s.rMax), hi = Math.max(s.rMin, s.rMax);
      for (let k = 0; k < s.roomCount; k++) {
        const w = int(r, lo, hi), h = int(r, lo, hi), x0 = int(r, 1, Math.max(1, W - w - 1)), y0 = int(r, 1, Math.max(1, H - h - 1));
        for (let y = y0; y < Math.min(H - 1, y0 + h); y++) for (let x = x0; x < Math.min(W - 1, x0 + w); x++) { g[y * W + x] = FLOOR; mask[y * W + x] = 1; }
        if (s.loot) chests.push([x0 + Math.floor(w / 2), y0 + Math.floor(h / 2)]);
      }
      frames.push(['Rooms', g.slice()]);
    }
    // the crystal: its own random stream, so whether a seed has one doesn't depend on the settings
    const cr = rng(seed ^ 0x5eed), walls = [];
    let gem = null;
    if (!window.secrets?.has('crystal') && cr() < CRYSTAL_CHANCE) {   // once you've found one, they stop appearing
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (g[i] && (!g[i - 1] || !g[i + 1] || !g[i - W] || !g[i + W])) walls.push([x, y]);
      }
      if (walls.length) gem = walls[Math.floor(cr() * walls.length)];
    }
    return { frames, mask, chests, gem, count: s.rooms ? s.roomCount : 0 };
  }

  function fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    screen.style.setProperty('--ar', W / H);
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientWidth * (H / W) * dpr);
    draw();
  }

  function draw() {
    if (!grid) return;
    const cs = cv.width / W;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (grid[i]) {
        const edge = (x > 0 && !grid[i - 1]) || (x < W - 1 && !grid[i + 1]) || (y > 0 && !grid[i - W]) || (y < H - 1 && !grid[i + W]);
        cx.fillStyle = edge ? COL.wall : COL.rock;
      } else cx.fillStyle = roomMask[i] ? COL.room : COL.floor;
      cx.fillRect(Math.floor(x * cs), Math.floor(y * cs), Math.ceil(cs), Math.ceil(cs));
    }
    cx.fillStyle = COL.loot;
    cx.shadowColor = COL.loot; cx.shadowBlur = cs;
    for (const [x, y] of loot) if (!grid[y * W + x]) cx.fillRect((x + 0.2) * cs, (y + 0.2) * cs, cs * 0.6, cs * 0.6);
    cx.shadowBlur = 0;
  }

  function stats() {
    const rock = grid.reduce((n, v) => n + v, 0);
    const shown = loot.filter(([x, y]) => !grid[y * W + x]).length;
    info.textContent = `Seed ${seed} · ${Math.round((rock / grid.length) * 100)}% rock · ${rooms} room${rooms === 1 ? '' : 's'} · ${shown} loot`;
  }

  function placeCrystal(gem) {
    screen.querySelector('.cave__crystal')?.remove();
    if (!gem) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cave__crystal';
    b.setAttribute('aria-label', 'Something shiny in the rock');
    b.style.left = `${((gem[0] - 0.5) / W) * 100}%`;
    b.style.top = `${((gem[1] - 0.5) / H) * 100}%`;
    b.style.width = `${(2 / W) * 100}%`;
    b.addEventListener('click', () => {
      b.classList.add('is-found');
      info.textContent = 'You struck gold. Well, crystal.';
      window.secrets?.unlock('crystal');
      setTimeout(() => b.remove(), 700);
    });
    screen.append(b);
  }

  // generate: rebuilds from the settings, then plays the passes back unless it's a quick tweak.
  // With Seed Lock off, the Generate button rolls a new seed (tweaks keep the current one); 0 always rolls.
  function generate(animate = true, reroll = false) {
    const s = settings();
    seed = (reroll && !s.lock) || !s.seed ? 1 + Math.floor(Math.random() * 999999) : s.seed;
    $('[data-key="seed"]').value = seed;
    const { frames, mask, chests, gem, count } = build(s), id = ++run;
    grid = frames[0][1];
    roomMask = new Uint8Array(W * H);
    loot = [];
    rooms = count;
    placeCrystal(null);
    fit();
    if (animate) $('[data-made]').textContent = ++made;   // full generations count, quick setting tweaks don't
    const finish = () => {
      grid = frames[frames.length - 1][1]; roomMask = mask; loot = chests;
      passEl.textContent = '';
      draw(); stats(); placeCrystal(gem);
      devlog('LogPCG', `Generated a cave from seed ${seed}`);
    };
    if (!animate || reduced) return finish();
    let k = 0;
    const step = () => {
      if (id !== run) return;
      if (k >= frames.length) return finish();
      const [label, g] = frames[k++];
      grid = g;
      if (label === 'Rooms') roomMask = mask;
      passEl.textContent = label;
      draw();
      info.textContent = `Seed ${seed} · generating…`;
      setTimeout(step, k === 1 ? 450 : 260);
    };
    step();
  }

  // paint: drag to draw rock or floor, then Smooth runs one more pass over it
  function paint(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W), y = Math.floor(((e.clientY - r.top) / r.height) * H);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) grid[yy * W + xx] = tool === 'rock' ? ROCK : FLOOR;
    }
    draw();
  }
  cv.addEventListener('pointerdown', (e) => { if (!grid) return; run++; passEl.textContent = ''; cv.setPointerCapture(e.pointerId); paint(e); });
  cv.addEventListener('pointermove', (e) => { if (cv.hasPointerCapture(e.pointerId)) paint(e); });
  cv.addEventListener('pointerup', () => grid && stats());

  root.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
    tool = b.dataset.tool;
    root.querySelectorAll('[data-tool]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  }));
  $('[data-smooth]').addEventListener('click', () => {
    if (!grid) return;
    run++;
    const s = settings();
    grid = pass(grid, s.emptyT, s.fillT);
    draw(); stats();
  });
  $('[data-copy]').addEventListener('click', () => {
    navigator.clipboard?.writeText(String(seed)).then(() => { info.textContent = `Seed ${seed} copied.`; }, () => { info.textContent = `Seed ${seed}`; });
  });
  $('[data-generate]').addEventListener('click', () => generate(true, true));
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = PRESETS[b.dataset.preset];
    for (const f of FIELDS) {
      if (f.key === 'seed' || f.key === 'lock') continue;
      const el = $(`[data-key="${f.key}"]`), v = f.key in p ? p[f.key] : f.value;
      if (f.type === 'check') el.checked = v; else el.value = v;
    }
    root.querySelectorAll('[data-preset]').forEach((o) => o.classList.toggle('is-on', o === b));
    showValues();
    generate(true);
  }));
  // tweaking a setting redraws straight away, so you can see what each one does
  let wait = 0;
  root.querySelectorAll('[data-key]').forEach((el) => el.addEventListener('input', () => {
    showValues();
    root.querySelectorAll('[data-preset]').forEach((o) => o.classList.remove('is-on'));
    if (el.dataset.key === 'lock') return;
    clearTimeout(wait);
    wait = setTimeout(() => generate(false), 120);
  }));
  addEventListener('resize', () => grid && fit());

  // debug build cheats (see assets/debug.js). Using any of them switches achievements off until you reload.
  window.cheats = Object.assign(window.cheats || {}, {
    seed: { help: 'seed <n>: generate a cave from a seed', run: (n) => {
      const v = parseInt(n, 10);
      if (!(v > 0 && v <= 999999)) return 'Usage: seed <1 to 999999>';
      $('[data-key="seed"]').value = v; $('[data-key="lock"]').checked = true;
      generate(true);
      return `Generating seed ${v}.`;
    } },
    findcrystal: { help: 'findcrystal: point out the crystal, if this cave has one', run: () => {
      const c = screen.querySelector('.cave__crystal');
      if (!c) return 'No crystal in this cave. Try another seed.';
      c.classList.add('is-hint');
      screen.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return 'There it is.';
    } },
  });
  const devlog = (...d) => document.dispatchEvent(new CustomEvent('devlog', { detail: d }));

  showValues();
  generate(false);
  // the first time it scrolls into view, play the generation so you can watch it form
  new IntersectionObserver((entries, io) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); if (!made) generate(true); }   // unless you've already made one
  }, { threshold: 0.4 }).observe(screen);
})();
