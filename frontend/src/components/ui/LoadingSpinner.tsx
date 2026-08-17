interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md';
}

export default function LoadingSpinner({ label, size = 'md' }: LoadingSpinnerProps) {
  const dim = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]';

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${dim} animate-spin rounded-full border-gray-200 border-t-brand-600`}
        role="status"
        aria-label="Loading"
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
