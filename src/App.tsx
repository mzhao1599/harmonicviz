import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import {
  INSTRUMENT_STRINGS,
  artificialHarmonics,
  centsToPosition,
  frequencyToNote,
  naturalTouchPoints,
  noteToFrequency,
  openStringFrequency,
  type InstrumentId,
} from './lib/music';
import {
  STIFF_STRING_B,
  STIFF_STRING_INSTRUMENTS,
  formatB,
  harmonicFrequency,
  inharmonicityCents,
  partialAmplitudes,
  stringModes,
  vibratingLength,
} from './lib/timbre';
import { decodeState, encodeState } from './lib/urlState';
import type { FingerInputMode, ListenMode, PlayMode } from './types';
import { ToneEngine } from './audio/ToneEngine';
import { InstrumentPicker } from './components/InstrumentPicker';
import { Controls } from './components/Controls';
import { PitchDisplay } from './components/PitchDisplay';
import { StringDiagram } from './components/StringDiagram';
import { NaturalHarmonicsPanel } from './components/NaturalHarmonicsPanel';
import { ArtificialHarmonicsPanel } from './components/ArtificialHarmonicsPanel';
import { SpectrumChart } from './components/SpectrumChart';
import { HeroStrings } from './components/HeroStrings';
import { HarmonicContext } from './harmonicContext';

export default function App() {
  // The instrument, string, harmonic and stop come from the URL, so links can be shared.
  const [initial] = useState(() => decodeState(window.location.search));
  const [instrument, setInstrument] = useState<InstrumentId>(initial.instrument);
  const [selectedString, setSelectedString] = useState(initial.string);
  const [playMode, setPlayMode] = useState<PlayMode>('off');
  const [showVisualize, setShowVisualize] = useState(true);
  const [showFrets, setShowFrets] = useState(true);
  const [harmonicNumber, setHarmonicNumber] = useState(initial.harmonic);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(
    initial.touch === null ? null : initial.touch / initial.harmonic,
  );
  const [artificialHarmonicIndex, setArtificialHarmonicIndex] = useState(initial.artificial - 1);
  const [fingerPosition, setFingerPosition] = useState(initial.stopMode === 'fret' ? initial.stop : 0);
  const [fingerCents, setFingerCents] = useState(initial.stopMode === 'cents' ? initial.stop : 0);
  const [fingerInputMode, setFingerInputMode] = useState<FingerInputMode>(initial.stopMode);
  const [listen, setListen] = useState<ListenMode>('touched');
  const [stiff, setStiff] = useState(initial.stiff);

  const engineRef = useRef<ToneEngine | null>(null);
  const engine = () => (engineRef.current ??= new ToneEngine());

  const openFreq = openStringFrequency(instrument, selectedString);
  const heroStrings = useMemo(
    () => INSTRUMENT_STRINGS[instrument].map(name => ({ name, freq: noteToFrequency(name) ?? 196 })),
    [instrument],
  );
  const centsAboveOpen = fingerInputMode === 'fret' ? fingerPosition * 100 : fingerCents;
  const isArtificial = centsAboveOpen > 0;
  const stopPosition = centsToPosition(centsAboveOpen);
  const naturalPoints = naturalTouchPoints(harmonicNumber);

  // Stiff-string model: B > 0 sharpens every harmonic above the first.
  const stiffAvailable = STIFF_STRING_INSTRUMENTS.includes(instrument);
  const B = stiff && stiffAvailable ? STIFF_STRING_B : 0;
  const idealArtificial = artificialHarmonics(openFreq, centsAboveOpen);
  const artificial = B === 0 ? idealArtificial : idealArtificial.map(h => {
    const resultFreq = harmonicFrequency(openFreq, h.number, B, stopPosition);
    return { ...h, resultFreq, resultNote: frequencyToNote(resultFreq) };
  });

  const currentHarmonic = isArtificial ? artificialHarmonicIndex + 1 : harmonicNumber;
  const idealFreq = isArtificial ? idealArtificial[artificialHarmonicIndex].resultFreq : openFreq * harmonicNumber;
  const currentFreq = B === 0 ? idealFreq : harmonicFrequency(openFreq, currentHarmonic, B, stopPosition);
  const noteInfo = frequencyToNote(currentFreq);

  // The vibrating length is the whole string, or the part between the stopping
  // finger and the bridge. Touch points are fractions of that length.
  const segment = vibratingLength(openFreq, stopPosition, B);
  const touch = isArtificial
    ? (artificialHarmonicIndex === 0 ? null : 1 / (artificialHarmonicIndex + 1))
    : (harmonicNumber === 1 ? null : selectedPosition ?? 1 / harmonicNumber);
  const touchLabel = isArtificial
    ? `the node for #${artificialHarmonicIndex + 1}`
    : selectedPosition === null
      ? `1/${harmonicNumber} of the string`
      : `${naturalPoints.find(p => p.position === selectedPosition)?.numerator ?? 1}/${harmonicNumber} of the string`;

  const modes = useMemo(
    () => stringModes({ f0: segment.f0, B: segment.B, touch }),
    [segment.f0, segment.B, touch],
  );
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

  const shareQuery = encodeState({
    instrument,
    string: selectedString,
    harmonic: harmonicNumber,
    touch: naturalPoints.find(p => p.position === selectedPosition)?.numerator ?? null,
    stopMode: fingerInputMode,
    stop: fingerInputMode === 'fret' ? fingerPosition : fingerCents,
    artificial: artificialHarmonicIndex + 1,
    stiff,
  });

  useEffect(() => {
    const { pathname, hash } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}?${shareQuery}${hash}`);
  }, [shareQuery]);

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

  const stopLabel = fingerInputMode === 'fret' ? `semitone ${fingerPosition}` : `${fingerCents}¢`;
  const pitchContext = isArtificial
    ? `Artificial #${currentHarmonic} · ${selectedString} stopped at ${stopLabel}`
    : `Harmonic #${harmonicNumber} of the ${selectedString} string`;

  return (
    <HarmonicContext.Provider value={currentHarmonic}>
      <main className="layout">
        <header className="card hero">
          <div className="hero-top">
            <div>
              <h1 className="wordmark">Harmonic<em>Viz</em></h1>
              <p className="tagline">Natural and artificial harmonics on violin, viola, cello and double bass.</p>
            </div>
            <p className="hero-note">
              <span className="for-mouse"><b>Rest the pointer on a string</b> to touch it lightly, then <b>click to pluck</b></span>
              <span className="for-touch"><b>Hold a finger on a string</b> to touch it lightly; <b>each tap plucks</b></span>{' '}
              near the bridge: only modes with a node under the finger keep ringing (extra damping ∝ sin²(kπx)).
              The open strings also ring in sympathy with what you play.
            </p>
          </div>
          <HeroStrings strings={heroStrings} selected={selectedString} onSelect={setSelectedString} sounding={partials} />
        </header>

        <section className="card toolbar" aria-label="Instrument, string and view options">
          <InstrumentPicker
            instrument={instrument}
            selectedString={selectedString}
            onInstrumentChange={changeInstrument}
            onStringChange={setSelectedString}
          />
          <Controls
            showVisualize={showVisualize}
            onToggleVisualize={() => setShowVisualize(v => !v)}
            showFrets={showFrets}
            onToggleFrets={() => setShowFrets(v => !v)}
            stiff={stiffAvailable ? { on: stiff, B: formatB(STIFF_STRING_B), onToggle: () => setStiff(v => !v) } : null}
          />
        </section>

        <PitchDisplay
          noteInfo={noteInfo}
          stiffCents={B === 0 ? null : 1200 * Math.log2(currentFreq / idealFreq)}
          context={pitchContext}
          playMode={playMode}
          onTogglePlay={togglePlay}
        />

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

        <div className="columns">
          <div className="stack">
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

          <SpectrumChart
            modes={modes}
            touched={touch !== null}
            touchLabel={touchLabel}
            untouchedLabel={isArtificial ? 'Stopped, no touch' : 'Open string'}
            listen={heard}
            onListenChange={setListen}
            stiffNote={B === 0 ? null : `Stiff string, B = ${formatB(segment.B)}${isArtificial ? ' for the stopped length (B scales as 1/L²)' : ''} (an illustrative value): f_k = k·f₀·√(1 + B·k²), so mode ${modes[modes.length - 1].k} is ${inharmonicityCents(modes[modes.length - 1].k, segment.B).toFixed(1)}¢ sharp of ${modes[modes.length - 1].k}× the fundamental.`}
          />
        </div>

        <footer className="footer">
          Equal temperament from A4 = 440 Hz · ideal-string model ·{' '}
          <a href="https://github.com/mzhao1599/harmonicviz">source and formulas</a>
        </footer>
      </main>
    </HarmonicContext.Provider>
  );
}
