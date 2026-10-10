// 開始画面（路線の選択・設定）と結果画面（駅ごとの定刻・実際の着時刻・停止位置のずれ）。

import { formatTime } from "../core/clock.js";
import { ruby } from "./staff.js";

const KEY = "densha-unten:settings";

export function loadSettings() {
  const def = { assist: true, sound: true, announce: true, route: null, mode: "real", direction: "down" };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { return def; }
}
export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 保存できなくても続ける */ }
}

export function showStart(routes, settings, onStart) {
  const $ = id => document.getElementById(id);
  $("startScreen").hidden = false;
  const list = $("routeList");
  if (!routes.length) { list.innerHTML = `<p class="muted">ろせんデータが よみこめませんでした</p>`; return; }
  let sel = routes.findIndex(r => r.route.meta.id === settings.route);
  if (sel < 0) sel = 0;
  list.innerHTML = routes.map((r, i) => {
    const m = r.route.meta, st = r.route.stations;
    return `<button class="route-card${i === sel ? " sel" : ""}" data-i="${i}">
      <span class="mark" style="background:${m.lineColor}">${m.symbol}</span>
      <span><b>${ruby(m.name, m.kana)}</b><small>${ruby(r.route.timetable.type, r.route.timetable.typeKana || "")}　${st[0].name} ⇄ ${st[st.length - 1].name}（${st.length}えき・${((st[st.length - 1].stop - st[0].stop) / 1000).toFixed(1)}km）</small></span>
    </button>`;
  }).join("");
  // むき: 下り（JSON の順）と上り（逆向き）
  let dir = settings.direction === "up" ? "up" : "down";
  const dirList = $("dirList");
  const drawDirs = () => {
    const st = routes[sel].route.stations, a = st[0], b = st[st.length - 1];
    dirList.innerHTML = [["down", a, b], ["up", b, a]].map(([d, x, y]) =>
      `<button class="dir-btn${d === dir ? " sel" : ""}" data-d="${d}">${ruby(x.name, x.kana)} → ${ruby(y.name, y.kana)}</button>`).join("");
    dirList.querySelectorAll(".dir-btn").forEach(btn => btn.addEventListener("click", () => { dir = btn.dataset.d; drawDirs(); }));
  };
  drawDirs();
  list.querySelectorAll(".route-card").forEach(b => b.addEventListener("click", () => {
    sel = +b.dataset.i;
    list.querySelectorAll(".route-card").forEach(x => x.classList.toggle("sel", x === b));
    drawDirs();
  }));
  document.querySelectorAll('input[name="mode"]').forEach(r => { r.checked = r.value === settings.mode; });
  $("optAssist").checked = settings.assist;
  $("optSound").checked = settings.sound;
  $("optAnnounce").checked = settings.announce;
  const btn = $("startBtn");
  btn.disabled = false;
  btn.onclick = () => {
    const m = document.querySelector('input[name="mode"]:checked');
    settings.mode = m ? m.value : "real";
    settings.assist = $("optAssist").checked;
    settings.sound = $("optSound").checked;
    settings.announce = $("optAnnounce").checked;
    settings.route = routes[sel].route.meta.id;
    settings.direction = dir;
    saveSettings(settings);
    $("startScreen").hidden = true;
    onStart(routes[sel], settings);
  };
}

export function showResult(records, onAgain, free = false) {
  const $ = id => document.getElementById(id);
  const rows = records.slice(1).map(r => {
    let pos = "-", cls = "";
    if (r.status === "pass") { pos = "つうか"; cls = "pass"; }
    else if (r.error != null) {
      const e = r.error;
      pos = Math.abs(e) < 0.05 ? "ぴったり" : e > 0 ? `${e.toFixed(1)}m ゆきすぎ` : `${(-e).toFixed(1)}m てまえ`;
      cls = r.status === "over" ? "over" : "ok";
    }
    const late = r.arr != null && r.schedArr != null ? Math.round(r.arr - r.schedArr) : null;
    const lateTxt = late == null || late === 0 ? "" : `<small>${Math.abs(late)}びょう ${late > 0 ? "おくれ" : "はやい"}</small>`;
    return `<tr><td>${ruby(r.station.name, r.station.kana)}</td><td class="t">${free ? "-" : formatTime(r.schedArr)}</td>
      <td class="t">${r.arr == null ? "-" : formatTime(r.arr)}${free ? "" : lateTxt}</td><td class="${cls}">${pos}</td></tr>`;
  });
  $("resultBody").innerHTML = rows.join("");
  const ok = records.slice(1).filter(r => r.status === "ok").length;
  const last = records[records.length - 1];
  const stopped = records.slice(1).filter(r => r.status !== "pass" && r.status != null).length;
  $("resultLead").innerHTML = free
    ? `じゆう うんてん ${records[0].station.name} → ${last.station.name}。${stopped}えきに とまって、${ok}えきで ±3m いないに とめたよ。`
    : `${records[0].station.name} → ${last.station.name}。${records.length - 1}えきの うち ${ok}えきで ±3m いないに とめたよ。`;
  $("resultScreen").hidden = false;
  $("againBtn").onclick = () => { $("resultScreen").hidden = true; onAgain(); };
}
