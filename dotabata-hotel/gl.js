// どたばた ペット ホテル — WebGL の きほん（がいぶ ライブラリ なし）
//  - WebGL2 が あれば つかう。なければ WebGL1 ＋ ANGLE_instanced_arrays
//  - おなじ かたちは「インスタンス びょうが」で まとめて 1かいで かく（ドローコールを すくなく）
//  - モード: lit（ふつう）/ shadow（あしもとの まるい かげ）/ bubble（あわ）/ water（みず）/ unlit（ひかる つぶ）
'use strict';
var GL = (function () {
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNor;',
    'attribute vec4 aM0; attribute vec4 aM1; attribute vec4 aM2; attribute vec4 aM3; attribute vec4 aCol;',
    'uniform mat4 uVP; uniform mat4 uWorld;',
    'varying vec3 vN; varying vec4 vC; varying vec3 vW; varying vec3 vL;',
    'void main(){',
    '  mat4 m = uWorld * mat4(aM0, aM1, aM2, aM3);',
    '  vec4 w = m * vec4(aPos, 1.0);',
    '  vN = (m * vec4(aNor, 0.0)).xyz; vC = aCol; vW = w.xyz; vL = aPos;',
    '  gl_Position = uVP * w;',
    '}'].join('\n');
  var FS = [
    'precision mediump float;',
    'uniform float uMode; uniform vec3 uCam; uniform vec3 uLight; uniform vec3 uFog; uniform vec2 uFogR; uniform float uTime;',
    'varying vec3 vN; varying vec4 vC; varying vec3 vW; varying vec3 vL;',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(uCam - vW);',
    '  float dist = length(vW - uCam);',
    '  float fog = clamp((dist - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0) * 0.55;',
    '  if (uMode < 0.5) {',
    '    float d = max(dot(n, uLight), 0.0);',
    '    float hemi = 0.6 + 0.4 * n.y;',
    '    vec3 col = vC.rgb * (0.48 * hemi + 0.62 * d) + vC.rgb * 0.06;',
    '    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.12;',
    '    gl_FragColor = vec4(mix(col + rim, uFog, fog), 1.0);',
    '  } else if (uMode < 1.5) {',
    '    float r = length(vL.xz);',
    '    gl_FragColor = vec4(0.0, 0.0, 0.05, vC.a * (1.0 - smoothstep(0.45, 1.0, r)));',
    '  } else if (uMode < 2.5) {',
    '    float fr = 1.0 - abs(dot(n, v));',
    '    vec3 rb = 0.5 + 0.5 * cos(6.2832 * (fr * 1.3 + n.y * 0.3 + uTime * 0.2 + vec3(0.0, 0.33, 0.67)));',
    '    float s = pow(max(dot(reflect(-v, n), uLight), 0.0), 30.0);',
    '    float a = 0.1 + 0.65 * pow(fr, 2.2);',
    '    gl_FragColor = vec4(mix(vec3(1.0), rb, 0.6) * vC.rgb + s, min(1.0, (a + s) * vC.a));',
    '  } else if (uMode < 3.5) {',
    '    float w = 0.5 + 0.5 * sin(vW.x * 2.0 + uTime * 1.5) * sin(vW.z * 2.3 - uTime);',
    '    vec3 col = vC.rgb * (0.8 + 0.25 * w) + pow(w, 6.0) * 0.25;',
    '    gl_FragColor = vec4(col, vC.a);',
    '  } else {',
    '    gl_FragColor = vec4(mix(vC.rgb, uFog, fog * 0.5), vC.a);',
    '  }',
    '}'].join('\n');

  var MODES = { lit: 0, shadow: 1, bubble: 2, water: 3, unlit: 4 };
  var FLOATS = 20;

  function create(canvas) {
    var opts = { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
    var gl = canvas.getContext('webgl2', opts), gl2 = !!gl, ext = null;
    if (!gl) {
      gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
      if (!gl) return null;
      ext = gl.getExtension('ANGLE_instanced_arrays');
      if (!ext) return null;
    }
    var divisor = gl2 ? function (i, d) { gl.vertexAttribDivisor(i, d); } : function (i, d) { ext.vertexAttribDivisorANGLE(i, d); };
    var drawInst = gl2 ? function (n, c) { gl.drawArraysInstanced(gl.TRIANGLES, 0, n, c); } : function (n, c) { ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, n, c); };

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    ['aPos', 'aNor', 'aM0', 'aM1', 'aM2', 'aM3', 'aCol'].forEach(function (n, i) { gl.bindAttribLocation(prog, i, n); });
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var U = {};
    ['uVP', 'uWorld', 'uMode', 'uCam', 'uLight', 'uFog', 'uFogR', 'uTime'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var meshes = {};
    Object.keys(Mesh.geo).forEach(function (k) {
      var data = new Float32Array(Mesh.geo[k]);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      meshes[k] = { buf: buf, count: data.length / 6 };
    });

    function Batch(mesh, mode, isStatic) {
      this.mesh = mesh; this.mode = mode; this.n = 0; this.cap = 64;
      this.data = new Float32Array(this.cap * FLOATS);
      this.buf = gl.createBuffer(); this.isStatic = isStatic; this.dirty = true;
    }
    Batch.prototype.push = function (m, c, a) {
      if (this.n >= this.cap) {
        var nd = new Float32Array(this.cap * 2 * FLOATS);
        nd.set(this.data); this.data = nd; this.cap *= 2;
      }
      var o = this.n * FLOATS, d = this.data;
      for (var i = 0; i < 16; i++) d[o + i] = m[i];
      d[o + 16] = c[0]; d[o + 17] = c[1]; d[o + 18] = c[2]; d[o + 19] = a != null ? a : (c[3] != null ? c[3] : 1);
      this.n++; this.dirty = true;
    };

    var dyn = {}, stat = {};
    var order = [];
    function batch(table, mesh, mode, isStatic) {
      var k = mode + ':' + mesh;
      if (!table[k]) { table[k] = new Batch(mesh, mode, isStatic); order.push(table[k]); }
      return table[k];
    }
    var r = {
      gl: gl, gl2: gl2, drawCalls: 0, instances: 0,
      add: function (mesh, m, c, mode, a) { batch(dyn, mesh, mode || 'lit', false).push(m, c, a); },
      addStatic: function (mesh, m, c, mode, a) { batch(stat, mesh, mode || 'lit', true).push(m, c, a); },
      clearStatic: function () {
        Object.keys(stat).forEach(function (k) { gl.deleteBuffer(stat[k].buf); var i = order.indexOf(stat[k]); if (i >= 0) order.splice(i, 1); });
        stat = {};
      },
      resize: function (w, h) { canvas.width = w; canvas.height = h; },
      draw: function (vp, world, cam, opt) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        var sky = opt.sky;
        gl.clearColor(sky[0], sky[1], sky[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(U.uVP, false, vp);
        gl.uniformMatrix4fv(U.uWorld, false, world);
        gl.uniform3fv(U.uCam, cam);
        gl.uniform3fv(U.uLight, opt.light);
        gl.uniform3f(U.uFog, sky[0], sky[1], sky[2]);
        gl.uniform2f(U.uFogR, opt.fogNear, opt.fogFar);
        gl.uniform1f(U.uTime, opt.time || 0);
        this.drawCalls = 0; this.instances = 0;
        var self = this;
        function run(mode, blend, depthWrite) {
          gl.uniform1f(U.uMode, MODES[mode]);
          if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
          gl.depthMask(depthWrite);
          for (var i = 0; i < order.length; i++) {
            var b = order[i];
            if (b.mode !== mode || !b.n) continue;
            var mesh = meshes[b.mesh];
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); divisor(0, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); divisor(1, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
            if (b.dirty) {
              gl.bufferData(gl.ARRAY_BUFFER, b.data.subarray(0, b.n * FLOATS), b.isStatic ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);
              b.dirty = false;
            }
            for (var k = 0; k < 5; k++) {
              gl.enableVertexAttribArray(2 + k);
              gl.vertexAttribPointer(2 + k, 4, gl.FLOAT, false, FLOATS * 4, k * 16);
              divisor(2 + k, 1);
            }
            drawInst(mesh.count, b.n);
            self.drawCalls++; self.instances += b.n;
          }
        }
        run('lit', false, true);
        run('unlit', false, true);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
        run('shadow', true, false);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        run('water', true, false);
        run('bubble', true, false);
        gl.depthMask(true);
        for (var k = 2; k < 7; k++) divisor(k, 0);
        // つぎの フレームの ために うごく ものを からに する
        Object.keys(dyn).forEach(function (key) { dyn[key].n = 0; });
      },
    };
    return r;
  }
  return { create: create };
})();
