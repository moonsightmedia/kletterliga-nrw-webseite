import { useEffect, useState } from "react";
import { Clock3, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StitchButton } from "@/app/components/StitchPrimitives";

const seenInSession = new Set<string>();
const welcomeKey = (profileId: string, season: string) => `competition-day:welcome:${profileId}:${season}:v2`;

export default function SemifinalWelcome({ profileId, season }: { profileId: string; season: string }) {
  const key = welcomeKey(profileId, season);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = seenInSession.has(key);
    try { seen ||= window.localStorage.getItem(key) === "seen"; } catch { /* Storage is optional. */ }
    setOpen(!seen);
  }, [key]);

  const close = () => {
    seenInSession.add(key);
    try { window.localStorage.setItem(key, "seen"); } catch { /* Keep the explanation available without storage. */ }
    setOpen(false);
  };

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#f2dcab] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]">
      <Info size={17} aria-hidden="true" />So läuft das Halbfinale
    </button>
    <Dialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()}>
      <DialogContent hideCloseButton className="stitch-app max-h-[90dvh] overflow-y-auto border-0 bg-[#f2dcab] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#003d55] sm:max-w-lg sm:overflow-y-auto sm:rounded-xl sm:p-6">
        <DialogHeader className="space-y-2 px-0 pt-0 text-left">
          <p className="stitch-kicker text-[#a15523]">Dein Halbfinale</p>
          <DialogTitle className="stitch-headline pr-0 text-2xl text-[#003d55]">Bereit für deine fünf Routen?</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#36515b]">Das Wichtigste für deinen Start:</DialogDescription>
        </DialogHeader>
        <ol className="my-5 space-y-4 text-sm leading-6">
          {[
            { title: "Beim Einlass anmelden", points: ["Die Crew bestätigt zuerst deine Anwesenheit. Danach kannst du echte Ergebnisse eintragen."] },
            { title: "Routen & Start", points: ["Fünf Routen in der App · Reihenfolge frei.", "An jeder Route anstellen – ihr seid der Reihe nach dran.", "Eigenen Sicherungspartner mitbringen oder mit einem anderen Teilnehmer zusammentun."] },
            { title: "Ergebnis eintragen", points: ["Nach jeder Route das Ergebnis direkt in der App eintragen.", "Zur Bestätigung den QR-Code des Schiedsrichters scannen.", "Wert prüfen und „Ergebnis absenden“ tippen – der Scan allein sendet nichts ab."] },
          ].map(({ title, points }, index) => <li key={title} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#003d55] font-bold text-[#f2dcab]" aria-hidden="true">{index + 1}</span>
            <div><h3 className="font-bold">{title}</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-[#36515b]">{points.map((point) => <li key={point}>{point}</li>)}</ul></div>
          </li>)}
        </ol>
        <div className="flex gap-3 rounded-lg bg-white/50 p-3 text-sm leading-6"><Clock3 size={19} className="mt-1 shrink-0" aria-hidden="true" /><div><p className="font-bold">Alle fünf Ergebnisse bis 16:00 Uhr eintragen.</p><p>Teile dir deine Zeit gut ein – inklusive Wartezeiten und Pausen.</p></div></div>
        <p className="my-4 text-sm font-bold">Wir wünschen dir viel Erfolg und viel Spaß im Halbfinale!</p>
        <StitchButton className="w-full" onClick={close}>Alles klar, los geht’s!</StitchButton>
      </DialogContent>
    </Dialog>
  </>;
}
