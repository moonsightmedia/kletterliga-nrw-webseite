import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IdeenWiderruf2027 from "@/pages/IdeenWiderruf2027";
import { parseIdeasWithdrawalCode } from "@/lib/ideasConsent2027";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
vi.mock("@/services/ideasSurveyApi", () => ({ submitIdeasSurvey: vi.fn() }));
vi.mock("@/hooks/usePageMeta", () => ({ usePageMeta: vi.fn() }));
vi.mock("@/components/layout/PageLayout", () => ({ PageLayout: ({children}: {children: React.ReactNode}) => <>{children}</> }));
const send = vi.mocked(submitIdeasSurvey);
const id = "67192735-99bc-4d51-bb34-87b0f3f214f3";
const token = "a".repeat(64); // Isolated dummy capability, no real response.
const code = `${id}.${token}`;
const mount = (preview = false) => render(<MemoryRouter><IdeenWiderruf2027 preview={preview} /></MemoryRouter>);
const fill = (value: string) => fireEvent.change(screen.getByLabelText("Dein vertraulicher Widerrufscode"),{target:{value}});
const remove = () => fireEvent.click(screen.getByRole("button",{name:"Einwilligung widerrufen & Antworten entfernen"}));
beforeEach(() => { send.mockReset(); send.mockResolvedValue(undefined); });
afterEach(() => cleanup());
describe("account-free later withdrawal", () => {
  it("parses only a complete capability, not a UUID, URL or arbitrary input", () => {
    expect(parseIdeasWithdrawalCode(code.toUpperCase())).toEqual({id,token});
    for (const bad of [id,token,`https://example.invalid/${code}`,`${code}.extra`,"",`${id}.guess`]) expect(parseIdeasWithdrawalCode(bad)).toBeNull();
  });
  it("does not write on mount or typing and rejects incomplete codes", () => {
    mount(); fill(id); expect(send).not.toHaveBeenCalled(); remove();
    expect(screen.getByRole("alert")).toHaveTextContent("vollständigen Widerrufscode");
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Dein vertraulicher Widerrufscode")).toHaveAttribute("type","password");
  });
  it("uses only the private deletion capability, with no consent or account data", async () => {
    mount(); fill(code); remove();
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Antworten entfernt"));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({survey_version:1,submission_id:id,write_token:token,revision:10000,mode:"delete",answers:{},website:"",fill_time_ms:0});
    expect(screen.queryByLabelText("Dein vertraulicher Widerrufscode")).not.toBeInTheDocument();
  });
  it("does not claim success after failure and can retry identically", async () => {
    send.mockRejectedValueOnce(new Error("offline")); mount(); fill(code); remove();
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("nicht bestätigt"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument(); remove();
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Antworten entfernt"));
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  });
  it("never removes real data in preview", async () => {
    mount(true); fill(code); remove();
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Vorschau abgeschlossen"));
    expect(send).not.toHaveBeenCalled();
  });
});
