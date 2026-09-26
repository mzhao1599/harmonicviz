import type { NoteInfo } from '../lib/music';

export function PitchDisplay({ noteInfo }: { noteInfo: NoteInfo }) {
  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
      <div className="section-label">Current Pitch</div>
      <div className="pitch-note">{noteInfo.note}</div>
      <div className="pitch-freq" style={{ marginTop: '0.5rem' }}>{noteInfo.freq.toFixed(4)} Hz</div>
      {Math.abs(noteInfo.cents) > 0.01 && (
        <div className="pitch-cents" style={{ marginTop: '0.25rem' }}>
          {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(4)} cents
        </div>
      )}
    </section>
  );
}
