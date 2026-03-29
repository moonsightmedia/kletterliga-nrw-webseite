import { LoaderCircle } from "lucide-react";
import { featuredSponsor } from "@/data/sponsors";

type AppStartupLoadingStateProps = {
  title: string;
  description: string;
};

export const AppStartupLoadingState = ({
  title,
  description,
}: AppStartupLoadingStateProps) => {
  const sponsorName = "Kletterladen NRW";

  return (
    <div className="stitch-app stitch-auth-shell relative min-h-screen overflow-hidden">
      <div className="stitch-rope-texture absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(161,85,35,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(242,220,171,0.12),transparent_30%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16">
        <div className="space-y-6">
          <div className="stitch-headline max-w-[11ch] text-[2.55rem] leading-[0.9] text-[#f2dcab] sm:text-[2.9rem]">
            {title}
          </div>
          <p className="max-w-[24rem] text-sm leading-6 text-[rgba(242,220,171,0.76)]">
            {description}
          </p>
          <div className="inline-flex items-center gap-3 text-sm font-medium text-[rgba(242,220,171,0.84)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>App startet</span>
          </div>

          <div className="h-px bg-[rgba(242,220,171,0.12)]" />

          <div className="flex items-center gap-3 text-[rgba(242,220,171,0.68)]">
            {featuredSponsor.logoSrc ? (
              <img
                src={featuredSponsor.logoSrc}
                alt="Logo Kletterladen NRW"
                className="h-9 w-auto max-w-[7.5rem] object-contain opacity-90"
              />
            ) : null}
            <p className="text-[0.76rem] font-medium tracking-[0.02em]">
              Powered by {sponsorName}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
