import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-4"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 shrink-0 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}
