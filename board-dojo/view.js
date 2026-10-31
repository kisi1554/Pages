/* かんがえる ボードゲーム — ばん と コマ を SVG で かく
   render(id, s, o) → <svg> の なかみ。たたける ところ には data-m="て" を つける
   o: { legal:[], hints:[], marks:[{m,kind:'bad'|'good'}], ghost, anim, prev } */
(function (root) {
  "use strict";
  var BD = root.BD = root.BD || { games: {} };
  var V = BD.view = {};

  // もくめ（こうぞう は きまった かたち。まいかい おなじ に なる）
  function wood(id, w, h, light) {
    var g = "", seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 0; i < 26; i++) {
      var y = (i + rnd() * 0.6) * h / 26, amp = 6 + rnd() * 14, ph = rnd() * 6;
      var d = "M0 " + y.toFixed(1);
      for (var x = 0; x <= w; x += w / 8) d += " Q" + (x + w / 16).toFixed(1) + " " + (y + Math.sin(ph + x / w * 7) * amp).toFixed(1) + " " + (x + w / 8).toFixed(1) + " " + y.toFixed(1);
      g += '<path d="' + d + '" fill="none" stroke="' + (i % 3 ? "#8a5a2b" : "#6e4220") + '" stroke-opacity="' + (0.08 + rnd() * 0.14).toFixed(2) + '" stroke-width="' + (1.5 + rnd() * 4).toFixed(1) + '"/>';
    }
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + Math.round(w * 0.025) + '" fill="url(#wd' + (light ? 'L' : 'D') + ')"/>' + g;
  }
  // グラデーション は ページ に 1つ だけ（かくれた SVG の なか だと きえる ことが ある ため）
  V.defs = function () {
    if (typeof document === "undefined" || document.getElementById("bd-defs")) return;
    var stops = function (id, a, b, c) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".5" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>'; };
    var rad = function (id, a, b, c, m) { return '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + a + '"/><stop offset="' + (m || ".6") + '" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient>'; };
    var d = document.createElement("div");
    d.innerHTML = '<svg id="bd-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' +
      stops("wdD", "#e2b46f", "#d39f58", "#c48a45") + stops("wdL", "#f1cf92", "#e8bd78", "#dcaa62") +
      rad("gb", "#6b6b6b", "#262626", "#050505", ".45") + rad("gw", "#ffffff", "#eeeeea", "#c9c9c2") +
      rad("gr", "#ff8a8a", "#e03131", "#a51111") + rad("gy", "#fff3a6", "#fcc419", "#d49b00") + '</defs></svg>';
    document.body.insertBefore(d.firstChild, document.body.firstChild);
  };
  function frame(w, h) {
    return '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="' + Math.round(w * 0.022) + '" fill="none" stroke="#7a4a1e" stroke-width="6" stroke-opacity=".55"/>';
  }
  function marksAt(o, m, x, y, r) {
    var out = "";
    (o.hints || []).forEach(function (h, i) { if (h === m) out += '<circle class="hint' + (i ? " sub" : "") + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; });
    (o.marks || []).forEach(function (k) { if (k.m === m) out += '<circle class="mark ' + k.kind + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; });
    return out;
  }
  function disc(x, y, r, p, cls) {
    var fill = p === 1 ? "url(#gb)" : "url(#gw)";
    return '<g class="pc ' + (cls || "") + '"><ellipse cx="' + x + '" cy="' + (y + r * 0.12) + '" rx="' + r + '" ry="' + r * 0.98 + '" fill="#0005"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + (p === 1 ? "#000" : "#a9a9a0") + '" stroke-width="2"/></g>';
  }

  /* ---------- リバーシ ---------- */
  function reversi(s, o) {
    var N = s.N, M = 30, C = 100, W = N * C + M * 2, out = wood("r", W, W);
    out += '<rect x="' + M + '" y="' + M + '" width="' + N * C + '" height="' + N * C + '" fill="#2f9e44" fill-opacity=".0"/>';
    for (var i = 0; i <= N; i++) {
      out += '<line x1="' + M + '" y1="' + (M + i * C) + '" x2="' + (M + N * C) + '" y2="' + (M + i * C) + '" class="ln"/>';
      out += '<line x1="' + (M + i * C) + '" y1="' + M + '" x2="' + (M + i * C) + '" y2="' + (M + N * C) + '" class="ln"/>';
    }
    var q = N === 8 ? [2, 6] : [2, 4];
    q.forEach(function (a) { q.forEach(function (b) { out += '<circle cx="' + (M + a * C) + '" cy="' + (M + b * C) + '" r="7" fill="#5c3a17"/>'; }); });
    out += frame(W, W);
    var prev = o.prev && o.prev.b, flipped = o.anim ? (s.flipped || []) : [];
    for (var k = 0; k < N * N; k++) {
      var x = M + (k % N) * C + C / 2, y = M + ((k / N) | 0) * C + C / 2, p = s.b[k];
      if (p) {
        var fi = flipped.indexOf(k);
        if (fi >= 0 && prev) {
          out += '<g style="--d:' + (0.12 + fi * 0.05) + 's">' + disc(x, y, 41, 3 - p, "flipout") + disc(x, y, 41, p, "flipin") + '</g>';
        } else out += disc(x, y, 41, p, o.anim && k === s.last ? "put" : "");
        if (k === s.last && !o.noLast) out += '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#e8590c"/>';
      } else if (o.legal && o.legal.indexOf(k) >= 0) out += '<circle class="dot" cx="' + x + '" cy="' + y + '" r="12"/>';
      out += marksAt(o, k, x, y, 44);
      if (o.ghost === k) out += '<g class="ghost">' + disc(x, y, 41, s.turn) + '</g>';
      if (!p && o.clickable !== false) out += '<rect data-m="' + k + '" x="' + (x - C / 2) + '" y="' + (y - C / 2) + '" width="' + C + '" height="' + C + '" fill="transparent"/>';
    }
    return { svg: out, w: W, h: W };
  }

  /* ---------- ごもく ---------- */
  function gomoku(s, o) {
    var N = s.N, C = 100, M = 70, W = (N - 1) * C + M * 2, out = wood("g", W, W, true);
    for (var i = 0; i < N; i++) {
      out += '<line x1="' + M + '" y1="' + (M + i * C) + '" x2="' + (M + (N - 1) * C) + '" y2="' + (M + i * C) + '" class="ln thin"/>';
      out += '<line x1="' + (M + i * C) + '" y1="' + M + '" x2="' + (M + i * C) + '" y2="' + (M + (N - 1) * C) + '" class="ln thin"/>';
    }
    out += '<rect x="' + M + '" y="' + M + '" width="' + (N - 1) * C + '" height="' + (N - 1) * C + '" fill="none" stroke="#3b2208" stroke-width="7"/>';
    var stars = N === 15 ? [3, 7, 11] : [2, 4, 6];
    stars.forEach(function (a) { stars.forEach(function (b) { if (N === 15 || (a === 4) === (b === 4)) out += '<circle cx="' + (M + a * C) + '" cy="' + (M + b * C) + '" r="11" fill="#3b2208"/>'; }); });
    out += frame(W, W);
    var forb = o.forbidden || [];
    for (var k = 0; k < N * N; k++) {
      var x = M + (k % N) * C, y = M + ((k / N) | 0) * C, p = s.b[k];
      if (p) {
        out += disc(x, y, 46, p, o.anim && k === s.last ? "put" : "");
        if (k === s.last && !o.noLast) out += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#e8590c"/>';
      } else if (forb.indexOf(k) >= 0) out += '<g class="forb"><line x1="' + (x - 18) + '" y1="' + (y - 18) + '" x2="' + (x + 18) + '" y2="' + (y + 18) + '"/><line x1="' + (x + 18) + '" y1="' + (y - 18) + '" x2="' + (x - 18) + '" y2="' + (y + 18) + '"/></g>';
      out += marksAt(o, k, x, y, 48);
      if (o.ghost === k) out += '<g class="ghost">' + disc(x, y, 46, s.turn) + '</g>';
      if (!p && o.clickable !== false) out += '<rect data-m="' + k + '" x="' + (x - C / 2) + '" y="' + (y - C / 2) + '" width="' + C + '" height="' + C + '" fill="transparent"/>';
    }
    if (s.line) out += winLine(s.line.map(function (k) { return [M + (k % N) * C, M + ((k / N) | 0) * C]; }));
    return { svg: out, w: W, h: W };
  }
  function winLine(pts) {
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var a = pts[0], b = pts[pts.length - 1];
    return '<line class="winline" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
  }

  /* ---------- まるばつ ---------- */
  function maru(x, y, cls) { return '<circle class="maru ' + (cls || "") + '" cx="' + x + '" cy="' + y + '" r="62"/>'; }
  function batsu(x, y, cls) { return '<g class="batsu ' + (cls || "") + '"><line x1="' + (x - 58) + '" y1="' + (y - 58) + '" x2="' + (x + 58) + '" y2="' + (y + 58) + '"/><line x1="' + (x + 58) + '" y1="' + (y - 58) + '" x2="' + (x - 58) + '" y2="' + (y + 58) + '"/></g>'; }
  function marubatsu(s, o) {
    var C = 200, M = 30, W = 3 * C + M * 2, out = wood("t", W, W, true);
    for (var i = 1; i < 3; i++) {
      out += '<line x1="' + (M + 14) + '" y1="' + (M + i * C) + '" x2="' + (M + 3 * C - 14) + '" y2="' + (M + i * C) + '" class="ln thick"/>';
      out += '<line x1="' + (M + i * C) + '" y1="' + (M + 14) + '" x2="' + (M + i * C) + '" y2="' + (M + 3 * C - 14) + '" class="ln thick"/>';
    }
    out += frame(W, W);
    for (var k = 0; k < 9; k++) {
      var x = M + (k % 3) * C + C / 2, y = M + ((k / 3) | 0) * C + C / 2, p = s.b[k], an = o.anim && k === s.last ? "draw" : "";
      if (p === 1) out += maru(x, y, an); else if (p === 2) out += batsu(x, y, an);
      out += marksAt(o, k, x, y, 82);
      if (o.ghost === k) out += '<g class="ghost">' + (s.turn === 1 ? maru(x, y) : batsu(x, y)) + '</g>';
      if (!p && o.clickable !== false) out += '<rect data-m="' + k + '" x="' + (x - C / 2) + '" y="' + (y - C / 2) + '" width="' + C + '" height="' + C + '" fill="transparent"/>';
    }
    var L = s.line;
    if (L) out += winLine(L.map(function (k) { return [M + (k % 3) * C + C / 2, M + ((k / 3) | 0) * C + C / 2]; }));
    return { svg: out, w: W, h: W };
  }

  /* ---------- 4つならべ ---------- */
  function c4piece(x, y, p, cls, dy) {
    return '<g class="pc ' + (cls || "") + '"' + (dy ? ' style="--dy:' + dy + 'px"' : "") + '><circle cx="' + x + '" cy="' + y + '" r="40" fill="' + (p === 1 ? "url(#gr)" : "url(#gy)") + '" stroke="' + (p === 1 ? "#8f1010" : "#b8860b") + '" stroke-width="3"/><circle cx="' + x + '" cy="' + y + '" r="24" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="5"/></g>';
  }
  function yonnarabe(s, o) {
    var Wd = s.W, H = s.H, C = 100, M = 24, TOP = 104, W = Wd * C + M * 2, Ht = H * C + M * 2 + TOP;
    var out = '<defs><mask id="holes' + (o.uid || "") + '"><rect x="0" y="' + TOP + '" width="' + W + '" height="' + (Ht - TOP) + '" fill="#fff"/>';
    var cx = function (c) { return M + c * C + C / 2; }, cy = function (r) { return TOP + M + (H - 1 - r) * C + C / 2; };
    for (var c = 0; c < Wd; c++) for (var r = 0; r < H; r++) out += '<circle cx="' + cx(c) + '" cy="' + cy(r) + '" r="41" fill="#000"/>';
    out += '</mask></defs>';
    var w = wood("c", W, Ht), cut = 0;
    out = out + '<rect x="0" y="' + TOP + '" width="' + W + '" height="' + (Ht - TOP) + '" fill="#3a200b" rx="20"/>';
    // コマ（ばん の うしろ）
    for (var k = 0; k < Wd * H; k++) {
      var p = s.b[k]; if (!p) continue;
      var col = k % Wd, row = (k / Wd) | 0, dy = 0, cls = "";
      if (o.anim && k === s.lastIdx) { cls = "fall"; dy = -(cy(row) - 50); }
      out += c4piece(cx(col), cy(row), p, cls, dy);
    }
    // ばん（あな あき）
    out += '<g mask="url(#holes' + (o.uid || "") + ')"><rect x="0" y="' + TOP + '" width="' + W + '" height="' + (Ht - TOP) + '" rx="20" fill="url(#wdD)"/>' + grainOnly(w.slice(cut)) + '</g>';
    out += '<rect x="3" y="' + (TOP + 3) + '" width="' + (W - 6) + '" height="' + (Ht - TOP - 6) + '" rx="18" fill="none" stroke="#7a4a1e" stroke-width="6" stroke-opacity=".6"/>';
    for (var c2 = 0; c2 < Wd; c2++) {
      var top = s.h[c2] < H ? s.h[c2] : -1;
      if (top >= 0) {
        var ty = cy(top);
        if (o.legal && o.legal.indexOf(c2) >= 0) out += '<path class="arrow" d="M' + (cx(c2) - 18) + ' 52 L' + (cx(c2) + 18) + ' 52 L' + cx(c2) + ' 82 Z"/>';
        out += marksAt(o, c2, cx(c2), ty, 44);
        if (o.ghost === c2) out += '<g class="ghost">' + c4piece(cx(c2), ty, s.turn) + '</g>';
      } else {
        (o.marks || []).forEach(function () { /* いっぱい の れつ に は しるし を ださない */ });
      }
      if (o.clickable !== false && top >= 0) out += '<rect data-m="' + c2 + '" x="' + (cx(c2) - C / 2) + '" y="0" width="' + C + '" height="' + Ht + '" fill="transparent"/>';
    }
    if (s.line) out += winLine(s.line.map(function (k) { return [cx(k % Wd), cy((k / Wd) | 0)]; }));
    return { svg: out, w: W, h: Ht };
  }
  function grainOnly(w) { var i = w.indexOf("<path"); return i >= 0 ? w.slice(i) : ""; }

  /* ---------- はこ とり ---------- */
  function hakotori(s, o) {
    var R = s.R, Cn = s.C, C = 200, M = 60, W = Cn * C + M * 2, H = R * C + M * 2, out = wood("h", W, H, true) + frame(W, H);
    var nh = (R + 1) * Cn;
    var ends = function (m) {
      if (m < nh) { var r = (m / Cn) | 0, c = m % Cn; return [M + c * C, M + r * C, M + (c + 1) * C, M + r * C]; }
      var k = m - nh, r2 = (k / (Cn + 1)) | 0, c2 = k % (Cn + 1); return [M + c2 * C, M + r2 * C, M + c2 * C, M + (r2 + 1) * C];
    };
    // はこ
    for (var b = 0; b < R * Cn; b++) {
      var bx = M + (b % Cn) * C, by = M + ((b / Cn) | 0) * C, ow = s.box[b];
      if (ow) {
        var an = o.anim && s.got && s.got.indexOf(b) >= 0 ? " got" : "";
        out += '<rect class="box p' + ow + an + '" x="' + (bx + 10) + '" y="' + (by + 10) + '" width="' + (C - 20) + '" height="' + (C - 20) + '" rx="18"/>';
        out += '<text class="boxmark p' + ow + an + '" x="' + (bx + C / 2) + '" y="' + (by + C / 2 + 30) + '">' + (ow === 1 ? "★" : "♥") + '</text>';
      }
    }
    for (var m = 0; m < s.e.length; m++) {
      var e = ends(m), mx = (e[0] + e[2]) / 2, my = (e[1] + e[3]) / 2, who = s.e[m];
      if (who) out += '<line class="edge p' + who + (o.anim && m === s.last ? " new" : "") + '" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '"/>';
      else out += '<line class="edge empty" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '"/>';
      (o.hints || []).forEach(function (h, i) { if (h === m) out += '<line class="ehint' + (i ? " sub" : "") + '" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '"/>'; });
      (o.marks || []).forEach(function (k) { if (k.m === m) out += '<line class="emark ' + k.kind + '" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '"/>'; });
      if (o.ghost === m) out += '<line class="edge ghostline p' + s.turn + '" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '"/>';
      if (!who && o.clickable !== false) {
        var horiz = e[1] === e[3];
        var pts = horiz ? [e[0], e[1], mx, my - C / 2, e[2], e[3], mx, my + C / 2] : [e[0], e[1], mx + C / 2, my, e[2], e[3], mx - C / 2, my];
        out += '<polygon data-m="' + m + '" points="' + pts.join(",") + '" fill="transparent"/>';
      }
    }
    for (var r = 0; r <= R; r++) for (var c = 0; c <= Cn; c++) out += '<circle class="dotpt" cx="' + (M + c * C) + '" cy="' + (M + r * C) + '" r="15"/>';
    return { svg: out, w: W, h: H };
  }

  var R = { reversi: reversi, gomoku: gomoku, marubatsu: marubatsu, yonnarabe: yonnarabe, hakotori: hakotori };
  V.render = function (id, s, o) { return R[id](s, o || {}); };

  // てばん の アイコン（ちいさい SVG）
  V.icon = function (id, p) {
    var inner;
    if (id === "reversi" || id === "gomoku") inner = '<circle cx="20" cy="20" r="16" fill="' + (p === 1 ? "#111" : "#fff") + '" stroke="' + (p === 1 ? "#000" : "#888") + '" stroke-width="2"/>';
    else if (id === "marubatsu") inner = p === 1 ? '<circle cx="20" cy="20" r="13" fill="none" stroke="#e03131" stroke-width="6"/>' : '<g stroke="#1c7ed6" stroke-width="6" stroke-linecap="round"><line x1="8" y1="8" x2="32" y2="32"/><line x1="32" y1="8" x2="8" y2="32"/></g>';
    else if (id === "yonnarabe") inner = '<circle cx="20" cy="20" r="16" fill="' + (p === 1 ? "#e03131" : "#fcc419") + '" stroke="' + (p === 1 ? "#8f1010" : "#b8860b") + '" stroke-width="2"/>';
    else inner = '<rect x="5" y="5" width="30" height="30" rx="6" fill="' + (p === 1 ? "#1c7ed6" : "#e8590c") + '"/><text x="20" y="28" font-size="20" text-anchor="middle" fill="#fff">' + (p === 1 ? "★" : "♥") + '</text>';
    return '<svg class="ico" viewBox="0 0 40 40" aria-hidden="true">' + inner + '</svg>';
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
