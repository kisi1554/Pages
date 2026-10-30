"use strict";
/* ============================================================
   せかい いっしゅう りょこう：まちの え（すべて オリジナルの SVG）

   BUILDINGS[しゅるい]() … 100×100 の はこに たてものを えがく（下の はしが じめん）
   sceneSVG(c, hour)    … その 国の まちの え。そらの いろは げんちの じこくで かわる
   ============================================================ */

const BUILDINGS = (() => {
  const P = (pts, fill, extra = "") => `<polygon points="${pts}" fill="${fill}" ${extra}/>`;
  const Rr = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const C = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
  const win = (x0, y0, cols, rows, dx, dy, w, h, fill = "#ffe9a8") => rep(rows, (r) => rep(cols, (c) => Rr(x0 + c * dx, y0 + r * dy, w, h, fill))).trim();
  const onionTop = (cx, by, r, fill) => `<path d="M${cx - r},${by} C${cx - r * 1.3},${by - r * 1.2} ${cx - r * 0.2},${by - r * 1.4} ${cx},${by - r * 2.3} C${cx + r * 0.2},${by - r * 1.4} ${cx + r * 1.3},${by - r * 1.2} ${cx + r},${by} Z" fill="${fill}"/>`;
  const curvedRoof = (x, y, w, h, fill) => `<path d="M${x - 6},${y + h} Q${x + w * 0.15},${y + h * 0.6} ${x + w * 0.2},${y} L${x + w * 0.8},${y} Q${x + w * 0.85},${y + h * 0.6} ${x + w + 6},${y + h} Z" fill="${fill}"/>`;

  return {
    tower: () => P("26,100 44,52 48,10 52,10 56,52 74,100 64,100 56,74 44,74 36,100", "#9a7752") +
      Rr(34, 70, 32, 4, "#7d5e3f") + Rr(41, 48, 18, 3, "#7d5e3f") + Rr(47, 2, 6, 9, "#7d5e3f") +
      `<path d="M38,100 Q50,80 62,100" fill="#fdf8ec" opacity=".0"/>`,
    clock: () => Rr(2, 62, 96, 38, "#c9a96b") + win(8, 70, 9, 2, 10, 14, 5, 8, "#8d6f3f") +
      Rr(38, 18, 24, 82, "#d4b878") + P("38,18 50,0 62,18", "#4d6a5a") + C(50, 32, 8, "#fff", 'stroke="#8d6f3f" stroke-width="2"') +
      `<path d="M50,32 V27 M50,32 H54" stroke="#333" stroke-width="1.6"/>` + win(42, 46, 2, 3, 10, 14, 6, 9, "#8d6f3f"),
    colosseum: () => `<path d="M4,100 V40 Q50,22 96,40 V100 Z" fill="#d8b98a"/><path d="M60,100 V30 Q80,32 96,40 V100Z" fill="#c4a170"/>` +
      rep(3, (r) => rep(8, (c) => `<path d="M${8 + c * 11},${92 - r * 18} v-10 a4,4 0 0 1 8,0 v10z" fill="#7a5b3a"/>`)),
    gate: () => Rr(4, 34, 92, 10, "#d9c9a3") + Rr(2, 94, 96, 6, "#cbb98f") + rep(6, (i) => Rr(8 + i * 16, 44, 7, 50, "#e7dbbd")) +
      Rr(36, 22, 28, 12, "#d9c9a3") + `<path d="M42,22 l4,-10 h8 l4,10z" fill="#4f7d6a"/>`,
    temple: () => Rr(4, 90, 92, 10, "#d8d0bd") + rep(8, (i) => Rr(9 + i * 11.2, 44, 6, 46, "#ece6d6")) +
      Rr(4, 36, 92, 8, "#e0d8c4") + P("4,36 50,16 96,36", "#e7e0cc"),
    onion: () => Rr(10, 60, 80, 40, "#b8473b") + win(16, 70, 6, 2, 12, 14, 6, 10, "#f2d27a") +
      Rr(42, 30, 16, 30, "#c9584b") + onionTop(50, 30, 9, "#2f8f5a") + `<path d="M50,9 V0" stroke="#e7b43a" stroke-width="2"/>` +
      Rr(16, 44, 12, 16, "#d9744a") + onionTop(22, 44, 7, "#e7b43a") + Rr(72, 44, 12, 16, "#d9744a") + onionTop(78, 44, 7, "#3a7bd5") +
      Rr(29, 52, 10, 8, "#c9584b") + onionTop(34, 52, 5, "#d2464b") + Rr(61, 52, 10, 8, "#c9584b") + onionTop(66, 52, 5, "#8a55c9"),
    mosque: () => Rr(14, 58, 72, 42, "#e9e2d0") + `<path d="M26,58 A24,24 0 0 1 74,58 Z" fill="#7b9cb5"/>` +
      Rr(4, 18, 7, 82, "#e9e2d0") + P("4,18 7.5,4 11,18", "#7b9cb5") + Rr(89, 18, 7, 82, "#e9e2d0") + P("89,18 92.5,4 96,18", "#7b9cb5") +
      rep(4, (i) => `<path d="M${24 + i * 14},100 v-16 a5,5 0 0 1 10,0 v16z" fill="#a9b9c7"/>`),
    taj: () => Rr(10, 54, 80, 46, "#f4f1ea") + `<path d="M34,54 C30,36 44,26 50,18 C56,26 70,36 66,54Z" fill="#f4f1ea" stroke="#d8d2c4"/>` +
      `<path d="M50,18 V8" stroke="#c9a54a" stroke-width="2"/>` + `<path d="M42,100 v-24 a8,8 0 0 1 16,0 v24z" fill="#d8d2c4"/>` +
      rep(2, (i) => Rr(i ? 92 : 2, 28, 6, 72, "#f4f1ea", 'stroke="#d8d2c4"') + C(i ? 95 : 5, 27, 4, "#f4f1ea", 'stroke="#d8d2c4"')),
    minaret: () => Rr(6, 74, 88, 26, "#e7d3b0") + Rr(34, 14, 32, 86, "#d9bb8a") + Rr(38, 2, 24, 12, "#d9bb8a") +
      Rr(34, 30, 32, 6, "#2f8f7a") + Rr(34, 60, 32, 6, "#2f8f7a") + `<path d="M44,50 v-10 a6,6 0 0 1 12,0 v10z" fill="#8d6f3f"/>` + C(50, 0, 3, "#e7b43a"),
    pyramid: () => P("0,100 38,30 76,100", "#e2c27a") + P("38,30 76,100 56,100", "#c9a75f") + P("54,100 80,56 100,100", "#e8cd8f") + P("80,56 100,100 90,100", "#cfb072"),
    steppyr: () => rep(5, (i) => Rr(6 + i * 9, 100 - (i + 1) * 15, 88 - i * 18, 15, i % 2 ? "#b49a76" : "#c8ad87")) +
      Rr(44, 25, 12, 75, "#8f7a5c") + rep(10, (i) => Rr(44, 30 + i * 7, 12, 2, "#a8916f")),
    pagoda: () => rep(4, (i) => Rr(36 + i * 2, 86 - i * 20, 28 - i * 4, 14, "#c84a3a") + curvedRoof(28 + i * 3, 78 - i * 20, 44 - i * 6, 8, "#3d4a5c")) +
      `<path d="M50,18 V2" stroke="#d9a227" stroke-width="3"/>`,
    round: () => Rr(10, 92, 80, 8, "#e9e2d0") + Rr(14, 86, 72, 6, "#f4f1ea") +
      rep(3, (i) => Rr(30 + i * 5, 74 - i * 18, 40 - i * 10, 12, "#b8473b") + `<path d="M${20 + i * 6},${74 - i * 18} Q50,${60 - i * 18} ${80 - i * 6},${74 - i * 18}Z" fill="#2c5aa0"/>`) +
      C(50, 30, 4, "#d9a227"),
    palace: () => Rr(4, 90, 92, 10, "#c9c1ad") + Rr(14, 60, 72, 30, "#b8473b") + rep(6, (i) => Rr(16 + i * 13, 62, 4, 28, "#7a2e25")) +
      curvedRoof(12, 44, 76, 18, "#4a5a52") + curvedRoof(26, 28, 48, 14, "#4a5a52"),
    spire: () => Rr(16, 64, 68, 36, "#f2e6c8") + rep(3, (i) => P(`${10 + i * 6},${66 - i * 10} 50,${46 - i * 10} ${90 - i * 6},${66 - i * 10}`, i % 2 ? "#2f6db5" : "#c84a3a")) +
      P("44,30 50,0 56,30", "#e7b43a") + `<path d="M40,100 v-18 a10,10 0 0 1 20,0 v18z" fill="#e7b43a"/>`,
    stupa: () => rep(4, (i) => Rr(4 + i * 9, 92 - i * 10, 92 - i * 18, 10, "#9b958a")) + `<path d="M28,62 A22,22 0 0 1 72,62Z" fill="#aaa397"/>` +
      Rr(46, 28, 8, 14, "#8a8478") + rep(6, (i) => C(10 + i * 16, 86, 3, "#7d776c")),
    stupa2: () => Rr(4, 86, 92, 14, "#f4f1ea") + `<path d="M14,86 A36,30 0 0 1 86,86Z" fill="#fbfaf6" stroke="#ddd6c6"/>` +
      Rr(40, 36, 20, 20, "#e7b43a") + `<path d="M43,46 q3,-3 6,0 M51,46 q3,-3 6,0" stroke="#2b3a5a" stroke-width="1.6" fill="none"/>` +
      P("40,36 50,4 60,36", "#e7b43a") + `<path d="M50,30 L20,60 M50,30 L80,60" stroke="#d2464b" stroke-width="1" stroke-dasharray="2 2"/>`,
    ger: () => `<path d="M10,100 V70 Q50,52 90,70 V100Z" fill="#f7f4ec" stroke="#cfc7b4"/><path d="M8,72 Q50,40 92,72 Q50,58 8,72Z" fill="#e8e1d1"/>` +
      `<path d="M10,82 H90" stroke="#3a7bd5" stroke-width="3"/><rect x="42" y="78" width="16" height="22" fill="#d9744a"/>` + C(50, 50, 3, "#d9744a"),
    windmill: () => P("34,100 40,40 60,40 66,100", "#8a6d4a") + P("36,42 50,28 64,42", "#5c4a36") + Rr(44, 80, 12, 20, "#5c4a36") +
      `<g transform="translate(50 38)" stroke="#5c4a36" stroke-width="2"><g class="spin">` + rep(4, (i) => `<g transform="rotate(${i * 90 + 20})"><line x1="0" y1="0" x2="0" y2="-36"/><rect x="0" y="-36" width="8" height="28" fill="#f4efe2"/></g>`) + `</g></g>`,
    skyscraper: () => Rr(4, 40, 22, 60, "#7b9cb5") + win(7, 44, 3, 8, 6, 7, 3, 4) + Rr(30, 10, 26, 90, "#5f7f99") + win(33, 14, 4, 12, 6, 7, 3, 4) +
      Rr(60, 30, 18, 70, "#8fb0c4") + win(63, 34, 2, 9, 7, 7, 4, 4) + Rr(80, 54, 18, 46, "#6a8aa5") + win(83, 58, 2, 6, 7, 7, 4, 4),
    statue: () => Rr(30, 66, 40, 34, "#c9b99a") + Rr(24, 60, 52, 8, "#b8a888") + P("38,60 44,22 56,22 62,60", "#6fb3a2") +
      C(50, 18, 6, "#6fb3a2") + P("44,13 50,4 56,13", "#6fb3a2") + Rr(56, 4, 4, 22, "#6fb3a2") + P("54,4 58,-4 62,4", "#f2b53a"),
    opera: () => `<path d="M2,100 H98 V92 H2Z" fill="#d8d0bd"/>` + [[6, 40, 30], [26, 26, 34], [48, 18, 36], [70, 34, 28]].map(([x, h, w]) =>
      `<path d="M${x},92 Q${x + w * 0.2},${92 - h * 1.7} ${x + w},${92 - h * 1.9} Q${x + w * 0.85},${92 - h * 0.7} ${x + w},92Z" fill="#fbfaf6" stroke="#d6cfbf"/>`).join(""),
    sagrada: () => Rr(10, 60, 80, 40, "#c8a77e") + `<path d="M40,100 v-22 a10,10 0 0 1 20,0 v22z" fill="#8d6f4f"/>` +
      [14, 30, 62, 78].map((x, i) => P(`${x},62 ${x + 4},${i === 1 || i === 2 ? 4 : 14} ${x + 8},62`, "#b8956a") + C(x + 4, i === 1 || i === 2 ? 6 : 16, 2.5, "#e7b43a")).join(""),
    church: () => Rr(16, 48, 68, 52, "#e9dcc0") + P("12,50 50,30 88,50", "#9b6a4a") + Rr(40, 10, 20, 40, "#e9dcc0") + P("40,12 50,0 60,12", "#9b6a4a") +
      `<path d="M42,100 v-20 a8,8 0 0 1 16,0 v20z" fill="#6b4a33"/>` + C(50, 26, 5, "#8fb7d9") + win(22, 62, 2, 1, 50, 0, 6, 12, "#8fb7d9"),
    cathedral: () => Rr(10, 50, 80, 50, "#f8f6f0") + rep(5, (i) => Rr(20 + i * 13, 64, 6, 36, "#e6e1d4")) + P("6,52 50,40 94,52", "#f8f6f0", 'stroke="#ddd"') +
      Rr(38, 22, 24, 22, "#f8f6f0") + `<path d="M36,24 A14,14 0 0 1 64,24Z" fill="#4f9a7a"/>` + `<path d="M50,10 V2" stroke="#d9a227" stroke-width="2"/>` +
      [16, 84].map((x) => Rr(x - 5, 36, 10, 14, "#f8f6f0") + `<path d="M${x - 6},37 A6,6 0 0 1 ${x + 6},37Z" fill="#4f9a7a"/>`).join(""),
    stave: () => rep(4, (i) => P(`${18 + i * 7},${100 - i * 20} 50,${72 - i * 20} ${82 - i * 7},${100 - i * 20}`, "#3e2c22") + Rr(26 + i * 7, 100 - i * 20, 48 - i * 14, i ? 0 : 0, "#000")) +
      Rr(26, 84, 48, 16, "#6b4a33") + `<path d="M50,12 V0" stroke="#3e2c22" stroke-width="3"/>` + `<path d="M24,76 l-6,-6 M76,76 l6,-6" stroke="#3e2c22" stroke-width="2"/>`,
    chalet: () => Rr(14, 56, 72, 44, "#a8723f") + P("4,60 50,24 96,60", "#6b4a33") + win(22, 66, 3, 2, 20, 16, 12, 9, "#fff6d8") +
      rep(3, (i) => Rr(20 + i * 20, 76, 16, 4, "#d2464b")) + Rr(10, 56, 80, 3, "#5a3d27"),
    parliament: () => Rr(2, 58, 96, 42, "#cdb98f") + win(6, 66, 12, 2, 7.6, 14, 4, 9, "#8d6f3f") + Rr(38, 16, 24, 84, "#d6c39a") +
      P("38,16 50,0 62,16", "#4f9a7a") + C(50, 30, 6, "#fff", 'stroke="#8d6f3f"') + win(42, 44, 2, 3, 10, 14, 6, 9, "#8d6f3f"),
    obelisk: () => Rr(20, 94, 60, 6, "#d8d0bd") + P("42,94 45,12 55,12 58,94", "#f4f1ea", 'stroke="#d6cfbf"') + P("45,12 50,2 55,12", "#e6e0cf") + Rr(48, 30, 4, 6, "#6b7a90"),
    moai: () => Rr(0, 92, 100, 8, "#8d8a80") + [10, 40, 70].map((x) => `<path d="M${x},92 V40 Q${x},28 ${x + 9},28 Q${x + 20},28 ${x + 20},40 V92Z" fill="#6f6b63"/>` +
      Rr(x + 2, 46, 16, 4, "#575349") + `<path d="M${x + 12},52 l-3,14 h6z" fill="#575349"/>`).join(""),
    ruins: () => P("40,100 70,6 100,100", "#4f8a55") + P("62,30 70,6 78,30", "#3e7046") +
      rep(5, (i) => Rr(0, 60 + i * 8, 70 - i * 6, 4, "#b8ad94")) + rep(4, (i) => Rr(4 + i * 14, 48, 10, 10, "#c9bea5") + P(`${2 + i * 14},48 ${9 + i * 14},40 ${16 + i * 14},48`, "#9c8a62")),
    christ: () => P("0,100 30,40 50,30 70,40 100,100", "#4f8a55") + Rr(46, 22, 8, 10, "#e9e2d0") +
      Rr(47, -4, 6, 26, "#f4f1ea") + Rr(30, 2, 40, 5, "#f4f1ea") + C(50, -7, 3.5, "#f4f1ea"),
    rowhouses: () => ["#e8833a", "#3a7bd5", "#2f9e5b", "#d2464b", "#8a55c9", "#f2c94c"].map((col, i) =>
      Rr(i * 16.6, 46 + (i % 2) * 8, 16.6, 54 - (i % 2) * 8, col) + Rr(i * 16.6 + 5, 62, 6, 9, "#fff8") + Rr(i * 16.6 + 5, 82, 6, 18, "#5a3d27")).join("") +
      Rr(0, 44, 100, 3, "#fff6"),
    capitol: () => Rr(2, 64, 96, 36, "#f1ece0") + rep(10, (i) => Rr(30 + i * 4.4, 66, 2, 28, "#ddd6c6")) + Rr(36, 40, 28, 24, "#f1ece0") +
      `<path d="M34,42 C34,18 66,18 66,42Z" fill="#e6e0cf"/>` + Rr(47, 12, 6, 12, "#f1ece0") + P("44,64 50,56 56,64", "#ddd6c6"),
    canal: () => Rr(0, 70, 100, 30, "#5a9cd0") + Rr(0, 56, 30, 44, "#9a8f7c") + Rr(70, 56, 30, 44, "#9a8f7c") +
      Rr(30, 52, 40, 18, "#d64b3a") + Rr(34, 40, 30, 12, "#f4f1ea") + win(37, 43, 4, 1, 7, 0, 4, 4, "#5a9cd0") + Rr(46, 30, 6, 10, "#3a3a3a"),
    rock: () => Rr(0, 40, 100, 60, "#b5734c") + Rr(8, 46, 84, 54, "#8f5637") + P("40,52 60,52 60,62 72,62 72,78 60,78 60,96 40,96 40,78 28,78 28,62 40,62", "#c98a5e") +
      P("44,58 56,58 56,66 66,66 66,74 56,74 56,90 44,90 44,74 34,74 34,66 44,66", "#a86c45"),
    castle: () => P("0,100 30,62 70,58 100,100", "#7a9a5a") + Rr(26, 32, 48, 34, "#c9b18a") + win(30, 38, 5, 2, 9, 12, 5, 7, "#5a3d27") +
      P("22,34 50,14 78,34", "#7a4a33") + rep(4, (i) => Rr(26 + i * 15, 28, 4, 6, "#c9b18a")),
    arch: () => `<path d="M8,100 V30 H92 V100 H70 V64 A20,20 0 0 0 30,64 V100Z" fill="#d9cdb2"/>` + Rr(4, 24, 92, 8, "#c9bc9e") +
      `<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const a = (i * 36 - 90) * Math.PI / 180, r = i % 2 ? 4 : 10; return (50 + r * Math.cos(a)).toFixed(1) + "," + (12 + r * Math.sin(a)).toFixed(1); }).join(" ")}" fill="#111"/>`,
    skytower: () => Rr(46, 30, 8, 70, "#d8dde3") + P("40,100 46,60 54,60 60,100", "#c4cbd3") + Rr(38, 26, 24, 10, "#b9c3cd") + Rr(41, 20, 18, 6, "#9aa7b4") +
      Rr(49, 0, 2, 20, "#9aa7b4") + Rr(4, 70, 20, 30, "#7b9cb5") + Rr(76, 60, 20, 40, "#8fb0c4"),
    onepillar: () => Rr(0, 82, 100, 18, "#6aa9c9") + Rr(46, 58, 8, 32, "#7a5b3a") + Rr(28, 44, 44, 16, "#b8473b") +
      curvedRoof(28, 30, 44, 14, "#3d4a5c") + C(50, 28, 3, "#d9a227") + `<path d="M10,86 q8,-4 16,0 M70,88 q8,-4 16,0" stroke="#3e7046" stroke-width="3" fill="none"/>`,
  };
})();

/* ------------------------------ まちの え ------------------------------ */

/** げんちの じかんに あわせた そらの いろ */
function skyOf(h) {
  if (h >= 7 && h < 16) return { top: "#7cc4f0", bot: "#cdeafc", night: false, sun: true };
  if (h >= 5 && h < 7) return { top: "#8fb3e0", bot: "#ffd5a8", night: false, sun: true };
  if (h >= 16 && h < 19) return { top: "#7f8fd0", bot: "#ffb98a", night: false, sun: true };
  return { top: "#0f1d45", bot: "#2b3f78", night: true, sun: false };
}

const SCENERY = {
  city:   { ground: "#cfd6c4", far: "#b8c7d6" },
  snow:   { ground: "#eef4f8", far: "#d7e3ee" },
  desert: { ground: "#ecd39a", far: "#e3c48a" },
  tropic: { ground: "#9fd18a", far: "#7fb98a" },
  mount:  { ground: "#a9cf8e", far: "#8aa6c4" },
  plain:  { ground: "#b9da8a", far: "#a8c8a0" },
  sea:    { ground: "#d9d2b5", far: "#5aa7d6" },
};

/** えもじを SVG の 中に おく */
const emo = (e, x, y, size) => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;

/** ひと（あいさつ して くれる）。ふくの いろは 国ごとに かえる（すがたで 国を きめつけない） */
function personSVG(seed) {
  const shirt = ["#e8833a", "#3a7bd5", "#2f9e5b", "#d2464b", "#8a55c9", "#d9a227"][seed % 6];
  const pants = ["#2b3a5a", "#5a3d27", "#3e5a3e", "#444"][seed % 4];
  const skin = ["#f6d2b0", "#d9a77c", "#a8764f", "#7a5236", "#eac09a"][seed % 5];
  const hair = ["#2b2b2b", "#5a3d27", "#8a5a2b", "#c99a46", "#1d1d1d"][(seed >> 1) % 5];
  return `<g><rect x="-7" y="10" width="6" height="18" rx="2" fill="${pants}"/><rect x="1" y="10" width="6" height="18" rx="2" fill="${pants}"/>` +
    `<rect x="-10" y="-10" width="20" height="24" rx="7" fill="${shirt}"/>` +
    `<rect x="9" y="-18" width="5" height="16" rx="2.5" fill="${skin}" transform="rotate(20 11 -10)"/>` +
    `<circle cx="0" cy="-20" r="10" fill="${skin}"/><path d="M-10,-22 a10,10 0 0 1 20,0 q-10,-6 -20,0z" fill="${hair}"/>` +
    `<circle cx="-3.5" cy="-20" r="1.3" fill="#222"/><circle cx="3.5" cy="-20" r="1.3" fill="#222"/>` +
    `<path d="M-3,-15 q3,3 6,0" stroke="#222" stroke-width="1.2" fill="none"/></g>`;
}

/** やたい（たべもの） */
function stallSVG(food, col) {
  return `<g><rect x="-22" y="-6" width="44" height="26" rx="3" fill="#fff6e3" stroke="#d9c49a"/>` +
    `<path d="M-26,-6 L-20,-22 H20 L26,-6Z" fill="${col}"/><path d="M-26,-6 q6.5,6 13,0 q6.5,6 13,0 q6.5,6 13,0 q6.5,6 13,0" fill="#fff"/>` +
    emo(food, 0, 8, 22) + `</g>`;
}

/** のりもの（せんろの うえ） */
function rideSVG(e) { return `<g>${emo(e, 0, 0, 40)}</g>`; }

/**
 * まちの え
 *  c     国の データ
 *  hour  げんちの じ（0〜23）
 *  found { hi, food, bld, ani, ride }：みつけた もの
 */
function sceneSVG(c, hour, found = {}) {
  const sky = skyOf(hour), sc = SCENERY[c.sc] || SCENERY.city, col = REGION[c.r].col;
  const flip = c.id % 2 === 1;
  const X = (x) => (flip ? 400 - x : x);
  let s = `<svg class="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="sky${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset="1" stop-color="${sky.bot}"/></linearGradient></defs>` +
    `<rect width="400" height="260" fill="url(#sky${c.id})"/>`;
  if (sky.night) {
    for (let i = 0; i < 24; i++) s += `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 110 + 6}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity=".8"/>`;
    s += `<circle cx="${X(330)}" cy="38" r="14" fill="#fff6c8"/><circle cx="${X(337)}" cy="33" r="12" fill="${sky.top}"/>`;
  } else {
    s += `<circle cx="${X(340)}" cy="40" r="18" fill="#ffe27a"/>`;
    s += `<g fill="#fff" opacity=".85"><ellipse cx="${X(90)}" cy="40" rx="30" ry="9"/><ellipse cx="${X(250)}" cy="26" rx="22" ry="7"/></g>`;
  }
  // とおくの けしき
  if (c.sc === "mount" || c.sc === "snow") {
    s += `<path d="M0,180 L60,90 L110,150 L170,70 L240,160 L300,100 L400,170 V200 H0Z" fill="${sc.far}"/>` +
      `<path d="M160,85 L170,70 L180,85 L174,82 L170,88 L165,82Z M52,102 L60,90 L68,102Z M292,112 L300,100 L308,112Z" fill="#fff"/>`;
  } else if (c.sc === "sea") {
    s += `<rect x="0" y="160" width="400" height="34" fill="${sc.far}"/><path d="M0,168 q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/>`;
  } else if (c.sc === "desert") {
    s += `<path d="M0,190 Q80,150 160,185 T320,175 T400,180 V200 H0Z" fill="${sc.far}"/>`;
  } else {
    s += `<path d="M0,190 Q60,160 130,184 T270,176 T400,186 V200 H0Z" fill="${sc.far}"/>`;
  }
  s += `<rect x="0" y="190" width="400" height="70" fill="${sc.ground}"/>`;
  if (c.sc === "tropic") s += [30, 370].map((x) => `<g transform="translate(${x} 190)"><path d="M0,0 q-4,-30 4,-52" stroke="#8a6d4a" stroke-width="5" fill="none"/><path d="M4,-52 q-20,-6 -30,8 M4,-52 q20,-8 30,6 M4,-52 q-8,-18 -22,-20 M4,-52 q10,-18 24,-16" stroke="#3e8a4a" stroke-width="6" fill="none" stroke-linecap="round"/></g>`).join("");
  if (c.sc === "snow") s += `<g fill="#fff" opacity=".9">${Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 71) % 400}" cy="${(i * 37) % 170 + 10}" r="1.8"/>`).join("")}</g>`;
  // せんろ
  s += `<rect x="0" y="236" width="400" height="5" fill="#8a8a8a"/><g fill="#7a5b3a">${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 20 + 4}" y="234" width="8" height="10"/>`).join("")}</g>`;

  const spot = (k, x, y, r, inner) =>
    `<g class="spot${found[k] ? " found" : ""}" data-k="${k}" transform="translate(${x} ${y})" role="button" aria-label="${SPOT_NAME[k]}">` +
    `<circle class="hit" r="${r}"/>${inner}<g class="spark"><circle r="9" cx="${r * 0.6}" cy="${-r * 0.6}"/><text x="${r * 0.6}" y="${-r * 0.6}" text-anchor="middle" dominant-baseline="central">？</text></g>` +
    `<g class="check"><circle r="8" cx="${r * 0.6}" cy="${-r * 0.6}"/><text x="${r * 0.6}" y="${-r * 0.6}" text-anchor="middle" dominant-baseline="central">✓</text></g></g>`;

  const bld = (BUILDINGS[c.bld.e] || BUILDINGS.church)();
  s += spot("bld", X(95), 140, 62, `<g transform="translate(-60 -50) scale(1.2)">${bld}</g>`);
  s += spot("hi", X(205), 178, 34, `<g transform="${flip ? "scale(-1 1)" : ""}">${personSVG(c.id)}</g><g class="bubble" transform="translate(${flip ? -30 : 30} -48)"><rect x="-24" y="-12" width="48" height="22" rx="10" fill="#fff" stroke="${col}" stroke-width="2"/><text y="0" font-size="13" text-anchor="middle" dominant-baseline="central">💬</text></g>`);
  s += spot("food", X(290), 186, 34, stallSVG(c.food.e, col));
  s += spot("ani", X(355), 206, 30, emo(c.ani.e, 0, 0, 40));
  s += spot("ride", X(250), 226, 30, rideSVG(c.ride.e));
  return s + `</svg>`;
}

const SPOT_NAME = { hi: "あいさつ", food: "たべもの", bld: "たてもの", ani: "どうぶつ", ride: "のりもの" };
const SPOT_EMO = { hi: "💬", food: "🍽️", bld: "🏛️", ani: "🐾", ride: "🚆" };
