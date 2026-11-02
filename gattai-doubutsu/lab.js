/* がったい どうぶつ ラボ — けいさん（DOM なし）
 *  - パーツ → のうりょく（おもさ ペナルティ つき）
 *  - コース（3くぎり）→ くぎり ごとに いちばん たかい のうりょくで すすむ → タイム
 *    はやさ = 1 + のうりょく（0〜5）なので、のうりょく 0 でも かならず すすむ（ぜったい ゴール できる）
 *  - なまえ・おだい
 */
(function (root) {
  "use strict";
  const Parts = (typeof module !== "undefined" && module.exports) ? require("./parts.js") : root.GDParts;
  const { SPECIES, SLOTS } = Parts;

  const ABS = ["run", "swim", "fly", "climb", "tough"];
  const AB_NAME = { run: "はしる", swim: "およぐ", fly: "とぶ", climb: "のぼる", tough: "たえる" };
  const AB_ICON = { run: "🏃", swim: "🏊", fly: "🪽", climb: "🧗", tough: "🛡️" };
  const TRAITS = ["hot", "cold", "night", "nose", "jump", "dig"];
  const TR_NAME = { hot: "あつさに つよい", cold: "さむさに つよい", night: "くらくても わかる", nose: "はなが いい", jump: "はねる", dig: "ほれる" };
  const TR_ICON = { hot: "🔥", cold: "❄️", night: "🌙", nose: "👃", jump: "🦘", dig: "⛏️" };
  const MAX = 5;
  const SEG_LEN = 10;

  /* ばしょ。cand(s) は [{ v, by, mul }]。by は のうりょく か とくせい */
  const TERRAINS = {
    field: { name: "のはら", icon: "🌼", desc: "はしる・はねる が やくだつ" },
    sea: { name: "うみ", icon: "🌊", desc: "およぐ が やくだつ（とぶ も すこし）" },
    sky: { name: "そら（おおきな たに）", short: "そら", icon: "☁️", desc: "とぶ が やくだつ（はねる も すこし）" },
    mountain: { name: "やま（がけ）", short: "やま", icon: "⛰️", desc: "のぼる が やくだつ（とぶ・ほる も）" },
    desert: { name: "さばく", icon: "🏜️", desc: "はしる・たえる。あつさに つよいと はやい" },
    ice: { name: "こおりの くに", short: "こおり", icon: "🧊", desc: "はしる・およぐ・たえる。さむさに つよいと はやい" },
    night: { name: "よるの もり", short: "よる", icon: "🌙", desc: "はしる・のぼる。くらくても わかると はやい" }
  };
  const TERRAIN_KEYS = Object.keys(TERRAINS);

  function candidates(t, s) {
    const a = s.ab, tr = s.tr;
    const c = [];
    const add = (v, by, how, mul) => c.push({ v: Math.max(0, Math.min(MAX, v)), by, how, mul: mul || null });
    switch (t) {
      case "field":
        add(a.run, "run", "はしる");
        if (tr.jump) add(a.run + 1.5, "jump", "ぴょんぴょん はねる");
        add(a.climb * 0.4, "climb", "よじよじ すすむ");
        add(a.swim * 0.3, "swim", "くさの うみを およぐ？");
        break;
      case "sea":
        add(a.swim, "swim", "およぐ");
        add(a.fly * 0.6, "fly", "うみの うえを とぶ");
        break;
      case "sky":
        add(a.fly, "fly", "とぶ");
        if (tr.jump) add(1.5 + a.run * 0.3, "jump", "ジャンプで とびこえる");
        add(a.climb * 0.5, "climb", "がけを つたって わたる");
        break;
      case "mountain":
        add(a.climb, "climb", "のぼる");
        add(a.fly * 0.8, "fly", "とんで こえる");
        if (tr.dig) add(3, "dig", "トンネルを ほる");
        add(a.run * 0.3, "run", "はしって のぼる");
        break;
      case "desert": {
        const m = tr.hot ? 1 : 0.4;
        add(a.run * m, "run", "すなの うえを はしる", tr.hot ? "hot" : null);
        add(a.tough * m, "tough", "あつさに まけず あるく", tr.hot ? "hot" : null);
        add(a.fly * 0.6, "fly", "さばくの うえを とぶ");
        break;
      }
      case "ice": {
        const m = tr.cold ? 1 : 0.4;
        add(a.run * m, "run", "こおりの うえを はしる", tr.cold ? "cold" : null);
        add(a.swim * m, "swim", "つめたい うみを およぐ", tr.cold ? "cold" : null);
        add(a.tough * m, "tough", "さむさに まけず あるく", tr.cold ? "cold" : null);
        add(a.fly * 0.5, "fly", "ふぶきの なかを とぶ");
        break;
      }
      case "night": {
        const k = tr.night ? "night" : tr.nose ? "nose" : null;
        const m = k ? 1 : 0.4;
        add(a.run * m, "run", "くらい もりを はしる", k);
        add(a.climb * m, "climb", "きから きへ わたる", k);
        add(a.fly * m * 0.8, "fly", "くらい そらを とぶ", k);
        break;
      }
    }
    return c;
  }

  /* combo（{head,body,legs,tail} の ばんごう）→ のうりょく */
  function stats(combo) {
    const raw = { run: 0, swim: 0, fly: 0, climb: 0, tough: 0 };
    const tr = {}, trBy = {};
    let w = 0;
    for (const slot of SLOTS) {
      const p = SPECIES[combo[slot]][slot];
      for (const k in p.ab) raw[k] += p.ab[k];
      for (const t of p.tr || []) { tr[t] = true; if (!trBy[t]) trBy[t] = slot; }
      w += p.w || 0;
    }
    const ab = {
      run: raw.run - Math.max(0, w - 8) * 0.4,
      swim: raw.swim,
      fly: raw.fly - Math.max(0, w - 3) * 0.7,
      climb: raw.climb - Math.max(0, w - 5) * 0.5,
      tough: raw.tough
    };
    for (const k of ABS) ab[k] = Math.max(0, Math.min(MAX, Math.round(ab[k] * 10) / 10));
    if (combo.legs === SPECIES.findIndex((s) => s.id === "snake")) ab.run = Math.max(ab.run, 1); // くねくね すすむ
    return { ab, raw, tr, trBy, w };
  }

  /* どの ぶいの おかげ？ — その のうりょくを いちばん たくさん くれた ぶい */
  function creditSlot(combo, key, s) {
    if (TRAITS.includes(key)) return s.trBy[key];
    let best = null, bv = 0;
    for (const slot of SLOTS) {
      const v = SPECIES[combo[slot]][slot].ab[key] || 0;
      if (v > bv) { bv = v; best = slot; }
    }
    return best;
  }

  function race(combo, course) {
    const s = stats(combo);
    const segs = course.map((t) => {
      const c = candidates(t, s);
      let best = c[0];
      for (const x of c) if (x.v > best.v) best = x;
      const speed = 1 + best.v;
      const time = SEG_LEN / speed;
      // おかげ: とくせい（あつさ など）で はやく なった ときは その ぶい、ふつうは のうりょくの ぶい
      const key = best.mul || best.by;
      const slot = creditSlot(combo, key, s) || creditSlot(combo, best.by, s);
      return { terrain: t, v: best.v, by: best.by, how: best.how, mul: best.mul, speed, time, slot, sp: slot ? combo[slot] : null };
    });
    const total = segs.reduce((a, x) => a + x.time, 0);
    return { segs, total: Math.round(total * 10) / 10, stats: s };
  }

  /* いちばん かつやく した くぎり → まめちしき */
  function highlight(combo, r) {
    let best = null;
    for (const g of r.segs) if (g.slot && (!best || g.v > best.v)) best = g;
    if (!best || best.v < 1) {
      let slow = r.segs[0];
      for (const g of r.segs) if (g.time > slow.time) slow = g;
      const T = TERRAINS[slow.terrain];
      return { seg: null, text: "こんかいは ゆっくりだった。ばしょに あう ぶいを さがして みよう！", tip: `ヒント: ${T.icon} ${T.short || T.name} … ${T.desc}` };
    }
    const sp = SPECIES[best.sp];
    const T = TERRAINS[best.terrain];
    const word = Parts.partName(sp, best.slot);
    return {
      seg: best,
      text: `${T.short || T.name}で はやかった のは ${word} の おかげ！`,
      tip: sp[best.slot].tip
    };
  }

  function name(combo) {
    const ids = SLOTS.map((s) => combo[s]);
    if (ids.every((i) => i === ids[0])) return SPECIES[ids[0]].name;
    return ids.map((i) => SPECIES[i].short).join("");
  }

  /* おだい（goal は ゴールタイム。ぜんぶの くみあわせの うち うえから 6〜15% くらいが クリア できる タイムに した。test.js が とける ことを たしかめる） */
  const ODAI = [
    { id: 1, text: "うみを すいすい わたれる どうぶつを つくって", course: ["sea", "sea", "sea"], goal: 7.5 },
    { id: 2, text: "のはらの かけっこで かてる どうぶつを つくって", course: ["field", "field", "field"], goal: 7.5 },
    { id: 3, text: "たかい やまの がけを のぼれる どうぶつを つくって", course: ["mountain", "mountain", "mountain"], goal: 7 },
    { id: 4, text: "おおきな たにを とびこえられる どうぶつを つくって", course: ["sky", "sky", "sky"], goal: 8.5 },
    { id: 5, text: "あつい さばくを こえられる どうぶつを つくって", course: ["desert", "desert", "desert"], goal: 9 },
    { id: 6, text: "こおりの くにを すすめる どうぶつを つくって", course: ["ice", "ice", "ice"], goal: 8.5 },
    { id: 7, text: "まっくらな よるの もりを ぬけられる どうぶつを つくって", course: ["night", "night", "night"], goal: 10 },
    { id: 8, text: "こおりの うみを わたれる どうぶつを つくって", course: ["ice", "sea", "ice"], goal: 8 },
    { id: 9, text: "さばくの オアシスで ひとおよぎ！", course: ["desert", "sea", "desert"], goal: 9 },
    { id: 10, text: "がけの うえの すまで いこう", course: ["field", "mountain", "sky"], goal: 9 },
    { id: 11, text: "うみを わたって しまへ いこう", course: ["field", "sea", "field"], goal: 8.5 },
    { id: 12, text: "ゆきやまを のぼって おりよう", course: ["ice", "mountain", "ice"], goal: 9 },
    { id: 13, text: "よるの うみを わたろう", course: ["night", "sea", "night"], goal: 9 },
    { id: 14, text: "のはらの まんなかの たにを こえよう", course: ["field", "sky", "field"], goal: 7.5 },
    { id: 15, text: "あつい いわやまを こえよう", course: ["desert", "mountain", "desert"], goal: 8.5 },
    { id: 16, text: "うみから そらへ とびだそう", course: ["sea", "sky", "sky"], goal: 8 },
    { id: 17, text: "よるの がけを のぼろう", course: ["night", "mountain", "night"], goal: 8.5 },
    { id: 18, text: "さばくの たにを とびこえよう", course: ["desert", "sky", "desert"], goal: 8 },
    { id: 19, text: "こおりの たにを わたろう", course: ["ice", "sky", "ice"], goal: 8.5 },
    { id: 20, text: "やまの みずうみを およいで わたろう", course: ["mountain", "sea", "mountain"], goal: 7.5 },
    { id: 21, text: "のはら・さばく・こおりを ぜんぶ はしろう", course: ["field", "desert", "ice"], goal: 9 },
    { id: 22, text: "うみ・やま・そらの だいぼうけん", course: ["sea", "mountain", "sky"], goal: 7.5 },
    { id: 23, text: "よるの もりから さばくへ", course: ["night", "field", "desert"], goal: 9 },
    { id: 24, text: "ほっきょくの うみと こおり", course: ["sea", "ice", "sea"], goal: 6.5 },
    { id: 25, text: "さばくの よる", course: ["desert", "night", "desert"], goal: 8.5 },
    { id: 26, text: "ジャングルの たにと かわ", course: ["night", "sky", "sea"], goal: 8 },
    { id: 27, text: "こおりの やまの てっぺんへ", course: ["ice", "mountain", "sky"], goal: 7.5 },
    { id: 28, text: "あついと さむいを りょうほう こえよう", course: ["desert", "sea", "ice"], goal: 8.5 },
    { id: 29, text: "なんでも できる どうぶつを つくって", course: ["sea", "mountain", "desert"], goal: 8.5 },
    { id: 30, text: "さいごの ちょうせん！ よる・こおり・そら", course: ["night", "ice", "sky"], goal: 8.5 }
  ];

  const api = {
    ABS, AB_NAME, AB_ICON, TRAITS, TR_NAME, TR_ICON, TERRAINS, TERRAIN_KEYS, ODAI, MAX, SEG_LEN,
    stats, race, highlight, name, candidates
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GDLab = api;
})(typeof window !== "undefined" ? window : globalThis);
