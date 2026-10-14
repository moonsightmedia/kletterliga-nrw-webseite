import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { canonicalAnswers, validateIdeasSurveyAnswers, validateIdeasSurveyPayload, validateIdeasDraftAnswers, validateIdeasDraftPayload, type IdeasSurveyAnswers } from "../../supabase/functions/submit-ideas-survey-2027/validation";

const answers = (): IdeasSurveyAnswers => ({
  digitalization: "yes", paper_cards: "no", team_mode: "no", shirt_interest: "no", pro_league: "no",
  league_changes: ["keep"], qual_weight: "same", hall_model: "all", hall_count: "8",
  community_events: "both", weighting: "none",
});
const payload = () => ({ survey_version: 1, submission_id: "67192735-99bc-4d51-bb34-87b0f3f214f3", answers: answers(), website: "", fill_time_ms: 3000 });
const draftPayload = () => ({ ...payload(), mode: "draft", revision: 1, write_token: "a".repeat(64), answers: { digitalization: "yes" }, fill_time_ms: 0, consent:{accepted:true,version:2} });

vi.mock("https://deno.land/std@0.192.0/http/server.ts", () => ({ serve: vi.fn() }));

describe("2027 ideas survey shared strict validation", () => {
  it("accepts partial choices but never invents missing votes or accepts identity/stale children", () => {
    const draft = validateIdeasDraftPayload(draftPayload());
    expect(draft).toEqual({ valid: true, payload: draftPayload() });
    expect(validateIdeasDraftAnswers({ team_mode: "yes" })).toBe(true);
    for (const bad of [{ email: "private" }, { team_mode: "no", team_size: "two" }, { hall_count: "2" }, { league_changes: ["keep","age_more"] }, { weighting: null }]) expect(validateIdeasDraftAnswers(bad)).toBe(false);
    expect(validateIdeasDraftPayload({ ...draftPayload(), mode: "complete" }).valid).toBe(false);
    for (const bad of [{ write_token: "guess" }, { revision: 0 }, { revision: 1.2 }, { mode: "other" }, { mode: "delete" }, { answers: {} }, { profile_id: "private" }]) expect(validateIdeasDraftPayload({ ...draftPayload(), ...bad }).valid).toBe(false);
    expect(validateIdeasDraftPayload({ ...draftPayload(), mode: "delete", answers: {}, consent:undefined }).valid).toBe(true);
  });
  it("requires the current explicit consent for writes but not for withdrawal", () => {
    for (const consent of [undefined,null,false,{accepted:false,version:2},{accepted:true,version:1},{accepted:true,version:2,email:"private"}]) expect(validateIdeasDraftPayload({...draftPayload(),consent}).valid).toBe(false);
    expect(validateIdeasDraftPayload({...draftPayload(),mode:"delete",answers:{},consent:undefined}).valid).toBe(true);
  });
  it("accepts only the two bounded idea fields, normalizes whitespace and never treats text as markup", () => {
    const a = { ...answers(), league_changes: ["age_classes","fewer_classes","other"], league_idea: "  Ab 40\r\nAb 60  ", weighting_idea: "<script>alert(1)</script>" };
    expect(validateIdeasSurveyAnswers(a)).toBe(true);
    const full = validateIdeasSurveyPayload({ ...payload(), answers: a });
    expect(full.valid).toBe(true);
    if (full.valid) expect(full.payload.answers).toMatchObject({league_idea:"Ab 40\nAb 60",weighting_idea:"<script>alert(1)</script>"});
    const empty = validateIdeasSurveyPayload({ ...payload(), answers: { ...answers(), league_idea: "   " } });
    if (empty.valid) expect(empty.payload.answers).not.toHaveProperty("league_idea");
    for (const bad of ["x".repeat(501), "bad" + String.fromCharCode(0), "bad" + String.fromCharCode(7), {}, [], 1, null]) {
      expect(validateIdeasSurveyAnswers({...answers(),league_idea:bad})).toBe(false);
      expect(validateIdeasDraftAnswers({weighting_idea:bad})).toBe(false);
    }
    expect(validateIdeasDraftAnswers({weighting_idea:"x".repeat(500)})).toBe(true);
    expect(validateIdeasDraftAnswers({weighting_idea:"😀"})).toBe(true);
    expect(validateIdeasDraftAnswers({weighting_idea:String.fromCharCode(0xd800)})).toBe(false);
    expect(validateIdeasDraftAnswers({comment:"unapproved text field"})).toBe(false);
  });
  it("accepts complete core answers and returns only canonical fields", () => {
    expect(validateIdeasSurveyAnswers(answers())).toBe(true);
    expect(validateIdeasSurveyPayload(payload())).toEqual({ valid: true, payload: payload() });
  });
  it("accepts explicit unsure on every answer, not empty or missing core answers", () => {
    const unsure = Object.fromEntries(Object.keys(answers()).map((key) => [key, key === "league_changes" ? ["unsure"] : "unsure"]));
    expect(validateIdeasSurveyAnswers(unsure)).toBe(true);
    for (const key of Object.keys(answers())) {
      const missing = { ...answers() } as Record<string, unknown>;
      delete missing[key];
      expect(validateIdeasSurveyAnswers(missing), key).toBe(false);
      expect(validateIdeasSurveyAnswers({ ...answers(), [key]: "" }), key).toBe(false);
    }
  });
  it("rejects extra/free-text/identity fields at both levels", () => {
    for (const key of ["email", "profile_id", "comment", "ip", "__proto__extra"]) {
      expect(validateIdeasSurveyPayload({ ...payload(), [key]: "private" })).toEqual({ valid: false });
      expect(validateIdeasSurveyAnswers({ ...answers(), [key]: "private" })).toBe(false);
    }
  });
  it("validates all conditional children when their parent is yes", () => {
    const yes = { ...answers(), team_mode: "yes", team_size: "four", team_scoring: "both", shirt_interest: "yes", shirt_policy: "optional", pro_league: "yes", pro_rule: "voluntary" };
    expect(validateIdeasSurveyAnswers(yes)).toBe(true);
    for (const key of ["team_size", "team_scoring", "shirt_policy", "pro_rule"]) {
      const missing: Record<string, unknown> = { ...yes };
      delete missing[key];
      expect(validateIdeasSurveyAnswers(missing), key).toBe(false);
      expect(validateIdeasSurveyAnswers({ ...yes, [key]: "invalid" }), key).toBe(false);
    }
  });
  it("rejects hidden stale children and strips hidden empty-string children", () => {
    for (const [key, value] of Object.entries({ team_size: "two", team_scoring: "both", shirt_policy: "mandatory", pro_rule: "squad_required" })) {
      expect(validateIdeasSurveyAnswers({ ...answers(), [key]: value }), key).toBe(false);
      const empty = validateIdeasSurveyPayload({ ...payload(), answers: { ...answers(), [key]: "" } });
      expect(empty.valid).toBe(true);
      if (empty.valid) expect(empty.payload.answers).not.toHaveProperty(key);
    }
  });
  it("requires unique known league changes with exclusive keep/unsure", () => {
    for (const value of [[], ["keep", "age_more"], ["unsure", "skill_classes"], ["age_middle", "age_middle"], ["unknown"], [null], "keep"]) {
      expect(validateIdeasSurveyAnswers({ ...answers(), league_changes: value })).toBe(false);
    }
    expect(validateIdeasSurveyAnswers({ ...answers(), league_changes: ["skill_classes", "age_middle", "age_more"] })).toBe(true);
  });
  it("makes equivalent retries stable despite property/checkbox order", () => {
    const a = { ...answers(), league_changes: ["age_more", "skill_classes"] } as IdeasSurveyAnswers;
    const b = { ...Object.fromEntries(Object.entries(a).reverse()), league_changes: ["skill_classes", "age_more"] } as IdeasSurveyAnswers;
    expect(JSON.stringify(canonicalAnswers(a))).toBe(JSON.stringify(canonicalAnswers(b)));
    expect(JSON.stringify(canonicalAnswers({ ...a, hall_count: "6" }))).not.toBe(JSON.stringify(canonicalAnswers(a)));
  });
  it("requires UUID v4, exact version, bounded integer timing and a bounded honeypot", () => {
    for (const patch of [
      { submission_id: "bad" }, { submission_id: "67192735-99bc-1d51-bb34-87b0f3f214f3" },
      { survey_version: 2 }, { fill_time_ms: 2999 }, { fill_time_ms: 3000.1 }, { fill_time_ms: 86_400_001 },
      { fill_time_ms: NaN }, { website: "x".repeat(201) }, { website: null },
    ]) expect(validateIdeasSurveyPayload({ ...payload(), ...patch })).toEqual({ valid: false });
    expect(validateIdeasSurveyPayload(null)).toEqual({ valid: false });
    expect(validateIdeasSurveyPayload([])).toEqual({ valid: false });
    const uppercase = validateIdeasSurveyPayload({ ...payload(), submission_id: payload().submission_id.toUpperCase() });
    if (uppercase.valid) expect(uppercase.payload.submission_id).toBe(payload().submission_id);
    else throw new Error("Uppercase UUID should normalize");
  });
  it("does not allow non-string enum values", () => {
    for (const bad of [true, 4, null, [], {}, "YES", "maybe"]) {
      expect(validateIdeasSurveyAnswers({ ...answers(), digitalization: bad })).toBe(false);
    }
  });
});

describe("2027 anonymous submit handler (isolated, no remote writes)", () => {
  let handle: (req: Request) => Promise<Response>;
  const fetchMock = vi.fn();
  const envMock = vi.fn((name: string): string | undefined => name === "SUPABASE_URL" ? "https://example.invalid" : "test-only-key");
  const request = (body: unknown = draftPayload(), origin = "https://www.kletterliga-nrw.de") => new Request("https://example.invalid/submit", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  beforeAll(async () => {
    vi.stubGlobal("crypto", webcrypto);
    // jsdom 20 lacks AbortSignal.timeout; the deployed Deno runtime supports it.
    vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal });
    vi.stubGlobal("Deno", { env: { get: envMock } });
    vi.stubGlobal("fetch", fetchMock);
    // Keep the Deno URL-import entrypoint out of the browser TypeScript program;
    // Vitest still executes it through its module transformer with Serve mocked.
    const handlerModule = "../../supabase/functions/" + "submit-ideas-survey-2027/index.ts";
    handle = (await import(/* @vite-ignore */ handlerModule)).handleIdeasSurveyRequest;
  });
  beforeEach(() => { fetchMock.mockReset(); envMock.mockClear(); });
  afterAll(() => { vi.unstubAllGlobals(); });
  it("allows only production origins, preflight and POST, with no-store", async () => {
    for (const origin of ["http://localhost:5173", "https://evil.invalid", ""]) {
      const response = await handle(request(payload(), origin));
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    const options = await handle(new Request("https://example.invalid", { method: "OPTIONS", headers: { origin: "https://kletterliga-nrw.de" } }));
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-origin")).toBe("https://kletterliga-nrw.de");
    const get = await handle(new Request("https://example.invalid", { headers: { origin: "https://www.kletterliga-nrw.de" } }));
    expect(get.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects oversized, malformed, wrong-content-type and invalid answers without DB calls", async () => {
    expect((await handle(request({ ...payload(), website: "x".repeat(9000) }))).status).toBe(413);
    expect((await handle(request({ ...payload(), answers: {} }))).status).toBe(400);
    expect((await handle(new Request("https://example.invalid", { method: "POST", headers: { origin: "https://www.kletterliga-nrw.de", "content-type": "application/json" }, body: "{" }))).status).toBe(400);
    expect((await handle(new Request("https://example.invalid", { method: "POST", headers: { origin: "https://www.kletterliga-nrw.de" }, body: "test" }))).status).toBe(415);
    expect((await handle(new Request("https://example.invalid", { method: "POST", headers: { origin: "https://www.kletterliga-nrw.de", "content-type": "application/jsonp" }, body: JSON.stringify(payload()) }))).status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never stores honeypot answers", async () => {
    const response = await handle(request({ ...draftPayload(), website: "spam.example" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("retires the prototype legacy path rather than bypassing consent", async () => {
    const response = await handle(request(payload()));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends partial answers through the private atomic writer with only a hashed capability", async () => {
    fetchMock.mockResolvedValue(Response.json(true));
    const response = await handle(request(draftPayload()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.invalid/rest/v1/rpc/save_ideas_survey_2027");
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ p_id: payload().submission_id, p_revision: 1, p_mode: "draft", p_answers: { digitalization: "yes" },p_consent_version:2 });
    expect(body.p_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.p_token_hash).not.toBe(draftPayload().write_token);
    expect(options.body).not.toContain("fill_time_ms");
    expect(options.body).not.toContain("website");
  });
  it("fails closed on rejected ownership/revision and never stores invalid partial data", async () => {
    fetchMock.mockResolvedValue(Response.json(false));
    expect((await handle(request(draftPayload()))).status).toBe(409);
    fetchMock.mockReset();
    expect((await handle(request({ ...draftPayload(), write_token: "guess" }))).status).toBe(400);
    expect((await handle(request({ ...draftPayload(), answers: { email: "private" } }))).status).toBe(400);
    expect((await handle(request({ ...draftPayload(), consent: undefined }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts a withdrawal without renewed consent and forwards no consent version", async () => {
    fetchMock.mockResolvedValue(Response.json(true));
    expect((await handle(request({...draftPayload(),mode:"delete",answers:{},revision:10000,consent:undefined}))).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({p_mode:"delete",p_consent_version:null,p_revision:10000});
  });
  it("returns success for unchanged idempotent retry but rejects changed answer payload", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(true));
    const retry = await handle(request(draftPayload()));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ ok: true });
    fetchMock.mockResolvedValueOnce(Response.json(false));
    expect((await handle(request({...draftPayload(),answers:{digitalization:"no"}}))).status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, options]) => options.method !== "PATCH")).toBe(true);
  });
  it("does not leak DB messages and fails closed on missing runtime credentials", async () => {
    fetchMock.mockResolvedValue(new Response("private backend information", { status: 500 }));
    const failed = await handle(request());
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private backend");
    fetchMock.mockReset();
    envMock.mockReturnValueOnce(undefined as unknown as string);
    expect((await handle(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
