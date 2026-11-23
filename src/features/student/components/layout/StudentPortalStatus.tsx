interface StudentPortalStatusProps {
  status: string;
}

export const StudentPortalStatus = ({
  status,
}: StudentPortalStatusProps) => {
  if (!status || status === 'Gotowy') {
    return null;
  }

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3">
      <p
        className="text-xs text-muted-foreground flex items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <span className="size-2 rounded-full bg-primary animate-pulse inline-block" />
        {status}
      </p>
    </div>
  );
};