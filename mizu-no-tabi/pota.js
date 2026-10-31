/* ぽた（しずくの キャラクター）を canvas に かく。
   mode: drop（しずく）/ vapor（水じょうき＝見えない。点線の りんかく だけ）/ tiny（小さな 水の つぶ）/ snow（ゆきの けっしょう）
   face: happy / wow / cold / sleep / yay / sad */
function drawPota(ctx, x, y, r, mode, face, t) {
  t = t || 0;
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 3) * r * 0.04;
  ctx.translate(0, bob);
  if (mode === "tiny") r *= 0.62;

  function body() {
    ctx.beginPath();
    if (mode === "tiny") { ctx.arc(0, 0, r, 0, Math.PI * 2); return; }
    ctx.moveTo(0, -r * 1.45);
    ctx.bezierCurveTo(r * 0.35, -r * 0.9, r * 1.02, -r * 0.35, r * 1.0, r * 0.25);
    ctx.arc(0, r * 0.2, r, 0.05, Math.PI - 0.05);
    ctx.bezierCurveTo(-r * 1.02, -r * 0.35, -r * 0.35, -r * 0.9, 0, -r * 1.45);
    ctx.closePath();
  }

  if (mode === "snow") {
    ctx.strokeStyle = "#ffffff"; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(80,140,200,.7)"; ctx.shadowBlur = r * 0.25;
    ctx.lineWidth = r * 0.16;
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 3 + t * 0.3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 1.4);
      ctx.moveTo(0, -r * 0.85); ctx.lineTo(r * 0.35, -r * 1.15);
      ctx.moveTo(0, -r * 0.85); ctx.lineTo(-r * 0.35, -r * 1.15);
      ctx.stroke(); ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = "#eef8ff"; ctx.fill();
    ctx.lineWidth = r * 0.06; ctx.strokeStyle = "#8ec5ea"; ctx.stroke();
    faceAt(0, 0, r * 0.62);
    ctx.restore();
    return;
  }

  if (mode === "vapor") {
    // 水じょうき は 目に 見えない。点線の りんかく だけ。
    body();
    ctx.setLineDash([r * 0.18, r * 0.16]);
    ctx.lineDashOffset = -t * r * 0.8;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.strokeStyle = "rgba(60,120,170,.75)";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.45;
    faceAt(0, r * 0.15, r);
    ctx.restore();
    return;
  }

  // ふつうの しずく
  body();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.2, r * 0.1, 0, r * 0.1, r * 1.3);
  g.addColorStop(0, "#d6f5ff"); g.addColorStop(0.45, "#5cc6ef"); g.addColorStop(1, "#1786c9");
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.strokeStyle = "#0b6aa6"; ctx.stroke();
  // ひかり
  ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.25, r * 0.13, r * 0.3, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fill();
  faceAt(0, mode === "tiny" ? 0 : r * 0.18, r);
  ctx.restore();

  function faceAt(fx, fy, s) {
    const ink = "#123a5c";
    ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.2, s * 0.08);
    const ex = s * 0.34, ey = fy - s * 0.12, er = s * 0.11;
    const blink = (face !== "sleep") && (Math.sin(t * 1.3) > 0.985);
    // ほっぺ
    ctx.globalAlpha *= 1;
    ctx.fillStyle = face === "cold" ? "rgba(120,170,255,.6)" : "rgba(255,140,170,.55)";
    ctx.beginPath(); ctx.ellipse(fx - s * 0.56, fy + s * 0.12, s * 0.14, s * 0.09, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + s * 0.56, fy + s * 0.12, s * 0.14, s * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = ink;
    [-1, 1].forEach(function (k) {
      const cx = fx + k * ex;
      if (face === "sleep" || blink) {
        ctx.beginPath(); ctx.arc(cx, ey, er, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      } else if (face === "yay") {
        ctx.beginPath(); ctx.arc(cx, ey + er * 0.5, er * 1.1, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
      } else if (face === "cold") {
        ctx.beginPath(); ctx.moveTo(cx - er, ey - er * 0.6); ctx.lineTo(cx + er, ey); ctx.lineTo(cx - er, ey + er * 0.6); ctx.stroke();
      } else {
        const big = face === "wow" ? 1.35 : 1;
        ctx.beginPath(); ctx.arc(cx, ey, er * big, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + er * 0.35, ey - er * 0.35, er * 0.35, 0, 7); ctx.fill();
        ctx.fillStyle = ink;
      }
    });
    const my = fy + s * 0.22;
    ctx.beginPath();
    if (face === "wow") { ctx.ellipse(fx, my + s * 0.04, s * 0.1, s * 0.14, 0, 0, 7); ctx.fill(); }
    else if (face === "yay") { ctx.arc(fx, my - s * 0.04, s * 0.2, 0.05 * Math.PI, 0.95 * Math.PI); ctx.closePath(); ctx.fillStyle = "#c2255c"; ctx.fill(); }
    else if (face === "cold") { ctx.moveTo(fx - s * 0.2, my); for (let i = 1; i <= 4; i++) ctx.lineTo(fx - s * 0.2 + i * s * 0.1, my + (i % 2 ? -1 : 1) * s * 0.05); ctx.stroke(); }
    else if (face === "sad") { ctx.arc(fx, my + s * 0.12, s * 0.14, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
    else if (face === "sleep") { ctx.arc(fx, my, s * 0.07, 0, 7); ctx.stroke(); }
    else { ctx.arc(fx, my - s * 0.06, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  }
}

/* 雲・つぶ の 小さな 絵 */
function drawSpeck(ctx, x, y, r, ice) {
  ctx.save(); ctx.translate(x, y);
  if (ice) {
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = r * 0.35; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(60,120,190,.8)"; ctx.shadowBlur = 4;
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7);
    ctx.fillStyle = "#9edcf7"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#1c7ed6"; ctx.stroke();
  }
  ctx.restore();
}
