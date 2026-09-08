type ErrorStateProps = { message: string; onRetry: () => void };

export function LoadingState({ label = "Loading stock" }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <h2>Unable to load this data</h2>
      <p>{message}</p>
      <button className="button" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState({
  children,
  title = "No stock items found",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="state-panel">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
