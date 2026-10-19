// Loot box simulator: a case opener that plays like a real one, then shows how it played you.
// The tricks come from the analysis sheet in my loot box research report, and Ethical mode shows
// the fixes. No real money, ever.
(() => {
  const root = document.querySelector('[data-game="loot-box"]');
  if (!root) return;

  const CASE = 275, START = 1000, MAX_CASES = 10, PRICE = 2.5, PITY = 10;
  const LEN = 60, WIN = 52, NEAR = 0.55, OFFER = 60, COOLDOWN = 20;   // reel length, winning slot, near-miss rate, offer timings (s)
  const BUNDLES = [   // none of these divide by 275, so there are always gems left over
    { gems: 1000, price: 9.99 },
    { gems: 2800, price: 19.99, tag: 'Most popular' },
    { gems: 7500, price: 49.99, tag: 'Best value' },
  ];
  const gbp = (n) => `£${n.toFixed(2)}`;
  const money = (gems) => gbp((gems * BUNDLES[0].price) / BUNDLES[0].gems);
  const num = (n) => n.toLocaleString('en-GB');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const RARITY = [   // the same odds as a Counter-Strike 2 case
    { id: 'common', name: 'Common', odds: 79.92, tease: 50, col: '#4b69ff' },
    { id: 'rare', name: 'Rare', odds: 15.98, tease: 26, col: '#8847ff' },
    { id: 'epic', name: 'Epic', odds: 3.2, tease: 14, col: '#d32ce6' },
    { id: 'legend', name: 'Legendary', odds: 0.64, tease: 7, col: '#eb4b4b' },
    { id: 'gold', name: 'Golden', odds: 0.26, tease: 3, col: '#e4ae39' },
  ];
  const GOLD = RARITY[4];
  const ITEMS = {   // [name, project, icon]
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
  const NAMES = ['Kai_77', 'xXSniperXx', 'GerbertFan', 'NoScopeNan', 'lil_wizard', 'Tobi.exe', 'craftyboi', 'MossyRock', 'FragQueen', 'Dave_RP'];
  const svg = (k) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const GEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 9l3-5h8l3 5-7 11z"/></svg>';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.innerHTML = `
    <div class="loot">
      <div class="loot__machine" data-machine>
        <div class="loot__top">
          <div class="loot__wallet"><span class="loot__label" data-wallet-label></span><b>${GEM}<span data-wallet></span></b><span class="loot__label" data-wallet-sub></span></div>
          <div class="loot__offer" data-offer><span data-offer-label></span><b>2× Golden Gerbert chance</b><time data-clock></time></div>
          <div class="loot__meta">
            <span data-count></span>
            <div class="loot__limit" data-limit><span data-limit-text></span><i data-limit-bar></i></div>
            <button class="loot__sound" type="button" data-sound aria-pressed="false">Sound off</button>
          </div>
        </div>
        <div class="loot__stage">
          <div class="reel"><div class="reel__strip" data-strip></div></div>
          <button class="reel__info" type="button" data-info aria-label="Drop rates" aria-expanded="false">i</button>
          <div class="loot__odds" data-odds hidden></div>
          <p class="loot__banner" data-banner aria-hidden="true"></p>
        </div>
        <p class="loot__feed" data-feed aria-hidden="true"><i></i><span>Live</span><b data-feed-text></b></p>
        <p class="loot__pity" data-pity></p>
        <p class="loot__status" data-status aria-live="polite"></p>
        <div class="loot__actions">
          <button class="btn" type="button" data-open></button>
          <button class="loot__done" type="button" data-done>I’m done</button>
        </div>
        <div class="loot__shop" data-shop><span class="loot__label">Top up</span>${BUNDLES.map((b, i) => `<button class="loot__bundle" type="button" data-bundle="${i}"><b>${num(b.gems)} gems</b><span>£${b.price}</span>${b.tag ? `<em>${b.tag}</em>` : ''}</button>`).join('')}</div>
        <div class="loot__buy" data-buy>
          <span class="loot__label">Buy cases</span>
          <div class="loot__qty"><button type="button" data-step="-1" aria-label="One fewer">−</button><input type="number" inputmode="numeric" min="1" value="1" data-qty aria-label="Number of cases"><button type="button" data-step="1" aria-label="One more">+</button></div>
          <button class="btn btn--ghost" type="button" data-purchase></button>
        </div>
        <div class="loot__haul" data-haul></div>
        <div class="loot__guilt" data-guilt hidden>
          <p class="loot__guilt-title">Leaving already?</p>
          <p data-guilt-text></p>
          <button class="btn" type="button" data-stay>Keep opening</button>
          <button class="loot__done" type="button" data-leave>No thanks, I don’t like winning</button>
        </div>
      </div>
      <div class="loot__report" data-report hidden></div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const strip = $('[data-strip]'), reel = $('.reel'), banner = $('[data-banner]'), status = $('[data-status]'), odds = $('[data-odds]');
  const openBtn = $('[data-open]'), doneBtn = $('[data-done]'), infoBtn = $('[data-info]'), offerEl = $('[data-offer]');
  const qty = $('[data-qty]'), buyBtn = $('[data-purchase]'), guilt = $('[data-guilt]'), reportEl = $('[data-report]');

  let ethical, gems, owned, bought, spent, topups, opened, near, goldSeen, goldWon, dupes, commons, peeked, spinning;
  let haul, sinceEpic, best, fakeWins, guilted, offer, feedIn;

  const pickRarity = (key) => {
    let r = Math.random() * RARITY.reduce((s, x) => s + x[key], 0);
    for (const rar of RARITY) if ((r -= rar[key]) < 0) return rar;
    return RARITY[0];
  };
  // the case result. Ethical mode guarantees Epic or better within PITY cases
  function rollWin() {
    if (!ethical || sinceEpic < PITY - 1) return pickRarity('odds');
    const top = RARITY.slice(2);
    let r = Math.random() * top.reduce((s, x) => s + x.odds, 0);
    for (const rar of top) if ((r -= rar.odds) < 0) return rar;
    return top[0];
  }
  // reel filler: the shady version shows rare items far more often than they drop
  const tease = () => pickRarity(ethical ? 'odds' : 'tease');
  // fresh = duplicate protection: an item you don't own yet, while there are any left in that rarity
  function pick(rar, fresh = false) {
    let list = ITEMS[rar.id];
    if (fresh) list = list.filter(([n]) => !haul.has(n)).length ? list.filter(([n]) => !haul.has(n)) : list;
    const [name, from, icon] = list[Math.floor(Math.random() * list.length)];
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

  const room = () => MAX_CASES - bought;
  const qtyVal = () => Math.min(Math.max(1, Math.round(Number(qty.value) || 1)), Math.max(1, room()));

  function hud() {
    if (ethical) {
      $('[data-wallet-label]').textContent = 'Cases owned';
      $('[data-wallet]').textContent = owned;
      $('[data-wallet-sub]').textContent = `${gbp(PRICE)} each`;
      $('[data-limit-text]').textContent = `Spent ${gbp(spent)} of your ${gbp(PRICE * MAX_CASES)} limit`;
      $('[data-limit-bar]').style.setProperty('--p', spent / (PRICE * MAX_CASES));
      openBtn.textContent = owned ? `Open case (${owned} left)` : 'Open case';
      openBtn.disabled = spinning || owned < 1;
      const n = qtyVal(), left = room();
      buyBtn.textContent = left ? `Buy ${plural(n, 'case')} · ${gbp(n * PRICE)}` : 'Session limit reached';
      buyBtn.disabled = spinning || !left;
      qty.disabled = !left;
      root.querySelectorAll('[data-step]').forEach((b) => { b.disabled = !left || (b.dataset.step < 0 ? n <= 1 : n >= left); });
      $('[data-pity]').innerHTML = `Epic or better guaranteed within <b>${plural(PITY - sinceEpic, 'case')}</b>`;
    } else {
      $('[data-wallet-label]').textContent = 'Wallet';
      $('[data-wallet]').textContent = num(gems);
      $('[data-wallet-sub]').textContent = 'gems';
      $('[data-count]').textContent = `${opened} / ${MAX_CASES} cases`;
      openBtn.textContent = `Open case · ${CASE} gems`;
      openBtn.disabled = spinning || gems < CASE || opened >= MAX_CASES;
      root.querySelectorAll('[data-bundle]').forEach((b, i) => {
        b.disabled = spinning || opened >= MAX_CASES;
        b.classList.toggle('is-pulse', i === 1 && gems < CASE && opened < MAX_CASES);
      });
      renderOffer();
    }
    doneBtn.hidden = opened === 0;
    doneBtn.disabled = spinning;
  }

  // the "limited time" offer: it runs out, goes quiet for a bit, then comes back "by popular demand"
  function renderOffer() {
    const live = offer.phase === 'live';
    offerEl.classList.toggle('is-ended', !live);
    $('[data-offer-label]').textContent = !live ? 'Offer ended' : offer.returns ? 'Back by popular demand' : 'Limited time';
    $('[data-clock]').textContent = live ? `${Math.floor(offer.t / 60)}:${String(offer.t % 60).padStart(2, '0')}` : 'Back soon';
  }

  // fake winners: nobody in this feed exists
  function feed() {
    const item = Math.random() < 0.4 ? ITEMS.gold[0] : ITEMS.legend[Math.floor(Math.random() * ITEMS.legend.length)];
    const el = $('[data-feed-text]');
    el.textContent = `${NAMES[Math.floor(Math.random() * NAMES.length)]} just unboxed ${item[0]}`;
    el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new');
    fakeWins++;
  }

  function spin() {
    if (spinning || (ethical ? owned < 1 : gems < CASE)) return;
    spinning = true;
    if (ethical) owned--; else gems -= CASE;
    root.classList.remove('is-celebrate');
    status.textContent = 'Opening…';
    const win = pick(rollWin(), ethical), { side, gold } = fill(win);
    if (!ethical) goldSeen += gold;
    hud();
    const cards = strip.children, cw = cards[0].offsetWidth, step = cards[1].offsetLeft - cards[0].offsetLeft, mid = reel.clientWidth / 2;
    const offset = side ? side * cw * (0.36 + Math.random() * 0.1) : (Math.random() - 0.5) * cw * 0.7;
    const from = mid - (4 * step + cw / 2), to = mid - (WIN * step + cw / 2 + offset);
    const dur = reduced ? 400 : ethical ? 1600 : 5200, t0 = performance.now();
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
    const dupe = haul.has(win.name), tier = RARITY.indexOf(win.rar);
    haul.set(win.name, { ...win, n: (haul.get(win.name)?.n || 0) + 1 });
    if (dupe) dupes++;
    if (tier === 0) commons++;
    if (win.rar === GOLD) goldWon++;
    if (side) near++;
    sinceEpic = tier >= 2 ? 0 : sinceEpic + 1;
    if (!best || tier > RARITY.indexOf(best.rar)) best = win;
    if (!ethical || tier >= 3) {
      banner.textContent = win.rar === GOLD ? 'Golden!' : dupe ? 'Duplicate!' : tier === 0 ? 'Nice pull!' : `${win.rar.name}!`;
      root.style.setProperty('--rc', win.rar.col);
      void root.offsetWidth; root.classList.add('is-celebrate');
      fanfare();
    }
    status.textContent = side
      ? 'So close! The Golden Gerbert was right there. One more?'
      : `You got ${win.name} (${win.rar.name}) from ${win.from}.`;
    renderHaul();
    hud();
    if (ethical ? !room() && !owned : opened >= MAX_CASES) setTimeout(report, reduced ? 300 : 1800);
  }

  function renderHaul() {
    const items = [...haul.values()].sort((a, b) => RARITY.indexOf(b.rar) - RARITY.indexOf(a.rar));
    $('[data-haul]').innerHTML = items.length
      ? `<span class="loot__label">Your haul</span>` + items.map((i) => `<span class="haul__item" style="--rc:${i.rar.col}">${i.name}${i.n > 1 ? ` <em>×${i.n}</em>` : ''}</span>`).join('')
      : '';
  }

  const trick = (title, body, seen) => `<li><h4>${title}</h4><p>${body}</p>${seen ? `<p class="loot__seen">${seen}</p>` : ''}</li>`;

  function report() {
    guilt.hidden = true;
    $('[data-machine]').hidden = true;
    reportEl.hidden = false;
    if (ethical) {
      reportEl.innerHTML = `
        <span class="loot__label">Ethical mode</span>
        <h3>Same case, no tricks</h3>
        <div class="loot__stats">
          <div><b>${opened}</b><span>Cases opened</span></div>
          <div><b>${gbp(spent)}</b><span>Spent, nothing left over</span></div>
          <div><b>${dupes}</b><span>Duplicates</span></div>
          <div><b>${best ? best.rar.name : 'None'}</b><span>Best pull${best ? `: ${best.name}` : ''}</span></div>
        </div>
        <ol class="loot__tricks loot__tricks--good">
          ${trick('Real prices', `Every price was in pounds: ${gbp(PRICE)} a case, no currency in between.`, 'In my research: EA FC 26 prices packs in FC Points, so you have to work out the real cost yourself.')}
          ${trick('Buy what you need', 'You bought exactly the cases you wanted, and nothing was left over.', 'In my research: FC Points only come in set amounts, so you often have to buy more than you need.')}
          ${trick('Every item’s odds', 'Each item showed its own drop chance, not just its rarity.', 'In my research: EA FC 26 only shows odds by rarity, and Marvel Contest of Champions keeps its rates on a separate website.')}
          ${trick('An honest reel', 'No near misses, and the reel showed items at their real odds. It also spins faster, so there’s less suspense.', 'In my research: Counter-Strike 2 and Marvel Contest of Champions both use roulette reels that show what you nearly won.')}
          ${trick('A pity guarantee', `Epic or better within ${PITY} cases, so bad luck can only cost you so much.`)}
          ${trick('Duplicate protection', 'No duplicates until you own every item in that rarity.')}
          ${trick('A spending limit', `A ${gbp(PRICE * MAX_CASES)} session limit, with what you’ve spent always on screen.`)}
          ${trick('No pressure', 'No timers, fake offers, fake winners, or guilt trips when you leave.', 'In my research: after the backlash, Battlefront II stopped selling crates and made them earnable through play instead.')}
        </ol>
        <div class="loot__end"><button class="btn" type="button" data-restart>Play the original again</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
    } else {
      const worth = money(opened * CASE);
      reportEl.innerHTML = `
        <span class="loot__label">Behind the curtain</span>
        <h3>Here’s how it played you</h3>
        <div class="loot__stats">
          <div><b>${opened}</b><span>Cases, worth ${worth}</span></div>
          <div><b>${gbp(spent)}</b><span>Topped up (${plural(topups, 'time')})</span></div>
          <div><b>${near}</b><span>Rigged near misses</span></div>
          <div><b>${goldSeen}</b><span>Gold items shown, ${goldWon} won</span></div>
        </div>
        <ol class="loot__tricks">
          ${trick('Premium currency', `Every price was in gems, so you never saw what a case really cost: about ${money(CASE)} at the smallest bundle. You opened ${worth} of cases.`, 'In my research: EA FC 26 sells FC Points, and Marvel Contest of Champions sells currency to buy its crystals.')}
          ${trick('Gems left over', `Cases cost ${CASE} gems and none of the bundles divide by ${CASE}, so there’s always some left: close to another case, never quite there. You finished with ${num(gems)}.`, 'In my research: EA FC 26 and Marvel Contest of Champions both sell currency in amounts that leave you short.')}
          ${trick('Bigger bundles', `The bigger bundles give more gems per pound (100, then 140, then 150), so spending more feels like saving. You spent ${gbp(spent)} on ${plural(topups, 'top-up')}.`, 'In my research: Marvel Contest of Champions filters spending through bundles, currencies, and sales.')}
          ${trick('Near misses', `The reel stopped right next to a Golden Gerbert ${plural(near, 'time')}, on purpose.`, 'In my research: Counter-Strike 2 and Marvel Contest of Champions both use roulette reels that show what you nearly won.')}
          ${trick('A teaser reel', `${plural(goldSeen, 'gold item')} scrolled past you, but gold really drops 0.26% of the time, about 1 in 385. The reel shows rare items far more often than they drop, so the jackpot feels close.`)}
          ${trick('Hidden odds', peeked ? 'You found the drop rates behind the tiny “i”. Most people never do.' : 'The drop rates were behind a tiny “i” next to the reel. You never opened it.', 'In my research: Counter-Strike 2 doesn’t show case odds in the game, and I couldn’t find official odds for Battlefront II at all.')}
          ${trick('A fake offer', `The “2× Golden Gerbert chance” was a lie: the odds never changed. ${offer.returns ? `It ended, went quiet, and came back “by popular demand” ${plural(offer.returns, 'time')}.` : 'It ends, goes quiet for a bit, then comes back “by popular demand”.'}`, 'In my research: EA FC 26 and Marvel Contest of Champions lean on limited time offers, events, and daily deals.')}
          ${trick('Fake winners', `${plural(fakeWins, '“player”')} unboxed gold or legendary items while you played. None of them exist. Fake winner feeds make big prizes look common.`)}
          ${trick('Celebrate everything', `Every pull got a fanfare, including ${plural(commons, 'common')} and ${plural(dupes, 'duplicate')}.`, 'In my research: in EA FC 26, the bigger the pack, the bigger the celebration.')}
          ${trick('A guilt trip', `${guilted ? 'When you tried to leave, it made you feel silly for going and said your luck was “due”.' : 'Pressing “I’m done” brings up a guilt trip that says your luck is “due”.'} Luck is never due: every case has the same odds.`)}
        </ol>
        <div class="loot__end"><button class="btn" type="button" data-ethical>Replay in Ethical mode</button><button class="btn btn--ghost" type="button" data-restart>Start over</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
      window.secrets?.unlock('house');
    }
    reportEl.querySelector('[data-ethical]')?.addEventListener('click', () => start(true));
    reportEl.querySelector('[data-restart]').addEventListener('click', () => start(false));
    root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function start(eth) {
    ethical = eth;
    gems = START; owned = 0; bought = 0; spent = 0; topups = 0; opened = 0; near = 0; goldSeen = 0; goldWon = 0; dupes = 0; commons = 0;
    peeked = false; spinning = false; sinceEpic = 0; best = null; fakeWins = 0; guilted = false;
    haul = new Map();
    offer = { phase: 'live', t: 45 + Math.floor(Math.random() * 45), returns: 0 };
    feedIn = 2;
    root.classList.toggle('is-ethical', eth);
    root.classList.remove('is-celebrate');
    $('[data-machine]').hidden = false;
    reportEl.hidden = true;
    guilt.hidden = true;
    for (const [sel, show] of [['[data-offer]', !eth], ['[data-feed]', !eth], ['[data-shop]', !eth], ['[data-count]', !eth], ['[data-buy]', eth], ['[data-pity]', eth], ['[data-limit]', eth]]) $(sel).hidden = !show;
    $('[data-feed-text]').textContent = '';
    odds.innerHTML = eth
      ? `<span class="loot__label">Every item’s drop chance</span><ul>${RARITY.flatMap((r) => ITEMS[r.id].map(([n]) => `<li style="--rc:${r.col}"><span>${n}</span><small>${r.name}</small><b>${(r.odds / ITEMS[r.id].length).toFixed(2)}%</b></li>`)).join('')}</ul>`
      : `<span class="loot__label">Drop rates</span><ul>${RARITY.map((r) => `<li style="--rc:${r.col}"><span>${r.name}</span><b>${r.odds}%</b></li>`).join('')}</ul>`;
    odds.hidden = !eth;
    infoBtn.setAttribute('aria-expanded', 'false');
    qty.value = 1;
    status.textContent = eth ? `Ethical mode: buy exactly the cases you want at ${gbp(PRICE)} each.` : 'You’ve got 1,000 free gems. Open a case to see what you get.';
    fill(pick(pickRarity('odds')), false);
    const c = strip.children;
    strip.style.transform = `translateX(${reel.clientWidth / 2 - (4 * (c[1].offsetLeft - c[0].offsetLeft) + c[0].offsetWidth / 2)}px)`;
    renderHaul();
    hud();
  }

  openBtn.addEventListener('click', spin);
  root.querySelectorAll('[data-bundle]').forEach((b) => b.addEventListener('click', () => {
    const bundle = BUNDLES[b.dataset.bundle];
    gems += bundle.gems; spent += bundle.price; topups++;
    status.textContent = `+${num(bundle.gems)} gems added.`;
    hud();
  }));
  buyBtn.addEventListener('click', () => {
    const n = qtyVal();
    if (!room()) return;
    bought += n; owned += n; spent += n * PRICE;
    status.textContent = `Bought ${plural(n, 'case')} for ${gbp(n * PRICE)}.`;
    qty.value = qtyVal();
    hud();
  });
  qty.addEventListener('input', hud);
  qty.addEventListener('change', () => { qty.value = qtyVal(); hud(); });
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { qty.value = qtyVal() + Number(b.dataset.step); qty.value = qtyVal(); hud(); }));
  doneBtn.addEventListener('click', () => {
    if (spinning) return;
    if (ethical) return report();
    guilted = true;
    $('[data-guilt-text]').textContent = `Your luck is due${offer.phase === 'live' ? ', and your 2× Golden Gerbert chance is still on' : ''}. ${gems >= CASE ? `You’ve still got ${num(gems)} gems to spend.` : 'One more case could be the one.'}`;
    guilt.hidden = false;
    $('[data-stay]').focus();
  });
  $('[data-stay]').addEventListener('click', () => { guilt.hidden = true; openBtn.focus(); });
  $('[data-leave]').addEventListener('click', report);
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
  setInterval(() => {
    if (ethical || !reportEl.hidden) return;
    if (--offer.t <= 0) {
      if (offer.phase === 'live') { offer.phase = 'ended'; offer.t = COOLDOWN; }
      else { offer.phase = 'live'; offer.t = OFFER; offer.returns++; }
    }
    renderOffer();
    if (--feedIn <= 0) { feed(); feedIn = 4 + Math.floor(Math.random() * 4); }
  }, 1000);

  start(false);
})();
