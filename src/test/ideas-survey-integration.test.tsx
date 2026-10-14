import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import SeasonPreview from "@/preview/SeasonPreview";
vi.mock("@/hooks/usePageMeta", () => ({ usePageMeta: vi.fn() }));
const fetchMock = vi.fn();
const mount = (path = "/saison/2027") => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/ideen-2027" element={<Navigate to="/saison/2027#ideen-2027" replace />} />
  <Route path="/*" element={<SeasonPreview production />} />
</Routes></MemoryRouter>);
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver",class { observe() {} disconnect() {} });
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("2027 page survey integration", () => {
  it("embeds the survey with only one header/footer/photo and no second hero", () => {
    const { container } = mount();
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getByRole("banner")).toHaveClass("bg-background");
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("main img")).toHaveLength(1);
    expect(container.querySelector(".ideas-hero")).toBeNull();
    expect(screen.getByRole("heading", { name: "IDEEN FÜR 2027" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "8 Themen. Deine Meinung." })).toHaveAttribute("href", "#ideen-2027");
    expect(screen.getByRole("button", { name: "Ja, ich wäre dabei" })).toHaveClass("sp-interest-confirm");
    expect(container.querySelector(".sp-interest-pulse")).toBeNull();
    expect(container.querySelector(".sp-interest-2027")?.nextElementSibling).toHaveClass("ideas-embedded");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps survey answers when interest is confirmed, with no real DEV request", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Umfrage starten" }));
    fireEvent.click(screen.getByRole("button", { name: "Einverstanden – Umfrage starten" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ja, das finde ich gut" }));
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    fireEvent.click(screen.getByRole("button", { name: "Ja, ich wäre dabei" }));
    expect(screen.getByRole("button", { name: "Danke, vorgemerkt" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Ja, das finde ich gut" })).toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("lets the old survey link reach the embedded form without requiring interest", async () => {
    mount("/ideen-2027");
    await waitFor(() => expect(screen.getByRole("heading", { name: "IDEEN FÜR 2027" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Ja, ich wäre dabei" })).toBeEnabled();
    expect(screen.getByRole("radio",{name:"Ja, das finde ich gut"})).toBeDisabled();
    expect(screen.getByRole("button", { name: "Umfrage starten" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Weiter" })).not.toBeInTheDocument();
    expect(document.getElementById("ideen-2027")).toHaveAttribute("tabindex", "-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
