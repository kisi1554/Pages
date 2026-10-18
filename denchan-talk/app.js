/* でんちゃんと おしゃべり
 *  - でんちゃん : でんえんとしせんの 2020けい（こどもの えが もと）
 *  - こえ       : よみあげ = speechSynthesis / ききとり = SpeechRecognition(あれば)
 *  - おと       : WebAudio の ごうせいおん だけ
 *  - ほぞん     : localStorage（try/catch）
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };

  /* ---------------------------- ほぞん ---------------------------- */
  const KEY = 'denchan-talk-v1';
  let save = { name: '', sound: true, pos: 0, dir: 1, stars: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') save = Object.assign(save, s);
  } catch (e) {
    /* なにもしない */
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {
      /* なにもしない */
    }
  }

  /* ---------------------------- えき ---------------------------- */
  // しぶや → ちゅうおうりんかん。fact は でんちゃんの せりふ、hint は クイズの ヒント
  const S = [
    { k: '渋谷', y: 'しぶや', fact: 'ハチこうの どうぞうが ある、とっても にぎやかな えき。ここから はんぞうもんせんに のりいれるよ', hint: 'ハチこうの どうぞうが ある えき' },
    { k: '池尻大橋', y: 'いけじりおおはし', fact: 'ちかに ある えき。ちかくを めぐろがわが ながれているよ' },
    { k: '三軒茶屋', y: 'さんげんぢゃや', a: ['さんげんじゃや', 'さんちゃ'], fact: 'せたがやせん っていう ちいさな でんしゃに のりかえられるよ。たかい キャロットタワーが めじるし', hint: 'せたがやせんに のりかえられる えき' },
    { k: '駒沢大学', y: 'こまざわだいがく', fact: 'ちかくに ひろい こまざわ オリンピックこうえんが あるよ' },
    { k: '桜新町', y: 'さくらしんまち', fact: 'サザエさんの まち！ えきの ちかくに サザエさんたちの どうぞうが あるんだ', hint: 'サザエさんの どうぞうが ある えき' },
    { k: '用賀', y: 'ようが', fact: 'ちかの えき。ちかくに おおきな きぬたこうえんが あるよ' },
    { k: '二子玉川', y: 'ふたこたまがわ', a: ['ふたこ'], fact: 'ちかから そとに でてくるよ。まぶしい！ おおいまちせんにも のりかえられるんだ', hint: 'ちかから でて、そとが みえてくる えき' },
    { k: '二子新地', y: 'ふたごしんち', fact: 'たまがわを わたった すぐの えき。ここから かながわけんの かわさきし だよ', hint: 'たまがわを わたって すぐの えき' },
    { k: '高津', y: 'たかつ', fact: 'かわさきしの たかつく に ある えき。おおいまちせんの でんしゃも ならんで はしるよ' },
    { k: '溝の口', y: 'みぞのくち', a: ['溝ノ口', 'みぞのぐち'], fact: 'JRの なんぶせんに のりかえられるよ。おおいまちせんの おわりの えき でもあるんだ', hint: 'JRの なんぶせんに のりかえられる えき' },
    { k: '梶が谷', y: 'かじがや', a: ['梶ヶ谷', '梶ケ谷'], fact: 'えきの ちかくに JRの かもつれっしゃの えきが あるんだ' },
    { k: '宮崎台', y: 'みやざきだい', fact: 'でんしゃと バスの はくぶつかんが ある えき！ むかしの でんしゃにも あえるよ', hint: 'でんしゃと バスの はくぶつかんが ある えき' },
    { k: '宮前平', y: 'みやまえだいら', fact: 'かわさきしの みやまえく に ある えき。さかみちが おおい まち だよ' },
    { k: '鷺沼', y: 'さぎぬま', fact: 'でんしゃが やすむ しゃこが ある えき。ここで ひとやすみ する でんしゃも いるよ', hint: 'でんしゃが やすむ しゃこが ある えき' },
    { k: 'たまプラーザ', y: 'たまぷらーざ', fact: 'ひらがなと カタカナが まざった えきめい！ プラーザは スペインごで 「ひろば」 って いみなんだ', hint: 'ひらがなと カタカナが まざった なまえの えき' },
    { k: 'あざみ野', y: 'あざみの', fact: 'よこはまの ちかてつ ブルーラインに のりかえられるよ', hint: 'ブルーラインに のりかえられる えき' },
    { k: '江田', y: 'えだ', fact: 'しずかな まちの えき。よこはましの あおばく だよ' },
    { k: '市が尾', y: 'いちがお', a: ['市ヶ尾', '市ケ尾'], fact: 'ちかくに あおばくの くやくしょが あるよ' },
    { k: '藤が丘', y: 'ふじがおか', a: ['藤ヶ丘', '藤ケ丘'], fact: 'えきの まえに おおきな びょういんが あるよ' },
    { k: '青葉台', y: 'あおばだい', fact: 'おみせが たくさん ある にぎやかな えき。きゅうこうも とまるよ' },
    { k: '田奈', y: 'たな', fact: 'のどかな えき。ちかくを おんだがわ が ながれているよ' },
    { k: '長津田', y: 'ながつた', fact: 'JRの よこはません と、こどものくにせん に のりかえられるよ。でんしゃの しゃこも あるんだ', hint: 'こどものくにせんに のりかえられる えき' },
    { k: 'つくし野', y: 'つくしの', fact: 'ここから とうきょうとの まちだし。また とうきょうに もどってきたんだ', hint: 'かながわけんから また とうきょうに もどる えき' },
    { k: 'すずかけ台', y: 'すずかけだい', fact: 'だいがくの キャンパスが ちかくに あるよ' },
    { k: '南町田グランベリーパーク', y: 'みなみまちだぐらんべりーぱーく', a: ['みなみまちだ', 'ぐらんべりー', '南町田'], short: 'みなみまちだ グランベリーパーク', fact: 'なまえが ながーい えき！ スヌーピーミュージアムが あるよ', hint: 'なまえが いちばん ながくて、スヌーピーに あえる えき' },
    { k: 'つきみ野', y: 'つきみの', fact: 'ここから かながわけんの やまとし だよ' },
    { k: '中央林間', y: 'ちゅうおうりんかん', fact: 'でんえんとしせんの おわりの えき！ おだきゅうせんに のりかえられるよ', hint: 'でんえんとしせんの おわりの えき（しゅうてん）' },
  ];
  const yomi = (i) => S[i].short || S[i].y;

  // ことばを くらべやすく する（カタカナ → ひらがな、くうはく・きごう を とる）
  function norm(s) {
    return String(s || '')
      .normalize('NFKC')
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s、。，．,.!！?？「」『』・〜~…]/g, '')
      .toLowerCase();
  }

  const ALIASES = [];
  S.forEach((s, i) => {
    [s.k, s.y].concat(s.a || []).forEach((w) => ALIASES.push({ w: norm(w), i }));
  });
  ALIASES.sort((a, b) => b.w.length - a.w.length);

  function findStation(t) {
    for (const al of ALIASES) {
      const p = t.indexOf(al.w);
      if (p < 0) continue;
      // みじかい ひらがな（えだ・たな）は ほかの ことばに まぎれやすいので、よびかた を みる
      if (/^[ぁ-ん]{1,2}$/.test(al.w)) {
        const after = t.slice(p + al.w.length);
        if (t !== al.w && !/^(えき|駅|って|は|まで|に|の(つぎ|となり|まえ))/.test(after)) continue;
      }
      return al.i;
    }
    return -1;
  }

  /* ---------------------------- おと ---------------------------- */
  const Snd = (function () {
    let ctx = null;
    function ac() {
      if (!save.sound) return null;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) {
        ctx = null;
      }
      return ctx;
    }
    function tone(f, dur, type, vol, delay, f2) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.linearRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    function noise(dur, vol, freq, delay) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime + (delay || 0);
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq || 300;
      const g = c.createGain();
      g.gain.value = vol || 0.4;
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    }
    return {
      unlock: ac,
      kan() {
        tone(760, 0.28, 'square', 0.07);
        tone(1140, 0.2, 'sine', 0.05);
      },
      horn() {
        tone(392, 0.9, 'sawtooth', 0.06);
        tone(494, 0.9, 'sawtooth', 0.05);
        tone(587, 0.9, 'triangle', 0.05);
      },
      gatan() {
        noise(0.09, 0.5, 220);
        noise(0.09, 0.5, 200, 0.16);
      },
      chime() {
        tone(988, 0.5, 'sine', 0.18);
        tone(784, 0.8, 'sine', 0.18, 0.35);
      },
      door() {
        [659, 784, 988].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.18));
        noise(0.6, 0.25, 1800, 0.7);
      },
      brake() {
        noise(0.9, 0.18, 2600);
      },
      good() {
        [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.1));
      },
      bad() {
        tone(220, 0.35, 'square', 0.06, 0, 160);
      },
      pop() {
        tone(660, 0.12, 'sine', 0.12, 0, 990);
      },
    };
  })();

  /* ---------------------------- でんちゃんの かお ---------------------------- */
  const train = $('train');
  function setMood(m) {
    train.classList.remove('mood-normal', 'mood-happy', 'mood-wow', 'mood-think', 'mood-sleep');
    train.classList.add('mood-' + (m || 'normal'));
  }
  function setTalking(v) {
    train.classList.toggle('talking', v);
  }
  function setDest() {
    $('destText').textContent = save.dir > 0 ? 'ちゅうおうりんかん' : 'しぶや';
  }

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
  function speak(text) {
    clearTimeout(talkTimer);
    const id = ++speakId;
    const plain = text.replace(/[〜~]/g, 'ー').replace(/…/g, '、').replace(/[（(][^）)]*[）)]/g, '');
    const fallback = () => {
      setTalking(true);
      talkTimer = setTimeout(() => {
        if (id === speakId) setTalking(false);
      }, Math.min(6000, 600 + text.length * 90));
    };
    if (!save.sound || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      fallback();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = 'ja-JP';
      if (jaVoice) u.voice = jaVoice;
      u.pitch = 1.35;
      u.rate = 1.0;
      const end = () => {
        if (id !== speakId) return;
        clearTimeout(talkTimer);
        setTalking(false);
      };
      u.onend = end;
      u.onerror = end;
      setTalking(true);
      talkTimer = setTimeout(end, 1500 + text.length * 230);
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

  /* ---------------------------- がめん ---------------------------- */
  const who = () => save.name || 'きみ';
  function say(text, mood, chips) {
    const t = text.replace(/%N/g, who());
    $('bubble').textContent = t;
    setMood(mood || 'normal');
    speak(t);
    if (chips) setChips(chips);
  }
  const DEFAULT_CHIPS = ['しゅっぱつ しんこう！', 'ふみきり みせて', 'クイズ だして', 'でんちゃんは なんさい？', 'えきの こと おしえて', 'じゃんけん しよう', 'まめちしき おしえて', 'でんちゃんの えを かいたよ'];
  function moreChips(first) {
    const rest = shuffle(DEFAULT_CHIPS.filter((c) => !(first || []).includes(c)));
    return (first || []).concat(rest).slice(0, 5);
  }
  function setChips(list) {
    const box = $('chips');
    box.innerHTML = '';
    list.forEach((c) => {
      const label = typeof c === 'string' ? c : c.label;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (c.ans ? ' ans' : '');
      b.textContent = label;
      b.addEventListener('click', () => hear(label, true));
      box.appendChild(b);
    });
  }
  function showStars() {
    $('stars').textContent = '⭐ ' + save.stars;
  }

  /* ---------------------------- うごき ---------------------------- */
  let busy = false;
  let trainX = 0;
  function moveTrain(to, ms, done) {
    const from = trainX;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      trainX = from + (to - from) * e;
      train.setAttribute('transform', 'translate(' + trainX.toFixed(1) + ' 0)');
      if (p < 1) requestAnimationFrame(step);
      else if (done) done();
    }
    requestAnimationFrame(step);
  }

  // ふみきり: カンカン → しゃだんかんが おりる → でんちゃんが とおる → あがる
  function crossingShow(line) {
    if (busy) return;
    busy = true;
    const lampL = $('lampL');
    const lampR = $('lampR');
    const arrow = $(Math.random() < 0.5 ? 'arrowL' : 'arrowR');
    let on = false;
    const blink = setInterval(() => {
      on = !on;
      lampL.classList.toggle('on', on);
      lampR.classList.toggle('on', !on);
      Snd.kan();
    }, 420);
    arrow.classList.add('on');
    say(line || 'カンカンカン！ ふみきりが なったら、とまって まってね。でんしゃが とおるよ！', 'wow');
    setChips([]);
    setTimeout(() => $('arm').classList.add('down'), 600);
    setTimeout(() => {
      Snd.horn();
      train.classList.add('running');
      const gat = setInterval(Snd.gatan, 450);
      moveTrain(460, 1300, () => {
        trainX = -460;
        moveTrain(0, 1900, () => {
          clearInterval(gat);
          train.classList.remove('running');
          Snd.brake();
          setTimeout(() => {
            clearInterval(blink);
            lampL.classList.remove('on');
            lampR.classList.remove('on');
            arrow.classList.remove('on');
            $('arm').classList.remove('down');
            setTimeout(() => {
              busy = false;
              say(pick([
                'ただいま！ しゃだんきが あがったね。みぎ ひだり みて わたろうね',
                'ガタンゴトン、ひとまわり してきたよ！ ふみきりでは かならず とまってね',
                'ふみきりの そばでは、あそばないで ね。でんしゃは きゅうに とまれないんだ',
              ]), 'happy', moreChips(['もういっかい ふみきり', 'しゅっぱつ しんこう！']));
            }, 900);
          }, 400);
        });
      });
    }, 2300);
  }

  function showSign() {
    const i = save.pos;
    $('ekiYomi').textContent = yomi(i);
    $('ekiKanji').textContent = S[i].k;
    $('ekiPrev').textContent = i > 0 ? '← ' + S[i - 1].y : '';
    $('ekiNext').textContent = i < S.length - 1 ? S[i + 1].y + ' →' : '';
    $('ekiSign').hidden = false;
  }

  // つぎの えきへ（to を わたすと そこまで ちょっこう）
  function ride(to) {
    if (busy) return;
    if (to === undefined) {
      if (save.pos + save.dir < 0 || save.pos + save.dir >= S.length) {
        save.dir = -save.dir;
        setDest();
      }
      to = save.pos + save.dir;
    } else if (to !== save.pos) {
      save.dir = to > save.pos ? 1 : -1;
      setDest();
    }
    busy = true;
    const far = Math.abs(to - save.pos) > 1;
    Snd.door();
    say(far
      ? 'ドアが しまります。' + yomi(to) + ' まで ノンストップで いくよ！ しゅっぱーつ！'
      : 'ドアが しまります。しゅっぱつ しんこう！ つぎは ' + yomi(to) + '、' + yomi(to) + '。', 'happy');
    setChips([]);
    $('ekiSign').hidden = true;
    setTimeout(() => {
      Snd.horn();
      $('scene').classList.add('running');
      train.classList.add('running');
      const gat = setInterval(Snd.gatan, 420);
      setTimeout(() => {
        clearInterval(gat);
        $('scene').classList.remove('running');
        train.classList.remove('running');
        Snd.brake();
        save.pos = to;
        if (save.pos === 0 || save.pos === S.length - 1) {
          save.dir = save.pos === 0 ? 1 : -1;
        }
        setDest();
        persist();
        lastStation = to;
        showSign();
        setTimeout(() => {
          Snd.chime();
          busy = false;
          const end = to === 0 || to === S.length - 1;
          say(yomi(to) + '、' + yomi(to) + '。' + S[to].fact + (end ? '。ここが おわりの えき。また はんたいむきに しゅっぱつ できるよ' : ''), 'happy',
            [end ? 'はんたいむきに しゅっぱつ' : 'つぎの えきへ しゅっぱつ', 'はんたいむきに のる', 'クイズ だして', 'ふみきり みせて']);
        }, 500);
      }, far ? 4200 : 3000);
    }, 1400);
  }

  /* ---------------------------- あたま（へんじ） ---------------------------- */
  let expect = null; // 'quiz' | 'janken' | 'food' | 'fav-eki' | 'fav-densha'
  let quiz = null;
  let lastStation = -1;
  let jankenAiko = 0;
  const age = () => Math.max(1, new Date().getFullYear() - 2018);

  const MAME = [
    'でんえんとしせんには、しぶやから ちゅうおうりんかんまで 27の えきが あるんだ',
    'しぶやから ふたこたまがわの てまえまでは、ちかの トンネルを はしるんだよ',
    'たまがわを わたる はしで、とうきょうと から かながわけんに はいるよ',
    'ふたこたまがわから みぞのくちまでは、おおいまちせんの でんしゃと ならんで はしるよ',
    'パンタグラフで うえの せんから でんきを もらって、モーターで くるまを まわすんだ',
    'うんてんしさんは、しんごうを みて 「ゆびさし かくにん」を するんだよ',
    'ながつたでは こどものくにせんに のりかえ。ひろい あそびばの 「こどものくに」に いけるよ',
    'みやざきだいの でんしゃと バスの はくぶつかんでは、うんてんの まねっこが できるよ',
    'ぼくは はんぞうもんせんに のりいれて、おしあげ や、とうぶせんの ほうまで いくことも あるんだ',
    'でんえんとしせんの いろは みどり。だから ぼくの おびも みどり なんだ',
    'あさは とっても こむから、ぼくは いっしょうけんめい はしってるんだ',
    'しゃないの まどの うえには がめんが あって、つぎの えきを おしえてくれるよ',
  ];

  function makeQuiz() {
    const r = Math.random();
    let q;
    let answer;
    if (r < 0.45) {
      // つぎの えき
      const i = Math.floor(Math.random() * (S.length - 1));
      answer = i + 1;
      q = '「' + yomi(i) + '」の つぎの えきは どーれだ？（ちゅうおうりんかん むき だよ）';
    } else if (r < 0.9) {
      const cand = S.map((s, i) => i).filter((i) => S[i].hint);
      answer = pick(cand);
      q = 'ヒント！ 「' + S[answer].hint + '」。どの えきかな？';
    } else {
      quiz = { kind: 'count', answer: '27', choices: shuffle(['17', '27', '37']) };
      expect = 'quiz';
      return { q: 'でんえんとしせんの えきは、ぜんぶで いくつ あるかな？', chips: quiz.choices.map((c) => ({ label: c + 'えき', ans: true })) };
    }
    const wrong = shuffle(S.map((s, i) => i).filter((i) => i !== answer)).slice(0, 2);
    const choices = shuffle([answer].concat(wrong));
    quiz = { kind: 'eki', answer, choices };
    expect = 'quiz';
    return { q, chips: choices.map((i) => ({ label: yomi(i), ans: true })) };
  }

  function judgeQuiz(t) {
    const qz = quiz;
    if (/わからない|わかんない|しらない|ぱす|ヒント|ひんと/.test(t)) {
      quiz = null;
      expect = null;
      const a = qz.kind === 'count' ? '27えき' : yomi(qz.answer);
      say('こたえは 「' + a + '」 だよ！ つぎは きっと わかるよ', 'normal', ['もう1もん', 'しゅっぱつ しんこう！', 'ふみきり みせて']);
      return true;
    }
    let got = null;
    if (qz.kind === 'count') {
      const m = t.match(/(17|27|37|じゅうなな|にじゅうなな|さんじゅうなな)/);
      if (m) got = { じゅうなな: '17', にじゅうなな: '27', さんじゅうなな: '37' }[m[1]] || m[1];
    } else {
      const i = findStation(t);
      if (i >= 0) got = i;
    }
    if (got === null) return false;
    quiz = null;
    expect = null;
    if (got === qz.answer) {
      save.stars++;
      persist();
      showStars();
      Snd.good();
      train.classList.remove('jump');
      void train.getBoundingClientRect();
      train.classList.add('jump');
      const extra = qz.kind === 'count' ? 'しぶやから ちゅうおうりんかんまで 27えき！' : S[qz.answer].fact;
      say('ピンポーン！ せいかい！ ほしを 1こ あげるね。' + extra, 'happy', ['もう1もん', 'しゅっぱつ しんこう！', 'ふみきり みせて']);
    } else {
      Snd.bad();
      const a = qz.kind === 'count' ? '27えき' : yomi(qz.answer);
      say('ざんねーん！ こたえは 「' + a + '」 だよ。おしかったね！', 'think', ['もう1もん', 'しゅっぱつ しんこう！', 'えきの こと おしえて']);
    }
    return true;
  }

  function judgeJanken(t) {
    let me = -1;
    if (/ぐー|ぐう|ぐ$|いし|石/.test(t)) me = 0;
    else if (/ちょき|はさみ/.test(t)) me = 1;
    else if (/ぱー|ぱあ|ぱ$|かみ|紙/.test(t)) me = 2;
    if (me < 0) return false;
    const hands = ['グー', 'チョキ', 'パー'];
    const den = Math.floor(Math.random() * 3);
    const head = 'ぼくは ' + hands[den] + '！ ';
    if (den === me) {
      jankenAiko++;
      say(head + 'あいこで しょ！ もういっかい！', 'wow', [{ label: '✊ グー', ans: true }, { label: '✌️ チョキ', ans: true }, { label: '✋ パー', ans: true }]);
      return true;
    }
    expect = null;
    jankenAiko = 0;
    if ((me + 1) % 3 === den) {
      Snd.good();
      say(head + '%Nの かち！ つよいなあ〜。パァーン！（けいてき で おいわい）', 'wow', moreChips(['もういっかい じゃんけん']));
      setTimeout(Snd.horn, 700);
    } else {
      say(head + 'ぼくの かち！ やったー！ ガタンゴトン、うれしい〜', 'happy', moreChips(['もういっかい じゃんけん']));
    }
    return true;
  }

  function stationTalk(i, t) {
    lastStation = i;
    if (/つぎ|となり|隣|次/.test(t)) {
      const n = [];
      if (i > 0) n.push('しぶや ほうめんの となりは 「' + yomi(i - 1) + '」');
      if (i < S.length - 1) n.push('ちゅうおうりんかん ほうめんの となりは 「' + yomi(i + 1) + '」');
      say(yomi(i) + ' の ' + n.join('、') + ' だよ！', 'happy', ['クイズ だして', yomi(i) + ' まで つれてって', 'えきの こと おしえて']);
      return;
    }
    say('「' + yomi(i) + '」 だね！ ' + S[i].fact + '。しぶやから ' + (i + 1) + 'ばんめの えき だよ', 'happy',
      [yomi(i) + ' まで つれてって', yomi(i) + ' の つぎは？', 'クイズ だして', 'えきの こと おしえて']);
  }

  function reply(raw) {
    const t = norm(raw);
    if (!t) return;

    if (expect === 'quiz' && quiz && judgeQuiz(t)) return;
    if (expect === 'janken' && judgeJanken(t)) return;

    if (expect === 'food') {
      expect = null;
      if (!/^(ない|わからない|しらない)$/.test(t)) {
        say('「' + raw.trim() + '」！ おいしそう〜。ぼくも いつか たべて みたいなあ。でも ぼくは でんきで おなかいっぱい！', 'happy', moreChips());
        return;
      }
    }
    const st = findStation(t);
    if (expect === 'fav-eki' && st >= 0) {
      expect = null;
      lastStation = st;
      say('「' + yomi(st) + '」が すきなんだね！ ぼくも だいすき。' + S[st].fact, 'happy', [yomi(st) + ' まで つれてって', 'クイズ だして', 'しゅっぱつ しんこう！']);
      return;
    }
    if (expect === 'fav-densha') {
      expect = null;
      say('「' + raw.trim() + '」 かあ！ かっこいいよね。いつか いっしょに はしって みたいな', 'happy', moreChips());
      return;
    }
    expect = null;

    // ── でんしゃの うごき ──
    if (st >= 0 && /まで|つれて|連れて|のせて|乗せて|いきたい|行きたい|いって|行って|いこう|行こう/.test(t)) {
      if (st === save.pos) {
        say('いま ちょうど 「' + yomi(st) + '」に いるよ！ ' + S[st].fact, 'happy', ['つぎの えきへ しゅっぱつ', 'はんたいむきに のる']);
      } else ride(st);
      return;
    }
    if (/はんたい|反対|ぎゃく|逆|もどって|戻って/.test(t)) {
      save.dir = -save.dir;
      setDest();
      ride();
      return;
    }
    if (/しゅっぱつ|出発|はしって|走って|のせて|乗せて|うごいて|動いて|つぎのえきへ|つぎのえきに|れっつごー|いこう|行こう/.test(t)) {
      ride();
      return;
    }
    if (/ふみきり|踏切|かんかん|しゃだん|遮断/.test(t)) {
      crossingShow();
      return;
    }
    if (/ひじょう|非常|あかいぼたん|赤いボタン|赤いぼたん/.test(t)) {
      emergency();
      return;
    }
    if (/くいず|もんだい|問題|なぞなぞ|もう1もん|もういちもん|もういっもん/.test(t)) {
      const qz = makeQuiz();
      say(qz.q, 'think', qz.chips);
      return;
    }
    if (/じゃんけん/.test(t)) {
      expect = 'janken';
      say('じゃんけん、ぽん！ …の まえに、%Nは なにを だす？', 'happy', [{ label: '✊ グー', ans: true }, { label: '✌️ チョキ', ans: true }, { label: '✋ パー', ans: true }]);
      return;
    }

    // ── えき ──
    if (/(えき|駅).*(いくつ|なんこ|何個|かず|数)|なんえき|何駅/.test(t)) {
      say('でんえんとしせんの えきは、しぶやから ちゅうおうりんかんまで ぜんぶで 27えき！ 「ぜんぶ いって」って いったら、ぜんぶ いうよ', 'happy', ['ぜんぶの えき いって', 'クイズ だして']);
      return;
    }
    if (/ぜんぶ|全部/.test(t) && /(えき|駅|いって|言って)/.test(t)) {
      say(S.map((s, i) => yomi(i)).join('、') + '！ ぜんぶで 27えき。いえた！', 'happy', moreChips(['クイズ だして']));
      return;
    }
    if (st >= 0) {
      stationTalk(st, t);
      return;
    }
    if (/(つぎ|次|となり|隣)/.test(t) && /(えき|駅|は)/.test(t)) {
      const base = lastStation >= 0 ? lastStation : save.pos;
      stationTalk(base, 'つぎ');
      return;
    }
    if (/すきな(えき|駅)|どの(えき|駅)がすき/.test(t)) {
      expect = 'fav-eki';
      say('ぼくの すきな えきは 「ふたこたまがわ」！ ちかから そとに でて、たまがわが きらきら みえるんだ。%Nは どの えきが すき？', 'happy', ['しぶや', 'たまプラーザ', 'ながつた', 'ちゅうおうりんかん']);
      return;
    }
    if (/(えき|駅)/.test(t) && /(おしえて|教えて|しりたい|知りたい|どんな)/.test(t)) {
      const i = pick(S.map((s, j) => j));
      stationTalk(i, '');
      return;
    }

    // ── でんちゃんの こと ──
    if (/(ぼく|わたし|おれ|あたし)の?なまえは(.+)/.test(t)) {
      const m = raw.replace(/\s/g, '').match(/なまえは(.+?)(だよ|です|やで|や|だ)?[。！!]*$/);
      if (m && m[1] && m[1].length <= 8) {
        save.name = m[1];
        persist();
        say('%N だね！ おぼえたよ。よろしくね、%N！', 'happy', moreChips());
        return;
      }
    }
    if (/なまえ|名前|だれ|誰/.test(t)) {
      say('ぼくは でんちゃん！ でんえんとしせんを はしる 2020けい っていう でんしゃ だよ。%Nが えに かいてくれたんだ', 'happy', moreChips(['でんちゃんは なんさい？']));
      return;
    }
    if (/なんさい|何歳|うまれ|生まれ|たんじょうび|誕生日|いつから/.test(t)) {
      say('ぼくは 2018ねんに デビューしたんだ。だから ' + age() + 'さい くらい かな。でんしゃの なかでは まだ わかい ほう だよ', 'happy', moreChips(['ともだちは いる？']));
      return;
    }
    if (/なんけい|何系|2020|にせんにじゅう|なんりょう|何両|しゃりょう|車両/.test(t)) {
      say('ぼくは 2020けい。10りょう つながって はしるんだ。しゃないには がめんが たくさん あって、でんきも あんまり つかわない エコな でんしゃ だよ', 'happy', moreChips());
      return;
    }
    if (/ともだち|友達|なかま|仲間|8500|5000|18000|せんぱい|先輩/.test(t)) {
      say(pick([
        'ともだち いっぱい いるよ！ おにいさんの 5000けい、とうきょうメトロの 18000けい、とうぶの 50050がた。おなじ せんろを はしる なかま なんだ',
        'ながーく はしってた 8500けい せんぱいは、2023ねんに でんえんとしせんから いんたい したんだ。いまも だいすきな せんぱい だよ',
      ]), 'happy', ['%Nの すきな でんしゃは？'.replace('%N', who())].concat(moreChips()).slice(0, 5));
      return;
    }
    if (/すきなでんしゃ|どのでんしゃがすき/.test(t)) {
      expect = 'fav-densha';
      say('%Nの すきな でんしゃは なあに？ おしえて！', 'think', ['でんちゃん！', 'しんかんせん', 'ブルーライン', 'とうよこせん']);
      return;
    }
    if (/いろ|色/.test(t)) {
      say('ぼくは しろい かおに みどりの おび！ でんえんとしせんの いろは みどり なんだ。%Nの えも みどりで かいて くれたね', 'happy', moreChips());
      return;
    }
    if (/どうやって|ぱんたぐらふ|もーたー|でんき|電気/.test(t)) {
      say('あたまの うえの パンタグラフで、せんから でんきを もらうんだ。その でんきで モーターを まわして はしるよ！', 'happy', moreChips(['ごはんは なに たべるの？']));
      return;
    }
    if (/ごはん|たべもの|食べ物|たべる|食べる|おなか|お腹|すきなたべ/.test(t)) {
      expect = 'food';
      say('ぼくの ごはんは でんき！ パンタグラフで もぐもぐ。%Nの すきな たべものは なあに？', 'happy', ['カレー', 'おすし', 'ラーメン', 'いちご']);
      return;
    }
    if (/どこ(まで|へ|に)?(いく|行く)|どこから|おしあげ|押上|はんぞうもん|半蔵門|とうぶ|東武|ちょくつう|直通/.test(t)) {
      say('ぼくは しぶやから ちゅうおうりんかんまで はしるよ。しぶやからは はんぞうもんせんに のりいれて、おしあげ や、とうぶせんの ほうまで いくことも あるんだ', 'happy', moreChips(['しゅっぱつ しんこう！']));
      return;
    }
    if (/ちかてつ|地下|とんねる|ちかを/.test(t)) {
      say('しぶやから ふたこたまがわの てまえまでは、ちかの トンネルを はしるんだ。そとに でると まぶしいよ！', 'wow', moreChips());
      return;
    }
    if (/はやい|速い|はやさ|速さ|すぴーど|なんきろ/.test(t)) {
      say('ひろい ところでは びゅーんと はやく はしるよ！ でも えきの ちかくでは ゆっくり、あんぜん だいいち なんだ', 'happy', moreChips());
      return;
    }
    if (/どこでねる|ねるの|寝る|しゃこ|車庫|よる|夜/.test(t)) {
      say('よるは しゃこで ねるんだ。ながつた や さぎぬまに でんしゃの しゃこが あるよ。からだを きれいに してもらって、また あさから がんばる！', 'sleep', moreChips());
      return;
    }
    if (/なきごえ|ならして|鳴らして|けいてき|警笛|ぱーん|ぷあーん|ぱあん|おとだして|おと聞かせて|音/.test(t)) {
      Snd.horn();
      say('パァーーン！ これは 「けいてき」。あぶないよ〜 って しらせる おと なんだ', 'wow', moreChips(['ふみきり みせて']));
      return;
    }
    if (/え(を|が)?かい|絵|描い|かいたよ/.test(t)) {
      Snd.good();
      say('ぼくの えを かいて くれたの？ うれしい〜！ ひだりの ふみきりも、あかい ランプも、ひじょうボタンも ちゃんと あるね。%Nは えが じょうず だね！', 'happy', moreChips(['ふみきり みせて']));
      return;
    }

    // ── きもち ──
    if (/ばいばい|さようなら|さよなら|またね|おわり/.test(t)) {
      say('ばいばい、%N！ また のりに きてね。しゅっぱつ しんこう〜！', 'happy', moreChips());
      return;
    }
    if (/おやすみ|ねむい|眠い/.test(t)) {
      say('おやすみ、%N。ぼくも しゃこで ぐっすり ねるね。また あした！', 'sleep', moreChips());
      return;
    }
    if (/おはよう/.test(t)) {
      say('おはよう、%N！ ぼくは もう あさの しごとで いっぱい はしってきたよ！', 'happy', moreChips());
      return;
    }
    if (/こんにちは|こんにちわ|こんばんは|こんばんわ|やあ|はじめまして|もしもし|はろー|へろー/.test(t)) {
      say(pick(['こんにちは、%N！ きょうも げんきに はしってるよ！', 'やあ、%N！ ガタンゴトン、あえて うれしいな！']), 'happy', moreChips());
      return;
    }
    if (/げんき|元気/.test(t)) {
      say('げんき いっぱい！ パンタグラフも ピーンと してるよ。%Nも げんき？', 'happy', moreChips());
      return;
    }
    if (/ありがと/.test(t)) {
      say('どういたしまして！ %Nと はなせて うれしいよ', 'happy', moreChips());
      return;
    }
    if (/ばか|きらい|嫌い|うんち|おなら/.test(t)) {
      say('えーっ！ ぼく ショックで きゅうブレーキ かけちゃうよ〜。…なーんてね。なかよく しようよ！', 'wow', moreChips());
      Snd.brake();
      return;
    }
    if (/かなしい|悲しい|さみしい|寂しい|いたい|痛い|こわい|怖い|つかれた|疲れた|ないちゃ|泣/.test(t)) {
      say('そっか…。だいじょうぶ だよ、%N。ぼくが そばで ガタンゴトン って まってるからね', 'think', moreChips());
      return;
    }
    if (/すごい|かっこいい|かわいい|すき|好き|えらい|きれい|がんばって|頑張って/.test(t)) {
      say(pick(['えへへ、てれちゃうなあ〜。ほっぺが あかく なっちゃった', 'ありがとう！ うれしくて けいてき ならしちゃう！ パァーン！']), 'happy', moreChips());
      return;
    }
    if (/まめちしき|ひみつ|秘密|おしえて|教えて|しってる|知ってる/.test(t)) {
      say('まめちしき！ ' + pick(MAME), 'happy', moreChips(['ほかの まめちしき']));
      return;
    }
    if (/なにができる|何ができる|あそぼ|遊ぼ|ひま|なにしよう|何しよう|なにする/.test(t)) {
      say('「しゅっぱつ しんこう」で えきを めぐったり、ふみきりを うごかしたり、クイズや じゃんけんも できるよ！ えきの なまえを いうと、その えきの こと おしえるね', 'happy', moreChips());
      return;
    }
    if (/^(うん|はい|そう|いいよ|ええ|おっけー)/.test(t)) {
      say('うん うん！ つぎは なに する？', 'happy', moreChips());
      return;
    }
    if (/^(ううん|いや|ちがう|だめ)/.test(t)) {
      say('そっか〜。じゃあ ほかの こと しよう！', 'normal', moreChips());
      return;
    }
    if (/でんしゃ|電車/.test(t)) {
      say('でんしゃ だいすき！ ' + pick(MAME), 'happy', moreChips());
      return;
    }

    say(pick([
      '「' + raw.trim() + '」 かあ！ ぼく でんしゃ だから、ちょっと むずかしいかも。えきの なまえを いうと、くわしく おしえるよ',
      'ガタンゴトン… ちょっと きこえなかったかも。もういちど いって くれる？',
      'へえ〜！ %Nは いろんな こと しってるね。ぼくとは でんしゃの おはなし しよう！',
    ]), 'think', moreChips());
  }

  function emergency() {
    if (busy) return;
    Snd.brake();
    say('それは ふみきりの 「ひじょうボタン」！ ふみきりで こまった ことが あったときに おすと、でんしゃに とまれ！ って しらせるんだ。ふだんは おしちゃ だめ だよ', 'wow', moreChips(['ふみきり みせて']));
  }

  function hear(text, fromChip) {
    Snd.unlock();
    if (busy) return;
    const v = String(text || '').trim();
    if (!v) return;
    $('youSaid').textContent = (fromChip ? '' : '🗣️ ') + v;
    if (/ほかのまめちしき/.test(norm(v))) {
      say('まめちしき！ ' + pick(MAME), 'happy', moreChips(['ほかの まめちしき']));
      return;
    }
    if (/もういっかいふみきり/.test(norm(v))) {
      crossingShow();
      return;
    }
    if (/もういっかいじゃんけん/.test(norm(v))) {
      reply('じゃんけん');
      return;
    }
    reply(v);
  }

  /* ---------------------------- タップ ---------------------------- */
  $('crossing').addEventListener('click', () => {
    Snd.unlock();
    crossingShow();
  });
  $('ebtn').addEventListener('click', () => {
    Snd.unlock();
    emergency();
  });
  train.addEventListener('click', () => {
    Snd.unlock();
    if (busy) return;
    Snd.pop();
    train.classList.remove('jump');
    void train.getBoundingClientRect();
    train.classList.add('jump');
    say(pick([
      'わっ、くすぐったい！ ガタンゴトン！',
      'パァーン！ よんだ？',
      'えへへ、ぼくの かお、%Nの えに そっくり でしょ？',
      'まどから なかを のぞいてね。きょうも おきゃくさん いっぱい！',
    ]), 'happy');
  });

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
          say('マイクが つかえない みたい。したの ボタンか、もじで はなしてね', 'think');
        } else if (ev.error === 'no-speech') {
          say('あれ？ こえが きこえなかったよ。もういちど おしてね', 'think');
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
    $('textInput').blur();
    hear(v);
  });

  /* ---------------------------- おとの オン/オフ ---------------------------- */
  function showSound() {
    $('soundBtn').textContent = save.sound ? '🔊' : '🔇';
  }
  $('soundBtn').addEventListener('click', () => {
    save.sound = !save.sound;
    persist();
    showSound();
    if (!save.sound) stopSpeak();
    else Snd.pop();
  });

  /* ---------------------------- はじめる ---------------------------- */
  function begin() {
    save.name = $('nameInput').value.trim().slice(0, 8);
    persist();
    Snd.unlock();
    $('startScreen').hidden = true;
    $('talkScreen').hidden = false;
    setDest();
    showSign();
    showStars();
    Snd.horn();
    say('パァーン！ こんにちは、%N！ ぼくは でんえんとしせんの でんちゃん。いまは 「' + yomi(save.pos) + '」に いるよ。なにして あそぶ？', 'happy', moreChips(['しゅっぱつ しんこう！', 'ふみきり みせて']));
  }
  $('startBtn').addEventListener('click', begin);
  $('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') begin();
  });

  // はじめの がめんの かお（シーンの でんちゃんを コピー）
  (function () {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '140 6 240 232');
    const g = train.cloneNode(true);
    g.removeAttribute('id');
    g.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    g.setAttribute('class', 'train mood-happy');
    svg.appendChild(g);
    $('startFace').appendChild(svg);
  })();

  $('nameInput').value = save.name;
  if (save.pos < 0 || save.pos >= S.length) save.pos = 0;
  if (save.dir !== 1 && save.dir !== -1) save.dir = 1;
  setMood('happy');
  showSound();
})();
