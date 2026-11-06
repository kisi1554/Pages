'use strict';
/* おみせ: おさいふ・レジ（おつり）・トイザらス（マークイズ 3かい）・ワールドポーターズ（ガチャガチャ・えいがかん）・エアキャビン の きっぷ
   しょうひんの なまえ・ねだん は ゲームようの もの（ほんものの おみせの ねだんでは ない）。
   えいがは この アプリで つくった オリジナルの みじかい アニメ。 */
(function () {
  const DENOM = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
  const yen = (n) => n.toLocaleString() + 'えん';
  let root, api, onKey = null;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const btn = (label, cls, fn) => { const b = el('button', cls || 'sbig', label); b.addEventListener('click', fn); return b; };
  const sfx = (n) => api && api.sfx && api.sfx(n);
  function clear(title, sub, bg) {
    root.innerHTML = ''; root.className = 'sroom ' + (bg || '');
    const h = el('div', 'shead', `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`);
    root.appendChild(h); root.scrollTop = 0; return h;
  }
  function moneyEl(d, small) { // おさつ と こうか の え
    if (d >= 1000) return el('span', 'bill b' + d + (small ? ' sm' : ''), `<i>${d.toLocaleString()}</i><small>えん</small>`);
    return el('span', 'coin c' + d + (small ? ' sm' : ''), String(d));
  }
  function toast(t) {
    let b = document.getElementById('sToast');
    if (!b) { b = el('div', 'ktoast'); b.id = 'sToast'; document.body.appendChild(b); }
    b.textContent = t; b.classList.add('show'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 1800);
  }
  function walletRow(w, onTap) {
    const row = el('div', 'wrow');
    DENOM.forEach((d) => {
      const n = w[d] || 0; if (!n) return;
      const g = el('button', 'wslot'); g.appendChild(moneyEl(d)); g.appendChild(el('b', '', '×' + n));
      if (onTap) g.addEventListener('click', () => onTap(d)); else g.disabled = true;
      row.appendChild(g);
    });
    if (!row.children.length) row.appendChild(el('div', 'wempty', 'おさいふは からっぽ…'));
    return row;
  }
  function change(amount) { const out = {}; [5000, 1000, 500, 100, 50, 10, 5, 1].forEach((d) => { const n = Math.floor(amount / d); if (n) { out[d] = n; amount -= n * d; } }); return out; }
  function addTo(w, m, sign) { const r = Object.assign({}, w); for (const d in m) { r[d] = (r[d] || 0) + sign * m[d]; if (!r[d]) delete r[d]; } return r; }
  const sum = (m) => Object.keys(m).reduce((s, d) => s + d * m[d], 0);

  // ---------------- レジ（はらう）----------------
  function pay(price, what, done, cancel) {
    let tray = {};
    const draw = () => {
      clear('🧾 レジ', what, 'reg');
      const w = addTo(api.wallet.get(), tray, -1), paid = sum(tray);
      root.appendChild(el('div', 'price', `おかいけい <b>${yen(price)}</b>`));
      const tr = el('div', 'tray'); tr.appendChild(el('div', 'tlabel', `トレー： ${yen(paid)}` + (paid >= price ? ' ✅' : `（あと ${yen(price - paid)}）`)));
      const tw = el('div', 'wrow');
      DENOM.forEach((d) => { if (!tray[d]) return; const g = el('button', 'wslot'); g.appendChild(moneyEl(d)); g.appendChild(el('b', '', '×' + tray[d])); g.addEventListener('click', () => { tray[d]--; if (!tray[d]) delete tray[d]; sfx('tap'); draw(); }); tw.appendChild(g); });
      if (!tw.children.length) tw.appendChild(el('div', 'wempty', 'おさいふの おかねを タップして トレーに だしてね'));
      tr.appendChild(tw); root.appendChild(tr);
      root.appendChild(el('div', 'tlabel', '👛 おさいふ（タップで だす）'));
      root.appendChild(walletRow(w, (d) => { tray[d] = (tray[d] || 0) + 1; sfx('coin'); draw(); }));
      if (api.wallet.total() < price) root.appendChild(el('p', 'warn', `おかねが たりないよ（もっているのは ${yen(api.wallet.total())}）。くもんの プリントで 1000えん もらえるよ ✏️`));
      const row = el('div', 'brow');
      row.appendChild(btn('🤖 おまかせ', 'sbig sub', () => {
        // ちょうど か、すこし おおめに なるように だす
        const have = api.wallet.get(); tray = {}; let rest = price;
        [10000, 5000, 1000, 500, 100, 50, 10, 5, 1].forEach((d) => { let n = Math.min(have[d] || 0, Math.floor(rest / d)); if (n) { tray[d] = n; rest -= n * d; } });
        if (rest > 0) { const up = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000].find((d) => d >= rest && (have[d] || 0) > (tray[d] || 0)); if (up) tray[up] = (tray[up] || 0) + 1; }
        draw();
      }));
      const ok = btn(paid >= price ? '💴 これで はらう' : 'たりないよ', 'sbig' + (paid >= price ? '' : ' dim'), () => {
        if (paid < price) { toast(`あと ${yen(price - paid)} だしてね`); return; }
        const ch = change(paid - price);
        api.wallet.set(addTo(addTo(api.wallet.get(), tray, -1), ch, 1));
        sfx('coin');
        clear('🧾 ありがとう ございました！', what, 'reg');
        root.appendChild(el('div', 'price', `はらった おかね <b>${yen(paid)}</b><br>おつり <b>${yen(paid - price)}</b>`));
        const cr = el('div', 'wrow'); Object.keys(ch).sort((a, b) => b - a).forEach((d) => { const g = el('span', 'wslot'); g.appendChild(moneyEl(+d)); g.appendChild(el('b', '', '×' + ch[d])); cr.appendChild(g); });
        if (cr.children.length) root.appendChild(cr);
        root.appendChild(el('div', 'tlabel', `👛 のこり ${yen(api.wallet.total())}`));
        root.appendChild(btn('▶ つぎへ', 'sbig', () => done()));
      });
      row.appendChild(ok); root.appendChild(row);
      root.appendChild(btn('← やめる', 'sout', () => cancel()));
    };
    draw();
  }

  // ---------------- おさいふ を みる ----------------
  function walletView() {
    clear('👛 あおちゃんの おさいふ', 'ぜんぶで ' + yen(api.wallet.total()));
    root.appendChild(walletRow(api.wallet.get()));
    const items = api.wallet.items();
    root.appendChild(el('div', 'tlabel', '🎁 かったもの'));
    const g = el('div', 'igrid');
    items.forEach((id) => { const t = TOYS.find((x) => x.id === id); if (t) g.appendChild(el('div', 'icard', `${toySvg(t, 90)}<span>${t.name}</span>`)); });
    if (!items.length) g.appendChild(el('div', 'wempty', 'まだ なにも かっていないよ'));
    root.appendChild(g);
    const gc = api.wallet.gacha(), ks = Object.keys(gc);
    root.appendChild(el('div', 'tlabel', `🥚 ガチャの コレクション（${ks.length}/${PRIZES.length}）`));
    const pg = el('div', 'pgrid');
    PRIZES.forEach((p) => pg.appendChild(el('div', 'pcard' + (gc[p.id] ? '' : ' none'), gc[p.id] ? `<i>${p.e}</i><span>${p.name}</span><b>×${gc[p.id]}</b>` : '<i>❔</i><span>？？？</span>')));
    root.appendChild(pg);
    root.appendChild(btn('とじる', 'sbig', () => api.onClose()));
  }

  // ---------------- トイザらス（プラレール）----------------
  const TOYS = [
    { id: 'e5', name: 'しんかんせん E5けい はやぶさ', price: 2500, body: '#2e8b57', band: '#e64980', nose: 1 },
    { id: 'n700', name: 'しんかんせん N700S', price: 2500, body: '#ffffff', band: '#1c4fd0', nose: 1 },
    { id: 'yellow', name: 'ドクターイエロー', price: 2800, body: '#ffd43b', band: '#1c4fd0', nose: 1 },
    { id: 'e6', name: 'しんかんせん E6けい こまち', price: 2500, body: '#e03131', band: '#ffffff', nose: 1 },
    { id: 'blue', name: 'ブルーライン（ちかてつ）', price: 2000, body: '#f1f3f5', band: '#1971c2' },
    { id: 'mm', name: 'みなとみらいせん', price: 2000, body: '#f1f3f5', band: '#0b2a6b' },
    { id: 'tokyu', name: 'とうきゅう でんしゃ', price: 2000, body: '#dee2e6', band: '#e03131' },
    { id: 'sl', name: 'きかんしゃ（SL）', price: 2200, body: '#212529', band: '#c92a2a', sl: 1 },
    { id: 'fumikiri', name: 'カンカン ふみきり', price: 980, acc: '🚦' },
    { id: 'bridge', name: 'てっきょう', price: 1500, acc: '🌉' },
    { id: 'station', name: 'えき の ホーム', price: 1800, acc: '🚉' },
    { id: 'rail', name: 'まがり レール セット', price: 800, acc: '➰' },
    { id: 'basic', name: 'でんしゃと レールの ベーシックセット', price: 4500, body: '#4dabf7', band: '#ffffff', set: 1 },
    { id: 'big', name: 'おおきな えきと トンネルの セット', price: 6800, body: '#e8590c', band: '#ffe066', set: 1 },
  ];
  function toySvg(t, w) {
    w = w || 120; const h = w * 0.55;
    if (t.acc) return `<svg viewBox="0 0 120 66" width="${w}" height="${h}"><rect x="2" y="2" width="116" height="62" rx="10" fill="#fff3bf"/><text x="60" y="48" font-size="40" text-anchor="middle">${t.acc}</text></svg>`;
    const nose = t.nose ? '<path d="M86 18 h14 q16 0 18 26 h-32z" fill="BODY"/><rect x="96" y="24" width="10" height="7" rx="2" fill="#1c2b4a"/>' : '<rect x="86" y="18" width="30" height="26" rx="5" fill="BODY"/><rect x="104" y="22" width="9" height="9" rx="2" fill="#1c2b4a"/>';
    const sl = t.sl ? '<rect x="20" y="6" width="10" height="14" fill="#343a40"/><circle cx="25" cy="5" r="5" fill="#ced4da"/>' : '';
    return `<svg viewBox="0 0 120 66" width="${w}" height="${h}">${sl}<rect x="4" y="18" width="86" height="26" rx="5" fill="BODY"/>${nose}
      <rect x="4" y="34" width="112" height="5" fill="${t.band}"/>${[14, 32, 50, 68].map((x) => `<rect x="${x}" y="23" width="12" height="8" rx="2" fill="#a5d8ff"/>`).join('')}
      ${[18, 40, 66, 96].map((x) => `<circle cx="${x}" cy="48" r="6" fill="#343a40"/><circle cx="${x}" cy="48" r="2" fill="#adb5bd"/>`).join('')}
      <rect x="0" y="56" width="120" height="6" rx="3" fill="#1971c2"/></svg>`.replace(/BODY/g, t.body);
  }
  function toys() {
    const cart = [];
    const list = () => {
      clear('🧸 トイザらス', 'マークイズ みなとみらい 3かい ・ プラレール うりば', 'toy');
      root.appendChild(el('div', 'tlabel', `👛 ${yen(api.wallet.total())}　🛒 かご ${cart.length}こ（${yen(cart.reduce((s, t) => s + t.price, 0))}）`));
      const g = el('div', 'tgrid');
      TOYS.forEach((t) => {
        const own = api.wallet.items().includes(t.id), inCart = cart.includes(t);
        const c = el('button', 'tcard' + (inCart ? ' in' : ''), `${toySvg(t)}<span>${t.name}</span><b>${yen(t.price)}</b>${own ? '<em>もってる</em>' : ''}${inCart ? '<em class="c">かごの なか</em>' : ''}`);
        c.addEventListener('click', () => look(t));
        g.appendChild(c);
      });
      root.appendChild(g);
      const row = el('div', 'brow');
      row.appendChild(btn('🧾 レジへ', 'sbig' + (cart.length ? '' : ' dim'), () => {
        if (!cart.length) { toast('ほしい ものを えらんで かごに いれてね'); return; }
        const total = cart.reduce((s, t) => s + t.price, 0);
        pay(total, cart.map((t) => t.name).join('・'), () => {
          cart.forEach((t) => api.wallet.addItem(t.id)); api.confetti && api.confetti(); sfx('big');
          clear('🎁 かえた！', 'トイザらスの ふくろに いれて もらったよ', 'toy');
          const g2 = el('div', 'igrid'); cart.forEach((t) => g2.appendChild(el('div', 'icard', `${toySvg(t, 100)}<span>${t.name}</span>`))); root.appendChild(g2);
          cart.length = 0;
          root.appendChild(btn('🧸 おみせに もどる', 'sbig', list)); root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
        }, list);
      }));
      root.appendChild(row);
      root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
    };
    const look = (t) => { // ながめる: レールの うえを はしらせる
      clear('👀 ' + t.name, yen(t.price), 'toy');
      const show = t.acc ? TOYS[0] : t;
      const stage = el('div', 'stage', `<svg viewBox="0 0 320 200" width="100%"><rect width="320" height="200" rx="16" fill="#e7f5ff"/>
        <path id="trk" d="M60 100 a100 70 0 1 0 200 0 a100 70 0 1 0 -200 0" fill="none" stroke="#1971c2" stroke-width="14"/>
        <path d="M60 100 a100 70 0 1 0 200 0 a100 70 0 1 0 -200 0" fill="none" stroke="#74c0fc" stroke-width="4" stroke-dasharray="6 6"/>
        ${t.acc ? `<text x="160" y="118" font-size="54" text-anchor="middle">${t.acc}</text>` : '<text x="160" y="112" font-size="16" text-anchor="middle" fill="#1c2b4a">ガタン ゴトン…</text>'}
        <g><g transform="translate(-30,-22) scale(0.5)">${toySvg(show, 120).replace(/<\/?svg[^>]*>/g, '')}</g>
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto"><mpath href="#trk"/></animateMotion></g></svg>`);
      root.appendChild(stage);
      root.appendChild(el('p', 'desc', t.acc ? 'レールに つないで あそぼう！' : (t.set ? 'でんしゃ と レール が はいった セット！ これだけで すぐ あそべるよ。' : 'ボタンを いれると レールの うえを はしるよ！')));
      const row = el('div', 'brow');
      row.appendChild(btn(cart.includes(t) ? '🛒 かごから だす' : '🛒 かごに いれる', 'sbig', () => { const i = cart.indexOf(t); if (i >= 0) cart.splice(i, 1); else cart.push(t); sfx('pick'); list(); }));
      root.appendChild(row);
      root.appendChild(btn('← たなに もどる', 'sout', list));
    };
    list();
  }

  // ---------------- ワールドポーターズ ----------------
  const PRIZES = [
    { id: 'p1', e: '🚄', name: 'しんかんせん マスコット', r: 1 }, { id: 'p2', e: '🚃', name: 'でんしゃ キーホルダー', r: 1 },
    { id: 'p3', e: '🦖', name: 'きょうりゅう フィギュア', r: 1 }, { id: 'p4', e: '🐼', name: 'パンダ ストラップ', r: 1 },
    { id: 'p5', e: '🚒', name: 'しょうぼうしゃ ミニカー', r: 1 }, { id: 'p6', e: '🦈', name: 'サメ マスコット', r: 1 },
    { id: 'p7', e: '🍙', name: 'おにぎり ストラップ', r: 1 }, { id: 'p8', e: '🚀', name: 'ロケット フィギュア', r: 2 },
    { id: 'p9', e: '🎡', name: 'かんらんしゃ ミニチュア', r: 2 }, { id: 'p10', e: '🚂', name: 'きかんしゃ ゴールド', r: 2 },
    { id: 'p11', e: '🦄', name: 'にじいろ ユニコーン', r: 3 }, { id: 'p12', e: '🌟', name: 'きんの ほし（レア！）', r: 3 },
  ];
  const GACHA = 300;
  function wp() {
    clear('🎪 よこはま ワールドポーターズ', 'どこに いく？', 'wp');
    root.appendChild(btn('🥚 ガチャガチャ コーナー<small>1かい 300えん（100えんだま 3まい）</small>', 'sbig tall', gacha));
    root.appendChild(btn('🎬 5かい えいがかん（イオンシネマ）<small>こども 1000えん</small>', 'sbig tall', cinema));
    root.appendChild(btn('👛 おさいふ・コレクション を みる', 'sbig sub', walletView));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function gacha() {
    let slot = 0;
    const draw = () => {
      clear('🥚 ガチャガチャ', '100えんだまを 3まい いれて、ハンドルを まわそう！', 'wp');
      const m = el('div', 'gmach', `<div class="gdome">${PRIZES.slice(0, 9).map((p, i) => `<span style="--i:${i}">${['🔴', '🟡', '🔵', '🟢', '🟣', '🟠'][i % 6]}</span>`).join('')}</div>
        <div class="gbody"><div class="gslot">${'●'.repeat(slot)}${'○'.repeat(3 - slot)}<small>${slot * 100}/${GACHA}えん</small></div><div class="ghandle" id="gH">↻</div></div>`);
      root.appendChild(m);
      const w = api.wallet.get();
      root.appendChild(el('div', 'tlabel', `👛 100えんだま ×${w[100] || 0}（ぜんぶで ${yen(api.wallet.total())}）`));
      const row = el('div', 'brow');
      row.appendChild(btn('🪙 100えん いれる', 'sbig' + (w[100] && slot < 3 ? '' : ' dim'), () => {
        const ww = api.wallet.get();
        if (slot >= 3) { toast('もう 300えん はいっているよ。ハンドルを まわそう'); return; }
        if (!ww[100]) { toast('100えんだまが ないよ。りょうがえき で くずそう'); return; }
        ww[100]--; api.wallet.set(ww); slot++; sfx('coin'); draw();
      }));
      row.appendChild(btn('↻ まわす', 'sbig' + (slot >= 3 ? '' : ' dim'), () => { if (slot < 3) { toast(`あと ${3 - slot}まい いれてね`); return; } spin(); }));
      root.appendChild(row);
      // りょうがえき
      const ex = el('div', 'exch', '<b>💱 りょうがえき</b><small>1000えんさつ → 100えんだま ×10</small>');
      ex.appendChild(btn('1000えん を くずす', 'sbig sub', () => {
        const ww = api.wallet.get();
        if (!ww[1000]) { if (ww[500]) { ww[500]--; ww[100] = (ww[100] || 0) + 5; api.wallet.set(ww); sfx('coin'); toast('500えんだま → 100えんだま ×5'); draw(); return; } toast('1000えんさつ が ないよ'); return; }
        ww[1000]--; ww[100] = (ww[100] || 0) + 10; api.wallet.set(ww); sfx('coin'); toast('ジャラジャラ… 100えんだま ×10！'); draw();
      }));
      root.appendChild(ex);
      root.appendChild(btn('📖 コレクション', 'sbig sub', walletView));
      root.appendChild(btn('← もどる', 'sout', () => { if (slot) { const ww = api.wallet.get(); ww[100] = (ww[100] || 0) + slot; api.wallet.set(ww); } wp(); }));
    };
    const spin = () => {
      slot = 0;
      const roll = Math.random(); const rr = roll < 0.06 ? 3 : roll < 0.3 ? 2 : 1;
      const pool = PRIZES.filter((p) => p.r === rr); const p = pool[Math.floor(Math.random() * pool.length)];
      api.wallet.addGacha(p.id);
      clear('🥚 ガチャガチャ', 'ガチャ… ガチャ… ポン！', 'wp');
      const cap = el('div', 'capsule', '<div class="ctop"></div><div class="cbot"></div>');
      root.appendChild(cap); sfx('tap');
      setTimeout(() => sfx('tap'), 250); setTimeout(() => sfx('tap'), 500);
      setTimeout(() => {
        cap.classList.add('open'); sfx(rr === 3 ? 'big' : 'star'); if (rr === 3 && api.confetti) api.confetti();
        const r = el('div', 'prize', `<i>${p.e}</i><b>${p.name}</b><span>${'⭐'.repeat(rr)}${rr === 3 ? ' レア！' : ''}</span>`);
        root.insertBefore(r, cap.nextSibling);
        root.appendChild(btn('🥚 もういっかい', 'sbig', draw));
        root.appendChild(btn('📖 コレクション', 'sbig sub', walletView));
        root.appendChild(btn('← もどる', 'sout', wp));
      }, 1100);
    };
    draw();
  }

  // ---------------- えいがかん ----------------
  const FILMS = [
    { id: 'train', title: 'でんしゃ はしれ！ みなとみらい', e: '🚃', col: '#1971c2' },
    { id: 'dino', title: 'きょうりゅうの たまご', e: '🦖', col: '#2f9e44' },
    { id: 'rocket', title: 'ロケットで つきへ いこう', e: '🚀', col: '#5f3dc4' },
    { id: 'onara', title: 'おならマン そらを とぶ', e: '💨', col: '#e8590c' },
  ];
  function cinema() {
    clear('🎬 えいがかん', 'みたい えいがを えらんでね（こども 1000えん）', 'cine');
    const g = el('div', 'fgrid');
    FILMS.forEach((f) => {
      const c = el('button', 'poster', `<i>${f.e}</i><b>${f.title}</b><small>やく 40びょう・オリジナル アニメ</small>`);
      c.style.background = f.col;
      c.addEventListener('click', () => ticket(f));
      g.appendChild(c);
    });
    root.appendChild(g);
    root.appendChild(el('p', 'desc', 'ここで みられるのは この ゲームで つくった みじかい アニメだよ。'));
    root.appendChild(btn('← もどる', 'sout', wp));
  }
  function ticket(f) {
    clear('🎟️ チケット うりば', f.title, 'cine');
    root.appendChild(btn('🎟️ チケット だけ（1000えん）', 'sbig tall', () => pay(1000, 'えいが「' + f.title + '」こども 1まい', () => watch(f, false), () => ticket(f))));
    root.appendChild(btn('🎟️＋🍿 ポップコーン つき（1500えん）', 'sbig tall', () => pay(1500, 'えいが「' + f.title + '」＋ポップコーン', () => watch(f, true), () => ticket(f))));
    root.appendChild(btn('← えいがを えらびなおす', 'sout', cinema));
  }
  function watch(f, pop) {
    root.innerHTML = ''; root.className = 'sroom theater';
    const scr = el('div', 'screen'); const c = el('canvas'); c.width = 640; c.height = 360; scr.appendChild(c);
    const cap = el('div', 'caption', ''); scr.appendChild(cap);
    root.appendChild(scr);
    root.appendChild(el('div', 'seats', (pop ? '🍿 ' : '') + '🪑🪑🧢🪑🪑🪑🪑'));
    const out = btn('🚪 とちゅうで でる', 'sout light', () => { stop(); cinema(); });
    root.appendChild(out);
    const film = FILM_PLAY[f.id]; const ctx = c.getContext('2d');
    let t0 = performance.now(), raf = 0, lastScene = -1, alive = true;
    function stop() { alive = false; cancelAnimationFrame(raf); }
    function frame(now) {
      if (!alive) return;
      if (!document.body.contains(c)) { stop(); return; }
      const t = (now - t0) / 1000; let acc = 0, si = film.length;
      for (let i = 0; i < film.length; i++) { if (t < acc + film[i].d) { si = i; break; } acc += film[i].d; }
      if (si >= film.length) { stop(); end(); return; }
      const sc = film[si], lt = t - acc;
      if (si !== lastScene) { lastScene = si; cap.textContent = sc.cap; if (sc.snd) sfx(sc.snd); }
      ctx.save(); sc.draw(ctx, 640, 360, lt, t); ctx.restore();
      // まく
      if (t < 1.2) { ctx.fillStyle = '#c92a2a'; const o = 320 * Math.min(1, t / 1.2); ctx.fillRect(0, 0, 320 - o, 360); ctx.fillRect(320 + o, 0, 320 - o, 360); }
      raf = requestAnimationFrame(frame);
    }
    function end() {
      cap.textContent = 'おしまい 🎬'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('おしまい', 320, 190);
      out.remove();
      root.appendChild(btn('👏 たのしかった！ もどる', 'sbig', cinema));
    }
    raf = requestAnimationFrame(frame);
  }
  // --- オリジナル アニメ（えがく だけ）---
  function sky(ctx, w, h, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  function emoji(ctx, e, x, y, s, rot) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.font = `${s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, 0, 0); ctx.restore(); }
  function city(ctx, w, h, off, night) {
    ctx.fillStyle = night ? '#1c2b4a' : '#adb5bd';
    for (let i = 0; i < 14; i++) { const x = ((i * 70 - off) % 980 + 980) % 980 - 120, bh = 60 + (i * 37 % 90) + (i === 4 ? 150 : 0); ctx.fillRect(x, h - 90 - bh, 54, bh);
      if (night) { ctx.fillStyle = '#ffe066'; for (let k = 0; k < bh / 18; k++) ctx.fillRect(x + 8 + (k % 3) * 14, h - 85 - bh + k * 16, 6, 6); ctx.fillStyle = '#1c2b4a'; } }
  }
  function trainSvgDraw(ctx, x, y, col) {
    ctx.fillStyle = col; ctx.fillRect(x, y, 150, 40); ctx.beginPath(); ctx.moveTo(x + 150, y); ctx.quadraticCurveTo(x + 195, y + 5, x + 200, y + 40); ctx.lineTo(x + 150, y + 40); ctx.fill();
    ctx.fillStyle = '#a5d8ff'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 10 + i * 23, y + 8, 15, 12);
    ctx.fillStyle = '#343a40'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 25 + i * 45, y + 44, 8, 0, 7); ctx.fill(); }
  }
  const FILM_PLAY = {
    train: [
      { d: 6, cap: 'ある はれた あさ。でんしゃが えきを しゅっぱつ！', snd: 'door', draw: (c, w, h, t) => { sky(c, w, h, '#74c0fc', '#d0ebff'); city(c, w, h, t * 30); c.fillStyle = '#868e96'; c.fillRect(0, h - 90, w, 90); trainSvgDraw(c, -220 + t * 90, h - 140, '#1971c2'); emoji(c, '☀️', 560, 60, 50); } },
      { d: 8, cap: 'ガタン ゴトン。うみの そばを はしるよ', draw: (c, w, h, t) => { sky(c, w, h, '#4dabf7', '#a5d8ff'); c.fillStyle = '#1c7ed6'; c.fillRect(0, h - 120, w, 120); for (let i = 0; i < 8; i++) emoji(c, '🌊', ((i * 90 - t * 40) % 720 + 720) % 720 - 40, h - 60, 30); c.fillStyle = '#495057'; c.fillRect(0, h - 140, w, 12); trainSvgDraw(c, w / 2 - 100 + Math.sin(t * 6) * 3, h - 190, '#1971c2'); emoji(c, '⛵', 520 - t * 20, h - 95, 40); emoji(c, '🕊️', 100 + t * 30, 80 + Math.sin(t * 3) * 10, 30); } },
      { d: 8, cap: 'みえてきた！ たかい たかい ランドマークタワー', snd: 'star', draw: (c, w, h, t) => { sky(c, w, h, '#ffa94d', '#ffe8cc'); c.fillStyle = '#ced4da'; const tw = 70, th = 230 + t * 4; c.fillRect(w / 2 - tw / 2, h - 90 - th, tw, th); c.fillStyle = '#adb5bd'; for (let k = 0; k < 12; k++) c.fillRect(w / 2 - 28, h - 80 - th + k * 20, 56, 6); emoji(c, '🎡', 470, h - 150, 90); c.fillStyle = '#868e96'; c.fillRect(0, h - 90, w, 90); trainSvgDraw(c, -220 + t * 110, h - 140, '#1971c2'); } },
      { d: 8, cap: 'よるに なった。まちの あかりが キラキラ', draw: (c, w, h, t) => { sky(c, w, h, '#0b1d3a', '#364fc7'); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))})`; c.fillRect((i * 97) % w, (i * 53) % 150, 3, 3); } city(c, w, h, t * 25, true); c.fillStyle = '#343a40'; c.fillRect(0, h - 90, w, 90); trainSvgDraw(c, -220 + t * 100, h - 140, '#4dabf7'); emoji(c, '🌙', 80, 60, 50); } },
      { d: 6, cap: 'しゅうてん に とうちゃく。また のってね！', snd: 'big', draw: (c, w, h, t) => { sky(c, w, h, '#0b1d3a', '#1c2b4a'); c.fillStyle = '#495057'; c.fillRect(0, h - 90, w, 90); c.fillStyle = '#ffe066'; c.fillRect(60, h - 120, 520, 10); trainSvgDraw(c, Math.min(200, -220 + t * 160), h - 140, '#4dabf7'); emoji(c, '🧢', 520, h - 150, 50); emoji(c, '👋', 560, h - 190, 30, Math.sin(t * 8) * 0.4); } },
    ],
    dino: [
      { d: 7, cap: 'もりの なかに ふしぎな たまご が ひとつ…', draw: (c, w, h, t) => { sky(c, w, h, '#69db7c', '#d3f9d8'); for (let i = 0; i < 7; i++) emoji(c, '🌳', i * 100, h - 120, 90); c.fillStyle = '#8c6a4a'; c.fillRect(0, h - 70, w, 70); emoji(c, '🥚', w / 2, h - 100, 90, Math.sin(t * 2) * 0.05); } },
      { d: 7, cap: 'ゆら ゆら… ピキッ！ なにか うごいたよ', snd: 'tap', draw: (c, w, h, t) => { sky(c, w, h, '#69db7c', '#d3f9d8'); c.fillStyle = '#8c6a4a'; c.fillRect(0, h - 70, w, 70); emoji(c, '🥚', w / 2, h - 100, 100 + t * 3, Math.sin(t * 10) * 0.25 * Math.min(1, t / 3)); } },
      { d: 8, cap: 'パカッ！ あかちゃん きょうりゅう が うまれた！', snd: 'star', draw: (c, w, h, t) => { sky(c, w, h, '#ffd43b', '#fff9db'); c.fillStyle = '#8c6a4a'; c.fillRect(0, h - 70, w, 70); emoji(c, '🦖', w / 2, h - 110 - Math.abs(Math.sin(t * 4)) * 20, 110 + Math.min(40, t * 10)); emoji(c, '✨', w / 2 - 90, 90, 40); emoji(c, '✨', w / 2 + 90, 110, 30); } },
      { d: 8, cap: 'もりを たんけん。おともだちも できたよ', draw: (c, w, h, t) => { sky(c, w, h, '#69db7c', '#d3f9d8'); for (let i = 0; i < 9; i++) emoji(c, '🌳', ((i * 90 - t * 40) % 810 + 810) % 810 - 60, h - 120, 80); c.fillStyle = '#8c6a4a'; c.fillRect(0, h - 70, w, 70); emoji(c, '🦖', 220, h - 110 - Math.abs(Math.sin(t * 5)) * 15, 100); emoji(c, '🦕', 420, h - 120, 110); emoji(c, '🦋', 320 + Math.sin(t * 2) * 80, 120 + Math.cos(t * 3) * 30, 30); } },
      { d: 6, cap: 'ガオー！ げんきに おおきく なってね', snd: 'big', draw: (c, w, h, t) => { sky(c, w, h, '#ff922b', '#ffe8cc'); emoji(c, '🦖', w / 2, h / 2 + 20, 170 + Math.sin(t * 6) * 8); c.fillStyle = '#e8590c'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.fillText('ガオー！', w / 2, 80); } },
    ],
    rocket: [
      { d: 7, cap: '3・2・1… はっしゃ！', snd: 'jump', draw: (c, w, h, t) => { sky(c, w, h, '#74c0fc', '#e7f5ff'); c.fillStyle = '#868e96'; c.fillRect(0, h - 60, w, 60); const y = h - 120 - Math.max(0, t - 3) ** 2 * 25; emoji(c, '🚀', w / 2, y, 110, -Math.PI / 4); if (t > 2.5) for (let i = 0; i < 6; i++) emoji(c, '☁️', w / 2 - 60 + i * 24, h - 60 + Math.random() * 10, 40); c.fillStyle = '#fff'; c.font = 'bold 70px sans-serif'; c.textAlign = 'center'; if (t < 3) c.fillText(String(3 - Math.floor(t)), w / 2, 90); } },
      { d: 8, cap: 'ぐんぐん のぼって うちゅうへ', draw: (c, w, h, t) => { sky(c, w, h, '#1c2b4a', '#000'); for (let i = 0; i < 60; i++) { c.fillStyle = '#fff'; c.fillRect((i * 113) % w, ((i * 71 + t * 120) % h), 2, 2); } emoji(c, '🚀', w / 2 + Math.sin(t * 2) * 40, h / 2, 110, -Math.PI / 4); emoji(c, '🌍', 100, h - 60 + t * 10, 120); } },
      { d: 8, cap: 'つきに とうちゃく。ふわっと ちゃくりく', snd: 'land', draw: (c, w, h, t) => { sky(c, w, h, '#000', '#1c2b4a'); c.fillStyle = '#dee2e6'; c.beginPath(); c.ellipse(w / 2, h + 120, 520, 220, 0, 0, 7); c.fill(); c.fillStyle = '#adb5bd'; [[150, 300], [420, 320], [520, 280]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 40, 12, 0, 0, 7); c.fill(); }); emoji(c, '🚀', w / 2, Math.min(h - 140, 40 + t * 60), 100); } },
      { d: 8, cap: 'ぴょーん ぴょーん。つきは からだが かるいんだ', draw: (c, w, h, t) => { sky(c, w, h, '#000', '#1c2b4a'); c.fillStyle = '#dee2e6'; c.beginPath(); c.ellipse(w / 2, h + 120, 520, 220, 0, 0, 7); c.fill(); emoji(c, '🧑‍🚀', 200 + t * 30, h - 140 - Math.abs(Math.sin(t * 1.5)) * 110, 80); emoji(c, '🚩', 480, h - 140, 60); emoji(c, '🌍', 540, 70, 70); } },
      { d: 6, cap: 'ちきゅうに かえろう。ただいま！', snd: 'big', draw: (c, w, h, t) => { sky(c, w, h, '#000', '#1c2b4a'); emoji(c, '🌍', w / 2, h / 2, 120 + t * 40); emoji(c, '🚀', w / 2 + 200 - t * 30, h / 2 - 80 + t * 12, 60, Math.PI * 0.75); } },
    ],
    onara: [
      { d: 6, cap: 'みなとみらいの こうえんで…', draw: (c, w, h, t) => { sky(c, w, h, '#74c0fc', '#e7f5ff'); c.fillStyle = '#69db7c'; c.fillRect(0, h - 80, w, 80); emoji(c, '🎡', 520, h - 170, 120); emoji(c, '🧢', 200, h - 150, 50); emoji(c, '🙂', 200, h - 110, 60); } },
      { d: 6, cap: 'おなかが ぐるぐる… プッ！', snd: 'tap', draw: (c, w, h, t) => { sky(c, w, h, '#74c0fc', '#e7f5ff'); c.fillStyle = '#69db7c'; c.fillRect(0, h - 80, w, 80); emoji(c, '😳', 200 + Math.sin(t * 20) * 3, h - 110, 60); emoji(c, '🧢', 200, h - 150, 50); if (t > 3) emoji(c, '💨', 140 - (t - 3) * 20, h - 90, 40 + (t - 3) * 20); } },
      { d: 9, cap: 'ブブブーーッ！ スーパーおならで そらへ ビューン！', snd: 'jump', draw: (c, w, h, t) => { sky(c, w, h, '#4dabf7', '#d0ebff'); const y = h - 120 - t * 30; for (let i = 0; i < 8; i++) emoji(c, '☁️', ((i * 110 + t * 60) % 880) - 80, (i * 70 + t * 80) % h, 50); emoji(c, '😆', w / 2, y + 40, 60); emoji(c, '🧢', w / 2, y, 50); for (let i = 0; i < 5; i++) emoji(c, '💨', w / 2 - 10 + Math.sin(t * 9 + i) * 15, y + 90 + i * 28, 40 - i * 5); } },
      { d: 9, cap: 'くもの うえから パラシュートで ふわ〜り', snd: 'chute', draw: (c, w, h, t) => { sky(c, w, h, '#a5d8ff', '#e7f5ff'); emoji(c, '🪂', w / 2 + Math.sin(t) * 60, 60 + t * 22, 100); emoji(c, '🗼', 120, h - 100, 120); c.fillStyle = '#1c7ed6'; c.fillRect(0, h - 40, w, 40); } },
      { d: 6, cap: 'おしまい。おならマンは きょうも げんき！', snd: 'big', draw: (c, w, h, t) => { sky(c, w, h, '#ffd43b', '#fff3bf'); emoji(c, '🧢', w / 2, h / 2 - 40, 70); emoji(c, '😄', w / 2, h / 2 + 20, 90); emoji(c, '💨', w / 2 - 110, h / 2 + 50, 60 + Math.sin(t * 6) * 10); } },
    ],
  };

  // ---------------- エアキャビン の きっぷ ----------------
  function cabin(from) {
    const to = from === 0 ? 'さくらぎちょう えき' : 'うんがパーク えき（ワールドポーターズの ちかく）';
    clear('🚡 YOKOHAMA AIR CABIN', (from === 0 ? 'うんがパーク えき' : 'さくらぎちょう えき') + ' ・ きっぷうりば', 'cab');
    root.appendChild(el('div', 'price', `${to} まで<br>こども かたみち <b>500えん</b>`));
    root.appendChild(btn('🎫 きっぷを かう', 'sbig tall', () => pay(500, 'エアキャビン こども かたみち', () => api.onClose({ ride: from }), () => cabin(from))));
    root.appendChild(btn('← やめる', 'sout', () => api.onClose()));
  }

  // ---------------- アトラクションの チケット ----------------
  function attractionTicket(t) {
    clear(t.title, t.sub, 'tk');
    root.appendChild(el('div', 'price', `${t.icon} こども 1まい <b>${yen(t.price)}</b><br><small>（ゲームの ねだん）</small>`));
    root.appendChild(btn('🎫 チケットを かう', 'sbig tall', () => pay(t.price, t.what, () => api.onClose({ go: t.go }), () => attractionTicket(t))));
    root.appendChild(btn('← やめる', 'sout', () => api.onClose()));
  }
  // ---------------- コンビニ（セブン-イレブン・ローソン）----------------
  // ねだん は ゲームの めやす。からあげクン は ローソンの しょうひん。
  const KONBINI = {
    lawson: { title: '🏪 ローソン', sub: 'とべちょう 3ちょうめ ・ レジの よこに からあげクン', cls: 'lw', items: [
      { id: 'kr', e: '🍗', name: 'からあげクン レギュラー', price: 260, karaage: 1 },
      { id: 'kred', e: '🌶️', name: 'からあげクン レッド', price: 260, karaage: 1 },
      { id: 'kch', e: '🧀', name: 'からあげクン チーズ', price: 260, karaage: 1 },
      { id: 'oni', e: '🍙', name: 'おにぎり', price: 160, oni: 1 },
      { id: 'tea', e: '🍵', name: 'おちゃ', price: 140, drink: 1 },
    ] },
    seven: { title: '🏪 セブン-イレブン', sub: 'とべちょう 4ちょうめ', cls: 'sv', items: [
      { id: 'oni', e: '🍙', name: 'おにぎり', price: 160, oni: 1 },
      { id: 'pan', e: '🥐', name: 'パン', price: 150, snack: 1 },
      { id: 'ice', e: '🍦', name: 'ソフトクリーム', price: 300, snack: 1 },
      { id: 'juice', e: '🧃', name: 'りんごジュース', price: 130, drink: 1 },
    ] },
  };
  function konbini(kind) {
    const K = KONBINI[kind] || KONBINI.seven;
    clear(K.title, K.sub, K.cls);
    root.appendChild(el('div', 'tlabel', `👛 ${yen(api.wallet.total())}`));
    const g = el('div', 'kgrid2');
    K.items.forEach((it) => {
      const c = el('button', 'kitem' + (it.karaage ? ' hot' : ''), `<i>${it.e}</i><span>${it.name}</span><b>${yen(it.price)}</b>${it.karaage ? '<em>あつあつ</em>' : ''}`);
      c.addEventListener('click', () => pay(it.price, it.name, () => eat(kind, it), () => konbini(kind)));
      g.appendChild(c);
    });
    root.appendChild(g);
    root.appendChild(el('p', 'desc', 'ねだん は ゲームの めやす だよ'));
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  function eat(kind, it) {
    const K = KONBINI[kind] || KONBINI.seven;
    clear('😋 ' + it.name, 'かったよ！', K.cls);
    if (it.oni) {
      api.reward && api.reward({ oni: 1 });
      root.appendChild(el('div', 'prize', '<i>🍙</i><b>おにぎりを もちものに いれたよ</b><span>つかれたら たべてね</span>'));
      root.appendChild(btn('← おみせに もどる', 'sbig', () => konbini(kind))); return;
    }
    const n = it.karaage ? 5 : 1, box = el('div', 'bento'); let left = n;
    if (it.karaage) root.appendChild(el('p', 'desc', 'からあげクンが 5こ はいってる！ タップして たべよう'));
    for (let i = 0; i < n; i++) {
      const b = el('button', 'food', it.karaage ? '🍗' : it.e);
      b.addEventListener('click', () => {
        if (b.classList.contains('eaten')) return; b.classList.add('eaten'); b.textContent = '✨'; sfx('pick'); left--;
        if (!left) {
          sfx('big'); api.reward && api.reward({ full: 1, gas: it.karaage ? 1 : 0, karaage: it.karaage ? 1 : 0 });
          box.after(el('p', 'desc', it.karaage ? 'おいしかった！ げんき まんたん、おならパワーも まんたん 💨' : 'おいしかった！ げんき まんたん'));
          box.after(btn('← おみせに もどる', 'sbig', () => konbini(kind)));
        }
      });
      box.appendChild(b);
    }
    root.appendChild(box);
  }
  // ---------------- オーケー（スーパー）: おつかい ----------------
  const OK_ITEMS = [
    { id: 'milk', e: '🥛', price: 200 }, { id: 'egg', e: '🥚', price: 230 }, { id: 'bread', e: '🍞', price: 150 },
    { id: 'banana', e: '🍌', price: 130 }, { id: 'carrot', e: '🥕', price: 100 }, { id: 'apple', e: '🍎', price: 120 },
  ];
  function okstore() {
    clear('🛒 オーケー', 'みなとみらい 6ちょうめ ・ スーパー（ねだん は ゲームの めやす）', 'ok');
    const e = api.errand, names = api.errandItems || {};
    if (e) root.appendChild(el('div', 'memo2', '📝 ママの メモ： ' + e.list.map((k) => (e.got.includes(k) ? '✅ ' : '⬜ ') + names[k]).join('　')));
    else root.appendChild(el('div', 'memo2', '📝 おうちで ママに「おつかい」を たのまれると、ここで かうよ'));
    root.appendChild(el('div', 'tlabel', `👛 ${yen(api.wallet.total())}`));
    const g = el('div', 'kgrid2');
    OK_ITEMS.forEach((it) => {
      const need = e && e.list.includes(it.id) && !e.got.includes(it.id);
      const c = el('button', 'kitem' + (need ? ' hot' : ''), `<i>${it.e}</i><span>${names[it.id] || it.id}</span><b>${yen(it.price)}</b>${need ? '<em>メモに ある</em>' : ''}`);
      c.addEventListener('click', () => pay(it.price, names[it.id], () => { api.reward && api.reward({ errand: it.id }); sfx('pick'); okstore(); }, okstore));
      g.appendChild(c);
    });
    root.appendChild(g);
    root.appendChild(btn('🚪 そとに でる', 'sout', () => api.onClose()));
  }
  // ---------------- シーバス の きっぷ ----------------
  function seabass(arg) {
    const P2 = arg.piers, from = arg.from;
    clear('⛴️ シーバス', P2[from] + ' のりば ・ どこまで いく？', 'cab');
    P2.forEach((n, k) => {
      if (k === from) return;
      const price = [0, 200, 300, 350][Math.abs(k - from)] || 350;
      root.appendChild(btn(`${k > from ? '➡️' : '⬅️'} ${n}<small>こども ${yen(price)}（ゲームの ねだん）</small>`, 'sbig tall', () => pay(price, 'シーバス ' + P2[from] + ' → ' + n, () => api.onClose({ go: 'sea:' + from + ':' + k }), () => seabass(arg))));
    });
    root.appendChild(btn('← やめる', 'sout', () => api.onClose()));
  }
  window.Shops = {
    open(kind, a) {
      api = a; root = document.getElementById('shopRoot');
      if (kind === 'toys') toys();
      else if (kind === 'wp') wp();
      else if (kind === 'cabin') cabin(a.arg);
      else if (kind === 'ticket') attractionTicket(a.arg);
      else if (kind === 'konbini') konbini(a.arg);
      else if (kind === 'okstore') okstore();
      else if (kind === 'seabass') seabass(a.arg);
      else if (window.Odekake && window.Odekake.has(kind)) window.Odekake.open(kind, { api, root, pay, clear, el, btn, sfx, toast, yen }, a.arg);
      else walletView();
    },
    TOYS, PRIZES, toySvg,
  };
})();
