import { useMemo } from "react";
import { CalendarDays, Route as RouteIcon } from "lucide-react";
import { StitchCard } from "@/app/components/StitchPrimitives";
import {
  type ParticipantHistorySession,
  type ParticipantProfileData,
} from "@/app/pages/participant/participantData";
import { cn } from "@/lib/utils";

const integerFormatter = new Intl.NumberFormat("de-DE");
const decimalFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabelFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  timeZone: "UTC",
});

const formatMetric = (value: number) => {
  if (Number.isInteger(value)) return integerFormatter.format(value);
  return decimalFormatter.format(value);
};

const formatSessionDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
};

const getMonthLabelFromKey = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

const getHistoryMarkerTone = (monthIndex: number, sessionIndex: number) => {
  if (monthIndex === 0 && sessionIndex === 0) return "bg-[#a15523] text-white";
  if (monthIndex === 0) return "bg-[#003d55] text-white";
  return "bg-[#c1c7cd] text-white";
};

type ParticipantHistoryMonthGroup = {
  monthKey: string;
  monthLabel: string;
  sessions: ParticipantHistorySession[];
};

export const ParticipantHistoryContent = ({
  data,
}: {
  data: ParticipantProfileData;
}) => {
  const monthGroups = useMemo(() => {
    return data.historySessions.reduce<ParticipantHistoryMonthGroup[]>((groups, session) => {
      const existingGroup = groups.find((group) => group.monthKey === session.monthKey);
      if (existingGroup) {
        existingGroup.sessions.push(session);
        return groups;
      }

      groups.push({
        monthKey: session.monthKey,
        monthLabel: session.monthLabel || getMonthLabelFromKey(session.monthKey),
        sessions: [session],
      });
      return groups;
    }, []);
  }, [data.historySessions]);

  const seasonYear =
    data.historySessions[0]?.sessionDate.slice(0, 4) ??
    data.historyItems[0]?.timestamp?.slice(0, 4) ??
    String(new Date().getFullYear());
  const historySessionCount = data.historySessions.length;
  const bestGymGroup = useMemo(() => {
    return data.gymRouteGroups.reduce<ParticipantProfileData["gymRouteGroups"][number] | null>((best, group) => {
      if (!best) return group;
      if (group.totalPoints !== best.totalPoints) return group.totalPoints > best.totalPoints ? group : best;
      if (group.loggedRoutes !== best.loggedRoutes) return group.loggedRoutes > best.loggedRoutes ? group : best;
      return group.gym.name.localeCompare(best.gym.name, "de") < 0 ? group : best;
    }, null);
  }, [data.gymRouteGroups]);

  return (
    <div className="mx-auto w-full max-w-xl px-6 pt-8">
      <section className="mb-12">
        <h2 className="font-['Space_Grotesk'] text-[2.1rem] font-bold tracking-tight text-[#002637]">
          Zusammenfassung
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="relative col-span-2 overflow-hidden rounded-xl bg-[#f2dcab] p-6 shadow-[0_12px_26px_rgba(0,38,55,0.06)]">
            <div className="relative z-10">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#a15523]">Beste Halle</p>
              {bestGymGroup ? (
                <>
                  <p className="mt-2 font-['Space_Grotesk'] text-[2.35rem] font-bold leading-[1.02] tracking-tight text-[#002637]">
                    {bestGymGroup.gym.name}
                  </p>
                  <p className="mt-4 text-base font-medium text-[#002637]/70">
                    {bestGymGroup.gym.city ? `${bestGymGroup.gym.city}, NRW` : "Saisonperformance"}
                  </p>
                  <div className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/35 px-3.5 py-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#a15523]">
                    <span>{formatMetric(bestGymGroup.totalPoints)} Punkte</span>
                    <span className="text-[#002637]/35">•</span>
                    <span>{integerFormatter.format(bestGymGroup.loggedRoutes)} Routen</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 font-['Space_Grotesk'] text-[2.35rem] font-bold leading-[1.02] tracking-tight text-[#002637]">
                    Noch keine Halle
                  </p>
                  <p className="mt-4 text-base font-medium text-[#002637]/70">
                    Es wurden noch keine Hallenbesuche eingetragen.
                  </p>
                </>
              )}
            </div>

            <div className="absolute -bottom-8 -right-2 h-28 w-28 rotate-45 rounded-xl bg-[#002637]/5" />
            <div className="absolute bottom-6 right-16 h-14 w-14 rotate-45 rounded-xl bg-[#002637]/5" />
          </div>

          <div className="rounded-xl bg-[#f5f3f0] p-5 shadow-[0_10px_24px_rgba(0,38,55,0.04)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#71787d]">Sessions</p>
            <p className="mt-3 font-['Space_Grotesk'] text-[2.45rem] font-bold leading-none text-[#002637]">
              {integerFormatter.format(historySessionCount)}
            </p>
          </div>

          <div className="rounded-xl bg-[#f5f3f0] p-5 shadow-[0_10px_24px_rgba(0,38,55,0.04)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#71787d]">Total Points</p>
            <p className="mt-3 font-['Space_Grotesk'] text-[2.45rem] font-bold leading-none text-[#a15523]">
              {data.formattedPoints}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-2">
        <div className="mb-8 flex items-end justify-between gap-3 pr-0 sm:gap-4">
          <h2 className="min-w-0 flex-1 font-['Space_Grotesk'] text-[2.1rem] font-bold tracking-tight text-[#002637]">
            Chronologischer Verlauf
          </h2>
          <span className="shrink-0 text-right leading-tight text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[#a15523] sm:text-[0.72rem] sm:tracking-[0.18em]">
            Saison {seasonYear}
          </span>
        </div>

        {monthGroups.length === 0 ? (
          <StitchCard tone="surface" className="p-5 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
            Noch keine eingetragenen Routen vorhanden.
          </StitchCard>
        ) : (
          <div className="space-y-0">
            {monthGroups.map((group, monthIndex) => (
              <div key={group.monthKey} className={cn(monthIndex < monthGroups.length - 1 && "mb-10")}>
                <h3 className="mb-6 border-b border-[#c1c7cd]/20 pb-2 font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.2em] text-[#c1c7cd]">
                  {group.monthLabel.toUpperCase()}
                </h3>

                <div className="space-y-6">
                  {group.sessions.map((session, sessionIndex) => (
                    <div key={session.id} className="relative flex items-start gap-6">
                      {sessionIndex < group.sessions.length - 1 ? (
                        <div className="absolute bottom-[-20px] left-[11px] top-10 w-[2px] bg-[#c1c7cd]/40" />
                      ) : null}

                      <div className="z-10 mt-1">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full",
                            getHistoryMarkerTone(monthIndex, sessionIndex),
                          )}
                        >
                          <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        </div>
                      </div>

                      <div className="flex-1 rounded-xl bg-white p-5 shadow-[0_10px_24px_rgba(0,38,55,0.05)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="font-['Space_Grotesk'] text-[1.75rem] font-bold leading-tight tracking-tight text-[#002637]">
                              {session.gymName}
                            </h4>
                            {session.gymCity ? (
                              <p className="mt-1 text-sm font-medium text-[#71787d]">{session.gymCity}, NRW</p>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="font-['Space_Grotesk'] text-[1.8rem] font-bold leading-none text-[#a15523]">
                              +{formatMetric(session.totalPoints)}
                            </p>
                            <p className="mt-2 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[#71787d]">
                              Punkte
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                          <div className="flex items-center gap-2 text-[#002637]">
                            <RouteIcon className="h-4 w-4 text-[#003d55]" />
                            <span className="text-base font-bold">
                              {integerFormatter.format(session.routeCount)}{" "}
                              <span className="text-sm font-normal text-[#71787d]">Routen</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[#002637]">
                            <CalendarDays className="h-4 w-4 text-[#003d55]" />
                            <span className="text-base font-bold">{formatSessionDate(session.sessionDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
