/* ============================================================
   さんすう どうじょう — そうさ どうぐ の きほん
   どうぐ は SD.tool(なまえ, つくる関数) で とうろく。
   つくる関数(el, cfg) は { value(), set(v), act(なまえ, ...) → Promise, destroy() } を かえす。
   ============================================================ */
(function (SD) {
  "use strict";
  SD.tools = {};
  SD.tool = function (name, make) { SD.tools[name] = make; };
  SD.timeScale = 1; // e2e テスト で 0 に すると すぐ おわる
  SD.wait = function (ms) { return new Promise(function (res) { setTimeout(res, ms * SD.timeScale); }); };
  var NS = "http://www.w3.org/2000/svg";
  SD.el = function (tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  SD.mkSvg = function (host, w, h, cls) {
    host.innerHTML = "";
    var s = SD.el("svg", { viewBox: "0 0 " + w + " " + h, class: "tool " + (cls || ""), role: "img" }, host);
    return s;
  };
  // ゆびの いち → SVG の ざひょう
  SD.svgPt = function (svg, ev) {
    var p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    var m = svg.getScreenCTM();
    return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  };
  SD.sfx = function (n) { if (SD.audio) SD.audio.sfx(n); };
  // ボタン（HTML）を どうぐ の したに ならべる
  SD.toolBtns = function (host, list) {
    var bar = (host.parentNode && host.parentNode.querySelector(".toolbar")) || host;
    var row = document.createElement("div");
    row.className = "toolbtns";
    list.forEach(function (b) {
      var x = document.createElement("button");
      x.type = "button"; x.className = "tbtn"; x.innerHTML = SD.h(b[0]);
      x.addEventListener("click", b[1]);
      row.appendChild(x);
    });
    bar.appendChild(row);
    return row;
  };
})(window.SD);
