// Loot box simulator: a case opener that plays like a real one, then shows how it played you.
// Every trick in it comes from the analysis sheet in my loot box research report. No real money, ever.
(() => {
  const root = document.querySelector('[data-game="loot-box"]');
  if (!root) return;

  const CASE = 275, TOPUP = 1100, TOPUP_PRICE = 9.99, START = 1000, MAX_CASES = 10;
  const LEN = 60, WIN = 52, NEAR = 0.55, OFFER = 90;   // reel length, winning slot, near-miss rate, offer seconds
  const money = (gems) => `£${((gems * TOPUP_PRICE) / TOPUP).toFixed(2)}`;
  const num = (n) => n.toLocaleString('en-GB');
  const RARITY = [   // the same odds as a Counter-Strike 2 case
    { id: 'common', name: 'Common', odds: 79.92, tease: 50, col: '#4b69ff' },
    { id: 'rare', name: 'Rare', odds: 15.98, tease: 26, col: '#8847ff' },
    { id: 'epic', name: 'Epic', odds: 3.2, tease: 14, col: '#d32ce6' },
    { id: 'legend', name: 'Legendary', odds: 0.64, tease: 7, col: '#eb4b4b' },
    { id: 'gold', name: 'Golden', odds: 0.26, tease: 3, col: '#e4ae39' },
  ];
  const GOLD = RARITY[4];
  const ITEMS = {
    common: [['Rusty Barrel', 'Recoil Works', 'part'], ['Spare Mag', 'Recoil Works', 'part'], ['Paper Crown', 'Gerbert Games', 'hat'], ['Wooden Stool', 'Feudal Living', 'furn'], ['Straw Bed', 'Feudal Living', 'furn']],
    rare: [['Suppressor', 'Recoil Works', 'part'], ['Party Hat', 'Gerbert Games', 'hat'], ['Oak Table', 'Feudal Living', 'furn']],
    epic: [['Gem Slot', 'Arms & Assets', 'gem'], ['Wizard Hat', 'Wild Magic', 'hat']],
    legend: [['Leviathan Fang', 'Leviathan’s Gauntlet', 'fang'], ['Explosive Rounds', 'Recoil Works', 'part']],
    gold: [['Golden Gerbert', 'Gerbert Games', 'gerb']],
  };
  const ICON = {
    part: '<circle cx="24" cy="24" r="11"/><path d="M24 5v11M24 32v11M5 24h11M32 24h11"/>',
    hat: '<path d="M16 31V11h16v20M8 35h32M16 25h16"/>',
    furn: '<path d="M15 6v36M15 26h19v16"/>',
    gem: '<path d="M11 18l6-8h14l6 8-13 21zM11 18h26M20 10l-3 8 7 21 7-21-3-8"/>',
    fang: '<path d="M13 9c5 3 17 3 22 0-2 13-6 23-11 30-5-7-9-17-11-30z"/>',
    gerb: '<circle cx="24" cy="24" r="16"/><circle cx="18" cy="21" r="2.5" fill="currentColor"/><circle cx="30" cy="21" r="2.5" fill="currentColor"/><path d="M18 30c4 3 8 3 12 0"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const GEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 9l3-5h8l3 5-7 11z"/></svg>';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.innerHTML = `
    <div class="loot">
      <div class="loot__machine" data-machine>
        <div class="loot__top">
          <div class="loot__wallet"><span class="loot__label">Wallet</span><b>${GEM}<span data-gems></span></b><span class="loot__label" data-gems-sub></span></div>
          <div class="loot__offer" data-offer><span>Limited time</span><b>Gerbert Case</b><time data-clock></time></div>
          <div class="loot__meta"><span data-count></span><button class="loot__sound" type="button" data-sound aria-pressed="false">Sound off</button></div>
        </div>
        <div class="loot__stage">
          <div class="reel"><div class="reel__strip" data-strip></div></div>
          <button class="reel__info" type="button" data-info aria-label="Drop rates" aria-expanded="false">i</button>
          <div class="loot__odds" data-odds hidden><span class="loot__label">Drop rates</span><ul>${RARITY.map((r) => `<li style="--rc:${r.col}"><span>${r.name}</span><b>${r.odds}%</b></li>`).join('')}</ul></div>
          <p class="loot__banner" data-banner aria-hidden="true"></p>
        </div>
        <p class="loot__status" data-status aria-live="polite"></p>
        <div class="loot__actions">
          <button class="btn" type="button" data-open></button>
          <button class="btn btn--ghost loot__topup" type="button" data-topup></button>
          <button class="loot__done" type="button" data-done>I’m done</button>
        </div>
        <div class="loot__haul" data-haul></div>
      </div>
      <div class="loot__report" data-report hidden></div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const strip = $('[data-strip]'), reel = $('.reel'), banner = $('[data-banner]'), status = $('[data-status]');
  const openBtn = $('[data-open]'), topBtn = $('[data-topup]'), doneBtn = $('[data-done]'), infoBtn = $('[data-info]'), odds = $('[data-odds]');

  let ethical, gems, topups, opened, near, goldSeen, goldWon, dupes, commons, resets, peeked, spinning, haul, clock;

  function roll() {
    let r = Math.random() * 100;
    for (const rar of RARITY) if ((r -= rar.odds) < 0) return rar;
    return RARITY[0];
  }
  // filler for the reel: in the shady version it shows rare items far more often than they drop
  function tease() {
    if (ethical) return roll();
    let r = Math.random() * 100;
    for (const rar of RARITY) if ((r -= rar.tease) < 0) return rar;
    return RARITY[0];
  }
  function pick(rar) {
    const list = ITEMS[rar.id], [name, from, icon] = list[Math.floor(Math.random() * list.length)];
    return { name, from, icon, rar };
  }
  const card = (c) => `<div class="reel__card" style="--rc:${c.rar.col}">${svg(c.icon)}<b>${c.name}</b><span>${c.from}</span></div>`;

  function fill(win, rig = true) {
    const cards = Array.from({ length: LEN }, (_, i) => (i === WIN ? win : pick(tease())));
    let side = 0;
    if (rig && !ethical && win.rar !== GOLD && Math.random() < NEAR) {   // rigged: park a gold item right next to the marker
      side = Math.random() < 0.5 ? 1 : -1;
      cards[WIN + side] = pick(GOLD);
    }
    strip.innerHTML = cards.map(card).join('');
    return { side, gold: cards.slice(0, WIN + 4).filter((c) => c.rar === GOLD).length };
  }

  // sound: off until the visitor turns it on
  let audio = null, sound = false;
  function beep(freq, dur, type = 'square', vol = 0.035, when = 0) {
    if (!sound || !audio) return;
    const t = audio.currentTime + when, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
  }
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', 0.05, i * 0.09));

  function hud() {
    $('[data-gems]').textContent = ethical ? money(gems) : num(gems);
    $('[data-gems-sub]').textContent = ethical ? `${num(gems)} gems` : 'gems';
    $('[data-count]').textContent = `${opened} / ${MAX_CASES} cases`;
    openBtn.textContent = `Open case · ${ethical ? money(CASE) : `${CASE} gems`}`;
    openBtn.disabled = spinning || gems < CASE || opened >= MAX_CASES;
    topBtn.innerHTML = ethical ? `Add ${money(TOPUP)}` : `Top up: ${num(TOPUP)} gems for £${TOPUP_PRICE} <em>Best value</em>`;
    topBtn.disabled = spinning || opened >= MAX_CASES;
    topBtn.classList.toggle('is-pulse', !ethical && gems < CASE && opened < MAX_CASES);
    doneBtn.hidden = opened === 0;
    doneBtn.disabled = spinning;
    $('[data-clock]').textContent = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
  }

  function spin() {
    if (spinning || gems < CASE) return;
    spinning = true;
    gems -= CASE;
    root.classList.remove('is-celebrate');
    status.textContent = 'Opening…';
    const win = pick(roll()), { side, gold } = fill(win);
    goldSeen += gold;
    hud();
    const cards = strip.children, cw = cards[0].offsetWidth, step = cards[1].offsetLeft - cards[0].offsetLeft, mid = reel.clientWidth / 2;
    const offset = side ? side * cw * (0.36 + Math.random() * 0.1) : (Math.random() - 0.5) * cw * 0.7;
    const from = mid - (4 * step + cw / 2), to = mid - (WIN * step + cw / 2 + offset);
    const dur = reduced ? 400 : 5200, t0 = performance.now();
    let last = -1;
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / dur), x = from + (to - from) * (1 - Math.pow(1 - t, 4));
      strip.style.transform = `translateX(${x}px)`;
      const idx = Math.floor((mid - x) / step);
      if (idx !== last) { last = idx; beep(1500, 0.025); }
      if (t < 1) requestAnimationFrame(frame);
      else land(win, side);
    };
    requestAnimationFrame(frame);
  }

  function land(win, side) {
    spinning = false;
    opened++;
    strip.children[WIN].classList.add('is-win');
    const dupe = haul.has(win.name);
    haul.set(win.name, { ...win, n: (haul.get(win.name)?.n || 0) + 1 });
    if (dupe) dupes++;
    if (win.rar.id === 'common') commons++;
    if (win.rar === GOLD) goldWon++;
    if (side) near++;
    const big = !ethical || win.rar.id === 'legend' || win.rar === GOLD;
    if (big) {
      banner.textContent = win.rar === GOLD ? 'Golden!' : dupe ? 'Duplicate!' : win.rar.id === 'common' ? 'Nice pull!' : `${win.rar.name}!`;
      root.style.setProperty('--rc', win.rar.col);
      void root.offsetWidth; root.classList.add('is-celebrate');
      fanfare();
    }
    status.textContent = side
      ? 'So close! The Golden Gerbert was right there. One more?'
      : `You got ${win.name} (${win.rar.name}) from ${win.from}.`;
    renderHaul();
    hud();
    if (opened >= MAX_CASES) setTimeout(report, reduced ? 300 : 1800);
  }

  function renderHaul() {
    const items = [...haul.values()].sort((a, b) => RARITY.indexOf(b.rar) - RARITY.indexOf(a.rar));
    $('[data-haul]').innerHTML = items.length
      ? `<span class="loot__label">Your haul</span>` + items.map((i) => `<span class="haul__item" style="--rc:${i.rar.col}">${i.name}${i.n > 1 ? ` <em>×${i.n}</em>` : ''}</span>`).join('')
      : '';
  }

  function report() {
    $('[data-machine]').hidden = true;
    const r = $('[data-report]');
    r.hidden = false;
    const spent = money(opened * CASE);
    if (ethical) {
      r.innerHTML = `
        <span class="loot__label">Ethical mode</span>
        <h3>Same case, no tricks</h3>
        <p class="loot__lede">You opened ${opened} case${opened === 1 ? '' : 's'} for ${spent}. Same items and the same odds as before. This time you saw the price in pounds and the odds up front, and the reel never stopped next to gold on purpose.</p>
        <p class="loot__lede">In my research, Battlefront II stopped selling crates for real money after the backlash, and Marvel Contest of Champions publishes its drop rates on its own website.</p>
        <div class="loot__end"><button class="btn" type="button" data-restart>Play the original again</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
    } else {
      r.innerHTML = `
        <span class="loot__label">Behind the curtain</span>
        <h3>Here’s how it played you</h3>
        <div class="loot__stats">
          <div><b>${opened}</b><span>Cases, worth ${spent}</span></div>
          <div><b>£${(topups * TOPUP_PRICE).toFixed(2)}</b><span>Topped up (${topups} time${topups === 1 ? '' : 's'})</span></div>
          <div><b>${near}</b><span>Rigged near misses</span></div>
          <div><b>${goldSeen}</b><span>Gold items shown, ${goldWon} won</span></div>
        </div>
        <ol class="loot__tricks">
          <li><h4>Premium currency</h4><p>Every price was in gems, so a £2.50 case never felt like £2.50. You opened ${spent} of cases.</p><p class="loot__seen">In my research: EA FC 26 sells FC Points, and Marvel Contest of Champions sells currency to buy its crystals.</p></li>
          <li><h4>Gems left over</h4><p>Cases cost ${CASE} gems and top-ups give ${num(TOPUP)}, so there’s always some left: close to another case, never quite there. You finished with ${num(gems)}.</p><p class="loot__seen">In my research: EA FC 26 and Marvel Contest of Champions both sell currency in amounts that leave you short.</p></li>
          <li><h4>Near misses</h4><p>The reel stopped right next to a Golden Gerbert ${near} time${near === 1 ? '' : 's'}, on purpose. ${goldSeen} gold items scrolled past, but gold really drops 0.26% of the time, about 1 in 385.</p><p class="loot__seen">In my research: Counter-Strike 2 and Marvel Contest of Champions both use roulette reels that show what you nearly won.</p></li>
          <li><h4>Hidden odds</h4><p>${peeked ? 'You found the drop rates behind the tiny “i”. Most people never do.' : 'The drop rates were behind a tiny “i” next to the reel. You never opened it.'}</p><p class="loot__seen">In my research: Counter-Strike 2 doesn’t show case odds in the game, and I couldn’t find official odds for Battlefront II at all.</p></li>
          <li><h4>Celebrate everything</h4><p>Every pull got a fanfare, including ${commons} common${commons === 1 ? '' : 's'} and ${dupes} duplicate${dupes === 1 ? '' : 's'}.</p><p class="loot__seen">In my research: in EA FC 26, the bigger the pack, the bigger the celebration.</p></li>
          <li><h4>Fake urgency</h4><p>${resets ? `The “limited time” offer ran out and quietly restarted ${resets} time${resets === 1 ? '' : 's'} while you played.` : 'The “limited time” offer restarts every time it runs out, and again every time you reload.'}</p><p class="loot__seen">In my research: EA FC 26 and Marvel Contest of Champions lean on limited time offers, events, and daily deals.</p></li>
        </ol>
        <div class="loot__end"><button class="btn" type="button" data-ethical>Replay in Ethical mode</button><button class="btn btn--ghost" type="button" data-restart>Start over</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
      window.secrets?.unlock('house');
    }
    r.querySelector('[data-ethical]')?.addEventListener('click', () => start(true));
    r.querySelector('[data-restart]').addEventListener('click', () => start(false));
    root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function start(eth) {
    ethical = eth;
    gems = START; topups = 0; opened = 0; near = 0; goldSeen = 0; goldWon = 0; dupes = 0; commons = 0; resets = 0; peeked = false; spinning = false;
    haul = new Map();
    clock = 45 + Math.floor(Math.random() * 45);
    root.classList.toggle('is-ethical', eth);
    root.classList.remove('is-celebrate');
    $('[data-machine]').hidden = false;
    $('[data-report]').hidden = true;
    $('[data-offer]').hidden = eth;
    odds.hidden = !eth;
    infoBtn.setAttribute('aria-expanded', 'false');
    status.textContent = eth ? 'Ethical mode: prices in pounds, odds up front, and an honest reel.' : 'You’ve got 1,000 free gems. Open a case to see what you get.';
    fill(pick(roll()), false);
    strip.style.transform = `translateX(${reel.clientWidth / 2 - (4 * (strip.children[1].offsetLeft - strip.children[0].offsetLeft) + strip.children[0].offsetWidth / 2)}px)`;
    renderHaul();
    hud();
  }

  openBtn.addEventListener('click', spin);
  topBtn.addEventListener('click', () => { gems += TOPUP; topups++; hud(); });
  doneBtn.addEventListener('click', () => { if (!spinning) report(); });
  infoBtn.addEventListener('click', () => {
    odds.hidden = !odds.hidden;
    infoBtn.setAttribute('aria-expanded', String(!odds.hidden));
    if (!odds.hidden) peeked = true;
  });
  $('[data-sound]').addEventListener('click', (e) => {
    sound = !sound;
    if (sound) { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); }
    e.currentTarget.setAttribute('aria-pressed', String(sound));
    e.currentTarget.textContent = sound ? 'Sound on' : 'Sound off';
  });
  // the "limited time" offer: when it runs out, it quietly starts again
  setInterval(() => {
    if (ethical || !$('[data-report]').hidden) return;
    if (--clock <= 0) { clock = OFFER; resets++; }
    hud();
  }, 1000);

  start(false);
})();
