import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, LayoutDashboard, Lock, UserRound } from "lucide-react";
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
      <section className="relative overflow-hidden rounded-lg bg-[#003d55] p-5 text-[#f2dcab] shadow-lg">
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#f2dcab]/6 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-10 -right-8 h-32 w-32 rotate-12 text-[#f2dcab]/5"
        >
          <Lock className="h-full w-full" strokeWidth={1.3} />
        </div>

        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f2dcab] text-[#003d55] shadow-md">
              <Lock className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-md border border-[#f2dcab]/18 bg-[#f2dcab]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f2dcab]">
                Gesperrt bis Saisonstart
              </div>

              <h2 className="mt-3 break-words font-['Space_Grotesk'] text-[1.95rem] font-bold uppercase leading-[0.92] tracking-tight text-[#f2dcab] sm:text-[2.2rem]">
                {lockedAreaLabel}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#f2dcab]/78">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#f2dcab] px-4 py-2 text-[#002637] shadow-md">
            <CalendarDays className="h-4 w-4 text-[#a15523]" />
            <span className="font-['Space_Grotesk'] text-[0.72rem] font-bold uppercase tracking-[0.08em]">
              Freischaltung am {formatDate(unlock)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#f2dcab]/30 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#71787d]">
          Bis dahin schon offen
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-[#f8f4eb] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d55] text-[#f2dcab]">
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

          <div className="flex items-start gap-3 rounded-lg bg-[#f8f4eb] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#003d55] text-[#f2dcab]">
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
      </section>

      <Link
        to="/app"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#003d55]/10 bg-[#f2dcab] py-4 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.2em] text-[#003d55] shadow-sm transition-all hover:bg-[#edd39c] active:scale-95"
      >
        Zum Dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
};

export default FeatureLocked;
