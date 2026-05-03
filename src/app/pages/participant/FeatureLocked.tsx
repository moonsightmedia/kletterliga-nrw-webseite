import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, LayoutDashboard, Lock, UserRound } from "lucide-react";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { getUnlockDate } from "@/config/launch";

type Props = {
  title?: string;
  description?: string;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getLockedAreaLabel = (title: string) => {
  const cleanedTitle = title
    .replace(/\s+folgen?\s+zum\s+Saisonstart$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  switch (cleanedTitle) {
    case "Altersklassenranglisten":
      return "Altersklassen-Ranglisten";
    default:
      return cleanedTitle;
  }
};

const FeatureLocked = ({
  title = "Bereich noch nicht freigeschaltet",
  description = "Dieser Bereich wird zum Saisonstart freigeschaltet.",
}: Props) => {
  const unlock = getUnlockDate();
  const lockedAreaLabel = getLockedAreaLabel(title) || title;

  return (
    <div className="mx-auto max-w-md space-y-4 px-0 pb-6 pt-1">
      <StitchCard tone="navy" className="relative overflow-hidden rounded-xl p-5 shadow-[0_20px_44px_rgba(0,38,55,0.24)]">
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-8 h-24 w-24 rotate-12 rounded-xl bg-[#f2dcab]/6"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-12 -right-8 h-24 w-24 rotate-12 rounded-xl bg-[#a15523]/18"
        />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center rounded-xl border border-[#f2dcab]/16 bg-[#f2dcab]/10 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#f2dcab]">
            Gesperrt bis Saisonstart
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f2dcab] text-[#003d55] shadow-[0_14px_24px_rgba(0,0,0,0.18)]">
              <Lock className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h2 className="font-['Space_Grotesk'] text-[1.95rem] font-bold uppercase leading-[0.92] tracking-tight text-[#f2dcab] sm:text-[2.2rem]">
                {lockedAreaLabel}
              </h2>

              <p className="text-sm leading-6 text-[rgba(242,220,171,0.76)]">
                {description}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-[#f2dcab] px-4 py-2 text-[#002637] shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
            <CalendarDays className="h-4 w-4 text-[#a15523]" />
            <span className="font-['Space_Grotesk'] text-[0.72rem] font-bold uppercase tracking-[0.08em]">
              Freischaltung am {formatDate(unlock)}
            </span>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="surface" className="rounded-xl p-4">
        <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#71787d]">
          Bis dahin schon offen
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-[#f8f4eb] p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003d55] text-[#f2dcab]">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div>
              <div className="font-['Space_Grotesk'] text-base font-bold uppercase tracking-[0.03em] text-[#003d55]">
                Dashboard
              </div>
              <p className="mt-1 text-sm leading-6 text-[#71787d]">
                Saisonstatus, Hinweise und deine bereits freigeschalteten Bereiche bleiben erreichbar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#f8f4eb] p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003d55] text-[#f2dcab]">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <div className="font-['Space_Grotesk'] text-base font-bold uppercase tracking-[0.03em] text-[#003d55]">
                Profil
              </div>
              <p className="mt-1 text-sm leading-6 text-[#71787d]">
                Du kannst dein Profil pflegen und dich in Ruhe auf den Saisonstart vorbereiten.
              </p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchButton asChild variant="cream" size="lg" className="w-full rounded-xl border border-[#003d55]/10">
        <Link to="/app">
          Zum Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </StitchButton>
    </div>
  );
};

export default FeatureLocked;
