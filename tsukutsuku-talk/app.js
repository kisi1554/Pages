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
      if (o.pan && ctx.createStereoPanner) {
        const pn = ctx.createStereoPanner();
        pn.pan.value = Math.max(-1, Math.min(1, o.pan));
        g.connect(pn);
        pn.connect(out);
      } else {
        g.connect(out);
      }
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
      /* なかまの なきごえ(みじかく) */
      semi(id) {
        if (!ok()) return;
        let at = ctx.currentTime + 0.05;
        if (id === 'minmin') {
          buzz(at, 0.5, { hz: 2500, hzTo: 2950, q: 3.2, trem: 24, depth: 0.55, gain: 0.3, attack: 0.15 });
          at += 0.5;
          for (let i = 0; i < 3; i++) buzz(at + i * 0.36, 0.3, { hz: 3050, hzTo: 2450, q: 3.4, trem: 30, depth: 0.75, gain: 0.32 });
        } else if (id === 'abura') {
          buzz(at, 1.4, { hz: 3900, q: 1.1, trem: 40, depth: 0.85, gain: 0.22, attack: 0.3, release: 0.4 });
        } else if (id === 'higurashi') {
          for (let i = 0; i < 10; i++) tone(at + i * 0.12, 0.09, i % 2 ? 980 : 1180, { wave: 'sawtooth', gain: 0.16 });
        } else if (id === 'kuma') {
          for (let i = 0; i < 6; i++) buzz(at + i * 0.22, 0.17, { hz: 4300, q: 1.4, trem: 78, depth: 1, gain: 0.26 });
        } else {
          this.song(true);
        }
      },
      /* おとで さがす: pan = -1(ひだり)〜1(みぎ)、vol = 0〜1 */
      chirp(pan, vol) {
        if (!ok()) return;
        const at = ctx.currentTime + 0.03;
        const v = Math.max(0.05, vol || 0.5);
        for (let i = 0; i < 2; i++) {
          buzz(at + i * 0.34, 0.09, { hz: 4100, q: 2.2, gain: 0.34 * v, pan });
          buzz(at + i * 0.34 + 0.13, 0.09, { hz: 4100, q: 2.2, gain: 0.34 * v, pan });
        }
      },
      tick() {
        if (!ok()) return;
        tone(ctx.currentTime + 0.01, 0.06, 1500, { wave: 'square', gain: 0.08 });
      },
      sparkle() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.02;
        [1319, 1568, 2093].forEach((hz, i) => tone(t + i * 0.06, 0.15, hz, { gain: 0.14 }));
      },
      step() {
        if (!ok()) return;
        const t = ctx.currentTime + 0.01;
        [0, 0.16, 0.32].forEach((d) => tone(t + d, 0.07, 180, { to: 120, wave: 'sine', gain: 0.25 }));
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
      setChips(Tsuku.chipsFor(null, ['すごいね', 'もう いっかい ないて']));
      return;
    }
    if (r.action === 'seek' || r.action === 'hide' || (r.action && r.action.indexOf('hg:') === 0)) {
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
    setChips(Tsuku.chipsFor(null, ['かくれんぼ しよう', 'なんで いじわる いうの？']));
  }
  $('startBtn').addEventListener('click', begin);
  $('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') begin();
  });

  /* ---------------------------- かくれんぼ(hide.js) ---------------------------- */
  // action: 'seek' → メニュー / 'hide' → じぶんが かくれる / 'hg:あそびかた:ばしょ' → すぐ はじめる
  function startGame(action) {
    stopSpeak();
    const last = (save.hg && save.hg.last) || { stage: 'park', diff: 'normal' };
    if (action === 'hide') return HideGame.start('hide', last.stage, last.diff);
    if (action && action.indexOf('hg:') === 0) {
      const [, mode, stage] = action.split(':');
      return HideGame.start(mode || 'seek', stage || last.stage, last.diff);
    }
    HideGame.menu();
  }

  function backToTalk(info) {
    stopSpeak();
    HideGame.stop();
    show('talkScreen');
    const L = HideData.lines;
    const p = (a) => a[Math.floor(Math.random() * a.length)];
    let line = p(L.after);
    let mood = 'happy';
    if (!info || !info.done) {
      line = p(L.quit);
      mood = 'smug';
    } else if (Math.random() < 0.4) {
      line = p(L.loveHide);
    }
    say(line, mood);
    setChips(Tsuku.chipsFor(null, ['かくれんぼ しよう', 'よるの かくれんぼ', 'なかま さがし']));
  }

  HideGame.init({
    save,
    persist,
    fill,
    speak,
    stopSpeak,
    Snd,
    show,
    onExit: backToTalk,
  });

  // ◀ もどる: あそんでる とき → メニュー、メニュー → おしゃべり
  $('backBtn').addEventListener('click', () => {
    if (HideGame.playing) HideGame.menu();
    else backToTalk({ done: true });
  });

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
    HideGame.stop();
    $('nameInput').value = save.name;
    show('startScreen');
  });
})();
