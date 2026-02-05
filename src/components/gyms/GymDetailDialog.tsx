import { MapPin, ExternalLink, Clock, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Gym } from "@/services/appTypes";

/** Link zu Google Maps Suche nach Adresse */
const mapSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

interface GymDetailDialogProps {
  gym: Gym | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GymDetailDialog = ({ gym, open, onOpenChange }: GymDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        {gym && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-headline">
                {gym.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Logo */}
              {gym.logo_url && (
                <div className="flex justify-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 -skew-x-6 bg-accent/50 flex items-center justify-center overflow-hidden">
                    <img 
                      src={gym.logo_url} 
                      alt={gym.name} 
                      className="skew-x-6 h-full w-full object-contain p-2" 
                    />
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                {gym.address && (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Adresse</div>
                      <div className="text-sm sm:text-base text-foreground break-words">{gym.address}</div>
                      {gym.city && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{gym.city}</div>
                      )}
                    </div>
                  </div>
                )}

                {gym.opening_hours && (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Öffnungszeiten</div>
                      <div className="text-sm sm:text-base text-foreground whitespace-pre-line break-words">{gym.opening_hours}</div>
                    </div>
                  </div>
                )}

                {gym.website && (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Website</div>
                      <a 
                        href={gym.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base text-primary underline-offset-4 hover:underline inline-flex items-center gap-1 break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {gym.website.replace(/^https?:\/\//, '')}
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                {(gym.address ?? gym.city) && (
                  <a
                    href={mapSearchUrl(gym.address ?? gym.city ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-md hover:bg-secondary/90 transition-colors text-sm font-medium w-full sm:w-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin size={16} />
                    In Karte anzeigen
                  </a>
                )}
                {gym.website && (
                  <a
                    href={gym.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 border border-border bg-background px-4 py-2.5 rounded-md hover:bg-accent transition-colors text-sm font-medium w-full sm:w-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe size={16} />
                    Website besuchen
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
