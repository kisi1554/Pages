'use strict';

/*
 * しろっとクイズ — 出題テーマ: 平面図形
 *
 * このファイルは自動生成 (tools/shirotto-quiz/generate_topic_figures.js)。
 * 手で 直さないこと。
 *
 *   shape … 落ちてくる かたち(あたり判定にも つかう)
 *   lines … かさねて 引く 線。dash: true は 見えない辺(点線)
 *   props … せいしつの 問題に つかう 数。ない(まるい立体の 辺など)なら 書かない
 *   hints … 上から じゅんばんに 出す。hide に 書いた 問題では 出さない
 */

SHIROTTO_TOPICS.push({
  id: "plane",
  name: "平面図形",
  emoji: "🔺",
  question: "この かたちの 名前は？",
  unit: "図形",
  overviewViewBox: null,
  allowTilt: false,          // かたむけると 正方形が ひし形に 見えてしまう
  loopItems: true,           // 数が 少ないので くりかえし 出す(おわりは 山が つもったとき)
  quizzes: [
    {"id":"name","weight":3,"question":"この かたちの 名前は？","field":"name"},
    {"id":"sides","weight":1,"question":"この かたちの 辺（へん）は 何本？","field":"sides","suffix":"本"},
    {"id":"right","weight":1,"question":"この かたちに 直角（ちょっかく）は いくつ？","field":"right","suffix":"こ"},
  ],
  groups: [
    {"id":"sankaku","name":"三角形の なかま"},
    {"id":"shikaku","name":"四角形の なかま"},
    {"id":"takakkei","name":"多角形の なかま"},
    {"id":"maru","name":"まるい なかま"},
  ],
  items: [
    {
      id: "seisankaku", name: "正三角形", kana: "せいさんかくけい", group: "sankaku",
      box: {"x":0,"y":0,"w":100,"h":86.6},
      props: {"sides":3,"right":0},
      hints: [{"e":"🧭","text":"三角形の なかま","hide":["sides"]},{"e":"📏","text":"3つの 辺が ぜんぶ 同じ 長さ","hide":["sides"]},{"e":"📐","text":"かどの 大きさは ぜんぶ 60ど"}],
      shape: "M50,0 100,86.6 0,86.6 Z",
    },
    {
      id: "nitohen", name: "二等辺三角形", kana: "にとうへんさんかくけい", group: "sankaku",
      box: {"x":0,"y":0,"w":100,"h":88.71},
      props: {"sides":3,"right":0},
      hints: [{"e":"🧭","text":"三角形の なかま","hide":["sides"]},{"e":"📏","text":"2つの 辺の 長さだけが 同じ"},{"e":"📐","text":"下の 2つの かどが 同じ 大きさ"}],
      shape: "M50,0 0,88.71 100,88.71 Z",
    },
    {
      id: "chokkaku3", name: "直角三角形", kana: "ちょっかくさんかくけい", group: "sankaku",
      box: {"x":0,"y":0,"w":100,"h":86.96},
      props: {"sides":3,"right":1},
      hints: [{"e":"🧭","text":"三角形の なかま","hide":["sides"]},{"e":"📐","text":"かどの 1つが 直角","hide":["right"]},{"e":"📏","text":"三角じょうぎの かたち"}],
      shape: "M0,0 0,86.96 100,86.96 Z",
    },
    {
      id: "seihoukei", name: "正方形", kana: "せいほうけい", group: "shikaku",
      box: {"x":0,"y":0,"w":100,"h":100},
      props: {"sides":4,"right":4},
      hints: [{"e":"🧭","text":"四角形の なかま","hide":["sides"]},{"e":"📏","text":"4つの 辺が ぜんぶ 同じ 長さ","hide":["sides"]},{"e":"📐","text":"かどが ぜんぶ 直角","hide":["right"]}],
      shape: "M0,0 100,0 100,100 0,100 Z",
    },
    {
      id: "choohoukei", name: "長方形", kana: "ちょうほうけい", group: "shikaku",
      box: {"x":0,"y":0,"w":100,"h":63.33},
      props: {"sides":4,"right":4},
      hints: [{"e":"🧭","text":"四角形の なかま","hide":["sides"]},{"e":"📐","text":"かどが ぜんぶ 直角","hide":["right"]},{"e":"📏","text":"むかいあう 辺の 長さが 同じ"}],
      shape: "M0,0 100,0 100,63.33 0,63.33 Z",
    },
    {
      id: "heikou4", name: "平行四辺形", kana: "へいこうしへんけい", group: "shikaku",
      box: {"x":0,"y":0,"w":100,"h":60},
      props: {"sides":4,"right":0},
      hints: [{"e":"🧭","text":"四角形の なかま","hide":["sides"]},{"e":"📏","text":"むかいあう 辺が 2組とも へいこう"},{"e":"📐","text":"かたむいた 長方形の ような かたち"}],
      shape: "M23.33,0 100,0 76.67,60 0,60 Z",
    },
    {
      id: "daikei", name: "台形", kana: "だいけい", group: "shikaku",
      box: {"x":0,"y":0,"w":100,"h":60},
      props: {"sides":4,"right":0},
      hints: [{"e":"🧭","text":"四角形の なかま","hide":["sides"]},{"e":"📏","text":"へいこうな 辺が 1組だけ"},{"e":"🪜","text":"上と下の 長さが ちがう"}],
      shape: "M23.33,0 76.67,0 100,60 0,60 Z",
    },
    {
      id: "hishigata", name: "ひし形", kana: "ひしがた", group: "shikaku",
      box: {"x":0,"y":0,"w":66.67,"h":100},
      props: {"sides":4,"right":0},
      hints: [{"e":"🧭","text":"四角形の なかま","hide":["sides"]},{"e":"📏","text":"4つの 辺が ぜんぶ 同じ 長さ","hide":["sides"]},{"e":"♦️","text":"トランプの ダイヤの かたち"}],
      shape: "M33.33,0 66.67,50 33.33,100 0,50 Z",
    },
    {
      id: "gokakkei", name: "正五角形", kana: "せいごかくけい", group: "takakkei",
      box: {"x":0,"y":0,"w":100,"h":95.11},
      props: {"sides":5,"right":0},
      hints: [{"e":"🧭","text":"多角形の なかま"},{"e":"⚾","text":"ホームベースに にている"},{"e":"📏","text":"辺の 長さが ぜんぶ 同じ"}],
      shape: "M50,0 100,36.33 80.9,95.11 19.1,95.11 0,36.33 Z",
    },
    {
      id: "rokkakkei", name: "正六角形", kana: "せいろっかくけい", group: "takakkei",
      box: {"x":0,"y":0,"w":100,"h":86.6},
      props: {"sides":6,"right":0},
      hints: [{"e":"🧭","text":"多角形の なかま"},{"e":"🍯","text":"ハチの すの かたち"},{"e":"❄️","text":"雪の けっしょうの かたち"}],
      shape: "M100,43.3 75,86.6 25,86.6 0,43.3 25,0 75,0 Z",
    },
    {
      id: "hakkakkei", name: "正八角形", kana: "せいはっかくけい", group: "takakkei",
      box: {"x":0,"y":0,"w":100,"h":100},
      props: {"sides":8,"right":0},
      hints: [{"e":"🧭","text":"多角形の なかま"},{"e":"🛑","text":"「とまれ」の ひょうしきの かたち"},{"e":"📏","text":"辺の 長さが ぜんぶ 同じ"}],
      shape: "M100,70.71 70.71,100 29.29,100 0,70.71 0,29.29 29.29,0 70.71,0 100,29.29 Z",
    },
    {
      id: "en", name: "円", kana: "えん", group: "maru",
      box: {"x":0,"y":0,"w":100,"h":100},
      props: {},
      hints: [{"e":"🧭","text":"まるい なかま"},{"e":"📏","text":"まん中から どこまでも 同じ 長さ"},{"e":"⚽","text":"ボールを 上から 見た かたち"}],
      shape: "M0,50 A50,50 0 0 1 100,50 A50,50 0 0 1 0,50 Z",
    },
    {
      id: "hanen", name: "半円", kana: "はんえん", group: "maru",
      box: {"x":0,"y":0,"w":100,"h":50},
      props: {},
      hints: [{"e":"🧭","text":"まるい なかま"},{"e":"✂️","text":"円を まん中で 半分に した かたち"},{"e":"📏","text":"まっすぐな 辺が 1本 ある"}],
      shape: "M0,50 A50,50 0 0 1 100,50 Z",
    },
    {
      id: "ougi", name: "おうぎ形", kana: "おうぎがた", group: "maru",
      box: {"x":0,"y":0,"w":100,"h":100},
      props: {},
      hints: [{"e":"🧭","text":"まるい なかま"},{"e":"🍕","text":"ピザや ケーキを 切った かたち"},{"e":"✏️","text":"コンパスで かいた 一部分"}],
      shape: "M0,100 L0,0 A100,100 0 0 1 100,100 Z",
    },
  ],
});
