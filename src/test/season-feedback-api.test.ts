import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc: mocks.rpc } }));
import { emptyFeedbackFilters, loadSeasonFeedback } from "@/services/seasonFeedbackApi";
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal }); });
describe("private feedback RPC", () => {
  it("passes bounded filters and the abort signal", async () => {
    mocks.abortSignal.mockResolvedValue({ data: { total: 0, matched: 0, latest_at: null, summary: { perspectives: {}, next_year: {}, topics: {} }, entries: [] }, error: null });
    const signal = new AbortController().signal;
    await loadSeasonFeedback({ ...emptyFeedbackFilters, topic: "routes", search: "  test  " }, signal);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_season_feedback_2026", { p_participation: null, p_topic: "routes", p_next_year: null, p_search: "test", p_offset: 0, p_limit: 20 });
    expect(mocks.abortSignal).toHaveBeenCalledWith(signal);
  });
  it("rejects denied or malformed responses without showing raw backend errors", async () => {
    mocks.abortSignal.mockResolvedValueOnce({ error: { code: "42501", message: "private backend" } });
    await expect(loadSeasonFeedback(emptyFeedbackFilters, new AbortController().signal)).rejects.toThrow("aktiven Liga-Adminzugang");
    mocks.abortSignal.mockResolvedValueOnce({ data: { entries: [] }, error: null });
    await expect(loadSeasonFeedback(emptyFeedbackFilters, new AbortController().signal)).rejects.toThrow("unvollständig");
  });
});
