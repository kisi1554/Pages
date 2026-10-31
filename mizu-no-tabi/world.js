/* しずくの だいぼうけん — 地球の だんめんず（せかいの 座標は 1600 × 1000）
   左が 海、まんなかが まち、右が 山。上ほど 空が 高い（1px ＝ 8m）。 */
const World = (function () {
  const W = 1600, H = 1000, SEA = 640, M_PER_PX = 8;
  // 地面（海の そこ も ふくむ）の 高さ
  const G = [[-600, 960], [300, 940], [470, 770], [560, 650], [600, 614], [960, 600], [1060, 520],
             [1200, 400], [1400, 230], [1520, 300], [1600, 340], [2400, 420]];
  function groundY(x) {
    for (let i = 0; i < G.length - 1; i++) {
      const a = G[i], b = G[i + 1];
      if (x <= b[0]) {
        const k = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0])));
        const s = k * k * (3 - 2 * k);
        return a[1] + (b[1] - a[1]) * s;
      }
    }
    return G[G.length - 1][1];
  }
  const alt = function (y) { return Math.round((SEA - y) * M_PER_PX); };
  /* 上空の 気温: 100m のぼると やく 0.6℃ さがる */
  const tempAt = function (y, ground) { return (ground == null ? 20 : ground) - 0.006 * Math.max(0, alt(y)); };

  function line(x0, x1, step, dy) {
    const p = [];
    for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) p.push([x, groundY(x) + (dy || 0)]);
    return p;
  }

  const P = {
    sun: { x: 330, y: 120, r: 62 },
    seaStart: [420, SEA - 6],
    cloud: [540, 300],
    cloudMtn: [1300, 165],
    land: [1290, groundY(1290) - 10],
    snowLand: [1385, groundY(1385) - 10],
    sand: { x: 1222, y: groundY(1222) },
    clay: { x: 1318, y: groundY(1318) },
    spring: [1000, groundY(1000) - 6],
    dam: { x: 1112, top: 438, y: groundY(1112) },
    lakeEnd: 1150,
    plant: { x: 870, w: 90, y: 600 },               // 浄水場
    tanks: [[883, 584], [912, 584], [941, 584]],
    house: { x: 735, w: 100, y: 600 },
    faucet: [790, 552],
    sewage: { x: 600, w: 82, y: 613 },             // 下水処理場
    rubSea: [0, SEA]
  };

  /* みちすじ */
  const R = {
    river: line(1320, 548, -8, -3).concat([[530, SEA - 4], [470, SEA - 6]]),
    toLake: line(1290, 1140, -8, -3).concat([[1132, 444]]),
    lakeToIntake: [[1132, 444], [1110, 436], [1100, 470]].concat(line(1092, 966, -8, -3)).concat([[962, 610], [945, 620], [930, 600]]),
    aquifer: [[1222, 400], [1222, 440], [1180, 478], [1120, 520], [1060, 556], [1020, 584], [1003, 588], [1000, 566]],
    springToSea: line(996, 548, -8, -3).concat([[530, SEA - 4], [470, SEA - 6]]),
    pipe: [[941, 584], [941, 618], [905, 632], [818, 632], [818, 552], [800, 548], [790, 552]],
    sink: [[790, 552], [790, 580]],
    sewer: [[790, 580], [790, 590], [772, 600], [772, 668], [700, 668], [655, 650], [641, 628]],
    outflow: [[641, 628], [628, 662], [580, 666], [540, 650], [480, SEA - 6]]
  };
  /* 地下水の そう（すなや じゃりの そう）の まんなかの 線 */
  const AQ = [[1360, 300], [1240, 440], [1180, 478], [1120, 520], [1060, 556], [1010, 592], [900, 650], [760, 690], [600, 706], [480, 790]];

  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); }
  function offset(pts, d) {
    return pts.map(function (p, i) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] - dy / L * d, p[1] + dx / L * d];
    });
  }

  /* opt: { t, snow(0..1), lakeOpen, labels, plantStep, cleaned, rainy } */
  function draw(ctx, opt) {
    const t = opt.t || 0;
    // 空
    const sky = ctx.createLinearGradient(0, -400, 0, SEA);
    sky.addColorStop(0, "#1c4f8f"); sky.addColorStop(0.35, "#5aa6e8"); sky.addColorStop(1, "#cdeeff");
    ctx.fillStyle = sky; ctx.fillRect(-900, -900, W + 1800, SEA + 900);
    // 太陽
    const s = P.sun, glow = opt.sunHot || 0;
    const sg = ctx.createRadialGradient(s.x, s.y, s.r * 0.3, s.x, s.y, s.r * (1.8 + glow));
    sg.addColorStop(0, "rgba(255,240,150,.95)"); sg.addColorStop(1, "rgba(255,200,80,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1.8 + glow), 0, 7); ctx.fill();
    ctx.fillStyle = glow > 0.5 ? "#ff922b" : "#ffd43b"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#f59f00"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + t * 0.2, r1 = s.r + 10, r2 = s.r + 24 + Math.sin(t * 4 + i) * 4;
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1); ctx.lineTo(s.x + Math.cos(a) * r2, s.y + Math.sin(a) * r2); ctx.stroke();
    }
    // かざりの 雲
    [[150, 330, 0.8], [900, 120, 1], [1150, 360, 0.7]].forEach(function (c, i) { cloud(ctx, c[0] + Math.sin(t * 0.2 + i) * 10, c[1], 46 * c[2], 0.75); });

    // 地面の 下（つち）
    const gpts = [[-900, groundY(-900)]];
    for (let x = -900; x <= W + 900; x += 10) gpts.push([x, groundY(x)]);
    ctx.beginPath(); gpts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.lineTo(W + 900, H + 600); ctx.lineTo(-900, H + 600); ctx.closePath();
    const soil = ctx.createLinearGradient(0, 300, 0, H);
    soil.addColorStop(0, "#c49a6c"); soil.addColorStop(1, "#7c5a3a");
    ctx.fillStyle = soil; ctx.fill();
    // ねんどの そう（水を とおしにくい）と 地下水の そう
    const top = offset(AQ, -16), bot = offset(AQ, 16), clayB = offset(AQ, 40);
    poly(ctx, bot.concat(clayB.slice().reverse())); ctx.closePath(); ctx.fillStyle = "#8d6e63"; ctx.fill();
    poly(ctx, top.concat(bot.slice().reverse())); ctx.closePath();
    ctx.fillStyle = "#e8d5a8"; ctx.fill();
    ctx.save(); ctx.clip();
    for (let i = 0; i < 260; i++) {
      const k = (i * 37 % 260) / 260, j = Math.floor(k * (AQ.length - 1)), f = k * (AQ.length - 1) - j;
      const a = AQ[j], b = AQ[j + 1];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f + ((i * 13) % 27 - 13);
      ctx.fillStyle = i % 3 ? "#b08d57" : "rgba(51,154,240,.55)";
      ctx.beginPath(); ctx.arc(x, y, 2.6 + (i % 4), 0, 7); ctx.fill();
    }
    ctx.restore();
    // 地下水の ながれ（あおい てんせん）
    ctx.save(); ctx.setLineDash([10, 10]); ctx.lineDashOffset = t * 14; ctx.strokeStyle = "rgba(25,113,194,.7)"; ctx.lineWidth = 3;
    poly(ctx, AQ.slice(1, 6)); ctx.stroke(); ctx.restore();
    // 草（表面）
    ctx.beginPath(); gpts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.lineWidth = 14; ctx.strokeStyle = "#69b34c"; ctx.stroke();
    // 山の ゆき
    if (opt.snow > 0.02) {
      const lv = 200 + 220 * opt.snow;  // ゆきの さかい の 高さ
      ctx.save();
      ctx.beginPath(); gpts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1] - 3) : ctx.moveTo(p[0], p[1] - 3); });
      ctx.lineTo(W + 900, -900); ctx.lineTo(-900, -900); ctx.closePath(); ctx.clip();
      ctx.beginPath();
      for (let x = 1150; x <= 1650; x += 10) { const y = groundY(x); if (y < lv) { ctx.moveTo(x, y + 10); ctx.lineTo(x, y - 4); } }
      ctx.restore();
      ctx.beginPath(); let started = false;
      for (let x = 1100; x <= 1700; x += 6) {
        const y = groundY(x);
        if (y < lv) { if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }
      }
      ctx.lineWidth = 22 * Math.min(1, opt.snow * 2); ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round"; ctx.stroke();
    }
    // 木
    [[1000, 0.9], [1035, 1], [1170, 0.8], [1240, 0.7], [1460, 0.6], [1500, 0.6]].forEach(function (a) {
      tree(ctx, a[0], groundY(a[0]), 22 * a[1]);
    });
    // すな と ねんど の ばしょ
    patch(ctx, P.sand, "#e9c46a", true);
    patch(ctx, P.clay, "#9c6644", false);

    // 川
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    poly(ctx, R.river.slice(0, -2)); ctx.lineWidth = 12; ctx.strokeStyle = "#339af0"; ctx.stroke();
    ctx.setLineDash([8, 14]); ctx.lineDashOffset = t * 30; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.stroke();
    ctx.restore();
    // わき水
    ctx.beginPath(); ctx.arc(P.spring[0], P.spring[1] + 6, 9, 0, 7); ctx.fillStyle = "#74c0fc"; ctx.fill();
    // ダム と みずうみ
    const d = P.dam;
    ctx.beginPath(); ctx.moveTo(d.x + 6, 448);
    for (let x = d.x + 6; x <= P.lakeEnd; x += 3) ctx.lineTo(x, Math.max(448, groundY(x)));
    ctx.lineTo(P.lakeEnd, 448); ctx.closePath();
    ctx.beginPath(); ctx.moveTo(d.x + 4, 446);
    for (let x = d.x + 4; x <= P.lakeEnd + 4; x += 2) ctx.lineTo(x, Math.max(446, groundY(x) - 2));
    ctx.lineTo(d.x + 4, groundY(d.x) - 2); ctx.closePath();
    ctx.fillStyle = "#4dabf7"; ctx.fill();
    ctx.fillStyle = "#adb5bd"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(d.x - 14, groundY(d.x - 14) + 2); ctx.lineTo(d.x - 2, d.top); ctx.lineTo(d.x + 6, d.top); ctx.lineTo(d.x + 6, groundY(d.x + 6) + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (opt.lakeOpen) {
      ctx.save(); ctx.strokeStyle = "rgba(208,235,255,.95)"; ctx.lineWidth = 5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = t * 40;
      ctx.beginPath(); ctx.moveTo(d.x - 2, 460); ctx.quadraticCurveTo(d.x - 14, 470, d.x - 16, groundY(d.x - 16)); ctx.stroke(); ctx.restore();
    }
    // 下水処理場
    const sw = P.sewage;
    ctx.fillStyle = "#e9ecef"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 2;
    ctx.fillRect(sw.x, sw.y - 26, sw.w, 26); ctx.strokeRect(sw.x, sw.y - 26, sw.w, 26);
    [0, 1].forEach(function (i) {
      ctx.beginPath(); ctx.ellipse(sw.x + 20 + i * 42, sw.y - 26, 16, 6, 0, 0, 7);
      ctx.fillStyle = opt.cleaned ? "#74c0fc" : "#a9a37c"; ctx.fill(); ctx.stroke();
    });
    // 浄水場
    const pl = P.plant;
    ctx.fillStyle = "#dee2e6"; ctx.fillRect(pl.x, pl.y - 30, pl.w, 30); ctx.strokeStyle = "#495057"; ctx.strokeRect(pl.x, pl.y - 30, pl.w, 30);
    P.tanks.forEach(function (tk, i) {
      const done = (opt.plantStep || 0) > i;
      ctx.fillStyle = done ? "#a5d8ff" : ["#c9b77d", "#b9c9a4", "#c5dbe8"][i];
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tk[0] - 12, tk[1] - 12, 24, 24, 5) : ctx.rect(tk[0] - 12, tk[1] - 12, 24, 24);
      ctx.fill(); ctx.stroke();
    });
    // 水道管・下水管
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    poly(ctx, R.pipe.slice(0, -1)); ctx.lineWidth = 7; ctx.strokeStyle = "#1c7ed6"; ctx.stroke();
    poly(ctx, R.sewer.slice(1)); ctx.strokeStyle = "#868e96"; ctx.stroke();
    poly(ctx, R.outflow.slice(0, -1)); ctx.strokeStyle = "#868e96"; ctx.stroke();
    ctx.restore();
    // いえ（なかが 見える）
    const h = P.house;
    ctx.fillStyle = "#fff4e6"; ctx.strokeStyle = "#7c4a1e"; ctx.lineWidth = 3;
    ctx.fillRect(h.x, h.y - 70, h.w, 70); ctx.strokeRect(h.x, h.y - 70, h.w, 70);
    ctx.beginPath(); ctx.moveTo(h.x - 12, h.y - 70); ctx.lineTo(h.x + h.w / 2, h.y - 112); ctx.lineTo(h.x + h.w + 12, h.y - 70); ctx.closePath();
    ctx.fillStyle = "#e8590c"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ced4da"; ctx.fillRect(772, 580, 40, 8);  // ながし
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(785, 548, 33, 6); ctx.fillRect(785, 548, 7, 12); // じゃぐち
    ctx.fillStyle = opt.faucetOpen ? "#2f9e44" : "#e03131"; ctx.beginPath(); ctx.arc(800, 544, 5, 0, 7); ctx.fill();
    [[700, 600, 0.6], [655, 600, 0.5]].forEach(function (m) { miniHouse(ctx, m[0], m[1], m[2]); });

    // 海
    ctx.beginPath(); ctx.moveTo(-900, SEA);
    for (let x = -900; x <= 560; x += 10) ctx.lineTo(x, SEA + Math.sin(x * 0.04 + t * 2) * 3);
    for (let x = 560; x >= -900; x -= 10) ctx.lineTo(x, Math.max(SEA, groundY(x)));
    ctx.closePath();
    const sea = ctx.createLinearGradient(0, SEA, 0, H);
    sea.addColorStop(0, "rgba(34,139,230,.92)"); sea.addColorStop(1, "rgba(16,60,130,.98)");
    ctx.fillStyle = sea; ctx.fill();
    // さかな
    fish(ctx, 200 + Math.sin(t * 0.5) * 60, 760, t); fish(ctx, 330 + Math.cos(t * 0.4) * 50, 830, t + 1);

    if (opt.labels) labels(ctx, opt.labels, opt.scale);
  }

  function cloud(ctx, x, y, r, a) {
    ctx.fillStyle = "rgba(255,255,255," + (a == null ? 0.95 : a) + ")";
    ctx.beginPath();
    ctx.arc(x - r, y + r * 0.2, r * 0.7, 0, 7); ctx.arc(x, y - r * 0.2, r, 0, 7); ctx.arc(x + r, y + r * 0.15, r * 0.75, 0, 7);
    ctx.arc(x + r * 0.2, y + r * 0.45, r * 0.7, 0, 7);
    ctx.fill();
  }
  function tree(ctx, x, y, s) {
    ctx.fillStyle = "#8d5524"; ctx.fillRect(x - s * 0.12, y - s * 0.9, s * 0.24, s * 0.9);
    ctx.fillStyle = "#2b8a3e"; ctx.beginPath(); ctx.arc(x, y - s * 1.2, s * 0.6, 0, 7); ctx.fill();
  }
  function miniHouse(ctx, x, y, s) {
    ctx.fillStyle = "#ffe8cc"; ctx.fillRect(x - 30 * s, y - 50 * s, 60 * s, 50 * s);
    ctx.fillStyle = "#c92a2a"; ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 50 * s); ctx.lineTo(x, y - 80 * s); ctx.lineTo(x + 38 * s, y - 50 * s); ctx.fill();
  }
  function patch(ctx, p, col, sand) {
    ctx.save(); ctx.fillStyle = col;
    for (let i = 0; i < 26; i++) {
      const dx = (i * 7 % 50) - 25, dy = (i * 11 % 22);
      ctx.beginPath(); ctx.arc(p.x + dx, p.y + 2 + dy, sand ? 3.4 : 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function fish(ctx, x, y, t) {
    ctx.fillStyle = "#ffa94d"; ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 26, y - 8 + Math.sin(t * 6) * 2); ctx.lineTo(x - 26, y + 8 + Math.sin(t * 6) * 2); ctx.fill();
  }
  function labels(ctx, list, sc) {
    const fs = Math.max(14, 13 / (sc || 1)), hh = fs * 1.4;
    ctx.save(); ctx.font = "bold " + fs + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    list.forEach(function (l) {
      if ((sc || 1) < (l[3] || 0)) return;
      const w = ctx.measureText(l[0]).width + fs * 0.7;
      ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(l[1] - w / 2, l[2] - hh / 2, w, hh, hh / 3) : ctx.rect(l[1] - w / 2, l[2] - hh / 2, w, hh); ctx.fill();
      ctx.fillStyle = "#0b3954"; ctx.fillText(l[0], l[1], l[2]);
    });
    ctx.restore();
  }

  return { W: W, H: H, SEA: SEA, P: P, R: R, groundY: groundY, alt: alt, tempAt: tempAt, draw: draw, cloud: cloud,
    LABELS: [["うみ", 260, 700, 0], ["そら", 700, 60, 0], ["やま", 1420, 190, 0], ["かわ", 1250, 420, 0], ["ちかすい", 1080, 620, 0],
      ["ダム", 1070, 420, 0.45], ["じょうすいじょう", 905, 650, 0.45], ["いえ", 785, 470, 0.45], ["げすいしょりじょう", 640, 560, 0.45], ["わきみず", 985, 535, 0.45]] };
})();
