import { LoaderCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type RouteLoadingStateProps = {
  title: string;
  description: string;
  fullscreen?: boolean;
  className?: string;
};

export const RouteLoadingState = ({
  title,
  description,
  fullscreen = true,
  className,
}: RouteLoadingStateProps) => (
  <div
    className={cn(
      "stitch-app stitch-auth-shell relative overflow-hidden",
      fullscreen ? "min-h-screen" : "min-h-full",
      className,
    )}
  >
    <div className="stitch-rope-texture absolute inset-0 opacity-40" />

    <div
      className={cn(
        "relative z-10 flex items-center justify-center px-4 py-10 sm:px-6",
        fullscreen ? "min-h-screen" : "min-h-full",
      )}
    >
      <div className="w-full max-w-md rounded-[2rem] bg-[#f2dcab] p-6 text-[#002637] shadow-[0_28px_52px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-[1.25rem] bg-[#003d55] p-3 shadow-[0_16px_28px_rgba(0,0,0,0.18)]">
            <img src={logo} alt="Kletterliga NRW" className="h-10 w-10 object-contain" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="stitch-kicker text-[#a15523]">Bitte kurz warten</div>
            <div className="stitch-headline text-3xl leading-[0.94] text-[#002637]">{title}</div>
            <p className="text-sm leading-6 text-[rgba(27,28,26,0.72)]">{description}</p>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#003d55] px-4 py-2 text-sm font-semibold text-[#f2dcab]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Inhalt wird vorbereitet
        </div>
      </div>
    </div>
  </div>
);
