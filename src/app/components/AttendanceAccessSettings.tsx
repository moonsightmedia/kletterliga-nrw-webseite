import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { validFinalPassword } from "@/lib/finalPassword";
import { getCompetitionAttendanceAccessStatus, setCompetitionAttendancePassword } from "@/services/competitionAttendance";
import { CompetitionButton, CompetitionField } from "@/app/components/CompetitionAdminPanels";

const defaultSource = { get: getCompetitionAttendanceAccessStatus, set: setCompetitionAttendancePassword };
export function AttendanceAccessSettings({ season, source = defaultSource, crewHref = "/app/schiedsrichter/einlass" }: {
  season: string; source?: typeof defaultSource; crewHref?: string;
}) {
  const [active, setActive] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const writing = useRef(false);
  useEffect(() => {
    let current = true;
    setActive(null); setError("");
    void source.get(season).then(value => { if (current) setActive(value); }).catch(() => {
      if (current) setError("Einlasszugang konnte nicht geladen werden.");
    });
    return () => { current = false; };
  }, [season, source]);
  async function save(next: string | null) {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await source.set(season, next);
      setActive(next !== null); setPassword(""); setRepeat("");
      setNotice(next === null ? "Einlasszugang deaktiviert." : "Einlasspasswort gespeichert. Die Crew meldet sich damit neu an.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einlasszugang konnte nicht gespeichert werden.");
    } finally { writing.current = false; setBusy(false); }
  }
  return <details className="rounded-xl border border-[#003d55]/15 bg-white p-4" open={active === false}>
    <summary className="cursor-pointer py-1 text-sm font-semibold">Einlasspasswort · {active === null ? "wird geladen" : active ? "eingerichtet" : "noch nicht eingerichtet"}</summary>
    <div className="mt-4 max-w-xl space-y-3">
      <p className="text-sm">Die Crew bestätigt Anwesenheit und meldet zugelassene Liga-Teilnehmer nach.</p>
      <Link target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to={crewHref}>Crew-Einlass öffnen ↗</Link>
      <CompetitionField label="Neues Einlasspasswort" type="password" autoComplete="new-password" value={password} disabled={busy || active === null} onChange={event => setPassword(event.target.value)} />
      <CompetitionField label="Einlasspasswort wiederholen" type="password" autoComplete="new-password" value={repeat} disabled={busy || active === null} onChange={event => setRepeat(event.target.value)} />
      <p className="text-xs text-[#003d55]/70">Mindestens 12 Zeichen · keine Leerzeichen am Anfang oder Ende.</p>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {error && active === null && <CompetitionButton variant="outline" onClick={() => {
        setError("");
        void source.get(season).then(setActive).catch(() => setError("Einlasszugang konnte nicht geladen werden."));
      }}>Erneut laden</CompetitionButton>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <div className="flex flex-wrap gap-3">
        <CompetitionButton disabled={busy || active === null || !validFinalPassword(password) || password !== repeat} onClick={() => void save(password)}>{active ? "Passwort ändern" : "Passwort speichern"}</CompetitionButton>
        {active && <CompetitionButton variant="outline" disabled={busy} onClick={() => void save(null)}>Zugang deaktivieren</CompetitionButton>}
      </div>
    </div>
  </details>;
}
