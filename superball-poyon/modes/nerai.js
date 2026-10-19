/* ============================================================
   ④ ねらって ぽよん（パチンコしき）
   ボールを ひっぱって はなす。さいしょに はねる ところまで よそうせんを だす
   カップに いれる／ブロックを こわす／ベルを ならす（じょうけん つき）
   ステージ と しんちょく（★）は nerai-stages.js と localStorage
   ============================================================ */
(function (root) {
  "use strict";
  var N = root.SBNerai, BL = root.SBBalls, AU = root.SBAudio, SB = root.SB, $ = SB.$, D = SB.data;
  var cur = 0, sim = null, step = null, view = null, aim = null, prev = null, tries = 1, hint = false, failT = 0, done = false;
  var fx = { ring: 0, squash: 0, sqa: 0, broke: [] };

  function stars(no) { return (D.nerai && D.nerai[no]) || 0; }
  function open(i) { return i < 3 || stars(i) > 0 || stars(i + 1) > 0; }   // i は 0 から

  function goalText(st) {
    var g = st.goal, s;
    if (g.t === "cup") s = "🥤 カップに いれよう";
    else if (g.t === "bell") s = "🔔 ベルを ならそう";
    else s = "📦 ブロックを " + N.need(st) + "こ こわそう";
    if (g.bounce) s += "（" + g.bounce + "かい はねてから）";
    return s;
  }

  /* ---------- ステージ いちらん ---------- */
  function buildList() {
    var g = $("neraiGrid"); g.innerHTML = "";
    var total = 0;
    N.STAGES.forEach(function (st, i) {
      var s = stars(st.no); total += s;
      var b = document.createElement("button");
      var ok = open(i);
      b.className = "nr-btn" + (s ? " done" : "") + (ok ? "" : " lock");
      b.innerHTML = "<span class='n'>" + st.no + "</span><span class='nm'>" + st.name + "</span><span class='st'>" + "★★★".slice(0, s) + "<i>" + "☆☆☆".slice(0, 3 - s) + "</i></span>";
      b.addEventListener("click", function () {
        AU.tap();
        if (!ok) { SB.toast("まえの ステージを クリア すると あそべるよ"); return; }
        start(i);
      });
      g.appendChild(b);
    });
    $("nrTotal").textContent = total;
  }

  function showList() {
    $("neraiSel").hidden = false; $("neraiHud").hidden = true;
    sim = null;
    buildList();
  }

  /* ---------- あそぶ ---------- */
  function start(i) {
    cur = i; tries = 1; hint = false; done = false;
    $("neraiSel").hidden = true; $("neraiHud").hidden = false;
    reset();
    var st = N.STAGES[i];
    $("nrNo").textContent = st.no;
    $("nrGoal").textContent = goalText(st);
    SB.toast(st.hint + (SB.H > SB.W * 1.2 ? "<br>📱 よこむきに すると おおきく なるよ" : ""), 2600);
    layout();
  }
  function reset() {
    sim = N.build(N.STAGES[cur]);
    aim = null; prev = null; failT = 0; fx.broke = [];
    $("nrTries").textContent = tries;
    $("nrBounce").textContent = "0";
  }
  function layout() {
    var R = SB.rect(), pad = 8;
    var sc = Math.min((R.w - pad * 2) / N.WW, (R.h - pad * 2) / N.WH);
    view = { sc: sc, ox: R.x0 + (R.w - N.WW * sc) / 2, oy: R.y0 + (R.h - N.WH * sc) / 2, R: R };
  }
  function toWorld(p) { return { x: (p.x - view.ox) / view.sc, y: (p.y - view.oy) / view.sc }; }

  function velOf(a) {
    var st = N.STAGES[cur], dx = st.sling[0] - a.x, dy = st.sling[1] - a.y, L = Math.hypot(dx, dy);
    if (L > N.MAXPULL) { dx *= N.MAXPULL / L; dy *= N.MAXPULL / L; }
    return [dx * N.K, dy * N.K];
  }

  function fixed(h) {
    if (!sim || !sim.ball || done) return;
    N.step(sim);
    var ev = sim.events; sim.events = [];
    ev.forEach(function (e) {
      if (e.t === "bounce") {
        AU.poyon(N.BR * view.sc * 1.5, e.sp);
        fx.squash = Math.min(0.3, e.sp / 5000);
        $("nrBounce").textContent = sim.bounces;
      } else if (e.t === "break") {
        AU.crack();
        fx.broke.push({ x: e.x, y: e.y, t: 0 });
        SB.fx.burst(view.ox + e.x * view.sc, view.oy + e.y * view.sc, "#e8590c", 16, 300);
      } else if (e.t === "bell") {
        AU.bell(); fx.ring = 1;
      } else if (e.t === "early") {
        SB.toast("まだ だよ！ " + N.STAGES[cur].goal.bounce + "かい はねてから");
      }
    });
    if (sim.ok) clear();
    else if (sim.fail && !failT) {
      failT = 1.0;
      if (sim.fail === "bounce") { AU.sad(); SB.toast("はねる かずが たりないよ！ " + N.STAGES[cur].goal.bounce + "かい はねてから"); }
      else SB.toast("おしい！ もういちど");
    }
  }

  function clear() {
    done = true;
    var st = N.STAGES[cur], s = tries === 1 ? 3 : tries <= 3 ? 2 : 1, before = stars(st.no);
    if (!D.nerai || typeof D.nerai !== "object") D.nerai = {};
    if (s > before) D.nerai[st.no] = s;
    SB.save(true);
    AU.fanfare();
    SB.fx.burst(view.ox + sim.ball.x * view.sc, view.oy + sim.ball.y * view.sc, "#ffd43b", 30, 400);
    if (!before) SB.addStars(1);
    var last = cur >= N.STAGES.length - 1;
    setTimeout(function () {
      SB.showResult({
        badge: "★★★".slice(0, s) + "☆☆☆".slice(0, 3 - s), title: "クリア！",
        msg: (tries === 1 ? "1かいめで できた！ すごい！" : tries + "かいめで できたよ") + (before ? "" : "<br>⭐ を 1こ もらったよ"),
        buttons: [
          last ? { label: "📋 いちらん", primary: true, fn: showList } : { label: "つぎへ ›", primary: true, fn: function () { start(cur + 1); } },
          { label: "↺ もういちど", fn: function () { start(cur); } },
          { label: "📋 いちらん", fn: showList }
        ].filter(function (b, i) { return !(last && i === 2); })
      });
    }, 700);
  }

  var mode = {
    title: "ねらって ぽよん",
    enter: function () {
      step = SB.stepper(fixed, N.DT);
      layout();
      showList();
    },
    exit: function () { $("neraiSel").hidden = true; $("neraiHud").hidden = true; sim = null; },
    resize: function () { layout(); },
    update: function (dt) {
      if (!sim) return;
      step(dt);
      if (failT > 0) { failT -= dt; if (failT <= 0) { failT = 0; tries++; reset(); } }
      if (fx.ring > 0) fx.ring = Math.max(0, fx.ring - dt * 0.8);
      if (fx.squash > 0.002) fx.squash *= Math.exp(-14 * dt); else fx.squash = 0;
      fx.broke.forEach(function (b) { b.t += dt; });
      fx.broke = fx.broke.filter(function (b) { return b.t < 0.5; });
    },
    draw: function (c) {
      c.fillStyle = "#e7f5ff"; c.fillRect(0, 0, SB.W, SB.H);
      if (!sim) return;
      var st = N.STAGES[cur], s = view.sc, w = sim.w;
      c.save();
      c.translate(view.ox, view.oy); c.scale(s, s);
      var g = c.createLinearGradient(0, 0, 0, N.WH);
      g.addColorStop(0, "#d0ebff"); g.addColorStop(1, "#fff9db");
      c.fillStyle = g; c.fillRect(0, 0, N.WW, N.WH);
      c.strokeStyle = "#868e96"; c.lineWidth = 6; c.strokeRect(0, 0, N.WW, N.WH);
      c.fillStyle = "#c5a880"; c.fillRect(0, N.WH - 6, N.WW, 6);
      // かべ・ブロック
      w.boxes.forEach(function (b) {
        if (b.tag === "block") drawBlock(c, b.x, b.y, 1);
        else { c.fillStyle = "#8d6e63"; c.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2); c.fillStyle = "rgba(255,255,255,.15)"; c.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, 6); }
      });
      fx.broke.forEach(function (b) {
        var k = b.t / 0.5;
        c.globalAlpha = 1 - k;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { drawBlock(c, b.x + d[0] * k * 50, b.y + d[1] * k * 40 + k * k * 80, 0.45); });
        c.globalAlpha = 1;
      });
      // いた
      c.lineCap = "round";
      w.segs.forEach(function (sg) {
        if (sg.tag !== "seg") return;
        c.strokeStyle = "#5c7cfa"; c.lineWidth = 16;
        c.beginPath(); c.moveTo(sg.ax, sg.ay); c.lineTo(sg.bx, sg.by); c.stroke();
      });
      if (st.goal.t === "cup") drawCup(c, st.goal);
      w.discs.forEach(function (d) { drawBell(c, d.x, d.y); });
      // パチンコ
      var sl = st.sling;
      c.strokeStyle = "#795548"; c.lineWidth = 12;
      c.beginPath(); c.moveTo(sl[0], N.WH); c.lineTo(sl[0], sl[1] + 50); c.lineTo(sl[0] - 26, sl[1] - 6); c.moveTo(sl[0], sl[1] + 50); c.lineTo(sl[0] + 26, sl[1] - 6); c.stroke();
      var kind = BL.BY[D.sel] && D.own[D.sel] ? D.sel : "aka";
      if (!sim.ball) {
        var bp = aim ? aim.p : { x: sl[0], y: sl[1] };
        if (aim) {
          // よそうせん（さいしょに はねる ところまで）
          if (prev && prev.length) {
            c.fillStyle = "rgba(240,62,62,.7)";
            for (var i = 0; i < prev.length; i += 3) { c.beginPath(); c.arc(prev[i][0], prev[i][1], 5, 0, 7); c.fill(); }
            var e = prev[prev.length - 1];
            c.strokeStyle = "rgba(240,62,62,.9)"; c.lineWidth = 4; c.beginPath(); c.arc(e[0], e[1], 16, 0, 7); c.stroke();
          }
          c.strokeStyle = "#e8590c"; c.lineWidth = 7;
          c.beginPath(); c.moveTo(sl[0] - 26, sl[1] - 6); c.lineTo(bp.x, bp.y); c.lineTo(sl[0] + 26, sl[1] - 6); c.stroke();
        }
        if (hint && st.sol) {
          var hp = { x: sl[0] - st.sol[0] / N.K, y: sl[1] - st.sol[1] / N.K };
          c.globalAlpha = 0.45; BL.draw(c, kind, hp.x, hp.y, N.BR, SB.dpr * s); c.globalAlpha = 1;
          c.strokeStyle = "rgba(250,176,5,.9)"; c.lineWidth = 4; c.setLineDash([10, 8]);
          c.beginPath(); c.moveTo(hp.x, hp.y); c.lineTo(sl[0], sl[1]); c.stroke(); c.setLineDash([]);
          c.fillStyle = "#e67700"; c.font = "bold 26px sans-serif"; c.textAlign = "center"; c.fillText("💡 ここまで ひっぱる", hp.x, hp.y + 52);
        }
        BL.draw(c, kind, bp.x, bp.y, N.BR, SB.dpr * s, { a: 0 });
      } else {
        var b = sim.ball;
        BL.draw(c, kind, b.x, b.y, N.BR, SB.dpr * s, { a: b.a, sq: fx.squash, sqa: 0 });
      }
      c.restore();
    },
    down: function (p) {
      if (!sim || sim.ball || done) return;
      var q = toWorld(p), sl = N.STAGES[cur].sling;
      if (Math.hypot(q.x - sl[0], q.y - sl[1]) > 260) { SB.toast("ボールを うしろに ひっぱってね"); return; }
      aim = { id: p.id, p: { x: sl[0], y: sl[1] } };
      mode.move(p);
    },
    move: function (p) {
      if (!aim || aim.id !== p.id) return;
      var q = toWorld(p), sl = N.STAGES[cur].sling, dx = q.x - sl[0], dy = q.y - sl[1], L = Math.hypot(dx, dy);
      if (L > N.MAXPULL) { dx *= N.MAXPULL / L; dy *= N.MAXPULL / L; }
      aim.p = { x: sl[0] + dx, y: sl[1] + dy };
      var v = velOf(aim.p);
      prev = Math.hypot(dx, dy) > 15 ? N.preview(N.STAGES[cur], v[0], v[1]) : null;
    },
    up: function (p) {
      if (!aim || aim.id !== p.id) return;
      var sl = N.STAGES[cur].sling, pull = Math.hypot(aim.p.x - sl[0], aim.p.y - sl[1]);
      if (pull > 15) {
        var v = velOf(aim.p);
        N.launch(sim, v[0], v[1]);
        AU.whoosh(true);
      }
      aim = null; prev = null;
    }
  };

  function drawBlock(c, x, y, k) {
    var h = N.BLOCK / 2 * k;
    c.fillStyle = "#f08c00"; c.fillRect(x - h, y - h, h * 2, h * 2);
    c.strokeStyle = "#c25e00"; c.lineWidth = 5 * k; c.strokeRect(x - h + 3, y - h + 3, h * 2 - 6, h * 2 - 6);
    c.beginPath(); c.moveTo(x - h + 6, y - h + 6); c.lineTo(x + h - 6, y + h - 6); c.moveTo(x + h - 6, y - h + 6); c.lineTo(x - h + 6, y + h - 6); c.stroke();
  }
  function drawCup(c, g) {
    var hw = g.w / 2, top = g.y - N.CUP_H;
    c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(g.x - hw, top, g.w, N.CUP_H);
    c.strokeStyle = "#e03131"; c.lineWidth = 12; c.lineJoin = "round";
    c.beginPath(); c.moveTo(g.x - hw, top); c.lineTo(g.x - hw, g.y - 4); c.lineTo(g.x + hw, g.y - 4); c.lineTo(g.x + hw, top); c.stroke();
    c.fillStyle = "#e03131"; c.font = "bold 30px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("ゴール", g.x, g.y - N.CUP_H / 2);
  }
  function drawBell(c, x, y) {
    var a = Math.sin(SB.t * 25) * 0.4 * fx.ring;
    c.save(); c.translate(x, y - N.BELL_R); c.rotate(a);
    c.fillStyle = "#fab005";
    c.beginPath(); c.moveTo(-N.BELL_R, N.BELL_R * 1.6); c.quadraticCurveTo(-N.BELL_R, 0, 0, 0); c.quadraticCurveTo(N.BELL_R, 0, N.BELL_R, N.BELL_R * 1.6); c.closePath(); c.fill();
    c.fillStyle = "#e67700"; c.beginPath(); c.arc(0, N.BELL_R * 1.75, 8, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(-N.BELL_R * 0.4, N.BELL_R * 0.7, 5, 14, 0.3, 0, 7); c.fill();
    c.restore();
    if (fx.ring > 0) {
      c.strokeStyle = "rgba(250,176,5," + fx.ring + ")"; c.lineWidth = 4;
      c.beginPath(); c.arc(x, y, N.BELL_R + 20 + (1 - fx.ring) * 40, 0, 7); c.stroke();
    }
  }

  $("nrHint").addEventListener("click", function () { AU.tap(); hint = !hint; $("nrHint").setAttribute("aria-pressed", hint ? "true" : "false"); });
  $("nrRetry").addEventListener("click", function () { AU.tap(); if (sim && sim.ball && !done) { tries++; reset(); } });
  $("nrList").addEventListener("click", function () { AU.tap(); showList(); });
  mode.state = function () { return { cur: cur, tries: tries, ball: !!(sim && sim.ball), ok: sim && sim.ok, view: view, prev: prev ? prev.length : 0, hint: hint }; };
  mode.start = start;
  SB.modes.nerai = mode;
})(window);
