// 起動・画面遷移・ゲームの進行。
//   ?autopilot … 自動で運転する（動作確認用）   ?speed=4 … 時間を速める（動作確認用）

import { loadRouteList, loadVehicle } from "./route/loader.js";
import { buildAlignment } from "./route/alignment.js";
import { createTrainState, advance, bcPressure } from "./core/physics.js";
import { computeSignal, updateAtcBrake, trackEnd, speedLimitAt } from "./core/atc.js";
import { computeRunTimes, buildTimetable, simulateLeader, leaderPositionAt, oncomingPositions } from "./core/timetable.js";
import { StationController, S } from "./core/station.js";
import { GameClock } from "./core/clock.js";
import { Scene } from "./render/scene.js";
import { CabUI } from "./ui/cab.js";
import { Lever } from "./ui/lever.js";
import { Staff } from "./ui/staff.js";
import { Hud } from "./ui/hud.js";
import { showStart, showResult, loadSettings, saveSettings } from "./ui/screens.js";
import { Sound } from "./audio/sound.js";
import { Voice } from "./audio/voice.js";
import { announcement, soonDistance, NEXT_AFTER } from "./core/announce.js";

const params = new URLSearchParams(location.search);
const DEBUG = { autopilot: params.has("autopilot"), speed: Math.max(1, Math.min(20, +params.get("speed") || 1)) };
const $ = id => document.getElementById(id);
const settings = loadSettings();
const sound = new Sound();
const voice = new Voice();

class Game {
  constructor(route, veh, opts) {
    this.route = route; this.veh = veh; this.opts = opts;
    this.al = buildAlignment(route);
    this.free = opts.mode === "free"; // じゆう モード: ATC・先行列車・時刻表なし。速度も自由
    this.rows = buildTimetable(route, computeRunTimes(route, this.al, veh));
    this.leader = this.free ? null : simulateLeader(route, this.al, veh, this.rows);
    this.clock = new GameClock(route.timetable.startTime);
    this.train = createTrainState(route.stations[0].stop);
    this.train.notch = -7; this.train.brake = veh.brakeNotches[6];
    this.sc = new StationController(this.rows, route.timetable.startTime, { free: this.free });
    this.signal = this.free ? null : computeSignal(route, this.train.s, this.leaderTail());
    this.atcOn = false;
    this.paused = false; this.finished = false;
    this.scene = new Scene($("gl"), route, this.al, veh);
    this.cab = new CabUI(this.free ? null : route.atc.steps, this.free ? 140 : 120);
    this.lever = new Lever((n, steps) => { this.train.notch = n; this.cab.setNotch(n); sound.click(steps); });
    this.lever.set(-7, true);
    this.cab.setNotch(-7);
    this.staff = new Staff(route, this.rows, this.free);
    this.hud = new Hud(opts.assist, this.free);
    this.fps = { frames: 0, t0: performance.now(), value: 0 };
    // 車内アナウンス: 始発で行き先、発車したら「次は」、駅の手前で「まもなく」、終点で「ご乗車ありがとう」
    this.ann = { startAt: route.timetable.startTime + 3, next: null, soon: new Set() };
    document.documentElement.style.setProperty("--accent", route.meta.lineColor);
  }

  leaderTail() {
    if (!this.leader) return null;
    const p = leaderPositionAt(this.leader, this.clock.t);
    return p == null ? null : p - this.veh.length;
  }

  start() {
    this.scene.prepare(this.train.s, Infinity);
    this.lever.enabled = true;
    this.last = performance.now();
    const loop = now => {
      if (this.stopped) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (!this.paused && !this.finished) this.simulate(dt * DEBUG.speed);
      this.draw(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** 大きな dt は分けて進める（ATC・停車判定も細かく） */
  simulate(dt) {
    const n = Math.ceil(dt / 0.05);
    for (let i = 0; i < n; i++) this._tick(dt / n);
  }

  _tick(dt) {
    const { route, al, veh, train, sc } = this;
    const t = this.clock.tick(dt);
    if (!this.free) {
      const sig = computeSignal(route, train.s, this.leaderTail());
      if (sig < this.signal) sound.atcBell();
      this.signal = sig;
      this.atcOn = updateAtcBrake(this.atcOn, train.v, sig);
    }
    if (DEBUG.autopilot) this.autopilot();
    const prevBrake = train.brake, prevV = train.v;
    const env = st => {
      const mid = st.s - veh.length / 2;
      return { grade: al.grade(mid), curvature: al.curvature(mid), inTunnel: al.inTunnel(st.s), doorsClosed: sc.doorsClosed, atcBrake: this.atcOn ? route.atc.brakeDecel : 0 };
    };
    advance(train, veh, env, dt);
    // 車止め
    const end = trackEnd(route) + 20;
    if (train.s > end) { train.s = end; train.v = 0; }
    if (train.s < al.sMin + 200) { train.s = al.sMin + 200; train.v = 0; }
    // 停車中にブレーキを緩めたときの空気音
    if (Math.abs(prevV) < 0.1 && prevBrake > 1.0 && train.brake <= 1.0) sound.air();
    const ev = sc.update(t, dt, { s: train.s, v: train.v, braking: train.notch < 0 || this.atcOn });
    for (const e of ev) {
      if (e === "doorOpen") sound.doorChime(true);
      else if (e === "doorClose") sound.doorChime(false);
      else if (e === "buzzer") sound.buzzer();
      else if (e === "finish") this.finish();
      else if (e === "depart" || e === "pass") {
        if (sc.idx < this.rows.length) this.ann.next = { idx: sc.idx, at: train.s + (e === "depart" ? NEXT_AFTER : 30) };
      }
      if (e === "doorOpen" && sc.idx === this.rows.length - 1) voice.say(announcement(route, "arrive", sc.idx));
    }
    this.announce(t);
  }

  announce(t) {
    const { route, train, sc, ann } = this;
    if (ann.startAt != null && t >= ann.startAt) { voice.say(announcement(route, "start", 0)); ann.startAt = null; }
    if (ann.next && train.s >= ann.next.at) {
      if (ann.next.idx === sc.idx && sc.state === S.RUN) voice.say(announcement(route, "next", sc.idx));
      ann.next = null;
    }
    if (sc.state === S.RUN && sc.idx > 0 && !ann.soon.has(sc.idx)) {
      const d = route.stations[sc.idx].stop - train.s;
      if (d < soonDistance(route, sc.idx) && d > 15) {
        ann.soon.add(sc.idx);
        if (!ann.next) voice.say(announcement(route, "soon", sc.idx));
      }
    }
  }

  autopilot() {
    const { train, sc, route } = this;
    let n;
    if (sc.state === S.READY) n = 5;
    else if (sc.state !== S.RUN) n = -4;
    else {
      const d = sc.target.station.stop - train.s, vm = train.v / 3.6;
      const need = d > 0.3 ? vm * vm / (2 * d) : 9;
      const lim = Math.min(this.signal ?? Infinity, speedLimitAt(route, train.s));
      if (need > 0.5 || (d < 0.3 && train.v > 0)) n = -Math.min(7, Math.ceil(need * 3.6 / 0.5) + 1);
      else if (d <= 0.3) n = -4;
      else if (train.v > lim - 2) n = train.v > lim ? -3 : 0;
      else if (train.v < lim - 8) n = d < 40 ? 1 : 5;
      else n = 0;
    }
    if (n !== this.lever.notch) { this.lever.set(n, true); train.notch = n; this.cab.setNotch(n); }
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.lever.enabled = false;
    setTimeout(() => showResult(this.sc.records, () => location.reload(), this.free), 300);
  }

  draw(dt) {
    const { train, sc, al, route } = this;
    const t = this.clock.t;
    this.scene.prepare(train.s, 1);
    const others = [];
    const lp = this.leader ? leaderPositionAt(this.leader, t) : null;
    if (lp != null) others.push({ head: lp, dir: 1, track: "down", lights: "tail" });
    for (const s of oncomingPositions(route, t, train.s - 400, train.s + 2300)) others.push({ head: s, dir: -1, track: "up", lights: "head" });
    this.scene.render(train, others, t, dt);

    this.cab.drawSpeedo(train.v, this.signal);
    this.cab.setLamps(sc.doorsClosed, this.atcOn, this.signal);
    this.cab.setBars(bcPressure(this.veh, train), train.accel);
    const idx = Math.min(sc.idx, this.rows.length - 1);
    const row = this.rows[idx];
    const stopped = sc.state !== S.RUN;
    this.staff.update(idx);
    this.hud.update({
      time: t, station: row.station, stopped,
      schedTime: stopped && row.dep != null ? row.dep : row.arr,
      delay: sc.delay(t),
      dist: sc.state === S.RUN ? row.station.stop - train.s : null,
      speed: train.v, message: sc.message,
    });
    sound.update({ v: train.v, power: train.power, regen: train.brake, tunnel: al.inTunnel(train.s), s: train.s });
    // fps
    this.fps.frames++;
    const now = performance.now();
    if (now - this.fps.t0 > 1000) { this.fps.value = this.fps.frames * 1000 / (now - this.fps.t0); this.fps.frames = 0; this.fps.t0 = now; }
  }

  setPaused(p) {
    if (this.finished) return;
    this.paused = p;
    $("pauseScreen").hidden = !p;
    if (p) { sound.suspend(); voice.pause(); } else { sound.resume(); voice.resume(); this.last = performance.now(); }
  }
}

let game = null;

async function startGame(entry, opts) {
  sound.setEnabled(opts.sound);
  sound.init();
  sound.resume();
  voice.on = opts.announce !== false;
  voice.enabled = opts.sound;
  voice.unlock();
  updateSoundBtn();
  $("loading").hidden = false;
  try {
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
    const veh = await loadVehicle(entry.route.meta.vehicle);
    await new Promise(r => setTimeout(r, 30)); // 「じゅんびちゅう」を先に出す
    game = new Game(entry.route, veh, opts);
    window.__game = game;
    game.start();
  } catch (e) {
    console.error(e);
    $("loading").textContent = "うごかせませんでした: " + e.message;
    return;
  }
  $("loading").hidden = true;
}

function updateSoundBtn() { $("soundBtn").textContent = settings.sound ? "🔊" : "🔇"; }

$("soundBtn").addEventListener("click", () => {
  settings.sound = !settings.sound;
  saveSettings(settings);
  sound.setEnabled(settings.sound);
  voice.enabled = settings.sound;
  if (!settings.sound) voice.stop();
  updateSoundBtn();
});
$("pauseBtn").addEventListener("click", () => game && game.setPaused(true));
$("resumeBtn").addEventListener("click", () => game && game.setPaused(false));
$("quitBtn").addEventListener("click", () => location.reload());
document.addEventListener("visibilitychange", () => { if (document.hidden && game) game.setPaused(true); });
window.addEventListener("keydown", e => { if (e.key === "Escape" && game) game.setPaused(!game.paused); });

(async function boot() {
  updateSoundBtn();
  let routes = [];
  try { routes = await loadRouteList(); } catch (e) { console.error(e); }
  showStart(routes, settings, startGame);
  if (params.has("autostart") && routes.length) $("startBtn").click();
})();

