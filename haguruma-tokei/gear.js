/* はぐるま とけいだい — はぐるまの しくみ（DOM なし。ブラウザ と node の りょうほうで つかう）
 *
 * - はぐるま = { pin, layer, teeth, fixed?, pre? }。layer は 0（おく）か 1（てまえ）。
 *   おなじ ピンに 2まい（layer 0 と 1）まで させて、おなじ ピンの はぐるまは いっしょに まわる（2だん はぐるま）。
 * - ピッチえんの はんけい = teeth × U。おなじ layer で ピンの きょり ≒ はんけいの わ なら かみあう。
 *   かみあわないのに ちかすぎる（はさき どうしが あたる）ときは「ぶつかる」ので おけない。
 * - モーターの じくは みぎまわり（+1）。かみあうと そくど × −(は1/は2)。わに なって むじゅん したら ロック。
 */
(function (root) {
  'use strict';
  var U = 2.5;          // は 1まいぶんの はんけい（ばんめんの たんい）
  var MOD = 2 * U;      // モジュール（はの たかさ ≒ MOD）
  var TOL = 2;          // かみあう きょりの ゆるさ
  var TEETH = [8, 12, 16, 24, 32, 48];

  function radius(t) { return t * U; }

  /* ステージの ピンを つくる。
   *   [id, x, y, kind?]            … ざひょう で
   *   [id, from, sum, deg, kind?]  … from ピン から「は の かず の わ sum」の きょり、deg 度（0=みぎ、90=した）
   */
  function buildPins(defs) {
    var pins = {}, list = [];
    defs.forEach(function (d) {
      var p;
      if (typeof d[1] === 'string') {
        var f = pins[d[1]];
        if (!f) throw new Error('pin ' + d[0] + ': from ' + d[1] + ' が ない');
        var a = d[3] * Math.PI / 180, len = d[2] * U;
        p = { id: d[0], x: f.x + Math.cos(a) * len, y: f.y + Math.sin(a) * len, kind: d[4] || '' };
      } else {
        p = { id: d[0], x: d[1], y: d[2], kind: d[3] || '' };
      }
      p.x = Math.round(p.x * 1000) / 1000;
      p.y = Math.round(p.y * 1000) / 1000;
      pins[p.id] = p;
      list.push(p);
    });
    return { map: pins, list: list };
  }

  function prepare(stage) {
    if (stage._pins) return stage;
    var b = buildPins(stage.pins);
    stage._pins = b.map;
    stage._pinList = b.list;
    stage._motor = b.list.filter(function (p) { return p.kind === 'motor'; })[0].id;
    return stage;
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  /* 2まいの かんけい: 'mesh'（かみあう）/ 'bump'（ぶつかる）/ null（かんけい なし） */
  function relation(stage, g, h) {
    if (g.layer !== h.layer) return null;
    if (g.pin === h.pin) return 'bump';
    var d = dist(stage._pins[g.pin], stage._pins[h.pin]);
    var sum = (g.teeth + h.teeth) * U;
    if (Math.abs(d - sum) <= TOL) return 'mesh';
    if (d < sum + 2 * MOD - 0.01) return 'bump';
    return null;
  }

  /* ばんめん ぜんたいを しらべる */
  function evaluate(stage, gears) {
    prepare(stage);
    var n = gears.length, adj = [], meshes = [], bumps = [];
    for (var i = 0; i < n; i += 1) adj.push([]);
    for (i = 0; i < n; i += 1) {
      for (var j = i + 1; j < n; j += 1) {
        var r = relation(stage, gears[i], gears[j]);
        if (r === 'mesh') { meshes.push([i, j]); adj[i].push(j); adj[j].push(i); }
        else if (r === 'bump') bumps.push([i, j]);
      }
    }
    var byPin = {};
    gears.forEach(function (g, k) { (byPin[g.pin] = byPin[g.pin] || []).push(k); });
    var speed = {}, locked = false, lockPairs = [];
    var m = stage._motor;
    speed[m] = 1;
    var queue = [m];
    while (queue.length) {
      var p = queue.shift();
      (byPin[p] || []).forEach(function (gi) {
        adj[gi].forEach(function (hj) {
          var q = gears[hj].pin;
          var s = -speed[p] * gears[gi].teeth / gears[hj].teeth;
          if (speed[q] === undefined) { speed[q] = s; queue.push(q); }
          else if (Math.abs(speed[q] - s) > 1e-9 * Math.max(1, Math.abs(s))) {
            locked = true;
            lockPairs.push([gi, hj]);
          }
        });
      });
    }
    // モーターに つながって いない ピンの はぐるまは うごかない
    var driven = gears.map(function (g) { return speed[g.pin] !== undefined; });
    return { speed: speed, locked: locked, lockPairs: lockPairs, meshes: meshes, bumps: bumps, driven: driven };
  }

  function near(a, b) { return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)); }

  /* はりの そくど（モーター 1かいてん あたり。+ は みぎまわり） */
  function outSpeed(stage, ev, key) {
    var pin = stage.out[key];
    if (!pin || ev.locked) return 0;
    return ev.speed[pin] || 0;
  }

  /* めあてを みたして いるか。code で なにが ちがうか を かえす */
  function judge(stage, gears, ev) {
    prepare(stage);
    ev = ev || evaluate(stage, gears);
    if (ev.locked) return { ok: false, code: 'lock' };
    var g = stage.goal;
    if (g.type === 'clock') {
      var sm = outSpeed(stage, ev, 'minute'), sh = outSpeed(stage, ev, 'hour');
      if (sm === 0) return { ok: false, code: 'still-minute', sm: sm, sh: sh };
      if (sm < 0) return { ok: false, code: 'dir-minute', sm: sm, sh: sh };
      if (g.minute && !near(sm, g.minute)) return { ok: false, code: 'speed-minute', sm: sm, sh: sh };
      if (sh === 0) return { ok: false, code: 'still-hour', sm: sm, sh: sh };
      if (sh < 0) return { ok: false, code: 'dir-hour', sm: sm, sh: sh };
      if (!near(sh * 12, sm)) return { ok: false, code: 'ratio', sm: sm, sh: sh };
      return { ok: true, code: 'ok', sm: sm, sh: sh };
    }
    var s = outSpeed(stage, ev, 'hand');
    if (s === 0) return { ok: false, code: 'still', s: s };
    if (g.dir && s * g.dir < 0) return { ok: false, code: 'dir', s: s };
    if (g.ratio && !near(Math.abs(s), g.ratio)) return { ok: false, code: 'speed', s: s };
    return { ok: true, code: 'ok', s: s };
  }

  /* layer に おけるか: { ok, reason: 'full' | 'bump', mesh: かみあう まいすう, drive: うごく ものと かみあう か } */
  function canPlace(stage, gears, pin, layer, teeth, ev) {
    prepare(stage);
    var g = { pin: pin, layer: layer, teeth: teeth };
    var mesh = 0, drive = false;
    ev = ev || evaluate(stage, gears);
    for (var i = 0; i < gears.length; i += 1) {
      var h = gears[i];
      if (h.pin === pin && h.layer === layer) return { ok: false, reason: 'full' };
      var r = relation(stage, g, h);
      if (r === 'bump') return { ok: false, reason: 'bump', with: i };
      if (r === 'mesh') { mesh += 1; if (ev.driven[i]) drive = true; }
    }
    if (pin === stage._motor || ev.speed[pin] !== undefined) drive = true;
    return { ok: true, mesh: mesh, drive: drive };
  }

  /* どちらの layer に おくか きめる（おけなければ null） */
  function autoLayer(stage, gears, pin, teeth, ev) {
    ev = ev || evaluate(stage, gears);
    var on = gears.filter(function (h) { return h.pin === pin; });
    if (on.length >= 2) return null;
    if (on.length === 1) {
      var other = 1 - on[0].layer;
      return canPlace(stage, gears, pin, other, teeth, ev).ok ? other : null;
    }
    var c0 = canPlace(stage, gears, pin, 0, teeth, ev), c1 = canPlace(stage, gears, pin, 1, teeth, ev);
    function score(c) { return !c.ok ? -1 : (c.drive && c.mesh ? 3 : 0) + (c.mesh ? 1 : 0); }
    var s0 = score(c0), s1 = score(c1);
    if (s0 < 0 && s1 < 0) return null;
    return s1 > s0 ? 1 : 0;
  }

  function key(gears) {
    return gears.filter(function (g) { return !g.fixed; })
      .map(function (g) { return g.pin + '.' + g.layer + '.' + g.teeth; }).sort().join(',');
  }

  /* はじめの ばんめん（fixed と pre） */
  function initial(stage, withPre) {
    prepare(stage);
    var gs = [];
    (stage.fixed || []).forEach(function (f) { gs.push({ pin: f[0], layer: f[1], teeth: f[2], fixed: true }); });
    if (withPre) (stage.pre || []).forEach(function (f) { gs.push({ pin: f[0], layer: f[1], teeth: f[2], pre: true }); });
    return gs;
  }

  /* たなの はぐるま（pre も たなに もどせるので いっしょに かぞえる） */
  function inventory(stage) {
    var inv = {};
    Object.keys(stage.shelf || {}).forEach(function (t) { inv[t] = stage.shelf[t]; });
    (stage.pre || []).forEach(function (f) { inv[f[2]] = (inv[f[2]] || 0) + 1; });
    return inv;
  }

  /* いちばん すくない まいすうの こたえを さがす（ふかさ ゆうせん を だんだん ふかく） */
  function solve(stage, maxDepth) {
    prepare(stage);
    maxDepth = maxDepth || 8;
    var start = initial(stage, false);
    var inv = inventory(stage);
    var teeth = Object.keys(inv).map(Number).sort(function (a, b) { return a - b; });
    var nodes = 0;
    for (var depth = 0; depth <= maxDepth; depth += 1) {
      var seen = {};
      var res = dfs(start, depth);
      if (res) return { par: depth, sol: res.filter(function (g) { return !g.fixed; }), nodes: nodes };
    }
    return null;

    function dfs(gears, left) {
      nodes += 1;
      var ev = evaluate(stage, gears);
      if (ev.locked) return null;
      if (judge(stage, gears, ev).ok) return gears;
      if (left === 0) return null;
      var k = key(gears);
      if (seen[k] !== undefined && seen[k] >= left) return null;
      seen[k] = left;
      for (var pi = 0; pi < stage._pinList.length; pi += 1) {
        var pin = stage._pinList[pi].id;
        for (var layer = 0; layer < 2; layer += 1) {
          for (var ti = 0; ti < teeth.length; ti += 1) {
            var t = teeth[ti];
            if (!inv[t]) continue;
            var c = canPlace(stage, gears, pin, layer, t, ev);
            if (!c.ok || !c.drive) continue;
            inv[t] -= 1;
            var r = dfs(gears.concat([{ pin: pin, layer: layer, teeth: t }]), left - 1);
            inv[t] += 1;
            if (r) return r;
          }
        }
      }
      return null;
    }
  }

  /* え の ための いそう: かみあう はが ちゃんと かみあって みえる ように はじめの かくど（rad）を きめる */
  function phases(stage, gears, ev) {
    prepare(stage);
    ev = ev || evaluate(stage, gears);
    var n = gears.length, ph = new Array(n), adj = [];
    for (var i = 0; i < n; i += 1) adj.push([]);
    ev.meshes.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    // モーターに ちかい ものから じゅんに きめる
    var order = [];
    for (i = 0; i < n; i += 1) order.push(i);
    order.sort(function (a, b) {
      var fa = gears[a].pin === stage._motor ? 0 : ev.driven[a] ? 1 : 2;
      var fb = gears[b].pin === stage._motor ? 0 : ev.driven[b] ? 1 : 2;
      return fa - fb;
    });
    order.forEach(function (s) {
      if (ph[s] !== undefined) return;
      ph[s] = 0;
      var q = [s];
      while (q.length) {
        var a = q.shift();
        adj[a].forEach(function (b) {
          if (ph[b] !== undefined) return;
          var pa = stage._pins[gears[a].pin], pb = stage._pins[gears[b].pin];
          var phi = Math.atan2(pb.y - pa.y, pb.x - pa.x);
          var Na = gears[a].teeth, Nb = gears[b].teeth;
          var sa = 2 * Math.PI / Na, sb = 2 * Math.PI / Nb;
          var fa = (((phi - ph[a]) / sa) % 1 + 1) % 1;
          ph[b] = phi + Math.PI - sb * (0.5 - fa);
          q.push(b);
        });
      }
    });
    return ph;
  }

  /* はぐるまの かたち（SVG path、ちゅうしん 0,0、は の ちゅうしんが 0 ラジアン） */
  function gearPath(t) {
    var r = radius(t), ro = r + MOD, ri = r - 1.25 * MOD, step = 2 * Math.PI / t;
    var pts = [];
    function P(rad, a) { pts.push((rad * Math.cos(a)).toFixed(2) + ' ' + (rad * Math.sin(a)).toFixed(2)); }
    for (var k = 0; k < t; k += 1) {
      var c = k * step;
      P(ri, c - 0.5 * step);
      P(ri, c - 0.27 * step);
      P(ro, c - 0.12 * step);
      P(ro, c + 0.12 * step);
      P(ri, c + 0.27 * step);
    }
    return 'M' + pts.join('L') + 'Z';
  }

  var api = {
    U: U, MOD: MOD, TOL: TOL, TEETH: TEETH, radius: radius, buildPins: buildPins, prepare: prepare,
    relation: relation, evaluate: evaluate, judge: judge, canPlace: canPlace, autoLayer: autoLayer,
    initial: initial, inventory: inventory, solve: solve, phases: phases, gearPath: gearPath, key: key,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gear = api;
})(this);
