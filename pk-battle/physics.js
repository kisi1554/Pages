// PK たいけつ — ボールと キーパーの ぶつり（がめんに かんけい しない じゅんすいな けいさん）
// node でも ブラウザ でも うごく（ブラウザでは window.PKPhys）。
//
// ざひょう（めーとる）: ペナルティマーク が げんてん。
//   x … キッカー から みて みぎ が プラス、y … うえ、z … ゴールの ほう（ゴールライン は z = 11）
// ゴール: うちがわ の はば 7.32m・たかさ 2.44m。ポスト・バー は ふとさ 12cm。ボールの はんけい 11cm。
(function (root) {
  "use strict";
  const G = 9.8;
  const BALL_R = 0.11;
  const GOAL_Z = 11;
  const HALF_W = 3.66, BAR_H = 2.44, POST_R = 0.06;
  const POST_X = HALF_W + POST_R, BAR_Y = BAR_H + POST_R;
  const NET_D = 2.0;                 // ネットの おくゆき
  const KEEPER_Z = 10.75;            // キーパーは ゴールライン の すこし まえ
  const DT = 1 / 240;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // たねつき らんすう（mulberry32）
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    const u = Math.max(1e-9, r()), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ===== 9マス =====
  // マスの ばんごう: 0〜8。 ひだりうえ が 0、みぎした が 8（キッカー から みた むき）
  //   0 1 2
  //   3 4 5
  //   6 7 8
  const COL_X = [-2.55, 0, 2.55];
  const ROW_Y = [2.0, 1.22, 0.42];
  function cellCenter(i) { return { x: COL_X[i % 3], y: ROW_Y[Math.floor(i / 3)] }; }
  // ゴールの どこを とおったか → マス（ゴールの そとでも いちばん ちかい マス）
  function cellOf(x, y) {
    const c = x < -HALF_W / 3 ? 0 : x > HALF_W / 3 ? 2 : 1;
    const r = y > BAR_H * 2 / 3 ? 0 : y > BAR_H / 3 ? 1 : 2;
    return r * 3 + c;
  }

  // ===== シュート =====
  // shot = { tx, ty（ねらう ところ: ゴールライン での x・y）, power（0〜1.3。1 を こえると ふかしやすい）, curve（-1〜1） }
  // power → ボールの はやさ（14〜30 m/s）。つよすぎると うえに それる。curve → よこに まがる（さいごに ねらいより まがった ほうへ）
  function speedOf(power) { return 14 + 16 * clamp(power, 0, 1) + Math.max(0, power - 1) * 6; }
  function launch(shot) {
    const p = clamp(shot.power, 0.05, 1.4);
    const v = speedOf(p);
    // つよすぎ → うえに それる（ふかす）
    const lift = Math.max(0, p - 0.92) * 5.5;
    const tx = shot.tx + (shot.curve || 0) * 0.7;
    const ty = Math.max(BALL_R, shot.ty + lift);
    const T = GOAL_Z / (v * 0.985);
    const ax = (shot.curve || 0) * 7;            // まがる ちから（はじめは ぎゃくに ふくらんで、さいごに まがる）
    const vx = (tx - 0.5 * ax * T * T) / T;
    const vy = (ty - BALL_R + 0.5 * G * T * T) / T;
    return { pos: { x: 0, y: BALL_R, z: 0 }, vel: { x: vx, y: vy, z: GOAL_Z / T }, ax, T, speed: v };
  }

  // ===== キーパー =====
  // keeper = { size（からだの おおきさ 0.85〜1.1）, dive: { cell（0〜8 / null=うごかない）, t（けってから とびはじめる じかん。マイナス = けるまえ）}, catchSkill（0〜1） }
  // からだ は「あし → て」の カプセル（はんけい 0.22m）。とぶ むきに むかって まわりながら、からだの まんなか が うごく。
  const STAND_C = { x: 0, y: 0.95 };
  const DIVE_T = 0.4;            // とびきる までの じかん
  function diveTarget(cell) {
    // とぶ ところ（て が いく ところ）
    const c = cell % 3, r = Math.floor(cell / 3);
    return { x: [-2.9, 0, 2.9][c], y: [2.15, 1.25, 0.25][r] };
  }
  function keeperPlan(keeper) {
    const size = keeper.size || 1;
    const d = keeper.dive;
    const plan = { size, cell: d && d.cell != null ? d.cell : null, t0: d ? d.t : 0, ang: 0, dx: 0, dy: 0, handR: 0.95 * size, footR: 0.8 * size };
    if (plan.cell == null) return plan;
    const T = diveTarget(plan.cell);
    const vx = T.x - STAND_C.x, vy = T.y - STAND_C.y;
    if (plan.cell === 4) { plan.dy = 0.05; return plan; }          // まんなか: その ばで かまえる
    if (plan.cell === 1) { plan.dy = 0.55 * size; return plan; }   // まうえ: ジャンプ
    if (plan.cell === 7) { plan.dy = -0.35 * size; plan.crouch = true; return plan; } // ました: しゃがむ
    const dist = Math.hypot(vx, vy);
    const ux = vx / dist, uy = vy / dist;
    // からだ の まんなか が うごける きょり（よこ 2.05m、たて うえ 0.7 / した 0.75 の かどの まるい しかく）× からだ の おおきさ
    const ex = 2.05 * size, ey = (uy > 0 ? 0.7 : 0.75) * size;
    const lim = 1 / Math.pow(Math.pow(Math.abs(ux) / ex, 4) + Math.pow(Math.abs(uy) / ey, 4), 0.25);
    const m = Math.min(Math.max(0, dist - plan.handR * 0.8), lim);
    plan.dx = ux * m; plan.dy = uy * m;
    plan.ang = Math.atan2(ux, uy);                                 // まっすぐ うえ = 0、みぎ = +90°
    return plan;
  }
  const ease = (s) => (s <= 0 ? 0 : s >= 1 ? 1 : 1 - Math.pow(1 - s, 2.2));
  // とき t（けった しゅんかん = 0）の キーパーの かたち
  function keeperPose(plan, t) {
    const s = plan.cell == null ? 0 : ease((t - plan.t0) / DIVE_T);
    const ang = plan.ang * s;
    const c = { x: STAND_C.x + plan.dx * s, y: STAND_C.y * plan.size + plan.dy * s };
    const ux = Math.sin(ang), uy = Math.cos(ang);
    // かまえ（s=0）は りょううで を よこに ひろげる。とぶ ほど うで が あたまの うえへ
    const hand = { x: c.x + ux * plan.handR, y: c.y + uy * plan.handR };
    const foot = { x: c.x - ux * plan.footR, y: Math.max(0.05, c.y - uy * plan.footR) };
    const spread = (1 - s) * 0.75 * plan.size;            // かまえの とき の て の ひろがり
    return { s, ang, c, hand, foot, spread, crouch: !!plan.crouch && s > 0.3 };
  }
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy || 1e-9;
    const u = clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
    const qx = ax + vx * u, qy = ay + vy * u;
    return { d: Math.hypot(px - qx, py - qy), u, qx, qy };
  }
  // ボール (x,y) が キーパーに あたるか。あたれば { part: "hand"|"body", nx, ny, u }
  function keeperHit(pose, x, y, size) {
    const BODY_R = 0.22 * (size || 1), HAND_R = 0.16 * (size || 1);
    const r = BALL_R;
    const sd = segDist(x, y, pose.foot.x, pose.foot.y, pose.hand.x, pose.hand.y);
    if (sd.d < BODY_R + r) {
      const nx = (x - sd.qx) / (sd.d || 1), ny = (y - sd.qy) / (sd.d || 1);
      return { part: sd.u > 0.72 ? "hand" : "body", nx, ny, u: sd.u };
    }
    // かまえ の とき の よこに ひろげた て
    if (pose.spread > 0.05) {
      const sy = pose.c.y + 0.35 * (size || 1);
      for (const side of [-1, 1]) {
        const hx = pose.c.x + side * pose.spread, d = Math.hypot(x - hx, y - sy);
        const arm = segDist(x, y, pose.c.x, sy, hx, sy);
        if (d < HAND_R + r || arm.d < 0.09 + r) {
          const nx = (x - arm.qx) / (arm.d || 1), ny = (y - arm.qy) / (arm.d || 1);
          return { part: "hand", nx, ny, u: 1 };
        }
      }
    }
    const hd = Math.hypot(x - pose.hand.x, y - pose.hand.y);
    if (hd < HAND_R + r) return { part: "hand", nx: (x - pose.hand.x) / (hd || 1), ny: (y - pose.hand.y) / (hd || 1), u: 1 };
    return null;
  }

  // ===== 1本の シュートを すすめる =====
  // createShot(shot, keeper, seed) → sim。 stepShot(sim, dt) を くりかえす。 sim.done に なったら sim.result を みる。
  // keeper.dive は とちゅうで かえて よい（にんげんの キーパーは ボールが とんでから とぶ ことも ある）。
  function createShot(shot, keeper, seed) {
    const L = launch(shot);
    const r = rng(seed || 1);
    // つよい シュートほど すこし ぶれる（にんげんの スワイプにも のる）
    const sd = shot.noScatter ? 0 : 0.06 + Math.max(0, shot.power - 0.85) * 0.5;
    if (sd) { L.vel.x += gauss(r) * sd / L.T; L.vel.y += gauss(r) * sd * 0.7 / L.T; }
    return {
      shot, keeper, t: 0, pos: L.pos, vel: L.vel, ax: L.ax, spin: (shot.curve || 0),
      plan: keeperPlan(keeper), events: [], done: false, result: null, touched: false, posted: false,
      net: null, cross: null, rest: 0, lastHit: -1, r,
    };
  }
  function ev(sim, type, extra) { sim.events.push(Object.assign({ type, t: sim.t, x: sim.pos.x, y: sim.pos.y, z: sim.pos.z }, extra || {})); }
  function finish(sim, kind) {
    sim.done = true;
    const goal = kind === "goal";
    sim.result = {
      kind, goal,
      // くわしい なまえ: goal / goal_post（ポストに あたって はいる）/ goal_touch（キーパーが さわったけど はいる）
      //   catch / parry（はじく）/ post（ポスト・バーに あたって はずれ）/ over（うえ）/ wide（よこ）
      detail: goal ? (sim.posted ? "goal_post" : sim.touched ? "goal_touch" : "goal")
        : kind === "save" ? (sim.caught ? "catch" : "parry")
        : sim.posted ? (sim.touched ? "parry" : "post") : sim.touched ? "parry" : kind,
      cross: sim.cross,                // ゴールラインを とおった ところ（または いちばん ちかづいた ところ）
      cell: sim.cross ? cellOf(sim.cross.x, sim.cross.y) : cellOf(sim.shot.tx, sim.shot.ty),
      touched: sim.touched, posted: sim.posted, t: sim.t,
    };
    if (sim.result.detail === "parry" || sim.result.detail === "catch") sim.result.kind = "save";
  }
  function stepOnce(sim, dt) {
    const p = sim.pos, v = sim.vel;
    if (sim.caught) { sim.t += dt; sim.rest += dt; if (sim.rest > 0.6) finish(sim, "save"); return; }
    if (sim.netted) {
      // ネットに つつまれて おちる
      sim.t += dt; sim.rest += dt;
      v.x *= 0.9; v.z *= 0.85; v.y -= G * dt;
      p.x += v.x * dt; p.y = Math.max(BALL_R, p.y + v.y * dt); p.z = Math.min(GOAL_Z + NET_D - BALL_R, p.z + v.z * dt);
      if (sim.rest > 0.9) finish(sim, "goal");
      return;
    }
    const prevZ = p.z;
    // うごく
    const ax = sim.t < 0.9 && !sim.touched && !sim.posted ? sim.ax : 0;
    v.x += ax * dt; v.y -= G * dt;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    sim.t += dt;
    // じめんで はねる
    if (p.y < BALL_R) { p.y = BALL_R; if (v.y < 0) v.y = -v.y * 0.55; v.x *= 0.92; v.z *= 0.92; }
    // キーパー
    if (!sim.touched && Math.abs(p.z - KEEPER_Z) < 0.32 && v.z > 0) {
      const pose = keeperPose(sim.plan, sim.t);
      const hit = keeperHit(pose, p.x, p.y, sim.plan.size);
      if (hit) {
        sim.touched = true;
        const sp = Math.hypot(v.x, v.y, v.z);
        const skill = sim.keeper.catchSkill == null ? 0.5 : sim.keeper.catchSkill;
        // からだの ちかくに きた ボール・て に しっかり きた ゆるい ボールは キャッチ
        const pCatch = hit.part === "body" ? (sp < 29 ? 0.45 + skill * 0.45 : 0.15)
          : sp < 21 + skill * 6 && Math.abs(hit.nx) < 0.8 ? 0.2 + skill * 0.4 : 0;
        if (sim.r() < pCatch) {
          sim.caught = true; v.x = v.y = v.z = 0; ev(sim, "catch");
          sim.cross = { x: p.x, y: p.y }; return;
        }
        // はじく: ゆびさき（て の さき・よこから）なら いきおいが のこって はいる ことも
        const glance = hit.part === "hand" && pose.s > 0.5 && Math.abs(hit.nx) > 0.6 && sim.r() < 0.35;
        const push = 3 + sim.r() * 4;
        v.x = v.x * 0.5 + hit.nx * push;
        v.y = Math.abs(v.y) * 0.4 + hit.ny * push * 0.8 + 1.5;
        v.z = glance ? v.z * 0.55 : -v.z * (0.2 + sim.r() * 0.2);
        ev(sim, glance ? "tip" : "parry", { part: hit.part });
        sim.cross = sim.cross || { x: p.x, y: p.y };
      }
    }
    // ポスト・バー（ゴールライン ちかく）
    if (Math.abs(p.z - GOAL_Z) < 0.4 && sim.t - sim.lastHit > 0.05) {
      for (const sx of [-1, 1]) {
        const dx = p.x - sx * POST_X, dz = p.z - GOAL_Z, d = Math.hypot(dx, dz);
        if (d < POST_R + BALL_R && p.y < BAR_Y) {
          const nx = dx / d, nz = dz / d, vn = v.x * nx + v.z * nz;
          if (vn < 0) { v.x -= 1.65 * vn * nx; v.z -= 1.65 * vn * nz; v.y *= 0.85; }
          p.x = sx * POST_X + nx * (POST_R + BALL_R + 0.001); p.z = GOAL_Z + nz * (POST_R + BALL_R + 0.001);
          sim.posted = true; sim.lastHit = sim.t; ev(sim, "post", { side: sx });
        }
      }
      const dy = p.y - BAR_Y, dz = p.z - GOAL_Z, d = Math.hypot(dy, dz);
      if (d < POST_R + BALL_R && Math.abs(p.x) < POST_X) {
        const ny = dy / d, nz = dz / d, vn = v.y * ny + v.z * nz;
        if (vn < 0) { v.y -= 1.65 * vn * ny; v.z -= 1.65 * vn * nz; v.x *= 0.85; }
        p.y = BAR_Y + ny * (POST_R + BALL_R + 0.001); p.z = GOAL_Z + nz * (POST_R + BALL_R + 0.001);
        sim.posted = true; sim.lastHit = sim.t; ev(sim, "bar");
      }
    }
    // ゴールラインを こえた？（ボール ぜんぶが ラインを こえたら）
    if (prevZ < GOAL_Z + BALL_R && p.z >= GOAL_Z + BALL_R) {
      const f = (GOAL_Z + BALL_R - prevZ) / ((p.z - prevZ) || 1e-9);
      const cx = p.x - v.x * dt * (1 - f), cy = p.y - v.y * dt * (1 - f);
      if (!sim.touched || !sim.cross) sim.cross = { x: cx, y: cy };
      if (Math.abs(cx) < HALF_W && cy < BAR_H) {
        sim.netted = true; sim.net = { x: cx, y: cy, t: sim.t }; ev(sim, "goal");
        sim.cross = { x: cx, y: cy };
        return;
      }
      sim.cross = { x: cx, y: cy };
      finish(sim, cy >= BAR_H && Math.abs(cx) < HALF_W + 0.6 ? "over" : Math.abs(cx) >= HALF_W ? "wide" : "over");
      return;
    }
    // はねかえって もどって きた・とまった・じかん ぎれ
    if ((v.z < 0 && p.z < GOAL_Z - 0.5) || sim.t > 4 || (Math.hypot(v.x, v.z) < 0.3 && p.y <= BALL_R + 0.01)) {
      if (!sim.cross) sim.cross = { x: p.x, y: p.y };
      finish(sim, sim.touched ? "save" : sim.posted ? "post" : "wide");
    }
  }
  function stepShot(sim, dt) {
    let left = dt;
    while (left > 1e-9 && !sim.done) { const h = Math.min(DT, left); stepOnce(sim, h); left -= h; }
    return sim;
  }
  // さいごまで いっきに（シミュレーション・テスト よう）
  function runShot(shot, keeper, seed) {
    const sim = createShot(shot, keeper, seed);
    while (!sim.done) stepOnce(sim, DT);
    return sim.result;
  }
  // ボールが キーパーの ところ（z = KEEPER_Z）に つく じかんの めやす
  function arriveTime(shot) { const L = launch(shot); return KEEPER_Z / L.vel.z; }

  const api = {
    G, BALL_R, GOAL_Z, HALF_W, BAR_H, POST_R, POST_X, BAR_Y, NET_D, KEEPER_Z, DIVE_T, STAND_C,
    clamp, rng, gauss, COL_X, ROW_Y, cellCenter, cellOf, speedOf, launch, diveTarget, keeperPlan, keeperPose, keeperHit,
    createShot, stepShot, runShot, arriveTime,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PKPhys = api;
})(this);
