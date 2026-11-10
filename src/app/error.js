"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/brand/status-page";

/** A page that threw. The root layout (and the shell, when signed in) is still up. */
export default function RouteError({ error, retry, reset }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  const again = retry || reset;

  return (
    <StatusPage
      title="Something went wrong"
      description={error?.message || "An unexpected error occurred."}
    >
      {again ? (
        <button type="button" className="btn px-4 py-2 text-sm" onClick={() => again()}>
          Try again
        </button>
      ) : null}
    </StatusPage>
  );
}
