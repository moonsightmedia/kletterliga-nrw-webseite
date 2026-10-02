import { useState } from "react";
import { ChevronDown, Info, X } from "lucide-react";
import { formatCompetitionDeadline } from "@/lib/competitionDeadline";

const dismissedInSession = new Set<string>();

function ParticipantHelp({ tipKey, deadline, showTip }: { tipKey: string; deadline?: string | null; showTip: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    if (dismissedInSession.has(tipKey)) return true;
    try { return window.localStorage.getItem(tipKey) === "dismissed"; }
    catch { return false; }
  });
  const dismiss = () => {
    dismissedInSession.add(tipKey);
    try { window.localStorage.setItem(tipKey, "dismissed"); } catch { /* Optional browser storage. */ }
    setDismissed(true);
  };

  return <div className="space-y-2 text-sm">
    {showTip && !dismissed && <div className="flex items-center justify-between gap-3 text-[#f2dcab]/75">
      <p>Griff wählen → QR scannen → Ergebnis absenden.</p>
      <button type="button" aria-label="Tipp ausblenden" onClick={dismiss} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]"><X size={18} aria-hidden="true" /></button>
    </div>}
    <details className="group border-t border-[#f2dcab]/20">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab] [&::-webkit-details-marker]:hidden">
        <Info size={17} aria-hidden="true" />Hilfe zum Halbfinale<ChevronDown size={17} aria-hidden="true" className="ml-auto group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-4 leading-6 text-[#f2dcab]/80">
        <p><strong className="text-[#f2dcab]">Einlass:</strong> Die Crew bestätigt zuerst deine Anwesenheit. Danach ist die Ergebniseingabe freigeschaltet.</p>
        <p><strong className="text-[#f2dcab]">Klettern:</strong> Fünf Routen, Reihenfolge frei. An jeder Route anstellen. Bring einen Sicherungspartner mit oder tu dich mit einem anderen Teilnehmer zusammen.</p>
        <p><strong className="text-[#f2dcab]">Eintragen:</strong> Route öffnen, letzten sicher gehaltenen Griff wählen, Wert vom Schiedsrichter prüfen lassen, seinen QR-Code scannen und Ergebnis absenden. Der Scan allein speichert nichts.</p>
        {deadline && Number.isFinite(Date.parse(deadline)) && <p><strong className="text-[#f2dcab]">Frist:</strong> Alle fünf Ergebnisse bis {formatCompetitionDeadline(deadline)} Uhr eintragen. Danach ist die Eingabe geschlossen.</p>}
        <p><strong className="text-[#f2dcab]">Prüfen:</strong> Auch 0 Punkte sind ein Ergebnis. Kontrolliere deine Werte. Fehlende oder falsche Einträge bitte bei der Organisation melden; René kann sie begründet nachtragen oder korrigieren.</p>
      </div>
    </details>
  </div>;
}

export default function SemifinalWelcome({ profileId, season, deadline, showTip = true }: { profileId: string; season: string; deadline?: string | null; showTip?: boolean }) {
  const tipKey = `competition-day:tip:${profileId}:${season}:v1`;
  return <ParticipantHelp key={tipKey} tipKey={tipKey} deadline={deadline} showTip={showTip} />;
}
