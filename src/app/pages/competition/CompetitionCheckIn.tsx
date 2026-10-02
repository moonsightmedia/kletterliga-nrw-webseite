import { useCallback, useState } from "react";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AttendanceDesk } from "@/app/components/AttendanceDesk";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { getCompetitionAttendance } from "@/services/competitionAttendance";
import { useSeasonSettings } from "@/services/seasonSettings";

export default function CompetitionCheckIn() {
  const { settings, loading, refreshSettings } = useSeasonSettings();
  return <CompetitionCheckInContent season={settings?.season_year?.trim()} loading={loading} refreshSettings={refreshSettings} />;
}

export function CompetitionCheckInContent({ season, loading = false, refreshSettings }: {
  season?: string; loading?: boolean; refreshSettings?: () => unknown;
}) {
  const [password, setPassword] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invalidate = useCallback(() => { setPassword(null); setEntry(""); setError("Das Einlasspasswort wurde geändert. Bitte erneut anmelden."); }, []);
  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!season || busy || !entry.trim()) return;
    setBusy(true); setError("");
    try {
      await getCompetitionAttendance(season, entry);
      setPassword(entry); setEntry("");
    } catch (err) { setError(err instanceof Error ? err.message : "Anmeldung konnte nicht bestätigt werden."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Einlass</h1>{password && <StitchButton variant="outline" className="min-h-11 font-sans text-sm normal-case tracking-normal shadow-none" onClick={() => { setPassword(null); setEntry(""); setError(""); }}><LogOut className="h-4 w-4" aria-hidden="true" />Abmelden</StitchButton>}</header>
    {loading ? <p role="status">Lade Saison …</p> : !season ? <div role="alert" className="space-y-3"><p>Die aktuelle Saison konnte nicht geladen werden.</p><StitchButton onClick={() => refreshSettings?.()}>Erneut laden</StitchButton></div> : password ? <AttendanceDesk season={season} password={password} mode="crew" onAccessInvalid={invalidate} /> : <form onSubmit={(event) => void login(event)} className="mx-auto max-w-sm space-y-4 rounded-xl border border-primary/15 bg-white p-5">
      <div className="space-y-2"><label htmlFor="attendance-password" className="font-semibold">Einlasspasswort</label><Input id="attendance-password" type="password" autoComplete="current-password" className="min-h-12" value={entry} onChange={(event) => setEntry(event.target.value)} disabled={busy} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <StitchButton type="submit" className="min-h-12 w-full font-sans text-base normal-case tracking-normal shadow-none" disabled={busy || !entry.trim()}>{busy ? "Wird geprüft …" : "Einlass öffnen"}</StitchButton>
    </form>}
  </div>;
}
