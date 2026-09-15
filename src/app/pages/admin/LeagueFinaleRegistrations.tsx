import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { adminCancelSemifinalRegistration, listAdminSemifinalRegistrations, type AdminSemifinalRegistration } from "@/services/semifinalAdminApi";
import { useSeasonSettings } from "@/services/seasonSettings";
import { AlertCircle, Award, Filter, List, Search, Trophy, Users, X } from "lucide-react";

const leagueLabel = (league: AdminSemifinalRegistration["approved_league"]) =>
  league === "lead" ? "Vorstieg" : league === "toprope" ? "Toprope" : "Liga noch nicht freigegeben";
const participantName = (registration: AdminSemifinalRegistration) =>
  `${registration.profiles.first_name ?? ""} ${registration.profiles.last_name ?? ""}`.trim()
  || registration.profiles.email || "Unbekannt";

const LeagueFinaleRegistrations = () => {
  const [registrations, setRegistrations] = useState<AdminSemifinalRegistration[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "byClass" | "byLeague">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [cancellingRegistration, setCancellingRegistration] = useState<AdminSemifinalRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { settings, loading: settingsLoading, getSeasonYear, refreshSettings } = useSeasonSettings();
  // Never use getSeasonYear's legacy default for an official list.
  const seasonYear = settings?.season_year?.trim() ? getSeasonYear() : null;

  useEffect(() => {
    if (settingsLoading) return;
    if (!seasonYear) {
      setLoading(false);
      setError("Die aktuelle Saison konnte nicht geladen werden. Es wird keine Teilnehmerzahl geschätzt.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAdminSemifinalRegistrations(seasonYear)
      .then((data) => { if (!cancelled) setRegistrations(data); })
      .catch(() => { if (!cancelled) setError("Die Anmeldungen konnten nicht vollständig geladen werden. Bitte versuche es erneut oder prüfe die Datenbankfreigabe."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seasonYear, settingsLoading, reloadToken]);

  const ready = !loading && !settingsLoading && !error;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registrations.filter((registration) => !query
      || participantName(registration).toLowerCase().includes(query)
      || (registration.profiles.email ?? "").toLowerCase().includes(query));
  }, [registrations, search]);
  const groups = useMemo(() => {
    if (filterTab === "all") return [{ label: "Alle Anmeldungen", rows: filtered }];
    const grouped = new Map<string, AdminSemifinalRegistration[]>();
    filtered.forEach((registration) => {
      const label = filterTab === "byLeague" ? leagueLabel(registration.approved_league)
        : `${leagueLabel(registration.approved_league)} · ${registration.approved_class_label ?? "Klasse noch nicht freigegeben"}`;
      grouped.set(label, [...(grouped.get(label) ?? []), registration]);
    });
    return [...grouped].sort(([a], [b]) => a.localeCompare(b, "de")).map(([label, rows]) => ({ label, rows }));
  }, [filtered, filterTab]);

  const handleCancel = async () => {
    if (!cancellingRegistration || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await adminCancelSemifinalRegistration(cancellingRegistration.id);
      setRegistrations((rows) => rows.filter((row) => row.id !== cancellingRegistration.id));
      setCancellingRegistration(null);
      toast({ title: "Absage gespeichert", description: "Die Änderung ist protokolliert. Bitte informiere die Person separat." });
    } catch {
      setCancelError("Die Absage konnte nicht sicher bestätigt werden. Bitte lade die Liste neu, bevor du erneut absagst.");
    } finally { setCancelling(false); }
  };

  const renderRegistration = (registration: AdminSemifinalRegistration) => (
    <StitchCard key={registration.id} tone="surface" className="p-4 md:p-5" data-testid={`registration-${registration.id}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-primary">{participantName(registration)}</h3>
            <StitchBadge tone="ghost" className="text-[0.62rem] normal-case tracking-normal">{registration.approved_class_label ?? "Klasse noch nicht freigegeben"}</StitchBadge>
          </div>
          <p className="break-words text-sm text-muted-foreground">{registration.profiles.email ?? "Keine E-Mail hinterlegt"}</p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span>{leagueLabel(registration.approved_league)}</span>
            <span>Angemeldet: {new Date(registration.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          {registration.eligibility_status !== "eligible" && <p className="text-sm font-semibold text-secondary">Zulassung prüfen: Diese Anmeldung hat aktuell keine bestätigte Startberechtigung.</p>}
        </div>
        <StitchButton variant="outline" size="sm" className="self-start" onClick={() => { setCancelError(null); setCancellingRegistration(registration); }} aria-label={`Anmeldung von ${participantName(registration)} absagen`}>
          <X className="h-4 w-4" aria-hidden="true" /> Absagen
        </StitchButton>
      </div>
    </StitchCard>
  );

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="p-5 md:p-8">
        <div className="flex items-start gap-4">
          <Trophy className="mt-1 h-8 w-8 shrink-0 text-[#f2dcab]" aria-hidden="true" />
          <div className="min-w-0 space-y-2">
            <h1 className="stitch-headline text-2xl text-[#f2dcab] md:text-3xl">Halbfinal-Anmeldungen</h1>
            <p className="text-sm leading-relaxed text-[#f2dcab]/90">Saison {seasonYear ?? "–"} · Aktuelle Zusagen zum Finalevent mit Start im Halbfinale. Klassen und Liga entsprechen der ausdrücklichen Orga-Freigabe.</p>
          </div>
        </div>
      </StitchCard>
      <div className="grid grid-cols-3 gap-2 md:gap-4" aria-label="Anmeldestatistik">
        {[
          { label: "Gesamt", count: registrations.length },
          { label: "Vorstieg", count: registrations.filter((row) => row.approved_league === "lead").length },
          { label: "Toprope", count: registrations.filter((row) => row.approved_league === "toprope").length },
        ].map(({ label, count }) => <StitchCard key={label} tone="surface" className="p-3 md:p-4">
          <div className="mb-1 text-xs font-semibold text-secondary">{label}</div>
          <div className="font-headline text-2xl text-primary" aria-label={`${label}: ${ready ? count : "nicht geladen"}`}>{ready ? count : "–"}</div>
          <div className="mt-1 text-xs text-muted-foreground">Zusagen</div>
        </StitchCard>)}
      </div>
      {error ? (
        <StitchCard tone="surface" className="space-y-4 p-5" role="alert">
          <div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><p>{error}</p></div>
          <StitchButton variant="navy" onClick={async () => { if (!seasonYear) await refreshSettings(); setReloadToken((value) => value + 1); }}>Erneut laden</StitchButton>
        </StitchCard>
      ) : !ready ? <StitchCard tone="surface" className="p-8 text-center text-muted-foreground" role="status">Lade Anmeldungen …</StitchCard> : (
        <>
          <StitchCard tone="surface" className="space-y-4 p-4 md:p-6">
            <Tabs value={filterTab} onValueChange={(value) => setFilterTab(value as typeof filterTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="gap-2"><List className="h-4 w-4" aria-hidden="true" />Alle</TabsTrigger>
                <TabsTrigger value="byClass" className="gap-2"><Award className="h-4 w-4" aria-hidden="true" />Klasse</TabsTrigger>
                <TabsTrigger value="byLeague" className="gap-2"><Filter className="h-4 w-4" aria-hidden="true" />Liga</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Anmeldungen nach Name oder E-Mail suchen" placeholder="Name oder E-Mail suchen" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0" />
              {search && <StitchButton variant="ghost" size="icon" aria-label="Suche zurücksetzen" onClick={() => setSearch("")}><X className="h-4 w-4" aria-hidden="true" /></StitchButton>}
            </div>
          </StitchCard>
          {filtered.length === 0 ? <StitchCard tone="surface" className="space-y-3 p-8 text-center text-muted-foreground">
            <Users className="mx-auto h-10 w-10" aria-hidden="true" /><p>{search ? "Keine passenden Anmeldungen gefunden." : "Noch keine aktiven Zusagen für diese Saison."}</p>
          </StitchCard> : groups.map((group) => <section key={group.label} className="space-y-3">
            <h2 className="font-headline text-lg text-primary">{group.label} ({group.rows.length})</h2>{group.rows.map(renderRegistration)}
          </section>)}
          <p className="text-sm leading-relaxed text-muted-foreground">Abgesagte Anmeldungen und andere Saisons sind hier nicht enthalten. Die Historie bleibt im Audit erhalten. Zulassungen werden separat durch die Orga freigegeben.</p>
        </>
      )}
      <AlertDialog open={!!cancellingRegistration} onOpenChange={(open) => { if (!open && !cancelling) setCancellingRegistration(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung absagen?</AlertDialogTitle>
            <AlertDialogDescription>Die Anmeldung von {cancellingRegistration ? participantName(cancellingRegistration) : "dieser Person"} wird als abgesagt gespeichert und aus der aktuellen Startliste genommen. Die Änderung bleibt protokolliert. Es wird keine automatische E-Mail versendet; bitte informiere die Person separat.</AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && <p role="alert" className="text-sm text-destructive">{cancelError}</p>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={cancelling}>Zurück</AlertDialogCancel>
            <AlertDialogAction disabled={cancelling} onClick={(event) => { event.preventDefault(); void handleCancel(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{cancelling ? "Wird gespeichert …" : "Absage speichern"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeagueFinaleRegistrations;
