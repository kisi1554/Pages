// PK たいけつ — Canvas の えがき（スタジアム・ゴール・ネット・せんしゅ・ボール・かみふぶき）
// ブラウザ では window.PKRender。ざひょうは physics.js と おなじ（めーとる）。
// カメラは 2つ:
//   kicker … キッカーの うしろ から ゴールを みる（+z を みる）
//   keeper … キーパーの うしろ（ゴールの おく）から キッカーを みる（-z を みる。みぎ ひだり が ぎゃく に なる）
(function (root) {
  "use strict";
  const P = root.PKPhys;
  let cv = null, ctx = null, W = 0, H = 0, DPR = 1;
  let cam = null;
  const TAU = Math.PI * 2;

  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); resize(); }
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  const size = () => ({ W, H });

  // ===== カメラ =====
  // top / bot … みせたい ところの うえ・した（cy から の ずれ ÷ f）、hw … みせたい よこはば の はんぶん（÷ f）
  function makeCam(kind) {
    let c;
    if (kind === "keeper") c = { kind, px: 0, py: 6.5, pz: 30, dir: -1, top: -0.1, bot: 0.355, hw: 0.212 };
    else c = { kind, px: 0, py: 2.6, pz: -6.5, dir: 1, top: -0.1, bot: 0.53, hw: 0.235 };
    const mt = 0.04, mb = kind === "keeper" ? 0.03 : 0.0;
    const fH = (H * (1 - mt - mb)) / (c.bot - c.top);
    const fW = (W * 0.47) / c.hw;
    c.f = Math.min(fH, fW);
    c.cx = W / 2;
    c.cy = H * (1 - mb) - c.bot * c.f;
    return c;
  }
  function setCam(kind) { cam = makeCam(kind); return cam; }
  const depth = (z) => (cam.dir > 0 ? z - cam.pz : cam.pz - z);
  function proj(x, y, z) {
    const d = Math.max(0.05, depth(z));
    const s = cam.f / d;
    return { x: cam.cx + cam.dir * (x - cam.px) * s, y: cam.cy - (y - cam.py) * s, s, d };
  }
  // がめんの てん → ゴールの めん（z = 11）の x・y
  function unprojectGoal(sx, sy) {
    const d = depth(P.GOAL_Z);
    return { x: cam.px + (sx - cam.cx) / (cam.f / d) * cam.dir, y: cam.py - (sy - cam.cy) / (cam.f / d) };
  }
  function goalRect() {
    const a = proj(-P.HALF_W, P.BAR_H, P.GOAL_Z), b = proj(P.HALF_W, 0, P.GOAL_Z);
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: a.y, y1: b.y };
  }
  // せんぶん（カメラの うしろ は きる）
  function line3(a, b, near) {
    const n = near || 0.6;
    let da = depth(a[2]), db = depth(b[2]);
    if (da < n && db < n) return null;
    if (da < n) { const t = (n - da) / (db - da); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    if (db < n) { const t = (n - db) / (da - db); b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t]; }
    return [proj(a[0], a[1], a[2]), proj(b[0], b[1], b[2])];
  }
  function strokeLine3(a, b, near) {
    const l = line3(a, b, near); if (!l) return;
    ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke();
  }
  function poly3(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = proj(p[0], p[1], p[2]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    ctx.closePath();
  }

  // ===== きほん =====
  function clear() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
  }
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function disc(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU); ctx.fill(); }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
  }
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };

  // ===== スタジアム =====
  // かんきゃく（いつも おなじ ならび）
  const CROWD = [];
  (function () {
    const r = P.rng(77);
    const cols = ["#ff6b6b", "#ffd43b", "#74c0fc", "#ffffff", "#b197fc", "#63e6be", "#ffa94d", "#f783ac", "#495057"];
    for (let i = 0; i < 420; i++) CROWD.push({ u: r(), v: r(), c: cols[Math.floor(r() * cols.length)], p: r() * TAU });
  })();
  function drawStadium(st) {
    const t = st.time || 0;
    // そら
    const hz = cam.cy;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, "#4dabf7"); sky.addColorStop(1, "#d0ebff");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
    // かんきゃくせき（ゴールの むこう / キッカーの むこう の かべ）
    const wz = cam.dir > 0 ? 34 : -26;
    const top = proj(0, 11, wz).y, bot = proj(0, 0.9, wz).y;
    const st0 = proj(0, 1.6, wz).y;
    ctx.fillStyle = "#343a40"; ctx.fillRect(0, top - 6, W, bot - top + 6);
    // やね
    ctx.fillStyle = "#212529"; ctx.fillRect(0, top - 14, W, 10);
    // ライト
    for (const lx of [0.12, 0.88]) {
      const x = W * lx, y = top - 26;
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(x - 2, y, 4, 18);
      rr(x - 16, y - 12, 32, 14, 3); ctx.fillStyle = "#f1f3f5"; ctx.fill();
      for (let i = 0; i < 4; i++) disc(x - 11 + i * 7.3, y - 5, 2.4, "#fff9db");
    }
    // ひとびと（かんせいの ときは ぴょんぴょん）
    const jump = st.cheer ? Math.max(0, st.cheer) : 0;
    const cw = Math.max(2, (bot - top) / 26);
    for (const p of CROWD) {
      const x = p.u * W, y = top + 4 + p.v * (st0 - top - 8);
      const j = jump ? Math.abs(Math.sin(t * 9 + p.p)) * cw * 1.6 * jump : 0;
      disc(x, y - j, cw, p.c);
      disc(x, y - j - cw * 1.2, cw * 0.65, "#ffe3c4");
    }
    // かんばん（チームの いろ）
    const by0 = st0, by1 = bot;
    const n = 8, cols = st.boardColors || ["#099268", "#ffffff"];
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(i * W / n, by0, W / n + 1, by1 - by0);
    }
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, by1 - 2, W, 2);
    // しばふ
    const g = ctx.createLinearGradient(0, bot, 0, H);
    g.addColorStop(0, "#2f9e44"); g.addColorStop(1, "#37b24d");
    ctx.fillStyle = g; ctx.fillRect(0, bot, W, H - bot);
    // かりこみの しま
    ctx.fillStyle = "rgba(255,255,255,.07)";
    for (let z = -30; z < 40; z += 4) {
      const a = [[-40, 0, z], [40, 0, z], [40, 0, z + 2], [-40, 0, z + 2]];
      if (depth(z) < 0.6 && depth(z + 2) < 0.6) continue;
      const pts = a.map((q) => [q[0], q[1], cam.dir > 0 ? Math.max(q[2], cam.pz + 0.6) : Math.min(q[2], cam.pz - 0.6)]);
      poly3(pts); ctx.fill();
    }
    // ライン
    ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = Math.max(1.5, cam.f / 400); ctx.lineCap = "round";
    const L = (a, b) => strokeLine3(a, b);
    const GZ = P.GOAL_Z;
    L([-30, 0, GZ], [30, 0, GZ]);                                   // ゴールライン
    L([-9.16, 0, GZ], [-9.16, 0, GZ - 5.5]); L([9.16, 0, GZ], [9.16, 0, GZ - 5.5]); L([-9.16, 0, GZ - 5.5], [9.16, 0, GZ - 5.5]); // ゴールエリア
    L([-20.16, 0, GZ], [-20.16, 0, GZ - 16.5]); L([20.16, 0, GZ], [20.16, 0, GZ - 16.5]); L([-20.16, 0, GZ - 16.5], [20.16, 0, GZ - 16.5]); // ペナルティエリア
    // ペナルティアーク
    const arc = [];
    for (let a = -0.93; a <= 0.93; a += 0.06) arc.push([Math.sin(a) * 9.15, 0, -Math.cos(a) * 9.15]);
    for (let i = 1; i < arc.length; i++) if (arc[i][2] < GZ - 16.5) L(arc[i - 1], arc[i]);
    // ペナルティマーク
    const pm = proj(0, 0, 0);
    if (pm.d > 0.6) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(pm.x, pm.y, 0.12 * pm.s, 0.05 * pm.s, 0, 0, TAU); ctx.fill(); }
  }

  // ===== ゴール・ネット =====
  // ネットの うしろ: うえは z=GZ+1.0、したは z=GZ+NET_D。ゆれは net = { x, y, t }（はいった ところ と じかん）
  function netPoint(x, y, st) {
    const GZ = P.GOAL_Z;
    let z = GZ + 1.0 + (P.NET_D - 1.0) * (1 - y / P.BAR_H);
    const n = st.net;
    if (n) {
      const age = (st.time || 0) - n.t0;
      if (age >= 0 && age < 2.5) {
        const d2 = (x - n.x) * (x - n.x) + (y - n.y) * (y - n.y);
        const amp = 0.7 * Math.exp(-age * 2.2) * (0.6 + 0.4 * Math.cos(age * 14));
        z += amp * Math.exp(-d2 / 0.8);
      }
    }
    return [x, y, z];
  }
  function drawNet(st) {
    const GZ = P.GOAL_Z, hw = P.HALF_W, bh = P.BAR_H;
    const alpha = cam.kind === "keeper" ? 0.22 : 0.65;
    ctx.save();
    // うしろの かげ
    if (cam.kind === "kicker") {
      ctx.fillStyle = "rgba(0,0,0,.12)";
      poly3([[-hw, 0, GZ], [hw, 0, GZ], netPoint(hw, 0, st), netPoint(-hw, 0, st)]); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.08)";
      poly3([netPoint(-hw, bh, st), netPoint(hw, bh, st), netPoint(hw, 0, st), netPoint(-hw, 0, st)]); ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
    ctx.lineWidth = Math.max(0.6, cam.f / 1400);
    const step = 0.3;
    // うしろの あみ
    for (let x = -hw; x <= hw + 1e-6; x += step) {
      ctx.beginPath();
      for (let y = 0; y <= bh + 1e-6; y += step / 2) { const q = netPoint(x, Math.min(y, bh), st), p = proj(q[0], q[1], q[2]); if (y) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
    for (let y = 0; y <= bh + 1e-6; y += step) {
      ctx.beginPath();
      for (let x = -hw; x <= hw + 1e-6; x += step / 2) { const q = netPoint(Math.min(x, hw), y, st), p = proj(q[0], q[1], q[2]); if (x > -hw) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
    // よこと うえ の あみ
    for (const sx of [-hw, hw]) {
      for (let y = 0; y <= bh + 1e-6; y += step) strokeLine3([sx, y, GZ], netPoint(sx, y, st));
      for (let f = 0; f <= 1.0001; f += 0.25) { const zb = netPoint(sx, 0, st)[2], zt = netPoint(sx, bh, st)[2]; strokeLine3([sx, 0, GZ + (zb - GZ) * f], [sx, bh, GZ + (zt - GZ) * f]); }
    }
    for (let x = -hw; x <= hw + 1e-6; x += step) strokeLine3([x, bh, GZ], netPoint(x, bh, st));
    ctx.restore();
  }
  function drawFrame(st) {
    const GZ = P.GOAL_Z, hw = P.POST_X, bh = P.BAR_Y;
    const a = proj(-hw, 0, GZ), b = proj(hw, 0, GZ), c = proj(-hw, bh, GZ), d = proj(hw, bh, GZ);
    const w = Math.max(2.5, 0.12 * a.s);
    const shake = st.postShake && (st.time - st.postShake.t0) < 0.5 ? Math.sin((st.time - st.postShake.t0) * 80) * 2 * (1 - (st.time - st.postShake.t0) * 2) : 0;
    ctx.save();
    ctx.translate(shake, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = w + 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  }
  // かんたん モードの 9マス
  function drawGrid9(st) {
    const g = goalRect();
    const w = (g.x1 - g.x0) / 3, h = (g.y1 - g.y0) / 3;
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const c = i % 3, r = Math.floor(i / 3);
      const x = g.x0 + c * w, y = g.y0 + r * h;
      const on = st.grid.pick === i;
      ctx.fillStyle = on ? "rgba(255,212,59,.55)" : "rgba(255,255,255," + (0.12 + 0.06 * Math.sin((st.time || 0) * 4 + i)) + ")";
      rr(x + 3, y + 3, w - 6, h - 6, 8); ctx.fill();
      ctx.strokeStyle = on ? "#fff" : "rgba(255,255,255,.7)"; ctx.lineWidth = on ? 3 : 1.5;
      ctx.setLineDash(on ? [] : [6, 5]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ===== せんしゅ =====
  // かお（チームごと）。 hx,hy … がめんの あたまの まんなか、r … はんけい、front … かおが みえるか、look … めせん（がめんの よこ -1〜1）
  function drawHead(hx, hy, r, o) {
    const head = o.head || "bear";
    const skin = o.skin || "#ffd8b5";
    const fur = { bear: "#a0652f", train: skin, dino: "#69db7c", sweets: "#ffe3ec", space: skin, sea: "#74c0fc", bug: skin, robot: "#ced4da" }[head] || skin;
    ctx.lineWidth = Math.max(1, r * 0.1); ctx.strokeStyle = "rgba(0,0,0,.35)";
    // うしろの かざり
    if (head === "bear") { disc(hx - r * 0.72, hy - r * 0.72, r * 0.36, fur); disc(hx + r * 0.72, hy - r * 0.72, r * 0.36, fur); disc(hx - r * 0.72, hy - r * 0.72, r * 0.18, "#e8c69a"); disc(hx + r * 0.72, hy - r * 0.72, r * 0.18, "#e8c69a"); }
    if (head === "dino") for (let i = -1; i <= 1; i++) { ctx.fillStyle = "#2b8a3e"; ctx.beginPath(); ctx.moveTo(hx + i * r * 0.45 - r * 0.2, hy - r * 0.8); ctx.lineTo(hx + i * r * 0.45, hy - r * 1.35); ctx.lineTo(hx + i * r * 0.45 + r * 0.2, hy - r * 0.8); ctx.fill(); }
    if (head === "bug") for (const s of [-1, 1]) { ctx.strokeStyle = "#212529"; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(hx + s * r * 0.3, hy - r * 0.85); ctx.quadraticCurveTo(hx + s * r * 0.5, hy - r * 1.5, hx + s * r * 0.85, hy - r * 1.45); ctx.stroke(); disc(hx + s * r * 0.85, hy - r * 1.45, r * 0.14, "#212529"); }
    if (head === "robot") { ctx.strokeStyle = "#495057"; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(hx, hy - r); ctx.lineTo(hx, hy - r * 1.45); ctx.stroke(); disc(hx, hy - r * 1.5, r * 0.16, "#ff6b6b"); }
    if (head === "sea") { ctx.fillStyle = "#4dabf7"; ctx.beginPath(); ctx.moveTo(hx - r * 0.25, hy - r * 0.8); ctx.quadraticCurveTo(hx + r * 0.1, hy - r * 1.6, hx + r * 0.45, hy - r * 0.75); ctx.fill(); }
    // あたま
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = Math.max(1, r * 0.08);
    if (head === "robot") { rr(hx - r, hy - r * 0.95, r * 2, r * 1.9, r * 0.35); ctx.fillStyle = fur; ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = fur; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill(); ctx.stroke(); }
    // まえの かざり
    if (head === "train") { // しゃしょうさん の ぼうし
      ctx.fillStyle = o.shirt || "#1c7ed6"; ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.55, r * 1.0, r * 0.5, 0, Math.PI, TAU); ctx.fill();
      ctx.fillRect(hx - r * 0.95, hy - r * 0.6, r * 1.9, r * 0.22);
      if (o.front) { ctx.fillStyle = "#212529"; ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.36, r * 0.9, r * 0.2, 0, 0, Math.PI); ctx.fill(); disc(hx, hy - r * 0.75, r * 0.13, "#ffd43b"); }
    }
    if (head === "sweets") { // クリーム と いちご
      ctx.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) disc(hx + i * r * 0.38, hy - r * 0.78 + Math.abs(i) * r * 0.12, r * 0.3, "#fff");
      disc(hx, hy - r * 1.12, r * 0.24, "#f03e3e");
    }
    if (head === "space") { // ヘルメット
      ctx.strokeStyle = "rgba(208,235,255,.95)"; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.beginPath(); ctx.arc(hx, hy, r * 1.18, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(208,235,255,.25)"; ctx.beginPath(); ctx.arc(hx, hy, r * 1.18, 0, TAU); ctx.fill();
      disc(hx - r * 0.55, hy - r * 0.6, r * 0.15, "rgba(255,255,255,.8)");
    }
    if (head === "bug") { ctx.fillStyle = "#e03131"; ctx.beginPath(); ctx.arc(hx, hy, r, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); disc(hx - r * 0.35, hy - r * 0.62, r * 0.13, "#212529"); disc(hx + r * 0.3, hy - r * 0.7, r * 0.13, "#212529"); }
    if (!o.front) {
      // うしろすがた: かみの け / せなか
      if (head !== "robot" && head !== "space") { ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.arc(hx, hy + r * 0.1, r * 0.8, 0, Math.PI); ctx.fill(); }
      return;
    }
    // かお
    const m = o.mood || "normal";
    const lk = (o.look || 0) * r * 0.16;
    const ey = hy - r * 0.02, ex = r * 0.36;
    if (m === "joy") {
      ctx.strokeStyle = "#212529"; ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = "round";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * ex, ey + r * 0.06, r * 0.16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    } else if (m === "sad") {
      ctx.strokeStyle = "#212529"; ctx.lineWidth = Math.max(1, r * 0.11); ctx.lineCap = "round";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * ex - r * 0.14, ey + s * r * 0.0); ctx.lineTo(hx + s * ex + r * 0.14, ey + r * 0.05); ctx.stroke(); }
    } else {
      for (const s of [-1, 1]) { disc(hx + s * ex, ey, r * 0.22, "#fff"); disc(hx + s * ex + lk, ey + r * 0.02, r * 0.13, "#212529"); disc(hx + s * ex + lk + r * 0.04, ey - r * 0.04, r * 0.04, "#fff"); }
    }
    // ほっぺ
    disc(hx - r * 0.6, hy + r * 0.3, r * 0.14, "rgba(255,120,140,.45)"); disc(hx + r * 0.6, hy + r * 0.3, r * 0.14, "rgba(255,120,140,.45)");
    // くち
    ctx.strokeStyle = "#212529"; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = "round";
    ctx.beginPath();
    if (m === "joy") { ctx.fillStyle = "#c92a2a"; ctx.arc(hx, hy + r * 0.32, r * 0.24, 0, Math.PI); ctx.fill(); }
    else if (m === "sad") { ctx.arc(hx, hy + r * 0.55, r * 0.2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else if (m === "focus") { ctx.moveTo(hx - r * 0.15, hy + r * 0.42); ctx.lineTo(hx + r * 0.15, hy + r * 0.42); ctx.stroke(); }
    else { ctx.arc(hx, hy + r * 0.28, r * 0.17, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    if (head === "dino" || head === "sea") { disc(hx - r * 0.12, hy + r * 0.12, r * 0.05, "#2b8a3e"); disc(hx + r * 0.12, hy + r * 0.12, r * 0.05, "#2b8a3e"); }
  }
  function limb(a, b, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, w); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function limb3(a, m, b, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2, w); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(m.x, m.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // ほね（world の てん）→ がめんに えがく。facingCam … かおが カメラを むいて いるか
  function drawBody(j, o) {
    const p = {};
    for (const k in j) p[k] = proj(j[k][0], j[k][1], j[k][2]);
    const s = p.hip.s;
    const shirt = o.shirt, shorts = o.shorts, socks = o.socks || shade(o.shirt, -0.2), skin = o.skin || "#ffd8b5";
    // かげ
    const sh = proj(j.hip[0], 0, j.hip[2]);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.42 * s, 0.1 * s, 0, 0, TAU); ctx.fill();
    // あし
    limb3(p.hip, p.lKnee, p.lFoot, 0.15 * s, socks); limb3(p.hip, p.rKnee, p.rFoot, 0.15 * s, socks);
    limb(p.hip, p.lKnee, 0.17 * s, shorts); limb(p.hip, p.rKnee, 0.17 * s, shorts);
    disc(p.lFoot.x, p.lFoot.y, 0.09 * s, "#212529"); disc(p.rFoot.x, p.rFoot.y, 0.09 * s, "#212529");
    // うで（うしろ）
    const glove = o.glove;
    // どう
    ctx.strokeStyle = shirt; ctx.lineWidth = Math.max(2, 0.36 * s); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.hip.x, p.hip.y); ctx.lineTo(p.neck.x, p.neck.y); ctx.stroke();
    limb(p.hip, { x: p.hip.x + (p.hip.x - p.neck.x) * 0.12, y: p.hip.y + (p.hip.y - p.neck.y) * 0.12 }, 0.36 * s, shorts);
    // せばんごう
    if (!o.front && o.num && s > 16) {
      ctx.save(); ctx.fillStyle = lum(shirt) > 0.6 ? "#212529" : "#fff";
      ctx.font = "900 " + Math.round(0.24 * s) + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.translate((p.hip.x + p.neck.x) / 2, (p.hip.y + p.neck.y) / 2);
      ctx.rotate(Math.atan2(p.neck.x - p.hip.x, p.hip.y - p.neck.y));
      ctx.fillText(String(o.num), 0, 0); ctx.restore();
    }
    // うで
    limb3(p.neck, p.lElb, p.lHand, 0.12 * s, shirt); limb3(p.neck, p.rElb, p.rHand, 0.12 * s, shirt);
    limb(p.lElb, p.lHand, 0.1 * s, skin); limb(p.rElb, p.rHand, 0.1 * s, skin);
    disc(p.lHand.x, p.lHand.y, (glove ? 0.12 : 0.07) * s, glove || skin);
    disc(p.rHand.x, p.rHand.y, (glove ? 0.12 : 0.07) * s, glove || skin);
    // あたま
    drawHead(p.head.x, p.head.y, 0.24 * s, { head: o.head, skin, shirt, front: o.front, look: o.look * cam.dir, mood: o.mood });
  }
  const add = (a, b, k) => [a[0] + b[0] * (k == null ? 1 : k), a[1] + b[1] * (k == null ? 1 : k), a[2] + b[2] * (k == null ? 1 : k)];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // キッカー: k = { x, z, phase（はしる うごき）, pose: "stand"|"run"|"kick"|"joy"|"sad"|"stutter", kickT（0〜1）, lean（からだの むき -1〜1）, look }
  function kickerJoints(k, t) {
    const x = k.x, z = k.z;
    let hipY = 0.92, lean = (k.lean || 0) * 0.12;
    const ph = k.phase || 0;
    const j = {};
    let lF, rF, lH, rH;
    if (k.pose === "run" || k.pose === "stutter") {
      const a = Math.sin(ph), b = Math.cos(ph);
      hipY += Math.abs(b) * 0.05;
      lF = [x - 0.12, Math.max(0.06, a * 0.18), z + a * 0.35]; rF = [x + 0.12, Math.max(0.06, -a * 0.18), z - a * 0.35];
      lH = [x - 0.36, 1.0, z - a * 0.3]; rH = [x + 0.36, 1.0, z + a * 0.3];
    } else if (k.pose === "kick") {
      const q = Math.min(1, k.kickT || 0);
      lF = [x - 0.18, 0.06, z + 0.15];
      rF = [x + 0.08, 0.1 + Math.sin(q * Math.PI) * 0.45, z - 0.5 + q * 1.1];
      lH = [x - 0.55, 1.15, z - 0.1]; rH = [x + 0.45, 1.05, z + 0.2];
      lean += -0.05;
    } else if (k.pose === "joy") {
      const jmp = Math.abs(Math.sin(t * 7)) * 0.25;
      hipY += jmp;
      lF = [x - 0.16, 0.06 + jmp, z]; rF = [x + 0.16, 0.06 + jmp, z];
      lH = [x - 0.4, 2.0 + jmp, z]; rH = [x + 0.4, 2.0 + jmp, z];
    } else if (k.pose === "sad") {
      hipY -= 0.04;
      lF = [x - 0.15, 0.06, z]; rF = [x + 0.15, 0.06, z];
      lH = [x - 0.2, 1.72, z + 0.05]; rH = [x + 0.2, 1.72, z + 0.05];   // あたまを かかえる
    } else {
      lF = [x - 0.15, 0.06, z]; rF = [x + 0.15, 0.06, z];
      lH = [x - 0.36, 0.95, z]; rH = [x + 0.36, 0.95, z];
    }
    j.hip = [x, hipY, z];
    j.neck = [x + lean, hipY + 0.5, z];
    j.head = [x + lean * 1.3, hipY + 0.8 - (k.pose === "sad" ? 0.05 : 0), z];
    j.lFoot = lF; j.rFoot = rF; j.lHand = lH; j.rHand = rH;
    j.lKnee = lerp3(j.hip, lF, 0.5); j.lKnee[2] += 0.08; j.rKnee = lerp3(j.hip, rF, 0.5); j.rKnee[2] += 0.08;
    j.lElb = lerp3(j.neck, lH, 0.5); j.lElb[0] -= 0.06; j.rElb = lerp3(j.neck, rH, 0.5); j.rElb[0] += 0.06;
    return j;
  }
  // キーパー: physics の pose（ゴールの めんの x,y）から ほねを つくる
  function keeperJoints(g, t) {
    const z = P.KEEPER_Z, pose = g.pose;
    const sz = g.size || 1;
    const j = {};
    if (g.mood === "joy" || g.mood === "sad" || !pose || pose.s <= 0.001) {
      const x = pose ? Math.max(-2.4, Math.min(2.4, pose.c.x)) : (g.x || 0);
      const sway = g.mood === "ready" ? Math.sin(t * 5) * 0.06 : 0;
      const hop = g.mood === "joy" ? Math.abs(Math.sin(t * 6)) * 0.2 : 0;
      const hipY = (g.mood === "ready" ? 0.82 : 0.92) * sz + hop;
      j.hip = [x + sway, hipY, z]; j.neck = [x + sway, hipY + 0.5 * sz, z]; j.head = [x + sway, hipY + 0.8 * sz, z];
      if (g.mood === "joy") { j.lHand = [x - 0.45, hipY + 1.15 * sz, z]; j.rHand = [x + 0.45, hipY + 1.15 * sz, z]; } // ガッツポーズ
      else if (g.mood === "sad") { j.lHand = [x - 0.3, hipY + 0.05, z]; j.rHand = [x + 0.3, hipY + 0.05, z]; j.head[1] -= 0.08; }
      else { j.lHand = [x + sway - 0.6 * sz, hipY + 0.45 * sz, z]; j.rHand = [x + sway + 0.6 * sz, hipY + 0.45 * sz, z]; }
      const w = g.mood === "ready" ? 0.32 : 0.16;
      j.lFoot = [x - w, 0.06 + hop, z]; j.rFoot = [x + w, 0.06 + hop, z];
      j.lKnee = [x - w * 1.05, hipY * 0.5 + hop * 0.5, z - 0.1]; j.rKnee = [x + w * 1.05, hipY * 0.5 + hop * 0.5, z - 0.1];
      j.lElb = [(j.neck[0] + j.lHand[0]) / 2 - 0.08, (j.neck[1] + j.lHand[1]) / 2 - 0.05, z]; j.rElb = [(j.neck[0] + j.rHand[0]) / 2 + 0.08, (j.neck[1] + j.rHand[1]) / 2 - 0.05, z];
      return j;
    }
    const c = pose.c, ux = Math.sin(pose.ang), uy = Math.cos(pose.ang);
    const px = uy, py = -ux;              // からだに すいちょく
    const P2 = (x, y) => [x, y, z];
    let cy = c.y;
    if (g.fall) cy = Math.max(0.3, c.y - g.fall * 0.9);
    const C = { x: c.x, y: cy };
    j.hip = P2(C.x - ux * 0.2 * sz, C.y - uy * 0.2 * sz);
    j.neck = P2(C.x + ux * 0.3 * sz, C.y + uy * 0.3 * sz);
    j.head = P2(C.x + ux * 0.58 * sz, C.y + uy * 0.58 * sz);
    const s = pose.s;
    // て: かまえ（よこ）→ とぶ ほうへ
    const hx = C.x + (pose.hand.x - c.x), hy = C.y + (pose.hand.y - c.y);
    const rdy = (sd) => [C.x + sd * (pose.spread + 0.15), C.y + 0.35 * sz, z];
    j.lHand = lerp3(rdy(-1), P2(hx - px * 0.13, hy - py * 0.13), s);
    j.rHand = lerp3(rdy(1), P2(hx + px * 0.13, hy + py * 0.13), s);
    const fx = C.x + (pose.foot.x - c.x), fy = Math.max(0.06, C.y + (pose.foot.y - c.y));
    const spread = pose.crouch ? 0.4 : 0.16 + (1 - s) * 0.16;
    j.lFoot = P2(fx - px * spread, Math.max(0.06, fy - py * spread));
    j.rFoot = P2(fx + px * spread, Math.max(0.06, fy + py * spread));
    j.lKnee = lerp3(j.hip, j.lFoot, 0.5); j.rKnee = lerp3(j.hip, j.rFoot, 0.5);
    j.lKnee[2] -= 0.12; j.rKnee[2] -= 0.12;
    j.lElb = lerp3(j.neck, j.lHand, 0.5); j.rElb = lerp3(j.neck, j.rHand, 0.5);
    return j;
  }
  function drawKicker(k, st) {
    const j = kickerJoints(k, st.time || 0);
    ctx.save();
    if (k.alpha != null) ctx.globalAlpha = k.alpha;
    drawBody(j, { shirt: k.shirt, shorts: k.shorts, head: k.head, front: cam.dir < 0, num: k.num, look: k.look || 0, mood: k.mood });
    ctx.restore();
  }
  function drawKeeper(g, st) {
    const j = keeperJoints(g, st.time || 0);
    ctx.save();
    if (cam.kind === "keeper") ctx.globalAlpha = 0.88;
    drawBody(j, { shirt: g.shirt, shorts: g.shorts, head: g.head, front: cam.dir > 0, num: 1, look: g.look || 0, mood: g.mood === "ready" ? "focus" : g.mood, glove: "#fff" });
    ctx.restore();
  }

  // ===== ボール =====
  function drawBall(b, st) {
    const p = proj(b.x, b.y, b.z);
    if (p.d < 0.3) return;
    const r = Math.max(2, P.BALL_R * p.s);
    // かげ
    const sh = proj(b.x, 0, b.z);
    const k = Math.max(0.2, 1 - b.y / 4);
    ctx.fillStyle = "rgba(0,0,0," + (0.25 * k) + ")";
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1 * k, r * 0.35 * k, 0, 0, TAU); ctx.fill();
    // ボール
    ctx.save();
    ctx.translate(p.x, p.y);
    disc(0, 0, r, "#fff");
    ctx.rotate(b.rot || 0);
    if (r > 3.5) {
      ctx.fillStyle = "#212529";
      const pent = (cx, cy, rr2) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); };
      pent(0, 0, r * 0.36);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; pent(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.22); }
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
    // きせき
    if (b.trail && b.trail.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = Math.max(1, r * 0.6); ctx.lineCap = "round";
      ctx.beginPath();
      b.trail.forEach((q, i) => { const pp = proj(q[0], q[1], q[2]); if (i) ctx.lineTo(pp.x, pp.y); else ctx.moveTo(pp.x, pp.y); });
      ctx.stroke();
    }
  }

  // ===== シーン ぜんぶ =====
  // st = { view, time, kicker, keeper, ball, net, postShake, grid, swipe, cheer, boardColors }
  function drawScene(st) {
    setCam(st.view);
    drawStadium(st);
    const items = [];
    items.push({ d: depth(P.GOAL_Z + P.NET_D + 0.2), f: () => drawNet(st) });
    items.push({ d: depth(P.GOAL_Z) - 0.01, f: () => drawFrame(st) });
    if (st.keeper) items.push({ d: depth(P.KEEPER_Z), f: () => drawKeeper(st.keeper, st) });
    if (st.kicker) items.push({ d: depth(st.kicker.z) + 0.05, f: () => drawKicker(st.kicker, st) });
    if (st.ball) items.push({ d: depth(st.ball.z) - 0.02, f: () => drawBall(st.ball, st) });
    // カメラ から とおい じゅん
    items.sort((a, b) => b.d - a.d).forEach((it) => it.f());
    if (st.grid) drawGrid9(st);
    if (st.swipe && st.swipe.length > 1) {
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 8;
      ctx.beginPath(); st.swipe.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.strokeStyle = "rgba(255,212,59,.95)"; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
  }
  // がめんの どこに ボールが あるか（スワイプの はじめ を きめる）
  function ballScreen() { const p = proj(0, P.BALL_R, 0); return { x: p.x, y: p.y, r: Math.max(8, P.BALL_R * p.s) }; }

  // ===== かみふぶき・おおきな もじ =====
  let confetti = [];
  function burst(n) {
    const cols = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#cc5de8", "#ffffff", "#ff922b"];
    for (let i = 0; i < (n || 120); i++) confetti.push({ x: Math.random() * W, y: -10 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, r: 3 + Math.random() * 4, a: Math.random() * TAU, va: (Math.random() - 0.5) * 10, c: cols[i % cols.length], life: 4 + Math.random() * 2 });
  }
  function clearFx() { confetti = []; }
  function drawFx(dt) {
    confetti = confetti.filter((p) => (p.life -= dt) > 0 && p.y < H + 20);
    for (const p of confetti) {
      p.x += (p.vx + Math.sin(p.a) * 30) * dt; p.y += p.vy * dt; p.a += p.va * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); ctx.restore();
    }
  }
  function big(text, color, age, sub) {
    const k = Math.min(1, age / 0.18);
    const sc = 0.6 + 0.4 * k + (age < 0.3 ? Math.sin(age / 0.3 * Math.PI) * 0.12 : 0);
    const fs = Math.min(W * 0.9 / Math.max(3, text.length), H * 0.16, 96);
    ctx.save();
    ctx.globalAlpha = age > 1.3 ? Math.max(0, 1 - (age - 1.3) / 0.4) : 1;
    ctx.translate(W / 2, H * 0.36); ctx.scale(sc, sc);
    ctx.font = "900 " + Math.round(fs) + "px 'Hiragino Maru Gothic ProN', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineJoin = "round";
    ctx.strokeText(text, 0, 0); ctx.fillStyle = color || "#ffd43b"; ctx.fillText(text, 0, 0);
    if (sub) {
      ctx.font = "900 " + Math.round(fs * 0.36) + "px 'Hiragino Maru Gothic ProN', system-ui, sans-serif";
      ctx.lineWidth = fs * 0.08; ctx.strokeText(sub, 0, fs * 0.72); ctx.fillStyle = "#fff"; ctx.fillText(sub, 0, fs * 0.72);
    }
    ctx.restore();
  }
  // パワーゲージ（かんたん モード）: がめんの みぎ に たて
  function drawGauge(v, zone) {
    const h = Math.min(H * 0.55, 240), w = 24, x = W - w - 8, y = H * 0.62 - h / 2;
    ctx.save();
    rr(x - 4, y - 4, w + 8, h + 8, 12); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fill();
    const max = 1.3;
    const yy = (p) => y + h - (p / max) * h;
    ctx.fillStyle = "#74c0fc"; ctx.fillRect(x, yy(zone[0]), w, h - (yy(zone[0]) - y));
    ctx.fillStyle = "#51cf66"; ctx.fillRect(x, yy(zone[1]), w, yy(zone[0]) - yy(zone[1]));
    ctx.fillStyle = "#ff6b6b"; ctx.fillRect(x, y, w, yy(zone[1]) - y);
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 8, yy(v) - 3, w + 16, 6);
    ctx.font = "900 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.fillText("つよさ", x + w / 2, y - 12);
    ctx.restore();
    return { x, y, w, h };
  }

  root.PKRender = { init, resize, size, clear, setCam, proj, unprojectGoal, goalRect, drawScene, ballScreen, burst, clearFx, drawFx, big, drawGauge, shade, lum, cam: () => cam };
})(this);
