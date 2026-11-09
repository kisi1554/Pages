'use strict';
/* おでかけさき の なか（だい4だんかい）:
   カップヌードル ミュージアム（マイカップヌードル ファクトリー）・はんせん にっぽんまる の なか・
   ちゅうかがい の にくまん やさん・かんていびょう／まそびょう の おまいり。
   ねだん・メニュー は ゲームの めやす（ほんものの おみせ とは ちがう ことが ある）。
   Shops（shops.js）の レジ・がめん を かりて うごく。 */
(function () {
  const KEY = 'minatomirai-bouken-odekake-v1';
  let O = { cups: [], omikuji: 0, maru: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') O = Object.assign(O, s); } catch (e) { /* つかえない */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { /* いっぱい など */ } };
  let K; // { api, root, pay, clear, el, btn, sfx, toast, yen }
  const say = (face, text) => K.root.appendChild(K.el('div', 'kteach', `<span class="kface">${face}</span><span class="ksay">${text}</span>`));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ================= カップヌードル ミュージアム =================
  const SOUPS = [
    { id: 'shoyu', name: 'しょうゆ（オリジナル）', e: '🟤', col: '#b5651d' },
    { id: 'sea', name: 'シーフード', e: '⚪', col: '#e9dcc0' },
    { id: 'curry', name: 'カレー', e: '🟡', col: '#e8a317' },
    { id: 'tomato', name: 'チリトマト', e: '🔴', col: '#e03131' },
  ];
  const TOPS = [
    { id: 'negi', e: '🌿', n: 'ねぎ' }, { id: 'corn', e: '🌽', n: 'コーン' }, { id: 'ebi', e: '🦐', n: 'えび' },
    { id: 'egg', e: '🥚', n: 'たまご' }, { id: 'meat', e: '🥩', n: 'おにく' }, { id: 'naruto', e: '🐣', n: 'ひよこ なると' },
    { id: 'cheese', e: '🧀', n: 'チーズ' }, { id: 'kimchi', e: '🌶️', n: 'キムチ' }, { id: 'carrot', e: '🥕', n: 'にんじん' },
    { id: 'kani', e: '🦀', n: 'かにかま' }, { id: 'garlic', e: '🧄', n: 'ガーリック' }, { id: 'nori', e: '🟩', n: 'のり' },
  ];
  function cupnoodle() {
    const { clear, el, btn, api, root } = K;
    clear('🍜 カップヌードル ミュージアム', 'よこはま ・ しんこう（あかレンガの ちかく）', 'cup');
    say('🧑‍🍳', 'おねえさん「ようこそ！ ここでは じぶんだけの カップヌードルが つくれるよ。カップに えを かいて、スープと ぐを えらぼう！」');
    root.appendChild(el('div', 'cuphist', '<b>📜 カップヌードルの はなし</b><span>1971ねん に うまれた、おゆを いれて 3ぷんで たべられる ラーメン。カップに はいった インスタント ラーメンは にっぽんで うまれたよ。</span>'));
    root.appendChild(btn('🎨 マイカップヌードルを つくる（' + K.yen(500) + '）', 'sbig', () => K.pay(500, 'マイカップヌードル 1しょく', design, cupnoodle)));
    if (O.cups.length) root.appendChild(btn('🍜 つくった カップを みる（' + O.cups.length + 'こ）', 'sbig sub', cupList));
    root.appendChild(el('p', 'desc', 'ねだん は ゲームの めやす だよ'));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function design() {
    const { clear, el, btn, root } = K;
    clear('🎨 カップに えを かこう', 'ゆびで なぞって かいてね', 'cup');
    const wrap = el('div', 'cupwrap'), cv = document.createElement('canvas');
    cv.width = 360; cv.height = 300; cv.className = 'cupcv'; wrap.appendChild(cv); root.appendChild(wrap);
    const g = cv.getContext('2d');
    const cupPath = () => { g.beginPath(); g.moveTo(40, 20); g.lineTo(320, 20); g.lineTo(285, 290); g.lineTo(75, 290); g.closePath(); };
    const base = () => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 360, 300);
      g.save(); cupPath(); g.fillStyle = '#fffaf0'; g.fill(); g.restore();
      g.fillStyle = '#e03131'; g.fillRect(40, 20, 280, 26);
      g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('MY CUPNOODLE', 180, 40);
    };
    const outline = () => { g.save(); cupPath(); g.lineWidth = 4; g.strokeStyle = '#495057'; g.stroke(); g.restore(); };
    base(); outline();
    let col = '#1c7ed6', size = 9, last = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 360 / r.width, (e.clientY - r.top) * 300 / r.height]; };
    const line = (a, b) => { g.save(); cupPath(); g.clip(); g.strokeStyle = col; g.lineWidth = size; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); outline(); };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* なし */ } last = pos(e); line(last, last); });
    cv.addEventListener('pointermove', (e) => { if (!last) return; const p = pos(e); line(last, p); last = p; });
    const up = () => { last = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const pal = el('div', 'cpal');
    ['#e03131', '#ff922b', '#ffd43b', '#51cf66', '#1c7ed6', '#9775fa', '#f783ac', '#212529'].forEach((c, i) => {
      const b = el('button', 'csw' + (i === 4 ? ' on' : '')); b.style.background = c;
      b.addEventListener('click', () => { col = c; size = 9; pal.querySelectorAll('.csw').forEach((x) => x.classList.remove('on')); b.classList.add('on'); K.sfx('tap'); });
      pal.appendChild(b);
    });
    const stamp = el('button', 'csw st', '⭐'); stamp.addEventListener('click', () => { const x = 90 + Math.random() * 180, y = 70 + Math.random() * 180; g.save(); cupPath(); g.clip(); g.font = '40px sans-serif'; g.textAlign = 'center'; g.fillText(['⭐', '🚄', '🦖', '🌈', '🚒', '🍙'][(Math.random() * 6) | 0], x, y); g.restore(); outline(); K.sfx('pick'); });
    pal.appendChild(stamp); root.appendChild(pal);
    const row = el('div', 'brow');
    row.appendChild(btn('🧽 けす', 'sbig sub', () => { base(); outline(); }));
    row.appendChild(btn('▶ できた！', 'sbig', () => { let img = ''; try { img = cv.toDataURL('image/jpeg', 0.6); } catch (e) { img = ''; } soup({ img }); }));
    root.appendChild(row);
  }
  function soup(cup) {
    const { clear, el, root } = K;
    clear('🥣 スープを えらぼう', '4しゅるい から 1つ', 'cup');
    const g = el('div', 'kgrid2');
    SOUPS.forEach((s) => { const b = el('button', 'kitem', `<i>${s.e}</i><span>${s.name}</span>`); b.addEventListener('click', () => { K.sfx('pick'); cup.soup = s.id; tops(cup); }); g.appendChild(b); });
    root.appendChild(g);
  }
  function tops(cup) {
    const { clear, el, btn, root, toast } = K;
    const pick = [];
    const draw = () => {
      clear('🥕 ぐを 4つ えらぼう', 'えらんだ もの： ' + pick.length + ' / 4', 'cup');
      root.appendChild(el('div', 'tpick', [0, 1, 2, 3].map((i) => `<span>${pick[i] ? TOPS.find((t) => t.id === pick[i]).e : '・'}</span>`).join('')));
      const g = el('div', 'tgrid');
      TOPS.forEach((t) => {
        const n = pick.filter((x) => x === t.id).length;
        const b = el('button', 'tchip' + (n ? ' on' : ''), `<i>${t.e}</i><span>${t.n}</span>${n ? `<b>×${n}</b>` : ''}`);
        b.addEventListener('click', () => { if (pick.length >= 4) { toast('4つ まで だよ。とりけす ときは したの ボタン'); return; } pick.push(t.id); K.sfx('pick'); draw(); });
        g.appendChild(b);
      });
      root.appendChild(g);
      const row = el('div', 'brow');
      row.appendChild(btn('↩ 1つ もどす', 'sbig sub', () => { pick.pop(); draw(); }));
      row.appendChild(btn(pick.length === 4 ? '🏭 こうじょうへ！' : 'あと ' + (4 - pick.length) + 'つ', 'sbig' + (pick.length === 4 ? '' : ' dim'), () => { if (pick.length < 4) return; cup.tops = pick.slice(); factory(cup); }));
      root.appendChild(row);
    };
    draw();
  }
  async function factory(cup) {
    const { clear, el, btn, root, api } = K;
    clear('🏭 マイカップヌードル こうじょう', 'できあがるまで みてね', 'cup');
    const s = SOUPS.find((x) => x.id === cup.soup);
    const box = el('div', 'fact'); root.appendChild(box);
    const steps = [['🍜', 'めんを カップに いれる（くるっと ひっくりかえすよ）'], ['🥣', s.name + ' の スープを いれる'], [cup.tops.map((id) => TOPS.find((t) => t.id === id).e).join(''), 'ぐを いれる'], ['🔒', 'ふたを して ぴったり とじる'], ['🎁', 'フィルムで つつむ'], ['🎈', 'くうきの ふくろに いれて できあがり！']];
    for (let i = 0; i < steps.length; i++) {
      const r = el('div', 'fstep', `<i>${steps[i][0]}</i><span>${steps[i][1]}</span>`); box.appendChild(r);
      api.tone && api.tone(440 + i * 70, 0.15, 'square', 0.04); await wait(750); r.classList.add('ok');
      if (!root.contains(box)) return;
    }
    K.sfx('big'); api.confetti && api.confetti();
    const id = Date.now().toString(36);
    O.cups.unshift({ id, img: cup.img, soup: cup.soup, tops: cup.tops, t: api.clock || '' }); O.cups = O.cups.slice(0, 12); store();
    root.appendChild(el('div', 'prize', `${cup.img ? `<img class="cupimg" src="${cup.img}" alt="">` : '<i>🍜</i>'}<b>あおちゃんだけの カップヌードル！</b><span>${s.name} ・ ${cup.tops.map((t) => TOPS.find((x) => x.id === t).e).join(' ')}</span>`));
    say('👩', 'ママ「すごい！ おうちに かえったら いっしょに たべようね」');
    root.appendChild(btn('← ミュージアムに もどる', 'sbig', cupnoodle));
  }
  function cupList() {
    const { clear, el, btn, root } = K;
    clear('🍜 あおちゃんの カップヌードル', O.cups.length + 'こ', 'cup');
    root.appendChild(cupGrid());
    root.appendChild(btn('← もどる', 'sbig', cupnoodle));
  }
  function cupGrid() {
    const g = document.createElement('div'); g.className = 'igrid';
    O.cups.forEach((c) => { const s = SOUPS.find((x) => x.id === c.soup) || SOUPS[0]; const d = document.createElement('div'); d.className = 'icard'; d.innerHTML = `${c.img ? `<img class="cupimg sm" src="${c.img}" alt="">` : '<i>🍜</i>'}<span>${s.name}<br>${(c.tops || []).map((t) => (TOPS.find((x) => x.id === t) || { e: '' }).e).join('')}</span>`; g.appendChild(d); });
    return g;
  }

  // ================= はんせん にっぽんまる =================
  const ROOMS = [
    { id: 'deck', e: '🧭', n: 'デッキ（かんぱん）' }, { id: 'helm', e: '☸️', n: 'かじを とる ところ' },
    { id: 'cap', e: '🧑‍✈️', n: 'せんちょうの へや' }, { id: 'bunk', e: '🛏️', n: 'くんれんせいの しんしつ' },
    { id: 'engine', e: '⚙️', n: 'きかんしつ' },
  ];
  function nipponmaru() {
    const { clear, el, btn, api, root } = K;
    clear('⛵ はんせん にっぽんまる', 'にっぽんまる メモリアルパーク', 'maru');
    say('🧑‍✈️', 'せんいんさん「ようこそ！ にっぽんまるは 1930ねんに うまれた ほで はしる ふね。29まいの ほを ひろげた すがたが きれいで『たいへいようの しらとり』と よばれたんだ」');
    root.appendChild(btn('🎫 ふねの なかを みる（こども ' + K.yen(200) + '）', 'sbig', () => K.pay(200, 'にっぽんまる けんがく こども 1まい', () => { O.maru = {}; store(); inside(); }, nipponmaru)));
    root.appendChild(el('p', 'desc', 'ねだん・じかん は ゲームの めやす だよ'));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function inside() {
    const { clear, el, btn, api, root } = K;
    clear('⛵ にっぽんまる の なか', 'みた へや ' + Object.keys(O.maru).length + ' / ' + ROOMS.length, 'maru');
    const g = el('div', 'kgrid2');
    ROOMS.forEach((r) => { const b = el('button', 'kitem' + (O.maru[r.id] ? ' seen' : ''), `<i>${r.e}</i><span>${r.n}</span>${O.maru[r.id] ? '<em>みたよ</em>' : ''}`); b.addEventListener('click', () => { O.maru[r.id] = 1; store(); K.sfx('door'); room(r.id); }); g.appendChild(b); });
    root.appendChild(g);
    if (Object.keys(O.maru).length === ROOMS.length) root.appendChild(el('div', 'prize', '<i>🏅</i><b>ぜんぶの へやを みたよ！</b><span>りっぱな ふなのり さん</span>'));
    root.appendChild(btn('🚪 ふねから おりる', 'sout', () => api.onClose()));
  }
  function room(id) {
    const { clear, el, btn, api, root } = K;
    const back = () => root.appendChild(btn('← ほかの へやへ', 'sbig sub', inside));
    if (id === 'deck') {
      clear('🧭 デッキ', 'そうはん てんぱん（ぜんぶの ほを ひろげる）', 'maru');
      if (api.sailsToday) { say('🧑‍✈️', 'きょうは もう ぜんぶの ほが ひらいているよ！ そとから ながめてごらん'); back(); return; }
      say('🧑‍✈️', 'みんなで ロープを ひっぱって、29まいの ほを ひろげよう！ ほばしらの ボタンを タップしてね');
      let n = 0; const MAST = [['ぜんしょう（いちばん まえ）', 8], ['メイン マスト', 8], ['ミズン マスト', 7], ['ジガー マスト', 6]];
      const cnt = el('div', 'price', '🪢 ひらいた ほ <b>0</b> / 29'); root.appendChild(cnt);
      const ship = el('div', 'sailart'); root.appendChild(ship);
      const left = MAST.map((m) => m[1]);
      const g = el('div', 'kgrid2');
      MAST.forEach((m, i) => {
        const col = el('div', 'smast'); ship.appendChild(col);
        const b = el('button', 'kitem', `<i>🪢</i><span>${m[0]}</span><b>のこり ${left[i]}</b>`);
        b.addEventListener('click', () => {
          if (!left[i]) return; left[i]--; n++; col.appendChild(el('span', 'sail')); b.querySelector('b').textContent = 'のこり ' + left[i];
          api.tone && api.tone(300 + n * 15, 0.08, 'triangle', 0.05); cnt.innerHTML = `🪢 ひらいた ほ <b>${n}</b> / 29`;
          if (n === 29) { K.sfx('big'); api.confetti && api.confetti(); api.reward && api.reward({ sails: 1 }); api.sailsToday = true; cnt.after(el('div', 'prize', '<i>⛵</i><b>そうはん てんぱん！</b><span>そとに でると、ほを ひろげた にっぽんまるが みえるよ</span>')); }
        });
        g.appendChild(b);
      });
      root.appendChild(g); back(); return;
    }
    if (id === 'helm') {
      clear('☸️ かじを とる ところ', 'おおきな かじ（だりん）を まわそう', 'maru');
      let ang = 0; const wh = el('div', 'helm', '☸️'), cp = el('div', 'price', '🧭 まっすぐ（ようそろー）');
      root.appendChild(wh); root.appendChild(cp);
      const turn = (d) => { ang = Math.max(-180, Math.min(180, ang + d)); wh.style.transform = `rotate(${ang}deg)`; cp.textContent = ang === 0 ? '🧭 まっすぐ（ようそろー）' : (ang < 0 ? '⬅️ ひだり（とりかじ）' : '➡️ みぎ（おもかじ）') + ' ' + Math.abs(ang) + 'ど'; api.tone && api.tone(200, 0.05, 'square', 0.03); };
      const row = el('div', 'brow'); row.appendChild(btn('⬅️ とりかじ', 'sbig', () => turn(-30))); row.appendChild(btn('➡️ おもかじ', 'sbig', () => turn(30))); root.appendChild(row);
      root.appendChild(btn('🔔 かねを ならす', 'sbig sub', () => { [0, 0.35].forEach((t) => api.tone && api.tone(880, 0.6, 'sine', 0.08, null, t)); }));
      back(); return;
    }
    if (id === 'cap') {
      clear('🧑‍✈️ せんちょうの へや', 'ふねで いちばん えらい ひとの へや', 'maru');
      root.appendChild(el('div', 'room', '<span>🗺️</span><span>🧭</span><span>📚</span><span>🖋️</span><span>🛋️</span>'));
      say('🧑‍✈️', 'にっぽんまるは ふなのりさんに なる がくせいの くんれんの ふね。せかいの うみを ながい あいだ はしったんだよ');
      root.appendChild(btn('🧢 せんちょうの ぼうしを かぶる', 'sbig', () => { K.toast('にあってる！ あおちゃん せんちょう 🧢'); K.sfx('big'); }));
      back(); return;
    }
    if (id === 'bunk') {
      clear('🛏️ くんれんせいの しんしつ', 'にだん ベッドが ならんでいるよ', 'maru');
      root.appendChild(el('div', 'room', '<span>🛏️</span><span>🛏️</span><span>🧳</span><span>🛏️</span><span>🛏️</span>'));
      say('👩', 'ママ「ちいさな ベッド だね。ふねが ゆれても おちないように くふう されて いるんだって」');
      back(); return;
    }
    clear('⚙️ きかんしつ', 'かぜが ない ひは エンジンで すすむ', 'maru');
    const ek = el('div', 'helm eng', '⚙️'); root.appendChild(ek);
    root.appendChild(btn('▶ エンジン スタート', 'sbig', () => { ek.classList.add('spin'); for (let i = 0; i < 8; i++) api.tone && api.tone(70 + (i % 2) * 8, 0.18, 'sawtooth', 0.05, null, i * 0.18); }));
    back();
  }

  // ================= ちゅうかがい の にくまん やさん =================
  const BUNS = [
    { id: 'niku', name: 'にくまん', e: '🥟', price: 500 }, { id: 'an', name: 'あんまん', e: '🫓', price: 400 },
    { id: 'panda', name: 'パンダまん', e: '🐼', price: 450 }, { id: 'xlb', name: 'しょうろんぽう 4こ', e: '🥟', price: 600, n: 4 },
    { id: 'goma', name: 'ごまだんご', e: '🍡', price: 300, n: 3 },
  ];
  function chuka() {
    const { clear, el, root, api } = K;
    clear('🥟 ちゅうかがい の にくまん やさん', 'ほかほか せいろ から ゆげが もくもく', 'chuka');
    say('👨‍🍳', 'おみせの ひと「いらっしゃい！ できたて あつあつ だよ」');
    root.appendChild(el('div', 'tlabel', `👛 ${K.yen(api.wallet.total())}`));
    const g = el('div', 'kgrid2');
    BUNS.forEach((it) => { const c = el('button', 'kitem hot', `<i>${it.e}</i><span>${it.name}</span><b>${K.yen(it.price)}</b><em>あつあつ</em>`); c.addEventListener('click', () => K.pay(it.price, it.name, () => eatBun(it), chuka)); g.appendChild(c); });
    root.appendChild(g);
    root.appendChild(el('p', 'desc', 'ねだん は ゲームの めやす だよ'));
    root.appendChild(K.btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function eatBun(it) {
    const { clear, el, btn, root, api } = K;
    clear('😋 ' + it.name, 'あついから ふーふー してから たべよう', 'chuka');
    let cool = 0; const n = it.n || 1; let left = n;
    const st = el('div', 'price', '🔥 あつあつ！ 「ふーふー」を 3かい'); root.appendChild(st);
    const box = el('div', 'bento'); root.appendChild(box);
    const items = []; for (let i = 0; i < n; i++) { const b = el('button', 'food steam', it.e); items.push(b); box.appendChild(b); }
    const fu = btn('🌬️ ふーふー', 'sbig', () => {
      if (cool >= 3) return; cool++; api.tone && api.tone(1200, 0.12, 'sine', 0.03); st.textContent = cool < 3 ? `🌬️ ふーふー（${cool}/3）` : '😊 ちょうど いい あつさ！ タップして たべよう';
      if (cool >= 3) { items.forEach((b) => b.classList.remove('steam')); fu.classList.add('dim'); }
    });
    root.appendChild(fu);
    items.forEach((b) => b.addEventListener('click', () => {
      if (cool < 3) { K.toast('あちち！ さきに ふーふー してね'); return; }
      if (b.classList.contains('eaten')) return; b.classList.add('eaten'); b.textContent = '✨'; K.sfx('pick'); left--;
      if (!left) { K.sfx('big'); api.reward && api.reward({ full: 1, gas: 1, nikuman: 1 }); root.appendChild(el('p', 'desc', 'おいしかった！ げんき まんたん、おならパワーも まんたん 💨')); root.appendChild(btn('← おみせに もどる', 'sbig', chuka)); }
    }));
  }

  // ================= かんていびょう ・ まそびょう =================
  const BYO = {
    kantei: { t: '🏯 よこはま かんていびょう', sub: 'ちゅうかがい の まんなか', god: 'かんうさま（しょうばいの かみさま）' },
    mazu: { t: '🏯 よこはま まそびょう', sub: 'ちゅうかがい の みなみがわ', god: 'まそさま（うみの あんぜんを まもる かみさま）' },
  };
  const KUJI = [['だいきち', '🌟', 'とっても いい ことが あるよ！'], ['ちゅうきち', '😊', 'ともだちと なかよく できるよ'], ['しょうきち', '🍀', 'ちいさな しあわせ みつけてね'], ['きち', '🌸', 'げんきに すごせるよ'], ['すえきち', '🌱', 'がんばると あとで いい ことが あるよ']];
  function byo(id) {
    const B = BYO[id] || BYO.kantei, { clear, el, btn, root, api } = K;
    clear(B.t, B.sub, 'chuka');
    root.appendChild(el('div', 'room byo', '<span>🏮</span><span>🐉</span><span>🏯</span><span>🐉</span><span>🏮</span>'));
    say('👩', `ママ「ここには ${B.god} が まつられて いるよ。しずかに おまいり しようね」`);
    root.appendChild(btn('🙏 おまいり する', 'sbig', () => { [0, 0.4].forEach((t) => api.tone && api.tone(660, 0.8, 'sine', 0.07, null, t)); K.toast('🙏 みんなが げんきで いられますように'); }));
    root.appendChild(btn('📜 おみくじ を ひく（' + K.yen(100) + '）', 'sbig sub', () => K.pay(100, 'おみくじ 1かい', () => kuji(id), () => byo(id))));
    root.appendChild(el('p', 'desc', 'おみくじ の ねだん は ゲームの めやす だよ'));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  async function kuji(id) {
    const { clear, el, btn, root } = K;
    clear('📜 おみくじ', 'がらがら がらがら…', 'chuka');
    const b = el('div', 'helm kuji', '📜'); root.appendChild(b); await wait(900);
    const k = KUJI[(Math.random() * KUJI.length) | 0]; O.omikuji++; store(); K.sfx('big');
    b.remove(); root.appendChild(el('div', 'prize', `<i>${k[1]}</i><b>${k[0]}</b><span>${k[2]}</span>`));
    root.appendChild(btn('← もどる', 'sbig', () => byo(id)));
  }


  // ================= えき（だい5だんかい）=================
  // あおちゃん（5さい）は「ようじ」: おとな 1にんに 2にん まで むりょう。ママの きっぷ だけ かう。
  // ねだん は めやす（JR 160えん・ブルーライン 210えん〜・みなとみらいせん 200えん〜）。
  function fare(k, n) { if (k === 'jr') return 160; if (k === 'blue') return n <= 1 ? 210 : 250; return n <= 2 ? 200 : 230; }
  function eki(arg) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li], here = T.stops[arg.si];
    clear(`${T.sub ? '🚇' : '🚃'} ${here.n} えき`, T.name, 'eki ' + T.k);
    say('🧑‍✈️', 'えきいんさん「どこまで いきますか？」');
    const g = el('div', 'kgrid2');
    T.stops.forEach((st, i) => {
      if (i === arg.si) return;
      const n = Math.abs(i - arg.si), c = el('button', 'kitem', `<i>${i > arg.si ? '➡️' : '⬅️'}</i><span>${st.n}</span><b>${n}えき さき</b>`);
      c.addEventListener('click', () => ticket(arg, i)); g.appendChild(c);
    });
    root.appendChild(g);
    root.appendChild(K.btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function ticket(arg, to) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li], n = Math.abs(to - arg.si), price = fare(T.k, n);
    clear('🎫 きっぷを かう', `${T.stops[arg.si].n} → ${T.stops[to].n}（${T.short}）`, 'eki ' + T.k);
    root.appendChild(el('div', 'fare', `👩 ママ（おとな）： <em>${K.yen(price)}</em><br>🧢 あおちゃん（5さい・ようじ）： <em>0えん</em> ✨<br><small>ようじ（1さい〜 しょうがっこうに はいる まえ）は、おとな 1にんに 2にん まで むりょう。ねだん は めやす だよ</small>`));
    root.appendChild(btn('🎫 ママの きっぷを かう', 'sbig', () => K.pay(price, `${T.short} おとな 1まい`, () => gate(arg, to), () => ticket(arg, to))));
    root.appendChild(btn('← もどる', 'sout', () => eki(arg)));
  }
  async function gate(arg, to) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li];
    clear('🚪 かいさつ', 'きっぷを いれて とおろう', 'eki ' + T.k);
    const g = el('div', 'gate', '🎫'); root.appendChild(g);
    const b = btn('🎫 きっぷを いれる', 'sbig', async () => {
      b.remove(); g.textContent = '🚪'; g.classList.add('go'); api.tone && api.tone(1320, 0.08, 'square', 0.05); api.tone && api.tone(1320, 0.08, 'square', 0.05, null, 0.12);
      root.appendChild(el('p', 'desc', 'ピピッ！ ママと てを つないで とおったよ 🤝')); await wait(900);
      if (!T.sub) { api.onClose({ jr: { li: arg.li, from: arg.si, to } }); return; }
      modeSel(arg, to);
    });
    root.appendChild(b);
  }
  async function ride(arg, to) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li], dir = to > arg.si ? 1 : -1;
    clear('🚇 ちかてつの なか', T.name, 'eki ' + T.k);
    const tn = el('div', 'tunnel', '<div class="lights"></div><div class="sign"></div><div class="me">🧢👩</div>'); root.appendChild(tn);
    const info = el('div', 'price', ''); root.appendChild(info);
    say('👩', 'ママ「ちかてつは つちの なかを はしるんだよ。まどの そとは トンネル。えきに つくと あかるく なるね」');
    for (let i = arg.si + dir; ; i += dir) {
      tn.classList.remove('stop'); info.innerHTML = `🔊「つぎは <b>${T.stops[i].n}</b>」`;
      for (let k = 0; k < 6; k++) { api.tone && api.tone(80 + (k % 2) * 6, 0.12, 'sawtooth', 0.03); await wait(380); if (!root.contains(tn)) return; }
      tn.classList.add('stop'); tn.querySelector('.sign').textContent = T.stops[i].n;
      api.tone && api.tone(880, 0.15, 'sine', 0.06); api.tone && api.tone(660, 0.25, 'sine', 0.06, null, 0.18);
      if (i === to) break;
      info.innerHTML = `🚉 ${T.stops[i].n}。 ドアが ひらきます`; await wait(1300); if (!root.contains(tn)) return;
    }
    info.innerHTML = `🚉 <b>${T.stops[to].n}</b> に つきました！`;
    root.appendChild(btn('🚶 おりて そとへ でる', 'sbig', () => api.onClose({ trainTo: { li: arg.li, si: to } })));
  }

  // ================= てつどう もけい の はくぶつかん（よこはま みつい ビル 2かい）=================
  // ほんものの もけいの まね では なく、この アプリで かいた ジオラマ。ねだん は めやす。
  const MODELS = [
    { id: 'sl', n: 'じょうき きかんしゃ（SL）', body: '#2b2b2b', band: '#c92a2a', cars: ['#6b3e26', '#6b3e26', '#6b3e26'], smoke: 1, w: '🚂' },
    { id: 'shin', n: 'しんかんせん', body: '#f8f9fa', band: '#1c4fd0', cars: ['#f8f9fa', '#f8f9fa', '#f8f9fa'], nose: 1, w: '🚄' },
    { id: 'blue', n: 'ブルートレイン（しんだい とっきゅう）', body: '#1c3f8f', band: '#f8f9fa', cars: ['#1c3f8f', '#1c3f8f', '#1c3f8f'], w: '🚃' },
    { id: 'euro', n: 'ヨーロッパの とっきゅう', body: '#c92a2a', band: '#ffd43b', cars: ['#e9ecef', '#c92a2a', '#e9ecef'], w: '🚆' },
    { id: 'ele', n: 'でんき きかんしゃ と かもつ', body: '#2b8a3e', band: '#ffd43b', cars: ['#868e96', '#495057', '#868e96'], w: '🚛' },
    { id: 'tram', n: 'ろめん でんしゃ', body: '#f59f00', band: '#fff', cars: [], w: '🚋' },
  ];
  function hara() {
    const { clear, el, btn, api, root } = K;
    clear('🚂 てつどう もけい の はくぶつかん', 'よこはま みつい ビルディング 2かい', 'hara');
    say('🧑‍🔧', 'がくげいいんさん「ようこそ！ おおきな ジオラマで もけいの でんしゃが はしっているよ。じぶんで うんてん してみよう！」');
    root.appendChild(el('div', 'fare', `👩 ママ（おとな）： <em>${K.yen(1500)}</em><br>🧢 あおちゃん（4さい いじょう）： <em>${K.yen(750)}</em><br><small>あわせて ${K.yen(2250)}。ねだん は めやす。ほんとうは よやく（ひにち と じかん を きめた きっぷ）が いるよ</small>`));
    root.appendChild(btn('🎫 にゅうかん する（' + K.yen(2250) + '）', 'sbig', () => K.pay(2250, 'はくぶつかん おとな 1・こども 1', lobby, hara)));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function lobby() {
    const { clear, el, btn, api, root } = K;
    clear('🚂 てつどう もけい の はくぶつかん', 'なかに はいったよ', 'hara');
    say('👩', 'ママ「わあ、ひろい！ でんしゃが いっぱい はしってるね」');
    root.appendChild(btn('🕹️ ジオラマで うんてん する', 'sbig', () => pickModel()));
    root.appendChild(btn('🖼️ もけいの コレクション を みる', 'sbig sub', collection));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function collection() {
    const { clear, el, btn, root } = K;
    clear('🖼️ もけいの コレクション', 'ガラスケースの なかの でんしゃたち', 'hara');
    const g = el('div', 'zgrid');
    MODELS.forEach((m) => { const c = el('div', 'zcard', `<canvas width="160" height="60"></canvas><b>${m.n}</b>`); g.appendChild(c); const x = c.querySelector('canvas').getContext('2d'); drawTrainSide(x, m, 8, 18); });
    root.appendChild(g);
    root.appendChild(el('p', 'desc', 'もけいは ほんものを ちいさく した もの。レールの はば も ほんものに あわせて ちいさく して あるよ'));
    root.appendChild(btn('← もどる', 'sbig', lobby));
  }
  function drawTrainSide(x, m, ox, oy) {
    const cars = [m.body].concat(m.cars.slice(0, 2));
    cars.forEach((col, i) => {
      const cx = ox + i * 48; x.fillStyle = col; x.fillRect(cx, oy, 44, 22); x.fillStyle = m.band; x.fillRect(cx, oy + 14, 44, 4);
      x.fillStyle = '#a5d8ff'; for (let k = 0; k < 4; k++) if (!(i === 0 && m.smoke)) x.fillRect(cx + 4 + k * 10, oy + 4, 7, 7);
      x.fillStyle = '#222'; [8, 36].forEach((w) => { x.beginPath(); x.arc(cx + w, oy + 24, 4, 0, 7); x.fill(); });
    });
    if (m.smoke) { x.fillStyle = '#222'; x.fillRect(ox + 6, oy - 8, 6, 9); }
  }
  function pickModel() {
    const { clear, el, btn, root } = K;
    clear('🕹️ どの でんしゃ を はしらせる？', 'えらんだ でんしゃを あおちゃんが うんてん', 'hara');
    const g = el('div', 'kgrid2');
    MODELS.forEach((m) => { const c = el('button', 'kitem', `<i>${m.w}</i><span>${m.n}</span>`); c.addEventListener('click', () => diorama(m)); g.appendChild(c); });
    root.appendChild(g);
    root.appendChild(btn('← もどる', 'sout', lobby));
  }
  function diorama(mine) {
    const { clear, el, btn, api, root } = K;
    clear('🕹️ ジオラマ うんてん', mine.n, 'hara');
    const cv = document.createElement('canvas'); cv.width = 720; cv.height = 480; cv.className = 'diocv'; root.appendChild(cv);
    const info = el('div', 'price', '⏹ とまっているよ。⏩ で しゅっぱつ！'); root.appendChild(info);
    const g = cv.getContext('2d');
    // せんろ: そと（あおちゃん）と うち（ほかの でんしゃ）の だえん
    const loop = (cx, cy, a, r) => { const L = 2 * a + 2 * Math.PI * r; return { L, top: a + Math.PI * r + a / 2, at(s) { s = ((s % L) + L) % L; if (s < a) return [cx - a / 2 + s, cy + r, 0]; s -= a; if (s < Math.PI * r) { const t = s / r - Math.PI / 2; return [cx + a / 2 + Math.cos(t) * r, cy + Math.sin(t) * r, t + Math.PI / 2]; } s -= Math.PI * r; if (s < a) return [cx + a / 2 - s, cy - r, Math.PI]; s -= a; const t = s / r + Math.PI / 2; return [cx - a / 2 + Math.cos(t) * r, cy + Math.sin(t) * r, t + Math.PI / 2]; } }; };
    const OUT = loop(360, 240, 370, 165), IN = loop(360, 240, 260, 105);
    const ST = 90; // えき（した の ちょくせん）
    const other = MODELS.find((m) => m.id !== mine.id && m.id !== 'tram') || MODELS[0];
    const T1 = { m: mine, s: 30, v: 0, want: 0, L: OUT }, T2 = { m: other, s: 300, v: 70, want: 70, L: IN };
    let night = false, last = performance.now(), msgT = 0, stopped = true, bell = 0;
    const houses = []; for (let i = 0; i < 9; i++) houses.push([250 + (i % 3) * 70, 205 + Math.floor(i / 3) * 34, ['#ffa8a8', '#a5d8ff', '#ffe066', '#b2f2bb'][i % 4]]);
    function rail(Lp, col) { g.strokeStyle = '#8d7b68'; g.lineWidth = 16; g.beginPath(); for (let s = 0; s <= Lp.L; s += 6) { const [x, y] = Lp.at(s); s ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([2, 6]); g.stroke(); g.setLineDash([]); }
    function train(T) {
      const cars = [T.m.body].concat(T.m.cars);
      cars.forEach((col, i) => {
        const [x, y, a] = T.L.at(T.s - i * 30); g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = col; g.fillRect(-13, -9, 26, 18); g.fillStyle = T.m.band; g.fillRect(-13, 4, 26, 3);
        if (i === 0) { if (T.m.nose) { g.fillStyle = col; g.beginPath(); g.moveTo(13, -9); g.lineTo(22, 0); g.lineTo(13, 9); g.fill(); } if (night) { g.fillStyle = 'rgba(255,240,150,.55)'; g.beginPath(); g.moveTo(14, -6); g.lineTo(60, -22); g.lineTo(60, 22); g.lineTo(14, 6); g.fill(); } }
        g.fillStyle = night ? '#ffe066' : '#d0ebff'; g.fillRect(-9, -6, 5, 4); g.fillRect(-2, -6, 5, 4); g.fillRect(5, -6, 5, 4);
        g.restore();
      });
      if (T.m.smoke && T.v > 5) { const [x, y] = T.L.at(T.s - 4); g.fillStyle = 'rgba(240,240,240,.7)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - k * 6, y - 14 - k * 6 - (performance.now() / 60 % 6), 5 + k * 2, 0, 7); g.fill(); } }
    }
    function frame(now) {
      if (!root.contains(cv)) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      T1.v += (T1.want - T1.v) * Math.min(1, dt * (T1.want < T1.v ? 2.5 : 1.5)); T1.s += T1.v * dt; T2.s += T2.v * dt;
      // ふみきり（うえ の ちょくせん の まんなか）
      const near = [T1, T2].some((T) => { const d = ((T.s - T.L.top) % T.L + T.L) % T.L; return d < 130 || d > T.L - 110; });
      if (near && (bell -= dt) < 0) { bell = 0.35; api.tone && api.tone(1250, 0.12, 'square', 0.03); }
      // そら・じめん
      g.fillStyle = night ? '#1c2b4a' : '#7cc36b'; g.fillRect(0, 0, 720, 480);
      g.fillStyle = night ? '#2b4a3a' : '#69b34c'; g.fillRect(0, 0, 720, 60);
      // かわ と はし
      g.fillStyle = night ? '#1b3a6b' : '#4dabf7'; g.fillRect(70, 0, 38, 480);
      rail(OUT, '#adb5bd'); rail(IN, '#adb5bd');
      // えき
      const [sx, sy] = OUT.at(ST); g.fillStyle = '#ced4da'; g.fillRect(sx - 50, sy + 12, 100, 20); g.fillStyle = '#e03131'; g.fillRect(sx - 2, sy - 12, 4, 24);
      g.fillStyle = '#1c2b4a'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.fillText('🚉 もけい えき', sx, sy + 48);
      // まち
      houses.forEach(([x, y, c]) => { g.fillStyle = night ? '#495057' : c; g.fillRect(x, y, 40, 24); g.fillStyle = night ? '#ffe066' : '#fff'; g.fillRect(x + 6, y + 6, 8, 8); g.fillRect(x + 24, y + 6, 8, 8); g.fillStyle = night ? '#343a40' : '#c92a2a'; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 20, y - 14); g.lineTo(x + 44, y); g.fill(); });
      // ふみきり
      const cx = 360, cyy = 240 - 165; g.fillStyle = '#495057'; g.fillRect(cx - 14, cyy - 60, 28, 120);
      [-1, 1].forEach((sd) => { g.save(); g.translate(cx + sd * 30, cyy + sd * 28); g.rotate(near ? 0 : -Math.PI / 2 * sd); g.fillStyle = '#ffd43b'; g.fillRect(0, -3, -sd * 0 + 40 * -sd, 6); g.restore(); g.fillStyle = near && Math.floor(now / 300) % 2 ? '#ff2222' : '#661111'; g.beginPath(); g.arc(cx + sd * 30, cyy + sd * 28, 6, 0, 7); g.fill(); });
      train(T2); train(T1);
      // やま と トンネル（みぎ の カーブ）
      g.fillStyle = night ? '#2f3e2f' : '#5c940d'; g.beginPath(); g.moveTo(560, 470); g.lineTo(640, 160); g.lineTo(720, 470); g.fill();
      g.fillStyle = night ? '#3d4f3d' : '#74b816'; g.beginPath(); g.moveTo(600, 330); g.lineTo(700, 120); g.lineTo(720, 140); g.lineTo(720, 380); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(690, 150); g.lineTo(700, 120); g.lineTo(712, 150); g.fill();
      // うんてん の ようす
      const d = ((T1.s - ST) % OUT.L + OUT.L) % OUT.L, dist = Math.min(d, OUT.L - d);
      if (T1.v < 2 && T1.want === 0 && !stopped) {
        stopped = true; const cm = Math.round(dist);
        if (dist < 12) { info.innerHTML = '💮 ぴったり ていしゃ！ すごい うんてんしさん！'; api.tone && api.tone(880, 0.15, 'sine', 0.08); api.tone && api.tone(1175, 0.3, 'sine', 0.08, null, 0.15); }
        else if (dist < 60) info.innerHTML = `🚉 えき まで あと ${cm}。もうすこし！`;
        else info.innerHTML = '⏹ とまったよ。えきの あかい せん で とまれるかな？';
      }
      if (T1.want > 0) { stopped = false; if ((msgT -= dt) < 0) { msgT = 0.5; info.innerHTML = dist < 120 && ((T1.s - ST) % OUT.L + OUT.L) % OUT.L > OUT.L / 2 ? '🚉 もうすぐ えき！ ⏹ で とまろう' : `🚃 はしってるよ（はやさ ${Math.round(T1.want / 30)}）`; } }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    const row = el('div', 'brow');
    row.appendChild(btn('⏪ ゆっくり', 'sbig sub', () => { T1.want = Math.max(0, T1.want - 30); }));
    row.appendChild(btn('⏹ とまる', 'sbig sub', () => { T1.want = 0; }));
    row.appendChild(btn('⏩ はやく', 'sbig', () => { T1.want = Math.min(150, T1.want + 30); }));
    root.appendChild(row);
    const row2 = el('div', 'brow');
    row2.appendChild(btn(mine.smoke ? '📯 きてき ポッポー' : '📯 けいてき プァーン', 'sbig sub', () => { if (mine.smoke) { api.tone && api.tone(520, 0.35, 'sine', 0.08); api.tone && api.tone(620, 0.5, 'sine', 0.08, null, 0.4); } else api.tone && api.tone(440, 0.7, 'sawtooth', 0.04); }));
    row2.appendChild(btn('🌙 よる / ☀️ ひる', 'sbig sub', () => { night = !night; }));
    root.appendChild(row2);
    root.appendChild(btn('🔁 でんしゃを かえる', 'sbig sub', pickModel));
    root.appendChild(btn('← ロビーに もどる', 'sout', lobby));
  }
  // ================= ちかてつ: のる・うんてんしさん・しゃしょうさん =================
  function modeSel(arg, to) {
    const { clear, el, btn, root } = K, T = K.api.trains[arg.li];
    clear('🚇 どうやって のる？', T.name, 'eki ' + T.k);
    say('🧑‍✈️', 'えきいんさん「きょうは とくべつに、うんてんし さん や しゃしょう さん の おしごと も できるよ」');
    const g = el('div', 'kgrid2');
    [['🪑', 'おきゃくさん で のる', () => ride(arg, to)], ['🎚️', 'うんてんし さん（えきに ぴったり とめる）', () => drive(arg, to)], ['🎤', 'しゃしょう さん（ドア と アナウンス）', () => conductor(arg, to)]].forEach(([e, n, f]) => { const b = el('button', 'kitem', `<i>${e}</i><span>${n}</span>`); b.addEventListener('click', f); g.appendChild(b); });
    root.appendChild(g);
  }
  // --- うんてんし さん ---
  function drive(arg, to) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li], dir = to > arg.si ? 1 : -1;
    let cur = arg.si, mode = 'stop', x = 0, v = 0, D = 0, done = false, score = [], atcT = 0, atcF = 0, last = performance.now(), phase = 'ready', msg = '';
    const legLen = () => Math.max(300, Math.abs(T.stops[cur + dir].s - T.stops[cur].s) / 0.25);
    clear('🎚️ うんてんし さん', `${T.stops[cur].n} → ${T.stops[to].n}（${T.short}）`, 'eki ' + T.k);
    const cv = document.createElement('canvas'); cv.width = 720; cv.height = 405; cv.className = 'diocv cab'; root.appendChild(cv);
    const info = el('div', 'price', ''); root.appendChild(info);
    const g = cv.getContext('2d');
    const row = el('div', 'brow cabbtn');
    const mk = (lab, m, cls) => { const b = btn(lab, 'sbig ' + cls, () => { if (phase !== 'run') return; mode = m; [...row.children].forEach((c) => c.classList.toggle('on', c === b)); api.tone && api.tone(m === 'power' ? 660 : m === 'brake' ? 330 : 500, 0.06, 'square', 0.03); }); return b; };
    row.appendChild(mk('🚀 すすむ', 'power', 'pw')); row.appendChild(mk('🆓 そのまま', 'coast', 'sub')); row.appendChild(mk('✋ ブレーキ', 'brake', 'bk'));
    root.appendChild(row);
    const go = btn('▶ しゅっぱつ しんこう！', 'sbig', () => startLeg()); root.appendChild(go);
    say('👩', 'ママ「🚀 で はやく、✋ で とまるよ。えきの あかい ばんの ところで ぴったり とめてね」');
    function startLeg() { D = legLen(); x = 0; v = 0; mode = 'power'; phase = 'run'; go.hidden = true; [...row.children].forEach((c, i) => c.classList.toggle('on', i === 0)); [0, 0.2].forEach((d) => api.tone && api.tone(880, 0.15, 'sine', 0.05, null, d)); }
    function stopped() {
      const rest = D - x; phase = 'wait';
      if (rest > 25) { msg = `まだ えき まで ${Math.round(rest)}メートル。🚀 で もう すこし すすもう`; phase = 'run'; return; }
      let r; if (Math.abs(rest) < 1) r = ['💮', 'ぴったり！ すごい うんてんし さん']; else if (Math.abs(rest) < 3) r = ['◎', 'じょうず！']; else if (Math.abs(rest) < 10) r = ['○', 'よく できました']; else r = ['△', rest < 0 ? 'ちょっと いきすぎ…' : 'ちょっと てまえ…'];
      score.push(r[0]); msg = `${r[0]} ${r[1]}（ずれ ${Math.abs(rest).toFixed(1)}メートル）`;
      [0, 0.18].forEach((d) => api.tone && api.tone(988, 0.2, 'sine', 0.05, null, d));
      cur += dir;
      if (cur === to) { done = true; info.innerHTML = `🚉 ${T.stops[cur].n} に とうちゃく！ ${msg}`; root.appendChild(el('div', 'prize', `<i>${score.includes('💮') ? '🏅' : '🚇'}</i><b>うんてん おつかれさま！</b><span>${score.join(' ')}</span>`)); root.appendChild(btn('🚶 おりて そとへ でる', 'sbig', () => api.onClose({ trainTo: { li: arg.li, si: to } }))); }
      else { go.hidden = false; go.textContent = `▶ つぎの ${T.stops[cur + dir].n} へ しゅっぱつ`; }
    }
    function frame(now) {
      if (!root.contains(cv)) return;
      const dt = Math.min(0.05, (now - last) / 1000) * 2.2; last = now;  // ゲーム では 2.2ばい で すすむ
      if (phase === 'run') {
        const a = mode === 'power' ? (v < 8 ? 1.0 : 0.6) : mode === 'brake' ? -1.1 : -0.05;
        v = Math.max(0, v + a * dt); if (v * 3.6 > 62) { v = 60 / 3.6; if ((atcT -= dt) < 0) { atcT = 1; api.tone && api.tone(1500, 0.1, 'square', 0.03); } atcF = 1.2; }
        x += v * dt;
        if (x >= D + 25) { x = D + 25; v = 0; stopped(); }
        else if (v === 0 && mode !== 'power' && x > 5) stopped();
        atcF = Math.max(0, atcF - dt);
      }
      // え
      const W = 720, H = 405, cx = W / 2, hz = 170, near = D - x, nm = T.stops[Math.min(Math.max(cur + (phase === 'run' ? dir : 0), 0), T.stops.length - 1)].n;
      g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
      const off = (x % 20);
      for (let k = 12; k >= 1; k--) { const z = k * 20 - off, sc = 220 / Math.max(4, z); const w = 9 * sc, h = 6 * sc; g.strokeStyle = `rgba(150,150,150,${Math.min(1, 2.5 / k)})`; g.lineWidth = Math.max(1, sc * 0.3); g.strokeRect(cx - w / 2, hz - h * 0.45, w, h); if (k % 2 === 0) { g.fillStyle = 'rgba(255,240,160,.8)'; g.fillRect(cx - w / 2 + 2, hz - h * 0.45 + 2, Math.max(2, sc * 0.4), Math.max(2, sc * 0.2)); } }
      g.strokeStyle = '#8d7b68'; g.lineWidth = 3; [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(cx + sd * 6, hz); g.lineTo(cx + sd * 260, H); g.stroke(); });
      if (near < 260 && phase !== 'ready') { // ホーム と とまる いち の ばん
        const z0 = Math.max(4, near - 60), z1 = Math.max(4, near + 40), s0 = 220 / z0, s1 = 220 / z1;
        g.fillStyle = '#ced4da'; g.beginPath(); g.moveTo(cx - 4.5 * s1, hz + 2 * s1); g.lineTo(cx - 4.5 * s0 - 40, hz + 2 * s0); g.lineTo(cx - 4.5 * s0 - 40, H); g.lineTo(cx - 4.5 * s1, hz + 2.6 * s1); g.fill();
        const zs = Math.max(3, near), ss = 220 / zs; g.fillStyle = '#e03131'; g.fillRect(cx - 4.2 * ss, hz - 1.4 * ss, 0.9 * ss, 0.7 * ss); g.fillStyle = '#fff'; g.font = `bold ${Math.max(8, Math.min(40, ss * 0.35))}px sans-serif`; g.textAlign = 'center'; g.fillText('とまる', cx - 3.75 * ss, hz - 0.9 * ss);
        if (near < 120) { g.fillStyle = '#fff'; g.fillRect(cx - 4.5 * (220 / Math.max(4, near - 20)) - 30, hz - 2.6 * (220 / Math.max(4, near - 20)), 140, 34); g.fillStyle = '#1c2b4a'; g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText(nm, cx - 4.5 * (220 / Math.max(4, near - 20)) - 22, hz - 2.6 * (220 / Math.max(4, near - 20)) + 24); }
      }
      // メーター
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, H - 70, W, 70); g.fillStyle = '#ffd43b'; g.font = 'bold 30px sans-serif'; g.textAlign = 'left'; g.fillText(`${Math.round(v * 3.6)} キロ`, 16, H - 26);
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'right'; g.fillText(phase === 'ready' || done ? '' : `${nm} まで あと ${Math.max(0, Math.round(near))}メートル`, W - 16, H - 28);
      g.textAlign = 'center'; g.font = 'bold 18px sans-serif'; g.fillStyle = '#74c0fc'; g.fillText(mode === 'power' ? '🚀 すすむ' : mode === 'brake' ? '✋ ブレーキ' : '🆓 そのまま', cx, H - 26);
      if (!done) info.innerHTML = msg || (phase === 'ready' ? '▶ を おすと しゅっぱつ！' : (phase === 'run' && mode !== 'brake' && v > 1 && near - v * v / 2.2 < 7) ? '✋ いま ブレーキ！' : near < 300 ? '🚉 もうすぐ えき！ あかい「とまる」で とまろう' : '🚇 トンネルの なか を はしってるよ');
      if (phase === 'run' && v > 0.5) msg = '';
      if (atcF > 0) { g.fillStyle = 'rgba(224,49,49,.85)'; g.fillRect(cx - 150, 20, 300, 40); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('⚠️ せいげん 60キロ！', cx, 48); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  // --- しゃしょう さん ---
  async function conductor(arg, to) {
    const { clear, el, btn, api, root } = K, T = api.trains[arg.li], dir = to > arg.si ? 1 : -1;
    let cur = arg.si, ok = 0, n = 0;
    const draw = (sub) => clear('🎤 しゃしょう さん', sub, 'eki ' + T.k);
    const people = ['🧑', '👵', '🧒', '👨‍💼', '👩‍🦰', '👴'];
    const waitBtn = (label) => new Promise((res) => { const b = btn(label, 'sbig', () => { b.remove(); res(); }); root.appendChild(b); });
    while (cur !== to) {
      draw(`${T.stops[cur].n} えき ・ ${T.short}`);
      const plat = el('div', 'plat', `<div class="car">${'<span class="dr">🚪</span>'.repeat(3)}</div><div class="ppl">${people.slice(0, 3 + (cur % 3)).map((p) => `<span>${p}</span>`).join('')}</div>`); root.appendChild(plat);
      say('🧑‍✈️', 'うんてんし さん「ていしゃ しました。ドアを おねがいします」');
      await waitBtn('🚪 ドアを あける');
      plat.classList.add('open'); api.tone && api.tone(660, 0.25, 'sine', 0.05); api.tone && api.tone(523, 0.3, 'sine', 0.05, null, 0.3);
      await wait(1600); if (!root.contains(plat)) return;
      plat.querySelector('.ppl').classList.add('in');
      await waitBtn('🔔 はっしゃ ベル を ならす');
      for (let k = 0; k < 8; k++) api.tone && api.tone(1046, 0.1, 'square', 0.025, null, k * 0.12);
      await wait(1100);
      await waitBtn('🚪 ドアを しめる');
      plat.classList.remove('open'); api.tone && api.tone(440, 0.4, 'triangle', 0.05);
      await wait(700);
      root.appendChild(el('p', 'desc', '☝️「ドア よし！ しゅっぱつ しんこう！」'));
      await waitBtn('☝️ ゆびさし かくにん');
      // はしる あいだ の アナウンス
      const nx = T.stops[cur + dir];
      draw('🚇 はしってるよ。アナウンス を しよう');
      const tn = el('div', 'tunnel', '<div class="lights"></div><div class="sign"></div><div class="me">🎤</div>'); root.appendChild(tn);
      root.appendChild(el('div', 'price', '🔊「つぎは ……？」 ただしい えき を えらんでね'));
      const others = T.stops.map((s) => s.n).filter((m) => m !== nx.n).sort(() => Math.random() - 0.5).slice(0, 2);
      const ch = [nx.n].concat(others).sort(() => Math.random() - 0.5);
      const ans = await new Promise((res) => { const gg = el('div', 'kgrid2'); ch.forEach((c) => { const b = el('button', 'kitem', `<span>つぎは ${c}</span>`); b.addEventListener('click', () => res(c)); gg.appendChild(b); }); root.appendChild(gg); });
      n++; if (ans === nx.n) { ok++; api.tone && api.tone(880, 0.15, 'sine', 0.06); api.tone && api.tone(1175, 0.25, 'sine', 0.06, null, 0.15); root.appendChild(el('p', 'desc', `💮 せいかい！「つぎは ${nx.n}、${nx.n} です」`)); }
      else root.appendChild(el('p', 'desc', `🙂 おしい！ つぎは「${nx.n}」だよ`));
      await wait(1800); if (!root.contains(tn)) return;
      cur += dir;
    }
    draw(`${T.stops[to].n} に とうちゃく`);
    root.appendChild(el('div', 'prize', `<i>${ok === n ? '🏅' : '🎤'}</i><b>しゃしょう さん おつかれさま！</b><span>アナウンス ${ok} / ${n} せいかい</span>`));
    root.appendChild(btn('🚶 おりて そとへ でる', 'sbig', () => api.onClose({ trainTo: { li: arg.li, si: to } })));
  }

  // ================= ひかわまる・よこはま みなと はくぶつかん・みつびし みなとみらい ぎじゅつかん =================
  // ねだん は めやす。あおちゃん（みしゅうがくじ）は むりょう、ママ の ぶん だけ はらう。
  function museumGate(title, sub, adult, open) {
    const { clear, el, btn, api, root } = K;
    clear(title, sub, 'maru');
    root.appendChild(el('div', 'fare', `👩 ママ（おとな）： <em>${K.yen(adult)}</em><br>🧢 あおちゃん（しょうがっこう に はいる まえ）： <em>0えん</em> ✨<br><small>ねだん は めやす だよ</small>`));
    root.appendChild(btn('🎫 にゅうかん する（' + K.yen(adult) + '）', 'sbig', () => K.pay(adult, title.replace(/^\S+\s/, '') + ' おとな 1まい', open, () => museumGate(title, sub, adult, open))));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function exhibits(title, sub, intro, items, back) {
    const { clear, el, btn, api, root } = K;
    clear(title, sub, 'maru'); say(intro[0], intro[1]);
    const g = el('div', 'kgrid2');
    items.forEach((it) => { const b = el('button', 'kitem', `<i>${it.e}</i><span>${it.n}</span>`); b.addEventListener('click', () => { K.sfx('door'); it.f(); }); g.appendChild(b); });
    root.appendChild(g); root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function card(title, e, text, back, extra) {
    const { clear, el, btn, root } = K;
    clear(title, '', 'maru'); root.appendChild(el('div', 'ehon', `<i>${e}</i><p>${text}</p>`));
    if (extra) extra();
    root.appendChild(btn('← もどる', 'sbig sub', back));
  }
  // --- ひかわまる ---
  function hikawa() { museumGate('🚢 にっぽん ゆうせん ひかわまる', 'やました こうえん の まえ', 300, hikawaIn); }
  function hikawaIn() {
    const back = hikawaIn, hn = (f, d) => K.api.tone && K.api.tone(f, d, 'sawtooth', 0.05);
    exhibits('🚢 ひかわまる の なか', 'むかしの おおきな きゃくせん', ['🧑‍✈️', 'ガイドさん「ひかわまる は 1930ねん に うまれた ふね。アメリカの シアトル まで、ひと や にもつ を はこんだんだよ」'], [
      { e: '🍽️', n: 'いっとう しょくどう', f: () => card('🍽️ いっとう しょくどう', '🍽️🕯️', 'ながい テーブル で、おきゃくさん が コース の ごはん を たべた ところ。おしゃれ な もよう が いっぱい。', back) },
      { e: '🛋️', n: 'いっとう しゃこうしつ', f: () => card('🛋️ いっとう しゃこうしつ', '🛋️🎹', 'おきゃくさん が おしゃべり したり、おんがく を きいたり した ひろい へや。', back) },
      { e: '🛏️', n: 'きゃくしつ', f: () => card('🛏️ きゃくしつ', '🛏️🧳', 'なんにち も かけて うみを わたる あいだ、ここで ねむったんだね。', back) },
      { e: '🧭', n: 'ブリッジ（そうだしつ）', f: () => card('🧭 ブリッジ', '🧭☸️', 'せんちょう さん が ふね を うごかす ところ。きてき を ならして みよう！', back, () => K.root.appendChild(K.btn('📯 きてき ボーッ', 'sbig', () => { hn(110, 1.4); hn(165, 1.4); }))) },
      { e: '⚙️', n: 'きかんしつ', f: () => card('⚙️ きかんしつ', '⚙️🔧', 'おおきな エンジン が ふね を うごかした ところ。せんそう の ときは けが した ひと を はこぶ びょういんせん にも なった。いまは くに の じゅうよう ぶんかざい。', back) },
    ], back);
  }
  // --- よこはま みなと はくぶつかん ---
  function minato() { museumGate('⚓ よこはま みなと はくぶつかん', 'にっぽんまる メモリアルパーク', 500, minatoIn); }
  function minatoIn() {
    const back = minatoIn;
    exhibits('⚓ よこはま みなと はくぶつかん', 'みなと の れきし と ふね', ['🧑‍🏫', 'がくげいいん さん「よこはま の みなと は 1859ねん に ひらかれたんだ。いまは せかい じゅう から ふね が くるよ」'], [
      { e: '📜', n: 'みなと の れきし', f: () => card('📜 みなと の れきし', '⛵➡️🚢', 'むかし は ほで はしる ふね。いまは おおきな コンテナせん や クルーズせん。おおさんばし には おおきな ふね が とまるよ。', back) },
      { e: '🏗️', n: 'コンテナ クレーン ゲーム', f: craneGame },
      { e: '🚢', n: 'ふね の しゅるい', f: () => card('🚢 ふね の しゅるい', '🚢⛴️🛳️🚤', 'にもつ を はこぶ コンテナせん、くるま も のれる フェリー、たのしい クルーズせん、おおきな ふね を おす タグボート。', back) },
    ], back);
  }
  function craneGame() {
    const { clear, el, btn, api, root } = K;
    clear('🏗️ コンテナ クレーン ゲーム', 'ふね の うえ に コンテナ を 6こ つもう', 'maru');
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 360; cv.className = 'diocv'; root.appendChild(cv); const g = cv.getContext('2d');
    let hx = 100, hy = 60, carry = true, drop = false, vy = 0, stack = [], dirX = 1, msg = '⬇️ で おとす';
    const info = el('div', 'price', 'コンテナ が うごいて いるよ。ふね の うえ で ⬇️'); root.appendChild(info);
    const COLS = ['#e03131', '#1c7ed6', '#2f9e44', '#f59f00', '#7048e8', '#e64980'];
    let last = performance.now();
    function frame(now) {
      if (!root.contains(cv)) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (carry) { hx += dirX * 140 * dt; if (hx > 520) dirX = -1; if (hx < 80) dirX = 1; }
      if (drop) { vy += 600 * dt; hy += vy * dt; const top = 270 - stack.length * 26; if (hy + 26 >= top) { const onShip = hx > 220 && hx < 420; const prev = stack[stack.length - 1]; const ok = onShip && (!prev || Math.abs(prev - hx) < 40); drop = false; if (ok) { stack.push(hx); api.tone && api.tone(300, 0.12, 'square', 0.05); info.textContent = stack.length >= 6 ? '🎉 6こ つめた！ りっぱ な クレーン の うんてんしゅ！' : `👍 ${stack.length}こ め！`; if (stack.length >= 6) { api.confetti && api.confetti(); } } else { info.textContent = '💦 うみ に おちちゃった… もういちど'; api.tone && api.tone(200, 0.3, 'sine', 0.05, 100); } if (stack.length < 6) { carry = true; hy = 60; vy = 0; } } }
      g.fillStyle = '#a5d8ff'; g.fillRect(0, 0, 600, 360); g.fillStyle = '#1c7ed6'; g.fillRect(0, 290, 600, 70);
      g.fillStyle = '#495057'; g.fillRect(210, 270, 220, 26); g.beginPath(); g.moveTo(210, 296); g.lineTo(230, 320); g.lineTo(410, 320); g.lineTo(430, 296); g.fill();
      g.fillStyle = '#e03131'; g.fillRect(40, 20, 540, 14); g.fillRect(40, 20, 14, 270);
      stack.forEach((sx, i) => { g.fillStyle = COLS[i % 6]; g.fillRect(sx - 40, 270 - (i + 1) * 26, 80, 24); });
      if (stack.length < 6) { g.strokeStyle = '#212529'; g.beginPath(); g.moveTo(hx, 34); g.lineTo(hx, hy); g.stroke(); g.fillStyle = COLS[stack.length % 6]; g.fillRect(hx - 40, hy, 80, 24); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    root.appendChild(btn('⬇️ おとす', 'sbig', () => { if (carry && stack.length < 6) { carry = false; drop = true; vy = 0; } }));
    root.appendChild(btn('🔁 さいしょ から', 'sbig sub', craneGame));
    root.appendChild(btn('← もどる', 'sout', minatoIn));
  }
  // --- みつびし みなとみらい ぎじゅつかん ---
  function mhi() { museumGate('🚀 みつびし みなとみらい ぎじゅつかん', 'みなとみらい 3ちょうめ', 500, mhiIn); }
  function mhiIn() {
    const back = mhiIn;
    exhibits('🚀 みつびし みなとみらい ぎじゅつかん', 'ロケット・ひこうき・しんかい', ['👩‍🔬', 'おねえさん「ここ では、ロケット や ひこうき、ふかい うみ に もぐる ふね の しくみ が わかるよ」'], [
      { e: '🚀', n: 'ロケット を うちあげる', f: rocket },
      { e: '🌊', n: 'しんかい 6500 で もぐる', f: deepSea },
      { e: '✈️', n: 'ひこうき の つばさ', f: () => card('✈️ ひこうき の つばさ', '✈️💨', 'つばさ の うえ と した で かぜ の はやさ が ちがう から、ひこうき は うきあがるんだよ。', back) },
    ], back);
  }
  async function rocket() {
    const { clear, el, btn, api, root } = K;
    clear('🚀 ロケット はっしゃ', 'カウントダウン を しよう', 'maru');
    const r = el('div', 'rocket', '🚀'); root.appendChild(r); const c = el('div', 'price', 'ボタン で カウントダウン！'); root.appendChild(c);
    const b = btn('🔟 カウントダウン スタート', 'sbig', async () => {
      b.remove();
      for (let k = 10; k >= 0; k--) { c.textContent = k ? `${k}…` : 'はっしゃ！ 🔥'; api.tone && api.tone(k ? 600 : 200, k ? 0.12 : 1.2, k ? 'square' : 'sawtooth', 0.05); await wait(450); if (!root.contains(r)) return; }
      r.classList.add('fly'); await wait(1600);
      c.textContent = '🌍 うちゅう に とどいた！ ロケット は じんこうえいせい を はこぶ んだよ'; api.confetti && api.confetti();
      root.appendChild(btn('← もどる', 'sbig sub', mhiIn));
    });
    root.appendChild(b);
  }
  function deepSea() {
    const { clear, el, btn, api, root } = K;
    clear('🌊 しんかい 6500', 'ふかい うみ の そこ へ もぐろう', 'maru');
    let d = 0; const box = el('div', 'deep', '<span class="sub">🛸</span><span class="fish"></span>'); root.appendChild(box);
    const c = el('div', 'price', 'すいしん 0メートル'); root.appendChild(c);
    const LIFE = [[0, '🐟 ひかり の ある あさい うみ'], [200, '🐙 すこし くらく なって きた'], [1000, '🦑 まっくら！ ひかる いきもの'], [3000, '🦐 しんかい の エビ'], [6000, '🪸 うみ の そこ に ついた！']];
    const go = (n) => { d = Math.max(0, Math.min(6500, d + n)); const L = LIFE.filter((l) => l[0] <= d).pop(); c.textContent = `すいしん ${d}メートル ・ ${L[1]}`; box.style.background = `linear-gradient(hsl(205,70%,${Math.max(4, 55 - d / 130)}%), hsl(215,80%,${Math.max(2, 35 - d / 200)}%))`; box.querySelector('.fish').textContent = L[1].split(' ')[0]; api.tone && api.tone(180 - d / 60, 0.2, 'sine', 0.04); if (d >= 6500) { c.textContent = '🏁 6500メートル！ しんかい 6500 が もぐれる いちばん ふかい ところ'; api.confetti && api.confetti(); } };
    root.appendChild(btn('⬇️ もぐる（+500メートル）', 'sbig', () => go(500)));
    root.appendChild(btn('⬆️ うく', 'sbig sub', () => go(-1000)));
    root.appendChild(btn('← もどる', 'sout', mhiIn));
    go(0);
  }
  window.Odekake = {
    open(kind, ctx, arg) {
      K = ctx;
      if (kind === 'cupnoodle') cupnoodle();
      else if (kind === 'nipponmaru') nipponmaru();
      else if (kind === 'chuka') chuka();
      else if (kind === 'byo') byo(arg);
      else if (kind === 'train') eki(arg);
      else if (kind === 'hara') hara();
      else if (kind === 'hikawa') hikawa();
      else if (kind === 'minato') minato();
      else if (kind === 'mhi') mhi();
    },
    has: (kind) => ['cupnoodle', 'nipponmaru', 'chuka', 'byo', 'train', 'hara', 'hikawa', 'minato', 'mhi'].includes(kind),
    cups: () => O.cups.slice(), cupGrid: () => cupGrid(),
  };
})();
