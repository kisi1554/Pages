/* ほしくず ダンジョン — がめん（canvas に ドット ふう の オリジナル タイル）と そうさ */
(function () {
  "use strict";
  const D = window.HD, A = window.HDAudio, T = D.T, W = D.W, H = D.H, K = D.K;
  const KEY = "hoshikuzu-dungeon-v1";
  const $ = (id) => document.getElementById(id);

  /* ---------- ほぞん ---------- */
  const defaults = () => ({ snd: true, bgm: true, zukan: {}, clears: 0, best: 0, run: null, helped: false });
  let save = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") save = Object.assign(defaults(), s); } catch (e) { /* よめない とき は はじめから */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  A.setSfx(save.snd); A.setBgm(false);

  /* ---------- ドット え（オリジナル） ---------- */
  const PAL = {
    y: "#ffd43b", o: "#ff922b", O: "#f08c00", k: "#1b1530", w: "#f8f9fa", b: "#4dabf7", B: "#1c7ed6", p: "#ff8fab",
    v: "#9775fa", d: "#5f3dc4", g: "#94d82d", G: "#5c940d", c: "#ffd8a8", s: "#adb5bd", S: "#868e96", r: "#a1887f", R: "#6d4c41", l: "#d7ccc8",
  };
  const ART = {
    hero: ["...yy...", "..yyyy..", "yyyyyyyy", ".ykyyky.", ".pyyyyp.", "..yyyy..", ".bBbbBb.", ".b.bb.b."],
    fuwa: ["..wwww..", ".wwwwww.", "wwkwwkww", "wwwwwwww", "wpwwwwpw", "wwwwwwww", "wwwwwwww", "ww.ww.ww"],
    pata: ["........", "v......v", "vv.vv.vv", "vvvvvvvv", "dvyvvyvd", ".vvvvvv.", "..v..v..", "........"],
    noro: ["........", "g..g....", ".gg..OO.", ".kg.OccO", ".gg.OcOO", ".gggOOOO", "GGGGGGGG", "........"],
    goro: ["..ssss..", ".ssssss.", "ssksskss", "ssssssss", "spssssps", "sssSSsss", ".ssssss.", "..SSSS.."],
    mane: ["o......o", "oo....oo", "oooooooo", "okooooko", "oooooooo", ".owwwwo.", "..owwo..", "...oo..."],
    star: ["...y....", "...y....", "yyywyyy.", ".yyyyy..", "..yyy...", ".yy.yy..", ".y...y..", "........"],
    rock: ["........", "..llll..", ".lrrrrl.", "lrrrrrrR", "lrrRrrrR", "lrrrrrrR", ".RrrrrR.", "..RRRR.."],
  };
  const sprites = {};
  function sprite(name) {
    if (sprites[name]) return sprites[name];
    const rows = ART[name], c = document.createElement("canvas");
    c.width = 8; c.height = 8;
    const x = c.getContext("2d");
    rows.forEach((row, yy) => { for (let xx = 0; xx < 8; xx++) { const ch = row[xx]; if (ch && ch !== "." && PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(xx, yy, 1, 1); } } });
    return (sprites[name] = c);
  }
  function spriteURL(name, scale) {
    const s = sprite(name), c = document.createElement("canvas");
    c.width = c.height = 8 * scale;
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, 8 * scale, 8 * scale);
    return c.toDataURL();
  }

  /* ---------- じょうたい ---------- */
  let g = null, fast = false, memo = {};
  let anim = null;           // { t0, dur, from: {player:[x,y], mons:{id:[x,y]}} }
  let queued = null, autoPath = null, transit = false, repeatT = null, hintT = null, shake = 0;
  const floats = [];         // うかぶ もじ・ほし
  const ANIM = () => (fast ? 0 : 120);

  const cv = $("cv"), ctx = cv.getContext("2d"), mini = $("mini"), mctx = mini.getContext("2d");
  let cw = 0, ch = 0, dpr = 1;

  function resize() {
    const r = $("stage").getBoundingClientRect();
    dpr = Math.min(3, window.devicePixelRatio || 1);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.width = cw + "px"; cv.style.height = ch + "px";
    const big = mini.classList.contains("zoomed");
    const mw = big ? Math.min(cw - 16, (ch - 16) * W / H) : Math.min(150, cw * 0.36);
    mini.width = Math.round(mw * dpr); mini.height = Math.round(mw * H / W * dpr);
    mini.style.width = mw + "px"; mini.style.height = (mw * H / W) + "px";
  }
  function tileSize() {
    let cols = Math.round(cw / 44); if (cols % 2 === 0) cols++;
    cols = Math.max(9, Math.min(15, cols));
    let ts = cw / cols;
    const rows = ch / ts;
    if (rows < 7) ts = ch / 7;
    return ts;
  }

  /* ---------- えがく ---------- */
  function hashK(k) { let h = k * 2654435761; h ^= h >>> 13; return h >>> 0; }
  function drawTile(t, k, px, py, ts, now) {
    const u = ts / 8, x = ctx;
    const floor = () => {
      x.fillStyle = "#211b4a"; x.fillRect(px, py, ts + 0.5, ts + 0.5);
      const h = hashK(k);
      x.fillStyle = "#302968";
      x.fillRect(px + (h % 7) * u, py + ((h >> 3) % 7) * u, u, u);
      x.fillRect(px + ((h >> 6) % 7) * u, py + ((h >> 9) % 7) * u, u, u);
      if (h % 5 === 0) { x.fillStyle = "#4b3fa0"; x.fillRect(px + ((h >> 12) % 7) * u, py + ((h >> 15) % 7) * u, u, u); }
    };
    if (t === T.WALL || t === T.CRACK) {
      x.fillStyle = "#3b2f6b"; x.fillRect(px, py, ts + 0.5, ts + 0.5);
      x.fillStyle = "#4e3f8a";
      for (let r = 0; r < 2; r++) {
        const off = r ? 4 : 0;
        x.fillRect(px + ((off + 0) % 8) * u + u * 0.2, py + r * 4 * u + u * 0.3, 3.4 * u, 3 * u);
        x.fillRect(px + ((off + 4) % 8) * u + u * 0.2, py + r * 4 * u + u * 0.3, 3.4 * u, 3 * u);
      }
      x.fillStyle = "#2a2150"; x.fillRect(px, py + 7.4 * u, ts, 0.6 * u);
      if (t === T.CRACK) {
        x.fillStyle = "#c9bfff";
        [[3, 1], [4, 2], [3, 3], [4, 4], [5, 5], [3, 5], [2, 6]].forEach(([a, b]) => x.fillRect(px + a * u, py + b * u, u * 0.7, u * 0.7));
      }
      return;
    }
    floor();
    if (t === T.ICE) {
      x.fillStyle = "#74c0fc"; x.fillRect(px, py, ts + 0.5, ts + 0.5);
      x.fillStyle = "#a5d8ff"; x.fillRect(px + u, py + u, 6 * u, 6 * u);
      x.fillStyle = "#e7f5ff"; x.fillRect(px + 2 * u, py + 2 * u, 2 * u, u); x.fillRect(px + 2 * u, py + 3 * u, u, u); x.fillRect(px + 5 * u, py + 5 * u, u, u);
    } else if (t === T.STAIRS) {
      for (let i = 0; i < 4; i++) { x.fillStyle = ["#e5dbff", "#b197fc", "#7950f2", "#3b2a8a"][i]; x.fillRect(px + (1 + i * 0.5) * u, py + (1 + i * 1.6) * u, (6 - i) * u, 1.6 * u); }
    } else if (t === T.DOOR || t === T.OPEN) {
      x.fillStyle = "#7c5a3b"; x.fillRect(px, py, u, ts); x.fillRect(px + 7 * u, py, u, ts); x.fillRect(px, py, ts, u);
      if (t === T.DOOR) {
        x.fillStyle = "#b08050"; x.fillRect(px + u, py + u, 6 * u, 7 * u);
        x.fillStyle = "#8a6038"; x.fillRect(px + 3.5 * u, py + u, u, 7 * u);
        x.fillStyle = "#ffd43b"; x.fillRect(px + 5 * u, py + 4 * u, u, u);
      }
    } else if (t === T.SWITCH) {
      x.fillStyle = "#495057"; x.fillRect(px + 1.5 * u, py + 1.5 * u, 5 * u, 5 * u);
      x.fillStyle = g.f.switchOn ? "#51cf66" : "#ff6b6b"; x.fillRect(px + 2.5 * u, py + (g.f.switchOn ? 3 : 2.5) * u, 3 * u, (g.f.switchOn ? 2.5 : 3) * u);
    } else if (t === T.WARP) {
      const ph = (now / 120) % 4;
      for (let i = 0; i < 4; i++) {
        x.fillStyle = ["#e599f7", "#be4bdb", "#862e9c", "#3d0a4f"][(i + Math.floor(ph)) % 4];
        x.fillRect(px + (0.5 + i) * u, py + (0.5 + i) * u, (7 - 2 * i) * u, (7 - 2 * i) * u);
      }
    } else if (t === T.TRAP && g.f.trapKnown.has(k)) {
      x.strokeStyle = "#dee2e6"; x.lineWidth = Math.max(1, u * 0.4);
      x.beginPath();
      x.moveTo(px + u, py + u); x.lineTo(px + 7 * u, py + 7 * u); x.moveTo(px + 7 * u, py + u); x.lineTo(px + u, py + 7 * u);
      x.moveTo(px + 4 * u, py + 0.5 * u); x.lineTo(px + 4 * u, py + 7.5 * u); x.moveTo(px + 0.5 * u, py + 4 * u); x.lineTo(px + 7.5 * u, py + 4 * u);
      x.stroke();
      x.strokeRect(px + 2.5 * u, py + 2.5 * u, 3 * u, 3 * u);
    } else if (t === T.GOAL) {
      drawMeteor(px + ts / 2, py + ts / 2, ts * 0.55, now);
    }
  }
  function starPath(x, cx, cy, r) {
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
  }
  function drawMeteor(cx, cy, r, now) {
    const x = ctx, p = 1 + Math.sin(now / 250) * 0.08;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
    gr.addColorStop(0, "rgba(255,236,153,.85)"); gr.addColorStop(1, "rgba(255,236,153,0)");
    x.fillStyle = gr; x.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
    x.fillStyle = "#fff3bf"; starPath(x, cx, cy, r * p); x.fill();
    x.fillStyle = "#ffd43b"; starPath(x, cx, cy, r * 0.7 * p); x.fill();
  }
  function drawSprite(name, px, py, ts, opt) {
    opt = opt || {};
    const s = ts * (opt.scale || 0.82), ox = px + (ts - s) / 2, oy = py + (ts - s) / 2 + (opt.dy || 0);
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    if (opt.flip) { ctx.translate(ox + s, oy); ctx.scale(-1, 1); ctx.drawImage(sprite(name), 0, 0, s, s); }
    else ctx.drawImage(sprite(name), ox, oy, s, s);
    ctx.restore();
  }

  function lerpPos(from, to, t) { return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]; }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!g || $("vGame").hidden) return;
    const f = g.f;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#07051a"; ctx.fillRect(0, 0, cw, ch);
    const ts = tileSize();
    let t = 1;
    if (anim) { t = anim.dur ? Math.min(1, (now - anim.t0) / anim.dur) : 1; if (t >= 1) { anim = null; t = 1; } }
    const pp = anim ? lerpPos(anim.from.player, [g.x, g.y], t) : [g.x, g.y];
    let sx = 0, sy = 0;
    if (shake > now) { const a = (shake - now) / 300; sx = Math.sin(now / 20) * 6 * a; sy = Math.cos(now / 17) * 4 * a; }
    const camX = pp[0] + 0.5 - cw / 2 / ts, camY = pp[1] + 0.5 - ch / 2 / ts;
    const scr = (cx, cy) => [(cx - camX) * ts + sx, (cy - camY) * ts + sy];
    const x0 = Math.floor(camX) - 1, y0 = Math.floor(camY) - 1, x1 = Math.ceil(camX + cw / ts) + 1, y1 = Math.ceil(camY + ch / ts) + 1;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let xx = Math.max(0, x0); xx <= Math.min(W - 1, x1); xx++) {
      const k = K(xx, y);
      if (!f.seen[k]) continue;
      const [px, py] = scr(xx, y);
      drawTile(f.grid[k], k, px, py, ts, now);
      if (f.stars.has(k)) drawSprite("star", px, py, ts, { scale: 0.6, dy: Math.sin(now / 300 + k) * ts * 0.04 });
      if (f.items.has(k)) {
        ctx.font = Math.round(ts * 0.62) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(D.ITEMS[f.items.get(k)].emoji, px + ts / 2, py + ts / 2 + ts * 0.04);
      }
      if (g.rocks.has(k)) drawSprite("rock", px, py, ts, { scale: 0.92 });
    }
    // まもの（いま みえて いる ところ だけ）
    for (const m of g.mons) {
      const from = anim && anim.from.mons[m.id];
      let p = from ? lerpPos(from, [m.x, m.y], t) : [m.x, m.y];
      const k = K(Math.round(p[0]), Math.round(p[1]));
      if (!g.vis[K(m.x, m.y)] && !(g.vis[k])) continue;
      let hop = 0;
      if (from && m.kind === "pata") hop = -Math.sin(t * Math.PI) * ts * 0.35;
      const bob = Math.sin(now / 260 + m.id) * ts * 0.04;
      const [px, py] = scr(p[0], p[1]);
      const flip = (m.dx || 0) < 0;
      drawSprite(m.kind, px, py, ts, { dy: hop + bob, flip, alpha: g.freeze > 0 ? 0.55 : 1 });
      if (m.kind === "goro" && m.rest > 0) { ctx.fillStyle = "#fff"; ctx.font = Math.round(ts * 0.3) + "px sans-serif"; ctx.textAlign = "center"; ctx.fillText("…", px + ts * 0.8, py + ts * 0.1); }
      if (g.freeze > 0) { ctx.fillStyle = "#a5d8ff"; ctx.font = "bold " + Math.round(ts * 0.3) + "px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(g.freeze), px + ts * 0.85, py + ts * 0.15); }
    }
    // じぶん
    {
      const [px, py] = scr(pp[0], pp[1]);
      if (f.lantern) {
        const gr = ctx.createRadialGradient(px + ts / 2, py + ts / 2, ts * 0.3, px + ts / 2, py + ts / 2, ts * 2.5);
        gr.addColorStop(0, "rgba(255,212,59,.18)"); gr.addColorStop(1, "rgba(255,212,59,0)");
        ctx.fillStyle = gr; ctx.fillRect(px - ts * 2.5, py - ts * 2.5, ts * 6, ts * 6);
      }
      const blink = g.inv > 0 && Math.floor(now / 90) % 2 === 0;
      const hop = anim ? -Math.sin(t * Math.PI) * ts * (anim.jump ? 0.5 : 0.08) : 0;
      if (!blink) drawSprite("hero", px, py, ts, { dy: hop, flip: g.lastDir[0] < 0 });
      if (g.wing) { ctx.font = Math.round(ts * 0.4) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🪽", px + ts * 0.12, py + ts * 0.3); }
    }
    // くらい ところ（いま みえて いない）
    ctx.fillStyle = "rgba(5,3,20,.55)";
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let xx = Math.max(0, x0); xx <= Math.min(W - 1, x1); xx++) {
      const k = K(xx, y);
      if (f.seen[k] && !g.vis[k]) { const [px, py] = scr(xx, y); ctx.fillRect(px, py, ts + 0.5, ts + 0.5); }
    }
    // うかぶ もじ
    for (let i = floats.length - 1; i >= 0; i--) {
      const fl = floats[i], a = (now - fl.t0) / fl.dur;
      if (a >= 1) { floats.splice(i, 1); continue; }
      const [px, py] = scr(fl.x, fl.y);
      ctx.globalAlpha = 1 - a;
      ctx.font = "bold " + Math.round(ts * 0.45) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "#1b1530"; ctx.strokeText(fl.text, px + ts / 2, py - a * ts * 0.8);
      ctx.fillStyle = fl.color || "#ffd43b"; ctx.fillText(fl.text, px + ts / 2, py - a * ts * 0.8);
      ctx.globalAlpha = 1;
    }
    drawMini(now);
  }

  function drawMini(now) {
    const f = g.f, mw = mini.width, mh = mini.height, s = mw / W;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.fillStyle = "rgba(7,5,26,.86)"; mctx.fillRect(0, 0, mw, mh);
    for (let k = 0; k < W * H; k++) {
      if (!f.seen[k]) continue;
      const t = f.grid[k], x = (k % W) * s, y = ((k / W) | 0) * s;
      mctx.fillStyle = t === T.WALL ? "#4b3f86" : t === T.CRACK ? "#6a5bb5" : t === T.ICE ? "#74c0fc" : t === T.STAIRS ? "#e5dbff" : t === T.GOAL ? "#ffd43b" :
        t === T.DOOR ? "#b08050" : t === T.WARP ? "#cc5de8" : t === T.SWITCH ? "#ff6b6b" : "#9f93d9";
      mctx.fillRect(x, y, s + 0.3, s + 0.3);
      if (f.stars.has(k)) { mctx.fillStyle = "#ffd43b"; mctx.fillRect(x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.4); }
      if (t === T.STAIRS || t === T.GOAL) { mctx.strokeStyle = "#fff"; mctx.lineWidth = Math.max(1, s * 0.2); mctx.strokeRect(x, y, s, s); }
    }
    for (const m of g.mons) if (g.vis[K(m.x, m.y)]) { mctx.fillStyle = "#ff6b6b"; mctx.fillRect(m.x * s + s * 0.15, m.y * s + s * 0.15, s * 0.7, s * 0.7); }
    if (Math.floor(now / 300) % 3) { mctx.fillStyle = "#fff"; mctx.fillRect(g.x * s - s * 0.1, g.y * s - s * 0.1, s * 1.2, s * 1.2); }
  }

  /* ---------- HUD ---------- */
  function refresh() {
    if (!g) return;
    $("hFloor").textContent = "ちか " + g.n + "かい";
    $("hHearts").textContent = "❤️".repeat(Math.max(0, g.hearts)) + "🤍".repeat(Math.max(0, 3 - g.hearts));
    $("hHearts").setAttribute("aria-label", "ハート " + g.hearts);
    $("hStars").textContent = "⭐ " + g.stars;
    $("hLeft").textContent = "のこり ✨" + g.f.stars.size;
    const bag = $("bag");
    bag.innerHTML = "";
    for (let i = 0; i < D.MAX_ITEMS; i++) {
      const it = g.items[i], b = document.createElement("button");
      b.type = "button"; b.className = "slot" + (it ? "" : " empty") + (it === "wing" && g.wing ? " on" : "");
      if (it) {
        b.innerHTML = '<span class="em">' + D.ITEMS[it].emoji + '</span><span class="lb">' + D.ITEMS[it].name + "</span>";
        b.setAttribute("aria-label", D.ITEMS[it].name + " を つかう");
        b.dataset.idx = i;
        b.addEventListener("click", () => doItem(i));
      } else { b.disabled = true; b.setAttribute("aria-label", "あき"); }
      bag.appendChild(b);
    }
    const pals = $("pals");
    pals.innerHTML = "";
    g.friends.forEach((kind, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pal";
      b.innerHTML = '<img alt="" src="' + spriteURL(kind, 4) + '"><span class="lb">' + D.HELP[kind] + "</span>";
      b.setAttribute("aria-label", D.MONS[kind].name + " に たすけて もらう: " + D.HELP[kind]);
      b.addEventListener("click", () => doFriend(i));
      pals.appendChild(b);
    });
    if (!g.friends.length) { const p = document.createElement("span"); p.className = "palEmpty"; p.textContent = "なかま: まだ いない"; pals.appendChild(p); }
    const moved = g.f.rocksInit.length && g.f.rocksInit.some((k) => !g.rocks.has(k));
    $("bRock").hidden = !moved;
    $("msg").textContent = g.msg || defaultHint();
  }
  function defaultHint() {
    if (g.n >= D.FLOORS) return "🌠 おおきな ながれぼし を さがそう！";
    return "🪜 かいだん を さがして した の かい へ。⭐ ほしくず も あつめよう";
  }

  function toast(html, ms) {
    const el = $("toast");
    el.innerHTML = html; el.hidden = false;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(hintT);
    hintT = setTimeout(() => { el.hidden = true; }, fast ? 10 : (ms || 3500));
  }
  function banner(text) {
    const el = $("banner");
    el.textContent = text; el.hidden = false;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    setTimeout(() => { el.hidden = true; }, fast ? 10 : 1600);
  }
  function monCard(kind) {
    const m = D.MONS[kind];
    toast('<img alt="" src="' + spriteURL(kind, 5) + '"><div><b>' + m.name + '</b><br>うごき: ' + m.move + '<br>なかよし: ' + m.befriend + "</div>", 6000);
  }

  /* ---------- 1て ---------- */
  function busy() { return transit || (anim && performance.now() - anim.t0 < anim.dur); }
  function overlayOpen() { return !$("ovl").hidden; }

  function act(a) {
    if (!g || g.done || overlayOpen() || $("vGame").hidden) return false;
    if (busy()) { queued = a; return false; }
    A.unlock();
    const from = { player: [g.x, g.y], mons: {} };
    g.mons.forEach((m) => { from.mons[m.id] = [m.x, m.y]; });
    const visBefore = new Set(D.visibleMons(g).map((m) => m.id));
    const r = D.step(g, a);
    handleEv(r.ev);
    if (!r.used) { refresh(); return false; }
    anim = { t0: performance.now(), dur: r.ev.includes("faint") ? 0 : ANIM() * (r.ev.includes("slide") ? 2 : 1), from, jump: r.ev.includes("jump") };
    if (r.ev.includes("warp") || r.ev.includes("faint")) anim.from = { player: [g.x, g.y], mons: from.mons };
    // あたらしく まもの が みえたら じどう いどう を とめる
    if (autoPath && D.visibleMons(g).some((m) => !visBefore.has(m.id))) autoPath = null;
    if (autoPath && r.ev.some((e) => e === "bikkuri" || e === "trap" || e === "warp" || e === "slide")) autoPath = null;
    refresh();
    if (g.atStairs) {
      transit = true; autoPath = null;
      setTimeout(() => {
        D.descend(g);
        transit = false;
        onFloor();
      }, fast ? 0 : 650);
    }
    if (g.done) { autoPath = null; setTimeout(showClear, fast ? 0 : 900); }
    return true;
  }

  function handleEv(ev) {
    const has = (e) => ev.includes(e);
    if (has("step") && !has("stairs")) A.step();
    if (has("slide")) A.slide();
    if (has("star")) { A.star(); floats.push({ x: g.x, y: g.y, text: "+⭐", t0: performance.now(), dur: 700 }); }
    if (has("item")) A.item();
    if (has("push")) A.push();
    if (has("warp")) A.warp();
    if (has("switch")) A.sw();
    if (has("secret")) A.secret();
    if (has("trap")) A.trap();
    if (has("wall")) A.wall();
    if (has("nope") || has("full")) A.nope();
    if (has("jump")) A.jump();
    if (has("light") || has("map") || has("help") || has("break")) A.magic();
    if (has("friend")) {
      A.friend();
      const kd = g.lastFriend;
      save.zukan[kd] = save.zukan[kd] || {}; save.zukan[kd].friend = (save.zukan[kd].friend || 0) + 1; store();
      floats.push({ x: g.x, y: g.y, text: "💕", t0: performance.now(), dur: 900, color: "#ff8fab" });
    }
    if (has("bikkuri")) {
      A.bikkuri(); shake = performance.now() + 300;
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* なし */ }
      floats.push({ x: g.x, y: g.y, text: "びっくり！", t0: performance.now(), dur: 900, color: "#ff8fab" });
    }
    if (has("faint")) { A.faint(); banner("いりぐち に もどったよ"); }
    if (has("stairs")) A.stairs();
    if (has("clear")) A.clear();
    if (has("spot") && g.newKinds) {
      A.spot();
      g.newKinds.forEach((kd) => { save.zukan[kd] = save.zukan[kd] || {}; save.zukan[kd].seen = 1; });
      store();
      const first = g.newKinds[0];
      if (first) monCard(first);
    }
  }

  function doItem(i) {
    if (!g || busy() || overlayOpen()) return;
    A.unlock();
    const r = D.useItem(g, i);
    handleEv(r.ev);
    refresh();
  }
  function doFriend(i) {
    if (!g || busy() || overlayOpen()) return;
    A.unlock();
    const r = D.useFriend(g, i);
    handleEv(r.ev);
    refresh();
  }

  // じどう で あるく（タップ した マス へ）
  function pump() {
    if (autoPath && autoPath.length && !busy()) {
      const d = autoPath.shift();
      if (!act({ type: "move", dir: d })) autoPath = null;
      if (autoPath && !autoPath.length) autoPath = null;
    } else if (queued && !busy()) {
      const q = queued; queued = null; act(q);
    }
  }
  setInterval(pump, 30);

  /* ---------- そうさ ---------- */
  const DIRN = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  function moveCmd(d) { autoPath = null; act({ type: "move", dir: d }); }
  function waitCmd() { autoPath = null; act({ type: "wait" }); floats.push({ x: g.x, y: g.y, text: "…", t0: performance.now(), dur: 500, color: "#fff" }); }

  // じゅうじ ボタン（おしっぱなし で つづけて すすむ）
  document.querySelectorAll("#pad [data-dir]").forEach((b) => {
    const dir = b.dataset.dir;
    const fire = () => { if (dir === "wait") waitCmd(); else moveCmd(DIRN[dir]); };
    const stop = () => { clearTimeout(repeatT); clearInterval(repeatT); repeatT = null; b.classList.remove("held"); };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      stop(); b.classList.add("held");
      fire();
      if (dir !== "wait") repeatT = setTimeout(() => { repeatT = setInterval(() => { if (!busy()) fire(); }, 150); }, 380);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener("click", (e) => { if (e.detail === 0) fire(); }); // キーボード の Enter
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // ゲーム がめん: スワイプ で 1マス、タップ で その マス へ、ながおし で まつ
  let ptr = null;
  cv.addEventListener("pointerdown", (e) => {
    if (!g) return;
    A.unlock();
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, long: false };
    ptr.timer = setTimeout(() => { if (ptr) { ptr.long = true; waitCmd(); } }, 450);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 12) clearTimeout(ptr.timer);
  });
  const endPtr = (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    clearTimeout(ptr.timer);
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, p = ptr; ptr = null;
    if (p.long || e.type === "pointercancel") return;
    if (Math.hypot(dx, dy) >= 26) {
      moveCmd(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
    } else tapCell(e.clientX, e.clientY);
  };
  cv.addEventListener("pointerup", endPtr);
  cv.addEventListener("pointercancel", endPtr);
  cv.addEventListener("contextmenu", (e) => e.preventDefault());

  function screenToCell(clientX, clientY) {
    const r = cv.getBoundingClientRect(), ts = tileSize();
    const camX = g.x + 0.5 - cw / 2 / ts, camY = g.y + 0.5 - ch / 2 / ts;
    return [Math.floor((clientX - r.left) / ts + camX), Math.floor((clientY - r.top) / ts + camY)];
  }
  function tapCell(cx, cy) {
    const [x, y] = screenToCell(cx, cy);
    if (x === g.x && y === g.y) return;
    if (Math.abs(x - g.x) + Math.abs(y - g.y) === 1) { moveCmd([x - g.x, y - g.y]); return; }
    if (x < 0 || y < 0 || x >= W || y >= H || !g.f.seen[K(x, y)]) { g.msg = "まだ いった こと の ない ところ だよ"; refresh(); A.nope(); return; }
    const path = D.planPath(g, x, y, true);
    if (!path || !path.length) { g.msg = "そこ へ は いけない みたい"; refresh(); A.nope(); return; }
    autoPath = path;
    floats.push({ x, y, text: "📍", t0: performance.now(), dur: 600, color: "#fff" });
  }

  window.addEventListener("keydown", (e) => {
    if ($("vGame").hidden || overlayOpen()) { if (e.key === "Escape") closeOvl(); return; }
    const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    if (map[e.key]) { e.preventDefault(); if (e.repeat && busy()) return; moveCmd(DIRN[map[e.key]]); }
    else if (e.key === " " || e.key === "." || e.key === "z") { e.preventDefault(); waitCmd(); }
    else if (/^[1-5]$/.test(e.key)) doItem(+e.key - 1);
    else if (e.key === "m") toggleMini();
  });

  function toggleMini() { mini.classList.toggle("zoomed"); resize(); }
  mini.addEventListener("click", toggleMini);
  $("bRock").addEventListener("click", () => { if (!g || busy()) return; if (D.resetRocks(g)) A.push(); else A.nope(); refresh(); });

  /* ---------- がめん きりかえ ---------- */
  function show(id) { ["vTitle", "vGame", "vClear"].forEach((v) => { $(v).hidden = v !== id; }); if (id === "vGame") resize(); }

  function onFloor() {
    memo = {};
    save.run = D.snapshot(g); store();
    banner(g.n >= D.FLOORS ? "ちか " + g.n + "かい ― いちばん そこ" : "ちか " + g.n + "かい");
    A.bgm(g.n);
    anim = null;
    refresh();
    const nk = D.updateSeen(g);
    nk.forEach((kd) => { save.zukan[kd] = save.zukan[kd] || {}; save.zukan[kd].seen = 1; });
    if (nk.length) monCard(nk[0]);
  }
  function startGame(seed, resume) {
    g = resume ? D.restore(resume) : D.newGame(seed);
    show("vGame");
    if (save.bgm) A.setBgm(true);
    onFloor();
    if (!save.helped && !resume && !fast) { save.helped = true; store(); openHelp(); }
  }
  function newSeed() { return ((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0) % 100000; }

  function showClear() {
    save.clears++; save.best = Math.max(save.best, g.stars); save.run = null; store();
    A.stopBgm();
    $("cStars").textContent = g.stars;
    $("cFriends").textContent = g.stats.friends;
    $("cTurns").textContent = g.turn;
    $("cBikkuri").textContent = g.stats.bikkuri;
    $("cSeed").textContent = g.seed;
    $("cBest").textContent = save.best;
    show("vClear");
  }

  function titleRefresh() {
    $("bCont").hidden = !save.run;
    if (save.run) $("bCont").querySelector(".sub").textContent = "ちか " + save.run.n + "かい の いりぐち から";
    $("tRec").textContent = save.clears ? "🌠 そら に かえした かず: " + save.clears + "かい ／ いちばん おおい ほしくず: ⭐" + save.best : "";
    sndBtns();
  }
  function sndBtns() {
    document.querySelectorAll(".bSnd").forEach((b) => { b.textContent = save.snd ? "🔊" : "🔇"; b.setAttribute("aria-label", save.snd ? "こうかおん オン" : "こうかおん オフ"); b.setAttribute("aria-pressed", String(save.snd)); });
    document.querySelectorAll(".bBgm").forEach((b) => { b.textContent = "🎵"; b.classList.toggle("off", !save.bgm); b.setAttribute("aria-label", save.bgm ? "おんがく オン" : "おんがく オフ"); b.setAttribute("aria-pressed", String(save.bgm)); });
  }
  document.querySelectorAll(".bSnd").forEach((b) => b.addEventListener("click", () => { save.snd = !save.snd; A.setSfx(save.snd); store(); sndBtns(); if (save.snd) A.star(); }));
  document.querySelectorAll(".bBgm").forEach((b) => b.addEventListener("click", () => {
    save.bgm = !save.bgm; store(); sndBtns();
    A.unlock();
    if (!$("vGame").hidden && save.bgm) { A.setBgm(true); A.bgm(g.n); } else A.setBgm(false);
  }));

  $("bNew").addEventListener("click", () => { A.unlock(); startGame(newSeed()); });
  $("bCont").addEventListener("click", () => { A.unlock(); if (save.run) startGame(0, save.run); });
  $("bHome").addEventListener("click", () => { A.stopBgm(); autoPath = null; show("vTitle"); titleRefresh(); });
  $("bAgain").addEventListener("click", () => startGame(newSeed()));
  $("bToTitle").addEventListener("click", () => { show("vTitle"); titleRefresh(); });

  /* ---------- せつめい・ずかん ---------- */
  function openOvl(html) { $("ovlBody").innerHTML = html; $("ovl").hidden = false; $("ovlClose").focus(); }
  function closeOvl() { $("ovl").hidden = true; }
  $("ovlClose").addEventListener("click", closeOvl);
  $("ovl").addEventListener("click", (e) => { if (e.target === $("ovl")) closeOvl(); });
  function openHelp() {
    openOvl(`<h2>🌟 あそびかた</h2>
<p>よぞら から おちた <b>ほしくず</b> を あつめながら、ちか の めいきゅう を した へ すすもう。<b>10かい</b> の そこ に ある <b>🌠 おおきな ながれぼし</b> に さわったら、そら へ かえして クリア！</p>
<ul>
<li><b>かわりばんこ</b>: じぶん が 1て うごく と、まもの も 1て うごく よ。まもの の うごき には <b>きまり</b> が ある。よく みて、さき を よもう。</li>
<li>まもの に ぶつかる と <b>びっくり</b>。ハート が へって、ほしくず を 3こ おとす（ひろいなおせる よ）。ハート が 0 に なる と、その かい の いりぐち に もどる。みた ちず は のこる よ。</li>
<li>もちもの で まもの と <b>なかよし</b> に なれる。なかま は 1かい だけ たすけて くれる。</li>
</ul>
<h3>そうさ</h3>
<ul>
<li>じゅうじ ボタン か、がめん を <b>スワイプ</b> で 1マス。</li>
<li>いった こと の ある マス を <b>タップ</b> → そこ まで じどう で あるく（まもの が みえたら とまる）。</li>
<li>がめん を <b>ながおし</b> か「まつ」ボタン → その ばで 1て まつ。</li>
<li>キーボード: やじるし / スペース で まつ / 1〜5 で もちもの。</li>
<li>みぎうえ の ちいさな ちず を タップ → おおきく みる。</li>
</ul>
<h3>しかけ</h3>
<ul>
<li>🧊 すべる ゆか: かべ か なにか に あたる まで すべる。</li>
<li>🪨 いわ: おして うごかせる。こまったら「🔄 いわ」で もと に もどる。</li>
<li>🔘 スイッチ を ふむ と、どこか の とびら が あく。</li>
<li>🌀 ワープ の あな: もう ひとつ の あな へ ひゅーん。</li>
<li>ひび の はいった かべ に ぶつかる と… ひみつ の へや！</li>
<li>🕸️ かくれた わな: ふむ と 1かい うごけない。</li>
</ul>`);
  }
  function openZukan() {
    let html = "<h2>📖 まもの ずかん</h2><div class=\"zk\">";
    for (const kind of Object.keys(D.MONS)) {
      const m = D.MONS[kind], z = save.zukan[kind] || {};
      if (!z.seen) { html += `<div class="zrow unk"><div class="zimg">？</div><div><b>？？？</b><br>ちか ${m.intro}かい くらい から でて くる よ</div></div>`; continue; }
      html += `<div class="zrow"><img class="zimg" alt="" src="${spriteURL(kind, 6)}"><div><b>${m.emoji} ${m.name}</b>${z.friend ? ` <span class="fr">💕 なかよし ${z.friend}かい</span>` : ""}<br>うごき: ${m.move}<br>なかよし: ${m.befriend}<br>なかま の ちから: ${D.HELP[kind]}</div></div>`;
    }
    html += "</div><h3>🎒 もちもの</h3><ul class=\"items\">";
    const desc = { candy: "ふわりん に わたす", leaf: "のろりん に わたす", lantern: "まわり が あかるく なる。ぱたこ が ねむる", mirror: "まねっこ に みせる", map: "その かい の ちず が ぜんぶ みえる", wing: "つぎ の 1て で 2マス とぶ（まもの や わな を こえる）" };
    for (const k of Object.keys(D.ITEMS)) html += `<li>${D.ITEMS[k].emoji} <b>${D.ITEMS[k].name}</b>: ${desc[k]}</li>`;
    html += "</ul><p class=\"note\">もちもの は 5こ まで。なかま は 3にん まで。</p>";
    openOvl(html);
  }
  $("bHelp").addEventListener("click", openHelp);
  $("bHelp2").addEventListener("click", openHelp);
  $("bZukan").addEventListener("click", openZukan);
  $("bZukan2").addEventListener("click", openZukan);

  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe($("stage"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) A.stopBgm(); else if (g && !$("vGame").hidden && save.bgm) A.bgm(g.n); });

  /* タイトル の かざり */
  $("tHero").src = spriteURL("hero", 10);
  ["fuwa", "noro", "goro", "pata", "mane"].forEach((k) => { const im = document.createElement("img"); im.src = spriteURL(k, 6); im.alt = ""; $("tMons").appendChild(im); });

  const qs = new URLSearchParams(location.search);
  titleRefresh();
  show("vTitle");
  requestAnimationFrame(draw);
  if (qs.get("seed")) startGame(+qs.get("seed") >>> 0);

  /* ---------- デバッグ フック（check.js よう） ---------- */
  window.HDTest = {
    fast(on) { fast = !!on; },
    start(seed) { startGame(seed >>> 0); },
    game: () => g,
    state: () => g && ({ n: g.n, x: g.x, y: g.y, hearts: g.hearts, stars: g.stars, turn: g.turn, items: g.items.slice(), friends: g.friends.slice(), done: g.done, atStairs: g.atStairs, busy: busy(), msg: g.msg, auto: !!autoPath }),
    busy,
    // じどう で 1て（もちもの も つかう）。ふつう の そうさ と おなじ act() を とおる
    autoStep() {
      if (!g || busy() || g.done) return null;
      const a = D.autoAction(g, memo);
      if (a.type === "item") { doItem(a.idx); return a; }
      const r = act(a);
      if (memo && g.n !== memo.n) memo.best = undefined;
      return r ? a : null;
    },
    // ぶつからず に うごける むき
    freeDir() {
      for (const d of D.DIRS) { const c = D.clone(g); const r = D.step(c, { type: "move", dir: d }); if (r.used && !r.ev.includes("bikkuri") && !r.ev.includes("stairs") && !r.ev.includes("slide") && !r.ev.includes("warp")) return d; }
      return null;
    },
    cellToScreen(x, y) {
      const r = cv.getBoundingClientRect(), ts = tileSize();
      const camX = g.x + 0.5 - cw / 2 / ts, camY = g.y + 0.5 - ch / 2 / ts;
      return { x: r.left + (x - camX + 0.5) * ts, y: r.top + (y - camY + 0.5) * ts };
    },
  };
})();
