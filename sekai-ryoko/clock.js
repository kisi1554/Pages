"use strict";
/* ============================================================
   せかい いっしゅう りょこう：じこくと じさ

   じさは 数字で もたない。その ときの げんちの じこくを
   Intl.DateTimeFormat の timeZone（IANA の 時刻帯 名）で けいさんする。
   なつじかん（サマータイム）も ブラウザが じどうで あわせて くれる。
   node でも うごく（tools/sekai-ryoko/test-clock.js で テスト）。
   ============================================================ */

const Clock = (() => {
  const fmts = {};
  const fmt = (tz) => fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", weekday: "short",
  }));
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  /** その 時刻帯の げんちの じこく { y, mo, d, h, mi, s, wd } */
  function parts(tz, date = new Date()) {
    const o = {};
    for (const p of fmt(tz).formatToParts(date)) o[p.type] = p.value;
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
  }

  /** UTC から なんぷん すすんでいるか（なつじかんも こみ） */
  function offset(tz, date = new Date()) {
    const p = parts(tz, date);
    const asUTC = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }

  /** にほんとの じさ（ふん）。マイナスは にほんより おくれている */
  const diff = (tz, date = new Date(), home = "Asia/Tokyo") => offset(tz, date) - offset(home, date);

  /** ひづけの ちがい：-1 まえの ひ / 0 おなじ ひ / +1 つぎの ひ */
  function dayRel(tz, date = new Date(), home = "Asia/Tokyo") {
    const a = parts(tz, date), b = parts(home, date);
    return Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / 86400000);
  }

  /** にほんで きょうの h じ m ふん の とき、tz では なんじ？ { p: parts, rel: ひづけの ちがい } */
  function whenHomeAt(h, m, tz, date = new Date(), home = "Asia/Tokyo") {
    const hp = parts(home, date);
    // にほんの その じこくを UTC に なおす（いったん UTC と みなして、じさの ぶん もどす）
    let t = Date.UTC(hp.y, hp.mo - 1, hp.d, h, m);
    t -= offset(home, new Date(t)) * 60000;
    const at = new Date(t);
    return { p: parts(tz, at), rel: dayRel(tz, at, home), date: at };
  }

  /** じさの ことば（「8じかん おそい」「3じかん15ふん おそい」） */
  function diffWords(min) {
    if (min === 0) return "おなじ じこく";
    const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
    const t = (h ? `${h}じかん` : "") + (m ? `${m}${fun(m)}` : "");
    return t + (min < 0 ? " おそい" : " すすんでいる");
  }
  // 15ふん・30ぷん・45ふん（さいごの 数字で きまる）
  const fun = (m) => [0, 1, 3, 4, 6, 8].includes(m % 10) ? "ぷん" : "ふん";

  /** 「あさ 7じ」「よる 10じ 30ぷん」 */
  function timeWords(h, mi = 0) {
    const band = h < 4 ? "よなか" : h < 11 ? "あさ" : h < 15 ? "ひる" : h < 18 ? "ゆうがた" : "よる";
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${band} ${hh}じ` + (mi ? ` ${mi}${fun(mi)}` : "");
  }
  const relWords = (rel) => rel < 0 ? "まえの ひ" : rel > 0 ? "つぎの ひ" : "おなじ ひ";
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (p) => `${p.h}:${pad(p.mi)}`;

  /** たいようの まうえに ある ところ [経度, 緯度]（ひると よるの さかいめを えがく ため） */
  function subsolar(date = new Date()) {
    const R = Math.PI / 180;
    const jd = date.getTime() / 86400000 + 2440587.5, n = jd - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * R;
    const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, eps = (23.439 - 0.0000004 * n) * R;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / R;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / R;
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    let lon = ra - gmst;
    lon = ((lon + 540) % 360) - 180;
    return [lon, dec];
  }

  /** その ばしょが いま ひるか（たいようが ちへいせんより うえ） */
  function isDay(lon, lat, date = new Date()) {
    const R = Math.PI / 180, [slon, slat] = subsolar(date);
    const c = Math.sin(lat * R) * Math.sin(slat * R) + Math.cos(lat * R) * Math.cos(slat * R) * Math.cos((lon - slon) * R);
    return c > 0;
  }

  return { parts, offset, diff, dayRel, whenHomeAt, diffWords, timeWords, relWords, hm, pad, subsolar, isDay };
})();

if (typeof module !== "undefined") module.exports = Clock;
