'use strict';

/*
 * え の ぶひん。ぜんぶ SVG の もじれつ を かえす（がぞうファイル なし。この アプリ の ため の オリジナル）。
 * え の おおきさ は 800 × 500（viewBox）。
 *
 *   <g id="aka">     … あかずきん（あしもと が (0,0)）。なか の <g class="in"> を かきかえる
 *   <g id="wolf">    … おおかみ（たって いる とき）
 *   <g id="granny">  … おばあさん
 *   <g id="kikori">  … きこり の おじさん
 *   <g id="bedwolf"> … ベッド の なか の へんそう した おおかみ（みみ・め・て・くち は べつ の <g>）
 *   <g id="cdoor">   … クローゼット の とびら（app.js が あき ぐあい で transform を かえる）
 *   <g id="blanket"> … ふとん（したへ めくる）
 * うごき は app.js が まいフレーム transform を かきかえる。
 * おおかみ は ちょっと まぬけ な かお。こわく しない（きば・ち は かかない）。
 */
const Art = (() => {
  const SKIN = '#ffd9b3';
  const INK = '#3b2f3a';
  const RED = '#e03131';
  const RED_D = '#c92a2a';
  const GREY = '#9aa2aa';
  const GREY_D = '#68717a';
  const GREY_L = '#e9ecef';

  // いち（え の ざひょう）。app.js と たしかめ（tools/akazukin/check.js）が つかう
  const POS = {
    ground: 452,
    // 1: いえ の だいどころ
    items: [
      { k: 'bread', x: 210, y: 298, good: true },
      { k: 'juice', x: 282, y: 292, good: true },
      { k: 'cake', x: 352, y: 300, good: true },
      { k: 'flower', x: 424, y: 296, good: true },
      { k: 'ball', x: 520, y: 432, good: false },
    ],
    basket: { x: 640, y: 412 },
    // 2: もり の みち（くねくね の おれせん）
    path: [[60, 455], [180, 442], [290, 404], [330, 346], [272, 292], [300, 232], [420, 206], [540, 236], [604, 296], [700, 330], [756, 276]],
    // 3: えらぶ ふきだし
    choice: { house: { x: 225, y: 118 }, secret: { x: 575, y: 118 } },
    // 4: はなばたけ
    flowers: [[240, 330], [320, 375], [400, 322], [475, 385], [555, 335], [635, 380], [715, 330], [280, 425], [370, 432], [455, 428], [560, 412], [680, 405]],
    sun: { x0: 330, x1: 720, y0: 62, y1: 210 },
    // おばあさん の へや
    door: { x: 75, y: 330 },
    win: { x: 580, y: 150, x0: 510, x1: 650, y0: 76, y1: 226 },
    closet: { x: 735, y: 305, x0: 680, x1: 790, y0: 170, y1: 440 },
    bed: { x: 310 },
    parts: { ears: { x: 299, y: 145 }, eyes: { x: 305, y: 188 }, mouth: { x: 340, y: 219 }, hands: { x: 310, y: 298 } },
    blanket: { x: 310, y: 345 },
    // 6: おばあさん の いえ の そと
    houseDoor: { x: 470, y: 380 },
    // 10: おちゃかい
    cake: { x: 400, y: 338 },
    plates: [{ x: 285, y: 400 }, { x: 400, y: 412 }, { x: 515, y: 400 }],
  };

  // グラデーション の id。ひょうし と ほん と おしまい の え が おなじ ページ に あるので、え ごとに かえる
  let P = '';
  let seq = 0;

  function eye(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r || 3.4}" fill="${INK}"/><circle cx="${x - 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`;
  }
  const arc = (x, y, w, up) => `<path d="M${x - w} ${y} Q${x} ${y + (up ? -w : w)} ${x + w} ${y}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  function mouth(x, y, kind) {
    if (kind === 'o') return `<ellipse cx="${x}" cy="${y}" rx="5" ry="6" fill="#c92a2a"/>`;
    if (kind === 'sad') return `<path d="M${x - 6} ${y + 3} Q${x} ${y - 3} ${x + 6} ${y + 3}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (kind === 'line') return `<path d="M${x - 5} ${y} H${x + 5}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    if (kind === 'big') return `<path d="M${x - 8} ${y - 4} Q${x} ${y + 10} ${x + 8} ${y - 4} Z" fill="#c92a2a"/>`;
    return `<path d="M${x - 7} ${y - 2} Q${x} ${y + 6} ${x + 7} ${y - 2}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  const cheeks = (y, dx) => `<circle cx="${-dx}" cy="${y}" r="5.5" fill="#ffa8a8" opacity=".6"/><circle cx="${dx}" cy="${y}" r="5.5" fill="#ffa8a8" opacity=".6"/>`;
  const limb = (d, color, w) => `<path d="${d}" stroke="${color}" stroke-width="${w || 10}" fill="none" stroke-linecap="round"/>`;
  const hand = (x, y, c) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${c || SKIN}"/>`;

  /* ============================ もちもの ============================ */

  function item(k) {
    if (k === 'bread') {
      return `<ellipse cx="0" cy="0" rx="28" ry="15" fill="#e8a65d" stroke="#a0522d" stroke-width="2.5"/>
        <path d="M-14 -8 q4 8 0 14 M0 -10 q4 9 0 18 M14 -8 q4 8 0 14" stroke="#a0522d" stroke-width="2.4" fill="none"/>`;
    }
    if (k === 'juice') {
      return `<path d="M-11 18 V-6 Q-11 -14 -5 -18 V-28 H5 V-18 Q11 -14 11 -6 V18 Z" fill="#9c36b5" stroke="#5f3dc4" stroke-width="2.5"/>
        <rect x="-6" y="-34" width="12" height="7" rx="2" fill="#f08c00"/><rect x="-9" y="-2" width="18" height="12" rx="2" fill="#fff" opacity=".85"/>
        <circle cx="0" cy="4" r="3.4" fill="#9c36b5"/>`;
    }
    if (k === 'cake') {
      return `<path d="M-24 14 H24 V-4 Q0 -14 -24 -4 Z" fill="#fff5f5" stroke="#e599a7" stroke-width="2.5"/>
        <path d="M-24 2 H24" stroke="#ffc9c9" stroke-width="5"/>
        <path d="M-24 -4 Q-18 4 -12 -4 Q-6 4 0 -4 Q6 4 12 -4 Q18 4 24 -4" stroke="#fff" stroke-width="4" fill="none"/>
        <circle cx="0" cy="-14" r="7" fill="${RED}"/><path d="M-3 -21 l3 3 l3 -3" stroke="#2f9e44" stroke-width="2" fill="none"/>`;
    }
    if (k === 'slice') {
      return `<path d="M-16 8 H16 L8 -10 Z" fill="#fff5f5" stroke="#e599a7" stroke-width="2.2"/><path d="M-12 1 H12" stroke="#ffc9c9" stroke-width="3"/><circle cx="8" cy="-12" r="4.5" fill="${RED}"/>`;
    }
    if (k === 'flower') return bouquet();
    // ボール（いらない もの）
    return `<circle r="20" fill="#4dabf7" stroke="#1c7ed6" stroke-width="2.5"/>
      <path d="M-20 0 Q0 -12 20 0 M-20 0 Q0 12 20 0" stroke="#ffd43b" stroke-width="5" fill="none"/><circle cx="-7" cy="-9" r="4" fill="#fff" opacity=".7"/>`;
  }
  function bouquet() {
    const f = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6" rx="4" ry="6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="3.4" fill="#ffd43b"/></g>`;
    return `<path d="M0 22 L-10 -6 M0 22 L0 -10 M0 22 L10 -6" stroke="#2f9e44" stroke-width="3"/>
      ${f(-11, -10, '#ff8787')}${f(0, -16, '#ffd43b')}${f(11, -10, '#da77f2')}<path d="M-6 12 h12" stroke="#4dabf7" stroke-width="5" stroke-linecap="round"/>`;
  }

  // かご。full に いれた もの の なまえ（ならべて すこし みせる）
  function basket(full) {
    const peek = (full || []).slice(0, 4).map((k, i) => `<g transform="translate(${-18 + i * 12} -22) scale(.55)">${item(k)}</g>`).join('');
    return `<path d="M-30 -14 Q0 -66 30 -14" stroke="#a0522d" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${peek}
      <path d="M-36 -18 H36 L28 14 Q0 20 -28 14 Z" fill="#d9a066" stroke="#a0522d" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-30 -6 H30 M-28 4 H28 M-18 -18 L-14 16 M0 -18 V18 M18 -18 L14 16" stroke="#a0522d" stroke-width="1.6" opacity=".7"/>
      <path d="M-36 -18 L-22 -26 L-6 -18 L10 -26 L24 -18 L36 -24 V-18 Z" fill="${RED}" opacity="${full && full.length ? 0 : 0.9}"/>`;
  }

  /* ============================ あかずきん ============================ */

  function legs(pose, sock, shoe) {
    const a = pose === 'walk1' ? 16 : pose === 'walk2' ? -16 : pose === 'run' ? 30 : 0;
    const one = (x, r) => `<g transform="rotate(${r} ${x + 4} -42)"><rect x="${x}" y="-42" width="9" height="38" rx="4" fill="${sock}"/><ellipse cx="${x + 4}" cy="-4" rx="9" ry="5" fill="${shoe}"/></g>`;
    return one(-12, a) + one(3, -a);
  }

  /*
   * あかずきん。st = { face, pose, basket }
   * face: smile / wow / happy / think / worry
   * pose: stand / walk1 / walk2 / cheer / run / think / point
   */
  function akaInner(st) {
    const pose = st.pose || 'stand';
    const face = st.face || 'smile';
    const SLV = '#4dabf7';
    let h = '<ellipse cx="0" cy="2" rx="30" ry="6" fill="#000" opacity=".13"/>';
    h += `<path class="cape" d="M-20 -104 Q-42 -60 -36 -38 Q0 -30 36 -38 Q42 -60 20 -104 Z" fill="${RED}"/>`;
    h += legs(pose, '#fff', '#5c3b25');
    h += `<path d="M-17 -98 L-28 -40 Q0 -33 28 -40 L17 -98 Z" fill="#74c0fc" stroke="#4dabf7" stroke-width="2"/>
      <path d="M-11 -84 L-16 -44 Q0 -40 16 -44 L11 -84 Z" fill="#fff"/>`;
    // ずきん（うしろ）→ かお → まえがみ → ずきん の ふち
    h += `<path class="hood" d="M-31 -116 Q-35 -162 0 -164 Q35 -162 31 -116 Q30 -98 20 -94 L-20 -94 Q-30 -98 -31 -116 Z" fill="${RED}"/>`;
    h += `<circle cx="0" cy="-124" r="24" fill="${SKIN}"/>
      <path d="M-23 -126 Q-20 -147 0 -149 Q20 -147 23 -126 Q14 -139 6 -133 Q0 -141 -6 -133 Q-14 -139 -23 -126 Z" fill="#8d5a3b"/>
      <path d="M-29 -120 Q-28 -158 0 -160 Q28 -158 29 -120 Q25 -148 0 -151 Q-25 -148 -29 -120 Z" fill="${RED_D}"/>`;
    if (face === 'wow') h += `${eye(-8, -124, 4)}${eye(8, -124, 4)}${cheeks(-114, 14)}${mouth(0, -108, 'o')}`;
    else if (face === 'happy') h += `${arc(-8, -123, 4.5, true)}${arc(8, -123, 4.5, true)}${cheeks(-114, 14)}${mouth(0, -110, 'big')}`;
    else if (face === 'think') h += `${eye(-6, -125)}${eye(10, -125)}${cheeks(-114, 14)}${mouth(2, -110, 'line')}<path d="M-14 -134 L-4 -136 M6 -136 L16 -133" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    else if (face === 'worry') h += `${eye(-8, -124)}${eye(8, -124)}<path d="M-14 -134 L-4 -131 M14 -134 L4 -131" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>${cheeks(-114, 14)}${mouth(0, -108, 'sad')}`;
    else h += `${eye(-8, -124)}${eye(8, -124)}${cheeks(-114, 14)}${mouth(0, -110)}`;
    h += `<path d="M0 -97 L-12 -103 L-12 -91 Z M0 -97 L12 -103 L12 -91 Z" fill="${RED_D}"/><circle cx="0" cy="-97" r="3.2" fill="${RED_D}"/>`;
    // うで
    if (pose === 'cheer') h += limb('M-16 -92 Q-32 -116 -28 -140', SLV) + hand(-28, -143) + limb('M16 -92 Q32 -116 28 -140', SLV) + hand(28, -143);
    else if (pose === 'run') h += limb('M-16 -92 Q-34 -96 -40 -112', SLV) + hand(-42, -115) + limb('M16 -92 Q34 -86 40 -100', SLV) + hand(42, -103);
    else if (pose === 'think') h += limb('M-16 -92 Q-28 -74 -24 -58', SLV) + hand(-24, -55) + limb('M16 -92 Q30 -92 12 -104', SLV) + hand(10, -104);
    else if (pose === 'point') h += limb('M-16 -92 Q-28 -74 -24 -58', SLV) + hand(-24, -55) + limb('M16 -92 Q34 -100 46 -112', SLV) + hand(48, -114);
    else if (pose === 'walk1' || pose === 'walk2') {
      const s = pose === 'walk1' ? 1 : -1;
      h += limb(`M-16 -92 Q${-26 - s * 4} -74 ${-22 - s * 8} -58`, SLV) + hand(-22 - s * 8, -55) + limb(`M16 -92 Q${26 - s * 4} -74 ${22 - s * 8} -58`, SLV) + hand(22 - s * 8, -55);
    } else h += limb('M-16 -92 Q-28 -74 -24 -58', SLV) + hand(-24, -55) + limb('M16 -92 Q28 -74 24 -58', SLV) + hand(24, -55);
    if (st.basket && pose !== 'cheer') {
      const bx = pose === 'run' ? 42 : pose === 'point' ? -26 : 26;
      const by = pose === 'run' ? -82 : -36;
      h += `<g transform="translate(${bx} ${by}) scale(.6)">${basket(['bread', 'cake'])}</g>`;
    }
    return h;
  }

  /* ============================ おかあさん・おばあさん ============================ */

  function motherInner(st) {
    const face = st.face || 'smile';
    const f = face === 'wow' ? `${eye(-8, -147, 3.8)}${eye(8, -147, 3.8)}${mouth(0, -132, 'o')}`
      : face === 'talk' ? `${eye(-8, -147)}${eye(8, -147)}${mouth(0, -133, 'big')}`
        : `${arc(-8, -146, 4.5, true)}${arc(8, -146, 4.5, true)}${mouth(0, -133)}`;
    return `<ellipse cx="0" cy="2" rx="34" ry="6" fill="#000" opacity=".13"/>
      <path d="M-26 -112 Q0 -122 26 -112 L36 -2 Q0 4 -36 -2 Z" fill="#748ffc" stroke="#4c6ef5" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-18 -92 Q0 -96 18 -92 L22 -8 Q0 -4 -22 -8 Z" fill="#fff" stroke="#dee2e6" stroke-width="2"/>
      ${limb('M-24 -108 Q-34 -84 -20 -70', '#748ffc', 11)}${limb('M24 -108 Q40 -110 46 -128', '#748ffc', 11)}
      ${hand(-18, -68)}${hand(48, -131)}
      <rect x="-6" y="-128" width="12" height="12" fill="${SKIN}"/>
      <circle cx="0" cy="-144" r="22" fill="${SKIN}"/>
      <path d="M-23 -142 Q-24 -170 0 -170 Q24 -170 23 -142 Q16 -158 0 -158 Q-16 -158 -23 -142 Z" fill="#8d5a3b"/>
      <circle cx="0" cy="-172" r="10" fill="#8d5a3b"/>
      ${cheeks(-136, 14)}${f}`;
  }

  function grannyInner(st) {
    const face = st.face || 'smile';
    const f = face === 'wow' ? `${eye(-8, -130, 3.4)}${eye(8, -130, 3.4)}${mouth(0, -114, 'o')}`
      : face === 'worry' ? `${eye(-8, -130)}${eye(8, -130)}${mouth(0, -114, 'sad')}`
        : `${arc(-8, -129, 4, true)}${arc(8, -129, 4, true)}${mouth(0, -116)}`;
    return `<ellipse cx="0" cy="2" rx="32" ry="6" fill="#000" opacity=".13"/>
      <path d="M-24 -98 L-32 -4 Q0 4 32 -4 L24 -98 Z" fill="#9775fa" stroke="#7048e8" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="-10" cy="-2" rx="10" ry="5" fill="#5c3b25"/><ellipse cx="10" cy="-2" rx="10" ry="5" fill="#5c3b25"/>
      <path d="M-28 -100 Q0 -80 28 -100 L22 -70 Q0 -56 -22 -70 Z" fill="#f783ac" stroke="#e64980" stroke-width="2"/>
      ${limb('M-22 -92 Q-30 -70 -16 -60', '#9775fa', 10)}${limb('M22 -92 Q30 -70 16 -60', '#9775fa', 10)}${hand(-12, -58)}${hand(12, -58)}
      <circle cx="0" cy="-128" r="22" fill="${SKIN}"/>
      <path d="M-23 -126 Q-24 -154 0 -154 Q24 -154 23 -126 Q16 -142 0 -142 Q-16 -142 -23 -126 Z" fill="#f1f3f5" stroke="#ced4da" stroke-width="1.5"/>
      <circle cx="0" cy="-156" r="10" fill="#f1f3f5" stroke="#ced4da" stroke-width="1.5"/>
      ${cheeks(-120, 13)}${f}
      <circle cx="-8" cy="-130" r="7.5" fill="none" stroke="#868e96" stroke-width="2"/><circle cx="8" cy="-130" r="7.5" fill="none" stroke="#868e96" stroke-width="2"/>
      <path d="M-0.5 -130 H0.5" stroke="#868e96" stroke-width="2"/>`;
  }

  /* ============================ おおかみ（まぬけ で こわくない） ============================ */

  // かお の ぶひん（あたま の まんなか が (0,-140)、はな は みぎ むき）
  function wolfEars() {
    return `<path d="M-22 -158 L-30 -196 L-4 -168 Z" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-20 -164 L-25 -186 L-10 -170 Z" fill="#ffc9c9"/>
      <path d="M2 -168 L14 -202 L24 -162 Z" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 -168 L14 -192 L19 -166 Z" fill="#ffc9c9"/>`;
  }
  function wolfEyes(face, glasses) {
    let h;
    if (face === 'oops') h = `${arc(-6, -148, 6, false)}${arc(15, -150, 5, false)}`;
    else {
      const small = face === 'wow' || face === 'scared';
      const wr = face === 'scared' ? 11 : 9;
      h = `<circle cx="-6" cy="-148" r="${wr}" fill="#fff" stroke="${GREY_D}" stroke-width="2"/><circle cx="15" cy="-150" r="${wr - 1}" fill="#fff" stroke="${GREY_D}" stroke-width="2"/>
        <circle cx="${small ? -6 : -3}" cy="${small ? -148 : -146}" r="${small ? 2.4 : 4}" fill="${INK}"/><circle cx="${small ? 15 : 17}" cy="${small ? -150 : -152}" r="${small ? 2.2 : 3.4}" fill="${INK}"/>
        <path d="M-15 -162 L-1 -158 M8 -162 L22 -164" stroke="${GREY_D}" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (glasses) h += `<circle cx="-6" cy="-148" r="12" fill="none" stroke="#f08c00" stroke-width="2.4"/><circle cx="15" cy="-150" r="11" fill="none" stroke="#f08c00" stroke-width="2.4"/><path d="M6 -149 h-1" stroke="#f08c00" stroke-width="2.4"/>`;
    return h;
  }
  function wolfMouth(face) {
    let m;
    if (face === 'wow' || face === 'scared') m = `<ellipse cx="34" cy="-118" rx="7" ry="8" fill="#c92a2a"/>`;
    else if (face === 'oops') m = `<path d="M20 -120 q5 -4 10 0 q5 4 10 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    else m = `<path d="M18 -122 Q30 -112 44 -122" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="27" y="-118" width="7" height="7" rx="1.5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;
    return `<ellipse cx="26" cy="-128" rx="24" ry="14" fill="#dee2e6" stroke="${GREY_D}" stroke-width="2"/>
      <ellipse cx="48" cy="-133" rx="8" ry="6.5" fill="#343a40"/><circle cx="46" cy="-135" r="2" fill="#fff" opacity=".7"/>${m}`;
  }
  function nightcap() {
    return `<path d="M-30 -146 Q-32 -180 0 -180 Q32 -180 32 -146 Q0 -158 -30 -146 Z" fill="#fff" stroke="#dee2e6" stroke-width="2"/>
      <path d="M-26 -172 Q-52 -178 -60 -152" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round"/><circle cx="-60" cy="-148" r="7" fill="#ffd43b"/>
      <path d="M-32 -146 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0 q5 5 10 0" stroke="#fcc2d7" stroke-width="3" fill="none"/>`;
  }
  function wolfHead(face, cap) {
    let h = `<circle cx="0" cy="-140" r="28" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5"/>
      <path d="M-26 -128 q6 10 16 10 q-4 6 -12 4 Z" fill="${GREY_L}"/>`;
    if (cap) h += nightcap();
    h += wolfEars() + wolfEyes(face, cap) + wolfMouth(face);
    if (face === 'oops' || face === 'scared') h += '<path d="M-34 -168 q-6 10 0 14 q6 -4 0 -14 Z" fill="#74c0fc"/>';
    return h;
  }

  /*
   * おおかみ。st = { face, pose, cap }
   * face: grin / wow / oops / scared
   * pose: stand / walk1 / walk2 / knock / run
   * cap: ねまき と ナイトキャップ（へんそう）
   */
  function wolfInner(st) {
    const pose = st.pose || 'stand';
    const face = st.face || 'grin';
    let h = '<ellipse cx="0" cy="2" rx="34" ry="6" fill="#000" opacity=".13"/>';
    h += `<path d="M-22 -60 Q-64 -58 -78 -98 Q-60 -84 -46 -86 Q-62 -98 -58 -112 Q-40 -86 -20 -78 Z" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M-70 -96 Q-76 -98 -78 -98 Q-72 -104 -66 -100 Z" fill="#fff"/>`;
    const a = pose === 'walk1' ? 18 : pose === 'walk2' ? -18 : pose === 'run' ? 34 : 0;
    const leg = (x, r) => `<g transform="rotate(${r} ${x + 7} -48)"><rect x="${x}" y="-50" width="14" height="46" rx="6" fill="${GREY}" stroke="${GREY_D}" stroke-width="2"/><ellipse cx="${x + 9}" cy="-4" rx="12" ry="6" fill="#495057"/></g>`;
    h += leg(-18, a) + leg(4, -a);
    h += `<ellipse cx="0" cy="-84" rx="30" ry="40" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5"/><ellipse cx="6" cy="-78" rx="17" ry="27" fill="${GREY_L}"/>`;
    if (st.cap) h += `<path d="M-28 -112 Q-42 -60 -34 -34 Q0 -26 34 -34 Q42 -60 28 -112 Q0 -122 -28 -112 Z" fill="#fcc2d7" stroke="#e64980" stroke-width="2"/>
      <path d="M-26 -112 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0" stroke="#fff" stroke-width="4" fill="none"/>`;
    const arm = st.cap ? '#fcc2d7' : GREY;
    const paw = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="${GREY}" stroke="${GREY_D}" stroke-width="2"/>`;
    if (pose === 'knock') h += limb('M-22 -104 Q-36 -84 -30 -64', arm, 12) + paw(-30, -61) + limb('M22 -104 Q44 -110 52 -128', arm, 12) + paw(54, -131);
    else if (pose === 'run') h += limb('M-22 -104 Q-42 -120 -38 -146', arm, 12) + paw(-38, -149) + limb('M22 -104 Q44 -124 42 -148', arm, 12) + paw(42, -151);
    else h += limb('M-22 -104 Q-36 -84 -30 -64', arm, 12) + paw(-30, -61) + limb('M22 -104 Q36 -84 30 -64', arm, 12) + paw(30, -61);
    h += wolfHead(face, st.cap);
    return h;
  }

  /*
   * ベッド の なか の へんそう おおかみ（ページ 7・8）。parts は べつべつ の <g id="part-…">。
   * app.js が その <g> に CSS の transform: scale() を かける（transform-box: fill-box で まんなか から）
   */
  function bedWolfInner(face) {
    const X = POS.bed.x;
    const T = `translate(${X - 10} 389) scale(1.35)`;
    return `<g transform="${T}">
        <circle cx="0" cy="-140" r="28" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5"/>
        <path d="M-26 -128 q6 10 16 10 q-4 6 -12 4 Z" fill="${GREY_L}"/>
        ${nightcap()}
        <g id="part-ears" class="part">${wolfEars()}</g>
        <g id="part-eyes" class="part">${wolfEyes(face, true)}</g>
        <g id="part-mouth" class="part">${wolfMouth(face)}</g>
        ${face === 'oops' || face === 'scared' ? '<path d="M-34 -168 q-6 10 0 14 q6 -4 0 -14 Z" fill="#74c0fc"/>' : ''}
      </g>`;
  }

  function bed(kind, face) {
    const X = POS.bed.x;
    let h = `<path d="M${X - 160} 300 V170 Q${X} 104 ${X + 160} 170 V300 Z" fill="#a0522d" stroke="#6b4226" stroke-width="4"/>
      <path d="M${X - 136} 290 V182 Q${X} 128 ${X + 136} 182 V290 Z" fill="#c0763a"/>
      <circle cx="${X}" cy="150" r="9" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>`;
    if (kind === 'wolf') {
      h += `<ellipse cx="${X}" cy="250" rx="100" ry="26" fill="#fff" stroke="#dee2e6" stroke-width="2"/>`;
      // ふとん の した（めくる と みえる）: ねまき・あし・しっぽ
      h += `<rect x="${X - 80}" y="222" width="160" height="164" rx="34" fill="#fcc2d7" stroke="#e64980" stroke-width="2"/>
        <path d="M${X - 50} 380 v-50 M${X - 20} 380 v-50" stroke="${GREY}" stroke-width="22" stroke-linecap="round"/>
        <g id="tail" class="tail"><path d="M${X + 60} 330 Q${X + 110} 300 ${X + 150} 318 Q${X + 126} 326 ${X + 136} 340 Q${X + 104} 336 ${X + 64} 356 Z" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M${X + 140} 318 Q${X + 150} 318 ${X + 150} 318 Q${X + 140} 330 ${X + 134} 326 Z" fill="#fff"/></g>`;
      h += `<g id="bedwolf">${bedWolfInner(face || 'grin')}</g>`;
    } else {
      h += `<ellipse cx="${X}" cy="250" rx="100" ry="26" fill="#fff" stroke="#dee2e6" stroke-width="2"/>`;
    }
    if (kind !== 'mess') {
      let q = '';
      for (let i = 0; i < 4; i += 1) for (let j = 0; j < 2; j += 1) q += `<rect x="${X - 150 + i * 76 + (j % 2) * 38}" y="${308 + j * 46}" width="30" height="30" rx="6" fill="#fff" opacity=".35"/>`;
      h += `<g id="blanket"><rect x="${X - 160}" y="280" width="320" height="124" rx="22" fill="#ff8787" stroke="#e03131" stroke-width="3"/>${q}
        <rect x="${X - 160}" y="280" width="320" height="22" rx="11" fill="#fff" stroke="#ffc9c9" stroke-width="2"/></g>`;
    } else {
      h += `<path d="M${X - 160} 404 Q${X - 60} 380 ${X + 20} 410 Q${X + 100} 440 ${X + 170} 400 L${X + 176} 440 L${X - 160} 440 Z" fill="#ff8787" stroke="#e03131" stroke-width="3"/>`;
    }
    if (kind === 'wolf') {
      // ふとん の うえ の て
      const paw = (x) => `<ellipse cx="${x}" cy="296" rx="18" ry="13" fill="${GREY}" stroke="${GREY_D}" stroke-width="2.5"/>
        <path d="M${x - 8} 290 v8 M${x} 288 v9 M${x + 8} 290 v8" stroke="${GREY_D}" stroke-width="2"/>`;
      h += `<g id="part-hands" class="part">${paw(X - 46)}${paw(X + 46)}</g>`;
    }
    h += `<rect x="${X - 170}" y="400" width="340" height="30" rx="8" fill="#8d5a3b"/><rect x="${X - 164}" y="426" width="18" height="24" fill="#6b4226"/><rect x="${X + 146}" y="426" width="18" height="24" fill="#6b4226"/>`;
    return h;
  }

  /* ============================ きこり ============================ */

  function kikoriInner(st) {
    const shout = st.pose === 'shout';
    const face = shout ? `${eye(-8, -150, 4)}${eye(8, -150, 4)}<path d="M-16 -162 L-3 -157 M16 -162 L3 -157" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><ellipse cx="0" cy="-130" rx="9" ry="11" fill="#c92a2a"/>`
      : st.face === 'wow' ? `${eye(-8, -150, 4)}${eye(8, -150, 4)}${mouth(0, -132, 'o')}`
        : `${arc(-8, -149, 4.5, true)}${arc(8, -149, 4.5, true)}${mouth(0, -134)}`;
    let h = '<ellipse cx="0" cy="2" rx="36" ry="6" fill="#000" opacity=".13"/>';
    h += `<rect x="-20" y="-60" width="17" height="58" rx="6" fill="#5c7cfa"/><rect x="3" y="-60" width="17" height="58" rx="6" fill="#4c6ef5"/>
      <ellipse cx="-12" cy="-3" rx="13" ry="6" fill="#5c3b25"/><ellipse cx="12" cy="-3" rx="13" ry="6" fill="#5c3b25"/>
      <path d="M-30 -118 Q0 -128 30 -118 L28 -54 Q0 -48 -28 -54 Z" fill="#e8590c" stroke="#c2410c" stroke-width="3"/>
      <path d="M-30 -100 H30 M-29 -80 H29 M-10 -122 V-52 M10 -122 V-52" stroke="#a61e4d" stroke-width="3" opacity=".7"/>`;
    if (shout) {
      h += limb('M-26 -112 Q-46 -128 -44 -156', '#e8590c', 13) + hand(-44, -160) + limb('M26 -112 Q46 -128 44 -156', '#e8590c', 13) + hand(44, -160);
    } else {
      h += `<g transform="rotate(-30 30 -112)"><rect x="27" y="-190" width="7" height="90" rx="3" fill="#a0522d"/><path d="M30 -186 L52 -196 Q58 -180 52 -166 L30 -172 Z" fill="#adb5bd" stroke="#495057" stroke-width="2"/></g>`;
      h += limb('M-26 -112 Q-38 -86 -30 -66', '#e8590c', 13) + hand(-30, -63) + limb('M26 -112 Q40 -126 34 -140', '#e8590c', 13) + hand(32, -142);
    }
    h += `<circle cx="0" cy="-148" r="24" fill="${SKIN}"/>
      <path d="M-24 -144 Q-26 -108 0 -106 Q26 -108 24 -144 Q20 -126 0 -124 Q-20 -126 -24 -144 Z" fill="#8d5a3b"/>
      <path d="M-26 -160 Q-24 -186 0 -186 Q24 -186 26 -160 Z" fill="#2f9e44"/><rect x="-30" y="-164" width="60" height="8" rx="4" fill="#237a35"/>
      ${face}`;
    return h;
  }

  /* ============================ けしき ============================ */

  function defs() {
    return `<defs>
      <linearGradient id="${P}skyG" x1="0" y1="0" x2="0" y2="1"><stop class="sky0" offset="0" stop-color="#8fd0ff"/><stop class="sky1" offset="1" stop-color="#e7f7ff"/></linearGradient>
      <linearGradient id="${P}forestG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b2f2bb"/><stop offset="1" stop-color="#d8f5a2"/></linearGradient>
      <linearGradient id="${P}fieldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9db7c"/><stop offset="1" stop-color="#7cbf4e"/></linearGradient>
      <linearGradient id="${P}wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4e6"/><stop offset="1" stop-color="#ffe8cc"/></linearGradient>
      <clipPath id="${P}winC"><rect x="${POS.win.x0}" y="${POS.win.y0}" width="${POS.win.x1 - POS.win.x0}" height="${POS.win.y1 - POS.win.y0}" rx="8"/></clipPath>
    </defs>`;
  }

  function tree(x, y, s, dark) {
    const c1 = dark ? '#2b8a3e' : '#40c057';
    const c2 = dark ? '#237a35' : '#2f9e44';
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-10" y="-80" width="20" height="82" rx="6" fill="#8d5a3b"/>
      <circle cx="0" cy="-110" r="46" fill="${c1}"/><circle cx="-30" cy="-86" r="30" fill="${c2}"/><circle cx="30" cy="-88" r="32" fill="${c2}"/>
      <circle cx="-12" cy="-124" r="14" fill="#69db7c" opacity=".6"/></g>`;
  }

  function flower(x, y, c, s) {
    return `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M0 0 V24" stroke="#2f9e44" stroke-width="3"/><path d="M0 16 q10 -8 14 -2 q-6 6 -14 2 Z" fill="#40c057"/>
      ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-9" rx="6" ry="9" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="#ffd43b"/></g>`;
  }
  const FLOWER_C = ['#ff8787', '#ffd43b', '#da77f2', '#74c0fc', '#ffa94d', '#f783ac'];

  function forestBack() {
    let h = `<rect width="800" height="500" fill="url(#${P}skyG)"/>`;
    h += '<path d="M0 230 Q100 170 200 210 Q300 150 420 200 Q540 150 640 200 Q720 170 800 200 V320 H0 Z" fill="#8ce99a" opacity=".8"/>';
    h += `<path d="M0 250 Q200 230 400 250 T800 246 V500 H0 Z" fill="url(#${P}forestG)"/>`;
    return h;
  }

  // ページ 2: くねくね の みち
  function pathScene() {
    let h = forestBack();
    h += tree(90, 250, 0.9, true) + tree(200, 230, 0.7, true) + tree(470, 180, 0.6, true) + tree(690, 220, 0.8, true) + tree(780, 200, 0.6, true);
    const d = 'M' + POS.path.map((p) => p.join(' ')).join(' L');
    h += `<path id="road" d="${d}" stroke="#d9a066" stroke-width="58" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
      <path d="${d}" stroke="#f3d9b1" stroke-width="44" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" stroke="#fff" stroke-width="3" stroke-dasharray="4 18" fill="none" stroke-linecap="round" opacity=".8"/>`;
    h += tree(450, 380, 0.85) + tree(130, 360, 0.75) + tree(560, 470, 0.9) + tree(760, 480, 0.8);
    h += flower(200, 330, '#ff8787', 0.7) + flower(470, 290, '#ffd43b', 0.7) + flower(680, 420, '#da77f2', 0.7);
    // ゴール（おばあさん の いえ の やね が ちらり）
    h += `<g transform="translate(762 236)"><path d="M-34 0 L0 -30 L34 0 Z" fill="#c2410c"/><rect x="-26" y="0" width="52" height="30" fill="#fff4e6" stroke="#d9480f" stroke-width="2"/><text x="0" y="-36" font-size="26" text-anchor="middle">🏠</text></g>`;
    h += `<path id="walked" d="${d}" stroke="#ffd43b" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 9999" opacity=".85"/>`;
    return h;
  }

  // ページ 3: おおかみ と であう
  function meetScene() {
    let h = forestBack();
    h += tree(60, 300, 0.9, true) + tree(260, 250, 0.7, true) + tree(420, 260, 0.75, true) + tree(780, 280, 0.9, true);
    h += '<path d="M0 470 Q300 430 500 446 T800 440 V480 Q500 484 0 500 Z" fill="#f3d9b1"/>';
    return h;
  }

  // ページ 4: はなばたけ。sun は 0〜1（よりみち する と かたむく）
  function meadowScene(s) {
    const q = Math.max(0, Math.min(1, s.sun || 0));
    let h = `<rect width="800" height="500" fill="url(#${P}skyG)"/>`;
    h += `<g id="sun" transform="translate(${sunXY(q).x.toFixed(1)} ${sunXY(q).y.toFixed(1)})"><circle r="40" fill="#ffd43b" opacity=".35"/><circle r="30" fill="#ffd43b"/>
      ${arc(-9, -2, 4, true)}${arc(9, -2, 4, true)}${mouth(0, 9)}</g>`;
    h += '<path d="M0 250 Q140 210 300 240 Q480 200 640 236 Q720 220 800 236 V320 H0 Z" fill="#8ce99a"/>';
    h += `<path d="M0 280 Q200 260 400 284 T800 276 V500 H0 Z" fill="url(#${P}fieldG)"/>`;
    h += tree(40, 290, 0.8, true) + tree(780, 270, 0.7, true);
    h += '<path d="M0 470 Q100 456 200 470 L200 500 L0 500 Z" fill="#f3d9b1"/>';
    POS.flowers.forEach((p, i) => {
      if (s.taken && s.taken[i]) return;
      h += `<g id="flower-${i}" class="flower">${flower(p[0], p[1], FLOWER_C[i % FLOWER_C.length], 1.25)}</g>`;
    });
    return h;
  }
  function sunXY(q) {
    const S = POS.sun;
    return { x: S.x0 + (S.x1 - S.x0) * q, y: S.y0 + (S.y1 - S.y0) * q * q };
  }

  // ページ 1: だいどころ
  function kitchen(s) {
    let h = `<rect width="800" height="500" fill="url(#${P}wallG)"/>`;
    h += '<rect x="0" y="0" width="800" height="22" fill="#ffd8a8"/>';
    h += `<rect x="560" y="60" width="160" height="130" rx="8" fill="#a5d8ff" stroke="#a0522d" stroke-width="6"/><path d="M640 60 V190 M560 125 H720" stroke="#a0522d" stroke-width="4"/>
      <path d="M552 54 Q590 120 560 196 L552 196 Z M728 54 Q690 120 720 196 L728 196 Z" fill="#ffc9c9"/>`;
    h += '<rect x="0" y="400" width="800" height="100" fill="#e9c79a"/><path d="M0 400 H800" stroke="#c0763a" stroke-width="5"/>';
    for (let x = 0; x < 800; x += 80) h += `<path d="M${x} 404 L${x - 30} 500" stroke="#d9a066" stroke-width="2"/>`;
    h += '<rect x="160" y="318" width="320" height="16" rx="5" fill="#c0763a"/><rect x="176" y="334" width="14" height="80" fill="#a0522d"/><rect x="450" y="334" width="14" height="80" fill="#a0522d"/>';
    h += `<path d="M168 318 L200 300 L440 300 L472 318 Z" fill="#fff" opacity=".8"/>`;
    h += `<g id="basket" transform="translate(${POS.basket.x} ${POS.basket.y + 18}) scale(1.6)">${basket(s.inBasket)}</g>`;
    return h;
  }

  // おばあさん の へや。s.closet = 0（あいて いる）〜 1（しまって いる）
  function room(s) {
    let h = `<rect width="800" height="500" fill="url(#${P}wallG)"/>`;
    for (let x = 20; x < 800; x += 60) h += `<path d="M${x} 0 V400" stroke="#ffd8a8" stroke-width="8" opacity=".5"/>`;
    h += '<rect x="0" y="400" width="800" height="100" fill="#d9a066"/><path d="M0 400 H800" stroke="#a0522d" stroke-width="5"/>';
    for (let x = 0; x < 900; x += 70) h += `<path d="M${x} 404 L${x - 40} 500" stroke="#c0763a" stroke-width="2"/>`;
    // ドア（ひだり）
    h += `<rect x="28" y="214" width="96" height="190" rx="6" fill="#6b4226"/>
      <g id="rdoor" style="transform-box: view-box; transform-origin: 32px 300px; transform: scaleX(${s.doorOpen ? 0.25 : 1})">
        <rect x="32" y="218" width="88" height="186" rx="4" fill="#a0522d" stroke="#6b4226" stroke-width="3"/>
        <rect x="44" y="236" width="64" height="66" rx="4" fill="none" stroke="#6b4226" stroke-width="3"/><rect x="44" y="316" width="64" height="72" rx="4" fill="none" stroke="#6b4226" stroke-width="3"/>
        <circle cx="108" cy="312" r="5" fill="#fcc419"/></g>`;
    // まど
    const W = POS.win;
    h += `<rect x="${W.x0 - 8}" y="${W.y0 - 8}" width="${W.x1 - W.x0 + 16}" height="${W.y1 - W.y0 + 16}" rx="10" fill="#a0522d"/>
      <g clip-path="url(#${P}winC)"><rect x="${W.x0}" y="${W.y0}" width="${W.x1 - W.x0}" height="${W.y1 - W.y0}" fill="#a5d8ff"/>
        <path d="M${W.x0} ${W.y1 - 40} Q${W.x} ${W.y1 - 70} ${W.x1} ${W.y1 - 44} V${W.y1} H${W.x0} Z" fill="#8ce99a"/>
        ${tree(W.x0 + 20, W.y1 - 10, 0.5, true)}${tree(W.x1 - 10, W.y1 - 20, 0.45, true)}
        ${s.kikoriWin ? `<g id="kikori" transform="translate(${W.x} ${W.y1 + 74}) scale(.8)"><g class="in">${kikoriInner(s.kikoriWin)}</g></g>` : ''}</g>
      <path d="M${W.x} ${W.y0} V${W.y1} M${W.x0} ${(W.y0 + W.y1) / 2} H${W.x1}" stroke="#a0522d" stroke-width="5"/>
      <rect x="${W.x0 - 14}" y="${W.y1 + 6}" width="${W.x1 - W.x0 + 28}" height="10" rx="4" fill="#8d5a3b"/>`;
    // クローゼット（みぎ）
    const C = POS.closet;
    h += `<rect x="${C.x0 - 6}" y="${C.y0 - 14}" width="${C.x1 - C.x0 + 12}" height="14" rx="4" fill="#8d5a3b"/>
      <rect x="${C.x0}" y="${C.y0}" width="${C.x1 - C.x0}" height="${C.y1 - C.y0}" fill="#5c3b25" stroke="#6b4226" stroke-width="4"/>
      <path d="M${C.x0 + 8} ${C.y0 + 26} H${C.x1 - 8}" stroke="#adb5bd" stroke-width="4"/>
      <path d="M${C.x0 + 20} ${C.y0 + 26} l-8 40 h16 Z M${C.x1 - 26} ${C.y0 + 26} l-10 50 h20 Z" fill="#74c0fc" opacity=".8"/>
      <g id="inCloset"></g>`;
    if (s.granny && s.granny.inCloset) h += `<g id="granny" transform="translate(${C.x} ${C.y1 - 2}) scale(.88)"><g class="in">${grannyInner(s.granny)}</g></g>`;
    const k = closetK(s.closet == null ? 1 : s.closet);
    h += `<g id="cdoor" transform="translate(${C.x0} 0) scale(${k.toFixed(3)} 1) translate(${-C.x0} 0)">
      <rect x="${C.x0}" y="${C.y0}" width="${C.x1 - C.x0}" height="${C.y1 - C.y0}" fill="#c0763a" stroke="#8d5a3b" stroke-width="4"/>
      <rect x="${C.x0 + 14}" y="${C.y0 + 18}" width="${C.x1 - C.x0 - 28}" height="100" rx="6" fill="none" stroke="#8d5a3b" stroke-width="3"/>
      <rect x="${C.x0 + 14}" y="${C.y0 + 136}" width="${C.x1 - C.x0 - 28}" height="110" rx="6" fill="none" stroke="#8d5a3b" stroke-width="3"/>
      <circle cx="${C.x1 - 16}" cy="${C.y + 10}" r="6" fill="#fcc419"/></g>`;
    h += `<rect x="${C.x0 - 4}" y="${C.y1}" width="${C.x1 - C.x0 + 8}" height="10" fill="#6b4226"/>`;
    if (s.bed) h += bed(s.bed, s.bedFace);
    if (s.table) h += table(s);
    return h;
  }
  // クローゼット の とびら の よこ の のび（-0.35 で ひらいて ひだり へ、1 で しまる）
  function closetK(c) {
    const k = -0.42 + 1.42 * Math.max(0, Math.min(1, c));
    return Math.abs(k) < 0.04 ? (k < 0 ? -0.04 : 0.04) : k;
  }

  function table(s) {
    const C = POS.cake;
    let h = `<rect x="220" y="370" width="360" height="18" rx="6" fill="#c0763a"/><path d="M226 370 L250 352 H550 L574 370 Z" fill="#fff" stroke="#ffc9c9" stroke-width="2"/>
      <rect x="240" y="388" width="14" height="62" fill="#a0522d"/><rect x="546" y="388" width="14" height="62" fill="#a0522d"/>`;
    h += `<g transform="translate(${C.x} ${C.y + 12})"><ellipse cx="0" cy="6" rx="46" ry="8" fill="#fff" stroke="#ced4da" stroke-width="2"/>
      <g id="wholeCake" transform="translate(0 -12) scale(${1.2 - 0.2 * (s.slices || 0)})">${s.slices >= 3 ? '' : item('cake')}</g></g>`;
    POS.plates.forEach((p, i) => {
      h += `<g id="plate-${i}" transform="translate(${p.x} ${p.y})"><ellipse rx="34" ry="10" fill="#fff" stroke="#adb5bd" stroke-width="2.5"/><ellipse rx="22" ry="6" fill="none" stroke="#e9ecef" stroke-width="2"/>
        ${s.plates && s.plates[i] ? `<g transform="translate(0 -10)">${item('slice')}</g>` : ''}</g>`;
    });
    return h;
  }

  // ページ 6: おばあさん の いえ の まえ
  function cottage(s) {
    let h = forestBack();
    h += tree(60, 330, 1, true) + tree(760, 330, 1.05, true);
    const D = POS.houseDoor;
    h += `<rect x="280" y="210" width="380" height="242" fill="#fff4e6" stroke="#d9480f" stroke-width="4"/>
      <path d="M256 216 L470 80 L684 216 Z" fill="#c2410c" stroke="#9c3d2a" stroke-width="4" stroke-linejoin="round"/>
      <rect x="590" y="100" width="34" height="70" fill="#a0522d"/>
      <rect x="310" y="260" width="90" height="80" rx="6" fill="#a5d8ff" stroke="#a0522d" stroke-width="5"/><path d="M355 260 V340 M310 300 H400" stroke="#a0522d" stroke-width="3"/>
      <rect x="560" y="260" width="74" height="70" rx="6" fill="#ffe066" stroke="#a0522d" stroke-width="5"/><path d="M597 260 V330" stroke="#a0522d" stroke-width="3"/>
      <rect x="${D.x - 42}" y="${D.y - 74}" width="84" height="146" rx="10" fill="#6b4226"/>
      <g id="hdoor"><rect x="${D.x - 38}" y="${D.y - 70}" width="76" height="142" rx="8" fill="#a0522d" stroke="#6b4226" stroke-width="3"/>
        <circle cx="${D.x + 24}" cy="${D.y + 6}" r="5" fill="#fcc419"/><rect x="${D.x - 14}" y="${D.y - 50}" width="28" height="36" rx="12" fill="#ffe066" opacity=".7"/></g>
      <path d="M260 452 H680" stroke="#c0763a" stroke-width="6"/>`;
    h += '<path d="M0 470 Q300 446 470 456 T800 452 V500 H0 Z" fill="#f3d9b1"/>';
    h += flower(300, 440, '#ff8787', 0.8) + flower(640, 440, '#da77f2', 0.8);
    return h;
  }

  /* ============================ ふきだし ============================ */

  function bubble(x, y, text, opt) {
    const o = opt || {};
    const fs = o.big ? 30 : 23;
    let tw = 0;
    for (const ch of text) tw += /[\x20-\x7e’…]/.test(ch) ? fs * 0.56 : fs * 1.04;
    const w = Math.max(70, tw + 28);
    const h = o.big ? 56 : 46;
    // え から はみださない ように
    const cx = Math.max(w / 2 + 14, Math.min(800 - w / 2 - 14, x));
    const tail = Math.max(-w / 2 + 20, Math.min(w / 2 - 20, x - cx));
    const cy = Math.max(y, h + 18);
    const fill = o.fill || '#fff';
    return `<g class="bubble ${o.cls || ''}" transform="translate(${cx} ${cy})">
      <rect x="${-w / 2}" y="${-h - 12}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${INK}" stroke-width="3"/>
      <path d="M${tail - 9} -13.5 L${tail} 2 L${tail + 9} -13.5" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M${tail - 7} -14 H${tail + 7}" stroke="${fill}" stroke-width="4"/>
      <text x="0" y="${-h / 2 - 12 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${INK}">${text}</text></g>`;
  }

  // ページ 3 の えらぶ ふきだし（タップ できる）
  function choice(id, text, picked) {
    const p = POS.choice[id];
    const fs = 26;
    let tw = 0;
    for (const ch of text) tw += /[\x20-\x7e’…!?]/.test(ch) ? fs * 0.56 : fs * 1.04;
    const w = Math.max(200, tw + 40);
    const on = picked === id;
    const off = picked && !on;
    return `<g id="choice-${id}" class="choice${on ? ' on' : ''}" transform="translate(${p.x} ${p.y})" opacity="${off ? 0.35 : 1}">
      <rect x="${-w / 2}" y="-38" width="${w}" height="76" rx="26" fill="${on ? '#fff3bf' : '#fff'}" stroke="${on ? '#f08c00' : RED_D}" stroke-width="5"/>
      <path d="M-14 36 L${id === 'house' ? -40 : 30} 74 L14 36" fill="${on ? '#fff3bf' : '#fff'}" stroke="${on ? '#f08c00' : RED_D}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-12 34 H12" stroke="${on ? '#fff3bf' : '#fff'}" stroke-width="7"/>
      <text x="0" y="10" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${INK}">${text}</text></g>`;
  }

  /* ============================ え ぜんたい ============================ */

  const pose = (name, st, inner) => `<g id="${name}" transform="translate(${st.x.toFixed(1)} ${(st.y == null ? POS.ground : st.y).toFixed(1)}) scale(${(st.flip ? -1 : 1) * (st.s || 1)} ${st.s || 1})"><g class="in">${inner(st)}</g></g>`;

  /*
   * s = {
   *   place: 'kitchen' | 'path' | 'meet' | 'meadow' | 'room' | 'cottage' | 'cover' | 'party',
   *   aka, wolf, granny, kikori, mother: { x, y, s, flip, face, pose, ... },
   *   inBasket, items, choices, picked, sun, closet, doorOpen, bed, bedFace, table, plates, slices, kikoriWin
   * }
   */
  function scene(s) {
    seq += 1;
    P = `g${seq}-`;
    let h = `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" font-family="inherit">${defs()}`;
    if (s.place === 'kitchen') h += kitchen(s);
    else if (s.place === 'path') h += pathScene();
    else if (s.place === 'meet') h += meetScene();
    else if (s.place === 'meadow') h += meadowScene(s);
    else if (s.place === 'room') h += room(s);
    else if (s.place === 'cottage') h += cottage(s);
    else if (s.place === 'cover') {
      h += meetScene();
      h += flower(120, 440, '#ff8787', 1.1) + flower(200, 470, '#ffd43b', 1.1) + flower(640, 450, '#da77f2', 1.1) + flower(720, 470, '#74c0fc', 1.1);
    }
    if (s.items) {
      s.items.forEach((it, i) => {
        if (it.in) return;
        h += `<g id="item-${i}" class="item" transform="translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) scale(1.5)">${item(it.k)}</g>`;
      });
    }
    if (s.choices) h += choice('house', s.choices.house, s.picked) + choice('secret', s.choices.secret, s.picked);
    if (s.mother) h += pose('mother', s.mother, motherInner);
    if (s.granny && !s.granny.inCloset) h += pose('granny', s.granny, grannyInner);
    if (s.kikori) h += pose('kikori', s.kikori, kikoriInner);
    if (s.wolf) h += pose('wolf', s.wolf, wolfInner);
    if (s.aka) h += pose('aka', s.aka, akaInner);
    if (s.place === 'meet' && s.wolf) h += tree(640, 470, 1.2, true).replace('<g ', '<g id="hideTree" ');
    h += '<g id="parts"></g><g id="fx"></g></svg>';
    return h;
  }

  function inner(name, st) {
    if (name === 'aka') return akaInner(st);
    if (name === 'wolf') return wolfInner(st);
    if (name === 'granny') return grannyInner(st);
    if (name === 'kikori') return kikoriInner(st);
    if (name === 'mother') return motherInner(st);
    return '';
  }

  return {
    POS, scene, bubble, inner, item, bedWolfInner, closetK, sunXY, grannyInner, basket, flower,
  };
})();
