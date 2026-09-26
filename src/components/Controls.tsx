import { CopyLinkButton } from './CopyLinkButton';

interface Props {
  showVisualize: boolean;
  onToggleVisualize: () => void;
  showFrets: boolean;
  onToggleFrets: () => void;
  /** Null when the instrument has no stiff-string option. */
  stiff: { on: boolean; B: string; onToggle: () => void } | null;
}

export function Controls({ showVisualize, onToggleVisualize, showFrets, onToggleFrets, stiff }: Props) {
  return (
    <div className="toolbar-toggles">
      <button type="button" onClick={onToggleVisualize} aria-pressed={showVisualize} className={`toggle-pill ${showVisualize ? 'on' : ''}`}>
        <span className="dot" aria-hidden="true" />
        Visualize
      </button>

      <button type="button" onClick={onToggleFrets} aria-pressed={showFrets} className={`toggle-pill ${showFrets ? 'on' : ''}`}>
        <span className="dot" aria-hidden="true" />
        Frets
      </button>

      {stiff && (
        <button
          type="button"
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
  );
}
