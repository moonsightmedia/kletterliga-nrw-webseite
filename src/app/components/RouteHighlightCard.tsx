import { cn } from "@/lib/utils";

type RouteDiscipline = "toprope" | "lead" | null;

const getFallbackPrefix = (discipline: RouteDiscipline) => {
  if (discipline === "lead") return "V";
  if (discipline === "toprope") return "T";
  return "-";
};

const getRouteBadge = (routeCode: string | null | undefined, discipline: RouteDiscipline) => {
  const fallbackPrefix = getFallbackPrefix(discipline);
  const normalizedCode = routeCode?.trim().toUpperCase() ?? "";
  const compactCode = normalizedCode.replace(/\s+/g, "");
  const match = compactCode.match(/^([A-Z]+)(\d+)$/);

  if (match) {
    return `${match[1]}${match[2]}`;
  }

  if (compactCode) {
    return compactCode.match(/[A-Z]/) ? compactCode : `${fallbackPrefix}${compactCode}`;
  }

  return fallbackPrefix;
};

type RouteHighlightCardProps = {
  routeCode?: string | null;
  discipline?: RouteDiscipline;
  title: string;
  subtitle: string;
  eyebrow: string;
  value: string;
  interactive?: boolean;
  accent?: boolean;
  className?: string;
};

export const RouteHighlightCard = ({
  routeCode,
  discipline = null,
  title,
  subtitle,
  eyebrow,
  value,
  interactive = false,
  accent = false,
  className,
}: RouteHighlightCardProps) => {
  const badge = getRouteBadge(routeCode, discipline);

  return (
    <div
      className={cn(
        "stitch-glass-card flex items-center justify-between gap-4 rounded-xl p-5",
        interactive && "transition-colors hover:bg-[rgba(242,220,171,0.07)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={cn(
            "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2",
            accent
              ? "bg-[#a15523]/18 text-[#a15523]"
              : "bg-[rgba(0,38,55,0.14)] text-[#f2dcab]",
          )}
        >
          <div className="stitch-headline text-sm leading-none">{badge}</div>
        </div>

        <div className="min-w-0">
          <div className="truncate font-['Space_Grotesk'] text-lg font-bold text-[#f2dcab]">
            {title}
          </div>
          <div className="mt-1 text-xs font-semibold tracking-[0.06em] text-[rgba(242,220,171,0.6)]">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
          {eyebrow}
        </div>
        <div className="mt-1 stitch-headline text-lg text-[#f2dcab]">{value}</div>
      </div>
    </div>
  );
};
