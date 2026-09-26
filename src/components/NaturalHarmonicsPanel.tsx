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
import { SectionTitle } from './SectionTitle';

interface Props {
  openFreq: number;
  harmonicNumber: number;
  noteInfo: NoteInfo;
  touchPoints: TouchPoint[];
  selectedPosition: number | null;
  onSelectPosition: (position: number) => void;
  onHarmonicChange: (n: number) => void;
}

export function NaturalHarmonicsPanel({
  openFreq, harmonicNumber, noteInfo, touchPoints, selectedPosition, onSelectPosition, onHarmonicChange,
}: Props) {
  const difficulty = naturalDifficulty(harmonicNumber);
  const offset = selectedPosition === null ? null : nearestSemitone(selectedPosition);

  return (
    <section className="card" aria-labelledby="natural-title">
      <SectionTitle id="natural-title">Natural harmonics</SectionTitle>

      <div className="harmonic-nav">
        <button
          type="button"
          onClick={() => onHarmonicChange(harmonicNumber - 1)}
          disabled={harmonicNumber === 1}
          aria-label="Previous harmonic"
          className="btn btn-ghost btn-icon"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onHarmonicChange(1)}
          className="btn btn-ghost btn-icon"
          title="Reset"
          aria-label="Reset to harmonic #1"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onHarmonicChange(harmonicNumber + 1)}
          disabled={harmonicNumber === MAX_NATURAL_HARMONIC}
          aria-label="Next harmonic"
          className="btn btn-ghost btn-icon"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <span className="harmonic-count">{harmonicNumber} / {MAX_NATURAL_HARMONIC}</span>
      </div>

      <div className="info-panel">
        <div className="info-heading">
          <span className="harmonic-number">#{harmonicNumber}</span>
          <span className="harmonic-name">{HARMONIC_NAMES[harmonicNumber]}</span>
        </div>

        <div className="info-line">
          {noteInfo.note} · {noteInfo.freq.toFixed(2)} Hz
          {Math.abs(noteInfo.cents) > 0.01 && (
            <span className="muted">{noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)}¢</span>
          )}
        </div>

        <div className="difficulty">
          <DifficultyBadge level={difficulty} />
          <span>{DIFFICULTY_LABELS[difficulty]}</span>
        </div>

        {harmonicNumber === 1 ? (
          <p className="hint">Play the open string — no finger placement needed.</p>
        ) : (
          <>
            <p className="hint">Touch the string lightly at:</p>
            <div className="button-row">
              {touchPoints.map((point, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectPosition(point.position)}
                  aria-pressed={selectedPosition === point.position}
                  aria-label={`Touch at ${point.numerator}/${point.denominator} of the string`}
                  className={`btn btn-sm btn-ghost btn-mono ${selectedPosition === point.position ? 'active' : ''}`}
                >
                  {point.numerator}/{point.denominator}
                </button>
              ))}
            </div>

            {offset && (
              <div className="guide-box" aria-live="polite">
                <div>
                  <span className="label">Nearest:</span>{' '}
                  <span className="mono">{offset.nearestFret === 0 ? 'Open string' : `Fret ${offset.nearestFret}`}</span>{' '}
                  <span className="note">({frequencyToNote(frequencyAtSemitone(openFreq, offset.nearestFret)).note})</span>
                </div>
                <div>
                  <span className="label">Adjustment:</span>{' '}
                  <span className="mono">
                    {Math.abs(offset.cents) < 0.01
                      ? 'Exact'
                      : `${Math.abs(offset.cents).toFixed(2)}¢ ${offset.cents > 0 ? 'higher' : 'lower'}`}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {harmonicNumber === MAX_NATURAL_HARMONIC && (
        <div className="easter-egg">leave the rest to roman kim...</div>
      )}
    </section>
  );
}
