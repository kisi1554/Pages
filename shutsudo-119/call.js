/* ============================================================
   しゅつどう！ 119 — でんわ
   ・Dispatch: しれいセンター の しれいいん に なって、つうほう を きいて くるま を えらぶ。
   ・Practice: こども が つうほう する がわ。ボタン で こたえる ロールプレイ。
     ほんとう の でんわ は かけない（tel: リンク は つかわない）。
   ============================================================ */
(function (root) {
  "use strict";

  var D = root.S119_DATA, AU = root.S119_AUDIO;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function Log(box) { this.box = box; }
  Log.prototype.add = function (who, txt, cls) {
    var row = el("div", "msg " + who + (cls ? " " + cls : ""));
    var face = { op: "🎧", caller: "📞", me: "🙂", tip: "🌱", good: "⭐" }[who] || "💬";
    row.appendChild(el("span", "face", face));
    row.appendChild(el("span", "bub", esc(txt)));
    this.box.appendChild(row);
    this.box.scrollTop = this.box.scrollHeight;
    var self = this;
    setTimeout(function () { self.box.scrollTop = self.box.scrollHeight; }, 30);
    return row;
  };

  // ====================== しれいセンター ======================
  function Dispatch(root0, m, done) {
    this.r = root0; this.m = m; this.done = done;
    root0.innerHTML = "";
    var top = el("div", "desk");
    this.phone = el("div", "phone ring", "☎️");
    top.appendChild(this.phone);
    top.appendChild(el("div", "deskttl", m.line === 119 ? "しょうぼう の しれい センター" : "けいさつ の つうしん しれい センター"));
    this.memo = el("div", "memo");
    top.appendChild(this.memo);
    root0.appendChild(top);
    this.logBox = el("div", "log"); root0.appendChild(this.logBox);
    this.log = new Log(this.logBox);
    this.acts = el("div", "acts"); root0.appendChild(this.acts);
    this.memoRows = {};
    var rows = [["kind", "しゅべつ"], ["addr", "ばしょ"], ["what", "なにが"]];
    if (m.age) rows.push(["age", "なんさい"]);
    rows.push(["name", "なまえ"]);
    var self = this;
    rows.forEach(function (r) {
      var d = el("div", "mrow", "<b>" + r[1] + "</b><span>…</span>");
      self.memo.appendChild(d); self.memoRows[r[0]] = d.lastChild;
    });
    this.ring();
  }
  var DP = Dispatch.prototype;
  DP.setMemo = function (k, v) { if (this.memoRows[k]) { this.memoRows[k].textContent = v; this.memoRows[k].parentNode.classList.add("on"); } };
  DP.buttons = function (list) {
    var self = this;
    this.acts.innerHTML = "";
    list.forEach(function (b) {
      var bt = el("button", "big " + (b.cls || ""), b.html);
      bt.type = "button";
      bt.addEventListener("click", function () { if (bt.disabled) return; b.fn.call(self, bt); });
      self.acts.appendChild(bt);
    });
  };
  DP.ring = function () {
    var self = this;
    AU.bell();
    this.iv = setInterval(function () { AU.bell(); }, 1800);
    this.log.add("tip", "でんわ が なって いる！ でて みよう");
    this.buttons([{ html: "📞 でんわ に でる", cls: "go", fn: function () { self.answer(); } }]);
  };
  DP.stop = function () { clearInterval(this.iv); clearTimeout(this.tm); };
  DP.later = function (ms, fn) { var self = this; this.tm = setTimeout(function () { fn.call(self); }, ms); };
  DP.answer = function () {
    var m = this.m;
    clearInterval(this.iv); this.phone.classList.remove("ring");
    this.acts.innerHTML = "";
    var q = m.line === 119 ? "119ばん、しょうぼう です。かじ ですか、きゅうきゅう ですか？" : "110ばん、けいさつ です。じけん ですか、じこ ですか？";
    this.log.add("op", q); AU.say(q);
    var a = m.line === 119 ? m.kind + " です！" : "えっと、まいご の こ が いて こまって います。";
    this.later(2400, function () {
      this.log.add("caller", a); AU.say(a, 1.3); this.setMemo("kind", m.kind === "じけん" ? "まいご" : m.kind);
      this.askSeq();
    });
  };
  DP.askSeq = function () {
    var m = this.m, self = this;
    var qs = [
      { k: "addr", b: "📍 ばしょ を きく", q: "ばしょ は どこ ですか？", a: m.addr + "、" + m.mark + " です。", v: m.addr + "（" + m.mark + "）" },
      { k: "what", b: "❓ なにが あったか きく", q: m.kind === "かじ" ? "なにが もえて いますか？" : "どう しましたか？", a: m.what, v: m.what.replace(/[！。]$/, "") },
      m.age ? { k: "age", b: "🎂 なんさい か きく", q: "なんさい くらい の かた ですか？", a: m.age + "。", v: m.age.replace(" です", "") } : null,
      { k: "name", b: "🙋 なまえ を きく", q: "あなた の なまえ を おしえて ください。", a: m.caller + "。", v: m.caller.replace(" です", "") + " さん" }
    ].filter(Boolean);
    var i = 0;
    function next() {
      var q = qs[i++];
      if (!q) { self.pick(); return; }
      self.buttons([{ html: q.b, fn: function () {
        self.acts.innerHTML = "";
        self.log.add("op", q.q); AU.say(q.q);
        self.later(1900, function () { self.log.add("caller", q.a); AU.say(q.a, 1.3); self.setMemo(q.k, q.v); self.later(1400 + q.a.length * 40, next); });
      } }]);
    }
    next();
  };
  DP.pick = function () {
    var m = this.m, self = this;
    var q = m.line === 119 ? "わかりました。すぐ むかいます！" : "わかりました。すぐ おまわりさん が いきます！";
    this.log.add("op", q);
    this.log.add("tip", "どの くるま を だす？ メモ を みて えらぼう");
    AU.say("どの くるまを だす？");
    this.buttons(m.choices.map(function (id) {
      var v = D.VEHICLES[id];
      return { html: "<span class='vem'>" + v.emoji + "</span>" + v.name, cls: "veh", fn: function (bt) {
        if (id === m.vehicle) {
          AU.chime();
          self.acts.innerHTML = "";
          self.log.add("good", "せいかい！ " + v.name + " だね");
          self.later(1300, function () {
            self.log.add("op", "しゅつどう しれい！ " + m.order); AU.say("しゅつどう しれい。" + m.order);
            self.buttons([{ html: "🚨 のりこんで しゅつどう！", cls: "go", fn: function () { self.stop(); self.done(id); } }]);
          });
        } else {
          AU.soft(); bt.disabled = true; bt.classList.add("no");
          self.log.add("tip", m.hint[id] || "ほか の くるま も かんがえて みよう");
          AU.say(m.hint[id]);
        }
      } };
    }));
  };

  // ====================== でんわ れんしゅう ======================
  function Practice(root0, p, name, done) {
    this.r = root0; this.p = p; this.name = name || "ぼく／わたし の なまえ"; this.done = done;
    root0.innerHTML = "";
    root0.appendChild(el("div", "safe",
      "<b>⚠️ これは れんしゅう だよ。ほんとう の でんわ は かからないよ。</b>" +
      "<span>いたずら でんわ は ぜったい ダメ！ ほんとう に こまって いる ひと の でんわ が つながらなく なって しまうよ。</span>"));
    root0.appendChild(el("div", "calm", "🌱 あわてなくて だいじょうぶ。ゆっくり で いいよ。"));
    this.body = el("div", "pbody"); root0.appendChild(this.body);
    this.intro();
  }
  var PP = Practice.prototype;
  PP.stop = function () { clearTimeout(this.tm); };
  PP.later = function (ms, fn) { var self = this; this.tm = setTimeout(function () { fn.call(self); }, ms); };
  PP.intro = function () {
    var p = this.p, self = this;
    this.body.innerHTML = "";
    var card = el("div", "situ", "<div class='sem'>" + p.emoji + "</div><p>" + esc(p.situation) + "</p><p class='before'>👉 " + esc(p.before) + "</p>");
    this.body.appendChild(card);
    var b = el("button", "big go", "📱 でんわ を かける れんしゅう"); b.type = "button";
    b.addEventListener("click", function () { self.dial(); });
    this.body.appendChild(b);
    AU.say(p.situation);
  };
  PP.dial = function () {
    var self = this, p = this.p, typed = "";
    this.body.innerHTML = "";
    this.body.appendChild(el("p", "dialq", "なんばん に かける？<br><small>かじ・きゅうきゅう は <b>119</b>、じけん・じこ は <b>110</b></small>"));
    var disp = el("div", "disp", "&nbsp;"); this.body.appendChild(disp);
    var pad = el("div", "pad"); this.body.appendChild(pad);
    var call = el("button", "big go callbtn", "📞 かける"); call.type = "button"; call.disabled = true;
    var tip = el("p", "dtip", "");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].forEach(function (k) {
      var b = el("button", "key" + (k ? "" : " blank"), k || "&nbsp;"); b.type = "button";
      if (!k) b.disabled = true;
      b.setAttribute("data-k", k);
      b.addEventListener("click", function () {
        if (k === "⌫") { typed = typed.slice(0, -1); }
        else if (typed.length < 3) { typed += k; AU.key(+k); }
        disp.textContent = typed || " ";
        call.disabled = typed.length !== 3;
        tip.textContent = "";
        if (typed.length === 3 && typed !== p.number) {
          tip.textContent = typed === "119" || typed === "110" ?
            (p.number === "119" ? "こんど は かじ／きゅうきゅう だから 119 だよ。⌫ で けして やりなおそう" : "こんど は じこ だから 110 だよ。⌫ で けして やりなおそう") :
            "ばんごう が ちがう みたい。⌫ で けして、" + p.number + " を おして みよう";
          call.disabled = true; AU.soft();
        }
      });
      pad.appendChild(b);
    });
    this.body.appendChild(tip);
    this.body.appendChild(call);
    call.addEventListener("click", function () {
      if (call.disabled) return;
      call.disabled = true;
      tip.textContent = "プルルル… （れんしゅう なので ほんとう には かかって いないよ）";
      AU.ringback(); self.later(1300, function () { AU.ringback(); self.later(1200, self.talk); });
    });
  };
  PP.talk = function () {
    this.body.innerHTML = "";
    var lb = el("div", "log plog"); this.body.appendChild(lb);
    this.log = new Log(lb);
    this.acts = el("div", "acts"); this.body.appendChild(this.acts);
    this.si = 0;
    this.ask(this.p.steps[0]);
  };
  PP.ask = function (st) {
    var self = this;
    this.log.add("op", st.q); AU.say(st.q);
    this.acts.innerHTML = "";
    var os = st.o.slice();
    // こたえ の ならび は まいかい まぜる（せいかい が いつも うえ に ならない よう に）
    for (var i = os.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = os[i]; os[i] = os[j]; os[j] = t; }
    os.forEach(function (o) {
      var txt = o.t.replace("{name}", self.name);
      var b = el("button", "big ans", esc(txt)); b.type = "button";
      if (o.ok) b.setAttribute("data-ok", "1");
      if (o.next) b.setAttribute("data-next", "1");
      b.addEventListener("click", function () {
        if (b.disabled) return;
        self.log.add("me", txt); AU.say(txt, 1.4);
        if (!o.ok) {
          AU.soft(); b.disabled = true; b.classList.add("no");
          self.log.add("tip", o.hint + "　まちがえても だいじょうぶ。でんわ の ひと は ちゃんと まって くれる よ。");
          return;
        }
        AU.ok();
        self.acts.innerHTML = "";
        if (o.why) self.log.add("good", o.why);
        self.later(1500, function () {
          if (o.next) { self.ask(o.next); return; }
          self.si++;
          var nx = self.p.steps[self.si];
          if (nx) self.ask(nx); else self.end();
        });
      });
      self.acts.appendChild(b);
    });
  };
  PP.end = function () {
    var self = this, p = this.p;
    this.log.add("op", p.end); AU.say(p.end);
    this.acts.innerHTML = "";
    this.later(2200, function () {
      AU.fanfare();
      var box = el("div", "lesson", "<div class='stamp'>💮 できた！</div><p>でんわ では この じゅんばん で つたえたよ</p>");
      var ol = el("ol");
      p.lesson.forEach(function (s) { ol.appendChild(el("li", "", "✅ " + esc(s))); });
      box.appendChild(ol);
      box.appendChild(el("p", "small", "ほんとう に こまった とき は、まず ちかく の おとな に しらせよう。おとな が いない とき に、おちついて でんわ しよう。"));
      self.acts.appendChild(box);
      var b = el("button", "big go", "もどる"); b.type = "button";
      b.addEventListener("click", function () { self.done(p.id); });
      self.acts.appendChild(b);
      box.scrollIntoView({ block: "nearest" });
    });
  };

  root.S119_CALL = { Dispatch: Dispatch, Practice: Practice };
})(window);
