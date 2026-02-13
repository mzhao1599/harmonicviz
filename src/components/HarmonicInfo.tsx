import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { getPositionInfo, getNoteAtFret } from '@/lib/music-utils';

interface HarmonicInfoProps {
  harmonicNumber: number;
  noteInfo: { note: string; freq: number; cents: number };
  baseFreq: number;
  harmonicNames: { [key: number]: string };
  harmonicPositions: { position: number; numerator: number; denominator: number }[];
  selectedPosition: number | null;
  onSelectPosition: (position: number | null) => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
}

export const HarmonicInfo = ({
  harmonicNumber,
  noteInfo,
  baseFreq,
  harmonicNames,
  harmonicPositions,
  selectedPosition,
  onSelectPosition,
  onNext,
  onPrev,
  onReset
}: HarmonicInfoProps) => {

  const getDifficultyColor = (n: number) => {
    if (n <= 4) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    if (n <= 8) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
  };

  const getDifficultyLabel = (n: number) => {
    if (n <= 4) return "Easy";
    if (n <= 8) return "Medium";
    return "Hard";
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Natural Harmonics</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onPrev} disabled={harmonicNumber === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNext} disabled={harmonicNumber === 16}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {harmonicNumber === 16 && (
          <div className="text-center text-sm text-muted-foreground italic mb-4">
            leave the rest to roman kim...
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Harmonic #{harmonicNumber}: {harmonicNames[harmonicNumber]}
            </h3>
            <Badge variant="outline" className={getDifficultyColor(harmonicNumber)}>
              {getDifficultyLabel(harmonicNumber)}
            </Badge>
          </div>

          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Result: </span>
            <span className="text-foreground font-mono">{noteInfo.note} ({noteInfo.freq.toFixed(2)} Hz)</span>
            {Math.abs(noteInfo.cents) > 0.01 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {noteInfo.cents > 0 ? '+' : ''}{noteInfo.cents.toFixed(2)} cents
              </span>
            )}
          </div>

          <div className="space-y-2">
            {harmonicNumber === 1 ? (
              <p className="text-sm text-muted-foreground">
                <strong>Play the open string</strong> (no finger placement needed)
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">Touch the string lightly at:</p>
                <div className="flex gap-2 flex-wrap">
                  {harmonicPositions.map((posObj, i) => (
                    <Button
                      key={i}
                      variant={selectedPosition === posObj.position ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => onSelectPosition(posObj.position)}
                      className="min-w-[3rem]"
                    >
                      {posObj.numerator}/{posObj.denominator}
                    </Button>
                  ))}
                </div>

                {selectedPosition !== null && (() => {
                  const posInfo = getPositionInfo(selectedPosition);
                  const fretNote = getNoteAtFret(posInfo.nearestFret, baseFreq);
                  return (
                    <div className="mt-4 p-3 bg-accent/20 border border-accent rounded-md text-sm">
                      <div className="font-semibold text-accent-foreground mb-1">Position Guide:</div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Nearest:</span> {posInfo.nearestFret === 0 ? 'Open string' : `Fret ${posInfo.nearestFret}`} ({fretNote.note})
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Adjustment:</span> {Math.abs(posInfo.cents) < 0.01 ? 'Exact' : `Play ${posInfo.cents > 0 ? posInfo.cents.toFixed(2) : Math.abs(posInfo.cents).toFixed(2)} cents ${posInfo.cents > 0 ? 'higher' : 'lower'}`}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
