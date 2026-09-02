import MainLogo from "@/assets/mainlogo.svg";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthFrame({ title, description, children }) {
  return (
    <main className="bg-app text-main relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle variant="icon" />
      </div>

      <div className="card relative w-full max-w-sm overflow-hidden p-0">
        <div className="bg-accent-solid h-1 w-full" aria-hidden />
        <div className="px-7 pb-8 pt-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <MainLogo className="text-main h-11 w-11" />
            <div className="mt-3 text-sm font-semibold tracking-tight">CRM</div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-muted mt-1.5 text-sm">{description}</p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
