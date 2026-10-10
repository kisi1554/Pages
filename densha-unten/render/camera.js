// 運転席視点のカメラ。線路中心から左に約0.45m、レール面から約2.4m。35m 先を見る。

const SEAT_BACK = 1.6;     // 先頭からの後退量 (m)
const SEAT_LEFT = 0.45;
const EYE = 2.4;
const LOOK = 35;

export function cabCamera(al, s, v, time, aspect) {
  const sc = s - SEAT_BACK;
  const lat = al.downTrack(sc) - SEAT_LEFT;
  const pos = al.point(sc, lat, EYE);
  const sl = sc + LOOK;
  const tgt = al.point(sl, al.downTrack(sl) - SEAT_LEFT * 0.5, EYE - 0.55);
  // 速度に応じたゆれ
  const sp = Math.min(1, Math.abs(v) / 100);
  pos[1] += (Math.sin(time * 7.3) * 0.012 + Math.sin(time * 2.1 + 1) * 0.018) * sp;
  pos[0] += Math.sin(time * 1.7) * 0.02 * sp;
  const dir = [tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]];
  // 曲線での傾き（カントの分、内側に傾ける）
  const k = al.curvature(sc + 10);
  const roll = Math.max(-0.06, Math.min(0.06, k * 22)) + Math.sin(time * 1.3) * 0.004 * sp;
  // 前に直交する右ベクトルを roll だけまわして上を作る
  const b = al.bearing(sc);
  const r = [Math.cos(b), 0, Math.sin(b)];
  const up = [Math.sin(roll) * r[0], Math.cos(roll), Math.sin(roll) * r[2]];
  // 縦の画角は縦持ちで広めに
  const fov = aspect < 1 ? 62 : 50;
  return { pos, dir, up, fov: fov * Math.PI / 180, near: 0.3, far: 2200, aspect };
}
