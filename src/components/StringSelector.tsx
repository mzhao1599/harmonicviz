import { Button } from '@/components/ui/button';

interface StringSelectorProps {
  strings: string[];
  selectedString: string;
  onSelect: (string: string) => void;
}

export const StringSelector = ({
  strings,
  selectedString,
  onSelect
}: StringSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        String
      </label>
      <div className="flex flex-wrap gap-2">
        {strings.map((str) => (
          <Button
            key={str}
            variant={selectedString === str ? "default" : "outline"}
            onClick={() => onSelect(str)}
          >
            {str}
          </Button>
        ))}
      </div>
    </div>
  );
};
