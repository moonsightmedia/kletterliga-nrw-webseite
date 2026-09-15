import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ListOrdered, LockKeyhole, MapPin, RefreshCw, Trophy } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import { formatCompetitionDate, formatRegistrationDeadline } from "@/services/qualificationPhase";
import { useQualificationPhase } from "@/services/useQualificationPhase";
import { QualificationTimeline } from "./QualificationTimeline";
import {
  cancelSemifinalRegistration, getSemifinalRegistrationError,
  getSemifinalRegistrationState, registerForSemifinal,
} from "@/services/semifinalApi";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Finale = () => {
  const { profile } = useAuth();
  const { settings, getStages } = useSeasonSettings();
  const { hasEnded, qualificationEnd } = useQualificationPhase();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const registerButtonRef = useRef<HTMLButtonElement>(null);
  const registeredHeadingRef = useRef<HTMLParagraphElement>(null);
  const confirmingRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryKey = ["semifinal-registration", profile?.id];
  const status = useQuery({
    queryKey, queryFn: getSemifinalRegistrationState, enabled: Boolean(profile?.id),
    retry: false, staleTime: 10_000, refetchInterval: 30_000,
  });
  const changeRegistration = useMutation({
    mutationFn: (action: "register" | "cancel") => action === "register" ? registerForSemifinal() : cancelSemifinalRegistration(),
    onMutate: () => { setActionError(null); setNotice(null); },
    onSuccess: (data, action) => {
      queryClient.setQueryData(queryKey, data);
      setCancelOpen(false);
      setConfirmOpen(false);
      setNotice(action === "register" ? "Deine Anmeldung wurde gespeichert." : "Deine Abmeldung wurde gespeichert.");
    },
    onError: (error) => {
      setActionError(getSemifinalRegistrationError(error));
      void queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => { confirmingRef.current = false; },
  });
  const data = status.data;
  const busy = changeRegistration.isPending;
  const safelyLoaded = Boolean(data) && !status.isError && !status.isPending;
  const deadline = formatRegistrationDeadline(data?.registration_deadline, settings?.finale_registration_deadline);
  const deadlinePassed = Boolean(data?.registration_deadline && Date.now() >= Date.parse(data.registration_deadline));
  const canRegister = safelyLoaded && data?.eligible && !data?.registered && data?.registration_open && !deadlinePassed && !busy;
  const canCancel = safelyLoaded && data?.registration_open && !deadlinePassed && !busy;
  const eventDate = formatCompetitionDate(data?.finale_date ?? settings?.finale_date);
  const approvedClass = data?.class_label
    ? `${data.league === "lead" ? "Vorstieg" : "Toprope"} · ${data.class_label}` : null;

  return (
    <div className="semifinal-page">
      <section className="semifinal-hero" aria-labelledby="semifinal-heading">
        <div>
          <p className="semifinal-season-tag"><Trophy size={14} aria-hidden="true" />Kletterliga NRW · {data?.season_year ?? settings?.season_year ?? "2026"}</p>
          <h1 id="semifinal-heading" tabIndex={-1} className="stitch-headline semifinal-title">Halbfinale<span>.</span></h1>
          <p className="semifinal-hero-copy">{hasEnded ? "Die Quali ist beendet. Hier geht’s weiter." : "Dein nächster Schritt zum Finalevent."}</p>
        </div>
        <div className="semifinal-event-meta">
          <p><CalendarDays size={18} aria-hidden="true" />{eventDate}</p>
          <p><MapPin size={18} aria-hidden="true" />Kletterwelt Sauerland · Altena</p>
        </div>
      </section>

      {hasEnded && <section className="semifinal-season" aria-label="Qualifikation abgeschlossen">
        <div className="semifinal-season-caption"><p><CheckCircle2 size={15} aria-hidden="true" /><span>Alle Etappen abgeschlossen</span></p><span>{formatCompetitionDate(qualificationEnd)}</span></div>
        <QualificationTimeline stages={getStages()} />
      </section>}

      <div className="semifinal-grid">
        <section aria-labelledby="registration-heading" className="semifinal-panel semifinal-registration">
          <p className="stitch-kicker semifinal-eyebrow">Dein nächster Schritt</p>
          <h2 id="registration-heading" className="stitch-headline semifinal-section-title">Halbfinalanmeldung</h2>
          <p className="semifinal-copy mt-3">Hier bestätigst du deinen Start im Halbfinale.</p>
          <div className="semifinal-deadline">
            <Clock3 size={19} aria-hidden="true" />
            <div><p className="semifinal-eyebrow text-xs">Anmeldeschluss</p><p className="mt-1 text-sm font-bold">{deadline}</p><p className="sr-only">Deutsche Zeit · Europe/Berlin</p></div>
          </div>

          {status.isPending || !profile?.id ? <p role="status" className="py-4 text-sm">Dein Anmeldestatus wird geprüft …</p>
            : status.isError ? <div role="alert" className="semifinal-message space-y-3">
              <p className="font-bold">Anmeldestatus nicht verfügbar</p>
              <p className="text-sm leading-6">Wir können deine Anmeldung gerade nicht sicher prüfen. Es wurde keine neue Anmeldung bestätigt. Bitte lade den Status erneut.</p>
              <StitchButton disabled={status.isFetching} onClick={() => { setActionError(null); void status.refetch(); }} className="semifinal-primary"><RefreshCw className="h-4 w-4 shrink-0" />Status erneut laden</StitchButton>
            </div>
              : data?.registered ? <div className="space-y-3">
                <p ref={registeredHeadingRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-bold">{data.eligible ? <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" /> : <Clock3 className="h-6 w-6 shrink-0" aria-hidden="true" />}{data.eligible ? "Du bist angemeldet" : "Anmeldung gespeichert · Freigabe offen"}</p>
                {approvedClass && data.eligible && <p className="text-sm">Bestätigte Startklasse: <strong>{approvedClass}</strong></p>}
                <p className="text-sm leading-6">{data.eligible ? "Deine Zusage ist in der App gespeichert. Hier findest du auch die weiteren Informationen zum Veranstaltungstag." : "Deine Zusage bleibt gespeichert, aber deine Startberechtigung ist aktuell nicht bestätigt. Bitte kläre die Teilnahme mit der Organisation; eine endgültige Startzusage liegt derzeit nicht vor."}</p>
                {canCancel ? <StitchButton variant="ghost" disabled={busy} onClick={() => setCancelOpen(true)} className="semifinal-secondary">Vom Halbfinale abmelden</StitchButton>
                  : <p className="text-sm leading-6">Für eine Absage nach Anmeldeschluss oder bei geschlossener Anmeldung kontaktiere bitte die Organisation.</p>}
              </div>
                : <div className="space-y-3">
                  {data?.eligible ? <>
                    <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />Deine Startberechtigung ist bestätigt</p>
                    {approvedClass && <p className="text-sm">Startklasse: <strong>{approvedClass}</strong></p>}
                  </> : <>
                    <p className="flex items-start gap-2 font-bold"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />{data?.eligibility_status === "not_eligible" ? "Keine Startberechtigung freigegeben" : "Startberechtigung noch nicht bestätigt"}</p>
                    <p className="text-sm leading-6">{data?.eligibility_status === "not_eligible" ? "Für dein Profil liegt aktuell keine Freigabe vor. Wenn du einen Fehler vermutest, melde dich bitte bei der Organisation." : "Die Organisation prüft die endgültige Teilnehmerliste und Klassenzuordnung. Sobald deine Freigabe vorliegt und die Anmeldung geöffnet ist, kannst du hier zusagen."}</p>
                  </>}
                  {!data?.registration_open && <p className="text-sm font-semibold">{deadlinePassed ? "Die Anmeldefrist ist abgelaufen." : "Die Anmeldung ist derzeit noch geschlossen."}</p>}
                  <StitchButton ref={registerButtonRef} disabled={!canRegister} onClick={() => { setActionError(null); setConfirmOpen(true); }} className="semifinal-primary" aria-haspopup="dialog">
                    {busy ? "Anmeldung wird gespeichert …" : "Verbindlich zum Halbfinale anmelden"}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </StitchButton>
                </div>}
          {notice && <p role="status" className="mt-4 text-sm font-semibold">{notice}</p>}
          {actionError && !confirmOpen && <p role="alert" className="semifinal-message mt-4 text-sm font-semibold">{actionError}</p>}
        </section>

        <div className="semifinal-aside">
          <section className="semifinal-panel" aria-labelledby="event-info-heading">
            <p className="stitch-kicker semifinal-eyebrow">Für deinen Wettkampftag</p>
            <h2 id="event-info-heading" className="stitch-headline semifinal-section-title">Gut zu wissen</h2>
            <dl className="semifinal-facts mt-5 space-y-5 text-sm leading-6">
              <div><dt className="font-bold">Austragungsort</dt><dd>Kletterwelt Sauerland<br />Rosmarter Allee 12<br />58762 Altena</dd></div>
              <div><dt className="font-bold">Ablauf & Check-in</dt><dd>Startzeiten, Check-in und Hinweise zur benötigten Ausrüstung werden nach der finalen Abstimmung hier und auf der Eventseite ergänzt.</dd></div>
              <div><dt className="font-bold">Vom Halbfinale ins Finale</dt><dd>Die Finalplätze werden am Veranstaltungstag ausgeklettert.</dd></div>
              <div><dt className="font-bold">Fragen oder notwendige Korrekturen?</dt><dd><a href="mailto:info@kletterliga-nrw.de" className="break-all font-semibold underline underline-offset-4">info@kletterliga-nrw.de</a></dd></div>
            </dl>
            <Link to="/finale" className="semifinal-text-link mt-3">Zur Eventseite<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </section>
          <section className="semifinal-archive" aria-labelledby="season-archive-heading">
            <h2 id="season-archive-heading" className="stitch-kicker">Deine Saison bleibt sichtbar</h2>
            <p className="semifinal-copy mt-3">{hasEnded ? "Punkte, Routenbewertungen und Einträge bleiben erhalten. Die Ergebniseingabe ist geschlossen." : "Deine bisherigen Einträge bleiben im Teilnehmerbereich erreichbar."}</p>
            <Link to="/app/rankings" className="semifinal-archive-link"><ListOrdered size={17} aria-hidden="true" /><span>Ranglisten ansehen</span><ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/app/gyms" className="semifinal-archive-link"><LockKeyhole size={17} aria-hidden="true" /><span>Routen & Einträge ansehen</span><ArrowRight size={16} aria-hidden="true" /></Link>
          </section>
        </div>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!busy) setConfirmOpen(open); }}>
        <AlertDialogContent className="stitch-app semifinal-page semifinal-confirmation" onCloseAutoFocus={(event) => {
          event.preventDefault();
          (data?.registered ? registeredHeadingRef.current : registerButtonRef.current)?.focus();
        }}>
          <AlertDialogHeader className="semifinal-confirmation__header">
            <p className="stitch-kicker semifinal-eyebrow">Dein Finalevent · {data?.season_year ?? settings?.season_year}</p>
            <AlertDialogTitle className="stitch-headline text-2xl leading-tight">Bereit fürs Halbfinale?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[#e0d1b0]">Prüfe kurz die wichtigsten Infos. Erst mit deiner Bestätigung sagst du verbindlich zu.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="semifinal-confirmation__body">
            <dl className="semifinal-confirmation__facts text-sm leading-6">
              <div><dt><CalendarDays size={18} aria-hidden="true" />Wann</dt><dd>{eventDate}</dd></div>
              <div><dt><MapPin size={18} aria-hidden="true" />Wo</dt><dd>Kletterwelt Sauerland<span>Rosmarter Allee 12 · 58762 Altena</span></dd></div>
              <div><dt><Trophy size={18} aria-hidden="true" />Deine Startklasse</dt><dd>{approvedClass ?? "Noch nicht bestätigt"}</dd></div>
            </dl>
            <div className="semifinal-confirmation__notes text-sm leading-6">
              <p>Du startest im <strong>Halbfinale</strong>. Die Plätze im Finale werden vor Ort ausgeklettert.</p>
              <p><strong>Startzeiten & Check-in</strong> werden noch bekannt gegeben.</p>
              <p>Absagen kannst du hier bis <strong>{deadline}</strong>, solange die Anmeldung geöffnet ist. Danach hilft dir die Orga.</p>
            </div>
            {!canRegister && !busy && <p role="alert" className="semifinal-message mt-4 text-sm">Deine Anmeldung ist aktuell nicht möglich. Bitte schließe diesen Dialog und prüfe deinen Anmeldestatus.</p>}
            {actionError && <p role="alert" className="semifinal-message mt-4 text-sm font-semibold">{actionError}</p>}
          </div>
          <AlertDialogFooter className="semifinal-confirmation__footer">
            <AlertDialogCancel asChild><StitchButton variant="ghost" disabled={busy} className="semifinal-secondary">Zurück</StitchButton></AlertDialogCancel>
            <StitchButton disabled={!canRegister} onClick={() => {
              if (canRegister && !confirmingRef.current) { confirmingRef.current = true; changeRegistration.mutate("register"); }
            }} className="semifinal-primary">
              {busy ? "Anmeldung wird gespeichert …" : "Jetzt verbindlich anmelden"}{!busy && <ArrowRight size={16} aria-hidden="true" />}
            </StitchButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={cancelOpen} onOpenChange={(open) => { if (!busy) setCancelOpen(open); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-xl bg-[#fbf9f6] text-[#002637] sm:max-w-md">
          <AlertDialogHeader><AlertDialogTitle>Vom Halbfinale abmelden?</AlertDialogTitle><AlertDialogDescription className="text-[#40505a]">Deine Zusage wird zurückgenommen. Eine erneute Anmeldung ist nur während des geöffneten Anmeldezeitraums und mit gültiger Startberechtigung möglich.</AlertDialogDescription></AlertDialogHeader>
          {actionError && <p role="alert" className="text-sm text-[#8b2525]">{actionError}</p>}
          <AlertDialogFooter className="gap-3"><AlertDialogCancel disabled={busy} className="rounded-xl">Angemeldet bleiben</AlertDialogCancel><StitchButton disabled={!canCancel} onClick={() => changeRegistration.mutate("cancel")} className="whitespace-normal tracking-wider">{busy ? "Abmeldung wird gespeichert …" : "Abmeldung bestätigen"}</StitchButton></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Finale;
