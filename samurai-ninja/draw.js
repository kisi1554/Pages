/* ============================================================
   さむらい vs にんじゃ — え（Canvas で ぜんぶ コードで かく。がぞう ファイル なし）
   ・キャラは まるい あたまの 2とうしん。ち は でない。あたると ほし が とぶ
   ・ステージは 3まいの レイヤーを カメラの 0.15 / 0.45 / 1 ばいで うごかす（パララックス）
   ============================================================ */
(function (root) {
  "use strict";
  var SN = root.SN;
  var TAU = Math.PI * 2;

  // ---------- いろ ----------
  var PAL = {
    samurai: { top: "#f4ecd8", collar: "#34407a", hakama: "#34407a", hakama2: "#26305e", band: "#e03131", hair: "#22201f", skin: "#ffd8b0" },
    samurai2: { top: "#efe6f7", collar: "#7a3434", hakama: "#8a3a3a", hakama2: "#6a2a2a", band: "#2f9e44", hair: "#2a1d18", skin: "#ffd2a6" },
    samurai3: { top: "#e6e6e6", collar: "#222", hakama: "#2b2b2b", hakama2: "#1a1a1a", band: "#f2b705", hair: "#191919", skin: "#ffd8b0" },
    ninja: { body: "#3b3266", body2: "#2a2350", wrap: "#6a62a0", scarf: "#e03131", skin: "#ffd8b0", sash: "#8c86b8" },
    ninja2: { body: "#2f6b4f", body2: "#21503a", wrap: "#6fa58a", scarf: "#f59f00", skin: "#ffd2a6", sash: "#a7d1bb" },
    ninja3: { body: "#2a2a35", body2: "#1b1b24", wrap: "#55556a", scarf: "#9c36b5", skin: "#ffd8b0", sash: "#77778f" },
    ninja4: { body: "#1f4e79", body2: "#163a5c", wrap: "#5d8bb6", scarf: "#ff922b", skin: "#ffd2a6", sash: "#9cc0e0" },
    ninja5: { body: "#5c1e2e", body2: "#43141f", wrap: "#93505f", scarf: "#ffd43b", skin: "#ffd8b0", sash: "#c28a96" }
  };

  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function line(ctx, x0, y0, x1, y1, w, c) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, c, rot) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); ctx.fill(); }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ============================================================
  //  ポーズ（あし・うで・かたな の かくど）
  //  かくどは「まっすぐ した」が 0、まえ が プラス。 w は ぶきの むき（0=まえ, -π/2=うえ）
  // ============================================================
  function basePose() {
    return { lean: 0.05, legF: 0.3, kneeF: 0.15, legB: -0.3, kneeB: 0.1, armF: 1.0, armB: 0.3, w: -0.75, head: 0,
      eyes: "norm", air: false, bob: 0, spin: 0, sheath: false, trail: 0, low: 0, seal: false };
  }

  function samuraiPose(f, t) {
    var P = basePose(), sf = f.sf, ph;
    P.bob = Math.sin(t * 3) * 1.2;
    var st = f.pose || f.st;
    if (st === "walk") {
      ph = t * 9;
      P.legF = 0.15 + Math.sin(ph) * 0.4; P.legB = -0.15 - Math.sin(ph) * 0.4; P.kneeF = 0.2; P.kneeB = 0.2;
      P.bob = Math.abs(Math.sin(ph)) * -3;
    } else if (st === "air") {
      P.air = true; P.legF = 0.8; P.kneeF = 1.3; P.legB = 0.1; P.kneeB = 1.2; P.armF = 1.6; P.w = -1.1;
    } else if (st === "atk") {
      var mv = f.mv, n = f.mvName, a = mv.su, b = mv.su + mv.ac;
      P.legF = 0.5; P.legB = -0.45; P.kneeF = 0.35; P.kneeB = 0.05;
      if (n === "kiruA") { P.air = true; P.legF = 0.9; P.kneeF = 1.2; P.legB = 0.2; P.kneeB = 1.2; }
      var from, to, armA, armZ;
      if (n === "kiru2") { from = 0.9; to = -1.4; armA = 0.6; armZ = 2.2; }
      else { from = -2.4; to = 0.75; armA = 2.9; armZ = 1.2; }
      if (sf < a) { var k = ease(sf / a); P.w = lerp(-0.75, from, k); P.armF = lerp(1.0, armA, k); P.lean = -0.08; }
      else if (sf < b) { var k2 = (sf - a) / mv.ac; P.w = lerp(from, to, k2); P.armF = lerp(armA, armZ, k2); P.trail = 1; P.lean = 0.22; P.tFrom = from; P.tTo = P.w; }
      else { var k3 = ease((sf - b) / mv.re); P.w = lerp(to, -0.75, k3); P.armF = lerp(armZ, 1.0, k3); P.lean = lerp(0.22, 0.05, k3); }
      if (n === "kiru3") { P.legF = 0.65; P.legB = -0.6; P.low = 6; }
    } else if (st === "guard" || st === "bstun") {
      P.lean = -0.05; P.armF = 1.25; P.w = -1.45; P.legF = 0.35; P.legB = -0.45; P.kneeF = 0.3; P.eyes = "firm";
    } else if (st === "hit" || st === "stun") {
      P.lean = -0.3; P.armF = 0.6; P.armB = -0.4; P.w = -0.2; P.eyes = st === "stun" ? "dizzy" : "hit";
      P.legF = 0.4; P.legB = -0.2;
      if (!f.onG) P.air = true;
    } else if (st === "charge") {
      P.lean = 0.35; P.legF = 0.75; P.kneeF = 0.9; P.legB = -0.75; P.kneeB = 0.2; P.armF = 0.4; P.armB = 0.2;
      P.sheath = true; P.eyes = "firm"; P.low = 4;
    } else if (st === "iai") {
      if (sf <= SN.IAI.dash) { P.lean = 0.5; P.legF = 0.9; P.kneeF = 0.5; P.legB = -0.9; P.armF = 1.55; P.w = 0; P.trail = 2; P.eyes = "firm"; }
      else { P.lean = 0.25; P.legF = 0.8; P.kneeF = 0.6; P.legB = -0.8; P.armF = 2.3; P.w = -2.6; P.eyes = "close"; P.low = 6; }
    } else if (st === "kneel" || st === "ko") {
      P.kneel = true; P.lean = 0.45; P.head = 0.25; P.armF = 0.4; P.armB = 0.2; P.w = 0.15; P.eyes = "sad";
    } else if (st === "bow") {
      P.lean = clamp(f.bowK || 0, 0, 1) * 0.85; P.armF = 0.1; P.armB = 0.1; P.sheath = true; P.legF = 0.06; P.legB = -0.06; P.kneeF = 0; P.kneeB = 0;
      P.eyes = (f.bowK || 0) > 0.3 ? "close" : "norm";
    } else if (st === "win") {
      P.armF = 2.7; P.w = -1.45; P.eyes = "happy"; P.lean = -0.05;
    }
    return P;
  }

  function ninjaPose(f, t) {
    var P = basePose(), sf = f.sf, ph;
    var st = f.pose || f.st;
    P.lean = 0.22; P.legF = 0.45; P.kneeF = 0.6; P.legB = -0.4; P.kneeB = 0.4; P.armF = 1.2; P.armB = 0.5; P.w = 0.5;
    P.bob = Math.sin(t * 4) * 1.5;
    if (st === "walk") {
      ph = t * 14;
      P.lean = 0.45; P.legF = 0.2 + Math.sin(ph) * 0.7; P.legB = -0.2 - Math.sin(ph) * 0.7; P.kneeF = 0.5; P.kneeB = 0.5;
      P.armF = 0.5; P.armB = -0.6; P.bob = Math.abs(Math.sin(ph)) * -4;
    } else if (st === "air") {
      P.air = true; P.legF = 0.9; P.kneeF = 1.6; P.legB = 0.4; P.kneeB = 1.6; P.armF = 1.0; P.armB = -0.2;
      if (f.jumps === 2 && sf < 20) P.spin = sf / 20 * TAU;
    } else if (st === "atk") {
      var mv = f.mv, a = mv.su, b = mv.su + mv.ac;
      var thr = sf < a ? 0.3 : sf < b ? 1 : 1 - (sf - b) / mv.re;
      var even = f.mvName === "kunai2" || f.mvName === "kunai4";
      P.lean = 0.35;
      if (even) { P.armB = lerp(0.3, 1.6, thr); P.armF = 0.6; P.backKunai = true; }
      else P.armF = lerp(0.9, 1.65, thr);
      P.w = 0; P.trail = sf >= a && sf < b ? 3 : 0;
      if (f.mvName === "kunaiA") { P.air = true; P.legF = 0.9; P.kneeF = 1.5; P.legB = 0.3; P.kneeB = 1.4; }
    } else if (st === "throw") {
      P.armF = sf < 6 ? lerp(1.0, -0.6, sf / 6) : lerp(2.2, 1.4, (sf - 6) / 10); P.w = 0.4; P.noKunai = sf >= 6 && sf < 12;
      if (!f.onG) { P.air = true; P.legF = 0.9; P.kneeF = 1.5; P.legB = 0.3; P.kneeB = 1.4; }
    } else if (st === "smokeT") {
      P.armF = sf < 6 ? 2.4 : 0.3; P.noKunai = true;
    } else if (st === "kawa") {
      P.seal = true; P.lean = 0.1; P.armF = 1.2; P.armB = 1.2; P.legF = 0.35; P.legB = -0.35; P.kneeF = 0.4; P.kneeB = 0.4; P.eyes = "close";
      if (!f.onG) P.air = true;
    } else if (st === "hit" || st === "stun") {
      P.lean = -0.3; P.armF = 0.4; P.armB = -0.5; P.eyes = st === "stun" ? "dizzy" : "hit"; P.legF = 0.4; P.kneeF = 0.3;
      if (!f.onG) P.air = true;
    } else if (st === "kneel" || st === "ko") {
      P.kneel = true; P.lean = 0.45; P.head = 0.25; P.armF = 0.4; P.armB = 0.2; P.eyes = "sad"; P.noKunai = true;
    } else if (st === "bow") {
      P.lean = clamp(f.bowK || 0, 0, 1) * 0.85; P.armF = 0.1; P.armB = 0.1; P.legF = 0.06; P.legB = -0.06; P.kneeF = 0; P.kneeB = 0; P.noKunai = true;
      P.eyes = (f.bowK || 0) > 0.3 ? "close" : "norm";
    } else if (st === "win") {
      P.seal = true; P.lean = 0; P.legF = 0.2; P.legB = -0.2; P.kneeF = 0.1; P.kneeB = 0.1; P.eyes = "happy";
    }
    return P;
  }

  // あし: ひざ → あしさき。 かえりち は あしさきの いち
  function legPts(hx, hy, a, k, L) {
    var kx = hx + Math.sin(a) * L, ky = hy + Math.cos(a) * L;
    var s = a - k;
    return [kx, ky, kx + Math.sin(s) * L, ky + Math.cos(s) * L];
  }

  // ============================================================
  //  キャラを かく（あしもと が (0,0)、みぎむき で かいて scale で むきを かえる）
  // ============================================================
  function drawFighter(ctx, f, t, palKey) {
    var sam = f.ch === "samurai";
    var C = PAL[palKey] || PAL[f.ch];
    var P = sam ? samuraiPose(f, t) : ninjaPose(f, t);
    var Lg = sam ? 24 : 23, T = sam ? 44 : 40, HR = sam ? 27 : 25;
    var alpha = f.smoke > 0 ? 0.28 + 0.12 * Math.sin(t * 20) : 1;
    if (f.inv > 0 && (f.inv >> 2) % 2) alpha *= 0.5;

    // かげ
    ctx.save();
    var gh = SN.GROUND - f.y;
    ellipse(ctx, f.x, SN.GROUND + 2, Math.max(16, 34 - gh * 0.06), 7, "rgba(0,0,0,0.22)");
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(f.x, f.y);
    ctx.scale(f.face, 1);

    // こし の たかさ（じめんに いる ときは ひくい ほうの あしが じめんに つく）
    var fF = legPts(0, 0, P.legF, P.kneeF, Lg), fB = legPts(0, 0, P.legB, P.kneeB, Lg);
    var hipY;
    if (P.kneel) hipY = -Lg * 1.15;
    else if (P.air) hipY = -Lg * 2;
    else hipY = -Math.max(fF[3], fB[3]);
    hipY += P.bob + P.low;
    if (P.spin) { ctx.translate(0, hipY - 10); ctx.rotate(P.spin); ctx.translate(0, -(hipY - 10)); }

    var legC = sam ? C.hakama : C.body, legC2 = sam ? C.hakama2 : C.body2, lw = sam ? 22 : 15;

    function drawLeg(a, k, col, front) {
      var p;
      if (P.kneel) {
        // ひざまずき: まえあし は たてひざ、うしろあし は ひざを じめんに
        p = front ? [16, hipY + 2, 20, 0] : [-12, -6, -34, -4];
        if (!front) { line(ctx, 0, hipY, p[0], p[1], lw, col); line(ctx, p[0], p[1], p[2], p[3], lw - 3, col); }
        else { line(ctx, 0, hipY, 22, hipY + 4, lw, col); line(ctx, 22, hipY + 4, 20, -2, lw - 2, col); p = [22, hipY + 4, 20, -2]; }
      } else {
        p = legPts(0, hipY, a, k, Lg);
        line(ctx, 0, hipY, p[0], p[1], lw, col);
        line(ctx, p[0], p[1], p[2], p[3], lw - (sam ? 2 : 1), col);
        if (!sam) line(ctx, p[0] + (p[2] - p[0]) * 0.3, p[1] + (p[3] - p[1]) * 0.3, p[2], p[3], lw - 4, C.wrap);
      }
      // あし（ぞうり・たび）
      ellipse(ctx, p[2] + 5, p[3] - 1, sam ? 11 : 9, 5, sam ? "#5a3a22" : C.body2);
      if (sam) ellipse(ctx, p[2] + 5, p[3] - 4, 8, 4, "#fff");
    }

    // うしろの うで
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(P.lean);
    var shY = -T + 8;
    var bHand = [Math.sin(P.armB) * 30 - 4, shY + Math.cos(P.armB) * 30];
    if (P.seal) bHand = [16, shY + 12];
    line(ctx, -4, shY, bHand[0], bHand[1], sam ? 12 : 10, sam ? shade(C.top) : C.body2);
    circle(ctx, bHand[0], bHand[1], 5.5, C.skin);
    if (P.backKunai) drawKunai(ctx, bHand[0], bHand[1], 0.1);
    ctx.restore();

    drawLeg(P.legB, P.kneeB, legC2, false);

    // からだ
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(P.lean);
    if (sam) {
      // はかま の うえ
      ctx.fillStyle = C.hakama;
      ctx.beginPath(); ctx.moveTo(-19, -6); ctx.lineTo(19, -6); ctx.lineTo(24, 14); ctx.lineTo(-24, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.top; rrect(ctx, -18, -T, 36, T, 10); ctx.fill();
      ctx.strokeStyle = C.collar; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-4, -T + 2); ctx.lineTo(8, -T + 22); ctx.lineTo(14, -T + 2); ctx.stroke();
      ctx.fillStyle = C.hakama2; ctx.fillRect(-18, -10, 36, 8);
      // こしの かたな（さや）
      if (P.sheath) {
        line(ctx, -26, -2, 30, -12, 7, "#3b2a20");
        line(ctx, 30, -12, 46, -15, 6, "#222");
        ellipse(ctx, 30, -12, 3, 6, "#c9a227", -0.2);
      } else line(ctx, -24, -2, 16, -8, 7, "#3b2a20");
    } else {
      ctx.fillStyle = C.body; rrect(ctx, -16, -T, 32, T + 4, 9); ctx.fill();
      ctx.fillStyle = C.sash; ctx.fillRect(-16, -12, 32, 6);
      ctx.strokeStyle = C.body2; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, -T + 2); ctx.lineTo(8, -T + 20); ctx.stroke();
    }

    // あたま
    ctx.save();
    ctx.translate(sam ? 2 : 3, -T - HR + 6); ctx.rotate(P.head);
    // マフラー・はちまき の しっぽ（うしろに なびく）
    var wav = Math.sin(t * 10 + f.idx);
    var tailC = sam ? C.band : C.scarf;
    ctx.strokeStyle = tailC; ctx.lineWidth = sam ? 5 : 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-HR + 4, sam ? -10 : -6);
    ctx.quadraticCurveTo(-HR - 14, (sam ? -12 : -2) + wav * 5, -HR - (sam ? 26 : 36), (sam ? -4 : 6) + wav * 8); ctx.stroke();
    if (!sam) { ctx.beginPath(); ctx.moveTo(-HR + 4, -2); ctx.quadraticCurveTo(-HR - 12, 8 - wav * 4, -HR - 28, 16 - wav * 6); ctx.stroke(); }
    if (sam) {
      circle(ctx, 0, 0, HR, C.skin);
      // かみ
      ctx.fillStyle = C.hair;
      ctx.beginPath(); ctx.arc(0, 0, HR + 1, Math.PI * 0.95, Math.PI * 1.95); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, 2, HR - 4, Math.PI * 0.5, Math.PI * 1.2); ctx.lineTo(-6, 0); ctx.fill();
      // ちょんまげ
      ctx.save(); ctx.translate(-2, -HR - 2); ctx.rotate(-0.1);
      rrect(ctx, -6, -6, 22, 9, 4); ctx.fill(); ctx.restore();
      // はちまき
      ctx.fillStyle = C.band; ctx.beginPath(); ctx.arc(0, 0, HR + 1, Math.PI * 1.08, Math.PI * 1.9); ctx.arc(0, 0, HR - 6, Math.PI * 1.9, Math.PI * 1.08, true); ctx.fill();
    } else {
      circle(ctx, 0, 0, HR, C.body);
      // めの ところだけ あいている
      ctx.fillStyle = C.skin; rrect(ctx, -2, -11, HR + 1, 15, 7); ctx.fill();
      ctx.fillStyle = C.scarf; ctx.beginPath(); ctx.arc(0, 0, HR + 1, Math.PI * 1.1, Math.PI * 1.75); ctx.arc(0, 0, HR - 5, Math.PI * 1.75, Math.PI * 1.1, true); ctx.fill();
      // むすびめ
      circle(ctx, -HR + 3, -6, 5, C.scarf);
    }
    drawFace(ctx, P.eyes, sam, t);
    ctx.restore();

    ctx.restore(); // からだ

    drawLeg(P.legF, P.kneeF, legC, true);

    // まえの うで と ぶき
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(P.lean);
    var hand = [Math.sin(P.armF) * 32 + 4, shY + Math.cos(P.armF) * 32];
    if (P.seal) hand = [20, shY + 10];
    if (P.sheath && sam) hand = [24, -14];
    var armC = sam ? C.top : C.body;
    var el = [(4 + hand[0]) / 2 - 3, (shY + hand[1]) / 2 + 4];
    line(ctx, 4, shY, el[0], el[1], sam ? 13 : 11, armC);
    line(ctx, el[0], el[1], hand[0], hand[1], sam ? 12 : 10, armC);
    if (sam && !P.sheath && !P.kneel) drawKatana(ctx, hand[0], hand[1], P.w, P, t);
    if (sam && P.kneel) drawKatana(ctx, 30, -hipY - 4, 0, null, t);
    if (!sam && !P.noKunai && !P.seal && !P.backKunai) drawKunai(ctx, hand[0], hand[1], P.w);
    circle(ctx, hand[0], hand[1], 6.5, C.skin);
    if (P.seal) {
      // いん を むすぶ
      circle(ctx, hand[0] + 2, hand[1] - 4, 6, C.skin);
      line(ctx, hand[0] + 2, hand[1] - 4, hand[0] + 4, hand[1] - 16, 5, C.skin);
    }
    ctx.restore();

    ctx.restore();

    // ため（いあい）
    if (f.st === "charge") {
      ctx.save();
      var k = Math.min(1, f.sf / 60);
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 18);
      var g = ctx.createRadialGradient(f.x, f.y - 70, 10, f.x, f.y - 70, 70 + k * 30);
      g.addColorStop(0, "rgba(255,230,120,0.9)"); g.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y - 70, 100, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (f.st === "kawa") {
      ctx.save(); ctx.globalAlpha = 0.6;
      for (var i = 0; i < 6; i++) {
        var a2 = t * 3 + i * TAU / 6;
        circle(ctx, f.x + Math.cos(a2) * 46, f.y - 70 + Math.sin(a2) * 46, 4, "#b2f2bb");
      }
      ctx.restore();
    }
  }

  function shade(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.82 | 0, g = (n >> 8 & 255) * 0.82 | 0, b = (n & 255) * 0.82 | 0;
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function drawFace(ctx, eyes, sam, t) {
    var ex1 = 7, ex2 = 19, ey = -3;
    ctx.fillStyle = "#222"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    if (eyes === "hit") {
      [[ex1, 1], [ex2, -1]].forEach(function (e) {
        ctx.beginPath(); ctx.moveTo(e[0] - 4, ey - 4); ctx.lineTo(e[0] + 3 * e[1], ey); ctx.lineTo(e[0] - 4, ey + 4); ctx.stroke();
      });
    } else if (eyes === "close" || eyes === "happy") {
      [ex1, ex2].forEach(function (x) { ctx.beginPath(); ctx.arc(x, ey + (eyes === "happy" ? 2 : -1), 4, eyes === "happy" ? Math.PI * 1.1 : 0.15, eyes === "happy" ? Math.PI * 1.9 : Math.PI - 0.15); ctx.stroke(); });
    } else if (eyes === "sad") {
      [ex1, ex2].forEach(function (x) { ctx.beginPath(); ctx.moveTo(x - 4, ey); ctx.lineTo(x + 4, ey + 1); ctx.stroke(); });
      ellipse(ctx, 26, -14, 3, 5, "#74c0fc"); // あせ
    } else if (eyes === "dizzy") {
      [ex1, ex2].forEach(function (x) { ctx.beginPath(); ctx.arc(x, ey, 4, 0, Math.PI * 1.6); ctx.stroke(); });
    } else {
      [ex1, ex2].forEach(function (x) { ellipse(ctx, x, ey, 3.2, 4.6, "#222"); circle(ctx, x + 1, ey - 2, 1.3, "#fff"); });
      if (eyes === "firm") { line(ctx, ex1 - 4, ey - 9, ex1 + 4, ey - 7, 2.6, "#222"); line(ctx, ex2 - 4, ey - 7, ex2 + 4, ey - 9, 2.6, "#222"); }
    }
    if (sam) {
      ellipse(ctx, 22, 7, 4, 2.5, "rgba(255,120,120,0.45)");
      ctx.strokeStyle = "#8a4b3a"; ctx.lineWidth = 2;
      ctx.beginPath();
      if (eyes === "sad" || eyes === "hit") ctx.arc(14, 13, 3, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(14, 8, 3.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else ellipse(ctx, 22, 6, 4, 2.2, "rgba(255,120,120,0.5)");
  }

  function drawKatana(ctx, hx, hy, w, P, t) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(w);
    // ざんぞう
    if (P && P.trail === 1 && P.tFrom !== undefined) {
      ctx.restore(); ctx.save(); ctx.translate(hx, hy);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.arc(0, 0, 86, Math.min(P.tFrom, P.tTo), Math.max(P.tFrom, P.tTo));
      ctx.arc(0, 0, 40, Math.max(P.tFrom, P.tTo), Math.min(P.tFrom, P.tTo), true); ctx.fill();
      ctx.restore(); ctx.save(); ctx.translate(hx, hy); ctx.rotate(w);
    }
    if (P && P.trail === 2) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(-180, -4, 240, 8);
    }
    line(ctx, -14, 0, 6, 0, 7, "#2b2b2b");                 // つか
    ellipse(ctx, 7, 0, 3, 8, "#c9a227");                  // つば
    ctx.fillStyle = "#e9eef3"; ctx.strokeStyle = "#9aa7b4"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(50, -6, 82, -9); ctx.lineTo(80, -3); ctx.quadraticCurveTo(50, 1, 9, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawKunai(ctx, hx, hy, w) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(w);
    ctx.strokeStyle = "#555"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-10, 0, 3.5, 0, TAU); ctx.stroke();
    line(ctx, -6, 0, 4, 0, 5, "#6b4f3a");
    ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(24, 0); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawShuriken(ctx, x, y, rot, s) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = "#adb5bd"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, r = i % 2 ? 4 : 13; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(ctx, 0, 0, 2.5, "#495057");
    ctx.restore();
  }

  // まるた（かわりみ の あと）
  function drawLog(ctx, l) {
    var k = Math.min(1, l.t / 24), a = l.t > 60 ? 1 - (l.t - 60) / 30 : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    ctx.translate(l.x, l.y); ctx.rotate(l.face * k * 1.45);
    ctx.fillStyle = "#a9713f"; rrect(ctx, -17, -120, 34, 120, 12); ctx.fill();
    ctx.strokeStyle = "#7c4f27"; ctx.lineWidth = 3;
    [-90, -55, -24].forEach(function (y) { ctx.beginPath(); ctx.moveTo(-15, y); ctx.quadraticCurveTo(0, y + 6, 15, y); ctx.stroke(); });
    ellipse(ctx, 0, -120, 15, 6, "#d9a66b");
    ctx.strokeStyle = "#a9713f"; ctx.beginPath(); ctx.ellipse(0, -120, 8, 3, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // ============================================================
  //  エフェクト（ほし・ことば・けむり・すなぼこり）
  // ============================================================
  function Effects() { this.list = []; }
  Effects.prototype.add = function (o) { o.t = 0; this.list.push(o); if (this.list.length > 160) this.list.shift(); };
  Effects.prototype.burst = function (x, y, n, col, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = (sp || 5) * (0.5 + Math.random());
      this.add({ k: "star", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 24 + Math.random() * 10, c: col || "#ffd43b", r: 5 + Math.random() * 4, rot: Math.random() * 3 });
    }
  };
  Effects.prototype.text = function (x, y, s, col, size) { this.add({ k: "text", x: x, y: y, s: s, c: col || "#fff", life: 40, size: size || 34 }); };
  Effects.prototype.smoke = function (x, y, n, r) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, v = Math.random() * 2.5;
      this.add({ k: "smoke", x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 26, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 40 + Math.random() * 30, r: (r || 22) * (0.6 + Math.random() * 0.8) });
    }
  };
  Effects.prototype.dust = function (x, y) {
    for (var i = 0; i < 5; i++) this.add({ k: "smoke", x: x + (i - 2) * 8, y: y - 4, vx: (i - 2) * 0.8, vy: -0.5, life: 20, r: 8, dust: true });
  };
  Effects.prototype.ring = function (x, y, c) { this.add({ k: "ring", x: x, y: y, c: c || "#fff", life: 18 }); };
  Effects.prototype.update = function () {
    this.list.forEach(function (e) {
      e.t++;
      if (e.k === "star") { e.x += e.vx; e.y += e.vy; e.vy += 0.25; e.rot += 0.2; }
      if (e.k === "smoke") { e.x += e.vx; e.y += e.vy; e.vx *= 0.95; e.vy *= 0.95; }
      if (e.k === "text") e.y -= 0.8;
    });
    this.list = this.list.filter(function (e) { return e.t < e.life; });
  };
  Effects.prototype.draw = function (ctx, front) {
    this.list.forEach(function (e) {
      var k = e.t / e.life;
      if ((e.k === "text") !== !!front) return;
      ctx.save();
      if (e.k === "star") {
        ctx.globalAlpha = 1 - k; ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.fillStyle = e.c;
        ctx.beginPath();
        for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5, r = i % 2 ? e.r * 0.45 : e.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
      } else if (e.k === "smoke") {
        ctx.globalAlpha = (1 - k) * (e.dust ? 0.5 : 0.85);
        circle(ctx, e.x, e.y, e.r * (1 + k * 0.8), e.dust ? "#c8b59a" : "#e9ecef");
      } else if (e.k === "ring") {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.c; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 + k * 70, 0, TAU); ctx.stroke();
      } else if (e.k === "text") {
        var sc = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.translate(e.x, e.y); ctx.scale(sc, sc);
        ctx.font = "900 " + e.size + "px 'Hiragino Maru Gothic ProN','Rounded Mplus 1c','Kosugi Maru',sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 7; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineJoin = "round"; ctx.strokeText(e.s, 0, 0);
        ctx.fillStyle = e.c; ctx.fillText(e.s, 0, 0);
      }
      ctx.restore();
    });
  };

  // ふきだし（まいった！ など）
  function bubble(ctx, x, y, s) {
    ctx.save();
    ctx.font = "900 30px 'Hiragino Maru Gothic ProN','Rounded Mplus 1c','Kosugi Maru',sans-serif";
    var w = ctx.measureText(s).width + 36, h = 52;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#333"; ctx.lineWidth = 3;
    rrect(ctx, x - w / 2, y - h, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x, y + 14); ctx.lineTo(x + 10, y - 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y + 14); ctx.lineTo(x + 10, y); ctx.stroke();
    ctx.fillStyle = "#333"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y - h / 2);
    ctx.restore();
  }

  // ============================================================
  //  ステージ
  // ============================================================
  var STAGES = {
    machi: { name: "じょうかまち", sky: ["#8fd0ff", "#dff3ff"], far: "#9fb7c9", mid: "#5d4a3a", ground: "#d9c49a", ground2: "#c4ad80" },
    yuu: { name: "ゆうやけの じょうかまち", sky: ["#ff9a62", "#ffe3a8"], far: "#b98576", mid: "#4a3530", ground: "#d6b48a", ground2: "#bf9a6c" },
    take: { name: "たけばやし", sky: ["#c9f0c4", "#f3fff0"], far: "#a8d8a0", mid: "#6aab5f", ground: "#b9a77b", ground2: "#a39265" },
    yane: { name: "やねの うえ（つきよ）", sky: ["#0d1b3d", "#2b3f72"], far: "#16244a", mid: "#1d2b52", ground: "#4b5a7c", ground2: "#3a4766", night: true },
    tenshu: { name: "おしろの てんしゅ", sky: ["#5b7fd6", "#ffc58f"], far: "#7c86b8", mid: "#ffffff", ground: "#8b5a3c", ground2: "#6e432b" }
  };

  function drawStage(ctx, id, camX, viewW, t) {
    var S = STAGES[id] || STAGES.machi, H = 500, i, x, k;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(camX - 2, 0, viewW + 4, H);

    function layer(fac, fn) { ctx.save(); ctx.translate(camX * (1 - fac), 0); fn(camX * fac); ctx.restore(); }

    if (id === "yane") {
      // ほし と つき
      layer(0.02, function () {
        for (i = 0; i < 60; i++) {
          var sx = hash(i) * 1100, sy = hash(i + 99) * 260, tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
          circle(ctx, sx, sy, 1 + hash(i + 7) * 1.6, "rgba(255,255,230," + (0.4 + tw * 0.5) + ")");
        }
        var mg = ctx.createRadialGradient(760, 110, 30, 760, 110, 130);
        mg.addColorStop(0, "rgba(255,250,210,0.5)"); mg.addColorStop(1, "rgba(255,250,210,0)");
        ctx.fillStyle = mg; ctx.fillRect(600, 0, 320, 260);
        circle(ctx, 760, 110, 54, "#fff6c8");
        circle(ctx, 742, 98, 9, "rgba(220,210,160,0.6)"); circle(ctx, 775, 125, 6, "rgba(220,210,160,0.6)");
      });
    } else if (id === "tenshu") {
      layer(0.05, function () {
        for (i = 0; i < 6; i++) cloud(ctx, 140 + i * 260 + Math.sin(t * 0.1 + i) * 20, 70 + hash(i) * 120, 1 + hash(i + 3) * 0.6, "rgba(255,240,230,0.85)");
      });
    } else {
      layer(0.04, function () {
        for (i = 0; i < 5; i++) cloud(ctx, 120 + i * 300 + ((t * 6) % 300), 60 + hash(i + 2) * 70, 0.8 + hash(i) * 0.5, id === "yuu" ? "rgba(255,220,190,0.8)" : "rgba(255,255,255,0.85)");
      });
    }

    // とおく
    layer(0.15, function (off) {
      var base = id === "yane" ? 330 : 300;
      if (id === "take") {
        for (i = 0; i < 40; i++) { x = i * 40 + hash(i) * 20; bamboo(ctx, x, 0, base + 120, 10, S.far, false); }
      } else if (id === "yane") {
        for (i = 0; i < 16; i++) { x = i * 110; roof(ctx, x, base - 20 - hash(i) * 30, 120, 40, S.far, "#2c3c66", hash(i + 5) > 0.5); }
      } else {
        // やま
        ctx.fillStyle = S.far;
        ctx.beginPath(); ctx.moveTo(-100, base + 40);
        for (i = 0; i <= 14; i++) ctx.lineTo(-100 + i * 120, base - 40 - hash(i + 11) * 90);
        ctx.lineTo(1700, base + 40); ctx.closePath(); ctx.fill();
        if (id === "machi" || id === "yuu") castle(ctx, 700, base - 30, 0.75, id === "yuu" ? "#8b6e6a" : "#7f97ad", id === "yuu" ? "#a98c86" : "#e8eef3");
        if (id === "tenshu") {
          // くもの うみ と とおくの まち
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          for (i = 0; i < 18; i++) cloud(ctx, i * 90, base + 30 + hash(i) * 20, 1.1, "rgba(255,245,235,0.9)");
        }
      }
    });

    // まんなか
    layer(0.45, function () {
      var gy = SN.GROUND;
      if (id === "take") {
        for (i = 0; i < 26; i++) { x = i * 70 + hash(i + 40) * 30; bamboo(ctx, x, 0, gy, 16, S.mid, true); }
      } else if (id === "machi" || id === "yuu") {
        for (i = 0; i < 12; i++) { x = i * 160; machiya(ctx, x, gy - 20, 150, 120 + hash(i) * 30, id === "yuu", i); }
      } else if (id === "yane") {
        for (i = 0; i < 10; i++) { x = i * 190; roof(ctx, x, gy - 60 - hash(i + 3) * 40, 180, 60, "#1f2d55", "#33467a", true); }
        for (i = 0; i < 10; i++) { x = i * 190 + 80; circle(ctx, x, gy - 40 - hash(i + 3) * 40, 5, "rgba(255,210,120," + (0.5 + 0.3 * Math.sin(t * 3 + i)) + ")"); }
      } else if (id === "tenshu") {
        // しゃちほこ と やねの はし
        roofEdge(ctx, 150, 250); roofEdge(ctx, 1300, 250, true);
        shachi(ctx, 180, 205, 1); shachi(ctx, 1270, 205, -1);
      }
    });

    // じめん
    var gy2 = SN.GROUND;
    ctx.fillStyle = S.ground; ctx.fillRect(camX - 2, gy2, viewW + 4, H - gy2);
    if (id === "yane") {
      // かわら
      ctx.fillStyle = S.ground2;
      for (x = Math.floor(camX / 36) * 36; x < camX + viewW + 36; x += 36) {
        ctx.beginPath(); ctx.arc(x + 18, gy2 + 8, 16, 0, Math.PI); ctx.fill();
        ctx.fillRect(x + 2, gy2 + 22, 32, 4);
        ctx.fillRect(x + 4, gy2 + 40, 28, 4);
      }
      ctx.fillStyle = "#6b7ba0"; ctx.fillRect(camX - 2, gy2 - 6, viewW + 4, 10);
    } else if (id === "tenshu") {
      // いた の ゆか と てすり
      ctx.fillStyle = S.ground2;
      for (x = Math.floor(camX / 60) * 60; x < camX + viewW + 60; x += 60) ctx.fillRect(x, gy2, 3, H - gy2);
      ctx.fillStyle = "#5a3522"; ctx.fillRect(camX - 2, gy2, viewW + 4, 6);
    } else {
      ctx.fillStyle = S.ground2;
      for (i = Math.floor(camX / 50); i < (camX + viewW) / 50 + 1; i++) {
        ellipse(ctx, i * 50 + hash(i) * 30, gy2 + 18 + hash(i + 3) * 40, 8 + hash(i + 5) * 6, 3, S.ground2);
      }
    }

    // てまえ（はっぱ・ほたる など）
    if (id === "take") {
      for (i = 0; i < 12; i++) {
        k = (t * 20 + i * 97) % 600;
        var lx = camX + ((hash(i) * 1200 + t * 15) % (viewW + 100)) - 50, ly = k - 80;
        ctx.save(); ctx.translate(lx + Math.sin(t + i) * 20, ly); ctx.rotate(t + i);
        ellipse(ctx, 0, 0, 7, 2.5, "rgba(120,170,90,0.8)"); ctx.restore();
      }
    } else if (id === "yuu" || id === "machi") {
      for (i = 0; i < 6; i++) {
        k = (t * 25 + i * 120) % 560;
        var px = camX + ((hash(i + 20) * 1400 + t * 30) % (viewW + 80)) - 40;
        ctx.save(); ctx.translate(px + Math.sin(t * 1.5 + i) * 18, k - 60); ctx.rotate(t * 2 + i);
        ellipse(ctx, 0, 0, 5, 3.5, "rgba(255,183,197,0.85)"); ctx.restore();
      }
    }
    if (id === "tenshu") {
      // てまえの てすり（らんかん）
      ctx.fillStyle = "#b02a1f";
      ctx.fillRect(camX - 2, gy2 + 36, viewW + 4, 9);
      for (x = Math.floor(camX / 120) * 120; x < camX + viewW + 120; x += 120) {
        ctx.fillRect(x, gy2 + 24, 10, 60);
        circle(ctx, x + 5, gy2 + 22, 7, "#c9a227");
      }
    }
  }

  function cloud(ctx, x, y, s, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, TAU);
    ctx.ellipse(x - 26 * s, y + 4 * s, 26 * s, 12 * s, 0, 0, TAU);
    ctx.ellipse(x + 24 * s, y - 6 * s, 28 * s, 14 * s, 0, 0, TAU);
    ctx.fill();
  }
  function bamboo(ctx, x, y0, y1, w, c, joints) {
    ctx.fillStyle = c; ctx.fillRect(x, y0, w, y1 - y0);
    if (joints) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (var y = y0 + 40; y < y1; y += 70) ctx.fillRect(x - 1, y, w + 2, 4);
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x + 3, y0, 3, y1 - y0);
    }
  }
  function roof(ctx, x, y, w, h, c, c2, win) {
    ctx.fillStyle = c2; ctx.fillRect(x + 10, y + h * 0.4, w - 20, 200);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - 6, y + h * 0.5); ctx.quadraticCurveTo(x + w / 2, y - h * 0.4, x + w + 6, y + h * 0.5); ctx.closePath(); ctx.fill();
    if (win) { ctx.fillStyle = "rgba(255,210,120,0.55)"; ctx.fillRect(x + w * 0.35, y + h * 0.75, w * 0.18, h * 0.35); }
  }
  function machiya(ctx, x, gy, w, h, dusk, i) {
    var wall = dusk ? "#c9a58e" : "#efe3cf", wood = dusk ? "#4b3128" : "#6b4a33", tile = dusk ? "#3d3a4a" : "#4f5b6e";
    ctx.fillStyle = wall; ctx.fillRect(x + 6, gy - h, w - 12, h);
    ctx.fillStyle = wood;
    for (var k = 0; k < 6; k++) ctx.fillRect(x + 14 + k * ((w - 30) / 5), gy - h * 0.55, 4, h * 0.55);
    ctx.fillRect(x + 6, gy - h * 0.58, w - 12, 5);
    ctx.fillStyle = tile;
    ctx.beginPath(); ctx.moveTo(x - 6, gy - h + 6); ctx.lineTo(x + w + 6, gy - h + 6); ctx.lineTo(x + w - 10, gy - h - 22); ctx.lineTo(x + 10, gy - h - 22); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 4, gy - h * 0.6 - 6, w + 8, 8);
    // のれん
    var nc = ["#1c7ed6", "#e8590c", "#2f9e44", "#ae3ec9"][i % 4];
    ctx.fillStyle = nc;
    for (k = 0; k < 3; k++) ctx.fillRect(x + w * 0.3 + k * 16, gy - h * 0.52, 14, 26);
    // ちょうちん
    ellipse(ctx, x + w - 22, gy - h * 0.42, 9, 13, dusk ? "#ff8787" : "#ff6b6b");
  }
  function castle(ctx, x, y, s, wall, white) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = wall;
    ctx.fillRect(-120, 20, 240, 50); // いしがき
    var lv = [[-90, -30, 180, 50], [-66, -80, 132, 50], [-44, -124, 88, 44]];
    lv.forEach(function (r) {
      ctx.fillStyle = white; ctx.fillRect(r[0], r[1], r[2], r[3]);
      ctx.fillStyle = wall;
      ctx.beginPath(); ctx.moveTo(r[0] - 18, r[1] + 8); ctx.lineTo(r[0] + r[2] + 18, r[1] + 8); ctx.lineTo(r[0] + r[2] - 6, r[1] - 12); ctx.lineTo(r[0] + 6, r[1] - 12); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  function roofEdge(ctx, x, y, flip) {
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = "#3d4a5c";
    ctx.beginPath(); ctx.moveTo(-200, 40); ctx.quadraticCurveTo(0, 30, 60, -10); ctx.lineTo(70, 0); ctx.quadraticCurveTo(10, 50, -200, 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f1f3f5"; ctx.fillRect(-200, 70, 200, 120);
    ctx.restore();
  }
  function shachi(ctx, x, y, d) {
    ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
    ctx.fillStyle = "#f2c94c"; ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(-24, 10, -8, -10); ctx.quadraticCurveTo(0, -30, 16, -40);
    ctx.quadraticCurveTo(6, -18, 14, -6); ctx.quadraticCurveTo(24, 14, 10, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(ctx, -4, 18, 2.5, "#333");
    ctx.restore();
  }

  // ちいさな キャラの え（メニュー・ずかん よう）
  function portrait(canvas, ch, palKey, pose) {
    var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var f = { ch: ch, x: 0, y: SN.GROUND, face: 1, st: "idle", pose: pose || null, sf: 0, smoke: 0, inv: 0, idx: 0, onG: true, jumps: 0, bowK: 0 };
    ctx.save();
    var s = h / 190;
    ctx.translate(w / 2, h - 8 * s); ctx.scale(s, s); ctx.translate(0, -SN.GROUND);
    drawFighter(ctx, f, 0.4, palKey);
    ctx.restore();
  }

  root.SNDraw = {
    PAL: PAL, STAGES: STAGES, drawFighter: drawFighter, drawShuriken: drawShuriken, drawLog: drawLog,
    drawStage: drawStage, Effects: Effects, bubble: bubble, portrait: portrait
  };
})(this);
