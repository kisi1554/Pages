/* むしくい しんぶん — むし（ずかん 10しゅ）と その え（SVG を コードで かく） */
(function (root) {
  "use strict";
  // w … でやすさ（おおきい ほど よく でる）
  const BUGS = [
    { id: "aomushi", name: "もぐもぐ あおむし", w: 20, info: "チョウの こども。 はっぱを もりもり たべて、 なんども かわを ぬいで おおきく なるよ。" },
    { id: "shimi", name: "ぎんいろ しみ", w: 14, info: "ほんとうに かみや のりを たべる むし。 ぎんいろで、 さかなみたいに すばやく にげるよ。" },
    { id: "shibanmushi", name: "ちびっこ しばんむし", w: 12, info: "ふるい ほんや たたみに ちいさな あなを あける、 ごまつぶ くらいの こうちゅう。" },
    { id: "chatate", name: "ちゃたてむし", w: 12, info: "しめった かみに はえる カビを たべる ちいさな むし。 1ミリ くらいしか ないよ。" },
    { id: "imomushi", name: "ちゃいろ いもむし", w: 12, info: "ガの こども。 さわると からだを くねっと まげて びっくりさせるよ。" },
    { id: "tentou", name: "てんとうむし", w: 9, info: "はっぱの しるを すう アブラムシを たべて くれる、 はたけの はたらきもの。" },
    { id: "dango", name: "だんごむし", w: 9, info: "さわると まあるく なる。 じつは こんちゅうでは なくて、 エビや カニの なかま。" },
    { id: "katatsumuri", name: "かたつむり", w: 6, info: "あめの ひに げんき。 かいがらは からだの いちぶで、 はずす ことは できないよ。" },
    { id: "minomushi", name: "みのむし", w: 4, info: "はっぱや えだを いとで つなげた「みの」に かくれて くらす ガの こども。" },
    { id: "kin", name: "きんいろ ことばむし", w: 2, info: "ことばが だいすきな まぼろしの むし（この アプリだけの むし）。 めったに あえないよ。" },
  ];

  const eyes = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.1}" r="${r * 0.55}" fill="#222"/>` +
    `<circle cx="${x + r * 2.4}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 2.65}" cy="${y + r * 0.1}" r="${r * 0.55}" fill="#222"/>`;
  const cheek = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2" fill="#ff8fab" opacity=".7"/>`;
  const smile = (x, y) => `<path d="M${x - 4} ${y} q4 4 8 0" stroke="#222" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

  function caterpillar(c1, c2, spots) {
    let s = "";
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 13;
      s += `<circle cx="${x}" cy="40" r="11" fill="${i % 2 ? c2 : c1}" stroke="rgba(0,0,0,.18)"/>`;
      if (spots) s += `<circle cx="${x}" cy="35" r="2.4" fill="${spots}"/>`;
      s += `<path d="M${x - 3} 50 l-1 5 M${x + 3} 50 l1 5" stroke="#555" stroke-width="2" stroke-linecap="round"/>`;
    }
    s += `<path d="M66 22 l-4 -10 M74 22 l4 -10" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle cx="62" cy="12" r="2.5" fill="#333"/><circle cx="78" cy="12" r="2.5" fill="#333"/>`;
    s += `<circle cx="70" cy="32" r="15" fill="${c1}" stroke="rgba(0,0,0,.18)"/>` + eyes(63, 29, 4) + cheek(62, 37) + smile(70, 38);
    return s;
  }

  const ART = {
    aomushi: () => caterpillar("#8bd450", "#6fbf3a", "#fff7"),
    imomushi: () => caterpillar("#c28f5c", "#a8743f", "#ffd8a8"),
    shimi: () => `<path d="M8 40 L22 30 Q50 22 70 30 Q82 36 80 42 Q70 52 50 52 Q30 52 22 48 Z" fill="#ced4da" stroke="#868e96"/>
      <path d="M30 30 v22 M42 27 v25 M54 27 v25" stroke="#adb5bd" stroke-width="1.5"/>
      <path d="M8 40 l-6 -8 M8 40 l-7 0 M8 40 l-6 8" stroke="#868e96" stroke-width="1.5"/>
      <path d="M78 32 q8 -14 16 -18 M78 34 q10 -6 18 -4" stroke="#868e96" stroke-width="1.5" fill="none"/>` + eyes(64, 34, 3.2) + smile(72, 44),
    shibanmushi: () => `<ellipse cx="46" cy="44" rx="24" ry="17" fill="#a0522d" stroke="#6b3a1e"/>
      <path d="M46 28 v33" stroke="#6b3a1e" stroke-width="1.5"/>
      <circle cx="46" cy="24" r="12" fill="#8b4513"/>` + eyes(39, 22, 3.5) + smile(46, 30) +
      `<path d="M24 50 l-8 6 M68 50 l8 6 M26 38 l-9 -2 M66 38 l9 -2" stroke="#6b3a1e" stroke-width="2" stroke-linecap="round"/>
      <path d="M40 13 l-4 -8 M52 13 l4 -8" stroke="#6b3a1e" stroke-width="2" stroke-linecap="round"/>`,
    chatate: () => `<ellipse cx="44" cy="44" rx="18" ry="13" fill="#e9c46a" stroke="#b08a2e"/>
      <ellipse cx="62" cy="34" rx="13" ry="12" fill="#f4d58d" stroke="#b08a2e"/>` + eyes(56, 31, 3.5) + smile(63, 38) +
      `<path d="M58 23 q-6 -16 -16 -18 M66 23 q6 -16 16 -18" stroke="#b08a2e" stroke-width="1.5" fill="none"/>
      <ellipse cx="34" cy="32" rx="16" ry="7" fill="#fff" opacity=".6" transform="rotate(-25 34 32)"/>
      <path d="M34 55 l-5 7 M46 57 l0 7 M56 54 l5 7" stroke="#b08a2e" stroke-width="2" stroke-linecap="round"/>`,
    tentou: () => `<circle cx="48" cy="44" r="22" fill="#e03131" stroke="#a51111"/>
      <path d="M48 22 v44" stroke="#222" stroke-width="2"/>
      <circle cx="38" cy="38" r="4.5" fill="#222"/><circle cx="58" cy="38" r="4.5" fill="#222"/><circle cx="36" cy="54" r="4" fill="#222"/><circle cx="60" cy="54" r="4" fill="#222"/>
      <circle cx="48" cy="20" r="11" fill="#222"/>` + eyes(41, 18, 3.4) +
      `<path d="M43 10 l-5 -7 M53 10 l5 -7" stroke="#222" stroke-width="2" stroke-linecap="round"/>`,
    dango: () => `<path d="M14 54 Q14 24 46 22 Q78 24 78 54 Z" fill="#5c677d" stroke="#343a40"/>
      <path d="M22 54 Q22 32 30 26 M34 54 Q34 28 40 23 M46 54 V22 M58 54 Q58 28 52 23 M70 54 Q70 32 62 26" stroke="#868e96" stroke-width="1.5" fill="none"/>
      <circle cx="78" cy="48" r="9" fill="#495057"/>` + eyes(73, 45, 2.8) +
      `<path d="M84 42 q8 -6 10 -12" stroke="#343a40" stroke-width="1.5" fill="none"/>`,
    katatsumuri: () => `<path d="M8 56 Q30 60 74 56 Q84 52 82 40 L76 30 Q72 50 60 52 Z" fill="#ffd8a8" stroke="#c9905a"/>
      <circle cx="40" cy="36" r="20" fill="#d9480f" stroke="#a33507"/>
      <path d="M40 36 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12" stroke="#ffa94d" stroke-width="2.5" fill="none"/>
      <path d="M78 34 l-2 -16 M84 36 l6 -14" stroke="#c9905a" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="76" cy="17" r="3" fill="#222"/><circle cx="90" cy="21" r="3" fill="#222"/>` + smile(80, 44),
    minomushi: () => `<path d="M48 2 v12" stroke="#795548" stroke-width="2"/>
      <path d="M48 12 Q66 20 64 44 Q60 64 48 66 Q36 64 32 44 Q30 20 48 12 Z" fill="#a1887f" stroke="#6d4c41"/>
      <path d="M36 26 l8 4 M58 24 l-8 6 M34 44 l10 2 M62 42 l-10 4 M40 58 l6 -4 M56 58 l-6 -4" stroke="#6d4c41" stroke-width="2"/>
      <circle cx="48" cy="66" r="8" fill="#3d3d3d"/>` + eyes(43, 65, 2.6),
    kin: () => `<defs><linearGradient id="kg" x1="0" x2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f59f00"/></linearGradient></defs>` +
      caterpillar("url(#kg)", "#fcc419", "#fff") + `<path d="M20 12 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1 z" fill="#fff3bf" stroke="#f59f00"/>`,
  };

  function svg(id, cls) {
    const f = ART[id] || ART.aomushi;
    return `<svg class="${cls || "bug"}" viewBox="0 0 96 70" aria-hidden="true">${f()}</svg>`;
  }
  function pick(rand) {
    const r = (rand || Math.random)() * BUGS.reduce((a, b) => a + b.w, 0);
    let acc = 0;
    for (const b of BUGS) { acc += b.w; if (r < acc) return b.id; }
    return BUGS[0].id;
  }

  const api = { BUGS, svg, pick };
  if (typeof module !== "undefined") module.exports = api;
  else root.MUSHI = api;
})(this);
