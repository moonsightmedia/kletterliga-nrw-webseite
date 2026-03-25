import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HelpCircle, Scan, Ticket } from "lucide-react";
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
import { redeemGymCode } from "@/services/appApi";

const GymRedeem = () => {
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    const { data, error } = await redeemGymCode(normalized);
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (!data) {
      toast({ title: "Fehler", description: "Der Code konnte nicht eingelöst werden." });
      return;
    }

    toast({
      title: "Halle freigeschaltet",
      description: data.gym_name
        ? `Die Halle „${data.gym_name}“ ist jetzt für dich geöffnet.`
        : "Die Halle wurde für dein Profil freigeschaltet.",
      variant: "success",
    });
    setCode("");
  };

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="overflow-hidden">
        <div className="stitch-rope-texture p-5 sm:p-6">
          <div className="mx-auto max-w-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">Code einlösen</StitchBadge>
              <StitchBadge tone="ghost">Partnerhalle freischalten</StitchBadge>
            </div>

            <StitchSectionHeading
              eyebrow="Hallenzugang"
              title="Mit einem Hallencode direkt in deine Session"
              description="Gib den Code aus deiner Halle ein. Danach kannst du dort Ergebnisse eintragen und deine Fortschritte live verfolgen."
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.66)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />
          </div>
        </div>
      </StitchCard>

      <div className="mx-auto grid max-w-xl gap-4">
        <StitchCard tone="cream" className="p-5 sm:p-6">
          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[rgba(0,61,85,0.06)]">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(0,61,85,0.08)] text-[#a15523]">
                <Ticket className="h-7 w-7" />
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#a15523] text-[#f2dcab] shadow-[0_10px_22px_rgba(161,85,35,0.28)]">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-3 text-center">
              <div className="stitch-headline text-3xl text-[#002637]">Halle freischalten</div>
              <p className="text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                Dein Hallencode aktiviert den Zugang zur Location und öffnet die Ergebnis-Erfassung für diese Halle.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="stitch-kicker text-[#a15523]">Hallencode</span>
              <div className="rounded-[1.2rem] bg-white px-5 py-4 shadow-[inset_0_-3px_0_rgba(161,85,35,0.22)]">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="CODE-123"
                  maxLength={24}
                  className="w-full bg-transparent text-center font-['Space_Grotesk'] text-xl font-bold uppercase tracking-[0.32em] text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.22)]"
                />
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <StitchButton type="submit" size="lg" className="w-full" disabled={loading || !code.trim()}>
                {loading ? "Code wird geprüft..." : "Code aktivieren"}
                <ArrowRight className="h-4 w-4" />
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
                    <DialogTitle>Code scannen</DialogTitle>
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
          </form>
        </StitchCard>

        <StitchCard tone="surface" className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="stitch-kicker text-[#a15523]">Noch keinen Code?</div>
              <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                Schau in der Hallenübersicht nach Partnerhallen oder frag direkt vor Ort nach dem aktuellen Ligacode.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StitchButton asChild variant="ghost" size="sm">
                <Link to="/app/gyms">
                  Partnerhallen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </StitchButton>
              <StitchButton asChild variant="outline" size="sm">
                <a href="mailto:support@kletterliga-nrw.de">
                  <HelpCircle className="h-4 w-4" />
                  Hilfe
                </a>
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      </div>
    </div>
  );
};

export default GymRedeem;
