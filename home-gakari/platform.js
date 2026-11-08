/* えき の ホームがかり — しくみ（DOM なし。node でも ブラウザ でも うごく）
 *
 * ばめん（g.phase）:
 *   approach … でんしゃ が まって いる。ホーム の はし（きいろい せん の そと）に ひと が いる と はいれない
 *   arrive   … でんしゃ が はいって くる
 *   open     … ドア が あいた。おりる ひと → のる ひと。かくにん → あいず
 *   melody   … あいず OK。はっしゃ の メロディ
 *   closing  … ドア が しまる
 *   leave    … でんしゃ が でる
 *   between  … つぎ の でんしゃ まで
 *   done     … 1にち おわり
 * ざひょう は ろんり の 600×440（app.js が がめん に あわせて ひろげる）。
 */
(function (root) {
  "use strict";

  const W = 600, H = 440;
  const DOORS = [110, 300, 490];          // ドア の まんなか（x）
  const DOOR_Y = 214;                     // ドア の ゆか（でんしゃ の なか）
  const FRONT_Y = 296;                    // ドア の まえ（ホーム）
  const EDGE_Y = 244;                     // きいろい せん の そと
  const STAIRS = [{ x: -40, y: 470 }, { x: 640, y: 470 }];

  const PERIODS = {
    asa: { name: "あさ", sub: "ラッシュ", emoji: "🌅", board: [2, 3], alight: [1, 3], block: [1, 2], edge: [2, 3], slow: 0.25, stuck: 0.3, runner: 0.5, items: ["bag", "bag", "kasa"] },
    hiru: { name: "ひる", sub: "すいて いる", emoji: "☀️", board: [0, 2], alight: [0, 1], block: [0, 1], edge: [0, 1], slow: 0.6, stuck: 0.2, runner: 0.25, items: ["bag"] },
    yuu: { name: "ゆうがた", sub: "あめ", emoji: "☔", board: [1, 2], alight: [1, 2], block: [0, 1], edge: [1, 2], slow: 0.3, stuck: 0.7, runner: 0.5, items: ["kasa", "kasa", "bag"] },
  };
  const PERIOD_KEYS = ["asa", "hiru", "yuu"];

  // おきゃくさん の しゅるい（はやさ は ろんり px/びょう）
  const KINDS = {
    adult: { speed: 150, emoji: ["🧑", "👩", "👨", "🧑‍💼", "👩‍💼"] },
    kid: { speed: 150, emoji: ["🧒", "👦", "👧"] },
    elder: { speed: 48, emoji: ["👵", "👴"], slow: true },
    stroller: { speed: 58, emoji: ["👩‍🍼"], slow: true },
    wheel: { speed: 70, emoji: ["🧑‍🦽"] },
    runner: { speed: 230, emoji: ["🏃", "🏃‍♀️"] },
    lost: { speed: 90, emoji: ["🧒"] },
  };
  const ITEMS = { bag: { emoji: "👜", name: "かばん" }, kasa: { emoji: "🌂", name: "かさ" } };
  const LOST_ITEMS = [{ emoji: "🧸", name: "くま の ぬいぐるみ" }, { emoji: "👛", name: "おさいふ" }, { emoji: "🧢", name: "ぼうし" }];

  const POINT_ORDER = ["door", "signal", "clock"];
  const POINT_NAME = { door: "ドア", signal: "しんごう", clock: "とけい" };

  /* ---------- シード つき の 乱数 ---------- */
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  }

  /* ---------- 1にち の よてい ---------- */
  // mode: "day"（あさ3・ひる3・ゆうがた3 ＝ 9ほん）／ "one"（period を 1ぽん だけ）
  function newDay(seed, opt) {
    opt = opt || {};
    const plan = [];
    if (opt.period) plan.push({ period: opt.period, n: 0 });
    else PERIOD_KEYS.forEach((p) => { for (let n = 0; n < (opt.perPeriod || 3); n++) plan.push({ period: p, n }); });
    const g = {
      seed: seed >>> 0, rng: makeRng(seed), plan, trainNo: -1, phase: "between", t: 0,
      trainX: -820, doorOpen: 0, people: [], stuck: [], lostItems: [], ramp: -1, point: 0,
      nextId: 1, events: [], waitNext: [], period: plan[0].period, runnerPlan: -1,
      tr: null, stats: { matte: 0, matteTrains: 0, delay: 0, helped: 0, chances: 0, trains: 0, reasons: {} },
      log: [],
    };
    g.t = 0.6;  // さいしょ の でんしゃ まで すこし まつ
    return g;
  }

  function emit(g, type, data) { g.events.push(Object.assign({ type }, data || {})); }
  function person(g, kind, role, x, y, extra) {
    const p = Object.assign({ id: g.nextId++, kind, role, x, y, tx: x, ty: y, path: [], emoji: g.rng.pick(KINDS[kind].emoji), door: -1, wait: 0, say: "" }, extra || {});
    g.people.push(p);
    return p;
  }
  function goTo(p, pts) { p.path = pts.map((q) => ({ x: q[0], y: q[1] })); }
  function speedOf(p) { return KINDS[p.kind].speed; }

  // ドア の まえ の ならぶ ばしょ（ひだり・みぎ に こうご、うしろ へ）
  function queueSpot(d, i) {
    const side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2);
    return [DOORS[d] + side * 56, FRONT_Y + 30 + row * 50];
  }
  function boarders(g, d) { return g.people.filter((p) => p.door === d && (p.role === "board" || p.role === "boarding" || p.role === "block")); }

  function startTrain(g) {
    g.trainNo++;
    const step = g.plan[g.trainNo];
    const prev = g.period;
    g.period = step.period;
    const P = PERIODS[g.period], r = g.rng;
    if (prev !== g.period || g.trainNo === 0) {
      // じかん が かわったら まいご・おとしもの は おしまい（たすけられなかった）
      g.people = g.people.filter((p) => p.role !== "lost");
      g.lostItems = [];
      if (g.trainNo > 0) emit(g, "period", { period: g.period });
    }
    g.phase = "approach"; g.t = 0; g.trainX = -820; g.doorOpen = 0; g.ramp = -1; g.point = 0; g.stuck = [];
    // まえ の でんしゃ で のこった ひと は もう いない（ホーム から でて いった）
    g.people = g.people.filter((p) => p.role === "lost" || p.role === "next");
    const tr = g.tr = { no: g.trainNo, period: g.period, dwell: 0, approachT: 0, matte: false, target: 0, approachTarget: 0, stuckPlan: [], runnerAt: -1, runnerDone: false, special: [] };

    // ふつう の のる ひと
    const counts = DOORS.map(() => r.int(P.board[0], P.board[1]));
    // つぎ の でんしゃ を まって いた ひと（かけこみ で とめた ひと）
    g.people.filter((p) => p.role === "next").forEach((p) => { p.role = "board"; p.door = nearestDoor(p.x); p.say = ""; });
    DOORS.forEach((dx, d) => {
      for (let i = 0; i < counts[d]; i++) {
        const kind = r() < P.slow * 0.35 ? r.pick(["elder", "stroller"]) : (r() < 0.25 ? "kid" : "adult");
        person(g, kind, "board", dx, FRONT_Y + 60, { door: d });
      }
    });
    // まえ を ふさぐ ひと
    const nBlock = r.int(P.block[0], P.block[1]);
    const doorsShuf = shuffle(r, [0, 1, 2]);
    // おりる ひと
    DOORS.forEach((dx, d) => {
      const n = r.int(P.alight[0], P.alight[1]) + (d === doorsShuf[0] && nBlock > 0 ? 1 : 0);
      for (let i = 0; i < n; i++) person(g, r() < 0.2 ? "kid" : "adult", "alight", dx, DOOR_Y, { door: d, order: i, hidden: true });
    });
    for (let i = 0; i < nBlock; i++) {
      const d = doorsShuf[i % 3];
      if (!g.people.some((p) => p.door === d && p.role === "alight")) person(g, "adult", "alight", DOORS[d], DOOR_Y, { door: d, order: 0, hidden: true });
      if (g.people.some((p) => p.door === d && p.role === "block")) continue;
      person(g, "adult", "block", DOORS[d], FRONT_Y + 4, { door: d, say: "" });
    }
    // とくべつ な おきゃくさん
    const isHiru = g.period === "hiru";
    const wheelHere = (isHiru && step.n === 0) || (g.plan.length === 1 && isHiru) || (!isHiru && r() < 0.12);
    if (wheelHere) {
      const d = r.int(0, 2);
      person(g, "wheel", "board", DOORS[d], FRONT_Y + 60, { door: d, needRamp: true });
      tr.special.push("wheel");
    }
    if (isHiru && step.n === 0 && g.plan.length > 1 && !g.people.some((p) => p.kind === "elder" || p.kind === "stroller")) {
      const d = r.int(0, 2);
      person(g, r.pick(["elder", "stroller"]), "board", DOORS[d], FRONT_Y + 60, { door: d });
    }
    if (isHiru && (step.n === 1 || (g.plan.length === 1))) {
      person(g, "lost", "lost", r.pick([70, 240, 360, 530]), 404, { say: "えーん" });
      g.stats.chances++;
    }
    if (isHiru && (step.n === 2 || (g.plan.length === 1))) {
      const it = r.pick(LOST_ITEMS);
      g.lostItems.push({ id: g.nextId++, x: r.pick([180, 420, 560]), y: 420, emoji: it.emoji, name: it.name });
      g.stats.chances++;
    }
    if (wheelHere) g.stats.chances++;
    // ならぶ ばしょ を きめる（くるまいす は さいご に のる）
    DOORS.forEach((dx, d) => lineUp(g, d, true));
    // ホーム の はし に いる ひと
    const nEdge = r.int(P.edge[0], P.edge[1]);
    const xs = shuffle(r, [60, 170, 230, 360, 420, 545]);
    for (let i = 0; i < nEdge; i++) person(g, r() < 0.3 ? "kid" : "adult", "edge", xs[i], EDGE_Y, { say: "" });
    // あとで おこる こと
    DOORS.forEach((dx, d) => { if (r() < P.stuck * 0.5 && boarders(g, d).length > 0) tr.stuckPlan.push({ door: d, kind: r.pick(P.items) }); });
    if (tr.stuckPlan.length === 0 && r() < P.stuck && counts.some((c) => c > 0)) {
      const d = counts.findIndex((c) => c > 0);
      tr.stuckPlan.push({ door: d, kind: r.pick(P.items) });
    }
    if (r() < P.runner) tr.runnerAt = 0.6 + r() * 2.4;
    // めやす の じかん（ていじ）
    let maxDoor = 0, slow = 0;
    DOORS.forEach((dx, d) => {
      const a = g.people.filter((p) => p.door === d && p.role === "alight").length;
      const b = boarders(g, d);
      let tt = a * 1.6 + b.length * 1.7;
      b.forEach((p) => { if (KINDS[p.kind].slow) tt += 3.5; if (p.kind === "wheel") tt += 5; });
      maxDoor = Math.max(maxDoor, tt);
      slow += b.filter((p) => KINDS[p.kind].slow).length;
    });
    tr.target = 7 + maxDoor + nBlock * 1.5 + tr.stuckPlan.length * 1.5 + (tr.runnerAt >= 0 ? 2 : 0);
    tr.approachTarget = 2.5 + nEdge * 1.4;
    tr.edge = nEdge; tr.block = nBlock;
    emit(g, "train", { no: g.trainNo, period: g.period, edge: nEdge });
  }

  function shuffle(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function nearestDoor(x) { let b = 0; DOORS.forEach((dx, d) => { if (Math.abs(dx - x) < Math.abs(DOORS[b] - x)) b = d; }); return b; }

  // ドア ごと に ならびなおす
  function lineUp(g, d, warp) {
    const q = g.people.filter((p) => p.door === d && p.role === "board");
    q.sort((a, b) => (a.kind === "wheel") - (b.kind === "wheel") || a.id - b.id);
    q.forEach((p, i) => {
      const s = queueSpot(d, i);
      if (warp) { p.x = s[0]; p.y = s[1]; p.path = []; }
      else if (Math.hypot(p.x - s[0], p.y - s[1]) > 2) goTo(p, [s]);
      p.qi = i;
    });
  }

  /* ---------- いま の きけん（あいず を だす まえ に たしかめる こと） ---------- */
  function hazards(g) {
    const out = [];
    const ppl = g.people;
    if (ppl.some((p) => p.role === "edge")) out.push({ key: "edge", text: "きいろい せん の そと に ひと が いるよ" });
    if (ppl.some((p) => p.role === "block")) out.push({ key: "block", text: "ドア の まえ を ふさいで いる ひと が いるよ" });
    if (ppl.some((p) => p.role === "alight" || p.role === "alighting")) out.push({ key: "alight", text: "まだ おりる ひと が いるよ" });
    if (ppl.some((p) => p.role === "board" && p.needRamp)) out.push({ key: "wheel", text: "くるまいす の ひと が まって いるよ" });
    if (ppl.some((p) => (p.role === "board" || p.role === "boarding") && !p.needRamp)) out.push({ key: "board", text: "まだ のる ひと が いるよ" });
    if (ppl.some((p) => p.role === "runner")) out.push({ key: "runner", text: "はしって くる ひと が いるよ" });
    if (g.stuck.length) out.push({ key: "stuck", text: "ドア に " + ITEMS[g.stuck[0].kind].name + " が はさまって いるよ" });
    if (g.point < 3) out.push({ key: "point", text: "ゆびさし かくにん が まだ だよ" });
    return out;
  }
  // のりおり が ぜんぶ おわった か
  function boardingDone(g) {
    return !g.people.some((p) => ["edge", "block", "alight", "alighting", "board", "boarding"].includes(p.role));
  }

  /* ---------- そうさ ---------- */
  function tapPerson(g, id) {
    const p = g.people.find((q) => q.id === id);
    if (!p) return { ok: false };
    if (p.role === "edge") {
      p.role = "board"; p.door = nearestDoor(p.x); p.say = "";
      lineUp(g, p.door, false);
      emit(g, "edge", { id, left: g.people.filter((q) => q.role === "edge").length });
      return { ok: true, say: "きいろい せん の うちがわ へ どうぞ" };
    }
    if (p.role === "block") {
      p.role = "board"; p.say = "";
      lineUp(g, p.door, false);
      emit(g, "block", { id });
      return { ok: true, say: "おりる ひと が さき です。わき へ どうぞ" };
    }
    if (p.role === "runner") {
      p.role = "next"; p.path = []; p.say = "つぎ に のるね";
      g.tr.runnerDone = true;
      emit(g, "runner", { id });
      return { ok: true, say: "かけこみ は あぶない！ つぎ の でんしゃ を どうぞ" };
    }
    if (p.role === "lost") {
      p.role = "helped"; p.say = "ありがとう"; p.kind = "lost";
      goTo(p, [[30, 404], [-40, 404]]);
      g.stats.helped++;
      emit(g, "helped", { what: "lost" });
      return { ok: true, say: "まいご の こ を えきいん しつ へ。おうち の ひと を よびだす よ" };
    }
    if (p.role === "board" && p.needRamp) return { ok: false, say: "スロープ を ドア に かけて あげよう" };
    if (p.role === "board" && KINDS[p.kind].slow) return { ok: false, say: "ゆっくり で だいじょうぶ。まって あげよう" };
    return { ok: false };
  }

  function placeRamp(g, d) {
    if (g.phase !== "open") return { ok: false, say: "ドア が あいて から かけよう" };
    const w = g.people.find((p) => p.needRamp && p.role === "board");
    if (!w) return { ok: false, say: "いま は スロープ は いらない みたい" };
    if (w.door !== d) return { ok: false, say: "くるまいす の ひと は ほか の ドア に いるよ" };
    g.ramp = d;
    emit(g, "ramp", { door: d });
    return { ok: true, say: "スロープ を かけました。どうぞ" };
  }

  function tapItem(g, id) {
    const si = g.stuck.findIndex((s) => s.id === id);
    if (si >= 0) {
      const s = g.stuck.splice(si, 1)[0];
      emit(g, "unstuck", { door: s.door });
      return { ok: true, say: ITEMS[s.kind].name + " を なか へ いれたよ" };
    }
    const li = g.lostItems.findIndex((s) => s.id === id);
    if (li >= 0) {
      const s = g.lostItems.splice(li, 1)[0];
      g.stats.helped++;
      emit(g, "helped", { what: "item" });
      return { ok: true, say: "おとしもの の " + s.name + "。えき で あずかります" };
    }
    return { ok: false };
  }

  function point(g, what) {
    if (g.phase !== "open") return { ok: false, say: "ドア が あいて いる とき に たしかめよう" };
    if (!boardingDone(g) || g.tr.stuckPlan.length) return { ok: false, say: "のりおり が おわって から たしかめよう" };
    if (g.point >= 3) return { ok: true, done: true, say: "かくにん ずみ！" };
    if (POINT_ORDER[g.point] !== what) {
      g.point = 0;
      emit(g, "pointbad", {});
      return { ok: false, say: "ドア → しんごう → とけい の じゅん だよ" };
    }
    g.point++;
    emit(g, "point", { what, n: g.point });
    return { ok: true, n: g.point, say: POINT_NAME[what] + "、よし！" };
  }

  // あいず（ながおし が おわった とき）
  function signal(g) {
    if (g.phase !== "open") return { ok: false, reasons: [], say: g.phase === "approach" ? "でんしゃ が まだ ついて いないよ" : "" };
    const hz = hazards(g);
    if (hz.length) {
      g.stats.matte++;
      g.stats.reasons[hz[0].key] = (g.stats.reasons[hz[0].key] || 0) + 1;
      if (!g.tr.matte) { g.tr.matte = true; g.stats.matteTrains++; }
      emit(g, "matte", { key: hz[0].key });
      return { ok: false, reasons: hz, say: "まって！ " + hz[0].text };
    }
    g.phase = "melody"; g.t = 0;
    const late = Math.max(0, g.tr.dwell - g.tr.target) + Math.max(0, g.tr.approachT - g.tr.approachTarget);
    g.tr.late = late;
    g.stats.delay += late;
    g.stats.trains++;
    g.log.push({ no: g.tr.no, period: g.tr.period, dwell: g.tr.dwell, target: g.tr.target, late, matte: g.tr.matte });
    emit(g, "depart", { late });
    return { ok: true, reasons: [], say: "しゅっぱつ OK！" };
  }

  /* ---------- じかん を すすめる ---------- */
  function move(p, dt) {
    if (!p.path.length) return true;
    const q = p.path[0];
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), s = speedOf(p) * dt;
    if (d <= s) { p.x = q.x; p.y = q.y; p.path.shift(); return !p.path.length; }
    p.x += dx / d * s; p.y += dy / d * s;
    return false;
  }

  function step(g, dt) {
    if (g.phase === "done") return;
    g.t += dt;
    const P = g.period;
    // ひと が あるく
    g.people.forEach((p) => {
      const arrived = move(p, dt);
      if (p.role === "alighting" && arrived) { p.role = "gone"; }
      if (p.role === "boarding" && arrived) { p.role = "gone"; emit(g, "boarded", { id: p.id, kind: p.kind }); }
      if (p.role === "helped" && arrived) p.role = "gone";
      if (p.role === "runner" && arrived) p.say = "はあ はあ";
    });
    g.people = g.people.filter((p) => p.role !== "gone");

    switch (g.phase) {
      case "between":
        if (g.t > 1.4 || g.trainNo < 0) {
          if (g.t < 0.6) break;
          if (g.trainNo + 1 >= g.plan.length) { g.phase = "done"; emit(g, "done", {}); break; }
          startTrain(g);
        }
        break;
      case "approach":
        g.tr.approachT += dt;
        if (g.t > 1.6 && !g.people.some((p) => p.role === "edge")) { g.phase = "arrive"; g.t = 0; emit(g, "arrive", {}); }
        break;
      case "arrive": {
        const k = Math.min(1, g.t / 2.4);
        g.trainX = -820 * Math.pow(1 - k, 2.2);
        if (k >= 1) { g.trainX = 0; g.phase = "open"; g.t = 0; emit(g, "open", {}); }
        break;
      }
      case "open":
        g.tr.dwell += dt;
        g.doorOpen = Math.min(1, g.doorOpen + dt * 2.5);
        if (g.doorOpen >= 1) flow(g, dt);
        break;
      case "melody":
        if (g.t > 2.2) { g.phase = "closing"; g.t = 0; emit(g, "closing", {}); }
        break;
      case "closing":
        g.doorOpen = Math.max(0, 1 - g.t / 1.0);
        if (g.t > 1.3) { g.phase = "leave"; g.t = 0; emit(g, "leave", {}); }
        break;
      case "leave": {
        const k = Math.min(1, g.t / 2.6);
        g.trainX = 760 * Math.pow(k, 2);
        if (k >= 1) { g.phase = "between"; g.t = 0; }
        break;
      }
    }
    return P;
  }

  // ドア が あいて いる あいだ の ながれ
  function flow(g, dt) {
    const tr = g.tr;
    DOORS.forEach((dx, d) => {
      const blocked = g.people.some((p) => p.door === d && p.role === "block");
      const outQ = g.people.filter((p) => p.door === d && p.role === "alight").sort((a, b) => a.order - b.order);
      const outMoving = g.people.some((p) => p.door === d && p.role === "alighting" && p.y < FRONT_Y + 20);
      if (outQ.length) {
        if (blocked) { outQ[0].hidden = false; outQ[0].say = "おりられない…"; return; }
        if (!outMoving) {
          const p = outQ[0];
          p.hidden = false; p.say = ""; p.role = "alighting";
          const st = dx < W / 2 ? STAIRS[0] : STAIRS[1];
          const side = dx < W / 2 ? -1 : 1;
          goTo(p, [[dx, FRONT_Y + 30], [dx + side * 30, 430], [st.x, st.y]]);
          emit(g, "alight", { door: d });
        }
        return;
      }
      // おりる ひと が いなく なったら のる
      if (blocked) return;
      const busy = g.people.some((p) => p.door === d && p.role === "boarding" && p.y > DOOR_Y + 30);
      if (busy || g.people.some((p) => p.door === d && p.role === "alighting" && p.y < FRONT_Y + 20)) return;
      const q = g.people.filter((p) => p.door === d && p.role === "board").sort((a, b) => a.qi - b.qi);
      if (!q.length) return;
      const p = q[0];
      if (p.path.length) return;   // まだ ならびに きて いない
      if (p.needRamp) {
        if (g.ramp !== d) { p.say = "スロープ を おねがい します"; return; }
        p.say = "ありがとう";
        g.stats.helped++;
        p.needRamp = false;
        emit(g, "helped", { what: "wheel" });
      }
      p.role = "boarding";
      goTo(p, [[dx, FRONT_Y], [dx, DOOR_Y]]);
      lineUp(g, d, false);
    });
    // のりおり が おわったら: はさまり・かけこみ
    if (boardingDone(g)) {
      tr.afterT = (tr.afterT || 0) + dt;
      if (tr.stuckPlan.length) {
        tr.stuckPlan.forEach((s) => { g.stuck.push({ id: g.nextId++, door: s.door, kind: s.kind }); emit(g, "stuck", { door: s.door, kind: s.kind }); });
        tr.stuckPlan = [];
      }
      if (tr.runnerAt >= 0 && tr.afterT > tr.runnerAt && !tr.runnerSpawned) {
        tr.runnerSpawned = true;
        const p = person(g, "runner", "runner", 640, 440, { say: "まって〜！" });
        goTo(p, [[560, 360], [DOORS[2] + 40, FRONT_Y + 6]]);
        emit(g, "runnerCome", { id: p.id });
      }
    }
    // くるまいす の ひと が のりおわったら スロープ を かたづける
    if (g.ramp >= 0 && !g.people.some((p) => p.kind === "wheel" && (p.role === "board" || p.role === "boarding"))) { g.ramp = -1; emit(g, "rampOff", {}); }
  }

  /* ---------- ★ ---------- */
  function stars(g) {
    const s = g.stats, n = Math.max(1, s.trains);
    const safe = s.matteTrains <= (n >= 4 ? 1 : 0);
    const onTime = s.delay <= 4 * n;
    const kind = s.chances === 0 ? true : s.helped / s.chances >= 0.8;
    return { safe, onTime, kind, total: (safe ? 1 : 0) + (onTime ? 1 : 0) + (kind ? 1 : 0) };
  }

  /* ---------- じどう で しごと を する ひと（テスト・デバッグ よう） ---------- */
  // react: その びょう すう ごと に 1つ だけ そうさ する（おそい ひと の まね）
  function autoAct(g, opt) {
    opt = opt || {};
    if (opt.careless && g.phase === "open") { const r = signal(g); if (r.ok) return "signal"; }
    const edge = g.people.find((p) => p.role === "edge");
    if (edge) return tapPerson(g, edge.id), "edge";
    if (g.phase !== "open") return null;
    const blk = g.people.find((p) => p.role === "block");
    if (blk) return tapPerson(g, blk.id), "block";
    const w = g.people.find((p) => p.needRamp && p.role === "board");
    if (w && g.ramp !== w.door) return placeRamp(g, w.door), "ramp";
    if (!opt.unkind) {
      const lost = g.people.find((p) => p.role === "lost");
      if (lost) return tapPerson(g, lost.id), "lost";
      if (g.lostItems.length) return tapItem(g, g.lostItems[0].id), "item";
    }
    const run = g.people.find((p) => p.role === "runner");
    if (run) return tapPerson(g, run.id), "runner";
    if (g.stuck.length) return tapItem(g, g.stuck[0].id), "stuck";
    if (!boardingDone(g)) return null;
    if (g.tr.runnerAt >= 0 && !g.tr.runnerSpawned) return null;   // ひと が くる か みて いる
    if (g.point < 3) return point(g, POINT_ORDER[g.point]), "point";
    const r = signal(g);
    return r.ok ? "signal" : "matte";
  }
  function autoDay(g, opt) {
    opt = opt || {};
    const dt = 0.05, react = opt.react || 0.6;
    let cool = 0, guard = 0;
    while (g.phase !== "done" && guard++ < 200000) {
      step(g, dt);
      g.events.length = 0;
      cool -= dt;
      if (cool <= 0) { const a = autoAct(g, opt); if (a) cool = react; }
    }
    return g;
  }

  const api = {
    W, H, DOORS, DOOR_Y, FRONT_Y, EDGE_Y, PERIODS, PERIOD_KEYS, KINDS, ITEMS, POINT_ORDER, POINT_NAME,
    makeRng, newDay, step, hazards, boardingDone, tapPerson, placeRamp, tapItem, point, signal, stars, autoAct, autoDay,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HomeGakari = api;
})(typeof window !== "undefined" ? window : globalThis);
