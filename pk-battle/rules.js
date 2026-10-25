// PK たいけつ — PK せん の ルール（がめんに かんけい しない じゅんすいな けいさん）
// node でも ブラウザ でも うごく（ブラウザでは window.PKRules）。
//
// kicks[t] … チーム t（0 = 先攻、1 = 後攻）の けっか の ならび（true = はいった、false = はずれ）
// 先攻 → 後攻 → 先攻 … の じゅんに 1本ずつ けるので、いつも kicks[0].length - kicks[1].length は 0 か 1。
(function (root) {
  "use strict";
  const ROUNDS = 5;

  const goals = (arr, n) => arr.slice(0, n === undefined ? arr.length : n).filter(Boolean).length;

  // つぎに ける チーム
  function nextKicker(kicks) { return kicks[0].length > kicks[1].length ? 1 : 0; }

  // いまの じょうたい
  //   { over, winner (0/1/null), sudden (サドンデス ちゅう か), round (いま なんばんめ・1から), next, score: [a, b], reason }
  //   reason: "decided"（5本 の とちゅうで とどかなく なった）/ "five"（5本 で きまった）/ "sudden"（サドンデスで きまった）
  function status(kicks, rounds) {
    const R = rounds || ROUNDS;
    const a = kicks[0], b = kicks[1];
    if (a.length < b.length || a.length > b.length + 1) throw new Error("けった じゅんばんが おかしい");
    const ga = goals(a), gb = goals(b);
    const res = { over: false, winner: null, sudden: false, next: nextKicker(kicks), score: [ga, gb], reason: null, round: 0 };
    if (a.length <= R && b.length <= R) {
      // のこり ぜんぶ いれても とどかない？
      const leftA = R - a.length, leftB = R - b.length;
      if (ga + leftA < gb) return Object.assign(res, { over: true, winner: 1, reason: b.length === R && a.length === R ? "five" : "decided" });
      if (gb + leftB < ga) return Object.assign(res, { over: true, winner: 0, reason: b.length === R && a.length === R ? "five" : "decided" });
      if (a.length === R && b.length === R) {
        // 5本 で どうてん → サドンデスへ
        return Object.assign(res, { sudden: true, round: R + 1 });
      }
      res.round = Math.max(a.length, b.length) + (a.length === b.length ? 1 : 0);
      return res;
    }
    // サドンデス: 1本ずつ。おなじ かず けった ところで ちがえば おわり
    res.sudden = true;
    if (a.length === b.length) {
      const la = a[a.length - 1], lb = b[b.length - 1];
      if (la !== lb) return Object.assign(res, { over: true, winner: la ? 0 : 1, reason: "sudden" });
      res.round = a.length + 1;
    } else res.round = a.length;
    return res;
  }

  // スコアボード（○×）。5本ぶんは あき を「・」で、サドンデスは けった ぶんだけ
  function board(kicks, rounds) {
    const R = rounds || ROUNDS;
    const n = Math.max(R, kicks[0].length, kicks[1].length);
    return [0, 1].map((t) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(i < kicks[t].length ? (kicks[t][i] ? "○" : "×") : (i < R ? "・" : ""));
      return out;
    });
  }

  // 「つぎ きめたら かち」「はずしたら まけ」の ばめん（じっきょう よう）
  function pressure(kicks, rounds) {
    const st = status(kicks, rounds);
    if (st.over) return null;
    const t = st.next;
    const tryKick = (ok) => {
      const k = [kicks[0].slice(), kicks[1].slice()];
      k[t].push(ok);
      return status(k, rounds);
    };
    const yes = tryKick(true), no = tryKick(false);
    if (yes.over && yes.winner === t) return "win";   // きめたら かち
    if (no.over && no.winner !== t) return "lose";    // はずしたら まけ
    return null;
  }

  const api = { ROUNDS, status, nextKicker, board, pressure, goals };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PKRules = api;
})(this);
