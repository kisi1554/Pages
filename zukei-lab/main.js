'use strict';
/* =========================================================
   main.js … タブ・ことば ずかん・シールちょう・おと
   ========================================================= */
(() => {
  const VIEWS = { solid: SolidMode.view, cut: CutMode.view, roll: RollMode.view, build: BuildMode.view, quiz: QuizMode.view };
  function setTab(t) {
    App.tab = t;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
    Store.set('tab', t);
    requestAnimationFrame(() => {
      const v = VIEWS[t]; if (v) { v.resize(); v.dirty = true; }
      if (t === 'build') BuildMode.onShow();
    });
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { Snd.tap(); setTab(b.dataset.tab); }));

  /* ---- おと ---- */
  const sb = $('btnSound');
  const updSnd = () => { sb.textContent = Snd.on ? '🔊' : '🔇'; sb.setAttribute('aria-label', Snd.on ? 'おと オン' : 'おと オフ'); };
  sb.addEventListener('click', () => { Snd.on = !Snd.on; Store.set('sound', Snd.on); updSnd(); if (Snd.on) Snd.tap(); });
  updSnd();

  /* ---- シール ---- */
  function openStickers() {
    $('stickerGrid').innerHTML = STICKERS.map(s => {
      const g = Stickers.got.has(s.id);
      return `<div class="sticker ${g ? 'got' : ''}"><span class="e">${s.e}</span><b>${g ? s.name : '？？？'}</b>${s.how}</div>`;
    }).join('');
    $('modal').classList.remove('hide');
  }
  $('btnStickers').addEventListener('click', () => { Snd.tap(); openStickers(); });
  $('btnModalClose').addEventListener('click', () => { Snd.tap(); $('modal').classList.add('hide'); });
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('modal').classList.add('hide'); });
  Stickers.badge();

  /* ---- ことば ずかん ---- */
  const svg = inner => `<svg viewBox="0 0 80 80" aria-hidden="true">${inner}</svg>`;
  const CUBE = '<path d="M20 30 L45 22 L65 30 L40 38 Z" fill="#ffd166" stroke="#2a3645" stroke-width="2"/><path d="M20 30 L40 38 L40 64 L20 56 Z" fill="#80deea" stroke="#2a3645" stroke-width="2"/><path d="M40 38 L65 30 L65 56 L40 64 Z" fill="#ff8a80" stroke="#2a3645" stroke-width="2"/>';
  const WORDS = [
    { w: W.men, d: 'りったいの たいらな ところ（まがった めんも ある）。さいころには 6つ。', s: svg(CUBE + '<path d="M40 38 L65 30 L65 56 L40 64 Z" fill="#e5484d"/>'), tab: 'solid' },
    { w: W.hen, d: 'めんと めんの さかいめの まっすぐな せん。さいころには 12ほん。', s: svg(CUBE + '<path d="M40 38 L40 64" stroke="#e5484d" stroke-width="6" stroke-linecap="round"/>'), tab: 'solid' },
    { w: W.chou, d: 'へんと へんが あつまる かど。さいころには 8こ。', s: svg(CUBE + '<circle cx="40" cy="38" r="6" fill="#e5484d"/>'), tab: 'solid' },
    { w: W.kakudo, d: 'かどの ひらきぐあい。「°（ど）」で あらわす。1しゅうは 360°。', s: svg('<path d="M15 62 L70 62 M15 62 L55 22" stroke="#2a3645" stroke-width="3" fill="none"/><path d="M35 62 A20 20 0 0 0 29 48" stroke="#3b6fd8" stroke-width="3" fill="none"/><text x="44" y="56" font-size="12" fill="#3b6fd8" font-weight="bold">45°</text>'), tab: 'plane' },
    { w: W.chokkaku, d: '90°の かど。ノートの かどや さいころの かど。', s: svg('<path d="M18 62 L68 62 M18 62 L18 14" stroke="#2a3645" stroke-width="3" fill="none"/><path d="M18 48 L32 48 L32 62" stroke="#3b6fd8" stroke-width="3" fill="none"/>'), tab: 'plane' },
    { w: W.heikou, d: 'どこまで のばしても まじわらない 2ほんの まっすぐな せん。', s: svg('<path d="M10 28 L70 28 M10 52 L70 52" stroke="#2fa86b" stroke-width="4"/><path d="M36 22 L42 28 L36 34 M36 46 L42 52 L36 58" stroke="#2fa86b" stroke-width="3" fill="none"/>'), tab: 'plane' },
    { w: W.suichoku, d: '2ほんの せんが 90°（' + W.chokkaku + '）で まじわること。', s: svg('<path d="M10 52 L70 52 M40 12 L40 70" stroke="#2a3645" stroke-width="3"/><path d="M40 42 L50 42 L50 52" stroke="#3b6fd8" stroke-width="3" fill="none"/>'), tab: 'plane' },
    { w: W.taikaku, d: 'となりで ない かどと かどを むすぶ せん。しかくには 2ほん。', s: svg('<rect x="14" y="18" width="52" height="44" fill="#ffd166" stroke="#2a3645" stroke-width="3"/><path d="M14 18 L66 62 M66 18 L14 62" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="6 4"/>'), tab: 'plane' },
    { w: W.teimen + 'と ' + W.sokumen, d: R('角柱', 'かくちゅう') + 'や すいの したの めんが ていめん、よこの めんが そくめん。', s: svg('<path d="M18 26 L40 18 L62 26 L40 34 Z" fill="#ffd166" stroke="#2a3645" stroke-width="2"/><path d="M18 26 L40 34 L40 64 L18 56 Z" fill="#81d4fa" stroke="#2a3645" stroke-width="2"/><path d="M40 34 L62 26 L62 56 L40 64 Z" fill="#a5d6a7" stroke="#2a3645" stroke-width="2"/>'), tab: 'solid' },
    { w: W.tenkai, d: 'りったいを ひらいて たいらに した かたち。くみたてると もとに もどる。', s: svg('<g fill="#80deea" stroke="#2a3645" stroke-width="2"><rect x="28" y="6" width="17" height="17"/><rect x="11" y="23" width="17" height="17"/><rect x="28" y="23" width="17" height="17"/><rect x="45" y="23" width="17" height="17"/><rect x="28" y="40" width="17" height="17"/><rect x="28" y="57" width="17" height="17"/></g>'), tab: 'solid' },
    { w: R('見取図', 'みとりず'), d: 'りったいを ななめから みた え。みえない へんは てんせんで かく。', s: svg('<path d="M18 30 L48 30 L48 62 L18 62 Z M18 30 L32 18 L62 18 L48 30 M62 18 L62 50 L48 62" fill="none" stroke="#2a3645" stroke-width="2.5"/><path d="M18 62 L32 50 L62 50 M32 50 L32 18" fill="none" stroke="#2a3645" stroke-width="2" stroke-dasharray="4 4"/>'), tab: 'solid' },
    { w: W.setsudan, d: 'りったいを きった ときの きりくちの めん。', s: svg(CUBE + '<path d="M20 30 L65 30 L65 56 L20 56 Z" fill="rgba(229,72,77,.6)" stroke="#e5484d" stroke-width="2"/>'), tab: 'cut' },
    { w: R('三面図', 'さんめんず'), d: 'まえ・うえ・よこ から まっすぐ みた かたちを ならべた ず。', s: svg('<g fill="#3b6fd8"><rect x="8" y="44" width="12" height="12"/><rect x="20" y="44" width="12" height="12"/><rect x="8" y="32" width="12" height="12"/><rect x="48" y="44" width="12" height="12"/><rect x="60" y="44" width="12" height="12"/><rect x="48" y="12" width="12" height="12"/><rect x="60" y="12" width="12" height="12"/><rect x="48" y="24" width="12" height="12"/></g>'), tab: 'build' },
    { w: R('半径', 'はんけい') + '・' + R('直径', 'ちょっけい'), d: 'まんなかから まわりまでが はんけい。はしから はしまで まんなかを とおると ちょっけい（はんけいの 2ばい）。', s: svg('<circle cx="40" cy="40" r="28" fill="#90caf9" stroke="#2a3645" stroke-width="3"/><path d="M40 40 L68 40" stroke="#e5484d" stroke-width="3"/><path d="M12 40 L40 40" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="4 3"/><circle cx="40" cy="40" r="3"/>'), tab: 'plane' },
    { w: R('円周率', 'えんしゅうりつ'), d: 'まるの まわり（円周）が ちょっけいの なんばいか。やく 3.14。', s: svg('<circle cx="22" cy="40" r="12" fill="#90caf9" stroke="#2a3645" stroke-width="2"/><path d="M10 60 L72 60" stroke="#2fa86b" stroke-width="4"/><text x="44" y="46" font-size="13" font-weight="bold" fill="#2fa86b">3.14</text>'), tab: 'roll' },
    { w: R('正多面体', 'せいためんたい'), d: 'ぜんぶの めんが おなじ せいたかくけいで、どの ちょうてんも おなじ。5しゅるい だけ。', s: svg('<path d="M40 10 L68 58 L12 58 Z" fill="#b39ddb" stroke="#2a3645" stroke-width="2.5"/><path d="M40 10 L40 44 L12 58 M40 44 L68 58" stroke="#2a3645" stroke-width="2" fill="none" stroke-dasharray="4 3"/>'), tab: 'solid' },
    { w: R('体積', 'たいせき') + '・' + R('表面積', 'ひょうめんせき'), d: 'りったいの なかみの おおきさが たいせき、まわりの めんを ぜんぶ たした ひろさが ひょうめんせき。', s: svg(CUBE + '<text x="30" y="76" font-size="11" font-weight="bold" fill="#3b6fd8">たて×よこ×たかさ</text>'), tab: 'build' },
  ];
  $('wordList').innerHTML = WORDS.map((w, i) => `<div class="word">${w.s}<div><h3>${w.w}</h3><p>${w.d}</p><button class="btn sm go" data-i="${i}">ためしてみる ▶</button></div></div>`).join('');
  $('wordList').addEventListener('click', e => { const b = e.target.closest('.go'); if (!b) return; Snd.tap(); setTab(WORDS[+b.dataset.i].tab); window.scrollTo(0, 0); });

  const first = Store.get('tab', 'solid');
  setTab(document.getElementById('tab-' + first) ? first : 'solid');
  Loop.start();
})();
