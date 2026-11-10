"use client";

import { JoistMark } from "@/components/brand/joist";
import { PRODUCT_NAME } from "@/lib/brand";

/**
 * The root layout itself failed: no styles, no theme, no company. Plain
 * inline styles in Ember's light tokens, like public/offline.html.
 */
export default function GlobalError({ retry, reset }) {
  const again = retry || reset;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          background: "#f6f5f1",
          color: "#1b1a17",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>{`Something went wrong · ${PRODUCT_NAME}`}</title>
        <div
          data-status-brand="joist"
          style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 23, fontWeight: 600, letterSpacing: "-0.025em" }}
        >
          <JoistMark size={32} />
          <span>{PRODUCT_NAME}</span>
        </div>
        <main
          style={{
            width: "100%",
            maxWidth: "24rem",
            background: "#ffffff",
            border: "1px solid #e6e3db",
            borderRadius: 10,
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 1.25rem", color: "#5f5d56", lineHeight: 1.5 }}>
            The app hit an error it could not recover from.
          </p>
          {again ? (
            <button
              type="button"
              onClick={() => again()}
              style={{
                border: 0,
                borderRadius: 8,
                background: "#f97316",
                color: "#111318",
                font: "inherit",
                fontWeight: 600,
                padding: "0.6rem 1rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          ) : null}
        </main>
      </body>
    </html>
  );
}
