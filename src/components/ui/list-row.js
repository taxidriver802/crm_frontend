import Link from "next/link";
import { cx } from "@/lib/cx";

export function ListRow({
  as,
  href,
  interactive = false,
  muted = false,
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
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  const Comp = as || "div";
  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  );
}
