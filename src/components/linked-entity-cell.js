"use client";

import { ReturnLink } from "@/components/return-to";
import { getLinkedEntity } from "@/lib/helper";

export function LinkedEntityCell({ task }) {
  const linked = getLinkedEntity(task);

  if (!linked.href) {
    return <span className="text-muted">{linked.label}</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="text-muted text-xs">{linked.kind}</span>
      <ReturnLink className="underline underline-offset-4 hover:opacity-80" href={linked.href}>
        {linked.label}
      </ReturnLink>
    </div>
  );
}
