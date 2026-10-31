/* あしあと たんてい — え（ぜんぶ SVG を コード で かく）
 *  AT_DRAW.print(type, x, y, s, rot, col)  あしあと 1つ
 *  AT_DRAW.clue(id, col)                    てがかり の え（-50..50 × -40..40 の なか）
 *  AT_DRAW.animal(id)                       どうぶつ（-60..60 の なか）
 *  AT_DRAW.scene(name)                      げんば の はいけい（800×500）と てがかり の おき ばしょ
 */
(function (root) {
  "use strict";
  const f = (n) => Math.round(n * 10) / 10;
  const g = (inner, x, y, s, rot) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ""}${s && s !== 1 ? ` scale(${f(s * 100) / 100})` : ""}">${inner}</g>`;
  const el = (cx, cy, rx, ry, fill, extra) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${extra || ""}/>`;
  const circ = (cx, cy, r, fill, extra) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${extra || ""}/>`;
  const path = (d, fill, extra) => `<path d="${d}" fill="${fill}"${extra || ""}/>`;

  /* ───────── あしあと（うえ が すすむ むき。おおきさ は だいたい 1 ＝ 1mm × s） ───────── */
  const P = {
    // イヌ・キツネ・タヌキ: ゆび 4、つめ あり
    canid(c, narrow) {
      const w = narrow ? 0.78 : 1;
      let o = path(`M${-11 * w} 10 Q${-13 * w} 2 ${-6 * w} 0 Q0 -3 ${6 * w} 0 Q${13 * w} 2 ${11 * w} 10 Q${8 * w} 17 0 15 Q${-8 * w} 17 ${-11 * w} 10Z`, c);
      const toes = narrow ? [[-5, -16, 4.2, 6], [5, -16, 4.2, 6], [-12, -6, 3.8, 5.2], [12, -6, 3.8, 5.2]]
                          : [[-6, -15, 4.8, 6], [6, -15, 4.8, 6], [-15, -5, 4.4, 5.4], [15, -5, 4.4, 5.4]];
      for (const t of toes) {
        // つめ は ゆび の まっすぐ さき（にくきゅう の まんなか から ゆび へ の むき）
        const vx = t[0], vy = t[1] - 5, L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L;
        const ang = Math.atan2(ux, -uy) * 180 / Math.PI;
        o += el(t[0], t[1], t[2], t[3], c, ` transform="rotate(${f(ang)} ${t[0]} ${t[1]})"`);
        const cx = t[0] + ux * (t[3] + 3.6), cy = t[1] + uy * (t[3] + 3.6);
        o += el(cx, cy, 1.2, 2.4, c, ` transform="rotate(${f(ang)} ${f(cx)} ${f(cy)})"`);
      }
      return o;
    },
    // ネコ: ゆび 4、つめ なし、まるい、にくきゅう の うしろ が 3つ に わかれる
    cat(c) {
      let o = path("M-11 6 Q-12 -2 -5 -2 Q0 -4 5 -2 Q12 -2 11 6 Q10 13 6 12 Q3 15 0 13 Q-3 15 -6 12 Q-10 13 -11 6Z", c);
      for (const t of [[-4, -13, 3.6, 4.4], [5, -14, 3.6, 4.4], [-12, -7, 3.2, 4], [12, -6, 3.2, 4]]) o += el(t[0], t[1], t[2], t[3], c);
      return o;
    },
    // ハクビシン: ゆび 5、おおきな てのひら
    haku(c) {
      let o = path("M-12 2 Q-13 -6 -4 -7 Q0 -8 4 -7 Q13 -6 12 2 Q12 12 0 14 Q-12 12 -12 2Z", c);
      for (const t of [[-15, -6], [-9, -15], [0, -18], [9, -15], [15, -6]]) o += circ(t[0], t[1], 3.6, c);
      return o;
    },
    // ノウサギ: まえ ちいさい まる、うしろ ながい だえん（け で ぼやける）
    hareFront(c) { return el(0, 0, 6, 8, c, ' opacity=".75" stroke="' + c + '" stroke-width="2" stroke-dasharray="1.5 2"'); },
    hareHind(c) { return el(0, 0, 8, 19, c, ' opacity=".75" stroke="' + c + '" stroke-width="2" stroke-dasharray="1.5 2"'); },
    // リス・ネズミ: まえ ゆび 4、うしろ ゆび 5（ほそながい）
    rodentFront(c) {
      let o = el(0, 3, 5, 4, c);
      for (const a of [-60, -22, 22, 60]) { const r = (a * Math.PI) / 180; o += el(Math.sin(r) * 9, -Math.cos(r) * 7 + 2, 1.8, 3.4, c, ` transform="rotate(${a} ${f(Math.sin(r) * 9)} ${f(-Math.cos(r) * 7 + 2)})"`); }
      return o;
    },
    rodentHind(c) {
      let o = el(0, 6, 5, 7, c);
      for (const a of [-75, -30, -8, 14, 40]) { const r = (a * Math.PI) / 180, L = a === -75 || a === 40 ? 10 : 13; o += el(Math.sin(r) * L, -Math.cos(r) * L + 2, 1.8, 4.2, c, ` transform="rotate(${a} ${f(Math.sin(r) * L)} ${f(-Math.cos(r) * L + 2)})"`); }
      return o;
    },
    // ひづめ: さき（うえ）が ほそい ハート。kind ino は まるっこく、うしろ に ふくてい
    hoof(c, kind) {
      const ino = kind === "ino" || kind === "round";
      const half = (sx) => ino
        ? `M${sx * 1.5} -14 Q${sx * 10} -13 ${sx * 10} 2 Q${sx * 10} 12 ${sx * 2} 12 Q${sx * 1.5} 0 ${sx * 1.5} -14Z`
        : `M${sx * 1.2} -17 Q${sx * 9} -6 ${sx * 8} 6 Q${sx * 7} 12 ${sx * 2} 11 Q${sx * 1} 0 ${sx * 1.2} -17Z`;
      let o = path(half(-1), c) + path(half(1), c);
      if (kind === "ino") o += el(-11, 21, 2.6, 3.4, c) + el(11, 21, 2.6, 3.4, c);
      return o;
    },
    // カラス: まえ 3、うしろ 1
    crow(c) {
      const st = ` stroke="${c}" stroke-width="3.2" stroke-linecap="round" fill="none"`;
      return `<path d="M0 8 L0 -22 M0 8 L-13 -16 M0 8 L13 -16 M0 8 L0 30"${st}/>` + [[0, -22], [-13, -16], [13, -16], [0, 30]].map((p) => circ(p[0], p[1], 2, c)).join("") + circ(0, 8, 3.5, c);
    },
    // カモ: まえ 3 と みずかき
    duck(c) {
      const st = ` stroke="${c}" stroke-width="3" stroke-linecap="round" fill="none"`;
      return path("M0 12 L-17 -10 Q-9 -6 -6 -14 Q0 -10 6 -14 Q9 -6 17 -10 Z", c, ' opacity=".55"') + `<path d="M0 12 L-17 -10 M0 12 L0 -19 M0 12 L17 -10"${st}/>`;
    },
    shoe(c) {
      return el(0, -10, 10, 15, c, ' opacity=".55"') + el(0, 17, 8, 8, c, ' opacity=".55"') + [-16, -8, 0, 8].map((y) => `<line x1="-8" y1="${y}" x2="8" y2="${y}" stroke="#fff" stroke-width="1.4" opacity=".6"/>`).join("");
    }
  };
  function print(type, x, y, s, rot, col) {
    const c = col || "#5d4037";
    const fn = { canid: () => P.canid(c), fox: () => P.canid(c, true), cat: () => P.cat(c), haku: () => P.haku(c),
      hareF: () => P.hareFront(c), hareH: () => P.hareHind(c), rodF: () => P.rodentFront(c), rodH: () => P.rodentHind(c),
      deer: () => P.hoof(c, "deer"), round: () => P.hoof(c, "round"), boar: () => P.hoof(c, "ino"), crow: () => P.crow(c), duck: () => P.duck(c), shoe: () => P.shoe(c) }[type];
    return g(fn(), x, y, s || 1, rot || 0);
  }

  /* ───────── てがかり の え ───────── */
  const BR = "#5d4037", DK = "#3e2723";
  const lbl = (t, y) => `<text x="0" y="${y || 38}" text-anchor="middle" font-size="9" fill="#6d4c41" font-weight="bold">${t}</text>`;
  function trackway(type, pts, s, col) { return pts.map((p) => print(type, p[0], p[1], s, p[2] || 0, col)).join(""); }
  const ruler = (x, y, w, label) => `<g transform="translate(${x} ${y})"><rect x="0" y="-3" width="${w}" height="6" fill="#ffe082" stroke="#8d6e63" stroke-width=".6"/>${[0, .5, 1].map((t) => `<line x1="${f(w * t)}" y1="-3" x2="${f(w * t)}" y2="1" stroke="#8d6e63" stroke-width=".6"/>`).join("")}<text x="${f(w / 2)}" y="10" font-size="7" text-anchor="middle" fill="#6d4c41">${label}</text></g>`;

  const nut = (x, y, r) => el(x, y, r, r * 0.9, "#8d6e63", ' stroke="#5d4037" stroke-width="1.4"') + `<path d="M${x - r * 0.6} ${y - r * 0.3} q${r * 0.3} ${r * 0.3} 0 ${r * 0.6} M${x + r * 0.2} ${y - r * 0.6} q${r * 0.3} ${r * 0.4} 0 ${r * 0.9}" stroke="#5d4037" stroke-width="1" fill="none"/>`;
  const halfNut = (x, y, r, rot) => g(path(`M${-r} 0 A${r} ${r * 0.9} 0 0 0 ${r} 0 Z`, "#8d6e63", ' stroke="#5d4037" stroke-width="1.4"') + path(`M${-r * 0.75} 0 A${r * 0.75} ${r * 0.65} 0 0 0 ${r * 0.75} 0 Z`, "#d7b899") + `<path d="M0 0 v${r * 0.6} M${-r * 0.4} 0 q0 ${r * 0.5} ${r * 0.4} ${r * 0.6} M${r * 0.4} 0 q0 ${r * 0.5} ${-r * 0.4} ${r * 0.6}" stroke="#a1887f" stroke-width="1" fill="none"/>`, x, y, 1, rot);
  const pellet = (x, y, rx, ry, c, rot) => el(x, y, rx, ry, c, ` transform="rotate(${rot || 0} ${x} ${y})"`);
  function feather(c1, c2, extra) {
    return path("M0 30 Q-4 10 -10 -6 Q-8 -24 0 -32 Q8 -24 10 -6 Q4 10 0 30Z", c1) + `<path d="M0 34 L0 -30" stroke="${c2}" stroke-width="1.6"/>` +
      [-20, -10, 0, 10].map((y) => `<path d="M0 ${y} l-8 -5 M0 ${y} l8 -5" stroke="${c2}" stroke-width=".8" opacity=".6"/>`).join("") + (extra || "");
  }
  function tree(x, y, s) { return g(`<rect x="-5" y="0" width="10" height="40" fill="#6d4c41"/>` + circ(0, -10, 26, "#558b2f") + circ(-16, 2, 16, "#689f38") + circ(16, 2, 16, "#689f38"), x, y, s); }
  function speaker() {
    return path("M-26 -8 h10 l14 -12 v40 l-14 -12 h-10 z", "#6d4c41") +
      `<path d="M6 -10 q8 10 0 20 M14 -18 q14 18 0 36 M22 -26 q20 26 0 52" stroke="#ff7043" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  }

  function clue(id, col) {
    const c = col || BR;
    switch (id) {
      case "t_inuka": return print("canid", 0, -2, 1.5, 0, c) + ruler(-20, 30, 40, "4cm");
      case "t_kitsune": return `<ellipse cx="0" cy="-3" rx="20" ry="30" fill="none" stroke="#ef6c00" stroke-width="1.5" stroke-dasharray="4 3"/>` + print("fox", 0, -2, 1.45, 0, c) + ruler(-18, 29, 36, "5cm");
      case "t_neko": return print("cat", 0, -2, 1.7, 0, c) + ruler(-17, 30, 34, "3cm");
      case "t_haku": return print("haku", -16, 4, 1.15, -8, c) + print("haku", 18, -6, 1.3, 8, c) + ruler(-20, 29, 40, "5cm");
      case "t_usagi": return print("hareF", -14, 18, 1, 0, c) + print("hareH", 12, -6, 1.2, 0, c) + lbl("うしろあし 12cm", 38);
      case "t_risu": return print("rodF", -18, 8, 1.3, 0, c) + print("rodH", 16, -2, 1.6, 0, c) + ruler(-10, 29, 30, "5cm");
      case "t_nezumi": return print("rodF", -10, 4, 0.65, 0, c) + print("rodH", 8, 0, 0.75, 0, c) + ruler(-30, 28, 60, "2cm");
      case "t_hizume": return print("deer", -14, 2, 1.25, -6, c) + print("round", 18, -4, 1.05, 6, c) + lbl("ひづめ が 2つ", 38);
      case "t_shika": return print("deer", 0, 0, 1.8, 0, c) + ruler(-17, 29, 34, "5cm");
      case "t_inoshi": return print("boar", 0, -6, 1.45, 0, c) + `<path d="M-24 28 l6 -4 M24 28 l-6 -4" stroke="#ef6c00" stroke-width="1.5"/>` + lbl("ふくてい", 38);
      case "t_karasu": return print("crow", 0, -4, 1.1, 0, c) + ruler(-20, 29, 40, "9cm");
      case "t_kamo": return print("duck", 0, -2, 1.7, 0, c) + ruler(-20, 30, 40, "7cm");
      // ならび
      case "g_line": return `<line x1="0" y1="38" x2="0" y2="-38" stroke="#ef6c00" stroke-width="1" stroke-dasharray="3 3"/>` + trackway("fox", [[0, 28], [0, 6], [0, -16], [0, -36]], 0.55, c);
      case "g_zigzag": return trackway("canid", [[-10, 28, -8], [10, 12, 8], [-10, -4, -8], [10, -20, 8], [-10, -36, -8]], 0.5, c);
      case "g_hop_y": return [[-34, 0], [12, 0]].map(([x0]) => print("hareF", x0, 18, 0.55, 0, c) + print("hareF", x0, 6, 0.55, 0, c) + print("hareH", x0 - 9, -14, 0.55, 0, c) + print("hareH", x0 + 9, -14, 0.55, 0, c)).join("") + `<path d="M-14 -30 q8 -10 18 0" stroke="#ef6c00" stroke-width="1.2" fill="none" stroke-dasharray="2 2"/>`;
      case "g_hop_side": return [[-24], [22]].map(([x0]) => print("rodF", x0 - 6, 14, 0.6, 0, c) + print("rodF", x0 + 6, 14, 0.6, 0, c) + print("rodH", x0 - 9, -8, 0.6, 0, c) + print("rodH", x0 + 9, -8, 0.6, 0, c)).join("");
      case "g_hop": return [[-30, 24], [0, -2], [30, -28]].map(([x0, y0]) => g(el(-4, 8, 2.4, 3, c) + el(4, 10, 2.4, 3, c) + el(-6, -4, 3, 5, c) + el(6, -4, 3, 5, c), x0, y0, 1, 0)).join("");
      case "g_human": return trackway("shoe", [[-14, 18], [-4, -18]], 0.7, "#757575") + trackway("canid", [[18, 26, 6], [26, 6, -6], [18, -14, 6], [26, -34, -6]], 0.42, c);
      case "s_hei": return `<rect x="-46" y="-6" width="92" height="14" fill="#bcaaa4" stroke="#8d6e63"/><rect x="-46" y="8" width="92" height="28" fill="#d7ccc8"/>` + trackway("cat", [[-30, 1, 90], [-6, 1, 90], [18, 1, 90], [40, 1, 90]], 0.32, c);
      // たべあと
      case "f_kurumi2": return halfNut(-16, 0, 14, -20) + halfNut(16, 4, 14, 200);
      case "f_kurumi_ana": return nut(0, 0, 18) + el(4, -2, 6, 5, "#3e2723") + el(-12, 8, 3.5, 3, "#3e2723");
      case "f_kurumi_kona": return [[-20, 6, 20], [-2, 14, -40], [14, 2, 70], [24, 16, 10], [-12, -10, 110], [8, -12, 160]].map(([x, y, r]) => g(path("M-6 0 L0 -5 L7 -1 L4 5 L-4 4Z", "#8d6e63", ' stroke="#5d4037" stroke-width="1"'), x, y, 1, r)).join("") + `<path d="M-30 -30 l6 10 M-20 -34 l2 12" stroke="#90a4ae" stroke-width="2" stroke-linecap="round"/>`;
      case "f_matsu": return g(`<path d="M-30 0 Q-34 -6 -26 -8 L26 -3 Q32 0 26 3 L-26 8 Q-34 6 -30 0Z" fill="#a1887f"/><path d="M-30 0 l-8 -10 q-6 10 0 20 Z" fill="#8d6e63"/><path d="M22 -2 l10 -6 l2 6 l-2 6 l-10 -6" fill="#795548"/>` + [-18, -6, 6, 16].map((x) => `<line x1="${x}" y1="-6" x2="${x}" y2="6" stroke="#6d4c41" stroke-width="1"/>`).join(""), 0, 0, 1, -10) + lbl("エビフライ みたい", 30);
      case "f_eda_naname": return `<path d="M-40 26 L8 -14" stroke="#795548" stroke-width="7" stroke-linecap="butt"/><path d="M4 -20 L14 -8" stroke="#fff" stroke-width="2"/><path d="M-20 10 l-8 -14 M-6 -2 l2 -14" stroke="#795548" stroke-width="3"/>` + el(-26, -6, 6, 3, "#7cb342") + `<path d="M10 -18 L18 -6" stroke="#ef6c00" stroke-width="1.2" stroke-dasharray="2 2"/>` + lbl("ななめ に スパッ", 38);
      case "f_eda_giza": return `<path d="M-40 26 L6 -12" stroke="#795548" stroke-width="7"/>` + path("M2 -18 l4 4 l3 -6 l3 6 l2 -3 l1 5 l-6 6Z", "#a1887f") + `<path d="M8 -14 l6 -6 M9 -10 l7 -2 M7 -8 l6 2" stroke="#d7ccc8" stroke-width="1.2"/>` + lbl("ギザギザ", 38);
      // ふん
      case "d_tame": return [[-20, 10], [-6, 14], [8, 12], [20, 8], [-14, 0], [2, 2], [14, -2], [-4, -8], [8, -12]].map(([x, y], i) => pellet(x, y, 8, 4.5, i % 2 ? "#5d4037" : "#4e342e", (i * 37) % 60 - 30)).join("") + circ(-2, 0, 1.5, "#ffcc80") + circ(12, 6, 1.5, "#ffcc80") + lbl("たくさん つみかさなる", 34);
      case "d_kitsune": return el(0, 18, 34, 10, "#9e9e9e") + path("M-22 10 Q-26 2 -18 0 Q-6 -2 4 2 Q14 6 24 -4 Q20 6 12 10 Q0 14 -22 10Z", "#5d4037") + `<path d="M-14 4 q4 4 8 0 M0 4 q4 4 8 0" stroke="#3e2723" stroke-width="1" fill="none"/>` + lbl("いし の うえ", 38);
      case "d_usagi": return [[-18, 6], [-4, 10], [10, 4], [22, 12], [-10, -6], [6, -8]].map(([x, y]) => el(x, y, 6, 5, "#a1887f", ' stroke="#8d6e63" stroke-width="1"')).join("") + lbl("1cm", 32);
      case "d_shika": return [[-16, 4], [-6, 8], [4, 4], [14, 9], [-10, -6], [2, -6], [12, -2], [-2, 16]].map(([x, y], i) => pellet(x, y, 5, 3.6, "#212121", (i * 47) % 90) + circ(x - 1.5, y - 1.5, 1, "#9e9e9e")).join("") + lbl("たわら がた", 32);
      case "d_nezumi": return [[-12, 0, 20], [-4, 6, -30], [6, -2, 60], [12, 8, 10], [0, -8, -70]].map(([x, y, r]) => pellet(x, y, 3, 1.4, "#3e2723", r)).join("") + ruler(-20, 22, 40, "1cm");
      case "d_inoshi": return [[-16, 6, 12], [4, 4, 14], [-6, -10, 11], [14, -8, 10]].map(([x, y, r]) => circ(x, y, r, "#4e342e") + circ(x - r / 3, y - r / 3, r / 4, "#6d4c41")).join("");
      case "d_tori": return path("M-26 6 Q-30 -10 -10 -10 Q0 -20 14 -8 Q30 -6 24 8 Q10 18 -10 14 Q-24 16 -26 6Z", "#fafafa", ' stroke="#bdbdbd"') + el(-4, 2, 8, 5, "#424242") + el(10, 0, 4, 3, "#616161");
      case "d_neko": return path("M-40 20 Q-30 -6 0 -10 Q30 -6 40 20Z", "#e6c989") + [[-14, 4], [2, -2], [16, 6], [-4, 12]].map(([x, y]) => circ(x, y, 1.6, "#c8a96a")).join("") + `<path d="M-6 6 q4 -6 10 0" stroke="#6d4c41" stroke-width="3" fill="none"/>` + lbl("すな を かけて ある", 34);
      // け・はね
      case "h_kemono": return [-14, -8, -2, 4, 10, 16].map((x, i) => `<path d="M${x} 22 Q${x + 6} 0 ${x + (i % 2 ? 10 : -4)} -24" stroke="${i % 2 ? "#8d6e63" : "#a1887f"}" stroke-width="1.6" fill="none"/>`).join("") + `<path d="M-6 -24 l2 -6 M6 -22 l1 -6" stroke="#3e2723" stroke-width="1.6"/>`;
      case "h_hane": return g(feather("#bcaaa4", "#795548"), 0, 0, 1, 25);
      case "h_kuro": return g(feather("#212121", "#5c6bc0", `<path d="M-6 -16 Q0 -26 6 -16" stroke="#7986cb" stroke-width="2" fill="none" opacity=".7"/>`), 0, 0, 1, 25);
      case "h_kamo": return g(feather("#8d6e63", "#4e342e", `<rect x="-8" y="-6" width="16" height="8" fill="#1e88e5"/><path d="M-9 4 Q0 0 9 4" stroke="#fff" stroke-width="1.4" fill="none"/>`), 0, 0, 1, 25);
      // すみか・しるし
      case "s_kinoue": return `<path d="M-40 34 L-10 -2 L30 -30 M-10 -2 L20 14" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>` + el(-8, -10, 18, 10, "#795548") + `<path d="M-24 -12 l32 6 M-22 -6 l30 -6 M-18 -14 l26 10" stroke="#4e342e" stroke-width="1.6"/>`;
      case "s_risu_su": return `<path d="M-44 30 L44 -10" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>` + circ(0, -6, 20, "#8d6e63") + Array.from({ length: 9 }, (_, i) => { const a = i * 0.7; return `<path d="M${f(Math.cos(a) * 18)} ${f(-6 + Math.sin(a) * 18)} L${f(Math.cos(a + 2.4) * 18)} ${f(-6 + Math.sin(a + 2.4) * 18)}" stroke="${i % 2 ? "#5d4037" : "#bcaaa4"}" stroke-width="1.5"/>`; }).join("") + lbl("まるい ボール", 38);
      case "s_karasu_su": return `<path d="M-44 30 L44 22" stroke="#6d4c41" stroke-width="5" stroke-linecap="round"/>` + path("M-28 6 Q-26 26 0 26 Q26 26 28 6 Z", "#6d4c41") + `<path d="M-30 6 L30 10 M-26 14 L28 4 M-22 20 L24 16" stroke="#3e2723" stroke-width="2"/><path d="M-8 6 l8 -12 l8 12 M-16 6 h32" stroke="#4fc3f7" stroke-width="2.4" fill="none"/>` + lbl("ハンガー も", 38);
      case "s_yaneura": return path("M-44 0 L0 -32 L44 0 Z", "#8d6e63") + `<rect x="-36" y="0" width="72" height="34" fill="#efebe9" stroke="#8d6e63"/>` + `<rect x="-14" y="-12" width="28" height="10" fill="#3e2723"/>` + circ(-4, -7, 1.6, "#ffeb3b") + circ(4, -7, 1.6, "#ffeb3b") + `<text x="0" y="24" text-anchor="middle" font-size="10" fill="#6d4c41" font-weight="bold">ゴトゴト</text>`;
      case "s_densen": return `<path d="M-48 -18 Q0 -6 48 -18" stroke="#424242" stroke-width="2" fill="none"/>` + g(el(0, 0, 16, 7, "#455a64") + circ(15, -3, 6, "#455a64") + `<path d="M-15 0 Q-30 4 -34 14" stroke="#455a64" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M15 -6 L21 -3" stroke="#fff" stroke-width="1.6"/>`, 0, -20, 1, 0) + circ(0, 22, 12, "#283593", ' opacity=".2"') + `<text x="22" y="24" font-size="11">🌙</text>`;
      case "s_ana_big": return path("M-46 34 Q-40 -20 0 -24 Q40 -20 46 34Z", "#8d6e63") + el(0, 14, 22, 18, "#2b1d16") + [[-30, 26], [26, 30], [34, 20]].map(([x, y]) => circ(x, y, 3, "#6d4c41")).join("");
      case "s_ana_small": return el(0, 10, 44, 22, "#a1887f") + [[-22, 8], [4, 14], [24, 4], [-6, 0]].map(([x, y]) => el(x, y, 5, 3.4, "#2b1d16")).join("");
      case "s_nuta": return path("M-44 10 Q-40 -10 -10 -12 Q30 -16 44 4 Q40 26 0 26 Q-40 28 -44 10Z", "#795548") + el(0, 6, 28, 10, "#8d6e63") + `<path d="M-24 2 q10 6 20 0 q10 -6 20 0" stroke="#5d4037" stroke-width="2" fill="none"/>` + el(-10, 6, 6, 2, "#b3e5fc", ' opacity=".6"');
      case "s_hori": return el(0, 10, 46, 22, "#6d4c41") + [[-26, 4], [-10, 14], [8, 2], [24, 14], [-2, -4], [30, 0]].map(([x, y], i) => g(path("M-8 4 Q-6 -6 0 -6 Q8 -4 8 4Z", i % 2 ? "#4e342e" : "#8d6e63"), x, y, 1, i * 30)).join("") + `<path d="M-30 22 q6 -4 10 2" stroke="#ef9a9a" stroke-width="2" fill="none"/>`;
      case "s_fuse": return [-40, -30, -20, 20, 30, 40].map((x, i) => `<path d="M${x} 30 q${i % 2 ? 4 : -4} -26 ${i % 2 ? 2 : -2} -40" stroke="#7cb342" stroke-width="3" fill="none"/>`).join("") + el(0, 14, 26, 14, "#c5e1a5") + el(0, 14, 20, 9, "#aed581") + `<path d="M-14 12 q14 8 28 0" stroke="#8bc34a" stroke-width="1.4" fill="none"/>`;
      case "v_karasu": case "v_kamo": case "v_shika": case "v_inoshi": case "v_neko": case "v_inu": case "v_kitsune": case "v_nezumi":
        return speaker() + lbl("♪ きいて みよう", 38);
    }
    return circ(0, 0, 20, "#ccc");
  }

  /* ───────── どうぶつ ───────── */
  function eyes(y, dx, r, col) { return circ(-dx, y, r, col || "#222") + circ(dx, y, r, col || "#222") + circ(-dx + r * 0.35, y - r * 0.35, r * 0.35, "#fff") + circ(dx + r * 0.35, y - r * 0.35, r * 0.35, "#fff"); }
  const cheeks = (y, dx) => circ(-dx, y, 5, "#ff8a80", ' opacity=".45"') + circ(dx, y, 5, "#ff8a80", ' opacity=".45"');
  function animal(id) {
    switch (id) {
      case "tanuki": return path("M30 30 Q58 22 52 50 Q40 54 28 42Z", "#6d4c41") +
        el(0, 32, 30, 24, "#8d6e63") + el(0, 38, 16, 14, "#d7ccc8") + el(-14, 52, 7, 6, "#3e2723") + el(14, 52, 7, 6, "#3e2723") +
        circ(-22, -28, 10, "#6d4c41") + circ(22, -28, 10, "#6d4c41") + circ(-22, -27, 5, "#3e2723") + circ(22, -27, 5, "#3e2723") +
        el(0, -8, 32, 27, "#a1887f") + el(-13, -8, 11, 9, "#3e2723", ' transform="rotate(-15 -13 -8)"') + el(13, -8, 11, 9, "#3e2723", ' transform="rotate(15 13 -8)"') +
        el(0, 6, 13, 9, "#efebe9") + eyes(-9, 13, 3.4, "#fff").replace(/#222/g, "#fff") + circ(-13, -9, 2.4, "#222") + circ(13, -9, 2.4, "#222") + el(0, 2, 4, 3, "#222") + `<path d="M-4 9 q4 4 8 0" stroke="#222" stroke-width="1.5" fill="none"/>` + cheeks(6, 20);
      case "kitsune": return path("M24 34 Q62 10 56 46 Q50 58 30 46Z", "#e67e22") + path("M52 30 Q62 36 56 46 Q50 48 48 40Z", "#fff") +
        el(0, 34, 26, 22, "#e67e22") + el(0, 38, 13, 15, "#fff3e0") +
        path("M-26 -14 L-24 -50 L-6 -26Z", "#e67e22") + path("M26 -14 L24 -50 L6 -26Z", "#e67e22") + path("M-22 -20 L-21 -42 L-11 -27Z", "#4e342e") + path("M22 -20 L21 -42 L11 -27Z", "#4e342e") +
        path("M-30 -14 Q-28 -34 0 -34 Q28 -34 30 -14 Q26 6 0 22 Q-26 6 -30 -14Z", "#ef8c2e") + path("M-30 -10 Q-16 4 0 22 Q-6 4 -10 -2 Q-20 -2 -30 -10Z", "#fff") + path("M30 -10 Q16 4 0 22 Q6 4 10 -2 Q20 -2 30 -10Z", "#fff") +
        `<path d="M-17 -12 q5 -4 10 0 M7 -12 q5 -4 10 0" stroke="#222" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + el(0, 16, 4, 3, "#222");
      case "usagi": return el(0, 34, 26, 22, "#a1887f") + el(0, 40, 13, 13, "#d7ccc8") + circ(-22, 44, 7, "#fff") +
        el(-12, -42, 7, 24, "#a1887f", ' transform="rotate(-10 -12 -42)"') + el(12, -42, 7, 24, "#a1887f", ' transform="rotate(10 12 -42)"') + el(-12, -42, 3.5, 18, "#ffccbc", ' transform="rotate(-10 -12 -42)"') + el(12, -42, 3.5, 18, "#ffccbc", ' transform="rotate(10 12 -42)"') +
        el(-14, -54, 6, 4, "#3e2723", ' transform="rotate(-10 -14 -60)"') + el(14, -54, 6, 4, "#3e2723", ' transform="rotate(10 14 -60)"') +
        el(0, -4, 27, 24, "#bcaaa4") + eyes(-8, 12, 3.6) + el(0, 4, 3, 2.4, "#6d4c41") + `<path d="M0 6 v4 M0 10 q-4 3 -7 0 M0 10 q4 3 7 0" stroke="#6d4c41" stroke-width="1.4" fill="none"/>` + cheeks(6, 18);
      case "risu": return path("M14 40 Q60 50 54 0 Q50 -30 30 -24 Q44 -4 34 14 Q28 30 14 30Z", "#bf6b3a") + path("M30 -20 Q46 -6 38 14", "none", ' stroke="#8d4a22" stroke-width="2"') +
        el(-2, 32, 22, 22, "#bf6b3a") + el(-2, 36, 12, 15, "#fff3e0") + el(-6, 22, 7, 5, "#8d6e63") + nut(-4, 22, 6) +
        path("M-20 -18 L-24 -44 L-6 -26Z", "#bf6b3a") + path("M20 -18 L24 -44 L6 -26Z", "#bf6b3a") + `<path d="M-24 -44 l-4 -6 M-24 -44 l2 -7 M24 -44 l4 -6 M24 -44 l-2 -7" stroke="#6d4c41" stroke-width="2" stroke-linecap="round"/>` +
        el(0, -8, 25, 22, "#cf7a45") + el(0, 2, 12, 9, "#fff3e0") + eyes(-10, 11, 4) + el(0, -1, 3, 2.4, "#3e2723") + cheeks(4, 17);
      case "nezumi": return `<path d="M20 44 Q50 50 54 30 Q56 18 46 16" stroke="#e0a080" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        el(0, 34, 24, 20, "#c0703a") + el(0, 40, 13, 12, "#fff") +
        circ(-22, -26, 15, "#c0703a") + circ(22, -26, 15, "#c0703a") + circ(-22, -26, 9, "#ffccbc") + circ(22, -26, 9, "#ffccbc") +
        path("M-26 -4 Q-24 -24 0 -24 Q24 -24 26 -4 Q20 14 0 20 Q-20 14 -26 -4Z", "#cd8150") + path("M-14 6 Q0 24 14 6 Q0 12 -14 6Z", "#fff") + eyes(-6, 10, 5) + circ(0, 17, 3, "#ff8a80") +
        `<path d="M-6 14 h-16 M-6 16 l-14 4 M6 14 h16 M6 16 l14 4" stroke="#6d4c41" stroke-width=".8"/>`;
      case "shika": return el(0, 36, 28, 20, "#a0522d") + [[-14, 30], [0, 28], [14, 32], [-6, 40], [8, 42]].map(([x, y]) => circ(x, y, 2.4, "#fff3e0")).join("") + el(0, 42, 11, 10, "#f5deb3") +
        `<path d="M-14 -26 L-24 -50 M-20 -40 L-32 -44 M-23 -48 L-20 -58 M14 -26 L24 -50 M20 -40 L32 -44 M23 -48 L20 -58" stroke="#8d6e63" stroke-width="4" stroke-linecap="round"/>` +
        el(-26, -18, 12, 6, "#a0522d", ' transform="rotate(-25 -26 -18)"') + el(26, -18, 12, 6, "#a0522d", ' transform="rotate(25 26 -18)"') +
        path("M-20 -20 Q-20 -32 0 -32 Q20 -32 20 -20 L14 10 Q0 20 -14 10Z", "#b0623a") + el(0, 10, 12, 9, "#d7a679") + eyes(-14, 10, 4) + el(0, 8, 5, 3.6, "#222") + `<path d="M-3 14 q3 3 6 0" stroke="#222" stroke-width="1.4" fill="none"/>`;
      case "inoshishi": return el(0, 28, 40, 28, "#5d4037") + `<path d="M-30 6 l-6 -10 M-20 2 l-4 -10 M-10 0 l-2 -10 M0 0 v-10 M10 0 l2 -10" stroke="#3e2723" stroke-width="2.4"/>` +
        path("M-28 -14 L-30 -34 L-14 -24Z", "#4e342e") + path("M28 -14 L30 -34 L14 -24Z", "#4e342e") +
        el(0, -6, 30, 24, "#6d4c41") + el(0, 12, 15, 11, "#8d6e63") + el(-5, 12, 3, 4, "#3e2723") + el(5, 12, 3, 4, "#3e2723") +
        path("M-12 18 q-6 -2 -6 -10 q4 4 8 6Z", "#fffde7") + path("M12 18 q6 -2 6 -10 q-4 4 -8 6Z", "#fffde7") + eyes(-8, 12, 3.4) + cheeks(2, 22);
      case "hakubishin": return `<path d="M22 40 Q60 44 58 10 Q58 -8 48 -10" stroke="#5f5f62" stroke-width="9" fill="none" stroke-linecap="round"/>` +
        el(0, 34, 26, 21, "#78787a") + el(-14, 52, 7, 5, "#2b2b2b") + el(14, 52, 7, 5, "#2b2b2b") +
        circ(-20, -26, 9, "#5f5f62") + circ(20, -26, 9, "#5f5f62") +
        path("M-28 -8 Q-26 -30 0 -30 Q26 -30 28 -8 Q22 14 0 18 Q-22 14 -28 -8Z", "#3a3a3c") + path("M-3 -30 L3 -30 L4 12 L-4 12Z", "#fff") +
        el(-16, -2, 7, 5, "#d0d0d0") + el(16, -2, 7, 5, "#d0d0d0") + eyes(-10, 10, 3.8) + el(0, 14, 4, 3, "#ff8a80") + circ(-14, -18, 4, "#d0d0d0") + circ(14, -18, 4, "#d0d0d0");
      case "neko": return `<path d="M22 46 Q54 50 50 20 Q48 6 40 8" stroke="#f0a04b" stroke-width="7" fill="none" stroke-linecap="round"/>` +
        el(0, 34, 24, 22, "#f0a04b") + el(0, 40, 12, 13, "#fff8e1") + `<path d="M-18 24 h8 M-20 32 h8 M10 24 h8 M12 32 h8" stroke="#d07f2a" stroke-width="2.4"/>` +
        path("M-26 -10 L-24 -42 L-4 -26Z", "#f0a04b") + path("M26 -10 L24 -42 L4 -26Z", "#f0a04b") + path("M-21 -16 L-21 -34 L-10 -24Z", "#ffccbc") + path("M21 -16 L21 -34 L10 -24Z", "#ffccbc") +
        el(0, -4, 30, 25, "#f6b060") + `<path d="M-6 -28 v8 M0 -29 v9 M6 -28 v8" stroke="#d07f2a" stroke-width="2.4"/>` + eyes(-6, 12, 4.4) + path("M-3 4 h6 l-3 3Z", "#ff8a80") + `<path d="M0 7 q-4 4 -7 1 M0 7 q4 4 7 1 M-10 6 h-20 M-10 9 l-18 5 M10 6 h20 M10 9 l18 5" stroke="#6d4c41" stroke-width="1.1" fill="none"/>` + cheeks(8, 20);
      case "inu": return `<path d="M24 26 Q46 14 40 -2 Q34 -10 28 0 Q36 6 22 18" fill="#d4a373"/>` +
        el(0, 34, 26, 22, "#d4a373") + el(0, 40, 13, 14, "#fff8e1") + `<path d="M-20 14 Q0 22 20 14" stroke="#e53935" stroke-width="5" fill="none"/>` + circ(0, 20, 3.6, "#ffd54f") +
        path("M-24 -14 L-22 -44 L-4 -28Z", "#c08a50") + path("M24 -14 L22 -44 L4 -28Z", "#c08a50") +
        el(0, -6, 29, 25, "#d4a373") + el(0, 8, 15, 11, "#fff8e1") + el(-14, -4, 7, 5, "#fff8e1") + el(14, -4, 7, 5, "#fff8e1") + eyes(-10, 11, 4) + el(0, 2, 5, 3.6, "#222") + path("M-4 10 Q0 18 4 10Z", "#ff8a80");
      case "karasu": return path("M-6 20 L-30 50 L0 40 L20 50Z", "#1a1a1a") + el(0, 22, 26, 26, "#222") + path("M-20 10 Q-40 30 -24 44 Q-10 30 -8 14Z", "#2c2c40") +
        circ(0, -16, 24, "#222") + path("M14 -22 Q46 -16 42 -10 Q34 -4 14 -6Z", "#333") + `<path d="M16 -14 L40 -11" stroke="#555" stroke-width="1"/>` + circ(4, -22, 5.5, "#fff") + circ(5, -22, 3.4, "#222") + circ(6, -23.5, 1.2, "#fff") +
        `<path d="M-10 46 v10 l-5 4 M-10 56 l5 4 M8 46 v10 l-5 4 M8 56 l5 4" stroke="#444" stroke-width="2.4" stroke-linecap="round"/>`;
      case "kamo": return el(0, 26, 34, 24, "#8a6e4b") + path("M-30 18 Q-6 4 24 20 Q8 36 -26 32Z", "#6d5638") + path("M-16 22 h18 v6 h-18Z", "#1e88e5") +
        circ(4, -16, 22, "#a1886a") + path("M-14 -18 Q4 -10 24 -18", "none", ' stroke="#4e3b28" stroke-width="3"') + path("M-14 -28 Q6 -40 24 -26 Q10 -32 -14 -28Z", "#4e3b28") +
        path("M20 -12 Q46 -14 46 -6 Q44 0 20 -2Z", "#333") + path("M38 -12 Q46 -12 46 -6 Q44 -2 38 -3Z", "#ffca28") + circ(10, -19, 3.4, "#222") + circ(11, -20, 1.2, "#fff") +
        `<path d="M-6 48 l-4 8 h10 M8 48 l-4 8 h10" stroke="#ff8f00" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return circ(0, 0, 40, "#ccc");
  }
  function silhouette(id) { return `<g filter="url(#sil)">${animal(id)}</g>`; }

  /* ───────── げんば ───────── */
  const SKY = { yuki: ["#cfd8dc", "#eceff1"], default: ["#81d4fa", "#e1f5fe"] };
  function sky(name, night) {
    const s = night ? ["#1a237e", "#5c6bc0"] : (SKY[name] || SKY.default);
    return `<defs><linearGradient id="sky-${name}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset="1" stop-color="${s[1]}"/></linearGradient></defs><rect width="800" height="500" fill="url(#sky-${name})"/>`;
  }
  const grass = (x, y, c) => `<path d="M${x} ${y} q-3 -10 -6 -14 M${x} ${y} q0 -12 1 -16 M${x} ${y} q3 -10 7 -13" stroke="${c || "#689f38"}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  function bigTree(x, y, s, snow) {
    const leaf = snow ? "#eceff1" : "#558b2f", leaf2 = snow ? "#fafafa" : "#7cb342";
    return g(`<path d="M-14 0 L-10 -150 L10 -150 L14 0Z" fill="#6d4c41"/><path d="M0 -110 L-50 -150 M0 -90 L46 -130" stroke="#6d4c41" stroke-width="9" stroke-linecap="round"/>` +
      circ(0, -190, 70, leaf) + circ(-60, -150, 46, leaf2) + circ(60, -160, 48, leaf2) + circ(10, -230, 44, leaf2) + (snow ? circ(-20, -200, 30, "#fff") : ""), x, y, s);
  }
  function house(x, y) {
    return g(`<rect x="0" y="0" width="230" height="170" fill="#ffe0b2" stroke="#bf8f60" stroke-width="3"/>` + path("M-24 0 L115 -90 L254 0Z", "#a1584a") +
      `<rect x="30" y="40" width="60" height="50" fill="#b3e5fc" stroke="#8d6e63" stroke-width="3"/><rect x="140" y="70" width="56" height="100" fill="#8d6e63"/>` +
      `<rect x="80" y="-40" width="70" height="26" fill="#5d4037" opacity=".5"/>`, x, y, 1);
  }
  function wall(x1, x2, y) { return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="60" fill="#d7ccc8" stroke="#a1887f" stroke-width="2"/><rect x="${x1 - 4}" y="${y - 10}" width="${x2 - x1 + 8}" height="12" fill="#bcaaa4"/>` + Array.from({ length: Math.floor((x2 - x1) / 40) }, (_, i) => `<line x1="${x1 + 40 * (i + 1)}" y1="${y}" x2="${x1 + 40 * (i + 1)}" y2="${y + 60}" stroke="#bcaaa4"/>`).join(""); }
  function pole() { return `<rect x="96" y="40" width="12" height="300" fill="#9e9e9e"/><rect x="76" y="56" width="52" height="8" fill="#757575"/><path d="M0 80 Q300 120 800 70" stroke="#424242" stroke-width="2.5" fill="none"/>`; }
  function strawberry(x, y) { return g(el(0, 0, 18, 8, "#558b2f") + el(-10, -4, 9, 5, "#7cb342") + el(10, -4, 9, 5, "#7cb342") + path("M-4 2 q4 12 8 0Z", "#e53935") + path("M8 0 q3 9 6 0Z", "#e53935"), x, y, 1); }

  /* てがかり を おく ばしょ（ground と high）。シーン の え に あわせて ある */
  const SCENES = {
    hatake: {
      draw: () => sky("hatake") + bigTree(690, 300, 0.95) + `<rect y="250" width="800" height="250" fill="#a1887f"/>` +
        [290, 350, 420].map((y) => `<rect x="0" y="${y}" width="800" height="26" fill="#8d6e63"/>` + Array.from({ length: 9 }, (_, i) => strawberry(40 + i * 92 + (y % 3) * 10, y + 6)).join("")).join("") +
        `<path d="M0 250 Q200 230 400 246 T800 240 L800 250 L0 250Z" fill="#689f38"/>` + Array.from({ length: 16 }, (_, i) => `<rect x="${i * 52}" y="214" width="6" height="40" fill="#a1887f"/>`).join("") + `<path d="M0 226 H800 M0 240 H800" stroke="#a1887f" stroke-width="3"/>`,
      ground: [[130, 330], [330, 395], [520, 330], [230, 450], [620, 445], [430, 455]], high: [[640, 110], [740, 150], [700, 230]]
    },
    yuki: {
      draw: () => sky("yuki") + `<path d="M0 230 Q160 200 360 230 T800 210 V500 H0Z" fill="#fafafa"/>` + bigTree(680, 300, 0.95, true) + house(-40, 110).replace('fill="#a1584a"', 'fill="#eceff1"') +
        Array.from({ length: 40 }, (_, i) => circ((i * 97) % 800, (i * 53) % 220, 2.4, "#fff")).join("") + `<path d="M0 300 Q400 280 800 310" stroke="#e0e0e0" stroke-width="2" fill="none"/>`,
      ground: [[300, 330], [470, 400], [200, 440], [600, 445], [380, 450], [560, 330]], high: [[630, 110], [740, 150], [120, 70]]
    },
    mori: {
      draw: () => sky("mori") + `<rect y="230" width="800" height="270" fill="#8d6e63"/>` + bigTree(120, 280, 0.8) + bigTree(400, 260, 0.6) + bigTree(690, 300, 0.95) +
        Array.from({ length: 30 }, (_, i) => el((i * 131) % 800, 260 + ((i * 71) % 230), 10, 4, i % 3 ? "#e65100" : "#ffb300", ` opacity=".6" transform="rotate(${i * 40} ${(i * 131) % 800} ${260 + ((i * 71) % 230)})"`)).join("") +
        Array.from({ length: 14 }, (_, i) => grass(30 + i * 57, 240 + (i % 3) * 8, "#558b2f")).join(""),
      ground: [[250, 340], [470, 360], [150, 445], [370, 455], [590, 440], [700, 360]], high: [[640, 110], [740, 160], [110, 120]]
    },
    niwa: {
      draw: () => sky("niwa", false) + house(30, 90) + `<rect y="260" width="800" height="240" fill="#9ccc65"/>` + pole() + wall(300, 800, 230) +
        Array.from({ length: 18 }, (_, i) => grass(20 + i * 45, 300 + (i % 4) * 40)).join("") + bigTree(690, 230, 0.7),
      ground: [[150, 330], [330, 380], [520, 420], [230, 450], [660, 455], [430, 330]], high: [[460, 225], [130, 55], [640, 105]]
    },
    kawa: {
      draw: () => sky("kawa") + `<rect y="230" width="800" height="270" fill="#c8b58c"/>` + path("M380 230 Q460 320 420 500 H800 V230Z", "#4fc3f7") + path("M420 260 Q480 330 460 500", "none", ' stroke="#b3e5fc" stroke-width="6" opacity=".6"') +
        Array.from({ length: 12 }, (_, i) => `<path d="M${400 + (i % 4) * 8} ${240 + i * 20} q-6 -30 -2 -60" stroke="#7cb342" stroke-width="3" fill="none"/>`).join("") + bigTree(150, 260, 0.85) +
        Array.from({ length: 10 }, (_, i) => circ(40 + i * 33, 300 + (i % 3) * 60, 6, "#9e9e9e")).join(""),
      ground: [[110, 330], [300, 360], [200, 450], [370, 450], [560, 445], [80, 450]], high: [[110, 90], [200, 120], [620, 80]]
    },
    yama: {
      draw: () => sky("yama") + path("M0 240 L180 90 L330 220 L500 60 L800 240Z", "#7cb342") + path("M500 60 L540 100 L470 110Z", "#fff") +
        `<rect y="240" width="800" height="260" fill="#8d6e63"/>` + path("M300 500 Q380 360 560 240 L620 240 Q470 360 420 500Z", "#a1887f") +
        bigTree(110, 290, 0.75) + bigTree(700, 300, 0.85) + Array.from({ length: 20 }, (_, i) => grass(20 + i * 40, 260 + (i % 4) * 55, "#558b2f")).join(""),
      ground: [[200, 340], [420, 330], [600, 400], [250, 450], [480, 450], [700, 455]], high: [[100, 110], [680, 120], [760, 170]]
    },
    koen: {
      draw: () => sky("koen") + `<rect y="230" width="800" height="270" fill="#9ccc65"/>` + path("M60 300 H420 L460 470 H20Z", "#ffe0a3") + `<rect x="56" y="296" width="368" height="8" fill="#bf8f60"/>` +
        `<rect x="520" y="300" width="160" height="14" fill="#8d6e63"/><rect x="530" y="314" width="10" height="40" fill="#6d4c41"/><rect x="660" y="314" width="10" height="40" fill="#6d4c41"/><rect x="520" y="270" width="160" height="10" fill="#8d6e63"/>` +
        bigTree(700, 250, 0.75) + `<path d="M0 240 H800" stroke="#7cb342" stroke-width="4"/>`,
      ground: [[150, 360], [330, 420], [560, 400], [700, 450], [230, 450], [470, 340]], high: [[650, 90], [740, 130], [600, 160]]
    }
  };
  function scene(name) { return SCENES[name] || SCENES.hatake; }

  root.AT_DRAW = { print, clue, animal, silhouette, scene, SCENES };
})(typeof window !== "undefined" ? window : globalThis);
