// スタフ（時刻表）。駅名・着時刻・発時刻。次の停車駅を強調し、自動でスクロールする。

import { formatTime } from "../core/clock.js";

export const ruby = (kanji, kana) => `<ruby>${kanji}<rt>${kana}</rt></ruby>`;

export class Staff {
  /** free: じゆう モードでは時刻のかわりに起点からの距離を出す */
  constructor(route, rows, free = false) {
    this.body = document.getElementById("staffBody");
    this.scroll = document.getElementById("staffScroll");
    document.getElementById("staffTitle").innerHTML =
      `スタフ　${route.meta.name}　${route.timetable.type}　${route.meta.service.replace(/^\S+\s*/, "")}`;
    if (free) {
      document.querySelector(".staff thead tr").innerHTML = `<th><ruby>駅<rt>えき</rt></ruby></th><th>きょり</th><th></th>`;
      document.getElementById("staffTitle").innerHTML = `じゆう うんてん　${route.meta.name}`;
      this.body.innerHTML = rows.map(r => `<tr><td>${ruby(r.station.name, r.station.kana)}</td>
        <td class="t">${(r.station.stop / 1000).toFixed(1)}km</td><td></td></tr>`).join("");
    } else this.body.innerHTML = rows.map(r => `<tr>
      <td>${ruby(r.station.name, r.station.kana)}</td>
      <td class="t">${r.arr == null ? "" : formatTime(r.arr)}</td>
      <td class="t">${r.dep == null ? "<small>しゅうてん</small>" : formatTime(r.dep)}</td></tr>`).join("");
    this.trs = [...this.body.children];
    this.cur = -1;
  }

  /** next: 次に止まる（または今止まっている）駅の番号 */
  update(next) {
    if (next === this.cur) return;
    this.cur = next;
    this.trs.forEach((tr, i) => { tr.classList.toggle("next", i === next); tr.classList.toggle("done", i < next); });
    const tr = this.trs[Math.max(0, next - 1)];
    if (tr) this.scroll.scrollTo({ top: tr.offsetTop - 20, behavior: "smooth" });
  }
}
