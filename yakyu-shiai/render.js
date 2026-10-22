// やきゅう しあい — Canvas で えがく（ピッチャーと バッターの がめん／うえから みた きゅうじょう）
(function (root) {
  "use strict";
  const YS = root.YS;
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
  function emoji(e, x, y, px) {
    ctx.font = Math.round(px) + "px \"Apple Color Emoji\",\"Segoe UI Emoji\",\"Noto Color Emoji\",sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e, x, y + px * 0.05);
  }
  function label(text, x, y, px, color, stroke) {
    ctx.font = "900 " + Math.round(px) + "px \"Hiragino Maru Gothic ProN\",\"BIZ UDPGothic\",\"Meiryo\",sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (stroke) { ctx.lineJoin = "round"; ctx.lineWidth = Math.max(3, px * 0.22); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
    ctx.fillStyle = color || "#fff"; ctx.fillText(text, x, y);
  }

  // ===================== ピッチの がめん（キャッチャーの うしろ から） =====================
  const CAMZ = -6.5, CAMY = 2.5;
  let F = 1, CX = 0, HY = 0;
  function P(x, y, z) { const s = F / Math.max(0.3, z - CAMZ); return { x: CX + x * s, y: HY - (y - CAMY) * s, s }; }
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  const ZW = 0.25, ZY = 0.8, ZH = 0.3;           // ストライクゾーン（はば・まんなかの たかさ・たかさの はんぶん）
  const zoneW = (zx, zy) => ({ x: zx * ZW, y: ZY + zy * ZH });
  const REL = { x: -0.35, y: 1.85, z: 17.2 };       // ボールを はなす ところ

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
  function pitchLayout() {
    F = Math.min(H * 1.9, W * 2.4);
    CX = W / 2; HY = H * 0.87 - CAMY * F / -CAMZ;
  }
  // スクリーンの x から ゾーンの x（タップの いち）
  function aimFromX(px) { return Math.max(-1, Math.min(1, (px - W / 2) / (W * 0.33))); }

  function drawPitchScene(v) {
    pitchLayout();
    const t = v.time;
    // そら・スタンド
    const sky = ctx.createLinearGradient(0, 0, 0, HY);
    sky.addColorStop(0, "#5fb4f2"); sky.addColorStop(1, "#bfe6ff");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const st = P(0, 0, 105).y;
    ctx.fillStyle = "#3d4a63"; ctx.fillRect(0, st - H * 0.16, W, H * 0.16);
    // おきゃくさん（いろの つぶ）
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 40; i++) {
        const x = ((i + (row % 2) * 0.5) / 40) * W;
        const y = st - H * 0.15 + row * H * 0.028;
        const bob = v.cheer ? Math.sin(t * 12 + i * 1.7 + row) * 2 : 0;
        ctx.fillStyle = ["#ff6b6b", "#ffd43b", "#74c0fc", "#fff", "#ff8cc6", "#8ce99a"][(i * 7 + row * 3) % 6];
        ctx.beginPath(); ctx.arc(x, y + bob, Math.max(1.5, W / 160), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = "#2b8a3e"; ctx.fillRect(0, st - 4, W, 4);
    // しばふ
    const g = ctx.createLinearGradient(0, st, 0, H);
    g.addColorStop(0, "#2f9e44"); g.addColorStop(1, "#51cf66");
    ctx.fillStyle = g; ctx.fillRect(0, st, W, H - st);
    // しばの しま
    for (let z = 10; z < 100; z += 10) {
      if ((z / 10) % 2) poly([P(-80, 0, z), P(80, 0, z), P(80, 0, z + 5), P(-80, 0, z + 5)], "rgba(255,255,255,.05)");
    }
    // ないやの つち
    poly([P(0, 0, -3), P(24, 0, 19.4), P(0, 0, 44), P(-24, 0, 19.4)], "#d9a066");
    poly([P(0, 0, 3), P(16.5, 0, 19.4), P(0, 0, 35), P(-16.5, 0, 19.4)], "#40a84f");
    // ファウルライン
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    [[-1, 1], [1, 1]].forEach(([sx]) => { const a = P(0, 0, 0), b = P(sx * 90, 0, 90); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    // ベース
    [[19.4, 19.4], [0, 38.8], [-19.4, 19.4]].forEach(([x, z]) => poly([P(x - 0.4, 0, z), P(x, 0, z + 0.4), P(x + 0.4, 0, z), P(x, 0, z - 0.4)], "#fff"));
    // マウンド
    const m = P(0, 0, 18.4);
    ctx.fillStyle = "#c98a4b"; ctx.beginPath(); ctx.ellipse(m.x, m.y, 2.8 * m.s, 0.9 * m.s, 0, 0, Math.PI * 2); ctx.fill();
    // バッターボックス・ホームベース
    poly([P(-1.6, 0, -1.2), P(1.6, 0, -1.2), P(1.6, 0, 1.6), P(-1.6, 0, 1.6)], "#d9a066");
    poly([P(-0.22, 0, 0.22), P(0.22, 0, 0.22), P(0.22, 0, 0), P(0, 0, -0.22), P(-0.22, 0, 0)], "#fff");
    poly([P(-1.4, 0, -0.9), P(-0.4, 0, -0.9), P(-0.4, 0, 0.9), P(-1.4, 0, 0.9)], null, "rgba(255,255,255,.8)", 2);
    poly([P(1.4, 0, -0.9), P(0.4, 0, -0.9), P(0.4, 0, 0.9), P(1.4, 0, 0.9)], null, "rgba(255,255,255,.8)", 2);

    // ピッチャー
    const pu = v.pitch && v.pitchT0 != null ? (t - v.pitchT0) / v.pitch.time : -1;
    const windup = v.windupT0 != null ? Math.min(1, (t - v.windupT0) / 0.8) : 0;
    drawPitcher(m.x, m.y, m.s, v.fieldTeam, v.pitcher, windup, pu);

    // ゾーン
    const showZone = v.showZone;
    const z0 = P(-ZW, ZY + ZH, 0), z1 = P(ZW, ZY - ZH, 0);
    ctx.strokeStyle = showZone ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
    ctx.strokeRect(z0.x, z0.y, z1.x - z0.x, z1.y - z0.y);
    if (showZone) {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x = z0.x + (z1.x - z0.x) * i / 3, y = z0.y + (z1.y - z0.y) * i / 3;
        ctx.beginPath(); ctx.moveTo(x, z0.y); ctx.lineTo(x, z1.y); ctx.moveTo(z0.x, y); ctx.lineTo(z1.x, y); ctx.stroke();
      }
    }
    if (v.target != null) {
      const tg = YS.cellTarget(v.target), q = P(zoneW(tg.x, tg.y).x, zoneW(tg.x, tg.y).y, 0);
      ctx.strokeStyle = "#ffd43b"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 0.11, 0, Math.PI * 2); ctx.stroke();
    }

    // バッター
    const bp = P(-1.05, 0, 0.25);
    drawBatter(bp.x, bp.y, bp.s, v.batTeam, v.batter, v.swingT0 != null ? (t - v.swingT0) / 0.28 : -1, v.bunt);

    // ボール
    if (v.pitch && pu >= 0 && pu < 1.25 && !v.hideBall) {
      const b = pitchBallAt(v.pitch, Math.min(pu, 1.25));
      // タイミングの わ（ボールが ちかづくと ちいさく なる）
      if (v.ring && pu < 1) {
        const f = zoneW(v.pitch.x, v.pitch.y), q = P(f.x, f.y, 0);
        const rad = q.s * (0.06 + 0.5 * (1 - pu));
        ctx.strokeStyle = "rgba(255,230,80," + (0.35 + 0.6 * pu) + ")"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.stroke();
      }
      drawBall3(b);
    }
    if (v.pitch && v.showLanding) {
      const f = zoneW(v.pitch.x, v.pitch.y), q = P(f.x, f.y, 0);
      circle(q.x, q.y, q.s * 0.045, "rgba(255,255,255,.9)", v.pitch.inZone ? "#ff6b6b" : "#4dabf7", 3);
    }
  }
  function drawBall3(b) {
    const q = P(b.x, b.y, b.z), g = P(b.x, 0, b.z);
    const r = Math.max(2.5, 0.045 * q.s * 1.6);
    ctx.globalAlpha = 0.3; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    drawBall2(q.x, q.y, r);
  }
  function drawBall2(x, y, r) {
    circle(x, y, r, "#fff", "rgba(0,0,0,.25)", 1);
    if (r > 5) {
      ctx.strokeStyle = "#e03131"; ctx.lineWidth = Math.max(1, r * 0.13);
      ctx.beginPath(); ctx.arc(x - r * 0.95, y, r * 0.65, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.95, y, r * 0.65, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    }
  }

  // ひと（からだ・うで・ぼうし）。かおは せんしゅの えもじ。
  function body(x, y, s, team, pl, opt) {
    const h = 1.75 * s, w = 0.55 * s;
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.9, w * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // あし
    ctx.fillStyle = "#f1f3f5";
    rr(x - w * 0.42, y - h * 0.42, w * 0.36, h * 0.42, w * 0.12); ctx.fill();
    rr(x + w * 0.06, y - h * 0.42, w * 0.36, h * 0.42, w * 0.12); ctx.fill();
    ctx.fillStyle = "#212529";
    rr(x - w * 0.46, y - h * 0.06, w * 0.42, h * 0.07, w * 0.1); ctx.fill();
    rr(x + w * 0.04, y - h * 0.06, w * 0.42, h * 0.07, w * 0.1); ctx.fill();
    // どう
    ctx.fillStyle = team.color2 || "#fff";
    rr(x - w * 0.5, y - h * 0.8, w, h * 0.42, w * 0.25); ctx.fill();
    ctx.strokeStyle = team.color; ctx.lineWidth = Math.max(1, s * 0.06); ctx.stroke();
    ctx.fillStyle = team.color;
    ctx.fillRect(x - w * 0.5, y - h * 0.47, w, h * 0.05);
    if (opt && opt.num != null && s > 14) label(String(opt.num), x, y - h * 0.62, s * 0.22, team.color);
    // あたま
    const hy = y - h * 0.92, hr = w * 0.48;
    circle(x, hy, hr, "#fff3e0");
    emoji(pl ? pl.emoji : "⚾", x, hy + hr * 0.08, hr * 1.7);
    // ぼうし
    ctx.fillStyle = team.cap || team.color;
    ctx.beginPath(); ctx.arc(x, hy - hr * 0.6, hr * 0.8, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    return { hx: x, hy, hr, sh: y - h * 0.75, w, h };
  }
  function drawPitcher(x, y, s, team, pl, windup, pu) {
    if (!team) return;
    const b = body(x, y, s, team, pl, { num: 1 });
    // うで
    let a;
    if (pu >= 0 && pu < 0.4) a = -0.6 + pu * 3;          // なげおわり
    else if (windup > 0 && pu < 0) a = -Math.PI * 0.5 - windup * 2.2; // ふりかぶる
    else a = 0.6;
    ctx.strokeStyle = team.color2 || "#fff"; ctx.lineWidth = Math.max(2, s * 0.16); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + b.w * 0.45, b.sh); ctx.lineTo(x + b.w * 0.45 + Math.cos(a) * s * 0.55, b.sh + Math.sin(a) * s * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - b.w * 0.45, b.sh); ctx.lineTo(x - b.w * 0.75, b.sh + s * 0.35); ctx.stroke();
    circle(x - b.w * 0.78, b.sh + s * 0.38, s * 0.13, "#8a4b16");    // グラブ
  }
  function drawBatter(x, y, s, team, pl, su, bunt) {
    if (!team) return;
    const b = body(x, y, s, team, pl, {});
    // バット
    let ang;
    if (bunt) ang = -0.05;
    else if (su >= 0 && su <= 1.4) ang = -2.2 + Math.min(1, su) * 3.6;   // スイング
    else ang = -2.2;
    const hx = x + b.w * 0.55, hy = b.sh + s * 0.1;
    const len = s * 0.95;
    ctx.strokeStyle = "#c08a4a"; ctx.lineWidth = Math.max(3, s * 0.12); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang) * len, hy + Math.sin(ang) * len); ctx.stroke();
    circle(hx, hy, s * 0.1, team.color2 || "#fff", team.color, 1);
    // ヘルメット
    ctx.fillStyle = team.cap || team.color;
    ctx.beginPath(); ctx.arc(b.hx, b.hy - b.hr * 0.55, b.hr * 0.85, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  }

  // ===================== うえから みた きゅうじょう =====================
  let K = 1, OX = 0, OY = 0;
  function fieldLayout() {
    K = Math.min(W / 136, H / 124);
    OX = W / 2; OY = H / 2 + 53 * K;
  }
  const S = (x, y) => ({ x: OX + x * K, y: OY - y * K });
  function screenOfBase(b) { fieldLayout(); const p = YS.BASES[b % 4]; return S(p.x, p.y); }

  function drawFieldBase() {
    fieldLayout();
    ctx.fillStyle = "#3d4a63"; ctx.fillRect(0, 0, W, H);
    // スタンド
    const fence = (d) => YS.fenceDist(d);
    const pts = [];
    for (let d = -45; d <= 45; d += 3) { const r = fence(d), a = d * Math.PI / 180; pts.push(S(Math.sin(a) * r, Math.cos(a) * r)); }
    // ファウルゾーン
    ctx.fillStyle = "#2b8a3e";
    ctx.beginPath(); ctx.moveTo(S(-75, -10).x, S(-75, -10).y);
    for (let d = -60; d <= 60; d += 4) { const r = fence(d) + 4, a = d * Math.PI / 180; const p = S(Math.sin(a) * r, Math.cos(a) * r); ctx.lineTo(p.x, p.y); }
    ctx.lineTo(S(75, -10).x, S(75, -10).y); ctx.closePath(); ctx.fill();
    // フェア
    const h = S(0, 0);
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
    const ip = [S(26, 22), S(0, 46), S(-26, 22)];
    ctx.lineTo(S(30, 20).x, S(30, 20).y);
    ctx.quadraticCurveTo(S(0, 62).x, S(0, 62).y, S(-30, 20).x, S(-30, 20).y);
    ctx.closePath(); ctx.fill();
    void ip;
    ctx.fillStyle = "#40a84f";
    const g1 = S(0, 4), g2 = S(16, 19.4), g3 = S(0, 35), g4 = S(-16, 19.4);
    ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.lineTo(g3.x, g3.y); ctx.lineTo(g4.x, g4.y); ctx.closePath(); ctx.fill();
    const m = S(0, 18.4); circle(m.x, m.y, 2.8 * K, "#c98a4b");
    circle(h.x, h.y, 4 * K, "#d9a066");
    // ライン
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, 0.35 * K);
    [-1, 1].forEach((sx) => { const a = S(sx * fence(45) * Math.SQRT1_2, fence(45) * Math.SQRT1_2); ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(a.x, a.y); ctx.stroke(); });
    // ベース
    for (let b = 1; b <= 3; b++) {
      const p = screenOfBase(b), r = Math.max(4, 0.9 * K);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r, p.y); ctx.closePath(); ctx.fill();
    }
    const r = Math.max(4, 0.9 * K);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(h.x - r, h.y - r * 0.6); ctx.lineTo(h.x + r, h.y - r * 0.6); ctx.lineTo(h.x + r, h.y + r * 0.2); ctx.lineTo(h.x, h.y + r); ctx.lineTo(h.x - r, h.y + r * 0.2); ctx.closePath(); ctx.fill();
    label("ホームラン", S(0, fence(0) + 6).x, S(0, fence(0) + 6).y, Math.max(11, 4 * K), "#ffd43b", "#1b4d2b");
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

  function drawPlay(v) {
    drawFieldBase();
    const play = v.play, t = v.t;
    const def = v.def, bat = v.bat;
    const fs = YS.fielders(def);
    const a = play && play.anim;
    // しゅび
    const covered = new Set();
    fs.forEach((f, i) => {
      let x = f.x, y = f.y;
      if (a) {
        if (i === a.chaser && play.fe && !play.fe.hr) {
          const fe = play.fe;
          const d = Math.hypot(fe.x - f.x, fe.y - f.y);
          const tArr = Math.min(fe.t, f.react + Math.max(0, d - 1.3) / f.v);
          const u = Math.max(0, Math.min(1, (t - f.react) / Math.max(0.01, tArr - f.react)));
          x = f.x + (fe.x - f.x) * u; y = f.y + (fe.y - f.y) * u;
        } else {
          const c = a.covers.find((c) => c.f === i && !covered.has(i) && c.base);
          if (c) {
            const bp = YS.BASES[c.base % 4];
            const sp = { x: bp.x + (c.base === 4 ? 0 : 0), y: bp.y + (c.base === 4 ? -1.2 : 0) };
            const u = Math.max(0, Math.min(1, (t - 0.3) / (Math.hypot(sp.x - f.x, sp.y - f.y) / f.v + 0.01)));
            x = f.x + (sp.x - f.x) * u; y = f.y + (sp.y - f.y) * u;
          } else if (play.fe && !play.fe.hr && i >= 6) {
            const u = Math.min(1, t / 3) * 0.25;
            x = f.x + (play.fe.x - f.x) * u; y = f.y + (play.fe.y - f.y) * u;
          }
        }
      }
      const p = S(x, y);
      sprite(p.x, p.y, v.fieldTeam, def[i], 1, false);
    });
    // ランナー
    if (a) {
      a.runners.forEach((rn) => {
        const q = runnerAt(rn, t);
        if (q.alpha <= 0) return;
        const p = S(q.p.x, q.p.y);
        sprite(p.x, p.y, v.batTeam, bat[rn.p], q.alpha, true);
      });
    } else if (v.bases) {
      v.bases.forEach((rn, i) => { if (rn) { const p = screenOfBase(i + 1); sprite(p.x, p.y, v.batTeam, bat[rn.p], 1, true); } });
    }
    // ボール
    if (play) {
      const b = playBallAt(play, t);
      const g = S(b.x, b.y);
      const lift = b.z * K * 0.55;
      const rad = Math.max(3.5, (0.55 + b.z * 0.04) * K);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      drawBall2(g.x, g.y - lift, rad);
      // しるし
      a && a.marks.forEach((m) => {
        if (t >= m.t && t < m.t + 1.4) {
          const p = screenOfBase(m.base);
          label(m.text, p.x, p.y - 7 * K, Math.max(16, 4.5 * K), "#ff6b6b", "#fff");
        }
      });
    }
  }
  function sprite(x, y, team, pl, alpha, runner) {
    const r = Math.max(10, 2.6 * K);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    circle(x, y, r, runner ? team.color : "#fff", runner ? "#fff" : team.color, Math.max(2, r * 0.2));
    emoji(pl ? pl.emoji : "⚾", x, y, r * 1.25);
    if (runner) { ctx.fillStyle = team.cap || team.color; ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.98, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
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
  function big(text, color, t) {
    if (!text) return;
    const s = Math.min(1, t * 4);
    const px = Math.min(64, (W * 0.9) / Math.max(4, text.length)) * (0.6 + 0.4 * s);
    label(text, W / 2, H * 0.32, px, color || "#fff", "rgba(0,0,0,.65)");
  }

  root.YR = {
    init, resize, size, drawPitchScene, drawPlay, drawFx, confetti, big, aimFromX, screenOfBase, pitchBallAt,
    clear() { ctx.clearRect(0, 0, W, H); },
  };
})(this);
