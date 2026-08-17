'use strict';

/*
 * がめんの くみたてと そうさ
 *  - キャラえらび → おはなし
 *  - ふきだしの ひょうじ、よみあげ、マイク、ろせんず
 * ぜんぶ ブラウザの中だけで うごく(サーバー ふよう)。
 */

(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    screenTitle: $('screen-title'),
    screenTalk: $('screen-talk'),
    charList: $('char-list'),
    childName: $('child-name'),
    btnBack: $('btn-back'),
    btnVoice: $('btn-voice'),
    btnMap: $('btn-map'),
    btnWords: $('btn-words'),
    wordPanel: $('word-panel'),
    wordList: $('word-list'),
    wordCount: $('word-count'),
    levelBtns: $('level-btns'),
    charName: $('talk-char-name'),
    lineName: $('talk-line-name'),
    train: $('train'),
    trainDest: $('train-dest'),
    trainHat: $('train-hat'),
    trainAura: $('train-aura'),
    mapPanel: $('map-panel'),
    mapLines: $('map-lines'),
    mapStrip: $('map-strip'),
    log: $('log'),
    chips: $('chips'),
    btnMic: $('btn-mic'),
    micLabel: $('mic-label'),
    textInput: $('text-input'),
    btnSend: $('btn-send'),
  };

  const STORE = {
    name: 'densha-talk:name',
    char: 'densha-talk:char',
    voice: 'densha-talk:voice',
    level: 'densha-talk:level',
    learned: 'densha-talk:learned',
  };

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* プライベートモードなど。きろく できなくても あそべる */
    }
  }

  let mapLineId = null;
  let pending = [];        // じゅんばんに だす とちゅうの セリフ
  let pendingTimers = [];
  let idleTimer = null;
  let idleCount = 0;

  /* ==================================================================
   * キャラえらび
   * ================================================================== */

  function miniTrain(char) {
    return (
      '<span class="mini-train" data-char="' + char.id + '" style="--c:' +
      char.color +
      ';--ink:' +
      char.ink +
      '">' +
      '<span class="mini-hat">' + (char.hat || '') + '</span>' +
      '<span class="mini-face">' +
      char.face +
      '</span></span>'
    );
  }

  function renderCharList() {
    el.charList.innerHTML = '';
    CHARACTERS.forEach((char) => {
      const line = LINE_BY_ID[char.lineId];
      const card = document.createElement('button');
      card.className = 'char-card';
      card.style.setProperty('--c', char.color);
      card.style.setProperty('--ink', char.ink);
      card.innerHTML =
        miniTrain(char) +
        '<span class="char-name">' +
        char.name +
        '</span>' +
        '<span class="char-line">' +
        line.name +
        '</span>' +
        '<span class="char-tag">' +
        char.tag +
        '</span>';
      card.addEventListener('click', () => {
        Speech.unlock();
        Speech.sfx.depart();
        startTalk(char.id);
      });
      el.charList.appendChild(card);
    });
  }

  /* ==================================================================
   * おはなし がめん
   * ================================================================== */

  function startTalk(charId) {
    const name = el.childName.value.trim();
    save(STORE.name, name);
    save(STORE.char, charId);
    Brain.setChildName(name);
    Brain.setCharacter(charId);

    const char = CHAR_BY_ID[charId];
    const line = LINE_BY_ID[char.lineId];
    document.documentElement.style.setProperty('--char-color', char.color);
    document.documentElement.style.setProperty('--char-ink', char.ink);
    el.charName.textContent = char.name;
    el.lineName.textContent = line.name;
    el.trainDest.textContent = line.name;
    /* キャラごとの みため(CSSが data-char を みて かおや かざりを かえる) */
    el.train.dataset.char = char.id;
    el.trainHat.textContent = char.hat || '';
    Array.prototype.forEach.call(el.trainAura.children, (sp) => {
      sp.textContent = char.aura || '';
    });
    el.log.innerHTML = '';

    el.screenTitle.classList.remove('is-active');
    el.screenTalk.classList.add('is-active');

    renderMapLines();
    setMapLine(line.id);
    handleReply(Brain.greeting());
  }

  function backToTitle() {
    Speech.stopSpeak();
    Speech.stopListen();
    pendingTimers.forEach(clearTimeout);
    pendingTimers = [];
    pending = [];
    clearTimeout(idleTimer);
    el.screenTalk.classList.remove('is-active');
    el.screenTitle.classList.add('is-active');
  }

  /* ------------------------------ ふきだし ------------------------------ */

  function addBubble(text, who) {
    const div = document.createElement('div');
    div.className = 'bubble bubble-' + who;
    div.textContent = text;
    el.log.appendChild(div);
    el.log.scrollTop = el.log.scrollHeight;
    return div;
  }

  /* つかえる ひょうじょう。CSSの .is-〜 と そろえる */
  const FACES = [
    'happy', 'think', 'wow',
    'wink', 'love', 'shock', 'sleepy', 'angry', 'tehe', 'dizzy', 'proud',
  ];
  /*
   * ときどき ちらっと みせる おまけの かお。
   * 「むっ」「ガーン」は わけも なく でると こわいので、
   * ばめんに あわせた ときだけ つかう(ここには いれない)。
   */
  const GAG_FACES = ['wink', 'love', 'dizzy', 'tehe', 'sleepy', 'proud'];

  let baseFace = 'happy';
  let gagTimer = null;

  function setFace(mood, temporary) {
    const next = FACES.indexOf(mood) >= 0 ? mood : 'happy';
    FACES.forEach((f) => el.train.classList.remove('is-' + f));
    el.train.classList.add('is-' + next);
    if (!temporary) {
      baseFace = next;
      clearTimeout(gagTimer);
    }
  }

  /* しばらく べつの かおに して、じかんが たったら もどす */
  function gagFace(mood, ms) {
    clearTimeout(gagTimer);
    setFace(mood, true);
    gagTimer = setTimeout(() => setFace(baseFace, true), ms || 1900);
  }

  function randomFace() {
    return GAG_FACES[Math.floor(Math.random() * GAG_FACES.length)];
  }

  function setTalking(on) {
    el.train.classList.toggle('is-talking', !!on);
  }

  function renderChips(chips) {
    el.chips.innerHTML = '';
    (chips || []).forEach((c) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = c.label;
      b.addEventListener('click', () => sendText(c.send, c.label));
      el.chips.appendChild(b);
    });
  }

  /* キャラの へんじを、じゅんばんに ふきだしで だしながら よみあげる */
  function handleReply(res) {
    setFace(res.face);
    renderChips(res.chips);

    if (res.focusLine) setMapLine(res.focusLine, res.focusStation);
    else if (res.focusStation) highlightStation(res.focusStation);
    if (res.openMap) el.mapPanel.classList.add('is-open');

    /* まだ だしきって いない セリフが あれば、さきに ぜんぶ だす */
    flushBubbles();
    const texts = res.say.filter((t) => t && t.length > 0);
    pending = texts.map((t) => ({ text: t, shown: false }));
    pending.forEach((item, i) => {
      pendingTimers.push(
        setTimeout(() => {
          if (item.shown) return;
          item.shown = true;
          addBubble(item.text, 'char');
          Speech.sfx.pop();
        }, i * 520)
      );
    });

    setTalking(true);
    Speech.speak(texts, Brain.state.char.voice, () => {
      setTalking(false);
      /* はなしおわった あと、ときどき ちらっと ちがう かおを する */
      if (Math.random() < 0.28) setTimeout(() => gagFace(randomFace()), 500);
    });
    saveLearned();
    startIdleTimer();
  }

  /* とちゅうの セリフを いますぐ ぜんぶ ふきだしに する(じゅんばんが まざらないように) */
  function flushBubbles() {
    pendingTimers.forEach(clearTimeout);
    pendingTimers = [];
    pending.forEach((item) => {
      if (item.shown) return;
      item.shown = true;
      addBubble(item.text, 'char');
    });
    pending = [];
  }

  function sendText(text, label) {
    const body = String(text || '').trim();
    if (!body) return;
    flushBubbles();
    clearTimeout(idleTimer);
    idleCount = 0;
    Speech.stopSpeak();
    addBubble(label || body, 'me');
    el.textInput.value = '';
    setTimeout(() => handleReply(Brain.respond(body)), 260);
  }

  /* ------------------------------ ひまなとき ------------------------------ */

  const IDLE_LINES = [
    'ねえねえ、なにか はなそうよ!',
    'えきの なまえを ひとつ いってみて!',
    'クイズ、してみる?',
    'きょうは どこか おでかけした?',
  ];

  function startIdleTimer() {
    clearTimeout(idleTimer);
    if (idleCount >= 3) return;
    idleTimer = setTimeout(() => {
      if (!el.screenTalk.classList.contains('is-active')) return;
      if (Speech.isSpeaking() || Speech.isListening()) {
        startIdleTimer();
        return;
      }
      idleCount += 1;
      /* 2かいに 1かいは、ことばを ひとつ おしえる */
      const text =
        idleCount % 2 === 0 ? Brain.wordTip() : IDLE_LINES[(idleCount - 1) % IDLE_LINES.length];
      addBubble(text, 'char');
      setTalking(true);
      Speech.speak([text], Brain.state.char.voice, () => setTalking(false));
      startIdleTimer();
    }, 32000);
  }

  /* ==================================================================
   * ことばちょう(おぼえた ことば)
   * ================================================================== */

  function saveLearned() {
    const list = Brain.state.learned;
    save(STORE.learned, JSON.stringify(list));
    renderWords();
  }

  function renderWords() {
    const entries = Brain.learnedWords();
    el.wordCount.textContent = entries.length + ' / ' + WORDS.length;
    el.wordList.innerHTML = '';
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'word-empty';
      p.textContent = 'まだ からっぽ。「ことばクイズ」や「きょうの ことば」で ふえていくよ!';
      el.wordList.appendChild(p);
      return;
    }
    entries
      .slice()
      .reverse()
      .forEach((entry) => {
        const b = document.createElement('button');
        b.className = 'word-chip lv' + entry.lv;
        b.innerHTML =
          '<span class="word-w">' + entry.w + '</span>' +
          '<span class="word-y">' + entry.y + '</span>';
        b.addEventListener('click', () => {
          addBubble(entry.w + 'って なに?', 'me');
          const res = Brain.explainWord(entry.w);
          if (res) setTimeout(() => handleReply(res), 200);
        });
        el.wordList.appendChild(b);
      });
  }

  /* ==================================================================
   * ろせんず
   * ================================================================== */

  function renderMapLines() {
    el.mapLines.innerHTML = '';
    COMPANIES.forEach((company) => {
      company.lines.forEach((line) => {
        const b = document.createElement('button');
        b.className = 'line-pill';
        b.dataset.line = line.id;
        b.style.setProperty('--c', line.color);
        b.textContent = line.name;
        b.addEventListener('click', () => {
          setMapLine(line.id);
          sendText(line.name + 'って どんな でんしゃ?', line.name + 'の こと おしえて');
        });
        el.mapLines.appendChild(b);
      });
    });
  }

  function setMapLine(lineId, focusStation) {
    const line = LINE_BY_ID[lineId];
    if (!line) return;
    if (mapLineId !== lineId) {
      mapLineId = lineId;
      el.mapStrip.innerHTML = '';
      el.mapStrip.style.setProperty('--c', line.color);
      line.stations.forEach((st) => {
        const b = document.createElement('button');
        b.className = 'map-station';
        b.dataset.station = st.name;
        b.innerHTML =
          '<span class="map-dot"></span>' +
          '<span class="map-name">' +
          st.name +
          '</span>' +
          '<span class="map-motif">' +
          st.motif +
          '</span>';
        b.addEventListener('click', () => {
          sendText(st.name + 'って どんな えき?', st.name + 'の こと おしえて');
        });
        el.mapStrip.appendChild(b);
      });
      Array.prototype.forEach.call(el.mapLines.children, (pill) => {
        pill.classList.toggle('is-on', pill.dataset.line === lineId);
      });
      const onPill = el.mapLines.querySelector('.line-pill.is-on');
      if (onPill && onPill.scrollIntoView) {
        onPill.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    }
    highlightStation(focusStation);
  }

  function highlightStation(name) {
    let target = null;
    Array.prototype.forEach.call(el.mapStrip.children, (node) => {
      const on = !!name && node.dataset.station === name;
      node.classList.toggle('is-on', on);
      if (on) target = node;
    });
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  /* ==================================================================
   * マイク
   * ================================================================== */

  function setMicState(mode) {
    el.btnMic.classList.toggle('is-listening', mode === 'listening');
    el.micLabel.textContent =
      mode === 'listening' ? 'きいてるよ' : mode === 'ng' ? 'もじで どうぞ' : 'はなす';
  }

  function toggleMic() {
    Speech.unlock();
    if (Speech.isListening()) {
      Speech.stopListen();
      setMicState('idle');
      return;
    }
    if (!Speech.micSupported()) {
      setMicState('ng');
      addBubble('この ブラウザでは マイクが つかえないみたい。したの はこに もじで うってね', 'char');
      return;
    }
    Speech.sfx.listen();
    setMicState('listening');
    Speech.startListen({
      onResult: (text) => {
        Speech.stopListen();
        setMicState('idle');
        sendText(text);
      },
      onPartial: (text) => {
        el.micLabel.textContent = text.slice(-8) || 'きいてるよ';
      },
      onEnd: () => setMicState('idle'),
      onError: (err) => {
        setMicState('idle');
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          addBubble('マイクを つかう きょかを ONに してね。もじでも はなせるよ!', 'char');
        } else if (err === 'no-speech') {
          addBubble('きこえなかったよ〜。もういちど マイクを おしてね', 'char');
        }
      },
    });
  }

  /* ==================================================================
   * はじめる
   * ================================================================== */

  function init() {
    renderCharList();
    el.childName.value = load(STORE.name, '');

    /* ことばの むずかしさ */
    const level = load(STORE.level, '3');
    Brain.setWordLevel(level);
    Array.prototype.forEach.call(el.levelBtns.children, (b) => {
      b.classList.toggle('is-on', b.dataset.level === String(level));
      b.addEventListener('click', () => {
        Brain.setWordLevel(b.dataset.level);
        save(STORE.level, b.dataset.level);
        Array.prototype.forEach.call(el.levelBtns.children, (o) => {
          o.classList.toggle('is-on', o === b);
        });
      });
    });

    /* おぼえた ことばを よみこむ */
    try {
      const saved = JSON.parse(load(STORE.learned, '[]'));
      if (Array.isArray(saved)) Brain.setLearned(saved);
    } catch (e) {
      /* こわれていたら からっぽで はじめる */
    }
    renderWords();

    const voiceOn = load(STORE.voice, '1') === '1';
    Speech.setVoiceEnabled(voiceOn);
    el.btnVoice.textContent = voiceOn ? '🔊' : '🔇';

    el.btnBack.addEventListener('click', backToTitle);

    el.btnVoice.addEventListener('click', () => {
      const next = !Speech.isVoiceEnabled();
      Speech.setVoiceEnabled(next);
      el.btnVoice.textContent = next ? '🔊' : '🔇';
      save(STORE.voice, next ? '1' : '0');
    });

    el.btnWords.addEventListener('click', () => {
      el.wordPanel.classList.toggle('is-open');
      el.log.scrollTop = el.log.scrollHeight;
    });

    el.btnMap.addEventListener('click', () => {
      el.mapPanel.classList.toggle('is-open');
      el.log.scrollTop = el.log.scrollHeight;
      Speech.unlock();
    });

    /* キャラを タップすると かおが かわる */
    el.train.addEventListener('click', () => {
      Speech.unlock();
      Speech.sfx.pop();
      el.train.classList.remove('is-poked');
      void el.train.offsetWidth;
      el.train.classList.add('is-poked');
      gagFace(randomFace(), 1600);
    });

    el.btnMic.addEventListener('click', toggleMic);
    el.btnSend.addEventListener('click', () => sendText(el.textInput.value));
    el.textInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') sendText(el.textInput.value);
    });

    /* まえに あそんだ子を さいしょに ならべる */
    const last = load(STORE.char, '');
    if (CHAR_BY_ID[last]) {
      const cards = el.charList.children;
      const at = CHARACTERS.findIndex((c) => c.id === last);
      if (at > 0) el.charList.insertBefore(cards[at], cards[0]);
    }
  }

  init();
})();
