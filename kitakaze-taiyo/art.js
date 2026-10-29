'use strict';

/*
 * え の ぶひん。ぜんぶ SVG の もじれつ を かえす（がぞうファイル なし。この アプリ の ため の オリジナル）。
 * え の おおきさ は 800 × 500（viewBox）。なだらか な おか の 一本道、木 と はたけ。
 *
 *   <g id="kaze" transform="translate(x y) scale(s)">  … きたかぜ（ほっぺ を ふくらませた くも）。まんなか が (0,0)、みぎ を むく
 *   <g id="sun"  transform="translate(x y) scale(s)">  … たいよう。まんなか が (0,0)
 *   <g id="trav" transform="translate(x y)">           … たびびと。あしもと が (0,0)
 *   <g id="tree" transform="rotate(a 710 452)">        … 木（かぜ で ゆれる）
 * うごき（いち・ゆれ・ひかり）は app.js が まいフレーム transform を かきかえる。
 */
const Art = (() => {
  const SKIN = '#ffd9b3';
  const INK = '#3b2f3a';
  const COAT = '#c8553d';
  const COAT_D = '#9c3d2a';
  const SHIRT = '#74c0fc';

  // いち（え の ざひょう）。app.js と たしかめ（tools/kitakaze-taiyo/check.js）が つかう
  const POS = {
    kaze: { x: 165, y: 135, r: 80 },
    sun: { x: 520, y: 108, r: 52 },
    trav: { x: 420, y: 448 },
    rest: { x: 660, y: 452 },
    branch: { x: 590, y: 278 },
    tree: { x: 710, y: 452 },
    clouds: [{ x: 470, y: 96, s: 1 }, { x: 578, y: 100, s: 0.9 }, { x: 522, y: 150, s: 1.1 }],
    laundry: [{ x: 200, kind: 'shirt' }, { x: 242, kind: 'sock' }, { x: 276, kind: 'towel' }],
    kakashi: { x: 95, y: 472 },
    // たびびと の あしもと から みた ボタン の いち
    buttons: [{ x: 2, y: -108 }, { x: 2, y: -90 }, { x: 2, y: -72 }],
  };

  // グラデーション の id。ひょうし と ほん と おしまい の え が おなじ ページ に あるので、え ごとに かえる
  let P = '';
  let seq = 0;

  function eye(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r || 3.4}" fill="${INK}"/>
      <circle cx="${x - 1}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`;
  }
  const arc = (x, y, w, up) => `<path d="M${x - w} ${y} Q${x} ${y + (up ? -w : w)} ${x + w} ${y}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  /* ============================ たびびと ============================ */

  function travFace(face) {
    const cheeks = (c, o) => `<circle cx="-15" cy="-142" r="6" fill="${c}" opacity="${o}"/><circle cx="15" cy="-142" r="6" fill="${c}" opacity="${o}"/>`;
    if (face === 'cold') {
      return `${eye(-9, -153)}${eye(9, -153)}
        <path d="M-15 -164 L-5 -160 M15 -164 L5 -160" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
        ${cheeks('#a5d8ff', 0.9)}<circle cx="0" cy="-146" r="3.4" fill="#ff8787"/>
        <path d="M-8 -136 l4 -3 l4 3 l4 -3 l4 3" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
    }
    if (face === 'grip') {
      return `<path d="M-14 -157 L-6 -153 L-14 -149 M14 -157 L6 -153 L14 -149" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        ${cheeks('#a5d8ff', 0.9)}<circle cx="0" cy="-146" r="3.4" fill="#ff8787"/>
        <rect x="-8" y="-141" width="16" height="7" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/>
        <path d="M-3 -141 v7 M3 -141 v7" stroke="${INK}" stroke-width="1.2"/>`;
    }
    if (face === 'hot') {
      return `${arc(-9, -152, 4, false)}${arc(9, -152, 4, false)}
        ${cheeks('#ff8787', 0.75)}
        <ellipse cx="0" cy="-137" rx="6" ry="5" fill="#e8590c"/>`;
    }
    if (face === 'relief' || face === 'yawn') {
      return `${arc(-9, -151, 4.5, true)}${arc(9, -151, 4.5, true)}
        ${cheeks('#ffa8a8', 0.6)}
        ${face === 'yawn' ? '<ellipse cx="0" cy="-136" rx="7" ry="9" fill="#c92a2a"/>' : `<path d="M-7 -139 Q0 -131 7 -139" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`}`;
    }
    return `${eye(-9, -153)}${eye(9, -153)}${cheeks('#ffa8a8', 0.55)}
      <path d="M-7 -139 Q0 -131 7 -139" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }

  function travArms(pose, sleeve) {
    const arm = (d, hx, hy) => `<path d="${d}" stroke="${sleeve}" stroke-width="13" fill="none" stroke-linecap="round"/>
      <circle cx="${hx}" cy="${hy}" r="7.5" fill="${SKIN}"/>`;
    const L = arm('M-26 -116 Q-38 -92 -36 -66', -36, -62);
    const R = arm('M26 -116 Q38 -92 36 -66', 36, -62);
    if (pose === 'hug') {
      return arm('M-26 -116 Q-46 -88 -4 -86', -2, -86) + arm('M26 -116 Q46 -76 6 -74', 4, -74);
    }
    if (pose === 'wave') return L + arm('M26 -116 Q50 -130 48 -158', 48, -164);
    if (pose === 'wipe') return L + arm('M26 -116 Q52 -140 20 -166', 18, -168);
    if (pose === 'stretch') return arm('M-26 -116 Q-42 -150 -32 -190', -32, -196) + arm('M26 -116 Q42 -150 32 -190', 32, -196);
    return L + R;
  }

  function hat() {
    return `<ellipse cx="0" cy="0" rx="36" ry="8" fill="#6f4e37"/>
      <path d="M-22 0 Q-22 -28 0 -28 Q22 -28 22 0 Z" fill="#7f5a3c"/>
      <rect x="-22" y="-8" width="44" height="7" fill="#e8590c"/>`;
  }

  function coatShape(nb) {
    let h = `<path d="M-29 -122 Q0 -130 29 -122 L38 -34 Q0 -26 -38 -34 Z" fill="${COAT}" stroke="${COAT_D}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M2 -126 L2 -30" stroke="${COAT_D}" stroke-width="3"/>
      <path d="M-28 -58 h14 M14 -58 h14" stroke="${COAT_D}" stroke-width="3" stroke-linecap="round"/>`;
    POS.buttons.forEach((b, i) => {
      if (i < nb) {
        h += `<circle class="btn" cx="${b.x}" cy="${b.y}" r="4.8" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>`;
      } else {
        h += `<path d="M2 ${b.y - 8} L-5 ${b.y} L2 ${b.y + 8} L9 ${b.y} Z" fill="${SHIRT}"/>
          <circle class="btn open" cx="-11" cy="${b.y}" r="4.8" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>`;
      }
    });
    return h;
  }

  /*
   * たびびと。st = { face, arms, coat: 'closed'|'open'|'off', buttons（とめた かず 0〜3）, hat, sweat, sit }
   * face: smile / cold / grip / hot / relief / yawn
   * arms: side / hug / wave / wipe / stretch
   */
  function travInner(st) {
    const coat = st.coat || 'closed';
    const sit = !!st.sit;
    const nb = st.buttons == null ? 3 : st.buttons;
    const sleeve = coat === 'off' ? SHIRT : COAT;
    let legs;
    if (sit) {
      legs = `<rect x="-26" y="-24" width="22" height="20" rx="9" fill="#5c5f66"/><rect x="4" y="-24" width="22" height="20" rx="9" fill="#4a4d55"/>
        <ellipse cx="-22" cy="-4" rx="13" ry="7" fill="#5c3b25"/><ellipse cx="22" cy="-4" rx="13" ry="7" fill="#5c3b25"/>`;
    } else {
      legs = `<rect x="-16" y="-62" width="14" height="58" rx="6" fill="#5c5f66"/><rect x="2" y="-62" width="14" height="58" rx="6" fill="#4a4d55"/>
        <ellipse cx="-12" cy="-4" rx="13" ry="6" fill="#5c3b25"/><ellipse cx="12" cy="-4" rx="13" ry="6" fill="#5c3b25"/>`;
    }
    let u = `<rect x="-25" y="-126" width="50" height="72" rx="16" fill="${SHIRT}"/>
      <path d="M-18 -110 H18 M-20 -94 H20 M-20 -78 H20" stroke="#a5d8ff" stroke-width="4"/>
      <path d="M-25 -62 H25" stroke="#5c3b25" stroke-width="7"/>`;
    if (coat === 'closed') {
      u += `<g class="coat">${coatShape(nb)}</g>`;
    } else if (coat === 'open') {
      u += `<g class="coat">
        <path d="M-29 -122 Q-14 -128 -5 -126 L-15 -32 Q-30 -30 -44 -36 Z" fill="${COAT}" stroke="${COAT_D}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M29 -122 Q14 -128 5 -126 L15 -32 Q30 -30 44 -36 Z" fill="${COAT}" stroke="${COAT_D}" stroke-width="3" stroke-linejoin="round"/>
        ${POS.buttons.map((b) => `<circle cx="-13" cy="${b.y}" r="4.8" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>`).join('')}</g>`;
    }
    u += `<rect x="-7" y="-136" width="14" height="14" fill="${SKIN}"/>`;
    if (coat !== 'off') u += `<path d="M-16 -128 L-2 -112 L-6 -132 Z M16 -128 L2 -112 L6 -132 Z" fill="${COAT_D}"/>`;
    u += `<circle cx="-24" cy="-150" r="6" fill="#f7c59f"/><circle cx="24" cy="-150" r="6" fill="#f7c59f"/>
      <circle cx="0" cy="-152" r="25" fill="${SKIN}"/>`;
    if (st.hat !== false) {
      u += '<path d="M-25 -156 Q-27 -170 -18 -172 L18 -172 Q27 -170 25 -156 Q20 -166 0 -166 Q-20 -166 -25 -156 Z" fill="#6b4226"/>';
    } else {
      u += '<path d="M-25 -150 Q-28 -180 0 -180 Q28 -180 25 -150 Q22 -168 8 -170 Q10 -162 0 -165 Q-12 -170 -25 -150 Z" fill="#6b4226"/>';
    }
    u += travFace(st.face || 'smile');
    if (st.hat !== false) u += `<g class="hat" transform="translate(0 -170)">${hat()}</g>`;
    if (st.sweat) {
      u += `<g class="sweat-drops">
        <path d="M24 -174 q6 9 0 14 q-6 -5 0 -14 Z" fill="#a5d8ff" stroke="#339af0" stroke-width="1.5"/>
        <path d="M-27 -166 q5 8 0 12 q-5 -4 0 -12 Z" fill="#a5d8ff" stroke="#339af0" stroke-width="1.5"/></g>`;
    }
    u += travArms(st.arms || 'side', sleeve);
    let h = `<ellipse cx="0" cy="2" rx="${sit ? 52 : 38}" ry="7" fill="#000" opacity=".13"/>`;
    h += sit ? `<g transform="translate(0 46)">${u}</g>${legs}` : `${legs}${u}`;
    // とった ぼうし は あしもと に
    if (st.hat === false) h += `<g transform="translate(${sit ? 50 : 46} -6) rotate(-8)">${hat()}</g>`;
    return h;
  }

  function trav(st) {
    return `<g id="trav" transform="translate(${st.x} ${st.y == null ? POS.trav.y : st.y})"><g class="shiver">${travInner(st)}</g></g>`;
  }

  /* ============================ きたかぜ ============================ */

  const PUFFS = [[-62, 12, 38], [-28, -22, 46], [22, -26, 44], [58, 6, 38], [-8, 24, 46], [34, 26, 36]];

  function kazeFace(mood) {
    if (mood === 'puff') {
      return `<circle cx="2" cy="14" r="17" fill="#ffc9c9"/><circle cx="54" cy="12" r="17" fill="#ffc9c9"/>
        ${eye(6, -8, 4)}${eye(38, -10, 4)}
        <path d="M-4 -24 Q6 -28 16 -23 M30 -24 Q40 -29 50 -25" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="76" cy="8" rx="9" ry="11" fill="#4dabf7" stroke="#1c7ed6" stroke-width="3.4"/>`;
    }
    if (mood === 'tired') {
      return `<path d="M-2 -6 L13 -4 M30 -8 L45 -6" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="0" cy="12" r="9" fill="#ffc9c9" opacity=".6"/><circle cx="52" cy="10" r="9" fill="#ffc9c9" opacity=".6"/>
        <path d="M40 22 q5 -5 10 0 q5 5 10 0 q5 -5 10 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M-40 -42 q7 11 0 17 q-7 -6 0 -17 Z" fill="#a5d8ff" stroke="#339af0" stroke-width="2"/>`;
    }
    const proud = mood === 'proud';
    return `${proud ? `${eye(6, -8, 4)}${eye(38, -10, 4)}<path d="M-4 -24 Q6 -30 16 -24 M28 -26 Q38 -32 48 -26" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `${arc(6, -6, 6, true)}${arc(38, -8, 6, true)}`}
      <circle cx="0" cy="12" r="10" fill="#ffc9c9" opacity=".8"/><circle cx="54" cy="10" r="10" fill="#ffc9c9" opacity=".8"/>
      <path d="M28 14 Q44 ${proud ? 30 : 28} 62 12" stroke="${INK}" stroke-width="3.2" fill="${proud ? '#fff' : 'none'}" stroke-linecap="round"/>`;
  }

  function kazeInner(mood) {
    const out = PUFFS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="#74c0fc"/>`).join('');
    const fill = PUFFS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#eef7ff"/>`).join('');
    return `${out}${fill}<ellipse cx="-30" cy="-34" rx="18" ry="9" fill="#fff" opacity=".9"/>
      <g class="kaze-face">${kazeFace(mood)}</g>`;
  }

  function kaze(st) {
    return `<g id="kaze" transform="translate(${st.x} ${st.y}) scale(${st.s || 1})"><g class="kaze-in">${kazeInner(st.mood)}</g></g>`;
  }

  /* ============================ たいよう ============================ */

  function sunFace(mood) {
    const cheeks = '<circle cx="-30" cy="10" r="9" fill="#ff8787" opacity=".5"/><circle cx="30" cy="10" r="9" fill="#ff8787" opacity=".5"/>';
    if (mood === 'watch') {
      return `${eye(-17, -6, 4.4)}${eye(17, -6, 4.4)}${cheeks}
        <path d="M-10 14 Q0 22 10 14" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    }
    if (mood === 'shine') {
      return `${arc(-18, -4, 8, true)}${arc(18, -4, 8, true)}${cheeks}
        <path d="M-16 10 Q0 34 16 10 Z" fill="#e8590c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    }
    return `${arc(-18, -4, 8, true)}${arc(18, -4, 8, true)}${cheeks}
      <path d="M-14 12 Q0 26 14 12" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  }

  function sunInner(mood) {
    let rays = '';
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const p = (r, d) => `${(Math.cos(a + d) * r).toFixed(1)} ${(Math.sin(a + d) * r).toFixed(1)}`;
      rays += `<path d="M${p(58, -0.16)} L${p(i % 2 ? 80 : 90, 0)} L${p(58, 0.16)} Z" fill="#ffa94d" stroke="#ff922b" stroke-width="3" stroke-linejoin="round"/>`;
    }
    return `<circle class="glow" r="100" fill="url(#${P}sunGlow)"/>
      <g class="rays">${rays}</g>
      <circle r="52" fill="url(#${P}sunG)" stroke="#f59f00" stroke-width="4"/>
      <g class="sun-face">${sunFace(mood)}</g>`;
  }

  function sun(st) {
    return `<g id="sun" transform="translate(${st.x} ${st.y}) scale(${st.s || 1})"><g class="sun-in">${sunInner(st.mood)}</g></g>`;
  }

  /* ============================ くも ============================ */

  // たいよう を かくす はいいろ の くも
  function bigCloud(c, i) {
    const p = [[-44, 6, 30], [-12, -14, 38], [26, -6, 34], [50, 12, 26], [4, 16, 34]];
    return `<g id="cloud-${i}" class="cloud" transform="translate(${c.x} ${c.y}) scale(${c.s})">
      ${p.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="#adb5bd"/>`).join('')}
      ${p.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9ecef"/>`).join('')}
      <ellipse cx="-14" cy="-24" rx="16" ry="7" fill="#fff" opacity=".8"/></g>`;
  }

  // ながれる しろい くも（かざり）
  function smallCloud(x, y, s, cls) {
    return `<g class="${cls || ''}"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".92">
      <ellipse cx="0" cy="0" rx="44" ry="18"/><ellipse cx="-24" cy="4" rx="26" ry="14"/><ellipse cx="22" cy="-9" rx="28" ry="20"/></g></g>`;
  }

  /* ============================ けしき ============================ */

  // そら の いろ。あたたかく なる ほど あおぞら → ぽかぽか の だいだい いろ
  const mix = (c0, c1, k) => '#' + [0, 2, 4].map((i) => {
    const v = Math.round(parseInt(c0.substr(1 + i, 2), 16) * (1 - k) + parseInt(c1.substr(1 + i, 2), 16) * k);
    return v.toString(16).padStart(2, '0');
  }).join('');
  function sky(t) {
    // あお と だいだい を そのまま まぜる と はいいろ に なる ので、クリーム いろ を とおる
    const k = Math.max(0, Math.min(1, t));
    if (k < 0.5) return [mix('#8fd0ff', '#fff2cc', k * 2), mix('#e7f7ff', '#fffaf0', k * 2)];
    return [mix('#fff2cc', '#ffcf7a', k * 2 - 1), mix('#fffaf0', '#fff0c8', k * 2 - 1)];
  }

  function defs(t) {
    return `<defs>
      <linearGradient id="${P}skyG" x1="0" y1="0" x2="0" y2="1"><stop class="sky0" offset="0" stop-color="${sky(t)[0]}"/><stop class="sky1" offset="1" stop-color="${sky(t)[1]}"/></linearGradient>
      <linearGradient id="${P}fieldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9db7c"/><stop offset="1" stop-color="#7cbf4e"/></linearGradient>
      <linearGradient id="${P}pathG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2bd"/><stop offset="1" stop-color="#e2c48f"/></linearGradient>
      <radialGradient id="${P}sunG" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff9db"/><stop offset=".55" stop-color="#ffe066"/><stop offset="1" stop-color="#fcc419"/></radialGradient>
      <radialGradient id="${P}sunGlow"><stop offset="0" stop-color="#fff3bf" stop-opacity=".95"/><stop offset=".6" stop-color="#ffe8cc" stop-opacity=".45"/><stop offset="1" stop-color="#ffe8cc" stop-opacity="0"/></radialGradient>
    </defs>`;
  }

  function kakashi(withHat) {
    const k = POS.kakashi;
    return `<g id="kakashi" transform="translate(${k.x} ${k.y})">
      <rect x="-4" y="-122" width="8" height="122" fill="#8d5a3b"/>
      <rect x="-46" y="-98" width="92" height="7" rx="3" fill="#8d5a3b"/>
      <path d="M-30 -102 L30 -102 L22 -48 L-22 -48 Z" fill="#748ffc" stroke="#4c6ef5" stroke-width="2"/>
      <rect x="-12" y="-84" width="12" height="12" fill="#ffa94d"/>
      <path d="M-46 -98 l-8 -6 M-46 -92 l-9 2 M46 -98 l8 -6 M46 -92 l9 2" stroke="#e9c46a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="0" cy="-122" r="18" fill="#f8e7b9" stroke="#e9c46a" stroke-width="2"/>
      <circle cx="-6" cy="-124" r="2.4" fill="${INK}"/><circle cx="6" cy="-124" r="2.4" fill="${INK}"/>
      <path d="M-6 -115 Q0 -110 6 -115" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${withHat ? `<g id="kakashiHat" transform="translate(0 -136)">${ITEM.strawHat()}</g>` : ''}</g>`;
  }

  function laundry() {
    let items = '';
    POS.laundry.forEach((l, i) => {
      items += `<g id="laundry-${i}" transform="translate(${l.x} ${i === 1 ? 280 : 278})">${ITEM[l.kind]()}</g>`;
    });
    return `<g id="laundry">
      <rect x="170" y="262" width="6" height="80" fill="#8d5a3b"/><rect x="298" y="262" width="6" height="80" fill="#8d5a3b"/>
      <path d="M173 268 Q237 282 301 268" stroke="#868e96" stroke-width="2" fill="none"/>${items}</g>`;
  }

  // コート（木 の えだ に ひっかかった ところ）
  function hangingCoat() {
    return `<path d="M0 -6 q-6 0 -6 6" stroke="#495057" stroke-width="3" fill="none"/>
      <path d="M-22 0 Q0 -6 22 0 L28 72 Q0 78 -28 72 Z" fill="${COAT}" stroke="${COAT_D}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-24 0 L-8 22 L-12 -2 Z M24 0 L8 22 L12 -2 Z" fill="${COAT_D}"/>
      <path d="M0 2 V74" stroke="${COAT_D}" stroke-width="3"/>
      <circle cx="-10" cy="18" r="4.4" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>
      <circle cx="-10" cy="36" r="4.4" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>
      <circle cx="-10" cy="54" r="4.4" fill="#ffd43b" stroke="#e67700" stroke-width="2"/>`;
  }

  function tree(coatOn) {
    const b = POS.branch;
    return `<g id="tree" transform="rotate(0 ${POS.tree.x} ${POS.tree.y})">
      <path d="M692 456 Q696 380 698 300 Q700 250 702 214 L720 214 Q720 300 724 380 Q728 440 734 456 Z" fill="#8d5a3b"/>
      <path d="M702 302 Q660 284 ${b.x - 4} ${b.y - 6}" stroke="#8d5a3b" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M${b.x + 30} ${b.y + 2} q-6 -14 4 -22" stroke="#8d5a3b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="${b.x + 26}" cy="${b.y - 22}" r="12" fill="#51cf66"/>
      <g class="leaves">
        <circle cx="712" cy="132" r="56" fill="#40c057"/><circle cx="660" cy="200" r="52" fill="#40c057"/>
        <circle cx="770" cy="196" r="54" fill="#40c057"/><circle cx="716" cy="196" r="74" fill="#51cf66"/>
        <circle cx="694" cy="150" r="30" fill="#69db7c" opacity=".8"/><circle cx="752" cy="180" r="18" fill="#69db7c" opacity=".7"/>
        <circle cx="676" cy="214" r="6" fill="#ff8787"/><circle cx="748" cy="230" r="6" fill="#ff8787"/><circle cx="726" cy="150" r="6" fill="#ff8787"/></g>
      <g id="coatTree" transform="translate(${b.x} ${b.y}) rotate(4)" style="${coatOn ? '' : 'display:none'}">${hangingCoat()}</g></g>`;
  }

  function back(s) {
    let rows = '';
    for (let y = 384; y < 500; y += 20) {
      rows += `<path d="M0 ${y} Q150 ${y - 6} ${330 - (y - 384) * 0.35} ${y}" stroke="#8a6a3e" stroke-width="7" fill="none" opacity=".45"/>`;
      for (let x = 24; x < 300 - (y - 384) * 0.4; x += 44) {
        rows += `<path d="M${x} ${y - 3} q4 -10 8 0 M${x + 8} ${y - 3} q4 -9 8 0" stroke="#2f9e44" stroke-width="3" fill="none"/>`;
      }
    }
    const drift = s.drift ? `${smallCloud(120, 60, 0.7, 'drift d1')}${smallCloud(380, 44, 0.55, 'drift d2')}${smallCloud(660, 70, 0.6, 'drift d3')}`
      : `${smallCloud(330, 46, 0.55)}${smallCloud(700, 56, 0.5)}`;
    return `<rect width="800" height="500" fill="url(#${P}skyG)"/>
      <rect id="coolTint" width="800" height="340" fill="#7d8fa6" opacity="0"/>
      ${drift}
      <path d="M0 292 Q120 244 262 276 Q420 232 560 270 Q690 242 800 262 L800 340 L0 340 Z" fill="#c0e3a2"/>
      <path d="M0 322 Q200 300 400 318 T800 312 V500 H0 Z" fill="url(#${P}fieldG)"/>
      ${rows}
      <path d="M332 500 C 380 472, 404 446, 470 404 S 574 334, 598 306 L 610 306 C 596 336, 536 388, 506 420 S 470 470, 528 500 Z" fill="url(#${P}pathG)"/>
      <path d="M470 330 l5 -10 l5 10 M760 340 l5 -10 l5 10 M540 470 l5 -10 l5 10" stroke="#2f9e44" stroke-width="3" fill="none"/>
      <ellipse cx="${POS.rest.x - 10}" cy="${POS.rest.y + 4}" rx="96" ry="14" fill="#2b8a3e" opacity=".22"/>`;
  }

  /* ============================ とぶ もの ============================ */

  const ITEM = {
    leaf: (c) => `<path d="M-12 0 Q0 -10 12 0 Q0 10 -12 0 Z" fill="${c || '#69db7c'}" stroke="#2b8a3e" stroke-width="1.5"/><path d="M-12 0 H10" stroke="#2b8a3e" stroke-width="1.2"/>`,
    shirt: () => `<path d="M-14 0 L14 0 L22 10 L14 15 L13 32 L-13 32 L-14 15 L-22 10 Z" fill="#ffa8a8" stroke="#e03131" stroke-width="2" stroke-linejoin="round"/>
      <rect x="-3" y="-5" width="6" height="9" fill="#ced4da"/>`,
    sock: () => `<path d="M-5 0 H7 V20 Q7 28 -1 28 H-10 Q-15 28 -15 23 Q-15 19 -10 19 H-5 Z" fill="#ffd43b" stroke="#f08c00" stroke-width="2" stroke-linejoin="round"/>
      <rect x="-2" y="-5" width="6" height="9" fill="#ced4da"/>`,
    towel: () => `<rect x="-12" y="0" width="24" height="34" rx="2" fill="#b2f2bb" stroke="#37b24d" stroke-width="2"/>
      <path d="M-12 26 H12 M-12 30 H12" stroke="#37b24d" stroke-width="2"/><rect x="-3" y="-5" width="6" height="9" fill="#ced4da"/>`,
    strawHat: () => `<ellipse cx="0" cy="0" rx="30" ry="7" fill="#fcc419" stroke="#e67700" stroke-width="2"/>
      <path d="M-16 0 Q-16 -20 0 -20 Q16 -20 16 0 Z" fill="#fcc419" stroke="#e67700" stroke-width="2"/>
      <rect x="-16" y="-6" width="32" height="5" fill="#e03131"/>`,
    coat: () => `<g transform="translate(0 -36)">${hangingCoat()}</g>`,
  };

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
   *   kaze: {x, y, mood, s} | null, sun: {x, y, mood, s} | null, clouds: [{x, y, s}],
   *   trav: { x, y, face, arms, coat, buttons, hat, sweat, sit } | null,
   *   laundry, kakashi: true（ぼうし あり）| 'nohat' | false, coatTree, temp, drift, hands
   * }
   */
  function scene(s) {
    seq += 1;
    P = `g${seq}-`;
    return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" font-family="inherit">
      ${defs(s.temp || 0)}${back(s)}
      ${s.kakashi ? kakashi(s.kakashi === true) : ''}
      ${s.laundry ? laundry() : ''}
      ${tree(!!s.coatTree)}
      ${s.sun ? sun(s.sun) : ''}
      ${(s.clouds || []).map(bigCloud).join('')}
      ${s.kaze ? kaze(s.kaze) : ''}
      ${s.hands ? `<text x="${s.hands.x}" y="${s.hands.y}" font-size="54" text-anchor="middle">🤝</text>` : ''}
      ${s.trav ? trav(s.trav) : ''}
      <g id="wind"></g>
      <g id="fx"></g>
    </svg>`;
  }

  return { POS, scene, bubble, sky, ITEM, kazeInner, sunInner, travInner };
})();
