import { useState } from "react";
import { CheckCircle2, LineChart, Scan, ShieldCheck, TicketCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { StitchBadge, StitchButton, StitchCard, StitchSectionHeading } from "@/app/components/StitchPrimitives";
import { redeemMasterCode } from "@/services/appApi";

const MastercodeRedeem = () => {
  const { profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const isActivated = Boolean(profile?.participation_activated_at);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || isActivated) return;

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    const { error } = await redeemMasterCode(normalized);
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    await refreshProfile();
    toast({
      title: "Teilnahme freigeschaltet",
      description: "Deine Ergebnisse zählen jetzt offiziell in der Liga-Wertung.",
      variant: "success",
    });
    setCode("");
  };

  if (isActivated) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <StitchCard tone="navy" className="overflow-hidden">
          <div className="stitch-rope-texture p-6 sm:p-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StitchBadge tone="cream">Teilnahme aktiv</StitchBadge>
                <StitchBadge tone="ghost">Mastercode bestätigt</StitchBadge>
              </div>
              <StitchSectionHeading
                eyebrow="Ligastatus"
                title="Dein Profil ist offiziell freigeschaltet"
                description="Alle neuen Ergebnisse fließen jetzt in die Ranglisten ein. Du kannst Hallencodes einlösen, Routen loggen und deine Platzierung verfolgen."
                className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.66)] [&_p]:text-[rgba(242,220,171,0.76)]"
              />
            </div>
          </div>
        </StitchCard>

        <div className="grid gap-4 md:grid-cols-2">
          <StitchCard tone="surface" className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,61,85,0.08)] text-[#003d55]">
                <TicketCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="stitch-kicker text-[#a15523]">Liga-Status</div>
                <div className="text-lg font-semibold text-[#002637]">Wertung freigeschaltet</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Deine Punkte werden ab sofort in allen relevanten Ranglisten berücksichtigt.
                </p>
              </div>
            </div>
          </StitchCard>

          <StitchCard tone="surface" className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(161,85,35,0.08)] text-[#a15523]">
                <LineChart className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="stitch-kicker text-[#a15523]">Statistiken</div>
                <div className="text-lg font-semibold text-[#002637]">Analyse und Verlauf aktiv</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Profil, Ranglisten und Verlauf zeigen jetzt deine volle Saisonleistung an.
                </p>
              </div>
            </div>
          </StitchCard>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StitchCard tone="navy" className="overflow-hidden">
        <div className="stitch-rope-texture p-6 sm:p-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">Mastercode</StitchBadge>
              <StitchBadge tone="ghost">Teilnahme freischalten</StitchBadge>
            </div>
            <StitchSectionHeading
              eyebrow="Liga aktivieren"
              title="Dein Mastercode macht dein Profil offiziell"
              description="Nach der Freischaltung zählen deine Ergebnisse in den Ranglisten. Den Code erhältst du nach der Teilnahmebestätigung in einer Partnerhalle."
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.66)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />
          </div>
        </div>
      </StitchCard>

      <div className="mx-auto grid max-w-xl gap-4">
        <StitchCard tone="cream" className="p-5 sm:p-6">
          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(0,61,85,0.06)] text-[#a15523]">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <div className="stitch-headline text-3xl text-[#002637]">Mastercode freischalten</div>
              <p className="text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                Gib deinen Mastercode ein, um die offizielle Liga-Teilnahme und die vollständigen Auswertungen freizuschalten.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="stitch-kicker text-[#a15523]">Sicherheitscode</span>
              <div className="rounded-[1.2rem] bg-white px-5 py-4 shadow-[inset_0_-3px_0_rgba(0,61,85,0.22)]">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="CODE-XXXX-XXXX"
                  maxLength={24}
                  className="w-full bg-transparent text-center font-['Space_Grotesk'] text-lg font-bold uppercase tracking-[0.22em] text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.24)]"
                />
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <StitchButton type="submit" size="lg" className="w-full" disabled={loading || !code.trim()}>
                {loading ? "Wird freigeschaltet..." : "Jetzt freischalten"}
              </StitchButton>

              <Dialog open={scanOpen} onOpenChange={setScanOpen}>
                <DialogTrigger asChild>
                  <StitchButton type="button" variant="outline" size="lg" className="w-full sm:w-auto">
                    <Scan className="h-4 w-4" />
                    Scannen
                  </StitchButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Mastercode scannen</DialogTitle>
                    <DialogDescription>Halte den QR-Code oder Barcode vor die Kamera.</DialogDescription>
                  </DialogHeader>
                  <CodeQrScanner
                    onScan={(value) => {
                      setCode(value.trim().toUpperCase());
                      setScanOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.52)]">
              <ShieldCheck className="h-4 w-4" />
              Gesicherte Verbindung
            </div>
          </form>
        </StitchCard>

        <div className="grid gap-4 md:grid-cols-2">
          <StitchCard tone="glass" className="p-5 text-[#f2dcab]">
            <div className="flex items-start gap-3">
              <TicketCheck className="mt-0.5 h-5 w-5 text-[#f2dcab]" />
              <div className="space-y-1.5">
                <div className="stitch-kicker text-[rgba(242,220,171,0.66)]">Liga-Status</div>
                <div className="text-lg font-semibold">Offiziell in der Wertung</div>
                <p className="text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                  Nach der Freischaltung erscheint dein Profil regulär in Klassen- und Gesamtwertungen.
                </p>
              </div>
            </div>
          </StitchCard>

          <StitchCard tone="glass" className="p-5 text-[#f2dcab]">
            <div className="flex items-start gap-3">
              <LineChart className="mt-0.5 h-5 w-5 text-[#f2dcab]" />
              <div className="space-y-1.5">
                <div className="stitch-kicker text-[rgba(242,220,171,0.66)]">Erweiterte Übersicht</div>
                <div className="text-lg font-semibold">Ranglisten und Verlauf</div>
                <p className="text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                  Punkte, Verlauf und persönliche Statistiken werden danach vollständig in der App sichtbar.
                </p>
              </div>
            </div>
          </StitchCard>
        </div>
      </div>
    </div>
  );
};

export default MastercodeRedeem;
