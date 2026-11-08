'use strict';

/*
 * えがく（canvas 2D）。ばん の ざひょう（x: にし→ひがし、y: きた→みなみ、1マス＝1）で かいて、
 * たて がめん では ばん を 90ど まわす（にし が うえ）。もじ は いつも まっすぐ に かく。
 *   Render.fit(L, w, h, top, bottom) → view / Render.draw(ctx, S, view, ui) / Render.hit(S, view, sx, sy)
 */
const Render = (() => {
  const SPOT_COLOR = { 1: '#e03131', 2: '#1971c2', 3: '#2f9e44', 4: '#f08c00', S: '#7048e8', K: '#8d5524' };
  const SPOT_GLYPH = { 1: '1', 2: '2', 3: '3', 4: '4', S: '🏠', K: '📦' };
  const FREIGHT_COLORS = ['#2b8a3e', '#1864ab', '#e8590c', '#c92a2a', '#5f3dc4'];

  // ---------- みかた（view） ----------
  function fit(L, cw, ch, top, bottom) {
    const minX = -1.0;
    const maxX = L.w + 1.0;
    const minY = -0.9;
    const maxY = L.h + 0.9;
    const aw = cw - 16;
    const ah = ch - top - bottom - 8;
    const rot = ah > aw * 1.15;
    let u;
    let m;
    if (!rot) {
      u = Math.min(aw / (maxX - minX), ah / (maxY - minY));
      const ox = (cw - u * (maxX - minX)) / 2 - u * minX;
      const oy = top + 4 + (ah - u * (maxY - minY)) / 2 - u * minY;
      m = [u, 0, 0, u, ox, oy];
    } else {
      // sx = ox + (maxY - y) * u ,  sy = oy + (x - minX) * u
      u = Math.min(aw / (maxY - minY), ah / (maxX - minX));
      const ox = (cw - u * (maxY - minY)) / 2 + u * maxY;
      const oy = top + 4 + (ah - u * (maxX - minX)) / 2 - u * minX;
      m = [0, u, -u, 0, ox, oy];
    }
    return { u, rot, m, cw, ch, key: [cw, ch, top, bottom].join('x') };
  }
  const toS = (v, x, y) => [v.m[0] * x + v.m[2] * y + v.m[4], v.m[1] * x + v.m[3] * y + v.m[5]];
  function toB(v, sx, sy) {
    const [a, b, c, d, e, f] = v.m;
    const det = a * d - b * c;
    const X = sx - e;
    const Y = sy - f;
    return [(d * X - c * Y) / det, (-b * X + a * Y) / det];
  }
  const setT = (ctx, v, dpr) => ctx.setTransform(v.m[0] * dpr, v.m[1] * dpr, v.m[2] * dpr, v.m[3] * dpr, v.m[4] * dpr, v.m[5] * dpr);

  function text(ctx, v, dpr, x, y, str, size, color, opt) {
    const o = opt || {};
    const [sx, sy] = toS(v, x, y);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${o.bold === false ? '' : 'bold '}${Math.max(9, size * v.u)}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    if (o.stroke) {
      ctx.lineWidth = Math.max(2, size * v.u * 0.22);
      ctx.strokeStyle = o.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, sx, sy + (o.dy || 0));
    }
    ctx.fillStyle = color;
    ctx.fillText(str, sx, sy + (o.dy || 0));
    ctx.restore();
  }

  // ---------- しずか な え（せんろ・ホーム・いえ） ----------
  function seeded(seed) {
    let s = seed >>> 0 || 3;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function distToSeg(px, py, s) {
    const dx = s.x1 - s.x0;
    const dy = s.y1 - s.y0;
    const t = Math.max(0, Math.min(1, ((px - s.x0) * dx + (py - s.y0) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (s.x0 + dx * t), py - (s.y0 + dy * t));
  }

  function decoFor(S) {
    if (S._deco) return S._deco;
    const L = S.L;
    const rnd = seeded(S.def.seed || 5);
    const out = [];
    const st = S.def.station;
    for (let gx = -0.5; gx <= L.w + 0.5; gx += 0.9) {
      for (let gy = -0.6; gy <= L.h + 0.6; gy += 0.8) {
        const x = gx + (rnd() - 0.5) * 0.4;
        const y = gy + (rnd() - 0.5) * 0.3;
        if (rnd() < 0.55) continue;
        let dmin = 9;
        for (const s of L.segs) dmin = Math.min(dmin, distToSeg(x, y, s));
        if (dmin < 0.7) continue;
        if (L.plats.some((p) => x > p.x0 - 0.5 && x < p.x1 + 0.5 && y > p.y0 - 0.5 && y < p.y1 + 0.5)) continue;
        if (st && Math.abs(x - st.x) < (st.big ? 1.2 : 2.2) && Math.abs(y - st.y) < (st.big ? 2.4 : 0.8)) continue;
        if ((L.crossings || []).some((c) => Math.abs(x - c.x) < 0.7)) continue;
        if (L.tunnels.some((t) => Math.hypot(x - t.x, y - t.y) < 1.1)) continue;
        out.push({ x, y, kind: rnd() < 0.68 ? 'tree' : 'house', r: 0.22 + rnd() * 0.14, c: Math.floor(rnd() * 4) });
      }
    }
    S._deco = out;
    return out;
  }

  function drawStatic(ctx, S, v, dpr, ui) {
    const L = S.L;
    const snow = !!S.def.snow;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = snow ? '#dfe9f2' : '#9fd27e';
    ctx.fillRect(0, 0, v.cw, v.ch);
    setT(ctx, v, dpr);
    // じめん の もよう
    ctx.fillStyle = snow ? '#f4f8fb' : '#b5df95';
    ctx.fillRect(-1.0, -0.9, L.w + 2, L.h + 1.8);
    // みち・ふみきり（した）
    for (const c of L.crossings || []) {
      ctx.fillStyle = '#868e96';
      ctx.fillRect(c.x - 0.35, -0.9, 0.7, L.h + 1.8);
      ctx.strokeStyle = '#f8f9fa';
      ctx.lineWidth = 0.04;
      ctx.setLineDash([0.18, 0.14]);
      ctx.beginPath();
      ctx.moveTo(c.x, -0.9);
      ctx.lineTo(c.x, L.h + 0.9);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // き・いえ
    const HOUSE = ['#ff8787', '#74c0fc', '#ffd43b', '#b197fc'];
    for (const d of decoFor(S)) {
      if (d.kind === 'tree') {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.arc(d.x + 0.06, d.y + 0.06, d.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = snow ? '#9bb7a6' : ['#2f9e44', '#37b24d', '#40c057', '#2b8a3e'][d.c];
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = snow ? '#ffffff' : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.45, 0, Math.PI * 2); ctx.fill();
      } else {
        const s = d.r * 1.6;
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(d.x - s / 2 + 0.05, d.y - s / 2 + 0.05, s, s);
        ctx.fillStyle = snow ? '#f8f9fa' : HOUSE[d.c];
        ctx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(d.x - s / 2, d.y); ctx.lineTo(d.x + s / 2, d.y); ctx.stroke();
      }
    }
    // えき の たてもの
    const st = S.def.station;
    if (st) {
      const w = st.big ? 1.3 : 3.2;
      const h = st.big ? 3.6 : 0.75;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(st.x - w / 2 + 0.07, st.y - h / 2 + 0.07, w, h);
      ctx.fillStyle = '#fff4e6';
      ctx.fillRect(st.x - w / 2, st.y - h / 2, w, h);
      ctx.strokeStyle = '#d9480f';
      ctx.lineWidth = 0.06;
      ctx.strokeRect(st.x - w / 2, st.y - h / 2, w, h);
    }
    // ホーム
    for (const p of L.plats) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(p.x0 + 0.05, p.y0 + 0.05, p.x1 - p.x0, p.y1 - p.y0);
      ctx.fillStyle = '#dee2e6';
      ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
      ctx.fillStyle = '#fcc419';
      ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, 0.04);
      ctx.fillRect(p.x0, p.y1 - 0.04, p.x1 - p.x0, 0.04);
      // やね
      ctx.fillStyle = 'rgba(73,80,87,0.35)';
      ctx.fillRect(p.x0 + 0.6, p.y0 + 0.1, p.x1 - p.x0 - 1.2, p.y1 - p.y0 - 0.2);
    }
    // しゃこ・かもつ
    for (const sp of L.spots) {
      if (sp.kind === 'depot') {
        ctx.fillStyle = 'rgba(112,72,232,0.18)';
        ctx.fillRect(sp.x0 - 0.1, sp.y - 0.42, sp.x1 - sp.x0 + 0.1, 0.84);
        ctx.strokeStyle = '#7048e8';
        ctx.lineWidth = 0.06;
        ctx.strokeRect(sp.x0 - 0.1, sp.y - 0.42, sp.x1 - sp.x0 + 0.1, 0.84);
      } else if (sp.kind === 'freight') {
        const cols = ['#e8590c', '#1c7ed6', '#2f9e44', '#f59f00'];
        for (let i = 0; i < 5; i += 1) {
          ctx.fillStyle = cols[i % 4];
          ctx.fillRect(sp.x0 + 0.2 + i * 0.75, sp.y + 0.35, 0.6, 0.3);
        }
      }
    }
    // せんろ: じゃり → まくらぎ → レール
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = snow ? '#e9ecef' : '#cbb89d';
    ctx.lineWidth = 0.46;
    ctx.beginPath();
    for (const s of L.segs) { ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); }
    ctx.stroke();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (const s of L.segs) {
      const n = Math.max(1, Math.round(s.len / 0.22));
      const ux = (s.x1 - s.x0) / s.len;
      const uy = (s.y1 - s.y0) / s.len;
      for (let i = 0; i < n; i += 1) {
        const t = (i + 0.5) / n;
        const cx = s.x0 + (s.x1 - s.x0) * t;
        const cy = s.y0 + (s.y1 - s.y0) * t;
        ctx.moveTo(cx - uy * 0.18, cy + ux * 0.18);
        ctx.lineTo(cx + uy * 0.18, cy - ux * 0.18);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const s of L.segs) {
      const ux = (s.x1 - s.x0) / s.len;
      const uy = (s.y1 - s.y0) / s.len;
      for (const o of [-0.1, 0.1]) {
        ctx.moveTo(s.x0 - uy * o, s.y0 + ux * o);
        ctx.lineTo(s.x1 - uy * o, s.y1 + ux * o);
      }
    }
    ctx.stroke();
    // くるまどめ（いきどまり）
    for (const p of L.pts) {
      if (p.vanish || p.tunnel) continue;
      const n = p.east.length + p.west.length;
      if (n !== 1) continue;
      const dir = p.east.length ? -1 : 1;
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(p.x + (dir > 0 ? -0.06 : -0.06), p.y - 0.25, 0.12, 0.5);
    }
    // ホーム の ばんごう（せんろ の うえ）
    for (const sp of L.spots) {
      const xs = sp.kind === 'home' ? [sp.x0 + 0.45, sp.x1 - 0.45] : [(sp.x0 + sp.x1) / 2];
      for (const x of xs) {
        setT(ctx, v, dpr);
        ctx.fillStyle = SPOT_COLOR[sp.id] || '#495057';
        ctx.beginPath(); ctx.arc(x, sp.y, 0.21, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.04; ctx.stroke();
        text(ctx, v, dpr, x, sp.y, SPOT_GLYPH[sp.id] || sp.id, sp.kind === 'home' ? 0.28 : 0.22, '#fff', { dy: 1 });
      }
    }
    if (st) text(ctx, v, dpr, st.x, st.y, st.big ? '🚉' : '🚉 ' + st.name, st.big ? 0.5 : 0.3, '#d9480f');
    if (st && st.big) text(ctx, v, dpr, st.x, st.y + 0.8, st.name, 0.24, '#d9480f', { stroke: '#fff4e6' });
    for (const sp of L.spots) {
      if (sp.kind === 'depot') text(ctx, v, dpr, (sp.x0 + sp.x1) / 2, sp.y - 0.62, 'しゃこ', 0.24, '#5f3dc4', { stroke: '#fff' });
      if (sp.kind === 'freight') text(ctx, v, dpr, (sp.x0 + sp.x1) / 2 - 1.2, sp.y + 0.5, 'かもつ', 0.24, '#8d5524', { stroke: '#fff' });
    }
    if (ui && ui.editing) {
      setT(ctx, v, dpr);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = 0; x <= L.w; x += 1) {
        for (let y = 0; y <= L.h; y += 1) { ctx.beginPath(); ctx.arc(x, y, 0.05, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(25,113,194,0.5)';
      ctx.lineWidth = 0.04;
      ctx.setLineDash([0.15, 0.1]);
      ctx.strokeRect(0, 0, L.w, L.h);
      ctx.setLineDash([]);
    }
  }

  // ---------- うごく もの ----------
  // つまみ は ふたまた の あいだ（ポイント から 1.6 さき）に おく
  function knobPos(sw) {
    if (sw._knob) return sw._knob;
    const p = sw.pt;
    const dir = sw.side === 'E' ? 1 : -1;
    const ys = sw.opts.map((s) => {
      const q = Layout.along(s, dir > 0 ? 0 : s.len, dir, 1.75);
      return Layout.posOf(q.seg, q.s).y;
    });
    sw._knob = { x: p.x + dir * 1.6, y: (ys[0] + ys[1]) / 2 };
    return sw._knob;
  }
  function lampPos(lamp) {
    const p = lamp.pt;
    return lamp.dir === 'E' ? { x: p.x - 0.32, y: p.y - 0.5 } : { x: p.x + 0.32, y: p.y + 0.5 };
  }

  function drawSwitch(ctx, S, v, dpr, sw, ui, now) {
    const p = sw.pt;
    const dir = sw.side === 'E' ? 1 : -1;
    setT(ctx, v, dpr);
    // えらんで いない ほう: レール に すきま
    sw.opts.forEach((s, i) => {
      const o = dir > 0 ? s.b : s.a;
      const ux = (o.x - p.x) / s.len;
      const uy = (o.y - p.y) / s.len;
      if (i === sw.state) {
        ctx.strokeStyle = sw.ice > 0 ? '#74c0fc' : '#fab005';
        ctx.lineWidth = 0.12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - dir * 0.25, p.y);
        ctx.lineTo(p.x + ux * 0.75, p.y + uy * 0.75);
        ctx.stroke();
      } else {
        ctx.strokeStyle = S.def.snow ? '#e9ecef' : '#cbb89d';
        ctx.lineWidth = 0.14;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(p.x + ux * 0.22, p.y + uy * 0.22);
        ctx.lineTo(p.x + ux * 0.42, p.y + uy * 0.42);
        ctx.stroke();
      }
    });
    // つまみ
    const k = knobPos(sw);
    const hinted = ui && ui.hintSw === sw;
    if (hinted) {
      const r = 0.45 + 0.12 * Math.sin(now * 8);
      ctx.strokeStyle = 'rgba(255,146,43,0.9)';
      ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.arc(k.x, k.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(k.x + 0.04, k.y + 0.05, 0.31, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sw.ice > 0 ? '#d0ebff' : '#fff';
    ctx.beginPath(); ctx.arc(k.x, k.y, 0.31, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = sw.locked ? '#adb5bd' : sw.ice > 0 ? '#339af0' : '#f59f00';
    ctx.stroke();
    if (sw.ice > 0 && sw.ice < 1) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.arc(k.x, k.y, 0.31, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - sw.ice)); ctx.stroke();
    }
    if (sw.ice > 0) {
      text(ctx, v, dpr, k.x, k.y, sw.heat > 0 ? '🔥' : '❄️', 0.32, '#1971c2');
    } else {
      // やじるし: えらんだ ほう へ
      const s = sw.opts[sw.state];
      const o = dir > 0 ? s.b : s.a;
      const ang = Math.atan2(o.y - p.y, o.x - p.x);
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(ang);
      ctx.fillStyle = sw.locked ? '#adb5bd' : '#e67700';
      ctx.beginPath();
      ctx.moveTo(0.2, 0); ctx.lineTo(-0.02, -0.15); ctx.lineTo(-0.02, -0.06); ctx.lineTo(-0.17, -0.06);
      ctx.lineTo(-0.17, 0.06); ctx.lineTo(-0.02, 0.06); ctx.lineTo(-0.02, 0.15); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (hinted) text(ctx, v, dpr, k.x + 0.55, k.y + 0.35, '👆', 0.42, '#000');
  }

  function drawLamp(ctx, S, v, dpr, lamp, ui, now) {
    const p = lamp.pt;
    const k = lampPos(lamp);
    setT(ctx, v, dpr);
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + (lamp.dir === 'E' ? -0.24 : 0.24));
    ctx.lineTo(k.x, k.y);
    ctx.stroke();
    if (ui && ui.hintLamp === lamp) {
      const r = 0.42 + 0.1 * Math.sin(now * 8);
      ctx.strokeStyle = 'rgba(255,146,43,0.9)';
      ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.arc(k.x, k.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#212529';
    ctx.beginPath(); ctx.arc(k.x, k.y, 0.25, 0, Math.PI * 2); ctx.fill();
    const red = lamp.show === 'red';
    ctx.fillStyle = red ? '#ff4d4f' : '#51cf66';
    ctx.shadowColor = red ? '#ff4d4f' : '#51cf66';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(k.x, k.y, 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // むき（▶）
    ctx.fillStyle = '#212529';
    const dx = lamp.dir === 'E' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(k.x + dx * 0.4, k.y);
    ctx.lineTo(k.x + dx * 0.24, k.y - 0.1);
    ctx.lineTo(k.x + dx * 0.24, k.y + 0.1);
    ctx.fill();
    if (ui && ui.hintLamp === lamp) text(ctx, v, dpr, k.x + 0.5, k.y + 0.4, '👆', 0.42, '#000');
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

  function drawTrain(ctx, S, v, dpr, tr) {
    const cars = Dispatch.cars(tr);
    const alpha = tr.phase === 'sleep' ? Math.max(0.15, 1 - tr.fade / 1.6) : 1;
    setT(ctx, v, dpr);
    ctx.globalAlpha = alpha;
    cars.forEach((c, i) => {
      const cx = (c.f.x + c.b.x) / 2;
      const cy = (c.f.y + c.b.y) / 2;
      const ang = Math.atan2(c.f.y - c.b.y, c.f.x - c.b.x);
      const len = Math.hypot(c.f.x - c.b.x, c.f.y - c.b.y) || tr.k.car;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      const w = 0.42;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      rrect(ctx, -len / 2 + 0.04, -w / 2 + 0.05, len, w, 0.08);
      ctx.fill();
      if (tr.kind === 'freight' && i > 0) {
        ctx.fillStyle = '#343a40';
        ctx.fillRect(-len / 2, -w / 2 + 0.06, len, w - 0.12);
        ctx.fillStyle = FREIGHT_COLORS[(tr.id + i) % FREIGHT_COLORS.length];
        ctx.fillRect(-len / 2 + 0.05, -w / 2, len - 0.1, w);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 0.02;
        for (let j = 1; j < 4; j += 1) {
          ctx.beginPath();
          ctx.moveTo(-len / 2 + (len * j) / 4, -w / 2);
          ctx.lineTo(-len / 2 + (len * j) / 4, w / 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = tr.color;
        rrect(ctx, -len / 2, -w / 2, len, w, i === 0 ? 0.16 : 0.07);
        ctx.fill();
        ctx.fillStyle = tr.k.line;
        ctx.fillRect(-len / 2 + 0.1, -0.05, len - 0.2, 0.1);
        if (tr.kind !== 'freight') {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          for (let j = 0; j < 3; j += 1) ctx.fillRect(-len / 2 + 0.14 + j * (len - 0.28) / 3, -w / 2 + 0.04, (len - 0.28) / 3 - 0.06, 0.07);
        }
      }
      if (i === 0) {
        ctx.fillStyle = '#ffec99';
        ctx.beginPath(); ctx.arc(len / 2 - 0.05, -0.12, 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(len / 2 - 0.05, 0.12, 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(33,37,41,0.75)';
        ctx.fillRect(len / 2 - 0.2, -0.14, 0.08, 0.28);
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function badge(ctx, v, dpr, x, y, tr, S, now) {
    const [sx, sy0] = toS(v, x, y);
    const r = Math.max(13, v.u * 0.34);
    const sy = sy0 - r * 1.55;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let fill = '#fff';
    let glyph = '';
    let fg = '#212529';
    const tg = Dispatch.target(tr);
    if (tr.phase === 'sleep') { glyph = '💤'; }
    else if (tg && tg.phase === 'in') { fill = SPOT_COLOR[tg.goal] || '#495057'; glyph = SPOT_GLYPH[tg.goal] || tg.goal; fg = '#fff'; }
    else if (tg && tg.phase === 'out') { const t = S.L.tunnels.find((u) => u.id === tg.to); glyph = t ? t.emoji : '→'; }
    else glyph = '💤';
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(sx + 1.5, sy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = tr.color;
    if (tr.pass && tr.phase === 'in') ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (tr.phase === 'dwell' && tr.dwell > 0) {
      ctx.strokeStyle = '#fcc419';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.max(0, tr.dwellT) / tr.dwell));
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.font = `bold ${Math.round(r * 1.2)}px "Hiragino Maru Gothic ProN", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, sx, sy + 1);
    if (tr.pass && tr.phase === 'in') {
      ctx.font = `bold ${Math.round(r * 0.62)}px sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText('つうか', sx, sy + r + 8);
      ctx.fillStyle = '#c92a2a';
      ctx.fillText('つうか', sx, sy + r + 8);
    }
    // まって いる しるし
    const sc = tr.sc;
    if (sc && tr.v < 0.05 && sc.reason && sc.reason !== 'spot' && sc.reason !== 'end' && sc.d < 1.2) {
      const m = sc.reason === 'red' ? '🔴' : sc.reason === 'point' ? '❓' : '✋';
      ctx.font = `${Math.round(r * 0.95)}px sans-serif`;
      ctx.fillText(m, sx + r * 1.15, sy - r * 0.7 + Math.sin(now * 6) * 2);
    }
    ctx.restore();
  }

  function drawTunnels(ctx, S, v, dpr, now) {
    const L = S.L;
    for (const t of L.tunnels) {
      const dx = t.side === 'W' ? -1 : 1;
      setT(ctx, v, dpr);
      ctx.fillStyle = S.def.snow ? '#ced4da' : '#6b8e4e';
      ctx.beginPath();
      ctx.ellipse(t.x + dx * 0.45, t.y, 0.55, 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = S.def.snow ? '#ffffff' : '#7fa35e';
      ctx.beginPath();
      ctx.ellipse(t.x + dx * 0.6, t.y - 0.15, 0.3, 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#868e96';
      ctx.fillRect(t.x - (dx > 0 ? 0.05 : 0.15), t.y - 0.36, 0.2, 0.72);
      ctx.fillStyle = '#212529';
      ctx.fillRect(t.x - (dx > 0 ? 0.0 : 0.1), t.y - 0.26, 0.1, 0.52);
      text(ctx, v, dpr, t.x + dx * 0.62, t.y + 0.02, t.emoji, 0.36, '#000');
      // まもなく
      const q = S.queue.find((it) => it.from === t.id);
      if (q && q.t - S.t < 6) {
        const left = q.t - S.t;
        const [sx, sy] = toS(v, t.x + dx * 0.5, t.y - 0.95);
        const r = Math.max(12, v.u * 0.28);
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = left > 0 ? 0.95 : 0.6 + 0.4 * Math.abs(Math.sin(now * 5));
        ctx.fillStyle = SPOT_COLOR[q.goal] || '#495057';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        if (left > 0) {
          ctx.strokeStyle = '#fcc419';
          ctx.beginPath(); ctx.arc(sx, sy, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - left / 6)); ctx.stroke();
        }
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(SPOT_GLYPH[q.goal] || '?', sx, sy + 1);
        ctx.font = `bold ${Math.max(10, Math.round(r * 0.6))}px sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.strokeText('まもなく', sx, sy + r + 8);
        ctx.fillStyle = '#495057';
        ctx.fillText('まもなく', sx, sy + r + 8);
        ctx.restore();
      }
    }
  }

  function crossingActive(S, c) {
    for (const tr of S.trains) {
      for (const s of tr.body) {
        const mx = Math.min(s.x0, s.x1);
        const Mx = Math.max(s.x0, s.x1);
        if (c.x > mx - 1.6 && c.x < Mx + 1.6) return true;
      }
    }
    return false;
  }

  function drawCrossings(ctx, S, v, dpr, now) {
    let any = false;
    for (const c of S.L.crossings || []) {
      const on = crossingActive(S, c);
      any = any || on;
      setT(ctx, v, dpr);
      for (const [y, s] of [[-0.55, 1], [S.L.h + 0.55, -1]]) {
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.moveTo(c.x - 0.42, y);
        if (on) ctx.lineTo(c.x + 0.42, y);
        else ctx.lineTo(c.x - 0.42, y - s * 0.6);
        ctx.stroke();
        ctx.fillStyle = on && Math.floor(now * 2.4) % 2 ? '#ff4d4f' : '#495057';
        ctx.beginPath(); ctx.arc(c.x - 0.45, y + s * 0.14, 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = on && Math.floor(now * 2.4) % 2 === 0 ? '#ff4d4f' : '#495057';
        ctx.beginPath(); ctx.arc(c.x + 0.45, y + s * 0.14, 0.08, 0, Math.PI * 2); ctx.fill();
      }
    }
    return any;
  }

  // ---------- まとめて ----------
  function draw(ctx, S, v, dpr, ui, now) {
    const L = S.L;
    // しずか な え は べつ の canvas に とって おく
    const key = v.key + '|' + dpr + '|' + (ui.staticKey || '') + '|' + (ui.editing ? 1 : 0);
    if (!S._bg || S._bgKey !== key) {
      const c = S._bg || document.createElement('canvas');
      c.width = Math.round(v.cw * dpr);
      c.height = Math.round(v.ch * dpr);
      drawStatic(c.getContext('2d'), S, v, dpr, ui);
      S._bg = c;
      S._bgKey = key;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(S._bg, 0, 0);
    // でんしゃ（ばん の なか だけ）
    setT(ctx, v, dpr);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -1, L.w, L.h + 2);
    ctx.clip();
    for (const tr of S.trains) drawTrain(ctx, S, v, dpr, tr);
    ctx.restore();
    for (const sw of L.sws) drawSwitch(ctx, S, v, dpr, sw, ui, now);
    for (const lamp of L.lamps) drawLamp(ctx, S, v, dpr, lamp, ui, now);
    const kan = drawCrossings(ctx, S, v, dpr, now);
    drawTunnels(ctx, S, v, dpr, now);
    for (const tr of S.trains) {
      if (tr.seg.virtual) {
        const p = Layout.posOf(tr.seg, tr.s);
        if (p.x < 0.3 || p.x > L.w - 0.3) continue;
      }
      const p = Layout.posOf(tr.seg, tr.s);
      badge(ctx, v, dpr, Math.max(0.2, Math.min(L.w - 0.2, p.x)), p.y, tr, S, now);
    }
    // ゆき
    if (S.def.snow) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 40; i += 1) {
        const x = ((i * 97.3 + now * (14 + (i % 5) * 4)) % (v.cw + 20)) - 10;
        const y = ((i * 53.1 + now * (30 + (i % 7) * 6)) % (v.ch + 20)) - 10;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    }
    // ふきだし
    for (const f of ui.floats || []) {
      const a = Math.min(1, 2 - f.age);
      if (a <= 0) continue;
      const [sx, sy] = toS(v, f.x, f.y);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = Math.max(0, a);
      const size = Math.max(14, v.u * 0.4);
      ctx.font = `bold ${size}px "Hiragino Maru Gothic ProN", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = sy - size * 2.4 - f.age * 18;
      const w = ctx.measureText(f.text).width + size;
      ctx.fillStyle = f.bg || '#fff';
      rrect(ctx, sx - w / 2, y - size * 0.75, w, size * 1.5, size * 0.6);
      ctx.fill();
      ctx.strokeStyle = f.color || '#1971c2';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = f.color || '#1971c2';
      ctx.fillText(f.text, sx, y + 1);
      ctx.restore();
    }
    return { kankan: kan };
  }

  // ---------- タップ ----------
  function hit(S, v, sx, sy) {
    const [bx, by] = toB(v, sx, sy);
    let best = null;
    let bd = 0.8;
    for (const sw of S.L.sws) {
      const k = knobPos(sw);
      const d = Math.min(Math.hypot(bx - k.x, by - k.y), Math.hypot(bx - sw.pt.x, by - sw.pt.y) + 0.15);
      if (d < bd) { bd = d; best = { type: 'sw', sw }; }
    }
    for (const lamp of S.L.lamps) {
      const k = lampPos(lamp);
      const d = Math.hypot(bx - k.x, by - k.y);
      if (d < bd) { bd = d; best = { type: 'lamp', lamp }; }
    }
    return best;
  }

  const screenOf = (v, p) => { const [x, y] = toS(v, p.x, p.y); return { x, y }; };

  return { fit, draw, hit, toS, toB, knobPos, lampPos, screenOf, SPOT_COLOR, SPOT_GLYPH };
})();
