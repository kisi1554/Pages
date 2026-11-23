// データの チェック: node shinkansen-jigsaw/test.js
// - 駅の よみが ひらがな / 座標が その県の 形の 中（または すぐそば）
// - 線の 駅が ぜんぶ データに ある・となりの 駅が はなれすぎて いない
// - つながり（links）の 駅が 両方の 線に ある・クイズの 答えが 選択肢に ある
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'map-data.js'), 'utf8') + ';this.PREFECTURES=PREFECTURES;this.project=project;', ctx);
const m = html.match(/const DATA = \{[\s\S]*?\nconst QUIZ = \[[\s\S]*?\n\];/);
if (!m) throw new Error('DATA が みつからない');
vm.runInContext(m[0] + ';this.DATA=DATA;this.LEVELS=LEVELS;this.QUIZ=QUIZ;', ctx);
const { DATA, LEVELS, QUIZ, PREFECTURES, project } = ctx;
let ng = 0; const fail = s => { ng++; console.log('✗ ' + s); };
const polys = d => d.split(/z/i).map(s => s.replace(/^\s*M/i, '').trim()).filter(Boolean).map(s => s.split(/\s+/).map(p => p.split(',').map(Number)));
function inside(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
function near(pt, poly) { let m = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L)); m = Math.min(m, Math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy)); } return m; }
const PP = {}; for (const p of PREFECTURES) PP[p.code] = polys(p.path);
for (const [n, [y, pc, lon, lat]] of Object.entries(DATA.stations)) {
  if (!/^[ぁ-ゖー]+$/.test(y)) fail(`${n} の よみ ${y}`);
  const xy = project(lon, lat);
  if (!PP[pc]) { fail(`${n} の 県 ${pc}`); continue; }
  if (!PP[pc].some(q => inside(xy, q)) && Math.min(...PP[pc].map(q => near(xy, q))) > 3) fail(`${n} が 県${pc} の 外`);
}
const used = new Set();
for (const [id, L] of Object.entries(DATA.lines)) {
  L.stops.forEach((n, i) => {
    used.add(n);
    if (!DATA.stations[n]) return fail(`${id}: ${n} が ない`);
    if (i) { const a = DATA.stations[L.stops[i - 1]], b = DATA.stations[n]; const d = Math.hypot(a[2] - b[2], a[3] - b[3]); if (d > 0.75) fail(`${id}: ${L.stops[i - 1]}→${n} が とおい ${d.toFixed(2)}`); }
  });
}
for (const n of Object.keys(DATA.stations)) if (!used.has(n)) fail(`${n} は どの 線にも ない`);
for (const [a, b, s] of DATA.links) for (const id of [a, b]) if (!DATA.lines[id].stops.includes(s)) fail(`link ${a}-${b}: ${s} が ${id} に ない`);
const linked = new Set(DATA.links.flatMap(l => [l[0], l[1]]));
if (linked.has('nishikyushu')) fail('西九州は つながって いない はず');
for (const id of Object.keys(DATA.lines)) if (id !== 'nishikyushu' && !linked.has(id)) fail(`${id} が つながって いない`);
if (Object.keys(DATA.lines).length !== 10) fail('線は 10本');
if (LEVELS[3].lines.length !== 10 || LEVELS[2].lines.length !== 6 || LEVELS[1].lines.length !== 3) fail('レベルの 本数');
for (const q of QUIZ) { const o = q.st || q.ln; if (!o.includes(q.ans)) fail(`クイズ ${q.q} の 答え`); for (const h of q.hl) if (!LEVELS[q.lv].lines.includes(h)) fail(`クイズ ${q.q}: ${h} が レベル${q.lv} に ない`); if (q.ln) for (const x of q.ln) if (!LEVELS[q.lv].lines.includes(x)) fail(`クイズ ${q.q}: ${x} が レベル${q.lv} に ない`); }
console.log(ng ? `✗ ${ng}こ` : '✓ データ OK');
process.exit(ng ? 1 : 0);
