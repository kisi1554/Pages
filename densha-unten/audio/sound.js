// Web Audio API で合成する効果音（音声ファイルは使わない）。
// AudioContext は開始ボタンを押したときに作る（スマホの自動再生制限への対応）。

export class Sound {
  constructor() { this.ctx = null; this.enabled = true; this.lastJoint = null; }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(c.destination);
    // ノイズの素
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.5; } // ブラウンノイズ寄り
    this.whiteBuf = c.createBuffer(1, len, c.sampleRate);
    const w = this.whiteBuf.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;

    // 走行音: フィルタを掛けたノイズ
    this.run = c.createBufferSource(); this.run.buffer = this.noiseBuf; this.run.loop = true;
    this.runF = c.createBiquadFilter(); this.runF.type = "lowpass"; this.runF.frequency.value = 300;
    this.runG = c.createGain(); this.runG.gain.value = 0;
    this.run.connect(this.runF).connect(this.runG).connect(this.master);
    this.run.start();

    // VVVF: のこぎり波＋サイン波をバンドパスで丸める
    this.vO1 = c.createOscillator(); this.vO1.type = "sawtooth";
    this.vO2 = c.createOscillator(); this.vO2.type = "sine";
    this.vF = c.createBiquadFilter(); this.vF.type = "bandpass"; this.vF.Q.value = 0.8; this.vF.frequency.value = 900;
    this.vG = c.createGain(); this.vG.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.6;
    this.vO1.connect(this.vF); this.vO2.connect(g2).connect(this.vF);
    this.vF.connect(this.vG).connect(this.master);
    this.vO1.start(); this.vO2.start();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }
  suspend() { try { this.ctx && this.ctx.suspend(); } catch (e) { /* */ } }
  resume() { try { this.ctx && this.ctx.resume(); } catch (e) { /* */ } }

  /** 毎フレーム: 速度・力行と回生の強さ・トンネル内か・位置（継ぎ目の音） */
  update({ v, power, regen, tunnel, s }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, a = Math.abs(v);
    // 走行音
    const runVol = Math.min(1, a / 90) * (tunnel ? 0.55 : 0.32);
    this.runG.gain.setTargetAtTime(runVol, t, 0.1);
    this.runF.frequency.setTargetAtTime((tunnel ? 180 : 260) + a * (tunnel ? 9 : 12), t, 0.1);
    // VVVF: 約18km/h までは周波数を固定し、そこから速度に比例して上げる
    const f = a < 18 ? 380 : Math.min(2600, 380 * a / 18);
    this.vO1.frequency.setTargetAtTime(f, t, 0.05);
    this.vO2.frequency.setTargetAtTime(f * 2.02, t, 0.05);
    this.vF.frequency.setTargetAtTime(Math.min(3500, f * 1.6), t, 0.05);
    const drive = Math.max(power / 3.3, a > 3 ? regen / 3.5 : 0);
    this.vG.gain.setTargetAtTime(a < 0.3 && power < 0.05 ? 0 : drive * 0.07 * (tunnel ? 1.3 : 1), t, 0.06);
    // レールの継ぎ目（25m ごと）: 台車2つぶん「タタン タタン」
    if (a > 2) {
      const j = Math.floor(s / 25);
      if (this.lastJoint != null && j !== this.lastJoint) {
        const ms = a / 3.6;
        const gap = [0, 2.1, 13.8, 15.9].map(x => x / ms);
        for (const dt of gap) if (dt < 3) this._thump(t + dt, Math.min(1, a / 60) * (tunnel ? 0.5 : 0.35));
      }
      this.lastJoint = j;
    }
  }

  _thump(at, vol) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220;
    const g = c.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.005); g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    src.connect(f).connect(g).connect(this.master);
    src.start(at, Math.random()); src.stop(at + 0.15);
  }

  _tone(freq, at, dur, vol, type = "sine") {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    o.connect(g).connect(this.master); o.start(at); o.stop(at + dur + 0.05);
  }

  /** ATCベル（チン） */
  atcBell() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone(2350, t, 1.2, 0.18); this._tone(3540, t, 0.8, 0.07); this._tone(5100, t, 0.4, 0.03);
  }

  /** ドアチャイム。開くときは2回、閉めるときは3回 */
  doorChime(open) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = open ? 2 : 3;
    for (let i = 0; i < n; i++) { this._tone(1320, t + i * 0.7, 0.5, 0.1); this._tone(990, t + i * 0.7 + 0.3, 0.6, 0.1); }
  }

  /** 車掌のブザー 2回 */
  buzzer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const at = t + 0.6 + i * 0.45;
      const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = 520;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.06, at + 0.01);
      g.gain.setValueAtTime(0.06, at + 0.25); g.gain.linearRampToValueAtTime(0, at + 0.27);
      o.connect(g).connect(this.master); o.start(at); o.stop(at + 0.3);
    }
  }

  /** ブレーキ緩解の空気音（プシュー） */
  air() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.whiteBuf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2200;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    src.connect(f).connect(g).connect(this.master); src.start(t); src.stop(t + 1.5);
  }

  /** マスコンのクリック */
  click(steps = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < Math.min(steps, 4); i++) this._tone(2600, t + i * 0.035, 0.03, 0.08, "square");
  }
}
