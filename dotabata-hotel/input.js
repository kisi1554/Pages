// どたばた ペット ホテル — そうさ（タッチ・キーボード・マウス・ゲームパッド）
//  - ひだりした: バーチャル スティック（さわった ところが まんなか）
//  - みぎした: ジャンプ（大）・あわ・ダッシュ（ひだりきき で いれかえ）
//  - がめんを スワイプ／マウス ドラッグ: カメラを まわす
'use strict';
var Input = (function () {
  function create(el) {
    var st = {
      mx: 0, my: 0, jump: false, jumpPressed: false, bubblePressed: false, dashPressed: false,
      camDX: 0, camDY: 0, camHeld: false, lastCam: 0, used: 'touch',
    };
    var keys = {};
    var stickId = null, stickO = [0, 0], stickR = 56;
    var camIds = {};
    var btnIds = {};

    function stopMenu(e) { e.preventDefault(); }
    document.addEventListener('contextmenu', stopMenu);
    document.addEventListener('selectstart', function (e) { if (!(e.target.closest && e.target.closest('input, textarea'))) e.preventDefault(); });

    // スティック
    var zone = el.stickZone, base = el.stickBase, knob = el.stickKnob;
    function showStick(x, y, kx, ky) {
      var zr = zone.getBoundingClientRect();
      base.style.left = (x - zr.left) + 'px'; base.style.top = (y - zr.top) + 'px';
      knob.style.transform = 'translate(' + kx + 'px,' + ky + 'px)';
    }
    function resetStick() {
      stickId = null; st.mx = 0; st.my = 0;
      base.classList.remove('on');
      base.style.left = ''; base.style.top = '';
      knob.style.transform = '';
    }
    zone.addEventListener('pointerdown', function (e) {
      if (stickId !== null) return;
      e.preventDefault();
      stickId = e.pointerId; stickO = [e.clientX, e.clientY];
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      base.classList.add('on');
      showStick(e.clientX, e.clientY, 0, 0);
      st.used = 'touch';
    });
    zone.addEventListener('pointermove', function (e) {
      if (e.pointerId !== stickId) return;
      e.preventDefault();
      var dx = e.clientX - stickO[0], dy = e.clientY - stickO[1];
      var l = Math.hypot(dx, dy);
      if (l > stickR) { dx = dx / l * stickR; dy = dy / l * stickR; }
      st.mx = dx / stickR; st.my = -dy / stickR;
      showStick(stickO[0], stickO[1], dx, dy);
    });
    function stickUp(e) { if (e.pointerId === stickId) resetStick(); }
    zone.addEventListener('pointerup', stickUp);
    zone.addEventListener('pointercancel', stickUp);
    zone.addEventListener('lostpointercapture', stickUp);

    // ボタン
    function bindBtn(b, name) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        btnIds[e.pointerId] = name;
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* */ }
        b.classList.add('down');
        press(name);
      });
      function up(e) {
        if (btnIds[e.pointerId] !== name) return;
        delete btnIds[e.pointerId];
        b.classList.remove('down');
        if (name === 'jump') st.jump = Object.keys(btnIds).some(function (k) { return btnIds[k] === 'jump'; }) || !!(keys.Space);
      }
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
    }
    function press(name) {
      if (name === 'jump') { st.jump = true; st.jumpPressed = true; }
      if (name === 'bubble') st.bubblePressed = true;
      if (name === 'dash') st.dashPressed = true;
      if (el.onPress) el.onPress(name);
    }
    bindBtn(el.btnJump, 'jump'); bindBtn(el.btnBubble, 'bubble'); bindBtn(el.btnDash, 'dash');

    // カメラ（がめんを なぞる）
    var cv = el.camArea;
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      camIds[e.pointerId] = [e.clientX, e.clientY];
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      st.camHeld = true;
      if (e.pointerType === 'mouse') st.used = 'key';
    });
    cv.addEventListener('pointermove', function (e) {
      var o = camIds[e.pointerId];
      if (!o) return;
      e.preventDefault();
      st.camDX += e.clientX - o[0]; st.camDY += e.clientY - o[1];
      camIds[e.pointerId] = [e.clientX, e.clientY];
      st.lastCam = performance.now();
    });
    function camUp(e) {
      delete camIds[e.pointerId];
      st.camHeld = Object.keys(camIds).length > 0;
    }
    cv.addEventListener('pointerup', camUp);
    cv.addEventListener('pointercancel', camUp);
    cv.addEventListener('lostpointercapture', camUp);

    // キーボード
    var MAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
    window.addEventListener('keydown', function (e) {
      if (e.target && e.target.closest && e.target.closest('input, textarea')) return;
      var code = e.code;
      if (MAP[code] || code === 'Space') e.preventDefault();
      if (e.repeat) return;
      keys[MAP[code] || code] = true;
      st.used = 'key';
      if (code === 'Space') press('jump');
      if (code === 'KeyJ' || code === 'KeyZ') press('bubble');
      if (code === 'KeyK' || code === 'KeyX' || code === 'ShiftLeft') press('dash');
    });
    window.addEventListener('keyup', function (e) {
      var code = e.code;
      keys[MAP[code] || code] = false;
      if (code === 'Space') st.jump = Object.keys(btnIds).some(function (k) { return btnIds[k] === 'jump'; });
    });
    window.addEventListener('blur', function () { keys = {}; st.jump = false; resetStick(); });

    // ゲームパッド
    var padPrev = {};
    function pollPad() {
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      var out = null;
      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        if (!p || !p.connected) continue;
        var ax = p.axes[0] || 0, ay = p.axes[1] || 0, cx = p.axes[2] || 0, cy = p.axes[3] || 0;
        var dz = function (v) { return Math.abs(v) < 0.18 ? 0 : v; };
        var b = function (k) { return !!(p.buttons[k] && p.buttons[k].pressed); };
        var now = { a: b(0), x: b(2), bb: b(1), rt: b(7) || b(5), y: b(3) };
        if (now.a && !padPrev.a) press('jump');
        if ((now.x || now.y) && !(padPrev.x || padPrev.y)) press('bubble');
        if ((now.bb || now.rt) && !(padPrev.bb || padPrev.rt)) press('dash');
        if (b(12)) ay = -1; if (b(13)) ay = 1; if (b(14)) ax = -1; if (b(15)) ax = 1;
        out = { mx: dz(ax), my: -dz(ay), cx: dz(cx), cy: dz(cy), jump: now.a };
        if (out.mx || out.my || now.a) st.used = 'pad';
        padPrev = now;
        break;
      }
      return out;
    }

    return {
      state: st,
      // 1フレームぶんの そうさを とりだす（おした しゅんかん と カメラの うごきは ここで リセット）
      read: function () {
        var mx = st.mx, my = st.my;
        var kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.u ? 1 : 0) - (keys.d ? 1 : 0);
        if (kx || ky) { var l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; }
        var pad = pollPad(), camX = st.camDX, camY = st.camDY, jump = st.jump || !!keys.Space;
        if (pad) {
          if (pad.mx || pad.my) { mx = pad.mx; my = pad.my; }
          camX += pad.cx * 9; camY += pad.cy * 6;
          if (pad.cx || pad.cy) st.lastCam = performance.now();
          jump = jump || pad.jump;
        }
        var r = {
          mx: mx, my: my, jump: jump, jumpPressed: st.jumpPressed, bubblePressed: st.bubblePressed, dashPressed: st.dashPressed,
          camDX: camX, camDY: camY, camHeld: st.camHeld || !!(pad && (pad.cx || pad.cy)), lastCam: st.lastCam,
        };
        st.jumpPressed = st.bubblePressed = st.dashPressed = false;
        st.camDX = st.camDY = 0;
        return r;
      },
      // おした ことを つぎの フレームに もちこす
      keep: function (r) {
        if (r.jumpPressed) st.jumpPressed = true;
        if (r.bubblePressed) st.bubblePressed = true;
        if (r.dashPressed) st.dashPressed = true;
      },
      reset: function () {
        resetStick(); keys = {}; st.jump = false; st.jumpPressed = st.bubblePressed = st.dashPressed = false;
        Object.keys(btnIds).forEach(function (k) { delete btnIds[k]; });
        [el.btnJump, el.btnBubble, el.btnDash].forEach(function (b) { b.classList.remove('down'); });
      },
    };
  }
  return { create: create };
})();
