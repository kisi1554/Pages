"use strict";
/* てんくうエレベーター - かごの うごき・ドア・うんこう（よび と いきさき の じゅんばん）
 *
 * ここは DOM を さわらない「しくみ」だけ。tools/tenku-elevator/test.js でも つかう。
 *   - かい … B50〜B1 は -50〜-1、1〜500 は 1〜500（0かい は ない）
 *   - たかさ … 1かい = 4m（B50 = -200m、500かい = 2000m）
 */
const Lift = (() => {
  const FLOOR_M = 4, MIN = -50, MAX = 500, COUNT = 550;
  const EPS = 0.02;

  const valid = n => Number.isInteger(n) && n !== 0 && n >= MIN && n <= MAX;
  const alt = n => n * FLOOR_M;
  /* たかさ → いちばん ちかい かい */
  function floorAt(h) {
    let n = Math.round(h / FLOOR_M);
    if (n === 0) n = h >= 0 ? 1 : -1;
    return Math.max(MIN, Math.min(MAX, n));
  }
  const label = n => n < 0 ? 'B' + (-n) : String(n);
  const yomi = n => n < 0 ? `ちか ${-n}かい` : n === MAX ? 'おくじょう（500かい）' : `${n}かい`;
  /* -50..-1, 1..500 を 0..549 の ばんごうに */
  const index = n => n < 0 ? n - MIN : n - MIN - 1;
  const fromIndex = i => i < -MIN ? i + MIN : i + MIN + 1;
  const all = () => Array.from({ length: COUNT }, (_, i) => fromIndex(i));

  /* テンキーの にゅうりょく → かい。まちがいは msg つき */
  function parseEntry(digits, basement) {
    const s = String(digits || '').replace(/^0+(?=\d)/, '');
    if (!/^\d+$/.test(s)) return { ok: false, msg: 'かずを おしてね' };
    const v = parseInt(s, 10);
    const n = basement ? -v : v;
    if (!valid(n)) return { ok: false, msg: 'その かいは ないよ' };
    return { ok: true, floor: n };
  }

  /* ---------- うごき ----------
   * とおい ほど さいこうそくを あげる。かかる じかん T は きょりで きめて、さいちょう 12びょう より みじかく。
   * かそく（T の 3わり）→ さいこうそく → げんそく（おなじ かそくど）の だいけい。
   */
  const T_MIN = 2.6, T_MAX = 11.2, MAX_DIST = (MAX - MIN) * FLOOR_M;
  function profile(dist) {
    const D = Math.max(0.5, Math.abs(dist));
    const T = Math.min(T_MAX, T_MIN + (T_MAX - T_MIN) * Math.sqrt(D / MAX_DIST));
    const ta = T * 0.3;
    const vmax = D / (T - ta);
    return { T, vmax, a: vmax / ta };
  }
  /* とまるのに ひつような きょり */
  const stopDist = car => car.v * car.v / (2 * car.a || 1);

  /* car = { h, v, a, vmax, target(m) } を dt びょう すすめる。ついたら true */
  function step(car, dt) {
    if (car.target == null) { car.v = 0; return false; }
    const d = car.target - car.h, dist = Math.abs(d), s = Math.sign(d);
    if (dist < 1e-4 && Math.abs(car.v) < 0.05) { car.h = car.target; car.v = 0; return true; }
    const want = s * Math.min(car.vmax, Math.sqrt(2 * car.a * dist));
    if (Math.sign(car.v) === s && Math.abs(want) > Math.abs(car.v)) {
      car.v = s * Math.min(Math.abs(want), Math.abs(car.v) + car.a * dt);
    } else if (car.v === 0) {
      car.v = s * Math.min(Math.abs(want), car.a * dt);
    } else {
      car.v = want;
    }
    car.h += car.v * dt;
    if ((car.target - car.h) * s <= 0 || Math.abs(car.target - car.h) < 1e-4) { car.h = car.target; car.v = 0; return true; }
    return false;
  }
  /* その かいに まにあって とまれるか（すすんでいる むきの まえで、ブレーキが まにあう） */
  function canStop(car, n) {
    const d = alt(n) - car.h;
    if (Math.abs(car.v) < 1e-3) return true;
    if (Math.sign(d) !== Math.sign(car.v)) return false;
    return Math.abs(d) + EPS >= stopDist(car);
  }

  /* ---------- うんこう（SCAN / あつまり ほうしき） ----------
   * st = { dir: 1|-1|0, car: Set(いきさき), up: Set(▲よび), down: Set(▼よび) }
   * pos … いまの たかさ（m）。ok(n) … その かいに とまれるか
   */
  function newState() { return { dir: 0, car: new Set(), up: new Set(), down: new Set() }; }
  const hasAny = st => st.car.size + st.up.size + st.down.size > 0;
  function requests(st) {
    const s = new Set([...st.car, ...st.up, ...st.down]);
    return [...s];
  }
  function nextStop(st, pos, ok = () => true) {
    if (!hasAny(st)) return null;
    const above = n => alt(n) > pos + EPS, below = n => alt(n) < pos - EPS;
    const here = n => Math.abs(alt(n) - pos) <= EPS;
    const tryDir = dir => {
      const ahead = dir > 0 ? above : below;
      const near = (a, b) => dir > 0 ? a - b : b - a;
      // おなじ むきの よび と いきさき（ちかい じゅん）
      const same = [...st.car, ...(dir > 0 ? st.up : st.down)].filter(n => ahead(n) && ok(n)).sort(near);
      if (same.length) return { floor: same[0], dir };
      // むこうむきの よびは いちばん とおい ところまで いってから おりかえす
      const opp = [...(dir > 0 ? st.down : st.up)].filter(n => ahead(n) && ok(n)).sort(near);
      if (opp.length) return { floor: opp[opp.length - 1], dir };
      return null;
    };
    // いまの かいの よび（とまっている とき）
    const h = requests(st).find(here);
    if (h !== undefined && ok(h)) {
      const d = st.car.has(h) ? st.dir : st.up.has(h) && (st.dir >= 0 || !st.down.has(h)) ? 1 : -1;
      return { floor: h, dir: d };
    }
    if (st.dir !== 0) return tryDir(st.dir) || tryDir(-st.dir);
    // とまっていたら いちばん ちかい ようじ
    const all = requests(st).filter(ok).sort((a, b) => Math.abs(alt(a) - pos) - Math.abs(alt(b) - pos));
    if (!all.length) return null;
    const n = all[0];
    return { floor: n, dir: alt(n) > pos ? 1 : -1 };
  }
  /* その かいに ついた: いきさきを けして、つぎの むきを きめて、その むきの よびを けす */
  function arrive(st, n, dir) {
    st.car.delete(n);
    const pos = alt(n);
    const ahead = d => requests(st).some(m => m !== n && (d > 0 ? alt(m) > pos : alt(m) < pos));
    let nd = dir;
    if (nd === 0 || !ahead(nd)) {
      // まえに ようじが なければ、ここの よびの むき → うしろに ようじが あれば はんたい → とまる
      if (st.up.has(n) && !st.down.has(n)) nd = 1;
      else if (st.down.has(n) && !st.up.has(n)) nd = -1;
      else if (nd !== 0 && ahead(-nd)) nd = -nd;
      else if (nd === 0) nd = ahead(1) ? 1 : ahead(-1) ? -1 : 0;
      else nd = 0;
    }
    if (nd > 0) st.up.delete(n);
    else if (nd < 0) st.down.delete(n);
    else { st.up.delete(n); st.down.delete(n); }
    st.dir = hasAny(st) ? nd : 0;
    return st.dir;
  }

  /* ---------- ドア ----------
   * phase: closed → opening → open → closing → closed
   */
  const DOOR = { MOVE: 1.0, HOLD: 3.0, LONG: 8.0 };
  function newDoor() { return { phase: 'closed', p: 0, hold: 0 }; }
  function doorOpen(d, long) {
    if (d.phase === 'open') { d.hold = Math.max(d.hold, long ? DOOR.LONG : DOOR.HOLD); return; }
    d.phase = 'opening'; d.hold = long ? DOOR.LONG : DOOR.HOLD;
  }
  function doorClose(d) { if (d.phase === 'open' || d.phase === 'opening') d.phase = 'closing'; }
  /* dt すすめる。かわった ときは あたらしい phase を かえす */
  function doorStep(d, dt) {
    const was = d.phase;
    if (d.phase === 'opening') { d.p = Math.min(1, d.p + dt / DOOR.MOVE); if (d.p >= 1) d.phase = 'open'; }
    else if (d.phase === 'open') { d.hold -= dt; if (d.hold <= 0) d.phase = 'closing'; }
    else if (d.phase === 'closing') { d.p = Math.max(0, d.p - dt / DOOR.MOVE); if (d.p <= 0) d.phase = 'closed'; }
    return d.phase !== was ? d.phase : null;
  }

  /* ---------- ぜんぶを まとめた エレベーター ----------
   * sim.tick(dt) で うごく。ev(name, data) で できごとを しらせる
   *   'depart' {floor, dir} / 'arrive' {floor, dir} / 'door' {phase} / 'pass' {floor}
   */
  function create(startFloor = 1, ev = () => {}) {
    const sim = {
      car: { h: alt(startFloor), v: 0, a: 1, vmax: 1, target: null },
      st: newState(), door: newDoor(), stop: null, at: startFloor, moving: false, lastFloor: startFloor,
      tick(dt) {
        const c = sim.car;
        const ph = doorStep(sim.door, dt);
        if (ph) ev('door', { phase: ph, floor: sim.at });
        if (sim.moving) {
          // とちゅうで もっと ちかい とまる かいが できたら そっちへ
          const nx = nextStop(sim.st, c.h, n => canStop(c, n));
          if (nx && nx.floor !== sim.stop.floor && alt(nx.floor) !== c.target &&
              Math.abs(alt(nx.floor) - c.h) < Math.abs(c.target - c.h)) {
            sim.stop = nx; c.target = alt(nx.floor);
          }
          const done = step(c, dt);
          const f = floorAt(c.h);
          if (f !== sim.lastFloor) { sim.lastFloor = f; ev('pass', { floor: f }); }
          if (done) {
            sim.moving = false; sim.at = sim.stop.floor; c.target = null;
            const nd = arrive(sim.st, sim.at, sim.stop.dir);
            sim.stop = null;
            doorOpen(sim.door);
            ev('arrive', { floor: sim.at, dir: nd });
          }
          return;
        }
        if (sim.door.phase !== 'closed') {
          // ドアが あいている ときに この かいの よびが きたら あけた まま
          if (sim.door.phase === 'open' || sim.door.phase === 'opening') {
            const nx = nextStop(sim.st, c.h);
            if (nx && nx.floor === sim.at) { arrive(sim.st, sim.at, nx.dir); doorOpen(sim.door); }
          }
          return;
        }
        const nx = nextStop(sim.st, c.h);
        if (!nx) { sim.st.dir = 0; return; }
        if (nx.floor === sim.at && Math.abs(alt(nx.floor) - c.h) < EPS) {
          const nd = arrive(sim.st, sim.at, nx.dir);
          doorOpen(sim.door);
          ev('arrive', { floor: sim.at, dir: nd, again: true });
          return;
        }
        const pr = profile(alt(nx.floor) - c.h);
        Object.assign(c, { a: pr.a, vmax: pr.vmax, target: alt(nx.floor) });
        sim.stop = nx; sim.st.dir = nx.dir; sim.moving = true; sim.at = null;
        ev('depart', { floor: nx.floor, dir: nx.dir });
      },
      /* いきさきボタン: もう いちど おすと とりけし。かえりち: true=とうろく / false=とりけし / null=むし */
      press(n) {
        if (!valid(n)) return null;
        if (sim.st.car.has(n)) {
          if (sim.moving && sim.stop && sim.stop.floor === n && !sim.st.up.has(n) && !sim.st.down.has(n)) {
            // いま むかっている かいを けしたら、つぎの ところを さがしなおす
            sim.st.car.delete(n);
            const nx = nextStop(sim.st, sim.car.h, m => canStop(sim.car, m));
            if (nx) { sim.stop = nx; sim.car.target = alt(nx.floor); }
            else { sim.st.car.add(n); return true; }  // ほかに いく ところが ない ときは けせない
            return false;
          }
          sim.st.car.delete(n); return false;
        }
        if (!sim.moving && sim.at === n) { doorOpen(sim.door); return null; }
        sim.st.car.add(n); return true;
      },
      call(n, dir) {
        if (!valid(n)) return false;
        if (dir > 0 && n === MAX) return false;
        if (dir < 0 && n === MIN) return false;
        (dir > 0 ? sim.st.up : sim.st.down).add(n);
        return true;
      },
      open(long) { if (!sim.moving) doorOpen(sim.door, long); },
      close() { doorClose(sim.door); },
      floorNow() { return floorAt(sim.car.h); },
      speed() { return sim.car.v; },
      busy() { return sim.moving || sim.door.phase !== 'closed' || hasAny(sim.st); },
    };
    return sim;
  }

  return { FLOOR_M, MIN, MAX, COUNT, valid, alt, floorAt, label, yomi, index, fromIndex, all,
    parseEntry, profile, step, canStop, newState, nextStop, arrive,
    DOOR, newDoor, doorOpen, doorClose, doorStep, create };
})();
if (typeof module !== 'undefined') module.exports = Lift;
