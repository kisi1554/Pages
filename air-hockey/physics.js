// エアホッケー — パック と マレット の ぶつり（がめんに かんけい しない じゅんすいな けいさん）
// node でも ブラウザ でも うごく（ブラウザでは window.AHPhys）。
//
// ざひょう: テーブルの はば W = 1、ながさ L = 1.7（たてながの テーブルを うえから みた ところ）。
//   x … ひだり → みぎ、y … うえ → した。
//   がわ 0（あお）… した に すわる。y = L の ゴールを まもり、y = 0 の ゴールを ねらう。
//   がわ 1（あか）… うえ に すわる。y = 0 の ゴールを まもる。
// こてい タイムステップ: 1ティック = 1/120 びょう を 8かいの サブステップ に わけ、
//   サブステップ ごとに れんぞく しょうとつ はんてい（いちばん はやく ぶつかる じかん まで すすめて はねかえす）。
(function (root) {
  "use strict";
  const W = 1, L = 1.7;
  const PR = 0.04;          // パックの はんけい
  const MR = 0.066;         // マレットの はんけい
  const GW = 0.36;          // ゴールの はば
  const TICK = 1 / 120, SUB = 8, H = TICK / SUB;
  const PUCK_MAX = 5.0;     // パックの さいこう そくど（W / びょう）
  const MALLET_MAX = 4.5;   // マレットの さいこう そくど（にんげん。CPU は つよさ ごとに ちいさく）
  const FRICTION = 0.25;    // まさつ（1びょう で やく 22% おそく なる）
  const E_WALL = 0.88, E_MALLET = 0.9, E_PUCK = 0.95;
  const ICE_MIN = 0.9;      // こおり の とき パックは これより おそく ならない
  const WALL_HALF = 0.014, WALL_A = 0.3, WALL_B = 0.7;   // まんなかの かべ（アイテム）
  const ITEM_R = 0.055;
  const FLOAT_Z = 0.085, FLOAT_A = 1.2, FLOAT_V = 0.45;
  const EPS = 1e-9;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // たねつき らんすう（mulberry32）
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function home(side) { return { x: W / 2, y: side === 0 ? L - 0.2 : 0.2 }; }
  function mallet(side) {
    const h = home(side);
    return { side, x: h.x, y: h.y, tx: h.x, ty: h.y, vx: 0, vy: 0, px: h.x, py: h.y, r: MR, maxV: MALLET_MAX };
  }
  function createWorld() {
    return {
      W, L, pucks: [], mallets: [mallet(0), mallet(1)], goalW: [GW, GW],
      wall: false, ice: false, item: null, events: [], nextId: 1, time: 0,
    };
  }
  function addPuck(w, x, y, vx, vy, extra) {
    const p = { id: w.nextId++, x, y, vx: vx || 0, vy: vy || 0, lastHit: -1, hitT: -1, wallT: -1, extra: !!extra };
    w.pucks.push(p);
    return p;
  }
  // サーブ: いれられた がわ の じんち に パックを おく
  function serveSpot(side) { return { x: W / 2, y: side === 0 ? L * 0.72 : L * 0.28 }; }

  // マレットが うごける はんい（じぶんの じんち だけ）
  function bounds(w, m) {
    const r = m.r, gap = w.wall ? WALL_HALF : 0;
    return m.side === 0
      ? { x0: r, x1: W - r, y0: L / 2 + r + gap, y1: L - r }
      : { x0: r, x1: W - r, y0: r, y1: L / 2 - r - gap };
  }
  function clampMallet(w, m) {
    const b = bounds(w, m);
    m.x = clamp(m.x, b.x0, b.x1); m.y = clamp(m.y, b.y0, b.y1);
  }
  // ゴールの くち（その x が ゴールの あな の なか か）
  function inMouth(w, x, side) { return Math.abs(x - W / 2) < w.goalW[side] / 2; }
  function posts(w) {
    const out = [];
    for (const side of [0, 1]) {
      const y = side === 0 ? L : 0, g = w.goalW[side] / 2;
      out.push({ x: W / 2 - g, y }, { x: W / 2 + g, y });
    }
    return out;
  }

  // うごく えん と とまった えん（はんけい R）が ぶつかる じかん（d = あいだ の ベクトル、v = あいて から みた はやさ）
  function circleToi(dx, dy, vx, vy, R) {
    const b = dx * vx + dy * vy;
    if (b >= 0) return Infinity;               // はなれて いく
    const c = dx * dx + dy * dy - R * R;
    if (c <= 0) return 0;                       // もう かさなって いて ちかづいて いる
    const a = vx * vx + vy * vy;
    const disc = b * b - a * c;
    if (disc < 0) return Infinity;
    return (-b - Math.sqrt(disc)) / a;
  }
  // まっすぐな せん（pos が line に とどく じかん。vel が せんに むかって いる ときだけ）
  function lineToi(pos, vel, line, dir) {
    if (vel * dir <= 0) return Infinity;
    const t = (line - pos) / vel;
    return t < 0 ? 0 : t;
  }

  function hitEvent(w, p, m, power) {
    p.lastHit = m.side;
    // おとや ぶるっ の ため。おしつけ つづける ときに まいかい ださない（0.05びょう に 1かい まで）
    if (power > 0.05 && w.time - p.hitT > 0.05) {
      p.hitT = w.time;
      const n = Math.hypot(p.x - m.x, p.y - m.y) || 1;
      w.events.push({
        type: "hit", side: m.side, puck: p.id, power,
        x: m.x + (p.x - m.x) / n * m.r, y: m.y + (p.y - m.y) / n * m.r, speed: Math.hypot(p.vx, p.vy),
      });
    }
  }
  function reflect(p, nx, ny, e) {
    const vn = p.vx * nx + p.vy * ny;
    if (vn < 0) { p.vx -= (1 + e) * vn * nx; p.vy -= (1 + e) * vn * ny; }
    return -vn;
  }
  function eWall(w) { return w.ice ? 1 : E_WALL; }
  // マレット に あたった ときの はねかえり（マレットの はやさ を つたえる）
  function malletBounce(w, p, m, mx, my) {
    let nx = p.x - mx, ny = p.y - my;
    const d = Math.hypot(nx, ny);
    if (d < EPS) { nx = 0; ny = m.side === 0 ? -1 : 1; } else { nx /= d; ny /= d; }
    const rvx = p.vx - m.vx, rvy = p.vy - m.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    p.vx -= (1 + E_MALLET) * vn * nx; p.vy -= (1 + E_MALLET) * vn * ny;
    const s = Math.hypot(p.vx, p.vy);
    if (s > PUCK_MAX) { p.vx *= PUCK_MAX / s; p.vy *= PUCK_MAX / s; }
    // さいこう そくど で けずっても マレット から はなれる むき には かならず うごく
    const after = (p.vx - m.vx) * nx + (p.vy - m.vy) * ny;
    if (after < 0.01) { p.vx += (0.01 - after) * nx; p.vy += (0.01 - after) * ny; }
    hitEvent(w, p, m, -vn);
  }

  // 1サブステップ ぶん パックを すすめる（れんぞく しょうとつ はんてい）
  function movePuck(w, p, h) {
    let t = 0;
    for (let it = 0; it < 8 && t < h; it++) {
      const rem = h - t;
      let best = rem, hit = null;
      const cand = (tt, kind, a, b) => { if (tt <= best) { best = tt; hit = { kind, a, b }; } };
      // よこの かべ
      cand(lineToi(p.x, p.vx, PR, -1), "wall", 1, 0);
      cand(lineToi(p.x, p.vx, W - PR, 1), "wall", -1, 0);
      // はしの かべ（ゴールの あな の ところ には かべが ない）
      let tt = lineToi(p.y, p.vy, PR, -1);
      if (tt <= best && !inMouth(w, p.x + p.vx * tt, 1)) cand(tt, "wall", 0, 1);
      tt = lineToi(p.y, p.vy, L - PR, 1);
      if (tt <= best && !inMouth(w, p.x + p.vx * tt, 0)) cand(tt, "wall", 0, -1);
      // ゴールの かど（ポスト）
      for (const q of posts(w)) cand(circleToi(p.x - q.x, p.y - q.y, p.vx, p.vy, PR), "post", q.x, q.y);
      // まんなかの かべ
      if (w.wall) {
        const yc = L / 2, R = WALL_HALF + PR;
        tt = lineToi(p.y, p.vy, yc - R, 1);
        if (tt <= best && p.y <= yc) { const ix = p.x + p.vx * tt; if (ix >= WALL_A && ix <= WALL_B) cand(tt, "wall", 0, -1); }
        tt = lineToi(p.y, p.vy, yc + R, -1);
        if (tt <= best && p.y >= yc) { const ix = p.x + p.vx * tt; if (ix >= WALL_A && ix <= WALL_B) cand(tt, "wall", 0, 1); }
        for (const ex of [WALL_A, WALL_B]) cand(circleToi(p.x - ex, p.y - yc, p.vx, p.vy, R), "post", ex, yc);
      }
      // マレット（サブステップ の なかで まっすぐ うごく。あいて から みた はやさ で しらべる）
      for (const m of w.mallets) {
        const mx = m.px + m.vx * t, my = m.py + m.vy * t;
        cand(circleToi(p.x - mx, p.y - my, p.vx - m.vx, p.vy - m.vy, PR + m.r), "mallet", m, null);
      }
      p.x += p.vx * best; p.y += p.vy * best; t += best;
      if (!hit) return;
      if (hit.kind === "wall") {
        const pw = reflect(p, hit.a, hit.b, eWall(w));
        if (pw > 0.05 && w.time - p.wallT > 0.04) { p.wallT = w.time; w.events.push({ type: "wall", x: p.x - hit.a * PR, y: p.y - hit.b * PR, power: pw }); }
      } else if (hit.kind === "post") {
        let nx = p.x - hit.a, ny = p.y - hit.b; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
        const pw = reflect(p, nx, ny, eWall(w));
        if (pw > 0.05 && w.time - p.wallT > 0.04) { p.wallT = w.time; w.events.push({ type: "post", x: hit.a, y: hit.b, power: pw }); }
      } else {
        const m = hit.a;
        malletBounce(w, p, m, m.px + m.vx * t, m.py + m.vy * t);
      }
    }
    // くりかえしの かぎり まで ぶつかり つづけた とき（かど に はさまった など）は のこりを すすめる。かさなりは あとで なおす
    if (t < h) { p.x += p.vx * (h - t); p.y += p.vy * (h - t); }
  }

  // かべ・ポスト・まんなかの かべ から はみでて いたら もどす（いち と はやさ）
  function confine(w, p) {
    const e = eWall(w);
    if (p.x < PR) { p.x = PR; if (p.vx < 0) p.vx = -p.vx * e; }
    if (p.x > W - PR) { p.x = W - PR; if (p.vx > 0) p.vx = -p.vx * e; }
    if (p.y < PR && !inMouth(w, p.x, 1)) { p.y = PR; if (p.vy < 0) p.vy = -p.vy * e; }
    if (p.y > L - PR && !inMouth(w, p.x, 0)) { p.y = L - PR; if (p.vy > 0) p.vy = -p.vy * e; }
    const pins = posts(w);
    if (w.wall) {
      const yc = L / 2, R = WALL_HALF + PR;
      if (p.x >= WALL_A && p.x <= WALL_B && Math.abs(p.y - yc) < R) {
        const s = p.y < yc ? -1 : 1;
        p.y = yc + s * R; if (p.vy * s < 0) p.vy = -p.vy * e;
      }
      pins.push({ x: WALL_A, y: yc, r: R }, { x: WALL_B, y: yc, r: R });
    }
    for (const q of pins) {
      const R = q.r || PR, dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
      if (d < R && d > EPS) { p.x = q.x + dx / d * R; p.y = q.y + dy / d * R; reflect(p, dx / d, dy / d, e); }
    }
  }

  // かさなり を なおす。パックを マレットから おしだし → かべの なか に もどす。
  // それでも かさなる（かべ と マレット に はさまれた）ときは マレット の ほう を さげる → パックは めりこまない
  function resolve(w) {
    for (let it = 0; it < 3; it++) {
      for (const p of w.pucks) {
        for (const m of w.mallets) {
          const R = PR + m.r; let dx = p.x - m.x, dy = p.y - m.y; const d = Math.hypot(dx, dy);
          if (d >= R) continue;
          if (d < EPS) { dx = 0; dy = m.side === 0 ? -1 : 1; } else { dx /= d; dy /= d; }
          p.x = m.x + dx * R; p.y = m.y + dy * R;
          malletBounce(w, p, m, m.x, m.y);
        }
        confine(w, p);
      }
    }
    for (const p of w.pucks) {
      for (const m of w.mallets) {
        const R = PR + m.r; let dx = p.x - m.x, dy = p.y - m.y; const d = Math.hypot(dx, dy);
        if (d >= R - 1e-7) continue;
        if (d < EPS) { dx = 0; dy = m.side === 0 ? -1 : 1; } else { dx /= d; dy /= d; }
        m.x = p.x - dx * R; m.y = p.y - dy * R;
        clampMallet(w, m);
        // はさまった: この ティックの あいだ マレットは とまる。パックの いきおい も へらす（エネルギーが ふえない ように）
        m.blocked = true; m.vx = 0; m.vy = 0;
        p.vx *= 0.5; p.vy *= 0.5;
      }
    }
  }
  function puckPuck(w) {
    const ps = w.pucks;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy);
      if (d >= 2 * PR) continue;
      if (d < EPS) { dx = 1; dy = 0; } else { dx /= d; dy /= d; }
      const push = (2 * PR - d) / 2;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
      const vn = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
      if (vn < 0) {
        const j2 = -(1 + E_PUCK) * vn / 2;
        a.vx -= j2 * dx; a.vy -= j2 * dy; b.vx += j2 * dx; b.vy += j2 * dy;
        if (-vn > 0.2) w.events.push({ type: "wall", x: a.x + dx * PR, y: a.y + dy * PR, power: -vn * 0.6 });
      }
      confine(w, a); confine(w, b);
    }
  }

  // 1ティック（1/120 びょう）すすめる。マレットは tx, ty に むかって さいこう そくど まで で うごく
  function tick(w) {
    for (const m of w.mallets) {
      clampMallet(w, m);
      const b = bounds(w, m);
      let dx = clamp(m.tx, b.x0, b.x1) - m.x, dy = clamp(m.ty, b.y0, b.y1) - m.y;
      const d = Math.hypot(dx, dy), md = m.maxV * TICK;
      if (d > md) { dx *= md / d; dy *= md / d; }
      m.vx = dx / TICK; m.vy = dy / TICK;
      m.blocked = false;
    }
    for (let s = 0; s < SUB; s++) {
      for (const m of w.mallets) { m.px = m.x; m.py = m.y; }
      for (const p of w.pucks) movePuck(w, p, H);
      for (const m of w.mallets) { m.x += m.vx * H; m.y += m.vy * H; }
      resolve(w);
      if (w.pucks.length > 1) puckPuck(w);
      for (let i = w.pucks.length - 1; i >= 0; i--) {
        const p = w.pucks[i];
        if (!w.ice) { const k = 1 - FRICTION * H; p.vx *= k; p.vy *= k; }
        let sp = Math.hypot(p.vx, p.vy);
        // くうき: はしの かべ ぎわ（ゴールの あな いがい）で とまりかけた パックは そっと うちがわへ うく（かどで うごけなく ならない）
        if (sp < FLOAT_V) {
          if (p.y < FLOAT_Z && !inMouth(w, p.x, 1)) p.vy += FLOAT_A * H;
          else if (p.y > L - FLOAT_Z && !inMouth(w, p.x, 0)) p.vy -= FLOAT_A * H;
        }
        if (sp > PUCK_MAX) { p.vx *= PUCK_MAX / sp; p.vy *= PUCK_MAX / sp; sp = PUCK_MAX; }
        if (w.ice && sp < ICE_MIN) {
          if (sp < 1e-6) { p.vx = 0; p.vy = p.y < L / 2 ? ICE_MIN : -ICE_MIN; }
          else { p.vx *= ICE_MIN / sp; p.vy *= ICE_MIN / sp; }
        }
        // ゴール: パックの まんなか が ゴールラインを こえたら
        if (p.y < 0 || p.y > L) {
          w.pucks.splice(i, 1);
          w.events.push({ type: "goal", scorer: p.y < 0 ? 0 : 1, x: p.x, puck: p.id, lastHit: p.lastHit });
          continue;
        }
        if (w.item && Math.hypot(p.x - w.item.x, p.y - w.item.y) < PR + ITEM_R) {
          w.events.push({ type: "item", kind: w.item.kind, by: p.lastHit, puck: p.id, x: w.item.x, y: w.item.y });
          w.item = null;
        }
      }
      w.time += H;
    }
  }
  // かわる フレームの ながさ を こてい ティック に わける（120Hz でも 60Hz でも おなじ はやさ）
  function advance(w, acc, dt, onTick) {
    acc += dt;
    let n = 0;
    while (acc >= TICK - 1e-9 && n < 60) { (onTick || tick)(w); acc -= TICK; n++; }
    if (n >= 60) acc = 0;
    return acc;
  }

  // ===== アイテムの こうか =====
  function setWall(w, on) {
    w.wall = on;
    if (on) for (const p of w.pucks) confine(w, p);
    for (const m of w.mallets) clampMallet(w, m);
  }
  function setMalletR(w, side, r) { const m = w.mallets[side]; m.r = r; clampMallet(w, m); resolve(w); }
  function splitPuck(w, p) {
    const out = [];
    const sp = Math.max(1.2, Math.hypot(p.vx, p.vy));
    const a0 = Math.atan2(p.vy, p.vx);
    for (const da of [-0.5, 0.5]) {
      const a = a0 + da;
      out.push(addPuck(w, p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, true));
    }
    puckPuck(w);
    return out;
  }

  const api = {
    W, L, PR, MR, GW, TICK, SUB, H, PUCK_MAX, MALLET_MAX, FRICTION, E_WALL, E_MALLET, ICE_MIN,
    WALL_HALF, WALL_A, WALL_B, ITEM_R,
    clamp, rng, home, createWorld, addPuck, serveSpot, bounds, clampMallet, inMouth, posts,
    circleToi, tick, advance, resolve, setWall, setMalletR, splitPuck,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AHPhys = api;
})(this);
