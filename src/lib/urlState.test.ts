import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, decodeState, encodeState, type ShareState } from './urlState';

describe('shareable URL state', () => {
  it('round-trips natural and artificial harmonics', () => {
    const states: ShareState[] = [
      { ...DEFAULT_STATE, harmonic: 4, touch: 3 },
      { ...DEFAULT_STATE, instrument: 'cello', string: 'G2', harmonic: 5, touch: 2 },
      { ...DEFAULT_STATE, instrument: 'violin', string: 'G3', stop: 2, artificial: 4 },
      { ...DEFAULT_STATE, instrument: 'bass', string: 'E1', stopMode: 'cents', stop: 250, artificial: 3 },
      { ...DEFAULT_STATE, instrument: 'cello', string: 'C2', harmonic: 7, touch: 3, stiff: true },
    ];
    for (const s of states) expect(decodeState(encodeState(s))).toEqual(s);
  });

  it('writes readable parameters', () => {
    expect(encodeState({ ...DEFAULT_STATE, harmonic: 4, touch: 3 })).toBe('instrument=violin&string=G3&harmonic=4&touch=3');
    expect(encodeState({ ...DEFAULT_STATE, stop: 2, artificial: 4 })).toBe('instrument=violin&string=G3&fret=2&artificial=4');
  });

  it('falls back to defaults for missing or invalid values', () => {
    expect(decodeState('')).toEqual(DEFAULT_STATE);
    expect(decodeState('?instrument=banjo&harmonic=99&fret=-1')).toEqual(DEFAULT_STATE);
    expect(decodeState('?harmonic=2.5')).toEqual(DEFAULT_STATE);
    expect(decodeState('?cents=5000')).toEqual(DEFAULT_STATE);
  });

  it('uses the first string when the string does not belong to the instrument', () => {
    expect(decodeState('?instrument=cello&string=E5').string).toBe('C2');
    expect(decodeState('?instrument=viola&string=A4').string).toBe('A4');
  });

  it('only accepts touch points in lowest terms', () => {
    expect(decodeState('?harmonic=4&touch=2').touch).toBeNull(); // 2/4 is the 2nd harmonic
    expect(decodeState('?harmonic=4&touch=4').touch).toBeNull();
    expect(decodeState('?harmonic=6&touch=5').touch).toBe(5);
  });

  it('only turns on the stiff string for cello and bass', () => {
    expect(decodeState('?instrument=bass&stiff=1').stiff).toBe(true);
    expect(decodeState('?instrument=violin&stiff=1').stiff).toBe(false);
    expect(encodeState({ ...DEFAULT_STATE, stiff: true })).not.toContain('stiff');
  });

  it('resets the natural harmonic when the string is stopped', () => {
    const s = decodeState('?harmonic=5&touch=2&fret=3&artificial=9');
    expect(s).toMatchObject({ harmonic: 1, touch: null, stop: 3, artificial: 1 });
  });
});
