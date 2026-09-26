import { INSTRUMENT_IDS, INSTRUMENT_STRINGS, type InstrumentId } from '../lib/music';

interface Props {
  instrument: InstrumentId;
  selectedString: string;
  onInstrumentChange: (instrument: InstrumentId) => void;
  onStringChange: (stringName: string) => void;
}

const LABELS: Record<InstrumentId, string> = { violin: 'Violin', viola: 'Viola', cello: 'Cello', bass: 'Bass' };

export function InstrumentPicker({ instrument, selectedString, onInstrumentChange, onStringChange }: Props) {
  return (
    <>
      <div>
        <span className="field-label" id="instrument-label">Instrument</span>
        <div className="button-row" role="group" aria-labelledby="instrument-label">
          {INSTRUMENT_IDS.map(inst => (
            <button
              key={inst}
              type="button"
              onClick={() => onInstrumentChange(inst)}
              aria-pressed={instrument === inst}
              className={`btn btn-ghost ${instrument === inst ? 'active' : ''}`}
            >
              {LABELS[inst]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label" id="string-label">String</span>
        <div className="button-row" role="group" aria-labelledby="string-label">
          {INSTRUMENT_STRINGS[instrument].map(str => (
            <button
              key={str}
              type="button"
              onClick={() => onStringChange(str)}
              aria-pressed={selectedString === str}
              className={`btn btn-ghost btn-mono ${selectedString === str ? 'active' : ''}`}
            >
              {str}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
