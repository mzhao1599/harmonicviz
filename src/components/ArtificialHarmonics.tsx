import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { calculateArtificialHarmonics } from '@/lib/music-utils';

interface ArtificialHarmonicsProps {
  fingerInputMode: string;
  fingerPosition: number;
  fingerCents: number;
  artificialHarmonicIndex: number;
  baseFreq: number;
  onSetInputMode: (mode: string) => void;
  onSetFingerPosition: (pos: number) => void;
  onSetFingerCents: (cents: number) => void;
  onSelectArtificialHarmonic: (index: number) => void;
}

export const ArtificialHarmonics = ({
  fingerInputMode,
  fingerPosition,
  fingerCents,
  artificialHarmonicIndex,
  baseFreq,
  onSetInputMode,
  onSetFingerPosition,
  onSetFingerCents,
  onSelectArtificialHarmonic
}: ArtificialHarmonicsProps) => {

  const artificialHarmonics = calculateArtificialHarmonics(baseFreq, fingerInputMode, fingerPosition, fingerCents);

  const getDifficultyColor = (n: number) => {
    if (n === 1 || n === 4) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    if (n === 3 || n === 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    if (n === 2) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
  };

  const getDifficultyLabel = (n: number) => {
    if (n === 1 || n === 4) return "Easy";
    if (n === 3 || n === 5) return "Medium";
    if (n === 2) return "Unreachable";
    return "Hard";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Artificial Harmonics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Stop Position Input Mode</label>
          <div className="flex gap-2">
            <Button
              variant={fingerInputMode === 'fret' ? 'default' : 'outline'}
              onClick={() => onSetInputMode('fret')}
            >
              Fret Number
            </Button>
            <Button
              variant={fingerInputMode === 'cents' ? 'default' : 'outline'}
              onClick={() => onSetInputMode('cents')}
            >
              Cents Above Base
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {fingerInputMode === 'fret' ? (
            <>
              <div className="flex justify-between">
                <label className="text-sm font-medium">Stop Position (Fret: 0-12)</label>
                <span className="text-sm font-mono text-muted-foreground">{fingerPosition}</span>
              </div>
              <Slider
                min={0}
                max={12}
                step={1}
                value={[fingerPosition]}
                onValueChange={(val) => onSetFingerPosition(val[0])}
              />
              <div className="text-center text-sm font-medium text-muted-foreground">
                {fingerPosition === 0 ? 'Natural Harmonic!' : `${fingerPosition * 100} cents`}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <label className="text-sm font-medium">Stop Position (Cents: 0-1200)</label>
                <span className="text-sm font-mono text-muted-foreground">{fingerCents}</span>
              </div>
              <Slider
                min={0}
                max={1200}
                step={1}
                value={[fingerCents]}
                onValueChange={(val) => onSetFingerCents(val[0])}
              />
              <div className="text-center text-sm font-medium text-muted-foreground">
                {fingerCents === 0 ? 'Natural Harmonic!' : `${(fingerCents / 100).toFixed(2)} frets`}
              </div>
            </>
          )}
        </div>

        {(fingerPosition > 0 || fingerCents > 0) && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {artificialHarmonics.map((ah, i) => (
              <div
                key={i}
                onClick={() => onSelectArtificialHarmonic(i)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  artificialHarmonicIndex === i
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:bg-muted'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-primary">#{ah.number}</span>
                  <Badge variant="outline" className={getDifficultyColor(ah.number)}>
                    {getDifficultyLabel(ah.number)}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mb-2 line-clamp-2 min-h-[2.5em]">
                  {ah.name}
                </div>

                <div className="text-xs font-mono bg-muted/50 p-1.5 rounded">
                  {ah.resultNote.note} <span className="text-muted-foreground">({ah.resultNote.freq.toFixed(0)}Hz)</span>
                </div>

                {artificialHarmonicIndex === i && ah.number !== 1 && (
                  <div className="mt-2 text-xs text-muted-foreground bg-accent/20 p-2 rounded">
                    <strong>Touch:</strong> {ah.touchFret === 0 ? 'Open' : `Fret ${ah.touchFret}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
