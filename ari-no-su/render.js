/* ありの す たんけん ｜ Canvas の 描画
 * 土の 断面は オフスクリーンに いちど かいておき、ほった ところだけ かきなおす。
 */
(function () {
  "use strict";
  const ARI = window.ARI;
  const Sim = ARI.Sim;
  const { GW, GH, SURF, ROW, EX } = Sim;
  const VY0 = 6;          // ここより うえの そらは みせない
  const SUB = 6;          // 土の オフスクリーン: 1マス = 6px

  let cv, ctx, W = 1, H = 1, dpr = 1, s = 1, ox = 0, oy = 0;
  let soil, sctx, pherCv, pctx, pimg, bg, bgKey = "";
  let frame = 0;
  const drops = [];

  const X = x => ox + x * s;
  const Y = y => oy + (y - VY0) * s;

  function hash(x, y, k) {
    let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- いろ
  const SPECIES_LOOK = {
    kurooo:   { body: "#17110d", leg: "#2a1e16", shine: "rgba(255,240,220,.20)", len: 4.2 },
    kuroyama: { body: "#2c2c31", leg: "#34343a", shine: "rgba(230,235,255,.38)", len: 3.5 },
  };
  function soilRGB(x, y, type) {
    const d = (y - SURF) / (GH - SURF);
    let r, g, b;
    if (d < 0.08) { r = 74; g = 52; b = 36; }
    else { const t = Math.min(1, (d - 0.08) / 0.92); r = 112 + 46 * t; g = 80 + 24 * t; b = 52 + 10 * t; }
    const band = Math.sin(y * 0.9 + Math.sin(x * 0.07) * 2) * 5;
    const n = (hash(x, y) - 0.5) * 14 + band;
    if (type === Sim.T_ROCK) { const m = 128 + n; return [m, m - 3, m - 8]; }
    if (type === Sim.T_PLUG) return [150 + n, 112 + n, 74 + n];
    return [r + n, g + n, b + n];
  }
  const rgb = c => "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";

  // ---------------------------------------------------------------- つち
  function soilCell(S, x, y) {
    const t = S.cell[y * GW + x];
    const c = soilRGB(x, y, t === Sim.T_ROCK ? Sim.T_SOIL : t);
    const px = x * SUB, py = (y - SURF) * SUB;
    sctx.fillStyle = rgb(c);
    sctx.fillRect(px, py, SUB, SUB);
    for (let k = 0; k < 3; k++) {
      const h = hash(x, y, k + 1);
      const lt = h > 0.5 ? 22 : -20;
      sctx.fillStyle = rgb([c[0] + lt, c[1] + lt, c[2] + lt]);
      const sz = 1 + hash(x, y, k + 7) * 1.4;
      sctx.fillRect(px + hash(x, y, k + 4) * (SUB - sz), py + hash(x, y, k + 9) * (SUB - sz), sz, sz);
    }
  }
  function rocks(S, x0, y0, x1, y1) {
    for (let y = Math.max(SURF, y0); y <= Math.min(GH - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(GW - 1, x1); x++) {
        if (S.cell[y * GW + x] !== Sim.T_ROCK) continue;
        const c = soilRGB(x, y, Sim.T_ROCK);
        sctx.fillStyle = rgb(c);
        sctx.beginPath(); sctx.arc((x + 0.5) * SUB, (y - SURF + 0.5) * SUB, SUB * 0.92, 0, 7); sctx.fill();
        sctx.fillStyle = "rgba(255,255,255,.18)";
        sctx.beginPath(); sctx.arc((x + 0.35) * SUB, (y - SURF + 0.35) * SUB, SUB * 0.3, 0, 7); sctx.fill();
      }
  }
  function cavities(S, x0, y0, x1, y1) {
    const list = [];
    for (let y = Math.max(SURF, y0); y <= Math.min(GH - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(GW - 1, x1); x++)
        if (S.cell[y * GW + x] === Sim.T_EMPTY) list.push(x, y);
    sctx.fillStyle = "#3d2a1c";
    sctx.beginPath();
    for (let k = 0; k < list.length; k += 2) {
      const cx = (list[k] + 0.5) * SUB, cy = (list[k + 1] - SURF + 0.5) * SUB;
      sctx.moveTo(cx + SUB * 0.98, cy);
      sctx.arc(cx, cy, SUB * 0.98, 0, Math.PI * 2);
    }
    sctx.fill();
    sctx.fillStyle = "#24170f";
    sctx.beginPath();
    for (let k = 0; k < list.length; k += 2) {
      const cx = (list[k] + 0.5) * SUB, cy = (list[k + 1] - SURF + 0.5) * SUB;
      sctx.moveTo(cx + SUB * 0.74, cy);
      sctx.arc(cx, cy, SUB * 0.74, 0, Math.PI * 2);
    }
    sctx.fill();
  }
  function soilFull(S) {
    soil.width = GW * SUB; soil.height = (GH - SURF) * SUB;
    for (let y = SURF; y < GH; y++) for (let x = 0; x < GW; x++) soilCell(S, x, y);
    rocks(S, 0, SURF, GW - 1, GH - 1);
    cavities(S, 0, SURF, GW - 1, GH - 1);
    S.dug.length = 0;
    S._soilSeed = S.seed;
  }
  function soilPatch(S, i) {
    const x = i % GW, y = (i / GW) | 0;
    const x0 = x - 1, x1 = x + 1, y0 = Math.max(SURF, y - 1), y1 = Math.min(GH - 1, y + 1);
    sctx.save();
    sctx.beginPath();
    sctx.rect(x0 * SUB, (y0 - SURF) * SUB, (x1 - x0 + 1) * SUB, (y1 - y0 + 1) * SUB);
    sctx.clip();
    for (let yy = y0; yy <= y1; yy++) for (let xx = Math.max(0, x0); xx <= Math.min(GW - 1, x1); xx++) soilCell(S, xx, yy);
    cavities(S, x0 - 2, y0 - 2, x1 + 2, y1 + 2);
    sctx.restore();
  }

  // ---------------------------------------------------------------- そら・くさ
  const SKY = {
    spring: ["#bfe6ff", "#e8f7ff"], summer: ["#7ccaf7", "#d4f0ff"],
    autumn: ["#f6c9a0", "#fbe8d2"], winter: ["#b9c6d6", "#e6edf4"],
  };
  const GRASS = { spring: "#5fae4a", summer: "#3f9a3a", autumn: "#b58a3a", winter: "#8c9479" };

  function buildBg(season) {
    bg.width = W; bg.height = H;
    const b = bg.getContext("2d");
    const gy = Y(SURF);
    const sk = SKY[season];
    const gr = b.createLinearGradient(0, 0, 0, gy);
    gr.addColorStop(0, sk[0]); gr.addColorStop(1, sk[1]);
    b.fillStyle = gr; b.fillRect(0, 0, W, gy + 1);
    // とおくの おか
    b.fillStyle = season === "winter" ? "#cfd8e0" : season === "autumn" ? "#e3b98a" : "#a8d89a";
    b.beginPath(); b.moveTo(0, gy);
    for (let x = 0; x <= W; x += 8) b.lineTo(x, gy - s * (4 + 2.2 * Math.sin(x / W * 7) + 1.4 * Math.sin(x / W * 17)));
    b.lineTo(W, gy); b.fill();
    // くさ
    const gc = GRASS[season];
    b.strokeStyle = gc; b.lineCap = "round";
    for (let k = 0; k < GW * 2.2; k++) {
      const wx = k / 2.2 + hash(k, 3) * 0.4;
      if (Math.abs(wx - EX - 0.5) < 2.5) continue;
      const h = (0.7 + hash(k, 5) * 1.8) * s * (season === "winter" ? 0.6 : 1);
      const lean = (hash(k, 8) - 0.5) * h * 0.8;
      b.lineWidth = Math.max(1, s * 0.22);
      b.beginPath(); b.moveTo(X(wx), gy + 1); b.quadraticCurveTo(X(wx) + lean * 0.3, gy - h * 0.6, X(wx) + lean, gy - h); b.stroke();
    }
    if (season === "spring" || season === "summer") {
      for (let k = 0; k < 9; k++) {
        const wx = 4 + hash(k, 21) * (GW - 8);
        if (Math.abs(wx - EX) < 5) continue;
        const fx = X(wx), fy = gy - s * (2 + hash(k, 22) * 1.5);
        b.strokeStyle = gc; b.lineWidth = Math.max(1, s * 0.2);
        b.beginPath(); b.moveTo(fx, gy); b.lineTo(fx, fy); b.stroke();
        b.fillStyle = season === "spring" ? ["#ffd23f", "#ff8fb1", "#ffffff"][k % 3] : ["#ffd23f", "#ff9f43"][k % 2];
        for (let p = 0; p < 5; p++) { b.beginPath(); b.arc(fx + Math.cos(p * 1.26) * s * 0.5, fy + Math.sin(p * 1.26) * s * 0.5, s * 0.38, 0, 7); b.fill(); }
        b.fillStyle = "#f7a400"; b.beginPath(); b.arc(fx, fy, s * 0.3, 0, 7); b.fill();
      }
    }
    if (season === "autumn") {
      for (let k = 0; k < 14; k++) {
        const wx = hash(k, 31) * GW; b.fillStyle = ["#d9622b", "#e9a23b", "#b5442a"][k % 3];
        b.beginPath(); b.ellipse(X(wx), gy - s * 0.2, s * 0.9, s * 0.4, hash(k, 32) * 3, 0, 7); b.fill();
      }
    }
    if (season === "winter") { b.fillStyle = "#f7fbff"; b.fillRect(0, gy - s * 0.6, W, s * 0.8); }
    // つちの したの すきま（たてながの がめんで せかいの したが あまったら）
    b.fillStyle = "#9a6a3e"; b.fillRect(0, Y(GH), W, H - Y(GH));
  }

  // ---------------------------------------------------------------- あり
  const HIPS = [1.5, 0.8, 0.1];
  const KNEE = [[2.5, 1.7], [0.8, 2.1], [-0.9, 1.9]];
  const FOOT = [[3.9, 2.7], [0.8, 3.4], [-2.7, 3.0]];

  function antBody(c, kind, look, ph, moving, opt) {
    opt = opt || {};
    const queenish = kind === "queen" || kind === "gyne";
    const male = kind === "male";
    const lw = Math.max(0.5, opt.minLw || 0);
    c.lineCap = "round"; c.lineJoin = "round";
    // はね（オス・あたらしい じょおう）
    if ((kind === "male" || kind === "gyne") && !opt.noWings) {
      const flap = opt.flying ? Math.sin(ph * 3) * 0.6 : 0;
      c.fillStyle = "rgba(230,240,255,.55)"; c.strokeStyle = "rgba(120,130,150,.7)"; c.lineWidth = 0.18;
      for (const sd of [-1, 1]) {
        c.save(); c.translate(0.7, sd * 0.3); c.rotate(Math.PI + sd * (0.22 + flap));
        c.beginPath(); c.ellipse(3.4, 0, 3.8, 1.25, 0, 0, 7); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(2.6, sd * 0.6, 2.6, 0.9, sd * 0.2, 0, 7); c.fill(); c.stroke();
        c.restore();
      }
    }
    // あし（3ぼんずつ こうたいに うごかす）
    const sw = moving ? Math.sin(ph) * 0.8 : 0;
    c.strokeStyle = look.leg; c.lineWidth = lw * (queenish ? 1.15 : 1) || 0.5;
    c.beginPath();
    for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {
      const off = sw * (j % 2 === 0 ? 1 : -1) * sd;
      c.moveTo(HIPS[j], sd * 0.35);
      c.lineTo(KNEE[j][0] + off * 0.5, sd * KNEE[j][1]);
      c.lineTo(FOOT[j][0] + off, sd * FOOT[j][1]);
    }
    c.stroke();
    // しょっかく（くの じに まがる）
    const wig = Math.sin(ph * 0.7) * 0.25;
    c.lineWidth = (lw || 0.5) * 0.8;
    c.beginPath();
    for (const sd of [-1, 1]) {
      c.moveTo(3.7, sd * 0.45);
      c.lineTo(4.9, sd * 1.55);
      c.lineTo(6.3 + wig * sd, sd * (0.85 + wig));
    }
    c.stroke();
    // からだ
    const gx = queenish ? -3.3 : -2.8, grx = queenish ? 3.0 : male ? 2.0 : 2.3, gry = queenish ? 2.0 : male ? 1.3 : 1.65;
    c.fillStyle = opt.gaster || look.body;
    c.beginPath(); c.ellipse(gx, 0, grx, gry, 0, 0, 7); c.fill();
    c.fillStyle = opt.waist || look.body;
    c.beginPath(); c.arc(-0.55, 0, 0.45, 0, 7); c.fill();
    c.fillStyle = opt.thorax || look.body;
    c.beginPath(); c.ellipse(0.75, 0, queenish ? 1.9 : 1.45, queenish ? 1.05 : 0.8, 0, 0, 7); c.fill();
    const hr = opt.bigHead ? 1.6 : male ? 0.9 : 1.2;
    c.fillStyle = opt.head || look.body;
    c.beginPath(); c.ellipse(2.85 + (opt.bigHead ? 0.3 : 0), 0, hr, hr * 0.95, 0, 0, 7); c.fill();
    if (opt.spines) {
      c.strokeStyle = opt.thorax || look.body; c.lineWidth = 0.35;
      c.beginPath(); c.moveTo(0.2, -0.6); c.lineTo(-0.6, -1.6); c.moveTo(0.2, 0.6); c.lineTo(-0.6, 1.6); c.stroke();
    }
    // ひかり・め
    c.fillStyle = look.shine;
    c.beginPath(); c.ellipse(gx + 0.4, -gry * 0.35, grx * 0.5, gry * 0.28, -0.2, 0, 7); c.fill();
    c.beginPath(); c.ellipse(2.95, -0.4, 0.5, 0.3, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.beginPath(); c.arc(3.2, -0.85, 0.22, 0, 7); c.arc(3.2, 0.85, 0.22, 0, 7); c.fill();
  }

  function drawCarry(c, a, S) {
    const k = a.carry;
    if (!k) return;
    c.save(); c.translate(5.6, 0);
    if (k === "soil") { c.fillStyle = "#8a6240"; c.beginPath(); c.arc(0, 0, 1.0, 0, 7); c.fill(); c.fillStyle = "#a57a52"; c.beginPath(); c.arc(-0.3, -0.3, 0.4, 0, 7); c.fill(); }
    else if (k === "sugar") { c.fillStyle = "#fff"; c.strokeStyle = "#c9d3dc"; c.lineWidth = 0.2; c.fillRect(-0.7, -0.7, 1.4, 1.4); c.strokeRect(-0.7, -0.7, 1.4, 1.4); }
    else if (k === "bread") { c.fillStyle = "#e0ac58"; c.beginPath(); c.ellipse(0, 0, 1.0, 0.75, 0.4, 0, 7); c.fill(); }
    else if (k === "bug" || k === "mini") { c.fillStyle = k === "bug" ? "#6aa84f" : "#8b6b4a"; c.beginPath(); c.ellipse(0, 0, 1.1, 0.6, 0, 0, 7); c.fill(); }
    else if (k === "feed") { c.fillStyle = "rgba(240,170,60,.9)"; c.beginPath(); c.arc(-0.6, 0, 0.55, 0, 7); c.fill(); }
    else if (k === "brood" && a.ref) {
      const L = antLen(S, a);
      c.scale(10 / L, 10 / L);
      broodShape(c, a.ref, 0, 0, 0);
    }
    c.restore();
  }

  function antLen(S, a) {
    const look = SPECIES_LOOK[S.species] || SPECIES_LOOK.kurooo;
    return look.len * (a.kind === "queen" ? 1.5 : a.kind === "gyne" ? 1.4 : a.kind === "male" ? 0.95 : 1);
  }

  // むき 24ほうこう × あし 6コマ の えを さきに かいておく（300ぴき でも drawImage だけで すむ）
  const FRAMES = 6, ANGLES = 24;
  let sprites = {}, spriteS = 0;
  function sprite(S, kind, fr, ai, flying) {
    if (spriteS !== s) { sprites = {}; spriteS = s; }
    const key = S.species + kind + fr + "_" + ai + (flying ? "f" : "");
    let c = sprites[key];
    if (c) return c;
    const look = SPECIES_LOOK[S.species] || SPECIES_LOOK.kurooo;
    const k = antLen(S, { kind }) * s / 10;
    const R0 = Math.ceil(8.2 * k) + 2;
    c = document.createElement("canvas");
    c.width = c.height = R0 * 2;
    c.o = R0;
    const g = c.getContext("2d");
    g.translate(R0, R0); g.rotate(ai / ANGLES * Math.PI * 2); g.scale(k, k);
    const ph = fr < 0 ? 0 : (fr / FRAMES) * Math.PI * 2 + Math.PI / 2;
    antBody(g, kind, look, ph, fr >= 0, { minLw: 1.1 / k, flying });
    sprites[key] = c;
    return c;
  }

  function drawAnt(S, a, al) {
    const L = antLen(S, a) * s;
    const wx = a.px + (a.x - a.px) * al, wy = a.py + (a.y - a.py) * al;
    const sx = X(wx), sy = Y(wy);
    if (sx < -L || sx > W + L || sy < -L || sy > H + L) return;
    const moving = a.mv || a.st === "fly" || a.st === "dig";
    const TAU = Math.PI * 2;
    const fr = moving ? Math.floor((((a.ph % TAU) + TAU) % TAU) / TAU * FRAMES) % FRAMES : -1;
    const ai = Math.round((((a.hd % TAU) + TAU) % TAU) / TAU * ANGLES) % ANGLES;
    const sp = sprite(S, a.kind, fr, ai, a.st === "fly");
    ctx.drawImage(sp, Math.round(sx - sp.o), Math.round(sy - sp.o));
    if (a.carry) {
      const k = L / 10, h = ai / ANGLES * TAU;
      const cs = Math.cos(h), sn = Math.sin(h);
      ctx.setTransform(cs * k, sn * k, -sn * k, cs * k, sx, sy);
      drawCarry(ctx, a, S);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (a.alert > 0) {
      ctx.fillStyle = "#ff4d4d";
      ctx.font = "bold " + Math.round(Math.max(12, s * 2.6)) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("！", sx, sy - L * 0.6);
    }
  }

  // ---------------------------------------------------------------- たまご・ようちゅう・さなぎ
  function broodShape(c, b, x, y, sc) {
    // x, y は せかいの マス。sc = 0 なら いまの こうしで かく（あり の 口もと）
    if (b.stage === "egg") {
      c.fillStyle = "#fffaf0"; c.strokeStyle = "rgba(160,140,110,.8)"; c.lineWidth = 0.08;
      c.beginPath(); c.ellipse(x, y, 0.42, 0.3, 0.3, 0, 7); c.fill(); c.stroke();
    } else if (b.stage === "larva") {
      const L = 0.65 + 0.22 * Math.min(3, b.fed);
      c.fillStyle = "#f6ecd0"; c.strokeStyle = "rgba(170,140,90,.9)"; c.lineWidth = 0.08;
      c.beginPath(); c.ellipse(x, y, L, L * 0.62, 0, 0, 7); c.fill(); c.stroke();
      c.beginPath();
      for (let k = -1; k <= 1; k++) { c.moveTo(x + k * L * 0.42, y - L * 0.5); c.lineTo(x + k * L * 0.42, y + L * 0.5); }
      c.stroke();
      c.fillStyle = "#c9a46a"; c.beginPath(); c.arc(x + L * 0.85, y - L * 0.15, L * 0.22, 0, 7); c.fill();
    } else {
      c.fillStyle = b.al ? "#e3c487" : "#d9b77a"; c.strokeStyle = "rgba(120,85,40,.8)"; c.lineWidth = 0.08;
      c.beginPath(); c.ellipse(x, y, 1.0, 0.5, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = "#5a3b1e"; c.beginPath(); c.arc(x - 0.8, y, 0.16, 0, 7); c.fill();
    }
  }
  function drawBrood(S) {
    ctx.save();
    ctx.translate(ox, oy - VY0 * s);
    ctx.scale(s, s);
    for (const b of S.brood) if (!b.carried) broodShape(ctx, b, b.x, b.y - 0.2, 1);
    ctx.restore();
  }

  // ---------------------------------------------------------------- えさ・てき・つちやま
  function drawFoods(S) {
    const gy = Y(SURF);
    for (const f of S.foods) {
      const fr = Math.max(0.25, f.amount / f.max);
      const fx = X(f.x);
      if (f.type === "sugar") {
        const n = Math.max(1, Math.round(fr * 6));
        for (let k = 0; k < n; k++) {
          const cx = fx + (k % 3 - 1) * s * 1.05, cy = gy - s * (0.55 + Math.floor(k / 3) * 1.0);
          ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#b9c4cf"; ctx.lineWidth = 1;
          ctx.fillRect(cx - s * 0.5, cy - s * 0.5, s, s); ctx.strokeRect(cx - s * 0.5, cy - s * 0.5, s, s);
        }
        if (frame % 40 < 20) { ctx.fillStyle = "#fff6a8"; ctx.beginPath(); ctx.arc(fx + s, gy - s * 1.8, s * 0.25, 0, 7); ctx.fill(); }
      } else if (f.type === "bread") {
        const r = s * (0.8 + 1.2 * fr);
        ctx.fillStyle = "#e3ad5b"; ctx.strokeStyle = "#a8742e"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const t = (k / 9) * Math.PI;
          const rr = r * (0.8 + hash(k, f.x | 0) * 0.35);
          ctx.lineTo(fx + Math.cos(t) * rr * 1.3, gy - Math.sin(t) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f6d79a"; ctx.beginPath(); ctx.arc(fx - r * 0.3, gy - r * 0.5, r * 0.18, 0, 7); ctx.fill();
      } else {
        const big = f.type === "bug";
        const sc = s * (big ? 0.9 + 0.6 * fr : 0.55);
        ctx.save(); ctx.translate(fx, gy - sc * 0.8);
        ctx.strokeStyle = big ? "#4f7d39" : "#6b5038"; ctx.lineWidth = Math.max(1, sc * 0.18);
        ctx.beginPath();
        for (const k of [-1, 0, 1]) { ctx.moveTo(k * sc * 0.8, 0); ctx.lineTo(k * sc * 0.8 + sc * 0.4, sc * 0.8); }
        ctx.stroke();
        ctx.fillStyle = big ? "#7cbf5a" : "#8b6b4a";
        ctx.beginPath(); ctx.ellipse(0, 0, sc * 1.8, sc * 0.7, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(sc * 1.8, -sc * 0.1, sc * 0.55, 0, 7); ctx.fill();
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(sc * 2.0, -sc * 0.25, sc * 0.15, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawMounds(S, season) {
    const gy = Y(SURF);
    for (let side = 0; side < 2; side++) {
      const n = S.mound[side];
      if (!n) continue;
      const h = Math.min(3.2, 0.5 + Math.sqrt(n) * 0.22) * s;
      const cx = X(EX + 0.5 + (side ? 6.5 : -6.5));
      const w = h * 2.6;
      ctx.fillStyle = season === "winter" ? "#e9eef3" : "#8e6845";
      ctx.beginPath(); ctx.ellipse(cx, gy + 1, w, h, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.12)";
      for (let k = 0; k < 10; k++) {
        const t = hash(k, side + 40) * Math.PI, rr = hash(k, side + 50) * 0.9;
        ctx.fillRect(cx - Math.cos(t) * w * rr, gy - Math.sin(t) * h * rr, Math.max(1, s * 0.3), Math.max(1, s * 0.3));
      }
    }
  }

  function drawHazards(S) {
    const gy = Y(SURF);
    for (const h of S.hazards) {
      const fx = X(h.cx);
      const fs = Math.round(Math.max(11, s * 2.2));
      ctx.font = "bold " + fs + "px sans-serif"; ctx.textAlign = "center";
      if (h.type === "spider") {
        const r = s * 1.3, cy = gy - s * 1.6;
        ctx.strokeStyle = "#3b2a20"; ctx.lineWidth = Math.max(1.2, s * 0.22);
        ctx.beginPath();
        for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) {
          const ang = (k - 1.5) * 0.35, step = Math.sin(S.t * 6 + k) * s * 0.2;
          ctx.moveTo(fx + sd * r * 0.4, cy);
          ctx.lineTo(fx + sd * (r * 1.4 + k * s * 0.15), cy - s * (1.0 - ang) + step);
          ctx.lineTo(fx + sd * (r * 1.9 + k * s * 0.35), gy);
        }
        ctx.stroke();
        ctx.fillStyle = "#6b4a36"; ctx.beginPath(); ctx.ellipse(fx, cy, r, r * 0.85, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#4e3426"; ctx.beginPath(); ctx.arc(fx + (h.x > h.cx ? 1 : -1) * r * 0.9, cy + r * 0.1, r * 0.55, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff";
        const ex = fx + (h.x > h.cx ? 1 : -1) * r * 1.0;
        ctx.beginPath(); ctx.arc(ex - r * 0.18, cy - r * 0.05, r * 0.16, 0, 7); ctx.arc(ex + r * 0.18, cy - r * 0.05, r * 0.16, 0, 7); ctx.fill();
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(ex - r * 0.16, cy - r * 0.02, r * 0.07, 0, 7); ctx.arc(ex + r * 0.2, cy - r * 0.02, r * 0.07, 0, 7); ctx.fill();
        label("クモ", fx, cy - r * 1.6, fs);
      } else {
        const w = s * h.r, d = s * 2.4;
        ctx.fillStyle = "#e6cf98";
        ctx.beginPath(); ctx.moveTo(fx - w * 1.3, gy); ctx.quadraticCurveTo(fx - w * 0.5, gy, fx, gy + d); ctx.quadraticCurveTo(fx + w * 0.5, gy, fx + w * 1.3, gy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(150,115,60,.6)"; ctx.lineWidth = 1;
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(fx, gy + d * k * 0.22, w * (1 - k * 0.25), s * 0.25, 0, 0, Math.PI); ctx.stroke(); }
        ctx.strokeStyle = "#6b4b2b"; ctx.lineWidth = Math.max(1, s * 0.2);
        ctx.beginPath(); ctx.arc(fx - s * 0.35, gy + d - s * 0.15, s * 0.4, -1.2, 0.2); ctx.arc(fx + s * 0.35, gy + d - s * 0.15, s * 0.4, Math.PI - 0.2, Math.PI + 1.2); ctx.stroke();
        label("アリジゴク", fx, gy - s * 1.2, fs);
      }
    }
  }
  function label(t, x, y, fs) {
    ctx.font = "bold " + fs + "px sans-serif";
    const w = ctx.measureText(t).width + fs * 0.8;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    roundRect(x - w / 2, y - fs * 0.85, w, fs * 1.3, fs * 0.4); ctx.fill();
    ctx.fillStyle = "#4a2f1f"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(t, x, y + fs * 0.2);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawRooms(S) {
    const fs = Math.round(Math.max(10, Math.min(15, s * 1.9)));
    // えさの へやの たくわえ
    const foodRooms = S.items.filter(it => it.usable && it.type === "food");
    const n = Math.min(30, Math.ceil(S.food / 6));
    foodRooms.forEach((it, ri) => {
      const m = Math.ceil(n / foodRooms.length);
      for (let k = 0; k < m; k++) {
        const fx = it.c[0] - it.r[0] + 2 + (k % 10) * ((it.r[0] * 2 - 4) / 9);
        const col = fx | 0;
        let fy = -1;
        for (let y = Math.ceil(it.c[1] + it.r[1]); y > it.c[1] - it.r[1]; y--) if (S.cell[y * GW + col] === Sim.T_EMPTY) { fy = y + 0.75; break; }
        if (fy < 0) continue;
        fy -= Math.floor(k / 10) * 0.6;
        ctx.fillStyle = ["#e9a23b", "#f3d27a", "#c97b2c"][(k + ri) % 3];
        ctx.beginPath(); ctx.arc(X(fx), Y(fy), s * 0.38, 0, 7); ctx.fill();
      }
    });
    for (const it of S.items) {
      if (!it.usable || !it.type) continue;
      label(Sim.ROOM_NAME[it.type] + "の へや", X(it.c[0]), Y(it.c[1] - it.r[1] - 0.6), fs);
    }
  }

  function drawPher(S, show) {
    if (!show) return;
    if (frame % 4 === 0) {
      const d = pimg.data, p = S.pher;
      for (let i = 0; i < p.length; i++) {
        const v = p[i];
        const o = i * 4;
        if (v > 0.02) { d[o] = 255; d[o + 1] = 60; d[o + 2] = 170; d[o + 3] = Math.min(230, 40 + v * 70); }
        else d[o + 3] = 0;
      }
      pctx.putImageData(pimg, 0, 0);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(pherCv, 0, SURF, GW, GH - SURF, X(0), Y(SURF), GW * s, (GH - SURF) * s);
    ctx.restore();
  }

  // じめんの うえの みち（ありの したに しく ので、ありも みえる）
  function drawTrail(S, show) {
    if (!show) return;
    for (let x = 0; x < GW; x++) {
      const v = S.pher[ROW * GW + x];
      if (v < 0.03) continue;
      ctx.fillStyle = "rgba(255,60,170," + Math.min(0.7, 0.15 + v * 0.16) + ")";
      ctx.fillRect(X(x) - 0.5, Y(ROW - 1.1), s + 1, s * 1.6);
    }
  }

  function drawWeather(S, season) {
    if (S.rain) {
      ctx.fillStyle = "rgba(40,60,90,.22)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(200,225,255,.75)"; ctx.lineWidth = Math.max(1, s * 0.15);
      ctx.beginPath();
      while (drops.length < 90) drops.push({ x: Math.random() * W, y: Math.random() * Y(SURF) });
      for (const d of drops) {
        d.y += s * 1.6; d.x -= s * 0.25;
        if (d.y > Y(SURF)) { d.y = -10; d.x = Math.random() * W * 1.1; }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + s * 0.3, d.y - s * 1.6);
      }
      ctx.stroke();
    } else if (season === "winter") {
      ctx.fillStyle = "rgba(255,255,255,.9)";
      while (drops.length < 60) drops.push({ x: Math.random() * W, y: Math.random() * Y(SURF) });
      for (const d of drops) {
        d.y += s * 0.18; d.x += Math.sin(d.y * 0.05) * 0.5;
        if (d.y > Y(SURF)) { d.y = -5; d.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(1.5, s * 0.3), 0, 7); ctx.fill();
      }
      ctx.fillStyle = "rgba(170,200,240,.12)"; ctx.fillRect(0, Y(SURF), W, H - Y(SURF));
    } else drops.length = 0;
  }

  function drawBubble(S, ui, al) {
    const bb = ui.bubble;
    if (!bb || performance.now() > bb.until) return;
    const a = S.ants.find(o => o.id === bb.id);
    if (!a) return;
    const wx = a.px + (a.x - a.px) * al, wy = a.py + (a.y - a.py) * al;
    const ax = X(wx), ay = Y(wy);
    const L = antLen(S, a) * s;
    ctx.strokeStyle = "#ffcf3d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, L * 0.75, 0, 7); ctx.stroke();
    const fs = Math.round(Math.max(14, Math.min(19, W / 40)));
    ctx.font = "bold " + fs + "px sans-serif";
    const who = a.kind === "queen" ? "じょおう" : a.kind === "male" ? "オス" : a.kind === "gyne" ? "あたらしい じょおう" : "はたらきあり";
    const lines = [who, Sim.stateText(S, a)];
    const w = Math.max(...lines.map(t => ctx.measureText(t).width)) + fs * 1.2;
    const h = fs * 2.9;
    let bx = Math.min(W - w - 6, Math.max(6, ax - w / 2));
    let by = ay - L - h - 10;
    if (by < 6) by = ay + L + 12;
    ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.strokeStyle = "#5c3d2e"; ctx.lineWidth = 2.5;
    roundRect(bx, by, w, h, fs * 0.6); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    const tx = Math.min(bx + w - 14, Math.max(bx + 14, ax));
    if (by < ay) { ctx.moveTo(tx - 8, by + h - 1); ctx.lineTo(ax, ay - L * 0.7); ctx.lineTo(tx + 8, by + h - 1); }
    else { ctx.moveTo(tx - 8, by + 1); ctx.lineTo(ax, ay + L * 0.7); ctx.lineTo(tx + 8, by + 1); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8a5a3c"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "bold " + Math.round(fs * 0.8) + "px sans-serif";
    ctx.fillText(lines[0], bx + fs * 0.6, by + fs * 1.15);
    ctx.fillStyle = "#3a2614"; ctx.font = "bold " + fs + "px sans-serif";
    ctx.fillText(lines[1], bx + fs * 0.6, by + fs * 2.4);
  }

  function drawRipples(ui) {
    const now = performance.now();
    ui.ripples = (ui.ripples || []).filter(r => now - r.t < 600);
    for (const r of ui.ripples) {
      const k = (now - r.t) / 600;
      ctx.strokeStyle = "rgba(255,255,255," + (1 - k) + ")"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x * dpr, r.y * dpr, 8 + k * 30 * dpr, 0, 7); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- そと から よぶ
  const R = {
    init(canvas) {
      cv = canvas; ctx = cv.getContext("2d");
      soil = document.createElement("canvas"); sctx = soil.getContext("2d");
      pherCv = document.createElement("canvas"); pherCv.width = GW; pherCv.height = GH;
      pctx = pherCv.getContext("2d"); pimg = pctx.createImageData(GW, GH);
      bg = document.createElement("canvas");
      R.resize();
    },
    resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      cv.width = W; cv.height = H;
      s = Math.min(W / GW, H / (GH - VY0));
      ox = (W - GW * s) / 2;
      oy = Math.max(0, (H - (GH - VY0) * s) * 0.35);
      bgKey = "";
    },
    reset() { if (soil) soil.width = 0; },
    toWorld(cx, cy) { return { x: (cx * dpr - ox) / s, y: (cy * dpr - oy) / s + VY0 }; },
    scale() { return s / dpr; },
    draw(S, ui, al) {
      frame++;
      const season = Sim.SEASONS[S.season].id;
      const key = season + W + "x" + H;
      if (key !== bgKey) { buildBg(season); bgKey = key; }
      if (!soil.width || S._soilSeed !== S.seed || S.dug.length > 400) soilFull(S);
      else if (S.dug.length) { for (const i of S.dug) soilPatch(S, i); S.dug.length = 0; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(soil, X(0), Y(SURF), GW * s, (GH - SURF) * s);
      // そとがわ（よこに あまった ところ）
      if (ox > 0) { ctx.fillStyle = "#6e4c30"; ctx.fillRect(0, Y(SURF), ox, H); ctx.fillRect(X(GW), Y(SURF), W - X(GW), H); }
      drawMounds(S, season);
      drawRooms(S);
      drawHazards(S);
      drawFoods(S);
      drawBrood(S);
      drawTrail(S, ui.pher);
      for (const a of S.ants) drawAnt(S, a, al);
      drawPher(S, ui.pher);
      drawWeather(S, season);
      drawBubble(S, ui, al);
      drawRipples(ui);
    },
    // むしめがね・ずかん よう
    drawBig(c, w, h, kind, species, opt) {
      const look = Object.assign({}, SPECIES_LOOK[species] || SPECIES_LOOK.kurooo, opt && opt.look || {});
      const k = Math.min(w / 17, h / 10);
      c.save();
      c.translate(w * 0.47, h * 0.5);
      c.rotate(-0.0);
      c.scale(k, k);
      antBody(c, kind, look, 0.8, true, Object.assign({ minLw: 0.45 }, opt || {}));
      c.restore();
      return k;
    },
    SPECIES_LOOK,
  };
  ARI.Render = R;
})();
