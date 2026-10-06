import { useEffect, useState } from "react";
import { ChevronDown, MessageSquare, RefreshCw, Search } from "lucide-react";
import { AdminPageHeader } from "./_components/AdminPageHeader";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { feedbackDate, feedbackNextYear, feedbackPerspective, feedbackPerspectives, feedbackPreview, feedbackSections, feedbackTopics } from "@/lib/seasonFeedback";
import { emptyFeedbackFilters, FEEDBACK_PAGE_SIZE, loadSeasonFeedback, type SeasonFeedbackFilters, type SeasonFeedbackPage, type SeasonFeedbackSource } from "@/services/seasonFeedbackApi";

function Filter({ label, value, choices, onChange }: { label: string; value: string; choices: Record<string, string>; onChange: (value: string) => void }) {
  return <div className="min-w-0 space-y-2"><span className="block text-sm font-medium text-[#003d55]">{label}</span>
    <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-11 rounded-xl border-[#003d55]/15 bg-white"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">Alle</SelectItem>{Object.entries(choices).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent>
    </Select></div>;
}

function Breakdown({ title, counts, labels, total, note }: { title: string; counts: Record<string, number>; labels: Record<string, string>; total: number; note?: string }) {
  return <StitchCard className="p-5 sm:p-6"><h2 className="mb-5 text-base font-semibold text-[#003d55]">{title}</h2>
    <dl className="space-y-4">{Object.entries(labels).map(([key, label]) => <div key={key}>
      <div className="mb-1.5 flex items-start justify-between gap-3 text-sm"><dt>{label}</dt><dd className="shrink-0 font-semibold tabular-nums text-[#003d55]">{counts[key] ?? 0}<span className="font-normal text-[#003d55]/60"> / {total}</span></dd></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#003d55]/[0.07]" aria-hidden="true"><div className="h-full rounded-full bg-[#a15523]" style={{ width: `${total ? Math.min(100, (counts[key] ?? 0) / total * 100) : 0}%` }} /></div>
    </div>)}</dl>{note && <p className="mt-5 text-xs leading-5 text-[#003d55]/65">{note}</p>}</StitchCard>;
}

export function SeasonFeedbackDashboard({ source = loadSeasonFeedback }: { source?: SeasonFeedbackSource }) {
  const [filters, setFilters] = useState<SeasonFeedbackFilters>({ ...emptyFeedbackFilters });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<SeasonFeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setPage(null);
    source(filters, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      // A concurrent deletion must not leave the user stranded on an empty last page.
      if (filters.offset && filters.offset >= data.matched) { setFilters(f => ({ ...f, offset: 0 })); return; }
      setPage(data);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Das Feedback konnte nicht geladen werden.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, refresh, source]);
  const change = (key: "participation" | "topic" | "nextYear", value: string) => setFilters(f => ({ ...f, [key]: value, offset: 0 }));
  const reset = () => { setSearch(""); setFilters({ ...emptyFeedbackFilters }); };
  const filtered = filters.participation !== "all" || filters.topic !== "all" || filters.nextYear !== "all" || Boolean(filters.search);
  return <div className="space-y-6 text-[#003d55]">
    <div className="flex flex-wrap items-start justify-between gap-3"><AdminPageHeader className="mb-0 md:mb-0" eyebrow="Saison & Wertung" title="Saisonfeedback 2026" description="Rückmeldungen zur Saison und zum Finaltag. Wünsche für 2027 im Überblick." />
      <StitchButton variant="outline" size="sm" onClick={() => setRefresh(n => n + 1)} disabled={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Aktualisieren</StitchButton></div>
    <p className="max-w-3xl text-sm leading-6 text-[#003d55]/70">Vertraulich · nur für Liga-Admins. Gezählt werden Einsendungen, nicht einzelne Personen. Mehrfachantworten sind möglich; die Umfrage ist nicht mit Teilnehmerprofilen verknüpft.</p>

    {page && <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[{ label: "Einsendungen", value: page.total, hint: "Alle eingegangenen Antworten" }, { label: "Mitgeklettert", value: page.summary.perspectives.active ?? 0, hint: "Perspektive der Einsendungen" }, { label: "2027 wieder dabei", value: page.summary.next_year.yes ?? 0, hint: "Mit „Ja“ beantwortet" }, { label: "Letzte Einsendung", value: feedbackDate(page.latest_at, true), hint: page.latest_at ? `${feedbackDate(page.latest_at).split(", ")[1] ?? ""} Uhr · Berlin` : "Noch keine Rückmeldung" }].map(stat => <StitchCard key={stat.label} className="p-4 sm:p-5"><p className="text-sm text-[#003d55]/70">{stat.label}</p><p className="my-3 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{stat.value}</p><p className="text-xs leading-5 text-[#003d55]/60">{stat.hint}</p></StitchCard>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Blick auf die Saison" counts={page.summary.perspectives} labels={feedbackPerspectives} total={page.total} note="Bei älteren Fragebogenversionen bedeutet „spät entdeckt“ allgemeiner „nicht teilgenommen“." />
        <Breakdown title="Teilnahmeabsicht 2027" counts={page.summary.next_year} labels={feedbackNextYear} total={page.total} note="Eine Absicht, keine verbindliche Anmeldung." />
        <Breakdown title="Vertiefte Themen" counts={page.summary.topics} labels={feedbackTopics} total={page.total} note="Mehrere Themen pro Einsendung möglich. Ältere Versionen: aus beantworteten Themen abgeleitet." />
      </div>
    </>}

    <section aria-labelledby="feedback-answers-title" className="space-y-4">
      <div><h2 id="feedback-answers-title" className="text-xl font-semibold">Antworten im Detail</h2><p className="mt-1 text-sm text-[#003d55]/65">Neueste zuerst. Rückmeldung öffnen, um alle beantworteten Fragen zu lesen.</p></div>
      <StitchCard className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3"><Filter label="Perspektive" value={filters.participation} choices={feedbackPerspectives} onChange={value => change("participation", value)} /><Filter label="Thema" value={filters.topic} choices={feedbackTopics} onChange={value => change("topic", value)} /><Filter label="Teilnahme 2027" value={filters.nextYear} choices={feedbackNextYear} onChange={value => change("nextYear", value)} /></div>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setFilters(f => ({ ...f, search: search.trim(), offset: 0 })); }}>
          <label className="min-w-0 flex-[1_1_240px] space-y-2 text-sm font-medium">Antworttexte durchsuchen<input value={search} onChange={e => setSearch(e.target.value)} maxLength={200} type="search" placeholder="Zum Beispiel: Anreise, Routen, Siegerehrung" className="block h-11 w-full rounded-xl border border-[#003d55]/15 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#003d55]" /></label>
          <StitchButton type="submit" variant="navy" size="sm"><Search className="h-4 w-4" aria-hidden="true" />Suchen</StitchButton>
          {(filtered || search) && <StitchButton type="button" variant="ghost" size="sm" onClick={reset}>Zurücksetzen</StitchButton>}
        </form>
      </StitchCard>
      {loading && <div role="status" className="rounded-xl bg-white p-6 text-sm">Saisonfeedback wird geladen…</div>}
      {error && <StitchCard className="p-6"><p role="alert" className="mb-4 text-sm leading-6">{error}</p><StitchButton variant="outline" size="sm" onClick={() => setRefresh(n => n + 1)}>Erneut versuchen</StitchButton></StitchCard>}
      {page && <>
        <p role="status" className="text-sm text-[#003d55]/65">{filtered ? `${page.matched} von ${page.total} Einsendungen passen zu den Filtern.` : `${page.total} Einsendungen insgesamt.`}</p>
        {!page.entries.length && <StitchCard className="p-8 text-center"><MessageSquare className="mx-auto mb-3 h-7 w-7 text-[#a15523]" aria-hidden="true" /><h3 className="font-semibold">{page.total ? "Keine passende Rückmeldung" : "Noch kein Saisonfeedback"}</h3><p className="mt-2 text-sm text-[#003d55]/65">{page.total ? "Ändere die Filter oder den Suchbegriff." : "Neue Einsendungen erscheinen hier, sobald du die Ansicht aktualisierst."}</p>{filtered && <StitchButton className="mt-4" size="sm" variant="outline" onClick={reset}>Filter zurücksetzen</StitchButton>}</StitchCard>}
        <div className="space-y-3">{page.entries.map((entry, index) => <details key={entry.id} className="group rounded-xl border border-[#003d55]/10 bg-white">
          <summary className="cursor-pointer list-none rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] sm:p-5 [&::-webkit-details-marker]:hidden">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#003d55]/65"><span>Antwort {page.matched - filters.offset - index}</span><time dateTime={entry.created_at}>{feedbackDate(entry.created_at)} Uhr</time></div><h3 className="mt-2 text-base font-semibold">{feedbackPerspective(entry)}</h3></div><ChevronDown className="mt-1 h-5 w-5 shrink-0 text-[#a15523] transition-transform group-open:rotate-180" aria-hidden="true" /></div>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#003d55]/80">{feedbackPreview(entry)}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">{entry.topics.map(topic => <span key={topic} className="rounded-full bg-[#f2dcab]/50 px-2.5 py-1">{feedbackTopics[topic] ?? topic}</span>)}<span className="rounded-full bg-[#003d55]/[0.06] px-2.5 py-1">2027: {feedbackNextYear[entry.next_year || "unanswered"] ?? entry.next_year}</span></div>
            <span className="mt-4 block text-xs font-semibold text-[#a15523] group-open:hidden">Vollständige Rückmeldung lesen</span><span className="mt-4 hidden text-xs font-semibold text-[#a15523] group-open:block">Rückmeldung schließen</span>
          </summary>
          <div className="space-y-6 border-t border-[#003d55]/10 p-4 sm:p-5">{feedbackSections(entry).map(section => <section key={section.title}><h4 className="mb-3 text-sm font-semibold text-[#a15523]">{section.title}</h4><dl className="space-y-4">{section.answers.map(answer => <div key={answer.label}><dt className="text-xs font-medium text-[#003d55]/65">{answer.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{answer.value}</dd></div>)}</dl></section>)}<p className="text-xs text-[#003d55]/55">Fragebogenversion {entry.survey_version} · Unbeantwortete Fragen werden nicht angezeigt.</p></div>
        </details>)}</div>
        {page.matched > FEEDBACK_PAGE_SIZE && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#003d55]/65">{filters.offset + 1}–{Math.min(filters.offset + FEEDBACK_PAGE_SIZE, page.matched)} von {page.matched}</p><div className="flex gap-2"><StitchButton variant="outline" size="sm" disabled={filters.offset === 0} onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, f.offset - FEEDBACK_PAGE_SIZE) }))}>Zurück</StitchButton><StitchButton variant="outline" size="sm" disabled={filters.offset + FEEDBACK_PAGE_SIZE >= page.matched} onClick={() => setFilters(f => ({ ...f, offset: f.offset + FEEDBACK_PAGE_SIZE }))}>Weiter</StitchButton></div></div>}
      </>}
    </section>
  </div>;
}

export default function LeagueSeasonFeedback() { return <SeasonFeedbackDashboard />; }
