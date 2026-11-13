'use strict';
/*
 * でんしゃ（キャラクター）と、おはなしの ぶひん。
 * ジャンルは genre-*.js が Naisho.addGenre() で たして いく。
 * あたらしい ジャンルを ふやす ときは README の「ジャンルの ふやしかた」を みる。
 */
const TRAINS = [
  {
    id: 'hayabusa', name: 'はやぶさ', sub: 'しんかんせん E5けい', horn: 'shinkansen', color: '#19c48a',
    voice: { pitch: 1.25, rate: 1.05 }, me: 'ぼく', da: 'だよ', dane: 'だね', nda: 'んだ', cars: 10, shapes: {},
    hello: 'やあ {n}! {me}は はやぶさ。にほんで いちばん はやい しんかんせん{da}。ビューン!',
    again: ['{n}、また きてくれた{nda}ね! ビューンと うれしい{yo}!', 'おっ、{n}! まってた{yo}。きょうも はやく はなしたくて うずうず してた{nda}。'],
    cheer: 'ビューン!',
  },
  {
    id: 'doctor', name: 'ドクターイエロー', sub: 'せんろの おいしゃさん', horn: 'shinkansen', color: '#ffd200',
    voice: { pitch: 1.0, rate: 0.92 }, me: 'わたし', da: 'ですよ', dane: 'ですね', nda: 'んです', cars: 7, shapes: { maru: 'light' },
    hello: 'こんばんは {n}。{me}は ドクターイエロー。せんろの おいしゃさん{da}。',
    again: ['{n}、また あえました{ne}。みると しあわせに なる きいろ{da}。', 'おや {n}。きょうも げんきそう{dane}。しんさつ いらず{da}。'],
    cheer: 'いじょう なし!',
  },
  {
    id: 'yamanote', name: 'やまのてせん', sub: 'ぐるぐる まわる E235けい', horn: 'commuter', color: '#9fd02a',
    voice: { pitch: 1.4, rate: 1.0 }, me: 'ぼく', da: 'だよ', dane: 'だね', nda: 'んだ', cars: 11, shapes: { maru: 'light', shikaku: 'window' },
    hello: 'わーい、{n}が きた! {me}は やまのてせん。とうきょうを ぐるぐる まわって いる{nda}。',
    again: ['{n}! ぐるっと まわって また あえた{ne}!', 'やっほー {n}! きょうは なんしゅう はなそうか?'],
    cheer: 'ぐるぐる〜!',
  },
  {
    id: 'blue', name: 'ブルーライン', sub: 'よこはまの ちかてつ 3000V', horn: 'commuter', color: '#4aa3ff',
    voice: { pitch: 1.55, rate: 0.95 }, me: 'わたし', da: 'だよ', dane: 'だね', nda: 'んだ', cars: 6, shapes: { maru: 'light', shikaku: 'window' },
    hello: '{n}、こんばんは。{me}は ブルーライン。よこはまの じめんの したを はしる ちかてつ{da}。',
    again: ['{n}、きてくれたの? {me}、ちかから いそいで あがって きた{nda}。', 'あ、{n}{da}! きょうも よこはまの はなし、する?'],
    cheer: 'すいすい〜!',
  },
  {
    id: 'd51', name: 'デゴイチ', sub: 'じょうき きかんしゃ D51', horn: 'sl', color: '#e0a83a',
    voice: { pitch: 0.6, rate: 0.85 }, me: 'わし', da: 'じゃよ', dane: 'じゃな', nda: 'んじゃ', cars: 1, shapes: { maru: 'door', shikaku: 'plate' },
    hello: 'ほっほっほ。{n}かい。{me}は デゴイチ。けむりを はいて はしる じょうき きかんしゃ{da}。',
    again: ['おお {n}、よう きたのう。{me}は うれしくて ゆげが でる{nda}。', '{n}{dane}。きょうも むかしばなしを して やろうかの。'],
    cheer: 'ポッポー!',
  },
];

const PART_NAME = {
  light: 'ライト', window: 'まど', body: 'からだ', nose: 'はな', panta: 'パンタグラフ', coupler: 'れんけつき',
  door: 'まるい とびら', plate: 'ナンバープレート', chimney: 'えんとつ', cyl: 'シリンダー',
};

const Naisho = {
  genres: [],
  /* g = { id, name, emoji, color, talks: [{ id, only?: [でんしゃid], need?: (c)=>bool, f: (c)=>[ステップ] }] } */
  addGenre: function (g) { this.genres.push(g); },
};

/* ---------- おはなしの ステップ ---------- */
/* でんしゃが しゃべる。o = { show, fx, led } */
function S(text, o) { return Object.assign({ k: 'say', text: text }, o); }
/* こたえの ある しつもん。right が せいかい。o = { hint, yes, show, fx } */
function QA(text, right, wrongs, o) { return Object.assign({ k: 'ask', text: text, choices: [right].concat(wrongs), ok: 0, mix: true }, o); }
/* こたえの ない しつもん（すきな もの など）。re = へんじ（はいれつ か かんすう）。o.save で おぼえる */
function QO(text, choices, re, o) { return Object.assign({ k: 'ask', text: text, choices: choices, re: re }, o); }
/* でんしゃの ぶひんを タップして もらう。part = 'light' など / { part:'light', side:'R' } */
function T(text, part, o) { return Object.assign({ k: 'tap', text: text, part: typeof part === 'string' ? { part: part } : part }, o); }

function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function rep(e, n) { return Array(n + 1).join(e); }

/* かずの 3たく。unit は「りょう」など */
function QN(text, ans, unit, o) {
  const set = [ans];
  const cand = shuffle([ans - 2, ans - 1, ans + 1, ans + 2].filter(function (v) { return v >= 0; }));
  while (set.length < 3) set.push(cand.shift());
  set.sort(function (a, b) { return a - b; });
  return Object.assign({ k: 'ask', text: text, choices: set.map(function (v) { return v + (unit || ''); }), ok: set.indexOf(ans), mix: false }, o);
}
