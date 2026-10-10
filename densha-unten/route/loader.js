// 路線JSON・車両JSONの読み込みと検証。
// validateRoute / validateVehicle は fetch に依存しないので、テストから直接呼べる。

export class RouteError extends Error {}

function fail(msg) { throw new RouteError(msg); }
function isNum(x) { return typeof x === "number" && Number.isFinite(x); }
// { note, list: [...] } と [...] の両方を受けつける
function listOf(v) { return Array.isArray(v) ? v : (v && Array.isArray(v.list) ? v.list : []); }

export function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(str || ""));
  if (!m) fail(`時刻の書き方がちがいます: ${str}`);
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0));
}

export function validateRoute(raw) {
  if (!raw || typeof raw !== "object") fail("路線データが空です");
  const meta = raw.meta || fail("meta がありません");
  for (const k of ["id", "name", "symbol"]) if (!meta[k]) fail(`meta.${k} がありません`);

  const stations = (raw.stations || []).map((st, i) => {
    for (const k of ["id", "name", "kana"]) if (!st[k]) fail(`stations[${i}].${k} がありません`);
    if (!isNum(st.stop)) fail(`stations[${i}].stop が数ではありません`);
    return {
      id: st.id, name: st.name, kana: st.kana, roman: st.roman || "",
      stop: st.stop,
      dwell: isNum(st.dwell) ? st.dwell : 20,
      platform: st.platform === "island" ? "island" : "side",
      length: isNum(st.length) ? st.length : 200,
      // ドアが開く側（下り＝左の線路を走るので、ふつうは 相対式=左、島式=右）
      doors: st.doors === "left" || st.doors === "right" ? st.doors : (st.platform === "island" ? "right" : "left"),
      // 乗りかえ: [["路線名", "かな"], ...]（車内アナウンスで使う）
      transfers: (Array.isArray(st.transfers) ? st.transfers : []).map((t, j) => {
        if (!Array.isArray(t) || typeof t[0] !== "string") fail(`stations[${i}].transfers[${j}] は ["路線名", "かな"] の形です`);
        return { name: t[0], kana: t[1] || t[0] };
      }),
    };
  });
  if (stations.length < 2) fail("駅は2つ以上必要です");
  for (let i = 1; i < stations.length; i++) {
    if (stations[i].stop <= stations[i - 1].stop) fail(`駅の停止位置が順に並んでいません: ${stations[i].name}`);
  }

  const range = (name, arr, check) => listOf(arr).map((r, i) => {
    if (!Array.isArray(r) || !isNum(r[0]) || !isNum(r[1])) fail(`${name}[${i}] の始点・終点が数ではありません`);
    if (r[1] <= r[0]) fail(`${name}[${i}] の終点が始点より手前です`);
    check && check(r, i);
    return r;
  });

  const curves = range("curves", raw.curves, (r, i) => {
    if (!isNum(r[2]) || r[2] < 100) fail(`curves[${i}] の半径がおかしいです`);
    if (r[3] !== "L" && r[3] !== "R") fail(`curves[${i}] の左右は "L" か "R" です`);
  }).map(r => ({ start: r[0], end: r[1], radius: r[2], dir: r[3] }));
  const transition = isNum(raw.curves && raw.curves.transition) ? raw.curves.transition : 50;
  for (const c of curves) {
    if (c.end - c.start < transition * 2) fail(`曲線 ${c.start}〜${c.end} が緩和曲線より短いです`);
  }

  const TYPES = ["tunnel", "cut", "ground", "elev", "bridge"];
  const structures = range("structures", raw.structures, (r, i) => {
    if (!TYPES.includes(r[2])) fail(`structures[${i}] の種別は ${TYPES.join("/")} のどれかです`);
    if (!isNum(r[3])) fail(`structures[${i}] の高さが数ではありません`);
  }).map(r => ({ start: r[0], end: r[1], type: r[2], height: r[3] }));

  const atc = Object.assign({ steps: [0, 25, 45, 55, 65, 75, 90, 100, 110], blockLength: 200, patternDecel: 0.65, brakeDecel: 3.2 }, raw.atc || {});
  atc.steps = [...atc.steps].sort((a, b) => a - b);
  const maxSpeed = isNum(meta.maxSpeed) ? meta.maxSpeed : atc.steps[atc.steps.length - 1];

  const speedLimits = range("speedLimits", raw.speedLimits, (r, i) => {
    if (!isNum(r[2]) || r[2] < 0) fail(`speedLimits[${i}] の制限速度がおかしいです`);
    if (!atc.steps.includes(r[2])) fail(`speedLimits[${i}] の ${r[2]}km/h は ATC の段階 (${atc.steps.join(",")}) にありません`);
  }).map(r => ({ start: r[0], end: r[1], speed: r[2] }));

  const rivers = range("rivers", raw.rivers).map(r => ({ start: r[0], end: r[1], name: r[2] || "" }));
  const dense = range("scenery.dense", raw.scenery && raw.scenery.dense).map(r => ({ start: r[0], end: r[1] }));

  const tt = raw.timetable || {};
  const first = stations[0].stop, last = stations[stations.length - 1].stop;
  return {
    meta: {
      id: meta.id, name: meta.name, kana: meta.kana || "", service: meta.service || "", serviceKana: meta.serviceKana || "",
      lineColor: meta.lineColor || "#c33", symbol: meta.symbol, gauge: meta.gauge || 1067,
      maxSpeed, startBearing: isNum(meta.startBearing) ? meta.startBearing : 0,
      trackSpacing: isNum(meta.trackSpacing) ? meta.trackSpacing : 3.8,
      vehicle: meta.vehicle || "5050",
    },
    stations, curves, transition, structures, speedLimits, rivers, dense, atc,
    timetable: {
      type: tt.type || "各停", typeKana: tt.typeKana || "",
      firstDeparture: parseTime(tt.firstDeparture || "10:00:00"),
      startTime: parseTime(tt.startTime || tt.firstDeparture || "10:00:00"),
      headway: isNum(tt.headway) ? tt.headway : 180,
      oncoming: Object.assign({ speed: 70, interval: 300 }, tt.oncoming || {}),
    },
    // 描画・計算する範囲（始発の手前と終着の先に余白をとる）
    sMin: first - 400,
    sMax: last + 400,
  };
}

export function validateVehicle(raw) {
  if (!raw || !Array.isArray(raw.powerNotches) || !Array.isArray(raw.brakeNotches)) fail("車両データが不完全です");
  return Object.assign({
    cars: 8, carLength: 20, length: 160, emergencyBrake: 4.5,
    tractionCurve: { constantUntil: 38, inverseUntil: 72 },
    response: { powerUp: 2.0, powerDown: 3.0, brakeUp: 3.2, brakeDown: 2.4 },
    resistance: { a: 1.6, b: 0.03, c: 0.0006, cTunnel: 0.0009, curve: 600 },
    kmhPerNkn: 0.0353, bcMax: 440,
  }, raw);
}

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new RouteError(`${url} を読みこめません (${res.status})`);
  return res.json();
}

export async function loadRouteList(base = "data/routes/") {
  const idx = await getJSON(base + "index.json");
  const out = [];
  for (const file of idx.routes || []) {
    try {
      const raw = await getJSON(base + file);
      out.push({ file, raw, route: validateRoute(raw) });
    } catch (e) {
      console.warn("路線データを飛ばします:", file, e);
    }
  }
  return out;
}

export async function loadVehicle(id, base = "data/vehicles/") {
  return validateVehicle(await getJSON(`${base}${id}.json`));
}
