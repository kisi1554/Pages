"use strict";

/* かんじタマゴ - モンスターの絵
 *
 * monsterSVG(id) が、その子の SVG（文字列）を返す。viewBox は 0 0 200 200。
 * 絵はぜんぶ手描きのパス。外部の画像もフォントも使わない。
 * からだの一部に、その子の漢字が小さくプリントされている（KANJI_PATH を使用）。
 */

/* 漢字プリント。100x100 の字形を、好きな場所に好きな大きさで置く */
function kprint(kanji, x, y, size, color, rot, op) {
  const s = size / 100;
  return '<g transform="translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ') scale(' + s.toFixed(3) + ')"' +
         ' opacity="' + (op == null ? 0.9 : op) + '">' +
         '<path d="' + KANJI_PATH[kanji] + '" transform="translate(-50,-50)" fill="' + color + '"/></g>';
}

/* まんまるな目（白目・黒目・ハイライト） */
function eye(x, y, r, look) {
  const dx = (look || 0) * r * 0.18;
  return '<g><ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.06).toFixed(1) + '" fill="#fff" stroke="#2a2118" stroke-width="2.4"/>' +
         '<circle cx="' + (x + dx).toFixed(1) + '" cy="' + (y + r * 0.12).toFixed(1) + '" r="' + (r * 0.52).toFixed(1) + '" fill="#241d16"/>' +
         '<circle cx="' + (x + dx - r * 0.22).toFixed(1) + '" cy="' + (y - r * 0.22).toFixed(1) + '" r="' + (r * 0.2).toFixed(1) + '" fill="#fff"/>' +
         '<circle cx="' + (x + dx + r * 0.2).toFixed(1) + '" cy="' + (y + r * 0.4).toFixed(1) + '" r="' + (r * 0.1).toFixed(1) + '" fill="#fff" opacity=".7"/></g>';
}

/* にっこり口（あけた口） */
function smile(x, y, w, h, ink) {
  return '<path d="M' + (x - w) + ' ' + y + ' Q' + x + ' ' + (y + h) + ' ' + (x + w) + ' ' + y +
         ' Q' + x + ' ' + (y + h * 0.34) + ' ' + (x - w) + ' ' + y + ' Z" fill="#7a2f3a" stroke="' + ink +
         '" stroke-width="2.2" stroke-linejoin="round"/>' +
         '<path d="M' + (x - w * 0.45) + ' ' + (y + h * 0.62) + ' Q' + x + ' ' + (y + h * 1.05) + ' ' +
         (x + w * 0.45) + ' ' + (y + h * 0.62) + ' Q' + x + ' ' + (y + h * 0.78) + ' ' + (x - w * 0.45) + ' ' +
         (y + h * 0.62) + ' Z" fill="#f2879a"/>';
}

function cheek(x, y, r, color) {
  return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 0.72) + '" fill="' + color + '" opacity=".55"/>';
}

/* ============================================================
 * 部品でつくる モンスター
 *
 *   ART（data.js）に 1ひき1行の レシピが 書いてある。
 *     b … からだの かたち   p … いろ   f … かざり（つの・はっぱ・しっぽ…）
 *   それを この下の 部品で 組み立てる。えがきかたは 手描きの5ひきと そろえてある。
 * ============================================================ */

/* いろのセット l=あかるい m=まんなか d=くらい ink=せん */
const PAL = {
  red:    { l: '#ffa895', m: '#ea5a3c', d: '#a83218', ink: '#5e1a10' },
  orange: { l: '#ffc98c', m: '#f4832a', d: '#b4560e', ink: '#5f2f08' },
  gold:   { l: '#ffe8a4', m: '#f0b62f', d: '#a97a06', ink: '#5f4405' },
  yellow: { l: '#fff6b8', m: '#f7d94a', d: '#bb9c10', ink: '#5f5008' },
  green:  { l: '#aeea96', m: '#58b350', d: '#2d7a34', ink: '#1d4a1e' },
  teal:   { l: '#a4efd9', m: '#33b39a', d: '#14786a', ink: '#0d3f38' },
  blue:   { l: '#a8e5fb', m: '#45b4e8', d: '#1a7fbe', ink: '#0e4f76' },
  sky:    { l: '#cdeeff', m: '#6bc0f2', d: '#2b83c4', ink: '#124a72' },
  navy:   { l: '#9dc0ec', m: '#4a72ac', d: '#27436f', ink: '#141f38' },
  purple: { l: '#ddc0f5', m: '#9a63cf', d: '#653a94', ink: '#33194f' },
  pink:   { l: '#ffcedd', m: '#f785a8', d: '#c9436e', ink: '#7a1f3a' },
  brown:  { l: '#dcae7a', m: '#ac7440', d: '#7d4f27', ink: '#4b2f16' },
  sand:   { l: '#f0dcb0', m: '#c8a86a', d: '#8f7231', ink: '#4f3d14' },
  gray:   { l: '#e2e8ef', m: '#98a5b4', d: '#5d6874', ink: '#2c333c' },
  snow:   { l: '#ffffff', m: '#eaf0f6', d: '#b3c0cd', ink: '#5a636d' }
};

function grad(P) {
  return '<defs><radialGradient id="bg" cx="35%" cy="26%" r="84%">' +
    '<stop offset="0" stop-color="' + P.l + '"/><stop offset=".55" stop-color="' + P.m + '"/>' +
    '<stop offset="1" stop-color="' + P.d + '"/></radialGradient>' +
    '<linearGradient id="bg2" x1="0" y1="0" x2=".4" y2="1">' +
    '<stop offset="0" stop-color="' + P.l + '"/><stop offset="1" stop-color="' + P.d + '"/></linearGradient></defs>';
}

const SK = (P, w) => ' fill="url(#bg)" stroke="' + P.ink + '" stroke-width="' + (w || 5) + '" stroke-linejoin="round"';
const SK2 = (P, w) => ' fill="url(#bg2)" stroke="' + P.ink + '" stroke-width="' + (w || 4) + '" stroke-linejoin="round"';

/* ---------------- からだ ----------------
 * それぞれ { svg, face:{x,y,r,g}, print:{x,y,s} } を返す。
 *   face … 目の まんなか(x,y)・大きさr・目と目の あいだg
 *   print… 漢字プリントの ばしょと 大きさ
 */
const BODY = {
  /* まるい からだ */
  blob: (P) => ({
    svg: '<path d="M100 42 C 140 42 162 74 162 116 C 162 158 136 182 100 182 C 64 182 38 158 38 116' +
         ' C 38 74 60 42 100 42 Z"' + SK(P) + '/>',
    face: { x: 100, y: 108, r: 18, g: 23 }, print: { x: 100, y: 166, s: 23 }
  }),
  /* たまご型（せが たかい） */
  tall: (P) => ({
    svg: '<path d="M100 34 C 134 34 152 76 152 118 C 152 158 130 184 100 184 C 70 184 48 158 48 118' +
         ' C 48 76 66 34 100 34 Z"' + SK(P) + '/>',
    face: { x: 100, y: 104, r: 17, g: 21 }, print: { x: 100, y: 162, s: 22 }
  }),
  /* しかく（本・字・校 など） */
  box: (P) => ({
    svg: '<rect x="42" y="52" width="116" height="126" rx="24"' + SK(P) + '/>',
    face: { x: 100, y: 102, r: 17, g: 23 }, print: { x: 100, y: 160, s: 23 }
  }),
  /* よこながの ずんぐり（一・二・上下 など） */
  bar: (P) => ({
    svg: '<rect x="26" y="66" width="148" height="104" rx="34"' + SK(P) + '/>',
    face: { x: 100, y: 104, r: 17, g: 25 }, print: { x: 100, y: 152, s: 21 }
  }),
  /* まんまる（円・玉・百 など） */
  disc: (P) => ({
    svg: '<circle cx="100" cy="112" r="66"' + SK(P) + '/>',
    face: { x: 100, y: 98, r: 17, g: 23 }, print: { x: 100, y: 152, s: 22 }
  }),
  /* しずく（水・川 など） */
  drop: (P) => ({
    svg: '<path d="M100 30 C 126 72 166 100 166 132 C 166 162 136 184 100 184 C 64 184 34 162 34 132' +
         ' C 34 100 74 72 100 30 Z"' + SK(P) + '/>',
    face: { x: 100, y: 116, r: 18, g: 22 }, print: { x: 100, y: 166, s: 21 }
  }),
  /* 山がた（山・土・石 など） */
  mound: (P) => ({
    svg: '<path d="M22 170 C 28 130 50 92 76 62 C 87 49 94 42 100 42 C 106 42 114 49 125 62' +
         ' C 151 92 173 130 179 170 C 142 181 58 181 22 170 Z"' + SK(P) + '/>',
    face: { x: 100, y: 122, r: 17, g: 22 }, print: { x: 100, y: 164, s: 22 }
  }),
  /* ほし（星・七 など） */
  star: (P) => ({
    svg: '<path d="M100 26 L 121 84 L 182 86 L 134 122 L 151 180 L 100 146 L 49 180 L 66 122' +
         ' L 18 86 L 79 84 Z"' + SK(P) + '/>',
    face: { x: 100, y: 104, r: 15, g: 20 }, print: { x: 100, y: 140, s: 20 }
  }),
  /* くも（空・天・気 など） */
  cloud: (P) => ({
    svg: '<path d="M62 168 C 34 168 20 148 24 128 C 27 112 40 102 54 102 C 54 78 74 60 98 60' +
         ' C 120 60 138 74 142 94 C 164 94 180 112 180 132 C 180 154 162 168 140 168 Z"' + SK(P) + '/>',
    face: { x: 100, y: 114, r: 17, g: 22 }, print: { x: 100, y: 152, s: 20 }
  }),
  /* ほのお（火 など） */
  flame: (P) => ({
    svg: '<path d="M100 24 C 118 56 150 70 150 112 C 150 154 128 182 100 182 C 72 182 50 154 50 112' +
         ' C 50 78 76 66 84 40 C 92 52 96 58 100 24 Z"' + SK(P) + '/>',
    face: { x: 100, y: 120, r: 17, g: 21 }, print: { x: 100, y: 160, s: 21 }
  }),
  /* よつあしの けもの（犬 など） */
  beast: (P) => ({
    svg: '<g' + SK2(P, 4.4) + '><rect x="76" y="146" width="20" height="34" rx="9"/>' +
         '<rect x="128" y="146" width="20" height="34" rx="9"/></g>' +
         '<ellipse cx="116" cy="122" rx="52" ry="40"' + SK(P) + '/>' +
         '<circle cx="66" cy="86" r="38"' + SK(P) + '/>',
    face: { x: 66, y: 82, r: 14, g: 17 }, print: { x: 136, y: 124, s: 24 }
  }),
  /* とり */
  bird: (P) => ({
    svg: '<path d="M108 44 C 148 44 172 78 172 118 C 172 156 144 180 106 180 C 68 180 40 156 40 120' +
         ' C 40 80 68 44 108 44 Z"' + SK(P) + '/>',
    face: { x: 96, y: 104, r: 16, g: 21 }, print: { x: 100, y: 154, s: 22 }
  }),
  /* まるい むし（七・八・虫 など） */
  bug: (P) => ({
    svg: '<ellipse cx="100" cy="118" rx="62" ry="58"' + SK(P) + '/>',
    face: { x: 100, y: 102, r: 16, g: 22 }, print: { x: 100, y: 158, s: 21 }
  }),
  /* かい */
  shell: (P) => ({
    svg: '<path d="M100 176 C 44 176 20 140 26 104 C 30 78 54 60 100 60 C 146 60 170 78 174 104' +
         ' C 180 140 156 176 100 176 Z"' + SK(P) + '/>',
    face: { x: 100, y: 112, r: 16, g: 22 }, print: { x: 100, y: 152, s: 20 }
  }),
  /* くき と はっぱ（草・竹・立 など） */
  stalk: (P) => ({
    svg: '<path d="M100 40 C 124 40 138 62 138 100 C 138 150 126 182 100 182 C 74 182 62 150 62 100' +
         ' C 62 62 76 40 100 40 Z"' + SK(P) + '/>',
    face: { x: 100, y: 108, r: 15, g: 19 }, print: { x: 100, y: 156, s: 20 }
  })
};

/* ---------------- かざり ----------------
 * (P, B) を もらって { back, front } を 返す。back は からだの うしろに おく。
 */
const PART = {
  /* からだの しま（数の なかま） */
  bar1: (P, B) => ({ front: line(P, [[74, 80, 126, 80]], 7) }),
  bar2: (P, B) => ({ front: line(P, [[76, 72, 124, 72], [76, 86, 124, 86]], 6) }),
  bar3: (P, B) => ({ front: line(P, [[78, 68, 122, 68], [74, 79, 126, 79], [80, 90, 120, 90]], 5) }),
  cross: (P, B) => ({ front: line(P, [[100, 64, 100, 94], [82, 79, 118, 79]], 7) }),
  dots7: (P, B) => ({
    front: '<g fill="' + P.ink + '" opacity=".8"><circle cx="58" cy="116" r="7"/><circle cx="142" cy="116" r="7"/>' +
      '<circle cx="52" cy="146" r="6.5"/><circle cx="148" cy="146" r="6.5"/><circle cx="66" cy="172" r="6"/>' +
      '<circle cx="134" cy="172" r="6"/><circle cx="100" cy="132" r="6"/></g>'
  }),
  stripe: (P, B) => ({
    front: '<g fill="' + P.ink + '" opacity=".55"><rect x="60" y="68" width="80" height="9" rx="4"/>' +
      '<rect x="64" y="84" width="72" height="9" rx="4"/></g>'
  }),

  /* あたま */
  leaf1: (P, B) => ({ back: '<path d="M100 14 C 122 22 132 42 126 60 C 108 66 92 52 90 34 C 89 24 94 18 100 14 Z"' + leafSK() + '/>' }),
  leaf3: (P, B) => ({
    back: '<g' + leafSK() + '><path d="M100 12 C 120 22 128 42 122 58 C 106 64 92 50 90 32 C 89 22 94 16 100 12 Z"/>' +
      '<path d="M56 30 C 78 28 96 42 100 60 C 84 74 60 70 48 56 C 41 48 46 34 56 30 Z"/>' +
      '<path d="M144 30 C 122 28 104 42 100 60 C 116 74 140 70 152 56 C 159 48 154 34 144 30 Z"/></g>'
  }),
  flameTop: (P, B) => ({
    back: '<g fill="#ff8a2b" stroke="#a4400a" stroke-width="3.6" stroke-linejoin="round">' +
      '<path d="M100 8 C 116 34 130 44 130 60 C 130 76 116 86 100 86 C 84 86 70 76 70 60' +
      ' C 70 44 84 34 100 8 Z"/></g><path d="M100 34 C 108 50 114 56 114 64 C 114 73 108 78 100 78' +
      ' C 92 78 86 73 86 64 C 86 56 92 50 100 34 Z" fill="#ffe06a"/>'
  }),
  splash: (P, B) => ({
    back: '<g' + SK(P, 3.6) + '><path d="M100 10 C 106 22 112 28 112 34 C 112 41 106 46 100 46' +
      ' C 94 46 88 41 88 34 C 88 28 94 22 100 10 Z"/>' +
      '<path d="M64 32 C 68 40 72 44 72 49 C 72 54 68 58 64 58 C 59 58 56 54 56 49 C 56 44 60 40 64 32 Z"/>' +
      '<path d="M136 32 C 140 40 144 44 144 49 C 144 54 140 58 136 58 C 131 58 128 54 128 49 C 128 44 132 40 136 32 Z"/></g>'
  }),
  snowcap: (P, B) => ({
    front: '<path d="M100 42 C 108 42 116 49 128 64 C 136 74 142 84 146 92 C 138 96 132 88 124 92' +
      ' C 116 96 110 86 102 90 C 94 94 88 84 80 89 C 72 94 66 88 58 90 C 64 80 72 70 80 60' +
      ' C 91 48 96 42 100 42 Z" fill="#ffffff" stroke="' + P.ink + '" stroke-width="3.2" stroke-linejoin="round"/>'
  }),
  crown: (P, B) => ({
    back: '<path d="M60 52 L 72 22 L 88 44 L 100 14 L 112 44 L 128 22 L 140 52 Z" fill="#f7d94a"' +
      ' stroke="#8a6a10" stroke-width="4" stroke-linejoin="round"/>' +
      '<g fill="#e8503a" stroke="#8a6a10" stroke-width="2"><circle cx="72" cy="30" r="5"/>' +
      '<circle cx="100" cy="22" r="5"/><circle cx="128" cy="30" r="5"/></g>'
  }),
  cap: (P, B) => ({
    back: '<path d="M46 56 C 46 30 70 16 100 16 C 130 16 154 30 154 56 Z" fill="#3a5a8c"' +
      ' stroke="#1d2f4d" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M34 56 C 34 50 44 46 100 46 C 156 46 166 50 166 56 C 166 62 156 66 100 66' +
      ' C 44 66 34 62 34 56 Z" fill="#4a6ea8" stroke="#1d2f4d" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="18" r="7" fill="#f7d94a" stroke="#1d2f4d" stroke-width="3"/>'
  }),
  ribbon: (P, B) => ({
    back: '<g fill="#f785a8" stroke="#a8305a" stroke-width="3.6" stroke-linejoin="round">' +
      '<path d="M100 44 C 84 26 60 24 54 36 C 48 50 68 60 100 56 Z"/>' +
      '<path d="M100 44 C 116 26 140 24 146 36 C 152 50 132 60 100 56 Z"/>' +
      '<circle cx="100" cy="50" r="10"/></g>'
  }),
  sunray: (P, B) => {
    let r = '';
    for (let i = 0; i < 12; i++) r += '<path d="M100 112 L 92 12 L 108 12 Z" fill="#ffd75e" stroke="#c98f04"' +
      ' stroke-width="2.5" stroke-linejoin="round" transform="rotate(' + (i * 30) + ' 100 112)"/>';
    return { back: r };
  },
  moonC: (P, B) => ({
    back: '<path d="M136 8 C 118 12 106 28 106 46 C 106 66 120 82 138 84 C 128 94 110 96 96 88' +
      ' C 76 76 70 48 82 28 C 92 12 116 4 136 8 Z" fill="#ffeaa8" stroke="#a8860a"' +
      ' stroke-width="3.6" stroke-linejoin="round"/>'
  }),
  raincloud: (P, B) => ({
    back: '<path d="M62 62 C 44 62 34 50 36 38 C 39 26 50 20 60 22 C 64 8 80 2 94 8 C 104 12 110 20 110 28' +
      ' C 126 24 140 34 140 48 C 140 58 132 64 122 64 Z" fill="#dbe6f0" stroke="#5f7186" stroke-width="4"' +
      ' stroke-linejoin="round"/>',
    front: '<g fill="#5ab6f0" stroke="#1f6fa8" stroke-width="2.4"><path d="M62 74 C 66 82 68 86 68 89' +
      ' C 68 93 65 96 62 96 C 58 96 56 93 56 89 C 56 86 58 82 62 74 Z"/>' +
      '<path d="M138 74 C 142 82 144 86 144 89 C 144 93 141 96 138 96 C 134 96 132 93 132 89' +
      ' C 132 86 134 82 138 74 Z"/></g>'
  }),
  sparkTop: (P, B) => ({
    front: '<g fill="#fff3b0" stroke="' + P.ink + '" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M100 16 l7 16 16 7 -16 7 -7 16 -7 -16 -16 -7 16 -7 Z"/>' +
      '<path d="M46 46 l5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5 Z" opacity=".85"/>' +
      '<path d="M154 46 l5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5 Z" opacity=".85"/></g>'
  }),
  hornTwo: (P, B) => ({
    back: '<g fill="#f6e3c0" stroke="' + P.ink + '" stroke-width="3.6" stroke-linejoin="round">' +
      '<path d="M70 46 C 62 28 64 16 72 14 C 80 14 86 28 88 46 Z"/>' +
      '<path d="M130 46 C 138 28 136 16 128 14 C 120 14 114 28 112 46 Z"/></g>'
  }),
  earsCat: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M52 62 C 46 34 52 22 62 26 C 74 30 82 46 84 60 Z"/>' +
      '<path d="M148 62 C 154 34 148 22 138 26 C 126 30 118 46 116 60 Z"/></g>',
    front: '<g fill="#f2a5b4" opacity=".85"><path d="M58 56 C 55 40 58 32 63 34 C 70 37 74 47 75 55 Z"/>' +
      '<path d="M142 56 C 145 40 142 32 137 34 C 130 37 126 47 125 55 Z"/></g>'
  }),
  earsLong: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><ellipse cx="66" cy="34" rx="13" ry="30" transform="rotate(-14 66 34)"/>' +
      '<ellipse cx="134" cy="34" rx="13" ry="30" transform="rotate(14 134 34)"/></g>'
  }),
  earsRound: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><circle cx="56" cy="60" r="20"/><circle cx="144" cy="60" r="20"/></g>'
  }),
  beastEars: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M44 58 C 38 32 46 22 56 28 C 66 34 70 48 70 60 Z"/>' +
      '<path d="M88 54 C 92 30 86 20 76 24 C 68 28 64 42 64 54 Z"/></g>'
  }),
  bigEar: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M44 62 C 24 66 16 92 24 116 C 30 134 44 142 56 136 Z"/>' +
      '<path d="M156 62 C 176 66 184 92 176 116 C 170 134 156 142 144 136 Z"/></g>'
  }),
  antenna: (P, B) => ({
    back: '<g fill="none" stroke="' + P.ink + '" stroke-width="4.5" stroke-linecap="round">' +
      '<path d="M84 48 C 76 30 70 22 62 16"/><path d="M116 48 C 124 30 130 22 138 16"/></g>' +
      '<g fill="' + P.m + '" stroke="' + P.ink + '" stroke-width="3"><circle cx="60" cy="14" r="8"/>' +
      '<circle cx="140" cy="14" r="8"/></g>'
  }),

  /* からだの まわり */
  armsShort: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M40 122 C 22 118 12 130 18 142 C 24 152 40 150 44 140 Z"/>' +
      '<path d="M160 122 C 178 118 188 130 182 142 C 176 152 160 150 156 140 Z"/></g>'
  }),
  handWave: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M44 118 C 26 104 12 106 10 118 C 8 130 24 138 40 134 Z"/>' +
      '<path d="M158 124 C 176 122 188 132 184 144 C 180 154 164 152 156 142 Z"/></g>'
  }),
  feetTwo: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><ellipse cx="76" cy="182" rx="20" ry="13"/><ellipse cx="124" cy="182" rx="20" ry="13"/></g>'
  }),
  legsShort: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><rect x="66" y="160" width="22" height="30" rx="11"/>' +
      '<rect x="112" y="160" width="22" height="30" rx="11"/></g>'
  }),
  tailWave: (P, B) => ({
    back: '<path d="M158 146 C 178 138 190 146 194 158 C 184 156 176 160 172 168 C 168 158 164 150 158 146 Z"' +
      SK2(P, 3.6) + '/>'
  }),
  tailFluff: (P, B) => ({
    back: '<path d="M156 128 C 180 118 194 132 190 152 C 186 170 172 178 160 172 C 172 162 174 144 156 140 Z"' +
      SK2(P, 4) + '/>'
  }),
  wingsBee: (P, B) => ({
    back: '<g fill="#eaf6ff" stroke="#6f8fa8" stroke-width="3" opacity=".9">' +
      '<ellipse cx="52" cy="76" rx="30" ry="18" transform="rotate(-28 52 76)"/>' +
      '<ellipse cx="148" cy="76" rx="30" ry="18" transform="rotate(28 148 76)"/></g>'
  }),
  wingsBird: (P, B) => ({
    back: '<g' + SK2(P, 4) + '><path d="M44 108 C 18 100 6 116 14 134 C 22 150 44 148 52 134 Z"/>' +
      '<path d="M156 108 C 182 100 194 116 186 134 C 178 150 156 148 148 134 Z"/></g>'
  }),
  shellLines: (P, B) => ({
    front: '<g fill="none" stroke="' + P.ink + '" stroke-width="3" opacity=".45" stroke-linecap="round">' +
      '<path d="M84 138 C 74 150 66 162 62 172"/><path d="M100 140 C 100 154 100 166 100 178"/>' +
      '<path d="M116 138 C 126 150 134 162 138 172"/></g>'
  }),
  bamboo: (P, B) => ({
    front: '<g fill="none" stroke="' + P.ink + '" stroke-width="4" opacity=".5" stroke-linecap="round">' +
      '<path d="M66 96 L 134 96"/><path d="M64 136 L 136 136"/></g>'
  }),
  grass: (P, B) => ({
    front: '<g fill="none" stroke="#4f9f34" stroke-width="4" stroke-linecap="round">' +
      '<path d="M38 178 C 34 168 34 158 36 152"/><path d="M48 180 C 48 170 50 160 54 154"/>' +
      '<path d="M152 180 C 150 170 150 160 152 154"/><path d="M162 178 C 164 168 166 160 170 155"/></g>'
  }),
  wheels: (P, B) => ({
    front: '<g fill="#3a3a44" stroke="' + P.ink + '" stroke-width="4"><circle cx="66" cy="172" r="20"/>' +
      '<circle cx="134" cy="172" r="20"/></g><g fill="#d8dee6"><circle cx="66" cy="172" r="8"/>' +
      '<circle cx="134" cy="172" r="8"/></g>'
  }),
  window: (P, B) => ({
    front: '<g fill="#cfe6f7" stroke="' + P.ink + '" stroke-width="3.4" stroke-linejoin="round">' +
      '<rect x="46" y="126" width="28" height="26" rx="5"/><rect x="126" y="126" width="28" height="26" rx="5"/></g>'
  }),
  note: (P, B) => ({
    front: '<g fill="' + P.ink + '"><ellipse cx="60" cy="150" rx="10" ry="8" transform="rotate(-20 60 150)"/>' +
      '<rect x="67" y="118" width="4.5" height="30" rx="2"/>' +
      '<ellipse cx="136" cy="158" rx="9" ry="7" transform="rotate(-20 136 158)"/>' +
      '<rect x="142" y="128" width="4" height="28" rx="2"/></g>'
  }),
  arrowUp: (P, B) => ({
    front: '<path d="M100 106 L 124 138 L 108 138 L 108 158 L 92 158 L 92 138 L 76 138 Z" fill="#fff"' +
      ' stroke="' + P.ink + '" stroke-width="3.4" stroke-linejoin="round" opacity=".9"/>'
  }),
  arrowDown: (P, B) => ({
    front: '<path d="M100 162 L 76 130 L 92 130 L 92 108 L 108 108 L 108 130 L 124 130 Z" fill="#fff"' +
      ' stroke="' + P.ink + '" stroke-width="3.4" stroke-linejoin="round" opacity=".9"/>'
  }),
  arrowLeft: (P, B) => ({
    front: '<path d="M30 132 L 62 110 L 62 124 L 84 124 L 84 140 L 62 140 L 62 154 Z" fill="#fff"' +
      ' stroke="' + P.ink + '" stroke-width="3.4" stroke-linejoin="round" opacity=".9"/>'
  }),
  arrowRight: (P, B) => ({
    front: '<path d="M170 132 L 138 154 L 138 140 L 116 140 L 116 124 L 138 124 L 138 110 Z" fill="#fff"' +
      ' stroke="' + P.ink + '" stroke-width="3.4" stroke-linejoin="round" opacity=".9"/>'
  }),
  sleepZ: (P, B) => ({
    front: '<g fill="' + P.ink + '" opacity=".75" font-family="sans-serif" font-weight="700">' +
      '<text x="150" y="52" font-size="26">Z</text><text x="172" y="30" font-size="18">z</text></g>'
  }),
  speed: (P, B) => ({
    back: '<g fill="none" stroke="' + P.m + '" stroke-width="6" stroke-linecap="round" opacity=".7">' +
      '<path d="M14 96 L 44 96"/><path d="M6 122 L 40 122"/><path d="M16 148 L 44 148"/></g>'
  }),
  thread: (P, B) => ({
    front: '<g fill="none" stroke="' + P.ink + '" stroke-width="3" opacity=".5">' +
      '<path d="M56 108 C 64 122 56 136 64 152"/><path d="M144 108 C 136 122 144 136 136 152"/>' +
      '<path d="M100 62 C 108 74 92 84 100 96"/></g>'
  }),
  stone: (P, B) => ({
    front: '<g fill="' + P.ink + '" opacity=".28"><ellipse cx="72" cy="140" rx="14" ry="10" transform="rotate(-16 72 140)"/>' +
      '<ellipse cx="132" cy="152" rx="11" ry="8" transform="rotate(12 132 152)"/></g>'
  }),
  coin: (P, B) => ({
    front: '<circle cx="100" cy="112" r="52" fill="none" stroke="' + P.ink + '" stroke-width="3.5" opacity=".45"/>'
  })
};

function line(P, segs, w) {
  return '<g fill="none" stroke="' + P.ink + '" stroke-width="' + w + '" stroke-linecap="round" opacity=".55">' +
    segs.map((s) => '<path d="M' + s[0] + ' ' + s[1] + ' L ' + s[2] + ' ' + s[3] + '"/>').join('') + '</g>';
}
function leafSK() {
  return ' fill="#63c25a" stroke="#28642c" stroke-width="4" stroke-linejoin="round"';
}

/* レシピから 1ひきを 組み立てる */
function buildArt(spec) {
  const P = PAL[spec.p] || PAL.green;
  const B = BODY[spec.b] ? BODY[spec.b](P) : BODY.blob(P);
  let back = '', front = '';
  (spec.f || []).forEach((name) => {
    const fn = PART[name];
    if (!fn) return;
    const r = fn(P, B);
    if (typeof r.back === 'string') back += r.back;
    if (typeof r.front === 'string') front += r.front;
  });
  const f = spec.fc ? Object.assign({}, B.face, spec.fc) : B.face;
  const face =
    eye(f.x - f.g, f.y, f.r, 1) + eye(f.x + f.g, f.y, f.r, -1) +
    cheek(f.x - f.g - f.r * 0.9, f.y + f.r * 1.1, f.r * 0.62, P.d) +
    cheek(f.x + f.g + f.r * 0.9, f.y + f.r * 1.1, f.r * 0.62, P.d) +
    smile(f.x, f.y + f.r * 1.5, f.r * 0.78 * (spec.mo || 1), f.r * 0.62 * (spec.mo || 1), P.ink);
  const pr = spec.pr ? Object.assign({}, B.print, spec.pr) : B.print;
  const badge = '<ellipse cx="' + pr.x + '" cy="' + pr.y + '" rx="' + (pr.s * 0.95) + '" ry="' +
    (pr.s * 0.62) + '" fill="#fffaf0" opacity=".85"/>' + kprint(spec.k, pr.x, pr.y, pr.s, P.d, 0, .95);
  return grad(P) + back + B.svg + face + front + badge;
}


const MONSTER_ART = {

  /* ヤマゴン（山）── いわの からだ、あたまに ゆき */
  yama: function () {
    const ink = '#4a3218';
    return '' +
      '<defs>' +
      '<radialGradient id="yama-b" cx="34%" cy="24%" r="86%">' +
      '<stop offset="0" stop-color="#c98f57"/><stop offset=".55" stop-color="#a9703f"/>' +
      '<stop offset="1" stop-color="#7b4c27"/></radialGradient>' +
      '<linearGradient id="yama-s" x1="0" y1="0" x2=".3" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8e6f0"/></linearGradient>' +
      '</defs>' +
      /* うで（いわ） */
      '<g fill="url(#yama-b)" stroke="' + ink + '" stroke-width="4.5" stroke-linejoin="round">' +
      '<path d="M30 132 C 12 128 6 142 12 152 C 18 162 34 160 38 150 Z"/>' +
      '<path d="M170 132 C 188 128 194 142 188 152 C 182 162 166 160 162 150 Z"/></g>' +
      /* からだ（山） */
      '<path d="M20 168 C 26 128 48 90 74 60 C 85 47 93 39 100 39 C 107 39 115 47 126 60 C 152 90 174 128 180 168' +
      ' C 142 180 58 180 20 168 Z" fill="url(#yama-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* ゆき */
      '<path d="M100 39 C 108 39 117 48 130 64 C 138 74 144 84 148 92 C 140 96 134 88 126 92' +
      ' C 118 96 112 86 104 90 C 96 94 90 84 82 89 C 74 94 68 88 60 90 C 66 80 74 70 82 60' +
      ' C 92 48 96 39 100 39 Z" fill="url(#yama-s)" stroke="' + ink + '" stroke-width="3.4" stroke-linejoin="round"/>' +
      /* いわのすじ */
      '<g fill="none" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round" opacity=".45">' +
      '<path d="M46 150 C 54 140 58 130 60 120"/><path d="M150 152 C 144 142 140 132 138 122"/>' +
      '<path d="M126 74 C 132 84 136 92 138 100"/></g>' +
      /* かお */
      '<g stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round" fill="none">' +
      '<path d="M62 100 L 82 106"/><path d="M138 100 L 118 106"/></g>' +
      eye(78, 122, 17, 1) + eye(122, 122, 17, -1) +
      cheek(56, 140, 11, '#e08a5a') + cheek(144, 140, 11, '#e08a5a') +
      smile(100, 146, 15, 12, ink) +
      /* 漢字プリント（おなか） */
      '<ellipse cx="100" cy="172" rx="22" ry="14" fill="#f6e3cd" opacity=".85"/>' +
      kprint('山', 100, 172, 22, '#5d3c1c', 0, .95) +
      /* くさ */
      '<g fill="none" stroke="#4f9f34" stroke-width="4" stroke-linecap="round">' +
      '<path d="M38 176 C 34 168 34 160 36 154"/><path d="M46 177 C 46 168 48 160 52 155"/>' +
      '<path d="M30 177 C 26 171 24 165 24 160"/>' +
      '<path d="M156 177 C 154 169 154 161 156 156"/><path d="M164 177 C 166 169 168 162 172 157"/></g>';
  },

  /* カワッピ（川）── 水の しずく */
  kawa: function () {
    const ink = '#0e4f76';
    return '' +
      '<defs>' +
      '<radialGradient id="kawa-b" cx="34%" cy="26%" r="82%">' +
      '<stop offset="0" stop-color="#9fe1fb"/><stop offset=".5" stop-color="#45b4e8"/>' +
      '<stop offset="1" stop-color="#1a7fbe"/></radialGradient></defs>' +
      /* あたまの しぶき */
      '<g fill="url(#kawa-b)" stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round">' +
      '<path d="M100 10 C 106 20 112 26 112 32 C 112 39 106 44 100 44 C 94 44 88 39 88 32 C 88 26 94 20 100 10 Z"/>' +
      '<path d="M66 30 C 70 37 74 41 74 46 C 74 51 70 55 66 55 C 61 55 58 51 58 46 C 58 41 62 37 66 30 Z"/>' +
      '<path d="M134 30 C 138 37 142 41 142 46 C 142 51 138 55 134 55 C 129 55 126 51 126 46 C 126 41 130 37 134 30 Z"/></g>' +
      /* からだ */
      '<path d="M100 48 C 126 84 168 108 168 138 C 168 166 138 186 100 186 C 62 186 32 166 32 138' +
      ' C 32 108 74 84 100 48 Z" fill="url(#kawa-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* 水のつや */
      '<path d="M74 78 C 62 92 54 106 54 120 C 62 108 70 94 82 84 Z" fill="#ffffff" opacity=".55"/>' +
      /* しっぽ（なみ） */
      '<path d="M164 150 C 178 144 186 150 190 158 C 182 156 176 158 172 164 C 170 158 168 154 164 150 Z"' +
      ' fill="url(#kawa-b)" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>' +
      /* かお */
      eye(80, 122, 19, 1) + eye(124, 122, 19, -1) +
      cheek(56, 142, 12, '#7fd3f7') + cheek(148, 142, 12, '#7fd3f7') +
      smile(102, 148, 14, 11, ink) +
      /* 漢字プリント（おなか） */
      '<ellipse cx="102" cy="172" rx="24" ry="14" fill="#eaf8ff" opacity=".9"/>' +
      kprint('川', 102, 172, 22, '#12628f', 0, .95);
  },

  /* キノスケ（木）── はっぱの あたま */
  ki: function () {
    const ink = '#4b2f16';
    return '' +
      '<defs>' +
      '<radialGradient id="ki-b" cx="34%" cy="26%" r="84%">' +
      '<stop offset="0" stop-color="#d3a06a"/><stop offset=".55" stop-color="#ac7440"/>' +
      '<stop offset="1" stop-color="#7d4f27"/></radialGradient>' +
      '<linearGradient id="ki-l" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="#77d16a"/><stop offset="1" stop-color="#37903c"/></linearGradient></defs>' +
      /* はっぱ */
      '<g fill="url(#ki-l)" stroke="#28642c" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M100 12 C 122 22 132 42 126 60 C 110 66 94 54 92 36 C 91 26 95 17 100 12 Z"/>' +
      '<path d="M50 28 C 74 26 94 40 98 60 C 82 74 58 70 46 56 C 39 48 42 34 50 28 Z"/>' +
      '<path d="M150 28 C 126 26 106 40 102 60 C 118 74 142 70 154 56 C 161 48 158 34 150 28 Z"/></g>' +
      '<g fill="none" stroke="#28642c" stroke-width="2" opacity=".7">' +
      '<path d="M104 20 C 110 34 114 48 114 58"/><path d="M56 36 C 70 42 84 52 94 62"/>' +
      '<path d="M144 36 C 130 42 116 52 106 62"/></g>' +
      /* うで（えだ） */
      '<g fill="none" stroke="' + ink + '" stroke-width="7" stroke-linecap="round">' +
      '<path d="M52 122 C 38 122 30 130 28 140"/><path d="M148 122 C 162 122 170 130 172 140"/></g>' +
      /* からだ（みき） */
      '<path d="M100 58 C 132 58 150 92 150 128 C 150 164 128 186 100 186 C 72 186 50 164 50 128' +
      ' C 50 92 68 58 100 58 Z" fill="url(#ki-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* みきのすじ */
      '<g fill="none" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round" opacity=".4">' +
      '<path d="M66 108 C 62 126 62 142 66 158"/><path d="M136 110 C 140 128 140 144 136 158"/></g>' +
      /* かお */
      eye(82, 118, 16, 1) + eye(120, 118, 16, -1) +
      cheek(62, 138, 11, '#e2925c') + cheek(140, 138, 11, '#e2925c') +
      smile(101, 142, 13, 11, ink) +
      /* 漢字プリント（みき） */
      '<ellipse cx="101" cy="168" rx="21" ry="13" fill="#f3ddc2" opacity=".85"/>' +
      kprint('木', 101, 168, 21, '#5b3818', 0, .95) +
      /* ね（あし） */
      '<g fill="url(#ki-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M66 180 C 58 186 54 190 56 194 C 64 194 74 190 78 184 Z"/>' +
      '<path d="M134 180 C 142 186 146 190 144 194 C 136 194 126 190 122 184 Z"/></g>';
  },

  /* ハナリン（花）── あたまが 花 */
  hana: function () {
    const ink = '#8d3455';
    let petals = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60;
      petals += '<ellipse cx="100" cy="52" rx="23" ry="30" fill="url(#hana-p)" stroke="' + ink +
                '" stroke-width="4" transform="rotate(' + a + ' 100 92)"/>';
    }
    return '' +
      '<defs>' +
      '<radialGradient id="hana-p" cx="40%" cy="26%" r="80%">' +
      '<stop offset="0" stop-color="#ffc2d5"/><stop offset=".55" stop-color="#f785a8"/>' +
      '<stop offset="1" stop-color="#e05c86"/></radialGradient>' +
      '<radialGradient id="hana-c" cx="36%" cy="28%" r="76%">' +
      '<stop offset="0" stop-color="#ffe89a"/><stop offset="1" stop-color="#f0b62f"/></radialGradient>' +
      '<linearGradient id="hana-g" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="#83cf6a"/><stop offset="1" stop-color="#3f8f3c"/></linearGradient></defs>' +
      /* くき と からだ */
      '<path d="M100 108 L 100 150" stroke="#3f8f3c" stroke-width="10" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="164" rx="38" ry="28" fill="url(#hana-g)" stroke="#2b6b2b" stroke-width="4.6"/>' +
      /* はっぱの うで */
      '<g fill="url(#hana-g)" stroke="#2b6b2b" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M64 152 C 44 142 26 146 20 156 C 30 168 50 170 64 162 Z"/>' +
      '<path d="M136 152 C 156 142 174 146 180 156 C 170 168 150 170 136 162 Z"/></g>' +
      /* 花びら */
      petals +
      /* 花の まんなか（かお） */
      '<circle cx="100" cy="92" r="34" fill="url(#hana-c)" stroke="' + ink + '" stroke-width="4.6"/>' +
      eye(88, 88, 12, 1) + eye(113, 88, 12, -1) +
      cheek(76, 104, 9, '#f38aa8') + cheek(125, 104, 9, '#f38aa8') +
      smile(100, 106, 10, 9, ink) +
      /* 漢字プリント（からだ） */
      '<ellipse cx="100" cy="166" rx="22" ry="14" fill="#eafbe2" opacity=".9"/>' +
      kprint('花', 100, 166, 22, '#2f6f2f', 0, .95);
  },

  /* ウマタロ（馬）── ずんぐり 子うま */
  uma: function () {
    const ink = '#5a3418';
    return '' +
      '<defs>' +
      '<radialGradient id="uma-b" cx="36%" cy="26%" r="84%">' +
      '<stop offset="0" stop-color="#eab98a"/><stop offset=".55" stop-color="#c8894f"/>' +
      '<stop offset="1" stop-color="#96602f"/></radialGradient>' +
      '<linearGradient id="uma-m" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="#8d5a2c"/><stop offset="1" stop-color="#5f3a17"/></linearGradient></defs>' +
      /* しっぽ */
      '<path d="M164 108 C 184 100 196 112 194 132 C 192 150 180 162 168 160 C 178 148 180 132 172 122' +
      ' C 168 117 166 112 164 108 Z" fill="url(#uma-m)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* あし */
      '<g fill="#a97141" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round" opacity=".9">' +
      '<rect x="88" y="146" width="18" height="30" rx="8"/><rect x="142" y="146" width="18" height="30" rx="8"/></g>' +
      '<g fill="url(#uma-b)" stroke="' + ink + '" stroke-width="4.4" stroke-linejoin="round">' +
      '<rect x="74" y="150" width="20" height="34" rx="9"/><rect x="100" y="152" width="20" height="32" rx="9"/>' +
      '<rect x="128" y="150" width="20" height="34" rx="9"/></g>' +
      '<g fill="#4a2c12">' +
      '<rect x="74" y="174" width="20" height="10" rx="5"/><rect x="100" y="174" width="20" height="10" rx="5"/>' +
      '<rect x="128" y="174" width="20" height="10" rx="5"/></g>' +
      /* どうたい */
      '<ellipse cx="116" cy="126" rx="54" ry="42" fill="url(#uma-b)" stroke="' + ink + '" stroke-width="5"/>' +
      /* たてがみ */
      '<path d="M104 40 C 88 50 78 72 80 96 C 84 112 92 118 100 116 C 92 104 92 86 100 72' +
      ' C 106 62 114 56 122 56 C 118 46 112 40 104 40 Z"' +
      ' fill="url(#uma-m)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* あたま */
      '<path d="M70 54 C 92 54 106 70 106 92 C 106 112 92 126 70 126 C 52 126 40 116 38 104' +
      ' C 30 102 26 96 28 90 C 30 84 36 82 42 84 C 46 66 56 54 70 54 Z"' +
      ' fill="url(#uma-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* みみ */
      '<g fill="url(#uma-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M58 58 C 54 44 58 36 64 38 C 70 40 74 50 74 58 Z"/>' +
      '<path d="M84 56 C 86 42 92 36 97 40 C 101 44 100 54 96 60 Z"/></g>' +
      /* はな と 口 */
      '<ellipse cx="42" cy="98" rx="16" ry="13" fill="#f6ddc2" stroke="' + ink + '" stroke-width="3.4"/>' +
      '<g fill="' + ink + '"><ellipse cx="36" cy="94" rx="3.2" ry="2.4"/><ellipse cx="47" cy="95" rx="3.2" ry="2.4"/></g>' +
      '<path d="M34 104 C 40 110 48 110 52 105" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>' +
      /* め */
      eye(62, 82, 14, -1) + eye(92, 84, 13, -1) +
      cheek(60, 104, 10, '#e0895a') +
      /* 漢字プリント（おしり） */
      '<ellipse cx="140" cy="126" rx="24" ry="18" fill="#f8e6cf" opacity=".85"/>' +
      kprint('馬', 140, 126, 26, '#6b4218', -6, .95);
  },

  /* ==================================================================
   * ここから下は 1ひきずつ 手で描いた子（部品の くみあわせを つかわない）。
   * かたちが かぶらないように、シルエットを ぜんぶ 変えてある。
   * ================================================================== */

  /* イチマル（一）── よこに な〜がい こいぬ。いまにも「ワン！」と ほえそう */
  ichi: function () {
    const ink = '#5a3a0c';
    return '' +
      '<defs>' +
      '<radialGradient id="ichi-b" cx="32%" cy="24%" r="88%">' +
      '<stop offset="0" stop-color="#ffeab4"/><stop offset=".5" stop-color="#f4c552"/>' +
      '<stop offset="1" stop-color="#bd8412"/></radialGradient>' +
      '<linearGradient id="ichi-e" x1="0" y1="0" x2=".3" y2="1">' +
      '<stop offset="0" stop-color="#e0a83a"/><stop offset="1" stop-color="#a2720c"/></linearGradient>' +
      '</defs>' +
      /* おくがわの みみ */
      '<path d="M84 62 C 100 66 108 88 104 108 C 100 122 86 122 82 110 C 78 94 78 76 84 62 Z"' +
      ' fill="#a2720c" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* しっぽ（うれしくて ぴん） */
      '<path d="M170 104 C 188 98 198 82 192 66 C 190 82 182 92 166 96 Z"' +
      ' fill="url(#ichi-e)" stroke="' + ink + '" stroke-width="4.2" stroke-linejoin="round"/>' +
      /* あし4本 */
      '<g fill="url(#ichi-e)" stroke="' + ink + '" stroke-width="4.4" stroke-linejoin="round">' +
      '<rect x="72" y="142" width="19" height="34" rx="9.5"/><rect x="102" y="144" width="19" height="34" rx="9.5"/>' +
      '<rect x="130" y="144" width="19" height="34" rx="9.5"/><rect x="156" y="142" width="19" height="34" rx="9.5"/></g>' +
      '<g fill="#7a5210"><rect x="72" y="166" width="19" height="10" rx="5"/>' +
      '<rect x="102" y="168" width="19" height="10" rx="5"/><rect x="130" y="168" width="19" height="10" rx="5"/>' +
      '<rect x="156" y="166" width="19" height="10" rx="5"/></g>' +
      /* からだ（よこながの どうたい） */
      '<path d="M74 100 C 112 88 156 90 174 104 C 190 116 188 144 168 152 C 138 162 86 160 66 150' +
      ' C 50 142 56 110 74 100 Z" fill="url(#ichi-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* くびわ */
      '<g transform="rotate(7 102 122)">' +
      '<rect x="94" y="92" width="16" height="62" rx="7" fill="#e05a3c" stroke="#8c2a12" stroke-width="3.6"/>' +
      '<circle cx="102" cy="156" r="8.5" fill="#ffd75e" stroke="#8c2a12" stroke-width="3"/></g>' +
      /* あたま */
      '<ellipse cx="62" cy="90" rx="37" ry="33" fill="url(#ichi-b)" stroke="' + ink + '"' +
      ' stroke-width="5"/>' +
      /* てまえの みみ（マズルより うしろに 描く） */
      '<path d="M52 60 C 38 66 30 88 34 108 C 38 122 52 122 56 110 C 60 92 58 74 52 60 Z"' +
      ' fill="url(#ichi-e)" stroke="' + ink + '" stroke-width="4.2" stroke-linejoin="round"/>' +
      '<path d="M48 72 C 42 84 40 96 42 106" fill="none" stroke="' + ink + '"' +
      ' stroke-opacity=".4" stroke-width="2.6" stroke-linecap="round"/>' +
      /* はなさき（マズル） */
      '<ellipse cx="40" cy="108" rx="23" ry="17" fill="#fbeccb" stroke="' + ink + '" stroke-width="4"/>' +
      /* あけた口（ワン！） */
      '<path d="M26 120 C 40 115 56 120 58 133 C 60 148 45 156 32 150 C 19 145 17 126 26 120 Z"' +
      ' fill="#7a2f3a" stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="M29 123 L 36 123 L 32 131 Z" fill="#fffaf0"/>' +
      '<path d="M47 125 L 54 126 L 49 133 Z" fill="#fffaf0"/>' +
      '<path d="M31 141 C 39 137 49 139 51 145 C 47 152 35 152 31 146 Z" fill="#f2879a"/>' +
      /* はな */
      '<path d="M26 92 C 36 87 48 90 50 98 C 52 107 41 112 32 108 C 24 105 20 96 26 92 Z"' +
      ' fill="#3d2708"/>' +
      '<ellipse cx="33" cy="95" rx="5" ry="3" fill="#8a7050" opacity=".75"/>' +
      /* あたまの け（一本） */
      '<path d="M66 58 C 64 42 70 32 80 30" fill="none" stroke="' + ink + '"' +
      ' stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="82" cy="29" r="5.5" fill="#f4c552" stroke="' + ink + '" stroke-width="3"/>' +
      /* ほえている しるし */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".5" stroke-width="3.4" stroke-linecap="round">' +
      '<path d="M8 108 C 4 116 4 128 8 136"/><path d="M16 148 C 12 154 10 158 10 162"/></g>' +
      eye(58, 84, 14, -1) + eye(86, 88, 12, -1) +
      cheek(74, 106, 9, '#c9821a') +
      /* せなかの 漢字プリント */
      '<ellipse cx="146" cy="120" rx="23" ry="14" fill="#fffaf0" opacity=".88"/>' +
      kprint('一', 146, 120, 26, '#6b4a08', 0, 1);
  },

  /* モリモリ（森）── 木が3本 あつまった もりの ぬし */
  mori: function () {
    const ink = '#173d22';
    return '' +
      '<defs>' +
      '<radialGradient id="mori-b" cx="34%" cy="26%" r="86%">' +
      '<stop offset="0" stop-color="#9de08a"/><stop offset=".5" stop-color="#4aa653"/>' +
      '<stop offset="1" stop-color="#1f6b33"/></radialGradient>' +
      '<radialGradient id="mori-t" cx="34%" cy="24%" r="82%">' +
      '<stop offset="0" stop-color="#b9edaa"/><stop offset=".5" stop-color="#5cbb5c"/>' +
      '<stop offset="1" stop-color="#2b7f38"/></radialGradient>' +
      '<linearGradient id="mori-w" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="#b98a52"/><stop offset="1" stop-color="#7a5228"/></linearGradient>' +
      '</defs>' +
      '<g fill="url(#mori-w)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M70 168 C 62 182 64 192 76 192 C 88 192 92 182 88 168 Z"/>' +
      '<path d="M124 168 C 116 182 118 192 130 192 C 142 192 146 182 142 168 Z"/></g>' +
      '<path d="M100 96 C 146 96 172 118 172 144 C 172 168 146 180 100 180 C 54 180 28 168 28 144' +
      ' C 28 118 54 96 100 96 Z" fill="url(#mori-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<g fill="url(#mori-t)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round">' +
      '<path d="M52 60 C 74 60 86 76 84 94 C 82 110 66 118 50 116 C 32 114 22 100 24 84 C 26 68 38 60 52 60 Z"/>' +
      '<path d="M148 60 C 126 60 114 76 116 94 C 118 110 134 118 150 116 C 168 114 178 100 176 84' +
      ' C 174 68 162 60 148 60 Z"/>' +
      '<path d="M100 16 C 126 16 142 36 140 60 C 138 84 120 96 100 96 C 80 96 62 84 60 60' +
      ' C 58 36 74 16 100 16 Z"/></g>' +
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".45" stroke-width="3" stroke-linecap="round">' +
      '<path d="M100 30 C 96 44 96 56 100 68"/><path d="M84 44 C 92 50 96 56 98 62"/>' +
      '<path d="M116 44 C 108 50 104 56 102 62"/><path d="M40 78 C 48 82 54 88 56 94"/>' +
      '<path d="M160 78 C 152 82 146 88 144 94"/></g>' +
      '<g transform="translate(138,20) rotate(8)">' +
      '<path d="M0 0 C 10 -6 22 -2 24 8 C 26 18 16 24 6 22 C -2 20 -6 10 0 0 Z" fill="#ffd75e"' +
      ' stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M24 8 L 34 6 L 26 15 Z" fill="#f4832a" stroke="' + ink + '" stroke-width="2"/>' +
      '<circle cx="10" cy="8" r="2.6" fill="' + ink + '"/></g>' +
      eye(80, 132, 15, 1) + eye(120, 132, 15, -1) +
      cheek(60, 150, 11, '#2a7a3c') + cheek(140, 150, 11, '#2a7a3c') +
      smile(100, 152, 13, 11, ink) +
      '<ellipse cx="100" cy="172" rx="22" ry="13" fill="#f2fbe8" opacity=".85"/>' +
      kprint('森', 100, 172, 21, '#1f6b33', 0, .95);
  },


  /* ツキミ（月）── みかづきの からだ。ねむそうな おつきさま */
  tsuki: function () {
    const ink = '#7d600d';
    return '' +
      '<defs>' +
      '<radialGradient id="tsuki-b" cx="30%" cy="70%" r="90%">' +
      '<stop offset="0" stop-color="#fffbe2"/><stop offset=".5" stop-color="#ffe07a"/>' +
      '<stop offset="1" stop-color="#d9a412"/></radialGradient>' +
      '<linearGradient id="tsuki-c" x1="0" y1="0" x2=".4" y2="1">' +
      '<stop offset="0" stop-color="#9ab8e8"/><stop offset="1" stop-color="#4f6ea8"/></linearGradient>' +
      '</defs>' +
      /* まわりの ほし */
      '<g fill="#fff3b0" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round">' +
      '<path d="M168 44 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z"/>' +
      '<path d="M28 44 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/>' +
      '<path d="M162 132 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/></g>' +
      /* みかづき */
      '<path d="M161.1 76.1 A 68 68 0 1 0 107.5 173.6 A 56 56 0 1 1 161.1 76.1 Z"' +
      ' fill="url(#tsuki-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* クレーター */
      '<g fill="#d9a412" opacity=".35">' +
      '<ellipse cx="120" cy="150" rx="13" ry="9"/><ellipse cx="52" cy="150" rx="9" ry="7"/>' +
      '<ellipse cx="44" cy="92" rx="8" ry="6"/></g>' +
      /* ナイトキャップ */
      '<g transform="rotate(-18 78 48)">' +
      '<path d="M52 56 C 56 30 72 16 92 20 C 106 24 110 40 104 58 Z" fill="url(#tsuki-c)"' +
      ' stroke="#2c4270" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M48 56 C 48 50 60 46 78 46 C 96 46 108 50 108 56 C 108 62 96 66 78 66' +
      ' C 60 66 48 62 48 56 Z" fill="#7f9ed6" stroke="#2c4270" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="94" cy="20" r="9" fill="#fff3b0" stroke="#2c4270" stroke-width="3"/></g>' +
      eye(54, 116, 14, 1, false, '#00000042', .52) + eye(84, 122, 14, -1, false, '#00000042', .52) +
      cheek(38, 134, 10, '#d9a412') + cheek(102, 140, 10, '#d9a412') +
      smile(68, 142, 11, 9, ink) +
      '<ellipse cx="100" cy="160" rx="21" ry="13" fill="#fffdf0" opacity=".85"/>' +
      kprint('月', 100, 160, 21, '#9c7508', 0, .95);
  },

  /* ヒナタ（日）── ふちが もこもこの おひさま */
  hi: function () {
    const ink = '#8a2f10';
    let d = '';
    for (let i = 0; i < 12; i++) {
      const a0 = (i * 30 - 90) * Math.PI / 180;
      const a1 = ((i + 1) * 30 - 90) * Math.PI / 180;
      const am = (a0 + a1) / 2;
      const x0 = (100 + 62 * Math.cos(a0)).toFixed(1), y0 = (100 + 62 * Math.sin(a0)).toFixed(1);
      const x1 = (100 + 62 * Math.cos(a1)).toFixed(1), y1 = (100 + 62 * Math.sin(a1)).toFixed(1);
      const xm = (100 + 88 * Math.cos(am)).toFixed(1), ym = (100 + 88 * Math.sin(am)).toFixed(1);
      d += (i ? '' : 'M' + x0 + ' ' + y0) + ' Q' + xm + ' ' + ym + ' ' + x1 + ' ' + y1;
    }
    d += ' Z';
    return '' +
      '<defs>' +
      '<radialGradient id="hi-r" cx="40%" cy="34%" r="72%">' +
      '<stop offset="0" stop-color="#ffe36a"/><stop offset=".55" stop-color="#ffa32b"/>' +
      '<stop offset="1" stop-color="#ef5a1c"/></radialGradient>' +
      '<radialGradient id="hi-b" cx="36%" cy="28%" r="80%">' +
      '<stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#ffc447"/>' +
      '<stop offset="1" stop-color="#f2802a"/></radialGradient>' +
      '</defs>' +
      /* もこもこの ひかり */
      '<path d="' + d + '" fill="url(#hi-r)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* うで */
      '<g fill="url(#hi-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M42 118 C 22 112 10 120 12 132 C 15 144 32 146 42 138 Z"/>' +
      '<path d="M158 118 C 178 112 190 120 188 132 C 185 144 168 146 158 138 Z"/></g>' +
      /* かおの まる */
      '<circle cx="100" cy="100" r="56" fill="url(#hi-b)" stroke="' + ink + '" stroke-width="4.5"/>' +
      eye(80, 92, 17, 1) + eye(120, 92, 17, -1) +
      cheek(58, 116, 13, '#e8551c') + cheek(142, 116, 13, '#e8551c') +
      smile(100, 118, 17, 15, ink) +
      '<ellipse cx="100" cy="146" rx="20" ry="12" fill="#fff6e0" opacity=".9"/>' +
      kprint('日', 100, 146, 20, '#c2400f', 0, .95);
  },

  /* ヒノコ（火）── まきの 上で もえている たき火の 子 */
  hinoko: function () {
    const ink = '#8c2a08';
    return '' +
      '<defs>' +
      '<radialGradient id="hino-b" cx="36%" cy="30%" r="84%">' +
      '<stop offset="0" stop-color="#ffd48a"/><stop offset=".45" stop-color="#f2812a"/>' +
      '<stop offset="1" stop-color="#c1400d"/></radialGradient>' +
      '<linearGradient id="hino-f" x1="0" y1="1" x2=".2" y2="0">' +
      '<stop offset="0" stop-color="#ff6a1e"/><stop offset=".55" stop-color="#ffa62b"/>' +
      '<stop offset="1" stop-color="#ffe36a"/></linearGradient>' +
      '<linearGradient id="hino-w" x1="0" y1="0" x2=".3" y2="1">' +
      '<stop offset="0" stop-color="#c08a52"/><stop offset="1" stop-color="#7d5324"/></linearGradient>' +
      '</defs>' +
      /* ほのおの かみ */
      '<path d="M100 12 C 116 44 138 56 138 88 C 138 108 122 122 100 122 C 78 122 62 108 62 88' +
      ' C 62 62 84 56 82 28 C 92 40 96 44 100 12 Z" fill="url(#hino-f)" stroke="' + ink + '"' +
      ' stroke-width="4.5" stroke-linejoin="round"/>' +
      '<path d="M100 46 C 110 66 120 74 120 90 C 120 102 111 110 100 110 C 89 110 80 102 80 90' +
      ' C 80 74 90 66 100 46 Z" fill="#fff0a0" opacity=".85"/>' +
      /* まき（2本） */
      '<g fill="url(#hino-w)" stroke="' + ink + '" stroke-width="4.2" stroke-linejoin="round">' +
      '<rect x="26" y="150" width="148" height="24" rx="12" transform="rotate(-7 100 162)"/>' +
      '<rect x="34" y="158" width="132" height="22" rx="11" transform="rotate(6 100 169)"/></g>' +
      '<g fill="#e0b884" stroke="' + ink + '" stroke-width="2.6">' +
      '<ellipse cx="32" cy="158" rx="6" ry="10" transform="rotate(-7 32 158)"/>' +
      '<ellipse cx="164" cy="171" rx="6" ry="10" transform="rotate(6 164 171)"/></g>' +
      /* からだ（おきび） */
      '<path d="M100 86 C 130 86 148 106 148 130 C 148 152 128 164 100 164 C 72 164 52 152 52 130' +
      ' C 52 106 70 86 100 86 Z" fill="url(#hino-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* こばな火 */
      '<g fill="#ffd75e" stroke="' + ink + '" stroke-width="2" opacity=".95">' +
      '<circle cx="34" cy="112" r="5"/><circle cx="22" cy="90" r="3.6"/>' +
      '<circle cx="168" cy="106" r="5"/><circle cx="180" cy="84" r="3.6"/></g>' +
      eye(83, 120, 15, 1) + eye(117, 120, 15, -1) +
      cheek(62, 138, 11, '#c1400d') + cheek(138, 138, 11, '#c1400d') +
      smile(100, 140, 13, 11, ink) +
      '<ellipse cx="100" cy="156" rx="19" ry="11.5" fill="#fff3dd" opacity=".85"/>' +
      kprint('火', 100, 156, 19, '#a5300a', 0, .95);
  },

  /* ワンタ（犬）── まるまる すわった、ふわふわの こいぬ */
  inu: function () {
    const ink = '#6b4420';
    return '' +
      '<defs>' +
      '<radialGradient id="wanta-b" cx="32%" cy="24%" r="88%">' +
      '<stop offset="0" stop-color="#fff6e6"/><stop offset=".55" stop-color="#f6e0bd"/>' +
      '<stop offset="1" stop-color="#d8b483"/></radialGradient>' +
      '<radialGradient id="wanta-e" cx="34%" cy="26%" r="84%">' +
      '<stop offset="0" stop-color="#e8b878"/><stop offset=".6" stop-color="#c68f4c"/>' +
      '<stop offset="1" stop-color="#93602a"/></radialGradient>' +
      '</defs>' +
      /* しっぽ（くるんと まいた） */
      '<path d="M158 148 C 180 152 190 138 184 122 C 178 130 168 134 158 132' +
      ' C 168 136 172 144 158 148 Z" fill="url(#wanta-e)" stroke="' + ink + '"' +
      ' stroke-width="4" stroke-linejoin="round"/>' +
      /* すわった うしろ足（ちょこっと） */
      '<g fill="url(#wanta-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="66" cy="178" rx="20" ry="12"/><ellipse cx="134" cy="178" rx="20" ry="12"/></g>' +
      /* からだ（まんまる・すわりポーズ） */
      '<path d="M100 68 C 142 68 166 100 166 138 C 166 168 138 186 100 186' +
      ' C 62 186 34 168 34 138 C 34 100 58 68 100 68 Z"' +
      ' fill="url(#wanta-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* もふもふの ふち（からだの まわりの ぷくぷく） */
      '<g fill="url(#wanta-b)" stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round" opacity=".95">' +
      '<circle cx="42" cy="110" r="15"/><circle cx="38" cy="140" r="14"/>' +
      '<circle cx="158" cy="110" r="15"/><circle cx="162" cy="140" r="14"/>' +
      '<circle cx="60" cy="176" r="13"/><circle cx="140" cy="176" r="13"/></g>' +
      /* まえ足（2本、そろえて ちょこん） */
      '<g fill="url(#wanta-e)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="82" cy="180" rx="15" ry="11"/><ellipse cx="118" cy="180" rx="15" ry="11"/></g>' +
      /* たれ耳（大きく ふわり） */
      '<path d="M56 78 C 30 82 16 112 24 140 C 30 160 52 160 56 140 C 60 116 60 96 56 78 Z"' +
      ' fill="url(#wanta-e)" stroke="' + ink + '" stroke-width="4.2" stroke-linejoin="round"/>' +
      '<path d="M144 78 C 170 82 184 112 176 140 C 170 160 148 160 144 140 C 140 116 140 96 144 78 Z"' +
      ' fill="url(#wanta-e)" stroke="' + ink + '" stroke-width="4.2" stroke-linejoin="round"/>' +
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M52 92 C 46 108 44 124 48 138"/><path d="M148 92 C 154 108 156 124 152 138"/></g>' +
      /* ぶち もよう */
      '<path d="M126 84 C 140 82 150 92 148 104 C 138 106 126 100 122 90 Z" fill="url(#wanta-e)" opacity=".8"/>' +
      /* はな */
      '<ellipse cx="100" cy="114" rx="10" ry="7" fill="#3d2708"/>' +
      '<ellipse cx="97" cy="112" rx="3" ry="2" fill="#8a7050" opacity=".7"/>' +
      /* した を ぺろっと */
      '<path d="M92 132 C 96 144 104 144 108 132 C 108 142 100 150 92 144 Z"' +
      ' fill="#f2879a" stroke="' + ink + '" stroke-opacity=".5" stroke-width="1.6"/>' +
      eye(78, 110, 16, 1) + eye(122, 110, 16, -1) +
      cheek(64, 128, 11, '#e0a060') + cheek(136, 128, 11, '#e0a060') +
      '<path d="M84 122 C 90 128 110 128 116 122" fill="none" stroke="' + ink + '"' +
      ' stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="160" rx="21" ry="12.5" fill="#fffaf0" opacity=".85"/>' +
      kprint('犬', 100, 160, 22, '#6b4420', 0, .95);
  },

  /* ミズタマ（水）── ひくく ひろがった みずたまり。ぷくっと はねる みず */
  mizu: function () {
    const ink = '#0d4f76';
    return '' +
      '<defs>' +
      '<radialGradient id="mizu-b" cx="32%" cy="26%" r="90%">' +
      '<stop offset="0" stop-color="#e0f7ff"/><stop offset=".5" stop-color="#7fd4f2"/>' +
      '<stop offset="1" stop-color="#1fa0c8"/></radialGradient>' +
      '<radialGradient id="mizu-d" cx="34%" cy="26%" r="84%">' +
      '<stop offset="0" stop-color="#eafcff"/><stop offset=".55" stop-color="#9adff2"/>' +
      '<stop offset="1" stop-color="#2fa8cc"/></radialGradient>' +
      '</defs>' +
      /* なみ紋（したの りんかく） */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".3" stroke-width="3" stroke-linecap="round">' +
      '<path d="M28 190 C 60 182 140 182 172 190"/>' +
      '<path d="M42 178 C 68 172 132 172 158 178"/></g>' +
      /* とびちる しずく（ななめ 左右に ぴょん） */
      '<g transform="rotate(-28 26 96)"><path d="M26 76 C 32 84 34 92 30 98 C 26 104 18 102 16 94' +
      ' C 15 87 19 80 26 76 Z" fill="url(#mizu-d)" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/></g>' +
      '<g transform="rotate(28 174 96)"><path d="M174 76 C 168 84 166 92 170 98 C 174 104 182 102 184 94' +
      ' C 185 87 181 80 174 76 Z" fill="url(#mizu-d)" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/></g>' +
      /* うえに はねる ちいさい しずく */
      '<path d="M100 16 C 107 28 112 36 110 44 C 108 52 92 52 90 44 C 88 36 93 28 100 16 Z"' +
      ' fill="url(#mizu-d)" stroke="' + ink + '" stroke-width="3.4" stroke-linejoin="round"/>' +
      /* からだ（ひくく ひろい みずたまり） */
      '<path d="M100 58 C 138 58 168 76 168 108 C 168 148 140 176 100 176' +
      ' C 60 176 32 148 32 108 C 32 76 62 58 100 58 Z"' +
      ' fill="url(#mizu-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* すいめんの てかり */
      '<path d="M56 84 C 48 96 46 110 50 122" fill="none" stroke="#ffffff"' +
      ' stroke-width="7" stroke-linecap="round" opacity=".55"/>' +
      '<ellipse cx="130" cy="82" rx="16" ry="8" fill="#ffffff" opacity=".4"' +
      ' transform="rotate(-18 130 82)"/>' +
      eye(78, 108, 16, 1) + eye(122, 108, 16, -1) +
      cheek(58, 128, 12, '#1fa0c8') + cheek(142, 128, 12, '#1fa0c8') +
      smile(100, 130, 14, 11, ink) +
      '<ellipse cx="100" cy="154" rx="21" ry="12.5" fill="#eafcff" opacity=".9"/>' +
      kprint('水', 100, 154, 21, '#0d6e94', 0, .95);
  },

  /* メダマル（目）── からだ ぜんぶが 1つの 大きな 目。まばたきする */
  me: function () {
    const ink = '#2a2118';
    return '' +
      '<defs>' +
      '<radialGradient id="me-w" cx="36%" cy="30%" r="80%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f4f1e8"/>' +
      '<stop offset="1" stop-color="#d8d0ba"/></radialGradient>' +
      '<radialGradient id="me-i" cx="38%" cy="34%" r="72%">' +
      '<stop offset="0" stop-color="#a8d8ff"/><stop offset=".55" stop-color="#4a8fd9"/>' +
      '<stop offset="1" stop-color="#1c3f7a"/></radialGradient>' +
      '</defs>' +
      /* あし */
      '<g fill="#e8e2d0" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="76" cy="182" rx="16" ry="10"/><ellipse cx="124" cy="182" rx="16" ry="10"/></g>' +
      /* まゆ げ */
      '<path d="M56 56 C 70 44 90 40 106 44" fill="none" stroke="' + ink + '"' +
      ' stroke-width="6" stroke-linecap="round"/>' +
      /* からだ＝大きな 目 */
      '<circle cx="100" cy="106" r="72" fill="url(#me-w)" stroke="' + ink + '" stroke-width="5.5"/>' +
      /* まつげ */
      '<g fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round">' +
      '<path d="M40 92 C 32 88 26 90 22 96"/><path d="M42 76 C 35 68 28 66 22 68"/>' +
      '<path d="M160 92 C 168 88 174 90 178 96"/><path d="M158 76 C 165 68 172 66 178 68"/></g>' +
      /* こうさい・ひとみ */
      '<circle cx="100" cy="108" r="46" fill="url(#me-i)" stroke="' + ink + '" stroke-width="3"/>' +
      '<g stroke="#0d1f42" stroke-opacity=".4" stroke-width="1.6">' +
      (function () {
        let f = '';
        for (let a = 0; a < 14; a++) {
          const r = (a * Math.PI) / 7;
          f += '<line x1="' + (100 + 14 * Math.cos(r)).toFixed(1) + '" y1="' + (108 + 14 * Math.sin(r)).toFixed(1) +
               '" x2="' + (100 + 40 * Math.cos(r)).toFixed(1) + '" y2="' + (108 + 40 * Math.sin(r)).toFixed(1) + '"/>';
        }
        return f;
      })() +
      '</g>' +
      '<circle cx="100" cy="108" r="20" fill="#0b1526"/>' +
      '<ellipse cx="87" cy="94" rx="10" ry="7" fill="#fff" opacity=".9" transform="rotate(-25 87 94)"/>' +
      '<circle cx="118" cy="122" r="5" fill="#fff" opacity=".5"/>' +
      /* まぶた（うえ・した、ちょっと とじぎみ） */
      '<path d="M28 92 C 55 62 145 62 172 92 C 150 78 130 72 100 72 C 70 72 50 78 28 92 Z"' +
      ' fill="#f4e9c8" stroke="' + ink + '" stroke-opacity=".8" stroke-width="2.4"/>' +
      '<path d="M32 146 C 58 168 142 168 168 146 C 148 156 126 160 100 160 C 74 160 52 156 32 146 Z"' +
      ' fill="#f4e9c8" opacity=".7"/>' +
      /* ほっぺ と くち（目の したに ちいさく） */
      cheek(58, 148, 9, '#e8a068') + cheek(142, 148, 9, '#e8a068') +
      smile(100, 166, 10, 8, ink) +
      '<ellipse cx="100" cy="179" rx="17" ry="9.5" fill="#f4e9c8" opacity=".9"/>' +
      kprint('目', 100, 179, 16, '#5a5138', 0, .95);
  },

  /* ミミゾウ（耳）── ぞうの こみみ。大きな 耳が 自まん */
  mimi: function () {
    const ink = '#5c4636';
    return '' +
      '<defs>' +
      '<radialGradient id="mimi-b" cx="34%" cy="26%" r="86%">' +
      '<stop offset="0" stop-color="#e6d4c4"/><stop offset=".55" stop-color="#bfa088"/>' +
      '<stop offset="1" stop-color="#8a6c54"/></radialGradient>' +
      '<radialGradient id="mimi-e" cx="32%" cy="26%" r="86%">' +
      '<stop offset="0" stop-color="#f3d9d0"/><stop offset=".6" stop-color="#dba896"/>' +
      '<stop offset="1" stop-color="#b47862"/></radialGradient>' +
      '</defs>' +
      /* きこえる おと（せん） */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".4" stroke-width="3.4" stroke-linecap="round">' +
      '<path d="M14 70 C 8 84 8 100 14 114"/><path d="M24 78 C 20 88 20 98 24 108"/>' +
      '<path d="M186 70 C 192 84 192 100 186 114"/><path d="M176 78 C 180 88 180 98 176 108"/></g>' +
      /* あし */
      '<g fill="url(#mimi-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<rect x="74" y="168" width="18" height="24" rx="9"/><rect x="108" y="168" width="18" height="24" rx="9"/></g>' +
      /* 大きな 耳（左右） */
      '<path d="M70 74 C 30 70 6 108 18 148 C 28 178 66 182 82 158 C 92 142 88 108 70 74 Z"' +
      ' fill="url(#mimi-b)" stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      '<path d="M130 74 C 170 70 194 108 182 148 C 172 178 134 182 118 158 C 108 142 112 108 130 74 Z"' +
      ' fill="url(#mimi-b)" stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      '<path d="M62 96 C 42 100 30 122 36 144 C 42 160 60 164 70 150" fill="url(#mimi-e)"' +
      ' stroke="' + ink + '" stroke-opacity=".5" stroke-width="2.4"/>' +
      '<path d="M138 96 C 158 100 170 122 164 144 C 158 160 140 164 130 150" fill="url(#mimi-e)"' +
      ' stroke="' + ink + '" stroke-opacity=".5" stroke-width="2.4"/>' +
      /* あたま・かお（耳より 小さめに して、耳を 目立たせる） */
      '<circle cx="100" cy="112" r="44" fill="url(#mimi-b)" stroke="' + ink + '" stroke-width="5"/>' +
      /* ちいさな はな（ぞうの みじかい はな） */
      '<path d="M100 128 C 97 138 97 146 101 152 C 106 156 112 154 111 148" fill="none"' +
      ' stroke="' + ink + '" stroke-width="6.5" stroke-linecap="round"/>' +
      eye(82, 104, 14, 1) + eye(118, 104, 14, -1) +
      cheek(70, 122, 9, '#dba896') + cheek(130, 122, 9, '#dba896') +
      '<ellipse cx="100" cy="163" rx="19" ry="10" fill="#f3e6d8" opacity=".9"/>' +
      kprint('耳', 100, 163, 18, '#6b5240', 0, .95);
  },

  /* テノリン（手）── ひらいた 手の かたち。にぎると あたたかい */
  te: function () {
    const ink = '#8a4a1c';
    const finger = (cx, cy, w, h, rot) =>
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + w + '" ry="' + h + '" fill="url(#te-b)"' +
      ' stroke="' + ink + '" stroke-width="4.6" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy - h * 0.55) + '" rx="' + (w * 0.5) + '" ry="' + (h * 0.28) +
      '" fill="#fff" opacity=".4" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"/>';
    return '' +
      '<defs>' +
      '<radialGradient id="te-b" cx="34%" cy="24%" r="88%">' +
      '<stop offset="0" stop-color="#ffd9ab"/><stop offset=".55" stop-color="#f4a54a"/>' +
      '<stop offset="1" stop-color="#c46f1c"/></radialGradient>' +
      '</defs>' +
      /* ぽかぽか オーラ */
      '<g fill="none" stroke="#ffcf7a" stroke-width="3" stroke-linecap="round" opacity=".8">' +
      '<path d="M28 60 C 20 52 20 42 26 34"/><path d="M172 60 C 180 52 180 42 174 34"/></g>' +
      '<path d="M100 20 l4 12 -8 0 Z" fill="#ffcf7a"/>' +
      /* ゆび（おやゆび＋4ほん） */
      finger(46, 92, 15, 24, -34) +
      finger(70, 54, 15, 26, -10) +
      finger(100, 42, 15, 28, 0) +
      finger(130, 54, 15, 26, 10) +
      finger(154, 92, 15, 24, 34) +
      /* てのひら */
      '<path d="M56 108 C 50 150 58 182 100 182 C 142 182 150 150 144 108 C 128 96 72 96 56 108 Z"' +
      ' fill="url(#te-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* てのひらの すじ */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M72 118 C 78 140 82 158 80 172"/><path d="M100 116 C 100 140 100 158 100 174"/>' +
      '<path d="M128 118 C 122 140 118 158 120 172"/></g>' +
      eye(84, 140, 14, 1) + eye(116, 140, 14, -1) +
      cheek(68, 158, 10, '#e8a068') + cheek(132, 158, 10, '#e8a068') +
      smile(100, 160, 12, 10, ink) +
      '<ellipse cx="100" cy="175" rx="19" ry="7" fill="#fff3dd" opacity=".85"/>' +
      kprint('手', 100, 174, 16, '#7a4014', 0, .95);
  },

  /* ホンマル（本）── ひらいた 本の かたち。ページから お話が とびだす */
  hon: function () {
    const ink = '#5c3c1c';
    return '' +
      '<defs>' +
      '<linearGradient id="hon-c" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#dcae7a"/><stop offset="1" stop-color="#a4713a"/></linearGradient>' +
      '<linearGradient id="hon-p" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fffdf4"/><stop offset="1" stop-color="#f0e6cc"/></linearGradient>' +
      '</defs>' +
      /* とびだす もじ・きらり */
      '<g fill="' + ink + '" opacity=".55" font-family="serif" font-weight="700">' +
      '<text x="140" y="34" font-size="20">A</text><text x="158" y="54" font-size="14">!</text></g>' +
      '<path d="M60 30 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z" fill="#ffe9a0"' +
      ' stroke="' + ink + '" stroke-width="1.6" opacity=".9"/>' +
      /* あし */
      '<g fill="url(#hon-c)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="78" cy="182" rx="15" ry="10"/><ellipse cx="122" cy="182" rx="15" ry="10"/></g>' +
      /* ひょうし（うら） */
      '<path d="M46 66 C 46 54 56 46 68 46 L 152 46 C 158 46 162 50 162 56 L 162 168' +
      ' C 162 174 158 178 152 178 L 68 178 C 56 178 46 170 46 158 Z"' +
      ' fill="url(#hon-c)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* ページの はし（重なり） */
      '<g fill="url(#hon-p)" stroke="' + ink + '" stroke-opacity=".6" stroke-width="2">' +
      '<rect x="150" y="52" width="8" height="118" rx="2"/>' +
      '<rect x="144" y="56" width="8" height="110" rx="2"/></g>' +
      /* ページ（表） */
      '<path d="M66 58 C 66 52 72 48 80 48 L 140 48 C 144 48 146 52 146 56 L 146 164' +
      ' C 146 168 144 172 140 172 L 80 172 C 72 172 66 168 66 160 Z"' +
      ' fill="url(#hon-p)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* せぼね の すじ */
      '<path d="M66 54 C 66 90 66 130 66 164" fill="none" stroke="' + ink + '" stroke-opacity=".4" stroke-width="2.4"/>' +
      /* しおり */
      '<path d="M112 46 L 112 84 L 105 74 L 98 84 L 98 46 Z" fill="#e05a3c"' +
      ' stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      /* もじの せん（文しょう） */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".3" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M76 128 L 136 128"/><path d="M76 138 L 120 138"/></g>' +
      /* ページを めくった かど（ドッグイヤー） */
      '<path d="M128 152 L 146 152 L 146 170 Z" fill="#e0d4b0" stroke="' + ink + '" stroke-opacity=".5" stroke-width="1.6"/>' +
      eye(90, 96, 15, 1) + eye(122, 96, 15, -1) +
      cheek(76, 116, 10, '#c9821a') + cheek(136, 116, 10, '#c9821a') +
      smile(106, 118, 13, 10, ink) +
      '<ellipse cx="104" cy="158" rx="19" ry="11" fill="#fffaf0" opacity=".9"/>' +
      kprint('本', 104, 158, 18, '#8a5f10', 0, .95);
  },

  /* クルマル（車）── ちいさな くるまの かたち。ブレーキは にがて */
  kuruma: function () {
    const ink = '#7a1810';
    return '' +
      '<defs>' +
      '<linearGradient id="kur-b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ff8a68"/><stop offset=".5" stop-color="#e8452a"/>' +
      '<stop offset="1" stop-color="#b02414"/></linearGradient>' +
      '<radialGradient id="kur-w" cx="35%" cy="30%" r="75%">' +
      '<stop offset="0" stop-color="#5a5a62"/><stop offset=".6" stop-color="#2c2c32"/>' +
      '<stop offset="1" stop-color="#141416"/></radialGradient>' +
      '</defs>' +
      /* けむり・スピードせん */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".4" stroke-width="4" stroke-linecap="round">' +
      '<path d="M8 96 L 30 96"/><path d="M4 112 L 26 112"/><path d="M10 128 L 28 128"/></g>' +
      /* しゃたい */
      '<path d="M44 118 C 44 96 60 84 84 84 L 116 84 C 140 84 156 96 158 116' +
      ' C 172 118 178 128 176 140 C 174 150 164 154 154 152 L 48 152 C 38 154 28 150 26 140' +
      ' C 24 128 32 118 44 118 Z" fill="url(#kur-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* まど */
      '<path d="M68 116 C 68 100 78 92 92 92 L 108 92 C 122 92 132 100 132 116 Z"' +
      ' fill="#cdeeff" stroke="' + ink + '" stroke-width="3.4" stroke-linejoin="round" opacity=".9"/>' +
      '<path d="M100 92 L 100 116" stroke="' + ink + '" stroke-width="3"/>' +
      /* やね の ライト */
      '<rect x="92" y="72" width="16" height="10" rx="4" fill="#ffe36a" stroke="' + ink + '" stroke-width="2.4"/>' +
      /* ヘッドライト */
      '<circle cx="42" cy="132" r="8" fill="#ffe9a0" stroke="' + ink + '" stroke-width="2.4"/>' +
      /* しゃたいの ライン */
      '<path d="M30 138 L 172 138" stroke="#ffd8c8" stroke-width="3" opacity=".7"/>' +
      /* タイヤ（あし） */
      '<g stroke="' + ink + '" stroke-width="4.4">' +
      '<circle cx="70" cy="166" r="24" fill="url(#kur-w)"/><circle cx="70" cy="166" r="9" fill="#8a8a92"/>' +
      '<circle cx="132" cy="166" r="24" fill="url(#kur-w)"/><circle cx="132" cy="166" r="9" fill="#8a8a92"/></g>' +
      '<g fill="none" stroke="#c8c8ce" stroke-width="2">' +
      '<path d="M70 152 L70 180 M56 166 L84 166 M60 156 L80 176 M60 176 L80 156"/>' +
      '<path d="M132 152 L132 180 M118 166 L146 166 M122 156 L142 176 M122 176 L142 156"/></g>' +
      eye(88, 118, 12, 1, false) + eye(112, 118, 12, -1, false) +
      cheek(60, 130, 8, '#ff8a68') + cheek(140, 130, 8, '#ff8a68') +
      smile(100, 130, 10, 7, ink) +
      '<ellipse cx="100" cy="146" rx="17" ry="9" fill="#ffe9df" opacity=".85"/>' +
      kprint('車', 100, 146, 17, '#8a1c10', 0, .95);
  },

  /* モジロー（字）── 書きたての ふでの かたち。すみの しずくと ひとふで */
  ji: function () {
    const ink = '#2e2318';
    return '' +
      '<defs>' +
      '<linearGradient id="ji-h" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#e8c98a"/><stop offset=".5" stop-color="#c79a4e"/>' +
      '<stop offset="1" stop-color="#8f6a26"/></linearGradient>' +
      '<linearGradient id="ji-t" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#5a5048"/><stop offset="1" stop-color="#14100c"/></linearGradient>' +
      '</defs>' +
      /* かいた すみの ひとふで */
      '<path d="M14 154 C 40 168 70 172 96 160" fill="none" stroke="' + ink + '"' +
      ' stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
      /* すみの しずく */
      '<ellipse cx="150" cy="176" rx="8" ry="6" fill="' + ink + '" opacity=".7"/>' +
      '<circle cx="164" cy="164" r="4" fill="' + ink + '" opacity=".55"/>' +
      /* あし */
      '<g fill="url(#ji-h)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="80" cy="184" rx="13" ry="8"/><ellipse cx="120" cy="184" rx="13" ry="8"/></g>' +
      /* じく（え） */
      '<path d="M76 96 C 76 90 82 86 100 86 C 118 86 124 90 124 96 L 128 168' +
      ' C 128 176 116 182 100 182 C 84 182 72 176 72 168 Z"' +
      ' fill="url(#ji-h)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M82 100 C 82 132 82 152 84 172" fill="none" stroke="' + ink + '" stroke-opacity=".3" stroke-width="2.4"/>' +
      /* すみを ふくんだ ほさき */
      '<path d="M100 8 C 112 26 122 40 122 58 C 122 76 112 88 100 88 C 88 88 78 76 78 58' +
      ' C 78 40 88 26 100 8 Z" fill="url(#ji-t)" stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      '<g fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.6">' +
      '<path d="M92 30 C 90 44 90 56 94 68"/><path d="M108 30 C 110 44 110 56 106 68"/></g>' +
      /* きんぐち（ふでと じくの さかいめ） */
      '<rect x="78" y="86" width="44" height="10" rx="4" fill="#c9a24a" stroke="' + ink + '" stroke-width="2.4"/>' +
      eye(90, 122, 14, 1) + eye(114, 122, 14, -1) +
      cheek(76, 140, 9, '#e8c98a') + cheek(128, 140, 9, '#e8c98a') +
      smile(102, 142, 12, 9, ink) +
      '<ellipse cx="101" cy="160" rx="18" ry="10" fill="#f6ecd4" opacity=".88"/>' +
      kprint('字', 101, 160, 17, '#5c4416', 0, .95);
  },

  /* ジョリン（女）── ふわりと ひろがる きものの すそ。おどりが とくい */
  onna: function () {
    const ink = '#7a1f3a';
    return '' +
      '<defs>' +
      '<linearGradient id="onna-b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffd2e2"/><stop offset=".5" stop-color="#f785a8"/>' +
      '<stop offset="1" stop-color="#d94a76"/></linearGradient>' +
      '</defs>' +
      /* あげた そで（おどりの ポーズ） */
      '<path d="M132 82 C 156 68 176 58 182 40 C 190 56 184 78 164 92 C 152 100 138 96 132 82 Z"' +
      ' fill="url(#onna-b)" stroke="' + ink + '" stroke-width="4.4" stroke-linejoin="round"/>' +
      '<circle cx="182" cy="38" r="7" fill="#fff3b0" stroke="' + ink + '" stroke-width="2.4"/>' +
      /* もう かたの そで */
      '<path d="M78 86 C 62 92 50 100 46 112 C 58 118 74 114 82 102 Z" fill="url(#onna-b)"' +
      ' stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* すそ（ベル型） */
      '<path d="M78 78 C 66 78 60 88 58 100 C 40 118 30 144 32 170 C 32 178 40 184 100 184' +
      ' C 160 184 168 178 168 170 C 170 144 160 118 142 100 C 140 88 134 78 122 78 Z"' +
      ' fill="url(#onna-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* すその もよう */
      '<g fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round">' +
      '<path d="M52 152 C 68 158 132 158 148 152"/></g>' +
      '<g fill="#fff" opacity=".7"><circle cx="72" cy="168" r="4"/><circle cx="100" cy="172" r="4"/>' +
      '<circle cx="128" cy="168" r="4"/></g>' +
      /* あたま */
      '<circle cx="100" cy="70" r="34" fill="url(#onna-b)" stroke="' + ink + '" stroke-width="5"/>' +
      /* かみの リボン */
      '<g fill="#e8503a" stroke="#8c1f10" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M78 42 C 62 34 50 36 48 46 C 46 56 60 62 78 54 Z"/>' +
      '<path d="M78 48 C 94 40 106 42 108 52 C 110 62 96 66 78 60 Z"/>' +
      '<circle cx="78" cy="50" r="7"/></g>' +
      /* ちいさな あし */
      '<g fill="#fff" stroke="' + ink + '" stroke-width="3.4"><ellipse cx="88" cy="180" rx="10" ry="6"/>' +
      '<ellipse cx="112" cy="180" rx="10" ry="6"/></g>' +
      eye(88, 68, 13, 1) + eye(112, 68, 13, -1) +
      cheek(76, 84, 9, '#e8608a') + cheek(124, 84, 9, '#e8608a') +
      smile(100, 86, 10, 8, ink) +
      '<ellipse cx="100" cy="132" rx="19" ry="11" fill="#fff0f5" opacity=".9"/>' +
      kprint('女', 100, 132, 18, '#a83a5c', 0, .95);
  },

  /* コッコ（子）── うまれたての ひよこ。たまごの からを ぼうし にしてる */
  ko: function () {
    const ink = '#8a6a10';
    return '' +
      '<defs>' +
      '<radialGradient id="ko-b" cx="34%" cy="26%" r="86%">' +
      '<stop offset="0" stop-color="#fff6c8"/><stop offset=".55" stop-color="#ffde5a"/>' +
      '<stop offset="1" stop-color="#e8ac10"/></radialGradient>' +
      '</defs>' +
      /* あし */
      '<g fill="#f0a030" stroke="' + ink + '" stroke-width="3.4" stroke-linejoin="round">' +
      '<path d="M82 174 L 82 186 M76 186 L82 186 L86 180 M78 186 L82 186 L84 190"/>' +
      '<path d="M118 174 L 118 186 M112 186 L118 186 L122 180 M114 186 L118 186 L120 190"/></g>' +
      /* つばさ */
      '<path d="M46 108 C 32 108 24 120 28 134 C 32 146 46 148 54 138 Z" fill="url(#ko-b)"' +
      ' stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      '<path d="M154 108 C 168 108 176 120 172 134 C 168 146 154 148 146 138 Z" fill="url(#ko-b)"' +
      ' stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      /* からだ */
      '<circle cx="100" cy="130" r="52" fill="url(#ko-b)" stroke="' + ink + '" stroke-width="5"/>' +
      /* くちばし */
      '<path d="M88 132 L 100 126 L 100 140 Z" fill="#f4832a" stroke="' + ink + '" stroke-width="2.4"' +
      ' stroke-linejoin="round"/>' +
      /* たまごの から（ぼうし） */
      '<g fill="#fffaf0" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<path d="M56 92 C 52 68 68 48 96 44 C 92 58 90 72 92 86 Z"/>' +
      '<path d="M144 92 C 150 66 132 46 104 42 C 108 56 110 72 108 86 Z"/></g>' +
      '<path d="M92 86 L 96 76 L 100 84 L 104 74 L 108 86" fill="none" stroke="' + ink + '"' +
      ' stroke-width="2.4" stroke-linejoin="round" opacity=".6"/>' +
      eye(84, 122, 15, 1) + eye(116, 122, 15, -1) +
      cheek(70, 140, 10, '#ffb85e') + cheek(130, 140, 10, '#ffb85e') +
      '<ellipse cx="100" cy="164" rx="20" ry="12" fill="#fffaf0" opacity=".85"/>' +
      kprint('子', 100, 164, 19, '#a8780c', 0, .95);
  },

  /* オウチャン（王）── マントを はおった おうさま。えらそうには しない */
  ou: function () {
    const ink = '#8a5c04';
    return '' +
      '<defs>' +
      '<linearGradient id="ou-b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f7dc7a"/><stop offset=".55" stop-color="#e8b62c"/>' +
      '<stop offset="1" stop-color="#b8850a"/></linearGradient>' +
      '</defs>' +
      /* しゃくじょう */
      '<g><path d="M158 96 L 168 178" stroke="#a8720c" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M168 82 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" fill="#ffe36a"' +
      ' stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/></g>' +
      /* あし */
      '<g fill="#fffaf0" stroke="' + ink + '" stroke-width="3.6"><ellipse cx="86" cy="182" rx="11" ry="7"/>' +
      '<ellipse cx="114" cy="182" rx="11" ry="7"/></g>' +
      /* マント（ローブ） */
      '<path d="M70 74 C 54 88 40 118 40 150 C 40 168 46 178 100 178 C 154 178 160 168 160 150' +
      ' C 160 118 146 88 130 74 C 122 84 78 84 70 74 Z"' +
      ' fill="url(#ou-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round"/>' +
      /* えりの ファー */
      '<path d="M68 76 C 80 88 120 88 132 76 C 132 86 124 92 100 92 C 76 92 68 86 68 76 Z"' +
      ' fill="#fffaf0" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<g fill="#c9a24a"><circle cx="80" cy="82" r="2.6"/><circle cx="100" cy="86" r="2.6"/>' +
      '<circle cx="120" cy="82" r="2.6"/></g>' +
      /* あたま */
      '<circle cx="100" cy="66" r="32" fill="url(#ou-b)" stroke="' + ink + '" stroke-width="5"/>' +
      /* かんむり */
      '<path d="M64 46 L 72 18 L 86 38 L 100 12 L 114 38 L 128 18 L 136 46 Z"' +
      ' fill="#ffe36a" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<g fill="#e8503a" stroke="' + ink + '" stroke-width="1.8"><circle cx="72" cy="26" r="5"/>' +
      '<circle cx="100" cy="18" r="5"/><circle cx="128" cy="26" r="5"/></g>' +
      eye(88, 64, 12, 1) + eye(112, 64, 12, -1) +
      cheek(78, 78, 8, '#e8b62c') + cheek(122, 78, 8, '#e8b62c') +
      smile(100, 80, 9, 7, ink) +
      '<ellipse cx="100" cy="128" rx="19" ry="11" fill="#fffaf0" opacity=".88"/>' +
      kprint('王', 100, 128, 18, '#a8720c', 0, .95);
  },

  /* ナマエル（名）── なふだの かたち。よばれると しっぽを ふる */
  na: function () {
    const ink = '#4a2a6b';
    return '' +
      '<defs>' +
      '<linearGradient id="na-b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#e0c4f5"/><stop offset=".55" stop-color="#b673d9"/>' +
      '<stop offset="1" stop-color="#7c3fa8"/></linearGradient>' +
      '</defs>' +
      /* しっぽ */
      '<path d="M156 140 C 176 132 188 140 190 154 C 180 150 172 154 168 162' +
      ' C 164 152 160 146 156 140 Z" fill="url(#na-b)" stroke="' + ink + '" stroke-width="4"' +
      ' stroke-linejoin="round"/>' +
      /* あし */
      '<g fill="url(#na-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="80" cy="182" rx="13" ry="8"/><ellipse cx="120" cy="182" rx="13" ry="8"/></g>' +
      /* ひも と あな */
      '<path d="M100 18 C 90 18 84 26 84 34 C 84 42 90 48 100 48 C 110 48 116 42 116 34' +
      ' C 116 26 110 18 100 18 Z" fill="none" stroke="' + ink + '" stroke-width="6"/>' +
      '<path d="M92 12 C 96 4 104 4 108 12" fill="none" stroke="#c9a24a" stroke-width="4" stroke-linecap="round"/>' +
      /* なふだ（からだ） */
      '<rect x="42" y="46" width="116" height="128" rx="26" fill="url(#na-b)"' +
      ' stroke="' + ink + '" stroke-width="5"/>' +
      '<rect x="52" y="56" width="96" height="108" rx="18" fill="none"' +
      ' stroke="#fff" stroke-opacity=".4" stroke-width="2.4"/>' +
      eye(84, 100, 15, 1) + eye(116, 100, 15, -1) +
      cheek(70, 120, 10, '#a860c9') + cheek(130, 120, 10, '#a860c9') +
      smile(100, 122, 12, 9, ink) +
      '<ellipse cx="100" cy="150" rx="20" ry="12" fill="#f6ecff" opacity=".9"/>' +
      kprint('名', 100, 150, 19, '#5c3080', 0, .95);
  },

  /* オオマル（大）── 「大」の字 その ものの ポーズ。りょう手を ひろげて ハグ */
  dai: function () {
    const ink = '#8a1f10';
    return '' +
      '<defs>' +
      '<linearGradient id="dai-b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffa07a"/><stop offset=".55" stop-color="#ea5a3c"/>' +
      '<stop offset="1" stop-color="#b02e18"/></linearGradient>' +
      '</defs>' +
      /* りょう手・りょう足（「大」の はらい） */
      '<g fill="url(#dai-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round">' +
      '<path d="M100 76 C 78 66 46 56 16 46 C 12 56 14 66 22 72 C 50 82 76 96 96 108 Z"/>' +
      '<path d="M100 76 C 122 66 154 56 184 46 C 188 56 186 66 178 72 C 150 82 124 96 104 108 Z"/>' +
      '<path d="M100 108 C 84 130 66 154 52 182 C 62 188 72 186 78 176 C 88 158 96 138 100 118 Z"/>' +
      '<path d="M100 108 C 116 130 134 154 148 182 C 138 188 128 186 122 176 C 112 158 104 138 100 118 Z"/>' +
      '</g>' +
      /* てさき・あしさき */
      '<g fill="#ffcfae" stroke="' + ink + '" stroke-width="3.4">' +
      '<circle cx="18" cy="52" r="10"/><circle cx="182" cy="52" r="10"/>' +
      '<ellipse cx="50" cy="184" rx="11" ry="8"/><ellipse cx="150" cy="184" rx="11" ry="8"/></g>' +
      /* むね（からだの まんなか） */
      '<circle cx="100" cy="92" r="42" fill="url(#dai-b)" stroke="' + ink + '" stroke-width="5.5"/>' +
      eye(84, 86, 15, 1) + eye(116, 86, 15, -1) +
      cheek(70, 104, 10, '#e8552a') + cheek(130, 104, 10, '#e8552a') +
      smile(100, 106, 13, 10, ink) +
      '<ellipse cx="100" cy="132" rx="20" ry="12" fill="#fff0e8" opacity=".9"/>' +
      kprint('大', 100, 132, 19, '#8a2010', 0, .95);
  },

  /* ゴマル（五）── 五つの ゆびと おなじ、5つの ほしの かたち。ハイタッチが すき */
  go: function () {
    const ink = '#0d5c52';
    return '' +
      '<defs>' +
      '<radialGradient id="go-b" cx="36%" cy="30%" r="86%">' +
      '<stop offset="0" stop-color="#a4efd9"/><stop offset=".55" stop-color="#33b39a"/>' +
      '<stop offset="1" stop-color="#146b5c"/></radialGradient>' +
      '</defs>' +
      /* ハイタッチの モーションせん */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".4" stroke-width="3" stroke-linecap="round">' +
      '<path d="M180 68 L 192 60"/><path d="M182 80 L 196 78"/></g>' +
      /* あし */
      '<g fill="url(#go-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="86" cy="182" rx="12" ry="8"/><ellipse cx="114" cy="182" rx="12" ry="8"/></g>' +
      /* からだ（ほし） */
      '<path d="M100 32 L118.8 82.1 L172.3 84.5 L130.4 117.9 L144.7 169.5' +
      ' L100 148 L55.3 169.5 L69.6 117.9 L27.7 84.5 L81.2 82.1 Z"' +
      ' fill="url(#go-b)" stroke="' + ink + '" stroke-width="5.5" stroke-linejoin="round"/>' +
      eye(84, 106, 15, 1) + eye(116, 106, 15, -1) +
      cheek(66, 122, 9, '#1e8f7c') + cheek(134, 122, 9, '#1e8f7c') +
      smile(100, 124, 12, 9, ink) +
      '<ellipse cx="100" cy="148" rx="19" ry="10" fill="#e6fff8" opacity=".9"/>' +
      kprint('五', 100, 148, 18, '#0d5c52', 0, .95);
  },

  /* ロクロー（六）── さいころの すがた。六まで かぞえると まんぞく */
  roku: function () {
    const ink = '#3f1f6b';
    return '' +
      '<defs>' +
      '<linearGradient id="roku-b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#e8d4ff"/><stop offset=".5" stop-color="#b673e0"/>' +
      '<stop offset="1" stop-color="#7c3fb0"/></linearGradient>' +
      '</defs>' +
      /* つの */
      '<g fill="#fff6e0" stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round">' +
      '<path d="M66 46 C 60 30 64 18 74 18 C 82 18 84 32 80 48 Z"/>' +
      '<path d="M134 46 C 140 30 136 18 126 18 C 118 18 116 32 120 48 Z"/></g>' +
      /* あし */
      '<g fill="url(#roku-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<ellipse cx="80" cy="184" rx="13" ry="8"/><ellipse cx="120" cy="184" rx="13" ry="8"/></g>' +
      /* からだ（さいころ） */
      '<rect x="38" y="44" width="124" height="124" rx="28" fill="url(#roku-b)"' +
      ' stroke="' + ink + '" stroke-width="5.5"/>' +
      /* め（6の めめ） */
      '<g fill="#fff"><circle cx="62" cy="68" r="8"/><circle cx="62" cy="106" r="8"/>' +
      '<circle cx="138" cy="68" r="8"/><circle cx="138" cy="106" r="8"/></g>' +
      eye(84, 100, 13, 1) + eye(116, 100, 13, -1) +
      cheek(70, 118, 9, '#a860d0') + cheek(130, 118, 9, '#a860d0') +
      smile(100, 120, 11, 8, ink) +
      '<ellipse cx="100" cy="146" rx="19" ry="11" fill="#f6ecff" opacity=".9"/>' +
      kprint('六', 100, 146, 18, '#5c3096', 0, .95);
  },

  /* キュウタ（九）── くるんと まいた かたつむり。もうすぐ 十に なるから そわそわ */
  kyuu: function () {
    const ink = '#1f4f6b';
    return '' +
      '<defs>' +
      '<radialGradient id="kyu-b" cx="34%" cy="26%" r="86%">' +
      '<stop offset="0" stop-color="#d8f0ff"/><stop offset=".55" stop-color="#7ec6e8"/>' +
      '<stop offset="1" stop-color="#3a86ad"/></radialGradient>' +
      '</defs>' +
      /* しょっかく（めだま つき） */
      '<g fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round">' +
      '<path d="M70 96 C 62 78 60 62 66 50"/><path d="M92 90 C 90 70 92 54 100 44"/></g>' +
      eye(66, 46, 12, 1) + eye(100, 40, 12, -1) +
      /* からだ（かたつむりの あし） */
      '<path d="M40 168 C 34 148 44 128 66 122 C 60 138 60 154 68 168 Z" fill="url(#kyu-b)"' +
      ' stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      '<path d="M40 168 C 20 168 8 178 10 188 L 130 188 C 132 178 120 168 100 168 Z" fill="url(#kyu-b)"' +
      ' stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      /* から（うずまき） */
      '<circle cx="118" cy="118" r="58" fill="url(#kyu-b)" stroke="' + ink + '" stroke-width="5.5"/>' +
      '<path d="M118 118 m0,-40 a40,40 0 1,1 -28,68 a26,26 0 1,1 20,-44 a13,13 0 1,1 -10,20"' +
      ' fill="none" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round" opacity=".75"/>' +
      eye(102, 132, 15, 1) + eye(132, 128, 15, -1) +
      cheek(90, 150, 9, '#4a9ec4') + cheek(146, 146, 9, '#4a9ec4') +
      smile(114, 154, 11, 8, ink) +
      '<ellipse cx="118" cy="172" rx="18" ry="10" fill="#eafaff" opacity=".9"/>' +
      kprint('九', 118, 172, 17, '#1f5c7c', 0, .95);
  },

  /* トオマル（十）── からだが きれいな 十じ。まん中で ぴったり つりあう */
  juu: function () {
    const ink = '#1d5c2e';
    return '' +
      '<defs>' +
      '<linearGradient id="juu-b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#b8ecb0"/><stop offset=".5" stop-color="#5cb555"/>' +
      '<stop offset="1" stop-color="#2c7c2c"/></linearGradient>' +
      '</defs>' +
      /* 4本の うで・あし（十字） */
      '<g fill="url(#juu-b)" stroke="' + ink + '" stroke-width="5" stroke-linejoin="round">' +
      '<rect x="76" y="10" width="48" height="72" rx="22"/>' +
      '<rect x="76" y="118" width="48" height="72" rx="22"/>' +
      '<rect x="10" y="76" width="72" height="48" rx="22"/>' +
      '<rect x="118" y="76" width="72" height="48" rx="22"/></g>' +
      /* まんなかの まる */
      '<circle cx="100" cy="100" r="52" fill="url(#juu-b)" stroke="' + ink + '" stroke-width="5.5"/>' +
      /* てさき・あしさき */
      '<g fill="#eafbe4" stroke="' + ink + '" stroke-width="3"><circle cx="100" cy="26" r="9"/>' +
      '<circle cx="100" cy="174" r="9"/><circle cx="26" cy="100" r="9"/><circle cx="174" cy="100" r="9"/></g>' +
      eye(84, 94, 15, 1) + eye(116, 94, 15, -1) +
      cheek(70, 112, 10, '#4a9c44') + cheek(130, 112, 10, '#4a9c44') +
      smile(100, 114, 13, 10, ink) +
      '<ellipse cx="100" cy="138" rx="19" ry="10" fill="#eafbe4" opacity=".9"/>' +
      kprint('十', 100, 138, 18, '#1d5c2e', 0, .95);
  },

  /* チカラン（力）── 小さいのに 力もち。おおきな 石も ひょいと もちあげる */
  chikara: function () {
    const ink = '#8a1810';
    return '' +
      '<defs>' +
      '<radialGradient id="chi-b" cx="36%" cy="28%" r="86%">' +
      '<stop offset="0" stop-color="#ffb0a0"/><stop offset=".55" stop-color="#ea5a3c"/>' +
      '<stop offset="1" stop-color="#b02418"/></radialGradient>' +
      '<radialGradient id="chi-r" cx="34%" cy="26%" r="82%">' +
      '<stop offset="0" stop-color="#c9c2b4"/><stop offset=".6" stop-color="#8f8676"/>' +
      '<stop offset="1" stop-color="#5c5548"/></radialGradient>' +
      '</defs>' +
      /* もちあげている 石 */
      '<path d="M74 24 C 60 18 44 24 40 40 C 36 56 46 68 64 68 C 84 70 104 66 108 50' +
      ' C 112 34 96 22 74 24 Z" fill="url(#chi-r)" stroke="' + ink + '" stroke-width="4.4"' +
      ' stroke-linejoin="round"/>' +
      '<g fill="none" stroke="#5c5548" stroke-opacity=".5" stroke-width="2.4">' +
      '<path d="M58 38 L 70 44"/><path d="M84 34 L 92 44"/></g>' +
      /* ちからせん */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".4" stroke-width="3" stroke-linecap="round">' +
      '<path d="M18 60 L 8 52"/><path d="M14 74 L 2 74"/><path d="M182 60 L 192 52"/><path d="M186 74 L 198 74"/></g>' +
      /* フレックスした うで */
      '<path d="M62 96 C 40 92 24 76 26 56 C 40 62 50 76 62 92 Z" fill="url(#chi-b)"' +
      ' stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      '<path d="M138 96 C 160 92 176 76 174 56 C 160 62 150 76 138 92 Z" fill="url(#chi-b)"' +
      ' stroke="' + ink + '" stroke-width="4.6" stroke-linejoin="round"/>' +
      /* あし */
      '<g fill="url(#chi-b)" stroke="' + ink + '" stroke-width="4.4" stroke-linejoin="round">' +
      '<ellipse cx="78" cy="182" rx="15" ry="9"/><ellipse cx="122" cy="182" rx="15" ry="9"/></g>' +
      /* からだ */
      '<circle cx="100" cy="132" r="54" fill="url(#chi-b)" stroke="' + ink + '" stroke-width="5.5"/>' +
      eye(84, 124, 15, 1) + eye(116, 124, 15, -1) +
      cheek(70, 142, 10, '#e8552a') + cheek(130, 142, 10, '#e8552a') +
      smile(100, 144, 13, 10, ink) +
      '<ellipse cx="100" cy="168" rx="19" ry="10" fill="#fff0e8" opacity=".9"/>' +
      kprint('力', 100, 168, 18, '#8a1810', 0, .95);
  },

  /* アカリン（赤）── まっかな りんご。うれしいと もっと 赤くなる */
  aka: function () {
    const ink = '#7a1810';
    return '' +
      '<defs>' +
      '<radialGradient id="aka-b" cx="34%" cy="30%" r="82%">' +
      '<stop offset="0" stop-color="#ffa090"/><stop offset=".55" stop-color="#ea3a28"/>' +
      '<stop offset="1" stop-color="#a81a10"/></radialGradient>' +
      '</defs>' +
      /* は */
      '<path d="M104 46 C 118 34 136 34 142 46 C 130 48 118 52 106 60 Z" fill="#4a9c44"' +
      ' stroke="#1d5c2e" stroke-width="3" stroke-linejoin="round"/>' +
      /* くき */
      '<path d="M100 50 C 98 40 100 30 106 22" fill="none" stroke="#6b4a24" stroke-width="6"' +
      ' stroke-linecap="round"/>' +
      /* からだ（りんご） */
      '<path d="M100 56 C 76 40 46 52 36 84 C 24 122 44 168 100 182 C 156 168 176 122 164 84' +
      ' C 154 52 124 40 100 56 Z" fill="url(#aka-b)" stroke="' + ink + '" stroke-width="5.5"' +
      ' stroke-linejoin="round"/>' +
      /* へこみ */
      '<path d="M84 58 C 92 52 108 52 116 58" fill="none" stroke="' + ink + '" stroke-opacity=".4"' +
      ' stroke-width="3" stroke-linecap="round"/>' +
      /* つや */
      '<path d="M58 84 C 50 100 48 118 54 134" fill="none" stroke="#fff" stroke-width="7"' +
      ' stroke-linecap="round" opacity=".5"/>' +
      eye(82, 108, 16, 1) + eye(118, 108, 16, -1) +
      cheek(62, 128, 10, '#c9241a') + cheek(138, 128, 10, '#c9241a') +
      smile(100, 130, 13, 10, ink) +
      '<ellipse cx="100" cy="158" rx="19" ry="11" fill="#ffe6e0" opacity=".9"/>' +
      kprint('赤', 100, 158, 18, '#8a1810', 0, .95);
  },

  /* アオマル（青）── そらと うみが すきな、あおい さかな */
  ao: function () {
    const ink = '#0d3f66';
    return '' +
      '<defs>' +
      '<radialGradient id="ao-b" cx="32%" cy="28%" r="86%">' +
      '<stop offset="0" stop-color="#a8d8ff"/><stop offset=".55" stop-color="#3a86d8"/>' +
      '<stop offset="1" stop-color="#154f96"/></radialGradient>' +
      '</defs>' +
      /* あわ */
      '<g fill="#cdeeff" opacity=".8"><circle cx="176" cy="56" r="6"/><circle cx="190" cy="72" r="4"/></g>' +
      /* おびれ */
      '<path d="M158 100 C 182 78 196 78 194 100 C 196 122 182 122 158 100 Z" fill="url(#ao-b)"' +
      ' stroke="' + ink + '" stroke-width="4.4" stroke-linejoin="round"/>' +
      /* せびれ */
      '<path d="M96 46 C 88 30 92 18 104 14 C 110 26 108 38 100 50 Z" fill="url(#ao-b)"' +
      ' stroke="' + ink + '" stroke-width="4" stroke-linejoin="round"/>' +
      /* からだ */
      '<path d="M104 54 C 140 54 164 76 164 106 C 164 138 138 158 100 158 C 58 158 26 138 24 106' +
      ' C 22 76 60 54 104 54 Z" fill="url(#ao-b)" stroke="' + ink + '" stroke-width="5.5"' +
      ' stroke-linejoin="round"/>' +
      /* むなびれ */
      '<path d="M70 118 C 54 128 44 142 44 156 C 60 152 74 140 80 124 Z" fill="url(#ao-b)"' +
      ' stroke="' + ink + '" stroke-width="3.6" stroke-linejoin="round"/>' +
      /* えら */
      '<path d="M58 92 C 54 102 54 114 58 124" fill="none" stroke="' + ink + '" stroke-opacity=".45"' +
      ' stroke-width="3" stroke-linecap="round"/>' +
      /* うろこ もよう */
      '<g fill="none" stroke="' + ink + '" stroke-opacity=".2" stroke-width="2">' +
      '<path d="M96 100 a10 10 0 0 1 20 0"/><path d="M120 104 a10 10 0 0 1 20 0"/>' +
      '<path d="M108 122 a10 10 0 0 1 20 0"/></g>' +
      eye(82, 96, 17, 1) + eye(118, 96, 17, -1) +
      cheek(64, 116, 10, '#1e6fc4') + cheek(136, 116, 10, '#1e6fc4') +
      smile(100, 118, 13, 10, ink) +
      '<ellipse cx="100" cy="140" rx="20" ry="11" fill="#e6f6ff" opacity=".9"/>' +
      kprint('青', 100, 140, 19, '#0d3f66', 0, .95);
  },

  /* シロマル（白）── ゆきのように まっしろ。よごれると おおさわぎ */
  shiro: function () {
    const ink = '#8a8272';
    return '' +
      '<defs>' +
      '<radialGradient id="shiro-b" cx="34%" cy="28%" r="86%">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f2ede0"/>' +
      '<stop offset="1" stop-color="#d8d0bc"/></radialGradient>' +
      '</defs>' +
      /* あし（ほそい） */
      '<g fill="none" stroke="#3a352a" stroke-width="4.4" stroke-linecap="round">' +
      '<path d="M80 178 L 78 194"/><path d="M120 178 L 122 194"/></g>' +
      /* もこもこの ふち */
      '<g fill="url(#shiro-b)" stroke="' + ink + '" stroke-width="4" stroke-linejoin="round">' +
      '<circle cx="46" cy="96" r="26"/><circle cx="40" cy="130" r="24"/><circle cx="58" cy="158" r="24"/>' +
      '<circle cx="154" cy="96" r="26"/><circle cx="160" cy="130" r="24"/><circle cx="142" cy="158" r="24"/>' +
      '<circle cx="70" cy="58" r="26"/><circle cx="100" cy="46" r="28"/><circle cx="130" cy="58" r="26"/>' +
      '<circle cx="100" cy="166" r="26"/></g>' +
      /* からだ（まんなか） */
      '<circle cx="100" cy="112" r="58" fill="url(#shiro-b)" stroke="' + ink + '" stroke-width="5"/>' +
      eye(82, 108, 15, 1) + eye(118, 108, 15, -1) +
      cheek(64, 126, 10, '#e8dcc0') + cheek(136, 126, 10, '#e8dcc0') +
      smile(100, 128, 12, 9, ink) +
      '<ellipse cx="100" cy="152" rx="19" ry="10" fill="#faf6ea" opacity=".9"/>' +
      kprint('白', 100, 152, 18, '#8a8272', 0, .95);
  },

  /* ヒダリン（左）── ひだりの てぶくろ。おやゆびが 左に とび出ている */
  hidari: function () {
    const ink = '#0d5c52';
    return '' +
      '<defs>' +
      '<radialGradient id="hid-b" cx="36%" cy="28%" r="86%">' +
      '<stop offset="0" stop-color="#a4efd9"/><stop offset=".55" stop-color="#33b39a"/>' +
      '<stop offset="1" stop-color="#146b5c"/></radialGradient>' +
      '</defs>' +
      /* おやゆび（ひだりに とび出る） */
      '<ellipse cx="34" cy="118" rx="24" ry="30" fill="url(#hid-b)" stroke="' + ink + '"' +
      ' stroke-width="5" transform="rotate(-18 34 118)"/>' +
      /* て（からだ） */
      '<ellipse cx="108" cy="100" rx="60" ry="56" fill="url(#hid-b)" stroke="' + ink + '"' +
      ' stroke-width="5.5"/>' +
      /* リストバンド */
      '<rect x="72" y="148" width="72" height="38" rx="16" fill="url(#hid-b)" stroke="' + ink + '"' +
      ' stroke-width="5" stroke-linejoin="round"/>' +
      '<g fill="none" stroke="#0a4238" stroke-opacity=".5" stroke-width="2.6">' +
      '<path d="M80 162 L 136 162"/><path d="M80 172 L 136 172"/></g>' +
      eye(92, 92, 16, 1) + eye(126, 96, 16, -1) +
      cheek(78, 112, 10, '#1e8f7c') + cheek(140, 116, 10, '#1e8f7c') +
      smile(110, 118, 13, 10, ink) +
      '<ellipse cx="108" cy="166" rx="19" ry="10" fill="#eafff8" opacity=".9"/>' +
      kprint('左', 108, 166, 18, '#0d5c52', 0, .95);
  },

  /* ミギマル（右）── みぎの てぶくろ。おやゆびが 右に とび出ている */
  migi: function () {
    const ink = '#8a5204';
    return '' +
      '<defs>' +
      '<radialGradient id="mig-b" cx="36%" cy="28%" r="86%">' +
      '<stop offset="0" stop-color="#ffd9a0"/><stop offset=".55" stop-color="#f4922a"/>' +
      '<stop offset="1" stop-color="#c9660c"/></radialGradient>' +
      '</defs>' +
      /* おやゆび（みぎに とび出る） */
      '<ellipse cx="166" cy="118" rx="24" ry="30" fill="url(#mig-b)" stroke="' + ink + '"' +
      ' stroke-width="5" transform="rotate(18 166 118)"/>' +
      /* て（からだ） */
      '<ellipse cx="92" cy="100" rx="60" ry="56" fill="url(#mig-b)" stroke="' + ink + '"' +
      ' stroke-width="5.5"/>' +
      /* リストバンド */
      '<rect x="56" y="148" width="72" height="38" rx="16" fill="url(#mig-b)" stroke="' + ink + '"' +
      ' stroke-width="5" stroke-linejoin="round"/>' +
      '<g fill="none" stroke="#7a4602" stroke-opacity=".5" stroke-width="2.6">' +
      '<path d="M64 162 L 120 162"/><path d="M64 172 L 120 172"/></g>' +
      eye(74, 96, 16, 1) + eye(108, 92, 16, -1) +
      cheek(60, 116, 10, '#e8862a') + cheek(122, 112, 10, '#e8862a') +
      smile(90, 118, 13, 10, ink) +
      '<ellipse cx="92" cy="166" rx="19" ry="10" fill="#fff4e6" opacity=".9"/>' +
      kprint('右', 92, 166, 18, '#8a5204', 0, .95);
  },
};

/* id から SVG 文字列を作る。size を付けると width/height も入る。
 * 同じ絵を画面に何こ出しても だいじょうぶなように、
 * グラデーションの id は 1まいごとに 別の名前にしておく。 */
let __monUid = 0;
function monsterSVG(id, size) {
  const art = MONSTER_ART[id] || (typeof ART !== 'undefined' && ART[id] ? () => buildArt(ART[id]) : null);
  if (!art) return '';
  const u = '-i' + (++__monUid);
  const body = art()
    .replace(/id="([^"]+)"/g, 'id="$1' + u + '"')
    .replace(/url\(#([^)]+)\)/g, 'url(#$1' + u + ')');
  const wh = size ? ' width="' + size + '" height="' + size + '"' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"' + wh +
         ' class="mon mon-' + id + '" aria-hidden="true">' + body + '</svg>';
}
