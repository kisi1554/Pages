/* かみひこうき グライダー — おりがみ の けいさん（DOM なし）
 *
 * かみ は「そう（layer）」の あつまり。1まい の そう は とつ（でっぱり だけ）の たかくけい。
 * おる＝おりせん で かみ を 2つ に わけ、かたほう（flap）を おりせん で うらがえして うえ に かさねる。
 * ほんもの の おりかた と おなじ に、その がわ に ある そう は ぜんぶ いっしょ に おれる。
 * ざひょう: かみ は 210×296（A4 の かたち）、まんなか が (0,0)、y は した が +。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Fold = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const W = 105, H = 148;
  const paper = () => [{ pts: [[-W, -H], [W, -H], [W, H], [-W, H]], back: false, tag: "" }];

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const side = (ax, p) => cross(sub(ax.b, ax.a), sub(p, ax.a));

  /* A を B に かさねる おりせん（すいちょく 2とうぶんせん） */
  function axisFromTo(from, to) {
    const m = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const d = sub(to, from), L = Math.hypot(d[0], d[1]);
    const u = [-d[1] / L, d[0] / L];
    return { a: [m[0] - u[0] * 600, m[1] - u[1] * 600], b: [m[0] + u[0] * 600, m[1] + u[1] * 600], flapSign: Math.sign(side({ a: [m[0] - u[0] * 600, m[1] - u[1] * 600], b: [m[0] + u[0] * 600, m[1] + u[1] * 600] }, from)) };
  }
  function axisOf(f) {
    if (f.from) return axisFromTo(f.from, f.to);
    const ax = { a: f.a, b: f.b };
    ax.flapSign = Math.sign(side(ax, f.flap));
    return ax;
  }

  /* たかくけい を おりせん で きる（sign の がわ を のこす） */
  function clip(pts, ax, sign) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const sp = side(ax, p) * sign, sq = side(ax, q) * sign;
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return area(out) > 0.5 ? out : null;
  }
  function area(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) s += cross(pts[i], pts[(i + 1) % pts.length]);
    return Math.abs(s) / 2;
  }
  /* おりせん に たいして うつす（t=1 で ぴったり うらがえし。0〜1 は とちゅう の え） */
  function project(p, ax, t) {
    const d = sub(ax.b, ax.a), L = Math.hypot(d[0], d[1]);
    const n = [-d[1] / L, d[0] / L];
    const dist = (p[0] - ax.a[0]) * n[0] + (p[1] - ax.a[1]) * n[1];
    const k = (1 - Math.cos(Math.PI * t)) * dist;
    return [p[0] - n[0] * k, p[1] - n[1] * k];
  }
  function reflect(p, ax) { return project(p, ax, 1); }

  /* 1かい おる。onlyTag が ある とき は その そう だけ おる */
  function applyFold(layers, f) {
    const ax = axisOf(f);
    const keep = [], flap = [];
    for (const L of layers) {
      if (f.onlyTag && L.tag !== f.onlyTag) { keep.push(L); continue; }
      const k = clip(L.pts, ax, -ax.flapSign);
      const fl = clip(L.pts, ax, ax.flapSign);
      if (k) keep.push({ pts: k, back: L.back, tag: L.tag });
      if (fl) flap.push({ pts: fl, back: L.back, tag: L.tag });
    }
    const moved = flap.reverse().map((L) => ({ pts: L.pts.map((p) => reflect(p, ax)), back: !L.back, tag: f.tag || L.tag }));
    return keep.concat(moved);
  }

  /* 1ステップ（おなじ に おる おりせん が 1〜2ほん）を おわらせる */
  function applyStep(layers, st) {
    for (const f of st.folds) layers = applyFold(layers, f);
    return layers;
  }

  /* とちゅう の え: うごかない ところ と、t だけ おれて いる flap */
  function stepFrame(layers, st, t) {
    const axes = st.folds.map(axisOf);
    const stay = [], moving = [];
    for (const L of layers) {
      let pieces = [{ pts: L.pts, back: L.back, tag: L.tag }];
      axes.forEach((ax, i) => {
        const f = st.folds[i];
        const next = [];
        for (const P of pieces) {
          if (P.moving != null || (f.onlyTag && P.tag !== f.onlyTag)) { next.push(P); continue; }
          const k = clip(P.pts, ax, -ax.flapSign), fl = clip(P.pts, ax, ax.flapSign);
          if (k) next.push({ pts: k, back: P.back, tag: P.tag });
          if (fl) next.push({ pts: fl, back: P.back, tag: P.tag, moving: i });
        }
        pieces = next;
      });
      for (const P of pieces) (P.moving != null ? moving : stay).push(P);
    }
    const fr = stay.map((P) => ({ pts: P.pts, back: P.back }));
    moving.reverse().forEach((P) => {
      const ax = axes[P.moving];
      fr.push({ pts: P.pts.map((p) => project(p, ax, t)), back: t > 0.5 ? !P.back : P.back, moving: true });
    });
    return fr;
  }

  /* おりせん の みえる ぶぶん（かみ の はんい に きりとる） */
  function axisSegment(layers, f) {
    const ax = axisOf(f);
    let lo = Infinity, hi = -Infinity;
    const d = sub(ax.b, ax.a), L = Math.hypot(d[0], d[1]);
    const u = [d[0] / L, d[1] / L];
    for (const Ly of layers) {
      if (f.onlyTag && Ly.tag !== f.onlyTag) continue;
      const pts = Ly.pts;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const sp = side(ax, p), sq = side(ax, q);
        const hit = (pt) => { const s = (pt[0] - ax.a[0]) * u[0] + (pt[1] - ax.a[1]) * u[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); };
        if (Math.abs(sp) < 1e-6) hit(p);
        if ((sp > 0) !== (sq > 0) && Math.abs(sp - sq) > 1e-9) {
          const t = sp / (sp - sq);
          hit([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
        }
      }
    }
    if (lo === Infinity) return null;
    return [[ax.a[0] + u[0] * lo, ax.a[1] + u[1] * lo], [ax.a[0] + u[0] * hi, ax.a[1] + u[1] * hi]];
  }

  /* flap の まんなか と、おった あと の ばしょ（やじるし よう） */
  function flapArrow(layers, f) {
    const ax = axisOf(f);
    let sx = 0, sy = 0, sa = 0;
    for (const L of layers) {
      if (f.onlyTag && L.tag !== f.onlyTag) continue;
      const fl = clip(L.pts, ax, ax.flapSign);
      if (!fl) continue;
      const a = area(fl);
      const c = fl.reduce((m, p) => [m[0] + p[0] / fl.length, m[1] + p[1] / fl.length], [0, 0]);
      sx += c[0] * a; sy += c[1] * a; sa += a;
    }
    if (!sa) return null;
    const from = [sx / sa, sy / sa];
    return { from, to: reflect(from, ax) };
  }

  function bbox(layers) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const L of layers) for (const p of L.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return { x0, y0, x1, y1 };
  }
  function totalArea(layers) { return layers.reduce((s, L) => s + area(L.pts), 0); }

  /* ---------- 3しゅ の おりかた（ほんもの の おりかた を かんたん に） ---------- */
  const R = Math.SQRT2;
  const STEPS = {
    /* やり ひこうき: かど を まんなか へ 2かい → はんぶん → つばさ */
    yari: [
      { text: "うえ の かど を まんなか の せん に あわせて おろう", folds: [{ from: [-W, -H], to: [0, -H + W] }, { from: [W, -H], to: [0, -H + W] }] },
      { text: "ななめ の ふち を もういちど まんなか に あわせて おろう", folds: [{ from: [-W, -H + W], to: [0, -H + W * R] }, { from: [W, -H + W], to: [0, -H + W * R] }] },
      { text: "まんなか で はんぶん に おろう", folds: [{ from: [-W, 60], to: [W, 60] }], half: true },
      { text: "つばさ を おりさげよう（はんたいがわ も おなじ）", folds: [{ a: [24, -300], b: [24, 300], flap: [80, 100] }] },
    ],
    /* へそ ひこうき: かど → さんかく を おろす → かど → さき を おりあげて とめる（へそ） */
    heso: [
      { text: "うえ の かど を まんなか の せん に あわせて おろう", folds: [{ from: [-W, -H], to: [0, -H + W] }, { from: [W, -H], to: [0, -H + W] }] },
      { text: "さんかく の ところ を した へ おりさげよう", folds: [{ from: [0, -H], to: [0, -H + 2 * W], tag: "tip" }] },
      { text: "りょうほう の かど を まんなか に あわせて おろう（さき が すこし のこる）", folds: [{ from: [-W, -H + W], to: [0, 0] }, { from: [W, -H + W], to: [0, 0] }] },
      { text: "のこった さき を うえ に おりあげて とめよう（これ が へそ！）", folds: [{ a: [-200, 26], b: [200, 26], flap: [0, 55], onlyTag: "tip" }] },
    ],
    /* つばさ ひろ ひこうき: うえ を 2かい おりさげる → かど → はんぶん */
    tsubasa: [
      { text: "うえ の ふち を すこし おりさげよう", folds: [{ from: [0, -H], to: [0, -H + 70] }] },
      { text: "もういちど おりさげよう（まえ が おもく なる）", folds: [{ a: [-200, -H + 70], b: [200, -H + 70], flap: [0, -H + 50] }] },
      { text: "りょうはし の かど を すこし おろう", folds: [{ from: [-W, -H + 70], to: [-W + 46, -H + 116] }, { from: [W, -H + 70], to: [W - 46, -H + 116] }] },
      { text: "まんなか で はんぶん に おって、つばさ を ひろげよう", folds: [{ from: [-W, 60], to: [W, 60] }], half: true },
    ],
  };

  /* でき あがり を うえ から みた かたち（はんぶん に おる まえ） */
  function topView(id) {
    let L = paper();
    for (const st of STEPS[id]) { if (st.half) break; L = applyStep(L, st); }
    return L;
  }
  function finalLayers(id) {
    let L = paper();
    for (const st of STEPS[id]) L = applyStep(L, st);
    return L;
  }

  return {
    W, H, paper, axisOf, applyFold, applyStep, stepFrame, axisSegment, flapArrow,
    reflect, project, area, totalArea, bbox, STEPS, topView, finalLayers,
  };
});
