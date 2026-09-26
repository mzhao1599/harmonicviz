import { describe, expect, it } from 'vitest';
import {
  INSTRUMENT_IDS,
  INSTRUMENT_STRINGS,
  artificialDifficulty,
  artificialHarmonics,
  artificialTouchPosition,
  centsToPosition,
  frequencyToNote,
  gcd,
  naturalDifficulty,
  naturalTouchPoints,
  nearestSemitone,
  noteToFrequency,
  openStringFrequency,
  semitonePosition,
} from './music';

const G3 = noteToFrequency('G3')!;

describe('noteToFrequency', () => {
  it('tunes from A4 = 440 Hz in equal temperament', () => {
    expect(noteToFrequency('A4')).toBe(440);
    expect(noteToFrequency('A5')).toBeCloseTo(880, 10);
    expect(G3).toBeCloseTo(195.9977, 4);
    expect(noteToFrequency('E1')).toBeCloseTo(41.2034, 4);
    expect(noteToFrequency('C2')).toBeCloseTo(65.4064, 4);
    expect(noteToFrequency('Bb4')).toBeCloseTo(noteToFrequency('A#4')!, 10);
  });

  it('rejects malformed names', () => {
    expect(noteToFrequency('H2')).toBeNull();
    expect(noteToFrequency('A')).toBeNull();
  });

  it('knows every open string', () => {
    for (const id of INSTRUMENT_IDS) {
      for (const s of INSTRUMENT_STRINGS[id]) expect(noteToFrequency(s)).not.toBeNull();
    }
    expect(openStringFrequency('violin', 'E5')).toBeCloseTo(659.2551, 4);
    expect(openStringFrequency('violin', 'C2')).toBe(196); // not a violin string
  });
});

describe('frequencyToNote', () => {
  it('names notes with enharmonic spellings', () => {
    expect(frequencyToNote(440).note).toBe('A4');
    expect(frequencyToNote(noteToFrequency('A#4')!).note).toBe('A♯/B♭4');
    expect(frequencyToNote(noteToFrequency('C4')!).note).toBe('C4');
  });

  it('puts the 5th harmonic 13.69 cents below equal temperament on any string', () => {
    for (const id of INSTRUMENT_IDS) {
      for (const s of INSTRUMENT_STRINGS[id]) {
        expect(frequencyToNote(openStringFrequency(id, s) * 5).cents.toFixed(2)).toBe('-13.69');
      }
    }
  });

  it('puts the 3rd harmonic 1.96 cents above and the 7th 31.17 cents below', () => {
    expect(frequencyToNote(G3 * 3).cents.toFixed(2)).toBe('1.96');
    expect(frequencyToNote(G3 * 7).cents.toFixed(2)).toBe('-31.17');
  });
});

describe('naturalTouchPoints', () => {
  it('keeps only fractions in lowest terms (the gcd filter)', () => {
    const fractions = (n: number) => naturalTouchPoints(n).map(p => `${p.numerator}/${p.denominator}`);
    expect(fractions(1)).toEqual([]);
    expect(fractions(2)).toEqual(['1/2']);
    expect(fractions(4)).toEqual(['1/4', '3/4']);
    expect(fractions(5)).toEqual(['1/5', '2/5', '3/5', '4/5']);
    expect(fractions(6)).toEqual(['1/6', '5/6']);
    expect(fractions(12)).toEqual(['1/12', '5/12', '7/12', '11/12']);
  });

  it('has Euler phi(n) points', () => {
    const phi = [0, 1, 1, 2, 2, 4, 2, 6, 4, 6, 4, 10, 4, 12, 6, 8, 8];
    for (let n = 2; n <= 16; n++) expect(naturalTouchPoints(n)).toHaveLength(phi[n]);
  });

  it('uses gcd correctly', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 16)).toBe(1);
  });
});

describe('semitone positions', () => {
  it('places semitone k at 1 − 2^(−k/12)', () => {
    expect(semitonePosition(0)).toBe(0);
    expect(semitonePosition(12)).toBeCloseTo(0.5, 12);
    expect(semitonePosition(24)).toBeCloseTo(0.75, 12);
    expect(semitonePosition(7)).toBeCloseTo(1 - 2 ** (-7 / 12), 12);
  });

  it('converts cents to a position the same way', () => {
    expect(centsToPosition(0)).toBe(0);
    expect(centsToPosition(1200)).toBeCloseTo(0.5, 12);
    expect(centsToPosition(200)).toBe(semitonePosition(2));
  });
});

describe('nearestSemitone', () => {
  it('puts the 1/4 node on the violin G string 1.96 cents below the 5th semitone (C4)', () => {
    const { nearestFret, cents } = nearestSemitone(1 / 4);
    expect(nearestFret).toBe(5);
    expect(cents.toFixed(2)).toBe('-1.96');
    expect(frequencyToNote(G3 * 2 ** (5 / 12)).note).toBe('C4');
  });

  it('puts the 1/3 node 1.96 cents above the 7th semitone and 1/2 exactly on the 12th', () => {
    expect(nearestSemitone(1 / 3).nearestFret).toBe(7);
    expect(nearestSemitone(1 / 3).cents.toFixed(2)).toBe('1.96');
    expect(nearestSemitone(1 / 2).nearestFret).toBe(12);
    expect(Math.abs(nearestSemitone(1 / 2).cents)).toBeLessThan(1e-9);
  });

  it('puts the 1/5 node 13.69 cents below the 4th semitone', () => {
    const { nearestFret, cents } = nearestSemitone(1 / 5);
    expect(nearestFret).toBe(4);
    expect(cents.toFixed(2)).toBe('-13.69');
  });

  it('rounds to the semitone on the nearer side of the midpoint', () => {
    expect(nearestSemitone(semitonePosition(3.49)).nearestFret).toBe(3);
    expect(nearestSemitone(semitonePosition(3.51)).nearestFret).toBe(4);
    expect(nearestSemitone(semitonePosition(0.49)).nearestFret).toBe(0);
  });

  // The original implementation scanned 48 semitone positions; the closed form must agree.
  it('matches the original scan over the whole string', () => {
    const scan = (position: number) => {
      const frets = Array.from({ length: 48 }, (_, i) => 1 - Math.pow(2, -(i + 1) / 12));
      let lower = 0, upper = 1, lowerPos = 0, upperPos = frets[0];
      for (let i = 0; i < frets.length - 1; i++) {
        if (position >= frets[i] && position <= frets[i + 1]) {
          lower = i + 1; upper = i + 2; lowerPos = frets[i]; upperPos = frets[i + 1];
          break;
        }
      }
      const fromLower = 1200 * Math.log2((1 - lowerPos) / (1 - position));
      const fromUpper = 1200 * Math.log2((1 - upperPos) / (1 - position));
      return Math.abs(fromLower) <= Math.abs(fromUpper)
        ? { nearestFret: lower, cents: fromLower }
        : { nearestFret: upper, cents: fromUpper };
    };
    for (let i = 1; i < 2000; i++) {
      const x = (i / 2000) * 0.9375;
      const a = nearestSemitone(x), b = scan(x);
      expect(a.nearestFret).toBe(b.nearestFret);
      expect(a.cents).toBeCloseTo(b.cents, 9);
    }
  });
});

describe('artificial harmonics', () => {
  it('sounds 880 Hz (A5) for violin G stopped at the 2nd semitone, harmonic 4', () => {
    const h4 = artificialHarmonics(G3, 200)[3];
    expect(h4.number).toBe(4);
    expect(h4.resultFreq).toBeCloseTo(880, 9);
    expect(h4.resultNote.note).toBe('A5');
    expect(Math.abs(h4.resultNote.cents)).toBeLessThan(1e-6);
  });

  it('touches a fourth above the stop for #4 and a fifth above for #3', () => {
    const [, , h3, h4] = artificialHarmonics(G3, 200);
    expect(h4.touchFret).toBe(7);
    expect(h4.touchNote.note).toBe('D4');
    expect(h4.touchCents.toFixed(2)).toBe('-1.96');
    expect(h3.touchFret).toBe(9);
    expect(h3.touchCents.toFixed(2)).toBe('1.96');
  });

  it('places the touch at x_s + (1 − x_s)/n', () => {
    expect(artificialTouchPosition(0.5, 1)).toBe(0.5);
    expect(artificialTouchPosition(0.5, 2)).toBeCloseTo(0.75, 12);
    expect(artificialTouchPosition(0.5, 4)).toBeCloseTo(0.625, 12);
    const stop = centsToPosition(250);
    artificialHarmonics(G3, 250).forEach(h => {
      expect(h.position).toBeCloseTo(h.number === 1 ? stop : stop + (1 - stop) / h.number, 12);
    });
  });

  it('lists #1–#8 with n times the stopped frequency', () => {
    const list = artificialHarmonics(440, 700);
    expect(list.map(h => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    list.forEach(h => expect(h.resultFreq).toBeCloseTo(440 * 2 ** (7 / 12) * h.number, 9));
  });
});

describe('difficulty', () => {
  it('rates natural harmonics by number', () => {
    expect([1, 4, 5, 8, 9, 16].map(naturalDifficulty)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard', 'hard']);
  });

  it('rates artificial harmonics by number', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(artificialDifficulty)).toEqual(
      ['easy', 'unreachable', 'medium', 'easy', 'medium', 'hard', 'hard', 'hard'],
    );
  });
});
