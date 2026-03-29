import type { MouseEvent } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  ensureLaunchSettingsLoaded,
  formatAccountCreationOpenDate,
  isBeforeAccountCreationOpen,
} from "@/config/launch";

export const handlePublicParticipantAccess = (
  event: MouseEvent<HTMLElement>,
  href = "/app",
) => {
  event.preventDefault();

  void ensureLaunchSettingsLoaded().then(() => {
    if (isBeforeAccountCreationOpen()) {
      const registrationOpenDate = formatAccountCreationOpenDate();

      toast({
        title: `Account-Erstellung ab ${registrationOpenDate}`,
        description:
          `Die Registrierung für den Teilnehmerbereich wird am ${registrationOpenDate} freigeschaltet. ` +
          "Bis dahin kannst du dich hier schon über Liga, Hallen und Regeln informieren.",
      });
      return;
    }

    window.location.assign(href);
  });
};
