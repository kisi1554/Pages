/* あしたの天気やさん — 地図
   陸地（map-data.js）をえがき、その上に町の天気マークと気温をならべる。 */

const WeatherMap = (function () {
  let cv, ctx, W = 0, H = 0, dpr = 1;
  let group = 'japan';
  let spots = {};          // cityId -> { temp, code, tzOffset }
  let selected = null;
  let pins = [];           // 当たり判定用
  let onPick = null;

  /* 気温の色（寒い青 → 暑い赤） */
  const SCALE = [
    [-15, [ 74,  99, 184]], [-5, [ 93, 149, 214]], [ 5, [134, 195, 232]],
    [ 12, [143, 202, 160]], [18, [237, 211,  92]], [24, [240, 161,  63]],
    [ 30, [232, 112,  58]], [36, [216,  69,  69]]
  ];

  function tempColor(t) {
    if (t == null || isNaN(t)) return '#b9c6d2';
    if (t <= SCALE[0][0]) return 'rgb(' + SCALE[0][1].join(',') + ')';
    for (let i = 1; i < SCALE.length; i++) {
      if (t <= SCALE[i][0]) {
        const [t0, c0] = SCALE[i - 1], [t1, c1] = SCALE[i];
        const k = (t - t0) / (t1 - t0);
        return 'rgb(' + c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(',') + ')';
      }
    }
    return 'rgb(' + SCALE[SCALE.length - 1][1].join(',') + ')';
  }

  function view() { return MAP_VIEWS[group]; }
  function land() { return group === 'japan' ? JAPAN_LAND : WORLD_LAND; }
  function cityList() {
    const list = CITIES.filter(c => c.group === group);
    /* 世界地図には、くらべる目じるしとして横浜も出す */
    if (group === 'world') {
      const home = CITIES.find(c => c.id === 'yokohama');
      if (home) list.push(home);
    }
    return list;
  }

  /* 経度緯度 → 画面の座標 */
  function project(lon, lat) {
    const [x0, y0, x1, y1] = view().box;
    return [(lon - x0) / (x1 - x0) * W, (y1 - lat) / (y1 - y0) * H];
  }

  /* 名前をおくときのずらしはば（地図の大きさに合わせる） */
  function offsetOf(city) {
    const ref = group === 'japan' ? 340 : 700;
    const k = Math.max(0.72, Math.min(1.5, W / ref));
    const ox = (group === 'world' && city.group === 'japan') ? (city.wox || 0) : (city.ox || 0);
    const oy = (group === 'world' && city.group === 'japan') ? (city.woy || 0) : (city.oy || 0);
    return [ox * k, oy * k, k];
  }


  /* ふだが重ならない場所をさがす。まず希望の位置、だめなら少しずつずらす。 */
  function hit(a, b) {
    return !(a.x + a.w + 3 < b.x || b.x + b.w + 3 < a.x ||
             a.y + a.h + 3 < b.y || b.y + b.h + 3 < a.y);
  }

  function place(px, py, ox, oy, w, h, placed) {
    const step = h + 5;
    const side = w * 0.75;
    const tries = [[ox, oy], [-ox, oy]];
    for (let i = 1; i <= 5; i++) {
      tries.push([ox, oy - step * i], [ox, oy + step * i],
                 [-ox, oy - step * i], [-ox, oy + step * i],
                 [ox - side * i, oy], [ox + side * i, oy],
                 [ox - side * i, oy - step], [ox + side * i, oy + step]);
    }
    tries.push([0, -step * 3], [0, step * 3]);
    for (let i = 0; i < tries.length; i++) {
      const x = Math.max(2, Math.min(W - w - 2, px + tries[i][0] - w / 2));
      const y = Math.max(2, Math.min(H - h - 2, py + tries[i][1] - h / 2));
      const box = { x: x, y: y, w: w, h: h };
      let ok = true;
      for (let j = 0; j < placed.length; j++) {
        if (hit(box, placed[j])) { ok = false; break; }
      }
      if (ok) return [x, y];
    }
    return [Math.max(2, Math.min(W - w - 2, px + ox - w / 2)),
            Math.max(2, Math.min(H - h - 2, py + oy - h / 2))];
  }

  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(260, r.width);
    H = Math.max(180, r.height);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    /* 海 */
    const sea = ctx.createLinearGradient(0, 0, 0, H);
    sea.addColorStop(0, '#bfe0f5');
    sea.addColorStop(1, '#9fcbea');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, W, H);

    /* 陸地 */
    ctx.fillStyle = '#dcefd2';
    ctx.strokeStyle = '#8bb884';
    ctx.lineWidth = 1;
    land().forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => {
        const [x, y] = project(p[0], p[1]);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    /* 世界地図には赤道の線を入れる */
    if (group === 'world') {
      const [, ey] = project(0, 0);
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(200, 90, 60, .55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, ey); ctx.lineTo(W, ey); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(170, 70, 45, .85)';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText('赤道（せきどう）', 6, ey - 5);
    }

    /* 町 ──
       ①場所を決める ②引き出し線と点をかく ③ふだをかく、の順。
       こうすると、あとの町の点や線が前の町のふだをかくさない。 */
    pins = [];
    const scale = Math.max(0.72, Math.min(1.5, W / (group === 'japan' ? 340 : 700)));
    const list = cityList();

    /* ①場所を決める */
    const dots = list.map(c => {
      const [x, y] = project(c.lon, c.lat);
      return { id: c.id, x: x, y: y };
    });
    const obstacles = dots.map(d => ({ x: d.x - 8, y: d.y - 8, w: 16, h: 16 }));
    if (group === 'world') {
      /* 「赤道」の文字にもふだを重ねない */
      const [, ey] = project(0, 0);
      obstacles.push({ x: 4, y: ey - 18, w: 108, h: 20 });
    }
    const placed = [];
    const labels = [];

    list.slice().sort((a, b) => b.lat - a.lat).forEach(city => {
      const dot = dots.find(d => d.id === city.id);
      const [ox, oy] = offsetOf(city);
      const s = spots[city.id] || {};
      const info = s.code != null ? wmoInfo(s.code) : null;
      const temp = s.temp != null ? Math.round(s.temp) : null;
      const tempText = temp == null ? '--' : temp + '°';

      const nameSize = Math.round(11.5 * scale);
      const yomiSize = Math.round(8 * scale);
      const tempSize = Math.round(13 * scale);
      const markW = Math.round(14 * scale);
      const padX = 6 * scale;
      ctx.font = '700 ' + nameSize + 'px system-ui, sans-serif';
      const nameW = ctx.measureText(city.name).width;
      ctx.font = '400 ' + yomiSize + 'px system-ui, sans-serif';
      const yomiW = city.yomi ? ctx.measureText(city.yomi).width : 0;
      ctx.font = '700 ' + tempSize + 'px system-ui, sans-serif';
      const tempW = ctx.measureText(tempText).width;

      const boxW = padX * 2 + markW + 4 + Math.max(nameW, yomiW) + 6 + tempW;
      const boxH = Math.round(28 * scale);
      const spot = place(dot.x, dot.y, ox, oy, boxW, boxH, placed.concat(obstacles));
      placed.push({ x: spot[0], y: spot[1], w: boxW, h: boxH });
      labels.push({
        city: city, dot: dot, bx: spot[0], by: spot[1], bw: boxW, bh: boxH,
        info: info, temp: s.temp, tempText: tempText,
        nameSize: nameSize, yomiSize: yomiSize, tempSize: tempSize,
        markW: markW, padX: padX, tempW: tempW
      });
    });

    /* ②引き出し線と町の点 */
    labels.forEach(L => {
      ctx.strokeStyle = 'rgba(40, 70, 100, .45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L.bx + L.bw / 2, L.by + L.bh / 2);
      ctx.lineTo(L.dot.x, L.dot.y);
      ctx.stroke();
    });
    labels.forEach(L => {
      const isSel = L.city.id === selected;
      ctx.beginPath();
      ctx.arc(L.dot.x, L.dot.y, isSel ? 6.5 : 5, 0, 6.284);
      ctx.fillStyle = tempColor(L.temp);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    });

    /* ③ふだ */
    labels.forEach(L => {
      const isSel = L.city.id === selected;
      ctx.fillStyle = isSel ? 'rgba(255, 255, 255, .98)' : 'rgba(255, 255, 255, .93)';
      roundRect(L.bx, L.by, L.bw, L.bh, 9 * scale);
      ctx.fill();
      ctx.lineWidth = isSel ? 3 : 1.5;
      ctx.strokeStyle = isSel ? '#1a6fb5' : 'rgba(60, 100, 140, .35)';
      ctx.stroke();

      ctx.textBaseline = 'middle';
      ctx.font = Math.round(14 * scale) + 'px system-ui, sans-serif';
      ctx.fillStyle = '#1d2b3a';
      ctx.fillText(L.info ? L.info.mark : '…', L.bx + L.padX, L.by + L.bh / 2);

      const tx = L.bx + L.padX + L.markW + 4;
      if (L.city.yomi) {
        ctx.textBaseline = 'alphabetic';
        ctx.font = '400 ' + L.yomiSize + 'px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(70, 95, 120, .9)';
        ctx.fillText(L.city.yomi, tx, L.by + L.bh * 0.42);
        ctx.font = '700 ' + L.nameSize + 'px system-ui, sans-serif';
        ctx.fillStyle = '#1d2b3a';
        ctx.fillText(L.city.name, tx, L.by + L.bh * 0.88);
      } else {
        ctx.textBaseline = 'middle';
        ctx.font = '700 ' + L.nameSize + 'px system-ui, sans-serif';
        ctx.fillStyle = '#1d2b3a';
        ctx.fillText(L.city.name, tx, L.by + L.bh / 2);
      }

      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + L.tempSize + 'px system-ui, sans-serif';
      ctx.fillStyle = tempColor(L.temp);
      ctx.fillText(L.tempText, L.bx + L.bw - L.padX - L.tempW, L.by + L.bh / 2);

      pins.push({ id: L.city.id, px: L.dot.x, py: L.dot.y, bx: L.bx, by: L.by, bw: L.bw, bh: L.bh });
    });

    ctx.textBaseline = 'alphabetic';
  }

  function pick(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let best = null, bestD = 1e9;
    pins.forEach(p => {
      if (x >= p.bx && x <= p.bx + p.bw && y >= p.by && y <= p.by + p.bh) {
        best = p; bestD = -1;
        return;
      }
      const d = Math.hypot(x - p.px, y - p.py);
      if (d < bestD) { bestD = d; if (d < 26) best = p; }
    });
    if (best && onPick) onPick(best.id);
  }

  return {
    tempColor: tempColor,
    init(canvas, hooks) {
      cv = canvas;
      ctx = cv.getContext('2d');
      onPick = hooks && hooks.onPick;
      cv.addEventListener('click', e => pick(e.clientX, e.clientY));
      window.addEventListener('resize', () => { resize(); draw(); });
      resize();
      draw();
    },
    setGroup(g) { group = g; resize(); draw(); },
    getGroup() { return group; },
    setSpots(list) {
      list.forEach(s => { spots[s.cityId] = s; });
      draw();
    },
    getSpot(id) { return spots[id]; },
    setSelected(id) { selected = id; draw(); },
    redraw() { resize(); draw(); }
  };
})();
