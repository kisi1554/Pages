"use strict";
/* てんくうエレベーター - けしき（まどの そと）・ホール・こもの を Canvas で かく
 *   Scenery.outside(c, R, env, hits) … まどの そと。env = { h(m), v(m/s), t, tod, weather }
 *   Scenery.hall(c, R, floor, env)     … かいの ホール
 *   Props.draw(c, key, x, y, s, t)     … こもの
 * hits に { x, y, w, h, key } を いれると、タップで なまえが わかる。
 */
const Props = (() => {
  const TAU = Math.PI * 2;
  const E = (c, x, y, rx, ry, f, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); c.fillStyle = f; c.fill(); };
  const R = (c, x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  const P = (c, pts, f, stroke, lw) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } };
  const Ln = (c, pts, col, lw) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.stroke(); };
  function spiral(c, x, y, r, col, lw) { c.beginPath(); for (let a = 0; a < TAU * 2.3; a += .2) { const rr = r * Math.exp(-a * .3); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
  function star(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; c.fill(); }
  function cloud(c, x, y, s, col) { [[-.3, .05, .25], [.3, .05, .25], [0, -.1, .32], [0, .1, .3]].forEach(([a, b, r]) => E(c, x + a * s, y + b * s, r * s, r * s, col)); }

  // s … おおきさ（だいたい たかさ）。(x, y) … したの まんなか
  const D = {
    gem(c, x, y, s) { P(c, [[x - s * .35, y - s * .55], [x + s * .35, y - s * .55], [x + s * .5, y - s * .35], [x, y], [x - s * .5, y - s * .35]], '#4dabf7', '#1864ab'); P(c, [[x - s * .2, y - s * .55], [x, y - s * .35], [x + s * .2, y - s * .55]], 'rgba(255,255,255,.5)'); },
    fossil(c, x, y, s) { E(c, x, y - s * .4, s * .45, s * .4, '#c9b38f'); spiral(c, x + s * .02, y - s * .4, s * .36, '#7a5c3a', s * .05); },
    strata(c, x, y, s) { ['#c08552', '#e6ccb2', '#9c6644', '#ddb892', '#7f5539'].forEach((col, i) => R(c, x - s * .5, y - s + i * s * .2, s, s * .2, col)); },
    clock(c, x, y, s) { E(c, x, y - s * .5, s * .45, s * .45, '#fff'); c.strokeStyle = '#495057'; c.lineWidth = s * .06; c.beginPath(); c.arc(x, y - s * .5, s * .45, 0, TAU); c.stroke(); Ln(c, [[x, y - s * .5], [x, y - s * .8]], '#212529', s * .05); Ln(c, [[x, y - s * .5], [x + s * .2, y - s * .5]], '#212529', s * .05); },
    rock(c, x, y, s) { P(c, [[x - s * .5, y], [x - s * .4, y - s * .45], [x - s * .05, y - s * .6], [x + s * .4, y - s * .4], [x + s * .5, y]], '#868e96', '#495057'); },
    shovel(c, x, y, s) { Ln(c, [[x + s * .2, y - s], [x - s * .05, y - s * .35]], '#a0522d', s * .08); P(c, [[x - s * .2, y - s * .4], [x + s * .1, y - s * .3], [x - s * .05, y], [x - s * .3, y - s * .1]], '#adb5bd', '#495057'); },
    amber(c, x, y, s) { E(c, x, y - s * .4, s * .4, s * .35, 'rgba(250,176,5,.85)'); E(c, x - s * .05, y - s * .42, s * .08, s * .04, '#5c3d1e'); },
    crystal(c, x, y, s) { [[-.25, .8, '#d0bfff'], [0, 1, '#b197fc'], [.25, .7, '#e5dbff']].forEach(([dx, h, col]) => P(c, [[x + dx * s - s * .12, y], [x + dx * s - s * .12, y - s * h * .8], [x + dx * s, y - s * h], [x + dx * s + s * .12, y - s * h * .8], [x + dx * s + s * .12, y]], col, '#7048e8', 1.5)); },
    magnifier(c, x, y, s) { Ln(c, [[x + s * .1, y - s * .35], [x + s * .4, y]], '#a0522d', s * .1); c.beginPath(); c.arc(x - s * .1, y - s * .55, s * .28, 0, TAU); c.fillStyle = 'rgba(208,235,255,.7)'; c.fill(); c.strokeStyle = '#495057'; c.lineWidth = s * .07; c.stroke(); },
    drop(c, x, y, s) { c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x + s * .45, y - s * .4, x, y); c.quadraticCurveTo(x - s * .45, y - s * .4, x, y - s); c.fillStyle = '#74c0fc'; c.fill(); },
    water(c, x, y, s) { E(c, x, y - s * .15, s * .6, s * .18, '#4dabf7'); E(c, x - s * .15, y - s * .2, s * .15, s * .04, 'rgba(255,255,255,.6)'); D.drop(c, x + s * .2, y - s * .4, s * .4); },
    pipe(c, x, y, s) { R(c, x - s * .5, y - s * .55, s, s * .25, '#5c7cfa'); R(c, x - s * .1, y - s * .55, s * .2, s * .55, '#5c7cfa'); E(c, x + s * .5, y - s * .42, s * .06, s * .14, '#364fc7'); E(c, x - s * .5, y - s * .42, s * .06, s * .14, '#364fc7'); },
    bucket(c, x, y, s) { P(c, [[x - s * .35, y - s * .7], [x + s * .35, y - s * .7], [x + s * .25, y], [x - s * .25, y]], '#74c0fc', '#1c7ed6'); c.beginPath(); c.arc(x, y - s * .7, s * .35, Math.PI, 0); c.strokeStyle = '#495057'; c.lineWidth = 2; c.stroke(); },
    bell(c, x, y, s) { P(c, [[x - s * .35, y - s * .15], [x - s * .25, y - s * .7], [x, y - s * .85], [x + s * .25, y - s * .7], [x + s * .35, y - s * .15]], '#fab005', '#e67700'); E(c, x, y - s * .08, s * .08, s * .08, '#e67700'); },
    cup(c, x, y, s) { P(c, [[x - s * .3, y - s * .7], [x + s * .3, y - s * .7], [x + s * .22, y], [x - s * .22, y]], 'rgba(208,235,255,.9)', '#74c0fc'); R(c, x - s * .26, y - s * .45, s * .52, s * .4, 'rgba(77,171,247,.6)'); },
    train(c, x, y, s) { R(c, x - s * .6, y - s * .7, s * 1.2, s * .6, '#e7f5ff'); R(c, x - s * .6, y - s * .3, s * 1.2, s * .1, '#f08c00'); for (let i = 0; i < 3; i++) R(c, x - s * .5 + i * s * .38, y - s * .62, s * .26, s * .22, '#4dabf7'); E(c, x - s * .35, y - s * .08, s * .08, s * .08, '#343a40'); E(c, x + s * .35, y - s * .08, s * .08, s * .08, '#343a40'); },
    tunnel(c, x, y, s) { c.beginPath(); c.arc(x, y, s * .6, Math.PI, 0); c.fillStyle = '#868e96'; c.fill(); c.beginPath(); c.arc(x, y, s * .42, Math.PI, 0); c.fillStyle = '#212529'; c.fill(); },
    sign(c, x, y, s) { Ln(c, [[x, y], [x, y - s * .5]], '#495057', s * .06); R(c, x - s * .45, y - s * .95, s * .9, s * .45, '#1c7ed6'); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + s * .3, y - s * .72); c.lineTo(x + s * .1, y - s * .87); c.lineTo(x + s * .1, y - s * .57); c.fill(); R(c, x - s * .3, y - s * .76, s * .4, s * .08, '#fff'); },
    gate(c, x, y, s) { R(c, x - s * .5, y - s * .6, s * .3, s * .6, '#868e96'); R(c, x + s * .2, y - s * .6, s * .3, s * .6, '#868e96'); R(c, x - s * .2, y - s * .45, s * .4, s * .06, '#ffd43b'); E(c, x - s * .35, y - s * .5, s * .06, s * .04, '#51cf66'); },
    shop(c, x, y, s) { R(c, x - s * .5, y - s * .8, s, s * .8, '#fff4e6'); for (let i = 0; i < 5; i++) R(c, x - s * .5 + i * s * .2, y - s * .95, s * .2, s * .18, i % 2 ? '#fff' : '#e03131'); R(c, x - s * .35, y - s * .6, s * .7, s * .35, '#a5d8ff'); },
    root(c, x, y, s) { for (const a of [-.4, -.15, .1, .35]) Ln(c, [[x, y - s * .8], [x + a * s * .6, y - s * .4], [x + a * s, y]], '#a0522d', s * .05); E(c, x, y - s * .85, s * .2, s * .1, '#69db7c'); },
    worm(c, x, y, s) { c.beginPath(); for (let i = 0; i <= 12; i++) c.lineTo(x - s * .5 + i * s / 12, y - s * .2 - Math.sin(i * .9) * s * .1); c.strokeStyle = '#f4a3a8'; c.lineWidth = s * .14; c.lineCap = 'round'; c.stroke(); },
    flower(c, x, y, s) { Ln(c, [[x, y], [x, y - s * .6]], '#2f9e44', s * .06); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; E(c, x + Math.cos(a) * s * .17, y - s * .72 + Math.sin(a) * s * .17, s * .13, s * .13, '#f783ac'); } E(c, x, y - s * .72, s * .1, s * .1, '#ffd43b'); },
    heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y - s * .1); c.bezierCurveTo(x - s * .6, y - s * .5, x - s * .3, y - s * 1.05, x, y - s * .7); c.bezierCurveTo(x + s * .3, y - s * 1.05, x + s * .6, y - s * .5, x, y - s * .1); c.fillStyle = '#ff6b6b'; c.fill(); },
    bread(c, x, y, s) { E(c, x, y - s * .3, s * .55, s * .3, '#e8a54b'); for (let i = -1; i <= 1; i++) Ln(c, [[x + i * s * .2 - s * .08, y - s * .45], [x + i * s * .2 + s * .08, y - s * .2]], '#b5651d', s * .05); },
    letter(c, x, y, s) { R(c, x - s * .5, y - s * .65, s, s * .6, '#fff'); P(c, [[x - s * .5, y - s * .65], [x, y - s * .3], [x + s * .5, y - s * .65]], null, '#e03131', 2); c.strokeStyle = '#adb5bd'; c.strokeRect(x - s * .5, y - s * .65, s, s * .6); },
    bag(c, x, y, s) { R(c, x - s * .4, y - s * .65, s * .8, s * .65, '#ffa94d'); c.beginPath(); c.arc(x, y - s * .65, s * .2, Math.PI, 0); c.strokeStyle = '#e8590c'; c.lineWidth = s * .06; c.stroke(); },
    cat(c, x, y, s) { E(c, x, y - s * .25, s * .35, s * .25, '#ffa94d'); E(c, x - s * .3, y - s * .5, s * .2, s * .18, '#ffa94d'); P(c, [[x - s * .45, y - s * .6], [x - s * .42, y - s * .8], [x - s * .32, y - s * .66]], '#ffa94d'); P(c, [[x - s * .2, y - s * .62], [x - s * .17, y - s * .82], [x - s * .1, y - s * .62]], '#ffa94d'); },
    moon(c, x, y, s) { E(c, x, y - s * .5, s * .4, s * .4, '#ffe066'); E(c, x + s * .18, y - s * .6, s * .34, s * .34, 'rgba(0,0,0,0)'); },
    house(c, x, y, s) { R(c, x - s * .4, y - s * .55, s * .8, s * .55, '#fff4e6'); P(c, [[x - s * .5, y - s * .55], [x, y - s * .95], [x + s * .5, y - s * .55]], '#e03131'); R(c, x - s * .1, y - s * .3, s * .2, s * .3, '#a0522d'); },
    bench(c, x, y, s) { R(c, x - s * .55, y - s * .4, s * 1.1, s * .1, '#a0522d'); R(c, x - s * .55, y - s * .65, s * 1.1, s * .1, '#a0522d'); R(c, x - s * .45, y - s * .3, s * .06, s * .3, '#495057'); R(c, x + s * .39, y - s * .3, s * .06, s * .3, '#495057'); },
    pencil(c, x, y, s) { c.save(); c.translate(x, y - s * .4); c.rotate(-.6); R(c, -s * .45, -s * .07, s * .7, s * .14, '#fcc419'); P(c, [[s * .25, -s * .07], [s * .45, 0], [s * .25, s * .07]], '#f1c7a5'); c.restore(); },
    fence(c, x, y, s) { for (let i = -2; i <= 2; i++) R(c, x + i * s * .22 - s * .03, y - s * .6, s * .06, s * .6, '#adb5bd'); R(c, x - s * .5, y - s * .55, s, s * .05, '#adb5bd'); R(c, x - s * .5, y - s * .3, s, s * .05, '#adb5bd'); },
    window(c, x, y, s) { R(c, x - s * .45, y - s * .9, s * .9, s * .9, '#495057'); R(c, x - s * .4, y - s * .85, s * .8, s * .8, '#a5d8ff'); R(c, x - s * .02, y - s * .85, s * .04, s * .8, '#495057'); R(c, x - s * .4, y - s * .47, s * .8, s * .04, '#495057'); P(c, [[x - s * .35, y - s * .2], [x - s * .15, y - s * .8], [x - s * .05, y - s * .8], [x - s * .25, y - s * .2]], 'rgba(255,255,255,.5)'); },
    anchor(c, x, y, s) { Ln(c, [[x, y - s * .85], [x, y - s * .1]], '#495057', s * .08); c.beginPath(); c.arc(x, y - s * .35, s * .3, .1 * Math.PI, .9 * Math.PI); c.strokeStyle = '#495057'; c.lineWidth = s * .08; c.stroke(); Ln(c, [[x - s * .18, y - s * .7], [x + s * .18, y - s * .7]], '#495057', s * .07); c.beginPath(); c.arc(x, y - s * .9, s * .08, 0, TAU); c.stroke(); },
    bird(c, x, y, s) { Ln(c, [[x - s * .45, y - s * .6], [x - s * .2, y - s * .4], [x, y - s * .55], [x + s * .2, y - s * .4], [x + s * .45, y - s * .6]], '#343a40', s * .06); },
    ship(c, x, y, s) { P(c, [[x - s * .6, y - s * .3], [x + s * .6, y - s * .3], [x + s * .45, y], [x - s * .45, y]], '#e03131'); R(c, x - s * .35, y - s * .6, s * .5, s * .3, '#fff'); R(c, x + s * .2, y - s * .75, s * .12, s * .45, '#1c7ed6'); },
    box(c, x, y, s) { [['#e03131', 0, 0], ['#1c7ed6', 1, 0], ['#2f9e44', .5, 1]].forEach(([col, i, j]) => R(c, x - s * .5 + i * s * .5, y - s * .35 - j * s * .35, s * .48, s * .33, col)); },
    lighthouse(c, x, y, s) { P(c, [[x - s * .2, y], [x - s * .12, y - s * .75], [x + s * .12, y - s * .75], [x + s * .2, y]], '#fff', '#adb5bd'); R(c, x - s * .17, y - s * .45, s * .34, s * .1, '#e03131'); R(c, x - s * .14, y - s * .9, s * .28, s * .15, '#ffd43b'); },
    wave(c, x, y, s) { for (let j = 0; j < 2; j++) { c.beginPath(); for (let i = 0; i <= 20; i++) c.lineTo(x - s * .6 + i * s * .06, y - s * .25 - j * s * .25 + Math.sin(i * .9) * s * .07); c.strokeStyle = j ? '#74c0fc' : '#1c7ed6'; c.lineWidth = s * .07; c.stroke(); } },
    telescope(c, x, y, s) { Ln(c, [[x, y], [x, y - s * .45]], '#495057', s * .06); Ln(c, [[x - s * .2, y], [x, y - s * .45], [x + s * .2, y]], '#495057', s * .05); c.save(); c.translate(x, y - s * .55); c.rotate(-.4); R(c, -s * .35, -s * .1, s * .7, s * .2, '#1c7ed6'); R(c, s * .3, -s * .13, s * .1, s * .26, '#1864ab'); c.restore(); },
    building(c, x, y, s) { R(c, x - s * .2, y - s, s * .4, s, '#748ffc'); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) R(c, x - s * .14 + j * s * .16, y - s * .92 + i * s * .15, s * .1, s * .08, '#e7f5ff'); },
    flag(c, x, y, s, t) { Ln(c, [[x - s * .3, y], [x - s * .3, y - s]], '#495057', s * .05); P(c, [[x - s * .3, y - s], [x + s * .4, y - s * .9 + Math.sin(t * 5) * s * .05], [x - s * .3, y - s * .7]], '#ff6b6b'); },
    rope(c, x, y, s) { c.beginPath(); for (let i = 0; i < 4; i++) c.ellipse(x, y - s * .3, s * (.4 - i * .07), s * (.2 - i * .03), 0, 0, TAU); c.strokeStyle = '#e8a54b'; c.lineWidth = s * .05; c.stroke(); },
    gondola(c, x, y, s) { Ln(c, [[x - s * .3, y - s], [x - s * .3, y - s * .45]], '#495057', 2); Ln(c, [[x + s * .3, y - s], [x + s * .3, y - s * .45]], '#495057', 2); R(c, x - s * .45, y - s * .45, s * .9, s * .35, '#fab005'); },
    car(c, x, y, s) { R(c, x - s * .5, y - s * .35, s, s * .25, '#4dabf7'); P(c, [[x - s * .3, y - s * .35], [x - s * .15, y - s * .6], [x + s * .2, y - s * .6], [x + s * .35, y - s * .35]], '#4dabf7'); E(c, x - s * .28, y - s * .1, s * .1, s * .1, '#343a40'); E(c, x + s * .28, y - s * .1, s * .1, s * .1, '#343a40'); },
    leaf(c, x, y, s, t) { E(c, x, y - s * .5 + Math.sin(t * 2) * s * .05, s * .3, s * .14, '#69db7c', -.5); },
    sun(c, x, y, s) { E(c, x, y - s * .5, s * .28, s * .28, '#ffd43b'); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; Ln(c, [[x + Math.cos(a) * s * .36, y - s * .5 + Math.sin(a) * s * .36], [x + Math.cos(a) * s * .48, y - s * .5 + Math.sin(a) * s * .48]], '#fab005', s * .05); } },
    medal(c, x, y, s) { P(c, [[x - s * .2, y - s], [x, y - s * .55], [x + s * .2, y - s]], '#e03131'); E(c, x, y - s * .35, s * .3, s * .3, '#fcc419'); star(c, x, y - s * .35, s * .18, '#fff'); },
    tower(c, x, y, s) { P(c, [[x - s * .3, y], [x - s * .05, y - s * .8], [x + s * .05, y - s * .8], [x + s * .3, y]], null, '#e03131', s * .06); Ln(c, [[x, y - s * .8], [x, y - s]], '#e03131', s * .04); R(c, x - s * .15, y - s * .45, s * .3, s * .06, '#fff'); },
    lamp(c, x, y, s) { Ln(c, [[x, y], [x, y - s * .7]], '#495057', s * .06); E(c, x, y - s * .8, s * .16, s * .16, '#ffe066'); },
    umbrella(c, x, y, s) { c.beginPath(); c.arc(x, y - s * .5, s * .45, Math.PI, 0); c.fillStyle = '#4dabf7'; c.fill(); Ln(c, [[x, y - s * .5], [x, y - s * .05], [x - s * .1, y]], '#495057', s * .05); },
    tree(c, x, y, s) { R(c, x - s * .06, y - s * .45, s * .12, s * .45, '#a0522d'); E(c, x, y - s * .65, s * .35, s * .32, '#40c057'); },
    cloud(c, x, y, s) { cloud(c, x, y - s * .4, s * .8, '#fff'); },
    heli(c, x, y, s) { E(c, x, y - s * .4, s * .3, s * .2, '#fa5252'); R(c, x + s * .2, y - s * .44, s * .35, s * .06, '#fa5252'); R(c, x - s * .45, y - s * .68, s * .9, s * .04, '#495057'); },
    bolt(c, x, y, s) { P(c, [[x + s * .1, y - s], [x - s * .25, y - s * .4], [x, y - s * .4], [x - s * .1, y], [x + s * .25, y - s * .55], [x, y - s * .55]], '#fcc419', '#e67700'); },
    star(c, x, y, s) { star(c, x, y - s * .5, s * .45, '#ffd43b'); },
    rainbow(c, x, y, s) { ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, i) => { c.beginPath(); c.arc(x, y, s * (.6 - i * .07), Math.PI, 0); c.strokeStyle = col; c.lineWidth = s * .07; c.stroke(); }); },
    snow(c, x, y, s) { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; Ln(c, [[x - Math.cos(a) * s * .4, y - s * .5 - Math.sin(a) * s * .4], [x + Math.cos(a) * s * .4, y - s * .5 + Math.sin(a) * s * .4]], '#74c0fc', s * .06); } },
    leafred(c, x, y, s) { E(c, x, y - s * .5, s * .3, s * .2, '#f76707', .4); },
    kite(c, x, y, s) { P(c, [[x, y - s], [x + s * .35, y - s * .55], [x, y - s * .2], [x - s * .35, y - s * .55]], '#ff8787', '#c92a2a'); Ln(c, [[x, y - s * .2], [x + s * .1, y]], '#495057', 1.5); },
    feather(c, x, y, s) { E(c, x, y - s * .5, s * .12, s * .45, '#e9ecef', .4); Ln(c, [[x - s * .15, y - s * .1], [x + s * .15, y - s * .9]], '#adb5bd', 1.5); },
    planet(c, x, y, s) { E(c, x, y - s * .5, s * .3, s * .3, '#ffa94d'); c.beginPath(); c.ellipse(x, y - s * .5, s * .5, s * .12, -.3, 0, TAU); c.strokeStyle = '#ffd43b'; c.lineWidth = s * .05; c.stroke(); },
    book(c, x, y, s) { R(c, x - s * .45, y - s * .6, s * .9, s * .6, '#fff'); R(c, x - s * .02, y - s * .6, s * .04, s * .6, '#adb5bd'); c.strokeStyle = '#4dabf7'; c.strokeRect(x - s * .45, y - s * .6, s * .9, s * .6); },
    music(c, x, y, s) { E(c, x - s * .2, y - s * .2, s * .14, s * .1, '#495057', -.3); Ln(c, [[x - s * .07, y - s * .22], [x - s * .07, y - s * .9], [x + s * .3, y - s * .8]], '#495057', s * .06); },
  };
  return {
    keys: () => Object.keys(D),
    has: k => !!D[k],
    draw(c, key, x, y, s, t = 0) { c.save(); (D[key] || D.star)(c, x, y, s, t); c.restore(); },
  };
})();

const Scenery = (() => {
  const TAU = Math.PI * 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k)))).join(',')})`; }
  function mixA(a, b, k) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(k))).toString(16).padStart(2, '0')).join(''); }

  /* ---------- せかいの もの（いちど だけ つくる） ---------- */
  const W = (() => {
    const r = rng(20261026);
    const bld = [];
    // とおくの まち → ちかくの まち。X/D は がめんの よこの いち。みぎがわ（X/D > .18）の とおくは うみ
    const bands = [[5200, 70, 25, 140], [2600, 60, 25, 180], [1300, 55, 20, 260], [650, 45, 18, 300], [320, 40, 12, 120], [150, 34, 8, 45], [70, 30, 6, 18]];
    for (const [D0, n, w0, hmax] of bands) {
      for (let i = 0; i < n; i++) {
        const D = D0 * (0.85 + r() * .3), u = -1.3 + r() * 2.6;
        if (D > 900 && u > .18) continue;
        const tall = r() < .12;
        const z = Math.max(8, (tall ? .55 + r() * .45 : .1 + r() * .45) * hmax);
        const w = w0 * (0.6 + r() * 1.2);
        const win = [];
        const cols = Math.max(1, Math.floor(w / 6)), rows = Math.max(1, Math.floor(z / 7));
        for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) if (r() < .35) win.push([(a + .3) / cols, (b + .4) / rows]);
        bld.push({ D, X: u * D, w, z, hue: r(), roof: r() < .3, win, house: D < 200 && z < 14 });
      }
    }
    bld.sort((a, b) => b.D - a.D);
    const ships = [], cranes = [];
    for (let i = 0; i < 6; i++) ships.push({ D: 1100 + r() * 3500, u: .26 + r() * .9, big: r() < .4, sp: .002 + r() * .004, ph: r() });
    for (let i = 0; i < 5; i++) cranes.push({ D: 950 + i * 40, u: .2 + i * .045 });
    const clouds = [];
    for (let i = 0; i < 46; i++) {
      const D = 600 + Math.pow(r(), 1.6) * 16000;
      clouds.push({ D, u: -1.6 + r() * 3.2, z: 820 + r() * 420, s: 60 + r() * 220, kind: r() < .25 ? 'cloud-tower' : r() < .5 ? 'cloud-iwashi' : 'cloud-puff', drift: .002 + r() * .006, seed: r() * 100 });
    }
    const stars = [];
    for (let i = 0; i < 140; i++) stars.push({ x: r(), y: r(), s: r() < .1 ? 2 : 1, p: r() * 6 });
    const mts = [];
    for (let u = -1.4; u <= .2; u += .04) mts.push([u, 250 + (Math.sin(u * 9) * .5 + .5) * 700 + r() * 200]);
    const strata = [];
    let z = -1.5;
    while (z > -215) {
      const zone = z > -40 ? 'chika' : z > -120 ? 'mizu' : 'chiso';
      const th = zone === 'chiso' ? 1.5 + r() * 4 : 2 + r() * 5;
      const pal = zone === 'chiso' ? ['#c08552', '#e6ccb2', '#9c6644', '#ddb892', '#b56576', '#e5989b', '#6d6875', '#d4a373'] :
        zone === 'mizu' ? ['#8d7b68', '#a4907c', '#c8b6a6', '#6c757d', '#9a8c98'] : ['#7f5539', '#9c6644', '#a68a64', '#936639'];
      const kind = zone === 'mizu' ? (r() < .4 ? 'gravel' : r() < .5 ? 'clay' : 'sand') : zone === 'chiso' ? (z < -195 ? 'bedrock' : r() < .3 ? 'sand' : 'clay') : (r() < .5 ? 'clay' : 'sand');
      strata.push({ top: z, bot: z - th, col: kind === 'bedrock' ? '#5f5a6b' : pal[Math.floor(r() * pal.length)], kind, wav: r() * 6, amp: .2 + r() * .6 });
      z -= th;
    }
    const fossils = [];
    for (let i = 0; i < 40; i++) fossils.push({ z: -122 - r() * 76, u: r(), kind: r() < .45 ? 'ammonite' : r() < .5 ? 'trilobite' : 'ore', s: .5 + r() * .8, rot: r() * 6 });
    const sea = [];
    for (let i = 0; i < 260; i++) { const D = 180 * Math.pow(90, r()); sea.push({ D, u: -1.8 + r() * 3.6, z: 1385 + r() * 50, w: 60 + r() * 140, ph: r() * 6 }); }
    sea.sort((a, b) => b.D - a.D);
    const drips = [];
    for (let i = 0; i < 12; i++) drips.push({ z: -45 - r() * 75, u: r(), p: r() * 3 });
    return { bld, ships, cranes, clouds, stars, mts, strata, fossils, drips, sea };
  })();

  /* ---------- そらの いろ ---------- */
  const SKY = {
    asa:  { top: '#6fa8dc', bot: '#ffd8a8', sun: '#ffe8a3', ground: '#6b8f71', haze: '#f3d9c0' },
    hiru: { top: '#3d8bd9', bot: '#cfe9ff', sun: '#fffbe6', ground: '#7a9a6a', haze: '#d6ebf7' },
    yu:   { top: '#3b4a8a', bot: '#ff9e6d', sun: '#ffb070', ground: '#6a5a5a', haze: '#f2a98b' },
    yoru: { top: '#070b24', bot: '#1f2a52', sun: '#fff3bf', ground: '#141826', haze: '#2a3358' },
  };
  function skyColors(env, E) {
    const s = SKY[env.tod] || SKY.hiru;
    const hi = smooth(300, 2000, E);
    let top = mixA(s.top, env.tod === 'yoru' ? '#020414' : '#123a8a', hi * .8), bot = mixA(s.bot, env.tod === 'yoru' ? s.bot : '#9cc3ee', hi * .5);
    const rain = env.weather === 'ame' && E < 1400 ? 1 - smooth(800, 1400, E) : 0;
    const dull = env.weather === 'kumori' && E < 1400 ? (1 - smooth(800, 1400, E)) * .5 : 0;
    const g = rain * .75 + dull;
    if (g > 0) { top = mixA(top, env.tod === 'yoru' ? '#1a1d24' : '#8792a0', g); bot = mixA(bot, env.tod === 'yoru' ? '#2a2e38' : '#b4bcc6', g); }
    return { top, bot, sun: s.sun, ground: s.ground, haze: s.haze, rain, gray: g };
  }

  /* ========== まどの そと ========== */
  function outside(c, R, env, hits) {
    const E = env.h + 1.6;
    if (E < 0) return underground(c, R, env, hits);
    const t = env.t, f = R.h * 1.0, cx = R.x + R.w / 2;
    const pitch = Math.min(.22, Math.pow(Math.max(0, E) / 1600, .6) * .22);
    const hz = R.y + R.h * .5 - f * Math.tan(pitch);       // ちへいせん
    const py = (z, D) => hz + f * (E - z) / D;
    const px = X => cx + X * f;                            // X = よこ / きょり
    const bottom = R.y + R.h;
    const col = skyColors(env, E);
    const night = env.tod === 'yoru';
    const add = (x, y, w, h, key) => { if (hits && w > 2 && h > 2) hits.push({ x, y, w, h, key }); };

    // そら
    const sg = c.createLinearGradient(0, R.y - R.h * .3, 0, hz);
    sg.addColorStop(0, col.top); sg.addColorStop(1, col.bot);
    c.fillStyle = sg; c.fillRect(R.x, R.y, R.w, R.h);
    add(R.x, R.y, R.w, Math.max(0, hz - R.y), night ? 'sky-night' : env.tod === 'yu' ? 'sky-eve' : env.tod === 'asa' ? 'sky-morn' : 'sky-day');

    // ほし
    if (night) {
      const a = .35 + .65 * smooth(200, 1600, E) - col.gray * .8;
      if (a > 0) {
        c.fillStyle = '#fff';
        for (const s of W.stars) {
          c.globalAlpha = a * (.5 + .5 * Math.sin(t * 1.5 + s.p));
          c.fillRect(R.x + s.x * R.w, R.y + s.y * Math.max(10, hz - R.y), s.s, s.s);
        }
        c.globalAlpha = 1;
        if (a > .5) add(R.x, R.y, R.w, (hz - R.y) * .6, 'stars');
      }
    }
    // たいよう・つき
    {
      const pos = { asa: [-.7, .12], hiru: [.25, .45], yu: [.75, .1], yoru: [.55, .35] }[env.tod] || [.25, .45];
      const sx = px(pos[0]), sy = hz - f * pos[1], sr = Math.max(9, R.h * .045);
      const vis = 1 - col.gray * .9;
      if (vis > .1) {
        c.globalAlpha = vis;
        const gl = c.createRadialGradient(sx, sy, sr * .4, sx, sy, sr * 5);
        gl.addColorStop(0, night ? 'rgba(255,243,191,.35)' : 'rgba(255,250,220,.55)'); gl.addColorStop(1, 'rgba(255,250,220,0)');
        c.fillStyle = gl; c.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
        c.fillStyle = night ? '#fff3bf' : env.tod === 'yu' ? '#ff8f4d' : col.sun;
        c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
        if (night) { c.fillStyle = mixA(col.top, '#000000', .1); c.beginPath(); c.arc(sx + sr * .45, sy - sr * .2, sr * .85, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
        add(sx - sr * 1.5, sy - sr * 1.5, sr * 3, sr * 3, night ? 'moon' : 'sun');
      }
    }

    const aboveSea = E > 1400;       // くもの うえ
    // とおくの やま と ふじさん
    const fujiDraw = (baseZ) => {
      const D = 50000, u = -.22;
      const fx = px(u), fb = py(baseZ, D), ft = py(3776, D), hw = f * 22000 / D, fh = fb - ft;
      if (fh <= 1) return;
      c.fillStyle = night ? '#2b3150' : mixA('#5c6f9a', col.haze, .35);
      c.beginPath(); c.moveTo(fx - hw, fb); c.quadraticCurveTo(fx - hw * .4, fb - fh * .5, fx - hw * .1, ft); c.lineTo(fx + hw * .1, ft); c.quadraticCurveTo(fx + hw * .4, fb - fh * .5, fx + hw, fb); c.closePath(); c.fill();
      c.save(); c.clip();
      c.fillStyle = night ? '#c5cbe6' : '#ffffff';
      c.beginPath(); c.moveTo(fx - hw, ft - 2); c.lineTo(fx + hw, ft - 2);
      for (let i = 7; i >= 0; i--) c.lineTo(fx - hw + hw * 2 * i / 7, ft + fh * (i % 2 ? .22 : .34));
      c.closePath(); c.fill(); c.restore();
      add(fx - hw * .6, ft - 4, hw * 1.2, fh + 4, 'fuji');
    };
    if (!aboveSea) {
      c.fillStyle = night ? '#1b2040' : mixA('#6d82a8', col.haze, .45);
      c.beginPath(); c.moveTo(px(-1.5), py(0, 40000) + 1);
      for (const [u, z] of W.mts) c.lineTo(px(u), py(z, 40000));
      c.lineTo(px(.25), py(0, 40000) + 1); c.closePath(); c.fill();
      add(px(-1.4), py(900, 40000), f * 1.3, py(0, 40000) - py(900, 40000) + 2, 'mountains');
      if (col.gray < .5) fujiDraw(0);
    }

    if (!aboveSea) {
      // じめん
      const gy = py(0, 60000);
      const gg = c.createLinearGradient(0, gy, 0, bottom);
      gg.addColorStop(0, mixA(col.ground, col.haze, .6)); gg.addColorStop(1, col.ground);
      c.fillStyle = gg; c.fillRect(R.x, gy, R.w, bottom - gy);
      add(R.x, gy, R.w, bottom - gy, 'town');
      // うみ（みぎがわ）
      const shore = D => .18 + 300 / D;
      c.fillStyle = night ? '#0d1a3a' : mixA('#2f6db5', col.haze, .25);
      c.beginPath(); c.moveTo(px(2), py(0, 60000));
      for (let D = 60000; D >= 700; D *= .8) c.lineTo(px(shore(D)), py(0, D));
      c.lineTo(px(shore(700)), bottom + 2); c.lineTo(px(2), bottom + 2); c.closePath(); c.fill();
      const sx0 = px(shore(2000));
      add(sx0, gy, R.x + R.w - sx0, Math.min(bottom, py(0, 700)) - gy, 'sea');
      add(sx0, gy - 4, R.x + R.w - sx0, 8, 'horizon');
      // なみの きらきら
      if (!night && col.gray < .5) {
        c.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 0; i < 30; i++) {
          const D = 900 + (i * 397 % 9000), u = shore(D) + ((i * 0.137 + t * .003) % 1) * 1.2;
          const x = px(u), y = py(0, D); if (x > R.x + R.w || y > bottom) continue;
          c.fillRect(x, y, Math.max(2, 12 * f / D * 30), 1);
        }
      }
      // ふね・クレーン
      for (const s of W.ships) {
        const D = s.D, u = s.u + ((t * s.sp + s.ph) % 1) * .5, x = px(u), y = py(0, D), k = f / D;
        if (x > R.x + R.w + 50 || y > bottom + 20) continue;
        const L = (s.big ? 120 : 30) * k;
        c.fillStyle = s.big ? '#f8f9fa' : '#ffffff';
        c.fillRect(x - L / 2, y - L * .18, L, L * .18);
        if (s.big) { c.fillStyle = '#1c7ed6'; c.fillRect(x - L / 2, y - L * .06, L, L * .06); c.fillStyle = '#e9ecef'; c.fillRect(x - L * .25, y - L * .3, L * .45, L * .13); }
        else { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - L * .18); c.lineTo(x, y - L * .9); c.lineTo(x + L * .35, y - L * .18); c.fill(); }
        if (night) { c.fillStyle = '#ffd43b'; c.fillRect(x - 1, y - L * .25, 2, 2); }
        add(x - L / 2 - 4, y - L * (s.big ? .35 : .9) - 4, L + 8, L * (s.big ? .35 : .9) + 8, s.big ? 'ship-big' : 'yacht');
      }
      for (const cr of W.cranes) {
        const x = px(cr.u), y = py(0, cr.D), k = f / cr.D, H = 70 * k;
        if (y - H > bottom) continue;
        c.strokeStyle = night ? '#a33' : '#e8590c'; c.lineWidth = Math.max(1, 3 * k);
        c.beginPath(); c.moveTo(x - 8 * k, y); c.lineTo(x - 4 * k, y - H); c.moveTo(x + 8 * k, y); c.lineTo(x + 4 * k, y - H); c.moveTo(x - 25 * k, y - H); c.lineTo(x + 45 * k, y - H * .95); c.stroke();
        add(x - 25 * k, y - H - 4, 70 * k, H + 4, 'crane');
      }
      // ビル（とおく → ちかく）
      for (const b of W.bld) {
        const k = f / b.D, x = px(b.X / b.D) - b.w * k / 2, yb = py(0, b.D), yt = py(b.z, b.D), w = b.w * k;
        if (x > R.x + R.w || x + w < R.x || yt > bottom) continue;
        const shade = night ? mixA('#1e2235', '#2b3050', b.hue) : mixA(b.house ? '#f1e3d3' : '#b8c4d6', b.house ? '#e9c49a' : '#8796ad', b.hue);
        const haze = clamp01(b.D / 7000) * (night ? .2 : .55) + col.gray * .2;
        c.fillStyle = mixA(shade, col.haze, haze); c.fillRect(x, yt, w, yb - yt + 1);
        if (b.house) { c.fillStyle = night ? '#3a2d3a' : mixA('#c0504d', col.haze, haze); c.beginPath(); c.moveTo(x - w * .08, yt); c.lineTo(x + w / 2, yt - w * .35); c.lineTo(x + w * 1.08, yt); c.fill(); }
        else if (b.roof && w > 6) { c.fillStyle = mixA('#6c7a8a', col.haze, haze); c.fillRect(x + w * .3, yt - w * .12, w * .4, w * .12); }
        if (w > 3 && (night || b.D < 1400)) {
          const ws = Math.max(1, Math.min(4, w / 10));
          c.fillStyle = night ? 'rgba(255,214,107,.95)' : 'rgba(210,235,255,.6)';
          for (const [wx, wz] of b.win) c.fillRect(x + wx * w, yt + (1 - wz) * (yb - yt), ws, ws);
        }
        if (b.D < 1500 && w > 6) add(x, yt, w, yb - yt, b.house ? 'roof' : b.z > 80 ? 'tower-bldg' : 'town');
      }
      // みち・くるま・き（ひくい とき）
      if (E < 160) {
        const D = 60, yRoad = py(0, D);
        if (yRoad < bottom) {
          c.fillStyle = night ? '#1f2329' : '#6c757d'; c.fillRect(R.x, yRoad, R.w, Math.max(4, py(0, 38) - yRoad));
          add(R.x, yRoad, R.w, Math.max(4, py(0, 38) - yRoad), 'road');
          for (let i = 0; i < 6; i++) {
            const u = ((i * .37 + t * (i % 2 ? .02 : -.025)) % 2.4 + 2.4) % 2.4 - 1.2, x = px(u), k = f / 48, y = py(0, 48);
            if (y > bottom) break;
            c.fillStyle = ['#e03131', '#1c7ed6', '#fab005', '#f8f9fa', '#2f9e44', '#7950f2'][i];
            c.fillRect(x, y - 1.5 * k, 4.2 * k, 1.5 * k);
            if (night) { c.fillStyle = '#fff3bf'; c.fillRect(x + (i % 2 ? 4 * k : 0), y - 1 * k, 1.5, 1.5); }
            add(x - 4, y - 2 * k - 4, 4.2 * k + 8, 2 * k + 8, 'car');
          }
          for (let i = -6; i <= 6; i++) {
            const D2 = 32, x = px(i * .22 + .05), k = f / D2, yb = py(0, D2), yt = py(6, D2);
            if (yt > bottom) continue;
            c.fillStyle = '#5c3d1e'; c.fillRect(x - .2 * k, yt, .4 * k, yb - yt);
            c.fillStyle = night ? '#173022' : env.season === 'aki' ? '#e8590c' : '#3f8f4f';
            c.beginPath(); c.arc(x, yt, 2.2 * k, 0, TAU); c.fill();
            add(x - 2.2 * k, yt - 2.2 * k, 4.4 * k, yb - yt + 2.2 * k, i % 3 ? 'street-tree' : 'park');
            if (i % 2 === 0) {
              const xp = px(i * .22 + .16), yp = py(9, D2);
              c.fillStyle = '#868e96'; c.fillRect(xp - .12 * k, yp, .24 * k, yb - yp);
              add(xp - 6, yp, 12, yb - yp, 'pole');
              if (night) { const lg = c.createRadialGradient(xp, yp, 0, xp, yp, 3 * k); lg.addColorStop(0, 'rgba(255,214,140,.8)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = lg; c.fillRect(xp - 3 * k, yp - 3 * k, 6 * k, 6 * k); }
            }
          }
        }
      }
      // かすみ（たかい ほど とおくが かすむ）
      const hz2 = c.createLinearGradient(0, gy - 4, 0, gy + R.h * .25);
      hz2.addColorStop(0, `rgba(${hex(col.haze).join(',')},${night ? .25 : .55})`); hz2.addColorStop(1, `rgba(${hex(col.haze).join(',')},0)`);
      c.fillStyle = hz2; c.fillRect(R.x, gy - 4, R.w, R.h * .25 + 4);
    }

    // くも（ぽこぽこ）
    const cloudCol = env.weather === 'ame' ? '#c9ced6' : night ? '#3b4366' : env.tod === 'yu' ? '#ffd0b5' : '#ffffff';
    if (aboveSea) {
      // くもの うみ
      const top = 1400, yh = py(top, 1e6);
      const cg = c.createLinearGradient(0, yh, 0, bottom);
      cg.addColorStop(0, mixA(cloudCol, col.haze, .3)); cg.addColorStop(1, cloudCol);
      c.fillStyle = cg; c.fillRect(R.x, yh, R.w, bottom - yh);
      add(R.x, yh, R.w, bottom - yh, 'cloud-sea');
      // もこもこの くもの うみ（とおく → ちかく）
      const shade = night ? '#2a3150' : env.tod === 'yu' ? '#e8a48a' : '#c9d6e8';
      const lit = night ? '#56608a' : cloudCol;
      for (const p of W.sea) {
        const u = ((p.u + t * .004 + 1.8) % 3.6) - 1.8, x = px(u), y = py(p.z, p.D), k = f / p.D, w = p.w * k, h = w * .32;
        if (y - h > bottom || x + w < R.x || x - w > R.x + R.w) continue;
        if (p.D < 400) continue;
        c.fillStyle = shade; c.beginPath(); c.ellipse(x, y + h * .12, w, h * .7, 0, 0, TAU); c.fill();
        c.fillStyle = lit; c.beginPath(); c.ellipse(x, y, w * .95, h * .62, 0, 0, TAU);
        if (w > 20) { c.moveTo(x + w * .55, y - h * .2); c.arc(x + w * .25, y - h * .2, h * .5, 0, TAU); c.moveTo(x - w * .05, y - h * .1); c.arc(x - w * .3, y - h * .1, h * .42, 0, TAU); }
        c.fill();
      }
      const haze2 = c.createLinearGradient(0, yh - 2, 0, yh + R.h * .12);
      haze2.addColorStop(0, `rgba(${hex(col.haze).join(',')},.7)`); haze2.addColorStop(1, `rgba(${hex(col.haze).join(',')},0)`);
      c.fillStyle = haze2; c.fillRect(R.x, yh - 2, R.w, R.h * .12);
      fujiDraw(top);
    } else {
      for (const cl of W.clouds) {
        const D = cl.D, u = ((cl.u + t * cl.drift + 1.6) % 3.2) - 1.6, x = px(u), y = py(cl.z, D), r = cl.s * f / D;
        if (r < 1 || y + r < R.y || y - r * 2 > bottom || x + r * 3 < R.x || x - r * 3 > R.x + R.w) continue;
        if (Math.abs(E - cl.z) < 40 && D < 1500) continue;
        drawCloud(c, x, y, r, cl, cloudCol, E < cl.z, night);
        add(x - r * 1.6, y - r * (cl.kind === 'cloud-tower' ? 2.4 : 1.1), r * 3.2, r * (cl.kind === 'cloud-tower' ? 3 : 1.8), env.weather === 'ame' ? 'cloud-rain' : cl.kind);
      }
    }

    // とり・のりもの
    flyers(c, R, env, E, f, cx, hz, add);

    // にじ（あめあがり）
    if (env.rainbow && !night && E > 600 && E < 1600) {
      const rx = px(.1), ry = hz + f * .25, rr = f * .55;
      c.globalAlpha = .45;
      ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#5c7cfa', '#b197fc'].forEach((cc, i) => { c.strokeStyle = cc; c.lineWidth = f * .012; c.beginPath(); c.arc(rx, ry, rr - i * f * .012, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); });
      c.globalAlpha = 1;
      add(rx - rr, ry - rr, rr * 2, rr * .5, 'rainbow');
    }

    // くもの なか（きり）
    const fog = smooth(780, 860, E) * (1 - smooth(1340, 1420, E));
    if (fog > 0) {
      const a = fog * (env.weather === 'hare' ? .7 : .9);
      c.fillStyle = `rgba(${hex(night ? '#4a5272' : env.weather === 'ame' ? '#c3c9d1' : '#f1f3f5').join(',')},${a})`;
      c.fillRect(R.x, R.y, R.w, R.h);
      // ながれる きりの かたまり
      for (let i = 0; i < 8; i++) {
        const x = R.x + ((i * 173 + t * 40 * (1 + i % 3)) % (R.w + 300)) - 150, y = R.y + ((i * 97 + E * 3) % R.h);
        const g = c.createRadialGradient(x, y, 0, x, y, 120);
        g.addColorStop(0, `rgba(255,255,255,${.35 * fog})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - 120, y - 120, 240, 240);
      }
      if (fog > .5) add(R.x, R.y, R.w, R.h, 'fog');
    }

    // あめ
    if (env.weather === 'ame' && E < 900) {
      const a = 1 - smooth(700, 900, E);
      c.strokeStyle = `rgba(200,215,235,${.55 * a})`; c.lineWidth = 1.2;
      c.beginPath();
      const vy = 900 + Math.abs(env.v) * 10 * Math.sign(-env.v || 1);
      for (let i = 0; i < 90; i++) {
        const x = R.x + ((i * 53.7) % R.w), y = R.y + ((i * 91.3 + t * vy) % (R.h + 40)) - 20;
        c.moveTo(x, y); c.lineTo(x - 3, y + 14);
      }
      c.stroke();
      if (a > .5) add(R.x + R.w * .1, R.y + R.h * .2, R.w * .8, R.h * .1, 'rain');
    }
  }

  function drawCloud(c, x, y, r, cl, col, below, night) {
    c.fillStyle = col;
    if (cl.kind === 'cloud-tower') {
      for (let i = 0; i < 6; i++) { const k = i / 5; c.beginPath(); c.arc(x + Math.sin(i * 2.1 + cl.seed) * r * .5, y - k * r * 2, r * (1 - k * .45), 0, TAU); c.fill(); }
    } else if (cl.kind === 'cloud-iwashi') {
      for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(x - r * 1.4 + (i % 5) * r * .7, y + Math.floor(i / 5) * r * .45 - r * .2, r * .3, r * .14, 0, 0, TAU); c.fill(); }
    } else {
      [[-.7, 0, .55], [.6, 0, .6], [0, -.3, .75], [0, .1, .7]].forEach(([a, b, s]) => { c.beginPath(); c.arc(x + a * r, y + b * r, s * r, 0, TAU); c.fill(); });
    }
    if (below) { c.fillStyle = night ? 'rgba(0,0,30,.2)' : 'rgba(120,140,170,.18)'; c.beginPath(); c.ellipse(x, y + r * .3, r * 1.3, r * .3, 0, 0, TAU); c.fill(); }
  }

  function flyers(c, R, env, E, f, cx, hz, add) {
    const t = env.t;
    const list = [
      { key: 'seagull', z: 60, zr: 80, D: 120, sp: .05, n: 3, col: '#ffffff' },
      { key: 'kite', z: 380, zr: 260, D: 220, sp: .03, n: 1, col: '#7a4f2a' },
      { key: 'heli', z: 520, zr: 220, D: 700, sp: .025, n: 1 },
      { key: 'balloon', z: 760, zr: 160, D: 600, sp: .008, n: 1 },
      { key: 'birds', z: 1500, zr: 450, D: 500, sp: .02, n: 7, col: '#343a40' },
      { key: 'plane', z: 2600, zr: 900, D: 6000, sp: .02, n: 1 },
    ];
    for (const L of list) {
      if (Math.abs(E - L.z) > L.zr + 150) continue;
      if (env.tod === 'yoru' && (L.key === 'seagull' || L.key === 'kite' || L.key === 'balloon' || L.key === 'birds')) continue;
      const k = f / L.D, base = ((t * L.sp + L.z * .001) % 3) - 1.5;
      const x0 = cx + base * f, y0 = hz + f * (E - L.z) / L.D;
      if (y0 < R.y - 60 || y0 > R.y + R.h + 60) continue;
      if (L.key === 'plane') {
        const w = 40 * k;
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1.5, 1.5 * k); c.beginPath(); c.moveTo(x0 - w * 6, y0 + 1); c.lineTo(x0 - w * .5, y0 + 1); c.stroke();
        add(x0 - w * 6, y0 - 5, w * 5.5, 10, 'contrail');
        c.fillStyle = '#f8f9fa'; c.fillRect(x0 - w * .5, y0 - w * .06, w, w * .12); c.fillRect(x0 - w * .1, y0 - w * .3, w * .15, w * .6);
        add(x0 - w * .6 - 6, y0 - w * .3 - 6, w * 1.2 + 12, w * .6 + 12, 'plane');
      } else if (L.key === 'heli') {
        const w = 12 * k;
        c.fillStyle = '#e03131'; c.beginPath(); c.ellipse(x0, y0, w * .5, w * .28, 0, 0, TAU); c.fill(); c.fillRect(x0 + w * .3, y0 - w * .06, w * .7, w * .1);
        c.fillStyle = '#343a40'; const rr = Math.abs(Math.cos(t * 30)) * w * .8; c.fillRect(x0 - rr, y0 - w * .4, rr * 2, Math.max(1, w * .04));
        add(x0 - w - 6, y0 - w - 6, w * 2 + 12, w * 2 + 12, 'heli');
      } else if (L.key === 'balloon') {
        const w = 18 * k, y = y0 + Math.sin(t * .6) * 3;
        c.fillStyle = '#ff8787'; c.beginPath(); c.arc(x0, y, w * .5, 0, TAU); c.fill();
        c.fillStyle = '#ffd43b'; c.fillRect(x0 - w * .1, y - w * .5, w * .2, w);
        c.fillStyle = '#a0522d'; c.fillRect(x0 - w * .12, y + w * .62, w * .24, w * .2);
        add(x0 - w * .6 - 6, y - w * .6 - 6, w * 1.2 + 12, w * 1.5 + 12, 'balloon');
      } else {
        c.strokeStyle = L.col; c.lineWidth = Math.max(1.5, k * .15);
        for (let i = 0; i < L.n; i++) {
          const ox = L.n > 3 ? Math.abs(i - 3) * 18 : i * 30, oy = L.n > 3 ? Math.abs(i - 3) * 9 : Math.sin(t + i) * 10;
          const x = x0 - ox, y = y0 + oy, s = Math.max(4, 1.2 * k), fl = Math.sin(t * 8 + i) * .5;
          c.beginPath(); c.moveTo(x - s, y - s * fl); c.quadraticCurveTo(x - s * .4, y - s * .6, x, y); c.quadraticCurveTo(x + s * .4, y - s * .6, x + s, y - s * fl); c.stroke();
        }
        add(x0 - 70, y0 - 30, 110, 60, L.key);
      }
    }
  }

  /* ---------- ちか: ライトに てらされた ちそうの だんめん ---------- */
  function underground(c, R, env, hits) {
    const E = env.h + 1.6, t = env.t, s = R.h / 26, cy = R.y + R.h * .5;
    const yz = z => cy + (E - z) * s;
    const add = (x, y, w, h, key) => { if (hits && w > 2 && h > 2) hits.push({ x, y, w, h, key }); };
    const zTop = E + (R.h * .5) / s, zBot = E - (R.h * .5) / s;
    // そら（じめんの うえ）
    if (zTop > 0) {
      const g0 = yz(0);
      const col = skyColors(env, 0);
      const sg = c.createLinearGradient(0, R.y, 0, g0); sg.addColorStop(0, col.top); sg.addColorStop(1, col.bot);
      c.fillStyle = sg; c.fillRect(R.x, R.y, R.w, g0 - R.y);
      c.fillStyle = env.tod === 'yoru' ? '#1d3b26' : '#51a35a'; c.fillRect(R.x, g0 - 6, R.w, 7);
      add(R.x, R.y, R.w, g0 - R.y, env.tod === 'yoru' ? 'sky-night' : 'sky-day');
    }
    // ちそう
    for (const L of W.strata) {
      if (L.bot > zTop || L.top < zBot) continue;
      c.fillStyle = L.col;
      const y0 = yz(L.top), y1 = yz(L.bot);
      c.beginPath(); c.moveTo(R.x, y1 + 1);
      for (let x = 0; x <= R.w + 20; x += 20) c.lineTo(R.x + x, y0 + Math.sin(x * .02 + L.wav) * L.amp * s);
      c.lineTo(R.x + R.w, y1 + 1); c.closePath(); c.fill();
      // もよう
      if (L.kind === 'gravel') {
        c.fillStyle = 'rgba(255,255,255,.18)';
        for (let i = 0; i < 40; i++) { const x = R.x + (i * 37.3 % R.w), y = y0 + ((i * 13.7) % Math.max(1, y1 - y0)); c.beginPath(); c.arc(x, y, 1.5 + (i % 3), 0, TAU); c.fill(); }
        // ちかすい の きらめき
        c.fillStyle = `rgba(116,192,252,${.25 + .1 * Math.sin(t * 2)})`; c.fillRect(R.x, y0 + (y1 - y0) * .3, R.w, (y1 - y0) * .5);
      } else if (L.kind === 'sand') {
        c.fillStyle = 'rgba(255,255,255,.12)';
        for (let i = 0; i < 50; i++) c.fillRect(R.x + (i * 29.1 % R.w), y0 + ((i * 7.3) % Math.max(1, y1 - y0)), 1.5, 1.5);
      } else if (L.kind === 'bedrock') {
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(R.x + i * R.w / 8, y0); c.lineTo(R.x + i * R.w / 8 + 20, y1); c.stroke(); }
      }
      add(R.x, y0, R.w, y1 - y0, L.kind === 'gravel' ? 'gravel' : L.kind === 'sand' ? 'sand' : L.kind === 'bedrock' ? 'bedrock' : 'clay');
    }
    // ねっこ・みみず・だんごむし・もぐら（あさい ところ）
    if (zTop > -8) {
      c.strokeStyle = '#6b4226'; c.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x0 = R.x + R.w * (.1 + i * .2);
        c.beginPath(); c.moveTo(x0, yz(0)); c.quadraticCurveTo(x0 + 20, yz(-1.2), x0 - 10 + i * 4, yz(-2.6 - i % 2)); c.stroke();
        add(x0 - 15, yz(0), 30, yz(-2.5) - yz(0), 'pillbug');
      }
      const wx = R.x + R.w * .62 + Math.sin(t * .5) * 10, wy = yz(-1.4);
      c.strokeStyle = '#f4a3a8'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
      for (let i = 0; i < 8; i++) c.lineTo(wx + i * 5, wy + Math.sin(i + t * 3) * 3); c.stroke();
      c.fillStyle = '#868e96'; c.beginPath(); c.arc(R.x + R.w * .3, yz(-.8), 5, 0, TAU); c.fill();
      add(R.x + R.w * .3 - 10, yz(-.8) - 10, 20, 20, 'pillbug');
      // もぐらの トンネル
      c.fillStyle = 'rgba(40,25,15,.55)'; c.beginPath(); c.ellipse(R.x + R.w * .82, yz(-3.2), 26, 10, .1, 0, TAU); c.fill();
      c.fillStyle = '#5c4033'; c.beginPath(); c.arc(R.x + R.w * .82 + 10, yz(-3.2), 7, 0, TAU); c.fill();
      add(R.x + R.w * .82 - 26, yz(-3.2) - 12, 52, 24, 'mole');
    }
    // すいどうかん・ケーブル
    const pipes = [{ z: -3, col: '#4c6ef5', key: 'pipe', r: .5 }, { z: -5.5, col: '#212529', key: 'cable', r: .25 }, { z: -6.2, col: '#f08c00', key: 'cable', r: .2 }, { z: -48, col: '#3b5bdb', key: 'pipe', r: 1.4 }, { z: -73, col: '#364fc7', key: 'pipe', r: 1.8 }];
    for (const p of pipes) {
      if (p.z < zBot - 3 || p.z > zTop + 3) continue;
      const y = yz(p.z), h = p.r * 2 * s;
      const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, p.col); g.addColorStop(.4, mixA(p.col, '#ffffff', .35)); g.addColorStop(1, p.col);
      c.fillStyle = g; c.fillRect(R.x, y - h / 2, R.w, h);
      c.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = R.x + 30; x < R.x + R.w; x += 90) c.fillRect(x, y - h / 2 - 2, 6, h + 4);
      add(R.x, y - h / 2 - 4, R.w, h + 8, p.key);
    }
    // ちかがい（B3〜B4）
    if (zTop > -18 && zBot < -10) {
      const y0 = yz(-10.5), y1 = yz(-16.5);
      c.fillStyle = '#f1f3f5'; c.fillRect(R.x + R.w * .05, y0, R.w * .9, y1 - y0);
      for (let i = 0; i < 4; i++) {
        const x = R.x + R.w * (.08 + i * .22);
        c.fillStyle = ['#ffe066', '#ffc9c9', '#b2f2bb', '#a5d8ff'][i]; c.fillRect(x, y0 + (y1 - y0) * .3, R.w * .18, (y1 - y0) * .55);
        c.fillStyle = ['#f08c00', '#e03131', '#2f9e44', '#1c7ed6'][i]; c.fillRect(x, y0 + (y1 - y0) * .15, R.w * .18, (y1 - y0) * .12);
      }
      c.fillStyle = 'rgba(255,249,219,.9)'; for (let x = R.x + R.w * .1; x < R.x + R.w * .95; x += 50) c.fillRect(x, y0 + 3, 26, 4);
      add(R.x + R.w * .05, y0, R.w * .9, y1 - y0, 'lamp');
    }
    // ちかてつの トンネル（B6〜B8）
    {
      const zc = -27, rr = 4.2;
      if (zc - rr < zTop && zc + rr > zBot) {
        const y = yz(zc), h = rr * s;
        c.fillStyle = '#495057'; c.beginPath(); c.ellipse(R.x + R.w / 2, y, R.w * .7, h, 0, 0, TAU); c.fill();
        c.fillStyle = '#212529'; c.beginPath(); c.ellipse(R.x + R.w / 2, y, R.w * .66, h * .86, 0, 0, TAU); c.fill();
        c.fillStyle = '#868e96'; c.fillRect(R.x, y + h * .55, R.w, 4);
        add(R.x, y + h * .45, R.w, h * .3, 'rail');
        // でんしゃが ときどき とおる
        const ph = (t % 14) / 14;
        if (ph < .35) {
          const tx = R.x - R.w * 1.5 + ph / .35 * R.w * 3.5, th = h * 1.1;
          c.fillStyle = '#e7f5ff'; c.fillRect(tx, y - th * .45, R.w * 1.4, th);
          c.fillStyle = '#1c7ed6'; c.fillRect(tx, y + th * .25, R.w * 1.4, th * .12);
          c.fillStyle = '#ffe066'; for (let i = 0; i < 8; i++) c.fillRect(tx + 12 + i * R.w * .17, y - th * .3, R.w * .1, th * .3);
          add(tx, y - th * .45, R.w * 1.4, th, 'rail');
        }
      }
    }
    // かせき・こうせき
    for (const fo of W.fossils) {
      if (fo.z < zBot - 2 || fo.z > zTop + 2) continue;
      const x = R.x + R.w * (.08 + fo.u * .84), y = yz(fo.z), sz = s * 1.2 * fo.s;
      if (fo.kind === 'ammonite') {
        c.fillStyle = 'rgba(240,220,190,.85)'; c.beginPath(); c.arc(x, y, sz, 0, TAU); c.fill();
        c.strokeStyle = '#7a5c3a'; c.lineWidth = 2; c.beginPath();
        for (let a = 0; a < TAU * 2.3; a += .2) { const r = sz * .9 * Math.exp(-a * .28); c.lineTo(x + Math.cos(a + fo.rot) * r, y + Math.sin(a + fo.rot) * r); }
        c.stroke();
      } else if (fo.kind === 'trilobite') {
        c.fillStyle = 'rgba(120,95,75,.9)'; c.beginPath(); c.ellipse(x, y, sz * .55, sz * .8, fo.rot, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(240,220,190,.7)'; c.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x - sz * .5, y + i * sz * .25); c.lineTo(x + sz * .5, y + i * sz * .25); c.stroke(); }
      } else {
        const sp = .6 + .4 * Math.sin(t * 3 + fo.rot);
        c.fillStyle = `rgba(190,170,255,${sp})`; c.beginPath(); c.moveTo(x, y - sz); c.lineTo(x + sz * .5, y); c.lineTo(x, y + sz * .6); c.lineTo(x - sz * .5, y); c.fill();
      }
      add(x - sz - 4, y - sz - 4, sz * 2 + 8, sz * 2 + 8, fo.kind);
    }
    // しずく
    for (const d of W.drips) {
      if (d.z < zBot || d.z > zTop + 4) continue;
      const x = R.x + R.w * d.u, ph = ((t + d.p) % 2.4) / 2.4, y = yz(d.z) + ph * s * 3;
      c.fillStyle = `rgba(165,216,255,${1 - ph})`; c.beginPath(); c.ellipse(x, y, 2.5, 4, 0, 0, TAU); c.fill();
    }
    // ライト（まんなかが あかるく、まわりは ほんのり）
    const lg = c.createRadialGradient(R.x + R.w / 2, cy, R.h * .15, R.x + R.w / 2, cy, Math.max(R.w, R.h) * .75);
    lg.addColorStop(0, 'rgba(255,240,200,.12)'); lg.addColorStop(.6, 'rgba(20,12,30,.1)'); lg.addColorStop(1, 'rgba(20,12,30,.55)');
    c.fillStyle = lg; c.fillRect(R.x, Math.max(R.y, zTop > 0 ? yz(0) : R.y), R.w, R.h);
    // ちかの かべの ライト
    for (let z = Math.ceil(zBot / 8) * 8; z < Math.min(0, zTop); z += 8) {
      const y = yz(z);
      for (const ux of [.04, .96]) {
        const x = R.x + R.w * ux;
        const g = c.createRadialGradient(x, y, 0, x, y, s * 3);
        g.addColorStop(0, 'rgba(255,230,160,.65)'); g.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = g; c.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
        c.fillStyle = '#fff3bf'; c.fillRect(x - 3, y - 2, 6, 4);
      }
    }
    add(R.x, cy - 10, 30, 20, 'lamp');
  }

  /* ---------- スピードせん ---------- */
  function speedLines(c, R, v, t) {
    const sp = Math.abs(v);
    if (sp < 12) return;
    const a = Math.min(.55, (sp - 12) / 160);
    c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2;
    c.beginPath();
    const dir = Math.sign(v);
    for (let i = 0; i < 26; i++) {
      const x = R.x + ((i * 61.7) % R.w);
      const L = 30 + (i % 5) * 20 + sp * .4;
      const y = R.y + (((i * 47.3) + t * sp * 6 * dir) % (R.h + L) + (R.h + L)) % (R.h + L) - L;
      if (Math.abs(x - (R.x + R.w / 2)) < R.w * .18) continue;
      c.moveTo(x, y); c.lineTo(x, y + L);
    }
    c.stroke();
  }

  /* ========== ホール ========== */
  function hall(c, R, fl, env) {
    const t = env.t, z = Floors.zone(fl.zone), dk = env.tod === 'yoru';
    const wy = R.y + R.h * .72;       // ゆかの たかさ
    const g = c.createLinearGradient(0, R.y, 0, wy);
    g.addColorStop(0, z.wall[0]); g.addColorStop(1, z.wall[1]);
    c.fillStyle = g; c.fillRect(R.x, R.y, R.w, wy - R.y);
    // ゾーンの かべ
    const r = rng(fl.deco.seed);
    if (fl.zone === 'chiso') {
      for (let i = 0; i < 9; i++) { c.fillStyle = ['#7f5539', '#9c6644', '#b08968', '#6f4e37', '#a98467'][i % 5]; c.fillRect(R.x, R.y + i * (wy - R.y) / 9, R.w, (wy - R.y) / 9 + 1); }
      for (let i = 0; i < 4; i++) Props.draw(c, i % 2 ? 'fossil' : 'crystal', R.x + R.w * (.08 + r() * .84), R.y + (wy - R.y) * (.3 + r() * .5), R.h * .08, t);
    } else if (fl.zone === 'mizu') {
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1;
      for (let x = R.x; x < R.x + R.w; x += 28) { c.beginPath(); c.moveTo(x, R.y); c.lineTo(x, wy); c.stroke(); }
      for (let y = R.y; y < wy; y += 28) { c.beginPath(); c.moveTo(R.x, y); c.lineTo(R.x + R.w, y); c.stroke(); }
      c.fillStyle = '#4c6ef5'; c.fillRect(R.x, R.y + (wy - R.y) * .15, R.w, R.h * .035);
      for (let i = 0; i < 6; i++) { const ph = ((t * .7 + i * .37) % 1); c.fillStyle = `rgba(165,216,255,${1 - ph})`; c.beginPath(); c.ellipse(R.x + R.w * (.1 + i * .16), R.y + (wy - R.y) * (.22 + ph * .7), 3, 5, 0, 0, TAU); c.fill(); }
    } else if (fl.zone === 'chika') {
      c.fillStyle = '#dee2e6'; for (let x = R.x; x < R.x + R.w; x += 44) c.fillRect(x, R.y, 42, wy - R.y);
      c.fillStyle = '#1c7ed6'; c.fillRect(R.x, R.y + (wy - R.y) * .12, R.w, R.h * .06);
      c.fillStyle = '#fff'; c.font = `bold ${Math.round(R.h * .035)}px sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('ちかてつ のりば →', R.x + 12, R.y + (wy - R.y) * .12 + R.h * .03);
    } else {
      // まど（そとの けしきが すこし みえる）
      const n = Math.max(2, Math.round(R.w / 180));
      for (let i = 0; i < n; i++) {
        const x = R.x + R.w * (i + .1) / n, w = R.w / n * .8, y = R.y + (wy - R.y) * .12, h = (wy - R.y) * .55;
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
        outside(c, { x: R.x, y, w: R.w, h: R.h * .9 }, Object.assign({}, env, { h: fl.h, v: 0 }), null);
        c.restore();
        c.strokeStyle = '#868e96'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
      }
    }
    // ゆか
    const fg = c.createLinearGradient(0, wy, 0, R.y + R.h);
    fg.addColorStop(0, z.floor); fg.addColorStop(1, mixA(z.floor, '#000000', .3));
    c.fillStyle = fg; c.fillRect(R.x, wy, R.w, R.y + R.h - wy);
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 1; i < 6; i++) c.fillRect(R.x, wy + (R.y + R.h - wy) * i / 6, R.w, 1);
    // あかり
    for (let i = 0; i < fl.deco.lamps; i++) {
      const x = R.x + R.w * (i + .5) / fl.deco.lamps, y = R.y + 6;
      const lg = c.createRadialGradient(x, y, 0, x, y, R.h * .35);
      lg.addColorStop(0, `rgba(${hex(z.light).join(',')},.35)`); lg.addColorStop(1, `rgba(${hex(z.light).join(',')},0)`);
      c.fillStyle = lg; c.fillRect(x - R.h * .35, y, R.h * .7, R.h * .35);
    }
    if (dk && fl.n > 0) { c.fillStyle = 'rgba(10,14,40,.18)'; c.fillRect(R.x, R.y, R.w, R.h); }
  }

  /* エレベーターの ドア（ホールがわ・かごがわ どちらでも）。open 0..1 */
  function doors(c, x, y, w, h, open, inside, col = '#ced4da') {
    c.fillStyle = inside || '#212529'; c.fillRect(x, y, w, h);
    const half = w / 2, off = open * half * .96;
    for (const side of [-1, 1]) {
      const dx = side < 0 ? x - off : x + half + off;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      const g = c.createLinearGradient(dx, 0, dx + half, 0);
      g.addColorStop(0, mixA(col, '#000000', .15)); g.addColorStop(.5, mixA(col, '#ffffff', .4)); g.addColorStop(1, mixA(col, '#000000', .15));
      c.fillStyle = g; c.fillRect(dx, y, half, h);
      c.fillStyle = 'rgba(165,216,255,.35)'; c.fillRect(dx + half * .2, y + h * .1, half * .6, h * .5);
      c.restore();
    }
    c.strokeStyle = '#495057'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
  }

  return { outside, speedLines, hall, doors, mix: mixA, smooth };
})();
