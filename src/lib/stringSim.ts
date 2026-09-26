// Modal simulation of the four open strings in the header. Each string is a sum
// of damped normal modes q_k(t)·sin(kπx), integrated in slowed-down time:
//   q_k'' = −ω_k² q_k − 2γ_k q_k' + F_k(t)
// γ_k grows with k (higher modes die faster), a light finger at x adds
// ζ·ω_k·sin²(kπx) (a mode with a node under the finger loses nothing), and F_k is a
// resonant drive from whatever the app is playing (sympathetic resonance).

export const SIM_MODES = 24;
/** Visual fundamental of the lowest string, in Hz of slowed-down time. */
const VISUAL_BASE_HZ = 0.9;
const BASE_DAMPING = 0.4;
const DAMPING_PER_MODE = 0.08;
/**
 * Extra damping from a light finger as a fraction of critical damping, scaled by
 * sin²(kπx). Staying below critical matters: an overdamped mode creeps back
 * slowly instead of dying out.
 */
const TOUCH_DAMPING_RATIO = 0.9;
/** Half-width of the sympathetic resonance, in cents. */
const RESONANCE_CENTS = 4;
/** Steady amplitude of a fully driven fundamental. */
const DRIVE_LEVEL = 2.2;
/** Standard deviation of the idle "room noise" velocity kicks on the lowest modes. */
const NOISE = 0.09;

export interface SimString {
  freq: number;
  q: Float64Array;
  v: Float64Array;
  omega: Float64Array;
  gamma: Float64Array;
  /** Where a finger rests on this string (0..1), or null. */
  touch: number | null;
}

export function createStrings(freqs: number[]): SimString[] {
  const lowest = Math.min(...freqs);
  return freqs.map(freq => {
    const omega = new Float64Array(SIM_MODES);
    const gamma = new Float64Array(SIM_MODES);
    for (let i = 0; i < SIM_MODES; i++) {
      const k = i + 1;
      omega[i] = 2 * Math.PI * VISUAL_BASE_HZ * (freq / lowest) * k;
      gamma[i] = BASE_DAMPING * (1 + DAMPING_PER_MODE * k);
    }
    return { freq, q: new Float64Array(SIM_MODES), v: new Float64Array(SIM_MODES), omega, gamma, touch: null };
  });
}

/**
 * Pluck at β (0..1 from the nut) with peak height h: the Fourier sine
 * coefficients of a triangle, q_k = 2h·sin(kπβ) / (k²π²·β(1 − β)).
 */
export function pluck(s: SimString, beta: number, h: number) {
  for (let i = 0; i < SIM_MODES; i++) {
    const k = i + 1;
    s.q[i] += (2 * h * Math.sin(k * Math.PI * beta)) / (k * k * Math.PI * Math.PI * beta * (1 - beta));
  }
}

export function rest(s: SimString) {
  s.q.fill(0);
  s.v.fill(0);
}

/**
 * How strongly each mode of a string is driven by the sounding partials: a
 * Lorentzian in frequency around each mode, k·f, a few cents wide.
 */
export function sympatheticDrive(freq: number, partials: { freq: number; amp: number }[]): Float64Array {
  const drive = new Float64Array(SIM_MODES);
  const width = 2 ** (RESONANCE_CENTS / 1200) - 1;
  for (let i = 0; i < SIM_MODES; i++) {
    const f = (i + 1) * freq;
    for (const p of partials) {
      const detune = (p.freq - f) / (f * width);
      drive[i] += p.amp / (1 + detune * detune);
    }
  }
  return drive;
}

let spare: number | null = null;
function gaussian(): number {
  if (spare !== null) {
    const g = spare;
    spare = null;
    return g;
  }
  const u = 1 - Math.random();
  const r = Math.sqrt(-2 * Math.log(u));
  const a = 2 * Math.PI * Math.random();
  spare = r * Math.sin(a);
  return r * Math.cos(a);
}

/**
 * Advance a string by dt seconds of visual time t → t + dt. `drive` comes from
 * sympatheticDrive (or null), `noise` turns on the idle room noise.
 */
export function step(s: SimString, dt: number, t: number, drive: Float64Array | null, noise: boolean) {
  const maxOmega = s.omega[SIM_MODES - 1];
  const substeps = Math.max(1, Math.ceil((maxOmega * dt) / 0.3));
  const h = dt / substeps;
  for (let i = 0; i < SIM_MODES; i++) {
    const k = i + 1;
    const omega = s.omega[i];
    const touchSin = s.touch === null ? 0 : Math.sin(k * Math.PI * s.touch);
    const gamma = s.gamma[i] + TOUCH_DAMPING_RATIO * omega * touchSin * touchSin;
    // Drive scaled so a matched partial of amplitude a settles at a·DRIVE_LEVEL/k (Helmholtz-like 1/k shape).
    const force = drive && drive[i] > 1e-4 ? (2 * s.gamma[i] * omega * DRIVE_LEVEL * drive[i]) / k : 0;
    let q = s.q[i];
    let v = s.v[i];
    for (let j = 0; j < substeps; j++) {
      const time = t + j * h;
      v += (-omega * omega * q - 2 * gamma * v + force * Math.cos(omega * time)) * h;
      q += v * h;
    }
    if (noise && k <= 3) v += NOISE * omega * Math.sqrt(dt) * gaussian() / k;
    s.q[i] = q;
    s.v[i] = v;
  }
}

/** Displacement of the string at x (0..1), using a precomputed table of sin(kπx). */
export function shapeAt(s: SimString, sinTable: Float64Array, point: number): number {
  let y = 0;
  const offset = point * SIM_MODES;
  for (let i = 0; i < SIM_MODES; i++) y += s.q[i] * sinTable[offset + i];
  return y;
}

export function sinTable(points: number): Float64Array {
  const table = new Float64Array((points + 1) * SIM_MODES);
  for (let p = 0; p <= points; p++) {
    for (let i = 0; i < SIM_MODES; i++) table[p * SIM_MODES + i] = Math.sin((i + 1) * Math.PI * (p / points));
  }
  return table;
}
