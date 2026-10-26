"use strict";
/* てんくうエレベーター - がめん（かごの なか・ホール・ポケット・ふくしゅう・マップ・せってい） */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LS = 'tenku-elevator-v1';
  const qs = new URLSearchParams(location.search);
  const SPEED = Math.max(1, Math.min(8, parseFloat(qs.get('speed')) || 1));   // テストよう（ふつうは 1）

  /* ---------- ほぞん ---------- */
  function defaults() {
    return { floor: 1, visited: [], cards: [], friends: {}, gates: {}, review: { n: 0, ok: 0 }, n: 0,
      set: { sound: true, voice: true, bgm: true, tod: 'auto', weather: 'auto', sort: 'got' } };
  }
  let save = defaults();
  try {
    const s = JSON.parse(localStorage.getItem(LS) || 'null');
    if (s && typeof s === 'object') {
      save = Object.assign(defaults(), s);
      save.set = Object.assign(defaults().set, s.set || {});
      if (!Lift.valid(save.floor)) save.floor = 1;
      save.cards = (save.cards || []).filter(c => c && Words.get(c.id));
      save.visited = (save.visited || []).filter(Lift.valid);
      if (!save.gates || typeof save.gates !== 'object') save.gates = {};
    }
  } catch (e) { save = defaults(); }
  function persist() { try { localStorage.setItem(LS, JSON.stringify(save)); } catch (e) { /* ほぞん できなくても あそべる */ } }
  const visited = new Set(save.visited);
  const owned = () => new Set(save.cards.map(c => c.id));
  function visit(n) { if (!visited.has(n)) { visited.add(n); save.visited = [...visited]; persist(); } }

  /* ---------- じかん・てんき ---------- */
  function tod() {
    if (save.set.tod !== 'auto') return save.set.tod;
    const h = new Date().getHours();
    return h >= 5 && h < 9 ? 'asa' : h >= 9 && h < 16 ? 'hiru' : h >= 16 && h < 19 ? 'yu' : 'yoru';
  }
  const night = () => tod() === 'yoru';
  let wx = { kind: 'hare', slot: -1, rainbowUntil: 0 };
  function weather(now) {
    if (save.set.weather !== 'auto') return save.set.weather;
    const slot = Math.floor(Date.now() / 150000);
    if (slot !== wx.slot) {
      const r = Floors.rng(slot)();
      const k = r < .55 ? 'hare' : r < .78 ? 'kumori' : 'ame';
      if (wx.kind === 'ame' && k !== 'ame') wx.rainbowUntil = now + 60;
      wx.kind = k; wx.slot = slot;
    }
    return wx.kind;
  }

  /* ---------- エレベーター ---------- */
  const view = { mode: 'car', floor: save.floor, talking: false };
  const riders = [];
  const arrivals = [];   // ついた かいの きろく（テストよう）   // のって いる おともだち { id, dest }
  const sim = Lift.create(save.floor, onEvent);
  let awayTimer = 0;

  function onEvent(name, d) {
    if (name === 'arrive') {
      arrivals.push(d.floor);
      SND.chime(d.dir >= 0);
      save.floor = d.floor; persist();
      // のって いる おともだちが おりる
      for (let i = riders.length - 1; i >= 0; i--) {
        if (riders[i].dest === d.floor) {
          const f = Friends.get(riders[i].id);
          riders.splice(i, 1);
          sayToast(`${f.name}「ここで おりるね！ またね〜」`, f);
        }
      }
      if (view.mode === 'car') toast(`${Lift.yomi(d.floor)} です`);
      if (view.mode === 'hall' && d.floor === view.floor) { $('#hMsg').textContent = 'エレベーターが きたよ！ 🛗 のる を おしてね'; }
      updatePanels();
    } else if (name === 'door') {
      if (d.phase === 'opening') SND.door(true);
      if (d.phase === 'closing') SND.door(false);
      updatePanels();
    } else if (name === 'depart' || name === 'pass') {
      updatePanels();
    }
  }

  /* ---------- にゅうりょく（テンキー） ---------- */
  const entry = { digits: '', b: false };
  function showEntry(msg, err) {
    const v = (entry.b ? 'B ' : '') + entry.digits;
    $('#eVal').textContent = v || ' ';
    $('#eHint').textContent = msg || (v ? 'いく！ を おしてね' : 'いきたい かいを おしてね');
    $('#entry').classList.toggle('err', !!err);
    $('#kB').setAttribute('aria-pressed', String(entry.b));
  }
  function key(d) {
    SND.unlock(); SND.beep();
    if (entry.digits.length >= 3) entry.digits = '';
    entry.digits = (entry.digits + d).replace(/^0+(?=\d)/, '');
    showEntry();
  }
  function register(n, quiet) {
    const r = sim.press(n);
    if (r === true) { if (!quiet) toast(`${Lift.yomi(n)} を とうろく`); SND.beep(); }
    else if (r === false) { toast(`${Lift.yomi(n)} を とりけし`); SND.pop(); }
    else if (r === null) { toast(`いまは ${Lift.yomi(n)} だよ`); }
    updatePanels();
    return r;
  }
  function go() {
    SND.unlock();
    if (!entry.digits) { showEntry('かずを おしてね', true); SND.bad(); return; }
    const p = Lift.parseEntry(entry.digits, entry.b);
    if (!p.ok) { const typed = (entry.b ? 'B' : '') + entry.digits; entry.digits = ''; entry.b = false; showEntry(p.msg, true); $('#eVal').textContent = typed; SND.bad(); speak(p.msg); return; }
    entry.digits = ''; entry.b = false; showEntry();
    register(p.floor);
  }

  /* ---------- のる・おりる ---------- */
  function alight() {
    if (sim.moving || !(sim.door.phase === 'open' || sim.door.phase === 'opening')) return;
    const n = sim.at;
    view.mode = 'hall'; view.floor = n; save.floor = n;
    visit(n);
    sim.open();
    hideBubble();
    setMode();
    startTalk(n);
    clearTimeout(awayTimer);
    // しばらく すると だれかが エレベーターを よぶ（よびボタンを つかう ため）
    awayTimer = setTimeout(maybeAway, 9000);
  }
  function maybeAway() {
    if (view.mode !== 'hall' || riders.length || sim.busy() || view.talking) { awayTimer = setTimeout(maybeAway, 4000); return; }
    const r = Math.random();
    let n = view.floor + Math.round((r < .5 ? -1 : 1) * (20 + Math.random() * 160));
    n = Math.max(Lift.MIN, Math.min(Lift.MAX, n)); if (n === 0) n = 1;
    if (n === view.floor) return;
    sim.call(n, n > 0 && n < Lift.MAX ? (Math.random() < .5 ? 1 : -1) : n === Lift.MAX ? -1 : 1);
    $('#hMsg').textContent = `だれかが ${Lift.yomi(n)}で エレベーターを よんだみたい。`;
  }
  function board() {
    if (sim.moving || sim.at !== view.floor || !(sim.door.phase === 'open' || sim.door.phase === 'opening')) return;
    clearTimeout(awayTimer);
    endTalk();
    view.mode = 'car'; setMode();
    sim.open();
    // ときどき おともだちも いっしょに のる
    const fl = Floors.get(view.floor);
    const f = Friends.present(fl.friend, night(), fl.deco.seed);
    if (f && Math.random() < .4 && !riders.some(x => x.id === f.id) && riders.length < 3) {
      let dest;
      for (let i = 0; i < 10; i++) {
        const d = view.floor + (Math.random() < .5 ? -1 : 1) * Math.round(15 + Math.random() * 150);
        if (Lift.valid(d) && d !== view.floor) { dest = d; break; }
      }
      if (dest) {
        riders.push({ id: f.id, dest });
        setTimeout(() => { sim.press(dest); sayToast(`${f.name}「わたしも のる！ わたしは ${Lift.yomi(dest)}！」`, f); updatePanels(); }, 700);
      }
    }
    updatePanels();
  }

  /* ---------- おともだちの はなし ---------- */
  const talk = { lines: [], i: 0, floor: null, friend: null, give: null };
  function startTalk(n) {
    const fl = Floors.get(n), w = Words.get(fl.word);
    const f = Friends.present(fl.friend, night(), fl.deco.seed);
    const met = save.friends[f.id] || 0;
    save.friends[f.id] = met + 1; persist();
    const have = owned().has(w.id);
    const L = [];
    L.push(met ? `また あったね！ ${f.name.split(' ').pop()} だよ。あうのは ${met + 1}かいめ だね。` : f.hi);
    if (fl.special) L.push(fl.special.say);
    L.push(`ここは ${fl.yomi}。${fl.line}`);
    L.push(w.ex);
    const g = Floors.gate(n);
    if (g && !save.gates[n]) L.push(`この かいには あいことばの とびらが あるよ。なぞは「${g.question}」 ポケットの カードで こたえてね。`);
    else if (g) L.push('あいことばの とびらは もう ひらいてるね。ひみつの たからもの、みてね！');
    if (have) L.push(`「${w.k}」の カードは もう もってるね！ いみは おぼえてる？ ${w.mean}`);
    else L.push(`この かいの ことばは「${w.k}」。カードを あげるね！`);
    Object.assign(talk, { lines: L, i: 0, floor: n, friend: f, give: have ? null : w.id });
    view.talking = true;
    layoutTalk();
    $('#tWho').textContent = f.name + (met ? `　💛 なかよし ${Math.min(5, met + 1)}` : '');
    $('#talk').classList.add('show');
    showLine();
  }
  function showLine() {
    const s = talk.lines[talk.i];
    $('#tSay').innerHTML = Words.ruby(s);
    $('#tNext').textContent = talk.i < talk.lines.length - 1 ? 'つぎ ▶' : talk.give ? '🎁 もらう' : 'おわり';
    speak(Words.plain(s), talk.friend);
  }
  function nextLine() {
    SND.unlock();
    if (talk.i < talk.lines.length - 1) { talk.i++; showLine(); return; }
    if (talk.give) { giveCard(talk.give, talk.friend.id, talk.floor); talk.give = null; }
    endTalk();
    $('#hMsg').textContent = `${Floors.get(view.floor).name}。▲▼ で エレベーターを よべるよ。`;
    const g = Floors.gate(view.floor);
    if (g && !save.gates[view.floor]) { $('#hMsg').textContent = '🔑 あいことばの とびらに こたえて みよう！'; openGate(); }
  }

  /* ---------- あいことばの とびら ---------- */
  function openGate() {
    const g = Floors.gate(view.floor);
    if (!g) return;
    const body = $('#gateBody');
    const done = !!save.gates[view.floor];
    const fr = Friends.get(Floors.get(view.floor).friend);
    let html = `<div class="gq">🔑 ${Words.ruby(g.question)}</div>`;
    if (done) {
      html += `<div class="empty">とびらは もう ひらいて いるよ！<br>ひみつの たからもの ${Object.keys(save.gates).length} / ${Object.keys(Floors.GATES).length}</div>`;
      body.innerHTML = html; openDlg('#dGate'); return;
    }
    if (!save.cards.length) html += '<div class="empty">ポケットが からっぽ。ことばを あつめて きてね。</div>';
    else html += '<div class="qask" style="margin-bottom:8px">ポケットから こたえの カードを えらんでね</div><div class="gcards" id="gcards"></div>';
    html += '<div class="fb" id="gfb"></div><div class="acts"><button class="sub" id="gHint">💡 ヒント</button></div>';
    body.innerHTML = html;
    const box = $('#gcards');
    if (box) Pocket.sort(save.cards, 'aiueo').forEach(c => {
      const w = Words.get(c.id);
      const b = document.createElement('button');
      b.innerHTML = `<div class="mini" style="${catStyle(w)}"><div class="wd">${Words.ruby(w.k)}</div></div>`;
      b.addEventListener('click', () => answerGate(g, c.id, b));
      box.appendChild(b);
    });
    $('#gHint').addEventListener('click', () => {
      const h = g.hints[0];
      $('#gfb').innerHTML = h.floor ? `💡 こたえの ことばは ${Lift.yomi(h.floor)}の おともだちが もってるよ。` : '💡 まどの そとを よく みてね。';
    });
    openDlg('#dGate');
    speak(Words.plain(g.question), fr);
  }
  function answerGate(g, id, btn) {
    if (g.accept.includes(id)) {
      save.gates[g.n] = Date.now(); persist();
      SND.card(); SND.ok();
      $('#gfb').innerHTML = `⭕ せいかい！「${Words.ruby(Words.get(id).k)}」で とびらが ひらいた！`;
      toast('🔓 とびらが ひらいた！ ひみつの たからもの を みつけた！', 2600);
      speak('せいかい！ とびらが ひらいたよ', Friends.get(Floors.get(g.n).friend));
      $('#hMsg').textContent = `🔓 とびらが ひらいた！ ひみつの たからもの ${Object.keys(save.gates).length} / ${Object.keys(Floors.GATES).length}`;
      setTimeout(() => $('#dGate').close(), 1600);
      updatePanels();
    } else {
      SND.ng(); btn.querySelector('.mini').classList.add('ng');
      $('#gfb').textContent = '🔺 ちがうみたい。べつの カードで ためして みてね。';
    }
  }
  function endTalk() { view.talking = false; $('#talk').classList.remove('show'); VOICE.stop(); }

  function giveCard(id, from, floor) {
    if (owned().has(id)) return false;
    save.n = (save.n || 0) + 1;
    save.cards.push({ id, at: save.n, from, floor, lv: 0, due: 0 });
    persist(); SND.card(); updateBadge();
    const w = Words.get(id);
    toast(`🎁「${Words.surface(w.k)}」を ポケットに いれた！`);
    newCard = id;
    return true;
  }
  let newCard = null;

  /* ---------- こえ ---------- */
  function speak(text, f) { if (!save.set.voice) return; VOICE.say(text, f ? f.pitch : 1, f ? f.rate : 1); }
  function sayToast(text, f) { toast(text, 3200); speak(text.replace(/^.*?「/, '').replace(/」$/, ''), f); }

  /* ---------- ひょうじ ---------- */
  let toastT = 0;
  function toast(msg, ms = 1800) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
  }
  function arrow() { const v = sim.speed(); return Math.abs(v) > .05 ? (v > 0 ? '▲' : '▼') : sim.st.dir > 0 ? '△' : sim.st.dir < 0 ? '▽' : ''; }
  function setMode() {
    $('#carPanel').hidden = view.mode !== 'car';
    $('#hallPanel').hidden = view.mode !== 'hall';
    $('#app').classList.toggle('hall', view.mode === 'hall');
    hideBubble();
    updatePanels();
  }
  let lastRegs = '';
  function updatePanels() {
    const nowF = sim.floorNow();
    $('#cNum').textContent = Lift.label(nowF); $('#hNum').textContent = Lift.label(nowF);
    $('#cArw').textContent = arrow(); $('#hArw').textContent = arrow();
    $('#tFloor').textContent = view.mode === 'hall' ? `｜${Lift.yomi(view.floor)}` : '';
    const open = !sim.moving && (sim.door.phase === 'open' || sim.door.phase === 'opening');
    $('#kOut').disabled = !open;
    // とうろく ちゅうの かい
    const regs = [...sim.st.car].sort((a, b) => b - a);
    const key = regs.join(',') + '|' + riders.map(r => r.dest).join(',');
    if (key !== lastRegs) {
      lastRegs = key;
      const box = $('#regs'); box.innerHTML = '';
      if (!regs.length) box.innerHTML = '<span class="none">とうろく した かいが ひかるよ（もう いちど おすと とりけし）</span>';
      regs.forEach(n => {
        const b = document.createElement('button');
        const rider = riders.find(r => r.dest === n);
        b.className = 'chip' + (rider ? ' rider' : '');
        b.textContent = (rider ? '🙋 ' : '') + Lift.label(n);
        b.setAttribute('aria-label', `${Lift.yomi(n)}（おすと とりけし）`);
        b.addEventListener('click', () => register(n));
        box.appendChild(b);
      });
    }
    // ホール
    if (view.mode === 'hall') {
      const n = view.floor;
      $('#cUp').disabled = n === Lift.MAX; $('#cDn').disabled = n === Lift.MIN;
      $('#cUp').setAttribute('aria-pressed', String(sim.st.up.has(n)));
      $('#cDn').setAttribute('aria-pressed', String(sim.st.down.has(n)));
      $('#hRide').disabled = !(open && sim.at === n);
      const g = Floors.gate(n);
      $('#hGate').hidden = !g;
      if (g) $('#hGate').textContent = save.gates[n] ? '🔓 ひらいた とびら' : '🔑 あいことばの とびら';
    }
  }
  function updateBadge() { $('#pCount').textContent = save.cards.length; }

  /* ---------- かく ---------- */
  const cv = $('#cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, hits = [];
  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function envNow(t) {
    const wth = weather(t);
    return { h: sim.car.h, v: sim.car.v, t, tod: tod(), weather: wth, rainbow: t < wx.rainbowUntil };
  }

  function drawCar(t) {
    const env = envNow(t);
    hits = [];
    const bw = Math.round(W * (W > H ? .2 : .26));     // たてもの がわ（ドア）
    const R = { x: bw, y: 0, w: W - bw, h: H };
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    Scenery.outside(ctx, R, env, hits);
    Scenery.speedLines(ctx, R, sim.car.v, t);
    ctx.restore();

    // たてもの がわ: かいの ゆか が ながれる
    const floorY = H * .8, sb = H / 15;             // 1m = sb px、かごの ゆか = floorY
    const h = sim.car.h;
    const z = Floors.zoneOf(sim.floorNow());
    const wg = ctx.createLinearGradient(0, 0, bw, 0);
    wg.addColorStop(0, Scenery.mix(z.wall[1], '#000000', .35)); wg.addColorStop(1, Scenery.mix(z.wall[0], '#000000', .15));
    ctx.fillStyle = wg; ctx.fillRect(0, 0, bw, H);
    const blur = Math.min(40, Math.abs(sim.car.v) * .25);
    const nLo = Math.floor((h - (H - floorY) / sb) / 4) - 1, nHi = Math.ceil((h + floorY / sb) / 4) + 1;
    for (let k = nLo; k <= nHi; k++) {
      const n = k; if (!Lift.valid(n)) continue;
      const y = floorY - (n * 4 - h) * sb;
      ctx.fillStyle = '#343a40'; ctx.fillRect(0, y - 3, bw, 6 + blur * .3);
      if (blur < 6) {
        ctx.fillStyle = '#ffd43b'; ctx.font = `bold ${Math.round(Math.min(18, sb * 1.1))}px sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(Lift.label(n), 6, y - 6);
      }
    }
    if (blur > 3) { ctx.fillStyle = `rgba(255,255,255,${Math.min(.2, blur / 200)})`; ctx.fillRect(0, 0, bw, H); }
    // かごの ドア
    const dh = 2.4 * sb, dx = bw * .12, dw = bw * .76;
    const open = sim.door.p;
    const atF = Lift.floorAt(h), fl = Floors.get(atF);
    const hz = Floors.zone(fl.zone);
    // ドアの むこう（ホール）
    const inside = !sim.moving && open > 0 ? hz.wall[1] : '#212529';
    Scenery.doors(ctx, dx, floorY - dh, dw, dh, open, inside);
    if (open > .3 && !sim.moving) {
      ctx.save(); ctx.beginPath(); ctx.rect(dx + dw / 2 * (1 - open), floorY - dh, dw * open, dh); ctx.clip();
      ctx.fillStyle = hz.floor; ctx.fillRect(dx, floorY - dh * .2, dw, dh * .2);
      const f = Friends.present(fl.friend, night(), fl.deco.seed);
      if (f) Friends.draw(ctx, f, dx + dw / 2, floorY - dh * .35, dh * .45, t);
      ctx.restore();
    }
    // かごの わく
    ctx.fillStyle = '#1d2b3a'; ctx.fillRect(0, 0, W, H * .035);
    ctx.fillStyle = '#c5d3e0'; ctx.fillRect(bw - 4, 0, 8, H);
    const nb = W > H ? 3 : 2;
    for (let i = 1; i < nb; i++) ctx.fillRect(bw + (W - bw) * i / nb - 3, 0, 6, floorY);
    // てすり
    ctx.fillStyle = 'rgba(220,230,240,.9)'; ctx.fillRect(bw, floorY - H * .17, W - bw, 6);
    // ゆか
    const fg = ctx.createLinearGradient(0, floorY, 0, H);
    fg.addColorStop(0, '#8aa0b6'); fg.addColorStop(1, '#4a5d70');
    ctx.fillStyle = fg; ctx.fillRect(0, floorY, W, H - floorY);
    // ガラスの ひかり
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath(); ctx.moveTo(bw + 20, 0); ctx.lineTo(bw + 90, 0); ctx.lineTo(bw + 30, floorY); ctx.lineTo(bw - 40, floorY); ctx.fill();
    // のって いる おともだち
    riders.forEach((r, i) => {
      const f = Friends.get(r.id), s = Math.min(H * .2, 90);
      const x = bw + 30 + s * .6 + i * s * 1.1, y = floorY - s * .5 + 6;
      Friends.draw(ctx, f, x, y, s, t, { fly: f.kind === 'bird' });
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `bold ${Math.round(s * .2)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(`→${Lift.label(r.dest)}`, x, floorY + s * .25);
    });
  }

  function drawHall(t) {
    const env = envNow(t);
    hits = [];
    const fl = Floors.get(view.floor);
    const R = { x: 0, y: 0, w: W, h: H };
    Scenery.hall(ctx, R, fl, env);
    const wy = H * .72;
    // エレベーターの ドア
    const dw = Math.min(W * .3, H * .38), dh = Math.min(H * .52, dw * 1.45), dx = W * .2 - dw / 2 + Math.max(0, W * .06), dy = wy - dh;
    const here = !sim.moving && sim.at === view.floor;
    const open = here ? sim.door.p : 0;
    Scenery.doors(ctx, dx, dy, dw, dh, open, '#e9eef3');
    if (open > .2) {
      ctx.save(); ctx.beginPath(); ctx.rect(dx + dw / 2 * (1 - open), dy, dw * open, dh); ctx.clip();
      ctx.fillStyle = 'rgba(165,216,255,.45)'; ctx.fillRect(dx, dy, dw, dh * .7);
      riders.forEach((r, i) => Friends.draw(ctx, r.id, dx + dw * (.35 + i * .3), dy + dh * .7, dh * .25, t));
      ctx.restore();
    }
    // かいすう ひょうじ（ドアの うえ）
    ctx.fillStyle = '#10202f'; const ih = Math.max(26, dh * .14);
    ctx.fillRect(dx + dw * .2, dy - ih - 8, dw * .6, ih);
    ctx.fillStyle = '#ffb84d'; ctx.font = `bold ${Math.round(ih * .7)}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${arrow()} ${Lift.label(sim.floorNow())}`, dx + dw / 2, dy - ih / 2 - 8);
    // よびボタン（かべ）
    const bx = dx + dw + 14, by = dy + dh * .4;
    ctx.fillStyle = '#ced4da'; ctx.fillRect(bx - 4, by - 8, 26, 58);
    [['▲', sim.st.up.has(view.floor), view.floor !== Lift.MAX], ['▼', sim.st.down.has(view.floor), view.floor !== Lift.MIN]].forEach(([s, lit, show], i) => {
      if (!show) return;
      ctx.fillStyle = lit ? '#ffd43b' : '#f8f9fa'; ctx.beginPath(); ctx.arc(bx + 9, by + 8 + i * 24, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#495057'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(s, bx + 9, by + 9 + i * 24);
    });
    // かんばん
    const sw = Math.min(W * .42, 300), sx = W - sw - 14, sy = 12;
    ctx.fillStyle = 'rgba(16,32,47,.85)'; roundRect(sx, sy, sw, 64, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = `bold ${Math.round(Math.min(30, sw * .12))}px sans-serif`; ctx.fillText(`${fl.label}F`, sx + 12, sy + 8);
    ctx.font = `bold ${Math.round(Math.min(15, sw * .055))}px sans-serif`; ctx.fillStyle = '#ffe066';
    ctx.fillText(fl.special ? `⭐ ${fl.special.name}` : `${Floors.zone(fl.zone).emoji} ${fl.zoneName}`, sx + 12, sy + 42);
    // あいことばの とびら
    const gt = Floors.gate(view.floor);
    if (gt) {
      const gw = Math.min(W * .16, H * .22), gh = gw * 1.5, gx = W * .5 - gw / 2, gy = wy - gh;
      ctx.fillStyle = '#5c3d1e'; ctx.fillRect(gx - 6, gy - 6, gw + 12, gh + 6);
      if (save.gates[view.floor]) {
        const lg = ctx.createRadialGradient(gx + gw / 2, gy + gh / 2, 0, gx + gw / 2, gy + gh / 2, gw);
        lg.addColorStop(0, '#fff9db'); lg.addColorStop(1, '#ffd43b');
        ctx.fillStyle = lg; ctx.fillRect(gx, gy, gw, gh);
        ctx.fillStyle = '#a0522d'; ctx.fillRect(gx - gw * .35, gy, gw * .35, gh);
        Props.draw(ctx, gt.prize, gx + gw / 2, gy + gh * .75, gw * .6, t);
        Props.draw(ctx, 'gem', gx + gw / 2, gy + gh * .32, gw * .3, t);
      } else {
        ctx.fillStyle = '#8d5a2b'; ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#5c3d1e'; ctx.lineWidth = 3; ctx.strokeRect(gx + gw * .1, gy + gh * .08, gw * .8, gh * .38); ctx.strokeRect(gx + gw * .1, gy + gh * .52, gw * .8, gh * .4);
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(gx + gw * .5, gy + gh * .5, gw * .1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5c3d1e'; ctx.fillRect(gx + gw * .48, gy + gh * .5, gw * .04, gw * .12);
      }
      ctx.fillStyle = '#ffd43b'; ctx.font = `bold ${Math.round(gw * .16)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(save.gates[view.floor] ? 'ひらいた！' : 'あいことば', gx + gw / 2, gy - 8);
    }
    // こもの と おともだち
    let fs = Math.min(H * .34, W * .3), fx = W * .8, fy = wy - fs * .2;
    Props.draw(ctx, fl.prop, gt ? W * .64 : W * .58, wy + H * .12, Math.min(H * .16, 90), t);
    // はなして いる ときは ふきだしに かぶらない ばしょへ
    if (view.talking) ({ fs, fx, fy } = friendSpot(fs, fx, fy));
    const f = Friends.present(fl.friend, night(), fl.deco.seed);
    if (f) Friends.draw(ctx, f, fx, fy, fs, t, { wave: view.talking, open: view.talking && Math.sin(t * 12) > 0 });
  }
  /* ふきだし（#talk）を よけて おともだちを かく ばしょと おおきさ。
   * よこに ひろい がめんは ふきだしを ひだりに よせて みぎに、たてながは ふきだしの うえに。
   * おともだちの え は だいたい (y - .7s)〜(y + .55s) に おさまる */
  function friendSpot(fs, fx, fy) {
    const tk = $('#talk'), cr = cv.getBoundingClientRect(), r = tk.getBoundingClientRect();
    const side = tk.classList.contains('side');
    if (side) {
      const left = r.right - cr.left + 12, room = W - left - 8;
      fs = Math.min(fs, room / 1.15);
      return { fs, fx: left + room / 2, fy: Math.min(fy, H - 8 - fs * .55) };
    }
    const top = r.top - cr.top - 14, ceil = 84;          // かんばんの した 〜 ふきだしの うえ
    fs = Math.max(40, Math.min(fs, (top - ceil) / 1.25));
    fy = Math.min(fy, top - fs * .55);
    return { fs, fx, fy };
  }
  function layoutTalk() {
    const tk = $('#talk'), side = W >= 640 && W > H * 1.1;
    tk.classList.toggle('side', side);
    // しっぽは おともだちの ほうへ
    tk.style.setProperty('--tail', side ? '' : `${Math.round(W * .8 - 8)}px`);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* たかさメーター */
  const meter = $('#meter');
  (function buildMeter() {
    Floors.LANDMARKS.filter(l => l.h <= 2000).forEach(l => { const d = document.createElement('div'); d.className = 'lm'; d.style.top = `calc(${(1 - (l.h + 200) / 2200) * 100}% - 1px)`; d.title = l.name; meter.appendChild(d); });
  })();
  function updateHud() {
    const h = sim.car.h, eye = view.mode === 'hall' ? Lift.alt(view.floor) : h;
    $('#alt').textContent = `${Lift.label(Lift.floorAt(eye))}かい・たかさ ${Math.round(eye)}m`;
    $('#cmp').textContent = Floors.compare(eye);
    $('#mk').style.top = `calc(${(1 - (h + 200) / 2200) * 100}% - 2px)`;
  }

  /* ---------- まいフレーム ---------- */
  let last = 0, ambT = 0, panelT = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    const now = ts / 1000, dt = last ? Math.min(.05, now - last) : .016; last = now;
    for (let i = 0; i < SPEED; i++) sim.tick(dt);
    resize();
    if (view.mode === 'car') drawCar(now); else { if (view.talking) layoutTalk(); drawHall(now); }
    updateHud();
    panelT -= dt; if (panelT <= 0) { panelT = .2; updatePanels(); }
    // おと
    SND.wind(Math.min(1, Math.abs(sim.car.v) / 120));
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 2 + Math.random() * 4;
      const h = view.mode === 'hall' ? Lift.alt(view.floor) : sim.car.h;
      if (h < -40 && Math.abs(sim.car.v) < 3) SND.drip();
      else if (h > 100 && h < 1600 && !night() && Math.random() < .5) SND.bird();
      else if (h > 100 && h < 420 && Math.random() < .4) SND.gull();
    }
    const zf = view.mode === 'hall' ? view.floor : sim.floorNow();
    SND.bgm(Floors.zoneOf(zf).id);
  }

  /* ---------- まどの タップ ---------- */
  function hideBubble() { $('#bubble').hidden = true; }
  cv.addEventListener('click', e => {
    SND.unlock();
    if (view.mode !== 'car') return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let hit = null;
    for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { hit = h; break; } }
    if (!hit) { hideBubble(); return; }
    const w = Words.scene(hit.key);
    if (!w) { hideBubble(); return; }
    const b = $('#bubble');
    const have = owned().has(w.id);
    b.innerHTML = `<b>${Words.ruby(w.k)}</b><p>${Words.ruby(w.mean)}</p><button ${have ? 'class="done"' : ''}>${have ? '✓ もう もってるよ' : '🫙 ポケットへ'}</button>`;
    b.hidden = false;
    const bw = Math.min(240, r.width - 16);
    b.style.left = Math.max(8, Math.min(r.width - bw - 8, x - bw / 2)) + 'px';
    b.style.top = Math.max(8, Math.min(r.height - b.offsetHeight - 8, y - b.offsetHeight - 12)) + 'px';
    speak(Words.plain(w.k));
    b.querySelector('button').addEventListener('click', ev => {
      ev.stopPropagation();
      if (giveCard(w.id, 'mado', sim.floorNow())) { b.querySelector('button').className = 'done'; b.querySelector('button').textContent = '✓ いれたよ'; }
    });
  });

  /* ---------- ダイアログ ---------- */
  function openDlg(id) { const d = $(id); if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } }
  $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  const catStyle = w => `--cc:${Words.CATS[w.cat].color}`;
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  function renderPocket() {
    const cards = save.cards;
    const jars = $('#jars'); jars.innerHTML = '';
    const counts = {}; cards.forEach(c => { const w = Words.get(c.id); counts[w.cat] = (counts[w.cat] || 0) + 1; });
    const mx = Math.max(5, ...Object.values(counts));
    for (const [k, c] of Object.entries(Words.CATS)) {
      const n = counts[k] || 0;
      const d = document.createElement('div'); d.className = 'jar'; d.style.cssText = `--cc:${c.color}`;
      d.innerHTML = `<div class="gl"><div class="fill" style="height:${n / mx * 100}%"></div><div class="n">${n}</div></div>${c.short}`;
      jars.appendChild(d);
    }
    $$('#sortSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === save.set.sort)));
    const box = $('#cards'); box.innerHTML = '';
    if (!cards.length) { box.innerHTML = '<div class="empty" style="grid-column:1/-1">まだ からっぽ。<br>かいに おりて おともだちから ことばを もらおう！<br>まどの そとを タップしても あつめられるよ。</div>'; return; }
    Pocket.sort(cards, save.set.sort).forEach(c => {
      const w = Words.get(c.id);
      const b = document.createElement('button');
      b.innerHTML = `<div class="mini${c.id === newCard ? ' new' : ''}" style="${catStyle(w)}"><div class="wd">${Words.ruby(w.k)}</div><div class="lv">${stars(c.lv || 0)}</div></div>`;
      b.addEventListener('click', () => showCard(c.id));
      box.appendChild(b);
    });
  }
  function showCard(id) {
    const w = Words.get(id), c = save.cards.find(x => x.id === id);
    const f = c && Friends.get(c.from);
    const rel = (a, label) => a.length ? `<div class="kv"><b>${label}</b>${a.map(x => { const o = Words.get(x); return o ? Words.ruby(o.k) : Words.esc(x); }).join('・')}</div>` : '';
    $('#cardBody').innerHTML = `
      <div class="card" style="${catStyle(w)}">
        <span class="cat">${Words.CATS[w.cat].name}</span> <span class="stars" title="むずかしさ">むずかしさ ${'★'.repeat(w.lv)}</span>
        <div class="wd">${Words.ruby(w.k)}</div>
        <div class="kv"><b>いみ</b>${Words.ruby(w.mean)}</div>
        <div class="ex">💬 ${Words.ruby(w.ex)}</div>
        ${rel(w.syn, 'にた ことば')}${rel(w.ant, 'はんたいの ことば')}
        ${c ? `<div class="kv"><b>おぼえた ど</b><span style="color:#fab005">${stars(c.lv || 0)}</span></div>
        <div class="kv"><b>くれた</b>${c.from === 'mado' ? 'まどの そと' : f ? Words.esc(f.name) : ''}（${Lift.yomi(c.floor)}）</div>` : ''}
      </div>
      <div class="acts"><button class="sub" id="cdSpeak">🔈 よむ</button>${c ? `<button id="cdGo">🛗 ${Lift.label(c.floor)}かいへ いく</button>` : ''}</div>`;
    $('#cdSpeak').addEventListener('click', () => VOICE.say(Words.plain(w.k) + '。' + Words.plain(w.ex)));
    const g = $('#cdGo');
    if (g) g.addEventListener('click', () => { closeAll(); goFloor(c.floor); });
    openDlg('#dCard');
  }
  function closeAll() { $$('dialog').forEach(d => d.open && d.close()); }
  /* ほかの がめんから「その かいへ いく」 */
  function goFloor(n) {
    if (view.mode === 'hall') {
      if (n === view.floor) { toast('いま この かいに いるよ'); return; }
      sim.call(view.floor, n > view.floor ? 1 : -1);
      pendingDest = n;
      toast(`エレベーターを よんだよ。のったら ${Lift.yomi(n)}へ`);
    } else register(n);
    updatePanels();
  }
  let pendingDest = null;

  /* ふくしゅう */
  const rv = { q: null, qn: 0, last: null, answered: false };
  function renderReview() {
    const body = $('#revBody');
    if (save.cards.length < 3) { body.innerHTML = `<div class="empty">ことばを 3つ あつめたら ふくしゅう できるよ。<br>いま ${save.cards.length}こ。</div>`; return; }
    const card = Pocket.nextCard(save.cards, Date.now(), rv.qn, rv.last);
    const q = card && Pocket.makeQuestion(card, save.cards);
    if (!q) { body.innerHTML = '<div class="empty">もんだいが つくれなかったよ。</div>'; return; }
    rv.q = q; rv.answered = false;
    body.innerHTML = `<div class="stat"><span>✅ ${save.review.ok} / ${save.review.n}</span></div>
      <div class="qtext">${Words.ruby(q.q)}</div>${q.ask ? `<div class="qask">${q.ask}</div>` : ''}
      <div class="choices">${q.choices.map((c, i) => `<button data-i="${i}">${Words.ruby(c.text)}</button>`).join('')}</div>
      <div class="fb" id="fb"></div><div class="acts" id="rvNext" hidden><button>つぎの もんだい ▶</button></div>`;
    speak(Words.plain(q.q));
    body.querySelectorAll('.choices button').forEach(b => b.addEventListener('click', () => answer(+b.dataset.i)));
    body.querySelector('#rvNext button').addEventListener('click', renderReview);
  }
  function answer(i) {
    if (rv.answered) return;
    rv.answered = true;
    const q = rv.q, ok = q.choices[i].ok;
    const card = save.cards.find(c => c.id === q.id);
    Pocket.grade(card, ok, Date.now(), rv.qn);
    rv.qn++; rv.last = q.id;
    save.review.n++; if (ok) save.review.ok++;
    persist();
    $$('#revBody .choices button').forEach((b, j) => { if (q.choices[j].ok) b.classList.add('ok'); else if (j === i) b.classList.add('ng'); });
    const w = Words.get(q.id);
    $('#fb').innerHTML = ok ? `⭕ せいかい！ 「${Words.ruby(w.k)}」 ${stars(card.lv)}` : `🔺 ざんねん。こたえは みどりの ところ。また でるよ。`;
    if (ok) SND.ok(); else SND.ng();
    $('#rvNext').hidden = false;
  }

  /* マップ */
  function renderMap() {
    const got = new Set(save.cards.map(c => c.floor));
    const wordFloors = new Set(save.cards.filter(c => c.from !== 'mado').map(c => c.floor));
    const body = $('#mapBody');
    let html = `<div class="stat"><span>🚶 いった かい ${visited.size} / ${Lift.COUNT}</span><span>🎁 ことばを もらった かい ${wordFloors.size} / ${Lift.COUNT}</span><span>🔑 とびら ${Object.keys(save.gates).length} / ${Object.keys(Floors.GATES).length}</span></div>
      <div class="legend"><span><i style="background:#a5d8ff"></i>いった</span><span><i style="background:#fab005"></i>ことばを もらった</span><span><i style="outline:2px solid #e03131;background:#fff"></i>いま</span></div><div class="map">`;
    const here = view.mode === 'hall' ? view.floor : sim.floorNow();
    for (const z of [...Floors.ZONES].reverse()) {
      html += `<div class="zl">${z.emoji} ${z.name}（${Lift.label(z.from)}〜${Lift.label(z.to)}）</div>`;
      const fls = []; for (let n = z.to; n >= z.from; n--) if (n !== 0) fls.push(n);
      for (let i = 0; i < fls.length; i += 10) {
        const row = fls.slice(i, i + 10).reverse();
        html += `<div class="lab">${Lift.label(row[0])}〜</div>`;
        for (const n of row) html += `<button data-n="${n}" class="${wordFloors.has(n) ? 'g' : visited.has(n) ? 'v' : ''}${n === here ? ' here' : ''}" aria-label="${Lift.yomi(n)}"></button>`;
        for (let k = row.length; k < 10; k++) html += '<span></span>';
      }
    }
    body.innerHTML = html + '</div>';
    body.querySelectorAll('.map button').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.n; const fl = Floors.get(n);
      toast(`${Lift.yomi(n)}${fl.special ? '（' + fl.special.name + '）' : ''}`);
      if (confirmGo === n) { closeAll(); goFloor(n); confirmGo = null; } else { confirmGo = n; toast(`${Lift.yomi(n)}：もう いちど おすと いくよ`); }
    }));
    void got;
  }
  let confirmGo = null;

  /* とくべつな かい */
  function renderSpecials() {
    const box = $('#spList'); box.innerHTML = '';
    for (const n of Floors.specials()) {
      const sp = Floors.SPECIAL[n];
      const b = document.createElement('button');
      b.className = (sim.st.car.has(n) ? 'on ' : '') + (visited.has(n) ? 'got' : '');
      const g = Floors.GATES[n];
      b.innerHTML = `<b>${Lift.label(n)}かい${g ? (save.gates[n] ? ' 🔓' : ' 🔑') : ''}</b>${Words.esc(sp.name)}`;
      b.addEventListener('click', () => { closeAll(); goFloor(n); });
      box.appendChild(b);
    }
  }

  /* せってい */
  function renderSettings() {
    const opt = (key, list) => `<div class="seg" data-k="${key}">${list.map(([v, l]) => `<button data-v="${v}" aria-pressed="${save.set[key] === v}">${l}</button>`).join('')}</div>`;
    $('#setBody').innerHTML = `
      <div><h3>🕐 じかん</h3>${opt('tod', [['auto', 'たんまつの じかん'], ['asa', 'あさ'], ['hiru', 'ひる'], ['yu', 'ゆうがた'], ['yoru', 'よる']])}</div>
      <div><h3>🌦️ てんき</h3>${opt('weather', [['auto', 'ときどき かわる'], ['hare', 'はれ'], ['kumori', 'くもり'], ['ame', 'あめ']])}</div>
      <div><h3>🎵 おんがく（BGM）</h3>${opt('bgm', [[true, 'オン'], [false, 'オフ']])}</div>
      <div><h3>🗑️ さいしょから</h3><div class="seg"><button class="danger" id="reset">きろくを ぜんぶ けす</button></div></div>`;
    $$('#setBody .seg[data-k] button').forEach(b => b.addEventListener('click', () => {
      const k = b.parentElement.dataset.k; let v = b.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      save.set[k] = v; persist();
      if (k === 'bgm') SND.setBgm(v);
      renderSettings();
    }));
    let armed = false;
    $('#reset').addEventListener('click', e => {
      if (!armed) { armed = true; e.target.textContent = 'ほんとうに けす？ もう いちど おしてね'; return; }
      try { localStorage.removeItem(LS); } catch (er) {}
      location.reload();
    });
  }

  /* ---------- ボタン ---------- */
  $$('#pad [data-d]').forEach(b => b.addEventListener('click', () => key(b.dataset.d)));
  $('#kB').addEventListener('click', () => { SND.unlock(); SND.beep(); entry.b = !entry.b; showEntry(); });
  $('#kDel').addEventListener('click', () => { SND.beep(); if (entry.digits) entry.digits = entry.digits.slice(0, -1); else entry.b = false; showEntry(); });
  $('#kGo').addEventListener('click', go);
  $('#kOpen').addEventListener('click', () => { SND.unlock(); SND.beep(); if (sim.moving) { toast('うごいて いる ときは ひらかないよ'); return; } sim.open(true); updatePanels(); });
  $('#kClose').addEventListener('click', () => { SND.unlock(); SND.beep(); sim.close(); updatePanels(); });
  $('#kOut').addEventListener('click', () => { SND.unlock(); alight(); });
  $$('.quick [data-f]').forEach(b => b.addEventListener('click', () => { SND.unlock(); register(+b.dataset.f); }));
  $('#qNew').addEventListener('click', () => {
    SND.unlock();
    const cand = Lift.all().filter(n => !visited.has(n) && n !== sim.floorNow() && !sim.st.car.has(n));
    if (!cand.length) { toast('ぜんぶの かいに いったよ！ すごい！'); return; }
    const n = cand[Math.floor(Math.random() * cand.length)];
    register(n, true); toast(`🎲 ${Lift.yomi(n)}へ いってみよう！`); speak(`${Lift.yomi(n)}へ いってみよう`);
  });
  $('#qSp').addEventListener('click', () => { renderSpecials(); openDlg('#dSp'); });
  $('#cUp').addEventListener('click', () => { SND.unlock(); SND.beep(); if (sim.call(view.floor, 1)) $('#hMsg').textContent = 'よんだよ。エレベーターを まってね。'; updatePanels(); });
  $('#cDn').addEventListener('click', () => { SND.unlock(); SND.beep(); if (sim.call(view.floor, -1)) $('#hMsg').textContent = 'よんだよ。エレベーターを まってね。'; updatePanels(); });
  $('#hRide').addEventListener('click', () => { SND.unlock(); board(); if (pendingDest != null) { register(pendingDest); pendingDest = null; } });
  $('#hTalk').addEventListener('click', () => { SND.unlock(); startTalk(view.floor); });
  $('#hGate').addEventListener('click', () => { SND.unlock(); openGate(); });
  $('#tNext').addEventListener('click', nextLine);
  $('#tAgain').addEventListener('click', showLine);
  $('#bPocket').addEventListener('click', () => { SND.unlock(); renderPocket(); openDlg('#dPocket'); });
  $$('#sortSeg button').forEach(b => b.addEventListener('click', () => { save.set.sort = b.dataset.s; persist(); renderPocket(); }));
  $('#bReview').addEventListener('click', () => { SND.unlock(); renderReview(); openDlg('#dReview'); });
  $('#bMap').addEventListener('click', () => { confirmGo = null; renderMap(); openDlg('#dMap'); });
  $('#bSet').addEventListener('click', () => { renderSettings(); openDlg('#dSet'); });
  function syncToggles() {
    $('#bSound').setAttribute('aria-pressed', String(save.set.sound)); $('#bSound').textContent = save.set.sound ? '🔊' : '🔈';
    $('#bVoice').setAttribute('aria-pressed', String(save.set.voice));
    SND.set(save.set.sound); SND.setBgm(save.set.bgm); VOICE.set(save.set.voice);
  }
  $('#bSound').addEventListener('click', () => { SND.unlock(); save.set.sound = !save.set.sound; persist(); syncToggles(); toast(save.set.sound ? 'おと オン' : 'おと オフ'); });
  $('#bVoice').addEventListener('click', () => { save.set.voice = !save.set.voice; persist(); syncToggles(); toast(save.set.voice ? 'こえ オン' : 'こえ オフ'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) VOICE.stop(); });

  // はじめ
  syncToggles(); updateBadge(); showEntry(); setMode();
  visit(save.floor);
  toast(save.floor === 1 ? '🌤️ ようこそ！ いきたい かいを おしてね' : `${Lift.yomi(save.floor)}から スタート`, 2600);
  requestAnimationFrame(loop);

  // テストよう（tools/tenku-elevator/e2e.js が よむ）
  window.TE = { sim, view, save, riders, arrivals, Floors, Words, giveCard, openGate };
})();
