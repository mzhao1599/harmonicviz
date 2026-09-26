import {
  DIFFICULTY_LABELS,
  artificialDifficulty,
  type ArtificialHarmonic,
} from '../lib/music';
import type { FingerInputMode } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

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

const mono = "'JetBrains Mono', monospace";

export function ArtificialHarmonicsPanel({
  inputMode, onInputModeChange, fret, cents, onStopChange, harmonics, selectedIndex, onSelect,
}: Props) {
  const isStopped = fret > 0 || cents > 0;

  return (
    <section className="card-glass" style={{ padding: '1.5rem' }}>
      <div className="section-label">Artificial Harmonics</div>

      {/* Input mode toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b6460', marginBottom: '0.5rem' }}>Stop Position</div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            onClick={() => onInputModeChange('fret')}
            className={`btn btn-sm btn-ghost ${inputMode === 'fret' ? 'active' : ''}`}
          >
            Fret Number
          </button>
          <button
            onClick={() => onInputModeChange('cents')}
            className={`btn btn-sm btn-ghost ${inputMode === 'cents' ? 'active' : ''}`}
          >
            Cents Above Base
          </button>
        </div>
      </div>

      {/* Slider */}
      {inputMode === 'fret' ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>Fret: 0–12</span>
            <span style={{ fontFamily: mono, fontSize: '0.875rem', fontWeight: 600, color: fret === 0 ? '#c9a84c' : '#e0d8c8' }}>
              {fret}{' '}
              <span style={{ fontSize: '0.75rem', color: '#6b6460', fontWeight: 400 }}>
                ({fret * 100}¢{fret === 0 ? ' · Natural' : ''})
              </span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={fret}
            onChange={e => onStopChange(parseInt(e.target.value, 10))}
          />
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>Cents: 0–1200</span>
            <span style={{ fontFamily: mono, fontSize: '0.875rem', fontWeight: 600, color: cents === 0 ? '#c9a84c' : '#e0d8c8' }}>
              {cents}¢{' '}
              <span style={{ fontSize: '0.75rem', color: '#6b6460', fontWeight: 400 }}>
                ({(cents / 100).toFixed(2)} frets{cents === 0 ? ' · Natural' : ''})
              </span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1200"
            step="1"
            value={cents}
            onChange={e => onStopChange(parseInt(e.target.value, 10))}
          />
        </div>
      )}

      {/* Artificial harmonic list */}
      {isStopped && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {harmonics.map((ah, i) => {
            const difficulty = artificialDifficulty(ah.number);
            return (
              <div
                key={i}
                onClick={() => onSelect(i)}
                className={`harmonic-card ${selectedIndex === i ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.8125rem', fontWeight: 600, color: selectedIndex === i ? '#c9a84c' : '#9a9088' }}>
                      #{ah.number}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: '#e0d8c8' }}>{ah.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DifficultyBadge level={difficulty} />
                    <span style={{ fontSize: '0.6875rem', color: '#5a534e' }}>{DIFFICULTY_LABELS[difficulty]}</span>
                  </div>
                </div>

                <div style={{ fontFamily: mono, fontSize: '0.75rem', color: '#6b6460', marginTop: '0.25rem' }}>
                  {ah.resultNote.note} · {ah.resultNote.freq.toFixed(2)} Hz
                  {Math.abs(ah.resultNote.cents) > 0.01 && (
                    <span style={{ marginLeft: '0.375rem' }}>
                      {ah.resultNote.cents > 0 ? '+' : ''}{ah.resultNote.cents.toFixed(2)}¢
                    </span>
                  )}
                </div>

                {selectedIndex === i && ah.number !== 1 && (
                  <div className="guide-box" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#6b6460' }}>Touch at:</span>{' '}
                    <span style={{ fontFamily: mono, color: '#e0d8c8' }}>
                      {ah.touchFret === 0 ? 'Open string' : `Fret ${ah.touchFret}`}
                    </span>
                    {' '}
                    <span style={{ color: '#9a9088' }}>({ah.touchNote.note})</span>
                    {Math.abs(ah.touchCents) > 0.01 && (
                      <span style={{ fontFamily: mono, color: '#6b6460', marginLeft: '0.25rem' }}>
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
