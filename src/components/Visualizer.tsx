import { useMemo } from 'react';
import {
  getHarmonicPositions,
  getNoteAtFret,
  getArtificialHarmonicPositions,
  calculateArtificialHarmonics,
  getStopPosition
} from '@/lib/music-utils';

interface VisualizerProps {
  playMode: string;
  showFrets: boolean;
  harmonicNumber: number;
  selectedPosition: number | null;
  animationPhase: number;
  fingerPosition: number;
  fingerCents: number;
  fingerInputMode: string;
  artificialHarmonicIndex: number;
  baseFreq: number;
  onSelectPosition: (position: number) => void;
  onSelectArtificialHarmonic: (index: number) => void;
}

const STRING_SVG_WIDTH = 900;
const STRING_SVG_HEIGHT = 150;
const STRING_LEFT_X = 40;
const STRING_LENGTH = 820;
const STRING_Y = 75;

export const Visualizer = ({
  playMode,
  showFrets,
  harmonicNumber,
  selectedPosition,
  animationPhase,
  fingerPosition,
  fingerCents,
  fingerInputMode,
  artificialHarmonicIndex,
  baseFreq,
  onSelectPosition,
  onSelectArtificialHarmonic
}: VisualizerProps) => {

  const harmonicPositions = useMemo(() => getHarmonicPositions(harmonicNumber), [harmonicNumber]);

  // Generate fret positions for display (36 frets)
  const fretPositions = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const fretDistance = 1 - Math.pow(2, -(i + 1) / 12);
    return fretDistance;
  }), []);

  const drawString = () => {
    let path = `M ${STRING_LEFT_X} ${STRING_Y}`;

    if (playMode !== 'off') {
      const segments = 100;

      for (let i = 0; i <= segments; i++) {
        const x = STRING_LEFT_X + (i / segments) * STRING_LENGTH;
        const normalizedX = i / segments;

        let amplitude;
        if (playMode === 'natural') {
          amplitude = 8 * Math.sin(normalizedX * Math.PI * harmonicNumber) * Math.sin(animationPhase);
        } else if (playMode === 'artificial') {
          const artificialHarmonics = calculateArtificialHarmonics(baseFreq, fingerInputMode, fingerPosition, fingerCents);
          const currentArtificial = artificialHarmonics[artificialHarmonicIndex];
          const stopPosition = getStopPosition(fingerInputMode, fingerPosition, fingerCents);
          if (normalizedX < stopPosition || stopPosition >= 0.999) {
            amplitude = 0;
          } else {
            const adjustedX = (normalizedX - stopPosition) / (1 - stopPosition);
            amplitude = 8 * Math.sin(adjustedX * Math.PI * currentArtificial.number) * Math.sin(animationPhase);
          }
        } else {
          amplitude = 0;
        }

        const y = STRING_Y + amplitude;
        path += ` L ${x} ${y}`;
      }
    } else {
      path += ` L ${STRING_LEFT_X + STRING_LENGTH} ${STRING_Y}`;
    }

    return path;
  };

  const artificialPositions = useMemo(() =>
    getArtificialHarmonicPositions(fingerInputMode, fingerPosition, fingerCents),
    [fingerInputMode, fingerPosition, fingerCents]
  );

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 mb-4 border border-border">
      <h2 className="text-xl font-semibold mb-4 text-foreground">String Visualization</h2>
      <div className="overflow-x-auto">
        <svg
          width={STRING_SVG_WIDTH}
          height={STRING_SVG_HEIGHT}
          viewBox={`0 0 ${STRING_SVG_WIDTH} ${STRING_SVG_HEIGHT}`}
          className="mx-auto min-w-[600px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {showFrets && fretPositions.map((pos, i) => {
            const noteAtFret = getNoteAtFret(i + 1, baseFreq);
            const isEven = i % 2 === 0;
            const yPos = isEven ? 140 : 18;
            return (
              <g key={i}>
                <line
                  x1={STRING_LEFT_X + pos * STRING_LENGTH}
                  y1={30}
                  x2={STRING_LEFT_X + pos * STRING_LENGTH}
                  y2={120}
                  stroke="hsl(var(--muted-foreground))"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                />
                {i < 24 && (
                  <text
                    x={STRING_LEFT_X + pos * STRING_LENGTH}
                    y={yPos}
                    fontSize="8"
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {noteAtFret.note.slice(0, -1)}
                  </text>
                )}
              </g>
            );
          })}

          <path d={drawString()} stroke="hsl(var(--primary))" strokeWidth="3" fill="none" className="drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />

          {fingerPosition === 0 && fingerCents === 0 && harmonicPositions.map((posObj, i) => (
            <g key={i}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={selectedPosition === posObj.position ? 'hsl(var(--destructive))' : 'hsl(var(--muted))'}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectPosition(posObj.position)}
                className="transition-colors hover:fill-destructive/80"
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={45}
                fontSize="10"
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                className="font-medium"
              >
                {posObj.numerator}/{posObj.denominator}
              </text>
            </g>
          ))}

          {fingerInputMode === 'fret' && fingerPosition > 0 && (
            <rect
              x={STRING_LEFT_X + fretPositions[fingerPosition - 1] * STRING_LENGTH - 3}
              y={STRING_Y - 15}
              width="6"
              height="30"
              fill="hsl(var(--secondary))"
              className="rx-1"
            />
          )}
          {fingerInputMode === 'cents' && fingerCents > 0 && (
            <rect
              x={STRING_LEFT_X + (1 - Math.pow(2, -fingerCents / 1200)) * STRING_LENGTH - 3}
              y={STRING_Y - 15}
              width="6"
              height="30"
              fill="hsl(var(--secondary))"
              className="rx-1"
            />
          )}

          {(fingerPosition > 0 || fingerCents > 0) && artificialPositions.map((posObj, i) => (
            <g key={`artificial-${i}`}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={artificialHarmonicIndex === i ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectArtificialHarmonic(i)}
                className="transition-colors hover:fill-primary/80"
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={i % 2 === 0 ? STRING_Y + 30 : STRING_Y - 15}
                fontSize="9"
                textAnchor="middle"
                fill={artificialHarmonicIndex === i ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))'}
                fontWeight="bold"
                className="pointer-events-none"
              >
                #{posObj.number}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
