import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { changeIdeasAnswer, emptyIdeasAnswers, ideasSurveySteps, selectedIdeaLabels, unansweredQuestions, visibleQuestions, visibleAnswerValue, type DraftAnswers, type SurveyField, type SurveyQuestion } from "@/lib/ideasSurvey2027";
import { useIdeasDraft } from "@/hooks/useIdeasDraft";
import { ideasConsentNotice, IDEAS_WITHDRAWAL_PATH } from "@/lib/ideasConsent2027";
import { canonicalAnswers, validateIdeasSurveyAnswers, validateIdeasDraftAnswers, MAX_IDEA_TEXT_LENGTH } from "../../supabase/functions/submit-ideas-survey-2027/validation";
import "./ideen-2027.css";

function VoteQuestion({ question, answers, invalid, onChoose, note, extra, legendRef }: {
  question: SurveyQuestion; answers: DraftAnswers; invalid: boolean; onChoose: (field: SurveyField, value: string) => void; note?: ReactNode; extra?: ReactNode; legendRef: RefObject<HTMLLegendElement>;
}) {
  const { field, title, description, options, multiple } = question;
  return <fieldset className="ideas-question" aria-describedby={`${description ? `${field}-hint ` : ""}${invalid ? `${field}-error` : ""}`.trim() || undefined}>
    <legend ref={legendRef} tabIndex={-1} aria-describedby={description ? `${field}-hint` : undefined}>{title}</legend>
    {description && <p className="ideas-hint" id={`${field}-hint`}>{description}</p>}
    {extra}
    {multiple && <p className="ideas-selection-note">Mehrfachauswahl möglich</p>}
    {!multiple && note}
    <div className={`ideas-options ${options.length === 1 ? "ideas-options-single" : ""}`}>
      {options.map(option => {
        const checked = multiple ? answers.league_changes.includes(option.value) : visibleAnswerValue(field, answers) === option.value;
        return <label key={option.value} className="ideas-choice">
          <input type={multiple ? "checkbox" : "radio"} name={field} value={option.value} checked={checked} onChange={() => onChoose(field, option.value)} onClick={() => { if (checked && !multiple) onChoose(field, option.value); }} aria-invalid={invalid || undefined} />
          <span className={`ideas-choice-content ${checked ? "is-selected" : ""}`}>
            <span className={`ideas-choice-indicator ${multiple ? "is-square" : ""}`} aria-hidden="true">{checked && <Check size={14} strokeWidth={3} />}</span>
            <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          </span>
        </label>;
      })}
    </div>
    {multiple && note}
    {invalid && <p className="ideas-field-error" id={`${field}-error`}>Bitte wähle mindestens eine Antwort.</p>}
  </fieldset>;
}

function HallExamples() {
  return <aside className="ideas-hall-example" aria-label="Beispiele für regionale Hallengruppen">
    <p className="ideas-eyebrow">So könnte eine regionale Gruppe aussehen</p>
    <div className="ideas-region-examples">
      <div><strong>Beispiel: Raum Köln</strong><p>Drei Hallen im Raum Köln bilden eine Gruppe. Du kletterst deine Qualifikation in dieser Gruppe.</p></div>
      <span aria-hidden="true">/</span>
      <div><strong>Beispiel: weitere Region</strong><p>Eine andere Gruppe könnte zum Beispiel 2T, Kletterwelt Sauerland und eine weitere Halle umfassen.</p></div>
    </div>
    <p className="ideas-example-caution">Schematische Beispiele mit je drei Hallen, keine festgelegte Einteilung. Die unten gewählte Hallenzahl könnte diese Gruppen vergrößern. Die tatsächlichen Gruppen müssten zu Wegen und Hallenzahl passen. Für ein gemeinsames Finale wären faire Qualifikationsregeln festzulegen.</p>
  </aside>;
}

export default function Ideen2027({ preview = import.meta.env.DEV }: { preview?: boolean }) {
  const compact = true;
  const [consented, setConsented] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const hasConsent = useRef(false);
  const [answers, setAnswers] = useState<DraftAnswers>(emptyIdeasAnswers);
  const [step, setStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [invalidFields, setInvalidFields] = useState<SurveyField[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uncertainSubmission, setUncertainSubmission] = useState(false);
  const [sent, setSent] = useState(false);
  const [erased, setErased] = useState(false);
  const [eraseAttempted, setEraseAttempted] = useState(false);
  const [website, setWebsite] = useState("");
  const [openedAt] = useState(() => Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const questionLegend = useRef<HTMLLegendElement>(null);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openNotes, setOpenNotes] = useState<Partial<Record<SurveyField, boolean>>>({});
  const draft = useIdeasDraft(preview);
  const liveAnswers = useRef(answers);
  const hasNavigated = useRef(false);
  const formAnchor = useRef<HTMLDivElement>(null);
  const questionAnchor = useRef<HTMLFormElement>(null);
  const inReview = step === ideasSurveySteps.length;
  const currentStep = ideasSurveySteps[step];
  const currentQuestions = inReview ? [] : visibleQuestions(currentStep, answers);
  const activeQuestionIndex = Math.min(questionIndex, Math.max(0, currentQuestions.length - 1));
  const shownQuestions = compact ? currentQuestions.slice(activeQuestionIndex, activeQuestionIndex + 1) : currentQuestions;
  const activeQuestion = shownQuestions[0];
  const noteIsOpen = !!activeQuestion?.noteField && (!!activeQuestion.multiple || !!openNotes[activeQuestion.field] || !!answers[activeQuestion.noteField]);
  const needsContinue = inReview || !!activeQuestion?.multiple || noteIsOpen;
  const lastQuestion = !compact || activeQuestionIndex === currentQuestions.length - 1;
  const answeredThemes = ideasSurveySteps.filter(section => unansweredQuestions(section, answers).length === 0).length;
  const progress = Math.round(answeredThemes / ideasSurveySteps.length * 100);

  useEffect(() => {
    if (!hasNavigated.current) return;
    const target = compact && consented && !sent ? questionAnchor.current : formAnchor.current;
    target?.scrollIntoView?.({ behavior: "auto", block: "start" });
    const focusTarget = !inReview && !sent && !erased ? questionLegend.current : heading.current;
    focusTarget?.focus({ preventScroll: true });
  }, [step, questionIndex, sent, erased, compact, inReview, consented]);
  useEffect(() => () => { if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current); }, []);
  useEffect(() => {
    if (consented || consentDismissed || typeof IntersectionObserver === "undefined" || !formAnchor.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setConsentDialogOpen(true); observer.disconnect(); }
    }, { rootMargin: "-112px 0px -30% 0px", threshold: 0 });
    observer.observe(formAnchor.current);
    return () => observer.disconnect();
  }, [consented, consentDismissed]);

  function moveTo(next: number, editing = false, nextQuestion = 0) {
    hasNavigated.current = true;
    setStep(next);
    setQuestionIndex(nextQuestion);
    setFurthest(previous => Math.max(previous, next));
    setReturnToReview(editing);
    setError("");
    setInvalidFields([]);
  }

  function moveQuestion(nextQuestion: number) {
    hasNavigated.current = true;
    setQuestionIndex(nextQuestion);
    setError("");
    setInvalidFields([]);
  }

  function back() {
    if (compact && !inReview && activeQuestionIndex > 0) { moveQuestion(activeQuestionIndex - 1); return; }
    if (returnToReview) { moveTo(ideasSurveySteps.length); return; }
    const previous = step - 1;
    const last = compact ? visibleQuestions(ideasSurveySteps[previous], answers).length - 1 : 0;
    moveTo(previous, false, last);
  }

  function choose(field: SurveyField, value: string) {
    if (!consented || sending || uncertainSubmission || eraseAttempted) return;
    const next = changeIdeasAnswer(liveAnswers.current, field, value);
    liveAnswers.current = next;
    setAnswers(next);
    persistDraft(next);
    setInvalidFields(previous => previous.filter(item => item !== field));
    setError("");
    if (!activeQuestion?.multiple && !noteIsOpen) goForward(next);
  }

  function persistDraft(next = liveAnswers.current) {
    if (noteSaveTimer.current) { clearTimeout(noteSaveTimer.current); noteSaveTimer.current = null; }
    if (!consented || sending || uncertainSubmission || eraseAttempted || sent || erased) return;
    if (validateIdeasDraftAnswers(next)) void draft.save(next, "draft", website, Date.now() - openedAt).catch(() => undefined);
  }

  function changeNote(field: "league_idea" | "weighting_idea", value: string) {
    const clipped = value.slice(0, MAX_IDEA_TEXT_LENGTH);
    const safeText = Array.from(clipped).filter(character => {
      const code = character.charCodeAt(0);
      return code < 0xd800 || code > 0xdfff || character.length === 2;
    }).join("");
    const next = { ...liveAnswers.current, [field]: safeText };
    liveAnswers.current = next; setAnswers(next);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => persistDraft(), 400);
  }

  function goForward(next: DraftAnswers) {
    const questions = visibleQuestions(currentStep, next);
    if (activeQuestionIndex < questions.length - 1) moveQuestion(activeQuestionIndex + 1);
    else moveTo(returnToReview ? ideasSurveySteps.length : step + 1);
  }

  function noteControl(question: SurveyQuestion) {
    if (!question.noteField) return null;
    const field = question.noteField;
    const opened = question.multiple || openNotes[question.field] || !!answers[field];
    if (!opened) return <button type="button" className="ideas-note-toggle" onClick={() => setOpenNotes(previous => ({ ...previous, [question.field]: true }))}>Eigene Idee ergänzen (optional)</button>;
    return <div className="ideas-note-field"><label htmlFor={field}>{question.noteLabel} <span>(optional)</span></label><textarea id={field} name={field} rows={3} maxLength={MAX_IDEA_TEXT_LENGTH} value={answers[field] ?? ""} onChange={event => changeNote(field, event.target.value)} onBlur={() => persistDraft()} aria-describedby={`${field}-note-hint`} placeholder="Dein Vorschlag …" /><p id={`${field}-note-hint`}>Bitte keine Namen oder Kontaktdaten. <span>{(answers[field] ?? "").length}/{MAX_IDEA_TEXT_LENGTH} Zeichen</span></p></div>;
  }

  async function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consented || sending) return;
    if (!inReview) {
      const missing = shownQuestions.filter(question => question.multiple ? !answers.league_changes.length : !answers[question.field]);
      if (missing.length) {
        setInvalidFields(missing.map(question => question.field));
        setError("Bitte wähle eine der markierten Antwortmöglichkeiten.");
        heading.current?.focus({ preventScroll: true });
        return;
      }
      persistDraft();
      goForward(answers);
      return;
    }
    const firstIncomplete = ideasSurveySteps.findIndex(section => unansweredQuestions(section, answers).length > 0);
    if (firstIncomplete !== -1) { moveTo(firstIncomplete, true); return; }
    if (!validateIdeasSurveyAnswers(answers)) { setError("Bitte prüfe deine Antworten. Die Abstimmung konnte noch nicht abgeschickt werden."); return; }
    const validatedAnswers = canonicalAnswers(answers);
    if (preview) { hasNavigated.current = true; setSent(true); return; }
    setSending(true);
    setError("");
    try {
      if (uncertainSubmission) await draft.retry();
      else await draft.save(validatedAnswers, "complete", website, Date.now() - openedAt);
      hasNavigated.current = true;
      setSent(true);
    } catch (reason) {
      setUncertainSubmission(true);
      setError(reason instanceof Error ? reason.message : "Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.");
    } finally { setSending(false); }
  }

  async function erase() {
    if (noteSaveTimer.current) { clearTimeout(noteSaveTimer.current); noteSaveTimer.current = null; }
    setEraseAttempted(true);
    setSending(true); setError("");
    try {
      await draft.erase(website, Date.now() - openedAt);
      setAnswers(emptyIdeasAnswers); liveAnswers.current = emptyIdeasAnswers;
      hasNavigated.current = true; setErased(true);
      setConsented(false);
    } catch { setError("Die Löschung konnte nicht bestätigt werden. Bitte versuche es erneut, bevor du die Seite schließt."); }
    finally { setSending(false); }
  }

  function consent() {
    draft.grantConsent(); hasConsent.current = true; hasNavigated.current = true;
    setConsented(true); setConsentDialogOpen(false);
  }

  function downloadWithdrawalCode() {
    const code = draft.withdrawalCode();
    if (!code) return;
    const text = `Kletterliga NRW – Ideen-Umfrage 2027\nWiderrufscode (vertraulich):\n${code}\n\nAntworten entfernen: https://www.kletterliga-nrw.de${IDEAS_WITHDRAWAL_PATH}\nDort den Code eingeben. Nicht an andere weitergeben. Mit dem Code lassen sich deine Antworten entfernen.\n${preview ? "Nur Vorschau: Es wurde nichts gespeichert.\n" : ""}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "Kletterliga-2027-Widerrufscode.txt"; link.click();
    const revoke = URL.revokeObjectURL.bind(URL);
    setTimeout(() => revoke(url), 1000);
  }

  const eraseControls = consented && <div className="ideas-erase">
    {eraseAttempted && error && <p className="ideas-form-error" role="alert">{error}</p>}
    <button type="button" disabled={sending} onClick={erase}>{sending ? "Antworten werden entfernt …" : eraseAttempted ? "Entfernen erneut versuchen" : "Einwilligung widerrufen & Antworten entfernen"}</button>
    {!eraseAttempted && draft.status !== "idle" && <details className="ideas-withdrawal-receipt"><summary>Später widerrufen</summary><p>Sichere deinen vertraulichen Widerrufscode, bevor du die Seite schließt. Damit kannst du deine Antworten auch später ohne Konto entfernen. Ohne Code können wir deine Einsendung nicht sicher zuordnen.</p><button type="button" onClick={downloadWithdrawalCode}>Widerrufscode herunterladen</button><Link to={IDEAS_WITHDRAWAL_PATH} target="_blank" rel="noopener noreferrer">Zur Widerrufsseite (neuer Tab)</Link></details>}
  </div>;

  return <DialogPrimitive.Root open={consentDialogOpen} onOpenChange={open => {
    setConsentDialogOpen(open); if (!open && !hasConsent.current) setConsentDismissed(true);
  }}><section className="ideas-page ideas-embedded" aria-labelledby="ideas-section-title">
    <div className="container-kl ideas-survey-shell" id="ideen-2027" tabIndex={-1} ref={formAnchor}>
      <h2 className="ideas-section-title" id="ideas-section-title">IDEEN FÜR 2027</h2>
      {preview && <p className="ideas-preview-note"><strong>Vorschau.</strong> Antworten werden nicht gespeichert.</p>}

      {!consented && !sent && !erased && <div className="ideas-consent-reopen"><DialogPrimitive.Trigger asChild><button type="button" className="ideas-primary"><span>Umfrage starten</span><ArrowRight size={18} /></button></DialogPrimitive.Trigger></div>}

      {erased ? <section className="ideas-success" role="status"><h3 tabIndex={-1} ref={heading}>ANTWORTEN ENTFERNT.</h3><p>{preview ? "Vorschau: Es waren keine Antworten gespeichert." : "Deine Antworten werden nicht mehr ausgewertet. Du kannst die Seite jetzt schließen."}</p></section> : sent ? <section className="ideas-success" role="status">
        <>
        <Check size={38} aria-hidden="true" /><p className="ideas-eyebrow">{preview ? "Vorschau abgeschlossen" : "Abstimmung abgeschlossen"}</p>
        <h2 tabIndex={-1} ref={heading}>{preview ? "TEST GESCHAFFT." : "DANKE FÜRS MITGESTALTEN!"}</h2>
        <p>{preview ? "Alle Antworten wurden geprüft. Dieser Test hat keine Stimme gespeichert." : "Deine Antworten sind gespeichert und fließen in die Auswertung für die Saison 2027 ein."}</p>
        <p>Welche Ideen umgesetzt werden, entscheiden wir nach der Auswertung und der Abstimmung mit den Hallen.</p>
        <Link to="/saison/2027" className="ideas-secondary">Zum Ausblick 2027 <ArrowRight size={17} /></Link>
        </>
        {eraseControls}
      </section> : <div className={`ideas-survey-grid ${!consented ? "ideas-awaiting-consent" : ""}`}>
        <aside className="ideas-step-sidebar" aria-label="Fortschritt der Abstimmung">
          <p className="ideas-eyebrow">Dein Überblick</p>
          <p className="ideas-progress-label"><strong>{answeredThemes}</strong> von 8 Themen beantwortet</p>
          <div className="ideas-progress-track" role="progressbar" aria-label="Beantwortete Themen" aria-valuemin={0} aria-valuemax={8} aria-valuenow={answeredThemes}><span style={{ width: `${progress}%` }} /></div>
          <nav aria-label="Themen der Abstimmung"><ol>{ideasSurveySteps.map((section, index) => <li key={section.title}>
            <button type="button" onClick={() => moveTo(index, inReview || returnToReview)} disabled={!consented || sending || uncertainSubmission || index > furthest} aria-current={index === step ? "step" : undefined}>
              <span className="ideas-step-number" aria-hidden="true">{unansweredQuestions(section, answers).length === 0 ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span>{section.title}
            </button>
          </li>)}</ol></nav>
          <p className="ideas-sidebar-note"><ShieldCheck size={18} aria-hidden="true" /> Wir fragen weder Namen noch E-Mail-Adressen ab.</p>
        </aside>

        <form ref={questionAnchor} onSubmit={advance} className={`ideas-form ${compact ? "ideas-form-compact" : ""}`} noValidate>
          <div className="ideas-step-topline"><p className="ideas-eyebrow">{inReview ? "Deine Antworten" : `Thema ${String(step + 1).padStart(2, "0")} / 08`}</p>{compact && !inReview && <span>Frage {activeQuestionIndex + 1} / {currentQuestions.length}</span>}</div>
          <h3 className="ideas-current-title" ref={heading} tabIndex={-1}>{inReview ? "ALLES SO RICHTIG?" : currentStep.title.toLocaleUpperCase("de-DE")}</h3>
          {inReview && <p className="ideas-step-intro">{preview ? "Prüfe deine Auswahl zum Abschluss des Tests." : "Antworten werden bereits während der Auswahl gespeichert. Hier prüfst du sie und schließt die Abstimmung ab."}</p>}
          {!consented && <p className="ideas-lock-hint" id="ideas-consent-required">Antworten erst nach deiner Zustimmung.</p>}
          <fieldset className="ideas-controls" disabled={!consented || sending || eraseAttempted} aria-describedby={!consented ? "ideas-consent-required" : undefined}>
            <legend className="sr-only">{inReview ? "Antworten prüfen" : currentStep.title}</legend>
            {inReview ? <div className="ideas-review">{ideasSurveySteps.map((section, index) => <section key={section.title}>
              <div className="ideas-review-heading"><h3>{section.title}</h3><button type="button" disabled={uncertainSubmission} onClick={() => moveTo(index, true)} aria-label={`Antworten zu ${section.title} ändern`}>Ändern <ArrowRight size={14} /></button></div>
              <dl>{visibleQuestions(section, answers).map(question => <div key={question.field}><dt>{question.title}</dt><dd>{selectedIdeaLabels(question, answers).join(" · ")}</dd>{question.noteField && answers[question.noteField]?.trim() && <><dt>{question.noteLabel}</dt><dd className="ideas-note-review">{answers[question.noteField]}</dd></>}</div>)}</dl>
            </section>)}</div> : <div className="ideas-question-list">{shownQuestions.map(question => <div key={question.field}>
              <VoteQuestion question={question} answers={answers} onChoose={choose} invalid={invalidFields.includes(question.field)} note={noteControl(question)} extra={question.field === "hall_model" && <details className="ideas-hall-details"><summary>Beispiele für regionale Hallengruppen</summary><HallExamples /></details>} legendRef={questionLegend} />
            </div>)}</div>}
            {inReview && <div className="ideas-privacy"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Nur für die Saisonplanung.</strong><p>Die Antworten werden ohne Name und E-Mail ausgewertet und nicht mit einem Teilnehmerkonto verknüpft. Technische Betriebsdaten können beim Hosting anfallen. Mehr in den <Link to="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzhinweisen (neuer Tab)</Link>.</p><p>Bitte nur einmal abstimmen. Ohne Anmeldung können wir eine Person nicht sicher als einmalige Stimme erkennen.</p></div></div>}
            <div className="ideas-honeypot" aria-hidden="true"><label htmlFor="ideas-website">Website</label><input id="ideas-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></div>
            {error && !eraseAttempted && <p className="ideas-form-error" role="alert">{error}</p>}
            {uncertainSubmission && <p className="ideas-hint">Bitte sende dieselben Antworten erneut ab. Bei einer unterbrochenen Verbindung könnte der erste Versuch schon gespeichert sein. Deshalb bleiben Änderungen jetzt gesperrt; ein unveränderter Wiederholungsversuch wird nicht doppelt gezählt.</p>}
            {consented && <div className="ideas-save-status" aria-live="polite"><span>{preview ? "Vorschau · keine Speicherung" : draft.status === "saving" ? "Auswahl wird gespeichert …" : draft.status === "saved" ? "Aktuelle Auswahl gespeichert" : draft.status === "error" ? "Aktuelle Auswahl noch nicht gespeichert" : "Speicherung ab deiner ersten Auswahl"}</span>{!preview && draft.status === "error" && !uncertainSubmission && <button type="button" onClick={() => void draft.retry().catch(() => undefined)}>Erneut speichern</button>}</div>}
            {!preview && draft.saveError && !uncertainSubmission && <p className="ideas-form-error" role="alert">{draft.saveError}</p>}
            {consented && <div className="ideas-form-actions">
              {step > 0 || (compact && activeQuestionIndex > 0) || returnToReview ? <button type="button" disabled={uncertainSubmission} className="ideas-back" onClick={back}><ArrowLeft size={16} />{returnToReview && (!compact || activeQuestionIndex === 0) ? "Zur Übersicht" : "Zurück"}</button> : <span />}
              {needsContinue ? <button type="submit" className="ideas-primary" aria-busy={sending}><span>{sending ? "Wird gespeichert …" : inReview ? preview ? "Testantwort prüfen" : "Abstimmung abschließen" : !lastQuestion ? "Weiter" : returnToReview ? "Zur Übersicht" : step === 7 ? "Antworten prüfen" : "Weiter"}</span>{!sending && <ArrowRight size={18} />}</button> : <p className="ideas-auto-hint">Antwort anklicken → nächste Frage</p>}
            </div>}
          </fieldset>
          {eraseControls}
        </form>
      </div>}
    </div>
  </section>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ideas-consent-overlay" />
      <DialogPrimitive.Content className="ideas-page ideas-consent-dialog" onCloseAutoFocus={event => {
        if (hasConsent.current) { event.preventDefault(); questionLegend.current?.focus({ preventScroll: true }); }
      }}>
        <DialogPrimitive.Title className="ideas-consent-dialog-title">Kurz bevor du startest</DialogPrimitive.Title>
        <DialogPrimitive.Close className="ideas-consent-close" aria-label="Einwilligungsfenster schließen"><X size={18} aria-hidden="true" /></DialogPrimitive.Close>
        <DialogPrimitive.Description className="ideas-consent-summary">Die Kletterliga GbR speichert und nutzt deine Antworten für die Planung 2027 – ab der ersten Auswahl, auch bei Abbruch. Freiwillig und jederzeit widerruflich.</DialogPrimitive.Description>
        <p className="ideas-consent-summary">{ideasConsentNotice.age}</p>
        <div className="ideas-consent-actions"><button type="button" className="ideas-primary" onClick={consent}><span>Einverstanden – Umfrage starten</span><ArrowRight size={18} /></button></div>
        <div className="ideas-consent-below">
          <p className="ideas-consent-links"><Link to="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzhinweise</Link> · <Link to={IDEAS_WITHDRAWAL_PATH}>Einwilligung widerrufen</Link></p>
          <details><summary>Details zur Einwilligung</summary><p>{ideasConsentNotice.purpose}</p><p>{ideasConsentNotice.partial}</p><p>{ideasConsentNotice.withdrawal}</p><p>Keine Kontoverknüpfung, keine abgefragten Namen oder E-Mail-Adressen. Bitte keine personenbezogenen Angaben in die Ideentexte. Einzelantworten löschen wir nach der Planung, spätestens am 31.03.2027.</p><p>Während der Umfrage kannst du mit einem Klick widerrufen. Für später kannst du einen vertraulichen Widerrufscode herunterladen. Technische Zugriffsdaten können beim Hosting anfallen.</p></details>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
