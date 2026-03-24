import { cn } from "@/lib/utils";

type GymLogoBadgeProps = {
  name: string;
  logoUrl: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export const GymLogoBadge = ({
  name,
  logoUrl,
  className,
  imageClassName,
  fallbackClassName,
}: GymLogoBadgeProps) => {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center overflow-hidden bg-accent/50 -skew-x-6 transition-colors duration-300",
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={cn("h-full w-full object-contain p-1 skew-x-6", imageClassName)}
        />
      ) : (
        <span
          className={cn(
            "font-headline text-primary transition-colors duration-300 skew-x-6",
            fallbackClassName,
          )}
        >
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
};
