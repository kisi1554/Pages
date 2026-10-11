'use strict';

/*
 * おしゃべりの あたま（キーワードで ききたい ことを みわけて、その むしらしく こたえる）
 *  MushiTalk.reply(bug, text) → { text, song?, goto? }
 *  MushiTalk.hello(bug) / MushiTalk.chips(bug, asked)
 *  こたえの なかの {漢字|かんじ} は app.js で ふりがなに なる
 */

const MushiTalk = (function () {
  // カタカナ → ひらがな、くうはく・きごうを とる
  function norm(s) {
    return String(s)
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s、。！？!?・,.　「」]/g, '')
      .toLowerCase();
  }

  const INTENTS = [
    ['bye', /ばいばい|さようなら|さよなら|またね|おやすみ|じゃあね/],
    ['thanks', /ありがと/],
    ['mark', /めじるし|目印|みわけ|見分|ちがい|違い|とくちょう|特徴/],
    ['song', /なきごえ|鳴き|ないて|なくの|なける|うた|歌|こえ|声|きかせ|聞かせ/],
    ['size', /おおきさ|大きさ|おおきい|大きい|ちいさい|小さい|せんち|cm|ながさ|長さ/],
    ['food', /たべ|食べ|ごはん|えさ|すうの|のむ|飲/],
    ['place', /どこ|すんで|住|すみか|いえ|家/],
    ['season', /いつ|なんがつ|何月|きせつ|季節/],
    ['life', /いっしょう|一生|うまれ|生まれ|たまご|卵|ようちゅう|幼虫|こども|子ども|そだ|育|だっぴ|うかし|うかす|羽化|らんのう|ぬけがら/],
    ['body', /目|めは|めが|めって|くち|口|あし|足|はね|羽|かま(?!きり)|鎌|からだ|体|あたま|頭|みみ|耳/],
    ['age', /なんさい|何歳|いくつ|としは|年は|いきる|生きる|じゅみょう|寿命/],
    ['enemy', /(?<!す)てき|敵|こわい|怖|にがて|苦手|きらい|嫌い/],
    ['keep', /かいたい|かっても|かえる\?|かえるの|かえますか|飼|かいかた|つかまえ|捕まえ/],
    ['fly', /とぶ|とべ|飛/],
    ['friend', /ともだち|友達|なかま|仲間|かぞく|家族/],
    ['trivia', /まめちしき|ひみつ|秘密|おしえて|教えて|ほかに|もっと|しってる|知って|なにか/],
    ['like', /すき|好き|しゅみ|趣味|たのしい|とくい|得意/],
    ['name', /なまえ|名前|だれ|あなた|きみ/],
    ['praise', /かっこいい|かわいい|すごい|きれい|すてき|えらい/],
    ['hello', /こんにち|こんばん|おはよ|やあ|はじめまして|もしもし|はろー|よろしく/],
  ];

  const ch = (bug) => CHARAS[bug.id];
  const isSemi = (bug) => bug.group === 'semi';
  const nickOf = (b) => CHARAS[b.id].nick;

  // その むしらしい いいかたに する
  function voice(bug, text) {
    const c = ch(bug);
    let t = text.replace(/\$\{me\}/g, c.me);
    c.rep.forEach(([a, b]) => { t = t.split(a).join(b); });
    return c.tail ? `${t} ${c.tail}` : t;
  }

  function monthsText(m) {
    return m[0] === m[m.length - 1] ? `${m[0]}{月|がつ}` : `${m[0]}〜${m[m.length - 1]}{月|がつ}`;
  }

  // おなじ なかまの なかで いちばん 大きい / 小さい
  function sizeRank(bug) {
    const list = BUGS.filter((b) => b.group === bug.group);
    const max = Math.max(...list.map((b) => b.size[1]));
    const min = Math.min(...list.map((b) => b.size[1]));
    if (bug.size[1] === max) return `${GROUPS.find((g) => g.id === bug.group).name}の なかまで いちばん {大|おお}きいんだよ。`;
    if (bug.size[1] === min) return `なかまの なかでは いちばん {小|ちい}さいんだよ。`;
    return '';
  }

  const counters = {};
  function nextOf(key, arr) {
    counters[key] = ((counters[key] === undefined ? -1 : counters[key]) + 1) % arr.length;
    return arr[counters[key]];
  }

  function answer(bug, intent, raw) {
    const c = ch(bug);
    const L = c.line;
    const g = GROUPS.find((x) => x.id === bug.group);
    const semi = isSemi(bug);
    // キャラの セリフが ある ものは そのまま（くちぐせも セリフの なかに ある）
    if (L[intent] && intent !== 'unknown') return { text: L[intent] };

    switch (intent) {
      case 'thanks':
        return { text: voice(bug, 'どういたしまして！ ほかにも しりたい こと ある？') };
      case 'song':
        if (semi) return { text: voice(bug, `\${me}の なきごえは「${bug.songText}」だよ。きいてね！`), song: bug.song };
        return { text: voice(bug, '${me}は なかないよ。そのかわり、じっと うごかずに えものを まつんだ。') };
      case 'size':
        return { text: voice(bug, `\${me}の {大|おお}きさは、はねの {先|さき}まで ${bug.size[0]}〜${bug.size[1]}センチだよ。${sizeRank(bug)}`) };
      case 'food':
        return {
          text: voice(bug, `\${me}の ごはんは ${bug.food}だよ。` +
            (semi ? 'ストローみたいな {口|くち}を {木|き}に さして すうんだ。' : 'かまで つかまえて、うごく ものしか たべないんだ。')),
        };
      case 'place':
        return { text: voice(bug, `\${me}の すみかは ここ！ ${bug.place}`) };
      case 'season':
        return {
          text: voice(bug, `おとなの \${me}に あえるのは ${monthsText(bug.months)}ごろだよ。` +
            (semi ? '{夏|なつ}の あいだに さがして みてね。' : '{秋|あき}の {草|くさ}むらを さがして みてね。')),
        };
      case 'life':
        return {
          text: voice(bug, semi
            ? '${me}は {木|き}の えだの たまごから うまれて、{土|つち}の {中|なか}で なんねんも くらしたんだ。{夏|なつ}の {夕方|ゆうがた}に {土|つち}から {出|で}て、うかして おとなに なったよ。'
            : '${me}は {春|はる}に らんのうから うまれて、だっぴを なんども くりかえして おとなに なったよ。さなぎには ならないんだ。'),
        };
      case 'age':
        return {
          text: voice(bug, semi
            ? '{土|つち}の {中|なか}で なんねんも くらして、おとなに なってからは 1か{月|げつ}くらい {生|い}きる ことも あるよ。'
            : '{春|はる}に うまれて、{秋|あき}の おわりまで {生|い}きるよ。1{年|ねん}で いっしょうを おえるんだ。'),
        };
      case 'fly':
        return {
          text: voice(bug, semi
            ? 'とべるよ！ おどろくと おしっこを ひっかけて にげる ことも あるんだ。'
            : 'はねが あるから とべるよ。でも、とぶより あるく ほうが とくいなんだ。'),
        };
      case 'friend': {
        const mates = BUGS.filter((b) => b.group === bug.group && b !== bug).map((b) => `${b.name}の ${nickOf(b)}`);
        return { text: voice(bug, `なかまには ${mates.join('、')}が いるよ。はなしかけて みてね！`) };
      }
      case 'body':
        return bodyAnswer(bug, raw);
      case 'trivia':
        return { text: voice(bug, nextOf(bug.id + 'trivia', [bug.trivia].concat(L.more))) };
      case 'hello':
        return { text: L.hello };
      default:
        return { text: L.unknown };
    }

    function bodyAnswer(b, t) {
      if (/かま(?!きり)|鎌/.test(t)) {
        return { text: voice(b, semi ? 'セミには かまは ないよ！ それは カマキリの ぶきだね。' : g.body[0].text) };
      }
      if (/目|めは|めが|めって/.test(t)) return { text: voice(b, g.body[2].text) };
      if (/くち|口/.test(t)) {
        return { text: voice(b, semi ? g.body[0].text : 'じょうぶな あごで、つかまえた {虫|むし}を かじって たべるよ。') };
      }
      if (/みみ|耳/.test(t)) {
        return { text: voice(b, semi ? '{耳|みみ}は おなかに あるよ。なかまの {声|こえ}を ちゃんと きいて いるんだ。' : '{耳|みみ}は むねの {下|した}がわに 1つだけ あるよ。') };
      }
      if (/あたま|頭/.test(t)) {
        return { text: voice(b, semi ? '{頭|あたま}には {大|おお}きな {目|め}が 2つと、{小|ちい}さな {目|め}が 3つ あるよ。' : g.body[1].text) };
      }
      return { text: L.mark };
    }
  }

  // ほかの むしの なまえ・あいしょうが でて きたら しょうかい する
  function otherBug(bug, t) {
    for (const b of BUGS) {
      if (b === bug) continue;
      if (t.includes(norm(b.name)) || t.includes(norm(nickOf(b)))) return b;
    }
    return null;
  }

  function reply(bug, text) {
    const t = norm(text);
    if (!t) return { text: ch(bug).line.unknown };
    const other = otherBug(bug, t);
    let intent = 'unknown';
    for (const [name, re] of INTENTS) {
      if (re.test(t)) { intent = name; break; }
    }
    if (other && ['unknown', 'friend', 'name', 'mark', 'trivia', 'praise'].includes(intent)) {
      const oc = CHARAS[other.id];
      const same = other.group === bug.group;
      return {
        text: voice(bug, `${other.name}は ${oc.nick}の ことだね。${oc.who}。` +
          `めじるしは「${other.marks[0].t}」だよ。` + (same ? '\${me}の なかまなんだ。' : '')),
        goto: other.id,
      };
    }
    return Object.assign({ intent }, answer(bug, intent, t));
  }

  function hello(bug) {
    return { text: ch(bug).line.hello };
  }

  // したに ならべる しつもんボタン
  const CHIPS = [
    ['name', 'なまえは？'],
    ['mark', 'めじるしは どこ？'],
    ['song', 'なきごえ きかせて！'],
    ['food', 'なにを たべるの？'],
    ['place', 'どこに すんでるの？'],
    ['size', 'どのくらい {大|おお}きい？'],
    ['season', 'いつ あえる？'],
    ['life', 'どうやって そだったの？'],
    ['enemy', 'こわい ものは？'],
    ['like', 'すきな ものは？'],
    ['trivia', 'まめちしき おしえて！'],
    ['keep', 'かっても いい？'],
    ['friend', 'ともだちは だれ？'],
    ['fly', 'とべるの？'],
    ['age', 'どのくらい {生|い}きるの？'],
    ['body', 'かまを みせて！'],
  ];

  function chips(bug, asked) {
    const list = CHIPS.filter(([k]) => {
      if (k === 'body' && isSemi(bug)) return false;
      return true;
    });
    const fresh = list.filter(([k]) => !asked.has(k));
    const pool = fresh.length >= 4 ? fresh : list;
    // まめちしきは なんども きけるので いつも だす
    const out = pool.filter(([k]) => k !== 'trivia').slice(0, 5);
    out.push(CHIPS.find(([k]) => k === 'trivia'));
    return out;
  }

  // よみあげ用（ふりがなの かっこを はずす）
  function plain(s) {
    return String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, '$1');
  }

  return { reply, hello, chips, plain, norm };
})();
