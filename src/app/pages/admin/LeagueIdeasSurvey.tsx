import { useEffect, useState } from "react";
import { ChevronDown, Lightbulb, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "./_components/AdminPageHeader";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entryAnswer, ideasPercent, ideasReportDate, ideasReportSections, reportOptionRows } from "@/lib/ideasSurveyReport";
import { emptyIdeasReportFilters, IDEAS_REPORT_PAGE_SIZE, loadIdeasSurveyReport, type IdeasQuestionReport, type IdeasReportFilters, type IdeasReportSource, type IdeasReportStatus, type IdeasSurveyReport } from "@/services/ideasSurveyAdminApi";
import type { SurveyQuestion } from "@/lib/ideasSurvey2027";

function QuestionResults({ question, report }: { question: SurveyQuestion; report: IdeasQuestionReport }) {
  return <section aria-label={question.title} className="min-w-0 space-y-4">
    <div><h3 className="text-sm font-semibold leading-6">{question.title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#526570]">{report.answered} beantwortet · {report.eligible - report.answered} unbeantwortet{question.when ? " · nur bei gewünschter Teamwertung" : ""}</p></div>
    <dl className="space-y-3">{reportOptionRows(question, report).map(row => <div key={row.key}>
      <div className="mb-1.5 flex items-start justify-between gap-3 text-sm"><dt className="min-w-0 leading-5">{row.label}</dt><dd className="shrink-0 text-right font-semibold tabular-nums">{row.count}<span className="ml-2 inline-block min-w-12 font-normal text-[#526570]">{ideasPercent(row.percent)}</span></dd></div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#003d55]/[0.07]"><div className="h-full rounded-full bg-[#a15523]" style={{ width: `${row.percent ?? 0}%` }} /></div>
    </div>)}</dl>
    {report.answered === 0 && <p className="text-xs text-[#526570]">Noch keine Antwort auf diese Frage.</p>}
    {question.multiple && <p className="text-xs leading-5 text-[#526570]">Mehrfachauswahl: Anteile können zusammen über 100 % liegen.</p>}
    {(question.description || question.options.some(o => o.description)) && <details className="text-xs leading-5 text-[#526570]"><summary className="min-h-8 cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#003d55]">So wurde gefragt</summary><div className="mt-2 space-y-2">{question.description && <p>{question.description}</p>}{question.options.filter(o => o.description).map(o => <p key={o.value}><span className="font-medium">{o.label}: </span>{o.description}</p>)}</div></details>}
  </section>;
}

export function IdeasSurveyDashboard({ source = loadIdeasSurveyReport }: { source?: IdeasReportSource }) {
  const [filters, setFilters] = useState<IdeasReportFilters>({ ...emptyIdeasReportFilters });
  const [report, setReport] = useState<IdeasSurveyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setReport(null);
    source(filters, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (filters.offset && filters.offset >= data.matched) { setFilters(f => ({ ...f, offset: 0 })); return; }
      setReport(data);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Die Auswertung konnte nicht geladen werden.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh, source]);
  return <div className="space-y-6 text-[#003d55]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <AdminPageHeader className="mb-0 md:mb-0" eyebrow="Saison & Wertung" title="Ideen 2027" description="Abstimmung und Vorschläge für die nächste Saison." />
      <StitchButton variant="outline" size="sm" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" />Aktualisieren</StitchButton>
    </div>
    <p className="max-w-3xl text-sm leading-6 text-[#526570]">Nur für Liga-Admins · Einsendungen, keine eindeutigen Personen.</p>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full space-y-2 sm:w-72"><span className="block text-sm font-medium">Grundlage der Auswertung</span>
        <Select value={filters.status} onValueChange={value => setFilters(f => ({ ...f, status: value as IdeasReportStatus, offset: 0 }))}>
          <SelectTrigger aria-label="Grundlage der Auswertung" className="h-11 rounded-xl border-[#003d55]/15 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Alle Einsendungen</SelectItem><SelectItem value="completed">Nur vollständig abgeschlossen</SelectItem><SelectItem value="partial">Nur teilweise beantwortet</SelectItem></SelectContent>
        </Select>
      </div>
      {report && <p className="text-xs leading-5 text-[#526570]">Stand: {ideasReportDate(report.fetched_at)} Uhr · Berlin<br />Letzte Antwortänderung: {ideasReportDate(report.latest_at)}{report.latest_at ? " Uhr" : ""}</p>}
    </div>
    {loading && <StitchCard className="p-6"><p role="status" className="text-sm">Auswertung wird geladen…</p></StitchCard>}
    {error && <StitchCard className="p-6"><p role="alert" className="mb-4 text-sm leading-6">{error}</p><StitchButton variant="outline" size="sm" onClick={() => setRefresh(n => n + 1)}>Erneut versuchen</StitchButton></StitchCard>}
    {report && <>
      <div aria-label="Einsendungen insgesamt" className="grid grid-cols-3 gap-2 sm:gap-3">{[
        { label: "Gesamt", value: report.total }, { label: "Vollständig", value: report.completed }, { label: "Teilweise", value: report.partial },
      ].map(stat => <StitchCard key={stat.label} className="p-3 sm:p-5"><p className="break-words text-xs text-[#526570] sm:text-sm">{stat.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{stat.value}</p></StitchCard>)}</div>
      <div className="space-y-1"><p role="status" className="text-sm font-medium">{report.scoped_total} Einsendungen in der Auswertung.</p>
        <p className="max-w-4xl text-xs leading-5 text-[#526570]">Die drei Gesamtzahlen bleiben ungefiltert; Diagramme folgen deiner Auswahl. Anteile beziehen sich je Frage nur auf abgegebene Antworten. Fehlend ist nicht „Nein“. Widerrufene Antworten sind ausgeschlossen.</p></div>
      {report.scoped_total === 0 ? <StitchCard className="p-8 text-center"><Lightbulb className="mx-auto mb-3 h-7 w-7 text-[#a15523]" aria-hidden="true" /><h2 className="font-semibold">{report.total ? "Keine Einsendungen für diese Auswahl" : "Noch keine Einsendungen"}</h2><p className="mt-2 text-sm text-[#526570]">{report.total ? "Wähle eine andere Grundlage für die Auswertung." : "Neue Antworten erscheinen nach dem Aktualisieren."}</p></StitchCard> : <>
        <div className="grid items-start gap-5 xl:grid-cols-2">{ideasReportSections.map((section, index) => <StitchCard key={section.title} className="p-5 sm:p-6">
          <h2 className="mb-6 flex items-center gap-3 text-lg font-semibold"><span className="text-xs tabular-nums text-[#a15523]">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
          <div className="space-y-7 divide-y divide-[#003d55]/10 [&>section+section]:pt-7">{section.questions.map(q => <QuestionResults key={q.field} question={q} report={report.questions[q.field]} />)}</div>
        </StitchCard>)}</div>
        <section aria-labelledby="ideas-details-title" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="ideas-details-title" className="text-xl font-semibold">Einzelantworten & Ideen</h2><p className="mt-1 text-sm text-[#526570]">Neueste Bearbeitung zuerst. Antworten öffnen, um alle Angaben zu lesen.</p></div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><Checkbox checked={filters.textOnly} onCheckedChange={value => setFilters(f => ({ ...f, textOnly: value === true, offset: 0 }))} />Nur mit Freitextideen</label></div>
          <p role="status" className="text-xs leading-5 text-[#526570]">{report.matched} passende Einsendungen · Der Freitextfilter betrifft nur diese Liste, nicht die Diagramme.</p>
          {!report.matched && <StitchCard className="p-6"><p className="text-sm">Keine Freitextideen in dieser Auswahl.</p></StitchCard>}
          <div className="space-y-3">{report.entries.map((entry, index) => <details key={entry.submission_id} className="group rounded-xl border border-[#003d55]/10 bg-white">
            <summary className="cursor-pointer list-none rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] sm:p-5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-semibold">Einsendung {report.matched - filters.offset - index} · {entry.completed ? "Vollständig abgeschlossen" : "Teilweise beantwortet"}</h3><p className="mt-1 text-xs text-[#526570]"><time dateTime={entry.updated_at}>{ideasReportDate(entry.updated_at)} Uhr</time> · letzte Bearbeitung</p></div><ChevronDown className="h-5 w-5 shrink-0 text-[#a15523] transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" /></div>
              {(entry.answers.league_idea || entry.answers.weighting_idea) && <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6">{entry.answers.league_idea || entry.answers.weighting_idea}</p>}
              <span className="mt-3 block text-xs font-medium text-[#a15523] group-open:hidden">Alle Angaben lesen</span><span className="mt-3 hidden text-xs font-medium text-[#a15523] group-open:block">Angaben schließen</span>
            </summary>
            <div className="space-y-5 border-t border-[#003d55]/10 p-4 sm:p-5">{ideasReportSections.map(section => {
              const answers = section.questions.map(q => ({ question: q, value: entryAnswer(entry, q) })).filter(a => a.value || (a.question.noteField && entry.answers[a.question.noteField]));
              return answers.length ? <section key={section.title}><h4 className="mb-3 text-sm font-semibold text-[#a15523]">{section.title}</h4><dl className="space-y-4">{answers.map(({ question: q, value }) => <div key={q.field}>{value && <><dt className="text-xs text-[#526570]">{q.title}</dt><dd className="mt-1 break-words text-sm leading-6">{value}</dd></>}{q.noteField && entry.answers[q.noteField] && <div className="mt-3"><dt className="text-xs text-[#526570]">{q.noteLabel}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{entry.answers[q.noteField]}</dd></div>}</div>)}</dl></section> : null;
            })}<p className="text-xs text-[#526570]">Fragebogenversion {entry.survey_version} · Unbeantwortete und nicht zutreffende Fragen werden nicht angezeigt.</p></div>
          </details>)}</div>
          {report.matched > IDEAS_REPORT_PAGE_SIZE && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#526570]">{filters.offset + 1}–{Math.min(filters.offset + IDEAS_REPORT_PAGE_SIZE, report.matched)} von {report.matched}</p><div className="flex gap-2"><StitchButton variant="outline" size="sm" disabled={!filters.offset} onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, f.offset - IDEAS_REPORT_PAGE_SIZE) }))}>Zurück</StitchButton><StitchButton variant="outline" size="sm" disabled={filters.offset + IDEAS_REPORT_PAGE_SIZE >= report.matched} onClick={() => setFilters(f => ({ ...f, offset: f.offset + IDEAS_REPORT_PAGE_SIZE }))}>Weiter</StitchButton></div></div>}
        </section>
      </>}
    </>}
  </div>;
}

export default function LeagueIdeasSurvey() { return <IdeasSurveyDashboard />; }
