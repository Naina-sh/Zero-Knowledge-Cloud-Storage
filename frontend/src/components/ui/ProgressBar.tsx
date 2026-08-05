/**
 * ProgressBar component — animated progress bar with label.
 * @module components/ui/ProgressBar
 */

import clsx from 'clsx';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  className?: string;
}

export function ProgressBar({ progress, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="text-gray-500 dark:text-gray-400 font-mono">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
