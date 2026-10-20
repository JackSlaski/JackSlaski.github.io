// Debug build: the Konami code (or five quick taps on the JS logo on a phone) flips the site into an
// Unreal-style development build, with a live stat overlay and an Output Log console that takes commands.
// Games add their own cheats to window.cheats.
(() => {
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const PROJECTS = ['recoilworks', 'armsandassets', 'gerbertgames', 'leviathansgauntlet', 'wildmagic', 'feudalliving', 'doyouknowball', 'formulaandflask', 'cavegenerationtool', 'survivorslike', 'uishowcase', 'minimalistui', 'lootboxethics'];
  const KEY = 'jackslaski-debug';
  const store = (v) => { try { return v === undefined ? sessionStorage.getItem(KEY) : v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { return null; } };

  // everything logged since the page loaded, so the Output Log has history when it opens
  const history = [];
  let on = false, ui = null, list = null, input = null, stat = null, mode = null, raf = 0;
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
  const words = (el) => (el.children.length ? [...el.children].map((c) => c.textContent).join(' ') : el.textContent);   // "Jack Slaski", not "JackSlaski"
  document.querySelectorAll('main section').forEach((s) => {
    const h = s.querySelector('.section__title, h1, h2');
    names.set(s, ((h && words(h)) || s.getAttribute('aria-label') || s.id || 'section').trim().replace(/\s+/g, ' '));
  });
  const seenIO = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && log('LogNav', `Entered section "${names.get(e.target)}"`)), { threshold: 0.5 });
  names.forEach((_, s) => seenIO.observe(s));

  // ---- silly extras ----
  const THEMES = { orange: '#ff5a36', blue: '#3d8bff', green: '#36d27a', purple: '#9b5cff', pink: '#ff4fa3', gold: '#e4ae39' };
  const paint = (c) => {
    document.documentElement.style.setProperty('--accent', c);
    document.documentElement.style.setProperty('--accent-soft', `color-mix(in srgb, ${c} 14%, transparent)`);
  };
  try { const saved = sessionStorage.getItem('jackslaski-theme'); if (saved) paint(saved); } catch { /* private mode */ }
  // gibberish swaps every letter on the page for a random one, and remembers the real text so it can swap back
  const real = new Map();
  function gibberish() {
    if (real.size) { real.forEach((t, node) => { node.nodeValue = t; }); real.clear(); return false; }
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest('script, style, .dbg-console, .dbg-mark') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const abc = 'abcdefghijklmnopqrstuvwxyz';
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      real.set(n, n.nodeValue);
      n.nodeValue = n.nodeValue.replace(/[a-z]/gi, (ch) => {
        const r = abc[Math.floor(Math.random() * 26)];
        return ch === ch.toUpperCase() ? r.toUpperCase() : r;
      });
    }
    return true;
  }

  // ---- the commands ----
  const sections = () => [...names.entries()];
  const COMMANDS = {
    help: ['List every command', () => {
      const page = Object.entries(window.cheats || {});
      log('', 'Commands:', 'ok');
      for (const [k, [h]] of Object.entries(COMMANDS)) log('', `  ${k.padEnd(14)}${h}`);
      if (page.length) {
        log('', 'Cheats on this page:', 'w');
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
    teleport: ['teleport <section>: jump to a section on this page', (where = '') => {
      where = where.toLowerCase();
      const hit = sections().find(([s, n]) => s.id === where || n.toLowerCase().includes(where) || (where === 'top' && s.matches('.hero, .phero')));
      if (!where || !hit) return [`Sections here: ${sections().map(([s, n]) => s.id || n.toLowerCase()).join(', ')}`, 'w'];
      hit[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return `Teleported to "${hit[1]}"`;
    }],
    open: ['open <page>: go to the home page or a project page', (p = '') => {
      p = p.toLowerCase().replace('.html', '');
      if (p === 'home') { location.href = '/'; return 'Loading home…'; }
      if (!PROJECTS.includes(p)) return [`Pages: home, ${PROJECTS.join(', ')}`, 'w'];
      location.href = `/${p}.html`;
      return `Loading ${p}…`;
    }],
    god: ['Toggle god mode', () => 'God mode on. You were already invincible, it’s a website.'],
    noclip: ['Walk through walls', () => {
      if (document.body.dataset.page === '404') return 'You’re already out of bounds.';
      document.documentElement.classList.add('is-noclip');   // the whole page drops away
      setTimeout(() => { location.href = '/404.html'; }, 900);
      return 'Noclip on. Whoops, wrong way…';
    }],
    ai: ['ai takeover starts the AFK tour, ai off stops it starting, ai on brings it back', (what = '') => {
      what = what.toLowerCase();
      if (what === 'off' || what === 'on') {
        try { localStorage.setItem('jackslaski-afk', what); } catch { /* private mode */ }
        return what === 'off' ? 'AI takeover is off. It won’t start when you go idle.' : 'AI takeover is back on.';
      }
      if (what !== 'takeover') return ['Usage: ai takeover | ai off | ai on', 'w'];
      if (!window.afk) { location.href = '/?takeover'; return 'The AI lives on the home page. Taking you there…'; }
      toggleConsole(false);
      setTimeout(() => window.afk.start(), 2500);
      return 'AI takeover in a couple of seconds. Hands off the mouse.';
    }],
    unlockall: ['Unlock every achievement', () => ['Nice try. It’s not going to be that easy.', 'w']],
    theme: ['theme <colour>: recolour the site', (name = '') => {
      const c = THEMES[name.toLowerCase()];
      if (!c) return [`Themes: ${Object.keys(THEMES).join(', ')}`, 'w'];
      paint(c);
      try { name.toLowerCase() === 'orange' ? sessionStorage.removeItem('jackslaski-theme') : sessionStorage.setItem('jackslaski-theme', c); } catch { /* private mode */ }
      return `Theme set to ${name.toLowerCase()}.`;
    }],
    gibberish: ['Turn every word on the page into nonsense (run again to undo)', () => (gibberish() ? 'Ghbbersh ennbled.' : 'Back to English.')],
    bighead: ['Big head mode', () => (document.documentElement.classList.toggle('is-bighead') ? 'Big head mode on.' : 'Big head mode off.')],
    australia: ['View the site from Australia', () => (document.documentElement.classList.toggle('is-australia') ? 'G’day.' : 'Back to the right way up.')],
    comicsans: ['Use the most professional font there is', () => (document.documentElement.classList.toggle('is-comic') ? 'Much more professional.' : 'Fine, back to normal.')],
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
  const ARGS = {
    stat: () => ['fps', 'unit', 'secrets', 'none'],
    show: () => ['bounds'],
    teleport: () => sections().map(([s, n]) => s.id || n.toLowerCase()),
    open: () => ['home', ...PROJECTS],
    hire: () => ['jack'],
    ai: () => ['takeover', 'off', 'on'],
    theme: () => Object.keys(THEMES),
  };

  // suggestions as you type, like Minecraft and Unreal: commands first, then what they take. Tab completes.
  function suggest(text) {
    const parts = text.trimStart().split(/\s+/), cheats = window.cheats || {};
    if (parts.length < 2) {
      const start = parts[0].toLowerCase();
      if (!start) return [];
      return [...Object.entries(COMMANDS).map(([k, [h]]) => [k, h, false]), ...Object.entries(cheats).map(([k, c]) => [k, c.help, true])]
        .filter(([k]) => k.startsWith(start)).map(([k, help, cheat]) => ({ fill: `${k} `, label: k, help, cheat }));
    }
    const name = parts[0].toLowerCase(), arg = (parts[1] || '').toLowerCase();
    const options = ARGS[name]?.() || cheats[name]?.args || [];
    return options.filter((o) => o.startsWith(arg) && o !== arg).map((o) => ({ fill: `${parts[0]} ${o}`, label: `${parts[0]} ${o}`, help: '', cheat: !!cheats[name] }));
  }

  function run(line) {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    log('', `> ${line}`, 'cmd');
    const key = name.toLowerCase(), cheat = (window.cheats || {})[key];
    let res;
    if (COMMANDS[key]) res = COMMANDS[key][1](...args);
    else if (cheat) res = cheat.run(...args);
    else res = [`Command not recognized: ${name}. Type help for a list.`, 'e'];
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
        <ul class="dbg-suggest" hidden></ul>
        <form class="dbg-input"><label for="dbg-cmd">Cmd</label><input id="dbg-cmd" autocomplete="off" spellcheck="false" placeholder="Type a command, or help. Tab completes."></form>
      </section>`;
    document.body.append(ui);
    list = ui.querySelector('.dbg-log');
    input = ui.querySelector('input');
    const box = ui.querySelector('.dbg-suggest');
    let picks = [], at = 0;
    const show = () => {
      picks = suggest(input.value);
      at = Math.min(at, Math.max(0, picks.length - 1));
      box.hidden = !picks.length;
      box.innerHTML = '';
      picks.slice(0, 8).forEach((p, i) => {
        const li = document.createElement('li');
        li.className = (i === at ? 'is-on' : '') + (p.cheat ? ' is-cheat' : '');
        const b = document.createElement('b'), h = document.createElement('span');
        b.textContent = p.label; h.textContent = p.help;
        li.append(b, h);
        if (i === at) { const k = document.createElement('kbd'); k.textContent = 'Tab'; li.append(k); }
        li.addEventListener('mousedown', (e) => { e.preventDefault(); input.value = p.fill; at = 0; show(); input.focus(); });
        box.append(li);
      });
    };
    input.addEventListener('input', () => { at = 0; show(); });
    stat = ui.querySelector('.dbg-stat');
    history.splice(0).forEach(([c, m, k]) => log(c, m, k));   // replay what happened before it opened
    ui.querySelector('[data-console]').addEventListener('click', () => toggleConsole());
    ui.querySelector('[data-close]').addEventListener('click', () => toggleConsole(false));
    ui.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const line = input.value;
      if (line.trim()) { typed.unshift(line); cmdAt = -1; }
      box.hidden = true;
      input.value = '';
      run(line);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === '`') { e.preventDefault(); toggleConsole(false); }
      else if (e.key === 'Tab' && picks.length) {   // fill in the highlighted suggestion
        e.preventDefault();
        input.value = picks[at].fill;
        at = 0;
        show();
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !box.hidden) {   // move through the suggestions
        e.preventDefault();
        const n = Math.min(picks.length, 8);
        at = (at + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        show();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {   // command history, like Unreal's console
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
    document.documentElement.classList.remove('is-debug', 'is-console', 'is-bounds', 'is-bighead', 'is-australia', 'is-comic');
    if (real.size) gibberish();
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

  // DevTools: a hello for anyone who opens the browser's own console, and a few commands for them
  const EMAIL = 'jackslaski04@gmail.com';
  window.jack = {
    help() {
      console.log([
        'jack.cv()        Open my CV',
        'jack.contact()   Copy my email address',
        'jack.secrets()   See which secrets you’ve found, with hints for the rest',
        'jack.debug()     Switch on the development build',
        '',
        'There’s a cheat code for that last one too. You might already know it.',
      ].join('\n'));
    },
    cv() { window.open('/documents/cvjackslaski.pdf', '_blank'); },
    contact() {   // the clipboard refuses while DevTools has focus, so fall back to printing it
      Promise.resolve().then(() => navigator.clipboard.writeText(EMAIL))
        .then(() => console.log(`Copied ${EMAIL} to your clipboard.`), () => console.log(`Email me at ${EMAIL}`));
    },
    secrets() {
      console.table((window.secrets?.list?.() || []).map((a) => ({ Secret: a.found ? a.name : 'Locked', Status: a.found ? 'Found' : a.hint })));
    },
    debug() { if (on) toggleConsole(true); else enable(true); },
  };
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff5a36';
  console.log('%cJack Slaski%c\nPoking around under the hood? Type jack.help() to see what you can do from here.',
    `font: 700 22px/1.6 system-ui, sans-serif; color: ${accent}`, 'font: 13px/1.5 system-ui, sans-serif');

  if (store()) enable(false);   // stays on as you move between pages, until you quit
})();
