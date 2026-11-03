#!/usr/bin/env node
/* むしくい しんぶん — もんだいの テスト:  node mushikui-shinbun/test.js
 *  - かず: レベル1〜4 は 60もん、しんぶん 20まい（あな 3〜5こ・ぶん 3〜4つ）
 *  - こたえが こうほに ふくまれる・こうほに じゅうふくが ない・ちがう こうほは ok に ない
 *  - ちがう こうほを いれた ぶんは ぜんぶ review.txt（てで チェックした リスト）に ある
 *  - ふりがな: かんじには かならず {よみ}。かんじは 1〜3ねんの はいとう かんじ だけ
 *  - レベル4・5 の こたえは 50おん パッドで いれられる もじ だけ
 */
"use strict";
const path = require("path");
const fs = require("fs");
const M = require(path.join(__dirname, "mondai.js"));
const B = require(path.join(__dirname, "bugs.js"));
const reviewLines = require(path.join(__dirname, "review-gen.js"));

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; if (!ok || process.env.V) console.log((ok ? "  ✓ " : "  ✗ ") + m); };
const sum = (ok, m) => { if (!ok) fail++; console.log((ok ? "  ✓ " : "  ✗ ") + m); };

// がくねん べつ かんじ はいとう ひょう（1〜3ねん）
const G = {
  1: "一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六",
  2: "引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話",
  3: "悪安暗医委意育員院飲運泳駅央横屋温化荷界開階寒感漢館岸起期客究急級宮球去橋業曲局銀区苦具君係軽血決研県庫湖向幸港号根祭皿仕死使始指歯詩次事持式実写者主守取酒受州拾終習集住重宿所暑助昭消商章勝乗植申身神真深進世整昔全相送想息速族他打対待代第題炭短談着注柱丁帳調追定庭笛鉄転都度投豆島湯登等動童農波配倍箱畑発反坂板皮悲美鼻筆氷表秒病品負部服福物平返勉放味命面問役薬由油有遊予羊洋葉陽様落流旅両緑礼列練路和",
};
const GRADE = {};
for (const g in G) for (const c of G[g]) GRADE[c] = +g;
sum(Object.keys(GRADE).length === 440, `はいとう かんじ 1〜3ねん ${Object.keys(GRADE).length}じ`);

const KANJI = /[一-鿿々]/;
const PADCH = new Set([..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん" +
  "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽっゃゅょぁぃぅぇぉー"]);

function checkText(where, s) {
  // {よみ} を はずした あとに かんじが のこって いたら ふりがな なし
  const bare = s.replace(/([一-鿿々]+)\{([ぁ-んー]+)\}/g, "");
  check(!KANJI.test(bare), `${where}: ふりがな なしの かんじが ない（${s}）`);
  for (const c of s) if (KANJI.test(c)) check(GRADE[c] >= 1, `${where}: 「${c}」は 1〜3ねんの かんじ`);
  check(!/\{[^}]*$|^[^{]*\}/.test(s), `${where}: { } の くみが あう`);
}
function checkHole(where, h, opt) {
  const cand = [h.a].concat(h.d);
  check(new Set(cand).size === cand.length, `${where}: こうほに じゅうふくが ない（${cand.join("・")}）`);
  check(h.ok.includes(h.a), `${where}: こたえ「${h.a}」が ok に ある`);
  check(cand.some((w) => h.ok.includes(w)), `${where}: こたえが こうほに ある`);
  check(h.d.every((w) => !h.ok.includes(w)), `${where}: ちがう こうほは ok に ない`);
  check(h.d.length === 2, `${where}: こうほは 3つ（${cand.length}）`);
  for (const k of Object.keys(h.f)) check(h.d.includes(k), `${where}: おもしろ え「${k}」は ちがう こうほ`);
  if (opt.pad) for (const c of h.a) check(PADCH.has(c), `${where}: 「${h.a}」の「${c}」は パッドで いれられる`);
  for (const w of cand) for (const c of w) if (KANJI.test(c)) check(GRADE[c] >= 1 && GRADE[c] <= 3, `${where}: こうほ「${c}」は 1〜3ねん`);
}

/* レベル1〜4 */
for (const lv of [1, 2, 3, 4]) {
  const qs = M.LV[lv];
  sum(qs.length === 60, `レベル${lv}: ${qs.length}もん`);
  const seen = new Set();
  qs.forEach((q, i) => {
    const w = `L${lv}-${i + 1}`;
    check(!seen.has(q.s), `${w}: おなじ ぶんが ない`); seen.add(q.s);
    check((q.s.match(/＿/g) || []).length === 1, `${w}: あなは 1つ`);
    check(!!q.e, `${w}: え が ある`);
    checkText(w, q.s);
    checkHole(w, q, { pad: lv === 4 });
    const n = [...q.a].length;
    if (lv === 1) check(n === 1 && /^[ぁ-ん]$/.test(q.a) && q.d.every((d) => /^[ぁ-ん]$/.test(d)), `${w}: ひらがな 1もじ`);
    if (lv === 2) check(n >= 2 && n <= 5, `${w}: ことば 2〜5もじ（${q.a}）`);
    if (lv === 3) {
      check(n === 1 && KANJI.test(q.a) && q.d.every((d) => [...d].length === 1 && KANJI.test(d)), `${w}: かんじ 1じ`);
      check(/^[ぁ-ん]+$/.test(q.y), `${w}: よみ ヒント「${q.y}」`);
    }
    if (lv === 4) { check(!!q.m && q.m.length >= 8, `${w}: いみ が ある`); check(n >= 1 && n <= 4, `${w}: あなは 1〜4もじ（${q.a}）`); }
  });
}
sum(fail === 0, "レベル1〜4: こたえ・こうほ・ふりがな・がくねん");

/* しんぶん */
const f0 = fail;
sum(M.SHINBUN.length === 20, `しんぶん ${M.SHINBUN.length}まい`);
M.SHINBUN.forEach((n, i) => {
  const w = `しんぶん${i + 1}`;
  const holes = (n.s.match(/＿/g) || []).length;
  check(holes === n.h.length, `${w}: ＿ の かず ${holes} = こたえ ${n.h.length}`);
  check(n.h.length >= 3 && n.h.length <= 5, `${w}: あな 3〜5こ`);
  const sents = n.s.split(/(?<=。)\s*/).filter(Boolean).length;
  check(sents >= 3 && sents <= 4, `${w}: ぶん 3〜4つ（${sents}）`);
  checkText(w, n.s); checkText(w + " みだし", n.t);
  n.h.forEach((h, j) => {
    checkHole(`${w}-${j + 1}`, h, { pad: true });
    check(!n.t.includes(h.a), `${w}-${j + 1}: みだしに こたえ「${h.a}」が でて いない`);
  });
});
sum(fail === f0, "しんぶん: あな・ぶん・こたえ・みだし");

/* てで チェックした リスト */
const f1 = fail;
const want = reviewLines();
const have = fs.readFileSync(path.join(__dirname, "review.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const hs = new Set(have), ws = new Set(want);
const miss = want.filter((l) => !hs.has(l)), extra = have.filter((l) => !ws.has(l));
miss.slice(0, 10).forEach((l) => check(false, `review.txt に ない（てで よんで たしかめて から くわえる）: ${l}`));
extra.slice(0, 10).forEach((l) => check(false, `review.txt に ふるい ぎょうが ある: ${l}`));
sum(fail === f1, `ちがう こうほを いれた ぶん ${want.length}こ が ぜんぶ てで チェック ずみ`);

/* ことわざ どうじょう と いみが おなじ もじれつ に なって いない */
const f2 = fail;
try {
  const src = fs.readFileSync(path.join(__dirname, "..", "kotowaza-dojo", "data.js"), "utf8");
  for (const q of M.LV[4]) check(!src.includes(q.m), `いみ「${q.m.slice(0, 12)}…」は じぶんの ことばで かいた`);
} catch (e) { /* ことわざ どうじょう が ない ときは とばす */ }
sum(fail === f2, "ことわざの いみは ことわざ どうじょう と べつの ことば");

/* むし */
const f3 = fail;
check(B.BUGS.length === 10, `むし 10しゅ（${B.BUGS.length}）`);
check(new Set(B.BUGS.map((b) => b.id)).size === 10, "むしの id が かぶらない");
for (const b of B.BUGS) {
  const s = B.svg(b.id);
  check(s.startsWith("<svg") && s.length > 200, `${b.name}: え が ある`);
  check(b.info && b.w > 0, `${b.name}: せつめい・でやすさ`);
}
const cnt = {};
for (let i = 0; i < 5000; i++) { const id = B.pick(); cnt[id] = (cnt[id] || 0) + 1; }
check(Object.keys(cnt).length === 10, "10しゅ ぜんぶ でて くる");
sum(fail === f3, "むし ずかん 10しゅ");

console.log(fail ? `\n✗ ${fail} こ しっぱい` : "\n✓ ぜんぶ OK");
process.exit(fail ? 1 : 0);
