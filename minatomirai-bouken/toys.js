'use strict';
/* おもちゃ 100こ（おたんじょうび の プレゼント・トイザらス）。
   ひとつずつ はこ を あけて、あそんで、おべんきょう できる。おべんきょう を 1かい すると あおちゃん の レベル が 1 あがる。
   おもちゃ は ぜんぶ えもじ と なまえ だけ の オリジナル（しょうひん の なまえ は つかわない）。 */
(function () {
  const KEY = 'minatomirai-bouken-toys-v1';
  let S = { lv: 1, boxes: [], got: {}, bday: {}, studied: 0, played: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') S = Object.assign(S, s); } catch (e) { /* つかえない */ }
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* いっぱい など */ } };

  // [id, えもじ, なまえ, うりば, ねだん, あそびかた, おべんきょう, なきごえ（どうぶつ）]
  const RAW = [
    // のりもの
    ['car', '🚗', 'あかい ミニカー', 'norimono', 600, 'car', 'kazu'], ['police', '🚓', 'パトカー', 'norimono', 900, 'car', 'eigo'],
    ['fire', '🚒', 'しょうぼうしゃ', 'norimono', 1200, 'car', 'kazu'], ['ambu', '🚑', 'きゅうきゅうしゃ', 'norimono', 1200, 'car', 'tokei'],
    ['bus', '🚌', 'のりあい バス', 'norimono', 1000, 'car', 'tashi'], ['tractor', '🚜', 'トラクター', 'norimono', 1100, 'car', 'hira'],
    ['racer', '🏎️', 'レーシングカー', 'norimono', 1500, 'car', 'okisa'], ['loco', '🚂', 'きかんしゃ', 'norimono', 1800, 'train', 'kazu'],
    ['bullet', '🚅', 'しんかんせん', 'norimono', 2200, 'train', 'tashi'], ['heli', '🚁', 'ヘリコプター', 'norimono', 1600, 'plane', 'eigo'],
    ['plane', '✈️', 'ジェット ひこうき', 'norimono', 2000, 'plane', 'kuni'], ['rocket', '🚀', 'ロケット', 'norimono', 2500, 'rocket', 'hiki'],
    ['ship', '🛳️', 'おおきな ふね', 'norimono', 2400, 'boat', 'kuni'], ['bike', '🚲', 'じてんしゃ の もけい', 'norimono', 800, 'car', 'iro'],
    ['ufo', '🛸', 'UFO', 'norimono', 1300, 'plane', 'katachi'],
    // ロボット・ヒーロー
    ['robot', '🤖', 'しゃべる ロボット', 'robot', 3200, 'robot', 'eigo'], ['arm', '🦾', 'ロボット アーム', 'robot', 2600, 'robot', 'hiki'],
    ['alien', '👾', 'うちゅうじん フィギュア', 'robot', 700, 'robot', 'eigo'], ['ninja', '🥷', 'にんじゃ フィギュア', 'robot', 900, 'robot', 'hira'],
    ['hero', '🦸', 'ヒーロー にんぎょう', 'robot', 1500, 'robot', 'okisa'], ['wizard', '🧙', 'まほうつかい にんぎょう', 'robot', 1400, 'magic', 'iro'],
    ['wand', '🪄', 'まほう の ステッキ', 'robot', 1100, 'magic', 'katachi'], ['shield', '🛡️', 'ゆうしゃ の たて', 'robot', 1200, 'robot', 'katachi'],
    ['trex', '🦖', 'きょうりゅう ロボ', 'robot', 3500, 'animal', 'okisa', 'ガオー'], ['bronto', '🦕', 'くびながりゅう フィギュア', 'robot', 900, 'animal', 'kazu', 'ボオー'],
    ['dragon', '🐉', 'ドラゴン にんぎょう', 'robot', 1800, 'animal', 'tashi', 'ギャオー'], ['crown', '👑', 'おうさま の かんむり', 'robot', 800, 'magic', 'iro'],
    // ぬいぐるみ
    ['bear', '🧸', 'くま の ぬいぐるみ', 'nui', 1800, 'animal', 'eigo', 'ぐう ぐう'], ['dog', '🐶', 'いぬ の ぬいぐるみ', 'nui', 1500, 'animal', 'doubutsu', 'わん わん'],
    ['cat', '🐱', 'ねこ の ぬいぐるみ', 'nui', 1500, 'animal', 'doubutsu', 'にゃーお'], ['rabbit', '🐰', 'うさぎ の ぬいぐるみ', 'nui', 1500, 'animal', 'kazu', 'ぴょん ぴょん'],
    ['panda', '🐼', 'パンダ の ぬいぐるみ', 'nui', 2000, 'animal', 'iro', 'もぐ もぐ'], ['lion', '🦁', 'ライオン の ぬいぐるみ', 'nui', 2000, 'animal', 'doubutsu', 'がおー'],
    ['elephant', '🐘', 'ぞう の ぬいぐるみ', 'nui', 2200, 'animal', 'okisa', 'ぱおーん'], ['giraffe', '🦒', 'キリン の ぬいぐるみ', 'nui', 2200, 'animal', 'eigo', 'もぐ もぐ'],
    ['penguin', '🐧', 'ペンギン の ぬいぐるみ', 'nui', 1600, 'animal', 'kuni', 'ぺた ぺた'], ['dolphin', '🐬', 'イルカ の ぬいぐるみ', 'nui', 1600, 'animal', 'tashi', 'きゅー きゅー'],
    ['unicorn', '🦄', 'ユニコーン の ぬいぐるみ', 'nui', 2400, 'animal', 'iro', 'ひひーん'], ['frog', '🐸', 'カエル の ぬいぐるみ', 'nui', 1000, 'animal', 'doubutsu', 'けろ けろ'],
    ['monkey', '🐵', 'おさる の ぬいぐるみ', 'nui', 1300, 'animal', 'hiki', 'うきー'], ['pig', '🐷', 'ぶた の ぬいぐるみ', 'nui', 1300, 'animal', 'doubutsu', 'ぶー ぶー'],
    ['chick', '🐥', 'ひよこ の ぬいぐるみ', 'nui', 900, 'animal', 'kazu', 'ぴよ ぴよ'], ['koala', '🐨', 'コアラ の ぬいぐるみ', 'nui', 1800, 'animal', 'kuni', 'すや すや'],
    // がっき
    ['piano', '🎹', 'キーボード', 'gakki', 4800, 'music', 'oto'], ['drum', '🥁', 'たいこ', 'gakki', 1800, 'drum', 'kazu'],
    ['guitar', '🎸', 'ギター', 'gakki', 3800, 'music', 'oto'], ['trumpet', '🎺', 'トランペット', 'gakki', 2200, 'music', 'eigo'],
    ['violin', '🎻', 'バイオリン', 'gakki', 4200, 'music', 'oto'], ['sax', '🎷', 'サックス', 'gakki', 3000, 'music', 'hira'],
    ['maraca', '🪇', 'マラカス', 'gakki', 600, 'drum', 'tashi'], ['bell', '🔔', 'ハンドベル', 'gakki', 1500, 'music', 'oto'],
    ['mic', '🎤', 'カラオケ マイク', 'gakki', 2500, 'music', 'hira'], ['accordion', '🪗', 'アコーディオン', 'gakki', 3600, 'music', 'oto'],
    ['djembe', '🪘', 'ジャンベ', 'gakki', 2000, 'drum', 'hiki'],
    // ブロック・パズル
    ['brick', '🧱', 'つみき ブロック', 'block', 2500, 'blocks', 'kazu'], ['puzzle', '🧩', 'ジグソー パズル', 'block', 1200, 'puzzle', 'katachi'],
    ['dice', '🎲', 'おおきな サイコロ', 'block', 500, 'dice', 'tashi'], ['abacus', '🧮', 'そろばん', 'block', 1500, 'blocks', 'tashi'],
    ['abc', '🔤', 'ABC つみき', 'block', 1800, 'blocks', 'eigo'], ['num', '🔢', 'すうじ つみき', 'block', 1800, 'blocks', 'okisa'],
    ['castle', '🏰', 'おしろ の ブロック', 'block', 5800, 'blocks', 'katachi'], ['cards', '🃏', 'トランプ', 'block', 500, 'dice', 'okisa'],
    ['matry', '🪆', 'いれこ にんぎょう', 'block', 2000, 'puzzle', 'okisa'], ['shape', '🔷', 'かたち はめ パズル', 'block', 1600, 'puzzle', 'katachi'],
    ['rainbow', '🌈', 'にじいろ つみき', 'block', 2200, 'blocks', 'iro'], ['yoyo', '🪀', 'ヨーヨー', 'block', 400, 'top', 'kazu'],
    ['top', '🌀', 'こま', 'block', 600, 'top', 'hiki'],
    // そと あそび・スポーツ
    ['soccer', '⚽', 'サッカーボール', 'sport', 1800, 'ball', 'kazu'], ['basket', '🏀', 'バスケットボール', 'sport', 2000, 'ball', 'tashi'],
    ['baseball', '⚾', 'やきゅう セット', 'sport', 2400, 'ball', 'hiki'], ['tennis', '🎾', 'テニス ボール', 'sport', 800, 'ball', 'eigo'],
    ['volley', '🏐', 'ビーチボール', 'sport', 700, 'ball', 'iro'], ['rugby', '🏈', 'ラグビーボール', 'sport', 1600, 'ball', 'katachi'],
    ['skate', '🛹', 'スケートボード', 'sport', 4500, 'car', 'okisa'], ['scooter', '🛴', 'キックボード', 'sport', 5500, 'car', 'tokei'],
    ['boomer', '🪃', 'ブーメラン', 'sport', 900, 'plane', 'katachi'], ['frisbee', '🥏', 'フリスビー', 'sport', 700, 'plane', 'kazu'],
    ['kite', '🪁', 'たこ あげ', 'sport', 1000, 'plane', 'kuni'], ['bowling', '🎳', 'ボウリング セット', 'sport', 1500, 'ball', 'hiki'],
    ['target', '🎯', 'まとあて ゲーム', 'sport', 1300, 'ball', 'tashi'],
    // かがく・まなび
    ['scope', '🔭', 'ぼうえんきょう', 'kagaku', 4800, 'magic', 'kuni'], ['micro', '🔬', 'けんびきょう', 'kagaku', 5200, 'magic', 'kazu'],
    ['magnet', '🧲', 'じしゃく あそび', 'kagaku', 900, 'magic', 'okisa'], ['globe', '🌍', 'ちきゅうぎ', 'kagaku', 3800, 'top', 'kuni'],
    ['lab', '🧪', 'じっけん セット', 'kagaku', 2800, 'bubble', 'iro'], ['bubbles', '🫧', 'シャボンだま', 'kagaku', 400, 'bubble', 'katachi'],
    ['clock', '🕰️', 'とけい の おもちゃ', 'kagaku', 2000, 'top', 'tokei'], ['alarm', '⏰', 'めざまし どけい', 'kagaku', 1500, 'music', 'tokei'],
    ['map', '🗺️', 'せかいちず パズル', 'kagaku', 2400, 'puzzle', 'kuni'], ['torch', '🔦', 'かいちゅう でんとう', 'kagaku', 900, 'magic', 'iro'],
    ['book', '📚', 'えほん セット', 'kagaku', 3000, 'magic', 'hira'], ['crayon', '🖍️', 'クレヨン', 'kagaku', 500, 'magic', 'iro'],
    ['seed', '🌱', 'たね まき セット', 'kagaku', 800, 'bubble', 'kazu'],
    // ごっこ あそび・ゲーム
    ['kitchen', '🍳', 'おままごと キッチン', 'gokko', 6800, 'drum', 'kazu'], ['cake', '🧁', 'ケーキやさん ごっこ', 'gokko', 2200, 'magic', 'tashi'],
    ['sushi', '🍣', 'おすしやさん ごっこ', 'gokko', 2400, 'dice', 'tashi'], ['doctor', '🩺', 'おいしゃさん セット', 'gokko', 2000, 'drum', 'tokei'],
    ['shop', '🛒', 'おかいもの ごっこ', 'gokko', 3200, 'car', 'tashi'], ['phone', '📞', 'おもちゃ の でんわ', 'gokko', 1200, 'music', 'kazu'],
    ['camera', '📷', 'おもちゃ の カメラ', 'gokko', 1800, 'magic', 'eigo'], ['game', '🎮', 'ゲーム き', 'gokko', 9800, 'robot', 'tashi'],
    ['joy', '🕹️', 'レバー ゲーム', 'gokko', 2800, 'robot', 'okisa'], ['pinata', '🪅', 'くすだま', 'gokko', 1000, 'magic', 'iro'],
  ];
  const CATALOG = RAW.slice(0, 100).map(([id, e, n, cat, price, play, study, cry]) => ({ id: 't_' + id, e, name: n, cat, price, play, study, cry }));
  const CATS = { norimono: '🚗 のりもの', robot: '🤖 ロボット・ヒーロー', nui: '🧸 ぬいぐるみ', gakki: '🎹 がっき', block: '🧱 ブロック・パズル', sport: '⚽ スポーツ', kagaku: '🔬 かがく・まなび', gokko: '🍳 ごっこ・ゲーム' };
  const byId = (id) => CATALOG.find((t) => t.id === id);
  const svg = (t, w) => `<svg viewBox="0 0 120 66" width="${w || 120}" height="${(w || 120) * 0.55}"><rect x="2" y="2" width="116" height="62" rx="12" fill="#fff4e6"/><text x="60" y="50" font-size="44" text-anchor="middle">${t.e}</text></svg>`;

  // ---------------- レベル ----------------
  const TITLES = [[1, 'ひよこ'], [3, 'がんばりやさん'], [6, 'ものしり こぞう'], [10, 'ちびっこ はかせ'], [15, 'みなとみらい はかせ'], [22, 'スーパー はかせ'], [30, 'せかい の はかせ'], [45, 'でんせつ の はかせ'], [70, 'うちゅう いち の はかせ']];
  const title = (lv) => { let t = TITLES[0][1]; TITLES.forEach(([l, n]) => { if (lv >= l) t = n; }); return t; };
  let lvApi = null;
  function levelUp(what) {
    const from = S.lv; S.lv++; S.studied++; store();
    const d = document.createElement('div'); d.className = 'lvup';
    const newT = title(S.lv) !== title(from) ? `<p class="lvt">🏅 あたらしい しょうごう「${title(S.lv)}」</p>` : '';
    d.innerHTML = `<div class="lvbox"><div class="lvrays"></div><p class="lvh">LEVEL UP!</p><div class="lvao">🧢</div><p class="lvn">Lv.${from} <span>➜</span> <b>Lv.${S.lv}</b></p><p class="lvw">${what || 'おべんきょう'} を がんばった！</p>${newT}<p class="lvtap">タップ で とじる</p></div>`;
    document.body.appendChild(d);
    const close = () => { if (d.parentNode) d.parentNode.removeChild(d); };
    d.addEventListener('click', close); setTimeout(close, 4200);
    const t = lvApi && lvApi.tone; if (t) [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => t(f, i === 6 ? 0.6 : 0.14, 'square', 0.05, null, i * 0.11));
    if (lvApi && lvApi.confetti) lvApi.confetti();
    if (window.Voice) window.Voice.say(`レベル アップ！ レベル ${S.lv}`, 'mama');
    return S.lv;
  }

  // ---------------- もちもの ----------------
  function owned(wallet) {
    const ids = new Set(Object.keys(S.got));
    if (wallet) wallet.items().forEach((id) => { if (byId(id)) ids.add(id); });
    return CATALOG.filter((t) => ids.has(t.id));
  }
  function giveBirthday(year) {
    if (S.bday[year]) return false;
    const ids = CATALOG.map((t) => t.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    S.bday[year] = 1; S.boxes = S.boxes.concat(ids); store(); return true;
  }

  // ---------------- がめん ----------------
  let C;   // { root, clear, el, btn, say, sfx, tone, wallet, onBack, confetti, title }
  const voice = (t, who) => { if (window.Voice) window.Voice.say(t, who || 'mama'); };
  function hdr(sub) { C.clear('🧸 あおちゃん の おもちゃばこ', sub || `🧢 Lv.${S.lv}「${title(S.lv)}」 ・ おべんきょう ${S.studied}かい`); }
  function box(back) {
    const { root, el, btn } = C, own = owned(C.wallet);
    hdr();
    if (S.boxes.length) {
      root.appendChild(el('div', 'tlabel', `🎁 まだ あけて いない プレゼント（${S.boxes.length}こ）`));
      C.say('👩', 'ママ「なにが でるかは おたのしみ！ ひとつずつ あけてね」');
      const g = el('div', 'gboxes');
      S.boxes.forEach((id, i) => { const b = el('button', 'gbox', `<i>🎁</i><small>${i + 1}</small>`); b.style.setProperty('--h', (i * 47) % 360); b.addEventListener('click', () => openBox(i)); g.appendChild(b); });
      root.appendChild(g);
    }
    root.appendChild(el('div', 'tlabel', `🧸 もってる おもちゃ（${own.length}/${CATALOG.length}しゅるい）`));
    const g2 = el('div', 'tygrid');
    own.forEach((t) => { const b = el('button', 'tycard', `<i>${t.e}</i><span>${t.name}</span>`); b.addEventListener('click', () => toy(t)); g2.appendChild(b); });
    if (!own.length) g2.appendChild(el('div', 'wempty', 'まだ ないよ。おたんじょうび の プレゼント か、トイザらス で ね 🧸'));
    root.appendChild(g2);
    root.appendChild(btn('← もどる', 'sout', back || C.onBack));
  }
  function openBox(i) {
    const { root, el, btn } = C, id = S.boxes[i], t = byId(id);
    if (!t) return;
    S.boxes.splice(i, 1); S.got[id] = (S.got[id] || 0) + 1; store();
    C.clear('🎁 プレゼント を あける', `のこり ${S.boxes.length}こ`);
    const stage = el('div', 'unbox', '<i class="ubx">🎁</i>'); root.appendChild(stage);
    const tone = C.tone || (() => {});
    tone(300, 0.1, 'square', 0.04); tone(400, 0.1, 'square', 0.04, null, 0.3); tone(500, 0.1, 'square', 0.04, null, 0.6);
    setTimeout(() => {
      stage.innerHTML = `<div class="ushine"></div><i class="utoy">${t.e}</i>`; [523, 784, 1046].forEach((f, k) => tone(f, 0.25, 'triangle', 0.06, null, k * 0.1));
      root.appendChild(el('p', 'uname', `<b>${t.name}</b> が でた！${S.got[id] > 1 ? '（2こめ！）' : ''}`)); voice(`${t.name.replace(/ /g, '')} が でた！`, 'ao');
      const row = el('div', 'brow');
      row.appendChild(btn('▶ あそぶ', 'sbig', () => play(t, () => openAfter(t))));
      row.appendChild(btn('📚 おべんきょう', 'sbig', () => study(t, () => openAfter(t))));
      root.appendChild(row);
      if (S.boxes.length) root.appendChild(btn(`🎁 つぎ の はこ を あける（のこり ${S.boxes.length}）`, 'sbig sub', () => openBox(0)));
      root.appendChild(btn('← おもちゃばこ', 'sout', () => box()));
    }, 1100);
  }
  function openAfter(t) { toy(t); }
  function toy(t) {
    const { root, el, btn } = C;
    C.clear(`${t.e} ${t.name}`, `${CATS[t.cat] || ''} ・ 🧢 Lv.${S.lv}`);
    root.appendChild(el('div', 'tybig', t.e));
    root.appendChild(el('p', 'desc', `あそびかた：${PLAYN[t.play] || ''} ・ おべんきょう：${STUDYN[t.study] || ''}`));
    const row = el('div', 'brow');
    row.appendChild(btn('▶ あそぶ', 'sbig', () => play(t, () => toy(t))));
    row.appendChild(btn('📚 おべんきょう（レベル アップ）', 'sbig', () => study(t, () => toy(t))));
    root.appendChild(row);
    root.appendChild(btn('← おもちゃばこ', 'sout', () => box()));
  }

  // ---------------- あそぶ ----------------
  const PLAYN = { car: 'タップ で はしる', train: 'タップ で がたん ごとん', plane: 'タップ で とぶ', rocket: 'カウントダウン で はっしゃ', boat: 'なみ に ゆれる', ball: 'タップ で はずむ', animal: 'なでる と なく', robot: 'タップ で ダンス', magic: 'タップ で キラキラ', music: 'けんばん で えんそう', drum: 'たたいて リズム', blocks: 'つみあげる', puzzle: 'じゅんばん に はめる', bubble: 'あわ を わる', dice: 'ころがす', top: 'くるくる まわす' };
  function play(t, done) {
    const { root, el, btn } = C, tone = C.tone || (() => {});
    S.played++; store();
    C.clear(`▶ ${t.name} で あそぶ`, PLAYN[t.play] || '');
    const st = el('div', 'pstage'), ty = el('div', 'ptoy', t.e), msg = el('div', 'pmsg', 'タップ してね！'); st.appendChild(ty); st.appendChild(msg); root.appendChild(st);
    let n = 0; const anim = (c) => { ty.classList.remove(c); void ty.offsetWidth; ty.classList.add(c); };
    const k = t.play;
    if (k === 'music' || k === 'drum') {
      st.classList.add('short');
      const keys = el('div', k === 'music' ? 'pkeys' : 'ppads');
      const wave = t.id === 't_piano' || t.id === 't_bell' ? 'triangle' : t.id === 't_guitar' || t.id === 't_violin' ? 'sawtooth' : 'square';
      const notes = k === 'music' ? [['ど', 523], ['れ', 587], ['み', 659], ['ふぁ', 698], ['そ', 784], ['ら', 880], ['し', 988], ['ど', 1046]] : [['どん', 0], ['かっ', 1], ['しゃか', 2], ['ぽん', 3]];
      notes.forEach(([lab, f]) => { const b = el('button', '', lab); b.addEventListener('pointerdown', (e) => { e.preventDefault(); n++; anim('bop');
        if (k === 'music') tone(f, 0.35, wave, 0.07); else if (f === 0) tone(90, 0.25, 'sine', 0.2, 45); else if (f === 1) tone(900, 0.05, 'square', 0.05, 500); else if (f === 2) { tone(4000, 0.06, 'square', 0.015, 6000); tone(4400, 0.06, 'square', 0.015, 6000, 0.08); } else tone(220, 0.2, 'sine', 0.12, 160);
        msg.textContent = `${lab}！（${n}）`; }); keys.appendChild(b); });
      root.appendChild(keys);
    } else {
      st.addEventListener('pointerdown', (e) => {
        e.preventDefault(); n++;
        if (k === 'car' || k === 'train') { anim('drive'); tone(k === 'car' ? 120 : 200, 0.8, 'sawtooth', 0.04, k === 'car' ? 320 : 160); if (k === 'train') { tone(300, 0.08, 'square', 0.04, null, 0.2); tone(300, 0.08, 'square', 0.04, null, 0.45); } msg.textContent = k === 'car' ? `ブーーン！（${n}）` : `がたん ごとん！（${n}）`; }
        else if (k === 'plane' || k === 'boat') { anim(k === 'plane' ? 'fly' : 'float'); tone(k === 'plane' ? 400 : 200, 1, 'sine', 0.05, k === 'plane' ? 800 : 260); msg.textContent = k === 'plane' ? `びゅーん！（${n}）` : `ぷかぷか（${n}）`; }
        else if (k === 'rocket') { msg.textContent = '3…'; [['2…', 600], ['1…', 1200], ['はっしゃ！ 🔥', 1800]].forEach(([s2, ms]) => setTimeout(() => { msg.textContent = s2; tone(s2.length > 3 ? 150 : 880, s2.length > 3 ? 1.2 : 0.1, s2.length > 3 ? 'sawtooth' : 'square', 0.06, s2.length > 3 ? 900 : null); if (s2.length > 3) anim('launch'); }, ms)); tone(880, 0.1, 'square', 0.06); }
        else if (k === 'ball') { anim('bounce'); tone(300 + (n % 5) * 60, 0.12, 'sine', 0.12, 150); msg.textContent = `ぽーん！ ${n}かい`; }
        else if (k === 'animal') { anim('jump'); voice(t.cry || 'なでなで', 'dog'); tone(700, 0.1, 'sine', 0.04); const h = el('i', 'pheart', '💗'); h.style.left = (30 + Math.random() * 40) + '%'; st.appendChild(h); setTimeout(() => h.remove(), 1200); msg.textContent = `「${t.cry || '…'}」`; }
        else if (k === 'robot') { anim('dance'); [660, 880, 990, 660].forEach((f, i) => tone(f, 0.08, 'square', 0.04, null, i * 0.12)); msg.textContent = ['ピピッ！', 'ガシャン ガシャン', 'ダンス！', 'ビーム！'][n % 4]; }
        else if (k === 'magic') { anim('spin'); st.style.background = `hsl(${(n * 67) % 360} 90% 88%)`; [1318, 1568, 2093].forEach((f, i) => tone(f, 0.2, 'sine', 0.04, null, i * 0.07)); for (let s = 0; s < 6; s++) { const sp = el('i', 'pspark', '✨'); sp.style.left = Math.random() * 90 + '%'; sp.style.top = Math.random() * 80 + '%'; st.appendChild(sp); setTimeout(() => sp.remove(), 900); } msg.textContent = `キラキラ〜！（${n}）`; }
        else if (k === 'blocks') { const col = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪'][n % 6]; const b = el('i', 'pblk', col); b.style.bottom = (8 + ((n - 1) % 9) * 22) + 'px'; st.appendChild(b); tone(400 + (n % 9) * 50, 0.08, 'triangle', 0.06); msg.textContent = `${((n - 1) % 9) + 1}こ つんだ！`; if (n % 9 === 0) setTimeout(() => { st.querySelectorAll('.pblk').forEach((x) => x.classList.add('fall')); tone(150, 0.5, 'sawtooth', 0.05, 60); msg.textContent = 'ガラガラ〜！ もういちど！'; setTimeout(() => st.querySelectorAll('.pblk').forEach((x) => x.remove()), 700); }, 300); }
        else if (k === 'puzzle') { const order = n % 5; if (order === 0) { msg.textContent = '🎉 できた！ もういちど'; anim('jump'); [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, null, i * 0.1)); ty.style.clipPath = ''; } else { ty.style.clipPath = `inset(0 ${100 - order * 25}% 0 0)`; tone(500 + order * 80, 0.08, 'square', 0.04); msg.textContent = `ピース ${order}/4`; } }
        else if (k === 'bubble') { for (let s = 0; s < 4; s++) { const bb = el('i', 'pbub', '🫧'); bb.style.left = (10 + Math.random() * 80) + '%'; bb.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); bb.remove(); tone(1500, 0.05, 'sine', 0.06); }); st.appendChild(bb); setTimeout(() => bb.remove(), 3000); } msg.textContent = 'あわ を わって！'; tone(800, 0.2, 'sine', 0.03, 1200); }
        else if (k === 'dice') { anim('roll'); const v = 1 + Math.floor(Math.random() * 6); tone(500, 0.3, 'square', 0.03, 300); setTimeout(() => { msg.innerHTML = `<b style="font-size:40px">${'⚀⚁⚂⚃⚄⚅'[v - 1]}</b> ${v}！`; voice(String(v), 'ao'); }, 500); }
        else if (k === 'top') { anim('whirl'); tone(600, 1.5, 'triangle', 0.03, 300); msg.textContent = `くる くる くる〜（${n}）`; }
      });
    }
    root.appendChild(btn('📚 おべんきょう も する', 'sbig', () => study(t, done)));
    root.appendChild(btn('← もどる', 'sout', done));
  }

  // ---------------- おべんきょう ----------------
  const STUDYN = { kazu: 'かず を かぞえる', tashi: 'たしざん', hiki: 'ひきざん', okisa: 'どっち が おおきい', hira: 'ひらがな', eigo: 'えいご', iro: 'いろ', katachi: 'かたち', tokei: 'とけい', doubutsu: 'どうぶつ の なきごえ', kuni: 'せかい の くに', oto: 'おと の たかさ' };
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuf = (arr) => arr.slice().sort(() => Math.random() - 0.5);
  function opts(ans, pool) { const o = [ans]; shuf(pool).forEach((p) => { if (o.length < 3 && !o.includes(p)) o.push(p); }); return shuf(o); }
  const HIRA = [['🍎', 'りんご'], ['🐟', 'さかな'], ['🍙', 'おにぎり'], ['🐘', 'ぞう'], ['🚌', 'バス', 'ば'], ['🌸', 'さくら'], ['🍌', 'バナナ', 'ば'], ['🐱', 'ねこ'], ['🐶', 'いぬ'], ['🦊', 'きつね'], ['🍉', 'すいか'], ['⛄', 'ゆきだるま'], ['🌙', 'つき'], ['🍓', 'いちご'], ['🦉', 'ふくろう'], ['🐢', 'かめ'], ['🍞', 'パン', 'ぱ'], ['🐻', 'くま'], ['🎈', 'ふうせん'], ['🌻', 'ひまわり'], ['🐙', 'たこ'], ['🍇', 'ぶどう'], ['🦀', 'かに'], ['👓', 'めがね'], ['🌂', 'かさ'], ['🍑', 'もも'], ['🐿️', 'りす'], ['🧦', 'くつした'], ['🍋', 'レモン', 'れ'], ['🍅', 'トマト', 'と']];
  const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ'.split('');
  const EN = [['🍎', 'apple'], ['🐶', 'dog'], ['🐱', 'cat'], ['🚗', 'car'], ['🚌', 'bus'], ['🚂', 'train'], ['⭐', 'star'], ['🌙', 'moon'], ['☀️', 'sun'], ['🐟', 'fish'], ['🐦', 'bird'], ['🍌', 'banana'], ['✈️', 'airplane'], ['🏠', 'house'], ['📚', 'book'], ['⚽', 'ball'], ['🥛', 'milk'], ['🍰', 'cake'], ['🌸', 'flower'], ['🐻', 'bear'], ['🦁', 'lion'], ['🐘', 'elephant'], ['🚢', 'ship'], ['👟', 'shoes'], ['🎩', 'hat']];
  const IRO = [['#e03131', 'あか'], ['#1c7ed6', 'あお'], ['#fcc419', 'きいろ'], ['#2f9e44', 'みどり'], ['#f783ac', 'ピンク'], ['#7048e8', 'むらさき'], ['#fd7e14', 'オレンジ'], ['#f8f9fa', 'しろ'], ['#212529', 'くろ'], ['#8b5a2b', 'ちゃいろ']];
  const KATA = [['●', 'まる'], ['▲', 'さんかく'], ['■', 'しかく'], ['★', 'ほし'], ['♥', 'ハート'], ['◆', 'ひしがた']];
  const CRY = [['🐶', 'わん わん', 'いぬ'], ['🐱', 'にゃーお', 'ねこ'], ['🐮', 'もー', 'うし'], ['🐷', 'ぶー ぶー', 'ぶた'], ['🐸', 'けろ けろ', 'かえる'], ['🐔', 'こけこっこー', 'にわとり'], ['🐑', 'めえー', 'ひつじ'], ['🦁', 'がおー', 'ライオン'], ['🐘', 'ぱおーん', 'ぞう'], ['🐵', 'うきー', 'さる'], ['🐥', 'ぴよ ぴよ', 'ひよこ'], ['🦆', 'があ があ', 'あひる'], ['🐴', 'ひひーん', 'うま'], ['🦉', 'ほー ほー', 'ふくろう']];
  const KUNI = [['🇯🇵', 'にほん'], ['🇺🇸', 'アメリカ'], ['🇬🇧', 'イギリス'], ['🇫🇷', 'フランス'], ['🇨🇳', 'ちゅうごく'], ['🇰🇷', 'かんこく'], ['🇧🇷', 'ブラジル'], ['🇮🇹', 'イタリア'], ['🇩🇪', 'ドイツ'], ['🇨🇦', 'カナダ'], ['🇦🇺', 'オーストラリア'], ['🇮🇳', 'インド']];
  const clockSvg = (h, m) => { const a = (h % 12 + m / 60) * 30, b = m * 6, x = (r, d) => (60 + r * Math.sin(d * Math.PI / 180)).toFixed(1), y = (r, d) => (60 - r * Math.cos(d * Math.PI / 180)).toFixed(1);
    return `<svg viewBox="0 0 120 120" width="150" height="150"><circle cx="60" cy="60" r="56" fill="#fff" stroke="#1c2b4a" stroke-width="5"/>${[...Array(12)].map((_, i) => `<text x="${x(43, i * 30 + 30)}" y="${(+y(43, i * 30 + 30) + 6).toFixed(1)}" font-size="15" font-weight="700" text-anchor="middle" fill="#1c2b4a">${i + 1}</text>`).join('')}<line x1="60" y1="60" x2="${x(28, a)}" y2="${y(28, a)}" stroke="#e03131" stroke-width="7" stroke-linecap="round"/><line x1="60" y1="60" x2="${x(44, b)}" y2="${y(44, b)}" stroke="#1c7ed6" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="60" r="5" fill="#1c2b4a"/></svg>`; };
  function makeQ(kind, t) {
    const e = t.e, rep = (n) => `<span class="qems">${Array(n).fill(e).join('')}</span>`;
    if (kind === 'kazu') { const n = R(2, 10); return { q: `${rep(n)}<p>${t.name} は なんこ ある？</p>`, a: n + 'こ', c: opts(n + 'こ', [n - 1, n + 1, n + 2, n - 2].filter((x) => x > 0).map((x) => x + 'こ')), s: 'いくつ あるかな' }; }
    if (kind === 'tashi') { const a = R(1, 5), b = R(1, 5); return { q: `${rep(a)} <b class="qop">＋</b> ${rep(b)}<p class="qbig">${a} ＋ ${b} ＝ ？</p>`, a: String(a + b), c: opts(String(a + b), [a + b - 1, a + b + 1, a + b + 2].map(String)), s: `${a} たす ${b} は？` }; }
    if (kind === 'hiki') { const a = R(3, 9), b = R(1, a - 1); return { q: `<span class="qems">${Array(a).fill(e).map((x, i) => i >= a - b ? `<s>${x}</s>` : x).join('')}</span><p class="qbig">${a} − ${b} ＝ ？</p>`, a: String(a - b), c: opts(String(a - b), [a - b - 1, a - b + 1, a - b + 2].filter((x) => x >= 0).map(String)), s: `${a} ひく ${b} は？` }; }
    if (kind === 'okisa') { const a = R(1, 20); let b = R(1, 20); if (b === a) b = a + 1; return { q: `<p class="qbig">${a} と ${b}</p><p>どっち が おおきい かず？</p>`, a: String(Math.max(a, b)), c: [String(a), String(b)], s: 'どっちが おおきい？' }; }
    if (kind === 'hira') { const [pic, w, f] = pick(HIRA), first = f || w[0]; return { q: `<span class="qpic">${pic}</span><p>「${w}」 の さいしょ の もじ は？</p>`, a: first, c: opts(first, KANA), s: `${w}。 さいしょの もじは？` }; }
    if (kind === 'eigo') { const [pic, w] = pick(EN); return { q: `<span class="qpic">${pic}</span><p>えいご で なんて いう？</p>`, a: w, c: opts(w, EN.map((x) => x[1])), s: 'えいごで なんて いう？', en: w }; }
    if (kind === 'iro') { const [col, n] = pick(IRO); return { q: `<span class="qdot" style="background:${col}"></span><p>なに いろ？</p>`, a: n, c: opts(n, IRO.map((x) => x[1])), s: 'なにいろ かな？' }; }
    if (kind === 'katachi') { const [sym, n] = pick(KATA), col = pick(IRO.slice(0, 7))[0]; return { q: `<span class="qshape" style="color:${col}">${sym}</span><p>なんの かたち？</p>`, a: n, c: opts(n, KATA.map((x) => x[1])), s: 'なんの かたち かな？' }; }
    if (kind === 'tokei') { const h = R(1, 12), m = pick([0, 30]), lab = (hh, mm) => `${hh}じ${mm ? 'はん' : ''}`; return { q: `${clockSvg(h, m)}<p>なんじ かな？（みじかい はり が 〜じ）</p>`, a: lab(h, m), c: opts(lab(h, m), [lab(h % 12 + 1, m), lab(h, 30 - m), lab((h + 10) % 12 + 1, m)]), s: 'なんじ かな？' }; }
    if (kind === 'doubutsu') { const [, cry, n] = pick(CRY); return { q: `<p class="qbig">「${cry}」</p><p>なく の は どの どうぶつ？</p>`, a: n, c: opts(n, CRY.map((x) => x[2])), s: `${cry}。 だれの こえ？`, pics: Object.fromEntries(CRY.map((x) => [x[2], x[0]])) }; }
    if (kind === 'kuni') { const [flag, n] = pick(KUNI); return { q: `<span class="qpic">${flag}</span><p>どこ の くに の はた？</p>`, a: n, c: opts(n, KUNI.map((x) => x[1])), s: 'どこの くにの はた かな？' }; }
    // oto: どっち が たかい おと？
    const lo = pick([262, 294, 330, 349]), hi = lo * pick([1.5, 2, 1.68]), first = Math.random() < 0.5;
    return { q: '<p class="qbig">🔊 🎵 🎵</p><p>どっち の おと が たかい？</p>', a: first ? 'さいしょ' : 'あと', c: ['さいしょ', 'あと'], s: 'どっちの おとが たかい？', tones: first ? [hi, lo] : [lo, hi] };
  }
  function study(t, done) {
    const { root, el, btn } = C, tone = C.tone || (() => {});
    let qi = 0, miss = 0; const N = 3;
    const next = () => {
      if (qi >= N) {
        C.clear(`📚 ${STUDYN[t.study]} おわり！`, `${t.e} ${t.name}`);
        root.appendChild(el('div', 'tybig', '🎉'));
        root.appendChild(el('p', 'uname', `<b>${N}もん</b> ぜんぶ できた！${miss ? '' : ' まちがい ゼロ！ 💯'}`));
        levelUp(STUDYN[t.study]);
        root.appendChild(btn('📚 もう いちど', 'sbig', () => study(t, done)));
        root.appendChild(btn('← もどる', 'sout', done));
        return;
      }
      const Q = makeQ(t.study, t);
      C.clear(`📚 ${STUDYN[t.study]}（${qi + 1}/${N}）`, `${t.e} ${t.name} で おべんきょう ・ 🧢 Lv.${S.lv}`);
      root.appendChild(el('div', 'qbox', Q.q));
      if (Q.tones) { const play2 = () => { tone(Q.tones[0], 0.5, 'triangle', 0.08); tone(Q.tones[1], 0.5, 'triangle', 0.08, null, 0.8); }; play2(); root.appendChild(btn('🔊 もう いちど きく', 'sbig sub', play2)); }
      voice(Q.s, 'mama');
      const g = el('div', 'qchoices');
      Q.c.forEach((c) => { const b = el('button', 'qch', Q.pics && Q.pics[c] ? `${Q.pics[c]} ${c}` : c); b.addEventListener('click', () => {
        if (b.disabled) return;
        if (c === Q.a) { b.classList.add('ok'); [784, 1046].forEach((f, i) => tone(f, 0.15, 'triangle', 0.07, null, i * 0.1)); if (Q.en && window.Voice) window.Voice.say(Q.en, 'mama'); else voice('せいかい！', 'mama'); g.querySelectorAll('button').forEach((x) => { x.disabled = true; }); qi++; setTimeout(next, 1100); }
        else { b.classList.add('ng'); b.disabled = true; miss++; tone(200, 0.25, 'sawtooth', 0.04, 150); voice('おしい！ もういちど', 'mama'); }
      }); g.appendChild(b); });
      root.appendChild(g);
      root.appendChild(btn('← やめる', 'sout', done));
    };
    next();
  }

  window.Toys = {
    CATALOG, CATS, byId, svg,
    get level() { return S.lv; }, title: () => title(S.lv), levelUp: (w, a) => { if (a) lvApi = a; return levelUp(w); },
    giveBirthday, boxesLeft: () => S.boxes.length, owned,
    open(ctx, startTab) { C = ctx; lvApi = ctx; if (startTab === 'open' && S.boxes.length) openBox(0); else box(); },
    _state: () => S,
  };
})();
