// Debug build: the Konami code (or five quick taps on the JS logo on a phone) flips the site into an
// Unreal-style development build, with a live stat overlay and an Output Log console that takes commands.
// Games add their own cheats to window.cheats. Using a cheat switches achievements off until you reload.
(() => {
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const PROJECTS = ['recoilworks', 'armsandassets', 'gerbertgames', 'lggame', 'wmgame', 'flgame', 'dykbgame', 'formandflask', 'cavegen', 'survivorslike', 'uishow', 'uidiss', 'lootbox'];
  const KEY = 'jackslaski-debug';
  const store = (v) => { try { return v === undefined ? sessionStorage.getItem(KEY) : v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { return null; } };

  // everything logged since the page loaded, so the Output Log has history when it opens
  const history = [];
  let on = false, ui = null, list = null, input = null, stat = null, mode = null, raf = 0, slomo = 1, slomoTimer = 0, cheated = false;
  const typed = [], konami = [];   // command history, and the last keys pressed for the Konami code
  let cmdAt = -1;

  function log(cat, msg, kind = '') {
    history.push([cat, msg, kind]);
    if (!list) return;
    const li = document.createElement('li');
    li.className = kind;
    const c = document.createElement('span');
    c.textContent = cat ? `${cat}: ` : '';
    li.append(c, msg);
    list.append(li);
    list.scrollTop = list.scrollHeight;
  }
  document.addEventListener('devlog', (e) => log(...e.detail));
  log('LogInit', `Loaded "${document.title}"`);

  // section changes, for a bit of life in the log
  const names = new Map();
  document.querySelectorAll('main section').forEach((s) => names.set(s, (s.querySelector('.section__title, h1, h2')?.innerText || s.getAttribute('aria-label') || s.id || 'section').trim().replace(/\s+/g, ' ')));
  const seenIO = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && log('LogNav', `Entered section "${names.get(e.target)}"`)), { threshold: 0.5 });
  names.forEach((_, s) => seenIO.observe(s));

  // ---- the commands ----
  const sections = () => [...names.entries()];
  const COMMANDS = {
    help: ['List every command', () => {
      const page = Object.entries(window.cheats || {});
      log('', 'Commands:', 'ok');
      for (const [k, [h]] of Object.entries(COMMANDS)) log('', `  ${k.padEnd(14)}${h}`);
      if (page.length) {
        log('', 'Cheats on this page (these switch achievements off until you reload):', 'w');
        for (const [k, c] of page) log('', `  ${k.padEnd(14)}${c.help}`);
      }
      return null;
    }],
    clear: ['Clear the log', () => { list.innerHTML = ''; return null; }],
    stat: ['stat fps, stat unit, stat secrets, stat none', (what = '') => {
      what = what.toLowerCase();
      if (what === 'secrets') {
        const all = window.secrets?.list?.() || [];
        log('LogSecrets', `${all.filter((a) => a.found).length} of ${all.length} found`, 'ok');
        all.forEach((a) => log('', `  ${a.found ? '[x]' : '[ ]'} ${a.found ? a.name : 'Locked'}: ${a.found ? a.done : a.hint}`));
        return null;
      }
      if (!['fps', 'unit', 'none'].includes(what)) return ['Usage: stat fps | stat unit | stat secrets | stat none', 'w'];
      mode = what === 'none' || mode === what ? null : what;
      stat.hidden = !mode;
      cancelAnimationFrame(raf);
      if (mode) measure();
      return mode ? `stat ${mode} on` : 'stats off';
    }],
    show: ['show bounds: outline every element', (what = '') => {
      if (what.toLowerCase() !== 'bounds') return ['Usage: show bounds', 'w'];
      const b = document.documentElement.classList.toggle('is-bounds');
      return `bounds ${b ? 'on' : 'off'}`;
    }],
    slomo: ['slomo 0.5 slows every animation, slomo 2 speeds them up', (n) => {
      const v = parseFloat(n);
      if (!(v >= 0.1 && v <= 4)) return ['Usage: slomo <0.1 to 4>', 'w'];
      slomo = v;
      clearInterval(slomoTimer);
      const apply = () => document.getAnimations().forEach((a) => { a.playbackRate = slomo; });
      apply();
      if (slomo !== 1) slomoTimer = setInterval(apply, 300);   // catch animations that start later
      return `Time dilation set to ${v}`;
    }],
    teleport: ['teleport <section>: jump to a section on this page', (where = '') => {
      where = where.toLowerCase();
      const hit = sections().find(([s, n]) => s.id === where || n.toLowerCase().includes(where) || (where === 'top' && s.matches('.hero, .phero')));
      if (!where || !hit) return [`Sections here: ${sections().map(([s, n]) => s.id || n.toLowerCase()).join(', ')}`, 'w'];
      hit[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return `Teleported to "${hit[1]}"`;
    }],
    open: ['open <project>: go to a project page', (p = '') => {
      p = p.toLowerCase().replace('.html', '');
      if (!PROJECTS.includes(p)) return [`Projects: ${PROJECTS.join(', ')}`, 'w'];
      location.href = `/${p}.html`;
      return `Loading ${p}…`;
    }],
    god: ['Toggle god mode', () => 'God mode on. You were already invincible, it’s a website.'],
    noclip: ['Walk through walls', () => 'You can walk through walls now. Try a page that doesn’t exist.'],
    hire: ['hire jack', (who = '') => {
      if (who.toLowerCase() !== 'jack') return ['Hire who? Try: hire jack', 'w'];
      const email = document.querySelector('#contact');
      if (email) email.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else location.href = '/#contact';
      return ['Good choice.', 'ok'];
    }],
    quit: ['Leave the development build', () => { disable(); return null; }],
  };
  COMMANDS.exit = ['Same as quit', COMMANDS.quit[1]];

  function run(line) {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    log('', `> ${line}`, 'cmd');
    const key = name.toLowerCase(), cheat = (window.cheats || {})[key];
    let res;
    if (COMMANDS[key]) res = COMMANDS[key][1](...args);
    else if (cheat) {
      if (!cheated) {
        cheated = true;
        window.secrets?.cheat?.();
        log('LogCheat', 'Cheats enabled. Achievements are switched off until you reload.', 'w');
      }
      res = cheat.run(...args);
    } else res = [`Command not recognized: ${name}. Type help for a list.`, 'e'];
    if (res) { const [m, k] = Array.isArray(res) ? res : [res, '']; log('Cmd', m, k); }
  }

  // ---- stat fps / stat unit: measured from real frames ----
  function measure() {
    let frames = 0, last = performance.now(), t0 = last, worst = 0;
    const tick = (now) => {
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - t0 >= 500) {
        const ms = (now - t0) / frames, fps = 1000 / ms;
        stat.textContent = mode === 'fps'
          ? `${fps.toFixed(2)} FPS\n${ms.toFixed(2)} ms`
          : `Frame: ${ms.toFixed(2)} ms\nWorst: ${worst.toFixed(2)} ms\nElements: ${document.getElementsByTagName('*').length}\nScroll: ${Math.round(scrollY)} px\nSecrets: ${(window.secrets?.list?.() || []).filter((a) => a.found).length}/${(window.secrets?.list?.() || []).length}`;
        stat.classList.toggle('is-slow', fps < 50);
        frames = 0; t0 = now; worst = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // ---- turning it on and off ----
  function build() {
    ui = document.createElement('div');
    ui.innerHTML = `
      <div class="dbg-mark"><span>Development build</span><button type="button" data-console>Console <kbd>\`</kbd></button></div>
      <pre class="dbg-stat" hidden></pre>
      <section class="dbg-console" aria-label="Output Log" hidden>
        <div class="dbg-console__head"><b>Output Log</b><button type="button" data-close aria-label="Close the console">✕</button></div>
        <ul class="dbg-log" aria-live="polite"></ul>
        <form class="dbg-input"><label for="dbg-cmd">Cmd</label><input id="dbg-cmd" autocomplete="off" spellcheck="false" placeholder="Type help"></form>
      </section>`;
    document.body.append(ui);
    list = ui.querySelector('.dbg-log');
    input = ui.querySelector('input');
    stat = ui.querySelector('.dbg-stat');
    history.splice(0).forEach(([c, m, k]) => log(c, m, k));   // replay what happened before it opened
    ui.querySelector('[data-console]').addEventListener('click', () => toggleConsole());
    ui.querySelector('[data-close]').addEventListener('click', () => toggleConsole(false));
    ui.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const line = input.value;
      if (line.trim()) { typed.unshift(line); cmdAt = -1; }
      input.value = '';
      run(line);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === '`') { e.preventDefault(); toggleConsole(false); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {   // command history, like Unreal's console
        e.preventDefault();
        cmdAt = Math.max(-1, Math.min(typed.length - 1, cmdAt + (e.key === 'ArrowUp' ? 1 : -1)));
        input.value = cmdAt < 0 ? '' : typed[cmdAt];
      }
      e.stopPropagation();
    });
  }

  function toggleConsole(open) {
    const c = ui.querySelector('.dbg-console');
    open = open ?? c.hidden;
    c.hidden = !open;
    document.documentElement.classList.toggle('is-console', open);
    if (open) input.focus({ preventScroll: true });
  }

  function enable(first) {
    if (on) return;
    on = true;
    store(true);
    if (!ui) build();
    ui.hidden = false;
    document.documentElement.classList.add('is-debug');
    if (first) {
      log('LogInit', 'Development build enabled. Type help for commands, or press ` to hide the console.', 'ok');
      toggleConsole(true);
      window.secrets?.unlock('hood');
    }
  }

  function disable() {
    on = false;
    store(false);
    mode = null;
    cancelAnimationFrame(raf);
    clearInterval(slomoTimer);
    if (slomo !== 1) { slomo = 1; document.getAnimations().forEach((a) => { a.playbackRate = 1; }); }
    document.documentElement.classList.remove('is-debug', 'is-console', 'is-bounds');
    if (ui) { ui.hidden = true; stat.hidden = true; ui.querySelector('.dbg-console').hidden = true; }
  }

  // the Konami code, anywhere except while typing in a field
  addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if (on && e.key === '`' && !typing) { e.preventDefault(); toggleConsole(); return; }
    if (on && e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      if (!ui.querySelector('.dbg-console').hidden) toggleConsole(false); else disable();
      return;
    }
    if (typing) return;
    konami.push(e.key.toLowerCase());
    if (konami.length > KONAMI.length) konami.shift();
    if (konami.join() === KONAMI.join()) { e.preventDefault(); konami.length = 0; on ? disable() : enable(true); }   // don't type the "a" into the console
  });

  // phones: five quick taps on the JS logo. A single tap still goes home, just a moment later.
  let pointer = 'mouse', taps = 0, tapTimer = 0;
  addEventListener('pointerdown', (e) => { pointer = e.pointerType; }, { capture: true, passive: true });
  document.querySelectorAll('.brand__mark').forEach((mark) => mark.addEventListener('click', (e) => {
    if (pointer !== 'touch') return;
    e.preventDefault();
    const href = mark.closest('a')?.href;
    clearTimeout(tapTimer);
    if (++taps >= 5) { taps = 0; on ? disable() : enable(true); return; }
    tapTimer = setTimeout(() => { if (taps === 1 && href) location.href = href; taps = 0; }, 700);
  }));

  if (store()) enable(false);   // stays on as you move between pages, until you quit
})();
