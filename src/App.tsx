import { useState, useEffect, useMemo, useRef } from 'react';
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
import { partialAmplitudes, stringModes } from './lib/timbre';
import type { FingerInputMode, ListenMode, PlayMode } from './types';
import { ToneEngine } from './audio/ToneEngine';
import { InstrumentPicker } from './components/InstrumentPicker';
import { Controls } from './components/Controls';
import { PitchDisplay } from './components/PitchDisplay';
import { StringDiagram } from './components/StringDiagram';
import { NaturalHarmonicsPanel } from './components/NaturalHarmonicsPanel';
import { ArtificialHarmonicsPanel } from './components/ArtificialHarmonicsPanel';
import { SpectrumChart } from './components/SpectrumChart';

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
  const [listen, setListen] = useState<ListenMode>('touched');

  const engineRef = useRef<ToneEngine | null>(null);
  const engine = () => (engineRef.current ??= new ToneEngine());

  const openFreq = openStringFrequency(instrument, selectedString);
  const centsAboveOpen = fingerInputMode === 'fret' ? fingerPosition * 100 : fingerCents;
  const isArtificial = centsAboveOpen > 0;
  const stopPosition = centsToPosition(centsAboveOpen);
  const artificial = artificialHarmonics(openFreq, centsAboveOpen);
  const naturalPoints = naturalTouchPoints(harmonicNumber);

  const currentFreq = isArtificial
    ? artificial[artificialHarmonicIndex].resultFreq
    : openFreq * harmonicNumber;
  const noteInfo = frequencyToNote(currentFreq);

  // The vibrating length is the whole string, or the part between the stopping
  // finger and the bridge. Touch points are fractions of that length.
  const vibratingF0 = isArtificial ? artificial[0].resultFreq : openFreq;
  const touch = isArtificial
    ? (artificialHarmonicIndex === 0 ? null : 1 / (artificialHarmonicIndex + 1))
    : (harmonicNumber === 1 ? null : selectedPosition ?? 1 / harmonicNumber);
  const touchLabel = isArtificial
    ? `the node for #${artificialHarmonicIndex + 1}`
    : selectedPosition === null
      ? `1/${harmonicNumber} of the string`
      : `${naturalPoints.find(p => p.position === selectedPosition)?.numerator ?? 1}/${harmonicNumber} of the string`;

  const modes = useMemo(() => stringModes({ f0: vibratingF0, touch }), [vibratingF0, touch]);
  const heard = touch !== null && listen === 'open' ? 'open' : 'touched';

  const heardModes = useMemo(
    () => (heard === 'open' ? modes : modes.filter(m => m.survives)),
    [heard, modes],
  );

  // What should be sounding right now, or null for silence.
  const partials = useMemo(
    () => (playMode === 'off' ? null : partialAmplitudes(heardModes.map(m => ({ ...m, survives: true })))),
    [playMode, heardModes],
  );

  useEffect(() => {
    if (partials === null) engine().stop();
    else engine().play(partials);
  }, [partials]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const stopPlaying = () => setPlayMode('off');

  const togglePlay = () => {
    if (playMode !== 'off') {
      stopPlaying();
    } else {
      engine().unlock();
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
    // Switching modes resets the stop to 0, which ends an artificial harmonic.
    if (playMode === 'artificial') stopPlaying();
  };

  const changeStop = (value: number) => {
    if (fingerInputMode === 'fret') {
      setFingerPosition(value);
      setFingerCents(0);
    } else {
      setFingerCents(value);
      setFingerPosition(0);
    }
    if (value === 0 && playMode === 'artificial') stopPlaying();
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
        waveModes={heardModes}
        stopPosition={stopPosition}
        naturalPoints={naturalPoints}
        selectedPosition={selectedPosition}
        onSelectPosition={setSelectedPosition}
        artificialPositions={isArtificial ? artificial.map(h => h.position) : []}
        artificialIndex={artificialHarmonicIndex}
        onSelectArtificial={setArtificialHarmonicIndex}
      />

      <SpectrumChart
        modes={modes}
        touched={touch !== null}
        touchLabel={touchLabel}
        untouchedLabel={isArtificial ? 'Stopped, no touch' : 'Open string'}
        listen={heard}
        onListenChange={setListen}
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
