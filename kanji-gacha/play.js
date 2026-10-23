"use strict";

/* おもちゃで あそぶ（ミニ あそび）
 *  Play.open(toy, canvas, say) … canvas は 360×360 の つもりで かく
 *  あそびかたは TOYS の play で きまる。TYPES[play] = { hint, init, tick, draw, down, move, up }
 */
const Play = (() => {
  const W = 360, H = 360;
  let cv = null, cx = null, st = null, raf = 0, lastT = 0, sayCb = null, ptr = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---- はいけい ---- */
  function sky(c, top, bottom) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top || '#a5d8ff'); g.addColorStop(1, bottom || '#e7f5ff');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function cloud(c, x, y, s) {
    c.fillStyle = 'rgba(255,255,255,.9)';
    [[0, 0, 18], [18, -8, 22], [38, 0, 18], [20, 6, 18]].forEach(([dx, dy, r]) => {
      c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
    });
  }
  function ground(c, y, col) { c.fillStyle = col || '#b2f2bb'; c.fillRect(0, y, W, H - y); G.line(c, 0, y, W, y, '#69db7c', 3); }
  function floor(c, y) { c.fillStyle = '#fff4e6'; c.fillRect(0, 0, W, H); c.fillStyle = '#e8c39e'; c.fillRect(0, y, W, H - y); G.line(c, 0, y, W, y, '#c69c6d', 3); }
  function bigText(c, txt, x, y, size, col) {
    c.save(); c.font = `900 ${size || 28}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = '#fff'; c.strokeText(txt, x, y); c.fillStyle = col || OL; c.fillText(txt, x, y); c.restore();
  }
  function toy(c, s, size, x, y, p) { drawToy(c, s.toy, size, p || {}, x, y); }
  function parts(s) { if (!s.fx) s.fx = []; return s.fx; }
  function burst(s, x, y, n, cols, sp) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(40, sp || 160);
      parts(s).push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, 1.1), col: pick(cols || RAINBOW), r: rnd(2, 5) });
    }
  }
  function fxTick(s, dt, grav) {
    if (!s.fx) return;
    s.fx.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (grav == null ? 120 : grav) * dt; p.life -= dt; });
    s.fx = s.fx.filter(p => p.life > 0);
  }
  function fxDraw(c, s) {
    if (!s.fx) return;
    s.fx.forEach(p => { c.globalAlpha = clamp(p.life * 1.5, 0, 1); G.circ(c, p.x, p.y, p.r, p.col, false); });
    c.globalAlpha = 1;
  }
  function stars(n) { return '★'.repeat(n); }

  const TYPES = {};

  /* ---- 竹とんぼ: こすって とばす ---- */
  TYPES.fly = {
    hint: 'ぼうを ゆびで 左[さ]右[ゆう]に ごしごし こすって、はなすと とぶよ',
    init(s) { s.y = 280; s.vy = 0; s.ang = 0; s.power = 0; s.fly = false; s.best = 0; s.top = 280; s.lx = null; s.tk = 0; },
    down(s, x) { if (!s.fly) s.lx = x; },
    move(s, x) {
      if (s.lx == null || s.fly) return;
      const d = Math.abs(x - s.lx); s.lx = x;
      s.power = Math.min(12, s.power + d * 0.025);
      s.tk += d; if (s.tk > 60) { s.tk = 0; Snd.noise(0.05, { freq: 600 + s.power * 120, q: 3, vol: 0.15 }); }
    },
    up(s) {
      s.lx = null;
      if (!s.fly && s.power > 1) {
        s.fly = true; s.vy = -s.power * 60; s.top = s.y;
        Snd.noise(0.6, { freq: 800, slide: 2400, q: 2, vol: 0.25 });
      }
    },
    tick(s, dt) {
      s.ang += (s.fly ? s.power * 2.5 + 4 : s.power * 2) * dt;
      if (!s.fly) { s.power = Math.max(0, s.power - dt * 0.8); return; }
      s.vy += 260 * dt; if (s.vy > 70) s.vy = 70;
      s.y += s.vy * dt; s.top = Math.min(s.top, s.y);
      s.power = Math.max(1, s.power - dt * 0.6);
      if (s.y >= 280) {
        s.y = 280; s.fly = false; s.power = 0;
        const m = Math.round((280 - s.top) / 25);
        s.best = Math.max(s.best, m);
        const n = m >= 30 ? 3 : m >= 18 ? 2 : m >= 8 ? 1 : 0;
        s.say(`${m}メートル とんだ！ ${stars(n)}（さいこう ${s.best}メートル）`);
        if (n) Snd.fanfare(); else Snd.tap();
      }
    },
    draw(c, s) {
      const cam = Math.min(0, s.y - 120);
      sky(c);
      cloud(c, 40, 60 - cam * 0.3 % 400, 1); cloud(c, 240, 140 - cam * 0.3 % 400, 0.8);
      if (cam > -300) ground(c, 320 - cam);
      toy(c, s, 130, 180, s.y - cam, { a: s.ang });
      if (!s.fly) {
        G.rect(c, 40, 336, 280 * (s.power / 12), 14, '#ff922b', 7, false);
        G.rect(c, 40, 336, 280, 14, false, 7, OL, 2);
        bigText(c, '← ごしごし →', 180, 316 - cam, 18, '#e8590c');
      } else bigText(c, `${Math.max(0, Math.round((280 - s.y) / 25))}m`, 300, 40, 26);
    }
  };

  /* ---- まわす（風車・水車・歯車・地球儀・回転木馬） ---- */
  TYPES.spin = {
    hint: 'ゆびで ぐるぐる まるを かいて まわそう',
    init(s) { s.ang = 0; s.w = 0; s.prev = null; s.turns = 0; s.acc = 0; s.mel = 0; },
    down(s, x, y) { s.prev = Math.atan2(y - 170, x - 180); },
    move(s, x, y) {
      if (s.prev == null) return;
      const a = Math.atan2(y - 170, x - 180);
      let d = a - s.prev; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      s.prev = a; s.w = clamp(s.w + d * 6, -22, 22);
    },
    up(s) { s.prev = null; },
    tick(s, dt) {
      if (s.toy.id === 'suisha') s.w = Math.max(s.w, 0.6);
      s.ang += s.w * dt;
      s.w *= Math.exp(-0.5 * dt);
      s.acc += Math.abs(s.w * dt);
      const step = s.toy.id === 'kaitenmokuba' ? Math.PI / 2 : Math.PI * 2;
      while (s.acc > step) {
        s.acc -= step;
        if (s.toy.id === 'kaitenmokuba') {
          const m = [523, 659, 784, 659, 698, 587, 523, 494];
          Snd.tone(m[s.mel++ % m.length], 0.4, { type: 'sine', vol: 0.15 });
          if (s.mel % 4) continue;
        } else if (s.toy.id === 'suisha') Snd.noise(0.15, { freq: 700, q: 1, vol: 0.12 });
        else if (s.toy.id === 'haguruma') Snd.tone(300, 0.04, { type: 'square', vol: 0.08 });
        else Snd.noise(0.06, { freq: 1800, q: 4, vol: 0.12 });
        s.turns++;
        if (s.turns % 20 === 0) { Snd.sparkle(); s.say(`${s.turns}かい まわった！ ${stars(Math.min(3, s.turns / 20))}`); }
        else if (s.turns % 5 === 0) s.say(`${s.turns}かい まわった`);
      }
      if (s.toy.id === 'suisha' && Math.random() < dt * 30) parts(s).push({ x: rnd(120, 150), y: 10, vx: 0, vy: 160, life: 0.9, col: '#4dabf7', r: 3 });
      fxTick(s, dt, 200);
    },
    draw(c, s) {
      if (s.toy.id === 'chikyugi') { c.fillStyle = '#10223d'; c.fillRect(0, 0, W, H); for (let i = 0; i < 30; i++) G.circ(c, (i * 97) % W, (i * 53) % H, 1.5, '#fff', false); }
      else sky(c);
      if (s.toy.id === 'suisha') { c.fillStyle = '#74c0fc'; c.fillRect(110, 0, 50, 120); }
      fxDraw(c, s);
      toy(c, s, 300, 180, 170, { a: s.ang });
      if (s.toy.id === 'kazaguruma' && Math.abs(s.w) > 3) for (let i = 0; i < 4; i++) G.line(c, 20, 60 + i * 30, 60 + Math.abs(s.w) * 3, 60 + i * 30, 'rgba(255,255,255,.8)', 3);
    }
  };

  /* ---- こま: ひもを ひいて まわす ---- */
  TYPES.top = {
    hint: 'こまを おさえて、ゆびを 右[みぎ]へ ぴゅっと ひっぱろう',
    init(s) { s.ph = 'ready'; s.spin = 0; s.time = 0; s.ang = 0; s.x = 180; s.sx = null; s.hum = 0; s.tilt = 0; },
    down(s, x, y) { if (s.ph === 'ready') { s.sx = x; s.st = performance.now(); } else if (s.ph === 'fallen') this.init(s); },
    move(s, x) { if (s.sx != null) s.pull = Math.max(0, x - s.sx); },
    up(s, x) {
      if (s.ph !== 'ready' || s.sx == null) return;
      const dx = x - s.sx, dtm = Math.max(0.05, (performance.now() - s.st) / 1000);
      s.sx = null; s.pull = 0;
      if (dx < 60) { s.say('もっと ながく、右[みぎ]へ ひっぱってね'); return; }
      s.spin = clamp(dx / dtm / 90, 4, 24);
      s.ph = 'spin'; s.time = 0; s.y = 120; s.vy = 0;
      Snd.noise(0.25, { freq: 1500, slide: 400, q: 2, vol: 0.3 });
    },
    tick(s, dt) {
      if (s.ph === 'spin') {
        if (s.y < 268) { s.vy += 900 * dt; s.y = Math.min(268, s.y + s.vy * dt); if (s.y >= 268) Snd.tone(180, 0.1, { type: 'triangle', vol: 0.2 }); }
        const gold = s.toy.id === 'kinkoma';
        s.spin -= (0.5 + s.spin * 0.03) * (gold ? 0.75 : 1) * dt;
        s.time += dt; s.ang += s.spin * dt;
        s.x += Math.sin(s.time * 1.3) * dt * 20;
        s.hum += dt;
        if (s.hum > 0.3) { s.hum = 0; Snd.tone(120 + s.spin * 12, 0.25, { type: 'triangle', vol: 0.05 }); }
        if (gold && Math.random() < dt * 8) burst(s, s.x + rnd(-40, 40), s.y - rnd(0, 60), 1, ['#ffd43b', '#fff3bf'], 30);
        if (s.spin < 1) {
          s.ph = 'fallen'; s.tilt = 0;
          const t = Math.round(s.time * 10) / 10;
          const n = t >= 25 ? 3 : t >= 15 ? 2 : t >= 8 ? 1 : 0;
          s.say(`${t}びょう まわった！ ${stars(n)}　タップで もういちど`);
          if (n) Snd.fanfare(); else Snd.tone(200, 0.2, { type: 'triangle', vol: 0.2 });
        }
      } else if (s.ph === 'fallen') s.tilt = Math.min(1.2, s.tilt + dt * 4);
      fxTick(s, dt, 0);
    },
    draw(c, s) {
      floor(c, 300);
      fxDraw(c, s);
      if (s.ph === 'ready') {
        const k = (s.pull || 0) / 200;
        toy(c, s, 150, 150, 160, { a: k * 20 });
        for (let i = 0; i < 4; i++) G.ell(c, 150, 150 + i * 8, 34 - i * 4, 4, false, '#fff', 2);
        G.line(c, 184, 160, 200 + (s.pull || 0), 172, '#fff', 3);
        G.circ(c, 204 + (s.pull || 0), 172, 8, '#ffd43b');
        bigText(c, 'ひも を ひっぱる →', 230, 250, 20, '#e8590c');
      } else {
        const wob = s.ph === 'spin' ? Math.sin(s.time * 9) * clamp(1 - s.spin / 8, 0, 1) * 0.35 : s.tilt;
        G.ell(c, s.x, 312, 40, 6, 'rgba(0,0,0,.12)', false);
        c.save(); c.translate(s.x, (s.y || 268) + 40); c.rotate(wob);
        toy(c, s, 150, 0, -40, { a: s.ang });
        c.restore();
        if (s.ph === 'spin') bigText(c, `${s.time.toFixed(1)}びょう`, 180, 40, 28);
      }
    }
  };

  /* ---- けん玉: タイミング ---- */
  TYPES.kendama = {
    hint: '玉[たま]が まんなかに きた ときに タップ！ おさらに のせよう',
    init(s) { s.t = 0; s.ph = 'swing'; s.ok = 0; s.combo = 0; s.bx = 180; s.by = 110; },
    down(s) {
      if (s.ph !== 'swing') return;
      s.hit = Math.abs(s.bx - 180) < 24;
      s.ph = 'up'; s.k = 0; s.fx0 = s.bx; s.fy0 = s.by;
      Snd.noise(0.1, { freq: 900, q: 2, vol: 0.15 });
    },
    tick(s, dt) {
      if (s.ph === 'swing') { s.t += dt; s.bx = 180 + Math.sin(s.t * 2.4) * 100; s.by = 120 + Math.cos(s.t * 4.8) * 12; }
      else {
        s.k += dt * 2.2;
        const tx = s.hit ? 180 : s.fx0 + (s.fx0 > 180 ? 50 : -50), ty = s.hit ? 236 : 320;
        const k = Math.min(1, s.k);
        s.bx = s.fx0 + (tx - s.fx0) * k;
        s.by = s.fy0 + (ty - s.fy0) * k - Math.sin(k * Math.PI) * 60;
        if (s.k >= 1 && !s.done) {
          s.done = true;
          if (s.hit) {
            s.ok++; s.combo++;
            Snd.tone(1400, 0.08, { type: 'square', vol: 0.1 }); Snd.tone(900, 0.2, { type: 'triangle', vol: 0.2, at: 0.05 });
            burst(s, 180, 236, 14);
            s.say(`のった！ ${s.combo}れんぞく ${stars(Math.min(3, Math.floor(s.combo / 3)))}`);
            if (s.combo % 3 === 0) Snd.fanfare();
          } else { s.combo = 0; Snd.tone(150, 0.2, { type: 'sawtooth', vol: 0.08 }); s.say('おしい！ もういちど'); }
        }
        if (s.k > 1.6) { s.ph = 'swing'; s.done = false; s.t = Math.asin(clamp((s.bx - 180) / 100, -1, 1)) / 2.4; }
      }
      fxTick(s, dt);
    },
    draw(c, s) {
      sky(c, '#fff0f6', '#fff');
      G.rect(c, 156, 20, 48, 340, 'rgba(255,212,59,.25)', 0, false);
      fxDraw(c, s);
      const sc = 220 / 110;
      toy(c, s, 220, 180, 270, { bx: (s.bx - 180) / sc, by: (s.by - 270) / sc });
      bigText(c, `${s.ok}かい`, 310, 30, 24);
    }
  };

  /* ---- ぽんぽん つく（紙風船・手まり） ---- */
  TYPES.bounce = {
    hint: 'おちてくる ところを タップして ぽんぽん つこう',
    init(s) { s.x = 180; s.y = 120; s.vx = 0; s.vy = 0; s.n = 0; s.best = 0; s.ang = 0; s.rest = false; },
    down(s, x, y) {
      if (dist(x, y, s.x, s.y) > 75) return;
      s.vy = -430; s.vx = clamp((s.x - x) * 5, -160, 160); s.rest = false; s.n++;
      s.best = Math.max(s.best, s.n);
      if (s.toy.id === 'kamifusen') Snd.noise(0.12, { freq: 400, q: 1, vol: 0.35, filter: 'lowpass' });
      else Snd.tone(330 + s.n * 10, 0.12, { type: 'triangle', vol: 0.2 });
      if (s.n % 10 === 0) { Snd.fanfare(); s.say(`${s.n}かい！ ${stars(Math.min(3, s.n / 10))}`); } else s.say(`${s.n}かい`);
    },
    tick(s, dt) {
      if (s.rest) return;
      const g = s.toy.id === 'kamifusen' ? 330 : 520;
      s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.ang += s.vx * dt * 0.02;
      if (s.x < 50 || s.x > 310) { s.vx *= -0.8; s.x = clamp(s.x, 50, 310); }
      if (s.y > 300) {
        s.y = 300; s.rest = true;
        if (s.n) s.say(`${s.n}かい つけたよ（さいこう ${s.best}かい）。タップで もういちど`);
        s.n = 0;
      }
    },
    draw(c, s) { floor(c, 340); G.ell(c, s.x, 342, 40 - (300 - s.y) / 10, 6, 'rgba(0,0,0,.1)', false); toy(c, s, 100, s.x, s.y, { a: s.ang }); bigText(c, `${s.n}`, 180, 40, 40, '#e64980'); }
  };

  /* ---- 水鉄砲 ---- */
  TYPES.squirt = {
    hint: 'まとを タップして みずを とばそう',
    init(s) { s.hits = 0; s.tg = []; for (let i = 0; i < 4; i++) this.spawn(s, i); s.shots = []; },
    spawn(s, i) { s.tg[i] = { x: 60 + i * 80, y: 130, vy: 0, down: false, col: pick(RAINBOW), kind: pick(['can', 'flower', 'duck']) }; },
    down(s, x, y) {
      s.shots.push({ k: 0, x, y });
      Snd.noise(0.25, { freq: 1500, q: 0.8, vol: 0.2 });
      s.tg.forEach(t => {
        if (!t.down && Math.abs(x - t.x) < 32 && y > t.y - 45 && y < t.y + 10) {
          t.down = true; t.vy = -120; s.hits++;
          Snd.tone(900, 0.1, { type: 'square', vol: 0.08, at: 0.15 });
          s.say(`${s.hits}こ たおした！ ${s.hits % 10 === 0 ? stars(Math.min(3, s.hits / 10)) : ''}`);
          if (s.hits % 10 === 0) Snd.fanfare();
        }
      });
    },
    tick(s, dt) {
      s.tg.forEach((t, i) => { if (t.down) { t.vy += 600 * dt; t.y += t.vy * dt; if (t.y > 420) this.spawn(s, i); } });
      s.shots.forEach(sh => { sh.k += dt * 3; });
      s.shots = s.shots.filter(sh => sh.k < 1);
    },
    draw(c, s) {
      sky(c, '#d3f9d8', '#fff');
      G.rect(c, 20, 135, 320, 14, '#c69c6d', 3);
      s.tg.forEach(t => {
        if (t.kind === 'can') G.rect(c, t.x - 16, t.y - 40, 32, 40, t.col, 4);
        else if (t.kind === 'duck') { G.ell(c, t.x, t.y - 14, 22, 14, '#ffd43b'); G.circ(c, t.x + 12, t.y - 32, 10, '#ffd43b'); G.poly(c, [t.x + 20, t.y - 32, t.x + 30, t.y - 29, t.x + 20, t.y - 26], '#ff922b', OL, 1.5); G.circ(c, t.x + 14, t.y - 35, 2, OL, false); }
        else { G.line(c, t.x, t.y, t.x, t.y - 30, '#2b8a3e', 4); for (let i = 0; i < 5; i++) G.circ(c, t.x + Math.cos(i * 1.26) * 10, t.y - 36 + Math.sin(i * 1.26) * 10, 7, t.col); G.circ(c, t.x, t.y - 36, 6, '#ffd43b'); }
      });
      s.shots.forEach(sh => {
        for (let i = 0; i < 8; i++) {
          const k = clamp(sh.k - i * 0.04, 0, 1);
          G.circ(c, 70 + (sh.x - 70) * k, 300 + (sh.y - 300) * k - Math.sin(k * Math.PI) * 30, 5, 'rgba(77,171,247,.8)', false);
        }
      });
      c.save(); c.translate(70, 310); c.rotate(-0.6); toy(c, s, 120, 0, 0); c.restore();
    }
  };

  /* ---- レールを はしる（電車・汽車・新幹線） ---- */
  TYPES.rail = {
    hint: '「すすむ」で はしる、「ブレーキ」で とまる。えきに ぴったり とめよう',
    init(s) { s.u = 0; s.v = 0; s.clk = 0; s.stops = 0; s.near = true; s.said = true; },
    pos(u) { return [180 + Math.cos(u) * 140, 160 + Math.sin(u) * 95]; },
    down(s, x, y) {
      if (y < 290) return;
      if (x > 180) {
        s.v = Math.min(2.4, s.v + 0.5);
        if (s.toy.id === 'kisha' || s.toy.id === 'kinkisha') { Snd.tone(700, 0.5, { type: 'sine', vol: 0.12, vib: 0.01 }); Snd.tone(880, 0.5, { type: 'sine', vol: 0.08 }); }
        else if (s.toy.id === 'shinkansen') Snd.noise(0.6, { freq: 600, slide: 2000, q: 1, vol: 0.15 });
        else Snd.tone(440, 0.15, { type: 'square', vol: 0.06 });
      } else { s.v *= 0.35; if (s.v < 0.08) s.v = 0; Snd.noise(0.3, { freq: 3000, q: 8, vol: 0.12 }); }
    },
    tick(s, dt) {
      s.u = (s.u + s.v * dt) % (Math.PI * 2);
      s.v *= Math.exp(-0.08 * dt);
      s.clk += s.v * dt;
      if (s.clk > 0.5) { s.clk = 0; Snd.tone(160, 0.05, { type: 'square', vol: 0.06 }); Snd.tone(140, 0.05, { type: 'square', vol: 0.06, at: 0.09 }); }
      const st = Math.PI / 2;
      let d = Math.abs(s.u - st);
      if (s.v === 0 && !s.near && d < 0.14) {
        s.near = true; s.stops++;
        Snd.fanfare(); s.say(`ていしゃ ぴったり！ ${stars(Math.min(3, s.stops))}`);
      } else if (s.v === 0 && !s.near && !s.said) { s.said = true; s.say('えきから はなれて いるよ'); }
      if (s.v > 0) { s.near = false; s.said = false; }
      if ((s.toy.id === 'kisha' || s.toy.id === 'kinkisha') && s.v > 0 && Math.random() < dt * (4 + s.v * 6)) {
        const [x, y] = this.pos(s.u);
        parts(s).push({ x, y: y - 30, vx: rnd(-10, 10), vy: -30, life: 1.2, col: 'rgba(173,181,189,.8)', r: rnd(6, 11) });
      }
      fxTick(s, dt, -10);
    },
    draw(c, s) {
      ground(c, 0, '#d3f9d8');
      G.ell(c, 180, 160, 140, 95, false, '#868e96', 14);
      G.ell(c, 180, 160, 140, 95, false, '#ced4da', 4);
      G.rect(c, 150, 262, 60, 22, '#ffd8a8', 4); bigText(c, 'えき', 180, 274, 16);
      fxDraw(c, s);
      const [x, y] = this.pos(s.u);
      c.save(); c.translate(x, y); c.rotate(s.u + Math.PI / 2); c.scale(-1, 1);
      toy(c, s, 90, 0, -6);
      c.restore();
      G.rect(c, 10, 296, 160, 54, '#ffc9c9', 14); bigText(c, '◀ ブレーキ', 90, 323, 20, '#c92a2a');
      G.rect(c, 190, 296, 160, 54, '#b2f2bb', 14); bigText(c, 'すすむ ▶', 270, 323, 20, '#2b8a3e');
    }
  };

  /* ---- 太鼓 ---- */
  TYPES.drum = {
    hint: 'まんなかを たたくと「ドン」、ふちを たたくと「カッ」',
    init(s) { s.n = 0; s.pops = []; },
    down(s, x, y) {
      const r = dist(x, y, 180, 180);
      if (r > 160) return;
      const don = r < 112;
      if (don) { Snd.tone(110, 0.4, { type: 'sine', vol: 0.5, slide: 55 }); Snd.noise(0.15, { freq: 200, filter: 'lowpass', vol: 0.4 }); }
      else { Snd.noise(0.06, { freq: 3500, q: 3, vol: 0.4 }); Snd.tone(1000, 0.05, { type: 'square', vol: 0.08 }); }
      s.n++; s.pops.push({ x, y, t: 0, txt: don ? 'ドン' : 'カッ', col: don ? '#e03131' : '#1c7ed6' });
      s.hitT = 0.12;
      if (s.n % 20 === 0) { s.say(`${s.n}かい たたいた！ ${stars(Math.min(3, s.n / 20))}`); Snd.sparkle(); }
    },
    tick(s, dt) { s.pops.forEach(p => { p.t += dt; }); s.pops = s.pops.filter(p => p.t < 0.7); s.hitT = Math.max(0, (s.hitT || 0) - dt); },
    draw(c, s) {
      c.fillStyle = '#fff4e6'; c.fillRect(0, 0, W, H);
      const k = 1 - (s.hitT || 0) * 0.3;
      G.circ(c, 180, 180, 158, '#c92a2a');
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; G.circ(c, 180 + Math.cos(a) * 140, 180 + Math.sin(a) * 140, 4, '#ffd43b', false); }
      G.circ(c, 180, 180, 112 * k, '#fff4e6');
      G.circ(c, 180, 180, 34 * k, false, '#e8590c', 4);
      s.pops.forEach(p => { c.globalAlpha = 1 - p.t / 0.7; bigText(c, p.txt, p.x, p.y - p.t * 60, 32, p.col); c.globalAlpha = 1; });
    }
  };

  /* ---- ドレミ（笛・木琴・鉄琴・草笛・鳥笛） ---- */
  const KAERU = ['ド', 'レ', 'ミ', 'ファ', 'ミ', 'レ', 'ド', 'ミ', 'ファ', 'ソ', 'ラ', 'ソ', 'ファ', 'ミ', 'ド', 'ド', 'ド', 'ド', 'ド', 'レ', 'ミ', 'ファ', 'ミ', 'レ', 'ド'];
  const KEYS = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド2'];
  function voice(id, f) {
    if (id === 'fue') { Snd.tone(f, 0.45, { type: 'sine', vol: 0.25, vib: 0.008, attack: 0.04, hold: true }); Snd.noise(0.2, { freq: f * 2, q: 2, vol: 0.04 }); }
    else if (id === 'ginfue') { Snd.tone(f * 2, 0.5, { type: 'sine', vol: 0.2, vib: 0.01, attack: 0.03, hold: true }); }
    else if (id === 'mokkin') { Snd.tone(f, 0.35, { type: 'triangle', vol: 0.35 }); Snd.tone(f * 4, 0.08, { type: 'sine', vol: 0.06 }); }
    else if (id === 'tekkin') { Snd.tone(f * 2, 1.3, { type: 'sine', vol: 0.2 }); Snd.tone(f * 5.5, 0.4, { type: 'sine', vol: 0.04 }); }
    else if (id === 'denshipiano') { Snd.tone(f, 0.5, { type: 'square', vol: 0.08 }); Snd.tone(f * 2, 0.3, { type: 'sine', vol: 0.06 }); }
    else if (id === 'rappa') { Snd.tone(f, 0.4, { type: 'sawtooth', vol: 0.1, attack: 0.02, hold: true }); Snd.tone(f * 2, 0.4, { type: 'square', vol: 0.03, attack: 0.02 }); }
    else if (id === 'kusabue' || id === 'mugibue') { Snd.tone(f, 0.4, { type: 'sawtooth', vol: 0.07, vib: 0.02, attack: 0.03, hold: true }); }
    else { Snd.tone(f * 1.5, 0.3, { type: 'sine', vol: 0.2, slide: f * 1.9, vib: 0.03 }); }
  }
  TYPES.notes = {
    hint: 'けんばんを タップ。ひかる おとを じゅんばんに ならすと「かえるの うた」に なるよ',
    init(s) { s.i = 0; s.lit = -1; s.litT = 0; s.done = 0; },
    down(s, x, y) {
      if (y < 210) { voice(s.toy.id, Snd.NOTE['ド']); s.wig = 0.3; return; }
      const k = clamp(Math.floor((x - 8) / 43.5), 0, 7);
      voice(s.toy.id, Snd.NOTE[KEYS[k]]);
      s.lit = k; s.litT = 0.25; s.wig = 0.3;
      const want = KAERU[s.i];
      if (KEYS[k] === want) {
        s.i++;
        if (s.i >= KAERU.length) { s.i = 0; s.done++; setTimeout(() => Snd.fanfare(), 400); s.say(`「かえるの うた」が ふけた！ ${stars(Math.min(3, s.done))}`); }
      }
    },
    tick(s, dt) { s.litT = Math.max(0, s.litT - dt); s.wig = Math.max(0, (s.wig || 0) - dt); },
    draw(c, s) {
      sky(c, '#fff9db', '#fff');
      c.save(); c.translate(180, 105); c.rotate(Math.sin((s.wig || 0) * 40) * 0.08); toy(c, s, 170, 0, 0); c.restore();
      const want = KAERU[s.i];
      KEYS.forEach((n, i) => {
        const x = 8 + i * 43.5;
        const on = s.lit === i && s.litT > 0;
        const guide = n === want;
        G.rect(c, x + 2, 220, 39, 125, on ? '#fff' : RAINBOW[i % 7], 8, guide ? '#e8590c' : OL, guide ? 5 : 2);
        bigText(c, n.replace('2', ''), x + 21.5, 320, 16);
        if (guide) bigText(c, '▼', x + 21.5, 236, 16, '#e8590c');
      });
      c.fillStyle = OL; c.font = '700 14px system-ui'; c.textAlign = 'left';
      c.fillText(`かえるの うた ${s.i}/${KAERU.length}`, 10, 20);
    }
  };

  /* ---- 万華鏡 ---- */
  TYPES.kaleido = {
    hint: 'ゆびで なぞると もようが うごく。タップで もようが かわるよ',
    init(s) { s.rot = 0; s.lx = null; s.shp = []; this.mix(s); s.n = 0; },
    mix(s) { s.shp = []; for (let i = 0; i < 9; i++) s.shp.push({ r: rnd(20, 140), a: rnd(0, 0.5), s: rnd(8, 26), col: pick(RAINBOW), k: Math.floor(rnd(0, 3)), sp: rnd(-0.3, 0.3) }); },
    down(s, x) { s.lx = x; s.mv = 0; },
    move(s, x) { if (s.lx == null) return; s.rot += (x - s.lx) * 0.01; s.mv += Math.abs(x - s.lx); s.lx = x; },
    up(s) {
      if (s.mv < 10) { this.mix(s); s.n++; Snd.sparkle(); s.say(`${s.n}こめの もよう`); }
      s.lx = null;
    },
    tick(s, dt) { s.shp.forEach(p => { p.a += p.sp * dt; }); },
    draw(c, s) {
      c.fillStyle = '#212529'; c.fillRect(0, 0, W, H);
      c.save(); c.beginPath(); c.arc(180, 180, 165, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#fff8f0'; c.fillRect(0, 0, W, H);
      c.translate(180, 180); c.rotate(s.rot);
      for (let i = 0; i < 12; i++) {
        c.save(); c.rotate(i * Math.PI / 6); if (i % 2) c.scale(1, -1);
        s.shp.forEach(p => {
          const x = Math.cos(p.a) * p.r, y = Math.sin(p.a) * p.r;
          if (p.k === 0) G.circ(c, x, y, p.s / 2, p.col, false);
          else if (p.k === 1) G.poly(c, [x, y - p.s / 2, x + p.s / 2, y + p.s / 2, x - p.s / 2, y + p.s / 2], p.col, false);
          else G.ell(c, x, y, p.s / 2, p.s / 5, p.col, false, 0, p.a);
        });
        c.restore();
      }
      c.restore();
      G.circ(c, 180, 180, 165, false, '#ae3ec9', 8);
    }
  };

  /* ---- ゆらゆら（起き上がりこぼし・赤べこ） ---- */
  TYPES.wobble = {
    hint: 'タップして つついてみよう',
    init(s) { s.th = 0; s.w = 0; s.n = 0; s.ph = 0; },
    down(s, x) {
      s.w += (x < 180 ? 1 : -1) * 4; s.n++;
      if (s.toy.id === 'akabeko') Snd.tone(500, 0.08, { type: 'triangle', vol: 0.2 });
      else Snd.tone(784, 0.3, { type: 'sine', vol: 0.15 });
      if (s.n % 10 === 0) { s.say(`${s.n}かい つついた ${stars(Math.min(3, s.n / 10))}`); Snd.sparkle(); }
    },
    tick(s, dt) {
      const prev = s.th;
      s.w += (-s.th * 30 - s.w * 1.2) * dt; s.th += s.w * dt;
      if (prev * s.th < 0 && Math.abs(s.w) > 1) {
        if (s.toy.id === 'akabeko') Snd.tone(420, 0.05, { type: 'triangle', vol: 0.1 });
        else Snd.tone(1047, 0.15, { type: 'sine', vol: 0.06 });
      }
    },
    draw(c, s) {
      floor(c, 300);
      if (s.toy.id === 'akabeko') {
        toy(c, s, 280, 180, 180, { a: Math.asin(clamp(s.th * 2, -1, 1)) });
      } else {
        c.save(); c.translate(180, 300); c.rotate(s.th);
        toy(c, s, 260, 0, -110);
        c.restore();
      }
    }
  };

  /* ---- だるま落とし ---- */
  TYPES.daruma = {
    hint: 'したの ブロックから タップして、だるまを おとさずに ぬこう。あわてると たおれるよ',
    init(s) {
      s.bl = ['#4dabf7', '#ffd43b', '#69db7c', '#ff8787'].map((col, i) => ({ col, y: 310 - i * 40, x: 180, vx: 0, out: false }));
      s.hy = 310 - 4 * 40 - 20; s.fall = 0; s.last = 0; s.ok = false; s.ham = 0;
    },
    down(s, x, y) {
      if (s.fall || s.ok) { this.init(s); return; }
      const now = performance.now();
      const left = s.bl.filter(b => !b.out);
      const b = left.find(b => y > b.y - 20 && y < b.y + 20) || left[0];
      if (!b) return;
      b.out = true; b.vx = x < 180 ? 900 : -900; s.ham = 0.2; s.hx = x < 180 ? 60 : 300; s.hy2 = b.y;
      Snd.noise(0.05, { freq: 2500, q: 3, vol: 0.4 }); Snd.tone(600, 0.06, { type: 'square', vol: 0.1 });
      if (now - s.last < 450 && left.length < 4) { s.fall = 0.01; s.say('あっ、たおれた！ タップで もういちど'); Snd.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slide: 90 }); }
      s.last = now;
    },
    tick(s, dt) {
      s.ham = Math.max(0, s.ham - dt);
      s.bl.forEach(b => { if (b.out) b.x += b.vx * dt; });
      let y = 310;
      s.bl.forEach(b => { if (!b.out) { b.y += Math.min(400 * dt, Math.max(0, y - b.y)); y -= 40; } });
      const ty = y + 20;
      s.hy += Math.min(400 * dt, Math.max(0, ty - s.hy));
      if (s.fall) s.fall = Math.min(1.5, s.fall + dt * 3);
      if (!s.fall && !s.ok && s.bl.every(b => b.out) && Math.abs(s.hy - ty) < 1) {
        s.ok = true; Snd.fanfare(); s.say('せいこう！ ★★★　タップで もういちど');
      }
    },
    draw(c, s) {
      floor(c, 330);
      s.bl.forEach(b => G.rect(c, b.x - 55, b.y - 20, 110, 40, b.col, 6));
      c.save(); c.translate(180 + s.fall * 40, s.hy + 20); c.rotate(s.fall);
      G.circ(c, 0, -46, 46, '#e03131'); G.ell(c, 0, -44, 28, 24, '#fff3e0'); G.eyes(c, 0, -48, 10, 4); G.smile(c, 0, -34, 6);
      c.restore();
      if (s.ham) { G.line(c, s.hx, s.hy2 + 60, s.hx + (s.hx < 180 ? 40 : -40), s.hy2, '#a9743a', 6); G.rect(c, s.hx + (s.hx < 180 ? 30 : -50), s.hy2 - 14, 20, 28, '#a9743a', 4); }
    }
  };

  /* ---- 磁石 ---- */
  TYPES.magnet = {
    hint: 'じしゃくを うごかして、てつの クリップを あつめよう',
    init(s) { s.mx = 180; s.my = 90; s.cl = []; for (let i = 0; i < 14; i++) s.cl.push({ x: rnd(30, 330), y: rnd(170, 340), a: rnd(0, 3), on: false, ox: 0, oy: 0, col: pick(['#adb5bd', '#4dabf7', '#ff8787', '#ffd43b']) }); s.n = 0; },
    down(s, x, y) { s.mx = x; s.my = y - 40; },
    move(s, x, y) { s.mx = x; s.my = y - 40; },
    tick(s, dt) {
      const px = s.mx, py = s.my + 40;
      s.cl.forEach(k => {
        if (k.on) { k.x = px + k.ox; k.y = py + k.oy; return; }
        const d = dist(k.x, k.y, px, py);
        if (d < 80) { k.x += (px - k.x) * dt * 6; k.y += (py - k.y) * dt * 6; }
        if (d < 22) {
          k.on = true; k.ox = rnd(-30, 30); k.oy = rnd(0, 26); s.n++;
          Snd.tone(1200 + s.n * 40, 0.05, { type: 'square', vol: 0.08 });
          if (s.n === s.cl.length) { Snd.fanfare(); s.say(`ぜんぶ くっついた！ ★★★`); } else s.say(`${s.n}こ くっついた`);
        }
      });
    },
    draw(c, s) {
      c.fillStyle = '#f8f9fa'; c.fillRect(0, 0, W, H);
      s.cl.forEach(k => {
        c.save(); c.translate(k.x, k.y); c.rotate(k.a);
        G.rect(c, -10, -4, 20, 8, false, 4, k.col, 3);
        c.restore();
      });
      toy(c, s, 110, s.mx, s.my);
    }
  };

  /* ---- 虫眼鏡 ---- */
  TYPES.loupe = {
    hint: 'むしめがねを うごかして、ちいさな いきものを 3びき さがそう',
    init(s) {
      s.lx = 180; s.ly = 180; s.found = 0;
      s.bugs = ['あり', 'てんとうむし', 'ちょうちょ'].map(n => ({ n, x: rnd(40, 320), y: rnd(60, 320), f: false }));
      s.fl = []; for (let i = 0; i < 18; i++) s.fl.push({ x: rnd(0, 360), y: rnd(40, 360), col: pick(RAINBOW) });
    },
    down(s, x, y) { s.lx = x; s.ly = y; },
    move(s, x, y) { s.lx = x; s.ly = y; },
    scene(c, s) {
      c.fillStyle = '#d3f9d8'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) G.line(c, (i * 37) % 360, 360 - (i * 13) % 300, (i * 37) % 360 + 3, 350 - (i * 13) % 300, '#8ce99a', 2);
      s.fl.forEach(f => { for (let k = 0; k < 5; k++) G.circ(c, f.x + Math.cos(k * 1.26) * 4, f.y + Math.sin(k * 1.26) * 4, 3, f.col, false); G.circ(c, f.x, f.y, 2, '#ffd43b', false); });
      s.bugs.forEach(b => {
        if (b.n === 'あり') { G.circ(c, b.x - 3, b.y, 1.6, OL, false); G.circ(c, b.x, b.y, 1.3, OL, false); G.circ(c, b.x + 3, b.y, 1.8, OL, false); }
        else if (b.n === 'てんとうむし') { G.circ(c, b.x, b.y, 3, '#e03131', false); G.circ(c, b.x + 2.6, b.y, 1.4, OL, false); }
        else { G.ell(c, b.x - 2, b.y, 2, 3, '#f783ac', false); G.ell(c, b.x + 2, b.y, 2, 3, '#f783ac', false); G.line(c, b.x, b.y - 2, b.x, b.y + 2, OL, 0.8); }
      });
    },
    tick(s) {
      s.bugs.forEach(b => {
        if (!b.f && dist(b.x, b.y, s.lx, s.ly) < 20) {
          b.f = true; s.found++; Snd.ok();
          if (s.found === 3) { s.say(`ぜんぶ みつけた！ ★★★`); Snd.fanfare(); } else s.say(`${b.n}を みつけた！（${s.found}/3）`);
        }
      });
    },
    draw(c, s) {
      this.scene(c, s);
      c.save(); c.beginPath(); c.arc(s.lx, s.ly, 70, 0, Math.PI * 2); c.clip();
      c.translate(s.lx, s.ly); c.scale(3.2, 3.2); c.translate(-s.lx, -s.ly);
      this.scene(c, s);
      c.restore();
      G.line(c, s.lx + 50, s.ly + 50, s.lx + 100, s.ly + 100, '#e8590c', 14);
      G.circ(c, s.lx, s.ly, 70, false, '#495057', 9);
      s.bugs.filter(b => b.f).forEach(b => bigText(c, '○', b.x, b.y, 22, '#e03131'));
    }
  };

  /* ---- 竹馬 ---- */
  TYPES.walk = {
    hint: 'ひだり・みぎ・ひだり・みぎ… と じゅんばんに タップして あるこう',
    init(s) { s.step = 0; s.side = null; s.cam = 0; s.wob = 0; s.leg = 0; },
    down(s, x) {
      const side = x < 180 ? 'L' : 'R';
      if (side === s.side) { s.wob = 1; Snd.tone(200, 0.15, { type: 'triangle', vol: 0.15 }); s.say('ぐらっ！ こうごに タップしてね'); return; }
      s.side = side; s.step++; s.leg = side === 'L' ? 1 : -1;
      Snd.tone(side === 'L' ? 330 : 392, 0.08, { type: 'triangle', vol: 0.2 });
      if (s.step % 20 === 0) { Snd.fanfare(); s.say(`${s.step}ぽ あるいた！ ${stars(Math.min(3, s.step / 20))}`); } else s.say(`${s.step}ぽ`);
    },
    tick(s, dt) { s.cam += (s.step * 30 - s.cam) * dt * 5; s.wob = Math.max(0, s.wob - dt * 2); s.leg *= Math.exp(-dt * 6); },
    draw(c, s) {
      sky(c); ground(c, 300);
      for (let i = -1; i < 8; i++) { const x = i * 60 - (s.cam % 60); G.line(c, x, 300, x, 310, '#2b8a3e', 3); }
      cloud(c, 260 - (s.cam * 0.2) % 400, 60, 0.8);
      c.save(); c.translate(180, 300); c.rotate(Math.sin(performance.now() / 60) * s.wob * 0.15);
      [-1, 1].forEach(k => {
        const up = (k === 1 ? Math.max(0, s.leg) : Math.max(0, -s.leg)) * 20;
        G.rect(c, k * 22 - 4, -200 - up, 8, 200, '#94d82d', 3);
        G.rect(c, k * 22 - (k < 0 ? 18 : 0), -70 - up, 18, 8, '#a9743a', 2, OL, 2);
      });
      G.rect(c, -18, -150, 36, 60, '#4dabf7', 10);
      G.line(c, -10, -90, -16, -72 - Math.max(0, -s.leg) * 20, OL, 6); G.line(c, 10, -90, 16, -72 - Math.max(0, s.leg) * 20, OL, 6);
      G.line(c, -16, -140, -22, -180, '#ffe3cc', 6); G.line(c, 16, -140, 22, -180, '#ffe3cc', 6);
      G.circ(c, 0, -172, 22, '#ffe3cc'); G.eyes(c, 0, -174, 7); G.smile(c, 0, -164, 4);
      c.restore();
      G.rect(c, 10, 316, 160, 36, 'rgba(255,255,255,.7)', 10, false); bigText(c, 'ひだり', 90, 334, 18, s.side === 'R' ? '#e8590c' : OL);
      G.rect(c, 190, 316, 160, 36, 'rgba(255,255,255,.7)', 10, false); bigText(c, 'みぎ', 270, 334, 18, s.side !== 'R' ? '#e8590c' : OL);
    }
  };

  /* ---- 羽子板 ---- */
  TYPES.paddle = {
    hint: 'いたを 左[さ]右[ゆう]に うごかして、はねを うちかえそう',
    init(s) { s.px = 180; s.n = 0; this.serve(s); },
    serve(s) { s.hx = rnd(80, 280); s.hy = 30; s.vx = rnd(-60, 60); s.vy = 60; s.miss = 0; },
    down(s, x) { s.px = x; }, move(s, x) { s.px = x; },
    tick(s, dt) {
      if (s.miss) { s.miss -= dt; if (s.miss <= 0) this.serve(s); return; }
      s.vy += 160 * dt; s.hx += s.vx * dt; s.hy += s.vy * dt;
      if (s.hx < 20 || s.hx > 340) s.vx *= -1;
      if (s.vy > 0 && s.hy > 268 && s.hy < 300 && Math.abs(s.hx - s.px) < 50) {
        s.vy = -rnd(260, 320); s.vx = (s.hx - s.px) * 3 + rnd(-40, 40); s.n++;
        Snd.tone(800, 0.06, { type: 'square', vol: 0.1 }); Snd.noise(0.05, { freq: 2000, q: 2, vol: 0.2 });
        if (s.n % 5 === 0) { Snd.fanfare(); s.say(`${s.n}かい つづいた！ ${stars(Math.min(3, s.n / 5))}`); } else s.say(`${s.n}かい`);
      }
      if (s.hy > 380) { s.say(`おとしちゃった。${s.n}かい つづいたよ`); s.n = 0; s.miss = 1; }
    },
    draw(c, s) {
      sky(c, '#fff0f6', '#fff');
      G.circ(c, s.hx, s.hy, 8, '#212529');
      [['#ff6b6b', -0.5], ['#ffd43b', 0], ['#69db7c', 0.5]].forEach(([cc, a]) => G.ell(c, s.hx + Math.sin(a) * 10, s.hy - 14, 3.5, 11, cc, OL, 1.5, a));
      c.save(); c.translate(s.px, 300); toy(c, s, 150, 0, 0); c.restore();
    }
  };

  /* ---- 凧 ---- */
  TYPES.kite = {
    hint: 'ゆびで したへ くいっ くいっと ひっぱると たかく あがるよ',
    init(s) { s.h = 0; s.ly = null; s.best = 0; s.t = 0; },
    down(s, x, y) { s.ly = y; }, up(s) { s.ly = null; },
    move(s, x, y) { if (s.ly == null) return; const d = y - s.ly; s.ly = y; if (d > 0) { s.h = Math.min(120, s.h + d * 0.12); Snd.noise(0.08, { freq: 500 + s.h * 10, q: 2, vol: 0.06 }); } },
    tick(s, dt) {
      s.t += dt; s.h = Math.max(0, s.h - dt * 3);
      const m = Math.round(s.h);
      if (m > s.best) { s.best = m; if (m % 30 === 0 && m) { Snd.fanfare(); s.say(`${m}メートル！ ${stars(Math.min(3, m / 30))}`); } }
    },
    draw(c, s) {
      sky(c, s.h > 60 ? '#74c0fc' : '#a5d8ff');
      for (let i = 0; i < 4; i++) cloud(c, (i * 110 + s.t * 10) % 420 - 40, ((i * 90 + s.h * 4) % 360), 0.7);
      ground(c, 330);
      const ky = 290 - Math.min(s.h, 60) * 3.8, kx = 220 + Math.sin(s.t * 1.2) * 30;
      c.beginPath(); c.moveTo(60, 340); c.quadraticCurveTo(120, ky + 100, kx, ky + 30); c.lineWidth = 1.5; c.strokeStyle = '#555'; c.stroke();
      toy(c, s, 120, kx, ky, { t: s.t });
      bigText(c, `${Math.round(s.h)}m`, 60, 40, 26);
    }
  };

  /* ---- 糸電話 ---- */
  const TALK = ['もしもし', 'きこえる？', 'げんき？', 'あそぼう！', 'おはよう', 'またね！', 'ガチャ たのしいね', 'かんじ ならったよ'];
  TYPES.phone = {
    hint: 'かたほうの コップを タップして はなしかけよう',
    init(s) { s.k = -1; s.dir = 1; s.msg = ''; s.mt = 0; s.n = 0; },
    down(s, x) {
      s.dir = x < 180 ? 1 : -1; s.k = 0; s.msg = pick(TALK); s.mt = 0;
      for (let i = 0; i < 4; i++) Snd.tone(rnd(300, 500), 0.1, { type: 'triangle', vol: 0.12, at: i * 0.12 });
    },
    tick(s, dt) {
      if (s.k >= 0) { s.k += dt * 1.6; if (s.k >= 1) { s.k = -1; s.mt = 2; s.n++; for (let i = 0; i < 4; i++) Snd.tone(rnd(500, 800), 0.08, { type: 'square', vol: 0.05, at: i * 0.1 }); s.say(`${s.n}かい とどいた！`); } }
      s.mt = Math.max(0, s.mt - dt);
    },
    draw(c, s) {
      sky(c, '#fff9db', '#fff');
      const kid = (x, col, f) => { G.circ(c, x, 200, 30, '#ffe3cc'); G.eyes(c, x + f * 6, 196, 7); G.smile(c, x + f * 6, 210, 5); G.rect(c, x - 26, 230, 52, 70, col, 14); };
      kid(50, '#ff8787', 1); kid(310, '#74c0fc', -1);
      c.beginPath(); c.moveTo(92, 205);
      for (let i = 0; i <= 20; i++) {
        const u = i / 20, k = s.dir > 0 ? s.k : 1 - s.k;
        const bump = s.k >= 0 ? Math.exp(-Math.pow((u - k) * 10, 2)) * 14 : 0;
        c.lineTo(92 + u * 176, 205 + Math.sin(u * Math.PI) * 10 - bump);
      }
      c.lineWidth = 2; c.strokeStyle = '#555'; c.stroke();
      G.poly(c, [80, 190, 96, 194, 96, 216, 80, 220], '#fab005');
      G.poly(c, [280, 190, 264, 194, 264, 216, 280, 220], '#74c0fc');
      if (s.mt > 0) {
        const x = s.dir > 0 ? 250 : 110;
        G.rect(c, x - 90, 90, 180, 56, '#fff', 20);
        bigText(c, s.msg, x, 118, 20);
      }
    }
  };

  /* ---- ぬいぐるみ・人形 ---- */
  function dollVoice(id) {
    if (id === 'inu') { Snd.tone(700, 0.12, { type: 'sawtooth', vol: 0.12, slide: 380 }); Snd.tone(750, 0.12, { type: 'sawtooth', vol: 0.12, slide: 400, at: 0.2 }); }
    else if (id === 'hitsuji') Snd.tone(420, 0.6, { type: 'sawtooth', vol: 0.08, vib: 0.06 });
    else if (id === 'ushi') Snd.tone(180, 0.8, { type: 'sawtooth', vol: 0.1, slide: 150, attack: 0.08 });
    else if (id === 'uma') Snd.tone(900, 0.7, { type: 'sawtooth', vol: 0.07, slide: 500, vib: 0.08 });
    else if (id === 'yubiningyo') Snd.tone(900, 0.15, { type: 'square', vol: 0.06, slide: 1300 });
    else [1047, 1319, 1568].forEach((f, i) => Snd.tone(f, 0.3, { type: 'sine', vol: 0.12, at: i * 0.08 }));
  }
  TYPES.doll = {
    hint: 'タップすると よろこぶよ。ゆびで うごかすことも できる',
    init(s) { s.x = 180; s.y = 230; s.jy = 0; s.vy = 0; s.sp = 0; s.n = 0; s.drag = false; },
    down(s, x, y) {
      if (dist(x, y, s.x, s.y) < 90) {
        s.vy = -300; s.sp = 0; s.n++; dollVoice(s.toy.id);
        burst(s, s.x, s.y - 60, 6, ['#ff8787', '#f783ac', '#ffd43b'], 80);
        s.say(s.n % 10 === 0 ? `${s.n}かい あそんだ！ ${stars(Math.min(3, s.n / 10))}` : pick(['うれしいな！', 'たのしい！', 'もっと あそぼう', 'ありがとう']));
        if (s.n % 10 === 0) Snd.fanfare();
        s.drag = true; s.dx = x - s.x;
      }
    },
    move(s, x) { if (s.drag) s.x = clamp(x - s.dx, 60, 300); },
    up(s) { s.drag = false; },
    tick(s, dt) {
      s.vy += 900 * dt; s.jy = Math.min(0, s.jy + s.vy * dt); if (s.jy === 0) s.vy = 0;
      s.sp += dt * (s.jy < 0 ? 12 : 0);
      fxTick(s, dt, -60);
    },
    draw(c, s) {
      floor(c, 320);
      G.ell(c, s.x, 322, 60, 8, 'rgba(0,0,0,.1)', false);
      c.save(); c.translate(s.x, s.y + s.jy); c.rotate(s.jy < 0 ? Math.sin(s.sp) * 0.2 : 0);
      toy(c, s, 200, 0, 0); c.restore();
      fxDraw(c, s);
    }
  };

  /* ---- 木馬 ---- */
  TYPES.rock = {
    hint: 'タップや スワイプで ゆらゆら ゆらそう',
    init(s) { s.ph = 0; s.amp = 0; s.n = 0; s.lx = null; },
    down(s, x) { s.amp = Math.min(1.4, s.amp + 0.5); s.lx = x; },
    move(s, x) { if (s.lx != null) { s.amp = Math.min(1.4, s.amp + Math.abs(x - s.lx) * 0.003); s.lx = x; } },
    up(s) { s.lx = null; },
    tick(s, dt) {
      const prev = Math.sin(s.ph);
      s.ph += dt * 3.2; s.amp *= Math.exp(-0.4 * dt);
      if (prev * Math.sin(s.ph) < 0 && s.amp > 0.15) {
        s.n++; Snd.tone(240, 0.12, { type: 'triangle', vol: 0.1 * s.amp, slide: 200 });
        if (s.n % 20 === 0) { s.say(`${s.n}かい ゆれた ${stars(Math.min(3, s.n / 20))}`); Snd.sparkle(); }
      }
    },
    draw(c, s) { floor(c, 310); toy(c, s, 280, 180, 190, { a: Math.asin(clamp(Math.sin(s.ph) * s.amp, -1, 1)) }); }
  };

  /* ---- 積み木 ---- */
  TYPES.stack = {
    hint: 'うごいている つみきを タップして おとそう。たかく つめるかな？',
    init(s) { s.tw = []; s.mx = 60; s.dir = 1; s.drop = null; s.cols = ['#ff8787', '#4dabf7', '#69db7c', '#ffd43b', '#b197fc', '#ffa94d']; s.crash = 0; s.best = s.best || 0; },
    down(s) { if (s.crash) return; if (!s.drop) { s.drop = { x: s.mx, y: 60, vy: 0 }; Snd.tap(); } },
    topY(s) { return 320 - s.tw.length * 34; },
    tick(s, dt) {
      if (s.crash) { s.crash -= dt; s.tw.forEach(b => { b.y += 300 * dt; b.a += dt * 3; }); if (s.crash <= 0) this.init(s); return; }
      s.mx += s.dir * (100 + s.tw.length * 20) * dt;
      if (s.mx > 300 || s.mx < 60) s.dir *= -1;
      const d = s.drop;
      if (d) {
        d.vy += 900 * dt; d.y += d.vy * dt;
        const off = Math.min(0, 6 - s.tw.length) * -34;
        const ty = this.topY(s) + off - 17;
        if (d.y >= ty) {
          const below = s.tw.length ? s.tw[s.tw.length - 1].x : d.x;
          if (Math.abs(d.x - below) > 42) {
            s.crash = 1.2; s.tw.push({ x: d.x, y: ty, a: 0 });
            Snd.noise(0.5, { freq: 300, filter: 'lowpass', vol: 0.4 });
            s.say(`がらがら〜！ ${s.tw.length - 1}こ つめたよ`);
          } else {
            s.tw.push({ x: d.x, y: ty, a: 0 });
            Snd.tone(300 + s.tw.length * 40, 0.1, { type: 'triangle', vol: 0.25 });
            const n = s.tw.length; s.best = Math.max(s.best, n);
            if (n % 5 === 0) { Snd.fanfare(); s.say(`${n}こ つめた！ ${stars(Math.min(3, n / 5))}`); } else s.say(`${n}こ`);
          }
          s.drop = null;
        }
      }
    },
    draw(c, s) {
      floor(c, 337);
      const off = Math.max(0, s.tw.length - 6) * 34;
      s.tw.forEach((b, i) => { c.save(); c.translate(b.x, b.y + off); c.rotate(b.a); G.rect(c, -44, -17, 88, 34, s.cols[i % 6], 4); c.restore(); });
      if (!s.crash) {
        const col = s.cols[s.tw.length % 6];
        if (s.drop) G.rect(c, s.drop.x - 44, s.drop.y - 17, 88, 34, col, 4);
        else G.rect(c, s.mx - 44, 43, 88, 34, col, 4);
      }
      bigText(c, `${s.tw.length}こ`, 320, 20, 20);
    }
  };

  /* ---- 風鈴 ---- */
  TYPES.bell = {
    hint: 'ゆびで よこに なぞって かぜを おくろう',
    init(s) { s.th = 0; s.w = 0; s.lx = null; s.n = 0; s.wind = 0; },
    down(s, x) { s.lx = x; }, up(s) { s.lx = null; },
    move(s, x) { if (s.lx == null) return; const d = x - s.lx; s.lx = x; s.w += d * 0.02; s.wind = Math.min(1, s.wind + Math.abs(d) * 0.01); },
    tick(s, dt) {
      const prev = s.w;
      s.w += (-s.th * 14 - s.w * 0.8) * dt; s.th += s.w * dt; s.wind = Math.max(0, s.wind - dt);
      if (prev * s.w < 0 && Math.abs(s.th) > 0.08) {
        s.n++; const f = pick([2093, 2349, 2637, 3136]);
        Snd.tone(f, 1.2, { type: 'sine', vol: 0.12 }); Snd.tone(f * 2.7, 0.4, { type: 'sine', vol: 0.03 });
        if (s.n % 15 === 0) { s.say(`ちりーん ${s.n}かい ${stars(Math.min(3, s.n / 15))}`); } else s.say('ちりーん');
      }
    },
    draw(c, s) {
      sky(c, '#e3fafc', '#fff');
      G.rect(c, 0, 0, 360, 24, '#c69c6d', 0);
      for (let i = 0; i < 5; i++) if (s.wind > 0.1) G.line(c, 30 + i * 70 - s.wind * 20, 200 + i * 20, 70 + i * 70 + s.wind * 20, 200 + i * 20, `rgba(116,192,252,${s.wind})`, 3);
      c.save(); c.translate(180, 24); c.rotate(s.th);
      toy(c, s, 280, 0, 140, { a: s.th * 6 });
      c.restore();
    }
  };

  /* ---- 花火 ---- */
  TYPES.firework = {
    hint: 'そらを タップすると はなびが あがるよ',
    init(s) { s.rk = []; s.n = 0; },
    down(s, x, y) { s.rk.push({ x, y: 360, ty: Math.min(y, 260), vy: -420 }); Snd.tone(600, 0.6, { type: 'sine', vol: 0.06, slide: 1600 }); },
    tick(s, dt) {
      s.rk.forEach(r => {
        r.y += r.vy * dt;
        if (r.y <= r.ty && !r.boom) {
          r.boom = true; s.n++;
          const cols = [pick(RAINBOW), pick(RAINBOW), '#fff'];
          burst(s, r.x, r.y, 46, cols, 170);
          Snd.noise(0.6, { freq: 200, filter: 'lowpass', vol: 0.5 });
          for (let i = 0; i < 6; i++) Snd.noise(0.03, { freq: 4000, q: 3, vol: 0.1, at: 0.4 + i * 0.07 });
          if (s.n % 10 === 0) { s.say(`${s.n}ぱつ！ ${stars(Math.min(3, s.n / 10))}`); } else s.say(`${s.n}ぱつ`);
        }
      });
      s.rk = s.rk.filter(r => !r.boom);
      fxTick(s, dt, 50);
    },
    draw(c, s) {
      c.fillStyle = '#1b1f3b'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 25; i++) G.circ(c, (i * 113) % W, (i * 47) % 200, 1.2, '#fff', false);
      c.fillStyle = '#212529'; c.fillRect(0, 330, W, 30);
      s.rk.forEach(r => { G.circ(c, r.x, r.y, 4, '#ffd43b', false); G.line(c, r.x, r.y + 4, r.x, r.y + 20, 'rgba(255,212,59,.5)', 2); });
      fxDraw(c, s);
      if (!s.n) toy(c, s, 100, 180, 290);
    }
  };

  /* ---- 自動車（うえから みた みち） ---- */
  TYPES.drive = {
    hint: 'ゆびで くるまを 左[さ]右[ゆう]に うごかして、コーンを よけよう',
    init(s) { s.x = 180; s.tx = 180; s.road = 0; s.cones = []; s.m = 0; s.hit = 0; s.next = 1; },
    down(s, x) { s.tx = clamp(x, 70, 290); }, move(s, x) { s.tx = clamp(x, 70, 290); },
    tick(s, dt) {
      const sp = s.hit ? 60 : 220;
      s.hit = Math.max(0, s.hit - dt);
      s.x += (s.tx - s.x) * dt * 8;
      s.road = (s.road + sp * dt) % 60; s.m += sp * dt / 20;
      s.next -= dt;
      if (s.next <= 0) { s.next = rnd(0.6, 1.3); s.cones.push({ x: pick([100, 180, 260]), y: -20 }); }
      s.cones.forEach(k => { k.y += sp * dt; if (!k.hit && Math.abs(k.y - 290) < 30 && Math.abs(k.x - s.x) < 40) { k.hit = true; s.hit = 1; Snd.noise(0.3, { freq: 400, vol: 0.3 }); s.say('ぶつかった！ きをつけて'); } });
      s.cones = s.cones.filter(k => k.y < 400);
      const m = Math.floor(s.m);
      if (m >= s.lastM + 100 || (s.lastM == null && m >= 100)) { s.lastM = m - (m % 100); Snd.sparkle(); s.say(`${s.lastM}メートル はしった！ ${stars(Math.min(3, s.lastM / 100))}`); }
    },
    draw(c, s) {
      c.fillStyle = '#8ce99a'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#495057'; c.fillRect(50, 0, 260, H);
      for (let y = -60; y < H; y += 60) { G.rect(c, 137, y + s.road, 6, 30, '#fff', 0, false); G.rect(c, 217, y + s.road, 6, 30, '#fff', 0, false); }
      s.cones.forEach(k => { G.poly(c, [k.x, k.y - 18, k.x + 14, k.y + 14, k.x - 14, k.y + 14], '#ff922b'); G.rect(c, k.x - 8, k.y - 2, 16, 5, '#fff', 0, false); });
      c.save(); c.translate(s.x, 290); c.rotate(s.hit ? Math.sin(s.hit * 20) * 0.3 : (s.tx - s.x) * 0.004);
      G.rect(c, -24, -40, 48, 80, s.toy.c, 12); G.rect(c, -18, -26, 36, 18, '#d0ebff', 4, OL, 2); G.rect(c, -18, 14, 36, 14, '#d0ebff', 4, OL, 2);
      G.circ(c, -14, -40, 4, '#ffe066', false); G.circ(c, 14, -40, 4, '#ffe066', false);
      c.restore();
      bigText(c, `${Math.floor(s.m)}m`, 300, 24, 20);
    }
  };

  /* ---- 船 ---- */
  TYPES.boat = {
    hint: 'みずの うえを 左[ひだり]から 右[みぎ]へ なぞって なみを おこし、ふねを はたまで はこぼう',
    init(s) { s.x = 50; s.v = 0; s.t = 0; s.lx = null; s.goal = s.goal || 0; s.done = 0; },
    down(s, x) { s.lx = x; }, up(s) { s.lx = null; },
    move(s, x) { if (s.lx == null) return; const d = x - s.lx; s.lx = x; s.v = clamp(s.v + d * 0.25, -60, 120); if (Math.abs(d) > 4) Snd.noise(0.08, { freq: 500, q: 1, vol: 0.06 }); },
    tick(s, dt) {
      s.t += dt;
      if (s.done) { s.done -= dt; if (s.done <= 0) { s.x = 50; s.v = 0; } return; }
      s.x = clamp(s.x + s.v * dt, 40, 330); s.v *= Math.exp(-0.7 * dt);
      if (s.x >= 300) { s.goal++; s.done = 1.5; Snd.fanfare(); s.say(`ゴール！ ${s.goal}かいめ ${stars(Math.min(3, s.goal))}`); }
    },
    draw(c, s) {
      sky(c);
      G.line(c, 316, 120, 316, 250, OL, 3); G.poly(c, [316, 120, 350, 132, 316, 144], '#ff6b6b');
      G.rect(c, 290, 240, 70, 120, '#e9c46a', 0, false);
      const by = 220 + Math.sin(s.t * 2.5) * 6;
      toy(c, s, 120, s.x, by, {});
      c.fillStyle = 'rgba(77,171,247,.85)'; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) c.lineTo(x, 250 + Math.sin(x / 25 + s.t * 3) * 6);
      c.lineTo(W, H); c.fill();
    }
  };

  /* ---- 紙飛行機 ---- */
  TYPES.plane = {
    hint: 'ひこうきから 右[みぎ]うえへ スワイプして なげよう',
    init(s) { s.x = 60; s.y = 250; s.vx = 0; s.vy = 0; s.fly = false; s.sx = null; s.best = s.best || 0; s.cam = 0; },
    down(s, x, y) { if (!s.fly) { s.sx = x; s.sy = y; s.st = performance.now(); } },
    up(s, x, y) {
      if (s.fly || s.sx == null) return;
      const dtm = Math.max(0.06, (performance.now() - s.st) / 1000);
      const dx = x - s.sx, dy = y - s.sy; s.sx = null;
      if (Math.hypot(dx, dy) < 30) return;
      s.vx = clamp(dx / dtm * 0.5, 40, 420); s.vy = clamp(dy / dtm * 0.5, -300, 100); s.fly = true;
      Snd.noise(0.4, { freq: 1200, slide: 500, q: 1, vol: 0.2 });
    },
    tick(s, dt) {
      if (!s.fly) return;
      s.vy += (140 - s.vx * 0.35) * dt; s.vy = Math.min(s.vy, 90);
      s.vx *= Math.exp(-0.25 * dt);
      s.x += s.vx * dt; s.y += s.vy * dt; s.cam = Math.max(0, s.x - 150);
      if (s.y < 30) { s.y = 30; s.vy = 0; }
      if (s.y >= 320) {
        s.fly = false; const m = Math.round((s.x - 60) / 30);
        s.best = Math.max(s.best, m);
        const n = m >= 40 ? 3 : m >= 25 ? 2 : m >= 12 ? 1 : 0;
        s.say(`${m}メートル とんだ！ ${stars(n)}（さいこう ${s.best}m）　タップで もういちど`);
        if (n) Snd.fanfare(); else Snd.tap();
        s.land = true;
      }
    },
    draw(c, s) {
      if (s.land && !s.fly && s.sx != null) { s.land = false; const b = s.best; this.init(s); s.best = b; }
      sky(c); ground(c, 330);
      for (let i = 0; i < 30; i++) { const x = i * 150 - s.cam; if (x > -50 && x < 400) { G.line(c, x, 330, x, 340, '#2b8a3e', 3); c.fillStyle = OL; c.font = '12px system-ui'; c.fillText(`${i * 5}m`, x + 3, 352); } }
      cloud(c, 200 - (s.cam * 0.3) % 500, 70, 0.9);
      c.save(); c.translate(s.x - s.cam, s.y); c.rotate(Math.atan2(s.vy, Math.max(1, s.vx)) * (s.fly ? 1 : 0));
      toy(c, s, 80, 0, 0); c.restore();
      if (!s.fly && !s.land) bigText(c, '↗ スワイプ', 150, 200, 22, '#1971c2');
    }
  };

  /* ---- なげる（輪投げ・玉入れ・弓矢） ---- */
  TYPES.throw = {
    hint: 'したから うえへ スワイプして、まとを ねらおう',
    init(s) { s.p = null; s.hits = 0; s.tries = 0; s.t = 0; s.sx = null; s.mark = []; },
    tx(s) { return 180 + Math.sin(s.t * 0.9) * 90; },
    down(s, x, y) { if (!s.p) { s.sx = x; s.sy = y; } },
    up(s, x, y) {
      if (s.p || s.sx == null) return;
      const dx = x - s.sx, dy = y - s.sy; s.sx = null;
      if (dy > -30) return;
      const len = Math.hypot(dx, dy);
      s.p = { x: 180, y: 320, vx: dx / len * 520, vy: dy / len * 520, pow: len, a: 0 };
      s.tries++;
      if (s.toy.id === 'yumiya') Snd.tone(300, 0.15, { type: 'triangle', vol: 0.2, slide: 120 }); else Snd.noise(0.2, { freq: 800, q: 1, vol: 0.15 });
    },
    tick(s, dt) {
      s.t += dt;
      const p = s.p; if (!p) return;
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 8;
      const ty = 110;
      const reach = 320 - Math.min(1, p.pow / 160) * 220;
      if (p.y <= Math.max(ty, reach)) {
        const ok = p.y <= ty + 1 && Math.abs(p.x - this.tx(s)) < (s.toy.id === 'yumiya' ? 40 : 28);
        if (ok) {
          s.hits++; Snd.ok(); burst(s, p.x, ty, 12);
          if (s.toy.id === 'yumiya') { const d = Math.abs(p.x - this.tx(s)); s.mark.push(p.x - this.tx(s)); s.say(d < 12 ? 'まんなか！ ★' : 'あたり！'); }
          else s.say(`はいった！ ${s.hits}こ ${s.hits % 3 === 0 ? stars(Math.min(3, s.hits / 3)) : ''}`);
          if (s.hits % 3 === 0) Snd.fanfare();
        } else { Snd.tone(200, 0.15, { type: 'triangle', vol: 0.15 }); s.say(p.y > ty + 1 ? 'もっと つよく なげてみよう' : 'おしい！'); }
        s.p = null;
      }
      fxTick(s, dt);
    },
    draw(c, s) {
      sky(c, '#fff9db', '#fff');
      ground(c, 250, '#ffe8cc');
      const tx = this.tx(s), id = s.toy.id;
      if (id === 'wanage') { G.rect(c, tx - 30, 120, 60, 10, '#a9743a', 3); G.rect(c, tx - 4, 60, 8, 62, '#d9a066', 3); }
      else if (id === 'tamaire') { G.line(c, tx, 110, tx, 250, '#adb5bd', 5); G.poly(c, [tx - 34, 76, tx + 34, 76, tx + 22, 112, tx - 22, 112], '#fff'); }
      else { [40, 28, 16, 6].forEach((r, i) => G.circ(c, tx, 110, r, i % 2 ? '#fff' : '#e03131')); s.mark.slice(-5).forEach(m => G.circ(c, tx + m, 110, 3, OL, false)); }
      fxDraw(c, s);
      const p = s.p;
      if (p) {
        if (id === 'wanage') G.ell(c, p.x, p.y, 22, 8, false, pick(['#e03131', '#4dabf7']), 6);
        else if (id === 'tamaire') G.circ(c, p.x, p.y, 10, '#e03131');
        else { c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx)); G.line(c, -30, 0, 10, 0, '#8d5a2b', 3); G.poly(c, [16, 0, 6, -5, 6, 5], '#868e96', OL, 1.5); c.restore(); }
      } else toy(c, s, 90, 180, 312);
      bigText(c, `${s.hits} / ${s.tries}`, 310, 24, 20);
    }
  };

  /* ---- 金魚すくい ---- */
  TYPES.scoop = {
    hint: 'きんぎょの うえを タップして すくおう。ポイが やぶれるまで なんびき とれるかな',
    init(s) { s.fish = []; for (let i = 0; i < 7; i++) s.fish.push({ x: rnd(60, 300), y: rnd(90, 280), a: rnd(0, 6), v: rnd(30, 60), col: pick(['#fa5252', '#ff922b', '#212529', '#fa5252']) }); s.n = 0; s.hp = 5; s.px = 180; s.py = 200; s.sp = 0; },
    down(s, x, y) {
      s.px = x; s.py = y;
      if (s.hp <= 0) { this.init(s); return; }
      s.sp = 0.3; Snd.noise(0.2, { freq: 900, q: 0.8, vol: 0.2 });
      const f = s.fish.find(f => !f.got && dist(f.x, f.y, x, y) < 34);
      s.hp--;
      if (f) { f.got = true; s.n++; Snd.ok(); s.say(`${s.n}ひき すくった！`); }
      if (s.hp <= 0) { const n = s.n >= 4 ? 3 : s.n >= 2 ? 2 : s.n >= 1 ? 1 : 0; setTimeout(() => s.say(`ポイが やぶれた！ ${s.n}ひき ${stars(n)}　タップで もういちど`), 300); if (n) Snd.fanfare(); }
    },
    move(s, x, y) { s.px = x; s.py = y; },
    tick(s, dt) {
      s.sp = Math.max(0, s.sp - dt);
      s.fish.forEach(f => {
        if (f.got) return;
        f.a += rnd(-1, 1) * dt * 2; f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
        if (dist(f.x, f.y, 180, 185) > 140) f.a = Math.atan2(185 - f.y, 180 - f.x);
      });
    },
    draw(c, s) {
      c.fillStyle = '#fff4e6'; c.fillRect(0, 0, W, H);
      G.circ(c, 180, 185, 165, '#4dabf7', '#1971c2', 8);
      s.fish.forEach(f => {
        if (f.got) return;
        c.save(); c.translate(f.x, f.y); c.rotate(f.a);
        G.ell(c, 0, 0, 14, 9, f.col, OL, 2); G.poly(c, [-12, 0, -24, -9, -24, 9], f.col, OL, 2); G.circ(c, 7, -3, 2, '#fff', false);
        c.restore();
      });
      const k = 1 + s.sp;
      G.line(c, s.px + 26, s.py + 26, s.px + 60, s.py + 60, '#e64980', 8);
      G.circ(c, s.px, s.py, 36 * k, s.hp > 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.1)', '#e64980', 5);
      if (s.hp <= 0) G.line(c, s.px - 20, s.py - 10, s.px + 18, s.py + 14, '#e64980', 2);
      bigText(c, `${s.n}ひき　ポイ ${'●'.repeat(Math.max(0, s.hp))}`, 180, 352, 16);
    }
  };

  /* ---- 貝がら ---- */
  TYPES.shell = {
    hint: 'かいがらを タップすると うみの おとが きこえるよ',
    init(s) { s.n = 0; s.pop = []; s.t = 0; s.listen = 0; },
    down(s) {
      s.n++; s.listen = 2.5;
      Snd.noise(2.5, { freq: 500, q: 0.6, vol: 0.18, filter: 'lowpass', attack: 1 });
      const e = pick(['🦀', '🐟', '🐙', '⭐', '🐠', '🐚', '🦐']);
      s.pop.push({ e, x: rnd(60, 300), y: 300, t: 0 });
      s.say(s.n % 10 === 0 ? `ざざーん… ${s.n}かい ${stars(Math.min(3, s.n / 10))}` : 'ざざーん…');
    },
    tick(s, dt) { s.t += dt; s.listen = Math.max(0, s.listen - dt); s.pop.forEach(p => { p.t += dt; }); s.pop = s.pop.filter(p => p.t < 2.5); },
    draw(c, s) {
      sky(c, '#99e9f2', '#e3fafc');
      c.fillStyle = '#ffe8a3'; c.fillRect(0, 280, W, 80);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(0, 270);
      for (let x = 0; x <= W; x += 10) c.lineTo(x, 270 + Math.sin(x / 30 + s.t * 2) * 6 + Math.sin(s.t) * 6);
      c.lineTo(W, 290); c.lineTo(0, 290); c.fill();
      toy(c, s, 200 + s.listen * 10, 180, 170);
      c.font = '40px system-ui'; c.textAlign = 'center';
      s.pop.forEach(p => { c.globalAlpha = 1 - p.t / 2.5; c.fillText(p.e, p.x, p.y - p.t * 40); });
      c.globalAlpha = 1;
    }
  };

  /* ---- 双六 ---- */
  const SPECIAL = { 4: 2, 9: -2, 13: 3, 16: -3 };
  TYPES.dice = {
    hint: 'サイコロを タップして ふろう。ゴールを めざそう',
    init(s) { s.pos = 0; s.die = 1; s.roll = 0; s.walk = 0; s.turn = 0; s.goal = false; s.shown = 0; },
    cell(i) { const r = Math.floor(i / 5), k = i % 5; const col = r % 2 ? 4 - k : k; return [40 + col * 70, 300 - r * 62]; },
    down(s) {
      if (s.goal) { this.init(s); return; }
      if (s.roll || s.walk) return;
      s.roll = 0.7; s.turn++;
    },
    tick(s, dt) {
      if (s.roll) {
        s.roll -= dt; s.shown = Math.floor(rnd(1, 7));
        if (Math.random() < 0.3) Snd.click();
        if (s.roll <= 0) { s.roll = 0; s.die = Math.floor(rnd(1, 7)); s.shown = s.die; s.walk = s.die; s.wt = 0; s.say(`${s.die}が でた！`); }
      } else if (s.walk) {
        s.wt -= dt;
        if (s.wt <= 0) {
          s.wt = 0.25; s.pos = Math.min(19, s.pos + 1); s.walk--; Snd.tone(600 + s.pos * 20, 0.06, { type: 'triangle', vol: 0.15 });
          if (s.pos === 19) s.walk = 0;
          if (!s.walk) {
            const sp = SPECIAL[s.pos];
            if (sp) { s.pos = clamp(s.pos + sp, 0, 19); s.say(sp > 0 ? `${sp}マス すすむ！` : `${-sp}マス もどる…`); Snd.tone(sp > 0 ? 900 : 300, 0.2, { type: 'triangle', vol: 0.2 }); }
            if (s.pos === 19) { s.goal = true; const n = s.turn <= 4 ? 3 : s.turn <= 6 ? 2 : 1; s.say(`ゴール！ ${s.turn}かいで ついた ${stars(n)}　タップで もういちど`); Snd.fanfare(); }
          }
        }
      }
    },
    draw(c, s) {
      c.fillStyle = '#fff9db'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 20; i++) {
        const [x, y] = this.cell(i);
        G.rect(c, x - 30, y - 26, 60, 52, i === 0 ? '#d3f9d8' : i === 19 ? '#ffd8a8' : SPECIAL[i] ? (SPECIAL[i] > 0 ? '#d0ebff' : '#ffe3e3') : '#fff', 8, OL, 2);
        c.fillStyle = OL; c.font = '700 13px system-ui'; c.textAlign = 'center';
        c.fillText(i === 0 ? 'スタート' : i === 19 ? 'ゴール' : SPECIAL[i] ? (SPECIAL[i] > 0 ? `${SPECIAL[i]}すすむ` : `${-SPECIAL[i]}もどる`) : `${i}`, x, y + 5);
      }
      const [px, py] = this.cell(s.pos);
      G.circ(c, px, py - 14, 12, s.toy.c); G.circ(c, px, py - 30, 8, s.toy.c);
      G.rect(c, 290, 10, 60, 60, '#fff', 10);
      const d = s.shown || s.die, pip = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]][d];
      pip.forEach(([a, b]) => G.circ(c, 320 + a * 15, 40 + b * 15, 5, d === 1 ? '#e03131' : OL, false));
    }
  };

  /* ---- 福笑い ---- */
  const FACE = [['まゆ', -24, -40], ['まゆ', 24, -40], ['め', -24, -22], ['め', 24, -22], ['はな', 0, 6], ['くち', 0, 36]];
  TYPES.face = {
    hint: 'めかくし ちゅう！ うごく パーツを タップして かおに おこう',
    init(s) { s.i = 0; s.put = []; s.t = 0; },
    part(c, n, x, y) {
      if (n === 'まゆ') G.line(c, x - 12, y + 2, x + 12, y - 2, OL, 5);
      else if (n === 'め') G.ell(c, x, y, 10, 5, OL, false);
      else if (n === 'はな') G.ell(c, x, y, 7, 10, '#ffa8a8');
      else G.ell(c, x, y, 16, 7, '#fa5252');
    },
    cur(s) { return [180 + Math.sin(s.t * 1.7) * 110, 190 + Math.sin(s.t * 1.1 + 1) * 70]; },
    down(s) {
      if (s.i >= FACE.length) { this.init(s); return; }
      const [x, y] = this.cur(s); s.put.push([x, y]); s.i++;
      Snd.tap();
      if (s.i === FACE.length) {
        const err = s.put.reduce((a, [x, y], k) => a + dist(x, y, 180 + FACE[k][1] * 1.6, 190 + FACE[k][2] * 1.6), 0) / FACE.length;
        const n = err < 25 ? 3 : err < 45 ? 2 : err < 70 ? 1 : 0;
        s.say(n === 3 ? `じょうず！ ${stars(3)}` : n ? `できた！ ${stars(n)}` : 'おもしろい かお！ あはは');
        Snd.fanfare();
      }
    },
    tick(s, dt) { s.t += dt; },
    draw(c, s) {
      c.fillStyle = '#fff0f6'; c.fillRect(0, 0, W, H);
      G.ell(c, 180, 200, 110, 130, '#ffe8cc');
      c.beginPath(); c.arc(180, 170, 116, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(260, 110); c.lineTo(100, 110); c.closePath(); G.path(c, '#212529');
      const done = s.i >= FACE.length;
      if (done) s.put.forEach(([x, y], k) => this.part(c, FACE[k][0], x, y));
      else {
        s.put.forEach(([x, y]) => bigText(c, '？', x, y, 18, '#adb5bd'));
        const [x, y] = this.cur(s);
        this.part(c, FACE[s.i][0], x, y);
        G.rect(c, 90, 6, 180, 36, '#fff', 12);
        bigText(c, `つぎは「${FACE[s.i][0]}」`, 180, 24, 18);
      }
    }
  };

  /* ---- シャボン玉 ---- */
  TYPES.bubble = {
    hint: 'ゆびで なぞると シャボンだまが でるよ。タップで わろう',
    init(s) { s.b = []; s.n = 0; s.lx = null; s.acc = 0; },
    down(s, x, y) {
      const i = s.b.findIndex(b => dist(b.x, b.y, x, y) < b.r + 6);
      if (i >= 0) {
        const b = s.b.splice(i, 1)[0]; s.n++;
        burst(s, b.x, b.y, 8, ['#99e9f2', '#f783ac', '#fff'], 80);
        Snd.tone(1400 - b.r * 20, 0.06, { type: 'sine', vol: 0.2 });
        if (s.n % 20 === 0) { s.say(`${s.n}こ わった！ ${stars(Math.min(3, s.n / 20))}`); Snd.fanfare(); } else s.say(`${s.n}こ わった`);
        return;
      }
      s.lx = x; s.ly = y;
    },
    move(s, x, y) {
      if (s.lx == null) return;
      s.acc += dist(x, y, s.lx, s.ly); s.lx = x; s.ly = y;
      if (s.acc > 22 && s.b.length < 40) { s.acc = 0; s.b.push({ x, y, r: rnd(10, 28), t: rnd(0, 6), vy: rnd(-40, -15) }); Snd.tone(rnd(900, 1400), 0.05, { type: 'sine', vol: 0.05 }); }
    },
    up(s) { s.lx = null; },
    tick(s, dt) { s.b.forEach(b => { b.t += dt; b.y += b.vy * dt; b.x += Math.sin(b.t * 2) * 20 * dt; }); s.b = s.b.filter(b => b.y > -40); fxTick(s, dt, 0); },
    draw(c, s) {
      sky(c);
      ground(c, 320);
      s.b.forEach(b => {
        G.circ(c, b.x, b.y, b.r, 'rgba(153,233,242,.25)', 'rgba(102,217,232,.9)', 2);
        G.ell(c, b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.3, b.r * 0.14, '#fff', false, 0, -0.6);
        c.beginPath(); c.arc(b.x, b.y, b.r - 3, b.t, b.t + 1); c.lineWidth = 2; c.strokeStyle = 'rgba(247,131,172,.6)'; c.stroke();
      });
      fxDraw(c, s);
      if (!s.b.length && !s.n) toy(c, s, 140, 180, 200);
    }
  };

  /* ---- お手玉 ---- */
  TYPES.juggle = {
    hint: 'おちてくる おてだまを タップして なげあげよう',
    init(s) { s.bags = [this.mk(130), this.mk(230)]; s.n = 0; s.best = s.best || 0; },
    mk(x) { return { x, y: 300, vx: 0, vy: 0, a: 0, col: pick(['#9c36b5', '#ff8787', '#4dabf7', '#ffd43b']), rest: true }; },
    down(s, x, y) {
      const b = s.bags.find(b => dist(b.x, b.y, x, y) < 60);
      if (!b) return;
      b.vy = -460; b.vx = b.x < 180 ? 110 : -110; b.rest = false; s.n++;
      s.best = Math.max(s.best, s.n);
      Snd.noise(0.07, { freq: 600, q: 1, vol: 0.25, filter: 'lowpass' });
      if (s.n === 10 && s.bags.length < 3) { s.bags.push(this.mk(180)); s.say('3こに ふえた！'); }
      else if (s.n % 10 === 0) { Snd.fanfare(); s.say(`${s.n}かい！ ${stars(Math.min(3, s.n / 10))}`); }
      else s.say(`${s.n}かい`);
    },
    tick(s, dt) {
      s.bags.forEach(b => {
        if (b.rest) return;
        b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += dt * 6;
        if (b.x < 40 || b.x > 320) b.vx *= -1;
        if (b.y > 300) { b.y = 300; b.rest = true; b.vx = 0; if (s.n) s.say(`おちた！ ${s.n}かい（さいこう ${s.best}）`); s.n = 0; }
      });
    },
    draw(c, s) {
      floor(c, 330);
      s.bags.forEach(b => {
        c.save(); c.translate(b.x, b.y); c.rotate(b.a);
        G.ell(c, 0, 0, 26, 20, b.col); G.line(c, -24, 0, 24, 0, 'rgba(255,255,255,.7)', 2); G.line(c, 0, -18, 0, 18, 'rgba(255,255,255,.7)', 2);
        c.restore();
      });
      bigText(c, `${s.n}`, 180, 40, 40, '#9c36b5');
    }
  };

  /* ---- 野球盤 ---- */
  TYPES.bat = {
    hint: 'ボールが ホームに きた ときに タップして うとう',
    init(s) { s.ph = 'wait'; s.w = 1; s.score = 0; s.hr = 0; s.swing = 0; },
    pitch(s) { s.ph = 'pitch'; s.by = 90; s.bx = 180; s.v = rnd(180, 300); s.curve = rnd(-30, 30); },
    down(s) {
      if (s.ph !== 'pitch' || s.swing) return;
      s.swing = 0.3;
      const d = Math.abs(s.by - 288);
      let r;
      if (d < 10) { r = 'ホームラン！'; s.hr++; s.score += 4; Snd.fanfare(); s.fly = { x: s.bx, y: s.by, vx: rnd(-60, 60), vy: -500 }; }
      else if (d < 24) { r = 'ヒット！'; s.score++; Snd.ok(); s.fly = { x: s.bx, y: s.by, vx: rnd(-200, 200), vy: -300 }; }
      else if (d < 40) { r = 'ファウル'; Snd.tap(); s.fly = { x: s.bx, y: s.by, vx: rnd(0, 1) > 0.5 ? 300 : -300, vy: -120 }; }
      else { r = 'からぶり…'; Snd.tone(200, 0.15, { type: 'triangle', vol: 0.15 }); }
      if (s.fly) Snd.noise(0.06, { freq: 3000, q: 3, vol: 0.4 });
      s.say(`${r}　とくてん ${s.score}　ホームラン ${s.hr} ${s.hr ? stars(Math.min(3, s.hr)) : ''}`);
      if (s.fly) { s.ph = 'hit'; s.w = 1.4; }
    },
    tick(s, dt) {
      s.swing = Math.max(0, s.swing - dt);
      if (s.ph === 'wait') { s.w -= dt; if (s.w <= 0) this.pitch(s); }
      else if (s.ph === 'pitch') {
        s.by += s.v * dt; s.bx = 180 + Math.sin((s.by - 90) / 200 * Math.PI) * s.curve * 0.3;
        if (s.by > 360) { s.ph = 'wait'; s.w = 1; s.say('ストライク！'); }
      } else if (s.ph === 'hit') {
        s.fly.x += s.fly.vx * dt; s.fly.y += s.fly.vy * dt; s.w -= dt;
        if (s.w <= 0) { s.ph = 'wait'; s.w = 0.6; s.fly = null; }
      }
    },
    draw(c, s) {
      c.fillStyle = '#2b8a3e'; c.fillRect(0, 0, W, H);
      G.poly(c, [180, 300, 290, 190, 180, 80, 70, 190], '#d9a066', '#fff', 3);
      G.circ(c, 180, 190, 40, '#8ce99a', false);
      bigText(c, 'ホームラン', 180, 30, 16, '#ffd43b');
      G.circ(c, 180, 90, 10, '#e9c46a');
      G.poly(c, [170, 300, 190, 300, 190, 310, 180, 318, 170, 310], '#fff', OL, 2);
      if (s.ph === 'pitch') G.circ(c, s.bx, s.by, 7, '#fff', OL, 2);
      if (s.ph === 'hit' && s.fly) G.circ(c, s.fly.x, s.fly.y, 7, '#fff', OL, 2);
      c.save(); c.translate(210, 300); c.rotate(s.swing ? -1.6 + s.swing * 5 : -0.5);
      G.rect(c, -6, -70, 12, 70, '#a9743a', 6); c.restore();
    }
  };

  /* ---- 色えんぴつ ---- */
  const PEN = ['#fa5252', '#fab005', '#40c057', '#228be6', '#7950f2', '#f783ac', '#495057'];
  TYPES.draw = {
    hint: 'したの いろを えらんで、ゆびで じゆうに かこう',
    init(s) { s.lines = []; s.col = PEN[0]; s.cur = null; },
    down(s, x, y) {
      if (y > 312) {
        const i = Math.floor((x - 10) / 44);
        if (i >= 0 && i < PEN.length) { s.col = PEN[i]; Snd.tap(); }
        else if (x > 318) { s.lines = []; Snd.noise(0.2, { freq: 1200, q: 1, vol: 0.15 }); }
        return;
      }
      s.cur = { col: s.col, pts: [x, y] }; s.lines.push(s.cur);
    },
    move(s, x, y) { if (s.cur && y < 312) { s.cur.pts.push(x, y); if (Math.random() < 0.1) Snd.noise(0.04, { freq: 3000, q: 2, vol: 0.03 }); } },
    up(s) { s.cur = null; },
    tick() {},
    draw(c, s) {
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      s.lines.forEach(l => {
        c.beginPath(); c.moveTo(l.pts[0], l.pts[1]);
        for (let i = 2; i < l.pts.length; i += 2) c.lineTo(l.pts[i], l.pts[i + 1]);
        if (l.pts.length === 2) c.lineTo(l.pts[0] + 0.1, l.pts[1]);
        c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = l.col; c.stroke();
      });
      c.fillStyle = '#f1f3f5'; c.fillRect(0, 312, W, 48);
      PEN.forEach((p, i) => G.circ(c, 32 + i * 44, 336, s.col === p ? 18 : 14, p, s.col === p ? OL : false, 3));
      bigText(c, 'けす', 338, 336, 14);
      if (!s.lines.length) bigText(c, 'ここに かいてね', 180, 160, 20, '#adb5bd');
    }
  };

  /* ---- うごかす しくみ ---- */
  function loop(t) {
    if (!st) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    const T = TYPES[st.toy.play];
    T.tick(st, dt);
    cx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.lineJoin = 'round';
    T.draw(cx, st);
    raf = requestAnimationFrame(loop);
  }
  function xy(e) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  function onDown(e) { if (!st) return; e.preventDefault(); Snd.unlock(); ptr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* なくても よい */ } const T = TYPES[st.toy.play]; if (T.down) T.down(st, ...xy(e)); }
  function onMove(e) { if (!st || ptr !== e.pointerId) return; e.preventDefault(); const T = TYPES[st.toy.play]; if (T.move) T.move(st, ...xy(e)); }
  function onUp(e) { if (!st || ptr !== e.pointerId) return; ptr = null; const T = TYPES[st.toy.play]; if (T.up) T.up(st, ...xy(e)); }

  function open(toyObj, canvas, say) {
    close();
    cv = canvas; cx = cv.getContext('2d'); sayCb = say;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = cv.getBoundingClientRect().width || 360;
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    reset(toyObj);
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
    return TYPES[toyObj.play].hint;
  }
  function reset(toyObj) {
    const t = toyObj || st.toy;
    st = { toy: t, say: m => sayCb && sayCb(m) };
    TYPES[t.play].init(st);
    sayCb && sayCb(TYPES[t.play].hint);
  }
  function close() {
    cancelAnimationFrame(raf);
    if (cv) {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onUp);
    }
    st = null;
  }
  return { open, close, reset: () => st && reset(), TYPES };
})();
