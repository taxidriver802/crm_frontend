export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-[var(--border)] ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3 p-4">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="card rounded-lg p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="w-full space-y-2 lg:w-44">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="w-full space-y-2 lg:w-40">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card space-y-2 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

export function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-60" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-base border-t">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="flex flex-col space-y-2">
            <Skeleton className={`${i === 0 ? "w-full" : "w-34"} h-4`} />
            {i === 0 && <Skeleton className="h-3 w-40" />}
          </div>
        </td>
      ))}
    </tr>
  );
}

export function LoadingSpinner({ size = 16 }) {
  return (
    <div
      className="animate-spin rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: "var(--border)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}

export default function LoadingDots({ size = 8, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="bg-accent animate-bounce rounded-full"
        style={{ width: size, height: size, animationDelay: "0ms" }}
      />
      <span
        className="bg-accent animate-bounce rounded-full"
        style={{ width: size, height: size, animationDelay: "150ms" }}
      />
      <span
        className="bg-accent animate-bounce rounded-full"
        style={{ width: size, height: size, animationDelay: "300ms" }}
      />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/3" />

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <Skeleton className="h-48 w-full" />
    </div>
  );
}
