import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MapPin, Zap } from "lucide-react";
import {
  StitchButton,
  StitchCard,
} from "@/app/components/StitchPrimitives";
import {
  type ParticipantAscentItem,
  type ParticipantGymRouteGroup,
  type ParticipantProfileData,
} from "@/app/pages/participant/participantData";
import { cn } from "@/lib/utils";

const WILDCARD_TARGET = 8;

const integerFormatter = new Intl.NumberFormat("de-DE");
const decimalFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const getTimeValue = (value: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatMetric = (value: number) => {
  if (Number.isInteger(value)) return integerFormatter.format(value);
  return decimalFormatter.format(value);
};

const formatTimelineDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((todayStart - dateStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  if (diffDays > 1 && diffDays < 7) return `Vor ${diffDays} Tagen`;
  return dateFormatter.format(date);
};

const AvatarCard = ({
  name,
  avatarUrl,
  interactive = false,
  busy = false,
  onClick,
}: {
  name: string;
  avatarUrl: string | null;
  interactive?: boolean;
  busy?: boolean;
  onClick?: () => void;
}) => {
  const content = avatarUrl ? (
    <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
  ) : (
    <span>{getInitials(name)}</span>
  );

  if (!interactive) {
    return (
      <div className="mx-auto rounded-full bg-[linear-gradient(135deg,#a15523_0%,#f2dcab_100%)] p-1 shadow-[0_22px_40px_rgba(0,0,0,0.28)]">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#003d55] bg-[rgba(242,220,171,0.1)] text-3xl font-semibold text-[#f2dcab]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "mx-auto rounded-full bg-[linear-gradient(135deg,#a15523_0%,#f2dcab_100%)] p-1 shadow-[0_22px_40px_rgba(0,0,0,0.28)] transition hover:scale-[1.01]",
        busy && "cursor-wait opacity-70",
      )}
      aria-label="Profilbild aendern"
    >
      <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#003d55] bg-[rgba(242,220,171,0.1)] text-3xl font-semibold text-[#f2dcab]">
        {content}
      </span>
    </button>
  );
};

const GymProgressCard = ({ data }: { data: ParticipantProfileData }) => {
  const progress = useMemo(
    () => (Math.min(data.visitedGyms, WILDCARD_TARGET) / WILDCARD_TARGET) * 100,
    [data.visitedGyms],
  );

  return (
    <StitchCard tone="surface" className="rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[rgba(0,38,55,0.54)]">
            Gym Hall Progress
          </div>
          <div className="mt-2 font-['Space_Grotesk'] text-[1.55rem] font-bold uppercase italic leading-[1.02] text-[#002637]">
            Hallenfortschritt
          </div>
        </div>
        <div className="pt-1 text-right">
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
            {Math.min(data.visitedGyms, WILDCARD_TARGET)} / {WILDCARD_TARGET}
          </div>
          <div className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-[rgba(0,38,55,0.52)]">
            besucht
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {data.gymProgressSlots.map((slot) => {
          const slotTone =
            slot.status === "done"
              ? "bg-[#a15523] text-[#f2dcab] shadow-[0_16px_28px_rgba(161,85,35,0.18)]"
              : slot.status === "open"
                ? "bg-[#d39b72] text-[#f2dcab]"
                : "bg-[#e9e8e4] text-[rgba(0,38,55,0.34)]";

          return (
            <div key={slot.id} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-4",
                  slotTone,
                  slot.status === "done"
                    ? "ring-[#a15523]/12"
                    : slot.status === "open"
                      ? "ring-[#a15523]/10"
                      : "ring-[rgba(0,38,55,0.04)]",
                )}
                aria-label={
                  slot.gym
                    ? `${slot.gym.name} ${slot.status === "done" ? "besucht" : "offen"}`
                    : "Leerer Wildcard-Slot"
                }
              >
                {slot.gym?.logo_url ? (
                  <img
                    src={slot.gym.logo_url}
                    alt={slot.gym.name}
                    className={cn(
                      "h-full w-full object-contain p-2.5",
                      slot.status !== "done" && "opacity-55 grayscale",
                    )}
                  />
                ) : (
                  <div className="px-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.14em]">
                    {slot.gym?.name ? slot.gym.name.slice(0, 2) : "?"}
                  </div>
                )}
              </div>
              <div className={cn("h-1 w-8 rounded-full", slot.status === "empty" ? "bg-[#dfdfdb]" : "bg-[#a15523]")} />
              <div className="text-center text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[rgba(0,38,55,0.62)]">
                {slot.gym?.name ? slot.gym.name : "Offen"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#dce5ea]">
        <div className="h-full rounded-full bg-[#a15523]" style={{ width: `${progress}%` }} />
      </div>
    </StitchCard>
  );
};

const GymRouteGroupCard = ({
  group,
  open,
  onToggle,
}: {
  group: ParticipantGymRouteGroup;
  open: boolean;
  onToggle: () => void;
}) => (
  <div className="overflow-hidden rounded-[1.8rem] border border-[rgba(0,38,55,0.06)] bg-[#ffffff] shadow-[0_16px_34px_rgba(0,61,85,0.05)]">
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-5 text-left",
        open && "bg-[rgba(0,61,85,0.04)]",
      )}
      aria-expanded={open}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-[#003d55] text-sm font-bold uppercase tracking-[0.12em] text-[#f2dcab]">
        {group.gym.logo_url ? (
          <img src={group.gym.logo_url} alt={group.gym.name} className="h-full w-full object-contain p-2" />
        ) : (
          group.gym.name.slice(0, 2)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-['Space_Grotesk'] text-lg font-bold uppercase leading-tight text-[#002637]">
          {group.gym.name}
        </div>
        <div className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
          {group.gym.city ? `${group.gym.city} | ` : ""}
          {group.loggedRoutes} / {group.totalRoutes} Routen geloggt
        </div>
      </div>

      <ChevronDown
        className={cn("h-5 w-5 shrink-0 text-[#003d55] transition-transform", open && "rotate-180")}
      />
    </button>

    {open ? (
      <div className="border-t border-[rgba(0,38,55,0.06)] bg-[#fbfaf7] px-5 py-5">
        <div className="grid grid-cols-5 gap-3">
          {group.cells.map((cell) => (
            <div
              key={cell.routeId}
              className={cn(
                "relative flex min-h-[5.3rem] flex-col justify-between rounded-[1rem] border px-2 py-3 text-center",
                cell.flash
                  ? "border-[#a15523] bg-[#fff8f2] text-[#a15523] ring-2 ring-[#a15523]"
                  : cell.hasResult
                    ? "border-[rgba(0,61,85,0.08)] bg-[#edecea] text-[#003d55]"
                    : "border-transparent bg-[#e9e8e4] text-[rgba(0,38,55,0.42)]",
              )}
            >
              <div className={cn("text-lg font-semibold leading-none", cell.flash && "text-[#a15523]")}>
                {cell.code}
              </div>
              <div className="mt-2 min-h-[1.35rem] text-[0.72rem] font-bold uppercase tracking-[0.12em]">
                {cell.flash ? (
                  <span className="inline-flex items-center justify-center gap-1 text-[#a15523]">
                    <Zap className="h-4 w-4 fill-current" />
                    Flash
                  </span>
                ) : cell.hasResult ? (
                  `${formatMetric(cell.points ?? 0)}`
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </div>
);

export const ParticipantAscentsTimeline = ({
  items,
  emptyText,
  maxItems,
}: {
  items: ParticipantAscentItem[];
  emptyText: string;
  maxItems?: number;
}) => {
  const visibleItems = typeof maxItems === "number" ? items.slice(0, maxItems) : items;

  if (visibleItems.length === 0) {
    return (
      <StitchCard tone="surface" className="p-5 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
        {emptyText}
      </StitchCard>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-8 left-[0.68rem] top-4 w-px bg-[repeating-linear-gradient(to_bottom,#c1c7cd_0,#c1c7cd_50%,transparent_50%,transparent_100%)] bg-[length:2px_8px]" />
      <div className="space-y-5">
        {visibleItems.map((item) => (
          <div key={item.id} className="relative pl-9">
            <div
              className={cn(
                "absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full border-4 border-[#fbf9f6] shadow-[0_6px_12px_rgba(0,0,0,0.08)]",
                item.flash ? "bg-[#a15523] text-white" : "bg-[#c1c7cd] text-[#c1c7cd]",
              )}
            >
              {item.flash ? <Zap className="h-3 w-3 fill-current" /> : null}
            </div>

            <StitchCard tone="surface" className="rounded-[1.35rem] p-4 shadow-[0_14px_26px_rgba(0,61,85,0.05)] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-['Space_Grotesk'] text-base font-bold uppercase leading-tight text-[#002637]">
                    {item.routeName}
                  </div>
                  <div className="mt-1 text-[0.72rem] font-medium text-[rgba(0,38,55,0.58)]">
                    {item.routeCode} • {item.gymName}
                  </div>
                  <div className="mt-2 text-[0.68rem] font-medium text-[rgba(0,38,55,0.44)]">
                    {formatTimelineDate(item.timestamp)}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className={cn("text-xl font-bold leading-none", item.flash ? "text-[#a15523]" : "text-[#002637]")}>
                    +{formatMetric(item.points)}
                  </div>
                  <div className="mt-2 text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.48)]">
                    {item.flash ? "PTS | FLASH" : "PTS"}
                  </div>
                </div>
              </div>
            </StitchCard>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ParticipantHistoryContent = ({
  data,
  backHref,
}: {
  data: ParticipantProfileData;
  backHref: string;
}) => (
  <div className="mx-auto max-w-md space-y-6">
    <StitchCard tone="navy" className="p-5 text-[#f2dcab] sm:p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.15rem] border-2 border-[rgba(242,220,171,0.54)] bg-[rgba(242,220,171,0.08)] text-xl font-semibold text-[#f2dcab]">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={data.displayName} className="h-full w-full object-cover" />
          ) : (
            getInitials(data.displayName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">View History</div>
          <div className="mt-2 font-['Space_Grotesk'] text-2xl font-bold uppercase leading-none text-[#f2dcab]">
            {data.displayName}
          </div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[rgba(242,220,171,0.66)]">
            {data.historyItems.length} Eintraege insgesamt
          </div>
        </div>
      </div>

      <StitchButton asChild variant="cream" className="mt-5 w-full justify-center">
        <Link to={backHref}>Zum Profil</Link>
      </StitchButton>
    </StitchCard>

    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="stitch-kicker text-[#9aaab2]">Recent Ascents</div>
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
          Chronologisch
        </div>
      </div>

      <ParticipantAscentsTimeline
        items={data.historyItems}
        emptyText="Noch keine eingetragenen Routen vorhanden."
      />
    </section>
  </div>
);

export const ParticipantStateCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="mx-auto max-w-md">
    <StitchCard tone="surface" className="p-5 text-center sm:p-6">
      <div className="font-['Space_Grotesk'] text-2xl font-bold uppercase leading-none text-[#002637]">
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">{description}</p>
    </StitchCard>
  </div>
);

export const ParticipantProfileContent = ({
  data,
  historyHref,
  mode,
  avatarInteractive = false,
  avatarBusy = false,
  onAvatarClick,
  headerActions,
}: {
  data: ParticipantProfileData;
  historyHref: string;
  mode: "self" | "readonly";
  avatarInteractive?: boolean;
  avatarBusy?: boolean;
  onAvatarClick?: () => void;
  headerActions?: ReactNode;
}) => {
  const [openGymId, setOpenGymId] = useState<string | null>(data.gymRouteGroups[0]?.gym.id ?? null);

  useEffect(() => {
    setOpenGymId((current) => {
      if (current && data.gymRouteGroups.some((group) => group.gym.id === current)) {
        return current;
      }
      return data.gymRouteGroups[0]?.gym.id ?? null;
    });
  }, [data.gymRouteGroups]);

  const rankingValue =
    data.rank && data.totalParticipants > 0
      ? `#${integerFormatter.format(data.rank)} / ${integerFormatter.format(data.totalParticipants)}`
      : "--";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <section className="relative pb-2">
        <StitchCard tone="navy" className="overflow-hidden rounded-[2rem] px-5 pb-16 pt-8 text-center text-[#f2dcab] sm:px-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#a15523]/10 blur-3xl" />
          <AvatarCard
            name={data.displayName}
            avatarUrl={data.avatarUrl}
            interactive={avatarInteractive}
            busy={avatarBusy}
            onClick={onAvatarClick}
          />

          <div className="mt-6 font-['Space_Grotesk'] text-[2.2rem] font-bold leading-[0.92] text-[#f2dcab]">
            {data.displayName}
          </div>

          <div className="mt-3 inline-flex items-center gap-2 text-sm text-[rgba(242,220,171,0.78)]">
            <MapPin className="h-4 w-4" />
            <span>{data.homeGymLabel}</span>
          </div>

          {headerActions ? <div className="mt-5 flex flex-wrap justify-center gap-3">{headerActions}</div> : null}
        </StitchCard>

        <StitchCard tone="cream" className="-mt-8 mx-4 rounded-[1.3rem] p-5 shadow-[0_18px_30px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.52)]">
                Ranking
              </div>
              <div className="mt-2 font-['Space_Grotesk'] text-[2.4rem] font-bold leading-none text-[#002637]">
                {rankingValue}
              </div>
            </div>

            <div>
              <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.52)]">
                Liga
              </div>
              <div className="mt-2 text-[1.35rem] font-semibold leading-tight text-[#a15523]">
                {data.leagueLabel}
              </div>
            </div>
          </div>
        </StitchCard>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Gesamtpunkte</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold leading-none text-[#002637]">
            {formatMetric(data.points)}
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Routen geloggt</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold leading-none text-[#002637]">
            {formatMetric(data.routesLogged)}
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Flash Rate</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold leading-none text-[#a15523]">
            {percentFormatter.format(data.flashRate)}%
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="rounded-[1.1rem] border-b border-[rgba(0,38,55,0.08)] bg-[#f5f3f0] p-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.46)]">Durchschnitt</div>
          <div className="mt-3 font-['Space_Grotesk'] text-3xl font-bold leading-none text-[#002637]">
            {decimalFormatter.format(data.averagePoints)}
          </div>
        </StitchCard>
      </div>

      <GymProgressCard data={data} />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="font-['Space_Grotesk'] text-[1.7rem] font-bold uppercase italic leading-none text-[#002637]">
            Gym List & Routes
          </div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.42)]">
            5 Spalten
          </div>
        </div>

        {data.gymRouteGroups.length === 0 ? (
          <StitchCard tone="surface" className="p-5 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
            Noch keine Hallen mit geloggten Routen vorhanden.
          </StitchCard>
        ) : (
          <div className="space-y-3">
            {data.gymRouteGroups.map((group) => (
              <GymRouteGroupCard
                key={group.gym.id}
                group={group}
                open={openGymId === group.gym.id}
                onToggle={() => setOpenGymId((current) => (current === group.gym.id ? null : group.gym.id))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="font-['Space_Grotesk'] text-[1.7rem] font-bold uppercase italic leading-none text-[#002637]">
            Recent Ascents
          </div>

          <Link
            to={historyHref}
            className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#a15523] transition hover:text-[#8d4419]"
          >
            View History
          </Link>
        </div>

        <ParticipantAscentsTimeline
          items={data.recentAscents}
          maxItems={5}
          emptyText="Sobald hier Routen geloggt sind, erscheint der aktuelle Verlauf in dieser Timeline."
        />
      </section>
    </div>
  );
};
