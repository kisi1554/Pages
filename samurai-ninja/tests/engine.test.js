// node --test samurai-ninja/tests/*.test.js
// 3すくみ の きまりが ちゃんと はたらくか たしかめる
const { test } = require("node:test");
const assert = require("node:assert/strict");
const SN = require("../engine.js");

function run(m, frames, in0, in1) {
  for (let i = 0; i < frames && !m.over; i++) {
    SN.step(m, [typeof in0 === "function" ? in0(i) : in0 || {}, typeof in1 === "function" ? in1(i) : in1 || {}]);
  }
}
const mash = (i) => (i % 4 < 2 ? { a: true } : {});
function close(m, d) { m.fighters[0].x = 600; m.fighters[1].x = 600 + d; }

test("かまえ は くない の れんげき を ぜんぶ とめる（ダメージ 0）", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 90);
  run(m, 5, { b: true }, {});           // さきに かまえる（はじき返し の じかんは すぎる）
  run(m, 15, { b: true }, {});
  run(m, 80, { b: true }, mash);
  assert.equal(m.fighters[0].hp, 100);
  assert.ok(m.fighters[0].gp < 100, "かまえ ゲージは へる");
});

test("かまえ を おした ちょくご なら はじき返し（あいては よろける）", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 90);
  run(m, 2, {}, { a: true });            // にんじゃ が くない を だす
  let parried = false;
  for (let i = 0; i < 10 && !parried; i++) {
    SN.step(m, [{ b: true }, {}]);
    parried = m.events.some((e) => e.t === "parry");
  }
  assert.ok(parried);
  assert.equal(m.fighters[1].st, "stun");
});

test("しゅりけん は かまえ を けずって くずす", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 400);
  run(m, 20, { b: true }, {});
  let broke = false;
  for (let i = 0; i < 600 && !broke; i++) {
    SN.step(m, [{ b: true }, i % 30 === 0 ? { b: true } : {}]);
    broke = m.events.some((e) => e.t === "break");
  }
  assert.ok(broke, "かまえが くずれる");
  assert.ok(m.fighters[0].hp < 100, "すこし けずれる");
});

test("いあい は ジャンプちゅう の あいてに 1.3ばい", () => {
  const dmg = (air) => {
    const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
    close(m, 200);
    m.fighters[0].sp = 100;
    let hit = null;
    for (let i = 0; i < 80 && !hit; i++) {
      const in0 = i === 0 ? { s: true } : i < 20 ? { s: true } : {};
      const in1 = air && i === 16 ? { j: true } : {};
      SN.step(m, [in0, in1]);
      hit = m.events.find((e) => e.t === "hit" && e.iai);
    }
    return hit && hit.dmg;
  };
  const g = dmg(false), a = dmg(true);
  assert.ok(g > 0 && a > 0, `${g} ${a}`);
  assert.ok(Math.abs(a / g - 1.3) < 0.01, `${g} → ${a}`);
});

test("かわりみ: いあい を まるた で うけて、うしろに まわる", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 200);
  m.fighters[0].sp = 100; m.fighters[1].sp = 100;
  let doron = false;
  for (let i = 0; i < 80 && !doron; i++) {
    SN.step(m, [i < 18 ? { s: true } : {}, i === 12 ? { s: true } : {}]);
    doron = m.events.some((e) => e.t === "doron");
  }
  assert.ok(doron);
  const [s, n] = m.fighters;
  assert.equal(n.hp, n.C.hp, "にんじゃ は ダメージ なし");
  assert.ok((n.x - s.x) * s.face < 0, "さむらい の うしろに いる");
  assert.equal(m.logs.length, 1, "まるた が のこる");
});

test("うしろ から の こうげきは かまえ で とめられない", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 90);
  run(m, 20, { b: true }, {});
  m.fighters[1].x = 520; // さむらい の うしろ
  run(m, 20, { b: true }, mash);
  assert.ok(m.fighters[0].hp < 100);
});

test("れんぞくで あたっても、たちなおる あいだは むてき（はめ が つづかない）", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 80);
  let inv = false;
  for (let i = 0; i < 300 && !inv; i++) {
    SN.step(m, [{}, mash(i)]);
    m.fighters[1].x = m.fighters[0].x + 80;
    inv = m.fighters[0].inv > 0;
  }
  assert.ok(inv);
});

test("たいりょく 0 で しょうぶ あり（ひざを つく）", () => {
  const m = SN.createMatch({ p1: "samurai", p2: "ninja" });
  close(m, 100);
  m.fighters[1].hp = 3;
  run(m, 60, mash, {});
  assert.ok(m.over);
  assert.equal(m.winner, 0);
  assert.equal(m.fighters[1].st, "ko");
});
