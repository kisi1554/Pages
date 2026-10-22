// やきゅう しあい — Canvas で えがく（だせきの 3D がめん・1るいの カメラ・うえから みた きゅうじょう）
(function (root) {
  "use strict";
  const YS = root.YS, YC = root.YC;
  let cv, ctx, W = 0, H = 0, dpr = 1;

  function init(canvas) { cv = canvas; ctx = cv.getContext("2d"); resize(); }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, root.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const size = () => ({ W, H });

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function label(text, x, y, px, color, stroke) {
    ctx.font = "900 " + Math.round(px) + "px \"Hiragino Maru Gothic ProN\",\"BIZ UDPGothic\",\"Meiryo\",sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (stroke) { ctx.lineJoin = "round"; ctx.lineWidth = Math.max(3, px * 0.22); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color || "#fff"; ctx.fillText(text, x, y);
  }

  // ===================== 3D の カメラ =====================
  // せかいの ざひょう: (x, y) が じめん（ホーム (0,0)、y が センター）、z が たかさ（めーとる）。
  // cam: { x, y, h（たかさ）, yaw（むき: 0 で センター、プラスで ライトがわ）, tilt（うえむき）, f（しょうてん px）, cx, cy }
  const NEAR = 0.4;
  let cam = { x: 0, y: -4, h: 1.3, yaw: 0, tilt: 0, f: 500, cx: 0, cy: 0 };
  function camSpace(x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, dz = (z || 0) - cam.h;
    const sy = Math.sin(cam.yaw), cyw = Math.cos(cam.yaw);
    const fwd = dx * sy + dy * cyw, right = dx * cyw - dy * sy;
    const st = Math.sin(cam.tilt), ct = Math.cos(cam.tilt);
    return { r: right, u: dz * ct - fwd * st, d: fwd * ct + dz * st };
  }
  function projC(c) { const s = cam.f / c.d; return { x: cam.cx + c.r * s, y: cam.cy - c.u * s, s, d: c.d }; }
  function proj(x, y, z) { const c = camSpace(x, y, z); return c.d < NEAR ? null : projC(c); }
  // ちかすぎて カメラの うしろに なる ところを きって から えがく
  function clipPoly(cs) {
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length];
      const ain = a.d >= NEAR, bin = b.d >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const u = (NEAR - a.d) / (b.d - a.d);
        out.push({ r: a.r + (b.r - a.r) * u, u: a.u + (b.u - a.u) * u, d: NEAR });
      }
    }
    return out;
  }
  function polyW(pts, fill, stroke, lw) {
    const cs = clipPoly(pts.map((p) => camSpace(p[0], p[1], p[2])));
    if (cs.length < 3) return;
    ctx.beginPath();
    cs.forEach((c, i) => { const p = projC(c); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function lineW(a, b, color, lw) {
    let A = camSpace(a[0], a[1], a[2]), B = camSpace(b[0], b[1], b[2]);
    if (A.d < NEAR && B.d < NEAR) return;
    if (A.d < NEAR) { const u = (NEAR - A.d) / (B.d - A.d); A = { r: A.r + (B.r - A.r) * u, u: A.u + (B.u - A.u) * u, d: NEAR }; }
    if (B.d < NEAR) { const u = (NEAR - B.d) / (A.d - B.d); B = { r: B.r + (A.r - B.r) * u, u: B.u + (A.u - B.u) * u, d: NEAR }; }
    const p = projC(A), q = projC(B);
    ctx.strokeStyle = color; ctx.lineWidth = lw || 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  const D2R = Math.PI / 180;
  const polar = (deg, r) => [Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r];

  // バッティングセンターと おなじ カメラ（キャッチャーの うしろ、めの たかさ）
  function batCam() {
    return { x: 0, y: -4, h: 1.3, yaw: 0, tilt: 0, f: Math.min(H * 1.15, W * 1.5), cx: W / 2, cy: H * 0.36 };
  }
  // うしろに さがった ひろい カメラ（うった あと）
  function wideF() { return Math.min(W * 0.85, H * 1.05); }

  // ===================== 3D の きゅうじょう =====================
  // フェアの フェンス と ファウルがわの かべ（ぐるっと ひとまわり）
  const RIM = (() => {
    const pts = [];
    for (let d = -45; d <= 45; d += 3) { const [x, y] = polar(d, YS.fenceDist(d)); pts.push({ x, y, h: YS.FENCE_H, fair: true }); }
    [[78, 62], [50, 12], [22, -16], [0, -22], [-22, -16], [-50, 12], [-78, 62]].forEach(([x, y]) => pts.push({ x, y, h: 1.4, fair: false }));
    return pts;
  })();
  const OUT_C = { x: 0, y: 35 };
  const crowd = Array.from({ length: 260 }, (_, i) => ({ k: Math.random(), up: 0.15 + Math.random() * 0.8, c: ["#ff6b6b", "#ffd43b", "#74c0fc", "#fff", "#ff8cc6", "#8ce99a"][i % 6], ph: Math.random() * 6 }));
  const DIRT = (() => {
    const pts = [[0, -4.5, 0]];
    // (30,20) → (0,62) を ひかえ に → (-30,20) の 2じ ベジエ
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, a = 1 - u;
      pts.push([a * a * 30 + 2 * a * u * 0 + u * u * -30, a * a * 20 + 2 * a * u * 62 + u * u * 20, 0]);
    }
    return pts;
  })();
  const ring = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 6.283) * r, cy + Math.sin(i / n * 6.283) * r, 0]);

  function drawWorld(time, cheer, noSign) {
    // そら
    const far = proj(cam.x + Math.sin(cam.yaw) * 2000, cam.y + Math.cos(cam.yaw) * 2000, cam.h);
    const hy = far ? far.y : H * 0.4;
    const sky = ctx.createLinearGradient(0, Math.min(0, hy - H), 0, Math.max(hy, 1));
    sky.addColorStop(0, "#4ea8ec"); sky.addColorStop(1, "#c5e8ff");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // スタンド（かべの うえから そとへ のぼる）
    for (let i = 0; i < RIM.length; i++) {
      const a = RIM[i], b = RIM[(i + 1) % RIM.length];
      const oa = norm(a.x - OUT_C.x, a.y - OUT_C.y), ob = norm(b.x - OUT_C.x, b.y - OUT_C.y);
      polyW([[a.x, a.y, a.h], [b.x, b.y, b.h], [b.x + ob.x * 26, b.y + ob.y * 26, 15], [a.x + oa.x * 26, a.y + oa.y * 26, 15]], i % 2 ? "#3d4a63" : "#46536e");
    }
    // おきゃくさん
    crowd.forEach((c, i) => {
      const k = c.k * RIM.length, i0 = Math.floor(k) % RIM.length, f = k - Math.floor(k);
      const a = RIM[i0], b = RIM[(i0 + 1) % RIM.length];
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, h = a.h + (b.h - a.h) * f;
      const o = norm(x - OUT_C.x, y - OUT_C.y);
      const bob = cheer ? Math.abs(Math.sin(time * 9 + c.ph)) * 0.8 : 0;
      const p = proj(x + o.x * 26 * c.up, y + o.y * 26 * c.up, h + (15 - h) * c.up + 0.4 + bob);
      if (!p || p.x < -5 || p.x > W + 5) return;
      ctx.fillStyle = c.c;
      ctx.fillRect(p.x - Math.max(1, p.s * 0.35), p.y - Math.max(1, p.s * 0.35), Math.max(2, p.s * 0.7), Math.max(2, p.s * 0.7));
    });
    // じめん（ファウルゾーン）
    polyW(RIM.map((p) => [p.x, p.y, 0]), "#2f9e44");
    // フェアの しばふ
    const fair = [[0, 0, 0]].concat(RIM.filter((p) => p.fair).map((p) => [p.x, p.y, 0]));
    polyW(fair, "#40c057");
    for (let r = 50; r < 110; r += 16) {
      const band = [];
      for (let d = -45; d <= 45; d += 5) band.push(polar(d, r).concat(0));
      for (let d = 45; d >= -45; d -= 5) band.push(polar(d, Math.min(r + 8, YS.fenceDist(d) - 0.3)).concat(0));
      polyW(band, "rgba(255,255,255,.07)");
    }
    // ないや
    polyW(DIRT, "#d9a066");
    polyW([[0, 4, 0], [16, 19.4, 0], [0, 35, 0], [-16, 19.4, 0]], "#40c057");
    polyW(ring(0, 18.4, 2.8, 18), "#c98a4b");
    polyW(ring(0, 0, 4, 18), "#d9a066");
    // ライン
    const L45 = YS.fenceDist(45) * Math.SQRT1_2;
    lineW([0, 0, 0], [L45, L45, 0], "#fff", 2);
    lineW([0, 0, 0], [-L45, L45, 0], "#fff", 2);
    // バッターボックス・ホームベース・ベース
    polyW([[-1.45, -0.9, 0], [-0.42, -0.9, 0], [-0.42, 0.9, 0], [-1.45, 0.9, 0]], null, "rgba(255,255,255,.8)", 2);
    polyW([[1.45, -0.9, 0], [0.42, -0.9, 0], [0.42, 0.9, 0], [1.45, 0.9, 0]], null, "rgba(255,255,255,.8)", 2);
    polyW([[-0.22, 0.22, 0.01], [0.22, 0.22, 0.01], [0.22, 0, 0.01], [0, -0.22, 0.01], [-0.22, 0, 0.01]], "#fff");
    for (let b = 1; b <= 3; b++) {
      const p = YS.BASES[b];
      polyW([[p.x - 0.45, p.y, 0.08], [p.x, p.y + 0.45, 0.08], [p.x + 0.45, p.y, 0.08], [p.x, p.y - 0.45, 0.08]], "#fff");
    }
    // フェンス（かべ）
    for (let i = 0; i < RIM.length; i++) {
      const a = RIM[i], b = RIM[(i + 1) % RIM.length];
      polyW([[a.x, a.y, 0], [b.x, b.y, 0], [b.x, b.y, b.h], [a.x, a.y, a.h]], a.fair && b.fair ? "#1b5e2b" : "#2b4d3a");
      if (a.fair && b.fair) lineW([a.x, a.y, a.h], [b.x, b.y, b.h], "#ffd43b", 2);
    }
    // ホームランの かんばん
    const sg = proj(0, YS.fenceDist(0) + 0.5, YS.FENCE_H + 2.2);
    if (sg && sg.s > 1.2 && !noSign) label("ホームラン", sg.x, sg.y, Math.max(9, sg.s * 2.6), "#ffd43b", "#1b4d2b");
  }
  function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }

  // せんしゅを 3D に たてる（とおくても みえるように すこし おおきく）
  function person3D(x, y, team, pl, opt) {
    const p = proj(x, y, 0);
    if (!p || p.x < -60 || p.x > W + 60) return null;
    const o = opt || {};
    const s = Math.max(p.s * 1.2, 6);
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    YC.drawChara(ctx, p.x, p.y, s, team, pl, {
      glove: !!o.glove, mood: o.mood, run: o.moving ? ((o.time || 0) * 2.4) % 1 : null,
    }, o.time || 0);
    ctx.globalAlpha = 1;
    return { p, s };
  }
  function ball3D(b, trail) {
    const g = proj(b.x, b.y, 0), q = proj(b.x, b.y, b.z);
    if (!q) return;
    const r = Math.max(2.6, 0.085 * q.s);
    if (g) { ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    if (trail) trail.forEach((tb, i) => {
      const tq = proj(tb.x, tb.y, tb.z);
      if (!tq) return;
      ctx.globalAlpha = 0.12 + 0.08 * i;
      circle(tq.x, tq.y, Math.max(1.5, 0.07 * tq.s), "#fff");
    });
    ctx.globalAlpha = 1;
    drawBall2(q.x, q.y, r);
    return q;
  }
  // ===================== だせき（バッティングセンターと おなじ みため） =====================
  // ふるい よびかた: P(よこ, たかさ, おく) → せかいの (x, y=おく, z=たかさ)
  function P(x, y, z) { return proj(x, z, y) || { x: -999, y: -999, s: 0.01 }; }
  const ZW = 0.22, ZY = 0.75, ZH = 0.3;              // ストライクゾーン（バッティングセンターの わくと おなじ）
  const zoneW = (zx, zy) => ({ x: zx * ZW, y: ZY + zy * ZH });
  const REL = { x: -0.3, y: 1.85, z: 17.2 };          // ボールを はなす ところ
  const SWING_DUR = 0.28;

  // ボールの いち（u = 0 はなした とき 〜 1 ホーム）
  function pitchBallAt(pitch, u) {
    const f = zoneW(pitch.x, pitch.y);
    const arc = pitch.type === "slow" ? 0.75 : pitch.type === "curve" ? 0.45 : 0.18;
    const brk = (pitch.brk || 0) * 0.55 * (1 - u) * (1 - u) * u * 3.2;
    return {
      x: REL.x + (f.x - REL.x) * u - brk,
      y: REL.y + (f.y - REL.y) * u + arc * Math.sin(Math.PI * Math.min(1, u)),
      z: REL.z * (1 - u),
    };
  }
  // スクリーンの x から ねらい（タップの いち）
  function aimFromX(px) { return Math.max(-1, Math.min(1, (px - W / 2) / (W * 0.33))); }

  function drawPitchScene(v) {
    cam = batCam();
    const t = v.time;
    drawWorld(t, v.cheer, true);
    const objs = [];
    const def = v.def;
    if (def) {
      // しゅびに ついて いる せんしゅ（キャッチャーは カメラの まえなので かかない）
      YS.FIELD_POS.forEach((fp, i) => {
        if (i <= 1) return;
        objs.push({ d: camSpace(fp.x, fp.y, 0).d, draw: () => person3D(fp.x, fp.y, v.fieldTeam, def[i], { glove: true, time: t }) });
      });
    }
    if (v.bases && v.bat) v.bases.forEach((rn, i) => {
      if (!rn) return;
      const p = pathPos(i + 1, 2.5);
      objs.push({ d: camSpace(p.x, p.y, 0).d, draw: () => person3D(p.x, p.y, v.batTeam, v.bat[rn.p], { time: t }) });
    });
    const pu = v.pitch && v.pitchT0 != null ? (t - v.pitchT0) / v.pitch.time : -1;
    const windup = v.windupT0 != null ? Math.min(1, (t - v.windupT0) / 0.8) : 0;
    objs.push({ d: camSpace(0, 18.4, 0).d, draw: () => { const m = proj(0, 18.4, 0); if (m) drawPitcher(m.x, m.y, Math.max(m.s * 1.2, 6), v.fieldTeam, v.pitcher, windup, pu, t); } });
    objs.sort((a, b) => b.d - a.d).forEach((o) => o.draw());

    // ゾーン（てんせん）
    const z0 = P(-ZW, ZY + ZH, 0), z1 = P(ZW, ZY - ZH, 0);
    ctx.strokeStyle = v.showZone ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.4)"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]); ctx.strokeRect(z0.x, z0.y, z1.x - z0.x, z1.y - z0.y); ctx.setLineDash([]);
    if (v.showZone) {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x = z0.x + (z1.x - z0.x) * i / 3, y = z0.y + (z1.y - z0.y) * i / 3;
        ctx.beginPath(); ctx.moveTo(x, z0.y); ctx.lineTo(x, z1.y); ctx.moveTo(z0.x, y); ctx.lineTo(z1.x, y); ctx.stroke();
      }
    }
    if (v.target != null) {
      const tg = YS.cellTarget(v.target), zw = zoneW(tg.x, tg.y), q = P(zw.x, zw.y, 0);
      ctx.strokeStyle = "#ffd43b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 0.09, 0, Math.PI * 2); ctx.stroke();
    }

    // バッター
    const bp = P(-0.85, 0, 0);
    const mood = v.mood && t - v.mood.t0 < 1.8 ? v.mood.type : "normal";
    drawChara(bp.x, bp.y, bp.s, v.batTeam, v.batter, v.swingT0 != null ? (t - v.swingT0) / SWING_DUR : -1, v.bunt, mood, t);

    // タイミングの わ（バッティングセンターと おなじ: のこり 0.8びょうから ちぢむ）
    const swung = v.swingT0 != null && v.pitchT0 != null && v.swingT0 >= v.pitchT0;
    if (v.ring && v.pitch && pu >= 0 && !swung) {
      const rem = v.pitchT0 + v.pitch.time - t;
      if (rem > -0.05 && rem < 0.8) {
        const f = zoneW(v.pitch.x, v.pitch.y), c = P(f.x, f.y, 0);
        const r = 0.1 * c.s + Math.max(0, rem) * c.s * 1.6;
        ctx.strokeStyle = "rgba(255,226,90," + (0.35 + 0.5 * (1 - Math.min(1, rem / 0.8))) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // ボール
    if (v.pitch && pu >= 0 && pu < 1.25 && !v.hideBall) {
      const b = pitchBallAt(v.pitch, Math.min(pu, 1.25));
      ball3D({ x: b.x, y: b.z, z: b.y });
    }
    if (v.pitch && v.showLanding) {
      const f = zoneW(v.pitch.x, v.pitch.y), q = P(f.x, f.y, 0);
      circle(q.x, q.y, q.s * 0.05, "rgba(255,255,255,.9)", v.pitch.inZone ? "#ff6b6b" : "#4dabf7", 3);
    }
  }

  // バッター（batting-center の キャラと おなじ かきかた: chara.js）
  function drawChara(px, py, s, team, pl, u, bunt, mood, time) {
    if (!team) return;
    YC.drawChara(ctx, px, py, s, team, pl, { bat: !bunt, bunt, u, mood }, time);
  }
  // ===================== ひと・ボール =====================
  function drawBall2(x, y, r) {
    circle(x, y, r, "#fff", "rgba(0,0,0,.25)", 1);
    if (r > 5) {
      ctx.strokeStyle = "#e03131"; ctx.lineWidth = Math.max(1, r * 0.13);
      ctx.beginPath(); ctx.arc(x - r * 0.95, y, r * 0.65, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.95, y, r * 0.65, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    }
  }

  // ピッチャー: ふりかぶって なげる
  function drawPitcher(x, y, s, team, pl, windup, pu, time) {
    if (!team) return;
    let arm;
    if (pu >= 0 && pu < 0.5) arm = -2.4 + Math.min(1, pu / 0.25) * 3.3;        // なげおわり
    else if (windup > 0 && pu < 0) arm = 1.2 - windup * 3.6;                    // ふりかぶる
    else arm = 1.2;
    YC.drawChara(ctx, x, y, s, team, pl, { glove: true, arm, num: 1, ballInHand: pu < 0 }, time);
  }

  // ===================== うえから みた きゅうじょう =====================
  let K = 1, OX = 0, OY = 0;
  function fieldLayout() {
    K = Math.min(W / 136, H / 124);
    OX = W / 2; OY = H / 2 + 53 * K;
  }
  const SC = (x, y) => ({ x: OX + x * K, y: OY - y * K });
  function screenOfBase(b) { fieldLayout(); const p = YS.BASES[b % 4]; return SC(p.x, p.y); }

  function drawFieldBase() {
    fieldLayout();
    ctx.fillStyle = "#3d4a63"; ctx.fillRect(0, 0, W, H);
    // スタンド
    const fence = (d) => YS.fenceDist(d);
    const pts = [];
    for (let d = -45; d <= 45; d += 3) { const r = fence(d), a = d * Math.PI / 180; pts.push(SC(Math.sin(a) * r, Math.cos(a) * r)); }
    // ファウルゾーン
    ctx.fillStyle = "#2b8a3e";
    ctx.beginPath(); ctx.moveTo(SC(-75, -10).x, SC(-75, -10).y);
    for (let d = -60; d <= 60; d += 4) { const r = fence(d) + 4, a = d * Math.PI / 180; const p = SC(Math.sin(a) * r, Math.cos(a) * r); ctx.lineTo(p.x, p.y); }
    ctx.lineTo(SC(75, -10).x, SC(75, -10).y); ctx.closePath(); ctx.fill();
    // フェア
    const h = SC(0, 0);
    ctx.beginPath(); ctx.moveTo(h.x, h.y); pts.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = "#37b24d"; ctx.fill();
    ctx.save(); ctx.clip();
    for (let r = 10; r < 120; r += 12) { ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 6 * K; ctx.beginPath(); ctx.arc(h.x, h.y, r * K, Math.PI, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // フェンス
    ctx.strokeStyle = "#1b4d2b"; ctx.lineWidth = Math.max(4, 2.2 * K);
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = "#ffd43b"; ctx.lineWidth = Math.max(1.5, 0.6 * K); ctx.stroke();
    // ないや
    ctx.fillStyle = "#d9a066";
    ctx.beginPath(); ctx.moveTo(h.x, h.y + 4 * K);
    const ip = [SC(26, 22), SC(0, 46), SC(-26, 22)];
    ctx.lineTo(SC(30, 20).x, SC(30, 20).y);
    ctx.quadraticCurveTo(SC(0, 62).x, SC(0, 62).y, SC(-30, 20).x, SC(-30, 20).y);
    ctx.closePath(); ctx.fill();
    void ip;
    ctx.fillStyle = "#40a84f";
    const g1 = SC(0, 4), g2 = SC(16, 19.4), g3 = SC(0, 35), g4 = SC(-16, 19.4);
    ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.lineTo(g3.x, g3.y); ctx.lineTo(g4.x, g4.y); ctx.closePath(); ctx.fill();
    const m = SC(0, 18.4); circle(m.x, m.y, 2.8 * K, "#c98a4b");
    circle(h.x, h.y, 4 * K, "#d9a066");
    // ライン
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, 0.35 * K);
    [-1, 1].forEach((sx) => { const a = SC(sx * fence(45) * Math.SQRT1_2, fence(45) * Math.SQRT1_2); ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(a.x, a.y); ctx.stroke(); });
    // ベース
    for (let b = 1; b <= 3; b++) {
      const p = screenOfBase(b), r = Math.max(4, 0.9 * K);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath(); ctx.fill();
    }
    const r = Math.max(4, 0.9 * K);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(h.x - r, h.y - r * 0.6); ctx.lineTo(h.x + r, h.y - r * 0.6); ctx.lineTo(h.x + r, h.y + r * 0.2); ctx.lineTo(h.x, h.y + r); ctx.lineTo(h.x - r, h.y + r * 0.2); ctx.closePath(); ctx.fill();
    if (!MINI) label("ホームラン", SC(0, fence(0) + 6).x, SC(0, fence(0) + 6).y, Math.max(11, 4 * K), "#ffd43b", "#1b4d2b");
  }

  function pathPos(base, d) {
    // base（0〜3）から るいかんに そって d めーとる すすんだ ところ
    let b = base, rest = d;
    while (rest > YS.BASE && b < 4) { rest -= YS.BASE; b++; }
    if (b >= 4) return { x: 0, y: 0 };
    const a = YS.BASES[b], n = YS.BASES[(b + 1) % 4];
    const u = Math.max(0, Math.min(1, rest / YS.BASE));
    return { x: a.x + (n.x - a.x) * u, y: a.y + (n.y - a.y) * u };
  }
  function runnerAt(a, t) {
    if (a.s == null || t < a.s) {
      const lead = a.s == null || a.batter ? 0 : a.lead * Math.min(1, Math.max(0, t) / 0.4);
      return { p: pathPos(a.base, Math.min(lead, a.lead || 0)), alpha: 1 };
    }
    let tt = t, alpha = 1;
    if (a.outAt != null && t > a.outAt) { tt = a.outAt; alpha = Math.max(0, 1 - (t - a.outAt) / 0.9); }
    let d = (tt - a.s) * a.v + (a.batter ? 0 : a.lead);
    let maxD = Math.max(0, (a.target - a.base) * YS.BASE);
    if (a.batter && a.target === 0) maxD = a.stopAt != null ? (a.stopAt - a.s) * a.v : 8;
    d = Math.max(0, Math.min(d, maxD));
    if (a.target >= 4 && d >= maxD) alpha = Math.max(0, 1 - (tt - (a.s + (maxD - (a.batter ? 0 : a.lead)) / a.v)) / 0.8);
    return { p: pathPos(a.base, d), alpha, home: a.target >= 4 && d >= maxD };
  }

  // ボールの いち（だきゅう → グラブ → そうきゅう）
  function playBallAt(play, t) {
    const fe = play.fe, pb = play.pb;
    if (fe.hr || t < fe.t) { const b = YS.ballAt(pb, t); return { x: b.x, y: b.y, z: b.z }; }
    let pos = { x: fe.x, y: fe.y, z: 1 };
    for (const th of play.throws) {
      const to = YS.BASES[th.to % 4];
      if (t < th.t0) return pos;
      if (t < th.t1) {
        const u = (t - th.t0) / (th.t1 - th.t0);
        const tx = th.wild ? to.x + 6 : to.x, ty = th.wild ? to.y - 4 : to.y;
        return { x: th.from.x + (tx - th.from.x) * u, y: th.from.y + (ty - th.from.y) * u, z: 1.5 + Math.sin(Math.PI * u) * Math.min(6, Math.hypot(tx - th.from.x, ty - th.from.y) * 0.08) };
      }
      pos = { x: th.wild ? to.x + 6 : to.x, y: th.wild ? to.y - 4 : to.y, z: 1 };
    }
    return pos;
  }

  function sprite(x, y, team, pl, alpha, runner) {
    const r = MINI ? Math.max(3, 2.4 * K) : Math.max(11, 2.8 * K);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    circle(x, y, r, runner ? team.color : "#fff", runner ? "#fff" : team.color, Math.max(1.5, r * 0.18));
    if (!MINI) YC.face(ctx, x, y, r * 0.9, team, pl);
    ctx.globalAlpha = 1;
  }

  // ===================== プレーの ようす（だれが どこに いるか） =====================
  const CATCH_KINDS = ["fly", "pop", "liner", "foulfly", "sf"];
  function playState(v) {
    const play = v.play, t = v.t, a = play.anim, fe = play.fe;
    const fs = YS.fielders(v.def);
    const covered = new Set();
    const fielders = fs.map((f, i) => {
      let x = f.x, y = f.y, moving = false;
      if (i === a.chaser && fe && !fe.hr) {
        const d = Math.hypot(fe.x - f.x, fe.y - f.y);
        const tArr = Math.min(fe.t, f.react + Math.max(0, d - 1.3) / f.v);
        const u = Math.max(0, Math.min(1, (t - f.react) / Math.max(0.01, tArr - f.react)));
        x = f.x + (fe.x - f.x) * u; y = f.y + (fe.y - f.y) * u;
        moving = u > 0 && u < 1;
      } else {
        const c = a.covers.find((c) => c.f === i && !covered.has(i) && c.base);
        if (c) {
          covered.add(i);
          const bp = YS.BASES[c.base % 4];
          const sp = { x: bp.x, y: bp.y + (c.base === 4 ? -1.2 : 0) };
          const u = Math.max(0, Math.min(1, (t - 0.3) / (Math.hypot(sp.x - f.x, sp.y - f.y) / f.v + 0.01)));
          x = f.x + (sp.x - f.x) * u; y = f.y + (sp.y - f.y) * u;
          moving = u > 0 && u < 1;
        } else if (fe && !fe.hr && i >= 6) {
          const u = Math.min(1, t / 3) * 0.25;
          x = f.x + (fe.x - f.x) * u; y = f.y + (fe.y - f.y) * u;
          moving = t < 3;
        }
      }
      return { i, x, y, moving };
    });
    const runners = a.runners.map((rn) => {
      const q = runnerAt(rn, t);
      let { x, y } = q.p;
      if (rn.batter && (rn.s == null || t < rn.s)) { x = -0.8; y = 0; }
      const moving = rn.s != null && t > rn.s && !q.home && (rn.outAt == null || t < rn.outAt) && q.alpha > 0.95;
      return { rn, x, y, alpha: q.alpha, moving };
    });
    const ball = playBallAt(play, t);
    // しるし（キャッチ・おちた・アウト・セーフ・ホームイン）
    const marks = [];
    const caught = fe.air && CATCH_KINDS.includes(play.kind);
    if (fe.hr) marks.push({ t: play.pb.T, x: ball.x, y: ball.y, text: "ホームラン！", color: "#ffd43b" });
    else if (fe.air && caught) marks.push({ t: fe.t, x: fe.x, y: fe.y, text: "キャッチ！", color: "#ff6b6b" });
    else if (fe.air && play.error) marks.push({ t: fe.t - 1.0, x: fe.x, y: fe.y, text: "ポロッ！", color: "#ffa94d" });
    else if (!fe.foul && play.pb.T > 0.8 && fe.t > play.pb.T + 0.05) {
      const l = YS.ballAt(play.pb, play.pb.T);
      marks.push({ t: play.pb.T, x: l.x, y: l.y, text: fe.f <= 5 ? "ワンバウンド" : "とれない！", color: "#74c0fc" });
    }
    if (play.kind === "foul") marks.push({ t: play.pb.T, x: ball.x, y: ball.y, text: "ファウル", color: "#fff" });
    a.marks.forEach((m) => { const b = YS.BASES[m.base % 4]; marks.push({ t: m.t, x: b.x, y: b.y, text: m.text, color: "#ff6b6b" }); });
    a.runners.forEach((rn) => {
      if (rn.s == null || rn.outAt != null || rn.target <= rn.base) return;
      const ta = rn.s + ((rn.target - rn.base) * YS.BASE - (rn.batter ? 0 : rn.lead)) / rn.v;
      const b = YS.BASES[rn.target % 4];
      if (rn.target >= 4) marks.push({ t: ta, x: b.x, y: b.y, text: "ホームイン！", color: "#ffd43b" });
      else if (rn.batter || play.throws.some((th) => th.to === rn.target)) marks.push({ t: ta, x: b.x, y: b.y, text: "セーフ！", color: "#51cf66" });
    });
    return { fielders, runners, ball, marks: marks.filter((m) => !play.fe.hr || m.text !== "ホームイン！") };
  }

  // ===================== うった あとの 3D（だせき → 1るい の カメラ） =====================
  const angWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const FIRST_CAM = { x: 30, y: 24, h: 8 };
  function drawPlay3D(v) {
    if (v.overhead) { drawPlay(v); return; }
    const S = playState(v), t = v.t, play = v.play, fe = play.fe, ball = S.ball;
    const first = t >= (v.switchT == null ? Infinity : v.switchT);
    if (!v.cam || v.cam.first !== first) {
      v.cam = { first, yaw: 0, tilt: 0, last: v.time, flash: first ? v.time : null, init: true };
    }
    const C = v.cam;
    let base, yawT, tiltT;
    if (!first) {
      const e = Math.min(1, t / 0.7), k = e * e * (3 - 2 * e);
      const b0 = batCam();
      // バックネットの うえまで さがって、ボールを おいかける
      base = { x: 0, y: -4 - 9 * k, h: 1.3 + 6 * k, f: b0.f + (wideF() - b0.f) * k, cx: W / 2, cy: H * (0.36 + 0.1 * k) };
      yawT = YS.clamp(Math.atan2(ball.x, ball.y - base.y) * 0.85, -0.75, 0.75) * k;
      const dist = Math.hypot(ball.x, ball.y - base.y);
      tiltT = YS.clamp(Math.max(-0.2, Math.atan2(ball.z - base.h, dist) - 0.12), -0.2, 0.75) * k;
    } else {
      // 1るいの ななめ うしろ（ライトがわ）の たかい ところから、1るい と ホームの あいだを みる
      base = { x: FIRST_CAM.x, y: FIRST_CAM.y, h: FIRST_CAM.h, f: Math.min((W / 2) / Math.tan(34 * D2R), H * 0.75), cx: W / 2, cy: H * 0.45 };
      const tx = 8, ty = 12;
      const y0 = Math.atan2(tx - base.x, ty - base.y);
      const yb = Math.atan2(ball.x - base.x, ball.y - base.y);
      yawT = y0 + YS.clamp(angWrap(yb - y0) * 0.5, -0.45, 0.45);
      const down = -Math.atan2(base.h, Math.hypot(tx - base.x, ty - base.y));
      const dist = Math.hypot(ball.x - base.x, ball.y - base.y);
      tiltT = down + YS.clamp((Math.atan2(ball.z - base.h, dist) - down) * 0.4, 0, 0.35);
    }
    if (C.init) { C.yaw = yawT; C.tilt = tiltT; C.init = false; }
    const dt = Math.max(0, v.time - C.last); C.last = v.time;
    const kk = 1 - Math.exp(-dt * 6);
    C.yaw += angWrap(yawT - C.yaw) * kk; C.tilt += (tiltT - C.tilt) * kk;
    cam = Object.assign(base, { yaw: C.yaw, tilt: C.tilt });

    drawWorld(v.time, play.hit || fe.hr);
    const caught = fe.air && CATCH_KINDS.includes(play.kind);
    const objs = [];
    S.fielders.forEach((f) => {
      if (f.i === 1 && !first) return;           // キャッチャーは カメラの まえ
      const mood = f.i === play.anim.chaser && caught && t > fe.t && t < fe.t + 2 ? "joy" : f.i === play.anim.chaser && play.hit && t > fe.t ? "oops" : null;
      objs.push({ d: camSpace(f.x, f.y, 0).d, draw: () => person3D(f.x, f.y, v.fieldTeam, v.def[f.i], { glove: true, moving: f.moving, time: v.time, mood }) });
    });
    S.runners.forEach((r) => {
      if (r.alpha <= 0) return;
      const rn = r.rn;
      const mood = rn.outAt != null && t > rn.outAt ? "sad" : (play.hit || fe.hr) && t > Math.min(fe.t, 1.2) ? "joy" : caught && rn.batter && t > fe.t ? "sad" : null;
      objs.push({ d: camSpace(r.x, r.y, 0).d, draw: () => person3D(r.x, r.y, v.batTeam, v.bat[r.rn.p], { moving: r.moving, time: v.time, alpha: r.alpha, mood }) });
    });
    const trail = [];
    if (t < fe.t || fe.hr) for (let k = 5; k >= 1; k--) { if (t - k * 0.035 > 0) trail.push(playBallAt(play, t - k * 0.035)); }
    objs.push({ d: camSpace(ball.x, ball.y, ball.z).d - 0.3, draw: () => ball3D(ball, trail) });
    objs.sort((a, b) => b.d - a.d).forEach((o) => o.draw());
    // しるし
    S.marks.forEach((m) => {
      if (t < m.t || t > m.t + 1.4) return;
      const p = proj(m.x, m.y, 3.4);
      if (!p) return;
      const px = YS.clamp(p.s * 1.3, 16, 34);
      label(m.text, YS.clamp(p.x, px * 2.5, W - px * 2.5), YS.clamp(p.y, px, H - px), px, m.color, "rgba(0,0,0,.7)");
    });
    if (first) {
      label("📺 1るいの カメラ", 78, H - 16, 14, "#fff", "rgba(0,0,0,.6)");
      if (C.flash != null && v.time - C.flash < 0.25) { ctx.fillStyle = "rgba(255,255,255," + (1 - (v.time - C.flash) / 0.25) * 0.7 + ")"; ctx.fillRect(0, 0, W, H); }
    }
    drawMini(v);
  }
  // みぎうえの ちいさな ちず
  let MINI = false;
  function drawMini(v) {
    const size = Math.round(Math.min(W, H) * 0.3), x0 = W - size - 8, y0 = 44;
    const sw = W, sh = H;
    ctx.save();
    rr(x0, y0, size, size, 10); ctx.clip();
    ctx.translate(x0, y0);
    W = size; H = size; MINI = true;
    try { drawPlay(v); } finally { W = sw; H = sh; MINI = false; ctx.restore(); }
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
    rr(x0, y0, size, size, 10); ctx.stroke();
  }

  // うえから みた ず（なげる るいを えらぶ とき・ちいさな ちず）
  function drawPlay(v) {
    drawFieldBase();
    const S = playState(v);
    S.fielders.forEach((f) => { const p = SC(f.x, f.y); sprite(p.x, p.y, v.fieldTeam, v.def[f.i], 1, false); });
    S.runners.forEach((r) => { if (r.alpha > 0) { const p = SC(r.x, r.y); sprite(p.x, p.y, v.batTeam, v.bat[r.rn.p], r.alpha, true); } });
    const b = S.ball, g = SC(b.x, b.y);
    const lift = b.z * K * 0.55;
    const rad = MINI ? Math.max(2, (0.55 + b.z * 0.04) * K * 1.4) : Math.max(3.5, (0.55 + b.z * 0.04) * K);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    drawBall2(g.x, g.y - lift, rad);
    if (!MINI) S.marks.forEach((m) => {
      if (v.t >= m.t && v.t < m.t + 1.4) { const p = SC(m.x, m.y); label(m.text, p.x, p.y - 7 * K, Math.max(16, 4.5 * K), m.color, "rgba(0,0,0,.6)"); }
    });
  }
  // ===================== えんしゅつ =====================
  const parts = [];
  function confetti(n) {
    const cols = ["#ff6b6b", "#ffd43b", "#74c0fc", "#8ce99a", "#ff8cc6", "#fff"];
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -10 - Math.random() * H * 0.3, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, c: cols[i % 6], r: 3 + Math.random() * 4, life: 2.5 + Math.random() });
  }
  function drawFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || p.y > H + 10) { parts.splice(i, 1); continue; }
      ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r * 0.6);
    }
  }
  // もじの えんしゅつ（batting-center の ポップと おなじ うごき）
  function big(text, color, t, sub) {
    if (!text) return;
    const k = t < 0.18 ? 0.4 + t / 0.18 * 0.8 : t < 0.3 ? 1.2 - (t - 0.18) / 0.12 * 0.2 : 1;
    const fs = Math.min(56, (W * 0.8) / Math.max(4, text.length));
    ctx.save();
    ctx.translate(W / 2, H * 0.3); ctx.scale(k, k);
    label(text, 0, 0, fs, color || "#fff", "rgba(29,35,64,.85)");
    if (sub) label(sub, 0, fs * 0.8, Math.max(16, Math.min(26, fs * 0.36)), "#fff", "rgba(29,35,64,.85)");
    ctx.restore();
  }

  root.YR = {
    init, resize, size, drawPitchScene, drawPlay, drawPlay3D, drawFx, confetti, big, aimFromX, screenOfBase, pitchBallAt,
    drawIdle() { cam = batCam(); drawWorld(0, false); },
    clear() { ctx.clearRect(0, 0, W, H); },
  };
})(this);
