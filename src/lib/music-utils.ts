export const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export const enharmonicMap: { [key: string]: string } = {
  'C♯': 'C♯/D♭',
  'D♯': 'D♯/E♭',
  'F♯': 'F♯/G♭',
  'G♯': 'G♯/A♭',
  'A♯': 'A♯/B♭'
};

export const getDisplayNote = (note: string) => {
  const noteName = note.slice(0, -1); // Remove octave number
  const octave = note.slice(-1);
  const displayName = enharmonicMap[noteName] || noteName;
  return displayName + octave;
};

export const freqToNote = (freq: number) => {
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  const halfSteps = Math.round(12 * Math.log2(freq / C0));
  const octave = Math.floor(halfSteps / 12);
  const note = noteNames[halfSteps % 12];

  const exactHalfSteps = 12 * Math.log2(freq / C0);
  const cents = (exactHalfSteps - halfSteps) * 100;

  const displayNote = getDisplayNote(`${note}${octave}`);

  return { note: displayNote, cents, freq };
};

export const getHarmonicPositions = (n: number) => {
  if (n === 1) return []; // Open string has no node positions
  const positions = [];
  for (let i = 1; i < n; i++) {
    // Skip positions that would simplify to an earlier harmonic
    // A position i/n simplifies if gcd(i, n) > 1
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    if (gcd(i, n) === 1) {
      positions.push({ position: i / n, numerator: i, denominator: n });
    }
  }
  return positions;
};

export const getNoteAtFret = (fretNumber: number, baseFreq: number) => {
  const freq = baseFreq * Math.pow(2, fretNumber / 12);
  return freqToNote(freq);
};

export const getPositionInfo = (position: number) => {
  // Calculate which fret position this represents in terms of distance along the string
  const maxFrets = 48;
  const extendedFretPositions = Array.from({ length: maxFrets }, (_, i) => {
    return 1 - Math.pow(2, -(i + 1) / 12);
  });

  // Find the two frets that bracket this position
  let lowerFret = 0;
  let upperFret = 1;
  let lowerFretPos = 0;
  let upperFretPos = extendedFretPositions[0];

  for (let i = 0; i < extendedFretPositions.length - 1; i++) {
    if (position >= extendedFretPositions[i] && position <= extendedFretPositions[i + 1]) {
      lowerFret = i + 1;
      upperFret = i + 2;
      lowerFretPos = extendedFretPositions[i];
      upperFretPos = extendedFretPositions[i + 1];
      break;
    }
  }

  // If position is before first fret
  if (position < extendedFretPositions[0]) {
    upperFret = 1;
    upperFretPos = extendedFretPositions[0];
  }

  // Calculate cents from lower and upper fret
  // Frequency is proportional to 1/length, so freq_ratio = length_fret / length_harmonic
  const centsFromLower = 1200 * Math.log2((1 - lowerFretPos) / (1 - position));
  const centsFromUpper = 1200 * Math.log2((1 - upperFretPos) / (1 - position));

  // Choose the closer one
  let nearestFret, cents;
  if (Math.abs(centsFromLower) <= Math.abs(centsFromUpper)) {
    nearestFret = lowerFret;
    cents = centsFromLower;
  } else {
    nearestFret = upperFret;
    cents = centsFromUpper;
  }

  return { nearestFret, cents };
};

export const getStopPosition = (fingerInputMode: string, fingerPosition: number, fingerCents: number) => {
    if (fingerInputMode === 'fret') {
      if (fingerPosition <= 0) return 0;
      return 1 - Math.pow(2, -(fingerPosition) / 12);
    }

    return fingerCents > 0 ? 1 - Math.pow(2, -fingerCents / 1200) : 0;
  };

export const calculateArtificialHarmonics = (baseFreq: number, fingerInputMode: string, fingerPosition: number, fingerCents: number) => {
    const centsAboveBase = fingerInputMode === 'fret' ? fingerPosition * 100 : fingerCents;
    const stoppedFreq = baseFreq * Math.pow(2, centsAboveBase / 1200);

    const harmonics = [
      { number: 1, name: 'Base Note (Stopped String)', ratio: 1 },
      { number: 2, name: 'Octave', ratio: 2 },
      { number: 3, name: 'Octave + Fifth', ratio: 3 },
      { number: 4, name: '2 Octaves', ratio: 4 },
      { number: 5, name: '2 Octaves + Major Third', ratio: 5 },
      { number: 6, name: '2 Octaves + Fifth', ratio: 6 },
      { number: 7, name: '2 Octaves + Minor Seventh', ratio: 7 },
      { number: 8, name: '3 Octaves', ratio: 8 }
    ];

    return harmonics.map(h => {
      const resultFreq = stoppedFreq * h.ratio;
      const resultNote = freqToNote(resultFreq);

      // Calculate the position on the string for this harmonic
      // For harmonic n, touch at position: stopPos + (1/n) * (1 - stopPos)
      const stopPosition = getStopPosition(fingerInputMode, fingerPosition, fingerCents);
      const position = h.number === 1 ? stopPosition : stopPosition + (1 / h.number) * (1 - stopPosition);
      const posInfo = getPositionInfo(position);
      const touchNote = getNoteAtFret(posInfo.nearestFret, baseFreq); // Note: touchNote calculation might be slightly off if baseFreq is not the open string, but for finding the note at a fret it relies on the open string freq.

      return {
        ...h,
        resultFreq,
        resultNote,
        touchFret: posInfo.nearestFret,
        touchNote,
        touchCents: posInfo.cents
      };
    });
  };

export const getArtificialHarmonicPositions = (fingerInputMode: string, fingerPosition: number, fingerCents: number) => {
    const stopPosition = getStopPosition(fingerInputMode, fingerPosition, fingerCents);
    if (stopPosition === 0) return [];

    return [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
      const position = n === 1 ? stopPosition : stopPosition + (1 / n) * (1 - stopPosition);
      return { number: n, position };
    });
  };

export const calculateFrequencyFromA440 = (noteStr: string) => {
  const noteMap: { [key: string]: number } = {
    'C': -9, 'C#': -8, 'DB': -8,
    'D': -7, 'D#': -6, 'EB': -6,
    'E': -5,
    'F': -4, 'F#': -3, 'GB': -3,
    'G': -2, 'G#': -1, 'AB': -1,
    'A': 0, 'A#': 1, 'BB': 1,
    'B': 2
  };

  const match = noteStr.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;

  const noteName = match[1].toUpperCase();
  const octave = parseInt(match[2]);

  const A4 = 440;
  const halfStepsFromA4 = (octave - 4) * 12 + noteMap[noteName];
  return A4 * Math.pow(2, halfStepsFromA4 / 12);
};

export const instruments: Record<string, Record<string, number | null>> = {
  violin: {
    G3: calculateFrequencyFromA440('G3'),
    D4: calculateFrequencyFromA440('D4'),
    A4: 440,
    E5: calculateFrequencyFromA440('E5')
  },
  viola: {
    C3: calculateFrequencyFromA440('C3'),
    G3: calculateFrequencyFromA440('G3'),
    D4: calculateFrequencyFromA440('D4'),
    A4: 440
  },
  cello: {
    C2: calculateFrequencyFromA440('C2'),
    G2: calculateFrequencyFromA440('G2'),
    D3: calculateFrequencyFromA440('D3'),
    A3: calculateFrequencyFromA440('A3')
  },
  bass: {
    E1: calculateFrequencyFromA440('E1'),
    A1: calculateFrequencyFromA440('A1'),
    D2: calculateFrequencyFromA440('D2'),
    G2: calculateFrequencyFromA440('G2')
  }
};

export const harmonicNames: { [key: number]: string } = {
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
  16: '4 Octaves'
};
