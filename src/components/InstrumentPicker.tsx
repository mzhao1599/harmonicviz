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
          <div className="section-label">Instrument</div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {INSTRUMENT_IDS.map(inst => (
              <button
                key={inst}
                onClick={() => onInstrumentChange(inst)}
                className={`btn btn-ghost ${instrument === inst ? 'active' : ''}`}
              >
                {inst.charAt(0).toUpperCase() + inst.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label">String</div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {INSTRUMENT_STRINGS[instrument].map(str => (
              <button
                key={str}
                onClick={() => onStringChange(str)}
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
