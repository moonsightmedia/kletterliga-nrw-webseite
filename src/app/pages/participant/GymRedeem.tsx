import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, CircleHelp, KeyRound, ScanLine, Ticket, X } from "lucide-react";
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
import { participantQueryKeys } from "@/app/pages/participant/participantQueries";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { getGym, redeemGymCode } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

const GymRedeem = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const gymId = searchParams.get("gymId");
  const [gym, setGym] = useState<Gym | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const isParticipationActivated = Boolean(profile?.participation_activated_at);

  useEffect(() => {
    if (!gymId) {
      setGym(null);
      return;
    }

    let active = true;

    getGym(gymId)
      .then(({ data }) => {
        if (active) {
          setGym(data ?? null);
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          console.error("Failed to load redeem gym", error);
        }
      });

    return () => {
      active = false;
    };
  }, [gymId]);

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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: participantQueryKeys.competitionData }),
      queryClient.invalidateQueries({
        queryKey: ["participant-unlocked-gyms", profile.id],
      }),
      data.gym_id
        ? queryClient.invalidateQueries({
            queryKey: participantQueryKeys.gymDetail(data.gym_id, profile.id),
          })
        : Promise.resolve(),
    ]);
    if (data.gym_id) {
      navigate(`/app/gyms/${data.gym_id}`, { replace: true });
    }
  };

  if (!isParticipationActivated) {
    return (
      <div className="mx-auto max-w-md">
        <StitchCard
          tone="cream"
          className="rounded-xl border border-[rgba(161,85,35,0.12)] bg-[linear-gradient(180deg,#f2dcab_0%,#ecd39a_100%)] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.24)]"
        >
          <div className="space-y-4 text-center">
            <div className="stitch-headline text-[2rem] leading-[1.02] text-[#002637]">Mastercode zuerst einlösen</div>
            <p className="text-base leading-7 text-[rgba(0,38,55,0.72)]">
              Bevor du eine Halle freischalten kannst, musst du zuerst deinen Mastercode einlösen.
            </p>
            <StitchButton type="button" size="lg" className="w-full" onClick={() => navigate("/app/participation/redeem")}>
              Zum Mastercode
              <KeyRound className="h-5 w-5" />
            </StitchButton>
          </div>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="space-y-5">
        <StitchCard
          tone="cream"
          className="overflow-hidden rounded-xl border border-[rgba(161,85,35,0.12)] bg-[linear-gradient(180deg,#f2dcab_0%,#ecd39a_100%)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.24)] sm:p-6"
        >
          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="flex justify-center pt-2">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[rgba(0,38,55,0.08)] text-[#a15523] shadow-[inset_0_-2px_0_rgba(0,38,55,0.06)]">
                  <Ticket className="h-10 w-10" />
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#a15523] text-[#f2dcab] shadow-[0_14px_28px_rgba(161,85,35,0.28)]">
                  <KeyRound className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="space-y-3 text-center">
              <div className="stitch-headline text-[2rem] leading-[1.02] text-[#002637]">
                Halle freischalten
              </div>
              <p className="mx-auto max-w-[18rem] text-base leading-7 text-[rgba(0,38,55,0.72)]">
                {gym
                  ? `Gib den Code von ${gym.name} ein, um dort Routen zu loggen und Punkte zu sammeln.`
                  : "Gib den Code deiner Halle ein, um dort Routen zu loggen und Punkte zu sammeln."}
              </p>
            </div>

            <label className="block space-y-3">
              <span className="sr-only">Hallencode</span>
              <div className="rounded-xl bg-white px-5 pb-4 pt-4 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="KL-XXXXXX-XXXX"
                  maxLength={24}
                  autoComplete="off"
                  className="w-full bg-transparent text-center font-['Space_Grotesk'] text-[1.05rem] font-bold uppercase tracking-[0.16em] text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.22)] sm:text-[1.75rem] sm:tracking-[0.28em]"
                />
                <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-[#a15523]" />
              </div>
            </label>

            <StitchButton
              type="submit"
              size="lg"
              className="w-full rounded-xl py-6 text-base shadow-[0_18px_34px_rgba(161,85,35,0.24)]"
              disabled={loading || !code.trim()}
            >
              {loading ? "Code wird geprüft..." : "Code aktivieren"}
              <CheckCircle2 className="h-5 w-5" />
            </StitchButton>

            <div className="border-t border-[rgba(0,38,55,0.08)] pt-4">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <Drawer open={scanOpen} onOpenChange={setScanOpen}>
                  <DrawerTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-[0.98rem] font-semibold text-[#002637]/88 transition hover:text-[#002637]"
                    >
                      <ScanLine className="h-4 w-4" />
                      Code scannen
                    </button>
                  </DrawerTrigger>
                  <DrawerContent
                    showHandle={false}
                    className="mx-auto max-w-md rounded-t-xl border-0 bg-[#002637] px-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[#f2dcab]"
                  >
                    <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[rgba(242,220,171,0.24)]" />

                    <DrawerHeader className="px-7 pb-0 pt-4 text-left">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <DrawerTitle className="pr-0 font-['Space_Grotesk'] text-[2rem] font-bold tracking-[-0.04em] text-[#f2dcab]">
                            Kamera-Scanner
                          </DrawerTitle>
                          <DrawerDescription className="text-base text-[rgba(242,220,171,0.62)]">
                            Code in den Rahmen halten
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

                <a
                  href="mailto:info@kletterliga-nrw.de"
                  className="inline-flex items-center gap-2 text-[0.98rem] font-semibold text-[#8d481c] transition hover:text-[#6f3916]"
                >
                  <CircleHelp className="h-4 w-4" />
                  Probleme mit dem Code?
                </a>
              </div>
            </div>
          </form>
        </StitchCard>

        <div className="pb-2 text-center text-[0.98rem] font-medium leading-7 text-[#002637]/82">
          {gym ? (
            <>
              Zurück zu{" "}
              <Link
                to={`/app/gyms/${gym.id}`}
                className="font-bold text-[#a15523] underline decoration-[#a15523]/36 underline-offset-4 transition hover:text-[#8d481c] hover:decoration-[#8d481c]"
              >
                {gym.name}
              </Link>
            </>
          ) : (
            <>
              Noch keine Partnerhalle?{" "}
              <Link
                to="/app/gyms"
                className="font-bold text-[#a15523] underline decoration-[#a15523]/36 underline-offset-4 transition hover:text-[#8d481c] hover:decoration-[#8d481c]"
              >
                Hallen ansehen
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GymRedeem;
