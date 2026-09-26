import {
  DIFFICULTY_LABELS,
  artificialDifficulty,
  type ArtificialHarmonic,
} from '../lib/music';
import type { FingerInputMode } from '../types';
import { DifficultyBadge } from './DifficultyBadge';
import { SectionTitle } from './SectionTitle';

interface Props {
  inputMode: FingerInputMode;
  onInputModeChange: (mode: FingerInputMode) => void;
  /** Stop position in semitones (fret mode). */
  fret: number;
  /** Stop position in cents (cents mode). */
  cents: number;
  onStopChange: (value: number) => void;
  harmonics: ArtificialHarmonic[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ArtificialHarmonicsPanel({
  inputMode, onInputModeChange, fret, cents, onStopChange, harmonics, selectedIndex, onSelect,
}: Props) {
  const isStopped = fret > 0 || cents > 0;

  return (
    <section className="card" aria-labelledby="artificial-title">
      <SectionTitle id="artificial-title">Artificial harmonics</SectionTitle>

      <span className="field-label" id="stop-units-label">Stop position</span>
      <div className="button-row" role="group" aria-labelledby="stop-units-label">
        <button
          type="button"
          onClick={() => onInputModeChange('fret')}
          aria-pressed={inputMode === 'fret'}
          className={`btn btn-sm btn-ghost ${inputMode === 'fret' ? 'active' : ''}`}
        >
          Fret Number
        </button>
        <button
          type="button"
          onClick={() => onInputModeChange('cents')}
          aria-pressed={inputMode === 'cents'}
          className={`btn btn-sm btn-ghost ${inputMode === 'cents' ? 'active' : ''}`}
        >
          Cents Above Base
        </button>
      </div>

      {inputMode === 'fret' ? (
        <>
          <div className="stop-readout">
            <span>Fret: 0–12</span>
            <strong className={fret === 0 ? 'natural' : ''}>
              {fret} <small>({fret * 100}¢{fret === 0 ? ' · Natural' : ''})</small>
            </strong>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={fret}
            aria-label="Stop position in semitones above the open string"
            aria-valuetext={fret === 0 ? '0, natural harmonics' : `${fret} semitones`}
            onChange={e => onStopChange(parseInt(e.target.value, 10))}
          />
        </>
      ) : (
        <>
          <div className="stop-readout">
            <span>Cents: 0–1200</span>
            <strong className={cents === 0 ? 'natural' : ''}>
              {cents}¢ <small>({(cents / 100).toFixed(2)} frets{cents === 0 ? ' · Natural' : ''})</small>
            </strong>
          </div>
          <input
            type="range"
            min="0"
            max="1200"
            step="1"
            value={cents}
            aria-label="Stop position in cents above the open string"
            aria-valuetext={cents === 0 ? '0, natural harmonics' : `${cents} cents`}
            onChange={e => onStopChange(parseInt(e.target.value, 10))}
          />
        </>
      )}

      {isStopped && (
        <div className="harmonic-list">
          {harmonics.map((ah, i) => {
            const difficulty = artificialDifficulty(ah.number);
            const selected = selectedIndex === i;
            return (
              <div key={i} className={`harmonic-card ${selected ? 'selected' : ''}`}>
                <button type="button" className="harmonic-card-button" onClick={() => onSelect(i)} aria-pressed={selected}>
                  <span className="card-row">
                    <span className="card-title">
                      <span className="mono">#{ah.number}</span>
                      <span>{ah.name}</span>
                    </span>
                    <span className="card-difficulty">
                      <DifficultyBadge level={difficulty} />
                      {DIFFICULTY_LABELS[difficulty]}
                    </span>
                  </span>
                  <span className="card-freq">
                    {ah.resultNote.note} · {ah.resultNote.freq.toFixed(2)} Hz
                    {Math.abs(ah.resultNote.cents) > 0.01 && (
                      <span>{ah.resultNote.cents > 0 ? '+' : ''}{ah.resultNote.cents.toFixed(2)}¢</span>
                    )}
                  </span>
                </button>

                {selected && ah.number !== 1 && (
                  <div className="guide-box harmonic-card-guide">
                    <span className="label">Touch at:</span>{' '}
                    <span className="mono">{ah.touchFret === 0 ? 'Open string' : `Fret ${ah.touchFret}`}</span>{' '}
                    <span className="note">({ah.touchNote.note})</span>
                    {Math.abs(ah.touchCents) > 0.01 && (
                      <span className="mono muted">
                        {Math.abs(ah.touchCents).toFixed(2)}¢ {ah.touchCents > 0 ? 'higher' : 'lower'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isStopped && <div className="easter-egg">leave the rest to roman kim...</div>}
    </section>
  );
}
