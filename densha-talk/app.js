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
    charName: $('talk-char-name'),
    lineName: $('talk-line-name'),
    train: $('train'),
    trainDest: $('train-dest'),
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
  let idleTimer = null;
  let idleCount = 0;

  /* ==================================================================
   * キャラえらび
   * ================================================================== */

  function miniTrain(char) {
    return (
      '<span class="mini-train" style="--c:' +
      char.color +
      ';--ink:' +
      char.ink +
      '">' +
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

  function setFace(mood) {
    el.train.classList.remove('is-happy', 'is-think', 'is-wow');
    el.train.classList.add('is-' + (mood || 'happy'));
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

    const texts = res.say.filter((t) => t && t.length > 0);
    texts.forEach((t, i) => {
      setTimeout(() => {
        addBubble(t, 'char');
        Speech.sfx.pop();
      }, i * 520);
    });

    setTalking(true);
    Speech.speak(texts, Brain.state.char.voice, () => setTalking(false));
    startIdleTimer();
  }

  function sendText(text, label) {
    const body = String(text || '').trim();
    if (!body) return;
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
      const text = IDLE_LINES[(idleCount - 1) % IDLE_LINES.length];
      addBubble(text, 'char');
      setTalking(true);
      Speech.speak([text], Brain.state.char.voice, () => setTalking(false));
      startIdleTimer();
    }, 32000);
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

    el.btnMap.addEventListener('click', () => {
      el.mapPanel.classList.toggle('is-open');
      el.log.scrollTop = el.log.scrollHeight;
      Speech.unlock();
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
