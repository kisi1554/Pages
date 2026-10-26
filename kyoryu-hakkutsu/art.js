/* きょうりゅう はっくつ — え（きょうりゅう・ほねを コードで かく）
 *
 * からだの「かた（テンプレート）」を しゅるいごとに 1つ よういして、
 * くび・しっぽ・あしの ながさや かざり（つの・えりかざり・いた・ほ…）を データで かえる。
 * おなじ かたちから「にく（いろつき）」「ほね」「シルエット」を かく ので、
 * くみたての ピースと かんせい した すがたが ぴったり かさなる。
 *
 * ざひょう: 1たんい = からだの ながさの やく 1/100。y は 上が プラス、じめん = 0。
 */
var ART = (function () {
  'use strict';

  var OL = '#3d2b1f';            // りんかくせん
  var BONE = '#f3e8cc', BOL = '#6b4f33', HOLE = '#5b4430';
  var HORN = '#f1e7cf';

  /* ===== からだの かた =====
   * spine: しっぽの さき → くびの ねもと（[x, y, ふとさ]）。hipI = こし、shI = かた。
   * head: b = あたまの うしろの まる、s = はなさきの まる（[x, y, はんけい]）
   * hind / front: [つけね, ひざ(ひじ), あしくび(てくび), つまさき] と それぞれの ふとさ */
  var T = {
    thero: {
      spine: [[0, 22, .8], [15, 26, 2], [30, 30, 4], [42, 32, 7], [49, 33, 9], [58, 34, 10], [66, 33, 9], [72, 35, 6.5], [76, 39, 5.5]],
      hipI: 4, shI: 6,
      head: { b: [79, 41, 5], s: [91, 38, 3] },
      hind: { p: [[50, 32], [55, 20], [51, 7], [57, 0]], r: [6.5, 4, 2.6, 1.8] },
      front: { p: [[67, 30], [70, 26], [73, 25], [75, 25.5]], r: [2, 1.5, 1, .8] }
    },
    sauro: {
      spine: [[0, 8, .6], [14, 13, 1.6], [28, 18, 3.5], [38, 21, 6], [46, 23, 7.5], [55, 24, 8.5], [63, 24, 7.5], [70, 29, 4.5], [76, 36, 3.6], [81, 43, 3], [85, 49, 2.6]],
      hipI: 4, shI: 6, quad: true,
      head: { b: [87, 50, 2.6], s: [91, 49, 1.7] },
      hind: { p: [[47, 20], [47, 11], [46, 3], [48.5, 0]], r: [5.5, 4, 3.4, 3] },
      front: { p: [[63, 21], [63, 12], [63, 3], [64.5, 0]], r: [4.4, 3.4, 3, 2.7] }
    },
    hadro: {
      spine: [[0, 18, .8], [14, 24, 2.5], [28, 29, 5], [38, 32, 8], [46, 33, 10], [55, 31, 10.5], [63, 27, 9], [70, 27, 6], [75, 30, 5]],
      hipI: 4, shI: 6, quad: true,
      head: { b: [78, 31, 4.5], s: [89, 26, 3.2] },
      hind: { p: [[47, 29], [52, 18], [48, 6], [53, 0]], r: [6.5, 4, 2.6, 1.9] },
      front: { p: [[64, 21], [65, 13], [66, 4], [68, 0]], r: [2.6, 2, 1.6, 1.4] }
    },
    cera: {
      spine: [[0, 14, .8], [12, 18, 2], [24, 22, 4], [34, 26, 7], [42, 29, 11], [52, 30, 12.5], [62, 27, 11], [70, 23, 8.5]],
      hipI: 4, shI: 6, quad: true,
      head: { b: [75, 23, 8], s: [88, 16, 4] },
      hind: { p: [[43, 24], [45, 14], [43, 4], [46, 0]], r: [6.5, 4.5, 3.4, 2.8] },
      front: { p: [[63, 20], [61, 12], [64, 3], [66, 0]], r: [4.6, 3.6, 3, 2.6] }
    },
    stego: {
      spine: [[0, 16, .8], [12, 22, 2], [25, 28, 4.5], [36, 33, 8], [44, 35, 11], [52, 34, 12], [62, 27, 10], [70, 20, 6], [75, 17, 4.5]],
      hipI: 4, shI: 6, quad: true,
      head: { b: [78, 16, 3.5], s: [85, 13, 2] },
      hind: { p: [[45, 30], [46, 18], [44, 5], [47, 0]], r: [6.5, 4.5, 3.4, 2.8] },
      front: { p: [[64, 22], [64, 12], [65, 3], [67, 0]], r: [4.2, 3.4, 2.8, 2.4] }
    },
    ankylo: {
      spine: [[0, 12, 1.2], [14, 14, 2], [28, 16, 4], [38, 18, 7], [46, 19, 10], [56, 20, 11], [64, 19, 10], [71, 17, 7]],
      hipI: 4, shI: 6, quad: true,
      head: { b: [76, 16, 6], s: [84, 14, 4] },
      hind: { p: [[47, 15], [48, 9], [47, 3], [49.5, 0]], r: [5.5, 4, 3.2, 2.8] },
      front: { p: [[65, 14], [65, 8], [66, 2.5], [68, 0]], r: [4.5, 3.6, 3, 2.6] }
    },
    ptero: {
      spine: [[26, 40, .4], [32, 41, 1.2], [37, 42, 2.4], [43, 43, 3.2], [48, 44, 3], [52, 46, 2.2], [55, 48, 1.8]],
      hipI: 2, shI: 4, free: true, wing: true,
      head: { b: [58, 49, 2.2], s: [72, 46, .6] },
      hind: { p: [[37, 41], [35, 37], [33, 34], [31, 33]], r: [1.2, .9, .7, .5] },
      front: { p: [[48, 44], [43, 51], [50, 56], [24, 72]], r: [1.4, 1.1, .9, .3] }
    },
    plesio: {
      spine: [[0, 14, .6], [10, 15, 2], [20, 16, 4], [28, 17, 7], [38, 18, 8.5], [48, 18, 7.5], [56, 20, 4], [66, 23, 3], [76, 25, 2.5], [86, 26, 2.2]],
      hipI: 3, shI: 5, free: true,
      head: { b: [88, 26, 2.5], s: [95, 25, 1.5] },
      hind: { p: [[30, 13], [24, 7], [19, 4], [14, 2.5]], r: [3, 2.6, 1.8, .7] },
      front: { p: [[48, 13], [46, 7], [42, 3], [37, 1.5]], r: [3.2, 2.8, 2, .8] }
    },
    mosa: {
      spine: [[0, 20, 1], [15, 19, 3], [30, 18, 5.5], [42, 17, 7], [55, 17, 8], [65, 17, 7.5], [72, 17, 6.5]],
      hipI: 3, shI: 5, free: true,
      head: { b: [76, 17, 6], s: [93, 16, 2.8] },
      hind: { p: [[42, 12], [39, 8], [36, 6], [33, 5]], r: [2.2, 2, 1.6, .7] },
      front: { p: [[64, 12], [62, 7], [59, 4.5], [55, 3.5]], r: [2.6, 2.4, 1.9, .8] }
    },
    ichthyo: {
      spine: [[2, 20, 1], [14, 19, 2.5], [28, 19, 6], [38, 19, 9], [48, 19, 10], [58, 19, 9], [66, 19, 7.5]],
      hipI: 3, shI: 5, free: true,
      head: { b: [70, 19, 6.5], s: [92, 18, 1.2] },
      hind: { p: [[38, 13], [36, 10], [34, 8.5], [32, 8]], r: [1.6, 1.4, 1.1, .5] },
      front: { p: [[58, 13], [56, 8], [53, 5.5], [49, 4.5]], r: [2.4, 2.2, 1.7, .7] }
    }
  };

  /* ===== ちいさな けいさん ===== */
  function cp(a) { return a.map(function (p) { return p.slice(); }); }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function rot(p, c, a) {
    var s = Math.sin(a), co = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + co * dx - s * dy, c[1] + s * dx + co * dy].concat(p.slice(2));
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(h, k) { // k<0 くらく、k>0 あかるく
    var c = hexRgb(h).map(function (v) { return Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); });
    return 'rgb(' + c.join(',') + ')';
  }

  /* ===== からだを くみたてる（しゅるいごとの ちがいを あてはめる） ===== */
  var cache = {};
  function build(sp) {
    if (cache[sp.id]) return cache[sp.id];
    var t = T[sp.type], m = sp.mod || {};
    var spine = cp(t.spine), hind = cp(t.hind.p), front = cp(t.front.p);
    var hr = t.hind.r.slice(), fr = t.front.r.slice();
    var b = t.head.b.slice(), s = t.head.s.slice();
    var S = spine[t.shI].slice(), P = spine[t.hipI].slice();
    var nk = m.nk || 1, tl = m.tl || 1, bt = m.bt || 1, hs = m.hs || 1;
    var last = spine.length - 1, old = spine[last].slice(), i;
    for (i = t.shI + 1; i <= last; i++) {
      spine[i][0] = S[0] + (spine[i][0] - S[0]) * nk;
      spine[i][1] = S[1] + (spine[i][1] - S[1]) * nk;
      spine[i][2] *= (m.nr || 1);
    }
    var dx = spine[last][0] - old[0], dy = spine[last][1] - old[1];
    b[0] += dx; b[1] += dy; s[0] += dx; s[1] += dy;
    var hsn = hs * (m.sn || 1);
    s[0] = b[0] + (s[0] - b[0]) * hsn; s[1] = b[1] + (s[1] - b[1]) * hsn;
    b[2] *= hs; s[2] *= hs * (m.sr || 1);
    for (i = 0; i < t.hipI; i++) {
      spine[i][0] = P[0] + (spine[i][0] - P[0]) * tl;
      spine[i][1] = P[1] + (spine[i][1] - P[1]) * (m.tly || tl);
    }
    spine.forEach(function (p) { p[2] *= bt; });
    function scaleLeg(L, k) { for (var j = 1; j < 4; j++) { L[j][0] = L[0][0] + (L[j][0] - L[0][0]) * k; L[j][1] = L[0][1] + (L[j][1] - L[0][1]) * k; } }
    scaleLeg(hind, m.hl || 1); scaleLeg(front, m.fl || 1);
    var lk = Math.sqrt(bt) * (m.lr || 1);
    hr = hr.map(function (r) { return r * lk; });
    fr = fr.map(function (r) { return r * lk * (m.fr || 1); });
    // じめんに あしを つける（4本あしは まえと うしろで べつべつに）
    if (!t.free) {
      var dh = hr[3] - hind[3][1], df = t.quad ? fr[3] - front[3][1] : dh;
      var sh = function (x) { return x >= S[0] ? df : x <= P[0] ? dh : lerp(dh, df, (x - P[0]) / (S[0] - P[0])); };
      spine.forEach(function (p) { p[1] += sh(p[0]); });
      b[1] += df; s[1] += df;
      hind.forEach(function (p) { p[1] += dh; });
      var f0 = t.quad ? df : sh(front[0][0]);
      front.forEach(function (p) { p[1] += f0; });
      S[1] += df; P[1] += dh;
    }
    var M = { sp: sp, t: t, spine: spine, hipI: t.hipI, shI: t.shI, b: b, s: s, hind: hind, front: front, hr: hr, fr: fr };
    sample(M);
    // ながさ（はなさき 〜 しっぽの さき）。よくりゅうは つばさを ひろげた はば
    if (t.wing) {
      var w = 0; for (i = 0; i < 3; i++) w += dist(front[i], front[i + 1]);
      M.measure = w * 2 + 6;
    } else M.measure = M.dEnd + dist(b, s) + b[2] + s[2];
    pieceInfo(M);
    bbox(M);
    cache[sp.id] = M;
    return M;
  }

  // せぼねを なめらかに こまかく する（Catmull-Rom）
  function sample(M) {
    var P = M.spine, out = [], d = 0, prev = null;
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      var n = Math.max(2, Math.ceil(dist(p1, p2) / .45));
      for (var k = 0; k < n; k++) {
        var u = k / n, u2 = u * u, u3 = u2 * u;
        var x = .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3);
        var y = .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
        if (prev) d += Math.hypot(x - prev[0], y - prev[1]);
        var pt = [x, y, lerp(p1[2], p2[2], u), i < M.hipI ? 'tail' : i < M.shI ? 'torso' : 'neck', d];
        out.push(pt); prev = pt;
      }
    }
    var L = P[P.length - 1];
    d += Math.hypot(L[0] - prev[0], L[1] - prev[1]);
    out.push([L[0], L[1], L[2], 'neck', d]);
    M.sm = out;
    M.dEnd = d;
    M.dHip = near(out, M.spine[M.hipI]);
    M.dSh = near(out, M.spine[M.shI]);
  }
  function near(sm, p) {
    var best = 1e9, bd = 0;
    sm.forEach(function (q) { var e = Math.hypot(q[0] - p[0], q[1] - p[1]); if (e < best) { best = e; bd = q[4]; } });
    return bd;
  }

  // くみたての ピースの わけかた
  function pieceInfo(M) {
    var f = M.sp.f || {};
    M.tailLen = M.dHip; M.neckLen = M.dEnd - M.dSh;
    M.nTail = M.tailLen > 30 ? 3 : M.tailLen > 13 ? 2 : 1;
    M.nNeck = M.neckLen > 20 ? 2 : 1;
    var legLen = function (L) { return dist(L[0], L[1]) + dist(L[1], L[2]) + dist(L[2], L[3]); };
    M.splitHind = legLen(M.hind) > 18;
    M.splitFront = legLen(M.front) > 22;
    var ids = ['skull'];
    if (f.frill) ids.push('frill');
    for (var i = 1; i <= M.nNeck; i++) ids.push('neck' + i);
    ids.push('back', 'ribs', 'hip');
    for (i = 1; i <= M.nTail; i++) ids.push('tail' + i);
    if (M.splitHind) ids.push('hindN1', 'hindN2'); else ids.push('hindN1');
    ids.push('hindF');
    if (M.splitFront) ids.push('frontN1', 'frontN2'); else ids.push('frontN1');
    ids.push('frontF');
    if (f.plates) ids.push('plates');
    M.pieces = ids;
  }

  // じっさいに かいて はみだしを しらべる（かざりも ふくめた ただしい わく）
  function bbox(M) {
    var s = 4, W = 190 * s, H = 150 * s, ox = 40 * s, oy = 120 * s;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d');
    drawRaw(x, M, ox, oy, s, false, pose(M, {}), { mode: 'flesh' });
    var d = x.getImageData(0, 0, W, H).data, x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (var yy = 0; yy < H; yy += 2) for (var xx = 0; xx < W; xx += 2) {
      if (d[(yy * W + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    }
    M.bb = { x0: (x0 - ox) / s, x1: (x1 - ox) / s, y0: (oy - y1) / s, y1: (oy - y0) / s };
    M.bb.w = M.bb.x1 - M.bb.x0; M.bb.h = M.bb.y1 - M.bb.y0;
  }

  /* ===== うごき（あるく・およぐ・とぶ・なく） =====
   * a: { ph: あるく いそう, w: あるく つよさ 0〜1, t: じかん(びょう), mouth: くち 0〜1 } */
  function pose(M, a) {
    var t = M.t, ph = a.ph || 0, w = a.w || 0, tm = a.t || 0;
    var S = M.spine[M.shI], P = M.spine[M.hipI];
    var swim = t.free && !t.wing, fly = t.wing;
    var bob = t.free ? Math.sin(tm * 2) * .8 : .5 * w * Math.cos(2 * ph);
    var sway = swim ? Math.sin(ph) * .18 * Math.max(w, .3) : (.07 * w * Math.sin(ph) + .03 * Math.sin(tm * 1.7));
    var nod = (swim ? .04 * Math.sin(ph + 1) : .04 * w * Math.sin(2 * ph)) + .02 * Math.sin(tm * 1.3) + (a.mouth ? .06 * a.mouth : 0);
    var tl = M.dHip || 1, nl = (M.dEnd - M.dSh) || 1;
    var sm = M.sm.map(function (p) {
      var q = p;
      if (p[3] === 'tail') q = rot(p, P, sway * (M.dHip - p[4]) / tl);
      else if (p[3] === 'neck') q = rot(p, S, nod * (p[4] - M.dSh) / nl);
      return [q[0], q[1] + bob, p[2], p[3], p[4]];
    });
    var b = rot(M.b, S, nod), s = rot(M.s, S, nod);
    b[1] += bob; s[1] += bob;
    function leg(L, k, ang, bend) {
      var o = L.map(function (p) { return [p[0] + k[0], p[1] + k[1] + bob]; });
      var c = o[0];
      o = o.map(function (p, i) { return i ? rot(p, c, ang) : p; });
      if (bend) { var kn = o[1]; o = o.map(function (p, i) { return i > 1 ? rot(p, kn, bend) : p; }); }
      return o;
    }
    var A = t.quad ? .22 : .38, g;
    var far = [-1.2, .7];
    if (fly) {
      var fl = .45 * Math.sin(ph * 1.3) + .1;
      g = { hind: leg(M.hind, [0, 0], .1 * Math.sin(ph), 0), hindF: leg(M.hind, far, .1 * Math.sin(ph + 1), 0),
        front: leg(M.front, [0, 0], fl, 0), frontF: leg(M.front, [2.5, 3], fl * .85 + .15, 0) };
    } else if (swim) {
      var fp = .45 * Math.sin(ph * 1.2) * Math.max(w, .4);
      g = { hind: leg(M.hind, [0, 0], fp * .7, 0), hindF: leg(M.hind, far, -fp * .7, 0),
        front: leg(M.front, [0, 0], fp, 0), frontF: leg(M.front, far, -fp, 0) };
    } else {
      var lift = function (p) { return -.55 * w * Math.max(0, Math.cos(p)); };
      g = {
        hind: leg(M.hind, [0, 0], A * w * Math.sin(ph), lift(ph)),
        hindF: leg(M.hind, far, A * w * Math.sin(ph + Math.PI), lift(ph + Math.PI)),
        front: leg(M.front, [0, 0], A * w * Math.sin(ph + Math.PI) * (t.quad ? 1 : .4), t.quad ? lift(ph + Math.PI) : 0),
        frontF: leg(M.front, far, A * w * Math.sin(ph) * (t.quad ? 1 : .4), t.quad ? lift(ph) : 0)
      };
    }
    g.sm = sm; g.b = b; g.s = s; g.mouth = a.mouth || 0;
    g.S = [S[0], S[1] + bob]; g.P = [P[0], P[1] + bob];
    return g;
  }

  /* ===== かたちの みち（Path） ===== */
  // ふとさの ちがう 2つの まるを つないだ かたち（カプセル）
  function capsule(c, x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d <= Math.abs(r1 - r2) + 1e-6) {
      var R = Math.max(r1, r2), X = r1 > r2 ? x1 : x2, Y = r1 > r2 ? y1 : y2;
      c.moveTo(X + R, Y); c.arc(X, Y, R, 0, Math.PI * 2); return;
    }
    var th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    c.moveTo(x1 + r1 * Math.cos(th + al), y1 + r1 * Math.sin(th + al));
    c.arc(x1, y1, r1, th + al, th + Math.PI * 2 - al);
    c.arc(x2, y2, r2, th - al, th + al);
    c.closePath();
  }
  function circ(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, Math.max(r, .01), 0, Math.PI * 2); }
  function tubePath(c, sm, add, filt) {
    for (var i = 0; i < sm.length; i++) { var p = sm[i]; if (filt && !filt(p)) continue; circ(c, p[0], p[1], p[2] + add); }
  }
  function limbPath(c, L, R, add) {
    for (var i = 0; i < 3; i++) capsule(c, L[i][0], L[i][1], R[i] + add, L[i + 1][0], L[i + 1][1], R[i + 1] + add);
  }
  function headVec(g) {
    var dx = g.s[0] - g.b[0], dy = g.s[1] - g.b[1], d = Math.hypot(dx, dy) || 1;
    var u = [dx / d, dy / d];
    return { u: u, up: [-u[1], u[0]], L: d };
  }
  function at(p, hv, a, bb) { return [p[0] + hv.u[0] * a + hv.up[0] * bb, p[1] + hv.u[1] * a + hv.up[1] * bb]; }
  function jaw(g, hv) {
    var rb = g.b[2], rs = g.s[2];
    var jb = at(g.b, hv, 0, -rb * .32), js = at(g.s, hv, -rs * .2, -rs * .35);
    js = rot(js, jb, -g.mouth * .5);
    return { jb: jb, js: js, rb: rb * .62, rs: rs * .62 };
  }
  function headPath(c, g, hv, add, f) {
    capsule(c, g.b[0], g.b[1], g.b[2] + add, g.s[0], g.s[1], g.s[2] + add);
    if (f.dome) { var d = at(g.b, hv, g.b[2] * .1, g.b[2] * .5); circ(c, d[0], d[1], g.b[2] * .85 + add); }
  }
  function jawPath(c, g, hv, add) {
    var j = jaw(g, hv);
    capsule(c, j.jb[0], j.jb[1], j.rb + add, j.js[0], j.js[1], j.rs + add);
  }
  function tang(sm, i) {
    var a = sm[Math.max(0, i - 2)], b = sm[Math.min(sm.length - 1, i + 2)];
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }
  // せぼねに そって 一定の かんかくで よぶ
  function along(sm, step, d0, d1, fn) {
    var next = d0;
    for (var i = 0; i < sm.length; i++) {
      var p = sm[i];
      if (p[4] < next || p[4] > d1) continue;
      var t = tang(sm, i);
      fn(p, t, [-t[1], t[0]], i);
      next = p[4] + step;
    }
  }
  function poly(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function fillStroke(c, path, fill, lw, stroke) {
    c.beginPath(); path(); c.fillStyle = fill; c.fill();
    if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke || OL; c.lineJoin = 'round'; c.stroke(); }
  }
  // そとがわだけ ふちどり（ふちの いろで 太く ぬって から なかを ぬる）
  function blob(c, pathAdd, fill, lw, edge) {
    if (lw > 0) { c.beginPath(); pathAdd(lw); c.fillStyle = edge || OL; c.fill(); }
    c.beginPath(); pathAdd(0); c.fillStyle = fill; c.fill();
  }

  /* ===== かざり（ほね・にく きょうつうの かたち） ===== */
  function platesGeo(M, g) {
    var out = [], sm = g.sm, f = M.sp.f, d0 = M.dHip * .45, d1 = M.dSh + (M.dEnd - M.dSh) * .6;
    along(sm, f.plates === 'kentro' ? 3.6 : 4.4, d0, d1, function (p, t, n) {
      var u = (p[4] - d0) / (d1 - d0);
      var spike = f.plates === 'kentro' && u < .5;
      var h = (spike ? 7 : 5.5) * (.45 + .75 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * (M.sp.mod.bt || 1);
      var base = [p[0] + n[0] * p[2] * .72, p[1] + n[1] * p[2] * .72];
      var w = spike ? h * .28 : h * .75;
      var tip = [base[0] + n[0] * h - t[0] * h * (spike ? .45 : .18), base[1] + n[1] * h - t[1] * h * (spike ? .45 : .18)];
      if (spike) out.push([[base[0] - t[0] * w, base[1] - t[1] * w], tip, [base[0] + t[0] * w, base[1] + t[1] * w]]);
      else {
        var mid1 = [base[0] - t[0] * w * .55 + n[0] * h * .45, base[1] - t[1] * w * .55 + n[1] * h * .45];
        var mid2 = [base[0] + t[0] * w * .55 + n[0] * h * .5, base[1] + t[1] * w * .55 + n[1] * h * .5];
        out.push([[base[0] - t[0] * w * .3, base[1] - t[1] * w * .3], mid1, tip, mid2, [base[0] + t[0] * w * .3, base[1] + t[1] * w * .3]]);
      }
    });
    return out;
  }
  function tailSpikes(M, g) {
    var out = [], sm = g.sm, k = Math.max(3, Math.floor(sm.length * .03));
    var p = sm[k], t = tang(sm, k), n = [-t[1], t[0]], L = 6 * (M.sp.mod.bt || 1);
    [[.9, .5], [.55, .85], [1.1, .15]].forEach(function (d, i) {
      var q = sm[k + i * 3] || p;
      var base = [q[0] + n[0] * q[2] * .5, q[1] + n[1] * q[2] * .5];
      var tip = [base[0] - t[0] * L * d[0] + n[0] * L * d[1], base[1] - t[1] * L * d[0] + n[1] * L * d[1]];
      out.push([[base[0] - t[0] * .8, base[1] - t[1] * .8], tip, [base[0] + t[0] * .8 - n[0] * .3, base[1] + t[1] * .8 - n[1] * .3]]);
    });
    return out;
  }
  function sailGeo(M, g) {
    var top = [], bot = [], d0 = M.dHip - 3, d1 = M.dSh + 1, sm = g.sm;
    along(sm, 1.2, d0, d1, function (p, t, n) {
      var u = (p[4] - d0) / (d1 - d0), h = p[2] * (.6 + 1.9 * Math.sin(Math.PI * u));
      bot.push([p[0] + n[0] * p[2] * .6, p[1] + n[1] * p[2] * .6]);
      top.push([p[0] + n[0] * (p[2] * .6 + h), p[1] + n[1] * (p[2] * .6 + h)]);
    });
    return { top: top, bot: bot };
  }
  function frillGeo(g, hv, f) {
    var rb = g.b[2];
    return { c: at(g.b, hv, -rb * .55, rb * .85), r: rb * 1.35 * (f.frill || 1) };
  }
  function hornGeo(g, hv, f) {
    var rb = g.b[2], rs = g.s[2], out = [];
    function cone(base, dirA, dirB, len, wid) {
      var tip = at(base, hv, dirA * len, dirB * len);
      var l = at(base, hv, -wid, 0), r = at(base, hv, wid, 0);
      if (Math.abs(dirA) > Math.abs(dirB)) { l = at(base, hv, 0, wid); r = at(base, hv, 0, -wid); }
      out.push([l, tip, r]);
    }
    if (f.horns === 'tri') {
      cone(at(g.b, hv, rb * .25, rb * .7), .8, .55, rb * 2.3, rb * .26);
      cone(at(g.s, hv, -rs * .5, rs * .75), .25, 1, rs * 1.1, rs * .3);
    } else if (f.horns === 'styraco') {
      cone(at(g.s, hv, -rs * .8, rs * .7), .2, 1, rs * 2.6, rs * .4);
      cone(at(g.b, hv, rb * .3, rb * .75), .3, 1, rb * .5, rb * .18);
    }
    if (f.browhorn) cone(at(g.b, hv, rb * .25, rb * .78), .15 * (f.browhorn < 1 ? 1 : -1), 1, rb * .62 * f.browhorn, rb * .2);
    if (f.thumb) {
      var w = g.front[2];
      out.push([[w[0] - .5, w[1]], [w[0] + .6, w[1] + 2.4 * (M_bt(g))], [w[0] + .7, w[1] - .2]]);
    }
    return out;
  }
  function M_bt() { return 1; }
  function frillSpikes(fg, hv) {
    var out = [];
    for (var k = 0; k < 6; k++) {
      var a = Math.PI * (.62 + k * .13), dirx = Math.cos(a), diry = Math.sin(a);
      // hv.u を 0ど として まわす
      var vx = hv.u[0] * dirx + hv.up[0] * diry, vy = hv.u[1] * dirx + hv.up[1] * diry;
      var base = [fg.c[0] + vx * fg.r * .85, fg.c[1] + vy * fg.r * .85];
      var len = fg.r * (k > 0 && k < 5 ? .95 : .55);
      var px = -vy, py = vx, w = fg.r * .11;
      out.push([[base[0] + px * w, base[1] + py * w], [base[0] + vx * len, base[1] + vy * len], [base[0] - px * w, base[1] - py * w]]);
    }
    return out;
  }
  function crestPath(c, g, hv, f, add) {
    var rb = g.b[2];
    if (f.crest === 'tube') {
      var a = at(g.b, hv, -rb * .1, rb * .75), e = at(g.b, hv, -rb * 2.9, rb * 1.55);
      capsule(c, a[0], a[1], rb * .36 + add, e[0], e[1], rb * .3 + add);
    } else if (f.crest === 'twin') {
      [[.9, .95], [.6, 1.05]].forEach(function (o) {
        var p = at(g.b, hv, rb * o[0], rb * o[1] - rb * .2);
        var ang = Math.atan2(hv.u[1], hv.u[0]);
        c.moveTo(p[0] + rb * 1.15 + add, p[1]);
        c.ellipse(p[0], p[1], rb * 1.15 + add, rb * .5 + add, ang, 0, Math.PI * 2);
      });
    } else if (f.crest === 'round') {
      var q = at(g.b, hv, rb * .55, rb * .95); circ(c, q[0], q[1], rb * .55 + add);
    } else if (f.crest === 'ptero') {
      poly(c, [at(g.b, hv, rb * .6, rb * .6 + add), at(g.b, hv, -rb * 5, rb * 2.1 + add), at(g.b, hv, -rb * .3, -rb * .1 - add)]);
    }
  }
  function wingMembrane(L, hip) { return [L[0], L[1], L[2], L[3], [hip[0] - 1, hip[1] - 1]]; }
  function finGeo(M, g) {
    var f = M.sp.f, sm = g.sm, p = sm[0], out = [];
    if (f.fin === 'crescent') {
      out.push([[p[0] + 3, p[1] + .5], [p[0] - 5, p[1] + 9], [p[0] - 1.5, p[1] + 1], [p[0] - 5, p[1] - 8], [p[0] + 3, p[1] - .5]]);
    } else if (f.fin === 'fluke') {
      out.push([[p[0] + 5, p[1] + 1], [p[0] - 3, p[1] + 3], [p[0] - 6, p[1] - 6], [p[0] + 4, p[1] - 1]]);
    }
    if (f.dorsal) {
      var i = Math.round(sm.length * .5), q = sm[i];
      out.push([[q[0] - 5, q[1] + q[2] * .8], [q[0] - 3, q[1] + q[2] + 5], [q[0] + 3, q[1] + q[2] * .85]]);
    }
    return out;
  }

  /* ===== にく（いろつき）を かく ===== */
  function drawFlesh(c, M, g, o) {
    var sp = M.sp, f = sp.f || {}, col = sp.col || ['#7a9a4a', '#e6dca8', '#56722f'];
    var sil = o.sil, lw = sil ? 0 : (o.lw || .6);
    var C0 = sil || col[0], C1 = sil || col[1], C2 = sil || col[2], FAR = sil || shade(col[0], -.22), FAR2 = sil || shade(col[2], -.2);
    var hv = headVec(g);
    var tri = function (pts) { return function () { poly(c, pts); }; };

    // うしろに ある かざり
    if (f.sail) {
      var sg = sailGeo(M, g);
      fillStroke(c, function () { poly(c, sg.bot.concat(sg.top.slice().reverse())); }, C2, lw);
      if (!sil) { c.strokeStyle = shade(col[2], -.25); c.lineWidth = lw * .6; c.beginPath(); for (var k = 0; k < sg.top.length; k += 3) { c.moveTo(sg.bot[k][0], sg.bot[k][1]); c.lineTo(sg.top[k][0], sg.top[k][1]); } c.stroke(); }
    }
    if (f.plates) platesGeo(M, g).forEach(function (pl) { fillStroke(c, tri(pl), C2, lw); });
    if (f.spikes) tailSpikes(M, g).forEach(function (pl) { fillStroke(c, tri(pl), sil || HORN, lw); });
    if (f.fin || f.dorsal) finGeo(M, g).forEach(function (pl) { fillStroke(c, tri(pl), C2, lw); });
    if (f.crest) blob(c, function (a) { crestPath(c, g, hv, f, a); }, C2, lw);
    if (f.wings) wingFeathers(c, M, g, g.frontF, sil || FAR2, lw, true);
    if (M.t.wing) {
      fillStroke(c, tri(wingMembrane(g.frontF, g.P)), sil || shade(col[2], -.15), lw);
      blob(c, function (a) { limbPath(c, g.frontF, M.fr, a); }, FAR, lw);
    }
    // おくの あし
    blob(c, function (a) { limbPath(c, g.hindF, M.hr, a); }, FAR, lw);
    if (!M.t.wing) blob(c, function (a) { limbPath(c, g.frontF, M.fr, a); }, FAR, lw);
    if (f.wings) tailFeathers(c, g, sil || C2, lw);

    // からだ（ふちどり → ぬり）
    var tufts = f.feathers ? featherTufts(M, g) : null;
    var body = function (a) {
      tubePath(c, g.sm, a);
      jawPath(c, g, hv, a);
      headPath(c, g, hv, a, f);
      if (tufts) tufts.forEach(function (tp) { if (a) circ(c, tp[0], tp[1], tp[2] + a); else circ(c, tp[0], tp[1], tp[2]); });
    };
    if (lw) { c.beginPath(); body(lw); c.fillStyle = OL; c.fill(); }
    if (!sil && g.mouth > .05) { // くちの なか
      var j = jaw(g, hv);
      c.beginPath(); poly(c, [at(g.b, hv, g.b[2] * .2, -g.b[2] * .2), g.s, j.js]); c.fillStyle = '#7a2d2d'; c.fill();
    }
    c.beginPath(); tubePath(c, g.sm, 0); if (tufts) tufts.forEach(function (tp) { circ(c, tp[0], tp[1], tp[2]); }); c.fillStyle = C0; c.fill();
    c.beginPath(); jawPath(c, g, hv, 0); c.fillStyle = sil || shade(col[1], -.05); c.fill();
    if (!sil && g.mouth > .05) { c.beginPath(); jawPath(c, g, hv, 0); c.lineWidth = lw * .8; c.strokeStyle = OL; c.stroke(); }
    if (!f.frill) { c.beginPath(); headPath(c, g, hv, 0, f); c.fillStyle = C0; c.fill(); }

    if (!sil) {
      // おなか と もよう（からだの なかだけ）
      c.save(); c.beginPath(); tubePath(c, g.sm, 0); c.clip();
      c.beginPath();
      g.sm.forEach(function (p, i) { if (i % 2) return; circ(c, p[0], p[1] - p[2] * .55, p[2] * .6); });
      c.fillStyle = C1; c.fill();
      pattern(c, M, g, col[2]);
      c.restore();
    }
    if (f.frill) {
      var fg = frillGeo(g, hv, f);
      if (f.horns === 'styraco') frillSpikes(fg, hv).forEach(function (pl) { fillStroke(c, tri(pl), sil || HORN, lw); });
      fillStroke(c, function () { circ(c, fg.c[0], fg.c[1], fg.r); }, C2, lw);
      if (!sil) {
        fillStroke(c, function () { circ(c, fg.c[0], fg.c[1], fg.r * .7); }, shade(col[2], .18), 0);
        c.beginPath();
        for (var e = 0; e < 9; e++) { var an = Math.atan2(hv.up[1], hv.up[0]) - .2 + e * .38, ex = fg.c[0] + Math.cos(an) * fg.r, ey = fg.c[1] + Math.sin(an) * fg.r; circ(c, ex, ey, fg.r * .09); }
        c.fillStyle = HORN; c.fill();
      }
      blob(c, function (a) { headPath(c, g, hv, a, f); }, C0, lw);
    }
    if (f.armor && !sil) armor(c, M, g, shade(col[2], -.05), lw);
    if (f.club) { var cp0 = g.sm[0]; fillStroke(c, function () { c.moveTo(cp0[0] + 3.4, cp0[1]); c.ellipse(cp0[0], cp0[1], 3.4 * (M.sp.mod.bt || 1), 2.6 * (M.sp.mod.bt || 1), 0, 0, Math.PI * 2); }, C2, lw); }

    // てまえの あし
    if (M.t.wing) fillStroke(c, tri(wingMembrane(g.front, g.P)), sil || col[2], lw);
    blob(c, function (a) { limbPath(c, g.hind, M.hr, a); }, C0, lw);
    blob(c, function (a) { limbPath(c, g.front, M.fr, a); }, C0, lw);
    if (f.feathers && !M.t.wing) wingFeathers(c, M, g, g.front, sil || (f.wings ? C2 : shade(col[0], -.12)), lw, f.wings);

    // あたまの こまかい ところ
    hornGeo(g, hv, f).forEach(function (pl) { fillStroke(c, tri(pl), sil || HORN, lw); });
    if (f.beak) blob(c, function (a) { var p = at(g.s, hv, g.s[2] * .2, 0); circ(c, p[0], p[1], g.s[2] * .95 + a); }, sil || '#e3cf96', lw);
    if (sil) return;
    if (f.dome) {
      c.beginPath(); for (var q = 0; q < 5; q++) { var kp = at(g.b, hv, -g.b[2] * (.9 - q * .1), g.b[2] * (.1 + q * .28)); circ(c, kp[0], kp[1], g.b[2] * .16); }
      c.fillStyle = shade(col[2], .1); c.fill();
    }
    var rb = g.b[2], rs = g.s[2];
    var ep = at(g.b, hv, rb * .2, rb * .36), er = Math.max(rb * .27, .6);
    if (f.dome) ep = at(g.b, hv, rb * .45, rb * .1);
    c.beginPath(); circ(c, ep[0], ep[1], er); c.fillStyle = '#fff'; c.fill(); c.lineWidth = lw * .7; c.strokeStyle = OL; c.stroke();
    var pp = at(ep, hv, er * .25, -er * .05);
    c.beginPath(); circ(c, pp[0], pp[1], er * .6); c.fillStyle = '#2a1c12'; c.fill();
    var hp = at(pp, hv, er * .18, er * .25);
    c.beginPath(); circ(c, hp[0], hp[1], er * .2); c.fillStyle = '#fff'; c.fill();
    var ck = at(g.b, hv, rb * .55, -rb * .25);
    c.beginPath(); circ(c, ck[0], ck[1], rb * .2); c.fillStyle = 'rgba(255,120,120,.35)'; c.fill();
    var ns = at(g.s, hv, rs * .3, rs * .45);
    c.beginPath(); circ(c, ns[0], ns[1], Math.max(rs * .12, .18)); c.fillStyle = OL; c.fill();
    if (g.mouth < .05 && !f.beak) {
      var m1 = at(g.s, hv, -rs * .1, -rs * .35), m2 = at(g.b, hv, rb * .45, -rb * .3), mc = at(g.b, hv, hv.L * .65, -rb * .55);
      c.beginPath(); c.moveTo(m1[0], m1[1]); c.quadraticCurveTo(mc[0], mc[1], m2[0], m2[1]);
      c.lineWidth = lw * .8; c.strokeStyle = OL; c.lineCap = 'round'; c.stroke();
    }
  }
  function pattern(c, M, g, col) {
    var pat = M.sp.pat || 'stripe';
    c.fillStyle = col; c.beginPath();
    if (pat === 'stripe') {
      along(g.sm, 4.2, M.dHip * .25, M.dSh + 2, function (p, t, n) {
        var a = Math.atan2(n[1], n[0]), q = [p[0] + n[0] * p[2] * .75, p[1] + n[1] * p[2] * .75];
        c.moveTo(q[0], q[1]); c.ellipse(q[0], q[1], p[2] * .5, p[2] * .14, a, 0, Math.PI * 2);
      });
    } else if (pat === 'spot') {
      along(g.sm, 3.3, M.dHip * .3, M.dEnd * .92, function (p, t, n, i) {
        var k = (i * 37) % 7 / 7, q = [p[0] + n[0] * p[2] * (.3 + k * .5), p[1] + n[1] * p[2] * (.3 + k * .5)];
        circ(c, q[0], q[1], p[2] * (.12 + k * .1));
      });
    } else if (pat === 'band') {
      along(g.sm, 1, 0, M.dEnd, function (p, t, n) { var q = [p[0] + n[0] * p[2] * .7, p[1] + n[1] * p[2] * .7]; circ(c, q[0], q[1], p[2] * .38); });
    }
    c.fill();
  }
  function featherTufts(M, g) {
    var out = [];
    along(g.sm, 1.1, M.dHip * .45, M.dEnd, function (p, t, n, i) {
      var k = .75 + (i % 3) * .1, r = Math.max(p[2] * .28, .45);
      out.push([p[0] + n[0] * p[2] * k - t[0] * r * .4, p[1] + n[1] * p[2] * k - t[1] * r * .4, r]);
    });
    return out;
  }
  function wingFeathers(c, M, g, L, col, lw, big) {
    var e = L[1], h = L[2], n = big ? 6 : 3, len = (big ? 1.25 : .5) * (dist(L[0], L[1]) + dist(L[1], L[2]));
    for (var k = n - 1; k >= 0; k--) {
      var u = k / (n - 1), p = [lerp(h[0], e[0], u), lerp(h[1], e[1], u)];
      var ang = -Math.PI / 2 - .7 - u * .6, ll = len * (1 - u * .4), q = [p[0] + Math.cos(ang) * ll, p[1] + Math.sin(ang) * ll];
      blob(c, function (a) { capsule(c, p[0], p[1], .6 + a, q[0], q[1], .3 + a); }, col, lw);
    }
  }
  function tailFeathers(c, g, col, lw) {
    var sm = g.sm;
    for (var i = 0; i < sm.length * .3; i += 6) {
      var p = sm[i], t = tang(sm, i);
      [-1, 1].forEach(function (s) {
        var q = [p[0] - t[0] * 2.4 - t[1] * 2.2 * s, p[1] - t[1] * 2.4 + t[0] * 2.2 * s];
        blob(c, function (a) { capsule(c, p[0], p[1], .5 + a, q[0], q[1], .4 + a); }, col, lw);
      });
    }
  }
  function armor(c, M, g, col, lw) {
    c.beginPath();
    along(g.sm, 2.6, 2, M.dEnd, function (p, t, n) {
      var q = [p[0] + n[0] * p[2] * .82, p[1] + n[1] * p[2] * .82]; circ(c, q[0], q[1], Math.max(p[2] * .2, .6));
      var q2 = [p[0] + n[0] * p[2] * .35, p[1] + n[1] * p[2] * .35]; circ(c, q2[0], q2[1], Math.max(p[2] * .13, .4));
    });
    c.fillStyle = col; c.fill(); c.lineWidth = lw * .6; c.strokeStyle = OL; c.stroke();
  }

  /* ===== ほねを かく ===== */
  function drawSkel(c, M, g, o) {
    var sp = M.sp, f = sp.f || {}, only = o.only, lw = o.lw || .5;
    var BC = o.bone || BONE, OC = o.boneEdge || BOL, HC = o.hole || HOLE;
    var hv = headVec(g);
    var on = function (id) { return !only || only === id; };
    function line(pts, w) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      [[w + lw * 2, OC], [w, BC]].forEach(function (s) {
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.lineWidth = s[0]; c.strokeStyle = s[1]; c.stroke();
      });
    }
    function bone(a, b, w) {
      line([a, b], w);
      c.beginPath(); circ(c, a[0], a[1], w * .62); circ(c, b[0], b[1], w * .62);
      c.fillStyle = BC; c.fill(); c.lineWidth = lw; c.strokeStyle = OC; c.stroke();
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineWidth = w * .9; c.strokeStyle = BC; c.stroke();
    }
    function solid(path) { c.beginPath(); path(); c.fillStyle = BC; c.fill(); c.lineWidth = lw; c.strokeStyle = OC; c.lineJoin = 'round'; c.stroke(); }
    function vert(p, t, n, sz) {
      var a = Math.atan2(t[1], t[0]);
      c.beginPath(); c.moveTo(p[0], p[1]); c.ellipse(p[0], p[1], sz[0], sz[1], a, 0, Math.PI * 2);
      c.fillStyle = BC; c.fill(); c.lineWidth = lw * .8; c.strokeStyle = OC; c.stroke();
    }
    var sm = g.sm, tl = M.tailLen || 1, nl = M.neckLen || 1;
    var pieceOf = function (p) {
      if (p[3] === 'tail') return 'tail' + Math.min(M.nTail, 1 + Math.floor((M.dHip - p[4]) / tl * M.nTail));
      if (p[3] === 'neck') return 'neck' + Math.min(M.nNeck, 1 + Math.floor((p[4] - M.dSh) / nl * M.nNeck));
      return 'back';
    };
    // あばらぼね
    if (on('ribs') && !M.t.wing) {
      along(sm, 2.3, M.dHip + 1.5, M.dSh + .5, function (p, t, n) {
        var dn = [-n[0], -n[1]], L = p[2] * 1.45;
        var cpt = [p[0] + dn[0] * L * .55 + t[0] * p[2] * .25, p[1] + dn[1] * L * .55 + t[1] * p[2] * .25];
        var end = [p[0] + dn[0] * L - t[0] * p[2] * .35, p[1] + dn[1] * L - t[1] * p[2] * .35];
        var w = Math.max(.35, p[2] * .1);
        [[w + lw * 2, OC], [w, BC]].forEach(function (s) {
          c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(cpt[0], cpt[1], end[0], end[1]);
          c.lineWidth = s[0]; c.strokeStyle = s[1]; c.lineCap = 'round'; c.stroke();
        });
      });
    } else if (on('ribs')) {
      along(sm, 1.4, M.dHip, M.dSh, function (p, t, n) { line([[p[0], p[1]], [p[0] - n[0] * p[2] * 1.1 - t[0] * .6, p[1] - n[1] * p[2] * 1.1 - t[1] * .6]], .3); });
    }
    // こし
    if (on('hip')) {
      var hp = g.hind[0], P = g.P, r = M.spine[M.hipI][2];
      line([hp, [hp[0] + r * .55, hp[1] - r * .85]], r * .18);
      line([hp, [hp[0] - r * .6, hp[1] - r * .7]], r * .16);
      solid(function () { c.moveTo(P[0] + r * .8, P[1]); c.ellipse(P[0] - r * .05, P[1] - r * .12, r * .8, r * .34, 0, 0, Math.PI * 2); });
      c.beginPath(); circ(c, hp[0], hp[1], r * .16); c.fillStyle = HC; c.fill();
    }
    // かたの ほね（けんこうこつ）
    if (on('back')) {
      var sh = g.front[0], rr = M.spine[M.shI][2];
      line([sh, [sh[0] - rr * .55, sh[1] + rr * .65]], rr * .2);
      if (f.sail) {
        along(sm, 1.4, M.dHip - 3, M.dSh + 1, function (p, t, n) {
          var u = (p[4] - M.dHip + 3) / (M.dSh - M.dHip + 4), h = p[2] * (.6 + 1.9 * Math.sin(Math.PI * u));
          line([[p[0], p[1]], [p[0] + n[0] * (p[2] * .6 + h), p[1] + n[1] * (p[2] * .6 + h)]], .45);
        });
      }
    }
    // せぼね
    along(sm, 1.8, 0, M.dEnd, function (p, t, n) {
      var id = pieceOf(p);
      if (!on(id)) return;
      var hgt = Math.min(3.4, Math.max(.45, p[2] * .4));
      if (p[3] === 'torso' && !f.sail) line([[p[0], p[1]], [p[0] + n[0] * p[2] * .5, p[1] + n[1] * p[2] * .5]], Math.max(.3, p[2] * .08));
      if (p[3] === 'tail' && p[4] > 4) line([[p[0], p[1]], [p[0] - n[0] * hgt * 1.3 - t[0] * .4, p[1] - n[1] * hgt * 1.3 - t[1] * .4]], Math.max(.25, hgt * .2));
      vert(p, t, n, [.75, hgt * .5]);
    });
    if (f.club && on('tail' + M.nTail)) { var q0 = sm[0]; solid(function () { c.moveTo(q0[0] + 3.2, q0[1]); c.ellipse(q0[0], q0[1], 3.2 * (sp.mod.bt || 1), 2.4 * (sp.mod.bt || 1), 0, 0, Math.PI * 2); }); }
    if (f.spikes && on('tail' + M.nTail)) tailSpikes(M, g).forEach(function (pl) { solid(function () { poly(c, pl); }); });
    if (f.fin && on('tail' + M.nTail)) { /* ひれは ほねが ない */ }
    if (f.plates && on('plates')) platesGeo(M, g).forEach(function (pl) { solid(function () { poly(c, pl); }); });
    // あし
    function limb(L, R, idA, idB, split, fingers) {
      var ws = [R[0] * .5, R[1] * .48, R[2] * .5];
      if (on(idA)) bone(L[0], L[1], ws[0]);
      var idL = split ? idB : idA;
      if (on(idL)) {
        bone(L[1], L[2], ws[1]);
        var mid = [lerp(L[2][0], L[3][0], .45), lerp(L[2][1], L[3][1], .45)];
        bone(L[2], mid, ws[2]);
        var dx = L[3][0] - mid[0], dy = L[3][1] - mid[1];
        if (fingers === false) line([mid, L[3]], Math.max(.25, ws[2] * .6));
        else [-.35, 0, .35].forEach(function (a) { var e = rot([mid[0] + dx, mid[1] + dy], mid, a); line([mid, e], Math.max(.25, ws[2] * .5)); });
      }
    }
    limb(g.hindF, M.hr, 'hindF', 'hindF', false);
    limb(g.frontF, M.fr, 'frontF', 'frontF', false, !M.t.wing);
    limb(g.hind, M.hr, 'hindN1', 'hindN2', M.splitHind);
    limb(g.front, M.fr, 'frontN1', 'frontN2', M.splitFront, !M.t.wing);
    if (f.thumb && on(M.splitFront ? 'frontN2' : 'frontN1')) { var w = g.front[2]; solid(function () { poly(c, [[w[0] - .4, w[1]], [w[0] + .6, w[1] + 2.2], [w[0] + .7, w[1] - .2]]); }); }
    // えりかざり
    if (f.frill && on('frill')) {
      var fg = frillGeo(g, hv, f);
      if (f.horns === 'styraco') frillSpikes(fg, hv).forEach(function (pl) { solid(function () { poly(c, pl); }); });
      solid(function () { circ(c, fg.c[0], fg.c[1], fg.r); });
      c.beginPath(); circ(c, fg.c[0] - hv.u[0] * fg.r * .25 + hv.up[0] * fg.r * .2, fg.c[1] - hv.u[1] * fg.r * .25 + hv.up[1] * fg.r * .2, fg.r * .38);
      c.fillStyle = HC; c.fill();
    }
    // ずがいこつ
    if (on('skull')) {
      if (f.crest) solid(function () { crestPath(c, g, hv, f, 0); });
      solid(function () { jawPath(c, g, hv, 0); });
      solid(function () { headPath(c, g, hv, 0, f); });
      var rb = g.b[2], rs = g.s[2];
      if (sp.diet === 'niku' && !f.beak) {
        c.beginPath();
        for (var k = 1; k < 7; k++) {
          var u = k / 7, p = at([lerp(g.s[0], g.b[0], u * .75), lerp(g.s[1], g.b[1], u * .75)], hv, 0, -lerp(rs, rb, u * .75) * .92);
          var tw = Math.max(.25, rs * .16);
          c.moveTo(p[0] - hv.u[0] * tw, p[1] - hv.u[1] * tw); c.lineTo(p[0] - hv.up[0] * tw * 2, p[1] - hv.up[1] * tw * 2); c.lineTo(p[0] + hv.u[0] * tw, p[1] + hv.u[1] * tw);
        }
        c.fillStyle = BC; c.fill(); c.lineWidth = lw * .6; c.strokeStyle = OC; c.stroke();
      }
      var ep = at(g.b, hv, rb * .2, rb * .3);
      if (f.dome) ep = at(g.b, hv, rb * .45, rb * .05);
      c.beginPath(); circ(c, ep[0], ep[1], Math.max(rb * .34, .55)); c.fillStyle = HC; c.fill();
      if (hv.L > rb * 1.2) {
        var fe = at(g.b, hv, hv.L * .5, rb * .05), ang = Math.atan2(hv.u[1], hv.u[0]);
        c.beginPath(); c.moveTo(fe[0], fe[1]); c.ellipse(fe[0], fe[1], hv.L * .17, Math.max(rb * .22, .3), ang, 0, Math.PI * 2); c.fillStyle = HC; c.fill();
      }
      var ns = at(g.s, hv, rs * .1, rs * .3);
      c.beginPath(); circ(c, ns[0], ns[1], Math.max(rs * .25, .25)); c.fillStyle = HC; c.fill();
      hornGeo(g, hv, f).forEach(function (pl, i) { if (!f.thumb || i < hornGeo(g, hv, f).length - 1) solid(function () { poly(c, pl); }); });
      if (f.beak) { var bp = at(g.s, hv, rs * .2, 0); solid(function () { circ(c, bp[0], bp[1], rs * .9); }); }
    }
  }

  /* ===== そとむけの かきかた ===== */
  // ox, oy = がめん上の きじゅん（からだの まんなか・じめん）、s = 1たんいの px
  function drawRaw(c, M, ox, oy, s, flip, g, o) {
    c.save();
    c.translate(ox, oy);
    c.scale(flip ? -s : s, -s);
    var px = 1 / s;
    if (o.mode === 'skel') drawSkel(c, M, g, { only: o.only, lw: (o.lwPx || 1.6) * px, bone: o.bone, boneEdge: o.boneEdge, hole: o.hole });
    else drawFlesh(c, M, g, { sil: o.sil, lw: (o.lwPx || 2) * px });
    c.restore();
  }
  // o: { mode:'flesh'|'skel', sil, only, flip, ph, w, t, mouth, alpha }
  function draw(c, sp, ox, oy, s, o) {
    o = o || {};
    var M = build(sp);
    var g = pose(M, o);
    var cx = (M.bb.x0 + M.bb.x1) / 2;
    if (o.alpha !== undefined) { c.save(); c.globalAlpha = o.alpha; }
    drawRaw(c, M, ox - (o.flip ? -cx : cx) * s, oy, s, o.flip, g, o);
    if (o.alpha !== undefined) c.restore();
  }
  // わくの なかに おさまる ように かく。もどりち: { s, ox, oy }
  function fit(c, sp, x, y, w, h, o) {
    var M = build(sp), pad = (o && o.pad) || .06;
    var s = Math.min(w * (1 - pad * 2) / M.bb.w, h * (1 - pad * 2) / M.bb.h);
    var ox = x + w / 2, oy = y + h / 2 + (M.bb.y0 + M.bb.y1) / 2 * s;
    draw(c, sp, ox, oy, s, o);
    return { s: s, ox: ox, oy: oy };
  }
  // 1たんいが なんメートルか
  function mPerUnit(sp) { var M = build(sp); return sp.len / M.measure; }

  return { build: build, draw: draw, fit: fit, mPerUnit: mPerUnit, shade: shade, pieces: function (sp) { return build(sp).pieces; } };
})();
