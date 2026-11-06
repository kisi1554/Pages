'use strict';
/* おうち（プラウド横浜桜木町）と とべ ようちえん（にしく ごしょやまちょう）の なか。
   おうた「ちょうちょう」は 1881ねんの しょうか（のむら あきたり さくし）で、ちょさくけんが きれた もの。 */
(function () {
  const KEY = 'minatomirai-bouken-yochien-v1';
  let Y = { stickers: 0, last: '', pics: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') Y = Object.assign(Y, s); } catch (e) { /* つかえない */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(Y)); } catch (e) { /* いっぱい など */ } };
  let root, api;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const btn = (label, cls, fn) => { const b = el('button', cls || 'sbig', label); b.addEventListener('click', fn); return b; };
  const sfx = (n) => api && api.sfx && api.sfx(n);
  function clear(title, sub, cls) {
    root.innerHTML = ''; root.className = 'sroom ' + (cls || '');
    root.appendChild(el('div', 'shead', `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`)); root.scrollTop = 0;
  }
  function say(face, text) { root.appendChild(el('div', 'kteach', `<span class="kface">${face}</span><span class="ksay">${text}</span>`)); }

  // ================= おうち =================
  function home() {
    clear('🏠 あおちゃんの おうち', 'プラウド よこはま さくらぎちょう（にしく はなさきちょう）', 'home');
    root.appendChild(el('div', 'room', '<span>🪟</span><span>🛋️</span><span>📺</span><span>🧸</span><span>🪴</span>'));
    say('👩', 'ママ「おかえり、あおちゃん！ ようちえんバスは すぐ ちかくの いわかめどおり から でるよ 🚌」');
    const items = api.wallet.items(), TOYS = (window.Shops && window.Shops.TOYS) || [];
    const mine = items.map((id) => TOYS.find((t) => t.id === id)).filter(Boolean);
    root.appendChild(el('div', 'tlabel', `🧸 あおちゃんの おもちゃ（${mine.length}こ）`));
    const g = el('div', 'igrid');
    mine.forEach((t) => g.appendChild(el('div', 'icard', `${window.Shops.toySvg(t, 100)}<span>${t.name}</span>`)));
    if (!mine.length) g.appendChild(el('div', 'wempty', 'まだ ないよ。マークイズの トイザらスで かえるよ 🧸'));
    root.appendChild(g);
    if (mine.some((t) => !t.acc)) root.appendChild(btn('🚂 プラレールで あそぶ', 'sbig', () => playTrains(mine)));
    const cups = window.Odekake ? window.Odekake.cups() : [];
    if (cups.length) { root.appendChild(el('div', 'tlabel', `🍜 マイカップヌードル（${cups.length}こ）`)); root.appendChild(window.Odekake.cupGrid()); }
    root.appendChild(btn('📅 カレンダーを みる', 'sbig sub', calendar));
    if (api.errand) root.appendChild(el('div', 'memo2', '📝 おつかい ちゅう： ' + api.errand.list.length + 'こ の うち ' + api.errand.got.length + 'こ かった'));
    else root.appendChild(btn('📝 ママから おつかいを たのまれる', 'sbig', () => api.onClose({ errand: true })));
    root.appendChild(btn(api.night ? '🛏️ ねる（あさに なる）' : '🛏️ おひるね する', 'sbig sub', nap));
    root.appendChild(btn('🚪 そとへ でる', 'sout', () => api.onClose()));
  }
  function playTrains(mine) {
    clear('🚂 プラレールで あそぼう', 'あおちゃんの へや', 'home');
    const trains = mine.filter((t) => !t.acc), acc = mine.filter((t) => t.acc).map((t) => t.acc).join(' ');
    const svg = `<svg viewBox="0 0 340 220" width="100%"><rect width="340" height="220" rx="16" fill="#fff4e6"/>
      <path id="htrk" d="M50 110 a120 80 0 1 0 240 0 a120 80 0 1 0 -240 0" fill="none" stroke="#1971c2" stroke-width="14"/>
      <path d="M50 110 a120 80 0 1 0 240 0 a120 80 0 1 0 -240 0" fill="none" stroke="#74c0fc" stroke-width="4" stroke-dasharray="6 6"/>
      <text x="170" y="120" font-size="30" text-anchor="middle">${acc || '🧢'}</text>
      ${trains.map((t, i) => `<g><g transform="translate(-24,-18) scale(0.4)">${window.Shops.toySvg(t, 120).replace(/<\/?svg[^>]*>/g, '')}</g>
        <animateMotion dur="7s" begin="-${(i * 7 / trains.length).toFixed(2)}s" repeatCount="indefinite" rotate="auto"><mpath href="#htrk"/></animateMotion></g>`).join('')}</svg>`;
    root.appendChild(el('div', 'stage', svg));
    root.appendChild(el('p', 'desc', 'ガタン ゴトン… ぜんぶの でんしゃが はしってる！'));
    sfx('door');
    root.appendChild(btn('← へやに もどる', 'sout', home));
  }
  function nap() {
    clear('💤 おひるね', '', 'home');
    root.appendChild(el('div', 'nap', '🛏️😴<div class="zzz">💤</div>'));
    root.appendChild(el('p', 'desc', api.night ? 'おやすみなさい… 🌙' : 'すやすや…'));
    setTimeout(() => {
      root.querySelector('.desc').textContent = api.night ? 'おはよう！ あさに なったよ ☀️' : 'ふあ〜。げんき まんたん！';
      sfx('star');
      root.appendChild(btn('🚪 そとへ でる', 'sbig', () => api.onClose({ rest: true, sleep: !!api.night })));
      root.appendChild(btn('← へやに もどる', 'sout', home));
    }, 2200);
  }

  // ================= ようちえん =================
  function yochien() {
    clear('🌷 とべ ようちえん', 'よこはまし にしく ごしょやまちょう', 'yochi');
    const today = new Date().toDateString();
    let got = false;
    if (Y.last !== today) { Y.last = today; Y.stickers++; store(); got = true; }
    say('👩‍🏫', got ? 'せんせい「あおちゃん、おはよう！ きょうの シール どうぞ 🌟」' : 'せんせい「あおちゃん、きょうも あそぼうね！」');
    root.appendChild(el('div', 'stickers', `<b>シール ちょう</b><span>${'🌟'.repeat(Math.min(Y.stickers, 30))}${Y.stickers > 30 ? '…' : ''}</span><small>${Y.stickers}まい</small>`));
    const g = el('div', 'agrid');
    [['🎨', 'おえかき', draw], ['🎵', 'おうた', song], ['🍱', 'おべんとう', bento]].forEach(([e, n, f]) => {
      const b = el('button', 'act', `<i>${e}</i><b>${n}</b>`); b.addEventListener('click', f); g.appendChild(b);
    });
    root.appendChild(g);
    if (Y.pics.length) {
      root.appendChild(el('div', 'tlabel', '🖼️ かざってある あおちゃんの え'));
      const gl = el('div', 'gallery'); Y.pics.forEach((src) => { const im = el('img'); im.src = src; gl.appendChild(im); }); root.appendChild(gl);
    }
    root.appendChild(btn('🛝 おにわで すべりだい', 'sbig sub', () => api.onClose({ slide: true })));
    root.appendChild(btn('🌸 かえりの さくらごうに のる（いわかめどおり まで）', 'sbig tall', () => api.onClose({ bus: -1 })));
    root.appendChild(btn('🚶 そとに でる', 'sout', () => api.onClose()));
  }
  function draw() {
    clear('🎨 おえかき', 'ゆびで かいてね', 'yochi');
    const cv = el('canvas', 'paint'); cv.width = 600; cv.height = 420; root.appendChild(cv);
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 420); x.lineCap = x.lineJoin = 'round';
    let col = '#1c2b4a', size = 10, down = false, lx = 0, ly = 0;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 420 / r.height]; };
    cv.addEventListener('pointerdown', (e) => { down = true; [lx, ly] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* むし */ } x.fillStyle = col; x.beginPath(); x.arc(lx, ly, size / 2, 0, 7); x.fill(); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => { if (!down) return; const [nx, ny] = pos(e); x.strokeStyle = col; x.lineWidth = size; x.beginPath(); x.moveTo(lx, ly); x.lineTo(nx, ny); x.stroke(); lx = nx; ly = ny; });
    ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, () => { down = false; }));
    const pal = el('div', 'pal');
    ['#1c2b4a', '#e03131', '#f08c00', '#ffd43b', '#2f9e44', '#1c7ed6', '#9c36b5', '#f783ac', '#8d6e3f'].forEach((c) => {
      const b = el('button', 'pc'); b.style.background = c; b.addEventListener('click', () => { col = c; size = 10; pal.querySelectorAll('.pc').forEach((q) => q.classList.remove('on')); b.classList.add('on'); }); pal.appendChild(b);
    });
    const er = el('button', 'pc er', '🧽'); er.addEventListener('click', () => { col = '#ffffff'; size = 34; }); pal.appendChild(er);
    pal.firstChild.classList.add('on'); root.appendChild(pal);
    const row = el('div', 'brow');
    row.appendChild(btn('🗑️ ぜんぶ けす', 'sbig sub', () => { x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 420); }));
    row.appendChild(btn('💮 せんせいに みせる', 'sbig', () => {
      const s2 = document.createElement('canvas'); s2.width = 150; s2.height = 105; s2.getContext('2d').drawImage(cv, 0, 0, 150, 105);
      Y.pics.unshift(s2.toDataURL('image/jpeg', 0.7)); Y.pics = Y.pics.slice(0, 6); store(); sfx('star');
      clear('💮 じょうずだね！', '', 'yochi'); say('👩‍🏫', 'せんせい「すてきな え！ きょうしつに かざって おくね」');
      const im = el('img', 'bigpic'); im.src = cv.toDataURL('image/jpeg', 0.8); root.appendChild(im);
      root.appendChild(btn('← もどる', 'sbig', yochien));
    }));
    root.appendChild(row);
    root.appendChild(btn('← もどる', 'sout', yochien));
  }
  // ちょうちょう（ドイツ みんよう／のむら あきたり さくし、1881ねん）
  const SONG = [
    ['ちょうちょう ちょうちょう なのはに とまれ', 'G4 1,E4 1,E4 2,F4 1,D4 1,D4 2,C4 1,D4 1,E4 1,F4 1,G4 1,G4 1,G4 2'],
    ['なのはに あいたら さくらに とまれ', 'G4 1,E4 1,E4 2,F4 1,D4 1,D4 2,C4 1,E4 1,G4 1,G4 1,E4 1,E4 1,E4 2'],
    ['さくらの はなの はなから はなへ', 'D4 1,D4 1,D4 1,D4 1,D4 1,E4 1,F4 2,E4 1,E4 1,E4 1,E4 1,E4 1,F4 1,G4 2'],
    ['とまれよ あそべ あそべよ とまれ', 'G4 1,E4 1,E4 2,F4 1,D4 1,D4 2,C4 1,E4 1,G4 1,G4 1,C4 3'],
  ];
  const FREQ = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392 };
  function song() {
    clear('🎵 おうた「ちょうちょう」', 'みんなで うたおう', 'yochi');
    root.appendChild(el('div', 'butterfly', '🦋'));
    const lines = el('div', 'lyrics'); SONG.forEach(([t]) => lines.appendChild(el('p', '', t))); root.appendChild(lines);
    let timers = [];
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    const play = () => {
      stop(); let t = 0; const beat = 0.42;
      SONG.forEach(([, notes], li) => {
        timers.push(setTimeout(() => { lines.querySelectorAll('p').forEach((p, i) => p.classList.toggle('on', i === li)); }, t * 1000));
        notes.split(',').forEach((n) => {
          const [k, d] = n.split(' '), dur = +d * beat;
          if (api.tone) api.tone(FREQ[k], dur * 0.9, 'triangle', 0.12, null, t);
          t += dur;
        });
      });
      timers.push(setTimeout(() => { lines.querySelectorAll('p').forEach((p) => p.classList.remove('on')); sfx('star'); }, t * 1000 + 300));
    };
    root.appendChild(btn('▶ うたう', 'sbig', play));
    root.appendChild(btn('← もどる', 'sout', () => { stop(); yochien(); }));
  }
  function bento() {
    clear('🍱 おべんとう', 'ママが つくってくれたよ', 'yochi');
    say('👩‍🏫', 'せんせい「いただきます！ ぜんぶ たべられるかな？」');
    const foods = ['🍙', '🍳', '🍤', '🥦', '🍅', '🍓'];
    const box = el('div', 'bento'); let left = foods.length;
    foods.forEach((f) => {
      const b = el('button', 'food', f);
      b.addEventListener('click', () => {
        if (b.classList.contains('eaten')) return;
        b.classList.add('eaten'); b.textContent = '✨'; sfx('pick'); left--;
        if (!left) { sfx('big'); box.after(el('p', 'desc', 'ごちそうさまでした！ 🙏 おなかいっぱい、げんき まんたん！')); done.hidden = false; }
      });
      box.appendChild(b);
    });
    root.appendChild(box);
    const done = btn('← もどる', 'sbig', () => api.onClose({ rest: true, stay: 'yochien' })); done.hidden = true; root.appendChild(done);
    root.appendChild(btn('← もどる', 'sout', yochien));
  }

  // ================= カレンダー =================
  function calendar() {
    clear('📅 あおちゃんの カレンダー', 'こんしゅうの よてい と シール', 'home');
    const w = api.week; const g = el('div', 'cal');
    w.days.forEach((d, i) => {
      const c = el('div', 'cday' + (i === w.today ? ' today' : '') + (i >= 5 ? ' off' : ''));
      c.appendChild(el('b', '', d.name));
      c.appendChild(el('div', 'cplan', d.plan.length ? d.plan.map((p) => `<span class="${d.done[p] ? 'got' : ''}">${({ yochien: '🎒', kumon: '✏️', piano: '🎹' })[p]}${d.done[p] ? '🌟' : ''}</span>`).join('') : '<span>🎈</span>'));
      c.appendChild(el('small', '', d.plan.length ? d.plan.map((p) => ({ yochien: 'ようちえん', kumon: 'くもん', piano: 'ピアノ' })[p]).join('・') : 'おやすみ'));
      g.appendChild(c);
    });
    root.appendChild(g);
    root.appendChild(el('p', 'desc', '✏️ くもん は かようび と きんようび、🎹 ピアノ は もくようび。できたら 🌟 シール！'));
    root.appendChild(btn('← へやに もどる', 'sout', home));
  }
  // ================= ピアノ（しまむら がっき）=================
  // きょくは メロディ だけ（ドレミ）。きらきらぼし・かえるのうた・ちょうちょう は むかしからの みんよう。
  const PSONGS = [
    { name: 'きらきらぼし', n: 'ドドソソララソ ファファミミレレド ソソファファミミレ ソソファファミミレ ドドソソララソ ファファミミレレド' },
    { name: 'かえるのうた', n: 'ドレミファミレド ミファソラソファミ ド ド ド ド ドドレレミミファファミレド' },
    { name: 'ちょうちょう', n: 'ソミミ ファレレ ドレミファソソソ ソミミ ファレレ ドミソソミミミ' },
  ];
  const KEYS = [['ド', 261.6, '#ff6b6b'], ['レ', 293.7, '#ff922b'], ['ミ', 329.6, '#ffd43b'], ['ファ', 349.2, '#51cf66'], ['ソ', 392, '#4dabf7'], ['ラ', 440, '#5c7cfa'], ['シ', 493.9, '#cc5de8'], ['ド↑', 523.3, '#ff8787']];
  const parseNotes = (s) => { const out = []; let i = 0; while (i < s.length) { if (s[i] === ' ') { i++; continue; } if (s.startsWith('ファ', i)) { out.push('ファ'); i += 2; } else { out.push(s[i]); i++; } } return out; };
  function keyboard(onKey) {
    const kb = el('div', 'piano');
    KEYS.forEach(([n, f, c], i) => {
      const k = el('button', 'pkey', `<span style="background:${c}"></span><b>${n}</b>`); k.dataset.i = i;
      k.addEventListener('pointerdown', (e) => { e.preventDefault(); if (api.tone) { api.tone(f, 0.9, 'triangle', 0.16); api.tone(f * 2, 0.5, 'sine', 0.04); } k.classList.add('on'); setTimeout(() => k.classList.remove('on'), 150); onKey(n, i); });
      kb.appendChild(k);
    });
    return kb;
  }
  function piano() {
    clear('🎹 しまむら がっき', 'マークイズ みなとみらい 3かい ・ ピアノ きょうしつ', 'pn');
    say('👩‍🏫', api.lessonDay ? 'ピアノの せんせい「あおちゃん、こんにちは！ きょうは レッスンの ひ。いっしょに ひこうね」' : 'ピアノの せんせい「レッスンは もくようび。きょうは じゆうに れんしゅう しようね」');
    PSONGS.forEach((s2, i) => root.appendChild(btn(`🎵 ${s2.name}（ドレミで ひく）`, 'sbig', () => lesson(i))));
    root.appendChild(btn('🎶 じゆうに ひく', 'sbig sub', free));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function free() {
    clear('🎶 じゆうに ひこう', 'すきな おとを ならしてね', 'pn');
    const shown = el('div', 'pnote', '♪'); root.appendChild(shown);
    root.appendChild(keyboard((n) => { shown.textContent = n; }));
    root.appendChild(btn('← もどる', 'sout', piano));
  }
  function lesson(i) {
    const s2 = PSONGS[i], notes = parseNotes(s2.n); let pos = 0, miss = 0;
    clear('🎵 ' + s2.name, 'ひかる けんばんを おしてね', 'pn');
    const line = el('div', 'pline'); notes.forEach((n, k) => line.appendChild(el('span', k === 0 ? 'cur' : '', n))); root.appendChild(line);
    const kbd = keyboard((n) => {
      if (pos >= notes.length) return;
      if (n.replace('↑', '') === notes[pos]) { line.children[pos].className = 'ok'; pos++; if (pos < notes.length) line.children[pos].className = 'cur'; hint(); if (pos >= notes.length) done(); }
      else miss++;
    });
    root.appendChild(kbd);
    const hint = () => { kbd.querySelectorAll('.pkey').forEach((k) => k.classList.toggle('hint', pos < notes.length && KEYS[k.dataset.i][0] === notes[pos])); };
    hint();
    const done = () => {
      sfx('big');
      const p2 = el('div', 'prize', `<i>💮</i><b>${s2.name} ひけたね！</b><span>${miss === 0 ? 'まちがい なし！ すごい！' : 'さいごまで ひけたね'}</span>`);
      root.insertBefore(p2, line);
      root.appendChild(btn('🌟 レッスン おしまい', 'sbig', () => api.onClose({ piano: true })));
      root.appendChild(btn('🔁 もういちど', 'sbig sub', () => lesson(i)));
    };
    root.appendChild(btn('← きょくを えらぶ', 'sout', piano));
  }
  // ================= どうぶつ ずかん =================
  function zukan() {
    const z = api.zoo; clear('🦒 のげやま どうぶつえん', 'よこはまし にしく おいまつちょう ・ にゅうえん むりょう', 'zk');
    say('🧑‍🌾', z && z.open ? 'しいくいんさん「いらっしゃい！ どうぶつに ちかづくと ずかんに のるよ」' : 'しいくいんさん「いまは おやすみ。9:30〜16:30、げつようび は おやすみ だよ」');
    const n = z ? Object.keys(z.found).length : 0;
    root.appendChild(el('div', 'tlabel', `📖 どうぶつ ずかん（${n}/${z ? z.pens.length : 0}）`));
    const g = el('div', 'zgrid');
    (z ? z.pens : []).forEach((p) => g.appendChild(el('div', 'zcard' + (z.found[p.id] ? '' : ' none'), z.found[p.id] ? `<i>${p.e}</i><b>${p.name}</b><small>${p.info}</small>` : '<i>❔</i><b>？？？</b><small>どこに いるかな</small>')));
    root.appendChild(g);
    root.appendChild(btn('🚶 どうぶつを みに いく', 'sbig', () => api.onClose()));
  }
  window.Places = {
    open(kind, a) { api = a; root = document.getElementById('placeRoot'); if (kind === 'home') home(); else if (kind === 'zukan') zukan(); else if (kind === 'piano') piano(); else yochien(); },
    again(kind) { if (kind === 'yochien') yochien(); else home(); },
  };
})();
