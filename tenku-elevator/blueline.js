"use strict";
/* てんくうエレベーター - B9 ブルーライン のりば（でんしゃに のって、いきさきへ いって、もどって くる）
 *
 * B9 は ブルーラインの よこはま えきに つながって いる ことに する。
 * でんしゃの うごきは Blue.step(st, dt) で すすむ（DOM なし。tools/tenku-elevator/test.js でも つかう）。
 *
 * ホームの ばめん（st.ride = false）:
 *   ann（アナウンス）→ in（はいって くる）→ open（ドアが あいて まつ）→ のらなければ out（でて いく）→ gone
 * でんしゃの なか（st.ride = true）:
 *   pick（いきさきを えらぶ）→ close → run（つぎの えきへ）→ stop（とちゅうの えき）→ run … → arrive（ついた）
 *   arrive で「もどる」→ close → run … → home（よこはまに もどった）→ おりると おわり
 */
const Blue = (() => {
  // ブルーラインの えき（B01 しょうなんだい 〜 B32 あざみの）
  const STATIONS = [
    ['(湘南台)[しょうなんだい]', 'しょうなんだい'], ['(下飯田)[しもいいだ]', 'しもいいだ'], ['(立場)[たてば]', 'たてば'],
    ['(中田)[なかだ]', 'なかだ'], ['(踊場)[おどりば]', 'おどりば'], ['(戸塚)[とつか]', 'とつか'], ['(舞岡)[まいおか]', 'まいおか'],
    ['(下永谷)[しもながや]', 'しもながや'], ['(上永谷)[かみながや]', 'かみながや'], ['(港南中央)[こうなんちゅうおう]', 'こうなんちゅうおう'],
    ['(上大岡)[かみおおおか]', 'かみおおおか'], ['(弘明寺)[ぐみょうじ]', 'ぐみょうじ'], ['(蒔田)[まいた]', 'まいた'],
    ['(吉野町)[よしのちょう]', 'よしのちょう'], ['(阪東橋)[ばんどうばし]', 'ばんどうばし'], ['(伊勢佐木長者町)[いせざきちょうじゃまち]', 'いせざきちょうじゃまち'],
    ['(関内)[かんない]', 'かんない'], ['(桜木町)[さくらぎちょう]', 'さくらぎちょう'], ['(高島町)[たかしまちょう]', 'たかしまちょう'],
    ['(横浜)[よこはま]', 'よこはま'], ['(三ツ沢下町)[みつざわしもちょう]', 'みつざわしもちょう'], ['(三ツ沢上町)[みつざわかみちょう]', 'みつざわかみちょう'],
    ['(片倉町)[かたくらちょう]', 'かたくらちょう'], ['(岸根公園)[きしねこうえん]', 'きしねこうえん'], ['(新横浜)[しんよこはま]', 'しんよこはま'],
    ['(北新横浜)[きたしんよこはま]', 'きたしんよこはま'], ['(新羽)[にっぱ]', 'にっぱ'], ['(仲町台)[なかまちだい]', 'なかまちだい'],
    ['センター(南)[みなみ]', 'センターみなみ'], ['センター(北)[きた]', 'センターきた'], ['(中川)[なかがわ]', 'なかがわ'], ['あざみ(野)[の]', 'あざみの'],
  ].map(([k, yomi], i) => ({ i, no: 'B' + String(i + 1).padStart(2, '0'), k, yomi, kanji: k.replace(/\(([^()]+)\)\[[^\]]+\]/g, '$1') }));
  const HOME = 19;                                   // よこはま
  const LINE = {
    shonandai: { name: 'しょうなんだい ゆき', go: -1, end: 0 },
    azamino: { name: 'あざみの ゆき', go: 1, end: STATIONS.length - 1 },
  };
  const T = { ANN: 2.5, IN: 3, DOOR: .8, WAIT: 25, OUT: 3, CLOSE: 1.2, STOP: .6 };

  /* その むきで いける えき（つぎの えき 〜 おわりの えき） */
  function destinations(dir, from = HOME) {
    const L = LINE[dir], out = [];
    for (let i = from + L.go; L.go > 0 ? i <= L.end : i >= L.end; i += L.go) out.push(i);
    return out;
  }
  /* えきと えきの あいだの じかん（とおくまで いく ときは みじかく） */
  const segTime = n => Math.max(1.2, Math.min(3, 20 / Math.max(1, n)));

  function create(dir) {
    return { dir, go: LINE[dir].go, phase: 'ann', t: 0, ride: false, cur: HOME, to: null, back: false, seg: 2, door: 0, trip: 0 };
  }
  function set(st, phase) { st.phase = phase; st.t = 0; }
  /* dt すすめて、おきた こと を かえす: [{ e: 'arrive-platform' | 'gone' | 'next' | 'stop' | 'arrive' | 'home', i }] */
  function step(st, dt) {
    const ev = [];
    st.t += dt;
    const opening = ['open', 'pick', 'arrive', 'home'].includes(st.phase);
    st.door = Math.max(0, Math.min(1, st.door + (opening ? 1 : -1) * dt / T.DOOR));
    switch (st.phase) {
      case 'ann': if (st.t >= T.ANN) set(st, 'in'); break;
      case 'in': if (st.t >= T.IN) { set(st, 'open'); ev.push({ e: 'arrive-platform' }); } break;
      case 'open': if (st.t >= T.WAIT) set(st, 'out'); break;
      case 'out': if (st.t >= T.OUT) { set(st, 'gone'); ev.push({ e: 'gone' }); } break;
      case 'close': if (st.t >= T.CLOSE && st.door <= 0) { set(st, 'run'); ev.push({ e: 'next', i: st.cur + st.go }); } break;
      case 'run':
        if (st.t >= st.seg) {
          st.cur += st.go;
          if (st.cur === st.to) { set(st, st.back ? 'home' : 'arrive'); ev.push({ e: st.back ? 'home' : 'arrive', i: st.cur }); }
          else { set(st, 'stop'); ev.push({ e: 'stop', i: st.cur }); }
        }
        break;
      case 'stop': if (st.t >= T.STOP) { set(st, 'run'); ev.push({ e: 'next', i: st.cur + st.go }); } break;
    }
    return ev;
  }
  /* ホームで ドアから のる */
  function board(st) {
    if (st.phase !== 'open' || st.ride) return false;
    st.ride = true; set(st, 'pick');
    return true;
  }
  /* いきさきを きめる（pick か arrive の とき）。その むきに ない えきは だめ */
  function choose(st, to) {
    if (!['pick', 'arrive'].includes(st.phase)) return false;
    if (!destinations(st.dir, st.cur).includes(to)) return false;
    st.to = to; st.back = false; st.seg = segTime(Math.abs(to - st.cur)); st.trip++;
    set(st, 'close');
    return true;
  }
  /* もどる: はんたいむきの でんしゃで よこはまへ */
  function goBack(st) {
    if (st.phase !== 'arrive') return false;
    st.dir = st.go > 0 ? 'shonandai' : 'azamino'; st.go = -st.go;
    st.to = HOME; st.back = true; st.seg = segTime(Math.abs(HOME - st.cur));
    set(st, 'close');
    return true;
  }

  /* ---------------- え ---------------- */
  const BLUE = '#0B78BE', BLUE_D = '#075E96';
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function nameText(c, s, x, y, size, col = '#10202f') {   // よみ（おおきく）＋ 漢字（ちいさく）
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col;
    c.font = `bold ${Math.round(size)}px sans-serif`; c.fillText(s.yomi, x, y);
    c.font = `${Math.round(size * .55)}px sans-serif`; c.fillText(`${s.kanji}　${s.no}`, x, y + size * .9);
  }
  /* ホームに はいって くる でんしゃの いち（0 = まんなかに とまる）。ホームで ないなら null */
  function platformPose(st) {
    if (!st || st.ride && st.phase !== 'out') return null;
    const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    if (st.phase === 'ann' || st.phase === 'gone') return null;
    if (st.phase === 'in') return { x: -st.go * (1 - ease(st.t / T.IN)) * 1.6, door: 0 };
    if (st.phase === 'out') { const k = st.t / T.OUT; return { x: st.go * k * k * 1.6, door: 0 }; }
    return { x: 0, door: st.door };
  }
  /* ホールの ばめんに でんしゃを かく。ドアの はんい（タップ よう）を かえす */
  function drawPlatform(c, W, H, wy, st) {
    const p = platformPose(st);
    if (!p) return [];
    const th = Math.min(H * .32, 150), tw = W * 1.15, x0 = W / 2 - tw / 2 + p.x * W, y0 = wy - th * .72, doors = [];
    c.save();
    c.fillStyle = '#f8f9fa'; rr(c, x0, y0, tw, th, th * .18); c.fill();
    c.fillStyle = BLUE; c.fillRect(x0, y0 + th * .62, tw, th * .14);
    c.fillStyle = BLUE_D; c.fillRect(x0, y0 + th * .08, tw, th * .05);
    const nd = 4;
    for (let i = 0; i < nd; i++) {
      const dx = x0 + tw * (i + .5) / nd, dw = th * .42, dh = th * .78, dy = y0 + th * .15;
      c.fillStyle = '#495057'; c.fillRect(dx - dw / 2, dy, dw, dh);
      const o = p.door * dw * .45;
      if (p.door > .5) { c.fillStyle = '#e7f5ff'; c.fillRect(dx - dw / 2 + 2, dy + 2, dw - 4, dh - 2); c.fillStyle = BLUE; c.fillRect(dx - dw / 2 + 2, dy + dh * .7, dw - 4, dh * .1); }
      c.fillStyle = '#dee2e6'; c.fillRect(dx - dw / 2 - o, dy, dw / 2, dh); c.fillRect(dx + o, dy, dw / 2, dh);
      c.fillStyle = '#a5d8ff'; c.fillRect(dx - dw / 2 - o + dw * .08, dy + dh * .1, dw * .34, dh * .35); c.fillRect(dx + o + dw * .08, dy + dh * .1, dw * .34, dh * .35);
      if (i < nd - 1) { c.fillStyle = '#a5d8ff'; c.fillRect(dx + dw * .7, y0 + th * .2, tw / nd - dw * 1.4, th * .3); }
      if (p.door > .5) {
        doors.push({ x: dx - dw / 2, y: dy, w: dw, h: dh });
        c.strokeStyle = '#ffd43b'; c.lineWidth = 3; c.setLineDash([6, 5]); c.strokeRect(dx - dw / 2 - 3, dy - 3, dw + 6, dh + 6); c.setLineDash([]);
      }
    }
    c.fillStyle = '#10202f'; c.fillRect(x0 + tw * .02, y0 + th * .18, th * .9, th * .2);
    c.fillStyle = '#ffb84d'; c.font = `bold ${Math.round(th * .12)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(LINE[st.dir].name, x0 + tw * .02 + th * .45, y0 + th * .28);
    c.restore();
    return doors;
  }

  /* でんしゃの なか */
  let scroll = 0;
  function drawInside(c, W, H, st, t, dt) {
    const L = LINE[st.dir], go = st.go;
    // うごく はやさ（run の あいだ ゆっくり → はやく → ゆっくり）
    let v = 0, plat = 0, sign = st.cur;
    if (st.phase === 'run') {
      const k = Math.min(1, st.t / st.seg);
      v = Math.sin(Math.PI * k);
      if (k < .3) plat = -go * (k / .3) * 1.4;                  // いまの えきが うしろへ
      else if (k > .7) { plat = go * ((1 - k) / .3) * 1.4; sign = st.cur + go; }   // つぎの えきが まえから
      else plat = null;
    }
    scroll += v * dt * W * 2.2 * go;
    const wy0 = H * .2, wy1 = H * .62;                       // まどの たかさ
    const dw = Math.min(W * .26, 150), dx = W / 2 - dw / 2;    // まんなかの ドア
    // そと: トンネル
    c.fillStyle = '#1b1f27'; c.fillRect(0, wy0, W, wy1 - wy0);
    c.fillStyle = 'rgba(255,214,140,.85)';
    for (let i = -1; i < 8; i++) { const x = ((i * W / 6 - scroll) % (W * 1.17) + W * 1.17) % (W * 1.17) - W * .08; c.fillRect(x, wy0 + (wy1 - wy0) * .3, v > .3 ? 60 * v : 10, 4); }
    c.fillStyle = 'rgba(120,130,150,.35)';
    for (let i = 0; i < 12; i++) { const x = ((i * W / 10 - scroll * 1.6) % W + W) % W; c.fillRect(x, wy0, 3 + v * 30, wy1 - wy0); }
    // そと: えきの ホーム
    if (plat !== null) {
      const px = plat * W;
      c.save(); c.beginPath(); c.rect(0, wy0, W, wy1 - wy0); c.clip();
      c.fillStyle = '#e9eef3'; c.fillRect(px, wy0, W, wy1 - wy0);
      c.fillStyle = BLUE; c.fillRect(px, wy0 + (wy1 - wy0) * .18, W, (wy1 - wy0) * .07);
      c.fillStyle = '#ced4da'; c.fillRect(px, wy1 - (wy1 - wy0) * .18, W, (wy1 - wy0) * .18);
      c.fillStyle = '#ffd43b'; c.fillRect(px, wy1 - (wy1 - wy0) * .2, W, 4);
      const s = STATIONS[Math.max(0, Math.min(STATIONS.length - 1, sign))];
      const win = dx - W * .06, bw = Math.min(win * .9, 240), bx = px + W * .04 + (win - bw) / 2, by = wy0 + (wy1 - wy0) * .32, bh = (wy1 - wy0) * .34;
      c.fillStyle = '#fff'; rr(c, bx, by, bw, bh, 8); c.fill(); c.strokeStyle = BLUE; c.lineWidth = 3; c.stroke();
      nameText(c, s, bx + bw / 2, by + bh * .38, Math.min(bh * .36, bw / Math.max(5, s.yomi.length) * .92, 26));
      c.restore();
    }
    // かべ・まどわく
    c.fillStyle = '#eef2f6';
    c.fillRect(0, 0, W, wy0); c.fillRect(0, wy1, W, H - wy1);
    for (const x of [W * .04, dx - 10, dx + dw + 10 - 8, W * .96 - 8]) { c.fillStyle = '#ced4da'; c.fillRect(x, wy0, 8, wy1 - wy0); }
    // ドア（あく と ホームが みえる）
    const dy0 = wy0 - H * .05, dy1 = H * .86;
    c.fillStyle = '#e7f5ff'; c.fillRect(dx, dy0, dw, dy1 - dy0);
    if (plat === null || st.phase !== 'run') { c.fillStyle = '#e9eef3'; c.fillRect(dx, dy0, dw, dy1 - dy0); c.fillStyle = '#ffd43b'; c.fillRect(dx, dy1 - 6, dw, 6); }
    if (st.phase === 'run' && plat === null) { c.fillStyle = '#1b1f27'; c.fillRect(dx, dy0, dw, dy1 - dy0); }
    const o = st.door * dw * .48;
    c.fillStyle = '#ced4da'; c.fillRect(dx - o, dy0, dw / 2, dy1 - dy0); c.fillRect(dx + dw / 2 + o, dy0, dw / 2, dy1 - dy0);
    c.fillStyle = 'rgba(165,216,255,.45)'; c.fillRect(dx - o + dw * .07, dy0 + (dy1 - dy0) * .12, dw * .36, (dy1 - dy0) * .4); c.fillRect(dx + dw / 2 + o + dw * .07, dy0 + (dy1 - dy0) * .12, dw * .36, (dy1 - dy0) * .4);
    c.strokeStyle = '#868e96'; c.lineWidth = 3; c.strokeRect(dx, dy0, dw, dy1 - dy0);
    // いす
    c.fillStyle = BLUE; rr(c, W * .02, H * .66, dx - W * .04, H * .1, 10); c.fill(); rr(c, dx + dw + W * .02, H * .66, W - dx - dw - W * .04, H * .1, 10); c.fill();
    c.fillStyle = BLUE_D; c.fillRect(W * .02, H * .75, dx - W * .04, H * .04); c.fillRect(dx + dw + W * .02, H * .75, W - dx - dw - W * .04, H * .04);
    // ゆか
    c.fillStyle = '#adb5bd'; c.fillRect(0, H * .86, W, H * .14);
    // つりかわ（はやさで ゆれる）
    const sw = (st.phase === 'run' ? Math.cos(Math.PI * Math.min(1, st.t / st.seg)) : 0) * -go * .25 + Math.sin(t * 2) * .03;
    c.strokeStyle = '#868e96'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, H * .05); c.lineTo(W, H * .05); c.stroke();
    for (let x = W * .08; x < W; x += W * .12) {
      if (x > dx - 10 && x < dx + dw + 10) continue;
      const ex = x + Math.sin(sw) * H * .08, ey = H * .05 + Math.cos(sw) * H * .08;
      c.strokeStyle = '#adb5bd'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, H * .05); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = '#ffd43b'; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey + 7, 7, 0, Math.PI * 2); c.stroke();
    }
    // ドアの うえの ひょうじ
    const lw = Math.min(W * .9, 420), lx = W / 2 - lw / 2, ly = H * .1, lh = H * .09;
    c.fillStyle = '#10202f'; rr(c, lx, ly, lw, lh, 8); c.fill();
    c.fillStyle = BLUE; c.fillRect(lx, ly, lh * 1.4, lh);
    c.fillStyle = '#fff'; c.font = `bold ${Math.round(lh * .3)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(st.back ? 'もどり' : 'ブルー', lx + lh * .7, ly + lh * .5);
    const atSt = STATIONS[st.cur], nx = STATIONS[Math.max(0, Math.min(STATIONS.length - 1, st.cur + go))];
    const txt = st.phase === 'run' || st.phase === 'close' ? `つぎは ${nx.yomi}` : `${atSt.yomi}`;
    const room = lw - lh * 1.8;
    c.fillStyle = '#ffb84d'; c.font = `bold ${Math.round(Math.min(lh * .42, room / txt.length * 1.05))}px sans-serif`; c.textAlign = 'left';
    c.fillText(txt, lx + lh * 1.6, ly + lh * .5);
    c.fillStyle = BLUE; rr(c, lx + lw - lw * .42, ly + lh + 2, lw * .42, lh * .42, 6); c.fill();
    c.fillStyle = '#fff'; c.font = `bold ${Math.round(lh * .26)}px sans-serif`; c.textAlign = 'center';
    c.fillText(L.name, lx + lw - lw * .21, ly + lh * 1.21 + 2);
    // ろせんず（32えき）
    const my = H * .93, m0 = W * .05, m1 = W * .95, step = (m1 - m0) / (STATIONS.length - 1);
    c.strokeStyle = BLUE; c.lineWidth = 6; c.beginPath(); c.moveTo(m0, my); c.lineTo(m1, my); c.stroke();
    for (const s of STATIONS) {
      const x = m0 + s.i * step;
      c.fillStyle = s.i === HOME ? '#fab005' : s.i === st.to ? '#e03131' : '#fff';
      c.beginPath(); c.arc(x, my, s.i === st.cur ? 7 : 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = BLUE; c.lineWidth = 2; c.stroke();
    }
    let curX = m0 + st.cur * step;
    if (st.phase === 'run') curX += go * step * Math.min(1, st.t / st.seg);
    c.fillStyle = '#e03131'; c.beginPath(); c.moveTo(curX, my - 9); c.lineTo(curX - 7, my - 20); c.lineTo(curX + 7, my - 20); c.closePath(); c.fill();
    c.font = `bold ${Math.max(10, Math.round(H * .025))}px sans-serif`; c.fillStyle = '#10202f'; c.textBaseline = 'top';
    c.textAlign = 'left'; c.fillText('しょうなんだい', m0 - 4, my + 8);
    c.textAlign = 'right'; c.fillText('あざみの', m1 + 4, my + 8);
    c.textAlign = 'center'; c.fillStyle = '#e67700'; c.fillText('よこはま', m0 + HOME * step, my + 8);
  }

  return { STATIONS, HOME, LINE, T, destinations, segTime, create, step, board, choose, goBack, platformPose, drawPlatform, drawInside };
})();
if (typeof module !== 'undefined') module.exports = Blue;
