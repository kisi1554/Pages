// node --test shokubutsu-lab/tests/*.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../data.js');
const A = require('../art.js');

const ALL_ON = { water: true, air: true, temp: true, light: true, fert: true };
const cond = (off) => Object.assign({}, ALL_ON, Object.fromEntries(off.map((k) => [k, false])));

test('しょくぶつは 6しゅるい いじょう、たのまれた ものが ある', () => {
  assert.ok(D.PLANTS.length >= 6);
  for (const id of ['asagao', 'himawari', 'housenka', 'minitomato', 'ingen', 'hechima', 'tsurureishi']) assert.ok(D.PLANT[id], id);
  assert.equal(new Set(D.PLANTS.map((p) => p.id)).size, D.PLANTS.length);
});

test('どの しょくぶつも たね・ふたば・ほんば・はな・み の せつめいが ある', () => {
  for (const p of D.PLANTS) {
    for (const k of ['seed', 'futaba', 'honba', 'flower', 'fruit']) assert.ok(p[k] && p[k].text, p.id + ' ' + k);
    assert.ok(p.flower.colors.length >= 1, p.id);
  }
});

test('アサガオの つるは うえから みて 反時計回り（左まき）', () => {
  const t = D.PLANT.asagao.tsuru;
  assert.equal(t.kind, 'twine');
  assert.equal(t.dir, 'ccw');
  assert.match(t.text, /左\|ひだり\}まき/);
  assert.match(t.text, /はんたい/);
});

test('ヘチマ・ツルレイシは まきひげ、おばな と めばな', () => {
  for (const id of ['hechima', 'tsurureishi']) {
    assert.equal(D.PLANT[id].tsuru.kind, 'tendril');
    assert.equal(D.PLANT[id].flower.kind, 'separate');
  }
});

test('そだつ じゅんばんは たね→め→ふたば→ほんば→(つる)→つぼみ→はな→み→たね で、日が ふえていく', () => {
  for (const p of D.PLANTS) {
    const list = D.stageList(p);
    const keys = list.map((s) => s.key);
    assert.deepEqual(keys.filter((k) => k !== 'tsuru'), ['tane', 'me', 'futaba', 'honba', 'tsubomi', 'hana', 'mi', 'tane2'], p.id);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].day > list[i - 1].day, p.id + ' ' + list[i].key);
  }
});

test('たかさ と はの かず は へらない', () => {
  for (const p of D.PLANTS) {
    let h = 0, l = 0;
    for (let d = 0; d <= p.days.tane + 5; d++) {
      const nh = D.heightAt(p, d), nl = D.leavesAt(p, d);
      assert.ok(nh >= h && nl >= l, p.id + ' ' + d);
      h = nh; l = nl;
    }
    assert.equal(D.heightAt(p, 0), 0);
    assert.equal(D.leavesAt(p, p.days.honba - 1), 0);
    assert.equal(D.leavesAt(p, p.days.tane), p.maxLeaves);
  }
});

/* ---------------- 発芽の 結果表 ---------------- */
test('発芽には みず・くうき・てきとうな おんど が ひつよう', () => {
  assert.deepEqual(D.NEEDS, { water: true, air: true, temp: true, light: false, fert: false });
  assert.equal(D.germinates(ALL_ON), true);
  assert.equal(D.germinates(cond(['water'])), false);
  assert.equal(D.germinates(cond(['air'])), false);
  assert.equal(D.germinates(cond(['temp'])), false);
});

test('ひかりが なくても、ひりょうが なくても 発芽する（まちがった けっかに ならない）', () => {
  assert.equal(D.germinates(cond(['light'])), true);
  assert.equal(D.germinates(cond(['fert'])), true);
  assert.equal(D.germinates(cond(['light', 'fert'])), true);
});

test('32とおり ぜんぶ: めが でるのは みず・くうき・おんど が そろった ときだけ', () => {
  const keys = D.FACTORS.map((f) => f.key);
  for (let m = 0; m < 32; m++) {
    const c = {};
    keys.forEach((k, i) => { c[k] = !!(m & (1 << i)); });
    const fc = D.fixCond(c);
    assert.equal(D.germinates(c), fc.water && fc.air && fc.temp, JSON.stringify(c));
  }
});

test('みずに しずめると みずは ある／れいぞうこは くらい', () => {
  assert.equal(D.fixCond(cond(['air', 'water'])).water, true);
  assert.equal(D.fixCond(cond(['temp'])).light, false);
});

/* ---------------- 対照実験 ---------------- */
test('1つ だけ ちがう → わかる、2つ いじょう ちがう → くらべられない', () => {
  const g = D.germinates;
  assert.equal(D.compare(ALL_ON, cond(['water']), g).kind, 'needed');
  assert.equal(D.compare(ALL_ON, cond(['air']), g).kind, 'needed');
  assert.equal(D.compare(cond(['light']), cond(['light', 'temp']), g).kind, 'needed');
  assert.equal(D.compare(ALL_ON, cond(['light']), g).kind, 'notNeeded');
  assert.equal(D.compare(ALL_ON, cond(['fert']), g).kind, 'notNeeded');
  assert.equal(D.compare(ALL_ON, cond(['water', 'light']), g).kind, 'many');
  assert.equal(D.compare(ALL_ON, ALL_ON, g).kind, 'same');
  // へや（あかるい）と れいぞうこ（くらい）は おんど と ひかり の 2つが ちがう
  const r = D.compare(ALL_ON, cond(['temp']), g);
  assert.equal(r.kind, 'many');
  assert.deepEqual(r.diff.sort(), ['light', 'temp']);
});

test('どちらも めが でない ときは「ひつよう ない」と きめつけない', () => {
  // みず なし どうしで ひかりだけ ちがう → ひかりが いらない とは いえない
  assert.equal(D.compare(cond(['water']), cond(['water', 'light']), D.germinates).kind, 'unknown');
});

test('ひかりは 発芽には「いらない」としか 判定されない', () => {
  const keys = D.FACTORS.map((f) => f.key);
  for (let m = 0; m < 32; m++) for (let n = 0; n < 32; n++) {
    const a = {}, b = {};
    keys.forEach((k, i) => { a[k] = !!(m & (1 << i)); b[k] = !!(n & (1 << i)); });
    const r = D.compare(a, b, D.germinates);
    if (r.factor === 'light' || r.factor === 'fert') assert.notEqual(r.kind, 'needed', JSON.stringify([a, b]));
    if (r.factor === 'water' || r.factor === 'air' || r.factor === 'temp') assert.notEqual(r.kind, 'notNeeded', JSON.stringify([a, b]));
  }
});

test('でんぷんは 発芽まえ に たくさん、発芽後 は へる', () => {
  const [before, after] = D.STARCH;
  assert.equal(before.key, 'before');
  assert.ok(before.amount > after.amount);
});

/* ---------------- 成長の 条件 ---------------- */
test('ひかり と ひりょう が あると いちばん よく そだつ', () => {
  const end = (c) => D.growthSeries(c)[D.GROWTH_DAYS - 1];
  const both = end({ light: true, fert: true }), noF = end({ light: true, fert: false }), noL = end({ light: false, fert: true });
  assert.ok(both.leaves > noF.leaves && both.leaves > noL.leaves);
  assert.ok(both.cm > noF.cm, 'ひりょう なしは のびが わるい');
  assert.ok(D.GROWTH['light+fert'].thick > D.GROWTH.light.thick);
});

test('ひかり なしは ひょろひょろ（ながいが ほそい）で きいろっぽい', () => {
  const end = (c) => D.growthSeries(c)[D.GROWTH_DAYS - 1];
  assert.ok(end({ light: false, fert: true }).cm > end({ light: true, fert: true }).cm);
  assert.ok(D.GROWTH.fert.thick < D.GROWTH['light+fert'].thick);
  const yellow = (hex) => parseInt(hex.slice(1, 3), 16) > parseInt(hex.slice(5, 7), 16) + 60 && parseInt(hex.slice(1, 3), 16) > 180;
  assert.ok(yellow(D.GROWTH.fert.color), D.GROWTH.fert.color);
  assert.ok(!yellow(D.GROWTH['light+fert'].color));
});

test('成長くらべも 1つ だけ ちがう ときに わかる', () => {
  const K = ['light', 'fert'];
  assert.equal(D.compare({ light: true, fert: true }, { light: false, fert: true }, D.growsWell, K).kind, 'needed');
  assert.equal(D.compare({ light: true, fert: true }, { light: true, fert: false }, D.growsWell, K).kind, 'needed');
  assert.equal(D.compare({ light: true, fert: true }, { light: false, fert: false }, D.growsWell, K).kind, 'many');
});

/* ---------------- 受粉 ---------------- */
test('受粉すると み が でき、しないと できない', () => {
  assert.equal(D.makesFruit({ flower: 'asagao', pollinated: true, stamensRemoved: true, bagged: true }), true);
  assert.equal(D.makesFruit({ flower: 'asagao', pollinated: false, stamensRemoved: true, bagged: true }), false);
  assert.equal(D.makesFruit({ flower: 'hechimaM', pollinated: true, bagged: true }), true);
  assert.equal(D.makesFruit({ flower: 'hechimaM', pollinated: false, bagged: true }), false);
  assert.equal(D.makesFruit({ flower: 'hechimaO', pollinated: true, bagged: true }), false);
});

test('アサガオは おしべを とらないと じぶんの 花粉で み が できる', () => {
  assert.equal(D.makesFruit({ flower: 'asagao', pollinated: false, stamensRemoved: false, bagged: true }), true);
});

test('はなの ぶぶん: おばなは おしべだけ、めばなは めしべだけ', () => {
  assert.ok(D.FLOWERS.hechimaO.parts.includes('oshibe') && !D.FLOWERS.hechimaO.parts.includes('meshibe'));
  assert.ok(D.FLOWERS.hechimaM.parts.includes('meshibe') && !D.FLOWERS.hechimaM.parts.includes('oshibe'));
  for (const k of ['hanabira', 'gaku', 'oshibe', 'meshibe']) assert.ok(D.FLOWERS.asagao.parts.includes(k));
});

/* ---------------- え ---------------- */
test('え は どの 日でも こわれた すうじが ない', () => {
  for (const p of D.PLANTS) for (let d = 0; d <= p.days.tane + 3; d++) {
    const s = A.plantScene(p.id, d, { wet: d % 2, wilt: d % 3 === 0 ? 1 : 0 });
    assert.match(s, /^<svg /);
    assert.ok(!/NaN|undefined/.test(s), p.id + ' ' + d);
  }
  for (let m = 0; m < 32; m++) {
    const c = { water: !!(m & 1), air: !!(m & 2), temp: !!(m & 4), light: !!(m & 8), fert: !!(m & 16) };
    assert.ok(!/NaN|undefined/.test(A.cupSVG(c, 7, true)));
  }
  for (const k of Object.keys(D.FLOWERS)) assert.ok(!/NaN|undefined/.test(A.flowerParts(k, { bag: true, pollen: 3 })));
});

test('え の ほんばの まいすうは データと おなじ（かぞえられる）', () => {
  for (const p of D.PLANTS) for (const d of [p.days.honba + 3, p.days.hana]) {
    const n = (A.plantScene(p.id, d).match(/class="honba"/g) || []).length;
    assert.equal(n, D.leavesAt(p, d), p.id + ' ' + d);
  }
});

test('アサガオの つる: まえを とおる すじは みぎうえ むき（うえから みて 反時計回り）', () => {
  // うえから みた ず の や は、みぎ(3じ) から うえ を とおる はんとけいまわり
  assert.match(A.topView('ccw'), /A28 28 0 1 0/);
});
