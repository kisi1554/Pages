// 車内アナウンスの読み上げ（ブラウザの音声合成 speechSynthesis。音声ファイルは使わない）と字幕。

export class Voice {
  constructor() {
    this.enabled = true;   // 読み上げるか（音オフのときは字幕だけ）
    this.on = true;        // アナウンス自体を出すか
    this.el = document.getElementById("announce");
    this.voice = null;
    this.hideTimer = null;
    const pick = () => {
      try {
        const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
        this.voice = vs.find(v => /^ja/i.test(v.lang) && /female|kyoko|haruka|nanami|google/i.test(v.name)) || vs.find(v => /^ja/i.test(v.lang)) || null;
      } catch (e) { this.voice = null; }
    };
    pick();
    try { window.speechSynthesis && speechSynthesis.addEventListener("voiceschanged", pick); } catch (e) { /* 古いブラウザ */ }
  }

  /** スマホは最初のタップの中で一度話させないと、あとで話せないことがある */
  unlock() {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) { /* 話せなくても字幕は出る */ }
  }

  say(a) {
    if (!this.on || !a) return;
    this.caption(a.text);
    if (!this.enabled || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(a.speech);
      u.lang = "ja-JP";
      if (this.voice) u.voice = this.voice;
      u.rate = 1.0; u.pitch = 1.15; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* 話せなくても字幕は出る */ }
  }

  caption(text) {
    if (!this.el) return;
    this.el.textContent = text;
    this.el.hidden = false;
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => { this.el.hidden = true; }, Math.max(4000, text.length * 180));
  }

  pause() { try { window.speechSynthesis && speechSynthesis.pause(); } catch (e) { /* */ } }
  resume() { try { window.speechSynthesis && speechSynthesis.resume(); } catch (e) { /* */ } }
  stop() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* */ } }
}
