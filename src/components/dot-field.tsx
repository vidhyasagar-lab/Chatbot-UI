"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/*
 * The page background: a graph-paper dot grid that answers the pointer the way
 * retrieval answers a question. Dots near the cursor lift and take the brand
 * colour, a click sends a ripple through the grid, and on the marketing pages a
 * few passages light up now and then on their own.
 *
 * The resting grid is drawn once to an offscreen canvas and blitted; each frame
 * only redraws the dots an effect is touching, so a still pointer costs almost
 * nothing. Reduced motion gets the resting grid and no animation.
 */

const GAP = 24; // px between dots
const DOT = 1; // resting dot radius
const LIFT = 1.6; // extra radius at full intensity

type Mode = { lens: number; strength: number; glow: number; ripples: boolean; pulses: boolean };

// Reading screens stay calm: a smaller, dimmer lens and nothing that moves on its own.
const LOUD: Mode = { lens: 150, strength: 0.9, glow: 0.07, ripples: true, pulses: true };
const QUIET: Mode = { lens: 110, strength: 0.45, glow: 0.03, ripples: false, pulses: false };

const RIPPLE_LIFE = 1600; // ms
const RIPPLE_SPEED = 0.9; // px per ms
const RIPPLE_WIDTH = 46; // px
const PULSE_LIFE = 1900; // ms
const PULSE_EVERY = 650; // ms between new pulses

type Ripple = { x: number; y: number; t0: number };
type Pulse = { i: number; j: number; t0: number };

/**
 * Visibility of the resting grid at a point: full near the top centre, gone
 * before the bottom edge, so the chat composer always sits on clean paper.
 */
function fade(x: number, y: number, w: number, h: number) {
  const d = Math.hypot((x - w / 2) / (0.9 * w), y / (0.8 * h));
  if (d <= 0.25) return 1;
  if (d >= 0.8) return 0;
  return 1 - (d - 0.25) / 0.55;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const modeRef = useRef<Mode>(LOUD);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    modeRef.current = /^\/(chat|admin)(\/|$)/.test(pathname) ? QUIET : LOUD;
    wakeRef.current();
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const base = document.createElement("canvas");
    const bctx = base.getContext("2d");
    if (!bctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let ox = 0;
    let oy = 0;
    let dotColor = "";
    let brand = "";
    let brandClear = "";
    let glowScale = 1;
    let heat = new Float32Array(0);
    const touched: number[] = [];

    // Pointer, eased so the lens glides instead of snapping.
    const pointer = { tx: -1e4, ty: -1e4, x: -1e4, y: -1e4, on: 0, target: 0 };
    const ripples: Ripple[] = [];
    const pulses: Pulse[] = [];
    let lastPulse = 0;
    let raf = 0;

    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      dotColor = css.getPropertyValue("--dots").trim();
      brand = css.getPropertyValue("--brand").trim();
      // Fade to the brand colour at zero alpha: "transparent" is transparent
      // black, and the gradient would pass through grey on the way there.
      brandClear = /^#[0-9a-f]{6}$/i.test(brand) ? `${brand}00` : "transparent";
      glowScale = Number.parseFloat(css.getPropertyValue("--lens-glow")) || 1;
    };

    const drawBase = () => {
      base.width = canvas.width;
      base.height = canvas.height;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, h);
      bctx.fillStyle = dotColor;
      for (let j = 0; j < rows; j++) {
        const y = oy + j * GAP;
        for (let i = 0; i < cols; i++) {
          const x = ox + i * GAP;
          const a = fade(x, y, w, h);
          if (a <= 0) continue;
          bctx.globalAlpha = a;
          bctx.beginPath();
          bctx.arc(x, y, DOT, 0, Math.PI * 2);
          bctx.fill();
        }
      }
      bctx.globalAlpha = 1;
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      ox = ((w % GAP) + GAP) / 2 - GAP / 2;
      oy = GAP / 2;
      heat = new Float32Array(cols * rows);
      readColors();
      drawBase();
      paint(performance.now());
    };

    const warm = (i: number, j: number, v: number) => {
      if (i < 0 || j < 0 || i >= cols || j >= rows || v <= 0) return;
      const k = j * cols + i;
      if (heat[k] === 0) touched.push(k);
      if (v > heat[k]) heat[k] = v;
    };

    // One frame. Returns whether anything is still moving.
    const paint = (now: number) => {
      const mode = modeRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      if (reduce.matches) return false;

      pointer.x += (pointer.tx - pointer.x) * 0.2;
      pointer.y += (pointer.ty - pointer.y) * 0.2;
      pointer.on += (pointer.target - pointer.on) * 0.12;
      let busy = Math.abs(pointer.tx - pointer.x) > 0.3 || Math.abs(pointer.ty - pointer.y) > 0.3 || Math.abs(pointer.target - pointer.on) > 0.01;

      // Lens around the pointer: a faint pool of light, then the dots inside it lift.
      if (pointer.on > 0.01) {
        const R = mode.lens;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pool = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, R * 1.6);
        pool.addColorStop(0, brand);
        pool.addColorStop(1, brandClear);
        ctx.globalAlpha = mode.glow * glowScale * pointer.on;
        ctx.fillStyle = pool;
        ctx.fillRect(pointer.x - R * 1.6, pointer.y - R * 1.6, R * 3.2, R * 3.2);
        ctx.globalAlpha = 1;
        const i0 = Math.floor((pointer.x - R - ox) / GAP);
        const i1 = Math.ceil((pointer.x + R - ox) / GAP);
        const j0 = Math.floor((pointer.y - R - oy) / GAP);
        const j1 = Math.ceil((pointer.y + R - oy) / GAP);
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const d = Math.hypot(ox + i * GAP - pointer.x, oy + j * GAP - pointer.y);
            if (d < R) warm(i, j, smooth(1 - d / R) * pointer.on);
          }
        }
      }

      // Ripples from clicks: a ring of light moving outwards.
      for (let n = ripples.length - 1; n >= 0; n--) {
        const r = ripples[n];
        const age = now - r.t0;
        if (age > RIPPLE_LIFE || !mode.ripples) {
          ripples.splice(n, 1);
          continue;
        }
        busy = true;
        const radius = age * RIPPLE_SPEED;
        const life = 1 - age / RIPPLE_LIFE;
        const outer = radius + RIPPLE_WIDTH;
        const i0 = Math.floor((r.x - outer - ox) / GAP);
        const i1 = Math.ceil((r.x + outer - ox) / GAP);
        const j0 = Math.floor((r.y - outer - oy) / GAP);
        const j1 = Math.ceil((r.y + outer - oy) / GAP);
        for (let j = Math.max(0, j0); j <= Math.min(rows - 1, j1); j++) {
          for (let i = Math.max(0, i0); i <= Math.min(cols - 1, i1); i++) {
            const off = Math.abs(Math.hypot(ox + i * GAP - r.x, oy + j * GAP - r.y) - radius);
            if (off < RIPPLE_WIDTH) warm(i, j, smooth(1 - off / RIPPLE_WIDTH) * life * 0.8);
          }
        }
      }

      // Passages being found: a small cluster brightens and fades, top-weighted.
      if (mode.pulses && !document.hidden) {
        busy = true;
        if (now - lastPulse > PULSE_EVERY) {
          lastPulse = now;
          const i = Math.floor(Math.random() * cols);
          const j = Math.floor(Math.random() ** 1.8 * rows * 0.75);
          if (fade(ox + i * GAP, oy + j * GAP, w, h) > 0.2) pulses.push({ i, j, t0: now });
        }
      }
      for (let n = pulses.length - 1; n >= 0; n--) {
        const p = pulses[n];
        const age = now - p.t0;
        if (age > PULSE_LIFE) {
          pulses.splice(n, 1);
          continue;
        }
        const v = Math.sin((Math.PI * age) / PULSE_LIFE) * 0.75;
        warm(p.i, p.j, v);
        warm(p.i + 1, p.j, v * 0.45);
        warm(p.i - 1, p.j, v * 0.45);
        warm(p.i, p.j + 1, v * 0.45);
        warm(p.i, p.j - 1, v * 0.45);
      }

      // Draw every dot an effect touched, then reset the heat map.
      if (touched.length) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = brand;
        for (const k of touched) {
          const v = heat[k];
          heat[k] = 0;
          if (v < 0.02) continue;
          const x = ox + (k % cols) * GAP;
          const y = oy + Math.floor(k / cols) * GAP;
          // Effects reach past the resting grid's fade, but softer there.
          ctx.globalAlpha = v * mode.strength * (0.45 + 0.55 * fade(x, y, w, h));
          ctx.beginPath();
          ctx.arc(x, y, DOT + v * LIFT, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        touched.length = 0;
      }
      return busy;
    };

    const loop = (now: number) => {
      raf = paint(now) ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!raf && !reduce.matches && !document.hidden) raf = requestAnimationFrame(loop);
    };
    wakeRef.current = wake;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // touch gets ripples, not a lens stuck under the finger
      if (pointer.target === 0) {
        // Entering: start the lens where the pointer is instead of gliding in from a corner.
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
      pointer.target = 1;
      wake();
    };
    const onLeave = () => {
      pointer.target = 0;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (!modeRef.current.ripples) return;
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      if (ripples.length > 4) ripples.shift();
      wake();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else wake();
    };
    const onScheme = () => {
      readColors();
      drawBase();
      paint(performance.now());
      wake();
    };

    resize();
    wake();

    const themeObs = new MutationObserver(onScheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onScheme);

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      themeObs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onScheme);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
