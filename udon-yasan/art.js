'use strict';

/*
 * え（SVG）。ぜんぶ オリジナル。実在の お店の ロゴ・制服・のれんの もじ は つかわない。
 *  てんいんさんは オリジナルの みどりの エプロン＋オレンジの はちまき（こむぎの マーク）。
 */
const Art = (() => {
  const SKIN = ['#ffe0c7', '#f1c27d', '#c68642', '#8d5524'];
  const HAIR = ['short', 'pony', 'bob'];
  const C = {
    noodle: '#fff8e1', noodleLine: '#e9d9a6',
    hot: '#d9a050', cold: '#8a5a2b', water: '#f3ecdc', dip: '#6b4423',
    negi: '#69db7c', tenkasu: '#f6c453', shoga: '#ffb3a7',
    wood: '#d8a46a', woodDark: '#a8743f',
  };

  const face = (x, y, r, skin, mood) => {
    const m = mood || 'normal';
    let mouth = `<path d="M${x - 7} ${y + 8} Q${x} ${y + 15} ${x + 7} ${y + 8}" fill="none" stroke="#5a3b2e" stroke-width="2.5" stroke-linecap="round"/>`;
    if (m === 'happy') mouth = `<path d="M${x - 9} ${y + 6} Q${x} ${y + 19} ${x + 9} ${y + 6} Z" fill="#c2255c" stroke="#5a3b2e" stroke-width="2"/>`;
    if (m === 'hmm') mouth = `<path d="M${x - 6} ${y + 11} L${x + 6} ${y + 11}" stroke="#5a3b2e" stroke-width="2.5" stroke-linecap="round"/>`;
    if (m === 'wait') mouth = `<ellipse cx="${x}" cy="${y + 11}" rx="4" ry="3" fill="#5a3b2e"/>`;
    const eye = m === 'happy'
      ? `<path d="M${x - 13} ${y - 2} q4 -5 8 0 M${x + 5} ${y - 2} q4 -5 8 0" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`
      : `<circle cx="${x - 9}" cy="${y - 2}" r="3.2" fill="#333"/><circle cx="${x + 9}" cy="${y - 2}" r="3.2" fill="#333"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${skin}"/>${eye}`
      + `<circle cx="${x - 15}" cy="${y + 7}" r="4" fill="#ff8787" opacity=".45"/><circle cx="${x + 15}" cy="${y + 7}" r="4" fill="#ff8787" opacity=".45"/>${mouth}`;
  };

  /* おきゃくさん（100×150 の はこ。0,0 が ひだりうえ） */
  function customer(type, mood) {
    const m = mood || 'normal';
    const body = (col, extra) => `<path d="M20 150 Q20 84 50 82 Q80 84 80 150 Z" fill="${col}"/>${extra || ''}`;
    switch (type) {
      case 'koji':
        return body('#868e96', '<path d="M34 86 L34 150 M66 86 L66 150" stroke="#ff922b" stroke-width="10"/><path d="M30 118 L70 118" stroke="#ffe066" stroke-width="4"/>')
          + face(50, 50, 27, SKIN[1], m)
          + '<path d="M21 44 Q22 16 50 15 Q78 16 79 44 Z" fill="#fcc419"/><rect x="16" y="40" width="68" height="7" rx="3" fill="#fab005"/>';
      case 'obaachan':
        return body('#9775fa', '<circle cx="50" cy="104" r="3" fill="#fff"/><circle cx="50" cy="120" r="3" fill="#fff"/>')
          + '<circle cx="50" cy="20" r="13" fill="#dee2e6"/>'
          + face(50, 50, 26, SKIN[0], m)
          + '<path d="M24 44 Q26 22 50 22 Q74 22 76 44 Q66 32 50 33 Q34 32 24 44Z" fill="#dee2e6"/>'
          + '<circle cx="41" cy="48" r="7" fill="none" stroke="#495057" stroke-width="2"/><circle cx="59" cy="48" r="7" fill="none" stroke="#495057" stroke-width="2"/><path d="M48 48 L52 48" stroke="#495057" stroke-width="2"/>';
      case 'oyako':
        return '<g transform="translate(-8 0) scale(.92)">' + body('#4dabf7')
          + face(50, 50, 26, SKIN[2], m) + '<path d="M23 46 Q24 20 50 20 Q76 20 77 46 Q74 30 50 30 Q30 30 23 46Z" fill="#343a40"/><path d="M24 44 Q18 70 24 88 L32 86 Q26 66 28 46Z" fill="#343a40"/><path d="M76 44 Q82 70 76 88 L68 86 Q74 66 72 46Z" fill="#343a40"/></g>'
          + '<g transform="translate(52 52) scale(.62)">' + body('#ff8787')
          + face(50, 50, 26, SKIN[2], m === 'normal' ? 'happy' : m) + '<path d="M24 44 Q24 20 50 20 Q76 20 76 44 Q66 30 50 32 Q34 30 24 44Z" fill="#495057"/><circle cx="26" cy="30" r="7" fill="#495057"/><circle cx="74" cy="30" r="7" fill="#495057"/></g>';
      case 'salary':
        return body('#364fc7', '<path d="M42 84 L50 100 L58 84 Z" fill="#fff"/><path d="M48 92 L52 92 L54 120 L50 126 L46 120Z" fill="#e03131"/>')
          + face(50, 50, 26, SKIN[1], m) + '<path d="M23 44 Q22 20 50 19 Q78 20 77 44 Q70 28 46 30 Q32 30 23 44Z" fill="#212529"/>'
          + '<rect x="72" y="118" width="22" height="18" rx="3" fill="#5c3d2e"/>';
      case 'tourist':
        return body('#38d9a9', '<rect x="38" y="100" width="24" height="16" rx="4" fill="#343a40"/><circle cx="50" cy="108" r="5" fill="#868e96"/><path d="M38 100 L30 84 M62 100 L70 84" stroke="#343a40" stroke-width="2"/>')
          + face(50, 50, 26, SKIN[0], m) + '<path d="M24 46 Q24 26 50 26 Q76 26 76 46 Q70 36 50 38 Q30 36 24 46Z" fill="#ffd43b"/>'
          + '<path d="M22 36 Q24 14 50 14 Q76 14 78 36 Z" fill="#e64980"/><path d="M60 34 L92 36 L78 30Z" fill="#c2255c"/>';
      case 'gakusei':
        return body('#1c7ed6', '<path d="M30 92 L30 150 M70 92 L70 150" stroke="#fff" stroke-width="4"/>')
          + face(50, 50, 26, SKIN[2], m) + '<path d="M23 44 Q22 18 50 18 Q78 18 77 44 Q76 28 64 30 L60 24 L54 30 L46 24 L40 30 Q28 28 23 44Z" fill="#212529"/>';
      case 'oneesan':
      default:
        return '<path d="M22 46 Q14 90 24 110 L76 110 Q86 90 78 46Z" fill="#8b5a2b"/>'
          + body('#f783ac', '<circle cx="50" cy="96" r="5" fill="#fff" opacity=".8"/>')
          + face(50, 50, 26, SKIN[0], m) + '<path d="M23 48 Q22 20 50 20 Q78 20 77 48 Q70 30 52 32 Q40 40 23 48Z" fill="#8b5a2b"/>';
    }
  }

  /* ねこ（80×60） */
  function cat(purr) {
    return `<g><ellipse cx="44" cy="46" rx="28" ry="14" fill="#ffa94d"/>
      <path d="M68 44 Q86 30 78 16" fill="none" stroke="#ffa94d" stroke-width="7" stroke-linecap="round"${purr ? ' class="wag"' : ''}/>
      <circle cx="24" cy="30" r="16" fill="#ffa94d"/>
      <path d="M11 22 L12 6 L22 16Z M37 22 L36 6 L26 16Z" fill="#ffa94d"/>
      ${purr ? '<path d="M15 29 q3 -3 6 0 M27 29 q3 -3 6 0" fill="none" stroke="#333" stroke-width="2"/>' : '<circle cx="18" cy="29" r="2.5" fill="#333"/><circle cx="30" cy="29" r="2.5" fill="#333"/>'}
      <path d="M21 35 q3 3 6 0" fill="none" stroke="#333" stroke-width="1.6"/>
      <path d="M8 34 L0 32 M8 37 L0 39 M40 34 L48 32 M40 37 L48 39" stroke="#333" stroke-width="1"/></g>`;
  }

  /* てんいんさん（100×150） */
  function clerk(skin, hair, mood) {
    const s = SKIN[skin | 0] || SKIN[0];
    const h = HAIR[hair | 0] || 'short';
    let hairBack = '';
    let hairFront = '<path d="M23 46 Q22 18 50 18 Q78 18 77 46 Q70 30 50 31 Q30 30 23 46Z" fill="#3b2a20"/>';
    if (h === 'pony') {
      hairBack = '<path d="M74 34 Q98 40 90 74 Q84 56 72 50Z" fill="#3b2a20"/>';
    } else if (h === 'bob') {
      hairBack = '<path d="M20 44 Q16 76 28 80 L72 80 Q84 76 80 44Z" fill="#3b2a20"/>';
      hairFront = '<path d="M22 50 Q20 18 50 18 Q80 18 78 50 Q74 32 50 32 Q26 32 22 50Z" fill="#3b2a20"/>';
    }
    return `${hairBack}<path d="M18 150 Q18 84 50 82 Q82 84 82 150 Z" fill="#f8f9fa"/>
      <path d="M30 96 L70 96 L74 150 L26 150Z" fill="#2b8a3e"/><path d="M30 96 L36 84 M70 96 L64 84" stroke="#2b8a3e" stroke-width="4"/>
      <g transform="translate(50 120)"><ellipse rx="5" ry="9" fill="#ffd43b"/><path d="M0 -12 L0 12" stroke="#f59f00" stroke-width="2"/></g>
      ${face(50, 50, 26, s, mood || 'happy')}${hairFront}
      <path d="M23 34 Q50 26 77 34 L77 41 Q50 33 23 41Z" fill="#fd7e14"/><path d="M77 36 L90 30 L88 42Z" fill="#fd7e14"/>`;
  }

  /* めんの たま（なま） */
  const ball = (x, y, r) => `<g><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.72}" fill="${C.noodle}" stroke="${C.noodleLine}" stroke-width="2"/>
    <path d="M${x - r * 0.6} ${y - 3} q${r * 0.3} -6 ${r * 0.6} 0 t${r * 0.6} 0" fill="none" stroke="${C.noodleLine}" stroke-width="2"/>
    <path d="M${x - r * 0.5} ${y + 5} q${r * 0.25} -5 ${r * 0.5} 0 t${r * 0.5} 0" fill="none" stroke="${C.noodleLine}" stroke-width="2"/></g>`;

  /* めん（うつわの なか）: n たま、cx,cy を まんなかに */
  function noodles(cx, cy, w, n) {
    let s = '';
    const rows = n >= 2 ? 6 : 4;
    for (let i = 0; i < rows; i += 1) {
      const y = cy - rows * 2.5 + i * 5;
      s += `<path d="M${cx - w / 2} ${y} q${w / 8} -6 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0" fill="none" stroke="${C.noodle}" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M${cx - w / 2} ${y} q${w / 8} -6 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0" fill="none" stroke="${C.noodleLine}" stroke-width="1" opacity=".7"/>`;
    }
    return s;
  }

  const toppingArt = (id, x, y) => {
    if (id === 'negi') return `<g><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${C.negi}" stroke-width="3"/><circle cx="${x + 10}" cy="${y + 4}" r="4" fill="none" stroke="#40c057" stroke-width="3"/><circle cx="${x - 9}" cy="${y + 5}" r="4" fill="none" stroke="${C.negi}" stroke-width="3"/></g>`;
    if (id === 'tenkasu') return `<g fill="${C.tenkasu}" stroke="#e8a317" stroke-width="1"><circle cx="${x}" cy="${y}" r="4"/><circle cx="${x + 8}" cy="${y + 3}" r="3.5"/><circle cx="${x - 7}" cy="${y + 4}" r="3"/><circle cx="${x + 3}" cy="${y + 8}" r="3"/></g>`;
    return `<g><ellipse cx="${x}" cy="${y + 3}" rx="9" ry="6" fill="${C.shoga}" stroke="#f08c7a" stroke-width="1.5"/></g>`;
  };

  /* てんぷら（id、いろ 0..1。0 は なま、0.55〜0.8 きつねいろ、1 こげ） */
  function friedColor(c) {
    const stops = [[0, [255, 250, 235]], [0.4, [250, 226, 160]], [0.65, [236, 170, 70]], [0.85, [176, 104, 40]], [1, [80, 50, 30]]];
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let i = 1; i < stops.length; i += 1) if (c <= stops[i][0]) { a = stops[i - 1]; b = stops[i]; break; }
    const k = (c - a[0]) / Math.max(0.0001, b[0] - a[0]);
    const v = a[1].map((x, i) => Math.round(x + (b[1][i] - x) * Math.max(0, Math.min(1, k))));
    return `rgb(${v.join(',')})`;
  }
  function side(id, x, y, s, color) {
    const k = s || 1;
    const col = color == null ? friedColor(0.7) : friedColor(color);
    const rough = `stroke="${color != null && color < 0.3 ? '#e9d9a6' : '#b8742e'}" stroke-width="1.5"`;
    let g = '';
    switch (id) {
      case 'ebi':
        g = `<path d="M-24 6 Q-10 -12 18 -4 Q24 -2 22 4 Q-6 2 -20 14Z" fill="${col}" ${rough}/><path d="M18 -4 L30 -12 L28 2Z" fill="#ff6b6b"/>`; break;
      case 'chikuwa':
        g = `<rect x="-24" y="-9" width="48" height="18" rx="9" fill="${col}" ${rough}/><ellipse cx="22" cy="0" rx="4" ry="6" fill="#fff4d6"/>`; break;
      case 'imo':
        g = `<ellipse cx="0" cy="0" rx="20" ry="13" fill="${col}" ${rough}/><ellipse cx="0" cy="0" rx="12" ry="7" fill="#ffd43b" opacity="${color != null && color < 0.3 ? 0.2 : 0.7}"/><ellipse cx="0" cy="0" rx="20" ry="13" fill="none" stroke="#9c36b5" stroke-width="2.5"/>`; break;
      case 'kashiwa':
        g = `<path d="M-18 -6 Q-4 -18 14 -10 Q24 0 14 10 Q-4 18 -18 8 Q-24 0 -18 -6Z" fill="${col}" ${rough}/>`; break;
      case 'kakiage':
        g = `<circle r="20" fill="${col}" ${rough}/><path d="M-10 -6 L4 -10 M-6 6 L10 2 M-12 2 L-2 10" stroke="#f76707" stroke-width="3" stroke-linecap="round"/><path d="M2 -2 L12 -8" stroke="#2f9e44" stroke-width="3" stroke-linecap="round"/>`; break;
      case 'onigiri':
        g = '<path d="M0 -18 Q8 -18 20 6 Q22 14 14 14 L-14 14 Q-22 14 -20 6 Q-8 -18 0 -18Z" fill="#fff" stroke="#dee2e6" stroke-width="1.5"/><rect x="-10" y="2" width="20" height="12" fill="#2b2b2b"/>'; break;
      default:
        g = '';
    }
    return `<g transform="translate(${x} ${y}) scale(${k})">${g}</g>`;
  }

  /* おかね */
  function coin(v, x, y, s) {
    const k = s || 1;
    const style = {
      500: ['#e9c46a', '#b08d2a', 22], 100: ['#ced4da', '#868e96', 19], 50: ['#e9ecef', '#adb5bd', 17], 10: ['#d9895b', '#a0522d', 18],
      1000: ['#d3f9d8', '#2f9e44', 0],
    }[v];
    if (v === 1000) {
      return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-36" y="-18" width="72" height="36" rx="4" fill="${style[0]}" stroke="${style[1]}" stroke-width="2"/><text y="7" text-anchor="middle" font-size="18" font-weight="800" fill="#2b8a3e">1000</text></g>`;
    }
    const hole = v === 50 ? '<circle r="4" fill="#fff"/>' : '';
    return `<g transform="translate(${x} ${y}) scale(${k})"><circle r="${style[2]}" fill="${style[0]}" stroke="${style[1]}" stroke-width="2.5"/>${hole}<text y="${v === 50 ? 15 : 6}" text-anchor="middle" font-size="${v === 50 ? 9 : 14}" font-weight="800" fill="#5a4a2a">${v}</text></g>`;
  }

  /*
   * うつわ（もりつけ・ちゅうもん カード 用）
   *  st = { kind, balls, soup(0..1), soupKind, toppings[], dip }
   *  cx, cy は うつわの まんなか、w は はば
   */
  function vessel(st, cx, cy, w) {
    const k = st.kind || 'kake';
    const v = (Menu.KINDS[k] || Menu.KINDS.kake).vessel;
    const h = w * 0.5;
    let s = '';
    let soupTop = cy;
    if (v === 'zaru') {
      s += `<ellipse cx="${cx}" cy="${cy + h * 0.25}" rx="${w / 2}" ry="${h * 0.38}" fill="#e7c48a" stroke="#a8743f" stroke-width="3"/>`;
      for (let i = -3; i <= 3; i += 1) s += `<path d="M${cx + i * w / 9} ${cy + h * 0.25 - h * 0.3} L${cx + i * w / 9} ${cy + h * 0.25 + h * 0.3}" stroke="#c9a46b" stroke-width="1.5"/>`;
      if (st.balls) s += noodles(cx, cy + h * 0.15, w * 0.62, st.balls);
    } else {
      const col = v === 'oke' ? '#c08a4f' : '#f8f9fa';
      const rim = v === 'oke' ? '#8a5a2b' : '#c92a2a';
      s += `<path d="M${cx - w / 2} ${cy} Q${cx - w / 2} ${cy + h} ${cx} ${cy + h} Q${cx + w / 2} ${cy + h} ${cx + w / 2} ${cy} Z" fill="${col}" stroke="${rim}" stroke-width="3"/>`;
      if (v === 'oke') s += `<path d="M${cx - w * 0.32} ${cy + 4} L${cx - w * 0.28} ${cy + h * 0.92} M${cx + w * 0.32} ${cy + 4} L${cx + w * 0.28} ${cy + h * 0.92}" stroke="#8a5a2b" stroke-width="2"/>`;
      else s += `<path d="M${cx - w * 0.38} ${cy + h * 0.55} Q${cx} ${cy + h * 0.75} ${cx + w * 0.38} ${cy + h * 0.55}" fill="none" stroke="#ffc9c9" stroke-width="3"/>`;
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h * 0.22}" fill="#fff" stroke="${rim}" stroke-width="3"/>`;
      const lvl = Math.max(0, Math.min(1, st.soup || 0));
      if (lvl > 0) {
        const colr = st.soupKind === 'coldSoup' ? C.cold : st.soupKind === 'hotWater' ? C.water : C.hot;
        const rr = (w / 2 - 4) * (0.55 + 0.45 * lvl);
        soupTop = cy + (1 - lvl) * h * 0.18;
        s += `<ellipse cx="${cx}" cy="${soupTop}" rx="${rr}" ry="${h * 0.18 * (0.55 + 0.45 * lvl)}" fill="${colr}" opacity="${st.soupKind === 'hotWater' ? 0.95 : 0.85}"/>`;
      }
      if (st.balls) s += noodles(cx, cy - 2, w * 0.6, st.balls);
    }
    (st.toppings || []).forEach((t, i) => {
      s += `<g class="bowl-top" data-top="${t}">${toppingArt(t, cx - w * 0.2 + i * w * 0.2, cy - 6 + (i % 2) * 6)}</g>`;
    });
    if (st.dip) {
      const dx = cx + w * 0.62;
      const dy = cy + h * 0.25;
      s += `<path d="M${dx - 22} ${dy - 10} L${dx + 22} ${dy - 10} L${dx + 16} ${dy + 18} L${dx - 16} ${dy + 18}Z" fill="#fff" stroke="#495057" stroke-width="2"/><ellipse cx="${dx}" cy="${dy - 10}" rx="22" ry="6" fill="${C.dip}"/>`;
    }
    return s;
  }

  /* ちゅうもん カードの え（ちいさな svg） */
  function orderIcon(order) {
    const st = Shop.perfect(order);
    return `<svg viewBox="-10 -14 140 82" class="oicon" aria-hidden="true">${vessel({ kind: order.kind, balls: st.balls, soup: st.soup, soupKind: st.soupKind, toppings: order.toppings, dip: st.steps.includes('dipSoup') }, 50, 20, 90)}</svg>`;
  }
  const toppingIcon = (id) => `<svg viewBox="-16 -12 32 28" class="ticon" aria-hidden="true">${toppingArt(id, 0, 0)}</svg>`;
  const sideIcon = (id) => `<svg viewBox="-30 -22 60 44" class="sicon" aria-hidden="true">${side(id, 0, 0, 1)}</svg>`;

  /* ゆげ */
  const steam = (x, y, n) => {
    let s = '';
    for (let i = 0; i < (n || 3); i += 1) s += `<path class="steam s${i}" d="M${x + i * 18 - 18} ${y} q-8 -12 0 -24 t0 -24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
    return s;
  };

  return { SKIN, HAIR, C, customer, cat, clerk, ball, noodles, toppingArt, friedColor, side, coin, vessel, orderIcon, toppingIcon, sideIcon, steam, face };
})();
