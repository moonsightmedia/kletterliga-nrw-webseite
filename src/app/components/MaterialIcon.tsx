import { cn } from "@/lib/utils";

export const MaterialIcon = ({
  name,
  className,
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) => (
  <span
    aria-hidden="true"
    className={cn("material-symbols-outlined select-none leading-none", className)}
    style={{
      fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
    }}
  >
    {name}
  </span>
);
