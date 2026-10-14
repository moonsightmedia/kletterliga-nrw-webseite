import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
import type { IdeasDraftPayload } from "../../supabase/functions/submit-ideas-survey-2027/validation";
vi.mock("@/services/supabase", () => ({ isSupabaseConfigured: true, supabaseConfig: { url: "https://example.invalid", anonKey: "public-test-placeholder" } }));
const payload: IdeasDraftPayload = {
  survey_version: 1, submission_id: "67192735-99bc-4d51-bb34-87b0f3f214f3", website: "", fill_time_ms: 5000,
  mode: "complete", revision: 1, write_token: "a".repeat(64), consent: {accepted:true,version:2},
  answers: { digitalization: "yes", paper_cards: "no", team_mode: "no", shirt_interest: "no", pro_league: "no", league_changes: ["keep"], qual_weight: "same", hall_model: "all", hall_count: "8", community_events: "both", weighting: "none" },
};
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal });
});
afterEach(() => vi.unstubAllGlobals());
describe("2027 ideas API submission", () => {
  it("sends only the anonymous payload and public API key, without account authorization", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    await submitIdeasSurvey(payload);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toEqual("https://example.invalid/functions/v1/submit-ideas-survey-2027");
    expect(request.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(request.body)).toEqual(payload);
  });
  it("never presents HTTP errors or false success responses as a saved vote", async () => {
    for (const [status, body] of [[503, { ok: true }], [200, { ok: false }], [409, {}]] as const) {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
      await expect(submitIdeasSurvey(payload)).rejects.toThrow("konnte nicht gespeichert");
    }
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await expect(submitIdeasSurvey(payload)).rejects.toThrow("Antworten sind noch da");
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    await expect(submitIdeasSurvey(payload)).rejects.toThrow("später erneut");
  });
  it("rejects invalid choices before any network request", async () => {
    await expect(submitIdeasSurvey({ ...payload, answers: { ...payload.answers, league_changes: [] } })).rejects.toThrow("prüfe deine Antworten");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
