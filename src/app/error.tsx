"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-display text-2xl">Something drifted off course.</p>
      <p className="mt-3 text-sm text-muted">
        {error.message || "An unexpected error occurred."} Your data is safe on this device.
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
