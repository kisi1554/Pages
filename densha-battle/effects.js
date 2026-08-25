'use strict';

/*
 * ド派手な えんしゅつ エンジン
 *
 * がめん いっぱいに かぶせた <canvas> に、はじける ひかり・しょうげきは・
 * いなずま・しゅうちゅうせん・かみふぶき を えがく。
 * がめんの ゆれ(シェイク)と まっしろ フラッシュ、ダメージの すうじも ここ。
 *
 * つかいかた:
 *   Fx.init(canvas, shakeTarget, textLayer);
 *   Fx.burst(x, y, { colors: ['#fff'], count: 60 });
 *   Fx.shake(18, 400);
 */

const Fx = (function createFx() {
  let canvas = null;
  let g = null;
  let shakeEl = null;
  let textLayer = null;
  let dpr = 1;
  let w = 0;
  let h = 0;

  let items = [];
  let running = false;
  let lastT = 0;

  let shakePower = 0;
  let shakeUntil = 0;
  let reduceMotion = false;
  let clipEl = null;

  function init(canvasEl, shakeTarget, layerEl) {
    canvas = canvasEl;
    g = canvas.getContext('2d');
    shakeEl = shakeTarget;
    textLayer = layerEl;
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotion = mq.matches;
      if (mq.addEventListener) mq.addEventListener('change', (e) => { reduceMotion = e.matches; });
    }
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /*
   * つぶを えがく はんいを この えれめんとの 中だけに かぎる。
   * バトル中は アリーナだけに して、下の こたえボタンが よみにくく ならないように する。
   * null で かいじょ。
   */
  function setClip(node) {
    clipEl = node || null;
  }

  /* えれめんとの まんなかの ざひょう(がめん きじゅん) */
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function ensureLoop() {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  /* --------------------------- パーティクルを ふやす --------------------------- */

  /* はじける ひかり(こうげきの ヒット) */
  function burst(x, y, opts) {
    const o = opts || {};
    const colors = o.colors || ['#ffe066', '#ff922b', '#ffffff'];
    const count = reduceMotion ? Math.round((o.count || 48) / 3) : (o.count || 48);
    const power = o.power || 1;
    for (let i = 0; i < count; i += 1) {
      const ang = rnd(0, Math.PI * 2);
      const sp = rnd(180, 900) * power;
      items.push({
        kind: 'spark',
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: rnd(0.35, 0.95),
        age: 0,
        size: rnd(2, 7) * power,
        color: colors[i % colors.length],
        grav: o.grav === undefined ? 900 : o.grav,
        trail: true,
      });
    }
    ensureLoop();
  }

  /* えもじが とびちる(キャラごとの きらきら) */
  function emojiBurst(x, y, emoji, count) {
    const n = reduceMotion ? 4 : (count || 12);
    for (let i = 0; i < n; i += 1) {
      const ang = rnd(-Math.PI, 0);
      const sp = rnd(200, 620);
      items.push({
        kind: 'emoji',
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: rnd(0.7, 1.3),
        age: 0,
        size: rnd(22, 44),
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-8, 8),
        text: emoji,
        grav: 900,
      });
    }
    ensureLoop();
  }

  /* しょうげきは(ひろがる わっか) */
  function ring(x, y, color, maxR, width) {
    items.push({
      kind: 'ring',
      x, y,
      life: 0.55,
      age: 0,
      maxR: maxR || 320,
      color: color || '#ffffff',
      width: width || 10,
    });
    ensureLoop();
  }

  /* まっしろの ばくはつ(ひろがって きえる まる) */
  function disc(x, y, color, maxR) {
    items.push({
      kind: 'disc',
      x, y,
      life: 0.35,
      age: 0,
      maxR: maxR || 220,
      color: color || 'rgba(255,255,255,0.9)',
    });
    ensureLoop();
  }

  /* しゅうちゅうせん(まんがの あれ) */
  function focusLines(x, y, color, count) {
    if (reduceMotion) return;
    const n = count || 44;
    for (let i = 0; i < n; i += 1) {
      const ang = (Math.PI * 2 * i) / n + rnd(-0.05, 0.05);
      items.push({
        kind: 'focus',
        x, y,
        ang,
        life: rnd(0.35, 0.6),
        age: 0,
        inner: rnd(60, 200),
        len: rnd(240, 900),
        width: rnd(4, 18),
        color: color || 'rgba(255,255,255,0.85)',
      });
    }
    ensureLoop();
  }

  /* スピードせん(よこに ながれる せん) */
  function speedLines(dir, color, count) {
    if (reduceMotion) return;
    const n = count || 26;
    for (let i = 0; i < n; i += 1) {
      items.push({
        kind: 'speed',
        x: dir > 0 ? rnd(-400, w) : rnd(0, w + 400),
        y: rnd(0, h),
        vx: dir * rnd(2200, 4200),
        len: rnd(80, 320),
        life: rnd(0.25, 0.5),
        age: 0,
        width: rnd(2, 6),
        color: color || 'rgba(255,255,255,0.7)',
      });
    }
    ensureLoop();
  }

  /* いなずま(2てんを ギザギザで つなぐ) */
  function bolt(x1, y1, x2, y2, color, width) {
    const segs = 14;
    const pts = [];
    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      const jitter = i === 0 || i === segs ? 0 : rnd(-38, 38);
      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;
      pts.push({
        x: x1 + (x2 - x1) * t + (nx / len) * jitter,
        y: y1 + (y2 - y1) * t + (ny / len) * jitter,
      });
    }
    items.push({
      kind: 'bolt',
      pts,
      life: 0.22,
      age: 0,
      color: color || '#ffffff',
      width: width || 7,
    });
    ensureLoop();
  }

  /* ぶっとい ひかりの ビーム(2てんを つらぬく) */
  function beam(x1, y1, x2, y2, color, width) {
    items.push({
      kind: 'beam',
      x1, y1, x2, y2,
      life: 0.3,
      age: 0,
      width: width || 26,
      color: color || '#ffffff',
    });
    ensureLoop();
  }

  /* がめんを よこぎる きりさき(ざしゅっ) */
  function slash(x, y, color, len, ang) {
    items.push({
      kind: 'slash',
      x, y,
      ang: ang === undefined ? rnd(-0.9, -0.3) : ang,
      len: len || 420,
      life: 0.26,
      age: 0,
      color: color || '#ffffff',
    });
    ensureLoop();
  }

  /* かみふぶき(かち の おいわい) */
  function confetti(count) {
    const colors = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ffa94d'];
    const n = reduceMotion ? 30 : (count || 160);
    for (let i = 0; i < n; i += 1) {
      items.push({
        kind: 'confetti',
        x: rnd(0, w),
        y: rnd(-h * 0.5, 0),
        vx: rnd(-90, 90),
        vy: rnd(120, 420),
        life: rnd(2.2, 4.0),
        age: 0,
        size: rnd(7, 15),
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-9, 9),
        color: colors[i % colors.length],
      });
    }
    ensureLoop();
  }

  /* --------------------------- がめんの ゆれ / フラッシュ --------------------------- */

  let zoomPower = 0;
  let zoomUntil = 0;

  /* がめんが ぐいっと よる(ヒットの ときの インパクト) */
  function zoom(power, ms) {
    if (!shakeEl || reduceMotion) return;
    zoomPower = Math.max(zoomPower, power);
    zoomUntil = Math.max(zoomUntil, performance.now() + ms);
    ensureLoop();
  }

  function shake(power, ms) {
    if (!shakeEl) return;
    if (reduceMotion) return;
    shakePower = Math.max(shakePower, power);
    shakeUntil = Math.max(shakeUntil, performance.now() + ms);
    ensureLoop();
  }

  function flash(color, ms) {
    if (!textLayer) return;
    const div = document.createElement('div');
    div.className = 'fx-flash';
    div.style.background = color || '#fff';
    div.style.animationDuration = (ms || 260) + 'ms';
    textLayer.appendChild(div);
    setTimeout(() => div.remove(), (ms || 260) + 60);
  }

  /* --------------------------- もじの えんしゅつ --------------------------- */

  /* ダメージの すうじ が ぼこっと でて とんでいく */
  function damage(x, y, value, kind) {
    if (!textLayer) return;
    const div = document.createElement('div');
    div.className = 'fx-damage' + (kind ? ' is-' + kind : '');
    div.textContent = value;
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    textLayer.appendChild(div);
    setTimeout(() => div.remove(), 1200);
  }

  /* 「どっかーん!」みたいな かけごえ */
  function shout(text, kind, x, y) {
    if (!textLayer) return null;
    const div = document.createElement('div');
    div.className = 'fx-shout' + (kind ? ' is-' + kind : '');
    div.textContent = text;
    if (x !== undefined) {
      div.style.left = x + 'px';
      div.style.top = y + 'px';
      div.classList.add('is-placed');
    }
    textLayer.appendChild(div);
    setTimeout(() => div.remove(), 1400);
    return div;
  }

  /* ひっさつわざの バナー(よこから ずばっと) */
  function banner(text, color) {
    if (!textLayer) return;
    const div = document.createElement('div');
    div.className = 'fx-banner';
    div.style.setProperty('--banner-color', color || '#ffd43b');
    div.textContent = text;
    textLayer.appendChild(div);
    setTimeout(() => div.remove(), 1600);
  }

  function clear() {
    items = [];
    shakePower = 0;
    shakeUntil = 0;
    zoomPower = 0;
    zoomUntil = 0;
    if (shakeEl) shakeEl.style.transform = '';
    if (textLayer) textLayer.innerHTML = '';
    if (g) g.clearRect(0, 0, w, h);
  }

  /* --------------------------- えがく --------------------------- */

  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    g.clearRect(0, 0, w, h);

    let clipped = false;
    if (clipEl) {
      const r = clipEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        g.save();
        g.beginPath();
        g.rect(r.left, r.top, r.width, r.height);
        g.clip();
        clipped = true;
      }
    }

    for (let i = items.length - 1; i >= 0; i -= 1) {
      const p = items[i];
      p.age += dt;
      if (p.age >= p.life) {
        items.splice(i, 1);
        continue;
      }
      const t = p.age / p.life;
      const fade = 1 - t;

      if (p.kind === 'spark') {
        p.vy += p.grav * dt;
        const px = p.x;
        const py = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineWidth = p.size * fade;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(p.x, p.y);
        g.stroke();
      } else if (p.kind === 'emoji') {
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        g.globalAlpha = fade;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.font = p.size + 'px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(p.text, 0, 0);
        g.restore();
      } else if (p.kind === 'ring') {
        const r = p.maxR * (1 - Math.pow(1 - t, 2));
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineWidth = p.width * fade;
        g.beginPath();
        g.arc(p.x, p.y, r, 0, Math.PI * 2);
        g.stroke();
      } else if (p.kind === 'disc') {
        const r = p.maxR * (1 - Math.pow(1 - t, 3));
        g.globalAlpha = fade * 0.9;
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, r, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'focus') {
        const inner = p.inner * (1 + t * 1.6);
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineWidth = p.width;
        g.beginPath();
        g.moveTo(p.x + Math.cos(p.ang) * inner, p.y + Math.sin(p.ang) * inner);
        g.lineTo(p.x + Math.cos(p.ang) * (inner + p.len), p.y + Math.sin(p.ang) * (inner + p.len));
        g.stroke();
      } else if (p.kind === 'speed') {
        p.x += p.vx * dt;
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineWidth = p.width;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - Math.sign(p.vx) * p.len, p.y);
        g.stroke();
      } else if (p.kind === 'bolt') {
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineWidth = p.width;
        g.lineJoin = 'round';
        g.shadowColor = p.color;
        g.shadowBlur = 18;
        g.beginPath();
        g.moveTo(p.pts[0].x, p.pts[0].y);
        for (let k = 1; k < p.pts.length; k += 1) g.lineTo(p.pts[k].x, p.pts[k].y);
        g.stroke();
        g.shadowBlur = 0;
      } else if (p.kind === 'beam') {
        /* しろい しんと、そとがわの いろ。ふとさが きゅうげきに ほそくなる */
        const wpx = p.width * Math.pow(fade, 0.6);
        g.globalAlpha = fade;
        g.lineCap = 'round';
        g.shadowColor = p.color;
        g.shadowBlur = 26;
        g.strokeStyle = p.color;
        g.lineWidth = wpx;
        g.beginPath();
        g.moveTo(p.x1, p.y1);
        g.lineTo(p.x2, p.y2);
        g.stroke();
        g.strokeStyle = '#ffffff';
        g.lineWidth = Math.max(2, wpx * 0.45);
        g.beginPath();
        g.moveTo(p.x1, p.y1);
        g.lineTo(p.x2, p.y2);
        g.stroke();
        g.shadowBlur = 0;
      } else if (p.kind === 'slash') {
        const grow = Math.min(1, t * 2.4);
        const half = (p.len / 2) * grow;
        const dx = Math.cos(p.ang) * half;
        const dy = Math.sin(p.ang) * half;
        g.globalAlpha = fade;
        g.strokeStyle = p.color;
        g.lineCap = 'round';
        g.shadowColor = p.color;
        g.shadowBlur = 20;
        g.lineWidth = 16 * fade;
        g.beginPath();
        g.moveTo(p.x - dx, p.y - dy);
        g.lineTo(p.x + dx, p.y + dy);
        g.stroke();
        g.shadowBlur = 0;
      } else if (p.kind === 'confetti') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        g.globalAlpha = Math.min(1, fade * 2);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      }
    }
    g.globalAlpha = 1;
    if (clipped) g.restore();

    /* がめんの ゆれ と ズーム */
    if (shakeEl) {
      const shaking = now < shakeUntil;
      const zooming = now < zoomUntil;
      if (shaking || zooming) {
        let tf = '';
        if (shaking) {
          const left = (shakeUntil - now) / 400;
          const amp = shakePower * Math.min(1, left);
          tf += 'translate(' + rnd(-amp, amp).toFixed(1) + 'px,' + rnd(-amp, amp).toFixed(1) + 'px)' +
            ' rotate(' + rnd(-amp * 0.08, amp * 0.08).toFixed(2) + 'deg)';
        }
        if (zooming) {
          const zl = (zoomUntil - now) / 260;
          tf += ' scale(' + (1 + zoomPower * Math.min(1, zl)).toFixed(4) + ')';
        }
        shakeEl.style.transform = tf;
      } else if (shakePower !== 0 || zoomPower !== 0) {
        shakePower = 0;
        zoomPower = 0;
        shakeEl.style.transform = '';
      }
    }

    if (items.length === 0 && shakePower === 0 && zoomPower === 0) {
      running = false;
      return;
    }
    requestAnimationFrame(loop);
  }

  return {
    init,
    resize,
    setClip,
    centerOf,
    burst,
    emojiBurst,
    ring,
    disc,
    focusLines,
    speedLines,
    bolt,
    beam,
    slash,
    confetti,
    shake,
    zoom,
    flash,
    damage,
    shout,
    banner,
    clear,
  };
})();
