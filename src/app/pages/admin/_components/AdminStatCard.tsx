import type { LucideIcon } from "lucide-react";
import { StitchCard } from "@/app/components/StitchPrimitives";
import { cn } from "@/lib/utils";

export type AdminStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  /** Tailwind classes for the icon wrapper background */
  iconWrapClassName?: string;
  /** Tailwind classes for the icon color */
  iconClassName?: string;
  /** Tailwind classes for the metric number */
  valueClassName?: string;
  className?: string;
};

export const AdminStatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  iconWrapClassName = "bg-[#003d55]/10 group-hover:bg-[#003d55]/16",
  iconClassName = "text-[#003d55]",
  valueClassName = "stitch-metric text-3xl text-[#002637]",
  className,
}: AdminStatCardProps) => (
  <StitchCard
    tone="surface"
    className={cn(
      "group relative overflow-hidden transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(0,38,55,0.12)]",
      className,
    )}
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#a15523]/[0.06] transition-colors group-hover:bg-[#a15523]/[0.1]" />
    <div className="relative p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("rounded-lg p-2 transition-colors", iconWrapClassName)}>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="stitch-kicker text-[rgba(27,28,26,0.55)]">{label}</p>
        <div className={valueClassName}>{value}</div>
        {hint ? <p className="text-xs text-[rgba(27,28,26,0.55)]">{hint}</p> : null}
      </div>
    </div>
  </StitchCard>
);
