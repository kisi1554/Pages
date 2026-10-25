"use strict";

/* ことば どおり げきじょう の アニメ。SVG を コードで かいて、Web Animations で うごかす。
   がめんは viewBox 0 0 320 220。じめんは y=170。
   キャラ（sprite）は「足もと の まんなか」が (0,0)。G() で おいて、data-a の なまえ で うごかす。 */
const Scenes = (() => {
  const W = 320, H = 220, GY = 170;

  /* ---------- かきかた の 道具 ---------- */
  // おく: そとの g が いち、なかの g（data-a）が アニメ用
  function G(a, x, y, inner, origin) {
    return `<g transform="translate(${x} ${y})"><g data-a="${a}" style="transform-box:fill-box;transform-origin:${origin || "50% 100%"}">${inner}</g></g>`;
  }
  const eyes = (x, y, gap, r) => `<circle cx="${x - gap}" cy="${y}" r="${r || 2}" fill="#222"/><circle cx="${x + gap}" cy="${y}" r="${r || 2}" fill="#222"/>`;
  const smile = (x, y, w) => `<path d="M${x - w},${y} q${w},${w * .9} ${w * 2},0" stroke="#222" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  const cheek = (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="#ff8fa3" opacity=".6"/>`;

  function bg(sky, ground, extra) {
    return `<rect width="${W}" height="${H}" fill="${sky || "#cfeefe"}"/>` +
      `<rect y="${GY}" width="${W}" height="${H - GY}" fill="${ground || "#9ad07a"}"/>` + (extra || "");
  }
  const sun = (x, y) => `<g><circle cx="${x}" cy="${y}" r="16" fill="#ffd43b"/><circle cx="${x}" cy="${y}" r="22" fill="#ffd43b" opacity=".3"/></g>`;
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})" fill="#fff"><ellipse cx="0" cy="0" rx="20" ry="10"/><ellipse cx="14" cy="-6" rx="13" ry="10"/><ellipse cx="-12" cy="-4" rx="11" ry="8"/></g>`;
  const grass = (x) => `<path d="M${x},${GY} l3,-9 l2,9 l3,-7 l2,7" stroke="#5c940d" stroke-width="2" fill="none"/>`;

  /* ---------- キャラ ---------- */
  const SP = {
    monkey: (p) => `
      <path d="M12,-14 q20,4 16,-18" stroke="#8d5524" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="-20" rx="14" ry="17" fill="#8d5524"/>
      <ellipse cx="0" cy="-17" rx="8" ry="10" fill="#f2c9a0"/>
      <ellipse cx="-8" cy="-2" rx="7" ry="4" fill="#8d5524"/><ellipse cx="8" cy="-2" rx="7" ry="4" fill="#8d5524"/>
      <g data-a="${p}arm" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M-12,-28 q-10,-14 -4,-26" stroke="#8d5524" stroke-width="5" fill="none" stroke-linecap="round"/></g>
      <path d="M12,-28 q10,-14 4,-26" stroke="#8d5524" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="-13" cy="-50" r="5" fill="#f2c9a0"/><circle cx="13" cy="-50" r="5" fill="#f2c9a0"/>
      <circle cx="0" cy="-48" r="13" fill="#8d5524"/>
      <ellipse cx="0" cy="-45" rx="10" ry="9" fill="#f2c9a0"/>
      ${eyes(0, -48, 4)}${smile(-3, -42, 3)}`,
    cat: (p, c) => `
      <path d="M14,-8 q20,-2 16,-26" stroke="${c || "#f59f00"}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="-16" rx="16" ry="16" fill="${c || "#f59f00"}"/>
      <ellipse cx="0" cy="-12" rx="9" ry="10" fill="#fff4e0"/>
      <ellipse cx="-8" cy="-2" rx="6" ry="4" fill="#fff4e0"/><ellipse cx="8" cy="-2" rx="6" ry="4" fill="#fff4e0"/>
      <g data-a="${p}head" style="transform-box:fill-box;transform-origin:50% 90%">
        <path d="M-15,-44 l3,-16 l10,10 z M15,-44 l-3,-16 l-10,10 z" fill="${c || "#f59f00"}"/>
        <circle cx="0" cy="-40" r="15" fill="${c || "#f59f00"}"/>
        ${eyes(0, -42, 5, 2.3)}
        <path d="M-2,-36 l2,2 l2,-2" stroke="#222" stroke-width="1.4" fill="none"/>
        <path d="M-8,-36 h-10 M-8,-34 l-9,3 M8,-36 h10 M8,-34 l9,3" stroke="#555" stroke-width="1"/>
      </g>`,
    pig: () => `
      <ellipse cx="0" cy="-18" rx="24" ry="16" fill="#ffa8b8"/>
      <rect x="-16" y="-8" width="6" height="8" rx="2" fill="#f783ac"/><rect x="10" y="-8" width="6" height="8" rx="2" fill="#f783ac"/>
      <path d="M-24,-20 q-8,-4 -6,4" stroke="#f783ac" stroke-width="2" fill="none"/>
      <circle cx="20" cy="-28" r="13" fill="#ffa8b8"/>
      <path d="M14,-40 l2,-8 l6,6 z M24,-40 l4,-7 l3,8 z" fill="#f783ac"/>
      <ellipse cx="31" cy="-26" rx="6" ry="5" fill="#f783ac"/><circle cx="29.5" cy="-26" r="1.2" fill="#a61e4d"/><circle cx="32.5" cy="-26" r="1.2" fill="#a61e4d"/>
      <circle cx="17" cy="-31" r="2" fill="#222"/><circle cx="24" cy="-32" r="2" fill="#222"/>`,
    dog: (p) => `
      <path d="M-20,-24 q-10,-10 -6,-18" stroke="#c08552" stroke-width="5" fill="none" stroke-linecap="round" data-a="${p}tail"/>
      <ellipse cx="0" cy="-20" rx="22" ry="12" fill="#c08552"/>
      <g data-a="${p}legs"><rect x="-16" y="-12" width="6" height="12" rx="3" fill="#a0673a"/><rect x="10" y="-12" width="6" height="12" rx="3" fill="#a0673a"/></g>
      <circle cx="22" cy="-32" r="12" fill="#c08552"/>
      <ellipse cx="16" cy="-30" rx="5" ry="9" fill="#7a4a24"/>
      <ellipse cx="32" cy="-29" rx="5" ry="4" fill="#fff4e0"/><circle cx="35" cy="-31" r="2.2" fill="#222"/>
      <circle cx="25" cy="-35" r="2" fill="#222"/>`,
    horse: (p) => `
      <rect x="-26" y="-16" width="6" height="16" fill="#7a4a24"/><rect x="16" y="-16" width="6" height="16" fill="#7a4a24"/>
      <rect x="-18" y="-16" width="6" height="16" fill="#8d5524"/><rect x="8" y="-16" width="6" height="16" fill="#8d5524"/>
      <ellipse cx="-2" cy="-26" rx="30" ry="14" fill="#a0673a"/>
      <g data-a="${p}tail" style="transform-box:fill-box;transform-origin:100% 0%"><path d="M-30,-30 q-12,6 -10,24" stroke="#4a2c12" stroke-width="6" fill="none" stroke-linecap="round"/></g>
      <g data-a="${p}head" style="transform-box:fill-box;transform-origin:0% 100%">
        <path d="M20,-30 L34,-56 L46,-52 L32,-24 z" fill="#a0673a"/>
        <ellipse cx="44" cy="-50" rx="12" ry="8" fill="#a0673a" transform="rotate(25 44 -50)"/>
        <path d="M33,-58 l2,-10 l5,8 z" fill="#8d5524"/>
        <path d="M24,-36 l10,-22" stroke="#4a2c12" stroke-width="5"/>
        <circle cx="40" cy="-54" r="2" fill="#222"/>
      </g>`,
    kappa: () => `
      <ellipse cx="0" cy="-18" rx="14" ry="16" fill="#40c057"/>
      <ellipse cx="0" cy="-20" rx="12" ry="14" fill="#a9844f" opacity=".85"/>
      <circle cx="0" cy="-42" r="13" fill="#40c057"/>
      <ellipse cx="0" cy="-54" rx="10" ry="3.5" fill="#e9ecef" stroke="#adb5bd"/>
      <path d="M-11,-52 l-3,-4 M-6,-55 l-1,-5 M6,-55 l1,-5 M11,-52 l3,-4" stroke="#2b8a3e" stroke-width="2"/>
      ${eyes(0, -44, 5, 2)}
      <path d="M-5,-37 h10 l-5,5 z" fill="#ffd43b"/>`,
    frog: (p, c) => `
      <ellipse cx="0" cy="-12" rx="18" ry="12" fill="${c || "#51cf66"}"/>
      <ellipse cx="-12" cy="-2" rx="8" ry="3" fill="${c || "#51cf66"}"/><ellipse cx="12" cy="-2" rx="8" ry="3" fill="${c || "#51cf66"}"/>
      <circle cx="-8" cy="-24" r="6" fill="${c || "#51cf66"}"/><circle cx="8" cy="-24" r="6" fill="${c || "#51cf66"}"/>
      <circle cx="-8" cy="-25" r="3.6" fill="#fff"/><circle cx="8" cy="-25" r="3.6" fill="#fff"/>
      <circle cx="-8" cy="-25" r="1.8" fill="#222"/><circle cx="8" cy="-25" r="1.8" fill="#222"/>
      ${smile(-6, -13, 6)}`,
    tadpole: () => `<ellipse cx="0" cy="-6" rx="8" ry="6" fill="#343a40"/><path d="M7,-6 q10,-6 16,0 q-6,5 -16,0" fill="#343a40"/><circle cx="-3" cy="-8" r="1.6" fill="#fff"/>`,
    oni: (p) => `
      <rect x="-12" y="-18" width="9" height="18" rx="3" fill="#e03131"/><rect x="3" y="-18" width="9" height="18" rx="3" fill="#e03131"/>
      <rect x="-16" y="-26" width="32" height="12" fill="#ffd43b"/><path d="M-12,-26 l4,12 M-2,-26 l4,12 M8,-26 l4,12" stroke="#222" stroke-width="2.4"/>
      <ellipse cx="0" cy="-40" rx="18" ry="18" fill="#e03131"/>
      <circle cx="0" cy="-66" r="14" fill="#e03131"/>
      <path d="M-14,-74 q4,-12 18,-6 q-8,-10 -18,-4 z" fill="#343a40"/>
      <path d="M-8,-78 l-3,-12 l7,8 z M8,-78 l3,-12 l-7,8 z" fill="#fff4e0" stroke="#adb5bd"/>
      ${eyes(0, -67, 5, 2.4)}
      <path d="M-6,-59 h12" stroke="#222" stroke-width="2"/><path d="M-5,-59 l2,3 l2,-3 M1,-59 l2,3 l2,-3" fill="#fff"/>`,
    kid: (p, c, hair) => `
      <rect x="-9" y="-16" width="7" height="16" rx="3" fill="#495057"/><rect x="2" y="-16" width="7" height="16" rx="3" fill="#495057"/>
      <rect x="-13" y="-40" width="26" height="26" rx="9" fill="${c || "#4dabf7"}"/>
      <g data-a="${p}arm" style="transform-box:fill-box;transform-origin:0% 0%"><rect x="11" y="-38" width="7" height="20" rx="3.5" fill="${c || "#4dabf7"}"/><circle cx="14.5" cy="-18" r="4" fill="#ffd8a8"/></g>
      <rect x="-18" y="-38" width="7" height="20" rx="3.5" fill="${c || "#4dabf7"}"/><circle cx="-14.5" cy="-18" r="4" fill="#ffd8a8"/>
      <g data-a="${p}head" style="transform-box:fill-box;transform-origin:50% 100%">
        <circle cx="0" cy="-54" r="14" fill="#ffd8a8"/>
        <path d="M-14,-56 q2,-16 14,-14 q12,-2 14,14 q-6,-8 -14,-8 q-8,0 -14,8 z" fill="${hair || "#343a40"}"/>
        <g data-a="${p}face">${eyes(0, -54, 5, 2)}${smile(-3, -48, 3)}</g>
        ${cheek(-9, -49)}${cheek(9, -49)}
      </g>`,
    monk: () => `
      <path d="M-18,0 l6,-40 h24 l6,40 z" fill="#5f3dc4"/>
      <path d="M-10,-40 l20,26" stroke="#f59f00" stroke-width="5"/>
      <circle cx="0" cy="-52" r="13" fill="#ffd8a8"/>
      <path d="M-5,-53 h4 M1,-53 h4" stroke="#222" stroke-width="1.6"/>${smile(-3, -47, 3)}
      <rect x="-6" y="-30" width="12" height="9" rx="2" fill="#fff4e0" stroke="#adb5bd"/>`,
    bee: () => `
      <ellipse cx="-4" cy="-14" rx="6" ry="8" fill="#e7f5ff" opacity=".9"/><ellipse cx="4" cy="-14" rx="6" ry="8" fill="#e7f5ff" opacity=".9"/>
      <ellipse cx="0" cy="-6" rx="10" ry="7" fill="#ffd43b"/>
      <path d="M-3,-12 v12 M3,-12 v12" stroke="#222" stroke-width="2.4"/>
      <path d="M10,-6 l5,0" stroke="#222" stroke-width="1.6"/><circle cx="-7" cy="-8" r="1.4" fill="#222"/>`,
    hawk: (p) => `
      <path d="M-4,-8 l-10,10 h14 z" fill="#5c3d1e"/>
      <g data-a="${p}wl" style="transform-box:fill-box;transform-origin:100% 30%"><path d="M-6,-30 q-30,0 -34,12 q16,0 32,8 z" fill="#7a4a24"/></g>
      <g data-a="${p}wr" style="transform-box:fill-box;transform-origin:0% 30%"><path d="M6,-30 q30,0 34,12 q-16,0 -32,8 z" fill="#7a4a24"/></g>
      <ellipse cx="0" cy="-20" rx="12" ry="16" fill="#8d5524"/>
      <ellipse cx="0" cy="-15" rx="7" ry="10" fill="#f1e3c8"/>
      <circle cx="0" cy="-40" r="10" fill="#8d5524"/>
      <path d="M6,-42 l9,3 l-7,5 z" fill="#ffd43b"/>
      <circle cx="3" cy="-43" r="2.2" fill="#fff"/><circle cx="3.5" cy="-43" r="1.2" fill="#222"/>
      <g data-a="${p}claw" style="opacity:0"><path d="M-6,-4 l-3,6 M-4,-4 l0,7 M4,-4 l0,7 M6,-4 l3,6" stroke="#ffd43b" stroke-width="2.4" stroke-linecap="round"/></g>`,
    rabbit: (c) => `
      <ellipse cx="0" cy="-12" rx="14" ry="11" fill="${c || "#fff"}" stroke="#ced4da"/>
      <circle cx="-13" cy="-12" r="4" fill="#fff" stroke="#ced4da"/>
      <circle cx="12" cy="-22" r="9" fill="${c || "#fff"}" stroke="#ced4da"/>
      <ellipse cx="9" cy="-38" rx="3.5" ry="11" fill="${c || "#fff"}" stroke="#ced4da"/><ellipse cx="16" cy="-37" rx="3.5" ry="11" fill="${c || "#fff"}" stroke="#ced4da"/>
      <circle cx="15" cy="-24" r="1.8" fill="#e03131"/>`,
    daruma: () => `
      <ellipse cx="0" cy="-26" rx="24" ry="26" fill="#e03131"/>
      <ellipse cx="0" cy="-34" rx="14" ry="12" fill="#fff4e0"/>
      <circle cx="-5" cy="-36" r="3.4" fill="#fff" stroke="#222"/><circle cx="5" cy="-36" r="3.4" fill="#fff" stroke="#222"/>
      <circle cx="-5" cy="-36" r="1.6" fill="#222"/><circle cx="5" cy="-36" r="1.6" fill="#222"/>
      <path d="M-11,-43 q5,-4 9,0 M2,-43 q5,-4 9,0" stroke="#222" stroke-width="2" fill="none"/>
      <path d="M-8,-27 q8,-4 16,0" stroke="#222" stroke-width="1.6" fill="none"/>
      <path d="M-14,-12 q14,6 28,0" stroke="#ffd43b" stroke-width="3" fill="none"/>`,
    suppon: () => `
      <ellipse cx="0" cy="-9" rx="22" ry="10" fill="#5c940d"/>
      <ellipse cx="0" cy="-10" rx="16" ry="6" fill="#74b816"/>
      <path d="M20,-10 q10,-2 12,-8 q4,2 2,7 q-4,4 -14,4" fill="#82c91e"/>
      <circle cx="31" cy="-15" r="1.4" fill="#222"/>
      <ellipse cx="-14" cy="-1" rx="6" ry="2.5" fill="#82c91e"/><ellipse cx="14" cy="-1" rx="6" ry="2.5" fill="#82c91e"/>`,
  };
  // もの
  const tree = (x, h, c) => `<rect x="${x - 9}" y="${GY - h}" width="18" height="${h}" fill="#8d5524"/>
    <circle cx="${x}" cy="${GY - h - 10}" r="38" fill="${c || "#51cf66"}"/><circle cx="${x - 30}" cy="${GY - h + 8}" r="24" fill="${c || "#51cf66"}"/><circle cx="${x + 30}" cy="${GY - h + 6}" r="26" fill="${c || "#51cf66"}"/>`;
  const koban = () => `<ellipse cx="0" cy="-14" rx="12" ry="16" fill="#fcc419" stroke="#e67700" stroke-width="2"/><path d="M-6,-24 h12 M-6,-14 h12 M-6,-4 h12" stroke="#e67700" stroke-width="1.6"/>`;
  const sparkle = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s || 1})" d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 z" fill="#fff59d"/>`;
  const qmark = () => `<text x="0" y="0" font-size="28" font-weight="900" fill="#e8590c" text-anchor="middle">？</text>`;
  const stars = () => [0, 120, 240].map((d) => `<g transform="rotate(${d})"><path transform="translate(14 0)" d="M0,-5 L1.5,-1.5 L5,0 L1.5,1.5 L0,5 L-1.5,1.5 L-5,0 L-1.5,-1.5 z" fill="#fcc419"/></g>`).join("");
  const drop = (c) => `<path d="M0,-12 q6,8 6,12 a6,6 0 0 1 -12,0 q0,-4 6,-12 z" fill="${c || "#4dabf7"}"/>`;
  const tear = () => `<path d="M0,-6 q3,4 3,6 a3,3 0 0 1 -6,0 q0,-2 3,-6 z" fill="#74c0fc"/>`;

  /* ---------- 30 の ばめん ---------- */
  const L = {};

  L.saru = {
    svg: () => bg("#cfeefe", "#9ad07a", sun(280, 34) + tree(110, 90)) +
      `<path d="M120,${GY - 78} h70" stroke="#8d5524" stroke-width="9" stroke-linecap="round"/>` +
      G("m", 175, GY - 82, SP.monkey("m-"), "50% 50%") + G("st", 150, GY - 30, stars(), "50% 50%") + grass(60) + grass(250),
    run(p) {
      p.hide("st");
      p.say(0, "する する…… きのぼり じょうず");
      p.a("m", [[0, 0], [0, -3, -6], [0, 0, 6], [0, -3, -6], [0, 0]], 1200, 0, { iterations: 1 });
      p.a("m-arm", [[0, 0, 0], [0, 0, -40], [0, 0, 0]], 600, 0, { iterations: 2 });
      p.fx(1300, "slip"); p.say(1300, "あっ！ つるっ！");
      p.a("m", [[0, 0, 0], [6, -6, 30, 1, 1, .2], [12, 96, 100]], 700, 1300, { easing: "ease-in" });
      p.fx(2000, "thud"); p.say(2000, "どしーん！");
      p.a("m", [[12, 96, 100], [14, 88, 92, 1, 1, .5], [14, 96, 90]], 300, 2000);
      p.show(2100, "st"); p.a("st", [[0, 0, 0], [0, 0, 360]], 900, 2100, { iterations: 3 });
      p.bubble(2600, 230, 140, "さるも しっぱい！", 2200);
    },
    len: 4600,
  };

  L.kappa = {
    svg: () => bg("#cfeefe", "#9ad07a", cloud(60, 40) + sun(270, 36)) +
      `<rect y="120" width="${W}" height="70" fill="#4dabf7"/><path d="M0,140 q20,-6 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" stroke="#a5d8ff" stroke-width="3" fill="none" data-a="wave"/>` +
      G("k", 70, 168, SP.kappa(), "50% 70%"),
    run(p) {
      p.say(0, "かっぱは およぎの めいじん");
      p.a("k", [[0, 0, -8], [0, -4, 8], [0, 0, -8]], 900, 0, { iterations: 2 });
      p.a("wave", [[0, 0], [-40, 0]], 1000, 0, { iterations: 5 });
      p.fx(1800, "splash"); p.say(1800, "あれれ…… ながされる〜！");
      p.a("k", [[0, 0, 0], [80, -6, 200, 1, 1, .4], [160, 0, 400, 1, 1, .8], [210, 4, 520, .8, .6]], 2200, 1800, { easing: "ease-in" });
      p.bubble(1900, 160, 50, "たすけて〜", 1500);
    },
    len: 4400,
  };

  L.neko = {
    svg: () => bg("#fff3bf", "#e9c46a", `<rect x="0" y="0" width="${W}" height="16" fill="#e8590c" opacity=".2"/>`) +
      G("c", 120, GY, SP.cat("c-")) + G("kb", 205, GY, koban(), "50% 50%") +
      G("sp", 214, GY - 34, sparkle(0, 0, 1.2), "50% 50%") + G("q", 120, GY - 70, qmark(), "50% 100%"),
    run(p) {
      p.hide("q");
      p.say(0, "ぴかぴかの こばんが あるよ");
      p.a("sp", [[0, 0, 0, .3], [0, 0, 90, 1.3], [0, 0, 180, .3]], 800, 0, { iterations: 5 });
      p.fx(200, "ding");
      p.a("c", [[0, 0], [30, 0]], 900, 600);
      p.a("c-head", [[0, 0, 0], [0, 0, -18], [0, 0, 18], [0, 0, -18], [0, 0, 0]], 2000, 1600);
      p.show(1700, "q"); p.fx(1700, "boing");
      p.a("q", [[0, 0, 0, 0], [0, 0, 0, 1.2, 1, .6], [0, 0, 0, 1]], 400, 1700);
      p.say(1700, "ねこ「これ なあに？」");
      p.bubble(3200, 200, 50, "たべられないにゃ", 2000);
    },
    len: 4600,
  };

  L.buta = {
    svg: () => bg("#e7f5ff", "#b08968") +
      `<ellipse cx="90" cy="186" rx="50" ry="8" fill="#7f5539" opacity=".6"/>` +
      G("pg", 80, GY, SP.pig()) +
      G("pl", 220, GY, `<path d="M-22,-4 q22,14 44,0" stroke="#dee2e6" stroke-width="2" fill="none"/>` +
        [-20, -12, -4, 4, 12, 20].map((x, i) => `<circle cx="${x}" cy="${-4 + Math.abs(x) * -0.18 + 6}" r="5" fill="#f8f9fa" stroke="#adb5bd"/>`).join(""), "50% 50%") +
      G("sp", 226, GY - 18, sparkle(0, 0, 1.1), "50% 50%"),
    run(p) {
      p.say(0, "きれいな しんじゅ だよ");
      p.fx(100, "ding");
      p.a("sp", [[0, 0, 0, .3], [0, 0, 90, 1.3], [0, 0, 180, .3]], 800, 0, { iterations: 4 });
      p.a("pg", [[0, 0], [70, 0]], 1200, 500);
      p.say(1700, "ぶた「くん くん…… ぶひ？」"); p.fx(1700, "boing");
      p.a("pg", [[70, 0, 0], [70, 0, -6], [70, 0, 0]], 300, 1700, { iterations: 2 });
      p.a("pl", [[0, 0, 0], [60, 0, 220]], 900, 2400, { easing: "ease-out" });
      p.a("pg", [[70, 0, 0, 1], [-20, 0, 0, 1]], 900, 2600);
      p.bubble(3400, 90, 60, "どろあそびの ほうが いいや", 1800);
    },
    len: 5000,
  };

  L.noren = {
    svg: () => bg("#fff9db", "#ced4da") +
      `<rect x="170" y="40" width="130" height="130" fill="#6f4e37"/><rect x="180" y="60" width="110" height="110" fill="#343a40"/>` +
      `<rect x="174" y="52" width="122" height="6" fill="#495057"/>` +
      [0, 1, 2, 3].map((i) => G("n" + i, 184 + i * 27, 58, `<rect x="0" y="0" width="25" height="70" fill="#1c7ed6"/><text x="12.5" y="40" font-size="16" fill="#fff" text-anchor="middle" font-weight="700">${"ことわざ"[i]}</text>`, "50% 0%")).join("") +
      G("k", 70, GY, SP.kid("k-", "#e8590c")),
    run(p) {
      p.say(0, "のれんを おして みよう");
      p.a("k", [[0, 0], [110, 0]], 1100, 0, { easing: "ease-in" });
      p.a("k-arm", [[0, 0, 0], [0, 0, -80]], 300, 900);
      p.say(1100, "えいっ！"); p.fx(1200, "whoosh");
      [0, 1].forEach((i) => p.a("n" + i, [[0, 0, 0, 1], [0, 0, -40, 1, 1, .3], [0, 0, 25], [0, 0, -10], [0, 0, 0]], 1400, 1150));
      p.a("k", [[110, 0, 0], [140, 0, 25, 1, 1, .5], [150, 6, 70]], 700, 1150, { easing: "ease-in" });
      p.fx(1900, "thud"); p.say(1900, "すかっ…… てごたえ なし");
      p.bubble(2700, 110, 50, "あれ？ ぜんぜん おせない", 2000);
    },
    len: 4800,
  };

  L.nuka = {
    svg: () => bg("#fff9db", "#d9b38c") +
      `<rect x="120" y="${GY - 44}" width="100" height="44" rx="6" fill="#a0673a"/><ellipse cx="170" cy="${GY - 44}" rx="50" ry="10" fill="#e9c891"/>` +
      `<g fill="#d4a373">${[...Array(14)].map((_, i) => `<circle cx="${128 + i * 6.5}" cy="${GY - 44 + (i % 3) - 1}" r="2"/>`).join("")}</g>` +
      G("nail", 170, GY - 42, `<rect x="-2" y="-34" width="4" height="34" fill="#868e96"/><rect x="-7" y="-38" width="14" height="5" rx="2" fill="#495057"/>`, "50% 100%") +
      G("ham", 196, GY - 92, `<rect x="0" y="-6" width="46" height="7" rx="3" fill="#8d5524"/><rect x="-14" y="-14" width="18" height="22" rx="3" fill="#495057"/>`, "100% 50%"),
    run(p) {
      p.say(0, "ぬかに くぎを うつと……");
      for (let i = 0; i < 3; i++) {
        p.a("ham", [[0, 0, 0], [0, 0, -30, 1, 1, .5], [-8, 14, 10]], 500, i * 700, { easing: "ease-in" });
        p.fx(i * 700 + 450, "soft");
      }
      p.say(700, "ずぶっ…… ずぶずぶ……");
      p.a("nail", [[0, 0, 0], [0, 12, 0, 1, 1, .3], [0, 24, 0, 1, 1, .6], [0, 36, 0]], 2100, 400);
      p.a("nail", [[0, 36, 0], [6, 30, 70]], 600, 2600, { easing: "ease-in" });
      p.say(2700, "ささらない…… ききめ なし");
      p.bubble(3000, 80, 50, "ふにゃふにゃ だ", 1800);
    },
    len: 4800,
  };

  L.uma = {
    svg: () => bg("#d3f9d8", "#8ce99a", cloud(240, 40) + cloud(70, 30, .8)) +
      G("mk", 80, GY, SP.monk()) + G("h", 210, GY, SP.horse("h-")) +
      [0, 1, 2].map((i) => G("nb" + i, 105, GY - 60, `<text font-size="14" font-weight="700" fill="#5f3dc4">なむ〜</text>`, "50% 50%")).join("") +
      grass(240) + grass(260) + grass(280),
    run(p) {
      p.say(0, "おぼうさんが ありがたい おはなし");
      p.fx(0, "chant");
      [0, 1, 2].forEach((i) => p.a("nb" + i, [[0, 0, 0, 1, 0], [30, -10, 0, 1, 1, .3], [80, -30, 0, 1, 0]], 1600, i * 700, { iterations: 2 }));
      p.a("h-head", [[0, 0, 0], [0, 0, 40, 1, 1, .4], [0, 0, 36], [0, 0, 40]], 1200, 600, { iterations: 3 });
      p.a("h-tail", [[0, 0, 0], [0, 0, 25], [0, 0, -10], [0, 0, 0]], 800, 300, { iterations: 5 });
      p.say(2000, "うま「もぐ もぐ……」");
      p.bubble(2800, 240, 60, "くさ おいしい〜", 1800);
    },
    len: 4800,
  };

  L.nikai = {
    svg: () => bg("#e7f5ff", "#ced4da") +
      `<rect x="20" y="40" width="120" height="130" fill="#ffe8cc" stroke="#d9480f" stroke-width="3"/><path d="M10,42 L80,6 L150,42 z" fill="#d9480f"/>` +
      `<rect x="60" y="60" width="44" height="30" fill="#a5d8ff" stroke="#495057" stroke-width="2"/><rect x="70" y="120" width="30" height="50" fill="#868e96"/>` +
      G("up", 82, 92, `<circle cx="0" cy="-12" r="10" fill="#ffd8a8"/>${eyes(0, -13, 3.5, 1.6)}<rect x="8" y="-8" width="5" height="16" rx="2" fill="#fff" stroke="#495057"/>`) +
      G("d", 92, 104, drop(), "50% 50%") +
      G("k", 180, GY, SP.kid("k-", "#40c057"), "50% 100%") + G("sp", 214, GY, `<ellipse rx="10" ry="3" fill="#74c0fc"/>`, "50% 50%"),
    run(p) {
      p.hide("sp");
      p.say(0, "2かいから めぐすりを さすよ");
      p.a("k-head", [[0, 0, 0], [0, 0, -12]], 400, 0);
      p.a("d", [[0, 0, 0, 0], [0, 0, 0, 1, 1, .1], [122, 64, 0, 1, 1]], 1200, 600, { easing: "ease-in" });
      p.fx(1800, "drip"); p.say(1800, "ぽたっ…… はずれ！");
      p.show(1800, "sp");
      p.a("d", [[0, 0, 0, 0], [0, 0, 0, 1, 1, .1], [95, 64, 0, 1, 1]], 1100, 2200, { easing: "ease-in" });
      p.fx(3300, "drip"); p.say(3300, "また はずれ……");
      p.bubble(3500, 230, 50, "ぜんぜん はいらない！", 1600);
    },
    len: 5200,
  };

  L.inu = {
    svg: () => bg("#e7f5ff", "#c0eb75", cloud(80, 40)) +
      `<rect x="232" y="${GY - 80}" width="10" height="80" fill="#8d5524"/>` +
      G("d", 50, GY, SP.dog("d-")) + G("st", 236, GY - 50, stars(), "50% 50%"),
    run(p) {
      p.hide("st");
      p.say(0, "いぬが おさんぽ…… てく てく");
      p.a("d", [[0, 0, 0], [0, -3, 0, 1, 1, .5], [0, 0, 0]], 300, 0, { iterations: 6 });
      p.a("d", [[0, 0], [140, 0]], 1800, 0);
      p.fx(1800, "bonk"); p.say(1800, "ごつん！ ぼうに あたった");
      p.a("d", [[140, 0, 0], [130, 0, -10, 1, 1, .4], [134, 0, 0]], 400, 1800);
      p.show(1900, "st"); p.a("st", [[0, 0, 0], [0, 0, 360]], 900, 1900, { iterations: 3 });
      p.bubble(2600, 130, 60, "いたた…… わん", 1800);
    },
    len: 4600,
  };

  L.chiri = {
    svg: () => bg("#f8f9fa", "#dee2e6") +
      G("mt", 160, GY, `<path d="M-90,0 L0,-110 L90,0 z" fill="#adb5bd"/><path d="M-26,-78 L0,-110 L26,-78 q-13,8 -26,0 q-13,8 -26,0 z" fill="#fff"/>`, "50% 100%") +
      [...Array(14)].map((_, i) => G("c" + i, 70 + (i * 37) % 180, 10, `<circle r="${2 + (i % 3)}" fill="#868e96"/>`, "50% 50%")).join(""),
    run(p) {
      p.say(0, "ちり…… ちり…… ちいさな ちり");
      for (let i = 0; i < 14; i++) p.a("c" + i, [[0, 0, 0, 1, 0], [0, 10, 0, 1, 1, .1], [0, 155, 0, 1, 1]], 900, i * 200, { iterations: 2, easing: "ease-in" });
      p.a("mt", [[0, 0, 0, [.05, .02]], [0, 0, 0, [.4, .3], 1, .4], [0, 0, 0, [1, 1]]], 3200, 400);
      p.say(1800, "つもって つもって……");
      p.fx(3600, "fanfare"); p.say(3600, "やまに なった！");
    },
    len: 4800,
  };

  L.ishi = {
    svg: () => `<rect width="${W}" height="${H}" fill="#cfeefe" data-a="sky"/>` +
      `<rect y="${GY}" width="${W}" height="${H - GY}" fill="#9ad07a"/>` +
      G("orb", 160, 130, `<circle cx="0" cy="-100" r="14" fill="#ffd43b"/><circle cx="0" cy="100" r="12" fill="#fff3bf"/>`, "50% 50%") +
      G("stone", 160, GY, `<ellipse cx="0" cy="-14" rx="44" ry="18" fill="#74c0fc" data-a="stc"/>`) +
      G("k", 160, GY - 26, SP.kid("k-", "#7048e8")) +
      G("cnt", 270, 40, `<text font-size="22" font-weight="900" fill="#d9480f" text-anchor="middle" data-a="cnt-t">1ねん</text>`, "50% 50%"),
    run(p) {
      p.say(0, "つめたい いしに すわって……");
      p.a("orb", [[0, 0, 0], [0, 0, 360]], 1100, 300, { iterations: 3, easing: "linear" });
      p.a("sky", [{ fill: "#cfeefe" }, { fill: "#364fc7", offset: .5 }, { fill: "#cfeefe" }], 1100, 300, { iterations: 3, raw: true });
      p.text(300, "cnt-t", "1ねん"); p.text(1400, "cnt-t", "2ねん"); p.text(2500, "cnt-t", "3ねん");
      [300, 1400, 2500].forEach((t) => p.fx(t, "pop"));
      p.a("stc", [{ fill: "#74c0fc" }, { fill: "#ffa94d" }], 3300, 300, { raw: true });
      p.say(1400, "がまん…… がまん……");
      p.say(3600, "いしが あったかく なった！"); p.fx(3600, "fanfare");
      p.a("k-head", [[0, 0, 0], [0, -3, 0]], 400, 3600);
    },
    len: 5000,
  };

  L.nekonote = {
    svg: () => bg("#fff4e6", "#e9c46a") +
      [0, 1, 2].map((i) => G("b" + i, 150 + i * 26, GY - 40, `<rect x="-10" y="-10" width="20" height="20" fill="#d9a066" stroke="#8d5524"/>`, "50% 50%")).join("") +
      G("k", 120, GY, SP.kid("k-", "#e64980")) + G("c", 280, GY, SP.cat("c-", "#495057")) +
      G("sw", 140, GY - 70, tear(), "50% 50%"),
    run(p) {
      p.say(0, "いそがしい！ いそがしい！");
      [0, 1, 2].forEach((i) => p.a("b" + i, [[0, 0, 0], [0, -40, 180], [0, 0, 360]], 700, i * 200, { iterations: 3 }));
      p.a("sw", [[0, 0, 0, 1, 1], [8, 10, 0, 1, 0]], 600, 0, { iterations: 4 });
      p.fx(400, "pop"); p.fx(1000, "pop");
      p.a("c", [[0, 0], [-70, 0]], 900, 1800);
      p.say(2000, "ねこさん、 てを かして！");
      p.a("k-arm", [[0, 0, 0], [0, 0, -60]], 400, 2700);
      p.a("b2", [[0, 0, 0], [50, 10, 0]], 500, 2900);
      p.fx(3000, "meow"); p.bubble(3200, 230, 70, "にゃ？", 1600);
    },
    len: 4800,
  };

  L.nakittsura = {
    svg: () => bg("#e7f5ff", "#b2f2bb") + G("k", 140, GY, SP.kid("k-", "#fab005")) +
      G("t1", 133, GY - 50, tear(), "50% 0%") + G("t2", 147, GY - 50, tear(), "50% 0%") +
      G("bee", 300, 40, SP.bee(), "50% 50%") + G("bump", 150, GY - 64, `<circle r="7" fill="#ff8787"/>`, "50% 50%"),
    run(p) {
      p.hide("bump");
      p.say(0, "ころんで いたい…… えーん");
      p.fx(0, "cry");
      ["t1", "t2"].forEach((t, i) => p.a(t, [[0, 0, 0, 1, 1], [0, 18, 0, 1, 0]], 700, i * 200, { iterations: 5 }));
      p.fx(1200, "buzz"); p.say(1200, "ぶーん…… はちが きた！");
      p.a("bee", [[0, 0], [-60, 40], [-100, 0], [-140, 60], [-150, 66]], 1600, 1100);
      p.fx(2800, "sting"); p.say(2800, "ちくっ！ さらに いたい〜");
      p.show(2800, "bump"); p.a("bump", [[0, 0, 0, 0], [0, 0, 0, 1.4], [0, 0, 0, 1]], 400, 2800);
      p.a("bee", [[-150, 66], [40, -60]], 900, 3000);
      p.a("k", [[0, 0, 0], [0, -10, 0], [0, 0, 0]], 300, 2800, { iterations: 2 });
    },
    len: 4800,
  };

  L.hana = {
    svg: () => bg("#fff0f6", "#c0eb75") + tree(80, 70, "#fcc2d7") +
      [...Array(8)].map((_, i) => G("pt" + i, 40 + i * 14, 50, `<ellipse rx="4" ry="2.5" fill="#f783ac"/>`, "50% 50%")).join("") +
      G("k", 220, GY, SP.kid("k-", "#4dabf7")) +
      G("dg", 236, GY - 46, `<path d="M0,0 v-40" stroke="#8d5524" stroke-width="2"/>` + ["#fff", "#ffc9c9", "#b2f2bb"].map((c, i) => `<circle data-a="dg${i}" cy="${-10 - i * 11}" r="6" fill="${c}" stroke="#adb5bd"/>`).join(""), "50% 100%"),
    run(p) {
      p.say(0, "さくらが きれい……");
      for (let i = 0; i < 8; i++) p.a("pt" + i, [[0, 0, 0, 1, 0], [20, 40, 180, 1, 1, .3], [60, 120, 400, 1, 0]], 2400, i * 300, { iterations: 2 });
      p.say(1300, "でも こっち！ だんご！");
      p.a("k-head", [[0, 0, 0], [0, 0, 8]], 300, 1300);
      [2, 1, 0].forEach((i, n) => { p.a("dg" + i, [[0, 0, 0, 1, 1], [0, 0, 0, 0, 0]], 200, 1800 + n * 700); p.fx(1800 + n * 700, "munch"); });
      p.say(2000, "もぐ もぐ もぐ……");
      p.bubble(3800, 210, 50, "おいしかった〜", 1500);
    },
    len: 5200,
  };

  L.tsuki = {
    svg: () => bg("#1b1f3b", "#2b3a55") +
      [...Array(10)].map((_, i) => `<circle cx="${(i * 71) % 320}" cy="${(i * 37) % 90 + 10}" r="1.4" fill="#fff"/>`).join("") +
      G("m", 240, 76, `<circle cx="0" cy="-30" r="30" fill="#fff3bf"/><circle cx="-8" cy="-36" r="5" fill="#ffe066"/><circle cx="10" cy="-22" r="4" fill="#ffe066"/>`, "50% 50%") +
      `<ellipse cx="90" cy="186" rx="80" ry="18" fill="#1864ab"/>` + G("s", 80, 186, SP.suppon(), "50% 50%") +
      G("vs", 160, 110, `<text font-size="26" font-weight="900" fill="#ff922b" text-anchor="middle">VS</text>`, "50% 50%"),
    run(p) {
      p.hide("vs");
      p.say(0, "おそらの まんまる おつきさま");
      p.a("m", [[0, 0, 0, 1], [0, 0, 0, 1.15], [0, 0, 0, 1]], 900, 200); p.fx(200, "ding");
      p.say(1300, "いけの まんまる すっぽん");
      p.a("s", [[0, 0, 0, 1], [0, -4, 0, 1.15], [0, 0, 0, 1]], 900, 1300); p.fx(1300, "pop");
      p.show(2400, "vs"); p.a("vs", [[0, 0, 0, 0], [0, 0, 0, 1.4], [0, 0, 0, 1]], 400, 2400); p.fx(2400, "boing");
      p.say(2600, "おなじ まる でも…… おおちがい！");
      p.a("m", [[0, 0, 0, 1], [0, 0, 0, 1.3]], 800, 3000);
      p.a("s", [[0, 0, 0, 1], [0, 0, 0, .8]], 800, 3000);
    },
    len: 4600,
  };

  L.oni = {
    svg: () => bg("#fff4e6", "#a9e34b", cloud(250, 40)) +
      G("o", 130, GY, SP.oni("o-")) +
      G("kb", 280, 40, `<rect x="-5" y="-60" width="10" height="60" rx="5" fill="#495057"/>${[...Array(5)].map((_, i) => `<circle cx="${i % 2 ? 5 : -5}" cy="${-52 + i * 10}" r="2.5" fill="#adb5bd"/>`).join("")}`, "50% 100%") +
      G("sp", 155, GY - 100, sparkle(0, 0, 1.6), "50% 50%"),
    run(p) {
      p.hide("sp");
      p.say(0, "つよい つよい おに が……");
      p.a("o", [[0, 0, 0], [0, -6, 0], [0, 0, 0]], 400, 0, { iterations: 2 });
      p.fx(1100, "whoosh"); p.say(1100, "かなぼうを もった！");
      p.a("kb", [[0, 0, 0], [-80, 30, -200], [-126, 92, -360]], 900, 1100, { easing: "ease-out" });
      p.show(2100, "sp"); p.fx(2100, "sparkle");
      p.a("sp", [[0, 0, 0, .3], [0, 0, 180, 1.5], [0, 0, 360, .3]], 700, 2100, { iterations: 2 });
      p.a("o", [[0, 0, 0, 1], [0, 0, 0, 1.25]], 700, 2400); p.a("kb", [[-126, 92, -360, 1], [-126 - 6, 92 - 16, -360, 1.25]], 700, 2400);
      p.say(2600, "ますます つよく なった！"); p.fx(2700, "taiko");
    },
    len: 4400,
  };

  L.kaeru = {
    svg: () => bg("#e3fafc", "#94d82d") +
      `<ellipse cx="160" cy="190" rx="150" ry="22" fill="#4dabf7"/>` +
      G("big", 70, GY + 2, SP.frog("b-", "#2f9e44")) +
      G("tp", 200, GY + 18, SP.tadpole(), "50% 50%") + G("fr", 200, GY + 14, SP.frog("f-"), "50% 100%"),
    run(p) {
      p.hide("fr");
      p.say(0, "かえるの こどもは…… おたまじゃくし");
      p.a("tp", [[0, 0, 0], [-20, -4, -10], [0, 0, 0]], 800, 0, { iterations: 2 });
      p.say(1700, "あしが はえて…… ぴょこん");
      p.a("tp", [[0, 0, 0, 1, 1], [0, -4, 0, 1.5, 0]], 600, 1800);
      p.show(2300, "fr"); p.fx(2300, "boing");
      p.a("fr", [[0, 0, 0, .4], [0, -30, 0, .8, 1, .5], [0, 0, 0, .8]], 600, 2300);
      p.say(3000, "やっぱり かえる に なった！");
      p.a("big", [[0, 0, 0], [0, -14, 0], [0, 0, 0]], 400, 3000, { iterations: 2 }); p.fx(3000, "ribbit");
    },
    len: 4600,
  };

  L.inonaka = {
    svg: () => `<g data-a="zoom" style="transform-box:view-box;transform-origin:150px 190px">` +
      bg("#a5d8ff", "#b08968", `<rect x="0" y="120" width="${W}" height="50" fill="#1c7ed6"/>` +
      `<path d="M230,130 q20,-20 40,0 l14,-8 l-2,16 z" fill="#364fc7"/><path d="M250,118 l2,-12 M254,118 l6,-10" stroke="#a5d8ff" stroke-width="2"/>`) +
      `<rect x="110" y="140" width="80" height="80" fill="#495057"/><rect x="120" y="140" width="60" height="80" fill="#1e2a3a"/>` +
      `<rect x="104" y="132" width="92" height="12" rx="3" fill="#868e96"/>` +
      `<rect x="120" y="198" width="60" height="22" fill="#3b5bdb"/>` +
      G("f", 150, 202, SP.frog("f-"), "50% 100%") + `</g>`,
    run(p) {
      p.a("zoom", [[0, 0, 0, 3.2], [0, 0, 0, 3.2]], 10, 0);
      p.say(0, "いどの なかの かえる");
      p.bubble(400, 150, 150, "ここが せかいの ぜんぶ！", 1600);
      p.a("f", [[0, 0, 0], [0, -6, 0], [0, 0, 0]], 400, 200, { iterations: 3 });
      p.say(2100, "でも そとには……"); p.fx(2100, "whoosh");
      p.a("zoom", [[0, 0, 0, 3.2], [0, 0, 0, 1]], 1400, 2100, { easing: "ease-in-out" });
      p.say(3600, "ひろい ひろい うみ！"); p.fx(3600, "splash");
    },
    len: 5200,
  };

  L.tana = {
    svg: () => bg("#fff4e6", "#e9c46a") +
      `<rect x="40" y="58" width="130" height="8" fill="#8d5524"/><rect x="46" y="66" width="6" height="16" fill="#8d5524"/><rect x="158" y="66" width="6" height="16" fill="#8d5524"/>` +
      G("bt", 150, 58, `<ellipse cx="0" cy="-9" rx="14" ry="9" fill="#5c2b29"/><circle cx="-5" cy="-11" r="1.4" fill="#862e2b"/><circle cx="4" cy="-8" r="1.4" fill="#862e2b"/>`, "50% 50%") +
      G("k", 205, GY, `<g transform="rotate(-90) translate(0 0)">${SP.kid("k-", "#20c997")}</g>`, "50% 50%") +
      G("mouth", 205, GY - 8, `<ellipse rx="6" ry="4" fill="#c92a2a"/>`, "50% 50%"),
    run(p) {
      p.say(0, "ねころんで いたら……");
      p.a("mouth", [[0, 0, 0, 1], [0, 0, 0, .3], [0, 0, 0, 1]], 800, 0, { iterations: 2 });
      p.say(1400, "たなの ぼたもちが…… ころっ");
      p.a("bt", [[0, 0, 0], [20, 0, 90]], 500, 1400);
      p.fx(1900, "whoosh");
      p.a("bt", [[20, 0, 90], [40, 30, 180, 1, 1, .3], [55, 102, 360]], 700, 1900, { easing: "ease-in" });
      p.a("bt", [[55, 102, 360, 1, 1], [55, 104, 360, .2, 0]], 200, 2600);
      p.fx(2650, "munch"); p.say(2650, "ぱくっ！ らっきー！");
      p.bubble(3100, 200, 80, "あまくて おいしい！", 1700);
    },
    len: 4800,
  };

  L.ame = {
    svg: () => `<rect width="${W}" height="${H}" fill="#868e96" data-a="sky"/>` +
      G("sun", 270, 40, `<circle r="18" fill="#ffd43b"/>`, "50% 50%") +
      `<rect y="${GY}" width="${W}" height="${H - GY}" fill="#7f5539" data-a="grd"/>` +
      G("mud", 160, GY + 14, `<ellipse rx="70" ry="8" fill="#5c3d1e"/><ellipse cx="80" cy="4" rx="40" ry="5" fill="#5c3d1e"/>`, "50% 50%") +
      [...Array(16)].map((_, i) => G("r" + i, 10 + i * 20, -10, `<path d="M0,0 l-4,14" stroke="#a5d8ff" stroke-width="2.5" stroke-linecap="round"/>`, "50% 50%")).join("") +
      G("k", 160, GY, SP.kid("k-", "#fa5252")),
    run(p) {
      p.hide("sun");
      p.say(0, "ざあざあ…… あめで どろどろ");
      p.fx(0, "rain");
      for (let i = 0; i < 16; i++) p.a("r" + i, [[0, 0, 0, 1, 1], [-12, 150, 0, 1, 1, .85], [-14, 178, 0, 1, 0]], 600, (i % 5) * 120, { iterations: 4, easing: "linear" });
      p.say(2300, "はれたら……");
      p.a("sky", [{ fill: "#868e96" }, { fill: "#a5d8ff" }], 800, 2300, { raw: true });
      p.show(2400, "sun"); p.a("sun", [[0, 30, 0, .3], [0, 0, 0, 1]], 700, 2400);
      p.a("mud", [[0, 0, 0, 1, 1], [0, 0, 0, 1, 0]], 900, 2600);
      p.a("grd", [{ fill: "#7f5539" }, { fill: "#a9744f" }], 900, 2600, { raw: true });
      p.fx(3400, "stomp"); p.say(3400, "じめんが かたく なった！ どん どん");
      p.a("k", [[0, 0, 0], [0, -14, 0], [0, 0, 0]], 400, 3400, { iterations: 3 });
    },
    len: 5200,
  };

  L.yakeishi = {
    svg: () => bg("#fff4e6", "#e9c46a") +
      G("st", 180, GY, `<ellipse cx="0" cy="-22" rx="50" ry="26" fill="#e03131" data-a="stc"/><ellipse cx="-14" cy="-30" rx="12" ry="6" fill="#ff8787"/>`) +
      [0, 1, 2].map((i) => G("h" + i, 160 + i * 20, GY - 54, `<path d="M0,0 q-6,-10 0,-20 q6,-10 0,-20" stroke="#ff8787" stroke-width="3" fill="none"/>`, "50% 100%")).join("") +
      G("k", 70, GY, SP.kid("k-", "#4dabf7")) +
      G("cup", 92, GY - 40, `<rect x="-6" y="-12" width="12" height="12" fill="#e9ecef" stroke="#495057"/>`, "0% 50%") +
      G("w", 138, GY - 54, drop(), "50% 50%") + G("steam", 175, GY - 60, `<g fill="#f1f3f5"><circle r="12"/><circle cx="14" cy="-6" r="10"/><circle cx="-12" cy="-8" r="9"/></g>`, "50% 50%"),
    run(p) {
      p.hide("w"); p.hide("steam");
      p.say(0, "あつ あつの いし…… ごーっ");
      [0, 1, 2].forEach((i) => p.a("h" + i, [[0, 0, 0, 1, 0], [0, -14, 0, 1, 1, .5], [0, -24, 0, 1, 0]], 900, i * 250, { iterations: 4 }));
      p.a("k", [[0, 0], [30, 0]], 700, 700); p.a("cup", [[0, 0], [30, 0]], 700, 700);
      p.say(1500, "ちょっぴりの みずを かけると……");
      p.a("cup", [[30, 0, 0], [30, 0, 70]], 400, 1600);
      p.show(1900, "w"); p.a("w", [[0, 0, 0, 1, 1], [34, 30, 0, .6, 1]], 500, 1900, { easing: "ease-in" });
      p.fx(2400, "sizzle"); p.say(2400, "じゅっ！ すぐ きえた");
      p.hide(2400, "w"); p.show(2400, "steam");
      p.a("steam", [[0, 0, 0, .3, 1], [0, -50, 0, 1.6, 0]], 1300, 2400);
      p.bubble(3400, 230, 60, "まだ あつい……", 1600);
    },
    len: 5000,
  };

  L.isogaba = {
    svg: () => bg("#e7f5ff", "#9ad07a") +
      `<rect x="120" y="100" width="80" height="120" fill="#4dabf7"/>` +
      `<path d="M30,150 L30,40 Q160,-10 290,40 L290,150" stroke="#e9c46a" stroke-width="14" fill="none" stroke-linecap="round"/>` +
      G("br1", 140, 150, `<rect x="-20" y="-4" width="40" height="8" fill="#a0673a"/>`, "0% 50%") + G("br2", 180, 150, `<rect x="-20" y="-4" width="40" height="8" fill="#8d5524"/>`, "100% 50%") +
      `<path d="M290,150 v-40" stroke="#495057" stroke-width="3"/><path d="M290,110 l22,8 l-22,8 z" fill="#e03131"/>` +
      G("a", 40, 150, SP.kid("a-", "#e8590c"), "50% 100%") + G("b", 30, 150, SP.kid("b-", "#1c7ed6"), "50% 100%") +
      `<text x="160" y="214" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">ぼろぼろ はし</text>`,
    run(p) {
      p.say(0, "ちかみち の はし……  とおまわり の みち");
      p.a("a", [[0, 0], [110, 0]], 900, 300, { easing: "ease-in" });
      p.a("b", [[0, 0], [0, -60], [40, -100], [130, -118], [220, -100], [260, -60], [262, 0]], 3300, 300, { easing: "linear" });
      p.fx(1200, "crack"); p.say(1300, "ばきっ！ はしが こわれた");
      p.a("br1", [[0, 0, 0], [0, 30, 60, 1, 0]], 700, 1250);
      p.a("br2", [[0, 0, 0], [0, 30, -60, 1, 0]], 700, 1250);
      p.a("a", [[110, 0, 0], [118, 60, 40, 1, 1]], 600, 1250, { easing: "ease-in" });
      p.fx(1850, "splash");
      p.say(3700, "まわりみちの ほうが さきに ついた！"); p.fx(3700, "fanfare");
    },
    len: 5200,
  };

  L.taka = {
    svg: () => bg("#e7f5ff", "#9ad07a", cloud(240, 30)) +
      `<path d="M60,120 h120" stroke="#8d5524" stroke-width="8" stroke-linecap="round"/>` +
      G("h", 110, 118, SP.hawk("h-"), "50% 70%") +
      G("s1", 230, GY, `<ellipse cy="-8" rx="10" ry="8" fill="#a9744f"/><circle cx="8" cy="-14" r="5" fill="#a9744f"/><path d="M12,-14 l4,1 l-4,2" fill="#ffd43b"/>${eyes(8, -15, 0, 1.2)}`) +
      G("s2", 270, GY, `<ellipse cy="-8" rx="10" ry="8" fill="#868e96"/><circle cx="8" cy="-14" r="5" fill="#868e96"/><path d="M12,-14 l4,1 l-4,2" fill="#ffd43b"/>`),
    run(p) {
      p.say(0, "おとなしそうな たか……");
      p.bubble(500, 250, 120, "つめも ないし よわそう", 1600);
      p.say(2200, "でも ほんとうは……"); p.fx(2300, "whoosh");
      p.a("h-wl", [[0, 0, 0], [0, 0, -30], [0, 0, 0]], 400, 2300, { iterations: 2 });
      p.a("h-wr", [[0, 0, 0], [0, 0, 30], [0, 0, 0]], 400, 2300, { iterations: 2 });
      p.a("h-claw", [{ opacity: 0 }, { opacity: 1 }], 200, 2400, { raw: true });
      p.a("h", [[0, 0, 0, 1], [0, -10, 0, 1.3]], 400, 2400);
      p.fx(2700, "sparkle"); p.say(2700, "きらーん！ するどい つめ");
      p.a("s1", [[0, 0], [70, 0]], 500, 2900); p.a("s2", [[0, 0], [70, 0]], 500, 2900);
      p.a("h", [[0, -10, 0, 1.3], [0, 0, 0, 1]], 500, 3600);
      p.a("h-claw", [{ opacity: 1 }, { opacity: 0 }], 300, 3700, { raw: true });
      p.say(3800, "ふだんは かくして いるんだね");
    },
    len: 5000,
  };

  L.nanakorobi = {
    svg: () => bg("#fff4e6", "#ffd8a8") + G("d", 160, GY, SP.daruma(), "50% 100%") +
      G("cnt", 160, 46, `<text font-size="26" font-weight="900" fill="#e03131" text-anchor="middle" data-a="cnt-t"></text>`, "50% 50%"),
    run(p) {
      p.say(0, "ころん！ でも おきる！");
      for (let i = 0; i < 7; i++) {
        const t = i * 520, dir = i % 2 ? 1 : -1;
        p.a("d", [[0, 0, 0], [0, 0, 70 * dir, 1, 1, .4], [0, 0, -12 * dir, 1, 1, .75], [0, 0, 0]], 500, t);
        p.text(t + 200, "cnt-t", `${i + 1}かい`);
        p.fx(t + 200, "pop");
      }
      p.say(3700, "8かいめも おきあがった！"); p.text(3700, "cnt-t", "8かい おきた！"); p.fx(3700, "fanfare");
    },
    len: 5000,
  };

  L.deru = {
    svg: () => bg("#e7f5ff", "#c0eb75") +
      [0, 1, 2, 4, 5].map((i) => `<rect x="${40 + i * 45}" y="${GY - 50}" width="18" height="50" fill="#a0673a"/><path d="M${40 + i * 45},${GY - 50} l9,-8 l9,8 z" fill="#a0673a"/>`).join("") +
      G("pk", 40 + 3 * 45 + 9, GY, `<rect x="-9" y="-80" width="18" height="80" fill="#c08552"/><path d="M-9,-80 l9,-8 l9,8 z" fill="#c08552"/>`, "50% 100%") +
      G("ham", 220, 30, `<rect x="-4" y="0" width="8" height="54" fill="#8d5524"/><rect x="-22" y="-14" width="44" height="18" rx="4" fill="#495057"/>`, "50% 100%"),
    run(p) {
      p.say(0, "いっぽんだけ でている くい……");
      p.a("pk", [[0, 0, 0], [0, -4, 0], [0, 0, 0]], 400, 300, { iterations: 2 });
      p.a("ham", [[0, 0, 0], [-40, -10, -30, 1, 1, .5], [-56, 30, 0]], 600, 1200, { easing: "ease-in" });
      p.fx(1750, "knock"); p.say(1750, "かーん！");
      p.a("pk", [[0, 0, 0, [1, 1]], [0, 0, 0, [1, 0.62]]], 200, 1750);
      p.a("ham", [[-56, 30, 0], [0, 0, 0]], 500, 2000);
      p.say(2600, "うたれて みんなと おなじ たかさ");
      p.bubble(3000, 200, 60, "めだつと うたれちゃう", 1700);
    },
    len: 4800,
  };

  L.sendou = {
    svg: () => bg("#e7f5ff", "#9ad07a") +
      `<path d="M150,${GY} L240,40 L320,${GY} z" fill="#69db7c"/><path d="M226,66 L240,40 L254,66 z" fill="#fff"/>` +
      `<rect y="150" width="200" height="40" fill="#4dabf7"/>` +
      G("bt", 70, 160, `<path d="M-46,-10 h92 l-12,16 h-68 z" fill="#8d5524"/>` +
        [-32, -12, 8, 28].map((x, i) => `<g transform="translate(${x} -10) scale(.5)">${SP.kid("", ["#e03131", "#1c7ed6", "#f59f00", "#7048e8"][i])}</g><path d="M${x},-34 l${[-12, 12, 0, 10][i]},${[-4, -4, -14, 6][i]}" stroke="#212529" stroke-width="2"/>`).join(""), "50% 100%"),
    run(p) {
      p.say(0, "せんどうさんが 4にん……");
      p.bubble(300, 70, 60, "あっち！ こっち！ そっち！", 1800);
      p.a("bt", [[0, 0, 0], [-10, 0, -8], [10, 0, 8], [-6, 0, -6], [0, 0, 0]], 1600, 300);
      p.fx(500, "pop"); p.fx(900, "pop"); p.fx(1300, "pop");
      p.say(2100, "ふねが…… やまを のぼっていく！"); p.fx(2100, "whoosh");
      p.a("bt", [[0, 0, 0], [90, 0, 0, 1, 1, .2], [150, -80, -40, 1, 1, .7], [168, -110, -50]], 2200, 2100, { easing: "ease-in-out" });
    },
    len: 5000,
  };

  L.atama = {
    svg: () => bg("#e7f5ff", "#9ad07a") +
      G("kid", 132, GY - 4, `<g transform="rotate(70)">${SP.kid("k-", "#f06595")}</g>`, "50% 100%") +
      `<g fill="#2f9e44"><circle cx="190" cy="${GY - 34}" r="30"/><circle cx="220" cy="${GY - 18}" r="22"/><circle cx="165" cy="${GY - 14}" r="18"/></g>` +
      G("o", 40, GY, SP.kid("o-", "#228be6"), "50% 100%"),
    run(p) {
      p.say(0, "かくれんぼ…… あたまだけ かくした");
      p.a("kid", [[0, 0, 0], [0, 0, 6], [0, 0, -6], [0, 0, 0]], 600, 300, { iterations: 3 });
      p.fx(500, "pop"); p.fx(1100, "pop");
      p.a("o", [[0, 0], [50, 0]], 900, 1600);
      p.say(2600, "おにさん「おしり みえてるよ！」"); p.fx(2600, "boing");
      p.a("kid", [[0, 0, 0], [0, -8, 0], [0, 0, 0]], 300, 2700, { iterations: 2 });
      p.bubble(3300, 90, 60, "みーつけた！", 1600);
    },
    len: 4800,
  };

  L.toudai = {
    svg: () => `<rect width="${W}" height="${H}" fill="#212529"/><rect y="${GY}" width="${W}" height="${H - GY}" fill="#3b2f2f"/>` +
      `<radialGradient id="tdg"><stop offset="0" stop-color="#ffe066" stop-opacity=".7"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>` +
      `<ellipse cx="160" cy="70" rx="150" ry="110" fill="url(#tdg)"/>` +
      `<rect x="156" y="70" width="8" height="${GY - 70}" fill="#5c3d1e"/><rect x="138" y="${GY - 6}" width="44" height="6" fill="#5c3d1e"/><rect x="140" y="64" width="40" height="8" fill="#8d5524"/>` +
      G("fl", 160, 64, `<path d="M0,-18 q8,10 0,16 q-8,-6 0,-16 z" fill="#ff922b"/>`, "50% 100%") +
      `<ellipse cx="160" cy="${GY - 2}" rx="40" ry="8" fill="#000" opacity=".7"/>` +
      G("key", 172, GY - 2, `<circle r="4" fill="none" stroke="#fcc419" stroke-width="2"/><path d="M4,0 h10 v3" stroke="#fcc419" stroke-width="2" fill="none"/>`, "50% 50%") +
      G("k", 60, GY, SP.kid("k-", "#fab005")),
    run(p) {
      p.say(0, "むかしの あかり「とうだい」");
      p.a("fl", [[0, 0, 0, [1, 1]], [0, 0, 0, [.9, 1.15]], [0, 0, 0, [1, 1]]], 500, 0, { iterations: 10 });
      p.a("key", [{ opacity: .08 }, { opacity: .08 }], 10, 0, { raw: true });
      p.say(1000, "かぎを さがして いるけど……");
      p.a("k", [[0, 0, 0], [40, 0, 0], [-10, 0, 0], [60, 0, 0]], 2200, 900);
      p.a("k-head", [[0, 0, 0], [0, 0, -15], [0, 0, 15], [0, 0, 0]], 1100, 900, { iterations: 2 });
      p.bubble(1500, 90, 70, "どこかな？", 1200);
      p.say(3300, "あかりの まうしたに あった！"); p.fx(3300, "ding");
      p.a("key", [{ opacity: .08, transform: "scale(1)" }, { opacity: 1, transform: "scale(2)" }], 500, 3300, { raw: true });
    },
    len: 5000,
  };

  L.nimimi = {
    svg: () => bg("#364fc7", "#5c7cfa") +
      `<rect x="70" y="${GY - 16}" width="180" height="20" rx="8" fill="#fff"/><rect x="120" y="${GY - 30}" width="130" height="22" rx="8" fill="#ffc9c9"/>` +
      G("k", 100, GY - 18, `<circle r="15" fill="#ffd8a8"/><path d="M-15,-2 q2,-16 16,-14 q12,0 14,12 z" fill="#343a40"/><path d="M-6,2 h4 M3,2 h4" stroke="#222" stroke-width="1.6"/><ellipse cx="-12" cy="4" rx="3" ry="5" fill="#f4a582" data-a="ear"/>`, "50% 50%") +
      G("z", 130, GY - 60, `<text font-size="18" font-weight="900" fill="#fff">Z z z</text>`, "50% 50%") +
      G("d", 88, 0, drop(), "50% 50%"),
    run(p) {
      p.say(0, "ぐうぐう…… ねて いると……");
      p.a("z", [[0, 0, 0, 1, 0], [10, -10, 0, 1, 1, .5], [20, -20, 0, 1, 0]], 1000, 0, { iterations: 2 });
      p.fx(0, "snore");
      p.a("d", [[0, 0, 0, 1, 0], [0, 10, 0, 1, 1, .1], [0, 152, 0, 1, 1]], 900, 1600, { easing: "ease-in" });
      p.fx(2500, "drip"); p.say(2500, "みみに みずが ぴちょん！");
      p.hide(2550, "d");
      p.a("k", [[0, 0, 0], [0, -50, -20, 1.2, 1, .4], [0, -40, 0, 1.1]], 600, 2550, { easing: "ease-out" });
      p.fx(2600, "boing"); p.bubble(2900, 200, 60, "わあっ！ びっくり！", 1800);
    },
    len: 4800,
  };

  L.nito = {
    svg: () => bg("#e7f5ff", "#9ad07a", cloud(160, 30)) +
      G("r1", 130, GY, SP.rabbit(), "50% 100%") + G("r2", 190, GY, `<g transform="scale(-1 1)">${SP.rabbit("#f1e3c8")}</g>`, "50% 100%") +
      G("k", 160, GY, SP.kid("k-", "#5c940d"), "50% 100%"),
    run(p) {
      p.say(0, "うさぎを 2ひき いっしょに……");
      p.a("r1", [[0, 0, 0], [-60, -20, 0, 1, 1, .5], [-130, 0, 0]], 1100, 400);
      p.a("r2", [[0, 0, 0], [60, -20, 0, 1, 1, .5], [130, 0, 0]], 1100, 400);
      p.fx(400, "boing");
      p.a("k", [[0, 0], [-50, 0], [40, 0], [-30, 0], [0, 0]], 2000, 700);
      p.say(1300, "あっちも こっちも…… まてー！");
      p.a("r1", [[-130, 0], [-200, 0]], 500, 1600); p.a("r2", [[130, 0], [200, 0]], 500, 1600);
      p.say(3000, "どちらも にげちゃった……"); p.fx(3000, "sad");
      p.a("k", [[0, 0, 0], [0, 6, 0]], 400, 3000);
      p.a("k-head", [[0, 0, 0], [0, 4, 0]], 400, 3000);
    },
    len: 4600,
  };

  /* ---------- うごかす 道具 ---------- */
  function tf(f) {
    const [x = 0, y = 0, r = 0, s = 1, o = 1, off] = f;
    const sc = Array.isArray(s) ? `${s[0]},${s[1]}` : s;
    const k = { transform: `translate(${x}px,${y}px) rotate(${r}deg) scale(${sc})`, opacity: o };
    if (off != null) k.offset = off;
    return k;
  }

  /* root に ばめん を かいて うごかす。cb.say(text), cb.fx(name), cb.done() */
  function play(id, root, cb) {
    const sc = L[id];
    if (!sc) return { stop() {} };
    root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ことばどおりの アニメ">${sc.svg()}</svg>`;
    const svg = root.firstChild;
    const timers = [], anims = [];
    const el = (n) => svg.querySelector(`[data-a="${n}"]`);
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const p = {
      a(n, frames, dur, delay, o) {
        const e = el(n); if (!e) return;
        o = o || {};
        const kf = o.raw ? frames : frames.map(tf);
        try {
          anims.push(e.animate(kf, { duration: dur, delay: delay || 0, fill: "both", easing: o.easing || "ease-in-out", iterations: o.iterations || 1 }));
        } catch (err) { /* ふるい ブラウザ */ }
      },
      say: (ms, t) => at(ms, () => cb.say && cb.say(t)),
      fx: (ms, s) => at(ms, () => cb.fx && cb.fx(s)),
      show: (ms, n) => { if (n === undefined) { n = ms; ms = 0; } at(ms, () => { const e = el(n); if (e) e.style.visibility = "visible"; }); },
      hide: (ms, n) => {
        if (n === undefined) { const e = el(ms); if (e) e.style.visibility = "hidden"; return; }
        at(ms, () => { const e = el(n); if (e) e.style.visibility = "hidden"; });
      },
      text: (ms, n, t) => at(ms, () => { const e = el(n); if (e) e.textContent = t; }),
      bubble(ms, x, y, t, dur) {
        at(ms, () => {
          const w = t.length * 12.5 + 18;
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("transform", `translate(${Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x))} ${y})`);
          g.innerHTML = `<rect x="${-w / 2}" y="-15" width="${w}" height="28" rx="13" fill="#fff" stroke="#343a40" stroke-width="2"/><text y="5" text-anchor="middle" font-size="13" font-weight="800" fill="#343a40">${t}</text>`;
          svg.appendChild(g);
          try { g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "both" }); } catch (e) { /* なし */ }
          if (dur) at(dur, () => g.remove());
        });
      },
    };
    sc.run(p);
    at(sc.len, () => cb.done && cb.done());
    return {
      stop() { timers.forEach(clearTimeout); anims.forEach((a) => { try { a.cancel(); } catch (e) { /* なし */ } }); },
    };
  }

  return { play, has: (id) => !!L[id], ids: () => Object.keys(L) };
})();
