// Timbre of an ideal string as a sum of its normal modes. Mode k has shape
// sin(kπx) along the vibrating length (x from 0 to 1) and frequency k·f0.
// A light touch at x only lets through the modes that have a node there.

/** Highest mode number used for sound and drawing. */
export const MAX_MODES = 32;
/** Partials above this frequency are left out (little bowed-string energy up there, and it avoids aliasing). */
export const MAX_PARTIAL_FREQ = 16000;
/** |sin(kπx)| below this counts as a node. Touch points are exact fractions, so this only absorbs rounding. */
export const NODE_TOLERANCE = 1e-9;

/** True when mode k has a node at x, i.e. sin(kπx) ≈ 0. */
export function hasNodeAt(k: number, x: number): boolean {
  return Math.abs(Math.sin(k * Math.PI * x)) < NODE_TOLERANCE;
}

/**
 * Bowed-string (Helmholtz motion) spectrum. The displacement of mode k is
 * proportional to 1/k², which is what the string drawing uses. The force on the
 * bridge, which drives the body and is what we hear, is the slope at the end:
 * k · 1/k² = 1/k, a sawtooth.
 */
export const helmholtzDisplacement = (k: number) => 1 / (k * k);
export const helmholtzBridgeForce = (k: number) => 1 / k;

/** Frequency of mode k: f_k = k · f0 · √(1 + B·k²). B = 0 is an ideal, perfectly flexible string. */
export function modeFrequency(k: number, f0: number, B = 0): number {
  return k * f0 * Math.sqrt(1 + B * k * k);
}

export interface Mode {
  k: number;
  freq: number;
  /** Relative displacement amplitude (1/k²). */
  displacement: number;
  /** Relative sound (bridge-force) amplitude (1/k). */
  sound: number;
  /** Whether the mode survives the touch (always true for an untouched string). */
  survives: boolean;
}

export interface ModeOptions {
  /** Fundamental of the vibrating length, before any stiffness correction. */
  f0: number;
  /** Touch point as a fraction of the vibrating length, or null for no touch. */
  touch: number | null;
  /** Inharmonicity coefficient; 0 for an ideal string. */
  B?: number;
  maxModes?: number;
  maxFreq?: number;
}

/** Modes 1..N of the string below `maxFreq`, marking which survive the touch. */
export function stringModes({ f0, touch, B = 0, maxModes = MAX_MODES, maxFreq = MAX_PARTIAL_FREQ }: ModeOptions): Mode[] {
  const modes: Mode[] = [];
  for (let k = 1; k <= maxModes; k++) {
    const freq = modeFrequency(k, f0, B);
    if (freq > maxFreq) break;
    modes.push({
      k,
      freq,
      displacement: helmholtzDisplacement(k),
      sound: helmholtzBridgeForce(k),
      survives: touch === null || hasNodeAt(k, touch),
    });
  }
  return modes;
}

/**
 * Oscillator amplitudes for the sounding modes, scaled so the total RMS level is
 * the same as a single sine of amplitude 1. Without this a touched harmonic,
 * which keeps only a few weak partials, would be much quieter than the open string.
 */
export function partialAmplitudes(modes: Mode[]): { freq: number; amp: number }[] {
  const sounding = modes.filter(m => m.survives);
  const norm = Math.sqrt(sounding.reduce((sum, m) => sum + m.sound * m.sound, 0));
  if (norm === 0) return [];
  return sounding.map(m => ({ freq: m.freq, amp: m.sound / norm }));
}

/** Level of a mode relative to mode 1, in dB. */
export function levelDb(mode: Mode): number {
  return 20 * Math.log10(mode.sound);
}
