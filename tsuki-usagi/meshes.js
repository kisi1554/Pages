'use strict';
// かたち（メッシュ）を つくる。gl.js の Builder を つかう

// ばしょ・おおきさ・かいてん から 行列を つくる（Y → X → Z の じゅん）
function TM(x, y, z, sx, sy, sz, ry, rx, rz) {
  const m = M4.ident(); M4.translate(m, x, y, z);
  if (ry) M4.rotY(m, ry); if (rx) M4.rotX(m, rx); if (rz) M4.rotZ(m, rz);
  M4.scale(m, sx, sy, sz); return m;
}
// ローカルの Y じくを dir に むける（ぼう・ビーム よう）
function orientY(p, dir, sx, sy, sz) {
  const U = V3.norm(dir);
  let Rr = V3.cross(U, [0, 1, 0]);
  if (V3.len(Rr) < 1e-3) Rr = V3.cross(U, [1, 0, 0]);
  Rr = V3.norm(Rr);
  const F = V3.cross(Rr, U);
  return M4.scale(M4.frame(Rr, U, F, p), sx, sy, sz);
}
// ローカルの Z じくを dir に むける（や・つばめ よう）
function orientZ(p, dir, s) {
  const F = V3.norm(dir);
  let Rr = V3.cross([0, 1, 0], F);
  Rr = V3.len(Rr) < 1e-3 ? [1, 0, 0] : V3.norm(Rr);
  const U = V3.cross(F, Rr);
  return M4.scale(M4.frame(Rr, U, F, p), s, s, s);
}

function buildMeshes(R, ARENA) {
  const H = hexc, M = {};
  const mk = (fn) => { const b = new Builder(); fn(b); return R.mesh(b); };
  let seed = 1;
  const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const skin = H('#ffe3c8'), black = H('#212529');

  M.ground = mk((b) => {
    b.add('cyl', TM(0, -0.5, 0, 240, 1, 240), H('#7a7c89'));
    b.add('cyl', TM(0, -0.46, 0, ARENA * 2 + 3, 1, ARENA * 2 + 3), H('#a7a9b6'));
    seed = 11;
    for (let i = 0; i < 30; i++) { // クレーター
      const inside = i < 7, a = srnd() * Math.PI * 2;
      const d = inside ? 4 + srnd() * (ARENA - 8) : ARENA + 7 + srnd() * 55;
      const r = inside ? 1.3 + srnd() * 1.6 : 2 + srnd() * 6;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      b.add('cyl', TM(x, 0.06, z, r * 2, 0.04, r * 2), H('#8d8f9c'));
      b.add('cyl', TM(x, 0.1, z, r * 1.35, 0.04, r * 1.35), H('#787a88'));
      const n = Math.max(8, Math.round(r * 5));
      for (let j = 0; j < n; j++) {
        const q = j / n * Math.PI * 2;
        b.add('ball', TM(x + Math.cos(q) * r, 0, z + Math.sin(q) * r, r * 0.55, r * (inside ? 0.12 : 0.25), r * 0.55), H('#b5b7c3'));
      }
    }
    seed = 23;
    for (let i = 0; i < 36; i++) { // まわりの いわ
      const a = i / 36 * Math.PI * 2 + srnd() * 0.08, d = ARENA + 1.8 + srnd() * 1.4, s = 1.2 + srnd() * 1.5;
      b.add('ball', TM(Math.cos(a) * d, s * 0.2, Math.sin(a) * d, s * 1.4, s, s * 1.1, srnd() * 3), H(srnd() < 0.5 ? '#9a9ca8' : '#878995'));
    }
    // すすき
    seed = 5;
    for (let c = 0; c < 9; c++) {
      const a = c / 9 * Math.PI * 2 + 0.3, d = ARENA + 4.5;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      for (let k = 0; k < 7; k++) {
        const h = 2 + srnd() * 1.6, lean = (srnd() - 0.5) * 0.6, ox = cx + (srnd() - 0.5) * 1.4, oz = cz + (srnd() - 0.5) * 1.4;
        b.add('cube', TM(ox, h / 2, oz, 0.07, h, 0.07, srnd() * 3, 0, lean), H('#8c7a4b'));
        const ty = h * Math.cos(lean);
        b.add('ball', TM(ox - Math.sin(lean) * h, ty, oz, 0.28, 0.75, 0.28, 0, 0, lean), H('#e9d8a6'));
      }
    }
    // もちつきの うす と きね
    const ux = 7, uz = -(ARENA + 3.5);
    b.add('cyl', TM(ux, 0.7, uz, 2.4, 1.4, 2.4), H('#9c5b2e'));
    b.add('cyl', TM(ux, 1.3, uz, 2.6, 0.25, 2.6), H('#b8743f'));
    b.add('ball', TM(ux, 1.45, uz, 1.9, 0.6, 1.9), H('#ffffff'));
    b.add('cyl', TM(ux + 1.4, 1.6, uz + 0.4, 0.15, 3.0, 0.15, 0, 0, 0.55), H('#c48a54'));
    b.add('cyl', TM(ux + 2.2, 2.9, uz + 0.4, 0.7, 1.3, 0.7, 0, 0, 0.55 + Math.PI / 2), H('#b8743f'));
  });

  M.star = mk((b) => {
    seed = 99;
    for (let i = 0; i < 420; i++) {
      const u = srnd() * 2 - 1, f = srnd() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.02, r = Math.sqrt(1 - y * y);
      const s = 0.35 + srnd() * 0.7, c = srnd();
      b.add('cube', TM(Math.cos(f) * r * 160, y * 160, Math.sin(f) * r * 160, s, s, s, srnd() * 3, srnd() * 3),
        c < 0.7 ? [1, 1, 1, 1] : c < 0.85 ? [1, 0.93, 0.6, 1] : [0.7, 0.85, 1, 1]);
    }
  });
  M.earth = mk((b) => {
    b.add('sphere', M4.ident(), H('#3b8fe0', 0.5));
    seed = 42;
    for (let i = 0; i < 16; i++) {
      const u = srnd() * 2 - 1, f = srnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const p = [Math.cos(f) * r, u, Math.sin(f) * r], s = 0.18 + srnd() * 0.22;
      const cloud = i >= 11;
      b.add('ball', TM(p[0] * (cloud ? 0.47 : 0.43), p[1] * (cloud ? 0.47 : 0.43), p[2] * (cloud ? 0.47 : 0.43), s, s * 0.7, s), cloud ? H('#ffffff', 0.5) : H('#51cf66', 0.5));
    }
  });

  M.rabbit = mk((b) => {
    const W = H('#fbfbfd'), P = H('#ffb3cf'), Rd = H('#d6336c');
    b.add('sphere', TM(0, 0.62, 0, 1.0, 1.05, 0.9), W);
    b.add('cyl', TM(0, 1.0, 0.04, 0.78, 0.14, 0.72), H('#f03e3e'));
    b.add('cube', TM(0.26, 0.8, -0.32, 0.18, 0.4, 0.06, 0, 0.2, -0.3), H('#f03e3e'));
    b.add('sphere', TM(0, 1.38, 0.1, 0.92, 0.84, 0.84), W);
    for (const s of [-1, 1]) {
      b.add('sphere', TM(s * 0.2, 2.08, -0.02, 0.27, 0.98, 0.17, 0, -0.15, -s * 0.16), W);
      b.add('sphere', TM(s * 0.21, 2.06, 0.05, 0.14, 0.72, 0.06, 0, -0.15, -s * 0.16), P);
      b.add('sphere', TM(s * 0.2, 1.44, 0.46, 0.13, 0.16, 0.1), Rd);
      b.add('sphere', TM(s * 0.17, 1.48, 0.5, 0.05, 0.05, 0.04), H('#ffffff', 1));
      b.add('sphere', TM(s * 0.31, 1.27, 0.43, 0.15, 0.08, 0.06), P);
      b.add('sphere', TM(s * 0.42, 0.85, 0.28, 0.24, 0.32, 0.24), W);
      b.add('sphere', TM(s * 0.26, 0.1, 0.22, 0.34, 0.2, 0.52), W);
    }
    b.add('sphere', TM(0, 1.32, 0.53, 0.1, 0.07, 0.06), P);
    b.add('sphere', TM(0, 0.5, -0.46, 0.4, 0.4, 0.4), W);
  });

  M.kaguya = mk((b) => {
    const skin = H('#ffe8d6'), hair = H('#1f1d2b'), gold = H('#fcc419', 0.5);
    b.add('cyl', TM(0, 2.6, -0.6, 1.9, 0.05, 1.9, 0, Math.PI / 2), H('#fff3bf', 1)); // うしろの つき
    b.add('cone', TM(0, 0.9, 0, 2.1, 1.8, 2.1), H('#2f9e44'));
    b.add('cone', TM(0, 1.15, 0, 1.8, 1.9, 1.8), H('#e03131'));
    b.add('cone', TM(0, 1.5, 0, 1.4, 1.7, 1.4), H('#f783ac'));
    b.add('cone', TM(0, 2.0, 0.02, 0.8, 0.8, 0.8), H('#fff0f6'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.72, 1.6, 0.15, 0.5, 1.0, 0.55, s * 0.25, 0, s * 0.2), H('#e03131'));
      b.add('cube', TM(s * 0.82, 1.2, 0.17, 0.52, 0.12, 0.57, s * 0.25, 0, s * 0.2), H('#2f9e44'));
      b.add('cube', TM(s * 0.42, 2.3, 0.05, 0.13, 0.85, 0.2), hair);
      b.add('sphere', TM(s * 0.17, 2.66, 0.36, 0.1, 0.13, 0.08), hair);
      b.add('sphere', TM(s * 0.27, 2.53, 0.35, 0.14, 0.08, 0.05), H('#ffa8a8'));
    }
    b.add('sphere', TM(0, 1.75, 0.55, 0.36, 0.22, 0.2), skin);
    b.add('cube', TM(0.62, 1.95, 0.55, 0.55, 0.38, 0.04, 0.3, 0, -0.5), gold); // おうぎ
    b.add('sphere', TM(0, 2.65, 0, 0.85, 0.9, 0.82), skin);
    b.add('sphere', TM(0, 2.76, -0.13, 0.93, 0.96, 0.84), hair);
    b.add('cube', TM(0, 3.02, 0.27, 0.72, 0.17, 0.16), hair);
    b.add('cube', TM(0, 1.8, -0.42, 0.86, 2.1, 0.18), hair);
    b.add('sphere', TM(0, 2.45, 0.4, 0.11, 0.04, 0.04), H('#e03131'));
    b.add('cube', TM(0, 3.25, 0, 0.5, 0.12, 0.3), gold);
    b.add('sphere', TM(0.32, 3.18, 0.05, 0.16, 0.16, 0.16), gold);
    b.add('sphere', TM(-0.32, 3.18, 0.05, 0.16, 0.16, 0.16), gold);
    b.add('ball', TM(0, 0.02, 0, 2.6, 0.3, 2.6), H('#fff9db', 1)); // のっている つきの ひかり
  });

  M.dango = mk((b) => {
    b.add('cyl', TM(0, 0, 0, 0.06, 1.2, 0.06), H('#d9a066'));
    b.add('sphere', TM(0, 0.3, 0, 0.36, 0.36, 0.36), H('#ffc9de'));
    b.add('sphere', TM(0, 0, 0, 0.36, 0.36, 0.36), H('#ffffff'));
    b.add('sphere', TM(0, -0.3, 0, 0.36, 0.36, 0.36), H('#a9e34b'));
  });
  M.item = mk((b) => {
    b.add('cube', TM(0, 0.18, 0, 1.0, 0.36, 1.0), H('#e0a458'));
    b.add('cube', TM(0, 0.4, 0, 1.1, 0.08, 1.1), H('#f0c27a'));
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.add('sphere', TM(x, 0.62, z, 0.4, 0.38, 0.4), H('#ffffff', 0.5));
    b.add('sphere', TM(0, 0.92, 0, 0.4, 0.38, 0.4), H('#ffffff', 0.5));
  });
  M.bamboo = mk((b) => {
    for (const [x, z, h] of [[0, 0, 4.2], [0.45, 0.25, 3.4], [-0.4, 0.3, 3.0]]) {
      b.add('cyl', TM(x, h / 2, z, 0.38, h, 0.38), H('#5c940d'));
      for (let y = 0.8; y < h - 0.3; y += 0.8) b.add('cyl', TM(x, y, z, 0.44, 0.08, 0.44), H('#2b8a3e'));
      b.add('cone', TM(x, h + 0.3, z, 0.38, 0.6, 0.38), H('#94d82d'));
    }
  });


  // ---------- うさぎの どうぐ ----------
  M.kine = mk((b) => { // きね（にぎる ところが 0）
    b.add('cyl', TM(0, 0.6, 0, 0.11, 1.25, 0.11), H('#c48a54'));
    b.add('cyl', TM(0, 1.3, 0, 0.5, 0.8, 0.5, 0, 0, Math.PI / 2), H('#b8743f'));
    b.add('cyl', TM(0, 1.3, 0, 0.54, 0.1, 0.54, 0, 0, Math.PI / 2), H('#8d5a2b'));
  });
  M.mochiBall = mk((b) => { // もちもち ローリング
    b.add('sphere', TM(0, 0, 0, 2.5, 2.5, 2.5), H('#ffffff'));
    seed = 7;
    for (let i = 0; i < 12; i++) {
      const u = srnd() * 2 - 1, f = srnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      b.add('sphere', TM(Math.cos(f) * r * 1.2, u * 1.2, Math.sin(f) * r * 1.2, 0.4, 0.4, 0.4), i % 2 ? H('#ffc9de') : H('#a9e34b'));
    }
  });

  // ---------- てき ----------
  // おうじさま（きこうし）の からだ
  function noble(b, o) {
    b.add('cone', TM(0, 0.85, 0, 1.35, 1.7, 1.35), H(o.robe));
    b.add('cyl', TM(0, 1.22, 0, 0.66, 0.12, 0.66), H(o.belt || '#f8f9fa'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.55, 1.25, 0.05, 0.42, 0.75, 0.45, 0, 0, s * 0.25), H(o.sleeve || o.robe));
      b.add('sphere', TM(s * 0.66, 0.88, 0.22, 0.2, 0.2, 0.2), skin);
      b.add('sphere', TM(s * 0.14, 1.98, 0.32, 0.08, 0.11, 0.06), black);
      if (o.must) b.add('cube', TM(s * 0.11, 1.83, 0.33, 0.17, 0.045, 0.05, 0, 0, s * 0.35), black);
      if (o.cheek) b.add('sphere', TM(s * 0.24, 1.86, 0.27, 0.13, 0.08, 0.05), H('#ffa8a8'));
    }
    b.add('sphere', TM(0, 1.95, 0, 0.72, 0.74, 0.7), skin);
    b.add('sphere', TM(0, 2.02, -0.1, 0.74, 0.7, 0.62), black);
    b.add('sphere', TM(0, 1.77, 0.34, 0.09, 0.035, 0.04), H('#c92a2a'));
    b.add('cyl', TM(0, 2.48, -0.05, 0.42, 0.6, 0.42), black); // えぼし
    b.add('cube', TM(0, 2.8, -0.14, 0.22, 0.28, 0.3, 0, -0.4), black);
  }
  M.takenoko = mk((b) => {
    b.add('cone', TM(0, 0.8, 0, 1.35, 1.6, 1.35), H('#7f4f24'));
    b.add('cone', TM(0, 1.05, 0.03, 1.0, 1.4, 1.0), H('#a0673a'));
    b.add('cone', TM(0, 1.4, 0.05, 0.6, 1.0, 0.6), H('#c68b59'));
    b.add('cone', TM(0, 2.0, 0.06, 0.24, 0.4, 0.24), H('#e9c46a'));
    b.add('cyl', TM(0, 1.0, 0, 0.66, 0.1, 0.66), H('#f03e3e'));
    b.add('cube', TM(-0.2, 1.0, -0.33, 0.1, 0.32, 0.05, 0, 0, 0.5), H('#f03e3e'));
    for (const s of [-1, 1]) {
      b.add('sphere', TM(s * 0.15, 0.62, 0.42, 0.2, 0.22, 0.1), H('#ffffff'));
      b.add('sphere', TM(s * 0.15, 0.62, 0.47, 0.09, 0.11, 0.05), black);
      b.add('sphere', TM(s * 0.27, 0.06, 0.12, 0.26, 0.16, 0.38), H('#5c3d1e'));
    }
    b.add('sphere', TM(0, 0.42, 0.47, 0.12, 0.06, 0.04), H('#c92a2a'));
  });
  M.heishi = mk((b) => {
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.2, 0.35, 0, 0.26, 0.7, 0.3), H('#343a40'));
      b.add('cube', TM(s * 0.55, 1.2, 0.05, 0.26, 0.7, 0.3, 0, 0, s * 0.2), H('#c92a2a'));
      b.add('sphere', TM(s * 0.64, 0.85, 0.12, 0.2, 0.2, 0.2), skin);
      b.add('sphere', TM(s * 0.14, 1.88, 0.31, 0.08, 0.11, 0.06), black);
    }
    b.add('cube', TM(0, 0.78, 0, 0.95, 0.4, 0.7), H('#a61e4d'));
    b.add('cube', TM(0, 1.22, 0, 0.85, 0.75, 0.6), H('#c92a2a'));
    for (let i = 0; i < 3; i++) b.add('cube', TM(0, 1.0 + i * 0.22, 0.31, 0.86, 0.04, 0.02), H('#ffd43b'));
    b.add('sphere', TM(0, 1.85, 0, 0.66, 0.66, 0.64), skin);
    b.add('sphere', TM(0, 1.98, -0.03, 0.74, 0.5, 0.74), H('#343a40'));
    b.add('cyl', TM(0, 1.98, 0, 0.98, 0.05, 0.98), H('#495057'));
    b.add('cube', TM(0, 2.28, 0.25, 0.45, 0.25, 0.04, 0, 0.2), H('#fcc419', 0.4));
    b.add('sphere', TM(0, 1.7, 0.32, 0.09, 0.035, 0.04), H('#c92a2a'));
    // ゆみ
    b.add('cube', TM(-0.78, 1.25, 0.35, 0.06, 1.5, 0.06), H('#8d5a2b'));
    b.add('cube', TM(-0.78, 2.05, 0.25, 0.06, 0.4, 0.06, 0, -0.5), H('#8d5a2b'));
    b.add('cube', TM(-0.78, 0.45, 0.25, 0.06, 0.4, 0.06, 0, 0.5), H('#8d5a2b'));
    b.add('cube', TM(-0.78, 1.25, 0.12, 0.02, 1.9, 0.02), H('#f1f3f5'));
    b.add('cyl', TM(0.25, 1.4, -0.4, 0.3, 0.9, 0.3, 0, 0.3), H('#5c3d1e')); // やづつ
  });
  M.kani = mk((b) => {
    const red = H('#e03131');
    b.add('sphere', TM(0, 0.6, 0, 1.9, 0.8, 1.5), red);
    b.add('sphere', TM(0, 0.78, -0.1, 1.4, 0.5, 1.0), H('#ff6b6b'));
    for (const s of [-1, 1]) {
      b.add('cyl', TM(s * 0.3, 1.05, 0.45, 0.08, 0.4, 0.08), red);
      b.add('sphere', TM(s * 0.3, 1.3, 0.45, 0.24, 0.24, 0.24), H('#ffffff'));
      b.add('sphere', TM(s * 0.3, 1.32, 0.56, 0.1, 0.1, 0.06), black);
      for (const z of [-0.45, 0, 0.4]) b.add('cube', TM(s * 1.0, 0.32, z, 0.85, 0.1, 0.14, 0, 0, s * -0.55), H('#c92a2a'));
    }
    b.add('sphere', TM(0, 0.55, 0.72, 0.25, 0.06, 0.05), H('#5c0a0a'));
  });
  M.claw = mk((b) => { // かにの はさみ（かたが 0、+Z に のびる）
    b.add('cube', TM(0, 0, 0.35, 0.2, 0.2, 0.7), H('#e03131'));
    b.add('sphere', TM(0, 0.08, 0.85, 0.55, 0.45, 0.6), H('#e03131'));
    b.add('cone', TM(0, 0.22, 1.25, 0.18, 0.5, 0.18, 0, Math.PI / 2), H('#ff8787'));
    b.add('cone', TM(0, -0.06, 1.18, 0.15, 0.4, 0.15, 0, Math.PI / 2), H('#ff8787'));
  });
  M.ishitsukuri = mk((b) => noble(b, { robe: '#364fc7', sleeve: '#4c6ef5', must: true }));
  M.bowl = mk((b) => { // ほとけの いしの はち（の にせもの）
    b.add('sphere', TM(0, 0, 0, 1.5, 0.75, 1.5), H('#868e96'));
    b.add('cyl', TM(0, 0.2, 0, 1.25, 0.06, 1.25), H('#495057'));
    b.add('cyl', TM(0, 0.18, 0, 1.55, 0.08, 1.55), H('#adb5bd'));
  });
  M.kuramochi = mk((b) => {
    noble(b, { robe: '#9c36b5', sleeve: '#be4bdb', cheek: true });
    b.add('cyl', TM(0.75, 1.6, 0.3, 0.07, 1.4, 0.07, 0, 0, -0.3), H('#fcc419', 0.5));
    const cols = ['#ff6b6b', '#74c0fc', '#ffd43b', '#69db7c', '#f783ac'];
    [[0.96, 2.3, 0.3], [0.8, 2.05, 0.45], [1.1, 2.0, 0.2], [0.9, 1.85, 0.15], [1.05, 2.25, 0.45]].forEach((p, i) => b.add('sphere', TM(p[0], p[1], p[2], 0.2, 0.2, 0.2), H(cols[i], 1)));
  });
  M.abe = mk((b) => {
    b.add('sphere', TM(0, 0.95, 0, 1.75, 1.8, 1.5), H('#f08c00'));
    b.add('cyl', TM(0, 1.05, 0, 1.5, 0.15, 1.3), H('#5f3dc4'));
    b.add('cube', TM(0, 1.25, -0.62, 1.65, 1.7, 0.22, 0, 0.12), H('#e8590c')); // ひねずみの かわごろも
    for (let i = 0; i < 6; i++) b.add('ball', TM(-0.75 + i * 0.3, 0.42, -0.72, 0.35, 0.3, 0.3), H('#ff922b'));
    for (const s of [-1, 1]) {
      b.add('ball', TM(s * 0.85, 1.35, -0.45, 0.45, 0.45, 0.4), H('#ff922b'));
      b.add('sphere', TM(s * 0.85, 1.05, 0.25, 0.32, 0.5, 0.32, 0, 0, s * 0.3), H('#f08c00'));
      b.add('sphere', TM(s * 0.32, 0.08, 0.15, 0.32, 0.18, 0.45), black);
      b.add('sphere', TM(s * 0.15, 2.15, 0.36, 0.08, 0.1, 0.06), black);
      b.add('sphere', TM(s * 0.3, 1.98, 0.3, 0.18, 0.12, 0.06), H('#ffa8a8'));
      b.add('cube', TM(s * 0.13, 1.98, 0.38, 0.2, 0.05, 0.05, 0, 0, s * 0.3), black);
    }
    b.add('sphere', TM(0, 2.08, 0.05, 0.82, 0.78, 0.74), skin);
    b.add('cyl', TM(0, 2.55, -0.05, 0.42, 0.55, 0.42), black);
    b.add('cube', TM(0, 2.85, -0.14, 0.22, 0.28, 0.3, 0, -0.4), black);
    b.add('sphere', TM(0, 1.9, 0.42, 0.12, 0.05, 0.05), H('#c92a2a'));
    b.add('sphere', TM(0.4, 1.0, 0.75, 0.25, 0.25, 0.25), H('#fcc419', 0.5)); // こばん
  });
  M.ootomo = mk((b) => {
    b.add('cone', TM(0, 0.85, 0, 1.45, 1.7, 1.45), H('#2b8a3e'));
    b.add('cube', TM(0, 1.35, 0.15, 0.8, 0.6, 0.4), H('#1864ab'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.58, 1.3, 0.05, 0.5, 0.5, 0.5, 0, 0, s * 0.3), H('#1864ab'));
      b.add('sphere', TM(s * 0.66, 0.92, 0.22, 0.2, 0.2, 0.2), skin);
      b.add('sphere', TM(s * 0.14, 1.95, 0.32, 0.08, 0.1, 0.06), black);
      b.add('cube', TM(s * 0.16, 2.05, 0.33, 0.16, 0.04, 0.04, 0, 0, s * -0.3), black);
      b.add('cube', TM(s * 0.22, 2.55, 0.28, 0.08, 0.55, 0.05, 0, 0, s * 0.5), H('#fcc419', 0.5));
    }
    b.add('sphere', TM(0, 1.92, 0, 0.72, 0.74, 0.7), skin);
    b.add('sphere', TM(0, 2.1, -0.03, 0.82, 0.6, 0.8), H('#495057'));
    b.add('cyl', TM(0, 2.0, -0.05, 0.95, 0.06, 0.95), H('#343a40'));
    b.add('sphere', TM(0, 1.75, 0.34, 0.1, 0.035, 0.04), H('#c92a2a'));
    b.add('cyl', TM(-0.72, 1.5, 0.3, 0.08, 2.6, 0.08), H('#8d5a2b')); // つえ
  });
  M.isonokami = mk((b) => {
    b.add('cyl', TM(0, 0.55, 0, 1.5, 1.1, 1.5), H('#a9744f'));
    for (let i = 0; i < 3; i++) b.add('cyl', TM(0, 0.25 + i * 0.3, 0, 1.53, 0.05, 1.53), H('#8b5a2b'));
    b.add('cyl', TM(0, 1.12, 0, 1.62, 0.12, 1.62), H('#8b5a2b'));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, p0 = [Math.cos(a) * 0.75, 1.15, Math.sin(a) * 0.75], p1 = [0, 2.9, 0];
      const d = V3.sub(p1, p0);
      b.add('cyl', orientY(V3.lerp(p0, p1, 0.5), d, 0.04, V3.len(d), 0.04), H('#c9a77c'));
    }
    b.add('cone', TM(0, 1.35, 0, 0.95, 0.8, 0.95), H('#e64980'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.38, 1.95, 0.15, 0.17, 0.65, 0.17, 0, 0.3, -s * 0.35), H('#e64980'));
      b.add('sphere', TM(s * 0.52, 2.25, 0.28, 0.17, 0.17, 0.17), skin);
      b.add('sphere', TM(s * 0.13, 1.92, 0.31, 0.07, 0.1, 0.05), black);
    }
    b.add('sphere', TM(0, 1.9, 0.02, 0.64, 0.66, 0.62), skin);
    b.add('sphere', TM(0, 1.96, -0.08, 0.66, 0.62, 0.56), black);
    b.add('sphere', TM(0, 1.73, 0.3, 0.12, 0.08, 0.04), H('#c92a2a'));
    b.add('cyl', TM(0, 2.38, -0.05, 0.38, 0.5, 0.38), black);
  });
  M.swallow = mk((b) => {
    b.add('sphere', TM(0, 0, 0, 0.32, 0.28, 0.75), H('#1c2a4a'));
    b.add('sphere', TM(0, -0.06, 0.06, 0.25, 0.18, 0.55), H('#ffffff'));
    b.add('sphere', TM(0, 0, 0.32, 0.15, 0.13, 0.12), H('#e03131'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.48, 0.03, -0.02, 0.75, 0.04, 0.3, s * 0.3, 0, s * 0.15), H('#1c2a4a'));
      b.add('cube', TM(s * 0.08, 0, -0.55, 0.06, 0.03, 0.45, s * 0.3), H('#1c2a4a'));
    }
  });
  M.tsukai = mk((b) => {
    for (const [x, z, s] of [[0.7, 0, 1.0], [-0.7, 0, 1.0], [0, 0.6, 1.1], [0, -0.6, 1.1], [0, 0, 1.4]]) b.add('ball', TM(x, 0.1, z, s * 1.3, s * 0.7, s * 1.3), H('#f8f9fa', 1));
    b.add('cone', TM(0, 1.15, 0, 1.25, 1.7, 1.25), H('#f1f3f5'));
    b.add('cyl', TM(0, 1.35, 0, 0.6, 0.14, 0.6), H('#74c0fc'));
    for (const s of [-1, 1]) {
      b.add('cube', TM(s * 0.85, 1.55, -0.3, 0.12, 1.8, 0.04, 0, 0.3, s * 0.7), H('#ffdeeb', 1)); // はごろも
      b.add('cube', TM(s * 0.5, 1.45, 0.05, 0.38, 0.7, 0.4, 0, 0, s * 0.2), H('#e7f5ff'));
      b.add('sphere', TM(s * 0.14, 2.08, 0.31, 0.07, 0.04, 0.05), black);
    }
    b.add('sphere', TM(0, 2.05, 0, 0.7, 0.72, 0.68), skin);
    b.add('sphere', TM(0, 2.12, -0.1, 0.72, 0.68, 0.6), black);
    b.add('sphere', TM(0, 2.55, -0.1, 0.4, 0.4, 0.4), black);
    b.add('cube', TM(0, 2.45, 0.1, 0.35, 0.1, 0.1), H('#fcc419', 0.6));
    b.add('cyl', TM(0, 2.2, -0.55, 1.3, 0.04, 1.3, 0, Math.PI / 2), H('#e7f5ff', 1));
    b.add('sphere', TM(0, 1.88, 0.32, 0.08, 0.03, 0.03), H('#e64980'));
  });
  M.arrow = mk((b) => {
    b.add('cyl', TM(0, 0, 0, 0.06, 1.3, 0.06, 0, Math.PI / 2), H('#c48a54'));
    b.add('cone', TM(0, 0, 0.72, 0.14, 0.25, 0.14, 0, Math.PI / 2), H('#adb5bd'));
    b.add('cube', TM(0, 0.06, -0.55, 0.02, 0.14, 0.3), H('#ffffff'));
    b.add('cube', TM(0, -0.06, -0.55, 0.02, 0.14, 0.3), H('#ffffff'));
  });
  return M;
}
