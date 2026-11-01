'use strict';

/*
 * おみせの しくみ（DOM なし。test.js から そのまま よべる）
 *  - ちゅうもん づくり（シード つき 乱数）
 *  - てじゅん はんてい check(order, done)
 *  - ゆでかげん・あげぐあい
 *  - レジ の ごうけい・おつり
 *  - おきゃくさんの まんぞく（ニコニコ）
 */
const Shop = (() => {
  const M = (typeof Menu !== 'undefined') ? Menu : require('./menu.js');

  /* シード つき 乱数（mulberry32） */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (n) => Math.floor(r() * n);
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  }

  const RECIPE = {};
  M.KIND_ORDER.forEach((k) => { RECIPE[k] = M.KINDS[k].recipe.slice(); });

  /* その ひに ひらいて いる メニュー */
  function unlocked(day) {
    const d = Math.max(1, day | 0);
    return {
      kinds: M.KIND_ORDER.filter((k) => M.KINDS[k].day <= d),
      sides: M.SIDE_ORDER.filter((k) => M.SIDES[k].day <= d),
      customers: M.CUSTOMER_ORDER.filter((k) => M.CUSTOMERS[k].day <= d),
    };
  }

  /* 1ぱい ぶんの ちゅうもん { kind, size, toppings[], tempura[] } */
  function makeOrder(r, day, type, opt) {
    const o = opt || {};
    const u = unlocked(day);
    const c = M.CUSTOMERS[type] || M.CUSTOMERS.oneesan;
    const likes = c.likes.filter((k) => u.kinds.includes(k));
    const kind = likes.length ? r.pick(likes) : r.pick(u.kinds);
    const size = c.size || (r() < 0.5 ? 'nami' : 'dai');
    const toppings = [];
    c.toppings.forEach((t) => { if (r() < 0.6) toppings.push(t); });
    if (!toppings.length && r() < 0.7) toppings.push(c.toppings[0]);
    const tempura = [];
    if (!o.noSides) {
      const sides = c.sides.filter((s) => u.sides.includes(s));
      const n = Math.min(c.nSides, o.nSidesMax || 2);
      for (let i = 0; i < n && sides.length; i += 1) {
        if (i > 0 && r() < 0.5) break;
        tempura.push(r.pick(sides));
      }
    }
    return { kind, size, toppings: M.TOPPING_ORDER.filter((t) => toppings.includes(t)), tempura };
  }

  /*
   * 1日ぶんの おきゃくさん。
   *  { id, type, orders:[order,...], arrive(びょう), patience(びょう or 0) }
   */
  function makeDay(day, diffId, seed, count) {
    const D = M.DIFF[diffId] || M.DIFF.easy;
    const r = rng(seed == null ? day * 7919 + 13 : seed);
    const u = unlocked(day);
    const n = count || M.customersFor(day);
    const list = [];
    let t = 1;
    let last = '';
    for (let i = 0; i < n; i += 1) {
      let type = r.pick(u.customers);
      if (type === last) type = r.pick(u.customers);
      last = type;
      const c = M.CUSTOMERS[type];
      const opt = { nSidesMax: D.nSidesMax };
      const orders = [makeOrder(r, day, type, opt)];
      if (c.pair) {
        // こどもの ぶん（なみ・トッピング すくなめ）。てんぷら は おとなが まとめて
        const kid = makeOrder(r, day, type, { noSides: true });
        kid.size = 'nami';
        kid.toppings = [];
        orders.push(kid);
      }
      list.push({
        id: i, type, orders,
        arrive: t,
        patience: D.patience ? Math.round(D.patience * c.patience * orders.length) : 0,
      });
      t += D.queue > 1 ? 14 + r.int(10) : 0;
    }
    return list;
  }

  /*
   * てじゅん はんてい
   *  done = { steps:[...], balls, toppings:[...], soup(0..1), soupKind }
   *  かえす: { ok, diffs:[{ code, step, msg }] }  ちがいが ない ときは ok
   */
  const RANK = { boil: 0, drain: 1, chill: 1, bowl: 2, hotSoup: 3, coldSoup: 3, hotWater: 3, dipSoup: 3, topping: 4 };
  const MISSING = {
    boil: 'まずは めんを ゆでよう。',
    drain: 'てぼを ふって ゆきり しよう。',
    chill: 'つめたい みずで 2かい ひやしてね。',
    bowl: 'めんを うつわに もろう。',
    hotSoup: 'あったかい つゆを かけてね。',
    coldSoup: 'つめたい つゆを すこし かけてね。',
    hotWater: 'ゆでじる（おゆ）を いれてね。',
    dipSoup: 'つけつゆの うつわを そえてね。',
  };
  const EXTRA = {
    drain: 'かまあげは ゆきり しないよ。おゆが ないよ！',
    chill: 'この うどんは ひやさなくて いいよ。',
    hotSoup: 'あれ？ あったかい つゆ じゃ ないよ。',
    coldSoup: 'あれ？ つめたい つゆ じゃ ないよ。',
    hotWater: 'あれ？ おゆは いれないよ。',
    dipSoup: 'つけつゆは いらないよ。',
  };
  function check(order, done) {
    const d = done || {};
    const steps = (d.steps || []).slice();
    const recipe = RECIPE[order.kind];
    const kindName = M.KINDS[order.kind].name;
    const diffs = [];
    const want = M.BALLS[order.size];
    if ((d.balls | 0) !== want) {
      diffs.push({ code: 'size', step: 'boil', msg: `${M.SIZE[order.size]} だよ。めんは ${want}たま。` });
    }
    // たりない てじゅん
    recipe.forEach((s) => {
      if (s === 'topping') return;
      if (!steps.includes(s)) diffs.push({ code: 'missing', step: s, msg: `${kindName} だよ。${MISSING[s]}` });
    });
    // よけいな てじゅん
    steps.forEach((s, i) => {
      if (s === 'topping' || recipe.includes(s) || steps.indexOf(s) !== i) return;
      diffs.push({ code: 'extra', step: s, msg: EXTRA[s] || 'それは いらないよ。' });
    });
    // じゅんばん（ゆでる → ゆきり・ひやす → もる → つゆ → トッピング）
    let rk = -1;
    for (const s of steps) {
      const v = RANK[s];
      if (v == null) continue;
      if (v < rk) { diffs.push({ code: 'order', step: s, msg: 'じゅんばんが ちがうよ。' }); break; }
      rk = v;
    }
    // トッピング
    const tp = d.toppings || [];
    (order.toppings || []).forEach((t) => {
      if (!tp.includes(t)) diffs.push({ code: 'topping', step: 'topping', msg: `${M.TOPPINGS[t].name}を のせてね。` });
    });
    tp.forEach((t) => {
      if (!(order.toppings || []).includes(t)) diffs.push({ code: 'topping', step: 'topping', msg: `${M.TOPPINGS[t].name}は いらないよ。` });
    });
    return { ok: diffs.length === 0, diffs };
  }
  /* トッピング だけの まちがいなら その ばで なおせる */
  const onlyToppings = (res) => res.diffs.length > 0 && res.diffs.every((x) => x.code === 'topping');

  /* その ちゅうもんを てじゅん どおりに つくった ときの done（テスト・おてほん用） */
  function perfect(order) {
    const steps = RECIPE[order.kind].slice();
    const soupy = steps.find((s) => s === 'hotSoup' || s === 'coldSoup' || s === 'hotWater');
    return { steps, balls: M.BALLS[order.size], toppings: (order.toppings || []).slice(), soup: soupy ? 0.75 : 0, soupKind: soupy || null };
  }

  /* ゆでかげん: t は 0..1。win=[ok0, ok1] */
  function boilJudge(t, win) {
    const w = win || M.DIFF.normal.boilWin;
    if (t < w[0]) return 'hard';
    if (t > w[1]) return 'soft';
    return 'ok';
  }
  /* あげぐあい: 0..1 の いろ。0.55〜0.8 が きつねいろ */
  function fryJudge(c, win) {
    const w = win || [0.55, 0.8];
    if (c < w[0]) return 'white';
    if (c > w[1]) return 'burnt';
    return 'good';
  }
  /* つゆの りょう: ちょうどの せんは 0.6〜0.88。ぶっかけ は すこし（0.3〜0.55） */
  function soupJudge(v, kind) {
    const w = kind === 'bukkake' ? [0.3, 0.55] : [0.6, 0.88];
    if (v < w[0]) return 'few';
    if (v > w[1]) return 'many';
    return 'ok';
  }
  const soupWindow = (kind) => (kind === 'bukkake' ? [0.3, 0.55] : [0.6, 0.88]);

  /* レジ */
  function bowlPrice(order) { return M.KINDS[order.kind].price[order.size]; }
  /* おきゃくさんの トレーの しなもの */
  function itemsOf(cust) {
    const items = [];
    cust.orders.forEach((o) => {
      items.push({ id: `${o.kind}-${o.size}`, kind: o.kind, size: o.size, name: `${M.KINDS[o.kind].name}（${M.SIZE[o.size]}）`, price: bowlPrice(o) });
      (o.tempura || []).forEach((s) => items.push({ id: s, side: s, name: M.SIDES[s].name, price: M.SIDES[s].price }));
    });
    return items;
  }
  const total = (items) => items.reduce((a, it) => a + (typeof it === 'number' ? it : it.price), 0);
  /* おつり（たりない ときは -1） */
  const change = (paid, tot) => (paid >= tot ? paid - tot : -1);
  const coinsSum = (coins) => coins.reduce((a, c) => a + c, 0);
  /* おきゃくさんが だす おかね（ちょうど・つぎの 100えん・500・1000） */
  function payWith(tot, r) {
    const opts = [];
    const up100 = Math.ceil(tot / 100) * 100;
    if (up100 !== tot) opts.push(up100);
    const up500 = Math.ceil(tot / 500) * 500;
    if (up500 !== tot && up500 !== up100) opts.push(up500);
    const up1000 = Math.ceil(tot / 1000) * 1000;
    if (up1000 !== tot && !opts.includes(up1000)) opts.push(up1000);
    if (!opts.length) return tot;
    return r ? r.pick(opts) : opts[0];
  }
  /* いちばん すくない まいすうの おつり（おてほん。こたえは ごうけい が あえば なんでも 正解） */
  function fewestCoins(amount) {
    const out = [];
    let a = amount;
    M.COINS.forEach((c) => { while (a >= c) { out.push(c); a -= c; } });
    return a === 0 ? out : null;
  }

  /*
   * まんぞく（ニコニコ 1〜3）
   *  f = { redo:回数, boil:'ok'|'hard'|'soft', soup:'ok'|..., waited:びょう, patience:びょう(0=なし), thanks:bool }
   */
  function niko(f) {
    let v = 3;
    if (f.redo) v -= 1;
    if (f.boil && f.boil !== 'ok') v -= 0.5;
    if (f.soup && f.soup !== 'ok') v -= 0.5;
    if (f.patience && f.waited > f.patience) v -= 1;
    if (f.thanks) v += 0.5;
    return Math.max(1, Math.min(3, Math.round(v)));
  }

  /* めんうち: きった いち（0..1）の そろいぐあい → true で ◎ */
  function cutEven(xs) {
    if (!xs || xs.length < 3) return false;
    const s = xs.slice().sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < s.length; i += 1) gaps.push(s[i] - s[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg <= 0) return false;
    return gaps.every((g) => Math.abs(g - avg) <= avg * 0.45);
  }
  /* めんうち の できばえ ★1〜3（しっぱいは ない） */
  function koshi(r) {
    let s = 1;
    if (r.stepAlt >= 0.8) s += 1;
    if (r.cutEven) s += 1;
    return s;
  }

  return {
    rng, RECIPE, unlocked, makeOrder, makeDay, check, onlyToppings, perfect,
    boilJudge, fryJudge, soupJudge, soupWindow, bowlPrice, itemsOf, total, change, coinsSum, payWith, fewestCoins,
    niko, cutEven, koshi,
  };
})();
if (typeof module !== 'undefined') module.exports = Shop;
