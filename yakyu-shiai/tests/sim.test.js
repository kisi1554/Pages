// node --test yakyu-shiai/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const YS = require("../sim.js");
const YA = require("../ai.js");
const { TEAMS } = require("../teams.js");

const R = (p) => ({ p });
const T2 = [TEAMS[0], TEAMS[1]];
const optsFor = (st, extra) => Object.assign({
  choice: "auto", seed: 7, err: 0, def: YA.defOf(T2[1 - st.half]), bat: T2[st.half].players,
}, extra || {});
function play(st, ball, extra) {
  const pb = YS.prepBall(ball);
  const fe = YS.fieldBall(pb, YS.fielders(YA.defOf(T2[1 - st.half])));
  const res = YS.resolvePlay(st, pb, fe, optsFor(st, extra));
  return { res, ev: YS.applyPlay(st, res), fe };
}

test("チーム: 9にん・ポジションが かぶらない・のうりょく 1〜5・じつざいの なまえを つかわない", () => {
  assert.ok(TEAMS.length >= 2);
  for (const t of TEAMS) {
    assert.equal(t.players.length, 9, t.name);
    assert.deepEqual(t.players.map((p) => p.pos).sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8], t.name);
    for (const p of t.players) for (const k of ["pow", "meet", "spd", "arm"]) assert.ok(p[k] >= 1 && p[k] <= 5, p.name + k);
    assert.doesNotMatch(t.name, /ジャイアンツ|タイガース|ドラゴンズ|カープ|スワローズ|ベイスターズ|ホークス|ライオンズ|ファイターズ|マリーンズ|イーグルス|バファローズ/);
  }
});

test("フォースで すすむ: まんるいの フォアボールは おしだし 1てん", () => {
  const f = YS.forceAdvance([R(1), R(2), R(3)], R(4));
  assert.deepEqual(f.bases, [R(4), R(1), R(2)]);
  assert.deepEqual(f.scored, [R(3)]);
  // 2るい だけ なら 2るいの ランナーは すすまない
  const g = YS.forceAdvance([null, R(2), null], R(4));
  assert.deepEqual(g.bases, [R(4), R(2), null]);
  assert.equal(g.scored.length, 0);
  // 1・3るい: 1るいは 2るいへ、3るいは そのまま
  const h = YS.forceAdvance([R(1), null, R(3)], R(4));
  assert.deepEqual(h.bases, [R(4), R(1), R(3)]);
});

test("ボール4つで フォアボール、おしだしで とくてんと だてん", () => {
  const st = YS.newGame({ innings: 3 });
  st.bases = [R(5), R(6), R(7)];
  st.balls = 3;
  st.order[0] = 0;
  const e = YS.applyPitch(st, "ball");
  assert.equal(e.ev, "walk");
  assert.equal(e.pushIn, true);
  assert.equal(st.runs[0], 1);
  assert.equal(st.stats[0][0].rbi, 1);
  assert.equal(st.stats[0][0].bb, 1);
  assert.equal(st.stats[0][0].ab, 0, "フォアボールは だすうに いれない");
  assert.deepEqual(st.bases, [R(0), R(5), R(6)]);
  assert.equal(st.order[0], 1);
});

test("ストライク3つで さんしん、2ストライクからの ファウルは そのまま、バントファウルは さんしん", () => {
  const st = YS.newGame({});
  YS.applyPitch(st, "called");
  YS.applyPitch(st, "swing");
  assert.equal(st.strikes, 2);
  assert.equal(YS.applyPitch(st, "foul").ev, "foul");
  assert.equal(st.strikes, 2);
  const e = YS.applyPitch(st, "buntfoul");
  assert.equal(e.ev, "strikeout");
  assert.equal(st.outs, 1);
  assert.equal(st.strikes, 0);
});

test("3アウトで こうたい（るい・カウントが リセット）", () => {
  const st = YS.newGame({});
  st.bases = [R(1), null, R(2)];
  st.balls = 2;
  YS.addOut(st); YS.addOut(st);
  assert.equal(st.half, 0);
  YS.addOut(st);
  assert.equal(st.half, 1);
  assert.equal(st.inning, 1);
  assert.equal(st.outs, 0);
  assert.equal(st.balls, 0);
  assert.deepEqual(st.bases, [null, null, null]);
  assert.equal(st.line[0][0], 0);
  YS.addOut(st, 3);
  assert.equal(st.inning, 2);
  assert.equal(st.half, 0);
});

test("サヨナラ: さいしゅうかいの うらで リードした しゅんかんに おわる（ホームラン いがいは かちこしの 1てん まで）", () => {
  const st = YS.newGame({ innings: 3 });
  st.inning = 3; st.half = 1; st.runs = [2, 2];
  const n = YS.addRuns(st, [R(1), R(2), R(3)]);
  assert.equal(n, 1);
  assert.equal(st.over, true);
  assert.equal(st.walkoff, true);
  assert.equal(st.winner, 1);
  assert.deepEqual(st.runs, [2, 3]);
  // サヨナラ ホームランは ぜんいん かえる
  const s2 = YS.newGame({ innings: 3 });
  s2.inning = 3; s2.half = 1; s2.runs = [2, 2];
  assert.equal(YS.addRuns(s2, [R(1), R(2), R(3)], { hr: true }), 3);
  assert.deepEqual(s2.runs, [2, 5]);
  // とちゅうの かいでは おわらない
  const s3 = YS.newGame({ innings: 3 });
  s3.inning = 2; s3.half = 1;
  YS.addRuns(s3, [R(1)]);
  assert.equal(s3.over, false);
});

test("サヨナラ おしだし", () => {
  const st = YS.newGame({ innings: 6 });
  st.inning = 6; st.half = 1; st.runs = [4, 4];
  st.bases = [R(1), R(2), R(3)]; st.balls = 3;
  const e = YS.applyPitch(st, "ball");
  assert.equal(e.ev, "walk");
  assert.equal(st.over, true);
  assert.equal(st.walkoff, true);
  assert.equal(st.winner, 1);
});

test("さいしゅうかいの おもてで うらの チームが かっていれば うらは しない（X）", () => {
  const st = YS.newGame({ innings: 3 });
  st.inning = 3; st.half = 0; st.runs = [1, 3];
  YS.addOut(st, 3);
  assert.equal(st.over, true);
  assert.equal(st.winner, 1);
  assert.equal(st.line[1][2], "X");
});

test("さいしゅうかいで どうてんなら えんちょう なしで ひきわけ", () => {
  for (const inn of [3, 6, 9]) {
    const st = YS.newGame({ innings: inn });
    st.inning = inn; st.half = 1; st.runs = [2, 2];
    YS.addOut(st, 3);
    assert.equal(st.over, true);
    assert.equal(st.winner, -1, inn + "かい");
    assert.equal(st.inning, inn);
  }
});

test("とうるい: セーフなら すすむ、アウトなら アウトが ふえる", () => {
  const st = YS.newGame({});
  st.bases = [R(3), null, null];
  YS.applySteal(st, 0, true);
  assert.deepEqual(st.bases, [null, R(3), null]);
  YS.applySteal(st, 1, false);
  assert.deepEqual(st.bases, [null, null, null]);
  assert.equal(st.outs, 1);
});

test("ホームラン: ランナーぜんいんと バッターが かえる", () => {
  const st = YS.newGame({});
  st.bases = [R(5), null, R(6)];
  const { res } = play(st, { v: 49, angle: 28, dir: 0 });
  assert.equal(res.kind, "hr");
  assert.equal(st.runs[0], 3);
  assert.equal(st.stats[0][0].hr, 1);
  assert.equal(st.stats[0][0].rbi, 3);
  assert.equal(st.hits[0], 1);
  assert.deepEqual(st.bases, [null, null, null]);
});

test("ゴロアウト と ダブルプレー（1るいランナーが いて ショートゴロ）", () => {
  const st = YS.newGame({});
  const { res } = play(st, { v: 26, angle: -4, dir: -14 });
  assert.equal(res.kind, "groundout");
  assert.equal(st.outs, 1);
  const s2 = YS.newGame({});
  s2.bases = [R(5), null, null];
  s2.order[0] = 0;
  const r2 = play(s2, { v: 30, angle: -4, dir: -12 }).res;
  assert.equal(r2.kind, "dp");
  assert.equal(s2.outs, 2);
  assert.deepEqual(s2.bases, [null, null, null]);
});

test("フォースアウトが 3つめの アウトなら ホームに かえっても とくてんに ならない", () => {
  const st = YS.newGame({});
  st.outs = 2;
  st.bases = [R(5), R(6), R(7)];
  const { res } = play(st, { v: 26, angle: -4, dir: -14 });
  assert.ok(["groundout", "fc", "dp"].includes(res.kind), res.kind);
  assert.equal(st.runs[0], 0);
  assert.equal(st.half, 1, "3アウトで こうたい");
});

test("フライアウト と タッチアップ（3るいランナーが かえる）", () => {
  const st = YS.newGame({});
  st.bases = [null, null, R(5)];
  const { res } = play(st, { v: 40, angle: 34, dir: 0 });
  assert.ok(["fly", "sf"].includes(res.kind), res.kind);
  assert.equal(res.kind, "sf", "ぎせいフライ");
  assert.equal(st.runs[0], 1);
  assert.equal(st.outs, 1);
  assert.equal(st.stats[0][0].ab, 0, "ぎせいフライは だすうに いれない");
  assert.equal(st.stats[0][0].rbi, 1);
});

test("2アウトからの フライは アウトで こうたい（タッチアップ しない）", () => {
  const st = YS.newGame({});
  st.outs = 2;
  st.bases = [null, null, R(5)];
  play(st, { v: 40, angle: 34, dir: 0 });
  assert.equal(st.runs[0], 0);
  assert.equal(st.half, 1);
});

test("ヒット: ライナーが がいやに おちて ランナーが すすむ", () => {
  const st = YS.newGame({});
  st.bases = [null, R(5), null];
  const { res } = play(st, { v: 38, angle: 12, dir: -8 });
  assert.ok(res.hit, res.kind);
  assert.ok(st.bases[0] || st.bases[1] || st.bases[2]);
  assert.equal(st.hits[0], 1);
});

test("じぶんで なげる るいを えらべる（ランナーが いない るいに なげたら アウトに ならない）", () => {
  const st = YS.newGame({});
  st.bases = [R(5), null, null];
  const ball = { v: 30, angle: -4, dir: -12 };
  const pb = YS.prepBall(ball);
  const fe = YS.fieldBall(pb, YS.fielders(YA.defOf(T2[1])));
  const to3 = YS.resolvePlay(st, pb, fe, optsFor(st, { choice: 3 }));
  assert.equal(to3.outs.length, 0);
  const to1 = YS.resolvePlay(st, pb, fe, optsFor(st, { choice: 1 }));
  assert.equal(to1.outs.length, 1);
  assert.equal(to1.outs[0].base, 1);
});

test("タイミング: バッティングセンターと おなじ はば（ぴったり→つよい あたり、おおきく ずれると からぶり）", () => {
  const r = YS.rng(3);
  const b = { pow: 3, meet: 3, spd: 3, arm: 3 };
  const mid = { x: 0, y: 0, inZone: true };
  assert.equal(YS.contact(mid, { dtn: 0.3, aim: 0 }, b, r).kind, "miss");
  assert.equal(YS.contact(mid, { dtn: -0.3, aim: 0 }, b, r).kind, "miss");
  let sum = 0, n = 0, pull = 0, m = 0;
  for (let i = 0; i < 400; i++) {
    const c = YS.contact(mid, { dtn: 0, aim: 0 }, b, r);
    if (c.kind === "inplay") { sum += c.ball.v; n++; assert.ok(c.just); }
    const e = YS.contact(mid, { dtn: -0.06, aim: 0 }, b, r);
    if (e.kind === "inplay") { m++; pull += e.ball.dir < 0 ? 1 : 0; }
  }
  assert.ok(sum / n > 38, "ジャストは つよい あたり " + sum / n);
  assert.ok(pull / m > 0.85, "はやいと ひっぱり（レフト）" + pull / m);
});

test("CPU どうし 1000しあい: へいきん とくてん 2〜6てん、ホームランは おおすぎない、ゲッツー・エラーも たまに ある", () => {
  let runs = 0, hr = 0, games = 0, dp = 0, err = 0, walks = 0, so = 0;
  for (let i = 0; i < 1000; i++) {
    const lv = i % 3;
    const { st, tally } = YA.simGame([TEAMS[i % TEAMS.length], TEAMS[(i + 1) % TEAMS.length]], { seed: 1000 + i, innings: 9, levels: [lv, lv] });
    assert.equal(st.over, true);
    assert.ok(st.inning <= 9, "えんちょう なし");
    runs += st.runs[0] + st.runs[1];
    for (const t of st.stats) for (const p of t) hr += p.hr;
    dp += tally.kinds.dp || 0; err += tally.error; walks += tally.walk; so += tally.so;
    games++;
  }
  const perTeam = runs / games / 2;
  assert.ok(perTeam >= 2 && perTeam <= 6, "1チーム へいきん " + perTeam);
  assert.ok(runs / games >= 2 && runs / games <= 12, "1しあい ごうけい " + runs / games);
  const hrPer = hr / games / 2;
  assert.ok(hrPer > 0.1 && hrPer < 1.5, "ホームラン/チーム " + hrPer);
  assert.ok(dp / games > 0.5, "ゲッツー " + dp / games);
  assert.ok(err / games > 0.2 && err / games < 3, "エラー " + err / games);
  assert.ok(walks / games > 2, "フォアボール " + walks / games);
  assert.ok(so / games > 3, "さんしん " + so / games);
});

test("CPU の つよさ: つよい ほうが よわい あいてに かちこす", () => {
  let w = 0, l = 0;
  for (let i = 0; i < 300; i++) {
    const { st } = YA.simGame([TEAMS[0], TEAMS[0]], { seed: 5000 + i, innings: 9, levels: [2, 0] });
    if (st.winner === 0) w++; else if (st.winner === 1) l++;
  }
  assert.ok(w > l * 1.3, "つよい " + w + " - よわい " + l);
});

test("3・6かいの しあいも ちゃんと おわる", () => {
  for (const inn of [3, 6]) {
    for (let i = 0; i < 50; i++) {
      const { st } = YA.simGame(T2, { seed: 77 + i, innings: inn });
      assert.equal(st.over, true);
      assert.ok(st.inning <= inn);
      const sum = (a) => a.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      assert.equal(sum(st.line[0]), st.runs[0]);
      assert.equal(sum(st.line[1]), st.runs[1]);
    }
  }
});
