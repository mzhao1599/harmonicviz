import { useContext, type ReactNode } from 'react';
import { HarmonicContext } from '../harmonicContext';

interface Props {
  id?: string;
  children: ReactNode;
}

/**
 * Section heading followed by a hairline "string" with the current harmonic's
 * nodes marked at i/n, so every section echoes the harmonic on show.
 */
export function SectionTitle({ id, children }: Props) {
  const n = useContext(HarmonicContext);
  return (
    <h2 className="section-title" id={id}>
      <span>{children}</span>
      <span className="node-rule" aria-hidden="true">
        {Array.from({ length: 15 }, (_, i) => (
          <i key={i} className={i + 1 < n ? 'on' : ''} style={{ left: `${(Math.min(i + 1, n) / n) * 100}%` }} />
        ))}
      </span>
    </h2>
  );
}
