import type { Difficulty } from '../lib/music';

const DYNAMICS: Record<Difficulty, string> = {
  easy: 'pp',
  medium: 'mf',
  hard: 'ff',
  unreachable: '—',
};

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={`badge badge-${level}`}>{DYNAMICS[level]}</span>;
}
