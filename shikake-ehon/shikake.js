'use strict';

/*
 * しかけ の しくみ。
 *  Shikake.setup(page, env) → { required, hot(), hints(), resize(), destroy(), auto() }
 *
 *  env = {
 *    svg, art,            // え の SVG と、それを つつむ ばしょ
 *    toV(cx, cy),         // がめん の ざひょう → え の ざひょう（800×700）
 *    toC(vx, vy),         // え の ざひょう → がめん の ざひょう
 *    canvas(), fit(cv),   // こする・てらす よう の canvas と、え の ざひょう へ あわせる 行列
 *    onTap(fn),           // タップ できる もの を さわった とき
 *    uiButton(label, fn), // え の うえ に だす ボタン（iPhone の かたむけ きょか）
 *    sfx(name), interacted(), done()
 *  }
 *  hot()  : うっすら ひからせる ばしょ（え の ざひょう {x, y, r}）
 *  hints(): 3びょう さわらないと きらきら する ばしょ
 *  auto() : じどう テスト よう（がめん の ざひょう で どこを さわれば いいか）
 */
const Shikake = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function spotOf(env, el) {
    const r = el.getBoundingClientRect();
    const c = env.toV(r.left + r.width / 2, r.top + r.height / 2);
    const e = env.toV(r.right, r.bottom);
    return { x: c.x, y: c.y, r: clamp(Math.hypot(e.x - c.x, e.y - c.y) * 0.8, 40, 170) };
  }
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ゆび で ひっぱる・なぞる: art で おして、window で うごき を おう */
  function drag(env, h) {
    let id = null;
    const move = (e) => {
      if (e.pointerId !== id) return;
      if (h.move) h.move(env.toV(e.clientX, e.clientY), e);
    };
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (h.end) h.end();
    };
    const down = (e) => {
      if (id !== null || (e.button && e.button > 0)) return;
      const v = env.toV(e.clientX, e.clientY);
      if (h.start && h.start(v, e) === false) return;
      id = e.pointerId;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };
    env.art.addEventListener('pointerdown', down);
    return () => {
      env.art.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }

  const KINDS = {};

  /* ---------- タップ（need が あれば ぜんぶ さわると クリア） ---------- */
  KINDS.tap = (cfg, env) => {
    const need = cfg.need || null;
    const got = new Set();
    const off = env.onTap((key) => {
      if (!key) return;
      got.add(key);
      if (cfg.onTap) cfg.onTap(env.svg, key, got);
      if (need && need.every((k) => got.has(k))) env.done();
    });
    const els = () => [...env.svg.querySelectorAll('[data-tap]')];
    const todo = () => (need
      ? els().filter((el) => need.includes(el.dataset.key) && !got.has(el.dataset.key))
      : els().filter((el) => !el.classList.contains('on')).slice(0, 4));
    return {
      required: !!need,
      hot: () => todo().map((el) => spotOf(env, el)),
      hints: () => todo().map((el) => spotOf(env, el)),
      destroy: off,
      auto: () => ({ kind: 'tap', points: need ? todo().map(centerOf) : [] }),
    };
  };

  /* ---------- めくる ---------- */
  KINDS.flip = (cfg, env) => {
    const flaps = [...env.svg.querySelectorAll('[data-flip]')];
    let solved = false;
    const onClick = (e) => {
      const f = e.currentTarget;
      if (f.classList.contains('open')) return;
      f.classList.add('open');
      env.interacted();
      env.sfx(f.querySelector('.lift-leaves') ? 'rustle' : 'flip');
      if (f.dataset.flip === cfg.target && !solved) {
        solved = true;
        setTimeout(() => {
          if (cfg.finish) cfg.finish(env.svg);
          env.sfx('sparkle');
          env.done();
        }, 550);
      } else {
        setTimeout(() => env.sfx('pop'), 380);
      }
    };
    flaps.forEach((f) => f.addEventListener('click', onClick));
    const closed = () => (solved ? [] : flaps.filter((f) => !f.classList.contains('open')));
    return {
      required: true,
      hot: () => closed().map((f) => spotOf(env, f)),
      hints: () => closed().map((f) => spotOf(env, f)),
      destroy: () => flaps.forEach((f) => f.removeEventListener('click', onClick)),
      auto: () => {
        const list = closed();
        list.sort((a, b) => (a.dataset.flip === cfg.target) - (b.dataset.flip === cfg.target));
        return { kind: 'flip', points: list.map(centerOf) };
      },
    };
  };

  /* ---------- ひっぱる ---------- */
  KINDS.pull = (cfg, env) => {
    const tab = env.svg.querySelector('[data-pull]');
    const D = cfg.dist || 300;
    let p = 0;
    let solved = false;
    let raf = 0;
    let sx = 0;
    let sp = 0;
    let step = 0;
    const set = (v) => {
      p = v;
      tab.style.transform = `translateX(${p * D}px)`;
      if (cfg.progress) cfg.progress(env.svg, p);
    };
    const finish = () => {
      if (solved) return;
      solved = true;
      cancelAnimationFrame(raf);
      set(1);
      tab.classList.add('done');
      if (cfg.finish) cfg.finish(env.svg);
      env.sfx(cfg.endSound || 'whistle');
      env.done();
    };
    const back = () => {
      const from = p;
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 320);
        set(from * (1 - k) * (1 - k));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const off = drag(env, {
      start(v, e) {
        if (solved) return false;
        const box = tab.getBoundingClientRect();
        const c = env.toV(box.left + box.width / 2, box.top + box.height / 2);
        if (!tab.contains(e.target) && dist(v, c) > 110) return false;
        cancelAnimationFrame(raf);
        sx = v.x;
        sp = p;
        env.interacted();
        return true;
      },
      move(v) {
        if (solved) return;
        const np = clamp(sp + (v.x - sx) / D, 0, 1);
        set(np);
        const s = Math.floor(np * 10);
        if (s !== step) {
          step = s;
          env.sfx(cfg.sound || 'ratchet');
        }
        if (np >= 0.97) finish();
      },
      end() {
        if (solved) return;
        if (p > 0.85) finish();
        else back();
      },
    });
    return {
      required: true,
      hot: () => (solved ? [] : [spotOf(env, tab)]),
      hints: () => (solved ? [] : [spotOf(env, tab)]),
      destroy: () => {
        off();
        cancelAnimationFrame(raf);
      },
      auto: () => {
        const c = centerOf(tab);
        const a = env.toC(0, 0);
        const b = env.toC(D, 0);
        return { kind: 'pull', from: c, dx: (b.x - a.x) * 1.05 };
      },
    };
  };

  /* ---------- こする（くもった まど） ---------- */
  KINDS.rub = (cfg, env) => {
    const [rx, ry, rw, rh] = cfg.rect;
    const cv = env.canvas();
    const g = cv.getContext('2d');
    const COLS = 14;
    const ROWS = 9;
    const grid = new Uint8Array(COLS * ROWS);
    const R = 46;
    const strokes = [];
    let curStroke = null;
    let solved = false;
    let lastSfx = 0;
    let m = [1, 1, 0, 0];

    const drops = [];
    const rr = Art.rand(5);
    for (let i = 0; i < 40; i += 1) drops.push([rx + rr() * rw, ry + rr() * rh, 2 + rr() * 5]);

    function fog() {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(m[0], 0, 0, m[1], m[2], m[3]);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(233, 239, 245, 0.97)';
      g.beginPath();
      if (g.roundRect) g.roundRect(rx, ry, rw, rh, 10);
      else g.rect(rx, ry, rw, rh);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      drops.forEach(([x, y, r]) => {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      });
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = R * 2;
      strokes.forEach((s) => {
        g.beginPath();
        g.moveTo(s[0].x, s[0].y);
        s.forEach((q) => g.lineTo(q.x + 0.01, q.y));
        g.stroke();
      });
      g.globalCompositeOperation = 'source-over';
    }
    function paint() {
      m = env.fit(cv);
      fog();
    }
    function mark(v) {
      for (let j = 0; j < ROWS; j += 1) {
        for (let i = 0; i < COLS; i += 1) {
          const cx = rx + (i + 0.5) * (rw / COLS);
          const cy = ry + (j + 0.5) * (rh / ROWS);
          if (Math.hypot(cx - v.x, cy - v.y) < R + 6) grid[j * COLS + i] = 1;
        }
      }
    }
    function seg(a, b) {
      g.setTransform(m[0], 0, 0, m[1], m[2], m[3]);
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      g.lineWidth = R * 2;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x + 0.01, b.y);
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    function check() {
      let n = 0;
      for (let i = 0; i < grid.length; i += 1) n += grid[i];
      if (!solved && n / grid.length >= (cfg.need || 0.5)) {
        solved = true;
        cv.classList.add('fade');
        if (cfg.finish) cfg.finish(env.svg);
        env.sfx('sparkle');
        env.done();
      }
    }
    paint();
    const off = drag(env, {
      start(v) {
        if (solved || v.x < rx - 30 || v.x > rx + rw + 30 || v.y < ry - 30 || v.y > ry + rh + 30) return false;
        curStroke = [v];
        strokes.push(curStroke);
        seg(v, v);
        mark(v);
        env.interacted();
        return true;
      },
      move(v) {
        if (solved || !curStroke) return;
        const last = curStroke[curStroke.length - 1];
        if (dist(v, last) < 3) return;
        curStroke.push(v);
        seg(last, v);
        mark(v);
        const t = performance.now();
        if (t - lastSfx > 110) {
          lastSfx = t;
          env.sfx('squeak');
        }
        check();
      },
      end() {
        curStroke = null;
        check();
      },
    });
    const spot = { x: rx + rw / 2, y: ry + rh / 2, r: 150 };
    return {
      required: true,
      hot: () => (solved ? [] : [spot]),
      hints: () => (solved ? [] : [{ x: rx + rw * 0.3, y: ry + rh * 0.4, r: 60 }, { x: rx + rw * 0.7, y: ry + rh * 0.6, r: 60 }]),
      resize: paint,
      destroy: off,
      auto: () => ({ kind: 'rub', tl: env.toC(rx, ry), br: env.toC(rx + rw, ry + rh) }),
    };
  };

  /* ---------- てらす（かいちゅうでんとう） ---------- */
  KINDS.light = (cfg, env) => {
    const cv = env.canvas();
    const g = cv.getContext('2d');
    const R = cfg.radius || 120;
    const found = new Set();
    let pos = { x: cfg.start[0], y: cfg.start[1] };
    let solved = false;
    let m = [1, 1, 0, 0];
    let raf = 0;

    function hole(x, y, r, a) {
      const gr = g.createRadialGradient(x, y, r * 0.15, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.65, `rgba(0,0,0,${a * 0.85})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    function draw() {
      raf = 0;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(m[0], 0, 0, m[1], m[2], m[3]);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(6, 8, 28, 0.965)';
      g.fillRect(-100, -100, 1000, 900);
      g.globalCompositeOperation = 'destination-out';
      hole(pos.x, pos.y, R, 1);
      cfg.targets.forEach((t) => {
        if (found.has(t.id)) hole(t.x, t.y, t.r * 1.3, 0.75);
      });
      g.globalCompositeOperation = 'source-over';
      const warm = g.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, R);
      warm.addColorStop(0, 'rgba(255,230,140,0.16)');
      warm.addColorStop(1, 'rgba(255,230,140,0)');
      g.fillStyle = warm;
      g.beginPath();
      g.arc(pos.x, pos.y, R, 0, Math.PI * 2);
      g.fill();
    }
    function paint() {
      m = env.fit(cv);
      draw();
    }
    function queue() {
      if (!raf) raf = requestAnimationFrame(draw);
    }
    function check() {
      cfg.targets.forEach((t) => {
        if (found.has(t.id) || Math.hypot(pos.x - t.x, pos.y - t.y) > t.r + 30) return;
        found.add(t.id);
        env.svg.querySelector(`[data-light="${t.id}"]`)?.classList.add('lit');
        env.sfx('sparkle');
        env.interacted();
      });
      if (!solved && cfg.need.every((k) => found.has(k))) {
        solved = true;
        if (cfg.finish) cfg.finish(env.svg);
        setTimeout(() => cv.classList.add('fade'), 500);
        env.done();
      }
    }
    const at = (e) => {
      if (solved) return;
      pos = env.toV(e.clientX, e.clientY);
      queue();
      check();
    };
    const onDown = (e) => {
      at(e);
      env.interacted();
    };
    env.art.addEventListener('pointermove', at);
    env.art.addEventListener('pointerdown', onDown);
    paint();
    const todo = () => cfg.targets.filter((t) => cfg.need.includes(t.id) && !found.has(t.id));
    return {
      required: true,
      hot: () => [],
      hints: () => (solved ? [] : [{ x: pos.x, y: pos.y, r: 50 }, ...todo().map((t) => ({ x: t.x, y: t.y, r: 40 }))]),
      resize: paint,
      destroy: () => {
        env.art.removeEventListener('pointermove', at);
        env.art.removeEventListener('pointerdown', onDown);
        cancelAnimationFrame(raf);
      },
      auto: () => ({ kind: 'light', points: cfg.targets.map((t) => env.toC(t.x, t.y)) }),
    };
  };

  /* ---------- かたむける／ゆらす（ふね） ---------- */
  KINDS.rock = (cfg, env) => {
    const boat = env.svg.querySelector('[data-rock]');
    const mover = env.svg.querySelector('#boatmove');
    const need = cfg.need || 6;
    let tilt = 0;
    let side = 0;
    let count = 0;
    let solved = false;
    let raf = 0;
    let sx = 0;
    const apply = () => {
      boat.style.transform = `rotate(${(tilt * 0.8).toFixed(1)}deg)`;
      mover.style.transform = `translateX(${(count / need) * (cfg.travel || 440)}px)`;
    };
    const finish = () => {
      solved = true;
      tilt = 0;
      apply();
      env.sfx('ok');
      env.done();
    };
    const feed = (a) => {
      if (solved) return;
      tilt = clamp(a, -30, 30);
      const s = tilt > 10 ? 1 : tilt < -10 ? -1 : 0;
      if (s && s !== side) {
        if (side !== 0) {
          count += 1;
          env.sfx('wave');
          env.interacted();
          if (count >= need) {
            finish();
            return;
          }
        }
        side = s;
      }
      apply();
    };
    const ease = () => {
      cancelAnimationFrame(raf);
      const tick = () => {
        tilt *= 0.85;
        apply();
        if (Math.abs(tilt) > 0.5) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const onOri = (e) => {
      if (e.gamma == null) return;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      let a = e.gamma;
      if (ang === 90) a = e.beta;
      else if (ang === -90 || ang === 270) a = -e.beta;
      feed(a);
    };
    window.addEventListener('deviceorientation', onOri);
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      env.uiButton('📱 かたむけて あそぶ', (btn) => {
        DeviceOrientationEvent.requestPermission().then((r) => {
          if (r === 'granted') btn.remove();
        }).catch(() => btn.remove());
      });
    }
    const off = drag(env, {
      start(v) {
        if (solved) return false;
        cancelAnimationFrame(raf);
        sx = v.x;
        env.interacted();
        return true;
      },
      move(v) {
        feed((v.x - sx) / 3);
      },
      end() {
        ease();
      },
    });
    apply();
    return {
      required: true,
      hot: () => (solved ? [] : [spotOf(env, boat)]),
      hints: () => (solved ? [] : [spotOf(env, boat)]),
      destroy: () => {
        off();
        window.removeEventListener('deviceorientation', onOri);
        cancelAnimationFrame(raf);
      },
      auto: () => ({ kind: 'rock', center: env.toC(400, 420), dx: env.toC(150, 0).x - env.toC(0, 0).x }),
    };
  };

  /* ---------- なぞる（かぜ を おこす） ---------- */
  KINDS.wind = (cfg, env) => {
    const NS = 'http://www.w3.org/2000/svg';
    const trail = document.createElementNS(NS, 'g');
    trail.setAttribute('pointer-events', 'none');
    env.svg.appendChild(trail);
    let total = 0;
    let last = null;
    let solved = false;
    let lastSfx = 0;
    const cue = env.svg.querySelector('.cue');
    const add = (a, b) => {
      const ln = document.createElementNS(NS, 'path');
      ln.setAttribute('d', `M${a.x.toFixed(0)} ${a.y.toFixed(0)} L${b.x.toFixed(0)} ${b.y.toFixed(0)}`);
      ln.setAttribute('class', 'trail');
      trail.appendChild(ln);
      setTimeout(() => ln.remove(), 800);
    };
    const off = drag(env, {
      start(v) {
        if (solved) return false;
        last = v;
        if (cue) cue.classList.add('gone');
        env.interacted();
        return true;
      },
      move(v) {
        if (solved || !last) return;
        const d = dist(v, last);
        if (d < 5) return;
        total += Math.min(d, 120);
        add(last, v);
        last = v;
        if (cfg.progress) cfg.progress(env.svg, Math.min(1, total / cfg.need));
        const t = performance.now();
        if (t - lastSfx > 420) {
          lastSfx = t;
          env.sfx('wind');
        }
        if (total >= cfg.need) {
          solved = true;
          if (cfg.finish) cfg.finish(env.svg);
          env.sfx('sparkle');
          env.done();
        }
      },
      end() {
        last = null;
      },
    });
    const spot = () => (cue ? spotOf(env, cue) : { x: 400, y: 300, r: 120 });
    return {
      required: true,
      hot: () => [],
      hints: () => (solved ? [] : [{ x: 150, y: 300, r: 50 }, { x: 400, y: 280, r: 50 }, { x: 650, y: 300, r: 50 }].map((p) => ({ ...p, y: spot().y }))),
      destroy: () => {
        off();
        trail.remove();
      },
      auto: () => ({ kind: 'wind', a: env.toC(120, 300), b: env.toC(680, 300), c: env.toC(400, 120) }),
    };
  };

  /* ---------- えらぶ（わかれみち）: ボタン は app.js が だす ---------- */
  KINDS.choice = () => ({ required: true, hot: () => [], hints: () => [], destroy() {}, auto: () => ({ kind: 'choice' }) });

  function setup(page, env) {
    const cfg = page.shikake || { kind: 'tap' };
    const make = KINDS[cfg.kind] || KINDS.tap;
    const c = make(cfg, env);
    return {
      required: c.required,
      hot: c.hot || (() => []),
      hints: c.hints || (() => []),
      resize: c.resize || (() => {}),
      destroy: c.destroy || (() => {}),
      auto: c.auto || (() => ({})),
    };
  }

  return { setup };
})();
