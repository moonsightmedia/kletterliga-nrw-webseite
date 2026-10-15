import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc: mocks.rpc } }));
import { emptyIdeasReportFilters, loadIdeasSurveyReport } from "@/services/ideasSurveyAdminApi";
import { makeIdeasPreviewReport } from "@/app/pages/admin/ideasSurveyPreviewData";
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal }); });
describe("ideas report private read API", () => {
  it("uses only the guarded report RPC, bounded pagination and cancellation", async () => {
    mocks.abortSignal.mockResolvedValue({ data: makeIdeasPreviewReport(emptyIdeasReportFilters, []), error: null });
    const signal = new AbortController().signal;
    await loadIdeasSurveyReport({ status: "partial", offset: 20, textOnly: true }, signal);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_ideas_survey_2027_report", { p_status: "partial", p_offset: 20, p_limit: 20, p_text_only: true });
    expect(mocks.abortSignal).toHaveBeenCalledWith(signal);
  });
  it("hides raw database errors and rejects absent/malformed data instead of inventing zeros", async () => {
    mocks.abortSignal.mockResolvedValueOnce({ error: { code: "42501", message: "private internal detail" } });
    await expect(loadIdeasSurveyReport(emptyIdeasReportFilters, new AbortController().signal)).rejects.toThrow("aktiven Liga-Adminzugang");
    mocks.abortSignal.mockResolvedValueOnce({ data: null, error: null });
    await expect(loadIdeasSurveyReport(emptyIdeasReportFilters, new AbortController().signal)).rejects.toThrow("unvollständig");
    mocks.abortSignal.mockResolvedValueOnce({ error: { code: "PGRST202", message: "private schema" } });
    await expect(loadIdeasSurveyReport(emptyIdeasReportFilters, new AbortController().signal)).rejects.toThrow("Bitte versuche es erneut");
  });
});
