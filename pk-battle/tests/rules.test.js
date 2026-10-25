// node --test pk-battle/tests/*.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rules.js");

const K = (a, b) => [a.split("").map((c) => c === "o"), b.split("").map((c) => c === "o")];

test("はじめは 先攻 から、1本ずつ こうたい", () => {
  assert.equal(R.status(K("", "")).next, 0);
  assert.equal(R.status(K("o", "")).next, 1);
  assert.equal(R.status(K("o", "x")).next, 0);
  assert.equal(R.status(K("", "")).round, 1);
  assert.equal(R.status(K("o", "")).round, 1);
  assert.equal(R.status(K("o", "o")).round, 2);
});

test("5本ずつ けって おおい ほうが かち", () => {
  const s = R.status(K("ooxoo", "oooxx"));
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.score, [4, 3]);
});

test("とちゅうで のこりを ぜんぶ いれても とどかなければ おわり", () => {
  // 先攻 3本 ぜんぶ ○、後攻 3本 ぜんぶ × → 後攻は のこり 2本 いれても 2点 < 3点
  let s = R.status(K("ooo", "xxx"));
  assert.equal(s.over, true); assert.equal(s.winner, 0); assert.equal(s.reason, "decided");
  // 先攻 4本め の あと: 先攻 4-? … 後攻が 4本め まで で きまる パターン
  s = R.status(K("xxxx", "ooo"));     // 先攻は のこり1本で さいだい 1点、後攻は もう 3点
  assert.equal(s.over, true); assert.equal(s.winner, 1);
  // まだ わからない
  s = R.status(K("ooo", "xx"));        // 後攻 のこり 3本 → さいだい 3点 = 3点
  assert.equal(s.over, false);
  s = R.status(K("oooo", "xxx"));      // 後攻 のこり 2本 → 2 < 4
  assert.equal(s.over, true); assert.equal(s.winner, 0);
});

test("先攻の 5本め を まえに きまる ことも ある（後攻 4本め で）", () => {
  const s = R.status(K("xxxx", "oooo"));
  assert.equal(s.over, true); assert.equal(s.winner, 1);
});

test("5本めの 後攻が きめれば どうてん → サドンデス", () => {
  let s = R.status(K("ooxoo", "oooxo"));
  assert.equal(s.over, false); assert.equal(s.sudden, true); assert.equal(s.next, 0); assert.equal(s.round, 6);
  s = R.status(K("ooxooo", "oooxo"));
  assert.equal(s.over, false); assert.equal(s.sudden, true); assert.equal(s.next, 1);
  // サドンデスは おなじ かず けって ちがったら おわり
  s = R.status(K("ooxooo", "oooxox"));
  assert.equal(s.over, true); assert.equal(s.winner, 0); assert.equal(s.reason, "sudden");
  s = R.status(K("ooxoox", "oooxoo"));
  assert.equal(s.over, true); assert.equal(s.winner, 1);
  // りょうほう はずしても つづく
  s = R.status(K("ooxoox", "oooxox"));
  assert.equal(s.over, false); assert.equal(s.round, 7);
});

test("サドンデスで 先攻が はずしても 後攻が けるまで おわらない", () => {
  const s = R.status(K("xxxxxx", "xxxxx"));
  assert.equal(s.over, false);
  assert.equal(s.next, 1);
});

test("じゅんばんが おかしい ときは エラー", () => {
  assert.throws(() => R.status(K("", "o")));
  assert.throws(() => R.status(K("ooo", "o")));
});

test("スコアボード: 5ますと サドンデスの ぶん", () => {
  assert.deepEqual(R.board(K("ox", "o")), [["○", "×", "・", "・", "・"], ["○", "・", "・", "・", "・"]]);
  assert.deepEqual(R.board(K("oooxxo", "ooxoox"))[0].length, 6);
});

test("きめたら かち／はずしたら まけ の ばめん", () => {
  assert.equal(R.pressure(K("oooo", "oooo")), null);            // 先攻 5本め: まだ きまらない
  assert.equal(R.pressure(K("oooo", "ooox")), "win");           // 先攻 5本め: きめたら かち
  assert.equal(R.pressure(K("ooooo", "oooo")), "lose");          // 後攻: はずしたら まけ
  assert.equal(R.pressure(K("oooox", "oooo")), "win");           // 後攻: きめたら かち
  assert.equal(R.pressure(K("ooxoox", "oooxo")), "win");         // サドンデス 後攻: きめたら かち
});

test("ランダムな PK せん は かならず おわり、かった ほうが おおく きめて いる", () => {
  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let g = 0; g < 2000; g++) {
    const k = [[], []];
    let st = R.status(k), n = 0;
    while (!st.over && n++ < 200) { k[st.next].push(rnd() < 0.75); st = R.status(k); }
    assert.equal(st.over, true);
    const ga = R.goals(k[0]), gb = R.goals(k[1]);
    assert.ok(st.winner === 0 ? ga > gb || (ga >= gb && k[0].length > 5) : gb > ga || (gb >= ga && k[1].length > 5));
    if (k[0].length > 5) assert.equal(k[0].length, k[1].length);  // サドンデスは おなじ かず けって おわる
    if (!st.sudden) assert.ok(k[0].length <= 5 && k[1].length <= 5);
  }
});
