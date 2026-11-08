'use strict';

/*
 * うちゅう せんそう の しくみ（DOM なし。tools/uchu-sensou/test.js で ためせる）
 *
 *   const st = Sim.create(sectorIndex, { players: 1|2, mode: 'easy'|'normal', seed })
 *   Sim.step(st, dt, inputs)   inputs[i] = { x, y, bomb }（x・y は -1〜1 の スティック）
 *   st.events                  おと・えんしゅつ よう（app が よんで から からっぽ に する）
 *   Sim.buy(st, id) / Sim.leaveShop(st)
 *
 * - たま は わくせい の じゅうりょく で まがる。プレイヤー・てき も すこし ひっぱられる。
 * - プレイヤーの たま は じどうで いちばん ちかい てき へ。
 * - やさしい: ぼくらの ほし の バリア は 1 より へらない（まけ なし）。ふつう: 0 で まけ。
 */
const Sim = (() => {
  const G = 1e6;
  const PLAYER = { speed: 330, hp: 5, r: 16, range: 560 };
  const FIRE_CD = [0.26, 0.2, 0.15, 0.11];
  const SPREAD = [1, 3, 5];
  const BULLET = { speed: 680, life: 1.4, r: 5 };
  const BASE_MAX = 100;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

  function create(sectorIndex, opts) {
    const o = opts || {};
    const sec = DATA.SECTORS[sectorIndex];
    const n = o.players === 2 ? 2 : 1;
    const players = [];
    for (let i = 0; i < n; i += 1) {
      players.push({
        id: i, x: n === 1 ? 0 : -70 + i * 140, y: -170, vx: 0, vy: 0, ang: -Math.PI / 2,
        hp: PLAYER.hp, max: PLAYER.hp, inv: 2, cd: 0, alive: true, respawn: 0,
        bombs: 2, allies: 0, allyCd: 0, bombHeld: false,
      });
    }
    const planets = sec.planets.map((p) => Object.assign({}, p));
    const home = planets.find((p) => p.home);
    return {
      sector: sectorIndex, sec, mode: o.mode === 'normal' ? 'normal' : 'easy',
      rnd: rng(o.seed || 7), t: 0, R: sec.R,
      planets, rocks: (sec.rocks || []).map((r) => Object.assign({}, r)),
      base: { x: home.x, y: home.y, r: home.r, hp: BASE_MAX, max: BASE_MAX, turrets: 0, tcd: 0 },
      players, up: { rapid: 0, spread: 0 }, bought: {},
      enemies: [], bullets: [], ebullets: [], pickups: [],
      events: [], waveIdx: -1, phase: 'intro', timer: 2.5, queue: [], waveT: 0,
      stars: 0, score: 0, kills: 0, total: sec.waves.length,
    };
  }

  function ev(st, type, x, y, extra) {
    st.events.push(Object.assign({ type, x: x || 0, y: y || 0 }, extra || {}));
  }

  /* ---------------- じゅうりょく ---------------- */
  function gravity(st, x, y) {
    let ax = 0;
    let ay = 0;
    for (const p of st.planets) {
      if (!p.mass) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const d2 = Math.max(dx * dx + dy * dy, p.r * p.r);
      const d = Math.sqrt(d2);
      const a = (G * p.mass) / d2;
      ax += (dx / d) * a;
      ay += (dy / d) * a;
    }
    return [ax, ay];
  }

  // わくせい・いわ の なか に いたら そとへ おしだす。ぶつかった もの を かえす
  function pushOut(st, o, r) {
    let hit = null;
    for (const p of st.planets.concat(st.rocks)) {
      const min = p.r + r;
      const d2 = dist2(o.x, o.y, p.x, p.y);
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1;
        const nx = (o.x - p.x) / d;
        const ny = (o.y - p.y) / d;
        o.x = p.x + nx * min;
        o.y = p.y + ny * min;
        const vn = o.vx * nx + o.vy * ny;
        if (vn < 0) {
          o.vx -= vn * nx;
          o.vy -= vn * ny;
        }
        hit = p;
      }
    }
    return hit;
  }

  function insideSolid(st, x, y, r) {
    for (const p of st.planets.concat(st.rocks)) {
      const min = p.r + r;
      if (dist2(x, y, p.x, p.y) < min * min) return p;
    }
    return null;
  }

  /* ---------------- ウェーブ ---------------- */
  function nextWave(st) {
    st.waveIdx += 1;
    st.queue = [];
    st.sec.waves[st.waveIdx].forEach(([type, n, gap, start]) => {
      for (let i = 0; i < n; i += 1) st.queue.push({ type, at: start + i * gap });
    });
    st.queue.sort((a, b) => a.at - b.at);
    st.waveT = 0;
    st.phase = 'wave';
    const boss = st.queue.some((q) => DATA.ENEMIES[q.type].kind === 'boss');
    ev(st, 'wave', 0, 0, { n: st.waveIdx + 1, boss });
  }

  function spawn(st, type, x, y) {
    const d = DATA.ENEMIES[type];
    let px = x;
    let py = y;
    if (px === undefined) {
      for (let k = 0; k < 10; k += 1) {
        const a = st.rnd() * Math.PI * 2;
        px = Math.cos(a) * (st.R - 40);
        py = Math.sin(a) * (st.R - 40);
        if (!insideSolid(st, px, py, d.r + 10)) break;
      }
    }
    const e = {
      type, def: d, x: px, y: py, vx: 0, vy: 0, hp: d.hp, r: d.r,
      fcd: d.fire ? d.fire.every * (0.5 + st.rnd() * 0.5) : 0,
      scd: d.spawn ? d.spawn.every : 0, ang: Math.atan2(-py, -px), spin: st.rnd() < 0.5 ? 1 : -1,
      orbitR: (d.orbitR || 0) + (st.rnd() - 0.5) * 80, flash: 0,
    };
    st.enemies.push(e);
    if (d.kind === 'boss') ev(st, 'bossIn', px, py);
    return e;
  }

  /* ---------------- プレイヤー ---------------- */
  function nearestEnemy(st, x, y, range) {
    let best = null;
    let bd = range * range;
    for (const e of st.enemies) {
      const d = dist2(x, y, e.x, e.y) - e.r * e.r;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function nearestPlayer(st, x, y) {
    let best = null;
    let bd = Infinity;
    for (const p of st.players) {
      if (!p.alive) continue;
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  // うごく あいて の さき を ねらう（じゅうりょく は かんがえない）
  function lead(x, y, e, speed) {
    const dx = e.x - x;
    const dy = e.y - y;
    const a = e.vx * e.vx + e.vy * e.vy - speed * speed;
    const b = 2 * (dx * e.vx + dy * e.vy);
    const c = dx * dx + dy * dy;
    const disc = b * b - 4 * a * c;
    let t = 0;
    if (Math.abs(a) > 1e-6 && disc >= 0) {
      const r = Math.sqrt(disc);
      const t1 = (-b - r) / (2 * a);
      const t2 = (-b + r) / (2 * a);
      t = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);
      if (!Number.isFinite(t)) t = 0;
    }
    t = Math.min(t, 1.2);
    return [e.x + e.vx * t, e.y + e.vy * t];
  }

  function shoot(st, x, y, tx, ty, opt) {
    const base = Math.atan2(ty - y, tx - x);
    const n = opt.n || 1;
    const step = opt.step || 0.17;
    for (let i = 0; i < n; i += 1) {
      const a = base + (i - (n - 1) / 2) * step;
      const b = { x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: Math.cos(a) * opt.speed, vy: Math.sin(a) * opt.speed, life: opt.life || BULLET.life, dmg: opt.dmg || 1, r: opt.r || BULLET.r, ally: !!opt.ally };
      (opt.enemy ? st.ebullets : st.bullets).push(b);
    }
  }

  function updatePlayer(st, p, inp, dt) {
    const input = inp || { x: 0, y: 0, bomb: false };
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        p.alive = true;
        p.hp = p.max;
        p.inv = 2.5;
        p.x = st.base.x + (p.id === 0 ? -40 : 40);
        p.y = st.base.y - st.base.r - 70;
        p.vx = 0;
        p.vy = 0;
        ev(st, 'respawn', p.x, p.y, { who: p.id });
      }
      return;
    }
    p.inv = Math.max(0, p.inv - dt);
    let ix = Math.max(-1, Math.min(1, input.x || 0));
    let iy = Math.max(-1, Math.min(1, input.y || 0));
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const k = Math.min(1, 4 * dt);
    p.vx += (ix * PLAYER.speed - p.vx) * k;
    p.vy += (iy * PLAYER.speed - p.vy) * k;
    const [gx, gy] = gravity(st, p.x, p.y);
    p.vx += gx * 0.25 * dt;
    p.vy += gy * 0.25 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (Math.hypot(p.vx, p.vy) > 30) p.ang = Math.atan2(p.vy, p.vx);
    // うちゅう の はし
    const d = Math.hypot(p.x, p.y);
    if (d > st.R) {
      p.x *= st.R / d;
      p.y *= st.R / d;
      const vn = (p.vx * p.x + p.vy * p.y) / st.R;
      if (vn > 0) {
        p.vx -= (vn * p.x) / st.R;
        p.vy -= (vn * p.y) / st.R;
      }
    }
    const hit = pushOut(st, p, PLAYER.r);
    if (hit && hit.bh) {
      // ブラックホール に すいこまれたら ぼくらの ほし へ ワープ
      ev(st, 'warp', p.x, p.y, { who: p.id });
      p.x = st.base.x;
      p.y = st.base.y - st.base.r - 70;
      p.vx = 0;
      p.vy = 0;
      p.inv = 2;
    }
    // じどう で うつ
    p.cd -= dt;
    const target = nearestEnemy(st, p.x, p.y, PLAYER.range);
    if (target && p.cd <= 0) {
      const [ax, ay] = lead(p.x, p.y, target, BULLET.speed);
      shoot(st, p.x, p.y, ax, ay, { n: SPREAD[st.up.spread], speed: BULLET.speed });
      p.cd = FIRE_CD[st.up.rapid];
      ev(st, 'shot', p.x, p.y, { who: p.id });
    }
    // なかま メカ
    if (p.allies > 0) {
      p.allyCd -= dt;
      if (p.allyCd <= 0) {
        p.allyCd = 0.45;
        for (let i = 0; i < p.allies; i += 1) {
          const a = st.t * 2 + (i * Math.PI * 2) / p.allies;
          const ax = p.x + Math.cos(a) * 52;
          const ay = p.y + Math.sin(a) * 52;
          const t = nearestEnemy(st, ax, ay, 500);
          if (t) {
            const [lx, ly] = lead(ax, ay, t, 600);
            shoot(st, ax, ay, lx, ly, { speed: 600, dmg: 0.6, r: 4, ally: true });
          }
        }
      }
    }
    // スターボム（おした しゅんかん だけ）
    if (input.bomb && !p.bombHeld && p.bombs > 0) {
      p.bombs -= 1;
      bomb(st, p.x, p.y);
    }
    p.bombHeld = !!input.bomb;
  }

  function bomb(st, x, y) {
    ev(st, 'bomb', x, y);
    st.ebullets = [];
    for (const e of st.enemies) {
      if (dist2(x, y, e.x, e.y) < 540 * 540) damage(st, e, 8);
    }
  }

  function hurtPlayer(st, p) {
    if (p.inv > 0 || !p.alive) return;
    p.hp -= 1;
    p.inv = 1.2;
    ev(st, 'hurt', p.x, p.y, { who: p.id });
    if (p.hp <= 0) {
      p.alive = false;
      p.respawn = 3;
      ev(st, 'down', p.x, p.y, { who: p.id });
    }
  }

  function hurtBase(st, n) {
    const b = st.base;
    b.hp -= n * (st.mode === 'easy' ? 0.5 : 0.8);
    if (st.mode === 'easy') b.hp = Math.max(1, b.hp);
    ev(st, 'basehit', b.x, b.y);
    if (b.hp <= 0 && st.phase !== 'lose') {
      b.hp = 0;
      st.phase = 'lose';
      ev(st, 'lose');
    }
  }

  /* ---------------- てき ---------------- */
  function damage(st, e, n) {
    if (e.hp <= 0) return;
    e.hp -= n;
    e.flash = 0.1;
    if (e.hp <= 0) {
      st.score += e.def.score;
      st.kills += 1;
      ev(st, 'boom', e.x, e.y, { size: e.r, boss: e.def.kind === 'boss' });
      for (let i = 0; i < e.def.drop; i += 1) {
        const a = st.rnd() * Math.PI * 2;
        const s = 60 + st.rnd() * 120;
        st.pickups.push({ kind: 'star', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14 });
      }
      const r = st.rnd();
      if (r < 0.06 && st.players.some((p) => p.allies < 3)) st.pickups.push({ kind: 'ally', x: e.x, y: e.y, vx: 0, vy: 0, life: 14 });
      else if (r < 0.12 && st.players.some((p) => p.hp < p.max)) st.pickups.push({ kind: 'heart', x: e.x, y: e.y, vx: 0, vy: 0, life: 14 });
    } else {
      ev(st, 'hit', e.x, e.y);
    }
  }

  function updateEnemy(st, e, dt) {
    const d = e.def;
    const b = st.base;
    e.flash = Math.max(0, e.flash - dt);
    let tx = b.x;
    let ty = b.y;
    const pl = nearestPlayer(st, e.x, e.y);
    let speed = d.speed;
    if (d.kind === 'shield' && pl) {
      tx = pl.x;
      ty = pl.y;
    }
    let dx = tx - e.x;
    let dy = ty - e.y;
    let dd = Math.hypot(dx, dy) || 1;
    let wx = dx / dd;
    let wy = dy / dd;
    if (d.kind === 'orbit' || d.kind === 'boss') {
      // ほし の まわり を まわる（ちかすぎ・とおすぎ を なおしながら よこへ）
      const want = e.orbitR;
      const radial = (dd - want) / 120;
      wx = (dx / dd) * Math.max(-1, Math.min(1, radial)) + (-dy / dd) * e.spin;
      wy = (dy / dd) * Math.max(-1, Math.min(1, radial)) + (dx / dd) * e.spin;
      const l = Math.hypot(wx, wy) || 1;
      wx /= l;
      wy /= l;
    } else if (d.kind === 'spread' && pl) {
      dx = pl.x - e.x;
      dy = pl.y - e.y;
      dd = Math.hypot(dx, dy) || 1;
      const radial = (dd - d.keep) / 100;
      wx = (dx / dd) * Math.max(-1, Math.min(1, radial)) + (-dy / dd) * e.spin * 0.6;
      wy = (dy / dd) * Math.max(-1, Math.min(1, radial)) + (dx / dd) * e.spin * 0.6;
      const l = Math.hypot(wx, wy) || 1;
      wx /= l;
      wy /= l;
    }
    const k = Math.min(1, 2 * dt);
    e.vx += (wx * speed - e.vx) * k;
    e.vy += (wy * speed - e.vy) * k;
    const [gx, gy] = gravity(st, e.x, e.y);
    e.vx += gx * 0.12 * dt;
    e.vy += gy * 0.12 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (d.kind === 'shield') e.ang = Math.atan2(ty - e.y, tx - e.x);
    else if (Math.hypot(e.vx, e.vy) > 5) e.ang = Math.atan2(e.vy, e.vx);

    // ほし に ぶつかる
    if ((d.kind === 'rush' || d.kind === 'shield') && dist2(e.x, e.y, b.x, b.y) < (b.r + e.r) * (b.r + e.r)) {
      hurtBase(st, d.dmg);
      e.hp = 0;
      ev(st, 'boom', e.x, e.y, { size: e.r });
      return;
    }
    const hit = pushOut(st, e, e.r);
    if (hit && hit.bh && d.kind !== 'boss') {
      e.hp = 0;
      ev(st, 'warp', e.x, e.y);
      return;
    }
    // プレイヤー に ぶつかる
    for (const p of st.players) {
      if (!p.alive) continue;
      const min = PLAYER.r + e.r;
      if (dist2(p.x, p.y, e.x, e.y) < min * min) {
        hurtPlayer(st, p);
        if (d.kind !== 'boss') damage(st, e, 3);
        const l = Math.hypot(p.x - e.x, p.y - e.y) || 1;
        p.vx += ((p.x - e.x) / l) * 260;
        p.vy += ((p.y - e.y) / l) * 260;
      }
    }
    // うつ
    if (d.fire) {
      e.fcd -= dt;
      if (e.fcd <= 0) {
        e.fcd = d.fire.every;
        const f = d.fire;
        const sp = f.speed * (st.mode === 'easy' ? 0.75 : 1);
        if (f.ring) {
          for (let i = 0; i < f.n; i += 1) {
            const a = (i / f.n) * Math.PI * 2 + st.t;
            shoot(st, e.x, e.y, e.x + Math.cos(a), e.y + Math.sin(a), { speed: sp, enemy: true, life: 4, r: 7 });
          }
          ev(st, 'eshot', e.x, e.y, { big: true });
        } else {
          const t = f.at === 'player' && pl ? pl : b;
          if (dist2(e.x, e.y, t.x, t.y) < 760 * 760) {
            shoot(st, e.x, e.y, t.x, t.y, { n: f.n, step: f.spread, speed: sp, enemy: true, life: 4, r: 7 });
            ev(st, 'eshot', e.x, e.y);
          }
        }
      }
    }
    // ボス は ザコ を よぶ
    if (d.spawn) {
      e.scd -= dt;
      if (e.scd <= 0) {
        e.scd = d.spawn.every;
        for (let i = 0; i < d.spawn.n; i += 1) {
          const a = (i / d.spawn.n) * Math.PI * 2;
          spawn(st, d.spawn.type, e.x + Math.cos(a) * (e.r + 30), e.y + Math.sin(a) * (e.r + 30));
        }
      }
    }
  }

  /* ---------------- たま ---------------- */
  function moveBullet(st, b, dt) {
    const [gx, gy] = gravity(st, b.x, b.y);
    b.vx += gx * dt;
    b.vy += gy * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const hit = insideSolid(st, b.x, b.y, b.r);
    if (hit) {
      ev(st, 'spark', b.x, b.y);
      b.life = 0;
    }
    if (b.x * b.x + b.y * b.y > (st.R + 100) * (st.R + 100)) b.life = 0;
    return hit;
  }

  function blocked(e, b) {
    if (e.def.kind !== 'shield') return false;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    // たま が てき の まえ から くる（たま の むき と てき の むき が はんたい）なら たて で はじく
    const dot = (b.vx / sp) * Math.cos(e.ang) + (b.vy / sp) * Math.sin(e.ang);
    return dot < -0.5;
  }

  function updateBullets(st, dt) {
    for (const b of st.bullets) {
      moveBullet(st, b, dt);
      if (b.life <= 0) continue;
      for (const e of st.enemies) {
        if (e.hp <= 0) continue;
        const min = e.r + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < min * min) {
          b.life = 0;
          if (blocked(e, b)) ev(st, 'clink', b.x, b.y);
          else damage(st, e, b.dmg);
          break;
        }
      }
    }
    for (const b of st.ebullets) {
      const hit = moveBullet(st, b, dt);
      if (hit && hit.home) hurtBase(st, 2); // ぼくらの ほし の バリア に あたった
      if (b.life <= 0) continue;
      for (const p of st.players) {
        if (!p.alive) continue;
        const min = PLAYER.r * 0.7 + b.r;
        if (dist2(b.x, b.y, p.x, p.y) < min * min) {
          b.life = 0;
          hurtPlayer(st, p);
          break;
        }
      }
    }
    st.bullets = st.bullets.filter((b) => b.life > 0);
    st.ebullets = st.ebullets.filter((b) => b.life > 0);
  }

  function updatePickups(st, dt) {
    for (const k of st.pickups) {
      k.life -= dt;
      const p = nearestPlayer(st, k.x, k.y);
      if (p) {
        const dx = p.x - k.x;
        const dy = p.y - k.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 230) {
          k.vx += (dx / d) * 1400 * dt;
          k.vy += (dy / d) * 1400 * dt;
        }
        if (d < 28) {
          k.life = 0;
          if (k.kind === 'star') {
            st.stars += 1;
            st.score += 5;
          } else if (k.kind === 'ally') {
            const who = st.players.filter((q) => q.allies < 3).sort((a, b) => a.allies - b.allies)[0];
            if (who) who.allies += 1;
          } else if (k.kind === 'heart') {
            p.hp = Math.min(p.max, p.hp + 2);
          }
          ev(st, 'pickup', k.x, k.y, { kind: k.kind });
          continue;
        }
      }
      k.vx *= 1 - Math.min(1, 2.5 * dt);
      k.vy *= 1 - Math.min(1, 2.5 * dt);
      k.x += k.vx * dt;
      k.y += k.vy * dt;
    }
    st.pickups = st.pickups.filter((k) => k.life > 0);
  }

  function updateBase(st, dt) {
    const b = st.base;
    if (!b.turrets) return;
    b.tcd -= dt;
    if (b.tcd > 0) return;
    b.tcd = 0.7 / b.turrets;
    const t = nearestEnemy(st, b.x, b.y, 640);
    if (t) {
      const a = Math.atan2(t.y - b.y, t.x - b.x);
      const sx = b.x + Math.cos(a) * (b.r + 6);
      const sy = b.y + Math.sin(a) * (b.r + 6);
      const [lx, ly] = lead(sx, sy, t, 620);
      shoot(st, sx, sy, lx, ly, { speed: 620, dmg: 1, r: 5, ally: true });
    }
  }

  function world(st, dt, inputs) {
    st.players.forEach((p, i) => updatePlayer(st, p, inputs && inputs[i], dt));
    for (const e of st.enemies) if (e.hp > 0) updateEnemy(st, e, dt);
    st.enemies = st.enemies.filter((e) => e.hp > 0);
    updateBullets(st, dt);
    st.enemies = st.enemies.filter((e) => e.hp > 0);
    updatePickups(st, dt);
    updateBase(st, dt);
  }

  function step(st, dt, inputs) {
    if (st.phase === 'shop' || st.phase === 'clear' || st.phase === 'lose' || st.phase === 'pause') return;
    st.t += dt;
    if (st.phase === 'intro' || st.phase === 'break') {
      world(st, dt, inputs);
      st.timer -= dt;
      if (st.timer <= 0) nextWave(st);
      return;
    }
    if (st.phase === 'wave') {
      st.waveT += dt;
      while (st.queue.length && st.queue[0].at <= st.waveT) spawn(st, st.queue.shift().type);
      world(st, dt, inputs);
      if (st.phase !== 'wave') return;
      if (!st.queue.length && !st.enemies.length) {
        st.ebullets = [];
        st.base.hp = Math.min(st.base.max, st.base.hp + 8); // ウェーブ を まもりきったら バリア が すこし もどる
        if (st.waveIdx >= st.total - 1) {
          st.phase = 'clear';
          // のこった スターかけら は あつめた こと に する
          st.stars += st.pickups.filter((k) => k.kind === 'star').length;
          st.pickups = [];
          ev(st, 'clear');
        } else if (st.waveIdx === 2 || st.waveIdx === 5) {
          st.phase = 'shop';
          ev(st, 'shop');
        } else {
          st.phase = 'break';
          st.timer = 3;
          ev(st, 'waveClear', 0, 0, { n: st.waveIdx + 1 });
        }
      }
    }
  }

  /* ---------------- ショップ ---------------- */
  function level(st, id) {
    if (id === 'rapid') return st.up.rapid;
    if (id === 'spread') return st.up.spread;
    return st.bought[id] || 0;
  }
  function price(st, id) {
    const item = DATA.SHOP.find((s) => s.id === id);
    const lv = level(st, id);
    if (id === 'ally' && st.players.every((p) => p.allies >= 3)) return null;
    if (id === 'repair' && st.base.hp >= st.base.max) return null;
    return lv < item.cost.length ? item.cost[lv] : null;
  }
  function buy(st, id) {
    const c = price(st, id);
    if (c === null || st.stars < c) return false;
    st.stars -= c;
    if (id === 'rapid') st.up.rapid += 1;
    else if (id === 'spread') st.up.spread += 1;
    else {
      st.bought[id] = (st.bought[id] || 0) + 1;
      if (id === 'ally') st.players.forEach((p) => { p.allies = Math.min(3, p.allies + 1); });
      if (id === 'bomb') st.players.forEach((p) => { p.bombs += 1; });
      if (id === 'repair') st.base.hp = Math.min(st.base.max, st.base.hp + 30);
      if (id === 'turret') st.base.turrets += 1;
    }
    ev(st, 'buy', 0, 0, { id });
    return true;
  }
  function leaveShop(st) {
    if (st.phase !== 'shop') return;
    st.phase = 'break';
    st.timer = 1.5;
  }

  function rating(st) {
    const r = st.base.hp / st.base.max;
    return r > 0.7 ? 3 : r > 0.35 ? 2 : 1;
  }

  return { G, PLAYER, BASE_MAX, create, step, buy, price, level, leaveShop, rating, gravity, spawn, bomb, nextWave, rng };
})();

if (typeof module !== 'undefined') module.exports = Sim;
