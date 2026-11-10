import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CompanyMark, companyMarkProps } from "@/components/brand/company-mark";
import { JoistLockup } from "@/components/brand/joist";

/**
 * Sign-in, register and accept-invite.
 *
 * One brand at a time: the company's mark and name once the company is
 * known, Joist's lockup until then. `pending` holds a quiet empty tile while
 * a remembered company is still being looked up, so Joist does not flash
 * before the company replaces it.
 */
export function AuthFrame({ title, description, children, company, pending = false }) {
  const known = Boolean(company?.name);
  const brand = known ? "company" : pending ? "pending" : "joist";

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-app px-4 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pt-[max(4rem,calc(env(safe-area-inset-top,0px)+1rem))] text-main">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top,0px))] sm:right-6">
        <ThemeToggle variant="icon" />
      </div>

      <div className="card relative w-full max-w-sm overflow-hidden p-0">
        <div className="h-1 w-full bg-accent-solid" aria-hidden />
        <div className="px-7 pb-8 pt-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div
              className="flex h-[4.75rem] flex-col items-center justify-center"
              data-auth-brand={brand}
            >
              {known ? (
                <>
                  <CompanyMark
                    {...companyMarkProps(company)}
                    className="h-11 w-11 text-main"
                    alt=""
                  />
                  <div className="mt-3 text-sm font-semibold tracking-tight">
                    {company.name}
                  </div>
                </>
              ) : pending ? (
                <CompanyMark className="h-11 w-11 text-main" />
              ) : (
                <JoistLockup size={36} />
              )}
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-1.5 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
