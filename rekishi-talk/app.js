'use strict';

/* れきし じんぶつ トーク の がめん（えらぶ・おしゃべり・プロフィール・こえ・おと・ほぞん） */
(() => {
  Talk.prepare(PEOPLE);
  const KEY = 'rekishi-talk-v1';
  const $ = (id) => document.getElementById(id);

  /* ---------------- ほぞん ---------------- */
  const save = { voice: true, sound: true, count: {}, area: '' };
  try {
    Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch (e) {
    /* よめなくても あそべる */
  }
  if (!save.count || typeof save.count !== 'object') save.count = {};
  function store() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* ほぞん できなくても あそべる */
    }
  }

  /* ---------------- おと（WebAudio の ごうせいおん） ---------------- */
  let ac = null;
  function beep(freqs, dur, type) {
    if (!save.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime;
      freqs.forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.value = f;
        const t = t0 + i * dur * 0.6;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      });
    } catch (e) {
      /* おとが でなくても あそべる */
    }
  }
  const sfx = {
    send: () => beep([660], 0.09, 'triangle'),
    reply: () => beep([523, 784], 0.16, 'sine'),
    open: () => beep([392, 523, 659], 0.14, 'triangle'),
  };

  /* ---------------- よみあげ ---------------- */
  let jaVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = window.speechSynthesis.getVoices();
    jaVoice = vs.find((v) => /ja[-_]JP/i.test(v.lang)) || vs.find((v) => /^ja/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  let talkTimer = 0;
  function talking(on) {
    $('portrait').classList.toggle('talking', on);
  }
  function speak(person, text) {
    clearTimeout(talkTimer);
    const plain = Talk.plain(text);
    // こえ が オフ でも くちは すこし うごかす
    const fallback = () => {
      talking(true);
      talkTimer = setTimeout(() => talking(false), Math.min(4000, 600 + plain.length * 45));
    };
    if (!save.voice || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      fallback();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain.replace(/[（(][^）)]*[）)]/g, ''));
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.pitch = person.voice.pitch;
      u.rate = person.voice.rate;
      u.onstart = () => talking(true);
      u.onend = () => talking(false);
      u.onerror = () => talking(false);
      window.speechSynthesis.speak(u);
      talkTimer = setTimeout(() => talking(false), 30000);
    } catch (e) {
      fallback();
    }
  }
  function hush() {
    clearTimeout(talkTimer);
    talking(false);
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {
      /* なにも しない */
    }
  }

  /* ---------------- せってい ボタン ---------------- */
  function syncTools() {
    document.querySelectorAll('.js-voice').forEach((b) => b.setAttribute('aria-pressed', String(save.voice)));
    document.querySelectorAll('.js-sound').forEach((b) => b.setAttribute('aria-pressed', String(save.sound)));
  }
  document.querySelectorAll('.js-voice').forEach((b) => b.addEventListener('click', () => {
    save.voice = !save.voice;
    if (!save.voice) hush();
    syncTools();
    store();
  }));
  document.querySelectorAll('.js-sound').forEach((b) => b.addEventListener('click', () => {
    save.sound = !save.sound;
    syncTools();
    store();
    sfx.send();
  }));
  syncTools();

  /* ---------------- えらぶ がめん ---------------- */
  const order = PEOPLE.slice().sort((a, b) => (a.born || a.died - 40) - (b.born || b.died - 40));
  function tint(hex) {
    return Art.shade(hex, 1) + '22';
  }
  function renderList() {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.area === save.area)));
    $('cards').innerHTML = order
      .filter((p) => !save.area || p.area === save.area)
      .map((p) => `<li><button class="card" type="button" data-id="${p.id}" style="--c:${p.color}">
        <span class="era">${Talk.esc(p.era)}</span>
        ${save.count[p.id] ? `<span class="cnt">💬${save.count[p.id]}</span>` : ''}
        ${Art.face(p.look, { noItem: false })}
        <span class="nm">${Talk.ruby(p.name)}</span>
        <span class="yr">${Talk.esc(p.years)}</span>
        <span class="tt">${Talk.ruby(p.title)}</span>
      </button></li>`).join('');
  }
  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (b) go(b.dataset.id);
  });
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    save.area = t.dataset.area;
    store();
    renderList();
  }));

  /* ---------------- おしゃべり がめん ---------------- */
  let person = null;
  let mem = {};
  let busy = 0;

  function addMsg(who, html) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerHTML = html;
    $('log').appendChild(d);
    $('log').scrollTop = $('log').scrollHeight;
    return d;
  }
  function themMsg(text) {
    return addMsg('them', `<span class="who">${Talk.ruby(person.name)}</span>${Talk.ruby(text)}`);
  }
  function renderChips(chips) {
    $('chips').innerHTML = chips.map((c) => `<button class="chip" type="button" data-id="${Talk.esc(c.id)}">${Talk.esc(c.q)}</button>`).join('');
  }

  function open(id) {
    const p = PEOPLE.find((x) => x.id === id);
    if (!p) return show(null);
    person = p;
    mem = {};
    hush();
    const root = document.documentElement;
    root.style.setProperty('--c', p.color);
    root.style.setProperty('--tint', tint(p.color));
    $('chatTitle').innerHTML = Talk.ruby(p.name);
    $('portrait').innerHTML = Art.face(p.look, { label: Talk.plain(p.name) });
    $('heroName').innerHTML = Talk.ruby(p.name);
    $('heroYears').textContent = `${p.years}（${p.era}）`;
    $('heroTitle').innerHTML = Talk.ruby(p.title);
    $('log').innerHTML = '';
    themMsg(p.hello);
    renderChips(Talk.chips(p, mem));
    $('listView').hidden = true;
    $('chatView').hidden = false;
    sfx.open();
    speak(p, p.hello);
  }

  function ask(text, forced) {
    if (!person) return;
    const q = String(text || '').trim();
    if (!q && !forced) return;
    hush();
    addMsg('me', Talk.esc(q));
    sfx.send();
    save.count[person.id] = (save.count[person.id] || 0) + 1;
    store();
    const r = Talk.reply(person, q, mem, forced || null);
    const me = person;
    const typing = addMsg('them typing', `<span class="who">${Talk.ruby(person.name)}</span>…`);
    busy += 1;
    setTimeout(() => {
      busy -= 1;
      typing.remove();
      if (person !== me) return;
      themMsg(r.text);
      renderChips(r.chips);
      sfx.reply();
      speak(person, r.text);
    }, 450);
  }

  $('chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) ask(b.textContent, b.dataset.id);
  });
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('text').value;
    $('text').value = '';
    ask(t);
  });

  /* こえで しつもん（つかえる ブラウザ だけ） */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    $('btnMic').hidden = false;
    let rec = null;
    $('btnMic').addEventListener('click', () => {
      if (rec) {
        rec.stop();
        return;
      }
      hush();
      try {
        rec = new SR();
        rec.lang = 'ja-JP';
        rec.interimResults = false;
        rec.onresult = (e) => {
          const t = e.results[0] && e.results[0][0] ? e.results[0][0].transcript : '';
          if (t) ask(t);
        };
        rec.onend = () => {
          rec = null;
          $('btnMic').classList.remove('on');
        };
        rec.start();
        $('btnMic').classList.add('on');
      } catch (err) {
        rec = null;
      }
    });
  }

  /* プロフィール */
  $('btnProfile').addEventListener('click', () => {
    if (!person) return;
    const p = person;
    $('profileBody').innerHTML = `<div class="pf-head">${Art.face(p.look)}<div>
        <h2>${Talk.ruby(p.name)}</h2>
        <div>${Talk.esc(p.years)}（${Talk.esc(p.era)}）</div>
        <div>${Talk.ruby(p.title)}</div></div></div>
      <ul>${p.facts.map((f) => `<li>${Talk.ruby(f)}</li>`).join('')}</ul>
      <p class="small">💬 これまでに ${save.count[p.id] || 0}かい しつもん したよ。<br>
      こたえは きろくを もとに した なりきり です。もっと しりたく なったら、としょかんの でんきや れきしの ほんで しらべて みよう！</p>`;
    const dlg = $('profile');
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute('open', '');
  });

  /* ---------------- がめんの きりかえ（#id で もどる ボタン も きく） ---------------- */
  function show(id) {
    if (id) {
      open(id);
      return;
    }
    hush();
    person = null;
    document.documentElement.style.removeProperty('--c');
    document.documentElement.style.removeProperty('--tint');
    $('chatView').hidden = true;
    $('listView').hidden = false;
    renderList();
  }
  function go(id) {
    if (location.hash.slice(1) === id) show(id);
    else location.hash = id;
  }
  $('btnList').addEventListener('click', () => {
    if (location.hash) location.hash = '';
    else show(null);
  });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1));

  // テスト よう
  window.RekishiDebug = {
    open: go,
    person: () => person && person.id,
    busy: () => busy,
    mem: () => mem,
  };
})();
