import Link from "next/link";
import { StatusPage } from "@/components/brand/status-page";

export const metadata = { title: "Page not found · Joist" };

export default function NotFound() {
  return (
    <StatusPage
      title="This page doesn’t exist"
      description="The link may be old, or the address may be mistyped."
    >
      <Link href="/" className="btn btn-primary px-4 py-2 text-sm">
        Go to the start
      </Link>
    </StatusPage>
  );
}
