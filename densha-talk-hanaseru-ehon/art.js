'use strict';

/*
 * え を かく ところ
 *  - はいけい(えき・ホーム・しゃない・ふみきり・トンネル・うみ…)
 *  - でんしゃの キャラクター
 *
 * ぜんぶ SVG の もじれつ を くみたてて かえす。がぞうファイルは つかわない。
 * ざひょうけい は よこ 1000 × たて 620。
 */

const Art = (function () {
  const W = 1000;
  const H = 620;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* おなじ たねなら おなじ ならびに なる らんすう(ほしの ばしょ など) */
  function seeded(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  const f = (n) => Number(n).toFixed(1);

  /* ============================ ぶひん ============================ */

  function sky(id, top, bottom) {
    return (
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
      `</linearGradient></defs>` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#${id})"/>`
    );
  }

  function stars(seed, count, maxY) {
    const r = seeded(seed);
    let s = '';
    for (let i = 0; i < count; i += 1) {
      const x = r() * W;
      const y = r() * (maxY || H * 0.6);
      const rr = 0.8 + r() * 2.2;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="#fff8e7" opacity="${f(0.4 + r() * 0.6)}"/>`;
    }
    return s;
  }

  function clouds(seed, y, scale, opacity) {
    const r = seeded(seed);
    let s = '';
    for (let i = 0; i < 5; i += 1) {
      const cx = r() * W;
      const cy = y + r() * 70;
      const k = (0.7 + r() * 0.7) * (scale || 1);
      s += `<g opacity="${opacity || 0.9}" fill="#ffffff">`;
      s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(52 * k)}" ry="${f(24 * k)}"/>`;
      s += `<ellipse cx="${f(cx - 34 * k)}" cy="${f(cy + 6 * k)}" rx="${f(34 * k)}" ry="${f(17 * k)}"/>`;
      s += `<ellipse cx="${f(cx + 36 * k)}" cy="${f(cy + 7 * k)}" rx="${f(30 * k)}" ry="${f(15 * k)}"/>`;
      s += `</g>`;
    }
    return s;
  }

  function buildings(seed, baseY, color, opacity) {
    const r = seeded(seed);
    let s = `<g fill="${color}" opacity="${opacity || 1}">`;
    let x = -20;
    while (x < W + 20) {
      const w = 46 + r() * 60;
      const h = 60 + r() * 150;
      s += `<rect x="${f(x)}" y="${f(baseY - h)}" width="${f(w)}" height="${f(h)}"/>`;
      /* まど */
      for (let wy = baseY - h + 14; wy < baseY - 16; wy += 24) {
        for (let wx = x + 10; wx < x + w - 12; wx += 20) {
          if (r() > 0.45) {
            s += `<rect x="${f(wx)}" y="${f(wy)}" width="8" height="10" fill="#fff3c4" opacity="0.55"/>`;
          }
        }
      }
      x += w + 6 + r() * 14;
    }
    return s + '</g>';
  }

  /* せんろ(まくらぎ + レール) */
  function rails(y, opts) {
    const o = opts || {};
    const tie = o.tie || '#7a5c3e';
    const rail = o.rail || '#c9ced6';
    let s = `<rect x="0" y="${f(y)}" width="${W}" height="${f(o.h || 46)}" fill="${o.bed || '#8d8577'}"/>`;
    for (let x = -10; x < W + 20; x += 42) {
      s += `<rect x="${f(x)}" y="${f(y + 8)}" width="26" height="${f((o.h || 46) - 14)}" rx="3" fill="${tie}"/>`;
    }
    s += `<rect x="0" y="${f(y + 12)}" width="${W}" height="5" fill="${rail}"/>`;
    s += `<rect x="0" y="${f(y + (o.h || 46) - 16)}" width="${W}" height="5" fill="${rail}"/>`;
    return s;
  }

  /* ホームの ゆか */
  function platform(y, color, edge) {
    let s = `<rect x="0" y="${f(y)}" width="${W}" height="${f(H - y)}" fill="${color || '#d9d2c5'}"/>`;
    s += `<rect x="0" y="${f(y)}" width="${W}" height="10" fill="${edge || '#ffd166'}"/>`;
    s += `<rect x="0" y="${f(y + 10)}" width="${W}" height="4" fill="#00000018"/>`;
    /* てんじブロック */
    for (let x = 6; x < W; x += 34) {
      s += `<rect x="${f(x)}" y="${f(y + 22)}" width="24" height="12" rx="3" fill="#f2b705" opacity="0.85"/>`;
    }
    return s;
  }

  /* えきめいひょうじ */
  function signBoard(x, y, text, sub) {
    let s = `<g>`;
    s += `<rect x="${f(x)}" y="${f(y)}" width="210" height="66" rx="8" fill="#ffffff" stroke="#2b2b2b" stroke-width="3"/>`;
    s += `<rect x="${f(x)}" y="${f(y + 54)}" width="210" height="12" fill="#4aa3df"/>`;
    s += `<text x="${f(x + 105)}" y="${f(y + 38)}" font-size="30" text-anchor="middle" fill="#2b2b2b" font-weight="700">${esc(text)}</text>`;
    if (sub) {
      s += `<text x="${f(x + 105)}" y="${f(y + 62)}" font-size="13" text-anchor="middle" fill="#ffffff">${esc(sub)}</text>`;
    }
    return s + `</g>`;
  }

  /* よこから みた でんしゃ(キャラクターでは ない、けしきの でんしゃ) */
  function sideTrain(x, y, w, color, ink) {
    const h = w * 0.4;
    let s = `<g>`;
    s += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="${f(h * 0.22)}" fill="${color}" stroke="${ink}" stroke-width="3"/>`;
    s += `<rect x="${f(x + w * 0.05)}" y="${f(y - h * 0.78)}" width="${f(w * 0.9)}" height="${f(h * 0.34)}" rx="6" fill="#eaf6ff" opacity="0.9"/>`;
    s += `<rect x="${f(x)}" y="${f(y - h * 0.28)}" width="${f(w)}" height="${f(h * 0.1)}" fill="#ffffff" opacity="0.5"/>`;
    for (let i = 1; i < 4; i += 1) {
      s += `<circle cx="${f(x + (w * i) / 4)}" cy="${f(y + 4)}" r="${f(h * 0.14)}" fill="#333"/>`;
    }
    return s + `</g>`;
  }

  /* ============================ キャラクター ============================ */

  /*
   * でんしゃの キャラクター。
   * ch: { name, color, ink, hat, aura }
   * opts: { emo: 'smile'|'star'|'sleepy'|'wink'|'surprise'|'proud'|'think',
   *         label: false で なまえを けす }
   */
  function train(cx, feetY, scale, ch, opts) {
    const o = opts || {};
    const bodyW = scale * 150;
    const bodyH = scale * 108;
    const bx = cx - bodyW / 2;
    const by = feetY - bodyH - scale * 26;
    const wheelR = scale * 18;
    let s = `<g class="ehon-char">`;

    /* かげ */
    s += `<ellipse cx="${f(cx)}" cy="${f(feetY + 4)}" rx="${f(bodyW * 0.44)}" ry="${f(scale * 9)}" fill="#000" opacity="0.2"/>`;
    /* しゃりん */
    [0.2, 0.8].forEach((p) => {
      const wx = bx + bodyW * p;
      s += `<circle cx="${f(wx)}" cy="${f(by + bodyH + scale * 8)}" r="${f(wheelR)}" fill="#2f2f2f"/>`;
      s += `<circle cx="${f(wx)}" cy="${f(by + bodyH + scale * 8)}" r="${f(wheelR * 0.4)}" fill="#b9bec6"/>`;
    });
    /* からだ */
    s += `<rect x="${f(bx)}" y="${f(by)}" width="${f(bodyW)}" height="${f(bodyH)}" rx="${f(scale * 20)}" fill="${ch.color}" stroke="${ch.ink}" stroke-width="3"/>`;
    /* ライン */
    s += `<rect x="${f(bx)}" y="${f(by + bodyH * 0.72)}" width="${f(bodyW)}" height="${f(scale * 9)}" fill="#ffffff" opacity="0.65"/>`;
    /* かお(まどの ところ) */
    const pw = bodyW * 0.74;
    const ph = bodyH * 0.56;
    const px = cx - pw / 2;
    const py = by + bodyH * 0.13;
    s += `<rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" rx="${f(scale * 14)}" fill="#fffaf0" stroke="${ch.ink}" stroke-width="2"/>`;

    const eyeY = py + ph * 0.44;
    const gap = pw * 0.25;
    const er = scale * 11;
    const emo = o.emo || 'smile';

    function eyeDot(ex, shiftY) {
      let e = `<circle cx="${f(ex)}" cy="${f(eyeY + (shiftY || 0))}" r="${f(er)}" fill="#2b2b2b"/>`;
      e += `<circle cx="${f(ex - er * 0.32)}" cy="${f(eyeY - er * 0.34 + (shiftY || 0))}" r="${f(er * 0.34)}" fill="#fff"/>`;
      return e;
    }
    function eyeLine(ex) {
      return `<path d="M ${f(ex - er)} ${f(eyeY)} Q ${f(ex)} ${f(eyeY + er * 0.9)} ${f(ex + er)} ${f(eyeY)}" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>`;
    }

    if (emo === 'sleepy') {
      s += eyeLine(cx - gap) + eyeLine(cx + gap);
      s += `<text x="${f(px + pw + scale * 6)}" y="${f(py + scale * 6)}" font-size="${f(scale * 26)}">💤</text>`;
    } else if (emo === 'star') {
      [cx - gap, cx + gap].forEach((ex) => {
        s += `<text x="${f(ex)}" y="${f(eyeY + er)}" font-size="${f(er * 2.8)}" text-anchor="middle" fill="#ffc94a">★</text>`;
      });
    } else if (emo === 'wink') {
      s += eyeDot(cx - gap);
      s += eyeLine(cx + gap);
    } else if (emo === 'surprise') {
      [cx - gap, cx + gap].forEach((ex) => {
        s += `<circle cx="${f(ex)}" cy="${f(eyeY)}" r="${f(er * 1.25)}" fill="#fff" stroke="#2b2b2b" stroke-width="3"/>`;
        s += `<circle cx="${f(ex)}" cy="${f(eyeY)}" r="${f(er * 0.5)}" fill="#2b2b2b"/>`;
      });
    } else if (emo === 'proud') {
      [cx - gap, cx + gap].forEach((ex) => {
        s += `<path d="M ${f(ex - er)} ${f(eyeY + er * 0.5)} Q ${f(ex)} ${f(eyeY - er * 0.8)} ${f(ex + er)} ${f(eyeY + er * 0.5)}" fill="none" stroke="#2b2b2b" stroke-width="4.5" stroke-linecap="round"/>`;
      });
    } else if (emo === 'think') {
      s += eyeDot(cx - gap, -er * 0.25) + eyeDot(cx + gap, -er * 0.25);
      s += `<text x="${f(px + pw)}" y="${f(py - scale * 2)}" font-size="${f(scale * 24)}">💭</text>`;
    } else {
      s += eyeDot(cx - gap) + eyeDot(cx + gap);
    }

    /* ほっぺ */
    [cx - gap * 1.75, cx + gap * 1.75].forEach((cxk) => {
      s += `<ellipse cx="${f(cxk)}" cy="${f(eyeY + scale * 10)}" rx="${f(scale * 9)}" ry="${f(scale * 6)}" fill="#ff9d8a" opacity="0.5"/>`;
    });

    /* くち */
    const my = py + ph * 0.8;
    if (emo === 'surprise') {
      s += `<ellipse cx="${f(cx)}" cy="${f(my)}" rx="${f(scale * 9)}" ry="${f(scale * 11)}" fill="${ch.ink}"/>`;
    } else if (emo === 'sleepy') {
      s += `<ellipse cx="${f(cx)}" cy="${f(my)}" rx="${f(scale * 8)}" ry="${f(scale * 10)}" fill="${ch.ink}" opacity="0.85"/>`;
    } else {
      s += `<path d="M ${f(cx - scale * 15)} ${f(my - scale * 4)} Q ${f(cx)} ${f(my + scale * 11)} ${f(cx + scale * 15)} ${f(my - scale * 4)}" fill="none" stroke="${ch.ink}" stroke-width="4" stroke-linecap="round"/>`;
    }

    /* かぶりもの と まわりの きらきら */
    s += `<text x="${f(cx)}" y="${f(by - scale * 8)}" font-size="${f(scale * 38)}" text-anchor="middle">${ch.hat}</text>`;
    if (ch.aura && o.aura !== false) {
      s += `<text x="${f(bx - scale * 14)}" y="${f(by + bodyH * 0.4)}" font-size="${f(scale * 26)}" text-anchor="middle" opacity="0.9">${ch.aura}</text>`;
    }

    /* なまえ */
    if (o.label !== false) {
      const nw = ch.name.length * scale * 17 + scale * 20;
      s += `<rect x="${f(cx - nw / 2)}" y="${f(feetY + scale * 12)}" width="${f(nw)}" height="${f(scale * 30)}" rx="${f(scale * 15)}" fill="${ch.ink}" opacity="0.92"/>`;
      s += `<text x="${f(cx)}" y="${f(feetY + scale * 33)}" font-size="${f(scale * 19)}" text-anchor="middle" fill="#fffaf0" font-weight="700">${esc(ch.name)}</text>`;
    }
    return s + `</g>`;
  }

  /* ============================ はいけい ============================ */

  const BG = {
    /* あさの えき まえ */
    stationMorning: {
      groundY: 520,
      paint() {
        let s = sky('sky-morning', '#ffe6b0', '#a9dcf7');
        s += `<circle cx="820" cy="120" r="58" fill="#ffd76e"/>`;
        s += `<circle cx="820" cy="120" r="86" fill="#ffd76e" opacity="0.25"/>`;
        s += clouds(7, 150, 1, 0.85);
        s += buildings(11, 470, '#b7c7d9', 0.75);
        /* えきしゃ */
        s += `<rect x="300" y="300" width="400" height="220" rx="10" fill="#f6efe2" stroke="#8a7a63" stroke-width="3"/>`;
        s += `<path d="M 275 305 L 500 215 L 725 305 Z" fill="#c4573f" stroke="#8a3f2d" stroke-width="3"/>`;
        s += `<rect x="455" y="395" width="90" height="125" rx="6" fill="#6b4f35"/>`;
        s += `<circle cx="500" cy="270" r="26" fill="#fffaf0" stroke="#8a7a63" stroke-width="3"/>`;
        s += `<line x1="500" y1="270" x2="500" y2="254" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>`;
        s += `<line x1="500" y1="270" x2="512" y2="278" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>`;
        s += `<text x="500" y="345" font-size="30" text-anchor="middle" fill="#4a3a28" font-weight="700">えき</text>`;
        s += `<rect x="0" y="520" width="${W}" height="${H - 520}" fill="#cbbf9f"/>`;
        s += `<rect x="0" y="520" width="${W}" height="8" fill="#b3a684"/>`;
        return s;
      },
    },

    /* きっぷうりば */
    ticketHall: {
      groundY: 530,
      paint() {
        let s = sky('sky-hall', '#fdf3dd', '#f0e2c6');
        s += `<rect x="0" y="0" width="${W}" height="180" fill="#e7d9bb"/>`;
        s += `<rect x="0" y="170" width="${W}" height="14" fill="#c9b791"/>`;
        /* けんばいき */
        s += `<rect x="90" y="230" width="230" height="300" rx="14" fill="#4d6b8a" stroke="#2f4459" stroke-width="4"/>`;
        s += `<rect x="112" y="256" width="186" height="110" rx="8" fill="#0f2436"/>`;
        for (let i = 0; i < 6; i += 1) {
          s += `<rect x="${f(122 + (i % 3) * 60)}" y="${f(272 + Math.floor(i / 3) * 44)}" width="46" height="30" rx="5" fill="#7ec8ff" opacity="0.85"/>`;
        }
        s += `<rect x="140" y="392" width="130" height="26" rx="6" fill="#1c2b38"/>`;
        s += `<text x="205" y="452" font-size="26" text-anchor="middle" fill="#fffaf0" font-weight="700">きっぷ</text>`;
        /* かいさつ */
        s += `<rect x="640" y="330" width="90" height="200" rx="10" fill="#d9dde2" stroke="#8c949c" stroke-width="3"/>`;
        s += `<rect x="820" y="330" width="90" height="200" rx="10" fill="#d9dde2" stroke="#8c949c" stroke-width="3"/>`;
        s += `<rect x="640" y="330" width="90" height="26" rx="6" fill="#57c785"/>`;
        s += `<rect x="820" y="330" width="90" height="26" rx="6" fill="#57c785"/>`;
        s += `<text x="775" y="300" font-size="30" text-anchor="middle" fill="#3f5a2f" font-weight="700">かいさつ</text>`;
        s += `<rect x="0" y="530" width="${W}" height="${H - 530}" fill="#e0d6c2"/>`;
        return s;
      },
    },

    /* ホーム(はっしゃ まえ) */
    platformDay: {
      groundY: 545,
      paint() {
        let s = sky('sky-plat', '#bfe8fb', '#eaf7ff');
        s += clouds(3, 70, 0.9, 0.9);
        s += buildings(21, 330, '#c3d2e2', 0.8);
        s += `<rect x="0" y="330" width="${W}" height="30" fill="#556170"/>`;
        /* やね の はしら */
        for (let x = 60; x < W; x += 220) {
          s += `<rect x="${f(x)}" y="360" width="14" height="190" fill="#7c8794"/>`;
        }
        s += rails(430, { h: 60, bed: '#7d7466' });
        s += platform(500, '#ded7c9', '#ffd166');
        s += signBoard(690, 200, 'ゆめが おか', 'YUMEGAOKA');
        return s;
      },
    },

    /* しゃない */
    inside: {
      groundY: 560,
      paint() {
        let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="#f3ede1"/>`;
        s += `<rect x="0" y="0" width="${W}" height="90" fill="#e2d9c8"/>`;
        /* まど 3つ・そとの けしき */
        [80, 400, 720].forEach((x, i) => {
          s += `<rect x="${f(x)}" y="120" width="220" height="150" rx="14" fill="#8fd4f5" stroke="#b9ae99" stroke-width="5"/>`;
          s += `<rect x="${f(x + 8)}" y="128" width="204" height="60" fill="#bfe9ff"/>`;
          s += `<circle cx="${f(x + 60 + i * 20)}" cy="205" r="26" fill="#8fd18f" opacity="0.9"/>`;
          s += `<rect x="${f(x + 8)}" y="228" width="204" height="34" fill="#9fd77f"/>`;
        });
        /* つりかわ */
        for (let x = 120; x < W; x += 110) {
          s += `<line x1="${f(x)}" y1="90" x2="${f(x)}" y2="140" stroke="#c8b98f" stroke-width="5"/>`;
          s += `<circle cx="${f(x)}" cy="152" r="14" fill="none" stroke="#e0d0a0" stroke-width="7"/>`;
        }
        /* いす */
        s += `<rect x="0" y="380" width="${W}" height="120" rx="18" fill="#5f7fa8"/>`;
        s += `<rect x="0" y="380" width="${W}" height="24" rx="10" fill="#7b9bc4"/>`;
        for (let x = 40; x < W; x += 130) {
          s += `<line x1="${f(x)}" y1="384" x2="${f(x)}" y2="496" stroke="#4a648a" stroke-width="4"/>`;
        }
        s += `<rect x="0" y="500" width="${W}" height="${H - 500}" fill="#cfc6b4"/>`;
        return s;
      },
    },

    /* ふみきり */
    crossing: {
      groundY: 540,
      paint() {
        let s = sky('sky-cross', '#cfeafb', '#f4fbff');
        s += clouds(13, 80, 0.8, 0.85);
        s += `<rect x="0" y="360" width="${W}" height="80" fill="#9fd77f"/>`;
        s += rails(400, { h: 70, bed: '#8a8071' });
        s += `<rect x="0" y="470" width="${W}" height="${H - 470}" fill="#9a9a9a"/>`;
        s += `<rect x="0" y="470" width="${W}" height="6" fill="#7d7d7d"/>`;
        for (let x = 20; x < W; x += 120) {
          s += `<rect x="${f(x)}" y="545" width="70" height="10" fill="#fffaf0" opacity="0.85"/>`;
        }
        /* しゃだんき */
        s += `<rect x="120" y="300" width="16" height="200" fill="#e8e3d8" stroke="#8a8578" stroke-width="2"/>`;
        s += `<circle cx="106" cy="300" r="18" fill="#ff4d4d" stroke="#7a1f1f" stroke-width="3"/>`;
        s += `<circle cx="150" cy="300" r="18" fill="#ffd0d0" stroke="#7a1f1f" stroke-width="3"/>`;
        s += `<text x="128" y="272" font-size="26" text-anchor="middle">⚠️</text>`;
        s += `<rect x="128" y="360" width="420" height="16" rx="6" fill="#fffaf0" stroke="#2b2b2b" stroke-width="2"/>`;
        for (let i = 0; i < 6; i += 1) {
          s += `<rect x="${f(140 + i * 68)}" y="360" width="34" height="16" fill="#e03131"/>`;
        }
        return s;
      },
    },

    /* のりかえの おおきな えき */
    transfer: {
      groundY: 555,
      paint() {
        let s = sky('sky-tr', '#dbeafe', '#f7fbff');
        s += `<rect x="0" y="0" width="${W}" height="150" fill="#cfd8e3"/>`;
        s += `<rect x="0" y="140" width="${W}" height="18" fill="#a9b6c6"/>`;
        for (let x = 40; x < W; x += 180) {
          s += `<rect x="${f(x)}" y="158" width="16" height="200" fill="#93a1b2"/>`;
        }
        /* かいだん */
        s += `<g>`;
        for (let i = 0; i < 6; i += 1) {
          s += `<rect x="${f(700 + i * 22)}" y="${f(520 - i * 34)}" width="26" height="${f(40 + i * 34)}" fill="#c7cdd6" stroke="#9aa3ae" stroke-width="1.5"/>`;
        }
        s += `<text x="800" y="300" font-size="34" text-anchor="middle">🔼</text>`;
        s += `</g>`;
        s += rails(400, { h: 52, bed: '#7d7466' });
        s += platform(480, '#e2dccd', '#ffd166');
        s += signBoard(60, 210, 'のりかえ えき', 'NORIKAE');
        s += `<text x="360" y="250" font-size="26" fill="#3a4a5e">➡ 1ばんせん  ⬅ 2ばんせん</text>`;
        return s;
      },
    },

    /* トンネルの なか */
    tunnel: {
      groundY: 545,
      paint() {
        let s = sky('sky-tun', '#101a2e', '#1d2b45');
        s += `<ellipse cx="500" cy="330" rx="330" ry="250" fill="#0b1222"/>`;
        s += `<ellipse cx="500" cy="330" rx="330" ry="250" fill="none" stroke="#33456b" stroke-width="10"/>`;
        /* とおくの でぐち */
        s += `<ellipse cx="500" cy="330" rx="52" ry="40" fill="#ffe9a8" opacity="0.85"/>`;
        s += `<ellipse cx="500" cy="330" rx="90" ry="70" fill="#ffe9a8" opacity="0.18"/>`;
        /* かべの ライト */
        [140, 300, 700, 860].forEach((x) => {
          s += `<circle cx="${f(x)}" cy="250" r="12" fill="#ffdd77"/>`;
          s += `<circle cx="${f(x)}" cy="250" r="30" fill="#ffdd77" opacity="0.2"/>`;
        });
        s += rails(500, { h: 46, bed: '#2a3450', tie: '#3d3428', rail: '#8f97a5' });
        s += `<rect x="0" y="546" width="${W}" height="${H - 546}" fill="#1a2438"/>`;
        return s;
      },
    },

    /* しゃそう(うみが みえる) */
    seaWindow: {
      groundY: 560,
      paint() {
        let s = sky('sky-sea', '#8fd3f4', '#e6f7ff');
        s += clouds(29, 60, 1.1, 0.9);
        s += `<circle cx="150" cy="110" r="46" fill="#fff0a8"/>`;
        s += `<rect x="0" y="330" width="${W}" height="150" fill="#2f8fd0"/>`;
        for (let i = 0; i < 26; i += 1) {
          const y = 350 + (i % 6) * 22;
          const x = (i * 91) % W;
          s += `<path d="M ${f(x)} ${f(y)} q 12 -8 24 0 q 12 8 24 0" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.5"/>`;
        }
        s += `<path d="M 620 330 L 700 250 L 780 330 Z" fill="#8fb98f" opacity="0.9"/>`;
        s += `<rect x="0" y="470" width="${W}" height="${H - 470}" fill="#f0e2bd"/>`;
        s += `<rect x="0" y="470" width="${W}" height="10" fill="#dbc9a0"/>`;
        return s;
      },
    },

    /* やまの えき */
    mountain: {
      groundY: 550,
      paint() {
        let s = sky('sky-mt', '#cfeaff', '#f3fbff');
        s += clouds(31, 70, 0.9, 0.9);
        s += `<path d="M -40 470 L 200 210 L 430 470 Z" fill="#7f9f7a"/>`;
        s += `<path d="M 200 210 L 260 275 L 140 275 Z" fill="#fffaf0"/>`;
        s += `<path d="M 330 470 L 620 190 L 900 470 Z" fill="#6d8f8a"/>`;
        s += `<path d="M 620 190 L 690 268 L 550 268 Z" fill="#fffaf0"/>`;
        s += `<rect x="0" y="450" width="${W}" height="${H - 450}" fill="#a8c98a"/>`;
        s += rails(470, { h: 44, bed: '#8d8577' });
        s += `<rect x="0" y="516" width="${W}" height="${H - 516}" fill="#9dc07f"/>`;
        return s;
      },
    },

    /* ゆめのくに */
    dreamland: {
      groundY: 550,
      paint() {
        let s = sky('sky-dream', '#ffd9ec', '#dff3ff');
        s += clouds(37, 60, 1, 0.95);
        /* にじ */
        const cols = ['#ff8fab', '#ffc86b', '#ffe57f', '#9adf8f', '#7fc8f8', '#b39ddb'];
        cols.forEach((c, i) => {
          s += `<path d="M 120 470 A 380 380 0 0 1 880 470" fill="none" stroke="${c}" stroke-width="16" opacity="0.75" transform="translate(0 ${f(i * 17)})"/>`;
        });
        /* おしろ */
        s += `<rect x="400" y="300" width="200" height="200" fill="#fffaf0" stroke="#c9b6d6" stroke-width="3"/>`;
        [420, 490, 560].forEach((x, i) => {
          s += `<rect x="${f(x)}" y="${f(250 - i * 0)}" width="40" height="250" fill="#fffaf0" stroke="#c9b6d6" stroke-width="3"/>`;
          s += `<path d="M ${f(x - 8)} 250 L ${f(x + 20)} 190 L ${f(x + 48)} 250 Z" fill="#ff8fab"/>`;
        });
        s += `<text x="200" y="240" font-size="46">🎈</text>`;
        s += `<text x="790" y="270" font-size="46">🎈</text>`;
        s += `<rect x="0" y="500" width="${W}" height="${H - 500}" fill="#c9e7a8"/>`;
        return s;
      },
    },

    /* よるの しゃこ */
    depot: {
      groundY: 545,
      paint() {
        let s = sky('sky-night', '#0b1436', '#2a3b6b');
        s += stars(5, 90, 400);
        s += `<circle cx="820" cy="110" r="48" fill="#ffeaa7"/>`;
        s += `<circle cx="820" cy="110" r="78" fill="#ffeaa7" opacity="0.18"/>`;
        s += buildings(41, 420, '#1b2748', 0.9);
        /* しゃこの やね */
        s += `<rect x="60" y="300" width="880" height="30" rx="8" fill="#33406b"/>`;
        for (let x = 90; x < 940; x += 210) {
          s += `<rect x="${f(x)}" y="330" width="14" height="190" fill="#3d4b78"/>`;
        }
        s += rails(430, { h: 56, bed: '#232f4f', tie: '#3a3226', rail: '#7f889b' });
        s += `<rect x="0" y="490" width="${W}" height="${H - 490}" fill="#1c2745"/>`;
        return s;
      },
    },
  };

  function scene(bgKey, cast) {
    const bg = BG[bgKey] || BG.stationMorning;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="ehon-svg" role="img">`;
    s += bg.paint();
    (cast || []).forEach((c) => {
      const feet = c.y !== undefined ? c.y * H : bg.groundY;
      s += train(c.x * W, feet, c.s || 1, c.ch, { emo: c.emo, label: c.label });
    });
    s += `</svg>`;
    return s;
  }

  return { W, H, BG, scene, train, sideTrain, esc };
})();
