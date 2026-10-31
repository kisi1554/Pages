/* ミツバチの いちにち ｜ ダンス クイズ（なかまの ダンスを みて、はなばたけの ばしょを あてる） */
(function () {
  "use strict";
  const MB = window.MB, A = MB.Art, App = MB.App, D = window.DANCE, Map = MB.Map;
  const TAU = Math.PI * 2;
  const LET = ["A", "B", "C"];
  const SUNS = [{ az: 105, lb: "あさ" }, { az: 150, lb: "ごぜん" }, { az: 180, lb: "おひる" }, { az: 215, lb: "ごご" }, { az: 255, lb: "ゆうがた" }];

  let q, t, W, H, combBox, mapGeo, center, answered, qn, score, picked;

  // もんだいを つくる: こたえ 1つ ＋ まちがい 2つ（むきが ちがう / きょりが ちがう）
  function makeQ() {
    for (let tries = 0; tries < 500; tries++) {
      const sun = SUNS[Math.floor(Math.random() * SUNS.length)];
      const round = Math.random() < 0.22;
      const ans = { az: Math.floor(Math.random() * 360), dist: round ? 50 + Math.floor(Math.random() * 40) : 350 + Math.floor(Math.random() * 1450) };
      let w1, w2;
      if (round) {
        w1 = { az: D.norm(ans.az + 120 + Math.random() * 120), dist: 700 + Math.random() * 900 };
        w2 = { az: D.norm(ans.az + 40 + Math.random() * 60), dist: 1200 + Math.random() * 700 };
      } else {
        const side = Math.random() < 0.5 ? -1 : 1;
        w1 = { az: D.norm(ans.az + side * (70 + Math.random() * 90)), dist: ans.dist * (0.8 + Math.random() * 0.4) };     // むきが ちがう
        const far = ans.dist < 900;
        w2 = { az: D.norm(ans.az + (Math.random() - 0.5) * 16), dist: far ? Math.min(1950, ans.dist * 2.4) : ans.dist * 0.3 }; // きょりが ちがう
      }
      const sps = MB.FLOWERS.map((f) => f.id).sort(() => Math.random() - 0.5);
      const list = [ans, w1, w2].map((p, i) => ({ id: "q" + i, sp: sps[i], az: Math.round(p.az), dist: Math.round(p.dist), rich: 2, rot: Math.random() * TAU }));
      // ちずの うえで かさならない
      let ok = true;
      for (let i = 0; i < 3 && ok; i++) for (let j = i + 1; j < 3; j++) {
        const a = D.toXY(list[i].az, D.mapRho(list[i].dist)), b = D.toXY(list[j].az, D.mapRho(list[j].dist));
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.42) ok = false;
      }
      if (!ok) continue;
      // まちがいが ほんとうに まちがい（ダンスで そこに つかない）
      const dance = D.plan(sun.az, list[0]);
      if (!D.landing(sun.az, dance, list, "q0").ok) continue;
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      const patches = order.map((i) => list[i]);
      return { sun, dance, patches, answer: "q0" };
    }
    return null;
  }

  const Quiz = {
    enter() { qn = 0; score = 0; t = 0; this.next(); },
    next() {
      q = makeQ(); answered = false; picked = null; t = 0; qn++;
      W = App.view.W; H = App.view.H; this.resize(W, H);
      App.panel(
        '<p class="ptitle">💃 ダンス クイズ ' + qn + "/5</p>" +
        '<p class="ptext">なかまが おどって いるよ。はなばたけは ちずの どれ？ ちずの はなばたけを タップ！</p>' +
        '<p class="ptext soft">' + q.sun.lb + "・たいようは " + App.AZ_NAME(q.sun.az) + "。まうえ ＝ たいようの ほう、ふりふり 1びょう ≒ 1キロ、まるい ダンス ＝ すぐ ちかく。</p>" +
        '<div class="row"><button type="button" class="btn" id="qHome">🏠 ホーム</button></div>');
      App.$("qHome").onclick = () => App.go("home");
    },
    resize(w, h) {
      W = w; H = h;
      if (W > H * 1.1) { combBox = { x: 0, y: 0, w: W / 2, h: H }; mapGeo = Map.geom(W / 2, 0, W / 2, H); }
      else { combBox = { x: 0, y: 0, w: W, h: H * 0.42 }; mapGeo = Map.geom(0, H * 0.42, W, H * 0.58); }
      center = { x: combBox.x + combBox.w / 2, y: combBox.y + combBox.h * 0.58 };
    },
    down(p) {
      if (answered) return;
      for (const pa of q.patches) {
        const c = Map.pos(mapGeo, pa.az, pa.dist);
        if (Math.hypot(p.x - c.x, p.y - c.y) < Map.patchR(mapGeo) * 1.3) { this.pick(pa.id); return; }
      }
    },
    pick(id) {
      answered = true; picked = id;
      const ok = id === q.answer, S = App.S;
      S.quiz.try++; if (ok) { S.quiz.ok++; score++; } App.save();
      ok ? MB.Sound.ok() : MB.Sound.ng();
      const ans = q.patches.find((p) => p.id === q.answer);
      const rel = D.signed(ans.az - q.sun.az);
      const why = q.dance.type === "round"
        ? "まるい ダンス ＝ すの すぐ ちかく（" + ans.dist + "メートル）。"
        : "まっすぐ すすむ むきは まうえから " + (Math.abs(rel) < 3 ? "まっすぐ" : (rel > 0 ? "みぎへ " : "ひだりへ ") + Math.round(Math.abs(rel)) + "ど") +
          " → たいようから おなじ むき。ふりふり " + q.dance.sec.toFixed(1) + "びょう → やく " + (ans.dist / 1000).toFixed(1) + "キロ。";
      App.panel(
        '<p class="ptitle">' + (ok ? "🎉 せいかい！" : "🤔 ざんねん！ こたえは " + MB.FLOWER[ans.sp].name) + "</p>" +
        '<p class="ptext">' + why + "</p>" +
        '<div class="row">' + (qn < 5 ? '<button type="button" class="btn main" id="qNext">つぎの もんだい ▶</button>'
          : '<button type="button" class="btn main" id="qNext">もういちど あそぶ</button>') +
        '<button type="button" class="btn" id="qHome">🏠 ホーム</button></div>');
      if (qn >= 5) App.toast("5もん ちゅう " + score + "もん せいかい！", 3500);
      App.$("qNext").onclick = () => { if (qn >= 5) this.enter(); else this.next(); };
      App.$("qHome").onclick = () => App.go("home");
    },
    update(dt) { t += dt; },
    draw(g) {
      // すいた
      g.save(); g.beginPath(); g.rect(combBox.x, combBox.y, combBox.w, combBox.h); g.clip();
      MB.drawCombBg(g, W, H);
      MB.drawUp(g, combBox.x, combBox.w, t);
      const s = Math.max(13, Math.min(24, Math.min(combBox.w, combBox.h) * 0.075));
      const L = Math.min(MB.runLen(q.dance.sec || 0.5, W, H), combBox.h * 0.62);
      const a = MB.danceAnim(t % 60, q.dance, center.x, center.y, L);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * TAU + 0.5, bx = center.x + Math.cos(ang) * L * 0.8 + Math.cos(ang) * 30, by = center.y + Math.sin(ang) * L * 0.55 + Math.sin(ang) * 18;
        A.bee(g, bx, by, s * 0.85, Math.atan2(a.x - bx, -(a.y - by)), { flap: 0.25 });
      }
      A.bee(g, a.x, a.y, s, a.h, { wag: a.wag, flap: 0.4 + 0.15 * Math.sin(t * 40), happy: true, pollen: "#ffc400" });
      if (a.run && Math.floor(t * 14) % 2) MB.Sound.waggle();
      g.restore();
      // ちず
      Map.draw(g, mapGeo);
      Map.drawSun(g, mapGeo, q.sun.az, t, q.sun.lb);
      q.patches.forEach((p, i) => {
        const c = Map.drawPatch(g, mapGeo, p, { letter: LET[i], letterColor: answered && p.id === q.answer ? "#2b8a3e" : undefined });
        if (answered && (p.id === q.answer || p.id === picked)) {
          g.strokeStyle = p.id === q.answer ? "#2b8a3e" : "#d9480f"; g.lineWidth = 5;
          A.circ(g, c.x, c.y, Map.patchR(mapGeo) * 1.2); g.stroke();
        }
      });
      Map.drawHive(g, mapGeo);
      if (answered) {
        const ans = q.patches.find((p) => p.id === q.answer), c = Map.pos(mapGeo, ans.az, ans.dist);
        g.strokeStyle = "#2b8a3e"; g.lineWidth = 3; g.setLineDash([7, 6]);
        g.beginPath(); g.moveTo(mapGeo.cx, mapGeo.cy); g.lineTo(c.x, c.y); g.stroke(); g.setLineDash([]);
      }
    },
    _state() { return { q, answered, picked, mapGeo }; },
  };
  App.register("quiz", Quiz);
})();
