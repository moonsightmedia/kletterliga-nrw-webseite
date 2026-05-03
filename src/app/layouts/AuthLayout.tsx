import { Outlet, Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useMarkAppStartupSplashSeen } from "@/app/startup/appStartupSplash";
import { cn } from "@/lib/utils";

export const AuthLayout = () => {
  useMarkAppStartupSplashSeen();

  const location = useLocation();
  const isLoginRoute = location.pathname === "/app/login";
  const isRegisterRoute = location.pathname === "/app/register";
  const isOnboardingRoute =
    location.pathname === "/app/register" || location.pathname === "/app/register/success";
  const suppressHeader = isLoginRoute || isRegisterRoute;

  return (
    <div className="stitch-app stitch-auth-shell">
      <div className="stitch-rope-texture absolute inset-0 opacity-40" />

      {!suppressHeader ? (
        <header className="relative z-10 px-4 pt-6 sm:px-6 sm:pt-8">
          <div className={cn("mx-auto flex w-full items-center justify-between gap-4", isOnboardingRoute ? "max-w-5xl" : "max-w-md")}>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="rounded-xl bg-[#f2dcab] p-3 shadow-[0_18px_36px_rgba(0,0,0,0.18)] rotate-[-2deg]">
                <img src={logo} alt="Kletterliga NRW" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <div className="stitch-headline text-lg text-[#f2dcab]">Kletterliga NRW</div>
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Teilnehmerbereich</div>
              </div>
            </Link>

            <div className="stitch-kicker hidden text-[rgba(242,220,171,0.62)] sm:block">
              Saison-App
            </div>
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "relative z-10 flex flex-1 justify-center",
          isRegisterRoute
            ? "items-start px-0 pb-0 pt-0 sm:px-0 sm:pb-0 sm:pt-0"
            : isLoginRoute
              ? "items-center px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10"
              : "items-center px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8",
        )}
      >
        <div className={cn("w-full", isOnboardingRoute ? "max-w-5xl" : "max-w-md")}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
