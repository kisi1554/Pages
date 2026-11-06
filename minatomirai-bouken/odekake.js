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
      ride(arg, to);
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
  window.Odekake = {
    open(kind, ctx, arg) {
      K = ctx;
      if (kind === 'cupnoodle') cupnoodle();
      else if (kind === 'nipponmaru') nipponmaru();
      else if (kind === 'chuka') chuka();
      else if (kind === 'byo') byo(arg);
      else if (kind === 'train') eki(arg);
    },
    has: (kind) => ['cupnoodle', 'nipponmaru', 'chuka', 'byo', 'train'].includes(kind),
    cups: () => O.cups.slice(), cupGrid: () => cupGrid(),
  };
})();
