/* あしたの天気やさん — 保存（localStorage）と天気データの取りこみ */

/* ---------------- 保存 ---------------- */
const Store = (function () {
  const KEY = 'weather-lab:v1';
  const DEFAULTS = { city: 'yokohama', sound: true, stamps: 0, tries: 0, hits: 0, guesses: [], quizBest: 0, mapGroup: 'japan' };
  let data = null;

  function load() {
    if (data) return data;
    data = Object.assign({}, DEFAULTS);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(data, JSON.parse(raw));
    } catch (e) { /* 読めなくても はじめから遊べる */ }
    if (!Array.isArray(data.guesses)) data.guesses = [];
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) { /* いっぱいでも つづける */ }
  }

  return {
    get(k) { return load()[k]; },
    set(k, v) { load()[k] = v; save(); },
    update(fn) { fn(load()); save(); },
    all() { return load(); }
  };
})();

/* ---------------- 天気データ ---------------- */
const Weather = (function () {
  const CACHE_PREFIX = 'weather-lab:cache:';
  const MAP_PREFIX = 'weather-lab:map:';
  const FRESH_MS = 30 * 60 * 1000;   // 30分は取り直さない

  const API = 'https://api.open-meteo.com/v1/forecast';
  const PARAMS =
    '&current=temperature_2m,weather_code,relative_humidity_2m,cloud_cover,surface_pressure,wind_speed_10m,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset' +
    '&hourly=temperature_2m,weather_code,precipitation_probability' +
    '&timezone=auto&past_days=2&forecast_days=7';

  function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return ymd(new Date(y, m - 1, d + n));
  }

  /* その町の「今」を、時差から計算する */
  function localNow(tzOffsetSec) {
    const t = new Date(Date.now() + (tzOffsetSec || 0) * 1000);
    return {
      hh: t.getUTCHours(),
      mm: t.getUTCMinutes(),
      ss: t.getUTCSeconds(),
      date: t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(t.getUTCDate()).padStart(2, '0')
    };
  }

  /* API の答えを、アプリで使いやすい形にならしかえる */
  function normalize(json, city) {
    const cur = json.current || {};
    const today = (cur.time || ymd(new Date())).slice(0, 10);
    const daily = [];
    const D = json.daily || {};
    (D.time || []).forEach((t, i) => {
      daily.push({
        date: t,
        code: D.weather_code[i],
        tmax: D.temperature_2m_max[i],
        tmin: D.temperature_2m_min[i],
        pop: D.precipitation_probability_max ? D.precipitation_probability_max[i] : null,
        wind: D.wind_speed_10m_max ? D.wind_speed_10m_max[i] : null,
        sunrise: D.sunrise ? D.sunrise[i] : null,
        sunset: D.sunset ? D.sunset[i] : null
      });
    });
    const hourly = [];
    const H = json.hourly || {};
    (H.time || []).forEach((t, i) => {
      hourly.push({
        time: t,
        temp: H.temperature_2m[i],
        code: H.weather_code[i],
        pop: H.precipitation_probability ? H.precipitation_probability[i] : null
      });
    });
    return {
      cityId: city.id,
      today: today,
      now: cur.time || null,
      tzOffset: json.utc_offset_seconds != null ? json.utc_offset_seconds : 32400,
      tzName: json.timezone || '',
      current: {
        temp: cur.temperature_2m,
        code: cur.weather_code,
        humidity: cur.relative_humidity_2m,
        cloud: cur.cloud_cover,
        pressure: cur.surface_pressure,
        wind: cur.wind_speed_10m,
        precip: cur.precipitation
      },
      daily: daily,
      hourly: hourly,
      demo: false,
      fetchedAt: Date.now()
    };
  }

  /* ---- ネットが使えないときの「おためし天気」 ----
     日づけと町から決めるぎじ乱数。同じ日はいつ開いても同じ天気になる。 */
  function seeded(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* 経度からだいたいの時差を出す（おためし天気用） */
  function guessOffset(lon) {
    return Math.round(lon / 15) * 3600;
  }

  /* 緯度と月から、その町のだいたいの気温を出す（南半球は季節が反対） */
  function baseTemp(city, month) {
    const south = city.lat < 0;
    const m = south ? ((month + 5) % 12) + 1 : month;
    const season = -Math.cos((m - 1) / 12 * Math.PI * 2);        // 冬 -1 / 夏 +1
    const absLat = Math.abs(city.lat);
    const year = 30 - absLat * 0.45;                             // 赤道に近いほど暑い
    return year + season * (absLat * 0.32);
  }

  function demoOne(city, date, rnd) {
    const month = Number(date.slice(5, 7));
    const south = city.lat < 0;
    const m = south ? ((month + 5) % 12) + 1 : month;
    const cold = baseTemp(city, month) < 4;
    const r = rnd();
    let code;
    if (cold) code = r < 0.35 ? 73 : (r < 0.55 ? 3 : (r < 0.85 ? 1 : 0));
    else if (m === 6 || m === 7) code = r < 0.45 ? 63 : (r < 0.7 ? 3 : (r < 0.9 ? 2 : 0));
    else if (m === 8) code = r < 0.2 ? 95 : (r < 0.4 ? 80 : (r < 0.7 ? 1 : 0));
    else code = r < 0.25 ? 61 : (r < 0.5 ? 3 : (r < 0.8 ? 1 : 0));
    const base = baseTemp(city, month);
    const tmax = Math.round((base + 4 + rnd() * 4) * 10) / 10;
    const tmin = Math.round((base - 4 + rnd() * 3) * 10) / 10;
    const kind = wmoInfo(code).kind;
    const pop = kind === '晴れ' ? Math.round(rnd() * 20)
              : kind === 'くもり' ? 20 + Math.round(rnd() * 30)
              : 60 + Math.round(rnd() * 40);
    return { code, tmax, tmin, pop, wind: Math.round(5 + rnd() * 20) };
  }

  function demoData(city) {
    const off = guessOffset(city.lon);
    const today = localNow(off).date;
    const daily = [], hourly = [];
    for (let i = -2; i < 7; i++) {
      const date = addDays(today, i);
      const one = demoOne(city, date, seeded(city.id + date));
      daily.push({
        date, code: one.code, tmax: one.tmax, tmin: one.tmin, pop: one.pop, wind: one.wind,
        sunrise: date + 'T05:30', sunset: date + 'T18:30'
      });
      for (let h = 0; h < 24; h++) {
        const warm = Math.sin((h - 6) / 24 * Math.PI * 2) * (one.tmax - one.tmin) / 2;
        hourly.push({
          time: date + 'T' + String(h).padStart(2, '0') + ':00',
          temp: Math.round(((one.tmax + one.tmin) / 2 + warm) * 10) / 10,
          code: one.code,
          pop: one.pop
        });
      }
    }
    const t = daily[2];
    const kind = wmoInfo(t.code).kind;
    const now = localNow(off);
    return {
      cityId: city.id,
      today: today,
      now: today + 'T' + String(now.hh).padStart(2, '0') + ':00',
      tzOffset: off,
      tzName: '',
      current: {
        temp: Math.round(((t.tmax + t.tmin) / 2) * 10) / 10,
        code: t.code,
        humidity: kind === '晴れ' ? 50 : kind === 'くもり' ? 68 : 88,
        cloud: kind === '晴れ' ? 10 : kind === 'くもり' ? 75 : 95,
        pressure: kind === '晴れ' ? 1018 : kind === 'くもり' ? 1010 : 1002,
        wind: t.wind,
        precip: kind === '雨' || kind === 'かみなり' ? 1.2 : 0
      },
      daily: daily,
      hourly: hourly,
      demo: true,
      fetchedAt: Date.now()
    };
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCache(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* むし */ }
  }

  function getJSON(url, ms) {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 9000));
    return Promise.race([fetch(url), timeout])
      .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); });
  }

  return {
    ymd: ymd,
    addDays: addDays,
    localNow: localNow,

    /* 1つの町の天気。取れなければ キャッシュ → おためし天気 の順。 */
    load: function (city) {
      const key = CACHE_PREFIX + city.id;
      const cached = readCache(key);
      if (cached && !cached.demo && Date.now() - cached.fetchedAt < FRESH_MS) {
        return Promise.resolve(cached);
      }
      const url = API + '?latitude=' + city.lat + '&longitude=' + city.lon + PARAMS;
      return getJSON(url)
        .then(json => {
          const data = normalize(json, city);
          writeCache(key, data);
          return data;
        })
        .catch(() => {
          if (cached) { cached.stale = true; return cached; }
          return demoData(city);
        });
    },

    /* 地図用：たくさんの町の「今の天気」を1回のお願いでまとめて取る */
    loadMany: function (cities, groupId) {
      const key = MAP_PREFIX + groupId;
      const cached = readCache(key);
      if (cached && !cached.demo && Date.now() - cached.fetchedAt < FRESH_MS) {
        return Promise.resolve(cached);
      }
      const url = API +
        '?latitude=' + cities.map(c => c.lat).join(',') +
        '&longitude=' + cities.map(c => c.lon).join(',') +
        '&current=temperature_2m,weather_code&timezone=auto&forecast_days=1';
      return getJSON(url, 11000)
        .then(list => {
          if (!Array.isArray(list)) list = [list];
          const spots = cities.map((c, i) => {
            const j = list[i] || {};
            const cur = j.current || {};
            return {
              cityId: c.id,
              temp: cur.temperature_2m,
              code: cur.weather_code,
              tzOffset: j.utc_offset_seconds != null ? j.utc_offset_seconds : 32400
            };
          });
          const out = { group: groupId, spots: spots, demo: false, fetchedAt: Date.now() };
          writeCache(key, out);
          return out;
        })
        .catch(() => {
          if (cached) { cached.stale = true; return cached; }
          return {
            group: groupId,
            demo: true,
            fetchedAt: Date.now(),
            spots: cities.map(c => {
              const d = demoData(c);
              return { cityId: c.id, temp: d.current.temp, code: d.current.code, tzOffset: d.tzOffset };
            })
          };
        });
    },

    /* 今日の天気の「理由」カードを、実さいの数字から作る */
    reasons: function (data) {
      const c = data.current;
      const out = [];
      const cloud = c.cloud, hum = c.humidity, hpa = c.pressure, wind = c.wind;

      out.push({
        emoji: '☁️', label: '雲の量', value: Math.round(cloud) + '%',
        text: cloud < 25 ? '空のほとんどが青空。太陽がよく見えます。'
            : cloud < 60 ? '空の半分くらいが雲。晴れたりかげったりします。'
            : cloud < 90 ? '空の多くが雲。地面がかげって すずしめ。'
            : '空は雲でいっぱい。雨がいつふってもおかしくありません。',
        level: cloud / 100
      });

      out.push({
        emoji: '💧', label: '湿度', value: Math.round(hum) + '%',
        text: hum < 45 ? '空気はカラカラ。せんたく物がよくかわく日。'
            : hum < 70 ? 'ちょうどよい湿度です。'
            : hum < 85 ? '少しジメジメ。空気が水をたくさん持っています。'
            : '空気はもう水でいっぱい。少し冷えるだけで雲や雨になります。',
        level: hum / 100
      });

      out.push({
        emoji: '📊', label: '気圧', value: Math.round(hpa) + 'hPa',
        text: hpa >= 1018 ? '高い（高気圧）。空気が上からしずんで、雲ができにくい＝晴れやすい。'
            : hpa >= 1008 ? 'ふつうくらい。1013hPa がだいたいまん中です。'
            : '低い（低気圧）。空気が上にのぼって冷えるので、雲ができやすい＝雨になりやすい。',
        level: Math.max(0, Math.min(1, (1030 - hpa) / 40))
      });

      out.push({
        emoji: '🍃', label: '風の速さ', value: Math.round(wind) + 'km/h',
        text: wind < 8 ? 'ほとんど風なし。はたがたれています。'
            : wind < 20 ? 'そよそよ。葉がゆれるくらい。'
            : wind < 35 ? '強め。かさがあおられます。'
            : 'とても強い風。ぼうしが飛ばされそう！',
        level: Math.max(0, Math.min(1, wind / 45))
      });

      out.push({
        emoji: '🌡️', label: '今の気温', value: Math.round(c.temp * 10) / 10 + '℃',
        text: c.temp < 5 ? 'とても寒い。雨が雪に変わるかもしれません。'
            : c.temp < 15 ? 'ひんやり。上着がいりますね。'
            : c.temp < 25 ? 'すごしやすい気温です。'
            : c.temp < 32 ? '暑い。水を飲みましょう。'
            : 'とても暑い！ 上にのぼる空気が強くて、夕立ちになりやすい日です。',
        level: Math.max(0, Math.min(1, (c.temp + 5) / 45))
      });

      return out;
    },

    /* 数字をつないで「だから今日は〇〇」の1文を作る */
    story: function (data) {
      const c = data.current;
      const kind = wmoInfo(c.code).kind;
      const parts = [];
      if (c.pressure >= 1018) parts.push('気圧が高くて空気がしずんでいる');
      else if (c.pressure < 1008) parts.push('気圧が低くて空気が上にのぼっている');
      if (c.humidity >= 80) parts.push('空気が水をたくさん持っている');
      else if (c.humidity < 45) parts.push('空気がかわいている');
      if (c.cloud >= 80) parts.push('雲が空をおおっている');
      else if (c.cloud < 25) parts.push('雲がほとんどない');
      const why = parts.length === 0 ? ''
        : parts.length === 1 ? parts[0] + '。'
        : parts.slice(0, -1).join('、') + '、そして' + parts[parts.length - 1] + '。';
      const end = kind === '晴れ' ? 'だから今日は晴れ ☀️'
                : kind === 'くもり' ? 'だから今日はくもり ☁️'
                : kind === '雪' ? 'だから今日は雪 ⛄'
                : kind === 'かみなり' ? 'だから今日はかみなり ⛈️'
                : 'だから今日は雨 ☔';
      return why + end;
    }
  };
})();
