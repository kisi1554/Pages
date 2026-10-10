// 画面上部: 現在時刻（秒まで）、遅れ／早着、次駅、定刻。運転支援: 残距離・デジタル速度。

import { formatTime, formatDelay } from "../core/clock.js";
import { ruby } from "./staff.js";

export class Hud {
  constructor(assist) {
    const $ = id => document.getElementById(id);
    this.el = { time: $("hudTime"), next: $("hudNext"), sched: $("hudSched"), delay: $("hudDelay"), delayBox: $("hudDelayBox"),
      delayLabel: $("hudDelayLabel"), assist: $("assist"), dist: $("asDist"), speed: $("asSpeed"), msg: $("msg") };
    this.el.assist.hidden = !assist;
    this.last = {};
  }

  set(k, v, fn) { if (this.last[k] !== v) { this.last[k] = v; fn(v); } }

  update({ time, station, stopped, schedTime, delay, dist, speed, message }) {
    const e = this.el;
    this.set("time", formatTime(time), v => (e.time.textContent = v));
    this.set("next", station ? station.id + (stopped ? "*" : "") : "", () => {
      e.next.innerHTML = station ? ruby(station.name, station.kana) + (stopped ? "<small>ていしゃちゅう</small>" : "") : "-";
    });
    this.set("sched", formatTime(schedTime), v => (e.sched.textContent = v));
    const d = Math.round(delay);
    this.set("delay", d, v => {
      e.delay.textContent = formatDelay(v);
      e.delayBox.classList.toggle("late", v > 0);
      e.delayBox.classList.toggle("early", v < 0);
      e.delayLabel.innerHTML = v < 0 ? `<ruby>早<rt>はや</rt></ruby>い` : `<ruby>遅<rt>おく</rt></ruby>れ`;
    });
    if (!e.assist.hidden) {
      this.set("dist", dist == null ? "----" : String(Math.round(dist)), v => (e.dist.textContent = v));
      this.set("speed", String(Math.round(Math.abs(speed))), v => (e.speed.textContent = v));
    }
    this.set("msg", message || "", v => { e.msg.hidden = !v; e.msg.textContent = v; });
  }
}
