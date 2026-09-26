import type { PlayMode } from '../types';

interface Props {
  playMode: PlayMode;
  onToggle: () => void;
}

/** Play/stop, with a small string glyph that vibrates while sound is on. */
export function PlayButton({ playMode, onToggle }: Props) {
  const playing = playMode !== 'off';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? 'Stop playing' : 'Play the current pitch'}
      className={`btn btn-play ${playing ? 'playing' : ''}`}
    >
      <svg className="play-glyph" viewBox="0 0 22 14" aria-hidden="true">
        {playing ? (
          <>
            <path className="wave-b" d="M1 7 Q 6 13 11 7 T 21 7" />
            <path className="wave-a" d="M1 7 Q 6 1 11 7 T 21 7" />
          </>
        ) : (
          <path d="M6 1.5 L17 7 L6 12.5 Z" style={{ fill: 'currentColor', stroke: 'none' }} />
        )}
      </svg>
      {playing ? (playMode === 'natural' ? 'Natural' : 'Artificial') : 'Play'}
    </button>
  );
}
