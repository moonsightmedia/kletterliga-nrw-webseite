import { Outlet, Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export const AuthLayout = () => {
  const location = useLocation();
  const isOnboardingRoute =
    location.pathname === "/app/register" || location.pathname === "/app/register/success";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(242,220,171,0.55),rgba(255,255,255,0.98)_26%,rgba(242,220,171,0.28)_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(161,85,35,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(0,61,85,0.14),_transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(135deg,rgba(242,220,171,0.28),transparent_62%)]" />

      <header className="relative px-4 pb-2 pt-6 sm:px-6 sm:pt-8">
        <Link
          to="/"
          className={cn(
            "mx-auto flex w-full items-center gap-3",
            isOnboardingRoute ? "max-w-[980px]" : "max-w-[480px]",
          )}
        >
          <img src={logo} alt="Kletterliga NRW" className="h-10 w-10 object-contain" />
          <div className="font-headline text-lg tracking-wide text-primary">
            KLETTERLIGA <span className="text-secondary">NRW</span>
          </div>
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        <div
          className={cn(
            "w-full overflow-hidden rounded-[30px] border border-primary/10 bg-background/95 shadow-[0_28px_90px_-52px_rgba(18,28,36,0.34)] backdrop-blur sm:rounded-[36px]",
            isOnboardingRoute ? "max-w-[980px]" : "max-w-[480px]",
          )}
        >
          <Outlet />
        </div>
      </main>

      <footer className="relative px-4 pb-6 text-center text-xs text-muted-foreground">
        Liga-App {"\u00b7"} Mobile First
      </footer>
    </div>
  );
};
