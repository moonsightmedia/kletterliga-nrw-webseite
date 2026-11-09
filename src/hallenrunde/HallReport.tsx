import { useEffect, useState } from "react";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { replyDetails } from "./replyDetails";
import type { Decision, SavedReply } from "./reply";

export type HallReportEntry = { id: string; hall: string; enabled: boolean; saved: SavedReply | null };
export type HallReportSource = (signal: AbortSignal) => Promise<HallReportEntry[]>;
type Status = Decision | "conditional" | "pending";
const statuses: Record<Status, string> = {
  yes: "Zusage", conditional: "Zusage unter Bedingungen", later: "Noch offen", no: "Absage", pending: "Keine Antwort",
};
const getStatus = (entry: HallReportEntry): Status => {
  const reply = entry.saved?.reply;
  if (reply?.decision === "yes" && reply.conditions) return "conditional";
  return reply?.decision || "pending";
};
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

export default function HallReport({ source }: { source: HallReportSource }) {
  const [entries, setEntries] = useState<HallReportEntry[]>();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    source(abort.signal).then(result => {
      if (!abort.signal.aborted) { setEntries(result); setLoading(false); }
    }).catch(issue => {
      if (!abort.signal.aborted) {
        setEntries(undefined);
        setError(issue instanceof Error ? issue.message : "Die Übersicht konnte nicht geladen werden.");
        setLoading(false);
      }
    });
    return () => abort.abort();
  }, [source, version]);

  const shown = entries?.filter(entry => filter === "all" || getStatus(entry) === filter);
  const counts = entries?.reduce((total, entry) => {
    total[getStatus(entry)]++;
    return total;
  }, { yes: 0, conditional: 0, later: 0, no: 0, pending: 0 });

  return <div className="w-full space-y-6 text-[#003d55]">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#003d55]/20 pb-5">
      <AdminPageHeader className="mb-0 min-w-0 break-words md:mb-0" eyebrow="Partnerhallen · Saison 2027"
        title="Hallenrückmeldungen" description="Teilnahme, Zeitfenster und Hinweise der eingeladenen Hallen." />
      <StitchButton variant="outline" disabled={loading} onClick={() => setVersion(n => n + 1)}>Aktualisieren</StitchButton>
    </header>

    {loading && <p role="status">Rückmeldungen werden geladen …</p>}
    {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-red-900">{error}</p>}
    {counts && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {(Object.keys(statuses) as Status[]).map(status => <div key={status} className="border border-[#003d55]/15 bg-white p-3 sm:p-4">
        <dt className="text-sm">{statuses[status]}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{counts[status]}</dd>
      </div>)}
    </dl>}
    {entries && entries.length > 0 && <>
      <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
        Status filtern
        <select value={filter} onChange={event => setFilter(event.target.value as Status | "all")} className="min-h-10 border border-[#003d55]/40 bg-white px-3 font-normal">
          <option value="all">Alle Hallen</option>
          {(Object.keys(statuses) as Status[]).map(status => <option value={status} key={status}>{statuses[status]}</option>)}
        </select>
      </label>
      {shown?.length ? <ul className="space-y-2">{shown.map(entry => <li key={entry.id} className="border border-[#003d55]/20 bg-white">
        {entry.saved ? <details>
          <summary className="cursor-pointer px-4 py-4">
            <span className="ml-1 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 align-middle">
              <strong>{entry.hall}</strong><span className="text-sm">{statuses[getStatus(entry)]}</span>
              <span className="text-xs text-[#465e69]">{dateTime.format(new Date(entry.saved.savedAt))}{!entry.enabled && " · Zugang deaktiviert"}</span>
            </span>
          </summary>
          <dl className="grid gap-x-6 gap-y-4 border-t border-[#003d55]/10 px-4 py-4 text-sm sm:grid-cols-2">
            {replyDetails(entry.saved.reply).map(([label, value]) =>
              <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>
            )}
          </dl>
        </details> : <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4"><strong>{entry.hall}</strong><span className="text-sm">Keine Antwort</span>{!entry.enabled && <span className="text-xs">Zugang deaktiviert</span>}</p>}
      </li>)}</ul> : <p>Zu diesem Status gibt es keine Hallen.</p>}
    </>}
    {entries?.length === 0 && <p>Für 2027 sind noch keine Hallen hinterlegt.</p>}
  </div>;
}
