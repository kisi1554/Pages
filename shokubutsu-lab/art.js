/* たねから はなまで ラボ — え（SVG を コードで かく。がぞうファイルは つかわない）
   どの かんすうも SVG の もじれつを かえすだけ。DOM には さわらない（テストでも よべる）。 */

(function (root) {
  'use strict';

  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.LAB;

  const f = (n) => (Math.round(n * 10) / 10).toString();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- いろ ---------------- */
  function mix(c1, c2, k) {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
  const GREEN = '#37a14a', GREEN_D = '#23793a', STEM = '#3f8f3c';

  /* ================= は の かたち =================
     (0,0) が つけね、+x の むきに ながさ 1。あとで translate/rotate/scale する。 */
  const LEAF = {
    heart: 'M0 0 C.05 -.42 .55 -.62 1 0 C.55 .62 .05 .42 0 0Z',
    asagao: 'M0 0 C.02 -.3 .2 -.5 .38 -.42 C.42 -.62 .62 -.66 .62 -.38 C.8 -.3 1 -.1 1 0 C1 .1 .8 .3 .62 .38 C.62 .66 .42 .62 .38 .42 C.2 .5 .02 .3 0 0Z',
    oval: 'M0 0 C.1 -.4 .8 -.45 1 0 C.8 .45 .1 .4 0 0Z',
    round: 'M0 0 C0 -.55 1 -.55 1 0 C1 .55 0 .55 0 0Z',
    thin: 'M0 0 C.2 -.16 .8 -.16 1 0 C.8 .16 .2 .16 0 0Z',
    narrow: serrated(0.17, 9),
    palm: 'M0 0 L.15 -.3 L.35 -.25 L.42 -.55 L.6 -.35 L.82 -.4 L.8 -.15 L1 0 L.8 .15 L.82 .4 L.6 .35 L.42 .55 L.35 .25 L.15 .3Z',
    lobed: 'M0 0 L.25 -.12 L.3 -.5 L.45 -.2 L.6 -.55 L.62 -.15 L.95 -.25 L.75 0 L.95 .25 L.62 .15 L.6 .55 L.45 .2 L.3 .5 L.25 .12Z',
    v: 'M0 0 C.2 -.25 .55 -.6 .95 -.45 L.6 0 L.95 .45 C.55 .6 .2 .25 0 0Z',
    bean: 'M0 0 C0 -.5 1 -.55 1 -.1 C1 .3 .55 .2 .4 .35 C.2 .45 0 .3 0 0Z'
  };

  // ふちが ぎざぎざの ほそながい は
  function serrated(w, n) {
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      const half = w * Math.sin(Math.PI * x);
      const k = i % 2 ? 1.18 : 0.9;
      top.push(f(x) + ' ' + f(-half * k));
      bot.unshift(f(x) + ' ' + f(half * k));
    }
    return 'M' + top.join(' L') + ' L' + bot.join(' L') + 'Z';
  }

  function leafShape(shape, x, y, ang, len, fill, extra) {
    const tr = 'translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(ang) + ') scale(' + f(len) + ')';
    const sw = f(1.2 / Math.max(1, len));
    if (shape === 'compound') {
      // ちいさな はが あつまった トマトの は
      let s = '<g transform="' + tr + '"' + (extra || '') + '><path d="M0 0 L1 0" stroke="' + mix(fill, '#000000', .25) + '" stroke-width="' + f(2 / len) + '"/>';
      [[.3, -1], [.3, 1], [.55, -1], [.55, 1], [.8, -1], [.8, 1]].forEach(([t, s2]) => {
        s += '<path d="' + LEAF.oval + '" fill="' + fill + '" transform="translate(' + t + ' 0) rotate(' + (s2 * 55) + ') scale(.28)"/>';
      });
      return s + '<path d="' + serrated(.2, 7) + '" fill="' + fill + '" transform="translate(.78 0) scale(.26)"/></g>';
    }
    if (shape === 'trifoliate') {
      return '<g transform="' + tr + '"' + (extra || '') + '><path d="M0 0 L.45 0" stroke="' + STEM + '" stroke-width="' + f(2 / len) + '"/>' +
        '<path d="' + LEAF.heart + '" fill="' + fill + '" transform="translate(.45 0) scale(.55)"/>' +
        '<path d="' + LEAF.heart + '" fill="' + fill + '" transform="translate(.42 0) rotate(-70) scale(.45)"/>' +
        '<path d="' + LEAF.heart + '" fill="' + fill + '" transform="translate(.42 0) rotate(70) scale(.45)"/></g>';
    }
    return '<path d="' + LEAF[shape] + '" fill="' + fill + '" stroke="' + mix(fill, '#000000', .3) + '" stroke-width="' + sw + '" transform="' + tr + '"' + (extra || '') + '/>';
  }

  /* ================= たね ================= */
  function seedPath(shape) {
    switch (shape) {
      case 'kushi': return 'M-10 8 C-12 -4 -4 -12 8 -10 L10 10Z';
      case 'stripe': return 'M0 -14 C8 -6 9 6 4 13 L-4 13 C-9 6 -8 -6 0 -14Z';
      case 'round': return 'M-8 0 A8 8 0 1 0 8 0 A8 8 0 1 0 -8 0Z';
      case 'flat': return 'M-9 0 C-9 -8 9 -8 9 0 C9 7 -9 7 -9 0Z';
      case 'bean': return 'M-13 -2 C-13 -10 13 -10 13 -2 C13 7 4 6 0 3 C-4 6 -13 7 -13 -2Z';
      case 'flatoval': return 'M-8 -12 C4 -14 8 -4 8 4 C8 12 -4 14 -8 10 C-11 4 -11 -8 -8 -12Z';
      case 'jagged': return 'M-11 0 L-9 -6 L-5 -9 L0 -8 L5 -10 L9 -6 L11 0 L9 6 L5 9 L0 8 L-5 10 L-9 6Z';
      default: return 'M-8 0 A8 8 0 1 0 8 0 A8 8 0 1 0 -8 0Z';
    }
  }

  function seedIcon(p, x, y, sc) {
    const sh = p.seed.shape;
    let s = '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(sc || 1) + ')">';
    s += '<path d="' + seedPath(sh) + '" fill="' + p.seed.color + '" stroke="#00000055" stroke-width="1"/>';
    if (sh === 'stripe') s += '<path d="M-3 -9 L-3 12 M3 -9 L3 12" stroke="#f1f1f1" stroke-width="1.6"/>';
    if (sh === 'bean') s += '<ellipse cx="0" cy="-1" rx="3" ry="1.5" fill="#fff8"/>';
    if (sh === 'kushi') s += '<path d="M-6 4 C-6 -2 -1 -6 5 -6" stroke="#ffffff44" fill="none"/>';
    return s + '</g>';
  }

  function seedCard(p) {
    return '<svg viewBox="-20 -20 40 40" class="seed-svg" role="img" aria-label="' + p.name + 'の たね">' + seedIcon(p, 0, 0, 1.15) + '</svg>';
  }

  /* ================= そだつ しょくぶつ（そだてて かんさつ） ================= */
  const W = 320, H = 430, G = 372, CX = 172;
  const FRAMES = [
    { cm: 5, minor: 0.5, major: 1 }, { cm: 12, minor: 1, major: 2 }, { cm: 25, minor: 1, major: 5 },
    { cm: 50, minor: 2, major: 10 }, { cm: 100, minor: 5, major: 20 }, { cm: 200, minor: 10, major: 50 },
    { cm: 320, minor: 10, major: 50 }
  ];
  function frameFor(cm) {
    return FRAMES.find((fr) => fr.cm >= cm * 1.12) || FRAMES[FRAMES.length - 1];
  }
  const TOP = 40;  // え の いちばん うえ（ものさしの さいだい）

  // は の ながさ（cm） … え では ちいさく なりすぎない ように する
  const LEAF_CM = { asagao: 9, himawari: 20, housenka: 8, minitomato: 14, ingen: 8, hechima: 20, tsurureishi: 12 };
  const FLOWER_CM = { asagao: 9, himawari: 20, housenka: 3, minitomato: 2, ingen: 1.8, hechima: 8, tsurureishi: 4 };

  /* くきの みち（t=0 ねもと → 1 さき）。つるは ぼう・あみ に そって のぼる。 */
  function stemPath(p, hpx, twining, netting) {
    const pts = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = G - t * hpx;
      if (twining) {
        // アサガオ: うえから みて 反時計回り（ひだりまき）。
        // まえ（depth>0）を とおる ときは みぎ むきに すすむ ＝ まえの すじは「/」
        const th = (t * hpx) / 46 * Math.PI * 2;
        pts.push({ x: CX - 9 * Math.cos(th), y, depth: Math.sin(th) });
      } else if (netting) {
        pts.push({ x: CX + 26 * Math.sin(t * hpx / 70), y, depth: 1 });
      } else {
        pts.push({ x: CX + 3 * Math.sin(t * 5), y, depth: 1 });
      }
    }
    return pts;
  }
  function at(pts, t) {
    const i = clamp(Math.round(t * (pts.length - 1)), 0, pts.length - 1);
    return pts[i];
  }

  function flowerIcon(p, x, y, size, kind, colorIdx) {
    const col = p.flower.colors[(colorIdx || 0) % p.flower.colors.length];
    const r = size / 2;
    let s = '<g transform="translate(' + f(x) + ' ' + f(y) + ')">';
    if (p.id === 'himawari') {
      for (let i = 0; i < 16; i++) s += '<ellipse cx="0" cy="' + f(-r * .72) + '" rx="' + f(r * .17) + '" ry="' + f(r * .36) + '" fill="' + col + '" transform="rotate(' + (i * 22.5) + ')"/>';
      s += '<circle r="' + f(r * .45) + '" fill="#6b3f1d"/><circle r="' + f(r * .3) + '" fill="#4a2a12"/>';
    } else if (p.id === 'asagao') {
      s += '<circle r="' + f(r) + '" fill="' + col + '"/><circle r="' + f(r * .55) + '" fill="' + mix(col, '#ffffff', .55) + '"/><circle r="' + f(r * .18) + '" fill="#fff"/>';
      for (let i = 0; i < 5; i++) s += '<path d="M0 0 L0 ' + f(-r) + '" stroke="' + mix(col, '#ffffff', .7) + '" stroke-width="' + f(Math.max(.6, r * .08)) + '" transform="rotate(' + (i * 72) + ')"/>';
    } else {
      const petals = p.id === 'ingen' ? 4 : 5;
      for (let i = 0; i < petals; i++) s += '<ellipse cx="0" cy="' + f(-r * .5) + '" rx="' + f(r * .38) + '" ry="' + f(r * .52) + '" fill="' + col + '" stroke="#00000022" transform="rotate(' + (i * 360 / petals) + ')"/>';
      s += '<circle r="' + f(r * .22) + '" fill="' + (col === '#ffffff' ? '#ffe066' : mix(col, '#e67700', .5)) + '"/>';
    }
    return s + '</g>';
  }

  function budIcon(x, y, size) {
    return '<path d="M' + f(x) + ' ' + f(y + size * .5) + ' C' + f(x - size * .35) + ' ' + f(y) + ' ' + f(x - size * .1) + ' ' + f(y - size * .5) + ' ' + f(x) + ' ' + f(y - size * .6) +
      ' C' + f(x + size * .1) + ' ' + f(y - size * .5) + ' ' + f(x + size * .35) + ' ' + f(y) + ' ' + f(x) + ' ' + f(y + size * .5) + 'Z" fill="#8fc866" stroke="#4d8a2f" stroke-width=".8"/>';
  }

  function fruitIcon(p, x, y, size, ripe) {
    const r = size / 2;
    switch (p.id) {
      case 'asagao':
        return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * .55) + '" fill="' + (ripe ? '#a0784a' : '#8bc34a') + '" stroke="#00000033"/>';
      case 'himawari':
        return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + (ripe ? '#3b2f22' : '#6b4a1d') + '"/>' +
          '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * .7) + '" fill="none" stroke="#c8b07a" stroke-dasharray="1.5 2"/>';
      case 'housenka':
        return '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r * .5) + '" ry="' + f(r) + '" fill="' + (ripe ? '#a9c27a' : '#8bc34a') + '" stroke="#5c8a2f" stroke-dasharray="1 1.5"/>';
      case 'minitomato':
        return [[-.6, 0], [.6, .1], [0, .8]].map(([dx, dy]) => '<circle cx="' + f(x + dx * r * 1.4) + '" cy="' + f(y + dy * r * 1.4) + '" r="' + f(r * .8) + '" fill="' + (ripe ? '#e03131' : '#74b816') + '" stroke="#00000033"/>').join('');
      case 'ingen':
        return '<path d="M' + f(x) + ' ' + f(y) + ' q' + f(r * .5) + ' ' + f(r * 2) + ' ' + f(r * 1.6) + ' ' + f(r * 4) + '" stroke="' + (ripe ? '#c2a35a' : '#5c940d') + '" stroke-width="' + f(Math.max(2, r * .55)) + '" fill="none" stroke-linecap="round"/>';
      case 'hechima':
        return '<rect x="' + f(x - r * .35) + '" y="' + f(y) + '" width="' + f(r * .7) + '" height="' + f(r * 5) + '" rx="' + f(r * .35) + '" fill="' + (ripe ? '#b5a46a' : '#5c940d') + '" stroke="#00000033"/>';
      case 'tsurureishi':
        return '<rect x="' + f(x - r * .5) + '" y="' + f(y) + '" width="' + f(r) + '" height="' + f(r * 3) + '" rx="' + f(r * .5) + '" fill="' + (ripe ? '#ff922b' : '#69a33a') + '" stroke="' + (ripe ? '#c92a2a' : '#3e6b1f') + '" stroke-dasharray="1 1.5"/>';
      default:
        return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="#8bc34a"/>';
    }
  }

  /* そだてて かんさつ の え。
     opts: { ruler:true, wet:0〜1, wilt:0〜1 } */
  function plantScene(pid, day, opts) {
    opts = opts || {};
    const p = D.PLANT[pid];
    const st = D.stageAt(p, day).key;
    const hcm = D.heightAt(p, day);
    const nLeaves = D.leavesAt(p, day);
    const fr = frameFor(Math.max(hcm, 1));
    const sc = (G - TOP) / fr.cm;                // 1cm あたりの px
    const hpx = hcm * sc;
    const twining = !!(p.tsuru && p.tsuru.kind === 'twine' && day >= p.days.tsuru);
    const netting = !!(p.tsuru && p.tsuru.kind === 'tendril' && day >= p.days.tsuru);
    const wet = opts.wet == null ? 1 : opts.wet;
    const wilt = opts.wilt || 0;
    const soil = mix('#c9a57a', '#6d4c33', wet);

    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="scene-svg" role="img" aria-label="' + p.name + ' ' + day + 'にちめ">';
    s += '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f6ff"/><stop offset="1" stop-color="#f6fff0"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';

    // ささえ（ぼう／あみ） … まだ つるが でて いなくても たてて おく
    if (p.tsuru && p.tsuru.kind === 'twine') {
      s += '<rect x="' + (CX - 2.5) + '" y="' + TOP + '" width="5" height="' + (G - TOP + 6) + '" rx="2" fill="#d9b779" stroke="#a8844a"/>';
    }
    if (p.tsuru && p.tsuru.kind === 'tendril') {
      let net = '';
      for (let x = CX - 70; x <= CX + 70; x += 28) net += 'M' + x + ' ' + TOP + ' L' + x + ' ' + G + ' ';
      for (let y = G - 24; y >= TOP; y -= 28) net += 'M' + (CX - 70) + ' ' + y + ' L' + (CX + 70) + ' ' + y + ' ';
      s += '<path d="' + net + '" stroke="#9fb5a0" stroke-width="1" fill="none"/>';
    }

    // ちめん（よこから みた だんめん）
    s += '<rect x="0" y="' + G + '" width="' + W + '" height="' + (H - G) + '" fill="' + soil + '"/>';
    s += '<path d="M0 ' + G + ' L' + W + ' ' + G + '" stroke="' + mix(soil, '#000000', .25) + '" stroke-width="2"/>';
    for (let i = 0; i < 18; i++) s += '<circle cx="' + ((i * 53) % W) + '" cy="' + (G + 12 + (i * 17) % 40) + '" r="1.6" fill="#00000022"/>';

    // ものさし
    if (opts.ruler !== false) s += ruler(fr, sc);

    // たね・ね（つちの なか）
    const seedY = G + 16;
    if (st === 'tane' || st === 'me' || st === 'futaba') {
      const rootLen = day <= 0 ? 0 : clamp((day - p.days.me + 3) * 5, 0, 38);
      if (rootLen > 0) s += '<path d="M' + CX + ' ' + seedY + ' q-3 ' + f(rootLen / 2) + ' 2 ' + f(rootLen) + ' M' + CX + ' ' + f(seedY + rootLen * .5) + ' l-8 6 M' + CX + ' ' + f(seedY + rootLen * .7) + ' l7 6" stroke="#f1e3c6" stroke-width="2" fill="none" stroke-linecap="round"/>';
      if (!(p.id === 'ingen' && day >= p.days.me)) s += seedIcon(p, CX, seedY, .9);
    } else {
      // ね（だんめん）
      s += '<path d="M' + CX + ' ' + G + ' q-4 20 0 44 M' + CX + ' ' + (G + 16) + ' l-14 12 M' + CX + ' ' + (G + 22) + ' l13 12 M' + CX + ' ' + (G + 32) + ' l-10 10" stroke="#e8d6b0" stroke-width="2" fill="none" stroke-linecap="round"/>';
    }

    if (st === 'tane') {
      s += '<text x="' + CX + '" y="' + (G - 12) + '" text-anchor="middle" font-size="14" fill="#6d4c33">たねを まいたよ</text>';
      return s + '</svg>';
    }

    // くき
    const pts = stemPath(p, Math.max(hpx, 2), twining, netting);
    const stemW = clamp(sc * (p.id === 'himawari' ? 2 : p.id === 'minitomato' ? 1.2 : .6), 1.6, 7);
    const back = [], front = [];
    let cur = [], curFront = true;
    pts.forEach((q, i) => {
      const isF = !twining || q.depth >= 0;
      if (i > 0 && isF !== curFront) {
        cur.push(q);
        (curFront ? front : back).push(cur);
        cur = [];
      }
      curFront = isF;
      cur.push(q);
    });
    if (cur.length) (curFront ? front : back).push(cur);
    const poly = (seg, col, w) => '<polyline points="' + seg.map((q) => f(q.x) + ',' + f(q.y)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    // うしろの すじ は うすく、まえの すじ は こく（ぼうの まえを とおる）
    back.forEach((seg) => { s += poly(seg, mix(STEM, '#ffffff', .35), stemW); });
    if (p.tsuru && p.tsuru.kind === 'twine' && twining) s += '<rect x="' + (CX - 2.5) + '" y="' + TOP + '" width="5" height="' + (G - TOP + 6) + '" rx="2" fill="#d9b779" opacity=".85"/>';
    front.forEach((seg) => { s += poly(seg, STEM, stemW); });

    const tip = pts[pts.length - 1];
    const leafPx = clamp(LEAF_CM[pid] * sc, 9, 42);
    const leafFill = mix(GREEN, '#c9b458', wilt * .6);

    // ふたば（ほんばが ふえると かれて おちる）
    const futabaOn = day < p.days.honba + 18;
    if (futabaOn) {
      const fy = st === 'me' || st === 'futaba' ? tip.y : at(pts, .04).y;
      const fx = st === 'me' || st === 'futaba' ? tip.x : at(pts, .04).x;
      const open = st === 'me' ? .3 : 1;
      const fl = clamp(leafPx * .55, 8, 20) * (st === 'me' ? .6 : 1);
      const col = p.id === 'ingen' ? '#a8c66c' : mix(GREEN, '#ffffff', .15);
      s += leafShape(p.futaba.shape, fx, fy, -180 + 60 * (1 - open) + wilt * 30, fl, col, ' class="futaba"');
      s += leafShape(p.futaba.shape, fx, fy, -60 * (1 - open) - wilt * 30, fl, col, ' class="futaba"');
    }

    // ほんば … かずを かぞえられるように、データと おなじ まいすう かく
    for (let i = 0; i < nLeaves; i++) {
      const t = 0.12 + 0.84 * (i + 1) / (nLeaves + 1);
      const q = at(pts, t);
      const side = i % 2 ? 1 : -1;
      const ang = (side > 0 ? -25 : -155) + side * wilt * 45;
      const len = leafPx * (0.75 + 0.25 * Math.sin(t * Math.PI));
      s += '<line x1="' + f(q.x) + '" y1="' + f(q.y) + '" x2="' + f(q.x + side * 5) + '" y2="' + f(q.y - 3) + '" stroke="' + STEM + '" stroke-width="1.5"/>';
      s += leafShape(p.honba.shape, q.x + side * 5, q.y - 3, ang, len, leafFill, ' class="honba"');
      // まきひげ
      if (netting && i % 2 === 0) {
        s += '<path d="M' + f(q.x) + ' ' + f(q.y) + ' q' + f(-side * 4) + ' -2 ' + f(-side * 6) + ' -6 a3 3 0 1 1 ' + f(-side * 3) + ' -1 a2 2 0 1 0 ' + f(-side * 2) + ' 1" stroke="#7cb342" stroke-width="1.1" fill="none"/>';
      }
    }
    // くきの さきの わかば
    if (st !== 'me' && st !== 'futaba') s += leafShape(p.honba.shape === 'compound' || p.honba.shape === 'trifoliate' ? 'oval' : p.honba.shape, tip.x, tip.y, -90, leafPx * .4, mix(GREEN, '#d8f5a2', .5));

    // つぼみ・はな・み
    const order = ['tsubomi', 'hana', 'mi', 'tane2'];
    const k = order.indexOf(st);
    if (k >= 0) {
      const fsz = clamp(FLOWER_CM[pid] * sc, p.id === 'himawari' ? 18 : 14, p.id === 'himawari' ? 46 : 28);
      const spots = p.id === 'himawari' ? [1] : [.45, .62, .78, .92];
      spots.forEach((t, j) => {
        const q = p.id === 'himawari' ? tip : at(pts, t);
        const side = j % 2 ? -1 : 1;
        const x = p.id === 'himawari' ? q.x : q.x + side * (8 + fsz * .3), y = p.id === 'himawari' ? q.y - fsz * .2 : q.y - 4;
        if (k === 0) s += budIcon(x, y, fsz * .7);
        else if (k === 1) s += flowerIcon(p, x, y, fsz, 'open', j);
        else s += fruitIcon(p, x, y + (p.id === 'himawari' ? 0 : 4), fsz * (p.id === 'himawari' ? 1 : .6), k === 3);
      });
    }
    if (st === 'tane2') {
      // とれた たね
      for (let i = 0; i < 5; i++) s += seedIcon(p, 30 + i * 18 + (opts.ruler === false ? 0 : 40), H - 22, .5);
    }
    return s + '</svg>';
  }

  function ruler(fr, sc) {
    const x = 18;
    let s = '<g class="ruler"><rect x="' + x + '" y="' + f(G - fr.cm * sc - 6) + '" width="34" height="' + f(fr.cm * sc + 12) + '" rx="3" fill="#fff6c8" stroke="#d1a93a"/>';
    const n = Math.round(fr.cm / fr.minor);
    for (let i = 0; i <= n; i++) {
      const v = i * fr.minor;
      const y = G - v * sc;
      const major = Math.abs(v / fr.major - Math.round(v / fr.major)) < 1e-6;
      s += '<line x1="' + (x + 34) + '" y1="' + f(y) + '" x2="' + (x + 34 - (major ? 14 : 7)) + '" y2="' + f(y) + '" stroke="#5c4a12" stroke-width="' + (major ? 1.4 : .8) + '"/>';
      if (major) s += '<text x="' + (x + 3) + '" y="' + f(y + 4) + '" font-size="11" fill="#5c4a12">' + (Math.round(v * 10) / 10) + '</text>';
    }
    s += '<text x="' + (x + 17) + '" y="' + f(G - fr.cm * sc - 10) + '" font-size="11" text-anchor="middle" fill="#5c4a12">cm</text>';
    return s + '</g>';
  }

  /* つるを うえから みた ず（アサガオは 反時計回り） */
  function topView(dir) {
    const ccw = dir === 'ccw';
    // 反時計回りの や … みぎ(3じ) → うえ(12じ) → ひだり(9じ)
    const arc = ccw ? 'M78 50 A28 28 0 1 0 50 78' : 'M78 50 A28 28 0 1 1 50 78';
    return '<svg viewBox="0 0 100 100" class="topview-svg" role="img" aria-label="うえから みた つるの まきかた">' +
      '<circle cx="50" cy="50" r="40" fill="#f1fbe9" stroke="#b2d8a0"/>' +
      '<circle cx="50" cy="50" r="6" fill="#d9b779" stroke="#a8844a"/>' +
      '<path d="' + arc + '" fill="none" stroke="' + STEM + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="' + (ccw ? 'M61 78 l-11 -7 l0 14z' : 'M39 78 l11 -7 l0 14z') + '" fill="' + STEM + '"/>' +
      '<text x="50" y="96" font-size="9" text-anchor="middle" fill="#3a5a2a">うえから みた ところ</text></svg>';
  }

  /* ================= めが でる じょうけん の はち（コップと わた） ================= */
  function cupSVG(cond, day, done) {
    const c = D.fixCond(cond);
    const ok = D.germinates(cond);
    const grow = done ? 1 : clamp(day / 6, 0, 1);  // 0〜1
    let s = '<svg viewBox="0 0 120 140" class="cup-svg" role="img">';
    // コップ
    const fridge = !c.temp;
    if (fridge) s += '<rect x="2" y="6" width="116" height="132" rx="10" fill="#e7f5ff" stroke="#74c0fc" stroke-dasharray="4 3"/><text x="10" y="20" font-size="11" fill="#1971c2">❄️ 5℃</text>';
    s += '<path d="M24 60 L32 128 L88 128 L96 60Z" fill="#ffffffcc" stroke="#94a3b8" stroke-width="2"/>';
    // わた
    const cotton = c.water ? '#cfe8ff' : '#fbfbf7';
    s += '<path d="M30 104 Q40 96 50 104 Q60 96 70 104 Q80 96 90 104 L87 126 L33 126Z" fill="' + cotton + '" stroke="#cbd5e1"/>';
    // みずに しずめる
    if (!c.air) s += '<path d="M26 66 L32 126 L88 126 L94 66Z" fill="#74c0fc88"/><text x="60" y="78" font-size="10" text-anchor="middle" fill="#1864ab">みずの なか</text>';
    if (c.fert) s += '<text x="92" y="122" font-size="12">🧪</text>';
    // たね（3つぶ）
    [42, 60, 78].forEach((x, i) => {
      const y = !c.air ? 112 : 100;
      if (ok && grow > 0.15) {
        const g = clamp((grow - 0.15) / 0.85, 0, 1);
        const dark = !c.light;
        const col = dark ? '#e9e48f' : '#5aa846';
        const h = 8 + 34 * g;
        // ね
        s += '<path d="M' + x + ' ' + (y + 2) + ' q-2 ' + f(8 * g + 4) + ' 1 ' + f(16 * g + 4) + '" stroke="#f3e7cf" stroke-width="2" fill="none"/>';
        // め（くきの さきが まがって でる）
        s += '<path d="M' + x + ' ' + y + ' L' + x + ' ' + f(y - h) + '" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>';
        s += '<path d="M' + x + ' ' + f(y - h) + ' l-7 -4 M' + x + ' ' + f(y - h) + ' l7 -4" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>';
        s += seedIconSmall(x, y - h * .35, true);
      } else {
        s += seedIconSmall(x, y, false, i);
      }
    });
    // はこ（ひかり なし）
    if (!c.light && !fridge) s += '<rect x="14" y="30" width="92" height="104" rx="4" fill="#8d6e4a55" stroke="#8d6e4a" stroke-width="2" stroke-dasharray="6 3"/><text x="60" y="44" font-size="11" text-anchor="middle" fill="#5c4033">📦 はこ</text>';
    if (!c.light && fridge) s += '<text x="108" y="20" font-size="10" text-anchor="end" fill="#1971c2">くらい</text>';
    return s + '</svg>';
  }
  function seedIconSmall(x, y, opened) {
    return '<path transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (opened ? .5 : .55) + ')" d="' + seedPath('bean') + '" fill="' + (opened ? '#d9a35b' : '#c0392b') + '" stroke="#00000044"/>';
  }

  /* ================= よく そだつ じょうけん の なえ ================= */
  function seedlingSVG(cond, day) {
    const g = D.GROWTH[D.growthKey(cond)];
    const series = D.growthSeries(cond);
    const now = day <= 0 ? { cm: D.GROWTH_START.cm, leaves: D.GROWTH_START.leaves } : series[Math.min(day, series.length) - 1];
    const base = 160, sc = 4.2;            // 1cm = 4.2px（30cm まで）
    const h = now.cm * sc;
    const w = 1.2 + 3.4 * g.thick;
    let s = '<svg viewBox="0 0 120 200" class="seedling-svg" role="img">';
    s += '<path d="M22 ' + base + ' L30 196 L90 196 L98 ' + base + 'Z" fill="#c4734b" stroke="#8a4a2b"/>';
    s += '<rect x="20" y="' + (base - 4) + '" width="80" height="8" rx="3" fill="#a65d3a"/>';
    s += '<ellipse cx="60" cy="' + (base - 3) + '" rx="36" ry="4" fill="#7a5236"/>';
    const top = base - h;
    s += '<path d="M60 ' + base + ' Q' + f(60 + (g.thick < .6 ? 6 : 2)) + ' ' + f(base - h / 2) + ' 60 ' + f(top) + '" stroke="' + mix(g.color, '#3a6b20', .25) + '" stroke-width="' + f(w) + '" fill="none" stroke-linecap="round"/>';
    const n = now.leaves;
    const leafLen = 9 + 9 * g.thick;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const y = base - h * (0.25 + 0.7 * t);
      const side = i % 2 ? 1 : -1;
      s += leafShape(i < 2 ? 'heart' : 'trifoliate', 60, y, side > 0 ? -20 : -160, leafLen * (i < 2 ? .8 : 1.15), g.color, ' class="leaf"');
    }
    return s + '</svg>';
  }

  /* ================= でんぷん（ヨウ素液） ================= */
  function starchSVG(key, dyed) {
    const st = D.STARCH.find((x) => x.key === key);
    const before = key === 'before';
    const base = before ? '#f3e6c4' : '#efe2b0';
    const fill = dyed ? st.color : base;
    let s = '<svg viewBox="0 0 120 90" class="starch-svg" role="img">';
    s += '<rect x="2" y="2" width="116" height="86" rx="10" fill="#fffdf6" stroke="#e9dfc2"/>';
    if (before) {
      // たねを たてに わった ところ（子葉が 2まい）
      s += '<path d="M18 46 C18 18 102 18 102 42 C102 70 70 62 60 58 C48 66 18 72 18 46Z" fill="#c0392b" />';
      s += '<path d="M24 46 C24 24 96 24 96 42 C96 62 70 56 60 53 C50 60 24 64 24 46Z" fill="' + fill + '"/>';
      s += '<path d="M60 26 L60 54" stroke="#00000022"/>';
    } else {
      // しぼんだ 子葉
      s += '<path d="M60 84 L60 30" stroke="#5aa846" stroke-width="3"/>';
      s += '<path d="M60 52 C40 40 26 52 32 62 C40 70 54 64 60 58Z" fill="' + fill + '" stroke="#b8a04a"/>';
      s += '<path d="M60 52 C80 40 94 52 88 62 C80 70 66 64 60 58Z" fill="' + fill + '" stroke="#b8a04a"/>';
      s += '<path d="M60 30 l-10 -8 M60 30 l10 -8" stroke="#5aa846" stroke-width="3" stroke-linecap="round"/>';
    }
    if (dyed) s += '<text x="108" y="18" font-size="12" text-anchor="end">💧</text>';
    return s + '</svg>';
  }

  /* ================= はなの つくり =================
     ぶぶんごとに data-part を つける（タップで なまえ）。 */
  function flowerParts(kind, opts) {
    opts = opts || {};
    const hide = opts.hide || {};       // { oshibe:true } … とった おしべ
    const pollen = opts.pollen || 0;     // めしべに ついた 花粉
    const isAsa = kind === 'asagao';
    const col = isAsa ? '#6f7cf5' : '#fcc419';
    let s = '<svg viewBox="0 0 200 240" class="flower-svg" role="img" aria-label="' + D.FLOWERS[kind].name + '">';
    // え（くき）
    s += '<path d="M100 238 L100 170" stroke="' + STEM + '" stroke-width="5"/>';
    // ふくらみ（めばな）
    if (kind === 'hechimaM') {
      const grow = opts.fruit ? 1 : 0;
      s += '<g data-part="fukurami" class="part"><rect x="' + (90 - grow * 6) + '" y="168" width="' + (20 + grow * 12) + '" height="' + (52 + grow * 18) + '" rx="10" fill="#7cb342" stroke="#4d7a22"/>' +
        '<path d="M92 180 L108 180 M92 192 L108 192 M92 204 L108 204" stroke="#5c8a2f" stroke-dasharray="2 2"/></g>';
    }
    // がく
    s += '<g data-part="gaku" class="part">';
    for (let i = -2; i <= 2; i++) s += '<path d="M100 172 L' + (100 + i * 14) + ' 150 L' + (100 + i * 9) + ' 168Z" fill="#6aa84f" stroke="#3f7a2a"/>';
    s += '</g>';
    // はなびら
    s += '<g data-part="hanabira" class="part">';
    if (isAsa) {
      s += '<path d="M100 170 L74 112 C40 104 26 70 40 48 C70 30 130 30 160 48 C174 70 160 104 126 112Z" fill="' + col + '" stroke="#4c5bd4" stroke-width="2"/>';
      s += '<ellipse cx="100" cy="52" rx="60" ry="16" fill="' + mix(col, '#ffffff', .4) + '" stroke="#4c5bd4"/>';
      for (let i = 0; i < 5; i++) s += '<path d="M100 166 L' + (52 + i * 24) + ' 52" stroke="#ffffff88" stroke-width="2"/>';
    } else {
      for (let i = 0; i < 5; i++) s += '<path d="M100 150 C' + 70 + ' 130 ' + 64 + ' 86 100 74 C136 86 130 130 100 150Z" fill="' + col + '" stroke="#e8a400" stroke-width="1.5" transform="rotate(' + (i * 72 - 144) + ' 100 120)" opacity=".95"/>';
    }
    s += '</g>';
    // めしべ（おしべより さきに かく。おしべを タップ しやすく する）
    if (D.FLOWERS[kind].parts.includes('meshibe')) {
      const topY = isAsa ? 70 : 102;
      s += '<g data-part="meshibe" class="part"><path d="M100 166 L100 ' + topY + '" stroke="#e9f5d0" stroke-width="4"/>' +
        '<circle cx="100" cy="' + (topY - 4) + '" r="7" fill="#fff4b0" stroke="#c9a227" stroke-width="1.5"/>' +
        '<circle cx="100" cy="' + (topY - 2) + '" r="' + (isAsa ? 14 : 20) + '" fill="#fff" fill-opacity="0"/>';
      for (let i = 0; i < Math.min(pollen, 8); i++) s += '<circle cx="' + (96 + (i * 3) % 9) + '" cy="' + (topY - 6 + (i * 5) % 6) + '" r="1.8" fill="#f59f00"/>';
      s += '</g>';
    }
    // おしべ
    if (D.FLOWERS[kind].parts.includes('oshibe') && !hide.oshibe) {
      s += '<g data-part="oshibe" class="part">' + (isAsa ? '<rect x="70" y="74" width="60" height="40" fill="#fff" fill-opacity="0"/>' : '<rect x="78" y="92" width="44" height="30" fill="#fff" fill-opacity="0"/>');
      const xs = isAsa ? [80, 90, 110, 120, 100] : [88, 96, 104, 112];
      xs.forEach((x, i) => {
        const topY = isAsa ? 84 + (i === 4 ? 6 : 0) : 104;
        s += '<path d="M100 162 Q' + x + ' 130 ' + x + ' ' + topY + '" stroke="#f1f3c8" stroke-width="3" fill="none"/>';
        s += '<ellipse cx="' + x + '" cy="' + (topY - 3) + '" rx="4" ry="6" fill="#ffe066" stroke="#d4a017"/>';
      });
      s += '</g>';
    }
    if (opts.bag) s += '<path d="M28 20 L172 20 L180 200 Q100 214 20 200Z" fill="#ffffff66" stroke="#adb5bd" stroke-dasharray="5 3" stroke-width="2" pointer-events="none"/>';
    return s + '</svg>';
  }

  /* 受粉の あとの けっか（み が できた／かれた） */
  function fruitResult(kind, ok) {
    let s = '<svg viewBox="0 0 120 120" class="result-svg" role="img">';
    s += '<path d="M60 118 L60 66" stroke="' + STEM + '" stroke-width="4"/>';
    if (ok) {
      if (kind === 'asagao') s += '<circle cx="60" cy="54" r="22" fill="#8bc34a" stroke="#4d7a22"/><path d="M42 36 L60 46 L78 36" stroke="#6aa84f" stroke-width="4" fill="none"/>';
      else s += '<rect x="46" y="16" width="28" height="80" rx="14" fill="#5c940d" stroke="#3e6b1f"/>';
      s += '<text x="60" y="114" font-size="11" text-anchor="middle" fill="#2b8a3e">み が できた</text>';
    } else {
      s += '<path d="M60 66 C52 60 48 52 54 46 C58 50 62 50 66 46 C72 52 68 60 60 66Z" fill="#c9b47a" stroke="#8a7a4a"/>';
      s += '<text x="60" y="114" font-size="11" text-anchor="middle" fill="#868e96">かれて おちた</text>';
    }
    return s + '</svg>';
  }

  const API = { mix, leafShape, seedCard, seedIcon, plantScene, frameFor, FRAMES, topView, cupSVG, seedlingSVG, starchSVG, flowerParts, fruitResult };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ART = API;
})(this);
