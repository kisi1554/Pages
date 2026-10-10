// 停車とドア扱いの状態機械。
// 走行中 → ドアを開ける → 停車中 → ドアを閉める → 出発準備完了 → 走行中

export const S = {
  RUN: "run",           // 走行中（次の停車駅へ）
  OPENING: "opening",   // 止まった。まもなくドアが開く
  OPEN: "open",         // 停車中（ドアが開いている）
  CLOSING: "closing",   // ドアを閉めている
  READY: "ready",       // 出発準備完了（知らせ灯が点いている）
  DONE: "done",         // 終着
};

export const JUDGE = { SHORT: 3, OVER_OK: 3, OVER_MAX: 10 };
const STILL_TIME = 1;      // 速度0が続いたら判定するまでの時間
const OPEN_DELAY = 1.6;    // 判定からドアが開くまで
const MIN_OPEN = 15;       // ドアが開いている最短時間
const CLOSE_BEFORE = 10;   // 発車時刻の何秒前に閉め始めるか
const CLOSE_TIME = 4;      // ドアが閉まりきるまで
const DEPART_DIST = 2;     // 止まった位置からこれだけ進んだら発車
const FINISH_DELAY = 5;    // 終着でドアが開いてから結果画面まで

export class StationController {
  /**
   * rows: buildTimetable の結果。startTime: ゲーム開始時刻（始発駅でドアが開いた状態）
   */
  constructor(rows, startTime) {
    this.rows = rows;
    this.idx = 0;
    this.state = S.OPEN;
    this.timer = 0;
    this.still = 0;
    this.judged = false;
    this.message = "";
    this.stopS = rows[0].station.stop;
    this.openedAt = startTime - MIN_OPEN;
    this.finishAt = null;
    this.records = rows.map(r => ({ station: r.station, schedArr: r.arr, schedDep: r.dep, arr: null, dep: null, error: null, status: null }));
    this.records[0].status = "ok";
    this.records[0].error = 0;
  }

  get doorsClosed() { return this.state !== S.OPEN && this.state !== S.CLOSING; }
  get target() { return this.rows[this.idx]; }

  /** いまの遅れ（秒）。止まっている駅は着時刻、走っているときは直前の発車時刻で比べる */
  delay(t) {
    const r = this.records[this.idx];
    if (this.state === S.RUN && this.idx > 0) {
      const p = this.records[this.idx - 1];
      if (p.dep != null && p.schedDep != null) return p.dep - p.schedDep;
      return 0;
    }
    if (r.arr != null && r.schedArr != null) return r.arr - r.schedArr;
    if (this.state === S.READY && r.schedDep != null) return Math.max(0, t - r.schedDep);
    return 0;
  }

  /**
   * 1刻み進める。train: { s, v, braking }。発生したイベント名の配列を返す
   *   doorOpen / doorClose / doorClosed / buzzer / depart / arrive / short / overrun / pass / finish
   */
  update(t, dt, train) {
    const ev = [];
    const st = this.target.station;
    const last = this.idx === this.rows.length - 1;
    switch (this.state) {
      case S.RUN: {
        const d = st.stop - train.s; // 正なら手前
        if (Math.abs(train.v) < 0.05) this.still += dt;
        else { this.still = 0; this.judged = false; if (this.message && d < JUDGE.SHORT) this.message = ""; }
        if (train.s > st.stop + JUDGE.OVER_MAX) {
          // 停車駅を通過（10mを超えて行き過ぎ）
          const rec = this.records[this.idx];
          rec.status = "pass"; rec.error = train.s - st.stop;
          this.message = `${st.name}を つうか してしまった`;
          ev.push("pass");
          if (last) { this.state = S.DONE; ev.push("finish"); }
          else this.idx++;
          this.still = 0;
          break;
        }
        if (this.still >= STILL_TIME && train.braking && !this.judged) {
          this.judged = true;
          if (d > JUDGE.SHORT) {
            if (d < st.length + 40) { this.message = `${Math.round(d)}m てまえ。ぜんしん してください`; ev.push("short"); }
          } else {
            const rec = this.records[this.idx];
            rec.arr = t - this.still;
            rec.error = -d; // 正なら行き過ぎ
            rec.status = d >= -JUDGE.OVER_OK ? "ok" : "over";
            this.message = rec.status === "ok" ? "" : `${Math.round(-d)}m ゆきすぎ`;
            if (rec.status === "over") ev.push("overrun");
            ev.push("arrive");
            this.state = S.OPENING; this.timer = 0; this.stopS = train.s;
          }
        }
        break;
      }
      case S.OPENING:
        this.timer += dt;
        if (this.timer >= OPEN_DELAY) {
          this.state = S.OPEN; this.openedAt = t; ev.push("doorOpen");
          if (last) this.finishAt = t + FINISH_DELAY;
          if (this.message.endsWith("ゆきすぎ")) {/* 表示を残す */} else this.message = "";
        }
        break;
      case S.OPEN: {
        if (last) {
          if (t >= this.finishAt) { this.state = S.DONE; ev.push("finish"); }
          break;
        }
        const dep = this.target.dep;
        const closeAt = Math.max(this.openedAt + MIN_OPEN, dep - CLOSE_BEFORE);
        if (t >= closeAt) { this.state = S.CLOSING; this.timer = 0; this.message = ""; ev.push("doorClose"); }
        break;
      }
      case S.CLOSING:
        this.timer += dt;
        if (this.timer >= CLOSE_TIME) { this.state = S.READY; ev.push("doorClosed", "buzzer"); }
        break;
      case S.READY:
        if (train.s >= this.stopS + DEPART_DIST) {
          this.records[this.idx].dep = t;
          this.idx++;
          this.state = S.RUN; this.still = 0; this.judged = false;
          ev.push("depart");
        }
        break;
    }
    return ev;
  }
}
