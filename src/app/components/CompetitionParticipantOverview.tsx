import { StitchBadge, StitchSectionHeading } from "@/app/components/StitchPrimitives";

export type ParticipantEntryStatus = "preparation" | "closed" | "unverified" | "absent" | "check-in" | "open" | "complete" | "probe";

const labels: Record<ParticipantEntryStatus, string> = {
  preparation: "Noch nicht geöffnet", closed: "Eingabe geschlossen",
  unverified: "Status prüfen", absent: "Teilnahme klären",
  "check-in": "Einlass ausstehend", open: "Eingabe offen",
  complete: "Vollständig", probe: "Probelauf",
};

export default function CompetitionParticipantOverview({
  className, completed, total, deadline, status, error,
}: {
  className: string;
  completed: number;
  total: number;
  deadline?: string | null;
  status: ParticipantEntryStatus;
  error?: string | null;
}) {
  const time = deadline && Number.isFinite(Date.parse(deadline))
    ? new Date(deadline).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })
    : null;
  const notice = status === "check-in"
    ? "Bitte beim Einlass melden. Die Crew bestätigt deine Anwesenheit."
    : status === "absent"
      ? "Deine Teilnahme wurde als abwesend markiert. Bitte kläre das beim Einlass."
      : null;

  return <div className="space-y-3">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Deine Routen" description={className} />
      <StitchBadge tone={status === "open" || status === "complete" ? "navy" : "ghost"}>{labels[status]}</StitchBadge>
    </header>
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#f2dcab]/20 pb-3 text-sm">
      <span><strong className="font-semibold">{completed} von {total}</strong> Ergebnissen eingetragen</span>
      {time && <span className="text-[#f2dcab]/75">Abgabe bis {time} Uhr</span>}
    </div>
    {(error || notice) && <p role={error || status === "absent" ? "alert" : "status"} className="rounded-lg border border-[#f2dcab]/25 bg-[#f2dcab]/10 px-4 py-3 text-sm leading-6">{error || notice}</p>}
  </div>;
}
