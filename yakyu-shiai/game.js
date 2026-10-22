// やきゅう しあい — しあいの すすめかた・そうさ・おと・じっきょう・ほぞん
(function () {
  "use strict";
  const { TEAMS } = window.YT;
  const YS = window.YS, YA = window.YA, YR = window.YR, YC = window.YC;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const AUTO = qs.get("auto") === "1";          // テスト用: にんげんの ぶんも じどうで うごく
  const SPEED = AUTO ? 4 : 1;
  const KEY = "yakyu-shiai-v1";

  // ===== ほぞん =====
  const blankRec = () => ({ w: 0, l: 0, d: 0 });
  let save = {
    sound: true, voice: true, innings: 3, level: 1, my: 0, opp: 1, order: 0, autoField: false,
    rec: [blankRec(), blankRec(), blankRec()], two: 0, career: {}, lessonDone: false,
  };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s === "object") save = Object.assign(save, s);
  } catch (e) { /* よめなくても あそべる */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* むし */ } }

  // ===== おと（WebAudio の ごうせいおん） =====
  let AC = null, noiseBuf = null;
  function ac() {
    if (!save.sound) return null;
    if (!AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function env(a, t, vol, attack, decay) {
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(a.destination);
    return g;
  }
  function tone(freq, when, vol, attack, decay, type, freqEnd, lp) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    let node = o;
    if (lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(env(a, t, vol, attack, decay));
    o.start(t); o.stop(t + attack + decay + 0.05);
  }
  function noise(when, vol, attack, decay, ftype, freq, q, freqEnd) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const src = a.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = a.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    src.connect(f); f.connect(env(a, t, vol, attack, decay));
    src.start(t); src.stop(t + attack + decay + 0.05);
  }
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, C6: 1047 };
  const sfx = {
    beep() { tone(990, 0, 0.1, 0.005, 0.1); },
    pitch() { noise(0, 0.18, 0.02, 0.15, "bandpass", 700, 2, 1600); },
    whiff() { noise(0, 0.22, 0.03, 0.15, "bandpass", 500, 1.5, 250); },
    crack(strong) {   // カキーン
      noise(0, strong ? 0.8 : 0.5, 0.002, 0.05, "highpass", 1500, 0.7);
      tone(strong ? 2100 : 1500, 0, strong ? 0.35 : 0.2, 0.002, strong ? 0.45 : 0.12, "triangle");
      if (strong) tone(3150, 0, 0.18, 0.002, 0.35, "sine");
    },
    mitt() {          // パシッ
      noise(0, 0.6, 0.001, 0.06, "highpass", 2200, 0.8);
      tone(160, 0, 0.35, 0.002, 0.08, "sine", 90);
    },
    bunt() { tone(700, 0, 0.2, 0.002, 0.06, "triangle"); noise(0, 0.25, 0.001, 0.04, "highpass", 1200, 1); },
    cheer(len) {      // かんせい
      const L = len || 1.4;
      noise(0.02, 0.16, 0.3, L, "bandpass", 1100, 0.6);
      noise(0.08, 0.1, 0.25, L * 0.9, "bandpass", 2300, 0.8);
      noise(0.0, 0.08, 0.2, L * 0.8, "bandpass", 500, 0.7);
    },
    ooh() { noise(0, 0.1, 0.25, 0.8, "bandpass", 600, 1.2, 380); },
    out() { tone(392, 0, 0.12, 0.01, 0.16, "square", null, 1400); tone(294, 0.16, 0.12, 0.01, 0.25, "square", null, 1400); },
    // ブラスバンド ふう の おうえん（チャンス）
    brass() {
      const a = ac(); if (!a) return;
      const mel = [[N.G4, 0, 0.18], [N.G4, 0.2, 0.18], [N.C5, 0.4, 0.18], [N.E5, 0.6, 0.18], [N.G5, 0.8, 0.5], [N.E5, 1.4, 0.18], [N.G5, 1.6, 0.7]];
      mel.forEach(([f, w, d]) => {
        tone(f, w, 0.09, 0.02, d, "sawtooth", null, 2200);
        tone(f / 2, w, 0.07, 0.02, d, "square", null, 900);
      });
      [0, 0.4, 0.8, 1.2, 1.6].forEach((w) => { tone(110, w, 0.35, 0.003, 0.12, "sine", 55); noise(w + 0.2, 0.12, 0.002, 0.06, "highpass", 3000, 1); });
    },
    fanfare() {
      [[N.C5, 0], [N.E5, 0.13], [N.G5, 0.26], [N.C6, 0.39]].forEach(([f, w], i) => {
        tone(f, w, 0.13, 0.01, i === 3 ? 0.7 : 0.14, "sawtooth", null, 2600);
        tone(f * 0.5, w, 0.1, 0.01, i === 3 ? 0.7 : 0.14, "triangle");
      });
    },
    whistle() { tone(2100, 0, 0.12, 0.01, 0.35, "sine", 2300); },
    end() { [N.G4, N.E4, N.G4, N.C5].forEach((f, i) => tone(f, 0.17 * i, 0.15, 0.01, 0.22, "triangle")); },
  };

  // ===== じっきょうの こえ =====
  const plain = (s) => String(s).replace(/<rt>.*?<\/rt>/g, "").replace(/<[^>]+>/g, "").replace(/[⚾🎉💨🙈🔄…]/gu, "");
  function speak(text) {
    if (!save.voice || AUTO || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text));
      u.lang = "ja-JP"; u.rate = 1.08; u.pitch = 1.1;
      speechSynthesis.speak(u);
    } catch (e) { /* こえが でなくても よい */ }
  }
  function talk(text, opt) {
    $("talkText").innerHTML = text;
    $("talk").classList.toggle("hot", !!(opt && opt.hot));
    if (!opt || opt.say !== false) speak(text);
  }

  // ===== がめん =====
  YR.init($("cv"));
  let view = { kind: "idle" };
  let bigText = null;
  const NOW = () => performance.now() / 1000;
  let last = NOW();
  function frame() {
    const n = NOW(), dt = Math.min(0.05, n - last);
    last = n;
    YR.clear();
    if (view.kind === "pitch") YR.drawPitchScene(Object.assign({}, view, { time: n }));
    else if (view.kind === "play") {
      if (!view.paused) view.t = Math.min(view.t + dt * SPEED * (view.ff ? 3 : 1), view.tEnd || 1e9);
      view.time = n;
      YR.drawPlay3D(view);
    } else YR.drawIdle();
    YR.drawFx(dt);
    if (bigText && n - bigText.t0 < bigText.dur) YR.big(bigText.text, bigText.color, n - bigText.t0, bigText.sub);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener("resize", () => { YR.resize(); placeThrowPick(); });
  new ResizeObserver(() => YR.resize()).observe($("stage"));
  function showBig(text, color, dur, sub) { bigText = { text, color, sub, t0: NOW(), dur: dur || 1.6 }; }
  // バッティングセンターと おなじ ひとこと
  function timingWord(dtn) {
    if (Math.abs(dtn) <= YS.WIN.just * 0.6) return "ぴったり！";
    return dtn < 0 ? "ちょっと はやい" : "ちょっと おそい";
  }

  // ===== しあいの じょうたい =====
  let G = null;
  const ABORT = { abort: true };
  const pending = new Set();
  function sleep(ms) {
    const g = G;
    return new Promise((res) => setTimeout(res, ms / SPEED)).then(() => { if (!G || G !== g || g.dead) throw ABORT; });
  }
  function raf() { const g = G; return new Promise((r) => requestAnimationFrame(r)).then(() => { if (!G || G !== g || g.dead) throw ABORT; }); }
  // にんげんの にゅうりょくを まつ（やめたら とまる）
  function waitInput(setup) {
    const g = G;
    return new Promise((res) => {
      const done = (v) => { pending.delete(done); res(v); };
      pending.add(done);
      setup(done);
    }).then((v) => { if (!G || G !== g || g.dead) throw ABORT; return v; });
  }
  function abortAll() { pending.forEach((d) => d(null)); pending.clear(); }

  const ctlOf = (g, t) => g.ctl[t];
  const isHuman = (g, t) => g.ctl[t] === "human";
  const teamName = (g, t) => g.teams[t].name;

  // ===== うえの ひょうじ =====
  function updHud() {
    if (!G) return;
    const st = G.st;
    const set = (id, t) => {
      const el = $(id);
      el.querySelector(".em").textContent = G.teams[t].emoji;
      el.querySelector(".r").textContent = st.runs[t];
      el.classList.toggle("bat", st.half === t && !st.over);
    };
    set("sbAway", 0); set("sbHome", 1);
    $("sbInn").innerHTML = st.inning + "かい<br>" + (st.half ? "うら" : "おもて");
    const dots = (row, n) => [...document.querySelectorAll(".bso > div")[row].querySelectorAll("i")].forEach((d, i) => d.classList.toggle("on", i < n));
    dots(0, st.balls); dots(1, st.strikes); dots(2, st.outs);
    $("dia").querySelector(".b1").classList.toggle("on", !!st.bases[0]);
    $("dia").querySelector(".b2").classList.toggle("on", !!st.bases[1]);
    $("dia").querySelector(".b3").classList.toggle("on", !!st.bases[2]);
  }
  function updWho() {
    const st = G.st, bt = st.half, ft = 1 - bt;
    const b = G.teams[bt].players[YS.batterIdx(st)];
    const p = YA.defOf(G.teams[ft])[0];
    $("who").innerHTML = "<span>🏏 " + (YS.batterIdx(st) + 1) + "ばん " + b.emoji + " " + b.name + "</span><span>⚾ " + p.emoji + " " + p.name + "</span>";
  }
  function showPane(id) {
    ["pBat", "pPitch", "pWait"].forEach((p) => ($(p).hidden = p !== id));
  }

  function updToggles() {
    $("bSound").textContent = save.sound ? "🔊" : "🔇";
    $("bVoice").classList.toggle("off", !save.voice);
    $("mSound").textContent = save.sound ? "🔊 おと オン" : "🔇 おと オフ";
    $("mVoice").textContent = save.voice ? "🗣️ こえ オン" : "🤐 こえ オフ";
    $("cAutoField").checked = !!save.autoField;
  }
  function toggleSound() { save.sound = !save.sound; store(); updToggles(); if (save.sound) sfx.beep(); }
  function toggleVoice() {
    save.voice = !save.voice; store(); updToggles();
    if (!save.voice && "speechSynthesis" in window) try { speechSynthesis.cancel(); } catch (e) { /* むし */ }
  }
  $("bSound").onclick = toggleSound; $("mSound").onclick = toggleSound;
  $("bVoice").onclick = toggleVoice; $("mVoice").onclick = toggleVoice;
  $("cAutoField").onchange = (e) => { save.autoField = e.target.checked; store(); };

  // ===== にんげんの ピッチング =====
  let pType = "fast";
  const grid = $("grid");
  for (let i = 0; i < 9; i++) {
    const b = document.createElement("button");
    b.dataset.cell = i;
    b.setAttribute("aria-label", "コース " + (i + 1));
    b.textContent = i === 4 ? "◎" : "・";
    grid.appendChild(b);
  }
  document.querySelectorAll(".ptype").forEach((b) => (b.onclick = () => {
    pType = b.dataset.t;
    document.querySelectorAll(".ptype").forEach((x) => x.classList.toggle("on", x === b));
    sfx.beep();
  }));
  function humanPitch(g, hidden) {
    showPane("pPitch");
    $("pitchHint").innerHTML = hidden
      ? "🙈 バッターは みないでね！ " + teamName(g, 1 - g.st.half) + "が えらぶ"
      : "たまを えらんで、なげる ところを タップ！";
    view.showZone = !hidden;
    return waitInput((done) => {
      if (AUTO) { setTimeout(() => done(YA.cpuPitch(g.st, 1, g.rnd)), 250); return; }
      grid.onclick = (e) => {
        const b = e.target.closest("button[data-cell]");
        if (!b) return;
        grid.onclick = null;
        done({ type: pType, cell: +b.dataset.cell, ctrl: 1 });
      };
    }).then((v) => { grid.onclick = null; return v; });
  }

  // ===== にんげんの バッティング =====
  let batOpt = { bunt: false, steal: null };
  function canSteal(st) {
    if (st.bases[0] && !st.bases[1]) return 0;
    if (st.bases[1] && !st.bases[2]) return 1;
    return null;
  }
  function showBatPane(g) {
    showPane("pBat");
    const st = g.st;
    $("bBunt").classList.toggle("on", batOpt.bunt);
    $("bBunt").textContent = batOpt.bunt ? "🫳 バント する" : "🫳 バント";
    const cs = canSteal(st);
    $("bSteal").disabled = cs == null || st.outs >= 3;
    $("bSteal").classList.toggle("on", batOpt.steal != null);
    $("bSteal").textContent = batOpt.steal != null ? "💨 はしる！" : cs === 1 ? "💨 3るいへ とうるい" : "💨 とうるい";
    $("batHint").innerHTML = batOpt.bunt ? "バント！ ボールが きたら バットに あてるよ（タップ なし）" : "ボールが きたら がめんを タップ！ ひだり→レフト／みぎ→ライト";
  }
  $("bBunt").onclick = () => { if (!G) return; batOpt.bunt = !batOpt.bunt; sfx.beep(); showBatPane(G); };
  $("bSteal").onclick = () => {
    if (!G) return;
    const cs = canSteal(G.st);
    batOpt.steal = batOpt.steal != null || cs == null ? null : cs;
    sfx.beep(); showBatPane(G);
  };

  let swingHandler = null;
  function stageTap(e) {
    if (swingHandler) { swingHandler(e); return; }
    if (view.kind === "play" && !view.paused) view.ff = true;   // タップで はやおくり
  }
  $("stage").addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; stageTap(e); });
  document.addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "Enter") && swingHandler) { e.preventDefault(); swingHandler({ clientX: null }); }
  });

  // スイングを まつ。かえす: { dtn, aim } / { bunt } / null（みのがし）
  function humanSwing(g, pitch, arrive, bunt) {
    const winScale = YS.clamp(0.55 + pitch.time * SPEED * 0.6, 1, 1.4);
    return waitInput((done) => {
      let swung = false, tm = null;
      const finish = (v) => { swingHandler = null; clearTimeout(tm); done(v); };
      const later = (at, fn) => { tm = setTimeout(fn, Math.max(0, (at - NOW()) * 1000)); };
      if (AUTO) {
        const b = g.teams[g.st.half].players[YS.batterIdx(g.st)];
        const sw = g.lesson ? (g.lesson.forceBall ? { dtn: 0, aim: 0 } : null) : YA.cpuSwing(g.st, pitch, b, 1, g.rnd, { bunt });
        later(sw && !sw.bunt ? arrive + sw.dtn / SPEED : arrive, () => { if (sw && !sw.bunt) view.swingT0 = NOW(); finish(sw); });
        return;
      }
      if (bunt) {
        // バント: ボールが きたら あてる。おおきく はずれたら バットを ひく
        later(arrive, () => finish(YS.outside(pitch) > 0.35 ? null : { bunt: true }));
        return;
      }
      swingHandler = (e) => {
        if (swung) return;
        const n = NOW();
        if (n < (view.pitchT0 || 1e9)) { view.swingT0 = n; sfx.whiff(); return; }   // れんしゅうの すぶり
        swung = true;
        clearTimeout(tm);
        view.swingT0 = n; sfx.whiff();
        const dtn = (n + YS.LEAD - arrive) / winScale;
        const rect = $("stage").getBoundingClientRect();
        const aim = e.clientX == null ? 0 : YR.aimFromX(e.clientX - rect.left);
        tm = setTimeout(() => finish({ dtn, aim }), YS.LEAD * 1000);
      };
      later(arrive + 0.2, () => { if (!swung) finish(null); });
    });
  }

  // ===== しゅびで なげる るいを えらぶ =====
  function placeThrowPick() {
    const tp = $("throwPick");
    if (tp.hidden) return;
    tp.querySelectorAll(".base").forEach((b) => {
      if (b.dataset.b === "auto") { b.style.left = "calc(100% - 62px)"; b.style.top = "calc(100% - 34px)"; return; }
      const p = YR.screenOfBase(+b.dataset.b);
      const off = { 1: [34, 0], 2: [0, -30], 3: [-34, 0], 4: [-60, -8] }[b.dataset.b];
      b.style.left = (p.x + off[0]) + "px"; b.style.top = (p.y + off[1]) + "px";
    });
  }
  function pickThrow() {
    const tp = $("throwPick");
    tp.hidden = false;
    placeThrowPick();
    return waitInput((done) => {
      if (AUTO) { setTimeout(() => done("auto"), 600); return; }
      tp.onclick = (e) => {
        const b = e.target.closest("button[data-b]");
        if (!b) return;
        done(b.dataset.b === "auto" ? "auto" : +b.dataset.b);
      };
    }).then((v) => { tp.hidden = true; tp.onclick = null; return v; }, (e) => { tp.hidden = true; throw e; });
  }

  // ===== じっきょう =====
  const FIELD_WORD = ["ピッチャー", "キャッチャー", "ファースト", "セカンド", "サード", "ショート", "レフト", "センター", "ライト"];
  function playWords(res, scored, st) {
    const f = res.fe && res.fe.f != null ? FIELD_WORD[res.fe.f] : "";
    let s;
    switch (res.kind) {
      case "hr": s = "うったー！ おおきい おおきい… はいった！ ホームラン！！"; break;
      case "inside": s = "うったー！ ぐんぐん はしる… ランニング ホームラン！！"; break;
      case "triple": s = "うったー！ " + f + " の おくへ！ スリーベース ヒット！"; break;
      case "double": s = "うったー！ " + f + " の よこを ぬけた！ ツーベース ヒット！"; break;
      case "single": s = res.fe.f >= 6 ? "うったー！ " + f + " まえ ヒット！" : "はしった はしった！ ないや ヒット！"; break;
      case "groundout": s = f + " ゴロ… 1るい アウト！"; break;
      case "stretch": s = "うったー！ " + f + " まえ ヒット！ でも つぎの るいを ねらって タッチアウト！"; break;
      case "fly": s = "あがった！ " + f + " フライ… とった！ アウト！"; break;
      case "pop": s = "ポーンと あがった… " + f + " が とって アウト！"; break;
      case "liner": s = "ライナー！ " + f + " が ジャンプして とった！ アウト！"; break;
      case "foulfly": s = "ファウルフライ… とった！ アウト！"; break;
      case "sf": s = f + " フライ！ タッチアップで ホームへ！"; break;
      case "sac": s = "バント せいこう！ ランナーが すすんだ！"; break;
      case "dp": s = "ゲッツー！ いっきに アウト 2つ！"; break;
      case "fc": s = f + " ゴロ… まえの ランナーが アウト！"; break;
      case "error": s = "あっ！ エラー！ そのあいだに セーフ！"; break;
      case "foul": s = "ファウル！"; break;
      default: s = "セーフ！";
    }
    if (res.kind !== "foul" && res.outs.some((o) => !o.batter) && !["dp", "fc"].includes(res.kind)) s += " ランナーは タッチアウト！";
    if (scored > 0 && res.kind !== "hr") s += " " + scored + "てん はいった！";
    if (st.over && st.walkoff) s += " サヨナラ〜！！";
    return s;
  }

  // ===== 1きゅう =====
  async function pitchOnce(g) {
    const st = g.st, bt = st.half, ft = 1 - bt;
    const batT = g.teams[bt], defT = g.teams[ft];
    const def = YA.defOf(defT), bat = batT.players;
    const batter = bat[YS.batterIdx(st)], pitcher = def[0];
    const L = g.lesson;
    updHud(); updWho();
    view = {
      kind: "pitch", fieldTeam: defT, batTeam: batT, pitcher, batter, pitch: null, pitchT0: null, windupT0: null,
      swingT0: null, showZone: false, target: null, ring: isHuman(g, bt), bunt: false,
      def, bat, bases: st.bases.slice(),
    };
    $("aimGuide").classList.toggle("show", isHuman(g, bt));
    const newPA = st.balls === 0 && st.strikes === 0;
    if (newPA && !L) {
      talk((YS.batterIdx(st) + 1) + "ばん " + batter.name, { say: true });
      if ((st.bases[1] || st.bases[2]) && isHuman(g, bt)) sfx.brass();
    }
    batOpt = { bunt: false, steal: null };
    const hiddenPitch = isHuman(g, ft) && isHuman(g, bt);
    // 1. どの たまを なげるか
    let sel;
    if (L && L.pitch) {
      showBatPane(g);
      await sleep(900);
      sel = { type: L.pitch.type || "fast", cell: 4, ctrl: 0 };
    } else if (isHuman(g, ft)) {
      sel = await humanPitch(g, hiddenPitch);
    } else {
      if (isHuman(g, bt)) showBatPane(g);
      else { showPane("pWait"); $("waitHint").textContent = "あいての こうげき…"; }
      await sleep(isHuman(g, bt) ? 1300 : 700);
      sel = YA.cpuPitch(st, g.level, g.rnd);
    }
    if (isHuman(g, bt)) showBatPane(g); else { showPane("pWait"); $("waitHint").textContent = "あいてが うつよ… よく みてね"; }
    view.showZone = isHuman(g, ft) && !hiddenPitch;
    view.target = isHuman(g, ft) && !hiddenPitch ? sel.cell : null;
    // 2. なげる
    const baseTime = isHuman(g, ft) ? (isHuman(g, bt) ? 1.1 : 1.0) : YA.LEVELS[g.level].pitchTime;
    const pitch = YS.makePitch(sel.type, sel.cell, pitcher, baseTime, g.rnd, sel.ctrl);
    if (L && L.pitch) Object.assign(pitch, { x: L.pitch.x, y: L.pitch.y }, { inZone: Math.abs(L.pitch.x) <= 1 && Math.abs(L.pitch.y) <= 1 });
    view.windupT0 = NOW();
    await sleep(hiddenPitch ? 1600 : 800);
    // CPU の バッターの さくせん
    let bunt, steal;
    if (isHuman(g, bt)) { bunt = batOpt.bunt; steal = batOpt.steal; }
    else { bunt = L ? false : YA.cpuBunt(st, batter, g.rnd); steal = L ? null : YA.cpuSteal(st, bat, g.level, g.rnd); }
    view.bunt = bunt;
    if (steal != null) talk("ランナー スタート！", { say: false });
    const pt = pitch.time / SPEED;
    view.pitch = Object.assign({}, pitch, { time: pt });
    view.pitchT0 = NOW();
    const arrive = view.pitchT0 + pt;
    sfx.pitch();
    // 3. うつ
    let swing;
    if (isHuman(g, bt)) swing = await humanSwing(g, view.pitch, arrive, bunt);
    else {
      swing = YA.cpuSwing(st, pitch, batter, g.level, g.rnd, { bunt });
      const at = swing && !swing.bunt ? arrive + (swing.dtn - YS.LEAD) / SPEED : arrive;
      await sleep(Math.max(0, (at - NOW()) * 1000) * SPEED);
      if (swing && !swing.bunt) { view.swingT0 = NOW(); sfx.whiff(); }
      await sleep(swing && !swing.bunt ? YS.LEAD * 1000 * SPEED : 0);
    }
    let c = swing ? YS.contact(pitch, swing, batter, g.rnd) : null;
    // おけいこ: タイミングが だいたい あえば きまった だきゅうに する
    if (L && L.forceBall && swing) c = Math.abs(swing.dtn || 0) < 0.2 ? { kind: "inplay", ball: L.forceBall, q: 0.8, just: true } : { kind: "miss" };
    $("aimGuide").classList.remove("show");
    const word = isHuman(g, bt) && swing && !swing.bunt && swing.dtn != null ? timingWord(swing.dtn) : null;

    if (!c || c.kind !== "inplay") {
      // ボールが キャッチャーへ
      await sleep(Math.max(0, (arrive + 0.05 - NOW()) * 1000) * SPEED);
      view.showLanding = true;
      if (c && c.kind === "foul") { sfx.crack(false); view.hideBall = true; } else sfx.mitt();
      if (c && c.bunt && c.kind !== "foul") sfx.whiff();
      const kind = !swing ? (pitch.inZone ? "called" : "ball") : c.kind === "miss" ? "swing" : (c.bunt && st.strikes >= 2 ? "buntfoul" : "foul");
      const half = st.half, inn = st.inning;
      const ev = YS.applyPitch(st, kind);
      let msg = {
        ball: "ボール", strike: ev.swing ? "からぶり！ ストライク" : "ストライク！",
        foul: c && c.bunt ? "バントは ファウル" : "ファウル！", walk: ev.pushIn ? "フォアボール！ おしだしで 1てん！" : "フォアボール！ 1るいへ",
        strikeout: ev.bunt ? "スリーバント しっぱい… さんしん！" : ev.swing ? "からぶり さんしん！" : "みのがし さんしん！",
      }[ev.ev];
      if (word && c.kind === "miss") showBig("からぶり", "#fff", 1.2, word);
      if (word && c.kind === "foul") showBig("ファウル", "#fff", 1.2, word);
      if (ev.ev === "strikeout") { sfx.out(); showBig("さんしん！", "#ff6b6b", 1.4, word || undefined); }
      // バッターの かお（batting-center と おなじ ひょうじょう）
      const mood = { strikeout: "sad", walk: "joy", foul: "oops", strike: ev.swing ? "sad" : "oops" }[ev.ev];
      if (mood) view.mood = { type: mood, t0: NOW() };
      if (ev.ev === "walk") showBig("フォアボール", "#74c0fc", 1.2);
      // とうるい
      if (steal != null && ev.ev !== "walk" && !st.over && st.half === half && st.inning === inn && st.bases[steal] && !st.bases[steal + 1]) {
        const runner = bat[st.bases[steal].p];
        const safe = YA.stealResult(st, steal, runner, def[1], pitch.time, g.rnd);
        YS.applySteal(st, steal, safe);
        msg += safe ? "　とうるい せいこう！" : "　とうるい しっぱい… アウト！";
        if (safe) sfx.cheer(0.8); else sfx.out();
      }
      if (st.over && st.walkoff) { msg += " サヨナラ〜！！"; sfx.fanfare(); sfx.cheer(2.5); YR.confetti(120); }
      talk(msg, { hot: ev.ev === "walk" || ev.ev === "strikeout" });
      updHud();
      await sleep(1100);
      return { ev, c };
    }

    // ===== インプレー =====
    if (c.bunt) sfx.bunt(); else sfx.crack(c.just);
    if (word) showBig(c.just ? "カキーン！" : "カキン！", "#ffd43b", 0.9, word);
    else if (c.just && !c.bunt) showBig("カキーン！", "#ffd43b", 0.8);
    await sleep(260);
    const pb = YS.prepBall(c.ball);
    const fe = YS.fieldBall(pb, YS.fielders(def));
    const seed = g.rnd.int(1e9) + 1;
    const err = L ? 0 : isHuman(g, ft) ? 0.02 : YA.LEVELS[g.level].err;
    const opts = { choice: "auto", seed, err, def, bat, bunt: !!c.bunt };
    let res = YS.resolvePlay(st, pb, fe, opts);
    // だせきの めせんで おいかけ、バッターが はしりだしたら 1るいの カメラへ
    const switchT = fe.hr || res.kind === "foul" ? null : Math.max(1.4, fe.t + (fe.air ? 0.9 : 0.4));
    const endOf = (r) => fe.hr ? Math.max(r.anim.end, pb.T + 1.6) : switchT != null ? Math.max(r.anim.end, switchT + 1.8) : r.anim.end + 0.4;
    view = { kind: "play", play: res, t: 0, tEnd: endOf(res), switchT, def, bat, fieldTeam: defT, batTeam: batT, paused: false, ff: false };
    if (res.kind !== "foul") talk(fe.hr ? "うったー！ おおきい！" : c.bunt ? "バント！ ころがした！" : "うったー！", { say: !fe.hr });
    if (fe.hr) speak("うったー！ おおきい！");
    // にんげんが まもる ときは なげる るいを えらぶ
    const movers = res.anim.runners.some((r) => r.s != null && r.target > r.base);
    if (isHuman(g, ft) && !save.autoField && !fe.hr && !(fe.foul) && !(res.kind === "fly" || res.kind === "pop" || res.kind === "liner" || res.kind === "foulfly" || res.kind === "sf") && movers && !L) {
      while (view.t < fe.t + 0.15) await raf();
      view.paused = true; view.overhead = true;
      sfx.mitt();
      const ch = await pickThrow();
      if (ch !== "auto") res = YS.resolvePlay(st, pb, fe, Object.assign({}, opts, { choice: ch }));
      view.play = res; view.tEnd = endOf(res); view.paused = false; view.overhead = false; view.ff = false;
    }
    let caughtSaid = false;
    while (view.t < view.tEnd) {
      if (!caughtSaid && view.t >= fe.t && !fe.hr) { caughtSaid = true; if (fe.air || res.throws.length) sfx.mitt(); }
      await raf();
    }
    const ev = YS.applyPlay(st, res);
    const msg = playWords(res, ev.scored || 0, st);
    if (res.kind === "hr" || res.kind === "inside") { sfx.fanfare(); sfx.cheer(2.2); YR.confetti(140); showBig("ホームラン！", "#ff6b6b", 2); }
    else if (res.hit) { sfx.cheer(1.2); showBig(res.kind === "double" ? "ツーベース！" : res.kind === "triple" ? "スリーベース！" : "ヒット！", "#74c0fc", 1.3); }
    else if (res.kind === "dp") { sfx.out(); showBig("ゲッツー！", "#ff6b6b", 1.4); }
    else if (res.kind === "error") { sfx.ooh(); showBig("エラー！", "#ffa94d", 1.3); }
    else if (res.kind !== "foul") { sfx.out(); showBig("アウト！", "#ff6b6b", 1.1); }
    if ((ev.scored || 0) > 0 && res.kind !== "hr") sfx.cheer(1.6);
    if (st.over && st.walkoff) { sfx.fanfare(); sfx.cheer(2.8); YR.confetti(160); showBig("サヨナラ！", "#ffd43b", 2.4); }
    talk(msg, { hot: res.hit || (ev.scored || 0) > 0 });
    updHud();
    await sleep(1500);
    return { ev, res, c };
  }

  // ===== こうたい =====
  function changeOver(g) {
    const st = g.st;
    const bt = st.half;
    const two = g.mode === "two";
    sfx.whistle();
    $("chTitle").textContent = "チェンジ！";
    const inn = st.inning + "かい" + (bt ? "うら" : "おもて");
    let text;
    if (two) text = inn + "<br><b>" + g.teams[bt].emoji + " " + g.teams[bt].name + "</b> の こうげき！<br>タブレットを まわして、うつ ひとが もってね 🔄";
    else text = inn + "<br>" + (isHuman(g, bt) ? "こんどは きみが <b>うつ</b> ばん！" : "こんどは きみが <b>まもる</b> ばん！ たまを えらんで なげよう");
    $("chText").innerHTML = text;
    $("chRot").classList.toggle("show", two);
    $("change").classList.add("show");
    speak(plain(text.replace(/<br>/g, "。")));
    return waitInput((done) => {
      $("chGo").onclick = () => done(true);
      if (AUTO) setTimeout(() => done(true), 400);
      else if (!two) setTimeout(() => done(true), 3200);
    }).then((v) => { $("change").classList.remove("show"); return v; }, (e) => { $("change").classList.remove("show"); throw e; });
  }

  // ===== スコアボード =====
  function boardHTML(g) {
    const st = g.st;
    const n = Math.max(st.innings, st.inning);
    let h = "<tr><th></th>";
    for (let i = 1; i <= n; i++) h += "<th>" + i + "</th>";
    h += "<th>とくてん</th><th>ヒット</th></tr>";
    for (let t = 0; t < 2; t++) {
      h += "<tr><th>" + g.teams[t].emoji + " " + g.teams[t].short + "</th>";
      for (let i = 0; i < n; i++) { const v = st.line[t][i]; h += "<td>" + (v == null ? "" : v) + "</td>"; }
      h += "<td class=\"tot\">" + st.runs[t] + "</td><td>" + st.hits[t] + "</td></tr>";
    }
    return h;
  }
  function statsHTML(g, t) {
    const st = g.st;
    let h = "<tr><th></th><th>せんしゅ</th><th><ruby>打数<rt>だすう</rt></ruby></th><th><ruby>安打<rt>あんだ</rt></ruby></th><th><ruby>打点<rt>だてん</rt></ruby></th><th>ホーム<br>ラン</th><th>フォア<br>ボール</th></tr>";
    g.teams[t].players.forEach((p, i) => {
      const s = st.stats[t][i];
      h += "<tr><td>" + (i + 1) + "</td><td class=\"name\">" + p.emoji + " " + p.name + "</td><td>" + s.ab + "</td><td>" + s.h + "</td><td>" + s.rbi + "</td><td>" + s.hr + "</td><td>" + s.bb + "</td></tr>";
    });
    return h;
  }
  $("bBoard").onclick = () => { if (!G) return; $("boardTbl").innerHTML = boardHTML(G); $("board").classList.add("show"); };
  $("boardClose").onclick = () => $("board").classList.remove("show");

  // ===== しあい おわり =====
  function finishGame(g) {
    const st = g.st;
    const w = st.winner;
    let title, msg;
    if (g.mode === "cpu") {
      const me = g.ctl[0] === "human" ? 0 : 1;
      const r = save.rec[g.level] || (save.rec[g.level] = blankRec());
      if (w === -1) { title = "ひきわけ！"; msg = "どちらも ゆずらない いい しあい だったね！"; r.d++; }
      else if (w === me) { title = "🎉 きみの かち！"; msg = st.walkoff ? "サヨナラ かち！ すごい！" : "やったね！ " + st.runs[me] + " たい " + st.runs[1 - me] + " で かったよ！"; r.w++; }
      else { title = "まけちゃった…"; msg = st.runs[1 - me] + " たい " + st.runs[me] + "。 つぎは かとう！"; r.l++; }
    } else {
      save.two = (save.two || 0) + 1;
      title = w === -1 ? "ひきわけ！" : "🎉 " + g.teams[w].name + " の かち！";
      msg = st.runs[0] + " たい " + st.runs[1] + (st.walkoff ? "。サヨナラ！" : "");
    }
    // つうさん（にんげんの チーム）
    for (let t = 0; t < 2; t++) {
      if (!isHuman(g, t)) continue;
      const id = g.teams[t].id;
      const c = save.career[id] || (save.career[id] = g.teams[t].players.map(() => ({ ab: 0, h: 0, rbi: 0, hr: 0 })));
      st.stats[t].forEach((s, i) => { if (!c[i]) c[i] = { ab: 0, h: 0, rbi: 0, hr: 0 }; c[i].ab += s.ab; c[i].h += s.h; c[i].rbi += s.rbi; c[i].hr += s.hr; });
    }
    store();
    if (w === -1 || (g.mode === "cpu" && w !== (g.ctl[0] === "human" ? 0 : 1))) sfx.end(); else { sfx.fanfare(); sfx.cheer(2.5); YR.confetti(150); }
    $("rTitle").textContent = title;
    $("rMsg").textContent = msg;
    $("rBoard").innerHTML = boardHTML(g);
    const tabs = $("rTabs");
    tabs.innerHTML = "";
    const show = (t) => {
      $("rStats").innerHTML = statsHTML(g, t);
      [...tabs.children].forEach((b, i) => b.classList.toggle("on", i === t));
    };
    for (let t = 0; t < 2; t++) {
      const b = document.createElement("button");
      b.textContent = g.teams[t].emoji + " " + g.teams[t].short;
      b.onclick = () => show(t);
      tabs.appendChild(b);
    }
    show(g.ctl[1] === "human" && g.ctl[0] !== "human" ? 1 : 0);
    $("result").classList.add("show");
    speak(title + "。" + msg);
  }

  // ===== しあいを はじめる =====
  async function runGame(g) {
    try {
      showBig("プレイボール！", "#fff", 1.8);
      sfx.whistle();
      talk("プレイボール！ " + g.teams[0].name + " の こうげき！");
      await sleep(1600);
      while (!g.st.over) {
        await pitchOnce(g);
        if (g.st.halfOver && !g.st.over) { g.st.halfOver = false; await changeOver(g); }
        g.st.halfOver = false;
      }
      showPane("pWait"); $("waitHint").textContent = "しあい しゅうりょう！";
      await sleep(1600);
      finishGame(g);
    } catch (e) {
      if (e !== ABORT) { console.error(e); throw e; }
    }
  }
  function newMatch(mode, opts) {
    endMatch();
    const teams = [TEAMS[opts.away], TEAMS[opts.home]];
    const g = {
      mode, teams, level: opts.level, rnd: YS.rng((Date.now() ^ (Math.random() * 1e9)) >>> 0),
      st: YS.newGame({ innings: opts.innings }),
      ctl: mode === "two" ? ["human", "human"] : opts.humanSide === 0 ? ["human", "cpu"] : ["cpu", "human"],
    };
    G = g;
    window.__yakyu.G = g;
    return g;
  }
  function endMatch() {
    if (G) { G.dead = true; abortAll(); }
    G = null;
    swingHandler = null;
    $("throwPick").hidden = true;
    view = { kind: "idle" };
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { /* むし */ }
  }
  function startFromSetup() {
    const mode = setupMode;
    const away = save.order === 0 || mode === "two" ? save.my : save.opp;
    const home = save.order === 0 || mode === "two" ? save.opp : save.my;
    const g = newMatch(mode, { away, home, level: save.level, innings: save.innings, humanSide: save.order });
    closeAll();
    updHud();
    runGame(g);
  }

  // ===== メニュー =====
  function closeAll() { document.querySelectorAll(".overlay").forEach((o) => o.classList.remove("show")); }
  function toMenu() { endMatch(); closeAll(); $("menu").classList.add("show"); talk("⚾", { say: false }); }
  let setupMode = "cpu";
  function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }
  function teamButtons(el, key, other) {
    el.innerHTML = "";
    TEAMS.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "team" + (save[key] === i ? " on" : "");
      b.style.setProperty("--c", t.color); b.style.setProperty("--c2", t.color2);
      b.innerHTML = "<canvas class=\"pv\"></canvas>" + t.short + "<span class=\"info\" role=\"button\" aria-label=\"せんしゅ\">i</span>";
      b.onclick = (e) => {
        if (e.target.classList.contains("info")) { showRoster(t); return; }
        save[key] = i;
        if (save[other] === i) save[other] = (i + 1) % TEAMS.length;
        store(); renderSetup(); sfx.beep();
      };
      el.appendChild(b);
      YC.preview(b.querySelector("canvas"), t, t.players[3], save[key] === i ? "joy" : "normal");
    });
  }
  function showRoster(t) {
    $("rosterTitle").textContent = t.emoji + " " + t.name;
    let h = "<tr><th></th><th>せんしゅ</th><th>まもり</th><th>だりょく</th><th>ミート</th><th>あし</th><th>かた</th></tr>";
    t.players.forEach((p, i) => {
      h += "<tr><td>" + (i + 1) + "</td><td class=\"name\"><canvas class=\"pv sm\" data-i=\"" + i + "\"></canvas>" + p.name + "</td><td>" + YS.POS_NAME[p.pos] + "</td>" +
        ["pow", "meet", "spd", "arm"].map((k) => "<td class=\"stars\">" + stars(p[k]) + "</td>").join("") + "</tr>";
    });
    $("rosterTbl").innerHTML = h;
    $("roster").classList.add("show");
    $("rosterTbl").querySelectorAll("canvas").forEach((c) => YC.preview(c, t, t.players[+c.dataset.i]));
  }
  $("rosterClose").onclick = () => $("roster").classList.remove("show");
  function segInit(id, key, conv) {
    const el = $(id);
    el.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", String(save[key]) === b.dataset.v);
      b.onclick = () => { save[key] = conv ? conv(b.dataset.v) : +b.dataset.v; store(); segInit(id, key, conv); sfx.beep(); };
    });
  }
  function renderSetup() {
    const two = setupMode === "two";
    $("setupTitle").textContent = two ? "2にんで しあい" : "CPU と しあい";
    $("pick1Label").textContent = two ? "1P の チーム（さきに うつ）" : "きみの チーム";
    $("pick2Label").textContent = two ? "2P の チーム（あとで うつ）" : "あいての チーム";
    teamButtons($("teams1"), "my", "opp");
    teamButtons($("teams2"), "opp", "my");
    $("cpuOpts").hidden = two;
    segInit("segOrder", "order"); segInit("segLevel", "level"); segInit("segInn", "innings");
  }
  document.querySelectorAll(".mode").forEach((b) => (b.onclick = () => {
    ac(); sfx.beep();
    const m = b.dataset.mode;
    if (m === "lesson") { startLesson(); return; }
    setupMode = m;
    renderSetup();
    closeAll(); $("setup").classList.add("show");
  }));
  $("sBack").onclick = toMenu;
  $("sGo").onclick = () => { ac(); startFromSetup(); };
  $("rMenu").onclick = toMenu;
  $("rAgain").onclick = () => { closeAll(); setupMode = G ? G.mode : "cpu"; renderSetup(); $("setup").classList.add("show"); };
  $("bQuit").onclick = () => { if (G) $("quit").classList.add("show"); else toMenu(); };
  $("qNo").onclick = () => $("quit").classList.remove("show");
  $("qYes").onclick = toMenu;
  $("mRecords").onclick = () => {
    const lv = YA.LEVELS;
    let h = "<h3>CPU との しあい</h3><table class=\"tbl\"><tr><th>つよさ</th><th>かち</th><th>まけ</th><th>ひきわけ</th></tr>";
    lv.forEach((L, i) => { const r = save.rec[i] || blankRec(); h += "<tr><td>" + L.emoji + " " + L.name + "</td><td>" + r.w + "</td><td>" + r.l + "</td><td>" + r.d + "</td></tr>"; });
    h += "</table><p>2にんで あそんだ しあい: " + (save.two || 0) + "</p>";
    let any = false;
    TEAMS.forEach((t) => {
      const c = save.career[t.id];
      if (!c) return;
      any = true;
      h += "<h3>" + t.emoji + " " + t.name + " の つうさん</h3><div class=\"tablewrap\"><table class=\"tbl\"><tr><th>せんしゅ</th><th><ruby>打数<rt>だすう</rt></ruby></th><th><ruby>安打<rt>あんだ</rt></ruby></th><th><ruby>打率<rt>だりつ</rt></ruby></th><th><ruby>打点<rt>だてん</rt></ruby></th><th>ホームラン</th></tr>";
      t.players.forEach((p, i) => {
        const s = c[i] || { ab: 0, h: 0, rbi: 0, hr: 0 };
        const avg = s.ab ? (s.h / s.ab).toFixed(3).replace(/^0/, "") : "-";
        h += "<tr><td class=\"name\">" + p.emoji + " " + p.name + "</td><td>" + s.ab + "</td><td>" + s.h + "</td><td>" + avg + "</td><td>" + s.rbi + "</td><td>" + s.hr + "</td></tr>";
      });
      h += "</table></div>";
    });
    if (!any) h += "<p>しあいを すると せんしゅの つうさん せいせきが たまるよ</p>";
    $("recBody").innerHTML = h;
    $("records").classList.add("show");
  };
  $("recClose").onclick = () => $("records").classList.remove("show");

  // ===== おけいこ =====
  const LESSON = [
    {
      title: "ストライク", pitch: { type: "fast", x: 0, y: 0 }, expect: "strike",
      text: "ピッチャーの ボールが しろい わく（ストライクゾーン）を とおると <b>ストライク</b>。<br>まずは タップ しないで、みて いよう！",
      ok: "ストライク！ わくの なかを とおったね。<br>ストライクが 3つで <b>さんしん（アウト）</b>だよ。",
      ng: "こんどは タップ しないで、ボールを みて いてね。",
    },
    {
      title: "ボール", pitch: { type: "fast", x: 1.8, y: 0.2 }, expect: "ball",
      text: "わくの そとを とおると <b>ボール</b>。<br>そとの ボールは うたないで みのがそう！",
      ok: "ボール！ わくの そとだったね。<br>ボールが 4つで <b>フォアボール</b>。1るいへ あるけるよ。",
      ng: "わくの そとの ボールは、タップ しないで みのがそう。",
    },
    {
      title: "フォアボール", pitch: { type: "fast", x: -0.3, y: 1.9 }, expect: "walk", setup: (st) => { st.balls = 3; },
      text: "いまは ボールが 3つ。<br>あと 1つ ボールなら <b>フォアボール</b>！ みのがそう。",
      ok: "フォアボール！ バッターは <b>1るい</b>へ すすんだよ。",
      ng: "うたないで みのがすと フォアボールに なるよ。",
    },
    {
      title: "さんしん", pitch: { type: "fast", x: 0.1, y: -0.1 }, expect: "strikeout", setup: (st) => { st.strikes = 2; },
      text: "いまは ストライクが 2つ。<br>まんなかの ボールを みのがすと… どうなるかな？ みて みよう。",
      ok: "<b>さんしん</b>！ アウトが 1つ ついたよ。<br>アウトが 3つに なると、こうげきと しゅびが こうたい（<b>チェンジ</b>）するよ。",
      ng: "こんどは みのがして みよう。",
    },
    {
      title: "うって はしろう", pitch: { type: "slow", x: 0, y: 0 }, expect: "hit", forceBall: { v: 38, angle: 18, dir: 20 },
      text: "まんなかの ゆっくり ボールを うとう！ ボールが ちかづいて きいろい わが ちいさく なったら がめんを タップ。<br>うったら 1るい → 2るい → 3るい → ホーム の じゅんに はしるよ。",
      ok: "ヒット！ <b>1るい</b>に ついたね。<br>るいは ぐるっと まわる じゅんばんに すすむよ。",
      ng: "おしい！ ボールが きいろい わと かさなる ころに タップ してね。",
    },
    {
      title: "とくてん", pitch: { type: "slow", x: 0, y: 0 }, expect: "run", forceBall: { v: 38, angle: 16, dir: 22 },
      setup: (st) => { st.bases = [null, null, { p: 8 }]; st.order[0] = 2; },
      text: "3るいに ランナーが いるよ。<br>うって ホームに かえそう！ <b>ホームに かえると 1てん</b>！",
      ok: "ホームイン！ <b>1てん</b> はいったね！<br>さいごに とくてんが おおい チームの かち！",
      ng: "おしい！ もういちど タイミングよく タップ！",
    },
    {
      title: "アウトの いろいろ", pitch: { type: "slow", x: 0, y: 0 }, expect: "out3", forceBall: { v: 33, angle: 42, dir: 2 },
      setup: (st) => { st.outs = 2; st.order[0] = 3; },
      text: "いまは 2アウト。<br>うった ボールを じめんに つく まえに とられると <b>フライアウト</b>。うって みよう！",
      ok: "フライを とられて <b>3アウト。チェンジ</b>！<br>ゴロでも、ランナーより さきに ボールが 1るいに とどくと アウト だよ。<br>これで おけいこ おしまい！ しあいを して みよう！",
      ng: "おしい！ もういちど うって みよう。",
    },
  ];
  function lessonCheck(step, before, out) {
    const ev = out.ev && out.ev.ev, kind = out.res && out.res.kind;
    switch (step.expect) {
      case "strike": return ev === "strike" && !out.c;
      case "ball": return ev === "ball";
      case "walk": return ev === "walk";
      case "strikeout": return ev === "strikeout";
      case "hit": return !!(out.res && out.res.hit);
      case "run": return (out.ev && out.ev.scored) > 0;
      case "out3": return ["fly", "pop", "liner"].includes(kind);
      default: return false;
    }
  }
  function lessonCard(i, title, text, ok) {
    $("lStep").textContent = "おけいこ " + (i + 1) + " / " + LESSON.length;
    $("lTitle").textContent = title;
    $("lText").innerHTML = text;
    $("lRetry").hidden = ok !== false;
    $("lesson").classList.add("show");
    speak(title + "。" + plain(text.replace(/<br>/g, "。")));
  }
  async function startLesson() {
    const g = newMatch("lesson", { away: save.my, home: save.opp, level: 0, innings: 9, humanSide: 0 });
    closeAll();
    try {
      let i = 0;
      while (i < LESSON.length) {
        const step = LESSON[i];
        lessonCard(i, step.title, step.text, true);
        $("lGo").textContent = "やってみる！";
        await waitInput((done) => { $("lGo").onclick = () => done(1); $("lQuit").onclick = () => done(0); if (AUTO) setTimeout(() => done(1), 300); })
          .then((v) => { if (!v) throw ABORT; });
        $("lesson").classList.remove("show");
        g.st = YS.newGame({ innings: 9 });
        if (step.setup) step.setup(g.st);
        g.lesson = step;
        updHud();
        talk(step.title + "！", { say: false });
        const out = await pitchOnce(g);
        g.lesson = null;
        const ok = lessonCheck(step, null, out);
        lessonCard(i, ok ? "できた！ 🎉" : "あれれ？", ok ? step.ok : step.ng, ok);
        $("lGo").textContent = ok ? (i === LESSON.length - 1 ? "おわり" : "つぎへ") : "もういちど";
        $("lRetry").hidden = true;
        const v = await waitInput((done) => { $("lGo").onclick = () => done(1); $("lQuit").onclick = () => done(0); if (AUTO) setTimeout(() => done(1), 300); });
        if (!v) throw ABORT;
        if (ok) { sfx.cheer(1); i++; }
      }
      save.lessonDone = true; store();
      toMenu();
    } catch (e) {
      if (e !== ABORT) { console.error(e); }
      if (G === g) toMenu();
    }
  }

  // テスト用
  window.__yakyu = { G: null, get view() { return view; }, save: () => save };
  updToggles();
  renderSetup();
})();
