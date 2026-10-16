/* ============================================================
   ころころ そうち — ぶひん（からだの つくりかた・えの かきかた）
   ぶひんデータ: { t: しゅるい, x, y, a: かくど(°), f: うごかせない }
   バケツ だけ { gx, gy, gh, d } も もつ（とびらの ばしょ・たかさ・さがる きょり）。
   ブラウザでは window.KoroParts、node では module.exports。
   ============================================================ */
(function (root) {
  "use strict";
  var P = root.KoroPhysics || (typeof require !== "undefined" ? require("./physics.js") : null);
  var B = P.Body, DYN = P.DYNAMIC, STA = P.STATIC, PIN = P.PINNED, KIN = P.KINEMATIC;

  var W = 1200, H = 800, FLOOR = 770;
  var BALL_R = 24;
  var BOARD_LEN = { board_s: 180, board_m: 280, board_l: 400 };
  var DEG = Math.PI / 180;

  var FAN_LEN = 380, FAN_WID = 120, FAN_ACC = 2600;

  /* ---------- しゅるい ---------- */
  var TYPES = {
    steel:   { name: "てつだま",   sub: "おもい",   rot: "none" },
    rubber:  { name: "ゴムだま",   sub: "かるい",   rot: "none" },
    board_s: { name: "いた",       sub: "みじかい", rot: "step" },
    board_m: { name: "いた",       sub: "ふつう",   rot: "step" },
    board_l: { name: "いた",       sub: "ながい",   rot: "step" },
    domino:  { name: "ドミノ",     sub: "",         rot: "step" },
    seesaw:  { name: "シーソー",   sub: "",         rot: "seesaw" },
    spring:  { name: "ばね",       sub: "",         rot: "step" },
    bucket:  { name: "バケツ",     sub: "かっしゃ", rot: "flip" },
    wall:    { name: "かべ",       sub: "",         rot: "step" },
    fan:     { name: "ファン",     sub: "かぜ",     rot: "step" },
    bell:    { name: "ベル",       sub: "ゴール",   rot: "none" }
  };
  var ORDER = ["steel", "rubber", "board_s", "board_m", "board_l", "domino", "seesaw", "spring", "bucket", "wall", "fan", "bell"];

  function bucketDefaults(p) {
    if (p.gx == null) p.gx = 190;
    if (p.gy == null) p.gy = -10;
    if (p.gh == null) p.gh = 120;
    if (p.d == null) p.d = 130;
    return p;
  }

  function rotateStep(p) {
    var r = TYPES[p.t].rot;
    if (r === "step") p.a = ((p.a || 0) + 15) % 360;
    else if (r === "seesaw") p.a = p.a === 0 || !p.a ? 15 : p.a === 15 ? -15 : 0;
    else if (r === "flip") { bucketDefaults(p); p.gx = -p.gx; }
    else return false;
    if (p.a > 180) p.a -= 360;
    return true;
  }

  /* ---------- からだを つくる ----------
     かえりち: そのぶひんの からだ の はいれつ */
  function build(p, idx) {
    var a = (p.a || 0) * DEG, o = [];
    switch (p.t) {
      case "steel":
        o.push(new B({ shape: "c", r: BALL_R, x: p.x, y: p.y, mode: DYN, density: 3, e: 0.25, mu: 0.6, tag: "steel", ad: 0.6 }));
        break;
      case "rubber":
        var rb = new B({ shape: "c", r: BALL_R, x: p.x, y: p.y, mode: DYN, density: 0.5, e: 0.6, mu: 0.7, tag: "rubber", ad: 0.6 });
        rb.light = true; o.push(rb);
        break;
      case "board_s": case "board_m": case "board_l":
        o.push(new B({ shape: "b", hw: BOARD_LEN[p.t] / 2, hh: 8, x: p.x, y: p.y, a: a, e: 0.2, mu: 0.5, tag: "board" }));
        break;
      case "domino":
        o.push(new B({ shape: "b", hw: 9, hh: 40, x: p.x, y: p.y, a: a, mode: DYN, density: 1, e: 0.05, mu: 0.6, tag: "domino", ld: 0.05, ad: 0.2 }));
        break;
      case "seesaw":
        o.push(new B({ shape: "b", hw: 160, hh: 8, x: p.x, y: p.y, a: a, mode: PIN, density: 0.6, e: 0.1, mu: 0.6, tag: "seesaw", min: -20 * DEG, max: 20 * DEG, ad: 0.8 }));
        o.push(new B({ shape: "b", hw: 10, hh: 22, x: p.x, y: p.y + 32, e: 0.1, mu: 0.5, tag: "stand" }));
        break;
      case "spring":
        o.push(new B({ shape: "b", hw: 45, hh: 14, x: p.x, y: p.y, a: a, e: 0.9, mu: 0.5, tag: "spring" }));
        break;
      case "wall":
        o.push(new B({ shape: "b", hw: 12, hh: 90, x: p.x, y: p.y, a: a, e: 0.2, mu: 0.5, tag: "wall" }));
        break;
      case "fan":
        o.push(new B({ shape: "b", hw: 28, hh: 34, x: p.x, y: p.y, a: a, e: 0.2, mu: 0.5, tag: "fan" }));
        break;
      case "bell":
        o.push(new B({ shape: "c", r: 30, x: p.x, y: p.y, e: 0.3, mu: 0.4, tag: "bell" }));
        break;
      case "bucket":
        bucketDefaults(p);
        o.push(new B({ shape: "b", hw: 50, hh: 6, x: p.x, y: p.y + 40, mode: KIN, e: 0.05, mu: 0.8, tag: "bucket" }));
        o.push(new B({ shape: "b", hw: 6, hh: 40, x: p.x - 44, y: p.y, mode: KIN, e: 0.05, mu: 0.6, tag: "bucket" }));
        o.push(new B({ shape: "b", hw: 6, hh: 40, x: p.x + 44, y: p.y, mode: KIN, e: 0.05, mu: 0.6, tag: "bucket" }));
        o.push(new B({ shape: "b", hw: 8, hh: p.gh / 2, x: p.x + p.gx, y: p.y + p.gy, mode: KIN, e: 0.1, mu: 0.4, tag: "gate" }));
        break;
    }
    for (var i = 0; i < o.length; i++) o[i].part = idx;
    return o;
  }

  /* ---------- せかいを くみたてる ---------- */
  function buildWorld(layout) {
    var w = new P.World();
    w.add(new B({ shape: "b", hw: 800, hh: 40, x: W / 2, y: FLOOR + 40, e: 0.2, mu: 0.6, tag: "floor" }));
    w.add(new B({ shape: "b", hw: 30, hh: 800, x: -30, y: H / 2 - 400, e: 0.2, mu: 0.4, tag: "edge" }));
    w.add(new B({ shape: "b", hw: 30, hh: 800, x: W + 30, y: H / 2 - 400, e: 0.2, mu: 0.4, tag: "edge" }));
    var groups = [], buckets = [], fans = [];
    for (var i = 0; i < layout.length; i++) {
      var bs = build(layout[i], i);
      for (var k = 0; k < bs.length; k++) w.add(bs[k]);
      groups.push(bs);
      if (layout[i].t === "bucket") buckets.push({ p: layout[i], bodies: bs, on: false, done: 0 });
      if (layout[i].t === "fan") fans.push({ p: layout[i], body: bs[0] });
    }
    // バケツ: なにかが はいると さがって、ひもで とびらを ひっぱりあげる
    if (buckets.length) w.hooks.push(function (world, dt) {
      for (var i = 0; i < buckets.length; i++) {
        var q = buckets[i], bs = q.bodies, bot = bs[0];
        if (!q.on) {
          var x0 = bs[1].x + 6, x1 = bs[2].x - 6, y0 = bs[1].y - 40, y1 = bot.y;
          for (var j = 0; j < world.bodies.length; j++) {
            var o = world.bodies[j];
            if (o.mode === DYN && o.alive && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 && o.m >= 500) { q.on = true; q.at = world.time; break; }
          }
        }
        var v = 0;
        if (q.on && q.done < q.p.d) {
          v = Math.min(160, Math.min(1, (world.time - q.at) * 4) * 160);
          if (q.done + v * dt > q.p.d) v = (q.p.d - q.done) / dt;
          q.done += v * dt;
        }
        for (var k = 0; k < 3; k++) { bs[k].vy = v; if (v) bs[k].wake(); }
        bs[3].vy = -v;
      }
    });
    // ファン: まえに ある かるい ボールを おす
    if (fans.length) w.hooks.push(function (world) {
      for (var i = 0; i < fans.length; i++) {
        var f = fans[i].body, dx = f.c, dy = f.s, ox = f.x + dx * 28, oy = f.y + dy * 28;
        for (var j = 0; j < world.bodies.length; j++) {
          var o = world.bodies[j];
          if (!o.light || !o.alive) continue;
          var rx = o.x - ox, ry = o.y - oy, al = rx * dx + ry * dy, ac = -rx * dy + ry * dx;
          if (al > -o.r && al < FAN_LEN && Math.abs(ac) < FAN_WID / 2 + o.r) {
            var acc = FAN_ACC * (1 - 0.6 * Math.max(0, al) / FAN_LEN);
            o.fx += dx * acc; o.fy += dy * acc;
            o.wake();
          }
        }
      }
    });
    return { world: w, groups: groups, buckets: buckets, fans: fans };
  }

  /* ヘッドレス: ベルが なるまで（または maxT びょう）うごかす */
  function simulate(layout, maxT) {
    var s = buildWorld(layout), w = s.world, steps = Math.round((maxT || 20) / P.DT);
    for (var i = 0; i < steps; i++) {
      w.step();
      if (w.bell) return { cleared: true, time: w.time, sim: s };
      if (i > 240 && w.awakeCount() === 0 && !anyBucketMoving(s)) break;
    }
    return { cleared: false, time: w.time, sim: s };
  }
  function anyBucketMoving(s) {
    for (var i = 0; i < s.buckets.length; i++) { var q = s.buckets[i]; if (q.on && q.done < q.p.d) return true; }
    return false;
  }

  /* ---------- はいち チェック ---------- */
  function partBox(p) {
    var bs = build(p, -1), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < bs.length; i++) {
      var r = P.aabb(bs[i]);
      x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]);
    }
    return [x0, y0, x1, y1];
  }
  // p を おいて いいか（うごく ものが めりこまない・そとに でない）
  // うごかない もの どうし（いた と かべ、いた と ゆか など）は かさなって よい
  function canPlace(layout, p, skip) {
    var r = partBox(p);
    if (r[0] < 0 || r[2] > W || r[1] < 0 || r[1] > FLOOR - 6) return false;
    var mine = build(p, -1), floor = new B({ shape: "b", hw: 800, hh: 40, x: W / 2, y: FLOOR + 40 });
    var others = [];
    for (var j = 0; j < layout.length; j++) if (j !== skip) others = others.concat(build(layout[j], j));
    for (var i = 0; i < mine.length; i++) {
      var ms = mine[i].mode === STA;
      if (!ms && P.overlap(mine[i], floor, 1.5)) return false;
      for (var k = 0; k < others.length; k++) {
        if (ms && others[k].mode === STA) continue;
        if (P.overlap(mine[i], others[k], 1.5)) return false;
      }
    }
    return true;
  }

  // ゆびの ちかくの ぶひん（いちばん ちかい もの）
  function distTo(b, x, y) {
    if (b.shape === "c") return Math.hypot(x - b.x, y - b.y) - b.r;
    var dx = x - b.x, dy = y - b.y, lx = dx * b.c + dy * b.s, ly = -dx * b.s + dy * b.c;
    var ex = Math.max(0, Math.abs(lx) - b.hw), ey = Math.max(0, Math.abs(ly) - b.hh);
    return Math.hypot(ex, ey);
  }
  function pick(layout, x, y, tol) {
    var best = -1, bd = tol;
    for (var i = layout.length - 1; i >= 0; i--) {
      var bs = build(layout[i], i);
      for (var k = 0; k < bs.length; k++) {
        var d = distTo(bs[k], x, y);
        if (d < bd) { bd = d; best = i; }
      }
    }
    return best;
  }

  /* ============================================================
     え を かく（ctx は せかい ざひょう）
     o: { fixed, time, ring, hot }
     ============================================================ */
  var GRAY = { fill: "#a7adb6", dark: "#6f7782", light: "#cfd4da" };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function inBody(ctx, b, fn) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); fn(); ctx.restore();
  }

  function drawBall(ctx, b, steel) {
    var r = b.r;
    inBody(ctx, b, function () {
      var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
      if (steel) { g.addColorStop(0, "#f1f4f8"); g.addColorStop(0.45, "#8b97a6"); g.addColorStop(1, "#3c4552"); }
      else { g.addColorStop(0, "#ffd0d8"); g.addColorStop(0.45, "#ff5c7a"); g.addColorStop(1, "#b0213f"); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = steel ? "#2c333d" : "#8a1730"; ctx.stroke();
      // ころがって いるのが わかる もよう
      ctx.strokeStyle = steel ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.85)";
      ctx.lineWidth = steel ? 3 : 5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, -0.5, 0.5); ctx.stroke();
      if (!steel) { ctx.beginPath(); ctx.arc(0, 0, r * 0.62, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke(); }
    });
  }

  function drawBoard(ctx, b, fixed) {
    inBody(ctx, b, function () {
      rr(ctx, -b.hw, -b.hh, b.hw * 2, b.hh * 2, 5);
      ctx.fillStyle = fixed ? GRAY.fill : "#d9a066"; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = fixed ? GRAY.dark : "#8a5a2b"; ctx.stroke();
      ctx.strokeStyle = fixed ? GRAY.light : "rgba(138,90,43,.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-b.hw + 10, -1); ctx.lineTo(b.hw * 0.3, -1);
      ctx.moveTo(-b.hw * 0.2, 3); ctx.lineTo(b.hw - 12, 3); ctx.stroke();
      if (fixed) {
        ctx.fillStyle = GRAY.dark;
        [-b.hw + 10, b.hw - 10].forEach(function (x) { ctx.beginPath(); ctx.arc(x, 0, 3, 0, 7); ctx.fill(); });
      }
    });
  }

  var DOMINO_COLORS = ["#4dabf7", "#ffd43b", "#69db7c", "#ff922b", "#da77f2"];
  function drawDomino(ctx, b, fixed, idx) {
    inBody(ctx, b, function () {
      rr(ctx, -b.hw, -b.hh, b.hw * 2, b.hh * 2, 4);
      ctx.fillStyle = fixed ? GRAY.fill : DOMINO_COLORS[(idx < 0 ? 0 : idx) % DOMINO_COLORS.length]; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = fixed ? GRAY.dark : "#343a40"; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.85)";
      [-22, 0, 22].forEach(function (y) { ctx.beginPath(); ctx.arc(0, y, 3.2, 0, 7); ctx.fill(); });
    });
  }

  function drawSeesaw(ctx, bar, stand, fixed) {
    // だい
    ctx.fillStyle = fixed ? GRAY.dark : "#5c7cfa";
    ctx.strokeStyle = fixed ? "#4b525c" : "#364fc7"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bar.x, bar.y); ctx.lineTo(bar.x - 26, stand.y + 22); ctx.lineTo(bar.x + 26, stand.y + 22); ctx.closePath();
    ctx.fill(); ctx.stroke();
    inBody(ctx, bar, function () {
      rr(ctx, -bar.hw, -bar.hh, bar.hw * 2, bar.hh * 2, 6);
      ctx.fillStyle = fixed ? GRAY.fill : "#ffa94d"; ctx.fill();
      ctx.strokeStyle = fixed ? GRAY.dark : "#d9480f"; ctx.lineWidth = 2.5; ctx.stroke();
    });
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bar.x, bar.y, 5, 0, 7); ctx.fill(); ctx.stroke();
  }

  function drawSpring(ctx, b, fixed, squash) {
    inBody(ctx, b, function () {
      var top = -b.hh + (squash || 0) * 8, bot = b.hh;
      ctx.fillStyle = fixed ? GRAY.dark : "#2b8a3e";
      rr(ctx, -b.hw, bot - 7, b.hw * 2, 7, 3); ctx.fill();
      ctx.strokeStyle = fixed ? GRAY.dark : "#37b24d"; ctx.lineWidth = 4; ctx.lineJoin = "round";
      ctx.beginPath();
      var n = 5, y0 = top + 6, y1 = bot - 7;
      for (var i = 0; i <= n * 2; i++) {
        var x = (i % 2 ? 1 : -1) * (b.hw - 12), y = y0 + (y1 - y0) * i / (n * 2);
        if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = fixed ? GRAY.fill : "#8ce99a"; ctx.strokeStyle = fixed ? GRAY.dark : "#2b8a3e"; ctx.lineWidth = 2;
      rr(ctx, -b.hw, top, b.hw * 2, 8, 3); ctx.fill(); ctx.stroke();
    });
  }

  function drawWall(ctx, b, fixed) {
    inBody(ctx, b, function () {
      ctx.fillStyle = fixed ? GRAY.fill : "#e8590c";
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
      ctx.strokeStyle = fixed ? GRAY.light : "#ffc9a3"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var y = -b.hh + 15, k = 0; y < b.hh; y += 15, k++) {
        ctx.moveTo(-b.hw, y); ctx.lineTo(b.hw, y);
        var x = k % 2 ? -2 : 4; ctx.moveTo(x, y - 15); ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = fixed ? GRAY.dark : "#a33a06"; ctx.lineWidth = 2.5;
      ctx.strokeRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
    });
  }

  function drawFan(ctx, b, fixed, t, running, noZone) {
    if (noZone) {
      // どうぐばこ では かぜの はんいを かかない
    } else if (running) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.strokeStyle = "rgba(116,192,252,.55)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (var i = 0; i < 6; i++) {
        var ph = ((t * 1.6 + i / 6) % 1), x = 34 + ph * (FAN_LEN - 30), y = -FAN_WID / 2 + 12 + (i * 37) % (FAN_WID - 20);
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    } else {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = "rgba(116,192,252,.10)"; ctx.fillRect(30, -FAN_WID / 2, FAN_LEN, FAN_WID);
      ctx.strokeStyle = "rgba(116,192,252,.6)"; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.strokeRect(30, -FAN_WID / 2, FAN_LEN, FAN_WID); ctx.setLineDash([]);
      ctx.restore();
    }
    inBody(ctx, b, function () {
      rr(ctx, -b.hw, -b.hh, b.hw * 2 - 8, b.hh * 2, 8);
      ctx.fillStyle = fixed ? GRAY.fill : "#74c0fc"; ctx.fill();
      ctx.strokeStyle = fixed ? GRAY.dark : "#1971c2"; ctx.lineWidth = 2.5; ctx.stroke();
      // はね（よこから みた ので たてに のびちぢみ）
      ctx.fillStyle = fixed ? GRAY.dark : "#1971c2";
      var s = Math.abs(Math.sin(t * (running ? 40 : 0) + 0.6));
      ctx.beginPath(); ctx.ellipse(b.hw - 4, -14 * s, 5, 14 * s + 2, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.hw - 4, 14 * (1 - s), 5, 14 * (1 - s) + 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.hw - 4, 0, 4, 0, 7); ctx.fill();
    });
  }

  function drawBell(ctx, b, ring) {
    var sw = ring ? Math.sin(ring * 22) * Math.exp(-ring * 1.6) * 0.5 : 0;
    ctx.save(); ctx.translate(b.x, b.y);
    // つりさげ
    ctx.strokeStyle = "#868e96"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-20, -44); ctx.lineTo(20, -44); ctx.moveTo(0, -44); ctx.lineTo(0, -30); ctx.stroke();
    ctx.translate(0, -30); ctx.rotate(sw); ctx.translate(0, 30);
    var g = ctx.createLinearGradient(-30, 0, 30, 0);
    g.addColorStop(0, "#f08c00"); g.addColorStop(0.35, "#ffe066"); g.addColorStop(1, "#e67700");
    ctx.fillStyle = g; ctx.strokeStyle = "#a35200"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(22, -30, 22, 0, 26, 16); ctx.lineTo(32, 22); ctx.lineTo(-32, 22); ctx.lineTo(-26, 16);
    ctx.bezierCurveTo(-22, 0, -22, -30, 0, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#a35200"; ctx.beginPath(); ctx.arc(0, 26, 6, 0, 7); ctx.fill();
    ctx.restore();
    if (ring) {
      ctx.save(); ctx.strokeStyle = "rgba(250,176,5," + Math.max(0, 1 - ring) + ")"; ctx.lineWidth = 4;
      for (var i = 0; i < 2; i++) {
        var rad = 40 + ring * 90 + i * 22;
        ctx.beginPath(); ctx.arc(b.x, b.y, rad, -0.9, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x, b.y, rad, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBucket(ctx, bs, fixed, p) {
    var bot = bs[0], L = bs[1], R = bs[2], gate = bs[3];
    var top = L.y - 40, gTop = gate.y - gate.hh;
    var py = Math.min(p.y - 40, p.y + p.gy - p.gh / 2) - 70;
    // かっしゃ と ひも
    ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bot.x, top - 18); ctx.lineTo(bot.x, py);
    ctx.lineTo(gate.x, py); ctx.lineTo(gate.x, gTop); ctx.stroke();
    // とってを むすぶ
    ctx.beginPath(); ctx.moveTo(L.x, top); ctx.lineTo(bot.x, top - 18); ctx.lineTo(R.x, top); ctx.stroke();
    [bot.x, gate.x].forEach(function (x) {
      ctx.fillStyle = "#adb5bd"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, py, 12, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.arc(x, py, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = "#868e96"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, py - 12); ctx.lineTo(x, py - 26); ctx.stroke();
    });
    // バケツ
    ctx.fillStyle = fixed ? GRAY.fill : "#4dabf7"; ctx.strokeStyle = fixed ? GRAY.dark : "#1864ab"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(L.x - 6, top); ctx.lineTo(L.x - 2, bot.y + 6); ctx.lineTo(R.x + 2, bot.y + 6); ctx.lineTo(R.x + 6, top);
    ctx.lineTo(R.x - 6, top); ctx.lineTo(R.x - 6, bot.y - 6); ctx.lineTo(L.x + 6, bot.y - 6); ctx.lineTo(L.x + 6, top); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // とびら
    inBody(ctx, gate, function () {
      ctx.fillStyle = "#fff"; ctx.fillRect(-gate.hw, -gate.hh, gate.hw * 2, gate.hh * 2);
      ctx.fillStyle = "#fa5252";
      for (var y = -gate.hh; y < gate.hh; y += 24) ctx.fillRect(-gate.hw, y, gate.hw * 2, Math.min(12, gate.hh - y));
      ctx.strokeStyle = "#c92a2a"; ctx.lineWidth = 2; ctx.strokeRect(-gate.hw, -gate.hh, gate.hw * 2, gate.hh * 2);
    });
  }

  // ひとつの ぶひんを かく。bs は その ぶひんの からだ（うごいた あとの いち）
  function draw(ctx, p, bs, o) {
    o = o || {};
    var fixed = !!p.f;
    switch (p.t) {
      case "steel": drawBall(ctx, bs[0], true); break;
      case "rubber": drawBall(ctx, bs[0], false); break;
      case "board_s": case "board_m": case "board_l": drawBoard(ctx, bs[0], fixed); break;
      case "domino": drawDomino(ctx, bs[0], fixed, o.idx || 0); break;
      case "seesaw": drawSeesaw(ctx, bs[0], bs[1], fixed); break;
      case "spring": drawSpring(ctx, bs[0], fixed, o.squash); break;
      case "wall": drawWall(ctx, bs[0], fixed); break;
      case "fan": drawFan(ctx, bs[0], fixed, o.time || 0, o.running); break;
      case "bell": drawBell(ctx, bs[0], o.ring); break;
      case "bucket": drawBucket(ctx, bs, fixed, p); break;
    }
  }

  // どうぐばこ よう の ちいさい え
  function icon(ctx, t, size) {
    var p = { t: t, x: 0, y: 0, a: 0 };
    if (t === "bucket") { p.gx = 0; p.gy = 0; p.gh = 0; }
    var s;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    switch (t) {
      case "steel": case "rubber": s = size / 60; break;
      case "board_s": p.a = -20; s = size / 210; break;
      case "board_m": p.a = -20; s = size / 300; break;
      case "board_l": p.a = -20; s = size / 410; break;
      case "domino": s = size / 95; break;
      case "seesaw": p.a = -12; s = size / 340; ctx.translate(0, -size * 0.08); break;
      case "spring": s = size / 105; break;
      case "wall": s = size / 190; break;
      case "fan": s = size / 75; break;
      case "bell": s = size / 80; ctx.translate(0, size * 0.08); break;
      case "bucket": s = size / 120; ctx.translate(0, size * 0.1); break;
    }
    ctx.scale(s, s);
    var bs = build(p, -1);
    if (t === "bucket") {
      var bot = bs[0], L = bs[1], R = bs[2], top = L.y - 40;
      ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(L.x, top); ctx.lineTo(0, top - 22); ctx.lineTo(R.x, top); ctx.stroke();
      ctx.fillStyle = "#4dabf7"; ctx.strokeStyle = "#1864ab"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(L.x - 6, top); ctx.lineTo(L.x, bot.y + 6); ctx.lineTo(R.x, bot.y + 6); ctx.lineTo(R.x + 6, top); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (t === "fan") {
      drawFan(ctx, bs[0], false, 0, false, true);
    } else draw(ctx, p, bs, { idx: 0 });
    ctx.restore();
  }

  var api = {
    W: W, H: H, FLOOR: FLOOR, BALL_R: BALL_R, TYPES: TYPES, ORDER: ORDER, DEG: DEG,
    build: build, buildWorld: buildWorld, simulate: simulate, canPlace: canPlace, pick: pick,
    rotateStep: rotateStep, bucketDefaults: bucketDefaults, draw: draw, icon: icon, partBox: partBox
  };
  root.KoroParts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
