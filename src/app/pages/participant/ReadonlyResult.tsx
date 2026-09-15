import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StitchButton } from "@/app/components/StitchPrimitives";
import type { Result, Route } from "@/services/appTypes";
import type { QualificationPhase } from "@/services/qualificationPhase";
import { QualificationNotice } from "./QualificationNotice";

export function ReadonlyResult({ route, result, phase, qualificationEnd }: {
  route: Route;
  result: Result | null;
  phase: QualificationPhase | "loading";
  qualificationEnd: string | null;
}) {
  const number = (value: number) => value.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return (
    <div className="space-y-6 px-4 py-6 text-[#002637] sm:px-6">
      <QualificationNotice phase={phase} end={qualificationEnd} />
      <article className="space-y-6 rounded-xl bg-[#fbf9f6] p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="stitch-kicker text-[#a15523]">Dein gespeichertes Ergebnis</p>
            <h1 className="mt-3 break-words font-['Space_Grotesk'] text-3xl font-bold leading-tight">{route.name || route.code}</h1>
            <p className="mt-2 text-sm">{route.discipline === "lead" ? "Vorstieg" : "Toprope"}{route.grade_range ? ` · ${route.grade_range}` : ""}</p>
          </div>
          <span className="shrink-0 rounded-xl bg-[#003d55] px-3 py-3 font-['Space_Grotesk'] text-2xl font-bold text-[#f2dcab]">{route.code}</span>
        </header>
        {result ? <>
          <div className="rounded-xl bg-[#003d55] p-5 text-[#f2dcab]">
            <p className="text-sm">{result.flash ? "Flash · inklusive Bonus" : result.points > 0 ? "Gespeicherte Wertung" : "Nicht geklettert"}</p>
            <p className="mt-2 font-['Space_Grotesk'] text-5xl font-bold">{number(Number(result.points) + (result.flash ? 1 : 0))} <span className="text-lg">Punkte</span></p>
          </div>
          <dl className="space-y-5 text-sm leading-6">
            <div><dt className="font-bold">Routenqualität</dt><dd>{result.rating == null ? "Keine Bewertung abgegeben" : `${number(Number(result.rating))} von 5 Sternen`}</dd></div>
            <div><dt className="font-bold">Dein Feedback</dt><dd className="whitespace-pre-wrap break-words">{result.feedback || "Kein Feedback hinterlegt"}</dd></div>
          </dl>
        </> : <p className="rounded-xl bg-white p-5 text-sm leading-6">Für diese Route wurde kein Ergebnis eingetragen. {phase === "closed" ? "Nach Ende der Qualifikation können keine Einträge mehr ergänzt werden." : "Neue Einträge sind aktuell nicht freigegeben."}</p>}
        <p className="text-sm leading-6">Eine notwendige Korrektur kannst du bei der Organisation anfragen: <a className="font-semibold underline underline-offset-4" href="mailto:info@kletterliga-nrw.de">info@kletterliga-nrw.de</a>.</p>
      </article>
      <div className="flex flex-col gap-3">
        {phase === "closed" && <StitchButton asChild className="whitespace-normal text-center tracking-wider"><Link to="/app/finale">Halbfinale & Anmeldung <ArrowRight className="h-4 w-4 shrink-0" /></Link></StitchButton>}
        <StitchButton asChild variant="cream"><Link to={`/app/gyms/${route.gym_id}/routes`}><ArrowLeft className="h-4 w-4" /> Zur Routenliste</Link></StitchButton>
      </div>
    </div>
  );
}
