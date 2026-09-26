// The shareable part of the app state, read from and written to the query string:
//   ?instrument=violin&string=G3&harmonic=4&touch=3        natural harmonic #4, touched at 3/4
//   ?instrument=violin&string=G3&fret=2&artificial=4        stopped at semitone 2, artificial #4
//   ?instrument=cello&string=C2&cents=250&artificial=3      stopped 250 cents up, artificial #3
// Anything missing or invalid falls back to the default.

import {
  INSTRUMENT_STRINGS,
  MAX_ARTIFICIAL_HARMONIC,
  MAX_NATURAL_HARMONIC,
  gcd,
  isInstrumentId,
  type InstrumentId,
} from './music';
import type { FingerInputMode } from '../types';

export interface ShareState {
  instrument: InstrumentId;
  string: string;
  /** Natural harmonic number, 1..16. */
  harmonic: number;
  /** Numerator i of the selected touch point i/harmonic, or null for none. */
  touch: number | null;
  stopMode: FingerInputMode;
  /** Stop position: semitones 0..12 in fret mode, cents 0..1200 in cents mode. */
  stop: number;
  /** Artificial harmonic number, 1..8. */
  artificial: number;
}

export const DEFAULT_STATE: ShareState = {
  instrument: 'violin',
  string: 'G3',
  harmonic: 1,
  touch: null,
  stopMode: 'fret',
  stop: 0,
  artificial: 1,
};

/** Parse a whole number in [min, max], or return undefined. */
function intIn(value: string | null, min: number, max: number): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const n = parseInt(value, 10);
  return n >= min && n <= max ? n : undefined;
}

export function decodeState(search: string): ShareState {
  const params = new URLSearchParams(search);
  const state = { ...DEFAULT_STATE };

  const instrument = params.get('instrument');
  if (instrument && isInstrumentId(instrument)) {
    state.instrument = instrument;
    state.string = INSTRUMENT_STRINGS[instrument][0];
  }
  const string = params.get('string');
  if (string && INSTRUMENT_STRINGS[state.instrument].includes(string)) state.string = string;

  const cents = intIn(params.get('cents'), 0, 1200);
  const fret = intIn(params.get('fret'), 0, 12);
  if (cents !== undefined && cents > 0) {
    state.stopMode = 'cents';
    state.stop = cents;
  } else if (fret !== undefined) {
    state.stop = fret;
  }

  if (state.stop > 0) {
    // A stopped string shows artificial harmonics; the natural ones reset to #1.
    state.artificial = intIn(params.get('artificial'), 1, MAX_ARTIFICIAL_HARMONIC) ?? 1;
    return state;
  }

  state.harmonic = intIn(params.get('harmonic'), 1, MAX_NATURAL_HARMONIC) ?? 1;
  const touch = intIn(params.get('touch'), 1, state.harmonic - 1);
  if (touch !== undefined && gcd(touch, state.harmonic) === 1) state.touch = touch;
  return state;
}

export function encodeState(state: ShareState): string {
  const params = new URLSearchParams({ instrument: state.instrument, string: state.string });
  if (state.stop > 0) {
    params.set(state.stopMode === 'fret' ? 'fret' : 'cents', String(state.stop));
    params.set('artificial', String(state.artificial));
  } else {
    params.set('harmonic', String(state.harmonic));
    if (state.touch !== null) params.set('touch', String(state.touch));
  }
  return params.toString();
}
