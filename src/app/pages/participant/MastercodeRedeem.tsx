import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Scan, ShieldCheck, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchBadge, StitchButton, StitchCard, StitchSectionHeading } from "@/app/components/StitchPrimitives";
import { participantQueryKeys } from "@/app/pages/participant/participantQueries";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { redeemMasterCode } from "@/services/appApi";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";

const MastercodeRedeem = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    viewerMasterRedemption,
    loading: competitionLoading,
    isInitialLoading: competitionInitialLoading,
  } = useParticipantCompetitionData();
  const hasOfficialMasterRedemption = Boolean(viewerMasterRedemption?.redeemed_at);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || hasOfficialMasterRedemption) return;

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    const { error } = await redeemMasterCode(normalized);
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: participantQueryKeys.competitionData }),
    ]);
    toast({
      title: "Teilnahme freigeschaltet",
      description: "Deine Ergebnisse zählen jetzt offiziell in der Liga-Wertung.",
      variant: "success",
    });
    setCode("");
    navigate("/app/profile", { replace: true });
  };

  if (competitionLoading && competitionInitialLoading) {
    return (
      <div className="mx-auto max-w-md">
        <ParticipantStateCard
          title="Status wird geladen"
          description="Wir prüfen, ob dein Mastercode in der Datenbank hinterlegt ist."
        />
      </div>
    );
  }

  if (hasOfficialMasterRedemption) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <StitchCard tone="navy" className="rounded-xl overflow-hidden p-6 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream" className="rounded-xl px-3.5 py-1.5">
                Teilnahme aktiv
              </StitchBadge>
              <StitchBadge tone="ghost" className="rounded-xl border border-[#f2dcab]/16 bg-[#f2dcab]/10 px-3.5 py-1.5 text-[#f2dcab]">
                Mastercode bestätigt
              </StitchBadge>
            </div>
            <StitchSectionHeading
              eyebrow="Ligastatus"
              title="Dein Profil ist offiziell freigeschaltet"
              description="Alle neuen Ergebnisse fließen jetzt in die Ranglisten ein. Du kannst Hallencodes einlösen, Routen loggen und deine Platzierung verfolgen."
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.68)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />
          </div>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <StitchCard tone="navy" className="rounded-xl overflow-hidden p-6 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StitchBadge tone="cream" className="rounded-xl px-3.5 py-1.5">
              Mastercode
            </StitchBadge>
            <StitchBadge tone="ghost" className="rounded-xl border border-[#f2dcab]/16 bg-[#f2dcab]/10 px-3.5 py-1.5 text-[#f2dcab]">
              Teilnahme freischalten
            </StitchBadge>
          </div>
          <StitchSectionHeading
            eyebrow="Liga aktivieren"
            title="Dein Mastercode macht dein Profil offiziell"
            description="Nach der Freischaltung zählen deine Ergebnisse in den Ranglisten. Den Code erhältst du in einer beliebigen Halle nach Zahlung der einmaligen Teilnahmegebühr."
            className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.68)] [&_p]:text-[rgba(242,220,171,0.76)]"
          />
        </div>
      </StitchCard>

      <StitchCard tone="cream" className="rounded-xl p-5 sm:p-6">
        <form onSubmit={handleRedeem} className="space-y-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-[rgba(0,61,85,0.06)] text-[#a15523]">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <div className="stitch-headline text-3xl text-[#002637]">Mastercode freischalten</div>
            <p className="text-sm leading-6 text-[rgba(27,28,26,0.66)]">
              Gib deinen Mastercode ein, um die offizielle Liga-Teilnahme und die vollständigen Auswertungen freizuschalten.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="stitch-kicker text-[#a15523]">Sicherheitscode</span>
            <div className="rounded-xl bg-white px-5 py-4 shadow-[inset_0_-3px_0_rgba(0,61,85,0.22)]">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="KL-MASTER-XXXXXX-XXXX"
                maxLength={24}
                className="w-full bg-transparent text-center font-['Space_Grotesk'] text-[0.82rem] font-bold uppercase tracking-[0.14em] text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.24)] sm:text-lg sm:tracking-[0.22em]"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <StitchButton type="submit" size="lg" className="w-full rounded-xl" disabled={loading || !code.trim()}>
              {loading ? "Wird freigeschaltet..." : "Jetzt freischalten"}
            </StitchButton>

            <Drawer open={scanOpen} onOpenChange={setScanOpen}>
              <DrawerTrigger asChild>
                <StitchButton type="button" variant="outline" size="lg" className="w-full rounded-xl sm:w-auto">
                  <Scan className="h-4 w-4" />
                  Scannen
                </StitchButton>
              </DrawerTrigger>
              <DrawerContent
                showHandle={false}
                className="mx-auto max-w-md rounded-t-xl border-0 bg-[#002637] px-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#f2dcab]"
              >
                <div className="mx-auto mt-3 h-1.5 w-16 rounded-xl bg-[rgba(242,220,171,0.24)]" />

                <DrawerHeader className="px-7 pb-0 pt-4 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <DrawerTitle className="pr-0 font-['Space_Grotesk'] text-[2rem] font-bold tracking-[-0.04em] text-[#f2dcab]">
                        Kamera-Scanner
                      </DrawerTitle>
                      <DrawerDescription className="text-base text-[rgba(242,220,171,0.62)]">
                        Mastercode in den Rahmen halten
                      </DrawerDescription>
                    </div>

                    <DrawerClose asChild>
                      <button
                        type="button"
                        className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(242,220,171,0.08)] text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.14)]"
                        aria-label="Scanner schließen"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                <div className="px-7 pt-5">
                  <div className="overflow-hidden rounded-xl bg-[#f5f3f0] p-0 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
                    <CodeQrScanner
                      onScan={(value) => {
                        setCode(value.trim().toUpperCase());
                        setScanOpen(false);
                      }}
                    />
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.52)]">
            <ShieldCheck className="h-4 w-4" />
            Gesicherte Verbindung
          </div>
        </form>
      </StitchCard>

    </div>
  );
};

export default MastercodeRedeem;
