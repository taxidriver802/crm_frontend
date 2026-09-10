"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/loading/loadingSkeletons";
import { cx } from "@/lib/cx";

export function AttentionStrip({
  metrics = [],
  inventory = [],
  focus,
  onFocus,
  loading = false,
}) {
  const [showMore, setShowMore] = useState(false);

  if (loading) {
    const count = metrics.length === 3 ? 3 : 4;
    return (
      <div
        className={cx(
          "grid gap-3",
          count === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cx(
          "grid gap-3",
          metrics.length === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {metrics.map((metric) => {
          const active = focus === metric.id;
          const alert = metric.tone === "danger" && Number(metric.value) > 0;
          return (
            <StatCard
              key={metric.id}
              size="metric"
              label={metric.label}
              value={metric.value}
              sub={metric.sub}
              active={active}
              onClick={() => onFocus?.(active ? "all" : metric.id)}
              className={cx(alert && !active && "border-danger")}
            />
          );
        })}
      </div>

      {inventory.length > 0 ? (
        <div>
          <button
            type="button"
            className="group text-muted hover:text-main -ml-1 flex items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={showMore ? "Hide counts" : "More counts"}
            aria-expanded={showMore}
            onClick={() => setShowMore((open) => !open)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={cx(
                "transition-transform duration-200 ease-out",
                showMore && "rotate-180",
              )}
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="ml-0.5 opacity-0 text-muted transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              {showMore ? "Hide counts" : "More counts"}
            </span>
          </button>
    

          <div
            className={cx(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3 lg:grid-cols-5">
                {inventory.map((item) => (
                  <StatCard
                    key={item.id}
                    size="compact"
                    label={item.label}
                    value={item.value}
                    sub={item.sub}
                    href={item.href}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="w-full h-[2px] bg-surface my-2" />
        </div>
      ) : null}
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import { StatCard } from "@/components/ui/stat-card";
// import { StatCardSkeleton } from "@/components/loading/loadingSkeletons";
// import { cx } from "@/lib/cx";

// export function AttentionStrip({
//   metrics = [],
//   inventory = [],
//   focus,
//   onFocus,
//   loading = false,
// }) {
//   const [showMore, setShowMore] = useState(false);

//   if (loading) {
//     return (
//       <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <StatCardSkeleton key={i} />
//         ))}
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-3">
//       <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
//         {metrics.map((metric) => {
//           const active = focus === metric.id;
//           const alert = metric.tone === "danger" && Number(metric.value) > 0;
//           return (
//             <StatCard
//               key={metric.id}
//               size="metric"
//               label={metric.label}
//               value={metric.value}
//               sub={metric.sub}
//               active={active}
//               onClick={() => onFocus?.(active ? "all" : metric.id)}
//               className={cx(alert && !active && "border-danger")}
//             />
//           );
//         })}
//       </div>

//       {inventory.length > 0 ? (
//         <div>
//           <button
//             type="button"
//             className="text-muted hover:text-main text-xs font-medium"
//             aria-expanded={showMore}
//             onClick={() => setShowMore((open) => !open)}
//           >
//             {showMore ? "Hide counts" : "More counts"}
//           </button>

//           {showMore ? (
//             <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
//               {inventory.map((item) => (
//                 <StatCard
//                   key={item.id}
//                   size="compact"
//                   label={item.label}
//                   value={item.value}
//                   sub={item.sub}
//                   href={item.href}
//                 />
//               ))}
//             </div>
//           ) : null}
//         </div>
//       ) : null}
//     </div>
//   );
// }
