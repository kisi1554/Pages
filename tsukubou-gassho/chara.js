/* つくぼうの せみ がっしょう ｜ キャラクター（セミ 5しゅ ＋ ぬけがら）
 *  ここだけ なおせば 見た目・なまえ・せつめいを かえられる。
 *  見わけ マーク（いろを 見なくても わかる）:
 *    つくぼう=ほっぺの ★ / みんみん=まるい めがね / あぶら=ギザギザ はね / くまっち=ふとい まゆ / かなかな=おでこの ほし もよう
 *  svg(id, { blink, sing }) は viewBox 0 0 100 100 の SVG もじれつ を かえす。
 */
(function (root) {
  "use strict";

  const LIST = [
    {
      id: 1, key: "tsukubou", name: "つくぼう", model: "ツクツクボウシ",
      color: "#a9e34b", dark: "#5c940d", mark: "ほっぺに ★",
      voice: "つくつく ぼーし！", season: "なつの おわり（7がつの おわり〜9がつ）", time: "ひる〜ゆうがた",
      size: "ちいさめ（3センチ ぐらい）",
      about: "「おーしん つくつく」と なきはじめて、さいごは「じーっ」と しめる。なつやすみが おわるころ よく きこえる セミ。",
      more: "なきかたを とちゅうで かえる めずらしい セミ。なかまが ないていると まねして なきかえす ことも あるよ。",
      who: "げんき・うたが だいすき。がっしょうの リーダー",
    },
    {
      id: 2, key: "minmin", name: "みんみん", model: "ミンミンゼミ",
      color: "#74c0fc", dark: "#1971c2", mark: "まるい めがね",
      voice: "みーん みんみん", season: "なつ（7がつ〜9がつ）", time: "あさ〜ひる（はれた ひ）",
      size: "おおきめ（3.5センチ ぐらい）",
      about: "からだに みどりと くろの もようが ある。はれた ひに「みーん みんみん」と おおきな こえで なく。",
      more: "なきごえは セミの なかでも とても よく ひびく。きの たかい ところが すき。",
      who: "おおごえ・あかるい",
    },
    {
      id: 3, key: "abura", name: "あぶら", model: "アブラゼミ",
      color: "#c4874f", dark: "#7a4a1d", mark: "ギザギザ はね",
      voice: "じりじりじり", season: "なつ（7がつ〜9がつ）", time: "ひる〜ゆうがた",
      size: "おおきめ（3.5センチ ぐらい）",
      about: "ちゃいろの はねが とくちょう。あぶらで いためものを する おとに にているから「あぶらぜみ」。",
      more: "すきとおらない ちゃいろの はねの セミは、せかいでも めずらしいんだって。",
      who: "のんびり・くいしんぼう",
    },
    {
      id: 4, key: "kuma", name: "くまっち", model: "クマゼミ",
      color: "#343a40", dark: "#fd7e14", mark: "ふとい まゆ",
      voice: "しゃんしゃんしゃん", season: "なつ（7がつ〜8がつ）", time: "あさ（ごぜんちゅう）",
      size: "とても おおきい（4.5センチ ぐらい）",
      about: "にほんで いちばん おおきい なかまの セミ。くろい からだに すきとおった はね。あさに「しゃんしゃん」と にぎやかに なく。",
      more: "にしの ほうに おおい セミ だったけど、さいきんは かんとうでも きこえるように なってきたよ。",
      who: "ちからもち",
    },
    {
      id: 5, key: "kana", name: "かなかな", model: "ヒグラシ",
      color: "#9775fa", dark: "#5f3dc4", mark: "おでこに ほしの もよう",
      voice: "かなかなかな", season: "なつ（6がつの おわり〜9がつ）", time: "ゆうがた・あさ はやく",
      size: "ふつう（3センチ ぐらい）",
      about: "ゆうがたや あさ はやく、すこし くらい ときに「かなかなかな」と すずしい こえで なく。",
      more: "「ひぐらし」は「ひを くらす（いちにちが おわる）」ころに なくから ついた なまえ と いわれるよ。",
      who: "しずか・ゆうがたに あらわれる",
    },
  ];
  const GARBAGE = { id: 9, key: "nukegara", name: "ぬけがら", color: "#adb5bd", dark: "#495057",
    about: "セミが おとなに なるときに ぬいだ から。となりで セミが とびたつと いっしょに きえる。" };
  const BY = {};
  LIST.forEach((c) => { BY[c.id] = c; });
  BY[9] = GARBAGE;

  /* ---------- 絵 ---------- */
  function star(cx, cy, r, fill, stroke) {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }
  function wings(id, sing) {
    const s = sing ? 1 : 0; // うたうと はねを ひろげる
    const rotL = sing ? -38 : -18, rotR = -rotL;
    let shapeL;
    let fill = "rgba(230,248,255,.85)", stroke = "#7fa7c0", veins = true;
    if (id === 3) { // あぶら: ちゃいろ・ギザギザ
      fill = "#9c6430"; stroke = "#5a3410"; veins = false;
      shapeL = "M50 50 L20 30 L14 40 L8 44 L10 52 L4 58 L12 62 L10 70 L22 68 L30 62 Z";
    } else if (id === 4) { // くまっち: おおきく ながい
      shapeL = "M50 50 Q22 18 4 34 Q0 54 12 66 Q30 70 50 56 Z";
    } else if (id === 5) { // かなかな: ほそながい
      fill = "rgba(235,228,255,.85)"; stroke = "#8d7bc7";
      shapeL = "M50 50 Q26 26 8 40 Q8 52 20 58 Q36 60 50 55 Z";
    } else if (id === 2) { // みんみん: ひろい
      shapeL = "M50 50 Q24 20 8 36 Q4 56 18 64 Q34 66 50 56 Z";
    } else { // つくぼう: まるい ちいさめ
      fill = "rgba(236,255,220,.88)"; stroke = "#82b04a";
      shapeL = "M50 50 Q28 26 14 40 Q10 56 24 62 Q38 62 50 56 Z";
    }
    const v = veins ? `<path d="M48 52 Q30 42 14 44 M48 54 Q32 56 18 60" fill="none" stroke="${stroke}" stroke-width="1.4" opacity=".8"/>` : "";
    const one = `<path d="${shapeL}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${v}`;
    return `<g transform="rotate(${rotL} 50 52) translate(0 ${-s * 2})">${one}</g>` +
           `<g transform="translate(100 0) scale(-1 1) rotate(${rotL} 50 52) translate(0 ${-s * 2})">${one}</g>`;
    // rotR は 左右反転で つかう
  }
  function eyes(id, blink, light) {
    const ec = light ? "#fff" : "#2b2b2b";
    const ex = [33, 67], ey = 47;
    let s = "";
    for (const x of ex) {
      if (blink) {
        s += `<path d="M${x - 7} ${ey} Q${x} ${ey + 6} ${x + 7} ${ey}" fill="none" stroke="${ec}" stroke-width="3.4" stroke-linecap="round"/>`;
      } else {
        s += `<circle cx="${x}" cy="${ey}" r="7.5" fill="${ec}"/>` +
             `<circle cx="${x + 2.6}" cy="${ey - 2.8}" r="2.6" fill="${light ? "#343a40" : "#fff"}"/>`;
      }
    }
    return s;
  }
  function mouth(sing, col) {
    return sing
      ? `<ellipse cx="50" cy="66" rx="6" ry="7" fill="#c92a2a" stroke="${col}" stroke-width="2"/><ellipse cx="50" cy="69" rx="3.5" ry="2.6" fill="#ff8787"/>`
      : `<path d="M43 63 Q50 70 57 63" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
  }

  function svg(id, o) {
    o = o || {};
    const blink = !!o.blink, sing = !!o.sing;
    if (id === 9) return nukegara();
    const c = BY[id] || LIST[0];
    let face = c.color, ink = "#2b2b2b", marks = "", extra = "";
    if (id === 1) { // ★ ほっぺ
      marks = star(22, 62, 8.5, "#ffd43b", "#e67700") + star(78, 62, 8.5, "#ffd43b", "#e67700");
    } else if (id === 2) { // まるい めがね
      marks = `<g fill="rgba(255,255,255,.35)" stroke="#1c3d5a" stroke-width="3.6"><circle cx="33" cy="47" r="12"/><circle cx="67" cy="47" r="12"/></g>` +
              `<path d="M45 46 Q50 42 55 46" fill="none" stroke="#1c3d5a" stroke-width="3.6"/>`;
    } else if (id === 3) { // ちゃいろ: ほっぺ まる（ギザギザ はねが しるし）
      marks = `<circle cx="22" cy="62" r="5" fill="#e8a87c" opacity=".8"/><circle cx="78" cy="62" r="5" fill="#e8a87c" opacity=".8"/>`;
    } else if (id === 4) { // くろ＋オレンジ・ふとい まゆ
      ink = "#fff";
      extra = `<path d="M24 64 Q50 86 76 64 Q74 80 50 84 Q26 80 24 64Z" fill="#fd7e14"/>`;
      marks = `<path d="M21 33 L44 37" stroke="#fd7e14" stroke-width="8" stroke-linecap="round"/>` +
              `<path d="M79 33 L56 37" stroke="#fd7e14" stroke-width="8" stroke-linecap="round"/>`;
    } else if (id === 5) { // おでこの ほし もよう（ちいさな きらきら 3つ）
      const sp = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="#fff"/>`;
      marks = sp(50, 31, 6) + sp(39, 34, 3.6) + sp(61, 34, 3.6) +
              `<circle cx="22" cy="62" r="4.5" fill="#e5dbff" opacity=".8"/><circle cx="78" cy="62" r="4.5" fill="#e5dbff" opacity=".8"/>`;
    }
    const note = sing ? `<text x="86" y="22" font-size="22" font-weight="700" fill="${c.dark}" font-family="sans-serif">♪</text>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      wings(id, sing) +
      `<circle cx="50" cy="55" r="33" fill="${face}" stroke="${id === 4 ? "#000" : c.dark}" stroke-width="3"/>` +
      extra +
      `<ellipse cx="40" cy="38" rx="9" ry="5" fill="#fff" opacity="${id === 4 ? 0.18 : 0.35}"/>` +
      eyes(id, blink, id === 4) + marks + mouth(sing, ink) + note +
      `</svg>`;
  }

  function nukegara() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<path d="M50 14 Q80 16 84 46 Q88 74 70 86 L30 86 Q12 74 16 46 Q20 16 50 14Z" fill="#ced4da" stroke="#495057" stroke-width="3"/>` +
      `<path d="M50 16 L44 30 L54 40 L44 52 L52 62" fill="none" stroke="#495057" stroke-width="3" stroke-linejoin="round"/>` +
      `<g stroke="#868e96" stroke-width="3" stroke-linecap="round"><path d="M24 70 L12 80"/><path d="M76 70 L88 80"/><path d="M22 54 L10 58"/><path d="M78 54 L90 58"/></g>` +
      `<circle cx="34" cy="36" r="6" fill="#868e96"/><circle cx="66" cy="36" r="6" fill="#868e96"/>` +
      `<path d="M30 72 Q50 64 70 72" fill="none" stroke="#adb5bd" stroke-width="3"/>` +
      `</svg>`;
  }

  // たいとる・ずかん 用: えだに とまって うたう つくぼう
  function hero() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140">` +
      `<path d="M0 118 Q60 104 120 112 T200 100" stroke="#8a5a2b" stroke-width="14" fill="none" stroke-linecap="round"/>` +
      `<path d="M150 104 Q162 86 178 84" stroke="#8a5a2b" stroke-width="6" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="180" cy="80" rx="12" ry="6" fill="#69db7c" transform="rotate(-20 180 80)"/>` +
      `<g transform="translate(46 8) scale(1.0)">` + svg(1, { sing: true }).replace(/^<svg[^>]*>|<\/svg>$/g, "") + `</g>` +
      `<text x="150" y="38" font-size="26" fill="#2b8a3e" font-family="sans-serif">♪</text>` +
      `<text x="22" y="30" font-size="18" fill="#2b8a3e" font-family="sans-serif">♫</text>` +
      `</svg>`;
  }

  function dataUrl(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }

  const api = { LIST, GARBAGE, BY, svg, hero, dataUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TG = root.TG || {};
  root.TG.Chara = api;
})(typeof window !== "undefined" ? window : globalThis);
