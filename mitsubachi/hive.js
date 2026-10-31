/* ミツバチの いちにち ｜ すの なかの しごと（そうじ → こそだて → すづくり → はちみつづくり → もんばん） */
(function () {
  "use strict";
  const MB = window.MB, A = MB.Art, App = MB.App;
  const TAU = Math.PI * 2, SQ3 = Math.sqrt(3);
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

  let job, jobIdx, cells, W, H, R, cx, cy, t, me, count, goal, finished, npcs, extra, rub, talkI;

  function hexes(n) { const out = []; for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) if (Math.abs(q + r) <= n) out.push({ q, r }); return out; }
  function cellXY(c) { return { x: cx + R * SQ3 * (c.q + c.r / 2), y: cy + R * 1.5 * c.r }; }
  function cellAt(p) {
    let best = null, bd = R * 0.95;
    for (const c of cells) { const q = cellXY(c), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  const shuffle = (a) => a.sort(() => Math.random() - 0.5);

  const Hive = {
    enter(opts) {
      jobIdx = opts.job == null ? MB.jobForAge(App.S.age) : opts.job;
      job = MB.JOBS[jobIdx];
      t = 0; count = 0; finished = false; npcs = []; extra = {}; rub = 0; talkI = { queen: 0, drone: 0 };
      me = { x: 0, y: 0, tx: 0, ty: 0, h: 0, busy: 0, onDone: null };
      const n = job.id === "honey" ? 1 : 2;
      cells = hexes(n).map((c) => Object.assign(c, { kind: "empty" }));
      if (job.id === "clean") {
        shuffle(cells.slice()).slice(0, 10).forEach((c) => { c.kind = "dirty"; c.seed = Math.random() * 6; });
        goal = 10;
      } else if (job.id === "nurse") {
        shuffle(cells.slice()).forEach((c, i) => { if (i < 14) { c.kind = "larva"; c.size = 0.55 + Math.random() * 0.2; c.rot = Math.random() * TAU; } else if (i < 17) c.kind = "egg"; else c.kind = "cap"; });
        goal = 10; extra.hungerT = 0.5;
        npcs.push(this.npc("queen"));
      } else if (job.id === "build") {
        cells.forEach((c) => (c.kind = c.r === -2 ? "wax" : "ghost"));
        goal = cells.filter((c) => c.kind === "ghost").length;
        npcs.push(this.npc("drone"));
      } else if (job.id === "honey") {
        cells.forEach((c) => { c.kind = "honey"; c.water = 55 + Math.round(Math.random() * 25); });
        goal = cells.length;
        npcs.push(this.npc("drone"));
      } else if (job.id === "guard") {
        cells = [];
        extra.queue = shuffle(["mate", "mate", "mate", "mate", "mate", "mate", "other", "other", "other", "other"]);
        extra.vis = null; goal = 10;
      } else if (job.id === "forage") {
        App.go("field"); return;
      }
      this.resize(App.view.W, App.view.H);
      me.x = me.tx = cx; me.y = me.ty = cy + R * 3.6;
      this.panel();
      App.say("🐝", "<b>" + job.name + "</b>（" + job.days + "）<br>" + job.say);
      if (job.id === "guard") this.nextVisitor();
    },
    npc(type) { return { type, x: cx, y: cy, tx: cx, ty: cy, h: 0, wait: 0 }; },
    resize(w, h) {
      W = w; H = h;
      const n = job && job.id === "honey" ? 1 : 2;
      const cols = (2 * n + 1) * SQ3 + 1.2, rows = (2 * n) * 1.5 + 2.2;
      R = Math.min(64, Math.min(W / cols, (H * 0.86) / rows));
      cx = W / 2; cy = H * 0.47;
      if (job && job.id === "guard") { cx = W / 2; cy = H * 0.5; R = Math.min(60, Math.min(W, H) / 7); }
      npcs.forEach((p) => { p.x = p.tx = cx; p.y = p.ty = cy; });
    },
    panel() {
      let btns = "";
      if (job.id === "guard") btns = '<div class="row"><button type="button" class="btn ok" id="gIn">👍 とおす</button><button type="button" class="btn ng" id="gOut">✋ かえってね</button></div>';
      App.panel(
        '<p class="ptitle">' + job.em + " " + job.name + " <small>（" + job.days + "）</small></p>" +
        '<p class="ptext">' + job.how + "</p>" +
        '<div class="gauge"><i id="hg"></i><span id="hgt">0 / ' + goal + "</span></div>" + btns +
        '<p class="ptext soft">' + (job.id === "nurse" ? "👑 を タップすると じょおうバチが はなすよ" : job.id === "build" || job.id === "honey" ? "ずんぐりした オスバチを タップすると はなすよ" : "") + "</p>" +
        '<div class="row"><button type="button" class="btn" id="hHome">🏠 ホーム</button></div>');
      App.$("hHome").onclick = () => App.go("home");
      if (job.id === "guard") { App.$("gIn").onclick = () => this.judge(true); App.$("gOut").onclick = () => this.judge(false); }
      this.updPanel();
    },
    updPanel() {
      const g = App.$("hg"); if (!g) return;
      g.style.width = Math.min(100, (count / goal) * 100) + "%";
      App.$("hgt").textContent = count + " / " + goal;
    },
    goTo(c, cb) { const q = cellXY(c); me.tx = q.x; me.ty = q.y + R * 0.15; me.onDone = cb; },
    down(p) {
      App.hideBubble();
      if (finished) return;
      // じょおう・オスに タップ
      for (const n of npcs) {
        if (Math.hypot(n.x - p.x, n.y - p.y) < R * 0.9) { this.talk(n.type); return; }
      }
      if (job.id === "honey") { extra.last = p; return; }
      if (job.id === "guard" || me.onDone) return;
      const c = cellAt(p); if (!c) return;
      if (job.id === "clean") {
        if (c.kind !== "dirty") { if (c.kind === "empty") App.toast("そこは もう ぴかぴか！"); return; }
        c.kind = "busy"; MB.Sound.tap();
        this.goTo(c, () => { c.kind = "empty"; c.shine = 1; MB.Sound.clean(); this.score(); });
      } else if (job.id === "nurse") {
        if (c.kind !== "larva") { App.toast(c.kind === "egg" ? "これは たまご。3にち くらいで ようちゅうに なるよ" : c.kind === "cap" ? "ふたを した へや。なかで さなぎに なって いるよ" : ""); return; }
        if (!c.hungry) { App.toast("この こは いま おなか いっぱい"); return; }
        c.hungry = false; c.fed = true; MB.Sound.tap();
        this.goTo(c, () => { c.size = Math.min(1, c.size + 0.12); c.shine = 1; MB.Sound.feed(); this.score(); });
      } else if (job.id === "build") {
        if (c.kind !== "ghost") return;
        const ok = NB.some(([dq, dr]) => cells.some((d) => d.q === c.q + dq && d.r === c.r + dr && d.kind === "wax"));
        if (!ok) { App.toast("できている へやの となりに くっつけてね"); MB.Sound.ng(); return; }
        c.kind = "busy"; MB.Sound.tap();
        this.goTo(c, () => { c.kind = "wax"; c.shine = 1; MB.Sound.build(); this.score(); });
      }
    },
    move(p, isDown) {
      if (job.id !== "honey" || !isDown || finished) return;
      const l = extra.last || p; const d = Math.hypot(p.x - l.x, p.y - l.y); extra.last = p;
      if (d < 1) return;
      rub = Math.min(1, rub + d / 200);
      MB.Sound.fan();
      cells.forEach((c) => {
        if (c.kind !== "honey") return;
        c.water = Math.max(18, c.water - d * 0.03 * (0.7 + Math.random() * 0.6));
        if (c.water <= 20) { c.kind = "cap"; c.shine = 1; MB.Sound.cap(); this.score(); }
      });
    },
    up() { extra.last = null; },
    talk(type) {
      const lines = MB.TALK[type];
      const i = talkI[type]++ % lines.length;
      App.S.met[type] = true; App.save();
      App.say(type === "queen" ? "👑" : "🐝", "<b>" + (type === "queen" ? "じょおうバチ" : "オスバチ") + "</b>: " + lines[i]);
    },
    score() {
      count++; this.updPanel();
      if (count >= goal && !finished) {
        if (job.id === "clean") { finished = true; this.queenLays(); }
        else { finished = true; setTimeout(() => this.done(), 600); }
      }
    },
    queenLays() {
      const q = this.npc("queen"); q.x = -40; q.y = cy; q.lay = shuffle(cells.slice()).slice(0, 4); q.layI = 0;
      npcs.push(q);
      App.say("👑", "<b>じょおうバチ</b>: まあ、ぴかぴか！ ありがとう。きれいな へやに たまごを うむわね。");
    },
    nextVisitor() {
      if (!extra.queue.length) { finished = true; setTimeout(() => this.done(), 600); return; }
      extra.vis = { kind: extra.queue.pop(), x: cx + (Math.random() - 0.5) * W * 0.5, y: -30, ty: cy - R * 0.4, gone: 0, dir: 0 };
    },
    judge(pass) {
      const v = extra.vis; if (!v || v.y < v.ty - 4 || v.dir) return;
      const right = (v.kind === "mate") === pass;
      if (right) { MB.Sound.ok(); App.toast(pass ? "おかえり！ すの においが したね" : "よその すの ハチ。おうちへ かえってね〜"); }
      else { MB.Sound.ng(); App.toast(v.kind === "mate" ? "あれ？ この こは なかま だったよ（きいろの におい）" : "よその すの ハチ だったみたい（むらさきの におい）"); }
      v.dir = pass ? 1 : -1; count++; this.updPanel();
    },
    update(dt) {
      t += dt;
      // じぶん
      const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy);
      if (d > 2) { const sp = Math.min(d, R * 9 * dt); me.x += (dx / d) * sp; me.y += (dy / d) * sp; me.h = Math.atan2(dx, -dy); }
      else if (me.onDone) { me.busy += dt; if (me.busy > 0.35) { const cb = me.onDone; me.onDone = null; me.busy = 0; cb(); } }
      cells.forEach((c) => { if (c.shine) c.shine = Math.max(0, c.shine - dt * 1.5); });
      // こそだて: おなかが すく
      if (job.id === "nurse" && !finished) {
        extra.hungerT -= dt;
        const hungry = cells.filter((c) => c.hungry).length;
        if (extra.hungerT <= 0 && hungry < 3) {
          const cand = cells.filter((c) => c.kind === "larva" && !c.hungry);
          if (cand.length) cand[Math.floor(Math.random() * cand.length)].hungry = true;
          extra.hungerT = 0.9 + Math.random() * 0.8;
        }
      }
      // はちみつ: はねの かぜ
      rub = Math.max(0, rub - dt * 1.5);
      // じょおう・オス
      npcs.forEach((n) => {
        if (n.lay) { // たまごを うむ じょおう
          const c = n.lay[n.layI];
          if (!c) { n.tx = W + 60; n.ty = cy; if (n.x > W + 40 && !n.left) { n.left = true; setTimeout(() => this.done(), 300); } }
          else { const q = cellXY(c); n.tx = q.x; n.ty = q.y; if (Math.hypot(n.x - q.x, n.y - q.y) < 3) { n.wait += dt; if (n.wait > 0.3) { c.kind = "egged"; n.wait = 0; n.layI++; MB.Sound.step(); } } }
        } else if (Math.hypot(n.tx - n.x, n.ty - n.y) < 3) {
          n.wait += dt;
          if (n.wait > 1.5) { const c = cells[Math.floor(Math.random() * cells.length)]; if (c) { const q = cellXY(c); n.tx = q.x; n.ty = q.y; } n.wait = 0; }
        }
        const ddx = n.tx - n.x, ddy = n.ty - n.y, dd = Math.hypot(ddx, ddy);
        if (dd > 1) { const sp = Math.min(dd, (n.lay ? Math.max(R * 7, 320) : R * 1.2) * dt); n.x += (ddx / dd) * sp; n.y += (ddy / dd) * sp; n.h = Math.atan2(ddx, -ddy); }
      });
      // もんばん
      const v = extra.vis;
      if (v) {
        if (!v.dir) { v.y += Math.min(v.ty - v.y, H * 0.5 * dt); v.x += (cx - v.x) * Math.min(1, dt * 1.5); }
        else if (v.dir > 0) { v.y += H * 0.6 * dt; v.x += (cx - v.x) * dt * 4; if (v.y > H * 0.86) { extra.vis = null; this.nextVisitor(); } }
        else { v.y -= H * 0.6 * dt; v.x += (v.x < cx ? -1 : 1) * W * 0.3 * dt; if (v.y < -40) { extra.vis = null; this.nextVisitor(); } }
      }
    },
    done() {
      if (App.sceneName !== "hive") return;
      const S = App.S, cur = MB.jobForAge(S.age);
      MB.Sound.ok();
      let grow = "";
      S.jobsDone[job.id] = true;
      if (jobIdx === cur && jobIdx < MB.JOBS.length - 1) {
        const before = S.age;
        S.age = MB.JOBS[jobIdx + 1].from;
        grow = "<p>⏳ " + (S.age - before) + "にち くらい たって、<b>" + S.age + "にちめ</b> に なった。つぎの しごとは <b>" + MB.JOBS[jobIdx + 1].em + " " + MB.JOBS[jobIdx + 1].name + "</b>！</p>";
      }
      App.save();
      const nx = MB.jobForAge(S.age);
      const html = '<p class="big-em">' + job.em + "</p><h2>できた！ " + job.name + "</h2>" + grow +
        '<p class="soft">' + (job.id === "honey" ? "とろとろに なった はちみつは、ろうの ふたで とじて ふゆの ための たくわえ に なるよ。" : job.id === "build" ? "六角形の へやは すきまが なくて じょうぶ。すこしの ろうで たくさんの へやが つくれる。" : job.id === "guard" ? "もんばんは においで なかまを みわける。さわったり おどかしたり しなければ、ミツバチは ほとんど ささないよ。" : job.id === "nurse" ? "ようちゅうは 6にち くらいで おおきく なって、はたらきバチが ろうで ふたを する。なかで さなぎに なるよ。" : "きれいな へやに じょおうバチが たまごを うんだよ。") + "</p>" +
        '<div class="row"><button type="button" class="btn" id="mHome">🏠 ホーム</button>' +
        '<button type="button" class="btn main" id="mNext">' + MB.JOBS[nx].em + " " + (MB.JOBS[nx].id === "forage" ? "はなばたけへ" : MB.JOBS[nx].name) + "</button></div>";
      App.modal(html);
      App.$("mHome").onclick = () => { App.closeModal(); App.go("home"); };
      App.$("mNext").onclick = () => { App.closeModal(); MB.JOBS[nx].id === "forage" ? App.go("field") : App.go("hive", { job: nx }); };
    },
    draw(g) {
      if (job.id === "guard") return this.drawGuard(g);
      MB.drawCombBg(g, W, H);
      g.fillStyle = "rgba(60,30,0,.45)"; g.fillRect(0, 0, W, H);
      // しごとの へや
      cells.forEach((c) => {
        const q = cellXY(c);
        if (c.kind === "ghost") { A.cell(g, q.x, q.y, R, "ghost"); return; }
        if (c.kind === "busy" && job.id === "build") { A.cell(g, q.x, q.y, R, "ghost"); return; }
        const kind = c.kind === "honey" ? "honey" : c.kind === "cap" ? "cap" : c.kind === "dirty" || (c.kind === "busy" && job.id === "clean") ? "dirty" : c.kind === "wax" ? "wax" : "empty";
        A.cell(g, q.x, q.y, R, kind, { seed: c.seed, water: c.water });
        if (c.kind === "larva") {
          A.larva(g, q.x, q.y, R * 0.75 * c.size, { rot: c.rot });
          if (c.hungry) {
            const bob = Math.sin(t * 6 + c.q) * 3;
            g.fillStyle = "#fff"; g.beginPath(); g.ellipse(q.x + R * 0.5, q.y - R * 0.6 + bob, R * 0.36, R * 0.3, 0, 0, TAU); g.fill();
            g.font = Math.round(R * 0.42) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🍯", q.x + R * 0.5, q.y - R * 0.6 + bob);
          }
        }
        if (c.kind === "egg" || c.kind === "egged") A.egg(g, q.x, q.y, R);
        if (c.kind === "honey") {
          g.font = "bold " + Math.round(R * 0.36) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
          g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,.9)"; const lb = "みず " + Math.round(c.water) + "%";
          g.strokeText(lb, q.x, q.y); g.fillStyle = "#7a3e00"; g.fillText(lb, q.x, q.y);
        }
        if (c.shine) {
          g.strokeStyle = "rgba(255,255,255," + c.shine + ")"; g.lineWidth = 3;
          for (let i = 0; i < 4; i++) { const a = i * 1.57 + t * 3, r1 = R * 0.5, r2 = R * (0.75 + (1 - c.shine) * 0.4); g.beginPath(); g.moveTo(q.x + Math.cos(a) * r1, q.y + Math.sin(a) * r1); g.lineTo(q.x + Math.cos(a) * r2, q.y + Math.sin(a) * r2); g.stroke(); }
        }
      });
      // じょおう・オス
      npcs.forEach((n) => A.bee(g, n.x, n.y, R * (n.type === "queen" ? 0.62 : 0.55), n.h, { type: n.type, flap: 0.15 }));
      // じぶん
      if (job.id === "honey") {
        me.tx = me.x = cx; me.ty = me.y = cy + R * 2.6;
        g.strokeStyle = "rgba(255,255,255," + (0.2 + rub * 0.6) + ")"; g.lineWidth = 3; g.lineCap = "round";
        for (let i = 0; i < 5; i++) { const ox = (i - 2) * R * 0.5, y0 = me.y - R * 0.9 - ((t * 120 + i * 17) % (R * 1.4)); g.beginPath(); g.moveTo(cx + ox, y0); g.quadraticCurveTo(cx + ox + 6, y0 - 10, cx + ox, y0 - 20); g.stroke(); }
        A.bee(g, me.x, me.y, R * 0.6, 0, { flap: rub > 0.05 ? 0.5 + 0.5 * Math.sin(t * 60) : 0.3, happy: true });
      } else {
        A.bee(g, me.x, me.y, R * 0.55, me.h, { flap: me.onDone && me.busy ? 0.5 + 0.5 * Math.sin(t * 50) : 0.3, happy: true });
      }
    },
    drawGuard(g) {
      // すの いりぐち（そとの かべ）
      g.fillStyle = "#c98b4a"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(107,66,38,.35)"; g.lineWidth = 2;
      for (let y = 20; y < H; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 6); g.stroke(); }
      g.fillStyle = "#9ad06a"; g.fillRect(0, 0, W, H * 0.12);
      const ey = H * 0.86;
      g.fillStyle = "#2a1a08"; g.beginPath(); g.roundRect(cx - R * 2.2, ey - R * 0.35, R * 4.4, R * 0.7, R * 0.3); g.fill();
      g.font = "bold " + Math.round(R * 0.32) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "top"; g.fillStyle = "#fff"; g.fillText("いりぐち", cx, ey - R * 0.15);
      // もんばんの じぶん
      A.bee(g, cx - R * 1.3, ey - R * 0.9, R * 0.55, 0.2, { flap: 0.2, happy: true });
      A.bee(g, cx + R * 1.3, ey - R * 0.9, R * 0.5, -0.2, { flap: 0.2 });
      const v = extra.vis;
      if (v) {
        if (!v.dir && v.y >= v.ty - 4) {
          // におい
          const col = v.kind === "mate" ? "255,212,59" : "151,117,250";
          for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(" + col + ",.35)"; A.circ(g, v.x + Math.cos(t * 2 + i * 2) * R * 0.5, v.y + Math.sin(t * 2 + i * 2) * R * 0.4, R * 0.7); g.fill(); }
          g.font = Math.round(R * 0.45) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#333";
          g.fillText(v.kind === "mate" ? "♪" : "？", v.x + R * 0.9, v.y - R * 0.7);
        }
        A.bee(g, v.x, v.y, R * 0.55, v.dir < 0 ? Math.PI * 0.9 : Math.PI, { flap: 0.5 + 0.5 * Math.sin(t * 40), pollen: v.kind === "mate" ? "#ffb300" : null });
      }
      // みほん
      g.font = "bold " + Math.round(Math.max(12, R * 0.3)) + "px sans-serif"; g.textAlign = "left"; g.textBaseline = "top";
      g.fillStyle = "rgba(255,255,255,.88)"; g.beginPath(); g.roundRect(8, 8, R * 4.4, R * 0.95, 10); g.fill();
      g.fillStyle = "#b07d00"; g.fillText("● きいろ ＝ なかまの におい", 14, 12);
      g.fillStyle = "#6741d9"; g.fillText("● むらさき ＝ よその す", 14, 12 + R * 0.42);
    },
    _state() { return { job: job.id, count, goal, finished }; },
    _finish() { // テスト用: しごとを ぜんぶ おわらせる
      count = goal - 1; finished = false; this.score();
    },
  };
  App.register("hive", Hive);
})();
