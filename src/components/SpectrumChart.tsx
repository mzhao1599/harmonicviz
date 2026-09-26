import { useState } from 'react';
import { levelDb, type Mode } from '../lib/timbre';
import type { ListenMode } from '../types';

interface Props {
  modes: Mode[];
  /** False when nothing touches the string (harmonic #1): every mode sounds either way. */
  touched: boolean;
  /** "1/4 of the string", "the node for #4", ... */
  touchLabel: string;
  /** What the untouched comparison is: the open string, or the stopped string. */
  untouchedLabel: string;
  listen: ListenMode;
  onListenChange: (listen: ListenMode) => void;
  /** Inharmonicity note for a stiff string, or null for an ideal string. */
  stiffNote: string | null;
}

const WIDTH = 880;
const HEIGHT = 190;
const PAD = { left: 40, right: 8, top: 20, bottom: 30 };
const FLOOR_DB = -36;
const TICKS_DB = [0, -12, -24, -36];

const plotW = WIDTH - PAD.left - PAD.right;
const plotH = HEIGHT - PAD.top - PAD.bottom;
const yOf = (db: number) => PAD.top + (Math.max(db, FLOOR_DB) / FLOOR_DB) * plotH;

/** Bar with a 4px rounded top and a square base. */
function barPath(x: number, w: number, top: number, base: number) {
  const r = Math.min(4, w / 2, base - top);
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

const hz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(2)} kHz` : `${f.toFixed(1)} Hz`);

export function SpectrumChart({ modes, touched, touchLabel, untouchedLabel, listen, onListenChange, stiffNote }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const slot = plotW / Math.max(modes.length, 1);
  const barW = Math.min(24, slot - 2);
  const base = PAD.top + plotH;
  const surviving = modes.filter(m => m.survives);
  const hovered = hover === null ? null : modes.find(m => m.k === hover) ?? null;

  return (
    <section className="card-glass spectrum" aria-labelledby="spectrum-title">
      <div className="spectrum-head">
        <div>
          <div className="section-label" id="spectrum-title">Timbre · partials of the string</div>
          <p className="spectrum-caption">
            {touched
              ? <>Touching at {touchLabel} keeps only the modes with a node there, sin(kπx) = 0: {surviving.length} of {modes.length} partials.</>
              : <>Nothing touches the string, so all {modes.length} modes sound.</>}
            {' '}Bowed-string (Helmholtz) spectrum: mode k has amplitude 1/k at the bridge.
            {stiffNote && <> {stiffNote}</>}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Which sound to play">
          <button
            type="button"
            className={`btn btn-sm btn-ghost ${listen === 'touched' ? 'active' : ''}`}
            aria-pressed={listen === 'touched'}
            disabled={!touched}
            onClick={() => onListenChange('touched')}
          >
            Touched
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-ghost ${listen === 'open' ? 'active' : ''}`}
            aria-pressed={listen === 'open'}
            disabled={!touched}
            onClick={() => onListenChange('open')}
          >
            {untouchedLabel}
          </button>
        </div>
      </div>

      <div className="spectrum-legend" aria-hidden="true">
        <span><i className="swatch swatch-kept" /> Sounds when touched</span>
        {touched && <span><i className="swatch swatch-removed" /> Removed by the touch ({untouchedLabel.toLowerCase()} only)</span>}
      </div>

      <div className="spectrum-plot">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="spectrum-svg"
          role="img"
          aria-label={`Bar chart of ${modes.length} string modes; ${surviving.length} survive the touch: modes ${surviving.map(m => m.k).join(', ')}.`}
          onMouseLeave={() => setHover(null)}
        >
          {TICKS_DB.map(db => (
            <g key={db}>
              <line className="spectrum-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={yOf(db)} y2={yOf(db)} />
              <text className="spectrum-tick" x={PAD.left - 6} y={yOf(db) + 3} textAnchor="end">{db}</text>
            </g>
          ))}
          <text className="spectrum-tick" x={PAD.left} y={PAD.top - 10}>level, dB re mode 1</text>

          {modes.map((m, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const top = yOf(levelDb(m));
            const label = m.k === 1 || m.k % 4 === 0 || modes.length <= 16;
            return (
              <g key={m.k} onMouseEnter={() => setHover(m.k)} onClick={() => setHover(m.k)}>
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH + PAD.bottom} fill="transparent" />
                <path
                  className={`spectrum-bar ${m.survives ? 'kept' : 'removed'} ${hover === m.k ? 'hovered' : ''}`}
                  d={barPath(x, barW, top, base)}
                />
                {label && (
                  <text className="spectrum-tick" x={x + barW / 2} y={base + 14} textAnchor="middle">{m.k}</text>
                )}
              </g>
            );
          })}
          <text className="spectrum-tick" x={WIDTH - PAD.right} y={HEIGHT - 1} textAnchor="end">mode k</text>
        </svg>

        {hovered && (
          <div
            className="spectrum-tooltip"
            style={{
              left: `${((PAD.left + (modes.indexOf(hovered) + 0.5) * slot) / WIDTH) * 100}%`,
              top: `${(yOf(levelDb(hovered)) / HEIGHT) * 100}%`,
            }}
            role="status"
          >
            <strong>Mode {hovered.k}</strong> · {hz(hovered.freq)} · {levelDb(hovered).toFixed(1)} dB
            <br />
            {hovered.survives ? 'node at the touch point: sounds' : 'no node at the touch point: damped'}
          </div>
        )}
      </div>

      <button type="button" className="link-button" aria-expanded={showTable} onClick={() => setShowTable(v => !v)}>
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      {showTable && (
        <div className="spectrum-table-wrap">
          <table className="spectrum-table">
            <thead>
              <tr><th scope="col">Mode k</th><th scope="col">Frequency</th><th scope="col">Level</th><th scope="col">When touched</th></tr>
            </thead>
            <tbody>
              {modes.map(m => (
                <tr key={m.k}>
                  <td>{m.k}</td>
                  <td>{hz(m.freq)}</td>
                  <td>{levelDb(m).toFixed(1)} dB</td>
                  <td>{m.survives ? 'sounds' : 'removed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
