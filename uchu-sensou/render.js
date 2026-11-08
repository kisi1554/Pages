'use strict';

/*
 * えがく（canvas 2D）。Sim の じょうたい を みて えがく だけ（st は かえない）。
 *   Render.init(canvas) / Render.resize() / Render.frame(st, sticks, dt) / Render.events(st.events)
 *   カメラ は プレイヤー（ふたり なら あいだ）を おいかけ、ふたりが はいる ように すこし ひく。
 */
const Render = (() => {
  let cv = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  const cam = { x: 0, y: -100, s: 1 };
  let parts = [];
  let shake = 0;
  let stars = [];
  const P_COLORS = ['#4dabf7', '#69db7c'];

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    // とおくの ほし（3だん の おくゆき）
    const r = Sim.rng(42);
    stars = [];
    for (let i = 0; i < 260; i += 1) stars.push({ x: r() * 2000, y: r() * 2000, z: 0.2 + r() * 0.6, s: r() < 0.1 ? 2 : 1 });
    resize();
  }

  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }

  function toScreen(x, y) {
    return [(x - cam.x) * cam.s + W / 2, (y - cam.y) * cam.s + H / 2];
  }

  /* ---------------- えんしゅつ（はへん・ひかり） ---------------- */
  function burst(x, y, n, color, speed, life, size) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, color, size: size || 3 });
    }
  }
  function ring(x, y, color, max) {
    parts.push({ ring: true, x, y, r: 10, max: max || 120, life: 0.5, maxLife: 0.5, color });
  }

  function events(list) {
    for (const e of list) {
      switch (e.type) {
        case 'boom':
          burst(e.x, e.y, e.boss ? 60 : 14 + e.size, e.boss ? '#ffd43b' : '#ffa94d', e.boss ? 420 : 220, e.boss ? 1.2 : 0.6, e.boss ? 5 : 3);
          burst(e.x, e.y, 8, '#fff3bf', 120, 0.8, 2);
          if (e.boss) {
            ring(e.x, e.y, '#ffd43b', 400);
            shake = Math.max(shake, 14);
          }
          break;
        case 'hit': burst(e.x, e.y, 3, '#ffe066', 120, 0.25, 2); break;
        case 'spark': burst(e.x, e.y, 3, '#ced4da', 80, 0.25, 2); break;
        case 'clink': burst(e.x, e.y, 5, '#a5d8ff', 160, 0.3, 2); break;
        case 'bomb': ring(e.x, e.y, '#fff', 560); ring(e.x, e.y, '#ffd43b', 480); shake = Math.max(shake, 10); break;
        case 'hurt': burst(e.x, e.y, 10, '#ff8787', 180, 0.5, 3); shake = Math.max(shake, 6); break;
        case 'down': burst(e.x, e.y, 30, '#ff6b6b', 260, 0.9, 4); shake = Math.max(shake, 10); break;
        case 'basehit': shake = Math.max(shake, 4); break;
        case 'pickup': burst(e.x, e.y, 6, e.kind === 'heart' ? '#ff8787' : e.kind === 'ally' ? '#63e6be' : '#ffe066', 90, 0.35, 2); break;
        case 'warp': ring(e.x, e.y, '#b197fc', 150); break;
        case 'respawn': ring(e.x, e.y, '#74c0fc', 100); break;
        default: break;
      }
    }
  }

  /* ---------------- かたち ---------------- */
  function planet(p, st, t) {
    const [x, y] = toScreen(p.x, p.y);
    const r = p.r * cam.s;
    if (x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) return;
    if (p.bh) {
      // ブラックホール: まわる ひかり の わ
      for (let i = 0; i < 3; i += 1) {
        ctx.strokeStyle = `rgba(177,151,252,${0.35 - i * 0.1})`;
        ctx.lineWidth = (6 - i * 1.5) * cam.s + 1;
        ctx.beginPath();
        ctx.ellipse(x, y, r * (2.2 + i * 0.6), r * (0.8 + i * 0.25), t * (0.6 + i * 0.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7048e8';
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    if (p.ring) {
      ctx.strokeStyle = 'rgba(241,209,138,.55)';
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.9, r * 0.55, -0.35, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, p.color);
    gr.addColorStop(1, p.color2 || p.color);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (p.bands) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(150,90,40,.35)';
      for (let i = -3; i <= 3; i += 1) ctx.fillRect(x - r, y + i * r * 0.28, r * 2, r * 0.1);
      ctx.fillStyle = 'rgba(200,80,50,.7)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.3, y + r * 0.35, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (p.home) {
      // りく と うみ と まち の あかり
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#51cf66';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.3, 0.5, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.4, y + r * 0.35, r * 0.35, r * 0.25, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // バリア
      const hp = st.base.hp / st.base.max;
      ctx.strokeStyle = `rgba(116,192,252,${0.25 + hp * 0.55})`;
      ctx.lineWidth = 3 + hp * 4;
      ctx.beginPath();
      ctx.arc(x, y, r + 10 * cam.s + 4, 0, Math.PI * 2);
      ctx.stroke();
      if (st.base.turrets) {
        for (let i = 0; i < st.base.turrets; i += 1) {
          const a = t * 0.8 + i * Math.PI;
          ctx.fillStyle = '#ffd43b';
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 6 * cam.s + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (p.rock) {
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function ship(p, color, t) {
    if (!p.alive) return;
    if (p.inv > 0 && Math.floor(t * 12) % 2 === 0) return;
    const [x, y] = toScreen(p.x, p.y);
    const s = cam.s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.ang + Math.PI / 2);
    // ほのお
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 40) {
      ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffd43b' : '#ff922b';
      ctx.beginPath();
      ctx.moveTo(-6 * s, 14 * s);
      ctx.lineTo(0, (14 + 10 + sp / 30) * s);
      ctx.lineTo(6 * s, 14 * s);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20 * s);
    ctx.lineTo(14 * s, 14 * s);
    ctx.lineTo(0, 8 * s);
    ctx.lineTo(-14 * s, 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e7f5ff';
    ctx.beginPath();
    ctx.arc(0, -4 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // なかま メカ
    for (let i = 0; i < p.allies; i += 1) {
      const a = t * 2 + (i * Math.PI * 2) / p.allies;
      const [ax, ay] = toScreen(p.x + Math.cos(a) * 52, p.y + Math.sin(a) * 52);
      ctx.fillStyle = '#63e6be';
      ctx.beginPath();
      ctx.ellipse(ax, ay, 9 * s + 1, 5 * s + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e6fcf5';
      ctx.beginPath();
      ctx.arc(ax, ay - 3 * s, 4 * s, Math.PI, 0);
      ctx.fill();
    }
  }

  function enemy(e, t) {
    const [x, y] = toScreen(e.x, e.y);
    const r = e.r * cam.s;
    if (x < -r * 2 || x > W + r * 2 || y < -r * 2 || y > H + r * 2) return;
    const d = e.def;
    ctx.save();
    ctx.translate(x, y);
    const col = e.flash > 0 ? '#ffffff' : d.color;
    if (d.kind === 'boss') {
      ctx.rotate(t * 0.4);
      ctx.fillStyle = '#495057';
      for (let i = 0; i < 8; i += 1) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r * 0.12, -r * 1.25, r * 0.24, r * 0.4);
      }
      ctx.rotate(-t * 0.4 - Math.PI * 2);
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = '#212529';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (d.kind === 'rush' && e.type === 'rock') {
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * Math.PI * 2;
        const rr = r * (0.85 + ((i * 37) % 7) / 30);
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(rr, 0);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    // め（ロボット）
    const look = e.ang;
    ctx.fillStyle = '#fff';
    const er = Math.max(2, r * 0.28);
    for (const side of [-1, 1]) {
      const ex = Math.cos(look) * r * 0.35 + Math.cos(look + Math.PI / 2) * side * r * 0.32;
      const ey = Math.sin(look) * r * 0.35 + Math.sin(look + Math.PI / 2) * side * r * 0.32;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#212529';
      ctx.beginPath();
      ctx.arc(ex + Math.cos(look) * er * 0.4, ey + Math.sin(look) * er * 0.4, er * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
    }
    // たて
    if (d.kind === 'shield') {
      ctx.strokeStyle = '#d0ebff';
      ctx.lineWidth = 5 * cam.s + 1;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7 * cam.s, look - 1.0, look + 1.0);
      ctx.stroke();
    }
    ctx.restore();
    if (d.kind === 'boss') {
      const w = r * 2;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(x - w / 2, y - r - 22, w, 8);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(x - w / 2, y - r - 22, w * Math.max(0, e.hp / d.hp), 8);
    }
  }

  function pickup(k, t) {
    const [x, y] = toScreen(k.x, k.y);
    const s = cam.s;
    if (k.life < 3 && Math.floor(t * 8) % 2) return;
    ctx.save();
    ctx.translate(x, y);
    if (k.kind === 'star') {
      ctx.rotate(t * 3);
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        const rr = (i % 2 ? 4 : 9) * s + 1;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.font = `${Math.round(22 * s + 8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.kind === 'heart' ? '❤️' : '🛸', 0, 0);
    }
    ctx.restore();
  }

  /* ---------------- 1フレーム ---------------- */
  function frame(st, sticks, dt) {
    if (!ctx) return;
    const t = st.t;
    // カメラ
    const alive = st.players.filter((p) => p.alive);
    const focus = alive.length ? alive : [{ x: st.base.x, y: st.base.y - 150 }];
    let cx = 0;
    let cy = 0;
    focus.forEach((p) => { cx += p.x; cy += p.y; });
    cx /= focus.length;
    cy /= focus.length;
    const view = 820;
    let s = Math.min(W, H) / view;
    if (focus.length > 1) {
      const spanX = Math.abs(focus[0].x - focus[1].x) + 360;
      const spanY = Math.abs(focus[0].y - focus[1].y) + 360;
      s = Math.min(s, W / spanX, H / spanY);
    }
    s = Math.max(Math.min(W, H) / 1700, s);
    const k = Math.min(1, dt * 4);
    cam.x += (cx - cam.x) * k;
    cam.y += (cy - cam.y) * k;
    cam.s += (s - cam.s) * k;
    shake = Math.max(0, shake - dt * 30);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(0, 0, W, H);
    // ほしぞら
    for (const p of stars) {
      const x = ((((p.x - cam.x * p.z) % 2000) + 2000) % 2000) * (W / 2000) * 1.0;
      const y = ((((p.y - cam.y * p.z) % 2000) + 2000) % 2000) * (H / 2000) * 1.0;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + p.z})`;
      ctx.fillRect(x, y, p.s, p.s);
    }
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // うちゅう の はし
    const [ox, oy] = toScreen(0, 0);
    ctx.strokeStyle = 'rgba(255,107,107,.35)';
    ctx.setLineDash([10, 12]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, st.R * cam.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    st.planets.forEach((p) => planet(p, st, t));
    st.rocks.forEach((p) => planet(p, st, t));
    st.pickups.forEach((p) => pickup(p, t));

    // たま
    for (const b of st.bullets) {
      const [x, y] = toScreen(b.x, b.y);
      ctx.fillStyle = b.ally ? '#96f2d7' : '#fff3bf';
      ctx.beginPath();
      ctx.arc(x, y, b.r * cam.s + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of st.ebullets) {
      const [x, y] = toScreen(b.x, b.y);
      ctx.fillStyle = '#f783ac';
      ctx.beginPath();
      ctx.arc(x, y, b.r * cam.s + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, b.r * cam.s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    st.enemies.forEach((e) => enemy(e, t));
    st.players.forEach((p, i) => ship(p, P_COLORS[i], t));

    // はへん
    for (const p of parts) {
      p.life -= dt;
      if (p.ring) {
        p.r += (p.max - p.r) * Math.min(1, dt * 6);
        const [x, y] = toScreen(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, p.r * cam.s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      const [x, y] = toScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    parts = parts.filter((p) => p.life > 0);
    if (parts.length > 900) parts.splice(0, parts.length - 900);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offscreen(st);
    radar(st);
    (sticks || []).forEach(stick);
  }

  // がめん の そと の てき → はしっこ に やじるし
  function offscreen(st) {
    const m = 18;
    for (const e of st.enemies) {
      const [x, y] = toScreen(e.x, e.y);
      if (x >= 0 && x <= W && y >= 0 && y <= H) continue;
      const dx = x - W / 2;
      const dy = y - H / 2;
      const k = Math.min((W / 2 - m) / Math.abs(dx || 1), (H / 2 - m) / Math.abs(dy || 1));
      const px = W / 2 + dx * k;
      const py = H / 2 + dy * k;
      const a = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.fillStyle = e.def.kind === 'boss' ? '#ffd43b' : 'rgba(255,107,107,.85)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-6, 7);
      ctx.fill();
      ctx.restore();
    }
  }

  function radar(st) {
    const R = Math.min(64, Math.min(W, H) * 0.12);
    const x = W - R - 12;
    const y = R + 12 + 56;
    const k = R / st.R;
    ctx.fillStyle = 'rgba(11,16,38,.75)';
    ctx.strokeStyle = 'rgba(116,192,252,.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (const p of st.planets) {
      ctx.fillStyle = p.home ? '#4dabf7' : p.bh ? '#9775fa' : '#adb5bd';
      ctx.beginPath();
      ctx.arc(x + p.x * k, y + p.y * k, Math.max(2, p.r * k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff6b6b';
    for (const e of st.enemies) ctx.fillRect(x + e.x * k - 1.5, y + e.y * k - 1.5, e.def.kind === 'boss' ? 6 : 3, e.def.kind === 'boss' ? 6 : 3);
    st.players.forEach((p, i) => {
      if (!p.alive) return;
      ctx.fillStyle = P_COLORS[i];
      ctx.beginPath();
      ctx.arc(x + p.x * k, y + p.y * k, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function stick(s) {
    if (!s || !s.active) return;
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.ox, s.oy, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = s.color || 'rgba(116,192,252,.6)';
    ctx.beginPath();
    ctx.arc(s.ox + s.x * 56, s.oy + s.y * 56, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  return { init, resize, frame, events, cam };
})();
