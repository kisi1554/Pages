/* ダイヤ を つくろう の えがき（canvas 2D）
 *  drawDia: ダイヤグラム（よこ＝じかん、たて＝えき）
 *  drawTrack: した の せんろ ず（はしらせる アニメ）
 */
(function (root) {
  "use strict";
  var D = root.Diagram;
  var INK = "#1f2d3d", SUB = "#6b7a8c", RED = "#e03131";
  var FONT = '"Hiragino Maru Gothic ProN", "BIZ UDPGothic", "Rounded Mplus 1c", "Meiryo", system-ui, sans-serif';

  function fit(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, w: w, h: h };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function alpha(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ずひょう の わく（app と おなじ ものを つかう） */
  function layout(line, t0, t1, w, h) {
    var lw = w >= 560 ? 112 : w >= 420 ? 92 : 58;
    return D.view(line, t0, t1, { x: lw, y: 30, w: Math.max(40, w - lw - 14), h: Math.max(40, h - 30 - 16) });
  }

  function trainPath(c, V, line, tr) {
    var s = tr.stops;
    c.beginPath();
    for (var k = 0; k < s.length; k++) {
      var y = V.y(line.stations[s[k][0]].km);
      if (k === 0) c.moveTo(V.x(s[k][2]), y);
      else { c.lineTo(V.x(s[k][1]), y); if (s[k][2] > s[k][1]) c.lineTo(V.x(s[k][2]), y); }
    }
  }
  function segPath(c, V, line, tr, k, isStop) {
    var s = tr.stops; c.beginPath();
    if (isStop) { var y = V.y(line.stations[s[k][0]].km); c.moveTo(V.x(s[k][1]) - 4, y); c.lineTo(V.x(s[k][2]) + 4, y); return; }
    c.moveTo(V.x(s[k][2]), V.y(line.stations[s[k][0]].km));
    c.lineTo(V.x(s[k + 1][1]), V.y(line.stations[s[k + 1][0]].km));
  }
  function badge(c, x, y, n, col) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "#fff"; c.font = "bold 12px " + FONT; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(String(n), x, y + 0.5);
  }

  /* S: { line, t0, t1, fixed, user, sel, draft:{train, tip, type}, ghost:[trains], conflicts, req, now, labels, marks:[{t,km}] } */
  function drawDia(cv, S) {
    var f = fit(cv), c = f.c, line = S.line;
    var V = layout(line, S.t0, S.t1, f.w, f.h), B = V.box;
    c.clearRect(0, 0, f.w, f.h);
    c.fillStyle = "#fff"; c.fillRect(0, 0, f.w, f.h);
    var st = line.stations, wide = B.x >= 90;

    // たんせん の くかん は きいろ
    line.secs.forEach(function (sc, i) {
      var y0 = V.y(st[i].km), y1 = V.y(st[i + 1].km);
      if (sc.d === 1) { c.fillStyle = "#fff6d6"; c.fillRect(B.x, y0, B.w, y1 - y0); }
    });
    // じかん の めもり
    var ppm = V.pxPerMin;
    c.textAlign = "center"; c.textBaseline = "alphabetic";
    for (var t = Math.ceil(S.t0); t <= S.t1; t++) {
      var x = V.x(t), m10 = t % 10 === 0, m5 = t % 5 === 0;
      if (!m5 && ppm < 5) continue;
      c.strokeStyle = m10 ? "#b8c4d2" : m5 ? "#dde3ea" : "#f0f3f6";
      c.lineWidth = m10 ? 1.2 : 1;
      c.beginPath(); c.moveTo(x, B.y - (m10 ? 8 : 2)); c.lineTo(x, B.y + B.h); c.stroke();
      if (m10 || (m5 && ppm >= 9)) {
        c.fillStyle = m10 ? INK : SUB; c.font = (m10 ? "bold 13px " : "11px ") + FONT;
        c.fillText(D.hm(t), Math.min(Math.max(x, B.x + 14), f.w - 18), B.y - 11);
      }
    }
    // えき の よこせん と なまえ
    var railX = wide ? 22 : 16;
    line.secs.forEach(function (sc, i) {
      var y0 = V.y(st[i].km), y1 = V.y(st[i + 1].km);
      c.strokeStyle = sc.d === 1 ? "#e8a33d" : "#6b7a8c"; c.lineWidth = 2.5;
      if (sc.d === 2) {
        c.beginPath(); c.moveTo(railX - 3, y0); c.lineTo(railX - 3, y1); c.moveTo(railX + 3, y0); c.lineTo(railX + 3, y1); c.stroke();
      } else { c.beginPath(); c.moveTo(railX, y0); c.lineTo(railX, y1); c.stroke(); }
    });
    st.forEach(function (s, i) {
      var y = V.y(s.km), end = i === 0 || i === st.length - 1;
      c.strokeStyle = s.p >= 2 && !end ? "#7c8da1" : "#a9b6c4"; c.lineWidth = s.p >= 2 && !end ? 2 : 1.2;
      c.beginPath(); c.moveTo(B.x, y); c.lineTo(B.x + B.w, y); c.stroke();
      // えき の しるし
      c.fillStyle = "#fff"; c.strokeStyle = s.ex ? "#e8590c" : "#495867"; c.lineWidth = s.ex ? 3 : 2;
      c.beginPath(); c.arc(railX, y, 11, 0, 7); c.fill(); c.stroke();
      c.fillStyle = INK; c.font = "bold 13px " + FONT; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(s.n, railX, y + 0.5);
      c.textAlign = "left";
      var tx = railX + 15;
      if (wide) {
        c.font = "12px " + FONT; c.fillStyle = INK;
        c.fillText(s.name, tx, y - 6, B.x - tx - 4);
      }
      // ホーム の かず（すれちがい・おいこし できる えき は 2いじょう）
      var bars = Math.min(s.p, 4), by = wide ? y + 7 : y, bx = wide ? tx : tx;
      if (!wide) { by = y; }
      if (!end) {
        for (var j = 0; j < bars; j++) { c.fillStyle = s.p >= 2 ? "#2b8a3e" : "#adb5bd"; c.fillRect(bx + j * 6, by - 4, 4, 8); }
        if (s.depot) { c.font = "13px " + FONT; c.fillText("🏠", bx + bars * 6 + 2, by); }
      } else if (s.depot) { c.font = "13px " + FONT; c.fillText("🏠", bx, by); }
    });

    c.save();
    c.beginPath(); c.rect(B.x - 2, 0, B.w + 14, f.h); c.clip();
    // おだい の「この あいだ に でる」
    (S.req || []).forEach(function (r, ri) {
      if (!r.win) return;
      var y = V.y(st[r.from].km), x0 = V.x(r.win[0]) - 3, x1 = V.x(r.win[1]) + 3;
      var col = r.type === "E" ? D.TYPES.E.color : D.TYPES.L.color;
      c.fillStyle = alpha(col, r.done ? 0.12 : 0.22); rr(c, x0, y - 8, x1 - x0, 16, 8); c.fill();
      c.strokeStyle = alpha(col, r.done ? 0.3 : 0.7); c.lineWidth = 1.5; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]);
      if (r.by != null) {
        var yb = V.y(st[r.to].km), xb = V.x(r.by);
        c.strokeStyle = alpha("#c92a2a", 0.7); c.lineWidth = 2; c.beginPath(); c.moveTo(xb, yb - 12); c.lineTo(xb, yb + 12); c.stroke();
        c.font = "13px " + FONT; c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText("⏰", xb, yb - 12);
      }
    });
    // ヒント の せん
    (S.ghost || []).forEach(function (tr) {
      trainPath(c, V, line, tr);
      c.strokeStyle = alpha(D.TYPES[tr.type].color, 0.55); c.lineWidth = 3; c.setLineDash([2, 6]); c.lineCap = "round"; c.stroke(); c.setLineDash([]);
    });
    // でんしゃ の せん
    var drawTrain = function (tr, fixed, selected) {
      var col = D.TYPES[tr.type].color;
      if (selected) { trainPath(c, V, line, tr); c.strokeStyle = "rgba(255,212,59,.9)"; c.lineWidth = 11; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); }
      trainPath(c, V, line, tr);
      c.strokeStyle = fixed ? alpha(col, 0.5) : col; c.lineWidth = fixed ? 2.6 : 3.6; c.lineJoin = "round"; c.lineCap = "round"; c.stroke();
      if (!fixed) {
        c.fillStyle = col;
        tr.stops.forEach(function (s) { c.beginPath(); c.arc(V.x(s[1]), V.y(line.stations[s[0]].km), 2.6, 0, 7); c.fill(); });
      }
    };
    (S.fixed || []).forEach(function (tr) { drawTrain(tr, !S.quiz, false); });
    (S.user || []).forEach(function (tr, i) { drawTrain(tr, false, S.sel === i); });
    // なぞって いる とちゅう
    if (S.draft) {
      var dr = S.draft, col = D.TYPES[dr.type].color, s = dr.stops;
      c.strokeStyle = col; c.lineWidth = 4; c.lineJoin = "round"; c.lineCap = "round";
      c.beginPath();
      for (var k = 0; k < s.length; k++) {
        var yy = V.y(st[s[k][0]].km);
        if (k === 0) c.moveTo(V.x(s[k][1]), yy); else c.lineTo(V.x(s[k][1]), yy);
        if (s[k][2] != null) c.lineTo(V.x(s[k][2]), yy);
      }
      if (dr.tip) c.lineTo(V.x(dr.tip.t), V.y(dr.tip.km));
      c.stroke();
      var hx = dr.tip ? V.x(dr.tip.t) : V.x(s[0][1]), hy = dr.tip ? V.y(dr.tip.km) : V.y(st[s[0][0]].km);
      c.fillStyle = "#fff"; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, 6, 0, 7); c.fill(); c.stroke();
    }
    // しょうとつ
    var all = (S.fixed || []).concat(S.user || []);
    (S.conflicts || []).forEach(function (cf) {
      [[cf.a, cf.ka], [cf.b, cf.kb]].forEach(function (p) {
        var tr = all[p[0]]; if (!tr) return;
        segPath(c, V, line, tr, p[1], cf.kind === "plat");
        c.strokeStyle = "rgba(224,49,49,.85)"; c.lineWidth = 6; c.lineCap = "round"; c.stroke();
      });
    });
    (S.conflicts || []).forEach(function (cf) {
      var x = V.x(cf.t), y = V.y(cf.km), pulse = S.pulse || 0;
      c.strokeStyle = RED; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 12 + pulse * 4, 0, 7); c.stroke();
      c.font = "18px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("💥", x, y);
    });
    // よみかた の しるし
    (S.marks || []).forEach(function (m) {
      var x = V.x(m.t), y = V.y(m.km);
      c.strokeStyle = "#2b8a3e"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 13, 0, 7); c.stroke();
    });
    // ばんごう
    if (S.labels) {
      S.fixed.forEach(function (tr, i) {
        var s0 = tr.stops[0], x = V.x(s0[2]) + 2, y = V.y(st[s0[0]].km) + (tr.dir > 0 ? 13 : -13);
        badge(c, Math.max(B.x + 10, x), y, i + 1, D.TYPES[tr.type].color);
      });
    }
    // いま（はしらせる とき）
    if (S.now != null) {
      var nx = V.x(S.now);
      c.strokeStyle = "rgba(224,49,49,.8)"; c.lineWidth = 2; c.beginPath(); c.moveTo(nx, B.y - 4); c.lineTo(nx, B.y + B.h); c.stroke();
    }
    c.restore();
    if (S.now != null) {
      var nx2 = Math.min(Math.max(V.x(S.now), B.x + 20), f.w - 24);
      c.fillStyle = RED; rr(c, nx2 - 22, 2, 44, 18, 9); c.fill();
      c.fillStyle = "#fff"; c.font = "bold 12px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(D.hm(Math.floor(S.now)), nx2, 11.5);
    }
    return V;
  }

  /* ---------- せんろ ず ---------- */
  function trackGeom(line, w, h) {
    var st = line.stations, k0 = st[0].km, k1 = st[st.length - 1].km;
    // はし の えき は ホーム が おおい ので えがく の は 2〜3ぼん まで
    var dp = st.map(function (s, i) { var end = i === 0 || i === st.length - 1; return end ? Math.min(s.p, s.shared ? 3 : 2) : s.p; });
    var span = Math.max.apply(null, st.map(function (s, i) { return s.shared ? dp[i] : dp[i] * 2; }));
    var mx = 22, g = Math.max(5, Math.min(12, (h - 24) / Math.max(2, span)));
    var X = function (km) { return mx + (km - k0) / (k1 - k0) * (w - 2 * mx); };
    var cy = (h - 14) / 2 + 2;
    var laneOf = function (sec, dir) { return line.secs[sec].d === 2 ? (dir > 0 ? g / 2 : -g / 2) : 0; };
    var trackY = function (i, dir, j) {
      var s = st[i], p = dp[i]; j = j % p;
      if (s.shared) return (j - (p - 1) / 2) * g;
      return dir > 0 ? g / 2 + j * g : -(g / 2 + j * g);
    };
    return { X: X, cy: cy, g: g, laneOf: laneOf, trackY: trackY, plat: 10, dp: dp };
  }
  function drawTrack(cv, S) {
    var f = fit(cv), c = f.c, line = S.line, st = line.stations;
    var G = trackGeom(line, f.w, f.h), X = G.X, cy = G.cy;
    c.clearRect(0, 0, f.w, f.h);
    c.fillStyle = "#eef5ec"; c.fillRect(0, 0, f.w, f.h);
    c.lineCap = "round";
    var rail = function (x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0, cy + y0); c.lineTo(x1, cy + y1); c.stroke(); };
    c.strokeStyle = "#5c6670"; c.lineWidth = 2.4;
    // くかん
    line.secs.forEach(function (sc, i) {
      var xa = X(st[i].km) + G.plat, xb = X(st[i + 1].km) - G.plat;
      var lanes = sc.d === 2 ? [[1, G.g / 2], [-1, -G.g / 2]] : [[1, 0]];
      lanes.forEach(function (ln) {
        var dirs = sc.d === 2 ? [ln[0]] : [1, -1];
        dirs.forEach(function (dir) {
          var pa = G.dp[i], pb = G.dp[i + 1];
          // えき の はし から せん へ
          var ya = [], yb = [];
          for (var ja = 0; ja < pa; ja++) ya.push(G.trackY(i, dir, ja));
          for (var jb = 0; jb < pb; jb++) yb.push(G.trackY(i + 1, dir, jb));
          ya.forEach(function (y) { rail(xa, y, xa + 9, ln[1]); });
          yb.forEach(function (y) { rail(xb - 9, ln[1], xb, y); });
        });
        rail(xa + 9, ln[1], xb - 9, ln[1]);
      });
    });
    // えき
    st.forEach(function (s, i) {
      var x = X(s.km), ys = [];
      if (s.shared) for (var j = 0; j < G.dp[i]; j++) ys.push(G.trackY(i, 1, j));
      else for (var j2 = 0; j2 < G.dp[i]; j2++) { ys.push(G.trackY(i, 1, j2)); ys.push(G.trackY(i, -1, j2)); }
      var top = Math.min.apply(null, ys), bot = Math.max.apply(null, ys);
      c.fillStyle = "#fff"; rr(c, x - G.plat - 3, cy + top - 6, 2 * G.plat + 6, bot - top + 12, 5); c.fill();
      c.strokeStyle = "#c9d1d9"; c.lineWidth = 1; c.stroke();
      c.strokeStyle = "#5c6670"; c.lineWidth = 2.4;
      ys.forEach(function (y) { rail(x - G.plat, y, x + G.plat, y); });
      c.fillStyle = INK; c.font = "bold 12px " + FONT; c.textAlign = "center"; c.textBaseline = "top";
      c.fillText(s.n, Math.max(8, Math.min(f.w - 8, x)), Math.min(f.h - 13, cy + bot + 6));
    });
    // でんしゃ
    if (S.now != null) {
      var all = S.trains, assign = S.assign || {};
      all.forEach(function (tr, ti) {
        var p = D.posAt(line, tr, S.now);
        if (!p) return;
        var x = X(p.km), y;
        if (p.stop != null) y = G.trackY(p.st, tr.dir, assign[ti + ":" + p.stop] || 0);
        else {
          var s = tr.stops, ia = s[p.seg][0], ib = s[p.seg + 1][0];
          var lane = G.laneOf(p.sec, tr.dir);
          var ya = G.trackY(ia, tr.dir, assign[ti + ":" + p.seg] || 0), yb = G.trackY(ib, tr.dir, assign[ti + ":" + (p.seg + 1)] || 0);
          var xa = X(st[ia].km), xb = X(st[ib].km), dA = Math.abs(x - xa), dB = Math.abs(x - xb), R = G.plat + 9;
          y = dA < R ? ya + (lane - ya) * (dA / R) : dB < R ? yb + (lane - yb) * (dB / R) : lane;
        }
        var col = D.TYPES[tr.type].color, L = 20, H = 9;
        c.save(); c.translate(x, cy + y);
        c.fillStyle = S.hit && (S.hit.a === ti || S.hit.b === ti) ? RED : col;
        rr(c, -L / 2, -H / 2, L, H, 3); c.fill();
        c.fillStyle = "#fff";
        c.beginPath(); var fx = tr.dir > 0 ? L / 2 - 2 : -L / 2 + 2;
        c.moveTo(fx, 0); c.lineTo(fx - tr.dir * 5, -3); c.lineTo(fx - tr.dir * 5, 3); c.closePath(); c.fill();
        if (S.labels && ti < S.nFixed) { c.font = "bold 8px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(ti + 1), -tr.dir * 3, 0.5); }
        c.restore();
      });
      if (S.hit) {
        var hx = X(S.hit.km);
        c.font = "26px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("💥", hx, cy);
      }
    }
  }

  root.DTRender = { layout: layout, drawDia: drawDia, drawTrack: drawTrack, fit: fit };
})(typeof self !== "undefined" ? self : this);
