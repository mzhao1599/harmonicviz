import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  DIFFICULTY_LABELS,
  HARMONIC_NAMES,
  MAX_NATURAL_HARMONIC,
  frequencyAtSemitone,
  frequencyToNote,
  naturalDifficulty,
  nearestSemitone,
  type NoteInfo,
  type TouchPoint,
} from '../lib/music';
import { DifficultyBadge } from './DifficultyBadge';

interface Props {
  openFreq: number;
  harmonicNumber: number;
  noteInfo: NoteInfo;
  touchPoints: TouchPoint[];
  selectedPosition: number | null;
  onSelectPosition: (position: number) => void;
  onHarmonicChange: (n: number) => void;
}

const mono = "'JetBrains Mono', monospace";

export function NaturalHarmonicsPanel({
  openFreq, harmonicNumber, noteInfo, touchPoints, selectedPosition, onSelectPosition, onHarmonicChange,
}: Props) {
  const difficulty = naturalDifficulty(harmonicNumber);

  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div className="section-label">Natural Harmonics</div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button
          onClick={() => harmonicNumber > 1 && onHarmonicChange(harmonicNumber - 1)}
          className={`btn btn-ghost btn-icon ${harmonicNumber === 1 ? 'btn-disabled' : ''}`}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => onHarmonicChange(1)}
          className="btn btn-ghost btn-icon"
          title="Reset"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => harmonicNumber < MAX_NATURAL_HARMONIC && onHarmonicChange(harmonicNumber + 1)}
          className={`btn btn-ghost btn-icon ${harmonicNumber === MAX_NATURAL_HARMONIC ? 'btn-disabled' : ''}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {harmonicNumber === MAX_NATURAL_HARMONIC && (
        <div className="easter-egg">leave the rest to roman kim...</div>
      )}

      {/* Info panel */}
      <div style={{
        padding: '1.25rem',
        borderRadius: '10px',
        background: 'rgba(201, 168, 76, 0.04)',
        border: '1px solid rgba(201, 168, 76, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: mono, fontSize: '1.25rem', fontWeight: 600, color: '#c9a84c' }}>
            #{harmonicNumber}
          </span>
          <span style={{ fontSize: '0.9375rem', color: '#e0d8c8' }}>
            {HARMONIC_NAMES[harmonicNumber]}
          </span>
        </div>

        <div style={{ fontFamily: mono, fontSize: '0.8125rem', color: '#9a9088', marginBottom: '0.75rem' }}>
          {noteInfo.note} · {noteInfo.freq.toFixed(2)} Hz
          {Math.abs(noteInfo.cents) > 0.01 && (
            <span style={{ marginLeft: '0.5rem', color: '#6b6460' }}>
              {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)}¢
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <DifficultyBadge level={difficulty} />
          <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>{DIFFICULTY_LABELS[difficulty]}</span>
        </div>

        {harmonicNumber === 1 ? (
          <div style={{ fontSize: '0.8125rem', color: '#9a9088' }}>
            Play the open string — no finger placement needed.
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.8125rem', color: '#9a9088', marginBottom: '0.5rem' }}>
              Touch the string lightly at:
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {touchPoints.map((point, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPosition(point.position)}
                  className={`btn btn-sm font-mono ${selectedPosition === point.position ? 'btn-ghost active' : 'btn-ghost'}`}
                  style={{ fontFamily: mono }}
                >
                  {point.numerator}/{point.denominator}
                </button>
              ))}
            </div>

            {selectedPosition !== null && (() => {
              const offset = nearestSemitone(selectedPosition);
              const fretNote = frequencyToNote(frequencyAtSemitone(openFreq, offset.nearestFret));
              return (
                <div className="guide-box" style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#e0d8c8', marginBottom: '0.375rem' }}>
                    <span style={{ color: '#6b6460' }}>Nearest:</span>{' '}
                    <span style={{ fontFamily: mono }}>
                      {offset.nearestFret === 0 ? 'Open string' : `Fret ${offset.nearestFret}`}
                    </span>
                    {' '}
                    <span style={{ color: '#9a9088' }}>({fretNote.note})</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#e0d8c8' }}>
                    <span style={{ color: '#6b6460' }}>Adjustment:</span>{' '}
                    <span style={{ fontFamily: mono }}>
                      {Math.abs(offset.cents) < 0.01
                        ? 'Exact'
                        : `${Math.abs(offset.cents).toFixed(2)}¢ ${offset.cents > 0 ? 'higher' : 'lower'}`}
                    </span>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </section>
  );
}
