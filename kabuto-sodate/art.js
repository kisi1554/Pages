/* カブトムシ そだて ｜ 絵は ぜんぶ Canvas で コード描画（画像ファイルなし） */

const ART = (() => {
  const W = 600, H = 500;
  const CASE = { x: 34, y: 54, w: 532, h: 424 };
  const SOIL_TOP = 262;
  const SOIL_BOTTOM = CASE.y + CASE.h - 8;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mix(c1, c2, k) {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 土の つぶつぶ（固定の 乱数で 毎回 同じ 場所）
  const SOIL_DOTS = (() => {
    const r = rng(7), a = [];
    for (let i = 0; i < 260; i++) {
      a.push({ x: CASE.x + 8 + r() * (CASE.w - 16), y: SOIL_TOP + 6 + r() * (SOIL_BOTTOM - SOIL_TOP - 8),
        s: 1 + r() * 2.6, k: r(), leaf: r() < 0.12, ang: r() * Math.PI });
    }
    return a;
  })();

  // ---------------- はいけい・ケース ----------------
  function drawBackground(ctx, night, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (night) { g.addColorStop(0, '#1d2347'); g.addColorStop(1, '#2d2a4a'); }
    else { g.addColorStop(0, '#fff6e3'); g.addColorStop(1, '#f6e6cc'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (night) {
      const r = rng(3);
      for (let i = 0; i < 30; i++) {
        const x = r() * W, y = r() * 60, tw = 0.5 + 0.5 * Math.sin(t / 700 + i);
        ctx.fillStyle = `rgba(255,248,200,${0.3 + 0.5 * tw})`;
        ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 7); ctx.fill();
      }
    }
    // つくえ
    ctx.fillStyle = night ? '#3b2d2a' : '#d9b98c';
    ctx.fillRect(0, CASE.y + CASE.h - 2, W, H);
  }

  function drawCaseBack(ctx, night) {
    rrect(ctx, CASE.x, CASE.y, CASE.w, CASE.h, 18);
    ctx.fillStyle = night ? 'rgba(120,140,200,.18)' : 'rgba(210,236,250,.55)';
    ctx.fill();
  }

  function drawSoil(ctx, moist) {
    const k = Math.max(0, Math.min(1, moist / 100));
    ctx.save();
    rrect(ctx, CASE.x, CASE.y, CASE.w, CASE.h, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(0, SOIL_TOP, 0, SOIL_BOTTOM);
    g.addColorStop(0, mix('#b8936a', '#6b4626', k));
    g.addColorStop(1, mix('#9a7650', '#4a2f18', k));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(CASE.x, SOIL_TOP + 6);
    for (let x = CASE.x; x <= CASE.x + CASE.w; x += 20) ctx.lineTo(x, SOIL_TOP + Math.sin(x * 0.07) * 4);
    ctx.lineTo(CASE.x + CASE.w, H);
    ctx.lineTo(CASE.x, H);
    ctx.closePath();
    ctx.fill();
    for (const d of SOIL_DOTS) {
      if (d.leaf) {
        ctx.fillStyle = mix('#a0662c', '#5a3214', k);
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang);
        ctx.beginPath(); ctx.ellipse(0, 0, d.s * 2.6, d.s, 0, 0, 7); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = d.k < 0.5 ? mix('#d2b48a', '#7b5634', k) : mix('#8a6640', '#38220f', k);
        ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, 7); ctx.fill();
      }
    }
    // しっとり つやつや
    if (k > 0.6) {
      ctx.fillStyle = `rgba(255,255,255,${(k - 0.6) * 0.5})`;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath(); ctx.arc(70 + i * 42, SOIL_TOP + 3 + (i % 3) * 2, 2.2, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCaseFront(ctx, night) {
    // まえの かべの ひかり
    ctx.save();
    rrect(ctx, CASE.x, CASE.y, CASE.w, CASE.h, 18);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(CASE.x + 40, CASE.y); ctx.lineTo(CASE.x + 90, CASE.y);
    ctx.lineTo(CASE.x + 20, CASE.y + CASE.h); ctx.lineTo(CASE.x - 30, CASE.y + CASE.h);
    ctx.fill();
    ctx.restore();
    rrect(ctx, CASE.x, CASE.y, CASE.w, CASE.h, 18);
    ctx.lineWidth = 6;
    ctx.strokeStyle = night ? '#8fa0c8' : '#9cc6dc';
    ctx.stroke();
    // ふた
    rrect(ctx, CASE.x - 10, CASE.y - 26, CASE.w + 20, 32, 12);
    ctx.fillStyle = '#3f9a52'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2b6e3a'; ctx.stroke();
    ctx.fillStyle = '#2b6e3a';
    for (let x = CASE.x + 30; x < CASE.x + CASE.w - 20; x += 26) {
      ctx.beginPath(); ctx.ellipse(x, CASE.y - 10, 7, 3, 0, 0, 7); ctx.fill();
    }
    // とって
    ctx.lineWidth = 7; ctx.strokeStyle = '#2b6e3a';
    ctx.beginPath(); ctx.moveTo(W / 2 - 50, CASE.y - 26);
    ctx.quadraticCurveTo(W / 2, CASE.y - 52, W / 2 + 50, CASE.y - 26); ctx.stroke();
  }

  function drawLog(ctx) {
    ctx.save();
    ctx.translate(200, SOIL_TOP - 14);
    ctx.rotate(-0.08);
    rrect(ctx, -130, -18, 260, 36, 18);
    ctx.fillStyle = '#8b5a2b'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#5e3a18'; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,35,12,.5)'; ctx.lineWidth = 2;
    for (let i = -100; i < 110; i += 34) {
      ctx.beginPath(); ctx.moveTo(i, -12); ctx.quadraticCurveTo(i + 14, 0, i + 4, 12); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(126, 0, 10, 16, 0, 0, 7);
    ctx.fillStyle = '#d6a568'; ctx.fill(); ctx.strokeStyle = '#5e3a18'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(126, 0, 4, 7, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }

  // ゼリー（level 0〜100）
  function drawJelly(ctx, x, y, level) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#efe4c8'; ctx.strokeStyle = '#b79f6c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-26, -26); ctx.lineTo(26, -26); ctx.lineTo(22, 0); ctx.lineTo(-22, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const lv = Math.max(0, Math.min(1, level / 100));
    if (lv > 0.02) {
      const top = -2 - 22 * lv;
      ctx.fillStyle = '#e0702c';
      ctx.beginPath(); ctx.moveTo(-23 + 3 * (1 - lv), top); ctx.lineTo(23 - 3 * (1 - lv), top);
      ctx.lineTo(21, -2); ctx.lineTo(-21, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(-8, top + 4, 7, 2.5, 0, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(0, -26, 26, 5, 0, 0, 7);
    ctx.strokeStyle = '#b79f6c'; ctx.stroke();
    ctx.restore();
  }

  function drawPoop(ctx, p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = '#2b1a0d';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(-2, -1.5, 2, 1, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---------------- いきもの ----------------
  function drawEgg(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(40,20,5,.25)';
    ctx.beginPath(); ctx.ellipse(0, 3, 16 * s, 16 * s, 0, 0, 7); ctx.fill();
    const wob = Math.sin(t / 900) * 0.04;
    ctx.rotate(wob);
    const g = ctx.createRadialGradient(-4 * s, -5 * s, 2, 0, 0, 16 * s);
    g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#e8dcb4');
    ctx.fillStyle = g; ctx.strokeStyle = '#c4b285'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 12 * s, 14 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ようちゅう（Cの かたち）。dir: 1 = みぎむき
  function drawLarva(ctx, x, y, s, dir, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.rotate(Math.sin(t / 1300) * 0.08);
    const Rr = 24 * s, T = 13 * s, N = 12;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const th = (-60 - i * (230 / N)) * Math.PI / 180;
      pts.push({ th, x: Math.cos(th) * Rr, y: Math.sin(th) * Rr, r: T * (0.7 + 0.42 * i / N) });
    }
    // 足（あたまの ちかく、Cの うちがわ）
    ctx.strokeStyle = '#a8662a'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
    for (let i = 1; i <= 3; i++) {
      const p = pts[i], k = (Rr - p.r * 0.7) / Rr, k2 = (Rr - p.r - 6 * s) / Rr;
      const w = Math.sin(t / 250 + i) * 0.06;
      ctx.beginPath();
      ctx.moveTo(Math.cos(p.th) * Rr * k, Math.sin(p.th) * Rr * k);
      ctx.lineTo(Math.cos(p.th + w) * Rr * k2, Math.sin(p.th + w) * Rr * k2);
      ctx.stroke();
    }
    // りんかく → からだ
    for (let i = N; i >= 0; i--) {
      const p = pts[i];
      ctx.fillStyle = '#b9a477';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1.6, 0, 7); ctx.fill();
    }
    for (let i = N; i >= 0; i--) {
      const p = pts[i];
      ctx.fillStyle = i > N - 3 ? '#d6ccb4' : '#f6eed6';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    // おしりの なかみ（すけて みえる）
    ctx.fillStyle = 'rgba(70,55,40,.35)';
    for (let i = N - 2; i <= N; i++) { const p = pts[i]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, 7); ctx.fill(); }
    // ふし と きもん
    ctx.strokeStyle = 'rgba(150,120,70,.28)'; ctx.lineWidth = 1.2 * s;
    for (let i = 1; i < N; i++) {
      const p = pts[i], c = Math.cos(p.th), sn = Math.sin(p.th);
      ctx.beginPath(); ctx.moveTo(c * (Rr - p.r * 0.2), sn * (Rr - p.r * 0.2));
      ctx.lineTo(c * (Rr + p.r * 0.85), sn * (Rr + p.r * 0.85)); ctx.stroke();
      if (i < N - 1) {
        ctx.fillStyle = '#d58a3c';
        ctx.beginPath(); ctx.arc(c * (Rr + p.r * 0.45), sn * (Rr + p.r * 0.45), 1.5 * s, 0, 7); ctx.fill();
      }
    }
    // あたま
    const hth = -44 * Math.PI / 180;
    const hx = Math.cos(hth) * Rr, hy = Math.sin(hth) * Rr;
    ctx.fillStyle = '#c9772c'; ctx.strokeStyle = '#8a4c16'; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.arc(hx, hy, T * 0.78, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a200c';
    ctx.beginPath(); ctx.arc(hx + Math.cos(hth + 1.9) * T * 0.55, hy + Math.sin(hth + 1.9) * T * 0.55, T * 0.26, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(hx - T * 0.25, hy - T * 0.25, T * 0.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawChamber(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#3d2412';
    ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 56 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8b6a44'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.ellipse(0, 0, 34 * s, 56 * s, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#5a3a1f';
    ctx.beginPath(); ctx.ellipse(0, 0, 29 * s, 51 * s, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawPupa(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(Math.sin(t / 2200) * 0.03);
    const g = ctx.createLinearGradient(-16 * s, 0, 16 * s, 0);
    g.addColorStop(0, '#e2a85c'); g.addColorStop(1, '#a86a2a');
    ctx.fillStyle = g; ctx.strokeStyle = '#7a4718'; ctx.lineWidth = 1.8 * s;
    // おなか
    ctx.beginPath(); ctx.ellipse(-1 * s, 14 * s, 15 * s, 27 * s, 0.05, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,60,20,.55)';
    for (let i = 0; i < 6; i++) {
      const yy = (2 + i * 6.5) * s, ww = (14 - Math.abs(i - 1.5) * 1.6) * s;
      ctx.beginPath(); ctx.moveTo(-ww, yy); ctx.quadraticCurveTo(0, yy + 4 * s, ww, yy); ctx.stroke();
    }
    // むね・あたま
    ctx.fillStyle = g; ctx.strokeStyle = '#7a4718';
    ctx.beginPath(); ctx.ellipse(0, -16 * s, 16 * s, 14 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -32 * s, 10 * s, 8 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    // はねの もと
    ctx.fillStyle = 'rgba(255,220,160,.5)';
    ctx.beginPath(); ctx.ellipse(8 * s, -6 * s, 6 * s, 15 * s, -0.2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(-6 * s, -20 * s, 4 * s, 6 * s, -0.3, 0, 7); ctx.fill();
    ctx.restore();
  }

  // せいちゅう（よこから）。sex 'm' | 'f'。dir 1 = みぎむき。walk = あしの うごき
  function drawBeetle(ctx, x, y, s, dir, sex, walk) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
    const male = sex === 'm';
    const body = male ? '#4a1f0c' : '#33190b';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const legs = [
      [[34, -16], [50, -8], [62, 0]],
      [[12, -14], [16, -6], [6, 0]],
      [[-12, -16], [-24, -8], [-40, 0]],
    ];
    const drawLegs = (alpha) => {
      ctx.strokeStyle = alpha ? '#1f0e05' : '#2a1407';
      ctx.lineWidth = 4.5;
      legs.forEach((l, i) => {
        const ph = Math.sin(walk + i * 2.1) * 4;
        ctx.beginPath(); ctx.moveTo(l[0][0], l[0][1]);
        ctx.lineTo(l[1][0] + ph * 0.5, l[1][1] - Math.max(0, ph) * 0.6);
        ctx.lineTo(l[2][0] + ph, l[2][1] - Math.max(0, ph));
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(l[2][0] + ph, l[2][1] - Math.max(0, ph));
        ctx.lineTo(l[2][0] + ph + (i === 2 ? -6 : 6), l[2][1] - Math.max(0, ph));
        ctx.stroke();
        ctx.lineWidth = 4.5;
      });
    };
    drawLegs(false);
    // はね（せなか）
    const g = ctx.createLinearGradient(0, -58, 0, -12);
    g.addColorStop(0, male ? '#8a4524' : '#5e3519'); g.addColorStop(0.35, body); g.addColorStop(1, '#1f0d05');
    ctx.fillStyle = g; ctx.strokeStyle = '#140802'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50, -20);
    ctx.bezierCurveTo(-54, -44, -30, -60, -2, -58);
    ctx.bezierCurveTo(16, -56, 24, -46, 24, -34);
    ctx.lineTo(22, -14);
    ctx.bezierCurveTo(4, -10, -30, -10, -50, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-44, -26); ctx.bezierCurveTo(-30, -18, 0, -16, 22, -20); ctx.stroke();
    if (!male) {
      ctx.fillStyle = 'rgba(160,110,70,.35)';
      for (let i = 0; i < 40; i++) {
        const a = (i * 47) % 70 - 46, b = -18 - ((i * 31) % 34);
        ctx.fillRect(a, b, 1.2, 1.2);
      }
    }
    // むね
    const g2 = ctx.createLinearGradient(0, -52, 0, -14);
    g2.addColorStop(0, male ? '#8c4a28' : '#5a3218'); g2.addColorStop(0.4, body); g2.addColorStop(1, '#1a0b04');
    ctx.fillStyle = g2; ctx.strokeStyle = '#140802';
    ctx.beginPath(); ctx.ellipse(36, -32, male ? 17 : 14, male ? 17 : 14, 0, 0, 7); ctx.fill(); ctx.stroke();
    // あたま
    ctx.fillStyle = '#241005';
    ctx.beginPath(); ctx.ellipse(male ? 54 : 50, -24, 9, 8, 0.3, 0, 7); ctx.fill(); ctx.stroke();
    // しょっかく
    ctx.strokeStyle = '#2a1407'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(male ? 58 : 54, -20); ctx.lineTo(male ? 66 : 62, -14); ctx.stroke();
    if (male) {
      // あたまの つの
      ctx.strokeStyle = '#2c1206';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(58, -26); ctx.quadraticCurveTo(74, -30, 80, -44); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(80, -44); ctx.quadraticCurveTo(84, -58, 80, -70); ctx.stroke();
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(80, -70); ctx.lineTo(74, -78); ctx.moveTo(80, -70); ctx.lineTo(88, -76);
      ctx.moveTo(83, -55); ctx.lineTo(90, -58); ctx.stroke();
      // むねの つの
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(36, -46); ctx.quadraticCurveTo(48, -52, 56, -46); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(56, -46); ctx.lineTo(60, -42); ctx.stroke();
    }
    // つや
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.ellipse(-12, -48, 16, 4, -0.15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(32, -42, 6, 3, -0.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 段階に あわせて 1ぴき かく（アイコン・アップ・ずかん用）
  function drawCreature(ctx, stageId, x, y, s, opt = {}) {
    const t = opt.t || 0;
    if (stageId === 'egg') drawEgg(ctx, x, y, s * 1.4, t);
    else if (stageId === 'l1') drawLarva(ctx, x, y, s * 0.7, 1, t);
    else if (stageId === 'l2') drawLarva(ctx, x, y, s * 0.95, 1, t);
    else if (stageId === 'l3') drawLarva(ctx, x, y, s * 1.2, 1, t);
    else if (stageId === 'pupa') drawPupa(ctx, x, y, s * 1.1, t);
    else drawBeetle(ctx, x - 10 * s, y + 30 * s, s * (opt.size ? opt.size / 60 : 1), 1, opt.sex || 'm', 0);
  }

  return { W, H, CASE, SOIL_TOP, SOIL_BOTTOM, rng, rrect, drawBackground, drawCaseBack, drawSoil, drawCaseFront,
    drawLog, drawJelly, drawPoop, drawEgg, drawLarva, drawChamber, drawPupa, drawBeetle, drawCreature };
})();
