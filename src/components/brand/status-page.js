"use client";

import { useOptionalWorkspace } from "@/components/workspace/workspace-provider";
import { JoistLockup } from "@/components/brand/joist";
import { cx } from "@/lib/cx";

/**
 * 404 and error screens.
 *
 * Inside the staff shell the company's rail is already on screen, so the
 * message stands alone. Outside it (customer links, a crash that took the
 * shell down) no company is showing, and Joist's lockup heads the page.
 */
export function StatusPage({ title, description, children, inShell }) {
  const workspace = useOptionalWorkspace();
  const shell = inShell ?? Boolean(workspace);

  const card = (
    <div className={cx("card w-full max-w-md p-6 text-center", shell && "mx-auto my-12")}>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {children ? <div className="mt-5 flex justify-center gap-2">{children}</div> : null}
    </div>
  );

  if (shell) return <div data-status-brand="company">{card}</div>;

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-app px-4 py-12 text-main"
      data-status-brand="joist"
    >
      <JoistLockup size={32} />
      {card}
    </main>
  );
}
