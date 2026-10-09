/* ============================================================
   13. ほんものの ちきゅう（えいせいが とった しゃしん）
   - ひまわり9号（NICT ひまわりリアルタイム）… 10ぷんごとの いまの ちきゅう
   - NASA EPIC（DSCOVR）… 150まんキロ さきから みた まんまるの ちきゅう
   - ISS … NASA の こうしき ライブえいぞう（YouTube）と、いま どこを とんでいるかの ちず
   しゃしんは <img> で ちょくせつ よむ（ひまわりは CORS なし、EPIC と ISS の API は CORS あり）
   ============================================================ */
(function () {
  const HIMA = "https://himawari8-dl.nict.go.jp/himawari8/img/D531106/";
  const EPIC = "https://epic.gsfc.nasa.gov/";
  /* NASA「Live Video from the International Space Station (Official NASA Stream)」。
     ライブの ID が かわったら ここを かえる（YouTube で「NASA ISS live」を さがす） */
  const ISS_VIDEO = "M3HKLzjvKPc";
  const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
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

  /* ---------- ISS（ライブ えいぞう と いまの いち） ---------- */
  const live = $("realLive"), mapCv = $("issMap"), mapCx = mapCv.getContext("2d");
  let issTimer = 0, issNow = null, issPath = [], issPathAt = 0, landCv = null;

  function issStart() {
    live.querySelector(".real-video").innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' + ISS_VIDEO +
      '?autoplay=1&mute=1&playsinline=1&rel=0" title="ISS からの ライブえいぞう（NASA）" ' +
      'referrerpolicy="strict-origin-when-cross-origin" ' +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    live.querySelector(".iss-yt").href = "https://www.youtube.com/watch?v=" + ISS_VIDEO;
    $("realWhen").innerHTML = "<b>ISSを さがしているよ…</b>";
    drawMap();
    issTick();
  }
  function issStop() {
    clearTimeout(issTimer); issTimer = 0;
    live.querySelector(".real-video").innerHTML = "";   // えいぞうを とめる
  }
  function issTick() {
    const my = token;
    const t = Math.floor(Date.now() / 1000);
    const jobs = [fetch(ISS_API).then(r => r.json())];
    // きどう（まえ 45ふん 〜 あと 50ふん、5ふん おき）は 5ふんに 1かい とりなおす。
    // API は 1かいに 10こ まで なので 2かいに わける
    if (Date.now() - issPathAt > 5 * MIN) {
      for (const k0 of [-45, 5]) {
        const ts = []; for (let k = k0; k < k0 + 50; k += 5) ts.push(t + k * 60);
        jobs.push(fetch(ISS_API + "/positions?timestamps=" + ts.join(",")).then(r => r.json()));
      }
    }
    Promise.all(jobs).then(([now, a, b]) => {
      if (my !== token) return;
      issNow = now;
      if (a && b) { issPath = a.concat(b); issPathAt = Date.now(); }
      issCaption(); drawMap();
    }).catch(() => {
      if (my !== token) return;
      $("realWhen").innerHTML = "<b>ISSの いちが わからなかったよ</b><span>インターネットに つながっているか みてね</span>";
    }).finally(() => { if (my === token) issTimer = setTimeout(issTick, 5000); });
  }

  /* いま したに ある ところ（くに / うみ） */
  function below(lat, lon) {
    const c = countryAt(lon, lat);
    if (c) return c.n;
    if (onPlainLand(lat, lon)) return continent(lat, lon) + "の りく";
    if (lat < -60) return "なんきょくの うみ";
    if (lat > 66) return "ほっきょくの うみ";
    if (lat > 30 && lat < 46 && lon > -5 && lon < 36) return "ちちゅうかい";
    if (lat < 30 && lon >= 20 && lon < (lat > -10 ? 120 : 147)) return "インドよう";
    if ((lon >= -70 && lon < 20) || (lat > 8 && lon >= -98 && lon < 20 && !(lat < 17 && lon < -84))) return "たいせいよう";
    return "たいへいよう";
  }
  /* なまえの ない くに（COUNTRIES.plain）の なかか */
  function onPlainLand(lat, lon) {
    const q = COUNTRIES.qPlain;
    return COUNTRIES.plain.some(c => {
      if (!c._rp) c._rp = c.r.map(str => COUNTRIES.decode(str).map(([x, y]) => [x / q, y / q]));
      let inside = false;
      for (const ring of c._rp)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i], [xj, yj] = ring[j];
          if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
        }
      return inside;
    });
  }
  function continent(lat, lon) {
    if (lat < -60) return "なんきょく";
    if (lon < -30) return lat > 12 ? "きたアメリカ" : "みなみアメリカ";
    if (lat < 37 && lat > -36 && lon < 52 && !(lat > 12 && lon > 35)) return "アフリカ";
    if (lat > 36 && lon < 45) return "ヨーロッパ";
    if (lat < -10 && lon > 110) return "オセアニア";
    return "アジア";
  }
  function issCaption() {
    const n = issNow;
    $("realWhen").innerHTML = "<b>いま ISSは 「" + below(n.latitude, n.longitude) + "」の うえ</b>" +
      "<span>" + (n.visibility === "daylight" ? "☀️ ひるの がわ" : "🌙 よるの がわ") +
      "・たかさ " + Math.round(n.altitude) + "km・1びょうで " + (n.velocity / 3600).toFixed(1) + "km すすむ</span>";
  }

  /* たいようが まうえに ある ばしょ（かんたんな しき。ずれは 数ど） */
  function subSolar(ms) {
    const d = new Date(ms), y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
    const doy = (ms - y0) / 864e5;
    const lat = 23.44 * Math.sin(2 * Math.PI * (doy - 80) / 365.24);
    const utcH = d.getUTCHours() + d.getUTCMinutes() / 60;
    return { lat, lon: ((-15 * (utcH - 12)) + 540) % 360 - 180 };
  }

  /* せかいちず（りくは いちど だけ かく） */
  function landLayer(W, H) {
    if (landCv && landCv.width === W) return landCv;
    landCv = document.createElement("canvas"); landCv.width = W; landCv.height = H;
    const g = landCv.getContext("2d");
    g.fillStyle = "#1f5f9e"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#5f9a5a"; g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(0.5, W / 900);
    const put = (list, q) => list.forEach(c => c.r.forEach(str => {
      const ring = COUNTRIES.decode(str);
      g.beginPath();
      ring.forEach(([x, y], i) => {
        const px = (x / q + 180) / 360 * W, py = (90 - y / q) / 180 * H;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.closePath(); g.fill(); g.stroke();
    }));
    put(COUNTRIES.plain, COUNTRIES.qPlain); put(COUNTRIES.named, COUNTRIES.q);
    return landCv;
  }

  function drawMap() {
    const r = mapCv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(r.width * dpr), H = Math.round(W / 2);
    if (!W) return;
    if (mapCv.width !== W || mapCv.height !== H) { mapCv.width = W; mapCv.height = H; }
    const g = mapCx, X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
    g.drawImage(landLayer(W, H), 0, 0);

    // よるの がわを くらく
    const sun = subSolar(Date.now()), rad = Math.PI / 180, cell = Math.max(2, Math.round(W / 180));
    const sl = Math.sin(sun.lat * rad), cl = Math.cos(sun.lat * rad);
    for (let py = 0; py < H; py += cell) {
      const lat = 90 - (py + cell / 2) / H * 180, sa = Math.sin(lat * rad), ca = Math.cos(lat * rad);
      for (let px = 0; px < W; px += cell) {
        const lon = (px + cell / 2) / W * 360 - 180;
        const z = sa * sl + ca * cl * Math.cos((lon - sun.lon) * rad);
        if (z < 0.05) { g.fillStyle = "rgba(4,7,24," + (z < -0.1 ? 0.62 : 0.62 * (0.05 - z) / 0.15) + ")"; g.fillRect(px, py, cell, cell); }
      }
    }

    // にほん
    const jp = CITIES[0], fs = Math.max(10, Math.round(W / 50));
    g.fillStyle = "#FFB43C"; g.beginPath(); g.arc(X(jp.lon), Y(jp.lat), Math.max(3, W / 160), 0, 7); g.fill();
    g.font = "700 " + fs + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom";
    g.fillText("にほん", X(jp.lon), Y(jp.lat) - fs * 0.4);

    // きどう（すぎた ところ＝せん、これから＝てんせん）
    const now = Date.now() / 1000;
    const seg = (pts, dash) => {
      g.setLineDash(dash); g.beginPath();
      pts.forEach((p, i) => {
        const x = X(p.longitude), y = Y(p.latitude);
        if (i && Math.abs(p.longitude - pts[i - 1].longitude) > 180) g.moveTo(x, y); else i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke(); g.setLineDash([]);
    };
    if (issPath.length) {
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1.5, W / 300);
      const past = issPath.filter(p => p.timestamp <= now), next = issPath.filter(p => p.timestamp >= now);
      if (issNow) { past.push(issNow); next.unshift(issNow); }
      seg(past, []); seg(next, [W / 80, W / 120]);
    }

    // ISS（たいようでんちの はねと ほんたい）
    if (issNow) {
      const x = X(issNow.longitude), y = Y(issNow.latitude), s = Math.max(9, W / 34);
      g.fillStyle = "rgba(79,216,198,.35)"; g.beginPath(); g.arc(x, y, s * 1.5, 0, 7); g.fill();
      g.fillStyle = "#FFE9A8"; g.fillRect(x - s * 0.9, y - s * 0.12, s * 1.8, s * 0.24);
      g.fillStyle = "#3D6BFF"; g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, s / 10);
      for (const dx of [-1, 1]) {
        g.fillRect(x + dx * s * 0.95 - s * 0.25, y - s * 0.6, s * 0.5, s * 1.2);
        g.strokeRect(x + dx * s * 0.95 - s * 0.25, y - s * 0.6, s * 0.5, s * 1.2);
      }
      g.fillStyle = "#fff"; g.fillRect(x - s * 0.3, y - s * 0.3, s * 0.6, s * 0.6);
      g.font = "700 " + fs + "px sans-serif"; g.textBaseline = "top"; g.fillStyle = "#fff";
      g.fillText("ISS", x, y + s * 0.8);
    }
  }
  window.addEventListener("resize", () => { if (src === "iss" && !box.hidden) drawMap(); });

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
          "▶で ちきゅうが じてんする ようすが みえるよ。",
    iss:  "ISSは うちゅうひこうしが くらす うちゅうの いえ。たかさ 400キロを、やく90ぷんで ちきゅうを 1しゅう する。" +
          "まっくらな ときは よるの がわに いるか、つうしんが きれている ときだよ。"
  };
  const CREDIT = {
    hima: "しゃしん: ひまわり9号（気象庁）／ NICT「ひまわりリアルタイムWeb」",
    epic: "しゃしん: NASA EPIC / NOAA DSCOVR",
    iss:  "えいぞう: NASA（YouTube）／ いち: wheretheiss.at"
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
    stop(); issStop(); src = s;
    box.dataset.src = s;
    ["hima", "epic", "iss"].forEach(k =>
      $("src" + k[0].toUpperCase() + k.slice(1)).setAttribute("aria-selected", s === k ? "true" : "false"));
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
    } else if (s === "epic") {
      const my = token;
      epicFrames().then(list => { if (my === token) ready(list); })
        .catch(() => { if (my === token) msg.textContent = "NASAの しゃしんが よめなかったよ。インターネットに つながっているか みてね。"; });
    } else {
      issStart();
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
    stop(); issStop(); token++;
    box.hidden = true;
    document.body.classList.remove("real-open");
  }

  $("realBtn").addEventListener("click", () => { open(); sfx.tap(); });
  $("realClose").addEventListener("click", () => { close(); sfx.tap(); });
  $("srcHima").addEventListener("click", () => { if (src !== "hima") setSrc("hima"); sfx.tap(); });
  $("srcEpic").addEventListener("click", () => { if (src !== "epic") setSrc("epic"); sfx.tap(); });
  $("srcIss").addEventListener("click", () => { if (src !== "iss") setSrc("iss"); sfx.tap(); });
  playBtn.addEventListener("click", () => { timer ? stop() : play(); sfx.tap(); });
  seek.addEventListener("input", () => { stop(); if (frames.length) show(+seek.value); });
  window.addEventListener("keydown", e => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    e.stopImmediatePropagation();   // うしろの ちきゅうを まわさない
  }, true);
})();
