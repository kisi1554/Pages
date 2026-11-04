/* でんき の ゆくえ — でんき の けいさん（DOM なし。ブラウザ と node の どちら でも うごく）
 *
 * 1にち＝120ステップ（1ステップ＝0.2じかん＝ゲーム の 0.5びょう）。
 * でんき の「つよさ」（ちから）は ステップ ごと、「ためた りょう」は ちから×じかん で かぞえる。
 *
 *   Grid.forecast(stage)            … その ひ の つかう でんき・ひざし・かぜ・あめ（シード つき で まいかい おなじ）
 *   Grid.createSim(stage, build)    … build = { スロットid: "solar" | "wind" | "dam" | "fire" | "batt" }
 *   sim.step({ dam, fire, batt, card }) … dam / fire は 0〜1、batt は "charge" | "discharge"、card: true で せつでん
 *   sim.result()                    … { blackout, co2, waste, stars:[まっくら なし, けむり, むだ] }
 *   Grid.auto(sim, opt)             … おてほん の うごかしかた（テスト と おてほん ボタン よう）
 */
(function (root) {
  "use strict";

  const STEPS = 120, DT = 24 / STEPS;     // 0.2 じかん
  const SHORT_EPS = 0.3;                   // これ より たりない と「たりない」
  const BLACKOUT_STEPS = 6;                // 6ステップ（3びょう）つづく と まっくら
  const CARD_STEPS = 10, CARD_CUT = 0.15;  // せつでん カード: 2じかん、15% へらす

  const PLANTS = {
    solar: { cap: 6, cost: 2, where: ["hara", "umi", "yama"] },
    wind: { cap: 4, cost: 3, where: ["umi", "hara", "yama"], mult: { umi: 1.5, hara: 1.0, yama: 1.2 } },
    dam: { cap: 8, cost: 4, where: ["yama"] },
    fire: { cap: 10, cost: 3, where: ["umi", "hara"] },
    batt: { cap: 6, size: 14, cost: 3, where: ["hara", "umi"] },
  };
  const TYPES = ["solar", "wind", "dam", "fire", "batt"];

  // ちず の スロット（ばしょ の しゅるい）
  const SLOTS = {
    u1: "umi", u2: "umi", u3: "umi",
    y1: "yama", y2: "yama", y3: "yama",
    h1: "hara", h2: "hara", h3: "hara", h4: "hara",
  };

  const WEATHER = {
    hare: { sun: 1.0, rain: 0 },
    kumori: { sun: 0.3, rain: 0 },
    ame: { sun: 0.1, rain: 1 },
    yuki: { sun: 0.1, rain: 0.3 },
  };

  // 1にち の つかいかた（ピーク を 1 と した ときの わりあい）
  const CURVE = [[0, 0.45], [4, 0.40], [6, 0.55], [8, 0.80], [10, 0.70], [12, 0.72], [15, 0.70],
    [17, 0.85], [19, 1.00], [21, 0.85], [23, 0.55], [24, 0.45]];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function interp(pts, h) {
    for (let i = 1; i < pts.length; i++) {
      if (h <= pts[i][0]) {
        const [h0, v0] = pts[i - 1], [h1, v1] = pts[i];
        return v0 + (v1 - v0) * (h - h0) / (h1 - h0);
      }
    }
    return pts[pts.length - 1][1];
  }
  // [[じこく, あたい], ...] の だんだん（その じこく から その あたい）
  function sched(list, h) {
    let v = list[0][1];
    for (const [t, x] of list) if (h >= t) v = x;
    return v;
  }
  const bump = (h, c, w) => Math.exp(-((h - c) * (h - c)) / (2 * w * w));
  function smoothNoise(rnd, n) { // 1じかん ごと の らんすう を なめらか に つなぐ
    const k = [];
    for (let i = 0; i <= 25; i++) k.push(rnd() * 2 - 1);
    return (h) => { const i = Math.floor(h), f = h - i, s = f * f * (3 - 2 * f); return (k[i] * (1 - s) + k[i + 1] * s) * n; };
  }

  function forecast(st) {
    const rnd = mulberry32(st.seed || 1);
    const dn = smoothNoise(rnd, 0.03), wn = smoothNoise(rnd, st.windVar == null ? 0.12 : st.windVar);
    const rise = st.sun ? st.sun[0] : 6, set = st.sun ? st.sun[1] : 18;
    const out = { demand: [], sun: [], wind: [], rain: [], weather: [], hour: [] };
    for (let i = 0; i < STEPS; i++) {
      const h = (i + 0.5) * DT;
      let d = interp(CURVE, h) + dn(h);
      if (st.ac) d += st.ac * bump(h, 14, 2.5);
      if (st.heat) d += st.heat * (bump(h, 7, 1.5) + bump(h, 20, 2.5));
      if (st.fest && h >= st.fest[0] && h < st.fest[1]) d += st.fest[2];
      const w = sched(st.weather || [[0, "hare"]], h);
      const sunRaw = h > rise && h < set ? Math.sin(Math.PI * (h - rise) / (set - rise)) : 0;
      const wb = sched(st.wind || [[0, 0.3]], h);
      out.demand.push(+(d * st.peak).toFixed(3));
      out.sun.push(+(sunRaw * WEATHER[w].sun).toFixed(4));
      out.wind.push(wb <= 0 ? 0 : +Math.max(0, Math.min(1, wb + wn(h))).toFixed(4));
      out.rain.push(WEATHER[w].rain * (st.inflow || 0));
      out.weather.push(w);
      out.hour.push(h);
    }
    return out;
  }

  function summarize(st, build) {
    const n = { solar: 0, wind: 0, dam: 0, fire: 0, batt: 0 };
    let windCap = 0, cost = 0;
    for (const id in build) {
      const t = build[id]; if (!t) continue;
      n[t]++; cost += PLANTS[t].cost;
      if (t === "wind") windCap += PLANTS.wind.cap * PLANTS.wind.mult[SLOTS[id]];
    }
    return {
      n, cost,
      solarCap: n.solar * PLANTS.solar.cap, windCap,
      damCap: n.dam * PLANTS.dam.cap, fireCap: n.fire * PLANTS.fire.cap,
      battRate: n.batt * PLANTS.batt.cap, battSize: n.batt * PLANTS.batt.size,
      water0: n.dam * (st.water || 0), waterMax: n.dam * (st.water || 0) * 1.5 + n.dam * 10,
    };
  }

  function canPlace(st, build, id, type) {
    if (!st.slots.includes(id) || build[id]) return false;
    if (!st.types.includes(type) || !PLANTS[type].where.includes(SLOTS[id])) return false;
    return summarize(st, build).cost + PLANTS[type].cost <= st.budget;
  }

  function createSim(st, build) {
    const fc = forecast(st), cap = summarize(st, build);
    const s = {
      st, fc, cap, build: Object.assign({}, build),
      i: 0, done: false, blackout: false,
      water: cap.water0, batt: cap.battSize * 0.3,
      co2: 0, waste: 0, unmet: 0, shortRun: 0,
      cards: st.cards || 0, cardLeft: 0,
      log: [],
    };
    s.peek = function (k) { // k ステップ あと の 1ステップ ぶん（つかう・しぜん）
      const j = Math.min(STEPS - 1, s.i + (k || 0));
      const cut = (k || 0) < s.cardLeft ? 1 - CARD_CUT : 1;
      return {
        demand: fc.demand[j] * cut,
        solar: cap.solarCap * fc.sun[j], wind: cap.windCap * fc.wind[j],
      };
    };
    s.step = function (c) {
      if (s.done) return null;
      c = c || {};
      if (c.card && s.cards > 0 && s.cardLeft === 0) { s.cards--; s.cardLeft = CARD_STEPS; }
      const i = s.i, cut = s.cardLeft > 0 ? 1 - CARD_CUT : 1;
      const demand = fc.demand[i] * cut;
      const solar = cap.solarCap * fc.sun[i];
      const wind = cap.windCap * fc.wind[i];
      s.water = Math.min(cap.waterMax, s.water + fc.rain[i] * cap.n.dam * DT);
      const damF = clamp01(c.dam), fireF = clamp01(c.fire);
      const dam = Math.min(damF * cap.damCap, s.water / DT);
      s.water = Math.max(0, s.water - dam * DT);
      const fire = fireF * cap.fireCap;
      s.co2 += fire * DT;
      const gen = solar + wind + dam + fire;
      let net = gen - demand, charge = 0, dis = 0, waste = 0, deficit = 0;
      const mode = c.batt === "discharge" ? "discharge" : "charge";
      if (net >= 0) {
        if (mode === "charge" && cap.battSize > 0) charge = Math.min(net, cap.battRate, (cap.battSize - s.batt) / DT);
        s.batt += charge * DT;
        waste = net - charge;
        s.waste += waste * DT;
      } else {
        if (mode === "discharge" && cap.battSize > 0) dis = Math.min(-net, cap.battRate, s.batt / DT);
        s.batt -= dis * DT;
        deficit = -net - dis;
        s.unmet += deficit * DT;
      }
      s.batt = Math.max(0, Math.min(cap.battSize, s.batt));
      const short = deficit > SHORT_EPS;
      s.shortRun = short ? s.shortRun + 1 : 0;
      if (s.cardLeft > 0) s.cardLeft--;
      const rec = { i, hour: fc.hour[i], demand, solar, wind, dam, fire, charge, dis, waste, deficit, short,
        supply: gen + dis, water: s.water, batt: s.batt, co2: s.co2, weather: fc.weather[i], windV: fc.wind[i], mode,
        card: s.cardLeft > 0 };
      s.log.push(rec);
      s.i++;
      if (s.shortRun >= BLACKOUT_STEPS) { s.blackout = true; s.done = true; }
      if (s.i >= STEPS) s.done = true;
      return rec;
    };
    s.result = function () {
      const ok = !s.blackout && s.i >= STEPS;
      const stars = [ok, ok && s.co2 <= st.co2Max, ok && s.waste <= st.wasteMax];
      return { blackout: s.blackout, finished: s.i >= STEPS, co2: round1(s.co2), waste: round1(s.waste),
        stars, count: ok ? stars.filter(Boolean).length : 0 };
    };
    return s;
  }
  const clamp01 = (x) => Math.max(0, Math.min(1, +x || 0));
  const round1 = (x) => Math.round(x * 10) / 10;

  // おてほん の うごかしかた。
  //  every: なんステップ ごと に スライダー を さわるか（ひと は ときどき しか さわれない）
  //  margin: かりょく を すこし おおめ に たく わりあい
  function auto(s, opt) {
    opt = opt || {};
    const every = opt.every || 1, margin = opt.margin || 0;
    const cap = s.cap;
    // まだ ステップ を すすめて いない とき だけ よそう を つかう
    let need = 0, res = 0;
    for (let k = 0; k < every; k++) {
      if (s.i + k >= STEPS) break;
      const p = s.peek(k);
      res = Math.max(res, p.demand - p.solar - p.wind);
      need = Math.max(need, p.demand);
    }
    const mode = res > 0 ? "discharge" : "charge";
    const battAvail = mode === "discharge" ? Math.min(cap.battRate, s.batt / DT / Math.max(1, every)) : 0;
    const rest = Math.max(0, res - battAvail);
    // ダム: のこり の みず を この さき たりない ぶん に わりふる
    let future = 0;
    for (let j = s.i; j < STEPS; j++) {
      const r = s.fc.demand[j] - cap.solarCap * s.fc.sun[j] - cap.windCap * s.fc.wind[j];
      if (r > 0) future += r * DT;
    }
    const share = future > 0 ? Math.min(1, s.water / future) : 1;
    let dam = Math.min(cap.damCap, s.water / DT, Math.max(rest * share, rest - cap.fireCap));
    let fire = Math.min(cap.fireCap, Math.max(0, rest - dam) + (rest > 0 ? margin * need : 0));
    if (opt.round) { // スライダー は 10% きざみ くらい しか あわせ られない
      const r = (v, c) => (c > 0 ? Math.ceil((v / c) * 10 - 1e-9) / 10 : 0);
      return { dam: r(dam, cap.damCap), fire: r(fire, cap.fireCap), batt: mode };
    }
    return { dam: cap.damCap ? dam / cap.damCap : 0, fire: cap.fireCap ? fire / cap.fireCap : 0, batt: mode };
  }

  // せつでん カード を つかう と よい ステップ（つかう でんき が いちばん おおい 2じかん の はじめ）
  function cardPlan(st) {
    const fc = forecast(st), out = [];
    const used = new Array(STEPS).fill(false);
    for (let c = 0; c < (st.cards || 0); c++) {
      let best = -1, bi = -1;
      for (let i = 0; i + CARD_STEPS <= STEPS; i++) {
        let sum = 0, ok = true;
        for (let k = 0; k < CARD_STEPS; k++) { if (used[i + k]) ok = false; sum += fc.demand[i + k]; }
        if (ok && sum > best) { best = sum; bi = i; }
      }
      if (bi < 0) break;
      for (let k = 0; k < CARD_STEPS; k++) used[bi + k] = true;
      out.push(bi);
    }
    return out;
  }

  // 1にち を さいご まで うごかす（テスト・おてほん よう）
  function play(st, build, opt) {
    const s = createSim(st, build), cards = cardPlan(st);
    opt = opt || {};
    const every = opt.every || 1;
    let c = null;
    while (!s.done) {
      if (s.i % every === 0 || !c) c = auto(s, opt);
      s.step(Object.assign({}, c, { card: cards.includes(s.i) }));
    }
    return Object.assign(s.result(), { sim: s });
  }

  const Grid = { STEPS, DT, PLANTS, TYPES, SLOTS, WEATHER, SHORT_EPS, BLACKOUT_STEPS, CARD_STEPS, CARD_CUT,
    forecast, summarize, canPlace, createSim, auto, cardPlan, play, mulberry32 };
  if (typeof module !== "undefined" && module.exports) module.exports = Grid;
  else root.Grid = Grid;
})(typeof self !== "undefined" ? self : this);
