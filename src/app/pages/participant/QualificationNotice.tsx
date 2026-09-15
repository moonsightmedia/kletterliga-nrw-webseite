import { LockKeyhole } from "lucide-react";
import { formatCompetitionDate, type QualificationPhase } from "@/services/qualificationPhase";

export function QualificationNotice({ phase, end }: { phase: QualificationPhase | "loading"; end: string | null }) {
  const closed = phase === "closed";
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#f2dcab] p-4 text-[#002637]" role="status">
      <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-sm leading-6">
        <p className="font-bold">{closed ? "Qualifikation abgeschlossen" : "Ergebniseingabe gesperrt"}</p>
        <p>{closed
          ? `Die Qualifikation endete am ${formatCompetitionDate(end)}. Deine Einträge bleiben einsehbar und können nicht mehr bearbeitet werden.`
          : phase === "upcoming"
            ? "Die Qualifikation hat noch nicht begonnen. Vorhandene Einträge kannst du weiterhin ansehen."
            : "Die Freigabe der Ergebniseingabe konnte noch nicht bestätigt werden. Deine gespeicherten Einträge bleiben unverändert."}</p>
      </div>
    </div>
  );
}
