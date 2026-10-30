'use strict';

/*
 * おべんとう づくり — え（SVG を コードで かく）
 *
 *   Draw.piece(food, seed)          … たべもの 1こ（0〜100 の しかく の なか）
 *   Draw.icon(food)                 … たな・ずかん 用の <svg>
 *   Draw.box(theme, slots, opt)     … おべんとうばこ ぜんぶ（<svg> の なかみ）
 *   Draw.deco(deco, size)           … のり・ピック
 * 画像ファイルは つかわない。
 */

const Draw = (() => {
  const OL = 'stroke="rgba(70,45,25,.38)" stroke-width="2.5" stroke-linejoin="round"';

  function rng(seed) {
    let s = (seed * 9301 + 49297) % 233280 || 7;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h) % 100000;
  }
  const r1 = (n) => Math.round(n * 10) / 10;

  function dots(rnd, n, cx, cy, rx, ry, color, size) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      s += `<ellipse cx="${r1(cx + Math.cos(a) * rx * d)}" cy="${r1(cy + Math.sin(a) * ry * d)}" rx="${size}" ry="${r1(size * .6)}" transform="rotate(${Math.round(rnd() * 180)} ${r1(cx + Math.cos(a) * rx * d)} ${r1(cy + Math.sin(a) * ry * d)})" fill="${color}"/>`;
    }
    return s;
  }
  function grains(rnd, n, x, y, w, h) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const gx = x + rnd() * w, gy = y + rnd() * h;
      s += `<ellipse cx="${r1(gx)}" cy="${r1(gy)}" rx="4.6" ry="2.6" transform="rotate(${Math.round(rnd() * 180)} ${r1(gx)} ${r1(gy)})" fill="#fff" stroke="#e6dcc6" stroke-width="1"/>`;
    }
    return s;
  }
  const sesame = (rnd, n, cx, cy, rx, ry) => dots(rnd, n, cx, cy, rx, ry, '#f3e3b5', 2.2);

  // ごはん の うえ の トッピング（x,y,w,h の なか）
  function riceTop(top, rnd, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);
    if (top === 'ume') {
      const r = m * .14;
      return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="#d6336c" ${OL}/><path d="M${r1(cx - r * .5)} ${r1(cy - r * .2)} q${r1(r * .3)} ${r1(-r * .3)} ${r1(r * .6)} 0" stroke="#a61e4d" stroke-width="2" fill="none"/><ellipse cx="${r1(cx - r * .35)}" cy="${r1(cy - r * .4)}" rx="${r1(r * .25)}" ry="${r1(r * .15)}" fill="#fff" opacity=".5"/>`;
    }
    let s = '';
    const n = Math.round(w * h / 260);
    for (let i = 0; i < n; i++) {
      const px = x + 6 + rnd() * (w - 12), py = y + 6 + rnd() * (h - 12), a = Math.round(rnd() * 180);
      if (top === 'shirasu') s += `<path d="M${r1(px - 6)} ${r1(py)} q6 -5 12 0" stroke="#f1ece0" stroke-width="3.2" fill="none" stroke-linecap="round" transform="rotate(${a} ${r1(px)} ${r1(py)})"/><circle cx="${r1(px - 5)}" cy="${r1(py - 1)}" r="1" fill="#555" transform="rotate(${a} ${r1(px)} ${r1(py)})"/>`;
      if (top === 'maze') s += `<rect x="${r1(px)}" y="${r1(py)}" width="7" height="3.5" rx="1.5" fill="${['#ff922b', '#8b5a2b', '#69db7c', '#c08a4a'][i % 4]}" transform="rotate(${a} ${r1(px)} ${r1(py)})"/>`;
      if (top === 'sake' && i % 2 === 0) s += `<path d="M${r1(px)} ${r1(py)} l6 -3 l4 4 l-6 3 z" fill="#ff8a65" transform="rotate(${a} ${r1(px)} ${r1(py)})"/>`;
    }
    return s;
  }

  const P = {};
  P.rice = (p, rnd) => `<path d="M10 74 Q12 30 50 26 Q88 30 90 74 Q50 82 10 74Z" fill="${p.top === 'maze' ? '#f3e3c3' : '#fffdf6'}" ${OL}/>` + grains(rnd, 34, 18, 34, 64, 38) + riceTop(p.top, rnd, 22, 34, 56, 38);
  P.onigiri = (p, rnd) => `<path d="M50 12 C58 12 90 64 88 76 C86 87 14 87 12 76 C10 64 42 12 50 12Z" fill="#fffdf6" ${OL}/>` + grains(rnd, 16, 30, 30, 40, 26) +
    `<path d="M29 60 H71 L74 84 Q50 88 26 84 Z" fill="#1e2b22"/>` + (p.dot ? `<circle cx="50" cy="46" r="7" fill="${p.dot}"/>` : '');
  P.inari = (p, rnd) => `<rect x="12" y="26" width="76" height="52" rx="22" fill="#c98a3c" ${OL}/><path d="M22 36 Q50 28 78 36" stroke="#a96a28" stroke-width="3" fill="none"/>` + dots(rnd, 16, 50, 54, 30, 18, '#b37530', 2.2);
  P.maki = (p, rnd) => `<circle cx="50" cy="50" r="36" fill="#1e2b22"/><circle cx="50" cy="50" r="29" fill="#fffdf6"/>` + grains(rnd, 14, 30, 30, 40, 40) + `<circle cx="50" cy="50" r="10" fill="${p.c}" stroke="#2b8a3e" stroke-width="2"/>`;
  P.sand = (p) => `<path d="M12 80 L50 16 L88 80 Z" fill="#fff3d6" stroke="#d9a55a" stroke-width="6" stroke-linejoin="round"/><path d="M19 72 H81 L85 80 H15 Z" fill="${p.cs[0]}"/><path d="M23 66 Q36 60 50 66 Q64 72 77 66 L81 72 H19 Z" fill="${p.cs[1]}"/>`;
  P.roll = () => `<ellipse cx="50" cy="56" rx="38" ry="26" fill="#cf8a3e" ${OL}/><ellipse cx="44" cy="48" rx="22" ry="10" fill="#e6a85c" opacity=".8"/><path d="M30 38 Q34 58 30 76 M50 32 Q55 56 50 82 M70 38 Q74 58 70 76" stroke="#a96a28" stroke-width="3" fill="none"/>`;
  P.noodle = (p, rnd) => {
    let s = `<ellipse cx="50" cy="56" rx="40" ry="28" fill="${p.c}" opacity=".45"/>`;
    for (let i = 0; i < 7; i++) {
      const y = 36 + i * 6;
      s += `<path d="M${14 + rnd() * 6} ${y} q10 -8 18 0 t18 0 t18 0 t18 0" stroke="${p.c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    p.bits.forEach((b, i) => { for (let k = 0; k < 3; k++) s += `<rect x="${r1(22 + rnd() * 52)}" y="${r1(34 + rnd() * 34)}" width="9" height="5" rx="2" fill="${b}" transform="rotate(${Math.round(rnd() * 90)} 50 50)"/>`; });
    return s;
  };
  P.fry = (p, rnd) => {
    if (p.flat) return `<path d="M18 50 Q16 28 42 26 Q70 22 82 40 Q90 64 66 74 Q40 82 24 70 Q16 62 18 50Z" fill="${p.c}" ${OL}/>` + dots(rnd, 14, 50, 50, 26, 18, '#b9853f', 2.4);
    const pts = [[38, 40, 20], [60, 38, 18], [64, 60, 19], [40, 62, 20], [50, 50, 16]];
    return pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.c}" ${OL}/>`).join('') + dots(rnd, 22, 50, 50, 30, 26, '#9c5a1c', 2.6) + dots(rnd, 10, 46, 44, 22, 18, '#e0a050', 2.2);
  };
  P.tamago = () => `<rect x="10" y="28" width="80" height="46" rx="14" fill="#ffd43b" ${OL}/><path d="M16 40 Q50 34 84 40 M14 52 Q50 46 86 52 M16 64 Q50 58 84 64" stroke="#f08c00" stroke-width="2.5" fill="none" opacity=".7"/><ellipse cx="34" cy="34" rx="12" ry="3" fill="#fff" opacity=".5"/>`;
  P.egghalf = () => `<ellipse cx="50" cy="52" rx="38" ry="30" fill="#fff" ${OL}/><circle cx="50" cy="52" r="16" fill="#fcc419"/><circle cx="50" cy="52" r="8" fill="#ffe066"/>`;
  P.friedegg = () => `<path d="M16 50 Q14 24 42 22 Q62 14 80 30 Q94 50 78 70 Q58 86 34 76 Q14 68 16 50Z" fill="#fff" ${OL}/><circle cx="46" cy="48" r="15" fill="#fcc419"/><ellipse cx="41" cy="43" rx="5" ry="3" fill="#fff" opacity=".6"/>`;
  P.fish = (p) => `<path d="M12 42 Q18 26 50 28 Q84 28 90 44 Q88 72 52 74 Q16 74 12 56 Z" fill="${p.c}" ${OL}/><path d="M16 36 Q40 24 86 38" stroke="${p.skin || '#8e6a5a'}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    (p.sauce ? `<path d="M22 50 Q50 40 80 50 Q60 66 30 62Z" fill="#5c2e1a" opacity=".35"/>` : `<path d="M30 46 Q36 58 30 68 M48 42 Q56 56 48 70 M66 44 Q72 56 66 68" stroke="#ffe3d6" stroke-width="3" fill="none"/>`);
  P.shrimp = (p, rnd) => `<path d="M76 30 L94 16 L90 34 L98 40 L78 42 Z" fill="#f03e3e" ${OL}/><path d="M80 36 Q70 24 56 30 L20 62 Q12 72 22 80 Q32 86 40 76 L76 46 Q84 40 80 36Z" fill="#d99a4e" ${OL}/>` + dots(rnd, 18, 48, 56, 24, 16, '#b8752e', 2.4);
  P.patty = (p) => `<ellipse cx="50" cy="56" rx="40" ry="28" fill="${p.c}" ${OL}/><ellipse cx="50" cy="50" rx="31" ry="18" fill="${p.sauce}" opacity=".85"/><ellipse cx="40" cy="45" rx="10" ry="4" fill="#fff" opacity=".35"/>`;
  P.ball = (p) => {
    const n = p.n || 1, R = 30 * (p.r || 1);
    const pos = { 1: [[50, 52]], 2: [[34, 58], [66, 58]], 3: [[34, 60], [66, 60], [50, 34]], 4: [[34, 38], [66, 38], [34, 66], [66, 66]] }[n] ||
      Array.from({ length: n }, (_, i) => [50 + Math.cos(i * 2.4) * 26 * Math.sqrt(i / n), 52 + Math.sin(i * 2.4) * 24 * Math.sqrt(i / n)]);
    let s = '';
    if (p.cherry) s += `<path d="M34 54 Q44 20 60 14 M66 54 Q62 30 60 14" stroke="#5c940d" stroke-width="3" fill="none"/>`;
    pos.forEach(([x, y]) => {
      s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}" fill="${p.c}" ${OL}/>`;
      if (p.sauce) s += `<ellipse cx="${r1(x)}" cy="${r1(y - R * .2)}" rx="${r1(R * .8)}" ry="${r1(R * .55)}" fill="#4a1f0e" opacity=".45"/>`;
      s += `<ellipse cx="${r1(x - R * .35)}" cy="${r1(y - R * .4)}" rx="${r1(R * .28)}" ry="${r1(R * .16)}" fill="#fff" opacity=".55"/>`;
      if (p.stem) s += `<path d="M${x} ${r1(y - R)} l-8 -3 l7 -1 l-2 -7 l4 6 l5 -5 l-2 7 l7 2 z" fill="#2f9e44"/>`;
    });
    return s;
  };
  P.wiener = () => `<path d="M20 52 Q18 18 50 18 Q82 18 80 52 Z" fill="#e8453c" ${OL}/>` +
    [24, 40, 60, 76].map((x, i) => `<path d="M${x} 48 Q${x + (i < 2 ? -6 : 6)} 66 ${x + (i < 2 ? -2 : 2)} 82" stroke="#e8453c" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="${x + (i < 2 ? -2 : 2)}" cy="82" r="4" fill="#ffb3a7"/>`).join('') +
    `<circle cx="40" cy="38" r="3.4" fill="#2b1a12"/><circle cx="60" cy="38" r="3.4" fill="#2b1a12"/><ellipse cx="38" cy="26" rx="8" ry="3" fill="#fff" opacity=".4"/>`;
  P.strips = (p, rnd) => {
    let s = '';
    for (let i = 0; i < 9; i++) {
      const x = 18 + rnd() * 30, y = 22 + rnd() * 50, L = 40 + rnd() * 20, a = Math.round(-30 + rnd() * 60);
      s += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(L)}" height="${p.w}" rx="${r1(p.w / 2.2)}" fill="${p.cs[i % p.cs.length]}" ${OL} transform="rotate(${a} ${r1(x + L / 2)} ${r1(y + p.w / 2)})"/>`;
    }
    return s + (p.sesame ? sesame(rnd, 14, 50, 50, 30, 26) : '');
  };
  P.cube = (p, rnd) => {
    let s = `<path d="M18 38 L34 22 L88 22 L72 38Z" fill="${p.top}" ${OL}/><path d="M72 38 L88 22 L88 66 L72 82Z" fill="${p.c}" ${OL} opacity=".8"/><rect x="18" y="38" width="54" height="44" fill="${p.c}" ${OL}/>`;
    if (p.holes) s += '<circle cx="34" cy="54" r="5" fill="#f59f00" opacity=".6"/><circle cx="56" cy="66" r="4" fill="#f59f00" opacity=".6"/><circle cx="58" cy="48" r="3" fill="#f59f00" opacity=".6"/><ellipse cx="60" cy="30" rx="6" ry="2.5" fill="#f59f00" opacity=".5"/>';
    if (p.glaze) s += '<path d="M24 46 Q40 42 62 48" stroke="#fff" stroke-width="3" opacity=".5" fill="none"/>' + dots(rnd, 6, 45, 60, 20, 14, '#7a4a20', 2.2);
    return s;
  };
  P.dumpling = (p) => p.kind === 'shumai'
    ? `<rect x="24" y="34" width="52" height="50" rx="12" fill="#fff3d6" ${OL}/><ellipse cx="50" cy="36" rx="27" ry="10" fill="#e9c98a" ${OL}/><path d="M30 44 Q36 70 32 80 M50 46 V82 M70 44 Q64 70 68 80" stroke="#e9d3a6" stroke-width="2.5" fill="none"/><circle cx="50" cy="31" r="7" fill="#51cf66" ${OL}/>`
    : `<path d="M10 68 Q50 4 90 68 Z" fill="#fdf0d5" ${OL}/><path d="M10 68 Q50 80 90 68 Q50 74 10 68Z" fill="#c8873e" stroke="#a96a28" stroke-width="3"/>` +
      [26, 38, 50, 62, 74].map((x) => `<path d="M${x} ${x < 50 ? 42 - (x - 26) / 3 : 34 + (x - 50) / 3} q4 6 2 12" stroke="#e4cfa4" stroke-width="2.5" fill="none"/>`).join('');
  P.ham = () => `<circle cx="50" cy="50" r="36" fill="#f6a5b0" ${OL}/><circle cx="50" cy="50" r="28" fill="#f8b9c1"/><path d="M14 50 A36 36 0 0 0 86 50 Q50 64 14 50Z" fill="#ee8e9b" opacity=".8"/><ellipse cx="38" cy="34" rx="10" ry="4" fill="#fff" opacity=".45"/>`;
  P.kamaboko = () => `<path d="M12 74 Q12 26 50 26 Q88 26 88 74 Z" fill="#fffdf6" ${OL}/><path d="M14 66 Q14 30 50 30 Q86 30 86 66" stroke="#ff8fab" stroke-width="9" fill="none"/><rect x="10" y="72" width="80" height="8" rx="3" fill="#e8d3a8"/>`;
  P.tube = (p, rnd) => `<circle cx="50" cy="50" r="36" fill="${p.c}" stroke="#b07a3a" stroke-width="7"/>` + (p.isobe ? dots(rnd, 20, 50, 50, 30, 30, '#2f9e44', 2.4) : '') +
    `<circle cx="50" cy="50" r="13" fill="${p.hole || '#fff8e8'}" ${OL}/>` + (p.hole ? '<circle cx="50" cy="50" r="7" fill="#d8f5a2"/>' : '');
  P.beans = (p, rnd) => {
    let s = '';
    for (let i = 0; i < (p.n || 7); i++) {
      const a = i * 2.4, d = 26 * Math.sqrt(i / (p.n || 7)), x = 50 + Math.cos(a) * d, y = 52 + Math.sin(a) * d * .8;
      s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="12" ry="9" fill="${p.c}" ${OL} transform="rotate(${Math.round(rnd() * 90)} ${r1(x)} ${r1(y)})"/><ellipse cx="${r1(x - 3)}" cy="${r1(y - 3)}" rx="4" ry="2" fill="#fff" opacity=".45"/>`;
    }
    return s;
  };
  P.broccoli = () => `<path d="M44 92 L46 56 L54 56 L56 92 Z" fill="#a9e34b" ${OL}/>` +
    [[34, 46, 18], [66, 46, 18], [50, 32, 20], [40, 60, 14], [60, 60, 14]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2f9e44" ${OL}/><circle cx="${x - 4}" cy="${y - 3}" r="${r * .35}" fill="#40c057"/>`).join('');
  P.flower = (p) => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 - Math.PI / 2;
      s += `<circle cx="${r1(50 + Math.cos(a) * 20)}" cy="${r1(50 + Math.sin(a) * 20)}" r="17" fill="${p.c}" ${OL}/>`;
    }
    return s + `<circle cx="50" cy="50" r="20" fill="${p.c}"/><circle cx="50" cy="50" r="9" fill="#ffc078"/><ellipse cx="40" cy="36" rx="6" ry="3" fill="#fff" opacity=".45"/>`;
  };
  P.leaves = (p, rnd) => {
    let s = `<ellipse cx="50" cy="58" rx="40" ry="26" fill="${p.c}" opacity=".7"/>`;
    for (let i = 0; i < 8; i++) {
      const x = 22 + rnd() * 56, y = 34 + rnd() * 36, a = Math.round(rnd() * 180);
      s += p.wave
        ? `<path d="M${r1(x - 16)} ${r1(y)} q4 -14 16 -12 q12 -2 16 12 q-6 12 -16 10 q-10 2 -16 -10z" fill="${['#8ce99a', '#b2f2bb', '#69db7c'][i % 3]}" ${OL} transform="rotate(${a} ${r1(x)} ${r1(y)})"/>`
        : `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="16" ry="6" fill="${['#2b8a3e', '#37b24d', '#2f9e44'][i % 3]}" ${OL} transform="rotate(${a} ${r1(x)} ${r1(y)})"/>`;
    }
    if (p.egg) for (let i = 0; i < 5; i++) s += `<ellipse cx="${r1(26 + rnd() * 48)}" cy="${r1(38 + rnd() * 30)}" rx="9" ry="6" fill="#ffd43b"/>`;
    return s + (p.sesame ? sesame(rnd, 14, 50, 54, 32, 20) : '');
  };
  P.sticks = (p, rnd) => {
    let s = '';
    const n = p.n || 4;
    for (let i = 0; i < n; i++) {
      const y = 20 + i * (60 / n), a = Math.round(-14 + rnd() * 28), x = 12 + rnd() * 8;
      s += `<g transform="rotate(${a} 50 ${r1(y + 6)})"><rect x="${r1(x)}" y="${r1(y)}" width="72" height="${n > 4 ? 10 : 13}" rx="6" fill="${p.c}" stroke="${p.edge || 'rgba(70,45,25,.38)'}" stroke-width="2.5"/>`;
      if (p.wrap) for (let k = 0; k < 4; k++) s += `<path d="M${r1(x + 18 + k * 9)} ${r1(y - 2)} l8 17" stroke="${p.wrap}" stroke-width="7"/>`;
      s += '</g>';
    }
    return s + (p.sesame ? sesame(rnd, 10, 50, 50, 32, 26) : '');
  };
  P.wedge = (p, rnd) => {
    switch (p.kind) {
      case 'apple': return `<path d="M10 58 Q50 14 90 58 Q50 70 10 58Z" fill="#e03131" ${OL}/><path d="M10 58 Q50 70 90 58 Q50 86 10 58Z" fill="#fff4d6" ${OL}/><path d="M56 30 L64 50 L72 36" fill="#fff4d6" stroke="#fff4d6" stroke-width="3"/><ellipse cx="34" cy="40" rx="8" ry="3" fill="#fff" opacity=".4"/>`;
      case 'kabocha': return `<path d="M12 74 Q50 18 88 74 Z" fill="#ffb627" ${OL}/><path d="M14 72 Q50 20 86 72" stroke="#2b5a2b" stroke-width="9" fill="none" stroke-linecap="round"/>` + dots(rnd, 4, 50, 62, 18, 6, '#e8950f', 3);
      case 'orange': return `<path d="M12 64 A38 38 0 0 1 88 64 Z" fill="#ffa94d" stroke="#f76707" stroke-width="6" stroke-linejoin="round"/><path d="M50 64 L28 38 M50 64 L50 30 M50 64 L72 38" stroke="#ffd8a8" stroke-width="3"/>`;
      case 'peach': return `<path d="M12 60 Q50 16 88 60 Q50 74 12 60Z" fill="#ffd8a8" ${OL}/><path d="M18 56 Q50 24 82 56" stroke="#ffa8a8" stroke-width="6" fill="none" opacity=".7"/>`;
      case 'melon': return `<path d="M10 64 Q50 10 90 64 Z" fill="#c0eb75" ${OL}/><path d="M10 64 Q50 56 90 64 L88 72 Q50 64 12 72Z" fill="#74b816"/>` + dots(rnd, 6, 50, 50, 20, 6, '#e9fac8', 3);
      default: return `<path d="M14 40 Q30 20 60 26 Q88 34 84 56 Q76 78 46 76 Q16 72 14 40Z" fill="#ffd43b" ${OL}/><path d="M14 40 Q30 20 60 26 Q88 34 84 56" stroke="#862e9c" stroke-width="7" fill="none"/><ellipse cx="44" cy="54" rx="22" ry="10" fill="#fff" opacity=".3"/>` + dots(rnd, 10, 50, 54, 24, 14, '#2b1a12', 1.8);
    }
  };
  P.salad = (p, rnd) => {
    let s = `<path d="M12 64 Q10 34 36 30 Q52 18 70 30 Q92 36 88 64 Q70 80 50 78 Q26 80 12 64Z" fill="${p.c}" ${OL}/>`;
    for (let i = 0; i < 14; i++) s += `<rect x="${r1(20 + rnd() * 58)}" y="${r1(32 + rnd() * 38)}" width="8" height="5" rx="2" fill="${p.bits[i % p.bits.length]}" transform="rotate(${Math.round(rnd() * 180)} 50 54)"/>`;
    return s;
  };
  P.slice = (p, rnd) => {
    switch (p.kind) {
      case 'imo': return `<circle cx="50" cy="50" r="33" fill="#ffe066" stroke="#862e9c" stroke-width="8"/><circle cx="50" cy="50" r="18" fill="#fff3bf" opacity=".6"/>`;
      case 'kyuri': return `<circle cx="50" cy="50" r="32" fill="#d8f5a2" stroke="#2b8a3e" stroke-width="6"/>` + [0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${r1(50 + Math.cos(i) * 12)}" cy="${r1(50 + Math.sin(i) * 12)}" rx="3" ry="2" fill="#f4fce3"/>`).join('');
      case 'renkon': return `<circle cx="50" cy="50" r="35" fill="#fff9eb" stroke="#e9d8b0" stroke-width="4"/>` + [0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${r1(50 + Math.cos(i * .9) * 20)}" cy="${r1(50 + Math.sin(i * .9) * 20)}" r="6.5" fill="#efe2c4"/>`).join('') + '<circle cx="50" cy="50" r="5" fill="#efe2c4"/>';
      case 'okra': {
        let d = '';
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, R = i % 2 ? 22 : 36; d += `${i ? 'L' : 'M'}${r1(50 + Math.cos(a) * R)} ${r1(50 + Math.sin(a) * R)}`; }
        return `<path d="${d}Z" fill="#8ce99a" stroke="#2b8a3e" stroke-width="5" stroke-linejoin="round"/>` + [0, 1, 2, 3, 4].map((i) => `<circle cx="${r1(50 + Math.cos(i * 1.256 - 1.57) * 12)}" cy="${r1(50 + Math.sin(i * 1.256 - 1.57) * 12)}" r="3.5" fill="#fff"/>`).join('');
      }
      case 'kiwi': return `<circle cx="50" cy="50" r="34" fill="#82c91e" stroke="#8d6e3a" stroke-width="4"/><circle cx="50" cy="50" r="11" fill="#f4fce3"/>` + Array.from({ length: 14 }, (_, i) => `<ellipse cx="${r1(50 + Math.cos(i * .449) * 17)}" cy="${r1(50 + Math.sin(i * .449) * 17)}" rx="2.4" ry="1.4" fill="#212529" transform="rotate(${Math.round(i * 25.7)} ${r1(50 + Math.cos(i * .449) * 17)} ${r1(50 + Math.sin(i * .449) * 17)})"/>`).join('');
      default: return `<circle cx="50" cy="50" r="31" fill="#e8d7b0" stroke="#6741d9" stroke-width="8"/>` + dots(rnd, 6, 50, 50, 18, 18, '#a8743a', 3.4);
    }
  };
  P.corn = () => {
    let s = '';
    [[30, 34], [46, 30], [62, 34], [24, 50], [40, 48], [56, 48], [72, 50], [32, 64], [48, 64], [64, 64], [44, 78], [60, 78]].forEach(([x, y]) => {
      s += `<rect x="${x - 7}" y="${y - 6}" width="14" height="12" rx="5" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/>`;
    });
    return s;
  };
  P.pod = () => `<path d="M10 62 Q20 30 50 32 Q78 30 90 44 Q82 66 52 66 Q30 70 10 62Z" fill="#74b816" ${OL}/>` +
    [30, 50, 70].map((x) => `<ellipse cx="${x}" cy="${x === 70 ? 50 : 52}" rx="10" ry="9" fill="#a9e34b"/>`).join('');
  P.seaweed = (p, rnd) => {
    let s = '';
    if (p.kind === 'hijiki') {
      s += '<ellipse cx="50" cy="56" rx="40" ry="26" fill="#3a3330" opacity=".55"/>';
      for (let i = 0; i < 22; i++) { const x = 18 + rnd() * 56, y = 34 + rnd() * 40; s += `<path d="M${r1(x)} ${r1(y)} l${r1(6 + rnd() * 8)} ${r1(-4 + rnd() * 8)}" stroke="#1f1a17" stroke-width="5" stroke-linecap="round"/>`; }
      for (let i = 0; i < 6; i++) s += `<rect x="${r1(22 + rnd() * 52)}" y="${r1(38 + rnd() * 30)}" width="9" height="4" rx="1.5" fill="${i % 2 ? '#ff922b' : '#d9a55a'}"/>`;
      return s;
    }
    for (let i = 0; i < 5; i++) { const x = 24 + rnd() * 44, y = 36 + rnd() * 30; s += `<path d="M${r1(x - 16)} ${r1(y)} q8 -12 16 -4 q8 8 16 -2 q-4 14 -16 12 q-10 2 -16 -6z" fill="#2f6b3a" ${OL}/>`; }
    for (let i = 0; i < 3; i++) s += `<circle cx="${r1(28 + i * 22)}" cy="${r1(52 + rnd() * 12)}" r="9" fill="#d8f5a2" stroke="#2b8a3e" stroke-width="3"/>`;
    return s;
  };
  P.mushroom = (p) => {
    if (p.big) return `<rect x="42" y="50" width="16" height="32" rx="6" fill="#e9d8b6" ${OL}/><path d="M12 56 Q14 20 50 20 Q86 20 88 56 Q50 64 12 56Z" fill="${p.c}" ${OL}/><path d="M36 30 L64 50 M64 30 L36 50" stroke="#e9d8b6" stroke-width="4"/>`;
    return [[30, 1], [56, 0], [74, 1]].map(([x, lo]) => `<rect x="${x - 6}" y="${46 + lo * 6}" width="12" height="30" rx="5" fill="#f1e3c8" ${OL}/><path d="M${x - 16} ${50 + lo * 6} Q${x - 16} ${28 + lo * 6} ${x} ${28 + lo * 6} Q${x + 16} ${28 + lo * 6} ${x + 16} ${50 + lo * 6}Z" fill="${p.c}" ${OL}/>`).join('');
  };
  P.berry = (p, rnd) => `<path d="M50 88 Q16 60 18 38 Q22 22 50 26 Q78 22 82 38 Q84 60 50 88Z" fill="#f03e3e" ${OL}/>` + dots(rnd, 14, 50, 50, 22, 24, '#ffe066', 1.8) +
    `<path d="M30 28 L42 30 L50 16 L58 30 L70 28 L60 36 H40Z" fill="#2f9e44" ${OL}/>`;
  P.mikan = () => [[30, 58, -20], [52, 50, 0], [72, 60, 20]].map(([x, y, a]) => `<path d="M${x - 14} ${y} Q${x} ${y - 30} ${x + 14} ${y} Q${x} ${y + 10} ${x - 14} ${y}Z" fill="#ffa94d" ${OL} transform="rotate(${a} ${x} ${y})"/><path d="M${x - 6} ${y - 6} Q${x} ${y - 14} ${x + 6} ${y - 6}" stroke="#ffd8a8" stroke-width="2.5" fill="none" transform="rotate(${a} ${x} ${y})"/>`).join('');
  P.banana = () => `<path d="M12 36 Q44 88 88 34 Q90 52 54 70 Q26 74 12 36Z" fill="#ffe066" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/><path d="M88 34 l6 -6 l-2 10z" fill="#8b5a2b"/><path d="M20 44 Q46 74 80 46" stroke="#fff3bf" stroke-width="4" fill="none"/>`;
  P.pine = () => `<path d="M12 74 L50 18 L88 74 Z" fill="#ffe066" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/><path d="M28 56 H72 M36 44 H64 M20 66 H80" stroke="#fcc419" stroke-width="3"/><path d="M12 74 H88 L84 82 H16Z" fill="#e8a33c"/>`;
  P.cup = (p) => `<path d="M18 38 L82 38 L72 86 L28 86 Z" fill="${p.c}" ${OL}/><ellipse cx="50" cy="38" rx="32" ry="8" fill="${p.jelly ? '#ffd8a8' : '#f8f9fa'}" ${OL}/>` +
    (p.jelly ? '<path d="M38 60 Q50 46 62 60 Q50 66 38 60Z" fill="#ff922b"/>' : '<rect x="26" y="52" width="48" height="16" fill="#74c0fc" opacity=".8"/><circle cx="50" cy="60" r="5" fill="#fff"/>');
  P.daifuku = (p, rnd) => `<ellipse cx="50" cy="56" rx="36" ry="28" fill="#fbf7f0" ${OL}/><ellipse cx="42" cy="46" rx="12" ry="6" fill="#fff"/>` + dots(rnd, 10, 50, 56, 28, 20, '#ece4d6', 2);

  function piece(food, seed) {
    const fn = P[food.shape] || P.salad;
    return fn(food.p, rng(seed || hash(food.id)));
  }

  function icon(food, cls) {
    return `<svg class="${cls || 'food-ic'}" viewBox="0 0 100 100" aria-hidden="true">${piece(food)}</svg>`;
  }

  // ---- かざり ----
  const NORI = '#1e2b22';
  function trainPath(x, y, s) { // ひだりむき の でんしゃ（まど は くりぬき）
    const u = s / 100;
    const p = (px, py) => `${r1(x + px * u)} ${r1(y + py * u)}`;
    return `M${p(8, 30)} Q${p(8, 16)} ${p(24, 16)} L${p(86, 16)} Q${p(96, 16)} ${p(96, 26)} L${p(96, 70)} L${p(4, 70)} L${p(4, 44)} Z` +
      `M${p(14, 26)} L${p(28, 26)} L${p(28, 44)} L${p(12, 44)} Z M${p(36, 26)} L${p(52, 26)} L${p(52, 44)} L${p(36, 44)} Z M${p(60, 26)} L${p(76, 26)} L${p(76, 44)} L${p(60, 44)} Z`;
  }
  function starPath(cx, cy, R) {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? R * .45 : R; d += `${i ? 'L' : 'M'}${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r)}`; }
    return d + 'Z';
  }
  function heartPath(cx, cy, R) {
    return `M${r1(cx)} ${r1(cy + R * .8)} C${r1(cx - R * 1.4)} ${r1(cy - R * .1)} ${r1(cx - R * .6)} ${r1(cy - R * 1.1)} ${r1(cx)} ${r1(cy - R * .35)} C${r1(cx + R * .6)} ${r1(cy - R * 1.1)} ${r1(cx + R * 1.4)} ${r1(cy - R * .1)} ${r1(cx)} ${r1(cy + R * .8)}Z`;
  }
  // (cx,cy) を まんなか に、おおきさ s
  function deco(d, cx, cy, s) {
    if (d.kind === 'nori') {
      if (d.shape === 'train') return `<path d="${trainPath(cx - s / 2, cy - s * .45, s)}" fill="${NORI}" fill-rule="evenodd"/><circle cx="${r1(cx - s * .26)}" cy="${r1(cy + s * .3)}" r="${r1(s * .09)}" fill="${NORI}"/><circle cx="${r1(cx + s * .26)}" cy="${r1(cy + s * .3)}" r="${r1(s * .09)}" fill="${NORI}"/>`;
      if (d.shape === 'star') return `<path d="${starPath(cx, cy, s * .45)}" fill="${NORI}"/>`;
      if (d.shape === 'heart') return `<path d="${heartPath(cx, cy, s * .38)}" fill="${NORI}"/>`;
      return `<ellipse cx="${r1(cx - s * .18)}" cy="${r1(cy - s * .1)}" rx="${r1(s * .07)}" ry="${r1(s * .1)}" fill="${NORI}"/><ellipse cx="${r1(cx + s * .18)}" cy="${r1(cy - s * .1)}" rx="${r1(s * .07)}" ry="${r1(s * .1)}" fill="${NORI}"/><path d="M${r1(cx - s * .22)} ${r1(cy + s * .1)} Q${r1(cx)} ${r1(cy + s * .32)} ${r1(cx + s * .22)} ${r1(cy + s * .1)}" stroke="${NORI}" stroke-width="${r1(s * .07)}" fill="none" stroke-linecap="round"/>`;
    }
    // ピック: ぼう ＋ あたま
    const hx = cx + s * .18, hy = cy - s * .22;
    let head;
    if (d.shape === 'flag') head = `<path d="M${r1(hx)} ${r1(hy - s * .2)} L${r1(hx + s * .32)} ${r1(hy - s * .08)} L${r1(hx)} ${r1(hy + s * .05)}Z" fill="#fa5252" ${OL}/>`;
    else if (d.shape === 'heart') head = `<path d="${heartPath(hx, hy, s * .17)}" fill="#f783ac" ${OL}/>`;
    else if (d.shape === 'star') head = `<path d="${starPath(hx, hy, s * .2)}" fill="#fcc419" ${OL}/>`;
    else head = `<path d="${trainPath(hx - s * .2, hy - s * .14, s * .4)}" fill="#339af0" fill-rule="evenodd" ${OL}/>`;
    return `<path d="M${r1(cx - s * .2)} ${r1(cy + s * .28)} L${r1(hx)} ${r1(hy)}" stroke="#868e96" stroke-width="${r1(Math.max(3, s * .045))}" stroke-linecap="round"/>` + head;
  }
  function decoIcon(d) {
    return `<svg class="food-ic" viewBox="0 0 100 100" aria-hidden="true">${d.kind === 'nori' ? '<rect x="8" y="8" width="84" height="84" rx="18" fill="#fffdf6" stroke="#e6dcc6" stroke-width="2"/>' : ''}${deco(d, 50, 52, 80)}</svg>`;
  }

  // ---- おべんとうばこ ----
  const U = 100, PAD = 26;
  const CUPS = ['#ffdeeb', '#d3f9d8', '#fff3bf', '#d0ebff', '#f3d9fa', '#ffe8cc'];

  function slotInner(sl, food, i, uid) {
    const x = sl.x * U, y = sl.y * U, w = sl.w * U, h = sl.h * U;
    const rnd = rng(hash(food.id) + i * 17);
    let s = '';
    if (food.shape === 'rice') {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${food.p.top === 'maze' ? '#f3e3c3' : '#fffdf6'}"/>` + grains(rnd, Math.round(w * h / 150), x, y, w, h) + riceTop(food.p.top, rnd, x, y, w, h);
      return s;
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sl.main ? '#f8f1e0' : CUPS[i % CUPS.length]}"/>`;
    if (!sl.main) s += `<path d="M${x} ${y + 8} ${Array.from({ length: Math.ceil(w / 14) }, (_, k) => `l7 -6 l7 6`).join(' ')}" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
    const base = Math.min(w, h);
    let size = Math.max(64, Math.min(118, base * .92));
    const cols = Math.max(1, Math.round(w / (size * .82))), rows = Math.max(1, Math.round(h / (size * .82)));
    size = Math.min(w / cols, h / rows) * 1.12;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = x + (c + .5) * (w / cols) + (rnd() - .5) * 6, cy = y + (r + .5) * (h / rows) + (rnd() - .5) * 6;
      const a = Math.round((rnd() - .5) * 26);
      s += `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${a}) scale(${r1(size / 100 * 100) / 100}) translate(-50 -50)">${P[food.shape](food.p, rng(hash(food.id) + r * 7 + c * 13 + i))}</g>`;
    }
    return s;
  }

  function box(theme, slots, opt) {
    opt = opt || {};
    const uid = opt.uid || 'b';
    const W = theme.box.w * U, H = theme.box.h * U;
    let s = `<defs>`;
    theme.slots.forEach((sl, i) => {
      s += `<clipPath id="${uid}c${i}"><rect x="${sl.x * U + 3}" y="${sl.y * U + 3}" width="${sl.w * U - 6}" height="${sl.h * U - 6}" rx="16"/></clipPath>`;
    });
    s += `</defs>`;
    const b = theme.box;
    s += `<rect x="${-PAD + 6}" y="${-PAD + 12}" width="${W + PAD * 2}" height="${H + PAD * 2}" rx="${b.r + 10}" fill="rgba(0,0,0,.12)"/>`;
    s += `<rect x="${-PAD}" y="${-PAD}" width="${W + PAD * 2}" height="${H + PAD * 2}" rx="${b.r + 10}" fill="${b.edge}" stroke="${b.line}" stroke-width="5"/>`;
    if (b.wood) for (let i = 1; i < 6; i++) s += `<path d="M${-PAD + 10} ${-PAD + i * (H + PAD * 2) / 6} q${(W + PAD * 2) / 2} 10 ${W + PAD * 2 - 20} 0" stroke="${b.line}" stroke-width="2" fill="none" opacity=".25"/>`;
    s += `<rect x="-6" y="-6" width="${W + 12}" height="${H + 12}" rx="${b.r}" fill="${b.floor}"/>`;
    theme.slots.forEach((sl, i) => {
      const x = sl.x * U + 3, y = sl.y * U + 3, w = sl.w * U - 6, h = sl.h * U - 6;
      const st = slots[i] || {};
      const food = st.food && FOOD[st.food];
      const cls = ['slot', sl.main ? 'is-main' : 'is-side', food ? 'is-filled' : 'is-empty'];
      if (opt.target != null && opt.target.includes(i)) cls.push('is-target');
      s += `<g class="${cls.join(' ')}" data-slot="${i}">`;
      if (food) {
        s += `<g class="slot-food" clip-path="url(#${uid}c${i})">${slotInner(sl, food, i, uid)}</g>`;
        if (st.deco && DECO[st.deco]) s += `<g class="slot-deco">${deco(DECO[st.deco], x + w / 2, y + h / 2, Math.min(w, h) * .62)}</g>`;
        s += `<rect class="slot-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="transparent" stroke="${b.line}" stroke-opacity=".25" stroke-width="3"/>`;
      } else {
        s += `<rect class="slot-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${sl.main ? '#fffaf0' : '#fffdf8'}" stroke="${b.line}" stroke-opacity=".55" stroke-width="4" stroke-dasharray="12 9"/>`;
        if (!opt.mini) s += `<text x="${x + w / 2}" y="${y + h / 2 + 12}" text-anchor="middle" class="slot-label" font-size="${sl.main ? 34 : 28}">${sl.main ? 'ごはん' : 'おかず'}</text>`;
      }
      s += '</g>';
    });
    return { viewBox: `${-PAD - 2} ${-PAD - 2} ${W + PAD * 2 + 12} ${H + PAD * 2 + 18}`, svg: s, W, H, PAD };
  }

  function lid(theme) {
    const b = theme.box, W = b.w * U, H = b.h * U;
    return `<rect x="${-PAD - 4}" y="${-PAD - 4}" width="${W + PAD * 2 + 8}" height="${H + PAD * 2 + 8}" rx="${b.r + 14}" fill="${b.lid}" stroke="${b.line}" stroke-width="5"/>` +
      `<rect x="${-PAD + 14}" y="${-PAD + 14}" width="${W + PAD * 2 - 28}" height="${H + PAD * 2 - 28}" rx="${b.r + 4}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5"/>` +
      `<rect x="${W / 2 - 34}" y="${-PAD - 4}" width="68" height="${H + PAD * 2 + 8}" fill="${b.band}" opacity=".9"/>` +
      `<text x="${W / 2}" y="${H / 2 + 16}" text-anchor="middle" font-size="64">${theme.emoji}</text>`;
  }

  return { piece, icon, deco, decoIcon, box, lid, hash, U };
})();
