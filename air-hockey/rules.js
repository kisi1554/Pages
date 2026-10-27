// エアホッケー — とくてん と かちまけ
(function (root) {
  "use strict";
  const TARGETS = [3, 5, 7, 10];

  function createMatch(target, first) {
    const t = TARGETS.includes(target) ? target : 7;
    return { target: t, score: [0, 0], winner: -1, serve: first === 1 ? 1 : 0, goals: [] };
  }
  // scorer が 1てん。いれられた がわ から さいかい。target てん に とどいたら かち
  function goal(m, scorer) {
    if (m.winner >= 0 || (scorer !== 0 && scorer !== 1)) return m;
    m.score[scorer]++;
    m.goals.push(scorer);
    m.serve = 1 - scorer;
    if (m.score[scorer] >= m.target) m.winner = scorer;
    return m;
  }

  const api = { TARGETS, createMatch, goal };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AHRules = api;
})(this);
