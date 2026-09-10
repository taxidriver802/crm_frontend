import MainLogo from "@/assets/mainlogo.svg";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cx } from "@/lib/cx";

export function PublicFrame({
  eyebrow,
  title,
  description,
  width = "default",
  children,
  footer,
}) {
  const maxWidth = width === "narrow" ? "max-w-2xl" : "max-w-4xl";

  return (
    <div className="bg-app text-main min-h-screen">
      <header className="border-base bg-surface-elevated border-b">
        <div
          className={cx(
            "mx-auto flex items-start justify-between gap-3 px-4 py-4 sm:px-6",
            maxWidth,
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <MainLogo className="text-main mt-0.5 h-8 w-8 shrink-0" />
            <div className="min-w-0">
              {eyebrow ? (
                <div className="text-muted text-xs">{eyebrow}</div>
              ) : null}
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-muted mt-0.5 text-sm">{description}</p>
              ) : null}
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className={cx("mx-auto space-y-6 px-4 py-6 sm:px-6", maxWidth)}>
        {children}
      </main>

      {footer ? (
        <footer className="text-muted px-4 pb-8 text-center text-xs">{footer}</footer>
      ) : null}
    </div>
  );
}
