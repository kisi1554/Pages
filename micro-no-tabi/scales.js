/* ミクロの たび：せかいの だん（げんし 10^-10m 〜 ぎんがけい 10^21m）
   - 1だん = 10ばい。だん e の え（SVG）は viewBox -50..50 で、10^e メートル ＝ 15 め もり。
   - だん e の え の なかの at の ばしょに、ひとつ ちいさい だん（e-1）の え が 1/10 で はいる。
     （まんなかに まえの だんが ちいさく 見える。パワーズ・オブ・テン ふう。え は オリジナル）
   - もじの {漢字|よみ} は ふりがな つき で ひょうじ する。
   node でも ブラウザでも よめる（module.exports / window.MT_SCALES） */
(function (root) {
  "use strict";

  const UNIT = 15; // 10^e メートル が え の なかで 15
  const R = (n) => Math.round(n * 100) / 100;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const c = (x, y, r, fill, extra) => `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
  const poly = (pts, fill, extra) => `<path d="M${pts.map((p) => R(p[0]) + " " + R(p[1])).join("L")}Z" fill="${fill}"${extra ? " " + extra : ""}/>`;
  const line = (pts, stroke, w, extra) => `<path d="M${pts.map((p) => R(p[0]) + " " + R(p[1])).join("L")}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? " " + extra : ""}/>`;
  const glow = (id, inner, outer) => `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${inner}"/><stop offset="0.35" stop-color="${inner}" stop-opacity="0.75"/><stop offset="1" stop-color="${outer}" stop-opacity="0"/></radialGradient></defs>`;
  function stars(seed, n, rmax, opts) {
    const r = rng(seed), o = opts || {};
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = r() * 100 - 50, y = r() * 100 - 50;
      if (o.skip && Math.hypot(x, y) < o.skip) continue;
      const col = (o.cols || ["#fff", "#d0ebff", "#fff3bf"])[Math.floor(r() * 3) % (o.cols || [0, 0, 0]).length];
      s += c(x, y, (0.15 + r() * rmax), col, `opacity="${R(0.4 + r() * 0.6)}"`);
    }
    return s;
  }
  function ring(seed, n, r0, r1, rad, col, op) {
    const r = rng(seed);
    let s = "";
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = r0 + (r1 - r0) * Math.sqrt(r());
      s += c(Math.cos(a) * d, Math.sin(a) * d, rad * (0.6 + r() * 0.8), col, `opacity="${op || 0.8}"`);
    }
    return s;
  }
  const orbit = (r, col, w, dash) => `<circle r="${R(r)}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

  // ちきゅうぎ・にほん・かんとう の ちず（けいど・いど → え の ざひょう）
  const YOKO = [139.64, 35.44]; // よこはま
  function ll(scaleKm) {
    const kx = Math.cos(YOKO[1] * Math.PI / 180) * 111.3, ky = 111.1;
    return (p) => [(p[0] - YOKO[0]) * kx / scaleKm, -(p[1] - YOKO[1]) * ky / scaleKm];
  }
  const HONSHU = [[141.5, 41.4], [141.4, 40.5], [142.0, 39.6], [141.6, 38.4], [141.0, 38.2], [140.9, 37.0], [140.6, 36.3], [140.85, 35.7], [140.4, 35.2], [139.85, 34.9], [139.82, 35.3], [140.05, 35.55], [139.9, 35.65], [139.78, 35.63], [139.67, 35.46], [139.67, 35.28], [139.62, 35.14], [139.4, 35.31], [139.15, 35.25], [139.08, 35.0], [139.1, 34.75], [138.85, 34.6], [138.75, 34.75], [138.85, 35.05], [138.4, 34.9], [138.2, 34.6], [137.0, 34.6], [136.9, 34.3], [136.8, 33.9], [135.8, 33.45], [135.1, 34.2], [135.2, 34.7], [134.0, 34.6], [133.0, 34.4], [132.4, 34.3], [131.0, 33.95], [131.2, 34.4], [132.0, 34.9], [133.0, 35.5], [134.2, 35.55], [135.4, 35.6], [136.0, 35.8], [136.7, 37.3], [137.2, 36.8], [138.2, 37.1], [139.0, 37.9], [139.8, 39.0], [140.0, 40.0], [140.0, 40.8], [140.9, 41.2]];
  const HOKKAIDO = [[140.1, 41.45], [140.0, 42.3], [139.8, 42.6], [140.3, 43.2], [141.4, 43.2], [141.6, 44.4], [141.9, 45.5], [142.6, 44.8], [143.6, 44.1], [145.3, 44.3], [145.6, 43.3], [144.4, 42.9], [143.3, 42.0], [141.6, 42.6], [140.9, 42.3], [141.0, 41.8]];
  const SHIKOKU = [[132.0, 33.4], [132.5, 32.8], [133.6, 33.5], [134.2, 33.2], [134.7, 34.0], [134.2, 34.35], [133.0, 34.1], [132.6, 34.0]];
  const KYUSHU = [[130.9, 33.9], [131.7, 33.4], [131.9, 32.8], [131.5, 31.5], [131.1, 31.0], [130.6, 31.0], [130.2, 31.3], [130.3, 32.1], [130.0, 32.7], [129.6, 32.8], [129.7, 33.4], [130.4, 33.65]];
  const OKINAWA = [[127.6, 26.1], [128.3, 26.8], [128.0, 26.9], [127.7, 26.4]];
  const SADO = [[138.2, 37.8], [138.5, 38.3], [138.3, 38.2], [138.2, 38.0]];

  // ちきゅうぎ（よこはま を まんなか に した せいしゃほう）
  const CONTINENTS = [
    [[180, 66], [170, 60], [163, 58], [160, 54], [156, 51], [155, 59], [143, 59], [141, 53], [140, 48], [135, 43], [131, 42.5], [129.5, 40], [129, 35.5], [126.5, 34.5], [126, 37.5], [124.5, 40], [121.5, 39], [122, 40.8], [119, 39], [117.7, 39], [119, 37], [122.5, 37.3], [120, 35.5], [121.9, 31], [122, 29.5], [119.5, 25.5], [114, 22.3], [110, 20.5], [108.5, 21.5], [106, 20], [109, 12], [105, 9], [100, 13.5], [100, 4], [103.5, 1.3], [98, 8], [97, 17], [92, 22], [88, 22], [80, 15], [70, 25], [60, 40], [70, 70], [100, 76], [140, 72], [180, 70]],
    [[114, -22], [115, -34], [118, -35], [123, -34], [131, -31.5], [135, -35], [138, -35], [140, -38], [146, -39], [150, -37], [153, -29], [153, -25], [146, -19], [142, -11], [141, -17], [136, -12], [130, -12], [126, -14], [122, -17]],
    [[109, 1], [111, -3], [116, -4], [119, 1], [117, 7], [113, 3]],
    [[131, -1], [141, -3], [147, -6], [150, -10], [141, -9], [138, -8], [132, -4]],
    [[120, 18], [122, 18], [126, 7], [122, 7], [120, 14]],
    [[95, 5], [106, -6], [104, -5], [98, 2]],
    [[120.5, 22], [121, 25], [122, 25], [121, 22]],
    [[-168, 66], [-162, 71], [-140, 70], [-125, 70], [-125, 49], [-124, 40], [-117, 32], [-100, 20], [-60, 50]],
    HOKKAIDO, HONSHU, SHIKOKU, KYUSHU,
  ];
  function ortho(R0) {
    const l0 = YOKO[0] * Math.PI / 180, p0 = YOKO[1] * Math.PI / 180;
    return (p) => {
      const l = p[0] * Math.PI / 180, ph = p[1] * Math.PI / 180;
      let x = Math.cos(ph) * Math.sin(l - l0);
      let y = Math.cos(p0) * Math.sin(ph) - Math.sin(p0) * Math.cos(ph) * Math.cos(l - l0);
      const cosc = Math.sin(p0) * Math.sin(ph) + Math.cos(p0) * Math.cos(ph) * Math.cos(l - l0);
      if (cosc < 0) { const m = Math.hypot(x, y) || 1; x /= m; y /= m; }
      return [x * R0, -y * R0];
    };
  }

  /* ---------- せかいの だん ---------- */
  const STAGES = [
    {
      e: -10, id: "genshi", emoji: "⚛️", name: "げんし", size: 1e-10, bg: "#151a3d",
      desc: "ぜんぶの ものは この ちいさな つぶ「げんし」で できている。まんなかの かくは ほんとうは もっと ずっと ちいさい！",
      at: null,
      art() {
        let s = glow("g-at", "#a5d8ff", "#4dabf7") + c(0, 0, 24, "url(#g-at)", 'opacity="0.85"');
        for (const rot of [0, 60, 120]) s += `<ellipse rx="22" ry="8" fill="none" stroke="#d0ebff" stroke-width="0.5" opacity="0.6" transform="rotate(${rot})"/>`;
        for (const [rot, t] of [[0, 0.3], [60, 2.2], [120, 4.1], [0, 3.6], [60, 5.4], [120, 1.2]]) {
          const a = rot * Math.PI / 180, x = 22 * Math.cos(t), y = 8 * Math.sin(t);
          s += c(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), 1.3, "#ffe066");
        }
        [[0, 0], [1.5, 1], [-1.4, 0.9], [0.3, -1.5], [-0.9, -1.2], [1.2, -0.8]].forEach((p, i) => { s += c(p[0], p[1], 1.4, i % 2 ? "#adb5bd" : "#ff6b6b", 'stroke="#fff" stroke-width="0.2"'); });
        return s;
      },
    },
    {
      e: -9, id: "dna", emoji: "🧬", name: "DNA", size: 2e-9, bg: "#151a3d",
      desc: "からだの せっけいず「DNA」。2ほんの ひもが ねじれた はしごの かたち。",
      at: [0, 0],
      art() {
        const A = 14, P = 51, ph2 = Math.PI * 0.8;
        const pt = (y, k) => { const t = 2 * Math.PI * y / P + (k ? ph2 : 0); return [A * Math.sin(t), Math.cos(t)]; };
        let back = "", rungs = "", front = "";
        const cols = [["#ff8787", "#69db7c"], ["#ffd43b", "#748ffc"]];
        for (let y = -70; y <= 70; y += 5) {
          const a = pt(y, 0), b = pt(y, 1), m = (a[0] + b[0]) / 2, cc = cols[Math.abs(Math.round(y / 5)) % 2];
          rungs += line([[a[0], y], [m, y]], cc[0], 1.6) + line([[m, y], [b[0], y]], cc[1], 1.6);
        }
        for (let y = -72; y <= 72; y += 2.4) {
          for (const k of [0, 1]) {
            if (k === 0 && Math.abs(y) < 1) continue; // まんなか は げんし の え
            const p = pt(y, k), col = k ? "#ffa94d" : "#4dabf7";
            const ball = c(p[0], y, 2.3, col, `stroke="#fff" stroke-width="0.25" opacity="${p[1] < 0 ? 0.55 : 1}"`);
            if (p[1] < 0) back += ball; else front += ball;
          }
        }
        return back + rungs + front;
      },
    },
    {
      e: -8, id: "tanpaku", emoji: "🧩", name: "たんぱくしつ", size: 1e-8, bg: "#151a3d",
      desc: "ウイルスの からを つくる ぶひん「たんぱくしつ」。なかに DNAが ぎゅうぎゅうに しまってある。",
      at: [0, 0],
      art() {
        let s = `<path d="M-60 -60H60V-30C40 -36 -40 -36 -60 -30Z" fill="#ffdeeb"/>`;
        for (let x = -56; x <= 56; x += 7) {
          const y = -31 + (x * x) / 900 - 1;
          s += c(x, y, 4, "#ff922b", 'stroke="#e8590c" stroke-width="0.6"') + c(x + 3.5, y + 5, 3.3, "#ffa94d", 'stroke="#e8590c" stroke-width="0.5"');
        }
        for (let x = -35; x <= 35; x += 7) {
          if (x === 0) continue;
          const pts = [];
          for (let y = -22; y <= 60; y += 3) pts.push([x + 2.2 * Math.sin(y / 6 + x), y]);
          s += line(pts, "#4dabf7", 3, 'opacity="0.85"') + line(pts, "#ffa94d", 0.6, 'stroke-dasharray="1 2.4"');
        }
        const p0 = [];
        for (let y = -22; y <= 60; y += 3) p0.push([0, y]);
        s += line(p0, "#4dabf7", 3);
        return s;
      },
    },
    {
      e: -7, id: "uirusu", emoji: "🛸", name: "ウイルス", size: 2e-7, bg: "#ffdeeb",
      desc: "さいきんに とりつく ウイルス「ファージ」。つきの たんさき みたいな かたち！",
      at: [0, -15],
      art() {
        let s = `<path d="M-60 20C-30 17 30 17 60 20V60H-60Z" fill="#51cf66"/><path d="M-60 23C-30 20 30 20 60 23" fill="none" stroke="#2f9e44" stroke-width="1.5"/>`;
        // あたま（から）
        const hx = [];
        for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; hx.push([Math.cos(a) * 9, -14 + Math.sin(a) * 9]); }
        s += poly(hx, "#151a3d", 'stroke="#ff922b" stroke-width="1.6"');
        s += line([[-4, -16], [3, -12], [-3, -9], [4, -18]], "#4dabf7", 0.6, 'opacity="0.6"');
        // しっぽ と あし
        s += `<rect x="-3" y="-4.5" width="6" height="2" rx="0.5" fill="#ffa94d"/><rect x="-1.8" y="-3" width="3.6" height="16" fill="#fd7e14" stroke="#e8590c" stroke-width="0.4"/>`;
        for (let y = -2; y < 13; y += 1.6) s += line([[-1.8, y], [1.8, y]], "#e8590c", 0.3);
        s += `<rect x="-4" y="12.5" width="8" height="2" rx="0.6" fill="#ffa94d"/>`;
        for (const k of [-1, 1]) {
          s += line([[k * 3, 13.5], [k * 9, 15], [k * 11, 20]], "#fd7e14", 0.8) + line([[k * 2, 14], [k * 5.5, 16.5], [k * 6.5, 20]], "#fd7e14", 0.8);
        }
        return s;
      },
    },
    {
      e: -6, id: "saikin", emoji: "🦠", name: "さいきん", size: 2e-6, bg: "#ffdeeb",
      desc: "ひふの うえにも {細菌|さいきん}が いっぱい。ほとんどは わるさを しない。",
      at: [0, -7],
      art() {
        let s = "";
        const fl = (x, y, dir) => { const pts = []; for (let i = 0; i <= 30; i++) pts.push([x + dir * i * 1.3, y + Math.sin(i / 2.5) * 2]); return line(pts, "#2b8a3e", 0.5, 'opacity="0.7"'); };
        s += fl(16, 2, 1) + fl(16, -2, 1) + fl(-16, 1, -1) + fl(-16, -3, -1);
        s += `<rect x="-17" y="-5.2" width="34" height="10.4" rx="5.2" fill="#51cf66" stroke="#2f9e44" stroke-width="0.8"/>`;
        s += `<ellipse cx="-4" cy="1" rx="6" ry="2" fill="#40c057" opacity="0.7"/><ellipse cx="7" cy="1.5" rx="3" ry="1.2" fill="#40c057" opacity="0.7"/>`;
        const r = rng(6);
        for (let i = 0; i < 4; i++) { const x = -40 + r() * 80, y = 18 + r() * 25, a = r() * 180; s += `<rect x="${R(x - 8)}" y="${R(y - 3)}" width="16" height="6" rx="3" fill="#94d82d" stroke="#5c940d" stroke-width="0.6" transform="rotate(${R(a)} ${R(x)} ${R(y)})"/>`; }
        for (let i = 0; i < 3; i++) { const x = -40 + r() * 80, y = -45 + r() * 22; s += c(x, y, 3.5, "#ffa8a8", 'stroke="#e03131" stroke-width="0.6"') + c(x + 6, y + 1, 3.5, "#ffa8a8", 'stroke="#e03131" stroke-width="0.6"'); }
        return s;
      },
    },
    {
      e: -5, id: "saibou", emoji: "🫧", name: "さいぼう", size: 2e-5, bg: "#faa2c1",
      desc: "ひふは ちいさな へや「{細胞|さいぼう}」が あつまって できている。",
      at: [8, 8],
      art() {
        const cells = [
          [[-22, -18], [8, -24], [24, -6], [20, 20], [-4, 26], [-24, 8]],
          [[-60, -60], [-10, -60], [8, -24], [-22, -18], [-60, -20]],
          [[-10, -60], [60, -60], [60, -20], [24, -6], [8, -24]],
          [[60, -20], [60, 40], [20, 20], [24, -6]],
          [[20, 20], [60, 40], [60, 60], [0, 60], [-4, 26]],
          [[-60, -20], [-22, -18], [-24, 8], [-4, 26], [0, 60], [-60, 60]],
        ];
        let s = "";
        const shrink = (pts) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length; return pts.map((p) => [cx + (p[0] - cx) * 0.95, cy + (p[1] - cy) * 0.95]); };
        cells.forEach((pts) => { s += poly(shrink(pts), "#ffdeeb", 'stroke="#f06595" stroke-width="0.8"'); });
        s += `<ellipse cx="-6" cy="-3" rx="8" ry="6" fill="#da77f2" stroke="#ae3ec9" stroke-width="0.6"/><circle cx="-4" cy="-4" r="2" fill="#ae3ec9"/>`;
        [[-30, -40], [34, -38], [44, 12], [30, 44], [-36, 30]].forEach((p) => { s += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="7" ry="5.5" fill="#da77f2" opacity="0.8"/>`; });
        const r = rng(5);
        for (let i = 0; i < 40; i++) s += c(-50 + r() * 100, -50 + r() * 100, 0.6, "#f783ac", 'opacity="0.6"');
        return s;
      },
    },
    {
      e: -4, id: "kaminoke", emoji: "💇", name: "かみのけ", size: 8e-5, bg: "#ffdeeb",
      desc: "かみのけの ふとさは 0.1ミリより ほそい。うろこの ような もようが ある。",
      at: [-18, 13],
      art() {
        let s = "";
        for (let y = -54; y < 56; y += 4) for (let x = -54 + (Math.abs(y) % 8 ? 2.5 : 0); x < 56; x += 5) s += `<path d="M${x} ${y}l2.5 -1.4l2.5 1.4v2.8l-2.5 1.4l-2.5 -1.4Z" fill="none" stroke="#faa2c1" stroke-width="0.3"/>`;
        s += `<g transform="rotate(30)"><rect x="-80" y="-6" width="160" height="12" fill="#5c3d2e"/>`;
        for (let x = -80; x < 80; x += 4) s += `<path d="M${x} -6Q${x + 3} 0 ${x} 6" fill="none" stroke="#8d6346" stroke-width="0.6"/>`;
        s += `<rect x="-80" y="-6" width="160" height="2.2" fill="#a47551" opacity="0.6"/></g>`;
        return s;
      },
    },
    {
      e: -3, id: "dani", emoji: "🕷️", name: "ダニ", size: 1e-3, bg: "#ffdeeb",
      desc: "ダニの こども。あしが 8ほん。クモの なかま だよ。",
      at: [-18, 13],
      art() {
        let s = "";
        for (let k = -9; k <= 9; k++) {
          const pts = [];
          for (let x = -60; x <= 60; x += 6) pts.push([x, k * 7.5 + 8 * Math.sin(x / 40 + k * 0.15)]);
          s += line(pts, "#faa2c1", 2.6);
        }
        // かみのけ（-4 の だん と おなじ むき）
        s += `<g transform="translate(-18 13) rotate(30)"><rect x="-120" y="-0.6" width="240" height="1.2" fill="#5c3d2e"/></g>`;
        // ダニ
        for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
          const y = -4 + i * 2.7, x = k * 5.5;
          s += line([[x, y], [x + k * 5, y - 3 + i * 1.6], [x + k * 9, y + 1 + i * 2]], "#c08e6b", 1, "");
        }
        s += `<ellipse cx="0" cy="1" rx="7" ry="8.5" fill="#f1dcc7" stroke="#c08e6b" stroke-width="0.7"/><ellipse cx="0" cy="-8" rx="2.4" ry="2" fill="#e0b896" stroke="#c08e6b" stroke-width="0.5"/>`;
        s += c(-2, -2, 0.8, "#8d6346") + c(2, -2, 0.8, "#8d6346") + line([[-3, 4], [0, 6], [3, 4]], "#e0b896", 0.6);
        return s;
      },
    },
    {
      e: -2, id: "shimon", emoji: "☝️", name: "ゆびの もよう", size: 1.5e-2, bg: "#e7f5ff",
      desc: "ゆびの もよう「{指紋|しもん}」は ひとり ひとり ちがう。",
      at: [5, 3],
      art() {
        let s = `<path d="M-14 70V0C-14 -22 14 -22 14 0V70Z" fill="#ffdeeb" stroke="#e8a0a0" stroke-width="0.6"/>`;
        s += `<clipPath id="cp-sh"><path d="M-14 70V0C-14 -22 14 -22 14 0V70Z"/></clipPath><g clip-path="url(#cp-sh)">`;
        for (let k = 1; k <= 24; k++) s += `<ellipse cx="1" cy="2" rx="${R(k * 0.75)}" ry="${R(k * 1.0)}" fill="none" stroke="#faa2c1" stroke-width="0.35"/>`;
        s += `<line x1="-20" y1="22" x2="20" y2="22" stroke="#e8a0a0" stroke-width="0.6"/></g>`;
        return s;
      },
    },
    {
      e: -1, id: "te", emoji: "✋", name: "て", size: 1.5e-1, bg: "#e7f5ff",
      desc: "きみの て。ゆびの さきから てくびまで やく 13センチ。",
      at: [-3.6, -12.5],
      art() {
        const sk = 'fill="#ffdeeb" stroke="#e8a0a0" stroke-width="0.4"';
        let s = `<rect x="-6" y="14" width="12" height="40" rx="3" ${sk}/>`;
        s += `<rect x="-9" y="-4" width="18" height="21" rx="6" ${sk}/>`;
        [[-7.6, -10.5, 7], [-3.6, -14, 10.5], [0.4, -15, 11.5], [4.4, -13.5, 10], [8.2, -10, 7]].forEach(([x, y, h]) => { s += `<rect x="${R(x - 1.25)}" y="${y}" width="2.5" height="${h + 6}" rx="1.25" ${sk}/>`; });
        s += `<rect x="-14" y="2" width="2.6" height="10" rx="1.3" transform="rotate(-35 -12.7 7)" ${sk}/>`;
        s += line([[-7, 4], [-1, 6], [6, 3]], "#e8a0a0", 0.35) + line([[-6, 9], [2, 10], [7, 8]], "#e8a0a0", 0.35);
        return s;
      },
    },
    {
      e: 0, id: "kodomo", emoji: "🧒", name: "こども", size: 1.2, bg: "#e7f5ff",
      desc: "ここが スタート！ こどもの せは やく 1.2メートル。",
      at: [6.6, -3.6],
      art() {
        let s = `<rect x="-60" y="8.2" width="120" height="60" fill="#8ce99a"/>`;
        for (let x = -50; x < 50; x += 3) s += line([[x, 8.2], [x + 0.6, 7.2]], "#51cf66", 0.3);
        s += line([[-1.2, 2], [-1.6, 8]], "#495057", 1.4) + line([[1.2, 2], [1.6, 8]], "#495057", 1.4);
        s += `<path d="M-3 -4.5H3L3.6 3H-3.6Z" fill="#ff922b"/>`;
        s += line([[-2.6, -3.8], [-4.6, 0.8]], "#ffd8a8", 1.1) + line([[2.6, -3.8], [6.4, -3.4]], "#ffd8a8", 1.1);
        s += c(0, -7.2, 2.5, "#ffd8a8") + `<path d="M-2.6 -7.6C-2.6 -10.6 2.6 -10.6 2.6 -7.6C1 -8.6 -1 -8.6 -2.6 -7.6Z" fill="#343a40"/>`;
        s += c(-0.9, -7, 0.25, "#343a40") + c(0.9, -7, 0.25, "#343a40") + line([[-0.6, -6], [0, -5.6], [0.6, -6]], "#e8590c", 0.2);
        return s;
      },
    },
    {
      e: 1, id: "kouen", emoji: "🛝", name: "こうえん", size: 20, bg: "#e7f5ff",
      desc: "こうえんで あそぼう。すべりだい・ブランコ・すなば。",
      at: [0, 0],
      art() {
        let s = `<rect x="-60" y="0.82" width="120" height="60" fill="#8ce99a"/>`;
        s += `<ellipse cx="-24" cy="-36" rx="9" ry="3" fill="#fff"/><ellipse cx="22" cy="-30" rx="7" ry="2.4" fill="#fff"/>`;
        // き
        s += `<rect x="13.5" y="-7" width="1.6" height="8" fill="#8d6346"/>` + c(14.3, -10, 4.6, "#40c057") + c(11.5, -7.5, 3, "#51cf66") + c(17, -7.6, 3, "#37b24d");
        // すべりだい
        s += line([[-17, 0.8], [-17, -4]], "#868e96", 0.5) + line([[-15.4, 0.8], [-15.4, -4]], "#868e96", 0.5) + line([[-17.2, -4], [-15.2, -4]], "#fa5252", 0.6) + line([[-15.4, -4], [-9.5, 0.6]], "#fab005", 0.9);
        // ブランコ
        s += line([[24, 0.8], [26, -4.5], [33, -4.5], [35, 0.8]], "#4263eb", 0.5) + line([[28, -4.5], [28, -1]], "#868e96", 0.15) + line([[31, -4.5], [31, -1]], "#868e96", 0.15) + line([[27.4, -1], [28.6, -1]], "#e03131", 0.4) + line([[30.4, -1], [31.6, -1]], "#e03131", 0.4);
        // すなば・ベンチ
        s += `<rect x="-34" y="0.4" width="9" height="1.4" fill="#e9c46a"/>` + line([[5, -0.6], [9, -0.6]], "#8d6346", 0.5) + line([[5.4, -0.6], [5.4, 0.8]], "#495057", 0.3) + line([[8.6, -0.6], [8.6, 0.8]], "#495057", 0.3);
        return s;
      },
    },
    {
      e: 2, id: "gakkou", emoji: "🏫", name: "がっこう", size: 150, bg: "#d8f5a2",
      desc: "がっこうと こうてい。そらの うえから みると こんな かたち。",
      at: [-20, 14],
      art() {
        let s = `<rect x="-60" y="-27" width="120" height="4" fill="#adb5bd"/><rect x="-32" y="-60" width="4" height="120" fill="#adb5bd"/>`;
        s += `<rect x="-24" y="-20" width="44" height="26" rx="2" fill="#e9c46a"/><ellipse cx="-2" cy="-7" rx="17" ry="9" fill="none" stroke="#fff" stroke-width="0.8"/>`;
        s += `<rect x="-24" y="-19" width="44" height="2" fill="#adb5bd" opacity="0.4"/>`;
        s += `<rect x="24" y="-20" width="7" height="34" fill="#f8f9fa" stroke="#868e96" stroke-width="0.5"/><rect x="24" y="8" width="20" height="6" fill="#f8f9fa" stroke="#868e96" stroke-width="0.5"/>`;
        s += `<rect x="25" y="-20" width="5" height="34" fill="#ffa8a8" opacity="0.5"/>`;
        s += `<rect x="34" y="-18" width="12" height="7" fill="#74c0fc" stroke="#fff" stroke-width="0.5"/>`;
        s += `<rect x="-27" y="7" width="22" height="20" rx="3" fill="#b2f2bb"/>` + line([[-27, 17], [-5, 14]], "#e9ecef", 0.8);
        [[-26, -24], [-15, -24], [0, -24], [15, -24], [36, 18], [44, 22], [-40, 30], [-8, 22]].forEach((p) => { s += c(p[0], p[1], 1.6, "#37b24d"); });
        s += `<rect x="-60" y="30" width="28" height="30" fill="#e9ecef"/><rect x="-28" y="30" width="88" height="30" fill="#f1f3f5"/>`;
        for (let x = -24; x < 56; x += 9) s += `<rect x="${x}" y="33" width="6" height="5" fill="#ffc9c9"/><rect x="${x + 1}" y="43" width="6" height="6" fill="#d0bfff"/>`;
        return s;
      },
    },
    {
      e: 3, id: "machi", emoji: "🏘️", name: "まち", size: 1500, bg: "#f1f3f5",
      desc: "いえや みちが ならぶ まち。1キロメートル あるくと やく 15ふん。",
      at: [0, 0],
      art() {
        let s = "";
        const r = rng(3), roofs = ["#ffa8a8", "#a5d8ff", "#ffe066", "#d0bfff", "#b2f2bb", "#ced4da"];
        for (let gx = -54; gx < 54; gx += 9) for (let gy = -54; gy < 54; gy += 9) {
          if (Math.abs(gx + 4) < 8 && Math.abs(gy + 4) < 8) continue;
          if (gx > 20 && gx < 34) continue;
          for (let k = 0; k < 4; k++) s += `<rect x="${R(gx + 0.8 + (k % 2) * 3.6)}" y="${R(gy + 0.8 + Math.floor(k / 2) * 3.6)}" width="${R(2.4 + r())}" height="${R(2.4 + r())}" fill="${roofs[Math.floor(r() * roofs.length)]}"/>`;
        }
        for (let v = -54.5; v < 56; v += 9) s += `<rect x="${v - 0.6}" y="-60" width="1.2" height="120" fill="#fff"/><rect x="-60" y="${v - 0.6}" width="120" height="1.2" fill="#fff"/>`;
        s += `<path d="M24 -60C30 -30 22 0 28 60" fill="none" stroke="#74c0fc" stroke-width="6"/>`;
        s += `<rect x="-60" y="-28" width="120" height="2.4" fill="#ffd43b"/>`;
        s += `<rect x="-38" y="12" width="13" height="10" fill="#8ce99a"/>`;
        return s;
      },
    },
    {
      e: 4, id: "toshi", emoji: "🏙️", name: "おおきな まち", size: 15000, bg: "#e9ecef",
      desc: "かわや せんろが はしる おおきな まち。うみも みえる。",
      at: [-12, 0],
      art() {
        let s = "";
        const r = rng(4);
        for (let i = 0; i < 500; i++) { const x = -55 + r() * 70, y = -55 + r() * 110; s += `<rect x="${R(x)}" y="${R(y)}" width="0.9" height="0.9" fill="${r() < 0.5 ? "#ced4da" : "#dee2e6"}"/>`; }
        [[-36, -30, 5], [-28, 30, 4], [6, 22, 3]].forEach((p) => { s += c(p[0], p[1], p[2], "#8ce99a"); });
        s += `<path d="M12 -60C6 -30 18 -10 10 10C4 30 14 45 12 60H70V-60Z" fill="#74c0fc"/>`;
        s += `<path d="M-60 -18C-40 -10 -20 -22 10 -8" fill="none" stroke="#74c0fc" stroke-width="2.2"/>`;
        s += line([[-60, 40], [-30, 20], [-12, 2], [0, -30], [5, -60]], "#495057", 1.4) + line([[-60, 40], [-30, 20], [-12, 2], [0, -30], [5, -60]], "#fff", 0.6, 'stroke-dasharray="2 2"');
        s += line([[-60, -40], [-30, -10], [-20, 30], [-28, 60]], "#ffa94d", 1.2);
        return s;
      },
    },
    {
      e: 5, id: "kanto", emoji: "🗻", name: "かんとう", size: 2e5, bg: "#d8f5a2",
      desc: "とうきょうわん と ふじさん。{関東|かんとう}ちほう だよ。",
      at: [0, 0],
      art() {
        const f = ll(6.67);
        const sea = [[140.85, 35.7], [140.4, 35.2], [139.85, 34.9], [139.82, 35.3], [140.05, 35.55], [139.9, 35.65], [139.78, 35.63], [139.67, 35.46], [139.67, 35.28], [139.62, 35.14], [139.4, 35.31], [139.15, 35.25], [139.08, 35.0], [139.1, 34.75], [138.85, 34.6], [138.75, 34.75], [138.85, 35.05], [138.4, 34.9], [138.2, 34.6], [136.5, 34.5], [136.5, 32], [143.5, 32], [143.5, 35.7]];
        let s = "";
        const r = rng(55);
        for (let i = 0; i < 26; i++) { const x = -50 + r() * 40, y = -48 + r() * 40; s += `<path d="M${R(x - 4)} ${R(y + 3)}L${R(x)} ${R(y - 3)}L${R(x + 4)} ${R(y + 3)}Z" fill="#94d82d" opacity="0.6"/>`; }
        s += poly(sea.map(f), "#4dabf7");
        s += `<path d="M-6 -12C2 -14 6 -8 4 -2C2 3 -4 3 -6 -2Z" fill="#ced4da" opacity="0.8"/>`;
        const fj = f([138.73, 35.36]);
        s += `<path d="M${R(fj[0] - 6)} ${R(fj[1] + 3)}L${R(fj[0])} ${R(fj[1] - 4)}L${R(fj[0] + 6)} ${R(fj[1] + 3)}Z" fill="#748ffc"/><path d="M${R(fj[0] - 2)} ${R(fj[1] - 1.3)}L${R(fj[0])} ${R(fj[1] - 4)}L${R(fj[0] + 2)} ${R(fj[1] - 1.3)}Z" fill="#fff"/>`;
        const tk = f([139.76, 35.68]);
        s += c(tk[0], tk[1], 0.9, "#e03131", 'stroke="#fff" stroke-width="0.3"');
        s += line([[139.1, 35.65], [139.4, 35.55], [139.8, 35.6], [140.2, 35.9], [140.7, 36.0]].map(f), "#74c0fc", 0.8);
        return s;
      },
    },
    {
      e: 6, id: "nihon", emoji: "🗾", name: "にほん", size: 3e6, bg: "#4dabf7",
      desc: "{日本|にほん}は ほそながい しまぐに。きたから みなみまで やく 3000キロ。",
      at: [0, 0],
      art() {
        const f = ll(66.7);
        let s = "";
        for (const isl of [HONSHU, HOKKAIDO, SHIKOKU, KYUSHU, OKINAWA, SADO]) s += poly(isl.map(f), "#d8f5a2", 'stroke="#2f9e44" stroke-width="0.35"');
        s += poly([[129, 35.5], [126.5, 34.5], [126, 37.5], [124.5, 40], [129.5, 40], [131, 42.5], [135, 43], [140, 48], [141, 53], [125, 53], [118, 45]].map(f), "#c0eb75", 'opacity="0.75"');
        s += poly([[141.9, 45.9], [142.2, 46.7], [143.5, 49.2], [142.9, 53.5], [142.1, 51], [142.0, 47]].map(f), "#c0eb75", 'opacity="0.75"');
        return s;
      },
    },
    {
      e: 7, id: "chikyu", emoji: "🌏", name: "ちきゅう", size: 1.27e7, bg: "#0b1026",
      desc: "ぼくらの ほし {地球|ちきゅう}。ぐるっと 1しゅう やく 4まんキロ。",
      at: [0, 0],
      art() {
        const RR = 6.37e6 / 1e7 * UNIT, f = ortho(RR);
        let s = stars(7, 60, 0.35, { skip: RR + 3 }) + glow("g-ck", "#a5d8ff", "#a5d8ff") + c(0, 0, RR + 1.6, "url(#g-ck)", 'opacity="0.5"');
        s += `<clipPath id="cp-ck"><circle r="${R(RR)}"/></clipPath>` + c(0, 0, RR, "#4dabf7") + `<g clip-path="url(#cp-ck)">`;
        for (const cont of CONTINENTS) s += poly(cont.map(f), "#8ce99a", 'stroke="#2f9e44" stroke-width="0.08"');
        s += `<ellipse cx="2" cy="-6" rx="4" ry="0.8" fill="#fff" opacity="0.55"/><ellipse cx="-4" cy="5" rx="3" ry="0.6" fill="#fff" opacity="0.5"/>`;
        s += `<circle r="${R(RR)}" fill="none" stroke="#0b1026" stroke-width="2.5" opacity="0.25"/></g>`;
        return s;
      },
    },
    {
      e: 8, id: "himawari", emoji: "🛰️", name: "えいせい ひまわり", size: 8.4e7, bg: "#0b1026",
      desc: "てんきを しらべる {衛星|えいせい}「ひまわり」が ちきゅうと いっしょに まわっている。",
      at: [0, 0],
      art() {
        const r0 = 4.2e7 / 1e8 * UNIT;
        let s = stars(8, 70, 0.35) + orbit(r0, "#ffd43b", 0.12, "0.4 0.3");
        const a = -Math.PI * 0.62, x = Math.cos(a) * r0, y = Math.sin(a) * r0;
        s += `<g transform="translate(${R(x)} ${R(y)}) rotate(20)"><rect x="-0.5" y="-0.12" width="1" height="0.24" fill="#4c6ef5"/><rect x="-0.14" y="-0.2" width="0.28" height="0.4" fill="#ffd43b"/></g>`;
        return s;
      },
    },
    {
      e: 9, id: "tsuki", emoji: "🌙", name: "つきの みち", size: 7.7e8, bg: "#0b1026",
      desc: "{月|つき}まで やく 38まんキロ。ひかりなら 1びょう ちょっと。",
      at: [0, 0],
      art() {
        const r0 = 3.84e8 / 1e9 * UNIT;
        let s = stars(9, 70, 0.35) + orbit(r0, "#dee2e6", 0.16, "0.4 0.3");
        const x = Math.cos(-0.8) * r0, y = Math.sin(-0.8) * r0;
        s += c(x, y, 0.3, "#f1f3f5") + c(x + 0.08, y - 0.05, 0.08, "#ced4da");
        return s;
      },
    },
    {
      e: 10, id: "michi", emoji: "🛤️", name: "ちきゅうの とおりみち", size: 1e10, bg: "#0b1026",
      desc: "ちきゅうは たいようの まわりを 1びょうで 30キロも すすむ！",
      at: [0, 0],
      art() {
        const sx = 0.623, sy = 0.782;
        let s = stars(10, 70, 0.35) + `<defs><linearGradient id="g-mi" x1="0" y1="0" x2="1" y2="1"><stop offset="0.55" stop-color="#ffd43b" stop-opacity="0"/><stop offset="1" stop-color="#ffd43b" stop-opacity="0.5"/></linearGradient></defs><rect x="-50" y="-50" width="100" height="100" fill="url(#g-mi)"/>`;
        s += line([[-sy * 70, sx * 70], [sy * 70, -sx * 70]], "#74c0fc", 0.25, 'stroke-dasharray="1 0.8" opacity="0.8"');
        const ax = sy * 18, ay = -sx * 18;
        s += line([[ax - sy * 5 - sx * 2, ay + sx * 5 - sy * 2], [ax, ay], [ax - sy * 5 + sx * 2, ay + sx * 5 + sy * 2]], "#74c0fc", 0.4);
        return s;
      },
    },
    {
      e: 11, id: "taiyou", emoji: "☀️", name: "たいよう", size: 1.5e11, bg: "#0b1026",
      desc: "まんなかに {太陽|たいよう}。ちきゅうは 1ねん かけて ひとまわり。",
      at: [-14, -17.6],
      art() {
        const au = 1.5e11 / 1e11 * UNIT;
        let s = stars(11, 60, 0.3) + glow("g-ty", "#ffe066", "#ff922b") + c(0, 0, 3.4, "url(#g-ty)") + c(0, 0, 0.9, "#fff9db");
        [[0.39, "#adb5bd", 1.2], [0.72, "#ffe8cc", 3.3], [1, "#74c0fc", 0], [1.52, "#ff8787", 5.0]].forEach(([d, col, a]) => {
          s += orbit(d * au, "#4c6ef5", 0.15);
          if (a) s += c(Math.cos(a) * d * au, Math.sin(a) * d * au, 0.5, col);
        });
        return s;
      },
    },
    {
      e: 12, id: "mokusei", emoji: "🟠", name: "もくせいの みち", size: 1.56e12, bg: "#0b1026",
      desc: "いちばん おおきい わくせい {木星|もくせい}。たいようから ちきゅうの 5ばい とおい。",
      at: [0, 0],
      art() {
        const au = 1.5e11 / 1e12 * UNIT;
        let s = stars(12, 60, 0.3) + ring(12, 70, 2.1 * au, 3.3 * au, 0.12, "#868e96", 0.7);
        [[1.52, "#ff8787", 5.0], [5.2, "#ffc078", 0.5], [9.5, "#ffe066", 3.9], [19.2, "#99e9f2", 2.4]].forEach(([d, col, a]) => {
          s += orbit(d * au, "#4c6ef5", 0.15);
          s += c(Math.cos(a) * d * au, Math.sin(a) * d * au, d > 5 ? 0.9 : 0.4, col);
        });
        s += `<ellipse cx="${R(Math.cos(3.9) * 9.5 * au)}" cy="${R(Math.sin(3.9) * 9.5 * au)}" rx="1.8" ry="0.4" fill="none" stroke="#fab005" stroke-width="0.2"/>`;
        return s;
      },
    },
    {
      e: 13, id: "taiyoukei", emoji: "🪐", name: "たいようけい", size: 9e12, bg: "#0b1026",
      desc: "8つの わくせいが まわる {太陽系|たいようけい}。いちばん そとは かいおうせい。",
      at: [0, 0],
      art() {
        const au = 1.5e11 / 1e13 * UNIT;
        let s = stars(13, 60, 0.3) + ring(13, 120, 32 * au, 50 * au, 0.12, "#a5d8ff", 0.6) + glow("g-tk", "#ffe066", "#ff922b") + c(0, 0, 0.8, "url(#g-tk)");
        [[5.2, "#ffc078", 0.5], [9.5, "#ffe066", 3.9], [19.2, "#99e9f2", 2.4], [30, "#4c6ef5", 5.5]].forEach(([d, col, a]) => {
          s += orbit(d * au, "#748ffc", 0.18);
          s += c(Math.cos(a) * d * au, Math.sin(a) * d * au, 0.45, col);
        });
        return s;
      },
    },
    {
      e: 14, id: "kaze", emoji: "🌬️", name: "たいようの かぜ", size: 3.6e13, bg: "#0b1026",
      desc: "たいようの かぜが とどく シャボンだまの ような せかい。たんさき ボイジャーは その そとへ でた。",
      at: [0, 0],
      art() {
        const au = 1.5e11 / 1e14 * UNIT;
        let s = stars(14, 70, 0.3) + `<defs><radialGradient id="g-kz"><stop offset="0.6" stop-color="#4c6ef5" stop-opacity="0.05"/><stop offset="0.95" stop-color="#748ffc" stop-opacity="0.5"/><stop offset="1" stop-color="#748ffc" stop-opacity="0"/></radialGradient></defs>`;
        s += `<ellipse cx="0.6" cy="0" rx="${R(130 * au)}" ry="${R(110 * au)}" fill="url(#g-kz)" stroke="#91a7ff" stroke-width="0.15"/>`;
        s += ring(14, 50, 32 * au, 50 * au, 0.06, "#a5d8ff", 0.6);
        const v = 167 * au;
        s += c(-v * 0.7, -v * 0.71, 0.18, "#fff") + line([[0, 0], [-v * 0.7, -v * 0.71]], "#fff", 0.05, 'stroke-dasharray="0.2 0.2" opacity="0.6"');
        return s;
      },
    },
    {
      e: 15, id: "oort", emoji: "☄️", name: "ほうきぼしの ふるさと", size: 1e15, bg: "#0b1026",
      desc: "ほうきぼしの たまごが うかぶ「オールトの くも」。たいようから とても とおい。",
      at: [0, 0],
      art() {
        let s = stars(15, 50, 0.3) + ring(151, 240, 4.5, 60, 0.18, "#c5f6fa", 0.55);
        s += `<g transform="translate(-16 10) rotate(-25)"><path d="M0 0L9 -1.4L9 1.4Z" fill="#99e9f2" opacity="0.5"/>` + c(0, 0, 0.5, "#e3fafc") + `</g>`;
        return s;
      },
    },
    {
      e: 16, id: "kounen", emoji: "💡", name: "1こうねん", size: 9.46e15, bg: "#0b1026",
      desc: "ひかりが 1ねんで すすむ きょり＝1{光年|こうねん}。やく 9ちょう5000おく キロ！",
      at: [0, 0],
      art() {
        const ly = 9.46e15 / 1e16 * UNIT;
        return stars(16, 60, 0.3) + ring(161, 220, 0.45, 22, 0.08, "#c5f6fa", 0.5) + orbit(ly, "#ffd43b", 0.15, "0.8 0.6");
      },
    },
    {
      e: 17, id: "tonari", emoji: "⭐", name: "となりの ほし", size: 4.1e16, bg: "#0b1026",
      desc: "いちばん ちかい ほし「ケンタウルスざ アルファ」。ひかりでも 4ねん いじょう かかる！",
      at: [0, 0],
      art() {
        const ly = 9.46e15 / 1e17 * UNIT;
        let s = stars(17, 70, 0.3) + ring(171, 80, 0.05, 2.2, 0.05, "#c5f6fa", 0.35);
        s += glow("g-tn", "#fff3bf", "#ffd43b");
        [[4.37, -0.6, 1.3, "url(#g-tn)"], [5.96, 2.3, 0.9, "url(#g-tn)"], [8.6, 3.6, 1.6, "url(#g-tn)"], [11.4, 5.3, 1.0, "url(#g-tn)"]].forEach(([d, a, r, f]) => { s += c(Math.cos(a) * d * ly, Math.sin(a) * d * ly, r, f); });
        return s;
      },
    },
    {
      e: 18, id: "hoshitachi", emoji: "✨", name: "ちかくの ほしたち", size: 2.8e17, bg: "#0b1026",
      desc: "シリウスや ベガ。よぞらで あかるく みえる ほしは この くらいの ちかさ。",
      at: [0, 0],
      art() {
        const ly = 9.46e15 / 1e18 * UNIT;
        let s = stars(18, 90, 0.35) + glow("g-hs", "#fff", "#a5d8ff") + glow("g-hs2", "#fff3bf", "#ffa94d");
        const r = rng(181);
        for (let i = 0; i < 28; i++) { const a = r() * 6.28, d = (3 + r() * 40) * ly; s += c(Math.cos(a) * d, Math.sin(a) * d, 0.5 + r() * 0.9, r() < 0.5 ? "url(#g-hs)" : "url(#g-hs2)"); }
        [[8.6, 3.6], [25, -1.8], [36.7, 0.9], [16.7, -2.6]].forEach(([d, a]) => { s += c(Math.cos(a) * d * ly, Math.sin(a) * d * ly, 1.6, "url(#g-hs)"); });
        return s;
      },
    },
    {
      e: 19, id: "subaru", emoji: "🌟", name: "すばる", size: 4.2e18, bg: "#0b1026",
      desc: "あおい ほしの むれ「すばる」。ひかりで やく 440ねん かかる。",
      at: [0, 0],
      art() {
        const ly = 9.46e15 / 1e19 * UNIT;
        let s = stars(19, 150, 0.3) + glow("g-sb", "#d0ebff", "#4dabf7") + glow("g-or", "#ffc9c9", "#fa5252");
        const px = Math.cos(-0.9) * 444 * ly, py = Math.sin(-0.9) * 444 * ly;
        s += c(px, py, 3.2, "url(#g-sb)", 'opacity="0.5"');
        [[0, 0], [1, 0.6], [-0.8, 0.9], [0.4, -0.9], [-1.2, -0.3], [1.6, -0.4], [-0.2, 1.5]].forEach((p) => { s += c(px + p[0] * 0.9, py + p[1] * 0.9, 0.55, "url(#g-sb)"); });
        s += c(Math.cos(2.4) * 548 * ly, Math.sin(2.4) * 548 * ly, 1.5, "url(#g-or)") + c(Math.cos(2.9) * 860 * ly, Math.sin(2.9) * 860 * ly, 1.4, "url(#g-sb)");
        return s;
      },
    },
    {
      e: 20, id: "ude", emoji: "🌠", name: "ぎんがの うで", size: 1e20, bg: "#0b1026",
      desc: "ほしが うずまきの うでの ように ならんでいる。たいようは「オリオンの うで」に いる。",
      at: [0, 0],
      art() {
        let s = `<defs><linearGradient id="g-ud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0bfff" stop-opacity="0"/><stop offset="0.5" stop-color="#e5dbff" stop-opacity="0.45"/><stop offset="1" stop-color="#d0bfff" stop-opacity="0"/></linearGradient></defs>`;
        s += stars(20, 120, 0.25);
        for (const [off, w] of [[0, 9], [-30, 14], [30, 14]]) s += `<g transform="rotate(53) translate(0 ${off})"><rect x="-90" y="${-w / 2}" width="180" height="${w}" fill="url(#g-ud)"/></g>`;
        const r = rng(202);
        for (let i = 0; i < 160; i++) { const t = -60 + r() * 120, k = [0, -30, 30][i % 3], o = (r() - 0.5) * (k ? 12 : 8), a = 53 * Math.PI / 180; s += c(t * Math.cos(a) - (k + o) * Math.sin(a), t * Math.sin(a) + (k + o) * Math.cos(a), 0.2 + r() * 0.3, "#fff", 'opacity="0.8"'); }
        return s;
      },
    },
    {
      e: 21, id: "ginga", emoji: "🌌", name: "ぎんがけい", size: 1e21, bg: "#0b1026",
      desc: "2000おくこ いじょうの ほしの うずまき「{銀河系|ぎんがけい}」。たいようは はしっこの ほう。",
      at: [-3, 2.2],
      art() {
        let s = stars(21, 80, 0.3) + glow("g-gn", "#fff3bf", "#e5dbff") + `<g opacity="0.95">` + c(0, 0, 12, "url(#g-gn)", 'opacity="0.45"');
        for (let arm = 0; arm < 4; arm++) {
          const pts = [];
          for (let t = 0; t < 3.4; t += 0.15) { const rr = 1.2 * Math.exp(0.6 * t), a = t + arm * Math.PI / 2; pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]); }
          s += line(pts, "#d0bfff", 1.8, 'opacity="0.55"') + line(pts, "#fff", 0.5, 'opacity="0.6"');
        }
        s += c(0, 0, 2.6, "url(#g-gn)") + `</g>`;
        return s;
      },
    },
  ];

  // ばけた（たんい）と かず の よみかた
  function sig(x, n) { if (x === 0) return 0; const p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(x)))); return Math.round(x * p) / p; }
  const BIG = [[1e20, "がい"], [1e16, "けい"], [1e12, "ちょう"], [1e8, "おく"], [1e4, "まん"]];
  function jpNum(x) {
    x = sig(x, 2);
    if (x < 10000) return String(Math.round(x * 1000) / 1000);
    let out = "", rest = x;
    for (const [v, w] of BIG) {
      const q = Math.floor(rest / v + 1e-9);
      if (q > 0) { out += q + w; rest -= q * v; }
    }
    rest = Math.round(rest);
    if (rest > 0) out += rest;
    return out;
  }
  const LY = 9.46e15;
  function fmtLen(m) {
    const u = [[1e-6, "nm", 1e9], [1e-3, "μm", 1e6], [1e-2, "mm", 1e3], [1, "cm", 100], [1000, "m", 1], [LY, "km", 1e-3], [Infinity, "こうねん", 1 / LY]];
    for (const [lim, unit, k] of u) if (m < lim * 0.9999) return { num: jpNum(m * k), unit, text: jpNum(m * k) + " " + unit };
  }
  // よみあげ・ひょうじ ようの もじ
  const toHtml = (s) => s.replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
  const toKana = (s) => s.replace(/\{([^|}]+)\|([^}]+)\}/g, "$2");

  // 「Aを 1cm に したら Bは どのくらい？」クイズの もと
  const MODELS = [
    { aEmoji: "🌏", aName: "ちきゅう", aSize: 1.27e7, bEmoji: "🌙", bName: "つきまでの きょり", len: 3.84e8 },
    { aEmoji: "🌏", aName: "ちきゅう", aSize: 1.27e7, bEmoji: "☀️", bName: "たいようの おおきさ", len: 1.39e9 },
    { aEmoji: "🌏", aName: "ちきゅう", aSize: 1.27e7, bEmoji: "☀️", bName: "たいようまでの きょり", len: 1.5e11 },
    { aEmoji: "🫧", aName: "さいぼう", aSize: 2e-5, bEmoji: "🧒", bName: "こどもの せ", len: 1.2 },
    { aEmoji: "⚛️", aName: "げんし", aSize: 1e-10, bEmoji: "💇", bName: "かみのけの ふとさ", len: 8e-5 },
    { aEmoji: "💇", aName: "かみのけの ふとさ", aSize: 8e-5, bEmoji: "🕷️", bName: "ダニ", len: 1e-3 },
    { aEmoji: "🦠", aName: "さいきん", aSize: 2e-6, bEmoji: "✋", bName: "て", len: 0.15 },
    { aEmoji: "🧒", aName: "こども", aSize: 1.2, bEmoji: "🗾", bName: "にほん（きた〜みなみ）", len: 3e6 },
    { aEmoji: "☀️", aName: "たいよう", aSize: 1.39e9, bEmoji: "⭐", bName: "となりの ほし までの きょり", len: 4.1e16 },
  ];

  const API = { UNIT, STAGES, MODELS, fmtLen, jpNum, toHtml, toKana, sig, LY, MIN: -10, MAX: 21 };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MT_SCALES = API;
})(typeof window !== "undefined" ? window : globalThis);
