/* かんがえる ボードゲーム — CPU の けいさん を べつ の スレッド で（がめん が かたまらない ように） */
var V = self.location.search || "";
importScripts("games/reversi.js" + V, "games/gomoku.js" + V, "games/marubatsu.js" + V, "games/yonnarabe.js" + V, "games/hakotori.js" + V, "ai.js" + V);
self.onmessage = function (e) {
  var d = e.data, G = self.BD.games[d.game], AI = self.BD.ai;
  try {
    if (d.type === "move") {
      self.postMessage({ id: d.id, move: AI.chooseMove(G, d.state, d.level, AI.rng(d.seed), d.opt || {}) });
    } else if (d.type === "hint") {
      self.postMessage({ id: d.id, hint: AI.bestMoves(G, d.state, d.timeMs) });
    } else if (d.type === "value") {
      self.postMessage({ id: d.id, value: AI.valueOf(G, d.state, d.timeMs) });
    }
  } catch (err) {
    self.postMessage({ id: d.id, error: String(err && err.message || err) });
  }
};
