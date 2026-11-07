'use strict';
/*
 * こうじょう けんがく — DOM を つかわない しくみ（test.js から も よぶ）
 *   ruby(str)            … {漢字|よみ} を <ruby> に。ほか の もじ は エスケープ
 *   plain(str)           … {漢字|よみ} を よみ だけ に
 *   shuffle(n, rnd)      … 0..n-1 を まぜる（もとの じゅん には ならない）
 *   checkOrder(line, ids)… ならべた じゅん の ○× を かえす
 *   starsFor(tries)      … じゅんばん パズル の ★（1かいめ で ぜんぶ ○ なら 3）
 *   stirTracker / swipeDetector / shakeCounter / pingpong / inZone … ミニ そうさ の はんてい
 */
const KojoLogic = (() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function ruby(str) {
    let out = '', last = 0;
    const re = /\{([^|{}]+)\|([^|{}]+)\}/g;
    let m;
    while ((m = re.exec(str))) {
      out += esc(str.slice(last, m.index)) + '<ruby>' + esc(m[1]) + '<rt>' + esc(m[2]) + '</rt></ruby>';
      last = re.lastIndex;
    }
    return out + esc(str.slice(last));
  }
  const plain = (str) => String(str).replace(/\{([^|{}]+)\|([^|{}]+)\}/g, '$2');
  // ふりがな なし の かんじ（{…|…} の そと）が あるか
  const KANJI = /[㐀-鿿豈-﫿]/;
  const bareKanji = (str) => KANJI.test(String(str).replace(/\{([^|{}]+)\|([^|{}]+)\}/g, ''));

  function shuffle(n, rnd) {
    rnd = rnd || Math.random;
    const a = [...Array(n).keys()];
    if (n < 2) return a;
    for (let t = 0; t < 20; t++) {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (a.some((v, i) => v !== i)) return a;
    }
    [a[0], a[1]] = [a[1], a[0]];
    return a;
  }

  // ids: ならべた step.id の はいれつ（あいている ところ は null）
  function checkOrder(line, ids) {
    const marks = line.steps.map((s, i) => ids[i] === s.id);
    return { marks, all: marks.every(Boolean) && ids.length === line.steps.length };
  }
  const starsFor = (tries) => (tries <= 1 ? 3 : tries === 2 ? 2 : 1);

  // ぐるぐる: ちゅうしん の まわり を なんしゅう したか（ぎゃく まわり も かぞえる）
  function stirTracker(cx, cy, turns, rMin, rMax) {
    rMin = rMin == null ? 18 : rMin; rMax = rMax == null ? 190 : rMax;
    let prev = null, total = 0, angle = 0;
    return {
      reset() { prev = null; },
      add(x, y) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r < rMin || r > rMax) { prev = null; return this.progress(); }
        const a = Math.atan2(dy, dx);
        if (prev != null) {
          let d = a - prev;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          if (Math.abs(d) < Math.PI / 2) { total += Math.abs(d); angle += d; }
        }
        prev = a;
        return this.progress();
      },
      progress() { return Math.min(1, total / (turns * 2 * Math.PI)); },
      get angle() { return angle; },
      get turns() { return total / (2 * Math.PI); },
    };
  }

  // シュッ: したへ min いじょう なぞったら 1かい（ゆび を はなす まで つぎ は かぞえない）
  function swipeDetector(min) {
    min = min || 50;
    let sx = 0, sy = 0, down = false, fired = false;
    return {
      down(x, y) { sx = x; sy = y; down = true; fired = false; },
      move(x, y) {
        if (!down || fired) return false;
        const dx = x - sx, dy = y - sy;
        if (dy >= min && dy > Math.abs(dx) * 1.2) { fired = true; return true; }
        return false;
      },
      up() { down = false; },
    };
  }

  // ゆする: amp いじょう うごいて むき が かわったら 1かい
  function shakeCounter(amp) {
    amp = amp || 30;
    let anchor = null, dir = 0, count = 0;
    return {
      reset() { anchor = null; dir = 0; },
      add(x) {
        if (anchor == null) { anchor = x; return count; }
        const d = x - anchor;
        if (dir === 0) { if (Math.abs(d) >= amp) { dir = Math.sign(d); anchor = x; } return count; }
        if (Math.sign(d) === dir) { anchor = x; return count; }      // おなじ むき に のびた
        if (Math.abs(d) >= amp) { count++; dir = -dir; anchor = x; }  // ぎゃく に amp いじょう
        return count;
      },
      get count() { return count; },
    };
  }

  // 0→1→0 を いったり きたり（t びょう、speed = 1びょう で すすむ りょう）
  function pingpong(t, speed) {
    const u = (t * speed) % 2;
    return u <= 1 ? u : 2 - u;
  }
  const inZone = (p, zone) => p >= zone[0] && p <= zone[1];

  return { esc, ruby, plain, bareKanji, shuffle, checkOrder, starsFor, stirTracker, swipeDetector, shakeCounter, pingpong, inZone };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = KojoLogic;
else window.KojoLogic = KojoLogic;
