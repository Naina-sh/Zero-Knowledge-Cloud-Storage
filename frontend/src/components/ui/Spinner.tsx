/**
 * Spinner component — loading indicator.
 * @module components/ui/Spinner
 */

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <Loader2 className={clsx(sizeClasses[size], 'animate-spin text-brand-500', className)} />;
}

/**
 * Full-page spinner overlay.
 */
export function FullPageSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Spinner size="lg" />
      {message && <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>}
    </div>
  );
}
