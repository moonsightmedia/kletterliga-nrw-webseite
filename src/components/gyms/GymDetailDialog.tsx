import { Clock, ExternalLink, Globe, MapPin, X } from "lucide-react";
import { formatGymNameLines } from "@/components/gyms/formatGymNameLines";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Gym } from "@/services/appTypes";

const mapSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

interface GymDetailDialogProps {
  gym: Gym | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GymDetailDialog = ({ gym, open, onOpenChange }: GymDetailDialogProps) => {
  const titleLines = gym ? formatGymNameLines(gym.name) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-5 sm:w-full sm:p-6"
      >
        {gym ? (
          <>
            <DialogClose className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center text-primary/68 transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" strokeWidth={2.2} />
              <span className="sr-only">Schließen</span>
            </DialogClose>

            <div className="space-y-6 pb-1">
              {gym.logo_url ? (
                <div className="flex justify-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-accent/45 md:h-28 md:w-28">
                    <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain p-3" />
                  </div>
                </div>
              ) : null}

              <DialogHeader className="px-0 pt-0">
                <DialogTitle className="text-center font-headline text-[clamp(1.9rem,8vw,3.1rem)] leading-[0.9] text-primary">
                  {titleLines.map((line) => (
                    <span key={line} className="block text-balance">
                      {line}
                    </span>
                  ))}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                {gym.address ? (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Adresse</div>
                      <div className="break-words text-sm leading-relaxed text-foreground text-pretty sm:text-base">
                        {gym.address}
                      </div>
                      {gym.city ? (
                        <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{gym.city}</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {gym.opening_hours ? (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
                        Öffnungszeiten
                      </div>
                      <div className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground text-pretty sm:text-base">
                        {gym.opening_hours}
                      </div>
                    </div>
                  </div>
                ) : null}

                {gym.website ? (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Globe className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Website</div>
                      <a
                        href={gym.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 break-words text-sm text-primary underline-offset-4 hover:underline sm:text-base"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {gym.website.replace(/^https?:\/\//, "")}
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
                {(gym.address ?? gym.city) ? (
                  <a
                    href={mapSearchUrl(gym.address ?? gym.city ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 sm:w-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MapPin size={16} />
                    In Karte anzeigen
                  </a>
                ) : null}
                {gym.website ? (
                  <a
                    href={gym.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Globe size={16} />
                    Website besuchen
                  </a>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
