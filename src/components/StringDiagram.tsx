import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import {
  frequencyAtSemitone,
  frequencyToNote,
  semitonePosition,
  type TouchPoint,
} from '../lib/music';
import { displacement, displacementEnvelope, type Mode } from '../lib/timbre';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { PlayMode } from '../types';

const SVG_WIDTH = 900;
const SVG_HEIGHT = 150;
const STRING_LEFT_X = 40;
const STRING_LENGTH = 820;
const STRING_Y = 75;
/** The drawing runs in slow motion: the lowest sounding mode completes this many cycles per second. */
const VISUAL_HZ = 0.75;
/** Peak displacement of the drawn wave, in SVG units. */
const WAVE_AMPLITUDE = 12;
const WAVE_POINTS = 240;

const FRET_POSITIONS = Array.from({ length: 36 }, (_, i) => semitonePosition(i + 1));
const FLAT_PATH = `M ${STRING_LEFT_X} ${STRING_Y} L ${STRING_LEFT_X + STRING_LENGTH} ${STRING_Y}`;

interface Props {
  openFreq: number;
  playMode: PlayMode;
  showVisualize: boolean;
  showFrets: boolean;
  /** Modes that are sounding (after the touch), drawn as their sum. */
  waveModes: Mode[];
  /** Where the lower finger stops the string (0 when not stopped). */
  stopPosition: number;
  naturalPoints: TouchPoint[];
  selectedPosition: number | null;
  onSelectPosition: (position: number) => void;
  /** Touch points of artificial harmonics #1–#8, empty when not stopped. */
  artificialPositions: number[];
  artificialIndex: number;
  onSelectArtificial: (index: number) => void;
}

const toX = (position: number) => STRING_LEFT_X + position * STRING_LENGTH;

const activateOnKey = (action: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};

export function StringDiagram(props: Props) {
  const {
    openFreq, playMode, showVisualize, showFrets, waveModes,
    stopPosition, naturalPoints, selectedPosition, onSelectPosition,
    artificialPositions, artificialIndex, onSelectArtificial,
  } = props;
  const isArtificial = stopPosition > 0;
  const vibrating = playMode !== 'off' && showVisualize;
  const reducedMotion = usePrefersReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);

  // The vibrating length runs from the stopping finger (or the nut) to the bridge.
  const segmentStart = toX(stopPosition);
  const segmentLength = STRING_LENGTH * (1 - stopPosition);
  const envelope = useMemo(() => displacementEnvelope(waveModes, WAVE_POINTS), [waveModes]);
  const scale = WAVE_AMPLITUDE / Math.max(...envelope, 1e-12);
  const envelopePath = useMemo(() => {
    const at = (i: number, sign: number) =>
      `${segmentStart + (i / WAVE_POINTS) * segmentLength} ${STRING_Y + sign * envelope[i] * scale}`;
    const upper = envelope.map((_, i) => at(i, -1));
    const lower = envelope.map((_, i) => at(WAVE_POINTS - i, 1));
    return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
  }, [envelope, scale, segmentStart, segmentLength]);

  // Draw the wave straight into the path element each animation frame, so the
  // rest of the diagram does not re-render 60 times a second.
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    if (!vibrating || waveModes.length === 0) {
      path.setAttribute('d', FLAT_PATH);
      return;
    }
    // Slow the motion down by one common factor, so the modes keep their true frequency ratios.
    const slowdown = VISUAL_HZ / waveModes[0].freq;
    const shape = (seconds: number) => {
      const t = seconds * slowdown;
      let d = `M ${STRING_LEFT_X} ${STRING_Y} L ${segmentStart} ${STRING_Y}`;
      for (let i = 1; i <= WAVE_POINTS; i++) {
        const x = i / WAVE_POINTS;
        d += ` L ${segmentStart + x * segmentLength} ${STRING_Y + displacement(waveModes, x, t) * scale}`;
      }
      return d;
    };
    if (reducedMotion) {
      // A still frame a quarter of the way through the lowest mode's cycle, near full swing.
      path.setAttribute('d', shape(1 / (4 * VISUAL_HZ)));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      path.setAttribute('d', shape((now - start) / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [vibrating, waveModes, segmentStart, segmentLength, scale, reducedMotion]);

  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div className="section-label">String</div>
      <div className="string-scroll">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="string-svg"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="String drawn to scale from nut (left) to bridge (right)"
        >
          <defs>
            {/* Fixed region: a bounding-box region would clip the glow when the string is nearly flat. */}
            <filter id="stringGlow" filterUnits="userSpaceOnUse" x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Semitone ("fret") lines */}
          {showFrets && FRET_POSITIONS.map((pos, i) => (
            <g key={i} aria-hidden="true">
              <line x1={toX(pos)} y1={30} x2={toX(pos)} y2={120} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              {i < 24 && (
                <text
                  x={toX(pos)}
                  y={i % 2 === 0 ? 142 : 16}
                  fontSize="7"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.18)"
                >
                  {frequencyToNote(frequencyAtSemitone(openFreq, i + 1)).note.slice(0, -1)}
                </text>
              )}
            </g>
          ))}

          {/* Envelope the string moves within */}
          {vibrating && waveModes.length > 0 && (
            <path d={envelopePath} fill="rgba(201,168,76,0.07)" stroke="none" aria-hidden="true" />
          )}

          {/* String */}
          <path
            ref={pathRef}
            d={FLAT_PATH}
            stroke="#c9a84c"
            strokeWidth="2.5"
            fill="none"
            filter={vibrating ? 'url(#stringGlow)' : undefined}
            style={{ transition: 'stroke 0.3s ease' }}
          />

          {/* Natural harmonic nodes */}
          {!isArtificial && naturalPoints.map((point, i) => {
            const selected = selectedPosition === point.position;
            const select = () => onSelectPosition(point.position);
            return (
              <g
                key={i}
                className="node"
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Touch point ${point.numerator}/${point.denominator} of the string`}
                onClick={select}
                onKeyDown={activateOnKey(select)}
              >
                <circle cx={toX(point.position)} cy={STRING_Y} r="16" fill="transparent" />
                <circle
                  className="node-dot"
                  cx={toX(point.position)}
                  cy={STRING_Y}
                  r="7"
                  fill={selected ? '#c9a84c' : 'rgba(201,168,76,0.25)'}
                  stroke={selected ? '#e0c876' : 'rgba(201,168,76,0.4)'}
                  strokeWidth="1.5"
                />
                <text
                  x={toX(point.position)}
                  y={45}
                  fontSize="9"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                  fill="rgba(201,168,76,0.6)"
                >
                  {point.numerator}/{point.denominator}
                </text>
              </g>
            );
          })}

          {/* Stopping finger */}
          {isArtificial && (
            <rect x={toX(stopPosition) - 2.5} y={STRING_Y - 14} width="5" height="28" rx="2" fill="#c9a84c" opacity="0.8" />
          )}

          {/* Artificial harmonic nodes */}
          {artificialPositions.map((position, i) => {
            const selected = artificialIndex === i;
            const select = () => onSelectArtificial(i);
            return (
              <g
                key={`artificial-${i}`}
                className="node"
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={i === 0 ? 'Harmonic #1: the stopped note' : `Touch point for artificial harmonic #${i + 1}`}
                onClick={select}
                onKeyDown={activateOnKey(select)}
              >
                <circle cx={toX(position)} cy={STRING_Y} r="12" fill="transparent" />
                <circle
                  className="node-dot"
                  cx={toX(position)}
                  cy={STRING_Y}
                  r="7"
                  fill={selected ? '#c9a84c' : 'rgba(201,168,76,0.2)'}
                  stroke={selected ? '#e0c876' : 'rgba(201,168,76,0.3)'}
                  strokeWidth="1.5"
                />
                <text
                  x={toX(position)}
                  y={i % 2 === 0 ? STRING_Y + 28 : STRING_Y - 14}
                  fontSize="8"
                  fontFamily="'JetBrains Mono', monospace"
                  textAnchor="middle"
                  fill={selected ? '#c9a84c' : 'rgba(201,168,76,0.45)'}
                  fontWeight="600"
                >
                  #{i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
