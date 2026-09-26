import type { NoteInfo } from '../lib/music';

interface Props {
  noteInfo: NoteInfo;
  /** How far the stiff string sounds above the ideal one, or null for an ideal string. */
  stiffCents: number | null;
}

export function PitchDisplay({ noteInfo, stiffCents }: Props) {
  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
      <div className="section-label">Current Pitch</div>
      <div aria-live="polite" aria-atomic="true">
        <div className="pitch-note">{noteInfo.note}</div>
        <div className="pitch-freq" style={{ marginTop: '0.5rem' }}>{noteInfo.freq.toFixed(4)} Hz</div>
        {Math.abs(noteInfo.cents) > 0.01 && (
          <div className="pitch-cents" style={{ marginTop: '0.25rem' }}>
            {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(4)} cents
          </div>
        )}
        {stiffCents !== null && (
          <div className="pitch-cents" style={{ marginTop: '0.25rem' }}>
            stiff string: {stiffCents >= 0 ? '+' : ''}{stiffCents.toFixed(2)} cents vs an ideal string
          </div>
        )}
      </div>
    </section>
  );
}
