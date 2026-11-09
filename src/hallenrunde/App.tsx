import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import DecisionDatePicker from "./DecisionDatePicker";
import PeriodPicker from "./PeriodPicker";
import {
  blankReply, finalLabels, validateReply,
  type HallAccess, type Reply, type ReplyErrors, type SavedReply,
} from "./reply";
import { replyDetails } from "./replyDetails";
import "react-day-picker/dist/style.css";

const steps = ["Halle öffnen", "Rückmeldung", "Prüfen"];
const choices = [
  { value: "yes", title: "Zusage", hint: "Wir möchten 2027 dabei sein." },
  { value: "later", title: "Noch offen", hint: "Wir brauchen mehr Zeit." },
  { value: "no", title: "Absage", hint: "Wir setzen 2027 aus." },
] as const;

async function request<T>(action: string, value: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/hallenrunde-2027", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...value }),
    });
  } catch {
    throw new Error("Das Formular ist gerade nicht erreichbar. Versucht es noch einmal.");
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new Error("Das Formular ist gerade nicht erreichbar. Versucht es noch einmal.");
  if (!response.ok) throw Object.assign(new Error(data.message), { fields: data.errors, status: response.status });
  return data as T;
}

function Field({ label, name, hint, error, children }: {
  label: string; name: string; hint?: string; error?: string; children: ReactNode;
}) {
  return <div className="hr-field">
    <label id={`${name}-label`} htmlFor={name}>{label}</label>
    {hint && <p className="hr-field-hint" id={`${name}-hint`}>{hint}</p>}
    {children}
    {error && <p className="hr-error" id={`${name}-error`}>{error}</p>}
  </div>;
}

function FinalSelect({ value, onChange }: { value: Reply["final"]; onChange: (value: Reply["final"]) => void }) {
  return <Dropdown.Root modal={false}>
    <Dropdown.Trigger id="final" className="hr-select-trigger" aria-labelledby="final-label final-value">
      <span id="final-value">{value ? finalLabels[value] : "Keine Angabe"}</span>
      <span className="hr-chevron down" aria-hidden="true" />
    </Dropdown.Trigger>
    <Dropdown.Portal>
      <Dropdown.Content className="hr-select-menu" sideOffset={4} align="start" collisionPadding={16}>
        <Dropdown.RadioGroup value={value || "unset"} onValueChange={option => onChange(option === "unset" ? "" : option as Reply["final"])}>
          {[["unset", "Keine Angabe"], ...Object.entries(finalLabels)].map(([option, label]) =>
            <Dropdown.RadioItem key={option} value={option} className="hr-select-option">
              {label}<Dropdown.ItemIndicator className="hr-select-indicator" aria-hidden="true" />
            </Dropdown.RadioItem>)}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Portal>
  </Dropdown.Root>;
}

function ReplySummary({ reply }: { reply: Reply }) {
  return <dl className="hr-summary">{replyDetails(reply).map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  )}</dl>;
}

export default function App({ local = false }: { local?: boolean }) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [access, setAccess] = useState<HallAccess | null>(null);
  const [reply, setReply] = useState<Reply>(blankReply);
  const [saved, setSaved] = useState<SavedReply | null>(null);
  const [errors, setErrors] = useState<ReplyErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [step]);

  function change(patch: Partial<Reply>) {
    setReply(value => ({ ...value, ...patch }));
    setErrors(value => {
      const next = { ...value };
      for (const name of Object.keys(patch)) delete next[name as keyof Reply];
      if ("periodKind" in patch || "blockedPeriods" in patch || "blockers" in patch) {
        delete next.note;
        delete next.blockers;
      }
      return next;
    });
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!code.trim()) return setError("Gebt bitte euren Hallencode ein.");
    setBusy(true);
    try {
      const result = await request<HallAccess>("access", { code });
      setAccess(result);
      setSaved(result.saved);
      setReply(result.saved?.reply ?? blankReply);
      setCode("");
      setStep(result.saved ? 3 : 1);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Der Code konnte nicht geprüft werden.");
    } finally { setBusy(false); }
  }

  function review(event: FormEvent) {
    event.preventDefault();
    const checked = validateReply(reply);
    setErrors(checked.errors);
    setError("");
    if (!checked.reply) {
      const field = Object.keys(checked.errors)[0];
      requestAnimationFrame(() => document.getElementById(field)?.focus());
      return;
    }
    setReply(checked.reply);
    setStep(2);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const result = await request<SavedReply>("reply", { reply });
      setSaved(result);
      setStep(3);
    } catch (issue) {
      if (issue && typeof issue === "object" && "fields" in issue && issue.fields) {
        setErrors(issue.fields as ReplyErrors);
        setStep(1);
      }
      setError(issue instanceof Error ? issue.message : "Die Rückmeldung konnte nicht gespeichert werden.");
    } finally { setBusy(false); }
  }

  async function leave() {
    if (busy) return;
    setBusy(true);
    try { await request("leave", {}); }
    catch { /* Reset the local view even if the development server stopped. */ }
    finally {
      setAccess(null); setSaved(null); setReply(blankReply); setCode("");
      setError(""); setErrors({}); setStep(0); setBusy(false);
    }
  }

  const fieldProps = (name: keyof Reply, hint = false) => ({
    id: name, "aria-invalid": !!errors[name],
    "aria-describedby": [hint && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(" ") || undefined,
  });

  return <>
    <header className="hr-header"><div className="hr-wrap hr-header-inner">
      <div className="hr-brand"><img src="/logo.png" alt="" width="37" height="37" /><span>KLETTERLIGA <b>NRW</b></span></div>
      {local && <a className="hr-local" href="/hallen/2027/uebersicht/">Lokale Übersicht</a>}
    </div></header>

    <main>
      <section className="hr-hero" aria-labelledby="page-title">
        <div className="hr-hero-image" aria-hidden="true" />
        <div className="hr-wrap hr-hero-inner">
          <p className="hr-eyebrow">Partnerhallen · Saison 2027</p>
          <h1 id="page-title">Hallenanmeldung<br className="hr-hero-break" /> 2027</h1>
          <p className="hr-hero-copy">Gebt uns eine Rückmeldung zur Saison und nennt uns das Zeitfenster, das zu eurer Halle passt.</p>
        </div>
      </section>

      <div className="hr-wrap hr-layout">
        <div className="hr-card">
          {access && <div className="hr-hall-line"><span>{access.hall}</span>
            <button className="hr-link-button" type="button" onClick={leave} disabled={busy}>Halle wechseln</button></div>}
          <div className="hr-card-body">
            <p className="hr-eyebrow hr-card-kicker">{step < 3 ? `Schritt ${step + 1} von 3` : "Abgeschlossen"}</p>
            <h2 ref={heading} tabIndex={-1}>{["Halle öffnen", "Eure Rückmeldung", "Angaben prüfen", "Rückmeldung gespeichert"][step]}</h2>

            {step === 0 && <form onSubmit={unlock} className="hr-form">
              <Field label="Hallencode" name="code" hint="Den Code findet ihr in eurer Einladung." error={error}>
                <div className="hr-code-input"><input id="code" value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }} maxLength={32}
                  autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={!!error}
                  aria-describedby={`code-hint${error ? " code-error" : ""}`} /></div>
              </Field>
              <div className="hr-form-footer"><Button variant="secondary" size="lg" className="hr-action" disabled={busy} type="submit"><span>{busy ? "Code wird geprüft …" : "Formular öffnen"}</span></Button></div>
            </form>}

            {step === 1 && <form onSubmit={review} className="hr-form" noValidate>
              <fieldset className="hr-decision" id="decision" tabIndex={-1} aria-describedby={errors.decision ? "decision-error" : undefined}>
                <legend>Wie plant eure Halle für 2027?</legend>
                <div className="hr-choices">{choices.map(({ value, title, hint }) => <label className="hr-choice" key={value}>
                  <input type="radio" name="decision" value={value} checked={reply.decision === value} onChange={() => change({ decision: value })} />
                  <strong>{title}</strong><small>{hint}</small>
                </label>)}</div>
              </fieldset>
              {errors.decision && <p className="hr-error" id="decision-error">{errors.decision}</p>}

              {reply.decision === "yes" && <>
                <label className="hr-condition-toggle">
                  <input type="checkbox" checked={reply.conditions !== undefined}
                    onChange={e => change({ conditions: e.target.checked ? "" : undefined })} />
                  <span>Wir können nur unter bestimmten Bedingungen teilnehmen.</span>
                </label>
                {reply.conditions !== undefined && <Field name="conditions" label="Bedingungen für eure Teilnahme"
                  hint="Was muss geklärt oder erfüllt sein, damit ihr dabei sein könnt?" error={errors.conditions}>
                  <textarea {...fieldProps("conditions", true)} required rows={2} maxLength={600}
                    value={reply.conditions} onChange={e => change({ conditions: e.target.value })} />
                </Field>}
                <PeriodPicker reply={reply} change={change} errors={errors} />
                {!!reply.blockedPeriods?.length && <Field name="blockers" label="Hinweis zu den Sperrterminen" hint="Optional. Schreibt kurz dazu, warum diese Tage für eure Halle nicht passen." error={errors.blockers}>
                  <textarea {...fieldProps("blockers", true)} rows={2} maxLength={600} value={reply.blockers} onChange={e => change({ blockers: e.target.value })} />
                </Field>}
                <Field label="Interesse an der Finalausrichtung?" name="final">
                  <FinalSelect value={reply.final} onChange={final => change({ final })} />
                </Field>
              </>}
              {reply.decision === "later" && <Field label="Ab wann könnt ihr entscheiden?" name="decisionBy" hint="Ein voraussichtliches Datum genügt." error={errors.decisionBy}>
                <DecisionDatePicker value={reply.decisionBy} invalid={!!errors.decisionBy} onChange={decisionBy => change({ decisionBy })} />
              </Field>}

              {reply.decision && <Field label={reply.decision === "no" ? "Möchtet ihr uns einen Grund nennen?" : "Was möchtet ihr uns noch mitgeben?"}
                name="note" error={errors.note}>
                <textarea {...fieldProps("note")} rows={2} maxLength={1200} value={reply.note} onChange={e => change({ note: e.target.value })} />
              </Field>}
              {error && <p className="hr-error" role="alert">{error}</p>}
              <div className="hr-form-footer"><Button variant="secondary" size="lg" type="submit" className="hr-action"><span>Angaben prüfen</span></Button></div>
            </form>}

            {step === 2 && <form onSubmit={save} className="hr-form">
              <p className="hr-muted">Prüft eure Angaben für {access?.hall} vor dem Speichern.</p>
              <ReplySummary reply={reply} />
              {local && <p className="hr-demo">Diese Antwort wird in der lokalen Testdatenbank gespeichert.</p>}
              {error && <p className="hr-error" role="alert">{error}</p>}
              <div className="hr-actions hr-form-footer">
                <Button variant="outline" size="lg" className="hr-action" type="button" onClick={() => { setError(""); setStep(1); }} disabled={busy}><span>Bearbeiten</span></Button>
                <Button variant="secondary" size="lg" className="hr-action" type="submit" disabled={busy}><span>{busy ? "Wird gespeichert …" : "Rückmeldung speichern"}</span></Button>
              </div>
            </form>}

            {step === 3 && saved && <div className="hr-form">
              <p className="hr-success">Die Rückmeldung für {access?.hall} ist gespeichert.</p>
              <ReplySummary reply={saved.reply} />
              <Button variant="outline" size="lg" type="button" className="hr-action" onClick={() => { setReply(saved.reply); setStep(1); }}><span>Angaben bearbeiten</span></Button>
            </div>}
          </div>
        </div>

        <aside className="hr-sidebar" aria-label="Frist und Formularschritte">
          <div className="hr-deadline"><div>
            <p className="hr-eyebrow">Rückmeldung bis</p>
            <strong>22. November 2026</strong>
          </div></div>
          <ol className="hr-step-list" aria-label="Fortschritt">
            {steps.map((label, index) => <li key={label} className={index === step ? "current" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>
              <span aria-hidden="true">{`0${index + 1}`}</span>{label}
            </li>)}
          </ol>
          <div className="hr-side-help"><p>Fragen zur Saison?<br /><a href="mailto:info@kletterliga-nrw.de">info@kletterliga-nrw.de</a></p></div>
        </aside>
      </div>
    </main>
    <footer className="hr-footer"><div className="hr-wrap"><strong>Kletterliga NRW</strong><span>Hallenanmeldung · Saison 2027</span></div></footer>
  </>;
}
