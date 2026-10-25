// PK たいけつ — 8つの チーム（じつざいの クラブ・だいひょう・せんしゅ では ない）
// kuse … CPU キッカーの コースの かたより（col: ひだり・まんなか・みぎ、row: うえ・まんなか・した の おもみ）
// size … キーパーの からだの おおきさ（て の とどく はんい に きく）
(function (root) {
  "use strict";
  const T = (id, name, emoji, head, shirt, shorts, kuse, size, word) => ({ id, name, emoji, head, shirt, shorts, kuse, size, word });
  const TEAMS = [
    T("animal", "どうぶつ", "🐻", "bear", "#f08c00", "#5c3d1e", { col: [1, 0.6, 1.6], row: [0.8, 1, 1.4] }, 1.0, "みぎした が すき"),
    T("train", "でんしゃ", "🚃", "train", "#1c7ed6", "#f8f9fa", { col: [1.1, 1.2, 1.1], row: [1.3, 1, 0.9] }, 1.02, "まっすぐ つよい シュート"),
    T("dino", "きょうりゅう", "🦖", "dino", "#2f9e44", "#1b3a22", { col: [1.3, 0.5, 1.2], row: [1.4, 0.9, 0.9] }, 1.08, "たかい ところ が すき"),
    T("sweets", "おかし", "🍰", "sweets", "#f783ac", "#ffffff", { col: [1.7, 0.6, 0.9], row: [0.9, 1, 1.3] }, 0.94, "ひだり が すき"),
    T("space", "うちゅう", "🚀", "space", "#5f3dc4", "#212529", { col: [1, 1, 1], row: [1, 1, 1] }, 1.0, "どこに くるか わからない"),
    T("sea", "うみ", "🐬", "sea", "#15aabf", "#0b4f6c", { col: [1.1, 0.7, 1.1], row: [0.6, 0.9, 1.6] }, 0.98, "ひくい ゴロ が すき"),
    T("bug", "むし", "🐞", "bug", "#e03131", "#212529", { col: [1.5, 0.3, 1.5], row: [1.2, 0.7, 1.2] }, 0.96, "すみっこ を ねらう"),
    T("robot", "ロボット", "🤖", "robot", "#868e96", "#343a40", { col: [0.9, 1.6, 0.9], row: [1, 1.2, 1] }, 1.05, "まんなか に ドーン"),
  ];
  // えらべる ユニフォームの いろ
  const COLORS = ["#f08c00", "#1c7ed6", "#2f9e44", "#f783ac", "#5f3dc4", "#15aabf", "#e03131", "#868e96", "#fab005", "#212529", "#ffffff", "#8d5a32"];
  const api = { TEAMS, COLORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PKTeams = api;
})(this);
