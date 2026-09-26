import { INSTRUMENT_IDS, INSTRUMENT_STRINGS, type InstrumentId } from '../lib/music';

interface Props {
  instrument: InstrumentId;
  selectedString: string;
  onInstrumentChange: (instrument: InstrumentId) => void;
  onStringChange: (stringName: string) => void;
}

export function InstrumentPicker({ instrument, selectedString, onInstrumentChange, onStringChange }: Props) {
  return (
    <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        <div>
          <div className="section-label" id="instrument-label">Instrument</div>
          <div role="group" aria-labelledby="instrument-label" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {INSTRUMENT_IDS.map(inst => (
              <button
                key={inst}
                onClick={() => onInstrumentChange(inst)}
                aria-pressed={instrument === inst}
                className={`btn btn-ghost ${instrument === inst ? 'active' : ''}`}
              >
                {inst.charAt(0).toUpperCase() + inst.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label" id="string-label">String</div>
          <div role="group" aria-labelledby="string-label" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {INSTRUMENT_STRINGS[instrument].map(str => (
              <button
                key={str}
                onClick={() => onStringChange(str)}
                aria-pressed={selectedString === str}
                className={`btn btn-ghost font-mono ${selectedString === str ? 'active' : ''}`}
                style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: '3rem' }}
              >
                {str}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
