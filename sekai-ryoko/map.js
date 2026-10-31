"use strict";
/* ============================================================
   せかい いっしゅう りょこう：せかいちず

   にほんの がっこうの ちずと おなじ「たいへいようが まんなか」の ミラー図法。
   x ＝ 経度（にしけい 25ど より にしは +360 して みぎがわへ）、y ＝ ミラーの たて（度）。
   国の かたちは kokki-tanken と おなじ geo.js（Natural Earth 1:110m）。
   ============================================================ */

const GEO = (() => {
  const R = Math.PI / 180;
  const CUT = -25;   // ここより にしは みぎがわ（アメリカ がわ）に まわす
  const my = (lat) => -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * R)) / R;
  const wrap = (lon) => (lon < CUT ? lon + 360 : lon);
  const ringsOf = (rs, q) => rs.map((s) => COUNTRIES.decode(s).map(([x, y]) => [x / q, y / q]));
  // わ（リング）ごとに まとめて ずらす（とちゅうで きれないように）
  const proj = (rings) => rings.filter((r) => r.some(([, lat]) => lat > -58)).map((r) => {
    const mean = r.reduce((a, [lon]) => a + lon, 0) / r.length;
    const dx = mean < CUT ? 360 : 0;
    return r.map(([lon, lat]) => [lon + dx, my(Math.max(-80, lat))]);
  });
  const pathOf = (rings) => rings.map((r) => "M" + r.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join("L") + "Z").join("");

  const shapes = {};   // id → { xy: 投影ずみ, d: path }
  let landD = "";
  for (const c of COUNTRIES.named) {
    const xy = proj(ringsOf(c.r, COUNTRIES.q));
    if (COUNTRY[c.id] || c.id === HOME.id) shapes[c.id] = { xy, d: pathOf(xy) };
    else landD += pathOf(xy);
  }
  for (const c of COUNTRIES.plain) landD += pathOf(proj(ringsOf(c.r, COUNTRIES.qPlain)));

  const pt = ([lon, lat]) => [wrap(lon), my(lat)];
  const viewOf = (b) => { const y0 = my(b[3]), y1 = my(b[2]); return [b[0], y0, b[1] - b[0], y1 - y0]; };

  function inside(x, y, rings) {
    let hit = false;
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
    }
    return hit;
  }

  /** 2てんの きょり（km、だいけんで はかる） */
  function km([lo1, la1], [lo2, la2]) {
    const a = Math.sin((la2 - la1) * R / 2) ** 2 + Math.cos(la1 * R) * Math.cos(la2 * R) * Math.sin((lo2 - lo1) * R / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** ひこうきの みち（ちずの x,y の てんの ならび）。だいけん こうろを そのまま、むりなら ゆみなりの せん */
  function route(a, b, n = 90) {
    const v = (lon, lat) => [Math.cos(lat * R) * Math.cos(lon * R), Math.cos(lat * R) * Math.sin(lon * R), Math.sin(lat * R)];
    const p = v(...a), q = v(...b);
    const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])), om = Math.acos(dot);
    const out = [];
    let ok = om > 1e-6 && Math.sin(om) > 0.05, prev = wrap(a[0]);
    for (let i = 0; ok && i <= n; i++) {
      const t = i / n, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
      const x = s1 * p[0] + s2 * q[0], y = s1 * p[1] + s2 * q[1], z = s1 * p[2] + s2 * q[2];
      const lat = Math.atan2(z, Math.hypot(x, y)) / R;
      let lon = Math.atan2(y, x) / R;
      while (lon - prev > 180) lon -= 360;
      while (prev - lon > 180) lon += 360;
      prev = lon;
      if (lon < -27 || lon > 336 || lat > 76) ok = false;
      out.push([lon, my(lat)]);
    }
    if (ok) return out;
    // ゆみなり（にほんの ちずの うえで きたがわに ふくらむ）
    const [x0, y0] = pt(a), [x1, y1] = pt(b), d = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - d * 0.22;
    const res = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      res.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1]);
    }
    return res;
  }

  /** よるの ところ（path）。たいようの まうえ から 90ど いじょう はなれた ところ */
  function nightD(date = new Date()) {
    const [slon, slat] = Clock.subsolar(date);
    const d = Math.abs(slat) < 0.3 ? 0.3 * Math.sign(slat || 1) : slat;
    const pts = [];
    for (let x = CUT - 5; x <= CUT + 365; x += 2) {
      const lat = Math.atan(-Math.cos((x - slon) * R) / Math.tan(d * R)) / R;
      pts.push([x, my(Math.max(-79, Math.min(79, lat)))]);
    }
    // たいようが きたに ある ときは みなみがわが よる
    const edge = slat >= 0 ? my(-80) : my(80);
    return "M" + pts.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join("L") +
      `L${CUT + 365},${edge.toFixed(1)}L${CUT - 5},${edge.toFixed(1)}Z`;
  }

  return { my, wrap, pt, shapes, landD, viewOf, inside, km, route, nightD };
})();

const WORLD_BOX = [-27, 334, -56, 76];

/**
 * ちずを つくる
 *  opts.box      みせる はんい [x min, x max, 緯度 min, 緯度 max]（x は GEO.wrap した 経度）
 *  opts.night    よるの かげを えがく（その じこく Date か true）
 *  opts.visited  いった 国に いろを ぬる { id: true }
 *  opts.dots     首都の しるしを だす
 *  opts.onTap(id)
 */
function makeMap(host, opts = {}) {
  const v = GEO.viewOf(opts.box || WORLD_BOX);
  const W = host.clientWidth, H = host.clientHeight;
  if (W && H && opts.fit !== false) {
    // わくの かたちに あわせて はしを すこし きって おおきく みせる。
    // ただし opts.keep の てん（首都）は かならず わくの なかに のこす
    const k = (H / W) / (v[3] / v[2]);
    const keep = (opts.keep || []).map(GEO.pt);
    const crop = (i, size, c) => {
      let n = size / c;
      const xs = keep.map((p) => p[i]).filter((x) => x >= v[i] && x <= v[i] + size);
      if (xs.length) {
        const pad = size * 0.04, lo = Math.min(...xs) - pad, hi = Math.max(...xs) + pad;
        n = Math.min(size, Math.max(n, hi - lo));
        let s0 = v[i] + (size - n) / 2;
        s0 = Math.max(v[i], Math.min(s0, lo, v[i] + size - n));
        if (s0 + n < hi) s0 = Math.min(v[i] + size - n, hi - n);
        v[i] = s0;
      } else v[i] += (size - n) / 2;
      v[i + 2] = n;
    };
    if (k > 1) crop(0, v[2], Math.min(1.43, k));
    else crop(1, v[3], Math.min(1.25, 1 / k));
  }
  const ids = COUNTRIES_DATA.map((c) => c.id);
  const shaped = ids.filter((id) => GEO.shapes[id]), dotOnly = ids.filter((id) => !GEO.shapes[id]);
  const unit = v[2] / 100;   // ちずの ひろさに あわせた しるしの おおきさ
  let s = `<svg class="map" viewBox="${v.map((n) => n.toFixed(2)).join(" ")}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="-60" y="-200" width="440" height="400" class="sea"/>` +
    `<path class="land" d="${GEO.landD}" vector-effect="non-scaling-stroke"/>` +
    `<path class="nation home" d="${GEO.shapes[HOME.id].d}" vector-effect="non-scaling-stroke"/>`;
  for (const c of COUNTRIES_DATA) {
    if (!GEO.shapes[c.id]) continue;   // ハワイ（州）は ● だけ
    const r = REGION[c.r], vis = opts.visited && opts.visited[c.id];
    s += `<path class="nation${vis ? " vis" : ""}" data-id="${c.id}" style="--fill:${vis ? r.tint : "#fbf6e8"};--edge:${r.col}" d="${GEO.shapes[c.id].d}" vector-effect="non-scaling-stroke"/>`;
  }
  s += `<path class="night" d="" />`;
  s += `<line class="equator" x1="-60" x2="400" y1="0" y2="0" vector-effect="non-scaling-stroke"/>`;
  if (opts.dots) {
    s += `<g class="dots">`;
    for (const c of COUNTRIES_DATA) {
      const [x, y] = GEO.pt(c.ll), vis = opts.visited && opts.visited[c.id];
      s += `<circle class="dot${vis ? " vis" : ""}" data-id="${c.id}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(unit * 0.9).toFixed(2)}" style="--c:${REGION[c.r].col}"/>`;
      // ちずに かたちの ない ところ（ハワイ）は なまえを そえる
      if (!GEO.shapes[c.id]) {
        const fs = unit * 3.2, left = x + unit * 1.6 + c.n.length * fs > v[0] + v[2];   // みぎはしに はみだすなら ひだりに
        s += `<text class="dotname" x="${(left ? x - unit * 1.6 : x + unit * 1.6).toFixed(2)}" y="${y.toFixed(2)}" font-size="${fs.toFixed(2)}" text-anchor="${left ? "end" : "start"}" dominant-baseline="central">${c.n}</text>`;
      }
    }
    s += `</g>`;
  }
  const [hx, hy] = GEO.pt(HOME.airports.haneda.ll);
  s += `<g class="homemark"><circle cx="${hx}" cy="${hy}" r="${unit * 1.3}"/></g>`;
  s += `<g class="marks"></g><path class="route" d="" vector-effect="non-scaling-stroke"/><path class="route done" d="" vector-effect="non-scaling-stroke"/>` +
    `<text class="plane" font-size="${unit * 6}" text-anchor="middle" dominant-baseline="central">✈️</text></svg>`;
  host.innerHTML = s;
  const svg = host.firstElementChild, marks = svg.querySelector(".marks"), plane = svg.querySelector(".plane");
  const routes = svg.querySelectorAll(".route");

  const api = {
    svg, unit, view: v,
    night(date = new Date()) { svg.querySelector(".night").setAttribute("d", GEO.nightD(date)); },
    highlight(id) {
      svg.querySelectorAll(".nation.hl").forEach((el) => el.classList.remove("hl"));
      marks.innerHTML = "";
      if (id == null) return;
      const el = svg.querySelector(`.nation[data-id="${id}"]`); if (el) el.classList.add("hl");
      const [x, y] = GEO.pt(COUNTRY[id].ll);
      marks.innerHTML = `<circle class="pulse" cx="${x}" cy="${y}" r="${unit * 3}"/>`;
    },
    /** しるし（時計の がめんで にほんと いまの 国に なまえを だす） */
    label(list) {
      marks.innerHTML = list.map(({ ll, text, cls, up: want }) => {
        const [x, y] = GEO.pt(ll), fs = unit * 3.6;
        const w = text.length * fs * 0.62 + fs;
        const lx = Math.min(v[0] + v[2] - w / 2 - unit, Math.max(v[0] + w / 2 + unit, x));
        // にほんは うえ、あいての 国は した（はしに ちかい ときは はんたい）に なまえを だす
        const up = want === false ? y - v[1] > v[3] * 0.8 : want === true ? y - v[1] > v[3] * 0.18 : y - v[1] > v[3] * 0.25;
        const ly = up ? y - fs * 1.6 : y + fs * 1.6;
        return `<g class="lbl ${cls || ""}"><circle cx="${x}" cy="${y}" r="${unit * 1.2}"/>` +
          `<rect x="${lx - w / 2}" y="${ly - fs * 0.75}" width="${w}" height="${fs * 1.5}" rx="${fs * 0.4}"/>` +
          `<text x="${lx}" y="${ly}" font-size="${fs}" text-anchor="middle" dominant-baseline="central">${text}</text></g>`;
      }).join("");
    },
    /** ひこうきを とばす。ms ミリびょうで a → b。おわったら done() */
    fly(a, b, ms, done) {
      const pts = GEO.route(a, b);
      const d = "M" + pts.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join("L");
      routes[0].setAttribute("d", d);
      let t0 = null, stop = false;
      const step = (t) => {
        if (stop) return;
        if (t0 == null) t0 = t;
        const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        const i = Math.min(pts.length - 2, Math.floor(e * (pts.length - 1)));
        const f = e * (pts.length - 1) - i;
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
        const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
        // ✈️ の えもじは みぎうえを むいているので 45ど もどす
        plane.setAttribute("transform", `translate(${x} ${y}) rotate(${ang + 45})`);
        plane.style.opacity = 1;
        routes[1].setAttribute("d", "M" + pts.slice(0, i + 1).map(([px, py]) => px.toFixed(2) + "," + py.toFixed(2)).join("L") + `L${x.toFixed(2)},${y.toFixed(2)}`);
        if (k < 1) requestAnimationFrame(step); else done && done();
      };
      requestAnimationFrame(step);
      return { cancel() { stop = true; } };
    },
    clearRoute() { routes.forEach((r) => r.setAttribute("d", "")); plane.style.opacity = 0; },
  };
  if (opts.night) api.night(opts.night instanceof Date ? opts.night : new Date());

  if (opts.onTap) {
    svg.addEventListener("click", (e) => {
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const near = (id) => {
        const [x, y] = GEO.pt(COUNTRY[id].ll), q = new DOMPoint(x, y).matrixTransform(ctm);
        return Math.hypot(q.x - e.clientX, q.y - e.clientY);
      };
      // ハワイのような ●だけの ところを さきに（アメリカの かたちの なかに しまが あるため）
      let hit = dotOnly.find((id) => near(id) < 30);
      if (hit == null) hit = shaped.find((id) => GEO.inside(p.x, p.y, GEO.shapes[id].xy));
      if (hit == null) {
        // ちいさい 国は 首都の しるしの ちかくを タップしても えらべる（画面で 30px いない）
        let best = 30;
        for (const id of ids) {
          const [x, y] = GEO.pt(COUNTRY[id].ll);
          const q = new DOMPoint(x, y).matrixTransform(ctm);
          const dd = Math.hypot(q.x - e.clientX, q.y - e.clientY);
          if (dd < best) { best = dd; hit = id; }
        }
      }
      opts.onTap(hit ?? null);
    });
  }
  return api;
}

if (typeof module !== "undefined") module.exports = { GEO };
