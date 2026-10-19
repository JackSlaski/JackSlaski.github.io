// Loot box simulator: a case opener that plays like a real one, then shows how it played you.
// The tricks come from my loot box literature review and research report (plus a few well-known
// ones from beyond it), and Ethical mode shows the fixes. No real money, ever.
(() => {
  const root = document.querySelector('[data-game="loot-box"]');
  if (!root) return;

  const CASE = 275, MAX_CASES = 10, PRICE = 2.5, PITY = 10;
  const LEN = 60, WIN = 52, NEAR = 0.5, OFFER = 60, COOLDOWN = 15, CHARGE = 750;   // reel, near-miss rate, event timings (s), build-up (ms)
  const BUNDLES = [   // none of these divide by 275, so there are always gems left over
    { gems: 1000, price: 9.99 },
    { gems: 2800, price: 19.99, tag: 'Most popular' },
    { gems: 7500, price: 49.99, tag: 'Best value' },
  ];
  const gbp = (n) => `£${n.toFixed(2)}`;
  const money = (gems) => gbp((gems * BUNDLES[0].price) / BUNDLES[0].gems);
  const num = (n) => n.toLocaleString('en-GB');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const RARITY = [   // the same odds as a real game's weapon case; value = the "market value" in gems
    { id: 'common', name: 'Common', odds: 79.92, tease: 52, value: 40, col: '#4b69ff' },
    { id: 'rare', name: 'Rare', odds: 15.98, tease: 27, value: 160, col: '#8847ff' },
    { id: 'epic', name: 'Epic', odds: 3.2, tease: 13, value: 700, col: '#d32ce6' },
    { id: 'legend', name: 'Legendary', odds: 0.64, tease: 6, value: 2500, col: '#eb4b4b' },
    { id: 'gold', name: 'Golden', odds: 0.26, tease: 2, value: 15000, col: '#e4ae39' },
  ];
  const [, , , LEGEND, GOLD] = RARITY;
  const ITEMS = {   // [name, project, icon file in assets/games/loot-icons]
    common: [['Wooden Stock', 'Recoil Works', 'gun-stock'], ['Straw Bed', 'Feudal Living', 'bed'], ['Match Ball', 'Do You Know Ball?', 'soccer-ball'], ['Slime Jar', 'Wild Magic', 'mason-jar'], ['Gold Doubloon', 'Leviathan’s Gauntlet', 'crown-coin'], ['Bubbling Potion', 'Formula and Flask', 'bubbling-flask'], ['Cave Crystal', 'Cave Generation Tool', 'crystal-growth']],
    rare: [['Extended Mag', 'Recoil Works', 'machine-gun-magazine'], ['Oak Table', 'Feudal Living', 'table'], ['Ship Cannon', 'Leviathan’s Gauntlet', 'pirate-cannon'], ['Copper Cauldron', 'Formula and Flask', 'cauldron'], ['Referee Whistle', 'Do You Know Ball?', 'whistle']],
    epic: [['Gem Slot', 'Arms & Assets', 'gems'], ['Wizard Hat', 'Wild Magic', 'pointy-hat'], ['Spaceship Cursor', 'Gerbert Games', 'spaceship'], ['Shockwave', 'Survivors Like', 'sonic-boom']],
    legend: [['Explosive Rounds', 'Recoil Works', 'heavy-bullets'], ['Leviathan Fang', 'Leviathan’s Gauntlet', 'bestial-fangs'], ['Raise Hell', 'Survivors Like', 'fire-ring']],
    gold: [['Golden Gerbert', 'Gerbert Games', 'ufo']],
  };
  const TOTAL_ITEMS = Object.values(ITEMS).flat().length;
  const NAMES = ['NoScopeNan', 'Kai77', 'DanRP', 'TurboTom', 'SweatyPalms', 'BigChungus99', 'MrSprinkles', 'GhostFace21', 'NotAFreeKill', 'SilentSam',
    'ProbablyLagging', 'ChickenNugget', 'TacoTuesday', 'RektByRob', 'Sn1perMonkey', 'LilYeti', 'WetSocks', 'BoltAction', 'MossyRock', 'GerbertFan',
    'CrispyBacon', 'OnlyHeadshots', 'SneakyPete', 'MegaMango', 'FrostyBits', 'PixelPirate', 'DoubleTapDave', 'CampingCarl', 'ZeroChill', 'HotSauceHarry',
    'NoobSlayer', 'ClutchKing', 'AimBotAndy', 'CouchPotato', 'SaltyChips', 'xXDarkLordXx', 'DeadEye', 'Gr4nnySmith', 'OopsAllCrits', 'LagSwitchLarry',
    'YeetMaster', 'BeansOnToast', 'ToastyBoi', 'WiFiWarrior', 'KeyboardKev', 'LowBattery', 'SpicyMeatball', 'NoodleArms', 'SockGoblin', 'Jynx'];
  const GEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 9l3-5h8l3 5-7 11z"/></svg>';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bundles = BUNDLES.map((b, i) => `<button class="loot__bundle" type="button" data-bundle="${i}"><b>${num(b.gems)} gems</b><span>£${b.price}</span>${b.tag ? `<em>${b.tag}</em>` : ''}</button>`).join('');

  root.innerHTML = `
    <div class="loot">
      <div class="loot__machine" data-machine>
        <div class="loot__top">
          <div class="loot__wallet"><span class="loot__label" data-wallet-label></span><b>${GEM}<span data-wallet></span></b><span class="loot__label" data-wallet-sub></span></div>
          <div class="loot__offer" data-offer><span data-offer-label></span><b>2× Golden Gerbert chance</b><time data-clock></time></div>
          <div class="loot__meta"><span data-count></span><button class="loot__sound" type="button" data-sound aria-pressed="false">Sound off</button></div>
        </div>
        <div class="loot__stage" data-stage>
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
          <button type="button" data-done>I’m done</button>
        </div>
        <div class="loot__shop" data-shop><span class="loot__label">Top up</span>${bundles}<p class="loot__fake">Pretend prices. No real money is ever taken.</p></div>
        <div class="loot__buy" data-buy>
          <div class="loot__buyrow">
            <span class="loot__label">Buy cases</span>
            <div class="loot__qty"><button type="button" data-step="-1" aria-label="One fewer">−</button><input type="number" inputmode="numeric" min="1" value="1" data-qty aria-label="Number of cases"><button type="button" data-step="1" aria-label="One more">+</button></div>
            <button class="btn btn--ghost" type="button" data-purchase></button>
          </div>
          <div class="loot__age" data-age hidden>
            <p>Paid loot boxes are for adults. Are you 18 or over?</p>
            <button class="btn" type="button" data-age-yes>Yes, I’m 18+</button>
            <button class="btn btn--ghost" type="button" data-age-no>No</button>
          </div>
          <div class="loot__limit"><span data-limit-text></span><i data-limit-bar></i></div>
          <p class="loot__tag">18+ · In-game purchases (includes random items)</p>
          <p class="loot__fake">Pretend prices. No real money is ever taken.</p>
        </div>
        <div class="loot__haul" data-haul></div>
        <div class="loot__pop" data-pop hidden>
          <p class="loot__guilt-title" data-pop-title></p>
          <p data-pop-text></p>
          <div class="loot__popshop">${bundles}</div>
          <p class="loot__fake">Pretend prices. No real money is ever taken.</p>
          <button class="loot__done" type="button" data-pop-close>Not now</button>
        </div>
        <div class="loot__guilt" data-guilt hidden>
          <p class="loot__guilt-title">Leaving already?</p>
          <p data-guilt-text></p>
          <button class="btn" type="button" data-stay>Keep opening</button>
          <button class="loot__done" type="button" data-leave>No thanks, I don’t like winning</button>
        </div>
      </div>
      <div class="loot__report" data-report hidden></div>
      <p class="loot__credit">Item icons by Delapouite, Lorc, and Caro Asercion from <a href="https://game-icons.net">game-icons.net</a>, licensed under <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>.</p>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const strip = $('[data-strip]'), reel = $('.reel'), stage = $('[data-stage]'), banner = $('[data-banner]'), status = $('[data-status]'), odds = $('[data-odds]');
  const openBtn = $('[data-open]'), doneBtn = $('[data-done]'), infoBtn = $('[data-info]'), offerEl = $('[data-offer]');
  const qty = $('[data-qty]'), buyBtn = $('[data-purchase]'), age = $('[data-age]'), guilt = $('[data-guilt]'), pop = $('[data-pop]'), reportEl = $('[data-report]');

  let ethical, gems, free, owned, bought, spent, topups, opened, nearGold, nearLegend, goldSeen, legendSeen, goldWon, dupes, commons, peeked, spinning;
  let haul, sinceEpic, best, fakeWins, guilted, offer, feedIn, eventWins, popups, forceGold = false;
  let ageOk = false, ageNo = false, bag = [];

  const weighted = (w) => {
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return RARITY[i];
    return RARITY[0];
  };
  const eventOn = () => !ethical && offer.phase === 'live';
  // the case result. The 2x event really does double gold; Ethical mode guarantees Epic or better within PITY cases
  function rollWin() {
    if (forceGold) { forceGold = false; return GOLD; }   // the forcedrop cheat
    const w = RARITY.map((r) => (r === GOLD && eventOn() ? r.odds * 2 : r.odds));
    if (ethical && sinceEpic >= PITY - 1) { w[0] = 0; w[1] = 0; }
    return weighted(w);
  }
  // reel filler: the original shows rare items far more often than they drop
  const tease = () => weighted(RARITY.map((r) => (ethical ? r.odds : r.tease)));
  // fresh = duplicate protection: an item you don't own yet, while there are any left in that rarity
  function pick(rar, fresh = false) {
    let list = ITEMS[rar.id];
    const unowned = list.filter(([n]) => !haul.has(n));
    if (fresh && unowned.length) list = unowned;
    const [name, from, icon] = list[Math.floor(Math.random() * list.length)];
    return { name, from, icon, rar };
  }
  const card = (c) => `<div class="reel__card" style="--rc:${c.rar.col}"><i class="reel__icon" style="-webkit-mask-image:url(assets/games/loot-icons/${c.icon}.svg);mask-image:url(assets/games/loot-icons/${c.icon}.svg)"></i><b>${c.name}</b><span>${c.from}</span></div>`;

  function fill(win, rig = true, hook = false) {
    const fixed = new Map([[WIN, win]]);
    let side = 0, bait = null;
    if (rig && !ethical && (hook || Math.random() < NEAR)) {   // rigged: park something better right next to the marker
      const target = hook || Math.random() < 0.35 ? GOLD : LEGEND;
      if (RARITY.indexOf(win.rar) < RARITY.indexOf(target)) {
        side = Math.random() < 0.5 ? 1 : -1;
        bait = pick(target);
        fixed.set(WIN + side, bait);
      }
    }
    // filler never repeats the item right next to it
    const cards = [];
    for (let i = 0; i < LEN; i++) {
      if (fixed.has(i)) { cards.push(fixed.get(i)); continue; }
      const avoid = [cards[i - 1]?.name, fixed.get(i + 1)?.name];
      let c;
      do c = pick(tease()); while (avoid.includes(c.name));
      cards.push(c);
    }
    strip.innerHTML = cards.map(card).join('');
    const passed = cards.slice(0, WIN + 4);
    return { side, bait, gold: passed.filter((c) => c.rar === GOLD).length, legend: passed.filter((c) => c.rar === LEGEND).length };
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
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function hud() {
    $('[data-count]').textContent = `${opened} / ${MAX_CASES} cases`;
    if (ethical) {
      $('[data-wallet-label]').textContent = 'Cases owned';
      $('[data-wallet]').textContent = owned;
      $('[data-wallet-sub]').textContent = `${gbp(PRICE)} each`;
      $('[data-limit-text]').textContent = `Spent ${gbp(spent)} of your ${gbp(PRICE * MAX_CASES)} limit`;
      $('[data-limit-bar]').style.setProperty('--p', spent / (PRICE * MAX_CASES));
      openBtn.textContent = owned ? `Open case (${owned} left)` : 'Open case';
      openBtn.disabled = spinning || owned < 1;
      const n = qtyVal(), left = room() && !ageNo;
      buyBtn.textContent = ageNo ? 'Buying is off' : left ? `Buy ${plural(n, 'case')} · ${gbp(n * PRICE)}` : 'Session limit reached';
      buyBtn.disabled = spinning || !left;
      qty.disabled = !left;
      root.querySelectorAll('[data-step]').forEach((b) => { b.disabled = !left || (b.dataset.step < 0 ? n <= 1 : n >= room()); });
      $('[data-pity]').innerHTML = `Epic or better guaranteed within <b>${plural(PITY - sinceEpic, 'case')}</b>`;
      doneBtn.hidden = false;
    } else {
      $('[data-wallet-label]').textContent = 'Wallet';
      $('[data-wallet]').textContent = num(gems);
      $('[data-wallet-sub]').textContent = free ? 'gems · 1 free case' : 'gems';
      openBtn.textContent = free ? 'Open your free case' : `Open case · ${CASE} gems`;
      openBtn.disabled = spinning || (!free && gems < CASE) || opened >= MAX_CASES;
      root.querySelectorAll('[data-bundle]').forEach((b) => {
        b.disabled = spinning || opened >= MAX_CASES;
        b.classList.toggle('is-pulse', b.dataset.bundle === '1' && !free && gems < CASE && opened < MAX_CASES);
      });
      renderOffer();
      doneBtn.hidden = opened === 0;
    }
    doneBtn.disabled = spinning;
  }

  // the limited time event: it runs out, cools down, then comes back "by popular demand"
  function renderOffer() {
    const live = offer.phase === 'live';
    offerEl.classList.toggle('is-ended', !live);
    $('[data-offer-label]').textContent = !live ? 'Event ended' : offer.returns ? 'Back by popular demand' : 'Limited time event';
    $('[data-clock]').textContent = live ? clock(offer.t) : `Back in ${clock(offer.t)}`;
  }

  // fake winners: nobody in this feed exists
  function feed() {
    if (!bag.length) bag = [...NAMES].sort(() => Math.random() - 0.5);
    const item = Math.random() < 0.4 ? ITEMS.gold[0] : ITEMS.legend[Math.floor(Math.random() * ITEMS.legend.length)];
    const el = $('[data-feed-text]');
    el.textContent = `${bag.pop()} just unboxed ${item[0]}`;
    el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new');
    fakeWins++;
  }

  function spin() {
    if (spinning || (ethical ? owned < 1 : !free && gems < CASE)) return;
    spinning = true;
    const hook = !ethical && free > 0;   // the free case always "nearly" wins gold
    if (ethical) owned--; else if (free) free--; else gems -= CASE;
    const during = eventOn();
    root.classList.remove('is-celebrate');
    status.textContent = 'Opening…';
    const win = pick(rollWin(), ethical), { side, bait, gold, legend } = fill(win, true, hook);
    if (!ethical) { goldSeen += gold; legendSeen += legend; }
    hud();
    const cards = strip.children, cw = cards[0].offsetWidth, step = cards[1].offsetLeft - cards[0].offsetLeft, mid = reel.clientWidth / 2;
    const offset = side ? side * cw * (0.36 + Math.random() * 0.1) : (Math.random() - 0.5) * cw * 0.7;
    const from = mid - (4 * step + cw / 2), to = mid - (WIN * step + cw / 2 + offset);
    const go = () => {
      const dur = reduced ? 400 : ethical ? 1400 : 5600, t0 = performance.now();
      let last = -1;
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur), x = from + (to - from) * (1 - Math.pow(1 - t, 4));
        strip.style.transform = `translateX(${x}px)`;
        const idx = Math.floor((mid - x) / step);
        if (idx !== last) { last = idx; beep(1500, 0.025); }
        if (t < 1) requestAnimationFrame(frame);
        else land(win, bait, during);
      };
      requestAnimationFrame(frame);
    };
    if (ethical || reduced) return go();
    // suspense: the case shakes and builds up before it opens
    stage.classList.add('is-charging');
    [220, 300, 400, 520].forEach((f, i) => beep(f, 0.12, 'sawtooth', 0.025, i * 0.17));
    setTimeout(() => { stage.classList.remove('is-charging'); go(); }, CHARGE);
  }

  function land(win, bait, during) {
    spinning = false;
    opened++;
    strip.children[WIN].classList.add('is-win');
    const dupe = haul.has(win.name), tier = RARITY.indexOf(win.rar);
    haul.set(win.name, { ...win, n: (haul.get(win.name)?.n || 0) + 1 });
    if (dupe) dupes++;
    if (tier === 0) commons++;
    if (win.rar === GOLD) { goldWon++; if (during) eventWins++; }
    if (bait) bait.rar === GOLD ? nearGold++ : nearLegend++;
    devlog('LogLoot', `Opened ${win.name} (${win.rar.name})${bait ? `, rigged near miss on ${bait.name}` : ''}`);
    sinceEpic = tier >= 2 ? 0 : sinceEpic + 1;
    if (!best || tier > RARITY.indexOf(best.rar)) best = win;
    if (!ethical || tier >= 3) {
      banner.textContent = win.rar === GOLD ? 'Golden!' : dupe ? 'Duplicate!' : tier === 0 ? 'Nice pull!' : `${win.rar.name}!`;
      root.style.setProperty('--rc', win.rar.col);
      void root.offsetWidth; root.classList.add('is-celebrate');
      fanfare();
    }
    status.textContent = bait
      ? `So close! ${bait.name} was right there. One more?`
      : `You got ${win.name} (${win.rar.name}) from ${win.from}.`;
    renderHaul();
    hud();
    if (ethical ? !room() && !owned : opened >= MAX_CASES) setTimeout(report, reduced ? 300 : 1800);
    else if (!ethical && gems < CASE) setTimeout(shopPop, reduced ? 300 : 1400);
  }

  // the free first case is the hook: as soon as you can't afford another, a shop pops up
  function shopPop() {
    if (spinning || !reportEl.hidden || !guilt.hidden) return;
    popups++;
    $('[data-pop-title]').textContent = popups === 1 ? 'Want another go?' : 'Out of gems';
    $('[data-pop-text]').textContent = popups === 1
      ? 'Your first case was on us. Grab some gems to keep opening.'
      : 'You’re on a roll. Top up now and keep it going.';
    pop.hidden = false;
    pop.querySelector('[data-bundle="1"]').focus();
  }

  const haulValue = () => [...haul.values()].reduce((s, i) => s + i.rar.value * i.n, 0);
  function renderHaul() {
    const items = [...haul.values()].sort((a, b) => RARITY.indexOf(b.rar) - RARITY.indexOf(a.rar));
    if (!items.length) { $('[data-haul]').innerHTML = ''; return; }
    // the original turns your haul into a collection to finish, with a "market value" on everything
    const head = ethical
      ? '<p class="loot__collect"><span class="loot__label">Your haul</span></p>'
      : `<p class="loot__collect"><span class="loot__label">Collection ${haul.size} / ${TOTAL_ITEMS}</span><i style="--p:${haul.size / TOTAL_ITEMS}"></i><span class="loot__label">Worth ${num(haulValue())} gems</span></p>`;
    $('[data-haul]').innerHTML = head + items.map((i) => `<span class="haul__item" style="--rc:${i.rar.col}">${i.name}${i.n > 1 ? ` <em>×${i.n}</em>` : ''}${ethical ? '' : ` <em>${num(i.rar.value)}</em>`}</span>`).join('');
  }

  const trick = (title, body) => `<li><h4>${title}</h4><p>${body}</p></li>`;
  const group = (title, items) => `<div class="loot__group"><p class="loot__label">${title}</p><ol class="loot__tricks">${items.join('')}</ol></div>`;

  function report() {
    guilt.hidden = true;
    pop.hidden = true;
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
        ${group('Clear costs', [
          trick('Real prices', `One price in pounds: ${gbp(PRICE)} a case. No currency and no bundles.`),
          trick('Buy what you need', 'You bought exactly the cases you wanted, and nothing was left over.'),
          trick('A spending limit', `A ${gbp(PRICE * MAX_CASES)} session limit, with what you’ve spent always on screen.`),
          trick('Easy to leave', 'The “I’m done” button is as big as the one to open a case, and one click takes you straight out.'),
        ])}
        ${group('Honest odds', [
          trick('Every item’s odds', 'Each item showed its own drop chance, right under the reel.'),
          trick('An honest reel', 'No build-up, no near misses, and the reel shows items at their real odds. It spins fast too, so there’s less suspense.'),
          trick('A pity guarantee', `Epic or better within ${PITY} cases, so bad luck can only cost you so much.`),
          trick('Duplicate protection', 'No duplicates until you own every item in that rarity.'),
        ])}
        ${group('No pressure', [
          trick('No timers or fake winners', 'No limited time events, live feeds, pop-ups, collection bars, or guilt trips.'),
          trick('Calm results', 'Only Legendary and Golden pulls get a celebration, and nothing shows a “market value” to make it look like profit.'),
          trick('An age check and a label', 'Buying asks if you’re 18 or over, and the shop carries the “In-game purchases (includes random items)” label.'),
          trick('Cosmetic only', 'Nothing you can buy makes you stronger, so paying never means winning.'),
        ])}
        <div class="loot__end"><button class="btn" type="button" data-restart>Play the original again</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
    } else {
      const near = nearGold + nearLegend, worth = haulValue();
      const ev = RARITY.reduce((s, r) => s + (r.odds / 100) * r.value, 0);
      const legendWon = [...haul.values()].filter((i) => i.rar === LEGEND).reduce((s, i) => s + i.n, 0);
      reportEl.innerHTML = `
        <span class="loot__label">Behind the curtain</span>
        <h3>Here’s how it played you</h3>
        <div class="loot__stats">
          <div><b>${gbp(spent)}</b><span>Spent on gems</span></div>
          <div><b>${money(worth)}</b><span>What your items are “worth”</span></div>
          <div><b>${near}</b><span>Rigged near misses</span></div>
          <div><b>${goldSeen + legendSeen}</b><span>Gold and legendary shown, ${goldWon + legendWon} won</span></div>
        </div>
        ${group('Hiding the real cost', [
          trick('Premium currency', `Every price was in gems and the wallet never showed money, so you never saw what a case really cost: about ${money(CASE)}.`),
          trick('A free first case', `The first one was free, then a pop-up pushed you to buy gems straight away${popups > 1 ? `. It came back ${plural(popups - 1, 'more time')} when you ran out` : ''}.`),
          trick('Gems left over', `None of the bundles divide by ${CASE}, so there’s always some left: close to another case, never quite there. You finished with ${num(gems)} gems.`),
          trick('Bigger bundles', `Bigger bundles give more gems per pound (100, then 140, then 150), and the £49.99 one makes £19.99 feel small. You bought ${plural(topups, 'bundle')}.`),
        ])}
        ${group('Making it feel like gambling', [
          trick('Suspense', 'The case shook and built up before every spin, then the reel took over five seconds and crawled to a stop while the ticks slowed down.'),
          trick('Near misses', `The reel stopped right next to something better ${plural(near, 'time')} on purpose: ${nearGold} Golden and ${nearLegend} Legendary.`),
          trick('A teaser reel', `${plural(goldSeen, 'Golden item')} and ${plural(legendSeen, 'Legendary item')} scrolled past you. Gold really drops 0.26% of the time, about 1 in 385, so the jackpot only looks close.`),
          trick('“Market values”', `Your items were “worth” ${num(worth)} gems, so a big pull looks like profit. You can’t sell them, and even if you could, a case gives back ${Math.round(ev)} gems of value for ${CASE} on average, about ${Math.round((ev / CASE) * 100)}%. The house keeps the rest.`),
        ])}
        ${group('Keeping you opening', [
          trick('A limited time event', `The 2× Golden Gerbert chance was real, but the timer was there to rush you. It ended and came back “by popular demand” ${plural(offer.returns, 'time')}${eventWins ? `, and you won ${plural(eventWins, 'Golden Gerbert')} during it` : ''}.`),
          trick('Fake winners', `${plural(fakeWins, 'fake player')} unboxed gold or legendary items while you played. None of them exist, but they make big prizes look common.`),
          trick('Celebrate everything', `Every pull got bright colours, a flash, and a jingle, including ${plural(commons, 'common')} worth 40 gems from a 275 gem case and ${plural(dupes, 'duplicate')}. That’s a loss dressed up as a win.`),
          trick('Collection chasing', `A bar showed ${haul.size} of ${TOTAL_ITEMS} items collected, so stopping feels like leaving it unfinished.`),
        ])}
        ${group('What it hides, and who it reaches', [
          trick('Hidden odds', `${peeked ? 'You found the drop rates behind the tiny “i”. Most people never do.' : 'The drop rates were behind a tiny “i” next to the reel. You never opened it.'} Even then, they only showed rarities, not items.`),
          trick('Hard to leave', `Opening took one click. Leaving meant finding a small grey link, then ${guilted ? 'getting' : 'you’d get'} a guilt trip saying your luck was “due”. Luck is never due: every case has the same odds.`),
          trick('No age check', 'This page never asked how old you are, and nothing warned you that you were paying for random items.'),
          trick('Pay to win', 'These items are only cosmetic. The worst version sells power, so paying more means winning more. Even cosmetic boxes are linked to problem gambling.'),
        ])}
        <div class="loot__end"><button class="btn" type="button" data-ethical>Replay in Ethical mode</button><button class="btn btn--ghost" type="button" data-restart>Start over</button><a class="loot__link" href="documents/lootboxreport.pdf">Read the full report</a></div>`;
      window.secrets?.unlock('house');
    }
    reportEl.querySelector('[data-ethical]')?.addEventListener('click', () => start(true));
    reportEl.querySelector('[data-restart]').addEventListener('click', () => start(false));
    root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function start(eth) {
    ethical = eth;
    gems = 0; free = 1; popups = 0; owned = 0; bought = 0; spent = 0; topups = 0; opened = 0; nearGold = 0; nearLegend = 0; goldSeen = 0; legendSeen = 0;
    goldWon = 0; dupes = 0; commons = 0; peeked = false; spinning = false; sinceEpic = 0; best = null; fakeWins = 0; guilted = false; eventWins = 0;
    haul = new Map();
    offer = { phase: 'live', t: 45 + Math.floor(Math.random() * 30), returns: 0 };
    feedIn = 2;
    root.classList.toggle('is-ethical', eth);
    root.classList.remove('is-celebrate');
    $('[data-machine]').hidden = false;
    reportEl.hidden = true;
    guilt.hidden = true;
    pop.hidden = true;
    age.hidden = true;
    for (const [sel, show] of [['[data-offer]', !eth], ['[data-feed]', !eth], ['[data-shop]', !eth], ['[data-buy]', eth], ['[data-pity]', eth]]) $(sel).hidden = !show;
    doneBtn.className = eth ? 'btn' : 'loot__done';
    $('[data-feed-text]').textContent = '';
    odds.innerHTML = eth
      ? `<span class="loot__label">Every item’s drop chance</span><ul>${RARITY.flatMap((r) => ITEMS[r.id].map(([n]) => `<li style="--rc:${r.col}"><span>${n}</span><small>${r.name}</small><b>${(r.odds / ITEMS[r.id].length).toFixed(2)}%</b></li>`)).join('')}</ul>`
      : `<span class="loot__label">Drop rates</span><ul>${RARITY.map((r) => `<li style="--rc:${r.col}"><span>${r.name}</span><b>${r.odds}%</b></li>`).join('')}</ul>`;
    odds.hidden = !eth;
    infoBtn.setAttribute('aria-expanded', 'false');
    qty.value = 1;
    status.textContent = eth ? `Ethical mode: buy exactly the cases you want at ${gbp(PRICE)} each.` : 'Your first case is free. Open it to see what you get.';
    fill(pick(weighted(RARITY.map((r) => r.odds))), false);
    const c = strip.children;
    strip.style.transform = `translateX(${reel.clientWidth / 2 - (4 * (c[1].offsetLeft - c[0].offsetLeft) + c[0].offsetWidth / 2)}px)`;
    renderHaul();
    hud();
  }

  function buy() {
    const n = qtyVal();
    if (!room() || ageNo) return;
    if (!ageOk) { age.hidden = false; $('[data-age-yes]').focus(); return; }
    bought += n; owned += n; spent += n * PRICE;
    status.textContent = `Bought ${plural(n, 'case')} for ${gbp(n * PRICE)}.`;
    qty.value = qtyVal();
    hud();
  }

  openBtn.addEventListener('click', spin);
  root.querySelectorAll('[data-bundle]').forEach((b) => b.addEventListener('click', () => {
    const bundle = BUNDLES[b.dataset.bundle];
    gems += bundle.gems; spent += bundle.price; topups++;
    status.textContent = `+${num(bundle.gems)} gems added.`;
    pop.hidden = true;
    hud();
  }));
  buyBtn.addEventListener('click', buy);
  $('[data-age-yes]').addEventListener('click', () => { ageOk = true; age.hidden = true; buy(); });
  $('[data-age-no]').addEventListener('click', () => {
    ageNo = true; age.hidden = true;
    status.textContent = 'No problem. Buying is off, but you can still look at every item and its odds.';
    hud();
  });
  qty.addEventListener('input', hud);
  qty.addEventListener('change', () => { qty.value = qtyVal(); hud(); });
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { qty.value = qtyVal() + Number(b.dataset.step); qty.value = qtyVal(); hud(); }));
  doneBtn.addEventListener('click', () => {
    if (spinning) return;
    if (ethical) return report();
    guilted = true;
    $('[data-guilt-text]').textContent = `Your luck is due${eventOn() ? ', and the 2× Golden Gerbert chance is still on' : ''}. ${gems >= CASE ? `You’ve still got ${num(gems)} gems to spend.` : 'One more case could be the one.'}`;
    guilt.hidden = false;
    $('[data-stay]').focus();
  });
  $('[data-pop-close]').addEventListener('click', () => { pop.hidden = true; });
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

  // debug build cheats (see assets/debug.js). Using any of them switches achievements off until you reload.
  window.cheats = Object.assign(window.cheats || {}, {
    givegems: { help: 'givegems <n>: add free gems', run: (n) => {
      if (ethical) return 'Ethical mode has no gems. Go back to the original.';
      const add = Math.max(1, Math.min(1000000, parseInt(n, 10) || 1000));
      gems += add; hud();
      return `Added ${num(add)} gems.`;
    } },
    forcedrop: { help: 'forcedrop golden: the next case lands a Golden Gerbert', run: (what = '') => {
      if (what.toLowerCase() !== 'golden') return 'Usage: forcedrop golden';
      forceGold = true;
      return 'The next case will be a Golden Gerbert.';
    } },
    showodds: { help: 'showodds: reveal the drop rates', run: () => { odds.hidden = false; infoBtn.setAttribute('aria-expanded', 'true'); return 'Drop rates revealed.'; } },
  });
  const devlog = (...d) => document.dispatchEvent(new CustomEvent('devlog', { detail: d }));

  start(false);
})();
