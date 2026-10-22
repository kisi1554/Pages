// やきゅう しあい — キャラクター（batting-center の くま・ねこ・ロボと おなじ かきかた）
// 1 = 1m、げんてんは あしもと。かおの パーツ（め・くち・ほっぺ・あせ）と ひょうじょう（normal / joy / sad / oops）は
// batting-center と おなじ。せんしゅごとの かおの しゅるいは LOOKS（teams.js の えもじ を キーに する）。
(function (root) {
  "use strict";
  let ctx = null;
  let now = 0;

  // ===== せんしゅの みため =====
  const L = (kind, fur, fur2, more) => Object.assign({ kind, fur, fur2 }, more || {});
  const LOOKS = {
    // どうぶつ
    "🐰": L("rabbit", "#f8f9fa", "#ffb3c8"),
    "🐿️": L("squirrel", "#b5651d", "#f5d6a8"),
    "🦁": L("lion", "#ffd166", "#c8742a"),
    "🐘": L("elephant", "#9aa5b1", "#d6dde5"),
    "🐻": L("bear", "#9a6233", "#e8c69a"),
    "🦊": L("fox", "#f08c2e", "#fff6ea"),
    "🐵": L("monkey", "#8d5a32", "#f5cfa5"),
    "🐼": L("panda", "#ffffff", "#2b2b2b"),
    "🐱": L("cat", "#fff6ea", "#f39a3d", { fur3: "#3b3030" }),
    // でんしゃ（ロボの かお を でんしゃの まえ に）
    "🚋": L("train", "#2f9e44", "#fff3bf", { top: "panta" }),
    "🚝": L("train", "#e9ecef", "#1c7ed6", { top: "rail", round: true }),
    "🚄": L("train", "#ffffff", "#1971c2", { nose: true }),
    "🚂": L("train", "#343a40", "#e03131", { top: "chimney" }),
    "🚇": L("train", "#adb5bd", "#f08c00"),
    "🚅": L("train", "#f8f9fa", "#e03131", { nose: true }),
    "🚠": L("train", "#e8590c", "#ffe8cc", { top: "cable" }),
    "🚞": L("train", "#8d5a32", "#ffd8a8", { round: true }),
    "🚃": L("train", "#ffd43b", "#1c7ed6", { top: "panta" }),
    // きょうりゅう
    "🦎": L("dino", "#82c91e", "#d8f5a2"),
    "🐍": L("dino", "#40c057", "#fab005", { tongue: true }),
    "🐉": L("dino", "#e03131", "#ffd43b", { spikes: true, horns: true }),
    "🦖": L("dino", "#2f9e44", "#c0eb75", { spikes: true, teeth: true }),
    "🦕": L("dino", "#4dabf7", "#d0ebff", { tall: true }),
    "🐊": L("dino", "#5c940d", "#e9fac8", { teeth: true, bumps: true }),
    "🦤": L("bird", "#868e96", "#ffd43b"),
    "🐢": L("dino", "#94d82d", "#e9fac8", { shell: "#8d5a32" }),
    "🐲": L("dino", "#20c997", "#fff3bf", { spikes: true, horns: true }),
    // おかし
    "🍬": L("sweet", "#ff8cc6", "#ffffff", { top: "wrap" }),
    "🍪": L("sweet", "#d9a066", "#5c3317", { top: "chips" }),
    "🍩": L("sweet", "#e8a85c", "#ff8cc6", { top: "icing" }),
    "🍰": L("sweet", "#fff3e0", "#ffffff", { top: "cream" }),
    "🍮": L("sweet", "#ffd43b", "#8a4b16", { top: "caramel" }),
    "🍦": L("sweet", "#fff9db", "#f3d39a", { top: "swirl" }),
    "🍡": L("sweet", "#ffc9de", "#b2f2bb", { top: "stick" }),
    "🍘": L("sweet", "#c98a4b", "#2b2b2b", { top: "nori" }),
    "🍫": L("sweet", "#6b3e26", "#4a2a18", { top: "grid" }),
  };
  const lookOf = (pl) => (pl && LOOKS[pl.emoji]) || LOOKS["🐻"];

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function oval(x, y, rx, ry, c, rot) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill(); }

  // ===== かおの パーツ（batting-center から） =====
  function drawEyes(x, y, m, color, led) {
    const blink = m === "normal" && (now % 3.3) < 0.12;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.024; ctx.lineCap = "round";
    [-1, 1].forEach((side) => {
      const ex = x + side * 0.09;
      ctx.beginPath();
      if (m === "joy") {
        ctx.moveTo(ex - 0.045, y + 0.015); ctx.quadraticCurveTo(ex, y - 0.05, ex + 0.045, y + 0.015); ctx.stroke();
      } else if (m === "sad") {
        ctx.moveTo(ex + side * 0.04, y - 0.035); ctx.lineTo(ex - side * 0.035, y); ctx.lineTo(ex + side * 0.04, y + 0.035); ctx.stroke();
      } else if (blink) {
        ctx.moveTo(ex - 0.035, y); ctx.lineTo(ex + 0.035, y); ctx.stroke();
      } else {
        const r = m === "oops" ? 0.05 : 0.04;
        if (led) { rr(ex - r * 0.8, y - r, r * 1.6, r * 2, r * 0.5); ctx.fill(); }
        else {
          ctx.ellipse(ex, y, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(ex + 0.012, y - 0.016, r * 0.32, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = color;
        }
      }
    });
  }
  function drawMouth(x, y, m, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 0.02; ctx.lineCap = "round";
    ctx.beginPath();
    if (m === "joy") {
      ctx.fillStyle = "#b8292f";
      ctx.moveTo(x - 0.06, y - 0.01); ctx.quadraticCurveTo(x, y + 0.1, x + 0.06, y - 0.01); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff8a9a";
      ctx.beginPath(); ctx.ellipse(x, y + 0.035, 0.025, 0.015, 0, 0, Math.PI * 2); ctx.fill();
    } else if (m === "sad") {
      ctx.moveTo(x - 0.04, y + 0.025); ctx.quadraticCurveTo(x, y - 0.02, x + 0.04, y + 0.025); ctx.stroke();
    } else if (m === "oops") {
      ctx.fillStyle = "#b8292f"; ctx.ellipse(x, y + 0.01, 0.022, 0.028, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.moveTo(x - 0.035, y); ctx.quadraticCurveTo(x, y + 0.035, x + 0.035, y); ctx.stroke();
    }
  }
  function drawSweat(x, y) {
    ctx.fillStyle = "#7cc8ff";
    ctx.beginPath(); ctx.moveTo(x, y - 0.06); ctx.quadraticCurveTo(x + 0.04, y, x, y + 0.02); ctx.quadraticCurveTo(x - 0.04, y, x, y - 0.06); ctx.fill();
  }
  function cheeks(x, y) {
    oval(x - 0.15, y, 0.045, 0.028, "rgba(255,110,130,.45)");
    oval(x + 0.17, y, 0.045, 0.028, "rgba(255,110,130,.45)");
  }
  function helmetCap(color, hy) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, hy, 0.28, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
    oval(0.14, hy - 0.03, 0.17, 0.035, "rgba(0,0,0,.18)", -0.08);
    oval(-0.08, hy - 0.2, 0.07, 0.03, "rgba(255,255,255,.35)", -0.4);
  }

  // ===== あたま =====
  function drawHead(lk, hy, m, cap) {
    const fx = 0.03;
    const k = lk.kind;
    const face = (eyeY, eyeC, mouthY, mouthC, ck) => {
      drawEyes(fx, eyeY, m, eyeC);
      drawMouth(fx, mouthY, m, mouthC);
      if (ck || m === "joy") cheeks(fx, eyeY + 0.07);
    };
    if (k === "bear" || k === "panda") {
      const ear = k === "panda" ? lk.fur2 : lk.fur;
      dot(0, hy, 0.27, lk.fur);
      helmetCap(cap, hy);
      [-1, 1].forEach((sd) => { dot(sd * 0.22, hy - 0.2, 0.09, ear); dot(sd * 0.22, hy - 0.2, 0.045, k === "panda" ? "#555" : "#e89aa0"); });
      if (k === "panda") [-1, 1].forEach((sd) => oval(fx + sd * 0.09, hy, 0.065, 0.075, lk.fur2, sd * -0.5));
      oval(fx, hy + 0.1, 0.12, 0.085, k === "panda" ? "#fff" : lk.fur2);
      oval(fx, hy + 0.06, 0.045, 0.03, "#3a2210");
      if (k === "bear") {
        ctx.strokeStyle = "#3a2210"; ctx.lineWidth = 0.028;
        ctx.beginPath(); ctx.moveTo(fx - 0.14, hy - 0.08); ctx.lineTo(fx - 0.05, hy - 0.06); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 0.14, hy - 0.08); ctx.lineTo(fx + 0.05, hy - 0.06); ctx.stroke();
      }
      drawEyes(fx, hy - 0.01, m, k === "panda" ? "#fff" : "#2a1606");
      drawMouth(fx, hy + 0.13, m, "#3a2210");
      if (m === "joy") cheeks(fx, hy + 0.05);
    } else if (k === "cat" || k === "fox") {
      dot(0, hy, 0.27, lk.fur);
      ctx.save();
      ctx.beginPath(); ctx.arc(0, hy, 0.27, 0, Math.PI * 2); ctx.clip();
      if (k === "cat") { dot(-0.2, hy - 0.06, 0.16, lk.fur2); dot(0.24, hy - 0.04, 0.1, lk.fur3); }
      else oval(fx, hy + 0.16, 0.22, 0.15, lk.fur2);
      ctx.restore();
      helmetCap(cap, hy);
      const ears = k === "cat" ? [[-1, lk.fur2], [1, lk.fur3]] : [[-1, lk.fur], [1, lk.fur]];
      ears.forEach(([sd, col]) => {
        const big = k === "fox" ? 1.25 : 1;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(sd * 0.1, hy - 0.24); ctx.lineTo(sd * 0.25 * big, hy - 0.42 * big); ctx.lineTo(sd * 0.28, hy - 0.17); ctx.closePath(); ctx.fill();
        ctx.fillStyle = k === "fox" ? "#3b2a20" : "#ffb3c8";
        ctx.beginPath(); ctx.moveTo(sd * 0.16, hy - 0.24); ctx.lineTo(sd * 0.24 * big, hy - 0.35 * big); ctx.lineTo(sd * 0.25, hy - 0.22); ctx.closePath(); ctx.fill();
      });
      if (k === "cat") {
        ctx.strokeStyle = "rgba(60,40,40,.7)"; ctx.lineWidth = 0.01;
        [-1, 1].forEach((sd) => [-0.03, 0.01, 0.05].forEach((d) => {
          ctx.beginPath(); ctx.moveTo(fx + sd * 0.1, hy + 0.08 + d * 0.3); ctx.lineTo(fx + sd * 0.3, hy + 0.04 + d); ctx.stroke();
        }));
      }
      drawEyes(fx, hy, m, k === "cat" ? "#2a6b2a" : "#3b2a20");
      ctx.fillStyle = k === "cat" ? "#ff7a9a" : "#2b2b2b";
      ctx.beginPath(); ctx.moveTo(fx - 0.025, hy + 0.06); ctx.lineTo(fx + 0.025, hy + 0.06); ctx.lineTo(fx, hy + 0.085); ctx.closePath(); ctx.fill();
      if (m === "normal") {
        ctx.strokeStyle = "#5a3a3a"; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.arc(fx - 0.025, hy + 0.1, 0.025, 0, Math.PI); ctx.arc(fx + 0.025, hy + 0.1, 0.025, 0, Math.PI); ctx.stroke();
      } else drawMouth(fx, hy + 0.12, m, "#5a3a3a");
      cheeks(fx, hy + 0.06);
    } else if (k === "rabbit") {
      [-1, 1].forEach((sd) => {
        oval(sd * 0.11, hy - 0.4, 0.075, 0.2, lk.fur, sd * 0.15);
        oval(sd * 0.11, hy - 0.39, 0.035, 0.15, lk.fur2, sd * 0.15);
      });
      dot(0, hy, 0.27, lk.fur);
      helmetCap(cap, hy);
      dot(fx, hy + 0.06, 0.03, "#ff7a9a");
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#ccc"; ctx.lineWidth = 0.008;
      rr(fx - 0.03, hy + 0.1, 0.06, 0.05, 0.01); ctx.fill(); ctx.stroke();
      drawEyes(fx, hy - 0.01, m, "#c2255c");
      if (m !== "normal") drawMouth(fx, hy + 0.12, m, "#5a3a3a");
      cheeks(fx, hy + 0.06);
    } else if (k === "squirrel") {
      [-1, 1].forEach((sd) => {
        ctx.fillStyle = lk.fur;
        ctx.beginPath(); ctx.moveTo(sd * 0.1, hy - 0.22); ctx.lineTo(sd * 0.2, hy - 0.4); ctx.lineTo(sd * 0.27, hy - 0.16); ctx.closePath(); ctx.fill();
        dot(sd * 0.2, hy - 0.41, 0.035, "#7a4210");
      });
      dot(0, hy, 0.27, lk.fur);
      helmetCap(cap, hy);
      oval(fx - 0.12, hy + 0.1, 0.1, 0.08, lk.fur2);
      oval(fx + 0.14, hy + 0.1, 0.1, 0.08, lk.fur2);
      dot(fx, hy + 0.06, 0.028, "#3a2210");
      ctx.fillStyle = "#fff"; rr(fx - 0.025, hy + 0.1, 0.05, 0.045, 0.01); ctx.fill();
      drawEyes(fx, hy - 0.02, m, "#2a1606");
      if (m !== "normal") drawMouth(fx, hy + 0.13, m, "#5a3a3a");
      if (m === "joy") cheeks(fx, hy + 0.05);
    } else if (k === "lion") {
      // たてがみ
      ctx.fillStyle = lk.fur2;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.arc(Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3, 0.1, 0, Math.PI * 2); }
      ctx.fill();
      dot(0, hy, 0.25, lk.fur);
      helmetCap(cap, hy);
      [-1, 1].forEach((sd) => { dot(sd * 0.2, hy - 0.19, 0.06, lk.fur); dot(sd * 0.2, hy - 0.19, 0.03, lk.fur2); });
      oval(fx, hy + 0.1, 0.11, 0.075, "#fff3d6");
      oval(fx, hy + 0.055, 0.04, 0.028, "#6b3a1a");
      face(hy - 0.01, "#3b2a20", hy + 0.13, "#6b3a1a");
    } else if (k === "elephant") {
      [-1, 1].forEach((sd) => { oval(sd * 0.3, hy + 0.02, 0.16, 0.2, lk.fur, sd * 0.2); oval(sd * 0.3, hy + 0.02, 0.1, 0.14, "#f3c6cf", sd * 0.2); });
      dot(0, hy, 0.26, lk.fur);
      helmetCap(cap, hy);
      // はな
      ctx.strokeStyle = lk.fur; ctx.lineWidth = 0.09; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(fx, hy + 0.05); ctx.quadraticCurveTo(fx + 0.02, hy + 0.25, fx + 0.12, hy + 0.27); ctx.stroke();
      drawEyes(fx, hy - 0.02, m, "#2a2a2a");
      if (m === "joy") cheeks(fx, hy + 0.06);
    } else if (k === "monkey") {
      [-1, 1].forEach((sd) => { dot(sd * 0.27, hy + 0.02, 0.08, lk.fur); dot(sd * 0.27, hy + 0.02, 0.045, lk.fur2); });
      dot(0, hy, 0.27, lk.fur);
      helmetCap(cap, hy);
      oval(fx - 0.075, hy - 0.01, 0.1, 0.09, lk.fur2);
      oval(fx + 0.075, hy - 0.01, 0.1, 0.09, lk.fur2);
      oval(fx, hy + 0.1, 0.15, 0.1, lk.fur2);
      face(hy - 0.01, "#2a1606", hy + 0.12, "#5a3a3a");
    } else if (k === "dino") {
      if (lk.spikes) {
        ctx.fillStyle = lk.fur2;
        [-0.16, -0.05, 0.06, 0.17].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x - 0.05, hy - 0.22 - (i % 2) * 0.02); ctx.lineTo(x, hy - 0.38); ctx.lineTo(x + 0.05, hy - 0.22); ctx.closePath(); ctx.fill(); });
      }
      if (lk.tall) oval(0, hy - 0.12, 0.17, 0.22, lk.fur);
      oval(0, hy, 0.28, 0.25, lk.fur);
      if (lk.shell) { ctx.fillStyle = lk.shell; ctx.beginPath(); ctx.arc(0, hy + 0.03, 0.3, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); }
      else helmetCap(cap, hy);
      if (lk.horns) [-1, 1].forEach((sd) => { ctx.fillStyle = "#fff3bf"; ctx.beginPath(); ctx.moveTo(sd * 0.12, hy - 0.22); ctx.lineTo(sd * 0.24, hy - 0.42); ctx.lineTo(sd * 0.22, hy - 0.18); ctx.closePath(); ctx.fill(); });
      if (lk.bumps) [-0.1, 0.12].forEach((x) => dot(x, hy - 0.06, 0.05, lk.fur));
      // はなさき（おおきな くち）
      oval(fx, hy + 0.11, 0.2, 0.1, lk.fur2);
      dot(fx - 0.05, hy + 0.07, 0.014, "#2b2b2b"); dot(fx + 0.05, hy + 0.07, 0.014, "#2b2b2b");
      if (lk.teeth) { ctx.fillStyle = "#fff"; [-0.08, -0.03, 0.02, 0.07].forEach((x) => { ctx.beginPath(); ctx.moveTo(fx + x, hy + 0.14); ctx.lineTo(fx + x + 0.025, hy + 0.14); ctx.lineTo(fx + x + 0.0125, hy + 0.18); ctx.closePath(); ctx.fill(); }); }
      if (lk.tongue && m !== "sad") { ctx.strokeStyle = "#e03131"; ctx.lineWidth = 0.018; ctx.beginPath(); ctx.moveTo(fx, hy + 0.17); ctx.lineTo(fx, hy + 0.24); ctx.lineTo(fx - 0.025, hy + 0.27); ctx.moveTo(fx, hy + 0.24); ctx.lineTo(fx + 0.025, hy + 0.27); ctx.stroke(); }
      drawEyes(fx, hy - 0.05, m, "#2a2a2a");
      drawMouth(fx, hy + 0.15, m, "#2b5000");
      if (m === "joy") cheeks(fx, hy + 0.02);
    } else if (k === "bird") {
      dot(0, hy, 0.27, lk.fur);
      helmetCap(cap, hy);
      ctx.fillStyle = "#fff"; [-0.04, 0, 0.04].forEach((x, i) => oval(x, hy - 0.3 - i % 2 * 0.02, 0.025, 0.06, "#fff"));
      // くちばし
      ctx.fillStyle = lk.fur2;
      ctx.beginPath(); ctx.moveTo(fx - 0.09, hy + 0.05); ctx.quadraticCurveTo(fx, hy + 0.02, fx + 0.11, hy + 0.08); ctx.quadraticCurveTo(fx + 0.1, hy + 0.2, fx, hy + 0.18); ctx.quadraticCurveTo(fx - 0.08, hy + 0.14, fx - 0.09, hy + 0.05); ctx.fill();
      drawEyes(fx, hy - 0.04, m, "#2a2a2a");
      if (m === "joy") cheeks(fx, hy + 0.03);
    } else if (k === "train") {
      // でんしゃの まえ（ロボの かお と おなじ ならび: まど の なかに LED の め）
      if (lk.top === "panta") {
        ctx.strokeStyle = "#495057"; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(-0.12, hy - 0.25); ctx.lineTo(0.02, hy - 0.4); ctx.lineTo(0.12, hy - 0.25); ctx.moveTo(-0.15, hy - 0.4); ctx.lineTo(0.15, hy - 0.4); ctx.stroke();
      } else if (lk.top === "chimney") {
        ctx.fillStyle = "#212529"; rr(-0.07, hy - 0.42, 0.14, 0.2, 0.02); ctx.fill();
        oval(0, hy - 0.42, 0.1, 0.03, "#495057");
        oval(0.06, hy - 0.5, 0.06, 0.04, "rgba(255,255,255,.8)");
      } else if (lk.top === "cable") {
        ctx.strokeStyle = "#495057"; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(0, hy - 0.25); ctx.lineTo(0, hy - 0.42); ctx.moveTo(-0.3, hy - 0.44); ctx.lineTo(0.3, hy - 0.4); ctx.stroke();
      } else if (lk.top === "rail") {
        ctx.fillStyle = "#868e96"; rr(-0.2, hy - 0.33, 0.4, 0.08, 0.03); ctx.fill();
      }
      ctx.fillStyle = lk.fur;
      if (lk.nose) { ctx.beginPath(); ctx.ellipse(0, hy + 0.02, 0.27, 0.28, 0, 0, Math.PI * 2); ctx.fill(); }
      else { rr(-0.26, hy - 0.25, 0.52, 0.48, lk.round ? 0.18 : 0.1); ctx.fill(); }
      ctx.fillStyle = lk.fur2; ctx.fillRect(-0.27, hy + 0.09, 0.54, 0.05);
      if (lk.nose) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, hy + 0.02, 0.27, 0.28, 0, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = lk.fur2; ctx.fillRect(-0.3, hy + 0.09, 0.6, 0.05); ctx.restore(); }
      dot(-0.18, hy + 0.17, 0.035, "#fff59d"); dot(0.18, hy + 0.17, 0.035, "#fff59d");
      ctx.fillStyle = "#1d2340";
      rr(fx - 0.2, hy - 0.13, 0.4, 0.2, 0.07); ctx.fill();
      drawEyes(fx, hy - 0.03, m, "#5ff2ff", true);
      ctx.fillStyle = "#3a4256"; rr(fx - 0.08, hy + 0.16, 0.16, 0.05, 0.02); ctx.fill();
      ctx.fillStyle = m === "joy" ? "#ffd23f" : m === "sad" ? "#7cc8ff" : "#5ff2ff";
      const bars = m === "joy" ? [0.5, 0.9, 1, 0.9, 0.5] : m === "sad" ? [0.3, 0.3, 0.3, 0.3, 0.3] : [0.4, 0.6, 0.4, 0.6, 0.4];
      bars.forEach((h, i) => ctx.fillRect(fx - 0.065 + i * 0.028, hy + 0.185 - 0.02 * h, 0.016, 0.04 * h));
    } else if (k === "sweet") {
      const t = lk.top;
      if (t === "stick") { ctx.strokeStyle = "#c08a4a"; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0, hy - 0.5); ctx.lineTo(0, hy - 0.2); ctx.stroke(); dot(0, hy - 0.4, 0.11, lk.fur2); }
      if (t === "wrap") [-1, 1].forEach((sd) => { ctx.fillStyle = lk.fur; ctx.beginPath(); ctx.moveTo(sd * 0.22, hy); ctx.lineTo(sd * 0.42, hy - 0.12); ctx.lineTo(sd * 0.42, hy + 0.12); ctx.closePath(); ctx.fill(); });
      if (t === "swirl") { oval(0, hy - 0.25, 0.2, 0.08, lk.fur); oval(0, hy - 0.33, 0.12, 0.06, lk.fur); dot(0.02, hy - 0.4, 0.04, lk.fur); }
      if (t === "grid") { ctx.fillStyle = lk.fur; rr(-0.27, hy - 0.26, 0.54, 0.52, 0.06); ctx.fill(); }
      else if (t === "caramel") { ctx.fillStyle = lk.fur; ctx.beginPath(); ctx.moveTo(-0.2, hy - 0.22); ctx.lineTo(0.2, hy - 0.22); ctx.lineTo(0.29, hy + 0.24); ctx.lineTo(-0.29, hy + 0.24); ctx.closePath(); ctx.fill(); }
      else dot(0, hy, 0.27, lk.fur);
      if (t === "icing") {
        ctx.fillStyle = lk.fur2; ctx.beginPath(); ctx.moveTo(-0.27, hy - 0.02);
        ctx.arc(0, hy, 0.27, Math.PI, Math.PI * 2);
        for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(0.27 - i * 0.09 + 0.045, hy + (i % 2 ? 0.02 : 0.08), 0.27 - i * 0.09, hy - 0.02);
        ctx.fill();
        ["#fff", "#74c0fc", "#ffd43b", "#8ce99a"].forEach((c, i) => { ctx.fillStyle = c; ctx.save(); ctx.translate(-0.15 + i * 0.1, hy - 0.16 + (i % 2) * 0.06); ctx.rotate(i); ctx.fillRect(-0.025, -0.008, 0.05, 0.016); ctx.restore(); });
      } else if (t === "cream") {
        ctx.fillStyle = lk.fur2; ctx.beginPath(); ctx.arc(0, hy, 0.27, Math.PI, Math.PI * 2); ctx.fill();
        [-0.18, -0.06, 0.06, 0.18].forEach((x) => dot(x, hy - 0.02, 0.06, lk.fur2));
        dot(0, hy - 0.3, 0.07, "#e03131"); dot(0.02, hy - 0.37, 0.025, "#2f9e44");
      } else if (t === "caramel") {
        ctx.fillStyle = lk.fur2; ctx.beginPath(); ctx.moveTo(-0.2, hy - 0.22); ctx.lineTo(0.2, hy - 0.22); ctx.lineTo(0.22, hy - 0.12); ctx.quadraticCurveTo(0.1, hy - 0.06, 0, hy - 0.12); ctx.quadraticCurveTo(-0.1, hy - 0.06, -0.22, hy - 0.12); ctx.closePath(); ctx.fill();
      } else if (t === "chips") {
        [[-0.15, -0.12], [0.14, -0.15], [-0.18, 0.12], [0.19, 0.08], [0.02, -0.21]].forEach(([x, y]) => dot(x, hy + y, 0.03, lk.fur2));
      } else if (t === "nori") {
        ctx.fillStyle = lk.fur2; ctx.fillRect(-0.27, hy + 0.12, 0.54, 0.12);
      } else if (t === "grid") {
        ctx.strokeStyle = lk.fur2; ctx.lineWidth = 0.015;
        ctx.strokeRect(-0.22, hy - 0.21, 0.44, 0.42);
        ctx.beginPath(); ctx.moveTo(0, hy - 0.21); ctx.lineTo(0, hy - 0.08); ctx.moveTo(-0.22, hy - 0.08); ctx.lineTo(0.22, hy - 0.08); ctx.stroke();
      } else if (t === "swirl") {
        oval(-0.1, hy - 0.04, 0.06, 0.03, lk.fur2); oval(0.12, hy - 0.06, 0.05, 0.025, lk.fur2);
      } else if (t === "wrap") {
        ctx.strokeStyle = lk.fur2; ctx.lineWidth = 0.04;
        [-0.16, 0, 0.16].forEach((x) => { ctx.beginPath(); ctx.moveTo(x - 0.06, hy - 0.24); ctx.lineTo(x + 0.06, hy - 0.16); ctx.stroke(); });
      }
      drawEyes(fx, hy + 0.01, m, "#3b2a20");
      drawMouth(fx, hy + 0.12, m, "#5a3a3a");
      cheeks(fx, hy + 0.07);
    }
    if (m === "sad" || m === "oops") drawSweat(0.3, hy - 0.12);
  }

  // ===== からだ と どうぐ =====
  // o: { u（スイング）, bat, bunt, glove, arm（なげる うでの かくど）, mood, run（はしる 0〜1 の いそう） }
  const SWING_DUR = 0.28, LEAD = 0.06;
  function batPose(u) {
    let ang = -2.2, len = 0.85;
    const cu = LEAD / SWING_DUR;
    if (u >= 0 && u < 1) {
      if (u < cu) {
        ang = -2.2 + (-2 * Math.PI + 2.2) * (u / cu);
        len = 0.85 * (0.55 + 0.45 * Math.abs(Math.cos(ang)));
      } else {
        const v = (u - cu) / (1 - cu);
        ang = -2.6 * v;
        len = 0.85 * (1 - 0.6 * Math.sin(Math.PI * v));
      }
    }
    return { ang, len };
  }
  function drawChara(c2d, px, py, s, team, pl, o, time) {
    ctx = c2d; now = time || 0;
    o = o || {};
    const lk = lookOf(pl);
    const m = o.mood || "normal";
    const skin = lk.kind === "train" || lk.kind === "sweet" ? lk.fur : lk.fur;
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    oval(0, 0, 0.42, 0.08, "rgba(0,0,0,.25)");
    const lift = m === "joy" ? 0.1 * Math.abs(Math.sin(now * 9)) : 0;
    ctx.translate(0, -lift);
    // あし・くつ（はしる ときは まえうしろに）
    const st = o.run != null ? Math.sin(o.run * Math.PI * 2) * 0.12 : 0;
    ctx.strokeStyle = "#f4f4f4"; ctx.lineWidth = 0.17;
    ctx.beginPath(); ctx.moveTo(-0.16 + st, -0.06); ctx.lineTo(-0.12, -0.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.18 - st, -0.06); ctx.lineTo(0.12, -0.45); ctx.stroke();
    oval(-0.18 + st, -0.04, 0.13, 0.06, "#222");
    oval(0.21 - st, -0.04, 0.13, 0.06, "#222");
    // からだ（ユニフォーム）
    ctx.fillStyle = team.color2 || "#fff";
    rr(-0.27, -0.94, 0.54, 0.54, 0.16); ctx.fill();
    ctx.strokeStyle = team.color; ctx.lineWidth = 0.025; ctx.stroke();
    ctx.fillStyle = team.color; ctx.fillRect(-0.27, -0.5, 0.54, 0.06);
    if (o.num != null) {
      ctx.fillStyle = team.color; ctx.font = "900 0.22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(o.num), -0.02, -0.7);
    }
    // うで
    ctx.strokeStyle = skin; ctx.lineWidth = 0.1;
    if (o.bat || o.bunt) {
      const hands = o.bunt ? { x: 0.05, y: -0.86 } : { x: 0.28, y: -0.82 };
      const bp = o.bunt ? { ang: -0.12, len: 0.8 } : batPose(o.u == null ? -1 : o.u);
      ctx.beginPath(); ctx.moveTo(0.12, -0.84); ctx.lineTo(hands.x, hands.y); ctx.stroke();
      ctx.save();
      ctx.translate(hands.x, hands.y); ctx.rotate(bp.ang);
      const bg = ctx.createLinearGradient(0, -0.04, 0, 0.04);
      bg.addColorStop(0, "#f3d39a"); bg.addColorStop(1, "#b98a43");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-0.05, -0.018); ctx.lineTo(bp.len, -0.042); ctx.arc(bp.len, 0, 0.042, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-0.05, 0.018); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#333"; ctx.fillRect(-0.06, -0.022, 0.1, 0.044);
      ctx.restore();
      dot(hands.x, hands.y, 0.06, skin);
    } else {
      // ひだり: グラブ、みぎ: なげる うで
      const swing = o.run != null ? Math.sin(o.run * Math.PI * 2) * 0.5 : 0;
      const la = o.glove ? 2.3 : 1.9 + swing;
      ctx.beginPath(); ctx.moveTo(-0.22, -0.84); ctx.lineTo(-0.22 + Math.cos(la) * 0.32, -0.84 + Math.sin(la) * 0.32); ctx.stroke();
      if (o.glove) dot(-0.22 + Math.cos(la) * 0.36, -0.84 + Math.sin(la) * 0.36, 0.09, "#8a4b16");
      const ra = o.arm != null ? o.arm : 1.2 - swing;
      const hx = 0.22 + Math.cos(ra) * 0.34, hy2 = -0.84 + Math.sin(ra) * 0.34;
      ctx.beginPath(); ctx.moveTo(0.22, -0.84); ctx.lineTo(hx, hy2); ctx.stroke();
      dot(hx, hy2, 0.055, skin);
      if (o.arm != null && o.ballInHand) dot(hx, hy2 - 0.03, 0.045, "#fff");
    }
    // あたま
    drawHead(lk, -1.18, m, team.cap || team.color);
    ctx.restore();
  }

  // メニューの こまかい え（バッティングセンターの キャラえらびと おなじ）
  function preview(canvas, team, pl, mood) {
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const w = canvas.clientWidth || 44, h = canvas.clientHeight || 54;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    // むねから うえ（かおを おおきく）
    const s = h / 1.3;
    drawChara(c, w / 2 - s * 0.03, h + s * 0.2, s, team, pl, { glove: true, mood: mood || "normal" }, 0.5);
  }
  // かおだけ（うえから みた ずの まる）
  function face(c2d, x, y, r, team, pl, mood) {
    ctx = c2d;
    ctx.save();
    ctx.translate(x, y + r * 0.15); ctx.scale(r / 0.36, r / 0.36);
    drawHead(lookOf(pl), 0, mood || "normal", team.cap || team.color);
    ctx.restore();
  }

  root.YC = { LOOKS, lookOf, drawChara, preview, face, SWING_DUR };
})(this);
