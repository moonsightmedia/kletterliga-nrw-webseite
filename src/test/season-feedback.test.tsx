import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Saisonfeedback from "@/pages/Saisonfeedback";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/services/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/supabase")>();
  return { ...actual, supabase: { ...actual.supabase, functions: { invoke } } };
});

describe("season feedback", () => {
  beforeEach(() => invoke.mockReset());

  it("requires the structured answers and stores no name or email", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<MemoryRouter><Saisonfeedback /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte beantworte die fünf Auswahlfragen.");
    expect(invoke).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Ich habe aktiv mitgeklettert" }));
    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.click(screen.getByRole("radio", { name: "Die verschiedenen Hallen" }));
    fireEvent.click(screen.getByRole("radio", { name: "Infos und Kommunikation" }));
    fireEvent.click(screen.getByRole("radio", { name: "Vielleicht" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Möchtest du noch etwas ergänzen/i }), {
      target: { value: "Mehr Infos zu den Hallen wären hilfreich." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Feedback absenden/i }));

    await waitFor(() => expect(screen.getByText("DANKE FÜR DEIN FEEDBACK!")).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith("submit-season-feedback", {
      body: expect.objectContaining({
        participation: "active",
        overall_rating: 4,
        best_aspect: "halls",
        improve_aspect: "communication",
        next_year: "maybe",
        comment: "Mehr Infos zu den Hallen wären hilfreich.",
      }),
    });
    const payload = invoke.mock.calls[0][1].body;
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("profile_id");
  });
});
