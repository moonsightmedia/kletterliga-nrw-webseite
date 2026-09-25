import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, QrCode, RotateCw, ShieldCheck, Trophy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchBadge, StitchButton, StitchCard, StitchSectionHeading } from "@/app/components/StitchPrimitives";
import { CodeQrScanner } from "@/components/CodeQrScanner";
import { getCompetitionDay, submitCompetitionResult } from "@/services/competitionDay";
import { useSeasonSettings } from "@/services/seasonSettings";
import { competitionRouteColor } from "@/lib/competitionRouteColors";

type CompetitionDayData = Awaited<ReturnType<typeof getCompetitionDay>>;
type CompetitionRoute = CompetitionDayData["routes"][number];
type SavedResult = CompetitionDayData["results"][number];
type Draft = { zone: number; flash: boolean };

const localProbeAvailable = import.meta.env.DEV && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const makeProbeResultsKey = (profileId: string, season: string, eventId: string) =>
  `competition-day:probe:results:${profileId}:${season}:${eventId}`;
const makeDraftKey = (profileId: string, season: string, routeId: string) =>
  `competition-day:draft:${profileId}:${season}:${routeId}`;

function readProbeResults(key: string, routes: CompetitionRoute[], profileId: string, points: number[], bonus: number): SavedResult[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((item): item is SavedResult => {
      if (!item || typeof item !== "object") return false;
      const row = item as Partial<SavedResult>;
      if (typeof row.route_id !== "string" || seen.has(row.route_id) ||
        !routes.some((route) => route.id === row.route_id) || row.profile_id !== profileId ||
        !Number.isInteger(row.zone) || row.zone! < 0 || row.zone! > 10 ||
        typeof row.flash !== "boolean" || (row.flash && row.zone !== 10) ||
        row.points !== points[row.zone!] + (row.flash ? bonus : 0) ||
        typeof row.id !== "string" || typeof row.created_at !== "string") return false;
      seen.add(row.route_id);
      return true;
    });
  } catch {
    return [];
  }
}

function readDraft(key: string): Draft | null {
  try {
    const storage = key.startsWith("competition-day:probe:") ? window.sessionStorage : window.localStorage;
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<Draft>;
    if (!Number.isInteger(candidate.zone) || candidate.zone! < 0 || candidate.zone! > 10 || typeof candidate.flash !== "boolean") return null;
    if (candidate.flash && candidate.zone !== 10) return null;
    return { zone: candidate.zone!, flash: candidate.flash };
  } catch {
    return null;
  }
}

function parseCompetitionQr(value: string, route: CompetitionRoute): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== window.location.origin || url.pathname !== "/app/wettkampf" || url.search || !url.hash.startsWith("#")) return null;
    const params = new URLSearchParams(url.hash.slice(1));
    if ([...params.keys()].some((key) => key !== "route" && key !== "token")) return null;
    const routeId = params.get("route");
    const token = params.get("token");
    if (routeId !== route.id || !token || params.getAll("route").length !== 1 || params.getAll("token").length !== 1) return null;
    return token;
  } catch {
    return null;
  }
}

const pageClass = "mx-auto w-full max-w-4xl space-y-7 pb-24 pt-6 text-[#f2dcab]";

export default function CompetitionDay() {
  const [searchParams] = useSearchParams();
  const probeMode = localProbeAvailable && searchParams.get("probelauf") === "1";
  const { profile } = useAuth();
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year ? String(settings.season_year) : null;
  const [data, setData] = useState<CompetitionDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [zone, setZone] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<SavedResult[]>([]);
  const submitLockRef = useRef(false);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!season) return;
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getCompetitionDay(season);
      if (requestId !== loadRequestRef.current) return;
      setData(next);
      setSelectedRouteId((current) => current && next.routes.some((route) => route.id === current) ? current : null);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setLoadError("Die Wettkampfdaten konnten nicht geladen werden. Bitte versuche es erneut.");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    void load();
    return () => { loadRequestRef.current += 1; };
  }, [load]);

  const route = data?.routes.find((item) => item.id === selectedRouteId) ?? null;
  const visibleResults = probeMode ? probeResults : data?.results ?? [];
  const result = visibleResults.find((item) => item.route_id === selectedRouteId) ?? null;
  const savedResult = (item: CompetitionRoute): SavedResult | undefined => visibleResults.find((entry) => entry.route_id === item.id);
  const probeResultsKey = profile?.id && season && data?.event ? makeProbeResultsKey(profile.id, season, data.event.id) : null;
  const draftKey = profile?.id && season && route
    ? (probeMode ? `competition-day:probe:draft:${profile.id}:${season}:${route.id}` : makeDraftKey(profile.id, season, route.id)) : null;
  const points = useMemo(() => zone === null || !data?.event ? null : data.event.zone_points[zone] + (flash ? data.event.flash_bonus : 0), [data?.event, flash, zone]);

  useEffect(() => {
    if (!probeMode || !probeResultsKey || !profile?.id || !data?.event || data.routes.length !== 5) {
      setProbeResults([]);
      return;
    }
    setProbeResults(readProbeResults(probeResultsKey, data.routes, profile.id, data.event.zone_points, data.event.flash_bonus));
  }, [probeMode, probeResultsKey, profile?.id, data]);

  useEffect(() => {
    setQrToken(null);
    setQrError(null);
    setSubmitError(null);
    setDraftSaved(false);
    setDraftError(null);
    setScannerOpen(false);
    if (!draftKey || result) {
      setZone(null);
      setFlash(false);
      return;
    }
    const draft = readDraft(draftKey);
    setZone(draft?.zone ?? null);
    setFlash(draft?.flash ?? false);
  }, [draftKey, result]);

  const persistDraft = (nextZone: number | null, nextFlash: boolean) => {
    if (!draftKey || nextZone === null || !data?.event || result || (!probeMode && data.event.phase !== "open")) return false;
    if (!Number.isInteger(nextZone) || nextZone < 0 || nextZone > 10 || (nextFlash && nextZone !== 10)) return false;
    try {
      (probeMode ? window.sessionStorage : window.localStorage).setItem(draftKey, JSON.stringify({ zone: nextZone, flash: nextFlash } satisfies Draft));
      setDraftSaved(true);
      setDraftError(null);
      return true;
    } catch {
      setDraftSaved(false);
      setDraftError("Der Entwurf konnte auf diesem Gerät nicht gespeichert werden.");
      return false;
    }
  };

  const acceptQr = (value: string) => {
    const token = route ? parseCompetitionQr(value, route) : null;
    setScannerOpen(false);
    if (!token) {
      setQrToken(null);
      setQrError("Dieser QR-Code passt nicht zu dieser Route. Bitte prüfe den Code an der Wand.");
      return;
    }
    setQrToken(token);
    setQrError(null);
    setSubmitError(null);
  };

  const submit = async () => {
    if (submitLockRef.current || !season || !profile?.id || !route || !qrToken || zone === null || !data?.event || result || (!probeMode && data.event.phase !== "open")) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    persistDraft(zone, flash);
    try {
      if (probeMode) {
        if (!probeResultsKey) throw new Error("Probe storage unavailable");
        const accepted: SavedResult = {
          id: `probe:${route.id}`, route_id: route.id, profile_id: profile.id, zone, flash,
          points: data.event.zone_points[zone] + (flash ? data.event.flash_bonus : 0),
          created_at: new Date().toISOString(),
        };
        const next = [...probeResults.filter((item) => item.route_id !== route.id), accepted];
        window.sessionStorage.setItem(probeResultsKey, JSON.stringify(next));
        setProbeResults(next);
        if (draftKey) window.sessionStorage.removeItem(draftKey);
        setQrToken(null);
        return;
      }
      const accepted = await submitCompetitionResult({ season, routeId: route.id, zone, flash, qrToken });
      const expectedPoints = data.event.zone_points[zone] + (flash ? data.event.flash_bonus : 0);
      const pointsMatch = Number.isFinite(accepted.points) && Math.abs(accepted.points - expectedPoints) <= 1e-8;
      const validAcknowledgement = Boolean(accepted.id && accepted.created_at && Number.isFinite(Date.parse(accepted.created_at)));
      if (!validAcknowledgement || accepted.route_id !== route.id || accepted.profile_id !== profile.id || accepted.zone !== zone || accepted.flash !== flash || !pointsMatch) {
        throw new Error("The accepted result did not match the submitted result.");
      }
      setData((current) => current ? { ...current, results: [...current.results.filter((item) => item.route_id !== route.id), accepted] } : current);
      if (draftKey) {
        try { window.localStorage.removeItem(draftKey); } catch { /* The accepted server result remains authoritative. */ }
      }
      setQrToken(null);
    } catch {
      setSubmitError(probeMode ? "Der Probelauf konnte auf diesem Gerät nicht gespeichert werden." : "Das Ergebnis wurde nicht bestätigt. Prüfe deine Verbindung und versuche es erneut.");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  if (settingsLoading) return <div className={pageClass}><StitchCard tone="cream" className="p-6" role="status">Saison wird geladen …</StitchCard></div>;
  if (!season) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Wettkampftag" description="Die Saison ist derzeit nicht verfügbar." /></div>;
  if (loading) return <div className={pageClass}><StitchCard tone="cream" className="p-6" role="status">Wettkampf wird geladen …</StitchCard></div>;
  if (loadError || !data) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab]" eyebrow="Halbfinale" title="Wettkampftag" /><StitchCard tone="cream" className="space-y-4 p-6" role="alert"><p>{loadError ?? "Wettkampfdaten nicht verfügbar."}</p><StitchButton onClick={() => void load()}><RotateCw aria-hidden="true" size={17} /> Erneut laden</StitchButton></StitchCard></div>;
  if (!data.event) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Wettkampftag" description="Die Wettkampfeingabe wurde noch nicht vorbereitet." /><StitchCard tone="cream" className="p-6 text-[#003d55]">Sobald die Routen bereit sind, erscheinen sie hier.</StitchCard></div>;
  if (!data.eligible) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Wettkampftag" description="Für dein Profil ist keine Wettkampfroute freigegeben." /></div>;
  if (data.event.phase === "draft" && data.routes.length !== 5) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Routen in Vorbereitung" description="Die physischen Routen werden geplant. Deine fünf Halbfinalrouten werden hier angezeigt, sobald die Zuordnung feststeht." /><StitchCard tone="cream" className="p-6 text-[#003d55]">Die Ergebniseingabe ist noch geschlossen. Deine Qualifikation und Anmeldung bleiben unverändert.</StitchCard></div>;
  if (data.routes.length !== 5) return <div className={pageClass}><StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale" title="Routenzuordnung prüfen" description="Dein Routenset konnte nicht vollständig geladen werden." /><StitchCard tone="cream" className="space-y-4 p-6" role="alert"><p>Bitte lade die Zuordnung erneut oder wende dich an die Organisation. Es werden keine Ergebnisseingaben angezeigt.</p><StitchButton onClick={() => void load()}><RotateCw aria-hidden="true" size={17} /> Erneut laden</StitchButton></StitchCard></div>;

  const readOnly = !probeMode && data.event.phase !== "open";
  const saveDraft = () => { persistDraft(zone, flash); };
  const clearProbe = () => {
    if (probeResultsKey) {
      try {
        window.sessionStorage.removeItem(probeResultsKey);
        for (const item of data.routes) window.sessionStorage.removeItem(`competition-day:probe:draft:${profile?.id}:${season}:${item.id}`);
      } catch {
        setSubmitError("Die lokalen Testdaten konnten nicht vollständig gelöscht werden.");
        return;
      }
    }
    setProbeResults([]);
    setZone(null);
    setFlash(false);
    setQrToken(null);
    setSubmitError(null);
  };
  return <div className={pageClass}>
    <header className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
      <StitchSectionHeading titleAs="h1" className="[&_.stitch-headline]:!text-[#f2dcab] [&_p]:!text-[#f2dcab]/70" eyebrow="Halbfinale · Wettkampftag" title="Deine Routen" description={`${data.league === "lead" ? "Vorstieg" : data.league === "toprope" ? "Toprope" : "Kletterliga NRW"}${data.class_label ? ` · ${data.class_label}` : ""} — wähle eine deiner zugeordneten Routen.`} />
      <StitchBadge tone={probeMode ? "terracotta" : readOnly ? "ghost" : "navy"}>{probeMode ? "PROBELAUF" : readOnly ? data.event.phase === "draft" ? "NOCH NICHT GEÖFFNET" : "EINGABE GESCHLOSSEN" : "5 ROUTEN"}</StitchBadge>
    </header>
    {localProbeAvailable && (probeMode
      ? <StitchCard tone="cream" className="flex flex-wrap items-center justify-between gap-4 p-4 text-[#003d55]" role="status"><div><strong className="stitch-headline text-lg">Lokaler Probelauf</strong><p className="mt-1 text-sm">Wähle Zonen und bestätige den Test-QR oder scanne einen passenden Routencode. Testwerte bleiben nur in diesem Browser-Tab und erscheinen nicht in der Rangliste.</p></div><div className="flex flex-wrap gap-2"><StitchButton variant="outline" size="sm" onClick={clearProbe}>Testwerte löschen</StitchButton><StitchButton asChild variant="navy" size="sm"><Link to="/app/wettkampf">Probelauf beenden</Link></StitchButton></div></StitchCard>
      : <StitchCard tone="cream" className="flex flex-wrap items-center justify-between gap-4 p-4 text-[#003d55]"><p className="max-w-xl text-sm">Du kannst die Ergebniseingabe lokal ausprobieren. Die Testwerte ändern keine echten Ergebnisse.</p><StitchButton asChild variant="navy" size="sm"><Link to="?probelauf=1">Probelauf starten</Link></StitchButton></StitchCard>)}
    {!readOnly && <p className="max-w-2xl text-sm leading-6 text-[#f2dcab]/75">Wähle die letzte sicher gehaltene Zone. {data.event.zone_points.every((points, index) => points === index) && "Zone 1–10 bringt 1–10 Punkte. "}Für den Flashbonus musst du die 10 im ersten Versuch erreichen. {data.event.flash_bonus === 0 && "Der Flashbonus ist derzeit mit 0 Punkten konfiguriert. "}{probeMode ? "Im Probelauf kannst du anschließend den Test-QR bestätigen oder einen passenden Routencode scannen." : "Danach scannst du hier den QR-Code beim Schiedsrichter."}</p>}
    <section aria-label="Deine Wettkampfrouten" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.routes.map((item) => {
        const itemResult = savedResult(item);
        const active = selectedRouteId === item.id;
        return <button type="button" key={item.id} disabled={submitting} onClick={() => { if (submitLockRef.current) return; setSelectedRouteId(item.id); setScannerOpen(false); setQrToken(null); }} aria-pressed={active} className={`rounded-xl p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab] focus-visible:ring-offset-2 focus-visible:ring-offset-[#003d55] disabled:opacity-60 ${active ? "bg-[#f2dcab] text-[#002637]" : "stitch-glass-card text-[#f2dcab] hover:bg-[rgba(242,220,171,0.12)]"}`}>
          <span className="flex items-center justify-between gap-3"><span className="stitch-headline text-2xl">Route {item.number}</span>{itemResult ? <Check aria-label="Ergebnis eingetragen" size={19} /> : <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ backgroundColor: competitionRouteColor(item.color).value }} />}</span>
          <span className="mt-2 block text-sm font-semibold">{item.name || "Halbfinalroute"}</span>
          {item.grade && <span className="mt-1 block text-xs opacity-75">{item.grade}</span>}
          {item.color && <span className="mt-2 block text-xs opacity-75">Farbe: {competitionRouteColor(item.color).label}</span>}
          {itemResult && <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold"><Check size={14} /> {probeMode ? "Testwert" : "Ergebnis eingetragen"} · {itemResult.points} Punkte</span>}
        </button>;
      })}
    </section>

    {route && <StitchCard tone="cream" className="space-y-5 p-5 sm:p-7" aria-labelledby="competition-route-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="stitch-kicker text-[#a15523]">{probeMode ? "TESTWERTUNG" : "DEINE WERTUNG"}</p><h2 id="competition-route-title" className="stitch-headline mt-2 text-2xl text-[#002637]">Route {route.number}: {route.name || "Halbfinalroute"}</h2></div>{result && <StitchBadge tone="terracotta"><Check size={14} /> {probeMode ? "TESTWERT GESPEICHERT" : "ERGEBNIS EINGETRAGEN"}</StitchBadge>}</div>
      {result ? <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Eingetragenes Ergebnis"><div className="min-w-0 rounded-xl bg-white/70 p-2 sm:p-4"><span className="text-xs text-[#36515b]">Letzter Griff</span><strong className="stitch-headline mt-1 block text-2xl text-[#002637]">{result.zone}</strong></div><div className="min-w-0 rounded-xl bg-white/70 p-2 sm:p-4"><span className="text-xs text-[#36515b]">Flash</span><strong className="stitch-headline mt-1 block text-xl text-[#002637]">{result.flash ? "Ja" : "Nein"}</strong></div><div className="min-w-0 rounded-xl bg-white/70 p-2 sm:p-4"><span className="text-xs text-[#36515b]">Punkte</span><strong className="stitch-headline mt-1 block text-2xl text-[#002637]">{result.points}</strong></div></div> : readOnly ? <p className="text-[#36515b]">{data.event.phase === "draft" ? "Die Routen sind sichtbar. Die Ergebniseingabe ist noch nicht geöffnet." : "Für diese Route wurde kein Ergebnis eingetragen. Die Eingabe ist geschlossen."}</p> : <>
        <fieldset disabled={submitting} className="space-y-3 disabled:opacity-70"><legend className="mb-3 text-sm font-semibold text-[#002637]">Letzte sicher gehaltene Zone</legend><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <button type="button" key={value} aria-pressed={zone === value} onClick={() => { const nextFlash = value === 10 ? flash : false; persistDraft(value, nextFlash); setZone(value); setFlash(nextFlash); setQrToken(null); }} className={`min-h-12 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] ${zone === value ? "bg-[#003d55] text-[#f2dcab]" : "bg-white/75 text-[#002637] hover:bg-white"}`}>{value}</button>)}</div><button type="button" aria-pressed={zone === 0} onClick={() => { persistDraft(0, false); setZone(0); setFlash(false); setQrToken(null); }} className={`min-h-11 rounded-lg px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] ${zone === 0 ? "bg-[#003d55] text-[#f2dcab]" : "bg-white/60 text-[#002637]"}`}>Keine Zone erreicht · 0 Punkte</button></fieldset>
        <label className={`flex min-h-14 items-center gap-3 rounded-xl bg-white/70 px-4 ${zone !== 10 || submitting ? "opacity-55" : ""}`}><input type="checkbox" className="h-5 w-5 accent-[#a15523] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55]" checked={flash} disabled={zone !== 10 || submitting} onChange={(event) => { persistDraft(zone, event.target.checked); setFlash(event.target.checked); setQrToken(null); }} /><span className="text-sm font-semibold text-[#002637]">Im ersten Versuch direkt zur 10 (Flash)</span></label>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#003d55] p-4 text-[#f2dcab]"><span className="text-sm">Vorschau deiner Wertung</span><strong className="stitch-headline text-3xl">{points ?? "—"} <span className="text-sm font-medium">Punkte</span></strong></div>
        {draftSaved && <p role="status" className="text-sm font-semibold text-[#245d47]">Entwurf auf diesem Gerät gespeichert.</p>}
        {draftError && <p role="alert" className="text-sm font-semibold text-[#ba1a1a]">{draftError}</p>}
        {qrError && <p role="alert" className="text-sm font-semibold text-[#ba1a1a]">{qrError}</p>}
        {submitError && <p role="alert" className="text-sm font-semibold text-[#ba1a1a]">{submitError}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><StitchButton variant="outline" disabled={zone === null || submitting} onClick={saveDraft}>Entwurf speichern</StitchButton><StitchButton className="whitespace-normal text-center tracking-[0.1em]" variant={qrToken ? "navy" : "outline"} disabled={zone === null || submitting} onClick={() => { if (submitLockRef.current) return; persistDraft(zone, flash); setScannerOpen(true); setQrError(null); }}><QrCode aria-hidden="true" size={17} />{qrToken ? "QR-Code erneut scannen" : "QR-Code am Routenposten scannen"}</StitchButton>{probeMode && <StitchButton variant="outline" className="whitespace-normal text-center tracking-[0.1em]" disabled={zone === null || submitting} onClick={() => { setQrToken("lokaler-probelauf"); setScannerOpen(false); setQrError(null); }}>Test-QR bestätigen</StitchButton>}<StitchButton className="whitespace-normal text-center tracking-[0.1em]" disabled={!qrToken || zone === null || submitting || (!probeMode && data.event.phase !== "open")} onClick={() => void submit()}>{submitting ? "Wird eingetragen …" : probeMode ? "Testwert speichern" : "Ergebnis absenden"}</StitchButton></div>
        {qrToken && <p className="flex items-start gap-2 text-xs leading-5 text-[#36515b]"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{probeMode ? "Test-QR bestätigt. Prüfe den Wert und speichere ihn im Probelauf." : "QR-Code erkannt. Prüfe deine Wertung und sende sie ausdrücklich ab. Der Scan allein trägt noch kein Ergebnis ein."}</p>}
      </>}
      {scannerOpen && !submitting && <div className="space-y-3 rounded-xl bg-white/70 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-[#002637]">Stationscode scannen</h3><button type="button" className="min-h-11 px-3 text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55]" onClick={() => setScannerOpen(false)}>Schließen</button></div><p className="text-sm leading-5 text-[#36515b]">Öffne den Scanner hier in der App und zeige dem Routenposten deinen Bildschirm. Bitte prüfe, dass der Code zur ausgewählten Route gehört.</p><CodeQrScanner onScan={acceptQr} onError={(message) => setQrError(`${message} Bitte erlaube den Kamerazugriff oder versuche es erneut.`)} /></div>}
    </StitchCard>}
    {scannerOpen && <span className="sr-only" role="status">Kamera für QR-Scan geöffnet</span>}
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs text-[#f2dcab]/75"><span className="flex items-center gap-2"><Trophy aria-hidden="true" size={15} />{probeMode ? "Testwerte kannst du oben zurücksetzen. Die echte Wertung bleibt unverändert." : "Ergebnisse sind nach dem Eintragen für dich nicht bearbeitbar. Bitte wende dich bei einem Fehler an die Organisation."}</span><Link className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]" to="/app/wettkampf/rangliste">Halbfinalwertung ansehen</Link><StitchButton size="sm" variant="cream" disabled={submitting} onClick={() => void load()}>Status aktualisieren</StitchButton></footer>
  </div>;
}

export { makeDraftKey as competitionParticipantDraftKey, parseCompetitionQr as parseCompetitionParticipantQr, readDraft as readCompetitionParticipantDraft };
