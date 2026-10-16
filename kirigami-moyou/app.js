/* ============================================================
   きりがみ もよう — がめん と うごき
   ============================================================ */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const KEY = { sound: "kirigami-moyou:sound", gallery: "kirigami-moyou:gallery", puzzles: "kirigami-moyou:puzzles" };
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  const COLORS = [
    { name: "あか", hex: "#e03131" }, { name: "ピンク", hex: "#f06595" }, { name: "オレンジ", hex: "#f76707" }, { name: "きいろ", hex: "#fcc419" },
    { name: "みどり", hex: "#2f9e44" }, { name: "みずいろ", hex: "#22b8cf" }, { name: "あお", hex: "#1c7ed6" }, { name: "むらさき", hex: "#7048e8" },
  ];
  const FOLD_INFO = {
    half: "たてに はんぶん", quarter: "はんぶん を もう いちど", eighth: "さらに ななめに", snow: "6かくの かみ を 12まいに",
  };
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const E = 1.04; // せかいの がぞう の はんい [-E,E]²

  // ============================================================
  // おと（WebAudio の ごうせいおん だけ）
  // ============================================================
  const Snd = (() => {
    let ac = null, noise = null, on = LS.get(KEY.sound, true) !== false;
    function ensure() {
      if (!on) return null;
      try {
        if (!ac) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ac = new AC();
        }
        if (ac.state === "suspended") ac.resume();
        if (!noise) {
          const len = ac.sampleRate;
          noise = ac.createBuffer(1, len, ac.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        return ac;
      } catch (e) { return null; }
    }
    function burst(t, dur, f0, f1, q, vol) {
      const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noise;
      bp.type = "bandpass"; bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(ac.destination);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    }
    function tone(t, f, dur, type, vol) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "triangle"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      get on() { return on; },
      set(v) { on = v; LS.set(KEY.sound, v); if (v) ensure(); },
      snip() { const a = ensure(); if (!a) return; const t = a.currentTime; burst(t, 0.04, 5200, 3600, 2, 0.5); burst(t + 0.075, 0.05, 4400, 2800, 2, 0.45); },
      fasa() { const a = ensure(); if (!a) return; burst(a.currentTime, 0.38, 700, 3200, 0.9, 0.35); },
      fold() { const a = ensure(); if (!a) return; burst(a.currentTime, 0.22, 1800, 600, 0.8, 0.22); },
      pop() { const a = ensure(); if (!a) return; const t = a.currentTime; tone(t, 660, 0.09, "sine", 0.18); tone(t + 0.05, 990, 0.08, "sine", 0.12); },
      undo() { const a = ensure(); if (!a) return; const t = a.currentTime; tone(t, 700, 0.08, "sine", 0.15); tone(t + 0.06, 520, 0.1, "sine", 0.13); },
      dekita() { const a = ensure(); if (!a) return; const t = a.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.11, f, 0.32, "triangle", 0.22)); },
      oshii() { const a = ensure(); if (!a) return; const t = a.currentTime; tone(t, 392, 0.2, "triangle", 0.2); tone(t + 0.2, 330, 0.32, "triangle", 0.2); },
    };
  })();

  // ============================================================
  // がぞう づくり（おった かみ の マスク → k かい おった じょうたい の かみ）
  // ============================================================
  function tracePoly(c, poly) {
    c.beginPath();
    poly.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
  }
  function traceLine(c, pts) {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    if (pts.length === 1) c.lineTo(pts[0][0] + 1e-4, pts[0][1]);
  }
  // せかいの ざひょう で きりとり を けす（c の へんかん は せかい→がめん に して おく）
  function eraseCuts(c, cuts, grow) {
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "#000"; c.strokeStyle = "#000"; c.lineCap = "round"; c.lineJoin = "round";
    for (const cut of cuts) {
      if (cut.p) { tracePoly(c, cut.p); c.fill(); if (grow) { c.lineWidth = grow; c.stroke(); } }
      c.lineWidth = cut.w + (grow || 0); traceLine(c, cut.l); c.stroke();
    }
    c.restore();
  }
  // ドメインの マスク（のこっている ところ が 1）。ドメインの そとも 1 に して おく（おりめの すじ を ださない）
  function buildMask(fid, cuts, res) {
    const F = KG.get(fid), pad = 0.03;
    const x0 = F.bbox[0] - pad, y1 = F.bbox[3] + pad;
    const w = Math.ceil((F.bbox[2] - F.bbox[0] + 2 * pad) * res), h = Math.ceil((F.bbox[3] - F.bbox[1] + 2 * pad) * res);
    const cnv = document.createElement("canvas");
    cnv.width = w; cnv.height = h;
    const c = cnv.getContext("2d");
    c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    c.setTransform(res, 0, 0, -res, -x0 * res, y1 * res);
    eraseCuts(c, cuts, 4 / res); // ふち に そった きりとり の なかば すけた がぞ を のこさない
    const d = c.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    // ドメインの すぐ そと は いちばん ちかい なかの あたい に する（ひらいた ときに おりめ や ふち に すじが でない）
    const cx = F.domain.reduce((s, p) => s + p[0], 0) / F.domain.length, cy = F.domain.reduce((s, p) => s + p[1], 0) / F.domain.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = [x0 + (i + 0.5) / res, y1 - (j + 0.5) / res], dd = KG.hpDist(F.domainHP, p[0], p[1]);
      if (dd >= 0 || dd < -5 / res) continue;
      const q = KG.nearestOnBoundary(F.domain, p).pt, l = Math.hypot(cx - q[0], cy - q[1]) || 1;
      const qx = q[0] + ((cx - q[0]) / l) * 3 / res, qy = q[1] + ((cy - q[1]) / l) * 3 / res;
      const ii = Math.min(w - 1, Math.max(0, Math.floor((qx - x0) * res))), jj = Math.min(h - 1, Math.max(0, Math.floor((y1 - qy) * res)));
      a[j * w + i] = a[jj * w + ii];
    }
    // ひとつの ドメインの てん (qx,qy) が どれだけ のこっているか（バイリニア）
    return (qx, qy) => {
      const fx = (qx - x0) * res - 0.5, fy = (y1 - qy) * res - 0.5;
      let ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      if (ix < 0) ix = 0; if (iy < 0) iy = 0;
      if (ix > w - 2) ix = w - 2; if (iy > h - 2) iy = h - 2;
      const o = iy * w + ix;
      const top = a[o] + (a[o + 1] - a[o]) * tx, bot = a[o + w] + (a[o + w + 1] - a[o + w]) * tx;
      return (top + (bot - top) * ty) / 255;
    };
  }
  function stageCanvas(fid, k, sampler, hex, S) {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = S;
    const c = cnv.getContext("2d"), img = c.createImageData(S, S);
    KG.renderStage(fid, k, sampler, hexRgb(hex), S, E, img.data);
    c.putImageData(img, 0, 0);
    return cnv;
  }
  // ちいさい え（ギャラリー・もんだい・おてほん）
  function drawThumb(cnv, fid, hex, cuts, cssSize) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), S = Math.round(cssSize * dpr);
    cnv.width = cnv.height = S;
    const img = stageCanvas(fid, 0, buildMask(fid, cuts, Math.max(120, S / 1.6)), hex, S);
    const c = cnv.getContext("2d");
    c.clearRect(0, 0, S, S);
    c.drawImage(img, 0, 0);
  }

  // ============================================================
  // がめんの きりかえ
  // ============================================================
  const views = { menu: $("#vMenu"), setup: $("#vSetup"), play: $("#vPlay"), puzzles: $("#vPuzzles"), gallery: $("#vGallery") };
  let current = "menu";
  function show(name) {
    current = name;
    for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
    $("#backBtn").hidden = name === "menu";
    const titles = { menu: "✂️ きりがみ もよう", setup: "✂️ じゆうに きる", puzzles: "❓ もんだい", gallery: "🖼️ ギャラリー" };
    if (titles[name]) $("#title").textContent = titles[name];
    if (name === "menu") refreshMenu();
    if (name === "puzzles") renderPuzzleList();
    if (name === "gallery") renderGallery();
    if (name === "play") requestAnimationFrame(resize);
  }
  $("#backBtn").addEventListener("click", () => {
    Snd.pop();
    if (current === "play") { stopPlay(); show(play.mode === "puzzle" ? "puzzles" : "setup"); }
    else show("menu");
  });
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { Snd.pop(); show(b.dataset.go); }));
  const soundBtn = $("#soundBtn");
  function paintSound() { soundBtn.textContent = Snd.on ? "🔊" : "🔇"; soundBtn.setAttribute("aria-pressed", String(Snd.on)); }
  soundBtn.addEventListener("click", () => { Snd.set(!Snd.on); paintSound(); Snd.pop(); });
  paintSound();

  function refreshMenu() {
    const prog = LS.get(KEY.puzzles, {}) || {};
    const n = KP.LIST.filter((p) => (prog[p.id] || 0) >= KP.CLEAR).length;
    $("#puzzleCount").textContent = `クリア ${n} / ${KP.LIST.length}`;
    $("#galleryCount").textContent = `${loadGallery().length} こ の もよう`;
  }

  // ---------- いろ と おりかた ----------
  let colorIdx = 0;
  const colorsEl = $("#colors");
  COLORS.forEach((col, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch"; b.style.setProperty("--c", col.hex);
    b.innerHTML = `<i></i>${col.name}`;
    b.setAttribute("aria-pressed", String(i === colorIdx));
    b.addEventListener("click", () => {
      colorIdx = i; Snd.pop();
      colorsEl.querySelectorAll(".swatch").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
      paintFoldIcons();
    });
    colorsEl.appendChild(b);
  });
  const foldsEl = $("#folds");
  function foldSvg(fid, hex) {
    const F = KG.get(fid);
    const tr = (p) => [50 + p[0] * 40, 50 - p[1] * 40];
    const shape = F.shape.map(tr).map((p) => p.join(",")).join(" ");
    const dom = F.domain.map(tr).map((p) => p.join(",")).join(" ");
    const cr = F.creases.map(([a, b]) => { const A = tr(a), B = tr(b); return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#4a1f2e" stroke-width="2.5" stroke-dasharray="4 4"/>`; }).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${shape}" fill="${hex}" opacity=".18" stroke="${hex}" stroke-width="1.5" stroke-dasharray="3 3"/><polygon points="${dom}" fill="${hex}"/>${cr}</svg>`;
  }
  KG.FOLD_IDS.forEach((fid) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fold-card"; b.dataset.fold = fid;
    b.innerHTML = `<span class="ic"></span><b>${KG.get(fid).name}</b><small>${FOLD_INFO[fid]}</small>`;
    b.addEventListener("click", () => { Snd.pop(); startFree(fid); });
    foldsEl.appendChild(b);
  });
  function paintFoldIcons() {
    foldsEl.querySelectorAll(".fold-card").forEach((b) => { b.querySelector(".ic").innerHTML = foldSvg(b.dataset.fold, COLORS[colorIdx].hex); });
  }
  paintFoldIcons();

  // ============================================================
  // あそぶ がめん
  // ============================================================
  const stage = $("#stage"), cv = $("#cv"), ctx = cv.getContext("2d");
  const tmp = document.createElement("canvas"), tctx = tmp.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const play = {
    mode: "free", fold: "half", color: COLORS[0].hex, cuts: [], puzzle: null, hint: false,
    phase: "idle", view: null, stages: [], stagesKey: "", token: 0, falling: [], stroke: null, result: null,
  };

  // --- みる ところ（せかい→がめん）---
  function fitView(pts, rot, pad) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const r = pts.map((p) => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs]);
    const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
    const top = 46; // うえの メッセージ の ぶん
    const sc = Math.min((W - 2 * pad) / (bx1 - bx0), (H - 2 * pad - top) / (by1 - by0));
    const rcx = (bx0 + bx1) / 2, rcy = (by0 + by1) / 2;
    return { sc, cx: rcx * cs + rcy * sn, cy: -rcx * sn + rcy * cs, rot, X: W / 2, Y: (H + top) / 2 };
  }
  const fullView = () => fitView([[-1, -1], [1, 1], [-1, 1], [1, -1]], 0, Math.max(14, Math.min(W, H) * 0.05));
  const cutView = () => { const F = KG.get(play.fold); return fitView(F.domain, F.viewRot, Math.max(22, Math.min(W, H) * 0.07)); };
  function lerpView(a, b, t) {
    const L = (x, y) => x + (y - x) * t;
    return { sc: L(a.sc, b.sc), cx: L(a.cx, b.cx), cy: L(a.cy, b.cy), rot: L(a.rot, b.rot), X: L(a.X, b.X), Y: L(a.Y, b.Y) };
  }
  function viewMatrix(v) {
    const cs = Math.cos(v.rot), sn = Math.sin(v.rot);
    const a = v.sc * cs, c = -v.sc * sn, b = -v.sc * sn, d = -v.sc * cs;
    return [a, b, c, d, v.X - a * v.cx - c * v.cy, v.Y - b * v.cx - d * v.cy];
  }
  function setView(c, v, ox, oy) {
    const m = viewMatrix(v), k = DPR;
    c.setTransform(m[0] * k, m[1] * k, m[2] * k, m[3] * k, (m[4] - (ox || 0)) * k, (m[5] - (oy || 0)) * k);
  }
  function toWorld(sx, sy) {
    const [a, b, c, d, e, f] = viewMatrix(play.view), det = a * d - b * c, x = sx - e, y = sy - f;
    return [(d * x - c * y) / det, (-b * x + a * y) / det];
  }
  function toScreen(p) {
    const [a, b, c, d, e, f] = viewMatrix(play.view);
    return [a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + f];
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    DPR = Math.min(3, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = tmp.width = Math.round(W * DPR);
    cv.height = tmp.height = Math.round(H * DPR);
    if (play.phase === "cut") play.view = cutView();
    else if (play.phase === "open" || play.phase === "idle") play.view = fullView();
    const ms = Math.round(Math.max(84, Math.min(150, Math.min(W, H) * 0.26)));
    $("#model").style.setProperty("--ms", ms + "px");
    if (play.puzzle) drawThumb($("#modelCv"), play.puzzle.fold, play.puzzle.color, play.puzzle.cuts, ms);
    render();
  }
  new ResizeObserver(() => { if (current === "play") resize(); }).observe(stage);

  // --- かみ の がぞう（k かい おった じょうたい）。きりとりが かわったら つくりなおす ---
  function stageImg(k) {
    const key = JSON.stringify([play.fold, play.color, play.cuts.length, play.cuts.length && play.cuts[play.cuts.length - 1].l[0]]);
    if (key !== play.stagesKey) { play.stagesKey = key; play.stages = []; play.mask = null; }
    if (!play.stages[k]) {
      const S = Math.max(256, Math.min(1000, Math.round(fullView().sc * 2 * E * DPR)));
      if (!play.mask) play.mask = buildMask(play.fold, play.cuts, Math.max(300, S / 1.4));
      play.stages[k] = stageCanvas(play.fold, k, play.mask, play.color, S);
    }
    return play.stages[k];
  }
  function drawWorldImg(c, img) {
    c.transform(1, 0, 0, -1, 0, 0);
    c.drawImage(img, -E, -E, 2 * E, 2 * E);
  }
  function clipHalf(c, n, side) {
    const nx = n[0] * side, ny = n[1] * side, dx = -ny, dy = nx, R = 4;
    c.beginPath();
    c.moveTo(dx * R, dy * R); c.lineTo(dx * R + nx * R, dy * R + ny * R); c.lineTo(-dx * R + nx * R, -dy * R + ny * R); c.lineTo(-dx * R, -dy * R);
    c.closePath(); c.clip();
  }
  function shadow(c, lift) {
    c.shadowColor = `rgba(60, 20, 40, ${0.16 + 0.12 * lift})`;
    c.shadowBlur = (6 + 16 * lift) * DPR;
    c.shadowOffsetY = (3 + 10 * lift) * DPR;
  }
  function clearTable() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--table") || "#eef2f7";
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  // おる とちゅう: step k の おりせん で、はんたいがわ（フラップ）を s=1（ひらいた）→ s=-1（おった）
  function drawFoldFrame(k, s) {
    clearTable();
    const img = stageImg(k), n = KG.get(play.fold).foldHP[k].n;
    ctx.save(); shadow(ctx, 0); setView(ctx, play.view); clipHalf(ctx, n, 1); drawWorldImg(ctx, img); ctx.restore();
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.save(); setView(tctx, play.view);
    const m = s - 1;
    tctx.transform(1 + m * n[0] * n[0], m * n[0] * n[1], m * n[0] * n[1], 1 + m * n[1] * n[1], 0, 0);
    clipHalf(tctx, n, -1); drawWorldImg(tctx, img); tctx.restore();
    const shade = 0.16 * (1 - Math.abs(s));
    if (shade > 0.005) {
      tctx.save(); tctx.globalCompositeOperation = "source-atop"; tctx.fillStyle = `rgba(0,0,0,${shade})`; tctx.fillRect(0, 0, tmp.width, tmp.height); tctx.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); shadow(ctx, 1 - Math.abs(s)); ctx.drawImage(tmp, 0, 0); ctx.restore();
  }
  function drawStageStatic(k) {
    clearTable();
    ctx.save(); shadow(ctx, 0); setView(ctx, play.view); drawWorldImg(ctx, stageImg(k)); ctx.restore();
  }
  // きる とき の おった かみ（ベクターで すばやく）
  function drawFolded() {
    clearTable();
    const F = KG.get(play.fold);
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.save(); setView(tctx, play.view);
    tctx.fillStyle = play.color; tracePoly(tctx, F.domain); tctx.fill();
    // おりめ（わ）は てんてん
    tctx.strokeStyle = "rgba(40, 10, 20, .55)"; tctx.lineWidth = 3 / play.view.sc; tctx.setLineDash([9 / play.view.sc, 7 / play.view.sc]);
    for (const [a, b] of F.creases) { tctx.beginPath(); tctx.moveTo(a[0], a[1]); tctx.lineTo(b[0], b[1]); tctx.stroke(); }
    tctx.setLineDash([]);
    eraseCuts(tctx, play.cuts, 6 / play.view.sc);
    tctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // かさなった かみ の あつみ
    const layers = Math.min(3, F.steps.length);
    for (let i = layers; i >= 1; i--) {
      ctx.globalAlpha = 0.18; ctx.drawImage(tmp, 0, i * 2.2 * DPR);
    }
    ctx.globalAlpha = 1; shadow(ctx, 0.2); ctx.drawImage(tmp, 0, 0); ctx.restore();
    if (play.mode === "puzzle" && play.hint) drawHint();
  }
  function drawHint() {
    const F = KG.get(play.fold), sc = play.view.sc;
    ctx.save(); setView(ctx, play.view);
    tracePoly(ctx, F.domain.map((p) => p)); ctx.clip();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 7 / sc;
    for (const s of play.puzzle.strokes) { traceLine(ctx, s); ctx.stroke(); }
    ctx.strokeStyle = "#212529"; ctx.lineWidth = 3.5 / sc; ctx.setLineDash([10 / sc, 8 / sc]);
    for (const s of play.puzzle.strokes) { traceLine(ctx, s); ctx.stroke(); }
    ctx.restore();
  }
  function drawStroke() {
    const st = play.stroke;
    if (!st || st.screen.length < 1) return;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(6, KG.get(play.fold).w * play.view.sc);
    traceLine(ctx, st.screen); ctx.stroke();
    ctx.strokeStyle = "#343a40"; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    traceLine(ctx, st.screen); ctx.stroke();
    ctx.setLineDash([]);
    const p = st.screen[st.screen.length - 1];
    ctx.font = "34px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✂️", p[0] + 18, p[1] - 22);
    ctx.restore();
  }
  function drawFalling(now) {
    let alive = false;
    play.falling = play.falling.filter((f) => (now - f.t0) / 1000 < 1.5);
    for (const f of play.falling) {
      const t = (now - f.t0) / 1000;
      alive = true;
      const fx = Math.cos(t * 7) * 0.75, sx = Math.abs(fx) < 0.2 ? 0.2 * Math.sign(fx || 1) : fx;
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = Math.max(0, Math.min(1, (1.5 - t) / 0.5));
      ctx.translate(f.cx + Math.sin(t * 4) * 28 * f.dir, f.cy + 40 * t + 300 * t * t);
      ctx.rotate(f.dir * t * 1.2); ctx.scale(sx, 1);
      ctx.shadowColor = "rgba(0,0,0,.2)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 6;
      ctx.drawImage(f.img, -f.cx + f.x, -f.cy + f.y, f.img.width / DPR, f.img.height / DPR);
      ctx.restore();
    }
    return alive;
  }
  let rafReq = 0;
  function render() {
    if (rafReq) return;
    rafReq = requestAnimationFrame((now) => {
      rafReq = 0;
      if (!W || play.anim) return;
      if (play.phase === "cut") {
        drawFolded(); drawStroke();
        if (drawFalling(now)) render();
      } else if (play.phase === "open" || play.phase === "idle") {
        drawStageStatic(0);
      }
    });
  }

  // --- アニメーション ---
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function animate(ms, frame) {
    const tok = play.token;
    return new Promise((res) => {
      const t0 = performance.now();
      play.anim = true;
      const step = (now) => {
        if (tok !== play.token) { play.anim = false; return res(false); }
        const t = Math.min(1, (now - t0) / ms);
        frame(t);
        if (t < 1) requestAnimationFrame(step);
        else { play.anim = false; res(true); }
      };
      requestAnimationFrame(step);
    });
  }
  const wait = (ms) => { const tok = play.token; return new Promise((r) => setTimeout(() => r(tok === play.token), ms)); };

  async function runFold() {
    const F = KG.get(play.fold);
    setPhase("folding");
    play.view = fullView();
    msg("かみを おるよ…");
    drawStageStatic(0);
    if (!(await wait(350))) return;
    for (let k = 0; k < F.steps.length; k++) {
      Snd.fold();
      stageImg(k);
      if (!(await animate(620, (t) => drawFoldFrame(k, Math.cos(Math.PI * ease(t)))))) return;
      if (!(await wait(110))) return;
    }
    const a = play.view, b = cutView(), last = F.steps.length;
    stageImg(last);
    if (!(await animate(480, (t) => { play.view = lerpView(a, b, ease(t)); drawStageStatic(last); }))) return;
    play.view = b;
    setPhase("cut");
  }
  async function runOpen() {
    const F = KG.get(play.fold), n = F.steps.length;
    setPhase("unfolding");
    msg("ひらくよ…");
    const a = play.view, b = fullView();
    stageImg(n);
    if (!(await animate(420, (t) => { play.view = lerpView(a, b, ease(t)); drawStageStatic(n); }))) return;
    play.view = b;
    for (let k = n - 1; k >= 0; k--) {
      stageImg(k);
      Snd.fasa();
      if (!(await animate(420, (t) => drawFoldFrame(k, -Math.cos(Math.PI * ease(t)))))) return;
      if (!(await wait(130))) return;
    }
    setPhase("open");
    if (play.mode === "puzzle") judge();
    else { Snd.dekita(); msg(play.cuts.length ? "できた！ きれいな もよう！" : "まだ きって いないよ"); }
  }
  async function runRefold() {
    const F = KG.get(play.fold);
    setPhase("folding");
    hideResult();
    msg("もういちど おるよ…");
    play.view = fullView();
    for (let k = 0; k < F.steps.length; k++) {
      Snd.fold();
      if (!(await animate(380, (t) => drawFoldFrame(k, Math.cos(Math.PI * ease(t)))))) return;
    }
    const a = play.view, b = cutView(), last = F.steps.length;
    if (!(await animate(380, (t) => { play.view = lerpView(a, b, ease(t)); drawStageStatic(last); }))) return;
    play.view = b;
    setPhase("cut");
  }

  // --- ボタン と メッセージ ---
  const btn = {
    undo: $("#undoBtn"), hint: $("#hintBtn"), open: $("#openBtn"), save: $("#saveBtn"), more: $("#moreBtn"),
    fix: $("#fixBtn"), reset: $("#resetBtn"), next: $("#nextBtn"), newp: $("#newBtn"),
  };
  function msg(t) { $("#msg").textContent = t; }
  function setPhase(ph) {
    play.phase = ph;
    const pz = play.mode === "puzzle", cut = ph === "cut", open = ph === "open", busy = ph === "folding" || ph === "unfolding";
    btn.undo.hidden = !(cut || busy);
    btn.hint.hidden = !(pz && (cut || busy));
    btn.open.hidden = !(cut || busy);
    btn.save.hidden = !(open && !pz);
    btn.more.hidden = !(open && !pz);
    btn.newp.hidden = !(open && !pz);
    btn.fix.hidden = !(open && pz);
    btn.reset.hidden = !(open && pz);
    btn.next.hidden = !(open && pz && play.result && play.result.ok && nextPuzzle());
    btn.undo.disabled = busy || !play.cuts.length;
    btn.open.disabled = busy;
    btn.hint.disabled = busy;
    btn.save.disabled = false;
    btn.save.querySelector("small").textContent = "のこす";
    if (cut) msg(play.cuts.length ? "ひらく？ それとも もっと きる？" : pz ? "おてほんと おなじに なるように きろう" : "ゆびで なぞって きろう（てんてん は おりめ）");
    render();
  }
  btn.undo.addEventListener("click", () => {
    if (play.phase !== "cut" || !play.cuts.length) return;
    play.cuts.pop(); Snd.undo(); setPhase("cut");
  });
  btn.hint.addEventListener("click", () => {
    play.hint = !play.hint; btn.hint.setAttribute("aria-pressed", String(play.hint)); Snd.pop(); render();
  });
  btn.open.addEventListener("click", () => { if (play.phase === "cut") runOpen(); });
  btn.more.addEventListener("click", () => { Snd.pop(); runRefold(); });
  btn.fix.addEventListener("click", () => { Snd.pop(); runRefold(); });
  btn.reset.addEventListener("click", () => { Snd.pop(); play.cuts = []; runRefold(); });
  btn.newp.addEventListener("click", () => { Snd.pop(); stopPlay(); show("setup"); });
  btn.next.addEventListener("click", () => { const p = nextPuzzle(); if (p) { Snd.pop(); startPuzzle(p); } });
  btn.save.addEventListener("click", () => {
    if (btn.save.disabled) return;
    const list = loadGallery();
    list.unshift({ fold: play.fold, color: play.color, cuts: KG.packCuts(play.cuts), t: Date.now() });
    while (list.length > 20) list.pop();
    if (LS.set(KEY.gallery, list)) { Snd.dekita(); msg("ギャラリーに のこしたよ！"); btn.save.disabled = true; btn.save.querySelector("small").textContent = "のこした"; }
    else msg("ほぞん できなかった…");
  });

  // --- ゆびで なぞる ---
  cv.addEventListener("pointerdown", (e) => {
    if (play.phase !== "cut" || play.stroke) return;
    cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect(), sp = [e.clientX - r.left, e.clientY - r.top];
    play.stroke = { id: e.pointerId, screen: [sp], world: [toWorld(sp[0], sp[1])], run: 0 };
    render();
  });
  cv.addEventListener("pointermove", (e) => {
    const st = play.stroke;
    if (!st || e.pointerId !== st.id) return;
    const r = cv.getBoundingClientRect();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const sp = [ev.clientX - r.left, ev.clientY - r.top], last = st.screen[st.screen.length - 1];
      const d = Math.hypot(sp[0] - last[0], sp[1] - last[1]);
      if (d < 3) continue;
      st.screen.push(sp); st.world.push(toWorld(sp[0], sp[1]));
      st.run += d;
      if (st.run > 90) { st.run = 0; Snd.snip(); }
    }
    render();
  });
  const endStroke = (e) => {
    const st = play.stroke;
    if (!st || e.pointerId !== st.id) return;
    play.stroke = null;
    const sc = play.view.sc, F = KG.get(play.fold);
    const cut = KG.makeCut(play.fold, st.world, { edgeTol: Math.max(24 / sc, 0.02 * F.L), closeTol: Math.max(46 / sc, 0.05 * F.L) });
    if (cut) {
      play.cuts.push(cut);
      Snd.snip();
      dropPiece(cut);
      setPhase("cut");
    } else render();
  };
  cv.addEventListener("pointerup", endStroke);
  cv.addEventListener("pointercancel", endStroke);

  // きった かけら が ひらひら おちる
  function dropPiece(cut) {
    const F = KG.get(play.fold), pc = KG.prep([cut])[0], r = cut.w;
    const bb = [Math.max(pc.bb[0] - r, F.bbox[0]), Math.max(pc.bb[1] - r, F.bbox[1]), Math.min(pc.bb[2] + r, F.bbox[2]), Math.min(pc.bb[3] + r, F.bbox[3])];
    if (bb[0] >= bb[2] || bb[1] >= bb[3]) return;
    const cs = [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]].map(toScreen);
    const x = Math.floor(Math.min(...cs.map((p) => p[0]))) - 2, y = Math.floor(Math.min(...cs.map((p) => p[1]))) - 2;
    const w = Math.ceil(Math.max(...cs.map((p) => p[0]))) + 2 - x, h = Math.ceil(Math.max(...cs.map((p) => p[1]))) + 2 - y;
    if (w < 2 || h < 2) return;
    const img = document.createElement("canvas");
    img.width = Math.ceil(w * DPR); img.height = Math.ceil(h * DPR);
    const c = img.getContext("2d");
    setView(c, play.view, x, y);
    tracePoly(c, F.domain); c.clip();
    c.fillStyle = play.color; c.strokeStyle = play.color; c.lineCap = "round"; c.lineJoin = "round";
    if (cut.p) { tracePoly(c, cut.p); c.fill(); }
    c.lineWidth = cut.w; traceLine(c, cut.l); c.stroke();
    eraseCuts(c, play.cuts.slice(0, -1));
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(0, 0, img.width, img.height);
    play.falling.push({ img, x, y, cx: x + w / 2, cy: y + h / 2, t0: performance.now(), dir: Math.random() < 0.5 ? -1 : 1 });
  }

  // --- はじめる / おわる ---
  function stopPlay() { play.token++; play.anim = false; play.stroke = null; play.falling = []; play.phase = "idle"; hideResult(); }
  function begin() {
    play.token++;
    play.stroke = null; play.falling = []; play.result = null; play.stagesKey = "";
    hideResult();
    show("play");
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    resize();
    runFold();
  }
  function startFree(fid) {
    Object.assign(play, { mode: "free", fold: fid, color: COLORS[colorIdx].hex, cuts: [], puzzle: null, hint: false });
    $("#title").textContent = `✂️ ${KG.get(fid).name}`;
    $("#model").hidden = true;
    begin();
  }
  function startPuzzle(p) {
    Object.assign(play, { mode: "puzzle", fold: p.fold, color: p.color, cuts: [], puzzle: p, hint: false });
    btn.hint.setAttribute("aria-pressed", "false");
    $("#title").textContent = `${KP.LIST.indexOf(p) + 1}. ${p.name}`;
    $("#model").hidden = false;
    begin();
  }

  // ============================================================
  // もんだい
  // ============================================================
  function nextPuzzle() {
    if (!play.puzzle) return null;
    return KP.LIST[KP.LIST.indexOf(play.puzzle) + 1] || null;
  }
  function hideResult() { $("#result").hidden = true; }
  function judge() {
    const p = play.puzzle;
    const s = KG.iou(p.fold, play.cuts, p.cuts, 180);
    const pct = Math.floor(s * 100), ok = s >= KP.CLEAR;
    play.result = { ok, s };
    const prog = LS.get(KEY.puzzles, {}) || {};
    if (!(prog[p.id] >= s)) { prog[p.id] = Math.round(s * 1000) / 1000; LS.set(KEY.puzzles, prog); }
    const res = $("#result");
    res.style.setProperty("--rc", ok ? "var(--ok)" : "var(--accent)");
    $("#resultBig").textContent = ok ? "🎉 できた！" : "おしい！";
    $("#resultSub").textContent = ok ? `にてる ど ${pct}%` : `にてる ど ${pct}%（85% で クリア）`;
    res.hidden = false;
    msg("");
    if (ok) Snd.dekita(); else Snd.oshii();
    setPhase("open");
    if (!ok) msg(p.tip ? `ヒント: ${p.tip}` : "");
  }
  function renderPuzzleList() {
    const grid = $("#puzzleGrid"), prog = LS.get(KEY.puzzles, {}) || {};
    grid.innerHTML = "";
    KP.LIST.forEach((p, i) => {
      const b = document.createElement("button");
      const best = prog[p.id] || 0;
      b.type = "button"; b.className = "pz" + (best >= KP.CLEAR ? " clear" : "");
      b.innerHTML = `<span class="no">${i + 1}</span><canvas></canvas><b>${p.emoji} ${p.name}</b><small>${KG.get(p.fold).name}${best ? ` ・ ${Math.floor(best * 100)}%` : ""}</small>`;
      b.addEventListener("click", () => { Snd.pop(); startPuzzle(p); });
      grid.appendChild(b);
      drawThumb(b.querySelector("canvas"), p.fold, p.color, p.cuts, 104);
    });
  }

  // ============================================================
  // ギャラリー
  // ============================================================
  function loadGallery() {
    const raw = LS.get(KEY.gallery, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((g) => g && KG.DEFS[g.fold] && /^#[0-9a-f]{6}$/i.test(g.color) && Array.isArray(g.cuts));
  }
  function renderGallery() {
    const grid = $("#galleryGrid"), list = loadGallery();
    grid.innerHTML = "";
    $("#galleryLead").textContent = `つくった もよう ${list.length} / 20`;
    if (!list.length) { grid.innerHTML = `<p class="empty">まだ ないよ。「じゆうに きる」で つくって 💾 のこす を おしてね</p>`; return; }
    list.forEach((g, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "gal";
      b.innerHTML = `<canvas></canvas><small>${KG.get(g.fold).name}</small>`;
      b.addEventListener("click", () => { Snd.pop(); openViewer(i); });
      grid.appendChild(b);
      drawThumb(b.querySelector("canvas"), g.fold, g.color, KG.unpackCuts(g.cuts), 120);
    });
  }
  let viewerIdx = -1;
  const delBtn = $("#viewerDel");
  function openViewer(i) {
    const g = loadGallery()[i];
    if (!g) return;
    viewerIdx = i;
    delBtn.classList.remove("armed"); delBtn.querySelector("small").textContent = "けす";
    $("#viewer").hidden = false;
    const size = $("#viewerCv").getBoundingClientRect().width || 400;
    drawThumb($("#viewerCv"), g.fold, g.color, KG.unpackCuts(g.cuts), size);
    $("#viewerInfo").textContent = `${KG.get(g.fold).name} ・ きった かず ${g.cuts.length}`;
  }
  $("#viewerClose").addEventListener("click", () => { Snd.pop(); $("#viewer").hidden = true; });
  $("#viewer").addEventListener("click", (e) => { if (e.target.id === "viewer") $("#viewer").hidden = true; });
  delBtn.addEventListener("click", () => {
    if (!delBtn.classList.contains("armed")) { delBtn.classList.add("armed"); delBtn.querySelector("small").textContent = "ほんとに けす？"; Snd.pop(); return; }
    const list = loadGallery();
    list.splice(viewerIdx, 1);
    LS.set(KEY.gallery, list);
    Snd.undo();
    $("#viewer").hidden = true;
    renderGallery();
  });

  // テスト よう の のぞきまど
  window.__kirigami = { play, toScreen, toWorld, KG, KP };

  show("menu");
})();
