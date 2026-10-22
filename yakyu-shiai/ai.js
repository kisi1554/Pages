// やきゅう しあい — CPU の かんがえ（なげる・うつ・はしる）と、CPU どうしの しあい
(function (root) {
  "use strict";
  const YS = typeof module !== "undefined" && module.exports ? require("./sim.js") : root.YS;
  const { gauss, clamp } = YS;

  // CPU の つよさ 3だんかい
  const LEVELS = [
    { name: "よわい", emoji: "🐣", sd: 0.115, chase: 0.36, inZone: 0.62, ctrl: 1.25, pitchTime: 1.2, err: 0.04, steal: 0.05, bias: 0.6 },
    { name: "ふつう", emoji: "🐥", sd: 0.1, chase: 0.28, inZone: 0.68, ctrl: 1.08, pitchTime: 1.0, err: 0.025, steal: 0.08, bias: 0.8 },
    { name: "つよい", emoji: "🦅", sd: 0.088, chase: 0.2, inZone: 0.72, ctrl: 0.95, pitchTime: 0.86, err: 0.015, steal: 0.1, bias: 1 },
  ];

  // しゅびの ならび（pos じゅん）
  function defOf(team) {
    const d = [];
    team.players.forEach((p) => (d[p.pos] = p));
    return d;
  }

  // CPU が なげる たま
  function cpuPitch(st, level, r) {
    const L = LEVELS[level];
    const types = ["fast", "fast", "fast", "curve", "curve", "slow"];
    let type = types[r.int(types.length)];
    let cell;
    if (st.balls >= 3) cell = [1, 3, 4, 4, 5, 7][r.int(6)];          // まんなかよりに
    else if (st.strikes >= 2 && level > 0) cell = [0, 2, 6, 8, 6, 8][r.int(6)]; // すみっこ
    else cell = r.int(9);
    if (level === 0 && r() < 0.4) type = "fast";
    return { type, cell, ctrl: L.ctrl };
  }

  // CPU の バッター: うつか どうか と タイミング（null なら みのがす）
  function cpuSwing(st, pitch, batter, level, r, opts) {
    const L = LEVELS[level];
    const two = st.strikes >= 2;
    if (opts && opts.bunt) return { dtn: 0, aim: 0, bunt: true };
    let p;
    if (pitch.inZone) p = two ? 0.9 : L.inZone + (batter.pow - 3) * 0.03;
    else p = clamp(L.chase - YS.outside(pitch) * 0.5 + (two ? 0.12 : 0) - (st.balls >= 3 ? 0.12 : 0), 0.02, 0.8);
    if (st.balls >= 3 && st.strikes < 2 && !pitch.inZone) p *= 0.5;
    if (r() > p) return null;
    // まっすぐを まって いるので、おそい たまには はやく なりがち
    const bias = (pitch.type === "slow" ? -0.045 : pitch.type === "curve" ? -0.02 : 0.004) * L.bias;
    const sd = Math.max(0.03, L.sd - (batter.meet - 3) * 0.006);
    const dtn = bias + gauss(r) * sd;
    const aim = clamp(gauss(r) * 0.5, -1, 1);
    return { dtn, aim, bunt: false };
  }

  // CPU が バントするか
  function cpuBunt(st, batter, r) {
    if (st.outs >= 2 || st.strikes >= 2) return false;
    const r1 = st.bases[0], r2 = st.bases[1];
    if (!(r1 || r2) || st.bases[2]) return false;
    const weak = batter.pow + batter.meet <= 4;
    return r() < (weak ? 0.35 : 0.04);
  }

  // CPU が とうるい するか（from: 0 = 1るい→2るい, 1 = 2るい→3るい）
  function cpuSteal(st, bat, level, r) {
    const L = LEVELS[level];
    if (st.outs >= 2 && r() < 0.5) return null;
    if (st.bases[0] && !st.bases[1]) {
      const sp = bat[st.bases[0].p].spd;
      if (sp >= 4 && r() < L.steal * (sp - 3)) return 0;
    }
    if (st.bases[1] && !st.bases[2] && !st.bases[0]) {
      const sp = bat[st.bases[1].p].spd;
      if (sp >= 5 && r() < L.steal * 0.5) return 1;
    }
    return null;
  }

  // とうるいの けっか（アウトか セーフか）
  function stealResult(st, from, runner, catcher, pitchTime, r) {
    const { runT, thr } = YS.stealTimes(st, from, runner, catcher, pitchTime);
    return runT + gauss(r) * 0.25 < thr;
  }

  // 1きゅう ぶん すすめる（CPU どうし）。ログを かえす。
  function simPitch(st, teams, levels, r, seedBase) {
    const bt = st.half, ft = 1 - bt;
    const bat = teams[bt].players, def = defOf(teams[ft]);
    const batter = bat[YS.batterIdx(st)];
    const pitcher = def[0];
    const lv = levels[bt], lvF = levels[ft];
    // とうるい
    const sf = cpuSteal(st, bat, lv, r);
    const sel = cpuPitch(st, lvF, r);
    const pitch = YS.makePitch(sel.type, sel.cell, pitcher, LEVELS[lvF].pitchTime, r, sel.ctrl);
    const bunt = cpuBunt(st, batter, r);
    const sw = cpuSwing(st, pitch, batter, lv, r, { bunt });
    let c = null;
    if (sw) c = YS.contact(pitch, sw, batter, r);
    if (sf != null && (!c || c.kind !== "inplay")) {
      const runner = bat[st.bases[sf].p];
      const safe = stealResult(st, sf, runner, def[1], pitch.time, r);
      const half = st.half, inn = st.inning;
      YS.applySteal(st, sf, safe);
      if (st.over || st.half !== half || st.inning !== inn) return { ev: "steal" };
    }
    if (!sw) return YS.applyPitch(st, pitch.inZone ? "called" : "ball");
    if (c.kind === "miss") return YS.applyPitch(st, "swing");
    if (c.kind === "foul") return YS.applyPitch(st, c.bunt && st.strikes >= 2 ? "buntfoul" : "foul");
    const pb = YS.prepBall(c.ball);
    const fe = YS.fieldBall(pb, YS.fielders(def));
    const res = YS.resolvePlay(st, pb, fe, { choice: "auto", seed: (seedBase + r.int(1e9)) >>> 0, err: LEVELS[lvF].err, def, bat, bunt: c.bunt });
    const out = YS.applyPlay(st, res);
    out.res = res;
    return out;
  }

  function simGame(teams, opts) {
    const o = opts || {};
    const r = YS.rng(o.seed || 1);
    const st = YS.newGame({ innings: o.innings || 9 });
    const levels = o.levels || [1, 1];
    const tally = { hr: [0, 0], walk: 0, so: 0, dp: 0, error: 0, kinds: {} };
    let guard = 0;
    while (!st.over && guard++ < 5000) {
      const ev = simPitch(st, teams, levels, r, o.seed || 1);
      if (ev.ev === "walk") tally.walk++;
      if (ev.ev === "strikeout") tally.so++;
      if (ev.res) {
        tally.kinds[ev.res.kind] = (tally.kinds[ev.res.kind] || 0) + 1;
        if (ev.res.kind === "hr") tally.hr[st.over ? st.half : (ev.res && st.halfOver ? 1 - st.half : st.half)]++;
        if (ev.res.error) tally.error++;
      }
      st.halfOver = false;
    }
    return { st, tally };
  }

  const api = { LEVELS, defOf, cpuPitch, cpuSwing, cpuBunt, cpuSteal, stealResult, simPitch, simGame };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YA = api;
})(this);
