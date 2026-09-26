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

/**
 * String displacement at x (0..1 along the vibrating length) and time t for
 * Helmholtz motion: y = Σ a_k · sin(kπx) · sin(2π f_k t), a_k = 1/k², over the
 * given modes. With all modes this is a single kink running round a
 * parallelogram; with only multiples of n it is n copies of that, one per segment.
 */
export function displacement(modes: Mode[], x: number, t: number): number {
  let y = 0;
  for (const m of modes) y += m.displacement * Math.sin(m.k * Math.PI * x) * Math.sin(2 * Math.PI * m.freq * t);
  return y;
}

/**
 * Largest |displacement| at each of `points` evenly spaced positions, sampled
 * over one period of the lowest mode. Used to scale the drawing and outline
 * the envelope the string moves within.
 */
export function displacementEnvelope(modes: Mode[], points: number, timeSamples = 64): number[] {
  const envelope = new Array<number>(points + 1).fill(0);
  if (modes.length === 0) return envelope;
  const period = 1 / modes[0].freq;
  for (let s = 0; s < timeSamples; s++) {
    const t = (s / timeSamples) * period;
    for (let i = 0; i <= points; i++) {
      envelope[i] = Math.max(envelope[i], Math.abs(displacement(modes, i / points, t)));
    }
  }
  return envelope;
}

/**
 * Inharmonicity coefficient used by the stiff-string option. Real values depend on
 * the string's core, winding, tension and length, so this is an illustrative
 * value, not a measurement (for comparison, piano bass strings are around 2 × 10⁻⁴).
 */
export const STIFF_STRING_B = 1e-4;

/** Instruments offered the stiff-string option: their thick, wound low strings are the stiffest. */
export const STIFF_STRING_INSTRUMENTS: readonly string[] = ['cello', 'bass'];

/** "1.0 × 10⁻⁴" */
export function formatB(B: number): string {
  const exponent = Math.floor(Math.log10(B));
  const superscript = String(exponent).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
  return `${(B / 10 ** exponent).toFixed(1)} × 10${superscript}`;
}

/**
 * Fundamental (before the stiffness correction) and inharmonicity of the vibrating
 * length. The open string is tuned so that its lowest mode sounds `openFreq`, so
 * f0 = openFreq / √(1 + B). Stopping the string at `stop` shortens it to 1 − stop:
 * f0 scales as 1/L and B as 1/L².
 */
export function vibratingLength(openFreq: number, stop: number, B: number): { f0: number; B: number } {
  const length = 1 - stop;
  return { f0: openFreq / Math.sqrt(1 + B) / length, B: B / (length * length) };
}

/** Sounding frequency of harmonic n: the lowest mode left by a touch at 1/n, f_n = n·f0·√(1 + B·n²). */
export function harmonicFrequency(openFreq: number, n: number, B: number, stop = 0): number {
  const segment = vibratingLength(openFreq, stop, B);
  return modeFrequency(n, segment.f0, segment.B);
}

/** How far a stiff string's mode k is sharp of k times its fundamental, in cents. */
export function inharmonicityCents(k: number, B: number): number {
  return 600 * Math.log2((1 + B * k * k) / (1 + B));
}
