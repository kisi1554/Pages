'use strict';
/* =========================================================
   かたち・かくど … 点を うごかして 平面図形の なまえ・角度・辺を しらべる
   ========================================================= */
const PlaneMode = (() => {
  const cv = $('cvPlane'), ctx = cv.getContext('2d');
  const S3 = Math.sqrt(3);
  const PRE = [
    { k: 'tri', n: 'さんかく', p: [[-3, -2], [3, -2], [1, 2]] },
    { k: 'eqtri', n: R('正三角形', 'せいさんかくけい'), p: [[-2.5, -2], [2.5, -2], [0, -2 + 2.5 * S3]], free: true },
    { k: 'rtri', n: R('直角三角形', 'ちょっかくさんかくけい'), p: [[-2, -2], [3, -2], [-2, 2]] },
    { k: 'quad', n: 'しかく', p: [[-3, -2], [3, -2], [2, 2], [-2, 1]] },
    { k: 'square', n: R('正方形', 'せいほうけい'), p: [[-2, -2], [2, -2], [2, 2], [-2, 2]] },
    { k: 'rect', n: R('長方形', 'ちょうほうけい'), p: [[-3, -2], [3, -2], [3, 1], [-3, 1]] },
    { k: 'rhombus', n: R('ひし形', 'ひしがた'), p: [[0, -3], [2, 0], [0, 3], [-2, 0]] },
    { k: 'para', n: R('平行四辺形', 'へいこうしへんけい'), p: [[-3, -2], [2, -2], [3, 1], [-2, 1]] },
    { k: 'trap', n: R('台形', 'だいけい'), p: [[-3, -2], [3, -2], [1, 1], [-2, 1]] },
    { k: 'pent', n: 'ごかく', p: [[-2, -2], [2, -2], [3, 1], [0, 3], [-3, 1]] },
    { k: 'rhex', n: R('正六角形', 'せいろっかくけい'), p: [0, 1, 2, 3, 4, 5].map(i => [2.6 * Math.cos(i * Math.PI / 3), 2.6 * Math.sin(i * Math.PI / 3)]), free: true },
    { k: 'circle', n: R('円', 'えん'), circle: true },
  ];
  let pts = [], circle = false, rad = 2.5, snap = true, dragI = -1, unit = 40, org = [0, 0];
  const tg = { ang: true, len: false, mark: true, diag: false, area: false };
  let secret = null; // {t}
  const box = $('planeShapes');
  PRE.forEach((p, i) => {
    const b = document.createElement('button'); b.innerHTML = p.n;
    b.addEventListener('click', () => { Snd.tap(); load(i); }); box.appendChild(b);
  });
  function load(i) {
    const p = PRE[i];
    box.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
    circle = !!p.circle; secret = null;
    if (!circle) pts = p.p.map(q => q.slice());
    if (p.free) { snap = false; $('tgSnap').classList.remove('on'); }
    else if (!circle) { snap = true; $('tgSnap').classList.add('on'); }
    $('btnSecret').disabled = circle || pts.length > 4;
    info();
  }
  ['Ang', 'Len', 'Mark', 'Diag', 'Area'].forEach(k => $('tg' + k).addEventListener('click', e => {
    const key = k.toLowerCase(); tg[key] = !tg[key]; e.currentTarget.classList.toggle('on', tg[key]); Snd.tap(); info();
  }));
  $('tgSnap').addEventListener('click', e => {
    snap = !snap; e.currentTarget.classList.toggle('on', snap); Snd.tap();
    if (snap) { pts = pts.map(p => [Math.round(p[0]), Math.round(p[1])]); rad = Math.max(0.5, Math.round(rad * 2) / 2); info(); }
  });
  function layout() { fitCanvas(cv); unit = Math.min(cv.width, cv.height) / 9.5; org = [cv.width / 2, cv.height / 2]; }
  const toS = p => [org[0] + p[0] * unit, org[1] - p[1] * unit];
  const toW = (x, y) => [(x - org[0]) / unit, (org[1] - y) / unit];
  const fmt = v => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => {
    Snd.ensure(); const r = cv.getBoundingClientRect(), d = cv.width / r.width;
    const x = (e.clientX - r.left) * d, y = (e.clientY - r.top) * d;
    if (secret) { secret = null; return; }
    if (circle) {
      const h = toS([rad, 0]);
      if (Math.hypot(h[0] - x, h[1] - y) < 34 * d) dragI = 0;
    } else {
      let best = -1, bd = 34 * d;
      pts.forEach((p, i) => { const s = toS(p); const dd = Math.hypot(s[0] - x, s[1] - y); if (dd < bd) { bd = dd; best = i; } });
      dragI = best;
    }
    if (dragI >= 0) { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } Snd.tap(); }
  });
  cv.addEventListener('pointermove', e => {
    if (dragI < 0) return;
    const r = cv.getBoundingClientRect(), d = cv.width / r.width;
    let [wx, wy] = toW((e.clientX - r.left) * d, (e.clientY - r.top) * d);
    const lim = Math.min(cv.width, cv.height) / unit / 2 - 0.3;
    wx = clamp(wx, -cv.width / unit / 2 + 0.3, cv.width / unit / 2 - 0.3); wy = clamp(wy, -lim, lim);
    if (circle) { rad = clamp(Math.hypot(wx, wy), 0.5, lim); if (snap) rad = Math.round(rad * 2) / 2; info(); return; }
    if (snap) { wx = Math.round(wx); wy = Math.round(wy); }
    if (pts.some((p, i) => i !== dragI && Math.hypot(p[0] - wx, p[1] - wy) < 0.3)) return;
    const old = pts[dragI]; if (old[0] === wx && old[1] === wy) return;
    pts[dragI] = [wx, wy];
    if (selfCross()) { pts[dragI] = old; return; }
    info();
  });
  const up = () => { dragI = -1; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function selfCross() {
    const n = pts.length, X = (a, b, c, d) => {
      const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    };
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (X(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
    return false;
  }
  function area() { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
  function info() {
    if (circle) {
      $('planeName').innerHTML = R('円', 'えん');
      $('planeReason').innerHTML = `まんなか（${R('中心', 'ちゅうしん')}）から まわりまで どこでも おなじ ながさ。<br>${R('半径', 'はんけい')} ${fmt(rad)} → ${R('直径', 'ちょっけい')} ${fmt(rad * 2)}（${R('半径', 'はんけい')}の 2ばい）`;
      $('planeSum').innerHTML = `${R('円周', 'えんしゅう')} ＝ ${R('直径', 'ちょっけい')} × 3.14 ＝ ${(rad * 2 * 3.14).toFixed(2)}` + (tg.area ? `<br>めんせき ＝ ${R('半径', 'はんけい')}×${R('半径', 'はんけい')}×3.14 ＝ ${(rad * rad * 3.14).toFixed(2)}` : '');
      $('planeFacts').innerHTML = ['3.14 は ' + R('円周率', 'えんしゅうりつ') + '。どんな おおきさの まるでも おなじ', '● を うごかすと おおきさが かわるよ'].map(f => `<li>${f}</li>`).join('');
      return;
    }
    const c = classify2D(pts), A = polyAngles(pts), n = pts.length;
    $('planeName').innerHTML = c.name;
    $('planeReason').innerHTML = c.reason;
    const sum = (n - 2) * 180;
    $('planeSum').innerHTML = A.map(a => Math.round(a) + '°').join(' ＋ ') + ` ＝ ${sum}°` + (tg.area ? `<br>めんせき ＝ ${fmt(area())}` + (snap ? '（ますめ ' + fmt(area()) + 'こぶん）' : '') : '');
    const facts = [`${NGON[n] ? R(NGON[n][0], NGON[n][1]) : n + 'かくけい'}の ${W.kaku}を ぜんぶ たすと <b>${sum}°</b>（180° × ${n - 2}）`];
    if (n >= 4) facts.push(`${W.taikaku}（となりでない かどを むすぶ せん）は ${n * (n - 3) / 2}ほん`);
    if (n === 3) facts.push('どんな さんかくでも 3つの かくの わは 180°。「ひみつ」で たしかめよう');
    if (n === 4) facts.push('しかくは ' + W.taikaku + 'で さんかく 2つに わけられる → 180°×2＝360°');
    facts.push('「ぴったり」を けすと すきな ばしょに うごかせるよ');
    $('planeFacts').innerHTML = facts.map(f => `<li>${f}</li>`).join('');
  }
  $('btnSecret').addEventListener('click', () => {
    if (circle || pts.length > 4) return;
    Snd.pop(4); secret = { t: 0 };
    Stickers.give('angle');
  });

  /* ---- 描画 ---- */
  function draw() {
    if (fitCanvas(cv) || !unit) layout();
    layout();
    const c = ctx, Wd = cv.width, Hd = cv.height, d = Math.min(window.devicePixelRatio || 1, 2);
    c.clearRect(0, 0, Wd, Hd);
    // ほうがん
    for (let x = Math.ceil(-Wd / 2 / unit); x <= Wd / 2 / unit; x++) for (let y = Math.ceil(-Hd / 2 / unit); y <= Hd / 2 / unit; y++) {
      const s = toS([x, y]); c.fillStyle = (x === 0 || y === 0) ? 'rgba(90,110,140,.35)' : 'rgba(120,140,170,.25)'; c.beginPath(); c.arc(s[0], s[1], 2 * d, 0, 7); c.fill();
    }
    c.font = `bold ${14 * d}px "Hiragino Maru Gothic ProN",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const txt = (t, s, col = '#1d2b3a', bg) => {
      if (bg) { const w = c.measureText(t).width + 10 * d; c.fillStyle = bg; roundRect(c, s[0] - w / 2, s[1] - 11 * d, w, 22 * d, 8 * d); c.fill(); }
      else { c.lineWidth = 4 * d; c.strokeStyle = '#fff'; c.strokeText(t, s[0], s[1]); }
      c.fillStyle = col; c.fillText(t, s[0], s[1]);
    };
    if (circle) {
      const o = toS([0, 0]), rr = rad * unit;
      c.beginPath(); c.arc(o[0], o[1], rr, 0, 7); c.fillStyle = 'rgba(144,202,249,.45)'; c.fill(); c.strokeStyle = '#2a3645'; c.lineWidth = 3 * d; c.stroke();
      const h = toS([rad, 0]), l = toS([-rad, 0]);
      c.setLineDash([6 * d, 5 * d]); c.strokeStyle = '#8b5cf6'; c.beginPath(); c.moveTo(l[0], l[1] + 0); c.lineTo(o[0], o[1]); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#e5484d'; c.lineWidth = 4 * d; c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(h[0], h[1]); c.stroke();
      txt('はんけい ' + fmt(rad), toS([rad / 2, 0.45]), '#e5484d');
      txt('ちょっけい ' + fmt(rad * 2), toS([0, -0.55]), '#8b5cf6');
      c.fillStyle = '#2a3645'; c.beginPath(); c.arc(o[0], o[1], 5 * d, 0, 7); c.fill();
      c.fillStyle = '#e5484d'; c.beginPath(); c.arc(h[0], h[1], 13 * d, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3 * d; c.stroke();
      return;
    }
    const n = pts.length, S = pts.map(toS), A = polyAngles(pts);
    let sa = 0; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; sa += p[0] * q[1] - q[0] * p[1]; }
    const ccw = sa > 0;
    // ぬり
    c.beginPath(); S.forEach((s, i) => i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1])); c.closePath();
    c.fillStyle = secret ? 'rgba(255,209,102,.25)' : 'rgba(255,209,102,.7)'; c.fill();
    c.strokeStyle = '#2a3645'; c.lineWidth = 3 * d; c.stroke();
    if (tg.diag && n >= 4) {
      c.setLineDash([7 * d, 6 * d]); c.strokeStyle = '#8b5cf6'; c.lineWidth = 2 * d;
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; c.beginPath(); c.moveTo(S[i][0], S[i][1]); c.lineTo(S[j][0], S[j][1]); c.stroke(); }
      c.setLineDash([]);
    }
    const len = i => { const p = pts[i], q = pts[(i + 1) % n]; return Math.hypot(q[0] - p[0], q[1] - p[1]); };
    const L = pts.map((_, i) => len(i));
    // しるし（おなじ ながさ・平行・直角）
    if (tg.mark) {
      const groups = []; L.forEach((l, i) => { const g = groups.find(g => Math.abs(L[g[0]] - l) < 0.02 * l); if (g) g.push(i); else groups.push([i]); });
      let gi = 0;
      groups.filter(g => g.length >= 2).forEach(g => {
        gi++;
        g.forEach(i => {
          const a = S[i], b = S[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
          const ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
          c.strokeStyle = '#e5484d'; c.lineWidth = 2.5 * d;
          for (let k = 0; k < gi && k < 3; k++) {
            const off = (k - (Math.min(gi, 3) - 1) / 2) * 6 * d;
            c.beginPath(); c.moveTo(m[0] + ux * off - nx * 8 * d, m[1] + uy * off - ny * 8 * d); c.lineTo(m[0] + ux * off + nx * 8 * d, m[1] + uy * off + ny * 8 * d); c.stroke();
          }
        });
      });
      // 平行
      const dir = i => { const p = pts[i], q = pts[(i + 1) % n], l = len(i); return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
      let pk = 0; const used = new Set();
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (used.has(i) || used.has(j) || (j === i + 1) || (i === 0 && j === n - 1)) continue;
        const a = dir(i), b = dir(j);
        if (Math.abs(a[0] * b[1] - a[1] * b[0]) < 0.01) {
          pk++; used.add(i); used.add(j);
          [i, j].forEach(e => {
            const p = S[e], q = S[(e + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
            const m = [p[0] + dx * 0.32, p[1] + dy * 0.32];
            c.strokeStyle = '#2fa86b'; c.lineWidth = 2.5 * d;
            for (let k = 0; k < pk; k++) {
              const t = m[0] + ux * k * 7 * d, s = m[1] + uy * k * 7 * d;
              c.beginPath(); c.moveTo(t - ux * 7 * d - uy * 6 * d, s - uy * 7 * d + ux * 6 * d); c.lineTo(t, s); c.lineTo(t - ux * 7 * d + uy * 6 * d, s - uy * 7 * d - ux * 6 * d); c.stroke();
            }
          });
        }
      }
    }
    // 角度
    if (tg.ang && !secret) {
      for (let i = 0; i < n; i++) {
        const V = S[i], P = S[(i - 1 + n) % n], N = S[(i + 1) % n];
        // 画面は y が した むきなので 向きが ぎゃく
        let a1 = Math.atan2(N[1] - V[1], N[0] - V[0]), a2 = Math.atan2(P[1] - V[1], P[0] - V[0]);
        const r = Math.min(28 * d, Math.hypot(N[0] - V[0], N[1] - V[1]) * 0.35, Math.hypot(P[0] - V[0], P[1] - V[1]) * 0.35);
        const isR = Math.abs(A[i] - 90) < 0.6;
        const startA = ccw ? a2 : a1, endA = ccw ? a1 : a2; // 画面座標で 時計まわり
        let mid = startA + (((endA - startA) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / 2;
        c.strokeStyle = '#3b6fd8'; c.lineWidth = 2.5 * d; c.fillStyle = 'rgba(59,111,216,.15)';
        if (isR) {
          const u1 = [Math.cos(a1), Math.sin(a1)], u2 = [Math.cos(a2), Math.sin(a2)], q = r * 0.75;
          c.beginPath(); c.moveTo(V[0] + u1[0] * q, V[1] + u1[1] * q); c.lineTo(V[0] + (u1[0] + u2[0]) * q, V[1] + (u1[1] + u2[1]) * q); c.lineTo(V[0] + u2[0] * q, V[1] + u2[1] * q); c.stroke();
        } else {
          c.beginPath(); c.moveTo(V[0], V[1]); c.arc(V[0], V[1], r, startA, endA, false); c.closePath(); c.fill();
          c.beginPath(); c.arc(V[0], V[1], r, startA, endA, false); c.stroke();
        }
        const lr = r + 20 * d;
        txt(Math.round(A[i]) + '°', [V[0] + Math.cos(mid) * lr, V[1] + Math.sin(mid) * lr], '#3b6fd8');
      }
    }
    if (tg.len) {
      for (let i = 0; i < n; i++) {
        const a = S[i], b = S[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
        const sg = ccw ? 1 : -1; // そとがわへ
        txt(fmt(L[i]), [m[0] + dy / l * 18 * d * sg, m[1] - dx / l * 18 * d * sg], '#50627a', 'rgba(255,255,255,.9)');
      }
    }
    // かどを あつめる ひみつ
    if (secret) drawSecret(c, d, S, A, ccw, txt);
    // うごかせる 点
    if (!secret) S.forEach(s => { c.fillStyle = '#e5484d'; c.beginPath(); c.arc(s[0], s[1], 11 * d, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3 * d; c.stroke(); });
  }
  function drawSecret(c, d, S, A, ccw, txt) {
    const n = S.length, t = ease(Math.min(1, secret.t / 2.2));
    const minY = Math.max(...S.map(s => s[1])), cx = S.reduce((a, s) => a + s[0], 0) / n;
    const target = n === 3 ? [cx, Math.min(cv.height - 40 * d, minY + 60 * d)] : [cx, S.reduce((a, s) => a + s[1], 0) / n];
    const r = Math.min(...S.map((s, i) => Math.hypot(S[(i + 1) % n][0] - s[0], S[(i + 1) % n][1] - s[1]))) * 0.42;
    const COLS = ['rgba(229,72,77,.8)', 'rgba(47,168,107,.8)', 'rgba(59,111,216,.8)', 'rgba(255,145,0,.85)'];
    let acc = Math.PI; // 画面で ひだりむきから
    if (n === 3 && t > 0.98) {
      c.strokeStyle = '#2a3645'; c.lineWidth = 2 * d; c.beginPath(); c.moveTo(target[0] - r * 1.6, target[1]); c.lineTo(target[0] + r * 1.6, target[1]); c.stroke();
    }
    for (let i = 0; i < n; i++) {
      const V = S[i], P = S[(i - 1 + n) % n], N = S[(i + 1) % n];
      const a1 = Math.atan2(N[1] - V[1], N[0] - V[0]), a2 = Math.atan2(P[1] - V[1], P[0] - V[0]);
      const st = ccw ? a2 : a1, sweep = A[i] * Math.PI / 180;
      // 目標: acc から sweep ぶん（画面上 時計まわり）
      let dA = acc - st; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
      const rot = dA * t, pos = [V[0] + (target[0] - V[0]) * t, V[1] + (target[1] - V[1]) * t];
      c.beginPath(); c.moveTo(pos[0], pos[1]); c.arc(pos[0], pos[1], r, st + rot, st + rot + sweep, false); c.closePath();
      c.fillStyle = COLS[i]; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2 * d; c.stroke();
      if (t > 0.98) { const m = st + rot + sweep / 2; txt(Math.round(A[i]) + '°', [pos[0] + Math.cos(m) * r * 0.62, pos[1] + Math.sin(m) * r * 0.62], '#fff', 'rgba(0,0,0,.35)'); }
      acc += sweep;
    }
    if (t > 0.98) txt(n === 3 ? 'あわせると いっちょくせん ＝ 180°！' : 'あわせると ぐるっと 1しゅう ＝ 360°！', [target[0], n === 3 ? target[1] + 24 * d : target[1] + r + 24 * d], '#8b5cf6', 'rgba(255,255,255,.95)');
  }
  Loop.add(dt => {
    if (App.tab !== 'plane') return;
    if (secret) secret.t += dt;
    draw();
  });
  load(0);
  return {};
})();
