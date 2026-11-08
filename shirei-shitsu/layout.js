'use strict';

/*
 * せんろ ばん の かたち（DOM なし）。
 * せんろ は「てん（ノード）」と「せんろ（リンク）」の グラフ。リンク は かならず ひだり（にし）→ みぎ（ひがし）へ のびる
 * ので、でんしゃ の むき は ひがし（+1）か にし（−1）の 2つ だけ。
 *   - てん の かたがわ に リンク が 2ほん あれば そこ が ポイント（どちら に つながる か を state で もつ）
 *   - しんごう の ある てん で くかん（へいそく くかん）が わかれる
 *   - トンネル の そと に みえない せんろ（VLEN）を つけて、でんしゃ は そこ から でて きて そこ へ きえる
 */
const Layout = (() => {
  const VLEN = 4.5;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const keyOf = (x, y) => r3(x) + ',' + r3(y);

  function parsePoly(str) {
    return str.trim().split(/\s+/).map((p) => p.split(',').map(Number));
  }

  function build(def) {
    const L = {
      w: def.w, h: def.h, pts: [], ptMap: new Map(), segs: [], sws: [], lamps: [], bounds: [],
      tunnels: [], spots: [], blocks: [], plats: def.plats || [], crossings: def.crossings || [],
      deco: def.deco || [], errors: [],
    };
    const err = (m) => L.errors.push(m);
    const pt = (x, y) => {
      const k = keyOf(x, y);
      let p = L.ptMap.get(k);
      if (!p) {
        p = { id: L.pts.length, k, x: r3(x), y: r3(y), east: [], west: [], sw: null, sig: null, tunnel: null, vanish: null };
        L.pts.push(p);
        L.ptMap.set(k, p);
      }
      return p;
    };
    const segMap = new Map();
    const addSeg = (x0, y0, x1, y1, virtual) => {
      const a = pt(x0, y0);
      const b = pt(x1, y1);
      const k = a.k + '|' + b.k;
      if (segMap.has(k)) return segMap.get(k);
      const s = {
        id: L.segs.length, a, b, x0: a.x, y0: a.y, x1: b.x, y1: b.y,
        len: Math.hypot(b.x - a.x, b.y - a.y), block: -1, spot: null, virtual: !!virtual,
      };
      a.east.push(s);
      b.west.push(s);
      L.segs.push(s);
      segMap.set(k, s);
      return s;
    };
    L.addSeg = addSeg;

    // ---- せんろ（おれせん。1マス ずつ に わける）
    for (const line of def.track || []) {
      const v = typeof line === 'string' ? parsePoly(line) : line;
      for (let i = 0; i + 1 < v.length; i += 1) {
        let [ax, ay] = v[i];
        let [bx, by] = v[i + 1];
        if (ax === bx) { err('たて の せんろ は つくれない: ' + line); continue; }
        if (ax > bx) { [ax, ay, bx, by] = [bx, by, ax, ay]; }
        const n = Math.round(bx - ax);
        for (let j = 0; j < n; j += 1) {
          addSeg(ax + j, ay + ((by - ay) * j) / n, ax + j + 1, ay + ((by - ay) * (j + 1)) / n);
        }
      }
    }
    for (const s of def.segs || []) addSeg(s[0], s[1], s[2], s[3]);

    // ---- トンネル
    for (const t0 of def.tunnels || []) {
      const t = Object.assign({}, t0);
      const p = L.ptMap.get(keyOf(t.x, t.y));
      if (!p) { err('トンネル の ばしょ に せんろ が ない: ' + t.id); continue; }
      t.side = t.x <= 0 ? 'W' : 'E';
      t.pt = p;
      t.vseg = t.side === 'W' ? addSeg(t.x - VLEN, t.y, t.x, t.y, true) : addSeg(t.x, t.y, t.x + VLEN, t.y, true);
      t.vseg.tunnel = t;
      const outer = t.side === 'W' ? t.vseg.a : t.vseg.b;
      outer.vanish = t;
      p.tunnel = t;
      L.tunnels.push(t);
    }

    // ---- ポイント
    for (const p of L.pts) {
      const E = p.east.length;
      const W = p.west.length;
      if (E > 2 || W > 2) { err('せんろ が おおすぎる てん: ' + p.k); continue; }
      if (E === 2 && W === 2) { err('りょうがわ ポイント は つくれない: ' + p.k); continue; }
      if (E === 2 || W === 2) {
        const side = E === 2 ? 'E' : 'W';
        const opts = (side === 'E' ? p.east : p.west).slice();
        if ((side === 'E' ? W : E) === 0) { err('ポイント の ねもと が ない: ' + p.k); continue; }
        const other = (s) => (side === 'E' ? s.b : s.a);
        opts.sort((s1, s2) => {
          const st1 = other(s1).y === p.y ? 0 : 1;
          const st2 = other(s2).y === p.y ? 0 : 1;
          return st1 - st2 || other(s1).y - other(s2).y;
        });
        const sw = { id: L.sws.length, pt: p, side, opts, state: 0, ice: 0, locked: false, heat: 0 };
        p.sw = sw;
        L.sws.push(sw);
      }
    }

    // ---- しんごう（くかん の さかいめ）
    for (const s of def.signals || []) {
      const p = L.ptMap.get(keyOf(s.x, s.y));
      if (!p) { err('しんごう の ばしょ に せんろ が ない: ' + s.x + ',' + s.y); continue; }
      if (p.sw) { err('ポイント の うえ に しんごう は おけない: ' + p.k); continue; }
      if (!p.sig) { p.sig = { pt: p, lamps: {} }; L.bounds.push(p); }
      if (s.dir) {
        const lamp = { id: L.lamps.length, pt: p, dir: s.dir, red: !!s.red, autoRed: !!s.autoRed, show: 'green' };
        p.sig.lamps[s.dir] = lamp;
        L.lamps.push(lamp);
      }
    }

    // ---- くかん（しんごう の ない てん で つながる せんろ を ひとまとめ）
    const par = L.segs.map((s, i) => i);
    const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    for (const p of L.pts) {
      if (p.sig) continue;
      const all = p.east.concat(p.west);
      for (let i = 1; i < all.length; i += 1) par[find(all[i].id)] = find(all[0].id);
    }
    const bmap = new Map();
    for (const s of L.segs) {
      const r = find(s.id);
      if (!bmap.has(r)) { bmap.set(r, L.blocks.length); L.blocks.push([]); }
      s.block = bmap.get(r);
      L.blocks[s.block].push(s);
    }

    // ---- ホーム・しゃこ・かもつ
    for (const sp0 of def.spots || []) {
      const sp = Object.assign({ kind: 'home' }, sp0, { segs: [] });
      for (const s of L.segs) {
        if (!s.virtual && s.y0 === sp.y && s.y1 === sp.y && s.x0 >= sp.x0 - 1e-6 && s.x1 <= sp.x1 + 1e-6) {
          if (s.spot) err('ホーム が かさなって いる: ' + sp.id);
          s.spot = sp;
          sp.segs.push(s);
        }
      }
      if (!sp.segs.length) err('ホーム の せんろ が ない: ' + sp.id);
      L.spots.push(sp);
    }

    // ---- バッテン に まじわる せんろ は だめ
    for (let i = 0; i < L.segs.length; i += 1) {
      for (let j = i + 1; j < L.segs.length; j += 1) {
        const a = L.segs[i];
        const b = L.segs[j];
        if (a.virtual || b.virtual || a.x0 !== b.x0 || a.x1 !== b.x1) continue;
        if ((a.y0 - b.y0) * (a.y1 - b.y1) < 0) err('せんろ が バッテン に なって いる: ' + a.x0);
      }
    }
    return L;
  }

  // ---------- うごき の てつだい ----------
  const side = (p, dir) => (dir > 0 ? p.east : p.west);
  const endPt = (seg, dir) => (dir > 0 ? seg.b : seg.a);

  // seg を dir の むき に すすんだ さき。ポイント は いま の state で きめる。
  // trailOk: うしろ から ポイント に はいる とき、ポイント が こっち を むいて いる か
  function nextSeg(seg, dir) {
    const p = endPt(seg, dir);
    const out = side(p, dir);
    const back = side(p, -dir);
    let trailOk = true;
    if (back.length === 2 && p.sw) trailOk = p.sw.opts[p.sw.state] === seg;
    let nx = null;
    if (out.length === 1) nx = out[0];
    else if (out.length === 2 && p.sw) nx = p.sw.opts[p.sw.state];
    return { p, seg: nx, trailOk };
  }

  // (seg, s) から dir の むき に d だけ すすむ（ポイント は いま の state）
  function along(seg, s, dir, d) {
    for (let g = 0; g < 400; g += 1) {
      const rem = dir > 0 ? seg.len - s : s;
      if (d <= rem) return { seg, s: s + dir * d };
      d -= rem;
      const n = nextSeg(seg, dir);
      if (!n.seg) return { seg, s: dir > 0 ? seg.len : 0, cut: d };
      seg = n.seg;
      s = dir > 0 ? 0 : seg.len;
    }
    return { seg, s };
  }

  function posOf(seg, s) {
    const t = seg.len ? s / seg.len : 0;
    return { x: seg.x0 + (seg.x1 - seg.x0) * t, y: seg.y0 + (seg.y1 - seg.y0) * t };
  }

  /*
   * みち さがし（ポイント は じゆう に きりかえ られる と して）。
   *   start: { seg, dir }、goal(seg, dir) → true で ゴール、avoid(seg) → true で とおらない
   *   かえりち: { dist, needs: [{ sw, state, d }] }（d は start の さき から ポイント まで の きょり）
   */
  function findRoute(L, start, goal, avoid) {
    const key = (seg, dir) => seg.id * 2 + (dir > 0 ? 1 : 0);
    const dist = new Map();
    const prev = new Map();
    const open = [];
    const k0 = key(start.seg, start.dir);
    dist.set(k0, 0);
    open.push({ seg: start.seg, dir: start.dir, d: 0, k: k0 });
    if (goal(start.seg, start.dir)) return { dist: 0, needs: [], segs: [start.seg] };
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i += 1) if (open[i].d < open[bi].d) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.d > dist.get(cur.k)) continue;
      const p = endPt(cur.seg, cur.dir);
      if (p.vanish) continue;
      const out = side(p, cur.dir);
      const back = side(p, -cur.dir);
      for (let oi = 0; oi < out.length; oi += 1) {
        const o = out[oi];
        if (avoid && avoid(o)) continue;
        const needs = [];
        if (out.length === 2 && p.sw) needs.push({ sw: p.sw, state: p.sw.opts.indexOf(o) });
        if (back.length === 2 && p.sw) needs.push({ sw: p.sw, state: p.sw.opts.indexOf(cur.seg) });
        const nd = cur.d; // cur.d は cur.seg の おわり まで の きょり
        const k = key(o, cur.dir);
        const total = nd + o.len;
        if (!dist.has(k) || total < dist.get(k)) {
          dist.set(k, total);
          prev.set(k, { from: cur.k, seg: o, needs, at: nd });
          if (goal(o, cur.dir)) {
            // さかのぼって ポイント を あつめる
            const all = [];
            const segs = [];
            let kk = k;
            while (prev.has(kk)) {
              const pr = prev.get(kk);
              segs.unshift(pr.seg);
              for (const n of pr.needs) all.unshift({ sw: n.sw, state: n.state, d: pr.at });
              kk = pr.from;
            }
            segs.unshift(start.seg);
            return { dist: total, needs: all, segs };
          }
          open.push({ seg: o, dir: cur.dir, d: total, k });
        }
      }
    }
    return null;
  }

  return { VLEN, build, nextSeg, along, posOf, findRoute, side, endPt, keyOf };
})();

if (typeof module !== 'undefined') module.exports = Layout;
