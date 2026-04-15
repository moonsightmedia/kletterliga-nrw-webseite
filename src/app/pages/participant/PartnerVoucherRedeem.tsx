import { useEffect, useMemo, useState } from "react";
import { Scan, Store, TicketPercent, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { getMyPartnerVoucherRedemption, redeemPartnerVoucher } from "@/services/appApi";

const PARTNER_SLUG = "kletterladen_nrw";

const formatRedeemedAt = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const PartnerVoucherRedeem = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isParticipationActivated = Boolean(profile?.participation_activated_at);
  const [scanOpen, setScanOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [redeemedAt, setRedeemedAt] = useState<string | null>(null);

  const redeemedAtLabel = useMemo(() => formatRedeemedAt(redeemedAt), [redeemedAt]);

  useEffect(() => {
    if (!profile?.id || !isParticipationActivated) {
      setRedeemedAt(null);
      return;
    }

    let active = true;
    setStatusLoading(true);

    getMyPartnerVoucherRedemption(PARTNER_SLUG)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRedeemedAt(null);
          return;
        }
        setRedeemedAt(data?.redeemed_at ?? null);
      })
      .finally(() => {
        if (active) {
          setStatusLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile?.id, isParticipationActivated]);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !isParticipationActivated) return;

    const normalizedValue = qrCodeValue.trim();
    if (!normalizedValue) return;

    setLoading(true);
    const { data, error } = await redeemPartnerVoucher({
      partnerSlug: PARTNER_SLUG,
      qrCodeValue: normalizedValue,
      scanSource: "participant_app",
    });
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (!data) {
      toast({ title: "Fehler", description: "Der Gutschein konnte nicht eingelöst werden." });
      return;
    }

    if (data.status === "not_eligible") {
      toast({ title: "Nicht berechtigt", description: "Bitte löse zuerst deinen Mastercode ein." });
      return;
    }

    if (data.status === "already_redeemed") {
      toast({
        title: "Schon eingelöst",
        description: "Dieser Gutschein wurde in deinem Profil bereits erfasst.",
      });
      if (data.redeemed_at) {
        setRedeemedAt(data.redeemed_at);
      }
      return;
    }

    const effectiveRedeemedAt = data.redeemed_at ?? new Date().toISOString();
    setRedeemedAt(effectiveRedeemedAt);
    setQrCodeValue("");
    toast({
      title: "Gutschein eingelöst",
      description: "15 % im Kletterladen NRW sind jetzt in deinem Profil hinterlegt.",
      variant: "success",
    });
  };

  if (!isParticipationActivated) {
    return (
      <div className="mx-auto max-w-md">
        <StitchCard tone="cream" className="rounded-[1.05rem] p-6">
          <div className="space-y-4 text-center">
            <div className="stitch-headline text-[2rem] leading-[1.02] text-[#002637]">
              Mastercode zuerst einlösen
            </div>
            <p className="text-base leading-7 text-[rgba(0,38,55,0.72)]">
              Der Partnergutschein ist erst verfügbar, wenn deine Teilnahme aktiv ist.
            </p>
            <StitchButton
              type="button"
              size="lg"
              className="w-full"
              onClick={() => navigate("/app/participation/redeem")}
            >
              Zum Mastercode
            </StitchButton>
          </div>
        </StitchCard>
      </div>
    );
  }

  if (redeemedAt) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <StitchCard tone="navy" className="rounded-[1.05rem] p-6 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream" className="rounded-[0.72rem] px-3.5 py-1.5">
                Gutschein aktiv
              </StitchBadge>
              <StitchBadge tone="ghost" className="rounded-[0.72rem] border border-[#f2dcab]/16 bg-[#f2dcab]/10 px-3.5 py-1.5 text-[#f2dcab]">
                Kletterladen NRW
              </StitchBadge>
            </div>
            <StitchSectionHeading
              eyebrow="Partner-Vorteil"
              title="15 % sind in deinem Profil gespeichert"
              description={
                redeemedAtLabel
                  ? `Eingelöst am ${redeemedAtLabel}. Zeig den Status einfach im Laden vor.`
                  : "Dieser Gutschein wurde bereits eingelöst. Zeig den Status einfach im Laden vor."
              }
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.68)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />
          </div>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <StitchCard tone="navy" className="rounded-[1.05rem] p-6 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StitchBadge tone="cream" className="rounded-[0.72rem] px-3.5 py-1.5">
              Partnergutschein
            </StitchBadge>
            <StitchBadge tone="ghost" className="rounded-[0.72rem] border border-[#f2dcab]/16 bg-[#f2dcab]/10 px-3.5 py-1.5 text-[#f2dcab]">
              15 % Kletterladen NRW
            </StitchBadge>
          </div>
          <StitchSectionHeading
            eyebrow="Kooperation"
            title="QR-Code im Kletterladen scannen"
            description="Scanne den QR-Code vor Ort, um deinen einmaligen Rabatt in dieser Saison zu hinterlegen."
            className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.68)] [&_p]:text-[rgba(242,220,171,0.76)]"
          />
        </div>
      </StitchCard>

      <StitchCard tone="cream" className="rounded-[1rem] p-5 sm:p-6">
        <form onSubmit={handleRedeem} className="space-y-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1rem] bg-[rgba(0,61,85,0.06)] text-[#a15523]">
              <TicketPercent className="h-9 w-9" />
            </div>
            <div className="stitch-headline text-3xl text-[#002637]">Gutschein einlösen</div>
            <p className="text-sm leading-6 text-[rgba(27,28,26,0.66)]">
              Nach erfolgreichem Scan ist dein Rabatt als eingelöst markiert und bleibt in deinem Profil sichtbar.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="stitch-kicker text-[#a15523]">QR-Inhalt</span>
            <div className="rounded-[1rem] bg-white px-5 py-4 shadow-[inset_0_-3px_0_rgba(0,61,85,0.22)]">
              <input
                value={qrCodeValue}
                onChange={(event) => setQrCodeValue(event.target.value)}
                placeholder="QR-Code scannen"
                className="w-full bg-transparent text-center font-['Space_Grotesk'] text-sm font-bold text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.24)]"
              />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <StitchButton type="submit" size="lg" className="w-full rounded-[1rem]" disabled={loading || !qrCodeValue.trim()}>
              {loading ? "Wird geprüft..." : "Gutschein bestätigen"}
              <Store className="h-4 w-4" />
            </StitchButton>

            <Drawer open={scanOpen} onOpenChange={setScanOpen}>
              <DrawerTrigger asChild>
                <StitchButton type="button" variant="outline" size="lg" className="w-full rounded-[1rem] sm:w-auto">
                  <Scan className="h-4 w-4" />
                  Scannen
                </StitchButton>
              </DrawerTrigger>
              <DrawerContent
                showHandle={false}
                className="mx-auto max-w-md rounded-t-[1.25rem] border-0 bg-[#002637] px-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#f2dcab]"
              >
                <div className="mx-auto mt-3 h-1.5 w-16 rounded-[0.6rem] bg-[rgba(242,220,171,0.24)]" />

                <DrawerHeader className="px-7 pb-0 pt-4 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <DrawerTitle className="pr-0 font-['Space_Grotesk'] text-[2rem] font-bold tracking-[-0.04em] text-[#f2dcab]">
                        Kamera-Scanner
                      </DrawerTitle>
                      <DrawerDescription className="text-base text-[rgba(242,220,171,0.62)]">
                        QR-Code im Laden in den Rahmen halten
                      </DrawerDescription>
                    </div>

                    <DrawerClose asChild>
                      <button
                        type="button"
                        className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.14)]"
                        aria-label="Scanner schließen"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                <div className="px-7 pt-5">
                  <div className="overflow-hidden rounded-[1rem] bg-[#f5f3f0] p-0 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
                    <CodeQrScanner
                      onScan={(value) => {
                        setQrCodeValue(value.trim());
                        setScanOpen(false);
                      }}
                    />
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </form>
      </StitchCard>

      {statusLoading ? (
        <div className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[rgba(0,38,55,0.56)]">
          Gutscheinstatus wird geladen...
        </div>
      ) : null}
    </div>
  );
};

export default PartnerVoucherRedeem;
