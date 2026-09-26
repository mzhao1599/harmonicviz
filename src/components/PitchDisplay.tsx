import type { NoteInfo } from '../lib/music';
import type { PlayMode } from '../types';
import { PlayButton } from './PlayButton';

interface Props {
  noteInfo: NoteInfo;
  /** How far the stiff string sounds above the ideal one, or null for an ideal string. */
  stiffCents: number | null;
  /** One line saying what is sounding, e.g. "Harmonic #4 of the G3 string". */
  context: string;
  playMode: PlayMode;
  onTogglePlay: () => void;
}

export function PitchDisplay({ noteInfo, stiffCents, context, playMode, onTogglePlay }: Props) {
  return (
    <section className="card pitch" aria-label="Current pitch">
      <PlayButton playMode={playMode} onToggle={onTogglePlay} />
      <div className="pitch-readout" aria-live="polite" aria-atomic="true">
        {/* Re-keyed on each new note so it replays the settle animation. */}
        <span key={noteInfo.note} className="pitch-note settle">{noteInfo.note}</span>
        <div className="pitch-detail">
          <span className="pitch-context">{context}</span>
          <span className="pitch-freq">{noteInfo.freq.toFixed(4)} Hz</span>
          {Math.abs(noteInfo.cents) > 0.01 && (
            <span className="pitch-cents">
              {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(4)} cents from equal temperament
            </span>
          )}
          {stiffCents !== null && (
            <span className="pitch-cents">
              stiff string: {stiffCents >= 0 ? '+' : ''}{stiffCents.toFixed(2)} cents vs an ideal string
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
