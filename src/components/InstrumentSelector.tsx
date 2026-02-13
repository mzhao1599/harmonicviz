import { Button } from '@/components/ui/button';

interface InstrumentSelectorProps {
  instruments: string[];
  selectedInstrument: string;
  onSelect: (instrument: string) => void;
}

export const InstrumentSelector = ({
  instruments,
  selectedInstrument,
  onSelect
}: InstrumentSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Instrument
      </label>
      <div className="flex flex-wrap gap-2">
        {instruments.map((inst) => (
          <Button
            key={inst}
            variant={selectedInstrument === inst ? "default" : "outline"}
            onClick={() => onSelect(inst)}
            className="capitalize"
          >
            {inst}
          </Button>
        ))}
      </div>
    </div>
  );
};
