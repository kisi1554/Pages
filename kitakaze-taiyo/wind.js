'use strict';

/*
 * ふく・こする しくみ（この ほん の いちばん の あそび）
 *
 *   Wind.attach(el, { center: () => ({ x, y, r }) | null })   … え の うえ の ゆび を みはる
 *   Wind.poll()   → { moves: [ゆび ごと の うごいた きょり], fingers, turns: [ゆび ごと の まわった かくど] }
 *   Wind.detach()
 *   Wind.model    … かぜ・おさえる ちから・おんど の けいさん（テスト できる ように ぜんぶ かんすう）
 *   Wind.Breath   … いき で ふく（マイク の おと の おおきさ だけ。録音・保存・送信 は しない）
 *
 * - blow: なぞった きょり（え の はば を 1 と する）を ゆび ごと に あつめる。
 *   はやく なぞる ほど・ゆび が おおい ほど、1フレーム に あつまる りょう が ふえて かぜ が つよく なる。
 * - warm: たいよう の まんなか（center）の まわり を まわった かくど を ゆび ごと に あつめる（ぎゃく まわり でも よい）。
 * - キーボード: → ← ↑ ↓ と スペース で ふく・まわす（パソコン よう）。
 */
const Wind = (() => {
  /* ============================ けいさん（model） ============================ */

  const MAXW = 3; // かぜ の つよさ の うえ の げんど
  const GAIN = 1.6; // 1びょう に え の はば 1つぶん なぞる と、かぜ の つよさ が だいたい 1
  const FADE = 1.6; // かぜ が よわまる はやさ
  const PER_TURN = 0.16; // たいよう を 1しゅう こする と あがる おんど
  const MAX_STEP = 0.3; // 1かい の うごき で かぞえる きょり の うえ の げんど（ゆび が とんだ とき）

  // おんど の だんかい: 0 さむい → 1 ほっ → 2 あせ → 3 あせ を ふく → 4 ぼうし を とる → 5 ボタン を はずす → 6 コート を ぬぐ
  const STAGES = [0, 0.12, 0.28, 0.5, 0.7, 0.88, 1];

  function create(temp) {
    return { wind: 0, blown: 0, grip: 0, temp: temp || 0, turned: 0 };
  }

  // ゆび ごと の きょり を たす。ゆび 2ほん で おなじ だけ なぞれば ちょうど 2ばい
  function power(moves) {
    let s = 0;
    for (let i = 0; i < moves.length; i += 1) s += Math.max(0, Math.min(MAX_STEP, moves[i]));
    return s;
  }

  // ふく。かぜ は つよく なる けど、たびびと は かぜ より つよく コート を おさえる（ぜったい ぬげない）
  function blowStep(st, moves, dt) {
    const imp = power(moves);
    st.blown += imp;
    st.wind = Math.min(MAXW, st.wind * Math.exp(-FADE * dt) + imp * GAIN);
    const need = Math.min(1, st.wind / MAXW + 0.1);
    if (st.grip < need) st.grip = need;
    // かぜ は つめたい。ふいても おんど は あがらない
    st.temp = Math.max(0, st.temp - imp * 0.02);
    return st;
  }

  // こする。まわった かくど（ラジアン）の ぶん だけ おんど が あがる。あつく なる と コート を おさえない
  function warmStep(st, turns, dt) {
    let a = 0;
    for (let i = 0; i < turns.length; i += 1) a += Math.abs(turns[i]);
    st.turned += a;
    st.temp = Math.min(1, st.temp + (a / (Math.PI * 2)) * PER_TURN);
    st.wind *= Math.exp(-FADE * (dt || 0));
    st.grip = Math.max(0, Math.min(st.grip, 1 - st.temp));
    return st;
  }

  function stage(temp) {
    let n = 0;
    for (let i = 1; i < STAGES.length; i += 1) if (temp >= STAGES[i] - 1e-9) n = i;
    return n;
  }

  // コート が ぬげるか。きめて は おんど だけ（かぜ では ぬげない）
  function coatOff(st) {
    return st.temp >= 1 - 1e-9;
  }

  // (cx,cy) の まわり で (x0,y0) → (x1,y1) と うごいた かくど（-π〜π）
  function angleDelta(cx, cy, x0, y0, x1, y1) {
    let d = Math.atan2(y1 - cy, x1 - cx) - Math.atan2(y0 - cy, x0 - cx);
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  const model = { MAXW, STAGES, create, power, blowStep, warmStep, stage, coatOff, angleDelta };

  /* ============================ ゆび を みはる ============================ */

  let el = null;
  let opt = null;
  const ptrs = new Map(); // pointerId → { x, y, dist, turn, t }
  let keyHeld = 0;
  let keyLast = 0;
  let keyBuf = 0;

  function width() {
    return el ? Math.max(1, el.getBoundingClientRect().width) : 1;
  }

  function down(e) {
    if (!opt) return;
    e.preventDefault();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, dist: 0, turn: 0, t: performance.now(), moved: 0 });
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* なにも しない */
    }
  }

  function move(e) {
    const p = ptrs.get(e.pointerId);
    if (!p || !opt) return;
    e.preventDefault();
    const w = width();
    const d = Math.hypot(e.clientX - p.x, e.clientY - p.y) / w;
    p.dist += Math.min(MAX_STEP, d);
    const c = opt.center && opt.center();
    if (c) {
      const r0 = Math.hypot(p.x - c.x, p.y - c.y);
      const r1 = Math.hypot(e.clientX - c.x, e.clientY - c.y);
      // まんなか に ちかすぎる（とおりぬけ）と、とおすぎる ところ は かぞえない
      if (r0 > c.r * 0.25 && r1 > c.r * 0.25 && r0 < c.r * 3.2 && r1 < c.r * 3.2) {
        p.turn += Math.abs(angleDelta(c.x, c.y, p.x, p.y, e.clientX, e.clientY));
      }
    }
    if (d > 0.004) p.moved = performance.now();
    p.x = e.clientX;
    p.y = e.clientY;
  }

  function up(e) {
    ptrs.delete(e.pointerId);
  }

  function key(e) {
    if (!opt) return;
    if (!/^(Arrow(Left|Right|Up|Down)| )$/.test(e.key)) return;
    const a = document.activeElement;
    if (a && a !== document.body && a !== el && a.closest && a.closest('button, a')) return;
    e.preventDefault();
    keyHeld = performance.now();
  }

  // いま までに あつまった うごき を わたして、からっぽ に する
  function poll() {
    const now = performance.now();
    const moves = [];
    const turns = [];
    let fingers = 0;
    ptrs.forEach((p) => {
      moves.push(p.dist);
      turns.push(p.turn);
      p.dist = 0;
      p.turn = 0;
      if (now - p.moved < 220) fingers += 1;
    });
    // キーボード: おしている あいだ、ゆび 1ぽん で 1びょう に はば 1つぶん なぞった ことに する
    if (opt && now - keyHeld < 160) {
      const dt = Math.min(0.1, (now - (keyLast || now)) / 1000);
      keyBuf = dt;
      moves.push(dt * 1.1);
      turns.push(dt * Math.PI * 2 * 1.2);
      fingers = Math.max(fingers, 1);
    } else {
      keyBuf = 0;
    }
    keyLast = now;
    return { moves, turns, fingers, key: keyBuf > 0 };
  }

  function attach(target, o) {
    detach();
    el = target;
    opt = o || {};
    ptrs.clear();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    document.addEventListener('keydown', key);
  }

  function detach() {
    if (el) {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
    }
    document.removeEventListener('keydown', key);
    el = null;
    opt = null;
    ptrs.clear();
    keyHeld = 0;
  }

  /* ============================ いき で ふく（マイク） ============================ */

  /*
   * マイク の おと の おおきさ（RMS）だけ を この たんまつ の なか で はかる。
   * AnalyserNode に つなぐ だけ で、スピーカー にも つながない。録音・保存・送信 は しない。
   * 音声認識 も つかわない。つかえない／ことわられた とき は start() が false を かえす。
   */
  const Breath = (() => {
    let stream = null;
    let ac = null;
    let an = null;
    let buf = null;
    let level = 0;

    const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    async function start() {
      if (an) return true;
      if (!supported()) return false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        const AC = window.AudioContext || window.webkitAudioContext;
        ac = new AC();
        if (ac.state === 'suspended') ac.resume();
        an = ac.createAnalyser();
        an.fftSize = 1024;
        ac.createMediaStreamSource(stream).connect(an);
        buf = new Float32Array(an.fftSize);
        return true;
      } catch (e) {
        stop();
        return false;
      }
    }

    function stop() {
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      if (ac) {
        try {
          ac.close();
        } catch (e) {
          /* なにも しない */
        }
      }
      stream = null;
      ac = null;
      an = null;
      level = 0;
    }

    // ふーっ の つよさ（0〜）。しきい を こえた ぶん だけ
    function read() {
      if (!an) return 0;
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i += 1) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      level += (rms - level) * 0.4;
      return Math.max(0, level - 0.04);
    }

    return { supported, start, stop, read, active: () => !!an };
  })();

  return { attach, detach, poll, model, Breath };
})();
