import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { RankingRowData } from "@/app/pages/participant/participantData";
import { cn } from "@/lib/utils";

const rankFormatter = new Intl.NumberFormat("de-DE");

const pointsFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const formatPoints = (value: number) => pointsFormatter.format(value);

export const formatRankingPointsDisplay = formatPoints;

const getHomeGymLabel = (row: RankingRowData) =>
  row.homeGymName && row.homeGymCity
    ? `${row.homeGymName} ${row.homeGymCity}`
    : row.homeGymName || row.homeGymCity || "Keine Heimathalle";

type RankingRowCardProps = {
  row: RankingRowData;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
  profileHref?: string | null;
};

export const RankingRowCard = ({
  row,
  isCurrentUser,
  expanded,
  onToggle,
  profileHref,
}: RankingRowCardProps) => {
  const progressValue = Math.min(row.visitedGyms, 8);
  const pointsLabel = expanded && isCurrentUser ? "Gesamtpkt" : "Pkt";
  const topRowBackground = isCurrentUser ? "bg-[#003D55]/5" : "bg-white";
  const avatarFrameClass = cn(
    "h-12 w-12 shrink-0 rounded-xl p-0.5",
    isCurrentUser ? "bg-[#A15523]" : row.rank === 1 ? "bg-[#F2DCAB]" : "bg-[rgba(242,220,171,0.35)]",
  );

  const profileSummary = (
    <>
      <div className={avatarFrameClass}>
        <div className="h-full w-full overflow-hidden rounded-[calc(0.75rem-2px)] bg-[#003D55]">
          {row.avatarUrl ? (
            <img src={row.avatarUrl} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#F2DCAB]">
              {getInitials(row.name)}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "truncate font-['Space_Grotesk'] font-bold leading-tight tracking-[-0.04em] text-[#003D55]",
              isCurrentUser ? "text-lg" : "text-base",
            )}
          >
            {row.name}
          </p>
          {isCurrentUser ? (
            <span className="shrink-0 rounded-sm bg-[#A15523] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white">
              DU
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#71787D]">
          <MapPin className="h-3 w-3 shrink-0 text-[#A15523]" />
          <span className="truncate">{getHomeGymLabel(row)}</span>
        </p>
      </div>
    </>
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "block w-full cursor-pointer overflow-hidden rounded-xl text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A15523]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6]",
        isCurrentUser
          ? "bg-white shadow-md ring-2 ring-[#A15523]"
          : "border border-[#F2DCAB]/30 bg-white shadow-sm",
      )}
      aria-expanded={expanded}
    >
      <div className={cn("flex items-center gap-4 p-4", topRowBackground)}>
        <div className="flex w-8 shrink-0 justify-center">
          <span
            className={cn(
              "font-['Space_Grotesk'] text-2xl italic leading-none",
              isCurrentUser || row.rank === 1 ? "font-black text-[#A15523]" : "font-bold text-[#003D55]/40",
            )}
          >
            {String(row.rank).padStart(2, "0")}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4">{profileSummary}</div>

        {profileHref ? (
          <Link
            to={profileHref}
            onClick={(event) => event.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#A15523] transition-colors hover:bg-[#A15523]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A15523]/30"
            aria-label={`${row.name} Profil ansehen`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}

        <div className="min-w-[4.4rem] shrink-0 text-right">
          <p
            className={cn(
              "font-['Space_Grotesk'] font-extrabold leading-none",
              isCurrentUser ? "text-xl" : "text-base",
              isCurrentUser ? "text-[#A15523]" : "text-[#003D55]",
            )}
          >
            {formatPoints(row.points)}
          </p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-tight text-[#71787D]">{pointsLabel}</p>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#003D55]/10 bg-white px-4 pb-3.5 pt-3">
          <div className="mb-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-[0.18em] text-[#003D55]/50">
                Hallen-Fortschritt
              </h4>
              <span className="font-['Space_Grotesk'] text-[10px] font-bold text-[#003D55]">
                {progressValue} / 8
              </span>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={`${row.profileId}-segment-${index}`}
                  className={cn(
                    "h-1 flex-1 rounded-xl",
                    index < progressValue ? "bg-[#A15523]" : "bg-[#003D55]/10",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 border-t border-[#003D55]/5 pt-3 text-center">
            {[
              { label: "Flash", value: row.flashCount, tone: "accent" as const },
              { label: "10 Pkt", value: row.points10, tone: "default" as const },
              { label: "7.5 Pkt", value: row.points7_5, tone: "default" as const },
              { label: "5 Pkt", value: row.points5, tone: "default" as const },
              { label: "2.5 Pkt", value: row.points2_5, tone: "default" as const },
              { label: "Routen", value: row.totalRoutes, tone: "feature" as const },
            ].map((item) => (
              <div
                key={`${row.profileId}-${item.label}`}
                className={cn(
                  "flex min-h-[2.55rem] flex-col justify-center rounded-xl",
                  item.tone === "feature" &&
                    "border border-[#F2DCAB]/80 bg-[#F8F3EA] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
                )}
              >
                <span
                  className={cn(
                    "mb-0.5 text-[7px] font-bold uppercase",
                    item.tone === "feature" ? "tracking-[0.14em] text-[#A15523]/75" : "text-[#71787D]",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-['Space_Grotesk'] text-[11px] font-bold leading-none",
                    item.tone === "accent" ? "text-[#A15523]" : "text-[#003D55]",
                  )}
                >
                  {formatPoints(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export { rankFormatter };
