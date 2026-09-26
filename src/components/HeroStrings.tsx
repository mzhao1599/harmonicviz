import { useEffect, useRef } from 'react';
import { gcd } from '../lib/music';
import {
  SIM_MODES,
  createStrings,
  pluck,
  rest,
  shapeAt,
  sinTable,
  step,
  sympatheticDrive,
  type SimString,
} from '../lib/stringSim';
import type { TonePartial } from '../audio/ToneEngine';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface Props {
  strings: { name: string; freq: number }[];
  selected: string;
  onSelect: (name: string) => void;
  /** Partials the app is playing, which drive the strings sympathetically. */
  sounding: TonePartial[] | null;
}

const POINTS = 180;
const TABLE = sinTable(POINTS);
const LEFT = 52;
const RIGHT = 18;
const MARGIN_Y = 26;
/** Pixels per unit of modal displacement. */
const AMP_PX = 14;
/** Plucking point, as a fraction from the nut: near the bridge, where players pluck and bow. */
const PLUCK_AT = 0.88;
const INTRO_GAP = 0.32;

const AMBER = '#e2ad4a';
const STEEL = 'rgba(214, 205, 188, 0.5)';
const LABEL = 'rgba(214, 205, 188, 0.55)';
const INK = '#f3ead6';

/** The simple fraction i/n (n ≤ 8) that x is on, if any, as a harmonic hint. */
function nodeHint(x: number): string | null {
  for (let n = 2; n <= 8; n++) {
    for (let i = 1; i < n; i++) {
      if (gcd(i, n) === 1 && Math.abs(x - i / n) < 0.012) return `${i}/${n} · harmonic #${n}`;
    }
  }
  return null;
}

export function HeroStrings({ strings, selected, onSelect, sounding }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const freqKey = strings.map(s => s.freq).join(',');

  // Values the animation loop reads without restarting.
  const live = useRef({ strings, selected, onSelect, sounding });
  useEffect(() => {
    live.current = { strings, selected, onSelect, sounding };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const sims: SimString[] = createStrings(freqKey.split(',').map(Number));
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let last = 0;
    let time = 0;
    let driveKey: TonePartial[] | null = null;
    let drives: (Float64Array | null)[] = sims.map(() => null);
    let hover: { string: number; x: number } | null = null;
    // Intro: pluck the strings from lowest to highest, as when checking the tuning.
    let intro = reducedMotion ? [] : sims.map((_, i) => ({ string: i, at: 0.15 + i * INTRO_GAP }));

    const geometry = () => {
      const spacing = (height - 2 * MARGIN_Y) / (sims.length - 1);
      // Highest string on top, as on a staff.
      return { spacing, yOf: (i: number) => height - MARGIN_Y - i * spacing, x0: LEFT, x1: width - RIGHT };
    };

    const draw = () => {
      const { yOf, x0, x1 } = geometry();
      ctx.clearRect(0, 0, width, height);
      const names = live.current.strings.map(s => s.name);
      ctx.lineCap = 'round';

      // Nut and bridge.
      ctx.fillStyle = 'rgba(214, 205, 188, 0.18)';
      ctx.fillRect(x0 - 3, yOf(sims.length - 1) - 10, 3, yOf(0) - yOf(sims.length - 1) + 20);
      ctx.fillRect(x1, yOf(sims.length - 1) - 10, 2, yOf(0) - yOf(sims.length - 1) + 20);

      sims.forEach((s, i) => {
        const y0 = yOf(i);
        const isSelected = names[i] === live.current.selected;
        ctx.beginPath();
        for (let p = 0; p <= POINTS; p++) {
          const x = x0 + (p / POINTS) * (x1 - x0);
          const y = y0 + shapeAt(s, TABLE, p) * AMP_PX;
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isSelected ? AMBER : STEEL;
        ctx.lineWidth = 2.6 - i * 0.35;
        ctx.shadowColor = isSelected ? 'rgba(226, 173, 74, 0.55)' : 'transparent';
        ctx.shadowBlur = isSelected ? 8 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isSelected ? AMBER : LABEL;
        ctx.fillText(names[i] ?? '', 12, y0);
      });

      if (hover) {
        const { yOf: y } = geometry();
        const fx = x0 + hover.x * (x1 - x0);
        const fy = y(hover.string);
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
        const hint = nodeHint(hover.x);
        if (hint) {
          ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
          ctx.textBaseline = 'bottom';
          ctx.textAlign = fx > width - 120 ? 'right' : 'center';
          ctx.fillStyle = INK;
          ctx.fillText(hint, fx, fy - 9);
          ctx.textAlign = 'left';
        }
      }
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      time += dt;

      intro = intro.filter(p => {
        if (time < p.at) return true;
        pluck(sims[p.string], PLUCK_AT, 1.0);
        return false;
      });

      const partials = live.current.sounding;
      if (partials !== driveKey) {
        driveKey = partials;
        drives = sims.map(s => (partials ? sympatheticDrive(s.freq, partials) : null));
      }
      sims.forEach((s, i) => step(s, dt, time, drives[i], true));
      draw();
      if (visible) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reducedMotion) {
        draw();
      } else if (!frame && visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const locate = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const { spacing, yOf, x0, x1 } = geometry();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const x = (px - x0) / (x1 - x0);
      if (x <= 0.005 || x >= 0.995) return null;
      let best = -1;
      sims.forEach((_, i) => {
        if (Math.abs(py - yOf(i)) < spacing / 2) best = i;
      });
      return best < 0 ? null : { string: best, x };
    };

    const setTouch = (spot: { string: number; x: number } | null) => {
      hover = spot;
      sims.forEach((s, i) => (s.touch = spot && spot.string === i ? spot.x : null));
      canvas.style.cursor = spot ? 'pointer' : 'default';
      if (reducedMotion) draw();
    };

    const skipIntro = () => {
      if (intro.length === 0) return;
      intro = [];
      sims.forEach(rest);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      setTouch(locate(e));
    };
    const onDown = (e: PointerEvent) => {
      skipIntro();
      const spot = locate(e);
      if (!spot) return;
      setTouch(spot);
      if (!reducedMotion) pluck(sims[spot.string], PLUCK_AT, 1.2);
      const name = live.current.strings[spot.string]?.name;
      if (name) live.current.onSelect(name);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setTouch(null);
    };
    const onLeave = () => setTouch(null);

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onLeave);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('keydown', skipIntro);
    window.addEventListener('wheel', skipIntro, { passive: true });
    window.addEventListener('touchstart', skipIntro, { passive: true });
    window.addEventListener('scroll', skipIntro, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    visibility.observe(canvas);

    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onLeave);
      canvas.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', skipIntro);
      window.removeEventListener('wheel', skipIntro);
      window.removeEventListener('touchstart', skipIntro);
      window.removeEventListener('scroll', skipIntro);
    };
  }, [freqKey, reducedMotion]);

  // Under reduced motion there is no loop, so redraw the still frame when the selection changes.
  useEffect(() => {
    if (reducedMotion) canvasRef.current?.dispatchEvent(new PointerEvent('pointerleave'));
  }, [selected, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      role="img"
      aria-label={`The open strings, ${strings.map(s => s.name).join(', ')}, drawn as a sum of ${SIM_MODES} vibrating modes each`}
    />
  );
}
