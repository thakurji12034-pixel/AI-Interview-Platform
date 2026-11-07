export const SkeletonLoader = ({ count = 3, className = 'h-16 w-full' }) => {
  return (
    <div className="space-y-3 w-full animate-pulse" role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
