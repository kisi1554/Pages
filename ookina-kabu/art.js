'use strict';

/*
 * え の ぶひん。ぜんぶ SVG の もじれつ を かえす（がぞうファイル なし）。
 * え の おおきさ は 800 × 500（viewBox）。じめん は y = 420。
 *
 * なかま は「あしもと を (0,0)、ひだり（かぶ の ほう）を むいた かたち」で かく。
 *   <g id="c-jiji" transform="translate(x,420)">      … いち（app.js が まいフレーム かきかえる）
 *     <g class="lean" transform="rotate(角度)">       … のけぞり・すってんころりん
 *       ポーズ（reach ひっぱる / stand たつ / cheer ばんざい）
 * かぶ も おなじ。<g id="kabu" transform="translate(150, 420-lift) rotate(r) scale(s)">。
 */
const Art = (() => {
  const GROUND = 420;
  const SKIN = '#ffd9b3';
  const INK = '#3b2f3a';
  // グラデーション の id。ひょうし と ほん の え が おなじ ページ に あるので、え ごとに かえる
  let P = '';
  let seq = 0;

  /* ============================ なかま ============================ */

  function eye(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r || 3.2}" fill="${INK}"/>
      <circle cx="${x - 1}" cy="${y - 1.2}" r="1" fill="#fff"/>`;
  }

  // にんげん の うで。pose で かたち が かわる
  function arms(pose, sx, sy, reach, color, hand) {
    const c = color;
    if (pose === 'reach') {
      return `<path d="M${sx + 8} ${sy + 4} Q${sx - reach * 0.4} ${sy + 18} ${sx - reach} ${sy + 12}" stroke="${shade(c)}" stroke-width="13" fill="none" stroke-linecap="round"/>
        <circle cx="${sx - reach - 2}" cy="${sy + 12}" r="8" fill="${hand}"/>
        <path d="M${sx} ${sy} Q${sx - reach * 0.45} ${sy + 8} ${sx - reach + 4} ${sy + 4}" stroke="${c}" stroke-width="14" fill="none" stroke-linecap="round"/>
        <circle cx="${sx - reach}" cy="${sy + 4}" r="9" fill="${hand}"/>`;
    }
    if (pose === 'cheer') {
      return `<path d="M${sx + 18} ${sy} L${sx + 34} ${sy - 46}" stroke="${shade(c)}" stroke-width="13" fill="none" stroke-linecap="round"/>
        <circle cx="${sx + 36}" cy="${sy - 52}" r="8" fill="${hand}"/>
        <path d="M${sx} ${sy} L${sx - 20} ${sy - 48}" stroke="${c}" stroke-width="14" fill="none" stroke-linecap="round"/>
        <circle cx="${sx - 22}" cy="${sy - 54}" r="9" fill="${hand}"/>`;
    }
    return `<path d="M${sx + 2} ${sy} Q${sx - 10} ${sy + 22} ${sx - 8} ${sy + 42}" stroke="${c}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <circle cx="${sx - 8}" cy="${sy + 46}" r="9" fill="${hand}"/>`;
  }

  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.round(v * 0.78));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
  }

  function mouth(pose, x, y, w) {
    if (pose === 'reach') return `<path d="M${x - w} ${y} L${x + w} ${y}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    return `<path d="M${x - w} ${y - 1} Q${x} ${y + w * 1.2} ${x + w} ${y - 1}" stroke="${INK}" stroke-width="2.6" fill="${pose === 'cheer' ? '#e8590c' : 'none'}" stroke-linecap="round"/>`;
  }

  const WHO = {
    // おじいさん（せ が たかい。しろい ひげ）
    jiji(pose) {
      return `
        <ellipse cx="-14" cy="-5" rx="15" ry="6" fill="#5c3b25"/>
        <ellipse cx="9" cy="-5" rx="14" ry="6" fill="#5c3b25"/>
        <rect x="-18" y="-64" width="15" height="58" rx="6" fill="#6d6875"/>
        <rect x="1" y="-64" width="15" height="58" rx="6" fill="#5f5a66"/>
        <rect x="-27" y="-130" width="54" height="76" rx="20" fill="#4c8fd6"/>
        <rect x="-27" y="-70" width="54" height="9" fill="#7a4f2a"/>
        <circle cx="-2" cy="-120" r="3" fill="#fff"/><circle cx="-2" cy="-102" r="3" fill="#fff"/>
        <circle cx="-4" cy="-152" r="27" fill="${SKIN}"/>
        <circle cx="12" cy="-150" r="7" fill="#f7c59f"/>
        <ellipse cx="17" cy="-156" rx="9" ry="13" fill="#f1f3f5"/>
        <path d="M-20 -176 Q-6 -184 10 -176" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>
        <path d="M-24 -163 L-12 -165" stroke="#f1f3f5" stroke-width="5" stroke-linecap="round"/>
        ${eye(-17, -155)}
        <circle cx="-30" cy="-147" r="5.5" fill="#f5b48c"/>
        <circle cx="-14" cy="-143" r="5" fill="#ffa8a8" opacity=".55"/>
        <path d="M-30 -140 Q-34 -112 -14 -108 Q2 -110 6 -132 Q-6 -126 -14 -136 Q-22 -128 -30 -140 Z" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        ${pose === 'cheer' ? '<path d="M-22 -128 Q-14 -120 -6 -128" stroke="#e8590c" stroke-width="4" fill="none" stroke-linecap="round"/>' : ''}
        ${arms(pose, -6, -112, 58, '#4c8fd6', SKIN)}`;
    },
    // おばあさん（スカーフ と エプロン）
    baba(pose) {
      return `
        <ellipse cx="-12" cy="-5" rx="13" ry="6" fill="#5c3b25"/>
        <ellipse cx="9" cy="-5" rx="12" ry="6" fill="#5c3b25"/>
        <rect x="-14" y="-30" width="11" height="26" rx="4" fill="${SKIN}"/>
        <rect x="3" y="-30" width="11" height="26" rx="4" fill="#f7c59f"/>
        <path d="M-20 -120 Q0 -128 20 -120 L32 -24 Q0 -16 -32 -24 Z" fill="#c2255c"/>
        <path d="M-24 -84 L-10 -84 L-6 -26 Q-18 -24 -30 -27 Z" fill="#fff" opacity=".92"/>
        <circle cx="-17" cy="-60" r="2.4" fill="#fcc2d7"/><circle cx="-14" cy="-44" r="2.4" fill="#fcc2d7"/>
        <circle cx="-4" cy="-141" r="25" fill="${SKIN}"/>
        <path d="M-30 -146 Q-26 -176 0 -174 Q26 -172 24 -140 Q14 -158 -4 -160 Q-20 -160 -30 -146 Z" fill="#ced4da"/>
        <circle cx="20" cy="-160" r="11" fill="#adb5bd"/>
        <path d="M-32 -150 Q-4 -186 26 -148 L30 -138 Q-2 -170 -32 -142 Z" fill="#ffa94d"/>
        <path d="M24 -140 L36 -126 L26 -124 Z" fill="#ffa94d"/>
        ${eye(-16, -142)}
        <circle cx="-28" cy="-135" r="4" fill="#f5b48c"/>
        <circle cx="-12" cy="-131" r="5" fill="#ffa8a8" opacity=".55"/>
        ${mouth(pose, -18, -126, 5)}
        ${arms(pose, -8, -106, 54, '#c2255c', SKIN)}`;
    },
    // まご（おさげ の おんなのこ）
    mago(pose) {
      return `
        <ellipse cx="-10" cy="-4" rx="11" ry="5" fill="#e03131"/>
        <ellipse cx="8" cy="-4" rx="10" ry="5" fill="#e03131"/>
        <rect x="-12" y="-28" width="9" height="24" rx="4" fill="${SKIN}"/>
        <rect x="3" y="-28" width="9" height="24" rx="4" fill="#f7c59f"/>
        <path d="M-15 -88 Q0 -94 15 -88 L26 -26 Q0 -20 -26 -26 Z" fill="#ffd43b"/>
        <path d="M-24 -36 Q0 -30 24 -36" stroke="#f08c00" stroke-width="4" fill="none"/>
        <circle cx="-2" cy="-106" r="22" fill="${SKIN}"/>
        <path d="M-25 -108 Q-24 -132 -2 -130 Q22 -130 22 -104 Q12 -120 -6 -118 Q-16 -116 -25 -108 Z" fill="#8d5a3b"/>
        <path d="M16 -110 Q34 -104 30 -80 Q26 -72 22 -82 Q24 -96 14 -100 Z" fill="#8d5a3b"/>
        <path d="M18 -116 l12 -8 l0 14 Z M18 -116 l-2 -12 l12 4 Z" fill="#e64980"/>
        ${eye(-13, -107, 3)}
        <circle cx="-24" cy="-101" r="3" fill="#f5b48c"/>
        <circle cx="-9" cy="-97" r="4.5" fill="#ffa8a8" opacity=".6"/>
        ${mouth(pose, -15, -92, 4)}
        ${arms(pose, -6, -78, 42, '#ffd43b', SKIN)}`;
    },
    // いぬ（よつあし。くち で まご の ふく を くわえる）
    inu(pose) {
      const tail = pose === 'cheer'
        ? '<path d="M36 -50 Q56 -66 50 -86" stroke="#d9963f" stroke-width="9" fill="none" stroke-linecap="round"/>'
        : '<path d="M36 -48 Q50 -54 50 -64" stroke="#d9963f" stroke-width="9" fill="none" stroke-linecap="round"/>';
      return `
        ${tail}
        <rect x="-22" y="-30" width="10" height="30" rx="5" fill="#d9963f"/>
        <rect x="22" y="-30" width="10" height="30" rx="5" fill="#d9963f"/>
        <ellipse cx="6" cy="-40" rx="36" ry="20" fill="#f0b46c"/>
        <rect x="-14" y="-28" width="10" height="28" rx="5" fill="#f0b46c"/>
        <rect x="28" y="-28" width="10" height="28" rx="5" fill="#f0b46c"/>
        <ellipse cx="10" cy="-34" rx="16" ry="10" fill="#fff4e6"/>
        <circle cx="-30" cy="-58" r="19" fill="#f0b46c"/>
        <path d="M-24 -76 Q-6 -78 -12 -50 Q-20 -56 -24 -76 Z" fill="#a8672a"/>
        <ellipse cx="-46" cy="-52" rx="12" ry="9" fill="#fff4e6"/>
        <circle cx="-56" cy="-56" r="4.5" fill="${INK}"/>
        ${eye(-36, -64, 3)}
        ${pose === 'reach' ? '<path d="M-56 -46 L-44 -46" stroke="#3b2f3a" stroke-width="3" stroke-linecap="round"/>' : '<path d="M-52 -46 Q-46 -36 -40 -45" fill="#ff8787" stroke="#3b2f3a" stroke-width="2"/>'}`;
    },
    // ねこ（まえあし で いぬ の しっぽ を つかむ）
    neko(pose) {
      const paw = pose === 'reach'
        ? `<path d="M-12 -34 Q-22 -48 -28 -52" stroke="#ff922b" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="-30" cy="-53" r="5" fill="#ffd8a8"/>`
        : pose === 'cheer'
          ? `<path d="M-12 -34 Q-20 -54 -16 -66" stroke="#ff922b" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="-16" cy="-68" r="5" fill="#ffd8a8"/>`
          : `<rect x="-16" y="-24" width="8" height="24" rx="4" fill="#ff922b"/>`;
      return `
        <path d="M24 -30 Q44 -32 40 -14 Q38 -6 32 -10" stroke="#ff922b" stroke-width="7" fill="none" stroke-linecap="round"/>
        <rect x="16" y="-22" width="8" height="22" rx="4" fill="#f76707"/>
        <ellipse cx="6" cy="-28" rx="24" ry="15" fill="#ffa94d"/>
        <path d="M2 -42 L6 -16 M12 -42 L14 -18" stroke="#f76707" stroke-width="4" stroke-linecap="round"/>
        <rect x="-4" y="-22" width="8" height="22" rx="4" fill="#ffa94d"/>
        <circle cx="-18" cy="-44" r="15" fill="#ffa94d"/>
        <path d="M-30 -52 L-30 -70 L-18 -58 Z M-10 -56 L-4 -72 L-2 -52 Z" fill="#ffa94d"/>
        <path d="M-28 -56 L-28 -64 L-22 -58 Z" fill="#ffc9c9"/>
        ${eye(-25, -46, 2.6)}
        <circle cx="-31" cy="-40" r="2" fill="#e64980"/>
        <path d="M-38 -40 L-28 -38 M-38 -35 L-28 -36" stroke="${INK}" stroke-width="1.2"/>
        ${paw}`;
    },
    // ねずみ（ちいさい！ ねこ の しっぽ を つかむ）
    nezumi(pose) {
      const paw = pose === 'cheer'
        ? '<path d="M-6 -14 L-8 -30" stroke="#adb5bd" stroke-width="4" stroke-linecap="round"/>'
        : '<path d="M-6 -12 L-14 -20" stroke="#adb5bd" stroke-width="4" stroke-linecap="round"/>';
      return `
        <path d="M14 -6 Q30 -2 28 -16 Q26 -24 34 -26" stroke="#e599a8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="3" cy="-9" rx="14" ry="9" fill="#ced4da"/>
        <circle cx="-10" cy="-14" r="8" fill="#ced4da"/>
        <circle cx="-6" cy="-23" r="6" fill="#ced4da"/><circle cx="-6" cy="-23" r="3.4" fill="#ffc9c9"/>
        <circle cx="-17" cy="-13" r="2" fill="#e64980"/>
        <circle cx="-12" cy="-16" r="1.6" fill="${INK}"/>
        ${paw}`;
    },
  };

  /* なかま ひとり。st = { x, lean, pose, flip } */
  function who(id, st) {
    const flip = st.flip ? ' scale(-1,1)' : '';
    return `<g id="c-${id}" class="who" data-who="${id}" transform="translate(${st.x},${GROUND})${flip}">
      <g class="lean" transform="rotate(${st.lean || 0})">${WHO[id](st.pose || 'reach')}</g></g>`;
  }

  /* ============================ かぶ ============================ */

  // あしもと（じめん の たかさ）が (0,0)。たま の うえ は -87、ねっこ の さき は +165
  function kabuBody() {
    return `
      <path d="M0 96 Q-6 130 2 168" stroke="#e9ecef" stroke-width="8" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="8" rx="108" ry="95" fill="url(#${P}kabuG)"/>
      <ellipse cx="-38" cy="-30" rx="26" ry="40" fill="#fff" opacity=".55" transform="rotate(24 -38 -30)"/>
      <path d="M-60 40 Q-40 52 -20 46 M30 60 Q48 52 62 40" stroke="#dee2e6" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="kabu-face">
        ${eye(-28, 6, 4)}${eye(22, 6, 4)}
        <circle cx="-44" cy="22" r="8" fill="#ffa8a8" opacity=".5"/><circle cx="38" cy="22" r="8" fill="#ffa8a8" opacity=".5"/>
        <path d="M-10 24 Q-3 32 4 24" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  function kabuLeaves() {
    const leaf = (d, c) => `<path d="${d}" fill="${c}" stroke="#2b8a3e" stroke-width="2.5"/>`;
    return `
      <path d="M-6 -82 Q-30 -150 -70 -210" stroke="#2f9e44" stroke-width="9" fill="none" stroke-linecap="round"/>
      ${leaf('M-50 -170 Q-120 -200 -110 -260 Q-60 -250 -40 -190 Z', '#51cf66')}
      <path d="M0 -84 Q-6 -170 -10 -240" stroke="#2f9e44" stroke-width="9" fill="none" stroke-linecap="round"/>
      ${leaf('M-8 -200 Q-50 -250 -14 -300 Q30 -260 -2 -205 Z', '#69db7c')}
      <path d="M8 -82 Q50 -120 74 -104" stroke="#2f9e44" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M8 -84 Q40 -150 80 -200" stroke="#2f9e44" stroke-width="9" fill="none" stroke-linecap="round"/>
      ${leaf('M60 -170 Q70 -250 130 -250 Q130 -190 72 -176 Z', '#51cf66')}
      ${leaf('M66 -112 Q120 -140 150 -110 Q110 -86 74 -104 Z', '#40c057')}`;
  }

  function kabu(st) {
    return `<g id="kabu" transform="translate(150 ${GROUND - (st.lift || 0)}) rotate(${st.rot || 0}) scale(${st.scale})">
      <g class="kabu-leaves">${kabuLeaves()}</g>${kabuBody()}</g>`;
  }

  /* ============================ けしき ============================ */

  function defs() {
    return `<defs>
      <linearGradient id="${P}skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset="1" stop-color="#eefaff"/></linearGradient>
      <linearGradient id="${P}fieldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b2e36b"/><stop offset="1" stop-color="#82c341"/></linearGradient>
      <linearGradient id="${P}soilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c6644"/><stop offset="1" stop-color="#6f4430"/></linearGradient>
      <radialGradient id="${P}kabuG" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f3f0ff"/><stop offset="1" stop-color="#d0bfff"/></radialGradient>
      <radialGradient id="${P}sunGlow"><stop offset="0" stop-color="#fff9db" stop-opacity=".9"/><stop offset="1" stop-color="#fff9db" stop-opacity="0"/></radialGradient>
    </defs>`;
  }

  function cloud(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".92">
      <ellipse cx="0" cy="0" rx="44" ry="20"/><ellipse cx="-26" cy="4" rx="28" ry="16"/><ellipse cx="22" cy="-10" rx="30" ry="22"/></g>`;
  }

  function house() {
    return `<g transform="translate(660 248)">
      <rect x="0" y="30" width="110" height="68" fill="#e8c39e" stroke="#a9744f" stroke-width="3"/>
      <path d="M-14 34 L55 -16 L124 34 Z" fill="#c0504d" stroke="#8c2f2c" stroke-width="3" stroke-linejoin="round"/>
      <rect x="18" y="46" width="26" height="22" fill="#a5d8ff" stroke="#a9744f" stroke-width="3"/>
      <rect x="66" y="52" width="26" height="46" fill="#a9744f"/>
      <rect x="84" y="-6" width="14" height="24" fill="#8c2f2c"/></g>`;
  }

  function back() {
    let rows = '';
    for (let i = 0; i < 7; i += 1) {
      const x = 260 + i * 56;
      rows += `<path d="M${x} 340 q8 -16 16 0 M${x + 10} 342 q6 -12 12 0" stroke="#5c940d" stroke-width="3" fill="none"/>`;
    }
    return `<rect width="800" height="500" fill="url(#${P}skyG)"/>
      <circle cx="96" cy="78" r="70" fill="url(#${P}sunGlow)"/><circle cx="96" cy="78" r="32" fill="#ffe066"/>
      ${cloud(330, 70, 1)}${cloud(590, 110, 0.8)}
      <path d="M0 300 Q140 250 300 290 Q460 240 620 285 Q720 260 800 280 L800 340 L0 340 Z" fill="#a9d86a"/>
      ${house()}
      <rect y="320" width="800" height="110" fill="url(#${P}fieldG)"/>
      <path d="M0 330 H800" stroke="#94c95a" stroke-width="3"/>
      ${rows}
      <g stroke="#b08158" stroke-width="5" stroke-linecap="round">
        <path d="M560 360 V330 M610 360 V330 M660 360 V330 M710 360 V330 M760 360 V330"/>
        <path d="M548 338 H780 M548 352 H780" stroke-width="4"/></g>`;
  }

  function soil() {
    let dots = '';
    const pts = [[40, 450], [120, 470], [210, 446], [290, 480], [370, 455], [450, 476], [540, 448], [620, 470], [700, 452], [760, 482]];
    pts.forEach(([x, y]) => { dots += `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.5" fill="#5e3a28" opacity=".6"/>`; });
    return `<path d="M0 ${GROUND} Q200 ${GROUND - 6} 400 ${GROUND} T800 ${GROUND} V500 H0 Z" fill="url(#${P}soilG)"/>${dots}`;
  }

  // たね を まく つち の やま と じょうろ
  function mound() {
    return `<g id="mound"><ellipse cx="150" cy="${GROUND + 2}" rx="70" ry="16" fill="#7f5539"/>
      <ellipse cx="150" cy="${GROUND - 4}" rx="9" ry="6" fill="#a47148" class="seed"/></g>`;
  }
  function jouro() {
    return `<g id="jouro" transform="translate(212 300)">
      <g class="jouro-tilt">
        <path d="M-6 0 L-58 -24" stroke="#1c7ed6" stroke-width="9" stroke-linecap="round"/>
        <ellipse cx="-62" cy="-26" rx="9" ry="12" fill="#339af0" transform="rotate(-30 -62 -26)"/>
        <rect x="-8" y="-22" width="52" height="44" rx="10" fill="#339af0"/>
        <path d="M30 -18 Q56 -26 46 10" stroke="#1c7ed6" stroke-width="7" fill="none"/>
        <ellipse cx="18" cy="-22" rx="24" ry="5" fill="#1c7ed6"/></g></g>`;
  }

  // ふきだし（app.js が fx の そう に いれる）
  function bubble(x, y, text, opt) {
    const o = opt || {};
    const w = Math.max(70, text.length * (o.big ? 30 : 24) + 28);
    const h = o.big ? 56 : 46;
    const fs = o.big ? 30 : 23;
    const fill = o.fill || '#fff';
    return `<g class="bubble ${o.cls || ''}" transform="translate(${x} ${y})">
      <path d="M${-w / 2} ${-h} h${w} a12 12 0 0 1 12 12 v${h - 24} a12 12 0 0 1 -12 12 h${-w / 2 + 16} l-14 16 l-2 -16 h${-w / 2 + 2} a12 12 0 0 1 -12 -12 v${-(h - 24)} a12 12 0 0 1 12 -12 Z"
        transform="translate(-6 -12)" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <text x="0" y="${-h / 2 - 12 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${INK}">${text}</text></g>`;
  }

  // おなべ（さいご の ページ）。かぶ の は が のぞく
  function pot() {
    return `<g id="pot" transform="translate(400 ${GROUND})">
      <g class="steam" opacity="0">
        <path d="M-40 -150 q-16 -24 0 -44 q16 -20 0 -44" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M0 -160 q-16 -24 0 -44 q16 -20 0 -44" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M40 -150 q-16 -24 0 -44 q16 -20 0 -44" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".85"/></g>
      <path d="M-30 -10 L-14 -36 L0 -12 L14 -40 L30 -10 Z" fill="#ff922b"/>
      <path d="M-16 -10 L-6 -26 L4 -10 Z" fill="#ffe066"/>
      <path d="M-46 -4 H46" stroke="#5c3b25" stroke-width="10" stroke-linecap="round"/>
      <g transform="translate(0 -40)">
        <path d="M-30 -84 Q-60 -150 -30 -170 Q-10 -130 -14 -84 Z" fill="#51cf66" stroke="#2b8a3e" stroke-width="2.5"/>
        <path d="M16 -84 Q40 -160 80 -150 Q60 -110 26 -84 Z" fill="#40c057" stroke="#2b8a3e" stroke-width="2.5"/>
        <ellipse cx="0" cy="-84" rx="70" ry="14" fill="#f3f0ff"/>
        <path d="M-90 -84 H90 L78 -10 Q0 14 -78 -10 Z" fill="#495057"/>
        <ellipse cx="0" cy="-84" rx="90" ry="16" fill="#343a40"/>
        <ellipse cx="0" cy="-82" rx="76" ry="11" fill="#fff3bf"/>
        <circle cx="-30" cy="-82" r="12" fill="#fff"/><circle cx="20" cy="-80" r="14" fill="#f8f9fa"/>
        <path d="M-90 -66 h-20 M90 -66 h20" stroke="#343a40" stroke-width="10" stroke-linecap="round"/>
        <g class="pot-face">${eye(-24, -40, 4)}${eye(24, -40, 4)}
          <path d="M-8 -26 Q0 -16 8 -26" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g></g></g>`;
  }

  /*
   * え ぜんたい。s = {
   *   kabu: {scale, lift, rot} | null, mound, jouro, pot,
   *   chars: { id: {x, lean, pose, flip} }  … かいた じゅんに まえ に でる
   * }
   */
  function scene(s) {
    seq += 1;
    P = `g${seq}-`;
    let chars = '';
    // まえ に いる なかま ほど あと（うえ）に かく ＝ みぎ から じゅんに
    Object.keys(s.chars || {}).sort((a, b) => s.chars[b].x - s.chars[a].x).forEach((id) => {
      chars += who(id, s.chars[id]);
    });
    return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" font-family="inherit">
      ${defs()}${back()}
      ${s.kabu ? kabu(s.kabu) : ''}
      ${soil()}
      ${s.mound ? mound() : ''}
      ${s.pot ? pot() : ''}
      <g id="chars">${chars}</g>
      ${s.jouro ? jouro() : ''}
      <g id="fx"></g>
    </svg>`;
  }

  return { GROUND, WHO, who, scene, bubble, kabuLeaves };
})();
