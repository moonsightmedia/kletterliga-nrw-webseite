import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { parseIdeasWithdrawalCode } from "@/lib/ideasConsent2027";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
import "./ideen-2027.css";

export default function IdeenWiderruf2027({ preview = import.meta.env.DEV }: { preview?: boolean }) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (removed) successHeading.current?.focus(); }, [removed]);
  usePageMeta({ title: "Ideen 2027 – Einwilligung widerrufen", description: "Einwilligung zur Ideen-Umfrage widerrufen und Antworten entfernen.", canonicalPath: "/ideen-2027/widerruf", noindex: true });
  async function withdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || removed) return;
    const identity = parseIdeasWithdrawalCode(code);
    if (!identity) { setError("Bitte gib den vollständigen Widerrufscode aus deiner gespeicherten Datei ein."); return; }
    setError(""); setSending(true);
    try {
      if (!preview) await submitIdeasSurvey({ survey_version: 1, submission_id: identity.id, write_token: identity.token,
        revision: 10000, mode: "delete", answers: {}, website: "", fill_time_ms: 0 });
      setCode(""); setRemoved(true);
    } catch { setError("Das Entfernen konnte nicht bestätigt werden. Bitte prüfe deinen Code und versuche es erneut."); }
    finally { setSending(false); }
  }
  return <PageLayout><section className="ideas-page ideas-withdrawal-page"><div className="container-kl ideas-survey-shell"><div className="ideas-consent">
    <p className="ideas-eyebrow">Ideen für 2027</p><h1>Einwilligung widerrufen</h1>
    {preview && <p className="ideas-preview-note">Vorschau: Es werden keine gespeicherten Antworten verändert.</p>}
    {removed ? <div role="status"><h2 ref={successHeading} tabIndex={-1}>{preview ? "Vorschau abgeschlossen." : "Antworten entfernt."}</h2><p>{preview ? "Dieser Test hat keine gespeicherten Antworten verändert." : "Deine Einzelantworten werden nicht mehr ausgewertet. Deine Einwilligung ist widerrufen."}</p></div> : <>
      <p>Mit deinem Widerrufscode kannst du deine Einwilligung zurücknehmen und deine Einzelantworten entfernen. Du brauchst dafür kein Teilnehmerkonto.</p>
      <form onSubmit={withdraw} className="ideas-note-field"><label htmlFor="withdrawal-code">Dein vertraulicher Widerrufscode</label><input id="withdrawal-code" type="password" autoComplete="off" spellCheck={false} maxLength={102} value={code} onChange={event => setCode(event.target.value)} disabled={sending} aria-describedby="withdrawal-code-hint" />
        <p id="withdrawal-code-hint">Du findest ihn in deiner heruntergeladenen Datei „Kletterliga-2027-Widerrufscode.txt“. Ohne Code können wir deine Einsendung nicht sicher zuordnen.</p>
        {error && <p role="alert" className="ideas-form-error">{error}</p>}
        <button className="ideas-primary" type="submit" disabled={sending} aria-busy={sending}><span>{sending ? "Wird entfernt …" : "Einwilligung widerrufen & Antworten entfernen"}</span><ArrowRight size={18} /></button>
      </form>
    </>}
    <Link className="ideas-secondary" to="/saison/2027#ideen-2027">Zur 2027-Seite</Link>
  </div></div></section></PageLayout>;
}
