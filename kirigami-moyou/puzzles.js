/* ============================================================
   きりがみ もよう — もんだい 12もん
   おてほん は「なぞる せん（ドメインの ざひょう）」で かいて、こどもと おなじ makeCut で きりとりに する。
   → ヒントの てんてん を そのまま なぞれば かならず できる。
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./geom.js"));
  else root.KP = factory(root.KG);
})(typeof self !== "undefined" ? self : this, function (KG) {
  "use strict";
  const rad = (d) => (d * Math.PI) / 180;
  const pol = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];

  // えん の いちぶ（かくど a0 → a1、ど）
  function arc(cx, cy, r, a0, a1, n) {
    n = n || 40;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = rad(a0 + ((a1 - a0) * i) / n);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  }
  // だえん（とじた せん）。rot = ながい じく の むき
  function ellipse(cx, cy, rx, ry, rotDeg, n) {
    n = n || 48;
    const c = Math.cos(rad(rotDeg || 0)), s = Math.sin(rad(rotDeg || 0)), out = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  }
  // ハートの きょくせん（t=0 が うえの くぼみ、t=π が したの さき）
  function heart(t) {
    const s = Math.sin(t);
    return [16 * s * s * s, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)];
  }
  function heartPath(t0, t1, n, scale, cx, cy, rotDeg) {
    const c = Math.cos(rad(rotDeg || 0)), s = Math.sin(rad(rotDeg || 0)), out = [];
    for (let i = 0; i <= n; i++) {
      const [x, y] = heart(t0 + ((t1 - t0) * i) / n);
      out.push([cx + scale * (x * c - y * s), cy + scale * (x * s + y * c)]);
    }
    return out;
  }
  // Catmull-Rom で なめらかに
  function smooth(ctrl, k) {
    k = k || 10;
    const out = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    out.push(ctrl[ctrl.length - 1].slice());
    return out;
  }
  // おりめ の うえに ある 三角（さんかく）の きりこみ: せん の うえ の a→b、まんなか を h だけ うちがわへ
  function notch(a, b, inward, h) {
    const m = [(a[0] + b[0]) / 2 + inward[0] * h, (a[1] + b[1]) / 2 + inward[1] * h];
    return [a, m, b];
  }
  const IN_OB = [Math.sin(rad(30)), -Math.cos(rad(30))]; // ゆき: 30° の おりめ から うちがわ へ
  const IN_DIAG = [Math.SQRT1_2, -Math.SQRT1_2];          // 8つおり: ななめ の おりめ から うちがわ へ

  // ほし（5かく）の みぎ はんぶん
  function starHalf(cy, R, r) {
    const out = [];
    for (let k = 0; k <= 5; k++) {
      const a = rad(90 - 36 * k), rr = k % 2 ? r : R;
      out.push([Math.max(0, rr * Math.cos(a)), cy + rr * Math.sin(a)]);
    }
    return out;
  }

  const LIST = [
    { id: "maru", name: "まる", emoji: "⚪", fold: "half", color: "#e03131",
      tip: "おりめ から はじめて はんぶん の まる",
      strokes: [arc(0, 0, 0.45, 90, -90)] },
    { id: "heart", name: "ハート", emoji: "💗", fold: "half", color: "#f06595",
      tip: "おりめ に はんぶん の ハート",
      strokes: [heartPath(0, Math.PI, 48, 0.031, 0, 0.09)] },
    { id: "hishi", name: "ひしがた", emoji: "🔶", fold: "quarter", color: "#f76707",
      tip: "まんなか の かど を まっすぐ チョキン",
      strokes: [[[0.4, 0], [0, 0.4]]] },
    { id: "mado", name: "まど", emoji: "🪟", fold: "quarter", color: "#1c7ed6",
      tip: "まんなかに まるを 1つ",
      strokes: [ellipse(0.52, 0.52, 0.2, 0.2, 0)] },
    { id: "hoshi", name: "ほし", emoji: "⭐", fold: "half", color: "#fcc419",
      tip: "おりめ に はんぶん の ほし",
      strokes: [starHalf(0.06, 0.66, 0.27)] },
    { id: "chocho", name: "ちょうちょ", emoji: "🦋", fold: "half", color: "#7048e8",
      tip: "おりめ に はね を 1まい",
      strokes: [smooth([[0, 0.12], [0.16, 0.46], [0.45, 0.62], [0.62, 0.42], [0.46, 0.14], [0.16, 0.02], [0.44, -0.12], [0.52, -0.38], [0.32, -0.52], [0.12, -0.32], [0, -0.22]], 8)] },
    { id: "yotsuba", name: "よつば", emoji: "🍀", fold: "quarter", color: "#2f9e44",
      tip: "さき を まんなか に むけた ハート",
      strokes: [heartPath(0, Math.PI * 2, 72, 0.017, 0.44, 0.44, -45)] },
    { id: "hana", name: "はな", emoji: "🌸", fold: "eighth", color: "#f06595",
      tip: "まんなか の かど と、はなびら 1まい",
      strokes: [arc(0, 0, 0.16, 0, 45, 16), ellipse(0.55 * Math.cos(rad(22.5)), 0.55 * Math.sin(rad(22.5)), 0.22, 0.085, 22.5)] },
    { id: "ohisama", name: "おひさま", emoji: "☀️", fold: "eighth", color: "#f76707",
      tip: "まんなか の まる と、おりめ に さんかく",
      strokes: [arc(0, 0, 0.28, 0, 45, 20), notch([0.45, 0], [0.68, 0], [0, 1], 0.11), notch(pol(0.45, 45), pol(0.68, 45), IN_DIAG, 0.11)] },
    { id: "kusari", name: "くさり", emoji: "⛓️", fold: "eighth", color: "#22b8cf",
      tip: "おりめ に よこながの だえん と たてながの だえん",
      strokes: [arc(0, 0, 0.12, 0, 45, 12), ellipse(0.62, 0, 0.08, 0.36, 0).slice(0, 25), ellipse(0.62 * Math.SQRT1_2, 0.62 * Math.SQRT1_2, 0.2, 0.11, 45).slice(24)] },
    { id: "kessho", name: "ゆきの けっしょう", emoji: "❄️", fold: "snow", color: "#1c7ed6",
      tip: "かど と おりめ と そと を ギザギザ",
      strokes: [
        [[0.11, 0], pol(0.11, 30)],
        notch([0.3, 0], [0.44, 0], [0, 1], 0.075),
        notch(pol(0.46, 30), pol(0.6, 30), IN_OB, 0.075),
        [[0.86, 0], [0.7, 0.1], [0.8, 0.3], pol(0.66, 30)],
      ] },
    { id: "yukibana", name: "ゆきの はな", emoji: "💠", fold: "snow", color: "#7048e8",
      tip: "まんなか の まる、つぶ 1こ、そと を なみなみ",
      strokes: [
        arc(0, 0, 0.2, 0, 30, 12),
        ellipse(0.5 * Math.cos(rad(15)), 0.5 * Math.sin(rad(15)), 0.06, 0.06, 0, 32),
        Array.from({ length: 31 }, (_, i) => pol(0.8 + 0.07 * Math.sin((i / 30) * Math.PI * 2), i))
          .concat([pol(0.8, 30)]),
      ] },
  ];

  for (const p of LIST) p.cuts = p.strokes.map((s) => KG.makeCut(p.fold, s)).filter(Boolean);

  return { LIST, CLEAR: 0.85, helpers: { arc, ellipse, heartPath, smooth, notch } };
});
