"use client";

import Link from "next/link";
import { ReturnLink } from "@/components/return-to";
import { cx } from "@/lib/cx";

export function ListRow({
  as,
  href,
  interactive = false,
  muted = false,
  returnTo = true,
  className = "",
  children,
  ...props
}) {
  const classes = cx(
    "list-row",
    muted && "list-row-muted",
    (interactive || href) && "list-row-interactive",
    className,
  );

  if (href) {
    const Comp = returnTo ? ReturnLink : Link;
    return (
      <Comp href={href} className={classes} {...props}>
        {children}
      </Comp>
    );
  }

  const Comp = as || "div";
  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
}
