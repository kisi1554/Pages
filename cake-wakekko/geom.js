/* ============================================================
   ケーキ わけっこ — ずけいの けいさん（ポリゴン）
   ブラウザでは window.Geom、node では module.exports で つかう
   ============================================================ */
(function (root) {
  "use strict";

  var TAU = Math.PI * 2;

  /* ガウスの こうしき（くつひもの こうしき）。反時計まわりで せい */
  function signedArea(poly) {
    var s = 0, n = poly.length;
    for (var i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }
  function area(poly) { return Math.abs(signedArea(poly)); }

  function centroid(poly) {
    var A = signedArea(poly), cx = 0, cy = 0, n = poly.length;
    if (Math.abs(A) < 1e-12) {
      for (var k = 0; k < n; k++) { cx += poly[k][0]; cy += poly[k][1]; }
      return [cx / n, cy / n];
    }
    for (var i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n], f = a[0] * b[1] - b[0] * a[1];
      cx += (a[0] + b[0]) * f; cy += (a[1] + b[1]) * f;
    }
    return [cx / (6 * A), cy / (6 * A)];
  }

  function bbox(poly) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* まる（n かっけい で ちかい）。反時計まわり（y うえむき の すうがく ざひょう） */
  function circle(r, n) {
    n = n || 96;
    var out = [];
    for (var i = 0; i < n; i++) { var a = TAU * i / n; out.push([r * Math.cos(a), r * Math.sin(a)]); }
    return out;
  }
  function rect(w, h) { return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]; }

  /* おうぎがた: ちゅうしん(0,0) から a0→a1（ラジアン、a1>a0）。
     まるの 96かくけいの ちょうてん を そのまま つかうので、ぜんぶ たすと まるに もどる */
  function sector(r, a0, a1, segs) {
    segs = segs || 96;
    var step = TAU / segs, out = [[0, 0]];
    out.push([r * Math.cos(a0), r * Math.sin(a0)]);
    var k = Math.floor(a0 / step + 1e-9) + 1;
    for (; k * step < a1 - 1e-9; k++) out.push([r * Math.cos(k * step), r * Math.sin(k * step)]);
    out.push([r * Math.cos(a1), r * Math.sin(a1)]);
    return out;
  }
  /* 96かくけいに ないせつ する おうぎがたの めんせき（chord を つかう ので まると ぴったり あう） */
  function sectorArea(r, a0, a1, segs) { return area(sector(r, a0, a1, segs)); }

  function pointInPoly(pt, poly) {
    var x = pt[0], y = pt[1], inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function segIntersect(a, b, c, d) {
    var r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
    var den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-12) return false;
    var t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
    var u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  /* せんぶん a-b が ポリゴンに かかって いるか */
  function segmentHitsPoly(a, b, poly) {
    if (pointInPoly(a, poly) || pointInPoly(b, poly)) return true;
    for (var i = 0; i < poly.length; i++) {
      if (segIntersect(a, b, poly[i], poly[(i + 1) % poly.length])) return true;
    }
    return false;
  }

  /* ポリゴンを ちょくせん（とおる てん p, むき d）で わける。
     へこんだ かたち でも OK。わけた かけらの はいれつ を かえす（きれなければ [poly]）。
     しくみ: へんと せんの こうてん を いれて、せんに そって ならべ、
     となりどうし（0-1, 2-3, …）を「はし」で むすんで まわりを たどる */
  function splitByLine(poly, p, d) {
    var len = Math.hypot(d[0], d[1]);
    if (len < 1e-12) return [poly.slice()];
    var dx = d[0] / len, dy = d[1] / len, nx = -dy, ny = dx;
    var n = poly.length, s = new Array(n);
    for (var i = 0; i < n; i++) {
      var v = (poly[i][0] - p[0]) * nx + (poly[i][1] - p[1]) * ny;
      s[i] = Math.abs(v) < 1e-7 ? 1e-7 : v;            // せんの うえの てんは「+がわ」あつかい
    }
    var A = [];
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      A.push({ pt: poly[i], x: false });
      if ((s[i] > 0) !== (s[j] > 0)) {
        var t = s[i] / (s[i] - s[j]);
        var ip = [poly[i][0] + t * (poly[j][0] - poly[i][0]), poly[i][1] + t * (poly[j][1] - poly[i][1])];
        A.push({ pt: ip, x: true, u: (ip[0] - p[0]) * dx + (ip[1] - p[1]) * dy });
      }
    }
    var xs = [];
    for (i = 0; i < A.length; i++) if (A[i].x) xs.push(i);
    if (xs.length < 2) return [poly.slice()];
    xs.sort(function (a, b) { return A[a].u - A[b].u; });
    for (i = 0; i + 1 < xs.length; i += 2) { A[xs[i]].pair = xs[i + 1]; A[xs[i + 1]].pair = xs[i]; }

    var L = A.length, seen = new Array(L), out = [];
    for (var st = 0; st < L; st++) {
      if (A[st].x || seen[st]) continue;
      var piece = [], k = st, guard = 0;
      do {
        piece.push(A[k].pt); seen[k] = true;
        if (A[k].x && A[k].pair !== undefined) { var q = A[k].pair; piece.push(A[q].pt); k = (q + 1) % L; }
        else k = (k + 1) % L;
      } while (k !== st && ++guard < L * 3);
      piece = dedupe(piece);
      if (piece.length >= 3 && area(piece) > 1e-9) out.push(piece);
    }
    return out.length ? out : [poly.slice()];
  }

  function dedupe(poly) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = out[out.length - 1];
      if (!q || Math.abs(p[0] - q[0]) > 1e-9 || Math.abs(p[1] - q[1]) > 1e-9) out.push(p);
    }
    if (out.length > 1) {
      var f = out[0], l = out[out.length - 1];
      if (Math.abs(f[0] - l[0]) < 1e-9 && Math.abs(f[1] - l[1]) < 1e-9) out.pop();
    }
    return out;
  }

  /* ぶんすう */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(p, q) { var g = gcd(p, q); return [p / g, q / g]; }

  /* くばりかたの はんてい: areas[i] の ずれが tol いない か */
  function judge(areas, tol) {
    var total = 0;
    for (var i = 0; i < areas.length; i++) total += areas[i];
    var target = total / areas.length, maxDev = 0, devs = [];
    for (i = 0; i < areas.length; i++) {
      var dv = target > 0 ? (areas[i] - target) / target : 0;
      devs.push(dv);
      if (Math.abs(dv) > maxDev) maxDev = Math.abs(dv);
    }
    return { ok: maxDev <= tol + 1e-9, target: target, devs: devs, maxDev: maxDev };
  }

  var Geom = {
    TAU: TAU, signedArea: signedArea, area: area, centroid: centroid, bbox: bbox,
    circle: circle, rect: rect, sector: sector, sectorArea: sectorArea,
    pointInPoly: pointInPoly, segIntersect: segIntersect, segmentHitsPoly: segmentHitsPoly,
    splitByLine: splitByLine, gcd: gcd, frac: frac, judge: judge
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Geom;
  else root.Geom = Geom;
})(this);
