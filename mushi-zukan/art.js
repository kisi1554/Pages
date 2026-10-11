'use strict';

/*
 * むしの え（SVG を その場で くみたてる。画像ファイルは つかわない）
 *  - セミ   : せなかがわから みた すがた（viewBox 300×345）
 *             あたま・ふくがん・たんがん3つ・前胸・中胸の X もよう・はねの みゃく（8つの 先たんの へや）
 *  - カマキリ: よこから みた すがた（viewBox 360×210、ひだりむき）
 *             にせの ひとみ・トゲの ある かま・ながい 前胸・あみめの はね
 *  しゅるいの ちがいは data.js の art（いろ・もようの type・からだの はば）で かきわける。
 *  opt.marks が true なら、data.js の marks の いちに「めじるし」の ばんごうを かさねる。
 */

const BugArt = (function () {
  let uid = 0;

  /* ------------------------------ べんり ------------------------------ */

  // 点の ならびを なめらかな とじた 線に する（カトマル–ロム → ベジェ）
  function smooth(pts, closed) {
    const n = pts.length;
    const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? ' Z' : '');
  }
  const f = (n) => Math.round(n * 10) / 10;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // めじるしの ばんごう。m = { x, y: さす ところ, px, py: ばんごうを おく ところ }
  function pins(marks, tx) {
    if (!marks) return '';
    const X = tx || ((x) => x);
    return marks.map((m, i) => {
      const x = X(m.x), px = X(m.px);
      // 線は わっかの そとがわで とめる（めじるしを かくさない）
      const dx = x - px, dy = m.y - m.py, len = Math.hypot(dx, dy) || 1;
      const ex = f(x - (dx / len) * 11), ey = f(m.y - (dy / len) * 11);
      return `<g class="pin">` +
        `<line x1="${px}" y1="${m.py}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
        `<line x1="${px}" y1="${m.py}" x2="${ex}" y2="${ey}" stroke="#e5484d" stroke-width="2.4" stroke-linecap="round"/>` +
        `<circle cx="${x}" cy="${m.y}" r="11" fill="none" stroke="#fff" stroke-width="4.5"/>` +
        `<circle cx="${x}" cy="${m.y}" r="11" fill="none" stroke="#e5484d" stroke-width="2.4"/>` +
        `<circle cx="${px}" cy="${m.py}" r="13" fill="#e5484d" stroke="#fff" stroke-width="3.5"/>` +
        `<text x="${px}" y="${m.py + 5.5}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="sans-serif">${i + 1}</text></g>`;
    }).join('');
  }

  /* ------------------------------- セミ ------------------------------- */

  // ひだりの はねの りんかく（中心からの きょり dx, y）。これを 中心で かがみうつし に する
  const WING = [
    [40, 110], [62, 128], [80, 160], [90, 198],
    [92, 232], [89, 262], [83, 288], [73, 310], [60, 326], [46, 331], [32, 322], [21, 302], [13, 276],
    [7, 248], [5, 215], [10, 170], [24, 128],
  ];

  function cicadaWing(a, u) {
    const L = a.l || 1;
    const P = (p) => [150 - p[0], 110 + (p[1] - 110) * L];
    const out = WING.map(P);
    const outline = smooth(out, true);
    // ふしの 線（ノーダルライン）と 先たんの みゃく
    const n0 = P([86, 200]), n8 = P([12, 236]);
    const nodes = [];
    for (let k = 0; k <= 8; k++) {
      const p = lerp(n0, n8, k / 8);
      p[1] += Math.sin((k / 8) * Math.PI) * 6 * L;
      nodes.push(p);
    }
    const center = P([50, 268]);
    const inset = (p, d) => {
      const v = [center[0] - p[0], center[1] - p[1]];
      const len = Math.hypot(v[0], v[1]);
      return [p[0] + (v[0] / len) * d, p[1] + (v[1] / len) * d];
    };
    const margin = out.slice(4, 13); // 9 てん
    const amb = margin.map((p) => inset(p, 6));
    const B = P([38, 116]);
    const stem = (pts) => smooth(pts, false);
    const abs = (p) => P(p);
    let veins = '';
    // 太い みゃく（ねもとから ノーダルラインへ）
    const thick = [
      [B, abs([70, 140]), abs([84, 196])],
      [B, abs([60, 150]), abs([72, 178]), nodes[1]],
      [abs([72, 178]), nodes[2]],
      [B, abs([50, 160]), abs([46, 190])],
      [abs([46, 190]), nodes[3]], [abs([46, 190]), nodes[4]], [abs([46, 190]), nodes[5]],
      [B, abs([30, 152]), abs([28, 200])],
      [abs([28, 200]), nodes[6]], [abs([28, 200]), nodes[7]],
      [B, abs([16, 170]), nodes[8]],
    ];
    thick.forEach((pts) => { veins += `<path d="${stem(pts)}" stroke-width="2.1"/>`; });
    // ノーダルライン と 先たんの みゃく
    veins += `<path d="${smooth(nodes, false)}" stroke-width="1.3"/>`;
    for (let k = 1; k <= 7; k++) {
      const m = lerp(nodes[k], amb[k], 0.5);
      m[0] += (k - 4) * 0.6;
      veins += `<path d="${smooth([nodes[k], m, amb[k]], false)}" stroke-width="1.4"/>`;
    }
    veins += `<path d="${smooth(amb, false)}" stroke-width="1.2"/>`;
    // ねもとの へや（basal cell）
    const basal = smooth([B, abs([62, 146]), abs([66, 170]), abs([52, 176]), abs([46, 158])], true);

    let body = '';
    if (a.wingType === 'opaque') {
      body =
        `<path d="${outline}" fill="url(#${u}wo)"/>` +
        `<g clip-path="url(#${u}wc)" opacity=".55">` +
        [[60, 170, 18, 26], [74, 250, 12, 20], [44, 290, 16, 12], [28, 230, 10, 22], [80, 210, 8, 14]]
          .map((s) => { const p = P([s[0], s[1]]); return `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${s[2]}" ry="${s[3] * L}" fill="${a.wingDark}"/>`; }).join('') +
        `</g>`;
    } else if (a.wingType === 'mottled') {
      body =
        `<path d="${outline}" fill="${a.wing}" fill-opacity=".62"/>` +
        `<g clip-path="url(#${u}wc)" fill="${a.wingDark}" opacity=".7">` +
        [[56, 150, 14, 10], [78, 186, 9, 12], [40, 196, 12, 8], [66, 222, 10, 9], [88, 240, 5, 10], [30, 252, 9, 12],
          [56, 262, 12, 8], [76, 284, 8, 9], [44, 300, 10, 9], [62, 318, 7, 6], [18, 286, 6, 9], [24, 214, 6, 7]]
          .map((s) => { const p = P([s[0], s[1]]); return `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${s[2]}" ry="${s[3] * L}"/>`; }).join('') +
        `</g>` +
        `<path d="${outline}" fill="url(#${u}wg)"/>`;
    } else {
      body = `<path d="${outline}" fill="url(#${u}wg)"/>`;
    }
    return (
      `<clipPath id="${u}wc"><path d="${outline}"/></clipPath>` +
      `<g id="${u}w">` +
      body +
      `<path d="${basal}" fill="${a.basal}" opacity=".55"/>` +
      `<g fill="none" stroke="${a.vein}" stroke-linecap="round" opacity=".9">${veins}</g>` +
      `<path d="${outline}" fill="none" stroke="${a.vein}" stroke-width="1.6"/>` +
      // まえの ふち（コスタ）は ふとく
      `<path d="${smooth(out.slice(0, 5), false)}" fill="none" stroke="${a.vein}" stroke-width="3.2" stroke-linecap="round"/>` +
      `</g>`
    );
  }

  function cicadaHindWing(a, u) {
    const L = a.l || 1;
    const P = (p) => [150 - p[0], 110 + (p[1] - 110) * L];
    const pts = [[40, 126], [66, 150], [80, 186], [78, 222], [62, 244], [42, 248], [26, 232], [22, 190], [28, 150]].map(P);
    return `<path id="${u}h" d="${smooth(pts, true)}" fill="${a.wingType === 'opaque' ? a.wingDark : a.wing}" fill-opacity="${a.wingType === 'opaque' ? 0.9 : 0.35}" stroke="${a.vein}" stroke-width="1.1" opacity=".8"/>`;
  }

  // しゅるいごとの もよう（前胸 pron・中胸 meso・あたま head に かさねる）
  const CICADA_PATTERN = {
    abura(a) {
      return {
        pron: `<path d="M120 74 L112 100 M180 74 L188 100" stroke="${a.pat}" stroke-width="5" opacity=".6"/>` +
              `<path d="M140 70 L142 104 M160 70 L158 104" stroke="#000" stroke-width="2.5" opacity=".5"/>`,
        meso: `<path d="M112 106 C118 128 126 142 134 150 M188 106 C182 128 174 142 166 150" stroke="${a.pat}" stroke-width="7" opacity=".55" fill="none"/>` +
              `<path d="M136 104 L142 136 L150 128 L158 136 L164 104" fill="${a.pat}" opacity=".35"/>`,
        head: '',
      };
    },
    minmin(a) {
      return {
        pron: `<rect x="92" y="60" width="116" height="60" fill="${a.pat}"/>` +
              `<path d="M150 66 L150 108" stroke="#111" stroke-width="12"/>` +
              `<path d="M128 72 C124 84 118 94 112 102 M172 72 C176 84 182 94 188 102" stroke="#111" stroke-width="6" fill="none"/>`,
        meso: `<path d="M94 106 C100 130 112 150 126 164" stroke="${a.pat}" stroke-width="11" fill="none"/>` +
              `<path d="M206 106 C200 130 188 150 174 164" stroke="${a.pat}" stroke-width="11" fill="none"/>` +
              `<path d="M128 102 C130 120 136 132 142 138 L146 104 Z M172 102 C170 120 164 132 158 138 L154 104 Z" fill="${a.pat}"/>`,
        head: `<path d="M118 70 C124 58 136 52 146 52 L146 72 Z M182 70 C176 58 164 52 154 52 L154 72 Z" fill="${a.pat}"/>`,
      };
    },
    niinii(a) {
      return {
        pron: `<rect x="92" y="60" width="116" height="60" fill="${a.pat}" opacity=".7"/>` +
              `<path d="M144 68 L140 104 M156 68 L160 104 M124 74 L114 100 M176 74 L186 100" stroke="${a.base}" stroke-width="4"/>`,
        meso: `<rect x="90" y="96" width="120" height="90" fill="${a.pat}" opacity=".55"/>` +
              [[120, 118, 7], [180, 118, 7], [136, 136, 6], [164, 136, 6], [150, 112, 5], [112, 138, 4], [188, 138, 4]]
                .map((s) => `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}" fill="${a.base}"/>`).join(''),
        head: `<path d="M116 72 C124 60 138 54 150 54 C162 54 176 60 184 72 Z" fill="${a.pat}" opacity=".6"/>`,
      };
    },
    tsukutsuku(a) {
      return {
        pron: `<path d="M140 68 L136 104 M160 68 L164 104" stroke="${a.pat}" stroke-width="3.5"/>` +
              `<path d="M122 74 C118 86 114 94 110 100 M178 74 C182 86 186 94 190 100" stroke="${a.pat}" stroke-width="3" fill="none"/>`,
        meso: `<path d="M98 108 C104 130 114 148 126 160 M202 108 C196 130 186 148 174 160" stroke="${a.pat}" stroke-width="4" fill="none"/>` +
              `<path d="M126 104 L136 140 L150 124 L164 140 L174 104" stroke="${a.pat}" stroke-width="4" fill="none" stroke-linejoin="round"/>`,
        head: `<path d="M140 58 L150 52 L160 58" stroke="${a.pat}" stroke-width="3" fill="none"/>`,
      };
    },
    higurashi(a) {
      return {
        pron: `<path d="M138 66 C134 80 136 96 142 106 L158 106 C164 96 166 80 162 66 Z" fill="${a.pat}"/>` +
              `<path d="M124 74 L114 100 M176 74 L186 100" stroke="${a.base}" stroke-width="4" opacity=".8"/>`,
        meso: `<path d="M118 104 C116 124 124 140 136 150 L144 132 L140 104 Z M182 104 C184 124 176 140 164 150 L156 132 L160 104 Z" fill="${a.pat}"/>` +
              `<path d="M98 108 C102 128 110 144 120 156 M202 108 C198 128 190 144 180 156" stroke="${a.pat}" stroke-width="6" fill="none" opacity=".85"/>`,
        head: `<path d="M126 66 C132 58 142 54 150 54 C158 54 168 58 174 66 L150 72 Z" fill="${a.pat}" opacity=".9"/>`,
      };
    },
    kuma(a) {
      let hair = '';
      for (let i = 0; i < 26; i++) {
        const x = 100 + (i % 13) * 8.2;
        const y = 108 + Math.floor(i / 13) * 14 + (i % 2) * 4;
        hair += `<path d="M${x} ${y} l3 5" />`;
      }
      return {
        pron: `<path d="M140 70 L142 104 M160 70 L158 104" stroke="#3a3a3a" stroke-width="2.5"/>`,
        meso: `<g stroke="${a.pat}" stroke-width="1.4" opacity=".8">${hair}</g>`,
        head: '',
      };
    },
  };

  function cicada(bug, opt) {
    const a = bug.art;
    const u = 'c' + (++uid);
    const W = a.w || 1;
    const L = a.l || 1;
    const pat = CICADA_PATTERN[a.type](a);
    const ay = (y) => 150 + (y - 150) * L; // おなかの ながさ
    const abd = smooth([[118, 158], [110, ay(200)], [116, ay(244)], [130, ay(276)], [150, ay(290)], [170, ay(276)], [184, ay(244)], [190, ay(200)], [182, ay(158)], [150, 150]], true);
    const leg = (pts, w) =>
      `<path d="${smooth(pts, false)}" fill="none" stroke="${a.leg || a.base}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${smooth(pts, false)}" fill="none" stroke="#fff" stroke-width="${w * 0.25}" stroke-linecap="round" opacity=".18"/>`;
    const legsL =
      leg([[124, 92], [96, 86], [88, 62], [92, 50]], 6) +
      leg([[112, 126], [66, 132], [56, 160]], 5) +
      leg([[114, 150], [68, 184], [62, 218]], 5);

    let extraAbd = '';
    if (a.type === 'kuma') {
      extraAbd = `<ellipse cx="124" cy="${ay(176)}" rx="9" ry="12" fill="#f2efe6" opacity=".85"/><ellipse cx="176" cy="${ay(176)}" rx="9" ry="12" fill="#f2efe6" opacity=".85"/>`;
    }
    if (a.type === 'minmin' || a.type === 'niinii') {
      extraAbd = `<path d="M130 ${ay(262)} C140 ${ay(284)} 160 ${ay(284)} 170 ${ay(262)} Z" fill="#eef0ea" opacity=".75"/>`;
    }

    const body =
      `<defs>` +
      `<linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.light || a.base}"/><stop offset=".55" stop-color="${a.base}"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient>` +
      `<radialGradient id="${u}e" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".18" stop-color="${a.eye}"/><stop offset="1" stop-color="#000"/></radialGradient>` +
      `<linearGradient id="${u}wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.basal}" stop-opacity=".35"/><stop offset=".25" stop-color="#eaf6f4" stop-opacity=".22"/><stop offset=".7" stop-color="#f4eefa" stop-opacity=".16"/><stop offset="1" stop-color="#ffffff" stop-opacity=".1"/></linearGradient>` +
      `<linearGradient id="${u}wo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.wingDark}"/><stop offset=".35" stop-color="${a.wing}"/><stop offset="1" stop-color="${a.wing}" stop-opacity=".92"/></linearGradient>` +
      `<clipPath id="${u}pc"><path d="M108 72 C128 66 172 66 192 72 L208 100 C190 110 110 110 92 100 Z"/></clipPath>` +
      `<clipPath id="${u}mc"><path d="M92 104 C120 98 180 98 208 104 C206 128 192 150 178 162 C168 170 158 176 150 178 C142 176 132 170 122 162 C108 150 94 128 92 104 Z"/></clipPath>` +
      `<clipPath id="${u}hc"><path d="M108 74 C110 56 128 46 150 46 C172 46 190 56 192 74 C176 78 124 78 108 74 Z"/></clipPath>` +
      `</defs>` +
      // あし
      `<g id="${u}l">${legsL}</g><use href="#${u}l" transform="translate(300 0) scale(-1 1)"/>` +
      // おなか
      `<path d="${abd}" fill="url(#${u}b)"/>` +
      `<g stroke="${a.pat}" stroke-width="1.5" fill="none" opacity=".45">` +
      [184, 204, 224, 244, 262].map((y) => `<path d="M${118 + (y - 184) * 0.05} ${ay(y)} Q150 ${ay(y) + 7} ${182 - (y - 184) * 0.05} ${ay(y)}"/>`).join('') +
      `</g>` + extraAbd +
      // うしろばね → まえばね
      cicadaHindWing(a, u) + `<use href="#${u}h" transform="translate(300 0) scale(-1 1)"/>` +
      cicadaWing(a, u) + `<use href="#${u}w" transform="translate(300 0) scale(-1 1)"/>` +
      // 中胸（X もよう つき）
      `<path d="M92 104 C120 98 180 98 208 104 C206 128 192 150 178 162 C168 170 158 176 150 178 C142 176 132 170 122 162 C108 150 94 128 92 104 Z" fill="url(#${u}b)"/>` +
      `<g clip-path="url(#${u}mc)">${pat.meso}</g>` +
      `<path d="M150 150 L161 158 L174 168 L158 165 L150 177 L142 165 L126 168 L139 158 Z" fill="${a.cross || a.pat}" stroke="#000" stroke-opacity=".4" stroke-width="1"/>` +
      // 前胸
      `<path d="M108 72 C128 66 172 66 192 72 L208 100 C190 110 110 110 92 100 Z" fill="url(#${u}b)"/>` +
      `<g clip-path="url(#${u}pc)">${pat.pron}` +
      `<path d="M108 72 L92 100 C110 110 190 110 208 100 L192 72" fill="none" stroke="${a.collar}" stroke-width="9" opacity=".9"/></g>` +
      `<path d="M108 72 C128 66 172 66 192 72 L208 100 C190 110 110 110 92 100 Z" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.4"/>` +
      // あたま
      `<path d="M108 74 C110 56 128 46 150 46 C172 46 190 56 192 74 C176 78 124 78 108 74 Z" fill="url(#${u}b)"/>` +
      `<g clip-path="url(#${u}hc)">${pat.head}</g>` +
      `<ellipse cx="150" cy="44" rx="19" ry="13" fill="url(#${u}b)" stroke="#000" stroke-opacity=".35"/>` +
      `<g stroke="${a.pat}" stroke-width="1.3" fill="none" opacity=".7">` +
      [36, 41, 46, 51].map((y) => `<path d="M${139 + Math.abs(y - 44) * 0.4} ${y} Q150 ${y + 2} ${161 - Math.abs(y - 44) * 0.4} ${y}"/>`).join('') +
      `</g>` +
      // しょっかく（みじかい）
      `<path d="M128 54 L116 42 M172 54 L184 42" stroke="${a.base}" stroke-width="2.2" stroke-linecap="round"/>` +
      // ふくがん・たんがん
      `<ellipse cx="106" cy="64" rx="13" ry="12" fill="url(#${u}e)"/><ellipse cx="194" cy="64" rx="13" ry="12" fill="url(#${u}e)"/>` +
      `<g fill="#d0503a" stroke="#000" stroke-opacity=".5" stroke-width=".6"><circle cx="150" cy="58" r="2.6"/><circle cx="143" cy="65" r="2.6"/><circle cx="157" cy="65" r="2.6"/></g>` +
      `<g fill="#fff" opacity=".8"><circle cx="149.3" cy="57.2" r=".9"/><circle cx="142.3" cy="64.2" r=".9"/><circle cx="156.3" cy="64.2" r=".9"/></g>`;

    return (
      `<svg viewBox="40 22 220 ${Math.round(316 * L + 10)}" role="img" aria-hidden="true">` +
      `<g transform="translate(150 0) scale(${W} 1) translate(-150 0)">${body}</g>` +
      (opt && opt.marks ? pins(bug.marks, (x) => 150 + (x - 150) * W) : '') +
      `</svg>`
    );
  }

  /* ------------------------------ カマキリ ------------------------------ */

  function mantis(bug, opt) {
    const a = bug.art;
    const u = 'k' + (++uid);
    const deep = ((a.belly || 1) - 1) * 14;
    const ww = a.wideWing ? 8 : 0;
    const legPath = (pts, w, color, op) =>
      `<path d="${smooth(pts, false)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op || 1}"/>`;
    // あし: こし → ひざ → あしくび → つまさき（ふし つき）
    const leg = (hip, knee, foot, toe, color, op) =>
      legPath([hip, knee], 5.4, color, op) +
      legPath([knee, lerp(knee, foot, 0.5), foot], 3.2, color, op) +
      legPath([foot, toe], 2.4, color, op) +
      `<g fill="${color}" opacity="${op || 1}">` + [0.3, 0.6].map((t) => { const p = lerp(foot, toe, t); return `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="1.9"/>`; }).join('') + `</g>`;

    // かまの もも（下がわの トゲ）
    let spines = '';
    for (let i = 0; i < 8; i++) {
      const p = lerp([101, 131], [60, 106], i / 7);
      const big = i % 2 === 0;
      spines += `<path d="M${f(p[0] - 2.4)} ${f(p[1] + 0.8)} L${f(p[0] - 1)} ${f(p[1] + (big ? 9 : 5.5))} L${f(p[0] + 2.4)} ${f(p[1] - 0.6)} Z"/>`;
    }
    // かまの すね（上がわの トゲ）
    let tspines = '';
    for (let i = 0; i < 6; i++) {
      const p = lerp([62, 108], [88, 126], i / 5);
      tspines += `<path d="M${f(p[0] - 2)} ${f(p[1])} L${f(p[0] + 1.5)} ${f(p[1] - 5)} L${f(p[0] + 2)} ${f(p[1] + 0.5)} Z"/>`;
    }
    // 前胸の ふちの ギザギザ
    let saw = '';
    for (let i = 0; i < 8; i++) {
      const p = lerp([100, 86], [168, 120], i / 7);
      saw += `<path d="M${f(p[0])} ${f(p[1])} l2 3 l2.4 -1.6"/>`;
    }
    // はねの あみめ
    let net = '';
    for (let i = 0; i < 13; i++) {
      const x = 184 + i * 11;
      const top = 104 + i * 0.6 + (x > 296 ? (x - 296) * 0.25 : 0);
      net += `<path d="M${x} ${f(top)} L${x + 5} ${f(122 + ww * 0.8)}"/>`;
    }

    let deco = '';
    if (a.base) deco += `<ellipse cx="102" cy="88" rx="6.5" ry="6" fill="${a.base}" stroke="#000" stroke-opacity=".35"/>`;
    if (a.dots) deco += [[99, 94], [98, 103], [97, 112], [96, 121]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#f6d33b" stroke="#7a6a10" stroke-width=".7"/>`).join('');
    const femurPatch = a.inner
      ? `<ellipse cx="82" cy="118" rx="11" ry="5" transform="rotate(34 82 118)" fill="#151515"/><ellipse cx="80" cy="116" rx="4.4" ry="2.6" transform="rotate(34 80 116)" fill="#fafafa"/>`
      : '';
    let wingDeco = '';
    if (a.hindTip) wingDeco += `<path d="M298 116 C316 118 332 122 340 126 C330 129 316 129 302 127 Z" fill="${a.hindTip}" opacity=".9"/>`;
    if (a.spot) wingDeco += `<ellipse cx="212" cy="${110 + ww * 0.3}" rx="5.5" ry="4" fill="#fbfbf2" stroke="#6a7a4a" stroke-width=".8"/>`;
    if (a.speckle) wingDeco += [[198, 112], [222, 116], [246, 111], [270, 118], [294, 114], [316, 121], [236, 121], [210, 119], [284, 123]]
      .map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="4" ry="2" fill="${a.dark}" opacity=".55"/>`).join('');

    const body =
      `<defs>` +
      `<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.light}"/><stop offset=".5" stop-color="${a.body}"/><stop offset="1" stop-color="${a.dark}"/></linearGradient>` +
      `<linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.light}"/><stop offset=".4" stop-color="${a.wing}"/><stop offset="1" stop-color="${a.dark}"/></linearGradient>` +
      `<radialGradient id="${u}e" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${a.eye}"/><stop offset="1" stop-color="${a.body}"/></radialGradient>` +
      `</defs>` +
      // むこうがわの あし（うすく）
      leg([172, 120], [158, 102], [146, 186], [134, 190], a.dark, 0.45) +
      leg([194, 124], [236, 102], [258, 188], [272, 192], a.dark, 0.45) +
      // おなか
      `<path d="M174 114 C220 110 292 114 340 126 C344 130 340 134 334 136 C292 ${142 + deep * 0.6} 230 ${146 + deep} 188 ${138 + deep * 0.7} C176 ${132 + deep * 0.4} 170 122 174 114 Z" fill="url(#${u}b)" stroke="${a.dark}" stroke-width="1.2"/>` +
      `<g stroke="${a.dark}" stroke-width="1.2" fill="none" opacity=".55">` +
      [204, 226, 248, 270, 292, 314].map((x) => `<path d="M${x} 128 q2 ${7 + deep * 0.5} -1 ${12 + deep * 0.8}"/>`).join('') +
      `</g>` +
      `<path d="M336 128 L352 123 M336 131 L351 132" stroke="${a.dark}" stroke-width="1.6" stroke-linecap="round"/>` +
      // まえばね
      `<path d="M166 108 C210 98 284 100 340 118 C340 124 334 ${128 + ww * 0.3} 324 ${128 + ww * 0.4} C284 ${128 + ww} 222 ${126 + ww} 172 ${122 + ww * 0.6} Z" fill="url(#${u}w)" stroke="${a.dark}" stroke-width="1.4"/>` +
      `<path d="M170 109 C212 101 282 103 336 119" fill="none" stroke="${a.costa}" stroke-width="4" opacity=".75"/>` +
      `<g stroke="${a.dark}" stroke-width=".8" opacity=".45" fill="none">${net}<path d="M174 116 C220 111 282 113 334 123"/></g>` +
      wingDeco +
      // てまえの あし
      leg([176, 124], [148, 106], [132, 190], [118, 194], a.dark) +
      leg([198, 128], [252, 106], [282, 192], [298, 196], a.dark) +
      // 前胸（ななめ 上に のびる）
      `<path d="M92 66 C110 70 150 94 178 110 L180 124 C160 116 130 100 112 92 C104 90 96 88 90 82 Z" fill="url(#${u}b)" stroke="${a.dark}" stroke-width="1.3"/>` +
      `<g stroke="${a.dark}" stroke-width="1" fill="none" opacity=".7">${saw}</g>` +
      `<path d="M102 76 C126 88 152 102 176 116" stroke="${a.dark}" stroke-width="1" opacity=".45" fill="none"/>` +
      // かま（つけね → もも → すね）
      `<path d="M94 78 L112 86 L104 132 C100 137 93 137 91 132 Z" fill="url(#${u}b)" stroke="${a.dark}" stroke-width="1.3"/>` +
      `<path d="M104 128 C88 128 70 116 57 104 L60 96 C74 106 90 114 104 120 Z" fill="url(#${u}b)" stroke="${a.dark}" stroke-width="1.3"/>` +
      femurPatch +
      `<g fill="${a.dark}">${spines}</g>` +
      `<path d="M58 104 C68 112 80 120 92 126 L90 130 C78 124 66 116 56 108 Z" fill="${a.body}" stroke="${a.dark}" stroke-width="1.1"/>` +
      `<g fill="${a.dark}">${tspines}</g>` +
      legPath([[86, 127], [87, 138], [86, 150]], 2.2, a.dark) +
      deco +
      // あたま（さんかく・大きな ふくがん・にせの ひとみ）
      `<path d="M60 50 C62 38 76 34 88 40 C96 46 98 56 94 66 C90 78 84 88 78 94 C72 88 66 78 62 68 C59 62 59 56 60 50 Z" fill="url(#${u}b)" stroke="${a.dark}" stroke-width="1.3"/>` +
      `<ellipse cx="73" cy="52" rx="13" ry="15" fill="url(#${u}e)" stroke="${a.dark}" stroke-width="1"/>` +
      `<ellipse cx="69" cy="54" rx="2.6" ry="3.4" fill="#141414"/>` +
      `<path d="M78 94 L75 102 M80 94 L81 103" stroke="${a.dark}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M80 40 Q70 12 38 4 M84 40 Q78 10 58 0" fill="none" stroke="${a.dark}" stroke-width="1.6" stroke-linecap="round"/>`;

    return (
      `<svg viewBox="20 0 340 200" role="img" aria-hidden="true">` + body +
      (opt && opt.marks ? pins(bug.marks) : '') +
      `</svg>`
    );
  }

  function svg(bug, opt) {
    return bug.art.kind === 'semi' ? cicada(bug, opt) : mantis(bug, opt);
  }

  return { svg };
})();
