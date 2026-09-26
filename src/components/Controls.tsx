import { Play, Pause } from 'lucide-react';
import type { PlayMode } from '../types';

interface Props {
  playMode: PlayMode;
  onTogglePlay: () => void;
  showVisualize: boolean;
  onToggleVisualize: () => void;
  showFrets: boolean;
  onToggleFrets: () => void;
}

export function Controls({ playMode, onTogglePlay, showVisualize, onToggleVisualize, showFrets, onToggleFrets }: Props) {
  return (
    <section className="card-glass" style={{ padding: '1rem 1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onTogglePlay}
          className={`btn ${playMode !== 'off' ? 'btn-playing' : 'btn-primary'}`}
        >
          {playMode !== 'off' ? <Pause size={16} /> : <Play size={16} />}
          {playMode === 'off' ? 'Play' : playMode === 'natural' ? 'Natural' : 'Artificial'}
        </button>

        <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.06)' }} />

        <button
          onClick={onToggleVisualize}
          className={`toggle-pill ${showVisualize ? 'on' : ''}`}
        >
          <span className="dot" />
          Visualize
        </button>

        <button
          onClick={onToggleFrets}
          className={`toggle-pill ${showFrets ? 'on' : ''}`}
        >
          <span className="dot" />
          Frets
        </button>
      </div>
    </section>
  );
}
