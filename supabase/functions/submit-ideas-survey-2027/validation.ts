// Shared by the public form and Edge Function. Never persist transport/abuse fields.
export type YesNoUnsure = "yes" | "no" | "unsure";
export type IdeasSurveyAnswers = {
  digitalization: YesNoUnsure;
  paper_cards: YesNoUnsure;
  team_mode: YesNoUnsure;
  team_size?: "two" | "four" | "either" | "unsure";
  team_scoring?: "team_only" | "both" | "unsure";
  shirt_interest: YesNoUnsure;
  shirt_policy?: "mandatory" | "optional" | "unsure";
  pro_league: YesNoUnsure;
  pro_rule?: "squad_required" | "voluntary" | "unsure";
  league_changes: ("keep" | "skill_classes" | "age_middle" | "age_more" | "age_classes" | "fewer_classes" | "other" | "unsure")[];
  league_idea?: string;
  weighting_idea?: string;
  qual_weight: "stronger" | "controlled_only" | "same" | "unsure";
  hall_model: "all" | "regions" | "choose" | "unsure";
  hall_count: "4" | "6" | "8" | "10" | "unsure";
  community_events: "kickoff" | "during" | "both" | "none" | "unsure";
  weighting: "none" | "drop_one" | "double_one" | "both" | "unsure";
};
export type IdeasSurveyPayload = {
  survey_version: 1;
  submission_id: string;
  answers: IdeasSurveyAnswers;
  website: string;
  fill_time_ms: number;
};
export const MAX_SURVEY_BYTES = 8192;
export const MAX_IDEA_TEXT_LENGTH = 500;
export const IDEAS_CONSENT_VERSION = 2;
export type IdeasDraftPayload = {
  survey_version: 1; submission_id: string; write_token: string; revision: number;
  mode: "draft" | "complete" | "delete"; answers: Partial<IdeasSurveyAnswers>;
  website: string; fill_time_ms: number;
  consent?: { accepted: true; version: typeof IDEAS_CONSENT_VERSION };
};
const yesNo = ["yes", "no", "unsure"] as const;
const coreChoices = {
  digitalization: yesNo,
  paper_cards: yesNo,
  team_mode: yesNo,
  shirt_interest: yesNo,
  pro_league: yesNo,
  qual_weight: ["stronger", "controlled_only", "same", "unsure"],
  hall_model: ["all", "regions", "choose", "unsure"],
  hall_count: ["4", "6", "8", "10", "unsure"],
  community_events: ["kickoff", "during", "both", "none", "unsure"],
  weighting: ["none", "drop_one", "double_one", "both", "unsure"],
} as const;
const conditionalChoices = {
  team_size: { parent: "team_mode", values: ["two", "four", "either", "unsure"] },
  team_scoring: { parent: "team_mode", values: ["team_only", "both", "unsure"] },
  shirt_policy: { parent: "shirt_interest", values: ["mandatory", "optional", "unsure"] },
  pro_rule: { parent: "pro_league", values: ["squad_required", "voluntary", "unsure"] },
} as const;
const leagueChoices = ["keep", "skill_classes", "age_middle", "age_more", "age_classes", "fewer_classes", "other", "unsure"];
const textFields = ["league_idea", "weighting_idea"] as const;
const answerKeys = new Set([...Object.keys(coreChoices), ...Object.keys(conditionalChoices), "league_changes", ...textFields]);
const validText = (v: unknown) => typeof v === "string" && v.length <= MAX_IDEA_TEXT_LENGTH && [...v].every(character => {
  const code = character.charCodeAt(0);
  return code !== 127 && (code >= 32 || code === 9 || code === 10 || code === 13) &&
    (code < 0xd800 || code > 0xdfff || character.length === 2);
});
const normalizeText = (v: string) => v.replace(/\r\n?/g, "\n").trim();
const envelopeKeys = new Set(["survey_version", "submission_id", "answers", "website", "fill_time_ms"]);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function validateIdeasDraftAnswers(value: unknown): value is Partial<IdeasSurveyAnswers> {
  if (!isRecord(value) || Object.keys(value).some(key => !answerKeys.has(key))) return false;
  for (const [field, options] of Object.entries(coreChoices)) {
    if (field in value && (typeof value[field] !== "string" || !(options as readonly string[]).includes(value[field] as string))) return false;
  }
  for (const [field, definition] of Object.entries(conditionalChoices)) {
    if (field in value && (value[definition.parent] !== "yes" || typeof value[field] !== "string" || !(definition.values as readonly string[]).includes(value[field] as string))) return false;
  }
  if ("league_changes" in value) {
    const changes = value.league_changes;
    if (!Array.isArray(changes) || changes.length > leagueChoices.length || new Set(changes).size !== changes.length || !changes.every(v => typeof v === "string" && leagueChoices.includes(v))) return false;
    if ((changes.includes("keep") || changes.includes("unsure")) && changes.length !== 1) return false;
  }
  for (const field of textFields) if (field in value && !validText(value[field])) return false;
  return true;
}

export function canonicalDraftAnswers(value: Partial<IdeasSurveyAnswers>): Partial<IdeasSurveyAnswers> {
  const result: Record<string, unknown> = {};
  for (const key of [...answerKeys].sort()) {
    if (key === "league_changes") { if (value.league_changes?.length) result[key] = [...value.league_changes].sort(); }
    else if ((textFields as readonly string[]).includes(key)) {
      const text = value[key as typeof textFields[number]];
      if (text && normalizeText(text)) result[key] = normalizeText(text);
    }
    else if (value[key as keyof IdeasSurveyAnswers] !== undefined) result[key] = value[key as keyof IdeasSurveyAnswers];
  }
  return result as Partial<IdeasSurveyAnswers>;
}

export function validateIdeasDraftPayload(value: unknown): { valid: true; payload: IdeasDraftPayload } | { valid: false } {
  const keys = new Set([...envelopeKeys, "write_token", "revision", "mode", "consent"]);
  if (!isRecord(value) || Object.keys(value).some(key => !keys.has(key)) || value.survey_version !== 1 ||
    typeof value.submission_id !== "string" || !uuidV4.test(value.submission_id) ||
    typeof value.write_token !== "string" || !/^[a-f0-9]{64}$/.test(value.write_token) ||
    !Number.isSafeInteger(value.revision) || Number(value.revision) < 1 || Number(value.revision) > 10000 ||
    !["draft", "complete", "delete"].includes(String(value.mode)) || !validateIdeasDraftAnswers(value.answers) ||
    (value.mode === "complete" && !validateIdeasSurveyAnswers(value.answers)) ||
    (value.mode === "delete" && Object.keys(value.answers).length !== 0) ||
    typeof value.website !== "string" || value.website.length > 200 ||
    !Number.isSafeInteger(value.fill_time_ms) || Number(value.fill_time_ms) < 0 || Number(value.fill_time_ms) > 86_400_000) return { valid: false };
  const answers = canonicalDraftAnswers(value.answers);
  if (value.mode !== "delete" && (!isRecord(value.consent) || value.consent.accepted !== true ||
    value.consent.version !== IDEAS_CONSENT_VERSION || Object.keys(value.consent).some(key => !["accepted", "version"].includes(key)))) return { valid: false };
  if (value.mode === "delete" && value.consent !== undefined) return { valid: false };
  if (value.mode !== "delete" && !Object.keys(answers).length) return { valid: false };
  return { valid: true, payload: { ...value, submission_id: value.submission_id.toLowerCase(), answers } as IdeasDraftPayload };
}

export function validateIdeasSurveyAnswers(value: unknown): value is IdeasSurveyAnswers {
  if (!isRecord(value) || Object.keys(value).some((key) => !answerKeys.has(key))) return false;
  for (const [field, options] of Object.entries(coreChoices)) {
    if (typeof value[field] !== "string" || !(options as readonly string[]).includes(value[field] as string)) return false;
  }
  for (const [field, definition] of Object.entries(conditionalChoices)) {
    if (value[definition.parent] === "yes") {
      if (typeof value[field] !== "string" || !(definition.values as readonly string[]).includes(value[field] as string)) return false;
    } else if (value[field] !== undefined && value[field] !== "") return false;
  }
  const changes = value.league_changes;
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > leagueChoices.length ||
    new Set(changes).size !== changes.length ||
    !changes.every((v) => typeof v === "string" && leagueChoices.includes(v))) return false;
  if ((changes.includes("keep") || changes.includes("unsure")) && changes.length !== 1) return false;
  for (const field of textFields) if (field in value && !validText(value[field])) return false;
  return true;
}

// Stable key/array order makes semantically identical retries identical, independent
// of JSON property order. Hidden empty fields are transport-only and removed.
export function canonicalAnswers(value: IdeasSurveyAnswers): IdeasSurveyAnswers {
  const answer: Record<string, unknown> = {};
  for (const field of Object.keys(coreChoices)) answer[field] = value[field as keyof IdeasSurveyAnswers];
  for (const [field, definition] of Object.entries(conditionalChoices)) {
    if (value[definition.parent] === "yes") answer[field] = value[field as keyof IdeasSurveyAnswers];
  }
  answer.league_changes = [...value.league_changes].sort();
  for (const field of textFields) if (value[field] && normalizeText(value[field])) answer[field] = normalizeText(value[field]);
  return answer as IdeasSurveyAnswers;
}

export function validateIdeasSurveyPayload(value: unknown):
  { valid: true; payload: IdeasSurveyPayload } | { valid: false } {
  if (!isRecord(value) || Object.keys(value).some((key) => !envelopeKeys.has(key)) ||
    value.survey_version !== 1 || typeof value.submission_id !== "string" || !uuidV4.test(value.submission_id) ||
    !validateIdeasSurveyAnswers(value.answers) || typeof value.website !== "string" || value.website.length > 200 ||
    !Number.isSafeInteger(value.fill_time_ms) || Number(value.fill_time_ms) < 3000 || Number(value.fill_time_ms) > 86_400_000) {
    return { valid: false };
  }
  return { valid: true, payload: {
    survey_version: 1,
    submission_id: value.submission_id.toLowerCase(),
    answers: canonicalAnswers(value.answers),
    website: value.website,
    fill_time_ms: Number(value.fill_time_ms),
  } };
}
