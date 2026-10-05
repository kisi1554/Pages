'use strict';

/*
 * つくぼうと おしゃべり
 *  - おと   : なきごえ・こうかおんは Web Audio で その場で ごうせい(おんせいファイルなし)
 *  - こえ   : よみあげ = speechSynthesis / ききとり = SpeechRecognition(あれば)
 *  - あそび : かくれんぼ 2しゅるい
 *      seek … つくぼうが かくれる → こどもが さがす(ちかい/とおい ヒントつき)
 *      hide … こどもが かくれる → つくぼうが さがす
 *  - きろく : localStorage(なまえ・かち かず・いちばん すくない かいすう)
 */

(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------------------------- ほぞん ---------------------------- */
  const KEY = 'tsukubo.v1';
  let save = { name: 'あお', voice: true, song: true, seekWins: 0, hideWins: 0, tsukuWins: 0, best: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
  } catch (e) {
    /* よめなくても あそべる */
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }

  function callName() {
    const n = (save.name || '').trim() || 'あお';
    return /(くん|ちゃん|さん)$/.test(n) ? n : n + 'くん';
  }
  const fill = (s) => s.replace(/%N/g, callName());

  /* ---------------------------- おと ---------------------------- */
  const Snd = (function () {
    let ctx = null;
    let out = null;
    let noiseBuf = null;

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(ctx.destination);
      return true;
    }
    function noise() {
      if (noiseBuf) return noiseBuf;
      const len = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }

    /* ざらざらした セミの「ジー」 */
    function buzz(t, dur, o) {
      const src = ctx.createBufferSource();
      src.buffer = noise();
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = o.q || 2;
      bp.frequency.setValueAtTime(o.hz, t);
      if (o.hzTo) bp.frequency.exponentialRampToValueAtTime(o.hzTo, t + dur);
      const trem = ctx.createGain();
      const depth = o.depth || 0;
      trem.gain.value = 1 - depth / 2;
      if (o.trem) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = o.trem;
        const lg = ctx.createGain();
        lg.gain.value = depth / 2;
        lfo.connect(lg);
        lg.connect(trem.gain);
        lfo.start(t);
        lfo.stop(t + dur + 0.05);
      }
      const g = ctx.createGain();
      const peak = o.gain || 0.3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + Math.min(o.attack || 0.03, dur / 2));
      g.gain.setValueAtTime(peak, t + Math.max(dur - (o.release || 0.06), dur / 2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp);
      bp.connect(trem);
      trem.connect(g);
      g.connect(out);
      src.start(t);
      src.stop(t + dur + 0.05);
    }

    function tone(t, dur, hz, o) {
      const p = o || {};
      const osc = ctx.createOscillator();
      osc.type = p.wave || 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      if (p.to) osc.frequency.exponentialRampToValueAtTime(p.to, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.gain || 0.25, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    let on = true;
    const ok = () => on && ensure();

    return {
      unlock: ensure,
      set(v) {
        on = v;
      },
      /* ジー… → オーシンツクツク ×4 → ウイヨース ×3。ながさ(びょう)を かえす */
      song(short) {
        if (!ok()) return 0;
        let at = ctx.currentTime + 0.05;
        const t0 = at;
        buzz(at, 0.8, { hz: 3300, q: 2, trem: 46, depth: 0.7, gain: 0.24, attack: 0.3, release: 0.2 });
        at += 0.85;
        const n = short ? 2 : 4;
        for (let i = 0; i < n; i++) {
          buzz(at, 0.09, { hz: 4100, q: 2.2, gain: 0.34 });
          buzz(at + 0.13, 0.09, { hz: 4100, q: 2.2, gain: 0.34 });
          buzz(at + 0.28, 0.3, { hz: 2900, hzTo: 3700, q: 2.6, trem: 34, depth: 0.6, gain: 0.34, release: 0.08 });
          at += 0.62;
        }
        for (let i = 0; i < (short ? 1 : 3); i++) {
          buzz(at, 0.34, { hz: 3600, hzTo: 2200, q: 2.4, trem: 30, depth: 0.6, gain: 0.32, release: 0.12 });
          at += 0.4;
        }
        return at - t0;
      },
      /* みつけた! */
      found() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.02;
        [523, 659, 784, 1047].forEach((hz, i) => tone(t + i * 0.1, 0.22, hz, { gain: 0.22 }));
      },
      /* はずれ(ぼよん) */
      miss() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.02;
        tone(t, 0.28, 330, { to: 200, wave: 'sine', gain: 0.3 });
      },
      /* はっぱが ガサガサ */
      rustle() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.01;
        for (let i = 0; i < 3; i++) buzz(t + i * 0.07, 0.06, { hz: 2500 + i * 600, q: 0.8, gain: 0.12 });
      },
      pop() {
        if (!ok()) return;
        tone(ctx.currentTime + 0.01, 0.1, 880, { to: 1320, gain: 0.15 });
      },
      win() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.02;
        [523, 659, 784, 659, 784, 1047].forEach((hz, i) => tone(t + i * 0.12, i === 5 ? 0.5 : 0.18, hz, { gain: 0.22 }));
      },
    };
  })();

  /* ---------------------------- こえ ---------------------------- */
  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = window.speechSynthesis.getVoices();
    jaVoice = vs.find((v) => /^ja/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  let talkTimer = null;
  let speakId = 0;
  function setTalking(v) {
    const c = $('chara');
    if (c) c.classList.toggle('talking', v);
  }

  /* よみあげ。おわったら done() */
  function speak(text, done) {
    clearTimeout(talkTimer);
    const id = ++speakId;
    const plain = text.replace(/[〜~]/g, 'ー').replace(/[…]/g, '、');
    const fallback = () => {
      setTalking(true);
      talkTimer = setTimeout(() => {
        if (id !== speakId) return;
        setTalking(false);
        if (done) done();
      }, Math.min(6000, 600 + text.length * 90));
    };
    if (!save.voice || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      fallback();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.pitch = 1.7;
      u.rate = 1.08;
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        if (id !== speakId) return; // あたらしい よみあげに おきかわった
        clearTimeout(talkTimer);
        setTalking(false);
        if (done) done();
      };
      u.onstart = () => setTalking(true);
      u.onend = end;
      u.onerror = end;
      setTalking(true);
      // よみあげが とまって しまう たんまつ むけの ほけん
      talkTimer = setTimeout(end, 1500 + text.length * 220);
      window.speechSynthesis.speak(u);
    } catch (e) {
      fallback();
    }
  }
  function stopSpeak() {
    speakId++;
    clearTimeout(talkTimer);
    setTalking(false);
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
      /* なにもしない */
    }
  }

  /* ---------------------------- つくぼうの え ---------------------------- */
  function charaSVG(cls) {
    return `
<svg class="tsuku ${cls || ''}" viewBox="0 0 200 210" role="img" aria-label="ツクツクボウシの つくぼう">
  <g class="wings">
    <path class="wing" d="M86 92 C40 70 8 110 14 168 C18 196 52 194 74 168 C88 150 92 120 92 100Z"/>
    <path class="wing" d="M114 92 C160 70 192 110 186 168 C182 196 148 194 126 168 C112 150 108 120 108 100Z"/>
    <path class="vein" d="M88 100 C60 110 36 140 30 176 M90 116 C70 130 56 156 54 182 M112 100 C140 110 164 140 170 176 M110 116 C130 130 144 156 146 182"/>
  </g>
  <g class="legs">
    <path d="M80 140 l-22 14 l-6 14 M120 140 l22 14 l6 14 M84 156 l-16 20 M116 156 l16 20"/>
  </g>
  <ellipse class="body" cx="100" cy="150" rx="26" ry="44"/>
  <path class="stripe" d="M80 136 Q100 144 120 136 M78 154 Q100 162 122 154 M80 172 Q100 180 120 172"/>
  <ellipse class="chest" cx="100" cy="104" rx="34" ry="20"/>
  <path class="mark" d="M86 98 Q100 112 114 98 Q108 108 100 118 Q92 108 86 98Z"/>
  <g class="head">
    <ellipse class="face" cx="100" cy="66" rx="46" ry="30"/>
    <circle class="eyeball" cx="58" cy="58" r="17"/>
    <circle class="eyeball" cx="142" cy="58" r="17"/>
    <g class="eyes e-normal"><circle cx="60" cy="58" r="8"/><circle cx="140" cy="58" r="8"/><circle class="hl" cx="63" cy="54" r="3"/><circle class="hl" cx="143" cy="54" r="3"/></g>
    <g class="eyes e-smug"><path d="M46 60 Q58 52 70 60"/><path d="M130 60 Q142 52 154 60"/><path class="lid" d="M44 54 L72 58 M128 58 L156 54"/></g>
    <g class="eyes e-happy"><path d="M48 62 Q58 48 68 62"/><path d="M132 62 Q142 48 152 62"/></g>
    <g class="eyes e-shy"><circle cx="60" cy="64" r="7"/><circle cx="140" cy="64" r="7"/><circle class="hl" cx="62" cy="61" r="2.5"/><circle class="hl" cx="142" cy="61" r="2.5"/></g>
    <g class="eyes e-shocked"><circle cx="58" cy="58" r="5"/><circle cx="142" cy="58" r="5"/></g>
    <g class="brow b-sorry"><path d="M44 38 L68 44"/><path d="M156 38 L132 44"/></g>
    <g class="brow b-smug"><path d="M46 40 L68 38"/><path d="M132 36 L154 42"/></g>
    <ellipse class="blush" cx="72" cy="80" rx="9" ry="5"/>
    <ellipse class="blush" cx="128" cy="80" rx="9" ry="5"/>
    <path class="mouth m-smug" d="M88 80 Q104 90 116 76"/>
    <path class="mouth m-happy" d="M86 78 Q100 96 114 78Z"/>
    <path class="mouth m-sorry" d="M90 86 Q100 78 110 86"/>
    <ellipse class="mouth m-open" cx="100" cy="84" rx="8" ry="9"/>
    <path class="mouth m-tongue" d="M108 80 q4 10 10 4"/>
    <path class="antenna" d="M76 40 Q70 22 58 18 M124 40 Q130 22 142 18"/>
  </g>
  <g class="notes"><text x="160" y="30">♪</text><text x="22" y="34">♫</text></g>
</svg>`;
  }

  // ちいさい つくぼう(かくれんぼ よう)
  const miniSVG = () => `<svg viewBox="0 0 60 60" class="mini" aria-hidden="true">
    <path d="M24 26 C8 22 2 40 8 52 C14 58 22 50 26 40Z M36 26 C52 22 58 40 52 52 C46 58 38 50 34 40Z" fill="rgba(220,240,255,.75)" stroke="#5b7b8c" stroke-width="1.2"/>
    <ellipse cx="30" cy="38" rx="8" ry="15" fill="#2f5d3a"/>
    <ellipse cx="30" cy="20" rx="15" ry="10" fill="#4a8f52"/>
    <circle cx="17" cy="17" r="6" fill="#fff"/><circle cx="43" cy="17" r="6" fill="#fff"/>
    <circle cx="18" cy="17" r="3" fill="#222"/><circle cx="42" cy="17" r="3" fill="#222"/>
    <path d="M25 24 Q31 29 36 22" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;

  /* ---------------------------- がめん ---------------------------- */
  const screens = ['startScreen', 'talkScreen', 'gameScreen'];
  let current = 'startScreen';
  function show(id) {
    current = id;
    screens.forEach((s) => ($(s).hidden = s !== id));
    $('backBtn').hidden = id !== 'gameScreen';
    $('topTitle').textContent = id === 'gameScreen' ? 'かくれんぼ' : 'つくぼうと おしゃべり';
    if (id === 'talkScreen') resetIdle();
    else clearTimeout(idleTimer);
  }

  $('startArt').innerHTML = charaSVG('mood-smug');
  $('nameInput').value = save.name;

  function setMood(m) {
    const svg = document.querySelector('#chara .tsuku');
    if (!svg) return;
    svg.setAttribute('class', 'tsuku mood-' + (m || 'normal'));
  }

  /* つくぼうが しゃべる(ふきだし + よみあげ) */
  function say(text, mood, done) {
    const t = fill(text);
    $('bubble').textContent = t;
    setMood(mood);
    const b = $('bubble');
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    speak(t, done);
  }

  function setChips(list) {
    const box = $('chips');
    box.innerHTML = '';
    list.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = c;
      btn.addEventListener('click', () => hear(c));
      box.appendChild(btn);
    });
  }

  /* こどもの ことばを うけとる */
  function hear(text) {
    const t = String(text || '').trim();
    if (!t) return;
    Snd.unlock();
    resetIdle();
    idleCount = 0;
    $('youSaid').hidden = false;
    $('youSaid').textContent = '🧒 ' + t;
    const r = Tsuku.reply(t);
    if (r.action === 'sing') {
      say(r.text, 'sing', () => {
        setMood('sing');
        setTalking(true);
        const len = Snd.song(false) || 2;
        setTimeout(() => {
          setTalking(false);
          say(Tsuku.pick(['どう？ じょうずでしょ。%Nも まねして みて', 'ウイヨース！ …%N、はくしゅは？']), 'smug');
        }, len * 1000 + 200);
      });
      setChips(['すごいね', 'もう いっかい ないて', 'かくれんぼ しよう']);
      return;
    }
    if (r.action === 'seek' || r.action === 'hide') {
      setChips([]);
      say(r.text, r.mood, () => startGame(r.action));
      return;
    }
    say(r.text, r.mood);
    setChips(r.chips);
  }

  /* しずかな とき つくぼうから はなしかける(3かい まで) */
  let idleTimer = null;
  let idleCount = 0;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (current !== 'talkScreen' || idleCount >= 3) return;
    idleTimer = setTimeout(() => {
      if (current !== 'talkScreen' || listening) return;
      idleCount++;
      say(Tsuku.idle(), 'smug');
      setChips(Tsuku.chipsFor(null));
      resetIdle();
    }, 35000);
  }

  /* ---------------------------- ききとり ---------------------------- */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let listening = false;
  if (!Rec) $('micBtn').hidden = true;

  $('micBtn').addEventListener('click', () => {
    Snd.unlock();
    if (!Rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch (e) {
        /* なにもしない */
      }
      return;
    }
    stopSpeak();
    try {
      rec = new Rec();
      rec.lang = 'ja-JP';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const r = ev.results && ev.results[0] && ev.results[0][0];
        if (r) hear(r.transcript);
      };
      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          say('マイクが つかえないみたい。したの ボタンか もじで はなしてね', 'sorry');
        } else if (ev.error === 'no-speech') {
          say('あれ？ %N、こえが ちいさくて きこえなかったよ〜', 'smug');
        }
      };
      rec.onend = () => {
        listening = false;
        $('micBtn').classList.remove('on');
      };
      rec.start();
      listening = true;
      $('micBtn').classList.add('on');
    } catch (e) {
      listening = false;
      $('micBtn').classList.remove('on');
    }
  });

  $('inputBar').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('textInput').value;
    $('textInput').value = '';
    hear(v);
  });

  /* ---------------------------- はじめる ---------------------------- */
  function begin() {
    const v = $('nameInput').value.trim();
    save.name = v || 'あお';
    persist();
    Snd.unlock();
    $('chara').innerHTML = charaSVG('mood-happy');
    show('talkScreen');
    const first = save.seekWins + save.hideWins + save.tsukuWins > 0
      ? 'あ、%N また きたの？ ひまなんだね〜。…うそうそ、うれしいよ。きょうも かくれんぼ する？'
      : 'やあ、%N。ぼくは ツクツクボウシの つくぼう。かくれんぼなら だれにも まけないよ。%Nには ぜったい みつけられないけどね〜';
    say(first, 'smug');
    setChips(['かくれんぼ しよう', 'ぼくが かくれる', 'なきごえ きかせて', 'なんで いじわる いうの？']);
  }
  $('startBtn').addEventListener('click', begin);
  $('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') begin();
  });

  /* ---------------------------- かくれんぼ ---------------------------- */
  // かくれる ばしょ(x, y, w は シーンに たいする %)
  const SPOTS = [
    { id: 'leaf1', x: 14, y: 6, w: 20, kind: 'leaves', name: 'うえの はっぱ' },
    { id: 'leaf2', x: 34, y: 1, w: 22, kind: 'leaves', name: 'てっぺんの はっぱ' },
    { id: 'leaf3', x: 52, y: 10, w: 18, kind: 'leaves', name: 'みぎの はっぱ' },
    { id: 'leaf4', x: 22, y: 24, w: 18, kind: 'leaves', name: 'したの はっぱ' },
    { id: 'hole', x: 36, y: 50, w: 9, kind: 'hole', name: 'きの あな' },
    { id: 'bush1', x: 58, y: 56, w: 19, kind: 'bush', name: 'くさむら' },
    { id: 'bush2', x: 76, y: 60, w: 17, kind: 'bush', name: 'おおきな しげみ' },
    { id: 'flower', x: 84, y: 26, w: 13, kind: 'flower', name: 'ひまわり' },
    { id: 'grass1', x: 2, y: 74, w: 16, kind: 'grass', name: 'ひだりの くさ' },
    { id: 'grass2', x: 44, y: 78, w: 15, kind: 'grass', name: 'まんなかの くさ' },
    { id: 'rock', x: 82, y: 80, w: 14, kind: 'rock', name: 'いし' },
    { id: 'kinoko', x: 20, y: 76, w: 10, kind: 'kinoko', name: 'きのこ' },
  ];

  const ART = {
    leaves: `<svg viewBox="0 0 100 70"><g fill="#3e9b4f" stroke="#2c7a3b" stroke-width="2"><circle cx="30" cy="40" r="24"/><circle cx="55" cy="28" r="26"/><circle cx="75" cy="44" r="20"/><circle cx="50" cy="50" r="18"/></g><g fill="#5cb85c"><circle cx="48" cy="20" r="8"/><circle cx="26" cy="34" r="6"/></g></svg>`,
    hole: `<svg viewBox="0 0 60 70"><ellipse cx="30" cy="36" rx="22" ry="28" fill="#4a2f1c" stroke="#6b4a2f" stroke-width="5"/></svg>`,
    bush: `<svg viewBox="0 0 100 70"><g fill="#4caf50" stroke="#2e7d32" stroke-width="2"><circle cx="24" cy="46" r="22"/><circle cx="50" cy="34" r="26"/><circle cx="78" cy="46" r="21"/></g><rect x="4" y="52" width="92" height="18" rx="9" fill="#43a047"/></svg>`,
    flower: `<svg viewBox="0 0 60 130"><path d="M30 50 V130" stroke="#3e8e41" stroke-width="6"/><path d="M30 90 q-20 -6 -24 -20 q18 0 24 14Z M30 104 q20 -6 24 -20 q-18 0 -24 14Z" fill="#4caf50"/><g fill="#ffcc1a" stroke="#e0a800" stroke-width="1.5">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="30" cy="16" rx="7" ry="14" transform="rotate(${a} 30 30)"/>`).join('')}</g><circle cx="30" cy="30" r="12" fill="#7b4a1e"/></svg>`,
    grass: `<svg viewBox="0 0 100 60"><g fill="#66bb6a" stroke="#388e3c" stroke-width="1.5"><path d="M5 60 L20 8 L28 60Z"/><path d="M20 60 L42 0 L48 60Z"/><path d="M40 60 L60 10 L66 60Z"/><path d="M58 60 L82 4 L84 60Z"/><path d="M76 60 L96 18 L98 60Z"/></g></svg>`,
    rock: `<svg viewBox="0 0 100 60"><path d="M6 58 Q4 28 30 16 Q56 2 80 18 Q98 32 94 58Z" fill="#9e9e9e" stroke="#757575" stroke-width="3"/><path d="M30 26 Q44 18 56 22" stroke="#bdbdbd" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
    kinoko: `<svg viewBox="0 0 60 60"><rect x="22" y="30" width="16" height="28" rx="6" fill="#fff3e0" stroke="#d7b98e" stroke-width="2"/><path d="M4 34 Q6 4 30 4 Q54 4 56 34Z" fill="#e53935" stroke="#b71c1c" stroke-width="2"/><g fill="#fff"><circle cx="20" cy="18" r="4"/><circle cx="38" cy="14" r="5"/><circle cx="46" cy="26" r="3"/></g></svg>`,
  };

  const SCENE_BG = `<svg class="scene-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset="1" stop-color="#e6f6ff"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#sky)"/>
    <circle cx="350" cy="40" r="22" fill="#ffd54f"/>
    <path d="M0 210 Q100 190 200 205 T400 200 V300 H0Z" fill="#9ccc65"/>
    <path d="M0 240 Q120 225 230 238 T400 236 V300 H0Z" fill="#8bc34a"/>
    <g fill="#3a8a48"><ellipse cx="150" cy="62" rx="110" ry="52"/><ellipse cx="110" cy="96" rx="60" ry="32"/><ellipse cx="220" cy="80" rx="56" ry="34"/></g>
    <path d="M136 230 Q140 170 146 110 L170 110 Q176 170 184 230Z" fill="#8d6e63" stroke="#6d4c41" stroke-width="3"/>
    <path d="M150 140 Q156 150 152 162 M166 176 Q172 186 168 198" stroke="#6d4c41" stroke-width="3" fill="none"/>
    <path d="M150 116 Q120 100 96 104 M168 114 Q200 96 222 104" stroke="#795548" stroke-width="10" fill="none" stroke-linecap="round"/>
  </svg>`;

  let game = null; // { mode, target, tries, done, hintUsed }

  function gameSay(text, done) {
    const t = fill(text);
    $('gameMsg').textContent = t;
    speak(t, done);
  }

  function buildScene(onTap) {
    const scene = $('scene');
    scene.innerHTML = SCENE_BG;
    SPOTS.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spot spot-' + s.kind;
      b.style.left = s.x + '%';
      b.style.top = s.y + '%';
      b.style.width = s.w + '%';
      b.setAttribute('aria-label', s.name);
      b.dataset.i = i;
      b.innerHTML = ART[s.kind] + '<span class="mark"></span>';
      b.addEventListener('click', () => onTap(i, b));
      scene.appendChild(b);
    });
  }
  const spotEl = (i) => $('scene').querySelector(`.spot[data-i="${i}"]`);

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function setBar(buttons) {
    const bar = $('gameBar');
    bar.innerHTML = '';
    buttons.forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (cls || 'btn-sub');
      b.textContent = label;
      b.addEventListener('click', fn);
      bar.appendChild(b);
    });
  }

  function startGame(mode) {
    stopSpeak();
    show('gameScreen');
    if (mode === 'hide') startHide();
    else startSeek();
  }

  /* --- seek: つくぼうが かくれる → こどもが さがす --- */
  function startSeek() {
    game = { mode: 'seek', target: Math.floor(Math.random() * SPOTS.length), tries: 0, done: false, hintUsed: false, busy: true };
    buildScene(seekTap);
    $('scene').classList.add('counting');
    setBar([]);
    gameSay('%N、めを つぶって 10 かぞえてね。いーち、にーい、さーん…', () => {
      if (!game || game.mode !== 'seek') return;
      $('scene').classList.remove('counting');
      game.busy = false;
      Snd.song(true);
      gameSay('もういいよー！ ぼくを さがしてみて。どうせ みつからないけどね〜');
      setBar([['🔊 なきごえ ヒント', seekHint], ['やめる', backToTalk]]);
    });
  }

  function seekTap(i, el) {
    if (!game || game.mode !== 'seek' || game.done || game.busy) return;
    if (el.classList.contains('checked')) {
      gameSay('そこは さっき みたでしょ〜。%N、わすれんぼ だね');
      return;
    }
    game.tries++;
    Snd.rustle();
    shake(el);
    if (i === game.target) {
      game.done = true;
      el.classList.add('found');
      el.querySelector('.mark').innerHTML = miniSVG();
      Snd.found();
      save.seekWins++;
      const best = !save.best || game.tries < save.best;
      if (best) save.best = game.tries;
      persist();
      const lines = game.tries <= 2
        ? ['うそっ！ もう みつかった！？ %N、ずる したでしょ〜。…まあ いいや、やるじゃん', 'えっ、はやすぎ！ %N、ぼくの こと みてたでしょ！ くやしい ツクツク〜']
        : ['ちぇっ、みつかっちゃった。%N、%Tかいめで みつけたね。なかなか やるじゃん', 'あーあ、みつかった。%N、ちょっとは うまく なったんじゃない？ %Tかいめだよ'];
      gameSay(Tsuku.pick(lines).replace('%T', game.tries) + (best && save.seekWins > 1 ? '。きろく こうしん！' : ''));
      setBar([['もう いっかい', startSeek, 'btn-main'], ['こんどは ぼくが かくれる', startHide], ['おしゃべりに もどる', backToTalk]]);
      return;
    }
    el.classList.add('checked');
    Snd.miss();
    const t = SPOTS[game.target];
    const s = SPOTS[i];
    const d = Math.hypot(t.x + t.w / 2 - (s.x + s.w / 2), t.y - s.y);
    const near = d < 30;
    el.querySelector('.mark').textContent = near ? '🔥' : '❄️';
    const tease = near
      ? ['ざんねーん！ …でも ちょっと ちかいかも。ドキドキ', 'ぶぶー！ …あ、あぶなかった。ちかいよ〜', 'はずれ〜。でも あったかい ところ だよ。ふふ']
      : ['ぜーんぜん ちがうよ〜！ ぷぷっ', 'はずれ！ %N、そっちは とおいよ〜。さむい さむい', 'そんな とこに ぼくが いる わけ ないじゃん〜'];
    gameSay(Tsuku.pick(tease));
    if (game.tries === 5 && !game.hintUsed) {
      setTimeout(() => {
        if (game && !game.done) gameSay('しかたないなあ、%N。なきごえの ヒント ボタンを おして いいよ');
      }, 2600);
    }
  }

  function seekHint() {
    if (!game || game.done || game.mode !== 'seek') return;
    game.hintUsed = true;
    Snd.song(true);
    const el = spotEl(game.target);
    shake(el);
    el.classList.add('hint');
    setTimeout(() => el && el.classList.remove('hint'), 1800);
    gameSay('ツクツク… あっ、ないちゃった！ ゆれた ところ、みてた？');
  }

  /* --- hide: こどもが かくれる → つくぼうが さがす --- */
  function startHide() {
    game = { mode: 'hide', target: -1, done: false, busy: false };
    buildScene(hideTap);
    setBar([['やめる', backToTalk]]);
    gameSay('%Nが かくれる ばん！ かくれたい ところを タップしてね。ぼくは めを つぶってるよ');
  }

  function hideTap(i, el) {
    if (!game || game.mode !== 'hide' || game.busy || game.target >= 0) return;
    game.target = i;
    game.busy = true;
    Snd.pop();
    el.classList.add('kid');
    el.querySelector('.mark').textContent = '🧒';
    setBar([]);
    // みつけるか どうか、なんかいめで みつけるかを さいしょに きめる
    const others = SPOTS.map((_, k) => k).filter((k) => k !== i).sort(() => Math.random() - 0.5);
    const willFind = Math.random() < 0.5;
    const plan = willFind ? others.slice(0, Math.floor(Math.random() * 3)).concat([i]) : others.slice(0, 3);
    gameSay('いーち、にーい、さーん… じゅう！ もういいかい？ …さがすよ〜！', () => searchStep(plan, 0, willFind));
  }

  function searchStep(plan, k, willFind) {
    if (!game || game.mode !== 'hide') return;
    if (k >= plan.length) {
      // みつけられなかった
      game.done = true;
      save.hideWins++;
      persist();
      const el = spotEl(game.target);
      el.classList.add('found');
      Snd.win();
      gameSay(Tsuku.pick([
        'まいった〜！ %N どこ？ …えっ、%Sに いたの！？ %N、かくれるの うまいじゃん…くやしい ツクツク',
        'こうさん！ でてきて〜。…%Sかあ！ ぜんぜん わからなかった。%N、ちょっと すごいかも',
      ]).replace('%S', SPOTS[game.target].name));
      setBar([['もう いっかい かくれる', startHide, 'btn-main'], ['つくぼうを さがす', startSeek], ['おしゃべりに もどる', backToTalk]]);
      return;
    }
    const i = plan[k];
    const el = spotEl(i);
    moveFinder(el);
    Snd.rustle();
    shake(el);
    setTimeout(() => {
      if (!game || game.mode !== 'hide') return;
      if (i === game.target) {
        game.done = true;
        save.tsukuWins++;
        persist();
        el.classList.add('found');
        Snd.found();
        gameSay(Tsuku.pick([
          'みーつけた！ %N、あたまが でてたよ〜。ぼくの かち！ ツクツクボーシ！',
          'みーつけた！ %Sなんて すぐ わかるよ〜。%N、まだまだ だね',
          'はい、みつけた〜！ %N の おしりが みえてたもん。ぷぷっ',
        ]).replace('%S', SPOTS[i].name));
        setBar([['リベンジ！ もう いっかい', startHide, 'btn-main'], ['つくぼうを さがす', startSeek], ['おしゃべりに もどる', backToTalk]]);
        return;
      }
      el.classList.add('checked');
      gameSay(Tsuku.pick(['%Sかな〜？ …いない。ちぇっ', '%Sに いるでしょ！ …あれ、いない', 'ここだ！ %S！ …ちがった〜']).replace('%S', SPOTS[i].name), () =>
        setTimeout(() => searchStep(plan, k + 1, willFind), 300)
      );
    }, 900);
  }

  function moveFinder(target) {
    let f = $('scene').querySelector('.finder');
    if (!f) {
      f = document.createElement('div');
      f.className = 'finder';
      f.innerHTML = miniSVG();
      $('scene').appendChild(f);
    }
    f.style.left = parseFloat(target.style.left) + parseFloat(target.style.width) / 2 + '%';
    f.style.top = target.style.top;
  }

  function backToTalk() {
    stopSpeak();
    const wasDone = game && game.done;
    const mode = game && game.mode;
    game = null;
    show('talkScreen');
    let line = '%N、また あそぼうね。…つぎも ぼくが かつけど',
      mood = 'smug';
    if (!wasDone) {
      line = 'あれ？ もう やめちゃうの？ %N、あきらめるの はやいよ〜';
    } else if (mode === 'seek') {
      line = `${save.seekWins}かいも ぼくを みつけるなんて…%N、なかなか やるね`;
      mood = 'shy';
    }
    say(line, mood);
    setChips(['かくれんぼ しよう', 'ぼくが かくれる', 'すごいね', 'なきごえ きかせて']);
  }
  $('backBtn').addEventListener('click', backToTalk);

  /* ---------------------------- せってい ---------------------------- */
  $('tgVoice').checked = save.voice;
  $('tgSong').checked = save.song;
  Snd.set(save.song);
  $('soundBtn').textContent = save.voice || save.song ? '🔊' : '🔇';
  $('soundBtn').addEventListener('click', () => ($('soundPanel').hidden = false));
  $('sheetClose').addEventListener('click', () => ($('soundPanel').hidden = true));
  $('soundPanel').addEventListener('click', (e) => {
    if (e.target === $('soundPanel')) $('soundPanel').hidden = true;
  });
  function applySound() {
    save.voice = $('tgVoice').checked;
    save.song = $('tgSong').checked;
    Snd.set(save.song);
    if (!save.voice) stopSpeak();
    $('soundBtn').textContent = save.voice || save.song ? '🔊' : '🔇';
    persist();
  }
  $('tgVoice').addEventListener('change', applySound);
  $('tgSong').addEventListener('change', applySound);
  $('nameChange').addEventListener('click', () => {
    $('soundPanel').hidden = true;
    stopSpeak();
    game = null;
    $('nameInput').value = save.name;
    show('startScreen');
  });
})();
