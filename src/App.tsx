import { useState, useEffect, useRef } from 'react';
import { InstrumentSelector } from './components/InstrumentSelector';
import { StringSelector } from './components/StringSelector';
import { HarmonicControls } from './components/HarmonicControls';
import { Visualizer } from './components/Visualizer';
import { HarmonicInfo } from './components/HarmonicInfo';
import { ArtificialHarmonics } from './components/ArtificialHarmonics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  instruments,
  harmonicNames,
  freqToNote,
  calculateArtificialHarmonics,
  getHarmonicPositions
} from '@/lib/music-utils';

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

  const baseFreq = instruments[instrument]?.[selectedString] || 196;

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

  const playNote = () => {
    stopAudio();

    if (!baseFreq) return;

    const freq = baseFreq * harmonicNumber;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
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
    
    if (!baseFreq) return;

    const artificialHarmonics = calculateArtificialHarmonics(baseFreq, fingerInputMode, fingerPosition, fingerCents);
    const currentArtificial = artificialHarmonics[artificialHarmonicIndex];
    if (!currentArtificial) return;

    const freq = currentArtificial.resultFreq;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainNodeRef.current = audioContextRef.current.createGain();
    
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
    gainNodeRef.current.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);

    oscillatorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContextRef.current.destination);
    oscillatorRef.current.start();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harmonicNumber, selectedPosition, selectedString, instrument, artificialHarmonicIndex, fingerPosition, fingerCents, fingerInputMode, playMode]);


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

  const resetHarmonic = () => {
    setHarmonicNumber(1);
    setSelectedPosition(null);
  };

  const selectPosition = (position: number | null) => {
    setSelectedPosition(position);
  };

  const changeInstrument = (inst: string) => {
    setInstrument(inst);
    setSelectedString(Object.keys(instruments[inst])[0]);
  };

  const currentFreq = playMode === 'artificial' && baseFreq
    ? calculateArtificialHarmonics(baseFreq, fingerInputMode, fingerPosition, fingerCents)[artificialHarmonicIndex]?.resultFreq || baseFreq
    : (baseFreq || 196) * harmonicNumber;
  const noteInfo = freqToNote(currentFreq);
  const harmonicPositions = getHarmonicPositions(harmonicNumber);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary">String Harmonic Visualizer</h1>
          <p className="text-muted-foreground">Explore natural and artificial harmonics on string instruments.</p>
        </div>

        <Card className="shadow-lg border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Instrument Setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <InstrumentSelector
                instruments={Object.keys(instruments)}
                selectedInstrument={instrument}
                onSelect={changeInstrument}
              />
              <StringSelector
                strings={Object.keys(instruments[instrument] || {})}
                selectedString={selectedString}
                onSelect={setSelectedString}
              />
            </div>
            <HarmonicControls
              playMode={playMode}
              showVisualize={showVisualize}
              showFrets={showFrets}
              onTogglePlay={togglePlay}
              onToggleVisualize={() => setShowVisualize(!showVisualize)}
              onToggleFrets={() => setShowFrets(!showFrets)}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <Visualizer
              playMode={playMode}
              showFrets={showFrets}
              harmonicNumber={harmonicNumber}
              selectedPosition={selectedPosition}
              animationPhase={animationPhase}
              fingerPosition={fingerPosition}
              fingerCents={fingerCents}
              fingerInputMode={fingerInputMode}
              artificialHarmonicIndex={artificialHarmonicIndex}
              baseFreq={baseFreq || 196}
              onSelectPosition={selectPosition}
              onSelectArtificialHarmonic={setArtificialHarmonicIndex}
            />

            {(fingerPosition > 0 || fingerCents > 0) && (
              <ArtificialHarmonics
                fingerInputMode={fingerInputMode}
                fingerPosition={fingerPosition}
                fingerCents={fingerCents}
                artificialHarmonicIndex={artificialHarmonicIndex}
                baseFreq={baseFreq || 196}
                onSetInputMode={(mode) => {
                  setFingerInputMode(mode);
                  if (mode === 'fret') setFingerCents(0);
                  else setFingerPosition(0);
                }}
                onSetFingerPosition={(pos) => {
                  setFingerPosition(pos);
                  setFingerCents(0);
                  if (pos > 0) {
                    setSelectedPosition(null);
                    setHarmonicNumber(1);
                  }
                }}
                onSetFingerCents={(cents) => {
                  setFingerCents(cents);
                  setFingerPosition(0);
                  if (cents > 0) {
                    setSelectedPosition(null);
                    setHarmonicNumber(1);
                  }
                }}
                onSelectArtificialHarmonic={setArtificialHarmonicIndex}
              />
            )}

            {fingerPosition === 0 && fingerCents === 0 && (
              <HarmonicInfo
                harmonicNumber={harmonicNumber}
                noteInfo={noteInfo}
                baseFreq={baseFreq || 196}
                harmonicNames={harmonicNames}
                harmonicPositions={harmonicPositions}
                selectedPosition={selectedPosition}
                onSelectPosition={selectPosition}
                onNext={nextHarmonic}
                onPrev={prevHarmonic}
                onReset={resetHarmonic}
              />
            )}
          </div>

          <div className="space-y-6">
            <Card className="h-fit sticky top-6 bg-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg">Current Pitch</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-5xl font-bold text-primary tracking-tighter drop-shadow-sm">{noteInfo.note}</div>
                <div className="text-2xl font-mono text-muted-foreground">{noteInfo.freq.toFixed(2)} Hz</div>
                {Math.abs(noteInfo.cents) > 0.01 && (
                  <div className="text-sm font-medium text-secondary-foreground bg-secondary/20 py-1 px-3 rounded-full inline-block">
                    {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)} cents
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional info or instructions could go here */}
            <div className="text-xs text-muted-foreground text-center p-4">
              <p>Harmonics visualization powered by Web Audio API & SVG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StringHarmonicVisualizer;
