'use strict';

/*
 * おはなし「まいごの ぼうし」の ぜんぶ の ページ。
 *
 *  text   : はじめから でて いる ぶん（ことば は スペース で くぎる。[漢字|よみ] で ふりがな）
 *  after  : しかけ が おわったら でて くる ぶん
 *  tease  : めくる まえ の ひとこと（「すると…？」）
 *  hint   : しかけ の あそびかた（ちいさく でる）
 *  shikake: { kind, ... }  kind = tap / flip / pull / rub / light / rock / wind / choice
 *           need が ある tap や、tap いがい は「さわらないと すすめない」
 *  mike   : かくれねこ の ばしょ [x, y, おおきさ, かたむき]。え の なかの <!--MIKE--> に はいる
 *  next   : つぎ の ページ（もじ か、じょうたい を みて きめる かんすう）
 *  ending : けつまつ の ばんごう（1〜3）
 */

const M = '<!--MIKE-->';

/* めくる しかけ: content の うえに cover が かぶさって いる */
function flap(key, x, y, content, cover, cls) {
  return `<g data-flip="${key}" class="flap">
    <g transform="translate(${x} ${y})">${content}</g>
    <g class="cover ${cls}"><g transform="translate(${x} ${y})">${cover}</g></g></g>`;
}

/* ひっぱる タブ（みぎへ） */
function pullTab(x, y, len, label) {
  return `<g class="pull-track"><rect x="${x - 10}" y="${y - 8}" width="${len + 140}" height="16" rx="8" fill="#000" opacity=".18"/>
      <path d="M${x + len + 60} ${y} l26 0 m-12 -12 l12 12 l-12 12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></g>
    <g data-pull="1" class="pull-tab"><g transform="translate(${x} ${y})">
      <rect x="-14" y="-40" width="148" height="80" fill="transparent"/>
      <rect x="0" y="-30" width="120" height="60" rx="16" fill="#e64980" stroke="#fff" stroke-width="5"/>
      <text x="60" y="8" font-size="20" font-weight="800" fill="#fff" text-anchor="middle">${label || 'ひっぱる'} ▶</text></g></g>`;
}

/* なぞる ヒント の やじるし */
function windCue(y) {
  return `<g class="cue"><path d="M90 ${y} q140 -70 280 0 t280 0" stroke="#fff" stroke-width="12" stroke-dasharray="2 26"
      stroke-linecap="round" fill="none" opacity=".9"/>
    <path d="M640 ${y - 22} l26 22 l-30 14" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></g>`;
}

function pokkeHead(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="-38" cy="-40" r="17" fill="#b5794a"/><circle cx="38" cy="-40" r="17" fill="#b5794a"/>
    <circle r="48" fill="#b5794a"/><ellipse cx="0" cy="16" rx="22" ry="16" fill="#f2d4ac"/>
    <ellipse cx="0" cy="9" rx="7" ry="5" fill="#4a2f1f"/>
    <circle cx="-17" cy="-10" r="6" fill="#2b1d14"/><circle cx="17" cy="-10" r="6" fill="#2b1d14"/>
    <circle cx="-30" cy="14" r="7" fill="#ff8fa3" opacity=".55"/><circle cx="30" cy="14" r="7" fill="#ff8fa3" opacity=".55"/></g>`;
}

function tapWrap(kind, sfx, inner, key) {
  return `<g data-tap="${kind}" data-sfx="${sfx}" class="t-${kind}" ${key ? `data-key="${key}"` : ''}>${inner}</g>`;
}

function sea(top, grad) {
  return `<rect x="0" y="${top}" width="800" height="${700 - top}" fill="url(#${grad})"/>
    ${Art.waves(top + 30, '#fff', 4)}`;
}

function pier(x, y, w) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${700 - y}" fill="#8a5a33"/>
    <rect x="${x}" y="${y - 10}" width="${w}" height="22" rx="4" fill="#c08a52"/>
    <path d="M${x + 20} ${y + 30} v${660 - y} M${x + w - 20} ${y + 30} v${660 - y}" stroke="#6b4322" stroke-width="10"/>`;
}

/* ぱたぱた とぶ かもめ（タップ できる） */
function flyingGull(x, y, s, key) {
  return tapWrap('flap', 'gull', `<g class="flapping">${Art.kamome(x, y, s)}<circle cx="${x}" cy="${y - 10}" r="${60 * s}" fill="transparent"/></g>`, key);
}

/* うみ の じかん は、きた みち で かわる（でんしゃ は おそい ので ゆうがた） */
const seaTime = (st) => (st.path1 === 'densha' ? 'yu' : 'yu1');

const PAGES = [
  /* ====================== 1. こうえん ====================== */
  {
    id: 'p1',
    place: 'こうえん',
    time: 'asa',
    text: ['こぐまの ぽっけ は、 あかい ぼうし が だいすき。', 'おばあちゃん が くれた、 たからもの の ぼうし。'],
    hint: 'はな や ことり を さわって みよう',
    tease: 'きょうも いい おてんき。 すると…？',
    shikake: { kind: 'tap' },
    mike: [118, 478, 0.8],
    next: 'p2',
    draw: () => `${Art.sky('asa')}${Art.cloud(260, 110, 1)}${Art.cloud(560, 180, 0.8)}
      ${Art.hills('#b6e39a', '#8fd16a')}
      <path d="M330 700 Q 380 560 470 480 L530 480 Q 470 580 540 700Z" fill="#f3dfae"/>
      ${Art.tree(690, 480, 1.2)}
      ${Art.bird(650, 236, 1, '#6ab0e8')}${Art.bird(740, 300, 0.85, '#ff922b', true)}
      ${M}${Art.bush(110, 500, 1.05)}
      <g><rect x="560" y="500" width="120" height="14" rx="6" fill="#c08a52"/><rect x="566" y="470" width="108" height="12" rx="6" fill="#c08a52"/>
        <rect x="572" y="510" width="10" height="34" fill="#8a5a3c"/><rect x="658" y="510" width="10" height="34" fill="#8a5a3c"/></g>
      ${Art.butterfly(400, 330)}
      ${Art.flower(220, 590, '#ff8fab')}${Art.flower(290, 645, '#ffd43b')}${Art.flower(580, 640, '#b197fc')}${Art.flower(660, 590, '#ff922b')}
      ${tapWrap('hop', 'boing', Art.pokke(430, 640, 1.0, { hat: true }))}`,
  },

  /* ====================== 2. かぜ ====================== */
  {
    id: 'p2',
    place: 'こうえん',
    time: 'asa',
    text: ['そのとき、 [風|かぜ] さん が やって きた。', 'ゆびで ひゅーっと なぞって、 [風|かぜ] を おこそう！'],
    hint: 'がめん を ゆびで ひゅーっと なぞってね',
    after: ['ぴゅーーっ！ ふうせん が ふわり。 あっ、 ぼうし も！', 'ぼうし ぼうし、 まって まってー！'],
    tease: 'ぼうし は どこへ いくの…？',
    shikake: {
      kind: 'wind',
      need: 1300,
      progress(svg, p) {
        const b = svg.querySelector('#balloons');
        if (b) b.style.transform = `translate(${p * 50}px, ${-p * 50}px) rotate(${p * 8}deg)`;
        const h = svg.querySelector('#p2hat');
        if (h) h.style.transform = `rotate(${Math.sin(p * 30) * 12 * p}deg) translateY(${-p * 10}px)`;
      },
      finish(svg) {
        const b = svg.querySelector('#balloons');
        const h = svg.querySelector('#p2hat');
        if (b) { b.style.transform = ''; b.classList.add('fly-away'); }
        if (h) { h.style.transform = ''; h.classList.add('blow-off'); }
        svg.querySelector('.pokke-p2')?.classList.add('surprised');
      },
    },
    mike: [748, 540, 0.75, -8],
    next: 'p3',
    draw: () => `${Art.sky('asa')}${Art.cloud(200, 120, 0.9)}${Art.cloud(600, 90, 0.7)}
      ${Art.hills('#b6e39a', '#8fd16a')}
      <g class="sway">${Art.tree(110, 500, 1.05)}</g>
      ${M}${Art.bush(720, 560, 0.9, '#56a85c')}
      <g id="balloons" class="spin-origin">
        <path d="M600 330 Q610 430 630 520 M660 300 Q650 420 630 520 M705 345 Q680 440 630 520" stroke="#555" stroke-width="2" fill="none"/>
        <ellipse cx="600" cy="330" rx="34" ry="42" fill="#ffd43b"/><ellipse cx="660" cy="300" rx="34" ry="42" fill="#4dabf7"/>
        <ellipse cx="705" cy="345" rx="34" ry="42" fill="#69db7c"/>
        <ellipse cx="590" cy="318" rx="8" ry="12" fill="#fff" opacity=".5"/><ellipse cx="650" cy="288" rx="8" ry="12" fill="#fff" opacity=".5"/>
        <ellipse cx="695" cy="333" rx="8" ry="12" fill="#fff" opacity=".5"/></g>
      <rect x="622" y="516" width="16" height="70" rx="4" fill="#8a5a3c"/>
      ${Art.flower(230, 620, '#ff8fab')}${Art.flower(540, 650, '#ffd43b')}
      <g class="pokke-p2">${Art.pokke(360, 650, 1.05, { hat: true, hatId: 'p2hat' })}</g>
      ${windCue(250)}`,
  },

  /* ====================== 3. おちば の みち ====================== */
  {
    id: 'p3',
    place: 'おちば の みち',
    time: 'hiru',
    text: ['ぼうし を おいかけて、 おちば の みち へ。', 'かさかさ…。 おちば の した に、 なにか ある？'],
    hint: 'おちば の やま を めくって みよう',
    after: ['にゃーん。 ねこ の ゆうびんやさん が でて きた。', '「あかい ぼうし なら、 パンやさん の ほう へ とんで いったよ」'],
    tease: 'よし、 パンやさん へ！ すると…？',
    shikake: {
      kind: 'flip',
      target: 'tegami',
      finish(svg) { svg.querySelector('#postcat')?.classList.add('show'); },
    },
    mike: [568, 318, 0.7],
    next: 'p4',
    draw: () => {
      const leaves = (seed) => {
        const r = Art.rand(seed);
        const cols = ['#f08c3c', '#e8590c', '#fab005', '#d9480f', '#ffa94d'];
        let s = '<ellipse cx="0" cy="10" rx="84" ry="34" fill="#c2662a"/>';
        for (let i = 0; i < 26; i += 1) {
          const x = (r() - 0.5) * 150;
          const y = (r() - 0.7) * 70;
          s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="18" ry="10" fill="${cols[i % 5]}" transform="rotate(${(r() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
        }
        return `<rect x="-90" y="-60" width="180" height="100" fill="transparent"/>${s}`;
      };
      const acorn = '<g><ellipse cx="-14" cy="0" rx="14" ry="18" fill="#a0612f"/><path d="M-30 -8 q16 -18 32 0z" fill="#6b4322"/><ellipse cx="18" cy="6" rx="12" ry="15" fill="#a0612f"/><path d="M4 0 q14 -16 28 0z" fill="#6b4322"/></g>';
      const kinoko = '<g><rect x="-8" y="-6" width="16" height="26" rx="6" fill="#fff3e0"/><path d="M-30 -4 q30 -44 60 0z" fill="#e03131"/><circle cx="-10" cy="-14" r="5" fill="#fff"/><circle cx="10" cy="-20" r="4" fill="#fff"/></g>';
      const tegami = '<g><rect x="-38" y="-24" width="76" height="50" rx="6" fill="#fff"/><path d="M-38 -24 l38 28 l38 -28" stroke="#adb5bd" stroke-width="3" fill="none"/><rect x="16" y="-18" width="16" height="18" fill="#e8505b"/><path d="M-30 18 l10 -6 M-18 20 l8 -6" stroke="#9aa3ad" stroke-width="3"/></g>';
      return `${Art.sky('hiru')}${Art.cloud(220, 100, 0.8)}
        ${Art.hills('#c9dd8a', '#e2c47a')}
        <path d="M0 560 Q 400 520 800 560 V700 H0Z" fill="#e9c98a"/>
        ${Art.tree(640, 530, 1.1, '#f4a340', '#e8772e')}
        ${M}<circle cx="560" cy="334" r="28" fill="#f4a340"/><circle cx="590" cy="340" r="22" fill="#e8772e"/>
        ${Art.tree(380, 460, 0.6, '#fab005', '#f08c00')}
        <g id="postcat" class="peek-out">${Art.postCat(718, 640, 0.85)}</g>
        ${Art.pokke(110, 650, 0.78, { mouth: 'o' })}
        ${flap('donguri', 270, 590, acorn, leaves(3), 'lift-leaves')}
        ${flap('tegami', 470, 640, tegami, leaves(11), 'lift-leaves')}
        ${flap('kinoko', 660, 610, kinoko, leaves(29), 'lift-leaves')}`;
    },
  },

  /* ====================== 4. パンやさん ====================== */
  {
    id: 'p4',
    place: 'パンやさん',
    time: 'hiru',
    text: ['くんくん、 いい におい。 ここは パンやさん。', 'かご の なか に、 あかい ぼうし が ある みたい？'],
    hint: 'かご の ぬの を めくって みよう',
    after: ['あれれ？ これは ぼうし の かたち の パン！', 'ほんもの は… まど の そと！ えき の ほう へ ふわふわ。', 'ぼうし ぼうし、 まって まってー！'],
    tease: 'えき へ いそげ！',
    shikake: {
      kind: 'flip',
      target: 'boushipan',
      finish(svg) { svg.querySelector('#outhat')?.classList.add('show'); },
    },
    mike: [300, 214, 0.7],
    next: 'p5',
    draw: () => {
      const cloth = '<path d="M-92 -8 Q-70 -86 0 -84 Q70 -86 92 -8 L84 12 Q0 -6 -84 12Z" fill="url(#check)" stroke="#c92a3a" stroke-width="3"/><rect x="-96" y="-90" width="192" height="110" fill="transparent"/>';
      const basket = (inner) => `<ellipse cx="0" cy="6" rx="84" ry="30" fill="url(#weave)"/>${inner}<path d="M-84 6 q84 40 168 0 v20 q-84 40 -168 0z" fill="url(#weave)" stroke="#8a5a33" stroke-width="3"/>`;
      const melon = basket('<g><ellipse cx="0" cy="-12" rx="46" ry="30" fill="#c8e06a"/><path d="M-30 -30 l50 40 M-10 -40 l46 36 M10 -40 l-46 36 M30 -30 l-50 40" stroke="#a9c24a" stroke-width="3"/></g>');
      const croissant = basket('<g><path d="M-52 0 q52 -70 104 0 q-20 -10 -30 -4 q-22 -26 -44 0 q-12 -6 -30 4z" fill="#e0a050"/><path d="M-20 -24 l6 20 M0 -32 v24 M20 -24 l-6 20" stroke="#b5762e" stroke-width="3"/></g>');
      const hatpan = basket('<g><ellipse cx="0" cy="0" rx="58" ry="14" fill="#c75a33"/><path d="M-36 0 C-38 -52 38 -52 36 0Z" fill="#e07a4f"/><path d="M-36 -8 C-24 -14 24 -14 36 -8 L36 0 C24 -6 -24 -6 -36 0Z" fill="#fff0d6"/><path d="M-20 -30 q12 -10 24 -8" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/></g>');
      const loaf = (x, y, c) => `<g transform="translate(${x} ${y})"><path d="M-40 0 q0 -40 40 -40 q40 0 40 40z" fill="${c}"/><path d="M-20 -26 l8 14 M0 -32 v16 M20 -26 l-8 14" stroke="#9c5c2a" stroke-width="3"/></g>`;
      return `<rect width="800" height="700" fill="#ffe9c9"/>
        <g opacity=".35">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i * 100 + 40}" y="0" width="30" height="470" fill="#ffd8a8"/>`).join('')}</g>
        <rect x="520" y="70" width="240" height="180" rx="12" fill="url(#sky-hiru)" stroke="#a46a35" stroke-width="12"/>
        ${Art.cloud(600, 130, 0.5)}
        <g id="outhat" class="peek-out"><g class="amb-float">${Art.hat(680, 170, 0.55, 18)}</g></g>
        <path d="M640 70 v180 M520 160 h240" stroke="#a46a35" stroke-width="8"/>
        <rect x="40" y="250" width="400" height="16" rx="6" fill="#a46a35"/>
        ${M}
        ${tapWrap('wiggle', 'pop', `<g>${loaf(110, 250, '#d9904a')}</g>`)}
        ${tapWrap('wiggle', 'pop', `<g>${loaf(220, 250, '#e8a85c')}</g>`)}
        ${tapWrap('wiggle', 'pop', `<g>${loaf(380, 250, '#c97b3a')}</g>`)}
        <rect x="40" y="470" width="720" height="230" fill="#b8865a"/><rect x="30" y="460" width="740" height="22" rx="8" fill="#caa074"/>
        ${flap('melon', 190, 450, melon, cloth, 'lift-cloth')}
        ${flap('croissant', 400, 450, croissant, cloth, 'lift-cloth')}
        ${flap('boushipan', 610, 450, hatpan, cloth, 'lift-cloth')}
        ${Art.pokke(92, 700, 0.78, { mouth: 'o' })}`;
    },
  },

  /* ====================== 5. えき の かいさつ ====================== */
  {
    id: 'p5',
    place: 'えき',
    time: 'hiru2',
    text: ['えき に つくと、 たぬき の かかりいん さん。', '「ホーム に はいる には きっぷ が いるよ。 マット の した を みてごらん」'],
    hint: 'あおい マット を めくって みよう',
    after: ['あった！ ぴかぴか の きっぷ。', '「いってらっしゃい！」 ぽっけ は ホーム へ たったったっ。'],
    tease: 'すると…？',
    shikake: { kind: 'flip', target: 'kippu' },
    mike: [722, 470, 0.68],
    next: 'p6',
    draw: () => {
      const gate = (x) => `<g><rect x="${x}" y="390" width="70" height="170" rx="10" fill="#adb5bd"/><rect x="${x}" y="390" width="70" height="26" rx="8" fill="#4c6ef5"/>
        <rect x="${x + 16}" y="430" width="38" height="10" rx="5" fill="#212529"/><circle cx="${x + 35}" cy="470" r="9" fill="#51cf66"/></g>`;
      const kippu = '<g><rect x="-44" y="-26" width="88" height="52" rx="8" fill="#ffa94d"/><rect x="-44" y="-26" width="88" height="14" rx="6" fill="#fd7e14"/><text x="0" y="18" font-size="20" font-weight="800" text-anchor="middle" fill="#7a3b00">きっぷ</text></g>';
      const mat = '<rect x="-120" y="-38" width="240" height="76" rx="12" fill="#4c6ef5"/><rect x="-104" y="-26" width="208" height="52" rx="8" fill="none" stroke="#bac8ff" stroke-width="5" stroke-dasharray="14 10"/>';
      return `<rect width="800" height="700" fill="#e8f1f7"/>
        <rect x="0" y="0" width="800" height="40" fill="#c5d6e3"/>
        <rect x="230" y="70" width="320" height="76" rx="12" fill="#22335e"/>
        <text x="390" y="125" font-size="44" font-weight="800" fill="#fff" text-anchor="middle">えき</text>
        ${tapWrap('wiggle', 'tick', `<g><circle cx="660" cy="120" r="50" fill="#fff" stroke="#495057" stroke-width="8"/>
          <path d="M660 120 V86 M660 120 L686 132" stroke="#212529" stroke-width="6" stroke-linecap="round"/></g>`)}
        <rect x="0" y="540" width="800" height="160" fill="#cfd8e0"/>
        <path d="M0 600 H800 M0 660 H800 M100 540 V700 M260 540 V700 M420 540 V700 M580 540 V700 M740 540 V700" stroke="#b6c2cc" stroke-width="3"/>
        ${M}${gate(470)}${gate(580)}${gate(690)}
        ${flap('kippu', 240, 630, kippu, mat, 'lift-mat')}
        ${tapWrap('hop', 'boing', Art.tanuki(400, 560, 0.9))}
        ${Art.pokke(78, 690, 0.72)}`;
    },
  },

  /* ====================== 6. ホーム の まど ====================== */
  {
    id: 'p6',
    place: 'ホーム',
    time: 'hiru2',
    text: ['まちあいしつ の まど が まっしろ に くもって いる。', 'ゆびで きゅっきゅっ と こすって みよう。'],
    hint: 'まど を ゆびで こすってね',
    after: ['みえた！ ぼうし は でんしゃ の やね の うえ！', 'ぷしゅー。 でんしゃ が うごき だした！'],
    tease: 'どう しよう…？',
    shikake: {
      kind: 'rub',
      rect: [140, 100, 520, 300],
      need: 0.5,
      finish(svg) { svg.querySelector('#p6train')?.classList.add('rumble'); },
    },
    mike: [232, 540, 0.72],
    next: 'p7',
    draw: () => `<rect width="800" height="700" fill="#f4e4c8"/>
      <rect x="0" y="470" width="800" height="230" fill="#d9b98c"/><rect x="0" y="460" width="800" height="16" fill="#b8865a"/>
      <clipPath id="win6"><rect x="140" y="100" width="520" height="300" rx="10"/></clipPath>
      <g clip-path="url(#win6)">
        <rect x="140" y="100" width="520" height="300" fill="url(#sky-hiru2)"/>${Art.cloud(260, 160, 0.6)}
        <path d="M140 170 H660" stroke="#495057" stroke-width="3"/>
        <rect x="140" y="370" width="520" height="30" fill="#adb5bd"/>
        <g id="p6train">${Art.train(170, 372, 0.85)}${Art.hat(330, 248, 0.55, -8)}</g>
      </g>
      <rect x="140" y="100" width="520" height="300" rx="10" fill="none" stroke="#8a5a33" stroke-width="16"/>
      <path d="M400 100 V400" stroke="#8a5a33" stroke-width="10"/>
      ${M}
      <g><rect x="200" y="530" width="400" height="22" rx="8" fill="#a0612f"/><rect x="190" y="580" width="420" height="22" rx="8" fill="#b5762e"/>
        <rect x="214" y="600" width="14" height="60" fill="#6b4322"/><rect x="572" y="600" width="14" height="60" fill="#6b4322"/></g>
      ${tapWrap('hop', 'boing', Art.pokke(420, 690, 0.8, { mouth: 'o' }))}`,
  },

  /* ====================== 7. わかれみち 1 ====================== */
  {
    id: 'p7',
    place: 'わかれみち',
    time: 'hiru2',
    text: ['たぬき さん が いいました。', '「あの でんしゃ は みなと へ いくよ。 かわ を くだる ふね も、 みなと へ いくよ」', 'でんしゃ で おいかける？ ふね で おいかける？'],
    hint: 'したの えらぶ ボタン を おしてね',
    shikake: {
      kind: 'choice',
      options: [
        { icon: '🚃', label: 'でんしゃ で おいかける', set: { path1: 'densha' }, next: 'p8t' },
        { icon: '⛵', label: 'ふね で おいかける', set: { path1: 'fune' }, next: 'p8f' },
      ],
    },
    mike: [420, 342, 0.6],
    draw: () => `${Art.sky('hiru2')}${Art.cloud(180, 110, 0.7)}
      ${Art.hills('#b6e39a', '#9ad27a')}
      <path d="M0 700 L0 560 Q 180 480 300 440 L330 450 Q 220 520 160 700Z" fill="#c8b48a"/>
      <path d="M40 700 L250 452 M120 700 L290 456" stroke="#6b4f45" stroke-width="6"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${60 + i * 34} ${676 - i * 40} l${60 - i * 6} 4" stroke="#8a5a3c" stroke-width="${8 - i}"/>`).join('')}
      ${tapWrap('toot', 'whistle', `<g>${Art.train(210, 452, 0.22)}</g>`)}
      <path d="M800 700 L800 520 Q 600 470 500 440 L470 450 Q 600 520 560 700Z" fill="url(#river)"/>
      ${Art.waves(560, '#fff', 2, 'amb-wave small')}
      ${tapWrap('bob', 'wave', `<g>${Art.boat(690, 590, 0.42)}</g>`)}
      <rect x="412" y="330" width="16" height="300" rx="6" fill="#8a5a3c"/>
      ${M}
      ${tapWrap('wiggle', 'pop', `<g><path d="M410 360 H260 l-30 30 l30 30 H410z" fill="#ffd43b" stroke="#8a5a3c" stroke-width="5"/>
        <text x="320" y="402" font-size="30" font-weight="800" text-anchor="middle" fill="#5c3d00">でんしゃ</text></g>`)}
      ${tapWrap('wiggle', 'pop', `<g><path d="M430 440 H560 l30 30 l-30 30 H430z" fill="#74c0fc" stroke="#8a5a3c" stroke-width="5"/>
        <text x="500" y="482" font-size="30" font-weight="800" text-anchor="middle" fill="#0b3d66">ふね</text></g>`)}
      ${tapWrap('hop', 'boing', Art.tanuki(250, 680, 0.75))}
      ${Art.pokke(560, 690, 0.72, { mouth: 'o' })}`,
  },

  /* ====================== 8. でんしゃ（でんしゃ ルート） ====================== */
  {
    id: 'p8t',
    place: 'でんしゃ',
    time: 'yu1',
    text: ['つぎ の でんしゃ に のって、 しゅっぱつ しんこう！', 'タブ を ひっぱると、 でんしゃ が はしる よ。'],
    hint: 'ピンク の タブ を みぎ へ ひっぱってね',
    after: ['ガタン ゴトン、 ガタン ゴトン。', 'まど の そと に、 あかい ぼうし が ちらり！'],
    tease: 'みなと は もうすぐ…！',
    shikake: {
      kind: 'pull',
      dist: 300,
      sound: 'gatan',
      progress(svg, p) {
        const bg = svg.querySelector('#bgscroll');
        if (bg) bg.style.transform = `translateX(${-p * 700}px)`;
      },
      finish(svg) {
        svg.querySelector('#bgscroll')?.classList.add('scroll-run');
        svg.querySelector('#p8train')?.classList.add('rumble');
        svg.querySelector('#p8hat')?.classList.add('show');
      },
    },
    mike: [553, 500, 0.5],
    next: 'p9t',
    draw: () => {
      let tile = '';
      for (let k = 0; k < 3; k += 1) {
        const o = k * 800;
        tile += `<path d="M${o} 420 Q ${o + 200} 330 ${o + 400} 400 T ${o + 800} 420 V560 H${o}Z" fill="#c4d98a"/>
          ${Art.tree(o + 120, 470, 0.5, '#8cc56a', '#76b05a')}${Art.tree(o + 560, 460, 0.6, '#8cc56a', '#76b05a')}
          <g><rect x="${o + 330}" y="300" width="10" height="260" fill="#8a5a3c"/><rect x="${o + 300}" y="310" width="70" height="8" fill="#8a5a3c"/></g>
          <g><rect x="${o + 730}" y="300" width="10" height="260" fill="#8a5a3c"/><rect x="${o + 700}" y="310" width="70" height="8" fill="#8a5a3c"/></g>`;
      }
      return `${Art.sky('yu1')}${Art.cloud(200, 120, 0.7)}
        <g id="p8hat" class="peek-out"><g class="amb-float">${Art.hat(660, 160, 0.6, 14)}</g></g>
        <g id="bgscroll">${tile}<path d="M0 316 H2400" stroke="#555" stroke-width="2"/></g>
        <rect x="0" y="556" width="800" height="144" fill="#b5a58a"/>
        <path d="M0 566 H800 M0 590 H800" stroke="#6b5a4a" stroke-width="6"/>
        <g id="p8train">${Art.train(60, 562, 1.0, { inner: `${pokkeHead(151, -86, 0.42)}` })}${M}</g>
        ${pullTab(110, 650, 300)}`;
    },
  },

  /* ====================== 9. みなと の はし（でんしゃ ルート） ====================== */
  {
    id: 'p9t',
    place: 'みなと',
    time: 'yu',
    text: ['みなと に ついた！ でも はし が とちゅう で きれて いる。', 'タブ を ひっぱって、 はし を のばそう。'],
    hint: 'ピンク の タブ を みぎ へ ひっぱってね',
    after: ['のびーる、 のびーる。 はし が つながった！', 'ぼうし は [海|うみ] の ほう へ ふわり ふわり。', 'ぼうし ぼうし、 まって まってー！'],
    tease: 'すると…？',
    shikake: {
      kind: 'pull',
      dist: 300,
      progress(svg, p) {
        const b = svg.querySelector('#bridge');
        if (b) b.style.transform = `scaleX(${Math.max(0.04, p)})`;
      },
      finish(svg) {
        const b = svg.querySelector('#bridge');
        if (b) b.style.transform = 'scaleX(1)';
        svg.querySelector('#pk9')?.classList.add('walk-across');
      },
    },
    mike: [700, 478, 0.62],
    next: 'p10',
    draw: () => `${Art.sky('yu')}${Art.cloud(220, 140, 0.7)}
      ${sea(380, 'sea-yu')}
      ${Art.lighthouse(730, 390, 0.42, false)}
      <g class="amb-float">${Art.hat(500, 230, 0.55, -10)}</g>
      ${pier(0, 500, 320)}${pier(560, 500, 240)}
      <g id="bridge"><rect x="320" y="490" width="240" height="22" fill="#c08a52"/>
        <path d="M320 470 H560 M340 470 V490 M400 470 V490 M460 470 V490 M520 470 V490" stroke="#8a5a33" stroke-width="6"/></g>
      ${M}<rect x="660" y="430" width="90" height="70" rx="6" fill="#a46a35"/><path d="M660 465 h90" stroke="#6b4322" stroke-width="5"/>
      <g id="pk9">${Art.pokke(200, 500, 0.7, { mouth: 'o' })}</g>
      ${pullTab(70, 630, 300)}`,
  },

  /* ====================== 8. かわ の ふね（ふね ルート） ====================== */
  {
    id: 'p8f',
    place: 'かわ',
    time: 'hiru2',
    text: ['ちいさな ふね に のって、 かわ を くだろう。', 'たんまつ を かたむけて、 ふね を ゆら ゆら。'],
    hint: 'たんまつ を かたむけるか、 ゆびで よこに ゆらしてね',
    after: ['ゆら ゆら、 ざぶん ざぶん。 ふね は すいすい すすむ。'],
    tease: 'かわ の さき に、 なにが ある…？',
    shikake: { kind: 'rock', need: 6, travel: 440 },
    mike: [705, 615, 0.7],
    next: 'p9f',
    draw: () => {
      const reeds = (x0) => [0, 1, 2, 3, 4].map((i) => `<path d="M${x0 + i * 16} 700 q${i % 2 ? 10 : -10} -60 ${i % 2 ? 4 : -4} -${90 + (i % 3) * 20}" stroke="#4f9a4f" stroke-width="6" fill="none"/>`).join('');
      return `${Art.sky('hiru2')}${Art.cloud(260, 100, 0.8)}
        <g fill="#b9c4d8">${[0, 1, 2, 3, 4].map((i) => `<rect x="${560 + i * 44}" y="${200 - (i % 3) * 30}" width="36" height="${110 + (i % 3) * 30}"/>`).join('')}</g>
        <path d="M0 260 H800 V320 H0Z" fill="#9ad27a"/>
        <rect x="0" y="300" width="800" height="270" fill="url(#river)"/>
        ${Art.waves(340, '#fff', 4)}
        <path d="M0 560 Q 400 540 800 560 V700 H0Z" fill="#8fd16a"/>
        ${tapWrap('bob', 'quack', `<g><ellipse cx="560" cy="380" rx="26" ry="14" fill="#fff"/><circle cx="578" cy="364" r="11" fill="#fff"/><path d="M586 364 l12 3 l-12 4z" fill="#f59f00"/><circle cx="580" cy="361" r="2" fill="#222"/></g>`)}
        ${tapWrap('bob', 'quack', `<g><ellipse cx="640" cy="400" rx="20" ry="11" fill="#ffe066"/><circle cx="654" cy="388" r="9" fill="#ffe066"/><path d="M661 388 l10 3 l-10 3z" fill="#f59f00"/></g>`)}
        <g id="boatmove"><g data-rock="1" class="rocker">${Art.boat(150, 470, 0.72, { inner: pokkeHead(-50, -50, 0.5) })}</g></g>
        ${M}${reeds(670)}${reeds(40)}`;
    },
  },

  /* ====================== 9. みなと（ふね ルート） ====================== */
  {
    id: 'p9f',
    place: 'みなと',
    time: 'yu1',
    text: ['みなと に ついた！ ぴちゃん！ さかな が はねた。', 'ぼうし は まだ [海|うみ] の うえ。 まにあう かも！'],
    hint: 'さかな や おおきな ふね を さわって みよう',
    tease: 'ぼうし ぼうし、 まって まってー！',
    shikake: { kind: 'tap' },
    mike: [232, 494, 0.6],
    next: 'p10',
    draw: () => `${Art.sky('yu1')}${Art.cloud(300, 110, 0.7)}
      ${sea(360, 'sea-day')}
      ${tapWrap('toot', 'horn', `<g><path d="M480 440 H780 L750 520 H510Z" fill="#364fc7"/><rect x="540" y="380" width="180" height="60" rx="6" fill="#fff"/>
        <rect x="660" y="330" width="40" height="50" fill="#e8505b"/><circle cx="580" cy="410" r="10" fill="#9fd3f5"/><circle cx="620" cy="410" r="10" fill="#9fd3f5"/>
        <g class="steam"><circle cx="680" cy="310" r="14" fill="#fff" opacity=".8"/><circle cx="696" cy="288" r="10" fill="#fff" opacity=".6"/></g></g>`)}
      <g class="amb-float">${Art.hat(420, 330, 0.5, 12)}</g>
      ${tapWrap('jump', 'splash', `<g><path d="M330 590 q30 -26 60 0 q-30 26 -60 0z" fill="#ff922b"/><path d="M330 590 l-20 -14 v28z" fill="#ff922b"/><circle cx="374" cy="586" r="3" fill="#222"/></g>`)}
      ${tapWrap('jump', 'splash', `<g><path d="M560 640 q26 -22 52 0 q-26 22 -52 0z" fill="#ffd43b"/><path d="M560 640 l-18 -12 v24z" fill="#ffd43b"/><circle cx="600" cy="636" r="3" fill="#222"/></g>`)}
      ${pier(0, 500, 270)}
      ${M}<g><path d="M190 500 h84 l-10 -40 h-64z" fill="url(#weave)" stroke="#8a5a33" stroke-width="3"/></g>
      ${tapWrap('hop', 'pop', `<g><ellipse cx="70" cy="482" rx="26" ry="16" fill="#e8590c"/><path d="M44 470 l-14 -16 M96 470 l14 -16" stroke="#e8590c" stroke-width="7" stroke-linecap="round"/><circle cx="62" cy="470" r="4" fill="#222"/><circle cx="78" cy="470" r="4" fill="#222"/></g>`)}
      ${Art.boat(130, 610, 0.5, { noSail: true, inner: pokkeHead(-20, -60, 0.6) })}`,
  },

  /* ====================== 10. うみ の うえ ====================== */
  {
    id: 'p10',
    place: 'うみ',
    time: seaTime,
    text: ['[海|うみ] の うえ を、 ぼうし が ふわり ふわり。', 'くわっ くわっ。 かもめ さん が とんで きた。'],
    hint: 'かもめ さん を さわって みよう',
    after: ['「ぼく が ぼうし を とって きて あげようか？」'],
    tease: 'さあ、 どう する…？',
    shikake: { kind: 'tap', need: ['kamome'] },
    mike: [560, 512, 0.6],
    next: 'p11',
    draw: (st) => {
      const t = seaTime(st);
      return `${Art.sky(t)}${Art.cloud(560, 120, 0.6)}
        ${sea(380, t === 'yu' ? 'sea-yu' : 'sea-day')}
        <g>${Art.rock(700, 410, 0.8, '#6c6f7d')}${Art.lighthouse(700, 380, 0.55, false)}</g>
        <g class="amb-float">${Art.hat(440, 260, 0.6, 10)}</g>
        ${flyingGull(230, 200, 1.0, 'kamome')}
        ${M}<g><rect x="545" y="500" width="30" height="50" rx="8" fill="#fff"/><rect x="545" y="512" width="30" height="14" fill="#e8505b"/><ellipse cx="560" cy="550" rx="26" ry="8" fill="#e8505b"/></g>
        ${pier(0, 580, 250)}
        ${Art.pokke(130, 590, 0.75, { reach: true, mouth: 'o' })}`;
    },
  },

  /* ====================== 11. わかれみち 2 ====================== */
  {
    id: 'p11',
    place: 'とうだい の ちかく',
    time: seaTime,
    text: ['ぼうし は とうだい の ほう へ とんで いく。', 'かもめ さん に たのむ？ じぶん で まつ？'],
    hint: 'したの えらぶ ボタン を おしてね',
    shikake: {
      kind: 'choice',
      options: [
        { icon: '🐦', label: 'かもめ さん に たのむ', set: { path2: 'kamome' }, next: (st) => (st.path1 === 'fune' ? 'e1a' : 'e2a') },
        { icon: '🌙', label: 'じぶん で まつ', set: { path2: 'matsu' }, next: 'e3a' },
      ],
    },
    mike: [430, 600, 0.62],
    draw: (st) => {
      const t = seaTime(st);
      return `${Art.sky(t)}
        ${sea(420, t === 'yu' ? 'sea-yu' : 'sea-day')}
        <g class="amb-float">${Art.hat(560, 170, 0.45, -12)}</g>
        ${Art.rock(640, 600, 2.0, '#6c6f7d')}
        ${tapWrap('wiggle', 'sparkle', `<g>${Art.lighthouse(640, 560, 1.15, true)}</g>`)}
        <rect x="292" y="470" width="16" height="150" fill="#8a5a33"/>
        ${tapWrap('hop', 'gull', Art.kamome(300, 452, 0.75))}
        ${M}${Art.rock(420, 640, 1.0, '#7c7f8c')}
        ${Art.rock(150, 700, 1.6, '#868a96')}
        ${Art.pokke(150, 640, 0.75)}`;
    },
  },

  /* ====================== けつまつ ① もどって きた ぼうし ====================== */
  {
    id: 'e1a',
    place: 'うみ',
    time: 'yu1',
    text: ['「まかせて！」 かもめ さん が びゅーん！', 'ゆびで [風|かぜ] を おくって、 おうえん しよう。'],
    hint: 'がめん を ゆびで ひゅーっと なぞってね',
    after: ['なみ の うえ で、 ぼうし を ぱくっ！', '「まにあった よー！」'],
    tease: 'すると…？',
    shikake: {
      kind: 'wind',
      need: 1200,
      progress(svg, p) {
        const k = svg.querySelector('#e1k');
        if (k) k.style.transform = `translate(${p * 380}px, ${p * 150}px)`;
      },
      finish(svg) {
        const k = svg.querySelector('#e1k');
        if (k) k.style.transform = 'translate(380px, 150px)';
        svg.querySelector('#e1hat')?.classList.add('got');
      },
    },
    mike: [330, 560, 0.6],
    next: 'e1b',
    draw: () => `${Art.sky('yu1')}${Art.cloud(200, 100, 0.7)}${Art.cloud(560, 150, 0.5)}
      ${sea(360, 'sea-day')}
      <g id="e1hat"><g class="amb-float">${Art.hat(640, 420, 0.6, 8)}</g></g>
      <g id="e1k" class="flapping">${Art.kamome(160, 230, 0.95)}</g>
      ${M}<g><ellipse cx="330" cy="570" rx="40" ry="16" fill="#8a5a33"/><rect x="292" y="520" width="76" height="50" rx="12" fill="#a46a35"/><path d="M292 540 h76" stroke="#6b4322" stroke-width="5"/></g>
      ${Art.boat(130, 640, 0.6, { noSail: true, inner: pokkeHead(0, -60, 0.6) })}
      ${windCue(300)}`,
  },
  {
    id: 'e1b',
    place: 'すなはま',
    time: 'yu',
    ending: 1,
    text: ['かもめ さん が ぼうし を はこんで きて くれた。', 'おかえり、 あかい ぼうし！'],
    hint: 'ぼうし を さわって、 ぽっけ に かぶせて あげよう',
    after: ['ぽっけ と かもめ さん は、 なかよし に なりました。', 'おしまい'],
    shikake: {
      kind: 'tap',
      need: ['hat'],
      onTap(svg, key) {
        if (key === 'hat') {
          svg.querySelector('#e1bk')?.classList.add('leave');
          svg.querySelector('.pokke-e1')?.classList.add('happy');
        }
      },
    },
    mike: [640, 590, 0.6],
    draw: () => `${Art.sky('yu')}${Art.cloud(200, 130, 0.6)}
      ${sea(380, 'sea-yu')}
      <path d="M0 520 Q 400 480 800 520 V700 H0Z" fill="#f6dca8"/>
      ${M}<g><rect x="590" y="580" width="100" height="60" fill="#e9c27a"/><rect x="600" y="550" width="24" height="30" fill="#e9c27a"/>
        <rect x="656" y="550" width="24" height="30" fill="#e9c27a"/><path d="M640 540 v-40 l24 10 l-24 10" fill="#e8505b" stroke="#8a5a33" stroke-width="3"/></g>
      ${tapWrap('jump', 'pop', `<g><path d="M150 620 l12 -24 l12 24 l-24 -14 h24z" fill="#ff8fab"/></g>`)}
      <g class="pokke-e1">${Art.pokke(400, 660, 1.05)}</g>
      <g id="e1bk" class="flapping">${Art.kamome(540, 200, 0.9, true)}</g>
      ${tapWrap('puton', 'ok', `<g>${Art.hat(476, 240, 0.6, -10)}<circle cx="476" cy="236" r="60" fill="transparent"/></g>`, 'hat')}`,
  },

  /* ====================== けつまつ ② とり の おうち ====================== */
  {
    id: 'e2a',
    place: 'とうだい の なか',
    time: 'yugure',
    text: ['かもめ さん に ついて、 とうだい の なか へ。', 'まっくら！ ゆび で てらして、 かいだん を さがそう。'],
    hint: 'ゆび を うごかすと、 かいちゅうでんとう に なるよ',
    after: ['あった！ ぐるぐる かいだん。 とん とん とん、 てっぺん へ。'],
    tease: 'てっぺん に あった のは…？',
    shikake: {
      kind: 'light',
      start: [360, 470],
      targets: [
        { id: 'lantern', x: 170, y: 320, r: 60 },
        { id: 'kaidan', x: 650, y: 400, r: 90 },
      ],
      need: ['lantern', 'kaidan'],
    },
    mike: [190, 560, 0.62],
    next: 'e2b',
    draw: () => {
      let steps = '';
      for (let i = 0; i < 8; i += 1) {
        steps += `<rect x="${560 + (i % 2) * 40}" y="${600 - i * 60}" width="180" height="22" rx="4" fill="#c08a52" stroke="#8a5a33" stroke-width="3"/>`;
      }
      return `<rect width="800" height="700" fill="url(#brick)"/>
        <rect x="0" y="600" width="800" height="100" fill="#4a3b36"/>
        <circle cx="400" cy="180" r="64" fill="#1a2756" stroke="#8a7a70" stroke-width="12"/><circle cx="420" cy="160" r="20" fill="#fff6c8"/>
        <g data-light="kaidan" class="light-target"><rect x="660" y="140" width="20" height="500" fill="#8a5a33"/>${steps}</g>
        <g data-light="lantern" class="light-target lantern">
          <path d="M170 250 v30" stroke="#495057" stroke-width="5"/>
          <rect x="146" y="280" width="48" height="70" rx="10" fill="#495057"/><rect x="154" y="290" width="32" height="50" rx="6" fill="#ffe8a3" class="flame"/>
          <circle cx="170" cy="315" r="90" fill="url(#lampglow)" class="lamp-light"/></g>
        ${M}<rect x="130" y="560" width="120" height="80" rx="6" fill="#a46a35"/><path d="M130 600 h120" stroke="#6b4322" stroke-width="5"/>
        <g><ellipse cx="300" cy="640" rx="40" ry="14" fill="#c9a26b"/><ellipse cx="300" cy="630" rx="30" ry="10" fill="none" stroke="#a87f48" stroke-width="5"/></g>
        ${Art.pokke(400, 660, 0.8, { mouth: 'o' })}
        <g>${Art.kamome(510, 560, 0.6)}</g>`;
    },
  },
  {
    id: 'e2b',
    place: 'とうだい の てっぺん',
    time: 'yugure',
    ending: 2,
    text: ['とうだい の てっぺん に、 あかい ぼうし！', 'あれ？ ぼうし の なか が もぞもぞ…。'],
    hint: 'ぼうし を そっと めくって みよう',
    after: ['ぴよ ぴよ！ ぼうし は ひな の おうち に なって いた。', '「この ぼうし、 ひなたち に あげるね」 おばあちゃん も きっと にっこり。', 'おしまい'],
    shikake: { kind: 'flip', target: 'su' },
    mike: [722, 360, 0.6],
    draw: () => {
      const nest = `<g><ellipse cx="0" cy="10" rx="96" ry="30" fill="#8a5a33"/><ellipse cx="0" cy="0" rx="80" ry="22" fill="#5c3d22"/>
        <path d="M-90 4 q40 -14 90 4 q50 -16 90 -2 M-80 18 q40 -10 80 4 q40 -12 80 -2" stroke="#b5762e" stroke-width="4" fill="none"/>
        ${Art.hina(-40, -6, 0.9)}${Art.hina(0, -14, 1)}${Art.hina(40, -6, 0.9)}</g>`;
      const cover = `<rect x="-110" y="-90" width="220" height="130" fill="transparent"/>${Art.hat(0, 0, 1.6, 0)}`;
      return `${Art.sky('yugure')}
        ${sea(460, 'sea-yu')}
        ${M}
        <g><rect x="600" y="230" width="120" height="180" rx="14" fill="#fff3a8" opacity=".9"/><path d="M590 230 q70 -60 140 0z" fill="#e8505b"/>
          <circle cx="660" cy="320" r="120" fill="url(#lampglow)" class="amb-lamp"/></g>
        <rect x="0" y="470" width="800" height="230" fill="#ced4da"/>
        <rect x="0" y="460" width="800" height="16" fill="#868e96"/>
        <g>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${i * 100}" y="380" width="10" height="90" fill="#495057"/>`).join('')}<rect x="0" y="376" width="800" height="10" fill="#495057"/></g>
        ${tapWrap('hop', 'gull', Art.kamome(170, 366, 0.7))}
        ${flap('su', 430, 580, nest, cover, 'lift-hat')}
        ${Art.pokke(110, 700, 0.75)}`;
    },
  },

  /* ====================== けつまつ ③ よぞら で ひかる ぼうし ====================== */
  {
    id: 'e3a',
    place: 'よる の いそ',
    time: 'yoru',
    text: ['ぽっけ は とうだい の した で まつ ことに した。', 'よる に なって、 まっくら。 ぼうし は どこ？'],
    hint: 'ゆび を うごかして、 ぼうし を さがそう',
    after: ['あった！ と おもったら… ぼうし が ふわっ と うきあがった！'],
    tease: 'ぼうし は どこまで いくの…？',
    shikake: {
      kind: 'light',
      start: [360, 500],
      targets: [
        { id: 'kani', x: 250, y: 610, r: 50 },
        { id: 'hitode', x: 690, y: 640, r: 50 },
        { id: 'hat', x: 560, y: 500, r: 60 },
      ],
      need: ['hat'],
      finish(svg) { svg.querySelector('#e3hat')?.classList.add('float-up'); },
    },
    mike: [712, 468, 0.6],
    next: 'e3b',
    draw: () => `${Art.sky('yoru')}
      ${sea(400, 'sea-night')}
      ${Art.lighthouse(140, 560, 1.1, false)}
      ${Art.rock(140, 600, 1.8, '#4a4d5a')}
      ${M}${Art.rock(720, 520, 1.0, '#4a4d5a')}
      ${Art.rock(560, 560, 1.2, '#565a68')}
      <g id="e3hat" data-light="hat" class="light-target">${Art.hat(560, 498, 0.55, 6)}</g>
      <g data-light="kani" class="light-target"><ellipse cx="250" cy="616" rx="24" ry="15" fill="#e8590c"/><path d="M226 606 l-12 -14 M274 606 l12 -14" stroke="#e8590c" stroke-width="6" stroke-linecap="round"/><circle cx="243" cy="604" r="3.5" fill="#222"/><circle cx="257" cy="604" r="3.5" fill="#222"/></g>
      <g data-light="hitode" class="light-target"><path d="${Art.starShape(28)}" transform="translate(690 640) rotate(12)" fill="#ff922b"/></g>
      <path d="M0 640 Q 400 610 800 650 V700 H0Z" fill="#3b3e4a"/>
      ${Art.pokke(380, 680, 0.78, { mouth: 'o' })}`,
  },
  {
    id: 'e3b',
    place: 'よぞら',
    time: 'yoru',
    ending: 3,
    text: ['ぼうし は [星|ほし] の そば まで のぼって いった。', '[星|ほし] を ぜんぶ さわって、 よぞら を ひからせよう。'],
    hint: 'おおきな [星|ほし] を 5つ さわってね',
    after: ['きらきら きらり。 あかい ぼうし は、 よぞら で ひかる [星|ほし] に なった。', '「ぽっけ、 いつでも みて いるよ」', 'おしまい'],
    shikake: {
      kind: 'tap',
      need: ['s1', 's2', 's3', 's4', 's5'],
      onTap(svg, key, got) {
        const order = ['s1', 's2', 's3', 's4', 's5'];
        svg.querySelectorAll('.cline').forEach((ln) => {
          const [a, b] = ln.dataset.pair.split('-');
          if (got.has(a) && got.has(b)) ln.classList.add('on');
        });
        if (order.every((k) => got.has(k))) svg.querySelector('#hatstar')?.classList.add('show');
      },
    },
    mike: [690, 600, 0.6],
    draw: () => {
      const pts = { s1: [290, 280], s2: [350, 180], s3: [440, 150], s4: [530, 180], s5: [590, 280] };
      const pairs = ['s1-s2', 's2-s3', 's3-s4', 's4-s5', 's5-s1'];
      const lines = pairs.map((p) => {
        const [a, b] = p.split('-');
        return `<line class="cline" data-pair="${p}" x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="#ffe8a3" stroke-width="4" stroke-linecap="round"/>`;
      }).join('');
      const stars = Object.keys(pts).map((k) => tapWrap('star', 'star',
        `<g transform="translate(${pts[k][0]} ${pts[k][1]})"><circle r="44" fill="transparent"/><path d="${Art.starShape(24)}" class="starbody"/></g>`, k)).join('');
      return `${Art.sky('yoru')}
        ${sea(470, 'sea-night')}
        ${Art.lighthouse(110, 560, 0.7, true)}
        ${Art.rock(110, 590, 1.2, '#3e414d')}
        <g id="hatstar" class="peek-out"><circle cx="440" cy="236" r="90" fill="url(#lampglow)"/>${Art.hat(440, 240, 0.7, 0)}</g>
        ${lines}${stars}
        ${M}${Art.rock(700, 620, 1.0, '#3e414d')}
        <path d="M200 700 Q 360 600 520 700Z" fill="#30333d"/>
        ${Art.pokke(360, 660, 0.78, { reach: true })}`;
    },
  },
];

const ENDINGS = {
  1: { icon: '👒', title: 'もどって きた ぼうし', page: 'e1a', how: 'ふね → かもめ さん に たのむ' },
  2: { icon: '🐣', title: 'ひな の おうち に なった ぼうし', page: 'e2a', how: 'でんしゃ → かもめ さん に たのむ' },
  3: { icon: '⭐', title: 'よぞら で ひかる ぼうし', page: 'e3a', how: 'じぶん で まつ' },
};
