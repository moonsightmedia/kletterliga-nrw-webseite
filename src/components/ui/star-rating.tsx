import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({ value, onChange, readonly = false, className, size = "md" }: StarRatingProps) {
  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      // Optional: Add hover effect
    }
  };

  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            disabled={readonly || !onChange}
            className={cn(
              "flex-1 flex items-center justify-center transition-colors border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-0",
              readonly || !onChange ? "cursor-default" : "cursor-pointer hover:scale-110",
              size === "sm" ? "py-2" : size === "lg" ? "py-3" : "py-2"
            )}
            aria-label={`${star} ${star === 1 ? "Stern" : "Sterne"}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
