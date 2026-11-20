// データの チェック: node shinkansen-juudan/test.js
// - 駅の よみが ひらがな / 県コードが ある / 座標が その県の 形の 中（または すぐそば）
// - 路線の 駅が ぜんぶ データに ある・となりの 駅が はなれすぎて いない（じゅんばんの まちがい検出）
// - コースの 駅・のりかえが 路線の 上に ある / 駅の ある 県には えきべんが ある
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'map-data.js'), 'utf8') + ';this.PREFECTURES=PREFECTURES;this.project=project;', ctx);
const m = html.match(/const DATA = \{[\s\S]*?\n\};\n[\s\S]*?const PLACE = \{[\s\S]*?\};/);
if (!m) throw new Error('DATA が みつからない');
vm.runInContext(m[0] + ';this.DATA=DATA;this.COURSES=COURSES;this.TRANSFER=TRANSFER;this.PLACE=PLACE;', ctx);
const { DATA, COURSES, TRANSFER, PLACE, PREFECTURES, project } = ctx;

let ng = 0;
const fail = msg => { ng++; console.log('✗ ' + msg); };

// 多角形（M x,y x,y ... z を くりかえす パス）
function polys(d) {
  return d.split(/z/i).map(s => s.replace(/^\s*M/i, '').trim()).filter(Boolean)
    .map(s => s.split(/\s+/).map(p => p.split(',').map(Number)));
}
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const PP = {};
for (const p of PREFECTURES) PP[p.code] = polys(p.path);
function prefAt(pt) {
  for (const [code, ps] of Object.entries(PP)) {
    let c = false; for (const poly of ps) if (inside(pt, poly)) c = !c;
    if (c) return Number(code);
  }
  return 0;
}
function nearDist(pt, code) {
  let best = 1e9;
  for (const poly of PP[code]) for (let i = 0; i < poly.length; i++) best = Math.min(best, distSeg(pt, poly[i], poly[(i + 1) % poly.length]));
  return best;
}

const S = DATA.stations;
const names = Object.keys(S);
for (const n of names) {
  const [y, p, lon, lat] = S[n];
  if (!/^[ぁ-ゖー]+$/.test(y)) fail(`${n}: よみが ひらがなでない (${y})`);
  if (!PP[p]) fail(`${n}: 県コード ${p} が ない`);
  const xy = project(lon, lat), at = prefAt(xy);
  if (at !== p) {
    const d = nearDist(xy, p);
    if (d > 4) fail(`${n}: 座標が 県${p} の外（${at ? '県' + at + ' の中' : '海'}、きょり ${d.toFixed(1)}）`);
  }
}
console.log(`駅 ${names.length}`);

const used = new Set();
for (const [id, l] of Object.entries(DATA.lines)) {
  l.stops.forEach((n, i) => {
    used.add(n);
    if (!S[n]) return fail(`${id}: ${n} が stations に ない`);
    if (i) {
      const a = S[l.stops[i - 1]], b = S[n];
      const km = Math.hypot((a[2] - b[2]) * 91, (a[3] - b[3]) * 111);
      if (km > 75) fail(`${id}: ${l.stops[i - 1]} → ${n} が ${km.toFixed(0)}km（じゅんばん？）`);
    }
  });
  if (new Set(l.stops).size !== l.stops.length) fail(`${id}: おなじ駅が 2かい`);
  console.log(`${id}: ${l.stops.length}駅 ${l.stops[0]}〜${l.stops[l.stops.length - 1]}`);
}
for (const n of names) if (!used.has(n)) fail(`${n}: どの路線にも ない`);

// 公式の 駅数（起点・終点を ふくむ。東北・上越・北陸は 東京から）
const COUNT = { tohoku: 23, hokkaido: 4, tokaido: 17, sanyo: 19, kyushu: 12, joetsu: 12, hokuriku: 24 };
for (const [id, c] of Object.entries(COUNT)) if (DATA.lines[id].stops.length !== c) fail(`${id}: 駅数 ${DATA.lines[id].stops.length} ≠ ${c}`);

for (const c of COURSES) {
  for (const [lid, a, b] of c.legs) {
    const s = DATA.lines[lid].stops;
    if (!s.includes(a) || !s.includes(b)) fail(`${c.id}: ${a}/${b} が ${lid} に ない`);
  }
  if (c.stops) {
    const all = [];
    c.legs.forEach(([lid, a, b], li) => {
      const s = DATA.lines[lid].stops, i = s.indexOf(a), j = s.indexOf(b);
      const seg = i < j ? s.slice(i, j + 1) : s.slice(j, i + 1).reverse();
      all.push(...(li ? seg.slice(1) : seg));
    });
    let k = -1;
    for (const n of c.stops) { const i = all.indexOf(n, k + 1); if (i < 0) fail(`${c.id}: ${n} が ルートに ない／じゅんばん`); k = i; }
  }
}
for (const [at, x] of Object.entries(TRANSFER)) {
  for (const lid of Object.keys(x.dir)) if (!DATA.lines[lid].stops.includes(at)) fail(`のりかえ ${at}: ${lid} に ない`);
  for (const [lid, to] of Object.entries(x.wrong)) if (!DATA.lines[lid].stops.includes(to)) fail(`のりかえ ${at}: ${to} が ${lid} に ない`);
  for (const d of Object.values(x.dir)) for (const p of d.split('・')) if (!PLACE[p]) fail(`PLACE に ${p} が ない`);
}
const prefs = new Set(names.map(n => S[n][1]));
for (const p of prefs) if (!DATA.foods[p]) fail(`県${p}: えきべん（foods）が ない`);
const BAD = /弁当|駅弁|屋|堂|庵|本舗|®|™/;
for (const [p, fs2] of Object.entries(DATA.foods)) for (const [f] of fs2) if (BAD.test(f)) fail(`foods ${p}: ${f} は お店・商品名？`);

console.log(ng ? `\n${ng}こ の まちがい` : '\nぜんぶ OK');
process.exit(ng ? 1 : 0);
