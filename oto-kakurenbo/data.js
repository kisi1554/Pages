'use strict';

/* むしの データ と え（canvas に その場で かく） */

const BUGS = [
  {
    id: 'suzumushi', name: 'スズムシ', song: 'リーン リーン', when: 'あき・よる', level: 3,
    desc: '<ruby>秋<rt>あき</rt></ruby>の よるに すずの ような すんだ <ruby>音<rt>おと</rt></ruby>で なくよ。なくのは オスだけ。はねを こすりあわせて <ruby>音<rt>おと</rt></ruby>を だすんだ。',
  },
  {
    id: 'korogi', name: 'エンマコオロギ', song: 'コロコロ リー', when: 'あき・よる', level: 3,
    desc: 'くさむらや <ruby>石<rt>いし</rt></ruby>の したに すむ、コオロギの なかまで いちばん <ruby>大<rt>おお</rt></ruby>きい しゅるい。かおが えんまさまの ように こわく みえるので この なまえ。',
  },
  {
    id: 'matsumushi', name: 'マツムシ', song: 'チンチロリン', when: 'あき・よる', level: 3,
    desc: 'すこし たかい くさの なかに かくれて、かわいい こえで なくよ。<ruby>音<rt>おと</rt></ruby>は きこえても、すがたを みつけるのは とても むずかしい むし。',
  },
  {
    id: 'kirigirisu', name: 'キリギリス', song: 'ギーッ チョン', when: 'なつ・ひる', level: 1,
    desc: 'あつい ひるまに なく みどりいろの むし。ながい しょっかくと つよい うしろあしが じまん。ほかの <ruby>小<rt>ちい</rt></ruby>さな むしを たべる ことも あるよ。',
  },
  {
    id: 'minmin', name: 'ミンミンゼミ', song: 'ミーン ミンミン', when: 'なつ・ひる', level: 1,
    desc: '<ruby>夏<rt>なつ</rt></ruby>の ひるに おおきな こえで なく セミ。からだに みどりいろの もようが あって、はねは すきとおって いるよ。',
  },
  {
    id: 'tsukutsuku', name: 'ツクツクボウシ', song: 'ツクツク ボーシ', when: 'なつの おわり・ひる', level: 1,
    desc: '<ruby>夏<rt>なつ</rt></ruby>の おわりに よく なく セミ。「なつやすみが もうすぐ おわるよ」と おしえて くれる セミ とも いわれるよ。',
  },
  {
    id: 'higurashi', name: 'ヒグラシ', song: 'カナカナカナ', when: 'なつ・あさと ゆうがた', level: 2,
    desc: 'あさや ゆうがたの すずしい ときに なく セミ。かねを ならした ような すずしい <ruby>音<rt>おと</rt></ruby>が、<ruby>夏<rt>なつ</rt></ruby>の ゆうぐれに ぴったり。',
  },
];

const BUG_BY_ID = {};
BUGS.forEach((b) => { BUG_BY_ID[b.id] = b; });

const LEVELS = [
  { n: 1, name: 'ひる', emoji: '☀️', sub: 'むし 1ぴき', time: 'day', count: 1, sway: true,
    pool: ['kirigirisu', 'minmin', 'tsukutsuku'] },
  { n: 2, name: 'ゆうがた', emoji: '🌇', sub: '2ひき なく。いわれた ほうを さがそう', time: 'dusk', count: 2, sway: true,
    pool: BUGS.map((b) => b.id) },
  { n: 3, name: 'よる', emoji: '🌙', sub: 'くらい！ くさの ゆれ ヒント なし', time: 'night', count: 1, sway: false,
    pool: ['suzumushi', 'korogi', 'matsumushi'] },
];

/* ---------------------------- むしの え ---------------------------- */

const LOOK = {
  suzumushi:  { kind: 'cricket', body: '#2b2521', wing: '#76663f', leg: '#3a302a', head: '#1d1916', ant: '#e3dac2', antLen: 1.25 },
  korogi:     { kind: 'cricket', body: '#4b2f1c', wing: '#6f4a2b', leg: '#4b2f1c', head: '#2c1c11', ant: '#5a3a22', antLen: 1.1 },
  matsumushi: { kind: 'cricket', body: '#a27c45', wing: '#c9a062', leg: '#8a6838', head: '#8a6838', ant: '#8a6838', antLen: 1.1 },
  kirigirisu: { kind: 'cricket', body: '#5f9c2f', wing: '#8d7d3c', leg: '#4f8a26', head: '#5f9c2f', ant: '#4f8a26', antLen: 1.45, long: true },
  minmin:     { kind: 'cicada', body: '#2f4a3a', mark: '#86c46e', wing: 'rgba(215,240,255,.55)', vein: '#5f8a6a', eye: '#3a2a20', slim: 1 },
  tsukutsuku: { kind: 'cicada', body: '#33452c', mark: '#a9c96c', wing: 'rgba(220,240,255,.55)', vein: '#6a7a4a', eye: '#2a2a1a', slim: 0.82 },
  higurashi:  { kind: 'cicada', body: '#7a5a2f', mark: '#a1ba5c', wing: 'rgba(230,245,255,.55)', vein: '#8a6a3a', eye: '#4a2a1a', slim: 0.92 },
};

function silhouetteLook(L) {
  const c = 'rgba(40,60,45,.28)';
  return Object.assign({}, L, { body: c, wing: c, leg: c, head: c, ant: c, mark: c, vein: c, eye: c, sil: true });
}

/* (x, y) が まんなか、s が からだの ながさ（px） */
function drawBug(c, id, x, y, s, opt) {
  let L = LOOK[id];
  if (!L) return;
  if (opt && opt.silhouette) L = silhouetteLook(L);
  c.save();
  c.translate(x, y);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (L.kind === 'cricket') {
    c.translate(-s * 0.3, s * 0.04); // しょっかくが ながいので すこし ひだりへ
    drawCricket(c, s, L);
  }
  else drawCicada(c, s, L);
  c.restore();
}

function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}

function seg(c, x1, y1, x2, y2) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

/* よこから みた コオロギの なかま（あたまが みぎ） */
function drawCricket(c, u, L) {
  // しょっかく
  c.strokeStyle = L.ant;
  c.lineWidth = Math.max(1, u * 0.022);
  const reach = L.antLen * 0.7;
  c.beginPath(); c.moveTo(u * 0.5, -u * 0.08); c.quadraticCurveTo(u * 0.85, -u * 0.62, u * (0.5 + reach), -u * 0.5); c.stroke();
  c.beginPath(); c.moveTo(u * 0.48, -u * 0.04); c.quadraticCurveTo(u * 1.0, -u * 0.38, u * (0.62 + reach), -u * 0.16); c.stroke();

  // まえあし・なかあし
  c.strokeStyle = L.leg;
  c.lineWidth = u * 0.045;
  seg(c, u * 0.28, u * 0.08, u * 0.4, u * 0.3); seg(c, u * 0.4, u * 0.3, u * 0.52, u * 0.32);
  seg(c, u * 0.06, u * 0.1, u * 0.1, u * 0.32); seg(c, u * 0.1, u * 0.32, u * 0.22, u * 0.34);

  // しっぽの とげ（コオロギ）
  if (!L.long) {
    c.lineWidth = u * 0.025;
    seg(c, -u * 0.4, 0, -u * 0.62, -u * 0.06);
    seg(c, -u * 0.4, u * 0.03, -u * 0.62, u * 0.07);
  }

  // からだ
  ell(c, 0, 0, u * 0.42, u * 0.16, 0, L.body);

  // うしろあし（ふともも → すね）
  const hip = [u * 0.0, u * 0.04];
  const knee = [-u * 0.4, -u * 0.18];
  const ang = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]);
  ell(c, (hip[0] + knee[0]) / 2, (hip[1] + knee[1]) / 2, u * 0.25, u * 0.075, ang, L.leg);
  c.strokeStyle = L.leg;
  c.lineWidth = u * 0.04;
  seg(c, knee[0], knee[1], -u * 0.22, u * 0.32);
  seg(c, -u * 0.22, u * 0.32, -u * 0.08, u * 0.34);

  // はね
  if (L.long) ell(c, -u * 0.08, -u * 0.07, u * 0.44, u * 0.1, -0.06, L.wing);
  else ell(c, -u * 0.04, -u * 0.06, u * 0.34, u * 0.11, -0.05, L.wing);

  // あたま・め
  ell(c, u * 0.42, -u * 0.02, u * 0.14, u * 0.14, 0, L.head);
  if (!L.sil) {
    ell(c, u * 0.48, -u * 0.07, u * 0.045, u * 0.045, 0, '#fff');
    ell(c, u * 0.49, -u * 0.07, u * 0.024, u * 0.024, 0, '#111');
  }
}

/* うえから みた セミ（あたまが うえ） */
function drawCicada(c, u, L) {
  const sl = L.slim || 1;
  // はね
  [-1, 1].forEach((side) => {
    ell(c, side * u * 0.2, u * 0.12, u * 0.15, u * 0.48, -side * 0.3, L.wing, L.vein, Math.max(1, u * 0.012));
    c.strokeStyle = L.vein;
    c.lineWidth = Math.max(1, u * 0.01);
    seg(c, side * u * 0.1, -u * 0.18, side * u * 0.33, u * 0.5);
  });
  // おなか
  ell(c, 0, u * 0.08, u * 0.16 * sl, u * 0.34, 0, L.body);
  c.strokeStyle = L.mark;
  c.lineWidth = Math.max(1, u * 0.018);
  for (let i = 0; i < 4; i++) {
    const yy = u * (0.0 + i * 0.09);
    const w = u * 0.13 * sl * (1 - i * 0.12);
    c.beginPath(); c.moveTo(-w, yy); c.quadraticCurveTo(0, yy + u * 0.03, w, yy); c.stroke();
  }
  // むね
  ell(c, 0, -u * 0.2, u * 0.21, u * 0.13, 0, L.body);
  ell(c, 0, -u * 0.2, u * 0.08, u * 0.06, 0, L.mark);
  // あたま・め
  ell(c, 0, -u * 0.36, u * 0.22, u * 0.08, 0, L.body);
  ell(c, -u * 0.22, -u * 0.37, u * 0.06, u * 0.06, 0, L.eye);
  ell(c, u * 0.22, -u * 0.37, u * 0.06, u * 0.06, 0, L.eye);
  if (!L.sil) {
    ell(c, -u * 0.235, -u * 0.39, u * 0.018, u * 0.018, 0, 'rgba(255,255,255,.8)');
    ell(c, u * 0.205, -u * 0.39, u * 0.018, u * 0.018, 0, 'rgba(255,255,255,.8)');
  }
}
