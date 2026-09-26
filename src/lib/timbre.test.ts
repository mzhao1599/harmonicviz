import { describe, expect, it } from 'vitest';
import {
  MAX_MODES,
  MAX_PARTIAL_FREQ,
  hasNodeAt,
  helmholtzBridgeForce,
  helmholtzDisplacement,
  levelDb,
  modeFrequency,
  partialAmplitudes,
  stringModes,
} from './timbre';
import { naturalTouchPoints, noteToFrequency } from './music';

const G3 = noteToFrequency('G3')!;
const surviving = (f0: number, touch: number | null) =>
  stringModes({ f0, touch }).filter(m => m.survives).map(m => m.k);

describe('hasNodeAt', () => {
  it('finds the nodes of sin(kπx)', () => {
    expect(hasNodeAt(2, 1 / 2)).toBe(true);
    expect(hasNodeAt(3, 1 / 2)).toBe(false);
    expect(hasNodeAt(12, 1 / 3)).toBe(true);
    expect(hasNodeAt(13, 1 / 3)).toBe(false);
    expect(hasNodeAt(30, 7 / 15)).toBe(true);
  });
});

describe('stringModes', () => {
  it('lets every mode through when nothing touches the string', () => {
    const modes = stringModes({ f0: G3, touch: null });
    expect(modes).toHaveLength(MAX_MODES);
    expect(modes.every(m => m.survives)).toBe(true);
    modes.forEach(m => expect(m.freq).toBeCloseTo(m.k * G3, 9));
  });

  it('keeps only multiples of n when touched at i/n in lowest terms', () => {
    expect(surviving(G3, 1 / 2)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]);
    expect(surviving(G3, 1 / 4)).toEqual([4, 8, 12, 16, 20, 24, 28, 32]);
    expect(surviving(G3, 3 / 4)).toEqual([4, 8, 12, 16, 20, 24, 28, 32]);
    expect(surviving(G3, 2 / 5)).toEqual([5, 10, 15, 20, 25, 30]);
    for (let n = 2; n <= 16; n++) {
      for (const p of naturalTouchPoints(n)) {
        const ks = surviving(G3, p.position);
        expect(ks[0]).toBe(n); // the lowest surviving mode is the harmonic itself
        expect(ks.every(k => k % n === 0)).toBe(true);
      }
    }
  });

  it('makes the touched string sound harmonic n: the lowest surviving mode is n·f0', () => {
    const modes = stringModes({ f0: G3, touch: 1 / 4 }).filter(m => m.survives);
    expect(modes[0].freq).toBeCloseTo(783.99, 2);
  });

  it('matches the artificial harmonic: G3 stopped at the 2nd semitone, touched at 1/4 of the rest, sounds 880 Hz', () => {
    const stopped = G3 * 2 ** (2 / 12);
    const modes = stringModes({ f0: stopped, touch: 1 / 4 }).filter(m => m.survives);
    expect(modes[0].freq).toBeCloseTo(880, 9);
  });

  it('drops partials above the frequency limit', () => {
    const e5 = noteToFrequency('E5')!;
    const modes = stringModes({ f0: e5, touch: null });
    expect(modes[modes.length - 1].freq).toBeLessThanOrEqual(MAX_PARTIAL_FREQ);
    expect(modes).toHaveLength(Math.floor(MAX_PARTIAL_FREQ / e5));
  });
});

describe('bowed-string spectrum', () => {
  it('uses 1/k² displacement and 1/k bridge force (a sawtooth)', () => {
    expect(helmholtzDisplacement(4)).toBe(1 / 16);
    expect(helmholtzBridgeForce(4)).toBe(1 / 4);
    const [m1, m2] = stringModes({ f0: G3, touch: null });
    expect(levelDb(m1)).toBe(0);
    expect(levelDb(m2)).toBeCloseTo(-6.02, 2);
  });

  it('normalises the sounding partials to unit RMS', () => {
    for (const touch of [null, 1 / 2, 1 / 7]) {
      const amps = partialAmplitudes(stringModes({ f0: G3, touch }));
      expect(Math.hypot(...amps.map(a => a.amp))).toBeCloseTo(1, 12);
    }
    // Relative levels are kept: mode 8 is half of mode 4 when touched at 1/4.
    const [a4, a8] = partialAmplitudes(stringModes({ f0: G3, touch: 1 / 4 }));
    expect(a8.amp / a4.amp).toBeCloseTo(0.5, 12);
  });
});

describe('modeFrequency', () => {
  it('is k·f0 for an ideal string', () => {
    expect(modeFrequency(5, 100)).toBe(500);
  });
});
