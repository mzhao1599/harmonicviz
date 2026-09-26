import { Play, Pause } from 'lucide-react';
import type { PlayMode } from '../types';
import { CopyLinkButton } from './CopyLinkButton';

interface Props {
  playMode: PlayMode;
  onTogglePlay: () => void;
  showVisualize: boolean;
  onToggleVisualize: () => void;
  showFrets: boolean;
  onToggleFrets: () => void;
  /** Null when the instrument has no stiff-string option. */
  stiff: { on: boolean; B: string; onToggle: () => void } | null;
}

export function Controls({ playMode, onTogglePlay, showVisualize, onToggleVisualize, showFrets, onToggleFrets, stiff }: Props) {
  return (
    <section className="card-glass" style={{ padding: '1rem 1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onTogglePlay}
          aria-label={playMode === 'off' ? 'Play the current pitch' : 'Stop playing'}
          className={`btn ${playMode !== 'off' ? 'btn-playing' : 'btn-primary'}`}
        >
          {playMode !== 'off' ? <Pause size={16} /> : <Play size={16} />}
          {playMode === 'off' ? 'Play' : playMode === 'natural' ? 'Natural' : 'Artificial'}
        </button>

        <div aria-hidden="true" style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.06)' }} />

        <button
          onClick={onToggleVisualize}
          aria-pressed={showVisualize}
          className={`toggle-pill ${showVisualize ? 'on' : ''}`}
        >
          <span className="dot" aria-hidden="true" />
          Visualize
        </button>

        <button
          onClick={onToggleFrets}
          aria-pressed={showFrets}
          className={`toggle-pill ${showFrets ? 'on' : ''}`}
        >
          <span className="dot" aria-hidden="true" />
          Frets
        </button>

        {stiff && (
          <button
            onClick={stiff.onToggle}
            aria-pressed={stiff.on}
            className={`toggle-pill ${stiff.on ? 'on' : ''}`}
            title="Model the string's bending stiffness: f_k = k·f0·√(1 + B·k²)"
          >
            <span className="dot" aria-hidden="true" />
            Stiff string <span className="pill-note">B = {stiff.B}</span>
          </button>
        )}

        <CopyLinkButton />
      </div>
    </section>
  );
}
