// エアホッケー — え（Canvas）。テーブルの ざひょう（W × L）で かいて、がめんに あわせて まわす
//   たてもち … そのまま（あお が した）、よこもち … 90ど まわす（あお が ひだり）
(function (root) {
  "use strict";
  const P = root.AHPhys;
  const { W, L, PR } = P;
  const RIM = 0.05;
  const COL = ["#1c7ed6", "#e03131"];
  const COL_L = ["#74c0fc", "#ffa8a8"];
  const NAME_COL = ["あお", "あか"];

  const THEMES = {
    normal: { name: "ふつう", em: "🏒", surface: "#3d8bfd", surface2: "#2f6fd6", line: "rgba(255,255,255,.85)", center: "#ff6b6b", rim: "#1b2a4a", rimHi: "#3b4f7a", puck: "#212529", puckHi: "#495057", trail: "255,255,255", text: "#fff", bg: "#0e1a33" },
    ice: { name: "こおり", em: "🧊", surface: "#e3f6ff", surface2: "#b9e5fb", line: "rgba(40,120,190,.6)", center: "#4dabf7", rim: "#5c8fb5", rimHi: "#a5d8ff", puck: "#1864ab", puckHi: "#4dabf7", trail: "24,100,171", text: "#0b3a63", bg: "#cfeaf9" },
    neon: { name: "ネオン", em: "✨", surface: "#0b0820", surface2: "#140f35", line: "rgba(255,90,230,.9)", center: "#3bf0ff", rim: "#05030f", rimHi: "#7b2ff7", puck: "#f8f9fa", puckHi: "#ffffff", trail: "120,255,250", text: "#fff", bg: "#05030f", glow: true },
    train: { name: "でんしゃ", em: "🚃", surface: "#a89c8c", surface2: "#8c8172", line: "rgba(255,255,255,.75)", center: "#ffd43b", rim: "#2b8a3e", rimHi: "#69db7c", puck: "#343a40", puckHi: "#868e96", trail: "255,244,200", text: "#fff", bg: "#1f5130" },
  };

  let cv, ctx, bg, bgCtx, dpr = 1, cw = 0, ch = 0;
  let theme = THEMES.normal, themeKey = "normal";
  const lay = { landscape: false, s: 1, ox: 0, oy: 0 };
  const fx = { rings: [], confetti: [], goals: [], banners: [], sinks: [], shake: 0, trails: new Map(), pops: [] };
  let shakeOn = true;

  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); bg = document.createElement("canvas"); bgCtx = bg.getContext("2d"); resize(); }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(3, window.devicePixelRatio || 1);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    bg.width = cv.width; bg.height = cv.height;
    lay.landscape = cw > ch * 1.05;
    const tw = W + RIM * 2, tl = L + RIM * 2, m = 6;
    const [sw, sh] = lay.landscape ? [tl, tw] : [tw, tl];
    lay.s = Math.min((cw - m * 2) / sw, (ch - m * 2) / sh);
    const pw = sw * lay.s, ph = sh * lay.s;
    // テーブルの ひだりうえ（RIM の そと）
    lay.ox = (cw - pw) / 2 + RIM * lay.s; lay.oy = (ch - ph) / 2 + RIM * lay.s;
    buildBg();
    return lay;
  }
  // テーブル ざひょう → がめん（CSS px）
  function setT(c, ox, oy) {
    const s = lay.s * dpr, x0 = (lay.ox + (ox || 0)) * dpr, y0 = (lay.oy + (oy || 0)) * dpr;
    if (lay.landscape) c.setTransform(0, s, -s, 0, x0 + L * s, y0);
    else c.setTransform(s, 0, 0, s, x0, y0);
  }
  function toScreen(x, y) {
    return lay.landscape ? { x: lay.ox + (L - y) * lay.s, y: lay.oy + x * lay.s } : { x: lay.ox + x * lay.s, y: lay.oy + y * lay.s };
  }
  function toTable(sx, sy) {
    const u = (sx - lay.ox) / lay.s, v = (sy - lay.oy) / lay.s;
    return lay.landscape ? { x: v, y: L - u } : { x: u, y: v };
  }
  function setTheme(k) { themeKey = THEMES[k] ? k : "normal"; theme = THEMES[themeKey]; buildBg(); }

  // ===== テーブル（うごかない ところ）=====
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function buildBg() {
    if (!bgCtx) return;
    const c = bgCtx, t = theme;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = t.bg; c.fillRect(0, 0, bg.width, bg.height);
    setT(c);
    // わく
    c.fillStyle = t.rim; rr(c, -RIM, -RIM, W + RIM * 2, L + RIM * 2, RIM * 1.2); c.fill();
    c.strokeStyle = t.rimHi; c.lineWidth = 0.008; rr(c, -RIM + 0.006, -RIM + 0.006, W + RIM * 2 - 0.012, L + RIM * 2 - 0.012, RIM); c.stroke();
    // めん
    c.save(); rr(c, 0, 0, W, L, 0.03); c.clip();
    const g = c.createLinearGradient(0, 0, W, L); g.addColorStop(0, t.surface); g.addColorStop(1, t.surface2);
    c.fillStyle = g; c.fillRect(0, 0, W, L);
    const rnd = P.rng(7);
    if (themeKey === "normal") {
      c.fillStyle = "rgba(255,255,255,.13)";
      for (let y = 0.04; y < L; y += 0.06) for (let x = 0.04; x < W; x += 0.06) { c.beginPath(); c.arc(x, y, 0.005, 0, 7); c.fill(); }
    } else if (themeKey === "ice") {
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 0.004;
      for (let i = 0; i < 26; i++) {
        let x = rnd() * W, y = rnd() * L; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 0.18; y += (rnd() - 0.5) * 0.18; c.lineTo(x, y); }
        c.stroke();
      }
      c.fillStyle = "#fff"; c.globalAlpha = 0.45;
      for (let i = 0; i < 14; i++) {
        // ゆきの けっしょう（6ほんの せん）
        const x = rnd() * W, y = rnd() * L, r = 0.02 + rnd() * 0.02;
        c.strokeStyle = "#fff"; c.lineWidth = 0.004; c.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.stroke();
      }
      c.globalAlpha = 1;
    } else if (themeKey === "neon") {
      c.strokeStyle = "rgba(123,47,247,.28)"; c.lineWidth = 0.003;
      for (let x = 0; x <= W; x += 0.1) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, L); c.stroke(); }
      for (let y = 0; y <= L; y += 0.1) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    } else if (themeKey === "train") {
      // じゃり
      for (let i = 0; i < 1400; i++) { c.fillStyle = rnd() < 0.5 ? "rgba(60,50,40,.25)" : "rgba(255,255,255,.18)"; c.fillRect(rnd() * W, rnd() * L, 0.008, 0.008); }
      // せんろ 2ほん（まくらぎ ＋ レール）
      for (const cx of [W * 0.28, W * 0.72]) {
        c.fillStyle = "#6b4f3a";
        for (let y = 0.02; y < L; y += 0.07) { c.fillRect(cx - 0.12, y, 0.24, 0.032); }
        c.fillStyle = "#ced4da"; c.strokeStyle = "#868e96"; c.lineWidth = 0.003;
        for (const rx of [cx - 0.075, cx + 0.075]) { c.fillRect(rx - 0.008, 0, 0.016, L); c.strokeRect(rx - 0.008, 0, 0.016, L); }
      }
    }
    // せん
    c.save();
    if (t.glow) { c.shadowColor = t.line; c.shadowBlur = 14 * dpr; }
    c.strokeStyle = t.line; c.lineWidth = 0.008;
    c.beginPath(); c.arc(W / 2, L / 2, 0.16, 0, Math.PI * 2); c.stroke();
    for (const side of [0, 1]) {
      const y = side === 0 ? L : 0;
      c.strokeStyle = side === 0 ? COL_L[0] : COL_L[1];
      c.beginPath(); c.arc(W / 2, y, 0.24, side === 0 ? Math.PI : 0, side === 0 ? 2 * Math.PI : Math.PI); c.stroke();
      c.strokeStyle = t.line; c.globalAlpha = 0.5;
      const yy = side === 0 ? L * 0.75 : L * 0.25;
      c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); c.globalAlpha = 1;
    }
    if (themeKey === "train") {
      // まんなか は ふみきり もよう
      const n = 12;
      for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? "#212529" : "#ffd43b"; c.fillRect(i * W / n, L / 2 - 0.012, W / n, 0.024); }
    } else {
      c.strokeStyle = t.center; c.lineWidth = 0.012;
      c.beginPath(); c.moveTo(0, L / 2); c.lineTo(W, L / 2); c.stroke();
    }
    c.fillStyle = t.center; c.beginPath(); c.arc(W / 2, L / 2, 0.018, 0, 7); c.fill();
    c.restore();
    c.restore();
  }

  // ===== えんしゅつ =====
  function ring(x, y, power, side) {
    const p = Math.min(1, power / 4);
    fx.rings.push({ x, y, t: 0, life: 0.28 + p * 0.2, max: 0.06 + p * 0.16, col: side === 0 || side === 1 ? COL_L[side] : "#fff", w: 0.006 + p * 0.01 });
    if (p > 0.55) shake(2 + p * 3);
  }
  function confetti(side) {
    const cols = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#da77f2", "#ffa94d", "#ffffff"];
    const cy = side === 0 ? L * 0.78 : L * 0.22;
    for (let i = 0; i < 110; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.4 + Math.random() * 1.3;
      fx.confetti.push({ x: W / 2 + (Math.random() - 0.5) * 0.3, y: cy + (Math.random() - 0.5) * 0.1, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, c: cols[i % cols.length], t: 0, life: 1.6 + Math.random() * 0.9, w: 0.014 + Math.random() * 0.012, h: 0.008 + Math.random() * 0.008 });
    }
  }
  function goal(scorer, x) {
    fx.goals.push({ scorer, t: 0, life: 1.7 });
    fx.sinks.push({ x, y: scorer === 0 ? 0 : L, t: 0 });
    confetti(scorer);
    shake(9);
  }
  function banner(text, side, life) { fx.banners.push({ text, side, t: 0, life: life || 1.8 }); }
  function pop(x, y) { fx.pops.push({ x, y, t: 0 }); }
  function shake(a) { if (shakeOn) fx.shake = Math.max(fx.shake, a); }
  function setShake(on) { shakeOn = !!on; if (!on) fx.shake = 0; }
  function clearFx() { fx.rings.length = 0; fx.confetti.length = 0; fx.goals.length = 0; fx.banners.length = 0; fx.sinks.length = 0; fx.pops.length = 0; fx.trails.clear(); fx.shake = 0; }

  function stepFx(dt) {
    for (const k of ["rings", "goals", "banners", "sinks", "pops"]) {
      const a = fx[k];
      for (let i = a.length - 1; i >= 0; i--) { a[i].t += dt; if (a[i].t > (a[i].life || 0.5)) a.splice(i, 1); }
    }
    for (let i = fx.confetti.length - 1; i >= 0; i--) {
      const q = fx.confetti[i];
      q.t += dt; const k = Math.exp(-2.2 * dt);
      q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt;
      if (q.t > q.life) fx.confetti.splice(i, 1);
    }
    fx.shake *= Math.exp(-9 * dt); if (fx.shake < 0.3) fx.shake = 0;
  }

  // ===== まいフレーム =====
  // st: { world, G, mode, labels: [なまえ, なまえ], paused }
  function draw(st, dt) {
    stepFx(dt);
    const c = ctx, w = st.world, t = theme;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    let sx = 0, sy = 0;
    if (fx.shake > 0) { sx = (Math.random() - 0.5) * fx.shake; sy = (Math.random() - 0.5) * fx.shake; }
    c.drawImage(bg, sx * dpr, sy * dpr);
    setT(c, sx, sy);
    // ゴールの あな
    for (const side of [0, 1]) {
      const y = side === 0 ? L : -RIM, gw = w.goalW[side], full = P.GW;
      c.fillStyle = "#05070d"; c.fillRect(W / 2 - gw / 2, y, gw, RIM);
      if (gw < full - 1e-6) {
        // せまく なった ところ（しましま）
        for (const sgn of [-1, 1]) {
          const x0 = sgn < 0 ? W / 2 - full / 2 : W / 2 + gw / 2, ww = (full - gw) / 2;
          c.fillStyle = "#ffd43b"; c.fillRect(x0, side === 0 ? L - 0.012 : 0, ww, 0.012);
          c.fillStyle = "#212529";
          for (let x = x0; x < x0 + ww - 0.001; x += 0.024) c.fillRect(x, side === 0 ? L - 0.012 : 0, 0.012, 0.012);
        }
      }
    }
    // ゴールの ひかり（てんめつ しない。ゆっくり きえる）
    for (const g of fx.goals) {
      const y = g.scorer === 0 ? 0 : L, a = Math.max(0, 1 - g.t / g.life) * 0.5;
      const gr = c.createRadialGradient(W / 2, y, 0, W / 2, y, 0.5);
      gr.addColorStop(0, "rgba(255,230,120," + a + ")"); gr.addColorStop(1, "rgba(255,230,120,0)");
      c.fillStyle = gr; c.fillRect(0, g.scorer === 0 ? 0 : L - 0.5, W, 0.5);
    }
    // まんなかの かべ
    if (w.wall) {
      const h = P.WALL_HALF;
      c.fillStyle = "#c92a2a"; rr(c, P.WALL_A - h, L / 2 - h, P.WALL_B - P.WALL_A + 2 * h, 2 * h, h); c.fill();
      c.strokeStyle = "#ffe3e3"; c.lineWidth = 0.003;
      for (let x = P.WALL_A + 0.03; x < P.WALL_B; x += 0.05) { c.beginPath(); c.moveTo(x, L / 2 - h); c.lineTo(x, L / 2 + h); c.stroke(); }
    }
    if (w.ice) { c.fillStyle = "rgba(200,240,255,.18)"; c.fillRect(0, 0, W, L); }
    drawScores(c, st);
    // アイテム
    if (w.item) {
      const it = w.item, b = 1 + Math.sin(it.t * 4) * 0.06, rr2 = P.ITEM_R * b;
      c.save();
      c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.arc(it.x, it.y, rr2, 0, 7); c.fill();
      c.strokeStyle = "#fab005"; c.lineWidth = 0.008; c.setLineDash([0.02, 0.014]); c.lineDashOffset = -it.t * 0.05;
      c.beginPath(); c.arc(it.x, it.y, rr2 + 0.01, 0, 7); c.stroke(); c.setLineDash([]);
      emojiAt(c, it.em, it.x, it.y, rr2 * 1.25, it.y < L / 2 ? Math.PI : 0);
      c.restore();
    }
    // パックの すいこまれ（ゴール）
    for (const s of fx.sinks) {
      const k = Math.max(0, 1 - s.t / 0.35);
      c.fillStyle = t.puck; c.globalAlpha = k; c.beginPath(); c.arc(s.x, s.y, PR * k, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    // ざんぞう
    const alive = new Set();
    for (const p of w.pucks) {
      alive.add(p.id);
      let tr = fx.trails.get(p.id); if (!tr) { tr = []; fx.trails.set(p.id, tr); }
      tr.push({ x: p.x, y: p.y }); if (tr.length > 12) tr.shift();
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 0.6) {
        for (let i = 0; i < tr.length - 1; i++) {
          const k = (i + 1) / tr.length, a = k * Math.min(1, sp / 4) * 0.45;
          c.fillStyle = "rgba(" + t.trail + "," + a.toFixed(3) + ")";
          c.beginPath(); c.arc(tr[i].x, tr[i].y, PR * (0.45 + 0.55 * k), 0, 7); c.fill();
        }
      }
    }
    for (const id of fx.trails.keys()) if (!alive.has(id)) fx.trails.delete(id);
    // パック
    for (const p of w.pucks) drawPuck(c, p);
    for (const q of fx.pops) {
      const k = q.t / 0.5;
      c.strokeStyle = "rgba(255,255,255," + (1 - k) + ")"; c.lineWidth = 0.006;
      c.beginPath(); c.arc(q.x, q.y, PR * (1 + k * 2), 0, 7); c.stroke();
    }
    // マレット
    for (const m of w.mallets) drawMallet(c, m);
    // しょうげき リング
    for (const r of fx.rings) {
      const k = r.t / r.life;
      c.strokeStyle = r.col; c.globalAlpha = 1 - k; c.lineWidth = r.w * (1 - k * 0.6);
      c.beginPath(); c.arc(r.x, r.y, PR + r.max * Math.sqrt(k), 0, 7); c.stroke();
      c.globalAlpha = 1;
    }
    // かみふぶき
    for (const q of fx.confetti) {
      c.save(); c.translate(q.x, q.y); c.rotate(q.r);
      c.globalAlpha = Math.min(1, (q.life - q.t) * 2);
      c.fillStyle = q.c; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.r * 1.3)) + 0.002);
      c.restore();
    }
    c.globalAlpha = 1;
    drawTexts(c, st);
  }

  function drawPuck(c, p) {
    const t = theme;
    c.save();
    if (t.glow) { c.shadowColor = "#3bf0ff"; c.shadowBlur = 18 * dpr; }
    c.fillStyle = t.puck; c.beginPath(); c.arc(p.x, p.y, PR, 0, 7); c.fill();
    c.restore();
    c.strokeStyle = t.puckHi; c.lineWidth = 0.006; c.beginPath(); c.arc(p.x, p.y, PR * 0.7, 0, 7); c.stroke();
    if (p.extra) { c.fillStyle = "#ffd43b"; c.beginPath(); c.arc(p.x, p.y, PR * 0.25, 0, 7); c.fill(); }
  }
  function drawMallet(c, m) {
    const col = COL[m.side], lt = COL_L[m.side];
    c.save();
    if (theme.glow) { c.shadowColor = col; c.shadowBlur = 20 * dpr; }
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(m.x + 0.008, m.y + 0.01, m.r, 0, 7); c.fill();
    const g = c.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
    g.addColorStop(0, lt); g.addColorStop(1, col);
    c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, m.r, 0, 7); c.fill();
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.005; c.beginPath(); c.arc(m.x, m.y, m.r * 0.82, 0, 7); c.stroke();
    // とって
    c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, m.r * 0.42, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(m.x - m.r * 0.12, m.y - m.r * 0.12, m.r * 0.18, 0, 7); c.fill();
  }
  function emojiAt(c, em, x, y, size, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(0.01, 0.01);
    c.font = (size * 100).toFixed(1) + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(em, 0, size * 6);
    c.restore();
  }
  // その ひと から よめる むき に する（がわ 0 は そのまま、がわ 1 は 180ど）
  function face(c, side, x, y) { c.translate(x, y); if (side === 1) c.rotate(Math.PI); }
  // もじは ちいさい ざひょう だと きれいに でない ブラウザが あるので 100ばい の おおきさで かく
  function text(c, s, size, col, outline) {
    c.save(); c.scale(0.01, 0.01);
    const px = size * 100;
    c.font = "900 " + px.toFixed(1) + "px 'Hiragino Maru Gothic ProN','BIZ UDPGothic','Meiryo',system-ui,sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    if (outline) { c.lineJoin = "round"; c.lineWidth = px * 0.1; c.strokeStyle = outline; c.strokeText(s, 0, 0); }
    c.fillStyle = col; c.fillText(s, 0, 0);
    c.restore();
  }
  // とくてん: それぞれの じんち の まんなか よりに、その ひと むきで「じぶん ー あいて」
  function drawScores(c, st) {
    const sc = st.G ? st.G.match.score : [0, 0];
    const fxs = st.G ? st.G.fx : null;
    for (const side of [0, 1]) {
      c.save();
      face(c, side, W / 2, side === 0 ? L / 2 + 0.2 : L / 2 - 0.2);
      c.globalAlpha = 0.7;
      c.save(); c.translate(-0.1, 0); text(c, String(sc[side]), 0.13, COL_L[side], "rgba(0,0,0,.35)"); c.restore();
      c.save(); text(c, "-", 0.08, theme.text, null); c.restore();
      c.save(); c.translate(0.1, 0); text(c, String(sc[1 - side]), 0.13, COL_L[1 - side], "rgba(0,0,0,.35)"); c.restore();
      c.globalAlpha = 0.8;
      c.save(); c.translate(0, 0.1); text(c, (st.labels ? st.labels[side] : "") + "  " + (st.G ? st.G.match.target + "てんで かち" : ""), 0.032, theme.text, "rgba(0,0,0,.3)"); c.restore();
      // こうか の のこり じかん
      if (fxs) {
        const list = [];
        if (fxs.big[side] > 0) list.push("🍄" + Math.ceil(fxs.big[side]));
        if (fxs.narrow[side] > 0) list.push("🥅" + Math.ceil(fxs.narrow[side]));
        if (fxs.ice > 0) list.push("🧊" + Math.ceil(fxs.ice));
        if (fxs.wall > 0) list.push("🧱" + Math.ceil(fxs.wall));
        if (fxs.multi > 0 && st.world.pucks.length > 1) list.push("🎱" + Math.ceil(fxs.multi));
        if (list.length) { c.save(); c.translate(0, 0.16); c.globalAlpha = 0.95; text(c, list.join("  "), 0.04, theme.text, "rgba(0,0,0,.4)"); c.restore(); }
      }
      c.restore();
    }
  }
  function drawTexts(c, st) {
    // ゴール！（りょうがわ に。それぞれ の ひと から よめる むき）
    for (const g of fx.goals) {
      const k = Math.min(1, g.t / 0.18), out = Math.max(0, (g.t - (g.life - 0.3)) / 0.3);
      for (const side of [0, 1]) {
        c.save();
        face(c, side, W / 2, side === 0 ? L * 0.7 : L * 0.3);
        c.globalAlpha = 1 - out;
        const sz = 0.17 * (0.6 + 0.4 * easeBack(k));
        text(c, "ゴール！", sz, g.scorer === side ? "#ffd43b" : "#ffffff", COL[g.scorer]);
        c.translate(0, 0.13);
        const sub = g.scorer === side ? "やったね！" : "どんまい！";
        text(c, sub, 0.05, "#fff", "rgba(0,0,0,.5)");
        c.restore();
      }
    }
    for (const b of fx.banners) {
      const a = Math.min(1, b.t / 0.15, (b.life - b.t) / 0.3);
      for (const side of [0, 1]) {
        if (b.side !== undefined && b.side !== null && b.side !== side) continue;
        c.save(); face(c, side, W / 2, side === 0 ? L * 0.62 : L * 0.38); c.globalAlpha = Math.max(0, a);
        text(c, b.text, 0.06, "#fff", "rgba(20,20,40,.75)");
        c.restore();
      }
    }
    if (st.big) {
      for (const side of [0, 1]) {
        c.save(); face(c, side, W / 2, side === 0 ? L * 0.66 : L * 0.34);
        text(c, st.big, 0.11, "#fff", "rgba(20,20,40,.8)");
        c.restore();
      }
    }
  }
  function easeBack(k) { const s = 1.7; k -= 1; return k * k * ((s + 1) * k + s) + 1; }

  // ボタンを おく ばしょ（テーブルの そと に よゆうが あれば そと。その ひと の みぎて がわ）
  function cornerFor(side, size) {
    const s = lay.s, mOut = size / s;
    const marginEnd = (lay.landscape ? (cw - (L + RIM * 2) * s) : (ch - (L + RIM * 2) * s)) / 2;
    const marginSide = (lay.landscape ? (ch - (W + RIM * 2) * s) : (cw - (W + RIM * 2) * s)) / 2;
    let x, y;
    if (marginEnd >= size + 4) { x = side === 0 ? W - 0.02 - mOut / 2 : 0.02 + mOut / 2; y = side === 0 ? L + RIM + (marginEnd - 2) / s / 2 : -RIM - (marginEnd - 2) / s / 2; }
    else if (marginSide >= size + 4) { const o = RIM + marginSide / s / 2; x = side === 0 ? W + o : -o; y = side === 0 ? L - 0.12 - mOut / 2 : 0.12 + mOut / 2; }
    else { x = side === 0 ? W - mOut / 2 - 0.005 : mOut / 2 + 0.005; y = side === 0 ? L / 2 + 0.08 + mOut / 2 : L / 2 - 0.08 - mOut / 2; }
    return toScreen(x, y);
  }
  // HTML の ようそ を その ひと むき に まわす かくど（ど）
  function angleFor(side) {
    if (lay.landscape) return side === 0 ? 90 : -90;
    return side === 0 ? 0 : 180;
  }

  root.AHRender = {
    THEMES, COL, COL_L, NAME_COL, init, resize, draw, toTable, toScreen, setTheme, setShake,
    ring, goal, banner, pop, shake, clearFx, cornerFor, angleFor, lay, get size() { return { w: cw, h: ch }; },
  };
})(this);
