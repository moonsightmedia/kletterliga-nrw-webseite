import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIdeasDraft } from "@/hooks/useIdeasDraft";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
import { validateIdeasSurveyPayload, type IdeasDraftPayload } from "../../supabase/functions/submit-ideas-survey-2027/validation";
vi.mock("@/services/ideasSurveyApi", () => ({ submitIdeasSurvey: vi.fn() }));
const send = vi.mocked(submitIdeasSurvey);
beforeEach(() => { send.mockReset(); localStorage.clear(); sessionStorage.clear(); });
function consentedHook(preview: boolean) {
  const hook = renderHook(() => useIdeasDraft(preview));
  act(() => hook.result.current.grantConsent());
  return hook;
}
describe("memory-only partial response writes", () => {
  it("rejects saves without consent and creates no capability or request before consent", async () => {
    const { result } = renderHook(() => useIdeasDraft(false));
    expect(result.current.withdrawalCode()).toBeNull();
    await expect(result.current.save({digitalization:"yes"},"draft","",0)).rejects.toThrow("stimme");
    expect(send).not.toHaveBeenCalled();
    act(() => result.current.grantConsent());
    expect(send).not.toHaveBeenCalled();
    expect(result.current.withdrawalCode()).toBeNull();
  });
  it("makes no request or persistent browser entry in preview", async () => {
    const { result } = consentedHook(true);
    await act(() => result.current.save({ digitalization: "yes" },"draft","",0));
    expect(send).not.toHaveBeenCalled();
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
  it("starts rapid snapshots immediately and ignores a late earlier receipt", async () => {
    let release: () => void = () => undefined;
    send.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockResolvedValue(undefined);
    const { result } = consentedHook(false);
    let a!: Promise<void>; let b!: Promise<void>;
    await act(async () => {
      a = result.current.save({digitalization:"yes"},"draft","",0);
      b = result.current.save({digitalization:"no",paper_cards:"yes"},"draft","",1);
      await Promise.resolve();
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
    await act(async () => { release(); await a; await b; });
    const p = send.mock.calls.map(c=>c[0] as IdeasDraftPayload);
    expect(p.map(v=>v.revision)).toEqual([1,2]);
    expect(p[0].submission_id).toBe(p[1].submission_id);
    expect(p[0].write_token).toBe(p[1].write_token);
    expect(p[1].answers).toEqual({digitalization:"no",paper_cards:"yes"});
    expect(result.current.status).toBe("saved");
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
  it("retries a lost deletion receipt with the exact same revision and blocks new choices", async () => {
    send.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("lost receipt")).mockResolvedValueOnce(undefined);
    const { result } = consentedHook(false);
    await act(() => result.current.save({digitalization:"yes"},"draft","",0));
    await act(async () => { await expect(result.current.erase("",1)).rejects.toThrow("lost receipt"); });
    await act(() => result.current.erase("",2));
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[2][0]);
    await expect(result.current.save({digitalization:"no"},"draft","",3)).rejects.toThrow("stimme");
    expect(result.current.status).toBe("saved");
  });
  it("can save a newer snapshot after a failed earlier draft, without treating the older one as saved", async () => {
    send.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const { result } = consentedHook(false);
    await act(async () => { await expect(result.current.save({digitalization:"yes"},"draft","",0)).rejects.toThrow("offline"); });
    expect(result.current.status).toBe("error");
    await act(() => result.current.save({digitalization:"no"},"draft","",1));
    expect(result.current.status).toBe("saved");
    expect(send.mock.calls[1][0]).toMatchObject({revision:2,answers:{digitalization:"no"}});
    expect(validateIdeasSurveyPayload(send.mock.calls[1][0]).valid).toBe(false);
  });
});
