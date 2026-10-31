/* つくぼうの せみ がっしょう ｜ ルールの けいさん（DOM なし。node でも ブラウザでも うごく）
 *
 *  ばめん: よこ 6 × たて 12。b[y][x]（y=0 が いちばん うえ）。
 *  あたい: 0=から / 1〜5=セミ（chara.js の id）/ 9=ぬけがら
 *  くみ（pair）: { x, y, rot, a, b } … a が じく（pivot）、b が こども。
 *    rot 0=こどもが うえ / 1=みぎ / 2=した / 3=ひだり
 */
(function (root) {
  "use strict";

  const W = 6, H = 12;
  const EMPTY = 0, GARBAGE = 9;
  const T = 1, M = 2, A = 3, K = 4, HG = 5; // つくぼう・みんみん・あぶら・くまっち・かなかな
  const SPAWN_X = 2;          // えだの つけね（うえの まんなか）
  const OFF = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const CHAIN_MULT = [1, 2, 4, 8, 16];

  /* ---------- シードつき 乱数（テストで 固定できる） ---------- */
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (n) => Math.floor(r() * n);
    return r;
  }

  /* ---------- ばめん ---------- */
  function make() {
    const b = [];
    for (let y = 0; y < H; y++) b.push(new Array(W).fill(EMPTY));
    return b;
  }
  function clone(b) { return b.map((r) => r.slice()); }
  // かべ・そこ は -1。うえの そとがわ（y<0）は から あつかい
  function get(b, x, y) {
    if (x < 0 || x >= W || y >= H) return -1;
    if (y < 0) return EMPTY;
    return b[y][x];
  }
  const isSemi = (v) => v >= 1 && v <= 5;

  // もじれつ（うえ→した）から ばめんを つくる。たりない ぶんは うえを から に する
  // T M A K H=かなかな G=ぬけがら .=から
  const CH = { ".": EMPTY, T: T, M: M, A: A, K: K, H: HG, G: GARBAGE };
  function fromRows(rows) {
    const b = make();
    const off = H - rows.length;
    rows.forEach((row, i) => {
      for (let x = 0; x < W; x++) b[off + i][x] = CH[row[x]] || EMPTY;
    });
    return b;
  }
  function toRows(b) {
    const inv = {};
    Object.keys(CH).forEach((k) => { inv[CH[k]] = k; });
    return b.map((r) => r.map((v) => inv[v] || "?").join(""));
  }
  function count(b) {
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b[y][x]) n++;
    return n;
  }

  /* ---------- くみ ---------- */
  function cells(p) {
    const o = OFF[p.rot];
    return [{ x: p.x, y: p.y, c: p.a }, { x: p.x + o[0], y: p.y + o[1], c: p.b }];
  }
  function fits(b, p) { return cells(p).every((c) => get(b, c.x, c.y) === EMPTY); }
  // でてくる ところ: じくが 2だんめ、こどもが いちばん うえ（ふたりとも 見える）
  function spawn(a, bb) { return { x: SPAWN_X, y: 1, rot: 0, a: a, b: bb }; }
  function shift(b, p, dx, dy) {
    const q = { x: p.x + dx, y: p.y + (dy || 0), rot: p.rot, a: p.a, b: p.b };
    return fits(b, q) ? q : null;
  }
  // まわす。かべや セミに ぶつかったら 1マス ずらす。せまい たての みぞでは うえ・したを いれかえる
  function rotate(b, p, dir) {
    const rot = (p.rot + (dir || 1) + 4) % 4;
    const q = { x: p.x, y: p.y, rot: rot, a: p.a, b: p.b };
    if (fits(b, q)) return q;
    const o = OFF[rot];
    const kicks = [[-o[0], -o[1]]];
    if (o[0] !== 0) kicks.push([0, -1]);
    for (const k of kicks) {
      const r = { x: q.x + k[0], y: q.y + k[1], rot: rot, a: p.a, b: p.b };
      if (fits(b, r)) return r;
    }
    // 1はばの みぞ: 180ど まわして おなじ 2マスに いれかえる
    const po = OFF[p.rot];
    const f = { x: p.x + po[0], y: p.y + po[1], rot: (p.rot + 2) % 4, a: p.a, b: p.b };
    return fits(b, f) ? f : null;
  }
  function hardDrop(b, p) {
    let q = p, n;
    while ((n = shift(b, q, 0, 1))) q = n;
    return q;
  }
  // ばめんに おく（うえの そとに はみだした ぶんは きえる）→ ささえの ない セミを おとす
  function lock(b, p) {
    for (const c of cells(p)) if (c.y >= 0 && c.y < H) b[c.y][c.x] = c.c;
    return gravity(b);
  }
  // まっすぐ したへ おとす。うごいた ものを かえす [{x, from, to, c}]
  function gravity(b) {
    const moves = [];
    for (let x = 0; x < W; x++) {
      let w = H - 1;
      for (let y = H - 1; y >= 0; y--) {
        const v = b[y][x];
        if (!v) continue;
        if (w !== y) {
          b[w][x] = v; b[y][x] = EMPTY;
          moves.push({ x: x, from: y, to: w, c: v });
        }
        w--;
      }
    }
    return moves;
  }

  /* ---------- つながり ---------- */
  function groups(b, min) {
    const seen = make().map((r) => r.map(() => false));
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = b[y][x];
      if (!isSemi(c) || seen[y][x]) continue;
      const g = [], st = [[x, y]];
      seen[y][x] = true;
      while (st.length) {
        const [cx, cy] = st.pop();
        g.push({ x: cx, y: cy });
        for (const o of OFF) {
          const nx = cx + o[0], ny = cy + o[1];
          if (nx < 0 || nx >= W || ny < 0 || ny >= H || seen[ny][nx] || b[ny][nx] !== c) continue;
          seen[ny][nx] = true;
          st.push([nx, ny]);
        }
      }
      if (g.length >= (min || 1)) out.push({ c: c, cells: g });
    }
    return out;
  }

  /* ---------- とくてん ---------- */
  function chainMult(chain) { return CHAIN_MULT[Math.min(chain, CHAIN_MULT.length) - 1]; }
  function stepPoints(gs, chain) {
    let base = 0;
    const kinds = new Set();
    for (const g of gs) { base += 40 + 10 * (g.cells.length - 4); kinds.add(g.c); }
    let p = base * chainMult(chain);
    if (kinds.size >= 2) p *= 1.5;
    return Math.round(p);
  }

  // 1かいぶん けす（おとすのは べつ: gravity）。けす ものが なければ null
  function clearStep(b, chain) {
    const gs = groups(b, 4);
    if (!gs.length) return null;
    const gone = new Set();
    for (const g of gs) for (const c of g.cells) gone.add(c.y * W + c.x);
    // ぬけがら: となりで セミが とびたった とき だけ きえる
    const garbage = [];
    const gSeen = new Set();
    for (const k of gone) {
      const x = k % W, y = (k / W) | 0;
      for (const o of OFF) {
        const nx = x + o[0], ny = y + o[1];
        if (get(b, nx, ny) === GARBAGE && !gSeen.has(ny * W + nx)) {
          gSeen.add(ny * W + nx);
          garbage.push({ x: nx, y: ny });
        }
      }
    }
    for (const k of gone) b[(k / W) | 0][k % W] = EMPTY;
    for (const g of garbage) b[g.y][g.x] = EMPTY;
    const kinds = [];
    for (const g of gs) if (kinds.indexOf(g.c) < 0) kinds.push(g.c);
    return {
      chain: chain,
      groups: gs,
      garbage: garbage,
      kinds: kinds,
      count: gone.size,
      points: stepPoints(gs, chain),
    };
  }

  // れんさの しめくくり: つくぼう ボーナス・ぜんぶ からっぽ
  function finishChain(b, steps) {
    let points = steps.reduce((s, st) => s + st.points, 0);
    const last = steps[steps.length - 1];
    const tsukuBonus = steps.length >= 2 && !!last && last.kinds.indexOf(T) >= 0;
    if (tsukuBonus) points = Math.round(points * 1.5);
    const allClear = steps.length > 0 && count(b) === 0;
    if (allClear) points += 1000;
    return { chain: steps.length, points: points, tsukuBonus: tsukuBonus, allClear: allClear };
  }

  // おいた あとを さいごまで（れんさ ぜんぶ）
  function resolve(b) {
    const steps = [];
    let st;
    while ((st = clearStep(b, steps.length + 1))) {
      st.falls = gravity(b);
      steps.push(st);
    }
    const fin = finishChain(b, steps);
    fin.steps = steps;
    return fin;
  }

  // くみを x・rot で うえから おとして ぜんぶ けいさん（れんしゅう もんだい・テスト用）
  function tryDrop(b0, a, bb, x, rot) {
    const b = clone(b0);
    let p = { x: x, y: 0, rot: rot, a: a, b: bb };
    if (rot === 0) p.y = 1; // こどもが うえ: こどもが y=0 に くる
    if (!fits(b, p)) return null;
    p = hardDrop(b, p);
    lock(b, p);
    const r = resolve(b);
    r.board = b;
    r.pair = p;
    return r;
  }
  // ぜんぶの おきかたを ためす
  function allDrops(b0, a, bb) {
    const out = [];
    for (let rot = 0; rot < 4; rot++) for (let x = 0; x < W; x++) {
      const r = tryDrop(b0, a, bb, x, rot);
      if (r) out.push({ x: x, rot: rot, chain: r.chain, points: r.points });
    }
    return out;
  }

  /* ---------- ぬけがら ---------- */
  // ふってくる: ちがう れつに n こ。いっぱいの れつには ふらない
  function dropGarbage(b, n, rng) {
    const cols = [];
    for (let x = 0; x < W; x++) if (b[0][x] === EMPTY) cols.push(x);
    const placed = [];
    for (let i = 0; i < n && cols.length; i++) {
      const x = cols.splice(rng.int(cols.length), 1)[0];
      let y = H - 1;
      while (y >= 0 && b[y][x] !== EMPTY) y--;
      if (y < 0) continue;
      b[y][x] = GARBAGE;
      placed.push({ x: x, y: y });
    }
    return placed;
  }
  function clearAllGarbage(b) {
    const gone = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (b[y][x] === GARBAGE) { b[y][x] = EMPTY; gone.push({ x: x, y: y }); }
    return gone;
  }

  /* ---------- つまり・ゆうだち ---------- */
  // えだの つけね（うえの まんなかの 2だんめ）まで つまったら おしまい
  function toppedOut(b) { return b[1][SPAWN_X] !== EMPTY; }
  // ゆうだち: うえの 4だんを けす（やさしい モード）
  function rain(b) {
    const gone = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < W; x++) if (b[y][x]) { gone.push({ x: x, y: y, c: b[y][x] }); b[y][x] = EMPTY; }
    return gone;
  }

  /* ---------- むずかしさ と いちにちの ながれ ---------- */
  const DIFF = {
    easy:   { day: [T, M, A],    eve: [T, A, HG],    fall: 1000, minFall: 600, garbEvery: 12, garbN: [1, 2], endless: true },
    normal: { day: [T, M, A, K], eve: [T, M, A, HG], fall: 720,  minFall: 300, garbEvery: 9,  garbN: [2, 3], endless: false },
    hard:   { day: [T, M, A, K], eve: [T, M, A, K, HG], fall: 480, minFall: 170, garbEvery: 7, garbN: [3, 4], endless: false },
  };
  // けした かず → あさ(0)・ひる(1)・ゆうがた(2)。len は 1にちの ながさ（けす かず）
  function phaseOf(cleared, len) {
    const d = cleared % len;
    return d < len * 0.3 ? 0 : d < len * 0.62 ? 1 : 2;
  }
  function dayFrac(cleared, len) { return (cleared % len) / len; }

  /* ---------- ゲームの すすみ（えんしゅつ ぬき） ---------- */
  function Game(opt) {
    opt = opt || {};
    this.diff = DIFF[opt.diff] ? opt.diff : "easy";
    this.cfg = DIFF[this.diff];
    this.rng = makeRng(opt.seed || 1);
    this.board = opt.board ? clone(opt.board) : make();
    this.dayLen = opt.dayLen || 80;
    this.wrap = opt.wrap != null ? !!opt.wrap : true; // false: ゆうがたで とまる（なつやすみ）
    this.noGarbage = !!opt.noGarbage;
    this.endlessTop = opt.endless != null ? opt.endless : this.cfg.endless;
    this.score = 0;
    this.cleared = 0;
    this.locks = 0;
    this.gauge = 0;
    this.stats = { maxChain: 0, chains: {}, kinds: {}, garbage: 0, gassho: 0, rains: 0, tsuku: 0, allClear: 0 };
    this.queue = [];
    this.fill();
    this.pair = null;
  }
  Game.prototype.phase = function () {
    if (!this.wrap && this.cleared >= this.dayLen) return 2;
    return phaseOf(this.cleared, this.dayLen);
  };
  Game.prototype.frac = function () {
    if (!this.wrap && this.cleared >= this.dayLen) return 1;
    return dayFrac(this.cleared, this.dayLen);
  };
  Game.prototype.dayNo = function () { return Math.floor(this.cleared / this.dayLen) + 1; };
  Game.prototype.palette = function () { return this.phase() === 2 ? this.cfg.eve : this.cfg.day; };
  Game.prototype.randPair = function () {
    const pal = this.palette();
    return [pal[this.rng.int(pal.length)], pal[this.rng.int(pal.length)]];
  };
  Game.prototype.fill = function () { while (this.queue.length < 3) this.queue.push(this.randPair()); };
  // ゆうがたに なったら まだ でていない くみも いれかえる（かなかなが すぐ まざる）
  Game.prototype.refreshQueue = function () {
    const pal = this.palette();
    this.queue = this.queue.map((q) => q.map((c) => (pal.indexOf(c) >= 0 ? c : pal[this.rng.int(pal.length)])));
  };
  Game.prototype.next = function () {
    const q = this.queue.shift();
    this.fill();
    this.pair = spawn(q[0], q[1]);
    return fits(this.board, this.pair) ? this.pair : null;
  };
  Game.prototype.fallMs = function (elapsedSec) {
    const c = this.cfg;
    return Math.max(c.minFall, Math.round(c.fall * Math.pow(0.93, (elapsedSec || 0) / 30)));
  };
  // れんさ 1かいぶんを かぞえる
  Game.prototype.countStep = function (st) {
    this.cleared += st.count;
    this.stats.garbage += st.garbage.length;
    for (const g of st.groups) this.stats.kinds[g.c] = (this.stats.kinds[g.c] || 0) + g.cells.length;
  };
  // れんさが おわった ときの まとめ。がっしょう ゲージ。かえりち: { fin, gassho }
  Game.prototype.endChain = function (steps) {
    const fin = finishChain(this.board, steps);
    this.score += fin.points;
    if (fin.chain > this.stats.maxChain) this.stats.maxChain = fin.chain;
    if (fin.chain) this.stats.chains[fin.chain] = (this.stats.chains[fin.chain] || 0) + 1;
    if (fin.tsukuBonus) this.stats.tsuku++;
    if (fin.allClear) this.stats.allClear++;
    let gassho = false;
    if (fin.chain >= 2) this.gauge += fin.chain * 20;
    else if (fin.chain === 1) this.gauge += 4;
    if (this.gauge >= 100) { this.gauge = 0; gassho = true; this.stats.gassho++; }
    return { fin: fin, gassho: gassho };
  };
  // ぬけがらが ふる じかん？
  Game.prototype.garbageDue = function () {
    if (this.noGarbage) return 0;
    this.locks++;
    if (this.locks % this.cfg.garbEvery !== 0) return 0;
    const r = this.cfg.garbN;
    return r[0] + this.rng.int(r[1] - r[0] + 1);
  };
  // つまった？ → "ok" / "rain"（やさしい: うえ 4だんを けして つづける） / "over"
  Game.prototype.checkTop = function () {
    if (!toppedOut(this.board)) return { state: "ok" };
    if (this.endlessTop) {
      const gone = rain(this.board);
      this.stats.rains++;
      return { state: "rain", gone: gone };
    }
    return { state: "over" };
  };
  Game.prototype.chainsAtLeast = function (n) {
    let s = 0;
    for (const k in this.stats.chains) if (+k >= n) s += this.stats.chains[k];
    return s;
  };

  const api = {
    W, H, EMPTY, GARBAGE, T, M, A, K, HG, SPAWN_X, OFF, DIFF,
    makeRng, make, clone, get, isSemi, fromRows, toRows, count,
    cells, fits, spawn, shift, rotate, hardDrop, lock, gravity,
    groups, chainMult, stepPoints, clearStep, finishChain, resolve, tryDrop, allDrops,
    dropGarbage, clearAllGarbage, toppedOut, rain, phaseOf, dayFrac, Game,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TG = root.TG || {};
  root.TG.Board = api;
})(typeof window !== "undefined" ? window : globalThis);
