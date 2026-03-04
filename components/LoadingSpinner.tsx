export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-14 w-14">
        <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-night-surface border-t-orange-glow"></div>
      </div>
      <p className="text-sm font-medium lowercase text-text-secondary">searching...</p>
    </div>
  );
}
