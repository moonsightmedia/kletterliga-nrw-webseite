import { useRef, useState } from "react";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
import { canonicalDraftAnswers, IDEAS_CONSENT_VERSION, type IdeasDraftPayload, type IdeasSurveyAnswers } from "../../supabase/functions/submit-ideas-survey-2027/validation";

// Memory-only capability. No cookie/localStorage, account or reload-resume ID.
// Each selection starts its request immediately. Atomic server revisions prevent
// late earlier snapshots from overwriting a newer choice (or resurrecting deletion).
export function useIdeasDraft(preview: boolean) {
  const identity = useRef<{ id: string; token: string } | null>(null);
  const sequence = useRef(0);
  const latest = useRef<IdeasDraftPayload | null>(null);
  const alive = useRef(true);
  const consentGranted = useRef(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  function queue(payload: IdeasDraftPayload): Promise<void> {
    latest.current = payload;
    if (preview) { setStatus("saved"); setSaveError(""); return Promise.resolve(); }
    setStatus("saving"); setSaveError("");
    const work = submitIdeasSurvey(payload).then(() => {
      if (latest.current === payload) { setStatus("saved"); setSaveError(""); }
    }).catch(reason => {
      if (latest.current === payload) {
        setStatus("error");
        setSaveError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen. Bitte erneut versuchen.");
      }
      throw reason;
    });
    return work;
  }

  function save(answers: Partial<IdeasSurveyAnswers>, mode: IdeasDraftPayload["mode"], website: string, fillTime: number) {
    if (mode !== "delete" && !consentGranted.current) return Promise.reject(new Error("Bitte stimme vor Beginn der Speicherung zu."));
    if (!alive.current && mode !== "delete") return Promise.reject(new Error("Die Abstimmung wurde beendet."));
    if (!identity.current) identity.current = {
      id: crypto.randomUUID(),
      token: Array.from(crypto.getRandomValues(new Uint8Array(32)), v => v.toString(16).padStart(2, "0")).join(""),
    };
    return queue({ survey_version: 1, submission_id: identity.current.id, write_token: identity.current.token,
      revision: ++sequence.current, mode, answers: canonicalDraftAnswers(answers), website,
      fill_time_ms: Math.min(86_400_000, Math.max(0, fillTime)),
      ...(mode !== "delete" ? { consent: { accepted: true as const, version: IDEAS_CONSENT_VERSION } } : {}) });
  }
  function retry() { return latest.current ? queue(latest.current) : Promise.resolve(); }
  function erase(website: string, fillTime: number) {
    alive.current = false;
    consentGranted.current = false;
    if (!identity.current) return Promise.resolve();
    if (latest.current?.mode === "delete") return retry();
    sequence.current = 9999;
    return save({}, "delete", website, fillTime);
  }
  function grantConsent() { if (alive.current) consentGranted.current = true; }
  function withdrawalCode() { return identity.current ? `${identity.current.id}.${identity.current.token}` : null; }
  return { save, retry, erase, grantConsent, withdrawalCode, status, saveError };
}
