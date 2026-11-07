/* かみひこうき グライダー — とぶ しくみ（DOM なし。node でも ブラウザ でも うごく）
 *
 * たんい: メートル・びょう。x は まえ（みぎ）、y は たかさ（うえ が +）。
 * かんたん な グライダー の けいさん:
 *   くうき に たいする はやさ V（かぜ を ひいた はやさ）から
 *     うく ちから   L = K × V² × CL            … すすむ むき に たいして 90ど うえ
 *     くうき の ていこう D = K × V² × (CD0 + k × CL²) … すすむ むき と はんたい
 *   それに じゅうりょく g が くわわる。あめ の なか は おもさ が ふえる（L と D が きかなく なる）。
 *   CL は はな の あげぐあい。がめん を おさえる と CL が おおきく（はな が うえ）、はなす と もとに もどる。
 *   はやさ が vStall より おそく なる と ストール（くるっ と まわって、はな を さげて たてなおす）。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Flight = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const G = 9.8;
  const DAMP = 0.9;

  /* ひこうき ごと の けいすう */
  const PLANES = {
    heso: {
      id: "heso", name: "へそ ひこうき", emoji: "🪁", short: "ふわっと ながく",
      K: 0.31, cd0: 0.034, k: 0.12, clTrim: 0.72, clHold: 1.12, clMax: 1.25,
      vStall: 4.1, thermal: 1.0, size: 1.0,
    },
    yari: {
      id: "yari", name: "やり ひこうき", emoji: "🎯", short: "はやく まっすぐ",
      K: 0.18, cd0: 0.019, k: 0.19, clTrim: 0.46, clHold: 0.82, clMax: 0.95,
      vStall: 5.0, thermal: 0.8, size: 1.1,
    },
    tsubasa: {
      id: "tsubasa", name: "つばさ ひろ ひこうき", emoji: "🦅", short: "のぼる かぜ に つよい",
      K: 0.4, cd0: 0.042, k: 0.1, clTrim: 0.7, clHold: 1.1, clMax: 1.25,
      vStall: 3.7, thermal: 1.35, size: 1.05,
    },
  };
  const PLANE_IDS = ["heso", "yari", "tsubasa"];

  /* なげる ばしょ: こうえん の おか の うえ の てんぼうだい */
  const START = { x: 0, y: 27.5 };
  const HILL = 24, HILL_END = 60;

  /* けしき（x で きまる） */
  const ZONES = [
    { id: "park", name: "こうえん", emoji: "🌳", from: 0 },
    { id: "river", name: "かわ", emoji: "🌊", from: 260 },
    { id: "town", name: "まち", emoji: "🏙️", from: 520 },
    { id: "sea", name: "うみ", emoji: "🐳", from: 880 },
    { id: "cloud", name: "くも の うえ", emoji: "☁️", from: 1320 },
  ];
  const RIVER = [320, 450];
  const BEACH = 900;

  function zoneAt(x) {
    let z = ZONES[0];
    for (const q of ZONES) if (x >= q.from) z = q;
    return z;
  }
  function zoneIndex(x) { return ZONES.indexOf(zoneAt(x)); }

  /* じめん の たかさ（ビル は べつ） */
  function terrain(x) {
    if (x <= 0) return HILL;
    if (x < HILL_END) return HILL * (1 + Math.cos(Math.PI * x / HILL_END)) / 2;
    return 0;
  }
  /* じめん の しゅるい */
  function surfaceAt(x) {
    if (x < RIVER[0]) return "grass";
    if (x < RIVER[1]) return "water";
    if (x < ZONES[2].from) return "grass";
    if (x < BEACH) return "road";
    if (x < BEACH + 30) return "sand";
    if (x < ZONES[4].from) return "sea";
    return "cloud";
  }

  /* ---------- シード つき の らんすう ---------- */
  function hash(str) {
    let h = 2166136261 >>> 0;
    str = String(str);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* きょう の そら: ひづけ から シード */
  function dailySeed(date) {
    const d = date || new Date();
    const s = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    return { seed: hash("sora:" + s), label: (d.getMonth() + 1) + "がつ" + d.getDate() + "にち" };
  }

  /* ---------- そら（かぜ の しかけ）を つくる ---------- */
  const CHUNK = 100;
  function makeWorld(seed, opt) {
    opt = opt || {};
    return { seed: seed >>> 0, calm: !!opt.calm, chunks: new Map() };
  }

  function genChunk(world, i) {
    const r = rng(hash(world.seed + ":" + i));
    const x0 = i * CHUNK;
    const z = zoneAt(x0 + CHUNK / 2).id;
    const f = [];
    if (world.calm || i < 0) return f;
    const add = (o) => { o.id = i * 100 + f.length; f.push(o); };

    /* 🌀 のぼる かぜ（ちょうちょ が まう） */
    const pTh = z === "sea" ? 0.45 : z === "cloud" ? 0.8 : 0.7;
    const nTh = r() < pTh ? (r() < 0.3 ? 2 : 1) : 0;
    for (let k = 0; k < nTh; k++) {
      add({ type: "thermal", x: x0 + 15 + r() * 70, w: 16 + r() * 14, s: 1.9 + r() * 1.6, top: 70 + r() * 70 });
    }
    /* 🌬️ むかいかぜ／おいかぜ */
    if (i >= 1 && r() < 0.32) {
      const len = 40 + r() * 60;
      const head = r() < 0.5;
      const xs = x0 + r() * (CHUNK - 20);
      add({ type: "wind", x0: xs, x1: xs + len, wx: (head ? -1 : 1) * (2 + r() * 2.5) });
    }
    /* 🐦 とり の むれ */
    if (i >= 1 && r() < (z === "sea" ? 0.35 : 0.22)) {
      add({ type: "birds", x: x0 + 20 + r() * 60, y: 10 + r() * 30, n: 3 + Math.floor(r() * 3) });
    }
    /* 🎈 ふうせん */
    if (r() < 0.6) {
      const n = 1 + Math.floor(r() * 3);
      const bx = x0 + 10 + r() * 70, by = 5 + r() * 30;
      for (let k = 0; k < n; k++) add({ type: "balloon", x: bx + k * 6, y: by + (k % 2) * 3, hue: Math.floor(r() * 5) });
    }
    /* ☔ あめ */
    if (i >= 2 && z !== "cloud" && r() < 0.14) {
      const xs = x0 + r() * 40;
      add({ type: "rain", x0: xs, x1: xs + 45 + r() * 45, top: 45 + r() * 25 });
    }
    /* 🏢 ビル（まち だけ）。まえ に のぼる ビルかぜ */
    if (z === "town") {
      let bx = x0 + 10 + r() * 20;
      while (bx < x0 + CHUNK - 18) {
        const w = 14 + r() * 10, h = 10 + r() * 22;
        if (bx + w > ZONES[3].from - 10) break;
        add({ type: "bldg", x0: bx, x1: bx + w, h, color: Math.floor(r() * 4) });
        bx += w + 25 + r() * 35;
      }
    }
    return f;
  }

  function chunk(world, i) {
    let c = world.chunks.get(i);
    if (!c) { c = genChunk(world, i); world.chunks.set(i, c); }
    return c;
  }
  /* x0〜x1 に ある しかけ */
  function featuresIn(world, x0, x1) {
    const out = [];
    const a = Math.floor((x0 - 120) / CHUNK), b = Math.floor((x1 + 120) / CHUNK);
    for (let i = Math.max(0, a); i <= b; i++) for (const o of chunk(world, i)) out.push(o);
    return out;
  }

  /* とり の むれ の いま の ばしょ（すこし いったり きたり） */
  function birdPos(o, t) {
    return { x: o.x + Math.sin(t * 0.35 + o.id) * 10, y: o.y + Math.sin(t * 0.9 + o.id * 2) * 2 };
  }

  /* その ばしょ の かぜ: wx（よこ）wy（たて）、weight（おもさ）、おまけ に いま いる しかけ */
  function windAt(world, x, y, t) {
    let wx = 0, wy = 0, weight = 1, thermal = 0;
    const here = [];
    for (const o of featuresIn(world, x - 1, x + 1)) {
      if (o.type === "thermal") {
        const d = Math.abs(x - o.x) / (o.w / 2);
        if (d < 1 && y < o.top) {
          const fade = Math.min(1, (o.top - y) / 25);
          const v = o.s * Math.cos(d * Math.PI / 2) ** 2 * fade;
          wy += v; thermal += v;
          here.push(o);
        }
      } else if (o.type === "wind") {
        if (x >= o.x0 && x <= o.x1) {
          const e = Math.min(1, (x - o.x0) / 8, (o.x1 - x) / 8);
          wx += o.wx * e; here.push(o);
        }
      } else if (o.type === "rain") {
        if (x >= o.x0 && x <= o.x1 && y < o.top) { weight = Math.max(weight, 1.3); here.push(o); }
      } else if (o.type === "bldg") {
        /* ビル の まえ（ひだり）で かぜ が かべ に あたって のぼる。やね の うえ も すこし */
        const front = o.x0 - 16;
        if (x > front && x < o.x0 && y < o.h + 12) {
          const e = (x - front) / 16;
          wy += 2.2 * e * Math.min(1, (o.h + 12 - y) / 8); here.push(o);
        } else if (x >= o.x0 && x <= o.x1 && y < o.h + 10) {
          wy += 0.8; here.push(o);
        }
      }
    }
    return { wx, wy, weight, thermal, here };
  }

  /* じめん（ビル の やね も ふくむ）の たかさ */
  function groundAt(world, x) {
    let g = terrain(x);
    for (const o of featuresIn(world, x - 1, x + 1)) if (o.type === "bldg" && x >= o.x0 && x <= o.x1) g = Math.max(g, o.h);
    return g;
  }

  /* ---------- なげる ---------- */
  function throwPlane(planeId, angleDeg, speed, opt) {
    opt = opt || {};
    const p = PLANES[planeId] || PLANES.heso;
    const a = Math.max(-10, Math.min(75, angleDeg)) * Math.PI / 180;
    const v = Math.max(4, Math.min(20, speed));
    return {
      plane: p.id, x: opt.x != null ? opt.x : START.x, y: opt.y != null ? opt.y : START.y,
      vx: v * Math.cos(a), vy: v * Math.sin(a),
      cl: p.clTrim, hold: false, t: 0,
      stalled: false, slowT: 0, stallT: 0, stalls: 0,
      birdT: 0, balloons: 0, used: {}, seen: {},
      landed: false, landT: 0, surface: null, maxY: opt.y != null ? opt.y : START.y,
      airspeed: v, wx: 0, wy: 0, weight: 1,
    };
  }

  /* 1こま すすめる。おきた こと（イベント）を かえす */
  function step(s, dt, world) {
    const ev = [];
    if (s.landed) {
      /* ちゃくち した あと は すべって とまる */
      s.landT += dt;
      const sp = Math.max(0, Math.abs(s.vx) - 9 * dt);
      s.vx = Math.sign(s.vx) * sp; s.vy = 0;
      s.x += s.vx * dt;
      return ev;
    }
    const p = PLANES[s.plane];
    s.t += dt;
    const w = windAt(world, s.x, s.y, s.t);
    let wx = w.wx;
    /* のぼる かぜ は ひこうき ごと に ききかた が ちがう（つばさ が ひろい ほど よく うく） */
    let vyWind = w.wy + w.thermal * (p.thermal - 1);

    /* はじめて はいった しかけ */
    for (const o of w.here) if (!s.seen[o.id]) { s.seen[o.id] = 1; ev.push({ type: "enter", f: o }); }

    /* 🐦 とり と いっしょ に とぶ と おいかぜ */
    for (const o of featuresIn(world, s.x - 30, s.x + 30)) {
      if (o.type === "birds" && !s.used[o.id]) {
        const b = birdPos(o, s.t);
        if (Math.abs(s.x - b.x) < 9 && Math.abs(s.y - b.y) < 7) {
          s.used[o.id] = 1; s.birdT = 6; s.birdF = o; ev.push({ type: "bird", f: o });
        }
      } else if (o.type === "balloon" && !s.used[o.id]) {
        if (Math.hypot(s.x - o.x, s.y - o.y) < 3.2) {
          s.used[o.id] = 1; s.balloons++; s.vy += 2.2; ev.push({ type: "balloon", f: o });
        }
      }
    }
    if (s.birdT > 0) { s.birdT -= dt; wx += 3; vyWind += 0.4; }

    s.wx = wx; s.wy = vyWind; s.weight = w.weight;

    /* はな の あげぐあい（CL）は ゆっくり かわる */
    /* かみひこうき は しぜん に あたま を さげる（のぼりすぎる と CL が へる＝ゆれ が おさまる） */
    const gam = Math.atan2(s.vy - vyWind, Math.max(0.3, s.vx - wx));
    let target = (s.hold ? p.clHold : p.clTrim) - DAMP * Math.sin(gam) * (s.hold ? 0.5 : 1);
    if (s.stalled) target = p.clTrim * 0.25;
    target = Math.max(0.05, target);
    const rate = 1.6 * dt;
    s.cl += Math.max(-rate, Math.min(rate, target - s.cl));
    s.cl = Math.min(p.clMax, s.cl);

    /* くうき に たいする はやさ */
    const rx = s.vx - wx, ry = s.vy - vyWind;
    const V = Math.hypot(rx, ry) || 1e-6;
    s.airspeed = V;
    let ax = 0, ay = -G;
    const q = p.K * V * V / w.weight;
    if (!s.tumble && (rx > 0 || ry < 0)) {
      const lift = q * s.cl;
      ax += lift * (-ry / V); ay += lift * (rx / V);
      const drag = q * (p.cd0 + p.k * s.cl * s.cl) * (s.stalled ? 2.2 : 1);
      ax -= drag * rx / V; ay -= drag * ry / V;
      /* ストール ちゅう は はな が さがって まえ へ すべりだす */
      if (s.stalled) ax += 2.5;
    } else {
      /* うしろむき（ビル に はねかえった とき）: ひらひら おちる */
      const drag = q * 0.9;
      ax -= drag * rx / V; ay -= drag * ry / V;
    }
    s.vx += ax * dt; s.vy += ay * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.maxY = Math.max(s.maxY, s.y);

    /* ストール: おそく なりすぎ */
    if (!s.stalled) {
      if (V < p.vStall) s.slowT += dt; else s.slowT = 0;
      if (s.slowT > 0.25) { s.stalled = true; s.stallT = 0; s.stalls++; s.slowT = 0; ev.push({ type: "stall" }); }
    } else {
      s.stallT += dt;
      if (s.stallT > 0.7 && V > p.vStall * 1.3) { s.stalled = false; ev.push({ type: "recover" }); }
    }

    /* 🏢 ビル の かべ: こわれない。ぽよん と はねかえる */
    for (const o of featuresIn(world, s.x - 2, s.x + 2)) {
      if (o.type !== "bldg") continue;
      if (s.x > o.x0 && s.x < o.x0 + 2.5 && s.y < o.h - 0.4 && s.vx > 0) {
        s.x = o.x0 - 0.05; s.vx = -Math.abs(s.vx) * 0.25; s.vy = Math.min(s.vy, 0); s.tumble = true;
        ev.push({ type: "bonk", f: o });
      }
    }

    /* ちゃくち */
    const g = groundAt(world, s.x);
    if (s.y <= g) {
      s.y = g; s.landed = true; s.landT = 0;
      s.surface = g > terrain(s.x) + 0.1 ? "roof" : (s.x < HILL_END && terrain(s.x) > 0.5 ? "hill" : surfaceAt(s.x));
      s.vx = Math.max(-2, Math.min(4, s.vx * 0.35));
      ev.push({ type: "land", surface: s.surface });
    }
    return ev;
  }

  /* はな の むき（え を かく ため。ラジアン、うえ が +） */
  function attitude(s) {
    const p = PLANES[s.plane];
    const path = Math.atan2(s.vy, Math.max(0.3, Math.abs(s.vx)));
    return path + (s.cl - p.clTrim) * 0.5;
  }

  /* きょり（メートル、なげた ところ から） */
  function distance(s) { return Math.max(0, Math.round(s.x - START.x)); }
  function distanceText(m) { return Math.max(0, Math.round(m)) + "メートル"; }

  /* なにも しないで とばしきる（テスト・バランス ちょうせい よう） */
  function simulate(planeId, angleDeg, speed, world, opt) {
    opt = opt || {};
    const s = throwPlane(planeId, angleDeg, speed, opt);
    const dt = 1 / 60, max = (opt.maxT || 600) / dt;
    const log = [];
    for (let i = 0; i < max && !s.landed; i++) {
      if (opt.control) s.hold = !!opt.control(s);
      for (const e of step(s, dt, world)) log.push(e.type);
    }
    return { s, log, dist: distance(s) };
  }

  /* ゆび の スワイプ → なげる かくど と つよさ */
  function swipeToThrow(dx, dy, ms, minDim) {
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI;
    const vel = len / Math.max(60, ms || 200) * 1000; // px/びょう
    const byLen = Math.min(1, len / (minDim * 0.45));
    const byVel = Math.min(1.25, Math.max(0.55, vel / 1400));
    const speed = 5 + 13 * byLen * byVel;
    return { angle: Math.max(-10, Math.min(75, ang)), speed: Math.max(5, Math.min(19, speed)) };
  }

  return {
    G, PLANES, PLANE_IDS, START, ZONES, RIVER, BEACH, HILL_END, CHUNK,
    zoneAt, zoneIndex, terrain, surfaceAt, groundAt, hash, rng, dailySeed,
    makeWorld, featuresIn, windAt, birdPos, throwPlane, step, attitude,
    distance, distanceText, simulate, swipeToThrow,
  };
});
