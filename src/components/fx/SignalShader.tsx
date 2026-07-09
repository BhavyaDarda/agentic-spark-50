import { useEffect, useRef } from "react";

/**
 * WebGL flow-field / caustics backdrop rendered with OGL.
 * - Obsidian base with slow signal-cyan drift.
 * - Respects prefers-reduced-motion → static gradient fallback (no GL loop).
 * - Pauses when tab hidden.
 * - Dynamically imports OGL so SSR never touches `window`.
 */
export function SignalShader({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let disposed = false;
    let onResize: (() => void) | null = null;
    let onVis: (() => void) | null = null;
    let renderer: import("ogl").Renderer | null = null;

    (async () => {
      const { Renderer, Program, Mesh, Triangle } = await import("ogl");
      if (disposed || !wrap) return;

      const r = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        dpr: Math.min(window.devicePixelRatio, 1.75),
      });
      renderer = r;
      const gl = r.gl;
      gl.clearColor(0, 0, 0, 0);
      wrap.appendChild(gl.canvas);
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      gl.canvas.style.display = "block";

      const vertex = /* glsl */ `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      // Domain-warped fbm — soft aurora-caustic feel, kept cheap.
      const fragment = /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uRes;
        uniform vec2 uMouse;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 p){
          float v = 0.0, a = 0.5;
          for(int i = 0; i < 5; i++){
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
          }
          return v;
        }

        void main(){
          vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
          float t = uTime * 0.035;

          vec2 q = vec2(fbm(uv + t), fbm(uv - t + 4.7));
          vec2 r = vec2(
            fbm(uv + 1.3 * q + vec2(1.7, 9.2) + 0.15 * t),
            fbm(uv + 1.3 * q + vec2(8.3, 2.8) + 0.13 * t)
          );
          float f = fbm(uv + r);

          // Palette anchors — obsidian → deep teal → signal cyan.
          vec3 obsidian  = vec3(0.045, 0.055, 0.075);
          vec3 midnight  = vec3(0.05, 0.10, 0.14);
          vec3 signalDim = vec3(0.10, 0.42, 0.52);
          vec3 signal    = vec3(0.45, 0.92, 0.98);

          vec3 col = mix(obsidian, midnight, smoothstep(0.0, 0.7, f));
          col = mix(col, signalDim, smoothstep(0.55, 0.95, r.x));
          col = mix(col, signal, smoothstep(0.82, 1.0, f * r.y));

          // Radial vignette from top-center — hero anchor.
          float d = length(uv - vec2(0.0, -0.35));
          col *= smoothstep(1.6, 0.15, d);

          // Subtle grain.
          float g = hash(gl_FragCoord.xy + uTime) * 0.03 - 0.015;
          col += g;

          // Soft edge falloff so backdrop dies at the fold.
          float a = smoothstep(0.0, 0.35, 1.0 - abs(uv.y * 0.9));
          gl_FragColor = vec4(col, a * 0.95);
        }
      `;

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: [1, 1] },
          uMouse: { value: [0, 0] },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });

      const resize = () => {
        const w = wrap.clientWidth || window.innerWidth;
        const h = wrap.clientHeight || window.innerHeight;
        r.setSize(w, h);
        program.uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      };
      onResize = resize;
      resize();
      window.addEventListener("resize", resize);

      let running = true;
      const vis = () => {
        running = document.visibilityState === "visible";
        if (running) loop(performance.now());
      };
      onVis = vis;
      document.addEventListener("visibilitychange", vis);

      const start = performance.now();
      const loop = (now: number) => {
        if (!running || disposed) return;
        program.uniforms.uTime.value = (now - start) / 1000;
        r.render({ scene: mesh });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener("resize", onResize);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      const canvas = renderer?.gl?.canvas;
      if (canvas && canvas.parentElement === wrap) wrap.removeChild(canvas);
      const loseCtx = renderer?.gl?.getExtension("WEBGL_lose_context");
      loseCtx?.loseContext();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={
        "absolute inset-0 overflow-hidden [background:radial-gradient(60%_50%_at_50%_0%,oklch(0.22_0.05_200/0.35),transparent_70%),oklch(0.13_0.005_260)] " +
        (className ?? "")
      }
    />
  );
}
