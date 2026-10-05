'use strict';

/*
 * がめんの くみたて と そうさ
 *   - ルディの かお(SVG)を きりかえる
 *   - ふきだしを 1ぎょうずつ だして、よみあげる
 *   - マイク / もじ / ボタン で はなしかける
 *   - ことばちょう、ことばカード
 *   - きろくは localStorage(読み書きは try/catch)
 */

(function () {
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'rudy-talk:v1';

  /* ============================ ほぞん ============================ */

  let sound = true;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ mem: Brain.mem(), sound }));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }

  /* ============================ おと ============================ */

  const Sound = (function () {
    let ctx = null;
    let voice = null;

    function pickVoice() {
      if (!window.speechSynthesis) return;
      const vs = window.speechSynthesis.getVoices() || [];
      voice = vs.find((v) => v.lang === 'ja-JP' && /Kyoko|O-ren|Google/i.test(v.name))
        || vs.find((v) => v.lang === 'ja-JP')
        || vs.find((v) => (v.lang || '').indexOf('ja') === 0)
        || null;
    }
    if (window.speechSynthesis) {
      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(hz, at, dur, type, gain, toHz) {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(hz, at);
      if (toHz) o.frequency.exponentialRampToValueAtTime(toHz, at + dur);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain || 0.15, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(at);
      o.stop(at + dur + 0.03);
    }

    /* ニャー(のこぎり波を フィルターで まるく する) */
    function meow() {
      const c = ensure();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t);
      o.frequency.linearRampToValueAtTime(880, t + 0.14);
      o.frequency.linearRampToValueAtTime(600, t + 0.42);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.linearRampToValueAtTime(2200, t + 0.15);
      f.frequency.linearRampToValueAtTime(1000, t + 0.42);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.05);
      g.gain.linearRampToValueAtTime(0.09, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      o.connect(f);
      f.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.5);
    }

    const SFX = {
      pop: (t) => tone(540, t, 0.08, 'triangle', 0.07),
      meow: () => meow(),
      ok: (t) => { tone(988, t, 0.16, 'sine', 0.16); tone(1319, t + 0.13, 0.3, 'sine', 0.16); },
      ng: (t) => { tone(240, t, 0.32, 'square', 0.05, 150); },
      yay: (t) => [784, 988, 1175, 1568].forEach((hz, i) => tone(hz, t + i * 0.08, 0.22, 'sine', 0.13)),
      quiz: (t) => { tone(660, t, 0.14, 'sine', 0.12); tone(880, t + 0.12, 0.2, 'sine', 0.12); },
      level: (t) => {
        [523, 659, 784, 1047].forEach((hz, i) => tone(hz, t + i * 0.1, 0.25, 'triangle', 0.13));
        [523, 659, 784].forEach((hz) => tone(hz * 2, t + 0.45, 0.6, 'sine', 0.06));
      },
      listen: (t) => { tone(660, t, 0.1, 'sine', 0.1); tone(880, t + 0.08, 0.14, 'sine', 0.1); },
    };

    function sfx(name) {
      if (!sound || !SFX[name]) return;
      const c = ensure();
      if (!c) return;
      SFX[name](c.currentTime);
    }

    /* よみあげ用に ととのえる */
    function clean(text) {
      return Brain.toSpeech(text)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
        .replace(/[「」『』()（）]/g, ' ')
        .replace(/ニャハハ/g, 'にゃはは')
        .replace(/\s+/g, ' ')
        .trim();
    }

    let speakToken = 0;
    function speak(text, onDone) {
      stop();
      const body = clean(text);
      if (!sound || !window.speechSynthesis || !body) {
        if (onDone) onDone(false);
        return;
      }
      const my = ++speakToken;
      const u = new SpeechSynthesisUtterance(body);
      u.lang = 'ja-JP';
      if (!voice) pickVoice();
      if (voice) u.voice = voice;
      u.pitch = 1.6;
      u.rate = 1.05;
      const done = () => { if (my === speakToken && onDone) onDone(true); };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    }
    function stop() {
      speakToken += 1;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    return { sfx, speak, stop, unlock: ensure };
  })();

  /* ============================ ききとり ============================ */

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;

  function startListen() {
    if (!Recognition) return;
    if (listening) { stopListen(); return; }
    flush();
    Sound.stop();
    if (!recog) {
      recog = new Recognition();
      recog.lang = 'ja-JP';
      recog.continuous = false;
      recog.interimResults = true;
      recog.onresult = (ev) => {
        let fin = '';
        let part = '';
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          if (ev.results[i].isFinal) fin += ev.results[i][0].transcript;
          else part += ev.results[i][0].transcript;
        }
        if (part) $('in-text').value = part;
        if (fin) {
          $('in-text').value = '';
          send(fin.trim());
        }
      };
      recog.onend = () => { listening = false; $('btn-mic').classList.remove('on'); };
      recog.onerror = () => { listening = false; $('btn-mic').classList.remove('on'); };
    }
    try {
      recog.start();
      listening = true;
      $('btn-mic').classList.add('on');
      Sound.sfx('listen');
    } catch (e) {
      listening = false;
    }
  }
  function stopListen() {
    try { if (recog) recog.stop(); } catch (e) { /* もう とまっている */ }
    listening = false;
    $('btn-mic').classList.remove('on');
  }

  /* ============================ ルディの かお ============================ */

  const FACES = {
    normal: { eyes: 'normal', mouth: 'cat', brow: 'none' },
    smug: { eyes: 'smug', mouth: 'smirk', brow: 'smug' },
    happy: { eyes: 'happy', mouth: 'open', brow: 'none' },
    surprise: { eyes: 'surprise', mouth: 'o', brow: 'up' },
    angry: { eyes: 'angry', mouth: 'flat', brow: 'angry' },
    shy: { eyes: 'shy', mouth: 'wavy', brow: 'none', blush: 1 },
    sleepy: { eyes: 'sleepy', mouth: 'o', brow: 'none', z: 1 },
    sad: { eyes: 'down', mouth: 'frown', brow: 'sad' },
    think: { eyes: 'up', mouth: 'small', brow: 'think' },
    wink: { eyes: 'wink', mouth: 'open', brow: 'none' },
  };

  function mountRudy(box) {
    box.appendChild(document.getElementById('rudy-tpl').content.cloneNode(true));
  }

  function setFace(name) {
    const f = FACES[name] || FACES.normal;
    document.querySelectorAll('.rudy').forEach((svg) => {
      svg.dataset.eyes = f.eyes;
      svg.dataset.mouth = f.mouth;
      svg.dataset.brow = f.brow;
      svg.dataset.blush = f.blush ? '1' : '0';
      svg.dataset.z = f.z ? '1' : '0';
    });
  }
  function setTalking(on) {
    document.querySelectorAll('.rudy').forEach((svg) => svg.classList.toggle('talking', !!on));
  }
  function bump(cls) {
    const box = $('rudy-box');
    box.classList.remove(cls);
    void box.offsetWidth;
    box.classList.add(cls);
  }

  /* ============================ もじの ひょうじ ============================ */

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function rubyHtml(r) {
    const base = r.rt ? `<ruby>${esc(r.base)}<rt>${esc(r.rt)}</rt></ruby>` : esc(r.base);
    return base + esc(r.rest);
  }

  /* [[ことば]] を ひかる ボタンに */
  function rich(text) {
    return Brain.parse(text).map((p) => {
      if (p.t === 'text') return esc(p.s);
      return `<button type="button" class="vw" data-w="${esc(p.w)}">${rubyHtml(p.ruby)}</button>`;
    }).join('');
  }

  /* ボタンの もじ。{ことば} なら ふりがな つき */
  function label(s) {
    const m = String(s).match(/^\{(.+)\}$/);
    if (m && Brain.word(m[1])) return rubyHtml(Brain.rubyOf(Brain.word(m[1])));
    return esc(s);
  }
  function plainLabel(s) {
    const m = String(s).match(/^\{(.+)\}$/);
    return m ? m[1] : String(s);
  }

  /* ============================ ふきだし ============================ */

  const log = () => $('log');

  function addMsg(who, html) {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    el.innerHTML = `<div class="bubble">${html}</div>`;
    log().appendChild(el);
    log().scrollTop = log().scrollHeight;
    /* ふるい ものは けして かるく する */
    while (log().children.length > 80) log().removeChild(log().firstChild);
    return el;
  }

  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = addMsg('from-rudy typing', '<span>・</span><span>・</span><span>・</span>');
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  /* ============================ へんじを ながす ============================ */

  let playing = null; // { lines, reply, timer }

  function clearUi() {
    $('choices').innerHTML = '';
    $('chips').innerHTML = '';
  }

  function play(reply) {
    if (!reply) return;
    flush();
    clearUi();
    if (reply.sfx) Sound.sfx(reply.sfx);
    playing = { lines: reply.lines.slice(), reply, timer: null };
    nextLine();
  }

  function nextLine() {
    const p = playing;
    if (!p) return;
    if (!p.lines.length) { endReply(); return; }
    showTyping();
    p.timer = setTimeout(() => {
      if (playing !== p) return;
      hideTyping();
      const line = p.lines.shift();
      addMsg('from-rudy', rich(line.text));
      setFace(line.face);
      Sound.sfx('pop');
      setTalking(true);
      const est = Math.min(6000, 700 + Brain.toSpeech(line.text).length * 85);
      let advanced = false;
      const go = () => {
        if (advanced || playing !== p) return;
        advanced = true;
        clearTimeout(p.timer);
        setTalking(false);
        p.timer = setTimeout(nextLine, 250);
      };
      Sound.speak(line.text, (spoke) => {
        if (spoke) go();
        else p.timer = setTimeout(go, est);
      });
      /* よみあげが おわった しらせが こない ブラウザ むけ */
      if (sound && window.speechSynthesis) p.timer = setTimeout(go, est * 2 + 2500);
    }, 380);
  }

  function endReply() {
    const p = playing;
    playing = null;
    hideTyping();
    setTalking(false);
    if (!p) return;
    showChoices(p.reply);
    afterEvent(p.reply);
    resetIdle();
  }

  /* こどもが さきに さわったら、のこりを いっきに だす */
  function flush() {
    const p = playing;
    if (!p) return;
    clearTimeout(p.timer);
    playing = null;
    hideTyping();
    Sound.stop();
    setTalking(false);
    p.lines.forEach((l) => { addMsg('from-rudy', rich(l.text)); setFace(l.face); });
    showChoices(p.reply);
    afterEvent(p.reply);
  }

  function showChoices(reply) {
    clearUi();
    (reply.choices || []).forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = `<span class="num">${i + 1}</span><span>${label(c.label)}</span>`;
      b.addEventListener('click', () => send(`${i + 1}. ${plainLabel(c.label)}`, { choice: i, text: plainLabel(c.label) }));
      $('choices').appendChild(b);
    });
    (reply.chips || []).forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.addEventListener('click', () => send(t));
      $('chips').appendChild(b);
    });
  }

  function afterEvent(reply) {
    refreshStatus();
    if (reply.event === 'book') setTimeout(openBook, 300);
    if (reply.event === 'mitome') {
      const m = $('mitome');
      m.classList.remove('glow');
      void m.offsetWidth;
      m.classList.add('glow');
      bump('hop');
    }
    if (reply.event === 'name') $('in-name').value = Brain.mem().name || '';
    save();
  }

  /* ============================ はなしかける ============================ */

  function send(text, opts) {
    const t = String(text || '').trim();
    if (!t) return;
    Sound.unlock();
    flush();
    stopListenQuiet();
    addMsg('from-kid', esc(t));
    clearUi();
    const r = Brain.reply(opts && opts.text ? opts.text : t, opts);
    save();
    play(r);
  }
  function stopListenQuiet() {
    if (listening) stopListen();
  }

  /* だまっていると ルディから はなしかける */
  let idleTimer = null;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const onTalk = $('screen-talk').classList.contains('is-active');
      const modalOpen = !$('modal-book').hidden || !$('modal-word').hidden;
      if (!onTalk || modalOpen || playing || listening || document.hidden) { resetIdle(); return; }
      const r = Brain.idle();
      if (r) play(r);
    }, 45000);
  }

  /* ============================ じょうたい ============================ */

  function refreshStatus() {
    const mem = Brain.mem();
    const rk = Brain.rank();
    $('rank-badge').textContent = `${rk.icon} ${rk.name}`;
    const met = Brain.words.filter((w) => Brain.status(w.w) > 0).length;
    const badge = $('book-count');
    if (badge.textContent !== String(met)) {
      badge.textContent = String(met);
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
    }
    const n = Math.round((mem.mitome || 0) / 20);
    let fish = '';
    for (let i = 0; i < 5; i += 1) fish += `<i class="${i < n ? '' : 'off'}">🐟</i>`;
    $('fish').innerHTML = fish;
    $('mitome').setAttribute('aria-label', `ルディの みとめど ${mem.mitome || 0}`);
    document.querySelectorAll('.seg button[data-level]').forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.level) === mem.level);
    });
    $('btn-sound').textContent = sound ? '🔊' : '🔇';
    $('btn-sound').classList.toggle('is-off', !sound);
  }

  /* ============================ ことばちょう ============================ */

  const STATUS_ICON = ['', '🐾', '⭐', '👑'];
  const STATUS_TEXT = ['まだ であって いない', '🐾 であった ことば', '⭐ いみが わかった ことば', '👑 じぶんで つかえた ことば'];

  function openBook() {
    const mem = Brain.mem();
    const rk = Brain.rank();
    const met = Brain.words.filter((w) => Brain.status(w.w) > 0);
    const used = met.filter((w) => Brain.status(w.w) === 3).length;
    const prog = rk.next ? Math.round(((rk.score - prevAt(rk)) / (rk.next.at - prevAt(rk))) * 100) : 100;
    $('book-rank').innerHTML =
      `ことばランク: <b>${rk.icon} ${esc(rk.name)}</b>(${rk.score} てん)<br>` +
      `であった ことば ${met.length} / ${Brain.words.length}・つかえた ことば ${used}` +
      (rk.next ? `<div class="bar-prog"><i style="width:${Math.max(4, prog)}%"></i></div>` +
        `<small>つぎは ${rk.next.icon} ${esc(rk.next.name)}(${rk.next.at} てん)</small>` : '<br>🌟 さいこうランク!');

    const list = $('book-list');
    list.innerHTML = '';
    const order = met.slice().sort((a, b) => Brain.status(b.w) - Brain.status(a.w) || a.lv - b.lv);
    order.forEach((w) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'book-item';
      b.innerHTML = `<span>${rubyHtml(Brain.rubyOf(w))}</span><span class="st">${STATUS_ICON[Brain.status(w.w)]}</span>`;
      b.addEventListener('click', () => openWord(w.w));
      list.appendChild(b);
    });
    const locked = Brain.words.filter((w) => w.lv <= mem.level && Brain.status(w.w) === 0);
    if (!met.length) {
      const p = document.createElement('p');
      p.className = 'book-empty';
      p.textContent = 'まだ からっぽ。ルディと はなすと、ことばが ここに たまって いくよ。';
      list.appendChild(p);
    }
    locked.forEach(() => {
      const d = document.createElement('div');
      d.className = 'book-item locked';
      d.textContent = '？？？';
      list.appendChild(d);
    });
    $('modal-book').hidden = false;
  }
  function prevAt(rk) {
    const i = Brain.RANKS.findIndex((x) => x.name === rk.name);
    return Brain.RANKS[i].at;
  }

  let wordShown = null;
  function openWord(w) {
    const word = Brain.word(w);
    if (!word) return;
    wordShown = word;
    $('word-status').textContent = STATUS_TEXT[Brain.status(w)];
    $('word-big').innerHTML = rubyHtml(Brain.rubyOf(word));
    $('word-mean').textContent = word.m;
    $('word-ex').innerHTML = '🐱 ' + rich(Brain.markExample(word));
    $('modal-word').hidden = false;
  }

  function closeModals() {
    $('modal-book').hidden = true;
    $('modal-word').hidden = true;
    resetIdle();
  }

  /* ============================ はじめる ============================ */

  let greeted = false;

  function startTalk() {
    Sound.unlock();
    const mem = Brain.mem();
    mem.name = $('in-name').value.trim().slice(0, 8);
    save();
    $('screen-start').classList.remove('is-active');
    $('screen-talk').classList.add('is-active');
    refreshStatus();
    if (!greeted) {
      greeted = true;
      Sound.sfx('meow');
      setTimeout(() => play(Brain.hello()), 400);
    } else {
      resetIdle();
    }
  }

  function setLevel(lv) {
    Brain.mem().level = lv;
    save();
    refreshStatus();
    if (!$('modal-book').hidden) openBook();
  }

  function init() {
    const saved = load();
    if (saved && typeof saved.sound === 'boolean') sound = saved.sound;
    Brain.init(saved && saved.mem);
    const mem = Brain.mem();
    $('in-name').value = mem.name || '';

    mountRudy($('start-rudy'));
    mountRudy($('rudy-box'));
    setFace('smug');
    refreshStatus();

    $('btn-start').addEventListener('click', startTalk);
    $('start-rudy').addEventListener('click', () => {
      Sound.unlock();
      Sound.sfx('meow');
      setFace(['wink', 'smug', 'happy', 'surprise'][Math.floor(Math.random() * 4)]);
    });
    document.querySelectorAll('.seg button[data-level]').forEach((b) => {
      b.addEventListener('click', () => setLevel(Number(b.dataset.level)));
    });

    $('btn-home').addEventListener('click', () => {
      flush();
      Sound.stop();
      stopListenQuiet();
      clearTimeout(idleTimer);
      $('screen-talk').classList.remove('is-active');
      $('screen-start').classList.add('is-active');
      setFace('smug');
    });

    $('btn-sound').addEventListener('click', () => {
      sound = !sound;
      if (!sound) Sound.stop();
      Sound.unlock();
      Sound.sfx('pop');
      refreshStatus();
      save();
    });

    $('btn-book').addEventListener('click', () => { flush(); openBook(); });

    $('form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const t = $('in-text').value;
      $('in-text').value = '';
      send(t);
    });

    if (Recognition) $('btn-mic').addEventListener('click', startListen);
    else $('btn-mic').hidden = true;

    /* ルディを タップ */
    const pokeRudy = () => {
      Sound.unlock();
      Sound.sfx('meow');
      bump('squish');
      document.querySelectorAll('.rudy').forEach((s) => {
        s.classList.remove('twitch');
        void s.getBoundingClientRect();
        s.classList.add('twitch');
      });
      if (playing) return;
      const r = Brain.poke();
      addMsg('from-rudy', rich(r.lines[0].text));
      setFace(r.lines[0].face);
      Sound.speak(r.lines[0].text);
      save();
      resetIdle();
    };
    $('rudy-box').addEventListener('click', pokeRudy);
    $('rudy-box').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pokeRudy(); }
    });

    /* ひかっている ことばを タップ */
    $('log').addEventListener('click', (ev) => {
      const b = ev.target.closest('.vw');
      if (b) openWord(b.dataset.w);
    });

    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
    document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (ev) => {
      if (ev.target === m) closeModals();
    }));
    $('btn-read').addEventListener('click', () => {
      const w = wordShown;
      if (!w) return;
      Sound.unlock();
      Sound.speak(`[[${w.w}]]。${w.m}。${Brain.markExample(w)}`);
    });
    $('btn-reset').addEventListener('click', () => {
      if (!window.confirm('おぼえた ことばや みとめどを ぜんぶ けします。いいですか?')) return;
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* なにもしない */ }
      Brain.init({ name: Brain.mem().name, level: Brain.mem().level });
      save();
      closeModals();
      refreshStatus();
    });

    /* ときどき かおを かえる(だまって いる とき) */
    setInterval(() => {
      if (playing || document.hidden) return;
      if (Math.random() < 0.3) setFace(['normal', 'smug', 'think', 'sleepy', 'normal'][Math.floor(Math.random() * 5)]);
    }, 7000);
  }

  init();
})();
