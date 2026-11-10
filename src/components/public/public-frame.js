import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CompanyMark } from "@/components/brand/company-mark";
import { JoistMark, PoweredByJoist } from "@/components/brand/joist";
import { PRODUCT_NAME } from "@/lib/brand";
import { cx } from "@/lib/cx";

/**
 * Customer pages: intake, shared estimate, portal, shared invoice.
 *
 * The company owns the header. Joist appears only as the muted
 * "Powered by Joist" line under the page. While the company is loading
 * (`pending`) the mark is a quiet empty tile. A page with no company to show
 * (a dead link) falls back to Joist's mark and name.
 */
export function PublicFrame({
  eyebrow,
  title,
  description,
  width = "default",
  children,
  footer,
  companyName,
  markId,
  logoUrl,
  paletteId,
  pending = false,
}) {
  const maxWidth = width === "narrow" ? "max-w-2xl" : "max-w-4xl";
  const brand = companyName ? "company" : pending ? "pending" : "joist";

  return (
    <div className="min-h-screen bg-app text-main">
      <header className="border-b border-base bg-surface-elevated">
        <div
          className={cx(
            "mx-auto flex items-start justify-between gap-3 px-4 py-4 sm:px-6",
            maxWidth,
          )}
        >
          <div className="flex min-w-0 items-start gap-3" data-public-brand={brand}>
            {brand === "joist" ? (
              <JoistMark size={32} className="mt-0.5" />
            ) : (
              <CompanyMark
                markId={markId}
                logoUrl={logoUrl}
                name={companyName}
                paletteId={paletteId}
                className="mt-0.5 h-8 w-8 shrink-0 text-main"
                alt=""
              />
            )}
            <div className="min-w-0">
              {companyName ? (
                <div className="text-xs font-medium text-muted">{companyName}</div>
              ) : brand === "joist" ? (
                <div className="text-xs font-semibold tracking-tight text-main">{PRODUCT_NAME}</div>
              ) : null}
              {eyebrow ? <div className="text-xs text-muted">{eyebrow}</div> : null}
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="mt-0.5 text-sm text-muted">{description}</p>
              ) : null}
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className={cx("mx-auto space-y-6 px-4 py-6 sm:px-6", maxWidth)}>
        {children}
      </main>

      {footer || companyName ? (
        <footer className="space-y-2 px-4 pb-8 text-center text-xs text-muted">
          {footer ? <div>{footer}</div> : null}
          {companyName ? <PoweredByJoist /> : null}
        </footer>
      ) : null}
    </div>
  );
}
