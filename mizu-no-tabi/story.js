/* しずくの だいぼうけん — 「たび」（すごろく）
   ばめん（step）ごとに カメラが うごき、しかけを すると ぽたが すすむ。 */
const Story = (function () {
  const P = World.P, R = World.R;
  let cv, ctx, cw = 300, ch = 300, dpr = 1, raf = 0, last = 0, t = 0, active = false;
  const cam = { x: 0, y: 0, s: 0.5 }, camT = { x: 0, y: 0, s: 0.5 };
  let camRect = [0, 0, 1600, 1000], overview = false;
  let S = null;
  let onLap = null, $ = null, rb = null;

  const ROUTE_NAMES = { kawa: "かわ ルート", chika: "ちかすい ルート", machi: "まち ルート" };
  const TRACK = {
    base: [["sea", "🌊 うみ"], ["rise", "💨 じょうはつ"], ["cloud", "☁️ くも"], ["fall", "🌧️ あめ・ゆき"]],
    kawa: [["river", "🏞️ かわ"]],
    chika: [["soak", "🟫 しみこむ"], ["aquifer", "💧 ちかすい"], ["spring", "⛲ わきみず"]],
    machi: [["dam", "🧱 ダム"], ["plant", "🏭 じょうすい"], ["faucet", "🚰 じゃぐち"], ["sewage", "♻️ げすい"]],
    end: [["arrive", "🌊 うみ"]]
  };
  const STEP_NODE = { drift: "cloud", spring_snow: "fall", choose: "fall", riverSea: "spring" };

  function fresh() {
    return {
      step: "sea", route: null, weather: null, snowLap: false,
      pota: { x: P.seaStart[0], y: P.seaStart[1], mode: "drop", face: "happy" },
      trail: [], heat: 0, specks: [], cloudN: 0, cloudPos: P.cloud.slice(), groundT: 8, season: 0,
      snow: 0, lakeOpen: false, plantStep: 0, faucetOpen: false, cleaned: false,
      anim: null, along: null, hold: false, drag: null, precip: [], ready: false, msgAt: {}
    };
  }

  /* ---------------- カメラ ---------------- */
  function fit(rect) {
    const rw = rect[2] - rect[0], rh = rect[3] - rect[1];
    const s = Math.min(cw / rw, ch / rh);
    return { s: s, x: (rect[0] + rect[2]) / 2 - cw / 2 / s, y: (rect[1] + rect[3]) / 2 - ch / 2 / s };
  }
  function setCam(rect, now) {
    camRect = rect;
    const f = fit(overview ? [-60, -40, 1660, 1000] : rect);
    camT.x = f.x; camT.y = f.y; camT.s = f.s;
    if (now) { cam.x = f.x; cam.y = f.y; cam.s = f.s; }
  }
  const w2s = function (x, y) { return [(x - cam.x) * cam.s, (y - cam.y) * cam.s]; };
  const s2w = function (x, y) { return [x / cam.s + cam.x, y / cam.s + cam.y]; };
  const potaR = function () { return Math.max(17, Math.min(34, Math.min(cw, ch) * 0.06)); };

  /* ---------------- みちすじ ---------------- */
  function prep(pts) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts: pts, L: L, total: L[L.length - 1] };
  }
  function at(path, d) {
    d = Math.max(0, Math.min(path.total, d));
    let i = 1; while (i < path.L.length - 1 && path.L[i] < d) i++;
    const a = path.pts[i - 1], b = path.pts[i], seg = (path.L[i] - path.L[i - 1]) || 1, k = (d - path.L[i - 1]) / seg;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }
  function nearest(path, x, y, lo, hi) {
    let best = null, bd = 1e9;
    for (let d = Math.max(0, lo); d <= Math.min(path.total, hi); d += 3) {
      const p = at(path, d), dd = Math.hypot(p[0] - x, p[1] - y);
      if (dd < bd) { bd = dd; best = d; }
    }
    const e = Math.min(path.total, hi), pe = at(path, e), de = Math.hypot(pe[0] - x, pe[1] - y);
    if (de <= bd + 2) { bd = de; best = e; }
    return { d: best, dist: bd };
  }
  /* じどうで うごく */
  function moveAlong(pts, speed, done, follow) {
    S.anim = { path: prep(pts), d: 0, speed: speed, done: done, follow: follow };
  }
  /* ゆびで なぞって すすむ */
  function along(pts, opts) {
    S.along = Object.assign({ path: prep(pts), d: 0 }, opts || {});
    const p = at(S.along.path, 0); S.pota.x = p[0]; S.pota.y = p[1];
  }
  function trailPush() {
    const tr = S.trail, p = S.pota, l = tr[tr.length - 1];
    if (!l || Math.hypot(l[0] - p.x, l[1] - p.y) > 10) tr.push([p.x, p.y, p.mode === "vapor" ? 1 : 0]);
  }

  /* ---------------- パネル ---------------- */
  function panel(title, text, ctl, noSpeak) {
    $("#pTitle").innerHTML = rb(title);
    $("#pText").innerHTML = rb(text);
    $("#pCtl").innerHTML = rb(ctl || "");
    const pn = document.querySelector(".panel"); if (pn) pn.scrollTop = 0;
    $("#pText").dataset.say = text;
    renderTrack();
    if (!noSpeak) Say.speak(text);
  }
  function say(text) { $("#pText").innerHTML = rb(text); $("#pText").dataset.say = text; Say.speak(text); }
  function nextBtn(label, fn) {
    const c = $("#pCtl");
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn big next"; b.id = "nextBtn"; b.innerHTML = rb(label || "つぎへ ▶");
    b.onclick = function () { Snd.tap(); fn(); };
    c.appendChild(b);
  }
  function bind(id, fn) { const e = document.getElementById(id); if (e) e.onclick = function (ev) { Snd.unlock(); fn(ev); }; }
  function holdBtn(id) {
    const e = document.getElementById(id); if (!e) return;
    const on = function (ev) { ev.preventDefault(); Snd.unlock(); S.hold = true; e.classList.add("on"); try { e.setPointerCapture(ev.pointerId); } catch (x) {} };
    const off = function () { S.hold = false; e.classList.remove("on"); };
    e.addEventListener("pointerdown", on); ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { e.addEventListener(n, off); });
    e.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  }
  function renderTrack() {
    const list = TRACK.base.concat(S.route ? TRACK[S.route] : [["?", "❓ どの みち？"]]).concat(TRACK.end);
    const cur = STEP_NODE[S.step] === "spring" ? "spring" : (STEP_NODE[S.step] || S.step);
    let idx = list.findIndex(function (n) { return n[0] === cur; });
    if (S.step === "choose") idx = 4;
    $("#track").innerHTML = list.map(function (n, i) {
      return '<li class="' + (i < idx ? "done" : i === idx ? "cur" : "") + '">' + n[1] + "</li>";
    }).join("");
    const c = $("#track").querySelector(".cur"); if (c && c.scrollIntoView) try { c.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
  }

  /* ---------------- ばめん ---------------- */
  const STEPS = {
    sea: function () {
      S.pota = { x: P.seaStart[0], y: P.seaStart[1], mode: "drop", face: "happy" };
      S.trail = []; S.heat = 0;
      setCam([40, 30, 760, 700]);
      panel("🌊 {海|うみ}", "ぼく、{水|みず}の しずく「ぽた」！ {海|うみ}から たびに でるよ。<br>👉 たいようを ゆびで <b>こすって</b>、{海|うみ}を あたためて！",
        '<div class="meter"><span>あたたかさ</span><div class="bar"><i id="heatBar"></i></div></div>' +
        '<button type="button" class="btn sub" id="sunTap">☀️ たいようを タップ</button>');
      bind("sunTap", function () { heatUp(14); });
    },
    rise: function () {
      setCam([60, 0, 880, 700]);
      panel("💨 {空|そら}へ のぼる", "{見|み}えない {水|みず}じょうきに なった ぽたを、<b>ゆびで 上へ</b> ひっぱろう。<br>{上|うえ}に いくほど {温度|おんど}は どうなるかな？ ひだりの {温度計|おんどけい}を 見てね。",
        '<button type="button" class="btn big" id="upBtn">⬆ のぼる（おしつづける）</button>');
      holdBtn("upBtn");
    },
    cloud: function () {
      setCam([230, 90, 860, 470]);
      S.specks = [];
      const spots = [[330, 400, 0], [760, 410, 0], [300, 290, 0], [790, 300, 0], [400, 170, 1], [690, 160, 1], [560, 135, 1]];
      spots.forEach(function (s) { S.specks.push({ x: s[0], y: s[1], ice: !!s[2], got: false, ph: Math.random() * 6 }); });
      S.cloudN = 0; S.cloudPos = P.cloud.slice();
      S.pota.x = P.cloud[0]; S.pota.y = P.cloud[1];
      panel("☁️ {雲|くも}を つくろう", "まわりにも ちいさな {水|みず}の つぶ（💧）や、もっと {上|うえ}の さむい ところでは {氷|こおり}の つぶ（❄️）が できたよ。<br>👉 つぶを <b>ドラッグして ぽたの ところへ あつめて</b>！",
        '<div class="meter"><span>あつめた つぶ</span><div class="bar"><i id="speckBar"></i></div></div>');
    },
    drift: function () {
      setCam([300, 40, 1600, 600]);
      panel("🍃 かぜに のって", "{雲|くも}は かぜに ながされて {山|やま}の ほうへ。{山|やま}に ぶつかると おしあげられて、もっと ひえるよ。", "");
      const from = S.cloudPos.slice();
      moveAlong([from, [900, 140], P.cloudMtn], 380, function () { go("fall"); });
    },
    fall: function () {
      setCam([1000, 50, 1600, 520]);
      S.pota.x = P.cloudMtn[0]; S.pota.y = P.cloudMtn[1] + 10;
      panel("🌧️ {雨|あめ}？ ❄️ {雪|ゆき}？", "{雲|くも}の 中で {大|おお}きく おもく なった つぶが おちて くるよ。<br>{雨|あめ}に なるか {雪|ゆき}に なるかは、<b>{地面|じめん}の ちかくの {温度|おんど}</b>で きまる。<br>👉 {温度|おんど}を きめて「ふらせる」！",
        '<label class="slider"><span>{地面|じめん}ちかくの {温度|おんど} <b id="gtVal"></b></span><input type="range" id="gt" min="-6" max="16" step="1"></label>' +
        '<button type="button" class="btn big" id="fallBtn">☔ ふらせる！</button>');
      const r = $("#gt"); r.value = S.groundT; $("#gtVal").textContent = S.groundT + "℃";
      r.oninput = function () { S.groundT = +r.value; $("#gtVal").textContent = S.groundT + "℃"; };
      bind("fallBtn", startFall);
    },
    spring_snow: function () {
      setCam([1100, 140, 1600, 480]);
      S.season = 0;
      panel("🏔️ {山|やま}で ふゆを すごす", "ぽたは {雪|ゆき}に なって {山|やま}に つもったよ。さむい あいだは とけないで まっている。<br>👉 きせつを すすめて <b>はる</b>に しよう！",
        '<label class="slider"><span>きせつ <b id="seaVal">❄️ ふゆ</b></span><input type="range" id="season" min="0" max="100" step="1" value="0"></label>' +
        '<button type="button" class="btn sub" id="springBtn">🌸 はるに する</button>');
      $("#season").oninput = function () { setSeason(+this.value); };
      bind("springBtn", function () { $("#season").value = 100; setSeason(100); });
    },
    choose: function () {
      setCam([480, 200, 1600, 760]);
      panel("🛤️ どの みちで {海|うみ}へ かえる？", "{山|やま}に ふった {水|みず}が {海|うみ}へ もどる みちは ひとつじゃ ないよ。えらんでね。",
        '<div class="routes">' +
        '<button type="button" class="route" data-r="kawa"><b>🏞️ かわ ルート</b><span>{川|かわ}を くだって {海|うみ}へ</span></button>' +
        '<button type="button" class="route" data-r="chika"><b>🟫 ちかすい ルート</b><span>{地面|じめん}に しみこんで わき{水|みず}に</span></button>' +
        '<button type="button" class="route" data-r="machi"><b>🏙️ まち ルート</b><span>ダム → じょうすいじょう → いえ → げすい</span></button></div>');
      document.querySelectorAll(".route").forEach(function (b) {
        b.onclick = function () { Snd.ok(); S.route = b.dataset.r; go(S.route === "kawa" ? "river" : S.route === "chika" ? "soak" : "dam"); };
      });
    },
    river: function () {
      setCam([460, 240, 1400, 720]);
      along(R.river.filter(function (p) { return p[0] <= 1292; }), {
        msgs: [[0.12, "{山|やま}の 中は かたむきが {大|おお}きくて ながれが はやい！ {石|いし}や {土|つち}を けずって はこぶよ。"],
               [0.55, "たいらな ところでは ながれが ゆっくり。はこんで きた すなや どろを つもらせる。"],
               [0.85, "{水|みず}は {高|たか}い ところから {低|ひく}い ところへ ながれて あつまるんだ。もうすぐ {海|うみ}！"]],
        end: function () { arrive(); }
      });
      S.pota.face = "yay";
      panel("🏞️ {川|かわ}を くだろう", "👉 ぽたを <b>{川|かわ}に そって ゆびで なぞって</b> {海|うみ}まで はこんで！（ボタンを おしつづけても すすむよ）",
        '<button type="button" class="btn big" id="goBtn">🌊 ながれる（おしつづける）</button>');
      holdBtn("goBtn");
    },
    soak: function () {
      setCam([1140, 280, 1400, 470]);
      moveAlong([[S.pota.x, S.pota.y], [1260, World.groundY(1260) - 12]], 200, null);
      panel("🟫 どこから しみこむ？", "{地面|じめん}に しみこむ {水|みず}も あるよ。<br>つぶの {大|おお}きい <b>すな</b> と、つぶの {小|ちい}さい <b>ねんど</b>。どっちが しみこみやすい？ 👉 タップ！",
        '<div class="two"><button type="button" class="btn sub" id="sandBtn">🟨 すなの ところ</button><button type="button" class="btn sub" id="clayBtn">🟫 ねんどの ところ</button></div>');
      bind("sandBtn", function () { soakAt("sand"); });
      bind("clayBtn", function () { soakAt("clay"); });
    },
    aquifer: function () {
      setCam([900, 330, 1340, 680]);
      S.pota.face = "sleep";
      along(R.aquifer, {
        msgs: [[0.25, "つぶと つぶの すきまを、とても ゆっくり すすむよ。{何年|なんねん}も かかる ことも ある。"],
               [0.6, "{下|した}の ねんどの そうは {水|みず}を とおしにくい。だから {水|みず}は その {上|うえ}を ながれていく。"]],
        end: function () {
          S.pota.face = "wow"; Snd.pochan();
          panel("⛲ わき{水|みず}だ！", "{山|やま}の ふもとで、{地下水|ちかすい}が {地面|じめん}から わきだした！ {土|つち}の 中を とおって、つめたくて すんだ {水|みず}に なったよ。", "");
          nextBtn("{川|かわ}へ ▶", function () { go("riverSea"); });
        }
      });
      panel("💧 {地下水|ちかすい}に なった", "すなの つぶの すきまに しみこんで、{地下水|ちかすい}に なったよ。<br>👉 <b>あおい てんせんに そって なぞって</b> すすもう。",
        '<button type="button" class="btn big" id="goBtn">💧 すすむ（おしつづける）</button>');
      holdBtn("goBtn");
    },
    riverSea: function () {
      setCam([460, 380, 1100, 720]);
      S.pota.face = "yay";
      panel("🏞️ {川|かわ}に あわさって", "わき{水|みず}は {小|ちい}さな ながれに なって {川|かわ}に あわさり、{海|うみ}へ むかうよ。", "");
      moveAlong(R.springToSea, 260, function () { arrive(); });
    },
    dam: function () {
      setCam([980, 360, 1320, 560]);
      S.pota.face = "happy";
      moveAlong(R.toLake, 180, function () { S.ready = true; S.pota.face = "wow"; });
      panel("🧱 ダム", "{川|かわ}の {水|みず}は ダムに ためられるよ。{雨|あめ}が {少|すく}ない ときでも {水|みず}を つかえるように する ための しくみ。<br>👉 <b>ダム（はいいろの かべ）を タップ</b>して {水|みず}を ながそう！",
        '<button type="button" class="btn sub" id="damBtn">🚪 すいもんを あける</button>');
      bind("damBtn", openDam);
    },
    plant: function () {
      setCam([820, 500, 1000, 660]);
      S.plantStep = 0;
      panel("🏭 じょうすいじょう", "{川|かわ}の {水|みず}を のめる {水|みず}に する ところ。じゅんばんに タンクを タップ！<br>① ちんでん → ② ろか → ③ しょうどく",
        '<div class="three">' +
        '<button type="button" class="btn sub tank" data-i="0">① ちんでん</button>' +
        '<button type="button" class="btn sub tank" data-i="1">② ろか</button>' +
        '<button type="button" class="btn sub tank" data-i="2">③ しょうどく</button></div>');
      document.querySelectorAll(".tank").forEach(function (b) { b.onclick = function () { tankTap(+b.dataset.i); }; });
    },
    faucet: function () {
      setCam([700, 470, 880, 640]);
      S.faucetOpen = false;
      moveAlong(R.pipe, 160, function () { S.ready = true; S.pota.face = "happy"; });
      panel("🚰 いえの じゃぐち", "きれいに なった {水|みず}は {水道管|すいどうかん}を とおって いえに とどくよ。<br>👉 <b>じゃぐち（あかい ハンドル）を タップ</b>！",
        '<button type="button" class="btn sub" id="tapBtn">🚰 じゃぐちを ひねる</button>');
      bind("tapBtn", openFaucet);
    },
    sewage: function () {
      setCam([540, 540, 860, 720]);
      S.cleaned = false;
      panel("♻️ げすいしょりじょう", "つかって よごれた {水|みず}は {下水管|げすいかん}を とおって げすいしょりじょうへ。<br>👉 <b>しょりじょう（タンク）を タップ</b>して きれいに しよう！",
        '<button type="button" class="btn sub" id="cleanBtn">🦠 びせいぶつの ちからで きれいに</button>');
      bind("cleanBtn", cleanSewage);
    },
    arrive: function () {}
  };

  function go(step) {
    S.step = step; S.anim = null; S.along = null; S.hold = false; S.drag = null; S.ready = false; S.msgAt = {};
    Snd.river(0); Snd.rain(0);
    STEPS[step]();
  }

  /* ---------------- しかけ ---------------- */
  function heatUp(v) {
    if (S.step !== "sea" || S.heat >= 100) return;
    S.heat = Math.min(100, S.heat + v);
    const b = $("#heatBar"); if (b) b.style.width = S.heat + "%";
    if (S.heat > 40) S.pota.face = "wow";
    if (S.heat >= 100) {
      S.pota.mode = "vapor"; S.pota.face = "yay"; Snd.whoosh();
      moveAlong([[S.pota.x, S.pota.y], [S.pota.x, S.pota.y - 40]], 60, null);
      panel("✨ {見|み}えなく なった！", "ぽたは <b>{水|みず}じょうき</b>に なったよ。{水|みず}じょうきは {目|め}に {見|み}えない。てんせんは ぽたの いる ばしょの しるしだよ。<br>{水|みず}が {水|みず}じょうきに なって {空気|くうき}の 中へ でていく ことを「じょうはつ」と いうよ。わかさなくても じょうはつ する。", "");
      nextBtn(null, function () { go("rise"); });
    }
  }
  function condense() {
    S.pota.mode = "tiny"; S.pota.face = "cold"; S.hold = false; Snd.pop();
    const T = World.tempAt(S.pota.y).toFixed(0);
    panel("🥶 ひえて つぶに もどった！", "{上空|じょうくう}は さむい（いまは やく " + T + "℃）。ひえた {水|みず}じょうきは、{目|め}に {見|み}える ちいさな <b>{水|みず}の つぶ</b>に もどったよ。<br>（100m のぼると やく 0.6℃ さがる）", "");
    nextBtn(null, function () { go("cloud"); });
  }
  function gather(sp) {
    sp.got = true; S.cloudN++; Snd.pop();
    const b = $("#speckBar"); if (b) b.style.width = (S.cloudN / S.specks.length * 100) + "%";
    if (S.cloudN >= S.specks.length) {
      S.pota.mode = "drop"; S.pota.face = "yay"; Snd.kira();
      panel("☁️ {雲|くも}が できた！", "{雲|くも}は、{小|ちい}さな <b>{水|みず}や {氷|こおり}の つぶ</b>が たくさん あつまった もの。{水|みず}じょうき（{見|み}えない）では ないよ。<br>つぶ どうしが くっついて、ぽたは {大|おお}きく おもく なった！", "");
      nextBtn(null, function () { go("drift"); });
    }
  }
  function freezeY() { // 0℃ に なる 高さ（地面ちかくの 温度 と 着地点 から）
    const landAlt = World.alt(P.land[1]);
    const a0 = landAlt + S.groundT / 0.006;
    return World.SEA - a0 / 8;
  }
  function startFall() {
    if (S.precip.length || S.step !== "fall") return;
    const T = S.groundT;
    S.weather = T <= 1 ? "snow" : T <= 3 ? "sleet" : "rain";
    $("#fallBtn").disabled = true; $("#gt").disabled = true;
    const fy = freezeY();
    for (let i = 0; i < 90; i++) S.precip.push({ x: 1180 + Math.random() * 360, y: 150 + Math.random() * 40 - i * 4, v: 0.7 + Math.random() * 0.6, mix: Math.random() < 0.5 });
    const dest = S.weather === "snow" ? P.snowLand : P.land;
    S.pota.mode = fy > S.pota.y || S.weather === "snow" ? "snow" : "drop";
    S.pota.face = "wow";
    moveAlong([[S.pota.x, S.pota.y], dest], S.weather === "snow" ? 90 : 170, function () {
      S.precip = [];
      Snd.rain(0);
      Snd.pochan();
      if (S.weather === "snow") {
        S.snow = 1; S.snowLap = true; S.pota.mode = "snow"; S.pota.face = "sleep";
        panel("❄️ {雪|ゆき}に なった！", "{地面|じめん}ちかくが " + T + "℃ で さむいから、{氷|こおり}の つぶは とけずに <b>{雪|ゆき}</b>の まま ふって きた。{山|やま}に つもったよ。", "");
        nextBtn(null, function () { go("spring_snow"); });
      } else {
        S.pota.mode = "drop"; S.pota.face = "happy";
        panel(S.weather === "sleet" ? "🌨️ みぞれ！" : "🌧️ {雨|あめ}に なった！",
          S.weather === "sleet" ? "{地面|じめん}ちかくが " + T + "℃。とちゅうで とけかけた {雪|ゆき}と {雨|あめ}が まじった「みぞれ」に なったよ。ぽたは とけて {水|みず}に なった。"
            : "{地面|じめん}ちかくが " + T + "℃ で あたたかいから、{雲|くも}の 中の {氷|こおり}の つぶも おちる とちゅうで とけて <b>{雨|あめ}</b>に なったよ。", "");
        nextBtn(null, function () { go("choose"); });
      }
    });
  }
  function setSeason(v) {
    S.season = v; S.snow = Math.max(0, 1 - v / 100);
    const n = $("#seaVal"); if (n) n.textContent = v < 35 ? "❄️ ふゆ" : v < 100 ? "🌱 はる ちかし" : "🌸 はる";
    if (v >= 100 && S.pota.mode === "snow") {
      S.pota.mode = "drop"; S.pota.face = "yay"; Snd.pochan();
      moveAlong([[S.pota.x, S.pota.y], [1340, World.groundY(1340) - 10], P.land], 120, null);
      panel("🌸 はるに なった！", "あたたかく なって {雪|ゆき}が とけたよ（ゆきどけ{水|みず}）。{山|やま}の {雪|ゆき}は、はるから なつに かけて すこしずつ とけて {川|かわ}の {水|みず}に なる。", "");
      nextBtn(null, function () { go("choose"); });
    }
  }
  function soakAt(kind) {
    if (S.step !== "soak" || S.ready) return;
    if (kind === "clay") {
      Snd.ng(); S.pota.face = "sad";
      moveAlong([[S.pota.x, S.pota.y], [P.clay.x, P.clay.y - 12]], 220, null);
      say("ねんどは つぶが {小|ちい}さくて すきまが すくない。だから {水|みず}が なかなか しみこまないで、たまったり ながれたり するよ。すなの ほうも ためしてみて！");
      return;
    }
    S.ready = true; Snd.ok(); S.pota.face = "wow";
    moveAlong([[S.pota.x, S.pota.y], [P.sand.x, P.sand.y - 12], [P.sand.x, P.sand.y + 4]], 160, function () {
      Snd.pochan();
      say("すなは つぶが {大|おお}きくて すきまが {大|おお}きいから、{水|みず}が すぐ しみこむ！ ぽたは {地面|じめん}の 中へ…");
      nextBtn(null, function () { go("aquifer"); });
    });
  }
  function openDam() {
    if (S.step !== "dam" || !S.ready || S.lakeOpen) return;
    S.lakeOpen = true; S.ready = false; Snd.whoosh(); S.pota.face = "yay";
    moveAlong(R.lakeToIntake, 200, function () { setTimeout(function () { S.lakeOpen = false; }, 0); go("plant"); });
  }
  const TANK_TXT = [
    "① ちんでん: くすりを まぜて、{水|みず}の にごり（どろ）を かためて しずめるよ。",
    "② ろか: すなや じゃりの そうを とおして、のこった こまかい よごれを こしとるよ。",
    "③ しょうどく: ばいきんを やっつける くすり（えんそ）を すこし いれるよ。これで のめる {水|みず}！"
  ];
  function tankTap(i) {
    if (S.step !== "plant" || S.anim) return;
    if (i !== S.plantStep) { Snd.ng(); say("じゅんばんが ちがうよ。つぎは「" + ["① ちんでん", "② ろか", "③ しょうどく"][S.plantStep] + "」！"); return; }
    Snd.ok(); S.plantStep++;
    const tk = P.tanks[i];
    moveAlong([[S.pota.x, S.pota.y], [tk[0], tk[1] - 14]], 120, null);
    say(TANK_TXT[i]);
    document.querySelectorAll(".tank")[i].classList.add("done");
    if (S.plantStep >= 3) {
      S.pota.face = "yay"; Snd.kira();
      nextBtn("いえへ ▶", function () { go("faucet"); });
    }
  }
  function openFaucet() {
    if (S.step !== "faucet" || !S.ready || S.faucetOpen) return;
    S.faucetOpen = true; Snd.pochan(); S.pota.face = "wow";
    moveAlong(R.sink, 120, function () {
      S.pota.face = "happy";
      say("じゃー！ {手|て}を あらったよ。つかった {水|みず}は ながしから {下水管|げすいかん}へ ながれて いく。");
      nextBtn(null, function () { S.faucetOpen = false; moveAlong(R.sewer, 160, function () { go("sewage"); }); });
    });
  }
  function cleanSewage() {
    if (S.step !== "sewage" || S.cleaned || S.anim) return;
    S.cleaned = true; Snd.kira(); S.pota.face = "yay";
    say("{小|ちい}さな いきもの（びせいぶつ）が よごれを たべて、{水|みず}を きれいに したよ。きれいに してから {川|かわ}や {海|うみ}へ もどすんだ。");
    nextBtn("{海|うみ}へ ▶", function () { moveAlong(R.outflow, 160, function () { arrive(); }); });
  }

  function arrive() {
    S.step = "arrive"; S.anim = null; S.along = null;
    Snd.river(0); S.pota.mode = "drop"; S.pota.face = "yay";
    S.pota.x = P.seaStart[0]; S.pota.y = P.seaStart[1];
    setCam([-60, -40, 1660, 1000]);
    Snd.fanfare();
    const got = onLap ? onLap(S.route, S.snowLap) : [];
    panel("🎉 {海|うみ}に もどった！ 1しゅう！", "ぽたは " + ROUTE_NAMES[S.route] + (S.snowLap ? "（{雪|ゆき}の みち つき）" : "") + " で {地球|ちきゅう}を ひとまわり したよ。<br>{水|みず}は すがたを かえながら、ずっと ぐるぐる まわって いるんだ。",
      '<div class="stampnew">' + got.map(function (g) { return '<span class="stamp">' + g + "</span>"; }).join("") + "</div>" +
      '<button type="button" class="btn big" id="againBtn">🔁 もう いっしゅう</button>' +
      '<button type="button" class="btn sub" id="toStamps">🏅 スタンプを みる</button>');
    bind("againBtn", function () { start(); });
    bind("toStamps", function () { location.hash = "#stamps"; });
    renderTrack();
  }

  /* ---------------- うごき ---------------- */
  function update(dt) {
    t += dt;
    cam.x += (camT.x - cam.x) * Math.min(1, dt * 4);
    cam.y += (camT.y - cam.y) * Math.min(1, dt * 4);
    cam.s += (camT.s - cam.s) * Math.min(1, dt * 4);
    if (S.anim) {
      const a = S.anim;
      a.d += a.speed * dt;
      const p = at(a.path, a.d); S.pota.x = p[0]; S.pota.y = p[1];
      if (a.d >= a.path.total) { S.anim = null; if (a.done) a.done(); }
    }
    if (S.along) {
      const A = S.along;
      if (S.hold) A.d = Math.min(A.path.total, A.d + 110 * dt);
      const p = at(A.path, A.d); S.pota.x = p[0]; S.pota.y = p[1];
      const f = A.d / A.path.total;
      (A.msgs || []).forEach(function (m, i) { if (f >= m[0] && !S.msgAt[i]) { S.msgAt[i] = 1; say(m[1]); } });
      if (S.step === "river" || S.step === "aquifer") Snd.river(S.hold || S.drag ? 0.8 : 0.3);
      if (A.d >= A.path.total - 4) { const e = A.end; S.along = null; S.hold = false; Snd.river(0); if (e) e(); }
    }
    if (S.step === "riverSea") Snd.river(0.6);
    if (S.step === "rise" && S.pota.mode === "vapor") {
      if (S.hold) S.pota.y = Math.max(395, S.pota.y - 90 * dt);
      if (S.pota.y <= 400) condense();
    }
    if (S.step === "drift") { S.cloudPos[0] = S.pota.x; S.cloudPos[1] = S.pota.y; }
    if (S.precip.length) {
      Snd.rain(S.weather === "snow" ? 0.15 : 0.8);
      S.precip.forEach(function (d) {
        d.y += (S.weather === "snow" ? 70 : 320) * d.v * dt;
        if (d.y > World.groundY(d.x)) d.y = 150 + Math.random() * 30;
      });
    }
    trailPush();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(cam.s, cam.s); ctx.translate(-cam.x, -cam.y);
    World.draw(ctx, { t: t, snow: S.snow, lakeOpen: S.lakeOpen, plantStep: S.plantStep, cleaned: S.cleaned, faucetOpen: S.faucetOpen,
      sunHot: S.step === "sea" ? S.heat / 100 : 0, scale: cam.s, labels: (overview || S.step === "arrive" || S.step === "choose") ? World.LABELS : null });
    // 0℃ の 線
    if (S.step === "cloud" || S.step === "fall" || S.step === "rise") {
      const fy = S.step === "fall" ? freezeY() : World.SEA - (20 / 0.006) / 8;
      ctx.save(); ctx.setLineDash([12, 10]); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3 / cam.s;
      ctx.beginPath(); ctx.moveTo(-900, fy); ctx.lineTo(2500, fy); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "bold " + (16 / cam.s) + "px system-ui, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText("0℃ の たかさ", cam.x + (cw - 120) / cam.s, fy - 6 / cam.s);
      ctx.restore();
    }
    // あるいた あと
    if (S.trail.length > 1 && (overview || S.step === "arrive")) {
      ctx.save(); ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.setLineDash([2, 12]);
      ctx.strokeStyle = "#fa5252"; ctx.beginPath();
      S.trail.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.restore();
    }
    // 雲（つくった くも）
    if (S.step === "cloud" || S.step === "drift" || S.step === "fall") {
      const n = S.step === "cloud" ? S.cloudN : 7;
      if (n > 0) World.cloud(ctx, S.cloudPos[0], S.cloudPos[1], 26 + n * 7, Math.min(0.97, 0.45 + n * 0.08));
    }
    // 雨・雪
    if (S.precip.length) {
      const fy = freezeY();
      S.precip.forEach(function (d) {
        const snow = S.weather === "snow" || (d.y < fy) || (S.weather === "sleet" && d.mix);
        if (snow) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, 7); ctx.fill(); }
        else { ctx.strokeStyle = "rgba(208,235,255,.95)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 16); ctx.stroke(); }
      });
      if (S.weather !== "snow" && S.pota.mode === "snow" && S.pota.y > fy) { S.pota.mode = "drop"; }
    }
    ctx.restore();

    // ここから 画面の 座標
    const r = potaR();
    if (S.step === "cloud") {
      S.specks.forEach(function (sp) {
        if (sp.got) return;
        const q = w2s(sp.x, sp.y);
        drawSpeck(ctx, q[0], q[1] + Math.sin(t * 2 + sp.ph) * 3, r * 0.42, sp.ice);
      });
    }
    // みちあんない（なぞる みち）
    if (S.along) {
      ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.beginPath();
      for (let d = S.along.d; d <= S.along.path.total; d += 8) { const p = at(S.along.path, d), q = w2s(p[0], p[1]); d === S.along.d ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); }
      ctx.stroke(); ctx.restore();
    }
    const q = w2s(S.pota.x, S.pota.y);
    drawPota(ctx, q[0], q[1] - (S.pota.mode === "snow" ? r * 0.2 : r * 0.35), r, S.pota.mode, S.pota.face, t);
    // 温度計
    if (S.step === "rise" || S.step === "cloud" || S.step === "fall") {
      const T = S.step === "fall" ? S.groundT : World.tempAt(S.pota.y);
      thermo(ctx, 14, Math.max(70, ch * 0.12), Math.min(ch * 0.62, 300), T, S.step === "fall" ? "じめん ちかく" : "やく " + Math.max(0, World.alt(S.pota.y)) + "m");
    }
    // ヒント（指）
    if (S.step === "sea" && S.heat < 100) hint(w2s(P.sun.x, P.sun.y), "こすって！", r);
    if (S.step === "rise" && S.pota.mode === "vapor" && S.pota.y > 590) hint([q[0], q[1] - r * 3], "うえへ！", r);
  }
  function hint(p, text, r) {
    ctx.save(); ctx.font = "bold " + Math.round(r * 0.7) + "px system-ui, sans-serif"; ctx.textAlign = "center";
    const dx = Math.sin(t * 5) * r * 0.6;
    ctx.fillText("👆", p[0] + dx, p[1] + r * 2.4);
    ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(text, p[0], p[1] + r * 3.4); ctx.fillStyle = "#c2255c"; ctx.fillText(text, p[0], p[1] + r * 3.4);
    ctx.restore();
  }
  function thermo(ctx, x, y, h, T, label) {
    const lo = -10, hi = 30, w = 22;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - 30, w + 58, h + 70, 12) : ctx.rect(x, y - 30, w + 58, h + 70); ctx.fill(); ctx.stroke();
    const tx = x + 14, k = function (v) { return y + h - (v - lo) / (hi - lo) * h; };
    ctx.fillStyle = "#f1f3f5"; ctx.fillRect(tx, y, 10, h); ctx.strokeRect(tx, y, 10, h);
    ctx.fillStyle = "#e03131"; const ty = k(Math.max(lo, Math.min(hi, T)));
    ctx.fillRect(tx + 2, ty, 6, y + h - ty);
    ctx.beginPath(); ctx.arc(tx + 5, y + h + 10, 10, 0, 7); ctx.fill();
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = "#212529"; ctx.textBaseline = "middle";
    for (let v = lo; v <= hi; v += 10) { ctx.fillRect(tx + 10, k(v), 6, 1.5); ctx.fillText(v + "", tx + 20, k(v)); }
    ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillStyle = T <= 0 ? "#1971c2" : "#c92a2a";
    ctx.fillText(Math.round(T) + "℃", x + (w + 58) / 2, y - 14);
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = "#495057";
    ctx.fillText(label, x + (w + 58) / 2, y + h + 30);
    ctx.restore();
  }

  function loop(ts) {
    if (!active) { raf = 0; return; }
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  /* ---------------- タッチ ---------------- */
  function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function down(e) {
    Snd.unlock();
    const p = pos(e), w = s2w(p[0], p[1]), r = potaR();
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    S.drag = { last: p, kind: null };
    const sun = w2s(P.sun.x, P.sun.y), sunR = P.sun.r * cam.s + 30;
    const potaS = w2s(S.pota.x, S.pota.y);
    const near = function (a, rad) { return Math.hypot(p[0] - a[0], p[1] - a[1]) < rad; };
    if (S.step === "sea" && near(sun, sunR)) { S.drag.kind = "sun"; heatUp(4); }
    else if (S.step === "rise" && S.pota.mode === "vapor") S.drag.kind = "rise";
    else if (S.step === "cloud") {
      let best = null, bd = r * 1.6;
      S.specks.forEach(function (sp) { if (sp.got) return; const q = w2s(sp.x, sp.y), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = sp; } });
      if (best) { S.drag.kind = "speck"; S.drag.sp = best; }
    }
    else if (S.along && near(potaS, r * 2.6)) S.drag.kind = "along";
    else if (S.step === "dam" && near(w2s(P.dam.x, 470), 40 + 30 * cam.s)) openDam();
    else if (S.step === "soak") {
      if (near(w2s(P.sand.x, P.sand.y), 34 * cam.s)) soakAt("sand");
      else if (near(w2s(P.clay.x, P.clay.y), 34 * cam.s)) soakAt("clay");
    }
    else if (S.step === "plant") P.tanks.forEach(function (tk, i) { if (near(w2s(tk[0], tk[1]), 15 * cam.s)) tankTap(i); });
    else if (S.step === "faucet" && near(w2s(800, 548), 20 * cam.s)) openFaucet();
    else if (S.step === "sewage" && near(w2s(P.sewage.x + 41, P.sewage.y - 14), 50 * cam.s)) cleanSewage();
  }
  function move(e) {
    if (!S.drag || !S.drag.kind) return;
    const p = pos(e), w = s2w(p[0], p[1]), L = S.drag.last;
    const moved = Math.hypot(p[0] - L[0], p[1] - L[1]);
    S.drag.last = p;
    const k = S.drag.kind;
    if (k === "sun") { const sun = w2s(P.sun.x, P.sun.y); if (Math.hypot(p[0] - sun[0], p[1] - sun[1]) < P.sun.r * cam.s + 50) heatUp(moved * 0.12); }
    else if (k === "rise") { if (w[1] < S.pota.y) S.pota.y = Math.max(395, w[1]); }
    else if (k === "speck") {
      const sp = S.drag.sp; sp.x = w[0]; sp.y = w[1];
      if (Math.hypot(sp.x - S.cloudPos[0], sp.y - S.cloudPos[1]) < 60) { S.drag.kind = null; gather(sp); }
    }
    else if (k === "along" && S.along) {
      const A = S.along, n = nearest(A.path, w[0], w[1], A.d - 10, A.d + 140);
      if (n.d != null && n.dist * cam.s < 90 && n.d > A.d) A.d = n.d;
    }
  }
  function up() { S.drag = null; }

  /* ---------------- そと向け ---------------- */
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    setCam(camRect, true);
  }
  function start() {
    S = fresh(); overview = false;
    go("sea");
    setCam(camRect, true);
  }
  function init(opts) {
    $ = opts.$; rb = opts.rb; onLap = opts.onLap;
    cv = document.getElementById("cv"); ctx = cv.getContext("2d");
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    ["pointerup", "pointercancel"].forEach(function (n) { cv.addEventListener(n, up); });
    window.addEventListener("resize", function () { if (active) resize(); });
    document.getElementById("mapBtn").onclick = function () {
      overview = !overview; this.classList.toggle("on", overview);
      this.textContent = overview ? "🔍 もどる" : "🗺️ ぜんたい"; setCam(camRect);
    };
    document.getElementById("sayBtn").onclick = function () { const s = $("#pText").dataset.say; const o = Say.on; Say.on = true; Say.speak(s || ""); Say.on = o; };
    start();
  }
  function show(on) {
    active = on;
    if (on) { resize(); last = 0; if (!raf) raf = requestAnimationFrame(loop); }
    else { Snd.river(0); Snd.rain(0); Say.cancel(); }
  }

  return {
    init: init, show: show, start: start,
    test: { state: function () { return S; }, w2s: function (x, y) { const r = cv.getBoundingClientRect(), q = w2s(x, y); return [q[0] + r.left, q[1] + r.top]; }, go: go }
  };
})();
