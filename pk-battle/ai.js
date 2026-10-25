// PK たいけつ — CPU の キッカー・キーパー と、CPU どうし の シミュレーション
// node でも ブラウザ でも うごく（ブラウザでは window.PKAI）。
(function (root) {
  "use strict";
  const P = (typeof module !== "undefined" && module.exports) ? require("./physics.js") : root.PKPhys;
  const { clamp, gauss } = P;

  // つよさ 0 = よわい、1 = ふつう、2 = つよい
  const KICKER = [
    // aimX: すみの ねらい（ポストに どれだけ ちかい か）、err: ねらいの ぶれ（m）、power: つよさ、honest: くせを みせる かくりつ、exploit: キーパーが はやく とんだら ぎゃくへ
    { aimX: 2.4, err: 0.56, power: [0.62, 0.12], honest: 0.85, exploit: 0.25, curve: 0.15 },
    { aimX: 2.75, err: 0.47, power: [0.76, 0.1], honest: 0.6, exploit: 0.65, curve: 0.25 },
    { aimX: 3.0, err: 0.38, power: [0.82, 0.08], honest: 0.4, exploit: 0.9, curve: 0.35 },
  ];
  const KEEPER = [
    // read: コースを よむ かくりつ、react: ボールを みて とぶ までの じかん、skill: キャッチの うまさ、fool: フェイントに ひっかかる、useKuse: くせ を しって いる か
    { read: 0.12, react: 0.26, skill: 0.3, fool: 0.6, useKuse: 0.2, stay: 0.14 },
    { read: 0.24, react: 0.17, skill: 0.5, fool: 0.45, useKuse: 0.6, stay: 0.12 },
    { read: 0.34, react: 0.1, skill: 0.7, fool: 0.3, useKuse: 0.9, stay: 0.1 },
  ];
  const LEVEL_NAME = ["よわい", "ふつう", "つよい"];
  // にんげんの キーパーへの てだすけ（CPU どうし の バランス には かんけい しない）
  //   reach … て の とどく はんい（からだの おおきさ に かける）、early … これより まえに とぶと「はやすぎ」（けってから の びょう）、
  //   exploit … CPU キッカーが はやすぎを みのがさない かくりつ に かける かず、catchSkill … キャッチの うまさ、
  //   slow / slowEasy … ボールの はやさ（にんげんが みて うごける ように すこし ゆっくり）
  const HUMAN_KEEPER = { reach: 1.12, early: -0.3, exploit: 0.6, catchSkill: 0.7, slow: 0.85, slowEasy: 0.6 };
  const humanKeeperOf = (team, dive) => ({ size: team.size * HUMAN_KEEPER.reach, catchSkill: HUMAN_KEEPER.catchSkill, dive });
  // にんげんの キーパーが はやく とびすぎた とき（CPU キッカーは ときどき みのがす）
  function exploitHuman(cell, keeperCell, level, r) {
    if (r() > HUMAN_KEEPER.exploit) return cell;
    return exploit(cell, keeperCell, level, () => r() * 0.999);
  }

  function pickW(weights, r) {
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = r() * sum;
    for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
    return weights.length - 1;
  }
  const colOf = (cell) => cell % 3, rowOf = (cell) => Math.floor(cell / 3);

  // CPU キッカーが ねらう マス（チームの くせ ＋ ランダム）
  function cpuCell(team, level, r) {
    const k = team.kuse;
    // つよい ほど まんなか を さける
    const col = k.col.map((w, i) => (i === 1 ? w * [1, 0.8, 0.6][level] : w));
    return pickW(k.row, r) * 3 + pickW(col, r);
  }
  // マス → じっさいに ける シュート
  function cpuShotFor(cell, level, r, skill) {
    const L = KICKER[level];
    const c = colOf(cell), rw = rowOf(cell);
    const e = L.err / (skill || 1);
    const tx = (c === 1 ? 0 : (c === 0 ? -1 : 1) * L.aimX) + gauss(r) * e + (c === 1 ? gauss(r) * 0.5 : 0);
    const ty = [2.0, 1.2, 0.35][rw] + gauss(r) * e * 0.7;
    const power = clamp(L.power[0] + gauss(r) * L.power[1], 0.35, 1.15);
    const curve = c === 1 ? 0 : clamp(gauss(r) * L.curve, -0.8, 0.8);
    return { tx, ty, power, curve, cell };
  }
  function cpuShot(team, level, r) { return cpuShotFor(cpuCell(team, level, r), level, r, 1); }

  // キッカーの「くせ」（キーパーへの ヒント）。honest の かくりつで ほんとうの むき、そうで なければ でたらめ
  //   run: じょそうの かくど（-1 = ひだりから まわりこむ → みぎへ けりやすい …）、look: めせん（-1/0/1）、body: からだの むき
  //   むき は キッカー から みた x（キーパー から みると ぎゃく）
  function tells(cell, level, r) {
    const side = colOf(cell) - 1;
    const h = KICKER[level].honest;
    const one = () => (r() < h ? side : [-1, 0, 1][Math.floor(r() * 3)]);
    return { run: one(), look: one(), body: one() };
  }

  // CPU キーパーが とぶ むき と じかん
  //   shot … ほんとうの シュート（「よめた」ときだけ つかう）、kuse … キッカーの チームの くせ、
  //   hist … あいての これまでの コース（9マスの かず。つよい キーパーは おぼえて いる）、feint … フェイント された か
  function cpuKeeper(level, shot, kuse, hist, feint, r) {
    const L = KEEPER[level];
    const real = P.cellOf(shot.tx, shot.ty);
    if (feint && r() < L.fool) {
      // フェイントに つられて はやく とんで しまう
      const cell = pickW([1, 0, 1], r) + 3 * pickW([1, 1, 1], r);
      return { cell, t: -0.3 + gauss(r) * 0.05, why: "fooled" };
    }
    if (!feint && r() < L.read) {
      // よめた！ ボールを みて から とぶ
      return { cell: real, t: L.react + gauss(r) * 0.04, why: "read" };
    }
    if (r() < L.stay) return { cell: 4, t: 0, why: "stay" };
    // あてずっぽう（くせ・きろく を つかう）
    let col = [1, 0.5, 1], row = [1, 1, 1];
    if (kuse && r() < L.useKuse) { col = kuse.col.slice(); row = kuse.row.slice(); }
    if (hist && level >= 1) {
      const n = hist.reduce((a, b) => a + b, 0);
      if (n >= 3) for (let i = 0; i < 9; i++) { col[i % 3] += (hist[i] / n) * 2 * level; row[Math.floor(i / 3)] += (hist[i] / n) * level; }
    }
    return { cell: pickW(row, r) * 3 + pickW(col, r), t: -0.04 + gauss(r) * 0.05, why: "guess" };
  }

  // キーパーが はやく とびすぎた とき、CPU キッカーは ぎゃくへ けりなおす
  function exploit(cell, keeperCell, level, r) {
    if (keeperCell == null || keeperCell === 4) return cell;
    const kc = colOf(keeperCell);
    if (kc !== colOf(cell) && colOf(cell) !== 1) return cell;
    if (r() > KICKER[level].exploit) return cell;
    const opp = kc === 0 ? 2 : kc === 2 ? 0 : (r() < 0.5 ? 0 : 2);
    return rowOf(cell) * 3 + opp;
  }

  const keeperOf = (team, level, dive) => ({ size: team.size, catchSkill: KEEPER[level].skill, dive });

  // CPU どうし で 1本
  function simulateKick(kTeam, kLevel, gTeam, gLevel, r, opt) {
    const o = opt || {};
    const cell = cpuCell(kTeam, kLevel, r);
    const shot = cpuShotFor(cell, kLevel, r, o.skill);
    const dive = cpuKeeper(gLevel, shot, kTeam.kuse, o.hist, !!o.feint, r);
    let final = shot;
    if (dive.t < -0.18) {
      const c2 = exploit(cell, dive.cell, kLevel, r);
      if (c2 !== cell) final = cpuShotFor(c2, kLevel, r, o.skill);
    }
    const res = P.runShot(final, keeperOf(gTeam, gLevel, dive), Math.floor(r() * 1e9));
    return Object.assign({ aim: cell, dive }, res);
  }

  // CPU どうし の PK せん（たいかいの ほかの しあい よう）
  function simulateShootout(teams, levels, r, rulesMod) {
    const R = rulesMod || ((typeof module !== "undefined" && module.exports) ? require("./rules.js") : root.PKRules);
    const kicks = [[], []];
    for (let guard = 0; guard < 60; guard++) {
      const st = R.status(kicks);
      if (st.over) return { kicks, winner: st.winner, score: st.score };
      const t = st.next;
      kicks[t].push(simulateKick(teams[t], levels[t], teams[1 - t], levels[1 - t], r).goal);
    }
    return { kicks, winner: 0, score: [0, 0] };
  }

  const api = { KICKER, KEEPER, LEVEL_NAME, HUMAN_KEEPER, humanKeeperOf, exploitHuman, pickW, cpuCell, cpuShotFor, cpuShot, tells, cpuKeeper, exploit, keeperOf, simulateKick, simulateShootout };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PKAI = api;
})(this);
