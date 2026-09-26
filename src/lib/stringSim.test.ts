import { describe, expect, it } from 'vitest';
import { SIM_MODES, createStrings, pluck, shapeAt, sinTable, step, sympatheticDrive } from './stringSim';

describe('header string simulation', () => {
  it('plucks with the Fourier series of a triangle: sin(kπβ)/k²', () => {
    const [s] = createStrings([196]);
    pluck(s, 0.25, 1);
    for (let i = 0; i < SIM_MODES; i++) {
      const k = i + 1;
      expect(s.q[i]).toBeCloseTo((2 * Math.sin(k * Math.PI * 0.25)) / (k * k * Math.PI ** 2 * 0.25 * 0.75), 12);
    }
    // 24 modes rebuild the triangle's peak to within a few percent.
    const points = 100;
    expect(shapeAt(s, sinTable(points), 25)).toBeCloseTo(1, 1);
  });

  it('keeps ringing only in the modes with a node under a light finger', () => {
    const [s] = createStrings([196]);
    pluck(s, 0.88, 1);
    s.touch = 1 / 3;
    for (let n = 0; n < 240; n++) step(s, 1 / 60, n / 60, null, false);
    const energy = (i: number) => s.q[i] ** 2 + (s.v[i] / s.omega[i]) ** 2;
    // After four seconds, mode 3 (node at 1/3) has far more energy than modes 1 and 2.
    expect(energy(2)).toBeGreaterThan(1e3 * energy(0));
    expect(energy(2)).toBeGreaterThan(1e3 * energy(1));
  });

  it('drives sympathetic resonance only near a matching partial', () => {
    // A4 string (440 Hz): an 880 Hz partial excites mode 2 and nothing else noticeably.
    const drive = sympatheticDrive(440, [{ freq: 880, amp: 1 }]);
    expect(drive[1]).toBeCloseTo(1, 12);
    expect(drive[0]).toBeLessThan(1e-4);
    expect(drive[2]).toBeLessThan(1e-4);
    // D4's 3rd harmonic (880.99 Hz, 1.96 cents sharp of 880) still rings the A string, a little less.
    const fromD = sympatheticDrive(440, [{ freq: 293.6648 * 3, amp: 1 }]);
    expect(fromD[1]).toBeGreaterThan(0.7);
    expect(fromD[1]).toBeLessThan(1);
  });
});
