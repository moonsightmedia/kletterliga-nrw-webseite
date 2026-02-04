import { Outlet, Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-accent/40 flex flex-col">
      <header className="px-6 pt-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Kletterliga NRW" className="h-10 w-10 object-contain" />
          <div className="font-headline text-lg text-primary tracking-wide">
            KLETTERLIGA <span className="text-secondary">NRW</span>
          </div>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-lg p-6">
          <Outlet />
        </div>
      </main>
      <footer className="text-center text-xs text-muted-foreground pb-6">
        Liga-App · Mobile First
      </footer>
    </div>
  );
};
