import Link from "next/link";

export function LayoutCompareLink({ href, label, prefix = "Trying a work-first layout." }) {
  return (
    <p className="text-muted text-center text-xs">
      {prefix}{" "}
      <Link href={href} className="hover:text-main hover:underline">
        {label}
      </Link>
    </p>
  );
}
