"use client";

export function PageToolbar({ search, children, refresh, create, savedViews }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {search}
        {children}
        {refresh || create ? (
          <div className="flex flex-wrap items-center gap-2">
            {refresh}
            {create}
          </div>
        ) : null}
      </div>
      {savedViews}
    </div>
  );
}
