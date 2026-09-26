import {
  frequencyAtSemitone,
  frequencyToNote,
  semitonePosition,
  type TouchPoint,
} from '../lib/music';
import type { PlayMode } from '../types';

const SVG_WIDTH = 900;
const SVG_HEIGHT = 150;
const STRING_LEFT_X = 40;
const STRING_LENGTH = 820;
const STRING_Y = 75;

const FRET_POSITIONS = Array.from({ length: 36 }, (_, i) => semitonePosition(i + 1));

interface Props {
  openFreq: number;
  playMode: PlayMode;
  showVisualize: boolean;
  showFrets: boolean;
  harmonicNumber: number;
  animationPhase: number;
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

export function StringDiagram(props: Props) {
  const {
    openFreq, playMode, showVisualize, showFrets, harmonicNumber, animationPhase,
    stopPosition, naturalPoints, selectedPosition, onSelectPosition,
    artificialPositions, artificialIndex, onSelectArtificial,
  } = props;
  const isArtificial = stopPosition > 0;
  const vibrating = playMode !== 'off' && showVisualize;

  const drawString = () => {
    let path = `M ${STRING_LEFT_X} ${STRING_Y}`;
    if (!vibrating) return `${path} L ${STRING_LEFT_X + STRING_LENGTH} ${STRING_Y}`;

    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const normalizedX = i / segments;
      let amplitude = 0;
      if (playMode === 'natural') {
        amplitude = 8 * Math.sin(normalizedX * Math.PI * harmonicNumber) * Math.sin(animationPhase);
      } else if (playMode === 'artificial' && normalizedX >= stopPosition && stopPosition < 0.999) {
        const adjustedX = (normalizedX - stopPosition) / (1 - stopPosition);
        amplitude = 8 * Math.sin(adjustedX * Math.PI * (artificialIndex + 1)) * Math.sin(animationPhase);
      }
      path += ` L ${toX(normalizedX)} ${STRING_Y + amplitude}`;
    }
    return path;
  };

  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div className="section-label">String</div>
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="stringGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Semitone ("fret") lines */}
        {showFrets && FRET_POSITIONS.map((pos, i) => (
          <g key={i}>
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

        {/* String */}
        <path
          d={drawString()}
          stroke="#c9a84c"
          strokeWidth="2.5"
          fill="none"
          filter={vibrating ? 'url(#stringGlow)' : undefined}
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Natural harmonic nodes */}
        {!isArtificial && naturalPoints.map((point, i) => (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => onSelectPosition(point.position)}>
            <circle
              cx={toX(point.position)}
              cy={STRING_Y}
              r="7"
              fill={selectedPosition === point.position ? '#c9a84c' : 'rgba(201,168,76,0.25)'}
              stroke={selectedPosition === point.position ? '#e0c876' : 'rgba(201,168,76,0.4)'}
              strokeWidth="1.5"
              style={{ transition: 'all 0.2s ease' }}
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
        ))}

        {/* Stopping finger */}
        {isArtificial && (
          <rect x={toX(stopPosition) - 2.5} y={STRING_Y - 14} width="5" height="28" rx="2" fill="#c9a84c" opacity="0.8" />
        )}

        {/* Artificial harmonic nodes */}
        {artificialPositions.map((position, i) => (
          <g key={`artificial-${i}`} style={{ cursor: 'pointer' }} onClick={() => onSelectArtificial(i)}>
            <circle
              cx={toX(position)}
              cy={STRING_Y}
              r="7"
              fill={artificialIndex === i ? '#c9a84c' : 'rgba(201,168,76,0.2)'}
              stroke={artificialIndex === i ? '#e0c876' : 'rgba(201,168,76,0.3)'}
              strokeWidth="1.5"
              style={{ transition: 'all 0.2s ease' }}
            />
            <text
              x={toX(position)}
              y={i % 2 === 0 ? STRING_Y + 28 : STRING_Y - 14}
              fontSize="8"
              fontFamily="'JetBrains Mono', monospace"
              textAnchor="middle"
              fill={artificialIndex === i ? '#c9a84c' : 'rgba(201,168,76,0.45)'}
              fontWeight="600"
            >
              #{i + 1}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
