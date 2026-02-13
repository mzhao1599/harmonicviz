import { Button } from '@/components/ui/button';
import { Play, Pause, Eye, EyeOff, GripHorizontal } from 'lucide-react';

interface HarmonicControlsProps {
  playMode: string;
  showVisualize: boolean;
  showFrets: boolean;
  onTogglePlay: () => void;
  onToggleVisualize: () => void;
  onToggleFrets: () => void;
}

export const HarmonicControls = ({
  playMode,
  showVisualize,
  showFrets,
  onTogglePlay,
  onToggleVisualize,
  onToggleFrets
}: HarmonicControlsProps) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <Button
        onClick={onTogglePlay}
        variant={playMode !== 'off' ? (playMode === 'artificial' ? "secondary" : "default") : "outline"}
        className="min-w-[140px]"
      >
        {playMode !== 'off' ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
        {playMode === 'off' ? 'Play' : playMode === 'natural' ? 'Playing Natural' : 'Playing Artificial'}
      </Button>

      <Button
        onClick={onToggleVisualize}
        variant={showVisualize ? "secondary" : "ghost"}
      >
        {showVisualize ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
        Visualize
      </Button>

      <Button
        onClick={onToggleFrets}
        variant={showFrets ? "secondary" : "ghost"}
      >
        <GripHorizontal className="mr-2 h-4 w-4" />
        Frets: {showFrets ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
};
