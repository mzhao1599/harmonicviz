import { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft } from 'lucide-react';

const StringHarmonicVisualizer = () => {
  const [instrument, setInstrument] = useState('violin');
  const [selectedString, setSelectedString] = useState('G3');
  const [playMode, setPlayMode] = useState('off'); // 'off', 'natural', 'artificial'
  const [showVisualize, setShowVisualize] = useState(true);
  const [showFrets, setShowFrets] = useState(true);
  const [harmonicNumber, setHarmonicNumber] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [artificialHarmonicIndex, setArtificialHarmonicIndex] = useState(0);
  const [fingerPosition, setFingerPosition] = useState(0);
  const [fingerCents, setFingerCents] = useState(0);
  const [fingerInputMode, setFingerInputMode] = useState('fret'); // 'fret' or 'cents'
  const [animationPhase, setAnimationPhase] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const STRING_SVG_WIDTH = 900;
  const STRING_SVG_HEIGHT = 150;
  const STRING_LEFT_X = 40;
  const STRING_LENGTH = 820;
  const STRING_Y = 75;

  const calculateFrequencyFromA440 = (noteStr: string) => {
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

  const instruments = {
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

  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  
  const enharmonicMap: { [key: string]: string } = {
    'C♯': 'C♯/D♭',
    'D♯': 'D♯/E♭',
    'F♯': 'F♯/G♭',
    'G♯': 'G♯/A♭',
    'A♯': 'A♯/B♭'
  };
  
  const getDisplayNote = (note: string) => {
    const noteName = note.slice(0, -1); // Remove octave number
    const octave = note.slice(-1);
    const displayName = enharmonicMap[noteName] || noteName;
    return displayName + octave;
  };
  
  const harmonicNames: { [key: number]: string } = {
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

  const baseFreq = (instruments as any)[instrument]?.[selectedString] || 196;

  // Generate harmonic positions for a given harmonic number
  const getHarmonicPositions = (n: number) => {
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

  // Get note name at a specific fret position
  const getNoteAtFret = (fretNumber: number) => {
    const freq = baseFreq * Math.pow(2, fretNumber / 12);
    return freqToNote(freq);
  };

  // Find nearest fret to a harmonic position
  const getPositionInfo = (position: number) => {
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

  useEffect(() => {
    if (playMode === 'artificial' && fingerPosition === 0 && fingerCents === 0) {
      stopAudio();
      setPlayMode('off');
    }
  }, [fingerPosition, fingerCents, playMode]);

  useEffect(() => {
    if (playMode !== 'off' && showVisualize) {
      const interval = setInterval(() => {
        setAnimationPhase(p => (p + 0.1) % (Math.PI * 2));
      }, 16);
      return () => clearInterval(interval);
    }
  }, [playMode, showVisualize]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  useEffect(() => {
    if (playMode === 'natural') {
      playNote();
    } else if (playMode === 'artificial' && (fingerPosition > 0 || fingerCents > 0)) {
      playArtificialNote();
    } else if (playMode === 'artificial' && fingerPosition === 0 && fingerCents === 0) {
      stopAudio();
      setPlayMode('off');
    }
  }, [harmonicNumber, selectedPosition, selectedString, instrument, artificialHarmonicIndex, fingerPosition, fingerCents, fingerInputMode, playMode]);

  const stopAudio = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const togglePlay = () => {
    const shouldUseArtificial = fingerPosition > 0 || fingerCents > 0;

    if (playMode !== 'off') {
      stopAudio();
      setPlayMode('off');
      return;
    }

    if (shouldUseArtificial) {
      setPlayMode('artificial');
      playArtificialNote();
    } else {
      setPlayMode('natural');
      playNote();
    }
  };

  const playNote = () => {
    stopAudio();
    
    const freq = baseFreq * harmonicNumber;
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainNodeRef.current = audioContextRef.current.createGain();
    
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
    gainNodeRef.current.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    
    oscillatorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContextRef.current.destination);
    oscillatorRef.current.start();
  };

  const playArtificialNote = () => {
    stopAudio();
    
    const artificialHarmonics = calculateArtificialHarmonics();
    const currentArtificial = artificialHarmonics[artificialHarmonicIndex];
    const freq = currentArtificial.resultFreq;
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainNodeRef.current = audioContextRef.current.createGain();
    
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
    gainNodeRef.current.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    
    oscillatorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContextRef.current.destination);
    oscillatorRef.current.start();
  };

  const freqToNote = (freq: number) => {
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

  const nextHarmonic = () => {
    if (harmonicNumber < 16) {
      setHarmonicNumber(harmonicNumber + 1);
      setSelectedPosition(null);
    }
  };

  const prevHarmonic = () => {
    if (harmonicNumber > 1) {
      setHarmonicNumber(harmonicNumber - 1);
      setSelectedPosition(null);
    }
  };

  const selectPosition = (position: number) => {
    setSelectedPosition(position);
  };

  const changeInstrument = (inst: string) => {
    setInstrument(inst);
    setSelectedString(Object.keys((instruments as any)[inst])[0]);
  };

  const calculateArtificialHarmonics = () => {
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
      const stopPosition = getStopPosition();
      const position = h.number === 1 ? stopPosition : stopPosition + (1 / h.number) * (1 - stopPosition);
      const posInfo = getPositionInfo(position);
      const touchNote = getNoteAtFret(posInfo.nearestFret);
      
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

  const getStopPosition = () => {
    if (fingerInputMode === 'fret') {
      if (fingerPosition <= 0) return 0;
      return 1 - Math.pow(2, -(fingerPosition) / 12);
    }

    return fingerCents > 0 ? 1 - Math.pow(2, -fingerCents / 1200) : 0;
  };

  const getArtificialHarmonicPositions = () => {
    const stopPosition = getStopPosition();
    if (stopPosition === 0) return [];
    
    return [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
      const position = n === 1 ? stopPosition : stopPosition + (1 / n) * (1 - stopPosition);
      return { number: n, position };
    });
  };

  const drawString = () => {
    let path = `M ${STRING_LEFT_X} ${STRING_Y}`;
    
    if (playMode !== 'off' && showVisualize) {
      const segments = 100;
      
      for (let i = 0; i <= segments; i++) {
        const x = STRING_LEFT_X + (i / segments) * STRING_LENGTH;
        const normalizedX = i / segments;
        
        let amplitude;
        if (playMode === 'natural') {
          amplitude = 8 * Math.sin(normalizedX * Math.PI * harmonicNumber) * Math.sin(animationPhase);
        } else if (playMode === 'artificial') {
          const artificialHarmonics = calculateArtificialHarmonics();
          const currentArtificial = artificialHarmonics[artificialHarmonicIndex];
          const stopPosition = getStopPosition();
          if (normalizedX < stopPosition || stopPosition >= 0.999) {
            amplitude = 0;
          } else {
            const adjustedX = (normalizedX - stopPosition) / (1 - stopPosition);
            amplitude = 8 * Math.sin(adjustedX * Math.PI * currentArtificial.number) * Math.sin(animationPhase);
          }
        } else {
          amplitude = 0;
        }
        
        const y = STRING_Y + amplitude;
        path += ` L ${x} ${y}`;
      }
    } else {
      path += ` L ${STRING_LEFT_X + STRING_LENGTH} ${STRING_Y}`;
    }
    
    return path;
  };

  const currentFreq = playMode === 'artificial'
    ? calculateArtificialHarmonics()[artificialHarmonicIndex].resultFreq
    : baseFreq * harmonicNumber;
  const noteInfo = freqToNote(currentFreq);
  const harmonicPositions = getHarmonicPositions(harmonicNumber);

  // Generate fret positions for display (36 frets)
  const fretPositions = Array.from({ length: 36 }, (_, i) => {
    const fretDistance = 1 - Math.pow(2, -(i + 1) / 12);
    return fretDistance;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <h1 className="text-3xl font-bold text-amber-900 mb-6">String Harmonic Visualizer</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4 text-amber-800">Select Your Instrument & String</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Instrument</label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(instruments).map(inst => (
              <button
                key={inst}
                onClick={() => changeInstrument(inst)}
                className={`px-4 py-2 rounded ${instrument === inst ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}
              >
                {inst.charAt(0).toUpperCase() + inst.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">String</label>
          <div className="flex gap-2">
            {Object.keys((instruments as any)[instrument]).map((str: string) => (
              <button
                key={str}
                onClick={() => setSelectedString(str)}
                className={`px-4 py-2 rounded ${selectedString === str ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-900 hover:bg-orange-200'}`}
              >
                {str}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              playMode === 'natural' ? 'bg-green-700 text-white hover:bg-green-800' :
              playMode === 'artificial' ? 'bg-blue-700 text-white hover:bg-blue-800' :
              'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {playMode !== 'off' ? <Pause size={20} /> : <Play size={20} />}
            {playMode === 'off' ? 'Play' : playMode === 'natural' ? 'Playing Natural' : 'Playing Artificial'}
          </button>
          <button
            onClick={() => setShowVisualize(!showVisualize)}
            className={`px-4 py-2 rounded ${showVisualize ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-900'}`}
          >
            Visualize: {showVisualize ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowFrets(!showFrets)}
            className={`px-4 py-2 rounded ${showFrets ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-900'}`}
          >
            Frets: {showFrets ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4 text-amber-800">Current Pitch</h2>
        <div className="text-center">
          <div className="text-4xl font-bold text-orange-600">{noteInfo.note}</div>
          <div className="text-xl text-gray-600">{noteInfo.freq.toFixed(4)} Hz</div>
          {Math.abs(noteInfo.cents) > 0.01 && (
            <div className="text-lg text-gray-500">{noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(4)} cents</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4 text-amber-800">String Visualization</h2>
        <svg
          width={STRING_SVG_WIDTH}
          height={STRING_SVG_HEIGHT}
          viewBox={`0 0 ${STRING_SVG_WIDTH} ${STRING_SVG_HEIGHT}`}
          className="mx-auto max-w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {showFrets && fretPositions.map((pos, i) => {
            const noteAtFret = getNoteAtFret(i + 1);
            const isEven = i % 2 === 0;
            const yPos = isEven ? 140 : 18;
            return (
              <g key={i}>
                <line
                  x1={STRING_LEFT_X + pos * STRING_LENGTH}
                  y1={30}
                  x2={STRING_LEFT_X + pos * STRING_LENGTH}
                  y2={120}
                  stroke="#ddd"
                  strokeWidth="1"
                />
                {i < 24 && (
                  <text
                    x={STRING_LEFT_X + pos * STRING_LENGTH}
                    y={yPos}
                    fontSize="8"
                    textAnchor="middle"
                    fill="#999"
                  >
                    {noteAtFret.note.slice(0, -1)}
                  </text>
                )}
              </g>
            );
          })}
          
          <path d={drawString()} stroke="#8B4513" strokeWidth="3" fill="none" />
          
          {fingerPosition === 0 && fingerCents === 0 && harmonicPositions.map((posObj, i) => (
            <g key={i}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={selectedPosition === posObj.position ? '#ff6b6b' : '#ffaaaa'}
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onClick={() => selectPosition(posObj.position)}
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={45}
                fontSize="10"
                textAnchor="middle"
                fill="#666"
              >
                {posObj.numerator}/{posObj.denominator}
              </text>
            </g>
          ))}
          
          {fingerInputMode === 'fret' && fingerPosition > 0 && (
            <rect
              x={STRING_LEFT_X + fretPositions[fingerPosition - 1] * STRING_LENGTH - 3}
              y={STRING_Y - 15}
              width="6"
              height="30"
              fill="#4ecdc4"
            />
          )}
          {fingerInputMode === 'cents' && fingerCents > 0 && (
            <rect
              x={STRING_LEFT_X + (1 - Math.pow(2, -fingerCents / 1200)) * STRING_LENGTH - 3}
              y={STRING_Y - 15}
              width="6"
              height="30"
              fill="#4ecdc4"
            />
          )}
          
          {(fingerPosition > 0 || fingerCents > 0) && getArtificialHarmonicPositions().map((posObj, i) => (
            <g key={`artificial-${i}`}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={artificialHarmonicIndex === i ? '#4ecdc4' : '#aadddd'}
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onClick={() => setArtificialHarmonicIndex(i)}
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={i % 2 === 0 ? STRING_Y + 30 : STRING_Y - 15}
                fontSize="9"
                textAnchor="middle"
                fill="#4ecdc4"
                fontWeight="bold"
              >
                #{posObj.number}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {fingerPosition === 0 && fingerCents === 0 && (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-4 text-amber-800">Natural Harmonics</h2>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={prevHarmonic}
            disabled={harmonicNumber === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
              harmonicNumber === 1 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <ChevronLeft size={20} /> Previous
          </button>
          <button
            onClick={() => {
              setHarmonicNumber(1);
              setSelectedPosition(null);
            }}
            className="px-6 py-3 rounded-lg font-semibold bg-amber-600 text-white hover:bg-amber-700"
          >
            Reset
          </button>
          <button
            onClick={nextHarmonic}
            disabled={harmonicNumber === 16}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
              harmonicNumber === 16 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
        {harmonicNumber === 16 && (
          <div className="text-center text-sm text-gray-600 italic mb-4">
            leave the rest to roman kim...
          </div>
        )}

        <div className="p-4 bg-indigo-50 rounded-lg">
          <div className="text-2xl font-bold text-indigo-900 mb-2">
            Harmonic #{harmonicNumber}: {harmonicNames[harmonicNumber]}
          </div>
          <div className="text-lg text-indigo-700 mb-3">
            Result: {noteInfo.note} ({noteInfo.freq.toFixed(2)} Hz)
            {Math.abs(noteInfo.cents) > 0.01 && (
              <span className="ml-2">
                {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)} cents
              </span>
            )}
          </div>
          <div className="text-md font-semibold mb-3">
            Difficulty: 
            <span className={`ml-2 px-3 py-1 rounded ${
              harmonicNumber <= 4 ? 'bg-green-100 text-green-800' :
              harmonicNumber <= 8 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {harmonicNumber <= 4 ? '🟢 Easy' :
               harmonicNumber <= 8 ? '🟡 Medium' :
               '🔴 Hard'}
            </span>
          </div>
          {harmonicNumber === 1 ? (
            <div className="text-md text-gray-700">
              <strong>Play the open string</strong> (no finger placement needed)
            </div>
          ) : (
            <>
              <div className="text-md text-gray-700">
                <strong>Touch the string lightly at:</strong>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {harmonicPositions.map((posObj, i) => (
                  <button
                    key={i}
                    onClick={() => selectPosition(posObj.position)}
                    className={`px-4 py-2 rounded ${selectedPosition === posObj.position ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  >
                    {posObj.numerator}/{posObj.denominator}
                  </button>
                ))}
              </div>
              {selectedPosition !== null && (() => {
                const posInfo = getPositionInfo(selectedPosition);
                const fretNote = getNoteAtFret(posInfo.nearestFret);
                return (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="font-semibold text-yellow-900 mb-2">Position Guide:</div>
                    <div className="text-sm text-gray-700">
                      <strong>Nearest:</strong> {posInfo.nearestFret === 0 ? 'Open string' : `Fret ${posInfo.nearestFret}`} ({fretNote.note})
                    </div>
                    <div className="text-sm text-gray-700">
                      <strong>Adjustment:</strong> {Math.abs(posInfo.cents) < 0.01 ? 'Exact' : `Play ${posInfo.cents > 0 ? posInfo.cents.toFixed(2) : Math.abs(posInfo.cents).toFixed(2)} cents ${posInfo.cents > 0 ? 'higher' : 'lower'}`}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
      )}

      {playMode !== 'natural' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-amber-800">Artificial Harmonics</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Stop Position Input Mode</label>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setFingerInputMode('fret');
                setFingerCents(0);
              }}
              className={`px-4 py-2 rounded ${fingerInputMode === 'fret' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-900'}`}
            >
              Fret Number
            </button>
            <button
              onClick={() => {
                setFingerInputMode('cents');
                setFingerPosition(0);
              }}
              className={`px-4 py-2 rounded ${fingerInputMode === 'cents' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-900'}`}
            >
              Cents Above Base
            </button>
          </div>
        </div>

        {fingerInputMode === 'fret' ? (
          <>
            <label className="block text-sm font-medium mb-2">
              Stop Position (Fret: 0-12)
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={fingerPosition}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                setFingerPosition(newValue);
                setFingerCents(0);
                if (newValue === 0 && playMode === 'artificial') {
                  stopAudio();
                  setPlayMode('off');
                }
                if (newValue > 0) {
                  setSelectedPosition(null);
                  setHarmonicNumber(1);
                }
              }}
              className="w-full mb-2"
            />
            <div className="text-center mb-4 text-lg font-semibold">
              Fret: {fingerPosition} ({fingerPosition * 100} cents{fingerPosition === 0 ? ', Natural Harmonic!' : ''})
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-2">
              Stop Position (Cents: 0-1200)
            </label>
            <input
              type="range"
              min="0"
              max="1200"
              step="1"
              value={fingerCents}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                setFingerCents(newValue);
                setFingerPosition(0);
                if (newValue === 0 && playMode === 'artificial') {
                  stopAudio();
                  setPlayMode('off');
                }
                if (newValue > 0) {
                  setSelectedPosition(null);
                  setHarmonicNumber(1);
                }
              }}
              className="w-full mb-2"
            />
            <div className="text-center mb-4 text-lg font-semibold">
              {fingerCents} cents ({(fingerCents / 100).toFixed(2)} frets{fingerCents === 0 ? ', Natural Harmonic!' : ''})
            </div>
          </>
        )}
        
        {(fingerPosition > 0 || fingerCents > 0) && (
          <div className="space-y-3">
            {calculateArtificialHarmonics().map((ah, i) => (
              <div 
                key={i} 
                onClick={() => setArtificialHarmonicIndex(i)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  artificialHarmonicIndex === i 
                    ? 'bg-teal-100 border-teal-600 shadow-md' 
                    : 'bg-teal-50 border-teal-200 hover:bg-teal-100'
                }`}
              >
                <div className="font-semibold text-teal-900">
                  Harmonic #{ah.number}: {ah.name}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  Result: {ah.resultNote.note} ({ah.resultNote.freq.toFixed(2)} Hz)
                  {Math.abs(ah.resultNote.cents) > 0.01 && (
                    <span className="ml-1">
                      {ah.resultNote.cents > 0 ? '+' : ''}{ah.resultNote.cents.toFixed(2)} cents
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold">
                  Difficulty: 
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    ah.number === 1 || ah.number === 4 ? 'bg-green-100 text-green-800' :
                    ah.number === 3 || ah.number === 5 ? 'bg-yellow-100 text-yellow-800' :
                    ah.number === 2 ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ah.number === 1 || ah.number === 4 ? '🟢 Easy' :
                     ah.number === 3 || ah.number === 5 ? '🟡 Medium' :
                     ah.number === 2 ? '⚫ Unreachable' :
                     '🔴 Hard'}
                  </span>
                </div>
                {artificialHarmonicIndex === i && ah.number !== 1 && (
                  <div className="text-sm text-gray-600 mt-1 p-2 bg-yellow-50 rounded">
                    <strong>Lightly touch at:</strong> {ah.touchFret === 0 ? 'Open string' : `Fret ${ah.touchFret}`} ({ah.touchNote.note})
                    {Math.abs(ah.touchCents) > 0.01 && `, ${Math.abs(ah.touchCents).toFixed(2)} cents ${ah.touchCents > 0 ? 'higher' : 'lower'}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {(fingerPosition > 0 || fingerCents > 0) && (
          <div className="text-center text-sm text-gray-600 italic mt-4">
            leave the rest to roman kim...
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default StringHarmonicVisualizer;