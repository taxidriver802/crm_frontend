import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CompanyMark } from "@/components/brand/company-mark";

export function AuthFrame({
  title,
  description,
  children,
  companyName,
  markId,
  logoUrl,
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-app px-4 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pt-[max(4rem,calc(env(safe-area-inset-top,0px)+1rem))] text-main">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top,0px))] sm:right-6">
        <ThemeToggle variant="icon" />
      </div>

      <div className="card relative w-full max-w-sm overflow-hidden p-0">
        <div className="h-1 w-full bg-accent-solid" aria-hidden />
        <div className="px-7 pb-8 pt-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <CompanyMark
              markId={markId}
              logoUrl={logoUrl}
              className="h-11 w-11 text-main"
              alt=""
            />
            <div className="mt-3 text-sm font-semibold tracking-tight">
              {companyName || "CRM"}
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
