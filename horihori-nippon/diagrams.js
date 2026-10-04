"use strict";
/* ============================================================
   ほりほり にっぽん：ちけいの え（だんめん図・みおろし図）
   DIAGRAMS[key]() → viewBox 0 0 320 180 の SVG の中身
   ============================================================ */

const C = {
  sky: "#d9eefb", mt: "#8db86b", mt2: "#6e9655", snow: "#fff",
  soil: "#c99c62", soil2: "#a87b45", rock: "#9a9a9a",
  water: "#5aa9e6", sea: "#3f8fd6", sea2: "#2f74b5", sand: "#ecd28f",
  field: "#b9d86e", paddy: "#8fcf6a", ink: "#2c3a55", red: "#e2574c",
};

const lab = (x, y, t, size = 13, fill = C.ink, anchor = "middle") =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${fill}" stroke="${fill === "#fff" ? "#2c3a55" : "#fff"}" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
const sky = (h = 180) => `<rect width="320" height="${h}" fill="${C.sky}"/>`;
const sunAt = (x, y, r = 14) => {
  let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffc531"/>`;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    s += `<line x1="${x + Math.cos(a) * (r + 4)}" y1="${y + Math.sin(a) * (r + 4)}" x2="${x + Math.cos(a) * (r + 10)}" y2="${y + Math.sin(a) * (r + 10)}" stroke="#ffc531" stroke-width="3" stroke-linecap="round"/>`;
  }
  return s;
};
const moonAt = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f5d76e"/><circle cx="${x + 5}" cy="${y - 4}" r="${r}" fill="#2c3a6b"/>`;
const tree = (x, y, fruit, r = 9) => `<rect x="${x - 1.5}" y="${y}" width="3" height="${r}" fill="#7a5230"/><circle cx="${x}" cy="${y - 2}" r="${r}" fill="#5d9e45"/>` +
  (fruit ? `<circle cx="${x - 4}" cy="${y - 4}" r="2.6" fill="${fruit}"/><circle cx="${x + 3}" cy="${y - 1}" r="2.6" fill="${fruit}"/><circle cx="${x + 1}" cy="${y - 7}" r="2.6" fill="${fruit}"/>` : "");
const arrow = (x1, y1, x2, y2, col = C.ink, w = 3) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - Math.cos(a) * 3}" y2="${y2 - Math.sin(a) * 3}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)} ${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}" fill="${col}"/>`;
};
const house = (x, y, s = 1, roof = "#c0503f") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-7" y="-8" width="14" height="10" fill="#fff6e0" stroke="#7a5230" stroke-width="1"/><polygon points="-9,-8 0,-15 9,-8" fill="${roof}"/></g>`;
const cow = (x, y) => `<g transform="translate(${x} ${y})"><ellipse rx="8" ry="5" fill="#b4542f"/><circle cx="8" cy="-3" r="3.5" fill="#b4542f"/><rect x="-6" y="3" width="2" height="5" fill="#7a3a20"/><rect x="4" y="3" width="2" height="5" fill="#7a3a20"/></g>`;
const thermo = (x, y, hot) => `<rect x="${x - 4}" y="${y - 26}" width="8" height="28" rx="4" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>` +
  `<circle cx="${x}" cy="${y + 4}" r="6" fill="${hot ? C.red : C.water}" stroke="${C.ink}" stroke-width="1.5"/><rect x="${x - 2}" y="${hot ? y - 20 : y - 6}" width="4" height="${hot ? 22 : 8}" fill="${hot ? C.red : C.water}"/>`;
const pebbles = (pts) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#b9a68a" stroke="#8c7a5e" stroke-width=".8"/>`).join("");
const waves = (y, x0 = 0, x1 = 320, col = "#fff") => {
  let s = ""; for (let x = x0 + 8; x < x1; x += 34) s += `<path d="M${x},${y} q6,-5 12,0 t12,0" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
  return s;
};

const DIAGRAMS = {
  /* おうぎの かたち（ななめから みた図） */
  senjouchi: () => sky() +
    `<polygon points="0,20 40,8 75,30 110,12 160,40 200,22 250,45 320,30 320,95 0,95" fill="${C.mt2}"/>` +
    `<polygon points="0,95 320,95 320,180 0,180" fill="${C.paddy}"/>` +
    `<path d="M150,62 L148,95 Q100,170 30,180 L290,180 Q200,170 155,95 Z" fill="${C.soil}"/>` +
    pebbles([[150, 100, 3], [140, 118, 3.5], [165, 120, 3], [120, 140, 3], [190, 142, 3.5], [100, 160, 3], [215, 162, 3], [152, 150, 2.5], [170, 165, 2.5]]) +
    `<path d="M150,40 Q152,60 150,95 Q148,120 135,150 Q128,165 118,180" fill="none" stroke="${C.water}" stroke-width="4" stroke-dasharray="7 5"/>` +
    tree(108, 158, "#f59ab0") + tree(128, 168, "#f59ab0") + tree(190, 160, "#7d4ca0") + tree(214, 172, "#7d4ca0") + tree(170, 138, "#f59ab0", 7) +
    lab(160, 30, "やま", 13, "#fff") + lab(250, 120, "おうぎの かたち") + lab(60, 132, "みずが") + lab(60, 148, "しみこむ") + arrow(76, 150, 100, 165, C.water),

  /* やまに かこまれた ひくい ところ（だんめん） */
  bonchi: () => `<rect width="320" height="180" fill="${C.sky}"/><rect width="160" height="180" fill="#2c3a6b" opacity=".85"/>` +
    sunAt(240, 28) + moonAt(70, 28) +
    `<polygon points="0,60 30,40 70,70 110,130 210,130 250,70 290,42 320,60 320,180 0,180" fill="${C.mt}"/>` +
    `<polygon points="110,130 210,130 230,180 90,180" fill="${C.soil}"/>` +
    tree(130, 120, "#e8364f") + tree(150, 122, "#e8364f") + tree(172, 120, "#e8364f") + tree(192, 122, "#e8364f") +
    lab(70, 62, "よるは ひえる", 13, "#fff") + lab(250, 62, "ひるは あつい") + lab(160, 166, "ぼんち") + lab(30, 100, "やま", 12) + lab(290, 100, "やま", 12),

  /* たかい ところの たいらな はたけ */
  kougen: () => sky() + sunAt(290, 28) +
    `<polygon points="0,150 60,150 120,70 300,62 320,64 320,180 0,180" fill="${C.mt}"/>` +
    `<polygon points="120,70 300,62 300,72 120,80" fill="#cbe39a"/>` +
    [140, 165, 190, 215, 240, 265, 288].map((x) => `<circle cx="${x}" cy="66" r="5" fill="#9bd15a" stroke="#5d9e45"/>`).join("") +
    house(25, 150) + house(45, 152) + thermo(60, 120, true) + thermo(210, 40, false) +
    lab(60, 84, "あつい", 12) + lab(240, 30, "すずしい") + arrow(100, 160, 100, 82, C.ink, 2.5) + lab(108, 128, "たかい", 12, C.ink, "start") + lab(210, 98, "レタスばたけ", 12),

  /* いちだん たかい だいち（だんめん） */
  daichi: () => sky() +
    `<polygon points="0,150 70,150 90,70 320,70 320,180 0,180" fill="#e9e2d0"/>` +
    [92, 108, 124, 140].map((y) => `<line x1="${90 + (150 - y) * 0.25}" y1="${y}" x2="320" y2="${y}" stroke="#cfc6ae" stroke-width="2"/>`).join("") +
    `<polygon points="90,70 320,70 320,78 88,78" fill="${C.field}"/>` +
    [110, 140, 170, 200, 230, 260, 290].map((x) => `<ellipse cx="${x}" cy="72" rx="7" ry="4" fill="#5d9e45"/>`).join("") +
    `<rect x="0" y="150" width="70" height="30" fill="${C.paddy}"/><path d="M0,162 Q35,158 70,164" stroke="${C.water}" stroke-width="5" fill="none"/>` +
    arrow(170, 92, 170, 140, C.water) + arrow(240, 92, 240, 140, C.water) +
    lab(205, 165, "みずが すぐ しみこむ") + lab(205, 58, "たいらで たかい") + lab(4, 140, "ひくい ところ", 11, C.ink, "start"),

  /* かわが つくった ひろい へいや */
  heiya: () => sky() +
    `<polygon points="0,90 30,40 55,60 85,30 120,70 140,90" fill="${C.mt2}"/>` +
    `<polygon points="22,55 30,40 38,52" fill="${C.snow}"/><polygon points="76,42 85,30 94,44" fill="${C.snow}"/>` +
    `<rect y="90" width="320" height="90" fill="${C.paddy}"/><rect x="270" y="90" width="50" height="90" fill="${C.sea}"/>` +
    [0, 1, 2, 3].map((i) => `<line x1="${120 + i * 40}" y1="95" x2="${100 + i * 40}" y2="180" stroke="#6fb54f" stroke-width="1.5"/>`).join("") +
    `<path d="M80,60 Q90,100 130,115 Q190,135 200,150 Q215,165 272,160" fill="none" stroke="${C.water}" stroke-width="7"/>` +
    lab(85, 22, "ゆきどけみず", 12) + arrow(85, 28, 85, 50, C.water, 2.5) + lab(175, 106, "たんぼ") + lab(295, 130, "うみ", 12, "#fff"),

  /* ギザギザの いりえ（みおろし） */
  rias: () => `<rect width="320" height="180" fill="${C.sea}"/>` +
    `<path d="M0,0 L320,0 L320,60 L295,62 L285,120 L270,64 L245,70 L238,135 L222,72 L195,75 L180,128 L170,78 L140,80 L128,140 L116,82 L90,85 L78,118 L68,88 L40,90 L30,128 L20,90 L0,92 Z" fill="${C.mt}"/>` +
    `<path d="M0,0 L320,0 L320,40 L0,50Z" fill="${C.mt2}"/>` +
    [[278, 98], [231, 108], [176, 106], [124, 112], [74, 104]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 3}" width="12" height="7" fill="#a0784a" stroke="#6b4a26"/>`).join("") +
    waves(160, 0, 320) + lab(160, 26, "やま", 13, "#fff") + lab(250, 174, "そとは なみが たかい", 11, "#fff") + lab(60, 150, "いりえは しずか", 12) + lab(178, 145, "ようしょくの いかだ", 11),

  /* しおが ひくと あらわれる どろの はま（だんめん） */
  higata: () => sky() +
    `<rect y="50" width="320" height="130" fill="${C.water}" opacity=".35"/>` +
    `<line x1="0" y1="50" x2="320" y2="50" stroke="${C.sea2}" stroke-width="2" stroke-dasharray="6 4"/>` +
    `<polygon points="0,110 210,122 320,128 320,180 0,180" fill="#7d6a52"/>` +
    `<polygon points="200,122 320,128 320,180 200,180" fill="${C.sea}" opacity=".85"/>` +
    [30, 70, 110, 150].map((x) => `<line x1="${x}" y1="80" x2="${x}" y2="${112 + x * 0.06}" stroke="#6b4a26" stroke-width="2.5"/>`).join("") +
    `<path d="M30,92 L150,92" stroke="#1e5e2e" stroke-width="5"/>` +
    lab(160, 44, "しおが みちると ここまで", 12) + lab(90, 150, "ひがた（どろの はま）", 13, "#fff") + lab(90, 84, "のりの あみ", 12) + lab(262, 156, "うみ", 12, "#fff"),

  /* くろしおの ながれ（みおろし） */
  kairyu: () => `<rect width="320" height="180" fill="${C.sea}"/>` +
    `<path d="M40,170 Q90,150 130,120 Q170,92 210,70 Q250,45 300,10 L320,0 L320,30 Q270,60 230,95 Q190,125 150,140 Q110,160 70,180 Z" fill="${C.mt}"/>` +
    `<path d="M10,175 Q100,160 160,135 Q230,105 300,60" fill="none" stroke="#f08a3c" stroke-width="10" stroke-linecap="round" opacity=".85"/>` +
    arrow(250, 92, 300, 60, "#f08a3c", 0.1) +
    [[70, 168], [140, 145], [205, 118], [262, 86]].map(([x, y]) => `<g transform="translate(${x} ${y + 14})"><ellipse rx="9" ry="4" fill="#cfd8e6" stroke="#5a6b85"/><polygon points="9,0 15,-4 15,4" fill="#cfd8e6" stroke="#5a6b85"/></g>`).join("") +
    lab(200, 40, "にほん", 14, "#fff") + lab(130, 175, "くろしお（あたたかい）", 13, "#fff") + lab(60, 40, "かつおが きたへ", 12, "#fff"),

  /* かぜが つくった すなの おか */
  sakyu: () => sky() +
    `<rect y="120" width="70" height="60" fill="${C.sea}"/>` +
    `<path d="M50,180 L60,130 Q110,80 160,120 Q200,90 250,112 Q290,95 320,108 L320,180 Z" fill="${C.sand}"/>` +
    `<path d="M80,130 Q110,105 140,124 M190,118 Q220,100 250,116" fill="none" stroke="#d6b66a" stroke-width="2"/>` +
    [200, 220, 240, 260, 280, 300].map((x) => `<path d="M${x},${148} l-4,-10 M${x},148 l0,-12 M${x},148 l4,-10" stroke="#5d9e45" stroke-width="2"/>`).join("") +
    arrow(10, 60, 70, 75, "#7aa3c4") + arrow(20, 90, 80, 100, "#7aa3c4") + lab(40, 50, "かぜ", 12) +
    lab(250, 170, "らっきょうばたけ", 12) + lab(140, 160, "すな", 14) + lab(30, 150, "うみ", 12, "#fff"),

  /* おひさまが あたる やまの しゃめん */
  shamen: () => sky() + sunAt(270, 30, 16) +
    `<rect x="210" y="140" width="110" height="40" fill="${C.sea}"/>` +
    `<polygon points="0,30 40,26 220,150 0,180" fill="${C.mt}"/><polygon points="0,150 230,150 230,180 0,180" fill="${C.mt}"/>` +
    [[60, 62], [95, 86], [130, 110], [165, 134], [45, 92], [80, 116], [115, 140]].map(([x, y]) => tree(x, y, "#f59a1e", 8)).join("") +
    arrow(250, 48, 140, 90, "#f2b33d") + arrow(240, 150, 175, 120, "#f2b33d") +
    lab(270, 70, "おひさま", 12) + lab(270, 166, "うみの はねかえり", 11, "#fff") + lab(70, 168, "だんだんばたけ", 12),

  /* カルデラ（だんめん） */
  caldera: () => sky() +
    `<polygon points="0,70 30,55 60,120 260,120 290,55 320,70 320,180 0,180" fill="${C.mt}"/>` +
    `<polygon points="60,120 260,120 260,180 60,180" fill="#a8d07a"/>` +
    `<polygon points="135,120 160,82 185,120" fill="#7f6a58"/>` +
    `<path d="M160,80 q-6,-12 2,-20 q8,-8 0,-20" fill="none" stroke="#bbb" stroke-width="5" stroke-linecap="round" opacity=".8"/>` +
    cow(90, 140) + cow(220, 145) + cow(110, 160) + house(240, 128, 0.8) +
    lab(160, 172, "ひろい くさはら", 13) + lab(160, 104, "いまも けむりを だす やま", 11) +
    `<line x1="30" y1="60" x2="290" y2="60" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="4 3"/>` + lab(160, 54, "おおきな くぼみ（カルデラ）", 12),

  /* かざんと おんせん（だんめん） */
  kazan: () => sky() +
    `<polygon points="40,80 110,20 130,20 200,80" fill="#8a7a6a"/>` +
    `<rect y="80" width="320" height="100" fill="${C.soil}"/>` +
    `<ellipse cx="120" cy="165" rx="70" ry="22" fill="#e2574c"/><path d="M120,145 L120,40" stroke="#e2574c" stroke-width="7"/>` +
    `<path d="M200,100 Q240,112 260,140" fill="none" stroke="${C.water}" stroke-width="6" stroke-dasharray="8 5"/>` +
    arrow(190, 160, 238, 140, "#f08a3c") + `<path d="M262,138 L262,82" stroke="#f08a3c" stroke-width="6"/>` +
    `<ellipse cx="265" cy="82" rx="26" ry="6" fill="#8fd3f5"/>` +
    `<path d="M255,72 q-5,-8 0,-16 M268,72 q-5,-8 0,-16 M281,72 q-5,-8 0,-16" fill="none" stroke="#aaa" stroke-width="3"/>` +
    lab(120, 170, "マグマ", 14, "#fff") + lab(270, 50, "おんせん", 13) + lab(232, 108, "ちかすい", 11) + lab(120, 14, "かざん", 12),

  /* かわの でぐちの さんかくす（みおろし） */
  sankakusu: () => `<rect width="320" height="180" fill="${C.sea}"/>` +
    `<path d="M0,0 L320,0 L320,40 L0,40 Z" fill="${C.mt2}"/>` +
    `<path d="M120,40 L220,40 L260,120 L80,120 Z" fill="#e8d6a8"/>` +
    `<path d="M170,0 L170,40 M170,40 L120,122 M170,40 L170,122 M170,40 L220,122" stroke="${C.water}" stroke-width="6" fill="none"/>` +
    house(140, 85, .8, "#6d7fa3") + house(150, 100, .8, "#6d7fa3") + house(195, 85, .8, "#6d7fa3") + house(190, 102, .8, "#6d7fa3") +
    `<ellipse cx="40" cy="150" rx="26" ry="12" fill="${C.mt}"/><ellipse cx="290" cy="155" rx="22" ry="10" fill="${C.mt}"/>` +
    [[110, 150], [170, 160], [230, 150]].map(([x, y]) => `<rect x="${x - 10}" y="${y - 4}" width="20" height="8" fill="#a0784a" stroke="#6b4a26"/>`).join("") +
    lab(170, 26, "かわ", 12, "#fff") + lab(268, 80, "さんかくす", 13) + lab(170, 140, "かきの いかだ", 11, "#fff") + lab(40, 170, "しま", 11, "#fff"),

  /* うみと つながった みずうみ（みおろし） */
  kisuiko: () => `<rect width="320" height="180" fill="${C.mt}"/>` +
    `<path d="M70,30 Q160,10 240,40 Q275,80 230,120 Q170,140 110,125 Q55,100 70,30 Z" fill="#7cc4ea"/>` +
    `<rect x="160" y="128" width="14" height="30" fill="#5aa9e6"/><rect y="150" width="320" height="30" fill="${C.sea}"/>` +
    `<path d="M20,10 Q50,30 80,45" stroke="#9fd8f7" stroke-width="6" fill="none"/>` +
    arrow(167, 170, 167, 132, C.sea2) + arrow(60, 32, 85, 50, "#9fd8f7") +
    `<path d="M120,80 q10,-8 20,0 t20,0 t20,0" stroke="#5a4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    lab(160, 100, "うなぎ", 12) + lab(240, 168, "うみ（しおみず）", 12, "#fff") + lab(40, 24, "かわ（まみず）", 11) + lab(160, 60, "まざった みず", 12),

  /* ていぼうで かこんだ まち（だんめん） */
  wajuu: () => sky() +
    `<rect y="70" width="60" height="110" fill="${C.water}"/><rect x="260" y="70" width="60" height="110" fill="${C.water}"/>` +
    `<polygon points="50,180 60,62 80,62 95,120 225,120 240,62 260,62 270,180" fill="${C.soil}"/>` +
    `<rect x="95" y="120" width="130" height="60" fill="${C.paddy}"/>` +
    `<polygon points="170,120 175,96 215,96 220,120" fill="${C.soil2}"/>` + house(195, 96, 1.1) + house(125, 120) +
    `<line x1="0" y1="70" x2="320" y2="70" stroke="${C.sea2}" stroke-dasharray="5 4"/>` +
    lab(30, 62, "かわ", 12) + lab(290, 62, "かわ", 12) + lab(70, 52, "ていぼう", 12) + lab(195, 76, "みずや", 12) + lab(150, 160, "たんぼ・いえ", 12) +
    lab(160, 30, "かわの ほうが たかい！", 13, C.red),

  /* りゅうひょう（みおろし） */
  ryuhyo: () => `<rect width="320" height="180" fill="${C.sea2}"/>` +
    [[30, 20, 40], [90, 40, 30], [160, 15, 46], [230, 35, 34], [290, 18, 30], [60, 70, 26], [200, 75, 28]].map(([x, y, r]) =>
      `<polygon points="${x - r},${y} ${x - r * .4},${y - r * .5} ${x + r * .6},${y - r * .4} ${x + r},${y + r * .2} ${x + r * .2},${y + r * .5} ${x - r * .7},${y + r * .4}" fill="#f4f9ff" stroke="#bcd3ea"/>`).join("") +
    Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 47) % 300 + 10}" cy="${105 + (i * 13) % 40}" r="2.2" fill="#9fe08a"/>`).join("") +
    `<rect y="150" width="320" height="30" fill="#8c7a5e"/>` +
    [40, 100, 160, 220, 280].map((x) => `<path d="M${x - 10},160 Q${x},145 ${x + 10},160 Z" fill="#f2c9a0" stroke="#b07a50"/>`).join("") +
    arrow(300, 100, 300, 70, "#fff") + lab(300, 112, "きた", 11, C.ink) +
    lab(140, 100, "プランクトン", 12) + lab(160, 176, "ほたて", 12, "#fff") + lab(130, 62, "りゅうひょう", 13),

  /* ふゆでも あたたかい ビニールハウス */
  danto: () => sky() + sunAt(270, 32, 16) +
    `<rect y="140" width="320" height="40" fill="${C.field}"/>` +
    `<path d="M30,140 L30,95 Q120,40 210,95 L210,140 Z" fill="#e8f4fb" stroke="#9cc0d6" stroke-width="2" opacity=".9"/>` +
    [60, 95, 130, 165, 190].map((x) => `<rect x="${x - 1}" y="108" width="2" height="32" fill="#5d9e45"/><ellipse cx="${x - 5}" cy="118" rx="4" ry="7" fill="#2f9e46"/><ellipse cx="${x + 5}" cy="128" rx="4" ry="7" fill="#2f9e46"/>`).join("") +
    arrow(250, 50, 200, 80, "#f2b33d") + thermo(265, 120, true) +
    lab(120, 80, "ビニールハウス", 12) + lab(255, 160, "ふゆでも あったか", 12) + lab(60, 30, "❄️ ふゆ", 14),

  /* あめが すくない（やまに はさまれる） */
  shouu: () => sky() +
    `<ellipse cx="40" cy="30" rx="34" ry="14" fill="#fff"/><ellipse cx="290" cy="30" rx="30" ry="13" fill="#fff"/>` +
    `<path d="M30,48 l-3,8 M45,48 l-3,8 M285,46 l-3,8 M298,46 l-3,8" stroke="${C.water}" stroke-width="2.5"/>` +
    `<polygon points="0,140 0,70 50,40 100,120 220,120 270,44 320,70 320,140" fill="${C.mt2}"/>` +
    `<rect y="120" width="320" height="60" fill="#e8d07a"/>` +
    [[110, 150], [160, 138], [215, 158], [140, 168], [250, 140]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="6" fill="${C.water}"/>`).join("") +
    `<ellipse cx="160" cy="50" rx="16" ry="7" fill="#fff" opacity=".7"/>` +
    lab(160, 30, "くもが とどかない", 12) + lab(50, 88, "ちゅうごく", 11, "#fff") + lab(50, 102, "さんち", 11, "#fff") + lab(272, 88, "しこく", 11, "#fff") + lab(272, 102, "さんち", 11, "#fff") +
    lab(180, 118, "ためいけ と こむぎばたけ", 12),

  /* すずしい なつの りんごばたけ */
  suzushii: () => sky() +
    `<polygon points="40,110 120,25 200,110" fill="${C.mt2}"/><polygon points="104,42 120,25 136,42" fill="${C.snow}"/>` +
    `<rect y="110" width="320" height="70" fill="${C.field}"/>` +
    [30, 70, 110, 150, 190, 230, 270].map((x, i) => tree(x, 130 + (i % 2) * 18, "#d8323f", 10)).join("") +
    `<path d="M220,40 q20,-6 40,0 t40,0 M230,60 q20,-6 40,0 t40,0" fill="none" stroke="#7aa3c4" stroke-width="3" stroke-linecap="round"/>` +
    thermo(300, 100, false) + lab(120, 18, "いわきさん", 12) + lab(270, 30, "すずしい かぜ", 12) + lab(160, 174, "りんごばたけ", 12),
};

function diagramSVG(key, cls = "diagram") {
  return `<svg class="${cls}" viewBox="0 0 320 180" role="img" aria-hidden="true">${DIAGRAMS[key]()}</svg>`;
}
