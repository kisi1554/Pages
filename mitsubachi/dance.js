/* ミツバチの いちにち ｜ 8のじダンスの けいさん（DOM に さわらない。node でも テストできる）
 *
 *  ほうい（azimuth）は「きた ＝ 0°、ひがし ＝ 90°、みなみ ＝ 180°、にし ＝ 270°」の とけいまわり。
 *  すばこの なかの すいた（巣板）は たてに たっている。すいたの「まうえ」が たいようの ほう。
 *  ダンスの かくど ＝ すいたの まうえ から とけいまわりに はかった、まっすぐ すすむ ぶぶんの むき。
 *     ダンスの かくど ＝ はなの ほうい − たいようの ほうい
 *  おしりを ふる じかん（びょう）が ながい ほど とおい（だいたい 1びょう ≒ 1キロ）。
 *  とても ちかい とき（ゲームでは 100メートル より ちかい）は まるく まわる「えんけいダンス」。
 */
(function (root, factory) {
  const D = factory();
  if (typeof module === "object" && module.exports) module.exports = D;
  else root.DANCE = D;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROUND_MAX = 100;      // m … これより ちかいと えんけいダンス
  const SEC_PER_KM = 1.0;     // おしりを ふる 1びょう ≒ 1キロ（むれ・しゅるいで ちがう。だいたい）
  const MAX_DIST = 2000;      // ゲームの はなばたけの いちばん とおい ところ（m）
  const ROUND_SEARCH = 160;   // えんけいダンスを みた なかまが さがす はんい（m）

  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;                  // 0 〜 360 未満
  const signed = (a) => { const n = norm(a); return n > 180 ? n - 360 : n; }; // -180 〜 180
  const diff = (a, b) => Math.abs(signed(a - b));               // 2つの むきの ずれ（0〜180）

  /* ---- ダンスの いみ ---- */
  function danceAngle(sunAz, flowerAz) { return norm(flowerAz - sunAz); }
  function flowerAzFromDance(sunAz, angle) { return norm(sunAz + angle); }
  function waggleSec(distM) { return (distM / 1000) * SEC_PER_KM; }
  function distFromWaggle(sec) { return (Math.max(0, sec) / SEC_PER_KM) * 1000; }
  function isRound(distM) { return distM < ROUND_MAX; }

  // その はなばたけを おしえる ただしい ダンス
  function plan(sunAz, flower) {
    if (isRound(flower.dist)) return { type: "round" };
    return { type: "waggle", angle: danceAngle(sunAz, flower.az), sec: waggleSec(flower.dist) };
  }
  // ダンス → なかまが おもう ばしょ（ほうい・きょり）
  function decode(sunAz, dance) {
    if (!dance || dance.type === "none") return null;
    if (dance.type === "round") return { round: true, az: 0, dist: 0 };
    return { round: false, az: flowerAzFromDance(sunAz, dance.angle), dist: distFromWaggle(dance.sec) };
  }

  /* ---- すいたの うえの むき（がめんの ざひょう: x みぎ、y した） ---- */
  function combVec(angle) { return { x: Math.sin(rad(angle)), y: -Math.cos(rad(angle)) }; }
  function angleOfVec(dx, dy) { return norm(deg(Math.atan2(dx, -dy))); }

  /* ---- ちずの うえ（きた が うえ、ひがし が みぎ。m たんい） ---- */
  function toXY(az, dist) { return { x: Math.sin(rad(az)) * dist, y: -Math.cos(rad(az)) * dist }; }
  function fromXY(x, y) { return { az: angleOfVec(x, y), dist: Math.hypot(x, y) }; }

  // たいようの ほうい（だいたい）: あさ 6じ ≒ ひがし、おひる ≒ みなみ、ゆうがた 18じ ≒ にし
  function sunAzimuth(hour) { return norm(90 + (hour - 6) * 15); }

  /* ---- ゆびで かいた せんを しらべる ----
   *  pts: [{x, y, t(ms)}]
   *  - ぐるっと まわって もとの ところへ もどる → えんけいダンス
   *  - それ いがい → まっすぐ すすむ ぶぶん（はじめ → おわり の むき）。
   *    おしりを ふる じかん ＝ ゆびが うごいて いた じかん（とまって いる じかんは かぞえない）
   */
  function analyzeStroke(pts) {
    if (!pts || pts.length < 2) return { type: "none" };
    let len = 0, turn = 0, prevA = null, moveMs = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      const d = Math.hypot(dx, dy);
      const dt = Math.max(0, pts[i].t - pts[i - 1].t);
      if (d > 0.5) {
        len += d;
        moveMs += Math.min(dt, 120); // ながく とまって いた ぶんは かぞえない
        const a = deg(Math.atan2(dy, dx));
        if (prevA !== null && d > 2) turn += signed(a - prevA);
        if (d > 2) prevA = a;
      }
    }
    if (len < 24) return { type: "none" };
    const a0 = pts[0], a1 = pts[pts.length - 1];
    const disp = Math.hypot(a1.x - a0.x, a1.y - a0.y);
    if (Math.abs(turn) >= 260 && disp < len * 0.45) return { type: "round", turn };
    return { type: "waggle", angle: angleOfVec(a1.x - a0.x, a1.y - a0.y), sec: moveMs / 1000, len };
  }

  /* ---- なかまは どこへ いく？ ----
   *  patches: [{id, az, dist}]、targetId: おしえたい はなばたけ
   *  かえす: { ok, kind, landing:{x,y}(m), patchId, angleErr, distRatio }
   *   kind … "ok" / "other"（ちがう はなばたけ）/ "none"（なにも ない ところ）/ "round-far"（ちかくを さがしたけど なかった）
   */
  function landing(sunAz, dance, patches, targetId) {
    const target = patches.find((p) => p.id === targetId);
    const dec = decode(sunAz, dance);
    if (!dec) return { ok: false, kind: "none", landing: { x: 0, y: 0 }, patchId: null };
    if (dec.round) {
      const near = patches.filter((p) => p.dist <= ROUND_SEARCH).sort((a, b) => a.dist - b.dist);
      const hit = near.find((p) => p.id === targetId) || near[0];
      if (hit) {
        const xy = toXY(hit.az, hit.dist);
        return { ok: hit.id === targetId, kind: hit.id === targetId ? "ok" : "other", landing: xy, patchId: hit.id, round: true };
      }
      const t = target ? toXY(target.az, Math.min(target.dist, ROUND_SEARCH)) : { x: 0, y: -ROUND_SEARCH };
      const k = ROUND_SEARCH / (Math.hypot(t.x, t.y) || 1);
      return { ok: false, kind: "round-far", landing: { x: t.x * k * 0.6, y: t.y * k * 0.6 }, patchId: null, round: true };
    }
    const xy = toXY(dec.az, dec.dist);
    // いちばん ちかい はなばたけ。はなばたけの おおきさ ＋ とおい ほど おおめに みる
    let best = null, bestD = Infinity;
    for (const p of patches) {
      const q = toXY(p.az, p.dist);
      const d = Math.hypot(q.x - xy.x, q.y - xy.y);
      const reach = Math.max(140, p.dist * 0.45);
      if (d <= reach && d < bestD) { best = p; bestD = d; }
    }
    const out = {
      ok: !!best && best.id === targetId,
      kind: best ? (best.id === targetId ? "ok" : "other") : "none",
      landing: xy, patchId: best ? best.id : null, round: false,
    };
    if (target) {
      out.angleErr = signed(dec.az - target.az);   // ＋ ＝ みぎ（とけいまわり）に ずれた
      out.distRatio = dec.dist / Math.max(1, target.dist);
    }
    return out;
  }

  // え（ちず）の うえの きょり: ちかい ところを ひろげて、とおい ところを ちぢめる（√）
  // ρ = 0 〜 1（ちずの はんけいに たいする わりあい）
  const RHO0 = 0.26, RHO1 = 0.7;
  function mapRho(dist) { return RHO0 + RHO1 * Math.sqrt(Math.max(0, dist) / MAX_DIST); }
  function rhoDist(rho) { const k = Math.max(0, rho - RHO0) / RHO1; return k * k * MAX_DIST; }

  return {
    ROUND_MAX, SEC_PER_KM, MAX_DIST, ROUND_SEARCH,
    norm, signed, diff, danceAngle, flowerAzFromDance, waggleSec, distFromWaggle, isRound,
    plan, decode, combVec, angleOfVec, toXY, fromXY, sunAzimuth, analyzeStroke, landing,
    mapRho, rhoDist,
  };
});
