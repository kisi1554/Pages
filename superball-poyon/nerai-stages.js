/* ============================================================
   ④ ねらって ぽよん — ステージ データ と シミュレーション
   せかいは 1200×800（ゆか y=800）。ボールは パチンコしきで なげる
   ステージ: { name, hint, sling:[x,y], goal, walls, segs, blocks, bells, sol }
     goal: { t: "cup"|"bell"|"blocks", x, y, w, n, bounce }
       cup … カップに いれる（x,y は カップの そこ の まんなか、w は はば）
       bell … ベルを ならす（bells の どれか）
       blocks … ブロックを n こ こわす（n が ないと ぜんぶ）
       bounce … かべ・ゆか・いた で この かいすう はねてから
     walls: [cx, cy, w, h]（うごかない かべ）、segs: [ax, ay, bx, by]（ななめの いた）
     blocks: [cx, cy]（70×70 の こわれる ブロック）、bells: [x, y]
     sol: [vx, vy] … こたえ（なげる はやさ）。テストで ぜんぶ クリア できる ことを たしかめる
   こてい タイムステップ 1/60・8 サブステップ・Math.random なし → けっていてき
   ============================================================ */
(function (root, factory) {
  var P = typeof module === "object" && module.exports ? require("./physics.js") : root.SBPhysics;
  var api = factory(P);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SBNerai = api;
})(typeof self !== "undefined" ? self : this, function (P) {
  "use strict";
  var WW = 1200, WH = 800, BR = 22, K = 9, MAXPULL = 210, BLOCK = 70, BELL_R = 30, CUP_H = 90;
  var DT = 1 / 60, LIMIT = 9;

  var STAGES = [
    // 1〜5: まっすぐ ねらう
    { name: "はじめての カップ", hint: "ボールを うしろに ひっぱって はなそう", sling: [180, 560], goal: { t: "cup", x: 880, y: 800, w: 170 } },
    { name: "ベルを ならそう", hint: "うえの ほうへ ねらおう", sling: [180, 560], goal: { t: "bell" }, bells: [[900, 300]] },
    { name: "ブロック こわし", hint: "つよく あてると こわれるよ", sling: [180, 560], goal: { t: "blocks" }, blocks: [[850, 765]] },
    { name: "かべの むこう", hint: "やまなりに なげよう", sling: [180, 560], goal: { t: "cup", x: 960, y: 800, w: 170 }, walls: [[620, 640, 40, 320]] },
    { name: "たかい たな", hint: "たなの うえの カップ", sling: [180, 600], goal: { t: "cup", x: 950, y: 420, w: 160 }, walls: [[950, 435, 320, 30]] },
    // 6〜10: はねさせる
    { name: "1かい はねて", hint: "ゆかで 1かい ぽよんと させよう", sling: [180, 520], goal: { t: "cup", x: 950, y: 800, w: 170, bounce: 1 } },
    { name: "かべで はねかえす", hint: "みぎの かべに あてて もどそう", sling: [200, 560], goal: { t: "cup", x: 700, y: 800, w: 170, bounce: 1 }, walls: [[480, 700, 40, 200]] },
    { name: "ブロック 2こ", hint: "はねて つぎの ブロックへ", sling: [180, 560], goal: { t: "blocks", n: 2 }, blocks: [[650, 765], [1000, 765]] },
    { name: "てんじょう ぽよん", hint: "てんじょうに あてて おとそう", sling: [180, 600], goal: { t: "bell", bounce: 1 }, bells: [[1000, 600]], walls: [[760, 560, 40, 480]] },
    { name: "2かい はねて ベル", hint: "ゆかで 2かい はねさせて", sling: [180, 560], goal: { t: "bell", bounce: 2 }, bells: [[1050, 420]] },
    // 11〜15: いた と くみあわせ
    { name: "ななめの いた", hint: "いたに あてて むきを かえよう", sling: [180, 560], goal: { t: "cup", x: 1030, y: 800, w: 160 }, segs: [[600, 300, 800, 420]] },
    { name: "すべりだい", hint: "さかを ころがして カップへ", sling: [180, 400], goal: { t: "cup", x: 1080, y: 800, w: 150 }, segs: [[500, 520, 950, 700]] },
    { name: "ブロックの かべ", hint: "まえの ブロックを こわして すすもう", sling: [180, 560], goal: { t: "cup", x: 1000, y: 800, w: 160 }, blocks: [[700, 765], [700, 695], [700, 625]] },
    { name: "3かい はねて カップ", hint: "ひくく なげて ぽよん ぽよん ぽよん", sling: [180, 600], goal: { t: "cup", x: 1040, y: 800, w: 180, bounce: 3 } },
    { name: "ベルは かべの うしろ", hint: "たかく あげて おとそう", sling: [180, 600], goal: { t: "bell" }, bells: [[1050, 650]], walls: [[850, 600, 40, 400]] },
    // 16〜20: ちょっと むずかしい
    { name: "トンネル", hint: "あいだを とおそう", sling: [180, 640], goal: { t: "cup", x: 1050, y: 800, w: 150 }, walls: [[650, 250, 300, 360], [650, 760, 300, 80]] },
    { name: "2だん たな", hint: "うえの たなに カップ", sling: [180, 640], goal: { t: "cup", x: 1050, y: 300, w: 140 }, walls: [[1050, 315, 260, 30], [700, 560, 260, 30]] },
    { name: "ブロック 3こ", hint: "ぜんぶ こわせるかな", sling: [180, 560], goal: { t: "blocks", n: 3 }, blocks: [[600, 765], [850, 765], [1100, 765]] },
    { name: "かべ ぽよん ベル", hint: "かべで 2かい はねて", sling: [200, 600], goal: { t: "bell", bounce: 2 }, bells: [[600, 250]] },
    { name: "まんなかの はしら", hint: "はしらの うえを こえて", sling: [180, 600], goal: { t: "cup", x: 1000, y: 800, w: 150, bounce: 1 }, walls: [[640, 560, 60, 480]] },
    // 21〜25: いた いっぱい
    { name: "V の たに", hint: "たにに おとして はねさせよう", sling: [180, 400], goal: { t: "bell" }, bells: [[1000, 250]], segs: [[450, 600, 650, 760], [650, 760, 850, 600]] },
    { name: "ジグザグ", hint: "いたで はねて カップへ", sling: [180, 300], goal: { t: "cup", x: 1050, y: 800, w: 160 }, segs: [[450, 450, 700, 520], [750, 650, 950, 560]] },
    { name: "ブロックと ベル", hint: "ブロックを こわして ベル", sling: [180, 560], goal: { t: "bell" }, bells: [[1050, 700]], blocks: [[800, 765], [800, 695]] },
    { name: "ひくい てんじょう", hint: "ひくく ひくく", sling: [180, 680], goal: { t: "cup", x: 1050, y: 800, w: 160 }, walls: [[650, 300, 1000, 300]] },
    { name: "3かい はねて ベル", hint: "なんども はねさせて", sling: [180, 600], goal: { t: "bell", bounce: 3 }, bells: [[1050, 200]] },
    // 26〜30: さいごの ちょうせん
    { name: "はこの なかの カップ", hint: "うえの あなから いれよう", sling: [180, 640], goal: { t: "cup", x: 1000, y: 800, w: 150 }, walls: [[850, 600, 30, 400], [1150, 600, 30, 400], [1080, 400, 170, 30]] },
    { name: "ブロック 2こ と はねる", hint: "1かい はねてから こわそう", sling: [180, 560], goal: { t: "blocks", n: 2, bounce: 1 }, blocks: [[900, 765], [1100, 765]] },
    { name: "まどの むこうの ベル", hint: "まどを ぬけて", sling: [180, 600], goal: { t: "bell" }, bells: [[1050, 400]], walls: [[800, 180, 40, 360], [800, 680, 40, 240]] },
    { name: "とおい たな", hint: "おもいきり なげよう", sling: [160, 680], goal: { t: "cup", x: 1080, y: 260, w: 140 }, walls: [[1080, 275, 200, 30]] },
    { name: "ぽよよん マスター", hint: "2かい はねて、はしらを こえて カップ", sling: [180, 600], goal: { t: "cup", x: 1050, y: 800, w: 160, bounce: 2 }, walls: [[760, 600, 40, 400]] }
  ];

  // こたえ（tests/solve-nerai.js で さがして はりつけた もの）
  var SOL = [[316,-869],[662,-1001],[254,-1019],[508,-976],[662,-1060],[352,-828],[531,-1349],[363,-796],[549,-1206],[287,-1036],[330,-560],[342,-940],[631,-808],[1343,-958],[508,-1197],[431,-552],[691,-1246],[604,-301],[739,-1419],[828,1160],[723,-926],[647,-62],[272,-1092],[351,-719],[1875,16],[462,-1269],[448,-809],[646,-827],[808,-1293],[1472,286]];
  STAGES.forEach(function (st, i) { st.no = i + 1; if (SOL[i]) st.sol = SOL[i]; });

  function cupSegs(g) {
    var hw = g.w / 2, x = g.x, y = g.y;
    return [
      { ax: x - hw, ay: y - CUP_H, bx: x - hw, by: y - 4, rad: 6, e: 0.4, mu: 1, tag: "cup" },
      { ax: x - hw, ay: y - 4, bx: x + hw, by: y - 4, rad: 6, e: 0.15, mu: 1, et: 0, tag: "cup" },
      { ax: x + hw, ay: y - 4, bx: x + hw, by: y - CUP_H, rad: 6, e: 0.4, mu: 1, tag: "cup" }
    ];
  }

  function build(st) {
    var w = new P.World({ gy: 1400, substeps: 8, air: 0, spinDamp: 0, maxSpeed: 2600 });
    w.setBounds(0, 0, WW, WH);
    var sim = { st: st, w: w, ball: null, bounces: 0, broken: 0, rung: false, ok: false, fail: "", t: 0, still: 0, lastB: -1, events: [] };
    (st.walls || []).forEach(function (r) { w.boxes.push({ x: r[0], y: r[1], hw: r[2] / 2, hh: r[3] / 2, e: 1, tag: "wall" }); });
    (st.blocks || []).forEach(function (b, i) { w.boxes.push({ x: b[0], y: b[1], hw: BLOCK / 2, hh: BLOCK / 2, e: 0.8, tag: "block", i: i }); });
    (st.segs || []).forEach(function (s) { w.segs.push({ ax: s[0], ay: s[1], bx: s[2], by: s[3], rad: 8, e: 1, tag: "seg" }); });
    if (st.goal.t === "cup") w.segs = w.segs.concat(cupSegs(st.goal));
    (st.bells || []).forEach(function (b) { w.discs.push({ x: b[0], y: b[1], r: BELL_R, e: 1, tag: "bell" }); });
    w.onHit = function (b, o, sp) {
      if (o.tag === "block") {
        if (sp > 150 && !o.gone) { o.gone = true; sim.broken++; sim.events.push({ t: "break", x: o.x, y: o.y }); }
        return;
      }
      if (o.tag === "bell") {
        sim.events.push({ t: "bell" });
        if (st.goal.t === "bell") { if (sim.bounces >= (st.goal.bounce || 0)) sim.ok = true; else sim.events.push({ t: "early" }); }
        return;
      }
      if (o.tag === "cup") return;
      if (sp > 150 && w.time - sim.lastB > 0.05) {
        sim.lastB = w.time; sim.bounces++;
        sim.events.push({ t: "bounce", sp: sp, x: b.x, y: b.y });
      }
    };
    return sim;
  }

  function launch(sim, vx, vy) {
    var s = sim.st.sling;
    sim.ball = sim.w.add({ x: s[0], y: s[1], r: BR, vx: vx, vy: vy, e: 0.9, et: 0.7, mu: 0.9 });
  }

  function need(st) {
    var g = st.goal;
    return g.t === "blocks" ? (g.n || (st.blocks || []).length) : 0;
  }

  function step(sim) {
    if (sim.ok || sim.fail) return;
    var w = sim.w, st = sim.st, g = st.goal, b = sim.ball;
    w.step(DT);
    sim.t += DT;
    // こわれた ブロックを とりのぞく
    if (w.boxes.some(function (x) { return x.gone; })) w.boxes = w.boxes.filter(function (x) { return !x.gone; });
    if (!b) return;
    if (g.t === "blocks" && sim.broken >= need(st)) {
      if (sim.bounces >= (g.bounce || 0)) sim.ok = true;
      else sim.fail = "bounce";
    }
    if (g.t === "cup") {
      var hw = g.w / 2 - BR * 0.5;
      if (Math.abs(b.x - g.x) < hw && b.y > g.y - CUP_H + BR * 0.4 && b.y < g.y) {
        if (sim.bounces >= (g.bounce || 0)) sim.ok = true; else sim.fail = "bounce";
      }
    }
    var sp = Math.hypot(b.vx, b.vy);
    sim.still = sp < 30 || b.sleeping ? sim.still + DT : 0;
    if (!sim.ok && !sim.fail && (sim.still > 0.8 || sim.t > LIMIT)) sim.fail = "stop";
  }

  // ヘッドレスで さいごまで うごかす
  function run(st, vx, vy) {
    var sim = build(st);
    launch(sim, vx, vy);
    while (!sim.ok && !sim.fail) step(sim);
    return sim;
  }

  // よそうせん: さいしょに はねる ところまで
  function preview(st, vx, vy, broken) {
    var sim = build(st);
    if (broken) sim.w.boxes = sim.w.boxes.filter(function (x) { return x.tag !== "block" || !broken[x.i]; });
    sim.w.onHit = function (b, o) { if (!sim.hit) sim.hit = { x: b.x, y: b.y }; };
    launch(sim, vx, vy);
    var pts = [], n = 0;
    while (!sim.hit && n < 180) {
      sim.w.step(DT); n++;
      pts.push([sim.ball.x, sim.ball.y]);
    }
    if (sim.hit) pts.push([sim.hit.x, sim.hit.y]);
    return pts;
  }

  return { STAGES: STAGES, WW: WW, WH: WH, BR: BR, K: K, MAXPULL: MAXPULL, BLOCK: BLOCK, BELL_R: BELL_R, CUP_H: CUP_H, DT: DT,
    build: build, launch: launch, step: step, run: run, preview: preview, need: need };
});
