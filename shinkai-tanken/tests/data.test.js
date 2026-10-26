// node --test shinkai-tanken/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../data.js");
const R = require("../render.js").SHINKAI_R;

const KANJI = /[㐀-鿿々〆ヶ]/;
const RUBY = /([㐀-鿿々〆ヶ]+)\{([^}]+)\}/g;

test("いきもの は 30しゅるい いじょう、id が かぶらない", () => {
  assert.ok(D.SPECIES.length >= 30, `${D.SPECIES.length}`);
  assert.equal(new Set(D.SPECIES.map((s) => s.id)).size, D.SPECIES.length);
});

test("ひつよう な データ が そろって いる", () => {
  const zones = new Set(D.ZONES.map((z) => z.id));
  for (const s of D.SPECIES) {
    for (const f of ["name", "range", "size", "note", "draw"]) assert.ok(s[f], `${s.id}.${f}`);
    assert.ok(zones.has(s.zone), `${s.id}.zone`);
    assert.ok(s.min >= 0 && s.max > s.min && s.max <= D.BOTTOM, `${s.id} min/max`);
    assert.ok(typeof R.DRAW[s.draw] === "function", `${s.id}: えがく かんすう ${s.draw} が ない`);
    if (s.vent) for (const v of s.vent) assert.ok(D.VENTS.some((x) => x.id === v), `${s.id}.vent`);
  }
});

test("漢字には ぜんぶ ふりがな", () => {
  const texts = [];
  for (const s of D.SPECIES) for (const f of ["name", "range", "size", "note"]) texts.push([s.id + "." + f, s[f]]);
  for (const z of D.ZONES) texts.push([z.id, z.kanji], [z.id + ".desc", z.desc]);
  for (const m of D.MISSIONS) texts.push([m.id, m.title], [m.id + ".hint", m.hint]);
  for (const m of D.MILESTONES) texts.push([String(m.d), m.text]);
  for (const c of D.COMPARE) texts.push([c.id, c.label]);
  for (const [k, t] of texts) {
    const rest = String(t).replace(RUBY, "");
    assert.ok(!KANJI.test(rest), `${k}: ふりがな なし「${rest.match(KANJI)}」`);
  }
});

test("いきもの が その ふかさ で 出られる（そこ の いきもの は うみ の そこ が その ふかさ に ある）", () => {
  let lo = 1e9, hi = 0;
  for (let x = 0; x <= R.WORLD_W; x += 5) { const f = R.floorAt(x); lo = Math.min(lo, f); hi = Math.max(hi, f); }
  assert.ok(hi >= 10800, `いちばん ふかい ところ ${hi}`);
  for (const s of D.SPECIES.filter((s) => s.bottom && !s.vent)) {
    let ok = false;
    for (let x = 0; x <= R.WORLD_W && !ok; x += 5) { const f = R.floorAt(x); ok = f >= s.min && f <= s.max; }
    assert.ok(ok, `${s.id}: そこ が ${s.min}〜${s.max}m に ない`);
  }
  for (const v of D.VENTS) assert.ok(Math.abs(R.floorAt(v.x) - v.depth) < 5, `${v.id}: ${R.floorAt(v.x)}`);
  for (const s of D.SPECIES.filter((s) => s.vent))
    for (const id of s.vent) { const v = D.VENTS.find((x) => x.id === id); assert.ok(v.depth >= s.min && v.depth <= s.max, `${s.id} @ ${id}`); }
});

test("ミッション", () => {
  const ids = D.MISSIONS.map((m) => m.id);
  for (const id of ["angler3", "d6500", "snow", "vent"]) assert.ok(ids.includes(id), id);
  assert.ok(D.SPECIES.some((s) => s.id === "chouchin"));
});
