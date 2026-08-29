/* あしたの天気やさん — 「雨はどこからやってくるの？」実験
   海 → 蒸発 → 雲 → 雨/雪 → 川 → 海 と、水がぐるぐる回るようすを canvas で動かす。 */

const Lab = (function () {
  let cv, ctx, W = 0, H = 0, dpr = 1;
  let raf = 0, running = false, t = 0;

  /* つまみ（0〜1） */
  const p = { sun: 0.6, wind: 0.35, cold: 0.35 };

  /* つぶ */
  let vapor = [];    // 水じょうき（上へ のぼる）
  let drops = [];    // 雨・雪（下へ おちる）
  let splash = [];   // おちた ときの しぶき
  let clouds = [];   // 雲のかたまり

  /* かぞえるもの */
  const stat = { sea: 100, sky: 0, rained: 0, snow: 0 };
  let step = 0;              // いま どの だんかいか（0〜4）
  const stepNames = ['あたためる', '蒸発', '雲になる', '雨になる', '海へもどる'];
  let onStep = null;         // だんかいが かわった ときに よぶ
  let onStat = null;         // すうじが かわった ときに よぶ
  let lastReport = 0;

  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(280, r.width);
    H = Math.max(220, r.height);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ちけい：ひだり2/3が うみ、みぎが りくと 山 */
  function seaLevel() { return H * 0.78; }
  function shoreX() { return W * 0.52; }
  function groundY(x) {
    const sx = shoreX();
    if (x < sx) return seaLevel();
    const k = Math.min(1, (x - sx) / Math.max(1, W - sx));   // 0..1
    const smooth = k * k * (3 - 2 * k);                      // なめらかな さかみち
    return seaLevel() - smooth * H * 0.34;                   // みぎへ いくほど 山が たかい
  }
  function cloudY() { return H * (0.16 + 0.16 * (1 - p.cold)); }  // さむいほど 低い ところで 雲に なる

  function setStep(n) {
    if (n > step) {
      step = n;
      if (onStep) onStep(step, stepNames[step]);
    }
  }

  /* ---------------- こうしん ---------------- */
  function update(dt) {
    t += dt;
    const windPx = (p.wind * 2 - 0.15) * 46;   // よこの ながれ（px/秒）

    /* ① あたためる → ② じょうはつ */
    if (p.sun > 0.05) setStep(1);
    const rate = p.sun * 26 * dt;
    let make = Math.floor(rate) + (Math.random() < (rate % 1) ? 1 : 0);
    while (make-- > 0 && vapor.length < 280 && stat.sea > 0) {
      const x = Math.random() * shoreX();
      vapor.push({
        x: x, y: seaLevel() - 2,
        vx: (Math.random() - 0.5) * 6,
        vy: -(30 + Math.random() * 26) * (0.5 + p.sun * 0.9),
        r: 2 + Math.random() * 2.4,
        a: 0.55 + Math.random() * 0.35
      });
      stat.sea = Math.max(0, stat.sea - 0.06);
      stat.sky += 0.06;
    }

    const cy = cloudY();
    for (let i = vapor.length - 1; i >= 0; i--) {
      const v = vapor[i];
      v.vx += (windPx - v.vx) * dt * 0.8;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.vy -= 6 * dt * p.sun;          /* 太陽が つよいほど ぐんぐん のぼる */
      if (v.y <= cy) {                      /* ③ ひえて 雲に なる */
        joinCloud(v.x, cy);
        vapor.splice(i, 1);
        setStep(2);
      } else if (v.x < -20 || v.x > W + 20) {
        vapor.splice(i, 1);
        stat.sky = Math.max(0, stat.sky - 0.06);
        stat.sea += 0.06;
      }
    }

    /* 雲を うごかす・そだてる */
    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      c.x += windPx * dt * 0.55;
      c.y += Math.sin(t * 0.6 + c.seed) * 3 * dt;
      /* 山に ぶつかると おしあげられて 雨に なりやすい（ちけいせいこうう） */
      const uplift = c.x > shoreX() * 0.92 ? 1.7 : 1;
      c.water += c.gain * dt * uplift;
      c.gain = Math.max(0, c.gain - c.gain * dt * 1.6);
      c.r = 16 + Math.min(46, c.water * 1.5);

      const limit = 16 + p.cold * 10;
      if (c.water > limit) {                /* ④ あめ（さむいと 雪）に なる */
        const n = Math.min(4, Math.floor(c.water - limit));
        for (let k = 0; k < n; k++) {
          const snowy = p.cold > 0.62;
          drops.push({
            x: c.x + (Math.random() - 0.5) * c.r * 1.6,
            y: c.y + c.r * 0.5,
            vy: snowy ? 34 + Math.random() * 18 : 130 + Math.random() * 90,
            vx: snowy ? (Math.random() - 0.5) * 20 + windPx * 0.4 : windPx * 0.25,
            snow: snowy,
            rot: Math.random() * 6.28
          });
          c.water -= 1;
          stat.sky = Math.max(0, stat.sky - 0.06);
        }
        setStep(3);
      }
      if (c.water < 0.4 || c.x > W + 90) clouds.splice(i, 1);
    }

    /* おちる つぶ */
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      if (d.snow) d.x += Math.sin(t * 3 + d.rot) * 12 * dt;
      const g = groundY(d.x);
      if (d.y >= g) {
        if (d.snow) { stat.snow += 0.06; }
        else {
          stat.rained += 0.06;
          stat.sea += 0.06;                 /* ⑤ かわを とおって うみへ もどる */
          setStep(4);
        }
        splash.push({ x: d.x, y: g, r: 1, a: 0.8, snow: d.snow });
        drops.splice(i, 1);
      } else if (d.x < -30 || d.x > W + 30) {
        drops.splice(i, 1);
      }
    }

    for (let i = splash.length - 1; i >= 0; i--) {
      const s = splash[i];
      s.r += 40 * dt; s.a -= 1.6 * dt;
      if (s.a <= 0) splash.splice(i, 1);
    }

    /* おと：雨の つよさに あわせる */
    if (Sound.enabled && running) {
      Sound.rain(Math.min(1, drops.filter(d => !d.snow).length / 40));
    }

    /* すうじの ほうこく（1びょうに 4回くらい） */
    if (t - lastReport > 0.25) {
      lastReport = t;
      if (onStat) onStat(stat, { clouds: clouds.length, drops: drops.length, vapor: vapor.length });
    }
  }

  function joinCloud(x, y) {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      if (Math.abs(c.x - x) < c.r + 26) { c.water += 1; c.gain += 0.3; return; }
    }
    if (clouds.length < 7) {
      clouds.push({ x: x, y: y, r: 16, water: 1, gain: 0.5, seed: Math.random() * 6.28 });
    } else {
      /* いっぱいの ときは いちばん ちかい 雲に たす */
      let best = clouds[0], bd = 1e9;
      clouds.forEach(c => { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = c; } });
      best.water += 1;
    }
  }

  /* ---------------- えがく ---------------- */
  function draw() {
    const cy = cloudY();
    /* そら */
    const sky = ctx.createLinearGradient(0, 0, 0, seaLevel());
    const warm = 1 - p.cold;
    sky.addColorStop(0, p.cold > 0.62 ? '#8fa6c4' : '#7fb7ea');
    sky.addColorStop(0.55, p.cold > 0.62 ? '#c3d2e4' : '#bfe0f7');
    sky.addColorStop(1, warm > 0.6 ? '#ffeccc' : '#e7f2fb');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, seaLevel() + 2);

    /* ひえてる そらの め安せん */
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(60,90,130,.30)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy + 26); ctx.lineTo(W, cy + 26); ctx.stroke();
    ctx.restore();

    /* たいよう */
    const sx = W * 0.14, sy = H * 0.13, sr = 16 + p.sun * 14;
    const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr * 3.2);
    glow.addColorStop(0, 'rgba(255,214,102,' + (0.55 * p.sun + 0.15) + ')');
    glow.addColorStop(1, 'rgba(255,214,102,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 3.2, 0, 6.284); ctx.fill();
    ctx.fillStyle = '#ffca3a';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.284); ctx.fill();
    /* ひかりの すじ */
    ctx.strokeStyle = 'rgba(255,190,60,' + (0.15 + p.sun * 0.45) + ')';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const gx = sx + 18 + i * 26;
      ctx.beginPath();
      ctx.moveTo(gx, sy + sr * 0.7);
      ctx.lineTo(gx - 26, seaLevel());
      ctx.stroke();
    }

    /* うみ */
    const sea = ctx.createLinearGradient(0, seaLevel(), 0, H);
    sea.addColorStop(0, '#3f97cf');
    sea.addColorStop(1, '#1f5c8b');
    ctx.fillStyle = sea;
    ctx.beginPath();
    ctx.moveTo(0, seaLevel());
    for (let x = 0; x <= shoreX(); x += 8) {
      ctx.lineTo(x, seaLevel() + Math.sin(x * 0.045 + t * 1.6) * 2.5);
    }
    ctx.lineTo(shoreX(), H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    /* りくと 山 */
    ctx.beginPath();
    ctx.moveTo(shoreX(), H);
    for (let x = shoreX(); x <= W; x += 6) ctx.lineTo(x, groundY(x));
    ctx.lineTo(W, H); ctx.closePath();
    const land = ctx.createLinearGradient(0, H * 0.35, 0, H);
    land.addColorStop(0, stat.snow > 6 ? '#e9f1f7' : '#69a95f');
    land.addColorStop(0.45, '#4d8a49');
    land.addColorStop(1, '#3a6b39');
    ctx.fillStyle = land;
    ctx.fill();

    /* かわ：山から うみへ もどる みず */
    ctx.strokeStyle = 'rgba(120,200,255,.9)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    /* 山の いちばん たかい ところから うみへ ながす */
    let rx0 = shoreX(), top = seaLevel();
    for (let x = shoreX(); x <= W; x += 4) {
      const y = groundY(x);
      if (y < top) { top = y; rx0 = x; }
    }
    ctx.moveTo(rx0, groundY(rx0));
    for (let x = rx0; x >= shoreX(); x -= 8) {
      ctx.lineTo(x, groundY(x) + Math.sin((x + t * 60) * 0.06) * 3);
    }
    ctx.stroke();

    /* 雲 */
    clouds.forEach(c => {
      const dark = Math.min(0.55, c.water / 40);
      const puff = (ox, oy, r) => {
        ctx.beginPath(); ctx.arc(c.x + ox, c.y + oy, r, 0, 6.284); ctx.fill();
      };
      ctx.fillStyle = 'rgba(' + Math.round(255 - dark * 150) + ',' +
                      Math.round(255 - dark * 140) + ',' +
                      Math.round(255 - dark * 110) + ',.95)';
      puff(-c.r * 0.7, 4, c.r * 0.62);
      puff(c.r * 0.7, 6, c.r * 0.55);
      puff(0, -c.r * 0.25, c.r * 0.85);
      puff(c.r * 0.15, c.r * 0.3, c.r * 0.6);
    });

    /* 水じょうき */
    vapor.forEach(v => {
      ctx.fillStyle = 'rgba(255,255,255,' + v.a * 0.8 + ')';
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, 6.284); ctx.fill();
    });

    /* 雨・雪 */
    drops.forEach(d => {
      if (d.snow) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath(); ctx.arc(d.x, d.y, 2.6, 0, 6.284); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(90,170,235,.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.vx * 0.03, d.y - 9); ctx.stroke();
      }
    });

    splash.forEach(s => {
      ctx.strokeStyle = (s.snow ? 'rgba(255,255,255,' : 'rgba(150,215,255,') + Math.max(0, s.a) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, Math.PI, 0); ctx.stroke();
    });

    /* ゆきが つもる */
    if (stat.snow > 2) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, stat.snow / 30) + ')';
      ctx.beginPath();
      ctx.moveTo(shoreX(), groundY(shoreX()));
      for (let x = shoreX(); x <= W; x += 6) ctx.lineTo(x, groundY(x));
      ctx.lineTo(W, groundY(W) + 8);
      for (let x = W; x >= shoreX(); x -= 6) ctx.lineTo(x, groundY(x) + 8);
      ctx.closePath(); ctx.fill();
    }

    /* 「つめたい そら」の ふだ（雲より 手まえに かく） */
    ctx.font = '700 12px system-ui, sans-serif';
    const coldTxt = 'ここから上は つめたい空';
    const coldW = ctx.measureText(coldTxt).width + 16;
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(6, cy + 6, coldW, 20, 8); else ctx.rect(6, cy + 6, coldW, 20);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,70,110,.85)';
    ctx.fillText(coldTxt, 14, cy + 20);

    /* ふだ */
    const tag = (x, y, txt, bg) => {
      ctx.font = '700 12px system-ui, sans-serif';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = bg;
      ctx.beginPath();
      const rr = 9;
      ctx.roundRect ? ctx.roundRect(x, y - 13, w, 22, rr) : ctx.rect(x, y - 13, w, 22);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(txt, x + 7, y + 2);
    };
    tag(6, seaLevel() + 26, '海', 'rgba(20,70,110,.8)');
    tag(W - 74, H - 14, '山と川', 'rgba(40,90,50,.8)');
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - loop.last || 16) / 1000);
    loop.last = now;
    update(dt);
    ctx.clearRect(0, 0, W, H);
    draw();
    raf = requestAnimationFrame(loop);
  }

  return {
    steps: stepNames,
    init(canvas, hooks) {
      cv = canvas;
      ctx = cv.getContext('2d');
      onStep = hooks && hooks.onStep;
      onStat = hooks && hooks.onStat;
      resize();
      window.addEventListener('resize', () => { resize(); if (!running) { ctx.clearRect(0, 0, W, H); draw(); } });
    },
    set(key, value) {
      p[key] = Math.max(0, Math.min(1, value));
      if (!running && ctx) { ctx.clearRect(0, 0, W, H); draw(); }
    },
    get(key) { return p[key]; },
    start() {
      if (running) return;
      running = true; loop.last = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      Sound.stopRain();
    },
    reset() {
      vapor = []; drops = []; splash = []; clouds = [];
      stat.sea = 100; stat.sky = 0; stat.rained = 0; stat.snow = 0;
      step = 0; t = 0; lastReport = 0;
      if (onStep) onStep(0, stepNames[0]);
      if (onStat) onStat(stat, { clouds: 0, drops: 0, vapor: 0 });
      if (ctx) { ctx.clearRect(0, 0, W, H); draw(); }
    },
    redraw() { if (ctx) { resize(); ctx.clearRect(0, 0, W, H); draw(); } }
  };
})();
