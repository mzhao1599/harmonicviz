import { useState, useEffect, useRef } from 'react';
import './App.css';
import { Play, Pause, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

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
    const noteName = note.slice(0, -1);
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

  const getHarmonicPositions = (n: number) => {
    if (n === 1) return [];
    const positions = [];
    for (let i = 1; i < n; i++) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      if (gcd(i, n) === 1) {
        positions.push({ position: i / n, numerator: i, denominator: n });
      }
    }
    return positions;
  };

  const getNoteAtFret = (fretNumber: number) => {
    const freq = baseFreq * Math.pow(2, fretNumber / 12);
    return freqToNote(freq);
  };

  const getPositionInfo = (position: number) => {
    const maxFrets = 48;
    const extendedFretPositions = Array.from({ length: maxFrets }, (_, i) => {
      return 1 - Math.pow(2, -(i + 1) / 12);
    });
    
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
    
    if (position < extendedFretPositions[0]) {
      upperFret = 1;
      upperFretPos = extendedFretPositions[0];
    }
    
    const centsFromLower = 1200 * Math.log2((1 - lowerFretPos) / (1 - position));
    const centsFromUpper = 1200 * Math.log2((1 - upperFretPos) / (1 - position));
    
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

  const fretPositions = Array.from({ length: 36 }, (_, i) => {
    const fretDistance = 1 - Math.pow(2, -(i + 1) / 12);
    return fretDistance;
  });

  const getDifficultyBadge = (level: 'easy' | 'medium' | 'hard') => {
    const labels = { easy: 'pp', medium: 'mf', hard: 'ff' };
    return <span className={`badge badge-${level}`}>{labels[level]}</span>;
  };

  const getArtificialDifficultyBadge = (num: number) => {
    if (num === 2) return <span className="badge badge-unreachable">—</span>;
    if (num === 1 || num === 4) return getDifficultyBadge('easy');
    if (num === 3 || num === 5) return getDifficultyBadge('medium');
    return getDifficultyBadge('hard');
  };

  const getArtificialDifficultyLabel = (num: number) => {
    if (num === 2) return 'Unreachable';
    if (num === 1 || num === 4) return 'Easy';
    if (num === 3 || num === 5) return 'Medium';
    return 'Hard';
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ─── Header ─────────────────────────────────────── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 300,
          letterSpacing: '0.08em',
          color: '#e0d8c8',
          margin: 0,
        }}>
          Harmonic<span style={{ color: '#c9a84c', fontWeight: 600 }}>Viz</span>
        </h1>
        <p style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: '#5a534e',
          marginTop: '0.25rem',
        }}>
          String Harmonic Visualizer
        </p>
      </header>

      {/* ─── Instrument & String ────────────────────────── */}
      <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div>
            <div className="section-label">Instrument</div>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {Object.keys(instruments).map(inst => (
                <button
                  key={inst}
                  onClick={() => changeInstrument(inst)}
                  className={`btn btn-ghost ${instrument === inst ? 'active' : ''}`}
                >
                  {inst.charAt(0).toUpperCase() + inst.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="section-label">String</div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {Object.keys((instruments as any)[instrument]).map((str: string) => (
                <button
                  key={str}
                  onClick={() => setSelectedString(str)}
                  className={`btn btn-ghost font-mono ${selectedString === str ? 'active' : ''}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: '3rem' }}
                >
                  {str}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Controls ───────────────────────────────────── */}
      <section className="card-glass" style={{ padding: '1rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={togglePlay}
            className={`btn ${playMode !== 'off' ? 'btn-playing' : 'btn-primary'}`}
          >
            {playMode !== 'off' ? <Pause size={16} /> : <Play size={16} />}
            {playMode === 'off' ? 'Play' : playMode === 'natural' ? 'Natural' : 'Artificial'}
          </button>

          <div style={{ width: '1px', height: '1.5rem', background: 'rgba(255,255,255,0.06)' }} />

          <button
            onClick={() => setShowVisualize(!showVisualize)}
            className={`toggle-pill ${showVisualize ? 'on' : ''}`}
          >
            <span className="dot" />
            Visualize
          </button>

          <button
            onClick={() => setShowFrets(!showFrets)}
            className={`toggle-pill ${showFrets ? 'on' : ''}`}
          >
            <span className="dot" />
            Frets
          </button>
        </div>
      </section>

      {/* ─── Current Pitch ──────────────────────────────── */}
      <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div className="section-label">Current Pitch</div>
        <div className="pitch-note">{noteInfo.note}</div>
        <div className="pitch-freq" style={{ marginTop: '0.5rem' }}>{noteInfo.freq.toFixed(4)} Hz</div>
        {Math.abs(noteInfo.cents) > 0.01 && (
          <div className="pitch-cents" style={{ marginTop: '0.25rem' }}>
            {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(4)} cents
          </div>
        )}
      </section>

      {/* ─── String Visualization ───────────────────────── */}
      <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div className="section-label">String</div>
        <svg
          width={STRING_SVG_WIDTH}
          height={STRING_SVG_HEIGHT}
          viewBox={`0 0 ${STRING_SVG_WIDTH} ${STRING_SVG_HEIGHT}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="stringGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Fret lines */}
          {showFrets && fretPositions.map((pos, i) => {
            const noteAtFret = getNoteAtFret(i + 1);
            const isEven = i % 2 === 0;
            const yPos = isEven ? 142 : 16;
            return (
              <g key={i}>
                <line
                  x1={STRING_LEFT_X + pos * STRING_LENGTH}
                  y1={30}
                  x2={STRING_LEFT_X + pos * STRING_LENGTH}
                  y2={120}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                {i < 24 && (
                  <text
                    x={STRING_LEFT_X + pos * STRING_LENGTH}
                    y={yPos}
                    fontSize="7"
                    fontFamily="'JetBrains Mono', monospace"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.18)"
                  >
                    {noteAtFret.note.slice(0, -1)}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* String */}
          <path
            d={drawString()}
            stroke="#c9a84c"
            strokeWidth="2.5"
            fill="none"
            filter={playMode !== 'off' && showVisualize ? 'url(#stringGlow)' : undefined}
            style={{ transition: 'stroke 0.3s ease' }}
          />
          
          {/* Natural harmonic nodes */}
          {fingerPosition === 0 && fingerCents === 0 && harmonicPositions.map((posObj, i) => (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => selectPosition(posObj.position)}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={selectedPosition === posObj.position ? '#c9a84c' : 'rgba(201,168,76,0.25)'}
                stroke={selectedPosition === posObj.position ? '#e0c876' : 'rgba(201,168,76,0.4)'}
                strokeWidth="1.5"
                style={{ transition: 'all 0.2s ease' }}
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={45}
                fontSize="9"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
                fill="rgba(201,168,76,0.6)"
              >
                {posObj.numerator}/{posObj.denominator}
              </text>
            </g>
          ))}
          
          {/* Stopped finger position */}
          {fingerInputMode === 'fret' && fingerPosition > 0 && (
            <rect
              x={STRING_LEFT_X + fretPositions[fingerPosition - 1] * STRING_LENGTH - 2.5}
              y={STRING_Y - 14}
              width="5"
              height="28"
              rx="2"
              fill="#c9a84c"
              opacity="0.8"
            />
          )}
          {fingerInputMode === 'cents' && fingerCents > 0 && (
            <rect
              x={STRING_LEFT_X + (1 - Math.pow(2, -fingerCents / 1200)) * STRING_LENGTH - 2.5}
              y={STRING_Y - 14}
              width="5"
              height="28"
              rx="2"
              fill="#c9a84c"
              opacity="0.8"
            />
          )}
          
          {/* Artificial harmonic nodes */}
          {(fingerPosition > 0 || fingerCents > 0) && getArtificialHarmonicPositions().map((posObj, i) => (
            <g key={`artificial-${i}`} style={{ cursor: 'pointer' }} onClick={() => setArtificialHarmonicIndex(i)}>
              <circle
                cx={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                cy={STRING_Y}
                r="7"
                fill={artificialHarmonicIndex === i ? '#c9a84c' : 'rgba(201,168,76,0.2)'}
                stroke={artificialHarmonicIndex === i ? '#e0c876' : 'rgba(201,168,76,0.3)'}
                strokeWidth="1.5"
                style={{ transition: 'all 0.2s ease' }}
              />
              <text
                x={STRING_LEFT_X + posObj.position * STRING_LENGTH}
                y={i % 2 === 0 ? STRING_Y + 28 : STRING_Y - 14}
                fontSize="8"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
                fill={artificialHarmonicIndex === i ? '#c9a84c' : 'rgba(201,168,76,0.45)'}
                fontWeight="600"
              >
                #{posObj.number}
              </text>
            </g>
          ))}
        </svg>
      </section>

      {/* ─── Natural Harmonics ──────────────────────────── */}
      {fingerPosition === 0 && fingerCents === 0 && (
        <section className="card-glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div className="section-label">Natural Harmonics</div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button
              onClick={prevHarmonic}
              className={`btn btn-ghost btn-icon ${harmonicNumber === 1 ? 'btn-disabled' : ''}`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                setHarmonicNumber(1);
                setSelectedPosition(null);
              }}
              className="btn btn-ghost btn-icon"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={nextHarmonic}
              className={`btn btn-ghost btn-icon ${harmonicNumber === 16 ? 'btn-disabled' : ''}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {harmonicNumber === 16 && (
            <div className="easter-egg">leave the rest to roman kim...</div>
          )}

          {/* Info panel */}
          <div style={{
            padding: '1.25rem',
            borderRadius: '10px',
            background: 'rgba(201, 168, 76, 0.04)',
            border: '1px solid rgba(201, 168, 76, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#c9a84c',
              }}>
                #{harmonicNumber}
              </span>
              <span style={{ fontSize: '0.9375rem', color: '#e0d8c8' }}>
                {harmonicNames[harmonicNumber]}
              </span>
            </div>

            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8125rem',
              color: '#9a9088',
              marginBottom: '0.75rem',
            }}>
              {noteInfo.note} · {noteInfo.freq.toFixed(2)} Hz
              {Math.abs(noteInfo.cents) > 0.01 && (
                <span style={{ marginLeft: '0.5rem', color: '#6b6460' }}>
                  {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)}¢
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              {harmonicNumber <= 4
                ? getDifficultyBadge('easy')
                : harmonicNumber <= 8
                ? getDifficultyBadge('medium')
                : getDifficultyBadge('hard')
              }
              <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>
                {harmonicNumber <= 4 ? 'Easy' : harmonicNumber <= 8 ? 'Medium' : 'Hard'}
              </span>
            </div>

            {harmonicNumber === 1 ? (
              <div style={{ fontSize: '0.8125rem', color: '#9a9088' }}>
                Play the open string — no finger placement needed.
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.8125rem', color: '#9a9088', marginBottom: '0.5rem' }}>
                  Touch the string lightly at:
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {harmonicPositions.map((posObj, i) => (
                    <button
                      key={i}
                      onClick={() => selectPosition(posObj.position)}
                      className={`btn btn-sm font-mono ${selectedPosition === posObj.position ? 'btn-ghost active' : 'btn-ghost'}`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {posObj.numerator}/{posObj.denominator}
                    </button>
                  ))}
                </div>

                {selectedPosition !== null && (() => {
                  const posInfo = getPositionInfo(selectedPosition);
                  const fretNote = getNoteAtFret(posInfo.nearestFret);
                  return (
                    <div className="guide-box" style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#e0d8c8', marginBottom: '0.375rem' }}>
                        <span style={{ color: '#6b6460' }}>Nearest:</span>{' '}
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {posInfo.nearestFret === 0 ? 'Open string' : `Fret ${posInfo.nearestFret}`}
                        </span>
                        {' '}
                        <span style={{ color: '#9a9088' }}>({fretNote.note})</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#e0d8c8' }}>
                        <span style={{ color: '#6b6460' }}>Adjustment:</span>{' '}
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {Math.abs(posInfo.cents) < 0.01
                            ? 'Exact'
                            : `${posInfo.cents > 0 ? posInfo.cents.toFixed(2) : Math.abs(posInfo.cents).toFixed(2)}¢ ${posInfo.cents > 0 ? 'higher' : 'lower'}`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </section>
      )}

      {/* ─── Artificial Harmonics ───────────────────────── */}
      {playMode !== 'natural' && (
        <section className="card-glass" style={{ padding: '1.5rem' }}>
          <div className="section-label">Artificial Harmonics</div>
        
          {/* Input mode toggle */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b6460', marginBottom: '0.5rem' }}>Stop Position</div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={() => {
                  setFingerInputMode('fret');
                  setFingerCents(0);
                }}
                className={`btn btn-sm btn-ghost ${fingerInputMode === 'fret' ? 'active' : ''}`}
              >
                Fret Number
              </button>
              <button
                onClick={() => {
                  setFingerInputMode('cents');
                  setFingerPosition(0);
                }}
                className={`btn btn-sm btn-ghost ${fingerInputMode === 'cents' ? 'active' : ''}`}
              >
                Cents Above Base
              </button>
            </div>
          </div>

          {/* Slider */}
          {fingerInputMode === 'fret' ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>Fret: 0–12</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: fingerPosition === 0 ? '#c9a84c' : '#e0d8c8'
                }}>
                  {fingerPosition}{' '}
                  <span style={{ fontSize: '0.75rem', color: '#6b6460', fontWeight: 400 }}>
                    ({fingerPosition * 100}¢{fingerPosition === 0 ? ' · Natural' : ''})
                  </span>
                </span>
              </div>
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
              />
            </div>
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b6460' }}>Cents: 0–1200</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: fingerCents === 0 ? '#c9a84c' : '#e0d8c8'
                }}>
                  {fingerCents}¢{' '}
                  <span style={{ fontSize: '0.75rem', color: '#6b6460', fontWeight: 400 }}>
                    ({(fingerCents / 100).toFixed(2)} frets{fingerCents === 0 ? ' · Natural' : ''})
                  </span>
                </span>
              </div>
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
              />
            </div>
          )}
        
          {/* Artificial harmonic list */}
          {(fingerPosition > 0 || fingerCents > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {calculateArtificialHarmonics().map((ah, i) => (
                <div 
                  key={i} 
                  onClick={() => setArtificialHarmonicIndex(i)}
                  className={`harmonic-card ${artificialHarmonicIndex === i ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: artificialHarmonicIndex === i ? '#c9a84c' : '#9a9088',
                      }}>
                        #{ah.number}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: '#e0d8c8' }}>
                        {ah.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getArtificialDifficultyBadge(ah.number)}
                      <span style={{ fontSize: '0.6875rem', color: '#5a534e' }}>
                        {getArtificialDifficultyLabel(ah.number)}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.75rem',
                    color: '#6b6460',
                    marginTop: '0.25rem',
                  }}>
                    {ah.resultNote.note} · {ah.resultNote.freq.toFixed(2)} Hz
                    {Math.abs(ah.resultNote.cents) > 0.01 && (
                      <span style={{ marginLeft: '0.375rem' }}>
                        {ah.resultNote.cents > 0 ? '+' : ''}{ah.resultNote.cents.toFixed(2)}¢
                      </span>
                    )}
                  </div>

                  {artificialHarmonicIndex === i && ah.number !== 1 && (
                    <div className="guide-box" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#6b6460' }}>Touch at:</span>{' '}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e0d8c8' }}>
                        {ah.touchFret === 0 ? 'Open string' : `Fret ${ah.touchFret}`}
                      </span>
                      {' '}
                      <span style={{ color: '#9a9088' }}>({ah.touchNote.note})</span>
                      {Math.abs(ah.touchCents) > 0.01 && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#6b6460', marginLeft: '0.25rem' }}>
                          {Math.abs(ah.touchCents).toFixed(2)}¢ {ah.touchCents > 0 ? 'higher' : 'lower'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(fingerPosition > 0 || fingerCents > 0) && (
            <div className="easter-egg">leave the rest to roman kim...</div>
          )}
        </section>
      )}
    </div>
  );
};

export default StringHarmonicVisualizer;