"use client";

/**
 * ShaderAurora — a signature WebGL backdrop: a slow, living aurora of
 * domain-warped noise in the brand palette (obsidian base, orbital cyan, soft
 * ultraviolet, ion magenta). Built to be breathtaking but disciplined:
 *
 *  - GPU fragment shader (one full-screen triangle) — cheap, 60fps.
 *  - Calm by design: low contrast, slow flow — it lives, it doesn't flicker.
 *  - prefers-reduced-motion → renders a single static frame (no loop).
 *  - Pauses when the tab is hidden or the element scrolls offscreen.
 *  - devicePixelRatio clamped for perf; resizes with the container.
 *  - WebGL unavailable → a static CSS gradient fallback. Never blank.
 *
 * aria-hidden, pointer-events-none, absolutely fills its positioned parent.
 * Pure ambiance — no data claim.
 */

import { useEffect, useRef, useState } from "react";

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

// hash + value noise + fbm (domain-warped) — a standard, smooth aurora field.
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for(int i=0;i<5;i++){ v += amp*noise(p); p *= 2.02; amp *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;          // aspect-correct
  float t = u_time * 0.025;          // slow

  // domain warp for flowing filaments
  vec2 q = vec2(fbm(p*1.6 + vec2(0.0, t)), fbm(p*1.6 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p*1.6 + 3.4*q + vec2(1.7,9.2) + t), fbm(p*1.6 + 3.4*q + vec2(8.3,2.8) - t));
  float f = fbm(p*1.6 + 2.6*r);

  // brand palette
  vec3 obsidian = vec3(0.020, 0.024, 0.031);
  vec3 cyan     = vec3(0.000, 0.898, 1.000);
  vec3 violet   = vec3(0.478, 0.361, 1.000);
  vec3 magenta  = vec3(1.000, 0.176, 0.839);

  vec3 col = obsidian;
  col = mix(col, violet,  clamp(f*f*1.15, 0.0, 1.0) * 0.55);
  col = mix(col, cyan,    clamp(length(q)*0.9, 0.0, 1.0) * 0.40);
  col = mix(col, magenta, clamp(r.x*r.x*1.2, 0.0, 1.0) * 0.22);

  // keep it deep: bias toward obsidian + radial vignette
  float vig = smoothstep(1.25, 0.25, length(uv-0.5));
  col = mix(obsidian, col, 0.35 + 0.65*vig);
  col *= 0.9;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function ShaderAurora({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, premultipliedAlpha: false });
    if (!gl) { setFailed(true); return; }

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setFailed(true); return; }
    const prog = gl.createProgram();
    if (!prog) { setFailed(true); return; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFailed(true); return; }
    gl.useProgram(prog);

    // one big triangle covering the clip space
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    let raf = 0;
    let start = 0;
    let running = true;
    let visible = true;
    const reduced = prefersReducedMotion();

    const drawFrame = (timeSec: number) => {
      resize();
      gl.uniform1f(uTime, timeSec);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (!running) return;
      if (!start) start = now;
      drawFrame((now - start) / 1000);
      raf = window.requestAnimationFrame(loop);
    };

    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const startLoop = () => { if (running || reduced) return; running = true; start = 0; raf = window.requestAnimationFrame(loop); };

    const onVisibility = () => { if (document.hidden) stop(); else if (visible) startLoop(); };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) startLoop(); else stop();
    }, { threshold: 0 });
    io.observe(canvas);

    const onResize = () => { resize(); if (reduced) drawFrame(8.0); };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => { resize(); if (reduced) drawFrame(8.0); });
    ro.observe(canvas);

    // Guarantee a correctly-sized first paint independent of rAF / IntersectionObserver timing.
    resize();
    drawFrame(reduced ? 8.0 : 0.0);

    if (reduced) {
      running = false; // a single, settled static frame is already drawn
    } else {
      raf = window.requestAnimationFrame(loop);
    }

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      io.disconnect();
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf);
    };
  }, []);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{
          background:
            "radial-gradient(60% 80% at 30% 20%, rgba(123,97,255,0.20), transparent 60%), radial-gradient(50% 70% at 78% 30%, rgba(0,229,255,0.14), transparent 60%), radial-gradient(60% 80% at 50% 100%, rgba(255,56,199,0.10), transparent 60%), #05070B",
        }}
      />
    );
  }

  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
}
