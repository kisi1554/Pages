/* ミツバチの いちにち ｜ はなばたけ（うえから みた ちず）と、ちずの かきかた（ダンス・クイズでも つかう） */
(function () {
  "use strict";
  const MB = window.MB, A = MB.Art, App = MB.App, D = window.DANCE;
  const TAU = Math.PI * 2;

  /* ================================================================ ちず
   *  すばこが まんなか。きた が うえ。とおい ところは ちぢめて かく（√ スケール）。 */
  const Map = {
    geom(x, y, w, h) {
      const R = Math.max(40, Math.min(w, h) / 2 - Math.max(18, Math.min(w, h) * 0.075));
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, R, fr: Math.max(7, Math.min(20, R * 0.058)) };
    },
    pos(geo, az, dist) { const p = D.toXY(az, D.mapRho(dist) * geo.R); return { x: geo.cx + p.x, y: geo.cy + p.y }; },
    edge(geo, az, k) { const p = D.toXY(az, geo.R * (k || 1.06)); return { x: geo.cx + p.x, y: geo.cy + p.y }; },
    patchR(geo) { return geo.fr * 3.1; },
    // はなばたけを つくる（rnd: 0〜1 の らんすう）
    makePatches(rnd, opt) {
      opt = opt || {};
      const ids = MB.FLOWERS.map((f) => f.id).sort(() => rnd() - 0.5);
      const n = opt.n || 5;
      for (let tries = 0; tries < 400; tries++) {
        const list = [];
        const nearIdx = opt.near == null ? (rnd() < 0.45 ? 0 : -1) : opt.near ? 0 : -1;
        for (let i = 0; i < n; i++) {
          const dist = i === nearIdx ? 45 + rnd() * 45 : 220 + Math.pow(rnd(), 0.8) * 1650;
          list.push({ id: "p" + i, sp: ids[i % ids.length], az: Math.floor(rnd() * 360), dist: Math.round(dist), rich: 1 + Math.floor(rnd() * 2), rot: rnd() * TAU });
        }
        let okSep = true;
        for (let i = 0; i < n && okSep; i++) for (let j = i + 1; j < n; j++) {
          const a = D.toXY(list[i].az, D.mapRho(list[i].dist)), b = D.toXY(list[j].az, D.mapRho(list[j].dist));
          if (Math.hypot(a.x - b.x, a.y - b.y) < 0.4) { okSep = false; break; }
        }
        if (!okSep) continue;
        const rich = opt.richNear && nearIdx === 0 ? 0 : Math.floor(rnd() * n);
        list[rich].rich = 3;
        return list;
      }
      return null;
    },
    // ちずの はいけい
    draw(g, geo, o) {
      o = o || {};
      const { x, y, w, h, cx, cy, R } = geo;
      g.save();
      g.beginPath(); g.roundRect(x, y, w, h, o.round || 0); g.clip();
      const bg = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, Math.max(w, h));
      bg.addColorStop(0, "#b6e388"); bg.addColorStop(1, "#7cc35a");
      g.fillStyle = bg; g.fillRect(x, y, w, h);
      // くさの もよう
      g.strokeStyle = "rgba(60,120,40,.25)"; g.lineWidth = 1.5;
      for (let i = 0; i < 70; i++) {
        const px = x + ((i * 97.3) % w), py = y + ((i * 61.7 + (i % 7) * 13) % h);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px - 2, py - 6); g.moveTo(px, py); g.lineTo(px + 3, py - 5); g.stroke();
      }
      // きょりの わ
      if (o.rings !== false) {
        g.setLineDash([5, 6]); g.lineWidth = 1.5;
        g.font = "bold " + Math.round(Math.max(10, R * 0.06)) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        for (const [d, lb] of [[100, "100m"], [500, "500m"], [1000, "1km"], [2000, "2km"]]) {
          const rr = D.mapRho(d) * R;
          g.strokeStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
          g.fillStyle = "rgba(40,80,20,.65)"; g.fillText(lb, cx + rr * 0.72, cy + rr * 0.69);
        }
        g.setLineDash([]);
      }
      // ほうい
      const fs = Math.round(Math.max(12, R * 0.07));
      g.font = "bold " + fs + "px sans-serif"; g.textAlign = "left"; g.textBaseline = "top";
      g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.roundRect(x + 6, y + 6, fs * 3.1, fs * 1.6, 8); g.fill();
      g.fillStyle = "#2b5d1a"; g.fillText("↑きた", x + 10, y + 6 + fs * 0.3);
      g.restore();
    },
    drawSun(g, geo, az, t, label) {
      const p = this.edge(geo, az, 1.0 + Math.max(16, geo.R * 0.07) / geo.R * 0.9);
      const r = Math.max(10, geo.R * 0.065);
      const q = { x: Math.max(geo.x + r * 1.7, Math.min(geo.x + geo.w - r * 1.7, p.x)), y: Math.max(geo.y + r * 1.7, Math.min(geo.y + geo.h - r * 1.7, p.y)) };
      A.sun(g, q.x, q.y, r, t);
      if (label) {
        g.font = "bold " + Math.round(r * 0.9) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
        g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,.9)"; g.strokeText(label, q.x, q.y + r * 1.6); g.fillStyle = "#8a4b00"; g.fillText(label, q.x, q.y + r * 1.6);
      }
      return q;
    },
    drawHive(g, geo, glow, t) {
      const s = geo.fr * 1.25;
      if (glow) {
        const k = 0.6 + 0.4 * Math.sin((t || 0) * 5);
        g.fillStyle = "rgba(255,230,80," + (0.35 * k) + ")"; A.circ(g, geo.cx, geo.cy, s * 2.6); g.fill();
      }
      A.hive(g, geo.cx, geo.cy, s);
    },
    // はなばたけ 1つ（flowers が あれば その じょうたいで かく）
    drawPatch(g, geo, p, o) {
      o = o || {};
      const c = this.pos(geo, p.az, p.dist), fr = geo.fr;
      g.fillStyle = "rgba(70,140,40,.35)"; A.ell(g, c.x, c.y + fr * 0.4, this.patchR(geo) * 1.02, this.patchR(geo) * 0.86); g.fill();
      const fl = p.flowers || this.layout(p);
      fl.forEach((f) => {
        const fx = c.x + f.ox * fr, fy = c.y + f.oy * fr;
        if (f.state === "fruit") { A.fruit(g, fx, fy, fr * 0.85, p.sp); return; }
        if (f.state === "grow") {
          const k = Math.min(1, f.growT / 3);
          A.flower(g, fx, fy, fr * (1 - k * 0.6), p.sp, { pollinated: true });
          A.fruit(g, fx, fy, fr * 0.85 * k, p.sp); return;
        }
        A.flower(g, fx, fy, fr, p.sp, { glow: o.glow && f.nectar > 0.5, spin: p.rot + f.ox, pollinated: f.state === "pol" });
      });
      if (o.label !== false) {
        const fs = Math.round(Math.max(11, fr * 0.95));
        g.font = "bold " + fs + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
        const txt = (o.letter ? o.letter + " " : "") + MB.FLOWER[p.sp].name + (o.stars ? " " + "★".repeat(p.rich) : "");
        const ty = c.y + this.patchR(geo) * 0.95;
        g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,.92)"; g.strokeText(txt, c.x, ty);
        g.fillStyle = o.letterColor || "#5c3a00"; g.fillText(txt, c.x, ty);
      }
      return c;
    },
    layout(p) {
      const out = [];
      for (let i = 0; i < 5; i++) { const a = p.rot + (i / 5) * TAU; out.push({ ox: Math.cos(a) * 1.9, oy: Math.sin(a) * 1.9 }); }
      return out;
    },
  };
  MB.Map = Map;

  /* ================================================================ はなばたけ */
  let geo, patches, flowers, bee, target, nectar, full, sunAz, trip, t, todayFruit, said, hiveMsgT, collected;

  function rnd() { return Math.random(); }

  const Field = {
    enter(opts) {
      const S = App.S;
      trip = S.trip % 3;
      sunAz = D.sunAzimuth(App.TRIPS[trip].hour);
      patches = opts.patches || Map.makePatches(rnd, { richNear: S.dance.round === 0 && trip === 1 ? true : undefined, near: S.dance.round === 0 && trip === 1 ? true : undefined });
      flowers = [];
      patches.forEach((p) => {
        p.flowers = Map.layout(p).map((f, i) => Object.assign(f, { id: p.id + "-" + i, pid: p.id, sp: p.sp, nectar: p.rich * 12, max: p.rich * 12, state: "open", growT: 0 }));
        flowers.push(...p.flowers);
      });
      bee = { x: 0, y: 0, vx: 0, vy: 0, h: 0, landed: null, pollen: null, flap: 0, sipT: 0 };
      target = null; nectar = 0; full = false; t = 0; todayFruit = 0; said = {}; hiveMsgT = 0; collected = {};
      this.resize(App.view.W, App.view.H, true);
      this.panel();
      if (!S.helped) {
        App.say("🐝", "ゆびで ハチを うごかして、はなに とまろう。みつを すうと からだに <b>かふん</b> が つくよ。<b>おなじ しゅるい</b>の べつの はなへ はこぶと <b>み</b> が なる！");
      } else {
        App.toast(App.TRIPS[trip].em + " " + App.TRIPS[trip].label + "。たいようは " + App.AZ_NAME(sunAz) + " の ほう");
      }
    },
    leave() { MB.Sound.buzz(0); },
    resize(W, H, first) {
      const old = geo;
      geo = Map.geom(0, 0, W, H);
      if (first || !old) { bee.x = geo.cx; bee.y = geo.cy - geo.fr * 2; }
      else { bee.x = geo.cx + (bee.x - old.cx) * geo.R / old.R; bee.y = geo.cy + (bee.y - old.cy) * geo.R / old.R; }
      target = null;
    },
    panel() {
      const tr = App.TRIPS[trip];
      App.panel(
        '<p class="ptitle">' + tr.em + " " + tr.label + "・たいようは " + App.AZ_NAME(sunAz) + "</p>" +
        '<div class="gauge"><i id="fg"></i><span id="fgt">みつ 0%</span></div>' +
        '<div class="chips"><span class="chip" id="fpol">かふん: なし</span><span class="chip" id="ffr">できた み: 0</span></div>' +
        '<p class="ptext soft" id="fhint">ハチを ゆびで うごかして はなに とまろう。★が おおい はなばたけ ほど みつが たくさん。</p>' +
        '<div class="row"><button type="button" class="btn" id="fHome">🏠 ホームへ</button></div>');
      App.$("fHome").onclick = () => App.go("home");
    },
    updPanel() {
      const fg = App.$("fg"); if (!fg) return;
      fg.style.width = Math.min(100, nectar) + "%";
      App.$("fgt").textContent = full ? "みつ いっぱい！ すへ かえろう" : "みつ " + Math.floor(nectar) + "%";
      App.$("fpol").textContent = "かふん: " + (bee.pollen ? MB.FLOWER[bee.pollen.sp].name : "なし");
      App.$("ffr").textContent = "できた み: " + todayFruit;
    },
    down(p) { target = { x: p.x, y: p.y }; },
    move(p, isDown) { if (isDown) target = { x: p.x, y: p.y }; },
    up() { /* はなした ところへ とんで いく */ },
    update(dt) {
      t += dt;
      const fr = geo.fr;
      // そだつ み
      flowers.forEach((f) => {
        if (f.state === "grow") {
          f.growT += dt;
          if (f.growT >= 3) {
            f.state = "fruit"; MB.Sound.pon(); todayFruit++;
            const first = App.addFruit(f.sp);
            App.toast((first ? "🎉 はじめて " : "") + MB.FLOWER[f.sp].name + " が できた！" + (first ? " ずかんに のったよ" : ""));
            this.updPanel();
          }
        } else if (f.state !== "fruit" && f.nectar < f.max) f.nectar = Math.min(f.max, f.nectar + dt * 0.4);
      });
      // ハチ
      const fPos = (f) => { const p = patches.find((q) => q.id === f.pid); const c = Map.pos(geo, p.az, p.dist); return { x: c.x + f.ox * fr, y: c.y + f.oy * fr }; };
      if (bee.landed) {
        const f = bee.landed, q = fPos(f);
        bee.x = q.x; bee.y = q.y; bee.vx = bee.vy = 0;
        if (target && Math.hypot(target.x - q.x, target.y - q.y) > fr * 1.6) { bee.landed = null; }
        else if (!full && f.nectar > 0) {
          const p = patches.find((q2) => q2.id === f.pid);
          const take = Math.min(f.nectar, dt * (6 + p.rich * 8));
          f.nectar -= take; nectar += take * 1.0; collected[f.pid] = (collected[f.pid] || 0) + take;
          bee.sipT += dt; if (bee.sipT > 0.5) { bee.sipT = 0; MB.Sound.sip(); }
          if (nectar >= 100) {
            nectar = 100; full = true; MB.Sound.full();
            App.toast("おなかが みつで いっぱい！ 🏠 すへ かえって なかまに おしえよう", 3500);
            App.$("fhint") && (App.$("fhint").textContent = "まんなかの すばこへ とんで かえろう。");
          }
          this.updPanel();
        } else if (!full && f.nectar <= 0 && !said["empty" + f.id]) { said["empty" + f.id] = 1; App.toast("この はなの みつは もう ない よ。ほかの はなへ"); }
        MB.Sound.buzz(0);
      } else {
        const maxV = geo.R * 1.15;
        let ax = 0, ay = 0;
        if (target) {
          const dx = target.x - bee.x, dy = target.y - bee.y, d = Math.hypot(dx, dy);
          const want = Math.min(maxV, d * 4);
          const tvx = d > 0.5 ? (dx / d) * want : 0, tvy = d > 0.5 ? (dy / d) * want : 0;
          ax = (tvx - bee.vx) * 8; ay = (tvy - bee.vy) * 8;
        } else { ax = -bee.vx * 4; ay = -bee.vy * 4; }
        bee.vx += ax * dt; bee.vy += ay * dt;
        bee.x += bee.vx * dt; bee.y += bee.vy * dt;
        bee.x = Math.max(4, Math.min(geo.w - 4, bee.x)); bee.y = Math.max(4, Math.min(geo.h - 4, bee.y));
        const sp = Math.hypot(bee.vx, bee.vy);
        if (sp > 8) bee.h = Math.atan2(bee.vx, -bee.vy);
        MB.Sound.buzz(0.35 + Math.min(1, sp / maxV) * 0.65);
        // はなに とまる
        for (const f of flowers) {
          if (f.state === "fruit" || f.state === "grow") continue;
          const q = fPos(f);
          if (Math.hypot(q.x - bee.x, q.y - bee.y) < fr * 0.9 && (!target || Math.hypot(target.x - q.x, target.y - q.y) < fr * 1.5)) { this.land(f); break; }
        }
        // すに かえる
        if (Math.hypot(bee.x - geo.cx, bee.y - geo.cy) < fr * 1.6) {
          if (full) { this.finish(); return; }
          if (nectar > 0 && t - hiveMsgT > 4) { hiveMsgT = t; App.toast("まだ みつが たりないよ（" + Math.floor(nectar) + "%）。もっと あつめよう"); }
        }
      }
      bee.flap = (bee.flap + dt * 30) % TAU;
    },
    land(f) {
      bee.landed = f;
      const p = patches.find((q) => q.id === f.pid);
      App.hideBubble();
      if (bee.pollen && bee.pollen.fid !== f.id) {
        if (bee.pollen.sp === f.sp && f.state === "open") {
          f.state = "grow"; f.growT = 0; MB.Sound.pollen(); App.S.flowers++; App.save();
          if (!said.pol) { said.pol = 1; App.toast("かふんが うつった！ " + MB.FLOWER[f.sp].name + " の みが できるよ"); }
        } else if (bee.pollen.sp !== f.sp && !said["mix" + f.sp]) {
          said["mix" + f.sp] = 1;
          App.toast(MB.FLOWER[bee.pollen.sp].name + " の かふん では " + MB.FLOWER[f.sp].name + " の みは ならないよ");
        }
      }
      bee.pollen = { sp: f.sp, fid: f.id };
      if (!said["sp" + p.id]) { said["sp" + p.id] = 1; MB.Sound.pollen(); }
      this.updPanel();
    },
    finish() {
      MB.Sound.buzz(0);
      // いちばん みつが おおい（★が おおい）はなばたけを おしえる
      const vis = patches.filter((p) => collected[p.id] > 0).sort((a, b) => (b.rich * 1000 + collected[b.id]) - (a.rich * 1000 + collected[a.id]));
      const tgt = vis[0] || patches[0];
      App.S.honey++; App.save();
      App.go("dance", {
        sunAz, trip, targetId: tgt.id,
        patches: patches.map((p) => ({ id: p.id, sp: p.sp, az: p.az, dist: p.dist, rich: p.rich, rot: p.rot })),
      });
    },
    draw(g, W, H) {
      Map.draw(g, geo);
      Map.drawSun(g, geo, sunAz, t, App.TRIPS[trip].label);
      patches.forEach((p) => Map.drawPatch(g, geo, p, { glow: true, stars: true }));
      Map.drawHive(g, geo, full, t);
      // かえりみち の やじるし
      if (full) {
        const dx = geo.cx - bee.x, dy = geo.cy - bee.y, d = Math.hypot(dx, dy);
        if (d > geo.fr * 4) {
          const ux = dx / d, uy = dy / d, sx = bee.x + ux * geo.fr * 2.2, sy = bee.y + uy * geo.fr * 2.2;
          g.strokeStyle = "rgba(255,120,0,.9)"; g.lineWidth = 4; g.setLineDash([8, 6]);
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(geo.cx - ux * geo.fr * 2, geo.cy - uy * geo.fr * 2); g.stroke(); g.setLineDash([]);
        }
      }
      A.bee(g, bee.x, bee.y, geo.fr * 1.05, bee.h, {
        flap: bee.landed ? 0.2 : 0.5 + 0.5 * Math.sin(bee.flap), pollen: bee.pollen ? MB.FLOWER[bee.pollen.sp].eye : null, happy: !!bee.landed,
      });
      if (bee.landed && !full) { // ちゅー
        g.font = "bold " + Math.round(geo.fr * 1.1) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
        g.lineWidth = 4; g.strokeStyle = "#fff"; g.strokeText("ちゅー", bee.x, bee.y - geo.fr * 1.3); g.fillStyle = "#c25e00"; g.fillText("ちゅー", bee.x, bee.y - geo.fr * 1.3);
      }
    },
    // テスト用
    _state() { return { nectar, full, patches, bee, geo }; },
    _fill() { nectar = 100; full = true; patches.forEach((p) => (collected[p.id] = p.rich)); },
  };
  App.register("field", Field);
})();
