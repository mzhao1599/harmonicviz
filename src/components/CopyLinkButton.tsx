import { useEffect, useState } from 'react';
import { Check, Link } from 'lucide-react';

/** Copies the current URL, which encodes the instrument, string, harmonic and stop. */
export function CopyLinkButton() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <button type="button" className="toggle-pill" onClick={copy} aria-live="polite">
      {status === 'copied' ? <Check size={13} aria-hidden="true" /> : <Link size={13} aria-hidden="true" />}
      {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy failed' : 'Copy link'}
    </button>
  );
}
