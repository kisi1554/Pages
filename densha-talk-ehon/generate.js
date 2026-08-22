/*
 * でんしゃトーク ほしぞらのたんけん
 * 星空と地球をテーマにした絵本(パワポ形式・全30ページ)
 * 登場キャラクターは densha-talk アプリの設定に準拠
 */
const pptxgen = require("pptxgenjs");

// ---------- キャラクター設定 (densha-talk/knowledge.js より) ----------
const CH = {
  roman: { name: "ろまんちゃん", color: "0068B7", ink: "00457A", hat: "👑", face: "star" },
  yamanoten: { name: "やまのてん", color: "9ACD32", ink: "4F7A06", hat: "🔁", face: "smile" },
  ginjiro: { name: "ぎんじろう", color: "FF9500", ink: "A35C00", hat: "🎩", face: "wise" },
  maruko: { name: "まるこ", color: "F62E36", ink: "A3151B", hat: "🎀", face: "chat" },
  keikyu: { name: "けいきゅん", color: "E5171F", ink: "9B0D13", hat: "🔥", face: "grin" },
  tokaido: { name: "とうかいくん", color: "F68B1E", ink: "A15A08", hat: "🏖️", face: "calm" },
  uenotokyo: { name: "うえとうくん", color: "6A5ACD", ink: "3D2F7A", hat: "🌉", face: "gentle" },
};
const CAST = [CH.roman, CH.yamanoten, CH.ginjiro, CH.maruko, CH.keikyu, CH.tokaido, CH.uenotokyo];

// ---------- 汎用ユーティリティ ----------
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function lerpColor(a, b, t) {
  const pa = [a.slice(0, 2), a.slice(2, 4), a.slice(4, 6)].map((h) => parseInt(h, 16));
  const pb = [b.slice(0, 2), b.slice(2, 4), b.slice(4, 6)].map((h) => parseInt(h, 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const W = 13.333,
  H = 7.5;

function gradientBG(slide, colorTop, colorBottom, bands = 18) {
  const bandH = H / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    slide.addShape("rect", {
      x: 0,
      y: i * bandH,
      w: W,
      h: bandH + 0.02,
      fill: { color: lerpColor(colorTop, colorBottom, t) },
      line: { type: "none" },
    });
  }
}

function starfield(slide, seedNum, count, opts) {
  opts = opts || {};
  const rand = seeded(seedNum);
  const yMin = opts.yMin !== undefined ? opts.yMin : 0;
  const yMax = opts.yMax !== undefined ? opts.yMax : H;
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = yMin + rand() * (yMax - yMin);
    const s = 0.03 + rand() * 0.07;
    const big = rand() > 0.92;
    slide.addShape(big ? "star5" : "ellipse", {
      x: x,
      y: y,
      w: big ? s * 3 : s,
      h: big ? s * 3 : s,
      fill: { color: "FFF6DE" },
      line: { type: "none" },
    });
  }
}

function nightBG(slide, opts) {
  gradientBG(slide, "070B24", "1B2A57");
  starfield(slide, (opts && opts.seed) || 1, (opts && opts.count) || 55, opts);
}

function dawnBG(slide, opts) {
  gradientBG(slide, "241B4E", "F6A24C");
  starfield(slide, (opts && opts.seed) || 2, 18, { yMax: 2.6 });
}

// 半円の朝日 (dawn 用)
function sunrise(slide) {
  slide.addShape("ellipse", { x: W / 2 - 3.4, y: 5.6, w: 6.8, h: 6.8, fill: { color: "FFD166" }, line: { type: "none" } });
  slide.addShape("rect", { x: 0, y: 0, w: W, h: 6.7, fill: { color: "FFFFFF" }, line: { type: "none" } }); // placeholder unused
}

// ---------- 電車キャラクターの描画 ----------
// x,y: 足元(車輪)中心のおおよその位置  scale: 高さ(インチ)の目安
function drawChar(slide, ch, x, y, scale, opts) {
  opts = opts || {};
  const s = scale; // 全体スケール(体の高さ)
  const bodyW = s * 1.15;
  const bodyH = s * 0.82;
  const bx = x - bodyW / 2;
  const by = y - bodyH - s * 0.22;

  // 影
  slide.addShape("ellipse", {
    x: x - bodyW * 0.45,
    y: y + s * 0.02,
    w: bodyW * 0.9,
    h: s * 0.12,
    fill: { color: "000000", transparency: 78 },
    line: { type: "none" },
  });

  // 車輪
  const wheelR = s * 0.16;
  slide.addShape("ellipse", { x: bx + bodyW * 0.15 - wheelR, y: by + bodyH - wheelR * 0.5, w: wheelR * 2, h: wheelR * 2, fill: { color: "2B2B2B" }, line: { type: "none" } });
  slide.addShape("ellipse", { x: bx + bodyW * 0.85 - wheelR, y: by + bodyH - wheelR * 0.5, w: wheelR * 2, h: wheelR * 2, fill: { color: "2B2B2B" }, line: { type: "none" } });

  // 本体(丸角四角)
  slide.addShape("roundRect", {
    x: bx,
    y: by,
    w: bodyW,
    h: bodyH,
    rectRadius: 0.12,
    fill: { color: ch.color },
    line: { color: ch.ink, width: 1.5 },
    shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 6, offset: 3, angle: 90 },
  });

  // 顔プレート
  const plateW = bodyW * 0.72,
    plateH = bodyH * 0.56;
  const px = x - plateW / 2,
    py = by + bodyH * 0.14;
  slide.addShape("roundRect", {
    x: px,
    y: py,
    w: plateW,
    h: plateH,
    rectRadius: 0.08,
    fill: { color: "FFF8ED" },
    line: { color: ch.ink, width: 1 },
  });

  // 目
  const eyeY = py + plateH * 0.42;
  const eyeGap = plateW * 0.26;
  const eyeR = s * 0.075;
  if (opts.sleepy) {
    // ねむそうな目(まぶた)
    [x - eyeGap, x + eyeGap].forEach((ex) => {
      slide.addShape("line", { x: ex - eyeR, y: eyeY, w: eyeR * 2, h: 0, line: { color: ch.ink, width: 2.2 } });
    });
  } else if (ch.face === "star") {
    [x - eyeGap, x + eyeGap].forEach((ex) => {
      slide.addShape("star5", { x: ex - eyeR, y: eyeY - eyeR, w: eyeR * 2, h: eyeR * 2, fill: { color: "FFC94A" }, line: { type: "none" } });
    });
  } else {
    [x - eyeGap, x + eyeGap].forEach((ex) => {
      slide.addShape("ellipse", { x: ex - eyeR, y: eyeY - eyeR, w: eyeR * 2, h: eyeR * 2, fill: { color: "2B2B2B" }, line: { type: "none" } });
      slide.addShape("ellipse", { x: ex - eyeR * 0.35, y: eyeY - eyeR, w: eyeR * 0.6, h: eyeR * 0.6, fill: { color: "FFFFFF" }, line: { type: "none" } });
    });
  }

  // ほお
  const cheekR = s * 0.05;
  [x - eyeGap * 1.55, x + eyeGap * 1.55].forEach((cx) => {
    slide.addShape("ellipse", { x: cx - cheekR, y: eyeY + s * 0.05, w: cheekR * 2, h: cheekR * 2, fill: { color: "FFB6A0", transparency: 35 }, line: { type: "none" } });
  });

  // 口
  const mouthY = py + plateH * 0.72;
  slide.addText(opts.mouth || "⌣", {
    x: x - s * 0.18,
    y: mouthY - s * 0.1,
    w: s * 0.36,
    h: s * 0.22,
    align: "center",
    fontSize: Math.max(8, s * 20),
    color: ch.ink,
    fontFace: "Arial",
    margin: 0,
  });

  // かぶりもの
  slide.addText(ch.hat, {
    x: x - s * 0.28,
    y: by - s * 0.42,
    w: s * 0.56,
    h: s * 0.5,
    align: "center",
    valign: "bottom",
    fontSize: Math.max(10, s * 26),
    margin: 0,
  });

  if (opts.label !== false) {
    slide.addText(ch.name, {
      x: x - 0.9,
      y: y + s * 0.14,
      w: 1.8,
      h: 0.3,
      align: "center",
      fontSize: 11,
      bold: true,
      color: "FFF8ED",
      fontFace: "Calibri",
      margin: 0,
    });
  }
}

function planet(slide, x, y, r, color, opts) {
  opts = opts || {};
  slide.addShape("ellipse", {
    x: x - r,
    y: y - r,
    w: r * 2,
    h: r * 2,
    fill: { color: color },
    line: opts.line || { type: "none" },
    shadow: opts.glow
      ? { type: "outer", color: opts.glow, opacity: 0.6, blur: 40, offset: 0, angle: 0 }
      : undefined,
  });
}

// 球体を帯(バンド)で塗り分けて、なめらかな明暗をつくる(pie図形は使わない)
function shadedSphere(slide, cx, cy, r, colorLeft, colorRight, splitStart, splitEnd) {
  slide.addShape("ellipse", {
    x: cx - r - 0.15, y: cy - r - 0.15, w: (r + 0.15) * 2, h: (r + 0.15) * 2,
    fill: { color: colorRight, transparency: 88 }, line: { type: "none" },
  });
  const bands = 90;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const dx = -r + t * 2 * r;
    const bandW = (2 * r) / bands + 0.02;
    const halfH = Math.sqrt(Math.max(0, r * r - dx * dx));
    if (halfH <= 0) continue;
    const tt = Math.max(0, Math.min(1, (t - splitStart) / (splitEnd - splitStart)));
    const color = lerpColor(colorLeft, colorRight, tt);
    slide.addShape("rect", { x: cx + dx - bandW / 2, y: cy - halfH, w: bandW, h: halfH * 2, fill: { color }, line: { type: "none" } });
  }
}

function pageNumber(slide, n) {
  slide.addText(String(n), {
    x: W - 0.7,
    y: H - 0.45,
    w: 0.4,
    h: 0.3,
    align: "right",
    fontSize: 11,
    color: "FFF8ED",
    fontFace: "Calibri",
    margin: 0,
  });
}

function caption(slide, text, opts) {
  opts = opts || {};
  const boxH = opts.h || 1.5;
  const y = opts.y !== undefined ? opts.y : H - boxH - 0.35;
  slide.addShape("roundRect", {
    x: 0.5,
    y: y,
    w: W - 1,
    h: boxH,
    rectRadius: 0.12,
    fill: { color: "0A0F2E", transparency: 22 },
    line: { color: "FFD166", width: 1, transparency: 55 },
  });
  slide.addText(text, {
    x: 0.85,
    y: y + 0.12,
    w: W - 1.7,
    h: boxH - 0.24,
    align: "left",
    valign: "middle",
    fontSize: opts.fontSize || 20,
    color: "FFF8ED",
    fontFace: "Bookman Old Style",
    lineSpacingMultiple: 1.25,
  });
}

function speechBubble(slide, text, x, y, w, h, opts) {
  opts = opts || {};
  slide.addShape("roundRect", {
    x, y, w, h,
    rectRadius: 0.1,
    fill: { color: "FFFFFF" },
    line: { color: opts.ink || "2B2B2B", width: 1.5 },
    shadow: { type: "outer", color: "000000", opacity: 0.3, blur: 5, offset: 2, angle: 90 },
  });
  slide.addShape("triangle", {
    x: x + w * 0.15,
    y: y + h - 0.02,
    w: 0.3,
    h: 0.22,
    fill: { color: "FFFFFF" },
    line: { color: opts.ink || "2B2B2B", width: 1.5 },
    rotate: 200,
  });
  slide.addText(text, {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: h - 0.16,
    align: "center", valign: "middle",
    fontSize: opts.fontSize || 15, color: "2B2B2B", fontFace: "Bookman Old Style",
    lineSpacingMultiple: 1.1,
  });
}

// ============================================================
const pres = new pptxgen();
pres.defineLayout({ name: "WIDE", width: W, height: H });
pres.layout = "WIDE";
pres.author = "densha-talk";
pres.title = "でんしゃトーク ほしぞらのたんけん";

let pageNo = 0;
function newSlide() {
  pageNo++;
  return pres.addSlide();
}

// ---------- P1 表紙 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 101, count: 70 });
  planet(s, W - 2.0, 1.7, 1.15, "F1EAD6", { glow: "FFF3C4" }); // moon
  s.addShape("ellipse", { x: W - 2.5, y: 1.15, w: 0.55, h: 0.55, fill: { color: "D8CFAF", transparency: 40 }, line: { type: "none" } });
  s.addShape("ellipse", { x: W - 1.55, y: 2.0, w: 0.35, h: 0.35, fill: { color: "D8CFAF", transparency: 40 }, line: { type: "none" } });

  s.addText("でんしゃトーク", {
    x: 0.8, y: 1.5, w: 8.5, h: 1.0, fontSize: 34, bold: true, color: "FFD166", fontFace: "Bookman Old Style", margin: 0,
  });
  s.addText("ほしぞらのたんけん", {
    x: 0.8, y: 2.25, w: 9.5, h: 1.3, fontSize: 56, bold: true, color: "FFF8ED", fontFace: "Bookman Old Style", margin: 0,
  });
  s.addText("ちきゅうと おほしさまの えほん", {
    x: 0.85, y: 3.35, w: 8, h: 0.6, fontSize: 20, italic: true, color: "CADCFC", fontFace: "Bookman Old Style", margin: 0,
  });

  const startX = 1.6, gap = 1.55;
  CAST.forEach((c, i) => drawChar(s, c, startX + i * gap, 6.55, 0.85, { label: false }));
  s.addText("でんしゃトークの なかまたち", {
    x: 0.8, y: 6.85, w: 6, h: 0.4, fontSize: 12, color: "CADCFC", fontFace: "Calibri", margin: 0,
  });
}

// ---------- P2 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 2, count: 60 });
  planet(s, 1.6, 2.7, 0.62, "F1EAD6", { glow: "FFF3C4" });
  s.addShape("rect", { x: 0, y: 5.7, w: W, h: 0.18, fill: { color: "3A3F55" }, line: { type: "none" } });
  const startX = 1.9, gap = 1.6;
  CAST.forEach((c, i) => drawChar(s, c, startX + i * gap, 5.7, 1.0));
  caption(s, "よるになると、でんしゃたちはさいごのえきにあつまります。ひとばしのあいだ、みんなでそらをみあげました。", { y: 0.4, h: 1.1 });
  pageNumber(s, pageNo);
}

// ---------- P3 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 3, count: 65 });
  drawChar(s, CH.roman, 4.2, 5.4, 2.0, { mouth: "◡" });
  speechBubble(s, "あのほしまで\nいって みたいな", 5.6, 2.7, 3.2, 1.5, { ink: CH.roman.ink, fontSize: 16 });
  s.addShape("star5", { x: 9.3, y: 1.6, w: 0.4, h: 0.4, fill: { color: "FFD166" }, line: { type: "none" } });
  caption(s, "ろまんちゃんがそらをみていいました。「あのほしまで、いってみたいな。ひかっているかなあ。」", { y: 6.1, h: 1.1 });
  pageNumber(s, pageNo);
}

// ---------- P4 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 4, count: 60 });
  // ひかるせんろ
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = 1.2 + t * 9.5;
    const y = 6.2 - t * 4.0;
    s.addShape("star5", { x, y, w: 0.22, h: 0.22, fill: { color: "FFD166" }, line: { type: "none" } });
  }
  drawChar(s, CH.yamanoten, 2.0, 6.5, 1.1, { mouth: "⌣" });
  drawChar(s, CH.roman, 3.6, 6.5, 1.1);
  drawChar(s, CH.ginjiro, 5.2, 6.5, 1.1);
  drawChar(s, CH.maruko, 6.8, 6.5, 1.1);
  speechBubble(s, "じゃあ、\nみんなで いこう!", 1.1, 3.1, 2.3, 1.2, { ink: CH.yamanoten.ink, fontSize: 14 });
  caption(s, "「じゃあ、みんなでいこう!」やまのてんがいいました。ぴかっとひかるせんろが、そらにあらわれました。", { y: 0.35, h: 1.1 });
  pageNumber(s, pageNo);
}

// ---------- P5 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 5, count: 70 });
  const positions = [
    [2.0, 6.3], [3.3, 5.3], [4.7, 4.3], [6.1, 3.3], [7.5, 2.4], [8.9, 1.6], [10.2, 1.0],
  ];
  CAST.forEach((c, i) => {
    const [x, y] = positions[i];
    drawChar(s, c, x, y, 0.95, { label: false });
    s.addText("〇", { x: x - 0.9, y: y + 0.05, w: 0.9, h: 0.4, fontSize: 18, color: "CADCFC", margin: 0, align: "right" });
  });
  caption(s, "しゅっぱつしんこう! しゅしゅしゅっぽー! でんしゃたちは、そらへ のぼっていきます。", { y: 6.05, h: 1.15 });
  pageNumber(s, pageNo);
}

// ---------- P6 地球発見 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 6, count: 45, yMax: 3.2 });
  planet(s, W / 2, 5.7, 2.3, "2E86DE", { glow: "5AA9FF" });
  [
    [-0.9, -0.6, 1.1, 0.7], [0.4, 0.1, 0.9, 0.6], [-0.2, 1.0, 1.3, 0.6], [1.1, -1.1, 0.7, 0.5],
  ].forEach(([dx, dy, w, h]) => {
    s.addShape("ellipse", { x: W / 2 + dx - w / 2, y: 5.7 + dy - h / 2, w, h, fill: { color: "27AE60" }, line: { type: "none" } });
  });
  CAST.slice(0, 4).forEach((c, i) => drawChar(s, c, 1.6 + i * 1.0, 2.6, 0.7, { label: false }));
  caption(s, "どんどんたかくのぼると、したにまるいほしがみえてきました。それが「ちきゅう」です。", { y: 0.3, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P7 地球の説明 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 7, count: 40, yMax: 2.0 });
  planet(s, 3.6, 3.6, 2.5, "2E86DE", { glow: "5AA9FF" });
  [
    [-1.0, -0.9, 1.3, 0.8], [0.6, 0.2, 1.1, 0.7], [-0.3, 1.2, 1.5, 0.7], [1.2, -1.3, 0.8, 0.6],
  ].forEach(([dx, dy, w, h]) => {
    s.addShape("ellipse", { x: 3.6 + dx - w / 2, y: 3.6 + dy - h / 2, w, h, fill: { color: "27AE60" }, line: { type: "none" } });
  });
  drawChar(s, CH.roman, 9.7, 5.9, 1.3, { label: false });
  speechBubble(s, "きれいだね", 8.0, 2.6, 1.9, 1.0, { ink: CH.roman.ink, fontSize: 16 });
  caption(s, "ちきゅうはあおくて、みずがいっぱい。みどりのところはやまやもりです。「きれいだね。」", { y: 6.05, h: 1.15 });
  pageNumber(s, pageNo);
}

// ---------- P8 自転(やまのてん) ----------
{
  const s = newSlide();
  nightBG(s, { seed: 8, count: 40, yMax: 2.0 });
  planet(s, 8.7, 4.0, 2.1, "2E86DE", { glow: "5AA9FF" });
  [[-0.8,-0.5,1.0,0.6],[0.5,0.3,0.9,0.5],[-0.1,0.9,1.1,0.5]].forEach(([dx,dy,w,h])=>{
    s.addShape("ellipse", { x: 8.7+dx-w/2, y: 4.0+dy-h/2, w, h, fill: { color: "27AE60" }, line:{type:"none"} });
  });
  // 回転矢印
  for (let i = 0; i < 3; i++) {
    const ang = -40 + i * 55;
    s.addShape("star4", { x: 8.7 + 2.6 * Math.cos((ang * Math.PI) / 180) - 0.1, y: 4.0 + 2.6 * Math.sin((ang * Math.PI) / 180) - 0.1, w: 0.2, h: 0.2, fill: { color: "FFD166" }, line: { type: "none" }, rotate: ang });
  }
  drawChar(s, CH.yamanoten, 3.0, 5.7, 1.7, { mouth: "⌣" });
  caption(s, "やまのてんがぐるっとまわると、ちきゅうもゆっくり くるくるまわっていることに きづきました。", { y: 0.3, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P9 昼夜 ----------
{
  const s = newSlide();
  gradientBG(s, "070B24", "1B2A57");
  // 半分ひる、半分よる (帯を重ねてなめらかに塗り分け)
  shadedSphere(s, W/2, 3.85, 2.15, "16234F", "FFD166", 0.38, 0.62);
  [[-0.9,-0.8,1.15,0.7],[0.55,0.15,1.0,0.6],[-0.25,1.05,1.35,0.6]].forEach(([dx,dy,w,h])=>{
    s.addShape("ellipse", { x: W/2+dx-w/2, y: 3.85+dy-h/2, w, h, fill: { color: "27AE60", transparency: 10 }, line:{type:"none"} });
  });
  s.addText("ひる", { x: W/2+0.5, y: 1.9, w: 1.4, h: 0.5, fontSize: 20, bold: true, color: "6B4B00", margin: 0 });
  s.addText("よる", { x: W/2-1.9, y: 1.9, w: 1.4, h: 0.5, fontSize: 20, bold: true, color: "FFF8ED", margin: 0 });
  caption(s, "ちきゅうがまわると、ひるとよるがかわりばんこにきます。ひかりがあたるほうがひる、はんたいがよるです。", { y: 6.15, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P10 月・ぎんじろう ----------
{
  const s = newSlide();
  nightBG(s, { seed: 10, count: 50, yMax: 3.0 });
  planet(s, 9.4, 3.2, 2.0, "F1EAD6", { glow: "FFF3C4" });
  [[-0.7,-0.4,0.5],[0.5,0.5,0.4],[-0.2,0.8,0.3],[0.8,-0.7,0.35]].forEach(([dx,dy,r])=>{
    s.addShape("ellipse", { x: 9.4+dx-r/2, y: 3.2+dy-r/2, w:r, h:r, fill:{color:"D8CFAF"}, line:{type:"none"} });
  });
  drawChar(s, CH.ginjiro, 3.0, 6.0, 1.8, { mouth: "⌣" });
  speechBubble(s, "わしに\nまかせい", 4.6, 3.9, 2.1, 1.1, { ink: CH.ginjiro.ink, fontSize: 15 });
  caption(s, "つぎにみえてきたのは、まんまるいつき。ぐんじろうが「わしにまかせい」とはなしはじめました。", { y: 0.3, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P11 クレーター ----------
{
  const s = newSlide();
  nightBG(s, { seed: 11, count: 30, yMax: 1.4 });
  planet(s, 6.6, 3.5, 2.55, "F1EAD6");
  const rand = seeded(11);
  for (let i = 0; i < 14; i++) {
    const ang = rand() * Math.PI * 2, rr = rand() * 1.95;
    const cx = 6.6 + rr * Math.cos(ang), cy = 3.5 + rr * Math.sin(ang);
    if (Math.hypot(cx - 6.6, cy - 3.5) > 2.35) continue;
    const cr = 0.1 + rand() * 0.18;
    s.addShape("ellipse", { x: cx - cr, y: cy - cr, w: cr * 2, h: cr * 2, fill: { color: "D8CFAF" }, line: { color: "C4B896", width: 0.5 } });
  }
  drawChar(s, CH.ginjiro, 11.3, 6.4, 1.15, { label: false });
  caption(s, "「つきにはでこぼこのあながたくさんあるんじゃ。むかしむかし、いんせきがぶつかったあとじゃよ。」", { y: 6.15, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P12 月の満ち欠け ----------
{
  const s = newSlide();
  nightBG(s, { seed: 12, count: 45, yMax: 2.0 });
  const phases = ["まんまるいひ", "はんぶんのひ", "みかづき", "しんげつ"];
  const cx0 = 2.6, gap = 2.8, cy = 3.7, r = 0.95;
  phases.forEach((label, i) => {
    const cx = cx0 + i * gap;
    slideMoonPhase(s, cx, cy, r, i);
    s.addText(label, { x: cx - 1.1, y: cy + r + 0.15, w: 2.2, h: 0.4, align: "center", fontSize: 14, color: "FFF8ED", fontFace: "Bookman Old Style", margin: 0 });
  });
  caption(s, "つきはかたちをかえながら、ちきゅうのまわりをまわっています。まるいひ、はんぶんのひ、みかづき。", { y: 6.05, h: 1.15 });
  pageNumber(s, pageNo);
}

function slideMoonPhase(s, cx, cy, r, phase) {
  // ベース(紺色)
  s.addShape("ellipse", { x: cx - r, y: cy - r, w: r * 2, h: r * 2, fill: { color: "1B2A57" }, line: { color: "F1EAD6", width: 1.5 } });
  if (phase === 0) {
    // まんまるいひ
    s.addShape("ellipse", { x: cx - r + 0.06, y: cy - r + 0.06, w: r * 2 - 0.12, h: r * 2 - 0.12, fill: { color: "F1EAD6" }, line: { type: "none" } });
  } else if (phase === 1) {
    // はんぶんのひ (右半分だけ明るい, 四角でマスク)
    s.addShape("ellipse", { x: cx - r + 0.06, y: cy - r + 0.06, w: r * 2 - 0.12, h: r * 2 - 0.12, fill: { color: "F1EAD6" }, line: { type: "none" } });
    s.addShape("rect", { x: cx - r - 0.05, y: cy - r - 0.05, w: r + 0.05, h: r * 2 + 0.1, fill: { color: "1B2A57" }, line: { type: "none" } });
  } else if (phase === 2) {
    // みかづき (円をずらして重ね、三日月の形をつくる)
    s.addShape("ellipse", { x: cx - r + 0.06, y: cy - r + 0.06, w: r * 2 - 0.12, h: r * 2 - 0.12, fill: { color: "F1EAD6" }, line: { type: "none" } });
    const dx = r * 1.15;
    s.addShape("ellipse", { x: cx - dx - r, y: cy - r, w: r * 2, h: r * 2, fill: { color: "1B2A57" }, line: { type: "none" } });
  }
  // phase 3 (しんげつ) はベースの紺色のまま
}

// ---------- P13 まるこ ----------
{
  const s = newSlide();
  nightBG(s, { seed: 13, count: 65 });
  drawChar(s, CH.maruko, 6.0, 5.6, 2.1, { mouth: "◡" });
  for (let i = 0; i < 5; i++) {
    s.addShape("line", { x: 3.0 + i * 0.35, y: 5.0, w: 0.6, h: 0, line: { color: "CADCFC", width: 2, transparency: 20 } });
  }
  speechBubble(s, "もっと\nおくに\nいってみたい!", 7.9, 3.0, 2.4, 1.5, { ink: CH.maruko.ink, fontSize: 15 });
  caption(s, "まるこがきょろきょろ。「もっとおくにいってみたい!」ととびだしました。", { y: 0.35, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P14 水星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 14, count: 55 });
  planet(s, 5.6, 3.7, 1.3, "B9865A", { glow: "FFB37A" });
  for (let i = 0; i < 5; i++) {
    const ang = -30 + i * 15;
    s.addShape("line", { x: 5.6 + 1.4 * Math.cos((ang*Math.PI)/180), y: 3.7 + 1.4*Math.sin((ang*Math.PI)/180), w: 0.5*Math.cos((ang*Math.PI)/180), h: 0.5*Math.sin((ang*Math.PI)/180), line: { color: "FFB37A", width: 2 } });
  }
  s.addText("すいせい", { x: 5.6-1.0, y: 5.15, w: 2.0, h: 0.5, align:"center", fontSize: 18, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  CAST.slice(0,3).forEach((c,i)=>drawChar(s,c, 9.6+i*1.2, 6.4, 0.85, {label:false}));
  caption(s, "ちいさなほし、すいせいがみえました。たいようにいちばんちかいほしです。あつくて、はやくまわります。", { y: 0.3, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P15 金星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 15, count: 55 });
  planet(s, 6.6, 3.7, 1.7, "FDE9B0", { glow: "FFF3C4" });
  [ -60,-20,20,60,100,140,180,220 ].forEach(ang=>{
    s.addShape("star4", { x: 6.6 + 2.5*Math.cos((ang*Math.PI)/180)-0.08, y: 3.7 + 2.5*Math.sin((ang*Math.PI)/180)-0.08, w:0.16,h:0.16, fill:{color:"FFF3C4"}, line:{type:"none"} });
  });
  s.addText("きんせい", { x: 6.6-1.0, y: 5.7, w: 2.0, h: 0.5, align:"center", fontSize:18, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  drawChar(s, CH.uenotokyo, 10.6, 6.4, 1.1, {label:false});
  caption(s, "よぞらでいちばんきらきらひかるほしがきんせいです。「よいのみょうじょう」ともよばれます。", { y: 6.15, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P16 火星・けいきゅん ----------
{
  const s = newSlide();
  nightBG(s, { seed: 16, count: 55 });
  planet(s, 8.6, 3.6, 1.7, "C1440E", { glow: "FF7A4A" });
  s.addText("かせい", { x: 8.6-1.0, y: 5.5, w: 2.0, h: 0.5, align:"center", fontSize:18, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  for (let i=0;i<4;i++){
    s.addShape("triangle", { x: 2.0+i*0.35, y: 5.5+i*0.05, w:0.4,h:0.18, fill:{color:"FFB37A", transparency: 20+i*15}, line:{type:"none"}, rotate:90 });
  }
  drawChar(s, CH.keikyu, 3.6, 5.9, 1.6, { mouth: "○", label: false });
  speechBubble(s, "おれの\nいろと\nおなじだ!", 5.7, 1.7, 2.1, 1.4, { ink: CH.keikyu.ink, fontSize: 14 });
  caption(s, "あかいほし、かせいがみえてきました。「おれのいろとおなじだ!」とけいきゅんがびゅーんとちかづきます。", { y: 6.15, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P17 小惑星帯 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 17, count: 40 });
  const rand = seeded(99);
  for (let i = 0; i < 18; i++) {
    const x = 1 + rand() * 11, y = 1 + rand() * 4.6;
    const r = 0.08 + rand() * 0.16;
    s.addShape("ellipse", { x, y, w: r*2, h: r*2, fill: { color: "9C8F7A" }, line: { color: "6E6350", width: 0.5 } });
  }
  drawChar(s, CH.keikyu, 6.4, 6.2, 1.5, { mouth: "○", label: false });
  caption(s, "いわのかけらがたくさんとぶ「しょうわくせいたい」を、けいきゅんがびゅんびゅんよけながらはしります。", { y: 6.4, h: 0.85 });
  pageNumber(s, pageNo);
}

// ---------- P18 木星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 18, count: 40, yMax: 1.5 });
  const jx = 6.6, jy = 4.0, jr = 2.7;
  planet(s, jx, jy, jr, "E8C39E", { glow: "FFDDA8" });
  const bandColors = ["D9A868", "F1DDBB", "C98A4E", "F1DDBB"];
  bandColors.forEach((col, i) => {
    const by = jy - jr + (i + 0.7) * (jr * 2) / (bandColors.length + 1);
    const bh = jr * 0.28;
    s.addShape("ellipse", { x: jx - jr, y: by - bh/2, w: jr*2, h: bh, fill: { color: col, transparency: 25 }, line: { type: "none" } });
  });
  s.addText("もくせい", { x: jx-1.2, y: jy+jr+0.15, w: 2.4, h: 0.5, align:"center", fontSize:20, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  CAST.slice(0,4).forEach((c,i)=>drawChar(s,c, 1.0+i*0.95, 6.9, 0.7, {label:false}));
  caption(s, "いちばんおおきいほし、もくせいがどーんとあらわれました。しまもようがすてきです。", { y: 0.25, h: 0.95 });
  pageNumber(s, pageNo);
}

// ---------- P19 土星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 19, count: 45, yMax: 1.6 });
  const sx = 6.6, sy = 3.8, sr = 1.6;
  s.addShape("ellipse", { x: sx-3.0, y: sy-1.0, w: 6.0, h: 2.0, fill: { type: "none" }, line: { color: "E8C97A", width: 10, transparency: 25 }, rotate: -18 });
  planet(s, sx, sy, sr, "E8D3A0", { glow: "FFE8B0" });
  s.addText("どせい", { x: sx-1.0, y: sy+sr+0.6, w: 2.0, h: 0.5, align:"center", fontSize:18, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  drawChar(s, CH.yamanoten, 10.5, 6.4, 1.1, { mouth: "◡", label: false });
  speechBubble(s, "ぼうし\nみたい!", 1.2, 3.2, 1.9, 1.1, { ink: CH.yamanoten.ink, fontSize: 15 });
  caption(s, "わっかをもったどせいです。「わあ、ぼうしみたい!」とみんなでよろこびました。", { y: 6.5, h: 0.75 });
  pageNumber(s, pageNo);
}

// ---------- P20 天王星・海王星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 20, count: 55 });
  planet(s, 4.2, 3.6, 1.35, "9FE0E0", { glow: "C7F0F0" });
  planet(s, 9.0, 4.3, 1.55, "3B5BDB", { glow: "6B8CFF" });
  s.addText("てんのうせい", { x: 4.2-1.1, y: 5.15, w: 2.2, h: 0.45, align:"center", fontSize:15, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  s.addText("かいおうせい", { x: 9.0-1.1, y: 6.05, w: 2.2, h: 0.45, align:"center", fontSize:15, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  drawChar(s, CH.roman, 6.4, 6.7, 1.05, {label:false});
  caption(s, "とおくにあおいてんのうせいとかいおうせいがみえます。とてもつめたくて、とおいほしです。", { y: 0.35, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P21 太陽 ----------
{
  const s = newSlide();
  gradientBG(s, "070B24", "3A2A6B");
  const sx = W/2, sy = 3.8, sr = 1.7;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * 360;
    s.addShape("triangle", {
      x: sx + (sr+0.05) * Math.cos((ang*Math.PI)/180) - 0.12,
      y: sy + (sr+0.05) * Math.sin((ang*Math.PI)/180) - 0.35,
      w: 0.24, h: 0.7,
      fill: { color: "FFD166", transparency: 15 }, line: { type: "none" },
      rotate: ang + 90,
    });
  }
  planet(s, sx, sy, sr, "FFB020", { glow: "FFD166" });
  s.addText("たいよう", { x: sx-1.2, y: sy+sr+0.7, w: 2.4, h: 0.5, align:"center", fontSize:20, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0});
  caption(s, "そのまわりに、まぶしいひかりがみえました。たいようです。じぶんでひかる「こうせい」なのです。", { y: 0.35, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P22 星は遠くの太陽 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 22, count: 90 });
  [ [3.3,2.6,0.5],[7.5,2.0,0.65],[9.8,3.6,0.4],[5.6,4.6,0.35] ].forEach(([x,y,r])=>{
    s.addShape("ellipse", { x: x-r, y: y-r, w: r*2, h: r*2, fill: { color: "FFE9B0", transparency: 40 }, line: { type:"none" }, shadow:{type:"outer",color:"FFD166",opacity:0.6,blur:30,offset:0,angle:0} });
    s.addShape("star5", { x: x-r*0.4, y: y-r*0.4, w: r*0.8, h: r*0.8, fill: { color: "FFF3C4" }, line: { type: "none" } });
  });
  CAST.slice(0,3).forEach((c,i)=>drawChar(s,c, 2.2+i*1.1, 6.5, 0.85, {label:false}));
  caption(s, "よるのそらのほしも、みんなたいようのなかま。ちいさくみえるけど、ほんとはとてもおおきいのです。", { y: 0.3, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P23 星座 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 23, count: 75 });
  const pts = [ [3.0,2.2],[4.0,2.0],[5.0,2.3],[5.6,3.1],[5.0,3.9],[4.0,3.9],[3.2,3.3] ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
    s.addShape("line", { x: Math.min(x1,x2), y: Math.min(y1,y2), w: Math.abs(x2-x1)||0.01, h: Math.abs(y2-y1)||0.01, line: { color: "FFD166", width: 2, dashType: "dash" }, flipV: y2 < y1, flipH: x2 < x1 });
  }
  pts.forEach(([x,y])=>{
    s.addShape("star5", { x: x-0.12, y: y-0.12, w: 0.24, h: 0.24, fill: { color: "FFD166" }, line: { type: "none" } });
  });
  drawChar(s, CH.roman, 9.2, 5.9, 1.7, { mouth: "◡", label: false });
  speechBubble(s, "あ、\nでんしゃの\nかたちだ!", 6.6, 4.6, 2.1, 1.5, { ink: CH.roman.ink, fontSize: 14 });
  caption(s, "ろまんちゃんがほしをつないでみました。「あ、でんしゃのかたちだ!」あたらしいせいざのできあがり。", { y: 6.4, h: 0.9 });
  pageNumber(s, pageNo);
}

// ---------- P24 流れ星 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 24, count: 60 });
  s.addShape("triangle", { x: 7.6, y: 1.1, w: 3.2, h: 0.5, fill: { color: "FFD166", transparency: 10 }, line: { type: "none" }, rotate: 250 });
  s.addShape("star5", { x: 7.3, y: 1.55, w: 0.5, h: 0.5, fill: { color: "FFF3C4" }, line: { type: "none" } });
  const positions = [[1.7,6.6],[3.1,6.6],[4.5,6.6],[5.9,6.6],[7.3,6.6],[8.7,6.6],[10.1,6.6]];
  CAST.forEach((c,i)=>{
    const [x,y]=positions[i];
    drawChar(s,c,x,y,0.85,{label:false});
  });
  caption(s, "ひとつのほしがすーっとながれました。りゅうせいです! みんなでおねがいごとをしました。", { y: 3.2, h: 1.9, y2:0 });
  pageNumber(s, pageNo);
}

// ---------- P25 うえとうくんの橋 ----------
{
  const s = newSlide();
  nightBG(s, { seed: 25, count: 55 });
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const x = 1.5 + t * 10.0;
    const y = 3.6 + Math.sin(t * Math.PI) * -1.6;
    s.addShape("star5", { x, y, w: 0.2, h: 0.2, fill: { color: "FFD166" }, line: { type: "none" } });
  }
  drawChar(s, CH.uenotokyo, 6.6, 5.9, 1.9, { mouth: "⌣" });
  speechBubble(s, "そろそろ、\nかえろう", 8.4, 4.0, 2.2, 1.3, { ink: CH.uenotokyo.ink, fontSize: 16 });
  caption(s, "うえとうくんがひかるはしをつくりました。「そろそろ、かえろう。」", { y: 0.3, h: 1.0 });
  pageNumber(s, pageNo);
}

// ---------- P26 地球ふたたび ----------
{
  const s = newSlide();
  nightBG(s, { seed: 26, count: 45, yMax: 3.0 });
  planet(s, 4.6, 4.1, 2.6, "2E86DE", { glow: "5AA9FF" });
  [[-1.0,-0.8,1.3,0.8],[0.6,0.2,1.1,0.7],[-0.3,1.2,1.5,0.7]].forEach(([dx,dy,w,h])=>{
    s.addShape("ellipse", { x: 4.6+dx-w/2, y: 4.1+dy-h/2, w, h, fill: { color: "27AE60" }, line:{type:"none"} });
  });
  s.addText("♡", { x: 7.35, y: 1.55, w: 1.0, h: 0.7, fontSize: 30, align:"center", color:"FF6B81", margin:0 });
  CAST.slice(0,3).forEach((c,i)=>drawChar(s,c, 9.3+i*1.1, 6.7, 0.75, {label:false}));
  caption(s, "かえりみち、もういちどちきゅうをみました。あたたかくて、いのちにあふれた、せかいでひとつだけのほしです。", { y: 0.35, h: 1.05 });
  pageNumber(s, pageNo);
}

// ---------- P27 あさやけ降下 ----------
{
  const s = newSlide();
  gradientBG(s, "241B4E", "F6A24C");
  s.addShape("ellipse", { x: W/2-3.2, y: 4.6, w: 6.4, h: 6.4, fill: { color: "FFD9A0" }, line: { type: "none" } });
  starfield(s, 27, 15, { yMax: 2.2 });
  const positions = [[2.2,4.6],[4.0,4.1],[5.8,3.6],[7.6,3.2],[9.4,2.9],[11.0,2.6],[12.2,2.4]];
  CAST.forEach((c,i)=>{
    const [x,y]=positions[i];
    drawChar(s,c,x,y,0.9,{label:false});
  });
  caption(s, "しゅっしゅっぽっぽ、そらからおりていきます。とうかいくんのすきなあさやけのいろがみえてきました。", { y: 6.3, h: 0.9 });
  pageNumber(s, pageNo);
}

// ---------- P28 到着 ----------
{
  const s = newSlide();
  gradientBG(s, "3A2A6B", "F6A24C");
  s.addShape("rect", { x: 0, y: 5.7, w: W, h: 0.18, fill: { color: "3A3F55" }, line: { type: "none" } });
  const startX = 1.9, gap = 1.6;
  CAST.forEach((c,i)=> drawChar(s, c, startX + i*gap, 5.7, 1.0, { mouth: "⌣" }));
  caption(s, "さいごのえきにつきました。みんなちょっぴりねむいけど、にこにこかおです。「たのしかったね。」", { y: 0.4, h: 1.1 });
  pageNumber(s, pageNo);
}

// ---------- P29 おやすみ ----------
{
  const s = newSlide();
  nightBG(s, { seed: 29, count: 60 });
  planet(s, 10.2, 1.7, 1.1, "F1EAD6", { glow: "FFF3C4" });
  drawChar(s, CH.roman, 4.0, 5.6, 2.1, { sleepy: true, mouth: "⌣" });
  speechBubble(s, "またこんど、\nいっしょに\nほしを\nみようね", 5.8, 3.0, 2.6, 2.0, { ink: CH.roman.ink, fontSize: 15 });
  s.addText("おやすみなさい", { x: 0.85, y: 6.55, w: 6, h: 0.6, fontSize: 22, bold: true, italic:true, color: "FFD166", fontFace: "Bookman Old Style", margin: 0 });
  pageNumber(s, pageNo);
}

// ---------- P30 キャスト紹介・おしまい ----------
{
  const s = newSlide();
  nightBG(s, { seed: 30, count: 50 });
  s.addText("でんしゃトークの なかまたち", {
    x: 0.7, y: 0.35, w: 8, h: 0.6, fontSize: 26, bold: true, color: "FFD166", fontFace: "Bookman Old Style", margin: 0,
  });
  const infos = [
    [CH.roman, "ほしをみるのがすきな ゆめみるや", CH.roman.name],
    [CH.yamanoten, "ぐるぐるまわるのがとくい", ""],
    [CH.ginjiro, "ものしりなおじいさん", ""],
    [CH.maruko, "おしゃべりがだいすき", ""],
    [CH.keikyu, "とにかくはやいのがじまん", ""],
    [CH.tokaido, "うみのけしきがすき", ""],
    [CH.uenotokyo, "まちとまちをつなぐまとめやく", ""],
  ];
  const cols = 4, cardW = 2.85, cardH = 2.7, gapX = 0.15, gapY = 0.25;
  const startX = 0.65, startY = 1.2;
  infos.forEach(([c, trait], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);
    s.addShape("roundRect", { x: cx, y: cy, w: cardW, h: cardH, rectRadius: 0.12, fill: { color: "0A0F2E", transparency: 15 }, line: { color: c.color, width: 1.5 } });
    drawChar(s, c, cx + cardW/2, cy + 1.75, 1.25, { label: false });
    s.addText(c.name, { x: cx+0.1, y: cy+1.95, w: cardW-0.2, h: 0.35, align:"center", fontSize:14, bold:true, color:"FFF8ED", fontFace:"Bookman Old Style", margin:0 });
    s.addText(trait, { x: cx+0.1, y: cy+2.3, w: cardW-0.2, h: 0.35, align:"center", fontSize:10.5, color:"CADCFC", fontFace:"Calibri", margin:0 });
  });
  s.addText("おしまい", { x: W-3.0, y: H-0.9, w: 2.4, h: 0.6, align:"right", fontSize: 22, bold: true, italic: true, color: "FFD166", fontFace: "Bookman Old Style", margin: 0 });
  pageNumber(s, pageNo);
}

pres.writeFile({ fileName: "densha-talk-hoshizora-ehon.pptx" }).then(() => {
  console.log("done: " + pageNo + " slides");
});
