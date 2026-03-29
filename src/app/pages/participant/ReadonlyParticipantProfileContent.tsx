import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type {
  ParticipantAscentItem,
  ParticipantGymRouteGroup,
  ParticipantProfileData,
  ParticipantRouteCell,
} from "@/app/pages/participant/participantData";
import { getClassLabel } from "@/app/pages/participant/participantData";
import { cn } from "@/lib/utils";

const MAX_GYM_SLOTS = 8;

const integerFormatter = new Intl.NumberFormat("de-DE");
const decimalFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const rankingLabel = (rank: number | null) =>
  rank ? `#${integerFormatter.format(rank)}` : "#--";

const routePointsLabel = (points: number | null) => {
  if (points === null) return "";
  if (Number.isInteger(points)) return `${integerFormatter.format(points)} P`;
  return `${decimalFormatter.format(points)} P`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const routeTileClass = "flex aspect-square flex-col rounded-[1rem] px-1.5 py-2.5";

const RoutePerformanceTile = ({ cell }: { cell: ParticipantRouteCell }) => {
  if (cell.flash) {
    return (
      <div
        className={`${routeTileClass} relative items-center justify-center gap-1.5 border-2 border-[#a15523] bg-[#fff8f2] pt-5 text-[#a15523] shadow-[0_8px_20px_rgba(161,85,35,0.08)]`}
      >
        <div className="absolute left-1/2 top-2.5 -translate-x-1/2 whitespace-nowrap text-center font-['Space_Grotesk'] text-[0.45rem] font-bold uppercase leading-none tracking-[0.14em]">
          Flash
        </div>
        <div className="font-['Space_Grotesk'] text-[1.25rem] font-bold leading-none">{cell.code}</div>
        <Zap className="h-5 w-5 fill-current" />
      </div>
    );
  }

  if (cell.hasResult) {
    return (
      <div className={`${routeTileClass} items-center justify-between bg-[#eceae7] text-[#002637]`}>
        <div className="font-['Space_Grotesk'] text-[1.25rem] font-bold leading-none">{cell.code}</div>
        <div className="font-['Space_Grotesk'] text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#365163]">
          {routePointsLabel(cell.points)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${routeTileClass} items-center justify-center bg-[#f1efec] text-[rgba(0,38,55,0.38)]`}>
      <div className="font-['Space_Grotesk'] text-[1.25rem] font-bold leading-none">{cell.code}</div>
    </div>
  );
};

const GymRouteAccordionCard = ({
  group,
  open,
  onToggle,
}: {
  group: ParticipantGymRouteGroup;
  open: boolean;
  onToggle: () => void;
}) => {
  const gymLabel = group.gym.city ? `${group.gym.name} ${group.gym.city}` : group.gym.name;

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[rgba(0,38,55,0.06)] bg-white shadow-[0_18px_34px_rgba(0,61,85,0.06)]">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-4 px-5 py-5 text-left transition",
          open && "bg-[#fbfaf7]",
        )}
        aria-expanded={open}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] bg-[#1a4660] text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#f2dcab]">
          {group.gym.logo_url ? (
            <img src={group.gym.logo_url} alt={group.gym.name} className="h-full w-full object-contain p-2" />
          ) : (
            getInitials(group.gym.name)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-['Space_Grotesk'] text-[1.05rem] font-bold uppercase leading-tight text-[#002637]">
            {gymLabel}
          </div>
          <div className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
            {group.loggedRoutes}/{group.totalRoutes} Routen eingetragen
          </div>
        </div>

        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-[#002637] transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="border-t border-[rgba(0,38,55,0.05)] bg-white px-4 py-4">
          <div className="grid grid-cols-5 gap-2">
            {group.cells.map((cell) => (
              <RoutePerformanceTile key={cell.routeId} cell={cell} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const stats = (data: ParticipantProfileData) => [
  { label: "Gesamtpunkte", value: data.formattedPoints, accent: false },
  { label: "Routen eingetragen", value: integerFormatter.format(data.routesLogged), accent: false },
  { label: "Flash-Quote", value: `${percentFormatter.format(data.flashRate)}%`, accent: true },
  { label: "Punkte im Schnitt", value: decimalFormatter.format(data.averagePoints), accent: false },
];

const AscentTimeline = ({ items }: { items: ParticipantAscentItem[] }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[1rem] bg-[#f5f3f0] p-4 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
        Sobald hier Routen geloggt sind, erscheint der aktuelle Verlauf.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.slice(0, 5).map((item, index, visibleItems) => {
        const isFlash = item.flash;
        const isLast = index === visibleItems.length - 1;
        const meta = `${item.routeCode} | ${item.gymName}`;

        return (
          <div key={item.id} className={cn("relative flex gap-5", !isLast && "pb-8")}>
            {!isLast ? (
              <div className="absolute bottom-0 left-[11px] top-6 w-[2px] bg-[#c1c7cd] opacity-40" />
            ) : null}

            <div
              className={cn(
                "relative z-10 h-6 w-6 shrink-0 rounded-full border-4 border-[#fbf9f6]",
                isFlash ? "bg-[#934a19] ring-4 ring-[#934a19]/10" : "bg-[#c1c7cd]",
              )}
            />

            <div className="flex flex-1 items-center justify-between rounded-[1rem] bg-[#f5f3f0] p-4">
              <div className="min-w-0 pr-4">
                <h5 className="truncate font-['Space_Grotesk'] text-sm font-bold uppercase text-[#002637]">
                  {item.routeName}
                </h5>
                <p className="mt-1 truncate text-[11px] font-medium text-[#41484c]">{meta}</p>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "block font-['Space_Grotesk'] text-lg font-bold",
                    isFlash ? "text-[#934a19]" : "text-[#002637]",
                  )}
                >
                  {integerFormatter.format(item.points)}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-tight text-[#71787d]">
                  {isFlash ? "PKT | FLASH" : "PKT | TOP"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ReadonlyParticipantProfileContent = ({
  data,
  historyHref,
}: {
  data: ParticipantProfileData;
  historyHref: string;
}) => {
  const progressPercent = Math.min(100, (Math.min(data.visitedGyms, MAX_GYM_SLOTS) / MAX_GYM_SLOTS) * 100);
  const classLabel = getClassLabel(data.className);
  const [openGymId, setOpenGymId] = useState<string | null>(data.gymRouteGroups[0]?.gym.id ?? null);

  useEffect(() => {
    setOpenGymId((current) => {
      if (current && data.gymRouteGroups.some((group) => group.gym.id === current)) {
        return current;
      }
      return data.gymRouteGroups[0]?.gym.id ?? null;
    });
  }, [data.gymRouteGroups]);

  return (
    <div className="w-full">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#003d55] to-[#002637] px-6 pb-12 pt-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#934a19] opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="h-28 w-28 rounded-[1.35rem] border-[4px] border-[#a15523] bg-[#113447] p-1 shadow-xl">
              <div className="h-full w-full overflow-hidden rounded-[1rem] bg-[#0d2a39]">
                {data.avatarUrl ? (
                  <img src={data.avatarUrl} alt={data.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-['Space_Grotesk'] text-4xl font-bold uppercase text-[#f2dcab]">
                      {getInitials(data.displayName)}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-[#f2dcab]">
            {data.displayName}
          </h1>
          <p className="mt-1 flex items-center gap-2 font-medium tracking-wide text-[#7aa8c4]">
            <MapPin className="h-4 w-4" />
            <span>{data.homeGymLabel}</span>
          </p>
        </div>
      </section>

      <section className="-mt-8 px-6">
        <div className="relative z-20 rounded-[1rem] border-b-4 border-[#7aa8c4]/20 bg-[#f7e0af] p-6 shadow-xl">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <span className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] text-[#534521]">
                Liga Platzierung
              </span>
              <h2 className="font-['Space_Grotesk'] text-5xl font-bold tracking-tighter text-[#003d55]">
                {rankingLabel(data.rank)}
              </h2>
            </div>

            <div className="min-w-0 space-y-3 text-right">
              <div>
                <span className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] text-[#534521]">
                  Altersklasse
                </span>
                <div className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-[#934a19]">
                  {classLabel}
                </div>
              </div>

              <div>
                <span className="block font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] text-[#534521]">
                  Liga
                </span>
                <div className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-[#934a19]">
                  {data.leagueLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <h3 className="mb-4 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] text-[#41484c]">
          Saisonstatistiken
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {stats(data).map((item) => (
            <div
              key={item.label}
              className="rounded-[1rem] border-b-2 border-[#c1c7cd]/30 bg-[#f5f3f0] p-4 transition-transform active:scale-95"
            >
              <span className="mb-1 block font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-widest text-[#41484c]">
                {item.label}
              </span>
              <p
                className={cn(
                  "font-['Space_Grotesk'] text-2xl font-bold",
                  item.accent ? "text-[#934a19]" : "text-[#002637]",
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 px-6">
        <div className="rounded-[1.75rem] bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)] p-5 text-[#f2dcab] shadow-[0_20px_40px_rgba(0,38,55,0.16)]">
          <div className="space-y-2">
            <div className="font-['Space_Grotesk'] text-[1.5rem] font-bold uppercase leading-[1.02] text-[#f2dcab]">
              Hallenfortschritt
            </div>
            <p className="text-sm leading-6 text-[rgba(242,220,171,0.68)]">
              Besuche 8 verschiedene Hallen in NRW für das Finale.
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/20">
            <div className="h-full rounded-full bg-[#a15523]" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-2 flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.45)]">
            <span>Start</span>
            <span className="text-sm text-[#a15523]">
              {Math.min(data.visitedGyms, MAX_GYM_SLOTS)} von 8 Hallen
            </span>
            <span>Finale</span>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {data.gymProgressSlots.slice(0, MAX_GYM_SLOTS).map((slot) => {
              const logoUrl = slot.gym?.logo_url ?? null;
              const slotTone =
                slot.status === "done"
                  ? "border-[#a15523]/60 bg-[#a15523]/16 shadow-[0_16px_28px_rgba(161,85,35,0.18)]"
                  : slot.status === "open"
                    ? "border-[rgba(242,220,171,0.12)] bg-black/20"
                    : "border-[rgba(242,220,171,0.08)] bg-black/10";

              return (
                <div
                  key={slot.id}
                  className={`flex aspect-square items-center justify-center overflow-hidden rounded-[0.95rem] border ${slotTone}`}
                  aria-label={
                    slot.gym
                      ? `${slot.gym.name} ${slot.status === "done" ? "besucht" : "offen"}`
                      : "Leerer Wildcard-Slot"
                  }
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={slot.gym?.name || "Hallenlogo"}
                      className={`h-full w-full object-contain p-2.5 ${
                        slot.status === "done" ? "" : "opacity-45 grayscale"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center px-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                        slot.status === "done"
                          ? "text-[#f2dcab]"
                          : "text-[rgba(242,220,171,0.45)]"
                      }`}
                    >
                      {slot.gym?.name ? getInitials(slot.gym.name) : "Offen"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10 px-6">
        <h3 className="mb-4 font-['Space_Grotesk'] text-[1.5rem] font-bold uppercase italic leading-none text-[#002637]">
          Gym List & Routes
        </h3>

        {data.gymRouteGroups.length === 0 ? (
          <div className="rounded-[1.25rem] bg-[#f5f3f0] p-4 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
            Noch keine Hallen mit eingetragenen Routen vorhanden.
          </div>
        ) : (
          <div className="space-y-4">
            {data.gymRouteGroups.map((group) => (
              <GymRouteAccordionCard
                key={group.gym.id}
                group={group}
                open={openGymId === group.gym.id}
                onToggle={() => setOpenGymId((current) => (current === group.gym.id ? null : group.gym.id))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 px-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.2em] text-[#41484c]">
            Letzte Begehungen
          </h3>
          <Link
            to={historyHref}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#934a19] transition hover:opacity-80"
          >
            <span>Verlauf ansehen</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <AscentTimeline items={data.recentAscents} />
      </section>
    </div>
  );
};

export default ReadonlyParticipantProfileContent;
