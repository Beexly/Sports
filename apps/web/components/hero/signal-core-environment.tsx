"use client";

/**
 * SignalCoreEnvironment — The living command room.
 *
 * A transparent WebGL overlay that transforms the static hero plate into a
 * breathing intelligence space. Renders:
 *  - Traveling signal particles along filament paths
 *  - A pulsing decision core with orbital ring resonance
 *  - Data packets that stream from source mesh toward the core
 *  - Occasional magenta fracture flickers where signals contradict
 *  - Mouse-reactive parallax light shafts
 *
 * Built as an additive transparent layer over the GeneratedPlate.
 * Performance: one fullscreen triangle, pure fragment shader.
 * Pauses off-screen and when tab is hidden. Reduced motion → static frame.
 */

import { useEffect, useRef, useState } from "react";

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_scroll;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash1(float n) { return fract(sin(n) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float filament(vec2 uv, float seed, float t) {
  float id = hash1(seed);
  float yBase = (id - 0.5) * 0.7;
  float curve = sin(uv.x * 4.0 + seed * 3.0) * 0.06;
  float converge = smoothstep(0.1, 0.7, uv.x);
  float pathY = mix(yBase + curve, -0.05, converge * 0.55);
  float dist = abs(uv.y - pathY);
  float thick = 0.003 + id * 0.004;
  float line = smoothstep(thick, 0.0, dist);
  float speed = 0.15 + id * 0.25;
  float packetPos = fract(t * speed + seed * 0.7);
  float packetX = packetPos * 0.75;
  float packetDist = length(vec2((uv.x - packetX) * 0.8, uv.y - pathY));
  float packet = smoothstep(0.015, 0.0, packetDist);
  float coreDist = length(uv - vec2(0.58, 0.0));
  float coreFade = smoothstep(0.15, 0.35, coreDist);
  return (line * 0.25 + packet * 0.9) * coreFade;
}

float coreGlow(vec2 uv, vec2 pos, float t) {
  float d = length(uv - pos);
  float breath = 1.0 + sin(t * 0.8) * 0.08 + sin(t * 1.3 + 1.0) * 0.04;
  float glow = exp(-d * d * 12.0) * 0.35 * breath;
  glow += smoothstep(0.08, 0.0, d) * 0.2;
  float ring1 = abs(length((uv - pos) * vec2(1.0, 0.55)) - 0.12);
  float ring2 = abs(length((uv - pos) * vec2(0.85, 1.0)) - 0.18);
  float ring3 = abs(length((uv - pos) * vec2(1.0, 0.7)) - 0.24);
  float ringGlow = smoothstep(0.003, 0.0, abs(ring1 - 0.001)) * 0.15;
  ringGlow += smoothstep(0.002, 0.0, abs(ring2 - 0.001)) * 0.12;
  ringGlow += smoothstep(0.002, 0.0, abs(ring3 - 0.001)) * 0.08;
  float ringArc = smoothstep(0.20, 0.08, d) * smoothstep(0.04, 0.10, d);
  glow += ringArc * 0.1 * breath;
  return glow + ringGlow;
}

float gateStructure(vec2 uv, float t) {
  float gateX = 1.15;
  float mask = smoothstep(0.7, 0.9, uv.x) * smoothstep(1.6, 0.9, uv.x);
  float barY1 = 0.15, barY2 = -0.05, barY3 = -0.25;
  float bar1 = smoothstep(0.003, 0.0, abs(uv.y - barY1));
  float bar2 = smoothstep(0.003, 0.0, abs(uv.y - barY2));
  float bar3 = smoothstep(0.003, 0.0, abs(uv.y - barY3));
  float post = smoothstep(0.003, 0.0, abs(uv.x - gateX));
  float pulse1 = smoothstep(0.02, 0.0, length(uv - vec2(gateX - 0.04, barY1))) * (0.5 + 0.5 * sin(t * 2.0));
  float pulse2 = smoothstep(0.02, 0.0, length(uv - vec2(gateX - 0.04, barY2))) * (0.5 + 0.5 * sin(t * 1.7 + 2.0));
  float clearY = barY3 + 0.06 * sin(t * 0.5);
  float clearSignal = smoothstep(0.015, 0.0, length(uv - vec2(gateX + 0.03, clearY))) * smoothstep(0.0, 0.5, sin(t * 0.3));
  return (bar1 + bar2 + bar3 + post * 0.5 + pulse1 + pulse2 + clearSignal) * mask * 0.25;
}

float fracture(vec2 uv, float t) {
  float flicker = step(0.97, sin(t * 0.4) * 0.5 + 0.5) * step(0.3, abs(sin(t * 3.7)));
  float flicker2 = step(0.985, sin(t * 0.27 + 3.0)) * step(0.5, abs(sin(t * 4.3)));
  float f1 = smoothstep(0.003, 0.0, abs(uv.y - (0.05 + uv.x * 0.12))) * flicker;
  float f2 = smoothstep(0.002, 0.0, abs(uv.y - (-0.12 + uv.x * 0.08))) * flicker2;
  return (f1 + f2) * 0.8;
}

float probabilityCurve(vec2 uv, float t) {
  float curveY = 0.42 + sin(uv.x * 5.0 + t * 0.2) * 0.035 + sin(uv.x * 10.0) * 0.012;
  float dist = abs(uv.y - curveY);
  float line = smoothstep(0.003, 0.0, dist);
  float mask = smoothstep(0.2, 0.5, uv.x) * smoothstep(0.7, 0.4, uv.x);
  return line * mask * 0.35;
}

float dataParticles(vec2 uv, float t) {
  float particles = 0.0;
  for (float i = 0.0; i < 12.0; i++) {
    float id = i + 1.0;
    float x = hash1(id * 7.3) * 0.6;
    float y = hash1(id * 13.7) * 1.4 - 0.7;
    float speed = 0.05 + hash1(id * 3.1) * 0.1;
    float drift = sin(t * speed + id) * 0.08;
    float px = x + drift;
    float py = y + sin(t * speed * 0.5 + id * 2.0) * 0.03;
    float d = length(uv - vec2(px, py));
    float size = 0.003 + hash1(id * 5.5) * 0.005;
    particles += smoothstep(size, 0.0, d) * (0.3 + 0.7 * hash1(id * 11.1));
  }
  return particles * 0.4;
}

float godRays(vec2 uv, vec2 corePos, float t) {
  float rays = 0.0;
  for (float i = 0.0; i < 6.0; i++) {
    float angle = (i / 6.0) * 6.28318 + t * 0.02;
    vec2 dir = vec2(cos(angle), sin(angle));
    float proj = dot(uv - corePos, dir);
    float perp = abs(dot(uv - corePos, vec2(-dir.y, dir.x)));
    float ray = smoothstep(0.08, 0.0, perp) * smoothstep(0.0, 0.4, proj) * exp(-proj * proj * 2.0) * (0.5 + 0.5 * sin(t * 0.5 + i));
    rays += ray * 0.08;
  }
  return rays;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= aspect;
  
  // Scroll-driven camera: as user scrolls, we drift through the room
  float scrollPhase = u_scroll * 2.0 - 1.0; // -1 to 1 across full page
  vec3 camPos = vec3(
    scrollPhase * 0.15,
    sin(scrollPhase * 1.5) * 0.08,
    scrollPhase * 0.3
  );
  p += camPos.xy;
  
  // Depth-of-field effect: edges soften as we scroll deeper
  float dof = smoothstep(0.0, 1.0, abs(scrollPhase)) * 0.02;
  p += (hash(p * 100.0 + u_time) - 0.5) * dof;
  vec2 mouseOffset = (u_mouse - 0.5) * vec2(0.06, 0.04);
  p += mouseOffset;
  float t = u_time;
  vec2 corePos = vec2(0.62, -0.05);
  vec3 cyan = vec3(0.0, 0.898, 1.0);
  vec3 violet = vec3(0.478, 0.361, 1.0);
  vec3 magenta = vec3(1.0, 0.176, 0.839);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float filaments = 0.0;
  for (float i = 0.0; i < 8.0; i++) {
    float f = filament(p, i + 1.0, t);
    float distToCore = length(p - corePos);
    vec3 fCol = mix(violet, cyan, smoothstep(0.4, 0.15, distToCore));
    col += fCol * f;
    alpha += f * 0.7;
  }
  float particles = dataParticles(p, t);
  col += mix(violet, cyan, 0.5) * particles;
  alpha += particles * 0.5;
  float core = coreGlow(p, corePos, t);
  col += cyan * core * 0.9;
  col += vec3(0.6, 0.95, 1.0) * core * 0.4;
  alpha += core * 0.85;
  float rays = godRays(p, corePos, t);
  col += cyan * rays * 0.6;
  alpha += rays * 0.4;
  float gate = gateStructure(p, t);
  col += mix(cyan, violet, 0.3) * gate;
  alpha += gate * 0.6;
  float frac = fracture(p, t);
  col += magenta * frac;
  alpha += frac * 0.8;
  float prob = probabilityCurve(p, t);
  col += cyan * prob * 0.7;
  alpha += prob * 0.5;
  float fog = fbm(p * 1.5 + t * 0.01) * 0.04;
  col += violet * fog * 0.3;
  alpha += fog * 0.3;
  float vig = 1.0 - smoothstep(0.5, 1.4, length(p * vec2(0.8, 1.0)));
  col *= vig;
  alpha *= vig;
  col = pow(col, vec3(0.85)) * 1.1;
  gl_FragColor = vec4(col, alpha * 0.9);
}
`;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SignalCoreEnvironment({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      depth: false,
      premultipliedAlpha: true,
    });
    if (!gl) { setFailed(true); return; }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
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

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uScroll = gl.getUniformLocation(prog, "u_scroll");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    let raf = 0;
    let start = 0;
    let running = true;
    let visible = true;
    const reduced = prefersReducedMotion();

    let scrollProgress = 0;
    const updateScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    const drawFrame = (timeSec: number, mouse: { x: number; y: number }) => {
      resize();
      gl.uniform1f(uTime, timeSec);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, scrollProgress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      if (!running) return;
      if (!start) start = now;
      drawFrame((now - start) / 1000, mouseRef.current);
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const startLoop = () => {
      if (running || reduced) return;
      running = true;
      start = 0;
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) startLoop(); else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onResize = () => {
      resize();
      if (reduced) drawFrame(8.0, mouseRef.current);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) drawFrame(8.0, mouseRef.current);
    });
    ro.observe(canvas);

    resize();
    drawFrame(reduced ? 8.0 : 0.0, mouseRef.current);

    if (reduced) {
      running = false;
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      stop();
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      io.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        mixBlendMode: "screen",
      }}
    />
  );
}
