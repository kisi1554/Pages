// ももたろう 鬼伝 ― え（SVG）を その場で かく
// キャラクターは「あしもと＝(0,0)」で かき、translate/scale で おく。
(function () {
  "use strict";
  const K = "#111";
  const A = {};

  function rng(seed) {
    let s = seed % 2147483647 || 7;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const f1 = (n) => Math.round(n * 10) / 10;

  // ---------- わく・はいけい ----------
  A.svg = (inner, vb = "0 0 400 300", par = "xMidYMid meet") =>
    `<svg class="art" viewBox="${vb}" preserveAspectRatio="${par}" aria-hidden="true">${inner}</svg>`;
  A.bg = (fill) => `<rect x="-600" y="-600" width="1700" height="1500" fill="${fill}"/>`;
  A.tone = (op = 0.35, id = "tone") => `<rect x="-600" y="-600" width="1700" height="1500" fill="url(#${id})" opacity="${op}"/>`;
  A.ground = (y, fill, line = K) =>
    `<rect x="-600" y="${y}" width="1700" height="900" fill="${fill}"/><line x1="-600" y1="${y}" x2="1100" y2="${y}" stroke="${line}" stroke-width="3"/>`;

  // しゅうちゅうせん（まんがの ほうしゃせん）
  A.speed = (cx, cy, o = {}) => {
    const n = o.n || 64, r0 = o.r0 || 70, r1 = o.r1 || 700, w = o.w || 16, rnd = rng(o.seed || 11);
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.08;
      const ri = r0 + rnd() * r0 * 0.9;
      const hw = ((0.25 + rnd()) * w) / (2 * r1);
      d += `M${f1(cx + Math.cos(a) * ri)},${f1(cy + Math.sin(a) * ri)}L${f1(cx + Math.cos(a - hw) * r1)},${f1(cy + Math.sin(a - hw) * r1)}L${f1(cx + Math.cos(a + hw) * r1)},${f1(cy + Math.sin(a + hw) * r1)}Z`;
    }
    return `<path d="${d}" fill="${o.col || K}" opacity="${o.op || 1}"/>`;
  };
  // よこの スピードせん
  A.hspeed = (o = {}) => {
    const rnd = rng(o.seed || 5), n = o.n || 26;
    let d = "";
    for (let i = 0; i < n; i++) {
      const y = (o.y0 || 0) + rnd() * (o.h || 300), x = -100 + rnd() * 500, l = 60 + rnd() * 220;
      d += `M${f1(x)},${f1(y)}h${f1(l)}`;
    }
    return `<path d="${d}" stroke="${o.col || K}" stroke-width="${o.w || 2}" opacity="${o.op || 0.6}"/>`;
  };
  A.moon = (x, y, r, col = "#c92a2a") =>
    `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="url(#glowR)" opacity=".7"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.25}" fill="#000" opacity=".15"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.15}" fill="#000" opacity=".15"/>`;
  A.sun = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="url(#glowY)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff3bf" stroke="${K}" stroke-width="2"/>`;
  A.river = (y, col = "#1b2b3d") => {
    let w = "";
    for (let i = 0; i < 6; i++) {
      const yy = y + 14 + i * 16;
      w += `<path d="M-400,${yy} q20,-8 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" fill="none" stroke="#fff" stroke-width="2" opacity="${0.15 + i * 0.05}"/>`;
    }
    return `<rect x="-600" y="${y}" width="1700" height="900" fill="${col}"/>${w}`;
  };
  A.flame = (x, y, s = 1, c1 = "#ff6b00", c2 = "#ffd43b") =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M0,0 C-26,-6 -24,-44 -8,-66 C-6,-48 4,-50 2,-84 C24,-58 30,-22 0,0Z" fill="${c1}" stroke="${K}" stroke-width="2.5"/><path d="M0,-4 C-12,-8 -10,-28 -2,-40 C0,-30 8,-30 6,-48 C16,-30 14,-10 0,-4Z" fill="${c2}"/></g>`;
  A.house = (x, y, s = 1, burn = false) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="-40" y="-42" width="80" height="42" fill="#e9ecef" stroke="${K}" stroke-width="3"/><rect x="-10" y="-28" width="20" height="28" fill="#343a40"/><path d="M-54,-38 L0,-84 L54,-38Z" fill="#868e96" stroke="${K}" stroke-width="3"/><path d="M-30,-50 L-8,-74 M-10,-46 L8,-76 M12,-46 L26,-62" stroke="${K}" stroke-width="2"/>${burn ? A.flame(-20, -60, 0.8) + A.flame(22, -54, 0.6) + A.flame(0, -78, 0.9) : ""}</g>`;
  A.tree = (x, y, s = 1, col = "#2b2b2b") =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="-6" y="-60" width="12" height="60" fill="${col}"/><path d="M0,-130 L-40,-50 L40,-50Z M0,-150 L-30,-90 L30,-90Z" fill="${col}"/></g>`;
  A.rock = (x, y, s = 1, col = "#495057") =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M-50,0 L-38,-40 L-10,-58 L22,-48 L46,-20 L54,0Z" fill="${col}" stroke="${K}" stroke-width="3"/><path d="M-10,-58 L-4,-24 L22,-48 M-38,-40 L-4,-24 L46,-20" stroke="${K}" stroke-width="2" fill="none"/></g>`;
  A.light = (x, y, s = 1, col = "#ffe066") =>
    `<g transform="translate(${x},${y}) scale(${s})"><circle r="30" fill="url(#glowY)"/><path d="M0,-14 C10,-14 14,-4 12,4 C10,12 4,16 0,30 C-4,16 -10,12 -12,4 C-14,-4 -10,-14 0,-14Z" transform="rotate(180)" fill="${col}" stroke="#fff" stroke-width="2"/></g>`;
  A.island = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M-120,0 L-90,-50 L-70,-60 L-60,-110 L-40,-80 L-20,-130 L0,-96 L20,-140 L40,-84 L60,-112 L72,-60 L96,-46 L124,0Z" fill="#212529" stroke="${K}" stroke-width="3"/><path d="M-30,-60 Q-18,-76 -6,-60 Q-18,-50 -30,-60Z M6,-60 Q18,-76 30,-60 Q18,-50 6,-60Z" fill="#c92a2a"/><path d="M-20,-30 L-12,-40 L-4,-30 L4,-40 L12,-30 L20,-40 L20,-24 L-20,-24Z" fill="#000"/></g>`;
  A.dango = (x, y, s = 1, rot = 0) =>
    `<g transform="translate(${x},${y}) scale(${s}) rotate(${rot})"><line x1="0" y1="20" x2="0" y2="-70" stroke="#b08968" stroke-width="4" stroke-linecap="round"/><circle cy="-8" r="13" fill="#fff3bf" stroke="${K}" stroke-width="2.5"/><circle cy="-32" r="13" fill="#ffe8cc" stroke="${K}" stroke-width="2.5"/><circle cy="-56" r="13" fill="#fff3bf" stroke="${K}" stroke-width="2.5"/></g>`;
  A.horn = (col = "#fff3bf", x = 0, y = 0, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M-14,0 Q-10,-30 8,-58 Q2,-28 14,0Z" fill="${col}" stroke="${K}" stroke-width="3"/><path d="M-12,-6 L12,-6" stroke="${K}" stroke-width="2"/></g>`;

  // ---------- もも ----------
  const peachPath = "M0,-36 C26,-38 40,-10 34,12 C28,32 10,40 0,40 C-10,40 -28,32 -34,12 C-40,-10 -26,-38 0,-36Z";
  A.peach = (x, y, s = 1, glow = true) =>
    `<g transform="translate(${x},${y}) scale(${s})">${glow ? '<circle r="80" fill="url(#glowP)"/>' : ""}<path d="${peachPath}" fill="#ffc9c9" stroke="${K}" stroke-width="3"/><path d="M-30,12 C-28,28 -12,36 0,38 C-14,30 -22,20 -30,12Z" fill="#ff8787" opacity=".7"/><path d="M0,-34 C-8,-10 -6,20 0,40" stroke="${K}" stroke-width="2" fill="none"/><path d="M2,-36 C12,-54 32,-52 36,-44 C26,-36 12,-34 2,-36Z" fill="#40c057" stroke="${K}" stroke-width="2"/></g>`;
  A.peachOpen = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})">${A.speed(0, -10, { n: 40, r0: 30, r1: 400, col: "#fff3bf", w: 30, seed: 3 })}<circle r="70" fill="url(#glowY)"/>
     <g transform="translate(-26,10) rotate(-28)"><path d="M0,-36 C-26,-38 -40,-10 -34,12 C-28,32 -10,40 0,40Z" fill="#ffc9c9" stroke="${K}" stroke-width="3"/></g>
     <g transform="translate(26,10) rotate(28)"><path d="M0,-36 C26,-38 40,-10 34,12 C28,32 10,40 0,40Z" fill="#ffc9c9" stroke="${K}" stroke-width="3"/></g>
     ${A.baby(0, 6, 0.9)}</g>`;
  A.baby = (x, y, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M-22,30 Q-26,0 0,-4 Q26,0 22,30Z" fill="#ffa8a8" stroke="${K}" stroke-width="2.5"/><circle cy="-18" r="18" fill="#ffe3cf" stroke="${K}" stroke-width="2.5"/><path d="M-2,-36 q6,-8 2,-12 q10,4 4,14" fill="${K}"/><path d="M-9,-19 q3,-3 6,0 M4,-19 q3,-3 6,0" stroke="${K}" stroke-width="2" fill="none"/><path d="M-5,-10 q5,5 10,0" stroke="${K}" stroke-width="2" fill="#ff8787"/><circle cx="-12" cy="-12" r="3" fill="#ff8787" opacity=".6"/><circle cx="12" cy="-12" r="3" fill="#ff8787" opacity=".6"/></g>`;

  // ---------- ひと ----------
  A.elder = (x, y, s = 1, o = {}) => {
    const baba = o.kind !== "jiji", f = o.flip ? -1 : 1;
    const hair = baba
      ? `<circle cx="-2" cy="-104" r="9" fill="#ced4da" stroke="${K}" stroke-width="2"/><path d="M-15,-88 Q-14,-104 0,-102 Q14,-104 15,-88 Q8,-96 0,-95 Q-8,-96 -15,-88Z" fill="#ced4da" stroke="${K}" stroke-width="2"/>`
      : `<path d="M-15,-84 Q-18,-92 -14,-94 M15,-84 Q18,-92 14,-94" stroke="#dee2e6" stroke-width="5" stroke-linecap="round"/><path d="M-10,-76 Q0,-50 10,-76 Q0,-72 -10,-76Z" fill="#f1f3f5" stroke="${K}" stroke-width="2"/>`;
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})"><path d="M-20,-70 Q0,-78 20,-70 L26,0 L-26,0Z" fill="${baba ? "#9c6644" : "#5c677d"}" stroke="${K}" stroke-width="3"/><path d="M-8,-72 L0,-56 L8,-72" stroke="${K}" stroke-width="2" fill="none"/><rect x="-20" y="-42" width="40" height="7" fill="${baba ? "#e9c46a" : "#343a40"}" stroke="${K}" stroke-width="2"/><circle cx="0" cy="-86" r="15" fill="#ffe3cf" stroke="${K}" stroke-width="2.5"/>${hair}<path d="M-8,-88 q3,2 6,0 M4,-88 q3,2 6,0" stroke="${K}" stroke-width="2" fill="none"/><path d="M14,-62 Q26,-52 22,-40" stroke="${K}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M14,-62 Q26,-52 22,-40" stroke="${baba ? "#9c6644" : "#5c677d"}" stroke-width="5" stroke-linecap="round" fill="none"/></g>`;
  };

  // ももたろう（みぎむき）。pose: stand | slash | guard
  A.momo = (x, y, s = 1, o = {}) => {
    const f = o.flip ? -1 : 1, pose = o.pose || "stand";
    let arm, sword;
    if (pose === "slash") {
      arm = `<path d="M18,-92 L44,-86" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M18,-92 L44,-86" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
      sword = `<path d="M-30,-190 A120,120 0 0,1 120,-40" stroke="#fff" stroke-width="16" fill="none" opacity=".85"/><path d="M-30,-190 A120,120 0 0,1 120,-40" stroke="#c92a2a" stroke-width="4" fill="none"/><line x1="44" y1="-86" x2="120" y2="-46" stroke="${K}" stroke-width="9" stroke-linecap="round"/><line x1="52" y1="-82" x2="120" y2="-46" stroke="#f1f3f5" stroke-width="4" stroke-linecap="round"/><line x1="36" y1="-90" x2="48" y2="-84" stroke="#c92a2a" stroke-width="7" stroke-linecap="round"/>`;
    } else {
      arm = `<path d="M18,-92 L30,-76" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M18,-92 L30,-76" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
      const tip = pose === "guard" ? "86,-120" : "76,-164";
      const [tx, ty] = tip.split(",");
      sword = `<line x1="30" y1="-78" x2="${tx}" y2="${ty}" stroke="${K}" stroke-width="9" stroke-linecap="round"/><line x1="36" y1="-88" x2="${tx}" y2="${ty}" stroke="#f1f3f5" stroke-width="4" stroke-linecap="round"/><line x1="24" y1="-68" x2="33" y2="-83" stroke="#c92a2a" stroke-width="7" stroke-linecap="round"/><ellipse cx="33" cy="-84" rx="7" ry="3" fill="#ffd43b" stroke="${K}" stroke-width="1.5" transform="rotate(-50 33 -84)"/>`;
    }
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})">
      <path d="M-20,-130 C-40,-136 -54,-124 -70,-130 C-60,-116 -44,-118 -22,-122Z M-20,-126 C-36,-118 -50,-110 -62,-104 C-46,-104 -34,-112 -20,-120Z" fill="#fff" stroke="${K}" stroke-width="2"/>
      <path d="M-20,-52 L-32,0 L-6,0 L0,-32 L6,0 L32,0 L20,-52Z" fill="#343a40" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-24,-98 Q0,-106 24,-98 L22,-50 L-22,-50Z" fill="#fff" stroke="${K}" stroke-width="3"/>
      <path d="M-24,-98 L-28,-50 L-14,-50 L-10,-96Z M24,-98 L28,-50 L14,-50 L10,-96Z" fill="#c92a2a" stroke="${K}" stroke-width="2.5"/>
      <path d="M-9,-100 L0,-82 L9,-100" fill="none" stroke="${K}" stroke-width="2"/>
      <circle cx="0" cy="-72" r="6" fill="#ff8787" stroke="${K}" stroke-width="2"/>
      <rect x="-22" y="-60" width="44" height="9" fill="#f8f9fa" stroke="${K}" stroke-width="2"/>
      <path d="M-20,-94 L-34,-68" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M-20,-94 L-34,-68" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <path d="M-26,-118 L-36,-146 L-18,-140 L-16,-164 L-2,-148 L8,-168 L14,-146 L32,-156 L26,-132 L32,-120Z" fill="${K}"/>
      <circle cx="0" cy="-120" r="22" fill="#ffe3cf" stroke="${K}" stroke-width="3"/>
      <path d="M-23,-124 L-14,-138 L-10,-127 L-2,-141 L4,-127 L12,-139 L14,-126 L23,-128 L22,-140 Q0,-154 -22,-140Z" fill="${K}"/>
      <path d="M-23,-131 Q0,-139 23,-131 L23,-124 Q0,-132 -23,-124Z" fill="#fff" stroke="${K}" stroke-width="2"/>
      <circle cx="5" cy="-131" r="4.5" fill="#ff8787" stroke="${K}" stroke-width="1.5"/>
      <path d="M-15,-124 L-4,-119 M3,-119 L15,-124" stroke="${K}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-13,-116 L-4,-114 L-5,-110 Q-10,-109 -13,-116Z M14,-116 L5,-114 L6,-110 Q11,-109 14,-116Z" fill="${K}"/>
      <path d="M-3,-103 L8,-104" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/>
      ${arm}${sword}</g>`;
  };

  // ももたろうの かお（アップ）
  A.momoFace = (x, y, s = 1, o = {}) => {
    const iris = o.red ? "#e03131" : K;
    return `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-70,-30 C-110,-40 -140,-20 -170,-34 C-150,-6 -110,-10 -74,-14Z M-70,-20 C-100,0 -130,14 -160,22 C-120,26 -96,8 -70,-6Z" fill="#fff" stroke="${K}" stroke-width="3"/>
      <path d="M-84,-10 L-110,-90 L-60,-70 L-50,-140 L-10,-96 L20,-150 L36,-90 L90,-118 L78,-50 L100,-20 Z" fill="${K}"/>
      <path d="M-74,0 Q-76,70 0,92 Q76,70 74,0 Q74,-60 0,-64 Q-74,-60 -74,0Z" fill="#ffe3cf" stroke="${K}" stroke-width="4"/>
      <path d="M-76,-6 L-50,-58 L-40,-20 L-18,-70 L-4,-24 L20,-68 L28,-22 L54,-56 L56,-14 L78,-10 L76,-50 Q0,-100 -76,-46Z" fill="${K}"/>
      <path d="M-78,-30 Q0,-60 78,-30 L78,-12 Q0,-42 -78,-12Z" fill="#fff" stroke="${K}" stroke-width="3"/>
      <circle cx="0" cy="-30" r="11" fill="#ff8787" stroke="${K}" stroke-width="2.5"/><path d="M0,-41 q8,-8 14,-4 q-6,6 -14,4Z" fill="#40c057" stroke="${K}" stroke-width="1.5"/>
      <path d="M-58,4 L-12,16 M58,4 L12,16" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
      <path d="M-56,22 L-14,26 L-18,40 Q-40,46 -56,22Z M56,22 L14,26 L18,40 Q40,46 56,22Z" fill="#fff" stroke="${K}" stroke-width="3"/>
      <circle cx="-26" cy="32" r="7" fill="${iris}"/><circle cx="26" cy="32" r="7" fill="${iris}"/><circle cx="-24" cy="30" r="2" fill="#fff"/><circle cx="28" cy="30" r="2" fill="#fff"/>
      <path d="M-14,66 L14,64" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
      <path d="M-6,46 L-2,56 L4,56" stroke="${K}" stroke-width="2.5" fill="none"/>
      ${o.sweat ? `<path d="M66,-6 q8,14 0,20 q-8,-6 0,-20Z" fill="#a5d8ff" stroke="${K}" stroke-width="2"/>` : ""}</g>`;
  };

  // なかま（みぎむき）
  A.dog = (x, y, s = 1, o = {}) => {
    const f = o.flip ? -1 : 1;
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})">
      <path d="M-26,-34 Q-46,-56 -36,-70 Q-34,-52 -20,-42Z" fill="#fff" stroke="${K}" stroke-width="2.5"/>
      <path d="M-24,-26 L-26,0 L-16,0 L-12,-22 M10,-24 L12,0 L22,0 L22,-26" fill="#fff" stroke="${K}" stroke-width="2.5"/>
      <ellipse cx="0" cy="-30" rx="30" ry="16" fill="#fff" stroke="${K}" stroke-width="3"/>
      <path d="M-14,-44 Q-2,-48 6,-40 Q-4,-32 -14,-36Z" fill="${K}" opacity=".85"/>
      <path d="M18,-40 Q30,-34 22,-28" stroke="#c92a2a" stroke-width="7" fill="none"/>
      <circle cx="28" cy="-52" r="16" fill="#fff" stroke="${K}" stroke-width="3"/>
      <ellipse cx="44" cy="-46" rx="10" ry="7" fill="#fff" stroke="${K}" stroke-width="2.5"/>
      <circle cx="52" cy="-48" r="3.5" fill="${K}"/>
      <path d="M18,-64 L14,-80 L28,-66Z" fill="${K}"/>
      <path d="M26,-58 L36,-55" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="-52" r="2.5" fill="${K}"/>
      ${o.bite ? `<path d="M40,-40 L44,-34 L48,-40 L52,-34" stroke="${K}" stroke-width="2" fill="#fff"/>` : `<path d="M40,-40 Q46,-36 50,-40" stroke="${K}" stroke-width="2" fill="none"/>`}</g>`;
  };
  A.monkey = (x, y, s = 1, o = {}) => {
    const f = o.flip ? -1 : 1, br = "#8d5524";
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})">
      <path d="M-18,-30 C-50,-30 -52,-70 -30,-74 C-40,-60 -36,-40 -16,-40" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="M-18,-30 C-50,-30 -52,-70 -30,-74 C-40,-60 -36,-40 -16,-40" fill="none" stroke="${br}" stroke-width="3" stroke-linecap="round"/>
      <path d="M-14,-30 L-20,0 L-8,0 L-2,-20 L4,0 L16,0 L14,-30Z" fill="${br}" stroke="${K}" stroke-width="2.5"/>
      <ellipse cx="0" cy="-42" rx="18" ry="20" fill="${br}" stroke="${K}" stroke-width="3"/>
      <ellipse cx="2" cy="-40" rx="10" ry="12" fill="#f4d6b9"/>
      <path d="M14,-52 L34,-62" stroke="${K}" stroke-width="9" stroke-linecap="round"/><path d="M14,-52 L34,-62" stroke="${br}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="-16" cy="-80" r="8" fill="#f4d6b9" stroke="${K}" stroke-width="2.5"/><circle cx="16" cy="-80" r="8" fill="#f4d6b9" stroke="${K}" stroke-width="2.5"/>
      <circle cx="0" cy="-80" r="17" fill="${br}" stroke="${K}" stroke-width="3"/>
      <path d="M-10,-82 Q-12,-68 0,-64 Q12,-68 10,-82 Q6,-90 0,-84 Q-6,-90 -10,-82Z" fill="#f4d6b9" stroke="${K}" stroke-width="1.5"/>
      <path d="M-17,-90 Q0,-98 17,-90 L17,-85 Q0,-93 -17,-85Z" fill="#c92a2a" stroke="${K}" stroke-width="1.5"/>
      <circle cx="-4" cy="-78" r="2.4" fill="${K}"/><circle cx="6" cy="-78" r="2.4" fill="${K}"/>
      <path d="M-2,-70 Q2,-66 7,-70" stroke="${K}" stroke-width="2" fill="none"/></g>`;
  };
  A.kiji = (x, y, s = 1, o = {}) => {
    const f = o.flip ? -1 : 1;
    const wing = o.fly
      ? `<path d="M-6,-40 C-30,-90 -70,-100 -90,-92 C-64,-78 -50,-60 -40,-44 C-30,-40 -16,-38 -6,-40Z" fill="#2f9e44" stroke="${K}" stroke-width="2.5"/><path d="M-60,-86 L-48,-62 M-44,-80 L-36,-56 M-74,-88 L-58,-70" stroke="${K}" stroke-width="2"/>`
      : `<path d="M-20,-34 C-6,-46 16,-42 18,-30 C6,-26 -10,-24 -20,-34Z" fill="#2f9e44" stroke="${K}" stroke-width="2.5"/>`;
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})">
      <path d="M-20,-30 L-90,-14 L-86,-8 L-18,-24 Z M-20,-28 L-84,-2 L-80,4 L-16,-22Z" fill="#a9733b" stroke="${K}" stroke-width="2"/>
      ${o.fly ? "" : `<path d="M-2,-18 L-4,0 M6,-18 L8,0" stroke="${K}" stroke-width="3"/>`}
      <ellipse cx="0" cy="-30" rx="24" ry="14" fill="#1c7c54" stroke="${K}" stroke-width="3"/>
      ${wing}
      <path d="M14,-36 Q22,-56 30,-60 L36,-50 Q28,-40 22,-30Z" fill="#1864ab" stroke="${K}" stroke-width="2.5"/>
      <circle cx="32" cy="-58" r="10" fill="#1864ab" stroke="${K}" stroke-width="2.5"/>
      <path d="M28,-62 Q34,-70 40,-60 Q38,-50 30,-52Z" fill="#e03131" stroke="${K}" stroke-width="1.5"/>
      <circle cx="35" cy="-60" r="2.2" fill="${K}"/>
      <path d="M41,-58 L50,-55 L41,-53Z" fill="#ffd43b" stroke="${K}" stroke-width="1.5"/></g>`;
  };

  // ---------- おに ----------
  // かお・からだ の きほん（ひだりむき）。c: skin, horn, hornCol, eyes, hair, mask, raise
  function hornPath(x, y, len, lean, w, col) {
    return `<path d="M${x - w},${y} Q${f1(x + lean * 0.3 - w * 0.2)},${f1(y - len * 0.6)} ${f1(x + lean)},${f1(y - len)} Q${f1(x + lean * 0.2 + w * 0.6)},${f1(y - len * 0.45)} ${x + w},${y}Z" fill="${col}" stroke="${K}" stroke-width="3"/>`;
  }
  function horns(c) {
    const hc = c.hornCol || "#fff3bf";
    switch (c.horn) {
      case "one": return hornPath(0, -210, 52, -6, 11, hc);
      case "thin": return hornPath(-16, -206, 60, -20, 5, hc) + hornPath(16, -206, 60, 20, 5, hc);
      case "crystal": return hornPath(-18, -206, 46, -14, 8, hc) + hornPath(18, -206, 46, 14, 8, hc) + hornPath(-4, -212, 30, -4, 6, hc) + hornPath(6, -212, 24, 6, 5, hc) + hornPath(-28, -198, 26, -22, 5, hc) + hornPath(28, -198, 26, 22, 5, hc);
      case "crown": return `<path d="M-30,-206 L30,-206 L28,-196 L-28,-196Z" fill="#fab005" stroke="${K}" stroke-width="2.5"/>` + [-28, -14, 0, 14, 28].map((hx, i) => hornPath(hx, -206, i === 2 ? 64 : i % 2 ? 46 : 34, hx * 0.4, 6, hc)).join("");
      case "left": return hornPath(-14, -208, 46, -14, 9, hc);
      case "right": return hornPath(14, -208, 46, 14, 9, hc);
      default: return hornPath(-18, -206, 42, -16, 9, hc) + hornPath(18, -206, 42, 16, 9, hc);
    }
  }
  function face(c) {
    if (c.mask) {
      return `<ellipse cx="0" cy="-184" rx="27" ry="31" fill="#f8f9fa" stroke="${K}" stroke-width="3"/><path d="M-20,-192 Q-12,-200 -4,-190 M4,-190 Q12,-200 20,-192" stroke="#e03131" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-16,-170 Q0,-158 16,-170" stroke="${K}" stroke-width="3" fill="none"/><path d="M-14,-176 L-14,-200 M14,-176 L14,-200" stroke="${K}" stroke-width="1" opacity=".3"/>`;
    }
    const ey = c.eyeCol || "#ffe066";
    let e = `<path d="M-26,-193 L-6,-188 L-8,-181 Q-20,-178 -26,-193Z M26,-193 L6,-188 L8,-181 Q20,-178 26,-193Z" fill="${ey}" stroke="${K}" stroke-width="2"/><circle cx="-14" cy="-185" r="2.8" fill="#c92a2a"/><circle cx="14" cy="-185" r="2.8" fill="#c92a2a"/>`;
    if (c.eyes === 3) e += `<ellipse cx="0" cy="-202" rx="4" ry="7" fill="${ey}" stroke="${K}" stroke-width="2"/><circle cx="0" cy="-202" r="2.2" fill="#c92a2a"/>`;
    const fang = c.bigFang ? 16 : 9;
    return `${e}<path d="M-30,-200 L-6,-192 M30,-200 L6,-192" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="M-4,-178 L0,-170 L4,-178" stroke="${K}" stroke-width="2.5" fill="none"/><path d="M-20,-166 Q0,-158 20,-166 L15,-156 Q0,-150 -15,-156Z" fill="#5c0f0f" stroke="${K}" stroke-width="2.5"/><path d="M-15,-165 L-11,${-165 + fang} L-7,-164Z M15,-165 L11,${-165 + fang} L7,-164Z" fill="#fff" stroke="${K}" stroke-width="1.5"/>`;
  }
  function arm(x1, y1, x2, y2, sk) {
    return `<path d="M${x1},${y1} L${x2},${y2}" stroke="${K}" stroke-width="28" stroke-linecap="round"/><path d="M${x1},${y1} L${x2},${y2}" stroke="${sk}" stroke-width="21" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="14" fill="${sk}" stroke="${K}" stroke-width="3"/>`;
  }
  function oniBase(c) {
    const sk = c.skin, hair = c.hair || K;
    const raise = c.raise ? arm(46, -144, 68, -208, sk) : arm(46, -144, 70, -88, sk);
    return `${c.back || ""}
      <path d="M-34,-220 L-48,-196 L-62,-200 L-50,-176 L-60,-150 L-36,-160 L-30,-140 L30,-140 L36,-160 L60,-150 L50,-176 L62,-200 L48,-196 L34,-220 Q0,-236 -34,-220Z" fill="${hair}" stroke="${K}" stroke-width="2"/>
      <path d="M-34,-70 L-46,0 L-14,0 L-8,-48 L8,-48 L14,0 L46,0 L34,-70Z" fill="${sk}" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-50,-150 Q0,-166 50,-150 L42,-76 L-42,-76Z" fill="${sk}" stroke="${K}" stroke-width="3"/>
      <path d="M-26,-132 Q-13,-122 0,-132 Q13,-122 26,-132 M-14,-110 L-14,-96 M14,-110 L14,-96 M0,-112 L0,-84" stroke="${K}" stroke-width="2.5" fill="none" opacity=".55"/>
      <path d="M-42,-82 L42,-82 L38,-50 L0,-40 L-38,-50Z" fill="#fcc419" stroke="${K}" stroke-width="3"/>
      <path d="M-30,-82 l6,12 M-12,-82 l3,14 M10,-82 l-3,14 M28,-82 l-6,12 M-24,-56 l4,-8 M20,-54 l-4,-8" stroke="${K}" stroke-width="4"/>
      ${arm(-46, -144, -70, -88, sk)}${raise}
      ${horns(c)}
      <circle cx="0" cy="-184" r="30" fill="${sk}" stroke="${K}" stroke-width="3"/>
      <path d="M-30,-196 L-20,-214 L-12,-200 L0,-218 L10,-200 L20,-214 L30,-196 Q0,-224 -30,-196Z" fill="${hair}"/>
      ${face(c)}${c.front || ""}`;
  }

  const ONI_ART = {
    1: { skin: "#e03131", horn: "one", raise: true, front:
      `<g transform="translate(68,-208) rotate(24)"><path d="M-6,12 L-15,-112 Q0,-126 15,-112 L6,12Z" fill="#495057" stroke="${K}" stroke-width="3"/>${[[0, -30], [-8, -56], [8, -56], [0, -82], [-9, -104], [9, -104]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4" fill="#ced4da" stroke="${K}" stroke-width="1.5"/>`).join("")}</g><path d="M-26,-130 L-6,-110 M-8,-132 L-24,-108" stroke="#5c0f0f" stroke-width="3"/>` },
    2: { skin: "#ced4da", horn: "thin", eyes: 3, hair: "#f1f3f5", hornCol: "#e9ecef",
      back: `<path d="M-30,-210 C-70,-160 -60,-90 -80,-60 C-50,-80 -50,-130 -40,-150Z M30,-210 C70,-160 60,-90 80,-60 C50,-80 50,-130 40,-150Z" fill="#f1f3f5" stroke="${K}" stroke-width="2"/>`,
      front: `<g filter="url(#blur)" opacity=".85"><ellipse cx="-30" cy="-10" rx="70" ry="22" fill="#fff"/><ellipse cx="40" cy="-30" rx="60" ry="18" fill="#fff"/><ellipse cx="-60" cy="-90" rx="40" ry="14" fill="#fff"/></g>` },
    3: { skin: "#9775fa",
      back: [[-112, -206], [-128, -152], [-118, -100], [112, -206], [128, -152], [118, -100]].map(([hx, hy]) => arm(hx < 0 ? -44 : 44, -140, hx, hy, "#845ef7")).join("") +
        `<circle cx="-118" cy="-100" r="10" fill="#ffd43b" stroke="${K}" stroke-width="2"/><circle cx="128" cy="-152" r="10" fill="#ffd43b" stroke="${K}" stroke-width="2"/>` },
    4: { skin: "#e7f5ff", horn: "crystal", hornCol: "#a5d8ff", hair: "#f8f9fa", bigFang: true, eyeCol: "#74c0fc",
      front: `<path d="M-50,-150 L-44,-122 L-38,-150 L-32,-130 L-28,-152Z M50,-150 L44,-122 L38,-150 L32,-130 L28,-152Z" fill="#a5d8ff" stroke="${K}" stroke-width="2"/>` },
    5: { skin: "#ffd43b", hair: "#f8f9fa",
      back: `<circle cx="0" cy="-176" r="112" fill="none" stroke="#495057" stroke-width="9"/>` +
        Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, dx = f1(Math.cos(a) * 112), dy = f1(-176 + Math.sin(a) * 112); return `<circle cx="${dx}" cy="${dy}" r="17" fill="#c92a2a" stroke="${K}" stroke-width="3"/><circle cx="${dx}" cy="${dy}" r="7" fill="#fff" stroke="${K}" stroke-width="1.5"/>`; }).join(""),
      front: `<path d="M-96,-60 L-80,-90 L-88,-90 L-70,-120 L-74,-96 L-64,-96 L-84,-56Z" fill="#fff3bf" stroke="${K}" stroke-width="2"/>` },
    6: { skin: "#495057", mask: true, hair: "#000", hornCol: "#212529",
      back: `<path d="M-40,0 C-90,10 -120,-10 -150,6 M30,0 C80,14 120,0 160,12 M-10,0 C-30,20 -70,30 -110,26" stroke="#000" stroke-width="14" fill="none" stroke-linecap="round" opacity=".8"/>`,
      raise: true,
      front: `<path d="M68,-208 L120,-300" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="M68,-208 L120,-300" stroke="#dee2e6" stroke-width="3" stroke-linecap="round"/><path d="M68,-208 C40,-240 90,-260 50,-300" stroke="#e03131" stroke-width="2.5" fill="none"/>` },
    7: { skin: "#69db7c", hair: "#2b8a3e", hornCol: "#fff0f6",
      back: `<path d="M-30,-210 C-74,-150 -64,-80 -84,-30 C-54,-60 -54,-120 -42,-150Z M30,-210 C74,-150 64,-80 84,-30 C54,-60 54,-120 42,-150Z" fill="#2b8a3e" stroke="${K}" stroke-width="2"/>`,
      front: [[-22, -214], [0, -222], [22, -214]].map(([fx, fy]) => `<g transform="translate(${fx},${fy})"><path d="M-10,0 L-12,-16 L-4,-8 L0,-20 L4,-8 L12,-16 L10,0Z" fill="#e64980" stroke="${K}" stroke-width="2"/><circle cy="2" r="6" fill="#2b8a3e" stroke="${K}" stroke-width="2"/></g>`).join("") +
        `<path d="M-46,-144 C-80,-130 -50,-110 -74,-92 M46,-144 C80,-130 50,-110 72,-92" stroke="#2b8a3e" stroke-width="4" fill="none"/><path d="M-66,-124 l-6,-4 M-60,-104 l-7,2 M66,-124 l6,-4 M60,-104 l7,2" stroke="${K}" stroke-width="2"/>` },
    9: { skin: "#ff922b", hair: "#e03131",
      back: A.flame(-40, -170, 1.2) + A.flame(40, -170, 1.2) + A.flame(0, -190, 1.6, "#e03131", "#ffd43b"),
      front: `<path d="M-30,-140 L-18,-120 L-26,-106 L-12,-90 M24,-138 L14,-118 L26,-100" stroke="#ffe066" stroke-width="3" fill="none"/>` + A.flame(-70, -78, 0.5) + A.flame(70, -78, 0.5) },
    10: { skin: "#862e2e", horn: "crown", eyes: 3, hair: "#f8f9fa", hornCol: "#343a40", eyeCol: "#ff6b6b", raise: false,
      back: `<path d="M-50,-150 C-120,-120 -150,-40 -170,0 L170,0 C150,-40 120,-120 50,-150Z" fill="#1a1a1a" stroke="${K}" stroke-width="3"/><path d="M-50,-150 C-100,-110 -120,-40 -136,0 L-100,0 C-90,-60 -70,-110 -46,-140Z M50,-150 C100,-110 120,-40 136,0 L100,0 C90,-60 70,-110 46,-140Z" fill="#5c0f0f"/>`,
      front: `<path d="M-50,-152 Q0,-136 50,-152 L44,-140 Q0,-126 -44,-140Z" fill="#fab005" stroke="${K}" stroke-width="2"/>` },
  };

  function twin(skin, hornCol, side) {
    return `<g transform="translate(${side * 56},0) scale(${-side * 0.72},0.72)">${oniBase({ skin, hornCol, horn: "left", hair: side < 0 ? "#495057" : "#f1f3f5" })}<circle cx="-78" cy="-92" r="24" fill="#dee2e6" stroke="${K}" stroke-width="3"/><circle cx="-78" cy="-92" r="15" fill="#a5d8ff" opacity=".8"/></g>`;
  }

  // id: 1..10。o.flip で みぎむき
  A.oni = (id, x, y, s = 1, o = {}) => {
    const f = o.flip ? -1 : 1;
    let body;
    if (id === 8) body = twin("#343a40", "#f8f9fa", -1) + twin("#f1f3f5", "#212529", 1);
    else body = oniBase(ONI_ART[id]);
    const op = id === 2 ? ' opacity=".9"' : "";
    return `<g transform="translate(${x},${y}) scale(${s * f},${s})"${op}>${body}</g>`;
  };
  // かげだけの おに
  A.oniSil = (x, y, s = 1, eye = "#ff2b2b") =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M-46,0 L-34,-70 L-50,-150 L-70,-90 L-80,-92 L-62,-160 Q-40,-170 -30,-176 Q-32,-212 -18,-214 L-24,-250 L-6,-216 Q0,-218 6,-216 L24,-250 L18,-214 Q32,-212 30,-176 Q40,-170 62,-160 L80,-92 L70,-90 L50,-150 L34,-70 L46,0 L14,0 L8,-48 L-8,-48 L-14,0Z" fill="#000"/><path d="M-16,-196 L-4,-192 L-6,-188Z M16,-196 L4,-192 L6,-188Z" fill="${eye}"/></g>`;

  // せんとうの けしき（おにごと）
  A.scenery = (id) => {
    switch (id) {
      case 1: return A.bg("#3a1414") + A.tone(0.3) + A.rock(40, 240, 1.4, "#5c3d3d") + A.rock(360, 230, 1.8, "#5c3d3d") + A.ground(240, "#2b1d1d");
      case 2: return A.bg("#5f6b78") + A.tree(30, 240, 1.4, "#3a4550") + A.tree(380, 240, 1.6, "#3a4550") + A.tree(330, 230, 1, "#4a5560") + A.ground(240, "#46525e") + `<g filter="url(#blur)" opacity=".6"><ellipse cx="200" cy="200" rx="260" ry="40" fill="#fff"/><ellipse cx="100" cy="120" rx="140" ry="30" fill="#fff"/></g>`;
      case 3: return A.bg("#2b1f3d") + A.tone(0.3) + `<path d="M-400,0 Q200,-60 800,0 L800,-400 L-400,-400Z" fill="#000"/>` + Array.from({ length: 12 }, (_, i) => `<circle cx="${250 + (i % 6) * 22}" cy="${226 - Math.floor(i / 6) * 16}" r="10" fill="#ffd43b" stroke="${K}" stroke-width="2"/>`).join("") + A.ground(240, "#1d1529");
      case 4: return A.bg("#1c3d5a") + `<path d="M-400,240 L0,120 L60,240 L140,90 L240,240 L320,110 L420,240 L800,140 L800,240Z" fill="#a5d8ff" stroke="${K}" stroke-width="3" opacity=".7"/>` + A.ground(240, "#d0ebff");
      case 5: return A.bg("#2c2c3a") + `<g fill="#495057" stroke="${K}" stroke-width="3"><ellipse cx="80" cy="40" rx="120" ry="40"/><ellipse cx="320" cy="30" rx="140" ry="44"/></g><path d="M200,0 L180,60 L196,60 L170,130 L214,50 L196,50 L214,0Z" fill="#ffe066" stroke="${K}" stroke-width="2"/>` + A.ground(240, "#3d3d4d");
      case 6: return A.bg("#868e96") + A.tone(0.6) + `<path d="M-400,240 L-400,120 L40,120 L40,60 L70,60 L70,240Z M330,240 L330,90 L360,70 L390,90 L390,240Z" fill="#343a40"/>` + A.ground(240, "#495057");
      case 7: return A.bg("#3d0f22") + A.ground(240, "#2b0a18") + Array.from({ length: 16 }, (_, i) => `<circle cx="${-20 + i * 28}" cy="${244 + (i % 3) * 6}" r="9" fill="#e64980" stroke="${K}" stroke-width="2"/>`).join("");
      case 8: return A.bg("#1c2b3d") + `<rect x="-600" y="240" width="1700" height="900" fill="#a5d8ff" opacity=".35"/>` + A.moon(320, 50, 22, "#e9ecef") + `<circle cx="320" cy="290" r="18" fill="#e9ecef" opacity=".4"/>` + `<line x1="-600" y1="240" x2="1100" y2="240" stroke="#fff" stroke-width="2"/>`;
      case 9: return A.bg("#4a1010") + A.tone(0.3, "toneR") + `<path d="M-400,240 L60,80 L120,120 L180,60 L260,140 L800,240Z" fill="#2b0a0a" stroke="${K}" stroke-width="3"/>` + A.ground(240, "#1a0505") + `<path d="M-200,262 Q100,248 200,264 T600,256" stroke="#ff922b" stroke-width="6" fill="none"/>`;
      case 10: return A.bg("#14070a") + A.moon(200, 60, 40) + `<path d="M120,240 L120,130 L140,110 L160,130 L160,90 L200,50 L240,90 L240,130 L260,110 L280,130 L280,240Z" fill="#000" stroke="#5c0f0f" stroke-width="2"/>` + A.ground(240, "#0a0405", "#5c0f0f");
      default: return A.bg("#222");
    }
  };

  window.Art = A;
})();
