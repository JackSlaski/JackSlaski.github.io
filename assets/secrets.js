// jackslaski.com secrets: achievements, the unlock toast, and the trophy list.
// Other secrets call window.secrets.unlock('id') when they're found.
(() => {
  const KEY = 'jackslaski-secrets';
  const SEEN_KEY = 'jackslaski-seen';
  const PROJECTS = ['recoilworks', 'armsandassets', 'gerbertgames', 'lggame', 'wmgame', 'flgame', 'dykbgame', 'formandflask', 'cavegen', 'survivorslike', 'uishow', 'uidiss', 'lootbox'];

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: progress just won't stick */ } };
  const seen = () => new Set(read(SEEN_KEY, []));

  const LIST = [
    { id: 'explorer', name: 'Explorer', done: 'You visited every project page.', hint: 'Every project has its own page. Seen them all?', progress: () => `${PROJECTS.filter((p) => seen().has(p)).length} / ${PROJECTS.length} pages` },
    { id: 'oob', name: 'Out of bounds', done: 'You fell out of the map and found the 404 page.', hint: 'Not every page exists. Try one that doesn’t.' },
    { id: 'tiles', name: 'Party starter', done: 'You beat the bot at Colour Tiles.', hint: 'One of my party games is playable on its own page. Win a round.' },
  ];
  const got = new Set(read(KEY, []).filter((id) => LIST.some((a) => a.id === id)));

  // the toast: queued so two unlocks at once both get seen
  const toast = document.createElement('div');
  toast.className = 'trophy';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.append(toast);
  const queue = [];
  let showing = false;
  const next = () => {
    const a = queue.shift();
    if (!a) { showing = false; return; }
    showing = true;
    toast.innerHTML = '<span class="trophy__icon" aria-hidden="true"></span><span><span class="trophy__label">Achievement unlocked</span><strong></strong><span class="trophy__text"></span></span>';
    toast.querySelector('strong').textContent = a.name;
    toast.querySelector('.trophy__text').textContent = a.done;
    toast.classList.add('is-on');
    setTimeout(() => { toast.classList.remove('is-on'); setTimeout(next, 400); }, 4200);
  };

  function unlock(id) {
    const a = LIST.find((x) => x.id === id);
    if (!a || got.has(id)) return;
    got.add(id);
    write(KEY, [...got]);
    render();
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
    <p class="trophies__foot">Progress is saved in this browser. <button type="button" data-reset>Reset</button></p>`;
  document.body.append(sheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('.trophies__close')) sheet.close(); });
  sheet.querySelector('[data-reset]').addEventListener('click', () => {
    got.clear(); write(KEY, []); write(SEEN_KEY, []); render();
  });

  function render() {
    const n = got.size, total = LIST.length;
    document.querySelectorAll('[data-secrets]').forEach((b) => {
      b.hidden = false;
      b.textContent = `${n} / ${total} secrets`;
    });
    sheet.querySelector('.trophies__bar span').style.width = `${(n / total) * 100}%`;
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

  // Explorer: every project page you open is remembered
  const slug = document.body.dataset.project;
  if (slug) {
    const s = seen(); s.add(slug); write(SEEN_KEY, [...s]);
    if (PROJECTS.every((p) => s.has(p))) unlock('explorer');
  }
  // Out of bounds: landing on the 404 page
  if (document.body.dataset.page === '404') setTimeout(() => unlock('oob'), 900);

  render();
  window.secrets = { unlock, has: (id) => got.has(id) };
})();
