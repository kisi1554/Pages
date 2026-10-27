// エアホッケー — CPU（4だんかい）
// なかでは「じぶんの ゴールが y = 0、あいての ゴールが y = L」の むきで かんがえる（がわ 0 の ときは うらがえす）。
(function (root) {
  "use strict";
  const P = (typeof module !== "undefined" && module.exports) ? require("./physics.js") : root.AHPhys;
  const { W, L, PR } = P;

  // speed … マレットの さいこう そくど、react … パックを みなおす かんかく（びょう）、err … ねらいの ぶれ
  // attack … 0: まもる だけ（とまった パックを おす くらい）、1: まっすぐ うつ、2: かくど を つけて うつ（かべ あて も）
  const LEVELS = [
    { name: "よわい", em: "🐣", speed: 1.5, react: 0.32, err: 0.10, attack: 0, defY: 0.13, predict: false },
    { name: "ふつう", em: "🐥", speed: 2.5, react: 0.18, err: 0.06, attack: 1, defY: 0.16, predict: false },
    { name: "つよい", em: "🦅", speed: 3.4, react: 0.09, err: 0.035, attack: 2, defY: 0.17, predict: true },
    { name: "めっちゃ つよい", em: "🐉", speed: 4.3, react: 0.04, err: 0.015, attack: 2, defY: 0.18, predict: true },
  ];

  // かべで はねかえる ことを かんがえて、y = line に きたときの x
  function predictX(p, line) {
    if (p.vy >= -1e-6) return p.x;
    const t = (p.y - line) / -p.vy;
    let x = p.x + p.vx * t;
    const a = PR, span = W - 2 * PR;
    x -= a;
    x = ((x % (2 * span)) + 2 * span) % (2 * span);
    if (x > span) x = 2 * span - x;
    return x + a;
  }

  function choosePuck(pucks) {
    let best = null, bs = Infinity;
    for (const p of pucks) {
      // じぶんの ゴールに ちかい・ちかづいて くる パック ほど きけん
      const s = p.y - Math.min(0, p.vy) * 0.35;
      if (s < bs) { bs = s; best = p; }
    }
    return best;
  }

  // ねらう ところ（あいての ゴール、または よこの かべ に あてて はいる 「かがみの ゴール」）
  // その ほうこう に うつ とき、マレットが パックの うしろ に はいれる か
  function canReach(A, p, R, mr) {
    let dx = A.x - p.x, dy = A.y - p.y; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    const bx = p.x - dx * (R + 0.02), by = p.y - dy * (R + 0.02);
    return bx >= mr - 0.005 && bx <= W - mr + 0.005 && by >= mr - 0.005 && by <= L / 2 - mr;
  }
  function chooseAim(lv, p, opp, rng, goalW, R, mr) {
    const gx = W / 2;
    if (lv.attack < 2) {
      const a = { x: gx + (rng() - 0.5) * goalW * 0.5, y: L + 0.1 };
      if (canReach(a, p, R, mr)) return a;
      const b = [{ x: -gx, y: L }, { x: 2 * W - gx, y: L }].filter((o) => canReach(o, p, R, mr));
      return b.length ? b[Math.floor(rng() * b.length)] : null;
    }
    const opts = [
      { x: gx, y: L + 0.1 }, { x: gx - goalW * 0.3, y: L + 0.05 }, { x: gx + goalW * 0.3, y: L + 0.05 },
      { x: -gx, y: L + 0.05 }, { x: 2 * W - gx, y: L + 0.05 },   // かべ あて
    ];
    let best = null, bs = -Infinity;
    for (const o of opts) {
      if (!canReach(o, p, R, mr)) continue;
      // あいての マレット から いちばん はなれた コース（すこし でたらめ も まぜる）
      const dx = o.x - p.x, dy = o.y - p.y, n = Math.hypot(dx, dy);
      const ox = opp.x - p.x, oy = opp.y - p.y;
      const along = (ox * dx + oy * dy) / n;
      const off = Math.abs(ox * dy - oy * dx) / n;
      const s = (along > 0 ? off : 0.5) + rng() * 0.12 - (o.x < 0 || o.x > W ? 0.05 : 0);
      if (s > bs) { bs = s; best = o; }
    }
    return best;
  }

  // CPU マレットの いきさき（ほんとうの ざひょう）を かえす
  function target(w, side, level, mem, dt, rng) {
    const lv = LEVELS[level] || LEVELS[1];
    const flip = side === 0;
    const fy = (y) => flip ? L - y : y;
    const m = w.mallets[side], o = w.mallets[1 - side];
    const me = { x: m.x, y: fy(m.y) }, opp = { x: o.x, y: fy(o.y) };
    const R = PR + m.r;
    const out = (x, y) => ({ x, y: fy(y) });

    // みえかた: react びょう ごとに みなおす。あいだは まっすぐ すすむと おもう
    mem.t = (mem.t || 0) - dt;
    if (mem.t <= 0 || !mem.seen || mem.seen.length !== w.pucks.length) {
      mem.t = lv.react;
      mem.seen = w.pucks.map((p) => ({ x: p.x, y: fy(p.y), vx: p.vx, vy: flip ? -p.vy : p.vy }));
      mem.noise = (rng() - 0.5) * 2 * lv.err;
    } else {
      for (const s of mem.seen) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < PR) { s.x = 2 * PR - s.x; s.vx = -s.vx; }
        if (s.x > W - PR) { s.x = 2 * (W - PR) - s.x; s.vx = -s.vx; }
      }
    }
    const p = choosePuck(mem.seen);
    const defend = (x) => out(P.clamp(x + mem.noise, W / 2 - 0.3, W / 2 + 0.3), lv.defY);
    if (!p) { mem.mode = "def"; return defend(W / 2); }

    const sp = Math.hypot(p.vx, p.vy);
    let defX = W / 2 + (p.x - W / 2) * 0.55;
    if (lv.predict && p.vy < -0.3) defX = predictX(p, lv.defY);

    // つづけて うつ（とちゅう で やめない）
    if (mem.strikeT > 0) {
      mem.strikeT -= dt;
      return out(mem.sx, mem.sy);
    }
    const inOwn = p.y < L / 2 - 0.01;
    if (!inOwn) { mem.mode = "def"; mem.slow = 0; return defend(defX); }

    // うつ か まもる か
    mem.slow = sp < 0.35 ? (mem.slow || 0) + dt : 0;
    let attack;
    if (lv.attack === 0) attack = mem.slow > 0.8 || mem.mode === "att";
    else attack = p.vy > -1.6 || sp < 0.6;
    if (!attack) { mem.mode = "def"; return defend(defX); }

    if (mem.mode !== "att" || !mem.aim || !canReach(mem.aim, p, R, m.r)) {
      mem.aim = chooseAim(lv, p, opp, rng, w.goalW[1 - side], R, m.r);
      if (!mem.aim) {
        // かべぎわ で うしろ に はいれない → おしつけず に すこし はなれて まつ（パックは くうき で うちがわ に でて くる）
        mem.mode = "wait";
        let hx = W / 2 - p.x, hy = L / 2 - p.y; const hn = Math.hypot(hx, hy) || 1;
        return out(p.x + hx / hn * (R + 0.1), Math.max(p.y + 0.02, p.y + hy / hn * (R + 0.1)));
      }
      if (mem.mode !== "att") mem.attT = 0;
      mem.mode = "att";
    }
    mem.attT += dt;
    if (mem.attT > 2.5) { mem.mode = "def"; mem.attT = 0; return defend(defX); }   // うまく いかない ときは いったん さがる
    // すこし さき の パック の いち を ねらう
    const look = lv.attack === 0 ? 0 : Math.min(0.12, Math.hypot(p.x - me.x, p.y - me.y) / lv.speed);
    const px = P.clamp(p.x + p.vx * look, PR, W - PR), py = P.clamp(p.y + p.vy * look, PR, L / 2);
    const A = mem.aim;
    let dx = A.x - px, dy = A.y - py; const dn = Math.hypot(dx, dy); dx /= dn; dy /= dn;
    const rel = (me.x - px) * dx + (me.y - py) * dy;
    if (rel > -R * 0.35) {
      // マレットが パックの まえ に いる → よこ から まわりこむ（じぶんの ゴールに おしこまない）
      const qx = dy, qy = -dx;
      const s = ((me.x - px) * qx + (me.y - py) * qy) >= 0 ? 1 : -1;
      return out(px - dx * (R + 0.06) + qx * s * (R + 0.05), py - dy * (R + 0.06) + qy * s * (R + 0.05));
    }
    const bx = px - dx * (R + 0.02), by = py - dy * (R + 0.02);
    const tol = lv.attack === 0 ? 0.05 : 0.035;
    if (Math.hypot(me.x - bx, me.y - by) > tol) return out(bx, by);
    // うつ！ パックの むこう まで つきぬける
    const reach = lv.attack === 0 ? 0.12 : lv.attack === 1 ? 0.28 : 0.36;
    mem.strikeT = lv.attack === 0 ? 0.2 : 0.16;
    mem.sx = px + dx * reach; mem.sy = py + dy * reach;
    mem.mode = "def";
    return out(mem.sx, mem.sy);
  }

  const api = { LEVELS, target, predictX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AHAI = api;
})(this);
