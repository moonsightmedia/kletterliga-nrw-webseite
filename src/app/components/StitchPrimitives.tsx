import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const stitchButtonVariants = cva(
  "stitch-headline inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border px-4 py-3 text-[0.74rem] font-bold tracking-[0.24em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-[#a15523] bg-[#a15523] text-white shadow-[0_14px_28px_rgba(161,85,35,0.28)] hover:brightness-110",
        navy:
          "border-[#003d55] bg-[#003d55] text-[#f2dcab] shadow-[0_14px_28px_rgba(0,61,85,0.24)] hover:brightness-110",
        cream:
          "border-[#f2dcab] bg-[#f2dcab] text-[#002637] shadow-[0_14px_28px_rgba(242,220,171,0.24)] hover:brightness-[1.04]",
        outline:
          "border-[rgba(0,38,55,0.14)] bg-white/70 text-[#003d55] backdrop-blur hover:border-[rgba(0,38,55,0.24)] hover:bg-white",
        ghost:
          "border-transparent bg-transparent text-[#003d55] hover:bg-[rgba(0,38,55,0.06)]",
      },
      size: {
        sm: "min-h-10 px-3 py-2 text-[0.64rem]",
        default: "min-h-12 px-4 py-3",
        lg: "min-h-[3.35rem] px-6 py-4 text-[0.78rem]",
        icon: "h-11 w-11 rounded-full p-0 text-base tracking-normal",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type StitchButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof stitchButtonVariants> & {
    asChild?: boolean;
  };

export const StitchButton = React.forwardRef<HTMLButtonElement, StitchButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(stitchButtonVariants({ variant, size, className }))} {...props} />;
  },
);
StitchButton.displayName = "StitchButton";

const toneClasses = {
  surface: "stitch-surface-card",
  cream: "stitch-cream-card",
  muted: "stitch-muted-card",
  glass: "stitch-glass-card",
  navy: "stitch-navy-card",
} as const;

export const StitchCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof toneClasses }
>(({ className, tone = "surface", ...props }, ref) => (
  <div ref={ref} className={cn("overflow-hidden", toneClasses[tone], className)} {...props} />
));
StitchCard.displayName = "StitchCard";

export const StitchBadge = ({
  className,
  tone = "terracotta",
  children,
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "terracotta" | "cream" | "navy" | "ghost";
}) => {
  const badgeTone =
    tone === "terracotta"
      ? "bg-[#a15523] text-white"
      : tone === "cream"
        ? "bg-[#f2dcab] text-[#002637]"
        : tone === "navy"
          ? "bg-[#003d55] text-[#f2dcab]"
          : "border border-[rgba(0,38,55,0.1)] bg-white/70 text-[#003d55]";

  return (
    <div
      className={cn(
        "stitch-headline inline-flex items-center rounded-full px-3 py-1 text-[0.58rem] font-bold tracking-[0.22em]",
        badgeTone,
        className,
      )}
    >
      {children}
    </div>
  );
};

export const StitchSectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) => (
  <div className={cn("space-y-3", align === "center" && "text-center", className)}>
    {eyebrow ? <div className="stitch-kicker text-[#a15523]">{eyebrow}</div> : null}
    <div className="stitch-headline text-3xl leading-[0.92] text-[#002637] sm:text-4xl">{title}</div>
    {description ? <p className="max-w-2xl text-sm leading-6 text-[rgba(27,28,26,0.64)]">{description}</p> : null}
  </div>
);

export const StitchTextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon?: React.ReactNode;
    hint?: string | null;
    error?: string | null;
  }
>(({ className, icon, label, hint, error, ...props }, ref) => (
  <label className="block space-y-1.5">
    <span className="stitch-kicker text-[rgba(0,38,55,0.6)]">{label}</span>
    <span className="stitch-field-shell flex items-center gap-3 px-4 py-3">
      {icon ? <span className="text-[rgba(0,38,55,0.36)]">{icon}</span> : null}
      <input ref={ref} className={cn("stitch-input min-w-0", className)} {...props} />
    </span>
    {error ? <span className="text-xs font-semibold text-[#ba1a1a]">{error}</span> : null}
    {!error && hint ? <span className="text-xs text-[rgba(0,38,55,0.56)]">{hint}</span> : null}
  </label>
));
StitchTextField.displayName = "StitchTextField";

export const StitchTextareaField = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    hint?: string | null;
    error?: string | null;
  }
>(({ className, label, hint, error, ...props }, ref) => (
  <label className="block space-y-1.5">
    <span className="stitch-kicker text-[rgba(0,38,55,0.6)]">{label}</span>
    <span className="stitch-field-shell flex px-4 py-3">
      <textarea ref={ref} className={cn("stitch-textarea min-h-24 resize-none", className)} {...props} />
    </span>
    {error ? <span className="text-xs font-semibold text-[#ba1a1a]">{error}</span> : null}
    {!error && hint ? <span className="text-xs text-[rgba(0,38,55,0.56)]">{hint}</span> : null}
  </label>
));
StitchTextareaField.displayName = "StitchTextareaField";

export const StitchSelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    hint?: string | null;
    error?: string | null;
    icon?: React.ReactNode;
  }
>(({ children, className, label, hint, error, icon, ...props }, ref) => (
  <label className="block space-y-1.5">
    <span className="stitch-kicker text-[rgba(0,38,55,0.6)]">{label}</span>
    <span className="stitch-field-shell flex items-center gap-3 px-4 py-3">
      {icon ? <span className="text-[rgba(0,38,55,0.36)]">{icon}</span> : null}
      <span className="relative block flex-1">
        <select ref={ref} className={cn("stitch-select pr-8", className)} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(0,38,55,0.42)]" />
      </span>
    </span>
    {error ? <span className="text-xs font-semibold text-[#ba1a1a]">{error}</span> : null}
    {!error && hint ? <span className="text-xs text-[rgba(0,38,55,0.56)]">{hint}</span> : null}
  </label>
));
StitchSelectField.displayName = "StitchSelectField";
