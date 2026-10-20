// jackslaski.com secrets: achievements, the unlock toast, and the trophy list.
// Other secrets call window.secrets.unlock('id') when they're found.
(() => {
  const KEY = 'jackslaski-secrets';
  const SEEN_KEY = 'jackslaski-seen';
  const PROJECTS = ['recoilworks', 'armsandassets', 'gerbertgames', 'leviathansgauntlet', 'wildmagic', 'feudalliving', 'doyouknowball', 'formulaandflask', 'cavegenerationtool', 'survivorslike', 'uishowcase', 'minimalistui', 'lootboxethics'];

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: progress just won't stick */ } };
  const seen = () => new Set(read(SEEN_KEY, []));
  // project pages were renamed to match their titles: carry visits over from the old page names
  const RENAMED = { lggame: 'leviathansgauntlet', wmgame: 'wildmagic', flgame: 'feudalliving', dykbgame: 'doyouknowball', formandflask: 'formulaandflask', cavegen: 'cavegenerationtool', uishow: 'uishowcase', uidiss: 'minimalistui', lootbox: 'lootboxethics' };
  write(SEEN_KEY, [...new Set(read(SEEN_KEY, []).map((p) => RENAMED[p] || p))]);

  const LIST = [
    { id: 'explorer', name: 'Explorer', done: 'You visited every project page.', hint: 'Every project has its own page. Seen them all?', progress: () => `${PROJECTS.filter((p) => seen().has(p)).length} / ${PROJECTS.length} pages` },
    { id: 'oob', name: 'Out of bounds', done: 'You fell out of the map and found the 404 page.', hint: 'Not every page exists. Try one that doesn’t.' },
    { id: 'tiles', name: 'Party starter', done: 'You beat the bot at Colour Tiles.', hint: 'One of my party games is playable on its own page. Win a round.' },
    { id: 'house', name: 'The house always wins', done: 'You opened the cases and saw how they played you.', hint: 'My loot box research comes with a case you can open. See it through to the end.' },
    { id: 'crystal', name: 'Struck gold', done: 'You found a crystal hidden in a generated cave.', hint: 'One of my tools carves caves. Keep an eye out for something shiny.' },
    { id: 'autopilot', name: 'Autopilot', done: 'You went idle and let the AI show you around.', hint: 'Like one of my games, this site has a mind of its own if you leave it alone for a while.' },
    { id: 'hood', name: 'Under the hood', done: 'You opened the development build.', hint: 'An old cheat code still works here. On a phone, try tapping the logo.' },
  ];
  const got = new Set(read(KEY, []).filter((id) => LIST.some((a) => a.id === id)));

  // the toast: queued so two unlocks at once both get seen
  const toast = document.createElement('div');
  toast.className = 'trophy';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.append(toast);
  const queue = [];
  let showing = false, rollPending = false;
  const next = () => {
    const a = queue.shift();
    if (!a) {
      showing = false;
      if (rollPending) { rollPending = false; setTimeout(rollCredits, 600); }   // the last toast has gone: roll credits
      return;
    }
    showing = true;
    toast.innerHTML = '<span class="trophy__icon" aria-hidden="true"></span><span><span class="trophy__label">Achievement unlocked</span><strong></strong><span class="trophy__text"></span></span>';
    toast.querySelector('strong').textContent = a.name;
    toast.querySelector('.trophy__text').textContent = a.done;
    toast.classList.add('is-on');
    setTimeout(() => { toast.classList.remove('is-on'); setTimeout(next, 400); }, 4200);
  };

  const devlog = (...d) => document.dispatchEvent(new CustomEvent('devlog', { detail: d }));
  function unlock(id) {
    const a = LIST.find((x) => x.id === id);
    if (!a || got.has(id)) return;
    devlog('LogSecrets', `Achievement unlocked: "${a.name}"`, 'ok');
    got.add(id);
    write(KEY, [...got]);
    render();
    if (got.size === LIST.length) rollPending = true;
    queue.push(a);
    if (!showing) next();
  }

  // the trophy list
  const sheet = document.createElement('dialog');
  sheet.className = 'trophies';
  sheet.setAttribute('aria-labelledby', 'trophies-title');
  sheet.innerHTML = `
    <div class="trophies__head">
      <div><p class="label">Achievements</p><h2 class="title" id="trophies-title">Secrets</h2></div>
      <button class="trophies__close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="trophies__bar"><span></span></div>
    <ul class="trophies__list"></ul>
    <button class="btn trophies__credits" type="button" data-credits hidden>Roll the credits</button>
    <p class="trophies__foot">Progress is saved in this browser. <button type="button" data-reset>Reset</button></p>`;
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('.trophies__close')) sheet.close();
    else if (e.target.closest('[data-credits]')) rollCredits();
  });
  sheet.querySelector('[data-reset]').addEventListener('click', () => {
    got.clear(); write(KEY, []); write(SEEN_KEY, []); render();
  });

  function render() {
    const n = got.size, total = LIST.length;
    document.querySelectorAll('[data-secrets]').forEach((b) => {
      b.hidden = false;
      if (b.dataset.secrets === 'nav') {   // icon only: the word "secrets" waits until you open it
        b.setAttribute('aria-label', `Secrets: ${n} of ${total} found`);
        b.classList.toggle('is-complete', n === total);
      } else if (b.dataset.secrets === 'hero') {
        b.innerHTML = `<span>Secrets found <b>${n} / ${total}</b></span><span class="hero__pips" aria-hidden="true">${LIST.map((a) => `<i${got.has(a.id) ? ' class="is-on"' : ''}></i>`).join('')}</span>`;
      } else b.textContent = `${n} / ${total} secrets`;
    });
    sheet.querySelector('.trophies__bar span').style.width = `${(n / total) * 100}%`;
    sheet.querySelector('[data-credits]').hidden = n !== total;
    const ul = sheet.querySelector('.trophies__list');
    ul.innerHTML = '';
    for (const a of LIST) {
      const done = got.has(a.id);
      const li = document.createElement('li');
      li.className = done ? 'is-done' : '';
      li.innerHTML = '<span class="trophies__icon" aria-hidden="true"></span><div><p class="trophies__name"></p><p class="trophies__text"></p></div><span class="trophies__meta"></span>';
      li.querySelector('.trophies__name').textContent = done ? a.name : 'Locked';
      li.querySelector('.trophies__text').textContent = done ? a.done : a.hint;
      li.querySelector('.trophies__meta').textContent = done ? 'Found' : (a.progress ? a.progress() : '');
      ul.append(li);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-secrets]')) { render(); sheet.showModal(); }
  });

  // the reward for finding everything: end credits where every role is me
  const ME = 'Jack Slaski';
  const ROLL = [   // each role is "role|note|name", and the name is me unless it says otherwise
    ['Design', 'Game Director', 'Lead Gameplay Designer', 'Systems Designer', 'Level Designer', 'UI/UX Designer'],
    ['Engineering', 'Lead Programmer', 'Tools Programmer', 'Lead Bug Creator', 'Lead Bug Fixer|Some of them.'],
    ['Art and audio', 'Art Director', 'Sound Designer|You probably had it muted.'],
    ['Production', 'Producer', 'Scrum Master', 'Every Stand-up Meeting', 'Coffee Runs'],
    ['Live ops', 'Loot Box Odds|Totally fair. Probably.', 'Crystal Placement', 'Gerbert Wrangler', `AI Takeover|Supervised by ${ME}.|The AI`, 'QA Lead|Found most of the bugs. Wrote the rest.'],
  ];
  const credits = document.createElement('dialog');
  credits.className = 'credits';
  credits.setAttribute('aria-label', 'End credits');
  credits.innerHTML = `
    <button class="credits__skip" type="button" autofocus>Skip</button>
    <div class="credits__view"><div class="credits__roll" tabindex="-1">
      <div class="credits__open">
        <p class="label">A ${ME} production</p>
        <p class="title credits__big">jackslaski.com</p>
        <p class="credits__solo"><span>Directed by</span><b>${ME}</b></p>
        <p class="credits__solo"><span>Based on an original idea by</span><b>${ME}</b></p>
      </div>
      ${ROLL.map(([head, ...rows]) => `<section><h3 class="label">${head}</h3>${rows.map((r) => {
        const [role, note, name = ME] = r.split('|');
        return `<p class="credits__row"><span>${role}</span><b>${name}${note ? `<small>${note}</small>` : ''}</b></p>`;
      }).join('')}</section>`).join('')}
      <section class="credits__thanks">
        <h3 class="label">Special thanks</h3>
        <p>${ME} would like to thank ${ME}.</p>
        <p>And you, for finding all ${LIST.length} secrets.</p>
      </section>
      <p class="credits__small">No Gerberts were harmed in the making of this website.</p>
      <div class="credits__end">
        <p class="title credits__big">Thanks for playing</p>
        <div class="credits__actions">
          <a class="btn" href="mailto:jackslaski04@gmail.com">Hire Jack?</a>
          <button class="btn btn--ghost" type="button" data-close>Back to the site</button>
        </div>
      </div>
    </div></div>`;
  document.body.append(credits);
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let anim = null;
  function rollCredits() {
    if (credits.open) return;
    sheet.close();
    credits.classList.toggle('is-still', still.matches);
    const skip = credits.querySelector('.credits__skip'), view = credits.querySelector('.credits__view');
    const roll = credits.querySelector('.credits__roll'), end = credits.querySelector('.credits__end');
    skip.hidden = still.matches;
    credits.showModal();
    devlog('LogSecrets', 'All secrets found. Rolling credits.', 'ok');
    if (still.matches) { view.scrollTop = 0; roll.focus({ preventScroll: true }); return; }   // reduced motion: a still list you scroll yourself
    // roll up at a steady 70px a second, then ease the last bit so "Thanks for playing" settles in the middle
    const h = view.clientHeight, to = h / 2 - (end.offsetTop + end.offsetHeight / 2), tail = 160;
    const steady = (h - to - tail) / 0.07, duration = steady + 2500;
    anim = roll.animate([
      { transform: `translateY(${h}px)` },
      { transform: `translateY(${to + tail}px)`, offset: steady / duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      { transform: `translateY(${to}px)` },
    ], { duration, fill: 'forwards' });
    anim.onfinish = () => { skip.hidden = true; end.querySelector('.btn').focus({ preventScroll: true }); };
  }
  credits.addEventListener('close', () => { anim?.cancel(); anim = null; });
  credits.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) credits.close();
    else if (e.target.closest('.credits__skip')) anim?.finish();
  });

  // Explorer: every project page you open is remembered
  const slug = document.body.dataset.project;
  if (slug) {
    const s = seen(); s.add(slug); write(SEEN_KEY, [...s]);
    if (PROJECTS.every((p) => s.has(p))) unlock('explorer');
  }
  // Out of bounds: landing on the 404 page
  if (document.body.dataset.page === '404') setTimeout(() => unlock('oob'), 900);

  render();
  window.secrets = {
    unlock,
    has: (id) => got.has(id),
    list: () => LIST.map((a) => ({ name: a.name, done: a.done, hint: a.hint, found: got.has(a.id) })),
    credits: () => got.size === LIST.length && (rollCredits(), true),   // only once you've earned them
  };
})();
