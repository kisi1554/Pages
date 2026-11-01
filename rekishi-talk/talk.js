'use strict';

/*
 * おしゃべりの しくみ（DOM なし。tools/rekishi-talk/test.js で ためせる）
 *
 *   Talk.prepare(PEOPLE)            … キーワードを ととのえる（さいしょに 1かい）
 *   Talk.reply(person, text, mem)   → { id, text, chips }
 *   Talk.reply(person, '', mem, id) → チップを おした とき（id で こたえる）
 *   Talk.chips(person, mem)         → つぎに きけそうな しつもん 3つ
 *   Talk.ruby(s) / Talk.plain(s)    … [漢字|かんじ] を <ruby> に ／ よみあげ よう に よみだけ
 *
 * - こたえは ぜんぶ people.js に かいた もの だけ（つくりばなし を しない）。
 * - しつもんの なかの キーワードの うち、いちばん ながく あった わだいを えらぶ。
 * - ほかの じんぶつの なまえが あれば、その ひとの ことを はなす（いきた じだいの まえ・あと も けいさん）。
 */
const Talk = (() => {
  // みんなに きける わだい（じんぶつ ごとに こたえが ちがう）
  const COMMON = {
    who: { q: 'あなたは だれ？', k: ['だれ', 'なにもの', 'なにした', 'なにをした', 'しょうかい', 'どんなひと', 'なにでゆうめい', 'あなただれ', '誰', '何者'] },
    work: { q: 'いちばんの しごとは？', k: ['しごと', 'やったこと', 'なしとげ', 'こうせき', 'すごいこと', 'てがら', 'じまん', 'がんばったこと', 'はつめい', 'はっけん', 'つくったもの', 'なにをつくった', '仕事', '功績'] },
    child: { q: 'こどもの ころは？', k: ['こども', 'ちいさいころ', 'おさない', 'しょうねん', 'しょうじょ', 'がっこう', 'べんきょう', 'わかいころ', '子供', '子ども', '小さい'] },
    food: { q: 'すきな たべものは？', k: ['たべもの', 'たべる', 'ごはん', 'すきなもの', 'おやつ', 'りょうり', 'のみもの', 'ごちそう', 'おかし', '食べ', '好物'] },
    hobby: { q: 'しゅみは？', k: ['しゅみ', 'あそび', 'すきなこと', 'たのしみ', 'とくい', 'すき', '趣味', '遊び'] },
    family: { q: 'かぞくは？', k: ['かぞく', 'おかあさん', 'おとうさん', 'ははおや', 'ちちおや', 'きょうだい', 'つまは', 'おくさん', 'おっと', 'こどもはいる', 'むすこ', 'むすめ', 'けっこん', '家族', '母', '父'] },
    friend: { q: 'なかまや ライバルは？', k: ['ともだち', 'なかま', 'らいばる', 'けらい', 'しりあい', 'せんせい', 'てきは', 'かたき', '友達', '仲間'] },
    hard: { q: 'たいへんだった ことは？', k: ['たいへん', 'くろう', 'つらい', 'かなしい', 'しっぱい', 'こまった', 'ぴんち', 'くるしい', 'こわかった', '苦労', '失敗'] },
    words: { q: 'だいじに した ことばは？', k: ['ことば', 'すきなことば', 'めいげん', 'くちぐせ', 'もっとー', 'ざゆうのめい', '名言', '言葉'] },
    life: { q: 'その じだいの くらしは？', k: ['じだい', 'くらし', 'すんでいたいえ', 'どんないえ', 'ようふく', 'ふくそう', 'きもの', 'むかし', 'せいかつ', '時代', '暮らし', '生活'] },
    end: { q: 'さいごは どうなったの？', k: ['さいご', 'しんだ', 'なくなった', 'しぬ', 'なんさいまで', 'いくつまで', '死', '最後', '亡くな'] },
    future: { q: 'わたしたちに ひとこと！', k: ['ひとこと', 'みらい', 'あどばいす', 'おうえん', 'めっせーじ', 'わたしたち', 'ぼくたち', 'どうしたら', 'こつ', '未来'] },
    modern: { q: 'スマホって しってる？', k: ['すまほ', 'げーむ', 'てれび', 'でんしゃ', 'ひこうき', 'くるま', 'いんたーねっと', 'ねっと', 'ろぼっと', 'ぱそこん', 'こんびに', 'ゆーちゅーぶ', 'でんわ', 'しんかんせん', 'いまのにほん', 'げんだい', '現代', '電車', '飛行機'] },
    real: { q: 'ほんものなの？', k: ['ほんもの', 'うそ', 'にせもの', 'ほんとうに', 'ゆうれい', 'いきてる', 'なりきり', 'えーあい', '本物'] },
  };
  // あいさつ・とし（こたえは じんぶつの hi / thanks / bye / ageLine）
  const SMALL = {
    hi: ['こんにちは', 'こんばんは', 'おはよう', 'はじめまして', 'はろー', 'やっほー'],
    thanks: ['ありがとう', 'さんきゅー', 'かんしゃ'],
    bye: ['さようなら', 'さよなら', 'ばいばい', 'またね', 'じゃあね'],
    age: ['なんさい', 'いくつ', 'としは', 'いつうまれ', 'うまれたのはいつ', 'いつのひと', 'なんねんまえ', 'なんねん', '何歳', '年齢'],
  };
  const CORE = ['who', 'work', 'child', 'food', 'hobby', 'family', 'friend', 'hard', 'words', 'life', 'end', 'future', 'modern'];

  // ひらがなに そろえて、くうはく・きごうを とる
  function norm(s) {
    return String(s || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s、。！？!?「」『』（）()・…,.〜~－\-]/g, '');
  }

  function keyList(list) {
    return list.map(norm).filter(Boolean);
  }

  let all = [];

  function prepare(people) {
    all = people;
    people.forEach((p) => {
      p._aka = keyList(p.aka || []);
      p._topics = [];
      (p.special || []).forEach((t) => p._topics.push({ id: t.id, q: t.q, keys: keyList(t.k || []), a: [].concat(t.a) }));
      Object.keys(COMMON).forEach((id) => {
        if (!p[id]) return;
        p._topics.push({ id, q: COMMON[id].q, keys: keyList(COMMON[id].k), a: [].concat(p[id]) });
      });
      Object.keys(SMALL).forEach((id) => p._topics.push({ id, small: true, keys: keyList(SMALL[id]) }));
    });
    return people;
  }

  function byId(id) {
    return all.find((p) => p.id === id);
  }

  function topicOf(person, id) {
    return person._topics.find((t) => t.id === id);
  }

  // いちばん ながく あった なまえ の ひと
  function mention(person, n) {
    let best = null;
    let len = 0;
    all.forEach((o) => {
      o._aka.forEach((k) => {
        if (k.length > len && n.includes(k)) {
          best = o;
          len = k.length;
        }
      });
    });
    return best;
  }

  function strip(person, n) {
    let s = n;
    person._aka.slice().sort((a, b) => b.length - a.length).forEach((k) => {
      s = s.split(k).join('');
    });
    return s;
  }

  function pick(list, mem, key) {
    const used = mem.used || (mem.used = {});
    const i = used[key] || 0;
    used[key] = i + 1;
    return list[i % list.length];
  }

  function fill(s, person, year) {
    const y = year || new Date().getFullYear();
    return s
      .replace(/\{bornAgo\}/g, String(y - (person.born || person.died)))
      .replace(/\{diedAgo\}/g, String(y - person.died));
  }

  // ほかの ひとの こと
  function about(person, other, mem) {
    if (person.know && person.know[other.id]) return pick([].concat(person.know[other.id]), mem, 'know:' + other.id);
    const oBorn = other.born || other.died - 40;
    const pBorn = person.born || person.died - 40;
    let tpl;
    let gap;
    if (oBorn > person.died) {
      tpl = person.later;
      gap = oBorn - person.died;
    } else if (other.died < pBorn) {
      tpl = person.earlier;
      gap = pBorn - other.died;
    } else {
      tpl = person.same;
      gap = 0;
    }
    const step = gap >= 100 ? 100 : 10;
    const round = Math.max(step, Math.round(gap / step) * step);
    return tpl.replace(/\{name\}/g, other.name).replace(/\{gap\}/g, String(round));
  }

  function answer(person, id, mem, year) {
    if (id.startsWith('know:')) {
      const other = byId(id.slice(5));
      return other ? about(person, other, mem) : null;
    }
    const t = topicOf(person, id);
    if (!t) return null;
    if (t.small) {
      if (id === 'age') return fill(person.ageLine, person, year);
      return pick([].concat(person[id] || person.hello), mem, id);
    }
    return pick(t.a, mem, id);
  }

  // つぎに きけそうな しつもん（まだ きいて いない もの から）
  function chips(person, mem, n) {
    const asked = mem.asked || {};
    const out = [];
    const sp = person._topics.filter((t) => !t.small && !CORE.includes(t.id) && t.id !== 'real');
    const core = CORE.map((id) => topicOf(person, id)).filter(Boolean);
    const add = (t) => {
      if (t && !asked[t.id] && !out.some((c) => c.id === t.id)) out.push({ id: t.id, q: t.q });
    };
    add(core.find((t) => !asked[t.id]));
    add(sp.find((t) => !asked[t.id]));
    const knows = Object.keys(person.know || {}).filter((id) => !asked['know:' + id]);
    if (knows.length && out.length < (n || 3)) {
      const o = byId(knows[0]);
      if (o) out.push({ id: 'know:' + o.id, q: o.short + 'を しってる？' });
    }
    core.concat(sp).forEach((t) => {
      if (out.length < (n || 3)) add(t);
    });
    if (!out.length) out.push({ id: 'who', q: COMMON.who.q }, { id: 'future', q: COMMON.future.q });
    return out.slice(0, n || 3);
  }

  function reply(person, text, mem, forced, year) {
    mem.asked = mem.asked || {};
    let id = forced || null;
    if (!id) {
      const n = norm(text);
      const rest = strip(person, n);
      const other = mention(person, rest);
      let best = null;
      let len = 0;
      person._topics.forEach((t) => {
        t.keys.forEach((k) => {
          if (k.length > len && rest.includes(k)) {
            best = t;
            len = k.length;
          }
        });
      });
      if (other && other !== person) id = 'know:' + other.id;
      else if (best) id = best.id;
      else if (rest.length === 0 && n.length) id = 'who'; // なまえ だけ よばれた
    }
    let out = id ? answer(person, id, mem, year) : null;
    if (!out) {
      id = 'dunno';
      out = pick(person.dunno, mem, 'dunno');
    }
    mem.asked[id] = (mem.asked[id] || 0) + 1;
    return { id, text: out, chips: chips(person, mem) };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function ruby(s) {
    return esc(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
  }
  function plain(s) {
    return String(s).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2');
  }

  return { COMMON, SMALL, CORE, norm, prepare, reply, chips, answer, ruby, plain, esc, byId };
})();

if (typeof module !== 'undefined') module.exports = Talk;
