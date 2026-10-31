/* ミツバチの いちにち ｜ え（Canvas に その場で かく。がぞうファイルは つかわない） */
(function () {
  "use strict";
  const MB = (window.MB = window.MB || {});
  const TAU = Math.PI * 2;

  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); }

  /* ------------------------------------------------------------ ハチ（うえから みた）
   *  heading: ラジアン。0 ＝ がめんの うえ むき。s ＝ からだの はんぶんの ながさ くらい
   *  o: { flap(0〜1), wag(-1〜1 おしりふり), pollen:"#色", type:"worker|queen|drone", species:"seiyo|nihon", happy }
   */
  const COL = {
    seiyo: { body: "#ffc93c", body2: "#f5a300", stripe: "#3b2410", fuzz: "#d9912b", head: "#3b2a1a" },
    nihon: { body: "#a88a52", body2: "#7a6338", stripe: "#241a10", fuzz: "#8a7448", head: "#2a2018" },
  };
  function bee(g, x, y, s, heading, o) {
    o = o || {};
    const c = COL[o.species || "seiyo"];
    const type = o.type || "worker";
    const abY = type === "queen" ? 0.78 : 0.56, abRx = type === "drone" ? 0.58 : type === "queen" ? 0.44 : 0.5;
    const abRy = type === "queen" ? 0.92 : type === "drone" ? 0.6 : 0.62;
    g.save();
    g.translate(x, y); g.rotate(heading || 0);
    // かげ
    g.fillStyle = "rgba(0,0,0,.12)"; ell(g, s * 0.12, s * 0.42, s * 0.62, s * 0.95); g.fill();
    // あし
    g.strokeStyle = c.head; g.lineWidth = Math.max(1, s * 0.07); g.lineCap = "round";
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const by = -0.12 + i * 0.14, ang = (-0.5 + i * 0.55) * sd;
        g.beginPath(); g.moveTo(sd * s * 0.25, s * by);
        const kx = sd * s * 0.55, ky = s * (by + 0.1 * (i - 1));
        g.lineTo(kx, ky); g.lineTo(kx + sd * s * 0.12, ky + s * (0.18 + Math.abs(ang) * 0.1)); g.stroke();
      }
    }
    // かふんだんご（うしろあし）
    if (o.pollen) {
      g.fillStyle = o.pollen; g.strokeStyle = "rgba(120,70,0,.5)"; g.lineWidth = Math.max(1, s * 0.04);
      for (const sd of [-1, 1]) { circ(g, sd * s * 0.66, s * 0.36, s * 0.17); g.fill(); g.stroke(); }
    }
    // おなか
    g.save();
    g.translate(0, s * 0.18); g.rotate((o.wag || 0) * 0.35); g.translate(0, -s * 0.18);
    const grd = g.createRadialGradient(-s * 0.15, s * (abY - 0.2), s * 0.1, 0, s * abY, s * abRy);
    grd.addColorStop(0, c.body); grd.addColorStop(1, c.body2);
    ell(g, 0, s * abY, s * abRx, s * abRy); g.fillStyle = grd; g.fill();
    g.save(); ell(g, 0, s * abY, s * abRx, s * abRy); g.clip();
    g.fillStyle = c.stripe;
    const nS = type === "queen" ? 4 : 3;
    for (let i = 0; i < nS; i++) {
      const yy = s * (abY - abRy * 0.35 + (i * abRy * 1.15) / nS);
      g.fillRect(-s, yy, s * 2, s * (o.species === "nihon" ? 0.17 : 0.13));
    }
    g.restore();
    ell(g, 0, s * abY, s * abRx, s * abRy); g.strokeStyle = "rgba(60,30,0,.45)"; g.lineWidth = Math.max(1, s * 0.05); g.stroke();
    g.restore();
    // はね
    const fl = o.flap == null ? 0.5 : o.flap;
    g.fillStyle = "rgba(235,248,255,.72)"; g.strokeStyle = "rgba(120,160,190,.8)"; g.lineWidth = Math.max(1, s * 0.035);
    for (const sd of [-1, 1]) {
      const a = sd * (0.55 + fl * 0.55);
      ell(g, sd * s * 0.45, s * 0.05, s * 0.52, s * 0.24, a); g.fill(); g.stroke();
      ell(g, sd * s * 0.36, s * 0.3, s * 0.36, s * 0.17, a + sd * 0.35); g.fill(); g.stroke();
    }
    // むね（ふわふわ）
    circ(g, 0, -s * 0.05, s * 0.36); g.fillStyle = c.fuzz; g.fill();
    g.strokeStyle = "rgba(255,230,170,.55)"; g.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      g.beginPath(); g.moveTo(Math.cos(a) * s * 0.3, -s * 0.05 + Math.sin(a) * s * 0.3);
      g.lineTo(Math.cos(a) * s * 0.4, -s * 0.05 + Math.sin(a) * s * 0.4); g.stroke();
    }
    // しょっかく
    g.strokeStyle = c.head; g.lineWidth = Math.max(1, s * 0.06);
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * s * 0.1, -s * 0.72);
      g.quadraticCurveTo(sd * s * 0.2, -s * 1.05, sd * s * 0.42, -s * 1.08); g.stroke();
      circ(g, sd * s * 0.42, -s * 1.08, s * 0.06); g.fillStyle = c.head; g.fill();
    }
    // あたま
    const hr = type === "drone" ? 0.36 : 0.3;
    circ(g, 0, -s * 0.5, s * hr); g.fillStyle = c.head; g.fill();
    // め（かわいく）
    const er = type === "drone" ? 0.17 : 0.12;
    for (const sd of [-1, 1]) {
      ell(g, sd * s * 0.14, -s * 0.55, s * er, s * er * 1.2); g.fillStyle = "#fff"; g.fill();
      circ(g, sd * s * 0.15, -s * 0.57, s * er * 0.6); g.fillStyle = "#111"; g.fill();
      circ(g, sd * s * 0.12, -s * 0.61, s * er * 0.25); g.fillStyle = "#fff"; g.fill();
    }
    if (o.happy) {
      g.strokeStyle = "#ff9fb2"; g.lineWidth = Math.max(1, s * 0.05);
      g.beginPath(); g.arc(0, -s * 0.38, s * 0.08, 0.2, Math.PI - 0.2); g.stroke();
    }
    if (type === "queen") { // かんむり
      g.fillStyle = "#ffd43b"; g.strokeStyle = "#b07d00"; g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath(); const cy = -s * 0.86;
      g.moveTo(-s * 0.18, cy + s * 0.1); g.lineTo(-s * 0.2, cy - s * 0.08); g.lineTo(-s * 0.08, cy); g.lineTo(0, cy - s * 0.13);
      g.lineTo(s * 0.08, cy); g.lineTo(s * 0.2, cy - s * 0.08); g.lineTo(s * 0.18, cy + s * 0.1); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }

  /* ------------------------------------------------------------ ハチ（よこから みた。ずかんの からだ）
   *  ばんごうの いち（MB.BODY の じゅん）を かえす */
  function beeSide(g, x, y, s, o) {
    o = o || {};
    const c = COL[o.species || "seiyo"];
    g.save(); g.translate(x, y);
    // はね
    g.fillStyle = "rgba(225,242,255,.8)"; g.strokeStyle = "#7aa3c4"; g.lineWidth = 1.5;
    ell(g, s * 0.1, -s * 0.55, s * 0.75, s * 0.25, -0.35); g.fill(); g.stroke();
    ell(g, s * 0.25, -s * 0.38, s * 0.5, s * 0.17, -0.2); g.fill(); g.stroke();
    // おなか
    const grd = g.createLinearGradient(0, -s * 0.4, 0, s * 0.5);
    grd.addColorStop(0, c.body); grd.addColorStop(1, c.body2);
    ell(g, s * 0.62, s * 0.05, s * 0.62, s * 0.42, 0.2); g.fillStyle = grd; g.fill();
    g.save(); ell(g, s * 0.62, s * 0.05, s * 0.62, s * 0.42, 0.2); g.clip(); g.fillStyle = c.stripe;
    for (let i = 0; i < 3; i++) { g.save(); g.translate(s * (0.45 + i * 0.3), 0); g.rotate(0.2); g.fillRect(-s * 0.06, -s, s * 0.11, s * 2); g.restore(); }
    g.restore();
    // ろうの ところ（おなかの した）
    g.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 3; i++) { ell(g, s * (0.45 + i * 0.22), s * (0.4 + i * 0.03), s * 0.07, s * 0.03, 0.2); g.fill(); }
    // はり
    g.fillStyle = c.stripe; g.beginPath(); g.moveTo(s * 1.18, s * 0.2); g.lineTo(s * 1.36, s * 0.3); g.lineTo(s * 1.16, s * 0.3); g.fill();
    // むね
    circ(g, -s * 0.12, -s * 0.02, s * 0.33); g.fillStyle = c.fuzz; g.fill();
    // あし
    g.strokeStyle = c.head; g.lineWidth = Math.max(1.5, s * 0.05); g.lineCap = "round";
    const legs = [[-0.3, -0.45, 0.62], [-0.12, -0.1, 0.64], [0.05, 0.38, 0.62]];
    legs.forEach((L) => {
      g.beginPath(); g.moveTo(s * L[0], s * 0.2); g.lineTo(s * L[1], s * 0.4); g.lineTo(s * (L[1] + 0.1), s * L[2] + s * 0.1); g.stroke();
    });
    // かふんだんご
    circ(g, s * 0.38, s * 0.47, s * 0.12); g.fillStyle = o.pollen || "#ffb300"; g.fill();
    g.strokeStyle = "rgba(120,70,0,.6)"; g.lineWidth = 1.2; g.stroke();
    // あたま
    circ(g, -s * 0.58, -s * 0.05, s * 0.26); g.fillStyle = c.head; g.fill();
    ell(g, -s * 0.6, -s * 0.1, s * 0.12, s * 0.17, 0.2); g.fillStyle = "#5a4a3a"; g.fill();
    circ(g, -s * 0.64, -s * 0.12, s * 0.06); g.fillStyle = "#fff"; g.fill();
    // しょっかく
    g.strokeStyle = c.head; g.lineWidth = Math.max(1.5, s * 0.045);
    g.beginPath(); g.moveTo(-s * 0.72, -s * 0.22); g.lineTo(-s * 0.86, -s * 0.48); g.lineTo(-s * 1.05, -s * 0.5); g.stroke();
    g.restore();
    // ばんごうの いち（MB.BODY の じゅん）
    return [
      [x - s * 1.0, y - s * 0.5], [x - s * 0.62, y - s * 0.1], [x + s * 0.2, y - s * 0.6], [x - s * 0.12, y + s * 0.55],
      [x + s * 0.38, y + s * 0.47], [x + s * 0.7, y + s * 0.45], [x + s * 1.3, y + s * 0.28],
    ];
  }

  /* ------------------------------------------------------------ はな（うえから みた） */
  function flower(g, x, y, r, sp, o) {
    o = o || {};
    const f = typeof sp === "string" ? MB.FLOWER[sp] : sp;
    g.save(); g.translate(x, y);
    if (o.spin) g.rotate(o.spin);
    if (o.glow) { // みつが ある ひかり
      const gg = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.7);
      gg.addColorStop(0, "rgba(255,240,150,.55)"); gg.addColorStop(1, "rgba(255,240,150,0)");
      g.fillStyle = gg; circ(g, 0, 0, r * 1.7); g.fill();
    }
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = Math.max(1, r * 0.06);
    if (f.kind === "urn") {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4, px = Math.cos(a) * r * 0.45, py = Math.sin(a) * r * 0.45;
        ell(g, px, py, r * 0.36, r * 0.42, a); g.fillStyle = f.petal; g.fill(); g.stroke();
        circ(g, px + Math.cos(a) * r * 0.2, py + Math.sin(a) * r * 0.2, r * 0.12); g.fillStyle = f.eye; g.fill();
      }
    } else {
      const n = f.n || 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2;
        g.save(); g.rotate(a);
        g.beginPath();
        if (f.kind === "star") {
          g.moveTo(r * 0.15, -r * 0.28); g.quadraticCurveTo(r * 0.75, -r * 0.35, r * 1.02, 0); g.quadraticCurveTo(r * 0.75, r * 0.35, r * 0.15, r * 0.28);
        } else if (f.kind === "bell") {
          g.moveTo(0, -r * 0.42); g.quadraticCurveTo(r * 1.05, -r * 0.62, r * 1.05, 0); g.quadraticCurveTo(r * 1.05, r * 0.62, 0, r * 0.42);
        } else {
          g.ellipse(r * 0.55, 0, r * 0.5, r * 0.38, 0, 0, TAU);
        }
        g.closePath(); g.fillStyle = f.petal; g.fill(); g.stroke();
        g.restore();
      }
      circ(g, 0, 0, r * 0.32); g.fillStyle = f.eye; g.fill();
      g.fillStyle = "rgba(255,255,255,.6)";
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; circ(g, Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, r * 0.05); g.fill(); }
    }
    if (o.pollinated) { // かふんが ついた しるし
      g.fillStyle = "#ffcc00";
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; circ(g, Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12, r * 0.07); g.fill(); }
    }
    g.restore();
  }

  /* ------------------------------------------------------------ み（やさい・くだもの） */
  function fruit(g, x, y, r, id) {
    g.save(); g.translate(x, y);
    g.lineWidth = Math.max(1, r * 0.07); g.strokeStyle = "rgba(0,0,0,.25)";
    const leaf = (lx, ly, a, sz) => { g.save(); g.translate(lx, ly); g.rotate(a); ell(g, sz * 0.5, 0, sz * 0.55, sz * 0.25); g.fillStyle = "#5fb236"; g.fill(); g.restore(); };
    const shine = (sx, sy, sr) => { ell(g, sx, sy, sr, sr * 0.6, -0.6); g.fillStyle = "rgba(255,255,255,.5)"; g.fill(); };
    switch (id) {
      case "ichigo":
        g.beginPath(); g.moveTo(0, r); g.bezierCurveTo(-r * 1.1, r * 0.1, -r * 0.9, -r * 0.75, 0, -r * 0.6); g.bezierCurveTo(r * 0.9, -r * 0.75, r * 1.1, r * 0.1, 0, r);
        g.fillStyle = "#e8333b"; g.fill(); g.stroke();
        g.fillStyle = "#ffe08a";
        for (let i = 0; i < 9; i++) { circ(g, ((i % 3) - 1) * r * 0.35 + (Math.floor(i / 3) % 2) * r * 0.1, -r * 0.25 + Math.floor(i / 3) * r * 0.3, r * 0.06); g.fill(); }
        for (let i = 0; i < 5; i++) leaf(0, -r * 0.62, -Math.PI / 2 + (i - 2) * 0.55, r * 0.5);
        break;
      case "ringo":
        circ(g, 0, r * 0.05, r * 0.9); g.fillStyle = "#e03131"; g.fill(); g.stroke();
        shine(-r * 0.35, -r * 0.25, r * 0.22);
        g.strokeStyle = "#6b4226"; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(0, -r * 0.7); g.lineTo(r * 0.08, -r * 1.05); g.stroke();
        leaf(r * 0.08, -r * 0.92, -0.4, r * 0.55);
        break;
      case "kyuri":
        g.rotate(-0.5);
        g.beginPath(); g.roundRect(-r * 0.3, -r, r * 0.6, r * 2, r * 0.3); g.fillStyle = "#2f9e44"; g.fill(); g.stroke();
        g.fillStyle = "#b2f2bb"; for (let i = 0; i < 6; i++) { circ(g, (i % 2 ? 0.12 : -0.12) * r, -r * 0.75 + i * r * 0.3, r * 0.05); g.fill(); }
        circ(g, 0, -r, r * 0.13); g.fillStyle = "#ffe14d"; g.fill();
        break;
      case "kabocha":
        for (const k of [-0.5, 0.5, 0]) { ell(g, k * r, r * 0.1, r * 0.55, r * 0.75); g.fillStyle = "#2b6b3a"; g.fill(); g.stroke(); }
        g.strokeStyle = "#7cbf5a"; g.lineWidth = r * 0.05;
        for (const k of [-0.6, -0.25, 0.25, 0.6]) { g.beginPath(); g.moveTo(k * r, -r * 0.5); g.quadraticCurveTo(k * r * 1.15, r * 0.1, k * r, r * 0.75); g.stroke(); }
        g.fillStyle = "#7a5230"; g.fillRect(-r * 0.08, -r * 0.85, r * 0.16, r * 0.3);
        break;
      case "melon":
        circ(g, 0, 0, r * 0.9); g.fillStyle = "#94d82d"; g.fill(); g.stroke();
        g.save(); circ(g, 0, 0, r * 0.9); g.clip(); g.strokeStyle = "rgba(255,255,240,.85)"; g.lineWidth = r * 0.05;
        for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * r * 0.25 - r, -r); g.lineTo(i * r * 0.25 + r, r); g.stroke(); g.beginPath(); g.moveTo(i * r * 0.25 + r, -r); g.lineTo(i * r * 0.25 - r, r); g.stroke(); }
        g.restore();
        g.strokeStyle = "#6b4226"; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(-r * 0.2, -r * 0.95); g.lineTo(r * 0.2, -r * 0.95); g.moveTo(0, -r * 0.95); g.lineTo(0, -r * 0.8); g.stroke();
        break;
      case "blueberry":
        for (const [bx, by] of [[-0.4, 0.25], [0.4, 0.25], [0, -0.35]]) {
          circ(g, bx * r, by * r, r * 0.45); g.fillStyle = "#3b5bdb"; g.fill(); g.stroke();
          circ(g, bx * r - r * 0.12, by * r - r * 0.14, r * 0.1); g.fillStyle = "rgba(255,255,255,.45)"; g.fill();
          g.strokeStyle = "#1c2f7a"; g.lineWidth = r * 0.05; g.beginPath(); g.arc(bx * r, by * r, r * 0.12, 0, TAU); g.stroke(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = Math.max(1, r * 0.07);
        }
        break;
      case "nashi":
        circ(g, 0, r * 0.05, r * 0.9); g.fillStyle = "#e0b15a"; g.fill(); g.stroke();
        g.fillStyle = "rgba(140,90,30,.45)"; for (let i = 0; i < 14; i++) { circ(g, Math.cos(i * 2.4) * r * 0.6 * ((i % 4) / 4 + 0.2), Math.sin(i * 2.4) * r * 0.6 * ((i % 4) / 4 + 0.2), r * 0.04); g.fill(); }
        shine(-r * 0.35, -r * 0.25, r * 0.2);
        g.strokeStyle = "#6b4226"; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(r * 0.05, -r * 1.1); g.stroke();
        break;
      case "sakuranbo":
        g.strokeStyle = "#5c8a2a"; g.lineWidth = r * 0.08;
        g.beginPath(); g.moveTo(-r * 0.4, r * 0.15); g.quadraticCurveTo(-r * 0.2, -r * 0.6, r * 0.1, -r * 0.95); g.moveTo(r * 0.45, r * 0.25); g.quadraticCurveTo(r * 0.3, -r * 0.5, r * 0.1, -r * 0.95); g.stroke();
        leaf(r * 0.1, -r * 0.95, -0.2, r * 0.6);
        for (const [cx, cy] of [[-0.4, 0.45], [0.45, 0.55]]) { circ(g, cx * r, cy * r, r * 0.42); g.fillStyle = "#c2255c"; g.fill(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = Math.max(1, r * 0.07); g.stroke(); shine(cx * r - r * 0.13, cy * r - r * 0.13, r * 0.12); }
        break;
    }
    g.restore();
  }

  /* ------------------------------------------------------------ ようちゅう・たまご */
  function larva(g, x, y, r, o) {
    o = o || {};
    g.save(); g.translate(x, y); g.rotate(o.rot || 0);
    g.lineCap = "round";
    g.strokeStyle = "#e9e1cf"; g.lineWidth = r * 0.62;
    g.beginPath(); g.arc(0, 0, r * 0.5, -0.3, Math.PI * 1.45); g.stroke();
    g.strokeStyle = "#fffdf6"; g.lineWidth = r * 0.48;
    g.beginPath(); g.arc(0, 0, r * 0.5, -0.3, Math.PI * 1.45); g.stroke();
    g.strokeStyle = "rgba(200,190,160,.7)"; g.lineWidth = Math.max(1, r * 0.04);
    for (let i = 0; i < 5; i++) { const a = -0.1 + i * 0.85; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.27, Math.sin(a) * r * 0.27); g.lineTo(Math.cos(a) * r * 0.73, Math.sin(a) * r * 0.73); g.stroke(); }
    g.fillStyle = "#333"; circ(g, Math.cos(-0.3) * r * 0.5 + r * 0.06, Math.sin(-0.3) * r * 0.5 - r * 0.02, r * 0.06); g.fill();
    g.restore();
  }
  function egg(g, x, y, r) {
    ell(g, x, y, r * 0.12, r * 0.32, 0.3); g.fillStyle = "#fffef4"; g.fill(); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 1; g.stroke();
  }

  /* ------------------------------------------------------------ 六角形（すぼう） */
  function hexPath(g, x, y, R) {
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath();
  }
  // セル: kind = "empty" | "honey" | "cap" | "pollen" | "dirty" | "ghost" | "wax"
  function cell(g, x, y, R, kind, o) {
    o = o || {};
    hexPath(g, x, y, R * 0.94);
    if (kind === "ghost") {
      g.setLineDash([R * 0.18, R * 0.14]); g.strokeStyle = "rgba(140,90,0,.65)"; g.lineWidth = Math.max(1.5, R * 0.08); g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(255,240,190,.35)"; g.fill();
      return;
    }
    const base = kind === "cap" ? "#f7d774" : kind === "honey" ? "#f0a92a" : kind === "pollen" ? "#e8a33c" : "#e9c46a";
    const gg = g.createRadialGradient(x, y, R * 0.1, x, y, R);
    if (kind === "empty" || kind === "dirty" || kind === "wax") { gg.addColorStop(0, "#8a5a1a"); gg.addColorStop(0.75, "#c58a35"); gg.addColorStop(1, "#f2cf7c"); }
    else if (kind === "honey") { gg.addColorStop(0, o.water != null ? mixHoney(o.water) : "#f6b73c"); gg.addColorStop(1, "#f9d980"); }
    else { gg.addColorStop(0, base); gg.addColorStop(1, "#fbe7a8"); }
    g.fillStyle = gg; g.fill();
    g.strokeStyle = kind === "wax" ? "#fff3c4" : "#b8812a"; g.lineWidth = Math.max(1.5, R * 0.1); g.stroke();
    if (kind === "cap") { g.fillStyle = "rgba(255,255,255,.35)"; ell(g, x - R * 0.2, y - R * 0.2, R * 0.3, R * 0.18, -0.5); g.fill(); }
    if (kind === "honey") { g.fillStyle = "rgba(255,255,255,.45)"; ell(g, x - R * 0.25, y - R * 0.25, R * 0.22, R * 0.12, -0.5); g.fill(); }
    if (kind === "pollen") { g.fillStyle = "#ffcc33"; for (let i = 0; i < 4; i++) { circ(g, x + Math.cos(i * 1.7) * R * 0.3, y + Math.sin(i * 1.7) * R * 0.3, R * 0.2); g.fill(); } }
    if (kind === "dirty") {
      g.fillStyle = "rgba(80,50,20,.85)";
      for (let i = 0; i < 5; i++) { circ(g, x + Math.cos(i * 2.3 + (o.seed || 0)) * R * 0.35, y + Math.sin(i * 2.3 + (o.seed || 0)) * R * 0.35, R * (0.1 + (i % 3) * 0.05)); g.fill(); }
    }
  }
  function mixHoney(water) { // みずが おおい ほど うすい いろ
    const t = Math.max(0, Math.min(1, (water - 18) / 60));
    const a = [214, 130, 10], b = [250, 236, 180];
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
  }

  // すいた ぜんたいの もよう（はいけい）
  function combBg(g, W, H, R, seed) {
    g.fillStyle = "#c98f35"; g.fillRect(0, 0, W, H);
    const dx = Math.sqrt(3) * R, dy = 1.5 * R;
    let k = seed || 1;
    const rnd = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
    for (let row = -1, y = 0; y < H + R; row++, y = row * dy) {
      for (let col = -1; col * dx < W + dx; col++) {
        const x = col * dx + (row % 2 ? dx / 2 : 0);
        const v = rnd();
        cell(g, x, y, R, v < 0.42 ? "cap" : v < 0.68 ? "honey" : v < 0.78 ? "pollen" : "empty");
      }
    }
    g.fillStyle = "rgba(90,50,0,.18)"; g.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------ たいよう・すばこ */
  function sun(g, x, y, r, t) {
    g.save(); g.translate(x, y); g.rotate((t || 0) * 0.3);
    g.strokeStyle = "#ffb000"; g.lineWidth = Math.max(2, r * 0.16); g.lineCap = "round";
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); g.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); g.stroke(); }
    g.restore();
    g.save(); g.translate(x, y);
    const gg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    gg.addColorStop(0, "#fff3a0"); gg.addColorStop(1, "#ffb000");
    circ(g, 0, 0, r); g.fillStyle = gg; g.fill();
    g.fillStyle = "#7a4a00"; circ(g, -r * 0.32, -r * 0.1, r * 0.1); g.fill(); circ(g, r * 0.32, -r * 0.1, r * 0.1); g.fill();
    g.strokeStyle = "#7a4a00"; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.arc(0, r * 0.12, r * 0.3, 0.3, Math.PI - 0.3); g.stroke();
    g.fillStyle = "rgba(255,120,120,.5)"; circ(g, -r * 0.55, r * 0.2, r * 0.13); g.fill(); circ(g, r * 0.55, r * 0.2, r * 0.13); g.fill();
    g.restore();
  }
  function hive(g, x, y, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = "rgba(0,0,0,.18)"; ell(g, s * 0.1, s * 0.9, s * 1.05, s * 0.3); g.fill();
    g.fillStyle = "#c98b4a"; g.strokeStyle = "#6b4226"; g.lineWidth = Math.max(1.5, s * 0.07);
    g.beginPath(); g.roundRect(-s * 0.85, -s * 0.4, s * 1.7, s * 1.25, s * 0.1); g.fill(); g.stroke();
    g.strokeStyle = "rgba(107,66,38,.45)"; g.lineWidth = Math.max(1, s * 0.04);
    for (const k of [0.0, 0.42]) { g.beginPath(); g.moveTo(-s * 0.85, s * k); g.lineTo(s * 0.85, s * k); g.stroke(); }
    g.fillStyle = "#e8564c"; g.strokeStyle = "#8c2a22"; g.lineWidth = Math.max(1.5, s * 0.07);
    g.beginPath(); g.moveTo(-s * 1.05, -s * 0.38); g.lineTo(0, -s * 1.0); g.lineTo(s * 1.05, -s * 0.38); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#3b2410"; g.beginPath(); g.roundRect(-s * 0.4, s * 0.62, s * 0.8, s * 0.14, s * 0.06); g.fill();
    g.restore();
  }

  MB.Art = { bee, beeSide, flower, fruit, larva, egg, hexPath, cell, combBg, sun, hive, ell, circ, mixHoney };
})();
