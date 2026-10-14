import { isSupabaseConfigured, supabaseConfig } from "@/services/supabase";
import { validateIdeasDraftPayload, type IdeasDraftPayload } from "../../supabase/functions/submit-ideas-survey-2027/validation";

export async function submitIdeasSurvey(payload: IdeasDraftPayload): Promise<void> {
  if (!validateIdeasDraftPayload(payload).valid) throw new Error("Bitte prüfe deine Antworten und versuche es erneut.");
  if (!isSupabaseConfigured) throw new Error("Die Abstimmung ist noch nicht freigeschaltet. Deine Antworten bleiben auf dieser Seite erhalten.");
  try {
    const response = await fetch(`${supabaseConfig.url}/functions/v1/submit-ideas-survey-2027`, {
      method: "POST",
      // Deliberately no participant session token: answers are not linked to an account.
      headers: { "Content-Type": "application/json", apikey: supabaseConfig.anonKey },
      body: JSON.stringify(payload),
      // Already initiated explicit answer writes can finish during navigation.
      // No unload listener, extra tracking event, cookie or background retry loop.
      keepalive: true,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 429) throw new Error("Gerade sind zu viele Anfragen eingegangen. Bitte versuche es später erneut.");
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) throw new Error("Deine Stimme konnte nicht gespeichert werden. Bitte versuche es erneut.");
  } catch (error) {
    if (error instanceof Error && /^(Gerade|Deine Stimme)/.test(error.message)) throw error;
    throw new Error("Die Verbindung ist gerade nicht erreichbar. Deine Antworten sind noch da. Bitte versuche es erneut.");
  }
}
