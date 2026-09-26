// Pure music math for an ideal string. Positions are fractions of the string
// length measured from the nut (0 = nut, 1 = bridge). No React, no DOM.

export const A4_FREQUENCY = 440;

const SEMITONES_FROM_A: Record<string, number> = {
  C: -9, 'C#': -8, DB: -8,
  D: -7, 'D#': -6, EB: -6,
  E: -5,
  F: -4, 'F#': -3, GB: -3,
  G: -2, 'G#': -1, AB: -1,
  A: 0, 'A#': 1, BB: 1,
  B: 2,
};

/** Equal-tempered frequency of a note name such as "G3" or "Bb4", from A4 = 440 Hz. */
export function noteToFrequency(note: string): number | null {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const semitones = SEMITONES_FROM_A[match[1].toUpperCase()];
  const octave = parseInt(match[2], 10);
  return A4_FREQUENCY * Math.pow(2, ((octave - 4) * 12 + semitones) / 12);
}

export type InstrumentId = 'violin' | 'viola' | 'cello' | 'bass';

export const INSTRUMENT_STRINGS: Record<InstrumentId, readonly string[]> = {
  violin: ['G3', 'D4', 'A4', 'E5'],
  viola: ['C3', 'G3', 'D4', 'A4'],
  cello: ['C2', 'G2', 'D3', 'A3'],
  bass: ['E1', 'A1', 'D2', 'G2'],
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENT_STRINGS) as InstrumentId[];

export function isInstrumentId(value: string): value is InstrumentId {
  return (INSTRUMENT_IDS as string[]).includes(value);
}

/** Open-string frequency; falls back to G3 for an unknown string. */
export function openStringFrequency(instrument: InstrumentId, stringName: string): number {
  if (!INSTRUMENT_STRINGS[instrument].includes(stringName)) return 196;
  return noteToFrequency(stringName) ?? 196;
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

const ENHARMONICS: Record<string, string> = {
  'C♯': 'C♯/D♭',
  'D♯': 'D♯/E♭',
  'F♯': 'F♯/G♭',
  'G♯': 'G♯/A♭',
  'A♯': 'A♯/B♭',
};

export interface NoteInfo {
  /** Display name with octave, e.g. "A5" or "C♯/D♭4". */
  note: string;
  /** Offset from the nearest equal-tempered note, in cents. */
  cents: number;
  freq: number;
}

/** Nearest equal-tempered note to a frequency, and how far off it is in cents. */
export function frequencyToNote(freq: number): NoteInfo {
  const c0 = A4_FREQUENCY * Math.pow(2, -4.75);
  const exactHalfSteps = 12 * Math.log2(freq / c0);
  const halfSteps = Math.round(exactHalfSteps);
  const octave = Math.floor(halfSteps / 12);
  const name = NOTE_NAMES[((halfSteps % 12) + 12) % 12];
  return {
    note: (ENHARMONICS[name] ?? name) + octave,
    cents: (exactHalfSteps - halfSteps) * 100,
    freq,
  };
}

/** Frequency of the note stopped at semitone position `k` above an open string. */
export function frequencyAtSemitone(openFreq: number, k: number): number {
  return openFreq * Math.pow(2, k / 12);
}

export const MAX_NATURAL_HARMONIC = 16;

export const HARMONIC_NAMES: Record<number, string> = {
  1: 'Base Note (Open String)',
  2: 'Octave',
  3: 'Octave + Fifth',
  4: '2 Octaves',
  5: '2 Octaves + Major Third',
  6: '2 Octaves + Fifth',
  7: '2 Octaves + Minor Seventh',
  8: '3 Octaves',
  9: '3 Octaves + Major Second',
  10: '3 Octaves + Major Third',
  11: '3 Octaves + Augmented Fourth',
  12: '3 Octaves + Fifth',
  13: '3 Octaves + Minor Sixth',
  14: '3 Octaves + Minor Seventh',
  15: '3 Octaves + Major Seventh',
  16: '4 Octaves',
};

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface TouchPoint {
  position: number;
  numerator: number;
  denominator: number;
}

/**
 * Touch points that sound natural harmonic `n`: every i/n with gcd(i, n) = 1.
 * (2/4 is left out because touching there gives the 2nd harmonic, not the 4th.)
 */
export function naturalTouchPoints(n: number): TouchPoint[] {
  const points: TouchPoint[] = [];
  for (let i = 1; i < n; i++) {
    if (gcd(i, n) === 1) points.push({ position: i / n, numerator: i, denominator: n });
  }
  return points;
}

/** Position of semitone `k` (a "fret"): x = 1 − 2^(−k/12). */
export function semitonePosition(k: number): number {
  return 1 - Math.pow(2, -k / 12);
}

/** Position that raises the open string by `cents`: x = 1 − 2^(−c/1200). */
export function centsToPosition(cents: number): number {
  return cents > 0 ? 1 - Math.pow(2, -cents / 1200) : 0;
}

export interface SemitoneOffset {
  /** Nearest semitone position (0 = open string). */
  nearestFret: number;
  /** 1200·log2((1 − x_k)/(1 − x)): positive when the point is closer to the bridge than the fret. */
  cents: number;
}

/** Nearest semitone position to a point on the string and the offset from it in cents. */
export function nearestSemitone(position: number): SemitoneOffset {
  // x is s semitones above the nut, where x = 1 − 2^(−s/12). Offsets from
  // fret k are then 100·(s − k) cents. Exact halves round down, to the lower fret.
  const s = 12 * Math.log2(1 / (1 - position));
  const nearestFret = Math.max(0, Math.ceil(s - 0.5));
  const cents = 1200 * Math.log2((1 - semitonePosition(nearestFret)) / (1 - position));
  return { nearestFret, cents };
}

export const ARTIFICIAL_HARMONIC_NAMES: Record<number, string> = {
  1: 'Base Note (Stopped String)',
  2: 'Octave',
  3: 'Octave + Fifth',
  4: '2 Octaves',
  5: '2 Octaves + Major Third',
  6: '2 Octaves + Fifth',
  7: '2 Octaves + Minor Seventh',
  8: '3 Octaves',
};

export const MAX_ARTIFICIAL_HARMONIC = 8;

/**
 * Touch point for artificial harmonic `n` when the string is stopped at `stop`:
 * the node of the shortened string nearest the stopping finger, x_s + (1 − x_s)/n.
 */
export function artificialTouchPosition(stop: number, n: number): number {
  return n === 1 ? stop : stop + (1 / n) * (1 - stop);
}

export interface ArtificialHarmonic {
  number: number;
  name: string;
  resultFreq: number;
  resultNote: NoteInfo;
  position: number;
  touchFret: number;
  touchNote: NoteInfo;
  touchCents: number;
}

/** Harmonics #1–#8 of a string stopped `centsAboveOpen` cents above its open pitch. */
export function artificialHarmonics(openFreq: number, centsAboveOpen: number): ArtificialHarmonic[] {
  const stoppedFreq = openFreq * Math.pow(2, centsAboveOpen / 1200);
  const stop = centsToPosition(centsAboveOpen);
  return Array.from({ length: MAX_ARTIFICIAL_HARMONIC }, (_, i) => {
    const n = i + 1;
    const resultFreq = stoppedFreq * n;
    const position = artificialTouchPosition(stop, n);
    const offset = nearestSemitone(position);
    return {
      number: n,
      name: ARTIFICIAL_HARMONIC_NAMES[n],
      resultFreq,
      resultNote: frequencyToNote(resultFreq),
      position,
      touchFret: offset.nearestFret,
      touchNote: frequencyToNote(frequencyAtSemitone(openFreq, offset.nearestFret)),
      touchCents: offset.cents,
    };
  });
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'unreachable';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  unreachable: 'Unreachable',
};

/** Rough difficulty of natural harmonic `n`, fixed by harmonic number. */
export function naturalDifficulty(n: number): Difficulty {
  if (n <= 4) return 'easy';
  if (n <= 8) return 'medium';
  return 'hard';
}

/** Rough difficulty of artificial harmonic `n`; #2 needs the touch an octave above the stop. */
export function artificialDifficulty(n: number): Difficulty {
  if (n === 2) return 'unreachable';
  if (n === 1 || n === 4) return 'easy';
  if (n === 3 || n === 5) return 'medium';
  return 'hard';
}
