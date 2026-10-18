/* ============================================================
   ぽよよん スーパーボール — ボールの しゅるい（データ）と えがきかた
   みため・おおきさ・はねかえり・とくしゅ こうか・レアど を データで もつ
   もようは ぜんぶ Canvas で かく（がぞう ファイル なし）
   ============================================================ */
(function (root) {
  "use strict";

  // r: はんけい [さいしょう, さいだい]（きじゅんの がめん。app が がめんの おおきさで かける）
  // e: はねかえり、et: せっせん ほうこうの はねかえり（かいてん）、mu: まさつ、rho: おもさ
  // rar: レアど 1〜4、fx: とくしゅ こうか
  var BASE = { r: [16, 34], e: 0.9, et: 0.7, mu: 0.9, rho: 1 };
  var COLORS = [
    ["aka", "あか", "#f03e3e"], ["daidai", "だいだい", "#fd7e14"], ["kiiro", "きいろ", "#fcc419"],
    ["kimidori", "きみどり", "#94d82d"], ["midori", "みどり", "#2f9e44"], ["mizuiro", "みずいろ", "#3bc9db"],
    ["ao", "あお", "#1c7ed6"], ["murasaki", "むらさき", "#7048e8"], ["pink", "ピンク", "#f06595"],
    ["shiro", "しろ", "#f1f3f5"], ["kuro", "くろ", "#343a40"], ["chairo", "ちゃいろ", "#a0522d"]
  ];
  var KINDS = COLORS.map(function (c) {
    return { id: c[0], name: c[1], col: c[2], pat: "plain", rar: 1, desc: "いちばん ふつうの スーパーボール。よく はねるよ", group: "ふつう" };
  });
  KINDS.push(
    { id: "rame", name: "ラメ", col: "#4c6ef5", col2: "#ffe066", pat: "rame", rar: 2, desc: "キラキラの こなが はいっている" },
    { id: "madara", name: "まだら", col: "#f783ac", col2: "#74c0fc", col3: "#ffe066", pat: "madara", rar: 2, desc: "いろが まざった マーブル もよう" },
    { id: "suke", name: "すけすけ", col: "#66d9e8", pat: "clear", rar: 2, desc: "むこうが すけて みえる。なかに あわ" },
    { id: "hikaru", name: "ひかる", col: "#c0eb75", pat: "glow", rar: 2, fx: { glow: true }, desc: "🌙 よる に すると ひかるよ" },
    { id: "chikyu", name: "ちきゅう", col: "#1c7ed6", col2: "#51cf66", pat: "earth", rar: 3, desc: "ちいさな ちきゅう。くるくる まわる" },
    { id: "medama", name: "めだまやき", col: "#ffffff", col2: "#fcc419", pat: "egg", rar: 2, desc: "あさごはんの めだまやき" },
    { id: "suika", name: "すいか", col: "#40c057", col2: "#1b5e20", pat: "suika", rar: 2, desc: "なつの すいか もよう" },
    { id: "densha", name: "でんしゃ", col: "#f8f9fa", col2: "#1971c2", pat: "densha", rar: 3, desc: "まどが ならんだ でんしゃ もよう" },
    { id: "soccer", name: "サッカー", col: "#ffffff", col2: "#212529", pat: "soccer", rar: 2, desc: "サッカーボールの もよう" },
    { id: "obake", name: "おばけ", col: "#f8f9fa", pat: "ghost", rar: 3, fx: { ghost: true }, desc: "ときどき すけて、ボールを すりぬける" },
    { id: "chibi", name: "ちいさい", col: "#ff8787", pat: "dots", rar: 2, r: [8, 11], desc: "とっても ちいさい。たかい おとで はねる" },
    { id: "kyodai", name: "きょだい", col: "#748ffc", col2: "#fff", pat: "band", rar: 3, r: [62, 80], rho: 0.8, desc: "とっても おおきい。ひくい おとで ぼよーん" },
    { id: "wakare", name: "ふたつに わかれる", col: "#ff922b", col2: "#4dabf7", pat: "half", rar: 3, fx: { split: true }, desc: "つよく ぶつかると 2こに わかれる" },
    { id: "slime", name: "くっつく スライム", col: "#69db7c", pat: "slime", rar: 2, e: 0.45, et: 0.1, mu: 1.4, fx: { sticky: true }, desc: "ねばねば。すこし はねにくい" },
    { id: "tomaranai", name: "ぜんぜん とまらない", col: "#ffd43b", col2: "#f76707", pat: "star", rar: 4, e: 1.0, et: 0.9, fx: { nonstop: true }, desc: "はねかえり 1.0！ いつまでも はねつづける" },
    { id: "niji", name: "にじいろ", col: "#ff6b6b", pat: "rainbow", rar: 3, desc: "7いろの しましま" },
    { id: "hoshi", name: "ほし", col: "#364fc7", col2: "#ffe066", pat: "stars", rar: 2, desc: "よぞらに ほしが いっぱい" },
    { id: "mizutama", name: "みずたま", col: "#e64980", col2: "#ffffff", pat: "dots", rar: 1, desc: "まるい みずたま もよう" },
    { id: "shima", name: "しましま", col: "#fab005", col2: "#e8590c", pat: "stripe", rar: 1, desc: "よこの しましま" },
    { id: "niko", name: "にこにこ", col: "#ffd43b", pat: "smile", rar: 2, desc: "いつも にこにこ" },
    { id: "basket", name: "バスケット", col: "#e8590c", col2: "#212529", pat: "basket", rar: 2, desc: "バスケットボールの もよう" },
    { id: "tsuki", name: "おつきさま", col: "#fff3bf", col2: "#e9d68a", pat: "moon", rar: 3, desc: "でこぼこ クレーターの おつきさま" },
    { id: "neko", name: "ねこ", col: "#ffa94d", pat: "cat", rar: 3, desc: "にゃーん。ひげが ある" },
    { id: "ichigo", name: "いちご", col: "#e03131", col2: "#ffe066", pat: "berry", rar: 2, desc: "あまい いちご もよう" }
  );
  KINDS.forEach(function (k, i) {
    k.no = i + 1;
    k.group = k.group || "とくべつ";
    ["r", "e", "et", "mu", "rho"].forEach(function (p) { if (k[p] == null) k[p] = BASE[p]; });
    k.fx = k.fx || {};
  });
  var BY = {};
  KINDS.forEach(function (k) { BY[k.id] = k; });

  var RARITY = { 1: 60, 2: 30, 3: 9, 4: 1.5 };   // ガチャの でやすさ

  /* ---------- たね つき らんすう（もようを いつも おなじに）---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var m = f < 0 ? 0 : 255, t = Math.abs(f);
    r = Math.round(r + (m - r) * t); g = Math.round(g + (m - g) * t); b = Math.round(b + (m - b) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  function star(c, x, y, r, rot) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }

  /* ---------- もよう（0,0 が まんなか。はんけい r。まるで クリップ ずみ）---------- */
  var PAT = {
    plain: function () {},
    rame: function (c, r, k, R) {
      for (var i = 0; i < 46; i++) {
        var a = R() * 6.283, d = Math.sqrt(R()) * r * 0.95;
        c.fillStyle = i % 3 ? k.col2 : "#fff";
        star(c, Math.cos(a) * d, Math.sin(a) * d, r * (0.04 + R() * 0.05), R() * 3);
      }
    },
    madara: function (c, r, k, R) {
      var cols = [k.col2, k.col3, "#fff"];
      for (var i = 0; i < 9; i++) {
        c.fillStyle = cols[i % 3];
        c.globalAlpha = 0.75;
        c.beginPath();
        var a0 = R() * 6.283, d = R() * r * 0.8, x = Math.cos(a0) * d, y = Math.sin(a0) * d, s = r * (0.25 + R() * 0.35);
        c.ellipse(x, y, s, s * (0.35 + R() * 0.4), R() * 3, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    clear: function (c, r, k, R) {
      c.fillStyle = "rgba(255,255,255,.55)";
      for (var i = 0; i < 9; i++) {
        var a = R() * 6.283, d = R() * r * 0.75;
        c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.04 + R() * 0.08), 0, 7);
        c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = Math.max(1, r * 0.03); c.stroke();
      }
      c.fillStyle = k.col; c.globalAlpha = 0.5; circle(c, r * 0.15, r * 0.1, r * 0.35); c.globalAlpha = 1;
    },
    glow: function (c, r) {
      c.fillStyle = "rgba(255,255,255,.35)";
      for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, r * (0.3 + i * 0.22), 0, 7); c.lineWidth = r * 0.06; c.strokeStyle = "rgba(255,255,255,.35)"; c.stroke(); }
    },
    earth: function (c, r, k, R) {
      c.fillStyle = k.col2;
      var blobs = [[-0.35, -0.3, 0.38, 0.25, 0.5], [0.3, 0.1, 0.3, 0.42, -0.3], [-0.2, 0.5, 0.32, 0.18, 0.2], [0.55, -0.55, 0.2, 0.14, 0.8]];
      blobs.forEach(function (b) { c.beginPath(); c.ellipse(b[0] * r, b[1] * r, b[2] * r, b[3] * r, b[4], 0, 7); c.fill(); });
      c.fillStyle = "rgba(255,255,255,.8)";
      for (var i = 0; i < 4; i++) { c.beginPath(); c.ellipse((R() - 0.5) * r * 1.4, (R() - 0.5) * r * 1.4, r * 0.28, r * 0.07, R(), 0, 7); c.fill(); }
    },
    egg: function (c, r, k) {
      c.fillStyle = k.col2; circle(c, r * 0.12, -r * 0.08, r * 0.45);
      c.fillStyle = "rgba(255,255,255,.7)"; circle(c, r * 0.0, -r * 0.22, r * 0.12);
      c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = r * 0.05;
      c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.stroke();
    },
    suika: function (c, r, k) {
      c.strokeStyle = k.col2; c.lineWidth = r * 0.16; c.lineJoin = "round";
      for (var i = -2; i <= 2; i++) {
        c.beginPath();
        for (var y = -r; y <= r; y += r / 6) c.lineTo(i * r * 0.42 + ((Math.round(y / (r / 6)) % 2) ? r * 0.08 : -r * 0.08), y);
        c.stroke();
      }
    },
    densha: function (c, r, k) {
      c.fillStyle = k.col2; c.fillRect(-r, r * 0.1, r * 2, r * 0.32);
      c.fillStyle = "#ffd43b"; c.fillRect(-r, r * 0.42, r * 2, r * 0.08);
      c.fillStyle = "#495057";
      for (var i = -3; i <= 3; i++) c.fillRect(i * r * 0.32 - r * 0.11, -r * 0.42, r * 0.22, r * 0.36);
      c.fillStyle = "#adb5bd"; c.fillRect(-r, r * 0.7, r * 2, r * 0.3);
    },
    soccer: function (c, r, k) {
      c.fillStyle = k.col2;
      var pent = function (x, y, s, rot) {
        c.beginPath();
        for (var i = 0; i < 5; i++) { var a = rot + i * Math.PI * 2 / 5 - Math.PI / 2; c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); }
        c.closePath(); c.fill();
      };
      pent(0, 0, r * 0.3, 0);
      for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5 + Math.PI / 2; pent(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.3, a); }
      c.strokeStyle = k.col2; c.lineWidth = r * 0.05;
      for (i = 0; i < 5; i++) { a = i * Math.PI * 2 / 5 - Math.PI / 2; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3); c.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); c.stroke(); }
    },
    ghost: function (c, r) {
      c.fillStyle = "#343a40";
      c.beginPath(); c.ellipse(-r * 0.3, -r * 0.12, r * 0.12, r * 0.18, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(r * 0.3, -r * 0.12, r * 0.12, r * 0.18, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(0, r * 0.32, r * 0.16, r * 0.12, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(255,135,135,.5)"; circle(c, -r * 0.55, r * 0.12, r * 0.12); circle(c, r * 0.55, r * 0.12, r * 0.12);
    },
    dots: function (c, r, k) {
      c.fillStyle = k.col2 || "#fff";
      var s = r * 0.5;
      for (var x = -2; x <= 2; x++) for (var y = -2; y <= 2; y++) {
        var px = x * s + (y % 2 ? s / 2 : 0), py = y * s * 0.9;
        circle(c, px, py, r * 0.12);
      }
    },
    band: function (c, r, k) {
      c.fillStyle = k.col2; c.fillRect(-r, -r * 0.14, r * 2, r * 0.28);
      c.fillStyle = shade(k.col, -0.25); c.fillRect(-r, -r * 0.2, r * 2, r * 0.06); c.fillRect(-r, r * 0.14, r * 2, r * 0.06);
    },
    half: function (c, r, k) {
      c.fillStyle = k.col2; c.fillRect(0, -r, r, r * 2);
      c.strokeStyle = "#fff"; c.lineWidth = r * 0.1; c.setLineDash([r * 0.18, r * 0.12]);
      c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.setLineDash([]);
    },
    slime: function (c, r) {
      c.fillStyle = "rgba(255,255,255,.35)";
      circle(c, -r * 0.3, r * 0.3, r * 0.14); circle(c, r * 0.35, r * 0.45, r * 0.08); circle(c, r * 0.4, -r * 0.1, r * 0.1);
      c.fillStyle = "#2b8a3e";
      circle(c, -r * 0.25, -r * 0.15, r * 0.08); circle(c, r * 0.2, -r * 0.15, r * 0.08);
    },
    star: function (c, r, k) {
      var g = c.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, "#fff3bf"); g.addColorStop(0.5, k.col); g.addColorStop(1, k.col2);
      c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2);
      c.fillStyle = "#fff"; star(c, 0, 0, r * 0.55, 0);
      c.fillStyle = k.col2; star(c, 0, 0, r * 0.3, 0);
    },
    rainbow: function (c, r) {
      var cols = ["#ff6b6b", "#ffa94d", "#ffe066", "#8ce99a", "#74c0fc", "#748ffc", "#da77f2"];
      var h = r * 2 / cols.length;
      cols.forEach(function (col, i) { c.fillStyle = col; c.fillRect(-r, -r + i * h, r * 2, h + 1); });
    },
    stars: function (c, r, k, R) {
      c.fillStyle = k.col2;
      for (var i = 0; i < 9; i++) {
        var a = R() * 6.283, d = Math.sqrt(R()) * r * 0.85;
        star(c, Math.cos(a) * d, Math.sin(a) * d, r * (0.1 + R() * 0.1), R() * 3);
      }
    },
    stripe: function (c, r, k) {
      c.fillStyle = k.col2;
      for (var y = -r; y < r; y += r * 0.5) c.fillRect(-r, y, r * 2, r * 0.22);
    },
    smile: function (c, r) {
      c.fillStyle = "#343a40";
      c.beginPath(); c.ellipse(-r * 0.3, -r * 0.2, r * 0.09, r * 0.16, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(r * 0.3, -r * 0.2, r * 0.09, r * 0.16, 0, 0, 7); c.fill();
      c.strokeStyle = "#343a40"; c.lineWidth = r * 0.09; c.lineCap = "round";
      c.beginPath(); c.arc(0, r * 0.05, r * 0.45, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.fillStyle = "rgba(255,107,107,.45)"; circle(c, -r * 0.58, r * 0.18, r * 0.12); circle(c, r * 0.58, r * 0.18, r * 0.12);
    },
    basket: function (c, r, k) {
      c.strokeStyle = k.col2; c.lineWidth = r * 0.06;
      c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
      c.beginPath(); c.arc(-r * 1.25, 0, r * 0.85, -1, 1); c.stroke();
      c.beginPath(); c.arc(r * 1.25, 0, r * 0.85, Math.PI - 1, Math.PI + 1); c.stroke();
    },
    moon: function (c, r, k, R) {
      c.fillStyle = k.col2;
      for (var i = 0; i < 7; i++) {
        var a = R() * 6.283, d = R() * r * 0.75, s = r * (0.08 + R() * 0.16);
        circle(c, Math.cos(a) * d, Math.sin(a) * d, s);
      }
    },
    cat: function (c, r) {
      c.fillStyle = "#e8590c";
      c.beginPath(); c.moveTo(-r * 0.75, -r * 0.6); c.lineTo(-r * 0.35, -r * 0.95); c.lineTo(-r * 0.15, -r * 0.6); c.fill();
      c.beginPath(); c.moveTo(r * 0.75, -r * 0.6); c.lineTo(r * 0.35, -r * 0.95); c.lineTo(r * 0.15, -r * 0.6); c.fill();
      c.fillStyle = "#343a40"; circle(c, -r * 0.3, -r * 0.1, r * 0.09); circle(c, r * 0.3, -r * 0.1, r * 0.09);
      c.fillStyle = "#f06595"; c.beginPath(); c.moveTo(-r * 0.08, r * 0.1); c.lineTo(r * 0.08, r * 0.1); c.lineTo(0, r * 0.2); c.fill();
      c.strokeStyle = "#343a40"; c.lineWidth = r * 0.04;
      [-1, 1].forEach(function (s) {
        for (var i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(s * r * 0.2, r * (0.22 + i * 0.06)); c.lineTo(s * r * 0.8, r * (0.2 + i * 0.14)); c.stroke(); }
      });
    },
    berry: function (c, r, k, R) {
      c.fillStyle = k.col2;
      for (var i = 0; i < 18; i++) {
        var a = R() * 6.283, d = Math.sqrt(R()) * r * 0.85;
        c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.04, r * 0.07, a, 0, 7); c.fill();
      }
      c.fillStyle = "#2f9e44";
      for (i = 0; i < 5; i++) { var aa = i * 1.2566 - Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(aa) * r * 0.25, -r * 0.75 + Math.sin(aa) * r * 0.15, r * 0.22, r * 0.08, aa, 0, 7); c.fill(); }
    }
  };

  /* ---------- スプライト（おおきさ ごとに 1かい だけ かく）---------- */
  var cache = new Map();
  function makeCanvas(w, h) {
    // ふつうの canvas の ほうが drawImage が はやい（OffscreenCanvas は まいかい てんそう される ことが ある）
    if (typeof document === "undefined") return new OffscreenCanvas(w, h);
    var c = document.createElement("canvas"); c.width = w; c.height = h; return c;
  }
  function bucket(px) { return Math.max(2, Math.round(Math.log(px) / Math.log(1.07))); }

  // もよう（かいてん する ぶぶん）
  function bodySprite(k, px) {
    var bk = bucket(px), key = k.id + "|" + bk;
    var s = cache.get(key);
    if (s) return s;
    if (cache.size > 600) cache.clear();
    var r = Math.pow(1.07, bk), size = Math.ceil(r * 2 + 4), cv = makeCanvas(size, size), c = cv.getContext("2d");
    c.translate(size / 2, size / 2);
    c.save();
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
    if (k.pat === "clear" || k.pat === "slime") { c.fillStyle = k.col; c.globalAlpha = k.pat === "clear" ? 0.45 : 0.75; c.fillRect(-r, -r, r * 2, r * 2); c.globalAlpha = 1; }
    else { c.fillStyle = k.col; c.fillRect(-r, -r, r * 2, r * 2); }
    PAT[k.pat](c, r, k, rng(hash(k.id)));
    c.restore();
    s = { cv: cv, r: r, size: size };
    cache.set(key, s);
    return s;
  }

  // つや と かげ（かいてん しない ぶぶん）
  function glossSprite(px) {
    var bk = bucket(px), key = "gloss|" + bk;
    var s = cache.get(key);
    if (s) return s;
    var r = Math.pow(1.07, bk), size = Math.ceil(r * 2 + 4), cv = makeCanvas(size, size), c = cv.getContext("2d");
    c.translate(size / 2, size / 2);
    var g = c.createRadialGradient(r * 0.25, r * 0.3, r * 0.2, 0, 0, r);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.75, "rgba(0,0,0,.05)"); g.addColorStop(1, "rgba(0,0,0,.28)");
    c.fillStyle = g; circle(c, 0, 0, r);
    g = c.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.55);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.35, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; circle(c, 0, 0, r);
    c.fillStyle = "rgba(255,255,255,.85)";
    c.beginPath(); c.ellipse(-r * 0.4, -r * 0.45, r * 0.16, r * 0.09, -0.7, 0, 7); c.fill();
    c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = Math.max(1, r * 0.03);
    c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, 7); c.stroke();
    s = { cv: cv, r: r, size: size };
    cache.set(key, s);
    return s;
  }

  function glowSprite(px, col) {
    var bk = bucket(px), key = "glow|" + col + "|" + bk;
    var s = cache.get(key);
    if (s) return s;
    var r = Math.pow(1.07, bk), R = r * 2.4, size = Math.ceil(R * 2), cv = makeCanvas(size, size), c = cv.getContext("2d");
    c.translate(size / 2, size / 2);
    var g = c.createRadialGradient(0, 0, r * 0.6, 0, 0, R);
    g.addColorStop(0, col); g.addColorStop(0.35, col.replace("rgb", "rgba").replace(")", ",.35)")); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; circle(c, 0, 0, R);
    s = { cv: cv, r: R, size: size };
    cache.set(key, s);
    return s;
  }

  /* ボールを かく
     c: 2D コンテキスト（CSS px の ざひょう）、dpr: がめんの きめこまかさ
     o: { a: かいてん, sq: つぶれ, sqa: つぶれる むき, alpha, sil: シルエット } */
  // もよう＋つや を 1まいに まとめた スプライト（かいてんは 24だんかい に わけて さきに かく）
  var STEPS = 24, ROUND = { plain: 1, clear: 1, glow: 1 };
  function fullSprite(k, px, ai) {
    var bk = bucket(px), key = "f|" + k.id + "|" + bk + "|" + ai;
    var s = cache.get(key);
    if (s) return s;
    if (cache.size > 1500) cache.clear();
    var b = bodySprite(k, px), g = glossSprite(px), cv = makeCanvas(b.size, b.size), c = cv.getContext("2d");
    c.translate(b.size / 2, b.size / 2);
    c.save(); c.rotate(ai * Math.PI * 2 / STEPS); c.drawImage(b.cv, -b.size / 2, -b.size / 2); c.restore();
    c.drawImage(g.cv, -g.size / 2, -g.size / 2);
    s = { cv: cv, r: b.r, size: b.size };
    cache.set(key, s);
    return s;
  }

  function draw(c, k, x, y, r, dpr, o) {
    o = o || {};
    if (typeof k === "string") k = BY[k];
    var px = r * dpr;
    // はやい みち: つぶれて いない ときは 1かいの drawImage だけ
    if (!o.sil) {
      var ai = ROUND[k.pat] ? 0 : ((Math.round((o.a || 0) / (Math.PI * 2) * STEPS) % STEPS) + STEPS) % STEPS;
      var fs = fullSprite(k, px, ai), half = fs.size / 2 * r / fs.r;
      var ga = c.globalAlpha;
      if (o.alpha != null) c.globalAlpha = o.alpha;
      if (o.sq > 0.03) {
        // つぶれ: ぶつかった むきに ぺちゃっと
        var sa0 = o.sqa || 0;
        c.save(); c.translate(x, y); c.rotate(sa0); c.scale(1 - o.sq, 1 + o.sq * 0.6); c.rotate(-sa0);
        c.drawImage(fs.cv, -half, -half, half * 2, half * 2);
        c.restore();
      } else c.drawImage(fs.cv, x - half, y - half, half * 2, half * 2);
      c.globalAlpha = ga;
      return;
    }
    c.save();
    c.translate(x, y);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (o.sq) {
      var sa = o.sqa || 0;
      c.rotate(sa); c.scale(1 - o.sq, 1 + o.sq * 0.6); c.rotate(-sa);
    }
    if (o.sil) {
      c.fillStyle = "rgba(73,80,87,.35)";
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)";
      c.font = "bold " + Math.round(r * 1.1) + "px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("？", 0, r * 0.06);
      c.restore();
      return;
    }
    var bs = bodySprite(k, px), sc = r / bs.r;
    c.save();
    c.rotate(o.a || 0);
    c.scale(sc, sc);
    c.drawImage(bs.cv, -bs.size / 2, -bs.size / 2);
    c.restore();
    var gs = glossSprite(px), gc = r / gs.r;
    c.scale(gc, gc);
    c.drawImage(gs.cv, -gs.size / 2, -gs.size / 2);
    c.restore();
  }
  function drawGlow(c, k, x, y, r, dpr, alpha) {
    if (typeof k === "string") k = BY[k];
    var col = k.fx.glow ? "rgb(192,235,117)" : k.fx.nonstop ? "rgb(255,212,59)" : shade(k.col, 0.3);
    var gs = glowSprite(r * dpr, col), sc = (r * 2.4) / gs.r;
    c.save();
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.translate(x, y); c.scale(sc, sc);
    c.drawImage(gs.cv, -gs.size / 2, -gs.size / 2);
    c.restore();
  }

  // ちいさい キャンバスに 1こ かく（ずかん・パレット よう）
  function thumb(cv, k, sil) {
    var dpr = Math.min(3, (root.devicePixelRatio || 1));
    var w = cv.clientWidth || 56, h = cv.clientHeight || 56;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    draw(c, k, w / 2, h / 2, Math.min(w, h) * 0.42, dpr, { sil: sil, a: -0.3 });
  }

  // ガチャの でやすさ で 1つ えらぶ（R は 0〜1 の らんすう かんすう）
  function pickGacha(R) {
    var total = 0, i;
    for (i = 0; i < KINDS.length; i++) total += RARITY[KINDS[i].rar];
    var x = (R || Math.random)() * total;
    for (i = 0; i < KINDS.length; i++) { x -= RARITY[KINDS[i].rar]; if (x < 0) return KINDS[i]; }
    return KINDS[KINDS.length - 1];
  }

  var api = { KINDS: KINDS, BY: BY, RARITY: RARITY, draw: draw, drawGlow: drawGlow, thumb: thumb, pickGacha: pickGacha, shade: shade, rng: rng };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SBBalls = api;
})(typeof self !== "undefined" ? self : this);
