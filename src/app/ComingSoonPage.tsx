import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

const PREVIEW_UNLOCK_KEY = "kl_preview_unlocked";
const LAUNCH_DATE = new Date(2026, 2, 1, 0, 0, 0); // March 1, 2026 00:00

const PAPER_TEXTURE_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
};

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());
  const isPast = now >= target;

  useEffect(() => {
    if (isPast) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isPast]);

  if (isPast) {
    return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    isPast: false,
    days: differenceInDays(target, now),
    hours: differenceInHours(target, now) % 24,
    minutes: differenceInMinutes(target, now) % 60,
    seconds: differenceInSeconds(target, now) % 60,
  };
}

export const ComingSoonPage = () => {
  const countdown = useCountdown(LAUNCH_DATE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const previewPassword = import.meta.env.VITE_PREVIEW_PASSWORD as string | undefined;
  const hasPreviewAccess = typeof previewPassword === "string" && previewPassword.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!previewPassword) {
      setError("Zugang nicht konfiguriert.");
      return;
    }
    if (password === previewPassword) {
      sessionStorage.setItem(PREVIEW_UNLOCK_KEY, "1");
      setDialogOpen(false);
      setPassword("");
      window.location.reload();
    } else {
      setError("Falsches Passwort.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-accent relative overflow-hidden">
      {/* Paper Texture */}
      <div className="absolute inset-0 opacity-[0.4]" style={PAPER_TEXTURE_STYLE} />
      {/* Diagonal Stripes */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute bg-accent-foreground/[0.06] w-[200%] h-32 md:h-48"
          style={{ top: "30%", left: "-50%", transform: "rotate(-15deg)" }}
        />
        <div
          className="absolute bg-accent-foreground/[0.04] w-[200%] h-24 md:h-36"
          style={{ top: "55%", left: "-50%", transform: "rotate(-15deg)" }}
        />
      </div>

      <div className="container-kl relative z-10 flex flex-col items-center justify-center flex-1 py-12 md:py-20">
        {/* Logo */}
        <img
          src={logo}
          alt="Kletterliga NRW"
          className="w-24 h-24 md:w-32 md:h-32 object-contain mb-8 md:mb-12"
        />

        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl text-primary text-center leading-tight mb-2">
          Kletterliga NRW
        </h1>
        <p className="font-headline text-2xl md:text-3xl text-secondary mb-2">Saison 2026</p>
        <p className="text-xl md:text-2xl text-primary/80 font-medium mb-10 md:mb-14">Coming Soon</p>

        {countdown.isPast ? (
          <div className="card-kl text-center py-8 px-6 md:py-10 md:px-10">
            <p className="font-headline text-2xl md:text-3xl text-primary">Jetzt live</p>
            <p className="text-muted-foreground mt-2">Die Webseite ist freigeschaltet.</p>
          </div>
        ) : (
          <div className="card-kl py-8 px-6 md:py-10 md:px-10 mb-10">
            <p className="text-sm uppercase tracking-widest text-muted-foreground text-center mb-6">
              Start am 1. März 2026
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <div className="bg-primary -skew-x-6 px-5 py-4 min-w-[4.5rem] md:min-w-[5rem] text-center">
                <span className="font-headline text-3xl md:text-4xl text-primary-foreground block skew-x-6">
                  {countdown.days}
                </span>
                <span className="text-xs text-primary-foreground/80 skew-x-6 block">Tage</span>
              </div>
              <div className="bg-secondary -skew-x-6 px-5 py-4 min-w-[4.5rem] md:min-w-[5rem] text-center">
                <span className="font-headline text-3xl md:text-4xl text-secondary-foreground block skew-x-6">
                  {countdown.hours}
                </span>
                <span className="text-xs text-secondary-foreground/80 skew-x-6 block">Stunden</span>
              </div>
              <div className="bg-primary -skew-x-6 px-5 py-4 min-w-[4.5rem] md:min-w-[5rem] text-center">
                <span className="font-headline text-3xl md:text-4xl text-primary-foreground block skew-x-6">
                  {countdown.minutes}
                </span>
                <span className="text-xs text-primary-foreground/80 skew-x-6 block">Min</span>
              </div>
              <div className="bg-secondary -skew-x-6 px-5 py-4 min-w-[4.5rem] md:min-w-[5rem] text-center">
                <span className="font-headline text-3xl md:text-4xl text-secondary-foreground block skew-x-6">
                  {countdown.seconds}
                </span>
                <span className="text-xs text-secondary-foreground/80 skew-x-6 block">Sek</span>
              </div>
            </div>
          </div>
        )}

        {hasPreviewAccess && (
          <div className="mt-auto pt-8">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setDialogOpen(true)}
            >
              <span className="skew-x-6">Für Tester: Zugang mit Passwort</span>
            </Button>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Zugang für Tester</DialogTitle>
              <DialogDescription>
                Passwort eingeben, um die Webseite im Testmodus zu öffnen.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="preview-password">Passwort</Label>
                  <Input
                    id="preview-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Passwort"
                    autoFocus
                    autoComplete="current-password"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit">
                  <span className="skew-x-6">Zugang öffnen</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
