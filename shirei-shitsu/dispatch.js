'use strict';

/*
 * しれい の けいさん（DOM なし）。
 *   - へいそく: くかん（しんごう と しんごう の あいだ）に はいれる でんしゃ は 1ほん だけ。
 *     でんしゃ は くかん に はいる まえ に「よやく（claim）」して から はいる。よやく できない と しんごう の てまえ で とまる。
 *     その さき の くかん も ふさがって いたら まつ（えき の なか で にらめっこ に ならない ように）。
 *   - あか の しんごう、ちがう むき の ポイント（うしろ から はいる とき）でも とまる。ブレーキ は ゆっくり。
 *     まにあわない とき（ぎりぎり で あか に した、ポイント を かえた）は きゅうブレーキ ＋ ブザー。
 *   - おくれ: とまって まって いた じかん（1ぽん 4びょう まで は ゆとり）＋ あれれ？（ちがう ホーム・トンネル）。
 *   Dispatch.create(stageDef) / step(S, dt) / toggleSwitch / toggleLamp / heat / autopilot / plan / delay / stars
 */
const Dispatch = (() => {
  const LY = typeof Layout !== 'undefined' ? Layout : require('./layout.js');
  const { nextSeg, along, posOf, findRoute, side } = LY;
  const DEC = 1.4;   // ふつう の ブレーキ
  const EMG = 4.5;   // きゅうブレーキ
  const ACC = 1.0;
  const GRACE = 4;   // 1ぽん あたり の ゆとり（びょう）
  const GAP = 0.1;
  const PEN_ARERE = 5;
  const PEN_EMG = 2;

  const KINDS = {
    local: { name: 'ふつう', vmax: 2.0, cars: 2, car: 0.9, dwell: 3, color: '#2f9e44', line: '#b2f2bb' },
    rapid: { name: 'かいそく', vmax: 2.5, cars: 3, car: 0.85, dwell: 2.5, color: '#e8590c', line: '#ffd8a8' },
    express: { name: 'きゅうこう', vmax: 3.0, cars: 3, car: 0.85, dwell: 2, color: '#c92a2a', line: '#ffe3e3' },
    freight: { name: 'かもつ', vmax: 1.6, cars: 4, car: 0.7, dwell: 5, color: '#5c3d2e', line: '#e9c46a' },
    kaiso: { name: 'かいそう', vmax: 2.0, cars: 2, car: 0.9, dwell: 2, color: '#7048e8', line: '#d0bfff' },
  };

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  }

  function create(def, opts) {
    const L = LY.build(def);
    const S = {
      def, L, t: 0, trains: [], gone: [], queue: [], nextId: 1, penalty: 0, emerg: 0, arere: 0,
      events: [], owner: new Map(), faceoff: false, done: false, snowT: 0, rnd: rng(def.seed || 7),
      auto: false, endless: !!(opts && opts.endless), total: 0,
    };
    S.blockSws = L.blocks.map((segs) => {
      const set = new Set();
      for (const s of segs) { if (s.a.sw) set.add(s.a.sw); if (s.b.sw) set.add(s.b.sw); }
      return [...set];
    });
    for (const sw of L.sws) {
      const init = def.switchInit && def.switchInit[sw.pt.k];
      if (init) sw.state = init;
    }
    for (const q of def.trains || []) addTrain(S, q);
    return S;
  }

  function addTrain(S, q) {
    S.queue.push(Object.assign({ wait: 0 }, q));
    S.queue.sort((a, b) => a.t - b.t);
    S.total += 1;
  }

  const ev = (S, type, tr, extra) => {
    const e = Object.assign({ type, t: S.t }, extra || {});
    if (tr) {
      e.id = tr.id;
      const p = posOf(tr.seg, tr.s);
      e.x = p.x; e.y = p.y;
    }
    S.events.push(e);
    return e;
  };

  const dirKey = (dir) => (dir > 0 ? 'E' : 'W');

  // ---------- でんしゃ ----------
  function makeTrain(S, q, tun) {
    const k = KINDS[q.kind || 'local'];
    const len = k.cars * k.car + (k.cars - 1) * GAP;
    const dir = tun.side === 'W' ? 1 : -1;
    const tr = {
      id: S.nextId++, q, kind: q.kind || 'local', k, len, seg: tun.vseg,
      s: dir > 0 ? tun.vseg.len - 0.02 : 0.02, dir, v: Math.min(k.vmax * 0.75, 1.6),
      phase: q.goal ? 'in' : 'out', goal: q.goal || null, next: q.next || null, pass: !!q.pass,
      to: q.to === undefined ? null : q.to, dwell: q.dwell != null ? q.dwell : k.dwell, dwellT: 0, dwellOk: false,
      wait: q.wait || 0, claims: new Map(), body: [], blocks: new Set(), sc: null, emg: false,
      leftSpot: null, lockSw: [], arrived: null, visited: false, fade: 0, from: tun, waitFor: null, bufT: 0, bufPhase: 'out',
      color: q.color || k.color, gone: false,
    };
    S.trains.push(tr);
    updateBody(S, tr);
    for (const b of tr.blocks) S.owner.set(b, tr);
    ev(S, 'spawn', tr);
    return tr;
  }

  function spawn(S, dt) {
    const used = new Set();
    for (let i = 0; i < S.queue.length; i += 1) {
      const q = S.queue[i];
      if (q.t > S.t) break;
      const tun = S.L.tunnels.find((t) => t.id === q.from);
      if (!tun) { S.queue.splice(i, 1); i -= 1; continue; }
      if (used.has(tun.id) || S.owner.has(tun.vseg.block)) { q.wait += dt; used.add(tun.id); continue; }
      used.add(tun.id);
      S.queue.splice(i, 1);
      i -= 1;
      makeTrain(S, q, tun);
    }
  }

  function updateBody(S, tr) {
    const body = [tr.seg];
    let seg = tr.seg;
    let avail = tr.dir > 0 ? tr.s : seg.len - tr.s;
    let rem = tr.len;
    for (let g = 0; g < 60 && rem > avail + 1e-9; g += 1) {
      rem -= avail;
      const n = nextSeg(seg, -tr.dir);
      if (!n.seg) break;
      seg = n.seg;
      body.push(seg);
      avail = seg.len;
    }
    tr.body = body;
    tr.blocks = new Set(body.map((s) => s.block));
    for (const [b, p] of tr.claims) {
      if (tr.blocks.has(b)) {
        tr.claims.delete(b);
        const lamp = p.sig && p.sig.lamps[dirKey(tr.dir)];
        if (lamp && lamp.autoRed) lamp.red = true;
      }
    }
  }

  function computeOwners(S) {
    S.owner.clear();
    for (const tr of S.trains) {
      for (const b of tr.blocks) S.owner.set(b, tr);
      for (const b of tr.claims.keys()) S.owner.set(b, tr);
    }
  }

  const stopsAt = (tr, sp) => tr.phase === 'in' && !tr.pass && sp !== tr.leftSpot;
  const mine = (tr, b) => tr.blocks.has(b) || tr.claims.has(b);

  // くかん に はいって よい か（だめ なら りゆう）
  function canEnter(S, tr, p, seg) {
    tr._exit = null;
    const lamp = p.sig && p.sig.lamps[dirKey(tr.dir)];
    if (lamp && lamp.red) return { why: 'red' };
    const b = seg.block;
    const o = S.owner.get(b);
    if (o && o !== tr) return { why: 'busy', who: o };
    let cur = seg;
    for (let g = 0; g < 80; g += 1) {
      if (cur.spot && stopsAt(tr, cur.spot)) return null;
      const n = nextSeg(cur, tr.dir);
      if (n.p.vanish) return null;
      if (!n.trailOk) return { why: 'point', sw: n.p.sw };
      if (!n.seg) return null;
      if (n.seg.block !== b) {
        const o2 = S.owner.get(n.seg.block);
        if (o2 && o2 !== tr) return { why: 'busy', who: o2 };
        tr._exit = { p: n.p, seg: n.seg };
        return null;
      }
      cur = n.seg;
    }
    return null;
  }

  // まえ を みて、どこ で とまる か
  function scan(S, tr) {
    const seen = new Set();
    tr.lockSw = [];
    const r = scan0(S, tr, seen);
    // みち から はずれた よやく は とりけす（ポイント が かわった とき）
    for (const b of [...tr.claims.keys()]) {
      if (!seen.has(b)) {
        tr.claims.delete(b);
        if (S.owner.get(b) === tr) S.owner.delete(b);
      }
    }
    return r;
  }

  function scan0(S, tr, seen) {
    const dir = tr.dir;
    const lim = (tr.v * tr.v) / (2 * DEC) + 0.9;
    const range = lim + 4;
    let seg = tr.seg;
    let start = -(dir > 0 ? tr.s : seg.len - tr.s);
    for (let g = 0; g < 80; g += 1) {
      if (tr.claims.has(seg.block)) seen.add(seg.block);
      if (seg.spot && stopsAt(tr, seg.spot)) {
        const sp = seg.spot;
        const stopX = dir > 0 ? sp.x1 - 0.25 : sp.x0 + 0.25;
        const inSeg = dir > 0 ? stopX > seg.x0 - 1e-6 && stopX <= seg.x1 + 1e-6 : stopX >= seg.x0 - 1e-6 && stopX < seg.x1 + 1e-6;
        if (inSeg) return { d: start + Math.abs(stopX - (dir > 0 ? seg.x0 : seg.x1)), reason: 'spot', spot: sp };
      }
      const end = start + seg.len;
      if (start > range && seen.size >= tr.claims.size) return { d: Infinity, reason: null };
      const n = nextSeg(seg, dir);
      if (n.p.sw && end < lim + 0.6) tr.lockSw.push(n.p.sw);
      if (n.p.vanish) return { d: Infinity, reason: null };
      if (!n.trailOk) return { d: end - 0.35, reason: 'point', sw: n.p.sw, p: n.p };
      if (!n.seg) return { d: end - 0.15, reason: 'end', p: n.p };
      if (n.seg.block !== seg.block && !mine(tr, n.seg.block)) {
        const no = canEnter(S, tr, n.p, n.seg);
        if (!no && end <= lim) {
          tr.claims.set(n.seg.block, n.p);
          S.owner.set(n.seg.block, tr);
          seen.add(n.seg.block);
          // でぐち の さき の くかん まで みち を つくって おく（あと から はいって こられない ように）
          const ex = tr._exit;
          if (ex && !S.owner.get(ex.seg.block)) {
            const l2 = ex.p.sig && ex.p.sig.lamps[dirKey(dir)];
            if (!(l2 && l2.red)) {
              tr.claims.set(ex.seg.block, ex.p);
              S.owner.set(ex.seg.block, tr);
              seen.add(ex.seg.block);
            }
          }
        } else {
          if (no && no.who) tr.waitFor = no.who;
          return { d: end - 0.3, reason: no ? no.why : 'wait', p: n.p, sw: no && no.sw, block: n.seg.block };
        }
      }
      seg = n.seg;
      start = end;
    }
    return { d: Infinity, reason: null };
  }

  function arere(S, tr, why) {
    S.penalty += PEN_ARERE;
    S.arere += 1;
    tr.arere = (tr.arere || 0) + 1;
    ev(S, 'arere', tr, { why });
  }

  function enterSeg(S, tr, seg) {
    if (tr.leftSpot && seg.spot !== tr.leftSpot) tr.leftSpot = null;
    if (seg.spot && tr.phase === 'in' && tr.pass && !tr.visited) {
      tr.visited = true;
      if (seg.spot.id === tr.goal) ev(S, 'pass', tr, { spot: seg.spot.id });
      else arere(S, tr, 'spot');
      tr.phase = 'out';
    }
  }

  function move(S, tr, d) {
    let seg = tr.seg;
    let s = tr.s;
    const dir = tr.dir;
    for (let g = 0; g < 50 && d > 1e-9; g += 1) {
      const rem = dir > 0 ? seg.len - s : s;
      if (d <= rem) { s += dir * d; break; }
      d -= rem;
      const n = nextSeg(seg, dir);
      if (!n.seg) { s = dir > 0 ? seg.len : 0; break; }
      seg = n.seg;
      s = dir > 0 ? 0 : seg.len;
      enterSeg(S, tr, seg);
    }
    tr.seg = seg;
    tr.s = s;
    updateBody(S, tr);
    if (seg.virtual && seg.tunnel) {
      const t = seg.tunnel;
      const outward = (t.side === 'W' && dir < 0) || (t.side === 'E' && dir > 0);
      if (outward) {
        const into = t.side === 'W' ? seg.len - s : s;
        if (into >= tr.len + 0.05) finish(S, tr, t);
      }
    }
  }

  function finish(S, tr, tun) {
    tr.gone = true;
    if (tun) {
      const ok = tr.phase === 'out' && tr.to === tun.id;
      if (!ok) arere(S, tr, 'tunnel');
      ev(S, 'exit', tr, { tunnel: tun.id, ok });
    } else {
      ev(S, 'slept', tr);
    }
  }

  function reverse(S, tr) {
    const tail = along(tr.seg, tr.s, -tr.dir, tr.len);
    tr.seg = tail.seg;
    tr.s = tail.s;
    tr.dir = -tr.dir;
    tr.claims.clear();
    updateBody(S, tr);
  }

  // つぎ の めあて（dwell ちゅう は「でたあと」の めあて）
  function target(tr) {
    if (tr.phase === 'dwell') {
      if (tr.dwellOk && tr.next) return { phase: 'in', goal: tr.next };
      if (tr.to === null) return tr.dwellOk ? null : { phase: 'in', goal: tr.goal };
      return { phase: 'out', to: tr.to };
    }
    if (tr.phase === 'in') return { phase: 'in', goal: tr.goal };
    if (tr.phase === 'out') return { phase: 'out', to: tr.to };
    return null;
  }

  function routeFor(S, tr, tg, start, leftSpot) {
    if (!tg) return null;
    let goalFn;
    let avoid = null;
    if (tg.phase === 'in') {
      if (!tg.goal) return null;
      goalFn = (seg) => !!(seg.spot && seg.spot.id === tg.goal);
      avoid = (seg) => !!(seg.spot && seg.spot.id !== tg.goal && seg.spot !== leftSpot);
    } else {
      goalFn = (seg) => !!(seg.virtual && seg.tunnel && seg.tunnel.id === tg.to);
    }
    return findRoute(S.L, start, goalFn, avoid);
  }

  // でる ときの むき（まえ か、おりかえし か）
  function chooseDir(S, tr, tg) {
    const fwd = routeFor(S, tr, tg, { seg: tr.seg, dir: tr.dir }, tr.arrived);
    const tail = along(tr.seg, tr.s, -tr.dir, tr.len);
    const back = routeFor(S, tr, tg, { seg: tail.seg, dir: -tr.dir }, tr.arrived);
    if (fwd && (!back || fwd.dist <= back.dist + 0.01)) return { reverse: false, route: fwd };
    if (back) return { reverse: true, route: back };
    // みち が ない: トンネル の ほう へ、それ も だめ なら おりかえし
    if (tg && tg.phase === 'out') {
      const tun = S.L.tunnels.find((t) => t.id === tg.to);
      if (tun) return { reverse: (tun.side === 'E' ? 1 : -1) !== tr.dir, route: null };
    }
    const n = nextSeg(tr.seg, tr.dir);
    return { reverse: !n.seg, route: null };
  }

  function arrive(S, tr, sp) {
    tr.v = 0;
    tr.arrived = sp;
    tr.visited = true;
    tr.leftSpot = sp;
    const ok = sp.id === tr.goal;
    tr.dwellOk = ok;
    if (!ok) arere(S, tr, 'spot');
    else ev(S, 'arrive', tr, { spot: sp.id, kind: sp.kind });
    tr.phase = 'dwell';
    tr.dwellT = ok ? tr.dwell : Math.min(tr.dwell, 2);
  }

  function depart(S, tr) {
    const tg = target(tr);
    if (!tg) {
      tr.phase = 'sleep';
      tr.fade = 0;
      ev(S, 'sleep', tr);
      return;
    }
    const c = chooseDir(S, tr, tg);
    if (tr.dwellOk && tr.next) { tr.goal = tr.next; tr.next = null; }
    tr.phase = tg.phase;
    if (c.reverse) reverse(S, tr);
    tr.v = 0;
    ev(S, 'depart', tr);
  }

  function control(S, tr, dt) {
    tr.waitFor = null;
    if (tr.phase === 'dwell') {
      tr.v = 0;
      tr.sc = null;
      tr.dwellT -= dt;
      if (tr.dwellT <= 0) depart(S, tr);
      return;
    }
    if (tr.phase === 'sleep') {
      tr.v = 0;
      tr.fade += dt;
      if (tr.fade >= 1.6) finish(S, tr, null);
      return;
    }
    if (tr.phase === 'buffer') {
      tr.v = 0;
      tr.wait += dt;
      tr.bufT -= dt;
      if (tr.bufT <= 0) { reverse(S, tr); tr.phase = tr.bufPhase; }
      return;
    }
    const sc = scan(S, tr);
    tr.sc = sc;
    const vmax = tr.k.vmax * (S.def.snow ? 0.9 : 1);
    const vt = Math.min(vmax, Math.sqrt(2 * DEC * Math.max(0, sc.d)));
    if (tr.v > vt + 1e-6) {
      const need = (tr.v * tr.v) / (2 * Math.max(sc.d, 0.001));
      if (need > DEC * 1.35 && tr.v > 0.8 && !tr.emg && sc.reason && sc.reason !== 'spot' && sc.reason !== 'end') {
        tr.emg = true;
        S.emerg += 1;
        S.penalty += PEN_EMG;
        ev(S, 'emg', tr);
      }
      const dec = need > DEC ? Math.min(EMG, need) : DEC;
      tr.v = Math.max(vt, tr.v - dec * dt);
    } else {
      tr.v = Math.min(vt, tr.v + ACC * dt);
    }
    if (tr.emg && sc.d > (tr.v * tr.v) / (2 * DEC) + 1.5) tr.emg = false;
    const mv = Math.min(tr.v * dt, Math.max(0, sc.d));
    move(S, tr, mv);
    if (tr.gone) return;
    const left = sc.d - mv;
    if (sc.reason === 'spot' && left < 0.04) {
      arrive(S, tr, sc.spot);
    } else if (sc.reason === 'end' && left < 0.04) {
      tr.v = 0;
      if (tr.phase === 'in' && !tr.pass) arere(S, tr, 'end');
      tr.bufPhase = tr.phase;
      tr.phase = 'buffer';
      tr.bufT = 1.2;
    } else if (tr.v < 0.05) {
      tr.wait += dt;
    }
  }

  function updateLocks(S) {
    for (const sw of S.L.sws) sw.locked = false;
    for (const tr of S.trains) {
      for (const seg of tr.body) {
        if (seg.a.sw) seg.a.sw.locked = true;
        if (seg.b.sw) seg.b.sw.locked = true;
      }
      for (const sw of tr.lockSw || []) sw.locked = true;
    }
  }

  function lampBlock(lamp) {
    const s = side(lamp.pt, lamp.dir === 'E' ? 1 : -1)[0];
    return s ? s.block : -1;
  }

  function updateLamps(S) {
    for (const lamp of S.L.lamps) {
      const b = lampBlock(lamp);
      const o = S.owner.get(b);
      if (o && o.claims.get(b) === lamp.pt && dirKey(o.dir) === lamp.dir) lamp.show = 'green';
      else if (lamp.red || o) lamp.show = 'red';
      else lamp.show = 'green';
    }
  }

  function updateFaceoff(S) {
    let now = false;
    for (const tr of S.trains) {
      const o = tr.waitFor;
      if (o && tr.v < 0.05 && o.waitFor === tr && o.v < 0.05) now = true;
    }
    if (now && !S.faceoff) ev(S, 'faceoff', null);
    S.faceoff = now;
  }

  function updateSnow(S, dt) {
    const sn = S.def.snow;
    if (!sn) return;
    S.snowT += dt;
    if (S.snowT < sn.every) return;
    S.snowT = 0;
    if (S.queue.some((q) => q.t <= S.t + 5)) { S.snowT = sn.every - 1; return; }
    const soon = new Set();
    for (const w of plan(S).all) if (w.eta < 5) soon.add(w.sw);
    const cand = S.L.sws.filter((sw) => sw.ice <= 0 && !sw.locked && !soon.has(sw));
    if (!cand.length) return;
    const sw = cand[Math.floor(S.rnd() * cand.length) % cand.length];
    sw.ice = 1;
    ev(S, 'freeze', null, { sw: sw.id, x: sw.pt.x, y: sw.pt.y });
  }

  function step(S, dt) {
    if (S.done) return;
    S.t += dt;
    computeOwners(S);
    spawn(S, dt);
    for (const tr of S.trains) control(S, tr, dt);
    S.trains = S.trains.filter((tr) => {
      if (tr.gone) { S.gone.push(tr); return false; }
      return true;
    });
    computeOwners(S);
    updateLocks(S);
    updateLamps(S);
    updateFaceoff(S);
    updateSnow(S, dt);
    for (const sw of S.L.sws) if (sw.heat > 0) sw.heat = Math.max(0, sw.heat - dt * 3);
    if (S.auto) autopilot(S, dt);
    if (!S.endless && !S.queue.length && !S.trains.length) {
      S.done = true;
      ev(S, 'done', null);
    }
  }

  // ---------- そうさ ----------
  function toggleSwitch(S, sw) {
    if (sw.locked) { ev(S, 'locked', null, { sw: sw.id, x: sw.pt.x, y: sw.pt.y }); return false; }
    if (sw.ice > 0) { ev(S, 'frozen', null, { sw: sw.id, x: sw.pt.x, y: sw.pt.y }); return false; }
    sw.state ^= 1;
    ev(S, 'point', null, { sw: sw.id, x: sw.pt.x, y: sw.pt.y });
    return true;
  }

  // ながおし で あたためる（とけたら タップ で きりかえ られる）
  function heat(S, sw, dt) {
    if (sw.ice <= 0) return false;
    sw.heat = 1;
    sw.ice -= dt / 0.9;
    if (sw.ice <= 0) {
      sw.ice = 0;
      ev(S, 'melt', null, { sw: sw.id, x: sw.pt.x, y: sw.pt.y });
      return true;
    }
    return false;
  }

  function distTo(tr, p) {
    let seg = tr.seg;
    let d = tr.dir > 0 ? seg.len - tr.s : tr.s;
    for (let g = 0; g < 40; g += 1) {
      const n = nextSeg(seg, tr.dir);
      if (n.p === p) return d;
      if (!n.seg) return null;
      seg = n.seg;
      d += seg.len;
    }
    return null;
  }

  function toggleLamp(S, lamp) {
    lamp.red = !lamp.red;
    if (lamp.red) {
      const b = lampBlock(lamp);
      const o = S.owner.get(b);
      if (o && o.claims.get(b) === lamp.pt) {
        const d = distTo(o, lamp.pt);
        const room = d == null ? -1 : d - 0.3;
        const need = room > 0 ? (o.v * o.v) / (2 * room) : Infinity;
        if (room > 0.05 && need <= EMG) {
          // よやく を とりけす（その さき の よやく も）
          let drop = false;
          for (const k of [...o.claims.keys()]) {
            if (k === b) drop = true;
            if (drop) { o.claims.delete(k); S.owner.delete(k); }
          }
          updateLocks(S);
        } else {
          ev(S, 'late', o);
        }
      }
    }
    updateLamps(S);
    ev(S, 'signal', null, { lamp: lamp.id, red: lamp.red, x: lamp.pt.x, y: lamp.pt.y });
  }

  // ---------- じどう しれい（テスト と ヒント） ----------
  function plan(S) {
    const want = new Map();
    const lamps = [];
    for (const tr of S.trains) {
      if (tr.phase === 'sleep' || tr.phase === 'buffer') continue;
      let routes = [];
      let wait = 0;
      if (tr.phase === 'dwell') {
        if (tr.dwellT > 3) continue;
        const c = chooseDir(S, tr, target(tr));
        if (c.route) routes = [c.route];
        wait = Math.max(0, tr.dwellT);
      } else {
        const r = routeFor(S, tr, target(tr), { seg: tr.seg, dir: tr.dir }, tr.leftSpot);
        if (r) routes = [r];
      }
      for (const r of routes) {
        for (const n of r.needs) {
          if (n.d > 12) break;
          const eta = wait + n.d / Math.max(tr.v, 0.8);
          const cur = want.get(n.sw);
          if (!cur || eta < cur.eta) want.set(n.sw, { sw: n.sw, state: n.state, eta, tr });
        }
      }
      if (tr.sc && tr.sc.reason === 'red' && tr.sc.p) {
        const lamp = tr.sc.p.sig && tr.sc.p.sig.lamps[dirKey(tr.dir)];
        if (lamp && lamp.red) lamps.push({ lamp, tr });
      }
    }
    const all = [...want.values()].sort((a, b) => a.eta - b.eta);
    const sws = all.filter((w) => w.sw.state !== w.state);
    return { sws, lamps, all };
  }

  function autopilot(S, dt) {
    const p = plan(S);
    // こおった ポイント は つかう まえ に あたためて おく（ゆび は 1ぽん）
    const ice = p.all.find((w) => w.sw.ice > 0);
    if (ice) heat(S, ice.sw, dt);
    for (const w of p.sws) if (w.sw.ice <= 0 && !w.sw.locked) toggleSwitch(S, w.sw);
    for (const l of p.lamps) if (l.lamp.red) toggleLamp(S, l.lamp);
  }

  function delay(S) {
    let d = S.penalty;
    for (const tr of S.trains) d += Math.max(0, tr.wait - GRACE);
    for (const tr of S.gone) d += Math.max(0, tr.wait - GRACE);
    for (const q of S.queue) d += Math.max(0, q.wait - GRACE);
    return Math.round(d);
  }

  function stars(d) {
    if (d <= 3) return 3;
    if (d <= 15) return 2;
    return 1;
  }

  // え を かく ための りょうしゃ の いち
  function cars(tr) {
    const out = [];
    for (let i = 0; i < tr.k.cars; i += 1) {
      const d0 = i * (tr.k.car + GAP);
      const f = along(tr.seg, tr.s, -tr.dir, d0);
      const b = along(tr.seg, tr.s, -tr.dir, d0 + tr.k.car);
      out.push({ f: posOf(f.seg, f.s), b: posOf(b.seg, b.s) });
    }
    return out;
  }

  return {
    KINDS, GRACE, DEC, create, addTrain, step, toggleSwitch, toggleLamp, heat, autopilot, plan, delay, stars, cars,
    routeFor, target,
  };
})();

if (typeof module !== 'undefined') module.exports = Dispatch;
