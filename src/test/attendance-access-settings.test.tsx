import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttendanceAccessSettings } from "@/app/components/AttendanceAccessSettings";
vi.mock("@/services/supabase", () => ({ supabase: { rpc: vi.fn() } }));
afterEach(cleanup);
const show = (source: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }) => render(<MemoryRouter><AttendanceAccessSettings season="2026" source={source} /></MemoryRouter>);
describe("attendance access configuration", () => {
  it("recovers from a failed status read without allowing an unverified write", async () => {
    const source = { get: vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValue(false), set: vi.fn() };
    show(source);
    fireEvent.click(await screen.findByRole("button", { name: "Erneut laden" }));
    await waitFor(() => expect(screen.getByLabelText("Neues Einlasspasswort")).toBeEnabled());
    expect(source.set).not.toHaveBeenCalled();
  });
  it("requires matching input and clears it only after server confirmation", async () => {
    let complete!: () => void;
    const source = { get: vi.fn().mockResolvedValue(false), set: vi.fn().mockImplementation(() => new Promise<void>(resolve => { complete = resolve; })) };
    show(source);
    await waitFor(() => expect(screen.getByLabelText("Neues Einlasspasswort")).toBeEnabled());
    const synthetic = "x".repeat(12);
    fireEvent.change(screen.getByLabelText("Neues Einlasspasswort"), { target: { value: synthetic } });
    expect(screen.getByRole("button", { name: "Passwort speichern" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Einlasspasswort wiederholen"), { target: { value: synthetic } });
    fireEvent.click(screen.getByRole("button", { name: "Passwort speichern" }));
    expect(screen.getByLabelText("Neues Einlasspasswort")).toHaveValue(synthetic);
    expect(source.set).toHaveBeenCalledTimes(1);
    complete();
    await waitFor(() => expect(screen.getByLabelText("Neues Einlasspasswort")).toHaveValue(""));
    expect(screen.getByRole("status")).toHaveTextContent("gespeichert");
  });
  it("revokes the shared crew access through the guarded server operation", async () => {
    const source = { get: vi.fn().mockResolvedValue(true), set: vi.fn().mockResolvedValue(undefined) };
    show(source);
    fireEvent.click(await screen.findByText("Einlasspasswort · eingerichtet"));
    fireEvent.click(screen.getByRole("button", { name: "Zugang deaktivieren" }));
    await waitFor(() => expect(source.set).toHaveBeenCalledWith("2026", null));
    expect(await screen.findByRole("status")).toHaveTextContent("deaktiviert");
  });
});
