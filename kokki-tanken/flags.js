"use strict";
/* ============================================================
   こっきたんけん：国旗の え（SVG を その場で 組み立てる）

   FLAGS[id] = { vb: "0 0 W H", draw(u) → SVG の中身の文字列 }
     id は ISO 3166-1 の 数字コード（countries.js と おなじ）
     u  は 1まいごとに ちがう 文字列。clipPath の id が ぶつからないように つかう
   たてよこの 比は できるだけ ほんものに あわせている。
   こまかい もんしょう（メキシコ・エジプト など）は かんたんな え に している。
   ============================================================ */

/** 星形の polygon の points（n 本の とげ、rot は 1本目の とげの 向き[度]） */
function starPts(cx, cy, r, n = 5, inner = 0.382, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = (rot + i * 180 / n) * Math.PI / 180;
    pts.push((cx + rr * Math.cos(a)).toFixed(2) + "," + (cy + rr * Math.sin(a)).toFixed(2));
  }
  return pts.join(" ");
}
const star = (cx, cy, r, fill, n, inner, rot) =>
  `<polygon points="${starPts(cx, cy, r, n, inner, rot)}" fill="${fill}"/>`;

/** よこじま（上から）・たてじま（左から） */
const hStripes = (w, h, colors) => colors.map((c, i) =>
  `<rect x="0" y="${(h / colors.length) * i}" width="${w}" height="${h / colors.length + 0.05}" fill="${c}"/>`).join("");
const vStripes = (w, h, colors) => colors.map((c, i) =>
  `<rect x="${(w / colors.length) * i}" y="0" width="${w / colors.length + 0.05}" height="${h}" fill="${c}"/>`).join("");

/** ユニオンジャック（60×30 の 座標で えがく） */
function unionJack(u) {
  return `<clipPath id="uj-t${u}"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>` +
    `<rect width="60" height="30" fill="#012169"/>` +
    `<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>` +
    `<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uj-t${u})" stroke="#C8102E" stroke-width="4"/>` +
    `<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>` +
    `<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>`;
}

/** たいようの 光（アルゼンチン・ウルグアイ・フィリピン） */
function sun(cx, cy, r, rays, fill, rayLen = 1.9) {
  let s = "";
  for (let i = 0; i < rays; i++) {
    const a = (i * 360 / rays - 90) * Math.PI / 180, b = 0.22;
    const p = (rr, d) => (cx + rr * Math.cos(a + d)).toFixed(2) + "," + (cy + rr * Math.sin(a + d)).toFixed(2);
    s += `<polygon points="${p(r * 0.9, -b)} ${p(r * rayLen, 0)} ${p(r * 0.9, b)}" fill="${fill}"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}

/** かんこくの 卦（け）。bars は 内がわから 3本ぶん（true=つながった線） */
function trigram(cx, cy, angle, bars) {
  let s = `<g transform="translate(${cx} ${cy}) rotate(${angle})" fill="#000">`;
  bars.forEach((solid, i) => {
    const x = -1.5 + i * 1.125;
    s += solid ? `<rect x="${x}" y="-2.5" width="0.75" height="5"/>`
      : `<rect x="${x}" y="-2.5" width="0.75" height="2.3"/><rect x="${x}" y="0.2" width="0.75" height="2.3"/>`;
  });
  return s + "</g>";
}

const FLAGS = {
  /* ------------------------------ アジア ------------------------------ */
  392: { vb: "0 0 30 20", draw: () => `<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>` },
  410: { vb: "0 0 30 20", draw: () => {
    const a = Math.atan2(2, 3) * 180 / Math.PI, d = 8.6, c = Math.cos(a * Math.PI / 180) * d, s = Math.sin(a * Math.PI / 180) * d;
    return `<rect width="30" height="20" fill="#fff"/>` +
      `<g transform="translate(15 10) rotate(${a})">` +
      `<path d="M-5,0 A5,5 0 0 1 5,0 Z" fill="#CD2E3A"/><path d="M-5,0 A5,5 0 0 0 5,0 Z" fill="#0047A0"/>` +
      `<circle cx="-2.5" cy="0" r="2.5" fill="#0047A0"/><circle cx="2.5" cy="0" r="2.5" fill="#CD2E3A"/></g>` +
      trigram(15 - c, 10 - s, a, [1, 1, 1]) + trigram(15 + c, 10 + s, a, [0, 0, 0]) +
      trigram(15 + c, 10 - s, -a, [0, 1, 0]) + trigram(15 - c, 10 + s, -a, [1, 0, 1]);
  } },
  156: { vb: "0 0 30 20", draw: () => {
    let s = `<rect width="30" height="20" fill="#EE1C25"/>` + star(5, 5, 3, "#FFFF00");
    for (const [x, y] of [[10, 2], [12, 4], [12, 7], [10, 9]])
      s += star(x, y, 1, "#FFFF00", 5, 0.382, Math.atan2(5 - y, 5 - x) * 180 / Math.PI);
    return s;
  } },
  356: { vb: "0 0 30 20", draw: () => {
    let s = hStripes(30, 20, ["#FF9933", "#fff", "#138808"]) +
      `<circle cx="15" cy="10" r="2.9" fill="none" stroke="#000080" stroke-width="0.4"/><circle cx="15" cy="10" r="0.5" fill="#000080"/>`;
    for (let i = 0; i < 24; i++) {
      const a = i * 15 * Math.PI / 180;
      s += `<line x1="15" y1="10" x2="${(15 + 2.8 * Math.cos(a)).toFixed(2)}" y2="${(10 + 2.8 * Math.sin(a)).toFixed(2)}" stroke="#000080" stroke-width="0.15"/>`;
    }
    return s;
  } },
  764: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#A51931", "#F4F5F8", "#2D2A4A", "#2D2A4A", "#F4F5F8", "#A51931"]) },
  704: { vb: "0 0 30 20", draw: () => `<rect width="30" height="20" fill="#DA251D"/>` + star(15, 10.6, 6, "#FFFF00") },
  360: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#CE1126", "#fff"]) },
  608: { vb: "0 0 40 20", draw: () =>
    `<rect width="40" height="10" fill="#0038A8"/><rect y="10" width="40" height="10" fill="#CE1126"/>` +
    `<polygon points="0,0 17.32,10 0,20" fill="#fff"/>` + sun(6.2, 10, 1.6, 8, "#FCD116", 2.1) +
    star(1.9, 2.4, 1, "#FCD116") + star(1.9, 17.6, 1, "#FCD116") + star(14.8, 10, 1, "#FCD116") },
  496: { vb: "0 0 30 15", draw: () => vStripes(30, 15, ["#C4272F", "#015197", "#C4272F"]) +
    // ソヨンボ（かんたんな え）
    `<g fill="#F9CF02"><polygon points="5,1.6 5.6,3 4.4,3"/><circle cx="5" cy="4.2" r="0.9"/>` +
    `<path d="M3.8,5.3 A1.2,1.2 0 0 0 6.2,5.3 A1.2,0.7 0 0 1 3.8,5.3 Z"/>` +
    `<polygon points="3.8,6.4 6.2,6.4 5,7.2"/><rect x="3.8" y="7.5" width="2.4" height="0.45"/>` +
    `<circle cx="5" cy="9.4" r="1.15"/><rect x="3.8" y="10.9" width="2.4" height="0.45"/>` +
    `<polygon points="3.8,11.6 6.2,11.6 5,12.4"/><rect x="2.9" y="7.5" width="0.5" height="4.9"/><rect x="6.6" y="7.5" width="0.5" height="4.9"/></g>` },
  792: { vb: "0 0 30 20", draw: () => `<rect width="30" height="20" fill="#E30A17"/>` +
    `<circle cx="11.25" cy="10" r="5" fill="#fff"/><circle cx="12.5" cy="10" r="4" fill="#E30A17"/>` +
    star(17.1, 10, 2.5, "#fff", 5, 0.382, 180) },
  50: { vb: "0 0 30 18", draw: () => `<rect width="30" height="18" fill="#006A4E"/><circle cx="13.5" cy="9" r="6" fill="#F42A41"/>` },
  524: { vb: "-1 -1 21 26", draw: () =>
    `<polygon points="0,0 17,11 6.5,11 18,24 0,24" fill="#DC143C" stroke="#003893" stroke-width="1.3" stroke-linejoin="miter"/>` +
    `<path d="M2.2,7.2 A2.6,2.6 0 0 0 7.4,7.2 A2.6,1.6 0 0 1 2.2,7.2 Z" fill="#fff"/>` +
    star(4.8, 5.7, 1.1, "#fff", 8, 0.55) + star(5.6, 18.2, 2.6, "#fff", 12, 0.6) },

  /* ----------------------------- ヨーロッパ ----------------------------- */
  826: { vb: "0 0 60 30", draw: (u) => unionJack(u) },
  250: { vb: "0 0 30 20", draw: () => vStripes(30, 20, ["#0055A4", "#fff", "#EF4135"]) },
  276: { vb: "0 0 25 15", draw: () => hStripes(25, 15, ["#000", "#DD0000", "#FFCE00"]) },
  380: { vb: "0 0 30 20", draw: () => vStripes(30, 20, ["#009246", "#fff", "#CE2B37"]) },
  724: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#AA151B", "#F1BF00", "#F1BF00", "#AA151B"]) },
  528: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#AE1C28", "#fff", "#21468B"]) },
  756: { vb: "0 0 20 20", draw: () => `<rect width="20" height="20" fill="#DA291C"/>` +
    `<rect x="8.1" y="3.75" width="3.8" height="12.5" fill="#fff"/><rect x="3.75" y="8.1" width="12.5" height="3.8" fill="#fff"/>` },
  752: { vb: "0 0 16 10", draw: () => `<rect width="16" height="10" fill="#006AA7"/>` +
    `<rect x="5" width="2" height="10" fill="#FECC00"/><rect y="4" width="16" height="2" fill="#FECC00"/>` },
  578: { vb: "0 0 22 16", draw: () => `<rect width="22" height="16" fill="#BA0C2F"/>` +
    `<rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="22" height="4" fill="#fff"/>` +
    `<rect x="7" width="2" height="16" fill="#00205B"/><rect y="7" width="22" height="2" fill="#00205B"/>` },
  208: { vb: "0 0 37 28", draw: () => `<rect width="37" height="28" fill="#C8102E"/>` +
    `<rect x="12" width="4" height="28" fill="#fff"/><rect y="12" width="37" height="4" fill="#fff"/>` },
  246: { vb: "0 0 18 11", draw: () => `<rect width="18" height="11" fill="#fff"/>` +
    `<rect x="5" width="3" height="11" fill="#002F6C"/><rect y="4" width="18" height="3" fill="#002F6C"/>` },
  300: { vb: "0 0 27 18", draw: () => {
    let s = "";
    for (let i = 0; i < 9; i++) s += `<rect y="${i * 2}" width="27" height="2.05" fill="${i % 2 ? "#fff" : "#0D5EAF"}"/>`;
    return s + `<rect width="10" height="10" fill="#0D5EAF"/><rect x="4" width="2" height="10" fill="#fff"/><rect y="4" width="10" height="2" fill="#fff"/>`;
  } },
  643: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#fff", "#0039A6", "#D52B1E"]) },

  /* ------------------------------ アフリカ ------------------------------ */
  818: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#CE1126", "#fff", "#000"]) +
    // サラディンの わし（かんたんな え）
    `<g fill="#C09300"><path d="M15,7.2 C13.4,7.6 11.8,8.6 11.2,10.6 C12.3,10.2 13.3,10.4 13.8,11.2 L13.8,12.6 L16.2,12.6 L16.2,11.2 C16.7,10.4 17.7,10.2 18.8,10.6 C18.2,8.6 16.6,7.6 15,7.2 Z"/>` +
    `<circle cx="15" cy="7.4" r="0.9"/><rect x="13.4" y="12.7" width="3.2" height="0.6"/></g>` },
  288: { vb: "0 0 30 20", draw: () => hStripes(30, 20, ["#CE1126", "#FCD116", "#006B3F"]) + star(15, 10.4, 3.3, "#000") },
  566: { vb: "0 0 30 15", draw: () => vStripes(30, 15, ["#008751", "#fff", "#008751"]) },
  710: { vb: "0 0 600 400", draw: () =>
    `<rect width="600" height="200" fill="#E03C31"/><rect y="200" width="600" height="200" fill="#001489"/>` +
    `<path d="M0,0 L225,200 L600,200 M0,400 L225,200" fill="none" stroke="#fff" stroke-width="133"/>` +
    `<path d="M0,0 L225,200 L600,200 M0,400 L225,200" fill="none" stroke="#007749" stroke-width="80"/>` +
    `<polygon points="0,62 0,338 155,200" fill="#FFB81C"/><polygon points="0,105 0,295 107,200" fill="#000"/>` },
  231: { vb: "0 0 30 15", draw: () => {
    let s = hStripes(30, 15, ["#078930", "#FCDD09", "#DA121A"]) + `<circle cx="15" cy="7.5" r="4.4" fill="#0F47AF"/>`;
    const p = []; for (let i = 0; i < 5; i++) { const a = (-90 + i * 144) * Math.PI / 180; p.push((15 + 3 * Math.cos(a)).toFixed(2) + "," + (7.6 + 3 * Math.sin(a)).toFixed(2)); }
    s += `<polygon points="${p.join(" ")}" fill="none" stroke="#FCDD09" stroke-width="0.45" stroke-linejoin="round"/>`;
    for (let i = 0; i < 5; i++) {
      const a = (-54 + i * 72) * Math.PI / 180;
      s += `<line x1="${(15 + 1.4 * Math.cos(a)).toFixed(2)}" y1="${(7.6 + 1.4 * Math.sin(a)).toFixed(2)}" x2="${(15 + 3.7 * Math.cos(a)).toFixed(2)}" y2="${(7.6 + 3.7 * Math.sin(a)).toFixed(2)}" stroke="#FCDD09" stroke-width="0.35"/>`;
    }
    return s;
  } },
  504: { vb: "0 0 30 20", draw: () => {
    const p = []; for (let i = 0; i < 5; i++) { const a = (-90 + i * 144) * Math.PI / 180; p.push((15 + 4.6 * Math.cos(a)).toFixed(2) + "," + (10.6 + 4.6 * Math.sin(a)).toFixed(2)); }
    return `<rect width="30" height="20" fill="#C1272D"/><polygon points="${p.join(" ")}" fill="none" stroke="#006233" stroke-width="0.8" stroke-linejoin="miter"/>`;
  } },
  834: { vb: "0 0 30 20", draw: () => `<rect width="30" height="20" fill="#00A3DD"/><polygon points="0,0 30,0 0,20" fill="#1EB53A"/>` +
    `<line x1="-2" y1="21.33" x2="32" y2="-1.33" stroke="#FCD116" stroke-width="7.2"/><line x1="-2" y1="21.33" x2="32" y2="-1.33" stroke="#000" stroke-width="5"/>` },
  450: { vb: "0 0 30 20", draw: () => `<rect width="30" height="10" fill="#FC3D32"/><rect y="10" width="30" height="10" fill="#007E3A"/><rect width="10" height="20" fill="#fff"/>` },
  180: { vb: "0 0 30 22.5", draw: () => `<rect width="30" height="22.5" fill="#007FFF"/>` +
    `<line x1="-2" y1="24" x2="32" y2="-1.5" stroke="#F7D618" stroke-width="7"/><line x1="-2" y1="24" x2="32" y2="-1.5" stroke="#CE1021" stroke-width="5"/>` +
    star(5.4, 5, 3.6, "#F7D618") },

  /* ---------------------------- きたアメリカ ---------------------------- */
  840: { vb: "0 0 190 100", draw: () => {
    let s = "";
    for (let i = 0; i < 13; i++) s += `<rect y="${(i * 100 / 13).toFixed(3)}" width="190" height="${(100 / 13 + 0.1).toFixed(3)}" fill="${i % 2 ? "#fff" : "#B22234"}"/>`;
    s += `<rect width="76" height="53.85" fill="#3C3B6E"/>`;
    for (let r = 0; r < 9; r++) {
      const n = r % 2 ? 5 : 6;
      for (let j = 0; j < n; j++) s += star(6.33 * (r % 2 ? 2 * j + 2 : 2 * j + 1), 5.385 * (r + 1), 3.08, "#fff");
    }
    return s;
  } },
  124: { vb: "0 0 40 20", draw: () => `<rect width="40" height="20" fill="#fff"/><rect width="10" height="20" fill="#D52B1E"/><rect x="30" width="10" height="20" fill="#D52B1E"/>` +
    `<path transform="translate(20 10.3)" fill="#D52B1E" d="M0,-7 L1.2,-4.6 L2.6,-5.3 L1.9,-1.4 L4.2,-3.9 L4.7,-2.7 L7,-3.2 L6.1,-0.7 L7.1,-0.2 L3.8,2.6 L4.3,3.8 L0.4,3.4 L0.6,6.6 L-0.6,6.6 L-0.4,3.4 L-4.3,3.8 L-3.8,2.6 L-7.1,-0.2 L-6.1,-0.7 L-7,-3.2 L-4.7,-2.7 L-4.2,-3.9 L-1.9,-1.4 L-2.6,-5.3 L-1.2,-4.6 Z"/>` },
  484: { vb: "0 0 28 16", draw: () => vStripes(28, 16, ["#006847", "#fff", "#CE1126"]) +
    // わしと サボテン（かんたんな え）
    `<path d="M11.2,9.6 Q14,13.6 16.8,9.6" fill="none" stroke="#2E7D32" stroke-width="0.7"/>` +
    `<rect x="13.3" y="8.6" width="1.4" height="2.4" rx="0.6" fill="#4C8C2B"/>` +
    `<path d="M12.6,8.8 C12.4,6.6 13.6,5.4 15.2,5.6 C16.2,5.7 16.4,6.6 15.8,7.2 C16.6,7.6 16.2,8.8 15.2,8.8 Z" fill="#8C5A2B"/>` +
    `<circle cx="15.1" cy="5.9" r="0.7" fill="#6B4220"/>` },
  192: { vb: "0 0 30 15", draw: () => {
    let s = ""; for (let i = 0; i < 5; i++) s += `<rect y="${i * 3}" width="30" height="3.05" fill="${i % 2 ? "#fff" : "#002A8F"}"/>`;
    return s + `<polygon points="0,0 13,7.5 0,15" fill="#CF142B"/>` + star(4.4, 7.5, 2.6, "#fff");
  } },
  591: { vb: "0 0 30 20", draw: () => `<rect width="30" height="20" fill="#fff"/><rect x="15" width="15" height="10" fill="#DA121A"/><rect y="10" width="15" height="10" fill="#072357"/>` +
    star(7.5, 5, 2.4, "#072357") + star(22.5, 15, 2.4, "#DA121A") },

  /* ---------------------------- みなみアメリカ ---------------------------- */
  76: { vb: "0 0 30 21", draw: (u) => `<rect width="30" height="21" fill="#009C3B"/><polygon points="15,1.7 28.3,10.5 15,19.3 1.7,10.5" fill="#FFDF00"/>` +
    `<clipPath id="br${u}"><circle cx="15" cy="10.5" r="5.25"/></clipPath><circle cx="15" cy="10.5" r="5.25" fill="#002776"/>` +
    `<path clip-path="url(#br${u})" d="M9.5,9.4 Q15,7.6 20.6,11.6" fill="none" stroke="#fff" stroke-width="0.9"/>` +
    [[12, 12], [14, 13.4], [16.5, 12.6], [17.4, 14.4], [13, 14.8], [15.4, 15.2], [11.2, 10.4], [18.6, 13.2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.25" fill="#fff"/>`).join("") },
  32: { vb: "0 0 30 19", draw: () => hStripes(30, 19, ["#74ACDF", "#fff", "#74ACDF"]) + sun(15, 9.5, 1.3, 16, "#F6B40E", 2.1) },
  152: { vb: "0 0 30 20", draw: () => `<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#D52B1E"/><rect width="10" height="10" fill="#0039A6"/>` + star(5, 5.2, 2.5, "#fff") },
  604: { vb: "0 0 30 20", draw: () => vStripes(30, 20, ["#D91023", "#fff", "#D91023"]) },
  170: { vb: "0 0 30 20", draw: () => `<rect width="30" height="10" fill="#FCD116"/><rect y="10" width="30" height="5" fill="#003893"/><rect y="15" width="30" height="5" fill="#CE1126"/>` },
  858: { vb: "0 0 27 18", draw: () => {
    let s = ""; for (let i = 0; i < 9; i++) s += `<rect y="${i * 2}" width="27" height="2.05" fill="${i % 2 ? "#0038A8" : "#fff"}"/>`;
    return s + `<rect width="10" height="10" fill="#fff"/>` + sun(5, 5, 1.6, 16, "#FCD116", 2.3);
  } },

  /* ------------------------------ オセアニア ------------------------------ */
  36: { vb: "0 0 60 30", draw: (u) => `<rect width="60" height="30" fill="#012169"/><g transform="scale(0.5)">${unionJack(u)}</g>` +
    star(15, 22.5, 4.2, "#fff", 7, 0.45) + star(45, 25.3, 2.1, "#fff", 7, 0.45) + star(38.6, 13.4, 2.1, "#fff", 7, 0.45) +
    star(45, 5.3, 2.1, "#fff", 7, 0.45) + star(51.4, 11.7, 2.1, "#fff", 7, 0.45) + star(47.9, 15.6, 1.2, "#fff") },
  554: { vb: "0 0 60 30", draw: (u) => `<rect width="60" height="30" fill="#012169"/><g transform="scale(0.5)">${unionJack(u)}</g>` +
    [[45, 24.5, 2.4], [39.6, 13.6, 2], [45, 6.3, 2], [50.6, 12.2, 1.7]].map(([x, y, r]) =>
      star(x, y, r + 0.55, "#fff") + star(x, y, r, "#C8102E")).join("") },
};

let flagSerial = 0;
/** 国旗の <svg> を 文字列で かえす */
function flagSVG(id, cls = "flag") {
  const f = FLAGS[id];
  const u = "f" + (flagSerial++);
  const [x, y, w, h] = f.vb.split(" ");
  return `<svg class="${cls}" viewBox="${f.vb}" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">` +
    `<clipPath id="c${u}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#c${u})">${f.draw(u)}</g></svg>`;
}
