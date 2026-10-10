// マスコン（ワンハンドル）。縦長のレバーをドラッグして操作する。上がブレーキ、下が力行。
// 1段ごとに振動とクリック音。PC は ↑/↓ キー。

import { EB, MAX_NOTCH, notchLabel } from "../core/physics.js";

const ROWS = 14;
const rowToNotch = r => (r === 0 ? EB : r - 8);
const notchToRow = n => (n === EB ? 0 : n + 8);

export class Lever {
  constructor(onChange) {
    this.el = document.getElementById("lever");
    this.track = document.getElementById("leverTrack");
    this.knob = document.getElementById("leverKnob");
    this.knobText = document.getElementById("leverKnobText");
    this.onChange = onChange;
    this.notch = -7;
    this.enabled = false;
    this.track.innerHTML = Array.from({ length: ROWS }, (_, r) => {
      const n = rowToNotch(r);
      const k = n > 0 ? "p" : n === 0 ? "n" : n === EB ? "eb" : "b";
      return `<span class="${k}">${notchLabel(n)}</span>`;
    }).join("");

    const fromY = y => {
      const rc = this.track.getBoundingClientRect();
      const r = Math.floor((y - rc.top) / rc.height * ROWS);
      return rowToNotch(Math.max(0, Math.min(ROWS - 1, r)));
    };
    let dragging = false;
    this.el.addEventListener("pointerdown", e => {
      if (!this.enabled) return;
      dragging = true;
      this.el.setPointerCapture(e.pointerId);
      this.set(fromY(e.clientY));
      e.preventDefault();
    });
    this.el.addEventListener("pointermove", e => { if (dragging) this.set(fromY(e.clientY)); });
    const end = () => { dragging = false; };
    this.el.addEventListener("pointerup", end);
    this.el.addEventListener("pointercancel", end);
    window.addEventListener("keydown", e => {
      if (!this.enabled) return;
      if (e.key === "ArrowUp") { this.step(-1); e.preventDefault(); }
      else if (e.key === "ArrowDown") { this.step(+1); e.preventDefault(); }
    });
    window.addEventListener("resize", () => this.layout());
    this.layout();
  }

  /** dir=-1 でブレーキ側へ、+1 で力行側へ 1段 */
  step(dir) {
    const r = notchToRow(this.notch) + dir;
    if (r >= 0 && r < ROWS) this.set(rowToNotch(r));
  }

  set(n, silent = false) {
    n = Math.max(EB, Math.min(MAX_NOTCH, n));
    if (n === this.notch) return;
    const steps = Math.abs(notchToRow(n) - notchToRow(this.notch));
    this.notch = n;
    this.layout();
    this.el.setAttribute("aria-valuenow", String(n));
    this.el.setAttribute("aria-valuetext", notchLabel(n));
    if (!silent) {
      try { navigator.vibrate && navigator.vibrate(Math.min(40, 8 * steps)); } catch (e) { /* 振動できない端末 */ }
      this.onChange(n, steps);
    }
  }

  layout() {
    const h = this.track.clientHeight;
    if (!h) return;
    const rowH = h / ROWS;
    const r = notchToRow(this.notch);
    const kh = Math.min(44, Math.max(26, rowH * 1.4));
    this.knob.style.height = kh + "px";
    this.knob.style.top = (this.track.offsetTop + rowH * (r + 0.5) - kh / 2) + "px";
    this.knobText.textContent = notchLabel(this.notch);
  }
}
