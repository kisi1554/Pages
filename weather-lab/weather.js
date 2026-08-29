/* あしたのてんきやさん — ほぞん（localStorage）と 天気データの とりこみ */

/* ---------------- ほぞん ---------------- */
const Store = (function () {
  const KEY = 'weather-lab:v1';
  const DEFAULTS = { city: 'tokyo', sound: true, stamps: 0, tries: 0, hits: 0, guesses: [], quizBest: 0, seen: [] };
  let data = null;

  function load() {
    if (data) return data;
    data = Object.assign({}, DEFAULTS);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(data, JSON.parse(raw));
    } catch (e) { /* よめなくても はじめから あそべる */ }
    if (!Array.isArray(data.guesses)) data.guesses = [];
    if (!Array.isArray(data.seen)) data.seen = [];
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
  const FRESH_MS = 30 * 60 * 1000;   // 30分は とりなおさない

  const API = 'https://api.open-meteo.com/v1/forecast';
  const PARAMS =
    '&current=temperature_2m,weather_code,relative_humidity_2m,cloud_cover,surface_pressure,wind_speed_10m,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset' +
    '&hourly=temperature_2m,weather_code,precipitation_probability' +
    '&timezone=Asia%2FTokyo&past_days=2&forecast_days=7';

  function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return ymd(dt);
  }

  /* API の こたえを、アプリで つかいやすい かたちに ならしかえる */
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

  /* ---- ネットが つかえない ときの 「おためし天気」 ----
     日づけと 町から きめる ぎじらんすう。おなじ日は いつ ひらいても おなじ天気に なる。 */
  function seeded(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function demoData(city) {
    const today = ymd(new Date());
    const month = new Date().getMonth() + 1;
    const north = city.lat > 38;
    const south = city.lat < 32;
    /* きせつの きおん（ざっくり）。北は さむく、南は あたたかく。 */
    const base = 15 - 12 * Math.cos((month - 1) / 12 * Math.PI * 2);
    const shift = (35 - city.lat) * 0.7;
    const daily = [], hourly = [];
    for (let i = -2; i < 7; i++) {
      const date = addDays(today, i);
      const rnd = seeded(city.id + date);
      const r = rnd();
      let code;
      if (month >= 12 || month <= 2) code = north && r < 0.35 ? 73 : (r < 0.5 ? 3 : (r < 0.8 ? 1 : 0));
      else if (month === 6 || month === 7) code = r < 0.45 ? 63 : (r < 0.7 ? 3 : (r < 0.9 ? 2 : 0));
      else if (month === 8) code = r < 0.2 ? 95 : (r < 0.4 ? 80 : (r < 0.7 ? 1 : 0));
      else code = r < 0.25 ? 61 : (r < 0.5 ? 3 : (r < 0.8 ? 1 : 0));
      const tmax = Math.round((base + shift + 4 + rnd() * 4) * 10) / 10;
      const tmin = Math.round((base + shift - 4 + rnd() * 3) * 10) / 10;
      const kind = wmoInfo(code).kind;
      const pop = kind === 'はれ' ? Math.round(rnd() * 20) : kind === 'くもり' ? 20 + Math.round(rnd() * 30) : 60 + Math.round(rnd() * 40);
      daily.push({ date, code, tmax, tmin, pop, wind: Math.round(5 + rnd() * 20), sunrise: date + 'T05:30', sunset: date + 'T18:30' });
      for (let h = 0; h < 24; h++) {
        const warm = Math.sin((h - 6) / 24 * Math.PI * 2) * (tmax - tmin) / 2;
        hourly.push({
          time: date + 'T' + String(h).padStart(2, '0') + ':00',
          temp: Math.round(((tmax + tmin) / 2 + warm) * 10) / 10,
          code: code,
          pop: pop
        });
      }
    }
    const t = daily[2];
    const kind = wmoInfo(t.code).kind;
    return {
      cityId: city.id,
      today: today,
      now: today + 'T' + String(new Date().getHours()).padStart(2, '0') + ':00',
      current: {
        temp: Math.round(((t.tmax + t.tmin) / 2) * 10) / 10,
        code: t.code,
        humidity: kind === 'はれ' ? 45 + (south ? 15 : 0) : kind === 'くもり' ? 65 : 88,
        cloud: kind === 'はれ' ? 10 : kind === 'くもり' ? 75 : 95,
        pressure: kind === 'はれ' ? 1018 : kind === 'くもり' ? 1010 : 1002,
        wind: t.wind,
        precip: kind === 'あめ' || kind === 'かみなり' ? 1.2 : 0
      },
      daily: daily,
      hourly: hourly,
      demo: true,
      fetchedAt: Date.now()
    };
  }

  function readCache(cityId) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + cityId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCache(cityId, obj) {
    try { localStorage.setItem(CACHE_PREFIX + cityId, JSON.stringify(obj)); } catch (e) { /* むし */ }
  }

  return {
    ymd: ymd,
    addDays: addDays,

    /* 天気を とってくる。とれなければ キャッシュ → おためし天気 の じゅんばん。 */
    load: function (city) {
      const cached = readCache(city.id);
      if (cached && !cached.demo && Date.now() - cached.fetchedAt < FRESH_MS &&
          cached.today === ymd(new Date())) {
        return Promise.resolve(cached);
      }
      const url = API + '?latitude=' + city.lat + '&longitude=' + city.lon + PARAMS;
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 9000));
      return Promise.race([fetch(url), timeout])
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(json => {
          const data = normalize(json, city);
          writeCache(city.id, data);
          return data;
        })
        .catch(() => {
          if (cached) { cached.stale = true; return cached; }
          return demoData(city);
        });
    },

    /* きょうの 天気の 「りゆう」カードを、じっさいの すうじから つくる */
    reasons: function (data) {
      const c = data.current;
      const out = [];
      const cloud = c.cloud, hum = c.humidity, hpa = c.pressure, wind = c.wind;

      out.push({
        emoji: '☁️', label: 'くもの りょう', value: Math.round(cloud) + '%',
        text: cloud < 25 ? 'そらの ほとんどが あおぞら。太陽が よく みえるね。'
            : cloud < 60 ? 'そらの はんぶんくらいが 雲。はれたり かげったり するよ。'
            : cloud < 90 ? 'そらの おおくが 雲。じめんが かげって すずしめ。'
            : 'そらは 雲で いっぱい。雨が いつ ふっても おかしくないよ。',
        level: cloud / 100
      });

      out.push({
        emoji: '💧', label: 'しめりけ', value: Math.round(hum) + '%',
        text: hum < 45 ? 'くうきは カラカラ。せんたくものが よく かわく日。'
            : hum < 70 ? 'ちょうどいい しめりけ。'
            : hum < 85 ? 'すこし ジメジメ。くうきが 水を たくさん もっているよ。'
            : 'くうきは もう 水で いっぱい。ちょっと ひえるだけで 雲や 雨に なる。',
        level: hum / 100
      });

      out.push({
        emoji: '📊', label: 'きあつ', value: Math.round(hpa) + 'hPa',
        text: hpa >= 1018 ? 'たかい（こうきあつ）。くうきが 上から しずんで、雲が できにくい＝はれやすい。'
            : hpa >= 1008 ? 'ふつうくらい。1013hPa が だいたい まんなかだよ。'
            : 'ひくい（ていきあつ）。くうきが 上に のぼって ひえるので、雲が できやすい＝雨に なりやすい。',
        level: Math.max(0, Math.min(1, (1030 - hpa) / 40))
      });

      out.push({
        emoji: '🍃', label: 'かぜの はやさ', value: Math.round(wind) + 'km/h',
        text: wind < 8 ? 'ほとんど かぜなし。はたが たれているよ。'
            : wind < 20 ? 'そよそよ。はっぱが ゆれるくらい。'
            : wind < 35 ? 'つよめ。かさが あおられるよ。'
            : 'とても つよい 風。ぼうしが とばされそう！',
        level: Math.max(0, Math.min(1, wind / 45))
      });

      out.push({
        emoji: '🌡️', label: 'いまの きおん', value: Math.round(c.temp * 10) / 10 + '℃',
        text: c.temp < 5 ? 'とても さむい。雨が 雪に かわるかも。'
            : c.temp < 15 ? 'ひんやり。上着が いるね。'
            : c.temp < 25 ? 'すごしやすい きおん。'
            : c.temp < 32 ? 'あつい。水を のもう。'
            : 'とても あつい！ 上に のぼる くうきが つよくて、ゆうだちに なりやすいよ。',
        level: Math.max(0, Math.min(1, (c.temp + 5) / 45))
      });

      return out;
    },

    /* すうじを つないで 「だから きょうは 〇〇」 の 1ぶんを つくる */
    story: function (data) {
      const c = data.current;
      const kind = wmoInfo(c.code).kind;
      const parts = [];
      if (c.pressure >= 1018) parts.push('きあつが たかくて くうきが しずんでいる');
      else if (c.pressure < 1008) parts.push('きあつが ひくくて くうきが 上に のぼっている');
      if (c.humidity >= 80) parts.push('くうきが 水を たくさん もっている');
      else if (c.humidity < 45) parts.push('くうきが かわいている');
      if (c.cloud >= 80) parts.push('雲が そらを おおっている');
      else if (c.cloud < 25) parts.push('雲が ほとんど ない');
      const why = parts.length === 0 ? ''
        : parts.length === 1 ? parts[0] + '。'
        : parts.slice(0, -1).join('、') + '、そして ' + parts[parts.length - 1] + '。';
      const end = kind === 'はれ' ? 'だから きょうは はれ ☀️'
                : kind === 'くもり' ? 'だから きょうは くもり ☁️'
                : kind === 'ゆき' ? 'だから きょうは 雪 ⛄'
                : kind === 'かみなり' ? 'だから きょうは かみなり ⛈️'
                : 'だから きょうは 雨 ☔';
      return why + end;
    }
  };
})();
