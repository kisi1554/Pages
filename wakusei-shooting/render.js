// =====================================================================
//  わくせい シューティング — え（ロケット・てき・ボス・わくせい・はいけい は ぜんぶ コードで かく）
// =====================================================================
'use strict';
window.WKDraw = (() => {
  const TAU = Math.PI * 2;

  function circ(c, x, y, r, fill, stroke, lw) {
    c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  // かわいい め（mood: 0 ふつう / 1 おこり / 2 やられ）
  function eyes(c, x, y, s, mood = 0, gap = 1) {
    for (const k of [-1, 1]) {
      const ex = x + k * s * 0.55 * gap;
      if (mood === 2) {
        c.strokeStyle = '#222'; c.lineWidth = s * 0.18; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex - s * 0.25, y - s * 0.25); c.lineTo(ex + s * 0.25, y + s * 0.25);
        c.moveTo(ex + s * 0.25, y - s * 0.25); c.lineTo(ex - s * 0.25, y + s * 0.25); c.stroke();
        continue;
      }
      ell(c, ex, y, s * 0.32, s * 0.4, 0, '#fff', '#222', s * 0.08);
      circ(c, ex - s * 0.08, y + s * 0.04, s * 0.18, '#222');
      circ(c, ex - s * 0.13, y - s * 0.06, s * 0.07, '#fff');
      if (mood === 1) {
        c.strokeStyle = '#222'; c.lineWidth = s * 0.12; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex - s * 0.35 * k, y - s * 0.62); c.lineTo(ex + s * 0.3 * k, y - s * 0.42); c.stroke();
      }
    }
  }
  function shade(c, x, y, r, k = 0.5) {
    const g = c.createRadialGradient(x - r * 0.45, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${k})`);
    circ(c, x, y, r, g);
  }

  // -------------------------------------------------------------------
  //  わくせい
  // -------------------------------------------------------------------
  const CRATERS = [[-0.35, -0.3, 0.22], [0.3, 0.1, 0.16], [-0.1, 0.45, 0.18], [0.45, -0.45, 0.1], [-0.55, 0.2, 0.1], [0.05, -0.05, 0.08]];
  function drawPlanet(c, key, x, y, r, t = 0) {
    c.save();
    if (key === 'saturn') ring(c, x, y, r, -0.35, true);
    if (key === 'uranus') uRing(c, x, y, r, true);
    if (key === 'sun') {
      const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 1.6);
      g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(0.6, 'rgba(255,140,0,.25)'); g.addColorStop(1, 'rgba(255,100,0,0)');
      circ(c, x, y, r * 1.6, g);
    }
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    switch (key) {
      case 'sun': {
        const g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
        g.addColorStop(0, '#fffbd0'); g.addColorStop(0.5, '#ffc93c'); g.addColorStop(1, '#ff7b00');
        circ(c, x, y, r, g);
        for (let i = 0; i < 7; i++) circ(c, x + Math.cos(i * 2.3 + t * 0.3) * r * 0.55, y + Math.sin(i * 1.7) * r * 0.5, r * 0.12, 'rgba(255,140,0,.35)');
        break;
      }
      case 'mercury':
        circ(c, x, y, r, '#a8a29e');
        for (const [a, b, s] of CRATERS) { circ(c, x + a * r, y + b * r, s * r, '#8a8480'); circ(c, x + a * r + s * r * 0.15, y + b * r + s * r * 0.15, s * r * 0.75, '#77716d'); }
        break;
      case 'venus':
        circ(c, x, y, r, '#e9c46a');
        c.strokeStyle = 'rgba(255,240,200,.6)'; c.lineWidth = r * 0.12;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(x - r * 0.3, y + i * r * 0.35, r * 1.1, r * 0.25, 0.2, 0, Math.PI); c.stroke(); }
        break;
      case 'earth':
        circ(c, x, y, r, '#2f7de1');
        c.fillStyle = '#3fae4a';
        ell(c, x - r * 0.35, y - r * 0.15, r * 0.35, r * 0.5, 0.4, '#3fae4a');
        ell(c, x + r * 0.35, y + r * 0.25, r * 0.3, r * 0.4, -0.3, '#3fae4a');
        ell(c, x + r * 0.25, y - r * 0.45, r * 0.25, r * 0.15, 0.2, '#58c05a');
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = r * 0.1; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - r * 0.8, y + r * 0.1); c.quadraticCurveTo(x - r * 0.2, y - r * 0.15, x + r * 0.2, y + r * 0.05); c.stroke();
        c.beginPath(); c.moveTo(x - r * 0.1, y + r * 0.6); c.quadraticCurveTo(x + r * 0.3, y + r * 0.5, x + r * 0.7, y + r * 0.6); c.stroke();
        ell(c, x, y - r * 0.97, r * 0.3, r * 0.1, 0, 'rgba(255,255,255,.9)');
        break;
      case 'mars':
        circ(c, x, y, r, '#c8552a');
        ell(c, x - r * 0.3, y + r * 0.1, r * 0.35, r * 0.18, 0.3, '#9e3d1c');
        ell(c, x + r * 0.3, y - r * 0.2, r * 0.25, r * 0.12, -0.2, '#a4421f');
        circ(c, x + r * 0.15, y + r * 0.5, r * 0.08, '#8c3418');
        ell(c, x, y - r * 0.95, r * 0.45, r * 0.18, 0, '#fff');
        break;
      case 'jupiter': {
        const cols = ['#efe0c8', '#c99a6c', '#efe3cf', '#b5835a', '#e9d4b5', '#c38f62', '#efe0c8', '#b98a63'];
        for (let i = 0; i < 8; i++) { c.fillStyle = cols[i]; c.fillRect(x - r, y - r + i * r / 4, r * 2, r / 4 + 1); }
        ell(c, x + r * 0.3, y + r * 0.32, r * 0.24, r * 0.14, 0, '#c2502d', '#e8a07a', r * 0.03);
        break;
      }
      case 'saturn': {
        const cols = ['#f1dcae', '#e3c98e', '#efd9a6', '#d4b77a', '#ecd49c', '#e3c98e'];
        for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.fillRect(x - r, y - r + i * r / 3, r * 2, r / 3 + 1); }
        break;
      }
      case 'uranus':
        circ(c, x, y, r, '#a6e6ea');
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x - r * 0.25, y - r, r * 0.2, r * 2);
        break;
      case 'neptune':
        circ(c, x, y, r, '#3d63dd');
        c.fillStyle = 'rgba(120,160,255,.35)'; c.fillRect(x - r, y - r * 0.2, r * 2, r * 0.12);
        ell(c, x - r * 0.2, y + r * 0.2, r * 0.25, r * 0.14, 0, '#223c96');
        ell(c, x + r * 0.1, y - r * 0.4, r * 0.3, r * 0.05, 0, 'rgba(255,255,255,.75)');
        break;
      case 'pluto':
        circ(c, x, y, r, '#c9a582');
        ell(c, x - r * 0.5, y - r * 0.1, r * 0.35, r * 0.5, 0.2, '#7b4e33');
        // ハート（トンボー領域）
        c.fillStyle = '#f5e8d6'; c.beginPath();
        const hx = x + r * 0.15, hy = y + r * 0.1, hs = r * 0.5;
        c.moveTo(hx, hy + hs * 0.7);
        c.bezierCurveTo(hx - hs, hy, hx - hs * 0.5, hy - hs * 0.7, hx, hy - hs * 0.25);
        c.bezierCurveTo(hx + hs * 0.5, hy - hs * 0.7, hx + hs, hy, hx, hy + hs * 0.7);
        c.fill();
        break;
      case 'moon':
        circ(c, x, y, r, '#d9d6cf');
        for (const [a, b, s] of CRATERS) circ(c, x + a * r, y + b * r, s * r, '#bdb8ae');
        break;
    }
    c.restore();
    if (key !== 'sun') shade(c, x, y, r, 0.5);
    if (key === 'saturn') ring(c, x, y, r, -0.35, false);
    if (key === 'uranus') uRing(c, x, y, r, false);
    c.restore();
  }
  // どせいの わ（back=true で うしろ はんぶん）
  function ring(c, x, y, r, rot, back) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath();
    if (back) c.ellipse(0, 0, r * 2.1, r * 0.5, 0, Math.PI, TAU);
    else c.ellipse(0, 0, r * 2.1, r * 0.5, 0, 0, Math.PI);
    c.strokeStyle = 'rgba(222,200,150,.9)'; c.lineWidth = r * 0.32; c.stroke();
    c.strokeStyle = 'rgba(160,130,90,.6)'; c.lineWidth = r * 0.05; c.stroke();
    c.restore();
  }
  function uRing(c, x, y, r, back) {
    c.save(); c.translate(x, y); c.rotate(0.12);
    c.beginPath();
    if (back) c.ellipse(0, 0, r * 0.35, r * 1.8, 0, -Math.PI / 2, Math.PI / 2);
    else c.ellipse(0, 0, r * 0.35, r * 1.8, 0, Math.PI / 2, Math.PI * 1.5);
    c.strokeStyle = 'rgba(200,240,250,.75)'; c.lineWidth = Math.max(1, r * 0.07); c.stroke();
    c.restore();
  }

  // -------------------------------------------------------------------
  //  ロケット
  // -------------------------------------------------------------------
  function drawShip(c, x, y, t, o = {}) {
    const s = o.scale || 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (o.tilt) c.rotate(o.tilt);
    // ほのお
    const fl = 8 + Math.sin(t * 40) * 3 + Math.random() * 2;
    c.beginPath(); c.moveTo(-12, -4); c.lineTo(-12 - fl, 0); c.lineTo(-12, 4); c.closePath();
    c.fillStyle = '#ffb703'; c.fill();
    c.beginPath(); c.moveTo(-12, -2); c.lineTo(-12 - fl * 0.55, 0); c.lineTo(-12, 2); c.closePath();
    c.fillStyle = '#fff3b0'; c.fill();
    // はね
    const fin = o.chibi ? '#4dabf7' : '#e03131';
    c.fillStyle = fin;
    c.beginPath(); c.moveTo(-8, -5); c.lineTo(-14, -12); c.lineTo(-3, -5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-8, 5); c.lineTo(-14, 12); c.lineTo(-3, 5); c.closePath(); c.fill();
    // どう
    c.beginPath(); c.moveTo(-12, -6); c.lineTo(6, -6); c.quadraticCurveTo(16, -5, 18, 0); c.quadraticCurveTo(16, 5, 6, 6); c.lineTo(-12, 6); c.closePath();
    c.fillStyle = o.chibi ? '#ffe066' : '#f8f9fa'; c.fill();
    c.strokeStyle = '#495057'; c.lineWidth = 1; c.stroke();
    // さき
    c.beginPath(); c.moveTo(10, -5.2); c.quadraticCurveTo(16, -4.5, 18, 0); c.quadraticCurveTo(16, 4.5, 10, 5.2); c.closePath();
    c.fillStyle = fin; c.fill();
    // まど
    circ(c, 1, 0, 3.4, '#74c0fc', '#495057', 1);
    circ(c, 0, -1, 1.1, '#fff');
    c.restore();
  }

  // -------------------------------------------------------------------
  //  てき（ステージ ごとに みため を かえる）
  // -------------------------------------------------------------------
  function drawEnemy(c, key, e, t) {
    c.save(); c.translate(e.x, e.y);
    const r = e.r, hurt = e.flash > 0;
    if (e.kind === 'rock' || e.kind === 'pebble') {
      c.rotate(e.rot || 0);
      const col = key === 'mars' ? '#b0532a' : key === 'earth' ? '#adb5bd' : '#8f8a86';
      c.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = r * (0.82 + ((i * 37) % 7) / 30); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = hurt ? '#fff' : col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke();
      circ(c, -r * 0.3, -r * 0.2, r * 0.25, 'rgba(0,0,0,.2)');
      circ(c, r * 0.3, r * 0.3, r * 0.18, 'rgba(0,0,0,.2)');
      if (e.kind === 'rock') { c.rotate(-(e.rot || 0)); eyes(c, 0, -r * 0.05, r * 0.45, 1); }
      c.restore(); return;
    }
    if (e.kind === 'grain') {
      const big = e.hp > 99;
      c.rotate(e.rot || 0);
      c.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); }
      c.closePath();
      c.fillStyle = hurt ? '#fff' : big ? '#9fb7c9' : '#dff3ff'; c.fill();
      c.strokeStyle = big ? '#5b7487' : '#8fc6e8'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-r * 0.4, -r * 0.4, r * 0.3, r * 0.3);
      c.restore(); return;
    }
    const body = THEME[key] || THEME.mercury;
    (e.kind === 'shooter' || e.kind === 'carrier' ? body.shooter : e.kind === 'spinner' ? spinnerDraw : body.flyer)(c, r, t + e.seed, hurt, e);
    if (e.kind === 'carrier') {
      c.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3;
      circ(c, 0, 0, r + 4, null, '#ffd43b', 2.5);
      c.globalAlpha = 1;
    }
    c.restore();
  }
  function spinnerDraw(c, r, t, hurt) {
    c.rotate(t * 3);
    ell(c, 0, 0, r * 0.35, r * 1.3, 0, null, 'rgba(200,240,250,.9)', 2);
    circ(c, 0, 0, r * 0.75, hurt ? '#fff' : '#7fd8e0', '#2b8a99', 1.5);
    c.rotate(-t * 3);
    eyes(c, 0, 0, r * 0.5, 0);
  }
  const THEME = {
    mercury: {
      flyer(c, r, t, hurt) { // いわこうもり
        const w = Math.sin(t * 12) * 0.4;
        c.fillStyle = hurt ? '#fff' : '#6c6560';
        for (const k of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(r * 0.2, k * r * (1.4 + w)); c.lineTo(r * 0.9, k * r * 0.4); c.closePath(); c.fill(); }
        circ(c, 0, 0, r * 0.8, hurt ? '#fff' : '#9a938d', '#4a4440', 1.2);
        eyes(c, -r * 0.1, 0, r * 0.5, 1);
      },
      shooter(c, r, t, hurt) { // クレーター UFO
        ell(c, 0, r * 0.15, r * 1.25, r * 0.45, 0, hurt ? '#fff' : '#868e96', '#343a40', 1.2);
        ell(c, 0, -r * 0.15, r * 0.65, r * 0.6, 0, hurt ? '#fff' : '#ced4da', '#343a40', 1.2);
        for (let i = -1; i <= 1; i++) circ(c, i * r * 0.7, r * 0.2, r * 0.12, (Math.floor(t * 6) + i) % 2 ? '#ffd43b' : '#fa5252');
        eyes(c, -r * 0.05, -r * 0.2, r * 0.45, 0);
      },
    },
    venus: {
      flyer(c, r, t, hurt) { // もくもく ぐも
        const col = hurt ? '#fff' : '#f4c95d';
        circ(c, -r * 0.5, r * 0.15, r * 0.6, col); circ(c, r * 0.4, r * 0.2, r * 0.55, col); circ(c, 0, -r * 0.2, r * 0.75, col);
        eyes(c, -r * 0.1, 0, r * 0.45, 0);
      },
      shooter(c, r, t, hurt) { // あつあつ ぐも
        const col = hurt ? '#fff' : '#f08c00';
        circ(c, -r * 0.6, r * 0.2, r * 0.6, col); circ(c, r * 0.5, r * 0.2, r * 0.6, col); circ(c, 0, -r * 0.2, r * 0.85, col);
        circ(c, 0, -r * 0.2, r * 0.55, '#ffd43b');
        eyes(c, -r * 0.1, -r * 0.25, r * 0.45, 1);
        ell(c, -r * 0.05, r * 0.35, r * 0.18, r * 0.12, 0, '#7a2e00');
      },
    },
    earth: {
      flyer(c, r, t, hurt) { // ちいさな うちゅうごみ ロボ
        c.rotate(Math.sin(t * 3) * 0.3);
        c.fillStyle = hurt ? '#fff' : '#adb5bd'; c.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        c.strokeStyle = '#495057'; c.lineWidth = 1; c.strokeRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        c.strokeStyle = '#868e96'; c.beginPath(); c.moveTo(0, -r * 0.6); c.lineTo(r * 0.3, -r * 1.2); c.stroke();
        circ(c, r * 0.3, -r * 1.2, r * 0.15, Math.floor(t * 4) % 2 ? '#ff6b6b' : '#ffe066');
        eyes(c, 0, 0, r * 0.4, 0);
      },
      shooter(c, r, t, hurt) { // じんこうえいせい
        c.fillStyle = hurt ? '#fff' : '#3b5bdb';
        for (const k of [-1, 1]) {
          c.fillRect(-r * 0.35, k * r * 0.75 - (k < 0 ? r * 0.8 : 0), r * 0.7, r * 0.8);
          c.strokeStyle = '#91a7ff'; c.lineWidth = 0.8; c.strokeRect(-r * 0.35, k * r * 0.75 - (k < 0 ? r * 0.8 : 0), r * 0.7, r * 0.8);
        }
        c.fillStyle = hurt ? '#fff' : '#fab005'; c.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        c.strokeStyle = '#7a5b00'; c.lineWidth = 1; c.strokeRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        ell(c, -r * 0.85, 0, r * 0.2, r * 0.45, 0, '#dee2e6', '#495057', 1);
        eyes(c, 0, 0, r * 0.4, 1);
      },
    },
    mars: {
      flyer(c, r, t, hurt) { // すなの つむじかぜ
        for (let i = 0; i < 4; i++) {
          const yy = -r + i * r * 0.6, w = r * (1 - i * 0.18);
          ell(c, Math.sin(t * 10 + i) * 2, yy, w, r * 0.22, 0, hurt ? '#fff' : `rgba(${200 - i * 10},${110 - i * 8},60,.9)`);
        }
        eyes(c, 0, -r * 0.45, r * 0.4, 0);
      },
      shooter(c, r, t, hurt) { // かせい たんさ ロボ
        ell(c, 0, r * 0.2, r * 1.2, r * 0.45, 0, hurt ? '#fff' : '#c2410c', '#5c1d00', 1.2);
        circ(c, 0, -r * 0.2, r * 0.6, hurt ? '#fff' : '#fd7e14', '#5c1d00', 1.2);
        for (const k of [-1, 1]) { c.strokeStyle = '#5c1d00'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(k * r * 0.3, -r * 0.7); c.lineTo(k * r * 0.5, -r * 1.2); c.stroke(); circ(c, k * r * 0.5, -r * 1.2, r * 0.13, '#ffe066'); }
        eyes(c, 0, -r * 0.2, r * 0.42, 1);
      },
    },
    jupiter: {
      flyer(c, r, t, hurt) { // ミニうず
        c.rotate(-t * 5);
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, r * (1 - i * 0.28), i, i + 4.2); c.strokeStyle = hurt ? '#fff' : ['#c99a6c', '#e9d4b5', '#c2502d'][i]; c.lineWidth = r * 0.28; c.stroke(); }
        c.rotate(t * 5);
        eyes(c, 0, 0, r * 0.38, 0);
      },
      shooter(c, r, t, hurt) { // あらしの め
        ell(c, 0, 0, r * 1.2, r * 0.85, 0, hurt ? '#fff' : '#c2502d', '#7a2b13', 1.5);
        c.rotate(-t * 3);
        c.beginPath(); c.arc(0, 0, r * 0.6, 0, 4); c.strokeStyle = '#f2b28f'; c.lineWidth = r * 0.15; c.stroke();
        c.rotate(t * 3);
        eyes(c, 0, 0, r * 0.45, 1);
      },
    },
    saturn: {
      flyer(c, r, t, hurt) { // こおりの けっしょう
        c.rotate(t * 2);
        c.strokeStyle = hurt ? '#fff' : '#a5d8ff'; c.lineWidth = r * 0.25; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); c.stroke(); }
        c.rotate(-t * 2);
        circ(c, 0, 0, r * 0.55, hurt ? '#fff' : '#e7f5ff', '#74c0fc', 1);
        eyes(c, 0, 0, r * 0.35, 0);
      },
      shooter(c, r, t, hurt) { // こおり ゴーレム
        c.beginPath(); c.moveTo(0, -r * 1.1); c.lineTo(r, -r * 0.2); c.lineTo(r * 0.6, r); c.lineTo(-r * 0.6, r); c.lineTo(-r, -r * 0.2); c.closePath();
        c.fillStyle = hurt ? '#fff' : '#bde0f6'; c.fill(); c.strokeStyle = '#4a90b8'; c.lineWidth = 1.5; c.stroke();
        eyes(c, 0, -r * 0.05, r * 0.45, 1);
      },
    },
    uranus: {
      flyer(c, r, t, hurt) { // よこむき こま
        c.rotate(Math.PI / 2 + Math.sin(t * 4) * 0.3);
        ell(c, 0, 0, r * 1.2, r * 0.4, 0, hurt ? '#fff' : '#66d9e8', '#1098ad', 1.2);
        circ(c, 0, 0, r * 0.55, hurt ? '#fff' : '#c5f6fa', '#1098ad', 1);
        c.rotate(-(Math.PI / 2 + Math.sin(t * 4) * 0.3));
        eyes(c, 0, 0, r * 0.35, 0);
      },
      shooter(c, r, t, hurt, e) { spinnerDraw(c, r, t, hurt, e); },
    },
    neptune: {
      flyer(c, r, t, hurt) { // かぜの こ
        c.fillStyle = hurt ? '#fff' : 'rgba(116,192,252,.9)';
        c.beginPath(); c.arc(0, 0, r * 0.8, -Math.PI / 2, Math.PI / 2);
        for (let i = 0; i < 3; i++) c.quadraticCurveTo(r * (1.4 + i * 0.3), r * (0.5 - i * 0.4), r * (1.6 + i * 0.2), r * (0.2 - i * 0.4));
        c.closePath(); c.fill();
        circ(c, 0, 0, r * 0.8, hurt ? '#fff' : '#a5d8ff');
        eyes(c, -r * 0.1, 0, r * 0.42, 0);
      },
      shooter(c, r, t, hurt) { // あおい クラゲ あらし
        c.strokeStyle = '#4263eb'; c.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(r * 0.5, i * r * 0.3); c.quadraticCurveTo(r * 1.1, i * r * 0.3 + Math.sin(t * 8 + i) * 4, r * 1.6, i * r * 0.4); c.stroke(); }
        ell(c, 0, 0, r * 0.9, r, 0, hurt ? '#fff' : '#364fc7', '#1c2f8a', 1.5);
        eyes(c, -r * 0.1, -r * 0.1, r * 0.45, 1);
      },
    },
    sun: {
      flyer(c, r, t, hurt) { // ひのたま
        for (let i = 0; i < 3; i++) circ(c, r * (0.5 + i * 0.5) + Math.random() * 2, Math.sin(t * 9 + i) * 2, r * (0.6 - i * 0.15), `rgba(255,${150 - i * 40},0,${0.7 - i * 0.2})`);
        circ(c, 0, 0, r * 0.9, hurt ? '#fff' : '#ffa94d', '#e8590c', 1.2);
        eyes(c, -r * 0.05, 0, r * 0.42, 0);
      },
      shooter(c, r, t, hurt) { // ほのおの せい
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 2; ell(c, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.35, r * 0.18, a, '#ff922b'); }
        circ(c, 0, 0, r * 0.9, hurt ? '#fff' : '#ffd43b', '#e8590c', 1.5);
        eyes(c, 0, -r * 0.05, r * 0.45, 1);
      },
    },
  };

  // -------------------------------------------------------------------
  //  ボス
  // -------------------------------------------------------------------
  function drawBoss(c, key, b, t) {
    const hurt = b.flash > 0, mood = b.dead ? 2 : (b.hp < b.maxHp * 0.5 ? 1 : 0);
    c.save(); c.translate(b.x, b.y);
    switch (key) {
      case 'mercury': {
        const R = b.r;
        c.rotate(Math.sin(t * 1.5) * 0.08);
        c.beginPath();
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = R * (0.9 + ((i * 53) % 11) / 60); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        c.closePath(); c.fillStyle = hurt ? '#fff' : '#9a938d'; c.fill(); c.strokeStyle = '#4a4440'; c.lineWidth = 2.5; c.stroke();
        for (const [a, bb, s] of CRATERS) circ(c, a * R, bb * R + R * 0.1, s * R * 0.8, 'rgba(0,0,0,.18)');
        // おうかん
        c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(-R * 0.45, -R * 0.75); c.lineTo(-R * 0.45, -R * 1.15); c.lineTo(-R * 0.2, -R * 0.95); c.lineTo(0, -R * 1.25); c.lineTo(R * 0.2, -R * 0.95); c.lineTo(R * 0.45, -R * 1.15); c.lineTo(R * 0.45, -R * 0.75); c.closePath(); c.fill();
        c.strokeStyle = '#b07a00'; c.lineWidth = 1.5; c.stroke();
        eyes(c, -R * 0.1, -R * 0.15, R * 0.42, mood);
        ell(c, -R * 0.1, R * 0.35, R * 0.22, R * 0.1, 0, '#3b3632');
        break;
      }
      case 'venus': {
        const R = b.r, col = hurt ? '#fff' : '#f4b942';
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + t * 0.5; circ(c, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.55, R * 0.5, col); }
        circ(c, 0, 0, R * 0.85, hurt ? '#fff' : '#ffd166');
        circ(c, 0, 0, R * 0.6, hurt ? '#fff' : '#ffe08a');
        eyes(c, -R * 0.1, -R * 0.12, R * 0.38, mood);
        ell(c, -R * 0.1, R * 0.3, R * 0.25, R * 0.15 + Math.sin(t * 6) * R * 0.04, 0, '#8a3b00');
        break;
      }
      case 'earth': {
        const R = b.r;
        c.fillStyle = hurt ? '#fff' : '#3b5bdb';
        for (const k of [-1, 1]) {
          const y0 = k < 0 ? -R * 1.9 : R * 0.6;
          c.fillRect(-R * 0.35, y0, R * 0.7, R * 1.3);
          c.strokeStyle = '#91a7ff'; c.lineWidth = 1;
          for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.35, y0 + i * R * 0.32); c.lineTo(R * 0.35, y0 + i * R * 0.32); c.stroke(); }
        }
        c.fillStyle = hurt ? '#fff' : '#fab005'; c.fillRect(-R * 0.7, -R * 0.7, R * 1.4, R * 1.4);
        c.strokeStyle = '#7a5b00'; c.lineWidth = 2; c.strokeRect(-R * 0.7, -R * 0.7, R * 1.4, R * 1.4);
        ell(c, -R * 1.0, 0, R * 0.3, R * 0.65, 0, '#e9ecef', '#495057', 2);
        circ(c, -R * 1.2, 0, R * 0.1, '#fa5252');
        eyes(c, 0, -R * 0.1, R * 0.42, mood);
        c.fillStyle = '#222'; c.fillRect(-R * 0.25, R * 0.3, R * 0.5, R * 0.08);
        break;
      }
      case 'mars': {
        const R = b.r;   // オリンポスさん（すそのが ひろい たて じょう かざん）
        c.beginPath(); c.moveTo(-R * 2.4, R * 2.2); c.quadraticCurveTo(-R * 1.4, -R * 0.2, -R * 0.6, -R * 0.55);
        c.lineTo(R * 0.6, -R * 0.55); c.quadraticCurveTo(R * 1.4, -R * 0.2, R * 2.4, R * 2.2); c.closePath();
        const g = c.createLinearGradient(0, -R, 0, R * 2.2); g.addColorStop(0, hurt ? '#fff' : '#d9622b'); g.addColorStop(1, '#7c2d12');
        c.fillStyle = g; c.fill(); c.strokeStyle = '#5c1d00'; c.lineWidth = 2; c.stroke();
        ell(c, 0, -R * 0.55, R * 0.6, R * 0.14, 0, '#5c1d00');
        ell(c, 0, -R * 0.6, R * 0.45, R * 0.08, 0, `rgba(255,${120 + Math.sin(t * 8) * 60},0,.9)`);
        eyes(c, 0, R * 0.1, R * 0.45, mood);
        ell(c, 0, R * 0.65, R * 0.3, R * 0.12, 0, '#4a1500');
        break;
      }
      case 'jupiter': {
        const R = b.r;
        c.rotate(-t * 0.8);
        for (let i = 0; i < 5; i++) {
          c.beginPath(); c.ellipse(0, 0, R * (1.3 - i * 0.2), R * (0.9 - i * 0.14), 0, i * 0.8, i * 0.8 + 5);
          c.strokeStyle = hurt ? '#fff' : ['#efe0c8', '#c99a6c', '#e8a07a', '#c2502d', '#a33b1e'][i]; c.lineWidth = R * 0.18; c.stroke();
        }
        c.rotate(t * 0.8);
        ell(c, 0, 0, R * 0.55, R * 0.4, 0, hurt ? '#fff' : '#c2502d', '#7a2b13', 2);
        eyes(c, 0, -R * 0.05, R * 0.32, mood);
        break;
      }
      case 'saturn': {
        const R = b.r;
        drawPlanet(c, 'saturn', 0, 0, R * 0.75, t);
        if (hurt) circ(c, 0, 0, R * 0.75, 'rgba(255,255,255,.6)');
        // かんむり
        c.fillStyle = '#f8f9fa'; c.beginPath();
        for (let i = 0; i < 5; i++) { const xx = -R * 0.4 + i * R * 0.2; c.lineTo(xx, -R * 0.7); c.lineTo(xx + R * 0.1, -R * (0.95 + (i % 2) * 0.12)); }
        c.lineTo(R * 0.4, -R * 0.7); c.closePath(); c.fill(); c.strokeStyle = '#74c0fc'; c.lineWidth = 1.5; c.stroke();
        eyes(c, 0, -R * 0.1, R * 0.32, mood);
        break;
      }
      case 'uranus': {
        const R = b.r;
        c.rotate(b.spin || 0);
        drawPlanet(c, 'uranus', 0, 0, R * 0.8, t);
        if (hurt) circ(c, 0, 0, R * 0.8, 'rgba(255,255,255,.6)');
        c.rotate(-(b.spin || 0));
        eyes(c, 0, -R * 0.05, R * 0.34, mood);
        break;
      }
      case 'neptune': {
        const R = b.r;
        circ(c, 0, 0, R, hurt ? '#fff' : '#2b4bc4', '#14256e', 2);
        c.rotate(t * 1.2);
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, R * (0.85 - i * 0.2), i * 2, i * 2 + 3.5); c.strokeStyle = 'rgba(160,190,255,.6)'; c.lineWidth = R * 0.08; c.stroke(); }
        c.rotate(-t * 1.2);
        ell(c, 0, R * 0.05, R * 0.6, R * 0.38, 0, hurt ? '#fff' : '#14256e');
        eyes(c, 0, 0, R * 0.36, mood);
        break;
      }
      case 'sun': {
        const R = b.r;
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + t * 0.4, l = R * (1.25 + Math.sin(t * 5 + i) * 0.1);
          c.beginPath(); c.moveTo(Math.cos(a - 0.12) * R * 0.9, Math.sin(a - 0.12) * R * 0.9); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + 0.12) * R * 0.9, Math.sin(a + 0.12) * R * 0.9);
          c.fillStyle = '#ff922b'; c.fill();
        }
        drawPlanet(c, 'sun', 0, 0, R, t);
        if (hurt) circ(c, 0, 0, R, 'rgba(255,255,255,.6)');
        eyes(c, 0, -R * 0.1, R * 0.35, mood);
        c.beginPath(); c.arc(0, R * 0.22, R * 0.22, 0.2, Math.PI - 0.2); c.strokeStyle = '#a33b00'; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.stroke();
        circ(c, -R * 0.45, R * 0.15, R * 0.1, 'rgba(255,90,90,.45)'); circ(c, R * 0.45, R * 0.15, R * 0.1, 'rgba(255,90,90,.45)');
        break;
      }
    }
    c.restore();
  }

  // -------------------------------------------------------------------
  //  はいけい
  // -------------------------------------------------------------------
  const STARS = [];
  for (let i = 0; i < 90; i++) STARS.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9, s: Math.random() < 0.15 ? 1.6 : 0.9 });
  const SKY = {
    mercury: ['#05060d', '#141420'], venus: ['#7a3d06', '#e8a23a'], earth: ['#020617', '#0b1a3a'],
    mars: ['#2b0e05', '#a8481d'], jupiter: ['#2a1a10', '#5c3b22'], saturn: ['#05040a', '#1a1528'],
    uranus: ['#03141a', '#0d3640'], neptune: ['#020a2b', '#0b2c7a'], sun: ['#3a0700', '#b33600'],
  };
  function stars(c, W, H, scroll, a = 1) {
    c.globalAlpha = a;
    for (const s of STARS) {
      const x = ((s.x * W - scroll * s.z * 0.5) % W + W) % W;
      c.fillStyle = '#fff'; c.fillRect(x, s.y * H, s.s, s.s);
    }
    c.globalAlpha = 1;
  }
  function drawBg(c, key, W, H, t, scroll, fx = {}) {
    const sk = SKY[key] || SKY.mercury;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    switch (key) {
      case 'mercury': {
        stars(c, W, H, scroll);
        drawPlanet(c, 'sun', -40, 40, 110, t);  // たいようが とても ちかい
        c.fillStyle = '#5f5a56';
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, H - 30 - Math.sin((x + scroll * 0.6) * 0.02) * 8);
        c.lineTo(W, H); c.fill();
        for (let i = 0; i < 6; i++) {
          const x = ((i * 130 - scroll * 0.6) % (W + 120) + W + 120) % (W + 120) - 60;
          ell(c, x, H - 14, 22 + (i % 3) * 8, 5, 0, '#4a4542'); ell(c, x, H - 15, 16 + (i % 3) * 6, 3, 0, '#3e3a37');
        }
        break;
      }
      case 'venus': {
        for (let l = 0; l < 3; l++) {
          c.fillStyle = ['rgba(255,214,140,.35)', 'rgba(240,160,60,.35)', 'rgba(255,230,170,.4)'][l];
          const sp = 0.3 + l * 0.35, yb = 50 + l * 90;
          for (let i = 0; i < 7; i++) {
            const x = ((i * 110 - scroll * sp) % (W + 160) + W + 160) % (W + 160) - 80;
            circ(c, x, yb + Math.sin(i * 2 + l) * 20, 40 + (i % 3) * 14, c.fillStyle);
          }
        }
        c.fillStyle = '#6b2f04'; c.fillRect(0, H - 14, W, 14);
        break;
      }
      case 'earth': {
        stars(c, W, H, scroll);
        drawPlanet(c, 'earth', W - 60 - ((scroll * 0.03) % 40), H + 120, 230, t);
        const mx = W + 80 - ((scroll * 0.1) % (W + 200));
        drawPlanet(c, 'moon', mx, 70, 22, t);
        break;
      }
      case 'mars': {
        stars(c, W, H * 0.4, scroll, 0.3);
        // オリンポスさん（とおくに ゆっくり）
        const ox = W * 0.7 - ((scroll * 0.08) % (W * 2.2)) + W * 0.6;
        c.fillStyle = '#8a3a17'; c.beginPath(); c.moveTo(ox - 260, H - 20); c.quadraticCurveTo(ox - 120, H - 95, ox - 40, H - 110); c.lineTo(ox + 40, H - 110); c.quadraticCurveTo(ox + 120, H - 95, ox + 260, H - 20); c.fill();
        c.fillStyle = '#6e2c11'; ell(c, ox, H - 110, 34, 5, 0, '#6e2c11');
        c.fillStyle = '#b4552b';
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W + 20; x += 16) c.lineTo(x, H - 26 - Math.sin((x + scroll * 0.9) * 0.025) * 10);
        c.lineTo(W, H); c.fill();
        break;
      }
      case 'jupiter': {
        const cols = ['#e9d4b5', '#c99a6c', '#efe3cf', '#b5835a', '#e3c49e', '#a6714a', '#efe0c8'];
        for (let i = 0; i < 7; i++) {
          c.fillStyle = cols[i]; c.globalAlpha = 0.55;
          c.beginPath(); c.moveTo(0, i * H / 7);
          for (let x = 0; x <= W; x += 16) c.lineTo(x, i * H / 7 + Math.sin((x + scroll * (0.3 + i * 0.07)) * 0.03 + i) * 4);
          c.lineTo(W, (i + 1) * H / 7 + 4); c.lineTo(0, (i + 1) * H / 7 + 4); c.fill();
        }
        c.globalAlpha = 1;
        const rx = W + 120 - ((scroll * 0.15) % (W + 300));
        ell(c, rx, H * 0.68, 70, 34, 0, 'rgba(194,80,45,.7)'); ell(c, rx, H * 0.68, 46, 20, 0, 'rgba(232,160,122,.6)');
        break;
      }
      case 'saturn': {
        stars(c, W, H, scroll);
        drawPlanet(c, 'saturn', W * 0.72 - ((scroll * 0.02) % 60), H * 0.42, 70, t);
        c.fillStyle = 'rgba(220,200,160,.5)';
        for (let i = 0; i < 40; i++) {
          const x = ((i * 53 - scroll * (1.2 + (i % 3) * 0.3)) % (W + 20) + W + 20) % (W + 20) - 10;
          c.fillRect(x, H * 0.82 + ((i * 17) % 40), 2, 2);
        }
        break;
      }
      case 'uranus': {
        stars(c, W, H, scroll);
        drawPlanet(c, 'uranus', W * 0.7 - ((scroll * 0.025) % 60), H * 0.5, 80, t);
        break;
      }
      case 'neptune': {
        stars(c, W, H, scroll, 0.5);
        drawPlanet(c, 'neptune', W * 0.75, H + 60, 150, t);
        c.strokeStyle = 'rgba(200,220,255,.35)'; c.lineWidth = 1.5;
        const sp = 3 + (fx.wind ? 6 : 0);
        for (let i = 0; i < 18; i++) {
          const x = ((i * 97 - scroll * sp) % (W + 80) + W + 80) % (W + 80) - 40, y = (i * 41) % H + (fx.windY || 0) * 0.2;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + (fx.wind ? 30 : 0), y); c.stroke();
        }
        break;
      }
      case 'sun': {
        const R = 600;
        const g2 = c.createRadialGradient(W * 0.5, H + R - 60, R * 0.8, W * 0.5, H + R - 60, R);
        g2.addColorStop(0, '#ffe066'); g2.addColorStop(1, '#ff8c00');
        circ(c, W * 0.5, H + R - 60, R, g2);
        for (let i = 0; i < 24; i++) {
          const x = ((i * 47 - scroll * 0.6) % (W + 40) + W + 40) % (W + 40) - 20;
          circ(c, x, H - 30 + ((i * 13) % 25), 6 + (i % 4), 'rgba(255,170,0,.5)');
        }
        // プロミネンス
        c.strokeStyle = 'rgba(255,90,40,.55)'; c.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          const x = ((i * 220 - scroll * 0.5) % (W + 200) + W + 200) % (W + 200) - 100;
          c.beginPath(); c.arc(x, H - 55, 30 + i * 6, Math.PI, TAU); c.stroke();
        }
        break;
      }
    }
  }

  return { circ, ell, eyes, drawPlanet, drawShip, drawEnemy, drawBoss, drawBg, TAU };
})();
