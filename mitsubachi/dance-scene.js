/* ミツバチの いちにち ｜ 8のじダンス（すの なかの すいたの うえで、ゆびで おどる） */
(function () {
  "use strict";
  const MB = window.MB, A = MB.Art, App = MB.App, D = window.DANCE, Map = MB.Map;
  const TAU = Math.PI * 2, rad = (d) => (d * Math.PI) / 180;

  /* ---------------------------------------------------------------- ダンスの うごき（クイズでも つかう）
   *  t びょうめの ダンサーの いち・むき。c: まんなか、L: まっすぐ すすむ ながさ（px） */
  function danceAnim(t, dance, cx, cy, L) {
    if (dance.type === "round") {
      const P = 1.5, k = Math.floor(t / P), dir = k % 2 ? -1 : 1, a = dir * ((t % P) / P) * TAU, r = L * 0.4;
      return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), h: Math.atan2(Math.cos(a) * dir, -Math.sin(a) * dir), wag: 0, run: false };
    }
    const runT = Math.max(0.35, dance.sec), retT = 0.9, P = runT + retT;
    const k = Math.floor(t / P), ph = t - k * P;
    const v = D.combVec(dance.angle);
    if (ph < runT) {
      const u = ph / runT;
      return { x: cx + v.x * L * (u - 0.5), y: cy + v.y * L * (u - 0.5), h: rad(dance.angle), wag: Math.sin(ph * TAU * 7), run: true };
    }
    const u = (ph - runT) / retT, side = k % 2 ? -1 : 1, a = side * u * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    const rx = v.x * ca - v.y * sa, ry = v.x * sa + v.y * ca;           // まんなか → いま
    const tx = -ry * side, ty = rx * side;                                 // すすむ むき
    return { x: cx + (rx * L) / 2, y: cy + (ry * L) / 2, h: Math.atan2(tx, -ty), wag: 0, run: false };
  }
  function runLen(sec, W, H) { return Math.max(40, Math.min(Math.min(W, H) * 0.5, 40 + sec * 55)); }
  MB.danceAnim = danceAnim; MB.runLen = runLen;

  // すいたの はいけい（オフスクリーンに 1かい だけ かく）
  let combCv = null, combKey = "";
  function drawCombBg(g, W, H) {
    const key = W + "x" + H + "@" + App.view.dpr;
    if (key !== combKey) {
      combCv = document.createElement("canvas");
      combCv.width = Math.round(W * App.view.dpr); combCv.height = Math.round(H * App.view.dpr);
      const cg = combCv.getContext("2d"); cg.scale(App.view.dpr, App.view.dpr);
      A.combBg(cg, W, H, Math.max(13, Math.min(W, H) / 22), 7);
      combKey = key;
    }
    g.drawImage(combCv, 0, 0, W, H);
  }
  MB.drawCombBg = drawCombBg;

  // すいたの うえの「たいようの ほう」
  // x 〜 x+w の あいだに おさめて かく（せまい ときは 2ぎょう）
  function drawUp(g, x, w, t) {
    let fs = Math.max(13, Math.min(22, w * 0.06));
    g.font = "bold " + Math.round(fs) + "px sans-serif";
    const one = "↑ うえ ＝ たいようの ほう", sr = fs * 0.8;
    const two = g.measureText(one).width + sr * 3 > w - 8;
    const lines = two ? ["↑ うえ ＝", "たいようの ほう"] : [one];
    const tw = Math.max(...lines.map((l) => g.measureText(l).width));
    const bw = Math.min(w - 4, tw + sr * 3.2), bh = fs * (two ? 2.7 : 1.9), bx = x + (w - bw) / 2, by = 8;
    g.fillStyle = "rgba(255,250,220,.92)"; g.beginPath(); g.roundRect(bx, by, bw, bh, 12); g.fill();
    A.sun(g, bx + sr * 1.3, by + bh / 2, sr * 0.75, t);
    g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#8a4b00";
    lines.forEach((l, i) => g.fillText(l, bx + sr * 2.6, by + bh / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
  }
  MB.drawUp = drawUp;

  /* ---------------------------------------------------------------- シーン */
  let o, phase, t, W, H, card, cardGeo, stroke, dancer, dance, res, sisters, recruits, flyT, hint, fullGeo, tries, center;

  const Scene = {
    enter(opts) {
      o = opts; t = 0; phase = "draw"; stroke = null; res = null; hint = false; tries = 0;
      dancer = { x: 0, y: 0, h: 0, wag: 0 };
      W = App.view.W; H = App.view.H; this.resize(W, H);
      this.panelDraw();
      const tg = this.target();
      App.say("🐝", D.isRound(tg.dist)
        ? "<b>" + MB.FLOWER[tg.sp].name + "ばたけ</b> は すの すぐ ちかく！ ちかい ときは、ゆびで <b>ぐるっと まるを かいて</b> おどろう。"
        : "<b>" + MB.FLOWER[tg.sp].name + "ばたけ</b> を おしえよう。すいたの <b>まうえ が たいようの ほう</b>。みぎうえの ちずと おなじ むきに、ゆびで <b>まっすぐ すーっと</b> なぞろう。<b>ながく なぞる ほど とおい</b> よ。");
    },
    target() { return o.patches.find((p) => p.id === o.targetId); },
    resize(w, h) {
      W = w; H = h;
      const m = Math.max(128, Math.min(250, W * 0.5, H * 0.34));
      card = { x: W - m - 8, y: 8, w: m, h: m };
      cardGeo = Map.geom(card.x, card.y, card.w, card.h);
      fullGeo = Map.geom(0, 0, W, H);
      center = { x: W * (W > H ? 0.42 : 0.5), y: H * (W > H ? 0.55 : 0.6) };
      if (phase === "draw" && !stroke) { dancer.x = center.x; dancer.y = center.y; dancer.h = 0; }
      sisters = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; sisters.push({ a, x: center.x + Math.cos(a) * 80, y: center.y + Math.sin(a) * 80 }); }
    },
    panelDraw() {
      const tg = this.target();
      const rel = D.signed(tg.az - o.sunAz);
      const where = D.isRound(tg.dist) ? "すぐ ちかく（" + tg.dist + "メートル）"
        : "たいようから " + (Math.abs(rel) < 3 ? "まっすぐ" : (rel > 0 ? "みぎへ " : "ひだりへ ") + Math.round(Math.abs(rel)) + "ど") + "・" + (tg.dist / 1000).toFixed(1) + "キロ";
      App.panel(
        '<p class="ptitle">💃 8のじ ダンスで おしえよう</p>' +
        '<p class="ptext">' + MB.FLOWER[tg.sp].name + "ばたけ " + "★".repeat(tg.rich) + "<br>" + where + "</p>" +
        '<p class="ptext soft">まうえ ＝ たいようの ほう。まっすぐ すすむ むき ＝ はなの ほう。おしりを ふる じかん ＝ きょり（1びょう ≒ 1キロ）。とても ちかい ときは まるく まわる。</p>' +
        '<div class="row"><button type="button" class="btn" id="dHint">💡 ヒント</button><button type="button" class="btn" id="dHome">🏠 ホーム</button></div>');
      App.$("dHint").onclick = () => { hint = !hint; MB.Sound.tap(); };
      App.$("dHome").onclick = () => App.go("home");
    },
    panelResult() {
      const r = res, tg = this.target();
      let msg = "";
      if (r.ok) msg = r.round ? "まるい ダンスで「すぐ ちかく」と つたわった！" : "なかまが " + MB.FLOWER[tg.sp].name + "ばたけに ついたよ！";
      else if (r.kind === "round-far") msg = "まるい ダンスは「すぐ ちかく」の いみ。とおい ときは 8のじ ダンスで むきと きょりを おしえよう。";
      else if (D.isRound(tg.dist)) msg = "すぐ ちかくの ときは、ぐるっと まるく まわる ダンス だよ。";
      else {
        const parts = [];
        if (Math.abs(r.angleErr) > 20) parts.push("むきが " + (r.angleErr > 0 ? "みぎ" : "ひだり") + "へ " + Math.round(Math.abs(r.angleErr)) + "ど ずれていたよ（すいたの まうえ ＝ たいようの ほう）");
        if (r.distRatio > 1.4) parts.push("おしりを ふる じかんが ながくて、とおくへ いっちゃった");
        if (r.distRatio < 0.65) parts.push("おしりを ふる じかんが みじかくて、てまえに おりちゃった");
        if (!parts.length) parts.push("もう すこし！");
        msg = parts.join("。") + "。";
        if (r.kind === "other") msg = "ちがう はなばたけ（" + MB.FLOWER[o.patches.find((p) => p.id === r.patchId).sp].name + "）に ついちゃった。" + msg;
      }
      App.panel(
        '<p class="ptitle">' + (r.ok ? "🎉 せいこう！" : "🤔 おしい！") + "</p>" +
        '<p class="ptext">' + msg + "</p>" +
        '<div class="row"><button type="button" class="btn" id="dAgain">💃 もういちど</button>' +
        '<button type="button" class="btn main" id="dNext">' + (o.trip >= 2 ? "🌙 1にち おしまい" : "🌼 つぎの はなばたけへ") + "</button></div>" +
        '<div class="row"><button type="button" class="btn" id="dHome">🏠 ホーム</button></div>');
      App.$("dAgain").onclick = () => { phase = "draw"; stroke = null; res = null; dancer.x = center.x; dancer.y = center.y; this.panelDraw(); };
      App.$("dNext").onclick = () => MB.Main.nextTrip();
      App.$("dHome").onclick = () => App.go("home");
    },
    inCard(p) { return p.x >= card.x && p.x <= card.x + card.w && p.y >= card.y && p.y <= card.y + card.h; },
    down(p) {
      if (phase !== "draw") return;
      App.hideBubble();
      if (this.inCard(p)) return;
      stroke = [p]; dancer.x = p.x; dancer.y = p.y;
    },
    move(p, isDown) {
      if (phase !== "draw" || !stroke || !isDown) return;
      const q = stroke[stroke.length - 1];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < 1) return;
      stroke.push(p);
      dancer.h = Math.atan2(p.x - q.x, -(p.y - q.y));
      dancer.x = p.x; dancer.y = p.y; dancer.wag = Math.sin(p.t / 1000 * TAU * 7);
      MB.Sound.waggle();
    },
    up(p) {
      if (phase !== "draw" || !stroke) return;
      const pts = stroke; stroke = null;
      this.finishStroke(pts);
    },
    finishStroke(pts) {
      const an = D.analyzeStroke(pts);
      if (an.type === "none") { App.toast("ゆびで すーっと ながめに なぞってね"); return; }
      dance = an.type === "round" ? { type: "round" } : { type: "waggle", angle: an.angle, sec: Math.max(0.15, an.sec) };
      phase = "replay"; t = 0; tries++;
      App.say("🐝", dance.type === "round" ? "ぐるっ ぐるっ。「すぐ ちかくに いい はなが あるよ！」" : "ぷるぷる ぷるぷる…（" + dance.sec.toFixed(1) + "びょう）。なかまが ダンスに ついて きて いるよ。");
    },
    update(dt) {
      t += dt;
      if (phase === "replay") {
        const L = runLen(dance.sec || 0.5, W, H);
        const a = danceAnim(t, dance, center.x, center.y, L);
        dancer.x = a.x; dancer.y = a.y; dancer.h = a.h; dancer.wag = a.wag;
        if (a.run) MB.Sound.waggle();
        const P = dance.type === "round" ? 1.5 : Math.max(0.35, dance.sec) + 0.9;
        if (t > P * 2 + 0.2) this.startFly();
      } else if (phase === "fly") {
        flyT += dt;
        recruits.forEach((r) => { const u = Math.min(1, flyT / r.dur); r.u = u; });
        MB.Sound.buzz(flyT < 2.2 ? 0.4 : 0);
        if (flyT > 2.4 && phase === "fly") this.showResult();
      }
      // なかまは ダンサーの ほうを むく
      sisters.forEach((s) => { s.h = Math.atan2(dancer.x - s.x, -(dancer.y - s.y)); });
    },
    startFly() {
      App.hideBubble();
      res = D.landing(o.sunAz, dance, o.patches, o.targetId);
      phase = "fly"; flyT = 0;
      const land = D.fromXY(res.landing.x, res.landing.y);
      recruits = [];
      for (let i = 0; i < 3; i++) {
        let az = land.az + (i - 1) * 5, dist = land.dist * (1 + (i - 1) * 0.06);
        if (res.patchId) { const p = o.patches.find((q) => q.id === res.patchId); az = p.az; dist = p.dist; }
        recruits.push({ az, dist, off: (i - 1) * 1.6, dur: 1.8 + i * 0.2, u: 0 });
      }
    },
    showResult() {
      phase = "result";
      const S = App.S;
      S.dance.try++;
      if (res.ok) { S.dance.ok++; if (res.round) S.dance.round++; MB.Sound.ok(); } else MB.Sound.ng();
      App.save();
      this.panelResult();
    },
    draw(g) {
      if (phase === "fly" || phase === "result") return this.drawFly(g);
      drawCombBg(g, W, H);
      drawUp(g, 6, card.x - 12, t);
      // ヒント（ただしい むき）
      const tg = this.target();
      if (hint) {
        const pl = D.plan(o.sunAz, tg);
        g.save(); g.globalAlpha = 0.85;
        if (pl.type === "round") {
          g.strokeStyle = "#fff"; g.lineWidth = 6; g.setLineDash([10, 8]); A.circ(g, center.x, center.y, 40); g.stroke(); g.setLineDash([]);
        } else {
          const v = D.combVec(pl.angle), L = runLen(pl.sec, W, H);
          g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 3; g.setLineDash([6, 6]);
          g.beginPath(); g.moveTo(center.x, center.y); g.lineTo(center.x, center.y - L * 0.9); g.stroke(); g.setLineDash([]);
          g.strokeStyle = "#fff"; g.lineWidth = 8; g.lineCap = "round";
          g.beginPath(); g.moveTo(center.x - v.x * L / 2, center.y - v.y * L / 2); g.lineTo(center.x + v.x * L / 2, center.y + v.y * L / 2); g.stroke();
          const ex = center.x + v.x * L / 2, ey = center.y + v.y * L / 2, h = Math.atan2(v.x, -v.y);
          g.fillStyle = "#fff"; g.beginPath();
          g.moveTo(ex + Math.sin(h) * 16, ey - Math.cos(h) * 16); g.lineTo(ex + Math.sin(h + 2.4) * 14, ey - Math.cos(h + 2.4) * 14); g.lineTo(ex + Math.sin(h - 2.4) * 14, ey - Math.cos(h - 2.4) * 14); g.fill();
          g.font = "bold 15px sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#7a4a00";
          const lb = pl.sec.toFixed(1) + "びょう";
          g.strokeText(lb, center.x, center.y + 30); g.fillStyle = "#fff"; g.fillText(lb, center.x, center.y + 30);
        }
        g.restore();
      }
      // ゆびの あと
      if (stroke && stroke.length > 1) {
        g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
        g.beginPath(); stroke.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
      }
      // なかま
      const s = Math.max(14, Math.min(26, Math.min(W, H) * 0.045));
      sisters.forEach((b, i) => A.bee(g, b.x, b.y, s * 0.9, b.h, { flap: 0.2 + 0.1 * Math.sin(t * 3 + i) }));
      // ダンサー
      A.bee(g, dancer.x, dancer.y, s * 1.1, dancer.h, { wag: dancer.wag, flap: 0.35 + 0.15 * Math.sin(t * 40), happy: true, pollen: MB.FLOWER[tg.sp].eye });
      // ふりふり タイマー
      if (stroke && stroke.length > 1) {
        const an = D.analyzeStroke(stroke);
        const txt = an.type === "round" ? "ぐるっと まる" : "ふりふり " + (an.sec || 0).toFixed(1) + "びょう ≒ " + (D.distFromWaggle(an.sec || 0) / 1000).toFixed(1) + "キロ";
        g.font = "bold 18px sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
        g.lineWidth = 5; g.strokeStyle = "rgba(90,50,0,.9)"; g.strokeText(txt, dancer.x, dancer.y - s * 1.6); g.fillStyle = "#fff"; g.fillText(txt, dancer.x, dancer.y - s * 1.6);
      }
      this.drawCard(g);
    },
    drawCard(g) {
      g.save();
      g.fillStyle = "#fff"; g.beginPath(); g.roundRect(card.x - 4, card.y - 4, card.w + 8, card.h + 8, 16); g.fill();
      Map.draw(g, cardGeo, { rings: false, round: 12 });
      const tg = this.target();
      o.patches.forEach((p) => { if (p.id !== tg.id) { g.globalAlpha = 0.35; Map.drawPatch(g, cardGeo, p, { label: false }); g.globalAlpha = 1; } });
      Map.drawHive(g, cardGeo);
      const sp = Map.drawSun(g, cardGeo, o.sunAz, t);
      const fp = Map.drawPatch(g, cardGeo, tg, { label: false });
      // せん と かくど
      const cx = cardGeo.cx, cy = cardGeo.cy;
      g.lineWidth = 3; g.lineCap = "round";
      g.strokeStyle = "#ff9800"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(sp.x, sp.y); g.stroke(); g.setLineDash([]);
      if (!D.isRound(tg.dist)) {
        g.strokeStyle = "#2b8a3e"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(fp.x, fp.y); g.stroke();
        const a0 = rad(o.sunAz) - Math.PI / 2, rel = D.signed(tg.az - o.sunAz);
        g.strokeStyle = "#e8590c"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, cardGeo.R * 0.3, a0, a0 + rad(rel), rel < 0); g.stroke();
      }
      g.font = "bold " + Math.round(Math.max(11, card.w * 0.075)) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
      g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(card.x, card.y + card.h - card.w * 0.12, card.w, card.w * 0.12);
      g.fillStyle = "#5c3a00"; g.fillText("そとの ちず（うえ が きた）", card.x + card.w / 2, card.y + card.h - 2);
      g.restore();
    },
    drawFly(g) {
      const geo = fullGeo;
      Map.draw(g, geo);
      Map.drawSun(g, geo, o.sunAz, t, App.TRIPS[o.trip].label);
      o.patches.forEach((p) => Map.drawPatch(g, geo, p, { stars: true }));
      Map.drawHive(g, geo);
      const tg = this.target(), tp = Map.pos(geo, tg.az, tg.dist);
      if (phase === "result") {
        if (!res.ok) { // ただしい ばしょ
          g.strokeStyle = "#2b8a3e"; g.lineWidth = 3; g.setLineDash([7, 6]);
          g.beginPath(); g.moveTo(geo.cx, geo.cy); g.lineTo(tp.x, tp.y); g.stroke(); g.setLineDash([]);
        }
        g.strokeStyle = res.ok ? "#ffd43b" : "#2b8a3e"; g.lineWidth = 5;
        A.circ(g, tp.x, tp.y, Map.patchR(geo) * 1.25 + Math.sin(t * 4) * 3); g.stroke();
      }
      recruits.forEach((r, i) => {
        const dest = Map.pos(geo, r.az, r.dist);
        const e = 1 - Math.pow(1 - r.u, 2);
        const x = geo.cx + (dest.x - geo.cx) * e + Math.cos(i * 2.1) * geo.fr * r.off * e;
        const y = geo.cy + (dest.y - geo.cy) * e + Math.sin(i * 2.1) * geo.fr * r.off * e + Math.sin(t * 6 + i) * 3 * (1 - e);
        A.bee(g, x, y, geo.fr * 0.9, Math.atan2(dest.x - geo.cx, -(dest.y - geo.cy)), { flap: 0.5 + 0.5 * Math.sin(t * 30 + i), happy: phase === "result" && res.ok });
      });
      if (phase === "result" && !res.patchId) {
        const q = Map.pos(geo, D.fromXY(res.landing.x, res.landing.y).az, D.fromXY(res.landing.x, res.landing.y).dist);
        g.font = "bold " + Math.round(geo.fr * 2) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 5; g.strokeStyle = "#fff"; g.strokeText("？", q.x, q.y - geo.fr * 2); g.fillStyle = "#d9480f"; g.fillText("？", q.x, q.y - geo.fr * 2);
      }
    },
    // テスト用: ただしい ダンスを ゆびの せんで つくって おどる
    _auto(err) {
      err = err || {};
      const tg = this.target(), pl = D.plan(o.sunAz, tg), pts = [];
      if (pl.type === "round") {
        for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; pts.push({ x: center.x + 40 * Math.sin(a), y: center.y - 40 * Math.cos(a), t: i * 30 }); }
      } else {
        const ang = pl.angle + (err.angle || 0), sec = pl.sec * (err.k || 1), v = D.combVec(ang), L = runLen(sec, W, H);
        for (let i = 0; i <= 40; i++) pts.push({ x: center.x + v.x * L * (i / 40 - 0.5), y: center.y + v.y * L * (i / 40 - 0.5), t: (sec * 1000 * i) / 40 });
      }
      this.finishStroke(pts);
    },
    _state() { return { phase, res, dance, target: o.targetId, patches: o.patches, sunAz: o.sunAz, center, card }; },
  };
  App.register("dance", Scene);
})();
