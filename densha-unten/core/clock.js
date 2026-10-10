// ゲーム内時刻。秒（その日の0時からの秒数）で持つ。

export class GameClock {
  constructor(t = 0) { this.t = t; this.paused = false; }
  tick(dt) { if (!this.paused) this.t += dt; return this.t; }
}

const pad = n => String(n).padStart(2, "0");

/** 14:00:05 の形 */
export function formatTime(t, withSec = true) {
  if (t == null || !Number.isFinite(t)) return "--:--" + (withSec ? ":--" : "");
  const x = Math.floor(t + 1e-6);
  const h = Math.floor(x / 3600) % 24, m = Math.floor(x / 60) % 60, s = x % 60;
  return withSec ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
}

/** 時刻表ふうの短い表示（14 00 05 → "00 05" の分秒だけなど）*/
export function formatMinSec(t) {
  const x = Math.floor(t + 1e-6);
  return `${pad(Math.floor(x / 60) % 60)}${pad(x % 60)}`;
}

/** 遅れ +1:05 / 早着 -0:10 */
export function formatDelay(sec) {
  const sign = sec > 0 ? "+" : sec < 0 ? "-" : "±";
  const a = Math.round(Math.abs(sec));
  return `${sign}${Math.floor(a / 60)}:${pad(a % 60)}`;
}
