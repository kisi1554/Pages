"use strict";
/* ============================================================
   ぐるぐるアース：まる窓の そら・おと・はなび
   ============================================================ */

/* ============================================================
   6. まる窓：えらんだ まちの そら（ちじょうから みた ようす）
   ============================================================ */
const gCv = document.getElementById("ground"), gx = gCv.getContext("2d");
const GW = gCv.width, GH = gCv.height;
const groundStars = Array.from({ length: 60 }, () => ({
  x: Math.random() * GW, y: Math.random() * GH * 0.62, r: Math.random() * 1.6 + 0.5, ph: Math.random() * 7
}));

function mixHex(a, b, t) {
  const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
  const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
  return "rgb(" + pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(",") + ")";
}

function drawGround() {
  const c = CITIES[S.city];
  const { alt, az } = sunSky(c);
  const h = cityHour(c);
  const pod = partOfDay(h);
  const horizon = GH * 0.70;
  const dl = dayLength(c), rise = 12 - dl / 2, set = 12 + dl / 2;
  const dec = subSolar().lat * RAD, la = c.lat * RAD;
  /* その じかんの たいようの たかさ（がっこうで ならう しきと おなじ） */
  const altAt = hh => Math.asin(clamp(Math.sin(la) * Math.sin(dec) +
      Math.cos(la) * Math.cos(dec) * Math.cos((hh - 12) * 15 * RAD), -1, 1)) * DEG;
  const skyX = hh => GW * (0.13 + 0.74 * ((dl <= 0 || dl >= 24)
      ? clamp(hh / 24, 0, 1) : clamp((hh - rise) / (set - rise), 0, 1)));
  const skyY = a => horizon - (a / 90) * GH * 0.86;

  gx.save();
  gx.beginPath(); gx.arc(GW / 2, GH / 2, GW / 2, 0, 7); gx.clip();

  /* そらの いろ：たいようの たかさで きまる */
  let top, bottom, sunTint;
  if (alt >= 14)      { top = "#2E7FD4"; bottom = "#B9E4FF"; sunTint = "#FFF6D8"; }
  else if (alt >= 0)  { const t = alt / 14;
                        top = mixHex("#4A3D8F", "#2E7FD4", t); bottom = mixHex("#FF9A5E", "#B9E4FF", t); }
  else if (alt >= -10){ const t = (alt + 10) / 10;
                        top = mixHex("#101A44", "#4A3D8F", t); bottom = mixHex("#2A2350", "#FF9A5E", t); }
  else                { top = "#060B22"; bottom = "#16234F"; }
  if (alt >= 0 && alt < 14) { const t = alt / 14; bottom = mixHex("#FF9A5E", "#B9E4FF", t); sunTint = mixHex("#FF9A3C", "#FFF6D8", t); }
  if (alt < 0) sunTint = "#FFB870";

  const sky = gx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, top); sky.addColorStop(1, bottom);
  gx.fillStyle = sky; gx.fillRect(0, 0, GW, horizon);

  /* ほし（よるだけ） */
  if (alt < -3) {
    const a = clamp((-alt - 3) / 9, 0, 1);
    groundStars.forEach(s => {
      gx.globalAlpha = a * (0.45 + 0.55 * Math.abs(Math.sin(S.time * 1.4 + s.ph)));
      gx.fillStyle = "#ffffff";
      gx.beginPath(); gx.arc(s.x, s.y, s.r, 0, 7); gx.fill();
    });
    gx.globalAlpha = 1;
    /* おつきさま */
    const mh = ((h + 12) % 24), mx = skyX(mh);
    const my = horizon - Math.sin(clamp((mh - rise) / (set - rise || 1), 0, 1) * Math.PI) * GH * 0.45 - 12;
    if (mh > rise && mh < set) {
      gx.fillStyle = "rgba(255,252,225,.95)";
      gx.beginPath(); gx.arc(mx, my, 15, 0, 7); gx.fill();
      gx.fillStyle = top;
      gx.beginPath(); gx.arc(mx + 7, my - 4, 13, 0, 7); gx.fill();
    }
  }

  /* たいようの とおりみち（てんせん） */
  if (dl > 0.2 && dl < 23.8) {
    gx.save();
    gx.setLineDash([4, 7]); gx.lineWidth = 2;
    gx.strokeStyle = alt < -3 ? "rgba(180,200,255,.20)" : "rgba(255,255,255,.36)";
    gx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const hh = rise + (set - rise) * k / 40;
      const x = skyX(hh), y = skyY(altAt(hh));
      k ? gx.lineTo(x, y) : gx.moveTo(x, y);
    }
    gx.stroke(); gx.restore();
  }

  /* おひさま */
  if (alt > -5) {
    const sx = skyX(h);
    const sy = skyY(alt);
    const g = gx.createRadialGradient(sx, sy, 0, sx, sy, 62);
    g.addColorStop(0, "rgba(255,246,214,.95)");
    g.addColorStop(.22, "rgba(255,206,110,.55)");
    g.addColorStop(1, "rgba(255,170,70,0)");
    gx.fillStyle = g; gx.beginPath(); gx.arc(sx, sy, 62, 0, 7); gx.fill();
    gx.fillStyle = sunTint || "#FFF3CF";
    gx.beginPath(); gx.arc(sx, sy, 17, 0, 7); gx.fill();
  }

  /* とおくの やま */
  const night = alt < -3;
  gx.fillStyle = night ? "#101B3E" : (alt < 8 ? "#4A4270" : "#7FA6C8");
  gx.beginPath(); gx.moveTo(0, horizon);
  gx.lineTo(GW * 0.10, horizon - 34); gx.lineTo(GW * 0.24, horizon - 8);
  gx.lineTo(GW * 0.40, horizon - 42); gx.lineTo(GW * 0.56, horizon - 6);
  gx.lineTo(GW * 0.74, horizon - 30); gx.lineTo(GW, horizon - 12);
  gx.lineTo(GW, horizon); gx.closePath(); gx.fill();

  /* じめん */
  const gnd = gx.createLinearGradient(0, horizon, 0, GH);
  if (night) { gnd.addColorStop(0, "#16224A"); gnd.addColorStop(1, "#0A1130"); }
  else       { gnd.addColorStop(0, alt < 8 ? "#4E6B4A" : "#6FA25C"); gnd.addColorStop(1, "#2F4A34"); }
  gx.fillStyle = gnd; gx.fillRect(0, horizon, GW, GH - horizon);

  /* まちの いえ（よるは まどが ひかる） */
  const houses = [[GW*0.14, 34, 30], [GW*0.30, 26, 24], [GW*0.80, 30, 27]];
  houses.forEach(([hx, hh, hw]) => {
    gx.fillStyle = night ? "#1E2A56" : "#E8DCC8";
    gx.fillRect(hx - hw / 2, horizon - hh, hw, hh);
    gx.fillStyle = night ? "#2A3768" : "#C8593F";
    gx.beginPath(); gx.moveTo(hx - hw / 2 - 5, horizon - hh);
    gx.lineTo(hx, horizon - hh - 15); gx.lineTo(hx + hw / 2 + 5, horizon - hh); gx.closePath(); gx.fill();
    gx.fillStyle = night ? "#FFD98A" : "#8FA8C0";
    gx.fillRect(hx - 5, horizon - hh + 9, 10, 10);
  });

  /* き */
  gx.fillStyle = night ? "#132046" : "#6B4B2A";
  gx.fillRect(GW * 0.62 - 4, horizon - 26, 8, 26);
  gx.fillStyle = night ? "#16264F" : (alt < 8 ? "#3E6B45" : "#4F9B52");
  gx.beginPath(); gx.arc(GW * 0.62, horizon - 34, 20, 0, 7); gx.fill();

  /* こども（そらの ようすで かおが かわる） */
  const cx = GW * 0.47, cy = horizon + 16;
  gx.fillStyle = night ? "#28356B" : "#F2C9A0";
  gx.beginPath(); gx.arc(cx, cy, 17, 0, 7); gx.fill();
  gx.fillStyle = night ? "#1B2450" : "#4E7CD6";
  gx.beginPath(); gx.roundRect ? gx.roundRect(cx - 13, cy + 13, 26, 26, 8) : gx.rect(cx - 13, cy + 13, 26, 26);
  gx.fill();
  gx.font = "22px system-ui, sans-serif";
  gx.textAlign = "center"; gx.textBaseline = "middle";
  gx.fillText(pod.face, cx, cy + 1);

  /* ひがし と にし */
  gx.font = "600 12px system-ui, sans-serif";
  gx.textAlign = "center"; gx.textBaseline = "middle";
  gx.fillStyle = night ? "rgba(190,205,255,.72)" : "rgba(255,255,255,.82)";
  gx.fillText("ひがし", GW * 0.16, horizon + 15);
  gx.fillText("にし",  GW * 0.85, horizon + 15);

  /* ふちの かげ */
  const vig = gx.createRadialGradient(GW/2, GH/2, GW*0.30, GW/2, GH/2, GW*0.52);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.42)");
  gx.fillStyle = vig; gx.fillRect(0, 0, GW, GH);
  gx.restore();
  return { alt, az, h, pod };
}

/* ============================================================
   7. おと（かんたんな WebAudio）
   ============================================================ */
let AC = null;
function ac() {
  if (!AC) { const K = window.AudioContext || window.webkitAudioContext; if (K) AC = new K(); }
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
function beep(freq, dur, type, vol, delay) {
  if (!S.sound) return;
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol || 0.16, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.25));
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + (dur || 0.25) + 0.05);
}
/** 国の名前などを 読みあげる（音声ファイルは つかわない） */
function speak(text) {
  if (!S.sound || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = 0.95; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (e) {}
}

const sfx = {
  tap:   () => beep(660, 0.10, "triangle", 0.10),
  ok:    () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.34, "triangle", 0.15, i * 0.09)); },
  star:  () => { [784, 1175].forEach((f, i) => beep(f, 0.5, "sine", 0.14, i * 0.11)); },
  wrong: () => { beep(300, 0.2, "sawtooth", 0.07); beep(220, 0.28, "sawtooth", 0.07, 0.1); }
};

/* ============================================================
   8. はなび（クリアの えんしゅつ）
   ============================================================ */
const fxCv = document.getElementById("fx"), fxc = fxCv.getContext("2d");
let confetti = [];
function burst() {
  const cx = fxCv.width / 2, cy = fxCv.height * 0.42;
  const cols = ["#FFB43C", "#4FD8C6", "#8B7BFF", "#FF7A59", "#FFE9A8"];
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 8) * DPR;
    confetti.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * DPR,
      c: cols[i % cols.length], s: (3 + Math.random() * 5) * DPR, r: Math.random() * 7, vr: (Math.random() - .5) * .4, life: 1 });
  }
}
function drawFx() {
  fxc.clearRect(0, 0, fxCv.width, fxCv.height);
  if (!confetti.length) return;
  confetti.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.22 * DPR; p.vx *= 0.99; p.r += p.vr; p.life -= 0.012;
    fxc.save(); fxc.translate(p.x, p.y); fxc.rotate(p.r);
    fxc.globalAlpha = clamp(p.life, 0, 1); fxc.fillStyle = p.c;
    fxc.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
    fxc.restore();
  });
  confetti = confetti.filter(p => p.life > 0 && p.y < fxCv.height + 40);
}
