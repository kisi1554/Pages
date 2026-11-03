/* めぶんりょう チャレンジ — しくみ（DOM なし。node でも うごく）
 *   もんだい せいせい（シード つき）、ずれ → てんすう、まいにち 1もん、れんぞく ひすう、
 *   キャリブレーション（1えんだま 20mm）、からだ ものさし の ヒント */
(function (root, factory) {
  var M = factory();
  if (typeof module === 'object' && module.exports) module.exports = M;
  else root.Measure = M;
})(this, function () {
  'use strict';

  var COIN_MM = 20; // 1えんだま の ちょっけい

  /* ---------- らんすう（シード つき） ---------- */
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
  function rng(seed) {
    var a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function int(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function shuffle(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- しゅるい ---------- */
  var KINDS = ['length', 'time', 'count', 'center', 'weight'];
  var KIND_INFO = {
    length: { emoji: '📏', name: 'ながさ' },
    time: { emoji: '⏱️', name: 'じかん' },
    count: { emoji: '🫘', name: 'かず' },
    center: { emoji: '📐', name: 'かくど・まんなか' },
    weight: { emoji: '⚖️', name: 'おもさ' }
  };

  /* ながさ（cm が わかる とき） */
  var LENGTHS = [
    { mm: 20, text: '2cm' }, { mm: 30, text: '3cm' }, { mm: 50, text: '5cm' },
    { mm: 70, text: '7cm' }, { mm: 100, text: '10cm' }, { mm: 120, text: '12cm' },
    { mm: 150, text: '15cm' },
    { mm: 60, text: '1えんだま 3こ ぶん', sub: '1えんだま は ちょっけい 2cm（6cm）' },
    { mm: 100, text: 'はがき の みじかい ほう', sub: 'はがき の よこ は 10cm' },
    { mm: 148, text: 'はがき の ながい ほう', sub: 'はがき の たて は やく 15cm' },
    { mm: 170, text: 'えんぴつ 1ぽん ぶん', sub: 'あたらしい えんぴつ は やく 17cm' }
  ];
  /* ながさ（まだ あわせて いない とき は わりあい） */
  var FRACS = [
    { f: 1 / 2, text: 'はんぶん' }, { f: 1 / 3, text: '3ぶんの1' }, { f: 1 / 4, text: '4ぶんの1' },
    { f: 2 / 3, text: '3ぶんの2' }, { f: 3 / 4, text: '4ぶんの3' }
  ];
  var TIMES = [5, 10, 15, 20, 30, 60];
  var COUNT_ITEMS = [
    { e: '🫘', name: 'まめ', josu: 'つぶ' }, { e: '⭐', name: 'ほし', josu: 'こ' }, { e: '🧑', name: 'ひと', josu: 'にん' }
  ];
  /* おもさ（やく ○g と まるめた すうち） */
  var WEIGHTS = [
    { id: 'coin', e: '🪙', name: '1えんだま', g: 1 },
    { id: 'pencil', e: '✏️', name: 'えんぴつ', g: 5, one: '1ぽん' },
    { id: 'ichigo', e: '🍓', name: 'いちご', g: 20 },
    { id: 'egg', e: '🥚', name: 'たまご', g: 60 },
    { id: 'mikan', e: '🍊', name: 'みかん', g: 100 },
    { id: 'banana', e: '🍌', name: 'バナナ', g: 150 },
    { id: 'apple', e: '🍎', name: 'りんご', g: 300 },
    { id: 'milk', e: '🥛', name: 'ぎゅうにゅう（1L）', g: 1000, one: '1ぽん' },
    { id: 'randoseru', e: '🎒', name: 'ランドセル', g: 1200 },
    { id: 'cat', e: '🐈', name: 'ねこ', g: 4000, one: '1ぴき' },
    { id: 'suika', e: '🍉', name: 'すいか', g: 5000 }
  ];
  function weightById(id) {
    for (var i = 0; i < WEIGHTS.length; i += 1) if (WEIGHTS[i].id === id) return WEIGHTS[i];
    return null;
  }
  function fmtG(g) {
    if (g >= 1000) return 'やく ' + (Math.round(g / 100) / 10) + 'kg';
    return 'やく ' + g + 'g';
  }
  /* 「なんこ で つりあう？」に つかえる くみ（2〜12こ、ほぼ ちょうど の かず） */
  function balancePairs() {
    var out = [];
    WEIGHTS.forEach(function (h) {
      WEIGHTS.forEach(function (l) {
        var ratio = h.g / l.g;
        var n = Math.round(ratio);
        if (ratio >= 2 && ratio <= 12 && Math.abs(ratio - n) / ratio <= 0.05) out.push({ heavy: h.id, light: l.id, n: n, ratio: ratio });
      });
    });
    return out;
  }
  /* 「どっち が おもい？」に つかえる くみ（1.3ばい いじょう ちがう） */
  function whichPairs() {
    var out = [];
    WEIGHTS.forEach(function (a) {
      WEIGHTS.forEach(function (b) {
        if (a.g > b.g && a.g / b.g >= 1.3) out.push({ heavy: a.id, light: b.id });
      });
    });
    return out;
  }

  /* ---------- もんだい せいせい ---------- */
  // opts: { pxPerMm: 1mm の px（なければ わりあい もんだい）, maxMm: ひける いちばん ながい せん }
  function makeProblem(kind, r, opts) {
    opts = opts || {};
    var p = { kind: kind };
    if (kind === 'length') {
      if (opts.pxPerMm) {
        var max = (opts.maxMm || 150) * 0.9;
        var c = LENGTHS.filter(function (x) { return x.mm <= max; });
        if (!c.length) c = [LENGTHS[0]];
        var L = pick(r, c);
        p.mode = 'mm'; p.target = L.mm; p.text = L.text; p.sub = L.sub || '';
      } else {
        var F = pick(r, FRACS);
        p.mode = 'ratio'; p.target = F.f; p.text = 'わく の よこはば の ' + F.text; p.sub = '';
      }
    } else if (kind === 'time') {
      p.target = pick(r, TIMES);
      p.text = fmtSec(p.target, true);
    } else if (kind === 'count') {
      var n = Math.round(10 * Math.pow(30, r())); // 10〜300（ちいさい かず が でやすい）
      n = Math.max(10, Math.min(300, n));
      var it = pick(r, COUNT_ITEMS);
      p.item = it.e; p.name = it.name; p.josu = it.josu; p.answer = n;
      p.items = scatter(r, n);
      p.size = p.items.size; p.items = p.items.list;
    } else if (kind === 'center') {
      p.sub = pick(r, ['segment', 'circle', 'rect', 'right']);
      if (p.sub === 'segment') {
        var len = int(r, 380, 780), ang = r() * Math.PI;
        var dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
        var cx = int(r, Math.ceil(70 + Math.abs(dx)), Math.floor(930 - Math.abs(dx)));
        var cy = int(r, Math.ceil(70 + Math.abs(dy)), Math.floor(930 - Math.abs(dy)));
        p.a = { x: cx - dx, y: cy - dy }; p.b = { x: cx + dx, y: cy + dy };
        p.answer = { x: cx, y: cy }; p.scale = len;
        p.text = 'せん の ちょうど まんなか を タップ';
      } else if (p.sub === 'circle') {
        var rad = int(r, 150, 380);
        p.c = { x: int(r, rad + 50, 950 - rad), y: int(r, rad + 50, 950 - rad) }; p.r = rad;
        p.answer = { x: p.c.x, y: p.c.y }; p.scale = rad * 2;
        p.text = 'まる の ちょうど まんなか を タップ';
      } else if (p.sub === 'rect') {
        var w = int(r, 260, 820), h = int(r, 220, 720);
        p.x = int(r, 60, 940 - w); p.y = int(r, 60, 940 - h); p.w = w; p.h = h;
        p.answer = { x: p.x + w / 2, y: p.y + h / 2 }; p.scale = Math.sqrt(w * w + h * h);
        p.text = 'しかく の ちょうど まんなか を タップ';
      } else {
        p.v = { x: int(r, 330, 670), y: int(r, 330, 670) };
        p.a0 = int(r, 0, 359);
        var off = pick(r, [int(r, 20, 55), int(r, 125, 165)]) * (r() < 0.5 ? -1 : 1);
        p.start = (p.a0 + off + 360) % 360;
        p.answer = 90;
        p.text = 'ちょっかく（L の かたち）を つくって';
      }
    } else if (kind === 'weight') {
      p.sub = r() < 0.4 ? 'which' : 'howmany';
      if (p.sub === 'which') {
        var wp = pick(r, whichPairs());
        var order = r() < 0.5 ? [wp.heavy, wp.light] : [wp.light, wp.heavy];
        p.left = order[0]; p.right = order[1]; p.answer = wp.heavy;
        p.text = 'どっち が おもい？';
      } else {
        var bp = pick(r, balancePairs());
        p.heavy = bp.heavy; p.light = bp.light; p.answer = bp.n; p.ratio = bp.ratio;
        var HW = weightById(bp.heavy);
        p.text = HW.name + ' ' + (HW.one || '1こ') + ' と つりあう のは ' + weightById(bp.light).name + ' いくつ？';
      }
    }
    return p;
  }

  /* かず もんだい: かさならない ように ばらまく（0〜1000 の しかく の なか） */
  function scatter(r, n) {
    var cells = Math.ceil(n * 1.5);
    var cols = Math.ceil(Math.sqrt(cells)), rows = Math.ceil(cells / cols);
    var cw = 940 / cols, ch = 940 / rows;
    var idx = [];
    for (var i = 0; i < cols * rows; i += 1) idx.push(i);
    idx = shuffle(r, idx).slice(0, n);
    var size = Math.min(cw, ch) * 0.78;
    var list = idx.map(function (k) {
      var col = k % cols, row = Math.floor(k / cols);
      var jx = (cw - size) * (r() - 0.5) * 0.9, jy = (ch - size) * (r() - 0.5) * 0.9;
      return { x: Math.round(30 + cw * (col + 0.5) + jx), y: Math.round(30 + ch * (row + 0.5) + jy) };
    });
    return { list: list, size: size };
  }

  /* 10こ ずつ の まとまり（かぞえる アニメ よう。うえ から よむ じゅん） */
  function countGroups(p) {
    var order = p.items.map(function (it, i) { return i; });
    var band = p.size * 1.2;
    order.sort(function (a, b) {
      var A = p.items[a], B = p.items[b];
      var ra = Math.floor(A.y / band), rb = Math.floor(B.y / band);
      return ra !== rb ? ra - rb : (ra % 2 ? B.x - A.x : A.x - B.x);
    });
    var groups = [];
    for (var i = 0; i < order.length; i += 10) groups.push(order.slice(i, i + 10));
    return groups;
  }

  /* ---------- ずれ と てんすう ---------- */
  function angleBetween(a, b) {
    var d = Math.abs(((a - b) % 360 + 360) % 360);
    return d > 180 ? 360 - d : d;
  }
  // ずれ（そうたい。0 が ぴったり）
  function relErr(p, ans) {
    if (ans == null) return 1;
    switch (p.kind) {
      case 'length':
        return Math.abs((p.mode === 'mm' ? ans.mm : ans.frac) - p.target) / p.target;
      case 'time':
        return Math.abs(ans - p.target) / p.target;
      case 'count':
        return Math.abs(ans - p.answer) / p.answer;
      case 'center':
        if (p.sub === 'right') return Math.abs(angleBetween(ans, p.a0) - 90) / 90;
        return Math.hypot(ans.x - p.answer.x, ans.y - p.answer.y) / p.scale;
      case 'weight':
        if (p.sub === 'which') return ans === p.answer ? 0 : 1;
        return Math.abs(ans - p.ratio) / p.ratio;
    }
    return 1;
  }
  // てんすう（0〜100）。ずれ が おおきい ほど ちいさい（たんちょう げんしょう）
  function points(rel) {
    return Math.max(0, Math.round(100 - rel * 200));
  }
  var RANKS = {
    pittari: { emoji: '🎯', text: 'ぴったり！' },
    oshii: { emoji: '👍', text: 'おしい！' },
    maamaa: { emoji: '🙂', text: 'まあまあ' },
    motto: { emoji: '💪', text: 'もう すこし' }
  };
  function rankOf(rel) {
    if (rel <= 0.05) return 'pittari';
    if (rel <= 0.15) return 'oshii';
    if (rel <= 0.3) return 'maamaa';
    return 'motto';
  }

  function fmtSec(s, exact) {
    if (exact) return s >= 60 && s % 60 === 0 ? (s / 60) + 'ぷん' : s + 'びょう';
    return (Math.round(s * 10) / 10).toFixed(1) + 'びょう';
  }
  function fmtMm(mm) {
    if (mm < 10) return Math.round(mm) + 'mm';
    return (Math.round(mm) / 10).toFixed(1) + 'cm';
  }

  // こたえあわせ: { rel, points, rank, ans: あなた の こたえ, truth: ほんとう, err: ずれ, dir: おおすぎ など }
  function judge(p, ans, opts) {
    opts = opts || {};
    var rel = relErr(p, ans);
    var j = { rel: rel, points: points(rel), rank: rankOf(rel), ans: '', truth: '', err: '', dir: '' };
    if (p.kind === 'length') {
      if (p.mode === 'mm') {
        var d = ans.mm - p.target;
        j.ans = fmtMm(ans.mm); j.truth = p.target % 10 ? fmtMm(p.target) : (p.target / 10) + 'cm';
        j.err = 'ずれ ' + fmtMm(Math.abs(d));
        j.dir = Math.abs(d) < 1 ? '' : (d > 0 ? 'ながすぎ' : 'みじかすぎ');
      } else {
        var df = ans.frac - p.target;
        j.ans = 'わく の ' + Math.round(ans.frac * 100) + '%';
        j.truth = 'わく の ' + Math.round(p.target * 100) + '%';
        j.err = 'ずれ わく の ' + Math.round(Math.abs(df) * 100) + '%';
        j.dir = Math.abs(df) < 0.005 ? '' : (df > 0 ? 'ながすぎ' : 'みじかすぎ');
      }
    } else if (p.kind === 'time') {
      var dt = ans - p.target;
      j.ans = fmtSec(ans); j.truth = fmtSec(p.target, true);
      j.err = 'ずれ ' + fmtSec(Math.abs(dt));
      j.dir = Math.abs(dt) < 0.05 ? '' : (dt > 0 ? 'おそすぎ' : 'はやすぎ');
    } else if (p.kind === 'count') {
      var dc = ans - p.answer;
      j.ans = ans + p.josu; j.truth = p.answer + p.josu;
      j.err = dc === 0 ? 'ずれ なし' : 'ずれ ' + Math.abs(dc) + p.josu;
      j.dir = dc === 0 ? '' : (dc > 0 ? 'おおすぎ' : 'すくなすぎ');
    } else if (p.kind === 'center') {
      if (p.sub === 'right') {
        var deg = angleBetween(ans, p.a0);
        j.ans = Math.round(deg) + 'ど'; j.truth = '90ど';
        j.err = 'ずれ ' + Math.round(Math.abs(deg - 90)) + 'ど';
        j.dir = Math.round(Math.abs(deg - 90)) === 0 ? '' : (deg > 90 ? 'ひらきすぎ' : 'とじすぎ');
      } else {
        var dist = Math.hypot(ans.x - p.answer.x, ans.y - p.answer.y);
        j.truth = 'まんなか';
        if (opts.pxPerUnit && opts.pxPerMm) {
          j.err = 'ずれ ' + fmtMm(dist * opts.pxPerUnit / opts.pxPerMm);
        } else {
          j.err = 'ずれ おおきさ の ' + Math.round(rel * 100) + '%';
        }
        j.ans = j.err;
      }
    } else if (p.kind === 'weight') {
      var H = weightById(p.sub === 'which' ? p.answer : p.heavy);
      if (p.sub === 'which') {
        j.ans = weightById(ans) ? weightById(ans).name : '';
        j.truth = H.name;
        j.err = ans === p.answer ? 'せいかい！' : 'ざんねん';
      } else {
        var Lw = weightById(p.light);
        j.ans = ans + 'こ'; j.truth = 'やく ' + p.answer + 'こ';
        j.err = ans === p.answer ? 'ずれ なし' : 'ずれ ' + Math.abs(ans - p.answer) + 'こ';
        j.dir = ans === p.answer ? '' : (ans > p.answer ? 'おおすぎ' : 'すくなすぎ');
        j.detail = H.name + ' ' + fmtG(H.g) + '、' + Lw.name + ' ' + fmtG(Lw.g);
      }
    }
    return j;
  }

  /* ---------- まいにち 1もん ---------- */
  function dateStr(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function dayNum(s) {
    var a = s.split('-').map(Number);
    return Math.round(Date.UTC(a[0], a[1] - 1, a[2]) / 86400000);
  }
  function daily(ds, opts) {
    var r = rng('mebunryo:' + ds);
    var kind = KINDS[Math.floor(r() * KINDS.length)];
    var p = makeProblem(kind, r, opts);
    p.daily = ds;
    return p;
  }
  // れんぞく ひすう: おなじ ひ は そのまま、きのう の つぎ は +1、あいだ が あく と 1 から
  function nextStreak(prev, today) {
    prev = prev || {};
    if (prev.last === today) return { last: today, streak: prev.streak || 1 };
    if (prev.last && dayNum(today) - dayNum(prev.last) === 1) return { last: today, streak: (prev.streak || 0) + 1 };
    return { last: today, streak: 1 };
  }

  /* ---------- キャリブレーション・からだ ものさし ---------- */
  function pxPerMmFromCoin(coinPx) { return coinPx / COIN_MM; }
  function coinPxFrom(pxPerMm) { return pxPerMm * COIN_MM; }
  function validPxPerMm(v) { return typeof v === 'number' && isFinite(v) && v >= 1.5 && v <= 15; }

  function halves(n) {
    var h = Math.round(n * 2) / 2;
    var whole = Math.floor(h);
    if (h - whole === 0.5) return whole ? whole + 'こ と はんぶん' : 'はんぶん';
    return whole + 'こ';
  }
  // ヒント:「てのひら やく 1こ と はんぶん ぶん だよ」
  function bodyHint(mm, body) {
    body = body || {};
    if (body.palm && mm / body.palm >= 0.75) return 'てのひら やく ' + halves(mm / body.palm) + ' ぶん だよ';
    if (body.finger) return 'ゆび の はば やく ' + Math.max(1, Math.round(mm / body.finger)) + 'ほん ぶん だよ';
    if (body.palm) return 'てのひら やく ' + halves(mm / body.palm) + ' ぶん だよ';
    return '';
  }

  return {
    COIN_MM: COIN_MM, KINDS: KINDS, KIND_INFO: KIND_INFO, LENGTHS: LENGTHS, FRACS: FRACS, TIMES: TIMES,
    WEIGHTS: WEIGHTS, RANKS: RANKS,
    hashStr: hashStr, rng: rng, shuffle: shuffle,
    makeProblem: makeProblem, countGroups: countGroups, balancePairs: balancePairs, whichPairs: whichPairs,
    weightById: weightById, fmtG: fmtG, fmtSec: fmtSec, fmtMm: fmtMm, angleBetween: angleBetween,
    relErr: relErr, points: points, rankOf: rankOf, judge: judge,
    dateStr: dateStr, dayNum: dayNum, daily: daily, nextStreak: nextStreak,
    pxPerMmFromCoin: pxPerMmFromCoin, coinPxFrom: coinPxFrom, validPxPerMm: validPxPerMm, bodyHint: bodyHint
  };
});
