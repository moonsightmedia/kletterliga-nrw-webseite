import { useState } from "react";
import { BookOpen, Clock3, ListChecks, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StitchButton } from "@/app/components/StitchPrimitives";

import { judgeOnboardingKey } from "@/lib/judgeOnboarding";

const steps = [
  {
    title: "Deine Routen auswählen",
    icon: ListChecks,
    copy: "Öffne unter den Routenuhren „Betreute Routen ändern“ und wähle die Routen deiner Station. Deine Auswahl bleibt auf diesem Gerät gespeichert.",
    hint: "Jede Route hat eine eigene Uhr. Prüfe die Routennummer vor jedem Start.",
  },
  {
    title: "Zeit nehmen und ankündigen",
    icon: Clock3,
    copy: "Starte die passende Uhr, sobald die Person ihren Versuch beginnt. Pro Start stehen 5 Minuten zur Verfügung. Kündige die letzte Minute laut an; nach Ablauf wird abgelassen.",
    hint: "Vor der nächsten Person die Uhr zurücksetzen. Ton kannst du oben einschalten – lass den Bildschirm während des Kletterns sichtbar.",
  },
  {
    title: "Ergebnis per QR bestätigen",
    icon: QrCode,
    copy: "Nach dem Klettern trägt die Person ihr Ergebnis am eigenen Handy ein. Zeige dann über das QR-Symbol an der Uhr oder den Tab „QR-Codes“ den Code der gekletterten Route zum Scannen.",
    hint: "Nach dem Scan muss die Person am eigenen Handy noch „Ergebnis absenden“ drücken. Der Scan allein speichert kein Ergebnis. Deine Routenuhren laufen weiter, während du den QR-Code zeigst.",
  },
];

export function JudgeOnboarding({ season }: { season: string }) {
  const [open, setOpen] = useState(() => {
    try { return window.localStorage.getItem(judgeOnboardingKey(season)) !== "done"; }
    catch { return true; }
  });
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  function close() {
    try { window.localStorage.setItem(judgeOnboardingKey(season), "done"); }
    catch { /* The guide remains usable when browser storage is unavailable. */ }
    setOpen(false);
  }

  return <Dialog open={open} onOpenChange={(next) => {
    if (next) { setStep(0); setOpen(true); }
    else close();
  }}>
    <DialogTrigger asChild>
      <StitchButton variant="outline" size="sm" className="min-h-11 tracking-normal"><BookOpen className="h-4 w-4" aria-hidden="true" />Kurzanleitung</StitchButton>
    </DialogTrigger>
    <DialogContent hideCloseButton aria-describedby={undefined} className="stitch-app left-[50%] top-[50%] bottom-auto right-auto grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl bg-[#f8f4ee] p-5 text-[#003d55] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:overflow-y-auto sm:p-7">
      <DialogHeader className="px-0 pt-0 text-left">
        <p className="stitch-kicker text-[#a15523]">Willkommen an deiner Station</p>
        <DialogTitle className="stitch-headline pr-0 text-2xl sm:pr-0">Kurz erklärt: Schiedsrichter</DialogTitle>
      </DialogHeader>
      <div className="flex gap-2" aria-label={`Schritt ${step + 1} von ${steps.length}`}>
        {steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#a15523]" : "bg-[#e0d9ce]"}`} />)}
      </div>
      <section className="space-y-4" aria-live="polite" aria-atomic="true">
        <div className="flex items-center gap-3 pt-2"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f2dcab]"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-xs font-bold text-[#a15523]">Schritt {step + 1} von {steps.length}</p><h2 className="stitch-headline mt-1 text-xl">{current.title}</h2></div></div>
        <p className="text-sm leading-6">{current.copy}</p>
        <p className="rounded-lg bg-[#ede8e1] p-3 text-sm leading-6 text-[#425967]">{current.hint}</p>
      </section>
      <div className="flex gap-3 pt-1">
        {step > 0 && <StitchButton variant="outline" className="min-h-12 tracking-normal" onClick={() => setStep(step - 1)}>Zurück</StitchButton>}
        <StitchButton variant="navy" className="min-h-12 flex-1 tracking-normal" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? "Los geht’s" : "Weiter"}</StitchButton>
      </div>
      <button type="button" className="min-h-11 rounded-lg text-sm font-semibold text-[#425967] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55]" onClick={close}>Anleitung schließen</button>
    </DialogContent>
  </Dialog>;
}
