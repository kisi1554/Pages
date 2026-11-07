// どたばた ペット ホテル — かたち（ローポリ）と モデル
//  - Mesh.geo: はこ・きゅう・えんちゅう・とんがり・まる・ドーナツ の ちょうてん（いち＋むき）
//  - Mesh.MODELS: キャラ・ペット・かぐ を かたちの くみあわせ で かく
//  - M4: 4x4 ぎょうれつ（れつ ゆうせん）
'use strict';
var M4 = (function () {
  function ident() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (var i = 0; i < 4; i++) {
      var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      out[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
      out[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
      out[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
      out[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
    }
    return out;
  }
  // いち・かいてん（クォータニオン）・おおきさ
  function trsq(out, x, y, z, q, sx, sy, sz) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    var xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
    var wx = qw * x2, wy = qw * y2, wz = qw * z2;
    out[0] = (1 - (yy + zz)) * sx; out[1] = (xy + wz) * sx; out[2] = (xz - wy) * sx; out[3] = 0;
    out[4] = (xy - wz) * sy; out[5] = (1 - (xx + zz)) * sy; out[6] = (yz + wx) * sy; out[7] = 0;
    out[8] = (xz + wy) * sz; out[9] = (yz - wx) * sz; out[10] = (1 - (xx + yy)) * sz; out[11] = 0;
    out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
    return out;
  }
  function trsy(out, x, y, z, yaw, sx, sy, sz) {
    var c = Math.cos(yaw), s = Math.sin(yaw);
    out[0] = c * sx; out[1] = 0; out[2] = -s * sx; out[3] = 0;
    out[4] = 0; out[5] = sy; out[6] = 0; out[7] = 0;
    out[8] = s * sz; out[9] = 0; out[10] = c * sz; out[11] = 0;
    out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
    return out;
  }
  function euler(rx, ry, rz) { // ど → クォータニオン（Y * X * Z）
    var d = Math.PI / 360;
    var cx = Math.cos(rx * d), sx = Math.sin(rx * d), cy = Math.cos(ry * d), sy = Math.sin(ry * d), cz = Math.cos(rz * d), sz = Math.sin(rz * d);
    var qy = [0, sy, 0, cy], qx = [sx, 0, 0, cx], qz = [0, 0, sz, cz];
    return qmul(qmul(qy, qx), qz);
  }
  function qmul(a, b) {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
  }
  function rotX(out, a) { var c = Math.cos(a), s = Math.sin(a); out.set([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); return out; }
  function rotY(out, a) { var c = Math.cos(a), s = Math.sin(a); out.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); return out; }
  function rotZ(out, a) { var c = Math.cos(a), s = Math.sin(a); out.set([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); return out; }
  function trans(out, x, y, z) { out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); return out; }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }
  function lookAt(out, e, c, up) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    var l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    out[15] = 1;
    return out;
  }
  function apply(m, p) {
    var x = p[0], y = p[1], z = p[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w];
  }
  return { ident: ident, mul: mul, trsq: trsq, trsy: trsy, euler: euler, qmul: qmul, rotX: rotX, rotY: rotY, rotZ: rotZ, trans: trans, perspective: perspective, lookAt: lookAt, apply: apply };
})();

var Mesh = (function () {
  // ---- かたち（さんかくけい ごとに むきを もつ ＝ フラット）----------------
  // n が ない ときは めんの むきを けいさん。ref（かたちの なかの てん）から そとむき に そろえる
  function pushTri(out, a, b, c, n, ref) {
    if (!n) {
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var l = Math.hypot(nx, ny, nz) || 1;
      n = [nx / l, ny / l, nz / l];
      var r = ref || [0, 0, 0];
      var gx = (a[0] + b[0] + c[0]) / 3 - r[0], gy = (a[1] + b[1] + c[1]) / 3 - r[1], gz = (a[2] + b[2] + c[2]) / 3 - r[2];
      if (gx * n[0] + gy * n[1] + gz * n[2] < 0) n = [-n[0], -n[1], -n[2]];
    }
    [a, b, c].forEach(function (p, i) {
      var nn = Array.isArray(n[0]) ? n[i] : n;
      out.push(p[0], p[1], p[2], nn[0], nn[1], nn[2]);
    });
  }
  function box() {
    var o = [], h = 0.5;
    var f = [
      [[h, -h, -h], [h, h, -h], [h, h, h], [h, -h, h]], [[-h, -h, h], [-h, h, h], [-h, h, -h], [-h, -h, -h]],
      [[-h, h, -h], [-h, h, h], [h, h, h], [h, h, -h]], [[-h, -h, h], [-h, -h, -h], [h, -h, -h], [h, -h, h]],
      [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]], [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]],
    ];
    f.forEach(function (q) { pushTri(o, q[0], q[1], q[2]); pushTri(o, q[0], q[2], q[3]); });
    return o;
  }
  function ico(sub, smooth) {
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    var f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var norm = function (p) { var l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
    var tris = f.map(function (x) { return [norm(v[x[0]]), norm(v[x[1]]), norm(v[x[2]])]; });
    for (var s = 0; s < sub; s++) {
      var nt = [];
      tris.forEach(function (tr) {
        var a = tr[0], b = tr[1], c = tr[2];
        var ab = norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
        var bc = norm([(b[0] + c[0]) / 2, (b[1] + c[1]) / 2, (b[2] + c[2]) / 2]);
        var ca = norm([(c[0] + a[0]) / 2, (c[1] + a[1]) / 2, (c[2] + a[2]) / 2]);
        nt.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      });
      tris = nt;
    }
    var o = [];
    tris.forEach(function (tr) { pushTri(o, tr[0], tr[1], tr[2], smooth ? [tr[0], tr[1], tr[2]] : null); });
    return o;
  }
  function cyl(seg, cone) {
    var o = [];
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      var p0 = [Math.sin(a0), Math.cos(a0)], p1 = [Math.sin(a1), Math.cos(a1)];
      var tr = cone ? 0 : 1;
      var b0 = [p0[0], -0.5, p0[1]], b1 = [p1[0], -0.5, p1[1]], t0 = [p0[0] * tr, 0.5, p0[1] * tr], t1 = [p1[0] * tr, 0.5, p1[1] * tr];
      if (cone) pushTri(o, b0, b1, [0, 0.5, 0]);
      else { pushTri(o, b0, b1, t1); pushTri(o, b0, t1, t0); pushTri(o, t0, t1, [0, 0.5, 0], [0, 1, 0]); }
      pushTri(o, b1, b0, [0, -0.5, 0], [0, -1, 0]);
    }
    return o;
  }
  function disc(seg) {
    var o = [];
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      pushTri(o, [0, 0, 0], [Math.sin(a0), 0, Math.cos(a0)], [Math.sin(a1), 0, Math.cos(a1)], [0, 1, 0]);
    }
    return o;
  }
  function torus(seg, side, rr) {
    var o = [], R = 1 - rr;
    function pt(i, j) {
      var a = i / seg * Math.PI * 2, b = j / side * Math.PI * 2;
      return [(R + rr * Math.cos(b)) * Math.sin(a), rr * Math.sin(b), (R + rr * Math.cos(b)) * Math.cos(a)];
    }
    for (var i = 0; i < seg; i++) for (var j = 0; j < side; j++) {
      var a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      var am = (i + 0.5) / seg * Math.PI * 2, ref = [R * Math.sin(am), 0, R * Math.cos(am)];
      pushTri(o, a, b, c, null, ref); pushTri(o, a, c, d, null, ref);
    }
    return o;
  }
  var geo = {
    box: box(), sphere: ico(1, false), ball: ico(2, true), cyl: cyl(12), cone: cyl(10, true), disc: disc(18), torus: torus(14, 6, 0.32),
  };

  // ---- モデル -----------------------------------------------------------
  // [かたち, x, y, z, sx, sy, sz, いろ（'tint' は もちぬしの いろ）, {rx, ry, rz, a: うごき}]
  var SKIN = '#ffd8b5', EYE = '#2b2b3a', PINK = '#ff9fb8';
  var MODELS = {};
  function eyes(y, z, dx, s) { return [['sphere', -dx, y, z, s, s, s, EYE], ['sphere', dx, y, z, s, s, s, EYE]]; }

  // みならい スタッフ（R = 0.35、からだの まんなか が げんてん、まえ が +z）
  MODELS.staff = { R: 0.35, parts: [
    ['cyl', -0.13, -0.5, 0, 0.1, 0.4, 0.1, '#3b3b58', { a: 'legL' }], ['cyl', 0.13, -0.5, 0, 0.1, 0.4, 0.1, '#3b3b58', { a: 'legR' }],
    ['sphere', 0, -0.06, 0, 0.32, 0.38, 0.28, 'tint'],
    ['box', 0, -0.1, 0.22, 0.4, 0.46, 0.06, '#ffffff'], ['box', 0, 0.12, 0.25, 0.08, 0.06, 0.04, '#ff6b6b'],
    ['cyl', -0.36, 0.0, 0, 0.08, 0.34, 0.08, 'tint', { a: 'armL', rz: -12 }], ['cyl', 0.36, 0.0, 0, 0.08, 0.34, 0.08, 'tint', { a: 'armR', rz: 12 }],
    ['sphere', 0, 0.44, 0.02, 0.26, 0.25, 0.25, SKIN], ['sphere', 0, 0.5, -0.05, 0.27, 0.24, 0.25, '#6b4226'],
    ['sphere', -0.12, 0.38, 0.2, 0.05, 0.035, 0.03, PINK], ['sphere', 0.12, 0.38, 0.2, 0.05, 0.035, 0.03, PINK],
    ['cyl', 0, 0.66, 0, 0.22, 0.16, 0.22, 'tint'], ['cyl', 0, 0.6, 0.06, 0.27, 0.03, 0.29, '#ffffff'],
  ].concat(eyes(0.47, 0.22, 0.09, 0.04)) };
  // ゲスト スタッフ
  MODELS.pyonta = { R: 0.35, parts: [
    ['sphere', -0.13, -0.58, 0.05, 0.12, 0.1, 0.16, '#ffffff', { a: 'legL' }], ['sphere', 0.13, -0.58, 0.05, 0.12, 0.1, 0.16, '#ffffff', { a: 'legR' }],
    ['sphere', 0, -0.18, 0, 0.32, 0.38, 0.3, '#ffffff'], ['sphere', 0, -0.15, 0.18, 0.2, 0.25, 0.14, '#fff0f6'],
    ['sphere', 0, 0.35, 0.02, 0.27, 0.25, 0.25, '#ffffff'],
    ['sphere', -0.1, 0.78, 0, 0.07, 0.25, 0.05, '#ffffff', { rz: 8, a: 'ear' }], ['sphere', 0.1, 0.78, 0, 0.07, 0.25, 0.05, '#ffffff', { rz: -8, a: 'ear' }],
    ['sphere', -0.1, 0.78, 0.03, 0.04, 0.18, 0.03, PINK, { rz: 8 }], ['sphere', 0.1, 0.78, 0.03, 0.04, 0.18, 0.03, PINK, { rz: -8 }],
    ['sphere', 0, 0.3, 0.25, 0.04, 0.03, 0.03, PINK], ['sphere', 0, -0.2, -0.3, 0.1, 0.1, 0.1, '#ffffff'],
    ['box', 0, -0.05, 0.27, 0.34, 0.32, 0.04, 'tint'],
  ].concat(eyes(0.4, 0.21, 0.1, 0.04)) };
  MODELS.tsukubou = { R: 0.35, parts: [
    ['cyl', -0.14, -0.52, 0, 0.06, 0.36, 0.06, '#2b8a3e', { a: 'legL', rx: -15 }], ['cyl', 0.14, -0.52, 0, 0.06, 0.36, 0.06, '#2b8a3e', { a: 'legR', rx: -15 }],
    ['sphere', 0, -0.12, -0.05, 0.28, 0.4, 0.34, '#51cf66'], ['sphere', 0, -0.1, 0.14, 0.2, 0.3, 0.16, '#d3f9d8'],
    ['sphere', -0.24, -0.05, -0.15, 0.08, 0.32, 0.2, '#37b24d', { rx: 20 }], ['sphere', 0.24, -0.05, -0.15, 0.08, 0.32, 0.2, '#37b24d', { rx: 20 }],
    ['sphere', 0, 0.4, 0.05, 0.24, 0.22, 0.24, '#69db7c'],
    ['sphere', -0.12, 0.45, 0.17, 0.09, 0.09, 0.09, '#ffffff'], ['sphere', 0.12, 0.45, 0.17, 0.09, 0.09, 0.09, '#ffffff'],
    ['cyl', -0.08, 0.75, 0.05, 0.015, 0.4, 0.015, '#2b8a3e', { rz: 18, a: 'ear' }], ['cyl', 0.08, 0.75, 0.05, 0.015, 0.4, 0.015, '#2b8a3e', { rz: -18, a: 'ear' }],
    ['cyl', 0, 0.62, 0, 0.18, 0.08, 0.18, 'tint'],
  ].concat(eyes(0.46, 0.25, 0.12, 0.045)) };
  MODELS.nyokosuke = { R: 0.35, parts: [
    ['sphere', 0, -0.55, -0.05, 0.22, 0.17, 0.22, '#94d82d'], ['sphere', 0, -0.3, 0, 0.24, 0.18, 0.24, '#82c91e'],
    ['sphere', 0, -0.05, 0.02, 0.25, 0.18, 0.25, '#94d82d'], ['sphere', 0, 0.2, 0.03, 0.24, 0.18, 0.24, '#82c91e'],
    ['sphere', 0, 0.48, 0.06, 0.27, 0.25, 0.27, '#a9e34b'],
    ['sphere', -0.12, 0.42, 0.26, 0.05, 0.035, 0.03, PINK], ['sphere', 0.12, 0.42, 0.26, 0.05, 0.035, 0.03, PINK],
    ['cyl', -0.1, 0.8, 0.05, 0.015, 0.22, 0.015, '#5c940d', { rz: 15, a: 'ear' }], ['cyl', 0.1, 0.8, 0.05, 0.015, 0.22, 0.015, '#5c940d', { rz: -15, a: 'ear' }],
    ['sphere', -0.13, 0.92, 0.05, 0.05, 0.05, 0.05, '#ff6b6b'], ['sphere', 0.13, 0.92, 0.05, 0.05, 0.05, 0.05, '#ff6b6b'],
    ['box', 0, -0.05, 0.25, 0.3, 0.2, 0.04, 'tint'],
  ].concat(eyes(0.52, 0.25, 0.1, 0.045)) };
  MODELS.naoki = { R: 0.35, parts: [
    ['cyl', -0.14, -0.5, 0, 0.11, 0.4, 0.11, '#f59f00', { a: 'legL' }], ['cyl', 0.14, -0.5, 0, 0.11, 0.4, 0.11, '#f59f00', { a: 'legR' }],
    ['sphere', 0, -0.08, 0, 0.34, 0.38, 0.3, '#fcc419'],
    ['cyl', -0.37, 0, 0, 0.09, 0.34, 0.09, '#fcc419', { a: 'armL', rz: -12 }], ['cyl', 0.37, 0, 0, 0.09, 0.34, 0.09, '#fcc419', { a: 'armR', rz: 12 }],
    ['sphere', 0, 0.45, -0.04, 0.36, 0.34, 0.3, '#d9480f'],
    ['sphere', 0, 0.43, 0.04, 0.25, 0.24, 0.24, '#ffd43b'],
    ['sphere', -0.17, 0.66, 0, 0.07, 0.07, 0.05, '#ffd43b'], ['sphere', 0.17, 0.66, 0, 0.07, 0.07, 0.05, '#ffd43b'],
    ['sphere', 0, 0.38, 0.26, 0.05, 0.04, 0.04, EYE], ['sphere', 0, -0.25, -0.32, 0.05, 0.05, 0.05, '#d9480f'],
    ['box', 0, -0.1, 0.25, 0.36, 0.4, 0.05, 'tint'],
  ].concat(eyes(0.48, 0.22, 0.09, 0.04)) };

  // ペット（R = 1、からだの まんなか が げんてん）
  function pet(extra, head) {
    var hc = head || 'tint';
    return [
      ['sphere', 0, -0.05, -0.05, 1.0, 0.88, 1.08, 'tint'],
      ['sphere', 0, 0.55, 0.72, 0.7, 0.66, 0.66, hc],
      ['sphere', -0.42, -0.72, 0.4, 0.22, 0.2, 0.26, hc, { a: 'legL' }], ['sphere', 0.42, -0.72, 0.4, 0.22, 0.2, 0.26, hc, { a: 'legR' }],
      ['sphere', -0.42, -0.72, -0.45, 0.22, 0.2, 0.26, hc, { a: 'legR' }], ['sphere', 0.42, -0.72, -0.45, 0.22, 0.2, 0.26, hc, { a: 'legL' }],
      ['sphere', -0.32, 0.44, 1.22, 0.13, 0.08, 0.05, PINK], ['sphere', 0.32, 0.44, 1.22, 0.13, 0.08, 0.05, PINK],
    ].concat(eyes(0.66, 1.26, 0.24, 0.1), extra);
  }
  MODELS.usagi = { R: 1, parts: pet([
    ['sphere', -0.22, 1.45, 0.55, 0.16, 0.55, 0.12, 'tint', { rz: 10, a: 'ear' }], ['sphere', 0.22, 1.45, 0.55, 0.16, 0.55, 0.12, 'tint', { rz: -10, a: 'ear' }],
    ['sphere', -0.22, 1.45, 0.63, 0.09, 0.4, 0.06, PINK, { rz: 10 }], ['sphere', 0.22, 1.45, 0.63, 0.09, 0.4, 0.06, PINK, { rz: -10 }],
    ['sphere', 0, 0.1, -1.1, 0.3, 0.3, 0.3, '#ffffff'], ['sphere', 0, 0.5, 1.35, 0.08, 0.06, 0.06, PINK],
  ]) };
  MODELS.inu = { R: 1, parts: pet([
    ['sphere', -0.6, 0.6, 0.6, 0.18, 0.42, 0.24, '#8d5a2b', { rz: 25, a: 'ear' }], ['sphere', 0.6, 0.6, 0.6, 0.18, 0.42, 0.24, '#8d5a2b', { rz: -25, a: 'ear' }],
    ['sphere', 0, 0.42, 1.25, 0.28, 0.22, 0.25, '#fff4e6'], ['sphere', 0, 0.55, 1.45, 0.11, 0.09, 0.08, EYE],
    ['cyl', 0, 0.35, -1.05, 0.09, 0.6, 0.09, 'tint', { rx: -40, a: 'tail' }],
    ['box', 0, 0.18, 0.62, 0.9, 0.14, 0.6, '#ff6b6b', { rx: -15 }],
  ]) };
  MODELS.penguin = { R: 1, parts: [
    ['sphere', 0, 0, 0, 0.95, 1.05, 0.95, 'tint'], ['sphere', 0, -0.05, 0.42, 0.72, 0.85, 0.6, '#ffffff'],
    ['sphere', 0, 0.85, 0.2, 0.68, 0.62, 0.66, 'tint'], ['sphere', 0, 0.82, 0.55, 0.5, 0.42, 0.3, '#ffffff'],
    ['cone', 0, 0.75, 0.95, 0.16, 0.36, 0.16, '#ffa94d', { rx: 90 }],
    ['sphere', -0.85, 0, 0, 0.16, 0.6, 0.32, 'tint', { rz: 15, a: 'armL' }], ['sphere', 0.85, 0, 0, 0.16, 0.6, 0.32, 'tint', { rz: -15, a: 'armR' }],
    ['sphere', -0.35, -0.95, 0.35, 0.25, 0.1, 0.35, '#ffa94d', { a: 'legL' }], ['sphere', 0.35, -0.95, 0.35, 0.25, 0.1, 0.35, '#ffa94d', { a: 'legR' }],
    ['sphere', -0.3, 0.6, 0.82, 0.1, 0.06, 0.05, PINK], ['sphere', 0.3, 0.6, 0.82, 0.1, 0.06, 0.05, PINK],
  ].concat(eyes(0.95, 0.78, 0.22, 0.1)) };
  MODELS.kame = { R: 1, parts: [
    ['sphere', 0, 0.05, -0.05, 1.05, 0.7, 1.15, 'tint'], ['sphere', 0, 0.35, -0.05, 0.75, 0.5, 0.85, '#2f9e44'],
    ['sphere', 0, 0.55, -0.05, 0.35, 0.25, 0.4, '#8ce99a'],
    ['sphere', 0, -0.3, -0.05, 1.0, 0.3, 1.1, '#d8f5a2'],
    ['sphere', 0, 0.1, 1.15, 0.45, 0.42, 0.5, '#a9e34b'],
    ['sphere', -0.65, -0.5, 0.6, 0.25, 0.2, 0.3, '#a9e34b', { a: 'legL' }], ['sphere', 0.65, -0.5, 0.6, 0.25, 0.2, 0.3, '#a9e34b', { a: 'legR' }],
    ['sphere', -0.65, -0.5, -0.65, 0.25, 0.2, 0.3, '#a9e34b', { a: 'legR' }], ['sphere', 0.65, -0.5, -0.65, 0.25, 0.2, 0.3, '#a9e34b', { a: 'legL' }],
    ['sphere', -0.2, 0.0, 1.55, 0.08, 0.05, 0.04, PINK], ['sphere', 0.2, 0.0, 1.55, 0.08, 0.05, 0.04, PINK],
  ].concat(eyes(0.25, 1.52, 0.18, 0.09)) };
  MODELS.neko = { R: 1, parts: pet([
    ['cone', -0.35, 1.2, 0.7, 0.2, 0.35, 0.14, 'tint', { rz: 15, a: 'ear' }], ['cone', 0.35, 1.2, 0.7, 0.2, 0.35, 0.14, 'tint', { rz: -15, a: 'ear' }],
    ['cone', -0.35, 1.18, 0.74, 0.11, 0.22, 0.06, PINK, { rz: 15 }], ['cone', 0.35, 1.18, 0.74, 0.11, 0.22, 0.06, PINK, { rz: -15 }],
    ['cyl', 0, 0.7, -1.2, 0.09, 1.0, 0.09, 'tint', { rx: -25, a: 'tail' }],
    ['sphere', 0, 0.45, 1.3, 0.2, 0.15, 0.15, '#fff4e6'], ['sphere', 0, 0.55, 1.4, 0.07, 0.05, 0.05, PINK],
    ['sphere', 0.35, 0.2, -0.3, 0.6, 0.4, 0.6, '#e8590c'],
  ]) };
  MODELS.niwatori = { R: 1, parts: [
    ['sphere', 0, -0.05, -0.05, 0.95, 0.85, 1.05, 'tint'], ['sphere', 0, 0.7, 0.55, 0.55, 0.6, 0.55, 'tint'],
    ['sphere', 0, 1.3, 0.5, 0.12, 0.2, 0.12, '#fa5252'], ['sphere', 0, 1.25, 0.72, 0.1, 0.16, 0.1, '#fa5252'], ['sphere', 0, 1.24, 0.3, 0.1, 0.15, 0.1, '#fa5252'],
    ['cone', 0, 0.68, 1.12, 0.14, 0.3, 0.1, '#fcc419', { rx: 90 }], ['sphere', 0, 0.42, 0.98, 0.09, 0.16, 0.07, '#fa5252'],
    ['sphere', -0.88, 0.05, -0.1, 0.18, 0.55, 0.7, '#f1f3f5', { a: 'armL' }], ['sphere', 0.88, 0.05, -0.1, 0.18, 0.55, 0.7, '#f1f3f5', { a: 'armR' }],
    ['sphere', 0, 0.4, -1.0, 0.18, 0.55, 0.3, '#f1f3f5', { rx: -30, a: 'tail' }],
    ['cyl', -0.3, -0.9, 0.1, 0.06, 0.35, 0.06, '#fcc419', { a: 'legL' }], ['cyl', 0.3, -0.9, 0.1, 0.06, 0.35, 0.06, '#fcc419', { a: 'legR' }],
  ].concat(eyes(0.85, 1.0, 0.2, 0.09)) };
  MODELS.buta = { R: 1, parts: pet([
    ['cone', -0.4, 1.12, 0.65, 0.18, 0.25, 0.12, 'tint', { rz: 30, rx: 20, a: 'ear' }], ['cone', 0.4, 1.12, 0.65, 0.18, 0.25, 0.12, 'tint', { rz: -30, rx: 20, a: 'ear' }],
    ['cyl', 0, 0.45, 1.38, 0.26, 0.2, 0.2, '#ff8fab', { rx: 90 }],
    ['sphere', -0.09, 0.45, 1.48, 0.05, 0.06, 0.03, '#c2255c'], ['sphere', 0.09, 0.45, 1.48, 0.05, 0.06, 0.03, '#c2255c'],
    ['torus', 0, 0.3, -1.15, 0.2, 0.2, 0.2, 'tint', { rx: 90, a: 'tail' }],
  ]) };
  MODELS.risu = { R: 1, parts: pet([
    ['cone', -0.32, 1.18, 0.7, 0.15, 0.3, 0.12, 'tint', { rz: 12, a: 'ear' }], ['cone', 0.32, 1.18, 0.7, 0.15, 0.3, 0.12, 'tint', { rz: -12, a: 'ear' }],
    ['sphere', 0, 1.0, -1.05, 0.55, 1.15, 0.5, '#e8a06a', { rx: -20, a: 'tail' }], ['sphere', 0, 1.2, -1.1, 0.3, 0.8, 0.3, '#fff4e6', { rx: -20 }],
    ['sphere', 0, -0.1, 0.55, 0.6, 0.6, 0.5, '#fff4e6'],
    ['sphere', 0, 0.48, 1.3, 0.07, 0.05, 0.05, EYE],
  ]) };
  MODELS.mud = { R: 1, parts: [
    ['sphere', 0.5, 0.35, 0.2, 0.42, 0.32, 0.4, '#8d5a2b'], ['sphere', -0.55, 0.1, -0.3, 0.38, 0.36, 0.42, '#7b4a1f'],
    ['sphere', 0.1, 0.65, -0.5, 0.4, 0.28, 0.4, '#8d5a2b'], ['sphere', -0.3, 0.9, 0.85, 0.25, 0.18, 0.22, '#7b4a1f'],
  ] };

  // とびまわる もの（R = 1）
  MODELS.chair = { R: 1, parts: [
    ['box', 0, -0.25, 0, 1.3, 0.18, 1.3, 'tint'], ['box', 0, 0.45, -0.58, 1.3, 1.25, 0.16, 'tint'],
    ['cyl', -0.52, -0.7, -0.52, 0.09, 0.75, 0.09, '#6b4a2f'], ['cyl', 0.52, -0.7, -0.52, 0.09, 0.75, 0.09, '#6b4a2f'],
    ['cyl', -0.52, -0.7, 0.52, 0.09, 0.75, 0.09, '#6b4a2f'], ['cyl', 0.52, -0.7, 0.52, 0.09, 0.75, 0.09, '#6b4a2f'],
  ] };
  MODELS.block = { R: 1, parts: [['box', 0, 0, 0, 1.35, 1.35, 1.35, 'tint'], ['box', 0, 0, 0, 0.9, 1.4, 0.9, '#ffffff']] };
  MODELS.ball = { R: 1, parts: [['sphere', 0, 0, 0, 1, 1, 1, 'tint'], ['cyl', 0, 0, 0, 1.02, 0.4, 1.02, '#ffffff'], ['sphere', 0, 0.97, 0, 0.15, 0.06, 0.15, '#ffd43b']] };
  MODELS.cake = { R: 1, parts: [
    ['cyl', 0, -0.55, 0, 0.95, 0.9, 0.95, '#fff4e6'], ['cyl', 0, -0.05, 0, 0.98, 0.16, 0.98, 'tint'],
    ['sphere', 0, 0.2, 0, 0.26, 0.28, 0.26, '#fa5252'], ['sphere', 0.55, 0.05, 0.3, 0.14, 0.1, 0.14, '#ffffff'], ['sphere', -0.5, 0.05, -0.35, 0.14, 0.1, 0.14, '#ffffff'],
  ] };
  MODELS.pillow = { R: 1, parts: [['sphere', 0, -0.1, 0, 1.25, 0.8, 1.05, 'tint'], ['sphere', 0, -0.1, 0, 0.5, 0.82, 0.5, '#ffffff']] };
  MODELS.plant = { R: 1, parts: [
    ['cyl', 0, -0.5, 0, 0.7, 1.0, 0.7, 'tint'], ['cyl', 0, -0.02, 0, 0.78, 0.12, 0.78, '#a0522d'],
    ['sphere', 0, 0.55, 0, 0.85, 0.75, 0.85, '#40c057'], ['sphere', 0.35, 1.0, 0.1, 0.5, 0.5, 0.5, '#51cf66'], ['sphere', -0.3, 0.95, -0.2, 0.45, 0.45, 0.45, '#37b24d'],
  ] };
  MODELS.pan = { R: 1, parts: [
    ['cyl', 0, -0.55, 0, 0.95, 0.2, 0.95, 'tint'], ['cyl', 0, -0.45, 0, 0.8, 0.05, 0.8, '#868e96'],
    ['box', 0, -0.5, 1.45, 0.18, 0.12, 1.1, '#6b4a2f'], ['sphere', 0.2, -0.38, 0.1, 0.35, 0.12, 0.3, '#ffe066'],
  ] };
  MODELS.ring = { R: 1, parts: [['torus', 0, 0, 0, 1, 1.3, 1, 'tint'], ['box', 0.82, 0, 0, 0.3, 0.62, 0.3, '#ffffff'], ['box', -0.82, 0, 0, 0.3, 0.62, 0.3, '#ffffff']] };
  MODELS.balloon = { R: 1, parts: [
    ['sphere', 0, 0.15, 0, 0.85, 1.0, 0.85, 'tint'], ['cone', 0, -0.9, 0, 0.12, 0.16, 0.12, 'tint', { rx: 180 }],
    ['box', 0, -1.6, 0, 0.03, 1.3, 0.03, '#ffffff'], ['sphere', -0.3, 0.5, 0.55, 0.15, 0.22, 0.1, '#ffffff'],
  ] };

  // うごかない かざり（げんてん は ゆか、R は つかわない）
  MODELS.plantBig = { R: 1, parts: [
    ['sphere', 0, 0.55, 0, 0.55, 0.6, 0.55, '#40c057'], ['sphere', 0.2, 1.05, 0.05, 0.4, 0.45, 0.4, '#51cf66'], ['sphere', -0.15, 1.3, -0.1, 0.3, 0.35, 0.3, '#37b24d'],
  ] };
  MODELS.lamp = { R: 1, parts: [['cyl', 0, 0.02, 0, 0.18, 0.04, 0.18, '#495057'], ['cyl', 0, 0.3, 0, 0.03, 0.55, 0.03, '#495057'], ['cone', 0, 0.62, 0, 0.25, 0.3, 0.25, '#ffe066']] };
  MODELS.petBed = { R: 1, parts: [['cyl', 0, 0.12, 0, 0.85, 0.22, 0.85, 'tint'], ['cyl', 0, 0.2, 0, 0.62, 0.1, 0.62, '#fff4e6'], ['sphere', 0.3, 0.32, 0.1, 0.18, 0.12, 0.14, '#ffffff']] };
  MODELS.showerHead = { R: 1, parts: [
    ['box', 0.5, 0.05, 0, 0.95, 0.07, 0.07, '#adb5bd'], ['cyl', 0, -0.03, 0, 0.3, 0.08, 0.3, '#ced4da'], ['cyl', 0, -0.08, 0, 0.24, 0.02, 0.24, '#74c0fc'],
  ] };
  MODELS.parasol = { R: 1, parts: [['cone', 0, 0.18, 0, 1.5, 0.45, 1.5, '#ff6b6b'], ['cone', 0, 0.19, 0, 0.8, 0.46, 0.8, '#ffffff'], ['sphere', 0, 0.42, 0, 0.08, 0.08, 0.08, '#ffd43b']] };
  MODELS.stove = { R: 1, parts: [['box', 0, 0.02, 0, 1.1, 0.04, 2.2, '#343a40'], ['cyl', 0, 0.05, -0.5, 0.3, 0.03, 0.3, '#fa5252'], ['cyl', 0, 0.05, 0.5, 0.3, 0.03, 0.3, '#fa5252']] };
  MODELS.fridgeDoor = { R: 1, parts: [['box', 0, 1.15, 0, 0.06, 2.2, 3.3, '#e9ecef'], ['box', 0.06, 1.25, -1.2, 0.06, 0.8, 0.1, '#adb5bd'], ['box', 0.02, 1.62, 0, 0.04, 0.04, 3.3, '#ced4da'], ['sphere', 0.05, 1.9, 0.9, 0.15, 0.15, 0.04, '#ff8787']] };
  MODELS.jars = { R: 1, parts: [['cyl', 0, 0.25, 0, 0.18, 0.5, 0.18, '#ffd8a8'], ['cyl', 0.45, 0.2, 0.1, 0.15, 0.4, 0.15, '#d0ebff'], ['cyl', -0.4, 0.3, 0.05, 0.16, 0.6, 0.16, '#d3f9d8']] };
  MODELS.merryRoof = { R: 1, parts: [['cone', 0, 0.45, 0, 3.0, 0.9, 3.0, '#f06595'], ['cone', 0, 0.46, 0, 1.6, 0.92, 1.6, '#ffffff'], ['sphere', 0, 0.95, 0, 0.2, 0.2, 0.2, '#ffd43b']] };
  MODELS.horse = { R: 1, parts: [
    ['cyl', 0, 1.2, 0, 0.04, 2.4, 0.04, '#ffd43b'], ['sphere', 0, 0.8, 0, 0.25, 0.25, 0.5, 'tint'], ['sphere', 0, 1.1, 0.45, 0.15, 0.25, 0.15, 'tint'],
    ['box', 0, 1.18, 0.35, 0.05, 0.3, 0.12, '#ffd43b'],
  ] };
  MODELS.tree = { R: 1, parts: [['cyl', 0, 0.6, 0, 0.15, 1.2, 0.15, '#8d5a2b'], ['sphere', 0, 1.5, 0, 0.8, 0.7, 0.8, '#40c057'], ['sphere', 0.4, 1.9, 0.2, 0.5, 0.5, 0.5, '#51cf66']] };
  MODELS.planet = { R: 1, parts: [['sphere', 0, 0, 0, 1, 1, 1, 'tint'], ['torus', 0, 0, 0, 1.7, 0.4, 1.7, '#ffe066', { rx: 20 }]] };
  MODELS.robot = { R: 1, parts: [
    ['cyl', 0, 0.12, 0, 0.45, 0.2, 0.45, '#dee2e6'], ['cyl', 0, 0.24, 0, 0.38, 0.06, 0.38, '#4dabf7'], ['sphere', 0, 0.3, 0.3, 0.08, 0.05, 0.08, '#51cf66'],
    ['sphere', -0.12, 0.3, 0.38, 0.04, 0.04, 0.03, EYE], ['sphere', 0.12, 0.3, 0.38, 0.04, 0.04, 0.03, EYE],
  ] };
  MODELS.nyoko = { R: 1, parts: [
    ['sphere', 0, 0.35, -1.2, 0.35, 0.3, 0.35, '#94d82d', { a: 'legL' }], ['sphere', 0, 0.38, -0.7, 0.38, 0.34, 0.38, '#82c91e', { a: 'legR' }],
    ['sphere', 0, 0.42, -0.2, 0.4, 0.36, 0.4, '#94d82d', { a: 'legL' }], ['sphere', 0, 0.6, 0.3, 0.42, 0.42, 0.42, '#a9e34b'],
    ['cyl', -0.15, 1.1, 0.35, 0.02, 0.3, 0.02, '#5c940d', { rz: 15 }], ['cyl', 0.15, 1.1, 0.35, 0.02, 0.3, 0.02, '#5c940d', { rz: -15 }],
    ['sphere', -0.2, 1.25, 0.35, 0.06, 0.06, 0.06, '#ff6b6b'], ['sphere', 0.2, 1.25, 0.35, 0.06, 0.06, 0.06, '#ff6b6b'],
    ['sphere', -0.15, 0.7, 0.68, 0.07, 0.07, 0.05, EYE], ['sphere', 0.15, 0.7, 0.68, 0.07, 0.07, 0.05, EYE],
    ['sphere', -0.25, 0.55, 0.65, 0.08, 0.05, 0.03, PINK], ['sphere', 0.25, 0.55, 0.65, 0.08, 0.05, 0.03, PINK],
  ] };

  // ---- モデルを ぎょうれつに なおして おく --------------------------------
  function hex(c) {
    if (!c || c === 'tint') return null;
    var n = parseInt(c.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
  }
  function compile(model) {
    model.compiled = model.parts.map(function (pt) {
      var o = pt[8] || {};
      var q = M4.euler(o.rx || 0, o.ry || 0, o.rz || 0);
      var m = M4.trsq(new Float32Array(16), pt[1], pt[2], pt[3], q, pt[4], pt[5], pt[6]);
      var pivot = o.a ? (o.a === 'tail' || o.a === 'ear' ? [pt[1], pt[2] - pt[5] * 0.5, pt[3]] : [pt[1], pt[2] + pt[5] * 0.5, pt[3]]) : null;
      return { mesh: pt[0], m: m, color: hex(pt[7]), tint: pt[7] === 'tint', anim: o.a || null, pivot: pivot };
    });
  }
  Object.keys(MODELS).forEach(function (k) { compile(MODELS[k]); });

  return { geo: geo, MODELS: MODELS, hex: hex };
})();
if (typeof module !== 'undefined') module.exports = { Mesh: Mesh, M4: M4 };
