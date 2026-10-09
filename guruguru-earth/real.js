/* ============================================================
   13. ほんものの ちきゅう（えいせいが とった しゃしん）
   - ひまわり9号（NICT ひまわりリアルタイム）… 10ぷんごとの いまの ちきゅう
   - NASA EPIC（DSCOVR）… 150まんキロ さきから みた まんまるの ちきゅう
   どちらも <img> で ちょくせつ よむ（ひまわりは CORS なし、EPIC の API は CORS あり）
   ============================================================ */
(function () {
  const HIMA = "https://himawari8-dl.nict.go.jp/himawari8/img/D531106/";
  const EPIC = "https://epic.gsfc.nasa.gov/";
  const MIN = 60e3, STEP = 10 * MIN, HOUR = 60 * MIN;
  /* ひまわりは さつえいから やく20ぷんで こうかいされる。まだの じかんは
     「No Image」の がぞうが 200 で かえってきて みわけられないので、よゆうを みて 35ぷん まえ */
  const LAG = 35 * MIN;
  const pad = n => String(n).padStart(2, "0");

  const box = $("real"), img = $("realImg"), hi = $("realHi"), pin = $("realPin"),
        msg = $("realMsg"), seek = $("realSeek"), playBtn = $("realPlay");

  let src = "hima", frames = [], idx = 0, timer = 0, epicReq = null, token = 0;
  const cache = new Map();   // url -> Promise<boolean>

  function load(url) {
    if (!cache.has(url)) cache.set(url, new Promise(res => {
      const im = new Image();
      im.onload = () => res(true);
      im.onerror = () => { cache.delete(url); res(false); };
      im.src = url;
    }));
    return cache.get(url);
  }

  /* ---------- ひまわり ---------- */
  function himaFix(t) {
    // 02:40 と 14:40 (UTC) は せいびの じかんで ぜんきゅうの しゃしんが ない
    const d = new Date(t);
    return d.getUTCMinutes() === 40 && d.getUTCHours() % 12 === 2 ? t - STEP : t;
  }
  function himaUrl(t, lvl, x, y) {
    const d = new Date(t);
    return HIMA + lvl + "/550/" + d.getUTCFullYear() + "/" + pad(d.getUTCMonth() + 1) + "/" +
      pad(d.getUTCDate()) + "/" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00_" + x + "_" + y + ".png";
  }
  function himaFrames() {
    const last = himaFix(Math.floor((Date.now() - LAG) / STEP) * STEP);
    const out = [];
    for (let i = 23; i >= 0; i--) {   // 24じかん ぶん（1じかん おき）
      const t = himaFix(last - i * HOUR);
      out.push({ t, url: himaUrl(t, "1d", 0, 0) });
    }
    return out;
  }

  /* せいしえいせい（とうけい 140.7ど、たかさ 35786km）から みた いち → がぞうの なかの わりあい */
  function himaPos(lat, lon) {
    const R = 6378.137, Rp = 6356.752, H = 42164, e2 = 1 - (Rp / R) ** 2;
    const c = Math.atan((1 - e2) * Math.tan(lat * Math.PI / 180));
    const r = Rp / Math.sqrt(1 - e2 * Math.cos(c) ** 2);
    const dl = (lon - 140.7) * Math.PI / 180;
    const x = r * Math.cos(c) * Math.cos(dl), y = r * Math.cos(c) * Math.sin(dl), z = r * Math.sin(c);
    const edge = Math.asin(R / H);
    return { u: 0.5 + Math.atan2(y, H - x) / edge / 2, v: 0.5 - Math.atan2(z, H - x) / edge / 2 };
  }

  /* こまかい がぞう（1100×1100、4まい）は とまっている ときだけ かさねる */
  function himaHires(f, my) {
    hi.classList.remove("is-on");
    const urls = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => himaUrl(f.t, "2d", x, y));
    Promise.all(urls.map(load)).then(ok => {
      if (my !== token || timer || !ok.every(Boolean)) return;
      hi.innerHTML = urls.map(u => '<img alt="" src="' + u + '">').join("");
      hi.classList.add("is-on");
    });
  }

  /* ---------- NASA EPIC ---------- */
  function epicFrames() {
    if (!epicReq) epicReq = fetch(EPIC + "api/natural").then(r => r.json()).then(list =>
      list.map(e => {
        const t = Date.parse(e.date.replace(" ", "T") + "Z");
        const d = e.date.slice(0, 10).replace(/-/g, "/");
        return { t, url: EPIC + "archive/natural/" + d + "/jpg/" + e.image + ".jpg" };
      }).sort((a, b) => a.t - b.t)
    ).catch(err => { epicReq = null; throw err; });
    return epicReq;
  }

  /* ---------- ことば ---------- */
  function jst(t) {
    const d = new Date(t + 9 * HOUR), h = d.getUTCHours();
    const part = h < 4 ? "よなか" : h < 10 ? "あさ" : h < 16 ? "ひる" : h < 19 ? "ゆうがた" : "よる";
    return { md: (d.getUTCMonth() + 1) + "がつ" + d.getUTCDate() + "にち", hm: part + " " + h + ":" + pad(d.getUTCMinutes()) };
  }
  function ago(t) {
    const m = Math.round((Date.now() - t) / MIN);
    if (m < 60) return m + "ぷん まえ";
    if (m < 24 * 60) return Math.round(m / 60) + "じかん まえ";
    return Math.round(m / 60 / 24) + "にち まえ";
  }
  function caption(f) {
    const j = jst(f.t);
    $("realWhen").innerHTML = "<b>" + j.md + " " + j.hm + "</b>（にほんの じかん）<span>" + ago(f.t) + " の しゃしん</span>";
  }

  const NOTE = {
    hima: "うちゅうの 3まん6せんキロ から、にほんの えいせい「ひまわり」が とった ほんものの しゃしん。" +
          "しろいのは くも、くらい ところは いま よるの ばしょ だよ。▶で 1にちを みてみよう!",
    epic: "150まんキロ はなれた ところから、たいように てらされた がわを まるごと とった しゃしん。" +
          "▶で ちきゅうが じてんする ようすが みえるよ。"
  };
  const CREDIT = {
    hima: "しゃしん: ひまわり9号（気象庁）／ NICT「ひまわりリアルタイムWeb」",
    epic: "しゃしん: NASA EPIC / NOAA DSCOVR"
  };

  /* ---------- ひょうじ ---------- */
  function show(i) {
    idx = i; seek.value = i;
    const f = frames[i], my = ++token;
    caption(f);
    hi.classList.remove("is-on");
    load(f.url).then(ok => {
      if (my !== token) return;
      if (!ok) { msg.textContent = "しゃしんが よめなかったよ。インターネットに つながっているか みてね。"; msg.hidden = false; return; }
      img.src = f.url; msg.hidden = true;
      if (src === "hima" && !timer) himaHires(f, my);
    });
    // つぎの こまを さきよみ
    if (frames[i + 1]) load(frames[i + 1].url);
  }

  function stop() {
    clearTimeout(timer); timer = 0;
    playBtn.textContent = "▶ うごかす"; playBtn.setAttribute("aria-pressed", "false");
  }
  function play() {
    if (frames.length < 2) return;
    playBtn.textContent = "⏸ とめる"; playBtn.setAttribute("aria-pressed", "true");
    if (idx >= frames.length - 1) show(0);
    const tick = () => {
      if (idx >= frames.length - 1) { stop(); show(idx); return; }
      const next = idx + 1;
      // よみこみが おわってから すすむ（ちらつかない）
      load(frames[next].url).then(() => {
        if (!timer) return;
        show(next);
        timer = setTimeout(tick, src === "hima" ? 380 : 650);
      });
    };
    timer = setTimeout(tick, 200);
  }

  function setSrc(s) {
    stop(); src = s;
    $("srcHima").setAttribute("aria-selected", s === "hima" ? "true" : "false");
    $("srcEpic").setAttribute("aria-selected", s === "epic" ? "true" : "false");
    $("realNote").textContent = NOTE[s];
    $("realCredit").textContent = CREDIT[s];
    pin.hidden = s !== "hima";
    img.removeAttribute("src"); hi.classList.remove("is-on"); hi.innerHTML = "";
    msg.textContent = "よみこみちゅう…"; msg.hidden = false;
    frames = []; seek.max = 0; token++;
    if (s === "hima") {
      const p = himaPos(CITIES[0].lat, CITIES[0].lon);
      pin.style.left = (p.u * 100) + "%"; pin.style.top = (p.v * 100) + "%";
      ready(himaFrames());
    } else {
      const my = token;
      epicFrames().then(list => { if (my === token) ready(list); })
        .catch(() => { if (my === token) msg.textContent = "NASAの しゃしんが よめなかったよ。インターネットに つながっているか みてね。"; });
    }
  }
  function ready(list) {
    frames = list;
    if (!frames.length) { msg.textContent = "いまは しゃしんが ないみたい。また あとで みてね。"; return; }
    seek.max = frames.length - 1;
    show(frames.length - 1);   // さいしんから
  }

  function open() {
    box.hidden = false;
    document.body.classList.add("real-open");
    setSrc(src);
    speak("ほんものの ちきゅう");
  }
  function close() {
    stop(); token++;
    box.hidden = true;
    document.body.classList.remove("real-open");
  }

  $("realBtn").addEventListener("click", () => { open(); sfx.tap(); });
  $("realClose").addEventListener("click", () => { close(); sfx.tap(); });
  $("srcHima").addEventListener("click", () => { if (src !== "hima") setSrc("hima"); sfx.tap(); });
  $("srcEpic").addEventListener("click", () => { if (src !== "epic") setSrc("epic"); sfx.tap(); });
  playBtn.addEventListener("click", () => { timer ? stop() : play(); sfx.tap(); });
  seek.addEventListener("input", () => { stop(); if (frames.length) show(+seek.value); });
  window.addEventListener("keydown", e => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    e.stopImmediatePropagation();   // うしろの ちきゅうを まわさない
  }, true);
})();
