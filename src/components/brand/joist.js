/**
 * The app brand: Joist. Three forms, no others.
 *
 *   JoistMark      the mark alone (icons, compact places), 16px and up
 *   JoistLockup    mark + the word "Joist", only at 24px and up
 *   PoweredByJoist the text-only attribution on customer-facing pages
 *
 * The drawing is src/assets/brand/joist-mark.svg, imported here through
 * SVGR. Every other copy (favicon, app icons, offline page) is generated
 * from that file by `npm run icons:pwa`. Do not redraw it anywhere.
 * Rules: src/theme/brand.md.
 */
import JoistMarkSvg from "@/assets/brand/joist-mark.svg";
import { cx } from "@/lib/cx";
import { POWERED_BY, PRODUCT_NAME } from "@/lib/brand";

export const JOIST_MARK_MIN = 16;
export const JOIST_LOCKUP_MIN = 24;

/**
 * tone="color": the tile, the light web and the orange flange.
 * tone="quiet": the glyph alone in currentColor at low contrast, for
 * loading placeholders. Same drawing, no tile.
 */
export function JoistMark({ size = 24, tone = "color", className, label }) {
  const px = Math.max(JOIST_MARK_MIN, Math.round(size));
  return (
    <JoistMarkSvg
      width={px}
      height={px}
      className={cx("joist-mark shrink-0", tone === "quiet" && "joist-mark-quiet", className)}
      data-brand-mark="joist"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    />
  );
}

/** Mark and wordmark side by side. Below 24px use JoistMark alone. */
export function JoistLockup({ size = 28, className }) {
  const px = Math.max(JOIST_LOCKUP_MIN, Math.round(size));
  return (
    <span
      className={cx("inline-flex items-center font-semibold tracking-tight text-main", className)}
      style={{ gap: Math.round(px * 0.33), fontSize: Math.round(px * 0.72), lineHeight: 1 }}
      data-brand="joist"
    >
      <JoistMark size={px} />
      <span>{PRODUCT_NAME}</span>
    </span>
  );
}

/** One muted line. Customer pages and email only, never the staff shell. */
export function PoweredByJoist({ className }) {
  return (
    <p className={cx("text-[11px] text-soft", className)} data-brand="powered-by">
      {POWERED_BY}
    </p>
  );
}
