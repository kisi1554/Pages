"use strict";

/* おもちゃの 絵。Canvas に コードで かく（画像ファイルは つかわない）
 *  ART[id](c, p, col) … まんなか (0,0)、-50〜50 の はこに かく。
 *    p.a  まわる かくど / p.t  じかん（びょう）/ col  おもちゃの いろ
 *  drawToy(ctx, toy, size, p, x, y) で 大きさを きめて かく。
 */
const OL = '#4a3728';

const G = {
  path(c, fill, stroke, lw) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke !== false) { c.lineWidth = lw || 3; c.strokeStyle = stroke || OL; c.stroke(); }
  },
  circ(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); G.path(c, fill, stroke, lw); },
  ell(c, x, y, rx, ry, fill, stroke, lw, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); G.path(c, fill, stroke, lw); },
  rect(c, x, y, w, h, fill, r, stroke, lw) {
    c.beginPath();
    if (r) { if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); } else c.rect(x, y, w, h);
    G.path(c, fill, stroke, lw);
  },
  poly(c, pts, fill, stroke, lw) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath(); G.path(c, fill, stroke, lw);
  },
  line(c, x1, y1, x2, y2, col, lw) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.lineCap = 'round'; c.lineWidth = lw || 3; c.strokeStyle = col || OL; c.stroke();
  },
  eyes(c, x, y, gap, r) { G.circ(c, x - gap, y, r || 2.6, OL, false); G.circ(c, x + gap, y, r || 2.6, OL, false); },
  smile(c, x, y, w) { c.beginPath(); c.arc(x, y - w * 0.4, w, 0.2 * Math.PI, 0.8 * Math.PI); c.lineWidth = 2.2; c.strokeStyle = OL; c.stroke(); },
  cheek(c, x, y, gap) { G.ell(c, x - gap, y, 4, 2.6, 'rgba(255,120,140,.55)', false); G.ell(c, x + gap, y, 4, 2.6, 'rgba(255,120,140,.55)', false); },
  star(c, x, y, r, fill) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    G.poly(c, pts, fill || '#ffd43b', OL, 1.5);
  },
  gear(c, x, y, r, n, a, fill) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a0 = a + i * Math.PI / n;
      const rr = i % 2 ? r * 0.78 : r;
      c.lineTo(x + Math.cos(a0 - 0.18) * rr, y + Math.sin(a0 - 0.18) * rr);
      c.lineTo(x + Math.cos(a0 + 0.18) * rr, y + Math.sin(a0 + 0.18) * rr);
    }
    c.closePath(); G.path(c, fill, OL, 2.5);
    G.circ(c, x, y, r * 0.25, '#f1f3f5');
  }
};

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'];

/* こま（木・金）の からだ */
function drawKoma(c, p, col, gold) {
  const a = p.a || 0;
  G.line(c, 0, -34, 0, -12, '#8d5a2b', 6);
  c.save();
  c.beginPath(); c.moveTo(-40, -6); c.quadraticCurveTo(-30, 20, 0, 42); c.quadraticCurveTo(30, 20, 40, -6); c.closePath();
  G.path(c, gold ? '#f2b705' : col);
  c.clip();
  for (let i = -3; i < 6; i++) {
    const x = ((i * 16 + a * 18) % 96) - 40;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.12)';
    c.fillRect(x, -10, 8, 60);
  }
  c.restore();
  G.ell(c, 0, -6, 40, 11, gold ? '#ffe066' : '#f4d6a0');
  G.ell(c, 0, -6, 24, 6, false, gold ? '#e67700' : '#d9480f', 3);
  G.line(c, 0, 38, 0, 47, '#555', 4);
  if (gold) { G.star(c, -30, -30, 7); G.star(c, 32, -24, 5); }
}

function drawKendama(c, p, col, gold) {
  const main = gold ? '#f2b705' : '#d9a066';
  const bx = p.bx == null ? -18 : p.bx, by = p.by == null ? -36 : p.by;
  c.beginPath(); c.moveTo(4, 2); c.quadraticCurveTo(20, 30, bx, by + 14);
  c.lineWidth = 1.5; c.strokeStyle = '#555'; c.stroke();
  G.rect(c, -5, -10, 10, 56, main, 4);
  G.rect(c, -24, -4, 48, 12, main, 6);
  G.ell(c, -24, 2, 6, 9, main); G.ell(c, 24, 2, 6, 9, main);
  G.poly(c, [-4, -10, 0, -22, 4, -10], main);
  G.circ(c, bx, by, 15, gold ? '#ffd43b' : col);
  G.circ(c, bx - 5, by - 5, 4, 'rgba(255,255,255,.7)', false);
  G.circ(c, bx, by + 10, 3.5, '#3b2f2f', false);
  if (gold) G.star(c, 30, -34, 7);
}

function drawRecorder(c, col, holes) {
  c.save(); c.rotate(-0.5);
  G.rect(c, -7, -46, 14, 92, col, 6);
  G.rect(c, -9, -46, 18, 16, col, 5);
  G.rect(c, -4, -42, 8, 4, '#333', 1, false);
  for (let i = 0; i < (holes || 6); i++) G.circ(c, 0, -18 + i * 9, 2.6, '#3b2f2f', false);
  c.restore();
}

function drawTrain(c, col, kind) {
  if (kind === 'sl') {
    G.rect(c, -44, -6, 60, 26, col, 6);
    G.rect(c, 10, -26, 30, 46, col, 4);
    G.rect(c, 16, -20, 18, 14, '#ffe8a3', 3);
    G.rect(c, -34, -26, 10, 22, '#212529', 2);
    G.rect(c, -38, -30, 18, 6, '#212529', 2);
    G.circ(c, -48, 7, 6, '#f8f9fa');
    G.rect(c, -46, 20, 92, 6, '#c92a2a', 2);
    [-30, -8, 18, 34].forEach(x => { G.circ(c, x, 30, x > 10 ? 8 : 11, '#e03131'); G.circ(c, x, 30, 3, '#fff', false); });
  } else if (kind === 'shin') {
    c.beginPath(); c.moveTo(-46, 22); c.lineTo(-46, -8); c.quadraticCurveTo(-40, -20, 10, -20); c.quadraticCurveTo(40, -18, 50, 22); c.closePath();
    G.path(c, '#f8f9fa');
    G.rect(c, -46, 8, 94, 6, col, 0, false);
    c.beginPath(); c.moveTo(14, -16); c.quadraticCurveTo(32, -14, 38, -2); c.lineTo(14, -2); c.closePath(); G.path(c, '#364fc7', OL, 2);
    for (let i = 0; i < 5; i++) G.rect(c, -40 + i * 10, -10, 7, 8, '#74c0fc', 1, OL, 1.5);
    [-34, -20, 18, 32].forEach(x => G.circ(c, x, 26, 6, '#495057'));
  } else {
    G.rect(c, -46, -24, 92, 46, col, 8);
    G.rect(c, -46, 4, 92, 6, '#ffd43b', 0, false);
    for (let i = 0; i < 4; i++) G.rect(c, -38 + i * 21, -16, 15, 14, '#d0ebff', 3, OL, 2);
    G.line(c, -10, -24, -18, -40, OL, 2); G.line(c, -18, -40, 8, -40, OL, 2);
    [-30, -16, 16, 30].forEach(x => G.circ(c, x, 26, 7, '#495057'));
  }
}

function drawBars(c, colors, metal) {
  G.rect(c, -46, 18, 92, 8, '#8d5a2b', 3);
  G.line(c, -40, -26, -40, 26, '#8d5a2b', 4); G.line(c, 40, -26, 40, 26, '#8d5a2b', 4);
  for (let i = 0; i < 7; i++) {
    const h = 42 - i * 3.5;
    G.rect(c, -40 + i * 11.6, 18 - h, 9, h, metal ? ['#dee2e6', '#ced4da'][i % 2] : colors[i], 2, OL, 2);
  }
  G.line(c, 24, -38, 44, -18, '#8d5a2b', 3); G.circ(c, 22, -40, 5, '#e03131');
}

function drawDoll(c, col, p) {
  G.ell(c, 0, 22, 24, 24, col);
  G.rect(c, -24, 18, 48, 8, '#ffd43b', 2, OL, 2);
  G.circ(c, 0, -14, 22, '#ffe3cc');
  c.beginPath(); c.arc(0, -16, 23, Math.PI, 0); c.lineTo(23, -10); c.lineTo(10, -22); c.lineTo(-10, -22); c.lineTo(-23, -10); c.closePath();
  G.path(c, '#212529');
  G.eyes(c, 0, -8, 7); G.cheek(c, 0, -2, 12); G.smile(c, 0, 0, 4);
  G.circ(c, 14, -32, 5, '#ff8787');
}

const ART = {
  taketonbo(c, p, col) {
    G.rect(c, -4, -2, 8, 50, '#c8a24a', 3);
    const k = Math.cos(p.a || 0);
    G.rect(c, -46 * Math.abs(k) - 0.1, -10, 92 * Math.abs(k) + 0.2, 12, '#e3c67a', 5);
    G.line(c, -40 * k, -4, 40 * k, -4, 'rgba(120,80,20,.35)', 1.5);
    G.ell(c, 0, -4, 6, 7, '#b08636');
  },
  kazaguruma(c, p, col) {
    G.line(c, 0, 4, 0, 48, '#8d5a2b', 5);
    c.save(); c.rotate(p.a || 0);
    const cs = [col, '#ffd43b', '#4dabf7', '#69db7c'];
    for (let i = 0; i < 4; i++) {
      c.save(); c.rotate(i * Math.PI / 2);
      G.poly(c, [0, 0, 0, -36, 24, -24], cs[i]);
      c.restore();
    }
    c.restore();
    G.circ(c, 0, 0, 5, '#fff');
  },
  koma(c, p, col) { drawKoma(c, p, col, false); },
  kinkoma(c, p, col) { drawKoma(c, p, col, true); },
  kendama(c, p, col) { drawKendama(c, p, col, false); },
  kinkendama(c, p, col) { drawKendama(c, p, col, true); },
  kamifusen(c, p, col) {
    c.save();
    G.circ(c, 0, 0, 38, '#fff');
    c.clip();
    const cs = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#f783ac', '#ffa94d'];
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.ellipse(0, 0, 38 - i * 7, 40, 0, 0, Math.PI * 2);
      c.fillStyle = cs[i]; c.fill();
    }
    for (let i = -2; i <= 2; i++) G.line(c, -40, i * 13, 40, i * 13, 'rgba(255,255,255,.5)', 1);
    c.restore();
    G.circ(c, 0, 0, 38, false);
    G.circ(c, 0, -38, 4, '#fff');
  },
  mizudeppo(c, p, col) {
    G.rect(c, -40, -16, 64, 22, col, 10);
    G.rect(c, 20, -10, 26, 10, col, 4);
    G.poly(c, [-18, 4, -6, 4, -12, 36, -28, 36], col);
    G.rect(c, -34, -26, 26, 12, '#a5d8ff', 5);
    G.line(c, -6, 6, -2, 18, OL, 3);
    G.circ(c, -26, -6, 3, '#fff', false);
    if (p.t) for (let i = 0; i < 3; i++) G.circ(c, 52 + i * 6, -6 + Math.sin(p.t * 9 + i) * 2, 2.5, '#74c0fc', false);
  },
  densha(c, p, col) { drawTrain(c, col, 'ec'); },
  kisha(c, p, col) { drawTrain(c, col, 'sl'); },
  shinkansen(c, p, col) { drawTrain(c, col, 'shin'); },
  taiko(c, p, col) {
    G.rect(c, -34, -16, 68, 40, '#c92a2a', 6);
    G.ell(c, 0, 24, 34, 9, '#a61e4d');
    G.ell(c, 0, -16, 34, 10, '#fff4e6');
    for (let i = -3; i <= 3; i++) G.circ(c, i * 10, -2, 1.8, '#ffd43b', false);
    G.circ(c, 0, -16, 7, false, '#e8590c', 2);
    G.line(c, -40, -48, -10, -22, '#a9743a', 5); G.circ(c, -10, -22, 4, '#a9743a');
    G.line(c, 42, -46, 14, -24, '#a9743a', 5); G.circ(c, 14, -24, 4, '#a9743a');
  },
  fue(c, p, col) { drawRecorder(c, '#d9a066', 6); },
  ginfue(c, p, col) { drawRecorder(c, '#ced4da', 6); G.star(c, 28, -30, 7, '#f1f3f5'); },
  mangekyo(c, p, col) {
    c.save(); c.rotate(-0.6);
    G.rect(c, -14, -34, 28, 76, col, 6);
    for (let i = 0; i < 3; i++) G.rect(c, -14, -20 + i * 20, 28, 5, '#ffd43b', 0, false);
    c.restore();
    c.save(); c.translate(-22, -30);
    G.circ(c, 0, 0, 18, '#fff');
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4 + (p.a || 0));
      G.poly(c, [0, 0, -5, -15, 5, -15], RAINBOW[i % 7], false);
      c.restore();
    }
    G.circ(c, 0, 0, 18, false);
    c.restore();
  },
  okiagari(c, p, col) {
    G.ell(c, 0, 12, 34, 34, col);
    G.ell(c, 0, 2, 20, 18, '#fff3e0');
    G.eyes(c, 0, 0, 7); G.cheek(c, 0, 8, 12); G.smile(c, 0, 10, 4);
    G.circ(c, 0, -26, 9, '#ffd43b');
  },
  darumaotoshi(c, p, col) {
    const cs = ['#4dabf7', '#ffd43b', '#69db7c', '#ff8787'];
    for (let i = 0; i < 4; i++) G.rect(c, -24, 30 - i * 13, 48, 13, cs[i], 3, OL, 2);
    G.circ(c, 0, -28, 17, col);
    G.ell(c, 0, -27, 10, 9, '#fff3e0');
    G.eyes(c, 0, -28, 4, 1.8);
    G.line(c, 30, 12, 46, -6, '#a9743a', 4); G.rect(c, 38, -16, 14, 12, '#a9743a', 3);
  },
  jishaku(c, p, col) {
    c.beginPath(); c.arc(0, -4, 30, Math.PI, 0); c.lineTo(30, 34); c.lineTo(14, 34); c.lineTo(14, -4); c.arc(0, -4, 14, 0, Math.PI, true); c.lineTo(-14, 34); c.lineTo(-30, 34); c.closePath();
    G.path(c, col);
    G.rect(c, -30, 24, 16, 12, '#dee2e6', 0); G.rect(c, 14, 24, 16, 12, '#dee2e6', 0);
    c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center';
    c.fillText('N', -22, 33); c.fillText('S', 22, 33);
  },
  mushimegane(c, p, col) {
    G.line(c, 14, 14, 42, 42, '#e8590c', 9);
    G.circ(c, -6, -6, 28, '#e7f5ff', '#495057', 6);
    G.ell(c, -14, -16, 8, 4, 'rgba(255,255,255,.9)', false, 0, -0.7);
  },
  takeuma(c, p, col) {
    [-18, 18].forEach(x => {
      G.rect(c, x - 4, -46, 8, 92, '#94d82d', 3);
      for (let i = 0; i < 4; i++) G.line(c, x - 4, -30 + i * 20, x + 4, -30 + i * 20, '#5c940d', 2);
      G.rect(c, x - (x < 0 ? 14 : 0), 16, 14, 7, '#a9743a', 2, OL, 2);
    });
  },
  hagoita(c, p, col) {
    c.save(); c.rotate(-0.3);
    G.rect(c, -20, -42, 40, 60, '#fff0f6', 8);
    G.rect(c, -6, 18, 12, 28, '#d9a066', 3);
    G.circ(c, 0, -20, 9, '#ffe3cc'); G.rect(c, -12, -12, 24, 22, col, 4, OL, 2);
    c.restore();
    G.circ(c, 32, -24, 6, '#212529');
    [['#ff6b6b', -0.6], ['#ffd43b', 0], ['#69db7c', 0.6]].forEach(([cc, a]) => G.ell(c, 32 + Math.sin(a) * 9, -36, 3, 9, cc, OL, 1.5, a));
  },
  tako(c, p, col) {
    const sw = Math.sin((p.t || 0) * 3) * 6;
    c.beginPath(); c.moveTo(0, 28); c.quadraticCurveTo(10 + sw, 38, 0, 48); c.lineWidth = 2; c.strokeStyle = OL; c.stroke();
    G.poly(c, [0, -44, 32, -6, 0, 30, -32, -6], col);
    G.line(c, 0, -44, 0, 30, 'rgba(0,0,0,.3)', 2); G.line(c, -32, -6, 32, -6, 'rgba(0,0,0,.3)', 2);
    G.eyes(c, 0, -12, 9, 3); G.smile(c, 0, 4, 6);
    G.poly(c, [-3, 40, 3, 40, 0, 46], '#ffd43b', OL, 1);
  },
  itodenwa(c, p, col) {
    c.beginPath(); c.moveTo(-26, 4); c.quadraticCurveTo(0, 18 + Math.sin((p.t || 0) * 20) * 3, 26, 4);
    c.lineWidth = 1.5; c.strokeStyle = '#555'; c.stroke();
    G.poly(c, [-46, -16, -28, -10, -28, 18, -46, 24], col);
    G.ell(c, -46, 4, 5, 20, '#ffe066');
    G.poly(c, [46, -16, 28, -10, 28, 18, 46, 24], '#74c0fc');
    G.ell(c, 46, 4, 5, 20, '#a5d8ff');
  },
  ningyo(c, p, col) { drawDoll(c, col, p); },
  mokuba(c, p, col) {
    c.save(); c.rotate(Math.sin(p.a || 0) * 0.2);
    c.beginPath(); c.arc(0, -40, 84, Math.PI * 0.32, Math.PI * 0.68); c.lineWidth = 6; c.strokeStyle = '#8d5a2b'; c.stroke();
    G.line(c, -18, 10, -22, 34, '#a9743a', 6); G.line(c, 18, 10, 22, 34, '#a9743a', 6);
    G.ell(c, 0, 4, 30, 12, col);
    G.poly(c, [20, -2, 30, -30, 44, -26, 40, -14, 30, 4], col);
    G.circ(c, 36, -22, 2, OL, false);
    G.poly(c, [26, -28, 22, -40, 18, -24], '#ffd43b', OL, 2);
    G.poly(c, [-30, 0, -44, 12, -32, 8], '#ffd43b', OL, 2);
    c.restore();
  },
  tsumiki(c, p, col) {
    G.rect(c, -42, 6, 32, 32, '#ff8787', 2);
    G.rect(c, -6, 6, 46, 32, '#4dabf7', 2);
    G.poly(c, [-44, 6, -26, -24, -8, 6], '#ffd43b');
    G.rect(c, 4, -26, 22, 32, '#69db7c', 2);
    G.ell(c, 15, -26, 11, 4, '#8ce99a');
    G.circ(c, 26, 22, 6, '#fff', OL, 2);
  },
  furin(c, p, col) {
    const sw = Math.sin(p.a || 0) * 0.25;
    G.line(c, 0, -48, 0, -36, OL, 2);
    c.save(); c.translate(0, -36); c.rotate(sw);
    c.beginPath(); c.moveTo(-24, 22); c.quadraticCurveTo(-24, -2, 0, -2); c.quadraticCurveTo(24, -2, 24, 22); c.closePath();
    G.path(c, 'rgba(165,216,255,.75)');
    for (let i = -1; i <= 1; i++) G.circ(c, i * 10, 12, 3, ['#ff6b6b', '#ffd43b', '#69db7c'][i + 1], false);
    G.line(c, 0, 0, 0, 30, OL, 1.5);
    G.rect(c, -8, 30, 16, 40, '#fff0f6', 2, OL, 2);
    G.line(c, -4, 40, 4, 40, '#e64980', 2); G.line(c, -4, 50, 4, 50, '#e64980', 2);
    c.restore();
  },
  hanabi(c, p, col) {
    G.rect(c, -8, 18, 16, 28, '#e03131', 3);
    G.rect(c, -8, 26, 16, 6, '#ffd43b', 0, false);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, r = 18 + (i % 2) * 8;
      G.line(c, Math.cos(a) * 8, -12 + Math.sin(a) * 8, Math.cos(a) * r, -12 + Math.sin(a) * r, RAINBOW[i % 7], 3);
    }
    G.circ(c, 0, -12, 4, '#fff', false);
  },
  jidosha(c, p, col) {
    c.beginPath(); c.moveTo(-46, 16); c.lineTo(-46, -2); c.lineTo(-24, -6); c.lineTo(-12, -26); c.lineTo(18, -26); c.lineTo(30, -6); c.lineTo(46, -2); c.lineTo(46, 16); c.closePath();
    G.path(c, col);
    G.poly(c, [-10, -21, -4, -21, -4, -8, -18, -8], '#d0ebff', OL, 2);
    G.poly(c, [2, -21, 15, -21, 23, -8, 2, -8], '#d0ebff', OL, 2);
    G.circ(c, 42, 4, 3, '#ffe066', false);
    [-26, 26].forEach(x => { G.circ(c, x, 18, 11, '#343a40'); G.circ(c, x, 18, 4, '#dee2e6'); });
  },
  fune(c, p, col) {
    G.line(c, 0, -44, 0, 10, '#8d5a2b', 4);
    G.poly(c, [3, -40, 34, 2, 3, 2], '#fff');
    G.poly(c, [-3, -30, -26, 2, -3, 2], '#ffe066');
    G.poly(c, [-44, 10, 44, 10, 30, 30, -30, 30], col);
    G.circ(c, -14, 20, 3, '#fff', false); G.circ(c, 0, 20, 3, '#fff', false); G.circ(c, 14, 20, 3, '#fff', false);
    G.poly(c, [0, -44, 14, -38, 0, -32], '#ff6b6b', OL, 2);
  },
  kamihikoki(c, p, col) {
    G.poly(c, [46, -8, -40, -30, -18, 0], '#e7f5ff');
    G.poly(c, [46, -8, -18, 0, -34, 22], '#a5d8ff');
    G.poly(c, [46, -8, -18, 0, -12, 10], '#d0ebff');
  },
  mokkin(c, p, col) { drawBars(c, RAINBOW, false); },
  tekkin(c, p, col) { drawBars(c, RAINBOW, true); },
  wanage(c, p, col) {
    G.rect(c, -34, 30, 68, 12, '#a9743a', 3);
    G.rect(c, -4, -36, 8, 68, '#d9a066', 3);
    G.ell(c, 0, 22, 22, 7, false, '#e03131', 6);
    G.ell(c, 0, 10, 22, 7, false, '#ffd43b', 6);
    G.ell(c, 30, -24, 14, 14, false, '#4dabf7', 6);
  },
  tamaire(c, p, col) {
    G.line(c, 0, -10, 0, 46, '#adb5bd', 5);
    c.beginPath(); c.moveTo(-26, -40); c.lineTo(26, -40); c.lineTo(16, -8); c.lineTo(-16, -8); c.closePath();
    G.path(c, '#fff');
    for (let i = -2; i <= 2; i++) G.line(c, i * 10, -40, i * 6, -8, '#ced4da', 1.5);
    G.circ(c, -30, 30, 9, '#e03131'); G.circ(c, -14, 38, 9, '#fff'); G.circ(c, 26, 34, 9, '#e03131');
  },
  suisha(c, p, col) {
    c.save(); c.rotate(p.a || 0);
    G.circ(c, 0, 0, 36, false, '#8d5a2b', 5);
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4);
      G.line(c, 0, 0, 0, -36, '#8d5a2b', 3);
      G.rect(c, -8, -46, 16, 12, '#a9743a', 2, OL, 2);
      c.restore();
    }
    c.restore();
    G.circ(c, 0, 0, 7, '#5c3b1e');
    G.rect(c, -50, 36, 100, 12, '#74c0fc', 4, false);
  },
  kingyo(c, p, col) {
    c.beginPath(); c.arc(0, 6, 40, -0.2 * Math.PI, 1.2 * Math.PI); G.path(c, 'rgba(208,235,255,.8)');
    G.ell(c, 0, -26, 33, 6, '#e7f5ff');
    const sw = Math.sin((p.t || 0) * 4) * 4;
    G.ell(c, 2 + sw, 12, 14, 9, col);
    G.poly(c, [-10 + sw, 12, -24 + sw, 2, -22 + sw, 22], '#ff8787');
    G.circ(c, 9 + sw, 9, 2, OL, false);
    G.circ(c, 18 + sw, -6, 3, false, '#74c0fc', 1.5); G.circ(c, 22 + sw, -14, 2, false, '#74c0fc', 1.5);
  },
  kaigara(c, p, col) {
    c.beginPath(); c.moveTo(0, 32);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.1 + i * 0.1); c.lineTo(Math.cos(a) * 42, 10 + Math.sin(a) * 42); }
    c.closePath(); G.path(c, col);
    for (let i = 1; i < 8; i++) { const a = Math.PI * (1.1 + i * 0.1); G.line(c, 0, 30, Math.cos(a) * 40, 10 + Math.sin(a) * 40, '#e8590c', 1.5); }
    G.rect(c, -10, 28, 20, 10, col, 3);
  },
  sugoroku(c, p, col) {
    G.rect(c, -46, -40, 92, 70, '#fff9db', 6);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) G.rect(c, -38 + i * 20, -32 + r * 20, 16, 14, RAINBOW[(r * 4 + i) % 7], 2, OL, 1.5);
    G.rect(c, 14, 14, 26, 26, '#fff', 5);
    G.circ(c, 21, 21, 2.6, '#e03131', false); G.circ(c, 27, 27, 2.6, OL, false); G.circ(c, 33, 33, 2.6, OL, false);
  },
  fukuwarai(c, p, col) {
    G.ell(c, 0, 4, 38, 44, '#ffe8cc');
    c.beginPath(); c.arc(0, -6, 40, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(28, -30); c.lineTo(-28, -30); c.closePath(); G.path(c, '#212529');
    G.line(c, -20, -12, -8, -14, OL, 2); G.line(c, 8, -14, 20, -12, OL, 2);
    G.ell(c, -14, -2, 6, 2, OL, false); G.ell(c, 14, -2, 6, 2, OL, false);
    G.ell(c, 2, 12, 4, 6, '#ffc9c9');
    G.ell(c, -2, 28, 9, 4, '#fa5252');
    G.cheek(c, 0, 14, 22);
  },
  kusabue(c, p, col) {
    G.ell(c, -6, 0, 10, 44, col, OL, 3, 0.25);
    G.ell(c, 8, 4, 8, 40, '#8ce99a', OL, 3, 0.3);
    G.line(c, -16, -36, 4, 36, '#2b8a3e', 1.5);
  },
  yumiya(c, p, col) {
    c.beginPath(); c.arc(-40, 0, 46, -Math.PI / 2.4, Math.PI / 2.4); c.lineWidth = 6; c.strokeStyle = col; c.stroke();
    G.line(c, -28, -42, -28, 42, '#adb5bd', 1.5);
    G.line(c, -30, 0, 40, 0, '#8d5a2b', 3);
    G.poly(c, [46, 0, 36, -6, 36, 6], '#868e96', OL, 2);
    G.poly(c, [-30, 0, -40, -8, -36, 0, -40, 8], '#ff6b6b', OL, 1.5);
  },
  chikyugi(c, p, col) {
    G.rect(c, -22, 40, 44, 8, '#a9743a', 3);
    G.line(c, 0, 26, 0, 40, '#a9743a', 5);
    c.beginPath(); c.arc(0, -6, 38, -Math.PI * 0.75, Math.PI * 0.75); c.lineWidth = 4; c.strokeStyle = '#ced4da'; c.stroke();
    c.save();
    G.circ(c, 0, -6, 30, col);
    c.clip();
    const sh = ((p.a || 0) * 15) % 120;
    for (let k = -1; k <= 1; k++) {
      const x = k * 120 + sh;
      G.ell(c, x - 10, -16, 14, 10, '#69db7c', false);
      G.ell(c, x + 18, 4, 10, 14, '#69db7c', false);
      G.ell(c, x - 40, 8, 12, 8, '#69db7c', false);
    }
    c.restore();
    G.circ(c, 0, -6, 30, false);
  },
  temari(c, p, col) {
    G.circ(c, 0, 0, 38, col);
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate(i * Math.PI / 3 + (p.a || 0));
      G.poly(c, [0, -36, 10, -12, 0, 0, -10, -12], ['#ffd43b', '#fff', '#4dabf7'][i % 3], OL, 1.5);
      c.restore();
    }
    G.circ(c, 0, 0, 38, false);
  },
  yubiningyo(c, p, col) {
    G.poly(c, [-20, 44, -14, -6, 14, -6, 20, 44], col);
    G.circ(c, 0, -20, 18, '#ffe3cc');
    G.ell(c, -18, -30, 7, 10, col); G.ell(c, 18, -30, 7, 10, col);
    G.eyes(c, 0, -22, 6); G.cheek(c, 0, -15, 10); G.smile(c, 0, -12, 3);
    G.circ(c, -18, 14, 5, '#ffe3cc'); G.circ(c, 18, 14, 5, '#ffe3cc');
  },
  shabondama(c, p, col) {
    G.line(c, -40, 44, -16, 10, '#f59f00', 4); G.circ(c, -12, 5, 7, false, '#f59f00', 3);
    [[10, -16, 20], [-14, -34, 10], [34, 12, 11], [32, -38, 7]].forEach(([x, y, r]) => {
      const gr = '#fff';
      G.circ(c, x, y, r, 'rgba(153,233,242,.35)', '#66d9e8', 2);
      G.ell(c, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.15, gr, false, 0, -0.6);
      c.beginPath(); c.arc(x, y, r - 3, 0.2, 1.2); c.lineWidth = 2; c.strokeStyle = 'rgba(247,131,172,.7)'; c.stroke();
    });
  },
  akabeko(c, p, col) {
    G.line(c, -26, 18, -26, 36, OL, 5); G.line(c, -8, 18, -8, 36, OL, 5); G.line(c, 16, 18, 16, 36, OL, 5);
    G.ell(c, -8, 6, 32, 18, col);
    G.circ(c, -20, 0, 4, '#212529', false); G.circ(c, 0, 10, 3, '#ffd43b', false);
    c.save(); c.translate(20, -2); c.rotate(Math.sin(p.a || 0) * 0.35);
    G.ell(c, 14, -6, 16, 14, col);
    G.ell(c, 24, 0, 8, 6, '#212529');
    G.circ(c, 12, -10, 2.5, '#fff', false);
    G.poly(c, [4, -18, 0, -28, 10, -20], '#212529', OL, 1.5);
    c.restore();
  },
  haguruma(c, p, col) {
    const a = p.a || 0;
    G.gear(c, -14, 6, 26, 10, a, '#adb5bd');
    G.gear(c, 26, -20, 18, 7, -a * 26 / 18 + 0.2, '#ffd43b');
  },
  otedama(c, p, col) {
    [[-22, 16, col], [20, 18, '#ff8787'], [0, -18, '#4dabf7']].forEach(([x, y, cc]) => {
      G.ell(c, x, y, 18, 14, cc);
      G.line(c, x - 16, y, x + 16, y, 'rgba(255,255,255,.7)', 1.5);
      G.line(c, x, y - 12, x, y + 12, 'rgba(255,255,255,.7)', 1.5);
    });
  },
  kaitenmokuba(c, p, col) {
    G.poly(c, [-44, -18, 0, -46, 44, -18], col);
    G.rect(c, -44, -20, 88, 8, '#ffd43b', 2);
    G.rect(c, -46, 36, 92, 10, '#f3d9fa', 4);
    const a = p.a || 0;
    for (let i = 0; i < 3; i++) {
      const x = Math.sin(a + i * 2.1) * 32;
      const y = Math.sin(a * 3 + i) * 4;
      G.line(c, x, -12, x, 36, '#ffd43b', 2);
      G.ell(c, x, 14 + y, 10, 6, ['#fff', '#ffe066', '#a5d8ff'][i]);
      G.circ(c, x + 8, 8 + y, 4, ['#fff', '#ffe066', '#a5d8ff'][i]);
    }
    G.star(c, 0, -48, 5);
  },
  yakyuban(c, p, col) {
    G.rect(c, -46, -40, 92, 84, col, 6);
    G.poly(c, [0, 30, 28, 2, 0, -26, -28, 2], '#d9a066', '#fff', 2);
    for (const [x, y] of [[0, 30], [28, 2], [0, -26], [-28, 2]]) G.rect(c, x - 3, y - 3, 6, 6, '#fff', 0, false);
    G.circ(c, 0, 4, 4, '#fff', OL, 1.5);
    G.line(c, 6, 36, 22, 26, '#a9743a', 4);
  },
  iroenpitsu(c, p, col) {
    ['#fa5252', '#fab005', '#40c057', '#228be6', '#7950f2'].forEach((cc, i) => {
      c.save(); c.rotate(-0.5 + i * 0.25);
      G.rect(c, -4, -30, 8, 60, cc, 1, OL, 2);
      G.poly(c, [-4, -30, 4, -30, 0, -44], '#ffe3c4', OL, 1.5);
      G.poly(c, [-1.5, -39, 1.5, -39, 0, -44], cc, false);
      c.restore();
    });
  },
  toribue(c, p, col) {
    G.ell(c, -4, 6, 30, 22, col);
    G.circ(c, 20, -12, 15, col);
    G.poly(c, [32, -14, 46, -10, 32, -6], '#ffd43b');
    G.circ(c, 22, -15, 2.5, OL, false);
    G.poly(c, [-30, 0, -46, -8, -40, 10], col);
    G.ell(c, -4, 8, 12, 7, 'rgba(255,255,255,.4)', false);
    G.circ(c, 4, 22, 3, '#212529', false);
  },
  inu(c, p, col) {
    G.ell(c, -28, -4, 12, 22, '#8d5a2b', OL, 3, 0.3); G.ell(c, 28, -4, 12, 22, '#8d5a2b', OL, 3, -0.3);
    G.circ(c, 0, 2, 32, col);
    G.ell(c, 0, 16, 16, 11, '#f1d3b3');
    G.eyes(c, 0, -2, 11, 3.2);
    G.ell(c, 0, 10, 5, 4, OL, false);
    G.smile(c, 0, 20, 4);
  },
  hitsuji(c, p, col) {
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; G.circ(c, Math.cos(a) * 30, Math.sin(a) * 28 + 4, 12, '#fff', OL, 2); }
    G.circ(c, 0, 4, 30, '#fff', false);
    G.ell(c, 0, 8, 16, 18, '#ffe8cc');
    G.ell(c, -18, 0, 8, 4, '#ffe8cc', OL, 2, -0.5); G.ell(c, 18, 0, 8, 4, '#ffe8cc', OL, 2, 0.5);
    G.eyes(c, 0, 4, 6); G.ell(c, 0, 16, 3, 2, '#ffa8a8', false);
  },
  /* ---- ここから 2だんめの 45しゅるい ---- */
  mizuyoyo(c, p, col) {
    G.line(c, 0, -30, 0, -48, '#ff922b', 2); G.circ(c, 0, -50, 4, false, '#ff922b', 2);
    G.circ(c, 0, 4, 36, col);
    c.save(); G.circ(c, 0, 4, 36, false, false); c.clip();
    ['#ff6b6b', '#ffd43b', '#69db7c'].forEach((cc, i) => { c.beginPath(); c.moveTo(-40, -14 + i * 16); c.bezierCurveTo(-10, -24 + i * 16, 10, -4 + i * 16, 40, -14 + i * 16); c.lineWidth = 5; c.strokeStyle = cc; c.stroke(); });
    c.restore();
    G.circ(c, 0, 4, 36, false);
    G.ell(c, -14, -12, 9, 5, 'rgba(255,255,255,.7)', false, 0, -0.6);
  },
  kamizumo(c, p, col) {
    G.rect(c, -48, 30, 96, 16, '#c69c6d', 3);
    G.ell(c, 0, 30, 44, 6, '#e8c39e', OL, 2);
    G.poly(c, [-22, 28, -14, -8, 14, -8, 22, 28], col);
    G.rect(c, -16, 4, 32, 8, '#364fc7', 0, OL, 2);
    G.circ(c, 0, -20, 14, col);
    G.ell(c, 0, -34, 6, 4, OL, false);
    G.eyes(c, 0, -21, 5, 2); G.line(c, -4, -13, 4, -13, OL, 2);
    G.line(c, -14, -2, -28, 10, OL, 3); G.line(c, 14, -2, 28, 10, OL, 3);
  },
  kinkisha(c, p, col) {
    drawTrain(c, col, 'sl');
    G.star(c, -36, -38, 7, '#fff3bf'); G.star(c, 40, -38, 5, '#fff3bf');
  },
  uchiage(c, p, col) {
    G.rect(c, -14, 4, 28, 42, col, 4);
    G.rect(c, -14, 14, 28, 6, '#ffd43b', 0, OL, 2);
    G.line(c, 0, 4, 0, -6, OL, 2);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, r1 = 18, r2 = 40;
      G.line(c, Math.cos(a) * r1, -26 + Math.sin(a) * r1, Math.cos(a) * r2, -26 + Math.sin(a) * r2 * 0.7, RAINBOW[i % 7], 3);
    }
    G.circ(c, 0, -26, 6, '#fff3bf', OL, 1.5);
  },
  rocket(c, p, col) {
    c.save(); c.rotate(0.6);
    G.poly(c, [-14, 18, -28, 36, -14, 32], col); G.poly(c, [14, 18, 28, 36, 14, 32], col);
    c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(20, -26, 14, 30); c.lineTo(-14, 30); c.quadraticCurveTo(-20, -26, 0, -46); c.closePath(); G.path(c, '#f8f9fa');
    c.beginPath(); c.moveTo(0, -46); c.quadraticCurveTo(12, -36, 14, -26); c.lineTo(-14, -26); c.quadraticCurveTo(-12, -36, 0, -46); c.closePath(); G.path(c, col);
    G.circ(c, 0, -8, 7, '#74c0fc');
    G.poly(c, [-9, 30, 9, 30, 0, 46 + Math.sin((p.t || 0) * 30) * 3], '#ffa94d', '#e8590c', 2);
    c.restore();
  },
  sakanatsuri(c, p, col) {
    G.line(c, -44, 40, 10, -40, '#8d5a2b', 4);
    c.beginPath(); c.moveTo(10, -40); c.quadraticCurveTo(30, -30, 22, 0); c.lineWidth = 1.5; c.strokeStyle = OL; c.stroke();
    G.ell(c, 18, 22, 20, 12, col); G.poly(c, [-2, 22, -14, 12, -14, 32], col);
    G.circ(c, 30, 19, 2.5, OL, false);
    G.line(c, 22, 0, 30, 12, OL, 1.5);
    G.ell(c, -10, 46, 30, 4, 'rgba(116,192,252,.6)', false);
  },
  ushi(c, p, col) {
    G.ell(c, -30, -16, 12, 6, '#f8f9fa', OL, 3, -0.3); G.ell(c, 30, -16, 12, 6, '#f8f9fa', OL, 3, 0.3);
    G.poly(c, [-18, -24, -24, -42, -10, -28], '#fff3bf', OL, 2); G.poly(c, [18, -24, 24, -42, 10, -28], '#fff3bf', OL, 2);
    G.circ(c, 0, 0, 30, col);
    G.ell(c, -14, -10, 9, 7, '#343a40', false); G.ell(c, 16, 8, 6, 5, '#343a40', false);
    G.ell(c, 0, 18, 20, 13, '#ffc9c9');
    G.circ(c, -7, 18, 2.5, OL, false); G.circ(c, 7, 18, 2.5, OL, false);
    G.eyes(c, 0, -2, 11, 3);
  },
  uma(c, p, col) {
    G.poly(c, [-14, -30, -10, -46, -2, -30], col); G.poly(c, [14, -30, 10, -46, 2, -30], col);
    G.ell(c, 0, -2, 24, 32, col);
    G.ell(c, 0, 20, 18, 13, '#f1d3b3');
    G.circ(c, -6, 20, 2.5, OL, false); G.circ(c, 6, 20, 2.5, OL, false);
    for (let i = 0; i < 5; i++) G.ell(c, -6 + i * 3, -34 + i * 2, 6, 9, '#5c3d2e', false, 0, 0.4);
    G.eyes(c, 0, -6, 11, 3); G.smile(c, 0, 29, 4);
  },
  kabutomushi(c, p, col) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) G.line(c, s * 16, 4 + i * 12, s * 34, 10 + i * 14, OL, 3);
    G.ell(c, 0, 14, 22, 28, col);
    G.line(c, 0, -12, 0, 40, '#3b2a1e', 2);
    G.ell(c, 0, -16, 16, 10, '#3b2a1e');
    c.beginPath(); c.moveTo(-4, -24); c.quadraticCurveTo(-6, -46, 6, -48); c.quadraticCurveTo(2, -42, 4, -24); c.closePath(); G.path(c, '#3b2a1e');
    G.ell(c, -8, 6, 5, 12, 'rgba(255,255,255,.3)', false, 0, 0.2);
  },
  yukidaruma(c, p, col) {
    G.circ(c, 0, 20, 28, '#fff');
    G.circ(c, 0, -20, 20, '#fff');
    G.rect(c, -16, -46, 32, 12, '#e03131', 4);
    G.eyes(c, 0, -22, 7, 2.6); G.poly(c, [0, -16, 12, -14, 0, -12], '#ff922b', OL, 1.5);
    G.rect(c, -20, -4, 40, 6, col === '#e7f5ff' ? '#4dabf7' : col, 3, OL, 2);
    G.circ(c, 0, 14, 3, OL, false); G.circ(c, 0, 26, 3, OL, false);
    G.line(c, -26, 10, -44, -2, '#8d5a2b', 3); G.line(c, 26, 10, 44, -2, '#8d5a2b', 3);
  },
  kinokan(c, p, col) {
    G.poly(c, [-40, 26, -44, -24, -22, 0, 0, -36, 22, 0, 44, -24, 40, 26], col);
    G.rect(c, -42, 18, 84, 16, col, 4);
    G.circ(c, 0, 26, 6, '#e03131', OL, 2); G.circ(c, -24, 26, 4, '#4dabf7', OL, 2); G.circ(c, 24, 26, 4, '#69db7c', OL, 2);
    [-44, 0, 44].forEach((x, i) => G.circ(c, x, i === 1 ? -38 : -26, 5, '#fff3bf', OL, 2));
    G.star(c, 30, -40, 6, '#fff');
  },
  denshipiano(c, p, col) {
    G.rect(c, -48, -20, 96, 48, col, 8);
    G.rect(c, -42, 0, 84, 22, '#fff', 2, OL, 2);
    for (let i = 1; i < 8; i++) G.line(c, -42 + i * 10.5, 0, -42 + i * 10.5, 22, OL, 1.5);
    [1, 2, 4, 5, 6].forEach(i => G.rect(c, -42 + i * 10.5 - 3, 0, 6, 12, OL, 0, false));
    G.rect(c, -40, -14, 30, 9, '#69db7c', 2, OL, 1.5);
    ['#ff6b6b', '#ffd43b', '#4dabf7'].forEach((cc, i) => G.circ(c, 8 + i * 12, -10, 4, cc, OL, 1.5));
  },
  rappa(c, p, col) {
    c.save(); c.rotate(-0.25);
    G.rect(c, -42, -5, 56, 10, col, 4);
    c.beginPath(); c.moveTo(12, -6); c.lineTo(40, -22); c.quadraticCurveTo(46, 0, 40, 22); c.lineTo(12, 6); c.closePath(); G.path(c, col);
    G.ell(c, 41, 0, 5, 22, '#fff3bf');
    G.rect(c, -44, -7, 6, 14, '#e8590c', 2, OL, 2);
    [-24, -14, -4].forEach(x => G.rect(c, x - 2, -16, 5, 11, '#fff', 2, OL, 1.5));
    c.restore();
  },
  denden(c, p, col) {
    G.rect(c, -3, 14, 6, 34, '#c8a24a', 2);
    const sw = Math.sin((p.a || 0) * 3) * 0.6;
    for (const s of [-1, 1]) {
      const x = s * (34 + sw * s * 4), y = -6 + sw * 8 * s;
      G.line(c, s * 24, -6, x, y, OL, 1.5); G.circ(c, x, y, 5, '#fff');
    }
    G.ell(c, 0, -6, 24, 22, col);
    G.ell(c, 0, -6, 14, 13, '#fff3bf');
    c.beginPath(); c.arc(0, -6, 7, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = col; c.stroke();
  },
  suzu(c, p, col) {
    G.line(c, 0, -46, 0, -34, '#e03131', 3);
    G.ell(c, 0, -34, 7, 5, false, '#e03131', 3);
    G.circ(c, 0, 0, 32, col);
    G.line(c, -32, -4, 32, -4, OL, 3);
    G.circ(c, 0, 12, 5, OL, false); G.line(c, 0, 12, 0, 30, OL, 3);
    G.ell(c, -12, -16, 8, 5, 'rgba(255,255,255,.7)', false, 0, -0.5);
    if (p.a) G.star(c, 30, -26, 5, '#fff3bf');
  },
  hoshimange(c, p, col) {
    c.save(); c.rotate(-0.4);
    G.rect(c, -40, -16, 80, 32, col, 8);
    for (let i = 0; i < 4; i++) G.star(c, -26 + i * 17, 0, 6, ['#ffd43b', '#fff', '#f783ac', '#99e9f2'][i]);
    G.ell(c, 42, 0, 6, 16, '#e5dbff');
    c.restore();
    G.star(c, -30, -36, 8, '#ffd43b'); G.star(c, 34, 32, 7, '#fff3bf');
  },
  saikoro(c, p, col) {
    G.poly(c, [-30, -20, 0, -34, 30, -20, 0, -6], '#f1d3b3');
    G.poly(c, [-30, -20, 0, -6, 0, 34, -30, 20], col);
    G.poly(c, [30, -20, 0, -6, 0, 34, 30, 20], '#c69c6d');
    G.ell(c, 0, -20, 5, 3, '#e03131', false);
    [[-20, 0], [-10, 14]].forEach(([x, y]) => G.circ(c, x, y, 3, OL, false));
    [[10, 0], [20, 6], [10, 14], [20, 20], [10, 28], [20, 12]].slice(0, 6).forEach(([x, y]) => G.circ(c, x, y - 4, 2.5, OL, false));
  },
  ekaki(c, p, col) {
    G.rect(c, -46, -36, 92, 72, col, 12);
    G.rect(c, -38, -28, 76, 50, '#f1f3f5', 4, OL, 2);
    c.beginPath(); c.moveTo(-30, 10); c.quadraticCurveTo(-20, -20, -6, 4); c.quadraticCurveTo(6, 22, 20, -14); c.lineWidth = 2.5; c.strokeStyle = '#495057'; c.stroke();
    G.circ(c, 22, -12, 6, false, '#495057', 2);
    G.circ(c, -30, 29, 4, '#fff', OL, 1.5); G.circ(c, 30, 29, 4, '#fff', OL, 1.5);
  },
  kokuban(c, p, col) {
    G.rect(c, -48, -34, 96, 64, '#a9743a', 6);
    G.rect(c, -42, -28, 84, 50, col, 3, OL, 2);
    c.save(); c.font = '900 22px system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('あいう', 0, 4); c.restore();
    G.line(c, -30, 14, 28, 14, 'rgba(255,255,255,.7)', 2);
    G.rect(c, -40, 30, 80, 6, '#c69c6d', 2, OL, 2);
    G.rect(c, 10, 26, 14, 5, '#fff', 2, OL, 1.5); G.rect(c, -26, 25, 18, 6, '#ffd43b', 2, OL, 1.5);
  },
  enban(c, p, col) {
    G.ell(c, 0, -12, 18, 16, 'rgba(165,216,255,.8)');
    G.ell(c, 0, 4, 46, 14, col);
    G.ell(c, 0, 0, 30, 6, '#868e96', false);
    const a = p.a || 0;
    for (let i = 0; i < 5; i++) {
      const x = Math.cos(a + i * 1.256) * 36;
      if (Math.sin(a + i * 1.256) > -0.2) G.circ(c, x, 8, 4, RAINBOW[i], OL, 1.5);
    }
    G.circ(c, -5, -14, 2, OL, false); G.circ(c, 5, -14, 2, OL, false);
    G.poly(c, [-12, 18, 12, 18, 26, 46, -26, 46], 'rgba(255,236,153,.45)', false);
  },
  heli(c, p, col) {
    const k = Math.cos(p.a || 0);
    G.line(c, 0, -26, 0, -34, OL, 3);
    G.rect(c, -46 * Math.abs(k) - 0.1, -38, 92 * Math.abs(k) + 0.2, 6, '#495057', 3);
    G.rect(c, 10, -6, 38, 8, col, 3);
    G.rect(c, 42, -14, 6, 16, col, 2);
    G.ell(c, -6, 0, 26, 22, col);
    G.ell(c, -16, -4, 12, 10, '#d0ebff', OL, 2);
    G.line(c, -26, 28, 14, 28, OL, 3); G.line(c, -18, 20, -18, 28, OL, 2); G.line(c, 6, 20, 6, 28, OL, 2);
  },
  kisen(c, p, col) {
    G.poly(c, [-46, 4, 46, 4, 36, 28, -38, 28], '#343a40');
    G.rect(c, -46, 4, 92, 8, col, 0, OL, 2);
    G.rect(c, -26, -16, 46, 20, '#fff', 3);
    [-18, -6, 6].forEach(x => G.circ(c, x, -6, 3.5, '#74c0fc', OL, 1.5));
    G.rect(c, 2, -38, 14, 22, col, 2); G.rect(c, 2, -38, 14, 6, OL, 0, false);
    G.circ(c, 20, -46, 6, 'rgba(255,255,255,.9)', '#adb5bd', 2); G.circ(c, 32, -50, 8, 'rgba(255,255,255,.9)', '#adb5bd', 2);
  },
  kaizokusen(c, p, col) {
    c.beginPath(); c.moveTo(-46, 6); c.lineTo(46, 6); c.lineTo(34, 30); c.lineTo(-36, 30); c.closePath(); G.path(c, col);
    for (let i = 0; i < 4; i++) G.circ(c, -24 + i * 16, 16, 3.5, '#212529', false);
    G.line(c, 0, 6, 0, -46, '#5c3d2e', 4);
    c.beginPath(); c.moveTo(-28, -38); c.quadraticCurveTo(0, -30, 28, -38); c.lineTo(28, -6); c.quadraticCurveTo(0, 2, -28, -6); c.closePath(); G.path(c, '#f8f9fa');
    G.circ(c, 0, -22, 7, '#212529', false); G.line(c, -8, -12, 8, -12, '#212529', 3);
    G.rect(c, 0, -50, 16, 9, '#212529', 1, OL, 1.5);
  },
  yotto(c, p, col) {
    G.poly(c, [-40, 20, 40, 20, 30, 34, -32, 34], '#4dabf7');
    G.line(c, 0, 20, 0, -46, '#8d5a2b', 3);
    G.poly(c, [2, -44, 38, 14, 2, 14], col);
    G.poly(c, [-2, -36, -32, 14, -2, 14], '#ff8787');
    G.ell(c, 0, 40, 46, 5, 'rgba(116,192,252,.6)', false);
  },
  shobosha(c, p, col) {
    G.rect(c, -46, -16, 92, 34, col, 6);
    G.rect(c, 14, -30, 32, 22, col, 5);
    G.rect(c, 20, -26, 20, 12, '#d0ebff', 3, OL, 2);
    G.line(c, -40, -26, 6, -36, '#adb5bd', 5); G.line(c, -36, -24, 2, -32, '#fff', 1.5);
    G.rect(c, -40, -6, 48, 8, '#fff', 2, OL, 2);
    G.rect(c, 22, -38, 10, 6, '#4dabf7', 2, OL, 1.5);
    [-28, 26].forEach(x => { G.circ(c, x, 22, 10, '#495057'); G.circ(c, x, 22, 4, '#dee2e6', false); });
  },
  bus(c, p, col) {
    G.rect(c, -48, -26, 96, 48, col, 10);
    for (let i = 0; i < 4; i++) G.rect(c, -42 + i * 19, -18, 14, 14, '#d0ebff', 3, OL, 2);
    G.rect(c, 34, -18, 10, 30, '#d0ebff', 2, OL, 2);
    G.rect(c, -48, 4, 96, 4, '#e8590c', 0, false);
    G.circ(c, 44, 14, 3, '#fff3bf', OL, 1.5);
    [-28, 26].forEach(x => { G.circ(c, x, 24, 9, '#495057'); G.circ(c, x, 24, 3.5, '#dee2e6', false); });
  },
  fusen(c, p, col) {
    c.beginPath(); c.moveTo(0, 18); c.quadraticCurveTo(-8, 32, 4, 48); c.lineWidth = 1.5; c.strokeStyle = OL; c.stroke();
    c.beginPath(); c.moveTo(0, 18); c.bezierCurveTo(-40, 0, -34, -46, 0, -46); c.bezierCurveTo(34, -46, 40, 0, 0, 18); c.closePath(); G.path(c, col);
    G.poly(c, [0, 18, -5, 24, 5, 24], col, OL, 2);
    G.ell(c, -12, -28, 6, 10, 'rgba(255,255,255,.65)', false, 0, 0.4);
  },
  koinobori(c, p, col) {
    G.line(c, -44, -48, -44, 48, '#8d5a2b', 4);
    const w = Math.sin((p.t || 0) * 5) * 4;
    [[col, -28], ['#e03131', 6]].forEach(([cc, y], i) => {
      c.beginPath(); c.moveTo(-42, y - 12); c.quadraticCurveTo(0, y - 16 + w, 40, y - 10 - w); c.lineTo(30, y); c.lineTo(40, y + 10 + w); c.quadraticCurveTo(0, y + 16 - w, -42, y + 12); c.closePath(); G.path(c, cc);
      G.circ(c, -30, y - 2, 6, '#fff', OL, 2); G.circ(c, -30, y - 2, 2.5, OL, false);
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-12 + k * 14, y, 6, -1, 1); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke(); }
    });
    G.circ(c, -44, -48, 5, '#ffd43b');
  },
  torinotako(c, p, col) {
    c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(-30, -40, -48, -20); c.quadraticCurveTo(-30, -14, -10, 4); c.closePath(); G.path(c, col);
    c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(30, -40, 48, -20); c.quadraticCurveTo(30, -14, 10, 4); c.closePath(); G.path(c, col);
    G.ell(c, 0, 0, 10, 20, '#fff3bf');
    G.circ(c, 0, -20, 8, '#fff3bf'); G.poly(c, [-3, -16, 3, -16, 0, -8], '#ff922b', OL, 1.5); G.circ(c, -3, -22, 1.8, OL, false); G.circ(c, 3, -22, 1.8, OL, false);
    c.beginPath(); c.moveTo(0, 20); c.quadraticCurveTo(10, 34, -2, 48); c.lineWidth = 1.5; c.strokeStyle = OL; c.stroke();
  },
  hikosen(c, p, col) {
    G.ell(c, 0, -10, 46, 22, col);
    G.poly(c, [36, -10, 50, -26, 50, 6], col);
    for (let i = -1; i <= 1; i++) G.line(c, -40, -10 + i * 10, 40, -10 + i * 8, 'rgba(255,255,255,.6)', 1.5);
    G.line(c, -8, 12, -8, 18, OL, 2); G.line(c, 8, 12, 8, 18, OL, 2);
    G.rect(c, -14, 18, 28, 12, '#e03131', 3);
    G.rect(c, -8, 21, 6, 5, '#d0ebff', 1, OL, 1); G.rect(c, 2, 21, 6, 5, '#d0ebff', 1, OL, 1);
  },
  yukidama(c, p, col) {
    [[-18, 16, 18], [18, 20, 15], [0, -14, 22]].forEach(([x, y, r]) => {
      G.circ(c, x, y, r, '#fff');
      G.ell(c, x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, col, false, 0, -0.5);
    });
    G.star(c, 30, -30, 5, '#d0ebff');
  },
  bidama(c, p, col) {
    [[-20, 14, col], [18, 18, '#74c0fc'], [0, -16, '#ffa8a8'], [30, -18, '#ffe066']].forEach(([x, y, cc], i) => {
      const r = i === 3 ? 10 : 16;
      G.circ(c, x, y, r, 'rgba(255,255,255,.75)');
      c.beginPath(); c.moveTo(x - r * 0.7, y + r * 0.2); c.bezierCurveTo(x - r * 0.2, y - r * 0.7, x + r * 0.2, y + r * 0.7, x + r * 0.7, y - r * 0.2);
      c.lineWidth = r * 0.35; c.strokeStyle = cc; c.stroke();
      G.circ(c, x - r * 0.4, y - r * 0.4, r * 0.18, '#fff', false);
    });
  },
  bat(c, p, col) {
    c.save(); c.rotate(-0.7);
    c.beginPath(); c.moveTo(-4, 44); c.lineTo(-3, 0); c.quadraticCurveTo(-8, -40, 0, -48); c.quadraticCurveTo(8, -40, 3, 0); c.lineTo(4, 44); c.closePath(); G.path(c, col);
    G.ell(c, 0, 46, 7, 3, col);
    G.rect(c, -4, 24, 8, 16, '#343a40', 2, OL, 1.5);
    c.restore();
    G.circ(c, 26, 26, 12, '#fff'); c.beginPath(); c.arc(14, 26, 10, -0.8, 0.8); c.lineWidth = 1.5; c.strokeStyle = '#e03131'; c.stroke();
  },
  ball(c, p, col) {
    c.save(); c.rotate(p.a || 0);
    G.circ(c, 0, 0, 38, col);
    c.save(); G.circ(c, 0, 0, 38, false, false); c.clip();
    const pent = (x, y, r) => { const pts = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } G.poly(c, pts, '#212529', OL, 1.5); };
    pent(0, 0, 12);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; pent(Math.cos(a) * 36, Math.sin(a) * 36, 11); G.line(c, Math.cos(a) * 12, Math.sin(a) * 12, Math.cos(a) * 26, Math.sin(a) * 26, OL, 1.5); }
    c.restore();
    G.circ(c, 0, 0, 38, false);
    c.restore();
  },
  kaeru(c, p, col) {
    G.ell(c, 0, 14, 34, 24, col);
    G.circ(c, -16, -12, 12, col); G.circ(c, 16, -12, 12, col);
    G.circ(c, -16, -13, 6, '#fff', OL, 2); G.circ(c, 16, -13, 6, '#fff', OL, 2);
    G.circ(c, -15, -12, 3, OL, false); G.circ(c, 17, -12, 3, OL, false);
    c.beginPath(); c.arc(0, 8, 14, 0.2 * Math.PI, 0.8 * Math.PI); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
    G.cheek(c, 0, 12, 20);
    G.ell(c, -30, 34, 10, 5, col); G.ell(c, 30, 34, 10, 5, col);
    G.ell(c, 0, 20, 16, 10, 'rgba(255,255,255,.35)', false);
  },
  tokei(c, p, col) {
    G.circ(c, -24, -32, 11, '#ffd43b'); G.circ(c, 24, -32, 11, '#ffd43b');
    G.line(c, -26, 36, -34, 46, OL, 4); G.line(c, 26, 36, 34, 46, OL, 4);
    G.circ(c, 0, 4, 38, col);
    G.circ(c, 0, 4, 30, '#fff');
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; G.line(c, Math.cos(a) * 24, 4 + Math.sin(a) * 24, Math.cos(a) * 27, 4 + Math.sin(a) * 27, OL, i % 3 ? 1.5 : 3); }
    const a = (p.a || 0) - Math.PI / 2;
    G.line(c, 0, 4, Math.cos(a / 12) * 14, 4 + Math.sin(a / 12) * 14, OL, 4);
    G.line(c, 0, 4, Math.cos(a) * 22, 4 + Math.sin(a) * 22, '#e03131', 2.5);
    G.circ(c, 0, 4, 3, OL, false);
  },
  block(c, p, col) {
    const b = (x, y, w, cc) => { G.rect(c, x, y, w, 18, cc, 3); for (let i = 0; i < w / 14; i++) G.rect(c, x + 3 + i * 14, y - 5, 9, 5, cc, 1, OL, 2); };
    b(-42, 26, 56, '#4dabf7'); b(16, 26, 28, '#69db7c');
    b(-30, 3, 56, col); b(-16, -20, 28, '#ffd43b'); b(-12, -43, 28, '#f783ac');
  },
  chikyugoma(c, p, col) {
    const a = p.a || 0;
    G.line(c, 0, -46, 0, 44, OL, 3);
    G.circ(c, 0, -46, 3.5, '#adb5bd');
    G.ell(c, 0, 0, 40, 40, false, '#adb5bd', 5);
    G.ell(c, 0, 0, 40, 40, false, OL, 1.5);
    G.ell(c, 0, 0, 40, 12, false, '#ced4da', 4);
    const k = Math.cos(a);
    G.ell(c, 0, 0, 34, 10, col);
    G.line(c, -30 * k, -2, 30 * k, 2, '#fff', 2);
    G.line(c, -30 * Math.sin(a), 2, 30 * Math.sin(a), -2, '#ffd43b', 2);
    G.poly(c, [-6, 40, 6, 40, 0, 48], '#adb5bd', OL, 1.5);
  },
  begoma(c, p, col) {
    const a = p.a || 0;
    c.beginPath(); c.moveTo(-34, -10); c.lineTo(34, -10); c.lineTo(0, 30); c.closePath(); G.path(c, col);
    G.ell(c, 0, -10, 34, 12, '#adb5bd');
    for (let i = 0; i < 6; i++) {
      const t = a + i * Math.PI / 3, x = Math.cos(t) * 24;
      if (Math.sin(t) > 0) G.line(c, x * 0.4, -10 + Math.sin(t) * 4, x, -10 + Math.sin(t) * 8, OL, 2);
    }
    G.circ(c, 0, -10, 5, '#ffd43b', OL, 1.5);
    G.line(c, -22, 4, 22, 4, 'rgba(255,255,255,.5)', 2);
  },
  mugibue(c, p, col) {
    c.save(); c.rotate(-0.6);
    G.rect(c, -6, -44, 12, 88, col, 5);
    for (let i = 0; i < 3; i++) G.line(c, -6, -20 + i * 24, 6, -20 + i * 24, '#c8a24a', 2);
    G.poly(c, [-6, -44, 6, -44, 0, -52], col, OL, 2);
    c.restore();
    for (let i = 0; i < 3; i++) G.poly(c, [26 + i * 6, 30, 30 + i * 6, 6, 34 + i * 6, 30], '#c8a24a', OL, 1.5);
  },
  kubifuri(c, p, col) {
    G.ell(c, -6, 20, 30, 18, col);
    for (let i = 0; i < 3; i++) G.line(c, -20 + i * 12, 6, -16 + i * 12, 16, OL, 3);
    G.line(c, -22, 34, -22, 44, OL, 5); G.line(c, 8, 34, 8, 44, OL, 5);
    c.beginPath(); c.moveTo(-34, 16); c.quadraticCurveTo(-50, 10, -44, -4); c.lineWidth = 4; c.strokeStyle = OL; c.stroke();
    c.save(); c.translate(16, 0); c.rotate(Math.sin(p.a || 0) * 0.35);
    G.circ(c, 6, -16, 20, col);
    G.circ(c, -8, -32, 6, col); G.circ(c, 20, -32, 6, col);
    G.line(c, -6, -20, 2, -20, OL, 2); G.line(c, 10, -20, 18, -20, OL, 2);
    G.eyes(c, 6, -18, 7, 2.6); G.ell(c, 6, -9, 8, 5, '#fff');
    G.circ(c, 6, -11, 2.5, OL, false);
    c.restore();
  },
  ningyohime(c, p, col) {
    c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(-20, 30, 4, 40); c.lineTo(24, 30); c.lineTo(22, 46); c.lineTo(4, 44); c.quadraticCurveTo(-26, 34, 14, 4); c.closePath(); G.path(c, col);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-2, 12 + i * 8, 5, 0, Math.PI); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); }
    G.ell(c, 0, -2, 14, 10, '#ffe3cc');
    G.ell(c, -6, 0, 5, 4, '#f783ac', OL, 1.5); G.ell(c, 6, 0, 5, 4, '#f783ac', OL, 1.5);
    G.ell(c, 0, -26, 20, 20, '#ff922b');
    G.circ(c, 0, -22, 14, '#ffe3cc');
    G.eyes(c, 0, -23, 5, 2.2); G.smile(c, 0, -16, 3); G.cheek(c, 0, -18, 9);
    G.circ(c, 12, -34, 4, '#fff', OL, 1.5);
  },
  omen(c, p, col) {
    G.poly(c, [-34, -6, -30, -46, -10, -26], col); G.poly(c, [34, -6, 30, -46, 10, -26], col);
    G.poly(c, [-28, -12, -26, -38, -14, -26], '#ffa8a8', false); G.poly(c, [28, -12, 26, -38, 14, -26], '#ffa8a8', false);
    c.beginPath(); c.moveTo(-36, -18); c.quadraticCurveTo(0, -36, 36, -18); c.quadraticCurveTo(30, 20, 0, 42); c.quadraticCurveTo(-30, 20, -36, -18); c.closePath(); G.path(c, col);
    G.line(c, -22, -6, -8, -2, '#e03131', 3); G.line(c, 22, -6, 8, -2, '#e03131', 3);
    G.line(c, -18, -18, -10, -22, '#e03131', 2); G.line(c, 18, -18, 10, -22, '#e03131', 2);
    G.ell(c, 0, 34, 5, 4, OL, false);
    G.line(c, -6, 20, -26, 16, '#e03131', 1.5); G.line(c, 6, 20, 26, 16, '#e03131', 1.5);
  },
  nagareboshi(c, p, col) {
    for (let i = 0; i < 4; i++) G.line(c, -40 + i * 4, 30 - i * 12, 8, -6 - i * 3, ['#ffd43b', '#f783ac', '#99e9f2', '#fff3bf'][i], 4 - i * 0.5);
    G.star(c, 16, -14, 20, col);
    G.eyes(c, 16, -14, 4, 1.8); G.smile(c, 16, -8, 2.5);
    G.star(c, -30, -34, 5, '#fff3bf'); G.star(c, 38, 26, 4, '#fff3bf');
  },
  amagasa(c, p, col) {
    G.line(c, 0, -30, 0, 34, '#8d5a2b', 4);
    c.beginPath(); c.arc(-8, 34, 8, 0, Math.PI); c.lineWidth = 4; c.strokeStyle = '#8d5a2b'; c.stroke();
    c.save(); c.translate(0, -16); c.scale(1, 0.55); c.rotate(p.a || 0);
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4);
      G.poly(c, [0, 0, 46, -2, 32.5, 32.5], i % 2 ? col : '#fff');
      c.restore();
    }
    c.restore();
    G.circ(c, 0, -16, 4, '#ffd43b');
    G.line(c, 0, -16, 0, -40, '#8d5a2b', 3);
  }
};

function drawToy(ctx, toy, size, p, x, y) {
  ctx.save();
  ctx.translate(x == null ? size / 2 : x, y == null ? size / 2 : y);
  ctx.scale(size / 110, size / 110);
  ctx.lineJoin = 'round';
  (ART[toy.id] || ART.koma)(ctx, p || {}, toy.c);
  ctx.restore();
}
