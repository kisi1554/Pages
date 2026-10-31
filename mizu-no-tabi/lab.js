/* しずくの だいぼうけん — じっけん室（ビーカーの 水を あたためる／ひやす）
   ねつの 計算は カロリー: 水 1g を 1℃ 上げるのに 1cal、氷は 0.5cal。
   とける・こおる 80cal/g、わきたつ（水じょうきに なる）540cal/g。1気圧として 100℃ で ふっとう。 */
const Lab = (function () {
  const C_ICE = 0.5, LF = 80, LV = 540, BURNER = 900, ROOM = 20, BATH = -15;
  let S, cv, ctx, gcv, gctx, cw = 300, ch = 300, dpr = 1, raf = 0, last = 0, active = false, t = 0;
  let $, rb, onFind;
  const bubbles = [], steam = [];

  const FIND = {
    freeze: "0℃で こおりはじめた。こおって いる あいだ、{温度|おんど}は 0℃の まま。",
    expand: "{水|みず}が こおると かさが ふえた（やく 1.1ばい）。",
    melt: "とける ときも、{温度|おんど}は 0℃の まま。",
    boil: "100℃ ちかくで わきたった（ふっとう）。{大|おお}きな あわは {水|みず}じょうき。",
    flat: "わいて いる あいだは、あたためても {温度|おんど}は {上|あ}がらない。",
    yuge: "ゆげ（{白|しろ}い もの）は、{水|みず}じょうきが ひえて できた {小|ちい}さな {水|みず}の つぶ。"
  };

  function fresh() { return { m: 100, f: 0, T: ROOM, mode: "off", time: 0, hist: [[0, ROOM, "off"]], speed: 1, boilT: 0, spoon: 0, found: {}, wasFrozen: false }; }

  /* 体積（mL）: 水は 4℃ で いちばん ちいさい。氷は 1g ＝ やく 1.09mL */
  function vol() {
    const vL = 1 + 4.7e-6 * Math.pow(S.T - 4, 2);
    return S.m * ((1 - S.f) * (S.f > 0 ? 1.0001 : vL) + S.f * 1.091);
  }

  function addEnergy(E) {
    let guard = 0;
    while (Math.abs(E) > 1e-6 && guard++ < 6) {
      const m = S.m;
      if (E > 0) {
        if (S.f > 0) {
          if (S.T < 0) { const need = -S.T * m * C_ICE, u = Math.min(E, need); S.T += u / (m * C_ICE); E -= u; if (u === need) S.T = 0; }
          else { const need = S.f * LF * m, u = Math.min(E, need); S.f -= u / (LF * m); E -= u; S.T = 0; if (u === need) S.f = 0; find("melt"); }
        } else if (S.T < 100) { const need = (100 - S.T) * m, u = Math.min(E, need); S.T += u / m; E -= u; if (u === need) S.T = 100; }
        else { const dm = Math.min(S.m - 5, E / LV); S.m -= dm; E = 0; S.boiling = true; }
      } else {
        const e = -E;
        if (S.f < 1) {
          if (S.T > 0) { const need = S.T * m, u = Math.min(e, need); S.T -= u / m; E += u; if (u === need) S.T = 0; }
          else { const need = (1 - S.f) * LF * m, u = Math.min(e, need); S.f += u / (LF * m); E += u; S.T = 0; if (u === need) S.f = 1; find("freeze"); }
        } else { S.T -= e / (m * C_ICE); E = 0; }
      }
    }
  }

  function step(dtMin) {
    S.boiling = false;
    let P;
    if (S.mode === "heat") P = BURNER - 3 * (S.T - ROOM);
    else if (S.mode === "cool") P = 25 * (BATH - S.T);
    else P = 4 * (ROOM - S.T);
    addEnergy(P * dtMin);
    S.time += dtMin;
    if (S.boiling) { S.boilT += dtMin; find("boil"); if (S.boilT >= 2) find("flat"); } else S.boilT = 0;
    if (S.f >= 1) { S.wasFrozen = true; find("expand"); }
    const h = S.hist[S.hist.length - 1];
    if (S.time - h[0] >= 0.2) S.hist.push([S.time, S.T, S.mode]);
  }

  function find(k) {
    if (S.found[k]) return;
    S.found[k] = 1;
    if (k === "freeze" || k === "expand") Snd.paki(); else Snd.ok();
    if (onFind) onFind(k);
    renderFound();
    const n = $("#labNote"); if (n) { n.innerHTML = "💡 " + rb(FIND[k]); n.dataset.say = FIND[k]; Say.speak(FIND[k]); }
  }

  function state() {
    if (S.f >= 1) return "🧊 こおり（{固体|こたい}）";
    if (S.f > 0) return "🧊💧 こおりと {水|みず}";
    if (S.boiling) return "♨️ わきたって いる（ふっとう）";
    return "💧 {水|みず}（{液体|えきたい}）";
  }

  function update(dt) {
    t += dt;
    const sim = dt * S.speed;   // 1びょう ＝ 1ぷん
    const n = Math.max(1, Math.ceil(sim / 0.05));
    for (let i = 0; i < n; i++) step(sim / n);
    Snd.gutsu(S.boiling ? 1 : (S.T > 85 && S.f === 0 && S.mode === "heat" ? 0.25 : 0));
    if (S.spoon > 0) S.spoon = Math.min(1, S.spoon + dt * 0.4);
    const r = function (id, v) { const e = document.getElementById(id); if (e && e.dataset.v !== v) { e.dataset.v = v; e.innerHTML = rb(v); } };
    r("lT", S.T.toFixed(1) + "℃");
    r("lV", vol().toFixed(1) + " mL");
    r("lS", state());
    r("lTime", S.time.toFixed(1) + " ぷん");
  }

  /* ---------- え ---------- */
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, "#f8f9fa"); bg.addColorStop(1, "#e7f5ff");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    const u = Math.min(cw / 400, ch / 360);
    ctx.save(); ctx.translate(cw / 2 - 200 * u, ch / 2 - 180 * u); ctx.scale(u, u);
    // つくえ
    ctx.fillStyle = "#ced4da"; ctx.fillRect(0, 338, 400, 22);
    const bx = 40, bw = 130, btop = 120, bbot = 300;
    // 0〜120mL を 目もり（120mL が btop+10）
    const yOf = function (v) { return bbot - (v / 125) * (bbot - btop); };
    // ひやす: 氷と しおの ボウル
    if (S.mode === "cool") {
      ctx.fillStyle = "#d0ebff"; ctx.beginPath(); ctx.moveTo(bx - 40, 220); ctx.lineTo(bx + bw + 40, 220); ctx.lineTo(bx + bw + 20, 336); ctx.lineTo(bx - 20, 336); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 18; i++) { ctx.fillRect(bx - 30 + (i * 47) % (bw + 60), 230 + (i * 29) % 90, 16, 12); }
    }
    // コンロ
    if (S.mode !== "cool") {
      ctx.fillStyle = "#495057"; ctx.fillRect(bx - 10, 318, bw + 20, 20);
      ctx.fillStyle = "#868e96"; ctx.fillRect(bx - 4, 300, bw + 8, 6);
      if (S.mode === "heat") for (let i = 0; i < 5; i++) {
        const fx = bx + 18 + i * 24, fh = 12 + Math.sin(t * 20 + i) * 3;
        ctx.fillStyle = "#4dabf7"; ctx.beginPath(); ctx.moveTo(fx - 6, 318); ctx.quadraticCurveTo(fx, 318 - fh * 2, fx + 6, 318); ctx.fill();
        ctx.fillStyle = "#ffa94d"; ctx.beginPath(); ctx.moveTo(fx - 3, 318); ctx.quadraticCurveTo(fx, 318 - fh, fx + 3, 318); ctx.fill();
      }
    }
    const lv = yOf(vol());
    // 水・氷
    if (S.f < 1) {
      ctx.fillStyle = "rgba(116,192,252,.6)"; ctx.fillRect(bx + 3, lv, bw - 6, bbot - lv);
    }
    if (S.f > 0) {
      // まわりから こおって いく
      const th = (bw / 2 - 3) * Math.min(1, S.f * 1.05);
      ctx.fillStyle = "rgba(235,248,255,.95)";
      ctx.fillRect(bx + 3, lv, th, bbot - lv); ctx.fillRect(bx + bw - 3 - th, lv, th, bbot - lv);
      ctx.fillRect(bx + 3, lv, bw - 6, Math.min(bbot - lv, th * 0.5));
      ctx.strokeStyle = "rgba(160,200,230,.8)"; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(bx + 8 + i * 12, lv + 4); ctx.lineTo(bx + 14 + i * 12, lv + 4 + th * 0.4); ctx.stroke(); }
      if (S.f >= 1) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(bx + 3, lv - 2, bw - 6, 5); }
    }
    // 水面
    ctx.strokeStyle = "#1c7ed6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 3, lv); ctx.lineTo(bx + bw - 3, lv); ctx.stroke();
    // あわ
    if (S.f === 0 && S.mode === "heat") {
      if (S.T > 40 && S.T < 90 && Math.random() < 0.3) bubbles.push({ x: bx + 6 + Math.random() * (bw - 12), y: bbot - 4 - Math.random() * (bbot - lv - 10), r: 1.5, v: 0, air: true, life: 1 });
      if (S.T > 96 && Math.random() < (S.boiling ? 0.9 : 0.25)) bubbles.push({ x: bx + 15 + Math.random() * (bw - 30), y: bbot - 4, r: 3 + Math.random() * 5, v: 60 + Math.random() * 60, air: false });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (b.air) { b.life -= 0.004; if (b.life <= 0) { bubbles.splice(i, 1); continue; } }
      else { b.y -= b.v * 0.016; b.r += 0.03; if (b.y < lv + 2 || S.f > 0) { bubbles.splice(i, 1); continue; } }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (bubbles.length > 200) bubbles.splice(0, bubbles.length - 200);
    // ゆげ（水面の すぐ上は すきとおって いる＝水じょうき。少し 上で 白く なる＝ゆげ）
    if (S.f === 0 && S.T > 80) {
      const k = Math.min(1, (S.T - 80) / 20);
      if (Math.random() < k) steam.push({ x: bx + 20 + Math.random() * (bw - 40), y: Math.min(lv, btop) - 26, a: 0, s: 8 + Math.random() * 6 });
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const s = steam[i]; s.y -= 0.9; s.x += Math.sin(t * 2 + i) * 0.3; s.a += 0.02; s.s += 0.1;
      const al = Math.min(0.55, s.a) * (1 - Math.max(0, (s.a - 1.2)));
      if (al <= 0 || s.y < -20) { steam.splice(i, 1); continue; }
      ctx.fillStyle = "rgba(255,255,255," + al + ")"; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(173,181,189," + al * 0.6 + ")"; ctx.lineWidth = 1; ctx.stroke();
    }
    // ビーカー
    ctx.strokeStyle = "#495057"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx - 6, btop - 6); ctx.lineTo(bx, btop); ctx.lineTo(bx, bbot); ctx.lineTo(bx + bw, bbot); ctx.lineTo(bx + bw, btop); ctx.stroke();
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = "#495057"; ctx.lineWidth = 1;
    for (let v = 0; v <= 120; v += 10) { const y = yOf(v); ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + (v % 50 ? 8 : 16), y); ctx.stroke(); if (v % 20 === 0) ctx.fillText(v, bx + 18, y + 3); }
    // かさの ルーペ（90〜115mL を おおきく）
    const zx = 190, zy = 150, zh = 160, zv = function (v) { return zy + zh - (v - 90) / 25 * zh; };
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#868e96"; ctx.lineWidth = 2; ctx.fillRect(zx, zy, 44, zh); ctx.strokeRect(zx, zy, 44, zh);
    const V = vol();
    ctx.fillStyle = S.f >= 1 ? "rgba(200,230,250,.95)" : "rgba(116,192,252,.7)";
    const vy = Math.max(zy, Math.min(zy + zh, zv(V))); ctx.fillRect(zx + 1, vy, 42, zy + zh - vy);
    ctx.strokeStyle = "#212529"; ctx.lineWidth = 1; ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = "#212529";
    for (let v = 90; v <= 115; v += 5) { const y = zv(v); ctx.beginPath(); ctx.moveTo(zx, y); ctx.lineTo(zx + 10, y); ctx.stroke(); ctx.fillText(v, zx + 14, y + 3); }
    ctx.strokeStyle = "#e8590c"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(zx, zv(100)); ctx.lineTo(zx + 44, zv(100)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#495057"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillText("かさを", zx, zy - 22); ctx.fillText("おおきく", zx, zy - 8);
    // 温度計（ビーカーに さして ある）
    const tx = bx + bw - 30, ty0 = 30, ty1 = bbot - 12, tk = function (v) { return ty1 - 14 - (v + 20) / 130 * (ty1 - 14 - ty0 - 10); };
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.strokeStyle = "#868e96"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - 5, ty0, 10, ty1 - ty0, 5) : ctx.rect(tx - 5, ty0, 10, ty1 - ty0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e03131"; const yt = tk(Math.max(-20, Math.min(110, S.T)));
    ctx.fillRect(tx - 2, yt, 4, ty1 - 8 - yt); ctx.beginPath(); ctx.arc(tx, ty1 - 6, 6, 0, 7); ctx.fill();
    ctx.font = "9px system-ui, sans-serif"; ctx.fillStyle = "#343a40";
    for (let v = -20; v <= 110; v += 10) { const y = tk(v); ctx.fillRect(tx - 9, y, v % 50 ? 4 : 8, 1); if (v % 20 === 0 || v === 100 || v === 0) ctx.fillText(v, tx - 30, y + 3); }
    // ラベル
    ctx.font = "bold 12px system-ui, sans-serif";
    if (S.f === 0 && S.T > 90) {
      tag(ctx, ["しろい ゆげ", "＝ちいさな みずの つぶ"], 240, 22, bx + 95, btop - 60);
      tag(ctx, ["すきとおった ところ", "＝みずじょうき（みえない）"], 240, 84, bx + 80, Math.min(lv, btop) - 10);
    }
    if (S.boiling) tag(ctx, ["おおきな あわ", "＝みずじょうき"], 245, 210, bx + 70, Math.max(lv + 30, 240));
    else if (S.mode === "heat" && S.f === 0 && S.T > 40 && S.T < 90) tag(ctx, ["ちいさな あわ", "＝とけていた くうき"], 245, 210, bx + 12, 250);
    // スプーン
    if (S.spoon > 0) {
      const sy = btop - 70;
      ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.ellipse(bx + bw / 2, sy, 20, 9, 0, 0, 7); ctx.fill(); ctx.fillRect(bx + bw / 2 - 106, sy - 3, 90, 6);
      ctx.fillStyle = "#4dabf7";
      for (let i = 0; i < Math.floor(S.spoon * 8); i++) { ctx.beginPath(); ctx.arc(bx + bw / 2 - 14 + i * 4, sy + 9 + (i % 2) * 3, 2.4, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    drawGraph();
  }
  function tag(ctx, lines, x, y, px, py) {
    ctx.font = "bold 12px system-ui, sans-serif";
    const w = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) + 12, h = lines.length * 16 + 6;
    ctx.fillStyle = "rgba(255,255,255,.94)"; ctx.strokeStyle = "#1098ad"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#0b7285"; lines.forEach(function (l, i) { ctx.fillText(l, x + 6, y + 16 + i * 16); });
  }
  function drawGraph() {
    const r = gcv.getBoundingClientRect(), w = r.width, h = r.height;
    if (gcv.width !== Math.round(w * dpr)) { gcv.width = Math.round(w * dpr); gcv.height = Math.round(h * dpr); }
    const g = gctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const L = 34, B = 22, T0 = 8, Rr = 8, tmax = Math.max(15, Math.ceil(S.time / 5) * 5 + 5);
    const X = function (m) { return L + m / tmax * (w - L - Rr); }, Y = function (v) { return T0 + (110 - v) / 130 * (h - T0 - B); };
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    g.font = "10px system-ui, sans-serif"; g.fillStyle = "#495057"; g.strokeStyle = "#dee2e6"; g.lineWidth = 1;
    for (let v = -20; v <= 100; v += 20) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rr, Y(v)); g.stroke(); g.fillText(v + "℃", 2, Y(v) + 3); }
    [0, 100].forEach(function (v) { g.strokeStyle = v ? "#ffa8a8" : "#a5d8ff"; g.lineWidth = 2; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - Rr, Y(v)); g.stroke(); });
    g.fillStyle = "#495057"; g.lineWidth = 1;
    const step = tmax > 40 ? 10 : 5;
    for (let m = 0; m <= tmax; m += step) g.fillText(m + "", X(m) - 3, h - 8);
    g.fillText("ぷん", w - 30, h - 8);
    g.lineWidth = 2.5; g.lineJoin = "round";
    const hs = S.hist.concat([[S.time, S.T, S.mode]]);
    for (let i = 1; i < hs.length; i++) {
      g.strokeStyle = hs[i][2] === "heat" ? "#e03131" : hs[i][2] === "cool" ? "#1c7ed6" : "#868e96";
      g.beginPath(); g.moveTo(X(hs[i - 1][0]), Y(hs[i - 1][1])); g.lineTo(X(hs[i][0]), Y(hs[i][1])); g.stroke();
    }
  }

  function renderFound() {
    const el = $("#labFound"); if (!el) return;
    el.innerHTML = Object.keys(FIND).map(function (k) {
      return '<li class="' + (S.found[k] ? "ok" : "") + '">' + (S.found[k] ? "✅ " + rb(FIND[k]) : "⬜ ？？？") + "</li>";
    }).join("");
  }

  function setMode(m) {
    S.mode = m; Snd.tap();
    document.querySelectorAll("[data-mode]").forEach(function (b) { b.classList.toggle("on", b.dataset.mode === m); });
    const tips = {
      heat: "🔥 あたためて いるよ。{温度計|おんどけい}と グラフを 見てね。（ほんとうの じっけんでは ふっとういしを いれて、おとなと いっしょに）",
      cool: "❄️ {氷|こおり}に しおを まぜると、0℃ より ずっと つめたく なる。その 中で ひやして いるよ。",
      off: "⏹ とめたよ。{部屋|へや}の {温度|おんど}（20℃）に だんだん ちかづく。"
    };
    const n = $("#labNote"); n.innerHTML = rb(tips[m]); n.dataset.say = tips[m];
  }

  function loop(ts) {
    if (!active) { raf = 0; return; }
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    gcv.width = 0;
  }
  function reset() { S = fresh(); bubbles.length = 0; steam.length = 0; setMode("off"); renderFound(); const sp = $("#spdBtn"); if (sp) sp.textContent = "⏩ はやおくり"; }

  function init(o) {
    $ = o.$; rb = o.rb; onFind = o.onFind;
    cv = document.getElementById("labCv"); ctx = cv.getContext("2d");
    gcv = document.getElementById("graphCv"); gctx = gcv.getContext("2d");
    S = fresh();
    if (o.found) S.found = Object.assign({}, o.found);
    document.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { Snd.unlock(); setMode(b.dataset.mode); }; });
    $("#spdBtn").onclick = function () { S.speed = S.speed === 1 ? 6 : 1; this.textContent = S.speed === 1 ? "⏩ はやおくり" : "▶ ふつう"; this.classList.toggle("on", S.speed > 1); };
    $("#spoonBtn").onclick = function () {
      Snd.unlock();
      if (S.f === 0 && S.T > 90) { S.spoon = 0.01; find("yuge"); }
      else { const s = "ゆげが でる くらい あつく なってから（90℃ いじょう）ためしてね。"; $("#labNote").innerHTML = rb(s); Say.speak(s); Snd.ng(); }
    };
    $("#resetBtn").onclick = function () { const f = S.found; reset(); S.found = f; renderFound(); };
    window.addEventListener("resize", function () { if (active) resize(); });
    renderFound();
    setMode("off");
  }
  function show(on) {
    active = on;
    if (on) { resize(); last = 0; if (!raf) raf = requestAnimationFrame(loop); }
    else Snd.gutsu(0);
  }
  return { init: init, show: show, FIND: FIND, test: { state: function () { return S; }, vol: function () { return vol(); }, step: step, setMode: function (m) { setMode(m); } } };
})();
