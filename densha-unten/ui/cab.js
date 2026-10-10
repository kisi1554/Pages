// 運転台: 速度計（外周にATC信号のランプ）、ノッチ表示、ランプ類、BC圧・加速度のバー。

import { notchLabel, EB } from "../core/physics.js";

const VMAX = 120;
const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25; // 0km/h → 左下、120 → 右下（時計回り 270°）
const ang = v => A0 + (A1 - A0) * Math.min(1, Math.max(0, v / VMAX));

export class CabUI {
  constructor(steps) {
    this.steps = steps;
    this.cv = document.getElementById("speedo");
    this.g = this.cv.getContext("2d");
    this.base = this._drawBase();
    this.$ = id => document.getElementById(id);
    this.notchText = this.$("notchText");
    this.notchBar = this.$("notchBar");
    this.notchBar.innerHTML = Array.from({ length: 14 }, () => "<i></i>").join("");
    this.cells = [...this.notchBar.children];
    this.last = {};
  }

  _drawBase() {
    const c = document.createElement("canvas"); c.width = 400; c.height = 400;
    const g = c.getContext("2d");
    const cx = 200, cy = 200;
    g.fillStyle = "#0a0c0e"; g.beginPath(); g.arc(cx, cy, 196, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#59636d"; g.lineWidth = 4; g.stroke();
    const face = g.createRadialGradient(cx, cy - 40, 20, cx, cy, 170);
    face.addColorStop(0, "#1d2328"); face.addColorStop(1, "#0c0f12");
    g.fillStyle = face; g.beginPath(); g.arc(cx, cy, 160, 0, Math.PI * 2); g.fill();
    // 目盛り
    for (let v = 0; v <= VMAX; v += 5) {
      const a = ang(v), big = v % 10 === 0;
      const r0 = big ? 132 : 142, r1 = 156;
      g.strokeStyle = big ? "#f2f2f2" : "#9aa3ab"; g.lineWidth = big ? 4 : 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
      if (v % 20 === 0) {
        g.fillStyle = "#fff"; g.font = "700 26px 'Zen Kaku Gothic New', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(v), cx + Math.cos(a) * 108, cy + Math.sin(a) * 108);
      }
    }
    g.fillStyle = "#9aa3ab"; g.font = "600 18px 'Zen Kaku Gothic New', sans-serif"; g.textAlign = "center";
    g.fillText("km/h", cx, cy + 62);
    return c;
  }

  drawSpeedo(v, signal) {
    const g = this.g, cx = 200, cy = 200;
    g.clearRect(0, 0, 400, 400);
    g.drawImage(this.base, 0, 0);
    // ATC信号のランプ（▲）を外周に並べる。今の信号を緑で、0のときは赤で点灯
    for (const st of this.steps) {
      const a = ang(st);
      const on = st === signal;
      const col = on ? (st === 0 ? "#ff3b3b" : "#4dff8a") : "#2b3239";
      g.save();
      g.translate(cx + Math.cos(a) * 176, cy + Math.sin(a) * 176);
      g.rotate(a + Math.PI / 2);
      g.fillStyle = col;
      if (on) { g.shadowColor = col; g.shadowBlur = 14; }
      g.beginPath(); g.moveTo(0, 12); g.lineTo(-10, -8); g.lineTo(10, -8); g.closePath(); g.fill();
      g.restore();
    }
    // 針
    const a = ang(Math.abs(v));
    g.save();
    g.translate(cx, cy); g.rotate(a);
    g.fillStyle = "#ff8a1f"; g.shadowColor = "rgba(255,138,31,0.6)"; g.shadowBlur = 8;
    g.beginPath(); g.moveTo(-18, -5); g.lineTo(150, -1.5); g.lineTo(150, 1.5); g.lineTo(-18, 5); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = "#3a4249"; g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
  }

  setNotch(n) {
    if (this.last.notch === n) return;
    this.last.notch = n;
    const cls = n > 0 ? "p" : n === 0 ? "n" : n === EB ? "eb" : "b";
    this.notchText.textContent = notchLabel(n);
    this.notchText.className = "notch-text led " + cls;
    // 左から EB, B7…B1, N, P1…P5
    const idx = n === EB ? 0 : n + 8;
    this.cells.forEach((c, i) => {
      const nn = i === 0 ? EB : i - 8;
      const on = n > 0 ? (i >= 9 && i <= idx) : n === 0 ? i === 8 : (i >= idx && i <= 7);
      const k = nn > 0 ? "p" : nn === 0 ? "n" : nn === EB ? "eb" : "b";
      c.className = on ? "on " + k : "";
    });
  }

  setLamps(doorsClosed, atcBrake, signal) {
    const key = `${doorsClosed}|${atcBrake}|${signal}`;
    if (this.last.lamps === key) return;
    this.last.lamps = key;
    this.$("lampDoor").classList.toggle("on", doorsClosed);
    this.$("lampAtcB").classList.toggle("on", atcBrake);
    this.$("sigVal").textContent = String(signal).padStart(3, " ");
    this.$("lampSig").classList.toggle("zero", signal === 0);
  }

  setBars(bc, acc) {
    const b = this.$("barBC"), a = this.$("barAcc");
    b.style.width = Math.min(100, bc / 440 * 100) + "%";
    this.$("bcVal").textContent = Math.round(bc);
    const w = Math.min(50, Math.abs(acc) / 5 * 50);
    a.style.width = w + "%";
    a.style.left = acc >= 0 ? "50%" : (50 - w) + "%";
    a.classList.toggle("neg", acc < 0);
    this.$("accVal").textContent = (acc >= 0 ? "+" : "") + acc.toFixed(1);
  }
}
