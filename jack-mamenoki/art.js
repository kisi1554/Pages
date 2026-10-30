'use strict';

/*
 * え の ぶひん。ぜんぶ SVG の もじれつ を かえす（がぞうファイル なし。この アプリ の ため の オリジナル）。
 * え の おおきさ は 800 × 500（viewBox）。
 *
 *   <g id="jack"   transform="translate(x y)">   … ジャック。あしもと が (0,0)
 *   <g id="stalk">                               … まめのき（たかさ で かきなおす）
 *   <g id="world"  transform="translate(0 dy)">  … のぼる・おりる ページ の けしき（うえ へ ながれる）
 *   <g id="giant">                               … きょじん（ねむる・むにゃむにゃ・おきる）
 * うごき は app.js が まいフレーム transform を かきかえる。
 */
const Art = (() => {
  const SKIN = '#ffd9b3';
  const INK = '#3b2f3a';
  const TUNIC = '#2f9e44';
  const TUNIC_D = '#237a35';
  const STALK = '#40c057';
  const STALK_D = '#2b8a3e';

  // いち（え の ざひょう）。app.js と たしかめ（tools/jack-mamenoki/check.js）が つかう
  const POS = {
    ground: 452,
    oldman: { x: 560, y: 452 },
    holes: [{ x: 430, y: 452 }, { x: 520, y: 458 }, { x: 610, y: 452 }],
    can: { x: 700, y: 430 },
    stalk: { x: 520, y: 456 },
    sneak: { from: 120, to: 600 }, // ジャック が そーっと すすむ はば（x）
    cage: { x: 690, y: 330 },
    lock: { x: 690, y: 330 },
    giant: { x: 420, y: 250 },
    climbJack: { x: 400, y: 330 },
    gate: { x: 720, y: 452 },
    giantTop: { x: 520, y: 74 },
    ride: 1100, // のぼる ページ で けしき が ながれる ながさ
  };

  // グラデーション の id。ひょうし と ほん と おしまい の え が おなじ ページ に あるので、え ごとに かえる
  let P = '';
  let seq = 0;

  function eye(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r || 3.4}" fill="${INK}"/>
      <circle cx="${x - 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`;
  }
  const arc = (x, y, w, up) => `<path d="M${x - w} ${y} Q${x} ${y + (up ? -w : w)} ${x + w} ${y}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const mouth = (y, kind) => {
    if (kind === 'o') return `<ellipse cx="0" cy="${y}" rx="5" ry="6" fill="#c92a2a"/>`;
    if (kind === 'sad') return `<path d="M-6 ${y + 3} Q0 ${y - 3} 6 ${y + 3}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (kind === 'line') return `<path d="M-5 ${y} H5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return `<path d="M-7 ${y - 2} Q0 ${y + 6} 7 ${y - 2}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  };

  /* ============================ まめ・たまご・にわとり ============================ */

  const bean = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><ellipse rx="7" ry="5" fill="#9775fa" stroke="#6741d9" stroke-width="1.6"/><circle cx="-2" cy="-1.5" r="1.6" fill="#fff" opacity=".8"/></g>`;
  const egg = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><ellipse rx="11" ry="14" fill="#ffd43b" stroke="#f08c00" stroke-width="2.4"/><ellipse cx="-4" cy="-5" rx="3" ry="4.5" fill="#fff9db"/></g>`;

  function hen(x, y, s, mood) {
    const open = mood === 'happy';
    return `<g class="hen" transform="translate(${x} ${y}) scale(${s || 1})">
      <ellipse cx="0" cy="2" rx="26" ry="5" fill="#000" opacity=".12"/>
      <path d="M-6 -2 l-4 -10 M6 -2 l4 -10" stroke="#f08c00" stroke-width="3" stroke-linecap="round"/>
      <path d="M-30 -30 Q-38 -52 -22 -50 Q-30 -40 -20 -36 Z" fill="#a0522d"/>
      <ellipse cx="-2" cy="-24" rx="26" ry="18" fill="#d9480f"/>
      <path d="M-14 -26 Q-2 -14 12 -24" stroke="#a0522d" stroke-width="3" fill="none"/>
      <circle cx="16" cy="-42" r="13" fill="#e8590c"/>
      <path d="M10 -54 q3 -8 6 0 q3 -8 6 0 q3 -6 4 2 Z" fill="#e03131"/>
      <path d="M28 -44 l9 3 l-9 3 Z" fill="#fcc419"/>
      <path d="M24 -36 q3 6 -1 9 q-4 -3 1 -9 Z" fill="#e03131"/>
      ${open ? arc(18, -44, 3, true) : eye(18, -44, 2.6)}</g>`;
  }

  /* ============================ ジャック ============================ */

  function jackFace(face) {
    const cheeks = '<circle cx="-14" cy="-118" r="5.5" fill="#ffa8a8" opacity=".6"/><circle cx="14" cy="-118" r="5.5" fill="#ffa8a8" opacity=".6"/>';
    if (face === 'sad') return `${eye(-8, -128)}${eye(8, -128)}<path d="M-14 -138 L-4 -135 M14 -138 L4 -135" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>${cheeks}${mouth(-112, 'sad')}`;
    if (face === 'wow') return `${eye(-8, -129, 4)}${eye(8, -129, 4)}${cheeks}${mouth(-113, 'o')}`;
    if (face === 'shh') {
      return `${arc(-8, -127, 4, false)}${arc(8, -127, 4, false)}${cheeks}${mouth(-113, 'line')}
        <path d="M-3 -122 v14" stroke="${SKIN}" stroke-width="5" stroke-linecap="round"/><path d="M-3 -122 v14" stroke="#e8b38a" stroke-width="1.2"/>`;
    }
    if (face === 'happy') return `${arc(-8, -127, 4.5, true)}${arc(8, -127, 4.5, true)}${cheeks}<path d="M-8 -116 Q0 -104 8 -116 Z" fill="#c92a2a"/>`;
    return `${eye(-8, -128)}${eye(8, -128)}${cheeks}${mouth(-114)}`;
  }

  function jackArms(pose) {
    const arm = (d, hx, hy) => `<path d="${d}" stroke="${TUNIC}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <circle cx="${hx}" cy="${hy}" r="6.5" fill="${SKIN}"/>`;
    if (pose === 'climbL') return arm('M-18 -92 Q-30 -116 -24 -150', -24, -154) + arm('M18 -92 Q30 -80 22 -62', 22, -58);
    if (pose === 'climbR') return arm('M-18 -92 Q-30 -80 -22 -62', -22, -58) + arm('M18 -92 Q30 -116 24 -150', 24, -154);
    if (pose === 'tiptoe') return arm('M-18 -92 Q-34 -100 -30 -114', -30, -118) + arm('M18 -92 Q34 -100 30 -114', 30, -118);
    if (pose === 'hold') return arm('M-18 -92 Q-28 -74 -6 -70', -4, -70) + arm('M18 -92 Q28 -74 6 -70', 4, -70);
    if (pose === 'axe') {
      return arm('M-18 -92 Q-28 -74 -26 -56', -26, -52) + arm('M18 -92 Q40 -110 38 -132', 38, -136)
        + '<g class="axe" transform="translate(38 -136) rotate(-30)"><rect x="-3" y="-4" width="6" height="46" rx="3" fill="#a0522d"/><path d="M-3 -2 L-22 -12 Q-26 2 -22 14 L-3 8 Z" fill="#adb5bd" stroke="#495057" stroke-width="2"/></g>';
    }
    if (pose === 'cheer') return arm('M-18 -92 Q-34 -118 -28 -146', -28, -150) + arm('M18 -92 Q34 -118 28 -146', 28, -150);
    if (pose === 'beans') return arm('M-18 -92 Q-28 -74 -26 -56', -26, -52) + arm('M18 -92 Q34 -86 40 -100', 42, -102);
    return arm('M-18 -92 Q-28 -74 -26 -56', -26, -52) + arm('M18 -92 Q28 -74 26 -56', 26, -52);
  }

  /*
   * ジャック。st = { face, pose, hen, beans }
   * face: smile / sad / wow / shh / happy
   * pose: stand / climbL / climbR / tiptoe / hold / axe / cheer / beans
   */
  function jackInner(st) {
    const pose = st.pose || 'stand';
    const tip = pose === 'tiptoe';
    let h = '<ellipse cx="0" cy="2" rx="32" ry="6" fill="#000" opacity=".13"/>';
    if (pose === 'climbL' || pose === 'climbR') {
      const l = pose === 'climbL' ? -12 : 0;
      h += `<rect x="-14" y="${-50 + l}" width="12" height="44" rx="5" fill="#8d5a3b"/><rect x="2" y="${-50 - l - 12}" width="12" height="44" rx="5" fill="#7a4b2f"/>
        <ellipse cx="-8" cy="${-6 + l}" rx="10" ry="6" fill="#5c3b25"/><ellipse cx="8" cy="${-18 - l}" rx="10" ry="6" fill="#5c3b25"/>`;
    } else {
      const lift = tip ? -6 : 0;
      h += `<rect x="-14" y="${-50 + lift}" width="12" height="46" rx="5" fill="#8d5a3b"/><rect x="2" y="${-50 + lift}" width="12" height="46" rx="5" fill="#7a4b2f"/>
        <ellipse cx="-8" cy="${-4 + lift}" rx="${tip ? 7 : 11}" ry="6" fill="#5c3b25"/><ellipse cx="8" cy="${-4 + lift}" rx="${tip ? 7 : 11}" ry="6" fill="#5c3b25"/>`;
    }
    h += `<path d="M-22 -100 Q0 -108 22 -100 L26 -44 Q0 -38 -26 -44 Z" fill="${TUNIC}" stroke="${TUNIC_D}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-24 -54 H24" stroke="#8d5a3b" stroke-width="6"/><rect x="-5" y="-58" width="10" height="8" rx="2" fill="#fcc419"/>
      <path d="M-22 -96 L22 -60" stroke="#a0522d" stroke-width="4"/><rect x="10" y="-70" width="20" height="18" rx="4" fill="#c08552" stroke="#8d5a3b" stroke-width="2"/>
      <rect x="-6" y="-110" width="12" height="12" fill="${SKIN}"/>
      <circle cx="0" cy="-126" r="22" fill="${SKIN}"/>
      <path d="M-22 -128 Q-24 -150 0 -150 Q24 -150 22 -128 Q14 -140 0 -140 Q-12 -142 -22 -128 Z" fill="#a0522d"/>
      <path d="M-22 -138 Q0 -164 24 -140 Q8 -146 -22 -138 Z" fill="${TUNIC_D}"/><path d="M18 -146 q14 -14 22 -8 q-10 2 -18 12 Z" fill="#e03131"/>`;
    h += jackFace(st.face || 'smile');
    h += jackArms(pose);
    if (st.beans) h += `${bean(46, -108, 0.8)}${bean(38, -112, 0.8)}${bean(42, -100, 0.8)}<circle class="beam" cx="42" cy="-106" r="16" fill="#e5dbff" opacity=".5"/>`;
    if (st.hen) h += hen(0, -54, 0.62, 'happy');
    return h;
  }

  function jack(st) {
    return `<g id="jack" transform="translate(${st.x} ${st.y == null ? POS.ground : st.y})"><g class="jack-in">${jackInner(st)}</g></g>`;
  }

  /* ============================ おかあさん・おじいさん・うし ============================ */

  function mother(st) {
    const face = st.face || 'smile';
    const f = face === 'sigh' ? `${arc(-8, -146, 4, false)}${arc(8, -146, 4, false)}${mouth(-132, 'sad')}`
      : face === 'wow' ? `${eye(-8, -147, 3.8)}${eye(8, -147, 3.8)}${mouth(-132, 'o')}`
        : `${arc(-8, -146, 4.5, true)}${arc(8, -146, 4.5, true)}${mouth(-133)}`;
    return `<g id="mother" transform="translate(${st.x} ${POS.ground})">
      <ellipse cx="0" cy="2" rx="34" ry="6" fill="#000" opacity=".13"/>
      <path d="M-26 -112 Q0 -122 26 -112 L36 -2 Q0 4 -36 -2 Z" fill="#9775fa" stroke="#7048e8" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-18 -92 Q0 -96 18 -92 L22 -8 Q0 -4 -22 -8 Z" fill="#fff" stroke="#dee2e6" stroke-width="2"/>
      <path d="M-24 -108 Q-34 -84 -20 -70 M24 -108 Q34 -84 20 -70" stroke="#9775fa" stroke-width="11" fill="none" stroke-linecap="round"/>
      <circle cx="-18" cy="-68" r="6.5" fill="${SKIN}"/><circle cx="18" cy="-68" r="6.5" fill="${SKIN}"/>
      <rect x="-6" y="-128" width="12" height="12" fill="${SKIN}"/>
      <circle cx="0" cy="-144" r="22" fill="${SKIN}"/>
      <path d="M-23 -142 Q-24 -170 0 -170 Q24 -170 23 -142 Q16 -158 0 -158 Q-16 -158 -23 -142 Z" fill="#6b4226"/>
      <circle cx="0" cy="-172" r="10" fill="#6b4226"/>
      <circle cx="-14" cy="-136" r="5" fill="#ffa8a8" opacity=".55"/><circle cx="14" cy="-136" r="5" fill="#ffa8a8" opacity=".55"/>
      ${f}</g>`;
  }

  function oldman(st) {
    return `<g id="oldman" transform="translate(${st.x} ${POS.ground})">
      <ellipse cx="0" cy="2" rx="34" ry="6" fill="#000" opacity=".13"/>
      <rect x="34" y="-150" width="7" height="152" rx="3" fill="#8d5a3b"/><circle cx="37" cy="-152" r="8" fill="#a0522d"/>
      <path d="M-30 -116 Q0 -128 30 -116 L40 -2 Q0 4 -40 -2 Z" fill="#5f3dc4" stroke="#4527a0" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-14 -40 l6 -10 l6 10 M10 -70 l5 -9 l5 9" stroke="#ffe066" stroke-width="2.4" fill="none"/>
      <circle cx="0" cy="-138" r="21" fill="${SKIN}"/>
      <path d="M-30 -126 Q-32 -176 0 -178 Q32 -176 30 -126 Q22 -158 0 -160 Q-22 -158 -30 -126 Z" fill="#7048e8"/>
      <path d="M-16 -128 Q0 -82 16 -128 Q8 -120 0 -122 Q-8 -120 -16 -128 Z" fill="#f1f3f5" stroke="#ced4da" stroke-width="1.5"/>
      ${arc(-8, -141, 4, true)}${arc(8, -141, 4, true)}
      <path d="M-26 -108 Q-44 -96 -46 -82" stroke="#5f3dc4" stroke-width="12" fill="none" stroke-linecap="round"/>
      <g class="palm"><circle cx="-48" cy="-80" r="8" fill="${SKIN}"/>
        <g class="beans">${bean(-56, -90, 0.8)}${bean(-46, -92, 0.8)}${bean(-51, -98, 0.8)}<circle cx="-51" cy="-93" r="18" fill="#e5dbff" opacity=".45"/></g></g></g>`;
  }

  function cow(st) {
    return `<g id="cow" transform="translate(${st.x} ${POS.ground})${st.flip ? ' scale(-1 1)' : ''}">
      <ellipse cx="0" cy="2" rx="62" ry="8" fill="#000" opacity=".13"/>
      <rect x="-48" y="-46" width="13" height="46" rx="5" fill="#f8f9fa" stroke="#868e96" stroke-width="2"/><rect x="-24" y="-46" width="13" height="46" rx="5" fill="#f8f9fa" stroke="#868e96" stroke-width="2"/>
      <rect x="18" y="-46" width="13" height="46" rx="5" fill="#f8f9fa" stroke="#868e96" stroke-width="2"/><rect x="38" y="-46" width="13" height="46" rx="5" fill="#f8f9fa" stroke="#868e96" stroke-width="2"/>
      <ellipse cx="0" cy="-70" rx="62" ry="36" fill="#f8f9fa" stroke="#868e96" stroke-width="2.5"/>
      <path d="M-30 -96 q16 -8 22 8 q-6 14 -24 6 Z M14 -80 q14 -8 22 6 q-8 12 -22 4 Z" fill="#495057"/>
      <ellipse cx="-4" cy="-40" rx="12" ry="7" fill="#ffc9c9"/>
      <path d="M-62 -76 q-14 14 -8 30" stroke="#868e96" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g transform="translate(62 -88)">
        <ellipse cx="0" cy="0" rx="26" ry="24" fill="#f8f9fa" stroke="#868e96" stroke-width="2.5"/>
        <path d="M-18 -18 q-6 -14 -14 -12 M14 -20 q4 -14 14 -12" stroke="#e9c46a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse cx="10" cy="12" rx="17" ry="11" fill="#ffc9c9"/><circle cx="5" cy="12" r="2.4" fill="${INK}"/><circle cx="15" cy="12" r="2.4" fill="${INK}"/>
        ${eye(-8, -4, 3.4)}${eye(10, -6, 3.4)}
        <path d="M-6 22 q6 6 0 12" stroke="#868e96" stroke-width="2" fill="none"/><circle cx="-6" cy="36" r="6" fill="#fcc419" stroke="#e67700" stroke-width="2"/></g></g>`;
  }

  /* ============================ まめのき ============================ */

  // h は 0〜1。1 で がめん の うえ を こえて くも の うえ まで
  function stalkPath(x, y, h, top) {
    const tipY = y - h * (y - (top == null ? -80 : top));
    let d = `M${x} ${y}`;
    let leaves = '';
    const n = Math.max(1, Math.round((y - tipY) / 26));
    for (let i = 1; i <= n; i += 1) {
      const yy = y - ((y - tipY) * i) / n;
      const xx = x + Math.sin(i * 0.9) * 10;
      d += ` L${xx.toFixed(1)} ${yy.toFixed(1)}`;
      if (i % 2 === 0 && i < n) {
        const s = i % 4 === 0 ? 1 : -1;
        leaves += `<path d="M${xx} ${yy} q${s * 26} -18 ${s * 42} -4 q${-s * 18} 14 ${-s * 42} 4 Z" fill="${STALK}" stroke="${STALK_D}" stroke-width="2"/>`;
      }
    }
    const tip = `<path d="M${x + Math.sin(n * 0.9) * 10} ${tipY} q10 -18 -4 -26" stroke="${STALK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return `<path d="${d}" stroke="${STALK_D}" stroke-width="${12 + h * 6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" stroke="${STALK}" stroke-width="${7 + h * 4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${leaves}${h > 0.02 ? tip : ''}`;
  }

  function stalk(h) {
    return `<g id="stalk"><g class="stalk-in">${stalkPath(POS.stalk.x, POS.stalk.y, h)}</g></g>`;
  }

  /* ============================ けしき ============================ */

  function skyStops(time) {
    if (time === 'dusk') return ['#ffa94d', '#ffe8cc'];
    if (time === 'night') return ['#1c2b5a', '#364fc7'];
    if (time === 'morning') return ['#a5d8ff', '#fff3bf'];
    if (time === 'cloud') return ['#d0ebff', '#f3f0ff'];
    return ['#8fd0ff', '#e7f7ff'];
  }

  function defs(time) {
    const s = skyStops(time);
    return `<defs>
      <linearGradient id="${P}skyG" x1="0" y1="0" x2="0" y2="1"><stop class="sky0" offset="0" stop-color="${s[0]}"/><stop class="sky1" offset="1" stop-color="${s[1]}"/></linearGradient>
      <linearGradient id="${P}fieldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9db7c"/><stop offset="1" stop-color="#7cbf4e"/></linearGradient>
      <linearGradient id="${P}stoneG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#ced4da"/></linearGradient>
    </defs>`;
  }

  function cloud(x, y, s, cls, id) {
    return `<g ${id ? `id="${id}"` : ''} class="${cls || ''}"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".95">
      <ellipse cx="0" cy="0" rx="46" ry="18"/><ellipse cx="-26" cy="4" rx="28" ry="15"/><ellipse cx="24" cy="-9" rx="30" ry="21"/></g></g>`;
  }

  function house() {
    return `<g id="house">
      <rect x="10" y="300" width="190" height="152" fill="#ffe8cc" stroke="#d9480f" stroke-width="3"/>
      <path d="M-6 306 L105 222 L216 306 Z" fill="#c2410c" stroke="#9c3d2a" stroke-width="3" stroke-linejoin="round"/>
      <rect x="150" y="236" width="22" height="44" fill="#a0522d"/>
      <rect x="84" y="372" width="44" height="80" rx="6" fill="#a0522d" stroke="#6b4226" stroke-width="3"/>
      <circle cx="120" cy="414" r="3.4" fill="#fcc419"/>
      <rect x="28" y="330" width="40" height="34" fill="#a5d8ff" stroke="#6b4226" stroke-width="3"/><path d="M48 330 V364 M28 347 H68" stroke="#6b4226" stroke-width="2"/></g>`;
  }

  function garden(s) {
    let h = '<ellipse cx="520" cy="462" rx="140" ry="22" fill="#8a6a3e"/>';
    POS.holes.forEach((p, i) => {
      const planted = s.planted && s.planted[i];
      h += `<g id="hole-${i}" transform="translate(${p.x} ${p.y})">
        <ellipse rx="22" ry="8" fill="${planted ? '#a0522d' : '#5c3b25'}"/>${planted ? '<path d="M-8 -4 q8 -8 16 0" stroke="#6b4226" stroke-width="3" fill="none"/>' : ''}</g>`;
    });
    return h;
  }

  function can(tilt) {
    return `<g id="can" transform="translate(${POS.can.x} ${POS.can.y}) rotate(${tilt || 0})">
      <path d="M-26 -30 h40 l4 34 h-48 Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-26 -22 L-62 -48 l-6 6" stroke="#1c7ed6" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M14 -24 q22 4 12 24" stroke="#1c7ed6" stroke-width="5" fill="none"/></g>`;
  }

  function signpost() {
    return `<g id="sign" transform="translate(330 452)"><rect x="-4" y="-110" width="8" height="110" fill="#8d5a3b"/>
      <path d="M-46 -110 h80 l14 14 l-14 14 h-80 Z" fill="#ffe8cc" stroke="#a0522d" stroke-width="3"/>
      <text x="-6" y="-89" text-anchor="middle" font-size="17" font-weight="800" fill="#a0522d">いちば →</text></g>`;
  }

  function gate(open) {
    const g = POS.gate;
    return `<g id="gate" transform="translate(${g.x} ${g.y})">
      <rect x="-50" y="-96" width="10" height="96" fill="#8d5a3b"/><rect x="40" y="-96" width="10" height="96" fill="#8d5a3b"/>
      <g class="door" style="transform-origin:-40px 0; transform:${open ? 'scaleX(0.15)' : 'none'}">
        <rect x="-40" y="-76" width="80" height="10" fill="#c08552"/><rect x="-40" y="-36" width="80" height="10" fill="#c08552"/>
        <path d="M-30 -84 v84 M-10 -84 v84 M10 -84 v84 M30 -84 v84" stroke="#c08552" stroke-width="8"/></g></g>`;
  }

  function ground(time) {
    const night = time === 'night';
    return `<path d="M0 300 Q160 262 330 288 Q520 250 800 280 L800 360 L0 360 Z" fill="${night ? '#5c7c5a' : '#c0e3a2'}"/>
      <path d="M0 340 Q200 318 400 336 T800 330 V500 H0 Z" fill="url(#${P}fieldG)"/>
      <path d="M300 500 C 340 470, 380 456, 440 446 L 800 446 L800 470 C 600 470, 420 480, 380 500 Z" fill="#e2c48f" opacity=".7"/>`;
  }

  // おしろ の なか（くも の うえ）
  function castleRoom() {
    let h = `<rect width="800" height="500" fill="url(#${P}stoneG)"/>`;
    for (let y = 30; y < 440; y += 44) {
      for (let x = (y / 44) % 2 ? -40 : 0; x < 800; x += 90) h += `<rect x="${x}" y="${y}" width="86" height="40" rx="4" fill="#dee2e6" stroke="#ced4da" stroke-width="2"/>`;
    }
    h += `<path d="M560 30 Q600 0 640 30 V170 H560 Z" fill="#a5d8ff" stroke="#868e96" stroke-width="5"/>
      ${cloud(600, 120, 0.5)}
      <rect x="0" y="440" width="800" height="60" fill="#c8b6a6"/>
      <path d="M0 440 H800" stroke="#a68b73" stroke-width="5"/>
      <rect x="230" y="300" width="380" height="24" rx="6" fill="#8d5a3b"/>
      <rect x="250" y="324" width="26" height="116" fill="#7a4b2f"/><rect x="566" y="324" width="26" height="116" fill="#7a4b2f"/>
      <ellipse cx="300" cy="294" rx="48" ry="12" fill="#f1f3f5" stroke="#adb5bd" stroke-width="3"/>
      <path d="M660 440 V250 M720 440 V250" stroke="#7a4b2f" stroke-width="14"/><rect x="644" y="236" width="92" height="18" rx="5" fill="#8d5a3b"/>`;
    return h;
  }

  // きょじん（テーブル に うでを のせて ねむる。こわく しない）
  function giantInner(mood) {
    const sleep = mood === 'sleep';
    const stir = mood === 'stir';
    const face = sleep ? `${arc(-36, -8, 14, false)}${arc(36, -8, 14, false)}<ellipse cx="0" cy="42" rx="14" ry="10" fill="#c92a2a"/>`
      : stir ? `${arc(-36, -8, 14, false)}<circle cx="36" cy="-8" r="9" fill="${INK}"/><circle cx="33" cy="-11" r="3" fill="#fff"/><path d="M-16 42 q16 10 32 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`
        : `<circle cx="-36" cy="-8" r="12" fill="${INK}"/><circle cx="36" cy="-8" r="12" fill="${INK}"/><circle cx="-40" cy="-12" r="4" fill="#fff"/><circle cx="32" cy="-12" r="4" fill="#fff"/><ellipse cx="0" cy="44" rx="20" ry="22" fill="#c92a2a"/>`;
    return `<path d="M-170 160 Q-160 80 -90 60 L90 60 Q160 80 170 160 Z" fill="#e8590c" stroke="#c2410c" stroke-width="5"/>
      <circle cx="0" cy="0" r="96" fill="#f4c08f" stroke="#d9984f" stroke-width="4"/>
      <ellipse cx="-96" cy="6" rx="16" ry="24" fill="#f4c08f" stroke="#d9984f" stroke-width="4"/><ellipse cx="96" cy="6" rx="16" ry="24" fill="#f4c08f" stroke="#d9984f" stroke-width="4"/>
      <path d="M-90 -20 Q-100 -110 0 -112 Q100 -110 90 -20 Q70 -70 0 -74 Q-70 -70 -90 -20 Z" fill="#6b4226"/>
      <path d="M-70 40 Q0 120 70 40 Q50 86 0 92 Q-50 86 -70 40 Z" fill="#6b4226"/>
      <path d="M-60 -96 Q-10 -160 70 -150 Q40 -120 60 -96 Z" fill="#4dabf7"/><circle cx="74" cy="-150" r="12" fill="#fff"/>
      <circle cx="-56" cy="20" r="14" fill="#ff8787" opacity=".45"/><circle cx="56" cy="20" r="14" fill="#ff8787" opacity=".45"/>
      <ellipse cx="0" cy="18" rx="14" ry="11" fill="#e8a46a"/>
      ${face}`;
  }

  function giant(mood) {
    const g = POS.giant;
    return `<g id="giant" transform="translate(${g.x} ${g.y})"><g class="giant-in">${giantInner(mood)}</g></g>
      <g transform="translate(${g.x} ${g.y})"><ellipse cx="-110" cy="58" rx="58" ry="26" fill="#f4c08f" stroke="#d9984f" stroke-width="4"/><ellipse cx="110" cy="58" rx="58" ry="26" fill="#f4c08f" stroke="#d9984f" stroke-width="4"/></g>`;
  }

  function cageInner(open, withHen) {
    const c = POS.cage;
    return `<g transform="translate(${c.x} ${c.y - 92})">
      ${withHen ? hen(0, 86, 0.8, open ? 'happy' : 'sad') : ''}
      <path d="M-46 92 V-6 Q0 -54 46 -6 V92" fill="none" stroke="#f59f00" stroke-width="4"/>
      ${[-30, -14, 2, 18, 34].map((x) => `<path d="M${x} 92 V${-6 - (34 - Math.abs(x)) * 0.9}" stroke="#f59f00" stroke-width="3"/>`).join('')}
      <rect x="-50" y="88" width="100" height="8" rx="3" fill="#e67700"/>
      <circle cx="0" cy="-44" r="7" fill="none" stroke="#e67700" stroke-width="4"/>
      ${open ? '<path d="M46 20 L84 6 V74 L46 92" fill="none" stroke="#f59f00" stroke-width="4"/>'
        : '<g id="lock"><rect x="34" y="36" width="24" height="20" rx="4" fill="#ffd43b" stroke="#e67700" stroke-width="3"/><path d="M38 36 v-8 q8 -12 16 0 v8" fill="none" stroke="#e67700" stroke-width="3"/></g>'}</g>`;
  }

  function cage(open, withHen) {
    return `<g id="cage">${cageInner(open, withHen)}</g>`;
  }

  // のぼる・おりる の けしき（world は うえ へ ながれる。dy が ふえる と うえ へ すすむ）
  function climbWorld(dir) {
    const x = POS.climbJack.x;
    const R = POS.ride;
    let h = `<rect x="0" y="-${R + 600}" width="800" height="${R + 1200}" fill="url(#${P}skyG)"/>`;
    h += `<path d="M0 360 Q200 330 400 350 T800 344 V560 H0 Z" fill="url(#${P}fieldG)"/>`;
    h += '<g transform="translate(-60 40) scale(.9)">' + house() + '</g>';
    h += `<path d="M${x} 560 V${-R - 300}" stroke="${STALK_D}" stroke-width="22" stroke-linecap="round"/><path d="M${x} 560 V${-R - 300}" stroke="${STALK}" stroke-width="14"/>`;
    for (let y = 520; y > -R - 300; y -= 46) {
      const s = Math.round(y / 46) % 2 ? 1 : -1;
      h += `<path d="M${x} ${y} q${s * 30} -22 ${s * 52} -6 q${-s * 22} 16 ${-s * 52} 6 Z" fill="${STALK}" stroke="${STALK_D}" stroke-width="2"/>`;
    }
    h += cloud(170, 120, 0.8) + cloud(640, 40, 0.7);
    h += `<g class="birds"><path d="M560 -140 q12 -10 24 0 q12 -10 24 0 M200 -250 q10 -8 20 0 q10 -8 20 0 M610 -380 q12 -10 24 0 q12 -10 24 0" stroke="${INK}" stroke-width="3" fill="none"/></g>`;
    h += cloud(150, -320, 1) + cloud(650, -460, 1.1) + cloud(260, -600, 0.9);
    // くも の じめん と おしろ（のぼりきる と、くも の じめん が ジャック の あしもと に くる）
    const F = -R + 300;
    h += `<g><rect x="530" y="${F - 210}" width="190" height="190" fill="#e9ecef" stroke="#adb5bd" stroke-width="4"/>
      <path d="M520 ${F - 210} h210 l-105 -70 Z" fill="#748ffc"/><rect x="600" y="${F - 100}" width="48" height="80" rx="20" fill="#7a4b2f"/>
      <rect x="556" y="${F - 180}" width="34" height="40" rx="10" fill="#a5d8ff" stroke="#868e96" stroke-width="3"/><rect x="660" y="${F - 180}" width="34" height="40" rx="10" fill="#a5d8ff" stroke="#868e96" stroke-width="3"/>
      ${[0, 140, 280, 420, 560, 700, 840].map((cx) => `<circle cx="${cx}" cy="${F}" r="72" fill="#fff"/>`).join('')}
      <rect x="0" y="${F}" width="800" height="200" fill="#fff"/></g>`;
    if (dir === 'down') {
      h += `<g id="peek" transform="translate(210 ${F - 40}) scale(.5)">${giantInner('awake')}</g>`;
    }
    return `<g id="world" transform="translate(0 0)">${h}</g>`;
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

  /*
   * え ぜんたい。s = {
   *   place: 'road' | 'home' | 'castle' | 'climb', time, dir,
   *   jack: {x, y, face, pose, hen, beans}, mother, oldman, cow, hen: {x}, eggs,
   *   holes, planted, can, stalk（たかさ 0〜1）, giant: 'sleep'|'stir'|'awake', cage: {open, hen}, gate, giantTop, drift
   * }
   */
  function scene(s) {
    seq += 1;
    P = `g${seq}-`;
    const time = s.place === 'castle' ? 'day' : s.place === 'climb' ? 'cloud' : s.time || 'day';
    let h = `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" font-family="inherit">${defs(time)}`;
    if (s.place === 'climb') {
      h += climbWorld(s.dir);
      h += `<g id="jack" transform="translate(${POS.climbJack.x} ${POS.climbJack.y})"><g class="jack-in">${jackInner(Object.assign({ pose: 'climbL' }, s.jack))}</g></g>`;
    } else if (s.place === 'castle') {
      h += castleRoom();
      h += giant(s.giant || 'sleep');
      h += cage(s.cage && s.cage.open, !(s.cage && s.cage.empty));
      h += '<g id="zzz"></g>';
      if (s.jack) h += jack(s.jack);
    } else {
      h += `<rect width="800" height="500" fill="url(#${P}skyG)"/>`;
      if (time === 'night') {
        h += '<circle cx="680" cy="80" r="34" fill="#fff3bf"/><circle cx="694" cy="70" r="30" fill="#1c2b5a"/>';
        h += [[90, 60], [220, 110], [380, 50], [520, 120], [760, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`).join('');
      } else {
        h += `<circle cx="${time === 'dusk' ? 690 : 700}" cy="${time === 'dusk' ? 230 : 72}" r="38" fill="${time === 'dusk' ? '#ff922b' : '#ffe066'}" opacity=".95"/>`;
        h += s.drift ? `${cloud(120, 70, 0.7, 'drift d1')}${cloud(380, 50, 0.55, 'drift d2')}${cloud(660, 90, 0.6, 'drift d3')}` : `${cloud(300, 60, 0.6)}${cloud(560, 90, 0.5)}`;
      }
      h += ground(time);
      if (s.giantTop) {
        h += `<g id="giantTop" transform="translate(${POS.giantTop.x} ${POS.giantTop.y})">${cloud(0, 20, 1.5)}<g transform="translate(0 -6) scale(.24)">${giantInner('awake')}</g></g>`;
      }
      if (s.place === 'road') h += signpost();
      if (s.place === 'home') {
        h += house();
        if (s.holes) h += garden(s);
        if (s.can) h += can(0);
        if (s.gate) h += gate(false);
        if (s.stalk != null) h += stalk(s.stalk);
      }
      if (s.oldman) h += oldman(s.oldman);
      if (s.cow) h += cow(s.cow);
      if (s.mother) h += mother(s.mother);
      if (s.hen) h += `<g id="henG" transform="translate(${s.hen.x} ${POS.ground})">${hen(0, 0, 1, 'happy')}</g>`;
      if (s.eggs) h += `<g id="eggs">${Array.from({ length: s.eggs }, (_, i) => egg(s.hen.x + 40 + i * 22, POS.ground - 14, 0.9)).join('')}</g>`;
      if (s.jack) h += jack(s.jack);
    }
    h += '<g id="parts"></g><g id="fx"></g></svg>';
    return h;
  }

  return {
    POS, scene, bubble, jackInner, giantInner, cageInner, stalkPath, cow, egg, bean, hen,
  };
})();
