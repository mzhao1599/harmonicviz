import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  INSTRUMENT_STRINGS,
  artificialHarmonics,
  centsToPosition,
  frequencyToNote,
  naturalTouchPoints,
  openStringFrequency,
  type InstrumentId,
} from './lib/music';
import type { FingerInputMode, PlayMode } from './types';
import { InstrumentPicker } from './components/InstrumentPicker';
import { Controls } from './components/Controls';
import { PitchDisplay } from './components/PitchDisplay';
import { StringDiagram } from './components/StringDiagram';
import { NaturalHarmonicsPanel } from './components/NaturalHarmonicsPanel';
import { ArtificialHarmonicsPanel } from './components/ArtificialHarmonicsPanel';

export default function App() {
  const [instrument, setInstrument] = useState<InstrumentId>('violin');
  const [selectedString, setSelectedString] = useState('G3');
  const [playMode, setPlayMode] = useState<PlayMode>('off');
  const [showVisualize, setShowVisualize] = useState(true);
  const [showFrets, setShowFrets] = useState(true);
  const [harmonicNumber, setHarmonicNumber] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [artificialHarmonicIndex, setArtificialHarmonicIndex] = useState(0);
  const [fingerPosition, setFingerPosition] = useState(0);
  const [fingerCents, setFingerCents] = useState(0);
  const [fingerInputMode, setFingerInputMode] = useState<FingerInputMode>('fret');
  const [animationPhase, setAnimationPhase] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const openFreq = openStringFrequency(instrument, selectedString);
  const centsAboveOpen = fingerInputMode === 'fret' ? fingerPosition * 100 : fingerCents;
  const isArtificial = centsAboveOpen > 0;
  const stopPosition = centsToPosition(centsAboveOpen);
  const artificial = artificialHarmonics(openFreq, centsAboveOpen);
  const naturalPoints = naturalTouchPoints(harmonicNumber);

  const currentFreq = playMode === 'artificial'
    ? artificial[artificialHarmonicIndex].resultFreq
    : openFreq * harmonicNumber;
  const noteInfo = frequencyToNote(currentFreq);

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

  const playTone = (freq: number) => {
    stopAudio();
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    audioContextRef.current = ctx;
    oscillatorRef.current = oscillator;
  };

  useEffect(() => {
    if (playMode === 'natural') {
      playTone(openFreq * harmonicNumber);
    } else if (playMode === 'artificial') {
      if (isArtificial) {
        playTone(artificial[artificialHarmonicIndex].resultFreq);
      } else {
        stopAudio();
        setPlayMode('off');
      }
    }
  }, [harmonicNumber, selectedPosition, selectedString, instrument, artificialHarmonicIndex, fingerPosition, fingerCents, fingerInputMode, playMode]);

  useEffect(() => {
    if (playMode !== 'off' && showVisualize) {
      const interval = setInterval(() => {
        setAnimationPhase(p => (p + 0.1) % (Math.PI * 2));
      }, 16);
      return () => clearInterval(interval);
    }
  }, [playMode, showVisualize]);

  useEffect(() => stopAudio, []);

  const togglePlay = () => {
    if (playMode !== 'off') {
      stopAudio();
      setPlayMode('off');
    } else {
      setPlayMode(isArtificial ? 'artificial' : 'natural');
    }
  };

  const changeInstrument = (inst: InstrumentId) => {
    setInstrument(inst);
    setSelectedString(INSTRUMENT_STRINGS[inst][0]);
  };

  const changeHarmonic = (n: number) => {
    setHarmonicNumber(n);
    setSelectedPosition(null);
  };

  const changeInputMode = (mode: FingerInputMode) => {
    setFingerInputMode(mode);
    if (mode === 'fret') setFingerCents(0);
    else setFingerPosition(0);
  };

  const changeStop = (value: number) => {
    if (fingerInputMode === 'fret') {
      setFingerPosition(value);
      setFingerCents(0);
    } else {
      setFingerCents(value);
      setFingerPosition(0);
    }
    if (value === 0 && playMode === 'artificial') {
      stopAudio();
      setPlayMode('off');
    }
    if (value > 0) {
      setSelectedPosition(null);
      setHarmonicNumber(1);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '0.08em', color: '#e0d8c8', margin: 0 }}>
          Harmonic<span style={{ color: '#c9a84c', fontWeight: 600 }}>Viz</span>
        </h1>
        <p style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#5a534e',
          marginTop: '0.25rem',
        }}>
          String Harmonic Visualizer
        </p>
      </header>

      <InstrumentPicker
        instrument={instrument}
        selectedString={selectedString}
        onInstrumentChange={changeInstrument}
        onStringChange={setSelectedString}
      />

      <Controls
        playMode={playMode}
        onTogglePlay={togglePlay}
        showVisualize={showVisualize}
        onToggleVisualize={() => setShowVisualize(v => !v)}
        showFrets={showFrets}
        onToggleFrets={() => setShowFrets(v => !v)}
      />

      <PitchDisplay noteInfo={noteInfo} />

      <StringDiagram
        openFreq={openFreq}
        playMode={playMode}
        showVisualize={showVisualize}
        showFrets={showFrets}
        harmonicNumber={harmonicNumber}
        animationPhase={animationPhase}
        stopPosition={stopPosition}
        naturalPoints={naturalPoints}
        selectedPosition={selectedPosition}
        onSelectPosition={setSelectedPosition}
        artificialPositions={isArtificial ? artificial.map(h => h.position) : []}
        artificialIndex={artificialHarmonicIndex}
        onSelectArtificial={setArtificialHarmonicIndex}
      />

      {!isArtificial && (
        <NaturalHarmonicsPanel
          openFreq={openFreq}
          harmonicNumber={harmonicNumber}
          noteInfo={noteInfo}
          touchPoints={naturalPoints}
          selectedPosition={selectedPosition}
          onSelectPosition={setSelectedPosition}
          onHarmonicChange={changeHarmonic}
        />
      )}

      {playMode !== 'natural' && (
        <ArtificialHarmonicsPanel
          inputMode={fingerInputMode}
          onInputModeChange={changeInputMode}
          fret={fingerPosition}
          cents={fingerCents}
          onStopChange={changeStop}
          harmonics={artificial}
          selectedIndex={artificialHarmonicIndex}
          onSelect={setArtificialHarmonicIndex}
        />
      )}
    </div>
  );
}
